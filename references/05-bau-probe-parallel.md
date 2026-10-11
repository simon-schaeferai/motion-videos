# Bau: Probe, Bibliothek, Parallelbau (HyperFrames-Route)

Vor dem ersten Composition-Code: Skill `hyperframes` laden und `hyperframes-core` + `hyperframes-keyframes` lesen. Das gilt für jeden, der Code schreibt: Block-Agenten (Vorlage B, Pflichtzeile) und den Hauptlauf, wenn er selbst Kompositionen baut oder fertigstellt. Projekt anlegen mit `bash <skill-dir>/scripts/hf.sh init film` im Lauf-Ordner `motion-runs/<lauf>/` (pinnt die geprüfte Version aus `scripts/hyperframes-version` in `film/package.json`). Jeder spätere HyperFrames-Aufruf läuft über `hf.sh` und nimmt diese Version; `bash <skill-dir>/scripts/hf.sh --welche` zeigt sie. Nie `npx hyperframes` ohne Version (nimmt die zwischengespeicherte Fassung).

**Bauende Agenten im Vordergrund starten (`run_in_background: false`) oder vor dem Ende der Antwort auf alle warten.** Nie eine Runde mit „Agent arbeitet noch“ beenden: Läuft die Sitzung nicht interaktiv (Headless, `claude -p`, Remote, Neustart), stirbt der Agent mit ihr, und die Arbeit ist verloren.

<!-- Warum Vordergrund: Im Praxistest (Headless) lief der Probe-Agent im Hintergrund; die Runde endete mit „Die Probe ist in Arbeit“, der Agent brach mit dem Prozess ab, `renders/` blieb leer. Fortgesetzt, brach er in der nächsten Runde erneut ab. Erst Block-Agenten im Vordergrund liefen durch. Der Hauptlauf schrieb danach selbst Kompositionscode, ohne die HyperFrames-Skills geladen zu haben. -->

Danach in `film/CLAUDE.md` und `film/AGENTS.md` (legt `init` an) ganz oben einen Absatz ergänzen: „Für diesen Lauf gilt `<skill-dir>/SKILL.md` vor dieser Datei: kein `hyperframes preview` (auch nicht `--background`) im Projekt, Renders nur über `scripts/sperre.sh` bzw. `scripts/render-block.sh`.“

<!-- Warum hf.sh: Im Beweistest renderte die Sitzung bis Runde 4 mit zwischengespeicherter 0.8.147 statt der im Projekt festgelegten 0.8.143 (`npx hyperframes render` ohne Version) und merkte es erst spät. -->
<!-- Warum: Die von `hyperframes init` erzeugte Projekt-Anweisung empfiehlt Agenten ausdrücklich `npx hyperframes preview --background`. Dieser Skill verbietet Preview im Projekt, weil Preview `data-hf-id` in alle Dateien schreibt und Teil-Renders bricht (echter Vorfall). Ohne den Absatz sehen Block-Agenten zwei widersprüchliche Anweisungen; die Skill-Regel geht vor. -->

