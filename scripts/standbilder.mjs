#!/usr/bin/env node
// standbilder.mjs: rendert 2 bis 4 Standbilder für den Vorschlag (Station 4) aus dem echten Material des Produkts, in der
// Marke des Nutzers. Teil des Skills motion-videos (MIT). Node 18+, keine Abhängigkeiten; nutzt `hyperframes snapshot`
// über scripts/hf.sh.
//
// Aufruf:
//   node standbilder.mjs <lauf> [--texte "Aussage 1|Aussage 2|Aussage 3"] [--anzahl 3] [--screens a.png,b.png] [--demo] [--sperre <name>]
//   --texte    bis zu vier Aussagen (≤ 6 Wörter); ohne: die ersten aus der Spalte „Aussage“ in <lauf>/VORSCHLAG.md
//   --anzahl   2 bis 4 Bilder (Standard 3)
//   --screens  bestimmte Screens in dieser Reihenfolge (Pfade relativ zum Lauf); ohne: automatisch, siehe unten
//   --demo     nur das Look-Muster aus der Bibliotheks-Demo (fiktive Oberfläche); sonst nur, wenn es kein Material gibt
//
// Material (in dieser Reihenfolge): assets/screens/ (vom Nutzer) → produkt/screens/demo-* (öffentliche Demo oder
// Live-Ansicht) → produkt/screens/scroll-* (Website) → assets/bilder/, produkt/bilder/. Bildwelten je Bild wie im Film:
// Desktop-Fenster mit dem Screen, Handy mit dem Screen, Fenster mit dem nächsten Screen, Aussage groß mit Logo. Aussage in
// der Lesezone (Typo-System der Bibliothek), Farben und Schrift aus <lauf>/produkt/marke.json (scripts/marke-tokens.mjs).
// Ergebnis: <lauf>/vorschlag/standbilder/01_<aussage>.png … und standbilder.json ({ quelle: "echt" | "demo", bilder }).
// Ohne jedes Material: Look-Muster aus der Demo, quelle "demo"; dann im Vorschlag sagen, dass die Oberfläche fehlt.
// Der Snapshot läuft unter der Render-Sperre.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, cpSync, renameSync, rmdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, basename, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { markeCss, pruefeMarke } from './marke-tokens.mjs';
import { szenenAusVorschlag, woerter } from './vorschlag-lesen.mjs';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
if (!argv.length || argv[0] === '-h' || argv[0] === '--help') {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(argv.length ? 0 : 2);
}
const opt = { texte: null, anzahl: 3, sperre: null, demo: false, screens: null }; const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--texte') opt.texte = argv[++i].split('|').map((s) => s.trim()).filter(Boolean);
  else if (argv[i] === '--demo') opt.demo = true;
  else if (argv[i] === '--screens') opt.screens = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
  else if (argv[i] === '--anzahl') opt.anzahl = Math.min(4, Math.max(2, parseInt(argv[++i], 10) || 3));
  else if (argv[i] === '--sperre') opt.sperre = argv[++i];
  else pos.push(argv[i]);
}
const LAUF = resolve(pos[0]);
const SPERRE = opt.sperre || basename(LAUF);

// ---------- Aussagen ----------
let texte = opt.texte;
if (!texte) {
  const vp = join(LAUF, 'VORSCHLAG.md');
  if (!existsSync(vp)) { console.error(`Keine Aussagen: ${vp} fehlt. Mit --texte "A|B|C" angeben oder erst den Vorschlag schreiben.`); process.exit(2); }
  texte = szenenAusVorschlag(readFileSync(vp, 'utf8')).map((z) => z.aussage).filter((t) => t && !/^<.*>$/.test(t));
}
const alleTexte = texte.slice(0, 4);
texte = texte.slice(0, 3);
if (texte.length < 2) { console.error('Mindestens zwei Aussagen nötig (Spalte „Aussage“ im Vorschlag oder --texte).'); process.exit(2); }
for (const t of alleTexte) if (woerter(t) > 6) console.error(`Hinweis: „${t}“ hat ${woerter(t)} Wörter (Regel: höchstens 6). Erst kürzen, dann Standbilder.`);
while (texte.length < 3) texte.push(texte[texte.length - 1]);

