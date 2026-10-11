# Navigator: neun Stationen, feste Schwellen

Egal wer den Skill nutzt: Er wird durch dieselben neun Stationen geführt, damit das bestmögliche Ergebnis herauskommt. Der Nutzer bringt ein Vorbild-Video und den Link zu seinem Produkt; der Skill schlägt den Film im Chat vor, holt EIN Go und baut dann mit allen Qualitätsprinzipien. Marke, Ton und Stil sind je Nutzer verschieden, der Weg nicht.

Werkzeug: `node <skill-dir>/scripts/navi.mjs` (Node 18+, keine Abhängigkeiten). Zustand in `<lauf>/navi.json`, jede Änderung als Zeile im Manifest unter „## Navigator“.

<!-- Warum ein Navigator: In zwei Praxistests mit fremden Nutzern (09.10.2026) bestanden beide Filme die Rubrik und blieben trotzdem sichtbar leerer als ihr Vorbild; die Nutzer sagten „sieht gut aus“, und der Lauf endete bei v1. Was im Ursprungslauf den Unterschied machte, lässt sich benennen und als Schwelle prüfen: starkes Vorbild gemessen statt nachempfunden, echtes Material statt Platzhalter, ein Feature pro Beat, Qualität als feste Zahlen, Kritik-Runden mit Rückweg zur besten Version, Ohr und Auge von außen. Ein Navigator macht daraus Stationen, an denen niemand vorbeikommt, ohne es zu merken. -->

## Befehle

| Befehl | wofür |
|---|---|
| `navi init <lauf> [--profi] [--regie voll\|spar] [--budget <usd>] [--vorbild <url\|datei>] [--produkt <url>] [--brief 15-20] [--titel "…"]` | Lauf anlegen: Ordner, Manifest aus der Vorlage, `navi.json`; gibt es den Lauf schon, wird nur der Stand gezeigt |
| `navi status [--json]` | eine Zeile „Station X von 9: …, nächster Schritt: …“, Kosten bisher gegen das Budget und die Ampel je Station; erledigte Stationen werden neu geprüft (Nachgeholtes wird grün, nie rückwärts rot); Einsteiger zusätzlich „was hier passiert, warum“ |
| `navi kosten [--laenge <s>]` | Kostenplan in $ je Phase für „voll“ und „spar“ (Länge aus Brief oder Vorbild, sonst 40 s); Grundlage für Erste Antwort und Vorschlag |
| `navi budget <usd> ["<Wortlaut>"]` | Budget festhalten (Station 4) bzw. nach der Rückfrage erhöhen; erhöhen über ein erreichtes Budget nur mit dem Wortlaut des Nutzers |
| `navi pruefen [--station N] [--messen]` | maschinelle Schwellen der Station prüfen; `--messen` startet fehlende Messungen (`qualitaet.py`) selbst unter der Render-Sperre |
| `navi weiter [--hoertest-offen "<Grund>"]` | nur bei Grün (Gelb geht mit Vermerk im Manifest); sonst die Liste, was fehlt, mit Befehl zum Beheben, Exit 1 |
| `navi go "<Wortlaut>"` | Go zum Vorschlag (Station 4) bzw. Abnahme (Station 8) wörtlich festhalten; nur auf die ausdrückliche Antwort des Nutzers |
| `navi ueberspringen <N> --grund "…"` | Profis: Station auslassen, Grund steht im Manifest; 6 und 9 nie, 4 nur mit festgehaltenem Go |
| `navi zurueck <vN>` | gesicherte Version als Basis zurückholen; der Stand davor wird vorher als `versionen/vor-<vN>-<zeit>/` gesichert, nichts wird gelöscht |
| `navi zurueck <N>` | auf Station N zurückspringen (z. B. Vorschlag ändern); spätere Stationen sind wieder offen, ein neues Go ist nötig |
| `navi modus einsteiger\|profi` | Ausführlichkeit umschalten |
| `navi regie voll\|spar` | Regie-Schleife umstellen (Station 6); die Wahl aus dem Vorschlag muss hier stehen |

