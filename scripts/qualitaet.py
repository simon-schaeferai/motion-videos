#!/usr/bin/env python3
"""Qualitätsmessung am fertigen Render: Tabelle Kriterium | Ist | Soll | ✓/✗ gegen die Rubrik R1 bis R12.
Teil des Skills motion-videos (MIT). Nur lesend: ändert keine Projektdatei, rendert nichts neu.
Braucht ffmpeg/ffprobe und numpy. Für --bewegung zusätzlich OpenCV (opencv-python-headless), für --text scipy,
für die Bögen Pillow. Fehlt OpenCV, laufen alle anderen Prüfungen trotzdem (R5 ★ zählt dann wie rot).

Aufruf:
  python3 qualitaet.py <film.mp4> [--bewegung] [--frames] [--fuellung] [--text] [--ton] [--beats] [--auslieferung]
                       [--ref referenz.mp4] [--ereignisse ereignisse.json | --ohne-ereignisse] [--musik musik.wav]
                       [--bpm 120] [--takt0 0.0] [--szenen 0,8.03,15.3] [--start-frei 1.0] [--brief 25 | --brief 15-20]
                       [--out <ordner>] [--sperre <lauf>]
  Ohne Prüf-Schalter laufen alle Prüfungen. Prüfe die Web-Kopie (_web.mp4), die auch ausgeliefert wird.
  Referenz und Teil-Renders eines Blocks mit --ohne-ereignisse messen (sonst findet das Skript die Ereignisliste des
  Films, deren Zeiten dort nicht gelten).

Prüfungen (Schwellen kalibriert, siehe Konstanten und references/07-qa.md „Kalibrierung“):
  --bewegung     Farneback-Fluss je Frame (320 px breit, Graustufen): längster Stand und Stand-Anteil im Film
                 (p99 < 0,1 px/Frame, ohne Endkarte und erklärte stille), Stand je Szene (Hinweis), Kamera-Drift je
                 Einstellung (Affin-Fit: Zoom + Schwenk, %/s), Anfahren aus dem Stand und Energie über jeden Schnitt
                 (Fluss 3 Frames danach / davor) als Hinweis.                                       → R5, R6, R7
  --frames       Duplikat-Frames (Frame gleich Vorgänger, davor und danach Bewegung) und Blitzframes
                 (ein Frame passt zu keinem Nachbarn, aber zu einem älteren oder dem übernächsten Frame). → R7
  --fuellung     Bildfüllung nach references/09-qualitaets-dna.md §5: je Frame Zeilen mit Inhalt (Kanten, 320 px
                 breit) und längstes leeres Band. Leer = stehendes Bild (Frame-Differenz < 0,3) mit einem Band ohne
                 Inhalt > 45 % der Bildhöhe, länger als 0,5 s. Ausgenommen: Endkarte, erklärte stille und Aussagen
                 (aussage/hit mit text, von t bis ausstiegAb: Stufe H auf leerem Grund ist erlaubt, Typo prüfen R1 bis R4).
                 Median „Zeilen mit Inhalt“ ≥ 35 % (09 §5) auch ohne Referenz, sonst ✗; ist die Referenz (--ref)
                 bewusst leerer, gilt ihr Median. Über 65 % Hinweis, dünne Strecken < 35 % als Hinweis.
                 Dazu Endkarte ≤ 2 Takte (länger nur mit Feld "begruendung" am Ereignis endkarte) und Bildwelten:
                 Anteil der Szenen „Kachel auf leerem Grund“ (Ereignis bildwelt, art kachel) ≤ 1/3, dazu als
                 Hinweis die Sekunden mit reicher Bildwelt (Foto, Gerät: ≥ 15 Farbstufen) gegen das Vorbild.   → R8
  --text         Lesetext ≥ 32 px bei 1080 p (09 §2): Textzeilen ohne OCR (Top-/Black-Hat, Zeilen aus gleich hohen
                 Nachbarn, Höhe Grundlinie bis Oberkante Versal/Oberlänge = 0,76 × Schriftgröße) im Moment lesbarAb
                 und in der Mitte jedes Lesefensters, auf der Endkarte und alle 2 s (ohne Übergänge). Zeilen in
                 einem deko-Bereich (Ereignis deko mit bereich [x0, y0, x1, y1] in Film-px, bis, grund) zählen nicht,
                 ebenso Bruchstücke großer Schrift (Aussagen, Hits: auf dem verkleinerten Bild als ≥ 60 px erkannt).
                 Bogen lesetext-bogen.jpg in 1/3 Größe (= 16:9 im Handy-Feed): rot zu klein, grau Deko.     → R4
  --ton          100-ms-RMS-Löcher (< −40 dBFS ab --start-frei bis zum Ausklang, < −35 dBFS in den letzten 18 s
                 davor), digitale Stille, Mix-Wiederkehr (2-s-Fenster, Abstand in dB zum ähnlichsten früheren Fenster
                 der letzten 30 s, ≥ 2,5 dB), wörtliche Schleife (2-Takt-Fenster gegen die letzten 30 s, r > 0,97 über
                 mehr als 2,5 Takte), Kick-Phase im Band < 150 Hz je 4 Takte (Hinweis, Methode scripts/ton/kick.py,
                 dieselbe wie musik_schnitt.py R7; mit --musik auf der Musik-Spur, sonst auf dem Mix).   → R9, R10
                 Geht auch auf einer reinen Tondatei: Musik-Entwurf vor dem Bau mit --ton --bpm <BPM der Musik>
                 --takt0 <Filmzeit der ersten Takt-Eins> prüfen (Urteil „auf dem Raster“; nur „halber Schlag
                 daneben“ rechtfertigt eine Korrektur, „unklar“/„zweideutig“ entscheidet der Hörtest).
  --beats        Ein-Blick-Bogen: je Aussage (Ereignis mit lesbarAb) ein Frame im Moment „voll lesbar“.  → R1
                 Dazu Lesezeit aus der Ereignisliste und Klick/Punch im Lesefenster.                   → R2, R3
  --auslieferung Lautheit und True Peak (ebur128) auf genau dieser Datei, Größe, faststart, Filmlänge gegen
                 den Brief (G1): Zahl ± 10 % (--brief 25) oder Spanne wörtlich (--brief 15-20; "briefLaenge" im
                 Kopf der Ereignisliste als Zahl, "15-20" oder [15, 20]).                              → R12
  --ref          misst die Referenz mit (Bewegung und Mix-Wiederkehr) und schreibt sie in die Ist-Spalte.

Ereignisliste (ereignisse.json im Lauf-Ordner, sonst neben dem Film oder zwei Ebenen darüber gesucht), Schema 1
(templates/ereignisse.vorlage.json, references/05-bau-probe-parallel.md „Ereignisliste“):
  {"schema": 1, "fps": 30, "bpm": 120, "takt0": 0.0, "ereignisse": [
    {"id": "b1-say", "t": 2.867, "typ": "aussage", "beat": "B1 Einstieg", "text": "Alles an einem Ort.",
     "lesbarAb": 3.423, "ausstiegAb": 4.867},
    {"id": "b1-klick", "t": 5.2, "typ": "klick"},
    {"id": "schnitt-b2", "t": 5.5, "typ": "schnitt", "art": "match"}, ... ]}
  Eine nackte Liste [...] geht auch (dann --bpm/--takt0 angeben). Zeiten in Sekunden Filmzeit. Ausgewertet:
    aussage, hit (mit text, lesbarAb, ausstiegAb)   Lesezeit R2, Ein-Blick-Bogen R1, ≤ 6 Wörter
    klick, punch                                     stören im Lesefenster (R3)
    schnitt                                          Szenengrenzen (ohne schnitt: automatisch erkannt)
    endkarte                                         ab hier keine Bewegungsprüfung
    ausklang                                         ab hier darf der Ton leiser werden (R10)
    stille (mit "bis")                               gewollte Ruhe in Bild und Ton, von Stand- und Loch-Prüfungen ausgenommen
    deko (mit "bis", "bereich", "grund")             kleine Schrift, die nicht gelesen werden soll (R4 Lesetext)
    bildwelt (mit "art")                             Bildwelt ab hier: fenster, handy, geraet, produktfoto, foto, website,
                                                     daten, aussage, logo, kachel (R8 Bildwelten, mit --fuellung)
    beat (Feld)                                      Bildtitel im Ein-Blick-Bogen
  Wörter = Teile mit Buchstabe oder Ziffer („&“ zählt nicht), wie MV.wordCount in templates/lib.

Ausgabe: Tabelle auf stdout und in <out>/qualitaet.md, Rohwerte in qualitaet.json und frames.csv,
Ein-Blick-Bogen als ein-blick-bogen.jpg. Standard-<out>: <film-ordner>/<film-name>_qualitaet/.
Zeilen mit „→ prüfen“ gehen nur per Auge oder Gemini (references/07-qa.md). „Hinweis“ = gemessen, aber kein
Abnahmekriterium (am abgenommenen Referenzfilm nicht trennscharf, Kalibrierung in references/07-qa.md).
Ein ★-Kriterium, das nicht gemessen werden konnte (z. B. R5 ohne OpenCV), steht als ✗: nicht gemessen zählt wie rot.
--sperre <lauf> nimmt die Render-Sperre /tmp/<lauf>-render.lock (wie scripts/sperre.sh). Läuft der Aufruf
schon unter sperre.sh, --sperre weglassen.
"""
import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

try:
    import numpy as np
except ImportError:
    sys.exit("numpy fehlt. Installieren: python3 -m pip install -r requirements.txt")

sys.path.insert(0, str(Path(__file__).resolve().parent / "ton"))
import kick  # noqa: E402  eine Kick-Phasen-Methode für qualitaet.py und ton/musik_schnitt.py

NICE = ["nice", "-n", "10"] if shutil.which("nice") else []
TYPEN = {"aussage", "hit", "schnitt", "punch", "klick", "tippen", "pop", "linie", "knoten", "puls", "morph", "ki",
         "endkarte", "ausklang", "stille", "ende", "deko", "bildwelt"}    # Schema 1, wie MV.EVENT_TYPES
ALT_TYPEN = {"cut": "schnitt", "szene": "schnitt", "match-cut": "schnitt", "matchcut": "schnitt", "whip": "schnitt",
             "übergang": "schnitt", "uebergang": "schnitt", "click": "klick", "punch-in": "punch", "punchin": "punch"}
