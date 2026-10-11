// Gemeinsamer Helfer: Video über die Google Gemini API (Files API) analysieren.
// Teil des Skills motion-videos (MIT). Node 18+ (fetch eingebaut), keine npm-Abhängigkeiten.
// Genutzt von ton-referenz.mjs, video-verstehen.mjs und hoertest.mjs.
//
// Ablauf: Datei resumable hochladen → warten bis ACTIVE → generateContent → Datei bei Google wieder löschen.
// Key:    GEMINI_API_KEY (oder GOOGLE_API_KEY). Modell: GEMINI_MODEL (Default unten).
// Ersatz: GEMINI_MODEL_FALLBACK (Default unten; „keins“ schaltet den Ersatz ab). Springt ein, wenn das Hauptmodell
//         nach allen Wiederholungen weiter 429/5xx liefert, sein Tageskontingent erschöpft ist oder es nicht existiert (404).
// Wiederholung: 429 (Minuten-Limit), 500, 502, 503, 504 → bis zu 3 neue Versuche nach 20, 60, 120 s
//         (oder nach der von Google genannten Wartezeit). Ein erschöpftes Tageskontingent wird nicht wiederholt.
//         GEMINI_WARTEN="20,60,120" ändert die Wartezeiten (Sekunden, z. B. für Tests).
// Suche:  Umgebungsvariable → ./.env (Arbeitsverzeichnis) → <skill>/.env
// Der Key geht nur im Header x-goog-api-key mit, nie in der URL.
// Free Tier: Ein Key ohne Abrechnung hat je Modell ein kleines Tageskontingent (Stand Oktober 2026: 20 Anfragen/Tag
// für Flash-Modelle). Analyse, Hörtests und Wiederholungen brauchen in einem Lauf schnell mehr (im Praxistest war das
// Kontingent vor der Auslieferung erschöpft) → Abrechnung aktivieren.
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILLROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const DEFAULT_FALLBACK = 'gemini-2.5-flash';
const API = 'https://generativelanguage.googleapis.com';
const MODELLE = 'https://ai.google.dev/gemini-api/docs/models';

export async function loadEnvValue(names) {
  for (const n of names) if (process.env[n] !== undefined && process.env[n].trim() !== '') return process.env[n].trim();
  for (const p of [resolve(process.cwd(), '.env'), join(SKILLROOT, '.env')]) {
    if (!existsSync(p)) continue;
    const txt = await readFile(p, 'utf8');
    for (const n of names) {
      const m = txt.match(new RegExp(`^\\s*${n}\\s*=\\s*["']?([^"'\\n\\r#]+)`, 'm'));
      if (m && m[1].trim()) return m[1].trim();
    }
  }
  return null;
}

const MIME = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.m4v': 'video/mp4', '.avi': 'video/x-msvideo' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function wartezeiten() {
  const roh = process.env.GEMINI_WARTEN;
  if (roh) {
    const w = roh.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x) && x >= 0);
    if (w.length) return w;
  }
  return [20, 60, 120];
}

/** Ordnet eine Fehlerantwort von Google ein. Exportiert für Tests.
 *  art: tageskontingent | minutenlimit | ueberlastet | serverfehler | modell-fehlt | key | sonst
 *  wiederholen: neuer Versuch mit demselben Modell sinnvoll · ersatz: Ersatzmodell sinnvoll · warteS: Googles Vorschlag */
export function deuteFehler(status, body = '', model = '') {
  const b = String(body);
  const m = b.match(/retry in ([\d.]+)\s*s/i) || b.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i);
  const warteS = m ? Math.ceil(Number(m[1])) : null;
  const limit = (b.match(/limit:\s*(\d+)/i) || [])[1];
  if (status === 429) {
    if (/PerDay|per day|daily/i.test(b)) {
      const frei = /free_?tier|FreeTier/i.test(b);
      return {
        art: 'tageskontingent', wiederholen: false, ersatz: true, warteS,
        text: `Tageskontingent des Keys für ${model || 'dieses Modell'} erschöpft`
          + (frei ? ` (Free Tier: ${limit || 20} Anfragen/Tag)` : (limit ? ` (Limit ${limit}/Tag)` : ''))
          + '. Abrechnung für den Key aktivieren (https://aistudio.google.com/) oder morgen weiter.',
      };
    }
    return {
      art: 'minutenlimit', wiederholen: true, ersatz: true, warteS,
      text: `Zu viele Anfragen in kurzer Zeit (Rate-Limit${limit ? ` ${limit}` : ''}). Wird nach einer Pause wiederholt.`,
    };
  }
  if (status === 503) return { art: 'ueberlastet', wiederholen: true, ersatz: true, warteS, text: `Modell ${model} gerade überlastet (HTTP 503). Wird nach einer Pause wiederholt.` };
  if (status >= 500) return { art: 'serverfehler', wiederholen: true, ersatz: true, warteS, text: `Fehler bei Google (HTTP ${status}). Wird nach einer Pause wiederholt.` };
  if (status === 404) return { art: 'modell-fehlt', wiederholen: false, ersatz: true, warteS: null, text: `Modell „${model}“ gibt es nicht (mehr) oder es kann kein generateContent. GEMINI_MODEL in der .env prüfen, Liste: ${MODELLE}` };
  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(b)) return { art: 'key', wiederholen: false, ersatz: false, warteS: null, text: 'Der GEMINI_API_KEY ist ungültig. Neuen Key anlegen: https://aistudio.google.com/apikey' };
  if (status === 401 || status === 403) return { art: 'key', wiederholen: false, ersatz: false, warteS: null, text: `Key ohne Berechtigung (HTTP ${status}): Key prüfen oder die Gemini API im Projekt aktivieren.` };
  return { art: 'sonst', wiederholen: false, ersatz: false, warteS: null, text: `HTTP ${status}.` };
}

