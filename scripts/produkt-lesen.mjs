#!/usr/bin/env node
// produkt-lesen.mjs: liest die öffentliche Produktseite (Station 2) und legt Funktionen mit Beleg, Marke und Screens ab.
// Teil des Skills motion-videos (MIT). Node 18+, keine Abhängigkeiten. Nutzt `hyperframes capture` über scripts/hf.sh (Screens,
// Farben, Schriften, Logo, Seitentext); fehlt die CLI oder scheitert sie, liest es nur den HTML-Text.
//
// Aufruf:
//   node produkt-lesen.mjs <url> <lauf> [--auch <url>]… [--demo <url>] [--keine-demo] [--screens 8] [--ohne-capture] [--sperre <name>]
//   --auch          weitere Seite derselben Domain (z. B. /features), nur Text; mehrfach erlaubt
//   --demo          öffentliche Demo oder Live-Ansicht des Produkts holen (Screens nach produkt/screens/demo-*.png);
//                   ist die Produktseite schon gelesen (produkt/quelle.json), wird nur die Demo geholt
//   --keine-demo    keine Demo holen. Ohne --demo sucht das Skript selbst nach Links wie „Live demo“, „Try the demo“,
//                   „Playground“, „Sandbox“ auf derselben Domain (Ergebnis produkt/demo.json) und holt den besten, wenn er
//                   eindeutig ist. Nie: Formulare („Book a demo“, „Request demo“), Login, Konto („My dashboard“).
//   --screens       höchstens so viele Seiten-Screens (Standard 8)
//   --ohne-capture  kein Headless-Chrome, nur HTML-Text (schneller, ohne Screens und Logo)
//   --sperre        Name der Render-Sperre (Standard: Name des Lauf-Ordners); capture ist ein Medienjob
//
// Grenzen (fest): nur öffentliche Seiten. Kein Login, keine Formulare, keine Cookies. robots.txt wird beachtet
// (User-agent *). Login-Wand, Bot-Sperre oder robots-Verbot: das Skript stoppt, schreibt produkt/FEHLT.md mit
// der Liste, was der Nutzer selbst liefern soll, und endet mit Exit 3. Nichts wird umgangen.
//
// Ergebnis in <lauf>/produkt/:
//   PRODUKT.md        Übersicht (Kern-Satz, Funktionen, Marke, Screens, was fehlt, nächster Schritt)
//   funktionen.json   Kandidaten: { titel, zitat, quelle, status: "kandidat" }; der Skill sichtet sie und setzt
//                     status auf "belegt" (Zitat trägt), "nutzer" (vom Nutzer bestätigt) oder "verworfen"
//   funktionen.md     dieselbe Liste als Tabelle
//   marke.json        Farben, Schrift, Logo aus der Seite (geprueft: false), Format templates/marke.vorlage.json
//   seite.txt         Seitentext in DOM-Reihenfolge ([h1], [p] …), je Seite mit Quelle
//   screens/          Screens der Seite (scroll-*.png, uebersicht.jpg), der Demo (demo-*.png)
//   demo.json         Demo-Kandidaten { kandidaten: [{ url, text, punkte }], gelesen: <url> | null }
//   bilder/           größere Bilder der Seite (og-image usw.), logo.svg falls öffentlich
//   quelle.json       URL, Zeit, HTTP-Status, robots-Urteil, Capture-Ordner
// Exit: 0 ok · 2 Aufruf · 3 Seite nicht lesbar (FEHLT.md geschrieben)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { resolve, dirname, basename, join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hex, luminanz, kontrast, hsl, pruefeMarke } from './marke-tokens.mjs';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'motion-videos-produkt-lesen/1 (+https://github.com/simon-schaeferai/motion-videos)';

// ---------- Aufruf ----------
const argv = process.argv.slice(2);
if (argv.length < 2 || argv[0] === '-h' || argv[0] === '--help') {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(argv[0] === '-h' || argv[0] === '--help' ? 0 : 2);
}
const opt = { auch: [], screens: 8, ohneCapture: false, sperre: null, demo: null, keineDemo: false };
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--auch') opt.auch.push(argv[++i]);
  else if (a === '--screens') opt.screens = Math.max(2, parseInt(argv[++i], 10) || 8);
  else if (a === '--ohne-capture') opt.ohneCapture = true;
  else if (a === '--demo') opt.demo = argv[++i];
  else if (a === '--keine-demo') opt.keineDemo = true;
  else if (a === '--sperre') opt.sperre = argv[++i];
  else pos.push(a);
}
let start;
try { start = new URL(pos[0]); if (!/^https?:$/.test(start.protocol)) throw new Error('nur http/https'); }
catch (e) { console.error(`Keine gültige URL: ${pos[0]} (${e.message})`); process.exit(2); }
const LAUF = resolve(pos[1]);
const PROD = join(LAUF, 'produkt');
mkdirSync(PROD, { recursive: true });
const SPERRE = opt.sperre || basename(LAUF);
const jetzt = new Date();
const log = (m) => console.error(m);

