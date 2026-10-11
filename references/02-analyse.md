# Analyse (Bild + Ton)

Ziel: eine Spezifikation, nach der man den Film Frame für Frame nachbauen kann, plus eine Ton-Karte.

## 1. Material holen
```bash
bash <skill-dir>/scripts/hole-referenz.sh "<video-url oder datei>" motion-runs/<datum>_<slug>
```
- Legt `analyse/referenz.mp4`, `analyse/frames/f_0001.jpg …` (3 fps: je Drittelsekunde das erste Original-Frame), `analyse/frames/zeiten.csv` (`datei,zeit_s,frame`: exakte Zeit und Frame-Index der Referenz je Bild) und `analyse/audio.wav` an und gibt Auflösung, fps, Dauer und Ton ja/nein aus. **Zeiten nur aus `zeiten.csv`**, nie aus der Bildnummer rechnen.

<!-- Warum zeiten.csv: Die frühere Formel „Zeit = (N-1)/3“ stimmte bei 24-fps-Referenzen nicht (der fps-Filter zog Frames 0,125 s später); Analyse-Agenten rechneten mit falschen Zeiten, der Hauptlauf musste nachmessen und Korrekturen nachsenden (Praxistest). -->
- yt-dlp läuft **erzwungen anonym** (keine Cookies, kein Browser-Login). Meldet das Skript „login-pflichtig“, nicht umgehen: der Nutzer lädt das Video selbst herunter und gibt die Datei an.
- Optional Grob-Orientierung: `node <skill-dir>/scripts/video-verstehen.mjs analyse/referenz.mp4 analyse/grob-beats.md`. **Grob-Beats sind oft falsch** (in einem echten Lauf war „UI füllt sich“ in Wahrheit zwei neue Szenen). Nie allein darauf bauen.

## 2. Messen
Was `hole-referenz.sh` schon macht, sieht von Hand so aus (zum Nachziehen einzelner Übergänge mit höherer fps):
```bash
L=motion-runs/<lauf>/analyse
ffprobe -v error -show_entries stream=width,height,r_frame_rate -show_entries format=duration -of compact $L/referenz.mp4
bash <skill-dir>/scripts/sperre.sh <lauf-name> -- ffmpeg -hide_banner -loglevel error -ss 12.0 -t 1.5 -i $L/referenz.mp4 -vf fps=30 $L/zoom/z_%04d.jpg   # Übergang mit 30 fps; jedes ffmpeg unter der Sperre (setzt nice selbst), auch Kontaktbögen
```
- Manche ffmpeg-Builds haben kein `drawtext`: Zeit aus dem Dateinamen rechnen.
- **ffmpeg `scene>0.3` übersieht Schnitte hell auf hell** (in einem echten Lauf fand es nur gut ein Drittel der Schnitte). Schnitte zusätzlich über Frame-Differenz messen (`scripts/vergleich.py` macht das) und von den Vision-Agenten bestätigen lassen.

## 3. Shot-Spec (Vision-Agenten)
- **Sparregel:** Referenz ≤ 30 s oder Regie „spar“: ein Agent für alle Frames. Länger: höchstens 2 Agenten parallel, je ~½ der Frames (Vorlage A in `templates/agent-prompts.md`). Jeder sieht **jeden** Frame seines Bereichs, aber als Kontaktbögen (höchstens 40 Bilder öffnen), darf Übergänge mit 10 bis 30 fps nachziehen, aber nur ± 3 Frames um Schnitte und Aussagen (nie ganze Strecken), und schreibt `analyse/shot-spec-pN.md`. Analyse-Agenten im Vordergrund starten oder vor dem Ende der Antwort abwarten (SKILL.md „Agenten-Einsatz“).

