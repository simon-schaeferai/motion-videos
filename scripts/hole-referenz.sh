#!/usr/bin/env bash
# Holt ein Referenz-Video in den Lauf-Ordner und bereitet die Analyse vor.
# Teil des Skills motion-videos (MIT). Braucht ffmpeg/ffprobe, für URLs zusätzlich yt-dlp.
#
# Aufruf: bash hole-referenz.sh <video-url|datei> <lauf-ordner>
#   z. B.  bash hole-referenz.sh "https://www.youtube.com/watch?v=…" motion-runs/2026-10-02_produktfilm
#
# Ergebnis in <lauf-ordner>/analyse/:
#   referenz.mp4        (+faststart)
#   frames/f_0001.jpg … (3 fps: je Drittelsekunde das erste echte Frame der Referenz)
#   frames/zeiten.csv   (datei,zeit_s,frame: exakte Zeit und Frame-Index der Referenz je Bild; nur diese Zeiten nutzen)
#   audio.wav           (mono, 16 kHz; nur wenn die Referenz Ton hat)
# und eine Ausgabe mit Auflösung, fps, Dauer, Ton ja/nein.
#
# Downloads laufen ERZWUNGEN ANONYM: keine Cookie-Datei, keine Browser-Cookies, kein Login.
# Login-pflichtige oder private Videos werden gemeldet (Exit 3) und nicht umgangen:
# dann das Video selbst herunterladen und die Datei übergeben.
# Medienjobs laufen unter der Render-Sperre /tmp/<lauf-name>-render.lock und mit nice.
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Aufruf: bash hole-referenz.sh <video-url|datei> <lauf-ordner>" >&2; exit 2
fi
QUELLE=$1; LAUF=${2%/}
A="$LAUF/analyse"
NAME=$(basename "$LAUF")

for t in ffmpeg ffprobe; do
  command -v "$t" >/dev/null || { echo "$t fehlt → macOS: brew install ffmpeg" >&2; exit 2; }
done

if [ -e "$A/referenz.mp4" ] || [ -n "$(ls -A "$A/frames" 2>/dev/null || true)" ]; then
  echo "In $A liegt schon eine Referenz (referenz.mp4 oder frames/)." >&2
  echo "Nichts überschrieben. Neuen Lauf-Ordner wählen oder die alten Dateien selbst wegräumen." >&2
  exit 2
fi
mkdir -p "$A/frames"

# Render-Sperre holen (max. 10 min warten)
LOCK="/tmp/${NAME}-render.lock"
for i in $(seq 1 120); do
  if mkdir "$LOCK" 2>/dev/null; then break; fi
  if [ "$i" -eq 120 ]; then echo "Sperre nach 10 min noch belegt: $LOCK" >&2; exit 1; fi
  [ "$i" -eq 1 ] && echo "Sperre belegt ($LOCK), warte …" >&2
  sleep 5
done
TMP=$(mktemp -d)
trap 'rmdir "$LOCK" 2>/dev/null; rm -rf "$TMP"' EXIT

ff() { nice -n 10 ffmpeg -hide_banner -loglevel error -y "$@"; }

if [ -f "$QUELLE" ]; then
  ROH="$QUELLE"
  echo "Quelle: lokale Datei $QUELLE"
elif printf '%s' "$QUELLE" | grep -qE '^https?://'; then
  command -v yt-dlp >/dev/null || { echo "yt-dlp fehlt → macOS: brew install yt-dlp" >&2; exit 2; }
  echo "Quelle: $QUELLE (anonym, ohne Cookies)"
  set +e
  nice -n 10 yt-dlp --no-cookies --no-cookies-from-browser --no-playlist \
    -f "bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b" --merge-output-format mp4 \
    -o "$TMP/download.%(ext)s" "$QUELLE" >"$TMP/yt.log" 2>&1
  RC=$?
  set -e
  if [ $RC -ne 0 ]; then
    if grep -qiE 'login|log in|sign in|cookies|private|age.?restricted|confirm your age|members.only|not available|rate.?limit' "$TMP/yt.log"; then
      echo "" >&2
      echo "Das Video ist login-pflichtig, privat oder gesperrt. Kein Umweg über Cookies oder Login." >&2
      echo "Bitte das Video selbst herunterladen und dann die Datei angeben:" >&2
      echo "  bash hole-referenz.sh /pfad/zum/video.mp4 $LAUF" >&2
      tail -3 "$TMP/yt.log" >&2
      exit 3
    fi
    echo "Download fehlgeschlagen (yt-dlp Exit $RC):" >&2; tail -5 "$TMP/yt.log" >&2; exit 1
  fi
  ROH=$(ls "$TMP"/download.* | head -1)
