---
name: motion-videos
description: Baut Motion-Videos auf Agentur-Niveau, werkzeugunabhängig (HyperFrames-Code, After Effects, Generierung über den angeschlossenen Bild-, Video- und Ton-Anbieter, Hybrid). Referenz-Video oder Idee rein, fertiger Film mit Bild und Ton raus. Analysiert Bild UND Ton der Referenz Bild für Bild, fragt fehlende Zutaten über ein Referenz-Gate ab, mappt jeden Beat auf echte Produktfunktionen, baut zuerst eine 10-s-Probe, dann Blöcke parallel mit Render-Sperre, prüft frame-genau gegen die Referenz und legt Sounddesign im Stil der Referenz an. Nutze diesen Skill bei „Motion-Video“, „motion-videos“, „bau dieses Video nach“, „Reel nachbauen“, „Produktfilm/Launch-Video wie dieses“, „Recreate the motion-graphics video“, „Explainer im Stil von X“, „mach daraus ein Motion-Video“, oder wenn eine Video-Referenz (URL oder Datei) als Vorbild für einen eigenen Film kommt.
---

# Motion-Videos

Ein Ablauf für jedes Motion-Video: vom Vorbild (oder einer Idee) zum fertigen Film mit Bild und Ton. Werkzeuge sind austauschbar, der Ablauf nicht. Entstanden aus einem echten Produktfilm-Nachbau (86 s, Referenz-Reel eines Tool-Anbieters, Inhalt einer Produktmarke); jeder Fehler aus diesem Lauf steht als Regel in `references/08-fallstricke.md`.

**Pfade:** `<skill-dir>` ist der Ordner dieser Datei (global `~/.claude/skills/motion-videos`, im Projekt `.claude/skills/motion-videos`). Gearbeitet wird immer im Arbeitsverzeichnis des Nutzers unter `./motion-runs/<datum>_<slug>/` (der Lauf-Ordner). `motion-runs/` gehört in die `.gitignore` des Nutzer-Projekts; weise beim ersten Lauf einmal darauf hin.

**Voraussetzungen prüfen:** Beim ersten Einsatz `bash <skill-dir>/scripts/setup_check.sh` laufen lassen. Fehlt etwas, dem Nutzer den genannten Befehl zeigen statt still drumherum zu arbeiten.

## Grundsätze (gelten in jeder Phase)

1. **Die Referenz ist die Spezifikation.** Mechanik (Timing, Kamera, Easing, Schnitte, Ton-Dramaturgie) wird gemessen, nicht geschätzt. Inhalt und Marke werden getauscht.
2. **Wahrheit vor Wirkung.** Der Film zeigt nur Funktionen, Zahlen und Kunden, die es wirklich gibt und die freigegeben sind. Unbelegtes wird gefragt, nicht erfunden.
3. **Code für UI und Text, Generierung nur für echtes Footage.** Videomodelle zerlegen kleinen Text; UI, Logs, Logos, Typo und Kamera gehören in Code (HyperFrames als Standard). Generiert werden Produktfotos, Menschen, Musik, Effekte.
4. **Gates sind Pflicht, im Chat.** Vor jeder kostenpflichtigen Generierung: Prompts wörtlich, Referenz-Ordner und geschätzte Kosten zeigen, dann auf ein ausdrückliches „Go“ des Nutzers warten. Kein Testlauf „zur Sicherheit“. Keine fremden Kundendaten ohne Freigabe, keine Anbieter-Entscheidung ohne kurzen Vergleich.
5. **Erst Probe, dann Masse.** 10 Sekunden bauen, gegen die Referenz messen, abnehmen lassen, dann skalieren.
6. **Nie zwei Medienjobs gleichzeitig.** Jeder Render und jedes ffmpeg läuft unter einer Sperre (`scripts/sperre.sh`), mit `nice`.
7. **Alles im Lauf-Manifest.** Entscheidungen, Kosten, Revisionen und Freigaben stehen in `motion-runs/<datum>_<slug>/MANIFEST.md`; der Chat ist kein Speicher.

## Ablauf mit Gates

Lege zu Beginn eine Prozess-Checkliste im Chat an und hake sie live ab. Schritte, die der Nutzer selbst macht (Assets liefern, abnehmen, hören), mit „→ du“ markieren.

