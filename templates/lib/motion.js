/* motion-videos · lib/motion.js (MIT) · braucht lib/core.js und lib/camera.js
   Bewegungsgrammatik als Teil von MV:
     MV.sayHTML / MV.say           Aussage: Wortstaffel, Aufstieg, Entschärfen, Grau -> Tinte per Maske, Akzent mit Lichtlauf, Ausstieg
     MV.readTime / MV.sayTimes     Lesezeit-Regel und Lesefenster einer Aussage
     MV.sayEvents                  Aussage in die Ereignisliste (mit lesbarAb, ausstiegAb), prüft die Lesezeit
     MV.zone() / MV.hit()          feste Lesezone über Grafik (Stufe Z + Stützzeile S) und Hit-Stufe H mittig
     MV.whip                       Whip-Pan raus / rein, liefert Versatz und Geschwindigkeit für die Unschärfe
     MV.matchMorph                 Rechteck-Interpolation für einen echten Match-Cut
     MV.arc                        Bogenbahn
     MV.pop                        Einstieg eines Elements (gemessene Pop-Kurve)
     MV.chainHTML / MV.chain       Icon-Kette Halt – Linie – Knoten – Linie – Halt (auch Verzweigung 1 -> n)
     MV.chainEvents                Ereignisse einer Kette für die Ereignisliste
     MV.flagSVG                    Flaggen als Inline-SVG
   Bewusst NICHT enthalten: Zeitverzerrung/Zeitlupe als Lesezeit (erzeugt Standbilder, siehe API.md, Anti-Muster).
   Alles deterministisch, Zustand nur aus t. Farben nur über CSS-Variablen aus lib/tokens.css. Doku: lib/API.md */
