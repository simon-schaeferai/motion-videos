#!/usr/bin/env bash
# install.sh: installiert den Claude-Code-Skill motion-videos und seine Voraussetzungen.
# Teil des Skills motion-videos (MIT).
#
# Aufruf (aus dem geklonten Repo heraus):
#   bash install.sh --global              → ~/.claude/skills/motion-videos (in allen Projekten verfügbar)
#   bash install.sh --projekt             → ./.claude/skills/motion-videos (nur im aktuellen Projekt)
#   Zusatz: --ohne-hyperframes            → HyperFrames-Skills und Chrome nicht installieren/aktualisieren
#
# Alternativ direkt an den Zielort klonen und dort  bash install.sh --global  (bzw. --projekt) aufrufen;
# dann wird nichts kopiert, nur die Voraussetzungen werden geprüft.
#
# Was das Skript tut: kopiert den Skill (ohne .git, .env, Läufe), prüft Node 18+, installiert die
# Python-Pakete mit pip --user, prüft ffmpeg/ffprobe/yt-dlp (installiert sie NICHT, zeigt den Befehl),
# installiert die HyperFrames-Skills über die offizielle CLI, legt .env aus .env.example an und
# läuft zum Schluss scripts/setup_check.sh. Kein sudo, kein automatisches brew.
set -uo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
MODE=""; HF=1
for a in "$@"; do
  case "$a" in
    --global) MODE=global ;;
    --projekt|--project) MODE=projekt ;;
    --ohne-hyperframes) HF=0 ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) echo "Unbekannte Option: $a (siehe bash install.sh --help)" >&2; exit 2 ;;
  esac
done
[ -z "$MODE" ] && { echo "Bitte --global oder --projekt angeben (siehe bash install.sh --help)." >&2; exit 2; }

if [ "$MODE" = global ]; then DEST="$HOME/.claude/skills/motion-videos"; else DEST="$PWD/.claude/skills/motion-videos"; fi
has(){ command -v "$1" >/dev/null 2>&1; }
step(){ printf "\n\033[1m%s\033[0m\n" "$1"; }
warn(){ printf "  \033[0;33m!\033[0m %s\n" "$1"; }
okay(){ printf "  \033[0;32m✓\033[0m %s\n" "$1"; }

step "1 · Skill nach $DEST"
if [ "$(cd "$DEST" 2>/dev/null && pwd)" = "$SRC" ]; then
  okay "liegt schon am Zielort, nichts zu kopieren"
else
  mkdir -p "$DEST"
  if has rsync; then
    rsync -a --exclude .git --exclude .env --exclude motion-runs --exclude output --exclude node_modules --exclude .venv --exclude .DS_Store "$SRC/" "$DEST/"
  else
    (cd "$SRC" && tar --exclude .git --exclude .env --exclude motion-runs --exclude output --exclude node_modules --exclude .venv -cf - .) | (cd "$DEST" && tar -xf -)
  fi
  okay "kopiert (eine vorhandene .env bleibt unangetastet)"
fi
chmod +x "$DEST"/install.sh "$DEST"/scripts/*.sh 2>/dev/null || true

step "2 · Node.js"
if has node && [ "$(node -v | sed 's/^v//; s/\..*//')" -ge 18 ] 2>/dev/null; then okay "Node $(node -v)"
else warn "Node 18+ fehlt. macOS: brew install node · sonst https://nodejs.org"; fi

step "3 · Python-Pakete (pillow, numpy)"
if ! has python3; then
  warn "Python 3 fehlt. macOS: brew install python"
elif python3 -c "import PIL, numpy" 2>/dev/null; then
  okay "schon vorhanden"
else
  if python3 -m pip install --user --quiet -r "$DEST/requirements.txt"; then okay "installiert (pip --user)"
  else
    warn "pip --user hat nicht geklappt (z. B. „externally-managed-environment“ bei Homebrew-Python)."
    warn "Eine dieser Varianten nutzen: brew install pillow numpy  ·  python3 -m pip install --user --break-system-packages -r \"$DEST/requirements.txt\""
  fi
fi

step "4 · ffmpeg, ffprobe, yt-dlp"
for t in ffmpeg ffprobe yt-dlp; do
  if has "$t"; then okay "$t"
  else
    case "$t" in yt-dlp) pkg=yt-dlp ;; *) pkg=ffmpeg ;; esac
    warn "$t fehlt. macOS: brew install $pkg · Linux: Paketmanager (yt-dlp auch: python3 -m pip install --user yt-dlp)"
  fi
done

step "5 · HyperFrames-Skills + Render-Chrome"
if [ "$HF" -eq 0 ]; then
  warn "übersprungen (--ohne-hyperframes)"
elif has npx; then
  if npx -y hyperframes skills update general-video hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio; then
    okay "HyperFrames-Skills installiert/aktualisiert"
  else warn "HyperFrames-Skills nicht installiert. Später: npx -y hyperframes skills update general-video hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio"; fi
  if npx -y hyperframes browser ensure >/dev/null 2>&1; then okay "Chrome für Renders bereit"
  else warn "Chrome für Renders fehlt. Später: npx hyperframes browser ensure"; fi
else
  warn "npx fehlt (kommt mit Node.js), HyperFrames-Skills nicht installiert"
fi

step "6 · Keys (.env)"
if [ -f "$DEST/.env" ]; then okay ".env existiert schon: $DEST/.env"
else cp "$DEST/.env.example" "$DEST/.env" && okay ".env angelegt: $DEST/.env  → GEMINI_API_KEY eintragen (https://aistudio.google.com/apikey)"; fi

if [ "$MODE" = projekt ]; then
  step "7 · .gitignore des Projekts"
  if [ -f .gitignore ] || git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    for line in ".claude/skills/motion-videos/.env" "motion-runs/"; do
      grep -qxF "$line" .gitignore 2>/dev/null || { echo "$line" >> .gitignore; okay "ergänzt: $line"; }
    done
  else
    warn "Kein Git-Projekt. Falls später eins: .claude/skills/motion-videos/.env und motion-runs/ in die .gitignore."
  fi
fi

step "Prüfung"
bash "$DEST/scripts/setup_check.sh"
rc=$?
echo "Claude Code neu starten (oder neue Sitzung), dann: /motion-videos"
exit $rc
