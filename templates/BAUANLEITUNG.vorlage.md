# Bauanleitung <Filmtitel> (<Anzahl> Agenten parallel)

<!-- Vorlage: alle <…> füllen, Beispielzeilen ersetzen, diesen Kommentar löschen. Liegt danach als film/BAUANLEITUNG.md im Lauf-Ordner. -->

Ziel: Mechanik der Referenz (`../analyse/referenz.mp4`, <B×H>, <fps> fps, <Dauer> s) so genau wie möglich nachbauen, Inhalt und Marke <Produkt / Marke>. Block 0 (0 bis <t1> s) ist abgenommen und ist das Vorbild für Aufbau, Messung und Qualität.

## Blöcke und Zuständigkeit

| Block | Datei | Filmzeit | Slot `data-start` | Slot `data-duration` | Spec | Blueprint-Szenen |
|---|---|---|---|---|---|---|
| 0 | `compositions/block0.html` | 0,000 bis <t1> | 0 | <d0> | p1 S01 bis S0x | 1 bis x (fertig) |
| 1 | `compositions/block1.html` | <t1> bis <t2> | <t1 − 0,0005> | <d1> | p1 S0x bis S1x | x bis y |
| 2 | `compositions/block2.html` | <t2> bis <t3> | <t2 − 0,0005> | <d2> | p2 | … |
| … | | | | | | |

- Jeder Agent ändert **nur seine eigene `blockN.html`** und legt neue Dateien nur mit Präfix `bN` an (`assets/bN_…`, `tools/bN_…`). `index.html`, `lib/`, `tools/` und andere Blöcke nicht anfassen. Fehlt etwas in `lib/`, dann im eigenen Block bauen und im Bericht als Kandidat für `lib/` nennen.
- Slot-Starts liegen 0,5 ms vor dem Schnitt-Frame, damit der Frame sicher im neuen Block landet. Die Slot-Längen in `index.html` sind fest; der Block füllt sein ganzes Fenster.
- Spec: `../analyse/shot-spec-p{1,2,3}.md`. Inhalt: `../BLUEPRINT.md` (alle Revisionen gelten). Entscheidungen: `../MANIFEST.md`, `<BRIEF.md>`.

## Konventionen

- **Referenz-Pixel:** Alle Maße in Pixeln des <B×H>-Referenzbilds, wie in der Spec. Inhalt kommt in `<div class="<px>-stage">`; die Stage skaliert mit 1920/<B> auf 1920×1080. Prozentwerte der Spec × <B> bzw. × <H>.
- **Zeit:** Im Block läuft ein Treiber über die lokale Zeit. Daraus wird mit `<LIB>.globalTime(lokal, START)` die globale Filmzeit (auf Frames gerundet). Alle Zeiten in Spec und Messungen sind global. `START` ist der `data-start` des Slots.
- **Aufbau eines Blocks:** Szenen als `<section class="clip <px>-scene" data-start=… data-duration=…>` (lokale Zeit) für harte Schnitte, innen eine Stage, darin eine Kamera-Ebene. Den Zustand nur aus der Zeit berechnen (`render(t)`), kein `Math.random`, keine Uhr, keine Netzzugriffe. Die Timeline erst nach dem Aufbau registrieren (`window.__timelines["blockN"]`).
- **Benennung:** Alle ids mit Präfix `bN-` (z. B. `b1-s07-cam`), auch Filter. Die Block-Wurzel heißt `id="blockN"` und `data-composition-id="blockN"`. Szenennummern wie in der Spec.
- **Bibliothek** (in `index.html` geladen, global verfügbar):
  - `lib/tokens.css`: Farben, Radien, Schatten als CSS-Variablen und die Basisklassen (<Liste>). Schriften: <Schrift + Schnitte>, eingebunden über `index.html`.
  - `lib/components.js` (`window.<LIB>`): Mathe (`clamp`, `lerp`, Easings, `seg`, `mix`, `globalTime`), SVG-Symbole (<Liste>), Markup-Bausteine (<Liste>), Bewegung (`typewriter`, `sweep`, `shimmer`, `riseIn` …).
  - `lib/camera.js` (`window.<LIB>Cam`): Einstieg + Drift + Beschleunigung in den Schnitt, Punch-Stufen, Abklingen nach dem Schnitt, Motion Blur aus der Geschwindigkeit.
  - Gebrauchsbeispiel für alles: `compositions/block0.html`.