// ---------- Marke ----------
const mp = join(LAUF, 'produkt/marke.json');
if (!existsSync(mp)) { console.error(`${mp} fehlt (Station 2: scripts/produkt-lesen.mjs oder templates/marke.vorlage.json).`); process.exit(2); }
const marke = JSON.parse(readFileSync(mp, 'utf8'));
const pm = pruefeMarke(marke);
if (pm.fehler.length) { for (const f of pm.fehler) console.error(`✗ marke.json: ${f}`); process.exit(1); }

// ---------- Material ----------
const BILD = /\.(png|jpe?g|webp)$/i;
const bilderIn = (d, re = BILD, ohne = /uebersicht|contact-sheet|full-page/i) => { try { return readdirSync(join(LAUF, d)).filter((f) => re.test(f) && !ohne.test(f)).sort().map((f) => join(d, f)); } catch { return []; } };
/** Breite und Höhe eines PNG aus dem Kopf (IHDR); andere Formate: null. */
const pngMass = (p) => { try { const b = readFileSync(join(LAUF, p)); return b.toString('latin1', 12, 16) === 'IHDR' ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null; } catch { return null; } };
const hochkant = (p) => { const m = pngMass(p); return !/full-page/i.test(p) && !!m && m.w >= 0.42 * m.h && m.w <= 0.7 * m.h; }; // Handy-Screen, keine lange Seite
const groesse = (p) => { try { return statSync(join(LAUF, p)).size; } catch { return 0; } };
const material = opt.screens || [
  // Demo: die ganze Seite zuerst (zeigt oben die Hauptansicht), dann die Scroll-Stufen von oben nach unten
  ...bilderIn('assets/screens'), ...bilderIn('produkt/screens', /^demo-full-page\.(png|jpe?g|webp)$/i, /^$/), ...bilderIn('produkt/screens', /^demo-.*\.(png|jpe?g|webp)$/i),
  ...bilderIn('produkt/screens', /^scroll-.*\.(png|jpe?g|webp)$/i),
  ...bilderIn('assets/bilder'), ...bilderIn('produkt/bilder'),
].filter((p, i, l) => l.indexOf(p) === i && groesse(p) > 15 * 1024);
const OUT = join(LAUF, 'vorschlag/standbilder');
const ROH = join(OUT, `_roh-${process.pid}`); // je Lauf ein frischer Ordner, damit keine alten Bilder mitzählen
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'bild';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function snapshot(projekt, zeiten) {
  mkdirSync(ROH, { recursive: true });
  const befehl = ['bash', join(SKILL, 'scripts/sperre.sh'), SPERRE, '--', 'bash', join(SKILL, 'scripts/hf.sh'), 'snapshot', projekt, '--at', zeiten.join(','), '--no-end', '--describe', 'false', '-o', ROH];
  console.error(`snapshot (Sperre ${SPERRE}) bei ${zeiten.join(', ')} s`);
  const r = spawnSync(befehl[0], befehl.slice(1), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10 * 60 * 1000 });
  const pngs = existsSync(ROH) ? readdirSync(ROH).filter((f) => /\.png$/i.test(f)).sort() : [];
  if (r.status !== 0 || pngs.length < zeiten.length) {
    console.error(`snapshot fehlgeschlagen (Exit ${r.status}):\n${(r.stderr || r.stdout || '').split('\n').slice(-12).join('\n')}`);
    process.exit(1);
  }
  // snapshot benennt nach Zeit; nach Zeit sortieren
  return pngs.map((f) => ({ f, t: parseFloat((f.match(/(\d+(?:[.,_]\d+)?)/) || [0, '0'])[1].replace(/[,_]/, '.')) })).sort((a, b) => a.t - b.t).slice(0, zeiten.length);
}
function ablegen(roh, namen, quelle, extra = []) {
  const fertig = [];
  roh.forEach((x, i) => {
    const ziel = join(OUT, `${String(i + 1).padStart(2, '0')}_${slug(namen[i])}.png`);
    renameSync(join(ROH, x.f), ziel); fertig.push(ziel);
  });
  if (existsSync(join(ROH, 'contact-sheet.jpg'))) renameSync(join(ROH, 'contact-sheet.jpg'), join(OUT, 'uebersicht.jpg')); // alle Bilder auf einen Blick
  try { rmdirSync(ROH); } catch { /* nicht leer: bleibt */ }
  writeFileSync(join(OUT, 'standbilder.json'), JSON.stringify({ quelle, erzeugt: new Date().toISOString(), bilder: fertig.map((f, i) => ({ datei: basename(f), aussage: namen[i], ...(extra[i] || {}) })) }, null, 2) + '\n');
  return fertig;
}