function fehler(status, body, was, model) {
  const d = deuteFehler(status, body, model);
  const e = new Error(`${was}: ${d.text} [HTTP ${status}] ${String(body).replace(/\s+/g, ' ').slice(0, 300)}`);
  Object.assign(e, { status, art: d.art, ersatz: d.ersatz, hinweis: d.text });
  return e;
}

/** fetch mit Wiederholung bei 429 (Minuten-Limit) und 5xx. Liefert die ok-Antwort oder wirft einen gedeuteten Fehler. */
async function holeMitWiederholung(mache, was, model, log) {
  const W = wartezeiten();
  for (let versuch = 0; ; versuch++) {
    let res;
    try { res = await mache(); } catch (netz) {
      if (versuch >= W.length) throw new Error(`${was}: Netzwerkfehler (${netz.message}). Verbindung prüfen.`);
      log(`${was}: Netzwerkfehler (${netz.message}), neuer Versuch ${versuch + 1}/${W.length} in ${W[versuch]} s …`);
      await sleep(W[versuch] * 1000);
      continue;
    }
    if (res.ok) return res;
    const body = await res.text();
    const d = deuteFehler(res.status, body, model);
    if (d.wiederholen && versuch < W.length) {
      const s = Math.max(W[versuch], Math.min(d.warteS || 0, 300));
      log(`${was}: ${d.text.split('. ')[0]} (HTTP ${res.status}), neuer Versuch ${versuch + 1}/${W.length} in ${s} s …`);
      await sleep(s * 1000);
      continue;
    }
    throw fehler(res.status, body, was, model);
  }
}

/** Kontingent-Probe: eine Mini-Textanfrage (wenige Tokens, keine Wiederholung) an das Hauptmodell, bei Kontingent-
 *  oder Modellfehler an das Ersatzmodell. Rückgabe { stufe: 'haupt' | 'ersatz' | 'keins', model, text }. */
