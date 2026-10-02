#!/usr/bin/env python3
"""Bewegungs-Check: Kontaktbogen (1 Bild je N Sekunden) + Standbild-Frames je Abschnitt.
Teil des Skills motion-videos (MIT). Braucht ffmpeg und Pillow.

Aufruf:
  python3 bewegung.py <film.mp4> [--alle 2] [--abschnitte 0,10,30,60] [--ref referenz.mp4] [--sperre <lauf>]
Ausgabe: <film>_bewegung.jpg (Kontaktbogen) + Tabelle: Abschnitt | Standbild-Frames | mittlere Bewegung (Ref daneben, falls --ref).
Standbild = mittlere Graustufen-Differenz zum Vorframe < 0.05 (320x180).
--sperre <lauf> nimmt die Render-Sperre /tmp/<lauf>-render.lock (wie scripts/sperre.sh).
"""
import argparse, os, subprocess, tempfile, time, glob
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageDraw

a = argparse.ArgumentParser(); a.add_argument('film'); a.add_argument('--alle', type=float, default=2)
a.add_argument('--abschnitte', default=None); a.add_argument('--ref', default=None); a.add_argument('--sperre', default=None)
o = a.parse_args()

def lock():
    if not o.sperre: return None
    L = f'/tmp/{o.sperre}-render.lock'
    for _ in range(120):
        try: os.mkdir(L); return L
        except FileExistsError: time.sleep(5)
    raise SystemExit(f'Sperre belegt: {L}')

def frames(video, fps, tmp, scale='320:180'):
    subprocess.run(['nice', '-n', '10', 'ffmpeg', '-loglevel', 'error', '-y', '-i', video, '-vf', f'fps={fps},scale={scale}', f'{tmp}/f_%05d.jpg'], check=True)
    return sorted(glob.glob(f'{tmp}/f_*.jpg'))

L = lock()
try:
    with tempfile.TemporaryDirectory() as t1:
        sheet_fs = frames(o.film, 1 / o.alle, t1, '400:225')
        cols = 7; W = 410 * cols; H = 245 * ((len(sheet_fs) + cols - 1) // cols)
        s = Image.new('RGB', (W, H), 'black')
        for i, f in enumerate(sheet_fs):
            x, y = (i % cols) * 410, (i // cols) * 245
            s.paste(Image.open(f), (x, y + 18)); ImageDraw.Draw(s).text((x + 4, y + 2), f'{i * o.alle:g}s', fill='yellow')
        out = Path(o.film).with_name(Path(o.film).stem + '_bewegung.jpg'); s.save(out, quality=82); print('Kontaktbogen:', out)
    res = {}
    for name, vid in [('film', o.film)] + ([('ref', o.ref)] if o.ref else []):
        with tempfile.TemporaryDirectory() as t2:
            fs = frames(vid, 30, t2); prev = None; diffs = []
            for f in fs:
                im = Image.open(f).convert('L')
                if prev is not None: diffs.append(ImageStat.Stat(ImageChops.difference(im, prev)).mean[0])
                prev = im
            res[name] = diffs
finally:
    if L:
        try: os.rmdir(L)
        except OSError: pass

n = len(res['film']) + 1
cuts = [float(x) for x in o.abschnitte.split(',')] if o.abschnitte else [0, n / 30]
print('Abschnitt | Standbild-Frames | Bewegung' + (' | Ref Standbild | Ref Bewegung' if 'ref' in res else ''))
for lo, hi in zip(cuts, cuts[1:]):
    row = [f'{lo:g} bis {hi:g} s']
    for k in res:
        v = res[k][int(lo * 30):int(hi * 30)]
        row += [f'{sum(1 for d in v if d < 0.05)}/{len(v)}', f'{(sum(v) / max(1, len(v))):.2f}']
    print(' | '.join(row))
