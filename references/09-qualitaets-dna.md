# Qualitäts-DNA (Pflichtwerte für Bewegung, Typo, Übergänge)

Diese Werte machen aus einem frame-genauen Nachbau einen hochwertigen Film. Sie stammen aus einem echten Lauf, gemessen an der Szene, die der Nutzer als Maßstab gewählt hat, und sind Startwerte für jeden Film. Die Analyse misst die Referenz mit derselben Methode (`02-analyse.md` §5); wo die Referenz bewusst anders ist (z. B. ein gewollter Stillstand), gilt die Referenz, und die Abweichung steht im Manifest.

**Umsetzung:** Startpunkt ist `<skill-dir>/templates/lib/` (Bewegung, Kamera, Typo-Tokens, Taktraster, Ereignisse). Die Werte unten sind dort als Tokens hinterlegt; Blöcke benutzen nur diese Tokens und definieren keine eigenen Easings, Kurven oder Unschärfe-Faktoren. Pixelwerte gelten für 1920 × 1080 bei 30 fps; bei anderem Format über die Bildhöhe umrechnen.

<!-- Warum: Ohne geteilte Pflichtwerte baute jeder Block-Agent eigene Kurven; der Film hatte 17,8 % Standbild gegen 3,2 % in der Referenz, sechs Übergangsarten in 20 s und Aussagen mit einem Drittel der Referenz-Versalhöhe. Die Maßstab-Szene des Nutzers hatte 3,9 % Stand, Schnitt alle 0,96 s und Unschärfe ≈ 0,3 × Weg pro Frame. -->

## 1. Bewegung

| # | Größe | Pflichtwert | Messung |
|---|---|---|---|
| Q1 | Stand | längster Stand ≤ 0,4 s; Ziel je Szene und gesamt ≤ 5 %, Abnahme gesamt ≤ 12 % (Kalibrierung in `07-qa.md`); Stand = Fluss p99 < 0,1 px/Frame bei 320 × 180, Endkarte und gewollte Ruhe (`stille` in der Ereignisliste) zählen nicht | `scripts/qualitaet.py --bewegung` |
| Q2 | Kamera-Drift | jede Einstellung ≥ 2 %/s Zoom oder ≥ 3 % Bildhöhe/s Verschiebung, linear, nie auf null abbremsen; UI-Sequenzen 6 bis 13 %/s | Affin-Fit des Flusses je Einstellung |
| Q3 | Einstellungslänge UI | 0,7 bis 1,2 s, Mittel ≈ 1,0 s; Aufbau-Einstellung bis 2,7 s nur mit einem Ereignis alle ≤ 0,6 s | Schnittliste |
| Q4 | Ereignisdichte | ≥ 1 sichtbares Ereignis je 0,4 s in UI-Sequenzen; ereignislos ≤ 0,8 s, nur mit laufender Kamera | `ereignisse.json` gegen Bild |
| Q5 | Einstellungs-Hülle | Einstieg: exponentieller Settle τ 0,08 bis 0,13 s. Körper: linearer Drift. Ausstieg: Potenzkurve (Exponent 2,3 bis 3) über 0,3 bis 0,47 s auf 2 bis 8 % Bildhöhe pro Frame, Schnitt im Maximum, aus laufender Drift | Positions-Tracking je Frame |
| Q6 | Tempowechsel | ≤ ×2 je 0,15 s ohne Schnitt oder Ereignis; Anfahren aus dem Stand ≤ 2/min | Fluss p99 je Frame |
| Q7 | Unschärfe | nur bei Bewegung und nur in Bewegungsrichtung; Kantenbreite längs 0,27 bis 0,35 × Weg pro Frame, quer ≤ 2 px; Pflicht ab ca. 2 % Bildhöhe pro Frame; jeder Ausstieg in einen Schnitt verwischt (Laplace-Varianz in den letzten 4 bis 6 Frames ≤ 25 %). Faktor Elemente 0,15, Whips 0,35 (ab ca. 35 % Bildhöhe/s). CSS-`blur()` nur in Reveal und Ausstieg der Schrift, nie an bewegten Objekten | Kantenprofil x/y, Laplace |
| Q8 | Schnitt auf Bewegung | Richtung von Zoom und Verschiebung bleibt über den Schnitt gleich; Bewegungsenergie danach/davor 0,5 bis 2 | Fluss ± 3 Frames |
| Q9 | Raster | Hauptereignisse auf 1/16 ± 1,5 Frames, harte Schnitte auf der Zählzeit ± 1 Frame; Zeiten aus den Raster-Funktionen der Bibliothek, je Ereignis auf Frames gerundet, nie aus Summen von Bruchteil-Frames | `ereignisse.json` gegen Raster |
| Q10 | Frames | kein Frame gleich seinem Vorgänger, wenn davor Bewegung lief oder danach ein Schnitt kommt; kein Blitzframe (Blockanfang mitten im Block) | `scripts/qualitaet.py --frames` |
| Q11 | Haltebewegung beim Lesen | Kamera läuft in neuer Zeit weiter: Aussage über Grafik 2 bis 4 %/s Zoom, Aussage ohne Grafik 3 bis 10 %/s; erlaubt: ein Akzent-Push (+6 % in 0,2 s), Pulse über Linien, Parallaxe 0,8 bis 1,6 %/s in Ebenen; beginnt ≥ 0,3 s vor dem Halt. Keine Zeitlupe, keine Zeitverzerrung | `scripts/qualitaet.py --bewegung` im Lesefenster |
| Q12 | Kurvenherkunft | Kamera- und Elementkurven als gemessene Tabellen oder aus dem Token-Satz (§3); keine freien Easings, kein Überschwinger-Easing (`backOut`) | Code-Review |