else
  echo "Weder Datei noch http(s)-URL: $QUELLE" >&2; exit 2
fi

# In MP4 mit +faststart bringen: erst verlustfrei umpacken, sonst neu kodieren
if ! ff -i "$ROH" -map 0:v:0 -map '0:a:0?' -c copy -movflags +faststart "$A/referenz.mp4" 2>/dev/null; then
  echo "Umpacken nicht möglich, kodiere neu (H.264 CRF 18) …"
  ff -i "$ROH" -map 0:v:0 -map '0:a:0?' -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$A/referenz.mp4"
fi

# Frames mit exakter Zeit: je Drittelsekunde das erste Original-Frame (kein fps-Filter, der würde Zeiten verschieben;
# bei 24 fps lagen die Bilder sonst 0,125 s neben (N-1)/3). showinfo liefert die echte Zeit jedes Bildes.
START=$(ffprobe -v error -select_streams v:0 -show_entries stream=start_time -of csv=p=0 "$A/referenz.mp4" | head -1)
case "$START" in ''|N/A) START=0 ;; esac
nice -n 10 ffmpeg -hide_banner -nostats -loglevel info -y -i "$A/referenz.mp4" \
  -vf "select='isnan(prev_selected_t)+gte(floor((t-$START)*3+0.001)\,floor((prev_selected_t-$START)*3+0.001)+1)',showinfo" \
  -vsync 0 -q:v 3 "$A/frames/f_%04d.jpg" 2>"$TMP/showinfo.log" \
  || { echo "Frames ziehen fehlgeschlagen:" >&2; grep -iv showinfo "$TMP/showinfo.log" | tail -5 >&2; exit 1; }

TON=nein
if [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$A/referenz.mp4")" ]; then
  ff -i "$A/referenz.mp4" -vn -ac 1 -ar 16000 "$A/audio.wav"
  TON=ja
fi

W_H=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$A/referenz.mp4")
FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$A/referenz.mp4")
FPS_DEZ=$(awk -F/ '{ if ($2>0) printf "%.3f", $1/$2; else print $1 }' <<<"$FPS")
DAUER=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$A/referenz.mp4")
awk -v s="$START" -v fps="$FPS_DEZ" 'BEGIN { print "datei,zeit_s,frame" }
  /Parsed_showinfo/ && /pts_time:/ {
    for (i = 1; i <= NF; i++) if ($i ~ /^pts_time:/) { split($i, a, ":"); t = a[2] - s }
    n++; printf "f_%04d.jpg,%.4f,%d\n", n, t, int(t * fps + 0.5)
  }' "$TMP/showinfo.log" > "$A/frames/zeiten.csv"
N=$(ls "$A/frames" | grep -c '^f_.*\.jpg$' | tr -d ' ')
Z=$(( $(wc -l < "$A/frames/zeiten.csv") - 1 ))
[ "$Z" -eq "$N" ] || echo "Warnung: zeiten.csv hat $Z Zeilen, aber $N Bilder. Zeiten von Hand prüfen." >&2

echo ""
echo "Referenz bereit: $A/referenz.mp4"
echo "  Auflösung  $W_H"
echo "  fps        $FPS_DEZ ($FPS)"
echo "  Dauer      $(printf '%.2f' "$DAUER") s"
echo "  Ton        $TON$([ "$TON" = ja ] && echo " → $A/audio.wav")"
echo "  Frames     $N in $A/frames/ (3 fps; exakte Zeit je Bild in $A/frames/zeiten.csv)"
