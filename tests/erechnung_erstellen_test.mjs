// SmartFormular E-Rechnung lite, „Erstellen“: Rechnen, Maske, Nummern und XML-Text in Node; danach der Rundlauf im echten Chrome:
// Rechnungen aller Paare der wichtigen Merkmale (pairwise), rund 2.000 Zufallsfälle mit festem Startwert und feste Randfälle werden
// mit ublSchreiben erzeugt, auf derselben Lesestrecke wie beim Prüfen eingelesen (lesen.js) und mit dem ausgelieferten Prüfkern
// (assets/erechnung/pruefung.js, Regeln assets/erechnung/regeln/) geprüft – alle Rechnungsarten (Rechnung, Abschlag, Dauer, Storno als
// UBL CreditNote) und Artikelnummern. Erwartet je Datei: Szenario XRechnung (UBL Invoice bzw. CreditNote), 0 Fehler, 0 Auswertungs-
// fehler, 0 Warnungen; die gelesenen Daten stimmen mit dem Modell überein, der GiroCode ist gesetzt (bei Storno bewusst nicht), und
// die Rechnung lässt sich als Vorlage wieder in die Maske lesen (vorlage.js). Dazu in Node: Speicher (stamm.js, auch ohne Speicher)
// und CSV-Einlesen mit den Testdateien in tests/erechnung/daten/csv/.
// Die Dateien und manifest.json landen in tools/erechnung/.cache/erstellen/. Ist eine Python-Umgebung mit saxonche und lxml da
// (tools/erechnung/.cache/venv oder ERECHNUNG_PYTHON), prüft tests/erechnung_erstellen_referenz.py dieselben Dateien wie der
// Validator der KoSIT: XML-Schema (XSD) und Schematron mit Saxon; sonst wird dieser Teil sichtbar übersprungen.
//   node tests/erechnung_erstellen_test.mjs [--nur-node] [--zufall 2000]
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { WZ, server, chrome, check, ergebnis } from "./erechnung/hilfen.mjs";
import { dezimalLesen, zeileNetto, summen, betragText, mengeText, preisText, rund, GRENZE } from "../tools/erechnung/src/rechnen.js";
import { ublSchreiben, xmlText, KENNUNG, PROZESS, dateiName, OHNE_REFERENZ, ART_CODE, faelligkeiten, dauerTexte, STORNO_ZAHLUNG } from "../tools/erechnung/src/erzeugen.js";
import { folgeRechnung, stornoRechnung, naechsterZeitraum, spracheWechseln } from "../tools/erechnung/src/vorlage.js";
import { csvLesen, csvSchreiben, dekodieren, trennzeichen, zerlegen, einheitLesen, steuerLesen, preisLesen } from "../tools/erechnung/src/csv.js";
import { maskePruefen, naechsteNummer, nummerSpaeter, speichernErlaubt } from "../tools/erechnung/src/maske.js";
import { EINHEITEN_ERSTELLEN, BEFREIUNGEN } from "../tools/erechnung/src/texte.js";
import { firmaBereinigen, firmaExport, firmaImport } from "../tools/erechnung/src/firma.js";

const args = process.argv.slice(2);
const ZUFALL = args.includes("--zufall") ? +args[args.indexOf("--zufall") + 1] : 2000;
const ORDNER = join(WZ, ".cache", "erstellen");

// ---------- Teil Node ----------
console.log("Rechnen (BigInt, Rundung nach EN 16931)");
check(dezimalLesen("1.234,56", "de", 2) === 123456n && dezimalLesen("1,234.56", "en", 2) === 123456n && dezimalLesen("0.5", "de", 3) === 500n && dezimalLesen("1,5", "en", 3) === 1500n
  && dezimalLesen("1.234", "de", 3) === 1234000n && dezimalLesen(",5", "de", 2) === 50n, "Eingaben je Sprache: 1.234,56 / 1,234.56, 0.5 auf Deutsch, 1,5 auf Englisch, Tausenderpunkt");
check(["-1", "1,23456", "abc", "1.2.3", "1,2,3", "", " ", "1e5", "12.34.567"].every(s => dezimalLesen(s, "de", 4) === null), "ungültige Eingaben und zu viele Nachkommastellen ergeben null");
check(dezimalLesen("0.500", "de", 3) === 500n && dezimalLesen("0,500", "en", 3) === 500n && dezimalLesen("1.500", "de", 3) === 1500000n && dezimalLesen("0.500.000", "de", 3) === null
  && dezimalLesen("012.345", "de", 3) === null && dezimalLesen("000.000", "de", 3) === 0n, "führende 0 ist keine Tausendergruppe: 0.500 = 0,5 (de), 0,500 = 0.5 (en); 0.500.000 und 012.345 ungültig");
check(zeileNetto(1000n, 50n) === 1n && zeileNetto(1000n, 49n) === 0n && zeileNetto(1500n, 50n) === 1n && zeileNetto(3000n, 50n) === 2n, "Position: Rundung bei der Hälfte nach oben (0,005 → 0,01; 0,0049 → 0,00; 0,0075 → 0,01; 0,015 → 0,02)");
// Referenz mit Ziffernketten (schriftliches Multiplizieren), unabhängig von BigInt
function malText(a, b) {
  const x = [...a].reverse().map(Number), y = [...b].reverse().map(Number), r = Array(x.length + y.length).fill(0);
  x.forEach((p, i) => y.forEach((q, j) => { r[i + j] += p * q; }));
  for (let i = 0; i < r.length - 1; i++) { r[i + 1] += Math.floor(r[i] / 10); r[i] %= 10; }
  return r.reverse().join("").replace(/^0+(?=\d)/, "");
}
function rundText(ziffern, weg) { // ganze Zahl als Text durch 10^weg, kaufmännisch
  const s = ziffern.padStart(weg + 1, "0"), kopf = s.slice(0, s.length - weg), rest = s.slice(s.length - weg);
  return rest[0] >= "5" ? (BigInt(kopf) + 1n).toString() : BigInt(kopf).toString();
}
let zufall = 20261108;
const zz = n => { zufall = (zufall * 1103515245 + 12345) % 2147483648; return zufall % n; };
let gleich = 0;
for (let i = 0; i < 5000; i++) {
  const m = String(zz(1000000000) + 1), p = String(zz(1000000000));
  const soll = rundText(malText(m, p), 5), ist = zeileNetto(BigInt(m), BigInt(p)).toString();
  if (soll === ist) gleich++;
}
check(gleich === 5000, `5.000 Zufallspositionen: BigInt gleich der Rechnung mit Ziffernketten (${gleich})`);
const gross = summen({ sprache: "de", positionen: [{ menge: "1", preis: "934.579.439,24", steuer: "S7" }] });
check(gross.zahlbetrag === GRENZE && betragText(gross.zahlbetrag) === "999999999.99", `großer Betrag exakt: 934.579.439,24 + 7 % = ${betragText(gross.zahlbetrag)}`);
const s3 = summen({ sprache: "de", positionen: [{ menge: "1", preis: "0,1", steuer: "S19" }, { menge: "1", preis: "0,2", steuer: "S19" }, { menge: "3", preis: "33,3333", steuer: "S7" }, { menge: "1", preis: "10", steuer: "E" }] });
check(betragText(s3.netto) === "110.30" && s3.gruppen.length === 3 && betragText(s3.gruppen[0].steuer) === "0.06" && betragText(s3.gruppen[1].steuer) === "7.00" && betragText(s3.steuer) === "7.06" && betragText(s3.zahlbetrag) === "117.36",
  `Summen je Gruppe gerundet (BR-CO-17): 0,1 + 0,2 = 0,30; 3 × 33,3333 = 100,00; Steuer 0,06 + 7,00 (${betragText(s3.zahlbetrag)})`);
check(mengeText(1234567n) === "1234.567" && mengeText(500n) === "0.5" && mengeText(1000n) === "1" && preisText(123456n) === "12.3456" && preisText(680000n) === "68.00" && rund(5n, 10n) === 1n, "Ausgabe: Menge ohne Nullen am Ende, Preis mit 2 bis 4 Nachkommastellen");

console.log("\nXML-Text");
check(xmlText(`a & b < c > d " e ' f`) === "a &amp; b &lt; c &gt; d &quot; e &apos; f", "& < > \" ' maskiert");
check(xmlText("Müller Straße") === "Müller Straße" && xmlText("Grüße 😀") === "Grüße 😀", "Umlaute in NFC, ß und Emoji bleiben");
check(xmlText("a\u0000b\u0007c\u001Fd￾e\uD800f") === "abcdef" && xmlText(" x\r\ny ") === "x\ny", "Steuerzeichen, Nicht-Zeichen und einzelne Surrogate entfernt, Zeilenenden vereinheitlicht");

