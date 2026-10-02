# Analyse (Bild + Ton)

Ziel: eine Spezifikation, nach der man den Film Frame für Frame nachbauen kann, plus eine Ton-Karte.

## 1. Material holen
```bash
bash <skill-dir>/scripts/hole-referenz.sh "<video-url oder datei>" motion-runs/<datum>_<slug>
```
- Legt `analyse/referenz.mp4`, `analyse/frames/f_0001.jpg …` (3 fps, Zeit = (N-1)/3) und `analyse/audio.wav` an und gibt Auflösung, fps, Dauer und Ton ja/nein aus.
- yt-dlp läuft **erzwungen anonym** (keine Cookies, kein Browser-Login). Meldet das Skript „login-pflichtig“, nicht umgehen: der Nutzer lädt das Video selbst herunter und gibt die Datei an.
- Optional Grob-Orientierung: `node <skill-dir>/scripts/video-verstehen.mjs analyse/referenz.mp4 analyse/grob-beats.md`. **Grob-Beats sind oft falsch** (in einem echten Lauf war „UI füllt sich“ in Wahrheit zwei neue Szenen). Nie allein darauf bauen.

## 2. Messen
Was `hole-referenz.sh` schon macht, sieht von Hand so aus (zum Nachziehen einzelner Übergänge mit höherer fps):
```bash
L=motion-runs/<lauf>/analyse
ffprobe -v error -show_entries stream=width,height,r_frame_rate -show_entries format=duration -of compact $L/referenz.mp4
nice ffmpeg -hide_banner -loglevel error -ss 12.0 -t 1.5 -i $L/referenz.mp4 -vf fps=30 $L/zoom/z_%04d.jpg   # Übergang mit 30 fps
```
- Manche ffmpeg-Builds haben kein `drawtext`: Zeit aus dem Dateinamen rechnen.
- **ffmpeg `scene>0.3` übersieht Schnitte hell auf hell** (in einem echten Lauf fand es nur gut ein Drittel der Schnitte). Schnitte zusätzlich über Frame-Differenz messen (`scripts/vergleich.py` macht das) und von den Vision-Agenten bestätigen lassen.

## 3. Shot-Spec (Vision-Agenten, parallel)
- 3 Agenten, je ~⅓ der Frames (Vorlage A in `templates/agent-prompts.md`). Jeder liest **jeden** Frame seines Bereichs, darf Übergänge mit 10 bis 30 fps nachziehen, schreibt `analyse/shot-spec-pN.md`.
- Inhalt je Shot: Zeitfenster (0,1 s), Übergangsart, Komposition in % der Fläche, Typografie (Klasse, Gewicht, Größe relativ zur Höhe, Text wörtlich), UI-Elemente (Radius, Schatten, Hex), Bewegung (Richtung, Distanz, Dauer, Easing, Stagger, Tipp-Tempo, Kamera-Stufen, Motion Blur), sekundäre Animationen, Code oder Footage, Schwierigkeit; am Ende Übersichtstabelle + globale Konstanten.
- Die Agenten-Berichte selbst gegenlesen: Überschriften und Übersichtstabellen reichen meist.

## 4. Ton-Analyse (immer, auch wenn Ton „später“ kommt)
```bash
node <skill-dir>/scripts/ton-referenz.mjs motion-runs/<lauf>/analyse/referenz.mp4 motion-runs/<lauf>/analyse/ton-referenz.md
```
Liefert Musik (Stil, BPM, Struktur mit Zeiten, Ende), Effekt-Palette (Typen, Beschreibung, Variation), Event-Karte, Mix, Rezept. Braucht `GEMINI_API_KEY`; die Datei wird über die Gemini Files API hochgeladen und danach wieder gelöscht. Kosten: für ein Kurzvideo im Cent-Bereich (Flash-Modell). Ergänzend messen: Energiekurve je 2 s und Tempo per Onset-Autokorrelation (numpy, siehe `06-ton.md`).

## 5. Ergebnis
`analyse/` mit referenz.mp4, frames/, shot-spec-p1..N.md, ton-referenz.md, korrigierte Schnittliste im Manifest.
