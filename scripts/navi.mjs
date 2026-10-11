#!/usr/bin/env node
// navi.mjs: der Navigator des Skills motion-videos. Führt jeden Lauf durch neun feste Stationen und lässt erst weiter,
// wenn die Schwelle der Station erfüllt ist. Teil des Skills motion-videos (MIT). Node 18+, keine Abhängigkeiten.
//
// Aufruf (Lauf-Ordner wird gefunden: --lauf <pfad>, sonst ./navi.json, ../navi.json, motion-runs/*/navi.json, */*/navi.json):
//   node navi.mjs init <lauf> [--profi] [--regie voll|spar] [--budget <usd>] [--vorbild <url|datei>] [--produkt <url>] [--titel "<Titel>"]
//                                             --regie: voll (Standard) = 3 gebündelte Kritiker, 2 Runden vor v1 plus eine
//                                             Prüfrunde nach dem Ton; spar = 1 Kritiker mit allen Linsen, 1 Runde
//                                             --budget: Kostendeckel in $ (Claude-Nutzung); Station 6 stoppt beim Erreichen
//   node navi.mjs status   [--json]          eine Zeile „Station X von 9 …, nächster Schritt …“ + Ampel je Station
//   node navi.mjs kosten   [--laenge <s>]     Kostenplan in $ je Phase für voll und spar (für Erste Antwort und Vorschlag)
//   node navi.mjs budget   <usd> ["<Wortlaut des Nutzers>"]   Budget setzen oder nach Rückfrage erhöhen
//   node navi.mjs pruefen  [--station N] [--messen]
//                                             prüft die maschinellen Schwellen der aktuellen Station; --messen startet
//                                             fehlende Messungen (qualitaet.py) selbst, unter der Render-Sperre
//   node navi.mjs weiter   [--hoertest-offen "<Grund>"]
//                                             nur bei Grün (Gelb mit Vermerk); sonst: was fehlt und wie man es behebt
//   node navi.mjs go "<Wortlaut des Nutzers>"  hält das Go (Station 4) bzw. die Abnahme (Station 8) wörtlich fest
//   node navi.mjs ueberspringen <N> --grund "<Grund>"   (Profis; wird im Manifest vermerkt)
//   node navi.mjs zurueck <vN>                holt Version vN zurück (sichert den Stand davor als eigene Version)
//   node navi.mjs zurueck <N>                 springt zurück auf Station N (spätere Stationen wieder offen)
//   node navi.mjs modus einsteiger|profi
//   node navi.mjs regie voll|spar              Regie-Schleife umstellen (wird im Manifest vermerkt)
// Zustand: <lauf>/navi.json. Jeder Wechsel schreibt eine Zeile unter „## Navigator“ in <lauf>/MANIFEST.md.
// Eine neue Sitzung beginnt mit `node navi.mjs status` und macht dort weiter.
// Exit: 0 ok/grün · 1 Schwelle nicht erfüllt · 2 Aufruf/kein Lauf
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve, dirname, join, basename, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pruefeMarke } from './marke-tokens.mjs';
import { szenenAusVorschlag, platzhalter, woerter, ohneKommentare } from './vorschlag-lesen.mjs';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const S = (p) => join(SKILL, p);
const jetzt = () => new Date();
const zeitDe = (d = jetzt()) => d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ---------------------------------------------------------------- Stationen
// tut = was der Skill hier macht · schwelle = „weiter erst, wenn …“ · warum = belegte Ursache guter Ergebnisse
const STATIONEN = [
  { nr: 1, name: 'Vorbild', tut: 'Vorbild holen und vermessen: Frames mit Zeit, Shot-Spec, Ton-Analyse, Kennzahlen (Maßstab).',
    schwelle: 'Vorbild-Datei, Zeitliste, Shot-Spec und Kennzahlen liegen vor.',
    warum: 'Ein starkes Vorbild, gemessen statt nachempfunden, war der größte Qualitätshebel; ohne Vorbild wurde der Film sauber, aber schlicht.',
    refs: 'references/01-referenz-gate.md §0, references/02-analyse.md', ueberspringbar: true,
    beimUeberspringen: 'Ohne Vorbild wird der Film schlichter. Im Vorschlag kommen 2 bis 3 Stil-Richtungen als Standbilder; die absoluten Werte aus 09-qualitaets-dna.md gelten als Pflicht.' },
  { nr: 2, name: 'Produkt', tut: 'Produktseite lesen: Funktionen mit Beleg (Zitat + URL), Marke (Farben, Schrift, Logo), Screens.',
    schwelle: 'Marke vollständig (Farben, Schrift) und mindestens 3 Funktionen belegt (Zitat + Quelle, gesichtet).',
    warum: 'Wahrheit vor Wirkung: Der Film zeigt nur, was es gibt. Belegte Funktionen verhindern erfundene Szenen.',
    refs: 'scripts/produkt-lesen.mjs, references/01-referenz-gate.md §1 und §2', ueberspringbar: true,
    beimUeberspringen: 'Ohne gelesene Produktseite braucht Station 4 trotzdem belegte Funktionen (vom Nutzer) und eine Marke (templates/marke.vorlage.json).' },
  { nr: 3, name: 'Material', tut: 'Öffentliche Demo oder Live-Ansicht des Produkts holen, Material zählen (echte Screens, Logo, Produktbilder, Beispieldaten, Belege), Ersatz-Bildwelten für Foto-, Menschen- und Geräte-Szenen des Vorbilds planen; unter der Schwelle gezielt 3 bis 5 Screenshots anfragen.',
    schwelle: 'Material-Score mindestens 7 von 10.',
    warum: 'Echtes Material statt Platzhalter: Filme mit echten Screens wirkten konkret, nachempfundene Oberflächen generisch.',
    refs: 'references/01-referenz-gate.md §3', ueberspringbar: true,
    beimUeberspringen: 'Bewusst ohne eigenes Material: Der Film baut Oberflächen nach und wirkt generischer. Im Vorschlag so sagen.' },
  { nr: 4, name: 'Vorschlag', tut: 'Film im Chat vorschlagen: Szene für Szene (Vorbild-Beat, Funktion mit Beleg, Aussage ≤ 6 Wörter, Bildwelt, Bildidee), Marke, Ton, Länge, Standbilder aus echtem Material, offene Fakten, Kosten in $ je Stufe (navi kosten) mit Wahl der Regie-Schleife (voll oder spar); dann EIN Go und das Budget.',
    schwelle: 'VORSCHLAG.md vollständig, jede Aussage ≤ 6 Wörter, jede Szene belegt und mit Bildwelt (höchstens ein Drittel Kachel), 2 bis 4 Standbilder, Budget gesetzt, Go des Nutzers festgehalten.',
    warum: 'Reduktion: ein Feature pro Beat. Der Nutzer sieht den Film, bevor gebaut wird, und korrigiert mit einem Satz.',
    refs: 'templates/vorschlag.vorlage.md, references/03-blueprint-und-wahrheit.md, references/04-routen-und-werkzeuge.md', ueberspringbar: 'nur-mit-go',
    beimUeberspringen: 'Ohne Vorschlag gebaut (Profi). Das Go ist trotzdem festgehalten.' },
  { nr: 5, name: 'Probe', tut: 'Erste Sekunden plus eine Aussage-Szene bauen, gegen das Vorbild messen, eigene Mängel vor dem Zeigen beheben.',
    schwelle: 'Probe gerendert und gemessen: kein ★-Kriterium rot, höchstens zwei andere rot.',
    warum: 'Qualität als feste Zahlen: Stand, Drift, Lesetext und Bildfüllung werden gemessen, nicht gefühlt.',
    refs: 'references/05-bau-probe-parallel.md §1, references/09-qualitaets-dna.md', ueberspringbar: true,
    beimUeberspringen: 'Ohne Probe gebaut: Typo-System und Maßstab werden erst am ganzen Film sichtbar.' },
  { nr: 6, name: 'Bau + Regie', tut: 'Bibliothek, Ereignisliste, Blöcke parallel; danach Regie-Schleife: Kritik-Runden gegen Vorbild und Zahlen, Rückweg zur besten Version.',
    schwelle: 'Film gerendert, Ereignisliste da, Messung vollständig (mit R4 Lesetext), Bild-Kriterien R1 bis R8 bestanden, Version gesichert, Regie-Runden erfüllt, Kosten je Runde eingetragen, Budget nicht erreicht.',
    warum: 'Kritik-Runden mit Rückweg zur besten Version: Gestapelte Revisionen machten den Film schlechter, die zurückgeholte beste Version wurde abgenommen.',
    refs: 'references/05-bau-probe-parallel.md §2 bis §4, references/10-regie-schleife.md, references/11-einwand-katalog.md', ueberspringbar: false },
  { nr: 7, name: 'Ton', tut: 'Ton im Stil des Vorbilds: Musik nach Takt-Regeln, Effekte aus der Ereignisliste, natürliches Ende, Hörtest von außen.',
    schwelle: 'audio.html gebaut, R9 und R10 bestanden, Hörtest nach dem letzten Render (Hauptmodell; Ersatzmodell nur mit Vermerk).',
    warum: 'Ohr von außen: Messwerte waren grün, während das Ende hörbar abriss; erst der Hörtest fand es.',
    refs: 'references/06-ton.md', ueberspringbar: true,
    beimUeberspringen: 'Film ohne Ton: Stand höchstens „Bild fertig“.' },
  { nr: 8, name: 'Abnahme', tut: 'Geführte Abnahme: Rubrik R1 bis R12 auf der Web-Kopie, dann feste Fragen an den Nutzer; seine Antwort wörtlich festhalten.',
    schwelle: 'Rubrik auf der Web-Kopie bestanden und Abnahme des Nutzers festgehalten.',
    warum: 'Auge von außen: Der Nutzer sieht, was keine Messung findet; feste Fragen machen vages Feedback konkret.',
    refs: 'references/07-qa.md, templates/abnahme-fragen.md', ueberspringbar: true,
    beimUeberspringen: 'Ohne geführte Abnahme ausgeliefert: Stand höchstens „Entwurf“.' },
  { nr: 9, name: 'Auslieferung', tut: 'Web-Kopie je Fassung (< 30 MB, faststart), Version gesichert, Kosten im Manifest, Antwort nach templates/auslieferung.vorlage.md.',
    schwelle: 'Web-Kopie < 30 MB mit faststart, Version nach dem letzten Render gesichert, Modellkosten-Summe im Manifest.',
    warum: 'Beste Version gesichert und Zahlen offen: Jede Lieferung ist wiederherstellbar und vergleichbar.',
    refs: 'references/07-qa.md, templates/auslieferung.vorlage.md', ueberspringbar: false },
];
const STN = Object.fromEntries(STATIONEN.map((s) => [s.nr, s]));

