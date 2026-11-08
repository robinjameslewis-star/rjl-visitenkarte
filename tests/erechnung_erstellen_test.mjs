// SmartFormular E-Rechnung lite, „Erstellen“: Rechnen, Maske, Nummern und XML-Text in Node; danach der Rundlauf im echten Chrome:
// Rechnungen aller Paare der wichtigen Merkmale (pairwise), rund 2.000 Zufallsfälle mit festem Startwert und feste Randfälle werden
// mit ublSchreiben erzeugt, auf derselben Lesestrecke wie beim Prüfen eingelesen (lesen.js) und mit dem ausgelieferten Prüfkern
// (assets/erechnung/pruefung.js, Regeln assets/erechnung/regeln/) geprüft. Erwartet je Datei: Szenario XRechnung (UBL Invoice),
// 0 Fehler, 0 Auswertungsfehler, 0 Warnungen; die gelesenen Daten stimmen mit dem Modell überein, der GiroCode ist gesetzt.
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
import { ublSchreiben, xmlText, KENNUNG, PROZESS, dateiName } from "../tools/erechnung/src/erzeugen.js";
import { maskePruefen, naechsteNummer, speichernErlaubt } from "../tools/erechnung/src/maske.js";
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

if (args.includes("--nur-node")) { const { fails, oks } = ergebnis(); console.log(`\n${oks} Prüfungen bestanden, ${fails} fehlgeschlagen.`); process.exit(fails ? 1 : 0); }

