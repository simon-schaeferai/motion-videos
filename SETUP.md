# Setup

## Voraussetzungen

| Was | Wofür | Installieren (macOS) |
|---|---|---|
| **Claude Code** | führt den Skill aus; ein 40-s-Film braucht ca. 30 bis 40 $ Claude-Nutzung (Regie voll) bzw. 15 bis 20 $ (spar), im Abo zählt das gegen dein Wochenlimit | https://claude.com/claude-code |
| **Node.js 18+** | HyperFrames, Gemini-Skripte | `brew install node` |
| **Python 3** + `pillow`, `numpy`, `scipy`, OpenCV | Vergleich, Bewegung, Ton-Messung, Musikschnitt (`scipy` für `scripts/ton/`); OpenCV (`opencv-python-headless`) ist Pflicht für den Bildfluss in `scripts/qualitaet.py --bewegung` (R5 ★ Stand, R6 Drift; ohne OpenCV ist R5 ★ nicht prüfbar und zählt wie rot) | `brew install python`, dann siehe „Python-Pakete“ unten (macht `install.sh`) |
| **ffmpeg** + **ffprobe** | Frames, Ton, Web-Kopien | `brew install ffmpeg` |
| **yt-dlp** | Referenz-Videos per URL (lokale Dateien gehen ohne) | `brew install yt-dlp` |
| **HyperFrames-Skills** + Render-Chrome | Bau und Render der Filme | macht `install.sh` (siehe unten) |
| **Gemini-API-Key** | Ton- und Video-Analyse, Hörtest (Pflicht) | https://aistudio.google.com/apikey, Abrechnung aktivieren (Free Tier: 20 Anfragen/Tag je Modell, Stand Oktober 2026; reicht oft nicht für einen Lauf) |
| Generatoren (optional) | Produktfotos, Footage, Musik, Effekte | als MCP-Connector oder API in Claude Code anschließen, z. B. Higgsfield, Magnific, fal, ElevenLabs |

Linux: dieselben Pakete über den Paketmanager deiner Distribution (`yt-dlp` auch per `python3 -m pip install --user yt-dlp`).

### Python-Pakete (pillow, numpy, scipy, OpenCV)

Die Skripte rufen `python3` auf. Welcher Befehl passt, hängt davon ab, welches Python das ist (`install.sh` und `scripts/setup_check.sh` erkennen es und nennen den passenden):

1. **Du arbeitest mit einem venv:** venv anlegen und aktivieren, *bevor* du Claude Code startest (dann ist `python3` das venv-Python): `python3 -m venv ~/.venvs/motion-videos && source ~/.venvs/motion-videos/bin/activate && python3 -m pip install -r requirements.txt`. Ohne aktives venv findet der Skill die Pakete nicht.
2. **Homebrew-Python (macOS) oder System-Python mit „externally-managed-environment“ (PEP 668):** `python3 -m pip install --user --break-system-packages -r requirements.txt`. Das klingt gefährlicher, als es ist: `--user` schreibt nur in dein Benutzerverzeichnis (`~/Library/Python/3.x`), Homebrews eigene Pakete bleiben unberührt. Nach einem Python-Update (z. B. 3.14 → 3.15) den Befehl erneut ausführen. `install.sh` fragt vorher (oder installiert mit `--pip-system` ohne Rückfrage).
3. **Sonst:** `python3 -m pip install --user -r requirements.txt`.

`brew install opencv` hilft nur, wenn es zum Homebrew-Python derselben Version gehört; im Zweifel Weg 2.

## 1 · Installieren

Global (der Skill steht in allen Projekten bereit):

```bash
git clone https://github.com/simon-schaeferai/motion-videos ~/.claude/skills/motion-videos
bash ~/.claude/skills/motion-videos/install.sh --global
```

Nur in einem Projekt (im Projekt-Ordner ausführen):

```bash
git clone https://github.com/simon-schaeferai/motion-videos .claude/skills/motion-videos
bash .claude/skills/motion-videos/install.sh --projekt
```

