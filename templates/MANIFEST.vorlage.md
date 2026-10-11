# <Titel des Films>

Stand: <TT.MM.JJJJ> · Lauf-Ordner: `motion-runs/<datum>_<slug>/` · Beste Version bisher: <vN>

## Referenz
- Quelle: <URL / Datei> · Kennzahlen (Plays, Likes), falls vorhanden
- Datei: `analyse/referenz.mp4` · <B×H> · <fps> · <Dauer> · Ton: <ja/nein>
- Schnitte (gemessen + korrigiert): <Liste in s>
- Analysen: `analyse/shot-spec-p1..N.md`, `analyse/ton-referenz.md`

## Entscheidungen (Nutzer, <Datum>)
| Frage | Entscheidung |
|---|---|
| Ziel | |
| Route | |
| Produkt / Thema | |
| Absender / Branding | |
| Format | |
| Sprache | |
| Länge laut Brief (wörtlich, Zahl oder Spanne, z. B. „15 bis 20 s“) | |
| Freigegebene Länge (G2, in ganzen Takten) | |
| Fassungen (Kurz / Lang, Kanal je Fassung) | |
| Einsatz / CTA (genau eine Aufforderung je Fassung: Band oder Endkarte) | |
| Demo-Inhalt | |
| Generatoren (angeschlossen) | |
| Effekte (Bibliothek / Generator / im Code synthetisiert / keine) | |
| Musik (mitgebracht: BPM und Takt-Eins der Musik sind das Raster / generiert / keine) | |
| Regie-Schleife (voll: 3 gebündelte Kritiker, 2 Runden + Prüfrunde nach dem Ton · spar: 1 Kritiker, 1 Runde) | |
| Budget Claude-Nutzung in $ (`navi budget`, Plan aus `navi kosten`) | |
| Go zum Vorschlag (wörtlich, Datum) | |

## Maßstab
<!-- Warum: Ohne gemessene Kennzahlen der Referenz und eine vom Nutzer benannte Maßstab-Szene gab es keine Messlatte für „hochwertig“. -->
| Größe | Referenz | Maßstab-Szene (<Name, Zeit>) | Soll für den Film |
|---|---|---|---|
| Stand-Anteil / längster Stand | | | ≤ 5 % / ≤ 0,4 s |
| Kamera-Drift (%/s) | | | ≥ 2 |
| Einstellungslänge (Mittel, Spanne) | | | |
| Ereignisdichte (Ereignisse/s) | | | ≥ 2,5 |
| Versalhöhe Aussagen (% Bildhöhe) | | | ≥ 8 (Stufe H) |
| Kleinste Lesezeile (px bei 1080 p) | | | ≥ 32 (Deko mit `deko`-Ereignis) |
| Zeilen mit Inhalt, Median (%) | | | ≥ 35, auch ohne Vorbild |
| BPM, Takt-Anker | | | |
- Maßstab-Szene ist ab Eintrag Sperrzone (nicht mehr ändern). Typo-Maßstab aus G4: <Szene / Datei>.

## Abgeleitet (Claude, korrigierbar)
- 

## Generierung (je Stufe: Anbieter · Modell · Umfang · Kosten geschätzt/gemessen · Job-Datei · Go am <Datum>)
- 

## Modellkosten je Phase
<!-- Warum Pflicht: Im Praxistest B blieb die Spalte „Modell-Nutzung“ in allen Zeilen leer, obwohl die Tabelle da war. -->
<!-- Warum: Ein Praxislauf (31-s-Film) kostete 35,6 $ Modell-Nutzung, davon 8,4 $ allein für die Analyse; der Nutzer sah das vorher nirgends. -->
<!-- Warum $ statt Tokens: Im Beweistest stand hier „ca. 9,1 Mio. Tokens“, der Client zählte 95,76 $; das Budget (navi) liest nur $-Werte. -->
Pflicht: nach jeder Phase und jeder Regie-Runde eine Zeile **in $** füllen (Wert laut Client: Claude Code `/cost`, ohne Oberfläche `total_cost_usd` der JSON-Ausgabe; sonst „ca.“ nach den Stückkosten in `references/00-navigator.md` „Kosten und Budget“). Nie nur Tokens. „unbekannt“ ist erlaubt, leer nicht. `navi` summiert die Zeilen gegen das Budget. Gemini-Aufrufe mit Modell (Haupt- oder Ersatzmodell).

| Phase | Claude-Nutzung in $ (laut Client oder ca.) | Gemini-Aufrufe | Notiz |
|---|---|---|---|
| Stationen 1 bis 3 (Analyse, Produkt, Material) | | | |
| Station 4 Vorschlag | | | |
| Station 5 Probe | | | |
| Station 6 Bau | | | |
| Regie r1 | | | |
| Regie r2 | | | |
| Station 7 Ton + Hörtest | | | |
| Regie Prüfrunde (nur voll) | | | |
| Stationen 8 und 9 | | | |
| **Summe** | | | |

## Versionen
<!-- Warum: Revisionen wurden auf einer schlechteren Basis gestapelt, bis der Nutzer eine ältere Version als beste nannte; deren Quellen gab es nur zufällig. -->
| Version | Basis | Änderungen (max. 3) | Feedback des Nutzers wörtlich | Sicherung | Render | QA |
|---|---|---|---|---|---|---|
| v1 | – | | | `versionen/v1/` (`scripts/version-sichern.sh`) | `renders/…_web.mp4` | Rubrik R1 bis R12: … |

## Ton
- Take: <Datei> · Segmentplan: `film/ton-plan.json` (aus `templates/ton-plan.vorlage.json`) · Cues: `film/cues.json` (aus `templates/cues.vorlage.json`, Zeiten nur aus `ereignisse.json`)
- Taktraster: <BPM> BPM, Takt-Eins <s> (Quelle: Musik des Nutzers / Referenz) · Kick-Phase am Musik-Entwurf: <Urteil aus kick.py: auf dem Raster / halber Schlag daneben / zweideutig / unklar, Phase>
- Musikschnitt-Regeln R1 bis R8: <✓/✗ je Regel> · Ende: Variante <A/B>, Hörtest `renders/hoertest-<version>.md` (Ende und jede Musik-Naht; Modell: Haupt- oder Ersatzmodell; fehlt er: „Bild fertig, Hörtest offen“, nur Ersatzmodell: „Hörtest eingeschränkt“)
- Lautheit auf der Web-Kopie nach AAC: <LUFS> / <dBTP>

## Fassungen und Auslieferung
| Fassung | Datei | Länge | Kanal | Aufforderung (Band oder Endkarte) | Befehl |
|---|---|---|---|---|---|
| Kurz | | | | | |

## Navigator
<!-- Schreibt scripts/navi.mjs bei jedem Wechsel (Station grün/gelb → nächste, Go, übersprungen mit Grund, zurück). Stand jederzeit: node <skill-dir>/scripts/navi.mjs status -->

## Stand und nächster Schritt
- 

## Offen
- Freigaben (Kunde, Lizenzen), Fakten, Abnahmen
