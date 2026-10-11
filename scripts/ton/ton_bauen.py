#!/usr/bin/env python3
"""Tonspur bauen: Effekt-Cues aus der Ereignisliste, Kit-Samples rendern, compositions/audio.html schreiben.
Teil des Skills motion-videos (MIT). Braucht numpy, scipy; für --decke auto zusätzlich ffmpeg.

Aufruf (im HyperFrames-Projekt, z. B. film/):
  python3 ton_bauen.py --cues cues.json                     # Samples rendern + compositions/audio.html
  python3 ton_bauen.py --cues cues.json --sim mix.wav       # zusätzlich Offline-Mix 48 kHz (Nachbau des Mixers)
  python3 ton_bauen.py --cues cues.json --sim mix.wav --decke auto
                                                            # Master-Decke so wählen, dass True Peak nach AAC <= -1,2 dBTP
  python3 ton_bauen.py --cues cues.json --tabelle           # Cue-Tabelle (Ereignis, Sample, Tonhöhe, Panorama)
  python3 ton_bauen.py --cues cues.json --variante B --sim mix_B.wav
                                                            # Musik-Variante: {variante} in den Bett-Quellen
  python3 ton_bauen.py --cues cues.json --zerlegen-vorschlag click
                                                            # erkannte Einzelschläge einer Familie zeigen (für "slices")

Regeln (references/06-ton.md, R8 und R11):
  - Jeder Cue hängt an einem Ereignis aus ereignisse.json ("ereignis": "<id>"); keine freien Zeiten.
    Ereignisliste nach Schema 1 (templates/ereignisse.vorlage.json, Objekt mit "ereignisse" oder nackte Liste); gelesen
    werden id und t, doppelte ids sind ein Fehler.
    "versatz" (s) nur für Vorlauf-Effekte wie einen Riser, der kurz vor dem Ereignis abbricht.
  - Kit-Konvention: <kit>/NN_typ_a.wav … NN_typ_d.wav, z. B. 01_click_a.wav, 03_swoosh_c.wav. "typ" ist die Familie.
    Familien, deren Dateien mehrere Schläge enthalten, werden in Einzel-Samples zerlegt ("slices" von Hand oder
    "zerlegen": automatische Erkennung). Varianten rotieren, nie zweimal dieselbe hintereinander.
  - Tonhöhe ohne Angabe rotiert in ±2 Halbtönen; "semis_absolut": true stimmt Pops auf eine Tonleiter
    (Halbtöne über 800 Hz, Variante mit der kleinsten Verschiebung). Panorama ohne Angabe rotiert leicht.
  - Musik-Bett ("musik": true) duckt unter Klicks/Tippen um "ducking_db" (Standard -2,5 dB).
Ausgabe: <samples>/*.wav (gerenderte Einzel-Samples), <html> (HyperFrames-Sub-Composition mit <audio>-Elementen,
Master-Bus mit Limiter), ton-bau.json neben cues.json (aufgelöste Cues für ton_pruefen.py).
Vorlage: templates/cues.vorlage.json. Messung der Auslieferung immer auf der Web-Kopie: lufs.py <film>_web.mp4.
"""
import argparse
import json
import math
import os
import re
import subprocess
import sys
import tempfile
from collections import Counter
from fractions import Fraction
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, resample_poly, sosfilt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lufs import lese_audio, true_peak, integrierte_lautheit  # noqa: E402

ROT_SEMIS = [0.0, 1.0, -1.0, 1.5, -0.5, 2.0, -1.5, 0.5, -2.0, 1.0, -1.0, 0.0]
ROT_PAN = [0.0, -0.25, 0.25, -0.4, 0.4, -0.12, 0.12, -0.3, 0.3]
POP_REF_HZ = 800.0
KIT_RE = re.compile(r'^(\d+)_([a-z0-9]+)_([a-z])\.wav$', re.I)
STANDARD_FAMILIEN = {
    'click': {'peak': -2.0, 'anker': 'onset', 'duck': True, 'kurz': True},
    'pop': {'peak': -4.0, 'anker': 'onset', 'kurz': True},
    'swoosh': {'peak': -9.0, 'anker': 'peak'},
    'typing': {'peak': -5.0, 'anker': 'onset', 'duck': 'ganz'},
    'sparkle': {'peak': -9.0, 'anker': 'onset'},
    'chime': {'peak': -3.0, 'anker': 'onset'},
    'subthud': {'peak': -4.0, 'anker': 'onset', 'hochpass': None, 'pan': False},
    'flutter': {'peak': -8.0, 'anker': 'onset', 'kurz': True},
}


