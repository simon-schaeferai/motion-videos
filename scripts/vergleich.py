#!/usr/bin/env python3
"""Referenz vs. Probe für ein Zeitfenster: indizierte Frames, Schnittlisten, Seite-an-Seite-Video, Kontaktbögen.
Teil des Skills motion-videos (MIT). Braucht ffmpeg/ffprobe und Pillow.

Aufruf:
  python3 vergleich.py --ref referenz.mp4 --prb probe.mp4 --start 0 --ende 9.8 [--prb-start 0] \
                       --out renders/cmp-0-9.8 [--fps 30] [--sperre <laufname>] [--schwelle 12]
  --prb-start  Filmzeit des ersten Probe-Frames (Teil-Render eines Blocks: dessen Start; Gesamtfilm: 0)
Ergebnis in --out: ref/n<Frame>.jpg, prb/n<Frame>.jpg (gleiche Auflösung wie Referenz),
  vergleich.mp4 (+faststart), sheets/sheet-XX.jpg (alle 0,5 s), schnitte.txt
Schnitte: mittlere Graustufen-Differenz (320x180) > --schwelle; erkennt auch hell-auf-hell-Schnitte,
  die ffmpeg scene übersieht. Ausgabe: Schnitte beider Seiten + Mengen-Diff der starken (>= 30).
Medienjobs laufen unter der Sperre /tmp/<laufname>-render.lock, wenn --sperre gesetzt ist.
"""
import argparse, os, subprocess, json, time
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageDraw

a = argparse.ArgumentParser()
a.add_argument('--ref', required=True); a.add_argument('--prb', required=True)
a.add_argument('--start', type=float, required=True); a.add_argument('--ende', type=float, required=True)
a.add_argument('--prb-start', type=float, default=None); a.add_argument('--out', required=True)
a.add_argument('--fps', type=float, default=30); a.add_argument('--sperre', default=None)
a.add_argument('--schwelle', type=float, default=12)
o = a.parse_args()
pst = o.start if o.prb_start is None else o.prb_start
D = Path(o.out); [ (D/x).mkdir(parents=True, exist_ok=True) for x in ('ref', 'prb', 'sheets') ]

def lock():
    if not o.sperre: return None
    L = f'/tmp/{o.sperre}-render.lock'
    for _ in range(120):
        try: os.mkdir(L); return L
        except FileExistsError: time.sleep(5)
    raise SystemExit(f'Sperre belegt: {L}')

def unlock(L):
    if L:
        try: os.rmdir(L)
        except OSError: pass

def run(cmd): subprocess.run(['nice', '-n', '10'] + cmd, check=True)

probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'json', o.ref]))
W, H = probe['streams'][0]['width'], probe['streams'][0]['height']
F0, F1 = round(o.start * o.fps), round(o.ende * o.fps) - 1
P0, P1 = round((o.start - pst) * o.fps), round((o.ende - pst) * o.fps) - 1
L = lock()
try:
    run(['ffmpeg', '-loglevel', 'error', '-y', '-i', o.ref, '-vf', f'select=between(n\\,{F0}\\,{F1})', '-vsync', '0', '-start_number', str(F0), '-q:v', '3', str(D / 'ref/n%04d.jpg')])
    run(['ffmpeg', '-loglevel', 'error', '-y', '-i', o.prb, '-vf', f'select=between(n\\,{P0}\\,{P1}),scale={W}:{H}:flags=lanczos', '-vsync', '0', '-start_number', str(F0), '-q:v', '3', str(D / 'prb/n%04d.jpg')])
    dur = round(o.ende - o.start, 4)
    run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(o.start), '-t', str(dur), '-i', o.ref, '-ss', str(round(o.start - pst, 4)), '-t', str(dur), '-i', o.prb,
         '-filter_complex', f'[0:v]fps={o.fps},scale=960:540,setsar=1[a];[1:v]fps={o.fps},scale=960:540,setsar=1[b];[a][b]hstack=2[v]',
         '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(D / 'vergleich.mp4')])
finally:
    unlock(L)

def cuts(kind):
    out, prev = [], None
    for f in range(F0, F1 + 1):
        p = D / kind / f'n{f:04d}.jpg'
        if not p.exists(): continue
        im = Image.open(p).convert('L').resize((320, 180))
        if prev is not None:
            d = ImageStat.Stat(ImageChops.difference(im, prev)).mean[0]
            if d > o.schwelle: out.append((f, round(f / o.fps, 3), round(d, 1)))
        prev = im
    return out

r, p = cuts('ref'), cuts('prb')
R = {f for f, _, d in r if d >= 30}; P = {f for f, _, d in p if d >= 30}
txt = [f'ref {r}', f'prb {p}', f'starke Schnitte Ref {len(R)} Probe {len(P)}', f'nur Ref {sorted(R - P)}', f'nur Probe {sorted(P - R)}']
(D / 'schnitte.txt').write_text('\n'.join(txt)); print('\n'.join(txt[2:]))

frames = list(range(F0, F1 + 1, max(1, round(o.fps / 2))))
for s in range(0, len(frames), 4):
    chunk = frames[s:s + 4]; w, h = 640, round(640 * H / W)
    sheet = Image.new('RGB', (2 * w + 30, len(chunk) * (h + 34) + 10), (24, 24, 24)); d = ImageDraw.Draw(sheet)
    for i, f in enumerate(chunk):
        y = 10 + i * (h + 34); d.text((10, y), f't = {f / o.fps:.2f} s (Frame {f})  links Referenz | rechts Probe', fill=(235, 235, 235))
        for c, k in enumerate(('ref', 'prb')):
            q = D / k / f'n{f:04d}.jpg'
            if q.exists(): sheet.paste(Image.open(q).convert('RGB').resize((w, h)), (10 + c * (w + 10), y + 18))
    sheet.save(D / 'sheets' / f'sheet-{s // 4 + 1:02d}_{chunk[0] / o.fps:.1f}-{chunk[-1] / o.fps:.1f}s.jpg', quality=88)
print(f'Fertig: {D}')