console.log("\nNummern und Speichern");
check(naechsteNummer(null, "2026-11-08") === "2026-001" && naechsteNummer("RE-2026-0041", "2026-11-08") === "RE-2026-0042" && naechsteNummer("2025-017", "2026-01-02") === "2026-001"
  && naechsteNummer("RE-2025-0099/B", "2026-01-02") === "RE-2026-0001/B" && naechsteNummer("999", "2026-11-08") === "1000" && naechsteNummer("A-9", "2026-11-08") === "A-10" && naechsteNummer("Rechnung", "2026-11-08") === "Rechnung-1"
  && naechsteNummer("2026-001", "2026-11-08") === "2026-002", "naechsteNummer: +1 mit Breite, neues Jahr setzt auf 1, Suffix bleibt");
check(naechsteNummer("RE-12/2026", "2026-11-08") === "RE-13/2026" && naechsteNummer("12/2026", "2026-11-08") === "13/2026" && naechsteNummer("RE-12/2025", "2026-01-02") === "RE-01/2026"
  && naechsteNummer("RE-1/2026-B", "2026-11-08") === "RE-2/2026-B", "naechsteNummer: Jahr hinten (lfd. Nr./Jahr) zählt die Nummer davor, im neuen Jahr ab 1");
check(!nummerSpaeter("RE-2026-0017", "RE-2026-0041") && nummerSpaeter("RE-2026-0042", "RE-2026-0041") && nummerSpaeter("RE-2027-0001", "RE-2026-0041") && !nummerSpaeter("RE-2025-0099", "RE-2026-0003")
  && !nummerSpaeter("RE-2026-0041", "RE-2026-0041") && nummerSpaeter("2026/42", "RE-2026-0041") && nummerSpaeter("RE-13/2026", "RE-12/2026") && !nummerSpaeter("RE-11/2026", "RE-12/2026") && nummerSpaeter("A-1", null),
  "nummerSpaeter: eine ältere oder gleiche Nummer setzt den Zähler nicht zurück; neues Muster oder neues Jahr zählt");
check(speichernErlaubt({ status: "fertig", befunde: [{ stufe: "warnung" }, { stufe: "hinweis" }], fehler: [] }) && !speichernErlaubt({ status: "fertig", befunde: [{ stufe: "fehler" }], fehler: [] })
  && !speichernErlaubt({ status: "fertig", befunde: [], fehler: [{}] }) && !speichernErlaubt({ status: "laeuft", befunde: [], fehler: [] }) && !speichernErlaubt(null), "speichernErlaubt: nur fertig, ohne Fehler und Auswertungsfehler; Warnungen erlaubt");
const META = JSON.parse(readFileSync(join(WZ, "src", "generiert", "meta.json"), "utf8"));
const sz = META.szenarien.find(s => s.syntax === "ubl" && s.wurzel === "Invoice" && s.kennung === KENNUNG);
check(sz && sz.name === "EN16931 XRechnung (UBL Invoice)" && sz.saetze.join() === "en16931-ubl,xrechnung-ubl", `Kennung ${KENNUNG} ist das Szenario „EN16931 XRechnung (UBL Invoice)“ der Prüfregeln`);
check(dateiName("RE 2026/0042") === "RE_2026_0042.xml" && dateiName("../x") === "x.xml" && dateiName("") === "E-Rechnung.xml", "Dateiname nur aus sicheren Zeichen");

// ---------- Erfundene Testdaten ----------
const FIRMA = { name: "Werkstatt Kupferhahn GmbH", handelsname: "Kupferhahn", strasse: "Hafenstraße 8", plz: "23456", ort: "Fischbach", steuernummer: "12/345/67890", ustid: "DE811111111", register: "HRB 9876, Amtsgericht Fischbach",
  kontakt: { name: "Mira Kupferhahn", telefon: "+49 4567 1234-0", email: "buero@kupferhahn.example" }, bank: { iban: "DE44500105175407324931", bic: "INGDDEFFXXX", inhaber: "" }, kleinunternehmer: false };
const RECHNUNG = () => ({ sprache: "de", nummer: "KH-2026-0007", datum: "2026-11-09", leistung: { art: "datum", datum: "2026-11-05", von: "", bis: "" },
  empfaenger: { name: "Gärtnerei Abendtau KG", strasse: "Feldweg 3", zusatz: "", plz: "23457", ort: "Fischbach", land: "DE", ustid: "", email: "rechnung@abendtau.example", behoerde: false, referenz: "" },
  positionen: [{ name: "Wartung Heizung", beschreibung: "", menge: "2,5", einheit: "HUR", preis: "72,00", steuer: "S19" }], befreiung: { wahl: "", text: "" }, zielTage: "14", zweck: "", bemerkung: "" });
const kopie = o => JSON.parse(JSON.stringify(o));

console.log("\nMaske");
check(maskePruefen(FIRMA, RECHNUNG(), "de").length === 0, "vollständige Angaben: keine Meldung");
const PFLICHT = ["firma.name", "firma.strasse", "firma.plz", "firma.ort", "firma.kontakt.name", "firma.kontakt.telefon", "firma.kontakt.email", "firma.bank.iban",
  "empfaenger.name", "empfaenger.strasse", "empfaenger.plz", "empfaenger.ort", "empfaenger.email", "nummer", "datum", "leistung.datum", "pos.0.name", "pos.0.menge", "pos.0.preis", "zielTage"];
const falsch = [];
for (const f of PFLICHT) {
  const firma = kopie(FIRMA), r = RECHNUNG(), teile = f.split(".");
  let o = teile[0] === "firma" ? firma : teile[0] === "pos" ? r.positionen[+teile[1]] : r;
  const pfad = teile[0] === "firma" ? teile.slice(1) : teile[0] === "pos" ? teile.slice(2) : teile;
  for (const k of pfad.slice(0, -1)) o = o[k];
  o[pfad[pfad.length - 1]] = "";
  const m = maskePruefen(firma, r, "de");
  if (m.length !== 1 || m[0].feld !== f) falsch.push(`${f}: ${JSON.stringify(m)}`);
}
check(!falsch.length, `jedes Pflichtfeld leer ergibt genau eine Meldung am richtigen Feld (${PFLICHT.length} Felder) ${falsch.slice(0, 3).join(" | ")}`);
const ohneSteuer = kopie(FIRMA); ohneSteuer.steuernummer = ""; ohneSteuer.ustid = "";
const behoerde = RECHNUNG(); behoerde.empfaenger.behoerde = true; behoerde.empfaenger.email = "";
const befreit = RECHNUNG(); befreit.positionen[0].steuer = "E";
const zeitraum = RECHNUNG(); zeitraum.leistung = { art: "zeitraum", von: "2026-11-30", bis: "2026-11-01" };
const m1 = maskePruefen(ohneSteuer, RECHNUNG()), m2 = maskePruefen(FIRMA, behoerde), m3 = maskePruefen(FIRMA, befreit), m4 = maskePruefen(FIRMA, zeitraum);
const nullsatz = RECHNUNG(); nullsatz.positionen[0].steuer = "Z";
const m5 = maskePruefen(FIRMA, nullsatz); nullsatz.nullsatz = true;
check(m5.length === 1 && m5[0].feld === "nullsatz" && !maskePruefen(FIRMA, nullsatz).length, "0 % Nullsteuersatz nur mit Bestätigung (§ 12 Abs. 3 UStG)");
check(m1.length === 1 && m1[0].feld === "firma.steuernummer" && m2.length === 1 && m2[0].feld === "empfaenger.referenz" && m3.length === 1 && m3[0].feld === "befreiung.text" && m4.length === 1 && m4[0].feld === "leistung.bis",
  "ohne Steuernummer und USt-IdNr., Behörde ohne Leitweg-ID, steuerfrei ohne Grund, Zeitraum verkehrt: je eine Meldung");
const formate = kopie(FIRMA); Object.assign(formate, { plz: "1234", ustid: "DE12345" }); Object.assign(formate.kontakt, { telefon: "12", email: "a@b" }); Object.assign(formate.bank, { iban: "DE44500105175407324932", bic: "XYZ" });
const fm = maskePruefen(formate, RECHNUNG()).map(m => m.feld).join();
check(fm === "firma.plz,firma.ustid,firma.kontakt.telefon,firma.kontakt.email,firma.bank.iban,firma.bank.bic", `Formate: PLZ, USt-IdNr., Telefon, E-Mail, IBAN-Prüfziffer, BIC (${fm})`);
const neg = RECHNUNG(); neg.positionen[0].menge = "0"; neg.positionen.push({ name: "x", menge: "1", preis: "-5", einheit: "C62", steuer: "S19" });
check(maskePruefen(FIRMA, neg).map(m => m.feld).join() === "pos.0.menge,pos.1.preis", "Menge 0 und negativer Preis werden gemeldet");
check(maskePruefen(FIRMA, RECHNUNG(), "en")[0] === undefined && maskePruefen({}, { positionen: [] }, "en").some(m => m.text === "Please fill this in."), "Meldungen auch auf Englisch");
const ex = firmaImport(firmaExport(FIRMA, { letzte: "KH-2026-0006", datum: "2026-11-01" }));
check(ex && ex.firma.name === FIRMA.name && ex.firma.bank.iban === FIRMA.bank.iban && ex.nummer.letzte === "KH-2026-0006" && firmaImport('{"art":"x"}') === null && firmaImport("kein json") === null
  && firmaBereinigen({ name: 5, fremd: "x", kontakt: { email: "a@b.de" } }).name === "" && !("fremd" in firmaBereinigen({ fremd: 1 })), "Firmendaten als Datei: hin und zurück, fremde Dateien und Felder abgewiesen");

