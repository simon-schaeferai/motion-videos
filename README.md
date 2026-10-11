# motion-videos

![teaser](docs/teaser.png)

*Ich wollte ein Produkt-Reel nachbauen, das mir gefiel, und habe es zuerst mit einem Videogenerator versucht. Die Texte zerfielen, jeder Clip kostete Geld, und das Timing stimmte nie. Was am Ende funktioniert hat: das Vorbild Frame für Frame vermessen, UI und Text als Code bauen, nur echtes Footage generieren und vor jedem bezahlten Schritt fragen. Dieser Skill ist genau dieser Ablauf. Simon Schaefer, Oktober 2026*

Die Idee: Ein Referenz-Video ist die Spezifikation. Claude holt es anonym, zerlegt es in Frames und Ton, lässt Vision-Agenten jeden Shot beschreiben (Layout, Typo, Easing, Kamera, Schnitt-Frame) und lässt die Tonspur über Gemini beschreiben (Musik, BPM, Effekt-Palette, Event-Karte). Danach wird jeder Beat auf eine echte Funktion deines Produkts gemappt, mit Beleg. Gebaut wird in [HyperFrames](https://hyperframes.heygen.com) (HTML/CSS/GSAP → MP4): erst eine 10-Sekunden-Probe, die frame-genau gegen die Referenz gemessen wird, dann Blöcke parallel. Bild-, Video-, Musik- und Effekt-Generatoren kommen nur für echtes Footage zum Einsatz, über den Anbieter, den du angeschlossen hast. Vor jeder kostenpflichtigen Generierung zeigt Claude die Prompts wörtlich, den Referenz-Ordner und die Kosten und wartet auf dein „Go“.

## How it works

Du gibst zwei Dinge: ein Video, das dir gefällt, und den Link zu deinem Produkt. Dann führt dich der Skill durch neun feste Stationen; erst wenn eine Station ihre Schwelle erfüllt, geht es weiter.

1. **Vorbild:** Claude vermisst das Video Bild für Bild (Schnitte, Kamera, Schrift, Bildfüllung) und lässt die Tonspur beschreiben.
2. **Produkt:** Claude liest deine öffentliche Produktseite: Funktionen mit Beleg (Zitat und Link), Farben, Schrift, Logo, Screens. Kein Login, keine Formulare, robots.txt wird beachtet.
3. **Material:** Claude sucht selbst die öffentliche Demo oder Live-Ansicht deines Produkts und holt sie als echtes Material. Ein einfacher Punktestand zeigt, ob genug da ist; sonst bittet Claude gezielt um 3 bis 5 Screenshots. Für Foto-, Menschen- und Geräte-Szenen des Vorbilds plant Claude eine echte Bildwelt (Desktop-Fenster, Handy, Produktfoto), keine leeren Kacheln.
4. **Vorschlag:** Du siehst den Film im Chat, bevor gebaut wird: Szene für Szene (Vorbild-Stelle, Funktion mit Beleg, Aussage mit höchstens 6 Wörtern, Bildwelt, Bildidee), 2 bis 4 Standbilder aus deinen echten Screens in deiner Marke, Ton, Länge, offene Fragen, Kosten in $ je Stufe. Du schreibst **einmal „Go“**.
5. **Probe:** die ersten Sekunden, gegen das Vorbild gemessen.
6. **Bau + Regie-Schleife:** ganzer Film, danach zwei Kritik-Runden (Sparfassung: eine) wie von einem anspruchsvollen Kunden, mit Rückweg zur besten Version; am Budget hält Claude an und fragt.
7. **Ton:** Musik und Effekte im Stil des Vorbilds, ein zweites Ohr (Gemini) hört gegen.
8. **Abnahme:** fünf konkrete Fragen mit Bildausschnitt statt „passt es?“.
9. **Auslieferung:** Web-Kopie je Fassung, gesicherte Version, Kosten im Manifest.

Was dahinter steckt:
- **`SKILL.md`** und **`references/`**: der Weg und die Tiefe je Station (`00-navigator.md` als Landkarte), Qualitäts-DNA mit Pflichtwerten, Einwand-Katalog aus echten Läufen. Claude liest sie, du nicht.
- **`scripts/navi.mjs`**: der Navigator. Er hält den Stand in `navi.json`, prüft die Schwellen, führt das Budget (`kosten`, `budget`) und sagt in einem Satz, was als Nächstes kommt; eine neue Sitzung macht genau dort weiter.
- **`scripts/hf.sh`**: die eine Stelle für die HyperFrames-Version; alle Renders laufen darüber.
- **`scripts/produkt-lesen.mjs`**, **`marke-tokens.mjs`**, **`standbilder.mjs`**: Produktseite und öffentliche Demo lesen, deine Marke in CSS-Variablen übersetzen (Farben und Schrift wechseln, Qualitätswerte bleiben fest), Standbilder aus echtem Material für den Vorschlag.
- **`scripts/hole-referenz.sh`**, **`vergleich.py`**, **`qualitaet.py`**, **`ton/`**, **`hoertest.mjs`**, **`version-sichern.sh`**: Vorbild holen, gegen das Vorbild messen, Pflichtwerte prüfen, Musik nach Takt-Regeln schneiden, Ton gegenhören, jede Version sichern.
- **`templates/`**: Vorschlag, Manifest, Abnahme-Fragen, Auslieferung und die geteilte Bewegungs-, Kamera- und Typo-Bibliothek, die alle Bau-Agenten benutzen.
- **`motion-runs/<datum>_<slug>/`** in deinem Projekt: hier entsteht alles, mit einem `MANIFEST.md`, das Entscheidungen, Kosten und Freigaben festhält.

Die eine Konstante: Code für UI und Text, Generierung nur für Footage.

## Quick start

**Voraussetzungen:** macOS oder Linux, Node 18+, Python 3 mit OpenCV (`opencv-python-headless`, installiert das Skript mit; bei Homebrew-Python fragt es vor `pip --user --break-system-packages`, siehe SETUP.md), ffmpeg, yt-dlp, ein [Gemini-API-Key](https://aistudio.google.com/apikey) mit aktivierter Abrechnung (das Free Tier hat je Modell nur 20 Anfragen am Tag, Stand Oktober 2026, und reicht oft nicht für einen ganzen Lauf). Was fehlt, sagt dir das Install-Skript.

**Kosten:** Für einen 40-s-Film kostet die Claude-Nutzung (Opus-Listenpreise) ca. 30 bis 40 $ mit der vollen Regie-Schleife (3 Kritiker mit je zwei Blickwinkeln, 2 Runden, eine Prüfrunde mit Ton) oder ca. 15 bis 20 $ in der Sparfassung (1 Kritiker, 1 Runde); gewählt wird im Vorschlag, `navi.mjs kosten --laenge <s>` rechnet es für jede Länge. **Im Claude-Abo zählt das gegen dein Wochenlimit; ein voller Lauf kann einen großen Teil davon verbrauchen.** Hast du diese Woche nur noch wenig Kontingent, nimm „spar“. Der Skill hält ein Budget fest und fragt nach, bevor er darüber geht. Zum Vergleich, gemessen ohne die heutigen Deckel: 35,61 $ (31-s-Film, ohne Regie-Schleife), 12,82 $ (16 s, ohne Vorbild), 95,76 $ (41 s, Regie mit vier Runden; das riss im Test das Wochenlimit). Gemini-Aufrufe liegen im Cent-Bereich. Generierung (Bilder, Footage, Musik, Effekte) kommt beim jeweiligen Anbieter dazu und läuft nur nach deinem „Go“.

```bash
# 1. Klonen und global installieren (in allen Projekten verfügbar)
git clone https://github.com/simon-schaeferai/motion-videos ~/.claude/skills/motion-videos
bash ~/.claude/skills/motion-videos/install.sh --global

# 2. Gemini-Key eintragen
open -e ~/.claude/skills/motion-videos/.env      # GEMINI_API_KEY=...

# 3. Prüfen (--gemini: prüft mit einer Mini-Anfrage, ob dein Gemini-Kontingent heute reicht)
bash ~/.claude/skills/motion-videos/scripts/setup_check.sh --gemini
```

Nur für ein Projekt: im Projekt-Ordner `git clone https://github.com/simon-schaeferai/motion-videos .claude/skills/motion-videos` und `bash .claude/skills/motion-videos/install.sh --projekt`. Wenn der Check „Alles bereit“ meldet, Claude Code neu starten. Details, Fehlerbilder und Modellwahl stehen in [SETUP.md](SETUP.md).

## Using it

```
/motion-videos Bau mir so einen Film für https://mein-produkt.de, Vorbild: https://www.youtube.com/watch?v=...
```

Mehr brauchst du nicht. Claude erklärt in drei Sätzen den Weg, vermisst das Vorbild, liest deine Produktseite und meldet sich mit dem **Vorschlag**: Szenen, Standbilder in deiner Marke, Annahmen mit Empfehlung (Format, Länge, Ton, Aufforderung am Ende), offene Fakten und Kosten. Du antwortest „Go“ oder „Go, aber …“ mit deiner Änderung in einem Satz. Danach baut Claude, zeigt dir die Probe als Zwischenstand und kommt mit dem fertigen Film und fünf kurzen Fragen zur Abnahme zurück. Gefragt wirst du sonst nur, wenn eine Station es braucht (kein Vorbild, Produktseite gesperrt, zu wenig echte Screens) oder eine Generierung Geld kostet.

Kein Vorbild? Der Skill hilft beim Finden (Film-Typen, Suchbegriffe, worauf achten). Profi? `navi init … --profi` zeigt nur Ampel und nächsten Schritt und erlaubt, Stationen mit Begründung zu überspringen. Den Stand siehst du jederzeit mit `node ~/.claude/skills/motion-videos/scripts/navi.mjs status`.

## Design choices

- **Referenz messen statt nachempfinden.** Schnitte, Easing und Kamera-Stufen werden aus den Frames gemessen und die Probe wird gegen dieselben Frames geprüft. Das kostet am Anfang Zeit (Analyse und Probe dauern länger als ein schneller Entwurf), dafür stimmt das Tempo am Ende.
- **HyperFrames-Code statt Videogenerator für UI und Text.** Text bleibt scharf, jede Änderung ist ein Edit statt eines neuen bezahlten Clips. Der Nachteil: Echte Menschen, Produkte und Umgebungen brauchen trotzdem einen Generator oder eigenes Material.
- **Ein Vorschlag, ein Go.** Statt vieler Fragen vorab siehst du den Film als Szenen-Tabelle mit Standbildern und korrigierst mit einem Satz. Dafür dauert es bis zum Vorschlag etwas länger, weil Vorbild und Produktseite schon gelesen sind.
- **Feste Schwellen statt Gefühl.** Jede Station hat eine prüfbare Schwelle (Material-Punktestand, Belege je Funktion, Messwerte, Hörtest). Das hält auch Läufe auf Niveau, deren Nutzer selbst nicht wissen, worauf sie achten müssten.
- **Gates im Chat statt Automatik.** Nichts Kostenpflichtiges läuft ohne dein „Go“, und unbelegte Produktfunktionen werden gefragt statt erfunden. Das bremst, verhindert aber teure Fehl-Renders und unwahre Produktfilme.
- **Anbieter-neutral.** Der Skill nennt Empfehlungen (z. B. GPT Image 2 für Produktbilder, Lyria für Musik, ElevenLabs für Effekte), nutzt aber, was du angeschlossen hast. Ohne Generator gibt es eine Code-only-Route mit deinen eigenen Assets.
- **Gemini direkt für den Ton.** Claude kann nicht hören. Ein video-fähiges Gemini-Modell beschreibt die Tonspur, damit der Nachbau ähnlich klingt statt nur ähnlich getaktet zu sein, und hört vor der Auslieferung kritische Stellen (Ende, Musik-Nähte) gegen, auf Wunsch zwei Varianten im Vergleich. Abnehmen musst du ihn trotzdem selbst.
- **Ein Feature pro Beat.** Jede Szene trägt eine kurze Aussage, die lange genug steht, um gelesen zu werden, und nie über der UI liegt. Mehr Funktionen bekommen eigene Beats oder eine Langfassung. Der Film wird dadurch oft etwas länger als die Referenz, wirkt aber hochwertig statt überladen.
- **Beste Version statt letzter.** Jede ausgelieferte Version wird gesichert. Wird es schlechter, holt Claude die beste zurück, statt weitere Änderungen zu stapeln; je Revision höchstens drei Änderungen. Bei vagem Feedback („wirkt nicht hochwertig“) läuft zuerst eine Diagnose mit mehreren Agenten, bevor umgebaut wird.

## Limitations

- Claude hört den fertigen Ton nicht. Die Mischung wird gemessen (Lautheit nach AAC, Energiekurve, Cue-Timing, Musik-Löcher und Schleifen) und von Gemini gegengehört; der Höreindruck und die Abnahme bleiben bei dir.
- Generierung kostet Geld beim jeweiligen Anbieter; die Kosten stehen vor jedem Go im Chat und danach im Manifest. Die Claude-Nutzung selbst (40-s-Film ca. 30 bis 40 $ voll, 15 bis 20 $ spar, siehe Quick start) nennt Claude in der ersten Antwort und im Vorschlag in $, hält sie je Station und Regie-Runde im Manifest fest und stoppt am Budget mit einer Rückfrage.
- Ohne Bild-, Musik- und Effekt-Generator baut der Skill alles in Code; Effekte synthetisiert er dann selbst (schlichter als eine Bibliothek), Musik bringst du mit.
- Login-pflichtige oder private Videos lädt der Skill nicht (kein Cookie-Umweg). Dann die Datei selbst herunterladen und übergeben.
- Lizenzen bleiben deine Aufgabe: Musik aus Bibliotheken, generierte Musik je nach Anbieter-Plan, fremde Logos nur für echte Integrationen.
- Kundenmarken und echte Kundendaten brauchen eine schriftliche Freigabe. Ohne sie baut der Skill mit einer Demo-Marke.
- Ein 1:1-Nachbau eines fremden Marken-Films ist nur als interne Studie gedacht, nicht zur Veröffentlichung.

## License

MIT