# ===================================================================== Laden
def lies(pfad):
    sr, x = wavfile.read(pfad)
    if x.dtype == np.int16:
        x = x.astype(np.float64) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float64) / 2147483648.0
    else:
        x = x.astype(np.float64)
    return sr, x


def env_db(m, sr, ms=1.0):
    h = max(1, int(sr * ms / 1000))
    n = len(m) // h
    return 20 * np.log10(np.sqrt((m[: n * h].reshape(n, h) ** 2).mean(1)) + 1e-12), h / sr


def pitch_hz(m, sr):
    i = int(np.argmax(np.abs(m)))
    seg = m[i: i + 2048]
    if len(seg) < 512:
        return None
    Y = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), 32768))
    f = np.fft.rfftfreq(32768, 1 / sr)
    k = (f > 150) & (f < 6000)
    return float(f[k][np.argmax(Y[k])])


def lade_ereignisse(pfad):
    d = json.loads(Path(pfad).read_text())
    if isinstance(d, dict):
        d = d.get('ereignisse', [])
    ev = {}
    for e in d:
        if e['id'] in ev:
            raise SystemExit(f"Ereignis-id doppelt: {e['id']}")
        ev[e['id']] = e
    return ev


def erkenne_schlaege(m, sr, max_n=6):
    """Einzelschläge in einer Datei: steiler Anstieg (> 10 dB in 3 ms) über dem Grundpegel, Abstand >= 25 ms.
    Behalten werden die bis zu max_n lautesten (höchstens 12 dB unter dem lautesten Schlag), zeitlich sortiert."""
    e, step = env_db(m, sr, 1.0)
    floor = e.max() - 45
    on = []
    for i in range(3, len(e)):
        if e[i] > floor and e[i] - e[i - 3:i].min() > 10 and (not on or i - on[-1] >= 25):
            on.append(i)
    res = []
    for j, o in enumerate(on):
        end = on[j + 1] if j + 1 < len(on) else len(e)
        seg = e[o:end]
        pk = float(seg.max())
        last = o + int(np.where(seg > pk - 40)[0].max()) + 1
        a, b = max(0, o - 1) * step, min(end - 1, last + 5) * step
        if b - a >= 0.025:
            res.append((round(a, 3), round(b, 3), pk))
    if not res:
        return []
    top = max(r[2] for r in res)
    res = sorted([r for r in res if r[2] >= top - 12], key=lambda r: -r[2])[:max_n]
    return sorted(res)


