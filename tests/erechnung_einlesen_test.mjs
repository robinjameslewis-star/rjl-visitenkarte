// SmartFormular E-Rechnung lite, „Erstellen“: bestehende Rechnung aus Word, PDF, OpenDocument, Excel oder Text übernehmen. Erst in Node
// (einlesen.js, pdftext.js, erkennen.js) mit Rechnungen verschiedener Erzeuger – Chrome-Druck (Skia), macOS-Druck (Quartz), textutil
// (Word und OpenDocument), dazu im Test gebaut: eine Word-Datei im Aufbau von Word (Kopf- und Fußzeile, Textfeld mit Ersatzinhalt,
// Tabelle mit verbundenen Zellen) und eine Excel-Datei mit Datumszelle; Quellen in tests/erechnung/daten/einlesen/quelle/. Erwartet je
// Datei: Nummer, Datum, Leistung, Empfänger, Positionen, eigene Angaben und die Summe des Dokuments auf den Cent. Dann im echten Chrome:
// Datei wählen, Maske gefüllt, fehlende Angaben ergänzen, Prüfung ohne Fehler, speichern; Folgerechnung aus einer Word-Datei; keine
// Anfrage außer an die Seite und keine Rechnungsdaten in Anfragen.
//   node tests/erechnung_einlesen_test.mjs [--nur-node] [ordner]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { WURZEL, WZ, server, chrome, check, ergebnis } from "./erechnung/hilfen.mjs";
import { dokumentLesen, zipLesen, textZeilen } from "../tools/erechnung/src/einlesen.js";
import { rechnungErkennen, firmaErgaenzen, datenIn } from "../tools/erechnung/src/erkennen.js";
import { firmaLeer } from "../tools/erechnung/src/firma.js";
import { maskePruefen } from "../tools/erechnung/src/maske.js";

const args = process.argv.slice(2);
const ORDNER = args.find(a => !a.startsWith("--")) || join(WZ, ".cache", "einlesen");
mkdirSync(ORDNER, { recursive: true });
const DATEN = join(WURZEL, "tests", "erechnung", "daten", "einlesen");
const datei = n => new Uint8Array(readFileSync(join(DATEN, n)));

