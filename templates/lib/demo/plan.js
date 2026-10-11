/* Demo „Nordlicht Notes“ (fiktive Notiz-App) · Zeitplan = einzige Zeitquelle.
   DOM-frei: läuft im Browser (index.html) und in Node (tools/ereignisse.mjs exportiert daraus ereignisse.json).
   Alle Zeiten kommen aus dem Taktraster (MV.beat, MV.sixteenth) oder aus Regeln (MV.sayTimes), nie von Hand.

   Ablauf (10 s, 120 BPM, Raster 1280 × 720 -> 1920 × 1080):
     A 0,0 bis 2,5 s   Aussage H mit Wort-Reveal und Verlauf, Kamera-Drift, Whip nach links
     B 2,5 bis 5,5 s   Whip rein, Notiz-Karte, Aussage in der Lesezone, Karte morpht zur App-Kachel
     C 5,5 bis 10,0 s  Match-Cut auf die Kachel, Icon-Kette (Gleiten, Linien, Knoten, Verzweigung), Aussage, Drift bis zum Ende */
(function (root) {
  "use strict";
  const MV = root.MV;
  MV.configure({ fps: 30, bpm: 120, anchor: 0, ref: { w: 1280, h: 720 }, out: { w: 1920, h: 1080 } });
  MV.events.clear();

  const P = {};
  P.DUR = MV.beat(20); // 10,0 s
  P.CUT_AB = MV.beat(5); // Whip
  P.CUT_BC = MV.beat(11); // Match-Cut
  const Z = MV.zone();

  // ---------- A: Aussage ohne Grafik (Stufe H) ----------
  MV.events.setBeat("B1 Aussage"); // Beat-Name aus dem Blueprint, steht in jedem folgenden Ereignis (Bildtitel im Ein-Blick-Bogen)
  P.A = {
    say: { id: "a-say", text: "Ideen, sofort sortiert.", accent: "sortiert.", t0: MV.sixteenth(1) },
    zoom: { t0: 0, t1: P.CUT_AB, settle: -0.015, tau: 0.1, rate: 0.04 },
    origin: [640, 360],
  };
  // die Schrift geht mit dem Whip aus dem Bild (kein eigener Ausstieg)
  MV.sayEvents(P.A.say.id, P.A.say.text, P.A.say.t0, { until: P.CUT_AB });
  MV.events.add({ id: "schnitt-ab", typ: "schnitt", art: "whip", richtung: "links", t: P.CUT_AB });

  // ---------- B: Notiz-Karte, Aussage in der Lesezone ----------
  MV.events.setBeat("B2 Notiz");
  const cardW = 560, cardH = 232;
  P.B = {
    card: { x: 640 - cardW / 2, y: Z.graphicCenter - cardH / 2, w: cardW, h: cardH, r: 22 },
    say: { id: "b-say", text: "Alles an einem Ort.", accent: "einem Ort.", t0: MV.sixteenth(23) },
    zoom: { t0: P.CUT_AB, t1: P.CUT_BC, base: 1, settle: 0, rate: 0.03 },
    origin: [640, Z.graphicCenter],
  };
  // Ausstieg genau dann, wenn die Lesezeit erfüllt ist (nächste Sechzehntel)
  P.B.say.exit = { t: MV.sayTimes(P.B.say.text, P.B.say.t0).fruehesterAusstieg, dir: "up" };
  MV.sayEvents(P.B.say.id, P.B.say.text, P.B.say.t0, { exit: P.B.say.exit });
  // Morph spät und kurz, damit die Kachel am Schnitt nicht steht; die Kette gleitet ab dem Schnitt weiter (lineAt 0)
  P.B.morph = { t0: MV.sixteenth(41), dur: P.CUT_BC - MV.sixteenth(41) };
  MV.events.add({ id: "morph-bc", typ: "morph", t: P.B.morph.t0 });
  MV.events.add({ id: "schnitt-bc", typ: "schnitt", art: "match", t: P.CUT_BC });

  // ---------- C: Icon-Kette nach dem Match-Cut ----------
  MV.events.setBeat("B3 Sync");
  P.C = {
    chain: {
      id: "c-chain",
      first: "da", // die Kachel steht schon (Match-Cut), sie gleitet beim Zeichnen der ersten Linie an ihren Platz
      slide: true,
      lineAt: 0,
      pulse: true,
      items: [
        { tile: "app" }, // Markup setzt index.html (MV.chainHTML bekommt dort { svg })
        { line: 120, node: "sync" },
        { glyph: "cloud" },
        { line: 120 },
        { branch: [{ glyph: "laptop", size: 96 }, { glyph: "phone", size: 96 }], spread: 136 },
      ],
    },
    t0: P.CUT_BC,
    zoom: { t0: P.CUT_BC, t1: P.DUR, base: 1, settle: 0, rate: 0.025 },
    origin: [640, Z.graphicCenter],
  };
  const chainEv = MV.chainEvents(P.C.chain, P.C.t0);
  // Aussage erst, wenn die Kette steht (letzter Halt + 0,3 s Wachsen), Lesezeit bis zum Filmende
  const chainEnd = Math.max(...chainEv.map((e) => e.t)) + 0.3;
  P.C.say = { id: "c-say", text: "Auf jedem Gerät synchron.", accent: "synchron.", t0: MV.nextSixteenth(chainEnd - 0.05) };
  MV.sayEvents(P.C.say.id, P.C.say.text, P.C.say.t0, { until: P.DUR });
  MV.events.add({ id: "ende", typ: "ende", t: P.DUR });

  root.PLAN = P;
})(typeof window !== "undefined" ? window : globalThis);