class Projekt:
    def __init__(self, cues_pfad):
        self.cues_pfad = Path(cues_pfad).resolve()
        self.d = json.loads(self.cues_pfad.read_text())
        self.root = (self.cues_pfad.parent / self.d.get('projekt', '.')).resolve()
        self.kit = self.root / self.d.get('kit', 'assets/sfx/kit')
        self.samples = self.root / self.d.get('samples', 'assets/sfx/kit-render')
        self.html = self.root / self.d.get('html', 'compositions/audio.html')
        self.dauer = float(self.d['dauer'])
        self.fps = float(self.d.get('fps', 30))
        self.familien = {k: dict(v) for k, v in STANDARD_FAMILIEN.items()}
        for k, v in (self.d.get('familien') or {}).items():
            self.familien.setdefault(k, {}).update(v)
        self.ereignisse = lade_ereignisse(self.root / self.d.get('ereignisse', 'ereignisse.json'))
        self.dateien = {}   # fam -> {buchstabe: pfad}
        if self.kit.exists():
            for p in sorted(self.kit.iterdir()):
                m = KIT_RE.match(p.name)
                if m:
                    self.dateien.setdefault(m.group(2).lower(), {})[m.group(3).lower()] = p
        self._cache = {}
        self.slices = self._baue_slices()

    def fam_cfg(self, fam):
        return self.familien.get(fam, {})

    def lade(self, pfad):
        if pfad not in self._cache:
            sr, x = lies(pfad)
            self._cache[pfad] = (sr, x.mean(1) if x.ndim == 2 else x)
        return self._cache[pfad]

    def _baue_slices(self):
        """Varianten je Familie: Name -> (Datei, von, bis). Von Hand ("slices") oder automatisch ("zerlegen")."""
        out = {}
        for name, s in (self.d.get('slices') or {}).items():
            fam = s.get('fam') or name.split('_')[0]
            datei = self.kit / f"{s['datei']}.wav" if not str(s['datei']).endswith('.wav') else self.root / s['datei']
            out.setdefault(fam, {})[name] = (datei, float(s.get('von', 0)), s.get('bis'))
        for fam in self.d.get('zerlegen', []):
            if fam in out:
                continue
            per_datei = []
            for bst, p in sorted(self.dateien.get(fam, {}).items()):
                sr, m = self.lade(p)
                per_datei.append([(f'{fam}_{bst}{i + 1}', (p, a, b)) for i, (a, b, _) in enumerate(erkenne_schlaege(m, sr))])
            # verschränkt: a1, b1, c1, d1, a2, b2 … (aufeinanderfolgende Varianten aus verschiedenen Dateien)
            for i in range(max((len(v) for v in per_datei), default=0)):
                for v in per_datei:
                    if i < len(v):
                        out.setdefault(fam, {})[v[i][0]] = v[i][1]
        for fam, files in self.dateien.items():
            if fam not in out:
                out[fam] = {f'{fam}_{b}': (p, 0.0, None) for b, p in sorted(files.items())}
        return out

    def variante(self, fam, name):
        v = self.slices.get(fam, {})
        if name in v:
            return name
        if len(name) == 1:                    # Buchstabe a..d: ganze Datei bzw. erster Schlag dieser Datei
            for k in v:
                if k in (f'{fam}_{name}', f'{fam}_{name}1'):
                    return k
        raise SystemExit(f'Variante {name!r} für Familie {fam!r} nicht gefunden (vorhanden: {", ".join(v) or "keine"})')

    def sample_daten(self, fam, name, ausschnitt=None):
        p, a, b = self.slices[fam][name]
        sr, m = self.lade(p)
        if ausschnitt:
            a, b = float(ausschnitt[0]), float(ausschnitt[1])
        return sr, m[int(a * sr): int(b * sr) if b else None].copy(), p


# ===================================================================== Cues auflösen
def loese_cues(pj):
    cues = []
    for c in pj.d.get('cues', []):
        c = dict(c)
        if c.get('ereignis') not in pj.ereignisse:
            raise SystemExit(f"Cue {c.get('id')}: Ereignis {c.get('ereignis')!r} fehlt in der Ereignisliste (R8: Cues nur aus Ereignissen)")
        c['t_ereignis'] = float(pj.ereignisse[c['ereignis']]['t'])
        c['event'] = c['t_ereignis'] + float(c.get('versatz', 0.0))
        c.setdefault('fam', 'datei' if c.get('datei') else None)
        cues.append(c)
    return cues


def verteile_varianten(pj, cues):
    """Varianten rotieren (nie zweimal dieselbe hintereinander, auch nicht vor einer fest gesetzten), Tonhöhe und Panorama."""
    order = sorted(cues, key=lambda c: c['event'])
    nxt_fixed, seen = {}, {}
    for c in reversed(order):
        nxt_fixed[id(c)] = seen.get(c['fam'])
        if c.get('variante') and not c.get('datei'):
            seen[c['fam']] = pj.variante(c['fam'], c['variante'])
    idx, rot, prot, last = Counter(), Counter(), Counter(), {}
    f0 = {}
    for c in order:
        fam = c['fam']
        cfg = pj.fam_cfg(fam)
        if c.get('datei'):
            c['slice'] = None
            c['shift'] = float(c.get('semis') or 0.0)
            c['pan'] = float(c.get('pan') or 0.0)
            continue
        if fam not in pj.slices:
            raise SystemExit(f"Cue {c['id']}: Familie {fam!r} nicht im Kit {pj.kit} (Konvention NN_{fam}_a.wav)")
        lst = list(pj.slices[fam])
        if c.get('variante'):
            s = pj.variante(fam, c['variante'])
        elif c.get('semis_absolut') and c.get('semis') is not None:
            for v in lst:
                if v not in f0:
                    sr, m, _ = pj.sample_daten(fam, v)
                    f0[v] = pitch_hz(m, sr) or POP_REF_HZ
            ziel = POP_REF_HZ * 2 ** (float(c['semis']) / 12)

            def kosten(v):
                need = abs(12 * math.log2(ziel / f0[v]))
                return need + 6 * max(0, need - 7) + (99 if v == last.get(fam) or v == nxt_fixed.get(id(c)) else 0)
            s = min(lst, key=kosten)
        else:
            s = lst[idx[fam] % len(lst)]
            for _ in range(len(lst)):
                if s != last.get(fam) and s != nxt_fixed.get(id(c)):
                    break
                idx[fam] += 1
                s = lst[idx[fam] % len(lst)]
            idx[fam] += 1
        c['slice'] = s
        if c.get('semis') is None:
            c['shift'] = ROT_SEMIS[rot[fam] % len(ROT_SEMIS)]
            rot[fam] += 1
        elif c.get('semis_absolut'):
            if s not in f0:
                sr, m, _ = pj.sample_daten(fam, s)
                f0[s] = pitch_hz(m, sr) or POP_REF_HZ
            c['shift'] = float(np.clip(12 * math.log2(POP_REF_HZ * 2 ** (float(c['semis']) / 12) / f0[s]), -7, 7))
        else:
            c['shift'] = float(c['semis'])
        if c.get('pan') is None:
            c['pan'] = 0.0 if cfg.get('pan') is False else ROT_PAN[prot[fam] % len(ROT_PAN)]
            prot[fam] += 1
        last[fam] = s


