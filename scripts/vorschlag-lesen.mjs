// vorschlag-lesen.mjs: liest die Szenen-Tabelle aus <lauf>/VORSCHLAG.md (Format templates/vorschlag.vorlage.md).
// Teil des Skills motion-videos (MIT). Wird von navi.mjs und standbilder.mjs genutzt, kein eigenes CLI.

export const woerter = (s) => (String(s || '').match(/[\p{L}\p{N}]+/gu) || []).length;

/** HTML-Kommentare entfernen (Erklärungen in der Vorlage). */
export const ohneKommentare = (md) => String(md || '').replace(/<!--[\s\S]*?-->/g, '');

/** Übrig gebliebene Platzhalter der Vorlage, z. B. „<Titel>“ (HTML-Tags wie <br> zählen nicht). */
export function platzhalter(md) {
  const t = ohneKommentare(md).replace(/`[^`\n]*`/g, '');
  return [...t.matchAll(/<(?!\/?(?:br|b|i|em|strong|sub|sup|kbd|code|a|img|span|div|p)\b)[^<>\n]{1,80}>/gi)].map((m) => m[0]);
}

/** Szenen-Tabelle: erste Markdown-Tabelle mit einer Spalte „Aussage“ und Zeilen, die mit einer Nummer beginnen.
 *  Rückgabe: [{ nr, beat, funktion, beleg, aussage, bildwelt, bild, zellen }] */
export function szenenAusVorschlag(md) {
  const zeilen = ohneKommentare(md).split('\n');
  let kopf = null; const out = [];
  for (const z of zeilen) {
    const s = z.trim();
    if (!s.startsWith('|')) { if (kopf && out.length) break; continue; }
    const c = s.replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
    if (!kopf) { if (c.some((x) => /^Aussage/i.test(x))) kopf = c; continue; }
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    if (!/^\d+[a-z]?$/i.test(c[0])) continue;
    const spalte = (re) => { const i = kopf.findIndex((x) => re.test(x)); return i >= 0 ? (c[i] || '').trim() : ''; };
    out.push({
      nr: c[0],
      beat: spalte(/Vorbild|Beat/i),
      funktion: spalte(/^Funktion/i),
      beleg: spalte(/Beleg/i),
      aussage: spalte(/^Aussage/i).replace(/[„“"*]/g, '').trim(),
      bildwelt: spalte(/^Bildwelt/i).replace(/[*`]/g, '').trim(),
      bild: spalte(/^Bild(idee)?\b(?!welt)/i),
      zellen: c,
    });
  }
  return out;
}
