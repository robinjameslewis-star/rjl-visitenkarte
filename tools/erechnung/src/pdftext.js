// Sichtbaren Text eines PDF mit Lage lesen (ohne Bibliothek, ohne DOM, auch in Node): Objekte und Objektströme, Seitenbaum, Inhalts-
// ströme mit Formular-XObjects, Schriften mit ToUnicode, Kodierung und Differences, Breiten für das Ende jedes Textstücks. Ergebnis
// je Seite: Zeilen mit Zellen (x von links, in Punkt); daraus liest erkennen.js die Rechnungsangaben. Was nicht geht, wird erkannt:
// verschlüsselte PDFs und eingescannte Seiten ohne Textebene (dann gibt es keine Zeilen). Rechnungen verlassen den Browser nicht.
// Bytes 1:1 als Zeichen (TextDecoder("latin1") wäre windows-1252 und verschöbe 0x80–0x9F)
const latin1 = { decode(b) { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return s; } };
const GRENZE = { seiten: 60, tiefe: 6, operatoren: 2_000_000 };

async function entpacken(bytes, roh = false) {
  const strom = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(roh ? "deflate-raw" : "deflate"));
  const teile = [], leser = strom.getReader();
  let n = 0;
  // Ein abgeschnittener oder fehlerhafter Strom liefert, was bis dahin lesbar war
  try { for (;;) { const { done, value } = await leser.read(); if (done) break; teile.push(value); n += value.length; } } catch { if (!n && !roh) return entpacken(bytes.subarray(2), true); }
  const out = new Uint8Array(n);
  let i = 0;
  for (const t of teile) { out.set(t, i); i += t.length; }
  return out;
}
function ascii85(b) {
  const s = latin1.decode(b).replace(/\s+/g, "").replace(/^<~/, "").replace(/~>.*$/, ""), out = [];
  for (let i = 0; i < s.length;) {
    if (s[i] === "z") { out.push(0, 0, 0, 0); i++; continue; }
    const g = s.slice(i, i + 5); i += 5;
    const p = g.padEnd(5, "u");
    let v = 0;
    for (const c of p) v = v * 85 + (c.charCodeAt(0) - 33);
    const by = [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    out.push(...by.slice(0, g.length - 1));
  }
  return new Uint8Array(out);
}
const asciiHex = b => { const h = latin1.decode(b).replace(/[^0-9a-f]/gi, ""); const o = new Uint8Array(Math.ceil(h.length / 2)); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.slice(2 * i, 2 * i + 2).padEnd(2, "0"), 16); return o; };