# ===================================================================== Samples rendern
def render_sample(pj, c):
    fam = c['fam']
    cfg = pj.fam_cfg(fam)
    if c.get('datei'):
        p = pj.root / c['datei']
        sr, m = pj.lade(p)
        if c.get('ausschnitt'):
            m = m[int(float(c['ausschnitt'][0]) * sr): int(float(c['ausschnitt'][1]) * sr)].copy()
        tag = f"{p.stem}_{float((c.get('ausschnitt') or [0])[0]):.2f}"
    else:
        sr, m, p = pj.sample_daten(fam, c['slice'], c.get('ausschnitt'))
        tag = c['slice'] + (f"_{float(c['ausschnitt'][0]):.2f}-{float(c['ausschnitt'][1]):.2f}" if c.get('ausschnitt') else '')
    n = len(m)
    if n < 16:
        raise SystemExit(f"Cue {c['id']}: Sample leer (Ausschnitt prüfen)")
    g = np.ones(n)
    k_in = max(1, int(0.0015 * sr))
    g[:k_in] = np.linspace(0, 1, k_in)
    if cfg.get('kurz'):
        ko = min(n, max(int(0.3 * n), int(0.008 * sr)))
    else:
        ko = min(n, int(float(c.get('fade_out') or 0.05) * sr))
    g[n - ko:] *= np.cos(0.5 * np.pi * np.arange(ko) / ko) ** 2
    if c.get('dauer'):
        cut = int(float(c['dauer']) * sr)
        m, g = m[:cut], g[:cut]
        ko = min(len(g), int(0.15 * sr))
        g[-ko:] *= np.linspace(1, 0, ko)
    m = m * g
    st = float(c['shift'])
    if abs(st) > 1e-6:   # höhere Tonhöhe = kürzer abspielen (wie asetrate), kein Time-Stretch
        r = Fraction(2 ** (st / 12)).limit_denominator(400)
        m = resample_poly(m, r.denominator, r.numerator)
    pan = float(c.get('pan') or 0.0)
    th = (pan + 1) * np.pi / 4
    lr = np.stack([m * np.cos(th), m * np.sin(th)], 1) * math.sqrt(2) if abs(pan) > 1e-6 else np.stack([m, m], 1)
    peak = float(c['peak']) if c.get('peak') is not None else float(cfg.get('peak', -6.0))
    c['peak'] = peak
    lr *= 10 ** (peak / 20) / (np.abs(lr).max() + 1e-12)
    e, step = env_db(lr.mean(1), sr, 1.0)
    modus = c.get('anker') or cfg.get('anker', 'onset')
    if modus == 'peak':
        e10, s10 = env_db(lr.mean(1), sr, 10.0)
        anker = (int(np.argmax(e10)) + 0.5) * s10
    elif modus == 'ende':
        anker = len(lr) / sr
    elif modus == 'max':
        anker = (int(np.argmax(e)) + 0.5) * step
    else:
        anker = int(np.argmax(e > e.max() - 18)) * step
    name = f'{tag}_{st:+.2f}st_p{pan:+.2f}_{peak:+.1f}.wav'.replace('+', 'p').replace('-', 'm')
    pj.samples.mkdir(parents=True, exist_ok=True)
    wavfile.write(pj.samples / name, sr, (np.clip(lr, -1, 1) * 32767).astype(np.int16))
    c['src'] = os.path.relpath(pj.samples / name, pj.root)
    c['quelle'] = os.path.relpath(p, pj.root)
    c['anchor_s'] = round(anker, 5)
    c['start'] = round(c['event'] - anker, 4)
    c['ms'] = 0.0
    c['dur'] = round(len(lr) / sr, 4)
    c['vol'] = 1.0
    hp = c.get('hochpass', cfg.get('hochpass', 350))
    c['fx'] = [('highpass', {'frequency': hp, 'q': 0.707, 'poles': '2'})] if hp else None
    c['lane'] = None


