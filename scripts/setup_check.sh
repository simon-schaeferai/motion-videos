#!/usr/bin/env bash
# setup_check.sh: prüft alle Voraussetzungen des Skills motion-videos und sagt, was FEHLT.
# Teil des Skills motion-videos (MIT). Ändert nichts, installiert nichts.
# Aufruf: bash scripts/setup_check.sh   (aus dem Skill-Ordner oder von überall)
set -uo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"

grn="\033[0;32m"; red="\033[0;31m"; ylw="\033[0;33m"; dim="\033[2m"; rst="\033[0m"
ok=0; miss=0
pass(){ printf "  ${grn}✓${rst} %s\n" "$1"; ok=$((ok+1)); }
fail(){ printf "  ${red}✗${rst} %s\n     ${dim}→ %s${rst}\n" "$1" "$2"; miss=$((miss+1)); }
note(){ printf "  ${ylw}!${rst} %s\n     ${dim}→ %s${rst}\n" "$1" "$2"; }
has(){ command -v "$1" >/dev/null 2>&1; }
OS="$(uname -s)"
hint(){ if [ "$OS" = Darwin ]; then echo "brew install $1"; else echo "$2"; fi; }

echo ""
echo "── motion-videos · Setup-Check ─────────────────"
echo "Skill-Ordner: $SKILL"
echo ""
echo "Werkzeuge:"

if has node; then
  NV=$(node -v | sed 's/^v//'); NM=${NV%%.*}
  if [ "$NM" -ge 18 ] 2>/dev/null; then pass "Node $NV"; else fail "Node $NV ist zu alt (mind. 18)" "$(hint node 'https://nodejs.org')"; fi
else fail "Node.js fehlt (mind. 18)" "$(hint node 'https://nodejs.org')"; fi
has npx && pass "npx" || fail "npx fehlt" "kommt mit Node.js (siehe oben)"

if has python3; then
  pass "Python $(python3 -V 2>&1 | awk '{print $2}')"
  for mod in PIL numpy; do
    if python3 -c "import $mod" 2>/dev/null; then pass "Python-Paket $mod"
    else fail "Python-Paket $mod fehlt" "python3 -m pip install --user -r \"$SKILL/requirements.txt\""; fi
  done
else fail "Python 3 fehlt" "$(hint python 'Paketmanager deiner Distribution')"; fi

has ffmpeg  && pass "ffmpeg ($(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}'))" || fail "ffmpeg fehlt" "$(hint ffmpeg 'sudo apt install ffmpeg')"
has ffprobe && pass "ffprobe" || fail "ffprobe fehlt" "kommt mit ffmpeg: $(hint ffmpeg 'sudo apt install ffmpeg')"
has yt-dlp  && pass "yt-dlp ($(yt-dlp --version 2>/dev/null))" || fail "yt-dlp fehlt (für Referenz-URLs; lokale Dateien gehen ohne)" "$(hint yt-dlp 'python3 -m pip install --user yt-dlp')"

echo ""
echo "HyperFrames:"
found=""
for d in "$HOME/.claude/skills" "$PWD/.claude/skills"; do [ -f "$d/hyperframes/SKILL.md" ] && found="$d"; done
if [ -n "$found" ]; then
  for s in hyperframes hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio general-video; do
    if [ -f "$found/$s/SKILL.md" ] || [ -f "$HOME/.claude/skills/$s/SKILL.md" ]; then pass "Skill $s"
    else fail "Skill $s fehlt" "npx -y hyperframes skills update general-video hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio"; fi
  done
else
  fail "HyperFrames-Skills fehlen" "npx -y hyperframes skills update general-video hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio"
fi
if has npx; then
  DOC=$(npx --yes hyperframes doctor 2>/dev/null | grep -E 'Chrome ' | head -1)
  case "$DOC" in
    *✓*) pass "Chrome für HyperFrames-Renders" ;;
    "")  note "HyperFrames-CLI nicht prüfbar (offline?)" "npx hyperframes doctor" ;;
    *)   fail "Chrome für HyperFrames-Renders fehlt" "npx hyperframes browser ensure" ;;
  esac
fi

echo ""
echo "Keys:"
key_src=""
if [ -n "${GEMINI_API_KEY:-}${GOOGLE_API_KEY:-}" ]; then key_src="Umgebungsvariable"; fi
if [ -z "$key_src" ]; then
  for f in "$PWD/.env" "$SKILL/.env"; do
    if [ -f "$f" ] && grep -qE '^[[:space:]]*(GEMINI_API_KEY|GOOGLE_API_KEY)[[:space:]]*=[[:space:]]*["'"'"']?[A-Za-z0-9_-]{10,}' "$f"; then key_src="$f"; break; fi
  done
fi
if [ -n "$key_src" ]; then pass "GEMINI_API_KEY gesetzt ($key_src)"
elif [ -f "$SKILL/.env" ]; then fail "GEMINI_API_KEY fehlt (Pflicht für die Ton-Analyse)" "Key in \"$SKILL/.env\" eintragen: https://aistudio.google.com/apikey"
else fail "GEMINI_API_KEY fehlt (Pflicht für die Ton-Analyse)" "cp \"$SKILL/.env.example\" \"$SKILL/.env\" und Key eintragen: https://aistudio.google.com/apikey"; fi
note "Bild-, Video-, Musik- und SFX-Generatoren sind optional" "Claude fragt im Referenz-Gate, was angeschlossen ist (MCP oder API). Ohne Generator: Code-only-Route mit eigenen Assets."

echo ""
echo "────────────────────────────────────────────────"
printf "  ${grn}%d ok${rst}" "$ok"; [ "$miss" -gt 0 ] && printf "   ${red}%d fehlt${rst}" "$miss"; echo ""
if [ "$miss" -eq 0 ]; then printf "  ${grn}Alles bereit. In Claude Code: /motion-videos${rst}\n"
else printf "  ${red}Bitte die ✗-Punkte abarbeiten (oder bash install.sh), dann erneut prüfen.${rst}\n"; fi
echo ""
exit "$miss"