// ---------- Objekte lesen ----------
const WEISS = new Set([0, 9, 10, 12, 13, 32]), TRENN = new Set([40, 41, 60, 62, 91, 93, 123, 125, 47, 37]);
class Leser {
  constructor(t, pos = 0) { this.t = t; this.i = pos; }
  leer() { const t = this.t; for (;;) { while (this.i < t.length && WEISS.has(t.charCodeAt(this.i))) this.i++; if (t[this.i] === "%") { while (this.i < t.length && t[this.i] !== "\n" && t[this.i] !== "\r") this.i++; } else return; } }
  wort() { const t = this.t, a = this.i; while (this.i < t.length && !WEISS.has(t.charCodeAt(this.i)) && !TRENN.has(t.charCodeAt(this.i))) this.i++; return t.slice(a, this.i); }
  // Ein Wert; Operatoren (Wörter ohne Bedeutung als Wert) kommen als { op }
  wert() {
    this.leer();
    const t = this.t, c = t[this.i];
    if (this.i >= t.length) return undefined;
    if (c === "/") { this.i++; return { n: this.wort().replace(/#([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))) }; }
    if (c === "(") return { s: this.literal() };
    if (c === "<" && t[this.i + 1] === "<") {
      this.i += 2;
      const d = {};
      for (;;) {
        this.leer();
        if (t[this.i] === ">" && t[this.i + 1] === ">") { this.i += 2; break; }
        if (this.i >= t.length) break;
        const k = this.wert();
        if (!k || k.n === undefined) { if (k === undefined) break; continue; }
        d[k.n] = this.wert();
      }
      return d;
    }
    if (c === "<") { const e = t.indexOf(">", this.i); const h = t.slice(this.i + 1, e < 0 ? t.length : e).replace(/[^0-9a-f]/gi, ""); this.i = e < 0 ? t.length : e + 1; let s = ""; for (let k = 0; k < h.length; k += 2) s += String.fromCharCode(parseInt(h.slice(k, k + 2).padEnd(2, "0"), 16)); return { s }; }
    if (c === "[") { this.i++; const a = []; for (;;) { this.leer(); if (t[this.i] === "]") { this.i++; break; } if (this.i >= t.length) break; const v = this.wert(); if (v === undefined) break; a.push(v); } return a; }
    if (c === "]" || c === ">" || c === ")" || c === "{" || c === "}") { this.i++; return { op: c }; }
    const w = this.wort();
    if (!w) { this.i++; return { op: "" }; }
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) {
      // Verweis „n g R“
      if (/^\d+$/.test(w)) {
        const merk = this.i, m = /^\s+(\d+)\s+R(?![^\s/<>[\]()%])/.exec(t.slice(this.i, this.i + 24));
        if (m) { this.i += m[0].length; return { ref: +w }; }
        this.i = merk;
      }
      return +w;
    }
    if (w === "true") return true;
    if (w === "false") return false;
    if (w === "null") return null;
    return { op: w };
  }
  literal() {
    const t = this.t;
    let tiefe = 0, s = "";
    for (this.i++; this.i < t.length; this.i++) {
      const c = t[this.i];
      if (c === "\\") {
        const n = t[++this.i];
        const e = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" }[n];
        if (e !== undefined) s += e;
        else if (/[0-7]/.test(n)) { let o = n; while (o.length < 3 && /[0-7]/.test(t[this.i + 1])) o += t[++this.i]; s += String.fromCharCode(parseInt(o, 8) & 255); }
        else if (n === "\r") { if (t[this.i + 1] === "\n") this.i++; }
        else if (n !== "\n") s += n;
        continue;
      }
      if (c === "(") tiefe++;
      else if (c === ")") { if (tiefe === 0) { this.i++; return s; } tiefe--; }
      s += c;
    }
    return s;
  }
}

class Datei {
  constructor(bytes) {
    this.bytes = bytes; this.t = latin1.decode(bytes); this.lage = new Map(); this.cache = new Map(); this.inStrom = new Map();
    const re = /(\d+)\s+(\d+)\s+obj\b/g;
    let m;
    while ((m = re.exec(this.t))) this.lage.set(+m[1], re.lastIndex); // spätere Fassung (inkrementelle Änderung) gewinnt
  }
  async vorbereiten() {
    for (const [nr] of this.lage) {
      const o = await this.holen(nr);
      if (!o || !o.dict || !o.bytes || name(o.dict.Type) !== "ObjStm") continue;
      try {
        const daten = latin1.decode(await this.daten(o)), first = await this.zahl(o.dict.First) || 0;
        const z = daten.slice(0, first).trim().split(/\s+/).map(Number);
        for (let i = 0; i + 1 < z.length; i += 2) if (!this.lage.has(z[i]) && !this.inStrom.has(z[i])) this.inStrom.set(z[i], { daten, pos: first + z[i + 1] });
      } catch { /* defekter Objektstrom */ }
    }
  }
  async holen(nr) {
    if (this.cache.has(nr)) return this.cache.get(nr);
    this.cache.set(nr, null);
    let v = null;
    if (this.lage.has(nr)) {
      const l = new Leser(this.t, this.lage.get(nr));
      v = l.wert();
      if (v && typeof v === "object" && !Array.isArray(v) && v.n === undefined && v.s === undefined && v.ref === undefined && v.op === undefined) {
        const merk = l.i; l.leer();
        const m = /^stream(\r\n|\n|\r)?/.exec(this.t.slice(l.i, l.i + 8));
        if (m) {
          const s0 = l.i + m[0].length;
          let len = v.Length;
          if (len && len.ref !== undefined) { const x = await this.holen(len.ref); len = typeof x === "number" ? x : null; }
          let s1 = typeof len === "number" ? s0 + len : -1;
          if (s1 < 0 || s1 > this.t.length || !/^\s*endstream/.test(this.t.slice(s1, s1 + 24))) {
            s1 = this.t.indexOf("endstream", s0);
            while (s1 > s0 && (this.t[s1 - 1] === "\n" || this.t[s1 - 1] === "\r")) s1--;
          }
          v = { dict: v, bytes: this.bytes.subarray(s0, Math.max(s0, s1)) };
        } else l.i = merk;
      }
    } else if (this.inStrom.has(nr)) {
      const x = this.inStrom.get(nr);
      v = new Leser(x.daten, x.pos).wert();
    }
    this.cache.set(nr, v ?? null);
    return v ?? null;
  }
  async auf(v) { let n = 0; while (v && v.ref !== undefined && n++ < 32) v = await this.holen(v.ref); return v; }
  async zahl(v) { v = await this.auf(v); return typeof v === "number" ? v : null; }
  async daten(o) {
    let filter = await this.auf(o.dict.Filter);
    filter = filter == null ? [] : Array.isArray(filter) ? filter : [filter];
    let b = o.bytes;
    for (const f of filter) {
      const n = name(await this.auf(f));
      if (n === "FlateDecode" || n === "Fl") b = await entpacken(b);
      else if (n === "ASCII85Decode" || n === "A85") b = ascii85(b);
      else if (n === "ASCIIHexDecode" || n === "AHx") b = asciiHex(b);
      else throw new Error("filter " + n);
    }
    return b;
  }
}
const name = v => v && v.n !== undefined ? v.n : "";

// ---------- Schriften: Zeichencodes in Text und Breiten ----------
// Glyphnamen, die in deutschen Rechnungen vorkommen (Rest: uniXXXX, uXXXX, ein Buchstabe, Ziffernnamen)
const GLYPHEN = { space: " ", exclam: "!", quotedbl: '"', numbersign: "#", dollar: "$", percent: "%", ampersand: "&", quotesingle: "'", quoteright: "’", parenleft: "(", parenright: ")",
  asterisk: "*", plus: "+", comma: ",", hyphen: "-", minus: "−", period: ".", slash: "/", colon: ":", semicolon: ";", less: "<", equal: "=", greater: ">", question: "?", at: "@",
  bracketleft: "[", backslash: "\\", bracketright: "]", underscore: "_", quoteleft: "‘", braceleft: "{", bar: "|", braceright: "}", asciitilde: "~", Euro: "€", euro: "€", section: "§",
  germandbls: "ß", adieresis: "ä", odieresis: "ö", udieresis: "ü", Adieresis: "Ä", Odieresis: "Ö", Udieresis: "Ü", eacute: "é", egrave: "è", agrave: "à", ccedilla: "ç", Eacute: "É",
  endash: "–", emdash: "—", bullet: "•", periodcentered: "·", quotedblleft: "“", quotedblright: "”", quotedblbase: "„", quotesinglbase: "‚", degree: "°", copyright: "©", registered: "®",
  trademark: "™", ellipsis: "…", nbspace: " ", uni00A0: " ", twosuperior: "²", threesuperior: "³", multiply: "×", fi: "fi", fl: "fl", sterling: "£", yen: "¥", paragraph: "¶", acute: "´",
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ordfeminine: "ª", ordmasculine: "º", plusminus: "±", micro: "µ" };
const glyph = n => GLYPHEN[n] ?? (/^[A-Za-z]$/.test(n) ? n : /^uni([0-9A-F]{4})+$/i.test(n) ? n.slice(3).match(/.{4}/g).map(h => String.fromCharCode(parseInt(h, 16))).join("")
  : /^u[0-9A-F]{4,6}$/i.test(n) ? String.fromCodePoint(parseInt(n.slice(1), 16)) : /^[A-Za-z]\.\w+$/.test(n) ? n[0] : null);
// WinAnsi (cp1252) über den TextDecoder; Standard und MacRoman für die gängigen Stellen
const WIN = new TextDecoder("windows-1252"), MAC = new TextDecoder("macintosh");
function basisKodierung(n) {
  const tab = new Array(256);
  for (let i = 0; i < 256; i++) tab[i] = n === "MacRomanEncoding" ? MAC.decode(new Uint8Array([i])) : WIN.decode(new Uint8Array([i]));
  if (n === "StandardEncoding") { tab[39] = "’"; tab[96] = "‘"; tab[0xa4] = "⁄"; tab[0xe1] = "Æ"; }
  return tab;
}

// ToUnicode-CMap: codespacerange, bfchar, bfrange (auch mit Feld)
function cmapLesen(text) {
  const raeume = [], abb = new Map();
  const hex = s => s.replace(/[<>\s]/g, "");
  const uni = h => { let s = ""; for (let i = 0; i + 3 < h.length; i += 4) s += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); if (h.length === 2) s = String.fromCharCode(parseInt(h, 16)); return s; };
  for (const b of text.matchAll(/begincodespacerange([\s\S]*?)endcodespacerange/g)) for (const m of b[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi)) raeume.push({ len: m[1].length / 2, von: parseInt(m[1], 16), bis: parseInt(m[2], 16) });
  for (const b of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const m of b[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]*)>/gi)) abb.set(`${m[1].length / 2}:${parseInt(m[1], 16)}`, uni(m[2]));
  for (const b of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of b[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*(<[0-9a-f]*>|\[[^\]]*\])/gi)) {
      const len = m[1].length / 2, a = parseInt(m[1], 16), e = Math.min(parseInt(m[2], 16), a + 65535);
      if (m[3].startsWith("[")) { const z = [...m[3].matchAll(/<([0-9a-f]*)>/gi)].map(x => x[1]); for (let c = a; c <= e && c - a < z.length; c++) abb.set(`${len}:${c}`, uni(z[c - a])); continue; }
      const h = hex(m[3]);
      if (!h) continue;
      const kopf = h.slice(0, -4), letzt = parseInt(h.slice(-4), 16);
      for (let c = a; c <= e; c++) abb.set(`${len}:${c}`, h.length <= 4 ? String.fromCharCode(parseInt(h, 16) + c - a) : uni(kopf) + String.fromCharCode(letzt + c - a));
    }
  }
  return { raeume, abb };
}