// ---------- Fälle für den Rundlauf ----------
const DIM = {
  klein: [false, true], kennung: ["ustid", "stnr", "beide", "stnr+hr"], behoerde: [false, true], leistung: ["datum", "zeitraum"], positionen: [1, 2, 5, 25, 100],
  mix: ["S19", "S7", "S19+S7", "S+Z", "S+E", "E", "Z"], menge: ["1", "0,5", "0,001", "1.234,567"], preis: ["0", "0,01", "12,3456", "99.999,9999"],
  einheit: EINHEITEN_ERSTELLEN, text: ["normal", "sonder"], bic: [true, false], ziel: [0, 14, 30, 60], datum: ["2026-12-31", "2028-02-29"],
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
  rand("hundert-gemischt", (f, r) => { r.positionen = Array.from({ length: 100 }, (_, i) => ({ name: `P${i}`, menge: `${i + 1},5`, preis: `${i},99`, einheit: EINHEITEN_ERSTELLEN[i % 13], steuer: ["S19", "S7", "Z"][i % 3] })); }),
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
const srv = await server({ "/__erstellen__.js": { typ: "text/javascript; charset=utf-8", inhalt: harnisch.outputFiles[0].text } });
const browser = await chrome();
const page = await browser.newPage();
const fremd = [];
page.on("request", r => { if (!r.url().startsWith(srv.url)) fremd.push(r.url()); });
await page.goto(`${srv.url}/__pruefkern__.html`);
await page.addScriptTag({ url: "/__erstellen__.js" });
await page.waitForFunction(() => !!window.RVPruefung && !!window.RVTest);
await page.evaluate(() => {
  const saetze = {};
  const stufe = (b, st) => { const s = st && st[b.id]; if (s) return s === "error" ? "fehler" : s === "warning" ? "warnung" : "hinweis"; return b.flag === "warning" ? "warnung" : b.flag === "information" || b.flag === "info" ? "hinweis" : "fehler"; };
  window.__rundlauf = async (name, xml) => {
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
      kaeuferAdresse: d.kaeufer.elektronisch, notizen: d.notizen, zweck: d.zahlung[0] && d.zahlung[0].zweck, zeitraum: d.zeitraum, lieferung: d.lieferung && d.lieferung.datum };
    const z = window.RVTest.zahlung(d);
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
  soll(d.zweck === (rein(r.zweck) || rein(`Rechnung ${r.nummer}`)), "Verwendungszweck");
  soll(r.empfaenger.behoerde ? d.kaeuferAdresse.schema === "0204" && d.referenz === r.empfaenger.referenz : d.kaeuferAdresse.schema === "EM", "Adresse des Empfängers");
  soll(r.leistung.art === "zeitraum" ? d.zeitraum && d.zeitraum.von === r.leistung.von && !d.lieferung : d.lieferung === r.leistung.datum && !d.zeitraum, "Leistung");
  soll(s.zahlbetrag > 0n ? !!w.giro.nutzlast && w.giro.nutzlast.includes(`EUR${betragText(s.zahlbetrag)}`) : w.giro.grund === "nichts-zu-zahlen", `GiroCode (${w.giro.grund})`);
  return abw;
}
// Namentliche Ausnahmen: Meldungen, die bei bestimmten Fällen erlaubt sind (derzeit keine)
const AUSNAHMEN = {};
const zahlen = { dateien: 0, fehler: 0, warnungen: 0, hinweise: 0, auswertung: 0, abweichungen: 0, szenario: 0, gruppen: {} };
const probleme = [], manifest = [];
const t0 = Date.now();
for (let i = 0; i < faelle.length; i++) {
  const fall = faelle[i];
  const xml = ublSchreiben(fall.firma, fall.rechnung);
  const datei = `${String(i + 1).padStart(5, "0")}-${fall.gruppe}${fall.name ? "-" + fall.name : ""}.xml`;
  writeFileSync(join(ORDNER, datei), xml);
  const w = await page.evaluate(([n, x]) => window.__rundlauf(n, x), [datei, xml]);
  zahlen.dateien++;
  const g = zahlen.gruppen[fall.gruppe] ||= { dateien: 0, probleme: 0 };
  g.dateien++;
  const erlaubt = AUSNAHMEN[fall.name] || [];
  const zaehle = st => (w.befunde || []).filter(b => b[3] === st && !erlaubt.includes(b[1]));
  const fe = zaehle("fehler"), wa = zaehle("warnung"), hi = zaehle("hinweis");
  const abw = w.daten ? vergleichen(fall, w) : ["nicht gelesen"];
  const szOk = w.szenario === "EN16931 XRechnung (UBL Invoice)" && (w.saetze || []).join() === "en16931-ubl,xrechnung-ubl";
  zahlen.fehler += fe.length; zahlen.warnungen += wa.length; zahlen.hinweise += hi.length; zahlen.auswertung += (w.fehler || []).length; zahlen.abweichungen += abw.length; zahlen.szenario += szOk ? 0 : 1;
  if (fe.length || wa.length || hi.length || (w.fehler || []).length || abw.length || !szOk) { g.probleme++; probleme.push({ datei, befunde: [...fe, ...wa, ...hi].map(b => b[1]), auswertung: (w.fehler || []).slice(0, 2), abweichungen: abw, szenario: w.szenario }); }
  manifest.push({ datei, gruppe: fall.gruppe, saetze: w.saetze || [], befunde: (w.befunde || []).map(b => [b[0], b[1], b[2]]).sort(), merkmale: fall.merkmale || null });
  if ((i + 1) % 100 === 0 || i === faelle.length - 1) process.stdout.write(`\r  ${i + 1} / ${faelle.length} Rechnungen, Probleme: ${probleme.length}   `);
}
console.log("");
await browser.close();
await srv.schliessen();
writeFileSync(join(ORDNER, "manifest.json"), JSON.stringify(manifest));
const sek = Math.round((Date.now() - t0) / 1000);
console.log(`\nRundlauf: ${zahlen.dateien} Rechnungen (${anzahlPaare} paarweise, ${zahlen.gruppen.zufall?.dateien || 0} Zufall, ${zahlen.gruppen.rand?.dateien || 0} Randfälle), ${sek} s`);
check(zahlen.szenario === 0, `jede Datei läuft als Szenario „EN16931 XRechnung (UBL Invoice)“ mit en16931-ubl und xrechnung-ubl (${zahlen.szenario} abweichend)`);
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
    check(r.dateien === manifest.length && r.xsdUngueltig === 0, `XSD (UBL-Invoice-2.1.xsd der KoSIT-Konfiguration): ${r.dateien - r.xsdUngueltig} von ${r.dateien} gültig ${(r.xsdBeispiele || []).join(" | ")}`);
    check(r.abweichungen === 0 && r.abbrueche === 0, `Schematron mit Saxon: Befunde gleich dem eigenen Kern bei allen ${r.dateien} Dateien (${r.abweichungen} Abweichungen, ${r.abbrueche} Abbrüche, ${r.befunde} Meldungen der Referenz) ${(r.beispiele || []).join(" | ")}`);
  } catch (e) { check(false, `Referenz lief nicht: ${String(e.stderr || e.message).slice(0, 400)}`); }
} else console.log(`\n  –    Referenz übersprungen: keine Python-Umgebung mit saxonche und lxml (${PY})`);

const { fails, oks } = ergebnis();
writeFileSync(join(ORDNER, "bericht.json"), JSON.stringify({ ...zahlen, paarweise: anzahlPaare, sekunden: sek, probleme: probleme.slice(0, 100), ok: oks, fehlgeschlagen: fails }, null, 1));
console.log(`\n${oks} Prüfungen bestanden, ${fails} fehlgeschlagen.`);
process.exit(fails ? 1 : 0);