## 1. Probe (Station 5, G4 = Probe-Blick)
- **Nach dem Go kein weiteres Warten**, außer der Nutzer hat im Vorschlag „Probe abwarten“ gewählt: Die gemessene Probe geht als Zwischenstand in den Chat, gebaut wird weiter. Schwelle (`navi pruefen`): Probe gerendert, Messung jünger als der Render, kein ★ rot. Die Typo-Frage „Ist diese Aussage-Typo der Maßstab?“ haben die Standbilder im Vorschlag schon beantwortet; eine Maßstab-Szene bestimmt sonst die Regie-Schleife (`10-regie-schleife.md` §2). Wo unten „G4“ oder „abnehmen“ steht, heißt das: vor dem Weiterbauen selbst messen und eigene Mängel beheben; der Nutzer nur, wenn er warten wollte.
- **Kurze Filme (unter 20 s):** Die Probe ist trotzdem kein ganzer Film. Sie umfasst die ersten 5 bis 6 s (eine Aussage-Szene mit Lesetext und die erste Kamerabewegung) und wird gezeigt, bevor der Rest gebaut wird; Endkarte und Ton kommen nach G4. So sieht der Nutzer nach einer kurzen Runde etwas und kann Look, Schriftgröße und Bildfüllung korrigieren, bevor die volle Arbeit steckt.
- **Bekannte Mängel vor G4 beheben:** Was du selbst siehst (zu kleine Schrift, leere Bildhälfte, Leerzustand), wird vor der Vorlage korrigiert; G4 zeigt keine bekannten Fehler. Vor G4 `scripts/qualitaet.py --text --fuellung` auf dem Probe-Render und `lesetext-bogen.jpg` (1/3 Größe) ansehen.
- Ein Agent (Vorlage B, Variante „Probe“) baut die ersten ~10 s (unter 20 s Filmlänge: 5 bis 6 s) in `motion-runs/<lauf>/film/` (HyperFrames, 1920×1080, 30 fps; Maße der Spec in Referenz-Pixeln, eine Stage skaliert auf 1920×1080). Im Vordergrund starten oder vor dem Ende der Antwort abwarten: Die Antwort an den Nutzer kommt erst, wenn die Probe gerendert und gemessen ist.
- Zur Probe gehören neben den ersten ~10 s eine Aussage-Szene (Typo-System, Lesezeit, Lesezone, Lesetext ≥ 32 px) und, sobald Musik da ist, die letzten ~15 s mit Ton (Ende). Erst wenn diese drei abgenommen sind, wird skaliert. Ausnahme Filme unter 20 s: Probe = erste 5 bis 6 s (oben), Ende mit Ton nach G4.
- Das **Typo-System** (Stufen, Schnitt, Material, ein Reveal, ein Ausstieg; `09-qualitaets-dna.md`) wird in der Probe festgelegt, nicht je Block.
- Pflicht: Seite-an-Seite-Vergleich (`scripts/vergleich.py`) + Kontaktbögen, Schnitte ±0 Frames, höchstens 2 Korrektur-Renders (Deckel aus `templates/agent-prompts.md`), `npm run check` grün, Pflichtwerte mit `scripts/qualitaet.py` gegen die Kennzahlen der Referenz (ohne Vorbild gegen die absoluten Werte aus `09-qualitaets-dna.md`, inklusive `--text` und `--fuellung`).
- Der Nutzer bekommt Vergleichsvideo + Probe; Fragen: Tempo, Typo-Größe, Akzentfarbe, Texte, „Ist diese Aussage-Typo der Maßstab für alle?“ und „Welche Szene ist dein Maßstab?“. Die Maßstab-Szene wird mit `scripts/qualitaet.py` gemessen (Stand, Drift, Schnitttakt, Typo-Größe), ins Manifest eingetragen und ist ab dann Sollwert und Sperrzone (nicht mehr ändern). Änderungen gehen in die Bibliothek, bevor skaliert wird.

<!-- Warum kurze Probe bei kurzen Filmen: Im Praxistest B (15,9 s) war die Probe „schon der ganze Film“: 32 min und ca. 8,5 $ in einer Runde, bevor der Nutzer etwas sah; die selbst bemerkte zu kleine Terminal-Schrift wurde bei G4 nur gemeldet, nicht behoben, und kostete eine Revision. -->
<!-- Warum Probe mit Aussage und Ende: Im echten Lauf betrafen die meisten Ablehnungen Aussagen und das Ende; das spätere Tor 1 war deshalb ein Probe-Render einer Aussage-Strecke und der letzten 10 s, nicht der Anfang. -->
<!-- Warum Maßstab-Szene: Der Nutzer lobte zwei Szenen (eine als Typo-Maßstab, eine als Bewegungs-Maßstab); erst deren Messung ergab die Pflichtwerte für alle anderen Szenen. -->