console.log("\nXML: Referenz, Kontakt der Behörde, Hinweis § 19");
const sx = RECHNUNG(); Object.assign(sx.empfaenger, { referenz: "PO A&B 'Nord' <1>" }); sx.zweck = "Rechnung & Co"; sx.bemerkung = "Danke & \"Gruß\"";
const xs = ublSchreiben(FIRMA, sx);
check(xs.includes("<cbc:BuyerReference>PO A&amp;B &apos;Nord&apos; &lt;1&gt;</cbc:BuyerReference>") && !xs.includes("&amp;amp;") && !xs.includes("&amp;apos;"), "Käuferreferenz (BT-10) mit Sonderzeichen einmal maskiert");
const bx = RECHNUNG(); Object.assign(bx.empfaenger, { behoerde: true, referenz: "991-33333-44", email: "poststelle@amt.example" });
const xb = ublSchreiben(FIRMA, bx), xk = ublSchreiben({ ...FIRMA, kleinunternehmer: true }, RECHNUNG());
check(/<cbc:EndpointID schemeID="0204">991-33333-44<\/cbc:EndpointID>/.test(xb) && /<cac:Contact>\s*<cbc:ElectronicMail>poststelle@amt\.example<\/cbc:ElectronicMail>\s*<\/cac:Contact>\s*<\/cac:Party>\s*<\/cac:AccountingCustomerParty>/.test(xb),
  "Behörde: Leitweg-ID als BT-49, angegebene E-Mail als Kontakt des Käufers (BT-58)");
check(xk.includes("<cbc:Note>Steuerbefreiung für Kleinunternehmer nach § 19 Abs. 1 UStG.</cbc:Note>"), "Kleinunternehmer: Hinweis auf die Steuerbefreiung nach § 19 Abs. 1 UStG");

console.log("\nRechnungsarten: Maske, Codes, Texte");
check(ART_CODE.rechnung === "380" && ART_CODE.abschlag === "326" && ART_CODE.dauer === "380" && ART_CODE.storno === "381", "Codes: Rechnung und Dauerrechnung 380, Abschlag 326 (Teilrechnung), Storno 381 (CreditNote)");
const artR = (art, extra = {}) => Object.assign(RECHNUNG(), { art, bezug: "", storno: { nummer: "", datum: "" }, dauer: { turnus: "monat", tag: "1" } }, extra);
const ma = maskePruefen(FIRMA, artR("abschlag")), ms = maskePruefen(FIRMA, artR("storno")), md = maskePruefen(FIRMA, artR("dauer", { dauer: { turnus: "monat", tag: "31" }, zielTage: "" }));
const ms2 = maskePruefen(FIRMA, artR("storno", { storno: { nummer: "KH-1", datum: "2026-12-01" }, zielTage: "x" }));
check(ma.map(m => m.feld).join() === "bezug" && ms.map(m => m.feld).join() === "storno.nummer,storno.datum" && md.map(m => m.feld).join() === "dauer.tag,leistung.von,leistung.bis"
  && ms2.map(m => m.feld).join() === "storno.datum", `Maske: Abschlag ohne Auftrag, Storno ohne Bezug oder mit späterem Datum, Dauer mit Tag 31 und ohne Laufzeit; Zahlungsziel nur bei Rechnung und Abschlag (${md.map(m => m.feld)})`);
check(faelligkeiten("2027-01-01", "2027-12-31", "monat", "3").length === 12 && faelligkeiten("2027-01-15", "2027-12-31", "quartal", "1").join() === "2027-01-01,2027-04-01,2027-07-01,2027-10-01"
  && faelligkeiten("2027-03-01", "2029-02-28", "jahr", "28").join() === "2027-03-28,2028-03-28" && faelligkeiten("2027-02-01", "2027-01-01", "monat", "1").length === 0, "Dauerrechnung: Fälligkeiten je Monat, Quartal und Jahr innerhalb der Laufzeit");
const dt = dauerTexte({ leistung: { von: "2027-01-01", bis: "2027-12-31" }, dauer: { turnus: "monat", tag: "3" } }, 95200n);
check(dt.hinweis === "Dauerrechnung: Diese Rechnung gilt für jeden Monat vom 01.01.2027 bis 31.12.2027. Alle Beträge gelten je Monat." && dt.zahlung === "Zahlbar ohne Abzug monatlich jeweils am 3., erstmals am 03.01.2027, letztmals am 03.12.2027, je 952,00 €." && dt.erste === "2027-01-03",
  `Dauerrechnung: Hinweis (BT-22) und Fälligkeiten im Klartext (BT-20): ${dt.zahlung}`);
const xa = ublSchreiben(FIRMA, artR("abschlag", { bezug: "Projekt Nord & Süd" })), xst = ublSchreiben(FIRMA, artR("storno", { storno: { nummer: "KH-2026-0006", datum: "2026-11-01" } }));
check(/<cbc:InvoiceTypeCode>326</.test(xa) && /<cac:ProjectReference>\s*<cbc:ID>Projekt Nord &amp; Süd<\/cbc:ID>/.test(xa) && /<cbc:Note>Abschlagsrechnung zu Projekt Nord &amp; Süd\./.test(xa), "Abschlag: 326, Projektreferenz (BT-11), Hinweis in der Datei");
check(/^<\?xml[^]*<ubl:CreditNote xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"/.test(xst) && /<cbc:CreditNoteTypeCode>381</.test(xst) && /<cac:BillingReference>\s*<cac:InvoiceDocumentReference>\s*<cbc:ID>KH-2026-0006<\/cbc:ID>\s*<cbc:IssueDate>2026-11-01</.test(xst)
  && /<cac:CreditNoteLine>/.test(xst) && /<cbc:CreditedQuantity unitCode="HUR">2.5</.test(xst) && !/DueDate|PayeeFinancialAccount|-\d/.test(xst.replace(/\d{4}-\d{2}-\d{2}|[A-Z]{2}-\d{4}-\d{4}|KH-\d{4}-\d{4}|\+49 \d{4} \d{4}-0|12\/345|[a-z]-\d/gi, "")) && xst.includes(`<cbc:Note>${STORNO_ZAHLUNG}</cbc:Note>`),
  "Storno: UBL CreditNote 381, Bezug BG-3 mit Nummer und Datum, CreditNoteLine, positive Beträge, ohne Fälligkeit und Konto");
const xn = ublSchreiben(FIRMA, Object.assign(RECHNUNG(), { positionen: [{ name: "Ventil", menge: "1", einheit: "C62", preis: "5", steuer: "S19", artikelnr: "V-<1>" }] }));
check(/<cbc:Name>Ventil<\/cbc:Name>\s*<cac:SellersItemIdentification>\s*<cbc:ID>V-&lt;1&gt;<\/cbc:ID>\s*<\/cac:SellersItemIdentification>\s*<cac:ClassifiedTaxCategory>/.test(xn), "Artikelnummer (BT-155) nach dem Namen, maskiert");

console.log("\nVorlage: Folge- und Stornorechnung");
check(JSON.stringify(naechsterZeitraum("2026-11-01", "2026-11-30")) === '{"von":"2026-12-01","bis":"2026-12-31"}' && JSON.stringify(naechsterZeitraum("2027-01-01", "2027-03-31")) === '{"von":"2027-04-01","bis":"2027-06-30"}'
  && JSON.stringify(naechsterZeitraum("2026-11-10", "2026-11-16")) === '{"von":"2026-11-17","bis":"2026-11-23"}' && JSON.stringify(naechsterZeitraum("2027-01-01", "2027-12-31")) === '{"von":"2028-01-01","bis":"2028-12-31"}'
  && JSON.stringify(naechsterZeitraum("2028-02-01", "2028-02-29")) === '{"von":"2028-03-01","bis":"2028-03-31"}', "nächster Zeitraum: Monat, Quartal, Woche, Jahr, Februar im Schaltjahr");
