// Eingebettete Dateien aus einem PDF lesen (ZUGFeRD, Factur-X, XRechnung im PDF), ohne Bibliothek: Objekte mit /Type /EmbeddedFile
// suchen, Inhalt mit FlateDecode (DecompressionStream) entpacken, Dateinamen aus den Filespec-Einträgen zuordnen – auch wenn diese in
// komprimierten Objektströmen (/ObjStm) liegen. Verschlüsselte PDFs werden erkannt, aber nicht entschlüsselt.
const latin1 = new TextDecoder("latin1");

async function entpacken(bytes) {
  const ds = new DecompressionStream("deflate");
  const strom = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

// PDF-Zeichenkette (literal oder hex, ggf. UTF-16BE) in Text
function pdfText(s) {
  if (!s) return "";
  let bytes;
  if (s.startsWith("<")) {
    const hex = s.slice(1, -1).replace(/\s+/g, "");
    bytes = [];
    for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2).padEnd(2, "0"), 16));
  } else {
    const inner = s.slice(1, -1);
    bytes = [];
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      if (c !== "\\") { bytes.push(inner.charCodeAt(i) & 255); continue; }
      const n = inner[++i];
      const esc = { n: 10, r: 13, t: 9, b: 8, f: 12, "(": 40, ")": 41, "\\": 92 }[n];
      if (esc !== undefined) bytes.push(esc);
      else if (/[0-7]/.test(n)) { let o = n; while (o.length < 3 && /[0-7]/.test(inner[i + 1])) o += inner[++i]; bytes.push(parseInt(o, 8) & 255); }
      else if (n === "\r" || n === "\n") { if (n === "\r" && inner[i + 1] === "\n") i++; }
      else bytes.push(inner.charCodeAt(i) & 255);
    }
  }
  const u = new Uint8Array(bytes);
  if (u[0] === 0xfe && u[1] === 0xff) return new TextDecoder("utf-16be").decode(u.subarray(2));
  if (u[0] === 0xef && u[1] === 0xbb && u[2] === 0xbf) return new TextDecoder("utf-8").decode(u.subarray(3));
  return new TextDecoder("latin1").decode(u);
}
// Erste Zeichenkette hinter einem Schlüssel (/F, /UF, /Desc) in einem Wörterbuch
function wert(dict, key) {
  const m = new RegExp(`/${key}\\s*([(<])(?!<)`).exec(dict);
  if (!m) return "";
  const j = m.index + m[0].length - 1;
  if (dict[j] === "<") return pdfText(dict.slice(j, dict.indexOf(">", j) + 1));
  let tiefe = 0, k = j;
  for (; k < dict.length; k++) {
    if (dict[k] === "\\") { k++; continue; }
    if (dict[k] === "(") tiefe++;
    else if (dict[k] === ")" && --tiefe === 0) break;
  }
  return pdfText(dict.slice(j, k + 1));
}

// Ende eines Wörterbuchs << … >> ab Position i (verschachtelt)
function dictEnde(t, i) {
  let tiefe = 0;
  for (let k = i; k < t.length - 1; k++) {
    if (t[k] === "<" && t[k + 1] === "<") { tiefe++; k++; }
    else if (t[k] === ">" && t[k + 1] === ">") { tiefe--; k++; if (tiefe === 0) return k + 1; }
    else if (t[k] === "(") { let d = 0; for (; k < t.length; k++) { if (t[k] === "\\") { k++; continue; } if (t[k] === "(") d++; else if (t[k] === ")" && --d === 0) break; } }
  }
  return -1;
}

// Alle Objekte „n g obj … endobj“ mit Wörterbuch und ggf. Stream
function objekte(bytes) {
  const t = latin1.decode(bytes);
  const out = [];
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = re.exec(t))) {
    const start = re.lastIndex;
    const d0 = t.indexOf("<<", start);
    const naechstes = t.indexOf("endobj", start);
    if (d0 < 0 || (naechstes >= 0 && d0 > naechstes)) continue;
    const d1 = dictEnde(t, d0);
    if (d1 < 0) continue;
    const dict = t.slice(d0, d1);
    const nach = t.slice(d1, d1 + 20);
    let stream = null;
    const sm = /^\s*stream(\r\n|\n|\r)/.exec(nach);
    if (sm) {
      const s0 = d1 + sm.index + sm[0].length;
      const len = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
      let s1 = len ? s0 + +len[1] : -1, gesucht = false;
      if (s1 < 0 || !/^\s*endstream/.test(t.slice(s1, s1 + 20))) { s1 = t.indexOf("endstream", s0); gesucht = true; }
      if (s1 > s0) {
        stream = bytes.subarray(s0, s1);
        // Zeilenende vor endstream gehört nicht zum Inhalt
        while (gesucht && stream.length && (stream[stream.length - 1] === 10 || stream[stream.length - 1] === 13)) stream = stream.subarray(0, stream.length - 1);
        re.lastIndex = s1;
      }
    }
    out.push({ nr: +m[1], dict, stream });
  }
  return { t, out };
}

