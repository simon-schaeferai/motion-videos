#!/usr/bin/env bash
# version-sichern.sh: friert den Bauzustand eines Laufs als Version ein, bevor die nächste Runde Änderungen beginnt.
# Teil des Skills motion-videos (MIT). Überschreibt nie etwas und löscht nichts.
#
# Aufruf: bash version-sichern.sh <lauf-ordner> <vN> ["Notiz, was diese Version ausmacht"]
#   <lauf-ordner>  der HyperFrames-Projektordner (mit compositions/, index.html) oder der Lauf-Ordner darüber,
#                  wenn das Projekt in <lauf>/film/ liegt
#   <vN>           Versionsname, z. B. v7 oder v11b (Buchstaben, Ziffern, Bindestrich)
#
# Kopiert nach <lauf>/versionen/<vN>/:
#   aus dem Projekt:  compositions/  lib/  tools/  index.html  alle *.js, *.json, *.md der Projektwurzel
#                     (Zeitpläne plan.js, b*_plan.js, cues.json, ton-plan.json, BAUANLEITUNG.md …; ohne
#                     package-lock.json)  assets/sfx/ (Musik-Schnitte, Segmentpläne, Effekte)
#   aus dem Lauf:     lauf/ereignisse*.json  lauf/musik/  (nur wenn das Projekt in <lauf>/film/ liegt)
# (ohne archiv/, _archiv*/, node_modules/, __pycache__/, .DS_Store). Audio wird auf APFS als Klon kopiert
# (cp -c, belegt keinen Platz, bis sich das Original ändert), sonst normal.
# Schreibt <lauf>/versionen/<vN>/VERSION.md und eine Zeile unter „## Versionen“ in <lauf>/MANIFEST.md
# (fehlt der Abschnitt, wird er angehängt; fehlt die Datei, wird sie angelegt).
# Gibt es <vN> schon, bricht das Skript ab: neue Versionsnummer wählen.
set -euo pipefail