Den Lauf findet `navi` selbst (`--lauf <pfad>`, sonst `./navi.json`, `../navi.json`, `motion-runs/*/navi.json`). Ampel: **grün** = alle Schwellen erfüllt · **gelb** = Pflicht erfüllt, ein Hinweis offen (weiter erlaubt, wird vermerkt) · **rot** = Pflicht fehlt · **übersprungen** (mit Grund).

## Erste Antwort im Lauf

Drei Sätze, dann die eine Frage (Wortlaut anpassen, Inhalt nicht):
> „So läuft es: Du gibst mir ein Video, das dir gefällt, und den Link zu deinem Produkt. Ich vermesse das Vorbild, lese deine Produktseite und schlage dir den Film Szene für Szene mit Standbildern vor; nach deinem Go baue ich ihn mit Probe, Messungen und Kritik-Runden und frage dich am Ende fünf kurze Fragen zur Abnahme. Ein 40-s-Film kostet an Claude-Nutzung ca. 30 bis 40 $ mit voller Kritik oder ca. 15 bis 20 $ in der Sparfassung (Wahl im Vorschlag); im Claude-Abo zählt das gegen dein Wochenlimit, ein voller Lauf kann einen großen Teil davon verbrauchen. Kostenpflichtige Generierung frage ich vorher einzeln mit Preis ab.
> Schick mir bitte das Vorbild (Link oder Datei) und den Link zu deinem Produkt.“

Fehlt nur eins von beiden, nur danach fragen. Danach `navi init motion-runs/<datum>_<slug> --vorbild … --produkt …` und los. Die Zahlen im zweiten Satz kommen aus `navi kosten` (bei anderer Länge die dortige Spanne nennen, immer in $, nie in Tokens).

<!-- Warum $ statt Tokens und der Satz zum Wochenlimit: Im Beweistest (11.10.2026) versprach der Vorschlag „20 bis 35 $ + 5 bis 7 Mio. Tokens“, die Sitzung meldete am Ende „ca. 9,1 Mio. Tokens“; der Client zählte 95,76 $, und das Wochenlimit des Abos riss den Lauf mitten im Bau ab. -->

## Die Stationen im Einzelnen

Jede Station: **Eingang** (was da sein muss) · **Der Skill tut** · **Schwelle** (was `navi pruefen` maschinell prüft) · **Nächster Schritt** (Satz an den Nutzer, einfache Worte) · **Fragen nur, wenn** (sonst wird nicht gefragt).

### 1 Vorbild
- **Eingang:** Video-Link oder Datei. Ohne: §0 in `01-referenz-gate.md` (Film-Typen, Suchbegriffe, Bildschirmaufnahme bei YouTube-Sperre).
- **Der Skill tut:** `hole-referenz.sh`, Shot-Spec (Vorlage A, Sparregel), `ton-referenz.mjs`, Kennzahlen mit `qualitaet.py … --out analyse/kennzahlen-referenz` (`02-analyse.md`).
- **Schwelle:** `analyse/referenz.mp4`, `analyse/frames/zeiten.csv`, `analyse/shot-spec-p*.md`, Kennzahlen mit gemessener Bewegung (ohne OpenCV rot). Ton-Analyse fehlt (Gemini-Kontingent) = gelb.
- **Nächster Schritt:** „Ich vermesse dein Vorbild: Tempo, Kamera, Schrift, Ton.“
- **Fragen nur, wenn:** kein Vorbild da ist oder das Holen scheitert.
- **Ohne Vorbild** (nur auf ausdrücklichen Wunsch): `navi ueberspringen 1 --grund "ohne Vorbild"`; im Vorschlag 2 bis 3 Stil-Richtungen als Standbilder, ehrlich „schlichter“.

