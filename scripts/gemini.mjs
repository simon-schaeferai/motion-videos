// Gemeinsamer Helfer: Video über die Google Gemini API (Files API) analysieren.
// Teil des Skills motion-videos (MIT). Node 18+ (fetch eingebaut), keine npm-Abhängigkeiten.
//
// Ablauf: Datei resumable hochladen → warten bis ACTIVE → generateContent → Datei bei Google wieder löschen.
// Key:    GEMINI_API_KEY (oder GOOGLE_API_KEY). Modell: GEMINI_MODEL (Default unten).
// Suche:  Umgebungsvariable → ./.env (Arbeitsverzeichnis) → <skill>/.env
// Der Key geht nur im Header x-goog-api-key mit, nie in der URL.
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILLROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_MODEL = 'gemini-3.8-flash';
const API = 'https://generativelanguage.googleapis.com';

export async function loadEnvValue(names) {
  for (const n of names) if (process.env[n]) return process.env[n].trim();
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

async function fail(res, what) {
  const body = (await res.text()).slice(0, 400);
  const e = new Error(`${what}: HTTP ${res.status} ${body}`);
  e.status = res.status;
  throw e;
}

/** Video-Datei + Prompt → Text-Antwort des Modells. */
export async function analyseVideo(file, prompt, { model, temperature = 0.2, maxOutputTokens = 16000, log = console.error } = {}) {
  const key = await loadEnvValue(['GEMINI_API_KEY', 'GOOGLE_API_KEY']);
  if (!key) throw new Error('GEMINI_API_KEY fehlt → in .env eintragen (cp .env.example .env) oder als Umgebungsvariable setzen. Key: https://aistudio.google.com/apikey');
  const MODEL = model || (await loadEnvValue(['GEMINI_MODEL'])) || DEFAULT_MODEL;
  const mime = MIME[extname(file).toLowerCase()] || 'video/mp4';
  const size = (await stat(file)).size;
  const auth = { 'x-goog-api-key': key };

  // 1. Resumable Upload starten
  log(`Lade hoch: ${basename(file)} (${(size / 1e6).toFixed(1)} MB) …`);
  const start = await fetch(`${API}/upload/v1beta/files`, {
    method: 'POST',
    headers: { ...auth, 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(size), 'X-Goog-Upload-Header-Content-Type': mime, 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: { display_name: basename(file) } }),
  });
  if (!start.ok) await fail(start, 'Upload-Start');
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Upload-Start: keine x-goog-upload-url in der Antwort');

  // 2. Bytes senden und abschließen
  const up = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Length': String(size), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
    body: await readFile(file),
  });
  if (!up.ok) await fail(up, 'Upload');
  let info = (await up.json()).file;

  try {
    // 3. Warten, bis Google das Video verarbeitet hat (max. 10 min)
    for (let i = 0; info.state !== 'ACTIVE'; i++) {
      if (info.state === 'FAILED') throw new Error(`Verarbeitung bei Google fehlgeschlagen: ${JSON.stringify(info.error || {})}`);
      if (i > 120) throw new Error('Datei nach 10 min noch nicht ACTIVE');
      await sleep(5000);
      const r = await fetch(`${API}/v1beta/${info.name}`, { headers: auth });
      if (!r.ok) await fail(r, 'Status-Abfrage');
      info = await r.json();
    }

    // 4. Analyse
    log(`Analysiere mit ${MODEL} …`);
    const gen = await fetch(`${API}/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ file_data: { mime_type: info.mimeType || mime, file_uri: info.uri } }, { text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens },
      }),
    });
    if (!gen.ok) await fail(gen, `generateContent (${MODEL})`);
    const data = await gen.json();
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
    if (!text) throw new Error(`Leere Antwort (finishReason: ${cand?.finishReason || 'unbekannt'}, block: ${data.promptFeedback?.blockReason || 'keiner'})`);
    if (cand.finishReason && cand.finishReason !== 'STOP') log(`Hinweis: finishReason ${cand.finishReason} (Antwort evtl. gekürzt)`);
    return { text, model: MODEL, usage: data.usageMetadata };
  } finally {
    // 5. Hochgeladene Datei bei Google löschen (sonst bleibt sie bis zu 48 h liegen)
    if (info?.name) await fetch(`${API}/v1beta/${info.name}`, { method: 'DELETE', headers: auth }).catch(() => {});
  }
}