Liegt das Repo woanders (z. B. `~/code/motion-videos`), kopiert `install.sh --global` bzw. `--projekt` den Skill an den Zielort; eine vorhandene `.env` am Ziel bleibt erhalten. Das Skript:

- prüft Node 18+, ffmpeg, ffprobe und yt-dlp und zeigt bei Fehlen den Befehl (installiert sie nicht selbst, kein `sudo`, kein automatisches `brew`),
- installiert `pillow`, `numpy`, `scipy` und OpenCV (`opencv-python-headless`, `requirements.txt`) nach „Python-Pakete“ oben: im aktiven venv ohne `--user`, sonst mit `pip --user`; bei Homebrew-Python (PEP 668) zeigt es den Befehl mit `--user --break-system-packages` und fragt (ohne Terminal: ✗ mit Befehl, oder `--pip-system`),
- installiert die HyperFrames-Skills über die offizielle CLI (`npx -y hyperframes skills update general-video hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio`; das bringt den Kern-Satz `hyperframes`, `hyperframes-*` und `media-use` mit) und lädt mit `npx hyperframes browser ensure` den Chrome für Renders,
- legt `.env` aus `.env.example` an,
- ergänzt bei `--projekt` die `.gitignore` deines Projekts um `.claude/skills/motion-videos/.env` und `motion-runs/`,
- läuft zum Schluss `scripts/setup_check.sh`.

Mit `--ohne-hyperframes` werden HyperFrames-Skills und Chrome übersprungen (z. B. wenn du HyperFrames als Plugin nutzt). Die HyperFrames-Skills landen immer im globalen Skill-Ordner von Claude Code, auch bei `--projekt`. Startest du Claude Code im Projekt nur mit Projekt-Einstellungen (z. B. `claude --setting-sources project`), sieht die Sitzung globale Skills nicht; dann die HyperFrames-Skills zusätzlich ins Projekt legen (`cp -R ~/.claude/skills/hyperframes ~/.claude/skills/hyperframes-* ~/.claude/skills/general-video .claude/skills/`). Der Setup-Check weist darauf hin.

Danach Claude Code neu starten, damit der Skill geladen wird.

## 2 · Keys

```bash
open -e ~/.claude/skills/motion-videos/.env     # bzw. .claude/skills/motion-videos/.env im Projekt
```

`GEMINI_API_KEY` eintragen. Die Skripte suchen den Key in dieser Reihenfolge: Umgebungsvariable → `.env` im Arbeitsverzeichnis → `.env` im Skill-Ordner. Der Key geht nur als Header an Google, nie in eine URL.

