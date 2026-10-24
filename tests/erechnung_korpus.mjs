// Testkorpus für den Abgleich mit der offiziellen Prüfung (Abnahme 1): offizielle Testdateien (KoSIT-Testsuite, CEN-Beispiele, Testfälle
// des XRechnung-Schematrons und der Validator-Konfiguration), die einzeln ausgepackten CEN-Unit-Tests und je gültiger Rechnung eine feste
// Zahl abgewandelter Fassungen (Beträge, Codes, Daten, IBANs, Kennungen, fehlende und doppelte Elemente; Zufall mit festem Startwert).
// Voraussetzung: cd tools/erechnung && npm install && node testdaten-holen.mjs
//   node tests/erechnung_korpus.mjs [mutationen-je-datei=25]
// Schreibt tools/erechnung/.cache/korpus/dateien/… und manifest.json (Datei, Gruppe, Regelsätze, Szenario-Regelsätze).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join, basename, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const WZ = join(WURZEL, "tools", "erechnung");
const req = createRequire(join(WZ, "package.json"));
const sd = await import(req.resolve("slimdom"));
const { parseXmlDocument, serializeToWellFormedString } = sd.parseXmlDocument ? sd : sd.default;
const TD = join(WZ, ".cache", "testdaten"), KORPUS = join(WZ, ".cache", "korpus");
const JE = +(process.argv[2] || 40);
if (!existsSync(TD)) { console.error("Testdaten fehlen: cd tools/erechnung && node testdaten-holen.mjs"); process.exit(1); }
rmSync(KORPUS, { recursive: true, force: true });

const UBL_INV = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2", UBL_CN = "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2";
const CII = "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100";
const syntax = doc => { const r = doc.documentElement; if (!r) return null; if ((r.namespaceURI === UBL_INV && r.localName === "Invoice") || (r.namespaceURI === UBL_CN && r.localName === "CreditNote")) return "ubl"; if (r.namespaceURI === CII && r.localName === "CrossIndustryInvoice") return "cii"; return null; };
const kennung = (doc, s) => {
  const r = doc.documentElement;
  if (s === "ubl") { const c = Array.from(r.childNodes).find(n => n.localName === "CustomizationID"); return c ? c.textContent.trim() : ""; }
  const p = r.getElementsByTagNameNS("urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100", "GuidelineSpecifiedDocumentContextParameter")[0];
  const id = p && Array.from(p.childNodes).find(n => n.localName === "ID");
  return id ? id.textContent.trim() : "";
};
// Regelsätze nach Szenario (wie das Werkzeug) und erzwungen (beide Regelsätze der Syntax, für mehr Abdeckung)
const XR = "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0";
const szenario = (s, k) => [XR, XR + "#conformant#urn:xeinkauf.de:kosit:extension:xrechnung_3.0", XR + "#compliant#urn:xeinkauf.de:kosit:xrechnung:cvd_0.9"].includes(k) ? [`en16931-${s}`, `xrechnung-${s}`] : /^urn:cen\.eu:en16931:2017/.test(k) ? [`en16931-${s}`] : [];

const manifest = [];
let nr = 0;
function aufnehmen(gruppe, name, text) {
  let doc;
  try { doc = parseXmlDocument(text); } catch { return null; }
  const s = syntax(doc);
  if (!s) return null;
  const ordner = join(KORPUS, "dateien", gruppe);
  mkdirSync(ordner, { recursive: true });
  const datei = join(ordner, `${String(++nr).padStart(5, "0")}-${name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80)}`);
  writeFileSync(datei, text);
  manifest.push({ datei: relative(KORPUS, datei), gruppe, syntax: s, saetze: [`en16931-${s}`, `xrechnung-${s}`], szenario: szenario(s, kennung(doc, s)) });
  return doc;
}
function* xmlDateien(ordner) {
  for (const n of readdirSync(ordner).sort()) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) yield* xmlDateien(p);
    else if (/\.xml$/i.test(n)) yield p;
  }
}
const lesen = p => readFileSync(p, "utf8").replace(/^﻿/, "");