# ===================================================================== Betten (Musik, Raumton)
def bett_cues(pj, kit):
    duck_lin = 10 ** (float(pj.d.get('ducking_db', -2.5)) / 20)
    spans = []
    for c in kit:
        cfg = pj.fam_cfg(c['fam'])
        d = c.get('duck', cfg.get('duck', False))
        if c.get('duck_span'):
            spans.append([c['event'] - 0.03, c['event'] + float(c['duck_span'])])
        elif d == 'ganz':
            spans.append([c['event'] - 0.04, c['start'] + c['dur']])
        elif d:
            spans.append([c['event'] - 0.03, c['event'] + 0.18])
    spans.sort()
    merged = []
    for a, b in spans:
        if merged and a <= merged[-1][1] + 0.3:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])

    def duck(t):
        g = 1.0
        for a, b in merged:
            if a - 0.03 <= t <= b + 0.25:
                k = (a - t) / 0.03 if t < a else ((t - b) / 0.25 if t > b else 0.0)
                g = min(g, duck_lin + (1 - duck_lin) * min(1.0, k))
        return g

    out = []
    for bd in pj.d.get('betten', []):
        c = dict(bd)
        p = pj.root / c['src']
        sr, x = lies(p)
        start = float(c.get('start', 0.0))
        ms = float(c.get('media_start', 0.0))
        dur = float(c.get('dauer') or min(len(x) / sr - ms, pj.dauer - start))
        base = [tuple(q) for q in (c.get('lane') or [[start, 1.0], [start + dur, 1.0]])]
        basef = lambda t, base=base: float(np.interp(t, [q[0] for q in base], [q[1] for q in base]))
        if c.get('musik'):
            grid = sorted({q[0] for q in base} | {round(v, 3) for a, b in merged for v in (a - 0.03, a, b, b + 0.25)})
            lane = [(t, round(basef(t) * duck(t), 4)) for t in grid if start <= t <= start + dur]
        else:
            lane = base
        if c.get('rms_db') is not None:
            seg = x[int(ms * sr): int((ms + dur) * sr)]
            vol = 10 ** (float(c['rms_db']) / 20) / (np.sqrt((seg ** 2).mean()) + 1e-12)
        else:
            vol = 10 ** (float(c.get('pegel_db', 0.0)) / 20)
        out.append(dict(id=c['id'], src=c['src'], start=start, ms=ms, dur=round(dur, 4), vol=round(float(vol), 4),
                        lane=lane, fx=[tuple(f) for f in c.get('fx') or []] or None, fam='bett', event=start,
                        note=c.get('notiz', ''), musik=bool(c.get('musik'))))
    return out