async function schriftLaden(datei, ref) {
  const f = await datei.auf(ref) || {};
  const typ = name(await datei.auf(f.Subtype));
  const s = { zwei: false, text: () => "", breite: () => 500, leer: 250, typ3: typ === "Type3", matrix: [0.001, 0, 0, 0.001, 0, 0] };
  let cmap = null;
  const tu = await datei.auf(f.ToUnicode);
  if (tu && tu.bytes) { try { cmap = cmapLesen(latin1.decode(await datei.daten(tu))); } catch { cmap = null; } }
  if (typ === "Type0") {
    const enc = name(await datei.auf(f.Encoding));
    const desc = await datei.auf(((await datei.auf(f.DescendantFonts)) || [])[0]) || {};
    const dw = (await datei.zahl(desc.DW)) ?? 1000, w = new Map(), feld = (await datei.auf(desc.W)) || [];
    for (let i = 0; i < feld.length;) {
      const a = await datei.zahl(feld[i]), b = await datei.auf(feld[i + 1]);
      if (Array.isArray(b)) { for (let k = 0; k < b.length; k++) w.set(a + k, (await datei.zahl(b[k])) ?? dw); i += 2; }
      else { const wert = await datei.zahl(feld[i + 2]); for (let c = a; c <= b && c - a < 65536; c++) w.set(c, wert ?? dw); i += 3; }
    }
    s.zwei = !cmap || !cmap.raeume.length || cmap.raeume.every(r => r.len === 2) || /Identity|UCS2|UTF16/.test(enc);
    s.breite = c => w.get(c) ?? dw;
    s.leer = w.get(32) ?? w.get(3) ?? dw / 3;
    s.text = c => cmap ? cmap.abb.get(`2:${c}`) ?? cmap.abb.get(`1:${c}`) ?? "" : /UCS2|UTF16/.test(enc) ? String.fromCharCode(c) : "";
    return s;
  }
  const tab = basisKodierung("WinAnsiEncoding");
  const encRoh = await datei.auf(f.Encoding);
  if (encRoh && encRoh.n !== undefined) tab.splice(0, 256, ...basisKodierung(encRoh.n));
  else if (encRoh && typeof encRoh === "object") {
    if (encRoh.BaseEncoding) tab.splice(0, 256, ...basisKodierung(name(await datei.auf(encRoh.BaseEncoding))));
    const diff = (await datei.auf(encRoh.Differences)) || [];
    let code = 0;
    for (const d of diff) { const v = await datei.auf(d); if (typeof v === "number") code = v; else if (v && v.n !== undefined) { const g = glyph(v.n); if (g != null && code < 256) tab[code] = g; code++; } }
  }
  const erst = (await datei.zahl(f.FirstChar)) ?? 0, breiten = (await datei.auf(f.Widths)) || [];
  const wl = [];
  for (const x of breiten) wl.push((await datei.zahl(x)) ?? 0);
  const fd = await datei.auf(f.FontDescriptor) || {}, fehlt = (await datei.zahl(fd.MissingWidth)) ?? 0;
  if (typ === "Type3") { const m = await datei.auf(f.FontMatrix); if (Array.isArray(m) && m.length === 6) { const x = []; for (const e of m) x.push((await datei.zahl(e)) ?? 0); s.matrix = x; } }
  const skal = typ === "Type3" ? s.matrix[0] * 1000 : 1;
  s.breite = c => (c >= erst && c - erst < wl.length ? wl[c - erst] : fehlt || (wl.length ? 0 : 500)) * skal;
  s.leer = s.breite(32) || 250;
  s.text = c => (cmap && cmap.abb.get(`1:${c}`)) ?? tab[c] ?? "";
  return s;
}