## 2. Geteilte Bibliothek + Bauanleitung
Derselbe Agent zieht danach heraus:
- **Bewegungsgrammatik ist Pflicht.** Startpunkt ist `<skill-dir>/templates/lib/` (in `film/lib/` kopieren). Die Probe füllt die Werte aus der Referenz (Kurven als gemessene Tabellen), danach gilt für jeden Block: jede Einstellung hat Settle, linearen Drift und Potenz-Ausstieg; Unschärfe nur aus Geschwindigkeit und nur in Bewegungsrichtung (nie CSS-`blur()` an bewegten Objekten); Easings nur aus dem Token-Satz. Fehlt etwas, kommt es in die Bibliothek, nicht in den Block. Abnahme nach `09-qualitaets-dna.md`.
- **Typo-System zuerst** (in `lib/tokens.css` + Reveal-Funktion der Bibliothek), bevor Blöcke gebaut werden: Stufen H, Z, S, L, UI; Display-Schnitt bzw. höchste optische Größe; negative Laufweite bei H und Z; senkrechter Verlauf in Markenfarben nur ab ca. 64 px, nie `text-shadow` oder Glow; Akzent höchstens 2 Wörter; ein Reveal und ein Ausstieg für alle Aussagen, keine Laufweiten-Animation. Werte in `09-qualitaets-dna.md`.
- **Marke je Nutzer:** `node <skill-dir>/scripts/marke-tokens.mjs <lauf>/produkt/marke.json --out film/lib/marke.css`, in `index.html` direkt vor `</head>` einbinden (nach `lib/tokens.css`). `marke.css` setzt nur Farben, Verläufe und Schrift; Qualitätswerte (Typo-Stufen, Lesetext ≥ 32 px, Lesezeit, Bildfüllung, Übergänge) bleiben fest in der Bibliothek. Marke ändern heißt `marke.json` ändern und neu erzeugen, nie `marke.css` von Hand.
- `lib/tokens.css` (Farben, Radien, Schatten, Skalierung, Typo-Stufen, Verläufe), `lib/components.js` (wiederkehrende Bausteine des Films, z. B. Eingabefeld, Sprechblase, Icons, Cursor, Typewriter mit Schreibkopf, Shimmer, Farbsweep, Rise-in), `lib/camera.js` (Einstieg/Drift/Beschleunigung in den Schnitt, Punch-Stufen, Motion Blur aus Geschwindigkeit). Die Vorlage in `templates/lib/` bringt die generischen Teile mit; filmspezifische Bausteine ergänzt der Hauptlauf.
- **Taktraster:** Ohne mitgebrachte Musik: BPM aus der Ton-Analyse der Referenz (`02-analyse.md` §5), der Musik-Prompt nutzt dasselbe BPM. **Bringt der Nutzer Musik mit, ist ihre Takt-Karte (`scripts/ton/musik_schnitt.py --takt-karte`) das Raster, nicht die Referenz.** `bpm` und `takt0` in `ereignisse.json`: BPM der Musik und Filmzeit der ersten Takt-Eins der Musik (aus Segmentplan und Takt-Karte: Film-Start des ersten Segments plus Abstand seiner Quell-Takt-Eins). Vor dem Bau die Kick-Phase auf dem Musik-Entwurf prüfen. Maßgeblich ist die Zeile R7 „gemessen“ von `musik_schnitt.py`; `python3 <skill-dir>/scripts/qualitaet.py assets/sfx/musik_schnitt_A.wav --ton --bpm <BPM> --takt0 <s> --ohne-ereignisse --sperre <lauf-name>` zeigt dieselbe Zahl (beide nutzen `scripts/ton/kick.py`). Urteil „auf dem Raster“: weiter. „Halber Schlag daneben“: Die erkannte Takt-Eins sitzt einen halben Schlag daneben; `takt.eins` im Segmentplan bzw. `takt0` korrigieren, bevor Ereignisse auf das Raster gelegt werden. „Unklar“ oder „zweideutig“ (kein durchgehender Kick, Bass auch auf den Off-Beats): nichts aus der Zahl korrigieren, stattdessen Hörtest an jeder Musik-Naht. Die Raster-Funktionen der Bibliothek liefern Ereigniszeiten auf ganzen Frames; Klicks, Pops und harte Schnitte liegen auf 1/16 ± 1,5 Frames.
- **Ereignisliste** `<lauf>/ereignisse.json` (Schema 1, Abschnitt „Ereignisliste“ unten): jede Komponente meldet ihre Ereignisse aus dem Code; Aussagen tragen `lesbarAb` und `ausstiegAb`. Daraus speisen sich Ton-Cues, Ein-Blick-Bogen und Prüfskripte. Keine Zeit wird von Hand oder aus einer alten Version abgeschrieben.
- **Keine Zeitlupe:** Die Bibliothek bietet keine Zeitverzerrung für Lesefenster an (eine `warp`-Funktion mit Steigung < 1 ist ein Anti-Muster). Lesezeit = Haltezeit mit laufender Kamera (`03-blueprint-und-wahrheit.md`, Lesefluss).
- `index.html` mit Slots je Block (`data-composition-src="compositions/blockN.html"`). Slot-Start = Schnitt-Frame / fps − 0,0005 s: Der Schnitt-Frame selbst ist ein ganzer Frame, die 0,5 ms sorgen nur dafür, dass er sicher im neuen Block landet. Nie Slot-Starts aus Summen, Zugaben oder Zeitverzerrung rechnen (die ergeben Bruchteil-Frames).
- `BAUANLEITUNG.md` aus `<skill-dir>/templates/BAUANLEITUNG.vorlage.md` (Platzhalter füllen: Blocktabelle, Konventionen, Render-Sperre, Teil-Render, Messen, Prüfen vor Übergabe).
- Regressionstest: Probe als Block 0 neu rendern, gegen die Probe vergleichen.