const alt = artR("dauer", { nummer: "KH-2026-0007", leistung: { art: "zeitraum", von: "2026-11-01", bis: "2026-11-30" }, dauer: { turnus: "monat", tag: "3" } });
const fo = folgeRechnung(alt, "KH-2026-0009", "2026-12-01"), so = stornoRechnung(artR("abschlag", { bezug: "P1" }), "KH-2026-0009", "2026-12-02");
check(fo.art === "dauer" && fo.nummer === "KH-2026-0010" && fo.datum === "2026-12-01" && fo.leistung.von === "2026-12-01" && fo.leistung.bis === "2026-12-31" && fo.empfaenger.name === alt.empfaenger.name && fo.positionen[0].preis === "72,00",
  "Folgerechnung: nächste Nummer nach der zuletzt gespeicherten, nächster Zeitraum, sonst gleiche Angaben");
check(so.art === "storno" && so.storno.nummer === "KH-2026-0007" && so.storno.datum === "2026-11-09" && so.nummer === "KH-2026-0010" && so.positionen.length === 1, "Stornorechnung: Bezug auf Nummer und Datum der Vorlage, eigene neue Nummer");
check(folgeRechnung(so, null, "2026-12-03").art === "rechnung" && spracheWechseln({ ...RECHNUNG(), positionen: [{ name: "a", menge: "1.234,5", preis: "0,5" }] }, "en").positionen[0].menge === "1234.5", "aus einer Stornorechnung wird als Folge wieder eine Rechnung; Zahlen wechseln die Schreibweise mit der Sprache");

console.log("\nGemerkte Daten im Gerät (stamm.js)");
const speicher = new Map();
globalThis.localStorage = { getItem: k => speicher.has(k) ? speicher.get(k) : null, setItem: (k, v) => { speicher.set(k, String(v)); }, removeItem: k => { speicher.delete(k); }, get length() { return speicher.size; } };
const st = await import("../tools/erechnung/src/stamm.js");
st.empfaengerMerken({ name: "Gärtnerei Abendtau KG", plz: "23457", ort: "Fischbach", email: "a@b.example", fremd: "x" });
st.empfaengerMerken({ name: "gärtnerei  abendtau kg", plz: "23457", ort: "Fischbach-Neu", email: "neu@b.example" });
st.empfaengerMerken({ name: "Abendrot GmbH", plz: "10115" });
const el = st.listeLesen("empfaenger");
check(el.length === 2 && el[1].ort === "Fischbach-Neu" && el[0].name === "Abendrot GmbH" && !("fremd" in el[1]) && JSON.parse(speicher.get("rverechnung:empfaenger")).liste.length === 2,
  "Empfänger beim Speichern gemerkt: gleicher Name und PLZ ersetzt (neueste Angaben), Neuestes vorn, fremde Felder fallen weg");
check(st.vorschlaege(el, "aben").join() === "0,1" && st.vorschlaege(el, "tau").join() === "1" && st.vorschlaege(el, "Gart").join() === "1" && st.vorschlaege(el, "").length === 0 && st.vorschlaege(el, "xyz").length === 0, "Vorschläge: Anfang zuerst, dann irgendwo im Namen; ohne Akzente (Gart findet Gärtnerei)");
const k1 = st.katalogMerken({ name: "Wartung", preis: st.preisFest("72,5", "de"), einheit: "HUR", steuer: "S19", artikelnr: "W-1" }), k2 = st.katalogMerken({ name: "Wartung Heizung", preis: "80", einheit: "HUR", steuer: "S7", artikelnr: "w-1" });
check(k1.neu && !k2.neu && st.listeLesen("katalog").length === 1 && st.listeLesen("katalog")[0].preis === "80.00" && st.preisFuer("72.50", "de") === "72,50" && st.katalogBereinigen({ name: "x", einheit: "ZZZ", steuer: "K", preis: "-1" }).einheit === "C62"
  && st.katalogBereinigen({ name: "x", preis: "-1" }).preis === "", "Katalog: gleiche Artikelnummer ersetzt, Preis fest mit Punkt, unbekannte Einheit und Steuer abgewiesen");
for (let i = 0; i < 25; i++) st.rechnungMerken({ ...RECHNUNG(), nummer: `KH-${i}` }, 100n * BigInt(i));
const rl = st.rechnungenLesen();
check(rl.length === 20 && rl[0].nummer === "KH-24" && rl[0].betrag === "2400" && rl[0].empfaenger.name === "Gärtnerei Abendtau KG", "gemerkte Rechnungen: die letzten 20, Neueste vorn, mit Betrag");
const sicher = st.alleExport({ firma: FIRMA, nummer: { letzte: "KH-24", datum: "2026-11-09" }, empfaenger: el, katalog: st.listeLesen("katalog"), rechnungen: rl });
const zurueck = st.alleImport(sicher), alteDatei = st.alleImport(firmaExport(FIRMA, { letzte: "KH-1", datum: "" }));
check(zurueck && zurueck.firma.name === FIRMA.name && zurueck.nummer.letzte === "KH-24" && zurueck.empfaenger.length === 2 && zurueck.katalog.length === 1 && zurueck.rechnungen.length === 20 && st.alleImport('{"art":"x"}') === null && st.alleImport("kein json") === null
  && alteDatei && alteDatei.firma.name === FIRMA.name && alteDatei.empfaenger === null, "alle lokalen Daten als eine Datei: hin und zurück; die Datei „Firmendaten“ wird auch übernommen, fremde Dateien abgewiesen");
st.stammLoeschen();
check(!speicher.has("rverechnung:empfaenger") && !speicher.has("rverechnung:katalog") && !speicher.has("rverechnung:rechnungen") && st.listeLesen("empfaenger").length === 0, "Löschen entfernt Empfänger, Katalog und gemerkte Rechnungen");
globalThis.localStorage = { getItem() { throw new Error("gesperrt"); }, setItem() { throw new Error("gesperrt"); }, removeItem() { throw new Error("gesperrt"); } };
st.empfaengerMerken({ name: "Nur im Fenster AG", plz: "1" });
check(st.listeLesen("empfaenger").length === 1 && st.listeLesen("empfaenger")[0].name === "Nur im Fenster AG" && st.alleLesen().firma === null, "ohne Speicher (privates Fenster): kein Absturz, gemerkt nur im Arbeitsspeicher");
delete globalThis.localStorage;
st.stammLoeschen();
check(st.listeLesen("empfaenger").length === 0 && st.rechnungenLesen().length === 0, "ganz ohne localStorage: leere Listen, kein Absturz");

console.log("\nCSV einlesen und schreiben");
const CSV = n => readFileSync(join(WZ, "..", "..", "tests", "erechnung", "daten", "csv", n));
const c1 = csvLesen(CSV("empfaenger-semikolon-utf8.csv"), "empfaenger");
const st1 = c1.ergebnis.map(x => `${x.zeile}:${x.status}`).join();
check(c1.ok && c1.zeichensatz === "UTF-8" && c1.trennzeichen === ";" && st1 === "2:neu,3:neu,5:neu,7:fehler,9:doppelt,10:neu" && c1.spalten.find(s => s.kopf === "Kundennr.").feld === null
  && c1.ergebnis[1].eintrag.name === "Müller & Söhne; Bau" && c1.ergebnis[2].eintrag.name === 'Kanzlei "Weitblick" Partner' && c1.ergebnis[2].eintrag.strasse === "Am Markt 1\nHinterhaus" && c1.ergebnis[5].eintrag.behoerde === true,
  `Empfänger, Semikolon, UTF-8 mit BOM: Anführungszeichen mit ; und "", Umbruch im Feld, leere Zeilen übersprungen, ohne Namen und doppelt erkannt, Zeilen wie in der Datei (${st1})`);
const c2 = csvLesen(CSV("empfaenger-komma-1252.csv"), "empfaenger", [{ name: "Café Größenwahn", plz: "8001" }]);
check(c2.ok && c2.zeichensatz === "Windows-1252" && c2.trennzeichen === "," && c2.ergebnis[0].eintrag.name === "Bäckerei Sonnenstrahl" && c2.ergebnis[0].eintrag.land === "AT" && c2.ergebnis[1].eintrag.name === "Schreinerei Grün, Holz & Mehr"
  && c2.ergebnis[2].status === "vorhanden" && c2.ergebnis[3].grund === "land", "Empfänger, Komma, Windows-1252: Umlaute richtig, „Österreich“ → AT, schon vorhanden erkannt, unbekanntes Land übersprungen");
const c3 = csvLesen(CSV("katalog-semikolon-utf8.csv"), "katalog");
const z3 = c3.ergebnis.map(x => `${x.eintrag.artikelnr || "-"}:${x.status}:${x.eintrag.einheit}:${x.eintrag.preis}:${x.eintrag.steuer}`).join(" ");
check(c3.ok && z3 === "W-100:neu:HUR:72.00:S19 B-7:neu:C62:24.90:S7 A-1:neu:LS:45.00:S19 M-2:neu:MON:1234.50:E R-9:neu:C62:3.50:S19 X-0:fehler:C62::S19 X-1:fehler:C62:10.00:S19 W-100:doppelt:HUR:80.00:S19 -:neu:HUR:12.3456:S19"
  && c3.ergebnis[4].hinweise[0].wert === "Rolle" && c3.ergebnis[0].eintrag.beschreibung === "Jährliche Wartung; inkl. Abgasmessung", `Katalog, Semikolon: deutsche Zahlen (1.234,50), Einheiten als Wort, 19 % / 7 / steuerfrei / 0,19, unbekannte Einheit gemeldet, Preis und Satz geprüft, gleiche Artikelnummer doppelt`);