// ---------- Inhaltsströme ausführen ----------
const mal = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]];

async function strom(datei, bytes, res, ctm0, stuecke, tiefe, zaehler) {
  const l = new Leser(latin1.decode(bytes));
  const schriften = new Map();
  const res0 = (await datei.auf(res)) || {};
  const fontDict = (await datei.auf(res0.Font)) || {}, xobj = (await datei.auf(res0.XObject)) || {};
  let gs = { ctm: ctm0 }, stapel = [];
  let tm = [1, 0, 0, 1, 0, 0], tlm = [1, 0, 0, 1, 0, 0], tc = 0, tw = 0, tz = 1, tl = 0, rise = 0, size = 0, schrift = null;
  let ops = [];
  const zeigen = async (s) => {
    if (!schrift) return;
    let text = "", x0 = null, y0 = null, breite = 0;
    const roh = s;
    for (let i = 0; i < roh.length;) {
      let code, laenge = 1;
      if (schrift.zwei) { code = (roh.charCodeAt(i) << 8) | (roh.charCodeAt(i + 1) || 0); laenge = 2; } else code = roh.charCodeAt(i);
      i += laenge;
      const w = schrift.breite(code) / 1000;
      const zeichen = schrift.text(code);
      const trm = mal([size * tz, 0, 0, size, 0, rise], mal(tm, gs.ctm));
      if (x0 === null) { x0 = trm[4]; y0 = trm[5]; }
      text += zeichen;
      const tx = (w * size + tc + (laenge === 1 && code === 32 ? tw : 0)) * tz;
      tm = mal([1, 0, 0, 1, tx, 0], tm);
      breite += tx;
    }
    if (x0 === null) return;
    const ende = mal(tm, gs.ctm), hoehe = Math.abs(size * Math.hypot(gs.ctm[2], gs.ctm[3]) * Math.hypot(tm[2], tm[3])) || size;
    stuecke.push({ t: text, x: x0, y: y0, x2: ende[4], g: hoehe, leer: (schrift.leer / 1000) * hoehe });
  };
  for (;;) {
    if (++zaehler.n > GRENZE.operatoren) break;
    const v = l.wert();
    if (v === undefined) break;
    if (!v || v.op === undefined) { ops.push(v); continue; }
    const op = v.op, a = ops; ops = [];
    switch (op) {
      case "q": stapel.push(gs); gs = { ...gs }; break;
      case "Q": gs = stapel.pop() || gs; break;
      case "cm": if (a.length >= 6) gs.ctm = mal(a.slice(-6), gs.ctm); break;
      case "BT": tm = [1, 0, 0, 1, 0, 0]; tlm = [1, 0, 0, 1, 0, 0]; break;
      case "Tf": {
        size = typeof a[1] === "number" ? a[1] : size;
        const n = name(a[0]);
        if (!schriften.has(n)) schriften.set(n, fontDict[n] ? await schriftLaden(datei, fontDict[n]).catch(() => null) : null);
        schrift = schriften.get(n);
        break;
      }
      case "Tc": tc = a[0] || 0; break;
      case "Tw": tw = a[0] || 0; break;
      case "Tz": tz = (a[0] ?? 100) / 100; break;
      case "TL": tl = a[0] || 0; break;
      case "Ts": rise = a[0] || 0; break;
      case "Td": tlm = mal([1, 0, 0, 1, a[0] || 0, a[1] || 0], tlm); tm = tlm; break;
      case "TD": tl = -(a[1] || 0); tlm = mal([1, 0, 0, 1, a[0] || 0, a[1] || 0], tlm); tm = tlm; break;
      case "Tm": if (a.length >= 6) { tlm = a.slice(-6); tm = tlm; } break;
      case "T*": tlm = mal([1, 0, 0, 1, 0, -tl], tlm); tm = tlm; break;
      case "Tj": if (a[0] && a[0].s !== undefined) await zeigen(a[0].s); break;
      case "'": tlm = mal([1, 0, 0, 1, 0, -tl], tlm); tm = tlm; if (a[0] && a[0].s !== undefined) await zeigen(a[0].s); break;
      case "\"": tw = a[0] || 0; tc = a[1] || 0; tlm = mal([1, 0, 0, 1, 0, -tl], tlm); tm = tlm; if (a[2] && a[2].s !== undefined) await zeigen(a[2].s); break;
      case "TJ": {
        for (const e of Array.isArray(a[0]) ? a[0] : []) {
          if (typeof e === "number") {
            const tx = (-e / 1000) * size * tz;
            // Großer Abstand innerhalb von TJ: als Leerzeichen bzw. neue Zelle sichtbar machen (in Zeilen zusammengesetzt)
            if (-e > 200 && stuecke.length) stuecke.push({ t: "", x: 0, y: 0, x2: 0, luecke: true });
            tm = mal([1, 0, 0, 1, tx, 0], tm);
          } else if (e && e.s !== undefined) await zeigen(e.s);
        }
        break;
      }
      case "Do": {
        if (tiefe >= GRENZE.tiefe) break;
        const x = await datei.auf(xobj[name(a[0])]);
        if (!x || !x.dict || name(await datei.auf(x.dict.Subtype)) !== "Form") break;
        const m = await datei.auf(x.dict.Matrix);
        const mx = Array.isArray(m) && m.length === 6 ? m : [1, 0, 0, 1, 0, 0];
        try { await strom(datei, await datei.daten(x), x.dict.Resources || res, mal(mx, gs.ctm), stuecke, tiefe + 1, zaehler); } catch { /* Formular nicht lesbar */ }
        break;
      }
      case "BI": { const e = l.t.indexOf("EI", l.i); l.i = e < 0 ? l.t.length : e + 2; break; }
      default: break;
    }
  }
}

