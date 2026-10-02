# Setup

## Voraussetzungen

| Was | Wofür | Installieren (macOS) |
|---|---|---|
| **Claude Code** | führt den Skill aus | https://claude.com/claude-code |
| **Node.js 18+** | HyperFrames, Gemini-Skripte | `brew install node` |
| **Python 3** + `pillow`, `numpy` | Vergleich, Bewegung, Ton-Messung | `brew install python`, dann `python3 -m pip install --user -r requirements.txt` |
| **ffmpeg** + **ffprobe** | Frames, Ton, Web-Kopien | `brew install ffmpeg` |
| **yt-dlp** | Referenz-Videos per URL (lokale Dateien gehen ohne) | `brew install yt-dlp` |
| **HyperFrames-Skills** + Render-Chrome | Bau und Render der Filme | macht `install.sh` (siehe unten) |
| **Gemini-API-Key** | Ton- und Video-Analyse (Pflicht) | https://aistudio.google.com/apikey |
| Generatoren (optional) | Produktfotos, Footage, Musik, Effekte | als MCP-Connector oder API in Claude Code anschließen, z. B. Higgsfield, Magnific, fal, ElevenLabs |

Linux: dieselben Pakete über den Paketmanager deiner Distribution (`yt-dlp` auch per `python3 -m pip install --user yt-dlp`).

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
- installiert `pillow` und `numpy` mit `pip --user`,
- installiert die HyperFrames-Skills über die offizielle CLI (`npx -y hyperframes skills update general-video hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio`; das bringt den Kern-Satz `hyperframes`, `hyperframes-*` und `media-use` mit) und lädt mit `npx hyperframes browser ensure` den Chrome für Renders,
- legt `.env` aus `.env.example` an,
- ergänzt bei `--projekt` die `.gitignore` deines Projekts um `.claude/skills/motion-videos/.env` und `motion-runs/`,
- läuft zum Schluss `scripts/setup_check.sh`.

Mit `--ohne-hyperframes` werden HyperFrames-Skills und Chrome übersprungen (z. B. wenn du HyperFrames als Plugin nutzt). Die HyperFrames-Skills landen immer im globalen Skill-Ordner von Claude Code, auch bei `--projekt`.

Danach Claude Code neu starten, damit der Skill geladen wird.

## 2 · Keys

```bash
open -e ~/.claude/skills/motion-videos/.env     # bzw. .claude/skills/motion-videos/.env im Projekt
```

`GEMINI_API_KEY` eintragen. Die Skripte suchen den Key in dieser Reihenfolge: Umgebungsvariable → `.env` im Arbeitsverzeichnis → `.env` im Skill-Ordner. Der Key geht nur als Header an Google, nie in eine URL.

**Modell wechseln:** Standard ist `gemini-3.8-flash` (video- und audiofähig, laut [Modell-Liste](https://ai.google.dev/gemini-api/docs/models) stabil, Stand Oktober 2026). Ein anderes Modell per `GEMINI_MODEL=<model-id>` in der `.env` oder als Umgebungsvariable. Welche Modelle dein Key sieht:

```bash
curl -s -H "x-goog-api-key: $GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1beta/models | grep '"name"'
```

**Generatoren** brauchen keine Einträge in dieser `.env`: Claude nutzt, was in Claude Code angeschlossen ist, und fragt im Referenz-Gate danach. Ohne Generator baut der Skill alles in Code und nutzt deine eigenen Fotos, Musik und Effekte.

## 3 · Prüfen

```bash
bash ~/.claude/skills/motion-videos/scripts/setup_check.sh
```

Der Check sagt, was fehlt, und nennt den Befehl dazu. Bei „Alles bereit“ bist du startklar.

## 4 · Erster Lauf

In Claude Code, in dem Projekt, in dem der Film entstehen soll:

```
/motion-videos Bau dieses Video für mein Produkt https://mein-produkt.de nach: https://www.youtube.com/watch?v=...
```

Claude legt `./motion-runs/<datum>_<slug>/` an, stellt die Gate-Fragen und arbeitet dann Phase für Phase. `motion-runs/` gehört in die `.gitignore` deines Projekts (Renders und Frames sind groß).

Die Skripte gehen auch ohne Claude, z. B. zum Ausprobieren:

```bash
S=~/.claude/skills/motion-videos/scripts
bash $S/hole-referenz.sh "https://www.youtube.com/watch?v=..." motion-runs/test
node $S/ton-referenz.mjs motion-runs/test/analyse/referenz.mp4 motion-runs/test/analyse/ton-referenz.md
python3 $S/bewegung.py motion-runs/test/analyse/referenz.mp4
```

## Fehlerbilder

| Symptom | Ursache / Lösung |
|---|---|
| `Operation not permitted` beim Lesen von `~/Downloads`, `~/Desktop`, `~/Documents` | macOS-Datenschutz. Dateien in den Lauf-Ordner (`motion-runs/<lauf>/assets/`) ziehen, oder dem Terminal unter Systemeinstellungen → Datenschutz & Sicherheit → Dateien und Ordner Zugriff geben. |
| `hole-referenz.sh` endet mit „login-pflichtig, privat oder gesperrt“ (Exit 3) | Das Video braucht einen Login (typisch bei manchen Reels). Der Skill nutzt bewusst keine Cookies. Video selbst herunterladen und die Datei angeben. |
| `Sperre belegt: /tmp/<lauf>-render.lock` | Ein anderer Render oder ffmpeg-Job läuft (gewollt: nie zwei Medienjobs gleichzeitig). Warten. Ist sicher nichts mehr aktiv (`pgrep -fl "ffmpeg\|chrome-headless"`), die Sperre mit `rmdir /tmp/<lauf>-render.lock` lösen. |
| `In … liegt schon eine Referenz` | `hole-referenz.sh` überschreibt nichts. Neuen Lauf-Ordner nehmen oder die alten Dateien selbst wegräumen. |
| `GEMINI_API_KEY fehlt` | `.env` fehlt oder Key leer (Schritt 2). |
| `generateContent (…): HTTP 404` | Modellname existiert nicht (mehr). `GEMINI_MODEL` auf ein Modell aus der Liste oben setzen. |
| `externally-managed-environment` bei `pip` | Homebrew-Python. `brew install pillow numpy` oder `python3 -m pip install --user --break-system-packages -r requirements.txt`. |
| `npm run check` rot mit `multiple_root_compositions` | Eine Teil-Render-Fensterdatei `_fenster-*.html` liegt noch im Film-Ordner. Löschen, dann erneut prüfen. |
| Video zeigt am Anfang nur ein Standbild | Datei ohne `+faststart`. Web-Kopie nach `references/07-qa.md` erzeugen. |