// ---------------------------------------------------------------- Kostenplan (Claude-Nutzung in $, Opus-Listenpreise)
// Kalibriert an drei Messläufen (09. bis 11.10.2026, Kosten laut Client): A 35,61 $ (30,8-s-Film, ohne Regie-Schleife),
// B 12,82 $ (15,9 s, ohne Vorbild, ohne Regie), C 95,76 $ (41,4 s, Regie voll mit 4 Runden und 25 Kritikern). C je Phase:
// Analyse 6,5 · Vorschlag 1,0 · Probe 9,0 · Bau 18,5 · Regie 48,8 (4 Runden à 10 bis 14) · Ton 9,3 · Abnahme 2,7.
// Die Planwerte unten setzen die Deckel aus references/10-regie-schleife.md und templates/agent-prompts.md voraus
// (Rundenzahl, gebündelte Kritiker, Turn- und Bild-Deckel je Agent); Bau wächst mit der Filmlänge.
const PLAN = {
  voll: { analyse: 3.5, vorschlag: 1, probe: 4, bauJeS: 0.36, regie: 16, ton: 3.5, abschluss: 1 },
  spar: { analyse: 2, vorschlag: 1, probe: 3, bauJeS: 0.26, regie: 4, ton: 1.5, abschluss: 0.5 },
};
const PHASEN = [['analyse', 'Stationen 1 bis 3 (Vorbild, Produkt, Material)'], ['vorschlag', 'Station 4 Vorschlag'], ['probe', 'Station 5 Probe'],
  ['bau', 'Station 6 Bau (Blöcke)'], ['regie', 'Station 6 Regie-Schleife'], ['ton', 'Station 7 Ton'], ['abschluss', 'Stationen 8 und 9']];
function kostenPlan(regie, laenge) {
  const p = PLAN[regie] || PLAN.voll; const L = Math.max(5, laenge || 40);
  const teile = { ...p, bau: +(p.bauJeS * Math.max(0, L - 10)).toFixed(1) }; delete teile.bauJeS;
  const summe = PHASEN.reduce((s, [k]) => s + teile[k], 0);
  return { teile, summe: Math.ceil(summe), von: Math.round(summe * 0.75), laenge: L };
}
const dollar = (x) => `${(Math.round(x * 10) / 10).toLocaleString('de-DE')} $`;
/** Kosten bisher aus MANIFEST.md, Abschnitt „Modellkosten je Phase“: je Zeile die erste Zahl vor „$“ (ohne Summe). */
function kostenBisher(lauf) {
  const p = join(lauf, 'MANIFEST.md');
  if (!ex(p)) return { summe: 0, zeilen: [], ohneDollar: [] };
  const z = readFileSync(p, 'utf8').split('\n');
  const kopf = z.findIndex((x) => /^## Modellkosten/.test(x.trim()));
  if (kopf < 0) return { summe: 0, zeilen: [], ohneDollar: [] };
  const zeilen = [], ohneDollar = [];
  for (let i = kopf + 1; i < z.length && !/^## /.test(z[i]); i++) {
    const s = z[i].trim();
    if (!s.startsWith('|') || /^\|\s*:?-/.test(s) || /^\|\s*Phase\b/i.test(s) || /\*\*Summe\*\*|\bBudget\b/i.test(s)) continue;
    const c = s.replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
    const m = (c[1] || '').match(/(\d+(?:[.,]\d+)?)\s*\$/);
    if (m) zeilen.push({ phase: c[0], usd: parseFloat(m[1].replace(',', '.')) });
    else if (c[1] && !/^(unbekannt|–|-)?$/i.test(c[1])) ohneDollar.push(c[0]);
  }
  return { summe: zeilen.reduce((s, x) => s + x.usd, 0), zeilen, ohneDollar };
}
function filmLaenge(lauf, z) {
  const b = String(z.eingaben?.brief || '').match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?/);
  if (b) return parseFloat((b[2] || b[1]).replace(',', '.'));
  const q = json(join(lauf, 'analyse/kennzahlen-referenz/qualitaet.json'));
  return q?.roh?.dauer ? +q.roh.dauer : null;
}

// ---------------------------------------------------------------- Aufruf
const argv = process.argv.slice(2);
let LAUF_ARG = null;
{ const i = argv.indexOf('--lauf'); if (i >= 0) { LAUF_ARG = argv[i + 1]; argv.splice(i, 2); } }
const cmd = argv[0];
const flag = (n) => argv.includes(n);
const wert = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'hilfe') {
  const kopf = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1); // Kopfkommentar bis zur ersten Codezeile
  console.log(kopf.slice(0, kopf.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(cmd ? 0 : 2);
}

// ---------------------------------------------------------------- Hilfen Dateien
const ex = (p) => existsSync(p);
const groesse = (p) => { try { return statSync(p).size; } catch { return 0; } };
const mzeit = (p) => { try { return statSync(p).mtimeMs; } catch { return 0; } };
const dateien = (dir, re = /./) => { try { return readdirSync(dir).filter((f) => re.test(f)).map((f) => join(dir, f)).filter((p) => statSync(p).isFile()); } catch { return []; } };
const ordner = (dir) => { try { return readdirSync(dir).map((f) => join(dir, f)).filter((p) => statSync(p).isDirectory()); } catch { return []; } };
const neueste = (liste) => liste.slice().sort((a, b) => mzeit(b) - mzeit(a))[0] || null;
const json = (p, f = null) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return f; } };
const BILD = /\.(png|jpe?g|webp|heic|gif)$/i;
function suche(dir, re, tiefe = 3) {
  const out = [];
  const lauf = (d, t) => { let e; try { e = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const x of e) { if (x.name === 'node_modules' || x.name === 'versionen' || x.name.startsWith('.')) continue;
      const p = join(d, x.name); if (x.isDirectory()) { if (t > 0) lauf(p, t - 1); } else if (re.test(x.name)) out.push(p); } };
  lauf(dir, tiefe); return out;
}