(function (root) {
  "use strict";
  const MV = root.MV;
  if (!MV || !MV.__core || !MV.cam) throw new Error("lib/motion.js: zuerst lib/core.js und lib/camera.js laden");
  const clamp = MV.clamp;
  const r = () => MV.px(1); // Ausgabe-px -> Raster-px
  const PUNCT = /[.,:;!?“”"…]+$/;
  const PUNCT_ALL = /[.,!?:;„“”"…]/g;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ---------- Lesezone und Hit-Stufe ----------
  /**
   * Lesezone über einer Grafik (Raster-px). Werte aus MV.config.type (Ausgabe-px) umgerechnet.
   * { size, baseline, top, subSize, subTop, graphicTop, graphicCenter, margin, style, subStyle }
   */
  MV.zone = () => {
    const T = MV.config.type, k = r(), W = MV.config.ref.w;
    const size = T.Z.size * k, baseline = T.Z.baseline * k;
    const top = baseline - T.baselineRatio * size;
    const subSize = T.S.size * k, subBaseline = baseline + T.S.below * k;
    const subTop = subBaseline - T.baselineRatio * subSize;
    return {
      size, baseline, top, subSize, subTop,
      graphicTop: baseline + T.graphicTop * k,
      graphicCenter: T.graphicCenter * k,
      margin: T.margin * k,
      style: "left:0;top:" + top.toFixed(2) + "px;width:" + W + "px",
      subStyle: "left:0;top:" + subTop.toFixed(2) + "px;width:" + W + "px",
    };
  };
  /**
   * Hit-Stufe H: große Aussage ohne Grafik, optisch mittig. at(n, lines) = Stil der Zeile n (0-basiert) von lines.
   * { size, lh, style, at }
   */
  MV.hit = () => {
    const T = MV.config.type, k = r(), W = MV.config.ref.w, H = MV.config.ref.h;
    const size = T.H.size * k, lh = size * T.H.lineGap;
    const at = (n = 0, lines = 1) => {
      const center = H / 2 + (n - (lines - 1) / 2) * lh;
      return "left:0;top:" + (center - 0.575 * size).toFixed(2) + "px;width:" + W + "px";
    };
    return { size, lh, style: at(0, 1), at };
  };
  Object.defineProperty(MV, "ZONE", { get: MV.zone, enumerable: true });
  Object.defineProperty(MV, "HIT", { get: MV.hit, enumerable: true });

  // ---------- Lesezeit ----------
  /** Lesezeit-Regel: voll lesbar mindestens max(1,2 s; 0,4 s + 0,25 s je Wort). */
  MV.readTime = (words) => Math.max(1.2, 0.4 + 0.25 * words);
  const wordsOf = (text) => String(text).trim().split(/\s+/).filter(Boolean);
  /** Wörter für Lesezeit und „≤ 6 Wörter“: nur Teile mit Buchstabe oder Ziffer („&“, „+“, „·“ zählen nicht). Gleiche Regel in scripts/qualitaet.py. */
  MV.wordCount = (text) => wordsOf(text).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  /** Standard-Wortstaffel: min(Sechzehntel, 0,31 s / (n − 1)). */
  MV.sayStep = (n) => (n > 1 ? Math.min(MV.sixteenthLen(), 0.31 / (n - 1)) : MV.sixteenthLen());
  // u, ab dem E.out >= 0,97 (Wort steht voll), einmal berechnet
  let U97 = null;
  const u97 = () => {
    if (U97 !== null) return U97;
    for (let k = 1; k <= 400; k++) if (MV.E.out(k / 400) >= 0.97) return (U97 = k / 400);
    return (U97 = 1);
  };
  /**
   * Lesefenster einer Aussage mit Einsatz t0.
   * opts wie bei MV.say (step, dur, exit) plus until (Ende ohne eigenen Ausstieg, z. B. Schnitt oder Whip).
   * Gibt { start, lesbarAb, ausstiegAb, woerter, soll, ist, ok, fruehesterAusstieg } zurück.
   * lesbarAb = letztes Wort voll da (Aufstieg und Tinte >= 97 %). fruehesterAusstieg = nächste Sechzehntel nach lesbarAb + soll.
   */
  MV.sayTimes = (text, t0, opts = {}) => {
    const n = wordsOf(text).length; // Wort-Kästen der Staffel (auch „&“)
    const { step = MV.sayStep(n), dur = 0.5, exit = null, until = Infinity } = opts;
    const ti = t0 + (n - 1) * step;
    const lesbarAb = Math.max(ti + u97() * dur, ti + 0.06 + u97() * 0.34);
    const ausstiegAb = exit ? exit.t : until;
    const woerter = MV.wordCount(text);
    const soll = MV.readTime(woerter);
    const ist = ausstiegAb - lesbarAb;
    return { start: t0, lesbarAb, ausstiegAb, woerter, soll, ist, ok: ist >= soll - 1e-6, fruehesterAusstieg: MV.nextSixteenth(lesbarAb + soll) };
  };
  /**
   * Aussage in die Ereignisliste eintragen (im Zeitplan, nicht in render()). Warnt, wenn die Lesezeit nicht reicht.
   * Eintrag: { id, typ: "aussage", t: t0, text, woerter, lesbarAb, ausstiegAb, lesezeitSoll, lesezeitIst, beat? }.
   * opts wie MV.sayTimes plus typ ("aussage" oder "hit") und beat (Beat-Name, sonst der von MV.events.setBeat).
   */
  MV.sayEvents = (id, text, t0, opts = {}) => {
    const w = MV.sayTimes(text, t0, opts);
    if (!w.ok) MV.warn("Aussage " + id + " („" + text + "“): voll lesbar " + w.ist.toFixed(2) + " s, Soll " + w.soll.toFixed(2) + " s. Ausstieg frühestens " + w.fruehesterAusstieg.toFixed(3) + " s.");
    MV.events.add({
      id, typ: opts.typ || "aussage", t: t0, text, woerter: w.woerter, ...(opts.beat ? { beat: opts.beat } : {}),
      lesbarAb: w.lesbarAb, ausstiegAb: isFinite(w.ausstiegAb) ? w.ausstiegAb : null,
      lesezeitSoll: +w.soll.toFixed(3), lesezeitIst: isFinite(w.ist) ? +w.ist.toFixed(3) : null,
    });
    return w;
  };

  // ---------- Aussage ----------
  /**
   * HTML einer Aussage. Je Wort eine graue Vorstufe (.mv-g) und die Tinte (.mv-d) darüber.
   * opts: {
   *   id, stage: "H" | "Z" | "S" (setzt Größe, Gewicht, Laufweite und Position aus MV.config.type),
   *   accent: "Wort" | "zwei Wörter" (zusammenhängend im Text; erstes Akzentwort darf ein Teilwort nach Bindestrich sein),
   *   size (Raster-px, überschreibt stage), weight, tracking (em), align: "center" | "left" | "right",
   *   color: "ink" (heller Grund, Verlauf) | "white" (dunkler Grund, Silber-Verlauf) | "sub" (Stützzeile, flach),
   *   hang: true (Schlusspunkt hängt aus der Zentrierung), style (Position, Standard je stage),
   *   deko: true (bewusst kleiner als MV.config.type.read, dann auch ein deko-Ereignis eintragen) }
   * Verlauf nur ab MV.config.type.gradientMin Ausgabe-px; darunter flache Tinte. Akzent höchstens 2 Wörter.
   */
  MV.sayHTML = (text, opts = {}) => {
    const T = MV.config.type, k = r();
    const st = opts.stage ? T[opts.stage] : null;
    const isSub = opts.color === "sub" || opts.stage === "S";
    const size = opts.size !== undefined ? opts.size : st ? st.size * k : T.Z.size * k;
    const weight = opts.weight !== undefined ? opts.weight : st ? st.weight : 600;
    const tracking = opts.tracking !== undefined ? opts.tracking : st ? st.tracking : -0.03;
    const { id = "", accent = "", align = "center", hang = true } = opts;
    if (!opts.deko && T.read && size / k < T.read - 0.01)
      MV.warn("Text „" + text + "“: " + Math.round(size / k) + " Ausgabe-px liegt unter dem Lesetext-Minimum " + T.read + " px (09 §2). Größer setzen oder als deko-Ereignis markieren.");
    let style = opts.style;
    if (style === undefined) style = opts.stage === "H" ? MV.hit().style : opts.stage === "S" ? MV.zone().subStyle : MV.zone().style;
    const words = wordsOf(text);
    const acc = accent ? wordsOf(accent) : [];
    if (acc.length > 2) MV.warn("Akzent „" + accent + "“ hat mehr als 2 Wörter.");
    const clean = (w) => w.replace(PUNCT_ALL, "");
    let accFrom = -1, accPrefix = "";
    if (acc.length) {
      for (let i = 0; i + acc.length <= words.length && accFrom < 0; i++) {
        const w0 = clean(words[i]), a0 = clean(acc[0]);
        const first = w0 === a0 ? "" : w0.endsWith("-" + a0) ? words[i].slice(0, words[i].lastIndexOf("-" + a0) + 1) : null;
        if (first === null) continue;
        if (acc.every((a, j) => j === 0 || clean(words[i + j]) === clean(a))) { accFrom = i; accPrefix = first; }
      }
      if (accFrom < 0) MV.warn("Akzent „" + accent + "“ steht nicht in „" + text + "“.");
    }
    const dark = opts.color === "white";
    const flat = isSub || size * MV.scale() < T.gradientMin;
    const inkCls = isSub ? "mv-flat-sub" : flat ? (dark ? "mv-flat-white" : "mv-flat-ink") : dark ? "mv-silver" : "mv-ink";
    const accCls = flat ? "mv-flat-acc" : "mv-acc";
    const gray = dark ? "var(--mv-say-gray-dark)" : isSub ? "var(--mv-say-gray-sub)" : "var(--mv-say-gray)";
    const span = (cls, txt, extra = "") => `<span class="${cls}"${extra ? ` style="${extra}"` : ""}>${esc(txt)}</span>`;
    const hangCss = "margin-right:-0.27em";
    const html = words
      .map((w, i) => {
        const isAcc = accFrom >= 0 && i >= accFrom && i < accFrom + acc.length;
        const last = i === words.length - 1;
        let core = w, punct = "";
        const m = w.match(PUNCT);
        if (m && m.index > 0) { core = w.slice(0, m.index); punct = m[0]; }
        const hangIt = last && hang && align === "center" && /^[.!?…]+$/.test(punct);
        // Hängender Schlusspunkt: negativer Rand am Wort-Kasten, nicht am Satzzeichen (die Reveal-Masken decken nur den Kasten)
        const pStyle = "";
        // graue Vorstufe (bestimmt die Breite des Worts; Reveal-Material, kein Lesetext: data-layout-ignore für Layout- und Kontrast-Audit)
        const g = esc(core) + (punct ? span("", punct, pStyle) : "");
        // Tinte
        let d;
        if (isAcc) {
          const pre = i === accFrom ? accPrefix : "";
          d = (pre ? span(inkCls, pre) : "") + span("mv-a " + accCls, core.slice(pre.length)) + (punct ? span(inkCls, punct, pStyle) : "");
        } else {
          d = span(inkCls, core) + (punct ? span(inkCls, punct, pStyle) : "");
        }
        return `<span class="mv-w" data-layout-allow-overlap data-acc="${isAcc ? 1 : 0}" style="position:relative;display:inline-block;white-space:nowrap${hangIt ? ";" + hangCss : ""}"><span class="mv-g" data-layout-ignore data-layout-allow-overlap style="color:${gray}">${g}</span><span class="mv-d" data-layout-allow-overlap style="position:absolute;left:0;top:0;white-space:nowrap">${d}</span></span>`;
      })
      .join(" ");
    return `<div class="mv-say"${id ? ` id="${id}"` : ""} data-dark="${dark ? 1 : 0}" data-layout-allow-overlap data-layout-allow-overflow style="position:absolute;white-space:nowrap;text-align:${align};font-size:${size.toFixed(2)}px;line-height:${(size * 1.15).toFixed(2)}px;font-weight:${weight};letter-spacing:${tracking}em;${style}">${html}</div>`;
  };

  const sayCache = new WeakMap();
  const parts = (el) => {
    let p = sayCache.get(el);
    if (!p) {
      p = Array.from(el.querySelectorAll(".mv-w")).map((w) => ({ w, g: w.querySelector(".mv-g"), d: w.querySelector(".mv-d"), a: w.querySelector(".mv-a.mv-acc"), acc: w.dataset.acc === "1" }));
      sayCache.set(el, p);
    }
    return p;
  };
  /** Maske links -> rechts (p 0..1, weiche Kante soft); inv beschneidet die graue Vorstufe genau gegenläufig. */
  const mask = (el, p, soft = 0.25, inv = false) => {
    const a = (p * (1 + soft) - soft) * 100, b = p * (1 + soft) * 100;
    const c0 = inv ? "transparent" : "#000", c1 = inv ? "#000" : "transparent";
    const m = "linear-gradient(90deg, " + c0 + " " + a.toFixed(1) + "%, " + c1 + " " + b.toFixed(1) + "%)";
    el.style.webkitMaskImage = m;
    el.style.maskImage = m;
  };
  /**
   * Aussage zur Zeit t rendern (in render() aufrufen). t0 = Einsatz des ersten Worts, auf dem Raster.
   * Ein Satz für alle Aussagen:
   *   Wortstaffel MV.sayStep(n); je Wort dur 0,5 s E.out: Aufstieg rise 28, Unschärfe blur 10 -> 0, Deckung E.out(u / 0,4);
   *   Grau -> Tinte per Maske (Start 0,06 s nach dem Wort, 0,34 s), graue Vorstufe mit inverser Maske; keine Laufweiten-Animation.
   *   Lichtlauf über den Akzent einmal, 0,55 s Echtzeit, Ende >= 0,2 s vor dem Ausstieg.
   *   Ausstieg: dur 0,18 s, dist 40, Unschärfe 9, Potenz 3, Deckung bis 0, danach unsichtbar.
   *   Folgt binnen <= 2 Frames ein Schnitt oder Whip: exit weglassen, die Schrift geht mit dem Bild.
   * opts: { step, rise: 28, blur: 10, dur: 0.5, light: true, lightAt, exit: { t, dir: "up"|"down"|"left"|"right"|"fade", dist: 40, dur: 0.18, blur: 9 } }
   * rise, blur, dist in Ausgabe-px (werden ins Raster umgerechnet). Gibt { done } zurück.
   */
  MV.say = (el, t, t0, opts = {}) => {
    const ws = parts(el);
    const n = ws.length;
    const k = r();
    const { step = MV.sayStep(n), dur = 0.5, light = true, exit = null } = opts;
    const rise = (opts.rise !== undefined ? opts.rise : 28 * 1.5) * k;
    const blur = (opts.blur !== undefined ? opts.blur : 10 * 1.5) * k;
    const xdur = exit ? (exit.dur !== undefined ? exit.dur : 0.18) : 0;
    const vis = t >= t0 - 1e-6 && (!exit || t < exit.t + xdur);
    el.style.visibility = vis ? "inherit" : "hidden";
    let done = true;
    ws.forEach((o, i) => {
      const ti = t0 + i * step;
      const u = clamp((t - ti) / dur);
      const e = MV.E.out(u);
      o.w.style.opacity = t < ti ? 0 : MV.E.out(clamp(u / 0.4));
      o.w.style.transform = "translateY(" + (rise * (1 - e)).toFixed(2) + "px)";
      const b = blur * (1 - e);
      o.w.style.filter = b > 0.05 ? "blur(" + b.toFixed(2) + "px)" : "none";
      const p = MV.E.out(clamp((t - ti - 0.06) / 0.34));
      mask(o.d, p);
      mask(o.g, p, 0.25, true);
      o.g.style.visibility = p < 0.999 ? "inherit" : "hidden";
      if (u < 1) done = false;
    });
    // Lichtlauf über den Akzent
    let lightAt = opts.lightAt !== undefined ? opts.lightAt : t0 + (n - 1) * step + dur * 0.8;
    if (exit) lightAt = Math.min(lightAt, exit.t - 0.2 - 0.55);
    const hi = el.dataset.dark === "1" ? "var(--mv-acc-hi-dark)" : "var(--mv-acc-hi)";
    ws.forEach((o) => {
      if (!o.acc || !o.a) return;
      const q = (t - lightAt) / 0.55;
      if (light && q > -0.05 && q < 1.05) {
        const c = -30 + 160 * clamp(q);
        o.a.style.backgroundImage = "linear-gradient(100deg, transparent " + (c - 22).toFixed(1) + "%, " + hi + " " + c.toFixed(1) + "%, transparent " + (c + 22).toFixed(1) + "%), var(--mv-acc-grad)";
      } else o.a.style.backgroundImage = "";
    });
    // Ausstieg
    if (exit) {
      const { dir = "up" } = exit;
      const dist = (exit.dist !== undefined ? exit.dist : 40 * 1.5) * k;
      const xb = (exit.blur !== undefined ? exit.blur : 9 * 1.5) * k;
      const u = clamp((t - exit.t) / xdur);
      const e = u * u * u;
      const dx = dir === "left" ? -dist : dir === "right" ? dist : 0;
      const dy = dir === "up" ? -dist : dir === "down" ? dist : 0;
      el.style.transform = u > 0 ? "translate(" + (dx * e).toFixed(2) + "px," + (dy * e).toFixed(2) + "px)" : "none";
      el.style.opacity = 1 - u;
      const b = xb * e;
      el.style.filter = b > 0.05 ? "blur(" + b.toFixed(2) + "px)" : "none";
    } else {
      el.style.transform = "none";
      el.style.opacity = 1;
      el.style.filter = "none";
    }
    return { done };
  };

  // ---------- Whip-Pan ----------
  /** Standardwerte (gemessen an einer Referenz): Weg als Anteil der Bildbreite bzw. -höhe. */
  MV.WHIP = { outDist: 0.133, inDist: 0.114, k: 8.2, tau: 0.145 };
  /**
   * Whip über einen Schnitt bei t0. dir = Bewegungsrichtung des Bildinhalts: "left" | "right" | "up" | "down".
   * phase "out" (vor t0): Anlauf mit Kraftkurve, Versatz dist·e^(k·(t − t0)) in Richtung dir.
   * phase "in" (ab t0): die neue Szene kommt aus der Gegenrichtung (Inhalt im ersten Frame) und läuft mit tau aus.
   * Gibt { x, y, vx, vy } zurück (Raster-px, px/s). Unschärfe: MV.cam.motionBlur(ziel, vx, vy, MV.cam.BLUR.whip).
   */
  MV.whip = (dir, t, t0, { phase = "out", dist, k = MV.WHIP.k, tau = MV.WHIP.tau } = {}) => {
    const sgn = dir === "left" || dir === "up" ? -1 : 1;
    const horiz = dir === "left" || dir === "right";
    const span = horiz ? MV.config.ref.w : MV.config.ref.h;
    let off, v;
    if (phase === "out") {
      const D = dist !== undefined ? dist : MV.WHIP.outDist * span;
      off = t >= t0 ? D : D * Math.exp(k * (t - t0));
      v = t >= t0 ? 0 : D * k * Math.exp(k * (t - t0));
    } else {
      const D = dist !== undefined ? dist : MV.WHIP.inDist * span;
      off = t < t0 ? -D : -D * Math.exp(-(t - t0) / tau);
      v = t < t0 ? 0 : (D / tau) * Math.exp(-(t - t0) / tau);
    }
    const o = sgn * off, vs = sgn * v;
    return { x: horiz ? o : 0, y: horiz ? 0 : o, vx: horiz ? vs : 0, vy: horiz ? 0 : vs };
  };

  // ---------- Match-Morph ----------
  /**
   * Interpoliert zwei Rechtecke für einen echten Match-Cut (gleiche Lage und Größe am Schnitt).
   * from/to: { x, y, w, h, r, color } (Raster-px; color als CSS-Farbe oder var(--…)). Standard-Ease: E.inOut.
   * Gibt { x, y, w, h, r, color, u, vx, vy } zurück (vx, vy = Geschwindigkeit der Mitte in px/s für die Unschärfe).
   */
  MV.matchMorph = (from, to, t, t0, dur, ease = MV.E.inOut) => {
    const at = (tt) => ease(clamp((tt - t0) / dur));
    const u = at(t);
    const L = (a, b, uu = u) => (a === undefined ? b : b === undefined ? a : a + (b - a) * uu);
    const cx = (uu) => L(from.x, to.x, uu) + L(from.w, to.w, uu) / 2;
    const cy = (uu) => L(from.y, to.y, uu) + L(from.h, to.h, uu) / 2;
    const vx = MV.vel((tt) => cx(at(tt)), t), vy = MV.vel((tt) => cy(at(tt)), t);
    const color = from.color && to.color ? "color-mix(in srgb, " + to.color + " " + (u * 100).toFixed(2) + "%, " + from.color + ")" : to.color || from.color;
    return { x: L(from.x, to.x), y: L(from.y, to.y), w: L(from.w, to.w), h: L(from.h, to.h), r: L(from.r, to.r), color, u, vx, vy };
  };

  // ---------- Bogenbahn ----------
  /** Quadratische Bézier von p0 nach p1, Kontrollpunkt = Mitte, um lift senkrecht versetzt (lift < 0 = nach oben). */
  MV.arc = (p0, p1, lift, u) => {
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2 + lift;
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return [a * p0[0] + b * mx + c * p1[0], a * p0[1] + b * my + c * p1[1]];
  };

  // ---------- Gemessene Kurven (Zeit relativ zum Einsatz, Wert 0..1 bzw. px) ----------
  // In der Probe durch Messungen an der eigenen Referenz ersetzen (MV.CURVES.pop = [[t, wert], …]).
  MV.CURVES = {
    /** Einstieg 0,267 s ohne Überschwinger */
    pop: [[0, 0], [0.033, 0.114], [0.067, 0.557], [0.1, 0.772], [0.133, 0.882], [0.167, 0.943], [0.2, 0.978], [0.233, 0.996], [0.267, 1]],
    /** Linie zeichnen 0,567 s, Spitze bei ca. 47 % */
    draw: [[0, 0], [0.033, 0.0045], [0.067, 0.0134], [0.1, 0.0268], [0.133, 0.0513], [0.167, 0.0848], [0.2, 0.1317], [0.233, 0.2076], [0.267, 0.3438], [0.3, 0.5781], [0.333, 0.7701], [0.367, 0.8638], [0.4, 0.9196], [0.433, 0.9531], [0.467, 0.9732], [0.5, 0.9866], [0.533, 0.9955], [0.567, 1]],
    /** Überschwinger am Linienende (px bei Raster 1280 breit) */
    over: [[0, -36], [0.067, -37], [0.1, -35], [0.133, -30], [0.167, -27], [0.2, -19], [0.233, -2], [0.267, 20], [0.3, 14], [0.333, 5], [0.367, 2], [0.4, 1], [0.433, 0]],
    /** Wachsen vom Linienende */
    grow: [[0, 0.014], [0.033, 0.123], [0.067, 0.459], [0.1, 0.705], [0.133, 0.822], [0.167, 0.897], [0.2, 0.938], [0.233, 0.966], [0.267, 0.986], [0.3, 1]],
  };
  MV.CHAIN_CURVES = MV.CURVES;

  /**
   * Pop-Einstieg eines Elements (Skalierung aus der gemessenen Kurve, Start-Unschärfe 6 -> 0 in 0,2 s).
   * Gibt { s, o, blur } zurück; mit el wird direkt gesetzt (transform-origin bleibt beim Aufrufer).
   */
  MV.pop = (t, t0, el = null, { blur = 6 } = {}) => {
    const T = t - t0;
    const s = MV.table(MV.CURVES.pop, T);
    const o = T >= 0 ? 1 : 0;
    const b = T >= 0 && T < 0.2 ? blur * (1 - s) * r() * 1.5 : 0;
    if (el) {
      el.style.opacity = o;
      el.style.transform = "scale(" + Math.max(0.001, s).toFixed(4) + ")";
      el.style.filter = b > 0.15 ? "blur(" + b.toFixed(2) + "px)" : "none";
    }
    return { s, o, blur: b };
  };

  // ---------- Icon-Kette ----------
  /** Maße (Raster-px bei Raster 1280 breit; werden auf MV.config.ref.w skaliert) und Zeiten (s). Farben als CSS-Variablen. */
  MV.CHAIN = {
    tile: 228, glyph: 146, node: 60, gap: 16, lineW: 5,
    ink: "var(--mv-ink)", bg: "var(--mv-bg)", blue: "var(--mv-accent)",
    lineAt: 0.333, seg: 0.9, popAt: 0.6, nodeAt: 0.75, pulseAt: 0.9, pulseDur: 0.35, stagger: 0.05, speed: 1,
  };
  const SIZE_KEYS = ["tile", "glyph", "node", "gap", "lineW"];
  const CH_W = (inner, vb = "0 0 24 24", sw = 2.2) =>
    `<svg viewBox="${vb}" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="display:block;overflow:visible">${inner}</svg>`;
  /** Glyphen (Outline, Farbe über currentColor, Füllung = Hintergrund). Eigene: MV.CHAIN_ICONS.name = () => "<svg…>". */
  MV.CHAIN_ICONS = {
    lock: () => `<svg viewBox="0 0 60 78" width="100%" height="100%" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="display:block;overflow:visible"><rect x="-6" y="30" width="72" height="48" fill="var(--mv-ch-bg)" stroke="none" /><path d="M17 37 V25 A13 13 0 0 1 43 25 V37" stroke-width="7" /><rect x="7.5" y="35.5" width="45" height="37" rx="10" fill="var(--mv-ch-bg)" stroke-width="7" /><rect x="27" y="47" width="6" height="13" rx="3" fill="currentColor" stroke="none" /></svg>`,
    cloud: () => `<svg viewBox="7 9 136 89" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" style="display:block;overflow:visible"><path d="M38 94 L110 94 A27 27 0 0 0 114 40 A42 42 0 0 0 34 44 A25 25 0 0 0 38 94 Z" fill="var(--mv-ch-bg)" /></svg>`,
    check: () => CH_W('<circle cx="12" cy="12" r="10" fill="var(--mv-ch-bg)" /><path d="M7 12.5l3.4 3.4L17.2 8.6" />'),
    sync: () => CH_W('<circle cx="12" cy="12" r="10.5" fill="var(--mv-ch-bg)" stroke="none" /><path d="M19.2 10.2A7.4 7.4 0 0 0 6.1 7.4" /><path d="M4.8 13.8a7.4 7.4 0 0 0 13.1 2.8" /><path d="M5.6 3.9v3.8h3.8" /><path d="M18.4 20.1v-3.8h-3.8" />'),
    star: () => CH_W('<circle cx="12" cy="12" r="10.5" fill="var(--mv-ch-bg)" stroke="none" /><path d="M12 3.6l2.5 5.2 5.6.7-4.1 3.9 1 5.5L12 16.2l-5 2.7 1-5.5-4.1-3.9 5.6-.7z" />'),
    globe: () => CH_W('<circle cx="12" cy="12" r="9" fill="var(--mv-ch-bg)" /><path d="M3 12h18" /><path d="M12 3c2.6 2.6 3.6 5.6 3.6 9s-1 6.4-3.6 9c-2.6-2.6-3.6-5.6-3.6-9s1-6.4 3.6-9z" />'),
    phone: () => CH_W('<rect x="6.5" y="2" width="11" height="20" rx="2.6" fill="var(--mv-ch-bg)" /><path d="M10.6 18.5h2.8" />'),
    laptop: () => CH_W('<rect x="4" y="4.5" width="16" height="11.5" rx="1.6" fill="var(--mv-ch-bg)" /><path d="M1.8 19.5h20.4" />'),
    note: () => CH_W('<rect x="5" y="2.5" width="14" height="19" rx="2.6" fill="var(--mv-ch-bg)" /><path d="M8.6 8h6.8M8.6 12h6.8M8.6 16h4" />'),
    swatch: (c = ["#E1D5C8", "#000000", "#FFFFFF"]) => CH_W(`<rect x="0.5" y="6.5" width="23" height="11" rx="5.5" fill="var(--mv-ch-bg)" stroke="none" />${c.map((f, i) => `<circle cx="${5.5 + 6.5 * i}" cy="12" r="3.6" fill="${f}" stroke-width="1.3" />`).join("")}`),
  };
  const chOpt = (spec) => {
    const s = MV.config.ref.w / 1280;
    const base = Object.assign({}, MV.CHAIN);
    SIZE_KEYS.forEach((key) => (base[key] = MV.CHAIN[key] * s));
    return Object.assign(base, spec || {});
  };
  const stopSize = (st, o) => {
    if (st.tile !== undefined) { const s = st.size || o.tile; return { w: s, h: s }; }
    if (st.fan) { const s = st.size || o.tile * 0.88; const sp = st.spread !== undefined ? st.spread : s * 0.42; return { w: s + 2 * sp, h: s, s, sp }; }
    if (st.glyph === "cloud") { const s = st.size || o.glyph; return { w: s, h: (s * 89) / 136 }; }
    const s = st.size || o.glyph; return { w: s, h: s };
  };
  const chLayout = (spec) => {
    const o = chOpt(spec);
    const cx = o.cx !== undefined ? o.cx : MV.config.ref.w / 2;
    const cy = o.cy !== undefined ? o.cy : MV.zone().graphicCenter;
    const items = o.items;
    const stops = [], links = [];
    let total = 0;
    items.forEach((it, i) => {
      if (i % 2 === 0) total += it.branch ? Math.max(...it.branch.map((b) => stopSize(b, o).w)) : stopSize(it, o).w;
      else total += 2 * o.gap + (it.line || 120);
    });
    let x = cx - total / 2 + (o.shift || 0);
    items.forEach((it, i) => {
      if (i % 2 === 0) {
        if (it.branch) {
          const sp = it.spread || 150, n = it.branch.length;
          const prev = links[links.length - 1];
          it.branch.forEach((b, j) => {
            const z = stopSize(b, o);
            const by = cy + (j - (n - 1) / 2) * sp;
            stops.push(Object.assign({ x, y: by - z.h / 2, cyy: by }, z, { def: b }));
          });
          if (prev) prev.branch = it.branch.map((_, j) => cy + (j - (n - 1) / 2) * sp);
        } else {
          const z = stopSize(it, o);
          stops.push(Object.assign({ x, y: cy - z.h / 2, cyy: cy }, z, { def: it }));
          x += z.w;
        }
      } else {
        const L = it.line || 120;
        links.push({ x1: x + o.gap, x2: x + o.gap + L, y: cy, node: it.node || null, nodeSize: it.nodeSize, at: it.at !== undefined ? it.at : 0.5 });
        x += 2 * o.gap + L;
      }
    });
    return { o, cx, cy, stops, links };
  };
  /** Bildrechteck des ersten Halts zum Einsatz (für den Match-Cut in eine Kette mit slide). */
  MV.chainStart = (spec) => {
    const L = chLayout(spec), s0 = L.stops[0];
    const x = spec.slide ? L.cx - s0.w / 2 : s0.x;
    return { x, y: s0.y, w: s0.w, h: s0.h };
  };
  const tileHTML = (d) => {
    const t = d.tile;
    if (t && t.svg) return t.svg;
    if (t && t.img) return `<img src="${t.img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--mv-r-tile);display:block" />`;
    if (t && t.label !== undefined) return `<div style="width:100%;height:100%;border-radius:var(--mv-r-tile);background:${t.bg || "var(--mv-ink)"};color:${t.fg || "#ffffff"};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:${(d.size || 100) * 0.42}px">${esc(t.label)}</div>`;
    MV.warn("Kachel ohne svg, img oder label");
    return "";
  };
  /**
   * HTML der Kette. spec = {
   *   id (Pflicht, Präfix aller ids), cx (Standard Bildmitte), cy (Standard MV.zone().graphicCenter), shift (optischer Ausgleich, px),
   *   items: [Halt, Linie, Halt, Linie, …]
   *     Halt  = { tile: { svg } | { img } | { label, bg, fg }, size } | { glyph: "cloud"|"phone"|…, size } | { fan: [src, src, src], size, spread }
   *             | nur am Ende: { branch: [Halt, …], spread: 150 }  (Verzweigung 1 -> n)
   *     Linie = { line: Länge px, node: "lock"|"check"|"sync"|…, nodeSize, at: 0.5 }
   *   first: "pop" (erster Halt poppt) | "da" (erster Halt steht schon, z. B. nach einem Match-Cut),
   *   slide: false (erster Halt startet in der Bildmitte und gleitet beim Zeichnen der ersten Linie an seinen Platz),
   *   pulse: false (Lichtimpuls über jede Linie nach dem Zeichnen), swatch: [3 Farben],
   *   Maße und Zeiten wie MV.CHAIN }
   */
  MV.chainHTML = (spec) => {
    const L = chLayout(spec), o = L.o, id = o.id;
    const W = MV.config.ref.w, H = MV.config.ref.h;
    let h = `<div class="mv-chain" id="${id}" data-layout-allow-overlap data-layout-allow-overflow style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;--mv-ch-bg:${o.bg};color:${o.ink}">`;
    L.links.forEach((ln, i) => {
      const paths = ln.branch
        ? ln.branch.map((y2, j) => `<path id="${id}-p${i}-${j}" d="M${ln.x1} ${ln.y} L${ln.x2} ${y2}" pathLength="1" stroke-dasharray="0 1" />`).join("")
        : `<line id="${id}-l${i}" x1="${ln.x1}" y1="${ln.y}" x2="${ln.x1}" y2="${ln.y}" />`;
      h += `<svg id="${id}-s${i}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible;visibility:hidden" fill="none" stroke="${o.ink}" stroke-width="${o.lineW}" stroke-linecap="round">${paths}<circle id="${id}-q${i}" r="${(o.lineW * 1.3).toFixed(2)}" cx="${ln.x1}" cy="${ln.y}" fill="${o.blue}" stroke="none" style="opacity:0;filter:drop-shadow(0 0 ${(o.lineW * 1.2).toFixed(1)}px ${o.blue})" /></svg>`;
    });
    L.stops.forEach((st, k) => {
      const d = st.def;
      let inner;
      if (d.tile !== undefined) inner = tileHTML(Object.assign({ size: st.w }, d));
      else if (d.fan) inner = d.fan.map((src, j) => `<div id="${id}-f${k}-${j}" style="position:absolute;left:${st.sp}px;top:0;width:${st.s}px;height:${st.s}px;border-radius:var(--mv-r-card);overflow:hidden;box-shadow:var(--mv-shadow-card);z-index:${j === 0 ? 3 : 3 - j}"><img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" /></div>`).join("");
      else inner = (MV.CHAIN_ICONS[d.glyph] || MV.CHAIN_ICONS.check)(o.swatch);
      h += `<div id="${id}-t${k}" style="position:absolute;left:${st.x.toFixed(2)}px;top:${st.y.toFixed(2)}px;width:${st.w.toFixed(2)}px;height:${st.h.toFixed(2)}px;opacity:0">${inner}</div>`;
    });
    L.links.forEach((ln, i) => {
      if (!ln.node) return;
      const ns = ln.nodeSize || o.node;
      const nh = ln.node === "lock" ? (ns * 78) / 60 : ns;
      const nx = ln.x1 + (ln.x2 - ln.x1) * ln.at;
      const ny = ln.node === "lock" ? ln.y - nh * 0.69 : ln.y - nh / 2;
      h += `<div id="${id}-n${i}" style="position:absolute;left:${(nx - ns / 2).toFixed(2)}px;top:${ny.toFixed(2)}px;width:${ns}px;height:${nh.toFixed(2)}px;transform-origin:50% 70%;opacity:0">${(MV.CHAIN_ICONS[ln.node] || MV.CHAIN_ICONS.check)(o.swatch)}</div>`;
    });
    return h + `</div>`;
  };
  /** Zeitpunkte der Kette relativ zum Einsatz (für chain() und chainEvents()). */
  const chTimes = (L) => {
    const o = L.o, out = [];
    let stopIdx = 1;
    if (o.first !== "da") out.push({ k: "halt", n: 0, at: 0 });
    L.links.forEach((ln, i) => {
      const Ls = o.lineAt + i * o.seg;
      out.push({ k: "linie", n: i, at: Ls });
      if (ln.node) out.push({ k: "knoten", n: i, at: Ls + o.nodeAt });
      if (o.pulse && !ln.branch) out.push({ k: "puls", n: i, at: Ls + o.pulseAt });
      const n = ln.branch ? ln.branch.length : 1;
      for (let j = 0; j < n; j++) out.push({ k: "halt", n: stopIdx++, at: Ls + o.popAt + j * o.stagger });
    });
    return out;
  };
  /** Ereignisse der Kette mit Einsatz t0 in die Ereignisliste (ids: <id>-halt<n>, -linie<n>, -knoten<n>, -puls<n>; Halte als Typ pop).
   *  spec.beat setzt den Beat-Namen (sonst der von MV.events.setBeat). Gibt die Liste zurück. */
  MV.chainEvents = (spec, t0) => {
    const L = chLayout(spec), sp = L.o.speed || 1;
    return chTimes(L).map((e) => MV.events.add({ id: spec.id + "-" + e.k + e.n, typ: e.k === "halt" ? "pop" : e.k, t: t0 + e.at / sp, ...(spec.beat ? { beat: spec.beat } : {}) }));
  };
  const chCache = new WeakMap();
  const blurS = (px) => (px > 0.15 ? "blur(" + px.toFixed(2) + "px)" : "");
  const joinF = (...f) => f.filter(Boolean).join(" ") || "none";
  /** Kette zur Zeit t rendern (t0 = Einsatz). Gibt { done, end } zurück (end = Ende des Aufbaus in Filmzeit). */
  MV.chain = (el, t, t0, spec) => {
    let c = chCache.get(el);
    if (!c) {
      const L = chLayout(spec), id = L.o.id;
      c = {
        L,
        stops: L.stops.map((st, k) => ({ el: el.querySelector("#" + id + "-t" + k), fans: st.def.fan ? st.def.fan.map((_, j) => el.querySelector("#" + id + "-f" + k + "-" + j)) : null })),
        links: L.links.map((ln, i) => ({ svg: el.querySelector("#" + id + "-s" + i), line: el.querySelector("#" + id + "-l" + i), paths: ln.branch ? ln.branch.map((_, k) => el.querySelector("#" + id + "-p" + i + "-" + k)) : null, q: el.querySelector("#" + id + "-q" + i), node: el.querySelector("#" + id + "-n" + i) })),
      };
      c.mb0 = MV.cam.blurFilter(id + "-mb0");
      c.mbl = L.links.map((_, i) => MV.cam.blurFilter(id + "-mbl" + i));
      chCache.set(el, c);
    }
    const { L } = c, o = L.o;
    const sp = o.speed || 1;
    const T = (t - t0) * sp;
    const fps = MV.config.fps;
    const sdx = (v, max = 3) => Math.min(max, (Math.abs(v) / fps) * MV.cam.BLUR.element.factor);
    el.style.visibility = T >= 0 ? "inherit" : "hidden";
    const slide = !!o.slide && L.links.length > 0;
    const s0 = L.stops[0];
    const kOver = MV.config.ref.w / 1280;
    const slideDx = (tt) => (slide ? (L.cx - (s0.x + s0.w / 2)) * (1 - MV.table(MV.CURVES.draw, tt - o.lineAt)) : 0);
    // erster Halt: Pop (oder steht schon) und Gleiten mit Unschärfe in Bewegungsrichtung
    const p0 = o.first === "da" ? 1 : MV.table(MV.CURVES.pop, T);
    const dx0 = slideDx(T);
    const v0 = MV.vel(slideDx, T) * sp;
    const S0 = c.stops[0];
    S0.el.style.opacity = T >= 0 ? 1 : 0;
    S0.el.style.transformOrigin = "50% 50%";
    S0.el.style.transform = "translateX(" + dx0.toFixed(2) + "px) scale(" + p0 + ")";
    const b0 = sdx(v0, 12);
    c.mb0.fe.setAttribute("stdDeviation", b0.toFixed(2) + " 0");
    S0.el.style.filter = joinF(o.first !== "da" && T < 0.2 ? blurS(6 * r() * 1.5 * (1 - p0)) : "", b0 > 0.15 ? "url(#" + c.mb0.id + ")" : "");
    let end = 0;
    let stopIdx = 1;
    L.links.forEach((ln, i) => {
      const Cl = c.links[i];
      const Ls = o.lineAt + i * o.seg;
      Cl.svg.style.visibility = T >= Ls ? "inherit" : "hidden";
      let v = 0;
      if (ln.branch) {
        ln.branch.forEach((_, k) => {
          const u = MV.table(MV.CURVES.draw, T - Ls - k * o.stagger);
          Cl.paths[k].setAttribute("stroke-dasharray", u.toFixed(4) + " 1");
        });
      } else if (slide && i === 0) {
        const x1 = s0.x + s0.w + dx0 + o.gap;
        const x2 = Math.max(x1 + 10, ln.x2 + MV.table(MV.CURVES.over, T - Ls) * kOver);
        Cl.line.setAttribute("x1", x1.toFixed(2));
        Cl.line.setAttribute("x2", x2.toFixed(2));
        v = v0;
      } else {
        const f = (tt) => MV.table(MV.CURVES.draw, tt - Ls) * (ln.x2 - ln.x1);
        Cl.line.setAttribute("x2", (ln.x1 + f(T)).toFixed(2));
        v = MV.vel(f, T) * sp;
      }
      const bl = sdx(v);
      c.mbl[i].fe.setAttribute("stdDeviation", bl.toFixed(2) + " 0");
      Cl.svg.style.filter = bl > 0.15 ? "url(#" + c.mbl[i].id + ")" : "none";
      // Knoten: Pop 0,1 s, dann Akzentfarbe 0,05 s später über 0,1 s
      if (Cl.node) {
        const k0 = Ls + o.nodeAt;
        const u = clamp((T - k0) / 0.1);
        const e = 1 - (1 - u) * (1 - u);
        Cl.node.style.opacity = u > 0 ? 1 : 0;
        Cl.node.style.transform = "scale(" + (0.3 + 0.7 * e).toFixed(4) + ")";
        Cl.node.style.filter = joinF(blurS(2.5 * r() * 1.5 * (1 - e)));
        Cl.node.style.color = "color-mix(in srgb, " + o.blue + " " + (clamp((T - k0 - 0.05) / 0.1) * 100).toFixed(1) + "%, " + o.ink + ")";
        end = Math.max(end, k0 + 0.15);
      }
      // Lichtimpuls
      if (o.pulse && !ln.branch) {
        const q = (T - (Ls + o.pulseAt)) / o.pulseDur;
        const on = q > 0 && q < 1;
        Cl.q.style.opacity = on ? Math.sin(Math.PI * q).toFixed(3) : 0;
        if (on) Cl.q.setAttribute("cx", (ln.x1 + (ln.x2 - ln.x1) * MV.E.inOut(q)).toFixed(2));
        end = Math.max(end, Ls + o.pulseAt + o.pulseDur);
      }
      // folgende Halte wachsen vom Linienende
      const n = ln.branch ? ln.branch.length : 1;
      for (let k = 0; k < n; k++) {
        const S = c.stops[stopIdx], st = L.stops[stopIdx];
        stopIdx++;
        if (!S) continue;
        const a = Ls + o.popAt + k * o.stagger;
        const g = MV.table(MV.CURVES.grow, T - a);
        if (st.def.fan) {
          S.el.style.opacity = T >= a ? 1 : 0;
          const fu = MV.E.out(clamp((T - a) / 0.35));
          const rot = st.def.rot !== undefined ? st.def.rot : 8;
          S.fans.forEach((f, j) => {
            const gj = MV.table(MV.CURVES.grow, T - a - j * o.stagger * 0.8);
            const dir = j === 0 ? 0 : j === 1 ? -1 : 1;
            f.style.opacity = T >= a + j * o.stagger * 0.8 ? clamp(gj * 3) : 0;
            f.style.transformOrigin = "50% 60%";
            f.style.transform = "translateX(" + (dir * st.sp * fu).toFixed(2) + "px) rotate(" + (dir * rot * fu).toFixed(2) + "deg) scale(" + (0.6 + 0.4 * gj).toFixed(4) + ")";
            f.style.filter = joinF(T - a < 0.2 ? blurS(3 * (1 - gj)) : "");
          });
          end = Math.max(end, a + 0.35 + 2 * o.stagger * 0.8);
        } else {
          S.el.style.opacity = T >= a ? 1 : 0;
          S.el.style.transformOrigin = "0 50%";
          S.el.style.transform = "scale(" + Math.max(0.001, g).toFixed(4) + ")";
          S.el.style.filter = joinF(T - a < 0.2 ? blurS(3 * (1 - g)) : "");
          end = Math.max(end, a + 0.3);
        }
      }
    });
    return { done: T >= end, end: t0 + end / sp };
  };

  // ---------- Flaggen ----------
  /**
   * Inline-SVG-Flagge (kein Emoji). code: "DE" | "EN"/"UK"/"GB" (Union Jack) | "FR" | "ES" (ohne Wappen) | "NL".
   * opts: { w (Standard 24), h (Standard w · 2/3), r: 2.5, style }. Innerer Rand, damit Weiß auf Weiß sichtbar bleibt.
   * Ausrichtung auf die Versalhöhe: h ≈ 0,73 × Schriftgröße, vertical-align: baseline. Unbekannter Code -> "".
   */
  let flagN = 0;
  MV.flagSVG = (code, opts = {}) => {
    const cc = String(code || "").toUpperCase();
    const w = opts.w !== undefined ? opts.w : opts.h !== undefined ? (opts.h * 3) / 2 : 24;
    const h = opts.h !== undefined ? opts.h : (w * 2) / 3;
    const rr = opts.r !== undefined ? opts.r : 2.5;
    const style = opts.style || "";
    const id = "mvflag" + ++flagN;
    const hz = (cols) => cols.map((f, i) => `<rect x="0" y="${((h * i) / cols.length).toFixed(3)}" width="${w}" height="${(h / cols.length + 0.01).toFixed(3)}" fill="${f}"/>`).join("");
    const vt = (cols) => cols.map((f, i) => `<rect x="${((w * i) / cols.length).toFixed(3)}" y="0" width="${(w / cols.length + 0.01).toFixed(3)}" height="${h}" fill="${f}"/>`).join("");
    let body;
    if (cc === "DE") body = hz(["#000000", "#DD0000", "#FFCE00"]);
    else if (cc === "FR") body = vt(["#0055A4", "#FFFFFF", "#EF4135"]);
    else if (cc === "NL") body = hz(["#AE1C28", "#FFFFFF", "#21468B"]);
    else if (cc === "ES") body = `<rect width="${w}" height="${h}" fill="#AA151B"/><rect y="${(h / 4).toFixed(3)}" width="${w}" height="${(h / 2).toFixed(3)}" fill="#F1BF00"/>`;
    else if (cc === "EN" || cc === "UK" || cc === "GB")
      body = `<svg x="0" y="0" width="${w}" height="${h}" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice"><clipPath id="${id}t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#${id}t)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></svg>`;
    else return "";
    return `<svg class="mv-flag" data-layout-allow-overlap width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:inline-block;vertical-align:baseline;overflow:hidden;${style}"><clipPath id="${id}"><rect width="${w}" height="${h}" rx="${rr}"/></clipPath><g clip-path="url(#${id})">${body}</g><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${Math.max(0, rr - 0.5)}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/></svg>`;
  };
})(typeof window !== "undefined" ? window : globalThis);
