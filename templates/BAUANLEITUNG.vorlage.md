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
- Slot-Starts liegen 0,5 ms vor dem Schnitt-Frame (Schnitt-Frame / fps − 0,0005), damit der Frame sicher im neuen Block landet. Der Schnitt-Frame selbst ist immer ein ganzer Frame; nie Slot-Starts aus Summen oder Zugaben rechnen. Die Slot-Längen in `index.html` sind fest; der Block füllt sein ganzes Fenster.
- Spec: `../analyse/shot-spec-p{1,2,3}.md`. Inhalt: `../BLUEPRINT.md` (alle Revisionen gelten). Entscheidungen: `../MANIFEST.md`, `<BRIEF.md>`. Pflichtwerte: `<skill-dir>/references/09-qualitaets-dna.md`.

## Konventionen

- **Referenz-Pixel:** Alle Maße in Pixeln des <B×H>-Referenzbilds, wie in der Spec. Inhalt kommt in `<div class="<px>-stage">`; die Stage skaliert mit 1920/<B> auf 1920×1080. Prozentwerte der Spec × <B> bzw. × <H>.
- **Zeit:** Im Block läuft ein Treiber über die lokale Zeit. Daraus wird mit `<LIB>.globalTime(lokal, START)` die globale Filmzeit. Gerundet wird erst am Ende auf den Frame eines Ereignisses, nie vor einer Zeitumrechnung. Alle Zeiten in Spec und Messungen sind global. `START` ist der `data-start` des Slots.
- **Aufbau eines Blocks:** Szenen als `<section class="clip <px>-scene" data-start=… data-duration=…>` (lokale Zeit) für harte Schnitte, innen eine Stage, darin eine Kamera-Ebene. Den Zustand nur aus der Zeit berechnen (`render(t)`), kein `Math.random`, keine Uhr, keine Netzzugriffe. Die Sichtbarkeit einer Szene steuert genau eine Stelle: entweder `data-start` der Section oder `render()`, nie beide. Die Timeline erst nach dem Aufbau registrieren (`window.__timelines["blockN"]`).
- **Benennung:** Alle ids mit Präfix `bN-` (z. B. `b1-s07-cam`), auch Filter. Die Block-Wurzel heißt `id="blockN"` und `data-composition-id="blockN"`. Szenennummern wie in der Spec.
- **Bibliothek** (in `index.html` geladen, global verfügbar; Startpunkt `<skill-dir>/templates/lib/`, vom Hauptlauf nach der Probe gefüllt). Pflicht für jeden Block: Easings, Kurven, Unschärfe-Faktoren, Typo-Stufen, Reveal/Ausstieg und Raster nur aus der Bibliothek, nie eigene im Block:
  - `lib/tokens.css`: Farben, Radien, Schatten als CSS-Variablen und die Basisklassen (<Liste>). Marke aus `lib/marke.css` (erzeugt aus `../produkt/marke.json` mit `scripts/marke-tokens.mjs`, nie von Hand ändern). Schriften: <Schrift + Schnitte>, eingebunden über `index.html`.
  - `lib/components.js` (`window.<LIB>`): Mathe (`clamp`, `lerp`, Easings, `seg`, `mix`, `globalTime`), SVG-Symbole (<Liste>), Markup-Bausteine (<Liste>), Bewegung (`typewriter`, `sweep`, `shimmer`, `riseIn` …).
  - `lib/camera.js` (`window.<LIB>Cam`): Einstieg + Drift + Beschleunigung in den Schnitt, Punch-Stufen, Abklingen nach dem Schnitt, Motion Blur aus der Geschwindigkeit.
  - Typo-Stufen H, Z, S, L, UI und Verläufe (`lib/tokens.css`), ein Reveal und ein Ausstieg für alle Aussagen: <Funktionsnamen>.
  - Taktraster (<BPM> BPM, Anker Filmzeit 0): <Funktionsnamen>; Klicks, Pops und harte Schnitte liegen auf 1/16 ± 1,5 Frames.
  - Ereignisse: <Funktionsname> (mit der Vorlage-Bibliothek `MV.events.add`, `MV.sayEvents`, `MV.chainEvents`, `MV.events.setBeat`) meldet jedes Ereignis im Zeitplan, nie in `render()`: `klick`, `punch`, `schnitt` (mit `art`), `aussage` mit `lesbarAb`/`ausstiegAb`, `hit`, gewollte Ruhe als `stille` mit `bis`, `endkarte`, `ausklang`, `ende`. Export nach `../ereignisse.json` (Schema 1, `<skill-dir>/templates/ereignisse.vorlage.json`). Ton und Prüfskripte lesen nur daraus.
  - Gebrauchsbeispiel für alles: `compositions/block0.html`.