// ---------------------------------------------------------------- Lauf finden, Zustand
function findeLauf() {
  if (LAUF_ARG) return resolve(LAUF_ARG);
  const cwd = process.cwd();
  for (const k of [cwd, dirname(cwd)]) if (ex(join(k, 'navi.json'))) return k;
  const kandidaten = [...ordner(join(cwd, 'motion-runs')), ...ordner(cwd).flatMap((d) => ordner(d))].filter((d) => ex(join(d, 'navi.json')));
  const n = neueste(kandidaten.map((d) => join(d, 'navi.json')));
  return n ? dirname(n) : null;
}
const NAME = (lauf) => basename(lauf);
function ladeZustand(lauf) { return json(join(lauf, 'navi.json')); }
function speichere(lauf, z) { z.geaendert = jetzt().toISOString(); writeFileSync(join(lauf, 'navi.json'), JSON.stringify(z, null, 2) + '\n'); }
function manifestZeile(lauf, text) {
  const p = join(lauf, 'MANIFEST.md');
  const zeile = `- ${zeitDe()} · ${text}`;
  let t = ex(p) ? readFileSync(p, 'utf8') : '# Manifest\n';
  const z = t.split('\n');
  const kopf = z.findIndex((x) => /^## Navigator\b/.test(x.trim()));
  if (kopf < 0) {
    const stand = z.findIndex((x) => /^## Stand und nächster Schritt/.test(x.trim()));
    const block = ['## Navigator', '<!-- Schreibt scripts/navi.mjs bei jedem Wechsel. Stand jederzeit: node <skill-dir>/scripts/navi.mjs status -->', zeile, ''];
    if (stand >= 0) z.splice(stand, 0, ...block); else z.push('', ...block);
  } else {
    let ende = z.findIndex((x, i) => i > kopf && /^## /.test(x)); if (ende < 0) ende = z.length;
    let pos = ende; while (pos - 1 > kopf && z[pos - 1].trim() === '') pos--;
    z.splice(pos, 0, zeile);
  }
  writeFileSync(p, z.join('\n'));
}
function verlauf(z, aktion, text) { (z.verlauf ||= []).push({ zeit: jetzt().toISOString(), aktion, text }); }

// ---------------------------------------------------------------- Messergebnisse lesen
const RENDERS = (lauf) => join(lauf, 'film/renders');
function qualiFuer(film) {
  // Standardort <film>_qualitaet/ neben dem Render, dazu jede Messung im Lauf (z. B. regie/rK/qualitaet/), die laut
  // roh.film denselben Render gemessen hat; die neueste gilt.
  const d = dirname(film), stem = basename(film, extname(film));
  const lauf = film.includes('/film/renders/') ? film.slice(0, film.indexOf('/film/renders/')) : dirname(d);
  const treffer = [join(d, `${stem}_qualitaet`, 'qualitaet.json'), ...suche(lauf, /^qualitaet\.json$/, 5)]
    .filter((p, i, l) => ex(p) && l.indexOf(p) === i)
    .filter((p) => p === join(d, `${stem}_qualitaet`, 'qualitaet.json') || basename(String(json(p, {})?.roh?.film || '')) === basename(film));
  return neueste(treffer);
}
/** Alle Messungen desselben Renders, die jünger als der Render sind, zu einer Zeilenliste vereint: je Kriterium gilt die
 *  neueste Messung. So zählt eine spätere Teilmessung (z. B. nur --ton) nicht als „R4 nicht rot“, nur weil sie R4 nicht misst. */
function qualiVereint(film) {
  const d = dirname(film), stem = basename(film, extname(film));
  const lauf = film.includes('/film/renders/') ? film.slice(0, film.indexOf('/film/renders/')) : dirname(d);
  const eigen = join(d, `${stem}_qualitaet`, 'qualitaet.json');
  const alle = [eigen, ...suche(lauf, /^qualitaet\.json$/, 5)].filter((p, i, l) => ex(p) && l.indexOf(p) === i)
    .filter((p) => p === eigen || basename(String(json(p, {})?.roh?.film || '')) === basename(film))
    .filter((p) => mzeit(p) >= mzeit(film)).sort((a, b) => mzeit(a) - mzeit(b));
  const nachKey = new Map();
  for (const p of alle) for (const x of json(p, {}).zeilen || []) nachKey.set(`${x.r}|${x.kriterium}`, x);
  return { dateien: alle, zeilen: [...nachKey.values()] };
}
function urteil(qpfad, filter = () => true) {
  const q = typeof qpfad === 'string' ? json(qpfad, { zeilen: [] }) : qpfad;
  const z = (q.zeilen || []).filter(filter);
  const sternRot = z.filter((x) => x.r.includes('★') && x.status === '✗');
  const andereRot = z.filter((x) => !x.r.includes('★') && x.status === '✗');
  return { ok: sternRot.length === 0 && andereRot.length <= 2, sternRot, andereRot, zeilen: z };
}
const rNr = (x) => parseInt(String(x.r).replace(/\D/g, ''), 10);
function faststart(p) {
  try { const fd = openSync(p, 'r'); const buf = Buffer.alloc(16); let pos = 0; const n = statSync(p).size;
    for (let i = 0; i < 50 && pos < n; i++) { readSync(fd, buf, 0, 16, pos); let size = buf.readUInt32BE(0); const typ = buf.toString('latin1', 4, 8);
      if (typ === 'moov') { closeSync(fd); return true; } if (typ === 'mdat') { closeSync(fd); return false; }
      if (size === 1) size = Number(buf.readBigUInt64BE(8)); if (size < 8) break; pos += size; }
    closeSync(fd); } catch { /* ignore */ }
  return false;
}
function qualiArgs(lauf, film, extra = []) {
  const a = ['python3', S('scripts/qualitaet.py'), film, ...extra];
  if (ex(join(lauf, 'analyse/referenz.mp4'))) a.push('--ref', join(lauf, 'analyse/referenz.mp4'));
  if (ex(join(lauf, 'ereignisse.json'))) a.push('--ereignisse', join(lauf, 'ereignisse.json')); else a.push('--ohne-ereignisse');
  const z = ladeZustand(lauf) || {};
  if (z.eingaben?.brief) a.push('--brief', String(z.eingaben.brief));
  a.push('--sperre', NAME(lauf));
  return a;
}
const qualiBefehl = (lauf, film, extra = []) => qualiArgs(lauf, film, extra).map((x) => (x.startsWith(process.cwd() + '/') ? relative(process.cwd(), x) : x)).map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(' ');
const rel = (lauf, p) => relative(process.cwd(), p) || p;
function filmRenders(lauf) {
  return dateien(RENDERS(lauf), /\.mp4$/i).filter((f) => !/(probe|block|cmp|vergleich|hoertest|_web|-cta|fenster)/i.test(basename(f)));
}

// ---------------------------------------------------------------- Prüfungen je Station
// Eintrag: { text, ok: true|false, pflicht: bool, fix, messen? }
function P(text, ok, fix, extra = {}) { return { text, ok: !!ok, pflicht: true, fix, ...extra }; }
function W(text, ok, fix, extra = {}) { return { text, ok: !!ok, pflicht: false, fix, ...extra }; }

function materialScore(lauf) {
  const a = join(lauf, 'assets'), pr = join(lauf, 'produkt');
  const screens = dateien(join(a, 'screens'), BILD).filter((f) => groesse(f) > 15 * 1024).length;
  const bilder = dateien(join(a, 'bilder'), BILD).length;
  const echt = screens + bilder;
  const demo = dateien(join(pr, 'screens'), /^demo-.*\.(png|jpe?g|webp)$/i).filter((f) => groesse(f) > 15 * 1024).length;
  const logoSvg = [...dateien(join(a, 'logo'), /\.svg$/i), ...dateien(pr, /^logo\.svg$/i)].length > 0;
  const logoPix = dateien(join(a, 'logo'), BILD).length > 0;
  const web = dateien(join(pr, 'screens'), BILD).length > 0 && ex(join(pr, 'seite.txt'));
  const daten = dateien(join(a, 'daten')).length > 0 || dateien(pr, /^beispieldaten\./i).length > 0;
  const fj = json(join(pr, 'funktionen.json'), {}); const fl = (fj.funktionen || []).filter((f) => f.status !== 'verworfen');
  const belegt = fl.filter((f) => ['belegt', 'nutzer'].includes(f.status) && f.zitat && f.quelle).length;
  const teile = [
    { name: 'echte Screens oder Produktbilder (vom Nutzer: assets/screens, assets/bilder; sonst öffentliche Demo: produkt/screens/demo-*)',
      p: echt >= 3 ? 4 : echt >= 1 ? 2 : demo >= 2 ? 2 : demo ? 1 : 0, max: 4, ist: `${echt} vom Nutzer, ${demo} aus der Demo` },
    { name: 'Logo als Datei', p: logoSvg ? 2 : logoPix ? 1 : 0, max: 2, ist: logoSvg ? 'SVG' : logoPix ? 'Bild' : 'fehlt' },
    { name: 'Produktseite gelesen (Screens + Text)', p: web ? 1 : 0, max: 1, ist: web ? 'ja' : 'nein' },
    { name: 'Beispieldaten (assets/daten, produkt/beispieldaten.*)', p: daten ? 1 : 0, max: 1, ist: daten ? 'ja' : 'nein' },
    { name: 'belegte Funktionen (Zitat + Quelle)', p: belegt >= 3 ? 2 : belegt >= 1 ? 1 : 0, max: 2, ist: `${belegt}` },
  ];
  return { punkte: teile.reduce((s, t) => s + t.p, 0), teile, echt, demo };
}

function pruefe(lauf, nr, z) {
  const A = (p) => join(lauf, p);
  switch (nr) {
    case 1: {
      const ref = A('analyse/referenz.mp4');
      const zc = A('analyse/frames/zeiten.csv');
      const spec = dateien(A('analyse'), /^shot-spec.*\.md$/i).filter((f) => groesse(f) > 200);
      const kz = suche(A('analyse'), /^qualitaet\.json$/, 2);
      const kzOk = kz.length > 0 && !(json(kz[0], {}).zeilen || []).some((x) => /^R5/.test(x.r) && /OpenCV|nicht gemessen/i.test(String(x.ist)));
      const holen = z.eingaben?.vorbild ? `bash ${S('scripts/hole-referenz.sh')} "${z.eingaben.vorbild}" ${rel(lauf, lauf)}` : `bash ${S('scripts/hole-referenz.sh')} <url|datei> ${rel(lauf, lauf)}`;
      return [
        P('Vorbild-Datei analyse/referenz.mp4', groesse(ref) > 10 * 1024, `${holen} · YouTube blockt anonym? Bildschirmaufnahme (references/01-referenz-gate.md §0.2), Datei nach analyse/ legen`),
        P('Zeitliste analyse/frames/zeiten.csv', ex(zc) && readFileSync(zc, 'utf8').split('\n').filter(Boolean).length > 2, holen),
        P('Shot-Spec analyse/shot-spec-p*.md', spec.length > 0, 'Vision-Agent nach Vorlage A (templates/agent-prompts.md), Referenz ≤ 30 s: ein Agent'),
        P('Kennzahlen des Vorbilds (Maßstab, mit Bewegung)', kzOk,
          kz.length && !kzOk ? `OpenCV fehlt: bash ${S('scripts/setup_check.sh')} zeigt den Befehl, dann neu messen`
            : `python3 ${S('scripts/qualitaet.py')} ${rel(lauf, ref)} --bewegung --frames --fuellung --ton --ohne-ereignisse --out ${rel(lauf, A('analyse/kennzahlen-referenz'))} --sperre ${NAME(lauf)}`,
          { messen: () => ex(ref) && run(['python3', S('scripts/qualitaet.py'), ref, '--bewegung', '--frames', '--fuellung', '--ton', '--ohne-ereignisse', '--out', A('analyse/kennzahlen-referenz'), '--sperre', NAME(lauf)]) }),
        W('Ton-Analyse analyse/ton-referenz.md', ex(A('analyse/ton-referenz.md')), `node ${S('scripts/ton-referenz.mjs')} ${rel(lauf, ref)} ${rel(lauf, A('analyse/ton-referenz.md'))} (Gemini; Kontingent leer: in Station 7 nachholen)`),
      ];
    }
    case 2: {
      const m = json(A('produkt/marke.json'));
      const pm = m ? pruefeMarke(m) : { fehler: ['produkt/marke.json fehlt'], hinweise: [] };
      const fj = json(A('produkt/funktionen.json'), {}); const fl = fj.funktionen || [];
      const belegt = fl.filter((f) => ['belegt', 'nutzer'].includes(f.status) && f.zitat && f.quelle);
      const kandidaten = fl.filter((f) => f.status === 'kandidat').length;
      const lesen = `node ${S('scripts/produkt-lesen.mjs')} ${z.eingaben?.produkt || '<produkt-url>'} ${rel(lauf, lauf)}`;
      const logo = [...dateien(A('assets/logo')), ...dateien(A('produkt'), /^logo\./i)].length > 0;
      return [
        P('Marke vollständig (produkt/marke.json: Hintergrund, Tinte, Akzent, Schrift)', m && !pm.fehler.length,
          m ? pm.fehler.join('; ') : `${lesen} · ohne Website: templates/marke.vorlage.json nach produkt/marke.json kopieren und aus der Brand-Datei füllen`),
        P(`mindestens 3 belegte Funktionen (jetzt ${belegt.length}; Status belegt oder nutzer, mit Zitat und Quelle)`, belegt.length >= 3,
          fl.length ? `produkt/funktionen.json sichten: status „belegt“ (Zitat von der Seite trägt die Funktion), „nutzer“ (vom Nutzer bestätigt) oder „verworfen“; fehlen welche, den Nutzer fragen (references/01-referenz-gate.md §2)` : lesen),
        W('Kandidaten gesichtet', fl.length > 0 && kandidaten === 0, `${kandidaten} Kandidaten in produkt/funktionen.json haben noch status „kandidat“`),
        W('Logo als Datei', logo, 'Logo als SVG nach assets/logo/ (Nutzer fragen; Website-Logo nur, wenn öffentlich)'),
        ...(m ? pm.hinweise.map((h) => W(h, false, 'im Vorschlag (Station 4) bestätigen lassen und geprueft: true setzen')) : []),
      ];
    }
    case 3: {
      const s = materialScore(lauf);
      const dj = json(A('produkt/demo.json'));
      const demoFix = dj?.kandidaten?.length && !s.demo
        ? `Öffentliche Demo gefunden, aber nicht geholt: node ${S('scripts/produkt-lesen.mjs')} ${z.eingaben?.produkt || '<produkt-url>'} ${rel(lauf, lauf)} --demo ${dj.kandidaten[0].url} (Screens nach produkt/screens/demo-*). `
        : '';
      return [
        P(`Material-Score ${s.punkte} von 10 (Schwelle 7): ` + s.teile.map((t) => `${t.name} ${t.p}/${t.max} (${t.ist})`).join(' · '), s.punkte >= 7,
          s.echt < 3 ? `${demoFix}Bitte den Nutzer um 3 bis 5 Screenshots seines Produkts nach ${rel(lauf, A('assets/screens'))}/ (je Ansicht ein PNG, möglichst 1920 px breit). Warum: echte Screens machen den Film konkret; ohne sie baut der Skill nachempfundene Oberflächen, das wirkt generischer. Ordner per open im Finder öffnen. Bewusst ohne: navi ueberspringen 3 --grund "…"`
            : 'Fehlende Teile ergänzen (Logo als SVG nach assets/logo/, Beispieldaten nach assets/daten/, Funktionen belegen)'),
        W('öffentliche Demo oder Live-Ansicht gesucht (produkt/demo.json)', !!dj,
          `node ${S('scripts/produkt-lesen.mjs')} ${z.eingaben?.produkt || '<produkt-url>'} ${rel(lauf, lauf)} sucht sie mit (Links wie „Live demo“, „Dashboard“, „Playground“); gefunden: --demo <url>`),
        W('eigene Screens vom Nutzer (Demo-Screens zeigen Beispieldaten, nicht sein Konto)', s.echt >= 3 || !s.demo, 'im Vorschlag sagen: „mit eigenen Screens wird es noch konkreter“'),
      ];
    }
    case 4: {
      const vp = A('VORSCHLAG.md');
      const md = ex(vp) ? readFileSync(vp, 'utf8') : '';
      const sz = szenenAusVorschlag(md);
      const zuLang = sz.filter((x) => woerter(x.aussage) > 6 || !x.aussage);
      const ohneBeleg = sz.filter((x) => !x.beleg || /^[-–]?$/.test(x.beleg));
      const offen = sz.filter((x) => /\?/.test(x.beleg));
      const ph = platzhalter(md);
      const bilder = dateien(A('vorschlag/standbilder'), /\.png$/i);
      const mitWelt = sz.filter((x) => x.bildwelt);
      const kachel = mitWelt.filter((x) => /^kachel/i.test(x.bildwelt) && !/wie (das )?vorbild/i.test(x.bildwelt));
      const roh = dateien(A('vorschlag/standbilder'), /\.json$/i).map((f) => json(f, {})).find((j) => j && j.quelle);
      const plan = kostenPlan(z.regie || 'voll', filmLaenge(lauf, z));
      return [
        P('VORSCHLAG.md vorhanden', ex(vp), `cp ${S('templates/vorschlag.vorlage.md')} ${rel(lauf, vp)} und füllen`),
        P(`keine Platzhalter mehr${ph.length ? ` (${ph.slice(0, 3).join(', ')}${ph.length > 3 ? ' …' : ''})` : ''}`, ex(vp) && ph.length === 0, 'alle <…> in VORSCHLAG.md ersetzen'),
        P(`mindestens 2 Szenen (jetzt ${sz.length})`, sz.length >= 2, 'Szenen-Tabelle füllen: je Beat des Vorbilds eine Zeile'),
        P(`jede Aussage ≤ 6 Wörter${zuLang.length ? ` (zu lang oder leer: Szene ${zuLang.map((x) => x.nr).join(', ')})` : ''}`, sz.length && !zuLang.length, 'Aussagen kürzen: ein Feature pro Beat, höchstens 6 Wörter'),
        P(`jede Szene mit Beleg${ohneBeleg.length ? ` (fehlt: Szene ${ohneBeleg.map((x) => x.nr).join(', ')})` : ''}`, sz.length && !ohneBeleg.length, 'Beleg (Zitat + Quelle) aus produkt/funktionen.json eintragen; Unbelegtes als „? offen“ und unter „Offene Fakten“ fragen'),
        W(`offene Fakten im Go geklärt${offen.length ? ` (Szene ${offen.map((x) => x.nr).join(', ')})` : ''}`, !offen.length, 'Antworten des Nutzers als Beleg eintragen („Nutzer, <Datum>“) oder Szene umdeuten (03-blueprint-und-wahrheit.md)'),
        P(`2 bis 4 Standbilder in vorschlag/standbilder/ (jetzt ${bilder.length})`, bilder.length >= 2 && bilder.length <= 4,
          bilder.length > 4 ? 'höchstens 4 Standbilder zeigen' : `node ${S('scripts/standbilder.mjs')} ${rel(lauf, lauf)}`),
        P(`Bildwelt je Szene eingetragen${mitWelt.length < sz.length ? ` (fehlt: Szene ${sz.filter((x) => !x.bildwelt).map((x) => x.nr).join(', ')})` : ''}`, sz.length && mitWelt.length === sz.length,
          'Spalte „Bildwelt“ füllen: Fenster, Handy, Gerät, Produktfoto, Foto, Website, Live-Daten, Aussage, Logo oder Kachel (references/03-blueprint-und-wahrheit.md „Bildwelt“)'),
        P(`höchstens ein Drittel der Szenen „Kachel auf leerem Grund“ (jetzt ${kachel.length} von ${sz.length})`, sz.length && kachel.length * 3 <= sz.length,
          'Szenen mit Foto, Mensch oder Gerät im Vorbild bekommen eine echte Ersatz-Bildwelt: Desktop-Fenster mit dem echten Screen, Handy, Produktfoto des Nutzers, Bild von der Website, Live-Daten der Demo. „Kachel“ nur, wo das Vorbild selbst eine Kachel zeigt (dann „Kachel (wie Vorbild)“)'),
        W('Standbilder aus echtem Material (nicht aus der Bibliotheks-Demo)', !roh || roh.quelle === 'echt',
          `node ${S('scripts/standbilder.mjs')} ${rel(lauf, lauf)} nimmt assets/screens/ und produkt/screens/ (Demo zuerst); ohne Screens: Nutzer fragen oder im Vorschlag sagen, dass die Bilder nur das Look-Muster zeigen`),
        P(`Budget festgelegt (Plan ${z.regie || 'voll'}: ${dollar(plan.summe)} für ${Math.round(plan.laenge)} s${z.budget ? `, gesetzt ${dollar(z.budget.usd)}` : ''})`, !!z.budget,
          `Kosten im Vorschlag nennen (node ${S('scripts/navi.mjs')} kosten), dann node ${S('scripts/navi.mjs')} budget ${plan.summe}`),
        P('Go des Nutzers festgehalten (wörtlich)', !!z.go?.['4'], `Vorschlag im Chat zeigen; nach dem ausdrücklichen Go: node ${S('scripts/navi.mjs')} go "<Wortlaut>"`),
        ...(() => { const w = (ohneKommentare(md).match(/^Wahl:\s*\**(voll|spar)\b/im) || [])[1]?.toLowerCase();
          return [W(`Regie-Schleife gewählt und eingestellt (Vorschlag: ${w || 'keine Wahl'}, Navigator: ${z.regie || 'voll'})`, !!w && w === (z.regie || 'voll'),
            w ? `node ${S('scripts/navi.mjs')} regie ${w}` : 'im Vorschlag „Wahl: voll“ oder „Wahl: spar“ eintragen (Empfohlen: voll)')]; })(),
        W('BLUEPRINT.md für den Bau (aus dem Vorschlag abgeleitet)', ex(A('BLUEPRINT.md')), 'nach dem Go BLUEPRINT.md nach references/03-blueprint-und-wahrheit.md schreiben (Zeit, Lesezeit Soll, Fassung)'),
      ];
    }
    case 5: {
      const probe = neueste(dateien(RENDERS(lauf), /probe.*\.mp4$/i).filter((f) => !/_web|cmp/i.test(basename(f))));
      const qv = probe ? qualiVereint(probe) : { dateien: [] };
      const u = qv.dateien.length ? urteil(qv) : null;
      const cmp = ex(A('analyse/referenz.mp4')) ? suche(RENDERS(lauf), /\.(mp4|jpg|txt)$/i, 2).some((f) => /cmp|vergleich/i.test(f)) : true;
      return [
        P('Probe gerendert (film/renders/*probe*.mp4)', !!probe, 'Probe nach references/05-bau-probe-parallel.md §1 bauen (Vorlage B, Variante Probe), Render über scripts/render-block.sh'),
        P(`Probe gemessen${u ? `: ${u.sternRot.length} ★ rot, ${u.andereRot.length} andere rot` : ''}`, !!u && u.ok,
          probe ? (u ? `rot: ${[...u.sternRot, ...u.andereRot].map((x) => `${x.r} ${x.kriterium} (${x.ist})`).join('; ')}. Beheben, neu rendern, neu messen` : qualiBefehl(lauf, probe, ['--bewegung', '--frames', '--fuellung', '--text'])) : 'erst die Probe rendern',
          { messen: () => probe && run(qualiArgs(lauf, probe, ['--bewegung', '--frames', '--fuellung', '--text'])) }),
        W('Seite-an-Seite-Vergleich mit dem Vorbild', cmp, `python3 ${S('scripts/vergleich.py')} --ref analyse/referenz.mp4 --prb <probe.mp4> --start 0 --ende <s> --out film/renders/cmp-probe`),
      ];
    }
    case 6: {
      const ev = json(A('ereignisse.json'));
      const evOk = ev && ev.schema === 1 && (ev.ereignisse || []).some((e) => e.typ === 'aussage');
      const film = neueste(filmRenders(lauf));
      const qv = film ? qualiVereint(film) : { dateien: [], zeilen: [] };
      const u = qv.dateien.length ? urteil(qv, (x) => rNr(x) <= 8) : null;
      const hat = (re) => qv.zeilen.some((x) => re.test(`${x.r} ${x.kriterium}`) && x.status !== '–');
      const fehlt = [[/^R4\b.*Lesetext/, 'R4 Lesetext (--text)'], [/^R5\b/, 'R5 Stand (--bewegung)'], [/^R7\b/, 'R7 Frames (--frames)'], [/^R8\b.*Bildfüllung/, 'R8 Bildfüllung (--fuellung)']]
        .filter(([re]) => !hat(re)).map(([, n]) => n);
      const vers = ordner(A('versionen'));
      const runden = ordner(A('regie')).filter((d) => /^r\d+$/.test(basename(d)) && ex(join(d, 'REGIE.md')));
      const soll = z.regie === 'spar' ? 1 : 2;
      const k = kostenBisher(lauf);
      const ohneKosten = runden.map((d) => basename(d)).filter((r) => !k.zeilen.some((x) => new RegExp(`\\b${r}\\b`, 'i').test(x.phase)));
      const budget = z.budget?.usd;
      const rest = (() => { const p = kostenPlan(z.regie || 'voll', filmLaenge(lauf, z)).teile; return p.ton + p.abschluss; })();
      return [
        P('Ereignisliste <lauf>/ereignisse.json (Schema 1, mit Aussagen)', evOk, 'node tools/ereignisse.mjs . --out ../ereignisse.json im Ordner film/'),
        P('Film gerendert (film/renders/<film>.mp4)', !!film, `bash ${S('scripts/sperre.sh')} ${NAME(lauf)} -- bash ${S('scripts/hf.sh')} render -c index.html -o renders/<film>.mp4 --workers 2 --quiet (im Ordner film/)`),
        P(`Messung vollständig${fehlt.length ? ` (fehlt: ${fehlt.join(', ')})` : ''}`, !!film && qv.dateien.length > 0 && !fehlt.length,
          film ? qualiBefehl(lauf, film, ['--bewegung', '--frames', '--fuellung', '--text', '--beats']) : 'erst rendern',
          { messen: () => film && run(qualiArgs(lauf, film, ['--bewegung', '--frames', '--fuellung', '--text', '--beats'])) }),
        P(`Bild-Kriterien R1 bis R8 bestanden${u ? ` (${u.sternRot.length} ★ rot, ${u.andereRot.length} andere rot)` : ''}`, !!u && u.ok,
          film ? (u ? `rot: ${[...u.sternRot, ...u.andereRot].map((x) => `${x.r} ${x.kriterium}`).join('; ')}. Regie-Schleife (references/10-regie-schleife.md); hält ein Rot für einen Messfehler, Einzelbild ansehen und den Grund als deko-Ereignis oder im Manifest festhalten` : qualiBefehl(lauf, film)) : 'erst rendern',
          { messen: () => film && run(qualiArgs(lauf, film)) }),
        P(`Version gesichert (versionen/, jetzt ${vers.length})`, vers.length > 0, `bash ${S('scripts/version-sichern.sh')} ${rel(lauf, lauf)} v1 "<was diese Version ausmacht>"`),
        P(`${soll} interne Regie-Runde${soll > 1 ? 'n' : ''} vor der ersten Fassung (Regie ${z.regie || 'voll'}; regie/rK/REGIE.md, jetzt ${runden.length})`, runden.length >= soll || !!z.go?.['8'] || (z.verlauf || []).some((v) => v.aktion === 'fertig'),
          z.regie === 'spar' ? 'Regie spar: 1 Kritiker mit allen sechs Linsen (Vorlage G, höchstens 8 Befunde), Synthese im Hauptlauf (Vorlage H), höchstens 3 Änderungen, Besser-Regel; Ablage regie/r1/' : 'Regie voll: 3 gebündelte Kritiker (Vorlage G: Message + Überladung, Typo + Bewegung, Ton + Marke), Synthese im Hauptlauf (Vorlage H), höchstens 3 Änderungen, Besser-Regel; Ablage regie/rK/'),
        W(`höchstens ${soll} Regie-Runde${soll > 1 ? 'n' : ''} (jetzt ${runden.length}); danach keine weitere`, runden.length <= soll,
          `Rundenlimit überschritten: offene Befunde gehen als „bekannt, nicht gelöst“ in die Auslieferung oder als Frage in die Abnahme (10-regie-schleife.md §1)${z.regie === 'spar' ? '' : '; die Prüfrunde nach dem Ton liegt unter regie/pruefung/'}`),
        P(`Kosten je Regie-Runde im Manifest${ohneKosten.length ? ` (fehlt: ${ohneKosten.join(', ')})` : ''}`, !ohneKosten.length,
          'MANIFEST.md, „Modellkosten je Phase“: je Runde eine Zeile „Regie rK“ mit $ (laut Client oder ca. nach Stückkosten, references/00-navigator.md „Kosten“)'),
        P(budget ? `Budget: ${dollar(k.summe)} von ${dollar(budget)} verbraucht` : 'Budget gesetzt', !!budget && k.summe < budget,
          budget ? `Budget erreicht. Stopp, Rückfrage an den Nutzer (Wortlaut in references/00-navigator.md „Budget“): Empfohlen ist, mit der besten Version ohne weitere Regie-Runde zu Ton und Abnahme zu gehen (Rest ca. ${dollar(rest)}). Erst nach seiner Antwort: node ${S('scripts/navi.mjs')} budget ${Math.ceil(k.summe + rest)} "<Wortlaut>"`
            : `node ${S('scripts/navi.mjs')} budget <usd> (Plan: node ${S('scripts/navi.mjs')} kosten)`),
        W(`Kostenzeilen in $ (nicht in Tokens)${k.ohneDollar.length ? ` (ohne $: ${k.ohneDollar.join(', ')})` : ''}`, !k.ohneDollar.length,
          'Token-Zahlen sind keine Kosten (Lauf C meldete 9,1 Mio. Tokens bei 95,76 $): Wert laut Client in $ eintragen, sonst ca. nach Stückkosten (references/00-navigator.md „Kosten“)'),
        W(`Budget zu weniger als 80 % verbraucht${budget ? ` (${Math.round(100 * k.summe / budget)} %)` : ''}`, !budget || k.summe < 0.8 * budget,
          'keine weitere Regie-Runde beginnen, deren Kosten (ca. 7 $ je Runde voll, 4 $ spar) das Budget überschreiten würden'),
      ];
    }
    case 7: {
      const audio = A('film/compositions/audio.html');
      const film = neueste([...filmRenders(lauf), ...dateien(RENDERS(lauf), /_web\.mp4$/i)]);
      const qv = film ? qualiVereint(film) : { dateien: [] };
      const u = qv.dateien.length ? urteil(qv, (x) => /^R(9|10)\b/.test(x.r.replace(/\s*★/, ''))) : null;
      // Hörtests liegen je nach Schritt unter film/renders/ oder regie/<rK|ton|pruefung>/; zählt jeder, der nach dem letzten
      // Render entstand (5 min Spielraum: Web-Kopie und Hörtest laufen oft direkt nacheinander)
      const hts = [...dateien(RENDERS(lauf), /^hoertest.*\.md$/i), ...suche(A('regie'), /^hoertest.*\.md$/i, 3)]
        .filter((p, i, l) => l.indexOf(p) === i && film && mzeit(p) >= mzeit(film) - 5 * 60 * 1000);
      const ersatzIn = (p) => /Ersatz für/.test(readFileSync(p, 'utf8').slice(0, 600));
      const ht = hts.find((p) => !ersatzIn(p)) || neueste(hts);
      const htFrisch = !!ht;
      const ersatz = ht ? ersatzIn(ht) : false;
      const offenOk = !!z.hoertestOffen;
      const pruef = ex(A('regie/pruefung/REGIE.md'));
      return [
        P('compositions/audio.html aus der Cue-Liste gebaut', ex(audio), 'scripts/ton/ (references/06-ton.md Schritt 7), nie von Hand'),
        P(`R9 und R10 bestanden${u ? ` (${u.sternRot.length} rot)` : ''}`, !!u && u.sternRot.length === 0,
          film ? (u ? `rot: ${u.sternRot.map((x) => `${x.r} ${x.kriterium} (${x.ist})`).join('; ')}` : qualiFuer(film) ? `Messung älter als der Render: ${qualiBefehl(lauf, film, ['--ton'])}` : qualiBefehl(lauf, film, ['--ton'])) : 'erst mit Ton rendern',
          { messen: () => film && run(qualiArgs(lauf, film, ['--ton'])) }),
        P(`Hörtest nach dem letzten Render${ht ? ` (${rel(lauf, ht)}${ersatz ? ', nur Ersatzmodell' : ''}${hts.length > 1 ? `, ${hts.length} Dateien` : ''})` : ''}`, (htFrisch) || offenOk,
          `node ${S('scripts/hoertest.mjs')} <film_web.mp4> --von <s> --bis <s> --ereignisse ereignisse.json --out film/renders/hoertest-<vN>.md --sperre ${NAME(lauf)} (Ende und jede Musik-Naht). Gemini nicht erreichbar: navi weiter --hoertest-offen "<Grund>" (Stand dann „Bild fertig, Hörtest offen“)`),
        W('Hörtest vom Hauptmodell', htFrisch && !ersatz, 'nur Ersatzmodell: Stand „Hörtest eingeschränkt, bitte selbst hören“ (06-ton.md Schritt 9)'),
        ...(z.regie === 'spar' ? [] : [W('Prüfrunde nach dem Ton (regie/pruefung/REGIE.md)', pruef,
          'Regie voll: eine Prüfrunde mit Ton (10-regie-schleife.md §1): messen, Hörtest, die drei gebündelten Kritiker prüfen nach; Änderungen nur für Befunde „hoch“, danach keine weitere Runde')]),
      ];
    }
    case 8: {
      const web = neueste(dateien(RENDERS(lauf), /_web\.mp4$/i));
      const qv = web ? qualiVereint(web) : { dateien: [], zeilen: [] };
      const u = qv.dateien.length ? urteil(qv) : null;
      const r4 = qv.zeilen.some((x) => /^R4\b/.test(x.r) && /Lesetext/.test(x.kriterium) && x.status !== '–');
      const fragen = dateien(A('regie/abnahme'));
      return [
        P('Web-Kopie vorhanden (film/renders/<film>_web.mp4)', !!web, `bash ${S('scripts/sperre.sh')} ${NAME(lauf)} -- ffmpeg -loglevel error -y -i renders/<film>.mp4 -c:v libx264 -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart renders/<film>_web.mp4`),
        P(`Rubrik R1 bis R12 auf der Web-Kopie bestanden${u ? ` (${u.sternRot.length} ★ rot, ${u.andereRot.length} andere rot${r4 ? '' : ', R4 Lesetext nicht gemessen'})` : ''}`, !!u && u.ok && r4,
          web ? (u ? `rot: ${[...u.sternRot, ...u.andereRot].map((x) => `${x.r} ${x.kriterium}`).join('; ')}` : qualiBefehl(lauf, web)) : 'erst die Web-Kopie',
          { messen: () => web && run(qualiArgs(lauf, web)) }),
        P('Abnahme des Nutzers festgehalten (wörtlich)', !!z.go?.['8'], `geführte Abnahme mit templates/abnahme-fragen.md; Antwort festhalten: node ${S('scripts/navi.mjs')} go "<Wortlaut>"`),
        W('geführte Abnahme mit fünf Fragen und Bildstreifen (regie/abnahme/)', fragen.length > 0, 'fünf Fragen nach templates/abnahme-fragen.md stellen (Bildstreifen nach regie/abnahme/), Antworten nach dem Raster in Änderungen übersetzen'),
      ];
    }
    case 9: {
      const webs = dateien(RENDERS(lauf), /_web\.mp4$/i);
      const web = neueste(webs);
      const zuGross = webs.filter((f) => groesse(f) >= 30 * 1024 * 1024);
      const ohneFs = webs.filter((f) => !faststart(f));
      const vers = ordner(A('versionen')).map((d) => join(d, 'VERSION.md')).filter(ex);
      const versOk = web && vers.some((v) => mzeit(v) >= mzeit(web));
      const man = ex(A('MANIFEST.md')) ? readFileSync(A('MANIFEST.md'), 'utf8') : '';
      const summe = (man.match(/^\|\s*\*\*Summe\*\*\s*\|([^|\n]*)\|/m) || [])[1];
      return [
        P(`Web-Kopie je Fassung < 30 MB${zuGross.length ? ` (zu groß: ${zuGross.map((f) => basename(f)).join(', ')})` : ''}`, webs.length && !zuGross.length, 'CRF erhöhen (24) oder Länge prüfen, neu kodieren'),
        P(`faststart (moov vor mdat)${ohneFs.length ? ` (fehlt: ${ohneFs.map((f) => basename(f)).join(', ')})` : ''}`, webs.length && !ohneFs.length, 'ffmpeg -i <datei> -c copy -movflags +faststart <neu>'),
        P('Version nach dem letzten Render gesichert', !!versOk, `bash ${S('scripts/version-sichern.sh')} ${rel(lauf, lauf)} v<N> "<Notiz>"`),
        P('Modellkosten-Summe im Manifest in $ (Wert, „ca.“ oder „unbekannt“, nie leer, nie nur Tokens)', !!(summe && /\$|unbekannt/i.test(summe)), `MANIFEST.md, Abschnitt „Modellkosten je Phase“, Zeile **Summe** in $ füllen (Summe der Zeilen: ${dollar(kostenBisher(lauf).summe)})`),
        W('Hörtest-Stand ehrlich', !z.hoertestOffen, `Hörtest offen (${z.hoertestOffen || ''}): Stand „Bild fertig, Hörtest offen“ in der Auslieferung`),
      ];
    }
  }
  return [];
}

function run(befehl) {
  console.error(`→ ${befehl.join(' ')}`);
  const r = spawnSync(befehl[0], befehl.slice(1), { stdio: 'inherit' });
  return r.status === 0;
}

// ---------------------------------------------------------------- Ausgabe
function ampelVon(checks) {
  if (!checks.length) return 'offen';
  if (checks.some((c) => c.pflicht && !c.ok)) return 'rot';
  if (checks.some((c) => !c.pflicht && !c.ok)) return 'gelb';
  return 'grün';
}
function naechsterSchritt(lauf, z) {
  const nr = z.station;
  if (z.fertig) return 'Lauf abgeschlossen. Neue Wünsche: Station 6 (Regie-Schleife) mit `navi zurueck 6` oder neue Version.';
  const c = pruefe(lauf, nr, z);
  const rot = c.find((x) => x.pflicht && !x.ok);
  if (rot) return `${rot.text.replace(/\s*\(.*$/, '')}: ${rot.fix}`;
  const gelb = c.find((x) => !x.pflicht && !x.ok);
  return gelb ? `Schwelle erfüllt (Hinweis: ${gelb.text}). Weiter mit: node ${S('scripts/navi.mjs')} weiter` : `Schwelle erfüllt. Weiter mit: node ${S('scripts/navi.mjs')} weiter`;
}
/** Erledigte Stationen neu prüfen: Was nachgeholt wurde (Ton-Analyse, Marke bestätigt), wird grün. Nur Aufwertung;
 *  eine erledigte Station wird nie nachträglich rot (spätere Renders ändern ihre Eingänge). Gibt die Liste der Wechsel zurück. */
function auffrischen(lauf, z) {
  const neu = [];
  for (const s of STATIONEN) {
    const e = z.stationen[s.nr] || {};
    if (e.stand !== 'erledigt' || e.ampel === 'grün' || s.nr >= z.station) continue;
    const a = ampelVon(pruefe(lauf, s.nr, z));
    if (a === 'grün') { z.stationen[s.nr] = { ...e, ampel: 'grün', notiz: `nachgeholt (vorher ${e.ampel || 'offen'}${e.notiz ? `: ${e.notiz.replace(/^offen: /, '')}` : ''})`.slice(0, 200), aufgefrischt: jetzt().toISOString() }; neu.push(s); }
  }
  if (neu.length) {
    verlauf(z, 'auffrischen', neu.map((s) => `Station ${s.nr} grün`).join(', '));
    speichere(lauf, z);
    manifestZeile(lauf, `Navigator: ${neu.map((s) => `Station ${s.nr} ${s.name}`).join(', ')} jetzt grün (nachgeholt)`);
  }
  return neu;
}
function kostenZeile(lauf, z) {
  const k = kostenBisher(lauf); const b = z.budget?.usd;
  return `Kosten bisher (Manifest): ${dollar(k.summe)}${b ? ` von ${dollar(b)} Budget (${Math.round(100 * k.summe / b)} %)` : ' · kein Budget gesetzt (navi budget <usd>)'}`;
}
function zeigeStatus(lauf, z, { kurz = false } = {}) {
  const nr = z.station; const st = STN[nr];
  const einsteiger = z.modus !== 'profi';
  console.log(`Lauf: ${basename(lauf)} (${relative(process.cwd(), lauf) || '.'}) · Modus: ${einsteiger ? 'Einsteiger' : 'Profi'} · Regie: ${z.regie || 'voll'} · ${kostenZeile(lauf, z)}`);
  console.log(`${z.fertig ? 'Fertig' : `Station ${nr} von 9: ${st.name}`}, nächster Schritt: ${naechsterSchritt(lauf, z)}`);
  if (kurz) return;
  console.log('');
  for (const s of STATIONEN) {
    const e = z.stationen[s.nr] || {};
    let a = e.stand === 'uebersprungen' ? 'übersprungen' : e.stand === 'erledigt' ? (e.ampel || 'grün') : s.nr === nr ? (e.ampel || 'offen') : 'offen';
    if (s.nr === nr && !z.fertig) a = ampelVon(pruefe(lauf, s.nr, z));
    const zusatz = e.stand === 'uebersprungen' ? ` (${e.grund})` : e.notiz ? ` (${e.notiz})` : '';
    console.log(`${s.nr === nr && !z.fertig ? '>' : ' '} ${s.nr} ${s.name.padEnd(13)} ${a}${zusatz}`);
  }
  if (einsteiger && !z.fertig) {
    console.log(`\nWas hier passiert: ${st.tut}\nWeiter erst, wenn: ${st.schwelle}\nWarum: ${st.warum}\nTiefe: ${st.refs}`);
  }
}
function zeigePruefung(lauf, nr, checks, z) {
  const st = STN[nr];
  console.log(`Station ${nr} von 9: ${st.name} · Ampel: ${ampelVon(checks)}`);
  for (const c of checks) console.log(`  ${c.ok ? '✓' : c.pflicht ? '✗' : '~'} ${c.text}${c.ok ? '' : `\n      → ${c.fix}`}`);
  if (z.modus !== 'profi') console.log(`  Weiter erst, wenn: ${st.schwelle}`);
}

// ---------------------------------------------------------------- Befehle
function neuerZustand(lauf) {
  return { schema: 1, lauf: basename(lauf), angelegt: jetzt().toISOString(), modus: 'einsteiger', regie: 'voll', station: 1, fertig: false,
    eingaben: {}, go: {}, stationen: Object.fromEntries(STATIONEN.map((s) => [s.nr, { stand: s.nr === 1 ? 'aktiv' : 'offen' }])), verlauf: [] };
}

if (cmd === 'init') {
  const ziel = argv[1] && !argv[1].startsWith('--') ? resolve(argv[1]) : null;
  if (!ziel) { console.error('Aufruf: node navi.mjs init motion-runs/<datum>_<slug> [--profi] [--vorbild <url|datei>] [--produkt <url>] [--titel "<Titel>"]'); process.exit(2); }
  mkdirSync(ziel, { recursive: true });
  for (const d of ['analyse', 'produkt', 'assets/screens', 'assets/logo', 'assets/bilder', 'assets/daten', 'vorschlag/standbilder', 'versionen']) mkdirSync(join(ziel, d), { recursive: true });
  if (ex(join(ziel, 'navi.json'))) {
    console.log('navi.json gibt es schon: Stand übernommen, nichts überschrieben.\n');
    zeigeStatus(ziel, ladeZustand(ziel)); process.exit(0);
  }
  const mp = join(ziel, 'MANIFEST.md');
  if (!ex(mp) && ex(S('templates/MANIFEST.vorlage.md'))) {
    const d = jetzt();
    const t = readFileSync(S('templates/MANIFEST.vorlage.md'), 'utf8')
      .replace('<Titel des Films>', wert('--titel') || basename(ziel))
      .replace('<TT.MM.JJJJ>', d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }))
      .replace('motion-runs/<datum>_<slug>/', `${relative(process.cwd(), ziel) || basename(ziel)}/`);
    writeFileSync(mp, t);
  }
  const z = neuerZustand(ziel);
  if (flag('--profi')) z.modus = 'profi';
  if (wert('--regie')) { if (!['voll', 'spar'].includes(wert('--regie'))) { console.error('--regie voll|spar'); process.exit(2); } z.regie = wert('--regie'); }
  if (wert('--vorbild')) z.eingaben.vorbild = wert('--vorbild');
  if (wert('--produkt')) z.eingaben.produkt = wert('--produkt');
  if (wert('--brief')) z.eingaben.brief = wert('--brief');
  if (wert('--budget')) { const b = parseFloat(String(wert('--budget')).replace(',', '.')); if (!(b > 0)) { console.error('--budget <usd>, z. B. --budget 40'); process.exit(2); } z.budget = { usd: b, zeit: jetzt().toISOString(), quelle: 'init' }; }
  verlauf(z, 'init', `Lauf angelegt (${z.modus})`);
  speichere(ziel, z);
  manifestZeile(ziel, `Navigator: Lauf angelegt (${z.modus === 'profi' ? 'Profi' : 'Einsteiger'}, Regie ${z.regie}${z.budget ? `, Budget ${dollar(z.budget.usd)}` : ''})${z.eingaben.vorbild ? ` · Vorbild ${z.eingaben.vorbild}` : ''}${z.eingaben.produkt ? ` · Produkt ${z.eingaben.produkt}` : ''} → Station 1 Vorbild`);
  console.log('Lauf angelegt. Ordner: analyse/, produkt/, assets/{screens,logo,bilder,daten}/, vorschlag/standbilder/, versionen/.\n');
  zeigeStatus(ziel, z);
  process.exit(0);
}

const LAUF = findeLauf();
if (!LAUF || !ex(join(LAUF, 'navi.json'))) {
  console.error(`Kein Lauf gefunden. Erst: node ${S('scripts/navi.mjs')} init motion-runs/<datum>_<slug> (oder --lauf <pfad>)`);
  process.exit(2);
}
const Z = ladeZustand(LAUF);

if (['status', 'pruefen', 'weiter'].includes(cmd)) auffrischen(LAUF, Z);

if (cmd === 'kosten') {
  const L = parseFloat(String(wert('--laenge') || '').replace(',', '.')) || filmLaenge(LAUF, Z) || 40;
  const v = kostenPlan('voll', L), sp = kostenPlan('spar', L);
  console.log(`Kostenplan Claude-Nutzung für einen ${Math.round(L)}-s-Film (Opus-Listenpreise, ohne Generierung), Planwerte mit den Deckeln:`);
  console.log('| Phase | voll | spar |\n|---|---|---|');
  for (const [k, name] of PHASEN) console.log(`| ${name} | ${dollar(v.teile[k])} | ${dollar(sp.teile[k])} |`);
  console.log(`| **Summe** | **ca. ${v.von} bis ${v.summe} $** | **ca. ${sp.von} bis ${sp.summe} $** |`);
  console.log(`\nvoll: 3 gebündelte Kritiker, 2 Runden vor der ersten Fassung, 1 Prüfrunde nach dem Ton. spar: 1 Kritiker mit allen Linsen, 1 Runde.`);
  console.log('Gemessen ohne Deckel (Lauf C, 41 s, Regie voll mit 4 Runden und 25 Kritikern): 95,76 $; ohne Regie-Schleife 35,61 $ (30,8 s) und 12,82 $ (15,9 s, ohne Vorbild).');
  console.log('Abo (Pro/Max): kein Aufpreis, aber es zählt gegen dein Wochenlimit; ein voller Lauf kann einen großen Teil davon verbrauchen. API: diese Beträge.');
  console.log(`Budget setzen (Empfohlen ${Z.regie === 'spar' ? 'spar' : 'voll'}): node ${S('scripts/navi.mjs')} budget ${(Z.regie === 'spar' ? sp : v).summe}${Z.budget ? ` · gesetzt: ${dollar(Z.budget.usd)}` : ''}`);
  console.log(kostenZeile(LAUF, Z));
  process.exit(0);
}

if (cmd === 'budget') {
  const b = parseFloat(String(argv[1] || '').replace(',', '.'));
  if (!(b > 0)) { console.error('Aufruf: node navi.mjs budget <usd> ["<Wortlaut des Nutzers>"]'); process.exit(2); }
  const wortlaut = argv.slice(2).join(' ').trim();
  const k = kostenBisher(LAUF);
  if (Z.budget && b > Z.budget.usd && k.summe >= Z.budget.usd && !wortlaut) {
    console.error(`Budget ist erreicht (${dollar(k.summe)} von ${dollar(Z.budget.usd)}). Erhöhen nur mit dem Wortlaut des Nutzers: node navi.mjs budget ${b} "<Wortlaut>"`); process.exit(1);
  }
  const alt = Z.budget?.usd;
  Z.budget = { usd: b, zeit: jetzt().toISOString(), quelle: wortlaut ? 'nutzer' : 'vorschlag', ...(wortlaut ? { wortlaut } : {}) };
  verlauf(Z, 'budget', `${alt ? `${dollar(alt)} → ` : ''}${dollar(b)}${wortlaut ? ` (Nutzer: ${wortlaut})` : ''}`);
  speichere(LAUF, Z);
  manifestZeile(LAUF, `Navigator: Budget ${alt ? `${dollar(alt)} → ` : ''}${dollar(b)}${wortlaut ? `, Nutzer wörtlich: „${wortlaut}“` : ''} (bisher ${dollar(k.summe)})`);
  console.log(`Budget: ${dollar(b)} · ${kostenZeile(LAUF, Z)}`);
  process.exit(0);
}

if (cmd === 'status') {
  if (flag('--json')) {
    const c = Z.fertig ? [] : pruefe(LAUF, Z.station, Z);
    console.log(JSON.stringify({ lauf: LAUF, station: Z.station, name: STN[Z.station].name, fertig: Z.fertig, ampel: ampelVon(c), naechster: naechsterSchritt(LAUF, Z),
      kosten: { bisher: +kostenBisher(LAUF).summe.toFixed(2), budget: Z.budget?.usd ?? null },
      stationen: STATIONEN.map((s) => ({ nr: s.nr, name: s.name, ...(Z.stationen[s.nr] || {}) })), pruefung: c.map(({ messen, ...x }) => x) }, null, 2));
  } else zeigeStatus(LAUF, Z);
  process.exit(0);
}

if (cmd === 'pruefen') {
  const nr = parseInt(wert('--station') || Z.station, 10);
  if (!STN[nr]) { console.error('Station 1 bis 9'); process.exit(2); }
  let c = pruefe(LAUF, nr, Z);
  if (flag('--messen')) {
    for (const x of c) if (!x.ok && x.messen) x.messen();
    c = pruefe(LAUF, nr, Z);
  }
  zeigePruefung(LAUF, nr, c, Z);
  // Nur die aktuelle (oder noch offene) Station speichert ihre Ampel; eine erledigte Station behält ihren Abschluss-Stand
  if (nr === Z.station || Z.stationen[nr]?.stand !== 'erledigt') { Z.stationen[nr] = { ...(Z.stationen[nr] || {}), ampel: ampelVon(c), geprueft: jetzt().toISOString() }; speichere(LAUF, Z); }
  else console.log(`  (Station ${nr} ist erledigt; ihr Abschluss-Stand bleibt ${Z.stationen[nr].ampel || 'grün'})`);
  process.exit(c.some((x) => x.pflicht && !x.ok) ? 1 : 0);
}

if (cmd === 'weiter') {
  if (Z.fertig) { console.log('Lauf ist abgeschlossen.'); process.exit(0); }
  const nr = Z.station;
  const ho = wert('--hoertest-offen');
  if (ho && nr === 7) { Z.hoertestOffen = ho; }
  const c = pruefe(LAUF, nr, Z);
  zeigePruefung(LAUF, nr, c, Z);
  const rot = c.filter((x) => x.pflicht && !x.ok);
  if (rot.length) {
    console.log(`\nNoch nicht weiter: ${rot.length} Schwelle${rot.length > 1 ? 'n' : ''} offen. Zuerst: ${rot[0].fix}`);
    Z.stationen[nr] = { ...(Z.stationen[nr] || {}), ampel: 'rot', geprueft: jetzt().toISOString() };
    speichere(LAUF, Z); process.exit(1);
  }
  const gelb = c.filter((x) => !x.pflicht && !x.ok);
  const ampel = gelb.length ? 'gelb' : 'grün';
  Z.stationen[nr] = { ...(Z.stationen[nr] || {}), stand: 'erledigt', ampel, erledigt: jetzt().toISOString(), notiz: gelb.length ? 'offen: ' + gelb.map((x) => x.text).join('; ').slice(0, 160) : undefined };
  if (ho && nr === 7) Z.stationen[nr].notiz = `Hörtest offen: ${ho}`;
  if (nr === 9) {
    Z.fertig = true;
    verlauf(Z, 'fertig', 'Station 9 erledigt');
    speichere(LAUF, Z);
    manifestZeile(LAUF, `Navigator: Station 9 Auslieferung ${ampel} → Lauf abgeschlossen${Z.hoertestOffen ? ` (Hörtest offen: ${Z.hoertestOffen})` : ''}`);
    console.log('\nLauf abgeschlossen. Antwort an den Nutzer nach templates/auslieferung.vorlage.md.');
    process.exit(0);
  }
  let naechste = nr + 1;
  while (naechste <= 9 && Z.stationen[naechste]?.stand === 'uebersprungen') naechste++;
  Z.station = Math.min(naechste, 9);
  Z.stationen[Z.station] = { ...(Z.stationen[Z.station] || {}), stand: 'aktiv' };
  verlauf(Z, 'weiter', `Station ${nr} ${ampel} → ${Z.station}`);
  speichere(LAUF, Z);
  manifestZeile(LAUF, `Navigator: Station ${nr} ${STN[nr].name} ${ampel}${gelb.length ? ` (offen: ${gelb.map((x) => x.text).join('; ').slice(0, 140)})` : ''}${ho && nr === 7 ? ` · Hörtest offen: ${ho}` : ''} → Station ${Z.station} ${STN[Z.station].name}`);
  console.log('');
  zeigeStatus(LAUF, Z, { kurz: Z.modus === 'profi' });
  process.exit(0);
}

if (cmd === 'go') {
  const wortlaut = argv.slice(1).join(' ').trim();
  if (!wortlaut) { console.error('Aufruf: node navi.mjs go "<Wortlaut des Nutzers>"'); process.exit(2); }
  const nr = [4, 8].includes(Z.station) ? Z.station : Z.station < 4 ? 4 : null;
  if (!nr) { console.error(`Ein Go gibt es für Station 4 (Vorschlag) und Station 8 (Abnahme); aktuell Station ${Z.station}. Kostenpflichtige Generierung: Go im Manifest unter „Generierung“ festhalten.`); process.exit(2); }
  (Z.go ||= {})[nr] = { wortlaut, zeit: jetzt().toISOString() };
  verlauf(Z, 'go', `Station ${nr}: ${wortlaut}`);
  speichere(LAUF, Z);
  manifestZeile(LAUF, `Navigator: ${nr === 4 ? 'Go zum Vorschlag' : 'Abnahme'} des Nutzers, wörtlich: „${wortlaut}“`);
  console.log(`Festgehalten (${nr === 4 ? 'Go zum Vorschlag' : 'Abnahme'}): „${wortlaut}“`);
  if (nr === 4 && Z.station < 4) console.log('Hinweis: Das Go gilt für den Vorschlag; Station 4 ist erst nach den Stationen davor dran.');
  process.exit(0);
}

if (cmd === 'ueberspringen') {
  const nr = parseInt(argv[1], 10); const grund = wert('--grund');
  if (!STN[nr] || !grund) { console.error('Aufruf: node navi.mjs ueberspringen <1 bis 9> --grund "<Grund>"'); process.exit(2); }
  const st = STN[nr];
  if (nr < Z.station) { console.error(`Station ${nr} liegt schon hinter dir.`); process.exit(2); }
  if (st.ueberspringbar === false) { console.error(`Station ${nr} ${st.name} lässt sich nicht überspringen: ${st.schwelle}`); process.exit(1); }
  if (st.ueberspringbar === 'nur-mit-go' && !Z.go?.['4']) { console.error(`Ohne Go wird nicht gebaut. Erst das Go des Nutzers festhalten: node ${S('scripts/navi.mjs')} go "<Wortlaut>"`); process.exit(1); }
  Z.stationen[nr] = { ...(Z.stationen[nr] || {}), stand: 'uebersprungen', grund, zeit: jetzt().toISOString() };
  if (nr === Z.station) {
    let n = nr + 1; while (n <= 9 && Z.stationen[n]?.stand === 'uebersprungen') n++;
    Z.station = Math.min(n, 9); Z.stationen[Z.station] = { ...(Z.stationen[Z.station] || {}), stand: Z.stationen[Z.station].stand === 'uebersprungen' ? 'uebersprungen' : 'aktiv' };
  }
  verlauf(Z, 'ueberspringen', `Station ${nr}: ${grund}`);
  speichere(LAUF, Z);
  manifestZeile(LAUF, `Navigator: Station ${nr} ${st.name} übersprungen, Grund: ${grund}. ${st.beimUeberspringen || ''}`.trim());
  console.log(`Station ${nr} ${st.name} übersprungen (vermerkt). ${st.beimUeberspringen || ''}\n`);
  zeigeStatus(LAUF, Z, { kurz: true });
  process.exit(0);
}

if (cmd === 'zurueck') {
  const zielArg = argv[1];
  if (!zielArg) { console.error('Aufruf: node navi.mjs zurueck <vN> | <Station 1 bis 9>'); process.exit(2); }
  if (/^\d$/.test(zielArg)) {
    const nr = parseInt(zielArg, 10);
    if (!STN[nr] || nr > Z.station && !Z.fertig) { console.error(`Zurück geht nur auf eine Station bis ${Z.station}.`); process.exit(2); }
    for (const s of STATIONEN) if (s.nr > nr && Z.stationen[s.nr]?.stand !== 'uebersprungen') Z.stationen[s.nr] = { stand: 'offen', notiz: `wieder offen nach Rücksprung auf ${nr}` };
    Z.stationen[nr] = { ...(Z.stationen[nr] || {}), stand: 'aktiv' };
    if (nr <= 8 && Z.go?.['8']) delete Z.go['8'];
    if (nr <= 4 && Z.go?.['4']) { Z.goFrueher = [...(Z.goFrueher || []), Z.go['4']]; delete Z.go['4']; }
    Z.station = nr; Z.fertig = false;
    verlauf(Z, 'zurueck', `auf Station ${nr}`);
    speichere(LAUF, Z);
    manifestZeile(LAUF, `Navigator: zurück auf Station ${nr} ${STN[nr].name}${nr <= 4 ? ' (Vorschlag ändert sich: neues Go nötig)' : ''}`);
    zeigeStatus(LAUF, Z);
    process.exit(0);
  }
  const vn = zielArg;
  const quelle = join(LAUF, 'versionen', vn);
  if (!/^[A-Za-z0-9-]+$/.test(vn) || !ex(quelle)) {
    console.error(`Version ${vn} nicht gefunden. Vorhanden: ${ordner(join(LAUF, 'versionen')).map((d) => basename(d)).join(', ') || 'keine'}`); process.exit(2);
  }
  const proj = ex(join(LAUF, 'film')) ? join(LAUF, 'film') : LAUF;
  // 1. heutigen Stand sichern, damit nichts verloren geht
  const d = jetzt(); const stempel = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  const sicher = `vor-${vn}-${stempel}`;
  if (ex(join(proj, 'compositions')) || ex(join(proj, 'index.html'))) {
    const r = spawnSync('bash', [S('scripts/version-sichern.sh'), LAUF, sicher, `automatisch vor dem Zurückholen von ${vn}`], { stdio: 'inherit' });
    if (r.status !== 0) { console.error('Sicherung des aktuellen Stands fehlgeschlagen; nichts zurückgeholt.'); process.exit(1); }
  }
  // 2. Dateien der Version zurück ins Projekt bzw. in den Lauf (nichts löschen)
  const kopiert = []; const nurHeute = [];
  const zurueckBaum = (von, nach, relBasis = '') => {
    for (const e of readdirSync(von, { withFileTypes: true })) {
      if (e.name === 'VERSION.md' && !relBasis) continue;
      const q = join(von, e.name), r = join(relBasis, e.name);
      if (e.isDirectory()) { if (!relBasis && e.name === 'lauf') continue; zurueckBaum(q, join(nach, e.name), r); }
      else { mkdirSync(nach, { recursive: true }); copyFileSync(q, join(nach, e.name)); kopiert.push(r); }
    }
  };
  zurueckBaum(quelle, proj);
  if (ex(join(quelle, 'lauf'))) zurueckBaum(join(quelle, 'lauf'), LAUF, 'lauf');
  for (const sub of ['compositions', 'lib']) {
    const vSet = new Set(dateien(join(quelle, sub)).map((f) => basename(f)));
    for (const f of dateien(join(proj, sub))) if (!vSet.has(basename(f))) nurHeute.push(`${sub}/${basename(f)}`);
  }
  if (Z.station > 6) { for (const s of STATIONEN) if (s.nr > 6 && Z.stationen[s.nr]?.stand !== 'uebersprungen') Z.stationen[s.nr] = { stand: 'offen', notiz: `wieder offen nach Rückholen von ${vn}` }; Z.station = 6; Z.stationen[6] = { ...(Z.stationen[6] || {}), stand: 'aktiv' }; delete Z.go?.['8']; Z.fertig = false; }
  Z.basis = vn;
  verlauf(Z, 'zurueck', `Version ${vn} zurückgeholt (vorher gesichert als ${sicher})`);
  speichere(LAUF, Z);
  manifestZeile(LAUF, `Navigator: Version ${vn} als Basis zurückgeholt (${kopiert.length} Dateien; Stand davor gesichert als versionen/${sicher}/) → Station ${Z.station} ${STN[Z.station].name}`);
  console.log(`\n✓ ${vn} zurückgeholt: ${kopiert.length} Dateien. Stand davor: versionen/${sicher}/`);
  if (nurHeute.length) console.log(`Achtung, diese Dateien gibt es nur im heutigen Stand (nicht gelöscht, aber prüfen, ob index.html sie noch einbindet): ${nurHeute.join(', ')}`);
  console.log('Nächster Schritt: neu rendern und bildgleich gegen den Render von ' + vn + ' prüfen (SKILL.md Grundsatz 8), dann nur die genannten Punkte übertragen, höchstens drei je Revision.');
  process.exit(0);
}

if (cmd === 'modus') {
  const m = argv[1];
  if (!['einsteiger', 'profi'].includes(m)) { console.error('Aufruf: node navi.mjs modus einsteiger|profi'); process.exit(2); }
  Z.modus = m; verlauf(Z, 'modus', m); speichere(LAUF, Z);
  manifestZeile(LAUF, `Navigator: Modus ${m === 'profi' ? 'Profi' : 'Einsteiger'}`);
  console.log(`Modus: ${m}`); process.exit(0);
}

if (cmd === 'regie') {
  const m = argv[1];
  if (!['voll', 'spar'].includes(m)) { console.error('Aufruf: node navi.mjs regie voll|spar'); process.exit(2); }
  Z.regie = m; verlauf(Z, 'regie', m); speichere(LAUF, Z);
  manifestZeile(LAUF, `Navigator: Regie-Schleife ${m}${m === 'spar' ? ' (1 Kritiker mit allen Linsen, 1 Runde; weniger Kosten, weniger Kritik)' : ' (3 gebündelte Kritiker, 2 Runden plus Prüfrunde nach dem Ton)'}`);
  if (Z.budget) console.log(`Hinweis: Budget ist ${dollar(Z.budget.usd)}; Plan ${m}: ${dollar(kostenPlan(m, filmLaenge(LAUF, Z)).summe)} (node navi.mjs kosten).`);
  console.log(`Regie: ${m}`); process.exit(0);
}

console.error(`Unbekannter Befehl: ${cmd}. Hilfe: node ${S('scripts/navi.mjs')} --help`);
process.exit(2);
