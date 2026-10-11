#!/usr/bin/env bash
# cta-band.sh: setzt ein CTA-Band (Aufforderung, z. B. „Kommentiere MOTION“) unter einen fertigen Film.
# Teil des Skills motion-videos (MIT). Ändert den Film nicht, schreibt neue Dateien.
#
# Aufruf:
#   bash cta-band.sh <film.mp4> "<Text>" [--unterzeile "<zweite Zeile>"] [--bild <bild.png|jpg>]
#        [--farbe-von "#2b2b30"] [--farbe-bis "#0b0b0c"] [--textfarbe "#ffffff"] [--schrift "'Inter', sans-serif"]
#        [--hoehe <px>] [--band <fertiges.png>] [--out <ziel.mp4>] [--sperre <lauf>]
#
# Ablauf:
#   1. Vorlage templates/cta-band.vorlage.html mit Text, Farben, Bild befüllen (<ziel>_band.html)
#   2. per Headless-Chrome zu PNG rendern (<ziel>_band.png), Breite = Filmbreite,
#      Höhe Standard = 112 px je 1920 px Breite (gerade Zahl)
#   3. Film und Band mit ffmpeg übereinander stapeln (vstack, libx264 crf 21, AAC 192k, +faststart)
#   4. Web-Kopie <ziel>_web.mp4 unter 30 MB mit +faststart (Umverpacken, sonst Bitrate passend rechnen;
#      andere Grenze: WEB_MAX_MB=16 bash cta-band.sh …)
# Standard-<ziel>: <film>-cta.mp4 neben dem Film.
#
# Headless-Chrome, in dieser Reihenfolge: $CHROME, chrome-headless-shell aus dem Puppeteer-Cache
# (bringt HyperFrames beim ersten Render mit), Google Chrome / Chromium, sonst `npx playwright screenshot`.
# Findet sich nichts, bleibt das HTML liegen: selbst als PNG (Breite × Höhe) speichern und mit --band übergeben.
# --sperre <lauf> legt jeden Medienjob unter die Render-Sperre (scripts/sperre.sh). Läuft der ganze Aufruf
# schon unter sperre.sh, --sperre weglassen (sonst wartet er auf sich selbst).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL="$(cd "$DIR/.." && pwd)"
VORLAGE="$SKILL/templates/cta-band.vorlage.html"

hilfe() { awk 'NR>1 && /^#/ {sub(/^# ?/, ""); print; next} NR>1 {exit}' "$0"; exit "${1:-0}"; }
[ $# -ge 1 ] && { [ "$1" = "-h" ] || [ "$1" = "--help" ]; } && hilfe 0
[ $# -lt 2 ] && hilfe 2

FILM="$1"; TEXT="$2"; shift 2
UNTER=""; BILD=""; VON="#2b2b30"; BIS="#0b0b0c"; TEXTFARBE="#ffffff"
SCHRIFT="'Inter', 'Helvetica Neue', Arial, sans-serif"; HOEHE=""; BAND=""; OUT=""; SPERRE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --unterzeile) UNTER="$2"; shift 2 ;;
    --bild) BILD="$2"; shift 2 ;;
    --farbe-von) VON="$2"; shift 2 ;;
    --farbe-bis) BIS="$2"; shift 2 ;;
    --textfarbe) TEXTFARBE="$2"; shift 2 ;;
    --schrift) SCHRIFT="$2"; shift 2 ;;
    --hoehe) HOEHE="$2"; shift 2 ;;
    --band) BAND="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --sperre) SPERRE="$2"; shift 2 ;;
    *) echo "Unbekannter Schalter: $1" >&2; hilfe 2 ;;
  esac
done

for t in ffmpeg ffprobe python3; do
  command -v "$t" >/dev/null 2>&1 || { echo "$t fehlt (macOS: brew install ${t/ffprobe/ffmpeg})." >&2; exit 2; }
done
[ -f "$FILM" ] || { echo "Film nicht gefunden: $FILM" >&2; exit 2; }
[ -f "$VORLAGE" ] || { echo "Vorlage fehlt: $VORLAGE" >&2; exit 2; }
[ -z "$BILD" ] || [ -f "$BILD" ] || { echo "Bild nicht gefunden: $BILD" >&2; exit 2; }
[ -z "$BAND" ] || [ -f "$BAND" ] || { echo "Band-PNG nicht gefunden: $BAND" >&2; exit 2; }

