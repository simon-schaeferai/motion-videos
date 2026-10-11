# Referenz-Gate (G1 = Stationen 1 bis 3)

Vor jeder Analyse und jedem Bau: Zutaten klären. Gefragt wird vorab nur nach **Vorbild und Produkt-Link** (Stationen 1 und 2, `00-navigator.md`); was der Auftrag schon beantwortet, nicht nochmal fragen. Alle anderen Zutaten aus §1 gehen als **Annahmen mit Empfehlung** in den Vorschlag (Station 4, `templates/vorschlag.vorlage.md`) und werden mit dem einen Go bestätigt oder in einem Satz korrigiert. Eine Rückfrage vor dem Vorschlag nur, wenn der Navigator eine Schwelle rot meldet (kein Vorbild, Produktseite gesperrt, zu wenig belegte Funktionen, Material unter der Schwelle) oder der Absender unklar ist; dann höchstens 4 Fragen in einer Runde (Rückfrage-Werkzeug des Clients, sonst nummerierte Liste). Antworten sofort ins Manifest.

<!-- Warum Annahmen statt Fragerunde: In den Praxistests kosteten Fragerunden vor dem Bau Zeit, ohne dass der Nutzer etwas sah; ein Vorschlag mit Empfehlungen und Standbildern lässt sich mit einem Satz korrigieren. -->

**Der Skill führt (SKILL.md Grundsatz 11).** Der Nutzer muss nichts über Motion-Design wissen. Jede Frage hat genau diese Form: Empfehlung zuerst mit „(Empfohlen)“, ein Satz Warum, ein konkretes Beispiel, dann die anderen Optionen. Beispiel: „**Format:** 16:9 (Empfohlen). Warum: Dein Vorbild und LinkedIn zeigen quer am größten. Beispiel: wie ein YouTube-Video. Alternativ 9:16 fürs Reel.“ Am Ende jeder Antwort steht der nächste Schritt, den du vorschlägst („Wenn das passt, schreib ‚Go‘, dann baue ich …“).

**Erste Antwort im Lauf** (drei Sätze, Wortlaut-Vorschlag in `00-navigator.md`): wie der Weg läuft (Vorbild und Produkt-Link → Vorschlag im Chat mit Standbildern → ein Go → Probe, Bau mit Kritik-Runden, Ton → fünf Fragen zur Abnahme), wo der Nutzer gefragt wird (Vorschlag, Abnahme, vor jeder Generierung mit Kosten) und was er jetzt tun soll (Vorbild und Produkt-Link schicken).

## 0. Vorbild zuerst (geführte Pflichtfrage)

Die erste Frage, vor allen anderen, wenn der Auftrag kein Vorbild enthält:

> „Welches Video hat dir zuletzt richtig gefallen? Schick mir den Link oder die Datei. Warum: Das Vorbild ist der größte Hebel für die Qualität; ich messe daran Tempo, Kamera, Schrift und Bildfüllung, statt zu raten.“

1. **Hat der Nutzer keins:** beim Finden helfen, statt Stilwörter anzubieten. Drei bis vier Film-Typen mit je einem Satz, wofür sie taugen, und Suchbegriffe zum Selbstsuchen:
   - **Launch-Reel mit UI-Fahrten:** Kamera fährt durch echte Screens, Aussagen dazwischen; für Apps und SaaS mit sichtbarer Oberfläche. Suche: „product launch motion design“, „SaaS launch video UI animation“.
   - **Terminal- oder Code-Teaser:** Befehle tippen, Ausgabe erscheint, Kamera nah am Text; für CLI-Tools und Entwickler-Produkte. Suche: „CLI tool launch video“, „developer tool teaser animation“.
   - **Feature-Walkthrough mit Kamera:** eine Funktion pro Szene, Zoom auf den Klick; für Produkte mit mehreren Funktionen. Suche: „feature walkthrough motion graphics“, „app feature video kinetic“.
   - **Kinetic-Typo-Statement:** große Schrift trägt die Botschaft, wenig UI; für Manifeste und Ankündigungen ohne viel Oberfläche. Suche: „kinetic typography brand video“, „type animation launch“.
   Wo suchen: Instagram, YouTube, X und Dribbble (Suche „motion“ plus Begriff). Worauf achten: Format wie das Ziel (16:9 für LinkedIn/YouTube, 9:16 für Reels), 15 bis 90 s, viel UI statt Realfilm, Schnitte im Takt der Musik, Texte, die man beim ersten Sehen lesen kann. Keine fremden Videos mitliefern oder fest verlinken; der Nutzer wählt selbst.