<!-- Warum Bewegungsgrammatik: Trotz einer Bibliothek nutzten Neubauten freie Easings, CSS-`blur()`, Überblendungen und Halte ohne Drift: 17,8 % Standbild gegen 3,2 % in der Referenz, elfmal Anfahren aus dem Stand, je Block eigene Kurven (Wort-Takt 0,052/0,078/0,103 s, Ausstieg 0,117/0,18/0,35 s). Die gelobte Maßstab-Szene hatte 3,9 % Stand und Unschärfe ≈ 0,3 × Weg pro Frame. -->
<!-- Warum Taktraster: Ereignisse wurden vor der Musik auf das Raster gelegt, damit die Musik danach darauf sitzt; das hat funktioniert. -->
<!-- Warum eine Kick-Methode: Im Praxistest B maßen musik_schnitt.py (+0,02) und qualitaet.py (−0,46) dieselbe Musik verschieden; die Regel „bei ± 0,5 korrigieren“ war damit beliebig. Ursache und Kalibrierung in 07-qa.md. -->
<!-- Warum Musik des Nutzers als Raster: Im Praxistest brachte die Nutzerin Musik mit 145 BPM mit, die Referenz hatte ca. 174 BPM; der Skill nannte nur die Referenz. Ergebnis: Kick-Phase −0,47 in allen Abschnitten (Ereignisse auf der Off-Zählzeit) und vom Hörtest gemeldete Sprünge an den Musik-Nähten. Nachgemessen lag die Kick-Phase des Musik-Entwurfs mit takt0 = 0,207 s (ein halber Schlag) bei 0,03 und 0,04. -->
<!-- Warum Ereignisliste: Cue-Zeiten aus Referenz und Altversionen lagen bis 2 s neben dem Bild. -->
<!-- Warum Slot-Start: Ein aus Zeitzugaben gerechneter Slot-Start (Frame 1542,12) erzeugte 5 Duplikat-Frames und 1 Blitzframe; Slot-Starts mit 0,5 ms vor einem ganzen Frame liefen in allen Revisionen sauber. -->

### Ereignisliste (Schema 1)
Ein Format für alle Werkzeuge. Vorlage mit Feldbeschreibung: `templates/ereignisse.vorlage.json`.