<!-- Warum Q11: Die Zeitlupe als Lesezeit erzeugte 6,5 s Standbild in 8 Fenstern und Ruck an den Kanten; die Haltezeit mit laufender Kamera löste beides. -->

## 2. Typo-System

| Stufe | Einsatz | Größe (1080 p) | Gewicht | Laufweite | Material |
|---|---|---|---|---|---|
| **H** | Aussage ohne Grafik, Hit-Statements, Endkarten-Wortmarke | Versalhöhe wie die Referenz, mindestens 8 % der Bildhöhe (bei einer Grotesk ca. 120 px Schriftgröße); Zeilenabstand 1,02 em, ab 4 Wörtern zweizeilig ausgeglichen, max. 1600 px breit, optisch mittig | 600 oder wie die Marke | −0,035 em | Verlauf |
| **Z** | Aussage in der Lesezone über einer Grafik | ca. 70 % von H (ca. 84 px), einzeilig | 600 | −0,03 em | Verlauf |
| **S** | Stützzeile unter Z (Grundlinie ca. 56 px darunter) | 32 px (Minimum) | 400 | −0,005 em | flach, mittleres Grau |
| **L** | Labels in Grafiken | 32 px (Minimum); Zweitzeile 24 px nur als Deko | 500 / 400 | −0,01 em / 0 | flach, dunkles bzw. mittleres Grau |
| **UI** | Produkt-UI | wie das Produkt, Lesetext aber ≥ 32 px (Karte größer oder näher statt Schrift kleiner) | wie das Produkt | wie das Produkt | nie Verlauf |
| **Lesetext** | jede Zeile, die gelesen werden soll: Terminal-, Code- und UI-Zeilen, die die Aussage belegen, Stütz- und CTA-Zeile der Endkarte | **mindestens 32 px bei 1080 p** (kurze Bildseite 1080; ca. 3 % der Bildhöhe), CTA-Zeile ≥ 44 px | – | – | Kontrast ≥ 4,5 : 1 (§5) |

- **Lesetext-Minimum:** 32 px gilt für alles, was der Zuschauer lesen soll. Grund: 16:9 erscheint im Handy-Feed auf etwa ein Drittel der Größe; 30 px Terminal- und Stützzeilen waren im Praxistest im Kontaktbogen „kaum lesbar“, 36 px und 42 bis 48 px in der nächsten Fassung lesbar. **Deko-UI** (Fenstertitel, Mockup-Inhalt, Fototexte, Statuszeilen ohne Aussage) darf kleiner sein, muss dann aber als Ereignis `deko` mit `bis`, `bereich` [x0, y0, x1, y1] (Ausgabe-px) und `grund` in `ereignisse.json` stehen. Gemessen mit `scripts/qualitaet.py --text` (Textzeilen ohne OCR im Moment `lesbarAb`, in der Mitte jedes Lesefensters, auf der Endkarte und alle 2 s; Bogen in 1/3 Größe). Vor G4 selbst prüfen: jede Textzeile auf 1/3 verkleinert ansehen (`lesetext-bogen.jpg`); was dann nicht lesbar ist, ist zu klein.

