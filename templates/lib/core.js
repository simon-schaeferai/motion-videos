/* motion-videos · lib/core.js (MIT)
   Kern der Bibliothek: ein Objekt MV, Konfiguration (fps, BPM, Raster), Mathe, Zeitbasis,
   Easing-Tokens, Taktraster, Ereignisliste und kleine DOM-Helfer.

   Einbindung (Reihenfolge fest, einmal in index.html):
     <link rel="stylesheet" href="lib/tokens.css">
     <script src="lib/core.js"></script>
     <script src="lib/camera.js"></script>
     <script src="lib/motion.js"></script>
     <script>MV.configure({ fps: 30, bpm: 120, ref: { w: 1280, h: 720 } });</script>

   Regeln, die diese Datei absichert:
   - Deterministisch: Zustand nur aus der Zeit t (Sekunden Filmzeit). Kein Math.random, keine Uhr, kein Netz.
   - Keine Frame-Rundung vor einer Zeitumrechnung (MV.globalTime rundet nicht).
   - Ereigniszeiten liegen auf ganzen Frames (MV.beat, MV.sixteenth, MV.events.add runden genau einmal).
   - Läuft auch ohne DOM (Node), damit tools/ereignisse.mjs den Zeitplan exportieren kann.
   Doku: lib/API.md */
