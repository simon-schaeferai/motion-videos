// Beschreibt die Tonspur einer Referenz für einen ähnlichen (nicht kopierten) Nachbau.
// Teil des Skills motion-videos (MIT). Google Gemini API direkt (Files API), Key: GEMINI_API_KEY.
// Kosten: für ein Kurzvideo mit einem Flash-Modell im Cent-Bereich (Preise: https://ai.google.dev/gemini-api/docs/pricing).
// Aufruf: node ton-referenz.mjs <video.mp4> <ausgabe.md>
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { analyseVideo } from './gemini.mjs';

const [FILE, OUT] = process.argv.slice(2);
if (!FILE || !OUT) { console.error('Aufruf: node ton-referenz.mjs <video.mp4> <ausgabe.md>'); process.exit(2); }
if (!existsSync(FILE)) { console.error(`Datei nicht gefunden: ${FILE}`); process.exit(2); }

const PROMPT = `You are a senior sound designer. Listen carefully to the AUDIO of this video (watch the picture only to locate events). Describe the soundtrack so another designer can rebuild a SIMILAR (not copied) soundtrack from a sound library or a music generator. Be concrete and audible; invent nothing; mark uncertainty.

Return Markdown with these sections:
1. MUSIC: Is there music, from when to when? Genre/style, tempo (BPM estimate), key/mood if audible, instrumentation, energy curve over time with timestamps (intro, drops, breaks, near-silent moments, build-ups, accent hits, how and when it ends). Does the music sync to cuts?
2. SFX PALETTE: every distinct sound TYPE (e.g. UI click, pop, typing, whoosh, glitch, riser, sub hit, notification chime, counter ticks, shimmer), each with an audible description (pitch, length, brightness, dry/reverb), how often it occurs, and whether repeats are VARIED or identical.
3. EVENT MAP: table timestamp (s, 0.1 precision) | on-screen event | sound(s) heard | relative loudness 1-5, covering the whole video.
4. MIX: balance music vs SFX, frequency space, stereo, overall character, what makes it feel expensive.
5. RECIPE: 8-12 bullet points how to rebuild a similar soundtrack (what to search/generate, how to vary repeats, where music should build/drop).`;

try {
  const { text, model, ersatzFuer } = await analyseVideo(FILE, PROMPT, { temperature: 0.2, maxOutputTokens: 16000 });
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `<!-- ton-referenz.mjs · ${model}${ersatzFuer ? ` (Ersatz für ${ersatzFuer})` : ''} · Quelle: ${FILE} -->\n\n${text}\n`);
  console.log('ok', OUT, text.length, 'Zeichen');
} catch (e) {
  console.error('Fehler:', e.message);
  process.exit(1);
}