2. **Holen:** Eine URL holt `scripts/hole-referenz.sh` anonym. YouTube blockt anonyme Downloads oft (Bot-Prüfung); dann Schritt für Schritt erklären: Download-Funktion der Plattform nutzen oder das Video per Bildschirmaufnahme aufnehmen (macOS: Cmd+Shift+5, Bereich wählen, abspielen, stoppen), die Datei nach `motion-runs/<lauf>/analyse/` ziehen und den Pfad nennen. Login-Inhalte nie mit Cookies umgehen.
3. **Ohne Vorbild nur, wenn der Nutzer ausdrücklich „ohne“ sagt.** Dann ehrlich ansagen: „Ohne Vorbild wird das Ergebnis schlichter; ich schlage dir drei Stil-Richtungen als Standbilder vor.“ Die Stil-Richtungen als Standbilder zeigen (wie bisher), die absoluten Werte aus `09-qualitaets-dna.md` gelten dann ohne Referenz.
4. **Optional „Maßstab“:** zusätzlich ein Lieblings-Film oder eine Szene als Qualitäts-Messlatte („So gut soll es mindestens aussehen“).

<!-- Warum Vorbild zuerst und geführt: Im Praxistest ohne Vorbild (Terminal-Teaser) bot der Skill drei Stilwörter an; der Film wurde sauber, aber schlicht (Median 13 % Zeilen mit Inhalt, untere Bildhälfte leer). Der Lauf mit Vorbild war deutlich reicher. Rückmeldung: „Der Skill soll guiden.“ Fremde Nutzer kennen weder Film-Typen noch Suchbegriffe. -->

**Kosten im G1-Text nennen (in $, Zahlen aus `node <skill-dir>/scripts/navi.mjs kosten`):** „Ein 40-s-Film kostet an Claude-Nutzung ca. 30 bis 40 $ mit voller Kritik oder ca. 15 bis 20 $ in der Sparfassung (ohne Generierung). Im Claude-Abo zählt das gegen dein Wochenlimit; ein voller Lauf kann einen großen Teil davon verbrauchen. Jede Generierung kommt dazu und wird vorher einzeln freigegeben.“ Nie Token-Zahlen ohne $. Im Manifest je Phase in $ festhalten (Abschnitt „Modellkosten je Phase“).

<!-- Warum Kosten: Im Praxistest kostete die Analyse einer 25-s-Referenz 8,4 $, der ganze Lauf 35,6 $ Modell-Nutzung; der Skill regelte Kosten bis dahin nur für Generierung, für einen fremden Nutzer überraschend. Im Beweistest (41 s, 95,76 $) nannte der Text Tokens statt $, und das Wochenlimit des Abos riss den Lauf ab. -->

## 1. Pflicht-Zutaten

