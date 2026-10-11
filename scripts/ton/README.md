# scripts/ton: Musikschnitt, Tonspur, Prüfung, Lautheit

Werkzeuge für Phase 8 (Ton) aus `references/06-ton.md`. Alle Zeiten kommen aus JSON-Dateien des Laufs, keine Zeit steht im Code. Python 3 mit `numpy` und `scipy` (`requirements.txt`), `ffmpeg` für MP4 und die AAC-Messung. Medienjobs wie alle anderen unter der Sperre: `bash <skill-dir>/scripts/sperre.sh <lauf> -- python3 …`.

| Skript | Aufgabe | Ergebnis |
|---|---|---|
| `musik_schnitt.py` | Takt-Karte der Quelle per Onset, Segmentplan Quelle → Film nur an Takt-Einsen, Effekte (Hall-Fahne, Reverse-Swell, Tiefpass-Dip, Sub, Takt-Impact), Lookahead-Limiter, Prüfung R1/R2/R5/R7, A/B per `--variante` | `musik_schnitt_<V>.wav` + `.segmente.json` |
| `ton_bauen.py` | Effekt-Cues aus der Ereignisliste, Kit-Varianten rotieren, Tonhöhe ±2 HT, Panorama, Ducking, `compositions/audio.html`, `--sim` Offline-Mix, `--decke auto` | Samples, `audio.html`, `ton-bau.json` |
| `ton_pruefen.py` | Effekt ± Frames auf dem Ereignis (gegen die aktuelle `ereignisse.json`), keine gleichen Samples hintereinander, Löcher, Schleifen, Musik-Einsen | Befundliste, Exit 1 bei FEHLER |
| `kick.py` | Kick-Phase zum Film-Raster, eine Methode für `musik_schnitt.py` (R7) und `qualitaet.py --ton`; je 4 Takte „klar“/„unklar“, Urteil „auf dem Raster“, „halber Schlag daneben“, „zweideutig“, „unklar“; auch als Werkzeug: `python3 kick.py <wav> --bpm <BPM> --takt0 <s>` | Abschnitte + Urteil |
| `lufs.py` | BS.1770-Lautheit, True Peak (4× Oversampling), lauteste Fenster; liest WAV und MP4 | Messwerte, Exit 1 bei verfehltem Ziel |
| `../hoertest.mjs` | Gemini hört einen Ausschnitt (Bild schwarz), fünf feste Fragen, `--vergleich` A/B | `hoertest-….md` (Antwort wörtlich) |

## Ablauf

```bash
L=<lauf>; SK=<skill-dir>; cd $L/film
# 1. Takte der Quelle ansehen (BPM aus Musik-Prompt oder ton-referenz.mjs als takt.bpm eintragen).
#    Mitgebrachte Musik: ihre Takt-Karte ist das Raster des Films (bpm/takt0 in ereignisse.json), nicht die Referenz.
python3 $SK/scripts/ton/musik_schnitt.py --plan ton-plan.json --takt-karte
# 2. Segmentplan schreiben (Vorlage templates/ton-plan.vorlage.json), schneiden und prüfen, je Variante
bash $SK/scripts/sperre.sh $L -- python3 $SK/scripts/ton/musik_schnitt.py --plan ton-plan.json --variante A
bash $SK/scripts/sperre.sh $L -- python3 $SK/scripts/ton/musik_schnitt.py --plan ton-plan.json --variante B
#    Kick-Phase des Entwurfs gegen das Raster (Methode kick.py, dieselbe Zahl wie musik_schnitt.py R7: Urteil „auf dem
#    Raster“ weiter; „halber Schlag daneben“ takt.eins korrigieren; „unklar“/„zweideutig“: Hörtest an der Naht)
python3 $SK/scripts/qualitaet.py assets/sfx/musik_schnitt_A.wav --ton --bpm <BPM> --takt0 <s> --ohne-ereignisse --sperre $L
# 3. Tonspur bauen (Vorlage templates/cues.vorlage.json), Mix simulieren, Master-Decke für AAC wählen
bash $SK/scripts/sperre.sh $L -- python3 $SK/scripts/ton/ton_bauen.py --cues cues.json --variante B --sim ../renders/mix_B.wav --decke auto
# 4. Prüfen (Sim oder gerenderter Film)
python3 $SK/scripts/ton/ton_pruefen.py --bau ton-bau.json --mix ../renders/mix_B.wav --segmente assets/sfx/musik_schnitt_B.segmente.json
# 5. Hörtest Ende und jede Musik-Naht (Pflicht; bei zwei Varianten: --vergleich a b)
node $SK/scripts/hoertest.mjs ../renders/<film>.mp4 --von <s> --bis <s> --ereignisse ../ereignisse.json --typen schnitt,klick,hit,aussage --sperre $L
node $SK/scripts/hoertest.mjs ../renders/<film>.mp4 --von <naht − 3> --bis <naht + 3> --ziel naht --ereignisse ../ereignisse.json --sperre $L
# 6. Abnahme-Messung auf der ausgelieferten Web-Kopie (nach AAC)
python3 $SK/scripts/ton/lufs.py ../renders/<film>_web.mp4 --ziel -14 --tp-max -1
```

