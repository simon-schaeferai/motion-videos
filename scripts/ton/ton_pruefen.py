#!/usr/bin/env python3
"""Tonspur prüfen: Cues gegen die Ereignisliste, Sample-Wiederholungen, Löcher, Schleifen, Musik-Einsen.
Teil des Skills motion-videos (MIT). Braucht numpy, scipy; für MP4 ffmpeg.

Aufruf (im Projekt, nach ton_bauen.py):
  python3 ton_pruefen.py --bau ton-bau.json [--mix renders/film.mp4|mix.wav] [--segmente assets/sfx/musik_B.segmente.json]
                         [--toleranz-frames 2] [--stille 29.8-31.6 …] [--bereich 68-86.03] [--loch-db -40]
Ereignisliste: Schema 1 (templates/ereignisse.vorlage.json), Pfad aus ton-bau.json. Liest t, typ, stille (mit bis) als
erlaubte Stille, ausklang als Beginn des Schlusses und bpm aus dem Kopf.
Prüft (Rubrik R8, R9, R11; references/06-ton.md):
  1. Jeder Effekt sitzt ± Frames auf seinem Ereignis (Anker des gerenderten Samples gegen die AKTUELLE ereignisse.json;
     wer Ereignisse verschiebt und nicht neu baut, fällt hier auf). Fehlt ein Ereignis: R8 verletzt.
  2. Nie dasselbe Sample zweimal hintereinander in einer Familie (gleiche Variante mit anderer Tonhöhe = Hinweis).
  3. Mit --mix: Lage jedes Effekts im Mix per Kreuzkorrelation (± 80 ms; nur bei r >= 0,3 aussagekräftig).
  4. Mit --mix: Löcher = 100-ms-Fenster unter --loch-db (Standard -40 dBFS) außerhalb erklärter Stille und Schluss-Blende.
  5. Mit --mix und Takt (aus --segmente oder --bpm): Schleifen = mehr als 2 Takte am Stück mit r > 0,9 zu einer
     Stelle innerhalb von 30 s (wörtliche Wiederholung).
  6. Mit --mix und --segmente: Musik-Einsen an den Segment-Ankern (stärkster Anstieg, Ziel ± 15 ms).
Exit-Code 1 bei FEHLER.
"""
import argparse
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lufs import lese_audio  # noqa: E402

SR = 48000


def fmt(t):
    return f'{t:.2f}'.replace('.', ',')


def spannen(s):
    a, b = s.replace(',', '.').split('-')
    return float(a), float(b)