| Zutat | Warum | Typische Optionen / Default |
|---|---|---|
| **Vorbild** | Spezifikation für Mechanik, größter Qualitätshebel | Video-URL oder Datei (Empfohlen, §0) · Hilfe beim Finden (§0.1) · „ohne“ nur auf ausdrücklichen Wunsch → Stil-Richtungen als Standbilder, ehrlich „schlichter“ |
| **Ziel** | entscheidet Treue vs. Eigenständigkeit | Mechanik übernehmen + eigener Inhalt (Empfohlen) · interne 1:1-Studie (nie veröffentlichen) · Fähigkeitstest eines Generators |
| **Absender** | Branding-Weiche | eigene Marke des Nutzers → dessen Branding · Kunde/Produkt → dessen Branding aus Website/App, nie Marken mischen |
| **Produkt / Thema** | Inhalt jeder Szene | mit Link; Funktionsumfang erfragen oder selbst lesend prüfen (App im Browser nur ansehen) |
| **Format** | Layout-Umrechnung | 16:9 wie Referenz · 9:16 Reel · beides (erst 16:9 abnehmen, dann ableiten) |
| **Sprache** | Textlängen ändern Typo-Größen | Deutsch · Englisch (UI-Texte wirken oft echter) |
| **Einsatz / Kanal** | CTA, Lizenzen, Freigaben | eigener Kanal mit Keyword · Kunden-/Produktkanal nur URL · Website/Sales-Deck ohne Social-CTA · je Fassung festhalten (siehe „Fassungen“) |
| **Demo-Inhalt** | was im Film „produziert“ wird | fiktive Demo-Marke (Empfohlen, keine Freigabe nötig) · echte Kundendaten (nur mit schriftlichem OK) · eigene Marke |
| **Generatoren** | welche Route möglich ist | welche Bild-, Video-, Musik- und SFX-Anbieter angeschlossen sind (MCP, API-Key) · keiner → Code-only-Route mit eigenen Assets |
| **Effekte (SFX)** | ohne Effekte wirkt der Film leer (Rubrik R11) | eigene lizenzierte SFX-Bibliothek · SFX-Generator (G5) · im Code synthetisiert (Empfohlen bei Code-only, kostenlos, schlichter) · keine |
| **Musik** | Taktraster und Länge hängen daran | eigene lizenzierte Musik (dann ist **ihre** Takt-Karte das Raster, `05-bau-probe-parallel.md` §2) · Musikgenerator (G5) · keine |
| **Länge** | deutsche/übersetzte Aussagen brauchen mehr Lesezeit als die Referenz | genau wie die Referenz · darf in ganzen Takten wachsen (Empfohlen, ± 10 %) · ohne Vorbild: die Empfehlung folgt dem Wort des Nutzers („kurz“, „Teaser“ = 15 bis 20 s, nicht länger). Die Antwort wörtlich ins Manifest, eine Spanne als Spanne („15 bis 20 s“ → `--brief 15-20`, `briefLaenge: [15, 20]`) |
| **Fassungen** | eine Kurzfassung fasst nicht jedes Feature | nur Kurzfassung (Social, Empfohlen) · Kurz- + Langfassung (Website/Sales-Deck, Langfassung = Kurzfassung + Kapitel) · je Fassung Kanal und genau **eine** Aufforderung (CTA im Band oder auf der Endkarte) |
| **Maßstab** (optional) | gibt „hochwertig“ eine Messlatte | eine Szene der Referenz oder ein eigener Film, an dem sich alles messen soll · sonst in G4 nach der Probe fragen |

<!-- Warum Länge wörtlich: Im Praxistest B sagte der Nutzer „kurzes Teaser-Video“, die Empfehlung war 24 s; die Antwort „15 bis 20 s“ wurde später als eine Zahl gemessen (--brief 18 → −12 % ✗ bei 15,9 s). -->
<!-- Warum Länge: Übersetzte Aussagen in den 1-s-Einstellungen der Referenz waren zu kurz („Texte zu schnell“, 8 von 13 Aussagen unter der Lesezeit). -->
<!-- Warum Fassungen: Im echten Lauf entstand die Langfassung erst nachträglich; Features wurden vorher als Zweittext in die Kurzfassung gestapelt („überladen“). Die Social-Fassung trug am Ende zwei Aufforderungen (Band und Endkarte). -->
<!-- Warum Maßstab: Erst als der Nutzer eine Szene als Maßstab nannte, ließ sich „hochwertig“ messen und auf alle Szenen übertragen. -->
<!-- Warum Effekte und Musik als eigene Zutat: Im Praxistest (Code-only) fehlte die Effekt-Frage; die Sitzung baute still „nur Musikbett“ und brauchte eine Zusatzrunde. Die mitgebrachte Musik (145 BPM) hatte ein anderes Tempo als die Referenz (ca. 174 BPM); ohne Regel wurde das Raster improvisiert. -->