SCHNITT_TYPEN = {"schnitt"}
STOER_TYPEN = {"klick", "punch"}
STAND_P99 = 0.1          # px/Frame bei 320 px Breite (≈ 18 px/s im 1920er-Bild)
DUP_GLEICH = 0.03        # mittlere Graustufen-Differenz, darunter gilt ein Frame als gleich
SR_TON = 22050
# Schwellen, kalibriert am abgenommenen Referenzfilm gegen zwei abgelehnte Fassungen (references/07-qa.md, Kalibrierung)
STAND_MAX_S = 0.4        # längster Stand (außer Endkarte, erklärte stille)
STAND_FILM_PCT = 12.0    # Stand-Anteil im ganzen Film (außer Endkarte, stille)
DRIFT_MIN = 2.0          # %/s je Einstellung ≥ 1 s
DRIFT_QUOTE = 90.0       # Anteil der Einstellungen mit Drift ≥ DRIFT_MIN
WIEDERKEHR_MIN_DB = 2.5  # wörtliche Kopie im Mix ≈ 1,5 bis 2,5 dB
SCHLEIFE_R = 0.97        # Korrelation einer wörtlichen Wiederholung (Groove-Ähnlichkeit im Take ≤ 0,96)
SCHLEIFE_TAKTE = 2.5     # länger als 2 Takte (+ halber Takt Fenster-Toleranz)
START_FREI_S = 1.0       # Einblende am Filmanfang, dort keine Loch-Prüfung
ENDE_FENSTER_S = 18.0    # R10: letzte 18 s vor dem Ausklang
# Bildfüllung (09-qualitaets-dna.md §5), kalibriert in references/07-qa.md
KANTE = 8                # Graustufen-Sprung zum Nachbarpixel (320 px breit), ab dem ein Pixel Inhalt ist
ZEILE_MIN_PX = 3         # Pixel mit Inhalt, ab denen eine Zeile Inhalt hat (3: die zwei Seitenkanten einer leeren Karte zählen nicht)
LEER_BAND = 45.0         # % Bildhöhe ohne Inhalt am Stück
LEER_DAUER_S = 0.5       # so lange darf ein leeres Band höchstens stehen
STEHT_MAD = 0.3          # mittlere Frame-Differenz (0 bis 255, 320 px), darunter steht das Bild (09 §5: „stehende UI-Einstellung“)
ZEILEN_MIN = 35.0        # % Zeilen mit Inhalt (Median, stehende Einstellungen): darunter ✗, auch ohne Referenz (09 §5)
ZEILEN_MAX = 65.0        # darüber Hinweis (Überladung prüft R1 am Ein-Blick-Bogen)
ENDKARTE_TAKTE = 2       # Endkarte höchstens 2 Takte
LAENGE_TOL = 10.0        # % Abweichung der Filmlänge vom Brief (G1), nur bei einer Zahl; eine Spanne gilt wörtlich
# Lesetext (09 §2 „Lesetext“), kalibriert in references/07-qa.md
LESE_MIN_PX = 32.0       # kleinste Schrift, die gelesen werden soll: px bei 1080 p (kurze Bildseite = 1080)
ZEILE_JE_PX = 0.76       # gemessene Zeilenhöhe (Grundlinie bis Oberkante Versal/Oberlänge) je px Schriftgröße
TEXT_K = 15              # Fenster für Top-/Black-Hat in px: Striche bis ca. 15 px, also Schrift bis ca. 60 px
TEXT_KONTRAST = 30       # Graustufen-Abstand eines Strichs zum lokalen Grund
TEXT_MAX_PX = 60.0       # größere Schrift wird nicht ausgewertet (sicher lesbar)
TEXT_TOL_PX = 0.5        # Messgenauigkeit: ✗ erst unter LESE_MIN_PX − 0,5 (30 px misst ≤ 30,8, 32 px ≥ 32,2)
TEXT_STICHPROBE_S = 2.0  # Stichprobe alle 2 s zusätzlich zu den Aussagen und der Endkarte
TEXT_BEWEGT = 3.0        # mittlere Differenz zum Vorframe (0 bis 255, volle Größe): darüber Übergang, keine Stichprobe

MAD, MAD2, MEAN, P99, ZOOM, PAN, RESR, MOVF = range(8)


# ---------------------------------------------------------------- Hilfen
def zahl(x, n=1):
    if x is None:
        return "–"
    try:
        if math.isnan(x) or math.isinf(x):
            return "–" if math.isnan(x) else ("∞" if x > 0 else "−∞")
    except TypeError:
        return str(x)
    s = f"{x:.{n}f}".replace(".", ",")
    return s.replace("-", "−")


def zeit(t):
    return zahl(t, 2) + " s"


def woerter(text):
    """Wörter wie MV.wordCount: nur Teile mit Buchstabe oder Ziffer („&“, „+“, „·“ zählen nicht)."""
    return sum(1 for w in str(text).split() if any(c.isalnum() for c in w))


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "stream=codec_type,width,height,r_frame_rate:format=duration,size", "-of", "json", path],
                       capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"ffprobe kann {path} nicht lesen: {r.stderr.strip()}")
    j = json.loads(r.stdout)
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), None)
    ton = any(s.get("codec_type") == "audio" for s in j["streams"])
    if v is None:   # reine Tondatei (z. B. Musik-Entwurf): nur --ton ist möglich
        if not ton:
            sys.exit(f"Weder Bild- noch Tonspur in {path}")
        return dict(w=0, h=0, fps=30.0, dauer=float(j["format"].get("duration", 0)),
                    groesse=int(j["format"].get("size", 0)), ton=True, bild=False)
    num, den = v["r_frame_rate"].split("/")
    return dict(w=int(v["width"]), h=int(v["height"]), fps=float(num) / float(den or 1),
                dauer=float(j["format"].get("duration", 0)), groesse=int(j["format"].get("size", 0)),
                ton=ton, bild=True)


def sperre_nehmen(name):
    if not name:
        return None
    pfad = f"/tmp/{name}-render.lock"
    for i in range(120):
        try:
            os.mkdir(pfad)
            return pfad
        except FileExistsError:
            if i == 0:
                print(f"Sperre belegt ({pfad}), warte …", file=sys.stderr)
            time.sleep(5)
    sys.exit(f"Sperre nach 10 min noch belegt: {pfad}")


def lade_ereignisse(pfad, film):
    if pfad:
        kandidaten = [Path(pfad)]
    else:
        d = Path(film).resolve().parent
        kandidaten = [d / "ereignisse.json", d.parent / "ereignisse.json", d.parent.parent / "ereignisse.json"]
    for k in kandidaten:
        if k.is_file():
            daten = json.loads(k.read_text(encoding="utf-8"))
            meta = {}
            if isinstance(daten, dict):
                meta = {x: daten[x] for x in ("bpm", "takt0", "fps", "briefLaenge") if x in daten}
                daten = daten.get("ereignisse", [])
            ev, fremd, alt = [], set(), set()
            for e in daten:
                if isinstance(e, dict) and "t" in e:
                    e = dict(e)
                    typ = str(e.get("typ", "")).strip().lower()
                    if typ in ALT_TYPEN:
                        alt.add(typ)
                        typ = ALT_TYPEN[typ]
                    elif typ not in TYPEN:
                        fremd.add(typ)
                    e["typ"] = typ
                    ev.append(e)
            if alt:
                print(f"Hinweis: veraltete Typen {sorted(alt)} gelesen wie Schema 1 (schnitt/klick/punch).", file=sys.stderr)
            if fremd:
                print(f"Hinweis: Typen außerhalb des Schemas werden ignoriert: {sorted(fremd)}", file=sys.stderr)
            ev.sort(key=lambda e: float(e["t"]))
            return ev, str(k), meta
    if pfad:
        sys.exit(f"Ereignisliste nicht gefunden: {pfad}")
    return [], None, {}


def runs(maske):
    """Liste (start, ende_exkl) zusammenhängender True-Strecken."""
    out, s = [], None
    for i, v in enumerate(maske):
        if v and s is None:
            s = i
        elif not v and s is not None:
            out.append((s, i))
            s = None
    if s is not None:
        out.append((s, len(maske)))
    return out


def lade_cv2():
    try:
        import cv2  # noqa: F401
        return cv2
    except ImportError:
        return None


# ---------------------------------------------------------------- Bild
def fuellung_frame(f):
    """Bildfüllung eines Graustufen-Frames (320 px breit): (Zeilen mit Inhalt %, längstes leeres Band % Höhe,
    Breite des Inhalts % von erster bis letzter Spalte mit Inhalt). Inhalt = Kante ≥ KANTE zum Nachbarpixel, damit
    Verläufe und Vignetten nicht zählen, Schrift, Karten-Kanten, Icons und Footage schon."""
    g = f.astype(np.int16)
    k = np.zeros(g.shape, bool)
    k[:, 1:] |= np.abs(g[:, 1:] - g[:, :-1]) >= KANTE
    k[1:, :] |= np.abs(g[1:, :] - g[:-1, :]) >= KANTE
    zeilen = k.sum(axis=1) >= ZEILE_MIN_PX
    spalten = np.where(k.sum(axis=0) >= ZEILE_MIN_PX)[0]
    leer = max([e - s for s, e in runs(~zeilen)] or [0])
    breite = (spalten[-1] - spalten[0] + 1) / f.shape[1] * 100 if len(spalten) else 0.0
    return float(zeilen.mean() * 100), float(leer / f.shape[0] * 100), float(breite)


def frame_merkmale(path, info, mit_fluss, cv2, mit_fuellung=False):
    """Eine Zeile je Frame k (Übergang k-1 → k). Spalten: mad, mad2 (k gegen k-2), Fluss mean, p99,
    zoom %/s, Schwenk %/s (Bildbreite), Eigenbewegungs-Anteil, bewegte Fläche. Dazu 80er-Daumen je Frame und,
    mit mit_fuellung, die Bildfüllung je Frame (fuellung_frame)."""
    W = 320
    H = max(2, int(round(W * info["h"] / info["w"] / 2)) * 2)
    fps = info["fps"]
    cmd = NICE + ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}:flags=area,format=gray",
                  "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = W * H
    prev = prev2 = None
    rows, daumen, fuell = [], [], []
    gx, gy = np.meshgrid(np.arange(W, dtype=np.float64) - W / 2, np.arange(H, dtype=np.float64) - H / 2)
    nan = float("nan")
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        f = np.frombuffer(b, np.uint8).reshape(H, W)
        daumen.append(_daumen(f))
        if mit_fuellung:
            fuell.append(fuellung_frame(f))
        if prev is None:
            rows.append([0.0, nan, 0.0, 0.0, 0.0, 0.0, nan, 0.0])
            prev = f
            continue
        fi = f.astype(np.int16)
        mad = float(np.abs(fi - prev).mean())
        mad2 = float(np.abs(fi - prev2).mean()) if prev2 is not None else nan
        mean = p99 = zoom = pan = resr = movf = nan
        if mit_fluss:
            fl = cv2.calcOpticalFlowFarneback(prev, f, None, 0.5, 3, 15, 3, 5, 1.2, 0).astype(np.float64)
            mag = np.hypot(fl[..., 0], fl[..., 1])
            g = cv2.Sobel(prev, cv2.CV_64F, 1, 0) ** 2 + cv2.Sobel(prev, cv2.CV_64F, 0, 1) ** 2
            m = g > 400
            zoom, pan = 0.0, 0.0
            if m.sum() > 200:
                X = np.stack([np.ones(m.sum()), gx[m], gy[m]], 1)
                a = np.linalg.lstsq(X, fl[..., 0][m], rcond=None)[0]
                bb = np.linalg.lstsq(X, fl[..., 1][m], rcond=None)[0]
                zoom = (a[1] + bb[2]) / 2 * fps * 100
                pan = math.hypot(a[0], bb[0]) * fps / W * 100
                r = np.hypot(fl[..., 0][m] - X @ a, fl[..., 1][m] - X @ bb)
                mm = mag[m]
                sel = mm > 0.05
                if sel.sum() > 50:
                    resr = float(r[sel].mean() / mm[sel].mean())
            mean, p99, movf = float(mag.mean()), float(np.percentile(mag, 99)), float((mag > 0.1).mean())
        rows.append([mad, mad2, mean, p99, zoom, pan, resr, movf])
        prev2, prev = prev, f
    p.wait()
    if mit_fuellung:
        return np.array(rows, dtype=float), daumen, np.array(fuell, dtype=float).reshape(-1, 3)
    return np.array(rows, dtype=float), daumen


