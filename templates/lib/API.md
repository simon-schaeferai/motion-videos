# Bibliothek `templates/lib` · API

Eine Bewegungs-, Kamera- und Typo-Bibliothek für alle Blöcke eines Films. Alle Funktionen hängen an **einem Objekt `MV`**; es gibt keine weiteren globalen Namen. Pflichtwerte stammen aus der Qualitäts-DNA (`references/09-qualitaets-dna.md`) und gelten für jeden Block. Blöcke definieren keine eigenen Easings oder Kurven: Fehlt etwas, kommt es hierher, nicht in den Block.

Lauffähiges Beispiel für alles: `demo/` (fiktive Notiz-App „Nordlicht Notes“, 10 s, 1920 × 1080).

## Einbindung

`templates/lib/*.js` und `tokens.css` nach `film/lib/` kopieren, dann einmal in `film/index.html` (Reihenfolge fest):

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<link rel="stylesheet" href="lib/tokens.css">
<script src="lib/core.js"></script>
<script src="lib/camera.js"></script>
<script src="lib/motion.js"></script>
<script src="plan.js"></script>   <!-- Zeitplan des Films: MV.configure + alle Zeiten + Ereignisse -->
<!-- … eigene <style>-Blöcke … -->
<link rel="stylesheet" href="lib/marke.css">   <!-- zuletzt, direkt vor </head>: Marke des Nutzers -->
```

`lib/marke.css` erzeugt `node <skill-dir>/scripts/marke-tokens.mjs <lauf>/produkt/marke.json --out film/lib/marke.css` (nur Farben, Verläufe, Schrift; Qualitätswerte bleiben fest).

Sub-Compositions (`compositions/blockN.html`) sehen `MV` und `PLAN` automatisch, weil sie im selben Dokument laufen. `camera.js` und `motion.js` brechen mit einer klaren Meldung ab, wenn `core.js` fehlt.

**Aufbau eines Blocks** (bewährtes Muster, siehe `demo/index.html`):

```js
function render(t) { /* Zustand nur aus t berechnen, Sichtbarkeit der Einstellungen nur hier */ }
document.fonts.ready.then(() => {
  build();                                   // Markup per MV.sayHTML, MV.chainHTML …
  render(MV.globalTime(0, START));
  const tl = gsap.timeline({ paused: true }), proxy = { t: 0 };
  tl.to(proxy, { t: DUR, duration: DUR, ease: "none", onUpdate: () => render(MV.globalTime(proxy.t, START)) }, 0);
  window.__timelines["blockN"] = tl;         // erst nach dem Aufbau registrieren
});
```

## Konfiguration und Tokens

### `MV.configure(opts)` · core.js
Setzt Bildrate, Taktraster, Bau-Raster und Typo-Stufen und schreibt `--mv-ref-w`, `--mv-ref-h`, `--mv-scale` auf `:root`. Einmal am Anfang von `plan.js`.
```js
MV.configure({ fps: 30, bpm: 145, anchor: 0, ref: { w: 1276, h: 718 }, out: { w: 1920, h: 1080 } });
```
Pflicht: `bpm` aus der Ton-Analyse der Referenz (bzw. der Takt-Karte mitgebrachter Musik), `ref` = Pixel der Referenz (alle Maße der Spec gelten dann direkt). Standard: 30 fps, 120 BPM, Raster 1920 × 1080. `briefLaenge` (Zahl in s oder Spanne `[15, 20]` aus G1) landet im Kopf von `ereignisse.json` und gilt für R12 „Länge gegen Brief“.

`MV.config.type` (Ausgabe-px): **H** 120 px / 600 / −0,035 em / Zeilenabstand 1,02 · **Z** 84 px / 600 / −0,03 em / Grundlinie y 150 · **S** 32 px / 400 / −0,005 em / 56 px unter Z · **L** 32 px / 500 / −0,01 em · `read` 32 px (Lesetext-Minimum für jede Zeile, die gelesen werden soll: Terminal, Code, UI, Stütz- und CTA-Zeile; `MV.sayHTML` warnt darunter, außer mit `deko: true`) · `gradientMin` 64 px · `graphicTop` 120 px unter der Z-Grundlinie · `graphicCenter` y 442 · `margin` 160 px · `baselineRatio` 0,939 (Inter, Zeilenhöhe 1,15; bei anderer Schrift messen).

### `tokens.css`
CSS-Variablen `--mv-*` (Farben, Verläufe, Radien, Schatten, Schrift) mit neutralen Platzhaltern, Klassen `.mv-scene`, `.mv-stage` (skaliert Raster auf Ausgabe), `.mv-layer` (Kamera-Ebene), Typo-Stufen `.mv-type-H|Z|S|L|L2|UI` (L2 24 px nur für Deko), `--mv-read-min` 32 px, Material `.mv-ink`, `.mv-acc`, `.mv-silver` (senkrechter Verlauf per `background-clip: text`), `.mv-card`.
```css
:root { --mv-bg: #f3f5f6; --mv-ink: #0f1419; --mv-accent: #0f9a78;
        --mv-acc-grad: linear-gradient(180deg, #0a7a5f 26%, #0f9a78 67%, #52d1aa 109%); --mv-font: "Inter", sans-serif; }
```
Pflicht: Farben aus der Marke ableiten (Pipette auf echte Flächen), nie raten. Verlauf nur für Aussagen ab 64 Ausgabe-px, nie für Produkt-UI, nie `text-shadow` oder Glow. Akzent höchstens 2 Wörter. Schrift lokal per `@font-face` (sonst `font_family_without_font_face`). **Lesetext ≥ 32 Ausgabe-px** (`--mv-read-min`): auch Terminal-, Code- und UI-Zeilen, die die Aussage belegen; kleiner nur Deko mit `deko`-Ereignis. Prüfung: `qualitaet.py --text` (Bogen in 1/3 Größe = Handy-Feed).

## Mathe und Zeit · core.js

| Funktion | Zweck | Beispiel |
|---|---|---|
| `MV.clamp(x, a=0, b=1)` | begrenzen | `MV.clamp(u)` |
| `MV.lerp(a, b, u)` | linear mischen | `MV.lerp(0, 120, u)` |
| `MV.seg(t, t0, t1, ease)` | Ease über ein Zeitfenster | `MV.seg(t, 2.0, 2.4, MV.E.out)` |
| `MV.table(pts, t)` | gemessene Kurve `[[t, wert], …]` abspielen (Pflichtweg für Kurven aus der Referenz) | `MV.table([[0, 0], [0.1, 0.77], [0.27, 1]], t - t0)` |
| `MV.mix(a, b, u)` | Hex-Farben mischen; für CSS-Variablen `color-mix()` in CSS nutzen | `MV.mix("#cfcfd2", "#1a1a1c", u)` |
| `MV.vel(f, t)` | Ableitung pro Sekunde (für Unschärfe aus Geschwindigkeit) | `MV.vel((x) => posX(x), t)` |
| `MV.frame(t)` / `MV.frameIndex(t)` / `MV.isFrame(t)` | auf ganze Frames runden, Frame-Index, Prüfung | `MV.frameIndex(5.5) // 165` |
| `MV.globalTime(lokal, start)` | Sub-Composition-Zeit in Filmzeit, **ohne Rundung**; warnt, wenn `start` nicht auf einem ganzen Frame liegt | `render(MV.globalTime(proxy.t, START))` |
| `MV.warn(text)` | Warnung einmal je Text (render-sicher) | |

Pflicht: Slot-Starts auf ganzen Frames, keine Frame-Rundung vor einer Zeitumrechnung (sonst Duplikat- und Blitzframes), die Sichtbarkeit einer Szene steuert genau eine Stelle (`render()`).

## Easing-Tokens · core.js

| Token | Einsatz | Pflichtwert |
|---|---|---|
| `MV.E.out` | Standard-Einstieg `cubic-bezier(.16, 1, .3, 1)`: Reveal, Settle, Pop | Wort-Reveal 0,5 s |
| `MV.E.inOut` | expo-in-out: Morph, Snap, Match-Cut | durchgehend, ohne Zwischenhalt |
| `MV.E.sine` | Pulse, Lichtläufe; Morph, der genau am Schnitt ankommen soll | |
| `MV.E.powIn(k)` | Ausstieg in einen Schnitt | k 2,3 bis 3 |
| `MV.E.expoOut`, `MV.E.lin` | Ausklänge, Drift | Drift immer linear |
| `MV.bezier(x1, y1, x2, y2)` | eigene Kurve aus einer Messung (nur in der Bibliothek anlegen) | |

```js
el.style.opacity = MV.seg(t, t0, t0 + 0.2, MV.E.out);
```
Kein `backOut` und kein Easing mit Startgeschwindigkeit aus der Ruhe ohne 2 Frames Anlauf (Überschwinger wirken billig, Anfahren aus dem Stand ruckt).

## Taktraster · core.js

| Funktion | Zweck |
|---|---|
| `MV.beatLen()` / `MV.sixteenthLen()` | Länge einer Zählzeit / Sechzehntel in s |
| `MV.beat(n, anker)` / `MV.sixteenth(n, anker)` | Zeit der n-ten Zählzeit / Sechzehntel, **auf ganze Frames gerundet** |
| `MV.onBeat(t)` / `MV.onSixteenth(t)` | nächstgelegene Rasterzeit |
| `MV.nextSixteenth(t)` | nächste Sechzehntel ab t (nie früher) |
| `MV.gridPos(t)` | `{ beat, sixteenth, off }`, Abweichung in Frames |

```js
P.CUT_AB = MV.beat(5);                 // 2,5 s bei 120 BPM
P.klick  = MV.sixteenth(23);           // 2,867 s
```
Pflicht: Klicks, Pops, Hauptereignisse auf 1/16 ± 1,5 Frames, harte Schnitte auf der Zählzeit ± 1 Frame. Zeiten je Ereignis aus `beat`/`sixteenth`, nie aus Summen von Bruchteil-Frames. Der Musik-Prompt nutzt dasselbe BPM.

## Ereignisliste · core.js

### `MV.events.add({ id, typ, t, … })` · `.setBeat(name)` · `.list()` · `.get(id)` · `.clear()` · `.toJSON()`
Einzige Quelle für Ton-Cues, Ein-Blick-Bogen und Prüfskripte. Format = **Schema 1** (`references/05-bau-probe-parallel.md`, Abschnitt „Ereignisliste“; Vorlage `templates/ereignisse.vorlage.json`). Ereignisse werden **im Zeitplan** (`plan.js`) eingetragen, nie in `render()`. `t` wird genau einmal auf ganze Frames gerundet, dazu kommen `frame` und `zaehlzeit` (Lage im Taktraster als Dezimalzahl). `beat` ist der Beat-Name aus dem Blueprint (z. B. „B2 Ergebnis“, Bildtitel im Ein-Blick-Bogen); `MV.events.setBeat(name)` setzt ihn für alle folgenden Einträge. Gleiche `id` ersetzt den alten Eintrag; ein Typ außerhalb von `MV.EVENT_TYPES` gibt eine Warnung, `stille` ohne `bis` einen Fehler.
```js
MV.events.setBeat("B1 Aussage");
MV.events.add({ id: "schnitt-ab", typ: "schnitt", art: "whip", t: P.CUT_AB });
MV.events.add({ id: "ruhe-1", typ: "stille", t: P.HIT, bis: P.HIT + MV.beatLen() }); // gewollte Ruhe in Bild und Ton
```
Typen (`MV.EVENT_TYPES`): `aussage`, `hit`, `schnitt` (mit `art`: `hart`, `whip`, `match`, `bewegung`), `punch`, `klick`, `tippen`, `pop`, `linie`, `knoten`, `puls`, `morph`, `ki`, `endkarte`, `ausklang`, `stille` (mit `bis`), `ende`, `deko` (mit `bis`, `bereich` [x0, y0, x1, y1] in Ausgabe-px und `grund`: Schrift unter 32 px, die nicht gelesen werden soll, z. B. Fenstertitel, Mockup-Inhalt; `qualitaet.py --text` nimmt sie aus), `bildwelt` (mit `art`: `fenster`, `handy`, `geraet`, `produktfoto`, `foto`, `website`, `daten`, `aussage`, `logo` oder `kachel`, am Anfang jeder Szene; `qualitaet.py --fuellung` prüft, dass höchstens ein Drittel der Szenen `kachel` ist). Aussagen tragen zusätzlich `text`, `woerter`, `lesbarAb`, `ausstiegAb`, `lesezeitSoll`, `lesezeitIst`. `MV.events.toJSON()` liefert den Inhalt von `ereignisse.json`: `{ schema, fps, bpm, takt0, ereignisse }`.

**Export ohne Browser:** `node tools/ereignisse.mjs [projekt] [--plan plan.js] [--out ereignisse.json]` (Vorlage `demo/tools/ereignisse.mjs`, nach `film/tools/` kopieren; im Lauf `--out ../ereignisse.json`). Lädt `lib/` und `plan.js` in Node, schreibt `MV.events.toJSON()` (Liste nach Zeit sortiert), druckt eine Tabelle und endet mit Exit-Code 1, wenn eine Aussage die Lesezeit verfehlt oder ein Eintrag das Schema verletzt.

**Ein-Blick-Bogen:** `bash <skill-dir>/scripts/sperre.sh <lauf> -- node tools/ereignisse.mjs . --bogen renders/film.mp4 renders/ein-blick.png` legt je Aussage das erste Bild „voll lesbar“ (`lesbarAb`) in einen Bogen. Pflicht beim Ansehen: je Bild höchstens 1 Aussage + 1 Stützzeile, keine Chips oder Tags, die UI beweist die Aussage.

## DOM-Helfer · core.js

| Funktion | Zweck | Beispiel |
|---|---|---|
| `MV.cssVar(name, fallback)` | CSS-Variable lesen | `MV.cssVar("--mv-accent")` |
| `MV.sprite()` | geteiltes SVG für Filter (idempotent) | |
| `MV.cursorSVG(id, { size, fill, stroke })` | Mauszeiger als Inline-SVG | `MV.cursorSVG("b1-cursor", { size: 28 })` |
| `MV.typewriter(el, text, table, { head, ink, settle })` | Schreibmaschine mit farbigem Schreibkopf; `table` = gemessener Anteil über die Zeit; `paint(t)` in `render()` | `const tw = MV.typewriter(line, "Text", [[3.0, 0], [3.8, 1]]); tw.paint(t);` |

## Kamera · camera.js (`MV.cam`)

### `MV.cam.hull(t, { t0, t1, from, rise, tau, drift, exit, exitDur, pow })` → `{ v, vel }`
Die Einstellungs-Hülle für jeden Wert (Skalierung, Versatz): Settle `rise · (1 − e^(−(t−t0)/tau))`, linearer Drift, Potenz-Ausstieg in den Schnitt bei `t1`. `vel` ist die Geschwindigkeit für die Unschärfe.
```js
const y = MV.cam.hull(t, { t0: 4.1, t1: 5.0, from: 0, drift: -22, exit: -60, exitDur: 0.4, pow: 2.5 });
```
Pflicht: Settle τ 0,08 bis 0,13 s; Drift linear, nie auf null abbremsen; Ausstieg Exponent 2,3 bis 3 über 0,3 bis 0,47 s, Schnitt im Maximum.

### `MV.cam.zoom(t, { t0, t1, base=1, settle=0, tau=0.1, rate=0.03, exit, exitDur, pow })` → `{ v, vel }`
Zoom einer Einstellung; `rate` = Drift als Anteil pro Sekunde.
```js
const z = MV.cam.zoom(t, { t0: P.CUT_BC, t1: P.DUR, rate: 0.025 }).v;
MV.cam.apply(layer, z, 640, 295);
```
Pflicht: jede Einstellung ≥ 2 %/s Zoom oder ≥ 3 % Bildhöhe/s Verschiebung; Aussage über Grafik 2 bis 4 %/s, Aussage ohne Grafik (H) 3 bis 10 %/s, UI-Sequenzen 6 bis 13 %/s. Keine Einstellung endet im Stand (längster Stand ≤ 0,4 s).

### `MV.cam.apply(el, sc, ox, oy, dx, dy)` · `MV.cam.set(el, sc, tx, ty)` · `MV.cam.punchTo(el, sc, wx, wy, sx, sy)` · `MV.cam.toScreen(wx, wy, sc, ox, oy, dx, dy)`
Skalierung um einen Ursprung plus Versatz; direkter Punch (Weltpunkt landet auf Bildpunkt); Umrechnung Welt → Bild (z. B. für Match-Cuts aus einer gezoomten Ebene).
```js
MV.cam.punchTo(world, 1.6, 420, 300, 640, 360);   // harter Punch-in auf die Stufe 1,6
```

### `MV.cam.settle(t, t0, a, tauA, b, tauB)` · `MV.cam.lead(t, t0, dur, dist, pow=2.5)`
Abklingen nach einem Schnitt (doppelt exponentiell) und Anlauf vor einem Schnitt (Potenzkurve) als Versatz in px.

### `MV.cam.blur(el, id)` · `MV.cam.blurFilter(id)` · `MV.cam.motionBlur(ziel, vx, vy, opts)` → `{ sx, sy }`
Unschärfe aus Geschwindigkeit auf **zwei Achsen** (SVG `feGaussianBlur`, `stdDeviation` je Achse aus vx und vy in Raster-px/s). Unter `min` wird der Filter abgeschaltet.
```js
const ziel = MV.cam.blur(layer, "b1-mb");               // einmal im Aufbau
const w = MV.whip("left", t, P.CUT_AB, { phase: "out" });
MV.cam.motionBlur(ziel, w.vx, w.vy, MV.cam.BLUR.whip);  // je Frame
```
Pflicht: Unschärfe nur bei Bewegung und nur in Bewegungsrichtung, Kantenbreite längs ≈ 0,3 × Weg pro Frame, ab 15 Raster-px/Frame Pflicht; Presets `MV.cam.BLUR.element` (Faktor 0,15) und `MV.cam.BLUR.whip` (Faktor 0,35, Schwelle 250 px/s). Nie CSS-`blur()` an bewegten Objekten (nur im Reveal und Ausstieg der Schrift).

## Aussagen · motion.js

### `MV.sayHTML(text, { id, stage, accent, size, weight, tracking, align, color, hang, style })` → HTML
Je Wort eine graue Vorstufe und die Tinte darüber (Material aus `tokens.css`). `stage: "H" | "Z" | "S"` setzt Größe, Gewicht, Laufweite und Position (H mittig, Z in der Lesezone, S als Stützzeile). Akzent: zusammenhängende Wörter im Text, auch Teilwort nach Bindestrich („Marken-**Gedächtnis**“); Satzzeichen bleiben Tinte. Der Schlusspunkt hängt aus der Zentrierung (`hang`, −0,27 em). Unter 64 Ausgabe-px automatisch flache Tinte statt Verlauf.
```js
$("b-text").innerHTML = MV.sayHTML("Alles an einem Ort.", { id: "b-say", stage: "Z", accent: "einem Ort." });
```
Pflicht: ein Beat, eine Aussage (≤ 6 Wörter) plus höchstens eine Stützzeile; Akzent ≤ 2 Wörter; die Aussage liegt nie über UI-Inhalt.

### `MV.say(el, t, t0, { step, rise, blur, dur, light, lightAt, exit })` → `{ done }`
Rendert die Aussage zur Zeit t; `t0` = Einsatz des ersten Worts, auf dem Raster.
```js
MV.say($("b-say"), t, P.B.say.t0, { exit: { t: P.B.say.exit.t, dir: "up" } });
```
Pflichtwerte (ein Satz für alle Aussagen): **Wort-Reveal-Takt** `MV.sayStep(n) = min(Sechzehntel, 0,31 s / (n − 1))`; je Wort 0,5 s `E.out`, Aufstieg 42 Ausgabe-px, Unschärfe 15 → 0, Deckung `E.out(u / 0,4)`; Grau → Tinte per Maske, graue Vorstufe mit inverser Maske; **keine Laufweiten-Animation**; Lichtlauf über den Akzent einmal, 0,55 s, Ende ≥ 0,2 s vor dem Ausstieg; Ausstieg 0,18 s, 60 Ausgabe-px, Unschärfe 13,5, Potenz 3, Deckung bis 0. Folgt binnen ≤ 2 Frames ein Schnitt oder Whip: kein `exit`, die Schrift geht mit dem Bild.

### `MV.readTime(woerter)` → s
Lesezeit-Regel: **voll lesbar mindestens max(1,2 s; 0,4 s + 0,25 s je Wort)**.
```js
MV.readTime(4)   // 1,4
```

### `MV.sayTimes(text, t0, { step, dur, exit, until })` → `{ start, lesbarAb, ausstiegAb, woerter, soll, ist, ok, fruehesterAusstieg }`
Lesefenster: `lesbarAb` = letztes Wort voll da (Aufstieg und Tinte ≥ 97 %), `ausstiegAb` = `exit.t` oder `until`. `fruehesterAusstieg` = nächste Sechzehntel nach `lesbarAb + soll`.
```js
P.B.say.exit = { t: MV.sayTimes(text, t0).fruehesterAusstieg, dir: "up" };
```

### `MV.sayEvents(id, text, t0, opts)` → wie `sayTimes`
Trägt die Aussage in die Ereignisliste ein und warnt, wenn die Lesezeit nicht reicht. Im Zeitplan aufrufen. `opts.typ` (`"aussage"` oder `"hit"` für ein Hit-Statement), `opts.beat` (sonst der Name aus `setBeat`). Wörter zählt `MV.wordCount(text)`: nur Teile mit Buchstabe oder Ziffer („&“ zählt nicht), gleiche Regel wie `scripts/qualitaet.py`.
```js
MV.sayEvents("a-say", "Ideen, sofort sortiert.", MV.sixteenth(1), { until: P.CUT_AB });
```
Pflicht: Reicht die Einstellung der Referenz nicht, wird der Film in ganzen Takten länger (Freigabe G1), statt den Text zu beschleunigen oder die Zeit zu dehnen.

### `MV.zone()` / `MV.ZONE` · `MV.hit()` / `MV.HIT`
Lesezone über einer Grafik (Raster-px): `{ size, baseline, top, subSize, subTop, graphicTop, graphicCenter, margin, style, subStyle }`. Hit-Stufe H mittig: `{ size, lh, style, at(n, zeilen) }`.
```js
const Z = MV.zone();
card.style.top = Z.graphicTop + "px";                                   // Grafik unter der Lesezone
MV.sayHTML("Zeile 2", { stage: "H", style: MV.hit().at(1, 2) });         // zweizeilige Hit-Aussage
```
Pflicht: Aussagen über Grafik immer an derselben Stelle (Grundlinie y 150 Ausgabe-px), Grafik-Oberkante 120 px darunter, Grafik-Mitte einheitlich (y 442), Rand ≥ 160 px. Solange gelesen wird kein Punch-in, kein Klick, kein neues Element in der Lesezone; ein Zweitelement frühestens 0,8 s nach `lesbarAb` und außerhalb der Lesezone.

## Übergänge · motion.js

Nur drei Übergangsarten: Schnitt auf Bewegung in gleicher Richtung, echter Match-Cut, Whip mit Inhalt im ersten Frame danach. Keine Unschärfe-Überblendung, keine Doppelbelichtung.

### `MV.whip(dir, t, t0, { phase, dist, k, tau })` → `{ x, y, vx, vy }`
Whip über den Schnitt bei `t0`; `dir` = Bewegungsrichtung des Inhalts. `phase: "out"` vor dem Schnitt (Kraftkurve `dist · e^(k·(t−t0))`), `"in"` ab dem Schnitt (neue Szene aus der Gegenrichtung, Auslauf τ).
```js
const w = MV.whip("left", t, P.CUT_AB, { phase: "in" });
MV.cam.apply(layer, z, 640, 295, w.x, w.y);
MV.cam.motionBlur(ziel, w.vx, w.vy, MV.cam.BLUR.whip);
```
Standard `MV.WHIP`: Weg raus 13,3 % / rein 11,4 % der Bildbreite (bzw. -höhe), k 8,2, τ 0,145 s. Pflicht: Inhalt im ersten Frame nach dem Schnitt, Unschärfe nur längs.

### `MV.matchMorph(from, to, t, t0, dur, ease = E.inOut)` → `{ x, y, w, h, r, color, u, vx, vy }`
Interpoliert zwei Rechtecke (`{ x, y, w, h, r, color }`, Farben auch als `var(--…)` über `color-mix`). Das Ziel ist das Rechteck des ersten Elements der nächsten Einstellung, z. B. `MV.chainStart(spec)`.
```js
const m = MV.matchMorph(cardRect, { ...MV.chainStart(spec), r: 55, color: "var(--mv-accent)" }, t, 5.133, 0.367, MV.E.sine);
```
Pflicht: am Schnitt gleiche Lage und Größe (oder die Bewegung läuft über den Schnitt weiter); kein Stand vor dem Schnitt (`E.sine` kommt genau am Schnitt an, danach setzt die nächste Bewegung sofort ein).

### `MV.arc(p0, p1, lift, u)` → `[x, y]`
Bogenbahn (quadratische Bézier), `lift < 0` = nach oben.
```js
const [x, y] = MV.arc([200, 400], [900, 300], -120, MV.seg(t, 3, 3.6, MV.E.inOut));
```

## Elemente und Icon-Kette · motion.js

### `MV.CURVES` (`pop`, `draw`, `over`, `grow`) · `MV.pop(t, t0, el, { blur })`
Gemessene Standardkurven als Tabellen (Pop 0,267 s ohne Überschwinger, Linie 0,567 s mit Spitze bei ca. 47 %, Überschwinger am Linienende, Wachsen). In der Probe durch Messungen an der eigenen Referenz ersetzen. `MV.pop` setzt Einstieg mit Start-Unschärfe 6 → 0 (Raster 1280).
```js
MV.pop(t, P.klick, $("b1-badge"));
```

### `MV.chainHTML(spec)` · `MV.chain(el, t, t0, spec)` → `{ done, end }` · `MV.chainEvents(spec, t0)` · `MV.chainStart(spec)`
Icon-Kette Halt, Linie (mit Knoten), Halt, auch Verzweigung 1 → n am Ende. Halte: `{ tile: { svg } | { img } | { label, bg, fg } }`, `{ glyph: "cloud" | "phone" | "laptop" | "note" | "lock" | "check" | "sync" | "star" | "globe" | "swatch" }`, `{ fan: [bild, bild, bild] }`, `{ branch: [Halt, …], spread }`. Linien: `{ line, node, nodeSize, at }`. Optionen: `first: "pop" | "da"` (erster Halt steht schon, nach einem Match-Cut), `slide` (erster Halt gleitet aus der Bildmitte an seinen Platz, mit Unschärfe in Bewegungsrichtung), `pulse` (Lichtimpuls je Linie). Maße skalieren mit `MV.config.ref.w / 1280`, Farben über `--mv-ink`, `--mv-accent`, `--mv-bg`.
```js
const spec = { id: "c-chain", first: "da", slide: true, pulse: true, lineAt: 0,
  items: [{ tile: { svg: APP_TILE } }, { line: 120, node: "sync" }, { glyph: "cloud" }, { line: 120 },
          { branch: [{ glyph: "laptop", size: 96 }, { glyph: "phone", size: 96 }], spread: 136 }] };
$("c-cam").innerHTML = MV.chainHTML(spec);      // Aufbau
MV.chainEvents(spec, P.CUT_BC);                 // Zeitplan: <id>-halt<n> (Typ pop), -linie<n>, -knoten<n>, -puls<n>; spec.beat setzt den Beat-Namen
MV.chain($("c-chain"), t, P.CUT_BC, spec);      // render(t)
```
Pflicht (Token-Satz `MV.CHAIN`): Linie ab 0,333 s je 0,9 s, Halt bei +0,6 s, Knoten-Pop 0,1 s bei +0,75 s, Akzentfarbe 0,05 s später über 0,1 s, Impuls bei +0,9 s über 0,35 s, Verzweigung je 0,05 s versetzt, Tempo 1,0. Jede Grafik trägt echte Inhalte; ein Icon ohne Beleg ist kein Beleg.

### `MV.flagSVG(code, { w, h, r, style })` → SVG
Flagge als Inline-SVG (`DE`, `EN`/`UK`/`GB`, `FR`, `ES`, `NL`), kein Emoji.
```js
`<span>${MV.flagSVG("DE", { h: 0.73 * 26 })} Deutsch</span>`
```
Pflicht: Sprachen und Länder mit eindeutigem Zeichen, in allen Szenen dasselbe.

## Anti-Muster (bewusst nicht in der Bibliothek)

| Anti-Muster | Warum nicht | Stattdessen |
|---|---|---|
| **Zeitverzerrung/Zeitlupe als Lesezeit** (früher `warp`: Steigung < 1 in Lesefenstern) | **erzeugt Standbilder**: im echten Lauf 6,5 s Stand in 8 Fenstern, Ruck an den Fensterkanten bis × 12,9, gedehnte Lichtläufe und Unschärfe aus alter Zeit | Haltezeit nur, wo die Szenenlogik ruht, in ganzen Zählzeiten; Kamera, Pulse, Lichtlauf laufen weiter (Drift ≥ 2 %/s); reicht es nicht, wird der Film in ganzen Takten länger |
| Eigene Easings oder `backOut` im Block | sechs Kurven-Handschriften in 20 s, Überschwinger wirken billig | Token aus `MV.E`, gemessene Tabellen in `MV.CURVES` |
| CSS-`blur()` an bewegten Objekten | rundum unscharf statt längs, wirkt wie Fokusfehler | `MV.cam.motionBlur` mit vx, vy |
| Unschärfe-Überblendung, Doppelbelichtung | wirkt wie Diashow, bricht den Schnittrhythmus | drei Übergangsarten (s. o.) |
| Frame-Rundung vor einer Zeitumrechnung, Slot-Start auf Bruchteil-Frame | Duplikat- und Blitzframes an Blockgrenzen | `MV.globalTime` ohne Rundung, Slot-Starts auf ganzen Frames |
| Sichtbarkeit doppelt steuern (`data-start` und `render()`) | Szenen blitzen oder fehlen einen Frame | nur `render()` |
| Ereigniszeiten von Hand oder aus alten Versionen | Ton sitzt bis zu 2 s neben dem Bild | `MV.events` im Zeitplan, Export mit `tools/ereignisse.mjs` |
| Laufweiten-Animation, `text-shadow`, Glow an Aussagen | unruhig, billig | Reveal aus `MV.say`, Material aus `tokens.css` |

## Demo prüfen und rendern

```bash
cd templates/lib/demo
npm run check        # kopiert ../ nach lib/, dann hyperframes check über scripts/hf.sh (muss grün sein)
npm run ereignisse   # ereignisse.json, Lesezeit-Prüfung
npm run render       # unter scripts/sperre.sh, --workers 2 -> renders/demo.mp4
npm run bogen        # Ein-Blick-Bogen -> renders/ein-blick.png
```
Teil-Render eines Blocks im Film: `bash <skill-dir>/scripts/render-block.sh <lauf-name> <N> [renders/blockN-rK.mp4]`.