medienjob() {   # Medienjob mit nice, auf Wunsch unter der Render-Sperre
  if [ -n "$SPERRE" ]; then bash "$DIR/sperre.sh" "$SPERRE" -- "$@"; else nice -n 10 "$@"; fi
}

abs() { python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$1"; }
FILM="$(abs "$FILM")"
[ -n "$OUT" ] || OUT="${FILM%.*}-cta.mp4"
OUT="$(abs "$OUT")"
mkdir -p "$(dirname "$OUT")"
STAMM="${OUT%.*}"
WEB="${STAMM}_web.mp4"

# ---- Film vermessen
read -r W H FPS < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate \
  -of csv=p=0:s=x "$FILM" | head -1 | tr 'x' ' ')
FPS="$(python3 -c "n,d='$FPS'.split('/'); v=float(n)/float(d or 1); print(int(v) if abs(v-round(v))<1e-6 else round(v,3))")"
TON="$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$FILM" | head -1)"
DAUER="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FILM")"
[ -n "$HOEHE" ] || HOEHE="$(python3 -c "print(max(2, round($W*112/1920/2)*2))")"
HOEHE="$(python3 -c "print(max(2, int(round(float('$HOEHE')/2))*2))")"
echo "Film: ${W}×${H} · ${FPS} fps · ${DAUER} s · Band ${W}×${HOEHE}"

# ---- 1. HTML befüllen
HTML="${STAMM}_band.html"
PNG="${STAMM}_band.png"
python3 - "$VORLAGE" "$HTML" "$W" "$HOEHE" "$TEXT" "$UNTER" "$BILD" "$VON" "$BIS" "$TEXTFARBE" "$SCHRIFT" <<'PY'
import base64, html, mimetypes, sys
vorlage, ziel, w, h, text, unter, bild, von, bis, tf, schrift = sys.argv[1:12]
src, anzeige = "data:,", "none"
if bild:
    typ = mimetypes.guess_type(bild)[0] or "image/png"
    src = f"data:{typ};base64," + base64.b64encode(open(bild, "rb").read()).decode()
    anzeige = "block"
werte = {"BREITE": w, "HOEHE": h, "TEXT": html.escape(text), "UNTERZEILE": html.escape(unter), "BILD": src,
         "BILD_ANZEIGE": anzeige, "FARBE_VON": von, "FARBE_BIS": bis, "TEXTFARBE": tf, "SCHRIFT": schrift}
s = open(vorlage, encoding="utf-8").read()
for k, v in werte.items():
    s = s.replace("{{" + k + "}}", v)
open(ziel, "w", encoding="utf-8").write(s)
PY

# ---- 2. PNG rendern
finde_chrome() {
  if [ -n "${CHROME:-}" ] && [ -x "$CHROME" ]; then echo "$CHROME"; return; fi
  local c
  for c in $(ls -d "$HOME"/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell 2>/dev/null | sort -r) \
           "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
    [ -x "$c" ] && { echo "$c"; return; }
  done
  for c in chrome-headless-shell google-chrome google-chrome-stable chromium chromium-browser; do
    command -v "$c" >/dev/null 2>&1 && { command -v "$c"; return; }
  done
}

if [ -n "$BAND" ]; then
  cp "$BAND" "$PNG"
  echo "Band: übernommen aus $BAND"
else
  CHR="$(finde_chrome || true)"
  NEU="${STAMM}_band.$$.png"   # erst unter neuem Namen rendern, damit ein altes Band nie als Erfolg zählt
  if [ -n "$CHR" ]; then
    KOPF="--headless=new"; case "$CHR" in *chrome-headless-shell*) KOPF="--headless" ;; esac
    medienjob "$CHR" "$KOPF" --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
      --window-size="${W},${HOEHE}" --default-background-color=00000000 --virtual-time-budget=2000 \
      --screenshot="$NEU" "file://$HTML" >/dev/null 2>&1 || true
    [ -f "$NEU" ] && echo "Band: gerendert mit $(basename "$CHR")"
  fi
  if [ ! -f "$NEU" ] && command -v npx >/dev/null 2>&1; then
    echo "Kein Headless-Chrome gefunden, versuche npx playwright …"
    medienjob npx -y playwright@1.47.2 screenshot --viewport-size="${W},${HOEHE}" "file://$HTML" "$NEU" >/dev/null 2>&1 || true
    [ -f "$NEU" ] && echo "Band: gerendert mit Playwright"
  fi
  [ -f "$NEU" ] && mv "$NEU" "$PNG"
  if [ ! -f "$NEU" ] && [ ! -f "$PNG" -o "$PNG" -ot "$HTML" ]; then
    cat >&2 <<EOF