if (material.length && !opt.demo) {
  // ---------- Echtes Material: eigene kleine Komposition, ein Bild je Sekunde ----------
  const ECHT = join(LAUF, 'vorschlag/muster-echt');
  mkdirSync(join(ECHT, 'lib/fonts'), { recursive: true }); mkdirSync(join(ECHT, 'assets'), { recursive: true });
  for (const f of ['core.js', 'camera.js', 'motion.js', 'tokens.css']) copyFileSync(join(SKILL, 'templates/lib', f), join(ECHT, 'lib', f));
  for (const f of readdirSync(join(SKILL, 'templates/lib/demo/assets/fonts'))) copyFileSync(join(SKILL, 'templates/lib/demo/assets/fonts', f), join(ECHT, 'lib/fonts', f));
  let fontRel2 = null;
  if (marke.schrift && marke.schrift.datei) {
    const q = [resolve(LAUF, marke.schrift.datei), resolve(dirname(mp), marke.schrift.datei)].find((p) => existsSync(p));
    if (q) { copyFileSync(q, join(ECHT, 'lib/fonts', basename(q))); fontRel2 = `fonts/${basename(q)}`; }
  }
  writeFileSync(join(ECHT, 'lib/marke.css'), markeCss(marke, { quelle: 'produkt/marke.json', fontRel: fontRel2 }));
  let logo = null;
  for (const l of ['produkt/logo.svg', ...bilderIn('assets/logo', /\.(svg|png)$/i)]) if (existsSync(join(LAUF, l))) { logo = l; break; }
  if (logo) copyFileSync(join(LAUF, logo), join(ECHT, 'assets', `logo${extname(logo)}`));
  // Bildwelten wie im Film: Fenster mit der Hauptansicht, Handy (nur mit Hochkant-Screen) sonst Nahaufnahme im Fenster,
  // Fenster mit dem nächsten Screen, Aussage groß mit Logo
  const hoch = material.find(hochkant);
  const quer = material.filter((p) => p !== hoch);
  const pick = (k) => (quer.length ? quer[Math.min(k, quer.length - 1)] : material[0]);
  // Scroll-Stufen ab 80 % zeigen meist Fußzeile und Werbung: dann lieber eine zweite Nahaufnahme der Hauptansicht
  const seitenEnde = (p) => /scroll-(0?8\d|9\d|100)\.(png|jpe?g|webp)$/i.test(p);
  const dritte = quer.length > 2 && !seitenEnde(pick(2)) ? ['fenster', pick(2)] : ['nah', pick(0), '72% 28%'];
  const plan = [['fenster', pick(0)], hoch ? ['handy', hoch] : ['nah', pick(1)], dritte, logo ? ['aussage', null] : ['nah', pick(3)]];
  const n = opt.anzahl;
  const szenen = [];
  for (let i = 0; i < n; i++) {
    const [art, quelle, ursprung = '18% 8%'] = plan[i];
    const text = alleTexte[i] || texte[i % texte.length];
    let bild = null;
    if (quelle) { bild = `assets/screen-${i + 1}${extname(quelle).toLowerCase()}`; copyFileSync(join(LAUF, quelle), join(ECHT, bild)); }
    szenen.push({ art, text, akzent: text.replace(/[.!?]$/, '').split(/\s+/).slice(-1)[0], bild, quelle, ursprung });
  }
  const html = `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <title>${esc(marke.name || 'Marke')} · Standbilder aus echtem Material</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="lib/tokens.css">
    <script src="lib/core.js"></script>
    <script src="lib/camera.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "Inter"; src: url("lib/fonts/inter-400.woff2") format("woff2"); font-weight: 400; }
      @font-face { font-family: "Inter"; src: url("lib/fonts/inter-500.woff2") format("woff2"); font-weight: 500; }
      @font-face { font-family: "Inter"; src: url("lib/fonts/inter-600.woff2") format("woff2"); font-weight: 600 900; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--mv-bg); }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: var(--mv-font, "Inter"), sans-serif; background: var(--mv-bg); }
      .welt { position: absolute; inset: 0; visibility: hidden; }
      .fenster { position: absolute; background: var(--mv-card); border-radius: 14px; overflow: hidden;
        box-shadow: 0 30px 80px rgba(15, 20, 30, 0.16), 0 4px 14px rgba(15, 20, 30, 0.08), 0 0 0 1px rgba(15, 20, 30, 0.06); }
      .fenster .leiste { height: 30px; display: flex; align-items: center; gap: 8px; padding: 0 14px; background: rgba(127, 127, 127, 0.08); border-bottom: 1px solid rgba(127, 127, 127, 0.14); }
      .fenster .leiste i { width: 11px; height: 11px; border-radius: 50%; background: rgba(127, 127, 127, 0.35); display: block; }
      .fenster img, .handy img { display: block; width: 100%; object-fit: cover; object-position: center top; }
      .handy { position: absolute; background: #0d0f12; border-radius: 46px; padding: 12px; box-shadow: 0 30px 80px rgba(15, 20, 30, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.06) inset; }
      .handy .glas { width: 100%; height: 100%; border-radius: 36px; overflow: hidden; background: var(--mv-card); }
      .handy img { height: 100%; }
      .logo { position: absolute; left: 50%; transform: translateX(-50%); max-height: 64px; max-width: 360px; }
    </style>
    <link rel="stylesheet" href="lib/marke.css">
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${n}" data-width="1920" data-height="1080">
      <div class="mv-scene" id="film"><div class="mv-stage" id="stage"></div></div>
    </div>
    <script>
      (function () {
        MV.configure({ fps: 30, bpm: 120, anchor: 0, ref: { w: 1280, h: 720 }, out: { w: 1920, h: 1080 } });
        const S = ${JSON.stringify(szenen.map(({ quelle, ...x }) => x))};
        const Z = MV.zone();
        const stage = document.getElementById("stage");
        S.forEach((s, i) => {
          const d = document.createElement("div"); d.className = "mv-layer welt"; d.id = "w" + i;
          if (s.art === "fenster" || s.art === "nah") {
            // nah: dasselbe Fenster größer und näher (Ausschnitt oben links), wie eine Kamerafahrt in die Oberfläche
            const h = s.art === "nah" ? 720 - Z.graphicTop + 40 : Math.min(720 - Z.graphicTop - 34, 500), w = Math.round(h * 1.6);
            const zoom = s.art === "nah" ? "transform:scale(1.7);transform-origin:" + s.ursprung + ";" : "";
            d.innerHTML = '<div class="fenster" style="left:' + (640 - w / 2) + 'px;top:' + Z.graphicTop + 'px;width:' + w + 'px;height:' + h + 'px"><div class="leiste"><i></i><i></i><i></i></div><img src="' + s.bild + '" style="height:' + (h - 30) + 'px;' + zoom + '"></div>'
              + MV.sayHTML(s.text, { id: "s" + i, stage: "Z", accent: s.akzent });
          } else if (s.art === "handy") {
            const h = 720 - Z.graphicTop + 70, w = Math.round(h * 0.47);
            d.innerHTML = '<div class="handy" style="left:' + (640 - w / 2) + 'px;top:' + Z.graphicTop + 'px;width:' + w + 'px;height:' + h + 'px"><div class="glas"><img src="' + s.bild + '"></div></div>'
              + MV.sayHTML(s.text, { id: "s" + i, stage: "Z", accent: s.akzent });
          } else {
            d.innerHTML = MV.sayHTML(s.text, { id: "s" + i, stage: "H", accent: s.akzent }) + '<img class="logo" src="assets/logo${logo ? extname(logo) : '.svg'}" style="top:520px">';
          }
          stage.appendChild(d);
        });
        function render(t) {
          const k = Math.min(S.length - 1, Math.max(0, Math.floor(t + 1e-6)));
          S.forEach((s, i) => { document.getElementById("w" + i).style.visibility = i === k ? "inherit" : "hidden"; });
          MV.say(document.getElementById("s" + k), t, k - 5);
        }
        document.fonts.ready.then(() => {
          render(0);
          const tl = gsap.timeline({ paused: true }); const proxy = { t: 0 };
          tl.to(proxy, { t: S.length, duration: S.length, ease: "none", onUpdate: () => render(proxy.t) }, 0);
          window.__timelines["main"] = tl;
        });
      })();
    </script>
  </body>
</html>
`;
  writeFileSync(join(ECHT, 'index.html'), html);
  writeFileSync(join(ECHT, 'package.json'), JSON.stringify({ name: 'motion-videos-standbilder', private: true, type: 'module' }, null, 2) + '\n');
  const roh = snapshot(ECHT, szenen.map((_, i) => +(i + 0.5).toFixed(2)));
  const fertig = ablegen(roh, szenen.map((x) => x.text), 'echt', szenen.map((x) => ({ bildwelt: x.art, material: x.quelle })));
  console.log(`✓ ${fertig.length} Standbilder aus echtem Material in der Marke ${marke.name || ''}:`);
  fertig.forEach((f, i) => console.log(`  ${f}  (${szenen[i].art}${szenen[i].quelle ? `: ${szenen[i].quelle}` : ''})`));
  if (!bilderIn('assets/screens').length) console.log('  Hinweis: keine eigenen Screens vom Nutzer; die Bilder zeigen die öffentliche Demo bzw. die Website. So im Vorschlag sagen.');
  if (pm.hinweise.length) for (const h of pm.hinweise) console.log(`  Hinweis: ${h}`);
  process.exit(0);
}
if (!opt.demo) console.error('Kein Material gefunden (assets/screens, produkt/screens, Bilder): Look-Muster aus der Bibliotheks-Demo. Im Vorschlag sagen: „Oberfläche folgt aus deinen Screens“.');

