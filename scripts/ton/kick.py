#!/usr/bin/env python3
"""Kick-Phase: eine Messmethode für alle Werkzeuge (musik_schnitt.py R7 und qualitaet.py --ton).
Teil des Skills motion-videos (MIT). Braucht nur numpy.

Frage: Liegen die tiefen Schläge (Kick, Bass-Einsätze < 150 Hz) auf der Zählzeit des Film-Rasters?
Methode je Abschnitt (Standard 4 Takte = 16 Schläge):
  1. Mono-Signal auf 22 050 Hz (der Aufrufer liefert es so; musik_schnitt.py rechnet um, qualitaet.py lädt so).
  2. Onset-Hülle im Band < 150 Hz: positive Änderung von log(1 + 100 |STFT|) (Fenster 1024, Sprung 128),
     minus gleitendes Mittel über 0,5 s, geteilt durch die Streuung (Spitzen statt Pegel).
  3. Kreis-Histogramm der Hülle über die Schlag-Phase (24 Fächer, leicht geglättet), Maximum = Kick-Phase
     (gewichtetes Mittel um das stärkste Fach), zweitstärkste Spitze mindestens 1/4 Schlag entfernt.
  4. „klar“ nur, wenn die stärkste Spitze ≥ 1,4 × Gleichverteilung ist UND die zweite höchstens 80 % davon hat.
     Sonst ist die Zahl Zufall (kein durchgehender Kick, Synkopen, Bass auf Off-Beats) und darf keine Korrektur
     auslösen; dann entscheidet der Hörtest an der Naht.
Phase in Schlag: 0 = auf der Zählzeit, ±0,5 = genau dazwischen (Takt-Eins einen halben Schlag daneben).

Aufruf als Werkzeug:
  python3 kick.py <musik.wav> --bpm 145 [--takt0 0.0] [--von 0 --bis 30]

Warum eine Methode: Im Praxistest maß musik_schnitt.py für denselben Musik-Entwurf +0,02, qualitaet.py −0,46.
Ursache: musik_schnitt.py suchte je Schlag nur ± 1/4 Schlag um das Raster (eine halbe Verschiebung ist damit
unmessbar, der Median zufälliger Spitzen in diesem Fenster liegt immer nahe 0), qualitaet.py nahm über die volle
Phase die knapp stärkere von zwei fast gleichen Spitzen. Die Musik hatte keinen durchgehenden Kick; beide Zahlen
waren Zufall. Jetzt messen beide mit dieser Datei und melden „klar“ oder „unklar“.
"""
import argparse
import math
import subprocess
import sys

import numpy as np

SR = 22050          # Pflicht-Abtastrate der Messung
N_FFT = 1024
HOP = 128
FMAX = 150.0        # Hz, tiefes Band
FAECHER = 24
KLAR_FAKTOR = 1.4   # stärkste Spitze gegen Gleichverteilung
ZWEIT_MAX = 0.8     # zweite Spitze höchstens 80 % der ersten


