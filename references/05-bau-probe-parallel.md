# Bau: Probe, Bibliothek, Parallelbau (HyperFrames-Route)

Vor dem ersten Composition-Code: Skill `hyperframes` laden und `hyperframes-core` + `hyperframes-keyframes` lesen. Projekt anlegen mit `npx hyperframes init` im Ordner `motion-runs/<lauf>/film/`.

## 1. Probe (G4)
- Ein Agent (Vorlage B, Variante „Probe“) baut die ersten ~10 s in `motion-runs/<lauf>/film/` (HyperFrames, 1920×1080, 30 fps; Maße der Spec in Referenz-Pixeln, eine Stage skaliert auf 1920×1080).
- Pflicht: Seite-an-Seite-Vergleich (`scripts/vergleich.py`) + Kontaktbögen, Schnitte ±0 Frames, max. 4 Korrekturrunden, `npm run check` grün.
- Der Nutzer bekommt Vergleichsvideo + Probe; Fragen: Tempo, Typo-Größe, Akzentfarbe, Texte. Änderungen gehen in die Bibliothek, bevor skaliert wird.

## 2. Geteilte Bibliothek + Bauanleitung
Derselbe Agent zieht danach heraus:
- `lib/tokens.css` (Farben, Radien, Schatten, Skalierung), `lib/components.js` (wiederkehrende Bausteine des Films, z. B. Eingabefeld, Sprechblase, Icons, Cursor, Typewriter mit Schreibkopf, Shimmer, Farbsweep, Rise-in), `lib/camera.js` (Einstieg/Drift/Beschleunigung in den Schnitt, Punch-Stufen, Motion Blur aus Geschwindigkeit).
- `index.html` mit Slots je Block (`data-composition-src="compositions/blockN.html"`), Slot-Start 0,5 ms vor dem Schnitt-Frame.
- `BAUANLEITUNG.md` aus `<skill-dir>/templates/BAUANLEITUNG.vorlage.md` (Platzhalter füllen: Blocktabelle, Konventionen, Render-Sperre, Teil-Render, Messen, Prüfen vor Übergabe).
- Regressionstest: Probe als Block 0 neu rendern, gegen die Probe vergleichen.

## 3. Blöcke parallel
- Blöcke an echten Schnitten der Referenz trennen (dann sind Nähte unsichtbar). Typisch 4 Blöcke à 15 bis 25 s.
- Je Block ein Agent (Vorlage B), plus Asset-Agent für geteilte Bilder (Vorlage C). Assets über einen **Dateinamen-Vertrag** (Brief-Datei mit exakten Pfaden); Blöcke testen solange mit Platzhaltern.
- Regeln: nur eigene `blockN.html` + Dateien mit Präfix `bN_`; `index.html`/`lib/` gehören dem Hauptlauf; **kein `hyperframes preview` im Projekt** (schreibt `data-hf-id` in alle Dateien und bricht Teil-Renders); Kinder nicht laufender Sections mit `visibility:inherit`; nach jedem Teil-Render Länge + Bewegung prüfen.
- Übergaben zwischen Blöcken (Fensterlage, Inhalt am letzten Frame) per Nachricht an den Nachbar-Agenten weiterreichen.

## 4. Zusammenbau
1. `grep -l data-hf-id`, keine `_fenster-*.html`, Sperre frei, Slots korrekt (Dauer Block N + Start N+1 lückenlos).
2. `npm run check` (Kontrast-Warnungen aus bewusst blassen Referenz-Grautönen sind ok, im Bericht nennen).
3. Gesamt-Render mit Sperre: `bash <skill-dir>/scripts/sperre.sh <lauf> -- npx hyperframes render -c index.html -o renders/<name>.mp4 --workers 2 --quiet`.
4. QA nach `07-qa.md`, besonders **jede Naht Frame für Frame** (Fehler aus einem echten Lauf: anderes Hintergrundbild und anderer Fensterinhalt an einer Blockgrenze).

## 5. Inhalt tauschen (z. B. Demo-Marke → echte Kundenmarke)
- Eine Brief-Datei (`<MARKE>-BRIEF.md`) mit Quelle, belegten Fakten (wörtlich), Platzhalter → Demo-Werten, Asset-Vertrag, Text-Änderungen je Block.
- Alle Block-Agenten gleichzeitig informieren, Asset-Agent zuerst. Am Ende `grep` auf die alte Marke über `index.html compositions lib`.