(function (root) {
  "use strict";
  if (root.MV && root.MV.__core) return;
  const MV = (root.MV = root.MV || {});
  MV.__core = true;
  MV.version = "1.0.0";
  const hasDOM = typeof document !== "undefined";

  // ---------- Konfiguration ----------
  /**
   * fps: Bildrate des Films. bpm: Tempo des Taktrasters (aus der Ton-Analyse der Referenz).
   * anchor: Filmzeit der ersten Zählzeit. ref: Raster, in dem gebaut wird (Pixel der Referenz),
   * out: Ausgabegröße. type: Typo-Stufen in Ausgabe-px (siehe tokens.css und API.md).
   */
  MV.config = {
    fps: 30,
    bpm: 120,
    anchor: 0,
    ref: { w: 1920, h: 1080 },
    out: { w: 1920, h: 1080 },
    briefLaenge: null, // Filmlänge laut Brief (G1): Zahl in s oder Spanne [von, bis]; steht im Kopf von ereignisse.json (R12)
    type: {
      H: { size: 120, weight: 600, tracking: -0.035, lineGap: 1.02 },
      Z: { size: 84, weight: 600, tracking: -0.03, baseline: 150 },
      S: { size: 32, weight: 400, tracking: -0.005, below: 56 },
      L: { size: 32, weight: 500, tracking: -0.01 },
      read: 32, // Lesetext-Minimum (Ausgabe-px bei 1080 p): Terminal-, Code-, UI-Zeilen, Stütz- und CTA-Zeile; kleiner nur als deko (09 §2)
      gradientMin: 64, // Verlauf erst ab dieser Größe (Ausgabe-px), darunter flache Tinte
      graphicTop: 120, // Grafik-Oberkante unter der Grundlinie der Lesezone (Ausgabe-px)
      graphicCenter: 442, // Grafik-Mitte (Ausgabe-px, y)
      margin: 160, // Mindestrand (Ausgabe-px)
      baselineRatio: 0.939, // Grundlinie unter der Zeilenoberkante in em bei line-height 1,15 (Inter)
    },
  };
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const merge = (a, b) => {
    Object.keys(b || {}).forEach((k) => {
      if (isObj(b[k]) && isObj(a[k])) merge(a[k], b[k]);
      else a[k] = b[k];
    });
    return a;
  };
  /** Konfiguration setzen (tief zusammenführen) und das Raster als CSS-Variablen auf :root schreiben. */
  MV.configure = (opts = {}) => {
    merge(MV.config, opts);
    if (hasDOM && document.documentElement) {
      const s = document.documentElement.style;
      s.setProperty("--mv-ref-w", String(MV.config.ref.w));
      s.setProperty("--mv-ref-h", String(MV.config.ref.h));
      s.setProperty("--mv-scale", String(MV.scale()));
    }
    return MV.config;
  };
  /** Skalierung Raster -> Ausgabe (z. B. 1920 / 1280 = 1,5). */
  MV.scale = () => MV.config.out.w / MV.config.ref.w;
  /** Ausgabe-px -> Raster-px (Typo-Stufen und Lesezone sind in Ausgabe-px definiert). */
  MV.px = (outPx) => (outPx * MV.config.ref.w) / MV.config.out.w;

  // ---------- Warnungen (je Text nur einmal, damit render() nicht flutet) ----------
  const warned = new Set();
  MV.warn = (msg) => {
    if (warned.has(msg)) return;
    warned.add(msg);
    if (typeof console !== "undefined") console.warn("[MV] " + msg);
  };

  // ---------- Mathe ----------
  MV.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  MV.lerp = (a, b, u) => a + (b - a) * u;
  /** Ease über das Zeitfenster [t0, t1]: ease((t - t0) / (t1 - t0)), geklemmt. */
  MV.seg = (t, t0, t1, ease) => ease(MV.clamp((t - t0) / (t1 - t0)));
  /** Stückweise lineare Interpolation über gemessene Punkte [[t, wert], …] (Kurven als Tabellen). */
  MV.table = (pts, t) => {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const [t0, v0] = pts[i - 1];
        const [t1, v1] = pts[i];
        return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
      }
    }
    return pts[pts.length - 1][1];
  };
  MV.hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  /** Farbmischung a -> b (Hex "#rrggbb" oder [r, g, b]) als rgb(). Für CSS-Variablen: color-mix() in CSS nutzen. */
  MV.mix = (a, b, u) => {
    const A = typeof a === "string" ? MV.hex(a) : a;
    const B = typeof b === "string" ? MV.hex(b) : b;
    return "rgb(" + Math.round(MV.lerp(A[0], B[0], u)) + "," + Math.round(MV.lerp(A[1], B[1], u)) + "," + Math.round(MV.lerp(A[2], B[2], u)) + ")";
  };
  /** Ableitung von f nach der Zeit (Einheit von f pro Sekunde), für Unschärfe aus Geschwindigkeit. */
  MV.vel = (f, t, h = 1 / 240) => (f(t + h) - f(t - h)) / (2 * h);

  // ---------- Zeitbasis ----------
  MV.fps = () => MV.config.fps;
  /** Zeit auf den nächsten ganzen Frame. */
  MV.frame = (t) => Math.round(t * MV.config.fps) / MV.config.fps;
  /** Frame-Index zur Zeit t. */
  MV.frameIndex = (t) => Math.round(t * MV.config.fps);
  /** Liegt t auf einem ganzen Frame (Toleranz in Sekunden)? */
  MV.isFrame = (t, tol = 0.0011) => Math.abs(t - MV.frame(t)) <= tol;
  /**
   * Lokale Zeit einer Sub-Composition -> globale Filmzeit. Rundet NICHT (keine Frame-Rundung vor der Umrechnung).
   * start = data-start des Slots; liegt er nicht auf einem ganzen Frame, kommt eine Warnung (Duplikat- und Blitzframes drohen).
   */
  MV.globalTime = (local, start) => {
    if (!MV.isFrame(start)) MV.warn("Slot-Start " + start + " s liegt nicht auf einem ganzen Frame (" + (start * MV.config.fps).toFixed(3) + "). Auf ganze Frames legen.");
    return local + start;
  };

  // ---------- Easing-Tokens (nur diese verwenden; Blöcke definieren keine eigenen) ----------
  /** cubic-bezier(x1, y1, x2, y2) als Funktion u -> y (Newton, dann Bisektion; deterministisch). */
  MV.bezier = (x1, y1, x2, y2) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (s) => ((ax * s + bx) * s + cx) * s;
    const sy = (s) => ((ay * s + by) * s + cy) * s;
    const dsx = (s) => (3 * ax * s + 2 * bx) * s + cx;
    return (u) => {
      if (u <= 0) return 0;
      if (u >= 1) return 1;
      let s = u;
      for (let i = 0; i < 8; i++) {
        const e = sx(s) - u, d = dsx(s);
        if (Math.abs(e) < 1e-7) return sy(s);
        if (Math.abs(d) < 1e-6) break;
        s -= e / d;
      }
      let lo = 0, hi = 1;
      s = u;
      for (let i = 0; i < 40; i++) {
        const v = sx(s);
        if (Math.abs(v - u) < 1e-7) break;
        if (v < u) lo = s; else hi = s;
        s = (lo + hi) / 2;
      }
      return sy(s);
    };
  };
  MV.E = {
    /** linear (Drift, Lichtlauf-Position) */
    lin: (u) => u,
    /** Standard-Einstieg cubic-bezier(.16, 1, .3, 1): Reveal, Pop, Settle */
    out: MV.bezier(0.16, 1, 0.3, 1),
    /** expo-out */
    expoOut: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
    /** expo-in-out: Morph, Match-Cut, Snap (ohne Zwischenhalt) */
    inOut: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2),
    /** sanfte S-Kurve für Pulse und Lichtläufe */
    sine: (u) => 0.5 - 0.5 * Math.cos(Math.PI * MV.clamp(u)),
    /** Potenz-Ausstieg in einen Schnitt (Exponent 2,3 bis 3) */
    powIn: (k = 2.5) => (u) => Math.pow(MV.clamp(u), k),
  };

  // ---------- Taktraster ----------
  /** Länge einer Zählzeit in Sekunden (60 / BPM). */
  MV.beatLen = () => 60 / MV.config.bpm;
  /** Länge einer Sechzehntel in Sekunden. */
  MV.sixteenthLen = () => MV.beatLen() / 4;
  /** Zeit der n-ten Zählzeit ab Anker, auf ganze Frames gerundet. */
  MV.beat = (n, anchor = MV.config.anchor) => MV.frame(anchor + n * MV.beatLen());
  /** Zeit der n-ten Sechzehntel ab Anker, auf ganze Frames gerundet. */
  MV.sixteenth = (n, anchor = MV.config.anchor) => MV.frame(anchor + n * MV.sixteenthLen());
  /** Nächstgelegene Zählzeit zu t (auf Frames gerundet). */
  MV.onBeat = (t, anchor = MV.config.anchor) => MV.beat(Math.round((t - anchor) / MV.beatLen()), anchor);
  /** Nächstgelegene Sechzehntel zu t. */
  MV.onSixteenth = (t, anchor = MV.config.anchor) => MV.sixteenth(Math.round((t - anchor) / MV.sixteenthLen()), anchor);
  /** Nächste Sechzehntel ab t (nie früher als t). */
  MV.nextSixteenth = (t, anchor = MV.config.anchor) => MV.sixteenth(Math.ceil((t - anchor) / MV.sixteenthLen() - 1e-6), anchor);
  /** Lage von t im Raster: { beat (Zählzeit, Dezimal), sixteenth (Index), off (Abweichung in Frames) } */
  MV.gridPos = (t, anchor = MV.config.anchor) => {
    const s = (t - anchor) / MV.sixteenthLen();
    const n = Math.round(s);
    return { beat: +(s / 4).toFixed(3), sixteenth: n, off: +((t - (anchor + n * MV.sixteenthLen())) * MV.config.fps).toFixed(2) };
  };

  // ---------- Ereignisliste (einzige Quelle für Ton-Cues, Ein-Blick-Bogen, Prüfskripte) ----------
  /**
   * Kanonisches Format (Schema 1, dokumentiert in templates/ereignisse.vorlage.json und
   * references/05-bau-probe-parallel.md, Abschnitt „Ereignisliste“). Je Eintrag:
   *   Pflicht:  id (eindeutig), t (s Filmzeit, ganze Frames), typ (aus MV.EVENT_TYPES)
   *   optional: frame, zaehlzeit (Lage im Taktraster, Dezimalzahl), beat (Beat-Name aus dem Blueprint, z. B. "B1 Einstieg"),
   *             text, art (bei schnitt: hart | whip | match | bewegung), richtung
   *   Aussagen (aussage; hit nur als Hit-Statement): text, lesbarAb, ausstiegAb (null = bis Filmende), woerter, lesezeitSoll, lesezeitIst
   *   stille:   bis (Pflicht, s Filmzeit)
   *   deko:     bis, bereich [x0, y0, x1, y1] (Ausgabe-px), grund: kleine Schrift, die nicht gelesen werden soll (R4 Lesetext)
   * Ereignisse im Zeitplan registrieren (plan.js), nie in render(). t wird einmal auf ganze Frames gerundet.
   * Doppelte id: der spätere Eintrag ersetzt den früheren. MV.events.setBeat(name) setzt `beat` für alle folgenden Einträge.
   */
  MV.EVENT_TYPES = ["aussage", "hit", "schnitt", "punch", "klick", "tippen", "pop", "linie", "knoten", "puls", "morph", "ki", "endkarte", "ausklang", "stille", "ende", "deko", "bildwelt"];
  MV.EVENT_SCHEMA = 1;
  const evMap = new Map();
  let curBeat = null;
  MV.events = {
    add(ev) {
      if (!ev || !ev.id || !ev.typ || typeof ev.t !== "number") throw new Error("MV.events.add: id, typ und t sind Pflicht");
      if (MV.EVENT_TYPES.indexOf(ev.typ) < 0) MV.warn("Ereignis " + ev.id + ": Typ „" + ev.typ + "“ ist nicht im Schema (" + MV.EVENT_TYPES.join(", ") + ").");
      if (ev.typ === "stille" && typeof ev.bis !== "number") throw new Error("MV.events.add: stille braucht bis (Ende in s)");
      if (ev.typ === "deko" && (typeof ev.bis !== "number" || !Array.isArray(ev.bereich) || ev.bereich.length !== 4 || !ev.grund))
        throw new Error("MV.events.add: deko braucht bis, bereich [x0, y0, x1, y1] (Ausgabe-px) und grund");
      const t = MV.frame(ev.t);
      const base = { id: ev.id, t: +t.toFixed(4), frame: MV.frameIndex(t), typ: ev.typ, zaehlzeit: MV.gridPos(t).beat };
      if (curBeat) base.beat = curBeat;
      const out = Object.assign(base, ev, { t: +t.toFixed(4) });
      out.frame = MV.frameIndex(t);
      ["lesbarAb", "ausstiegAb", "bis"].forEach((k) => {
        if (typeof out[k] === "number" && isFinite(out[k])) out[k] = +out[k].toFixed(4);
      });
      evMap.set(ev.id, out);
      return out;
    },
    /** Beat-Name für alle folgenden Einträge (z. B. "B2 Ergebnis"); null schaltet ab. */
    setBeat(name) {
      curBeat = name || null;
    },
    /** Alle Ereignisse, nach Zeit sortiert. */
    list() {
      return Array.from(evMap.values()).sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
    },
    get(id) {
      return evMap.get(id);
    },
    clear() {
      evMap.clear();
      curBeat = null;
    },
    /** Inhalt von ereignisse.json: Kopf (Schema, fps, BPM, Takt-Eins) + Liste, Felder wie oben. */
    toJSON() {
      const kopf = { schema: MV.EVENT_SCHEMA, fps: MV.config.fps, bpm: MV.config.bpm, takt0: MV.config.anchor };
      if (MV.config.briefLaenge !== null && MV.config.briefLaenge !== undefined) kopf.briefLaenge = MV.config.briefLaenge;
      return Object.assign(kopf, { ereignisse: MV.events.list() });
    },
  };

  // ---------- DOM-Helfer ----------
  /** Wert einer CSS-Variable von :root (z. B. "--mv-accent"), getrimmt. */
  MV.cssVar = (name, fallback = "") => {
    if (!hasDOM) return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  /** Geteiltes, unsichtbares SVG mit <defs> für Filter (Unschärfe). Idempotent. */
  MV.sprite = () => {
    let svg = document.getElementById("mv-sprite");
    if (svg) return svg;
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "mv-sprite");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.innerHTML = "<defs></defs>";
    document.body.insertBefore(svg, document.body.firstChild);
    return svg;
  };
  /** Mauszeiger als Inline-SVG (Pfeil, Kontur weiß). size = Höhe in Raster-px. */
  MV.cursorSVG = (id, { size = 32, fill = "var(--mv-ink)", stroke = "#ffffff" } = {}) =>
    `<svg class="mv-cursor" id="${id}" width="${(size * 22) / 32}" height="${size}" viewBox="0 0 22 32" data-layout-allow-overlap style="position:absolute;overflow:visible"><path d="M2 1.5 L2 25.5 L7.6 20.2 L11.4 29.2 L15.4 27.5 L11.7 18.7 L19.4 18.7 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round" /></svg>`;
  /**
   * Schreibmaschine mit farbigem Schreibkopf. table = [[t, Anteil 0..1], …] in Filmzeit (aus der Referenz gemessen).
   * Jedes Zeichen erscheint im Frame, in dem der Anteil es erreicht, in der Kopf-Farbe und wird in settle s zur Textfarbe.
   * Gibt { chars, paint(t) } zurück; paint(t) in render() aufrufen.
   */
  MV.typewriter = (el, text, table, { head = "var(--mv-accent)", ink = "var(--mv-ui-text)", settle = 0.2 } = {}) => {
    const fps = MV.config.fps;
    const chars = Array.from(text).map((ch) => {
      const sp = document.createElement("span");
      sp.textContent = ch;
      el.appendChild(sp);
      return sp;
    });
    const n = chars.length;
    const rts = new Array(n).fill(Infinity);
    const tMin = table[0][0], tMax = table[table.length - 1][0];
    for (let f = Math.floor(tMin * fps) - 1; f <= Math.ceil(tMax * fps) + 1; f++) {
      const tt = f / fps;
      const k = Math.round(MV.table(table, tt) * n);
      for (let i = 0; i < k; i++) if (rts[i] === Infinity) rts[i] = tt;
    }
    return {
      chars,
      times: rts,
      paint(t) {
        chars.forEach((sp, i) => {
          const k = t - rts[i] + 1e-6;
          if (k < 0) { sp.style.opacity = 0; return; }
          sp.style.opacity = 1;
          const u = MV.clamp(k / settle);
          sp.style.color = u >= 1 ? ink : "color-mix(in srgb, " + ink + " " + (u * 100).toFixed(1) + "%, " + head + ")";
        });
      },
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