```json
{"schema": 1, "fps": 30, "bpm": 120, "takt0": 0.0, "ereignisse": [
  {"id": "b2-say", "t": 2.8667, "frame": 86, "typ": "aussage", "zaehlzeit": 5.733, "beat": "B2 Notiz",
   "text": "Alles an einem Ort.", "woerter": 4, "lesbarAb": 3.4229, "ausstiegAb": 4.8667},
  {"id": "schnitt-bc", "t": 5.5, "typ": "schnitt", "art": "match"},
  {"id": "stille-1", "t": 16.0, "typ": "stille", "bis": 16.5}]}
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | eindeutig im Film; Cues verweisen darauf |
| `t` | ja | Sekunden Filmzeit auf einem ganzen Frame |
| `typ` | ja | `aussage`, `hit`, `schnitt`, `punch`, `klick`, `tippen`, `pop`, `linie`, `knoten`, `puls`, `morph`, `ki`, `endkarte`, `ausklang`, `stille`, `ende`, `deko` |
| `frame`, `zaehlzeit` | nein | Frame-Index und Lage im Taktraster (Dezimalzahl ab `takt0`) |
| `beat` | nein | Name des Beats aus dem Blueprint (Text, nie die Rasterlage); Bildtitel im Ein-Blick-Bogen |
| `text` | bei `aussage` | der Satz; sonst eine kurze Notiz |
| `lesbarAb`, `ausstiegAb` | bei `aussage` (bei `hit` nur als Hit-Statement) | alle Wörter voll da (Lage, Deckung, Tinte ≥ 97 %) und Beginn des Ausstiegs bzw. Schnitt; `null` = bis Filmende |
| `woerter`, `lesezeitSoll`, `lesezeitIst` | nein | schreibt `MV.sayEvents`; Wörter = Teile mit Buchstabe oder Ziffer („&“ zählt nicht) |
| `art`, `richtung` | nein | bei `schnitt`: `hart`, `whip`, `match`, `bewegung` |
| `bis` | bei `stille` | Ende einer gewollten Ruhe in Bild und Ton |
| `begruendung` | nein | bei `endkarte`: warum sie länger als 2 Takte steht (nur mit Ausklang); sonst ✗ in `qualitaet.py --fuellung` |
| `bereich`, `grund` | bei `deko` | Schrift unter 32 px, die nicht gelesen werden soll (Fenstertitel, Mockup-Inhalt, Fototext): Rechteck [x0, y0, x1, y1] in Ausgabe-px, gültig von `t` bis `bis`, mit Grund; `qualitaet.py --text` nimmt Zeilen darin aus |
| `briefLaenge` (Kopf) | nein | Filmlänge laut Brief (G1) für R12 „Länge gegen Brief“: Zahl in s (± 10 %) oder Spanne `[15, 20]`, wie der Nutzer sie genannt hat; setzt `MV.configure({ briefLaenge })`; sonst `qualitaet.py --brief <s>` bzw. `--brief 15-20` |

- **Schreiben:** nur über die Bibliothek (`MV.events.add`, `MV.sayEvents`, `MV.chainEvents`, `MV.events.setBeat`) im Zeitplan, Export mit `node tools/ereignisse.mjs . --out ../ereignisse.json` (prüft das Schema, Exit 1 bei Verstoß oder verfehlter Lesezeit). Wer ohne die Bibliothek baut, schreibt dasselbe Format.
- **Lesen:** `scripts/qualitaet.py` (Aussagen, `klick`/`punch` im Lesefenster, `schnitt`, `endkarte` mit `begruendung`, `ausklang`, `stille`, `deko`, `beat`, Kopfwerte `bpm`/`takt0`/`briefLaenge`), `scripts/ton/ton_bauen.py` (`id`, `t`), `scripts/ton/ton_pruefen.py` (`t`, `typ`, `stille`, `ausklang`, `bpm`), `scripts/hoertest.mjs` (`t`, `typ`, `text`, `lesbarAb`, `ausstiegAb`). Alle lesen auch eine nackte Liste `[…]`; dann fehlen die Kopfwerte.
- **Gewollte Ruhe** (Schwarzbild, Stille nach einem Hit) immer als `stille` mit `bis` eintragen, sonst zählt sie als Standbild bzw. Loch.

<!-- Warum ein Schema: Bibliothek, Vorlage und Prüfskript hatten drei leicht verschiedene Formate (Beat-Name gegen Rasterlage im Feld `beat`, `morph` als Schnitt, Typen-Synonyme); eine Ereignisliste aus einem echten Lauf ließ das Prüfskript deshalb Szenengrenzen und Stillen falsch lesen. -->


## 3. Blöcke parallel
- Blöcke an echten Schnitten der Referenz trennen (dann sind Nähte unsichtbar). Typisch 4 Blöcke à 15 bis 25 s.
- Je Block ein Agent (Vorlage B), plus Asset-Agent für geteilte Bilder (Vorlage C). Alle bauenden Agenten im selben Schritt im Vordergrund starten (`run_in_background: false`) oder vor dem Ende der Antwort auf alle warten; nie eine Runde mit „Agent arbeitet noch“ beenden (Headless-Sitzungen beenden ihre Agenten mit). Assets über einen **Dateinamen-Vertrag** (Brief-Datei mit exakten Pfaden); Blöcke testen solange mit Platzhaltern.
- Regeln: nur eigene `blockN.html` + Dateien mit Präfix `bN_`; `index.html`/`lib/` gehören dem Hauptlauf; **kein `hyperframes preview` im Projekt** (schreibt `data-hf-id` in alle Dateien und bricht Teil-Renders); Kinder nicht laufender Sections mit `visibility:inherit`; nach jedem Teil-Render Länge + Bewegung prüfen.
- **Teil-Render** nur über `bash <skill-dir>/scripts/render-block.sh <lauf-name> <N> [renders/blockN-rK.mp4]`: legt die Fensterdatei erst nach der Sperre an, rendert mit `--workers 2` über `hf.sh` (gepinnte Version) unter der Sperre (die setzt `nice`; kein zweites davor) und löscht sie danach.
- **Nur drei Übergangsarten:** Schnitt auf Bewegung in gleicher Richtung, echter Match-Cut (gleiche Lage und Größe oder die Bewegung läuft über den Schnitt weiter), Whip mit Inhalt im ersten Frame danach. Keine Unschärfe-Überblendung, keine Doppelbelichtung, kein leerer Frame nach dem Schnitt (außer die Referenz hat ihn).
- **Zeitbasis:** Ereigniszeiten liegen auf ganzen Frames; keine Frame-Rundung vor einer Zeitumrechnung (erst rechnen, am Ende auf den Frame runden); die Sichtbarkeit einer Szene steuert genau eine Stelle (entweder `data-start` oder `render()`, nie beide).
- Übergaben zwischen Blöcken (Fensterlage, Inhalt am letzten Frame) per Nachricht an den Nachbar-Agenten weiterreichen.

<!-- Warum drei Übergangsarten: Eine Revision hatte sechs Übergangsarten in 20 s, einen Match-Cut mit Richtungsbruch, einen aus dem Stand und Doppelbelichtung im Morph; Nutzer: nicht hochwertig. -->
<!-- Warum Zeitbasis: Doppelte Sichtbarkeits-Steuerung (`data-start` und Router in `render()`) plus Rundung vor der Umrechnung erzeugten Duplikat- und Blitzframes an allen Schnitten eines Blocks. -->
<!-- Warum render-block.sh: Das Teil-Render-Skript war im echten Lauf das gemeinsame Werkzeug aller Block-Agenten; als bloßer „Tipp“ baute sich jeder Agent seinen eigenen Weg. -->

## 4. Zusammenbau
1. `grep -l data-hf-id`, keine `_fenster-*.html`, Sperre frei, Slots korrekt (Dauer Block N + Start N+1 lückenlos).
2. `npm run check` (Kontrast-Warnungen aus bewusst blassen Referenz-Grautönen sind ok, im Bericht nennen).
3. Ereignisliste aus dem Code aktualisieren (`<lauf>/ereignisse.json`), bevor Ton und Prüfskripte laufen.
4. Gesamt-Render immer mit Sperre, auch der letzte vor der Auslieferung: `bash <skill-dir>/scripts/sperre.sh <lauf> -- bash <skill-dir>/scripts/hf.sh render -c index.html -o renders/<name>.mp4 --workers 2 --quiet` (ohne eigenes `nice`).
5. QA nach `07-qa.md`, besonders **jede Naht Frame für Frame** (Fehler aus einem echten Lauf: anderes Hintergrundbild und anderer Fensterinhalt an einer Blockgrenze) und `scripts/qualitaet.py --frames`.

<!-- Warum Gesamt-Render mit Sperre: Grundsatz 6 gilt ohne Ausnahme; eine frühere Fassung dieses Skills nannte den Gesamt-Render ohne Sperre, und ein zweiter Render parallel legte den Rechner lahm. -->

## 5. Inhalt tauschen (z. B. Demo-Marke → echte Kundenmarke)
- Eine Brief-Datei (`<MARKE>-BRIEF.md`) mit Quelle, belegten Fakten (wörtlich), Platzhalter → Demo-Werten, Asset-Vertrag, Text-Änderungen je Block.
- Alle Block-Agenten gleichzeitig informieren, Asset-Agent zuerst. Am Ende `grep` auf die alte Marke über `index.html compositions lib`.

## 6. Kurz- und Langfassung
- Fassungen werden in G1 festgelegt. Ein Projekt, geteilte Blöcke. Die Langfassung schiebt ein Kapitel (eigene Komposition, Länge in ganzen Takten) an einem echten Schnitt ein; der Rest der Kurzfassung läuft über einen Offset-Block weiter (pixelgleich gegen die Kurzfassung prüfen).
- Ton: eigene `audio-lang.html` aus derselben Musik, verlängert nur um ganze Takte an Takt-Einsen, Kapitel-Cues aus der Ereignisliste des Kapitels (`ereignisse-lang.json` oder Einträge mit eigener `id`-Gruppe). Die Ton-Datei der Kurzfassung bleibt bytegleich.
- Nur ein Root-HTML im Projekt (sonst bricht `npm run check` mit `multiple_root_compositions`): `index-lang.html` liegt in `film/_lang/` und wird nur zum Rendern unter der Sperre kurz nach `film/` kopiert und danach wieder entfernt.

<!-- Warum: Im echten Lauf liefen Kurzfassung (Social) und Langfassung (Website/Sales-Deck) aus einem Projekt; ein zweites Root-HTML im Projekt schaltete `npm run check` ab und musste geparkt werden. -->