// 1. Offizielle Dateien
const basis = [];
for (const [gruppe, ordner] of [["kosit-testsuite", join(TD, "kosit-testsuite", "instances")], ["cen-beispiele", join(TD, "cen-ubl-1.3.16", "examples")], ["cen-beispiele", join(TD, "cen-cii-1.3.16", "examples")],
  ["xrechnung-schematron", join(TD, "xrechnung-schematron", "test", "instances")], ["validator-konfiguration", join(TD, "validator-konfiguration", "src", "test")]]) {
  for (const p of xmlDateien(ordner)) {
    const text = lesen(p), doc = aufnehmen(gruppe, basename(p), text);
    if (doc && (gruppe === "kosit-testsuite" || gruppe === "cen-beispiele")) basis.push({ name: basename(p), text });
  }
}
for (const n of ["xrechnung.xml", "zugferd.xml"]) { const text = lesen(join(WZ, "beispiele", n)); aufnehmen("beispiele", n, text); basis.push({ name: n, text }); }
// eigene Testdateien der Kundenreisen
const eigene = join(WURZEL, "tests", "erechnung", "daten");
if (existsSync(eigene)) for (const p of xmlDateien(eigene)) { const text = lesen(p); if (aufnehmen("eigene", basename(p), text)) basis.push({ name: basename(p), text }); }

// 2. CEN-Unit-Tests: je <test> das eingebettete Dokument
for (const ordner of ["Invoice-unit-UBL", "CreditNote-unit-UBL", "cii"].map(n => join(TD, "cen-repo", "test", n)).filter(existsSync)) {
  for (const p of xmlDateien(ordner)) {
    let doc;
    try { doc = parseXmlDocument(lesen(p)); } catch { continue; }
    let i = 0;
    for (const test of Array.from(doc.getElementsByTagNameNS("*", "test"))) {
      const el = Array.from(test.childNodes).find(n => n.nodeType === 1 && n.localName !== "assert");
      if (!el) continue;
      const neu = parseXmlDocument("<x/>");
      neu.replaceChild(neu.importNode(el, true), neu.documentElement);
      aufnehmen("cen-unit", `${basename(p, ".xml")}-${++i}.xml`, serializeToWellFormedString(neu));
    }
  }
}