hilfe() { awk 'NR>1 && /^#/ {sub(/^# ?/, ""); print; next} NR>1 {exit}' "$0"; exit "${1:-0}"; }
[ $# -ge 1 ] && { [ "$1" = "-h" ] || [ "$1" = "--help" ]; } && hilfe 0
[ $# -lt 2 ] && hilfe 2

LAUF="$(cd "$1" 2>/dev/null && pwd)" || { echo "Lauf-Ordner nicht gefunden: $1" >&2; exit 2; }
VN="$2"; NOTIZ="${3:-}"
case "$VN" in
  ''|*[!A-Za-z0-9-]*) echo "Versionsname nur aus Buchstaben, Ziffern, Bindestrich (z. B. v7, v11b): $VN" >&2; exit 2 ;;
esac

WURZEL=""   # Lauf-Ordner mit ereignisse.json und musik/ (falls vom Projekt getrennt)
if [ -d "$LAUF/compositions" ] || [ -f "$LAUF/index.html" ]; then PROJ="$LAUF"
  [ "$(basename "$LAUF")" = film ] && [ -f "$(dirname "$LAUF")/MANIFEST.md" ] && WURZEL="$(dirname "$LAUF")"
elif [ -d "$LAUF/film/compositions" ] || [ -f "$LAUF/film/index.html" ]; then PROJ="$LAUF/film"; WURZEL="$LAUF"
else echo "Kein Projekt gefunden (compositions/ oder index.html) in $LAUF oder $LAUF/film" >&2; exit 2; fi

ZIEL="$LAUF/versionen/$VN"
if [ -e "$ZIEL" ]; then
  echo "$ZIEL gibt es schon. Nichts überschrieben; nimm eine neue Versionsnummer." >&2
  ls "$LAUF/versionen" >&2
  exit 1
fi
mkdir -p "$ZIEL"

kopiere_ordner() {   # $1 Quelle, $2 Ziel-Elternordner
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --exclude 'archiv/' --exclude '_archiv*/' --exclude 'node_modules/' --exclude '__pycache__/' \
      --exclude '.DS_Store' "$1" "$2/"
  else
    cp -Rp "$1" "$2/"
  fi
}
kopiere_datei() {    # Klon auf APFS, sonst normale Kopie
  cp -c -p "$1" "$2" 2>/dev/null || cp -p "$1" "$2"
}
kopiere_baum() {     # $1 Quellordner, $2 Zielordner; Dateien einzeln als Klon (Audio belegt dann keinen Platz)
  local q rel
  while IFS= read -r q; do
    rel="${q#"$1"/}"
    mkdir -p "$2/$(dirname "$rel")"
    kopiere_datei "$q" "$2/$rel"
  done < <(find "$1" -type f ! -name '.DS_Store' ! -path '*/node_modules/*' ! -path '*/__pycache__/*' ! -path '*/archiv/*' ! -path '*/_archiv*/*')
}

INHALT=(); FEHLT=()
for d in compositions lib tools; do
  if [ -d "$PROJ/$d" ]; then kopiere_ordner "$PROJ/$d" "$ZIEL"; INHALT+=("$d/"); else FEHLT+=("$d/"); fi
done
if [ -f "$PROJ/index.html" ]; then kopiere_datei "$PROJ/index.html" "$ZIEL/index.html"; INHALT+=("index.html"); else FEHLT+=("index.html"); fi

PLAENE=0   # Zeitpläne und Ton-Pläne der Projektwurzel
for f in "$PROJ"/*.js "$PROJ"/*.json "$PROJ"/*.md; do
  [ -f "$f" ] || continue
  [ "$(basename "$f")" = package-lock.json ] && continue
  kopiere_datei "$f" "$ZIEL/$(basename "$f")"
  PLAENE=$((PLAENE + 1))
done
[ "$PLAENE" -gt 0 ] && INHALT+=("${PLAENE} Plan-/Konfig-Dateien (*.js, *.json, *.md)") || FEHLT+=("plan.js/*.json der Projektwurzel")

if [ -d "$PROJ/assets/sfx" ]; then
  kopiere_baum "$PROJ/assets/sfx" "$ZIEL/assets/sfx"
  INHALT+=("assets/sfx/ ($(find "$ZIEL/assets/sfx" -type f | wc -l | tr -d ' ') Dateien)")
else FEHLT+=("assets/sfx/"); fi

if [ -n "$WURZEL" ]; then
  EV=0
  for f in "$WURZEL"/ereignisse*.json; do
    [ -f "$f" ] || continue
    mkdir -p "$ZIEL/lauf"; kopiere_datei "$f" "$ZIEL/lauf/$(basename "$f")"; EV=$((EV + 1))
  done
  [ "$EV" -gt 0 ] && INHALT+=("lauf/ereignisse.json") || FEHLT+=("ereignisse.json im Lauf")
  if [ -d "$WURZEL/musik" ]; then kopiere_baum "$WURZEL/musik" "$ZIEL/lauf/musik"; INHALT+=("lauf/musik/"); fi
fi

DATEIEN="$(find "$ZIEL" -type f | wc -l | tr -d ' ')"
GROESSE="$(du -sh "$ZIEL" | awk '{print $1}')"
JETZT="$(date '+%d.%m.%Y %H:%M')"
GIT="$(git -C "$PROJ" rev-parse --short HEAD 2>/dev/null || true)"
REL="${ZIEL#"$LAUF"/}"
verbinde() { local t; t="$(printf '%s, ' "$@")"; echo "${t%, }"; }
INHALT_TXT="nichts"; [ ${#INHALT[@]} -gt 0 ] && INHALT_TXT="$(verbinde "${INHALT[@]}")"
FEHLT_TXT=""; [ ${#FEHLT[@]} -gt 0 ] && FEHLT_TXT="$(verbinde "${FEHLT[@]}")"

{
  echo "# Version $VN"
  echo ""
  echo "Gesichert: $JETZT · Quelle: \`${PROJ#"$LAUF"/}\`${GIT:+ · Git $GIT}"
  echo ""
  echo "- Inhalt: $INHALT_TXT ($DATEIEN Dateien, $GROESSE)"
  [ -n "$FEHLT_TXT" ] && echo "- Nicht vorhanden: $FEHLT_TXT"
  [ -n "$NOTIZ" ] && echo "- Notiz: $NOTIZ"
  echo ""
  echo "Zurückholen: einzelne Dateien aus diesem Ordner zurück ins Projekt kopieren (nie den Ordner über das Projekt legen);"
  echo "\`lauf/\` gehört in den Lauf-Ordner (ereignisse.json, musik/), alles andere ins Projekt."
} > "$ZIEL/VERSION.md"

ZEILE="- $VN · $JETZT · \`$REL/\` · $INHALT_TXT ($DATEIEN Dateien, $GROESSE)${NOTIZ:+ · $NOTIZ}"
python3 - "$LAUF/MANIFEST.md" "$ZEILE" <<'PY'
import os, sys
pfad, zeile = sys.argv[1], sys.argv[2]
text = open(pfad, encoding="utf-8").read() if os.path.exists(pfad) else "# Manifest\n"
zeilen = text.split("\n")
kopf = next((i for i, z in enumerate(zeilen) if z.strip().lower().startswith("## versionen")), None)
if kopf is None:
    text = text.rstrip("\n") + "\n\n## Versionen\n" + zeile + "\n"
else:
    ende = next((i for i in range(kopf + 1, len(zeilen)) if zeilen[i].startswith("## ")), len(zeilen))
    pos = ende
    while pos - 1 > kopf and zeilen[pos - 1].strip() == "":
        pos -= 1
    zeilen.insert(pos, zeile)
    text = "\n".join(zeilen)
open(pfad, "w", encoding="utf-8").write(text)
PY

echo "Gesichert: $ZIEL ($DATEIEN Dateien, $GROESSE)"
[ -n "$FEHLT_TXT" ] && echo "Nicht vorhanden (übersprungen): $FEHLT_TXT"
echo "MANIFEST: $ZEILE"