def _daumen(f):
    h, w = f.shape
    k = max(1, w // 80)   # 320 px → 80 px breit
    hh, ww = (h // k) * k, (w // k) * k
    return f[:hh, :ww].reshape(hh // k, k, ww // k, k).mean(axis=(1, 3)).astype(np.float32)


def finde_schnitte(mad):
    cuts = []
    for k in range(1, len(mad)):
        nb = np.concatenate([mad[max(1, k - 5):k], mad[k + 1:min(len(mad), k + 6)]])
        base = float(np.median(nb)) if len(nb) else 0.0
        if mad[k] >= 6 and mad[k] >= 3 * max(base, 0.5):
            if cuts and k - cuts[-1] < 6:
                if mad[k] > mad[cuts[-1]]:
                    cuts[-1] = k
                continue
            cuts.append(k)
    return cuts


def schnitte_aus(ev, szenen_arg, mad, fps):
    if szenen_arg:
        ts = [float(x) for x in szenen_arg.split(",") if x.strip()]
        quelle = "--szenen"
    else:
        ts = [float(e["t"]) for e in ev if e["typ"] in SCHNITT_TYPEN]
        quelle = "Ereignisliste"
    if ts:
        cuts = []
        for t in ts:
            k = int(round(t * fps))
            if k <= 0 or k >= len(mad):
                continue
            lo, hi = max(1, k - 2), min(len(mad), k + 3)
            k = lo + int(np.argmax(mad[lo:hi]))   # auf den echten Schnitt-Frame ziehen
            if not cuts or k > cuts[-1]:
                cuts.append(k)
        return cuts, quelle
    return finde_schnitte(mad), "automatisch erkannt"


def bewegung_auswerten(F, cuts, fps, ende_frame, ausnahmen=()):
    """Stand, Drift und Anfahren je Szene bis ende_frame (Endkarte). Frames in ausnahmen (erklärte stille,
    Liste (von, bis) in s) zählen weder als Stand noch in Drift und Anteil."""
    N = min(len(F), ende_frame)
    frei = np.array([in_bereich(k / fps, ausnahmen) for k in range(len(F))], bool)
    grenzen = [0] + [c for c in cuts if c < N] + [N]
    szenen = []
    anfahren = []
    teile = []
    for a, b in zip(grenzen[:-1], grenzen[1:]):
        lo, hi = a + 1, b          # Zeilen a+1 … b-1 (Schnitt-Zeile selbst raus)
        if hi - lo < 3:
            continue
        x, fx = F[lo:hi], frei[lo:hi]
        if fx.mean() > 0.5:        # Szene liegt überwiegend in einer erklärten stille
            continue
        st = (x[:, P99] < STAND_P99) & ~fx
        laengster = max([e - s for s, e in runs(st)] or [0])
        drift = float(np.median(np.hypot(x[~fx, ZOOM], x[~fx, PAN])))
        szenen.append(dict(von=a / fps, bis=b / fps, dauer=(b - a) / fps, stand=float(st[~fx].mean() * 100),
                           laengster=laengster / fps, drift=drift, zoom=float(np.median(np.abs(x[~fx, ZOOM]))),
                           fluss=float(np.nanmean(x[~fx, MEAN]))))
        teile.append(x[~fx])
        for s, e in runs(st):
            if e - s < 4 or e >= len(x):
                continue
            nach = x[e:min(len(x), e + 5), P99]
            vor = float(x[s:e, P99].mean())
            if len(nach) and nach.max() >= 0.5 and nach.max() >= 10 * (vor + 1e-3):
                anfahren.append((lo + e) / fps)
    alle = np.concatenate(teile) if teile else F[1:N]
    return dict(szenen=szenen, anfahren=anfahren, dauer=N / fps,
                stand=float((alle[:, P99] < STAND_P99).mean() * 100) if len(alle) else float("nan"),
                fluss_median=float(np.nanmedian(alle[:, MEAN])) if len(alle) else float("nan"),
                laengster=max([s["laengster"] for s in szenen] or [0]))


def fuellung_auswerten(FU, mad, fps, ende_frame, ausnahmen=(), aussagen=()):
    """Leere Strecken (stehendes Bild mit Band > LEER_BAND, länger als LEER_DAUER_S) und dünne Strecken (Zeilen <
    ZEILEN_MIN) bis zur Endkarte. Nicht gezählt: erklärte stille, Aussage-Fenster (von t bis ausstiegAb) und Frames
    in Bewegung (Frame-Differenz ≥ STEHT_MAD, z. B. Kamerafahrt oder Scroll)."""
    N = min(len(FU), ende_frame, len(mad))
    if N == 0:
        return dict(leer=[], duenn=[], median_zeilen=float("nan"), median_band=float("nan"), anteil_leer=0.0)
    X = FU[:N]
    frei = np.array([in_bereich(k / fps, ausnahmen) or in_bereich(k / fps, aussagen) for k in range(N)], bool)
    steht = np.asarray(mad[:N]) < STEHT_MAD
    leer = (X[:, 1] > LEER_BAND) & steht & ~frei
    duenn = (X[:, 0] < ZEILEN_MIN) & steht & ~frei
    lang = lambda m: [(a / fps, b / fps, float(X[a:b, 1].max()), float(X[a:b, 0].min()))
                      for a, b in runs(m) if (b - a) / fps > LEER_DAUER_S + 1e-6]
    return dict(leer=lang(leer), duenn=lang(duenn), median_zeilen=float(np.median(X[~frei, 0])) if (~frei).any() else float("nan"),
                median_band=float(np.median(X[~frei, 1])) if (~frei).any() else float("nan"),
                anteil_leer=float(leer.mean() * 100))


# ---------------------------------------------------------------- Lesetext (09 §2)
def textzeilen(g):
    """Textzeilen eines Graustufen-Frames (kurze Bildseite 1080 px), ohne OCR. Helle Striche (Top-Hat) und dunkle
    Striche (Black-Hat, Fenster TEXT_K) getrennt: Teile zu Zeilen gruppiert (gleiche Höhe, waagerecht benachbart),
    eine Zeile zählt nur, wenn ihre Striche sich vom Grund rundherum abheben (sonst sind es Lücken zwischen
    Buchstaben oder Punkten der anderen Polarität). Zeilenhöhe = Grundlinie bis Oberkante Versal/Oberlänge aus
    dem Profil der Strichstärke (mit Bruchteilen). Rückgabe: Liste dict(x0, y0, x1, y1, hoehe, px)."""
    from scipy import ndimage as ndi
    f = g.astype(np.float32)
    se = np.ones((TEXT_K, TEXT_K), bool)
    auf, zu = ndi.grey_opening(f, footprint=se), ndi.grey_closing(f, footprint=se)
    # Großer Grund (Median über ca. 100 px): dicke Striche großer Schrift heben sich davon ab, Karten und Flächen nicht
    klein = ndi.median_filter(f[::4, ::4], size=25)
    grund = np.kron(klein, np.ones((4, 4), np.float32))[:f.shape[0], :f.shape[1]]
    if grund.shape != f.shape:
        grund = np.pad(grund, ((0, f.shape[0] - grund.shape[0]), (0, f.shape[1] - grund.shape[1])), mode="edge")
    dick = {True: (auf - grund) > 40, False: (grund - zu) > 40}
    out = []
    for hell, staerke in ((True, f - auf), (False, zu - f)):
        out += _zeilen_einer_polaritaet(f, staerke, hell, ndi, dick[not hell])
    return out


def _zeilen_einer_polaritaet(f, staerke, hell, ndi, dick_gegen):
    lab, _ = ndi.label(staerke > TEXT_KONTRAST, structure=np.ones((3, 3)))
    teile = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        if sl is None:
            continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        h, w = y1 - y0, x1 - x0
        if h < 5 or h > 80:
            continue
        flaeche = int((lab[sl] == i + 1).sum())
        dichte = flaeche / (h * w)
        if flaeche < 6 or not (0.08 <= dichte <= 0.72):   # Flächen und Linien sind keine Schrift
            continue
        teile.append((x0, y0, x1, y1, i + 1, dichte >= 0.5 and 0.7 <= w / h <= 1.45))   # letzter Wert: runder Fleck
    teile.sort()
    n = len(teile)
    eltern = list(range(n))

    def wurzel(a):
        while eltern[a] != a:
            eltern[a] = eltern[eltern[a]]
            a = eltern[a]
        return a
    for i in range(n):
        xi0, yi0, xi1, yi1 = teile[i][:4]
        hi = yi1 - yi0
        for j in range(i + 1, n):
            xj0, yj0, xj1, yj1 = teile[j][:4]
            if xj0 - xi1 > 160:
                break
            hj = yj1 - yj0
            ueber = min(yi1, yj1) - max(yi0, yj0)
            if xj0 - xi1 <= 1.6 * max(hi, hj) and ueber >= 0.6 * min(hi, hj) and max(hi, hj) <= 2.6 * min(hi, hj):
                eltern[wurzel(i)] = wurzel(j)
    gruppen = {}
    for i in range(n):
        gruppen.setdefault(wurzel(i), []).append(teile[i])
    H, W = f.shape
    out = []
    for cs in gruppen.values():
        if all(c[5] for c in cs):          # nur runde Flecken (Fenster-Knöpfe, Punkte): keine Schrift
            continue
        if len(cs) < 3 and max(c[2] for c in cs) - min(c[0] for c in cs) < 6 * max(c[3] - c[1] for c in cs):
            continue                       # zwei Flecken nebeneinander (Fotostruktur), kein Wort
        a = np.array([c[:5] for c in cs])
        x0, y0, x1, y1 = int(a[:, 0].min()), int(a[:, 1].min()), int(a[:, 2].max()), int(a[:, 3].max())
        ya, yb = max(0, y0 - 2), min(H, y1 + 2)
        maske = np.isin(lab[ya:yb, x0:x1], a[:, 4])
        # Polarität prüfen: Striche heben sich vom Grund rund um die Zeile ab (Lücken zwischen Buchstaben nicht)
        hz = y1 - y0
        umg = f[max(0, y0 - hz):min(H, y1 + hz), max(0, x0 - hz):min(W, x1 + hz)]
        grund_wert = float(np.median(umg))
        strich = float(f[ya:yb, x0:x1][maske].mean())
        if (strich - grund_wert if hell else grund_wert - strich) < TEXT_KONTRAST / 2:
            continue
        # Innenecken und Punzen großer Schrift: Zeile liegt in dicken Strichen der Gegenpolarität
        if dick_gegen[max(0, y0 - hz):min(H, y1 + hz), max(0, x0 - hz):min(W, x1 + hz)].mean() > 0.3:
            continue
        # Zeilenprofil aus der Strichstärke (nicht binär): Kanten mit Antialiasing liefern Bruchteile von Pixeln
        profil = (staerke[ya:yb, x0:x1] * maske).sum(axis=1)
        mx = profil.max()
        if mx <= 0:
            continue

        def kante(schwelle, von_oben):
            """Lage (Zeilen, mit Bruchteil), an der das Profil die Schwelle kreuzt: von oben bzw. von unten."""
            thr = schwelle * mx
            idx = np.where(profil >= thr)[0]
            if von_oben:
                i = int(idx[0])
                return float(i) if i == 0 else (i - 1) + (thr - profil[i - 1]) / (profil[i] - profil[i - 1] + 1e-9)
            i = int(idx[-1])
            return float(i) if i == len(profil) - 1 else i + (profil[i] - thr) / (profil[i] - profil[i + 1] + 1e-9)
        oben = kante(0.03, True)             # Oberkante Versalien/Oberlängen (auch eine einzelne Oberlänge zählt)
        grund = kante(0.3, False)            # Grundlinie (Unterlängen sind dünn besetzt)
        hoehe = grund - oben
        if hoehe < 7 or x1 - x0 < 3 * hoehe:     # Icons, Einzelzeichen und Strukturen < ca. 9 px sind keine Zeile
            continue
        out.append(dict(x0=x0, y0=int(ya + oben), x1=x1, y1=int(ya + grund), hoehe=round(float(hoehe), 2),
                        px=float(hoehe / ZEILE_JE_PX)))
    return out


# ---------------------------------------------------------------- Bildwelten (09 §5)
BILDWELT_KACHEL_MAX = 1 / 3     # höchstens ein Drittel der Szenen „Kachel auf leerem Grund“
BILDWELT_REICH_FARBEN = 15       # Farbstufen (32er-Raster, je ≥ 0,2 % der Fläche): ab hier Foto, Gerät, echte Daten


def bildwelt_szenen(ev, dauer):
    """Szenen aus den Ereignissen typ bildwelt (art, optional text): je Ereignis bis zum nächsten bzw. zur Endkarte."""
    bw = sorted([e for e in ev if e["typ"] == "bildwelt"], key=lambda e: float(e["t"]))
    ende = min([float(e["t"]) for e in ev if e["typ"] in ("endkarte", "ende")] or [dauer])
    out = []
    for i, e in enumerate(bw):
        von = float(e["t"])
        bis = min(float(bw[i + 1]["t"]) if i + 1 < len(bw) else ende, ende)
        if bis - von <= 0.05:
            continue
        art = str(e.get("art") or "").strip().lower()
        out.append(dict(von=von, bis=bis, art=art.split()[0] if art else "?",
                        wie_vorbild="vorbild" in (art + " " + str(e.get("text") or "")).lower()))
    return out


def farbvielfalt_je_sekunde(path, info):
    """Je Sekunde ein Frame (320 × 180): Zahl der Farbstufen (je Kanal 8 Stufen) mit ≥ 0,2 % der Fläche."""
    W, H = 320, 180
    r = subprocess.run(NICE + ["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps=1,scale={W}:{H}", "-f", "rawvideo",
                               "-pix_fmt", "rgb24", "-"], capture_output=True)
    n = W * H * 3
    out = []
    for i in range(0, len(r.stdout) - n + 1, n):
        f = np.frombuffer(r.stdout[i:i + n], np.uint8).reshape(-1, 3).astype(np.int64) // 32
        k = np.bincount(f[:, 0] * 64 + f[:, 1] * 8 + f[:, 2], minlength=512) / len(f)
        out.append(int((k > 0.002).sum()))
    return out


def grosse_schrift(g, k=3):
    """Blöcke großer Schrift (Aussagen, Hits): dieselbe Zeilensuche auf dem k-fach verkleinerten Frame, wo dicke Striche
    großer Schrift dünn genug für das Fenster TEXT_K werden. Rückgabe: Rechtecke (x0, y0, x1, y1) in Frame-px. Zeilen der
    vollen Auflösung, die darin liegen, sind Bruchstücke dieser Schrift (Punzen, Teilwörter), keine kleine Lesezeile."""
    klein = g[::k, ::k]
    out = []
    for z in textzeilen(klein):
        if z["px"] * k >= TEXT_MAX_PX:
            h = (z["y1"] - z["y0"]) * k
            out.append((z["x0"] * k - 0.05 * h, z["y0"] * k - 0.15 * h, z["x1"] * k + 0.05 * h, z["y1"] * k + 0.15 * h))
    return out


def in_grosser_schrift(z, bloecke):
    cx, cy = (z["x0"] + z["x1"]) / 2, (z["y0"] + z["y1"]) / 2
    return any(b[0] <= cx <= b[2] and b[1] <= cy <= b[3] and z["x1"] - z["x0"] <= 1.1 * (b[2] - b[0]) for b in bloecke)


def frame_voll(path, t, info, zwei=False):
    """Frame bei t (s) in Graustufen, skaliert auf kurze Bildseite 1080. Mit zwei=True zusätzlich der Vorframe."""
    s = 1080.0 / min(info["w"], info["h"])
    W, H = int(round(info["w"] * s / 2)) * 2, int(round(info["h"] * s / 2)) * 2
    t0 = max(0.0, t - (1.0 / info["fps"] if zwei else 0.0))
    r = subprocess.run(NICE + ["ffmpeg", "-v", "error", "-ss", f"{t0:.4f}", "-i", path, "-frames:v", "2" if zwei else "1",
                               "-vf", f"scale={W}:{H}:flags=bicubic,format=gray", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                       capture_output=True)
    n = W * H
    b = r.stdout
    if len(b) < n:
        return None, None, s
    a = np.frombuffer(b[:n], np.uint8).reshape(H, W)
    if zwei and len(b) >= 2 * n:
        return np.frombuffer(b[n:2 * n], np.uint8).reshape(H, W), a, s
    return a, None, s


def deko_bereiche(ev):
    """Ereignisse typ deko: (von, bis, [x0, y0, x1, y1] in Film-px, grund)."""
    out = []
    for e in ev:
        if e["typ"] == "deko" and isinstance(e.get("bereich"), (list, tuple)) and len(e["bereich"]) == 4:
            out.append((float(e["t"]), float(e["bis"]) if e.get("bis") is not None else float("inf"),
                        [float(v) for v in e["bereich"]], e.get("grund") or e.get("text") or ""))
    return out


def lesetext_pruefen(film, info, ev, aussagen, ende_ev, out_dir):
    """Lesetext ≥ LESE_MIN_PX: Aussage-Frames (lesbarAb, Mitte des Lesefensters), Endkarte und Stichproben alle
    TEXT_STICHPROBE_S s. Zeilen in einem deko-Bereich zählen nicht. Bogen in 1/3 Größe (Handy-Feed)."""
    fps, dauer = info["fps"], info["dauer"]
    zeiten = []
    for e in aussagen:
        a = float(e["lesbarAb"]) + 0.5 / fps
        zeiten.append((a, "Aussage " + str(e.get("beat") or e.get("id", "")), True))
        if e.get("ausstiegAb") is not None:
            zeiten.append(((a + float(e["ausstiegAb"])) / 2, "Lesefenster " + str(e.get("beat") or e.get("id", "")), True))
    if ende_ev:
        ende = min([float(e["t"]) for e in ev if e["typ"] == "ende"] or [dauer])
        zeiten.append((max(min(ende_ev), ende - 0.4), "Endkarte", True))
    t = 1.0
    while t < dauer - 0.3:
        zeiten.append((t, "Stichprobe", False))
        t += TEXT_STICHPROBE_S
    zeiten.sort()
    eindeutig = []
    for z in zeiten:
        if not eindeutig or z[0] - eindeutig[-1][0] > 0.2 or z[2]:
            eindeutig.append(z)
    deko = deko_bereiche(ev)
    frames, alle_klein, alle_deko, gemessen, gross_teile = [], [], [], 0, 0
    for t, art, pflicht in eindeutig:
        g, vor, s = frame_voll(film, t, info, zwei=not pflicht)
        if g is None:
            continue
        if vor is not None and float(np.abs(g.astype(np.int16) - vor).mean()) > TEXT_BEWEGT:
            continue                       # Übergang oder Whip: kein Lesemoment
        gemessen += 1
        klein, dk = [], []
        zl = [z for z in textzeilen(g) if z["px"] < TEXT_MAX_PX]
        if zl and any(z["px"] < LESE_MIN_PX - TEXT_TOL_PX for z in zl):
            bloecke = grosse_schrift(g)
            teil = [z for z in zl if in_grosser_schrift(z, bloecke)]
            if teil:
                zl = [z for z in zl if z not in teil]
                gross_teile += len(teil)
        # Gegenprobe 0,25 s später: eine Zeile zählt nur, wenn sie dort an derselben Stelle gleich groß steht
        # (Text im Übergang, angeschnitten oder halb eingeblendet, ist kein Lesemoment)
        g2 = frame_voll(film, min(t + 0.25, dauer - 0.5 / fps), info)[0] if zl else None
        zl2 = textzeilen(g2) if g2 is not None else []

        def steht(z):
            h = z["y1"] - z["y0"] or 1
            for w in zl2:
                ueber = min(z["x1"], w["x1"]) - max(z["x0"], w["x0"])
                if (abs((z["y0"] + z["y1"]) - (w["y0"] + w["y1"])) / 2 <= 0.5 * h and abs(z["hoehe"] - w["hoehe"]) <= 0.15 * z["hoehe"]
                        and ueber >= 0.5 * min(z["x1"] - z["x0"], w["x1"] - w["x0"])):
                    return True
            return g2 is None
        for z in zl:
            if not steht(z):
                continue
            cx, cy = (z["x0"] + z["x1"]) / 2 / s, (z["y0"] + z["y1"]) / 2 / s
            treffer = [d for d in deko if d[0] <= t < d[1] and d[2][0] <= cx <= d[2][2] and d[2][1] <= cy <= d[2][3]]
            z = dict(z, t=round(t, 3), art=art, x=[round(z["x0"] / s), round(z["x1"] / s)], y=round(z["y0"] / s))
            if treffer:
                dk.append(dict(z, grund=treffer[0][3]))
            elif z["px"] < LESE_MIN_PX - TEXT_TOL_PX:
                klein.append(z)
        frames.append(dict(t=round(t, 3), art=art, klein=klein, deko=dk,
                           kleinste=min([z["px"] for z in zl] or [float("nan")])))
        alle_klein += klein
        alle_deko += dk
    bogen = lesetext_bogen(film, info, frames, out_dir)
    return dict(frames=frames, klein=alle_klein, deko=alle_deko, gemessen=gemessen, bogen=bogen, gross_teile=gross_teile)


def lesetext_bogen(film, info, frames, out_dir):
    """Frames mit zu kleinen Zeilen (rot) und Deko-Zeilen (grau), je 640 px breit: so groß wie 16:9 im Handy-Feed."""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return None
    wahl = sorted([f for f in frames if f["klein"]], key=lambda f: min(z["px"] for z in f["klein"]))[:9]
    if not wahl:
        return None
    breite = 640
    kacheln = []
    for f in wahl:
        tmp = Path(out_dir) / f"_lesetext_{f['t']:.3f}.png"
        subprocess.run(NICE + ["ffmpeg", "-v", "error", "-y", "-ss", f"{f['t']:.4f}", "-i", film, "-frames:v", "1", str(tmp)],
                       check=False)
        if not tmp.is_file():
            continue
        im = Image.open(tmp).convert("RGB")
        k = breite / im.width
        d = ImageDraw.Draw(im)
        for z in f["deko"]:
            d.rectangle([z["x"][0] - 4, z["y"] - 4, z["x"][1] + 4, z["y"] + z["hoehe"] + 8], outline=(150, 150, 150), width=3)
        for z in f["klein"]:
            d.rectangle([z["x"][0] - 4, z["y"] - 4, z["x"][1] + 4, z["y"] + z["hoehe"] + 8], outline=(230, 40, 40), width=4)
        im = im.resize((breite, int(im.height * k)), Image.LANCZOS)
        kacheln.append((f, im))
        tmp.unlink()
    if not kacheln:
        return None
    sp = 3
    zh = kacheln[0][1].height
    bogen = Image.new("RGB", (sp * (breite + 10) + 10, ((len(kacheln) + sp - 1) // sp) * (zh + 30) + 10), (12, 12, 12))
    d = ImageDraw.Draw(bogen)
    for i, (f, im) in enumerate(kacheln):
        x, y = 10 + (i % sp) * (breite + 10), 10 + (i // sp) * (zh + 30)
        bogen.paste(im, (x, y + 22))
        d.text((x, y + 4), f"{zahl(f['t'], 2)} s · {f['art']} · kleinste {zahl(min(z['px'] for z in f['klein']), 0)} px",
               fill=(255, 210, 120))
    ziel = Path(out_dir) / "lesetext-bogen.jpg"
    bogen.save(ziel, quality=85)
    return str(ziel)


def brief_spanne(wert):
    """--brief bzw. briefLaenge: Zahl (± LAENGE_TOL %) oder Spanne „15-20“, „15–20“, [15, 20] (wörtlich).
    Rückgabe (von, bis, ist_spanne) oder None."""
    if wert is None or wert == "":
        return None
    if isinstance(wert, (list, tuple)) and len(wert) == 2:
        a, b = sorted(float(v) for v in wert)
        return a, b, True
    if isinstance(wert, (int, float)):
        return float(wert), float(wert), False
    txt = str(wert).strip().replace(",", ".").replace("–", "-").replace("bis", "-").replace(" ", "")
    m = re.fullmatch(r"(\d+(?:\.\d+)?)s?(?:-|:)(\d+(?:\.\d+)?)s?", txt)
    if m:
        a, b = sorted((float(m.group(1)), float(m.group(2))))
        return a, b, True
    try:
        v = float(txt.rstrip("s"))
        return v, v, False
    except ValueError:
        sys.exit(f"--brief/briefLaenge nicht lesbar: {wert!r} (Zahl wie 25 oder Spanne wie 15-20)")


def energie_ueber_schnitte(F, cuts, fps):
    werte = []
    for k in cuts:
        if k - 3 < 1 or k + 4 > len(F):
            continue
        vor = float(np.nanmean(F[k - 3:k, MEAN]))
        nach = float(np.nanmean(F[k + 1:k + 4, MEAN]))
        if vor < 0.02 and nach < 0.02:
            continue
        werte.append((k / fps, nach / max(vor, 1e-3)))
    return werte


def duplikate_blitze(F, daumen, fps):
    mad = F[:, MAD]
    dups, blitze = [], []
    for k in range(2, len(mad) - 1):
        # gleich zum Vorgänger, davor Bewegung und danach Bewegung oder Schnitt (Beginn eines Halts zählt nicht)
        nb = min(mad[k - 1], mad[k + 1])
        if mad[k] < DUP_GLEICH and ((nb >= 0.12 and mad[k] <= 0.2 * nb) or (mad[k - 1] >= 0.12 and mad[k + 1] > 3)):
            dups.append(k)
    for k in range(1, len(mad) - 1):
        if mad[k] >= 4 and mad[k + 1] >= 4:
            d = daumen
            nb = min(float(np.abs(d[k] - d[k - 1]).mean()), float(np.abs(d[k + 1] - d[k]).mean()))
            rueck = float(np.abs(d[k + 1] - d[k - 1]).mean())
            alt = min([float(np.abs(d[k] - d[j]).mean()) for j in range(max(0, k - int(5 * fps)), k - 2)] or [1e9])
            if nb >= 3 and (rueck < 0.35 * nb or alt < 0.35 * nb):   # auch im 80-px-Daumen klar anders als die Nachbarn
                blitze.append(k)
    return dups, blitze


# ---------------------------------------------------------------- Ton
def lade_ton(path, sr):
    raw = subprocess.run(NICE + ["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(sr),
                                 "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def rms_fenster(x, sr, lang=0.1):
    w = int(lang * sr)
    n = len(x) // w
    if n == 0:
        return np.array([])
    seg = x[:n * w].reshape(n, w)
    return 20 * np.log10(np.sqrt((seg ** 2).mean(axis=1)) + 1e-9)


def stille_bereiche(ev):
    out = []
    for e in ev:
        if e["typ"] == "stille" and "bis" in e:
            out.append((float(e["t"]), float(e["bis"])))
    return out


def in_bereich(t, bereiche):
    return any(a <= t < b for a, b in bereiche)


def loecher(db, start, ende, grenze, ausnahmen, lang=0.1):
    treffer = [i for i in range(len(db)) if start <= i * lang < ende and db[i] < grenze
               and not in_bereich(i * lang, ausnahmen)]
    maske = np.zeros(len(db), bool)
    maske[treffer] = True
    strecken = [(s * lang, e * lang) for s, e in runs(maske)]
    return treffer, strecken


def digitale_stille(x, sr, ende, ausnahmen, min_lang=0.02):
    maske = np.abs(x[:int(ende * sr)]) < 3e-5
    out = []
    for s, e in runs(maske):
        if (e - s) / sr >= min_lang and not in_bereich(s / sr, ausnahmen) and s / sr > 0.3:
            out.append((s / sr, (e - s) / sr))
    return out


def band_spektrum(x, sr, hop_s=0.01, n_fft=1024, baender=32, boden=60):
    hop = int(hop_s * sr)
    n = 1 + max(0, (len(x) - n_fft) // hop)
    frames = np.lib.stride_tricks.as_strided(x, shape=(n, n_fft), strides=(x.strides[0] * hop, x.strides[0]))
    S = np.abs(np.fft.rfft(frames * np.hanning(n_fft), axis=1)) ** 2
    fr = np.fft.rfftfreq(n_fft, 1 / sr)
    kanten = np.geomspace(60, min(11000, sr / 2 - 1), baender + 1)
    B = np.stack([S[:, (fr >= kanten[i]) & (fr < kanten[i + 1])].sum(axis=1) for i in range(baender)], 1)
    dB = 10 * np.log10(B + 1e-12)
    return np.maximum(dB, dB.max() - boden)


def mix_wiederkehr(x, sr, fenster_s=2.0, schritt_s=0.5, rueck_s=30.0, hop_s=0.01, scheibe_s=0.05):
    """Je 2-s-Fenster (alle 0,5 s): mittlerer Abstand in dB (32 Bänder × 40 Scheiben à 50 ms) zum ähnlichsten
    Fenster, das 2 bis 30 s früher beginnt (Suche im 10-ms-Raster). Wörtliche Kopie im Mix ≈ 1,5 bis 2,5 dB,
    Referenz-Reel im Lauf 3,8 dB, abgenommener Film 3,1 dB, Soll ≥ 2,5 dB (Kalibrierung in references/07-qa.md)."""
    F = band_spektrum(x, sr, hop_s)
    L = int(round(fenster_s / hop_s))
    idx = np.arange(0, L, int(round(scheibe_s / hop_s)))
    pegel = rms_fenster(x, sr, hop_s)
    out = []
    for q in range(L, len(F) - L, int(round(schritt_s / hop_s))):
        if np.median(pegel[q:q + L]) < -45:
            continue
        cs = np.arange(max(0, q - int(rueck_s / hop_s)), q - L + 1)
        if len(cs) == 0:
            continue
        d = np.abs(F[cs[:, None] + idx[None, :]] - F[q + idx]).mean(axis=(1, 2))
        j = int(np.argmin(d))
        out.append((q * hop_s, float(d[j]), float(cs[j] * hop_s)))
    return out


def onset_fluss(x, sr, fmax=None, n_fft=1024, hop=256):
    """Spektraler Fluss (positive Änderung von log|STFT|), optional nur bis fmax Hz. Zeit = Mitte des Frames."""
    n = 1 + max(0, (len(x) - n_fft) // hop)
    frames = np.lib.stride_tricks.as_strided(x, shape=(n, n_fft), strides=(x.strides[0] * hop, x.strides[0]))
    M = np.log1p(np.abs(np.fft.rfft(frames * np.hanning(n_fft), axis=1)))
    if fmax:
        M = M[:, np.fft.rfftfreq(n_fft, 1 / sr) < fmax]
    fl = np.maximum(0, np.diff(M, axis=0)).sum(axis=1)
    t = (np.arange(1, n) * hop + n_fft / 2) / sr
    return fl, t


def schaetze_bpm(x, sr):
    """Tempo aus der Autokorrelation des Flusses, Kamm über 1 bis 4 Schläge (80 bis 180 BPM)."""
    fl, t = onset_fluss(x, sr)
    fs = 1 / (t[1] - t[0])
    o = fl - fl.mean()
    n = 1 << (2 * len(o) - 1).bit_length()
    F = np.fft.rfft(o, n)
    ac = np.fft.irfft(F * np.conj(F), n)[:len(o)]
    ac = ac / (ac[0] + 1e-12)
    kand = np.arange(80, 180.01, 0.05)
    lag = lambda b, k: k * 60 / b * fs
    score = [sum(np.interp(lag(b, k), np.arange(len(ac)), ac) for k in (1, 2, 3, 4)) for b in kand]
    return float(kand[int(np.argmax(score))])


def schleifen(x, sr, bpm, takte=2, rueck_s=30.0, r_grenze=0.9):
    """2-Takt-Fenster je Schlag gegen die letzten 30 s (normierte Kreuzkorrelation, Sample-genau)."""
    beat = 60 / bpm
    W = int(takte * 4 * beat * sr)
    treffer = []
    s = W
    while s + W <= len(x):
        A = x[s:s + W]
        ea = math.sqrt(float((A ** 2).sum()))
        if ea < 1e-4 * math.sqrt(W):
            s += int(beat * sr)
            continue
        r0 = max(0, s - int(rueck_s * sr))
        R = x[r0:s]
        if len(R) >= W:
            n = 1 << (len(R) + W).bit_length()
            c = np.fft.irfft(np.fft.rfft(R, n) * np.conj(np.fft.rfft(A, n)), n)[:len(R) - W + 1]
            cs = np.concatenate([[0.0], np.cumsum(R ** 2)])
            er = np.sqrt(cs[W:] - cs[:-W] + 1e-12)[:len(c)]
            r = c / (ea * er + 1e-12)
            j = int(np.argmax(r))
            if r[j] > r_grenze:
                treffer.append((s / sr, (r0 + j) / sr, float(r[j])))
        s += int(beat * sr)
    # zusammenhängende Strecken mit gleichem Versatz
    strecken = []
    for t, quelle, r in treffer:
        lag = t - quelle
        if strecken and abs(strecken[-1]["lag"] - lag) < 0.02 and t - strecken[-1]["bis_start"] <= beat * 1.5:
            st = strecken[-1]
            st["bis_start"] = t
            st["r"] = max(st["r"], r)
            st["n"] += 1
        else:
            strecken.append(dict(von=t, bis_start=t, lag=lag, r=r, n=1))
    fenster = takte * 4 * beat
    for st in strecken:
        st["bis"] = st["bis_start"] + fenster
        st["laenge_takte"] = (st["bis"] - st["von"]) / (4 * beat)
    return strecken


def ebur128(path):
    r = subprocess.run(NICE + ["ffmpeg", "-nostats", "-hide_banner", "-i", path, "-vn", "-af", "ebur128=peak=true",
                               "-f", "null", "-"], capture_output=True, text=True)
    txt = r.stderr
    i = re.findall(r"I:\s+(-?[\d.]+|-inf) LUFS", txt)
    p = re.findall(r"Peak:\s+(-?[\d.]+|-inf) dBFS", txt)
    f = lambda v: float("-inf") if v == "-inf" else float(v)
    return (f(i[-1]) if i else None), (f(p[-1]) if p else None)


def atom_reihenfolge(path):
    reihe = []
    with open(path, "rb") as fh:
        fh.seek(0, 2)
        groesse = fh.tell()
        pos = 0
        while pos + 8 <= groesse and len(reihe) < 50:
            fh.seek(pos)
            kopf = fh.read(8)
            n = int.from_bytes(kopf[:4], "big")
            typ = kopf[4:8].decode("latin-1")
            if n == 1:
                n = int.from_bytes(fh.read(8), "big")
            elif n == 0:
                n = groesse - pos
            if n < 8:
                break
            reihe.append(typ)
            pos += n
    return reihe


# ---------------------------------------------------------------- Ein-Blick-Bogen
def ein_blick_bogen(film, aussagen, out_dir, fps):
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return None, "Pillow fehlt (python3 -m pip install pillow)"
    tmp = Path(out_dir) / "_bogen"
    tmp.mkdir(parents=True, exist_ok=True)
    bilder = []
    for i, e in enumerate(aussagen):
        t = float(e["lesbarAb"]) + 0.5 / fps
        ziel = tmp / f"a{i:03d}.jpg"
        subprocess.run(NICE + ["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", film, "-frames:v", "1",
                               "-vf", "scale=480:-2", "-q:v", "3", str(ziel)], check=False)
        if ziel.is_file():
            bilder.append((e, ziel))
    if not bilder:
        return None, "keine Frames gezogen"
    w0, h0 = Image.open(bilder[0][1]).size
    cols = 4
    zeilen = (len(bilder) + cols - 1) // cols
    bogen = Image.new("RGB", (cols * (w0 + 10) + 10, zeilen * (h0 + 46) + 10), (12, 12, 12))
    d = ImageDraw.Draw(bogen)
    from PIL import ImageFont
    schrift = None
    for name in ("DejaVuSans.ttf", "Arial.ttf", "Helvetica.ttc", "LiberationSans-Regular.ttf"):  # mit Umlauten
        try:
            schrift = ImageFont.truetype(name, 15)
            break
        except OSError:
            continue
    if schrift is None:
        try:
            schrift = ImageFont.load_default(size=15)
        except TypeError:
            schrift = ImageFont.load_default()
    for i, (e, pfad) in enumerate(bilder):
        x, y = 10 + (i % cols) * (w0 + 10), 10 + (i // cols) * (h0 + 46)
        bogen.paste(Image.open(pfad), (x, y + 36))
        kopf = f"{e.get('beat') or e.get('id', '')} · {zahl(float(e['lesbarAb']), 2)} s"
        d.text((x, y + 2), kopf, fill=(255, 210, 120), font=schrift)
        d.text((x, y + 18), str(e.get("text", ""))[:70], fill=(235, 235, 235), font=schrift)
    ziel = Path(out_dir) / "ein-blick-bogen.jpg"
    bogen.save(ziel, quality=85)
    for _, pfad in bilder:
        pfad.unlink()
    tmp.rmdir()
    return str(ziel), None


# ---------------------------------------------------------------- Hauptteil
def main():
    ap = argparse.ArgumentParser(description="Qualitätsmessung am fertigen Render (Rubrik R1 bis R12).")
    ap.add_argument("film")
    for s in ("bewegung", "frames", "fuellung", "text", "ton", "beats", "auslieferung"):
        ap.add_argument(f"--{s}", action="store_true")
    ap.add_argument("--ref")
    ap.add_argument("--ereignisse")
    ap.add_argument("--ohne-ereignisse", action="store_true",
                    help="keine Ereignisliste suchen (Referenz, Teil-Render eines Blocks: dessen Zeit ist nicht die Filmzeit)")
    ap.add_argument("--musik", help="Musik-Spur (wav) für die Schleifen-Prüfung, sonst der Mix")
    ap.add_argument("--bpm", type=float)
    ap.add_argument("--takt0", type=float, help="Filmzeit der ersten Takt-Eins (s), Standard 0")
    ap.add_argument("--szenen", help="Schnittzeiten in s, kommagetrennt (überschreibt Ereignisliste)")
    ap.add_argument("--start-frei", type=float, default=START_FREI_S,
                    help=f"Einblende am Filmanfang ohne Loch-Prüfung in s (Standard {START_FREI_S})")
    ap.add_argument("--brief", help="Filmlänge laut Brief (G1): Zahl in s (± 10 %%) oder Spanne wie 15-20 (gilt wörtlich)")
    ap.add_argument("--out")
    ap.add_argument("--sperre")
    o = ap.parse_args()

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        sys.exit("ffmpeg/ffprobe fehlen (macOS: brew install ffmpeg).")
    if not Path(o.film).is_file():
        sys.exit(f"Film nicht gefunden: {o.film}")
    alle = not any([o.bewegung, o.frames, o.fuellung, o.text, o.ton, o.beats, o.auslieferung])
    tu = {k: alle or getattr(o, k) for k in ("bewegung", "frames", "fuellung", "text", "ton", "beats", "auslieferung")}
    if o.ohne_ereignisse:
        tu["beats"] = False      # Referenz/Teil-Render: Aussagen gibt es dort nicht

    info = probe(o.film)
    if not info["bild"]:
        if any(tu[k] for k in ("bewegung", "frames", "fuellung", "text", "beats")) and not alle:
            sys.exit(f"{o.film} hat keine Bildspur: nur --ton ist möglich (z. B. Kick-Phase eines Musik-Entwurfs).")
        tu = {k: (k == "ton") for k in tu}   # Tondatei: nur die Ton-Prüfungen
    fps = info["fps"]
    ev, ev_pfad, meta = ([], None, {}) if o.ohne_ereignisse else lade_ereignisse(o.ereignisse, o.film)
    bpm = o.bpm or meta.get("bpm")
    takt0 = o.takt0 if o.takt0 is not None else float(meta.get("takt0", 0.0))
    out_dir = Path(o.out) if o.out else Path(o.film).resolve().parent / (Path(o.film).stem + "_qualitaet")
    out_dir.mkdir(parents=True, exist_ok=True)
    zeilen, roh = [], dict(film=o.film, fps=fps, dauer=info["dauer"], ereignisse=ev_pfad)

    def zeile(r, krit, ist, soll, status):
        zeilen.append(dict(r=r, kriterium=krit, ist=ist, soll=soll, status=status))

    ende_ev = [float(e["t"]) for e in ev if e["typ"] == "endkarte"]
    ausklang_ev = [float(e["t"]) for e in ev if e["typ"] == "ausklang"]
    aussagen = [e for e in ev if e.get("text") and e.get("lesbarAb") is not None]

    lock = sperre_nehmen(o.sperre)
    try:
        print(f"Film: {o.film} · {info['w']}×{info['h']} · {zahl(fps, 2)} fps · {zahl(info['dauer'], 2)} s", file=sys.stderr)
        print(f"Ereignisliste: {ev_pfad or 'keine gefunden'} ({len(ev)} Ereignisse)", file=sys.stderr)

        # ---------------- R1, R2, R3 aus der Ereignisliste
        if tu["beats"]:
            if aussagen:
                pfad, fehler = ein_blick_bogen(o.film, aussagen, out_dir, fps)
                zeile("R1 ★", "Ein Feature pro Beat",
                      (f"Ein-Blick-Bogen {pfad} ({len(aussagen)} Aussagen)" if pfad else f"Bogen fehlt: {fehler}"),
                      "je Beat ≤ 1 Aussage (≤ 6 Wörter) + ≤ 1 Stützzeile, 0 Chips/Tags", "→ prüfen")
                zu_kurz, zu_lang_text = [], []
                for e in aussagen:
                    n_w = woerter(e["text"])
                    if n_w > 6:
                        zu_lang_text.append(e)
                    if e.get("ausstiegAb") is None:
                        continue
                    soll = max(1.2, 0.4 + 0.25 * n_w)
                    ist = float(e["ausstiegAb"]) - float(e["lesbarAb"])
                    if ist + 1e-6 < soll:
                        zu_kurz.append((e, ist, soll))
                gemessen = len([e for e in aussagen if e.get("ausstiegAb") is not None])
                txt = f"{gemessen - len(zu_kurz)} von {gemessen} lang genug"
                if zu_kurz:
                    txt += "; zu kurz: " + "; ".join(
                        f"„{e['text']}“ {zahl(i, 2)} statt {zahl(s, 2)} s" for e, i, s in zu_kurz[:4])
                    if len(zu_kurz) > 4:
                        txt += f" (+{len(zu_kurz) - 4})"
                zeile("R2 ★", "Lesezeit", txt, "≥ max(1,2 s; 0,4 + 0,25 s je Wort)",
                      "✓" if gemessen and not zu_kurz else ("✗" if zu_kurz else "–"))
                if zu_lang_text:
                    zeile("R1 ★", "Aussage ≤ 6 Wörter",
                          f"{len(zu_lang_text)} länger: " + "; ".join(f"„{e['text']}“" for e in zu_lang_text[:3]),
                          "≤ 6 Wörter", "✗")
                stoer = []
                for e in aussagen:
                    if e.get("ausstiegAb") is None:
                        continue
                    a, b = float(e["lesbarAb"]), float(e["ausstiegAb"])
                    for x in ev:
                        if x["typ"] in STOER_TYPEN and a < float(x["t"]) < b:
                            stoer.append((e, x))
                zeile("R3 ★", "Lesefluss: kein Klick/Punch beim Lesen",
                      ("0 Störungen" if not stoer else f"{len(stoer)}: " + "; ".join(
                          f"{x['typ']} {zahl(float(x['t']), 2)} s in „{e['text']}“" for e, x in stoer[:3]))
                      + "; Lesezone und Überlappung per Auge",
                      "0 Ereignisse in [lesbarAb, ausstiegAb]; Text nie über UI", "✗" if stoer else "→ prüfen")
            else:
                zeile("R1 ★", "Ein Feature pro Beat", "keine Aussagen mit lesbarAb in der Ereignisliste",
                      "Ein-Blick-Bogen je Aussage", "→ prüfen")
                zeile("R2 ★", "Lesezeit", "nicht messbar ohne Ereignisliste (lesbarAb, ausstiegAb)",
                      "≥ max(1,2 s; 0,4 + 0,25 s je Wort)", "–")
                zeile("R3 ★", "Lesefluss", "nicht messbar ohne Ereignisliste", "kein Klick/Punch beim Lesen", "–")
        if alle and info["bild"]:
            zeile("R4 ★", "Typo mit Material", "nur per Auge/Gemini: „Wirkt die Schrift wie Motion-Design oder wie UI-Beschriftung?“",
                  "Hit-Versalhöhe ≥ 8 % Bildhöhe, Verlauf, keine Laufweiten-Animation", "→ prüfen")
        if tu["text"]:
            try:
                import scipy.ndimage  # noqa: F401
                LT = lesetext_pruefen(o.film, info, ev, aussagen, ende_ev, out_dir)
            except ImportError:
                LT = None
            if LT is None:
                zeile("R4 ★", f"Lesetext ≥ {zahl(LESE_MIN_PX, 0)} px", "nicht gemessen: scipy fehlt (python3 -m pip install scipy)",
                      f"≥ {zahl(LESE_MIN_PX, 0)} px bei 1080 p", "–")
            else:
                roh["lesetext"] = LT
                kl = sorted(LT["klein"], key=lambda z: z["px"])
                gesehen, liste = set(), []
                for z in kl:                       # je Bildstelle nur die kleinste Zeile nennen
                    k = (round(z["y"] / 40), round(z["x"][0] / 80))
                    if k not in gesehen:
                        gesehen.add(k)
                        liste.append(z)
                dk = (f"; {len(LT['deko'])} Deko-Zeilen ausgenommen" if LT["deko"] else "") + (
                    f"; {LT['gross_teile']} Bruchstücke großer Schrift nicht gezählt" if LT.get("gross_teile") else "")
                if kl:
                    ist = (f"{len(liste)} Stellen < {zahl(LESE_MIN_PX, 0)} px: " + "; ".join(
                        f"{zahl(z['t'], 2)} s ≈ {zahl(z['px'], 0)} px (x {z['x'][0]}–{z['x'][1]}, y {z['y']}, {z['art']})"
                        for z in liste[:4]) + (f" (+{len(liste) - 4})" if len(liste) > 4 else "")
                           + dk + (f"; Bogen {LT['bogen']} (1/3 Größe = Handy-Feed)" if LT["bogen"] else ""))
                else:
                    kleinste = [f["kleinste"] for f in LT["frames"] if not math.isnan(f["kleinste"])]
                    ist = (f"0 Zeilen darunter in {LT['gemessen']} Frames (Aussagen, Endkarte, Stichproben)"
                           + (f", kleinste gemessene Zeile ≈ {zahl(min(kleinste), 0)} px" if kleinste else "") + dk)
                zeile("R4 ★", f"Lesetext ≥ {zahl(LESE_MIN_PX, 0)} px (Terminal, UI, Stütz- und CTA-Zeile)", ist,
                      f"jede Zeile, die gelesen werden soll, ≥ {zahl(LESE_MIN_PX, 0)} px bei 1080 p; kleiner nur als "
                      "deko-Ereignis mit bereich und grund (09 §2)", "✗" if kl else ("✓" if LT["gemessen"] else "–"))

        # ---------------- Bild
        F = None
        if tu["bewegung"] or tu["frames"] or tu["fuellung"]:
            cv2 = lade_cv2() if tu["bewegung"] else None
            mit_fluss = cv2 is not None
            if tu["bewegung"] and not mit_fluss:
                print("Hinweis: OpenCV fehlt, Fluss-Messung (R5, R6, Energie über Schnitt) entfällt. "
                      "Nachrüsten: den Befehl nennt scripts/setup_check.sh (Homebrew-Python: python3 -m pip install --user "
                      "--break-system-packages opencv-python-headless)", file=sys.stderr)
            print("Lese Frames …", file=sys.stderr)
            FU = None
            if tu["fuellung"]:
                F, daumen, FU = frame_merkmale(o.film, info, mit_fluss, cv2, mit_fuellung=True)
            else:
                F, daumen = frame_merkmale(o.film, info, mit_fluss, cv2)
            cuts, cut_quelle = schnitte_aus(ev, o.szenen, F[:, MAD], fps)
            roh["schnitte"] = dict(quelle=cut_quelle, zeiten=[round(c / fps, 3) for c in cuts])
            ende_frame = int(round(min(ende_ev) * fps)) if ende_ev else len(F)
            kopf = "mad,mad2,fluss_mean,fluss_p99,zoom_pct_s,schwenk_pct_s,eigen_anteil,flaeche"
            np.savetxt(out_dir / "frames.csv", F, delimiter=",", fmt="%.5f", header=kopf, comments="")

            if tu["bewegung"]:
                if mit_fluss:
                    B = bewegung_auswerten(F, cuts, fps, ende_frame, stille_bereiche(ev))
                    roh["bewegung"] = B
                    RB = None
                    if o.ref:
                        print("Lese Referenz …", file=sys.stderr)
                        rinfo = probe(o.ref)
                        RF, _ = frame_merkmale(o.ref, rinfo, True, cv2)
                        RB = bewegung_auswerten(RF, finde_schnitte(RF[:, MAD]), rinfo["fps"], len(RF))
                        roh["referenz_bewegung"] = RB
                    rf = lambda key, n=1, e="": (f" (Ref {zahl(RB[key], n)}{e})" if RB else "")
                    zeile("R5 ★", "Bild steht nie: längster Stand",
                          f"{zahl(B['laengster'], 2)} s" + rf("laengster", 2, " s") + " (ohne Endkarte und erklärte stille)",
                          f"≤ {zahl(STAND_MAX_S, 1)} s", "✓" if B["laengster"] <= STAND_MAX_S + 1e-6 else "✗")
                    zeile("R5 ★", "Stand-Anteil im Film", f"{zahl(B['stand'])} %" + rf("stand", 1, " %"),
                          f"≤ {zahl(STAND_FILM_PCT, 0)} % (p99-Fluss < 0,1 px/Frame)",
                          "✓" if B["stand"] <= STAND_FILM_PCT + 1e-6 else "✗")
                    viel = sorted([s for s in B["szenen"] if s["stand"] > 5], key=lambda s: -s["stand"])
                    zeile("R5", "Stand-Anteil je Szene (Ziel ≤ 5 %)",
                          (f"{len(viel)} von {len(B['szenen'])} Szenen > 5 %: " + ", ".join(
                              f"{zahl(s['von'], 2)}–{zahl(s['bis'], 2)} s {zahl(s['stand'], 0)} %" for s in viel[:4])
                           + (f" (+{len(viel) - 4})" if len(viel) > 4 else "")) if viel else "0 Szenen > 5 %",
                          "Hinweis: wo Szenen lange halten, Drift prüfen", "Hinweis")
                    lang = [s for s in B["szenen"] if s["dauer"] >= 1.0]
                    tot = [s for s in lang if s["drift"] < DRIFT_MIN]
                    quote = (len(lang) - len(tot)) / len(lang) * 100 if lang else 100.0
                    zeile("R6", "Kamera lebt: Drift je Einstellung",
                          f"{len(lang) - len(tot)} von {len(lang)} Einstellungen ≥ {zahl(DRIFT_MIN, 0)} %/s ({zahl(quote, 0)} %)"
                          + (("; zu ruhig: " + ", ".join(f"{zahl(s['von'], 1)}–{zahl(s['bis'], 1)} s ({zahl(s['drift'])} %/s)"
                                                          for s in tot[:4]) + (f" (+{len(tot) - 4})" if len(tot) > 4 else "")) if tot else ""),
                          f"≥ {zahl(DRIFT_QUOTE, 0)} % der Einstellungen ≥ {zahl(DRIFT_MIN, 0)} %/s (Zoom + Schwenk, Median)",
                          "✓" if quote >= DRIFT_QUOTE - 1e-6 else "✗")
                    pro_min = len(B["anfahren"]) / max(B["dauer"] / 60, 1e-6)
                    ref_af = f" (Ref {zahl(len(RB['anfahren']) / max(RB['dauer'] / 60, 1e-6))}/min)" if RB else ""
                    zeile("R6", "Anfahren aus dem Stand",
                          f"{len(B['anfahren'])}× = {zahl(pro_min)}/min"
                          + (" (" + ", ".join(zahl(t, 2) for t in B["anfahren"][:6]) + (" …" if len(B["anfahren"]) > 6 else "") + " s)" if B["anfahren"] else "")
                          + ref_af, "Hinweis: Ziel ≤ 2/min bzw. wie die Referenz", "Hinweis")
                    eu = energie_ueber_schnitte(F, cuts, fps)
                    raus = [(t, v) for t, v in eu if not (0.5 <= v <= 2.0)]
                    roh["energie_schnitte"] = eu
                    zeile("R7", "Energie über Schnitt (Fluss nach/vor)",
                          f"{len(eu) - len(raus)} von {len(eu)} im Band ({cut_quelle})"
                          + ("; raus: " + ", ".join(f"{zahl(t, 2)} s ×{zahl(v, 2)}" for t, v in raus[:5])
                             + (f" (+{len(raus) - 5})" if len(raus) > 5 else "") if raus else ""),
                          "Hinweis: Ziel 0,5 bis 2 bei Schnitten auf Bewegung", "Hinweis")
                else:
                    for r, k in (("R5 ★", "Bild steht nie"), ("R6", "Kamera lebt"), ("R7", "Energie über Schnitt")):
                        zeile(r, k, "nicht gemessen: OpenCV fehlt (Befehl: scripts/setup_check.sh)",
                              "siehe Rubrik", "–")
            if tu["frames"]:
                dups, blitze = duplikate_blitze(F, daumen, fps)
                roh["duplikate"] = [round(k / fps, 3) for k in dups]
                roh["blitze"] = [round(k / fps, 3) for k in blitze]
                txt = f"{len(dups)} Duplikate, {len(blitze)} Blitzframes"
                if dups or blitze:
                    txt += " (" + ", ".join([f"D {k} = {zahl(k / fps, 2)} s" for k in dups[:5]]
                                            + [f"B {k} = {zahl(k / fps, 2)} s" for k in blitze[:5]]) + ")"
                zeile("R7 ★", "Saubere Frames", txt, "0 und 0", "✓" if not dups and not blitze else "✗")
                zeile("R7 ★", "Übergangsarten, Unschärfe nur längs",
                      "per Auge/Gemini auf dem stummen Film: „Welche Übergänge wirken abrupt, ruckelig oder billig?“",
                      "nur die drei Übergangsarten", "→ prüfen")
            if tu["fuellung"]:
                fenster = [(float(e["t"]), float(e["ausstiegAb"]) if e.get("ausstiegAb") is not None else info["dauer"])
                           for e in aussagen]
                FB = fuellung_auswerten(FU, F[:, MAD], fps, ende_frame, stille_bereiche(ev), fenster)
                roh["fuellung"] = FB
                np.savetxt(out_dir / "fuellung.csv", FU, delimiter=",", fmt="%.2f",
                           header="zeilen_mit_inhalt_pct,leeres_band_pct,inhalt_breite_pct", comments="")
                RFB = None
                if o.ref:
                    print("Lese Referenz (Füllung) …", file=sys.stderr)
                    rinfo2 = probe(o.ref)
                    RF2, _, RFU = frame_merkmale(o.ref, rinfo2, False, None, mit_fuellung=True)
                    RFB = fuellung_auswerten(RFU, RF2[:, MAD], rinfo2["fps"], len(RFU))
                    roh["referenz_fuellung"] = RFB
                zeile("R8", f"Bildfüllung: kein leeres Band > {zahl(LEER_BAND, 0)} % länger als {zahl(LEER_DAUER_S, 1)} s",
                      (f"{len(FB['leer'])} leere Strecken: " + "; ".join(
                          f"{zahl(a, 2)}–{zahl(b, 2)} s (Band bis {zahl(m, 0)} %, Zeilen ab {zahl(z, 0)} %)" for a, b, m, z in FB["leer"][:4])
                       + (f" (+{len(FB['leer']) - 4})" if len(FB["leer"]) > 4 else "")) if FB["leer"] else
                      f"0 (Anteil leerer stehender Frames {zahl(FB['anteil_leer'])} %; ohne Endkarte, stille und Aussagen)",
                      "0 Strecken in stehenden Einstellungen (ohne Aussage-Fenster, Endkarte, stille; 09 §5)", "✗" if FB["leer"] else "✓")
                ref_z = f" (Ref {zahl(RFB['median_zeilen'], 0)} %)" if RFB else ""
                # Absolute Zielwerte aus 09 §5 gelten immer; eine bewusst leerere Referenz senkt die Untergrenze
                z_min = ZEILEN_MIN
                if RFB and not math.isnan(RFB["median_zeilen"]) and RFB["median_zeilen"] < ZEILEN_MIN:
                    z_min = RFB["median_zeilen"]
                med = FB["median_zeilen"]
                zu_leer = not math.isnan(med) and med + 1e-6 < z_min
                zu_voll = not math.isnan(med) and med > ZEILEN_MAX
                zeile("R8", f"Bildfüllung: Zeilen mit Inhalt (Median {zahl(ZEILEN_MIN, 0)} bis {zahl(ZEILEN_MAX, 0)} %)",
                      f"Median {zahl(med, 0)} %{ref_z}; {len(FB['duenn'])} Strecken < {zahl(ZEILEN_MIN, 0)} % länger als {zahl(LEER_DAUER_S, 1)} s"
                      + (": " + ", ".join(f"{zahl(a, 1)}–{zahl(b, 1)} s" for a, b, _, _ in FB["duenn"][:5]) if FB["duenn"] else "")
                      + ("; Bild zu leer: Hauptelement größer oder näher (Zoom ≥ 1,3×), Karte so hoch wie ihr Inhalt" if zu_leer else "")
                      + ("; über 65 %: Ein-Blick-Bogen auf Überladung prüfen (R1)" if zu_voll else ""),
                      f"Median ≥ {zahl(z_min, 0)} % (09 §5, auch ohne Referenz; mit leererer Referenz deren Wert); "
                      "Seite-an-Seite-Kontaktbogen bleibt Pflicht", "✗" if zu_leer else ("Hinweis" if zu_voll else "✓"))
                # Endkarte ≤ 2 Takte
                if ende_ev:
                    t_ek = min(ende_ev)
                    ende_film = min([float(e["t"]) for e in ev if e["typ"] == "ende"] or [info["dauer"]])
                    ek_bpm, ek_q = bpm, "Ereignisliste/--bpm"
                    if not ek_bpm and info["ton"]:
                        ek_bpm, ek_q = schaetze_bpm(lade_ton(o.film, SR_TON), SR_TON), "aus dem Ton geschätzt"
                    if not ek_bpm:
                        ek_bpm, ek_q = 120.0, "angenommen (keine BPM)"
                    takt = 4 * 60.0 / float(ek_bpm)
                    lang_ek = ende_film - t_ek
                    soll_ek = ENDKARTE_TAKTE * takt
                    grund = next((e.get("begruendung") for e in ev if e["typ"] == "endkarte" and e.get("begruendung")), None)
                    ok_ek = lang_ek <= soll_ek + 1.0 / fps
                    zeile("R8", f"Endkarte ≤ {ENDKARTE_TAKTE} Takte",
                          f"{zahl(lang_ek, 2)} s = {zahl(lang_ek / takt, 1)} Takte ({zahl(t_ek, 2)} bis {zahl(ende_film, 2)} s; {zahl(float(ek_bpm), 1)} BPM {ek_q})"
                          + (f"; Begründung: {grund}" if grund and not ok_ek else ""),
                          f"≤ {zahl(soll_ek, 2)} s; länger nur mit Ausklang und Begründung (Feld begruendung)",
                          "✓" if ok_ek else ("→ prüfen" if grund else "✗"))
                else:
                    zeile("R8", f"Endkarte ≤ {ENDKARTE_TAKTE} Takte", "keine endkarte in der Ereignisliste",
                          "Ereignis endkarte eintragen", "–")
                # Bildwelten: nicht jede Szene eine Karte auf leerem Grund (Beweistest C: 8 von 11 Szenen)
                BW = bildwelt_szenen(ev, info["dauer"])
                roh["bildwelten"] = BW
                soll_bw = ("≤ 1/3 der Szenen „Kachel auf leerem Grund“; Foto-, Menschen- und Geräte-Szenen des Vorbilds mit "
                           "echter Ersatz-Bildwelt (Fenster, Handy, Produktfoto, Website-Bild, Live-Daten; 09 §5)")
                if BW:
                    kachel = [b for b in BW if b["art"].startswith("kachel") and not b["wie_vorbild"]]
                    arten = {}
                    for b in BW:
                        arten[b["art"]] = arten.get(b["art"], 0) + 1
                    zu_viel = len(kachel) > BILDWELT_KACHEL_MAX * len(BW) + 1e-9
                    zeile("R8", "Bildwelten: nicht nur Kacheln",
                          f"{len(kachel)} von {len(BW)} Szenen Kachel auf leerem Grund; "
                          + ", ".join(f"{a} {n}" for a, n in sorted(arten.items(), key=lambda x: -x[1]))
                          + (": " + ", ".join(f"{zahl(b['von'], 1)}–{zahl(b['bis'], 1)} s" for b in kachel[:5]) if zu_viel else ""),
                          soll_bw, "✗" if zu_viel else "✓")
                else:
                    zeile("R8", "Bildwelten: nicht nur Kacheln",
                          "keine bildwelt-Ereignisse; per Auge am Kontaktbogen: Wie viele Szenen sind eine Karte auf leerem Grund?",
                          soll_bw + "; je Szene ein Ereignis bildwelt mit art", "→ prüfen")
                FV = farbvielfalt_je_sekunde(o.film, info)
                reich = sum(1 for x in FV if x >= BILDWELT_REICH_FARBEN)
                ref_txt, arm = "", False
                if o.ref:
                    RV = farbvielfalt_je_sekunde(o.ref, probe(o.ref))
                    r_reich = sum(1 for x in RV if x >= BILDWELT_REICH_FARBEN)
                    ref_txt = f"; Vorbild {r_reich} von {len(RV)} s"
                    arm = r_reich >= 3 and reich * 3 < r_reich
                    roh["referenz_farbvielfalt"] = RV
                roh["farbvielfalt"] = FV
                zeile("R8", "Bildwelt reich (Foto, Gerät, echte Daten)",
                      f"{reich} von {len(FV)} s mit ≥ {BILDWELT_REICH_FARBEN} Farbstufen{ref_txt}"
                      + ("; deutlich ärmer als das Vorbild: Foto-/Geräte-Szenen des Vorbilds brauchen eine echte Ersatz-Bildwelt" if arm else ""),
                      "Hinweis, kein Abnahmekriterium (misst Farbvielfalt, nicht Wirkung)", "Hinweis")
        if alle and info["bild"]:
            zeile("R8", "Keine Platzhalter", "per Auge/Gemini: „Wirkt irgendetwas unfertig, leer oder wie ein Platzhalter?“",
                  "kein Lade-/Leerzustand > 0,4 s, keine Skelettzeilen", "→ prüfen")

        # ---------------- Ton
        if tu["ton"]:
            if not info["ton"]:
                zeile("R9 ★", "Musik ohne Loch und Schleife", "Film hat keine Tonspur", "siehe Rubrik", "✗")
            else:
                print("Lese Ton …", file=sys.stderr)
                x = lade_ton(o.film, SR_TON)
                db = rms_fenster(x, SR_TON)
                ausnahmen = stille_bereiche(ev)
                laut = np.where(db >= -35)[0]
                auto_tail = (laut[-1] + 1) * 0.1 if len(laut) else 0.0
                tail = min(ausklang_ev) if ausklang_ev else auto_tail
                roh["ton"] = dict(ausklang_ab=tail, ausklang_quelle="Ereignisliste" if ausklang_ev else "automatisch")
                _, l40 = loecher(db, o.start_frei, tail, -40, ausnahmen)
                zeile("R9 ★", "Kein Loch: 100-ms-Fenster < −40 dBFS",
                      (f"{len(l40)} Strecken: " + ", ".join(f"{zahl(a, 1)}–{zahl(b, 1)} s" for a, b in l40[:5])) if l40 else "0",
                      f"0 von {zahl(o.start_frei, 1)} s bis Ausklang {zahl(tail, 1)} s (außer stille)", "✓" if not l40 else "✗")
                ds = digitale_stille(x, SR_TON, tail, ausnahmen)
                zeile("R9 ★", "Keine digitale Stille",
                      (f"{len(ds)}× ab " + ", ".join(f"{zahl(a, 2)} s ({zahl(d * 1000, 0)} ms)" for a, d in ds[:4])) if ds else "0",
                      "0 Strecken ≥ 20 ms vor dem Ausklang", "✓" if not ds else "✗")
                wk = mix_wiederkehr(x, SR_TON)
                roh["wiederkehr"] = wk
                ref_wk = ""
                if o.ref and probe(o.ref)["ton"]:
                    rwk = mix_wiederkehr(lade_ton(o.ref, SR_TON), SR_TON)
                    if rwk:
                        ref_wk = f" (Ref min {zahl(min(v for _, v, _ in rwk))} dB)"
                if wk:
                    tief = [w for w in wk if w[1] < WIEDERKEHR_MIN_DB]
                    m = min(wk, key=lambda w: w[1])
                    zeile("R9 ★", "Mix-Wiederkehr (2-s-Fenster)",
                          f"min {zahl(m[1])} dB bei {zahl(m[0], 1)} s (ähnelt {zahl(m[2], 1)} s); {len(tief)} Fenster < {zahl(WIEDERKEHR_MIN_DB, 1)}" + ref_wk,
                          f"überall ≥ {zahl(WIEDERKEHR_MIN_DB, 1)} dB", "✓" if not tief else "✗")
                quelle = "Musik-Spur" if o.musik else "Mix"
                xs = lade_ton(o.musik, 11025) if o.musik else lade_ton(o.film, 11025)
                kp_bpm = bpm or schaetze_bpm(x, SR_TON)
                kp = kick.kick_phase(lade_ton(o.musik, SR_TON) if o.musik else x, SR_TON, kp_bpm, takt0)   # ganze Datei wie musik_schnitt.py
                roh["bpm"] = dict(wert=kp_bpm, quelle="angegeben" if bpm else "geschätzt")
                st = schleifen(xs, 11025, bpm or kp_bpm)
                roh["schleifen"] = st
                zu_lang = [s for s in st if s["laenge_takte"] > SCHLEIFE_TAKTE + 1e-6 and s["r"] > SCHLEIFE_R]
                aehnlich = [s for s in st if s["laenge_takte"] > SCHLEIFE_TAKTE + 1e-6 and s["r"] <= SCHLEIFE_R]
                zeile("R9 ★", f"Keine Schleife ({quelle})",
                      (f"{len(zu_lang)} wörtliche Wiederholungen: " + "; ".join(
                          f"{zahl(s['von'], 2)}–{zahl(s['bis'], 2)} s = Kopie von {zahl(s['von'] - s['lag'], 2)} s (r {zahl(s['r'], 3)}, {zahl(s['laenge_takte'], 1)} Takte)"
                          for s in zu_lang[:3])) if zu_lang else
                      f"0 (Groove-Ähnlichkeit im Take: {len(aehnlich)} Strecken, max r {zahl(max([s['r'] for s in aehnlich] or [0]), 3)})",
                      f"keine Strecke > {zahl(SCHLEIFE_TAKTE, 1)} Takte mit r > {zahl(SCHLEIFE_R, 2)} innerhalb 30 s", "✓" if not zu_lang else "✗")
                roh["kick_phase"] = kp
                if kp:
                    kz = kick.zusammenfassung(kp)
                    roh["kick_urteil"] = kz
                    bezug = f"Takt-Eins {zahl(takt0, 2)} s" + ("" if bpm else ", BPM geschätzt: --bpm/--takt0 angeben")
                    zeile("R9", f"Kick-Phase < 150 Hz je 4 Takte ({'Musik-Spur' if o.musik else 'Mix'}, scripts/ton/kick.py)",
                          re.sub(r"(\d)\.(\d)", r"\1,\2", kz["text"]) + f"; {zahl(kp_bpm, 2)} BPM, Bezug {bezug}",
                          "Hinweis: korrigieren nur bei „halber Schlag daneben“; unklar oder zweideutig entscheidet der Hörtest an der Naht",
                          "Hinweis")
                else:
                    zeile("R9", "Kick-Phase < 150 Hz", "kein Abschnitt messbar", "Hinweis", "Hinweis")
                e0 = max(o.start_frei, tail - ENDE_FENSTER_S)
                _, l35 = loecher(db, e0, tail, -35, ausnahmen)
                zeile("R10 ★", "Natürliches Ende: kein Fenster < −35 dBFS vor dem Ausklang",
                      (f"{len(l35)} Strecken: " + ", ".join(f"{zahl(a, 1)}–{zahl(b, 1)} s" for a, b in l35[:5])) if l35 else
                      f"0 ({zahl(e0, 1)} bis {zahl(tail, 1)} s, Ausklang {roh['ton']['ausklang_quelle']})",
                      f"0 in den letzten {zahl(ENDE_FENSTER_S, 0)} s vor dem Ausklang", "✓" if not l35 else "✗")
                zeile("R10 ★", "Natürlicher Schluss (Hörtest)", "Hörtest letzte 18 s: „natürlicher Schluss?“",
                      "ja, kein Abriss/angeklebt/Loch", "→ prüfen")
        if alle and info["bild"]:
            zeile("R11", "Ton sitzt auf dem Bild", "Effekte gegen Ereignisliste (± 2 Frames) und Hörtest",
                  "jeder Effekt an einem Ereignis, nie dasselbe Sample zweimal hintereinander", "→ prüfen")

        # ---------------- Auslieferung
        if tu["auslieferung"]:
            if info["ton"]:
                lufs, tp = ebur128(o.film)
                zeile("R12", "Lautheit", f"{zahl(lufs)} LUFS" if lufs is not None else "–", "−14 ± 1 LUFS",
                      "✓" if lufs is not None and abs(lufs + 14) <= 1 else "✗")
                zeile("R12", "True Peak", f"{zahl(tp)} dBTP" if tp is not None else "–", "≤ −1 dBTP",
                      "✓" if tp is not None and tp <= -1 else "✗")
            mb = info["groesse"] / 1e6
            reihe = atom_reihenfolge(o.film)
            fs_ok = "moov" in reihe and "mdat" in reihe and reihe.index("moov") < reihe.index("mdat")
            zeile("R12", "Größe und faststart", f"{zahl(mb)} MB, faststart {'ja' if fs_ok else 'nein'}",
                  "< 30 MB, moov vor mdat", "✓" if mb < 30 and fs_ok else "✗")
            zeile("R12", "Genau eine Aufforderung je Fassung", "Endkarte und CTA-Band ansehen", "1", "→ prüfen")
            brief = brief_spanne(o.brief if o.brief else meta.get("briefLaenge"))
            d = info["dauer"]
            if brief and brief[2]:
                a, b, _ = brief
                if a - 1e-6 <= d <= b + 1e-6:
                    ist, ok = f"{zahl(d, 1)} s in der Spanne {zahl(a, 1)} bis {zahl(b, 1)} s", True
                else:
                    g = a if d < a else b
                    abw = (d - g) / g * 100
                    ist, ok = f"{zahl(d, 1)} s außerhalb {zahl(a, 1)} bis {zahl(b, 1)} s ({'+' if abw >= 0 else ''}{zahl(abw, 0)} % zur Grenze {zahl(g, 1)} s)", False
                zeile("R12", "Länge gegen Brief (G1)", ist, "innerhalb der Spanne aus dem Brief (mehr nur mit Freigabe im Manifest)",
                      "✓" if ok else "✗")
            elif brief:
                ziel = brief[0]
                abw = (d - ziel) / ziel * 100
                zeile("R12", "Länge gegen Brief (G1)", f"{zahl(d, 1)} s gegen {zahl(ziel, 1)} s ({'+' if abw >= 0 else ''}{zahl(abw, 0)} %)",
                      f"± {zahl(LAENGE_TOL, 0)} % (mehr nur mit Freigabe im Manifest); nannte der Brief eine Spanne, sie angeben (--brief 15-20)",
                      "✓" if abs(abw) <= LAENGE_TOL + 1e-6 else "✗")
            else:
                zeile("R12", "Länge gegen Brief (G1)", f"{zahl(d, 1)} s; Brief-Länge fehlt (--brief <s> oder <von>-<bis>, oder briefLaenge in ereignisse.json)",
                      f"± {zahl(LAENGE_TOL, 0)} % bzw. Spanne", "→ prüfen")
    finally:
        if lock:
            os.rmdir(lock)

    # ---------------- Ausgabe
    for z in zeilen:   # Ein ★-Kriterium, das nicht gemessen wurde, zählt wie rot (references/07-qa.md)
        if "★" in z["r"] and z["status"] == "–":
            z["status"] = "✗"
            z["ist"] += " (★ nicht gemessen zählt wie rot)"
    zeilen.sort(key=lambda z: int(re.sub(r"\D", "", z["r"]) or 0))
    tabelle = ["| # | Kriterium | Ist | Soll | ✓/✗ |", "|---|---|---|---|---|"]
    for z in zeilen:
        tabelle.append(f"| {z['r']} | {z['kriterium']} | {z['ist']} | {z['soll']} | {z['status']} |")
    zaehler = {s: sum(1 for z in zeilen if z["status"] == s) for s in ("✓", "✗", "→ prüfen", "–", "Hinweis")}
    fuss = (f"\n{zaehler['✓']} ✓ · {zaehler['✗']} ✗ · {zaehler['→ prüfen']} → prüfen · {zaehler['Hinweis']} Hinweis · "
            f"{zaehler['–']} nicht gemessen")
    md = [f"# Qualitätsmessung `{Path(o.film).name}`", "",
          f"{info['w']}×{info['h']} · {zahl(fps, 2)} fps · {zahl(info['dauer'], 2)} s · Ereignisliste: {ev_pfad or 'keine'}",
          ""] + tabelle + [fuss]
    if roh.get("bewegung"):
        md += ["", "## Szenen", "", "| von–bis | Dauer | Stand % | längster Stand | Drift %/s | Fluss |", "|---|---|---|---|---|---|"]
        for s in roh["bewegung"]["szenen"]:
            md.append(f"| {zahl(s['von'], 2)}–{zahl(s['bis'], 2)} | {zahl(s['dauer'], 2)} s | {zahl(s['stand'])} | "
                      f"{zahl(s['laengster'], 2)} s | {zahl(s['drift'])} | {zahl(s['fluss'], 3)} |")
    (out_dir / "qualitaet.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    (out_dir / "qualitaet.json").write_text(json.dumps(dict(zeilen=zeilen, roh=roh), ensure_ascii=False, indent=1,
                                                       default=float), encoding="utf-8")
    print("\n".join(tabelle) + fuss)
    print(f"\nBericht: {out_dir / 'qualitaet.md'}", file=sys.stderr)


if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")
    main()
