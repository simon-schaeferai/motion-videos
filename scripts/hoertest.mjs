// Hörtest: Claude kann nicht hören, Gemini schon. Ein Ausschnitt des Films (nur der Ton, Bild schwarz) geht mit den
// Bildereignissen als Zeitstempel an Gemini; fünf feste Fragen, die Antwort wird wörtlich als Markdown gespeichert.
// Teil des Skills motion-videos (MIT). Node 18+, ffmpeg. Google Gemini API (Files API, Datei wird danach gelöscht).
// Key: GEMINI_API_KEY (Umgebung, ./.env oder <skill>/.env). Kosten: Flash-Modell, wenige Cent je Aufruf.
//
// Aufruf:
//   node hoertest.mjs <film.mp4|ton.wav> --von 68 --bis 86.03 [--ereignisse film/ereignisse.json]
//        [--kontext "Breakbeat, ca. 145 BPM"] [--typen schnitt,klick,hit,aussage] [--ziel ende|naht]
//        [--out renders/hoertest-v3.md] [--sperre <lauf>] [--modell <gemini-…>]
//   --typen  nur diese Ereignis-Typen in den Prompt (bei vielen Effekten: die Bildschnitte und Hauptakzente)
//   --ziel   ende (Standard: Schluss des Films) oder naht (Musik-Naht mitten im Film)
//   node hoertest.mjs --kontingent   → Mini-Anfrage: Exit 0 Hauptmodell hat Kontingent, 3 nur Ersatzmodell, 1 keins
//   node hoertest.mjs --vergleich a.mp4 b.mp4 --von 68 --bis 86.03 [--namen A,B] [...]
//     → beide Ausschnitte in EINEM Aufruf (A, 2 s Pause, B), dieselben Fragen je Variante + Entscheidung.
// Ereignisse: ereignisse.json nach Schema 1 (templates/ereignisse.vorlage.json: {schema, fps, bpm, takt0, ereignisse: [...]}
// oder nackte Liste); gelesen werden t, typ, text, lesbarAb, ausstiegAb (Filmzeit), im Prompt relativ zum Ausschnitt
// (0 = --von); Ereignisse mit typ stille und bis erscheinen als „gewollte Stille bis …“.
// Das Urteil ist ein Hinweis, die Abnahme bleibt beim Nutzer.
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, mkdirSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyseVideo, pruefeKontingent } from './gemini.mjs';

const PAUSE = 2; // s Stille zwischen A und B im Vergleich

function args(argv) {
  const o = { dateien: [], vergleich: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--vergleich') o.vergleich = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else o.dateien.push(a);
  }
  return o;
}
if (process.argv.includes('--kontingent')) {
  // Mini-Anfrage: hat das Hauptmodell heute noch Kontingent? Exit 0 = Hauptmodell, 3 = nur Ersatzmodell, 1 = keins.
  const k = await pruefeKontingent({ log: (m) => console.error(m) });
  console.log(k.text);
  process.exit(k.stufe === 'haupt' ? 0 : k.stufe === 'ersatz' ? 3 : 1);
}
const o = args(process.argv.slice(2));
const hilfe = 'Aufruf: node hoertest.mjs <film.mp4> --von <s> --bis <s> [--ereignisse ereignisse.json] [--out x.md]\n'
  + '        node hoertest.mjs --vergleich <a.mp4> <b.mp4> --von <s> --bis <s> [...]';
if (!o.dateien.length || o.von === undefined || o.bis === undefined) { console.error(hilfe); process.exit(2); }
if (o.vergleich && o.dateien.length !== 2) { console.error('--vergleich braucht genau zwei Dateien.\n' + hilfe); process.exit(2); }
for (const f of o.dateien) if (!existsSync(f)) { console.error(`Datei nicht gefunden: ${f}`); process.exit(2); }
const VON = Number(o.von), BIS = Number(o.bis), DAUER = +(BIS - VON).toFixed(3);
if (!(DAUER > 0)) { console.error('--bis muss größer als --von sein'); process.exit(2); }
const NAMEN = (o.namen || 'A,B').split(',').map((s) => s.trim());
const de = (t) => t.toFixed(2).replace('.', ',');