const c4 = csvLesen(CSV("katalog-komma-englisch.csv"), "katalog");
check(c4.ok && c4.ergebnis.map(x => `${x.eintrag.name}:${x.eintrag.einheit}:${x.eintrag.preis}:${x.eintrag.steuer}`).join() === "Consulting:HUR:1234.50:S19,Travel flat rate:LS:45.00:S19,Übersetzung:C62:0.50:S7", "Katalog, Komma, englische Kopfzeilen und Zahlen (\"1,234.50\", 0.19, 19%)");
check(csvLesen(new TextEncoder().encode("Ort;PLZ\nBerlin;10115\n"), "empfaenger").fehler === "keinName" && csvLesen(new Uint8Array(0), "katalog").fehler === "leer" && csvLesen(new TextEncoder().encode("\n\n;;\n"), "katalog").fehler === "leer",
  "ohne Spalte für den Namen oder leer: klare Meldung statt Übernahme");
check(trennzeichen('"a;b",c,d') === "," && trennzeichen("a\tb\tc") === "\t" && zerlegen('a;"b\r\nc";d\r\n\r\n', ";").length === 1 && einheitLesen("m²").code === "MTK" && einheitLesen("KWH").code === "KWH" && steuerLesen("", "S7") === "S7" && preisLesen("12,5 €", "de") === "12.50",
  "Trennzeichen außerhalb von Anführungszeichen gezählt, Zeilenumbruch im Feld, m² und Codes, Vorgabe-Steuersatz, € entfernt");
const neuK = [...c3.ergebnis.filter(x => x.status === "neu").map(x => x.eintrag), { name: "=SUMME(A1)", beschreibung: "", einheit: "C62", preis: "1.00", steuer: "S19", artikelnr: "" }];
const aus = csvSchreiben(neuK, "katalog", "de"), wieder = csvLesen(new TextEncoder().encode(aus), "katalog");
check(aus.startsWith("﻿Bezeichnung;Beschreibung;Einheit;Einzelpreis netto;Steuersatz;Artikelnummer\r\n") && aus.includes('"Jährliche Wartung; inkl. Abgasmessung"') && aus.includes("'=SUMME(A1)")
  && wieder.ergebnis.length === neuK.length && wieder.ergebnis.every((x, i) => x.status === "neu" && JSON.stringify(x.eintrag) === JSON.stringify(neuK[i])),
  "CSV schreiben: BOM, Semikolon, Anführungszeichen, keine Formeln; wieder eingelesen gleich (Rundlauf)");
const ae = csvSchreiben(c1.ergebnis.filter(x => x.status === "neu").map(x => x.eintrag), "empfaenger", "en"), aw = csvLesen(new TextEncoder().encode(ae), "empfaenger");
check(aw.ergebnis.length === 4 && aw.ergebnis.every((x, i) => JSON.stringify(x.eintrag) === JSON.stringify(c1.ergebnis.filter(y => y.status === "neu")[i].eintrag)), "Empfänger als CSV (englische Kopfzeilen) und zurück: gleich, auch mit Umbruch und Behörde");

if (args.includes("--nur-node")) { const { fails, oks } = ergebnis(); console.log(`\n${oks} Prüfungen bestanden, ${fails} fehlgeschlagen.`); process.exit(fails ? 1 : 0); }

