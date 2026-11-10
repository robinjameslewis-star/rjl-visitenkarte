// Eine Rechnung aus Word, PDF und ähnlichen Dateien als Zeilen und Zellen lesen (ohne Bibliothek, ohne DOM, auch in Node): Word (.docx),
// OpenDocument (.odt, .ods), Excel (.xlsx), Text (.txt) und PDF mit Textebene (pdftext.js). Alles bleibt im Browser. Eine Zeile ist
// { zellen: [{ t, x }], bereich: "haupt" | "kopf" | "fuss", tol }: Tabellenzellen und Tabulatoren werden Zellen, mehrzeilige
// Zellen (Anschriftfeld in einer Layout-Tabelle) werden nebeneinander so viele Zeilen, wie sie sichtbar haben. erkennen.js liest daraus
// die Angaben der Maske.
import { pdfTextLesen } from "./pdftext.js";

export const GRENZE = 30 * 1024 * 1024;
const utf8 = new TextDecoder("utf-8");

async function inflate(bytes) {
  const strom = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

// ZIP: Zentralverzeichnis lesen, gewünschte Einträge entpacken (Stored oder Deflate)
export async function zipLesen(bytes, wahl = () => true) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let ende = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { ende = i; break; }
  if (ende < 0) throw new Error("zip");
  const anzahl = dv.getUint16(ende + 10, true);
  let p = dv.getUint32(ende + 16, true);
  const out = new Map();
  for (let n = 0; n < anzahl && p + 46 <= bytes.length; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const art = dv.getUint16(p + 10, true), gross = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), kl = dv.getUint16(p + 32, true);
    const lokal = dv.getUint32(p + 42, true), name = utf8.decode(bytes.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + el + kl;
    if (!wahl(name) || lokal + 30 > bytes.length) continue;
    const start = lokal + 30 + dv.getUint16(lokal + 26, true) + dv.getUint16(lokal + 28, true);
    const roh = bytes.subarray(start, start + gross);
    if (art === 0) out.set(name, roh);
    else if (art === 8) { try { out.set(name, await inflate(roh)); } catch { /* defekter Eintrag */ } }
  }
  return out;
}

// ---------- XML ohne DOM: Elemente als Ereignisse ----------
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const entschl = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m);
function* xmlEreignisse(xml) {
  const re = /<(\/?)([\w:.-]+)([^>]*?)(\/?)>|<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[6] !== undefined) yield { text: entschl(m[6]) };
    else if (m[5] !== undefined) yield { text: m[5] };
    else if (m[2]) {
      const attr = {};
      for (const a of (m[3] || "").matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attr[a[1]] = entschl(a[3] ?? a[4]);
      if (m[1]) yield { zu: m[2] };
      else { yield { auf: m[2], attr }; if (m[4]) yield { zu: m[2] }; }
    }
  }
}

