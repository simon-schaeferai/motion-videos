/* motion-videos · lib/camera.js (MIT) · braucht lib/core.js
   Kamera-Grammatik als MV.cam. Jede Einstellung hat dieselbe Hülle:
     1. Einstieg: exponentieller Settle (tau 0,08 bis 0,13 s),
     2. Körper: linearer Drift (Zoom >= 2 %/s oder Verschiebung >= 3 % Bildhöhe/s, nie auf null abbremsen),
     3. Ausstieg: Potenzkurve (Exponent 2,3 bis 3) über 0,3 bis 0,47 s in den Schnitt, Schnitt im Maximum.
   "Kamerafahrten" sind Sprungschnitte zwischen Punch-Stufen plus Drift, keine weichen Fahrten.
   Unschärfe nur aus Geschwindigkeit und nur in Bewegungsrichtung (SVG-Filter, zwei Achsen); nie CSS-blur() an bewegten Objekten.
   Alle Koordinaten in Raster-px (MV.config.ref), Zeit in Sekunden Filmzeit. Doku: lib/API.md */
(function (root) {
  "use strict";
  const MV = root.MV;
  if (!MV || !MV.__core) throw new Error("lib/camera.js: zuerst lib/core.js laden");
  const C = (MV.cam = MV.cam || {});
  const clamp = MV.clamp;

  /**
   * Einstellungs-Hülle als Wert (Skalierung, Versatz, Winkel …) mit Geschwindigkeit.
   * v(t) = from + rise·(1 − e^(−(t−t0)/tau)) + drift·(t−t0) + exit·max(0, (t − (t1 − exitDur)) / exitDur)^pow
   * opts: { t0, t1 (Schnitt), from = 0, rise = 0, tau = 0.1, drift = 0, exit = 0, exitDur = 0.4, pow = 2.5 }
   * Gibt { v, vel } zurück (vel = Ableitung pro Sekunde, für Unschärfe).
   */
  C.hull = (t, { t0 = 0, t1 = Infinity, from = 0, rise = 0, tau = 0.1, drift = 0, exit = 0, exitDur = 0.4, pow = 2.5 } = {}) => {
    const k = Math.max(0, t - t0);
    const a0 = t1 - exitDur;
    const x = Math.max(0, (t - a0) / exitDur);
    const ex = Math.exp(-k / tau);
    const v = from + rise * (1 - ex) + drift * k + (exit && x > 0 ? exit * Math.pow(x, pow) : 0);
    const vel = (t >= t0 ? (rise / tau) * ex + drift : 0) + (exit && x > 0 ? (exit * pow * Math.pow(x, pow - 1)) / exitDur : 0);
    return { v, vel };
  };

  /**
   * Zoom einer Einstellung (Skalierung). rate = Drift in Anteil pro Sekunde (0,03 = 3 %/s).
   * opts: { t0, t1, base = 1, settle = 0 (Startsprung, z. B. -0.02), tau = 0.1, rate = 0.03, exit = 0 (Zusatzzoom in den Schnitt), exitDur = 0.4, pow = 2.5 }
   * settle < 0: die Einstellung startet um |settle| kleiner und setzt sich auf base (Einstieg).
   */
  C.zoom = (t, { t0 = 0, t1 = Infinity, base = 1, settle = 0, tau = 0.1, rate = 0.03, exit = 0, exitDur = 0.4, pow = 2.5 } = {}) =>
    C.hull(t, { t0, t1, from: base + settle, rise: -settle, tau, drift: base * rate, exit, exitDur, pow });

  /** Skalierung um den Ursprung (ox, oy) plus Versatz (dx, dy) auf eine Ebene (.mv-layer). */
  C.apply = (el, sc, ox, oy, dx = 0, dy = 0) => {
    el.style.transform = "translate(" + ((1 - sc) * ox + dx).toFixed(3) + "px," + ((1 - sc) * oy + dy).toFixed(3) + "px) scale(" + sc.toFixed(5) + ")";
  };
  /** Direktes Setzen (für harte Punch-Sprünge): Bildpunkt = Weltpunkt · sc + (tx, ty). */
  C.set = (el, sc, tx, ty) => {
    el.style.transform = "translate(" + tx.toFixed(3) + "px," + ty.toFixed(3) + "px) scale(" + sc.toFixed(5) + ")";
  };
  /** Punch auf Stufe sc so, dass der Weltpunkt (wx, wy) auf dem Bildpunkt (sx, sy) landet. */
  C.punchTo = (el, sc, wx, wy, sx, sy) => C.set(el, sc, sx - wx * sc, sy - wy * sc);
  /** Bildposition eines Weltpunkts unter C.apply(el, sc, ox, oy, dx, dy). */
  C.toScreen = (wx, wy, sc, ox, oy, dx = 0, dy = 0) => [(1 - sc) * ox + dx + wx * sc, (1 - sc) * oy + dy + wy * sc];

  /** Abklingen nach einem Schnitt (doppelt exponentiell): Versatz in px, der gegen 0 läuft. */
  C.settle = (t, t0, a = 34, tauA = 0.1, b = 22, tauB = 0.3) => (t < t0 ? a + b : a * Math.exp(-(t - t0) / tauA) + b * Math.exp(-(t - t0) / tauB));
  /** Anlauf vor einem Schnitt (Potenzkurve): Versatz 0 -> -dist zwischen t0 und t0 + dur. */
  C.lead = (t, t0, dur, dist, pow = 2.5) => -dist * Math.pow(Math.max(0, (t - t0) / dur), pow);

  // ---------- Unschärfe aus Geschwindigkeit (zwei Achsen, SVG-Filter) ----------
  /** Voreinstellungen: Elemente Faktor 0,15 (Kantenbreite ≈ 0,3 × Weg pro Frame), Whips 0,35 ab 250 Raster-px/s. */
  C.BLUR = { element: { factor: 0.15, threshold: 0 }, whip: { factor: 0.35, threshold: 250 } };
  /**
   * Legt im geteilten Sprite einen Unschärfe-Filter an und gibt { id, fe } zurück.
   * region großzügig (Unschärfe darf nicht abgeschnitten werden).
   */
  C.blurFilter = (id, region = { x: "-20%", y: "-20%", w: "140%", h: "140%" }) => {
    const svg = MV.sprite();
    let f = svg.querySelector("#" + id);
    if (!f) {
      const defs = svg.querySelector("defs");
      f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      f.setAttribute("id", id);
      f.setAttribute("x", region.x);
      f.setAttribute("y", region.y);
      f.setAttribute("width", region.w);
      f.setAttribute("height", region.h);
      f.setAttribute("color-interpolation-filters", "sRGB");
      const g = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
      g.setAttribute("stdDeviation", "0 0");
      f.appendChild(g);
      defs.appendChild(f);
    }
    return { id, fe: f.querySelector("feGaussianBlur") };
  };
  /** Kurzform: Filter anlegen und an ein Element binden. Gibt das Ziel für C.motionBlur zurück. */
  C.blur = (el, id) => Object.assign(C.blurFilter(id), { el });
  /**
   * Unschärfe aus Geschwindigkeit (vx, vy in Raster-px pro Sekunde, Bildschirmrichtung).
   * stdDev je Achse = max(0, |v| − threshold) / fps · factor. Nur die bewegte Achse wird unscharf.
   * target = Rückgabe von C.blur(el, id). Unter min wird der Filter ausgeschaltet (scharfes Bild, kein Filter-Overhead).
   * opts: { factor = 0.15, threshold = 0, min = 0.15, max = 40 } oder ein Preset aus C.BLUR.
   * Gibt { sx, sy } zurück.
   */
  C.motionBlur = (target, vx, vy, { factor = 0.15, threshold = 0, min = 0.15, max = 40 } = {}) => {
    const fps = MV.config.fps;
    const sd = (v) => Math.min(max, (Math.max(0, Math.abs(v) - threshold) / fps) * factor);
    const sx = sd(vx || 0), sy = sd(vy || 0);
    target.fe.setAttribute("stdDeviation", sx.toFixed(2) + " " + sy.toFixed(2));
    if (target.el) target.el.style.filter = sx > min || sy > min ? "url(#" + target.id + ")" : "none";
    return { sx, sy };
  };
})(typeof window !== "undefined" ? window : globalThis);