// ---------------------------------------------------------------- Ereignisse
async function ereignisZeilen() {
  if (!o.ereignisse) return [];
  let d = JSON.parse(await readFile(o.ereignisse, 'utf8'));
  if (!Array.isArray(d)) d = d.ereignisse || [];
  const typen = o.typen ? new Set(o.typen.split(',').map((s) => s.trim())) : null;
  const gruppen = [];   // Ereignisse im selben Frame zu einer Zeile zusammenfassen
  for (const e of d.sort((a, b) => a.t - b.t)) {
    const t = Number(e.t);
    if (t < VON - 1e-6 || t > BIS + 1e-6 || (typen && !typen.has(e.typ))) continue;
    let s = `${e.typ || 'Ereignis'}${e.text ? ` (${String(e.text).replace(/\s+/g, ' ').slice(0, 90)})` : ''}`;
    if (e.lesbarAb !== undefined && e.lesbarAb !== null) s += `, voll lesbar ab ${de(Number(e.lesbarAb) - VON)} s`;
    if (e.ausstiegAb !== undefined && e.ausstiegAb !== null) s += `, Ausstieg ab ${de(Number(e.ausstiegAb) - VON)} s`;
    if (e.typ === 'stille' && e.bis !== undefined) s += `, gewollte Stille bis ${de(Number(e.bis) - VON)} s`;
    const g = gruppen[gruppen.length - 1];
    if (g && t - g.t < 0.02) g.teile.push(s); else gruppen.push({ t, teile: [s] });
  }
  return gruppen.map((g) => `${de(g.t - VON)} s: ${g.teile.join(' + ')}`);
}

// ---------------------------------------------------------------- Sperre + ffmpeg
async function sperre() {
  if (!o.sperre) return null;
  const L = `/tmp/${o.sperre}-render.lock`;
  for (let i = 0; i < 120; i++) {
    try { mkdirSync(L); return L; } catch { if (i === 0) console.error(`Sperre belegt (${L}), warte …`); }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Sperre nach 10 min noch belegt: ${L}`);
}
function ffmpeg(a) {
  const r = spawnSync('nice', ['-n', '10', 'ffmpeg', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error(`ffmpeg fehlgeschlagen (Exit ${r.status})`);
}

async function baueClip(tmp) {
  const out = join(tmp, 'hoertest.mp4');
  const inputs = [], filt = [];
  o.dateien.forEach((f, i) => {
    inputs.push('-ss', String(VON), '-t', String(DAUER), '-i', f);
    filt.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${DAUER}[a${i}]`);
  });
  const gesamt = o.vergleich ? 2 * DAUER + PAUSE : DAUER;
  let fc = filt.join(';');
  if (o.vergleich) fc += `;anullsrc=r=48000:cl=stereo:d=${PAUSE}[p];[a0][p][a1]concat=n=3:v=0:a=1[a]`;
  else fc += ';[a0]anull[a]';
  ffmpeg([...inputs, '-f', 'lavfi', '-i', `color=c=black:s=640x360:r=10:d=${gesamt}`, '-filter_complex', fc,
    '-map', `${o.dateien.length}:v`, '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', String(gesamt), '-movflags', '+faststart', out]);
  return out;
}

// ---------------------------------------------------------------- Prompt
function fragen(ziel) {
  return [
    `1. Übergänge: Wo klingen Übergänge oder Schnitte in der Musik unnatürlich (Sprung, Stolpern, abgeschnittene Phrase, Schleifen-Gefühl, Loch)? Jeweils Zeitstempel und was genau.`,
    `2. Sprünge: Gibt es Sprünge in Klangfarbe, Rhythmus/Takt, Tempo oder Harmonie? Zeitstempel.`,
    `3. Ende: Wirkt ${ziel === 'ende' ? 'das Ende' : 'das Ende dieses Ausschnitts'} wie ein natürlicher Schluss bzw. Übergang (Auflösung, Ausklang), oder verpufft/bricht es ab? Antworte mit „natürlich: ja“ oder „natürlich: nein“ und Begründung.`,
    `4. Akzente: Sitzen die Effekte und Musik-Akzente hörbar auf den genannten Bildereignissen, oder kommen sie zu früh, zu spät oder gehen unter? Zeitstempel.`,
    `5. Urteil: Gesamturteil in einem Satz und die eine wichtigste Verbesserung.`,
  ];
}