- **Schnitt:** Display-Schnitt bzw. höchste optische Größe der Markenschrift (bei variablen Schriften `font-variation-settings: "opsz" <max>` für H und Z).
- **Lesezone:** Grundlinie Z bei ca. 14 % der Bildhöhe (y ≈ 150 px), Grafik-Oberkante ca. 120 px darunter (± 8), Grafik-Mitte für alle Grafiken einheitlich (± 12 px), Rand ≥ 160 px. Grafik voll im Bild oder bewusst angeschnitten als Nahaufnahme ≥ 1,9×. Die Aussage liegt nie über UI-Inhalt. Schlusspunkt hängt aus der Zentrierung (`margin-right: -0.27em`).
- **Verläufe** (senkrecht, `background-clip: text`, Text transparent; Stopps für den Wortkasten mit Zeilenhöhe 1,15; nur ab ca. 64 px; nie `text-shadow` oder Glow). Farben aus der Marke ableiten, Mechanik fest:
  ```css
  --ink-grad:    linear-gradient(180deg, <Tinte dunkel> 26%, <Tinte mittel> 67%, <Tinte hell> 109%); /* hell, z. B. #111111 / #434346 / #8A8A8F */
  --acc-grad:    linear-gradient(180deg, <Akzent dunkler> 26%, <Akzent> 67%, <Akzent heller> 109%);
  --silver-grad: linear-gradient(180deg, #FFFFFF 26%, #C9C9CE 67%, #8A8A8F 109%); /* auf Schwarz */
  ```
- **Akzent:** höchstens 2 Wörter; Teilwörter nach Bindestrich erlaubt; Satzzeichen in Tinte. Glanzlauf höchstens einmal, 0,55 s in Echtzeit, Ende ≥ 0,2 s vor dem Ausstieg (Alternative: Farbwechsel Tinte → Akzent 0,15 s nach der Landung in 0,2 s).
- **Ein Reveal für alle Aussagen:** Wortstaffel min(1/16 Takt; 0,31 s / (Wörter − 1)). Je Wort 0,5 s `cubic-bezier(.16,1,.3,1)`: Aufstieg ca. 4 % Bildhöhe, Unschärfe ca. 15 → 0 px, volle Deckung nach 40 % der Dauer. Grau → Tinte per Maske; die graue Vorstufe wird mit der inversen Maske beschnitten. Keine Laufweiten-Animation.
- **Ein Ausstieg für alle Aussagen:** 0,18 s nach oben, ca. 5,5 % Bildhöhe, Unschärfe ca. 13 px, Potenz 3, Deckung bis 0, danach erst unsichtbar. Folgt binnen ≤ 2 Frames ein Schnitt oder Whip: kein eigener Ausstieg, die Schrift geht mit dem Bild.
- **Probe-Frage in G4:** „Ist diese Aussage-Typo der Maßstab für alle?“

<!-- Warum Lesetext: Im Praxistest (Terminal-Teaser, 09.10.2026) waren Terminal-Mono 30 px, Stützzeile 30 px und die Endkarten-Zeilen 30 px im Kontaktbogen unlesbar; die Rubrik war grün, der Nutzer musste es melden. Die alte Skala erlaubte S 30 px und L 26/22 px. -->
<!-- Warum Typo-System: Aussagen in einem Text-Schnitt mit 64 px und flacher Tinte (4,4 % Versalhöhe gegen 11 bis 12 % in der Referenz) wirkten wie UI-Beschriftung; Nutzer: nur eine Szene „sieht richtig hochwertig aus“. Angenommen wurde erst das Stufen-System mit senkrechtem Schrift-Verlauf. Laufweiten-Animation und Glow wurden als billig verworfen. -->

## 3. Token-Satz (Easing)
- Einstieg (Pop): 0,23 s, Verlauf 11 / 54 / 77 / 88 / 95 / 98 / 100 % (je Frame), Start-Unschärfe 6 → 0, kein Überschwinger.
- Linie zeichnen: 0,567 s, Geschwindigkeitsspitze bei 47 %; Überschwinger nur als eigenes Token (+ ca. 2 % Bildhöhe, 0,17 s).
- Knoten-Pop 0,1 s, Akzentfarbe 0,05 s später über 0,1 s, Glühen-Abklingen τ 0,25 bis 0,3 s.
- Morph `inOut` durchgehend, ohne Zwischenhalt.
- Klick-Feedback mit Anstieg ≥ 2 Frames.
- Kein Easing mit Startgeschwindigkeit > 0 aus der Ruhe ohne 2 Frames Anlauf.

## 4. Übergänge
Nur drei Arten:
1. Schnitt auf Bewegung in gleicher Richtung (Q8).
2. Echter Match-Cut: gleiche Lage und Größe, oder die Bewegung läuft über den Schnitt weiter.
3. Whip mit Inhalt im ersten Frame danach.

Keine Unschärfe-Überblendung, keine Doppelbelichtung, kein leerer Frame nach einem Schnitt (außer die Referenz hat ihn).

<!-- Warum: Sechs Übergangsarten in 20 s, ein Match-Cut mit Richtungsbruch und einer aus dem Stand wirkten unruhig und billig. -->