def main():
    a = argparse.ArgumentParser(description='Tonspur gegen Ereignisliste und Mix prüfen.')
    a.add_argument('--bau', default='ton-bau.json')
    a.add_argument('--mix', default=None)
    a.add_argument('--segmente', default=None)
    a.add_argument('--bpm', type=float, default=None, help='nur nötig ohne --segmente und ohne bpm im Kopf der Ereignisliste (Schleifen-Prüfung)')
    a.add_argument('--toleranz-frames', type=float, default=2.0)
    a.add_argument('--stille', nargs='*', default=[], help='erlaubte Stille, z. B. 29.8-31.6 (zusätzlich zu stille-Ereignissen mit bis)')
    a.add_argument('--bereich', default=None, help='nur dieses Zeitfenster prüfen, z. B. 68-86.03')
    a.add_argument('--loch-db', type=float, default=-40.0)
    a.add_argument('--start-frei', type=float, default=1.0, help='Einblende am Filmanfang in s, dort keine Loch-Prüfung')
    a.add_argument('--schluss-ab', type=float, default=None,
                   help='ab hier Ausklang, keine Loch-Prüfung (Standard: Ereignis ausklang, sonst letztes Ereignis + 1 s)')
    o = a.parse_args()

    bau = json.loads(Path(o.bau).read_text())
    fps = float(bau.get('fps', 30))
    dauer = float(bau['dauer'])
    von, bis = spannen(o.bereich) if o.bereich else (0.0, dauer)
    ev_roh = json.loads(Path(bau['ereignisse']).read_text())   # Schema 1: {schema, fps, bpm, takt0, ereignisse} oder Liste
    kopf = ev_roh if isinstance(ev_roh, dict) else {}
    ev_d = ev_roh.get('ereignisse', []) if isinstance(ev_roh, dict) else ev_roh
    ev = {e['id']: e for e in ev_d}
    if o.bpm is None and kopf.get('bpm'):
        o.bpm = float(kopf['bpm'])
    seg = json.loads(Path(o.segmente).read_text()) if o.segmente else None
    stille_ev = [(float(e['t']), float(e['bis'])) for e in ev_d if e.get('typ') == 'stille' and e.get('bis') is not None]
    stille = [spannen(s) for s in o.stille] + ([tuple(s) for s in seg.get('stille', [])] if seg else []) + stille_ev
    ausklang_ev = [float(e['t']) for e in ev_d if e.get('typ') == 'ausklang']
    if o.schluss_ab is None and ausklang_ev:
        o.schluss_ab = min(ausklang_ev)
    clips = [c for c in bau['clips'] if c.get('fam') != 'bett']
    clips = [c for c in clips if von <= c['event'] <= bis]
    befunde = defaultdict(list)

    # 1. Cue gegen Ereignis
    abw = []
    for c in clips:
        e = ev.get(c['ereignis'])
        if e is None:
            befunde['R8 Cues aus Ereignissen'].append(('FEHLER', f"{c['id']}: Ereignis {c['ereignis']} fehlt in {Path(bau['ereignisse']).name}"))
            continue
        soll = float(e['t']) + float(c.get('versatz') or 0.0)
        anker = c['start'] - (c.get('ms') or 0.0) + c['anchor_s']
        d = (anker - soll) * fps
        abw.append(abs(d))
        if abs(d) > o.toleranz_frames:
            hinweis = ' (Ereignis seit dem Bau verschoben? ton_bauen.py neu laufen lassen)' if abs(float(e['t']) - float(c['t_ereignis'])) > 1e-4 else ''
            befunde['R11 Effekt auf dem Ereignis'].append(('FEHLER', f"{c['id']}: Anker {fmt(anker)} s, Ereignis {c['ereignis']} {fmt(soll)} s, Δ {d:+.1f} Frames{hinweis}"))
    if abw:
        n_v = sum(1 for c in clips if c.get('versatz'))
        befunde['R11 Effekt auf dem Ereignis'].insert(0, ('OK' if max(abw) <= o.toleranz_frames else 'INFO',
                                                    f"{len(abw)} Effekte, max. Δ {max(abw):.2f} Frames (Toleranz ± {o.toleranz_frames:g})"
                                                    + (f", davon {n_v} mit bewusstem Versatz" if n_v else '')))
    ohne = [e for e in ev_d if e.get('typ') not in ('aussage', 'ende', 'stille', 'ausklang') and von <= float(e['t']) <= bis
            and not any(c['ereignis'] == e['id'] for c in clips)]
    if ohne:
        befunde['R11 Effekt auf dem Ereignis'].append(('INFO', f"{len(ohne)} Ereignisse ohne Effekt (bewusst leise?): "
                                                       + ', '.join(f"{e['id']} {fmt(float(e['t']))} s" for e in ohne[:12]) + (' …' if len(ohne) > 12 else '')))

    # 2. gleiche Samples hintereinander
    je_fam = defaultdict(list)
    for c in sorted(clips, key=lambda c: c['event']):
        je_fam[c['fam']].append(c)
    n_rep = 0
    for fam, seq in je_fam.items():
        for p, q in zip(seq, seq[1:]):
            if p['src'] == q['src']:
                n_rep += 1
                befunde['R11 keine gleichen Samples hintereinander'].append(('FEHLER', f"{fam}: {p['id']} → {q['id']} identisches Sample ({Path(p['src']).name})"))
            elif p.get('slice') and p.get('slice') == q.get('slice'):
                befunde['R11 keine gleichen Samples hintereinander'].append(('HINWEIS', f"{fam}: {p['id']} → {q['id']} gleiche Variante {p['slice']}, andere Tonhöhe"))
    if not n_rep:
        befunde['R11 keine gleichen Samples hintereinander'].insert(0, ('OK', f'{len(je_fam)} Familien, kein identisches Sample direkt hintereinander'))

    if o.mix:
        x = lese_audio(o.mix, SR)
        R = x.mean(1)
        root = Path(bau['projekt'])
        # 3. Lage im Mix
        lagen, unsicher = [], 0
        for c in clips:
            s = lese_audio(root / c['src'], SR).mean(1)
            s = s[int((c.get('ms') or 0) * SR): int(((c.get('ms') or 0) + c['dur']) * SR)]
            st = int(round(c['start'] * SR))
            if len(s) < 64 or st + len(s) + int(0.08 * SR) > len(R) or st - int(0.08 * SR) < 0:
                continue
            best = (-1.0, 0)
            ns = np.linalg.norm(s) + 1e-12
            for lag in range(-int(0.08 * SR), int(0.08 * SR) + 1, 12):
                r = R[st + lag: st + lag + len(s)]
                q = float(np.dot(r, s) / (np.linalg.norm(r) * ns + 1e-12))
                if q > best[0]:
                    best = (q, lag)
            q, lag = best
            for l2 in range(lag - 12, lag + 13):
                r = R[st + l2: st + l2 + len(s)]
                q2 = float(np.dot(r, s) / (np.linalg.norm(r) * ns + 1e-12))
                if q2 > q:
                    q, lag = q2, l2
            if q >= 0.3:
                lagen.append((c['id'], q, lag / SR * 1000))
            else:
                unsicher += 1
        med = float(np.median([l for _, _, l in lagen])) if lagen else 0.0
        schlecht = [(i, q, l) for i, q, l in lagen if abs(l) > 2.0 and q >= 0.6]
        befunde['Lage im Mix'].append(('OK' if abs(med) <= 2.0 else 'FEHLER',
                                      f'{len(lagen)} Effekte im Mix gefunden (r >= 0,3), Median-Versatz {med:+.1f} ms, '
                                      f'{unsicher} nicht messbar (unter der Musik)'))
        for i, q, l in schlecht[:10]:
            befunde['Lage im Mix'].append(('HINWEIS', f'{i}: {l:+.1f} ms (r={q:.2f}; bei dichten Folgen evtl. Nachbar-Sample erkannt)'))
        # 4. Löcher
        h = int(0.1 * SR)
        n = len(x) // h
        db = 20 * np.log10(np.sqrt((x[: n * h].reshape(n, h, 2) ** 2).mean((1, 2))) + 1e-12)
        loecher, cur = [], None
        letzt = max([float(e['t']) for e in ev_d if e.get('typ') != 'ende'] or [dauer])
        schluss = o.schluss_ab if o.schluss_ab is not None else min(dauer, letzt + 1.0)
        for i in range(n):
            t0, t1 = i * 0.1, (i + 1) * 0.1
            frei = (t0 < o.start_frei or t1 > schluss or t1 < von or t0 > bis
                    or any(s0 - 0.05 <= t0 and t1 <= s1 + 0.05 for s0, s1 in stille))
            if db[i] < o.loch_db and not frei:
                cur = [t0, t1, db[i]] if cur is None else [cur[0], t1, min(cur[2], db[i])]
            elif cur is not None:
                loecher.append(cur)
                cur = None
        if cur is not None:
            loecher.append(cur)
        if loecher:
            for a_, b_, m_ in loecher:
                befunde['R9 keine Löcher'].append(('FEHLER', f'{fmt(a_)}–{fmt(b_)} s bis {m_:.1f} dBFS (unter {o.loch_db:g})'))
        else:
            befunde['R9 keine Löcher'].append(('OK', f'kein 100-ms-Fenster unter {o.loch_db:g} dBFS zwischen {fmt(o.start_frei)} und {fmt(schluss)} s'
                                              + (f' (erklärte Stille: {", ".join(f"{fmt(a_)}–{fmt(b_)}" for a_, b_ in stille)})' if stille else '')))
        if o.schluss_ab is None:
            befunde['R9 keine Löcher'].append(('INFO', f'Ausklang ab {fmt(schluss)} s nicht geprüft (letztes Ereignis + 1 s); Schluss im Hörtest beurteilen'))
        # 5. Schleifen
        takt = seg['takt']['takt_s'] if seg else (4 * 60 / o.bpm if o.bpm else None)
        if takt:
            rv = seg['raster']['versatz'] if seg else 0.0
            ds = 11025
            m = resample_poly(R, 1, SR // ds) if SR % ds == 0 else resample_poly(R, ds, SR)
            L = int(round(takt * ds))
            starts = np.arange(rv, dauer - takt, takt)
            B = []
            for t in starts:
                w = m[int(t * ds): int(t * ds) + L]
                w = w - w.mean()
                B.append(w / (np.linalg.norm(w) + 1e-12) if np.abs(w).max() > 10 ** (-45 / 20) else None)
            laeufe = []
            for lagb in range(1, int(30 / takt) + 1):
                lauf = []
                for i in range(len(B) - lagb):
                    r = float(np.dot(B[i], B[i + lagb])) if B[i] is not None and B[i + lagb] is not None else 0.0
                    if r > 0.9 and von <= starts[i + lagb] <= bis:
                        lauf.append((i, r))
                    else:
                        if len(lauf) > 2:
                            laeufe.append((lagb, lauf))
                        lauf = []
                if len(lauf) > 2:
                    laeufe.append((lagb, lauf))
            def seg_von(t):
                for g in (seg['segmente'] if seg else []):
                    if g['film'][0] - 1e-3 <= t < g['film'][1]:
                        return g
                return None
            if laeufe:
                for lagb, lauf in laeufe:
                    i0, i1 = lauf[0][0], lauf[-1][0]
                    g1, g2 = seg_von(starts[i0]), seg_von(starts[i1 + lagb] + takt * 0.99)
                    im_take = g1 is not None and g1 is g2
                    txt = (f"{len(lauf)} Takte ab {fmt(starts[i0 + lagb])} s wiederholen {fmt(starts[i0])}–{fmt(starts[i1] + takt)} s "
                           f"(r bis {max(r for _, r in lauf):.2f}, Abstand {fmt(lagb * takt)} s)")
                    if im_take:
                        befunde['R9 keine Schleife'].append(('HINWEIS', txt + f" · liegt im Take selbst (Segment {g1['nr']} läuft durch), kein Schnitt; hörbar? anderen Abschnitt wählen"))
                    else:
                        befunde['R9 keine Schleife'].append(('FEHLER', txt))
            else:
                befunde['R9 keine Schleife'].append(('OK', f'keine Strecke > 2 Takte mit r > 0,9 innerhalb 30 s (Takt {takt:.3f} s)'))
        # 6. Musik-Einsen an den Segment-Ankern
        if seg:
            hh = int(SR * 0.002)
            for g in seg['segmente']:
                t = g['anker_film']
                if not (von <= t <= bis) or t < 0.05:
                    continue
                s = R[int((t - 0.02) * SR): int((t + 0.04) * SR)]
                nn = len(s) // hh
                e = 20 * np.log10(np.sqrt((s[: nn * hh].reshape(nn, hh) ** 2).mean(1)) + 1e-12)
                j = int(np.argmax(np.diff(e)))
                ms = (-0.02 + (j + 1) * 0.002) * 1000
                befunde['Musik-Einsen an den Ankern'].append(('OK' if abs(ms) <= 15 else 'HINWEIS',
                                                             f"Segment {g['nr']} Anker {fmt(t)} s: stärkster Anstieg {ms:+.0f} ms"))
    # Ausgabe
    print(f"Ton-Prüfung {Path(o.bau).name}" + (f" + {Path(o.mix).name}" if o.mix else '') + (f", Bereich {fmt(von)}–{fmt(bis)} s" if o.bereich else ''))
    fehler = False
    for k, lst in befunde.items():
        stati = [s for s, _ in lst]
        kopf = 'FEHLER' if 'FEHLER' in stati else ('HINWEIS' if 'HINWEIS' in stati else 'OK')
        fehler |= kopf == 'FEHLER'
        print(f'  {k}: {kopf}')
        for s, t in lst[:40]:
            print(f'     {s:7} {t}')
        if len(lst) > 40:
            print(f'     … {len(lst) - 40} weitere')
    print('Urteil:', 'ROT' if fehler else 'GRÜN (Hörtest und Abnahme durch den Nutzer bleiben nötig)')
    sys.exit(1 if fehler else 0)


if __name__ == '__main__':
    main()
