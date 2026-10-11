#!/usr/bin/env node
// marke-tokens.mjs: macht aus der Marke eines Laufs (<lauf>/produkt/marke.json) die Datei lib/marke.css.
// Teil des Skills motion-videos (MIT). Node 18+, keine Abhängigkeiten.
//
// Aufruf:
//   node marke-tokens.mjs <marke.json> [--out film/lib/marke.css] [--pruefen]
//   --out      Ziel (Standard: marke.css neben marke.json). Eine Schrift-Datei aus marke.json (schrift.datei)
//              wird nach <ziel-ordner>/fonts/ kopiert und per @font-face eingebunden.
//   --pruefen  nur prüfen (Pflichtfelder, Kontrast), nichts schreiben. Exit 1 bei Fehler.
//
// Einbinden: in index.html NACH lib/tokens.css und nach eigenen :root-Blöcken, also direkt vor </head>:
//   <link rel="stylesheet" href="lib/marke.css">
//
// Was marke.css darf: nur Farben, Verläufe und Schrift (--mv-bg … --mv-font). Was sie nie darf: Qualitätswerte.
// Typo-Größen, Lesetext-Minimum (32 px), Lesezeit, Bildfüllung, Übergänge und Easing stehen fest in
// templates/lib (tokens.css, core.js) und references/09-qualitaets-dna.md; dieses Skript schreibt sie nicht.
// Format von marke.json: templates/marke.vorlage.json.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- Farbe ----------
export function hex(h) {
  if (typeof h !== 'string') return null;
  let s = h.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(s) ? '#' + s.toUpperCase() : null;
}
export function rgb(h) {
  const s = hex(h); if (!s) return null;
  return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
}
export function zuHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function mische(a, b, u) {
  const x = rgb(a), y = rgb(b); if (!x || !y) return hex(a) || hex(b);
  return zuHex(x.map((v, i) => v + (y[i] - v) * u));
}
export function luminanz(h) {
  const c = rgb(h); if (!c) return 0;
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function kontrast(a, b) {
  const l1 = luminanz(a), l2 = luminanz(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
export function hsl(h) {
  const c = rgb(h); if (!c) return { h: 0, s: 0, l: 0 };
  const [r, g, b] = c.map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: hh * 60, s, l };
}
export const dunkel = (h) => luminanz(h) < 0.2;

// ---------- Prüfen ----------
export function pruefeMarke(m) {
  const fehler = [], hinweise = [];
  const f = (m && m.farben) || {};
  for (const k of ['hintergrund', 'tinte', 'akzent']) if (!hex(f[k])) fehler.push(`farben.${k} fehlt oder ist kein Hex-Wert`);
  if (!m || !m.schrift || !String(m.schrift.familie || '').trim()) fehler.push('schrift.familie fehlt (z. B. "Inter" oder der Name der Markenschrift)');
  if (!fehler.length) {
    const k1 = kontrast(f.tinte, f.hintergrund);
    if (k1 < 4.5) hinweise.push(`Tinte auf Hintergrund nur Kontrast ${k1.toFixed(1)}:1 (Ziel ≥ 4,5:1); marke.css nimmt dafür ${kontrast('#000000', f.hintergrund) >= kontrast('#FFFFFF', f.hintergrund) ? 'Schwarz' : 'Weiß'}`);
    const k2 = kontrast(f.akzent, f.hintergrund);
    if (k2 < 3) hinweise.push(`Akzent auf Hintergrund nur Kontrast ${k2.toFixed(1)}:1 (Ziel ≥ 3:1 für große Schrift); Akzent nur für Flächen und Linien, nicht für Aussagen`);
    if (f.gedaempft && hex(f.gedaempft) && kontrast(f.gedaempft, f.hintergrund) < 3) hinweise.push(`gedämpfte Farbe ${f.gedaempft} ist auf dem Hintergrund kaum lesbar (< 3:1); Stützzeilen nehmen dann eine Mischung aus Tinte und Hintergrund`);
  }
  if (m && m.geprueft !== true) hinweise.push('Marke ist abgeleitet, nicht bestätigt (geprueft: false); im Vorschlag (Station 4) bestätigen lassen');
  return { fehler, hinweise };
}

// ---------- marke.css ----------
export function markeCss(m, { quelle = 'produkt/marke.json', fontRel = null } = {}) {
  const f = m.farben || {};
  const bg = hex(f.hintergrund);
  let ink = hex(f.tinte);
  if (kontrast(ink, bg) < 4.5) ink = kontrast('#000000', bg) >= kontrast('#FFFFFF', bg) ? '#111113' : '#FFFFFF';
  let muted = hex(f.gedaempft) || mische(ink, bg, 0.45);
  if (kontrast(muted, bg) < 3) muted = mische(ink, bg, 0.35);
  const acc = hex(f.akzent);
  const bgDark = hex(f.hintergrundDunkel) || (dunkel(bg) ? bg : mische(ink, '#000000', 0.3));
  const card = hex(f.karte) || (dunkel(bg) ? mische(bg, '#FFFFFF', 0.06) : '#FFFFFF');
  const familie = String((m.schrift && m.schrift.familie) || '').trim();
  const generisch = /^(system-ui|sans-serif|serif|-apple-system|inherit|initial)$/i.test(familie);
  const stapel = [generisch ? null : `"${familie.replace(/"/g, '')}"`, '"Inter"', 'system-ui', 'sans-serif'].filter(Boolean).join(', ');
  const z = [];
  z.push(`/* marke.css · erzeugt von scripts/marke-tokens.mjs aus ${quelle} am ${new Date().toISOString().slice(0, 10)}.`);
  z.push(`   Nicht von Hand ändern: marke.json ändern und neu erzeugen. Marke: ${m.name || 'ohne Namen'}${m.quelle ? ` (${m.quelle})` : ''}.`);
  z.push('   Nur Farben, Verläufe und Schrift. Qualitätswerte (Typo-Stufen, Lesetext ≥ 32 px, Lesezeit, Bildfüllung,');
  z.push('   Übergänge, Easing) stehen fest in lib/tokens.css und lib/core.js und werden hier nie überschrieben. */');
  if (fontRel) {
    const fmt = /\.woff2$/i.test(fontRel) ? 'woff2' : /\.woff$/i.test(fontRel) ? 'woff' : /\.otf$/i.test(fontRel) ? 'opentype' : 'truetype';
    z.push(`@font-face { font-family: "${familie.replace(/"/g, '')}"; src: url("${fontRel}") format("${fmt}"); font-weight: 100 900; font-style: normal; }`);
  }
  z.push(':root {');
  const v = {
    '--mv-bg': bg,
    '--mv-bg-dark': bgDark,
    '--mv-card': card,
    '--mv-ink': ink,
    '--mv-label': mische(ink, muted, 0.35),
    '--mv-muted': muted,
    '--mv-ui-text': ink,
    '--mv-ui-muted': muted,
    '--mv-accent': acc,
    '--mv-acc-hi': mische(acc, '#FFFFFF', 0.65),
    '--mv-acc-hi-dark': mische(acc, '#FFFFFF', 0.85),
    '--mv-say-gray': mische(bg, ink, 0.4),
    '--mv-say-gray-sub': mische(bg, ink, 0.25),
  };
  for (const [k, w] of Object.entries(v)) z.push(`  ${k}: ${w};`);
  z.push(`  --mv-ink-grad: linear-gradient(180deg, ${ink} 26%, ${mische(ink, muted, 0.5)} 67%, ${muted} 109%);`);
  z.push(`  --mv-acc-grad: linear-gradient(180deg, ${mische(acc, '#000000', 0.25)} 26%, ${acc} 67%, ${mische(acc, '#FFFFFF', 0.4)} 109%);`);
  z.push(`  --mv-font: ${stapel};`);
  z.push(`  --mv-font-ui: ${stapel};`);
  z.push('}');
  z.push('html, body { background: var(--mv-bg); }');
  return z.join('\n') + '\n';
}

// ---------- CLI ----------
const istCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (istCli) {
  const a = process.argv.slice(2);
  if (!a.length || a[0] === '-h' || a[0] === '--help') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(a.length ? 0 : 2);
  }
  const quelle = resolve(a[0]);
  const oi = a.indexOf('--out');
  const ziel = resolve(oi >= 0 ? a[oi + 1] : resolve(dirname(quelle), 'marke.css'));
  let m;
  try { m = JSON.parse(readFileSync(quelle, 'utf8')); } catch (e) { console.error(`marke.json nicht lesbar: ${quelle} (${e.message})`); process.exit(2); }
  const { fehler, hinweise } = pruefeMarke(m);
  for (const h of hinweise) console.error(`Hinweis: ${h}`);
  if (fehler.length) { for (const x of fehler) console.error(`✗ ${x}`); console.error('Vorlage: templates/marke.vorlage.json'); process.exit(1); }
  if (a.includes('--pruefen')) { console.log('✓ marke.json vollständig'); process.exit(0); }
  let fontRel = null;
  const datei = m.schrift && m.schrift.datei;
  if (datei) {
    const lauf = dirname(dirname(quelle)); // <lauf>/produkt/marke.json
    const q = [resolve(dirname(quelle), datei), resolve(lauf, datei)].find((p) => existsSync(p));
    if (q) {
      mkdirSync(resolve(dirname(ziel), 'fonts'), { recursive: true });
      const zf = resolve(dirname(ziel), 'fonts', basename(q));
      if (resolve(q) !== zf) copyFileSync(q, zf);
      fontRel = relative(dirname(ziel), zf).split('\\').join('/');
    } else console.error(`Hinweis: Schrift-Datei ${datei} nicht gefunden; marke.css nutzt den Ersatz Inter`);
  }
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, markeCss(m, { quelle: relative(process.cwd(), quelle) || quelle, fontRel }));
  console.log(`✓ ${ziel}`);
}
