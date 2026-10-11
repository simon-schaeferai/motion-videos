#!/usr/bin/env bash
# Teil-Render genau eines Blocks (nur sein Zeitfenster) unter der Render-Sperre.
# Teil des Skills motion-videos (MIT).
#
# Aufruf im Projektordner (film/, dort liegt index.html):
#   bash <skill-dir>/scripts/render-block.sh <lauf-name> <N> [ausgabe.mp4]
#     lauf-name = Name der Sperre (wie bei sperre.sh), N = Blocknummer, Ausgabe Standard renders/block<N>.mp4
#   Version: scripts/hf.sh (package.json-Pin, sonst Standard des Skills); HF_CLI bzw. HYPERFRAMES_VERSION wie dort.
#
# Ablauf: erst die Sperre holen (scripts/sperre.sh, wartet max. 10 min, nice), DANN die Fensterdatei
# _fenster-block<N>-<pid>.html anlegen (Kopie von index.html nur mit Slot N, data-start 0, Wurzel-Dauer = Slot-Dauer),
# rendern mit --workers 2, Fensterdatei per trap entfernen (auch bei Fehler oder Abbruch).
# Der Slot wird über data-composition-id="block<N>" gefunden (Vorlage: templates/BAUANLEITUNG.vorlage.md).
# Frame 0 des Teil-Renders = erster Frame des Blocks im Film. Ton-Slots fallen weg (Teil-Render ist stumm).
set -euo pipefail

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
SKILL_SCRIPTS="$(dirname "$SELF")"

usage() { echo "Aufruf: bash render-block.sh <lauf-name> <N> [ausgabe.mp4]" >&2; exit 2; }

# ---------- Phase 2: läuft unter der Sperre ----------
if [ "${1:-}" = "--unter-sperre" ]; then
  N=$2; OUT=$3; PROJ=$4
  cd "$PROJ"
  WIN="_fenster-block${N}-$$.html"
  cleanup() { rm -f -- "$PROJ/$WIN"; }
  trap cleanup EXIT INT TERM HUP
  DUR=$(python3 - "$N" "$WIN" <<'PY'
import re, sys
n, win = sys.argv[1], sys.argv[2]
src = open("index.html", encoding="utf-8").read()
# alle Slot-Elemente: div mit data-composition-src (eine Zeile oder mehrzeilig)
slot_re = re.compile(r'<div\b[^>]*\bdata-composition-src="[^"]*"[^>]*>\s*</div>', re.S)
slots = slot_re.findall(src)
target = [s for s in slots if re.search(r'\bdata-composition-id="block%s"' % re.escape(n), s)]
if len(target) != 1:
    sys.exit("Slot data-composition-id=\"block%s\" in index.html nicht eindeutig gefunden (%d Treffer)" % (n, len(target)))
slot = target[0]
m = re.search(r'\bdata-duration="([0-9.]+)"', slot)
if not m:
    sys.exit("Slot block%s hat kein data-duration" % n)
dur = m.group(1)
# Ganze Frames prüfen (Toleranz 1,1 ms; die alte Konvention „0,5 ms vor dem Schnitt“ bleibt erlaubt)
fps_m = re.search(r'\bdata-fps="([0-9.]+)"', src)
fps = float(fps_m.group(1)) if fps_m else 30.0
st = re.search(r'\bdata-start="([0-9.]+)"', slot)
if st:
    s = float(st.group(1)); f = s * fps
    if abs(f - round(f)) / fps > 0.0011:
        print("Warnung: Slot block%s startet bei %s s = Frame %.3f, nicht auf einem ganzen Frame" % (n, st.group(1), f), file=sys.stderr)
new_slot = re.sub(r'\bdata-start="[0-9.]+"', 'data-start="0"', slot)
out = src
for s in slots:
    out = out.replace(s, "", 1)
# Wurzel: erstes Element mit data-composition-id und data-duration, das kein Slot ist
root_re = re.compile(r'(<div\b(?![^>]*data-composition-src)[^>]*\bdata-composition-id="[^"]+"[^>]*>)', re.S)
rm = root_re.search(out)
if not rm:
    sys.exit("Wurzel-Element in index.html nicht gefunden")
root_tag = rm.group(1)
new_root = re.sub(r'\bdata-duration="[0-9.]+"', 'data-duration="%s"' % dur, root_tag) if "data-duration=" in root_tag else root_tag.replace(">", ' data-duration="%s">' % dur, 1)
out = out.replace(root_tag, new_root + "\n      " + new_slot, 1)
open(win, "w", encoding="utf-8").write(out)
print(dur)
PY
)
  mkdir -p "$(dirname "$OUT")"
  # Version nur über hf.sh (gepinnte Fassung aus package.json, sonst Standard des Skills); kein eigenes nice (sperre.sh)
  bash "$SKILL_SCRIPTS/hf.sh" render -c "$WIN" -o "$OUT" --workers 2 --quiet
  echo "Block $N gerendert: $OUT ($DUR s)"
  exit 0
fi

# ---------- Phase 1: prüfen, dann unter der Sperre neu starten ----------
[ $# -ge 2 ] || usage
LAUF=$1; N=$2; OUT=${3:-renders/block$N.mp4}
[[ "$N" =~ ^[0-9]+$ ]] || { echo "Blocknummer muss eine Zahl sein: $N" >&2; exit 2; }
[ -f index.html ] || { echo "index.html fehlt: im Projektordner (film/) aufrufen" >&2; exit 2; }
command -v python3 >/dev/null || { echo "python3 fehlt" >&2; exit 2; }
for f in _fenster-block*.html; do
  [ -e "$f" ] && echo "Hinweis: alte Fensterdatei $f liegt im Projekt (abgebrochener Lauf?). Bitte prüfen und entfernen, sonst meldet check mehrere Wurzeln." >&2
done
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
exec bash "$SKILL_SCRIPTS/sperre.sh" "$LAUF" -- bash "$SELF" --unter-sperre "$N" "$OUT" "$PWD"