// ---------- Ohne Material: Muster-Projekt aus der Bibliotheks-Demo ----------
const DEMO = join(SKILL, 'templates/lib/demo');
const MUSTER = join(LAUF, 'vorschlag/muster');
mkdirSync(MUSTER, { recursive: true });
cpSync(DEMO, MUSTER, { recursive: true, filter: (q) => !/\/(renders|node_modules|snapshots)(\/|$)/.test(q.slice(DEMO.length)) });
mkdirSync(join(MUSTER, 'lib'), { recursive: true });
for (const f of ['core.js', 'camera.js', 'motion.js', 'tokens.css']) copyFileSync(join(SKILL, 'templates/lib', f), join(MUSTER, 'lib', f));
let fontRel = null;
if (marke.schrift && marke.schrift.datei) {
  const q = [resolve(LAUF, marke.schrift.datei), resolve(dirname(mp), marke.schrift.datei)].find((p) => existsSync(p));
  if (q) { mkdirSync(join(MUSTER, 'lib/fonts'), { recursive: true }); copyFileSync(q, join(MUSTER, 'lib/fonts', basename(q))); fontRel = `fonts/${basename(q)}`; }
}
writeFileSync(join(MUSTER, 'lib/marke.css'), markeCss(marke, { quelle: 'produkt/marke.json', fontRel }));
let html = readFileSync(join(MUSTER, 'index.html'), 'utf8');
if (!html.includes('lib/marke.css')) html = html.replace('</head>', '    <link rel="stylesheet" href="lib/marke.css">\n  </head>');
html = html.replace(/<title>[^<]*<\/title>/, `<title>${(marke.name || 'Marke').replace(/[<&]/g, '')} · Look-Muster</title>`);
if (marke.name) html = html.split('Nordlicht Notes').join(String(marke.name).replace(/[<&]/g, '').slice(0, 28));
writeFileSync(join(MUSTER, 'index.html'), html);
let plan = readFileSync(join(MUSTER, 'plan.js'), 'utf8');
const alt = [['Ideen, sofort sortiert.', 'sortiert.'], ['Alles an einem Ort.', 'einem Ort.'], ['Auf jedem Gerät synchron.', 'synchron.']];
alt.forEach(([t, a], i) => {
  const neu = texte[i].replace(/"/g, '\\"');
  const akzent = neu.split(/\s+/).slice(-1)[0];
  plan = plan.replace(`text: "${t}", accent: "${a}"`, `text: "${neu}", accent: "${akzent}"`);
});
writeFileSync(join(MUSTER, 'plan.js'), plan);

// ---------- Zeiten aus der Ereignisliste ----------
const ev = spawnSync('node', ['tools/ereignisse.mjs', '.', '--out', 'ereignisse.json'], { cwd: MUSTER, encoding: 'utf8' });
if (!existsSync(join(MUSTER, 'ereignisse.json'))) { console.error(`Ereignisliste nicht erzeugt:\n${ev.stderr || ev.stdout}`); process.exit(1); }
if (ev.status !== 0) console.error(`Hinweis: Ereignis-Export meldet Abweichungen (Lesezeit?):\n${(ev.stdout || '').split('\n').slice(-6).join('\n')}`);
const liste = JSON.parse(readFileSync(join(MUSTER, 'ereignisse.json'), 'utf8')).ereignisse || [];
const say = ['a-say', 'b-say', 'c-say'].map((id) => liste.find((e) => e.id === id && e.typ === 'aussage')).filter(Boolean);
const zeiten = say.map((e) => +(Math.min(e.lesbarAb + 0.25, (e.ausstiegAb ?? e.lesbarAb + 1) - 0.05)).toFixed(3));
const namen = say.map((e, i) => texte[i]);
if (opt.anzahl === 4 && say[2]) { zeiten.splice(2, 0, +(Math.max(say[1]?.ausstiegAb ?? 0, say[2].lesbarAb - 1.2)).toFixed(3)); namen.splice(2, 0, 'grafik'); }
const nutze = zeiten.slice(0, opt.anzahl), nutzeNamen = namen.slice(0, opt.anzahl);

// ---------- Snapshot unter der Sperre ----------
const roh = snapshot(MUSTER, nutze);
const fertig = ablegen(roh, nutzeNamen, 'demo');
console.log(`✓ ${fertig.length} Standbilder (Look-Muster aus der Bibliotheks-Demo in der Marke ${marke.name || ''}; die Oberfläche ist fiktiv):`);
for (const f of fertig) console.log(`  ${f}`);
if (pm.hinweise.length) for (const h of pm.hinweise) console.log(`  Hinweis: ${h}`);