### 2 Produkt
- **Eingang:** Produkt-Link. Ohne öffentliche Seite: Material vom Nutzer und `templates/marke.vorlage.json`.
- **Der Skill tut:** `node <skill-dir>/scripts/produkt-lesen.mjs <url> <lauf> [--auch <feature-seite>]`. Ergebnis in `produkt/`: `funktionen.json` (Kandidaten mit Zitat und URL), `marke.json` (Farben, Schrift, Logo, `geprueft: false`), `screens/`, `PRODUKT.md`. Danach sichtet der Skill jede Kandidatin: `belegt` (das Zitat trägt die Funktion), `verworfen` (Marketing, Navigation, Doppel) oder offen lassen; was der Nutzer bestätigt, wird `nutzer` mit Quelle „Nutzer, <Datum>“. Ist der Absender eine Kundenmarke, gilt nur deren Branding.
- **Schwelle:** Marke vollständig (Hintergrund, Tinte, Akzent als Hex, Schriftfamilie); mindestens 3 Funktionen mit Status `belegt` oder `nutzer`, Zitat und Quelle. Gelb: Kandidaten ungesichtet, Marke nicht bestätigt, Kontrast schwach, kein Logo.
- **Nächster Schritt:** „Ich lese deine Produktseite und sammle, was dein Produkt nachweislich kann.“
- **Fragen nur, wenn:** die Seite gesperrt ist (Login, Bot-Sperre, robots.txt: `produkt/FEHLT.md` zeigen) oder weniger als 3 Funktionen belegbar sind.
- **Grenzen:** nur öffentliche Seiten, keine Logins, keine Formulare, keine Cookies, robots.txt wird beachtet. Gesperrt heißt: nicht umgehen, sondern den Nutzer bitten (Liste in `FEHLT.md`).

### 3 Material
- **Eingang:** was in `assets/` (vom Nutzer) und `produkt/` (von der Seite) liegt.
- **Der Skill tut:** Material-Score (navi rechnet ihn bei jedem `pruefen`):

| Teil | Punkte |
|---|---|
| echte Screens oder Produktbilder vom Nutzer (`assets/screens/`, `assets/bilder/`) | 0 · 1 bis 2 → 2 · ab 3 → 4 |
| Logo als Datei (`assets/logo/`, `produkt/logo.svg`) | SVG 2 · Bild 1 |
| Produktseite gelesen (Screens und Text in `produkt/`) | 1 |
| Beispieldaten (`assets/daten/`, `produkt/beispieldaten.*`) | 1 |
| belegte Funktionen (Zitat und Quelle) | 1 bis 2 → 1 · ab 3 → 2 |

- **Öffentliche Demo zuerst selbst suchen:** `produkt-lesen.mjs` sucht auf der Produktseite Links wie „Live demo“, „Try the demo“, „Playground“, „Sandbox“ (gleiche Domain, nie Formulare wie „Book a demo“, nie Login oder Konto) und holt den eindeutigen Treffer als `produkt/screens/demo-*`; Kandidaten stehen in `produkt/demo.json`, holen mit `--demo <url>`. Demo-Screens zählen wie 1 bis 2 eigene Screens (2 Punkte): echte Oberfläche mit Beispieldaten. Findet das Skript nichts, kurz selbst schauen (Footer, „Product“, Doku mit eingebetteter Live-Ansicht) und den Nutzer fragen, ob es eine öffentliche Ansicht gibt.
- **Ersatz-Bildwelt planen:** Für jede Szene des Vorbilds mit Foto, Mensch oder Gerät steht im Vorschlag eine echte Bildwelt (Spalte „Bildwelt“): Desktop-Fenster mit dem echten Screen, Handy mit dem Screen, Produktfoto des Nutzers, Bild von der Website, Live-Daten der Demo. „Kachel auf leerem Grund“ ist nie der Standard, höchstens ein Drittel der Szenen.
- **Schwelle:** mindestens 7 von 10. Nur mit Website-Screens erreicht ein Lauf höchstens 5; mit öffentlicher Demo und belegten Funktionen 7.