// ---------- robots.txt ----------
async function robotsErlaubt(u) {
  try {
    const r = await fetch(new URL('/robots.txt', u), { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { erlaubt: true, grund: `keine robots.txt (HTTP ${r.status})` };
    const txt = await r.text();
    const regeln = []; let gilt = false, inGruppe = false;
    for (const roh of txt.split(/\r?\n/)) {
      const z = roh.replace(/#.*/, '').trim(); if (!z) continue;
      const m = z.match(/^([A-Za-z-]+)\s*:\s*(.*)$/); if (!m) continue;
      const k = m[1].toLowerCase(), v = m[2].trim();
      if (k === 'user-agent') { if (!inGruppe) gilt = false; inGruppe = true; if (v === '*' || /motion-videos/i.test(v)) gilt = true; }
      else { inGruppe = false; if (gilt && (k === 'allow' || k === 'disallow')) regeln.push({ k, v }); }
    }
    const pfad = u.pathname + (u.search || '');
    let best = null;
    for (const r2 of regeln) {
      if (!r2.v) continue;
      const re = new RegExp('^' + r2.v.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
      if (re.test(pfad) && (!best || r2.v.length > best.v.length || (r2.v.length === best.v.length && r2.k === 'allow'))) best = r2;
    }
    if (best && best.k === 'disallow') return { erlaubt: false, grund: `robots.txt verbietet ${pfad} (Disallow: ${best.v})` };
    return { erlaubt: true, grund: best ? `robots.txt erlaubt (${best.k}: ${best.v})` : 'robots.txt ohne Verbot für diesen Pfad' };
  } catch (e) { return { erlaubt: true, grund: `robots.txt nicht erreichbar (${e.message}); behandelt wie keine` }; }
}

// ---------- Sperren erkennen ----------
const BOT_WAND = /(captcha|just a moment|attention required|verify you are human|access denied|are you a robot|checking your browser|cf-challenge|bot detection|unusual traffic)/i;
function sperreErkannt({ status, text, html }) {
  if ([401, 403, 407, 429, 451, 503].includes(status)) return `HTTP ${status} (Zugriff verweigert oder gedrosselt)`;
  const kurz = (text || '').replace(/\s+/g, ' ').trim();
  if (BOT_WAND.test(kurz.slice(0, 3000)) && kurz.length < 4000) return 'Bot-Sperre (Prüfseite statt Inhalt)';
  if (/type=["']?password/i.test(html || '') && kurz.length < 1500) return 'Login-Seite (Inhalt nur nach Anmeldung)';
  if (kurz.length < 120) return 'kaum Text auf der Seite (lädt Inhalt nur per Skript oder nach Anmeldung)';
  return null;
}

function schreibeFehlt(grund, url) {
  const t = `# Produktseite nicht automatisch lesbar

Stand: ${jetzt.toLocaleString('de-DE')} · Seite: ${url}
Grund: ${grund}

Der Skill umgeht keine Logins, Formulare oder Bot-Sperren. Damit der Film trotzdem echt wird, brauche ich von dir:

1. **3 bis 5 Screenshots** deines Produkts (je Ansicht ein PNG, möglichst 1920 px breit) nach \`assets/screens/\`.
   Warum: Echte Screens machen den Film konkret; ohne sie baue ich nachempfundene Oberflächen, das wirkt generischer.
2. **Logo** als SVG (sonst PNG mit transparentem Hintergrund) nach \`assets/logo/\`.
3. **3 bis 6 Funktionen**, je ein Satz, und wo man das nachlesen kann (Link oder „steht so in der App“).
4. **Farben und Schrift**, falls du eine Brand-Datei hast (PDF, Figma-Link, Hex-Werte).

Danach weiter mit \`node <skill-dir>/scripts/navi.mjs pruefen\`.
`;
  writeFileSync(join(PROD, 'FEHLT.md'), t);
  log(`\n✗ ${grund}\n  Nicht umgangen. Liste für den Nutzer: ${join(PROD, 'FEHLT.md')}`);
}

// ---------- HTML ohne Capture ----------
async function holeHtml(u) {
  const r = await fetch(u, { headers: { 'user-agent': UA, 'accept-language': 'de,en;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
  const html = await r.text();
  return { status: r.status, html, url: r.url || String(u) };
}
function entities(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function htmlZuText(html) {
  let s = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ');
  const zeilen = [];
  const re = /<(h1|h2|h3|h4|h5|p|li|dt|dd|button|a|span|strong)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(s))) {
    const t = entities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (t && t.length > 1 && t.length < 400) zeilen.push(`[${m[1].toLowerCase()}] ${t}`);
  }
  return zeilen.join('\n');
}
function meta(html, name) {
  const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'));
  return m ? entities(m[1]).trim() : null;
}

// ---------- Capture ----------
function capture(u) {
  let ziel = join(PROD, '_capture'); let n = 2;
  while (existsSync(ziel)) ziel = join(PROD, `_capture-${n++}`);
  const hf = ['bash', join(SKILL, 'scripts/hf.sh')]; // eine Stelle für die Version (HF_CLI, HYPERFRAMES_VERSION wie dort)
  const befehl = ['bash', join(SKILL, 'scripts/sperre.sh'), SPERRE, '--', ...hf, 'capture', String(u), '-o', ziel,
    '--skip-vision', '--max-screenshots', String(opt.screens), '--json'];
  log(`capture (unter der Sperre ${SPERRE}): ${befehl.slice(4).join(' ')}`);
  const r = spawnSync(befehl[0], befehl.slice(1), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  let j = null;
  for (const aus of [r.stdout || '', (r.stdout || '') + '\n' + (r.stderr || '')]) {
    const i = aus.search(/^\{\s*$/m), e = aus.lastIndexOf('}');
    if (i < 0 || e < i) continue;
    try { j = JSON.parse(aus.slice(i, e + 1)); break; } catch { j = null; }
  }
  if (!j || !j.ok || !existsSync(join(ziel, 'extracted'))) {
    log(`capture nicht nutzbar (Exit ${r.status}${r.error ? ', ' + r.error.message : ''}); weiter nur mit dem HTML-Text.`);
    return null;
  }
  return { ...j, dir: ziel };
}
const lies = (p, fallback = null) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } };

// ---------- Marke ableiten ----------
function markeAus({ cap, html, url, name }) {
  const hinweise = [];
  const tok = cap ? lies(join(cap.dir, 'extracted/tokens.json'), {}) : {};
  const ds = cap ? lies(join(cap.dir, 'extracted/design-styles.json'), {}) : {};
  const stats = (tok.colorStats || []).map((c) => ({ ...c, hex: hex(c.hex) })).filter((c) => c.hex);
  // Hintergrund: Abschnittsfarbe mit der größten Gesamthöhe
  const flaeche = new Map();
  for (const s of tok.sections || []) { const h = hex(s.backgroundColor); if (h) flaeche.set(h, (flaeche.get(h) || 0) + (s.height || 0) * (s.width || 1)); }
  let bg = [...flaeche.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    || stats.filter((c) => c.bgCount > 0).sort((a, b) => (b.maxArea || 0) - (a.maxArea || 0))[0]?.hex
    || hex(meta(html || '', 'theme-color')) || '#FFFFFF';
  // Tinte: häufigste Textfarbe mit Kontrast ≥ 4,5 zum Hintergrund
  const texte = stats.filter((c) => c.textCount > 0).sort((a, b) => b.textCount - a.textCount);
  let tinte = texte.find((c) => kontrast(c.hex, bg) >= 4.5)?.hex || (luminanz(bg) > 0.4 ? '#111113' : '#FFFFFF');
  // Akzent: gesättigte Farbe, bevorzugt auf Buttons/Links
  const bunt = stats.filter((c) => { const x = hsl(c.hex); return x.s >= 0.35 && x.l > 0.2 && x.l < 0.8; })
    .sort((a, b) => ((b.interactiveBg || 0) * 8 + (b.count || 0)) - ((a.interactiveBg || 0) * 8 + (a.count || 0)));
  const akzent = bunt[0]?.hex || hex(meta(html || '', 'theme-color')) || '#3D6BFF';
  if (!bunt.length) hinweise.push('keine gesättigte Markenfarbe gefunden; Akzent ist ein Platzhalter, beim Nutzer erfragen');
  const gedaempft = texte.find((c) => c.hex !== tinte && hsl(c.hex).s < 0.25 && kontrast(c.hex, bg) >= 3 && kontrast(c.hex, bg) < kontrast(tinte, bg))?.hex || null;
  const dunkelBg = stats.filter((c) => c.bgCount > 0 && luminanz(c.hex) < 0.08).sort((a, b) => (b.maxArea || 0) - (a.maxArea || 0))[0]?.hex || null;
  // Schrift
  const typo = (ds.typography || []);
  const anzeige = typo.find((t) => t.role === 'display') || typo[0];
  let familie = anzeige ? String(anzeige.fontFamily || '').split(',')[0].replace(/["']/g, '').trim() : '';
  if (!familie || /^(system-ui|-apple-system|blinkmacsystemfont|sans-serif|serif|inherit|times|times new roman|arial|helvetica|helvetica neue|segoe ui)$/i.test(familie)) { hinweise.push(`Seite nutzt ${familie || 'keine erkennbare'} (System- oder Standardschrift); Film nimmt Inter, bis eine Markenschrift kommt`); familie = 'Inter'; }
  const fm = cap ? lies(join(cap.dir, 'extracted/fonts-manifest.json'), {}) : {};
  const kandidat = (fm.files || []).map((f) => (typeof f === 'string' ? f : f.file || f.path)).filter(Boolean)[0] || null;
  if (kandidat) hinweise.push(`Schrift-Datei auf der Seite gefunden (${kandidat}); nur mit Lizenz für Video als schrift.datei eintragen`);
  // Logo
  let logo = null;
  if (cap) {
    const assets = join(cap.dir, 'assets');
    const svgLogo = existsSync(assets) ? readdirSync(assets).find((f) => /^logo.*\.svg$/i.test(f)) : null;
    const ico = lies(join(cap.dir, 'extracted/icons-manifest.json'), {});
    const quelle = svgLogo ? join(assets, svgLogo) : ico.headline?.file && /\.svg$/i.test(ico.headline.file) ? join(cap.dir, ico.headline.file) : null;
    if (quelle && existsSync(quelle)) { mkdirSync(join(PROD, 'bilder'), { recursive: true }); copyFileSync(quelle, join(PROD, 'logo.svg')); logo = 'produkt/logo.svg'; }
  }
  if (!logo) hinweise.push('kein Logo als SVG gefunden; beim Nutzer anfragen (assets/logo/)');
  const m = {
    schema: 1, name, quelle: url, stand: jetzt.toISOString().slice(0, 10), geprueft: false,
    farben: { hintergrund: bg, hintergrundDunkel: dunkelBg, karte: null, tinte, gedaempft, akzent,
      _herkunft: cap ? 'abgeleitet aus hyperframes capture (Abschnittsflächen, Textfarben, Buttons); im Vorschlag bestätigen' : 'aus dem HTML (theme-color) geschätzt; unsicher, beim Nutzer bestätigen' },
    schrift: { familie, datei: null, kandidat, gewicht: anzeige ? parseInt(anzeige.fontWeight, 10) || 600 : 600 },
    logo,
    hinweise,
  };
  for (const k of Object.keys(m.farben)) if (m.farben[k] === null) delete m.farben[k];
  return m;
}

// ---------- Funktionen ----------
const NAV = /^(home|start|login|log in|sign in|sign up|anmelden|registrieren|kontakt|contact|impressum|imprint|datenschutz|privacy|cookie|terms|agb|blog|docs|documentation|pricing|preise|careers|jobs|about|über uns|menu|menü|search|suche|faq|support|help|hilfe|newsletter|follow|resources|status|changelog)\b/i;
function funktionenAus(text, quelle) {
  const z = text.split('\n').map((l) => { const m = l.match(/^\[(\w+)\]\s*(.*)$/); return m ? { tag: m[1].toLowerCase(), t: m[2].trim() } : null; }).filter(Boolean);
  const w = (s) => (s.match(/[\p{L}\p{N}]+/gu) || []).length;
  const out = []; const gesehen = new Set();
  for (let i = 0; i + 1 < z.length; i++) {
    const a = z[i], b = z[i + 1];
    if (a.t.startsWith('- ') || b.t.startsWith('- ')) continue;
    const titelOk = !/\?\s*$/.test(a.t) && ['h2', 'h3', 'h4', 'h5', 'p', 'span', 'strong', 'dt', 'li'].includes(a.tag) && w(a.t) >= 1 && w(a.t) <= 8 && a.t.length <= 70 && !NAV.test(a.t);
    const textOk = ['p', 'li', 'dd', 'span'].includes(b.tag) && w(b.t) >= 6 && b.t.length <= 320 && b.t !== a.t;
    if (!titelOk || !textOk) continue;
    const k = a.t.toLowerCase();
    if (gesehen.has(k)) continue;
    gesehen.add(k);
    out.push({ titel: a.t, zitat: b.t, quelle, status: 'kandidat' });
    i++;
  }
  return out;
}

// ---------- Öffentliche Demo / Live-Ansicht ----------
// Zählt nur, was ohne Login und ohne Formular sichtbar ist. Punkte: 3 = ausdrücklich Demo/Live/Playground, 1 = „Dashboard“.
const DEMO_STARK = /\b(live[\s-]?demo|view (the )?(live )?demo|try (the )?demo|see (it )?live|demo ansehen|live[\s-]?ansicht|playground|sandbox|interactive demo|public dashboard|öffentliche[sr]? (demo|dashboard))\b/i;
const DEMO_SCHWACH = /\b(demo|dashboard|example|beispiel|showcase|preview|vorschau)\b/i;
const DEMO_NIE = /\b(book|request|schedule|get a|anfragen|buchen|vereinbaren|contact|kontakt|sales|call|trial|sign ?up|register|log ?in|anmelden|registrieren|pricing|preise|my|mein|meine|account|konto)\b/i;
const DEMO_NIE_PFAD = /(login|signin|sign-in|signup|sign-up|register|contact|kontakt|book|calendly|hubspot|typeform|pricing|account|\/sites\b)/i;
function demoKandidaten(html, basis) {
  const out = new Map();
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi; let m;
  const domain = basis.hostname.split('.').slice(-2).join('.');
  while ((m = re.exec(html || ''))) {
    const href = (m[1].match(/\bhref=["']([^"'#]+)["']/i) || [])[1];
    if (!href || /^(mailto|tel|javascript):/i.test(href)) continue;
    const text = entities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const knopf = (m[1].match(/button:\s*'([^']+)'/) || [])[1] || '';
    const alles = `${text} ${knopf}`;
    let u; try { u = new URL(href, basis); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || !(u.hostname === basis.hostname || u.hostname.endsWith('.' + domain))) continue;
    if (DEMO_NIE.test(alles) || DEMO_NIE_PFAD.test(u.pathname)) continue;
    const punkte = DEMO_STARK.test(alles) ? 3 : DEMO_SCHWACH.test(alles) || /demo/i.test(u.pathname) ? 1 : 0;
    if (!punkte || u.href === basis.href) continue;
    const alt = out.get(u.href);
    out.set(u.href, { url: u.href, text: (alt && alt.text.length > text.length ? alt.text : text).slice(0, 80), punkte: Math.max(punkte, alt?.punkte || 0), nennungen: (alt?.nennungen || 0) + 1 });
  }
  return [...out.values()].sort((a, b) => b.punkte - a.punkte || b.nennungen - a.nennungen);
}
async function holeDemo(url) {
  let u; try { u = new URL(url, start); } catch { log(`--demo übersprungen (keine URL): ${url}`); return null; }
  const r = await robotsErlaubt(u);
  if (!r.erlaubt) { log(`Demo nicht geholt: ${r.grund}`); return null; }
  const c = capture(u);
  if (!c) return null;
  const txt = existsSync(join(c.dir, 'extracted/visible-text.txt')) ? readFileSync(join(c.dir, 'extracted/visible-text.txt'), 'utf8') : '';
  const html = existsSync(join(c.dir, 'extracted/page.html')) ? readFileSync(join(c.dir, 'extracted/page.html'), 'utf8') : '';
  const g = sperreErkannt({ status: c.httpStatus || 200, text: txt, html });
  if (g) { log(`Demo nicht nutzbar (${g}): ${u}. Nicht umgangen.`); return null; }
  const sd = join(c.dir, 'screenshots'); const neu = [];
  if (existsSync(sd)) {
    mkdirSync(join(PROD, 'screens'), { recursive: true });
    for (const f of readdirSync(sd).sort()) {
      if (/^(scroll-\d+|full-page)\.png$/i.test(f)) { copyFileSync(join(sd, f), join(PROD, 'screens', `demo-${f}`)); neu.push(`produkt/screens/demo-${f}`); }
    }
  }
  log(`Demo geholt: ${u} (${neu.length} Screens nach produkt/screens/demo-*)`);
  return { url: u.href, screens: neu };
}

// ---------- Ablauf ----------
if (opt.demo && existsSync(join(PROD, 'quelle.json'))) {
  // Produktseite ist schon gelesen: nur die Demo holen (Station 3)
  const dj = lies(join(PROD, 'demo.json'), { kandidaten: [] }) || { kandidaten: [] };
  const d = await holeDemo(opt.demo);
  writeFileSync(join(PROD, 'demo.json'), JSON.stringify({ ...dj, gelesen: d ? d.url : null, screens: d ? d.screens : [], zeit: jetzt.toISOString() }, null, 2) + '\n');
  if (!d) process.exit(3);
  console.log(`✓ Demo: ${d.url} · ${d.screens.length} Screens (produkt/screens/demo-*). Nächster Schritt: node <skill-dir>/scripts/navi.mjs pruefen`);
  process.exit(0);
}
const rob = await robotsErlaubt(start);
log(`robots: ${rob.grund}`);
if (!rob.erlaubt) { schreibeFehlt(rob.grund, String(start)); process.exit(3); }

let cap = null;
if (!opt.ohneCapture) cap = capture(start);

let seite = { status: cap?.httpStatus || 0, html: '', url: String(start) };
try { seite = await holeHtml(start); } catch (e) { if (!cap) { schreibeFehlt(`Seite nicht erreichbar (${e.message})`, String(start)); process.exit(3); } }
let text = cap && existsSync(join(cap.dir, 'extracted/visible-text.txt')) ? readFileSync(join(cap.dir, 'extracted/visible-text.txt'), 'utf8') : htmlZuText(seite.html);
const capHtml = cap && existsSync(join(cap.dir, 'extracted/page.html')) ? readFileSync(join(cap.dir, 'extracted/page.html'), 'utf8') : seite.html;
const gesperrt = sperreErkannt({ status: cap?.httpStatus || seite.status, text, html: capHtml });
if (gesperrt) { schreibeFehlt(gesperrt, String(start)); process.exit(3); }

const tok = cap ? lies(join(cap.dir, 'extracted/tokens.json'), {}) : {};
const titel = (tok.title || (seite.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || start.hostname).replace(/\s+/g, ' ').trim();
const beschreibung = tok.description || meta(seite.html, 'description') || meta(seite.html, 'og:description');
const h1 = (tok.headings || []).find((h) => h.level === 1)?.text || (text.match(/^\[h1\]\s*(.+)$/m) || [])[1] || null;
const name = titel.split(/\s[|·–-]\s/)[0].trim();

let funktionen = funktionenAus(text, String(start)).slice(0, opt.auch.length ? 14 : 24);
const seitenText = [`=== ${String(start)}`, text.trim()];
for (const u of opt.auch) {
  let x; try { x = new URL(u, start); } catch { log(`--auch übersprungen (keine URL): ${u}`); continue; }
  if (x.host !== start.host) { log(`--auch übersprungen (andere Domain): ${x}`); continue; }
  const r2 = await robotsErlaubt(x);
  if (!r2.erlaubt) { log(`--auch übersprungen: ${r2.grund}`); continue; }
  try {
    const s2 = await holeHtml(x); const t2 = htmlZuText(s2.html);
    const g2 = sperreErkannt({ status: s2.status, text: t2, html: s2.html });
    if (g2) { log(`--auch übersprungen (${g2}): ${x}`); continue; }
    seitenText.push(`\n=== ${x}`, t2);
    funktionen.push(...funktionenAus(t2, String(x)).filter((f) => !funktionen.some((g) => g.titel.toLowerCase() === f.titel.toLowerCase())));
  } catch (e) { log(`--auch nicht erreichbar: ${x} (${e.message})`); }
}
funktionen = funktionen.slice(0, 24);
writeFileSync(join(PROD, 'seite.txt'), seitenText.join('\n') + '\n');

// Screens und Bilder
const screens = [], bilder = [];
if (cap) {
  const sd = join(cap.dir, 'screenshots');
  if (existsSync(sd)) {
    mkdirSync(join(PROD, 'screens'), { recursive: true });
    for (const f of readdirSync(sd).sort()) {
      if (/^scroll-\d+\.png$/i.test(f)) { copyFileSync(join(sd, f), join(PROD, 'screens', f)); screens.push(`produkt/screens/${f}`); }
      if (f === 'contact-sheet.jpg') { copyFileSync(join(sd, f), join(PROD, 'screens', 'uebersicht.jpg')); }
    }
  }
  const ad = join(cap.dir, 'assets');
  if (existsSync(ad)) {
    for (const f of readdirSync(ad)) {
      const p = join(ad, f);
      if (/\.(png|jpe?g|webp)$/i.test(f) && !/contact-sheet|icon|favicon/i.test(f) && statSync(p).size > 30 * 1024) {
        mkdirSync(join(PROD, 'bilder'), { recursive: true }); copyFileSync(p, join(PROD, 'bilder', f)); bilder.push(`produkt/bilder/${f}`);
      }
    }
  }
}

// Öffentliche Demo: suchen (immer), holen (--demo oder eindeutiger Treffer mit 3 Punkten)
const kandidaten = demoKandidaten(capHtml + '\n' + seite.html, new URL(seite.url || String(start)));
let demo = null;
if (!opt.keineDemo && !opt.ohneCapture) {
  const ziel = opt.demo || (kandidaten[0]?.punkte >= 3 ? kandidaten[0].url : null);
  if (ziel) demo = await holeDemo(ziel);
}
writeFileSync(join(PROD, 'demo.json'), JSON.stringify({ _hinweis: 'Öffentliche Demo/Live-Ansicht des Produkts (ohne Login, ohne Formular). Station 3 zählt produkt/screens/demo-* als echtes Material.', kandidaten: kandidaten.slice(0, 6), gelesen: demo ? demo.url : null, screens: demo ? demo.screens : [], zeit: jetzt.toISOString() }, null, 2) + '\n');

const marke = markeAus({ cap, html: seite.html, url: String(start), name });
// Bestätigte Marke nie überschreiben; gesichtete Funktionen behalten ihren Status
const alteMarke = lies(join(PROD, 'marke.json'));
const markeZiel = alteMarke && alteMarke.geprueft === true ? 'marke.neu.json' : 'marke.json';
if (markeZiel !== 'marke.json') log('marke.json ist bestätigt (geprueft: true) und bleibt; neue Ableitung in produkt/marke.neu.json');
writeFileSync(join(PROD, markeZiel), JSON.stringify(marke, null, 2) + '\n');
const alt = new Map(((lies(join(PROD, 'funktionen.json'), {}) || {}).funktionen || []).filter((f) => f.status && f.status !== 'kandidat').map((f) => [String(f.titel).toLowerCase(), f]));
funktionen = funktionen.map((f) => (alt.has(f.titel.toLowerCase()) ? { ...f, status: alt.get(f.titel.toLowerCase()).status } : f));
for (const [k, f] of alt) if (!funktionen.some((g) => g.titel.toLowerCase() === k)) funktionen.push(f); // vom Nutzer ergänzte bleiben
const pm = pruefeMarke(marke);
const kern = { satz: h1 || beschreibung, beschreibung, quelle: String(start) };
writeFileSync(join(PROD, 'funktionen.json'), JSON.stringify({
  _hinweis: 'Kandidaten von der Seite. Sichten: status "belegt" (Zitat trägt die Funktion), "nutzer" (vom Nutzer bestätigt, Quelle „Nutzer, <Datum>“) oder "verworfen". Station 2 braucht mindestens 3 belegte. Nichts erfinden.',
  kern, funktionen,
}, null, 2) + '\n');
const zelle = (s) => String(s || '').replace(/\|/g, '/').replace(/\n/g, ' ');
writeFileSync(join(PROD, 'funktionen.md'), [
  `# Funktionen (Kandidaten) · ${name}`, '',
  `Quelle: ${start} · gelesen ${jetzt.toLocaleString('de-DE')} · Kern: „${zelle(kern.satz)}“`, '',
  '| # | Funktion | Beleg (Zitat) | Quelle | Status |', '|---|---|---|---|---|',
  ...funktionen.map((f, i) => `| ${i + 1} | ${zelle(f.titel)} | „${zelle(f.zitat)}“ | ${f.quelle} | ${f.status} |`), '',
].join('\n'));
writeFileSync(join(PROD, 'quelle.json'), JSON.stringify({ url: String(start), auch: opt.auch, zeit: jetzt.toISOString(), httpStatus: cap?.httpStatus || seite.status, robots: rob.grund, capture: cap ? cap.dir.replace(LAUF + '/', '') : null }, null, 2) + '\n');

const fehlt = [];
if (funktionen.length < 3) fehlt.push('weniger als 3 Funktionen auf der Seite erkannt: Nutzer nach 3 bis 6 Funktionen mit Quelle fragen oder `--auch <url>` mit der Feature-Seite');
if (!marke.logo) fehlt.push('Logo als SVG (assets/logo/)');
fehlt.push(demo ? `eigene Screens aus dem Produkt (die öffentliche Demo ${demo.url} zeigt Beispieldaten): 3 bis 5 PNG nach assets/screens/ machen es noch konkreter`
  : 'echte Screens aus dem Produkt (Website-Screens zeigen das Marketing, nicht die App): 3 bis 5 PNG nach assets/screens/'
    + (kandidaten.length ? `; mögliche öffentliche Demo: ${kandidaten[0].url} („${kandidaten[0].text}“), holen mit --demo <url>` : ''));
writeFileSync(join(PROD, 'PRODUKT.md'), [
  `# Produkt · ${name}`, '',
  `Gelesen: ${jetzt.toLocaleString('de-DE')} · Seite: ${start} · ${rob.grund} · Weg: ${cap ? 'hyperframes capture + Seitentext' : 'nur HTML-Text'}`, '',
  `**Kern-Satz (Seite):** „${zelle(kern.satz)}“${beschreibung && beschreibung !== kern.satz ? `  \n**Beschreibung:** „${zelle(beschreibung)}“` : ''}`, '',
  `## Funktionen (${funktionen.length} Kandidaten, Liste: funktionen.md)`, '',
  ...funktionen.slice(0, 8).map((f) => `- **${zelle(f.titel)}**: „${zelle(f.zitat)}“`), '',
  '## Marke (abgeleitet, im Vorschlag bestätigen)', '',
  `- Hintergrund ${marke.farben.hintergrund} · Tinte ${marke.farben.tinte} · Akzent ${marke.farben.akzent}${marke.farben.gedaempft ? ` · gedämpft ${marke.farben.gedaempft}` : ''}`,
  `- Schrift: ${marke.schrift.familie}${marke.schrift.kandidat ? ` (Datei-Kandidat: ${marke.schrift.kandidat}, Lizenz prüfen)` : ''}`,
  `- Logo: ${marke.logo || 'fehlt'}`,
  ...[...marke.hinweise, ...pm.hinweise.filter((h) => !/geprueft/.test(h))].map((h) => `- Hinweis: ${h}`), '',
  `## Screens und Bilder`, '', `- ${screens.length} Seiten-Screens in produkt/screens/ (Übersicht: produkt/screens/uebersicht.jpg)`, `- ${bilder.length} Bilder in produkt/bilder/`,
  `- Öffentliche Demo: ${demo ? `${demo.url}, ${demo.screens.length} Screens (produkt/screens/demo-*)` : kandidaten.length ? `nicht geholt, Kandidaten: ${kandidaten.slice(0, 3).map((k) => `${k.url} („${zelle(k.text)}“)`).join(', ')}` : 'keine gefunden'}`, '',
  '## Was noch fehlt', '', ...fehlt.map((f) => `- ${f}`), '',
  '## Nächster Schritt', '', 'Kandidaten in funktionen.json sichten (status belegt/nutzer/verworfen), Marke ansehen, dann `node <skill-dir>/scripts/navi.mjs pruefen`.', '',
].join('\n'));

console.log(`✓ Produkt gelesen: ${name}`);
console.log(`  Funktionen: ${funktionen.length} Kandidaten (produkt/funktionen.md) · Marke: ${marke.farben.hintergrund} / ${marke.farben.tinte} / Akzent ${marke.farben.akzent}, Schrift ${marke.schrift.familie} · Logo: ${marke.logo || 'fehlt'} · Screens: ${screens.length} · Demo: ${demo ? `${demo.url} (${demo.screens.length} Screens)` : kandidaten.length ? `Kandidat ${kandidaten[0].url}` : 'keine'}`);
for (const f of fehlt) console.log(`  fehlt: ${f}`);
console.log(`  Übersicht: ${join(PROD, 'PRODUKT.md')}`);
