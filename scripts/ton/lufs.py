#!/usr/bin/env python3
"""Lautheit nach ITU-R BS.1770 (K-Gewichtung, absolutes und relatives Gating), True Peak (4x Oversampling),
Sample-Peak und die lautesten 100-ms-Fenster. Liest WAV direkt und jede Video-/Audiodatei (MP4, MOV, M4A …)
über ffmpeg. Teil des Skills motion-videos (MIT). Braucht numpy, scipy und für Nicht-WAV ffmpeg.

Aufruf:
  python3 lufs.py <datei.wav|film.mp4> [--ziel -14] [--toleranz 1] [--tp-max -1] [--handy] [--json]
  --handy   zusätzlich Lautheit mit Hochpass 300 Hz (Handy-Lautsprecher)
  --json    Ergebnis als JSON (für Skripte)
Wichtig: Für die Abnahme die AUSGELIEFERTE Datei messen (nach AAC, z. B. renders/<film>_web.mp4).
AAC hebt die Spitzen gegenüber dem WAV-Mix an; erst dort zählt True Peak <= -1 dBTP.
Exit-Code 1, wenn ein Zielwert (--ziel/--tp-max) verfehlt ist.

Als Modul: from lufs import lese_audio, messen
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, resample_poly, sosfilt

SR = 48000


def lese_audio(pfad, sr=SR):
    """Stereo-Float-Array (N, 2) mit Abtastrate sr. Nicht-WAV wird über ffmpeg als 32-Bit-Float extrahiert
    (keine Übersteuerung beim Extrahieren, True Peak bleibt messbar)."""
    if str(pfad).lower().endswith('.wav'):
        r, x = wavfile.read(pfad)
    else:
        with tempfile.TemporaryDirectory() as tmp:
            w = os.path.join(tmp, 'ton.wav')
            subprocess.run(['nice', '-n', '10', 'ffmpeg', '-loglevel', 'error', '-y', '-i', str(pfad), '-vn',
                            '-ac', '2', '-ar', str(sr), '-c:a', 'pcm_f32le', w], check=True)
            r, x = wavfile.read(w)
    if x.dtype == np.int16:
        x = x.astype(np.float64) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float64) / 2147483648.0
    else:
        x = x.astype(np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    x = x[:, :2]
    if r != sr:
        g = np.gcd(int(r), int(sr))
        x = resample_poly(x, sr // g, int(r) // g, axis=0)
    return x


def _k_gewichtung(x, sr):
    """Zwei Biquads nach BS.1770 (Koeffizienten für 48 kHz)."""
    assert sr == 48000, 'K-Gewichtung erwartet 48 kHz'
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1, -1.69065929318241, 0.73248077421585]
    b2 = [1, -2, 1]
    a2 = [1, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)


def integrierte_lautheit(x, sr=SR):
    y = _k_gewichtung(x, sr)
    n, h = int(0.4 * sr), int(0.1 * sr)
    if len(y) < n:
        return float('-inf')
    z = np.array([(y[s:s + n] ** 2).mean(0).sum() for s in range(0, len(y) - n + 1, h)])
    L = -0.691 + 10 * np.log10(z + 1e-12)
    z1 = z[L > -70]
    if not len(z1):
        return float('-inf')
    rel = -0.691 + 10 * np.log10(z1.mean()) - 10
    z2 = z1[(-0.691 + 10 * np.log10(z1 + 1e-12)) > rel]
    return float(-0.691 + 10 * np.log10(z2.mean()))


def true_peak(x):
    return float(20 * np.log10(np.abs(resample_poly(x, 4, 1, axis=0)).max() + 1e-12))


def messen(x, sr=SR, handy=False):
    """x: (N, 2) Float, sr 48 kHz. Ergebnis-Dict mit LUFS, True Peak, Sample-Peak, lauteste Fenster."""
    erg = {
        'lufs': round(integrierte_lautheit(x, sr), 2),
        'true_peak_dbtp': round(true_peak(x), 2),
        'sample_peak_dbfs': round(float(20 * np.log10(np.abs(x).max() + 1e-12)), 2),
        'dauer_s': round(len(x) / sr, 3),
    }
    a = np.abs(x).max(1)
    h = int(sr * 0.1)
    m = len(a) // h
    if m:
        pk = 20 * np.log10(a[: m * h].reshape(m, h).max(1) + 1e-9)
        erg['lauteste_fenster'] = [[round(i * 0.1, 1), round(float(pk[i]), 1)] for i in np.argsort(pk)[-8:][::-1]]
    if handy:
        hp = sosfilt(butter(2, 300, 'hp', fs=sr, output='sos'), x, axis=0)
        erg['lufs_handy_hp300'] = round(integrierte_lautheit(hp, sr), 2)
    return erg


def main():
    a = argparse.ArgumentParser(description='Lautheit (BS.1770) und True Peak messen, auch für MP4.')
    a.add_argument('datei')
    a.add_argument('--ziel', type=float, default=None, help='Ziel-LUFS, z. B. -14')
    a.add_argument('--toleranz', type=float, default=1.0)
    a.add_argument('--tp-max', type=float, default=None, help='höchster True Peak in dBTP, z. B. -1')
    a.add_argument('--handy', action='store_true')
    a.add_argument('--json', action='store_true')
    o = a.parse_args()
    erg = messen(lese_audio(o.datei), SR, o.handy)
    fehler = []
    if o.ziel is not None and abs(erg['lufs'] - o.ziel) > o.toleranz:
        fehler.append(f"Lautheit {erg['lufs']:.2f} LUFS außerhalb {o.ziel} ± {o.toleranz}")
    if o.tp_max is not None and erg['true_peak_dbtp'] > o.tp_max:
        fehler.append(f"True Peak {erg['true_peak_dbtp']:.2f} dBTP über {o.tp_max}")
    erg['befunde'] = fehler
    if o.json:
        print(json.dumps(erg, ensure_ascii=False, indent=1))
    else:
        print(f"{os.path.basename(o.datei)}: Integrated {erg['lufs']:.2f} LUFS · True Peak {erg['true_peak_dbtp']:.2f} dBTP"
              f" · Sample-Peak {erg['sample_peak_dbfs']:.2f} dBFS · {erg['dauer_s']:.2f} s")
        if 'lufs_handy_hp300' in erg:
            print(f"Handy (Hochpass 300 Hz): {erg['lufs_handy_hp300']:.2f} LUFS")
        if erg.get('lauteste_fenster'):
            print('lauteste 100-ms-Fenster (s: dBFS):', '  '.join(f'{t:.1f}: {d:.1f}' for t, d in erg['lauteste_fenster']))
        if o.ziel is not None or o.tp_max is not None:
            print('Urteil:', 'OK' if not fehler else 'NICHT OK · ' + ' · '.join(fehler))
    sys.exit(1 if fehler else 0)


if __name__ == '__main__':
    main()
