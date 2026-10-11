#!/usr/bin/env python3
"""Musik auf Filmzeit schneiden: Takt-Karte per Onset, Segmentplan aus JSON, Prüfung R1/R2/R5/R7.
Teil des Skills motion-videos (MIT). Braucht numpy und scipy (requirements.txt).

Aufruf:
  python3 musik_schnitt.py --plan film/ton-plan.json --takt-karte      # 1. Takte der Quelle ansehen, dann planen
  python3 musik_schnitt.py --plan film/ton-plan.json [--variante B]    # 2. schneiden + prüfen
  python3 musik_schnitt.py --plan film/ton-plan.json --nur-pruefen     #    nur den Plan prüfen, nichts schreiben
  Optionen: --out <wav> (sonst "ausgabe" aus dem Plan, {variante} wird ersetzt), --streng (BEWUSST zählt als Fehler)

Plan: templates/ton-plan.vorlage.json (Felder dort erklärt). Pfade im Plan sind relativ zum Ordner der Plan-Datei.
Regeln (references/06-ton.md):
  R1 Zwischen zwei Einsätzen ohne echte Stille nur ganze Takte (Nähte auf Takt-Einsen der Quelle).
     Freie Längen nur in erklärter Stille oder als Fermate/Fläche ohne Puls ("frei": true + "grund").
  R2 Kein Quell-Takt wörtlich doppelt innerhalb von 30 s (bewusste Wiederholung: "wiederholung": "<Grund>").
  R5 Keine gekachelten Ausklänge: der Schluss kommt aus einer Quelle, nicht aus Stücken < 2 Takte.
  R7 Ab "raster.ab" liegen alle Groove-Abschnitte auf Kick-Phase 0 ± 0,05 Schlag zum Film-Raster (Plan-Phase je
     Segment; gemessen am Schnitt mit scripts/ton/kick.py, derselben Methode wie qualitaet.py --ton: Urteil
     „auf dem Raster“, „halber Schlag daneben“, „zweideutig“ oder „unklar“).
Schnitt: kein Time-Stretch, keine Tonhöhe. Nähte als gleichlautende Überblendung (Standard 15 ms, 15 bis 30 ms),
Schnittpunkte auf den nächsten Nulldurchgang (± 1 ms) gezogen. Danach Effekte (Hall-Fahne, Reverse-Swell,
Tiefpass-Dip …), 0,5 s Ausblende am Filmende und Lookahead-Limiter auf die Musik-Decke.
Ausgabe: WAV (16 Bit, Rate der Quelle) + <ausgabe>.segmente.json (aufgelöste Segmente, Takt-Raster, Prüfung)
für ton_pruefen.py. Exit-Code 1 bei Urteil ROT.
"""
import argparse
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kick  # noqa: E402  eine Kick-Phasen-Methode für musik_schnitt.py und qualitaet.py
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, fftconvolve, lfilter, resample_poly, sosfilt

TOL_EINS = 0.006      # s, Naht gilt als "auf der Takt-Eins"
FENSTER_R2 = 30.0     # s