Kein Weg gefunden, das Band zu rendern. Möglichkeiten:
  - HyperFrames einmal rendern lassen (lädt chrome-headless-shell nach ~/.cache/puppeteer), dann erneut starten
  - CHROME=/pfad/zu/chrome bash cta-band.sh …
  - npx playwright install chromium
  - oder $HTML im Browser öffnen, als PNG ${W}×${HOEHE} speichern und mit --band <png> übergeben
EOF
    exit 3
  fi
fi

# Maß prüfen und notfalls angleichen (manche Chrome-Versionen ziehen die Fensterleiste ab)
read -r PW PH < <(ffprobe -v error -show_entries stream=width,height -of csv=p=0:s=x "$PNG" | head -1 | tr 'x' ' ')
if [ "$PW" != "$W" ] || [ "$PH" != "$HOEHE" ]; then
  echo "Band-PNG ist ${PW}×${PH}, gleiche auf ${W}×${HOEHE} an"
  TMP="${STAMM}_band_roh.png"; mv "$PNG" "$TMP"
  medienjob ffmpeg -v error -y -i "$TMP" -vf "scale=${W}:${HOEHE}:force_original_aspect_ratio=increase,crop=${W}:${HOEHE}" "$PNG"
fi

# ---- 3. Stapeln
TONMAP=(); [ -n "$TON" ] && TONMAP=(-map 0:a -c:a aac -b:a 192k)
medienjob ffmpeg -v error -y -i "$FILM" -framerate "$FPS" -loop 1 -i "$PNG" \
  -filter_complex "[1:v]fps=${FPS},format=yuv420p,setsar=1[b];[0:v]fps=${FPS},format=yuv420p,setsar=1[v];[v][b]vstack=inputs=2:shortest=1,fps=${FPS}[out]" \
  -map "[out]" ${TONMAP[@]+"${TONMAP[@]}"} -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -shortest "$OUT"

# ---- 4. Web-Kopie < 30 MB
GRENZE=$(( ${WEB_MAX_MB:-30} * 1000000 ))   # WEB_MAX_MB=… für Kanäle mit anderer Grenze
groesse() { python3 -c 'import os,sys; print(os.path.getsize(sys.argv[1]))' "$1"; }
if [ "$(groesse "$OUT")" -lt $(( GRENZE * 98 / 100 )) ]; then
  medienjob ffmpeg -v error -y -i "$OUT" -map 0 -c copy -movflags +faststart "$WEB"
else
  ZIEL=$(( GRENZE * 93 / 100 ))
  for versuch in 1 2 3; do
    VBR="$(python3 -c "print(max(300000, int($ZIEL*8/float('$DAUER') - 160000 - 50000)))")"
    TONWEB=(); [ -n "$TON" ] && TONWEB=(-c:a aac -b:a 160k)
    medienjob ffmpeg -v error -y -i "$OUT" -map 0 -c:v libx264 -preset slow -b:v "$VBR" -maxrate "$((VBR * 3 / 2))" \
      -bufsize "$((VBR * 2))" -pix_fmt yuv420p ${TONWEB[@]+"${TONWEB[@]}"} -movflags +faststart "$WEB"
    [ "$(groesse "$WEB")" -lt "$GRENZE" ] && break
    ZIEL=$((ZIEL * 85 / 100))
  done
fi

python3 - "$OUT" "$WEB" "$PNG" <<'PY'
import os, subprocess, sys
for p in sys.argv[1:]:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                        "-of", "csv=p=0:s=x", p], capture_output=True, text=True).stdout.strip()
    mb = f"{os.path.getsize(p) / 1e6:.1f}".replace(".", ",")
    print(f"{p}  {r}  {mb} MB")
PY
[ "$(groesse "$WEB")" -lt "$GRENZE" ] || { echo "Warnung: Web-Kopie ist noch ≥ ${WEB_MAX_MB:-30} MB" >&2; exit 1; }
echo "Fertig. Prüfen: Band lesbar, genau eine Aufforderung, Lautheit auf der Web-Kopie (qualitaet.py --auslieferung)."