<!-- Warum Demo und Bildwelt: Im Beweistest fand die Sitzung das öffentliche Live-Dashboard selbst, der Skill sah es nicht vor. Fotos, Menschen und Geräte aus dem Vorbild wurden ersatzlos durch Kacheln ersetzt: 8 von 11 Szenen „Kachel auf Weiß“; beim Vergleich lag der abgenommene Ursprungsfilm klar vorn bei Bildfüllung und Dichte. -->
- **Nächster Schritt unter der Schwelle** (genau so fragen): „Schick mir bitte 3 bis 5 Screenshots deines Produkts, je Ansicht ein Bild, möglichst 1920 px breit, in den Ordner `assets/screens/` (ich öffne ihn dir). Warum: Mit echten Screens wird der Film konkret; ohne sie baue ich Oberflächen nach, das wirkt generischer.“ Ordner per `open` im Finder öffnen (macOS-Datenschutz: `01-referenz-gate.md` §3).
- **Bewusst ohne:** `navi ueberspringen 3 --grund "…"`; im Vorschlag steht dann „wirkt generischer“.

### 4 Vorschlag (einziges Pflicht-Go vor dem Bau)
- **Eingang:** Stationen 1 bis 3.
- **Der Skill tut:** `templates/vorschlag.vorlage.md` nach `<lauf>/VORSCHLAG.md` und füllen: je Beat des Vorbilds eine Szene (Vorbild-Beat mit Zeit → Funktion mit Beleg → Aussage ≤ 6 Wörter → Bildidee aus echtem Material), Marke, Ton, Länge, Fassungen, Aufforderung, **Annahmen** (alle Zutaten aus `01-referenz-gate.md` §1, die der Auftrag offen ließ, als Empfehlung mit Warum statt als Fragerunde), offene Fakten (höchstens 7), Kosten mit der Wahl der Regie-Schleife (voll oder spar, Zeit und Kosten nennen, „voll“ empfehlen). Standbilder: `node <skill-dir>/scripts/standbilder.mjs <lauf>` setzt das echte Material ein (eigene Screens, sonst öffentliche Demo, sonst Website) in der Marke: Desktop-Fenster, Nahaufnahme, Handy, Aussage mit Logo; erst ansehen (`vorschlag/standbilder/uebersicht.jpg`), dann zeigen. Nur ohne jedes Material kommt das Look-Muster der Bibliotheks-Demo (`standbilder.json`: `"quelle": "demo"`); dann sagen, dass die Oberfläche noch fehlt. Kosten: `navi kosten` in den Abschnitt „Kosten“ übernehmen (Spanne in $ je Stufe, Satz zum Wochenlimit), nach dem Go `navi budget <Summe der gewählten Stufe>`. Im Chat: Szenen-Tabelle, Standbilder, Annahmen, offene Fakten, Kosten, dann die eine Frage nach dem Go. Die Standbilder beantworten zugleich die frühere Probe-Frage „Ist diese Aussage-Typo der Maßstab?“. Nach dem Go: offene Fakten mit den Antworten als Beleg eintragen, `marke.json` auf `geprueft: true`, `BLUEPRINT.md` (`03-blueprint-und-wahrheit.md`) für den Bau ableiten, Routen und Generierung nach `04-routen-und-werkzeuge.md`.
- **Schwelle:** keine `<…>` mehr, mindestens 2 Szenen, jede Aussage ≤ 6 Wörter, jede Szene mit Beleg und Bildwelt, höchstens ein Drittel „Kachel“ (außer „Kachel (wie Vorbild)“), 2 bis 4 Standbilder in `vorschlag/standbilder/`, Budget gesetzt, Go wörtlich festgehalten (`navi go "…"`). Gelb: Belege mit „? offen“, Standbilder nur aus der Demo-Bibliothek, `BLUEPRINT.md` fehlt noch.
- **Nächster Schritt:** „Schreib ‚Go‘, oder ‚Go, aber …‘ mit deiner Änderung in einem Satz.“ Ändert der Nutzer etwas, Vorschlag anpassen, Standbilder neu, erneut fragen.
- **Generierung:** Stehen Prompts, Anbieter, Modell, Umfang und Preis wörtlich im Vorschlag, deckt das Go sie ab; sonst eigenes Go vor der ersten kostenpflichtigen Generierung (Grundsatz 4, G3/G5).