- **Marke:** <Schrift, Hintergrund, Textfarbe, Kartenstil, Buttons, Akzentfarbe statt der Referenzfarbe, was aus der Referenz bewusst wegfällt, welches Icon den Avatar ersetzt>.
- **Assets:** nur aus `film/assets/` mit root-relativem Pfad (`assets/…`, nie `../`). Vorhanden: <Liste>. Freigegebene Bilder aus `../bilder/` vor dem Einbau auf ca. 1600 px verkleinert als JPG nach `assets/` kopieren, Name behalten.
- **Keine Generierung** über Bild- oder Video-APIs (nur der Hauptlauf generiert, nach Go). Fehlt ein Bild: Platzhalter als HTML/SVG bauen und im Bericht melden.
- **Keine echten Kundendaten**, außer sie sind im Manifest freigegeben. Demo-Marke: <Name>.
- **Sprache:** <Deutsch mit korrekten Umlauten (ä ö ü ß) / Englisch> in allen Filmtexten.

## RENDER-SPERRE (Pflicht für jeden Render und jedes ffmpeg)

```bash
bash <skill-dir>/scripts/sperre.sh <lauf-name> -- <render- oder ffmpeg-Befehl>
```

- Die Sperre liegt unter `/tmp/<lauf-name>-render.lock`; `sperre.sh` wartet max. 10 min, läuft mit `nice` und gibt die Sperre auch bei Fehlern frei. `vergleich.py` und `bewegung.py` nehmen sie mit `--sperre <lauf-name>` selbst.
- Render immer mit `--workers 2`. Keine parallelen Medienjobs. Vorher `pgrep -fl "ffmpeg|chrome-headless|aerender"`. Eine dauerhaft laufende Vorschau aus einer anderen Sitzung ist kein Render.
- Nie den ganzen Film rendern, nur den eigenen Block.

## Teil-Render (nur das Zeitfenster eines Blocks)

1. Erst die Sperre holen, dann eine Fensterdatei `_fenster-blockN.html` anlegen: Kopie von `index.html`, die nur Slot N enthält, dessen `data-start` auf 0 gesetzt ist, Wurzel-Dauer = `data-duration` des Blocks.
2. Rendern: `npx hyperframes render -c _fenster-blockN.html -o renders/blockN-r<Runde>.mp4 --workers 2 --quiet`.
3. Fensterdatei löschen, Sperre freigeben. Frame 0 des Teil-Renders entspricht dem ersten Frame des Blocks im Film.

Tipp: Der Hauptlauf legt dafür einmal `tools/render-block.sh <N> [ausgabe]` an, das Schritte 1 bis 3 erledigt; dann nutzen alle Agenten dasselbe Skript.

## Messen und Vergleichen (je Zeitfenster)

```bash
python3 <skill-dir>/scripts/vergleich.py --ref ../analyse/referenz.mp4 --prb renders/block1-r1.mp4 \
  --start <t1> --ende <t2> --prb-start <t1> --out renders/cmp-<t1>-<t2> --sperre <lauf-name>
```

- Legt `ref/` und `prb/` an (Frames in Referenz-Auflösung, Dateiname = globaler Frame-Index `n<Frame>.jpg`), `vergleich.mp4` (links Referenz, rechts Probe), `sheets/` (Kontaktbögen alle 0,5 s) und `schnitte.txt` (Schnitte beider Seiten, Ziel ±0 Frames).
- Arbeitsweise wie bei Block 0: zuerst die Referenz Frame für Frame messen (Positionen, Kurven, Schnitt-Frames), dann bauen, dann vergleichen. Höchstens 4 Runden. Im Bericht ehrlich nennen, was abweicht (in Referenz-Pixeln oder Frames).
- Gemessen wird immer mit derselben Methode in Referenz und Probe. Für Timing nur die indizierten Frames aus `vergleich.py` verwenden.

## Prüfen vor der Übergabe

```bash
npx hyperframes lint
npm run check          # muss grün sein (0 Fehler)
grep -l data-hf-id index.html compositions/*.html lib/*   # muss leer sein
```

Bericht je Block: Pfad des Teil-Renders, Vergleichsordner, Schnitt-Abweichung in Frames, verbleibende Abweichungen, Kandidaten für `lib/`.