// Ein Baum aus Absätzen und Tabellen: { art: "p", zeilen: [[zellen der Tabulatoren]] } | { art: "tab", zeilen: [[zelle = Blöcke]] }
// Die Namen der Elemente je Format; Textfelder (Word: w:txbxContent, ODT: draw:text-box) werden eigene Blöcke nach dem Absatz
function bloecke(xml, F) {
  const wurzel = { kinder: [] };
  const stapel = [wurzel];
  let absatz = null, zelle = null, ueberspringen = 0, nurText = 0;
  const oben = () => stapel[stapel.length - 1];
  const absaetze = [];
  for (const e of xmlEreignisse(xml)) {
    if (ueberspringen) { if (e.auf && F.weg.has(e.auf)) ueberspringen++; else if (e.zu && F.weg.has(e.zu)) ueberspringen--; continue; }
    if (e.auf) {
      const n = e.auf;
      if (F.weg.has(n)) { ueberspringen = 1; continue; }
      if (F.p.has(n)) { if (absatz) absaetze.push(absatz); absatz = { art: "p", zeilen: [[""]] }; oben().kinder.push(absatz); continue; }
      if (F.feld.has(n)) { const b = { art: "feld", kinder: [] }; (oben().kinder).push(b); stapel.push(b); if (absatz) absaetze.push(absatz); absatz = null; continue; }
      if (F.tabelle.has(n)) { const t = { art: "tab", zeilen: [] }; oben().kinder.push(t); stapel.push(t); if (absatz) absaetze.push(absatz); absatz = null; continue; }
      if (F.zeile.has(n)) { const t = oben(); if (t.art === "tab") t.zeilen.push([]); continue; }
      if (F.zelle.has(n)) {
        const t = oben();
        if (t.art === "tab") { if (!t.zeilen.length) t.zeilen.push([]); zelle = { art: "zelle", kinder: [], spann: +(e.attr[F.spann] || 1) || 1 }; t.zeilen[t.zeilen.length - 1].push(zelle); stapel.push(zelle); }
        continue;
      }
      if (F.spannEl && n === F.spannEl) { const c = stapel[stapel.length - 1]; if (c.art === "zelle") c.spann = +(e.attr["w:val"] || 1) || 1; continue; }
      if (absatz && F.tab.has(n)) { absatz.zeilen[absatz.zeilen.length - 1].push(""); continue; }
      if (absatz && F.br.has(n) && (!F.brArt || !e.attr[F.brArt] || e.attr[F.brArt] === "textWrapping")) { absatz.zeilen.push([""]); continue; }
      if (absatz && F.s && n === F.s) { const z = absatz.zeilen[absatz.zeilen.length - 1]; z[z.length - 1] += " ".repeat(+(e.attr["text:c"] || 1) || 1); continue; }
      if (F.t.has(n)) nurText++;
      continue;
    }
    if (e.zu) {
      const n = e.zu;
      if (F.p.has(n)) { absatz = absaetze.pop() || null; continue; }
      if (F.feld.has(n) || F.tabelle.has(n) || F.zelle.has(n)) { if (stapel.length > 1) stapel.pop(); continue; }
      if (F.t.has(n)) nurText = Math.max(0, nurText - 1);
      continue;
    }
    if (e.text !== undefined && absatz && (nurText || !F.t.size)) { const z = absatz.zeilen[absatz.zeilen.length - 1]; z[z.length - 1] += e.text; }
  }
  return wurzel.kinder;
}

// Blöcke zu Zeilen; x je Zelle: Spalte × 100 + Tabulator, Textfelder rechts daneben (je ein eigener Bereich von x)
function zeilenAus(kinder, bereich, x0 = 0, out = []) {
  let feldNr = 0;
  for (const b of kinder) {
    if (b.art === "p") for (const z of b.zeilen) out.push({ zellen: z.map((t, i) => ({ t: t.replace(/\s+/g, " ").trim(), x: x0 + i })).filter(c => c.t), bereich, tol: 0.5 });
    // Ein leerer Absatz ist sichtbarer Abstand: Die nächste Zeile beginnt einen neuen Block (Anschrift, Briefkopf)
    else if (b.art === "feld") zeilenAus(b.kinder, bereich, x0 + 5000 * ++feldNr, out);
    else if (b.art === "tab") {
      for (const reihe of b.zeilen) {
        // jede Zelle als eigene Zeilenliste, dann nebeneinander legen
        let spalte = 0;
        const spalten = reihe.map(c => { const x = x0 + spalte * 100; spalte += c.spann; return zeilenAus(c.kinder, bereich, x, []); });
        const hoehe = Math.max(0, ...spalten.map(s => s.length));
        for (let k = 0; k < hoehe; k++) {
          const zellen = spalten.flatMap(s => s[k] ? s[k].zellen : []);
          if (zellen.length) out.push({ zellen, bereich, tol: 0.5 });
        }
      }
    }
  }
  return abstaende(out);
}
const abstaende = zeilen => { const o = []; let leer = false; for (const z of zeilen) { if (!z.zellen.length) { leer = true; continue; } o.push(leer ? { ...z, abstand: true } : z); leer = false; } return o; };

const WORD = { p: new Set(["w:p"]), t: new Set(["w:t"]), tab: new Set(["w:tab", "w:ptab"]), br: new Set(["w:br", "w:cr"]), brArt: "w:type", tabelle: new Set(["w:tbl"]), zeile: new Set(["w:tr"]),
  zelle: new Set(["w:tc"]), feld: new Set(["w:txbxContent"]), weg: new Set(["mc:Fallback", "w:del", "w:instrText", "w:tblPr", "w:rPr", "w:pPr", "w:sectPr", "w:delText", "w:fldData"]), spann: "w:gridSpan", spannEl: "w:gridSpan" };