// ---------- ZIP ohne Kompression (für die im Test gebauten Word- und Excel-Dateien) ----------
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(dateien) {
  const teile = [], zentral = [];
  let pos = 0;
  for (const [name, inhalt] of Object.entries(dateien)) {
    const n = Buffer.from(name), d = Buffer.from(inhalt), c = crc32(d);
    const kopf = Buffer.alloc(30); kopf.writeUInt32LE(0x04034b50, 0); kopf.writeUInt16LE(20, 4); kopf.writeUInt32LE(c, 14); kopf.writeUInt32LE(d.length, 18); kopf.writeUInt32LE(d.length, 22); kopf.writeUInt16LE(n.length, 26);
    const z = Buffer.alloc(46); z.writeUInt32LE(0x02014b50, 0); z.writeUInt16LE(20, 4); z.writeUInt16LE(20, 6); z.writeUInt32LE(c, 16); z.writeUInt32LE(d.length, 20); z.writeUInt32LE(d.length, 24); z.writeUInt16LE(n.length, 28); z.writeUInt32LE(pos, 42);
    teile.push(kopf, n, d); zentral.push(z, n); pos += 30 + n.length + d.length;
  }
  const zl = zentral.reduce((s, b) => s + b.length, 0), ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(Object.keys(dateien).length, 8); ende.writeUInt16LE(Object.keys(dateien).length, 10); ende.writeUInt32LE(zl, 12); ende.writeUInt32LE(pos, 16);
  return new Uint8Array(Buffer.concat([...teile, ...zentral, ende]));
}
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:v="urn:schemas-microsoft-com:vml"';
const p = (...runs) => `<w:p><w:pPr><w:pStyle w:val="Standard"/></w:pPr>${runs.map(r => r === "\t" ? "<w:r><w:tab/></w:r>" : r === "\n" ? '<w:r><w:br/></w:r>' : `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${r}</w:t></w:r>`).join("")}</w:p>`;
const zelle = (text, spann = 1) => `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/>${spann > 1 ? `<w:gridSpan w:val="${spann}"/>` : ""}</w:tcPr>${p(text)}</w:tc>`;
const zeile = (...z) => `<w:tr><w:trPr/>${z.map(x => Array.isArray(x) ? zelle(...x) : zelle(x)).join("")}</w:tr>`;
const textfeld = inhalt => `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wps:txbx><w:txbxContent>${inhalt}</w:txbxContent></wps:txbx></w:drawing></mc:Choice><mc:Fallback><w:pict><v:textbox><w:txbxContent>${inhalt}</w:txbxContent></v:textbox></w:pict></mc:Fallback></mc:AlternateContent></w:r>`;
const wordStruktur = zip({
  "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  "word/header1.xml": `<?xml version="1.0" encoding="UTF-8"?><w:hdr ${W}>${p("Elektro Funkenflug e. K. · Am Umspannwerk 7 · 72379 Hechingen")}</w:hdr>`,
  "word/footer1.xml": `<?xml version="1.0" encoding="UTF-8"?><w:ftr ${W}>${p("Inhaber: Paul Funkenflug · Tel. 07471 55 66 77 · paul@funkenflug.example")}${p("Steuernummer 53/111/22233 · USt-IdNr. DE276543219 · IBAN DE22 6005 0101 0001 2345 67 · BIC SOLADEST600")}</w:ftr>`,
  "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>
<w:p>${textfeld(p("Herrn") + p("Jonas Wiesengrund") + p("Kirchgasse 3") + p("72379 Hechingen"))}</w:p>
${p("Rechnung Nr. EF-2026-118")}${p("Datum:", "\t", "02.11.2026")}${p("Leistungszeitraum: 20.10.2026 bis 24.10.2026")}
<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${zeile("Pos.", "Leistung", "Menge", "Einheit", "Einzelpreis", "Gesamtpreis")}
${zeile("1", "Unterverteilung erneuert", "1", "Stück", "1.180,00", "1.180,00")}${zeile("", ["inklusive Leitungsschutzschalter und FI", 5])}
${zeile("2", "Elektromeister", "7,5", "Std.", "68,00", "510,00")}${zeile(["Summe netto", 5], "1.690,00")}${zeile(["19 % MwSt.", 5], "321,10")}${zeile(["Gesamtbetrag", 5], "2.011,10")}</w:tbl>
${p("Bitte zahlen Sie innerhalb von 10 Tagen.")}<w:p><w:del><w:r><w:delText>Rechnung Nr. FALSCH-1</w:delText></w:r></w:del></w:p><w:sectPr/></w:body></w:document>`,
});
const excel = zip({
  "xl/workbook.xml": "<workbook/>",
  "xl/styles.xml": '<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>',
  "xl/sharedStrings.xml": `<sst>${["Gartenpflege Grünspan", "Wiesenstraße 2", "71083 Herrenberg", "Rechnung", "Rechnungsnummer", "GP-77", "Rechnungsdatum", "Hausverwaltung Efeu GmbH", "Marktplatz 9", "71634 Ludwigsburg",
    "Beschreibung", "Menge", "Preis", "Betrag", "Rasen mähen", "Hecke schneiden", "Nettobetrag", "MwSt 19 %", "Gesamt", "Leistungsdatum", "info@gruenspan.example", "Steuernummer 70/123/45678", "IBAN DE89 3704 0044 0532 0130 00"].map(s => `<si><t>${s}</t></si>`).join("")}</sst>`,
  "xl/worksheets/sheet1.xml": `<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c></row><row r="3"><c r="A3" t="s"><v>2</v></c></row><row r="4"><c r="A4" t="s"><v>20</v></c></row>
<row r="6"><c r="A6" t="s"><v>7</v></c></row><row r="7"><c r="A7" t="s"><v>8</v></c></row><row r="8"><c r="A8" t="s"><v>9</v></c></row>
<row r="10"><c r="A10" t="s"><v>3</v></c></row><row r="11"><c r="A11" t="s"><v>4</v></c><c r="B11" t="s"><v>5</v></c></row><row r="12"><c r="A12" t="s"><v>6</v></c><c r="B12" s="1"><v>46331</v></c></row>
<row r="13"><c r="A13" t="s"><v>19</v></c><c r="B13" s="1"><v>46327</v></c></row>
<row r="15"><c r="A15" t="s"><v>10</v></c><c r="B15" t="s"><v>11</v></c><c r="C15" t="s"><v>12</v></c><c r="D15" t="s"><v>13</v></c></row>
<row r="16"><c r="A16" t="s"><v>14</v></c><c r="B16"><v>3</v></c><c r="C16" s="2"><v>45</v></c><c r="D16" s="2"><f>B16*C16</f><v>135</v></c></row>
<row r="17"><c r="A17" t="s"><v>15</v></c><c r="B17"><v>2.5</v></c><c r="C17" s="2"><v>52</v></c><c r="D17" s="2"><v>130</v></c></row>
<row r="19"><c r="C19" t="s"><v>16</v></c><c r="D19" s="2"><v>265</v></c></row><row r="20"><c r="C20" t="s"><v>17</v></c><c r="D20" s="2"><v>50.35</v></c></row><row r="21"><c r="C21" t="s"><v>18</v></c><c r="D21" s="2"><v>315.35</v></c></row>
<row r="23"><c r="A23" t="s"><v>21</v></c></row><row r="24"><c r="A24" t="s"><v>22</v></c></row></sheetData></worksheet>`,
});
writeFileSync(join(ORDNER, "wordstruktur.docx"), wordStruktur);
writeFileSync(join(ORDNER, "excel.xlsx"), excel);

// ---------- Teil Node ----------
console.log("Rechnungen lesen und erkennen (Node)");
const ERWARTET = [
  { f: "a-chrome.pdf", art: "pdf", nr: "2026-0142", datum: "2026-11-03", l: { art: "datum", datum: "2026-10-28" }, ziel: "14", emp: ["Bäckerei Sonnenschein KG", "Hauptstraße 5", "70173", "Stuttgart"], zusatz: "z. Hd. Frau Petra Kern", ref: "B-7781",
    pos: [["Theke aus Eiche, Maßanfertigung", "1", "C62", "2450", "S19"], ["Montage vor Ort", "6,5", "HUR", "58", "S19"], ["Anfahrt", "1", "LS", "45", "S19"]], brutto: 341768n,
    firma: { name: "Tischlerei Holzwerk Brandt GmbH", strasse: "Sägewerkstraße 12", plz: "72401", steuernummer: "41/123/45678", ustid: "DE287654321", iban: "DE89370400440532013000", bic: "COBADEFFXXX", kontakt: "Holger Brandt", telefon: "07474 123456", email: "info@holzwerk-brandt.example", register: "Amtsgericht Stuttgart HRB 765432" } },
  { f: "a-textutil.docx", art: "word", nr: "2026-0142", datum: "2026-11-03", l: { art: "datum", datum: "2026-10-28" }, ziel: "14", emp: ["Bäckerei Sonnenschein KG", "Hauptstraße 5", "70173", "Stuttgart"], zusatz: "z. Hd. Frau Petra Kern", n: 3, brutto: 341768n, firma: { name: "Tischlerei Holzwerk Brandt GmbH", iban: "DE89370400440532013000" } },
  { f: "b-textutil.docx", art: "word", nr: "LV-26-031", datum: "2026-11-05", l: { art: "zeitraum", von: "2026-10-01", bis: "2026-10-31" }, ziel: "14", emp: ["Verein Kulturbühne e. V.", "Am Markt 1", "79312", "Emmendingen"],
    pos: [["Plakatgestaltung Herbstprogramm", "1", "C62", "480", "E"], ["Illustrationen für Flyer", "4", "C62", "65", "E"], ["Druckdaten aufbereiten", "2,5", "C62", "40", "E"]], brutto: 84000n,
    firma: { name: "Lena Vogt – Grafik und Illustration", strasse: "Lindenweg 3a", plz: "79098", ort: "Freiburg im Breisgau", steuernummer: "06/234/56789", iban: "DE02120300000000202051", bic: "BYLADEM1001", email: "lena@vogt-grafik.example", klein: true } },
  { f: "b-textutil.odt", art: "odt", nr: "LV-26-031", datum: "2026-11-05", l: { art: "zeitraum", von: "2026-10-01", bis: "2026-10-31" }, ziel: "14", emp: ["Verein Kulturbühne e. V.", "Am Markt 1", "79312", "Emmendingen"], n: 3, brutto: 84000n, firma: { klein: true } },
  { f: "c-chrome.pdf", art: "pdf", nr: "C-1107", datum: "2026-11-06", l: { art: "datum", datum: "2026-10-31" }, ziel: "30", emp: ["Stadtverwaltung Musterhausen", "Rathausplatz 2", "72336", "Musterhausen"], zusatz: "Amt für Kultur", leitweg: "08111-12345-67", n: 30, brutto: 179318n,
    firma: { name: "Feinkost & Catering Morgentau OHG", ustid: "DE312345678", steuernummer: "51/987/65432", iban: "DE75512108001245126199", telefon: "07474 98765" } },
  { f: "c-textutil.docx", art: "word", nr: "C-1107", datum: "2026-11-06", l: { art: "datum", datum: "2026-10-31" }, ziel: "30", emp: ["Stadtverwaltung Musterhausen", "Rathausplatz 2", "72336", "Musterhausen"], leitweg: "08111-12345-67", n: 30, brutto: 179318n },
  { f: "d-quartz.pdf", art: "pdf", nr: "NW-2026-0457", datum: "2026-11-04", l: { art: "zeitraum", von: "2026-10-01", bis: "2026-10-31" }, ziel: "30", emp: ["Brandt Elektrotechnik GmbH", "Industriestraße 8", "71034", "Böblingen"], empUst: "DE298765432", n: 3,
    abweichung: true, hinweise: ["umkehr", "ohneSteuer"], firma: { ustid: "GB123456782", iban: "GB33BUKB20201555555555", bic: "BUKBGB22" } },
  { f: "../ohne-xml.pdf", art: "pdf", nr: "2026-1047", datum: "2026-10-15", l: { art: "datum", datum: "2026-10-10" }, ziel: "14", emp: ["Schreinerei Holzwerk Becker", "Lindenweg 17", "12347", "Musterstadt"], n: 4, brutto: 134232n, firma: { name: "Malerbetrieb Farbe und Fläche GmbH", iban: "DE89370400440532013000" } },
  { f: "wordstruktur.docx", bytes: wordStruktur, art: "word", nr: "EF-2026-118", datum: "2026-11-02", l: { art: "zeitraum", von: "2026-10-20", bis: "2026-10-24" }, ziel: "10", emp: ["Jonas Wiesengrund", "Kirchgasse 3", "72379", "Hechingen"],
    pos: [["Unterverteilung erneuert", "1", "C62", "1180", "S19", "inklusive Leitungsschutzschalter und FI"], ["Elektromeister", "7,5", "HUR", "68", "S19"]], brutto: 201110n,
    firma: { name: "Elektro Funkenflug e. K.", strasse: "Am Umspannwerk 7", plz: "72379", ustid: "DE276543219", steuernummer: "53/111/22233", iban: "DE22600501010001234567", bic: "SOLADEST600", telefon: "07471 55 66 77", email: "paul@funkenflug.example", kontakt: "Paul Funkenflug" } },
  { f: "excel.xlsx", bytes: excel, art: "excel", nr: "GP-77", datum: "2026-11-05", l: { art: "datum", datum: "2026-11-01" }, emp: ["Hausverwaltung Efeu GmbH", "Marktplatz 9", "71634", "Ludwigsburg"],
    pos: [["Rasen mähen", "3", "C62", "45", "S19"], ["Hecke schneiden", "2,5", "C62", "52", "S19"]], brutto: 31535n, firma: { name: "Gartenpflege Grünspan", steuernummer: "70/123/45678", email: "info@gruenspan.example" } },
];
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ergebnisse = {};
for (const x of ERWARTET) {
  const d = await dokumentLesen(x.bytes || datei(x.f), x.f);
  if (d.fehler) { check(false, `${x.f}: lesbar (${d.fehler})`); continue; }
  const e = rechnungErkennen(d.zeilen, { lang: "de" }), r = e.rechnung, em = r.empfaenger;
  ergebnisse[x.f] = e;
  const fehler = [];
  const soll = (ok, was) => { if (!ok) fehler.push(was); };
  soll(d.art === x.art, `Art ${d.art}`);
  soll(r.nummer === x.nr, `Nummer ${r.nummer}`);
  soll(r.datum === x.datum, `Datum ${r.datum}`);
  soll(Object.entries(x.l).every(([k, v]) => r.leistung[k] === v), `Leistung ${JSON.stringify(r.leistung)}`);
  if (x.ziel) soll(r.zielTage === x.ziel, `Ziel ${r.zielTage}`);
  soll(gleich([em.name, em.strasse, em.plz, em.ort], x.emp), `Empfänger ${JSON.stringify(em)}`);
  if (x.zusatz) soll(em.zusatz === x.zusatz, `Zusatz ${em.zusatz}`);
  if (x.ref) soll(em.referenz === x.ref, `Referenz ${em.referenz}`);
  if (x.leitweg) soll(em.behoerde && em.referenz === x.leitweg, `Leitweg ${em.referenz}`);
  if (x.empUst) soll(em.ustid === x.empUst, `USt-IdNr. Empfänger ${em.ustid}`);
  if (x.pos) soll(gleich(r.positionen.map(p => [p.name, p.menge, p.einheit, p.preis, p.steuer, ...(p.beschreibung ? [p.beschreibung] : [])]), x.pos), `Positionen ${JSON.stringify(r.positionen.map(p => [p.name, p.menge, p.einheit, p.preis, p.steuer, p.beschreibung]))}`);
  soll(r.positionen.length === (x.n || x.pos.length), `${r.positionen.length} Positionen`);
  if (x.brutto) soll(e.summe.brutto === x.brutto && e.bestaetigt && !e.abweichung, `Summe ${e.summe.brutto} bestätigt ${e.bestaetigt} ${JSON.stringify(e.abweichung, (k, v) => typeof v === "bigint" ? String(v) : v)}`);
  if (x.abweichung) soll(!!e.abweichung && !e.bestaetigt, "Abweichung gemeldet");
  soll(gleich(e.hinweise.map(h => h.art), x.hinweise || []), `Hinweise ${JSON.stringify(e.hinweise)}`);
  for (const [k, v] of Object.entries(x.firma || {})) {
    const ist = k === "iban" || k === "bic" ? e.firma.bank[k] : k === "kontakt" ? e.firma.kontakt.name : k === "telefon" || k === "email" ? e.firma.kontakt[k] : k === "klein" ? e.firma.kleinunternehmer : e.firma[k];
    soll(ist === v, `eigene Angabe ${k}: ${ist}`);
  }
  check(!fehler.length, `${x.f} (${d.art}): ${r.nummer}, ${r.positionen.length} Positionen, Empfänger ${em.name}${x.brutto ? `, Summe wie im Dokument` : ""}${fehler.length ? " – " + fehler.join("; ") : ""}`);
}
// Word im Aufbau von Word: Ersatzinhalt des Textfelds (mc:Fallback) und Gelöschtes (w:del) nicht doppelt bzw. gar nicht
const ws = await dokumentLesen(wordStruktur, "w.docx"), wsText = ws.zeilen.map(z => z.zellen.map(c => c.t).join(" ")).join("\n");
check((wsText.match(/Jonas Wiesengrund/g) || []).length === 1 && !/FALSCH/.test(wsText) && ws.zeilen[0].bereich === "kopf" && ws.zeilen[ws.zeilen.length - 1].bereich === "fuss",
  "Word: Textfeld einmal (ohne Ersatzinhalt), Gelöschtes nicht, Kopf- und Fußzeile erkannt");
check(ws.zeilen.some(z => z.zellen.length === 6 && z.zellen[1].t === "Leistung") && ws.zeilen.some(z => z.zellen.length === 2 && z.zellen[0].t === "Summe netto" && z.zellen[1].x === 500), "Word: Tabelle mit Spalten, verbundene Zellen versetzen die Spalte (gridSpan)");
// Firmendaten: nur leere Felder werden ergänzt
const fa = ergebnisse["a-chrome.pdf"].firma;
const leer = firmaErgaenzen(firmaLeer(), fa), teil = firmaErgaenzen({ ...firmaLeer(), name: "Meine GmbH", bank: { iban: "DE02120300000000202051", bic: "", inhaber: "" } }, fa);
check(leer.firma.name === fa.name && leer.firma.bank.iban === fa.bank.iban && leer.neu.length === 12 && teil.firma.name === "Meine GmbH" && teil.firma.bank.iban === "DE02120300000000202051" && !teil.neu.includes("firma.name") && teil.neu.includes("firma.steuernummer"),
  `Firmendaten: leere Felder ergänzt (${leer.neu.length}), vorhandene bleiben`);
const maskeA = maskePruefen(leer.firma, ergebnisse["a-chrome.pdf"].rechnung, "de").map(m => m.feld);
check(gleich(maskeA, ["empfaenger.email"]), `Maske nach dem Übernehmen von a-chrome.pdf: nur die E-Mail des Empfängers fehlt (${maskeA.join(", ")})`);
// Einzelteile
check(gleich(datenIn("am 5. November 2026 und 04/11/2026, 2026-01-31, 3.2.26, 31.02.2026, Nov 4, 2026").map(x => x.d), ["2026-11-05", "2026-11-04", "2026-01-31", "2026-02-03", "2026-11-04"]), "Daten: 5. November 2026, 04/11/2026 (TT/MM), ISO, 3.2.26, ungültiger 31.02., Nov 4, 2026");
const tz = textZeilen("Beschreibung    Menge   Preis\tBetrag\nA  B");
check(gleich(tz.map(z => z.zellen.map(c => c.t)), [["Beschreibung", "Menge", "Preis", "Betrag"], ["A", "B"]]), "Text: Spalten an Tabulatoren und mehreren Leerzeichen");
const txt = await dokumentLesen(new TextEncoder().encode(readFileSync(join(DATEN, "quelle", "d-english.txt"), "utf8")), "rechnung.txt");
check(txt.art === "text" && rechnungErkennen(txt.zeilen).rechnung.nummer === "NW-2026-0457", "Text (.txt): gelesen und erkannt");
const FEHLER = [["leer.pdf", new Uint8Array(0), "leer"], ["scan.pdf", datei("scan.pdf"), "scan"], ["alt.doc", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]), "doc"],
  ["brief.rtf", new TextEncoder().encode("{\\rtf1\\ansi Rechnung}"), "doc"], ["kaputt.docx", new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]), "defekt"], ["bild.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]), "format"],
  ["geheim.pdf", new TextEncoder().encode("%PDF-1.7\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R/Encrypt 2 0 R>>"), "verschluesselt"]];
for (const [n, b, soll] of FEHLER) { const d = await dokumentLesen(b, n); check(d.fehler === soll, `Fehlerfall ${n}: ${d.fehler}`); }
const kaputt = new Uint8Array(datei("a-chrome.pdf").subarray(0, 40000));
const k = await dokumentLesen(kaputt, "halb.pdf").catch(e => ({ fehler: "wurf " + e }));
check(!String(k.fehler || "").startsWith("wurf"), `abgeschnittenes PDF: kein Absturz (${k.fehler || k.art})`);
check((await zipLesen(wordStruktur)).size === 4, "ZIP: Einträge ohne Kompression lesbar");

if (args.includes("--nur-node")) { const { fails, oks } = ergebnis(); console.log(`\n${oks} ok, ${fails} fehlen`); process.exit(fails ? 1 : 0); }

// ---------- Teil Chrome ----------
console.log("\nIm echten Chrome: übernehmen, prüfen, speichern");
const srv = await server();
const SEITE = { de: `${srv.url}/werkzeuge/e-rechnung-pruefen/`, en: `${srv.url}/werkzeuge/e-invoice-viewer/` };
const browser = await chrome();
const anfragen = [];
const GEHEIM = ["Sonnenschein", "Holzwerk", "Brandt", "2026-0142", "DE89370400440532013000", "Kulturbühne", "Vogt", "LV-26-031", "Morgentau", "Musterhausen", "08111-12345-67", "a-chrome", "b-textutil", "c-chrome"];
async function seite(lang = "de", geraet = "desktop") {
  const c = await browser.newContext({ viewport: geraet === "handy" ? { width: 390, height: 844 } : { width: 1280, height: 900 }, deviceScaleFactor: geraet === "handy" ? 2 : 1, isMobile: geraet === "handy", hasTouch: geraet === "handy",
    locale: "de-DE", timezoneId: "Europe/Berlin", acceptDownloads: true });
  c.on("request", r => anfragen.push({ url: r.url(), daten: r.postData() || "" }));
  const pg = await c.newPage();
  pg.fehler = [];
  pg.on("pageerror", e => pg.fehler.push(String(e)));
  pg.on("console", m => { if (m.type() === "error") pg.fehler.push(m.text()); });
  await pg.goto(SEITE[lang] + "#erstellen", { waitUntil: "load" });
  await pg.waitForSelector("#ewz-panel-erstellen:not([hidden]) .ewe");
  return pg;
}
const zustand = pg => pg.evaluate(() => JSON.parse(JSON.stringify(window.RVErechnung.erstellen)));
const uebernehmen = async (pg, pfad, sel = "#ewe-einlesen-eingabe") => {
  await pg.setInputFiles(sel, pfad);
  await pg.evaluate(() => { window.__vorher = document.getElementById("ewe-einlesen-box"); });
  await pg.waitForFunction(() => { const b = document.getElementById("ewe-einlesen-box"), s = document.getElementById("ewe-status").textContent; return (b && b !== window.__vorher) || (s.trim() && !/wird gelesen|Reading the file/.test(s)); }, null, { timeout: 30000 });
  const b = pg.locator("#ewe-einlesen-box");
  return ((await b.count()) && await pg.evaluate(() => document.getElementById("ewe-einlesen-box") !== window.__vorher) ? await b.innerText() : await pg.locator("#ewe-status").innerText()).trim();
};
const geprueft = pg => pg.waitForFunction(() => { const z = window.RVErechnung.erstellen; return z.meldungen.length === 0 && z.pruefung && z.pruefung.status === "fertig"; }, null, { timeout: 120000 });
async function speichern(pg, name) {
  const [dl] = await Promise.all([pg.waitForEvent("download", { timeout: 120000 }), pg.click('[data-e="speichern"]')]);
  const f = join(ORDNER, `${name}-${dl.suggestedFilename()}`);
  await dl.saveAs(f);
  return readFileSync(f, "utf8");
}
const foto = (pg, name, o = {}) => pg.screenshot({ path: join(ORDNER, `${name}.png`), ...o });
const pruefOk = async pg => /Geprüft: keine Fehler|Checked: no errors/.test(await pg.locator("#ewe-pruef-inhalt").innerText());

// a) Neue Nutzerin: Word-Rechnung als PDF – Firmendaten und Rechnung aus einer Datei, nur die E-Mail des Empfängers fehlt
{
  const pg = await seite();
  check(await pg.locator('[data-e="einlesen"]').isVisible() && /nur in diesem Browser/.test(await pg.locator("#ewe-einlesen-h").innerText()), "a: Knopf „Rechnung aus Word oder PDF übernehmen“ mit Hinweis „nur in diesem Browser“");
  await pg.locator(".ewe-start").screenshot({ path: join(ORDNER, "einlesen-start-desktop.png") });
  const st = await uebernehmen(pg, join(DATEN, "a-chrome.pdf"));
  const z = await zustand(pg);
  check(/übernommen: Rechnungsnummer, Datum, Leistung, Empfänger, 3 Positionen, Zahlungsziel/.test(st) && /Betrag stimmt mit dem Dokument überein \(3\.417,68 €\)/.test(st) && /Firmendaten wurden aus dem Dokument ergänzt/.test(st), `a: Meldung nennt das Gefundene und die bestätigte Summe (${st.slice(0, 160)}…)`);
  check(z.rechnung.nummer === "2026-0142" && z.rechnung.datum === "2026-11-03" && z.firma.name === "Tischlerei Holzwerk Brandt GmbH" && z.rechnung.positionen.length === 3 && await pg.inputValue("#ewe-pos-1-menge") === "6,5", "a: Maske gefüllt – Nummer, Datum, Firma, Positionen (Menge 6,5)");
  const box = await pg.locator("#ewe-einlesen-box").boundingBox();
  check(await pg.evaluate(() => document.activeElement.id) === "ewe-einlesen-box" && box && box.y >= 0 && box.y < 900 && /Noch zu ergänzen: E-Mail/.test(st), `a: Ergebnis im Blick (Fokus, ${box && Math.round(box.y)} px), nennt das einzige fehlende Feld`);
  await pg.click('#ewe-einlesen-box [data-zumfeld="empfaenger.email"]');
  check(z.meldungen.map(m => m.feld).join() === "empfaenger.email" && await pg.evaluate(() => document.activeElement.id) === "ewe-empfaenger-email" && await pg.locator("#ewe-empfaenger-email[aria-invalid=true]").count() === 1, "a: Link springt zum Feld, Fehlermeldung am Feld (E-Mail des Empfängers)");
  await pg.fill("#ewe-empfaenger-email", "buchhaltung@sonnenschein.example");
  await pg.waitForFunction(() => /Alle Pflichtangaben/.test(document.getElementById("ewe-einlesen-fehlt").textContent));
  check(true, "a: Kasten führt mit – nach der E-Mail „Alle Pflichtangaben sind ausgefüllt“");
  await pg.click('[data-e="firma-weiter"]');
  await geprueft(pg);
  check(await pruefOk(pg), "a: offizielle Regeln – keine Fehler");
  await pg.locator("#ewe-einlesen-box").scrollIntoViewIfNeeded();
  await pg.evaluate(() => window.scrollBy(0, -120));
  await foto(pg, "einlesen-uebernommen-desktop");
  const xml = await speichern(pg, "a");
  check(/<cbc:ID>2026-0142<\/cbc:ID>/.test(xml) && /<cbc:PayableAmount currencyID="EUR">3417\.68</.test(xml) && /DE89370400440532013000/.test(xml) && /<cbc:BuyerReference>B-7781</.test(xml), "a: XRechnung gespeichert – gleiche Nummer, 3.417,68 €, IBAN, Bestellnummer als Käuferreferenz");
  await foto(pg, "einlesen-gespeichert-desktop", { fullPage: true });
  // Folgerechnung aus der Word-Datei über „Aus früherer Rechnung“
  await pg.click('[data-e="naechste"]').catch(() => {});
  await pg.click('[data-e="vorlage-auf"]');
  await pg.setInputFiles("#ewe-vorlage-eingabe", join(DATEN, "a-textutil.docx"));
  await pg.waitForSelector('#ewe-vorlage [data-q="datei"][data-e="folge"]');
  await pg.click('#ewe-vorlage [data-q="datei"][data-e="folge"]');
  const f = await zustand(pg);
  check(f.rechnung.nummer === "2026-0143" && f.rechnung.empfaenger.name === "Bäckerei Sonnenschein KG" && f.rechnung.positionen.length === 3, `a: Folgerechnung aus der Word-Datei – nächste Nummer ${f.rechnung.nummer}, gleicher Empfänger und Positionen`);
  check(!pg.fehler.length, `a: keine Fehler in der Konsole (${pg.fehler.slice(0, 2).join(" | ")})`);
  // Ein Dokument von jemand anderem: eigene Firmendaten bleiben
  const st2 = await uebernehmen(pg, join(DATEN, "b-textutil.docx"));
  check(/stammt von „Lena Vogt – Grafik und Illustration“; Ihre Firmendaten bleiben unverändert/.test(st2) && (await zustand(pg)).firma.name === "Tischlerei Holzwerk Brandt GmbH", "a: fremdes Dokument – Hinweis, Firmendaten unverändert");
  const st3 = await uebernehmen(pg, join(DATEN, "scan.pdf"));
  check(/keinen lesbaren Text/.test(st3) && (await zustand(pg)).rechnung.nummer === "LV-26-031", "a: Scan ohne Text – klare Meldung, Maske bleibt");
}
// b) Kleinunternehmerin mit Word-Datei (Tabulatoren), Handy
{
  const pg = await seite("de", "handy");
  const st = await uebernehmen(pg, join(DATEN, "b-textutil.docx"));
  const z = await zustand(pg);
  check(z.firma.kleinunternehmer && z.rechnung.positionen.every(p => p.steuer === "E") && /840,00 €/.test(st) && z.rechnung.leistung.art === "zeitraum", "b: Kleinunternehmerin erkannt, Positionen ohne Steuer, 840,00 € wie im Dokument, Leistungszeitraum");
  check(gleich(z.meldungen.map(m => m.feld), ["firma.kontakt.name", "firma.kontakt.telefon", "empfaenger.email"]), `b: fehlend nur, was nicht im Dokument steht (${z.meldungen.map(m => m.feld).join(", ")})`);
  await foto(pg, "einlesen-uebernommen-handy");
  await pg.fill("#ewe-firma-kontakt-name", "Lena Vogt"); await pg.fill("#ewe-firma-kontakt-telefon", "0761 123456"); await pg.fill("#ewe-empfaenger-email", "kasse@kulturbuehne.example");
  await pg.click('[data-e="firma-weiter"]');
  await geprueft(pg);
  check(await pruefOk(pg), "b: offizielle Regeln – keine Fehler");
  const xml = await speichern(pg, "b");
  check(/<cbc:ID>LV-26-031<\/cbc:ID>/.test(xml) && /<cbc:PayableAmount currencyID="EUR">840\.00</.test(xml) && /<cbc:ID>E<\/cbc:ID>/.test(xml), "b: gespeichert – 840,00 €, Steuerkategorie E");
}
// c) Behörde mit Leitweg-ID, 30 Positionen mit 7 % und 19 % auf zwei Seiten
{
  const pg = await seite();
  const st = await uebernehmen(pg, join(DATEN, "c-chrome.pdf"));
  const z = await zustand(pg);
  check(/30 Positionen/.test(st) && /1\.793,18 €/.test(st) && z.rechnung.empfaenger.behoerde && z.rechnung.positionen.filter(p => p.steuer === "S7").length === 20, "c: 30 Positionen über zwei Seiten, 20 mit 7 %, Leitweg-ID, 1.793,18 € wie im Dokument");
  await pg.fill("#ewe-firma-kontakt-name", "Mia Morgentau");
  await pg.click('[data-e="firma-weiter"]');
  await geprueft(pg);
  check(await pruefOk(pg), "c: offizielle Regeln – keine Fehler");
  const xml = await speichern(pg, "c");
  check(/<cbc:BuyerReference>08111-12345-67</.test(xml) && /<cbc:PayableAmount currencyID="EUR">1793\.18</.test(xml), "c: gespeichert – Leitweg-ID, 1.793,18 €");
}
// d) Englische Seite: Excel-Datei, Zahlen in englischer Schreibweise
{
  const pg = await seite("en");
  const st = await uebernehmen(pg, join(ORDNER, "excel.xlsx"));
  check(/Taken over from “excel\.xlsx”/.test(st) && /€315\.35/.test(st) && await pg.inputValue("#ewe-pos-1-menge") === "2.5", `d: Excel auf der englischen Seite – 2.5, €315.35 (${st.slice(0, 120)})`);
  await foto(pg, "einlesen-englisch-desktop");
}
await browser.close(); await srv.schliessen();
const fremd = anfragen.filter(a => /^(https?|wss?):/.test(a.url) && new URL(a.url).origin !== srv.url);
const verraten = anfragen.filter(a => GEHEIM.some(g => a.url.includes(g) || a.daten.includes(g)));
check(!fremd.length && !verraten.length && anfragen.length > 0, `Datenschutz: ${anfragen.length} Anfragen, nur an die Seite, keine Rechnungsdaten darin (fremd ${fremd.length}, mit Daten ${verraten.length})`);
const { fails, oks } = ergebnis();
console.log(`\n${oks} ok, ${fails} fehlen – Fotos und Dateien in ${ORDNER}`);
process.exit(fails ? 1 : 0);