async function inhalt(o) {
  if (!o.stream) return null;
  const filter = (/\/Filter\s*(\[[^\]]*\]|\/\w+)/.exec(o.dict) || [])[1] || "";
  if (!filter) return o.stream;
  if (/^\/FlateDecode$|^\[\s*\/FlateDecode\s*\]$/.test(filter)) {
    if (/\/DecodeParms/.test(o.dict) && /\/Predictor\s+(1[0-5]|2)\b/.test(o.dict)) return null;
    return entpacken(o.stream);
  }
  return null;
}

// Ergebnis: { pdf: true, verschluesselt, dateien: [{ name, beschreibung, beziehung, bytes, mime }] }
export async function pdfLesen(bytes) {
  const kopf = latin1.decode(bytes.subarray(0, 1024));
  if (!kopf.includes("%PDF-")) return { pdf: false };
  const { t, out } = objekte(bytes);
  const verschluesselt = /\/Encrypt\s+\d+\s+\d+\s+R|\/Encrypt\s*<</.test(t);
  // Wörterbücher aus Objektströmen dazunehmen (dort liegen oft die Filespec-Einträge mit den Dateinamen)
  const woerter = out.map(o => ({ nr: o.nr, dict: o.dict }));
  for (const o of out) {
    if (!/\/Type\s*\/ObjStm/.test(o.dict) || verschluesselt) continue;
    try {
      const daten = await inhalt(o);
      if (!daten) continue;
      const s = latin1.decode(daten), first = +((/\/First\s+(\d+)/.exec(o.dict) || [])[1] || 0);
      const kopfzahlen = s.slice(0, first).trim().split(/\s+/).map(Number);
      for (let i = 0; i < kopfzahlen.length; i += 2) {
        const a = first + kopfzahlen[i + 1], b = i + 3 < kopfzahlen.length ? first + kopfzahlen[i + 3] : s.length;
        woerter.push({ nr: kopfzahlen[i], dict: s.slice(a, b) });
      }
    } catch { /* defekter Objektstrom */ }
  }
  // Dateinamen: Filespec /EF << /F n 0 R >>
  const namen = new Map();
  for (const w of woerter) {
    const ef = /\/EF\s*<<[^>]*?\/(?:UF|F)\s+(\d+)\s+\d+\s+R/.exec(w.dict);
    if (!ef) continue;
    namen.set(+ef[1], { name: wert(w.dict, "UF") || wert(w.dict, "F"), beschreibung: wert(w.dict, "Desc"), beziehung: ((/\/AFRelationship\s*\/(\w+)/.exec(w.dict)) || [])[1] || "" });
  }
  const dateien = [];
  for (const o of out) {
    if (!/\/Type\s*\/EmbeddedFile\b/.test(o.dict) || !o.stream) continue;
    const info = namen.get(o.nr) || { name: "", beschreibung: "", beziehung: "" };
    let daten = null;
    if (!verschluesselt) { try { daten = await inhalt(o); } catch { daten = null; } }
    const mime = (/\/Subtype\s*\/([^\s/<>[\]]+)/.exec(o.dict) || [])[1] || "";
    dateien.push({ ...info, mime: mime.replace(/#2F/gi, "/").replace(/#([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), bytes: daten });
  }
  // XMP-Metadaten (Factur-X/ZUGFeRD: Profil und Dateiname aus der PDF/A-3-Erweiterung)
  let xmp = null;
  for (const o of out) {
    if (!/\/Type\s*\/Metadata/.test(o.dict) || !/\/Subtype\s*\/XML/.test(o.dict) || verschluesselt) continue;
    try { const d = await inhalt(o); if (d) { const s = new TextDecoder("utf-8").decode(d); if (/ConformanceLevel|DocumentFileName/.test(s)) xmp = s; } } catch { /* ohne */ }
  }
  const xmpWert = k => xmp ? ((new RegExp(`<(?:\\w+:)?${k}>([^<]*)<`).exec(xmp) || new RegExp(`(?:\\w+:)?${k}="([^"]*)"`).exec(xmp) || [])[1] || "").trim() : "";
  return { pdf: true, verschluesselt, dateien, xmp: xmp ? { profil: xmpWert("ConformanceLevel"), datei: xmpWert("DocumentFileName"), art: xmpWert("DocumentType"), version: xmpWert("Version") } : null };
}
