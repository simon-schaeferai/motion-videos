#!/usr/bin/env bash
# hf.sh: die eine Stelle, an der die HyperFrames-Version festgelegt wird. Jeder HyperFrames-Aufruf des Skills läuft
# hierüber (Render, Teil-Render, Snapshot, Capture, check, init). Teil des Skills motion-videos (MIT).
#
# Aufruf:  bash <skill-dir>/scripts/hf.sh <hyperframes-befehl …>      z. B. render -c index.html -o renders/x.mp4 --workers 2 --quiet
#          bash <skill-dir>/scripts/hf.sh --welche                     zeigt Version und Quelle, startet nichts
# Unter der Render-Sperre: bash <skill-dir>/scripts/sperre.sh <lauf> -- bash <skill-dir>/scripts/hf.sh render …
# (sperre.sh setzt nice selbst; davor nie ein zweites nice, hyperframes render bricht sonst mit EACCES ab).
#
# Version, in dieser Reihenfolge:
#   1. Umgebung HYPERFRAMES_VERSION (bewusst überschreiben, z. B. zum Testen einer neuen Fassung)
#   2. hyperframes@<x.y.z> in ./package.json, sonst ./film/package.json (gepinnt von `hf.sh init`)
#   3. Standard des Skills: <skill-dir>/scripts/hyperframes-version (geprüfte Fassung)
# HF_CLI ersetzt den ganzen Befehl (z. B. eine lokale Installation: HF_CLI="node /pfad/cli.js").
# Warum: `npx hyperframes` ohne Version nimmt die zwischengespeicherte Fassung. Im Beweistest renderte die Sitzung bis
# Runde 4 mit 0.8.147 statt der im Projekt festgelegten 0.8.143 und merkte es erst spät.
set -euo pipefail
SKILL_SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STANDARD="$(tr -d '[:space:]' < "$SKILL_SCRIPTS/hyperframes-version" 2>/dev/null || true)"
VERSION="" QUELLE=""
if [ -n "${HYPERFRAMES_VERSION:-}" ]; then VERSION="$HYPERFRAMES_VERSION"; QUELLE="Umgebung HYPERFRAMES_VERSION"; fi
if [ -z "$VERSION" ]; then
  for pj in package.json film/package.json; do
    if [ -f "$pj" ]; then
      v=$(grep -o 'hyperframes@[0-9][0-9.]*' "$pj" 2>/dev/null | head -1 | cut -d@ -f2 || true)
      if [ -n "$v" ]; then VERSION="$v"; QUELLE="$pj"; break; fi
    fi
  done
fi
if [ -z "$VERSION" ]; then VERSION="$STANDARD"; QUELLE="Standard des Skills (scripts/hyperframes-version)"; fi
if [ -z "$VERSION" ]; then echo "hf.sh: keine HyperFrames-Version gefunden (scripts/hyperframes-version fehlt)" >&2; exit 2; fi

if [ "${1:-}" = "--welche" ]; then
  echo "HyperFrames $VERSION ($QUELLE)${STANDARD:+; Standard des Skills $STANDARD}"
  [ -n "$STANDARD" ] && [ "$VERSION" != "$STANDARD" ] && echo "Hinweis: weicht vom Standard des Skills ab. Absicht? Sonst package.json auf hyperframes@$STANDARD setzen." >&2
  exit 0
fi
if [ -n "${HF_CLI:-}" ]; then
  read -r -a CLI <<< "$HF_CLI"
  exec "${CLI[@]}" "$@"
fi
exec npx --yes "hyperframes@$VERSION" "$@"
