# Fallstricke (alle aus echten Läufen)

| Fallstrick | Folge | Regel |
|---|---|---|
| Auftrag „1:1 mit einem Videogenerator“ für eine UI-Demo | Text/UI zerfallen, ein 90-s-Film braucht ein Dutzend teurer Clips | Einwand (Grundsatz 3), Hybrid vorschlagen: Code + Generierung nur für Footage |
| 1:1-Kopie eines fremden Marken-Films zur Veröffentlichung | fremde Marke als eigene ausgegeben | Ziel im Referenz-Gate klären; 1:1 nur intern |
| ffmpeg-Szenenerkennung als Schnittliste | hell-auf-hell-Schnitte fehlen (oft der größere Teil) | Frame-Differenz + Vision-Agenten |
| Grob-Beats eines Videomodells als Wahrheit | falsche Szenen | nur Shot-Spec aus allen Frames |
| Funktionen „passend“ erfunden | unwahrer Produktfilm | Beleg-Spalte, Fakten-Gate |
| Erzähl-Reihenfolge umgestellt | Logikfehler (Freigabe vor Erstellung) | Blueprint auf Ursache und Wirkung prüfen |
| Ein Agent startet `hyperframes preview` im Projekt | `data-hf-id` in allen Dateien, Teil-Render als ganzer Film | verboten; nach Vorfall `grep` + Neurender |
| Teil-Render-Fensterdateien liegen herum | `npm run check` rot (`multiple_root_compositions`) | Fensterdatei erst nach Sperre anlegen; vor Check prüfen |
| Zwei Renders gleichzeitig | Rechner hängt | Sperre `/tmp/<lauf>-render.lock`, `nice`, `--workers 2` |
| Blöcke mit unterschiedlichem Hintergrund/Fensterinhalt | Sprung an der Naht | Nahtzustand an den Nachbar-Agenten übergeben, Naht Frame für Frame prüfen |
| Connector-Lesezugriff auf Kundendaten | vom Sicherheits-Check (personenbezogene Daten) blockiert | nicht umgehen; Nutzer liefert Material oder erteilt Berechtigung |
| `~/Downloads` lesen | „Operation not permitted“ (macOS-Datenschutz) | Nutzer zieht Dateien in den Lauf-Ordner; beide Ordner per `open` öffnen |
| Login-pflichtiges Reel | Download scheitert | nicht mit Cookies umgehen; Nutzer lädt selbst und gibt die Datei an |
| Platzhalter in echten Kunden-Assets (`[CODE]`) | wirkt unfertig | Demo-Werte im Original-Stil, im Manifest zur Bestätigung |
| Bibliotheks-Musik ohne Lizenzprüfung | Chart-Songs im Firmenfilm | nur lizenzierte Quellen; sonst generieren |
| Ein Sample für viele Einsätze | „immer derselbe Sound“ | Varianten + Pitch + Rotation |
| Musik nur am Ende | fühlt sich leer an, Referenz trägt durchgehend | Struktur der Referenz übernehmen (Intro, Drop, Pausen, Hits, Stopp) |
| Video ohne `+faststart` | Player zeigt Standbild | immer faststart; Web-Kopie < 30 MB |
| Agenten-Bericht ungeprüft weitergegeben | falsche „fertig“-Meldung | Stichprobe (Kontaktbogen) selbst ansehen |
| Musik/SFX bei einem Anbieter bestellt, der nur Sprache kann | Umweg, Zeitverlust | vorher Werkzeugkatalog des Anbieters prüfen |
| Mehr Features als Zweittext in bestehende Szenen gestapelt (Chips, Tags, Infokarten, Kindzeilen) | überladen, Botschaft verwaschen, „draufgeklatscht“ (echter Lauf, Revision 5) | **ein Feature pro Beat**: eine Aussage ≤ 6 Wörter + max. eine Stützzeile; was keinen Beat bekommt, geht in eine Langfassung; Ein-Blick-Test je Beat vor Auslieferung |
| Lesezeit per Zeitlupe/Zeitverzerrung über laufende Animation gestreckt | Standbilder statt Drift, Ruck an den Fensterkanten, gedehnte Glanzläufe und falsche Unschärfe (echter Lauf: 6,5 s Standbild in 8 Fenstern) | nie Zeitlupe als Lesezeit. Haltezeit nur, wo die Szenenlogik ruht, in ganzen Takten/Frames; Kamera, Glanzlauf, Pulse und Unschärfe laufen in neuer Zeit weiter (Drift ≥ 2 %/s) |
| Übersetzte Aussagen in die kurzen Einstellungen der Referenz gesetzt, mal oben, mal unten, in mehreren Größen | „Texte zu schnell“, das Auge sucht | Lesezeit-Formel, eine Lesezone, nie über UI, Film in ganzen Takten länger (`03-blueprint-und-wahrheit.md`) |
| Aussagen in UI-Schrift, klein und flach | „nicht hochwertig“, Versalhöhe ein Drittel der Referenz | Typo-System mit Stufen und Verlauf vor dem Bau (`09-qualitaets-dna.md`) |
| Jeder Block-Agent baut eigene Kurven, Easings, CSS-`blur()` | uneinheitlicher Rhythmus, Halte ohne Drift, „nicht mehr smooth“ | Bibliothek aus `templates/lib/` ist Pflicht; Blöcke definieren keine Easings |
| Viele Übergangsarten, Match-Cut mit Richtungsbruch, Doppelbelichtung | billig, unruhig | nur drei Übergangsarten (`05-bau-probe-parallel.md` §3) |
| Slot-Starts aus Zeitzugaben gerechnet, Sichtbarkeit an zwei Stellen gesteuert | Duplikat- und Blitzframes an Schnitten | ganze Frames, Rundung erst am Ende, eine Sichtbarkeits-Quelle; `scripts/qualitaet.py --frames` |
| Revision auf Revision gestapelt, keine Sicherung je Version | „die alte Version war besser“, Quellen nur zufällig im Scratchpad | `scripts/version-sichern.sh` je Version, beste Version als Basis, max. 3 Änderungen je Revision |
| Ton-Cues aus Referenz- oder Altzeiten | Effekte bis 2 s neben dem Bild | Cues nur aus `ereignisse.json` (R8) |
| Musik auf Bild-Frames gezwungen (Kacheln, Wiederholungen, Stille-Löcher) | Energieloch, hörbare Schleife, Hits in Stille | Musikschnitt-Regeln R1 bis R8 (`06-ton.md`) |
| Schluss aus mehreren Takten und Quellen zusammengestückelt | „hört sich vom Übergang nicht natürlich an“, vier Runden nur für das Ende | natürliches Ende aus einer Stelle des Takes (`06-ton.md` Schritt 4b), zwei Varianten + Hörtest |
| Ton nur nach Messwerten abgenommen | LUFS und Energiekurve grün, Ende trotzdem abgelehnt | Hörtest (`scripts/hoertest.mjs`, mit `--vergleich`) vor jeder Ton-Auslieferung |
| Lautheit auf dem WAV gemessen | True Peak über −1 dBTP nach AAC | auf der Web-Kopie messen, Limiter mit Reserve (ca. −3 dB) |
| Lade-/Leerzustände und unbeschriftete Icons als „Reduktion“ | „wirkt wie unbefüllte Platzhalter“ | weniger Elemente, nicht leere; jede Grafik mit echten Daten |
| Zweites Root-HTML (Langfassung) im Projekt-Ordner | `npm run check` rot (`multiple_root_compositions`) | `index-lang.html` in `film/_lang/`, nur zum Rendern kopieren |
| CTA-Band unter dem Film und Aufforderung auf der Endkarte | zwei Aufforderungen in einer Fassung | je Fassung genau eine Aufforderung (`07-qa.md`) |
| `hyperframes init` legt eine Projekt-Anweisung an, die `preview --background` empfiehlt | Agenten folgen ihr, `data-hf-id` in allen Dateien | Absatz „Skill geht vor“ oben in `film/CLAUDE.md` und `film/AGENTS.md` |
| Auf „gefällt mir nicht“ geraten und umgebaut | neue Fehler, Maßstab verloren | Diagnose mit 5 bis 8 Agenten und Synthese (`07-qa.md`) |
| Diagnose-Agenten mit eigenen Messdefinitionen | widersprüchliche Befunde (Stillstand 0,10 bis 0,73 s für dieselbe Szene) | alle mit `scripts/qualitaet.py` und denselben Parametern |
| Diagnose-Agent im Plan-Modus gestartet | kann seinen Bericht nicht schreiben | Diagnose-Agenten nie im Plan-Modus |
| Grauer Text auf grauer Statuspille | Kontrast 2,7 : 1, unlesbar | UI-Nahaufnahmen ≥ 4,5 : 1, Statuszeilen als weiße Karte mit Schatten |
| Bau-Agent im Hintergrund, Runde endet mit „Agent arbeitet noch“ | in Headless-/Remote-Sitzungen stirbt der Agent mit dem Rundenende; zwei Runden ohne Probe (Praxistest) | bauende Agenten im Vordergrund (`run_in_background: false`) oder vor dem Ende der Antwort abwarten (SKILL.md „Agenten-Einsatz“) |
| Hauptlauf schreibt selbst Kompositionscode ohne HyperFrames-Skills | Regeln aus `hyperframes-core`/`-keyframes` fehlen | vor jedem Composition-Code `hyperframes`, `hyperframes-core`, `hyperframes-keyframes` laden, auch im Hauptlauf |
| Hängender Befehl mit `pkill -f`/`killall` und Muster beendet | trifft fremde Prozesse des Nutzers (Praxistest: `pkill -f "cat" -U $(id -u) -x`) | nur die eigene PID beenden (`kill <pid>`), nie `pkill`/`killall` mit Mustern; temporäre Dateien nur im Lauf-Ordner, nie `/tmp/x` |
| Code-only-Route ohne Effekt-Quelle | still „nur Musikbett“, R11 leer, Zusatzrunde nur für Effekte | Zutat „Effekte“ in G1 fragen; ohne Quelle Effekte im Code synthetisieren |
| Mitgebrachte Musik mit anderem Tempo als die Referenz | Raster improvisiert, Kick-Phase −0,47 (Off-Zählzeit), Sprünge an Musik-Nähten | Takt-Karte der Musik ist das Raster, Kick-Phase am Musik-Entwurf prüfen, Hörtest an jeder Naht (`05` §2, `06` Schritt 4) |
| Gemini 503/429 ohne Wiederholung, Free-Tier-Kontingent | Analyse und Hörtest brechen ab, „Modell überlastet“ statt „Kontingent erschöpft“, Auslieferung ohne Hörtest | `scripts/gemini.mjs` wiederholt und nimmt `GEMINI_MODEL_FALLBACK`; Abrechnung aktivieren; ohne Hörtest heißt es „Bild fertig, Hörtest offen“ |
| OpenCV fehlt, R5/R6 „nicht gemessen“ | Film ohne Bewegungsmessung ausgeliefert, kein Bewegungs-Maßstab der Referenz | OpenCV ist Pflicht (`setup_check.sh` ✗); ★ nicht gemessen = rot |
| Referenz-Frames mit `fps=3` gezogen und Zeit aus der Bildnummer gerechnet | bei 24 fps 0,125 s Versatz, Analyse-Agenten mit falschen Zeiten | Zeiten nur aus `analyse/frames/zeiten.csv` (`hole-referenz.sh`) |
| Vergleich mit gemeinsamer fps für Referenz und Film | 24-fps-Referenz gegen 30-fps-Film: Frames und Schnittliste daneben | `vergleich.py` liest beide Raten aus den Dateien und rechnet um |
| Version ohne Zeitpläne gesichert | Version nicht wiederherstellbar (`plan.js`, `cues.json`, `ereignisse.json` fehlten) | `version-sichern.sh` sichert Projektwurzel-`*.js`/`*.json`, `assets/sfx/`, `ereignisse.json`, `musik/` |
| Rubrik grün, Film sichtbar leer (lange Creme-Flächen, 6-s-Endkarte, 23 % über Brief) | „bestanden“ ohne Agentur-Dichte | `qualitaet.py --fuellung`, Endkarte ≤ 2 Takte, Länge gegen Brief, Seite-an-Seite-Kontaktbogen mit der Referenz (`07-qa.md`) |
| Terminal-, Stütz- und Endkarten-Zeilen mit 30 px | im Handy-Feed bzw. Kontaktbogen „kaum lesbar“, Rubrik trotzdem grün, Nutzer musste es melden | Lesetext ≥ 32 px (`09` §2), `qualitaet.py --text`, Bogen in 1/3 Größe ansehen; Deko nur mit `deko`-Ereignis |
| Kein Vorbild, Stilwörter statt Hilfe beim Finden | sauberer, aber schlichter Film, untere Bildhälfte leer (13 % Zeilen mit Inhalt) | Vorbild als erste, geführte Frage (`01` §0); ohne Vorbild gelten 35 % Bildfüllung als Pflicht |
| Hörtest nur vom Ersatzmodell, Stand trotzdem „fertig“ | Ersatzmodell hörte Voice-Overs und Musikschnitte, die es nicht gab | „fertig“ nur mit Hauptmodell; sonst „Hörtest eingeschränkt, bitte selbst hören“; Widerspruch per Hüllkurven-Gegenprobe; Kontingent vorher mit `setup_check.sh --gemini` prüfen |
| `pip install --user` auf Homebrew-Python | `externally-managed-environment`, OpenCV fehlt, Setup-Check nannte einen Befehl, der scheitert | `setup_check.sh`/`install.sh` erkennen PEP 668 und nennen `--user --break-system-packages` mit Erklärung (`SETUP.md` „Python-Pakete“) |
| Zwei Werkzeuge messen die Kick-Phase verschieden (+0,02 gegen −0,46) | Regel „bei ± 0,5 korrigieren“ beliebig | eine Methode `scripts/ton/kick.py` in beiden; korrigiert wird nur bei „halber Schlag daneben“ |
| Kurzer Film (16 s), Probe = ganzer Film | 32 min und ca. 8,5 $, bevor der Nutzer etwas sah; selbst gesehener Mangel nur gemeldet | unter 20 s: Probe = erste 5 bis 6 s; bekannte Mängel vor G4 beheben (`05` §1) |
| Brief „15 bis 20 s“ als eine Zahl gemessen | R12 ✗ oder ✓ je nach gewählter Zahl | `--brief 15-20` bzw. `briefLaenge: [15, 20]`; Brief-Länge und freigegebene Länge getrennt im Manifest |
| Kostentabelle im Manifest angelegt, nie gefüllt | Nutzer sieht die Kosten nicht | nach jeder Phase eintragen, „unbekannt“ erlaubt, leer nicht; Summe in der Auslieferung |
| Ton-Agent kopiert nach `/tmp/x` | Dateien außerhalb des Lauf-Ordners, Regel stand nur in Vorlage B | Regel für alle Agenten-Vorlagen: nichts außerhalb `<lauf>`, Temporäres nach `<lauf>/film/_tmp/` |
| Bibliothek kannte `briefLaenge` nicht | Agent änderte `lib/core.js` selbst | `MV.configure({ briefLaenge })` schreibt den Kopf von `ereignisse.json` (Zahl oder Spanne) |
| Eigenes `nice` vor einen Befehl gesetzt, der schon unter `sperre.sh` läuft | `hyperframes render` bricht sofort mit `EACCES … uv_os_setpriority` ab (doppeltes nice, 20) | `sperre.sh` setzt `nice -n 10` selbst; innerhalb der Sperre nie ein zweites `nice`, auch nicht in `zsh -c`-Ketten |
| Kosten in Tokens geschätzt, Regie-Schleife ohne festes Limit | 95,76 $ für 41 s Film (Plan „20 bis 35 $ + 5 bis 7 Mio. Tokens“), Sitzung meldete „9,1 Mio. Tokens“, Wochenlimit des Abos riss den Lauf mitten im Bau | Kosten nur in $ (`navi kosten`), Budget mit `navi budget`, Station 6 stoppt mit Rückfrage; Regie „voll“ = 2 Runden + 1 Prüfrunde, Kritiker gebündelt, Deckel je Agent (`agent-prompts.md`) |
| Ohne eigene Screens jede Szene als Kachel auf Weiß | 8 von 11 Szenen gleich gebaut, Fotos, Menschen und Geräte des Vorbilds ersatzlos weg; Messwerte grün, Film ärmer | öffentliche Demo selbst suchen (`produkt-lesen.mjs`), Spalte „Bildwelt“ im Vorschlag, höchstens ein Drittel „Kachel“ (`09` §5, Katalog P07) |
| Standbilder im Vorschlag aus der Bibliotheks-Demo | Nutzer gab sein Go auf eine fremde Oberfläche („Wochenplan“, deutsche Aufgaben) | `standbilder.mjs` setzt eigene Screens, sonst die öffentliche Demo ein; nur ohne jedes Material das Look-Muster, dann so sagen |
| `npx hyperframes` ohne Version | gerendert mit zwischengespeicherter 0.8.147 statt gepinnter 0.8.143, erst in Runde 4 bemerkt | jeder Aufruf über `scripts/hf.sh` (eine Stelle: package.json-Pin, sonst `scripts/hyperframes-version`) |
| Lesetext-Messung zerlegt große Aussagen in Teilzeilen | R4 ★ in allen Runden rot, jede Runde per Einzelbild „Messartefakt“ begründet | `qualitaet.py --text` misst große Schrift auf verkleinertem Bild und zählt Bruchstücke darin nicht |
| Navigator-Ampeln veraltet, Hörtest nicht gefunden | Station 1 und 2 blieben gelb, obwohl nachgeholt; Station 7 rot, bis der Hörtest von `regie/` nach `film/renders/` kopiert war | `navi status`/`weiter` prüfen erledigte Stationen neu; Hörtest-Suche auch unter `regie/**` |

<!-- Warum: Alle Zeilen ab „Lesezeit per Zeitlupe“ bis „Grauer Text auf grauer Statuspille“ stammen aus den Revisionen 5 bis 11 desselben echten Laufs (Gap-Audit nach der Abnahme); die Zeilen danach aus zwei Praxistests mit fremden Nutzern (A: Code-only mit Vorbild, eigene Musik, Headless-Sitzung; B: ohne Vorbild, Terminal-Teaser für ein CLI-Tool, eigene Musik; beide 09.10.2026), die Zeile zu `nice` aus einem echten Lauf (11.10.2026, Render brach mit doppeltem nice ab), die letzten sechs aus dem Beweistest C (nur Vorbild und Produkt-Link, Analytics-Produkt, 09. bis 11.10.2026). Die Spalte „Folge“ ist jeweils der beobachtete Schaden; die Herleitung steht als Kommentar an der Regel in der genannten Datei. -->
