# Routen und Werkzeuge

Anbieter sind austauschbar. Nimm, was der Nutzer angeschlossen hat (MCP-Connector oder API-Key), z. B. Higgsfield, Magnific, fal, ElevenLabs, Google. Die Modellnamen unten sind Empfehlungen aus echten Läufen, keine Pflicht. Prüfe vor der Empfehlung, ob der Anbieter das Modell und den Modus (z. B. Bild als Referenz, Dauer, Auflösung) wirklich anbietet.

## Welche Route für welchen Bestandteil
| Bestandteil | Standard-Route | Alternative | Nicht |
|---|---|---|---|
| UI, Text, Logs, Karten, Logos, Diagramme, Kamera-Moves, Typo-Statements | **HyperFrames (HTML/CSS/GSAP → MP4)**, Skill `hyperframes` → Workflow `general-video` | After Effects, wenn ein AE-Connector angeschlossen ist und der Nutzer AE-Projektdateien will | Videomodelle (zerlegen kleinen Text) |
| Produktfotos, Lifestyle, Banner | Bildmodell mit guter Textur und Etiketten-Treue (Empfehlung: GPT Image 2), Packshot zuerst, dann mit Packshot als Referenz | andere starke Bildmodelle (z. B. Seedream, Nano Banana Pro) | Bilder echter Personen ohne deren echte Fotos und Einverständnis |
| Echte Menschen-/Produkt-Clips (Footage) | Videomodell (z. B. Seedance, Kling, Veo) über den angeschlossenen Anbieter | Standbild mit Push-in (oft gleichwertig, kostenlos) | ganze Szenen mit UI |
| Musik | eigene, lizenzierte Bibliothek, falls vorhanden und ein Track Stil/Tempo trifft; sonst Musikgenerator (Empfehlung: Google Lyria, 30 bis 180 s) | andere Musikgeneratoren (z. B. ElevenLabs Music) | Chart-Songs oder ungeklärte Lizenzen für Firmenfilme |
| Effekte (Klicks, Pops, Swooshes, Tippen, Sparkle, Chime, Sub-Hits) | **SFX-Generator, je Typ 4 Varianten** (Empfehlung: ElevenLabs Sound Effects) | eigene, lizenzierte SFX-Bibliothek für Raumton/Riser | ein einzelnes Sample für viele Einsätze |
| Ton-/Video-Analyse, Hörtest | `scripts/ton-referenz.mjs` + `scripts/video-verstehen.mjs` + `scripts/hoertest.mjs` (Gemini, Upload über die Gemini Files API mit Löschung) | anderes video-fähiges Modell | das Video nur im Browser „anschauen“; Medien über öffentliche Bucket-URLs an ein Modell reichen |

Nicht jede Bild/Video-Plattform kann Musik oder SFX (manche liefern nur Sprache). Vorher im Werkzeugkatalog des Anbieters nachsehen.

Integrations-Logos sind Code (SVG aus Originalformen), nie Generierung. Kundenmaterial (Mails, Fotos, Screens) geht an ein Analyse-Modell nur über einen Weg, der die Datei danach löscht und keine öffentliche URL erzeugt.

<!-- Warum Upload-Weg: In einem internen Vorläufer des Hörtests lagen Ausschnitte mit Kundenmaterial unter einer öffentlichen Storage-URL; die Files API mit Löschung vermeidet das. -->

## Anbieterwahl (Kurzform)
1. Ein ausdrücklicher Anbieterwunsch des Nutzers gilt.
2. Sonst Kandidaten mit kostenlosen Kostenabfragen vergleichen (viele Anbieter haben eine Preis- oder Simulationsfunktion; sonst Katalogpreis). Credits je Anbieter getrennt nennen, keine €-Umrechnung erfinden, Ungeprüftes als ungeprüft kennzeichnen. Keine Probe-Generierung nur zur Preisfindung.
3. Empfehlung + Unterschiede in die Freigabe (G3) einbauen.
4. Entscheidung, Grund, Kosten (vorher geschätzt, nachher gemessen, z. B. per Kontostand) ins Manifest.

## Generierung (G3, Chat-Gate)
1. Referenzen nummeriert in `motion-runs/<lauf>/referenzen/` (`01_packshot-….png`, Reihenfolge = Rolle im Prompt); Sichtungsmaterial (Referenz-Frames, Marken-Screens) in `referenzen/_kandidaten/` (wird nicht mitgeschickt). Ordner per `open` im Finder öffnen.
2. Prompts **wörtlich** im Chat + Datei `PROMPTS.md` bzw. `PROMPTS-TON.md`, Tabelle Nummer → Rolle, 2 bis 3 Regie-Entscheidungen, Anbieter, Modell, Anzahl, Ausgabeformat, Kosten.
3. Auf das ausdrückliche „Go“ des Nutzers warten. Erst dann generieren. Jede neue Prompt-Fassung braucht ein neues Go.
4. **Zweistufig bei Produkten:** Stufe 1 Packshot (2 Varianten) → Nutzer wählt → Stufe 2 alle weiteren Bilder mit dem gewählten Bild als Referenz (je nach Anbieter als Job-ID oder hochgeladene Datei).
5. Job-IDs sofort in `bilder/jobs.json` bzw. `ton/…-jobs.json`. Ergebnisse herunterladen, verkleinert ansehen, Etiketten/Text 2× vergrößert prüfen.
6. Bei Fehlern nicht still Anbieter/Modell wechseln, nicht automatisch nachgenerieren. Erst Fehler und genehmigten Umfang prüfen, bei Abweichung neu abstimmen.
