#!/usr/bin/env bash
# Render-Sperre um einen Medienjob (Render, ffmpeg). Nie zwei Medienjobs gleichzeitig.
# Teil des Skills motion-videos (MIT).
#
# Aufruf: bash sperre.sh <name> -- <befehl …>
#   name = kurzer Lauf-Name, die Sperre liegt unter /tmp/<name>-render.lock
#   (dieselbe Sperre nutzen vergleich.py und bewegung.py mit --sperre <name>).
# Wartet max. 10 min, läuft mit nice -n 10, gibt die Sperre auch bei Fehler frei.
# Exit-Code = Exit-Code des Befehls (1, wenn die Sperre nach 10 min noch belegt ist).
set -u
if [ $# -lt 2 ]; then
  echo "Aufruf: bash sperre.sh <name> -- <befehl …>" >&2; exit 2
fi
NAME=$1; shift
[ "${1:-}" = "--" ] && shift
LOCK="/tmp/${NAME}-render.lock"
for i in $(seq 1 120); do
  if mkdir "$LOCK" 2>/dev/null; then break; fi
  if [ "$i" -eq 120 ]; then echo "Sperre nach 10 min noch belegt: $LOCK" >&2; exit 1; fi
  [ "$i" -eq 1 ] && echo "Sperre belegt ($LOCK), warte …" >&2
  sleep 5
done
trap 'rmdir "$LOCK" 2>/dev/null' EXIT
nice -n 10 "$@"
