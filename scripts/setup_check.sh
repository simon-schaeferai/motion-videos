#!/usr/bin/env bash
# setup_check.sh: prüft alle Voraussetzungen des Skills motion-videos und sagt, was FEHLT.
# Teil des Skills motion-videos (MIT). Ändert nichts, installiert nichts.
# Aufruf: bash scripts/setup_check.sh [--gemini]   (aus dem Skill-Ordner oder von überall)
#   --gemini  prüft zusätzlich mit einer Mini-Anfrage (ein paar Tokens, zählt als 1 Anfrage), ob das Gemini-Hauptmodell
#             heute noch Kontingent hat. Sonst bleibt der Check ohne Netzaufruf an Gemini.
set -uo pipefail
GEMINI_PROBE=0
for a in "$@"; do case "$a" in --gemini) GEMINI_PROBE=1 ;; esac; done
SKILL="$(cd "$(dirname "$0")/.." && pwd)"

grn="\033[0;32m"; red="\033[0;31m"; ylw="\033[0;33m"; dim="\033[2m"; rst="\033[0m"
ok=0; miss=0
pass(){ printf "  ${grn}✓${rst} %s\n" "$1"; ok=$((ok+1)); }
fail(){ printf "  ${red}✗${rst} %s\n     ${dim}→ %s${rst}\n" "$1" "$2"; miss=$((miss+1)); }
note(){ printf "  ${ylw}!${rst} %s\n     ${dim}→ %s${rst}\n" "$1" "$2"; }
has(){ command -v "$1" >/dev/null 2>&1; }
OS="$(uname -s)"
hint(){ if [ "$OS" = Darwin ]; then echo "brew install $1"; else echo "$2"; fi; }
# pip-Befehl passend zur Python-Umgebung: venv → ohne --user; PEP 668 (Homebrew-/System-Python) → --user
# --break-system-packages (installiert nur ins Benutzerverzeichnis, Homebrew-Pakete bleiben unberührt); sonst --user.
pip_cmd(){
  if python3 -c 'import sys; sys.exit(0 if sys.prefix != sys.base_prefix else 1)' 2>/dev/null; then
    echo "python3 -m pip install $1"
  elif python3 -c 'import os, sys, sysconfig; sys.exit(0 if os.path.isfile(os.path.join(sysconfig.get_path("stdlib"), "EXTERNALLY-MANAGED")) else 1)' 2>/dev/null; then
    echo "python3 -m pip install --user --break-system-packages $1   (Homebrew-/System-Python mit PEP 668: „--user --break-system-packages“ installiert nur in dein Benutzerverzeichnis und lässt die Homebrew-Pakete unberührt; nach einem Python-Update erneut ausführen. Alternative: venv, siehe SETUP.md)"
  else
    echo "python3 -m pip install --user $1"
  fi
}

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
  for mod in PIL numpy scipy; do
    if python3 -c "import $mod" 2>/dev/null; then pass "Python-Paket $mod"
    else fail "Python-Paket $mod fehlt" "$(pip_cmd "-r \"$SKILL/requirements.txt\"")"; fi
  done
  if python3 -c "import cv2" 2>/dev/null; then pass "Python-Paket cv2 (OpenCV)"
  else fail "Python-Paket cv2 (OpenCV) fehlt: R5 ★ ist ohne OpenCV nicht prüfbar (Bildfluss für Stand und Drift in scripts/qualitaet.py --bewegung); ein nicht gemessenes ★-Kriterium zählt wie rot" "$(pip_cmd opencv-python-headless)"; fi
else fail "Python 3 fehlt" "$(hint python 'Paketmanager deiner Distribution')"; fi

has ffmpeg  && pass "ffmpeg ($(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}'))" || fail "ffmpeg fehlt" "$(hint ffmpeg 'sudo apt install ffmpeg')"
has ffprobe && pass "ffprobe" || fail "ffprobe fehlt" "kommt mit ffmpeg: $(hint ffmpeg 'sudo apt install ffmpeg')"
has yt-dlp  && pass "yt-dlp ($(yt-dlp --version 2>/dev/null))" || fail "yt-dlp fehlt (für Referenz-URLs; lokale Dateien gehen ohne)" "$(hint yt-dlp 'python3 -m pip install --user yt-dlp')"

echo ""
echo "HyperFrames:"
found=""
for d in "$HOME/.claude/skills" "$PWD/.claude/skills"; do [ -f "$d/hyperframes/SKILL.md" ] && found="$d"; done
PROJEKT_SKILL=0; [ "$SKILL" = "$(cd "$PWD" && pwd -P)/.claude/skills/motion-videos" ] || [ "$SKILL" = "$PWD/.claude/skills/motion-videos" ] && PROJEKT_SKILL=1
if [ -n "$found" ]; then
  for s in hyperframes hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio general-video; do
    if [ -f "$found/$s/SKILL.md" ] || [ -f "$HOME/.claude/skills/$s/SKILL.md" ]; then pass "Skill $s"
    else fail "Skill $s fehlt" "npx -y hyperframes skills update general-video hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio"; fi
  done