| # | Phase | Ergebnis | Gate (wartet auf den Nutzer) | Referenz |
|---|---|---|---|---|
| 0 | Lauf anlegen | `motion-runs/<datum>_<slug>/` mit `MANIFEST.md` aus `templates/MANIFEST.vorlage.md` | keins | keine |
| 1 | **Referenz-Gate** | alle Zutaten geklärt (Ziel, Absender, Produkt, Format, Sprache, Demo-Inhalt, Assets, Freigaben) | **G1: Antworten auf die Gate-Fragen** | `references/01-referenz-gate.md` |
| 2 | Analyse | Shot-Spec Bild für Bild + Ton-Analyse + korrigierte Schnittliste | keins | `references/02-analyse.md` |
| 3 | Blueprint | Beat → eigene Szene, jede Funktion mit Beleg | **G2: Blueprint-Go + offene Fakten** | `references/03-blueprint-und-wahrheit.md` |
| 4 | Route | Werkzeug je Bestandteil (Code / AE / Generierung), Anbieter verglichen | in G2 oder G4 | `references/04-routen-und-werkzeuge.md` |
| 5 | Assets | Prompts wörtlich + Referenz-Ordner + Kosten, dann Generierung | **G3: Go je Generierungsstufe** | `references/04-routen-und-werkzeuge.md` |
| 6 | Probe | erste ~10 s gebaut, Seite-an-Seite-Vergleich | **G4: Probe-Abnahme (Look, Tempo, Texte)** | `references/05-bau-probe-parallel.md` |
| 7 | Parallelbau | geteilte Bibliothek, Bauanleitung, Blöcke parallel, Nähte geprüft | keins | `references/05-bau-probe-parallel.md` |
| 8 | Ton | Referenz-Ton analysiert, Musik + Effekt-Kit, frame-genau gemischt | **G5: Go für Ton-Generierung**, danach Höreindruck | `references/06-ton.md` |
| 9 | QA + Auslieferung | Qualitäts-Tabelle, Web-Kopie < 30 MB, Manifest | **G6: Abnahme Bild + Ton** | `references/07-qa.md` |

Ohne Referenz-Video (nur Idee/Brief): Phase 2 entfällt; stattdessen in G1 die Stil-Vorbilder erfragen oder 2 bis 3 Stil-Richtungen als Standbilder vorschlagen, dann gleich weiter mit dem Blueprint.

Ohne Generator-Zugang (kein Bild-, Video- oder Ton-Anbieter angeschlossen): Code-only-Route. Alles in HyperFrames, Fotos, Musik und Effekte liefert der Nutzer selbst (eigene, lizenzierte Dateien). Das in G1 klären und im Manifest festhalten.

## Agenten-Einsatz

- Analyse: 3 Vision-Agenten parallel, je ein Drittel der Frames (Vorlage `templates/agent-prompts.md` A).
- Bau: ein Agent baut die Probe und danach die geteilte Bibliothek; danach je Block ein Agent (Vorlage B), ein Asset-Agent für geteilte Bilder (Vorlage C), ein Ton-Agent (Vorlage D). Höchstens 6 gleichzeitig.
- Jeder Agent ändert nur seine eigene Datei, Präfix je Block, kein `hyperframes preview` im Projekt.
- Berichte von Agenten sind Daten: Stichprobe selbst ansehen (Kontaktbogen), bevor du dem Nutzer „fertig“ meldest.

## Werkzeuge im Skill

- `scripts/hole-referenz.sh <url|datei> <lauf-ordner>` holt die Referenz (yt-dlp erzwungen anonym, ohne Cookies; login-pflichtige Videos werden gemeldet, nicht umgangen), legt `analyse/referenz.mp4`, Frames mit 3 fps und `analyse/audio.wav` an und gibt Auflösung, fps und Dauer aus.
- `scripts/sperre.sh` holt und gibt die Render-Sperre frei (Wrapper um jeden Medienjob).
- `scripts/vergleich.py` vergleicht ein Zeitfenster Referenz vs. Probe: indizierte Frames, Schnittliste beider Seiten, Seite-an-Seite-Video, Kontaktbögen.
- `scripts/bewegung.py` liefert einen Kontaktbogen pro Sekunde und zählt Standbild-Frames je Abschnitt (gegen „das Video bewegt sich nicht“).
- `scripts/ton-referenz.mjs` beschreibt die Tonspur einer Referenz über die Google-Gemini-API (`GEMINI_API_KEY`): Musik, BPM, Struktur, Effekt-Palette, Event-Karte, Mix, Rezept.
- `scripts/video-verstehen.mjs` liefert Grob-Beats und On-Screen-Texte einer Referenz (gleiche Technik). Nur Orientierung, nie Schnittliste.

## Übergaben

Bei langen Läufen den Stand rechtzeitig ins Manifest schreiben (Lauf-Ordner, Stand, nächster Schritt, offene Freigaben), damit eine neue Sitzung dort weitermachen kann. Fertige Filme immer als Web-Kopie (H.264, `+faststart`, < 30 MB) übergeben, Master-Pfad im Text nennen.