# ===================================================================== HTML
def attr_json(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('&', '&amp;').replace('"', '&quot;')


def lane_abs(c, lokal=False):
    """Lautstärke-Punkte (Filmzeit, oder clip-lokal für data-automation: t in s ab Clip-Start) inkl. Grundpegel."""
    if not c.get('lane'):
        return None
    t0 = c['start'] if lokal else 0.0
    return [(round(max(0.0, t - t0), 4), round(v * c['vol'], 4)) for t, v in c['lane']]


def spuren(cs):
    ends = []
    for c in sorted(cs, key=lambda c: c['start']):
        for i, e in enumerate(ends):
            if c['start'] >= e + 0.001:
                c['track'] = i
                ends[i] = c['start'] + c['dur']
                break
        else:
            c['track'] = len(ends)
            ends.append(c['start'] + c['dur'])
    return len(ends)


LABEL = {'highpass': 'Tiefen weg', 'lowpass': 'Höhen weich', 'gain': 'Pegel', 'limiter': 'Decke'}


def schreibe_html(pj, cs, decke_db):
    comp = pj.d.get('composition_id', 'audio')
    master = pj.d.get('master_id', 'au-master')
    spur0 = int(pj.d.get('spur_versatz', 0))
    n = spuren(cs)
    rows = []
    for c in sorted(cs, key=lambda c: (c['start'], c['id'])):
        lane = lane_abs(c, lokal=True)
        a = [f'id="{c["id"]}"', f'src="{c["src"]}"', f'data-start="{c["start"]}"', f'data-duration="{c["dur"]}"']
        if c.get('ms'):
            a.append(f'data-media-start="{c["ms"]}"')
        a.append(f'data-track-index="{c["track"] + spur0}"')
        a.append(f'data-audio-group="{master}"')
        a.append(f'data-volume="{1 if lane else round(c["vol"], 4)}"')
        if lane:
            a.append('data-automation="' + attr_json({'version': 1, 'lanes': [{'target': 'volume', 'points': [{'t': t, 'v': v} for t, v in lane]}]}) + '"')
        if c.get('fx'):
            nodes = [{'type': t, 'id': f'n{i + 1}', 'label': LABEL.get(t, t), 'params': p} for i, (t, p) in enumerate(c['fx'])]
            a.append('data-fx-chain="' + attr_json({'version': 1, 'nodes': nodes}) + '"')
        info = (c.get('notiz') or c.get('note') or '').replace('--', '-')
        if c.get('fam') != 'bett':
            info += f" · Ereignis {c['ereignis']} · {c.get('slice') or Path(c['quelle']).name} {c['shift']:+.1f} HT, Pan {c['pan']:+.2f}"
        rows.append(f'        <!-- {c["event"]:.3f} s · {info.strip(" ·")} -->\n        <audio {" ".join(a)}></audio>')
    lim = attr_json({'version': 1, 'nodes': [{'type': 'limiter', 'id': 'n1', 'label': 'Master-Decke',
                                              'params': {'limit': round(decke_db, 2), 'attack': 0.1, 'release': 60, 'level_out': 0}}]})
    dur = pj.dauer
    html = f"""<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8">
    <!-- Tonspur ({str(dur).replace(".", ",")} s). GENERIERT von ton_bauen.py aus {pj.cues_pfad.name} + Ereignisliste. Nicht von Hand ändern.
         {len(cs)} Clips auf {n} Spuren. data-start = Filmzeit (Slot beginnt bei 0). Master-Decke {decke_db:.2f} dB. -->
  </head>
  <body>
    <template>
      <style>
        #{comp} {{ position: absolute; inset: 0; pointer-events: none; }}
      </style>
      <div id="{comp}" data-composition-id="{comp}" data-start="0" data-duration="{dur}" data-width="{int(pj.d.get('breite', 1920))}" data-height="{int(pj.d.get('hoehe', 1080))}">
        <!-- Master-Bus: alle Clips, Limiter als Sicherheitsdecke (True Peak nach AAC < -1 dBTP) -->
        <hf-audio-group id="{master}" data-label="Master" data-volume="1" data-fx-chain="{lim}"></hf-audio-group>
{chr(10).join(rows)}
      </div>
      <script>
        (function () {{
          window.__timelines = window.__timelines || {{}};
          // Reine Tonspur: keine Animation, die Timeline trägt nur die Länge.
          const tl = gsap.timeline({{ paused: true }});
          tl.to({{ t: 0 }}, {{ t: 1, duration: {dur}, ease: "none" }}, 0);
          window.__timelines["{comp}"] = tl;
        }})();
      </script>
    </template>
  </body>
</html>
"""
    pj.html.parent.mkdir(parents=True, exist_ok=True)
    pj.html.write_text(html)
    return n


# ===================================================================== Simulation
def limiter(seg, sr, limit_db, att_ms=0.1, rel_ms=60.0):
    """Nachbau des Master-Limiters (Hüllkurve mit Attack/Release, Verstärkung = Decke / Hüllkurve)."""
    ceil = 10 ** (limit_db / 20)
    a = math.exp(-1 / (sr * max(1e-5, att_ms / 1000)))
    r = math.exp(-1 / (sr * max(1e-5, rel_ms / 1000)))
    out = seg.copy()
    for ch in range(seg.shape[1]):
        x = seg[:, ch]
        ax = np.abs(x)
        if ax.max() <= ceil:
            continue
        env = 0.0
        y = x.tolist()
        for i, m in enumerate(ax.tolist()):
            env = m + (a if m > env else r) * (env - m)
            if env > ceil:
                y[i] = y[i] * (ceil / env)
        out[:, ch] = np.asarray(y)
    return out


def vormix(pj, cs, SR=48000):
    N = int(round(pj.dauer * SR))
    mix = np.zeros((N, 2))
    cache = {}
    for c in cs:
        if c['src'] not in cache:
            sr, x = lies(pj.root / c['src'])
            if x.ndim == 1:
                x = np.stack([x, x], 1)
            if sr != SR:
                g = math.gcd(sr, SR)
                x = resample_poly(x, SR // g, sr // g, axis=0)
            cache[c['src']] = x
        x = cache[c['src']]
        s0 = int(round(c['ms'] * SR))
        seg = x[s0: s0 + int(round(c['dur'] * SR))].copy()
        for typ, prm in c.get('fx') or []:
            if typ in ('highpass', 'lowpass'):
                seg = sosfilt(butter(2, prm['frequency'], 'hp' if typ == 'highpass' else 'lp', fs=SR, output='sos'), seg, axis=0)
            elif typ == 'gain':
                seg = seg * 10 ** (prm['gain'] / 20)
            elif typ == 'limiter':
                seg = limiter(seg, SR, prm['limit'], prm.get('attack', 0.1), prm.get('release', 60))
        lane = lane_abs(c)
        tt = np.arange(len(seg)) / SR + c['start']
        g = np.interp(tt, [p[0] for p in lane], [p[1] for p in lane]) if lane else np.full(len(seg), c['vol'])
        seg *= g[:, None]
        a = int(round(c['start'] * SR))
        b = min(N, a + len(seg))
        if b > a:
            mix[a:b] += seg[: b - a]
    return mix


def tp_nach_aac(mix, SR=48000, bitrate='192k'):
    with tempfile.TemporaryDirectory() as tmp:
        w, m4a = os.path.join(tmp, 'mix.wav'), os.path.join(tmp, 'mix.m4a')
        wavfile.write(w, SR, mix.astype(np.float32))
        subprocess.run(['nice', '-n', '10', 'ffmpeg', '-loglevel', 'error', '-y', '-i', w, '-c:a', 'aac', '-b:a', bitrate, m4a], check=True)
        return true_peak(lese_audio(m4a, SR))


# ===================================================================== Bericht
def bericht(cs):
    kit = sorted([c for c in cs if c.get('fam') != 'bett'], key=lambda c: c['event'])
    print('Einsätze je Familie:', dict(Counter(c['fam'] for c in kit)))
    rep = []
    for f in sorted(set(c['fam'] for c in kit)):
        seq = [c for c in kit if c['fam'] == f]
        for p, q in zip(seq, seq[1:]):
            if p['src'] == q['src']:
                rep.append(f"{f}: {p['id']} → {q['id']} identisches Sample")
            elif p.get('slice') and p.get('slice') == q.get('slice'):
                rep.append(f"{f}: {p['id']} → {q['id']} gleiche Variante (andere Tonhöhe)")
    print('Direkt aufeinanderfolgend gleich:', '; '.join(rep) if rep else 'keine')


def main():
    a = argparse.ArgumentParser(description='Tonspur aus Ereignisliste + Kit bauen (compositions/audio.html).')
    a.add_argument('--cues', required=True)
    a.add_argument('--sim', default=None, help='Offline-Mix als WAV (48 kHz) schreiben')
    a.add_argument('--decke', default=None, help='Master-Decke in dB oder "auto" (braucht --sim und ffmpeg)')
    a.add_argument('--tabelle', action='store_true')
    a.add_argument('--zerlegen-vorschlag', default=None, metavar='FAMILIE')
    a.add_argument('--aac-bitrate', default='192k')
    a.add_argument('--variante', default=None, help='ersetzt {variante} in den Bett-Quellen (Musik A/B)')
    o = a.parse_args()
    pj = Projekt(o.cues)
    for bd in pj.d.get('betten', []):
        if '{variante}' in bd['src']:
            if not o.variante:
                raise SystemExit(f"Bett {bd['id']}: Quelle enthält {{variante}}, bitte --variante angeben")
            bd['src'] = bd['src'].replace('{variante}', o.variante)
    if o.zerlegen_vorschlag:
        fam = o.zerlegen_vorschlag
        for bst, p in sorted(pj.dateien.get(fam, {}).items()):
            sr, m = pj.lade(p)
            hits = erkenne_schlaege(m, sr)
            print(f'{p.name}: ' + ', '.join(f'{fam}_{bst}{i + 1} {x:.3f}–{y:.3f} s ({pk:.0f} dB)' for i, (x, y, pk) in enumerate(hits)))
        print('Übernehmen als "slices" in cues.json (anhören, ob jeder Ausschnitt genau einen Schlag enthält).')
        return
    cues = loese_cues(pj)
    verteile_varianten(pj, cues)
    for c in cues:
        render_sample(pj, c)
    cs = bett_cues(pj, cues) + cues
    for c in cs:
        if c['start'] < 0:
            c['ms'] = round(c['ms'] - c['start'], 4)
            c['dur'] = round(c['dur'] + c['start'], 4)
            c['start'] = 0.0
        c['dur'] = round(min(c['dur'], pj.dauer - c['start']), 4)
    decke = float(pj.d.get('master_decke_db', -3.0)) if o.decke in (None, 'auto') else float(o.decke)
    n = schreibe_html(pj, cs, decke)
    print(f'{os.path.relpath(pj.html, pj.root)}: {len(cs)} Clips auf {n} Spuren, Samples in {os.path.relpath(pj.samples, pj.root)}/')
    bericht(cs)
    if o.tabelle:
        for c in sorted(cs, key=lambda c: c['event']):
            if c['fam'] == 'bett':
                print(f"{c['event']:7.3f}  Bett    {c['id']:26} {c['src']}")
            else:
                print(f"{c['event']:7.3f}  start {c['start']:7.3f}  {c['id']:26} {c['ereignis']:22} {(c.get('slice') or Path(c['quelle']).name):12} "
                      f"{c['shift']:+5.1f} HT  Pan {c['pan']:+.2f}  {c['peak']:+.1f} dB")
    if o.sim:
        SR = 48000
        mix = vormix(pj, cs, SR)
        print(f'Sim: Sample-Peak vor Master-Limiter {20 * np.log10(np.abs(mix).max() + 1e-12):.2f} dBFS')
        out = limiter(mix, SR, decke)
        if o.decke == 'auto':
            for runde in range(5):
                tp = tp_nach_aac(out, SR, o.aac_bitrate)
                print(f'  Decke {decke:.2f} dB → True Peak nach AAC {o.aac_bitrate}: {tp:.2f} dBTP')
                if tp <= -1.2:          # 0,2 dB Abstand zu -1 dBTP: der Limiter im Render ist nur nachgebaut
                    break
                decke -= (tp + 1.2) + 0.1
                out = limiter(mix, SR, decke)
            schreibe_html(pj, cs, decke)
            print(f'Master-Decke {decke:.2f} dB in {os.path.relpath(pj.html, pj.root)} eingetragen')
        Path(o.sim).parent.mkdir(parents=True, exist_ok=True)
        wavfile.write(o.sim, SR, (np.clip(out, -1, 1) * 32767).astype(np.int16))
        print(f'Sim: {o.sim} · {integrierte_lautheit(out, SR):.2f} LUFS · True Peak (WAV) {true_peak(out):.2f} dBTP'
              ' · Abnahme erst auf der Web-Kopie: lufs.py <film>_web.mp4')
    bau = {'cues': str(pj.cues_pfad), 'projekt': str(pj.root), 'dauer': pj.dauer, 'fps': pj.fps, 'master_decke_db': round(decke, 2),
           'ereignisse': str(pj.root / pj.d.get('ereignisse', 'ereignisse.json')),
           'clips': [{k: c.get(k) for k in ('id', 'fam', 'ereignis', 't_ereignis', 'versatz', 'event', 'start', 'anchor_s', 'dur', 'ms',
                                           'src', 'quelle', 'slice', 'shift', 'pan', 'peak', 'musik')} for c in sorted(cs, key=lambda c: c['event'])]}
    (pj.cues_pfad.parent / 'ton-bau.json').write_text(json.dumps(bau, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