<!-- Warum Sparregel: Im Praxistest analysierten drei Agenten eine 25-s-Referenz mit 580 Zoom-Bildern; das kostete 8,4 $ Modell-Nutzung, bevor ein Frame gebaut war. Im Beweistest lasen drei Agenten je ca. 50 Einzelbilder einer 40-s-Referenz (5,5 $ der 6,5 $ Analyse). -->
- Inhalt je Shot: Zeitfenster (0,1 s), Übergangsart, Komposition in % der Fläche, Typografie (Klasse, Gewicht, Größe relativ zur Höhe, **Versalhöhe der Aussagen in % der Bildhöhe**, Position der Lesezone, Wörter je Aussage und wie lange sie voll lesbar steht, Text wörtlich), UI-Elemente (Radius, Schatten, Hex), Bewegung (Richtung, Distanz, Dauer, Easing, Stagger, Tipp-Tempo, Kamera-Stufen, Motion Blur), sekundäre Animationen, Code oder Footage, Schwierigkeit; am Ende Übersichtstabelle + globale Konstanten.
- Die Agenten-Berichte selbst gegenlesen: Überschriften und Übersichtstabellen reichen meist.

## 4. Ton-Analyse (immer, auch wenn Ton „später“ kommt)
```bash
node <skill-dir>/scripts/ton-referenz.mjs motion-runs/<lauf>/analyse/referenz.mp4 motion-runs/<lauf>/analyse/ton-referenz.md
```
Liefert Musik (Stil, BPM, Struktur mit Zeiten, Ende), Effekt-Palette (Typen, Beschreibung, Variation), Event-Karte, Mix, Rezept. Braucht `GEMINI_API_KEY`; die Datei wird über die Gemini Files API hochgeladen und danach wieder gelöscht. Kosten: für ein Kurzvideo im Cent-Bereich (Flash-Modell). Bei Überlast (429/503) wiederholt das Skript selbst (20, 60, 120 s) und nimmt danach `GEMINI_MODEL_FALLBACK`; keine eigene Wiederholschleife bauen. Meldet es „Tageskontingent erschöpft“, dem Nutzer genau das sagen (Free Tier: 20 Anfragen/Tag; Abrechnung aktivieren oder morgen weiter). Ergänzend messen: Energiekurve je 2 s und Tempo per Onset-Autokorrelation (numpy, siehe `06-ton.md`).

## 5. Kennzahlen der Referenz (Maßstab)
Ohne Zahlen gibt es keinen Maßstab für „smooth und hochwertig“. Die Referenz wird mit derselben Methode gemessen wie später der eigene Film:
```bash
python3 <skill-dir>/scripts/qualitaet.py motion-runs/<lauf>/analyse/referenz.mp4 --bewegung --frames --fuellung --ton --ohne-ereignisse --sperre <lauf-name>
```
Ohne OpenCV fehlen Stand und Drift der Referenz (R5, R6): dann dem Nutzer den Befehl aus `scripts/setup_check.sh` zeigen (Homebrew-Python: `python3 -m pip install --user --break-system-packages opencv-python-headless`, siehe `SETUP.md` „Python-Pakete“), nicht ohne Bewegungs-Maßstab weiterbauen.
Ins Manifest (Abschnitt „Maßstab“): Stand-Anteil und längster Stand, Kamera-Drift je Einstellung (%/s), Einstellungslänge (Mittel, Spanne), Ereignisdichte (Ereignisse/s), Versalhöhe der Aussagen (% der Bildhöhe), Lesedauer je Aussage, BPM und Takt-Anker. Diese Werte ersetzen die Standardwerte aus `references/09-qualitaets-dna.md` dort, wo die Referenz anders ist.
- **Taktraster:** Das BPM aus der Ton-Analyse (mit der Onset-Messung aus `06-ton.md` abgeglichen) wird das Raster des Films. Klicks, Pops und harte Schnitte liegen später darauf, und der Musik-Prompt nutzt dasselbe BPM. **Bringt der Nutzer Musik mit, gilt deren Takt-Karte, nicht die Referenz** (`05-bau-probe-parallel.md` §2).

<!-- Warum: Im echten Lauf hatte der eigene Film 17,8 % Standbild-Anteil gegen 3,2 % in der Referenz und Aussagen mit 4,4 % Versalhöhe gegen 11 bis 12 % in der Referenz; aufgefallen ist das erst in der Diagnose nach Revision 10, weil die Referenz nie vermessen worden war. -->

## 6. Ergebnis
`analyse/` mit referenz.mp4, frames/, shot-spec-p1..N.md, ton-referenz.md, korrigierte Schnittliste und Kennzahlen der Referenz im Manifest.
