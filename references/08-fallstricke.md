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