**Free Tier:** Ein Key ohne Abrechnung hat je Modell ein kleines Tageskontingent (Stand Oktober 2026: 20 Anfragen/Tag). Analyse, Hörtests und Wiederholungen brauchen in einem Lauf schnell mehr; im Praxistest war das Kontingent vor der Auslieferung erschöpft. Abrechnung im [AI Studio](https://aistudio.google.com/) aktivieren.

**Wiederholung und Ersatzmodell:** Alle Gemini-Skripte (`ton-referenz.mjs`, `video-verstehen.mjs`, `hoertest.mjs`, gemeinsam über `scripts/gemini.mjs`) wiederholen bei 429 (Minuten-Limit) und 5xx bis zu dreimal (nach 20, 60, 120 s) und nehmen danach das Ersatzmodell `GEMINI_MODEL_FALLBACK` (in `.env.example` vorbelegt mit `gemini-2.5-flash`, eigenes Kontingent). Ein erschöpftes Tageskontingent und ein unbekannter Modellname (404) gehen ohne Wiederholung direkt an das Ersatzmodell. `GEMINI_MODEL_FALLBACK=keins` schaltet das ab.

**Modell wechseln:** Standard ist `gemini-3.8-flash` (video- und audiofähig, laut [Modell-Liste](https://ai.google.dev/gemini-api/docs/models) stabil, Stand Oktober 2026). Ein anderes Modell per `GEMINI_MODEL=<model-id>` in der `.env` oder als Umgebungsvariable. Welche Modelle dein Key sieht:

```bash
curl -s -H "x-goog-api-key: $GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1beta/models | grep '"name"'
```

**Generatoren** brauchen keine Einträge in dieser `.env`: Claude nutzt, was in Claude Code angeschlossen ist, und fragt im Referenz-Gate danach. Ohne Generator baut der Skill alles in Code und nutzt deine eigenen Fotos, Musik und Effekte.

## 3 · Prüfen

```bash
bash ~/.claude/skills/motion-videos/scripts/setup_check.sh
```

Der Check sagt, was fehlt, und nennt den Befehl dazu. Bei „Alles bereit“ bist du startklar. Mit `--gemini` prüft er zusätzlich per Mini-Anfrage, ob dein Gemini-Hauptmodell heute noch Kontingent hat (vor jedem Lauf sinnvoll; kostet eine Anfrage).

## 4 · Erster Lauf

In Claude Code, in dem Projekt, in dem der Film entstehen soll:

```
/motion-videos Bau dieses Video für mein Produkt https://mein-produkt.de nach: https://www.youtube.com/watch?v=...
```

Claude legt mit dem Navigator (`scripts/navi.mjs init`) `./motion-runs/<datum>_<slug>/` an und führt durch neun Stationen: Vorbild, Produkt, Material, Vorschlag (dein Go), Probe, Bau mit Regie-Schleife, Ton, Abnahme, Auslieferung. Stand jederzeit: `node <skill-dir>/scripts/navi.mjs status`. `motion-runs/` gehört in die `.gitignore` deines Projekts (Renders und Frames sind groß).

Die Skripte gehen auch ohne Claude, z. B. zum Ausprobieren:

```bash
S=~/.claude/skills/motion-videos/scripts
bash $S/hole-referenz.sh "https://www.youtube.com/watch?v=..." motion-runs/test
node $S/ton-referenz.mjs motion-runs/test/analyse/referenz.mp4 motion-runs/test/analyse/ton-referenz.md
python3 $S/bewegung.py motion-runs/test/analyse/referenz.mp4 --alle 2
```

Weitere Werkzeuge für spätere Stationen (Aufruf und Optionen jeweils im Kopf des Skripts): `scripts/qualitaet.py` (Pflichtwerte messen), `scripts/hoertest.mjs` (Ton gegenhören, `--vergleich` für zwei Varianten), `scripts/render-block.sh` (Block rendern unter der Sperre), `scripts/ton/` (Musikschnitt und `audio.html`), `scripts/cta-band.sh` (CTA-Band anhängen), `scripts/version-sichern.sh` (Version sichern).

## Fehlerbilder

| Symptom | Ursache / Lösung |
|---|---|
| `Operation not permitted` beim Lesen von `~/Downloads`, `~/Desktop`, `~/Documents` | macOS-Datenschutz. Dateien in den Lauf-Ordner (`motion-runs/<lauf>/assets/`) ziehen, oder dem Terminal unter Systemeinstellungen → Datenschutz & Sicherheit → Dateien und Ordner Zugriff geben. |
| `hole-referenz.sh` endet mit „login-pflichtig, privat oder gesperrt“ (Exit 3) | Das Video braucht einen Login (typisch bei manchen Reels). Der Skill nutzt bewusst keine Cookies. Video selbst herunterladen und die Datei angeben. |
| `Sperre belegt: /tmp/<lauf>-render.lock` | Ein anderer Render oder ffmpeg-Job läuft (gewollt: nie zwei Medienjobs gleichzeitig). Warten. Ist sicher nichts mehr aktiv (`pgrep -fl "ffmpeg\|chrome-headless"`), die Sperre mit `rmdir /tmp/<lauf>-render.lock` lösen. |
| `In … liegt schon eine Referenz` | `hole-referenz.sh` überschreibt nichts. Neuen Lauf-Ordner nehmen oder die alten Dateien selbst wegräumen. |
| `GEMINI_API_KEY fehlt` | `.env` fehlt oder Key leer (Schritt 2). |
| `… gibt es nicht (mehr) oder es kann kein generateContent [HTTP 404]` | Modellname existiert nicht (mehr). Das Ersatzmodell springt ein; trotzdem `GEMINI_MODEL` auf ein Modell aus der Liste oben setzen. |
| `Tageskontingent des Keys … erschöpft (Free Tier: 20 Anfragen/Tag)` | Free-Tier-Key ohne Abrechnung. Abrechnung aktivieren oder morgen weiter. Lief deshalb kein Hörtest, gilt der Film als „Bild fertig, Hörtest offen“; hörte nur das Ersatzmodell, als „Hörtest eingeschränkt“. |
| `Modell … gerade überlastet (HTTP 503)` nach drei Versuchen und auch mit Ersatzmodell | Google ist ausgelastet. Später erneut; die Skripte haben schon dreimal gewartet und das Ersatzmodell versucht. |
| `qualitaet.py`: R5 ★ „nicht gemessen: OpenCV fehlt“ (✗) | OpenCV nachrüsten wie unter „Python-Pakete“ (den Befehl nennt `scripts/setup_check.sh`), dann erneut messen. Ein nicht gemessenes ★-Kriterium zählt wie rot. |
| `externally-managed-environment` bei `pip` | Homebrew-/System-Python (PEP 668). `python3 -m pip install --user --break-system-packages -r requirements.txt` (nur Benutzerverzeichnis) oder venv, siehe „Python-Pakete“. |
| `setup_check.sh --gemini`: „Gemini-Hauptmodell heute ohne Kontingent“ | Das Tageskontingent ist schon vor dem Lauf leer; Hörtests liefen nur mit dem Ersatzmodell, der Stand hieße höchstens „Hörtest eingeschränkt“. Abrechnung aktivieren oder morgen starten. |
| `npm run check` rot mit `multiple_root_compositions` | Eine Teil-Render-Fensterdatei `_fenster-*.html` oder eine zweite Root-Datei (z. B. `index-lang.html` der Langfassung) liegt im Film-Ordner. Fensterdatei löschen bzw. `index-lang.html` nach `film/_lang/` verschieben, dann erneut prüfen. |
| Agenten starten `hyperframes preview --background` | Die von `hyperframes init` angelegte `film/CLAUDE.md` empfiehlt das. Für diesen Skill gilt: kein Preview im Projekt (schreibt `data-hf-id`, bricht Teil-Renders). Absatz „Skill geht vor“ oben in `film/CLAUDE.md` und `film/AGENTS.md` ergänzen (`references/05-bau-probe-parallel.md`). |
| Lautheit im Mix grün, auf der Web-Kopie True Peak über −1 dBTP | AAC hebt die Spitzen. Immer auf der `_web.mp4` messen, Master-Limiter mit Reserve (ca. −3 dB). |
| Video zeigt am Anfang nur ein Standbild | Datei ohne `+faststart`. Web-Kopie nach `references/07-qa.md` erzeugen. |
| Render mit einer anderen HyperFrames-Version als gedacht | `npx hyperframes` ohne Version nimmt die zwischengespeicherte Fassung. Immer `bash <skill-dir>/scripts/hf.sh …`; `hf.sh --welche` zeigt Version und Quelle (Projekt-`package.json`, sonst `scripts/hyperframes-version`). Der Setup-Check meldet Abweichungen. |
| `hyperframes render` bricht sofort mit `EACCES … uv_os_setpriority` ab | Doppeltes `nice`: `sperre.sh` setzt `nice -n 10` selbst. Innerhalb von `sperre.sh … --` kein zweites `nice`. |
| `navi`: „Budget erreicht“ in Station 6 | Gewollt: Der Lauf hat das im Vorschlag gewählte Budget verbraucht. Claude fragt, ob es mit der besten Version zu Ton und Abnahme geht oder ob du mehr freigibst (`navi budget <usd> "<dein Wortlaut>"`). Im Abo zählt jede weitere Runde gegen dein Wochenlimit. |
