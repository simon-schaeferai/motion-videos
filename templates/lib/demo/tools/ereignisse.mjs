#!/usr/bin/env node
// Ereignisliste aus dem Code exportieren und Ein-Blick-Bogen bauen (motion-videos, MIT).
// Lädt lib/core.js, lib/camera.js, lib/motion.js und den Zeitplan (plan.js) ohne Browser und schreibt
// MV.events.toJSON() als ereignisse.json: {schema, fps, bpm, takt0, ereignisse: [...]} (Format: templates/ereignisse.vorlage.json).
// Die Zeiten kommen damit aus demselben Code wie das Bild; fps, BPM und Takt-Eins lesen qualitaet.py und ton_pruefen.py mit.
//
// Aufruf (im Projektordner, z. B. film/):
//   node tools/ereignisse.mjs [projekt] [--plan plan.js[,weitere.js]] [--out ereignisse.json]
//   node tools/ereignisse.mjs [projekt] --bogen <film.mp4> <bogen.png> [--spalten 3] [--breite 640]
// --bogen: je Aussage ein Standbild im ersten Frame „voll lesbar“ (lesbarAb), als Bogen (Ein-Blick-Test).
//   ffmpeg ist ein Medienjob: den Aufruf immer unter der Sperre starten,
//   bash <skill-dir>/scripts/sperre.sh <lauf> -- node tools/ereignisse.mjs . --bogen …
// Exit-Code 1, wenn eine Aussage die Lesezeit verfehlt oder ein Eintrag das Schema verletzt (Warnung [MV] in der Ausgabe).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const dir = path.resolve(positional[0] && fs.existsSync(positional[0]) && fs.statSync(positional[0]).isDirectory() ? positional[0] : ".");
const plans = opt("--plan", "plan.js").split(",").map((p) => p.trim()).filter(Boolean);
const bogenIdx = args.indexOf("--bogen");

// ---------- Zeitplan ohne Browser ausführen ----------
const warnings = [];
const ctx = { console: { log: console.log, error: console.error, warn: (m) => { warnings.push(String(m)); console.warn(m); } } };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["lib/core.js", "lib/camera.js", "lib/motion.js", ...plans]) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) {
    console.error("Fehlt: " + p + (f.startsWith("lib/") ? " (Bibliothek nach lib/ kopieren)" : ""));
    process.exit(2);
  }
  vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: p });
}
const MV = ctx.MV;
const list = MV.events.list();
const lesezeitFehler = list.filter((e) => typeof e.lesezeitIst === "number" && e.lesezeitIst < e.lesezeitSoll - 1e-6);
// Schema prüfen (Pflichtfelder, Typen, Aussagen mit Lesefenster, stille mit bis)
const schemaFehler = [];
list.forEach((e) => {
  if (!MV.EVENT_TYPES.includes(e.typ)) schemaFehler.push(`${e.id}: Typ „${e.typ}“ nicht im Schema`);
  if (e.typ === "aussage" && typeof e.lesbarAb !== "number") schemaFehler.push(`${e.id}: Aussage ohne lesbarAb (MV.sayEvents benutzen)`);
  if (e.typ === "stille" && typeof e.bis !== "number") schemaFehler.push(`${e.id}: stille ohne bis`);
});

if (bogenIdx < 0) {
  const out = path.resolve(dir, opt("--out", "ereignisse.json"));
  fs.writeFileSync(out, JSON.stringify(MV.events.toJSON(), null, 2) + "\n");
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad("t (s)", 9) + pad("Frame", 7) + pad("Typ", 10) + "id");
  list.forEach((e) => {
    const extra = typeof e.lesbarAb === "number" ? `  lesbar ${e.lesbarAb.toFixed(3)} s, ${e.lesezeitIst === null ? "bis Ende" : e.lesezeitIst.toFixed(2) + " s"} (Soll ${e.lesezeitSoll.toFixed(2)} s)` : "";
    console.log(pad(e.t.toFixed(3), 9) + pad(e.frame, 7) + pad(e.typ, 10) + e.id + extra);
  });
  console.log(`\n${list.length} Ereignisse -> ${out} (Schema ${MV.EVENT_SCHEMA}, ${MV.config.fps} fps, ${MV.config.bpm} BPM, Takt-Eins ${MV.config.anchor} s)`);
  if (schemaFehler.length) console.error("Schema: " + schemaFehler.join("; "));
  if (lesezeitFehler.length || schemaFehler.length) {
    if (!lesezeitFehler.length) process.exit(1);
    console.error(`${lesezeitFehler.length} Aussage(n) unter der Lesezeit: ${lesezeitFehler.map((e) => e.id).join(", ")}`);
    process.exit(1);
  }
  process.exit(0);
}

// ---------- Ein-Blick-Bogen ----------
const video = path.resolve(args[bogenIdx + 1] || "");
const png = path.resolve(args[bogenIdx + 2] || "");
if (!fs.existsSync(video) || !args[bogenIdx + 2]) {
  console.error("Aufruf: --bogen <film.mp4> <bogen.png>");
  process.exit(2);
}
const fps = MV.config.fps;
const says = list.filter((e) => (e.typ === "aussage" || e.typ === "hit") && e.text && typeof e.lesbarAb === "number");
if (!says.length) {
  console.error("Keine Aussagen in der Ereignisliste.");
  process.exit(1);
}
const frames = says.map((e) => Math.ceil(e.lesbarAb * fps - 1e-6));
const cols = Math.min(Number(opt("--spalten", 3)), frames.length);
const rows = Math.ceil(frames.length / cols);
const width = Number(opt("--breite", 640));
const select = frames.map((f) => `eq(n\\,${f})`).join("+");
const vf = `select='${select}',scale=${width}:-2,tile=${cols}x${rows}:padding=8:margin=8:color=0x202020`;
fs.mkdirSync(path.dirname(png), { recursive: true });
const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", video, "-vf", vf, "-frames:v", "1", "-fps_mode", "passthrough", png], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status || 1);
says.forEach((e, i) => console.log(`Bild ${i + 1}: Frame ${frames[i]} (${(frames[i] / fps).toFixed(3)} s)  ${e.beat ? e.beat + " · " : ""}${e.id}  „${e.text}“`));
console.log("Ein-Blick-Bogen -> " + png);