## 5. Bild und Material
- **Bildfüllung:** Stehende UI-Einstellung: Inhalt in 35 bis 65 % der Zeilen und 50 bis 80 % der Spalten, kein leeres Band > 45 % Bildhöhe länger als 0,5 s. **Diese Werte gelten auch ohne Referenz als Pflicht, nicht als Ziel:** Median „Zeilen mit Inhalt“ unter 35 % ist ✗ (Hauptelement größer oder näher, Zoom ≥ 1,3×, Karte so hoch wie ihr Inhalt). Nur eine bewusst leerere Referenz senkt die Untergrenze auf ihren eigenen Median. Ausnahme: Aussage Stufe H auf leerem Grund, dann Text ≥ 45 % Bildbreite. Hero-Element im Endbild ≥ 60 % Bildbreite. Gemessen mit `scripts/qualitaet.py --fuellung` (Inhalt = Kante zum Nachbarpixel, 320 px breit; „stehend“ = Frame-Differenz < 0,3; Aussage-Fenster aus `ereignisse.json`, Endkarte und `stille` ausgenommen).
- **Bildwelten:** Höchstens ein Drittel der Szenen ist „Kachel auf leerem Grund“ (eine Karte oder Kachel, sonst nur Fläche und Aussage). Foto-, Menschen- und Geräte-Szenen des Vorbilds bekommen eine echte Ersatz-Bildwelt: Desktop-Fenster mit dem echten Screen, Handy, Produktfoto, Bild von der Website, Live-Daten. Jede Szene meldet ihre Bildwelt als Ereignis `bildwelt` mit `art`; gemessen mit `scripts/qualitaet.py --fuellung` (Zeile „Bildwelten: nicht nur Kacheln“, ✗ über einem Drittel; dazu als Hinweis die Sekunden mit reicher Bildwelt, ≥ 15 Farbstufen, gegen das Vorbild). Die Messung ersetzt nicht den Blick: Ein Film kann alle Zahlen erfüllen und trotzdem monoton wirken.
- **Endkarte:** höchstens 2 Takte; länger nur mit Ausklang und Begründung (Feld `begruendung` am Ereignis `endkarte`), gemessen mit `scripts/qualitaet.py --fuellung`.
- **Material:** Echte UI als helle Karten mit weichem, mehrlagigem Schatten; Hierarchie über Gewicht und Grau (Titel fast schwarz, Zweitzeile mittleres Grau).
- **Kontrast:** Text in UI-Nahaufnahmen ≥ 4,5 : 1, im Übergang nie < 3 : 1; Statuszeilen als weiße Karte mit Schatten statt grau auf grau.
- **Platzhalter:** Kein Lade- oder Leerzustand > 0,4 s, nie dunkel, endet in echtem Inhalt; keine „+N“-Zähler; Karten so hoch wie ihr Inhalt.
- **Ton je Ereignis:** genau ein Effekt je sichtbarem Hauptereignis ± 2 Frames, kein Effekt ohne Bild (`06-ton.md` R8).

<!-- Warum Bildwelten: Im Beweistest waren 8 von 11 Szenen eine Kachel auf Weiß; Bildfüllung (Median 47 %) und Stand (0,3 %) waren besser als beim abgenommenen Referenzfilm, der Film wirkte trotzdem ärmer: keine Fotos, keine Geräte außer einem Telefon-Rahmen. Farbvielfalt trennt das nur grob (Film 1 von 41 s, Vorbild 8 von 40 s), darum ist die erklärte Bildwelt je Szene das Kriterium. -->
<!-- Warum Kontrast: Grauer Text auf grauer Statuspille hatte 2,7 : 1 und war im Film nicht lesbar. -->
<!-- Warum ohne Referenz Pflicht: Im Praxistest ohne Vorbild (Terminal-Teaser) lag der Median bei 16 %, die untere Bildhälfte war in drei von vier Szenen leer; weil 35 % nur gegen eine Referenz verglichen wurde, blieb es ein Hinweis. Kalibrierung in 07-qa.md: abgenommener Film 44 %, Praxistest-Film mit Vorbild 44 % (Vorbild 76 %), Terminal-Teaser 12 bis 13 %. -->
<!-- Warum Messung Bildfüllung und Endkarte: Im Praxistest stand 0,7 s lang nur eine Pille auf leerem Grund und die Endkarte 5,9 s (19 % des Films); die Rubrik war trotzdem grün, weil §5 nirgends gemessen wurde. -->

## 6. Messen
Alle Agenten messen mit `scripts/qualitaet.py` und denselben Parametern; eigene Definitionen nur zusätzlich und benannt. Referenz und Film werden immer mit derselben Methode gemessen. Ergebnisse als Tabelle `Größe | Referenz | Film | Soll | ✓/✗` ins Manifest bzw. in den QA-Bericht.

<!-- Warum: Vier Diagnose-Agenten hatten vier Stillstand-Definitionen und kamen für dieselbe Szene auf 0,10 bis 0,73 s. -->