// 3. Abwandlungen
function zufall(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const IBANS = ["DE89370400440532013000", "DE02120300000000202051", "AT611904300234573201", "FR1420041010050500013M02606", "NL91ABNA0417164300", "GB29NWBK60161331926819", "CH9300762011623852957",
  "DE89370400440532013001", "DE123", "DE89 3704 0044 0532 0130 00", "de89370400440532013000", "XX00ABC", "DE00000000000000000000", "BE68539007547034", "IT60X0542811101000000123456"];
const CODES = {
  currencyID: ["EUR", "USD", "XXX", "eur", "CHF"], unitCode: ["C62", "HUR", "ZZZ", "XPP", "pcs", "MTK"], schemeID: ["EM", "0088", "9930", "VA", "FC", "ZZZ", "SEPA", "0204"], mimeCode: ["application/pdf", "image/png", "text/plain", "application/xml"],
  TypeCode: ["380", "381", "384", "389", "326", "875", "999", "VAT", "58", "59", "30", "50", "916"], InvoiceTypeCode: ["380", "381", "384", "389", "751", "999"], CreditNoteTypeCode: ["381", "380", "396", "999"],
  PaymentMeansCode: ["30", "31", "42", "48", "49", "54", "58", "59", "1", "ZZZ", "99"], CategoryCode: ["S", "Z", "E", "AE", "K", "G", "O", "L", "M", "B", "X"], ID: ["S", "Z", "E", "AE", "K", "G", "O", "VAT", "1", "DE123456789"],
  IdentificationCode: ["DE", "AT", "XX", "GR", "EL", "FR"], CountryID: ["DE", "AT", "XX", "GR", "IT"], DocumentCurrencyCode: ["EUR", "USD", "HUF", "XXX"], InvoiceCurrencyCode: ["EUR", "USD", "HUF", "XXX"],
  TaxCurrencyCode: ["EUR", "USD", "GBP"], ChargeIndicator: ["true", "false", "TRUE", "1"], Indicator: ["true", "false", "yes"], TaxExemptionReasonCode: ["VATEX-EU-AE", "VATEX-EU-IC", "VATEX-EU-G", "VATEX-EU-O", "XYZ"],
  ExemptionReasonCode: ["VATEX-EU-AE", "VATEX-EU-IC", "VATEX-EU-O", "XYZ"], DueDateTypeCode: ["5", "29", "72", "3"], DescriptionCode: ["3", "35", "432", "1"], SubjectCode: ["AAI", "SUR", "REG", "ZZZ"],
  AllowanceChargeReasonCode: ["95", "100", "ABL", "ZZZ"], ReasonCode: ["95", "ABL", "ZZZ"],
};
const KENNUNGEN = [XR, XR + "#conformant#urn:xeinkauf.de:kosit:extension:xrechnung_3.0", XR + "#compliant#urn:xeinkauf.de:kosit:xrechnung:cvd_0.9", "urn:cen.eu:en16931:2017",
  "urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0", "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic", "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.3", "kaputt"];
const DATEN = ["2026-02-30", "20261301", "23.10.2026", "2026-10-23", "20261023", "2025-12-31", "2027-01-01", ""];
const ZAHLEN = x => [x + 0.01, -x, x * 2, x + 100, 1.005, 0, Math.round(x * 1000 + 7) / 1000, "abc", x];
// Einfügen von Elementen, die eine Regel „nicht vorgesehen“ meldet (UBL-CR, CII-SR …): aus den Regeln mit Bedingung not(not(PFAD))
const EINFUEGEN = { ubl: [], cii: [] };
for (const [syn, id] of [["ubl", "en16931-ubl"], ["cii", "en16931-cii"], ["ubl", "xrechnung-ubl"], ["cii", "xrechnung-cii"]]) {
  const satz = JSON.parse(readFileSync(join(WURZEL, "assets", "erechnung", "regeln", `${id}.json`), "utf8"));
  const qn = s => { const m = /^(@?)([\w-]+):([\w.-]+)$/.exec(s) || /^(@)()([\w.-]+)$/.exec(s); return m ? { attr: !!m[1], ns: m[2] ? satz.ns[m[2]] : "", local: m[3], prefix: m[2] } : null; };
  for (const m of satz.muster) for (const r of m.regeln) {
    const kontexte = r.context.split("|").map(k => k.trim().replace(/^\(|\)$/g, "").split("/").filter(Boolean).pop() || "").map(k => qn(k.replace(/\[.*$/, ""))).filter(Boolean);
    if (!kontexte.length) continue;
    for (const tst of r.tests) {
      const mm = /^not\(not\(([\w:@\/.-]+)\)\)$/.exec(tst.cond.trim());
      if (!mm) continue;
      const pfad = mm[1].split("/").map(qn);
      if (pfad.every(Boolean)) EINFUEGEN[syn].push({ kontexte, pfad });
    }
  }
}
const elemente = doc => Array.from(doc.getElementsByTagNameNS("*", "*")).filter(e => e !== doc.documentElement);
const blatt = e => !Array.from(e.childNodes).some(n => n.nodeType === 1);

function abwandeln(text, z) {
  const doc = parseXmlDocument(text);
  const alle = elemente(doc);
  if (!alle.length) return null;
  const waehle = a => a[Math.floor(z() * a.length)];
  const schritte = 1 + Math.floor(z() * 3);
  for (let s = 0; s < schritte; s++) {
    const art = Math.floor(z() * 14);
    const kandidaten = elemente(doc);
    if (!kandidaten.length) break;
    const e = waehle(kandidaten);
    const ln = e.localName;
    switch (art) {
      case 0: if (e.parentNode) e.parentNode.removeChild(e); break;
      case 1: if (blatt(e)) e.textContent = ""; break;
      case 2: { const zahlEl = kandidaten.filter(x => blatt(x) && /^-?\d+(\.\d+)?$/.test(x.textContent.trim())); if (zahlEl.length) { const x = waehle(zahlEl); const v = +x.textContent.trim(); const w = waehle(ZAHLEN(v)); x.textContent = typeof w === "number" ? String(Math.round(w * 100) / 100) : w; } break; }
      case 3: { const ziel = kandidaten.filter(x => blatt(x) && CODES[x.localName]); if (ziel.length) { const x = waehle(ziel); x.textContent = waehle(CODES[x.localName]); } break; }
      case 4: { const ziel = kandidaten.filter(x => Array.from(x.attributes).some(a => CODES[a.localName])); if (ziel.length) { const x = waehle(ziel); const a = waehle(Array.from(x.attributes).filter(a => CODES[a.localName])); if (z() < 0.25) x.removeAttributeNS(a.namespaceURI, a.localName); else x.setAttributeNS(a.namespaceURI, a.name, waehle(CODES[a.localName])); } break; }
      case 5: { const ziel = kandidaten.filter(x => blatt(x) && /Date|DateTimeString/.test(x.localName)); if (ziel.length) waehle(ziel).textContent = waehle(DATEN); break; }
      case 6: if (e.parentNode && e.parentNode !== doc) e.parentNode.insertBefore(e.cloneNode(true), e.nextSibling); break;
      case 7: { const ziel = kandidaten.filter(x => blatt(x) && (x.localName === "IBANID" || (x.localName === "ID" && x.parentNode && /FinancialAccount/.test(x.parentNode.localName)))); if (ziel.length) waehle(ziel).textContent = waehle(IBANS); break; }
      case 8: { const ziel = kandidaten.filter(x => blatt(x) && /Percent$/.test(x.localName)); if (ziel.length) waehle(ziel).textContent = waehle(["0", "7", "19", "16", "5.5", "-19", "100"]); break; }
      case 9: { const ziel = kandidaten.filter(x => blatt(x) && (x.localName === "CustomizationID" || (x.localName === "ID" && x.parentNode && x.parentNode.localName === "GuidelineSpecifiedDocumentContextParameter"))); if (ziel.length) waehle(ziel).textContent = waehle(KENNUNGEN); break; }
      case 11: case 12: case 13: {
        const syn = syntax(doc), kand = EINFUEGEN[syn] || [];
        if (!kand.length) break;
        const k = waehle(kand), ziel = kandidaten.concat([doc.documentElement]).filter(x => k.kontexte.some(c => x.localName === c.local && x.namespaceURI === c.ns));
        if (!ziel.length) break;
        let el = waehle(ziel);
        k.pfad.forEach((s, i) => {
          if (s.attr) { el.setAttribute(s.local, "1"); return; }
          const neu = doc.createElementNS(s.ns, `${s.prefix}:${s.local}`);
          if (i === k.pfad.length - 1) neu.textContent = waehle(["1", "X", "2026-10-23", "true"]);
          el.appendChild(neu); el = neu;
        });
        break;
      }
      case 10: if (blatt(e) && e.textContent.trim()) e.textContent = waehle(["   ", e.textContent + " ", "X".repeat(3), e.textContent.toUpperCase(), "#SKONTO#TAGE=14#PROZENT=2.00#\n", "#SKONTO#TAGE=7#PROZENT=3#"]); break;
    }
  }
  return serializeToWellFormedString(doc);
}
let k = 0;
for (const [i, b] of basis.entries()) {
  const z = zufall(1000 + i);
  for (let j = 0; j < JE; j++) {
    const neu = abwandeln(b.text, z);
    if (neu && aufnehmen("abwandlungen", `${b.name.replace(/\.xml$/i, "")}-m${j + 1}.xml`, neu)) k++;
  }
}
writeFileSync(join(KORPUS, "manifest.json"), JSON.stringify(manifest));
const gruppen = manifest.reduce((m, e) => (m[e.gruppe] = (m[e.gruppe] || 0) + 1, m), {});
console.log(`Einfügbare Elemente: UBL ${EINFUEGEN.ubl.length}, CII ${EINFUEGEN.cii.length}`);
console.log(`Korpus: ${manifest.length} Dokumente`, gruppen, `(Abwandlungen ${k} aus ${basis.length} gültigen Rechnungen)`);