async function main() {
  const ev = await ereignisZeilen();
  const kontext = o.kontext ? ` Hinweis zum Material: ${o.kontext}.` : '';
  const evText = ev.length
    ? `Im (nicht sichtbaren) Bild passieren diese Ereignisse, Zeit in Sekunden ab Anfang ${o.vergleich ? 'JEDER Variante' : 'des Clips'}:\n${ev.map((z) => '- ' + z).join('\n')}`
    : 'Zu den Bildereignissen liegen keine Zeitstempel vor; beurteile nur den Ton.';
  const ziel = o.ziel || 'ende';
  let prompt;
  if (!o.vergleich) {
    prompt = `Du bist ein erfahrener Musik-Editor und Mixing-Engineer. Dieses Video ist schwarz; es zählt nur der TON. Es ist ein Ausschnitt von ${de(DAUER)} s aus einem Produktfilm (Filmzeit ${de(VON)} bis ${de(BIS)} s): Musik plus Sound-Effekte (Klicks, Pops, Whooshes, Hits).${kontext}
${evText}
Hör genau hin und antworte auf Deutsch, knapp und konkret, Zeitstempel in Sekunden ab Clip-Anfang:
${fragen(ziel).join('\n')}
Erfinde nichts; wenn du dir unsicher bist, sag es.`;
  } else {
    const b0 = DAUER + PAUSE;
    prompt = `Du bist ein erfahrener Musik-Editor und Mixing-Engineer. Dieses Video ist schwarz; es zählt nur der TON. Es enthält ZWEI Varianten desselben Ausschnitts (${de(DAUER)} s, Filmzeit ${de(VON)} bis ${de(BIS)} s) aus einem Produktfilm: Variante ${NAMEN[0]} von 0 bis ${de(DAUER)} s, dann ${PAUSE} s Stille, dann Variante ${NAMEN[1]} von ${de(b0)} bis ${de(b0 + DAUER)} s. Musik plus Sound-Effekte.${kontext}
${evText}
Gib alle Zeitstempel RELATIV zum Anfang der jeweiligen Variante an (bei ${NAMEN[1]}: Clipzeit minus ${de(b0)} s).
Hör genau hin und beantworte für jede Variante getrennt (Überschrift „Variante ${NAMEN[0]}“ und „Variante ${NAMEN[1]}“), auf Deutsch, knapp und konkret:
${fragen(ziel).join('\n')}
Danach eine Überschrift „Entscheidung“: Welche Variante ist besser (genau eine nennen: „Entscheidung: ${NAMEN[0]}“ oder „Entscheidung: ${NAMEN[1]}“), warum in zwei Sätzen, und was an der besseren noch zu verbessern ist.
Erfinde nichts; wenn du dir unsicher bist, sag es.`;
  }

  const tmp = await mkdtemp(join(tmpdir(), 'hoertest-'));
  let L = null;
  try {
    L = await sperre();
    const clip = await baueClip(tmp);
    if (L) { rmdirSync(L); L = null; }
    // Wiederholung (429/5xx) und Ersatzmodell regelt gemini.mjs (GEMINI_MODEL_FALLBACK).
    const { text, model, ersatzFuer } = await analyseVideo(clip, prompt, { model: o.modell, temperature: 0.2, maxOutputTokens: 8192 });
    if (ersatzFuer) console.error(`Hinweis: Hörtest lief mit dem Ersatzmodell ${model} statt ${ersatzFuer}. Stand damit höchstens „Bild fertig, Hörtest eingeschränkt (Ersatzmodell), bitte selbst hören“, nicht „fertig“ (references/06-ton.md, Schritt 9).`);
    const stamm = (f) => basename(f, extname(f));
    const vb = `${String(VON).replace('.', ',')}-${String(BIS).replace('.', ',')}`;
    const out = o.out || join(dirname(resolve(o.dateien[0])),
      o.vergleich ? `hoertest-${stamm(o.dateien[0])}-gegen-${stamm(o.dateien[1])}-${vb}.md` : `hoertest-${stamm(o.dateien[0])}-${vb}.md`);
    const kopf = `<!-- hoertest.mjs · ${model}${ersatzFuer ? ` (Ersatz für ${ersatzFuer})` : ''} · ${new Date().toISOString().slice(0, 10)} · Ausschnitt ${de(VON)}–${de(BIS)} s · `
      + (o.vergleich ? `Vergleich ${NAMEN[0]} = ${o.dateien[0]} | ${NAMEN[1]} = ${o.dateien[1]}` : `Quelle ${o.dateien[0]}`)
      + ` · Ereignisse: ${o.ereignisse || 'keine'} · Antwort wörtlich, ein Hinweis, keine Abnahme -->\n\n`
      + (ersatzFuer ? `> **Hörtest eingeschränkt:** nur das Ersatzmodell ${model} hat gehört (Hauptmodell ${ersatzFuer} nicht verfügbar). Stand höchstens „Bild fertig, Hörtest eingeschränkt, bitte selbst hören“. Befunde, die der Messung widersprechen, mit Gegenprobe prüfen (06-ton.md Schritt 9).\n\n` : '');
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, kopf + text + '\n');
    if (o.vergleich) {
      const m = text.match(/Entscheidung:\s*\**\s*([^\s*.,]+)/i);
      console.log(`Entscheidung laut Hörtest: ${m ? m[1] : 'nicht eindeutig (Antwort lesen)'}`);
    }
    console.log('ok', out, text.length, 'Zeichen');
  } finally {
    if (L) { try { rmdirSync(L); } catch {} }
    await rm(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error('Fehler:', e.message);
  if (e.status) console.error('Der Hörtest ist damit NICHT gelaufen: Film gilt als „Bild fertig, Hörtest offen“ (references/06-ton.md, Schritt 9).');
  process.exit(1);
});
