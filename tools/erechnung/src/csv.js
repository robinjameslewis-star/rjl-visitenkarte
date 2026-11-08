// CSV für gemerkte Empfänger und den Positionskatalog (ohne DOM, auch in Node): einlesen mit Erkennung von Zeichensatz (UTF-8, sonst
// Windows-1252 wie bei Excel unter Windows), Trennzeichen (; , oder Tabulator) und Spalten (deutsche und englische Kopfzeilen),
// Anführungszeichen nach RFC 4180, leere Zeilen werden übersprungen. Das Ergebnis ist eine Vorschau mit Status je Zeile (neu, schon
// vorhanden, doppelt in der Datei, nicht lesbar); übernommen wird erst nach Bestätigung. Dazu die Ausgabe als CSV (UTF-8 mit BOM,
// Semikolon), die sich wieder einlesen lässt.
import { EINHEITEN, EINHEITEN_ERSTELLEN } from "./texte.js";
import { dezimalLesen, preisText, STELLEN } from "./rechnen.js";
import { empfaengerBereinigen, katalogBereinigen, empfaengerSchluessel, katalogSchluessel, preisFuer } from "./stamm.js";

// Kopfzeilen vergleichen: klein, ohne Akzente (ä → a), ß → ss, nur Buchstaben und Ziffern („E-Mail“ = „email“, „Art.-Nr.“ = „artnr“)
export const kopfNorm = s => String(s ?? "").toLowerCase().replace(/ß/g, "ss").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const SPALTEN = {
  empfaenger: {
    name: ["Name", "Firma", "Firmenname", "Kunde", "Kundenname", "Empfänger", "Name des Empfängers", "Unternehmen", "Name 1", "Company", "Company name", "Customer", "Customer name", "Recipient", "Recipient name"],
    strasse: ["Straße", "Strasse", "Str.", "Straße und Hausnummer", "Adresse", "Anschrift", "Adresszeile 1", "Street", "Street address", "Address", "Address line 1"],
    zusatz: ["Adresszusatz", "Zusatz", "Adresszeile 2", "Address line 2", "Address 2"],
    plz: ["PLZ", "Postleitzahl", "ZIP", "ZIP code", "Postcode", "Post code", "Postal code"],
    ort: ["Ort", "Stadt", "City", "Town"],
    land: ["Land", "Ländercode", "Country", "Country code"],
    ustid: ["USt-IdNr.", "USt-ID", "Umsatzsteuer-ID", "Umsatzsteuer-Identifikationsnummer", "VAT ID", "VAT number", "VAT No.", "VAT"],
    email: ["E-Mail", "Mail", "E-Mail-Adresse", "Rechnungs-E-Mail", "Email address", "Invoice email"],
    referenz: ["Käuferreferenz", "Referenz", "Referenz des Kunden", "Leitweg-ID", "Leitweg", "Buyer reference", "Reference", "Routing ID"],
    behoerde: ["Behörde", "Öffentlicher Auftraggeber", "Public authority", "Public sector", "Authority"],
  },
  katalog: {
    name: ["Bezeichnung", "Artikelbezeichnung", "Artikel", "Leistung", "Produkt", "Name", "Kurztext", "Item", "Item name", "Product", "Product name", "Service"],
    beschreibung: ["Beschreibung", "Langtext", "Details", "Description", "Long description"],
    einheit: ["Einheit", "Mengeneinheit", "ME", "Unit", "Unit of measure", "UoM"],
    preis: ["Einzelpreis", "Einzelpreis netto", "Preis", "Preis netto", "Nettopreis", "EP", "Price", "Unit price", "Net price", "Price net"],
    steuer: ["Steuersatz", "USt", "USt-Satz", "MwSt", "MwSt-Satz", "Umsatzsteuer", "VAT rate", "Tax rate", "VAT", "Tax"],
    artikelnr: ["Artikelnummer", "Artikelnr.", "Art.-Nr.", "Nummer", "SKU", "Item number", "Article number", "Product code", "Item code", "Item ID"],
  },
};
const KOEPFE = Object.fromEntries(Object.entries(SPALTEN).map(([art, felder]) => [art, new Map(Object.entries(felder).flatMap(([f, namen]) => namen.map(n => [kopfNorm(n), f])))]));
export const FELDER = { empfaenger: Object.keys(SPALTEN.empfaenger), katalog: Object.keys(SPALTEN.katalog) };