// ---------- Fälle für den Rundlauf ----------
const DIM = {
  klein: [false, true], kennung: ["ustid", "stnr", "beide", "stnr+hr"], behoerde: [false, true], leistung: ["datum", "zeitraum"], positionen: [1, 2, 5, 25, 100],
  mix: ["S19", "S7", "S19+S7", "S+Z", "S+E", "E", "Z"], menge: ["1", "0,5", "0,001", "1.234,567"], preis: ["0", "0,01", "12,3456", "99.999,9999"],
  einheit: EINHEITEN_ERSTELLEN, text: ["normal", "sonder"], bic: [true, false], ziel: [0, 14, 30, 60], datum: ["2026-12-31", "2028-02-29"],
  art: ["rechnung", "abschlag", "dauer", "storno"], artikelnr: [false, true],
};
// Alle Paare: gierig je neuem Fall die Werte wählen, die die meisten noch offenen Paare abdecken (fester Ablauf, kein Zufall)
function paarweise(dim) {
  const namen = Object.keys(dim), offen = new Set();
  for (let a = 0; a < namen.length; a++) for (let b = a + 1; b < namen.length; b++) dim[namen[a]].forEach((_, i) => dim[namen[b]].forEach((_, j) => offen.add(`${a}:${i}|${b}:${j}`)));
  const faelle = [];
  while (offen.size) {
    const [erstes] = offen, [[a, i], [b, j]] = erstes.split("|").map(x => x.split(":").map(Number));
    const wahl = Array(namen.length).fill(null); wahl[a] = i; wahl[b] = j;
    for (let k = 0; k < namen.length; k++) {
      if (wahl[k] != null) continue;
      let best = 0, bestN = -1;
      dim[namen[k]].forEach((_, v) => {
        let n = 0;
        for (let q = 0; q < namen.length; q++) if (wahl[q] != null) n += offen.has(q < k ? `${q}:${wahl[q]}|${k}:${v}` : `${k}:${v}|${q}:${wahl[q]}`) ? 1 : 0;
        if (n > bestN) { bestN = n; best = v; }
      });
      wahl[k] = best;
    }
    for (let p = 0; p < namen.length; p++) for (let q = p + 1; q < namen.length; q++) offen.delete(`${p}:${wahl[p]}|${q}:${wahl[q]}`);
    faelle.push(Object.fromEntries(namen.map((n, k) => [n, dim[n][wahl[k]]])));
  }
  return faelle;
}
const SONDER = { name: "Müller & Söhne <Bau> \"Zitat\" 'eins' – Straße 😀\u0007", beschreibung: "Zeile 1\nZeile 2 mit ß, € & <b>", ort: "Köln-Mülheim" };
function fallBauen(f, nr, lang = "de") {
  const firma = kopie(FIRMA);
  firma.kleinunternehmer = f.klein;
  if (f.kennung === "ustid") { firma.steuernummer = ""; firma.register = ""; }
  if (f.kennung === "stnr") { firma.ustid = ""; firma.register = ""; }
  if (f.kennung === "beide") firma.register = "";
  if (f.kennung === "stnr+hr") firma.ustid = "";
  if (!f.bic) firma.bank.bic = "";
  if (f.text === "sonder") { firma.name = `${SONDER.name} GmbH`; firma.ort = SONDER.ort; }
  const r = RECHNUNG();
  r.sprache = lang;
  r.nummer = `T-${String(nr).padStart(5, "0")}`;
  r.datum = f.datum;
  r.zielTage = String(f.ziel);
  r.leistung = f.leistung === "zeitraum" ? { art: "zeitraum", von: `${f.datum.slice(0, 8)}01`, bis: f.datum } : { art: "datum", datum: f.datum };
  if (f.behoerde) Object.assign(r.empfaenger, { behoerde: true, referenz: "991-33333-44", email: nr % 2 ? "" : "poststelle@amt.example" });
  else if (nr % 3 === 0) r.empfaenger.referenz = `Bestellung ${nr}`;
  if (nr % 4 === 1) r.empfaenger.ustid = "DE822222222";
  if (f.text === "sonder") { r.empfaenger.name = SONDER.name; r.bemerkung = SONDER.beschreibung; r.zweck = "Rechnung & Co <1>"; }
  const kat = { S19: ["S19"], S7: ["S7"], "S19+S7": ["S19", "S7"], "S+Z": ["S19", "Z"], "S+E": ["S19", "E"], E: ["E"], Z: ["Z"] }[f.mix];
  const zahl = s => lang === "en" ? s.replace(/\./g, "#").replace(/,/g, ".").replace(/#/g, ",") : s;
  r.positionen = Array.from({ length: f.positionen }, (_, i) => ({
    name: f.text === "sonder" && i === 0 ? SONDER.name : `Leistung ${i + 1}`, beschreibung: f.text === "sonder" ? SONDER.beschreibung : i % 3 === 0 ? `Beschreibung ${i + 1}` : "",
    menge: zahl(f.mengen ? f.mengen[i % f.mengen.length] : f.menge), einheit: f.einheiten ? f.einheiten[i % f.einheiten.length] : f.einheit,
    preis: zahl(f.preise ? f.preise[i % f.preise.length] : f.preis), steuer: kat[i % kat.length],
  }));
  if (!f.klein && kat.includes("E")) { const b = BEFREIUNGEN[nr % BEFREIUNGEN.length]; r.befreiung = { wahl: b.id, text: b.text }; }
  if (kat.includes("Z")) r.nullsatz = true;
  if (f.text === "sonder" && !f.behoerde) r.empfaenger.referenz = "PO A&B 'Nord' <1> \"x\"";
  // Rechnungsarten: Abschlag mit Auftrag (BT-11), Dauer mit Laufzeit und Fälligkeit, Storno mit Bezug (BG-3); Artikelnummern (BT-155)
  r.art = f.art || "rechnung";
  r.bezug = r.art === "abschlag" ? (f.text === "sonder" ? SONDER.name : `Projekt ${nr}`) : "";
  r.storno = r.art === "storno" ? { nummer: f.text === "sonder" ? "RE/2026 – Nr. 7 & 8" : `ALT-${nr}`, datum: "2026-01-01" } : { nummer: "", datum: "" };
  r.dauer = { turnus: ["monat", "quartal", "jahr"][nr % 3], tag: String(1 + nr % 28) };
  if (r.art === "dauer") r.leistung = { art: "zeitraum", von: `${f.datum.slice(0, 4)}-01-01`, bis: f.datum };
  if (f.artikelnr) r.positionen.forEach((p, i) => { p.artikelnr = f.text === "sonder" && i === 0 ? "A&B <1> \"x\"" : `ART-${nr}-${i + 1}`; });
  let m = maskePruefen(firma, r, lang);
  if (m.some(x => x.text.includes("999.999.999") || x.text.includes("999,999,999"))) { r.positionen.forEach(p => { p.menge = "1"; }); m = maskePruefen(firma, r, lang); }
  return { firma, rechnung: r, maske: m, merkmale: f };
}
const faelle = paarweise(DIM).map((f, i) => ({ ...fallBauen(f, i + 1), gruppe: "paarweise" }));
const anzahlPaare = faelle.length;
const wahl = l => l[zz(l.length)];
for (let i = 0; i < ZUFALL; i++) {
  const f = Object.fromEntries(Object.entries(DIM).map(([k, v]) => [k, wahl(v)]));
  f.positionen = 1 + zz(i % 50 === 0 ? 60 : 8);
  f.mengen = Array.from({ length: 4 }, () => wahl([String(1 + zz(20)), `${zz(100)},${zz(1000)}`.replace(/^0,0+$/, "1"), `${zz(10)},${zz(10)}`.replace(/^0,0$/, "2"), "0,001", "1.000"]));
  f.preise = Array.from({ length: 4 }, () => wahl([String(zz(5000)), `${zz(1000)},${String(zz(10000)).padStart(4, "0")}`, `${zz(100)},${String(zz(100)).padStart(2, "0")}`, "0", "0,0049", "0,005"]));
  f.einheiten = Array.from({ length: 3 }, () => wahl(EINHEITEN_ERSTELLEN));
  f.datum = wahl(["2026-01-01", "2026-02-28", "2026-06-15", "2026-12-31", "2027-03-31", "2028-02-29"]);
  // Rechnungsart und Artikelnummern gleichmäßig verteilt (die unteren Bits des Zufallsgenerators wiederholen sich)
  f.art = DIM.art[i % 4]; f.artikelnr = (i >> 2) % 2 === 1;
  faelle.push({ ...fallBauen(f, anzahlPaare + i + 1, i % 5 === 4 ? "en" : "de"), gruppe: "zufall" });
}
// Feste Randfälle
const rand = (name, aendern) => { const firma = kopie(FIRMA), r = RECHNUNG(); r.nummer = `RAND-${name}`; aendern(firma, r); return { firma, rechnung: r, maske: maskePruefen(firma, r, r.sprache), gruppe: "rand", name }; };
faelle.push(
  rand("halbcent", (f, r) => { r.positionen = [{ name: "a", menge: "1", preis: "0,005", einheit: "C62", steuer: "S19" }, { name: "b", menge: "3", preis: "0,0050", einheit: "C62", steuer: "S19" }]; }),
  rand("steuer-halb", (f, r) => { r.positionen = [{ name: "a", menge: "1", preis: "0,50", einheit: "C62", steuer: "S7" }, { name: "b", menge: "1", preis: "2,50", einheit: "C62", steuer: "S19" }]; }),
  rand("maximum", (f, r) => { r.positionen = [{ name: "a", menge: "1", preis: "934.579.439,24", einheit: "LS", steuer: "S7" }]; }),
  rand("null", (f, r) => { r.positionen = [{ name: "gratis", menge: "1", preis: "0", einheit: "C62", steuer: "S19" }]; }),
  rand("klein-nur-stnr", (f, r) => { f.kleinunternehmer = true; f.ustid = ""; f.register = ""; f.bank.bic = ""; }),
  rand("behoerde-fein", (f, r) => { Object.assign(r.empfaenger, { behoerde: true, referenz: "04011000-1234512345-06", email: "" }); }),
  rand("ausland", (f, r) => { Object.assign(r.empfaenger, { land: "AT", plz: "1010", ort: "Wien", ustid: "ATU12345678" }); }),
  rand("eigener-grund", (f, r) => { r.positionen[0].steuer = "E"; r.befreiung = { wahl: "eigen", text: "Steuerfrei nach § 4 Nr. 20 UStG (Theater)" }; }),
  rand("handelsname-gleich", (f, r) => { f.handelsname = f.name; }),
  rand("lange-texte", (f, r) => { r.positionen[0].name = "x".repeat(400); r.bemerkung = "Bemerkung ".repeat(200); r.zweck = "z".repeat(140); }),
  rand("nummer-sonder", (f, r) => { r.nummer = "RE/2026 – Nr. 7 & 8"; }),
  rand("englisch", (f, r) => { r.sprache = "en"; r.positionen[0].menge = "1,234.5"; r.positionen[0].preis = "0.0125"; }),
  rand("schaltjahr", (f, r) => { r.datum = "2028-02-29"; r.zielTage = "365"; r.leistung = { art: "zeitraum", von: "2028-02-01", bis: "2028-02-29" }; }),
  rand("storno-behoerde", (f, r) => { Object.assign(r, { art: "storno", storno: { nummer: "KH-2026-0006", datum: "2026-11-01" } }); Object.assign(r.empfaenger, { behoerde: true, referenz: "991-33333-44", email: "" }); }),
  rand("storno-klein-zeitraum", (f, r) => { f.kleinunternehmer = true; f.ustid = ""; Object.assign(r, { art: "storno", storno: { nummer: "KH-1", datum: "2026-11-09" }, leistung: { art: "zeitraum", von: "2026-10-01", bis: "2026-10-31" } }); }),
  rand("storno-null", (f, r) => { Object.assign(r, { art: "storno", storno: { nummer: "KH-2", datum: "2026-10-01" } }); r.positionen[0].preis = "0"; }),
  rand("dauer-jahr-ein-termin", (f, r) => { Object.assign(r, { art: "dauer", dauer: { turnus: "jahr", tag: "28" }, leistung: { art: "zeitraum", von: "2027-01-01", bis: "2027-12-31" } }); }),
  rand("dauer-quartal-englisch", (f, r) => { Object.assign(r, { sprache: "en", art: "dauer", dauer: { turnus: "quartal", tag: "15" }, leistung: { art: "zeitraum", von: "2027-02-10", bis: "2029-02-09" } }); r.positionen[0].menge = "2.5"; r.positionen[0].preis = "72.00"; }),
  rand("abschlag-behoerde-befreit", (f, r) => { Object.assign(r, { art: "abschlag", bezug: "Vergabe 2026/17 – Los 2" }); Object.assign(r.empfaenger, { behoerde: true, referenz: "04011000-1234512345-06", email: "" }); r.positionen[0].steuer = "E"; r.befreiung = { wahl: "4-21", text: BEFREIUNGEN.find(b => b.id === "4-21").text }; }),
  rand("artikelnummer-lang", (f, r) => { r.positionen[0].artikelnr = "X".repeat(60); }),
  rand("hundert-gemischt", (f, r) => { r.positionen = Array.from({ length: 100 }, (_, i) => ({ name: `P${i}`, menge: `${i + 1},5`, preis: `${i},99`, einheit: EINHEITEN_ERSTELLEN[i % 13], steuer: ["S19", "S7", "Z"][i % 3] })); r.nullsatz = true; }),
);
const ungueltig = faelle.filter(f => f.maske.length);
check(!ungueltig.length, `alle ${faelle.length} Fälle bestehen die Maske (${ungueltig.slice(0, 2).map(f => JSON.stringify(f.maske)).join(" | ")})`);

// ---------- Rundlauf im Browser ----------
rmSync(ORDNER, { recursive: true, force: true });
mkdirSync(ORDNER, { recursive: true });
const req = createRequire(join(WZ, "package.json"));
const esbuild = await import(req.resolve("esbuild"));
const harnisch = await esbuild.build({ stdin: { contents: `import { dateiLesen } from "./lesen.js"; import { zahlung } from "./girocode.js"; window.RVTest = { dateiLesen, zahlung };`, resolveDir: join(WZ, "src"), loader: "js" },
  bundle: true, write: false, format: "iife", loader: { ".json": "json", ".ts": "ts" }, logLevel: "warning" });
const harnisch2 = await esbuild.build({ stdin: { contents: `import { rechnungAusDaten } from "./vorlage.js"; window.RVVorlage = { rechnungAusDaten };`, resolveDir: join(WZ, "src"), loader: "js" },
  bundle: true, write: false, format: "iife", loader: { ".json": "json", ".ts": "ts" }, logLevel: "warning" });
const srv = await server({ "/__erstellen__.js": { typ: "text/javascript; charset=utf-8", inhalt: harnisch.outputFiles[0].text }, "/__vorlage__.js": { typ: "text/javascript; charset=utf-8", inhalt: harnisch2.outputFiles[0].text } });
const browser = await chrome();
const page = await browser.newPage();
const fremd = [];
page.on("request", r => { if (!r.url().startsWith(srv.url)) fremd.push(r.url()); });
await page.goto(`${srv.url}/__pruefkern__.html`);
await page.addScriptTag({ url: "/__erstellen__.js" });
await page.addScriptTag({ url: "/__vorlage__.js" });
await page.waitForFunction(() => !!window.RVPruefung && !!window.RVTest && !!window.RVVorlage);
await page.evaluate(() => {
  const saetze = {};
  const stufe = (b, st) => { const s = st && st[b.id]; if (s) return s === "error" ? "fehler" : s === "warning" ? "warnung" : "hinweis"; return b.flag === "warning" ? "warnung" : b.flag === "information" || b.flag === "info" ? "hinweis" : "fehler"; };
  window.__rundlauf = async (name, xml, lang) => {
    const e = await window.RVTest.dateiLesen(new File([xml], name, { type: "application/xml" }));
    if (e.art !== "rechnung") return { art: e.art };
    const out = { art: e.art, szenario: e.format.szenario, saetze: e.format.saetze, befunde: [], fehler: [] };
    for (const s of e.format.saetze) {
      saetze[s] ||= fetch(`/assets/erechnung/regeln/${s}.json`).then(r => r.json()).then(d => window.RVPruefung.vorbereiten(d, window.RVPruefung.fx, s));
      const { befunde, fehler } = await window.RVPruefung.pruefen(window.RVPruefung.fx, e.doc, await saetze[s]);
      out.befunde.push(...befunde.map(b => [s, b.id, b.flag, stufe(b, e.format.stufen)]));
      out.fehler.push(...fehler.map(f => String(f.meldung).slice(0, 160)));
    }
    const d = e.daten;
    out.daten = { nummer: d.nummer, datum: d.datum, faellig: d.faellig, referenz: d.referenz, summen: d.summen, steuern: d.steuern.map(x => [x.kategorie, x.satz, x.basis, x.betrag, x.grund]),
      positionen: d.positionen.map(p => [p.name, p.menge, p.einheit, p.preis.netto, p.netto, p.kategorie, p.satz, p.beschreibung]), verkaeufer: d.verkaeufer.name, kaeufer: d.kaeufer.name,
      kaeuferAdresse: d.kaeufer.elektronisch, notizen: d.notizen, zweck: d.zahlung[0] && d.zahlung[0].zweck, zeitraum: d.zeitraum, lieferung: d.lieferung && d.lieferung.datum,
      art: d.art, cn: d.gutschriftDokument, projekt: d.projekt, vorherige: d.vorherige, bedingungen: d.bedingungen, faelligAm: d.faellig, artikelnr: d.positionen.map(p => p.artikelnr) };
    // Zurück in die Maske (Vorlage für Folge- und Stornorechnung)
    out.vorlage = window.RVVorlage.rechnungAusDaten(d, lang);
    const z = window.RVTest.zahlung({ ...d, sprache: lang });
    out.giro = { nutzlast: z.nutzlast, grund: z.grund };
    return out;
  };
});
// Was nach dem Einlesen herauskommen muss (Text wie lesen.js: textContent, getrimmt)
const rein = s => String(s ?? "").normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F￾￿]/g, "").replace(/\r\n?/g, "\n").trim();
const zahlGleich = (n, cent) => n != null && n.toFixed(2) === betragText(cent);
function vergleichen(fall, w) {
  const f = fall.firma, r = fall.rechnung, s = summen(r, f, r.sprache), d = w.daten, abw = [];
  const soll = (ok, was) => { if (!ok) abw.push(was); };
  soll(d.nummer === rein(r.nummer) && d.datum === r.datum, "Nummer/Datum");
  soll(zahlGleich(d.summen.positionen, s.positionen) && zahlGleich(d.summen.netto, s.netto) && zahlGleich(d.summen.steuer, s.steuer) && zahlGleich(d.summen.brutto, s.brutto) && zahlGleich(d.summen.zahlbetrag, s.zahlbetrag), "Summen");
  soll(d.steuern.length === s.gruppen.length && s.gruppen.every((g, i) => d.steuern[i][0] === g.kategorie && d.steuern[i][1] === Number(g.satz) && zahlGleich(d.steuern[i][2], g.basis) && zahlGleich(d.steuern[i][3], g.steuer)
    && (g.kategorie === "E" ? d.steuern[i][4] === rein(f.kleinunternehmer ? "Kleinunternehmer gemäß § 19 UStG" : r.befreiung.text) : !d.steuern[i][4])), "Steuern");
  soll(d.positionen.length === r.positionen.length && r.positionen.every((p, i) => { const q = d.positionen[i], z = s.zeilen[i];
    return q[0] === rein(p.name) && q[1] === Number(mengeText(z.menge)) && q[2] === p.einheit && q[3] === Number(preisText(z.preis)) && zahlGleich(q[4], z.netto) && q[5] === z.kategorie && q[6] === Number(z.satz) && q[7] === rein(p.beschreibung); }), "Positionen");
  soll(d.verkaeufer === rein(f.name) && d.kaeufer === rein(r.empfaenger.name), "Parteien");
  const art = r.art || "rechnung", gs = art === "storno";
  soll(gs ? !d.zweck : d.zweck === (rein(r.zweck) || rein(`Rechnung ${r.nummer}`)), "Verwendungszweck");
  soll(r.empfaenger.behoerde ? d.kaeuferAdresse.schema === "0204" && d.referenz === r.empfaenger.referenz : d.kaeuferAdresse.schema === "EM", "Adresse des Empfängers");
  soll(d.referenz === (rein(r.empfaenger.referenz) || OHNE_REFERENZ[r.sprache || "de"]), "Käuferreferenz");
  soll(r.leistung.art === "zeitraum" || art === "dauer" ? d.zeitraum && d.zeitraum.von === r.leistung.von && d.zeitraum.bis === r.leistung.bis && !d.lieferung : d.lieferung === r.leistung.datum && !d.zeitraum, "Leistung");
  soll(gs ? w.giro.grund === "gutschrift-dokument" && !w.giro.nutzlast : s.zahlbetrag > 0n ? !!w.giro.nutzlast && w.giro.nutzlast.includes(`EUR${betragText(s.zahlbetrag)}`) : w.giro.grund === "nichts-zu-zahlen", `GiroCode (${w.giro.grund})`);
  soll(d.art === ART_CODE[art] && !!d.cn === gs, `Rechnungsart ${d.art}`);
  soll(art === "abschlag" ? d.projekt === rein(r.bezug) && d.notizen[0] === rein(`Abschlagsrechnung zu ${r.bezug}. Der Betrag wird in der Schlussrechnung angerechnet.`) : !d.projekt, "Abschlag: Projekt und Hinweis");
  soll(gs ? d.vorherige.length === 1 && d.vorherige[0].nummer === rein(r.storno.nummer) && d.vorherige[0].datum === r.storno.datum && d.bedingungen === "Ein bereits gezahlter Betrag wird erstattet." && !d.faelligAm : !d.vorherige.length, "Storno: Bezug BG-3");
  if (art === "dauer") { const t = dauerTexte(r, s.zahlbetrag); soll(d.notizen[0] === t.hinweis && d.bedingungen === t.zahlung && d.faelligAm === t.erste && t.zahlung.length > 0, "Dauer: Hinweis, Fälligkeiten"); }
  soll(r.positionen.every((p, i) => (d.artikelnr[i] || "") === rein(p.artikelnr || "")), "Artikelnummern");
  // Rundlauf in die Maske: dieselben Angaben wie vorher (Vorlage für Folge- und Stornorechnung)
  const v = w.vorlage.rechnung, lang = r.sprache || "de";
  const zahlGl = (a, b, st) => dezimalLesen(a, lang, st) === dezimalLesen(b, lang, st);
  soll(!w.vorlage.hinweise.length && v.art === art && v.nummer === rein(r.nummer) && (art !== "abschlag" || v.bezug === rein(r.bezug)) && (!gs || (v.storno.nummer === rein(r.storno.nummer) && v.storno.datum === r.storno.datum))
    && (art !== "dauer" || (v.dauer.turnus === r.dauer.turnus && v.dauer.tag === r.dauer.tag)), `Vorlage: Art und Bezug (${v.art})`);
  soll(["name", "strasse", "plz", "ort", "land", "behoerde"].every(k => String(v.empfaenger[k]) === rein(String(r.empfaenger[k] ?? (k === "land" ? "DE" : ""))))
    && v.empfaenger.referenz === rein(r.empfaenger.referenz) && (r.empfaenger.behoerde && !r.empfaenger.email ? true : v.empfaenger.email === rein(r.empfaenger.email)), "Vorlage: Empfänger");
  soll(v.positionen.length === r.positionen.length && r.positionen.every((p, i) => { const q = v.positionen[i];
    return q.name === rein(p.name).slice(0, 400) && q.beschreibung === rein(p.beschreibung) && zahlGl(q.menge, p.menge, 3) && zahlGl(q.preis, p.preis, 4) && q.einheit === p.einheit && q.steuer === (f.kleinunternehmer ? "E" : p.steuer) && q.artikelnr === rein(p.artikelnr || ""); }), "Vorlage: Positionen");
  soll(gs || art === "dauer" || v.zielTage === String(+r.zielTage), "Vorlage: Zahlungsziel");
  return abw;
}
// Namentliche Ausnahmen: Meldungen, die bei bestimmten Fällen erlaubt sind (derzeit keine)
const AUSNAHMEN = {};
const zahlen = { dateien: 0, fehler: 0, warnungen: 0, hinweise: 0, auswertung: 0, abweichungen: 0, szenario: 0, gruppen: {}, arten: {}, mitArtikelnr: 0 };
const probleme = [], manifest = [];
const t0 = Date.now();
for (let i = 0; i < faelle.length; i++) {
  const fall = faelle[i];
  const xml = ublSchreiben(fall.firma, fall.rechnung);
  const datei = `${String(i + 1).padStart(5, "0")}-${fall.gruppe}${fall.name ? "-" + fall.name : ""}.xml`;
  writeFileSync(join(ORDNER, datei), xml);
  const w = await page.evaluate(([n, x, l]) => window.__rundlauf(n, x, l), [datei, xml, fall.rechnung.sprache || "de"]);
  zahlen.dateien++;
  const g = zahlen.gruppen[fall.gruppe] ||= { dateien: 0, probleme: 0 };
  g.dateien++;
  const erlaubt = AUSNAHMEN[fall.name] || [];
  const zaehle = st => (w.befunde || []).filter(b => b[3] === st && !erlaubt.includes(b[1]));
  const fe = zaehle("fehler"), wa = zaehle("warnung"), hi = zaehle("hinweis");
  const abw = w.daten ? vergleichen(fall, w) : ["nicht gelesen"];
  const szOk = w.szenario === (fall.rechnung.art === "storno" ? "EN16931 XRechnung (UBL CreditNote)" : "EN16931 XRechnung (UBL Invoice)") && (w.saetze || []).join() === "en16931-ubl,xrechnung-ubl";
  zahlen.fehler += fe.length; zahlen.warnungen += wa.length; zahlen.hinweise += hi.length; zahlen.auswertung += (w.fehler || []).length; zahlen.abweichungen += abw.length; zahlen.szenario += szOk ? 0 : 1;
  if (fe.length || wa.length || hi.length || (w.fehler || []).length || abw.length || !szOk) { g.probleme++; probleme.push({ datei, befunde: [...fe, ...wa, ...hi].map(b => b[1]), auswertung: (w.fehler || []).slice(0, 2), abweichungen: abw, szenario: w.szenario }); }
  manifest.push({ datei, gruppe: fall.gruppe, art: fall.rechnung.art || "rechnung", saetze: w.saetze || [], befunde: (w.befunde || []).map(b => [b[0], b[1], b[2]]).sort(), merkmale: fall.merkmale || null });
  zahlen.arten[fall.rechnung.art || "rechnung"] = (zahlen.arten[fall.rechnung.art || "rechnung"] || 0) + 1;
  if (fall.rechnung.positionen.some(p => p.artikelnr)) zahlen.mitArtikelnr++;
  if ((i + 1) % 100 === 0 || i === faelle.length - 1) process.stdout.write(`\r  ${i + 1} / ${faelle.length} Rechnungen, Probleme: ${probleme.length}   `);
}
console.log("");
await browser.close();
await srv.schliessen();
writeFileSync(join(ORDNER, "manifest.json"), JSON.stringify(manifest));
const sek = Math.round((Date.now() - t0) / 1000);
console.log(`\nRundlauf: ${zahlen.dateien} Rechnungen (${anzahlPaare} paarweise, ${zahlen.gruppen.zufall?.dateien || 0} Zufall, ${zahlen.gruppen.rand?.dateien || 0} Randfälle), ${sek} s`);
console.log(`  Arten: ${Object.entries(zahlen.arten).map(([k, v]) => `${k} ${v}`).join(", ")}; mit Artikelnummern: ${zahlen.mitArtikelnr}`);
const mindest = Math.min(100, Math.floor(ZUFALL / 20));
check(["rechnung", "abschlag", "dauer", "storno"].every(a => zahlen.arten[a] >= mindest) && zahlen.mitArtikelnr >= mindest, `jede Rechnungsart und Artikelnummern mit mindestens ${mindest} Dateien im Rundlauf`);
check(zahlen.szenario === 0, `jede Datei läuft als Szenario „EN16931 XRechnung (UBL Invoice)“ bzw. „(UBL CreditNote)“ mit en16931-ubl und xrechnung-ubl (${zahlen.szenario} abweichend)`);
check(zahlen.fehler === 0 && zahlen.auswertung === 0, `0 Fehler und 0 Auswertungsfehler (${zahlen.fehler} / ${zahlen.auswertung})`);
check(zahlen.warnungen === 0 && zahlen.hinweise === 0, `0 Warnungen und 0 Hinweise (${zahlen.warnungen} / ${zahlen.hinweise})`);
check(zahlen.abweichungen === 0, `gelesene Daten gleich dem Modell: Summen, Steuern, Positionen, Parteien, Zweck, Leistung, GiroCode (${zahlen.abweichungen} Abweichungen)`);
check(!fremd.length, `keine Anfrage an fremde Hosts (${fremd.length})`);
for (const p of probleme.slice(0, 8)) console.log("  PROBLEM", JSON.stringify(p).slice(0, 400));