## Formate

**Ereignisliste** `<lauf>/ereignisse.json`, Schema 1 (Vorlage `templates/ereignisse.vorlage.json`, Feldtabelle in `references/05-bau-probe-parallel.md`, Abschnitt „Ereignisliste“): `{schema, fps, bpm, takt0, ereignisse: [{id, t, typ, …}]}`, `t` in Sekunden Filmzeit, aus dem Code der Komposition exportiert. Sie ist die einzige Zeitquelle für Ton-Cues und Prüfungen (R8). `ton_bauen.py` liest `id` und `t`; `ton_pruefen.py` zusätzlich `typ`, `stille` (mit `bis`, erlaubte Stille), `ausklang` (Beginn des Schlusses) und `bpm` aus dem Kopf. Eine nackte Liste `[…]` lesen beide auch.

**Segmentplan** `film/ton-plan.json` (Vorlage `templates/ton-plan.vorlage.json`, alle Felder in `_felder` erklärt): Quelle, Takt-Hinweis, Film-Raster, Segmente `{takt, schlag?, film | film_schlag | Anschluss, vorlauf_*, takte | schlaege | bis_film | bis_ende, frei+grund, wiederholung, gain_db, praesenz_db, breite_db, …}`, Effekte, Varianten.

**Cue-Liste** `film/cues.json` (Vorlage `templates/cues.vorlage.json`): Kit-Ordner nach Konvention `NN_typ_a.wav … NN_typ_d.wav` (z. B. `01_click_a.wav`, `03_swoosh_c.wav`; `typ` = Familie), Familien-Pegel, Betten (Musik, Raumton) und Cues `{id, ereignis, fam, variante?, semis?, pan?, peak?, …}`. Kit-Dateien mit mehreren Schlägen pro Datei: `--zerlegen-vorschlag <familie>` zeigt die erkannten Einzelschläge; anhören und als `slices` übernehmen oder `zerlegen` nutzen.

## Regeln und Urteile

`musik_schnitt.py` meldet je Regel OK, FREI (erklärte freie Länge), BEWUSST (Wiederholung mit Grund), HINWEIS oder FEHLER; Urteil GRÜN, GELB oder ROT (Exit 1).

| Regel | Prüfung |
|---|---|
| R1 ganze Takte | jede Naht auf der Takt-Eins beider Seiten (± 6 ms); Lücken nur in `stille`; freie Längen nur mit `frei` + `grund` |
| R2 keine Wiederholung in 30 s | Quell-Takte im Film nachgezählt (inkl. `takt_impact`); bewusst nur mit `wiederholung` |
| R5 keine gekachelten Ausklänge | in den letzten `ende_fenster` s höchstens ein Stück < 2 Takte; bevorzugt läuft das letzte Segment bis zum Ende des Takes (`bis_ende`) |
| R7 Raster | Plan-Phase der Quell-Einsen zum Film-Raster ± 0,05 Schlag ab `raster.ab`, dazu gemessene Kick-Phase am geschriebenen Schnitt (`kick.py`, dieselbe Methode und Zahl wie `qualitaet.py --ton`) |
| R9 (ton_pruefen) | Löcher < −40 dBFS (100 ms) außer erklärter Stille, Einblende und Ausklang; > 2 Takte am Stück mit r > 0,9 innerhalb 30 s (Schleife im Take selbst = HINWEIS, über eine Naht = FEHLER) |
| R11 (ton_pruefen) | Anker jedes Effekts ± 2 Frames am Ereignis; kein identisches Sample zweimal hintereinander |
| R12 (lufs) | −14 ± 1 LUFS, True Peak ≤ −1 dBTP auf der Web-Kopie nach AAC |

## Grenzen

- Die Takt-Erkennung braucht den BPM-Hinweis (`takt.bpm`); ohne ihn kann sie halbes, doppeltes oder ⅔-Tempo wählen und sagt das. Die Takt-Eins ist eine Schätzung (Klangwechsel und Bass-Betonung je Schlag-Phase) mit Konfidenz; unter 0,2 die Eins anhören und `takt.eins` setzen.
- `--sim` baut den HyperFrames-Mixer und den Master-Limiter nach. Verbindlich ist die Messung des gerenderten Films (`lufs.py <film>_web.mp4`, `ton_pruefen.py --mix <film>.mp4`).
- Der Hörtest ist ein Ersatz-Ohr. Das Urteil bleibt beim Nutzer; im Bericht die Befunde mit Zeitstempel und die offenen Unsicherheiten nennen.
- `ton_bauen.py` schreibt Samples nur in den Ordner `samples`; ältere Renders bleiben dort liegen. Den Ordner nur leeren, wenn er ausschließlich generierte Dateien enthält.