- **Marke:** <Schrift, Hintergrund, Textfarbe, Kartenstil, Buttons, Akzentfarbe statt der Referenzfarbe, was aus der Referenz bewusst wegfällt, welches Icon den Avatar ersetzt>.
- **Assets:** nur aus `film/assets/` mit root-relativem Pfad (`assets/…`, nie `../`). Vorhanden: <Liste>. Freigegebene Bilder aus `../bilder/` vor dem Einbau auf ca. 1600 px verkleinert als JPG nach `assets/` kopieren, Name behalten.
- **Keine Generierung** über Bild- oder Video-APIs (nur der Hauptlauf generiert, nach Go). Fehlt ein Bild: Platzhalter als HTML/SVG bauen und im Bericht melden.
- **Keine echten Kundendaten**, außer sie sind im Manifest freigegeben. Demo-Marke: <Name>.
- **Sprache:** <Deutsch mit korrekten Umlauten (ä ö ü ß) / Englisch> in allen Filmtexten.
- **Ein Feature pro Beat:** eine Aussage ≤ 6 Wörter + höchstens eine Stützzeile; keine Chips, Tags, Infokarten, Zweitbeschriftungen. Die UI zeigt nur, was die Aussage beweist.
- **Lesefluss:** Lesezeit max(1,2 s; 0,4 s + 0,25 s je Wort) ab „letztes Wort voll da“, als Haltezeit mit laufender Kamera (Zoom 2 bis 4 %/s über Grafik, 3 bis 10 %/s ohne Grafik). Keine Zeitlupe, keine Zeitverzerrung. Lesezone: <Position>; Aussage nie über UI; kein Klick, Punch-in oder neues Element in der Lesezone, solange gelesen wird.
- **Übergänge:** nur Schnitt auf Bewegung gleicher Richtung, echter Match-Cut, Whip mit Inhalt im ersten Frame. Keine Unschärfe-Überblendung, keine Doppelbelichtung.
- **Keine Platzhalter:** kein Lade-/Leerzustand > 0,4 s, keine „+N“, keine unbeschrifteten Icons; jede Grafik mit echten Daten.

<!-- Warum Bibliothek-Pflicht, Lesefluss, Übergänge, Zeitbasis: In einem echten Lauf baute jeder Block-Agent eigene Kurven, setzte Zweittexte, streckte Lesezeit per Zeitlupe und rechnete Slot-Starts aus Zeitzugaben; Folge waren Standbilder, Duplikat- und Blitzframes und „nicht mehr smooth“. -->

## RENDER-SPERRE (Pflicht für jeden Render und jedes ffmpeg)

```bash
bash <skill-dir>/scripts/sperre.sh <lauf-name> -- <render- oder ffmpeg-Befehl>
```

- Die Sperre liegt unter `/tmp/<lauf-name>-render.lock`; `sperre.sh` wartet max. 10 min, setzt `nice -n 10` selbst (davor nie ein zweites `nice`, `hyperframes render` bricht sonst mit EACCES ab) und gibt die Sperre auch bei Fehlern frei. HyperFrames immer über `bash <skill-dir>/scripts/hf.sh …` (gepinnte Version), nie `npx hyperframes` ohne Version. Aufruf immer wie oben mit `bash` (nicht per `source`). Hängt ein Befehl, nur die eigene PID beenden (`kill <pid>`), nie `pkill`/`killall` mit Mustern; temporäre Dateien nur im Lauf-Ordner. `vergleich.py` und `bewegung.py` nehmen sie mit `--sperre <lauf-name>` selbst.
- Render immer mit `--workers 2`. Keine parallelen Medienjobs. Vorher `pgrep -fl "ffmpeg|chrome-headless|aerender"`. Eine dauerhaft laufende Vorschau aus einer anderen Sitzung ist kein Render.
- Nie den ganzen Film rendern, nur den eigenen Block.

## Teil-Render (nur das Zeitfenster eines Blocks)

```bash
bash <skill-dir>/scripts/render-block.sh <lauf-name> <N> renders/block<N>-r<Runde>.mp4
```

Das Skript legt die Fensterdatei erst nach der Sperre an, rendert mit `--workers 2` über `hf.sh` (die Sperre setzt `nice`) und löscht sie danach. Was es tut (nur zum Verständnis, nicht von Hand nachbauen):

1. Erst die Sperre holen, dann eine Fensterdatei `_fenster-blockN.html` anlegen: Kopie von `index.html`, die nur Slot N enthält, dessen `data-start` auf 0 gesetzt ist, Wurzel-Dauer = `data-duration` des Blocks.
2. Rendern: `bash <skill-dir>/scripts/hf.sh render -c _fenster-blockN.html -o renders/blockN-r<Runde>.mp4 --workers 2 --quiet`.
3. Fensterdatei löschen, Sperre freigeben. Frame 0 des Teil-Renders entspricht dem ersten Frame des Blocks im Film.

<!-- Warum: Das Teil-Render-Skript war im echten Lauf das gemeinsame Werkzeug aller Block-Agenten; als bloßer Tipp baute sich jeder Agent einen eigenen Weg. -->

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
bash <skill-dir>/scripts/hf.sh lint
npm run check          # muss grün sein (0 Fehler)
grep -l data-hf-id index.html compositions/*.html lib/*   # muss leer sein
python3 <skill-dir>/scripts/qualitaet.py renders/block<N>-r<K>.mp4 --frames --bewegung --fuellung --text --ohne-ereignisse --sperre <lauf-name>
# 0 Duplikat- und Blitzframes, Stand und Drift gegen 09-qualitaets-dna.md, keine stehende Einstellung mit leerem Band
# > 45 % länger als 0,5 s (Teil-Render: Zeit ≠ Filmzeit, daher ohne Ereignisliste; Aussagen dort per Auge ausnehmen)
# Lesetext ≥ 32 px (lesetext-bogen.jpg in 1/3 Größe ansehen; ohne Ereignisliste erscheint auch Deko, im Gesamtfilm als deko-Ereignis)
```

- Ereignisse des Blocks in `../ereignisse.json` vorhanden; je Aussage `ausstiegAb − lesbarAb` ≥ Lesezeit-Soll.

Bericht je Block: Pfad des Teil-Renders, Vergleichsordner, Schnitt-Abweichung in Frames, Pflichtwerte (Stand, Drift, Frames), Lesezeit je Aussage Soll/Ist, verbleibende Abweichungen, Kandidaten für `lib/`.