### 5 Probe
- **Eingang:** Go, `BLUEPRINT.md`.
- **Der Skill tut:** Probe nach `05-bau-probe-parallel.md` §1 (unter 20 s Film: erste 5 bis 6 s), `lib/marke.css` aus `produkt/marke.json` (`scripts/marke-tokens.mjs`), Messung `qualitaet.py --bewegung --frames --fuellung --text` gegen das Vorbild, Seite-an-Seite-Vergleich, eigene Mängel vor dem Zeigen beheben (höchstens 2 Korrektur-Renders, Kosten-Deckel der Probe ca. 4 $).
- **Schwelle:** Render `film/renders/*probe*.mp4`, Messung jünger als der Render, kein ★ rot, höchstens 2 andere rot. Gelb: Seite-an-Seite-Vergleich fehlt.
- **Nächster Schritt:** „Hier die ersten Sekunden als Zwischenstand; ich baue weiter.“ Gewartet wird nur, wenn der Nutzer im Vorschlag „Probe abwarten“ gewählt hat (Probe-Blick, früher G4). Meldet er sich später zur Probe, geht das als Befund in die nächste Regie-Runde. Ohne Zwischenstand-Kanal (Sitzung ohne Oberfläche, `claude -p`) steht die Probe nur im Manifest; nicht warten.

### 6 Bau + Regie-Schleife
- **Eingang:** Probe und Bibliothek.
- **Der Skill tut:** Bibliothek, Ereignisliste, Bauanleitung, Blöcke parallel (`05` §2 bis §4); nach jedem Gesamt-Render die Regie-Schleife (`10-regie-schleife.md`, Katalog `11-einwand-katalog.md`, Vorlagen G und H): gebündelte Kritiker, Synthese im Hauptlauf mit höchstens 3 Änderungen, Besser-Regel, Rückweg zur besten Version (`navi zurueck <vN>`).
- **Regie voll oder spar** (Wahl im Vorschlag, `navi regie …`), Planwerte für einen 40-s-Film:

| | Kritiker je Runde | Runden | Zeit | Claude-Nutzung Regie (Plan) |
|---|---|---|---|---|
| **voll** (Empfohlen) | 3 gebündelt: Message + Überladung, Typo + Bewegung, Ton + Marke (Vorlage G, je zwei Linsen, höchstens 6 Befunde) | genau 2 vor v1, dazu 1 Prüfrunde nach dem Ton (Station 7, Änderungen nur für „hoch“) | je Runde 15 bis 30 min | ca. 16 $ (je Runde ca. 7 $, Prüfrunde ca. 2 $) |
| **spar** | 1 mit allen sechs Linsen (Vorlage G, höchstens 8 Befunde) | 1, keine Prüfrunde | ca. 15 min | ca. 4 $ |

  Synthese (Vorlage H) macht der Hauptlauf selbst; umgesetzt wird mit höchstens 2 Agenten je Runde (Änderungen je Block gebündelt). Besser-Regel und höchstens 3 Änderungen gelten in beiden. „spar“ heißt weniger Kritik, nicht weniger Messung: Rubrik und Schwellen bleiben gleich. Mehr Runden gibt es nicht; was danach offen ist, geht als „bekannt, nicht gelöst“ in die Auslieferung oder als Frage in die Abnahme.
  Vor jeder Runde `navi pruefen`: Ist das Budget erreicht, stoppt Station 6 (Rückfrage unten, „Kosten und Budget“).