// Textstücke einer Seite zu Zeilen und Zellen: gleiche Grundlinie (± 40 % der Schrifthöhe), von links nach rechts; ein Abstand über
// knapp einer Schrifthöhe trennt Zellen (Tabellenspalten), ein kleinerer wird ein Leerzeichen
export function zeilenBilden(stuecke, seite = 1, hoehe = 842) {
  const s = [];
  for (let i = 0; i < stuecke.length; i++) {
    const x = stuecke[i];
    if (x.luecke) { if (s.length) s[s.length - 1].lueckeDanach = true; continue; }
    if (!x.t.replace(/\s+/g, "")) { if (s.length && x.t) s[s.length - 1].leerDanach = true; continue; }
    // Spalten aus Leerzeichenfolgen in einem Stück (Schreibmaschinenschrift, Textdruck): an zwei und mehr Leerzeichen teilen
    if (/\S {2,}\S/.test(x.t)) {
      const je = (x.x2 - x.x) / x.t.length;
      for (const m of x.t.matchAll(/\S+(?: \S+)*/g)) s.push({ ...x, t: m[0], x: x.x + m.index * je, x2: x.x + (m.index + m[0].length) * je, lueckeDanach: false });
      continue;
    }
    s.push({ ...x });
  }
  s.sort((a, b) => b.y - a.y || a.x - b.x);
  const zeilen = [];
  for (const x of s) {
    let z = zeilen.find(r => Math.abs(r.y - x.y) <= Math.max(1.5, 0.4 * Math.min(r.g, x.g)));
    if (!z) { z = { y: x.y, g: x.g, teile: [] }; zeilen.push(z); }
    z.teile.push(x);
  }
  zeilen.sort((a, b) => b.y - a.y);
  return zeilen.map(z => {
    z.teile.sort((a, b) => a.x - b.x);
    const zellen = [];
    let akt = null, vorher = null;
    for (const x of z.teile) {
      const luecke = vorher ? x.x - vorher.x2 : 0, g = Math.max(vorher ? vorher.g : x.g, 1);
      if (!akt || luecke > 0.9 * g || (vorher && vorher.lueckeDanach && luecke > 0.5 * g)) { akt = { t: x.t, x: x.x, x2: x.x2 }; zellen.push(akt); }
      else { akt.t += (luecke > Math.min(0.2 * g, (vorher.leer || g / 4) * 0.6) || vorher.leerDanach) && !/\s$/.test(akt.t) && !/^\s/.test(x.t) ? " " + x.t : x.t; akt.x2 = Math.max(akt.x2, x.x2); }
      vorher = x;
    }
    for (const c of zellen) c.t = c.t.replace(/\s+/g, " ").trim();
    return { zellen: zellen.filter(c => c.t), y: z.y, g: z.g, seite, bereich: "haupt", unten: z.y < hoehe * 0.1, tol: Math.max(6, z.g * 0.8) };
  }).filter(z => z.zellen.length);
}