else
  fail "HyperFrames-Skills fehlen" "npx -y hyperframes skills update general-video hyperframes-core hyperframes-keyframes hyperframes-animation hyperframes-audio"
fi
if [ "$PROJEKT_SKILL" = 1 ] && [ -n "$found" ] && [ ! -f "$PWD/.claude/skills/hyperframes/SKILL.md" ]; then
  note "motion-videos liegt im Projekt, die HyperFrames-Skills nur global" "Eine Sitzung mit reinen Projekt-Einstellungen (z. B. claude --setting-sources project) sieht globale Skills nicht, obwohl dieser Check grün ist. Dann die HyperFrames-Skills ebenfalls ins Projekt legen: cp -R ~/.claude/skills/hyperframes ~/.claude/skills/hyperframes-* ~/.claude/skills/general-video .claude/skills/"
fi
if has npx; then
  # Version nur über scripts/hf.sh (eine Stelle: package.json-Pin, sonst scripts/hyperframes-version)
  STD="$(tr -d '[:space:]' < "$SKILL/scripts/hyperframes-version" 2>/dev/null || true)"
  pass "HyperFrames-Version des Skills: ${STD:-?} (alle Aufrufe über scripts/hf.sh)"
  for pj in "$PWD"/motion-runs/*/film/package.json; do
    [ -f "$pj" ] || continue
    PIN=$(grep -o 'hyperframes@[0-9][0-9.]*' "$pj" | head -1 | cut -d@ -f2)
    if [ -n "$PIN" ] && [ -n "$STD" ] && [ "$PIN" != "$STD" ]; then
      note "Lauf $(basename "$(dirname "$(dirname "$pj")")") pinnt HyperFrames $PIN, der Skill ist auf $STD geprüft" "hf.sh nimmt im Lauf $PIN (Absicht?). Sonst in film/package.json hyperframes@$STD eintragen und neu rendern."
    fi
  done
  DOC=$(bash "$SKILL/scripts/hf.sh" doctor 2>/dev/null | grep -E 'Chrome ' | head -1)
  case "$DOC" in
    *✓*) pass "Chrome für HyperFrames-Renders" ;;
    "")  note "HyperFrames-CLI nicht prüfbar (offline?)" "bash $SKILL/scripts/hf.sh doctor" ;;
    *)   fail "Chrome für HyperFrames-Renders fehlt" "bash $SKILL/scripts/hf.sh browser ensure" ;;
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
if [ "$GEMINI_PROBE" = 1 ] && [ -n "$key_src" ] && has node; then
  PROBE=$(node "$SKILL/scripts/hoertest.mjs" --kontingent 2>&1); rc=$?
  case $rc in
    0) pass "Gemini-Hauptmodell hat heute Kontingent ($(echo "$PROBE" | tail -1))" ;;
    3) fail "Gemini-Hauptmodell heute ohne Kontingent, nur das Ersatzmodell antwortet" "Hörtests laufen dann nur eingeschränkt (Stand höchstens „Hörtest eingeschränkt“). Abrechnung aktivieren (https://aistudio.google.com/) oder morgen weiter. Meldung: $(echo "$PROBE" | tail -1)" ;;
    *) fail "Gemini antwortet nicht (Haupt- und Ersatzmodell)" "$(echo "$PROBE" | tail -1)" ;;
  esac
elif [ "$GEMINI_PROBE" = 0 ]; then
  note "Gemini-Kontingent nicht geprüft" "bash \"$SKILL/scripts/setup_check.sh\" --gemini prüft mit einer Mini-Anfrage, ob das Hauptmodell heute noch Kontingent hat (vor jedem Lauf empfohlen)."
fi
note "Gemini Free Tier reicht oft nicht für einen ganzen Lauf" "Ein Key ohne Abrechnung hat je Modell ein Tageskontingent (Stand Oktober 2026: 20 Anfragen/Tag). Analyse, Hörtests und Wiederholungen brauchen mehr: Abrechnung aktivieren (https://aistudio.google.com/). Bei Überlast oder leerem Kontingent springt GEMINI_MODEL_FALLBACK ein (.env)."
note "Bild-, Video-, Musik- und SFX-Generatoren sind optional" "Claude fragt im Referenz-Gate, was angeschlossen ist (MCP oder API). Ohne Generator: Code-only-Route mit eigenen Assets; Effekte synthetisiert Claude dann im Code."

echo ""
echo "────────────────────────────────────────────────"
printf "  ${grn}%d ok${rst}" "$ok"; [ "$miss" -gt 0 ] && printf "   ${red}%d fehlt${rst}" "$miss"; echo ""
if [ "$miss" -eq 0 ]; then printf "  ${grn}Alles bereit. In Claude Code: /motion-videos${rst}\n"
else printf "  ${red}Bitte die ✗-Punkte abarbeiten (oder bash install.sh), dann erneut prüfen.${rst}\n"; fi
echo ""
exit "$miss"