- **Schwelle:** `<lauf>/ereignisse.json` (Schema 1, mit Aussagen), Film gerendert, Messung vollständig (R4 Lesetext, R5, R7, R8; alle Messungen desselben Renders zählen zusammen, auch aus `regie/rK/qualitaet/`), Bild-Kriterien R1 bis R8 bestanden, mindestens eine Version gesichert, vor der ersten Fassung 2 Regie-Runden bei „voll“, 1 bei „spar“ (`regie/rK/REGIE.md`), je Runde eine Kostenzeile in $, Budget nicht erreicht. Gelb: mehr Runden als erlaubt, Kostenzeilen in Tokens, Budget zu 80 % verbraucht.
- **Nächster Schritt:** „Ich prüfe den Film jetzt wie ein strenger Kunde und verbessere ihn, bevor du ihn siehst.“

### 7 Ton
- **Eingang:** Film, Ereignisliste, Ton-Analyse des Vorbilds.
- **Der Skill tut:** `06-ton.md` Schritte 1 bis 9 (Quelle aus dem Vorschlag, Musik nach den Schnitt-Regeln, Effekte aus der Ereignisliste, natürliches Ende, Mix, Hörtest Ende und jede Musik-Naht).
- **Schwelle:** `compositions/audio.html`, R9 und R10 ohne ★ rot, eine Hörtest-Datei jünger als der letzte Render (gesucht unter `film/renders/hoertest*.md` und `regie/**/hoertest*.md`; 5 min Spielraum). Nur Ersatzmodell = gelb (Stand höchstens „Hörtest eingeschränkt“). Regie „voll“: danach die Prüfrunde nach `10-regie-schleife.md` §1, Ablage `regie/pruefung/` (fehlt sie: gelb). Gemini nicht erreichbar: `navi weiter --hoertest-offen "<Grund>"`, Stand dann „Bild fertig, Hörtest offen“.
- **Nächster Schritt:** „Der Ton kommt dazu; ein zweites Ohr hört Ende und Übergänge gegen.“

### 8 Geführte Abnahme
- **Eingang:** Web-Kopie.
- **Der Skill tut:** Rubrik R1 bis R12 auf der Web-Kopie (`07-qa.md`), dann die geführte Abnahme nach `templates/abnahme-fragen.md` (fünf Fragen mit Bildstreifen in `regie/abnahme/`, Antwortraster). Die Antwort wörtlich festhalten (`navi go "…"`); jede Antwort außer „passt“ wird zu höchstens 3 Änderungen und einer Regie-Runde (`navi zurueck 6`).
- **Schwelle:** Rubrik bestanden (kein ★ rot, höchstens 2 andere rot), Abnahme des Nutzers festgehalten. Gelb: keine Bildstreifen in `regie/abnahme/`.
- **Nächster Schritt:** „Fünf kurze Fragen, dann ist dein Film fertig.“

### 9 Auslieferung
- **Eingang:** Abnahme.
- **Der Skill tut:** Web-Kopie je Fassung, CTA nach `07-qa.md` „Fassungen und CTA“, Version sichern, Modellkosten eintragen, Antwort nach `templates/auslieferung.vorlage.md`.
- **Schwelle:** jede `*_web.mp4` < 30 MB mit faststart, eine Version jünger als die Web-Kopie, Summe in „Modellkosten je Phase“ (Wert, „ca.“ oder „unbekannt“). Danach `navi weiter`: Lauf abgeschlossen.
- **Nächster Schritt:** „Hier ist dein Film.“ Neue Wünsche danach: `navi zurueck 6`.

## Kosten und Budget

**Plan:** `navi kosten [--laenge <s>]` zeigt je Phase die Planwerte (Opus-Listenpreise, ohne Generierung). Für 40 s: voll ca. 30 bis 40 $, spar ca. 15 bis 20 $; der Bau wächst mit der Länge (je weitere 10 s ca. 3,6 $ voll, 2,6 $ spar). Kalibriert an drei Messläufen (Kosten laut Client):