// ---------- Datei lesen ----------
export function dekodieren(bytes) {
  let b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) b = b.subarray(3);
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(b), zeichensatz: "UTF-8" }; }
  catch { return { text: new TextDecoder("windows-1252").decode(b), zeichensatz: "Windows-1252" }; }
}
// Trennzeichen aus der ersten nicht leeren Zeile (außerhalb von Anführungszeichen gezählt); bei Gleichstand Semikolon
export function trennzeichen(text) {
  const zeile = String(text).split(/\r\n|\n|\r/).find(z => z.trim()) || "";
  const n = { ";": 0, ",": 0, "\t": 0 };
  let inQ = false;
  for (const c of zeile) { if (c === '"') inQ = !inQ; else if (!inQ && c in n) n[c]++; }
  return [";", "\t", ","].reduce((a, c) => n[c] > n[a] ? c : a, ";");
}
// Zeilen nach RFC 4180: Felder in Anführungszeichen dürfen Trennzeichen, Zeilenumbrüche und verdoppelte "" enthalten; je Zeile die
// Nummer der Zeile in der Datei (nr), auch wenn leere Zeilen wegfallen
export function zerlegen(text, sep) {
  const zeilen = [];
  let feld = "", zeile = [], inQ = false, i = 0, nr = 1, beginn = 1;
  const fertig = () => { zeile.nr = beginn; zeilen.push(zeile); };
  const s = String(text);
  while (i < s.length) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { feld += '"'; i += 2; continue; } inQ = false; i++; continue; }
      if (c === "\n" || (c === "\r" && s[i + 1] !== "\n")) nr++;
      feld += c; i++; continue;
    }
    if (c === '"' && !feld.trim()) { feld = ""; inQ = true; i++; continue; }
    if (c === sep) { zeile.push(feld); feld = ""; i++; continue; }
    if (c === "\r" || c === "\n") { zeile.push(feld); fertig(); feld = ""; zeile = []; i += c === "\r" && s[i + 1] === "\n" ? 2 : 1; beginn = ++nr; continue; }
    feld += c; i++;
  }
  if (feld || zeile.length) { zeile.push(feld); fertig(); }
  return zeilen.map(z => Object.assign(z.map(f => f.trim().replace(/^'(?=[=+\-@])/, "")), { nr: z.nr })).filter(z => z.some(f => f !== ""));
}

// ---------- Werte deuten ----------
const EINHEIT_NAMEN = new Map([
  ...Object.entries({ C62: ["stk", "st", "stck", "stuck", "stueck", "pcs", "pc", "piece", "pieces", "each", "ea", "x"], HUR: ["std", "stunde", "stunden", "h", "hr", "hrs", "hour", "hours"],
    DAY: ["tag", "tage", "day", "days", "d"], MON: ["monat", "monate", "month", "months", "mon", "mo"], ANN: ["jahr", "jahre", "year", "years", "a"], LS: ["pauschal", "pauschale", "psch", "pausch", "lumpsum", "flat", "ls"],
    SET: ["satz", "set", "sets"], KGM: ["kg", "kilogramm", "kilogram"], MTR: ["m", "meter", "metre"], MTK: ["m2", "qm", "quadratmeter", "squaremetre", "sqm"], LTR: ["l", "liter", "litre", "ltr"],
    KMT: ["km", "kilometer", "kilometre"], KWH: ["kwh"] }).flatMap(([code, namen]) => namen.map(n => [n, code])),
  ...EINHEITEN_ERSTELLEN.flatMap(c => [[kopfNorm(c), c], ...EINHEITEN[c].map(n => [kopfNorm(n), c])]),
]);
export function einheitLesen(s) {
  const t = String(s ?? "").trim();
  if (!t) return { code: "C62" };
  if (EINHEITEN_ERSTELLEN.includes(t.toUpperCase())) return { code: t.toUpperCase() };
  const c = EINHEIT_NAMEN.get(kopfNorm(t));
  return c ? { code: c } : { code: "C62", unbekannt: t };
}
// Preis: Semikolon-Dateien schreiben Zahlen deutsch (1.234,56), Komma-Dateien englisch (1,234.56); € und EUR werden entfernt
export function preisLesen(s, lang) {
  const t = String(s ?? "").replace(/€|eur/gi, "").trim();
  if (!t) return "";
  const p = dezimalLesen(t, lang, STELLEN.preis);
  return p == null ? null : preisText(p);
}
export function steuerLesen(s, vorgabe = "S19") {
  const t = String(s ?? "").trim().toLowerCase().replace(/\s|%/g, "");
  if (!t) return vorgabe;
  if (["e", "frei", "steuerfrei", "befreit", "exempt", "taxexempt", "vatexempt"].includes(t)) return "E";
  if (["s19", "s7", "z"].includes(t)) return t.toUpperCase();
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const satz = n > 0 && n < 1 ? Math.round(n * 100) : n;
  return satz === 19 ? "S19" : satz === 7 ? "S7" : satz === 0 ? "Z" : null;
}
const JA = new Set(["ja", "j", "yes", "y", "x", "1", "true", "wahr"]);
const LAENDER = new Map([["deutschland", "DE"], ["germany", "DE"], ["osterreich", "AT"], ["oesterreich", "AT"], ["austria", "AT"], ["schweiz", "CH"], ["switzerland", "CH"],
  ["niederlande", "NL"], ["netherlands", "NL"], ["belgien", "BE"], ["belgium", "BE"], ["luxemburg", "LU"], ["luxembourg", "LU"], ["frankreich", "FR"], ["france", "FR"]]);
export function landLesen(s) {
  const t = String(s ?? "").trim();
  if (!t) return "DE";
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  return LAENDER.get(kopfNorm(t)) || null;
}

// ---------- Einlesen mit Vorschau ----------
// vorhandene: die gemerkte Liste (für „schon vorhanden“); vorgabeSteuer: Steuersatz, wenn die Spalte fehlt oder leer ist
export function csvLesen(bytes, art, vorhandene = [], vorgabeSteuer = "S19") {
  const { text, zeichensatz } = dekodieren(bytes);
  const sep = trennzeichen(text), lang = sep === "," ? "en" : "de";
  const zeilen = zerlegen(text, sep);
  const basis = { zeichensatz, trennzeichen: sep, zeilen: Math.max(0, zeilen.length - 1), spalten: [], ergebnis: [], zaehler: { neu: 0, vorhanden: 0, doppelt: 0, fehler: 0 } };
  if (!zeilen.length) return { ...basis, ok: false, fehler: "leer" };
  const zuordnung = zeilen[0].map(k => KOEPFE[art].get(kopfNorm(k)) || null);
  // Jede Spalte nur einmal: die erste passende zählt
  const gesehen = new Set();
  zuordnung.forEach((f, i) => { if (f && gesehen.has(f)) zuordnung[i] = null; else if (f) gesehen.add(f); });
  basis.spalten = zeilen[0].map((k, i) => ({ kopf: k, feld: zuordnung[i] }));
  if (!gesehen.has("name")) return { ...basis, ok: false, fehler: "keinName" };
  const schluessel = art === "empfaenger" ? empfaengerSchluessel : katalogSchluessel;
  // Schon vorhanden: gleicher Schlüssel; im Katalog auch gleiche Bezeichnung bei einem Eintrag ohne Artikelnummer
  const alt = new Set(vorhandene.map(schluessel)), inDatei = new Set();
  const altNamen = new Set(art === "katalog" ? vorhandene.filter(x => !String(x.artikelnr || "").trim()).map(x => katalogSchluessel({ name: x.name })) : []);
  for (const z of zeilen.slice(1)) {
    const roh = {};
    zuordnung.forEach((f, i) => { if (f) roh[f] = z[i] ?? ""; });
    const hinweise = [];
    let grund = "", eintrag;
    if (art === "empfaenger") {
      const land = landLesen(roh.land);
      if (land == null) grund = "land";
      eintrag = empfaengerBereinigen({ ...roh, land: land || "DE", behoerde: JA.has(String(roh.behoerde || "").trim().toLowerCase()) });
    } else {
      const einheit = einheitLesen(roh.einheit), preis = preisLesen(roh.preis, lang), steuer = steuerLesen(roh.steuer, vorgabeSteuer);
      if (einheit.unbekannt) hinweise.push({ art: "einheit", wert: einheit.unbekannt });
      if (preis == null) grund = "preis"; else if (steuer == null) grund = "steuer";
      eintrag = katalogBereinigen({ ...roh, einheit: einheit.code, preis: preis || "", steuer: steuer || vorgabeSteuer });
    }
    if (!eintrag.name.trim()) grund = "name";
    const k = schluessel(eintrag);
    const status = grund ? "fehler" : inDatei.has(k) ? "doppelt" : alt.has(k) || altNamen.has(katalogSchluessel({ name: eintrag.name })) ? "vorhanden" : "neu";
    if (!grund) inDatei.add(k);
    basis.zaehler[status]++;
    basis.ergebnis.push({ zeile: z.nr, status, grund, hinweise, eintrag });
  }
  return { ...basis, ok: true, fehler: "" };
}

// ---------- Ausgabe ----------
const KOPF_AUS = {
  empfaenger: { de: ["Name", "Straße", "Adresszusatz", "PLZ", "Ort", "Land", "USt-IdNr.", "E-Mail", "Käuferreferenz", "Behörde"], en: ["Name", "Street", "Address line 2", "Postcode", "City", "Country", "VAT ID", "Email", "Buyer reference", "Public authority"] },
  katalog: { de: ["Bezeichnung", "Beschreibung", "Einheit", "Einzelpreis netto", "Steuersatz", "Artikelnummer"], en: ["Item name", "Description", "Unit", "Net price", "VAT rate", "Item number"] },
};
const zelle = v => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s; // keine Formeln in der Tabellenkalkulation
  return /[;"\r\n,\t]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function csvSchreiben(liste, art, lang = "de") {
  const L = lang === "en" ? 1 : 0, ja = lang === "en" ? "yes" : "ja";
  const steuer = { S19: "19", S7: "7", Z: "0", E: lang === "en" ? "exempt" : "steuerfrei" };
  const zeilen = liste.map(x => art === "empfaenger"
    ? [x.name, x.strasse, x.zusatz, x.plz, x.ort, x.land, x.ustid, x.email, x.referenz, x.behoerde ? ja : ""]
    : [x.name, x.beschreibung, EINHEITEN[x.einheit] ? EINHEITEN[x.einheit][L] : x.einheit, preisFuer(x.preis, "de"), steuer[x.steuer], x.artikelnr]);
  // Semikolon und deutsche Zahlen in beiden Sprachen: So liest die Datei jede Tabellenkalkulation und dieses Werkzeug gleich
  return "﻿" + [KOPF_AUS[art][lang === "en" ? "en" : "de"], ...zeilen].map(z => z.map(zelle).join(";")).join("\r\n") + "\r\n";
}