const ODF = { p: new Set(["text:p", "text:h"]), t: new Set(), tab: new Set(["text:tab"]), br: new Set(["text:line-break"]), s: "text:s", tabelle: new Set(["table:table"]), zeile: new Set(["table:table-row"]),
  zelle: new Set(["table:table-cell", "table:covered-table-cell"]), feld: new Set(["draw:text-box"]), weg: new Set(["office:annotation", "text:tracked-changes", "office:font-face-decls", "office:automatic-styles", "style:style", "text:note-citation"]), spann: "table:number-columns-spanned" };

async function wordLesen(bytes) {
  const teile = await zipLesen(bytes, n => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
  if (!teile.has("word/document.xml")) return null;
  const xml = n => utf8.decode(teile.get(n));
  const zeilen = [];
  for (const n of [...teile.keys()].filter(n => /header/.test(n)).sort()) zeilen.push(...zeilenAus(bloecke(xml(n), WORD), "kopf"));
  zeilen.push(...zeilenAus(bloecke(xml("word/document.xml"), WORD), "haupt"));
  for (const n of [...teile.keys()].filter(n => /footer/.test(n)).sort()) zeilen.push(...zeilenAus(bloecke(xml(n), WORD), "fuss"));
  return zeilen;
}
async function odfLesen(bytes) {
  const teile = await zipLesen(bytes, n => n === "content.xml" || n === "styles.xml");
  if (!teile.has("content.xml")) return null;
  const zeilen = [];
  if (teile.has("styles.xml")) {
    const s = utf8.decode(teile.get("styles.xml"));
    for (const [, inhalt] of s.matchAll(/<style:header>([\s\S]*?)<\/style:header>/g)) zeilen.push(...zeilenAus(bloecke(inhalt, ODF), "kopf"));
    zeilen.push(...zeilenAus(bloecke(utf8.decode(teile.get("content.xml")), ODF), "haupt"));
    for (const [, inhalt] of s.matchAll(/<style:footer>([\s\S]*?)<\/style:footer>/g)) zeilen.push(...zeilenAus(bloecke(inhalt, ODF), "fuss"));
  } else zeilen.push(...zeilenAus(bloecke(utf8.decode(teile.get("content.xml")), ODF), "haupt"));
  return zeilen;
}

// Excel: erste Tabelle, Zellwerte als Text; Datumszellen (Zahlformat mit Tag, Monat, Jahr) als TT.MM.JJJJ
async function excelLesen(bytes) {
  const teile = await zipLesen(bytes, n => /^xl\/(sharedStrings|styles|workbook)\.xml$|^xl\/worksheets\/sheet\d+\.xml$|^xl\/_rels\/workbook\.xml\.rels$/.test(n));
  const blatt = [...teile.keys()].filter(n => /worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => +a.match(/(\d+)\.xml$/)[1] - +b.match(/(\d+)\.xml$/)[1])[0];
  if (!blatt) return null;
  const txt = n => teile.has(n) ? utf8.decode(teile.get(n)) : "";
  const texte = [...txt("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => entschl([...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(t => t[1]).join("")));
  const st = txt("xl/styles.xml"), eigene = new Map([...st.matchAll(/<numFmt [^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)].map(m => [+m[1], entschl(m[2])]));
  const xfs = [...((/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(st) || [])[1] || "").matchAll(/<xf [^>]*?numFmtId="(\d+)"/g)].map(m => +m[1]);
  const istDatum = s => { const id = xfs[+s]; if (id == null) return false; if (id >= 14 && id <= 22 || id >= 45 && id <= 47) return true; const f = (eigene.get(id) || "").replace(/"[^"]*"|\[[^\]]*\]/g, ""); return /[dy]/i.test(f) && !/[#0]/.test(f.replace(/[^#0dmy]/gi, "").replace(/[dmy]/gi, "")); };
  const datum = v => { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(+v) * 864e5); return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`; };
  const spalte = r => { let n = 0; for (const c of /^[A-Z]+/.exec(r)[0]) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };
  const zeilen = [];
  let vorige = 0;
  for (const [, kopfR, inhalt] of txt(blatt).matchAll(/<row([^>]*)>([\s\S]*?)<\/row>/g)) {
    const nr = +((/\br="(\d+)"/.exec(kopfR) || [])[1] || vorige + 1);
    const zellen = [];
    for (const c of inhalt.matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = c[1], r = (/r="([A-Z]+\d+)"/.exec(a) || [])[1], t = (/t="(\w+)"/.exec(a) || [])[1], s = (/s="(\d+)"/.exec(a) || [])[1];
      const v = (/<v>([^<]*)<\/v>/.exec(c[2] || "") || [])[1], is = [...(c[2] || "").matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(m => m[1]).join("");
      let w = t === "s" ? texte[+v] : t === "inlineStr" ? entschl(is) : t === "str" || t === "b" ? entschl(v || "") : v == null ? "" : s != null && istDatum(s) ? datum(v) : String(+(+v).toFixed(6));
      if (w && r) zellen.push({ t: String(w).replace(/\s+/g, " ").trim(), x: spalte(r) * 100, roh: t == null && v != null && !(s != null && istDatum(s)) });
    }
    if (zellen.some(z => z.t)) { zeilen.push({ zellen: zellen.filter(z => z.t), bereich: "haupt", tol: 0.5, abstand: nr > vorige + 1 }); vorige = nr; }
  }
  return zeilen;
}

// Text: Tabulatoren und zwei oder mehr Leerzeichen trennen Zellen (x = Spalte des Zeichens)
export function textZeilen(text) {
  return text.replace(/\r\n?/g, "\n").split("\n").map(z => {
    const zellen = [];
    const zeile = z.replace(/\t/g, "    ");
    for (const m of zeile.matchAll(/\S+(?: \S+)*/g)) zellen.push({ t: m[0], x: m.index, x2: m.index + m[0].length });
    return { zellen, bereich: "haupt", tol: 2 };
  }).filter(z => z.zellen.length);
}

const endung = n => (String(n).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || "";
// Ergebnis: { art: "word" | "odt" | "excel" | "pdf" | "text", zeilen, seiten? } oder { fehler: "leer" | "zugross" | "verschluesselt" | "scan" | "doc" | "format" | "defekt" }
export async function dokumentLesen(bytes, name = "") {
  if (!bytes || !bytes.length) return { fehler: "leer" };
  if (bytes.length > GRENZE) return { fehler: "zugross" };
  const e = endung(name), kopf = String.fromCharCode(...bytes.subarray(0, 8));
  try {
    if (kopf.startsWith("%PDF") || bytes.subarray(0, 1024).includes(37) && String.fromCharCode(...bytes.subarray(0, 1024)).includes("%PDF-")) {
      const p = await pdfTextLesen(bytes);
      if (p.verschluesselt) return { fehler: "verschluesselt" };
      if (!p.zeilen.some(z => /\d/.test(z.zellen.map(c => c.t).join(" ")))) return { fehler: "scan", seiten: p.seiten };
      return { art: "pdf", zeilen: p.zeilen, seiten: p.seiten };
    }
    if (kopf.startsWith("PK")) {
      const z = await (e === "xlsx" || e === "xlsm" ? excelLesen(bytes) : e === "odt" || e === "ods" ? odfLesen(bytes) : wordLesen(bytes).then(w => w || odfLesen(bytes)).then(w => w || excelLesen(bytes)));
      if (!z) return { fehler: e === "pages" || e === "numbers" ? "format" : "defekt" };
      return { art: e === "xlsx" || e === "xlsm" ? "excel" : e === "odt" || e === "ods" ? "odt" : "word", zeilen: z };
    }
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf) return { fehler: "doc" };
    if (kopf.startsWith("{\\rtf")) return { fehler: "doc" };
    if (["txt", "text", "csv", ""].includes(e) || !bytes.subarray(0, 4096).some(b => b === 0)) {
      let t;
      try { t = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { t = new TextDecoder("windows-1252").decode(bytes); }
      return { art: "text", zeilen: textZeilen(t.replace(/^﻿/, "")) };
    }
  } catch { return { fehler: "defekt" }; }
  return { fehler: "format" };
}