## 2. Fakten-Gate (nach der Analyse, vor dem Blueprint-Go)
Für jede Szene, die eine Produktfunktion zeigt: „Gibt es das wirklich?“ Nicht raten. Typische Fragen:
- Name des Modus / der Hauptfunktion? Welche Modelle darf man zeigen? Welche Integrationen (Publish-Ziele, Connectors)?
- Benachrichtigungskanal? Sprachen? Begriffe (z. B. „Flows“)? Akzentfarbe?
- Belege, die du selbst holen kannst (lesend): Werkzeugkatalog eines MCP-Connectors, Login-Screen/App-UI per Browser (nichts klicken, was schreibt), Website-CSS (Farben, Schrift).

## 3. Asset-Gate (was du vom Nutzer brauchst)
**Zuerst selbst suchen, dann fragen:** Viele Produkte haben eine öffentliche Demo oder Live-Ansicht (Analytics-Dashboard, Playground, Sandbox, Beispiel-Workspace). `scripts/produkt-lesen.mjs` sucht sie auf der Produktseite und holt sie als `produkt/screens/demo-*` (Kandidaten in `produkt/demo.json`, gezielt mit `--demo <url>`); nie Formulare („Book a demo“), Login oder Konto. Das ist echtes Material: echte Oberfläche, echte Bewegung in den Daten. Eigene Screens des Nutzers bleiben besser (sein Konto, seine Daten), werden aber nicht zur Bedingung.

**Ersatz-Bildwelt für Foto, Mensch und Gerät:** Zeigt das Vorbild Fotos, Menschen oder Geräte, plant der Vorschlag dafür eine echte Bildwelt, nie eine leere Karte: Desktop-Fenster mit dem echten Screen, Handy mit dem Screen, Produktfoto des Nutzers, Bild von der Website (`produkt/bilder/`), Live-Daten der Demo in Bewegung. Spalte „Bildwelt“ im Vorschlag; höchstens ein Drittel der Szenen „Kachel“.

Frag konkret nach Dateien, mit Zielordner und Klick-Anleitung:
- Logos/Wortmarken (SVG bevorzugt), echte Produktfotos, Screens/Exports (z. B. „im Tool je Ansicht Export → PNG“).
- Integrations-Logos als SVG in Originalformen und -farben (sie werden im Film Form für Form aufgebaut, nie generiert).
- **macOS-Datenschutz:** Claude kann `~/Downloads`, `~/Desktop`, `~/Documents` oft nicht lesen („Operation not permitted“). Gleich bitten, Dateien nach `motion-runs/<lauf>/assets/<thema>/` zu ziehen, und beide Ordner per `open` im Finder öffnen.
- Kundendaten: wenn ein Connector-Lesezugriff von einem Sicherheits-Check (personenbezogene Daten) blockiert wird, **nicht umgehen**; der Nutzer liefert das Material selbst oder erteilt die Berechtigung.

## 4. Freigaben, die vor Veröffentlichung fehlen können
- Schriftliches OK der gezeigten Kundenmarke (inkl. echter Personen-Fotos, Demo-Werte für Platzhalter).
- Lizenz für Musik/SFX: „YouTube-sicher“ heißt nicht „frei für Website oder Werbung“; generierte Musik: Lizenz des jeweiligen Anbieter-Plans prüfen.
- Fremde Logos (Modelle, Tools) nur als Nennung von Integrationen, die es gibt.

## 5. Ergebnis
Manifest-Abschnitt „Entscheidungen“ (Nutzer, aus dem Go zum Vorschlag) + „Abgeleitet“ (Claude, korrigierbar) + „Offen“. Der Navigator führt weiter (`navi status`).