// Ergebnis: { verschluesselt } oder { seiten, zeilen }
export async function pdfTextLesen(bytes) {
  const datei = new Datei(bytes);
  if (/\/Encrypt\s+\d+\s+\d+\s+R|\/Encrypt\s*<</.test(datei.t)) return { verschluesselt: true, seiten: 0, zeilen: [] };
  await datei.vorbereiten();
  // Wurzel: aus dem Trailer oder dem Querverweisstrom; sonst das Objekt /Type /Catalog
  let wurzel = null;
  for (const m of datei.t.matchAll(/\/Root\s+(\d+)\s+\d+\s+R/g)) wurzel = +m[1];
  let kat = wurzel != null ? await datei.holen(wurzel) : null;
  if (!kat || name(kat.Type) !== "Catalog") for (const [nr] of [...datei.lage, ...datei.inStrom]) { const o = await datei.holen(nr); if (o && name(o.Type) === "Catalog") { kat = o; break; } }
  const seiten = [];
  const besucht = new Set();
  async function baum(knoten, erbe) {
    if (seiten.length >= GRENZE.seiten || !knoten) return;
    if (knoten.ref !== undefined) { if (besucht.has(knoten.ref)) return; besucht.add(knoten.ref); }
    const k = await datei.auf(knoten);
    if (!k || typeof k !== "object") return;
    const e = { res: k.Resources || erbe.res, box: k.MediaBox || erbe.box };
    if (name(k.Type) === "Pages" || k.Kids) { for (const kind of (await datei.auf(k.Kids)) || []) await baum(kind, e); return; }
    seiten.push({ k, ...e });
  }
  if (kat) await baum(kat.Pages, { res: null, box: null });
  const zeilen = [], zaehler = { n: 0 };
  for (let i = 0; i < seiten.length; i++) {
    const { k, res } = seiten[i];
    const box = (await datei.auf(seiten[i].box)) || [0, 0, 595, 842];
    const b = []; for (const x of box) b.push((await datei.zahl(x)) ?? 0);
    let inhalt = await datei.auf(k.Contents);
    inhalt = Array.isArray(inhalt) ? inhalt : inhalt ? [inhalt] : [];
    const teile = [];
    for (const c of inhalt) { const o = await datei.auf(c); if (o && o.bytes) { try { teile.push(await datei.daten(o)); } catch { /* Filter unbekannt */ } } }
    const ganz = new Uint8Array(teile.reduce((n, t) => n + t.length + 1, 0));
    let p = 0; for (const t of teile) { ganz.set(t, p); p += t.length; ganz[p++] = 10; }
    const stuecke = [];
    // Ursprung links unten auf die Seite schieben; gedrehte Seiten (/Rotate) lesen wir wie sie im Strom stehen
    await strom(datei, ganz, res, [1, 0, 0, 1, -(b[0] || 0), -(b[1] || 0)], stuecke, 0, zaehler);
    zeilen.push(...zeilenBilden(stuecke, i + 1, Math.abs((b[3] || 842) - (b[1] || 0))));
  }
  return { verschluesselt: false, seiten: seiten.length, zeilen };
}