# ===================================================================== Einlesen
def lies_wav(pfad):
    sr, x = wavfile.read(pfad)
    if x.dtype == np.int16:
        x = x.astype(np.float64) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float64) / 2147483648.0
    else:
        x = x.astype(np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    return sr, x[:, :2]


def fmt(t):
    return f'{t:.2f}'.replace('.', ',')


# ===================================================================== Takt-Karte
def _onset_huellen(m, sr, hop=128, n=1024):
    fr = np.lib.stride_tricks.sliding_window_view(m, n)[::hop]
    S = np.log1p(100 * np.abs(np.fft.rfft(fr * np.hanning(n), axis=1)))
    f = np.fft.rfftfreq(n, 1 / sr)
    fps = sr / hop

    def norm(e):
        e = np.concatenate([[0.0], e])
        k = max(1, int(fps * 0.5))
        e = np.maximum(0, e - np.convolve(e, np.ones(k) / k, 'same'))
        return e / (e.std() + 1e-9)
    # Schlag-Hüllkurve aus Bass und Mitten (< 2 kHz): Hi-Hats auf den Achteln ziehen die Phase sonst auf die Off-Beats
    flux = norm(np.maximum(0, np.diff(S[:, f < 2000], axis=0)).sum(1))
    kick = norm(np.maximum(0, np.diff(S[:, f < 150], axis=0)).sum(1))
    return flux + kick, kick, fps, n / 2 / sr


def _raster_score(env, fps, t0, P, phi, T):
    ts = np.arange(phi, T - 0.05, P)
    i = np.round((ts - t0) * fps).astype(int)
    i = i[(i >= 0) & (i < len(env))]
    return env[i].mean() if len(i) else 0.0


def takt_karte(x, sr, bpm=None, eins=None, schlag_s=None, schlaege=4):
    """Schlagdauer, erste Takt-Eins (Takt 0) und Kennzahlen je Takt. bpm = Hinweis (± 4 %), eins/schlag_s = gemessene
    Werte, die die Erkennung ersetzen. Takt 0 = erste Takt-Eins ab dem ersten hörbaren Einsatz."""
    m = x.mean(1)
    T = len(m) / sr
    flux, kick, fps, t0 = _onset_huellen(m, sr)
    info = {}
    if schlag_s:
        P = float(schlag_s)
        info['schlag'] = 'aus dem Plan'
    else:
        ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
        lag = np.arange(len(ac)) / fps
        lo, hi = (60 / bpm * 0.96, 60 / bpm * 1.04) if bpm else (60 / 200, 60 / 70)
        k = (lag > lo) & (lag < hi)
        # ohne BPM-Hinweis: sanfte Bevorzugung um 120 BPM, sonst gewinnt oft das halbe Tempo
        prior = 1.0 if bpm else np.exp(-0.5 * (np.log2((60 / lag[k]) / 120) / 0.6) ** 2)
        P0 = lag[k][np.argmax(ac[k] * prior)]
        best = (-1, P0)
        for Pc in np.arange(P0 * 0.99, P0 * 1.01, 0.00002):
            s = max(_raster_score(flux, fps, t0, Pc, ph, T) for ph in np.arange(0, Pc, 0.004))
            if s > best[0]:
                best = (s, Pc)
        P = best[1]
        info['schlag'] = 'gemessen (Onset-Autokorrelation + Kammfilter)'
        if not bpm:
            b = 60 / P
            info['warnung'] = (f'ohne takt.bpm geschätzt; oft liegt das echte Tempo bei {b * 1.5:.0f}, {b * 2:.0f}, {b / 2:.0f} '
                               f'oder {b * 2 / 3:.0f} BPM. BPM aus Musik-Prompt oder ton-referenz.mjs als takt.bpm eintragen.')
    phs = np.arange(0, P, 0.0005)
    phi = phs[int(np.argmax([_raster_score(flux, fps, t0, P, ph, T) for ph in phs]))]
    BAR = schlaege * P
    if eins is not None:
        e0 = float(eins)
        info['eins'] = 'aus dem Plan'
        info['konfidenz'] = None
    else:
        # Takt-Eins = Schlag-Phase mit den stärksten Klangwechseln (Abschnitte beginnen auf der Eins) + Kick-Anteil
        beats = np.arange(phi, T - P, P)
        nf = 2048
        f = np.fft.rfftfreq(nf, 1 / sr)
        edges = np.geomspace(40, 16000, 25)
        F = []
        for b in beats:
            a = int(b * sr)
            seg = m[a: a + int(P * sr)]
            if len(seg) < nf:
                seg = np.pad(seg, (0, nf - len(seg)))
            fr = np.lib.stride_tricks.sliding_window_view(seg, nf)[::512]
            S = (np.abs(np.fft.rfft(fr * np.hanning(nf), axis=1)) ** 2).mean(0)
            F.append([np.log10(S[(f >= lo) & (f < hi)].sum() + 1e-12) for lo, hi in zip(edges[:-1], edges[1:])])
        F = np.array(F)
        nov = np.array([np.linalg.norm(F[i:i + 2].mean(0) - F[i - 2:i].mean(0)) if 2 <= i <= len(F) - 2 else 0.0
                        for i in range(len(F))])
        # Betonung: Bass-Pegel (< 150 Hz) in den ersten 80 ms nach jeder Schlag-Phase, gemittelt über alle Takte
        lp = sosfilt(butter(2, 150, 'lp', fs=sr, output='sos'), m)
        akz = []
        for j in range(schlaege):
            v = [np.sqrt((lp[int(t * sr): int(t * sr) + int(0.08 * sr)] ** 2).mean()) for t in np.arange(phi + j * P, T - 0.1, BAR)]
            akz.append(20 * np.log10(np.mean(v) + 1e-12))
        akz = np.array(akz)
        nov_b = np.array([nov[j::schlaege].mean() for j in range(schlaege)])
        score = nov_b / (nov_b.max() + 1e-9) + (akz - akz.max()) / 3.0
        j = int(np.argmax(score))
        srt = np.sort(score)
        info['eins'] = 'gemessen (Klangwechsel und Bass-Betonung je Schlag-Phase)'
        info['konfidenz'] = round(float(srt[-1] - srt[-2]), 2)
        e0 = phi + j * P
    # Takt 0 = erste Eins ab dem ersten hörbaren Einsatz
    h = int(sr * 0.01)
    rms = 20 * np.log10(np.sqrt((m[: len(m) // h * h].reshape(-1, h) ** 2).mean(1)) + 1e-9)
    erster = float(np.argmax(rms > rms.max() - 40)) * 0.01
    e0 = e0 - math.floor((e0 - (erster - 0.5 * P)) / BAR) * BAR
    info.update(bpm=round(60 / P, 3), schlag_s=round(P, 6), takt_s=round(BAR, 6), eins_s=round(e0, 5),
                takte=int((T - e0) // BAR), erster_einsatz_s=round(erster, 3))
    return P, e0, info, (flux, kick, fps, t0)


def zeige_takt_karte(x, sr, P, e0, info, schlaege):
    """Je Takt: Pegel gesamt, Bass (< 150 Hz), Präsenz (> 3 kHz) und Klangwechsel zum Vortakt.
    Ob ein Takt Puls hat (Groove) oder Fläche ist, entscheidet das Ohr; die Wechsel markieren Abschnittsgrenzen."""
    BAR = schlaege * P
    m = x.mean(1)
    lpk = sosfilt(butter(2, 150, 'lp', fs=sr, output='sos'), m)
    hpk = sosfilt(butter(2, 3000, 'hp', fs=sr, output='sos'), m)
    print(f"Takt-Karte: {info['bpm']} BPM · Schlag {info['schlag_s']} s ({info['schlag']}) · Takt {info['takt_s']} s"
          f" · Takt 0 = {info['eins_s']} s ({info['eins']}" + (f", Konfidenz {info['konfidenz']}" if info.get('konfidenz') is not None else '') + ')')
    if info.get('warnung'):
        print('  Hinweis: Tempo ' + info['warnung'])
    if info.get('konfidenz') is not None and info['konfidenz'] < 0.2:
        print('  Hinweis: Takt-Eins unsicher (Konfidenz < 0,2). Eins anhören und im Plan als takt.eins eintragen.')
    print('Takt  Eins (s)  Pegel dB  Bass dB  Präsenz dB')
    db = lambda v: 20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-9)
    prev, rows = None, []
    for k in range(info['takte']):
        a, b = int((e0 + k * BAR) * sr), int((e0 + (k + 1) * BAR) * sr)
        spec = np.abs(np.fft.rfft(m[a:b] * np.hanning(b - a), 8192))
        spec = np.log10(np.add.reduceat(spec, np.unique(np.geomspace(1, 4096, 20).astype(int))) + 1e-9)
        wech = float(np.linalg.norm(spec - prev)) if prev is not None else 0.0
        prev = spec
        rows.append((k, e0 + k * BAR, db(m[a:b]), db(lpk[a:b]), db(hpk[a:b]), wech))
    w = np.array([r[5] for r in rows])
    grenze = np.median(w) + 1.5 * w.std() if len(w) > 3 else 1e9
    for k, t, r, bl, hl, wech in rows:
        print(f'{k:4}  {t:8.3f}  {r:8.1f}  {bl:7.1f}  {hl:10.1f}' + ('  ◀ neuer Abschnitt' if wech > grenze and k else ''))


# ===================================================================== Plan auflösen
class Plan:
    def __init__(self, pfad, variante=None):
        self.pfad = Path(pfad).resolve()
        self.dir = self.pfad.parent
        self.d = json.loads(self.pfad.read_text())
        var = self.d.get('varianten') or {}
        self.variante = variante or self.d.get('variante_standard') or (sorted(var)[0] if var else '')
        if var and self.variante not in var:
            raise SystemExit(f'Variante {self.variante!r} fehlt im Plan (vorhanden: {", ".join(sorted(var))})')
        v = var.get(self.variante, {})
        self.segmente = [dict(s) for s in self.d.get('segmente', [])] + [dict(s) for s in v.get('segmente', [])]
        self.effekte = [dict(e) for e in self.d.get('effekte', [])] + [dict(e) for e in v.get('effekte', [])]
        self.dauer = float(self.d['dauer'])
        t = self.d.get('takt', {})
        self.bpm, self.eins, self.schlag_s = t.get('bpm'), t.get('eins'), t.get('schlag_s')
        self.schlaege = int(t.get('schlaege_pro_takt', 4))
        r = self.d.get('raster', {})
        self.raster_bpm = float(r.get('bpm') or self.bpm or 120)
        self.raster_versatz = float(r.get('versatz', 0.0))
        self.raster_ab = float(r.get('ab', 0.0))
        self.stille = [tuple(s) for s in self.d.get('stille', [])]
        self.xf = float(self.d.get('crossfade_ms', 15)) / 1000

    def pfad_von(self, p):
        q = Path(p)
        return q if q.is_absolute() else self.dir / q

    def kit_datei(self, name):
        q = Path(name)
        if q.suffix:
            return self.pfad_von(name)
        return self.pfad_von(self.d.get('kit', '.')) / f'{name}.wav'

    def ausgabe(self, out=None):
        p = out or self.d.get('ausgabe', 'musik_schnitt_{variante}.wav')
        return self.pfad_von(str(p).replace('{variante}', self.variante or 'X'))


def loese_segmente(plan, P, e0, quelle_s):
    """Segmente in Quell- und Filmzeit. Verankert ("film"/"film_schlag") oder Anschluss an den Vorgänger."""
    BAR = plan.schlaege * P
    rb = 60 / plan.raster_bpm
    segs = []
    for i, s in enumerate(plan.segmente):
        vor = float(s.get('vorlauf_s', 0.0)) + float(s.get('vorlauf_takte', 0)) * BAR
        anker_q = e0 + float(s['takt']) * BAR + float(s.get('schlag', 0)) * P
        if 'film' in s:
            anker_f = float(s['film'])
        elif 'film_schlag' in s:
            anker_f = plan.raster_versatz + float(s['film_schlag']) * rb
        else:
            anker_f = None
        if i == 0 and anker_f is None:
            raise SystemExit('Segment 1 braucht "film" oder "film_schlag".')
        segs.append(dict(nr=i + 1, roh=s, takt=float(s['takt']), vor=vor, anker_q=anker_q, q_a=anker_q - vor,
                         anker_f=anker_f, film_a=None if anker_f is None else anker_f - vor))
    for i, g in enumerate(segs):
        s = g['roh']
        if g['film_a'] is None:                       # Anschluss: beginnt, wo der Vorgänger endet
            g['film_a'] = segs[i - 1]['film_b']
            g['anker_f'] = g['film_a'] + g['vor']
        if 'takte' in s:
            laenge = float(s['takte']) * BAR + g['vor']
        elif 'schlaege' in s:
            laenge = float(s['schlaege']) * P + g['vor']
        elif 'bis_film' in s:
            laenge = float(s['bis_film']) - g['film_a']
        elif s.get('bis_ende'):
            laenge = quelle_s - g['q_a']
        elif i + 1 < len(segs) and segs[i + 1]['film_a'] is not None:
            laenge = segs[i + 1]['film_a'] - g['film_a']
        else:
            laenge = plan.dauer - g['film_a']
        laenge = min(laenge, quelle_s - g['q_a'], plan.dauer - g['film_a'] + (10.0 if s.get('bis_ende') else 0.0))
        if laenge <= 0:
            raise SystemExit(f"Segment {g['nr']}: Länge {laenge:.3f} s (überlappt den Nachfolger oder liegt hinter dem Filmende)")
        g['q_b'] = g['q_a'] + laenge
        g['film_b'] = g['film_a'] + laenge
    return segs


# ===================================================================== Audio-Bausteine
def _nulldurchgang(m, i, r):
    a, b = max(1, i - r), min(len(m) - 1, i + r)
    z = np.where(np.signbit(m[a - 1:b - 1]) != np.signbit(m[a:b]))[0]
    return i if not len(z) else a + int(z[np.argmin(np.abs(a + z - i))])


def verarbeiten(seg, sr, s):
    """Präsenz-Shelf ab 3 kHz, Breite (Seitensignal) und Pegel eines Segments."""
    if s.get('praesenz_db'):
        hp = sosfilt(butter(2, 3000, 'hp', fs=sr, output='sos'), seg, axis=0)
        seg = seg + (10 ** (float(s['praesenz_db']) / 20) - 1) * hp
    if s.get('breite_db'):
        mid, side = (seg[:, 0] + seg[:, 1]) / 2, (seg[:, 0] - seg[:, 1]) / 2 * 10 ** (float(s['breite_db']) / 20)
        seg = np.stack([mid + side, mid - side], 1)
    return seg * 10 ** (float(s.get('gain_db', 0.0)) / 20)


def hochpass_fahrt(seg, sr, f0, f1, nb=10):
    acc = np.zeros_like(seg)
    edges = np.linspace(0, len(seg), nb + 1).astype(int)
    ov = int(0.03 * sr)
    for q in range(nb):
        fc = f0 * (f1 / f0) ** (q / (nb - 1))
        hpq = sosfilt(butter(2, fc, 'hp', fs=sr, output='sos'), seg, axis=0)
        wq = np.zeros(len(seg))
        wq[max(0, edges[q] - ov): min(len(seg), edges[q + 1] + ov)] = 1.0
        acc += hpq * np.convolve(wq, np.ones(ov) / ov, mode='same')[:, None]
    return acc


def hall(seg, sr, rt60, seed=7):
    """Nur der Hall-Anteil (Faltung mit exponentiellem Rauschen, Höhen bis 9 kHz, Bässe unter 250 Hz trocken)."""
    n = int(rt60 * sr)
    rng = np.random.default_rng(seed)
    env = 10 ** (-3 * (np.arange(n) / sr) / rt60)
    ir = rng.standard_normal((n, 2)) * env[:, None]
    ir = sosfilt(butter(2, 9000, 'lp', fs=sr, output='sos'), ir, axis=0)
    ir = sosfilt(butter(2, 250, 'hp', fs=sr, output='sos'), ir, axis=0)
    ir /= np.sqrt((ir ** 2).sum(0))
    return np.stack([fftconvolve(seg[:, c], ir[:, c]) for c in range(2)], 1)


def lookahead_limit(x, sr, ceil_db, look_ms=3.0, rel_ms=80.0):
    """Lookahead-Limiter. ceil_db: Zahl oder Array je Sample (Decke in dBFS)."""
    ceil = 10 ** (np.asarray(ceil_db) / 20)
    a = np.abs(x).max(1)
    need = np.minimum(1.0, ceil / np.maximum(a, 1e-9))
    L = max(1, int(sr * look_ms / 1000))
    g = minimum_filter1d(need, size=2 * L + 1)
    k = math.exp(-1 / (sr * rel_ms / 1000))
    g = np.minimum(g, lfilter([1 - k], [1, -k], g))
    g = minimum_filter1d(g, size=2 * L + 1)
    g = np.convolve(g, np.ones(L) / L, mode='same')
    return x * np.minimum(g, need)[:, None]


def add_at(out, sig, t, sr):
    a = int(round(t * sr))
    if a < 0:
        sig, a = sig[-a:], 0
    b = min(len(out), a + len(sig))
    if b > a:
        out[a:b] += sig[: b - a]


def lade_kit(plan, name, von, bis, sr):
    ksr, k = lies_wav(plan.kit_datei(name))
    k = k[int(von * ksr): int(bis * ksr) if bis else None]
    if ksr != sr:
        g = math.gcd(ksr, sr)
        k = resample_poly(k, sr // g, ksr // g, axis=0)
    return k


def effekt(out, x, sr, plan, e, P, e0, BAR):
    typ = e['typ']
    if typ == 'tiefpass_dip':
        von, bis = float(e['von']), float(e['bis'])
        ramp, aus = float(e.get('rampe_s', 0.30)), float(e.get('aus_s', 0.06))
        a0, a1 = int(round((von - ramp) * sr)), int(round((bis + aus) * sr))
        seg = out[a0:a1].copy()
        lp = sosfilt(butter(2, float(e.get('hz', 1200)), 'lp', fs=sr, output='sos'), seg, axis=0)
        t = np.arange(len(seg)) / sr + (von - ramp)
        knoten = [von - ramp, von, bis - 0.005, bis + aus]
        w = np.interp(t, knoten, [0, 1, 1, 0])
        gdb = np.interp(t, knoten, [0, float(e.get('db', -5)), float(e.get('db', -5)), 0])
        out[a0:a1] = ((1 - w)[:, None] * seg + w[:, None] * lp) * (10 ** (gdb / 20))[:, None]
    elif typ == 'hall_swell':
        a, b = int(round(float(e['von']) * sr)), int(round(float(e['bis']) * sr))
        add_at(out, float(e.get('anteil', 0.9)) * hall(out[a:b].copy(), sr, float(e.get('rt60', 2.2)), seed=13), float(e['von']), sr)
    elif typ == 'hall_fahne':
        s0 = int(round(float(e['ab']) * sr))
        add_at(out, float(e.get('anteil', 0.5)) * hall(out[s0:].copy(), sr, float(e.get('rt60', 3.0))), float(e['ab']), sr)
    elif typ == 'reverse_swell':
        d = lade_kit(plan, e['datei'], float(e.get('von', 0)), e.get('bis'), sr)
        w = 1.5 * hall(d, sr, float(e.get('rt60', 1.3)), seed=11)
        w[: len(d)] += d
        w = w[::-1].copy()
        kin = int(0.35 * len(w))
        w[:kin] *= (np.linspace(0, 1, kin) ** 2)[:, None]
        w *= 10 ** (float(e.get('peak_db', -14)) / 20) / (np.abs(w).max() + 1e-12)
        add_at(out, w, float(e['ende']) - len(w) / sr, sr)
    elif typ == 'akzent':
        teile = [lade_kit(plan, d['datei'], float(d.get('von', 0)), d.get('bis'), sr) * 10 ** (float(d.get('gain_db', 0)) / 20)
                 for d in e['dateien']]
        n = max(len(t) for t in teile)
        w = np.zeros((n, 2))
        for t in teile:
            w[: len(t)] += t
        if e.get('rt60'):
            w = np.concatenate([w, np.zeros((int(float(e['rt60']) * sr) - 1, 2))]) + hall(w, sr, float(e['rt60']), seed=17)
        w *= 10 ** (float(e.get('peak_db', -20)) / 20) / (np.abs(w).max() + 1e-12)
        add_at(out, w, float(e['t']), sr)
    elif typ == 'takt_impact':
        a = int(round((e0 + float(e['takt']) * BAR) * sr))
        c = x[a: a + int(round(float(e.get('schlaege', 1.5)) * P * sr))].copy()
        kf = int(float(e.get('ausblende_s', 0.35)) * sr)
        c[-kf:] *= (np.cos(0.5 * np.pi * np.arange(kf) / kf) ** 2)[:, None]
        c = verarbeiten(c, sr, e)
        rt = float(e.get('rt60', 3.0))
        c = np.concatenate([c, np.zeros((int(rt * sr) - 1, 2))]) + float(e.get('anteil', 1.6)) * hall(c, sr, rt, seed=19)
        add_at(out, c, float(e['t']), sr)
    elif typ == 'sub':
        k = lade_kit(plan, e['datei'], 0, float(e.get('laenge', 0.7)), sr).mean(1)
        r = Fraction(2 ** (float(e.get('semis', -5)) / 12)).limit_denominator(400)
        k = resample_poly(k, r.denominator, r.numerator)
        if e.get('gleiten'):
            n = len(k)
            p = np.arange(n)
            rate = 2 ** ((float(e['gleiten']) * p / max(1, n - 1)) / 12)
            tt = np.concatenate([[0.0], np.cumsum(1.0 / rate[:-1])])
            k = np.interp(np.interp(np.arange(int(tt[-1])), tt, p), p, k)
        kf = int(0.5 * len(k))
        k[-kf:] *= np.linspace(1, 0, kf) ** 2
        k = k * 10 ** (float(e.get('peak_db', -8)) / 20) / (np.abs(k).max() + 1e-12)
        add_at(out, np.stack([k, k], 1), float(e['t']), sr)
    else:
        raise SystemExit(f'Unbekannter Effekt-Typ: {typ}')


def schneiden(plan, segs, x, sr, P, e0):
    BAR = plan.schlaege * P
    N = int(round(plan.dauer * sr))
    out = np.zeros((N, 2))
    mono = x.mean(1)
    zr = int(0.001 * sr)
    # Nähte auf den Nulldurchgang: die Schnittstelle wandert um höchstens 1 ms, beide Seiten um denselben Betrag,
    # damit die Musik exakt auf dem Plan bleibt (nur der Ort der Überblendung verschiebt sich).
    delta = [0] * (len(segs) + 1)
    for i in range(len(segs) - 1):
        if abs(segs[i]['film_b'] - segs[i + 1]['film_a']) < 1e-4:
            b0 = int(round(segs[i]['q_b'] * sr))
            delta[i + 1] = _nulldurchgang(mono, b0, zr) - b0
    for i, g in enumerate(segs):
        s = g['roh']
        prev_joined = i > 0 and abs(segs[i - 1]['film_b'] - g['film_a']) < 1e-4
        nxt_joined = i + 1 < len(segs) and abs(g['film_b'] - segs[i + 1]['film_a']) < 1e-4
        pre = float(s.get('xf_ms', plan.xf * 1000)) / 1000 if prev_joined else (0.004 if i else 0.0)
        d_ein, d_aus = delta[i], delta[i + 1]
        a = int(round(g['q_a'] * sr)) + d_ein
        b = int(round(g['q_b'] * sr)) + d_aus
        k = int(round(pre * sr))
        seg = x[max(0, a - k): b].copy()
        seg = verarbeiten(seg, sr, s)
        n = len(seg)
        gn = np.ones(n)
        if k:
            gn[:k] = np.sin(0.5 * np.pi * np.arange(k) / k)
        if nxt_joined:
            ko = int(round(float(segs[i + 1]['roh'].get('xf_ms', plan.xf * 1000)) / 1000 * sr))
        else:
            ko = int(round(float(s.get('fade_out_ms', 15)) / 1000 * sr)) if i + 1 < len(segs) else 0
        if ko:
            gn[n - ko:] *= np.cos(0.5 * np.pi * np.arange(ko) / ko)
        if i == 0 and s.get('einblende_s', 0.15):
            kh = int(float(s.get('einblende_s', 0.15)) * sr)
            gn[:kh] *= np.linspace(0, 1, kh)
        if i == len(segs) - 1 and s.get('ausblende_s'):
            kt = int(float(s['ausblende_s']) * sr)
            gn[n - kt:] *= np.linspace(1, 0, kt)
        seg *= gn[:, None]
        if s.get('hochpass_fahrt'):
            seg = hochpass_fahrt(seg, sr, *map(float, s['hochpass_fahrt']))
        add_at(out, seg, g['film_a'] + d_ein / sr - k / sr, sr)
    for e in plan.effekte:
        effekt(out, x, sr, plan, e, P, e0, BAR)
    kz = int(float(plan.d.get('schluss_ausblende_s', 0.5)) * sr)
    if kz:
        out[N - kz:] *= (np.cos(0.5 * np.pi * np.arange(kz) / kz) ** 2)[:, None]
    tt = np.arange(N) / sr
    ceil = np.full(N, float(plan.d.get('decke_db', -6.0)))
    if plan.d.get('decke_extra'):
        pk = plan.d['decke_extra']
        ceil = ceil + np.interp(tt, [p[0] for p in pk], [p[1] for p in pk])
    return lookahead_limit(out * 10 ** (float(plan.d.get('pegel_db', 0.0)) / 20), sr, ceil)


# ===================================================================== Prüfung
def pruefen(plan, segs, P, e0, y=None, sr=None, messdatei=None):
    BAR = plan.schlaege * P
    rb = 60 / plan.raster_bpm
    bef = {}

    def ist_eins(tq):
        k = (tq - e0) / BAR
        return abs(k - round(k)) * BAR <= TOL_EINS, k

    def in_stille(a, b):
        return any(s0 - 0.01 <= a and b <= s1 + 0.01 for s0, s1 in plan.stille)

    # R1
    r1 = []
    for i in range(len(segs) - 1):
        g, n = segs[i], segs[i + 1]
        luecke = n['film_a'] - g['film_b']
        if luecke > 0.02:
            if in_stille(g['film_b'], n['film_a']):
                r1.append(('OK', f"Naht {g['nr']}→{n['nr']}: {fmt(luecke)} s erklärte Stille ({fmt(g['film_b'])} bis {fmt(n['film_a'])} s)"))
            else:
                r1.append(('FEHLER', f"Naht {g['nr']}→{n['nr']}: Lücke {fmt(luecke)} s bei {fmt(g['film_b'])} s ohne erklärte Stille (\"stille\" im Plan)"))
            continue
        e_aus, k_aus = ist_eins(g['q_b'])
        e_ein, k_ein = ist_eins(n['q_a'])
        frei = [s for s in (g, n) if s['roh'].get('frei')]
        txt = f"Naht {g['nr']}→{n['nr']} bei {fmt(n['film_a'])} s: Quelle Takt {k_aus:.2f} → {k_ein:.2f}"
        if e_aus and e_ein:
            r1.append(('OK', txt + ' (beide auf der Eins)'))
        elif frei:
            r1.append(('FREI', txt + ' · frei: ' + '; '.join(s['roh'].get('grund', 'ohne Grund') for s in frei)))
        else:
            r1.append(('FEHLER', txt + ' · nicht auf der Takt-Eins und nicht als frei erklärt'))
    bef['R1'] = r1
    # R2: welche Quell-Takte liegen wo im Film?
    vorkommen = []
    for g in segs:
        k0 = math.ceil((g['q_a'] - e0) / BAR - 0.01)
        k1 = math.floor((g['q_b'] - e0) / BAR + 0.01)
        for k in range(k0, k1):
            vorkommen.append((k, g['film_a'] + (e0 + k * BAR - g['q_a']), g))
    for e in plan.effekte:
        if e['typ'] == 'takt_impact':
            vorkommen.append((int(e['takt']), float(e['t']), {'nr': 'Effekt', 'roh': e}))
    je_takt = {}
    for k, t, g in sorted(vorkommen, key=lambda v: v[1]):
        je_takt.setdefault(k, []).append((t, g))
    gruppen = {}
    for k, occ in je_takt.items():
        nah = [(t, g) for t, g in occ if any(abs(t - t2) < FENSTER_R2 for t2, g2 in occ if g2 is not g)]
        if len(nah) < 2:
            continue
        key = tuple(g['nr'] for _, g in nah)
        gruppen.setdefault(key, []).append((k, nah))
    r2 = []
    for key, lst in gruppen.items():
        ks = [k for k, _ in lst]
        nah = lst[0][1]
        spaeter = [g for _, g in nah[1:]]
        gruende = [g['roh'].get('wiederholung') for g in spaeter]
        orte = ' · '.join(f"{fmt(t)} s (Segment {g['nr']})" if g['nr'] != 'Effekt' else f"{fmt(t)} s (Effekt)" for t, g in nah)
        txt = f"Takt {ks[0]}" + (f"–{ks[-1]}" if len(ks) > 1 else '') + f": {orte}"
        if all(gruende):
            r2.append(('BEWUSST', txt + ' · Grund: ' + '; '.join(dict.fromkeys(gruende))))
        else:
            r2.append(('FEHLER', txt + ' · Wiederholung ohne "wiederholung"-Grund'))
    bef['R2'] = r2 or [('OK', f'kein Quell-Takt doppelt innerhalb von {int(FENSTER_R2)} s')]
    # R5: Schluss
    fenster = float(plan.d.get('ende_fenster', 8.0))
    start = plan.dauer - fenster
    stuecke = [g for g in segs if g['film_b'] > start and (g['q_b'] - g['q_a']) < 2 * BAR - 0.01 and not g['roh'].get('bis_ende')]
    impacts = [e for e in plan.effekte if e['typ'] in ('takt_impact',) and float(e['t']) > start]
    letzte = max(segs, key=lambda g: g['film_b'])
    r5 = []
    n_k = len(stuecke) + len(impacts)
    if n_k >= 2:
        r5.append(('FEHLER', f"Schluss gekachelt: {n_k} Stücke < 2 Takte in den letzten {fmt(fenster)} s ("
                   + ', '.join([f"Segment {g['nr']} ab {fmt(g['film_a'])} s" for g in stuecke]
                               + [f"Impact Takt {e['takt']} bei {fmt(float(e['t']))} s" for e in impacts]) + ')'))
    if letzte['roh'].get('bis_ende'):
        r5.append(('OK', f"Schluss aus einer Quelle: Segment {letzte['nr']} läuft ab {fmt(letzte['film_a'])} s bis zum Ende des Takes"))
    elif letzte['film_b'] < plan.dauer - 0.6 and not any(e['typ'] in ('hall_fahne', 'takt_impact') for e in plan.effekte):
        r5.append(('FEHLER', f"Musik endet bei {fmt(letzte['film_b'])} s ohne Ausklang (kein Quellende, keine Hall-Fahne)"))
    elif n_k < 2:
        r5.append(('HINWEIS', f"Segment {letzte['nr']} endet bei {fmt(letzte['film_b'])} s vor dem Ende des Takes; Schluss im Hörtest prüfen"))
    bef['R5'] = r5
    # R7: Phase der Quell-Einsen zum Film-Raster
    r7 = []
    for g in segs:
        if g['film_b'] <= plan.raster_ab + 0.01 or g['roh'].get('frei'):
            continue
        k0 = math.ceil((g['q_a'] - e0) / BAR - 0.01)
        k1 = math.floor((g['q_b'] - e0) / BAR + 0.01)
        ph = []
        for k in range(k0, max(k0 + 1, k1)):
            tf = g['film_a'] + (e0 + k * BAR - g['q_a'])
            if tf < plan.raster_ab - 0.01 or tf > g['film_b'] + 0.01:
                continue
            p = ((tf - plan.raster_versatz) / rb) % 1.0
            ph.append(p - 1 if p > 0.5 else p)
        if not ph:
            continue
        mx = max(ph, key=abs)
        st = 'OK' if abs(mx) <= 0.05 else 'FEHLER'
        r7.append((st, f"Segment {g['nr']} ({fmt(g['film_a'])}–{fmt(g['film_b'])} s): Plan-Phase {mx:+.3f} Schlag"))
    # Gemessen am fertigen Schnitt: dieselbe Methode und dieselben Abschnitte wie qualitaet.py --ton (scripts/ton/kick.py)
    if messdatei is not None or (y is not None and sr):
        if messdatei is not None:      # bitgleich zu qualitaet.py: dieselbe ffmpeg-Umrechnung auf 22 050 Hz mono
            m22 = kick.lade_mono(str(messdatei))
        else:
            m = y.mean(1) if y.ndim > 1 else y
            g_ = math.gcd(int(sr), kick.SR)
            m22 = resample_poly(m, kick.SR // g_, int(sr) // g_) if int(sr) != kick.SR else m
        kz = kick.zusammenfassung(kick.kick_phase(m22, kick.SR, plan.raster_bpm, plan.raster_versatz, plan.raster_ab))
        st = 'HINWEIS' if kz['urteil'] in ('halber Schlag daneben', 'daneben') else 'OK'
        r7.append((st, f"gemessen (scripts/ton/kick.py, gleiche Zahl wie qualitaet.py --ton): {kz['text']}"
                   + (' → Takt-Eins der Quelle (takt.eins) prüfen' if st == 'HINWEIS' else '')))
    bef['R7'] = r7 or [('OK', f'kein Groove-Abschnitt ab {fmt(plan.raster_ab)} s')]
    return bef


def urteil(bef, streng=False):
    st = [s for v in bef.values() for s, _ in v]
    if 'FEHLER' in st or (streng and 'BEWUSST' in st):
        return 'ROT'
    if 'BEWUSST' in st or 'FREI' in st or 'HINWEIS' in st:
        return 'GELB'
    return 'GRÜN'


def drucke_pruefung(bef, variante, streng):
    namen = {'R1': 'ganze Takte zwischen Einsätzen', 'R2': 'keine Wiederholung in 30 s', 'R5': 'keine gekachelten Ausklänge',
             'R7': 'Kick-Phase auf dem Film-Raster'}
    print(f"\nPrüfung{' Variante ' + variante if variante else ''}")
    for r, lst in bef.items():
        stati = [s for s, _ in lst]
        kopf = 'FEHLER' if 'FEHLER' in stati else ('BEWUSST' if 'BEWUSST' in stati else ('OK' if all(s in ('OK', 'FREI') for s in stati) else 'HINWEIS'))
        print(f'  {r} {namen[r]}: {kopf}')
        for s, t in lst:
            print(f'     {s:7} {t}')
    u = urteil(bef, streng)
    print(f'Urteil: {u}' + (' (Hinweise oder bewusste Abweichungen: im Hörtest und mit dem Nutzer bestätigen)' if u == 'GELB' else ''))
    return u


# ===================================================================== main
def main():
    a = argparse.ArgumentParser(description='Musik taktgenau auf Filmzeit schneiden und nach R1/R2/R5/R7 prüfen.')
    a.add_argument('--plan', required=True)
    a.add_argument('--variante', default=None)
    a.add_argument('--out', default=None)
    a.add_argument('--takt-karte', action='store_true')
    a.add_argument('--nur-pruefen', action='store_true')
    a.add_argument('--streng', action='store_true')
    o = a.parse_args()
    plan = Plan(o.plan, o.variante)
    sr, x = lies_wav(plan.pfad_von(plan.d['quelle']))
    P, e0, info, huellen = takt_karte(x, sr, plan.bpm, plan.eins, plan.schlag_s, plan.schlaege)
    if o.takt_karte:
        zeige_takt_karte(x, sr, P, e0, info, plan.schlaege)
        return
    print(f"Takt: {info['bpm']} BPM, Schlag {info['schlag_s']} s ({info['schlag']}), Takt 0 = {info['eins_s']} s ({info['eins']}"
          + (f", Konfidenz {info['konfidenz']}" if info.get('konfidenz') is not None else '') + ')')
    if info.get('warnung'):
        print('  Hinweis: Tempo ' + info['warnung'])
    if info.get('konfidenz') is not None and info['konfidenz'] < 0.2:
        print('  Hinweis: Takt-Eins unsicher (Konfidenz < 0,2): mit --takt-karte anhören und takt.eins im Plan setzen.')
    segs = loese_segmente(plan, P, e0, len(x) / sr)
    print(f"Segmentplan{' Variante ' + plan.variante if plan.variante else ''} (Quelle → Film):")
    for g in segs:
        s = g['roh']
        print(f"  {g['nr']:2}. Quelle {g['q_a']:7.3f}–{g['q_b']:7.3f} (Takt {(g['q_a'] - e0) / (plan.schlaege * P):6.2f}"
              f"–{(g['q_b'] - e0) / (plan.schlaege * P):6.2f}) → Film {g['film_a']:7.3f}–{g['film_b']:7.3f}  {s.get('notiz', '')}")
    if o.nur_pruefen:
        u = drucke_pruefung(pruefen(plan, segs, P, e0), plan.variante, o.streng)
        sys.exit(1 if u == 'ROT' else 0)
    y = schneiden(plan, segs, x, sr, P, e0)
    out = plan.ausgabe(o.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(out, sr, (np.clip(y, -1, 1) * 32767).astype(np.int16))
    bef = pruefen(plan, segs, P, e0, y, sr, messdatei=out)
    pk = 20 * np.log10(np.abs(y).max() + 1e-12)
    print(f'-> {out}  Sample-Peak {pk:.2f} dBFS, {len(y) / sr:.3f} s')
    u = drucke_pruefung(bef, plan.variante, o.streng)
    seite = {
        'plan': str(plan.pfad), 'variante': plan.variante, 'quelle': str(plan.pfad_von(plan.d['quelle'])),
        'takt': info, 'raster': {'bpm': plan.raster_bpm, 'versatz': plan.raster_versatz, 'ab': plan.raster_ab},
        'dauer': plan.dauer, 'stille': plan.stille,
        'segmente': [{'nr': g['nr'], 'quelle': [round(g['q_a'], 5), round(g['q_b'], 5)], 'film': [round(g['film_a'], 5), round(g['film_b'], 5)],
                      'anker_film': round(g['anker_f'], 5), 'takt': g['takt'], 'notiz': g['roh'].get('notiz', '')} for g in segs],
        'pruefung': {r: [{'status': s, 'befund': t} for s, t in v] for r, v in bef.items()}, 'urteil': u,
    }
    out.with_suffix('.segmente.json').write_text(json.dumps(seite, ensure_ascii=False, indent=1))
    sys.exit(1 if u == 'ROT' else 0)


if __name__ == '__main__':
    main()