// ---------- Referenz wie der Validator der KoSIT: XSD + Schematron (saxonche, lxml) ----------
const PY = process.env.ERECHNUNG_PYTHON || join(WZ, ".cache", "venv", "bin", "python");
if (existsSync(PY)) {
  console.log("\nReferenz (XSD mit lxml, Schematron mit saxonche)");
  try {
    const aus = execFileSync(PY, ["-I", join(WZ, "..", "..", "tests", "erechnung_erstellen_referenz.py")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
    const r = JSON.parse(aus.trim().split("\n").pop());
    check(r.dateien === manifest.length && r.xsdUngueltig === 0, `XSD (UBL-Invoice-2.1.xsd und UBL-CreditNote-2.1.xsd der KoSIT-Konfiguration): ${r.dateien - r.xsdUngueltig} von ${r.dateien} gültig ${(r.xsdBeispiele || []).join(" | ")}`);
    check(r.abweichungen === 0 && r.abbrueche === 0, `Schematron mit Saxon: Befunde gleich dem eigenen Kern bei allen ${r.dateien} Dateien (${r.abweichungen} Abweichungen, ${r.abbrueche} Abbrüche, ${r.befunde} Meldungen der Referenz) ${(r.beispiele || []).join(" | ")}`);
  } catch (e) { check(false, `Referenz lief nicht: ${String(e.stderr || e.message).slice(0, 400)}`); }
} else console.log(`\n  –    Referenz übersprungen: keine Python-Umgebung mit saxonche und lxml (${PY})`);

const { fails, oks } = ergebnis();
writeFileSync(join(ORDNER, "bericht.json"), JSON.stringify({ ...zahlen, paarweise: anzahlPaare, sekunden: sek, probleme: probleme.slice(0, 100), ok: oks, fehlgeschlagen: fails }, null, 1));
console.log(`\n${oks} Prüfungen bestanden, ${fails} fehlgeschlagen.`);
process.exit(fails ? 1 : 0);