export async function pruefeKontingent({ log = () => {} } = {}) {
  const key = await loadEnvValue(['GEMINI_API_KEY', 'GOOGLE_API_KEY']);
  if (!key) return { stufe: 'keins', model: null, text: 'GEMINI_API_KEY fehlt' };
  const MODEL = (await loadEnvValue(['GEMINI_MODEL'])) || DEFAULT_MODEL;
  const fb = (await loadEnvValue(['GEMINI_MODEL_FALLBACK'])) || DEFAULT_FALLBACK;
  const FALLBACK = /^(keins|keine|aus|none|off|-)$/i.test(fb) ? null : fb;
  const frage = async (m) => {
    const res = await fetch(`${API}/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Antworte nur mit: ok' }] }], generationConfig: { maxOutputTokens: 16, temperature: 0 } }),
    });
    if (res.ok) return null;
    return deuteFehler(res.status, await res.text(), m);
  };
  let f;
  try { f = await frage(MODEL); } catch (e) { return { stufe: 'keins', model: MODEL, text: `Netzwerkfehler (${e.message})` }; }
  if (!f) return { stufe: 'haupt', model: MODEL, text: `${MODEL} antwortet` };
  log(f.text);
  if (!f.ersatz || !FALLBACK || FALLBACK === MODEL) return { stufe: 'keins', model: MODEL, text: f.text };
  let f2;
  try { f2 = await frage(FALLBACK); } catch (e) { return { stufe: 'keins', model: FALLBACK, text: `${f.text} Ersatzmodell: Netzwerkfehler (${e.message})` }; }
  if (!f2) return { stufe: 'ersatz', model: FALLBACK, text: `Hauptmodell ${MODEL}: ${f.text} Ersatzmodell ${FALLBACK} antwortet.` };
  return { stufe: 'keins', model: FALLBACK, text: `Hauptmodell ${MODEL}: ${f.text} Ersatzmodell ${FALLBACK}: ${f2.text}` };
}

/** Video-Datei + Prompt → Text-Antwort des Modells. Rückgabe { text, model, usage, ersatzFuer? }. */
export async function analyseVideo(file, prompt, { model, temperature = 0.2, maxOutputTokens = 16000, log = console.error } = {}) {
  const key = await loadEnvValue(['GEMINI_API_KEY', 'GOOGLE_API_KEY']);
  if (!key) throw new Error('GEMINI_API_KEY fehlt → in .env eintragen (cp .env.example .env) oder als Umgebungsvariable setzen. Key: https://aistudio.google.com/apikey');
  const MODEL = model || (await loadEnvValue(['GEMINI_MODEL'])) || DEFAULT_MODEL;
  const fb = (await loadEnvValue(['GEMINI_MODEL_FALLBACK'])) || DEFAULT_FALLBACK;
  const FALLBACK = /^(keins|keine|aus|none|off|-)$/i.test(fb) ? null : fb;
  const mime = MIME[extname(file).toLowerCase()] || 'video/mp4';
  const size = (await stat(file)).size;
  const auth = { 'x-goog-api-key': key };

  // 1. Resumable Upload starten
  log(`Lade hoch: ${basename(file)} (${(size / 1e6).toFixed(1)} MB) …`);
  const start = await holeMitWiederholung(() => fetch(`${API}/upload/v1beta/files`, {
    method: 'POST',
    headers: { ...auth, 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(size), 'X-Goog-Upload-Header-Content-Type': mime, 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: { display_name: basename(file) } }),
  }), 'Upload-Start', MODEL, log);
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Upload-Start: keine x-goog-upload-url in der Antwort');

  // 2. Bytes senden und abschließen
  const bytes = await readFile(file);
  const up = await holeMitWiederholung(() => fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Length': String(size), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
    body: bytes,
  }), 'Upload', MODEL, log);
  let info = (await up.json()).file;

  try {
    // 3. Warten, bis Google das Video verarbeitet hat (max. 10 min)
    for (let i = 0; info.state !== 'ACTIVE'; i++) {
      if (info.state === 'FAILED') throw new Error(`Verarbeitung bei Google fehlgeschlagen: ${JSON.stringify(info.error || {})}`);
      if (i > 120) throw new Error('Datei nach 10 min noch nicht ACTIVE');
      await sleep(5000);
      const r = await holeMitWiederholung(() => fetch(`${API}/v1beta/${info.name}`, { headers: auth }), 'Status-Abfrage', MODEL, log);
      info = await r.json();
    }

    // 4. Analyse (Hauptmodell mit Wiederholung, danach einmal das Ersatzmodell)
    const generiere = async (m) => {
      log(`Analysiere mit ${m} …`);
      const gen = await holeMitWiederholung(() => fetch(`${API}/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ file_data: { mime_type: info.mimeType || mime, file_uri: info.uri } }, { text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens },
        }),
      }), `generateContent (${m})`, m, log);
      const data = await gen.json();
      const cand = data.candidates?.[0];
      const text = (cand?.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
      if (!text) {   // kommt vor (Antwort nur aus Leerzeichen); das Ersatzmodell darf es dann versuchen
        const hinweis = `Leere Antwort von ${m} (finishReason: ${cand?.finishReason || 'unbekannt'}, block: ${data.promptFeedback?.blockReason || 'keiner'}).`;
        throw Object.assign(new Error(hinweis), { art: 'leer', ersatz: !data.promptFeedback?.blockReason, hinweis });
      }
      if (cand.finishReason && cand.finishReason !== 'STOP') log(`Hinweis: finishReason ${cand.finishReason} (Antwort evtl. gekürzt)`);
      return { text, model: m, usage: data.usageMetadata };
    };
    try {
      return await generiere(MODEL);
    } catch (e) {
      if (!e.ersatz || !FALLBACK || FALLBACK === MODEL) throw e;
      log(`${e.hinweis} → weiter mit dem Ersatzmodell ${FALLBACK} (GEMINI_MODEL_FALLBACK).`);
      try {
        return { ...(await generiere(FALLBACK)), ersatzFuer: MODEL };
      } catch (e2) {
        e2.message = `Hauptmodell ${MODEL}: ${e.hinweis} Ersatzmodell ${FALLBACK}: ${e2.hinweis || e2.message}`;
        throw e2;
      }
    }
  } finally {
    // 5. Hochgeladene Datei bei Google löschen (sonst bleibt sie bis zu 48 h liegen)
    if (info?.name) await fetch(`${API}/v1beta/${info.name}`, { method: 'DELETE', headers: auth }).catch(() => {});
  }
}