def huelle(x, sr=SR):
    """Onset-Hülle im Band < FMAX. Rückgabe (hülle, zeit_s je Wert)."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim > 1:
        x = x.mean(axis=1)
    if len(x) < N_FFT + HOP:
        return np.zeros(0), np.zeros(0)
    n = 1 + (len(x) - N_FFT) // HOP
    fr = np.lib.stride_tricks.as_strided(x, shape=(n, N_FFT), strides=(x.strides[0] * HOP, x.strides[0]))
    f = np.fft.rfftfreq(N_FFT, 1 / sr)
    S = np.log1p(100 * np.abs(np.fft.rfft(fr * np.hanning(N_FFT), axis=1)[:, f < FMAX]))
    e = np.concatenate([[0.0], np.maximum(0, np.diff(S, axis=0)).sum(1)])
    fps = sr / HOP
    k = max(1, int(fps * 0.5))
    e = np.maximum(0, e - np.convolve(e, np.ones(k) / k, "same"))
    e = e / (e.std() + 1e-9)
    t = (np.arange(len(e)) * HOP + N_FFT / 2) / sr
    return e, t


def _spitzen(h):
    """Stärkste und zweitstärkste Spitze eines Kreis-Histogramms (zweite ≥ 1/4 Umlauf entfernt)."""
    n = len(h)
    i = int(np.argmax(h))
    abstand = lambda j: min(abs(j - i), n - abs(j - i))
    rest = [j for j in range(n) if abstand(j) >= n / 4]
    j = max(rest, key=lambda q: h[q]) if rest else i
    return i, j


def _phase(h, i):
    n = len(h)
    js = [(i - 1) % n, i, (i + 1) % n]
    z = sum(h[q] * np.exp(2j * np.pi * (q + 0.5) / n) for q in js)
    p = float(np.angle(z) / (2 * np.pi))
    return p - 1.0 if p >= 0.5 else (p + 1.0 if p < -0.5 else p)


def kick_phase(x, sr, bpm, takt0=0.0, von=0.0, bis=None, abschnitt_schlaege=16):
    """Je Abschnitt (Standard 4 Takte): dict(von, bis, phase, staerke, zweit_phase, zweit_anteil, klar).
    x: Mono-Signal mit Rate sr (22 050 Hz empfohlen, andere Raten gehen, Werte weichen dann leicht ab).
    takt0: Filmzeit (s) einer Takt-Eins des Rasters. Abschnitte beginnen auf Takt-Einsen ab takt0."""
    e, t = huelle(x, sr)
    if not len(e):
        return []
    beat = 60.0 / float(bpm)
    ende = t[-1] if bis is None else min(float(bis), t[-1])
    seg = abschnitt_schlaege * beat
    s = float(takt0) + math.floor((float(von) - float(takt0)) / seg + 1e-9) * seg   # Abschnitte auf Takt-Einsen
    out = []
    while s < ende:
        a, b = max(s, float(von)), min(s + seg, ende)
        m = (t >= a) & (t < b)
        w = e[m]
        if b - a >= seg / 2 and w.sum() > 0:
            ph = ((t[m] - takt0) / beat) % 1.0
            h, _ = np.histogram(ph, bins=FAECHER, range=(0, 1), weights=w)
            h = h / h.sum()
            h = (np.roll(h, 1) + 2 * h + np.roll(h, -1)) / 4     # leicht glätten (kreisförmig)
            i, j = _spitzen(h)
            staerke = float(h[i] * FAECHER)                      # 1,0 = gleichverteilt
            zweit = float(h[j] / h[i]) if h[i] > 0 else 1.0
            out.append(dict(von=round(a, 3), bis=round(b, 3), phase=round(_phase(h, i), 3),
                            staerke=round(staerke, 2), zweit_phase=round(_phase(h, j), 3), zweit_anteil=round(zweit, 2),
                            klar=bool(staerke >= KLAR_FAKTOR and zweit <= ZWEIT_MAX)))
        s += seg
    return out


def zusammenfassung(abschnitte, toleranz=0.05):
    """Urteil über alle Abschnitte. Rückgabe dict(urteil, text, phase, n_klar, n_null, n_halb):
    urteil = "auf dem Raster" | "halber Schlag daneben" | "zweideutig" | "unklar" | "daneben".
    Nur "halber Schlag daneben" (mindestens zwei klare Abschnitte, alle bei ± 0,5) rechtfertigt eine Korrektur
    von takt0 bzw. takt.eins um einen halben Schlag."""
    if not abschnitte:
        return dict(urteil="unklar", text="kein Abschnitt messbar", phase=None, n_klar=0, n_null=0, n_halb=0)
    klar = [a for a in abschnitte if a["klar"]]
    werte = " · ".join(f"{a['phase']:+.2f}{'' if a['klar'] else '?'}" for a in abschnitte[:14])
    werte += " …" if len(abschnitte) > 14 else ""
    null = [a for a in klar if abs(a["phase"]) <= 0.1]
    halb = [a for a in klar if abs(a["phase"]) >= 0.4]
    rest = [a for a in klar if 0.1 < abs(a["phase"]) < 0.4]
    phase = None
    if klar:
        z = np.mean([np.exp(2j * np.pi * a["phase"]) for a in klar])
        phase = float(np.angle(z) / (2 * np.pi))
    if not klar:
        urteil, satz = "unklar", "kein klarer Kick (Puls zu schwach oder zwei fast gleiche Spitzen)"
    elif null and halb:
        urteil, satz = "zweideutig", (f"zweideutig: {len(null)} klare Abschnitte auf der Zählzeit, {len(halb)} genau "
                                      "dazwischen (Bass auch auf den Off-Beats); keine Korrektur aus der Zahl")
    elif len(halb) >= 2 and not rest:
        urteil, satz = "halber Schlag daneben", (f"{len(halb)} klare Abschnitte bei {phase:+.2f}: Takt-Eins liegt einen halben "
                                                 "Schlag daneben (takt0 bzw. takt.eins um ½ Schlag verschieben)")
    elif not rest and not halb and all(abs(a["phase"]) <= toleranz for a in null):
        urteil, satz = "auf dem Raster", f"{len(null)} klare Abschnitte auf der Zählzeit ({phase:+.2f})"
    else:
        urteil, satz = "daneben", f"{len(klar)} klare Abschnitte, Kick-Phase {phase:+.2f} (Ziel 0 ± {toleranz:.2f})"
    text = f"{satz}; {len(klar)} von {len(abschnitte)} Abschnitten klar, Phasen {werte} (? = unklar)"
    if urteil in ("unklar", "zweideutig"):
        text += "; Raster per Hörtest an jeder Musik-Naht prüfen"
    return dict(urteil=urteil, text=text, phase=phase, n_klar=len(klar), n_null=len(null), n_halb=len(halb))


def lade_mono(pfad, sr=SR):
    raw = subprocess.run(["nice", "-n", "10", "ffmpeg", "-v", "error", "-i", pfad, "-vn", "-ac", "1", "-ar", str(sr),
                          "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def main():
    ap = argparse.ArgumentParser(description="Kick-Phase einer Tondatei zum Film-Raster (eine Methode für alle Werkzeuge).")
    ap.add_argument("datei")
    ap.add_argument("--bpm", type=float, required=True)
    ap.add_argument("--takt0", type=float, default=0.0)
    ap.add_argument("--von", type=float, default=0.0)
    ap.add_argument("--bis", type=float)
    o = ap.parse_args()
    ab = kick_phase(lade_mono(o.datei), SR, o.bpm, o.takt0, o.von, o.bis)
    for a in ab:
        print(f"{a['von']:7.2f}–{a['bis']:7.2f} s  Phase {a['phase']:+.2f}  Stärke {a['staerke']:.2f}  "
              f"zweite {a['zweit_phase']:+.2f} ({a['zweit_anteil']:.0%})  {'klar' if a['klar'] else 'unklar'}")
    print(zusammenfassung(ab)["text"])


if __name__ == "__main__":
    sys.exit(main())