| Lauf | Film | Regie | Kosten | davon (je Phase) |
|---|---|---|---|---|
| A | 30,8 s, mit Vorbild | keine (vor der Regie-Schleife) | 35,61 $ | Analyse und Vorschlag 8,4 (3 Vision-Agenten, 580 Zoom-Bilder) · Freigabe und Bibliothek 4,2 · Probe 5,5 · Bau 16,3 · Ton 1,3 |
| B | 15,9 s, ohne Vorbild | keine | 12,82 $ | Fragen 1,1 · Probe = ganzer Film 8,5 · Ton und Abnahme 3,2 |
| C | 41,4 s, mit Vorbild | voll, 4 Runden, 25 Kritiker | 95,76 $ | Analyse 6,5 · Vorschlag 1,0 · Probe 9,0 · Bau 18,5 · Regie 48,8 (je Runde 10 bis 14) · Ton 9,3 · Abnahme 2,7 |

Die Planwerte setzen die Deckel voraus: Regie wie oben (Station 6), Analyse höchstens 2 Vision-Agenten mit je 40 Bildern, Bau- und Ton-Agenten mit Durchgangs- und Bild-Deckel (`templates/agent-prompts.md`). Sie sind Planwerte, kein Messwert; der Budget-Stopp fängt Abweichungen.

**Stückkosten zum Schätzen** (Lauf C, Opus, je Agent): Shot-Spec mit ca. 50 Bildern 1,7 bis 2 $ · Probe- oder Block-Agent ohne Deckel 5 bis 7 $ (60 Durchgänge, 200k Kontext), mit Deckel Ziel ≤ 3 $ · Kritiker eine Linse 0,4 bis 1,7 $, gebündelt Ziel ≤ 1,5 $ · Umsetzer 0,5 bis 2,6 $ · Ton-Agent ca. 7 $ (69 Durchgänge), mit Deckel Ziel ≤ 3 $ · Hauptlauf 1 bis 3 $ je Phase. Bevorzugt den Wert laut Client eintragen (Claude Code: `/cost`; Abo: Verbrauch unter `/usage`; ohne Oberfläche: `total_cost_usd` der JSON-Ausgabe), sonst „ca.“ aus dieser Liste. Token-Zahlen aus Agenten-Berichten sind keine Kosten: Sie zählen den Kontext einmal, nicht jedes erneute Lesen (Lauf C: 9,1 Mio. gemeldet, 166 Mio. verarbeitet, 95,76 $).

**Budget:** Nach dem Go `navi budget <usd>` (Summe der gewählten Stufe aus `navi kosten`). Station 6 liest die Kostenzeilen aus dem Manifest und stoppt, sobald die Summe das Budget erreicht. Dann **nicht weiterbauen**, sondern fragen (Wortlaut anpassen, Inhalt nicht):
> „Das Budget von <B> $ ist erreicht (bisher <K> $). Empfohlen: Ich nehme die beste Version, wie sie ist, mache Ton und Abnahme fertig (ca. <Rest> $) und liste offene Punkte als ‚bekannt‘. Oder: weitere Kritik-Runde für ca. 7 $. Im Abo zählt das gegen dein Wochenlimit.“

Erst nach seiner Antwort `navi budget <neu> "<Wortlaut>"`. Bei 80 % meldet `navi` gelb: keine Runde mehr beginnen, deren Kosten das Budget überschreiten würden.

<!-- Warum Budget-Stopp: Im Beweistest lief die Regie-Schleife weiter, solange „mittel“-Befunde offen waren (4 statt 2 Runden, 25 Kritiker); eine Runde kostete 10 bis 14 $, die Sitzung sah ihre Kosten nicht. -->

## Ablage im Lauf
```
<lauf>/navi.json  MANIFEST.md  VORSCHLAG.md  BLUEPRINT.md  ereignisse.json
       analyse/   referenz.mp4  frames/zeiten.csv  shot-spec-p*.md  ton-referenz.md  kennzahlen-referenz/
       produkt/   PRODUKT.md  funktionen.json  marke.json  logo.svg  screens/  bilder/  seite.txt  (FEHLT.md)
       assets/    screens/  logo/  bilder/  daten/        (vom Nutzer)
       vorschlag/ standbilder/  muster/
       film/      (HyperFrames-Projekt, lib/marke.css)  renders/
       regie/     r1/ r2/ …  abnahme/
       versionen/ v1/ v2/ …
```
