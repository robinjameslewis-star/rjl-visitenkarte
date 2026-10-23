// Abnahme 2–4 für SmartFormular E-Rechnung lite: Kundenreisen in echtem Chrome (playwright-core, Kanal „chrome“) auf Desktop
// (1280 × 900) und Handy (390 × 844, Touch), jede mit geprüftem Ziel; dazu Datenschutz (alle Anfragen mitgeschrieben), die
// Datei zum Herunterladen ohne Netz, axe-core und Bedienung nur mit der Tastatur. Bildschirmfotos und Druck-PDF landen im Ordner.
//   a) Kanzlei: XRechnung eines Mandanten lesen, drucken, Befunde verstehen, Prüfbericht speichern
//   b) Handwerksbetrieb: ZUGFeRD-PDF – E-Rechnung ja oder nein, bezahlen per GiroCode (QR-Code wird gelesen und geprüft)
//   c) Kleinunternehmerin: eigene Rechnung vor dem Versand prüfen, weiß danach, was zu ändern ist
//   d) Fehlerfälle: falsche, kaputte und große Datei, zehn Dateien auf einmal, Gutschrift, Fremdwährung
// Testdaten: erfunden (tests/erechnung/daten, tools/erechnung/beispiele). Lokal gegen einen statischen Server für das Repository;
// nach dem Pages-Deploy mit --basis https://robin.vision gegen die Website (die Datei ohne Netz wird dann lokal geprüft).
//   node tests/erechnung_reisen_test.mjs [--basis https://robin.vision] [ordner]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { WURZEL, WZ, server, chrome, check, ergebnis, axePfad } from "./erechnung/hilfen.mjs";

const args = process.argv.slice(2);
const basisArg = args.includes("--basis") ? args[args.indexOf("--basis") + 1] : null;
const ORDNER = args.find(a => !a.startsWith("--") && a !== basisArg) || join(WZ, ".cache", "reisen");
mkdirSync(ORDNER, { recursive: true });
const DATEN = join(WURZEL, "tests", "erechnung", "daten"), BSP = join(WZ, "beispiele");
const d = n => join(DATEN, n), b = n => join(BSP, n);
const srv = basisArg ? null : await server();
const BASIS = (basisArg || srv.url).replace(/\/$/, "");
const HOST = new URL(BASIS).origin;
const SEITE = { de: `${BASIS}/werkzeuge/e-rechnung-pruefen/`, en: `${BASIS}/werkzeuge/e-invoice-viewer/` };
const OFFLINE = { de: join(WURZEL, "werkzeuge", "e-rechnung-pruefen", "E-Rechnung-lite.html"), en: join(WURZEL, "werkzeuge", "e-invoice-viewer", "E-Invoice-Viewer.html") };
const GERAETE = {
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  handy: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36" },
};
// Was nie in einer Anfrage stehen darf: Namen, Nummern, IBANs und Dateinamen aus den Testrechnungen
const GEHEIM = ["DE89370400440532013000", "DE89370400440532013001", "DE02120300000000202051", "2026-1047", "2026-1048", "RE-2026-0318", "RE-2026-0319", "GS-2026-0009", "2026-017",
  "Malerbetrieb", "Holzwerk", "Hartmann", "Sonnenkorn", "Lena", "Sommer", "Morgenrot", "kleinunternehmerin", "gutschrift", "fremdwaehrung", "abgeschnitten", "bestellung", "foto.jpg", "ohne-xml", "minimum.pdf", "gross-"];
const t0 = Date.now();
const browser = await chrome();
const anfragen = [];
const zahlen = { reisen: 0, ziele: 0, fotos: 0, axe: [], tasten: 0 };
const foto = async (p, name, opt = {}) => { await p.screenshot({ path: join(ORDNER, `${name}.png`), ...opt }); zahlen.fotos++; };

async function kontext(geraet, extra = {}) {
  const c = await browser.newContext({ ...GERAETE[geraet], locale: "de-DE", timezoneId: "Europe/Berlin", acceptDownloads: true, ...extra });
  c.on("request", r => anfragen.push({ url: r.url(), methode: r.method(), art: r.resourceType(), daten: r.postData() || "", geraet }));
  return c;
}
async function oeffnen(c, ziel) {
  const p = await c.newPage();
  const fehler = [];
  p.on("pageerror", e => fehler.push(String(e)));
  p.on("console", m => { if (m.type() === "error") fehler.push(m.text()); });
  p.on("websocket", w => anfragen.push({ url: w.url(), methode: "WS", art: "websocket" }));
  await p.goto(ziel, { waitUntil: "load" });
  await p.waitForSelector("#erechnung .ewz-start");
  p.fehler = fehler;
  return p;
}
const fertig = (p, n) => p.waitForFunction(n => window.RVErechnung.eintraege.length >= n && window.RVErechnung.eintraege.every(e => !["offen", "laeuft"].includes(e.pruefung.status)), n, { timeout: 180000, polling: 200 });
async function laden(p, dateien) {
  const liste = Array.isArray(dateien) ? dateien : [dateien];
  const vorher = await p.evaluate(() => window.RVErechnung.eintraege.length);
  await p.setInputFiles("#ewz-datei", liste);
  await fertig(p, vorher + liste.length);
}
const karte = (p, name) => p.locator(".ewz-karte", { has: p.locator(".ewz-dateiname", { hasText: name }) }).last();
const text = async l => (await l.innerText()).replace(/\s+/g, " ");
const druckAbfangen = p => p.evaluate(() => { window.__druck = 0; window.print = () => { window.__druck++; }; });
// GiroCode lesen wie eine Banking-App: Bild des QR-Codes aufnehmen und mit jsQR (Apache 2.0) auf einer leeren Seite entschlüsseln
const JSQR = readFileSync(createRequire(join(WZ, "package.json")).resolve("jsqr/dist/jsQR.js"), "utf8");
async function qrLesen(bild) {
  const c = await browser.newContext();
  const p = await c.newPage();
  await p.setContent(`<script>${JSQR}</script>`);
  const inhalt = await p.evaluate(async b64 => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext("2d"); g.drawImage(img, 0, 0);
    const r = window.jsQR(g.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
    return r ? r.data : null;
  }, bild.toString("base64"));
  await c.close();
  return inhalt;
}
const fehlerfrei = (p, label) => check(!p.fehler.length, `${label}: keine Skriptfehler (${p.fehler.slice(0, 2).join(" | ")})`);

// ---------- a) Kanzlei ----------
async function reiseKanzlei(geraet) {
  console.log(`\nReise a – Kanzlei (${geraet}): XRechnung lesen, drucken, Befunde verstehen`);
  const c = await kontext(geraet), p = await oeffnen(c, SEITE.de);
  const vorPruefung = anfragen.length;
  await laden(p, b("xrechnung.xml"));
  const k = karte(p, "xrechnung.xml");
  const a = await text(k.locator("[data-teil=antwort]"));
  check(/Ja, das ist eine E-Rechnung/.test(a) && /XRechnung 3\.0/.test(a) && /UBL/.test(a), `${geraet} a: Antwort oben – E-Rechnung ja, XRechnung 3.0, Syntax UBL`);
  check(/§ 14 Abs\. 1/.test(a) && /BMF-Schreiben/.test(a) && /Stand der Rechtsangaben: 23\.10\.2026/.test(a), `${geraet} a: Antwort mit amtlicher Fundstelle und Stand`);
  const blatt = await text(k.locator(".ewz-blatt"));
  check(/Elektro Hartmann GmbH/.test(blatt) && /Bäckerei Sonnenkorn KG/.test(blatt) && /RE-2026-0318/.test(blatt) && /€/.test(blatt) && /Gesamt|Zahlbetrag|Summe/.test(blatt), `${geraet} a: Rechnung lesbar – Rechnungssteller, Empfänger, Nummer, Beträge`);
  await k.locator("input[data-aktion=bt]").check();
  const bt = await k.evaluate(el => { const x = el.querySelector(".ewz-blatt [data-bt]"); return el.classList.contains("ewz-mit-bt") && x ? getComputedStyle(x, "::after").content : ""; });
  check(/BT-\d+/.test(bt), `${geraet} a: „Feldnummern zeigen“ blendet die BT-Nummern der Norm ein`);
  const befund = await text(k.locator(".ewz-befund").first());
  check(/Regel BR-DE-15/.test(befund) && /BT-10/.test(befund) && /Was nicht stimmt: .*Käuferreferenz/.test(befund) && /Was der Rechnungssteller ändern muss: .{10,}/.test(befund), `${geraet} a: Befund BR-DE-15 mit Feld, was nicht stimmt und was zu ändern ist`);
  check(!/(?:^| )(?:shall|must|should) /.test(befund.replace(/Originaltext der Regel.*/, "")), `${geraet} a: Befund ohne englischen Regeltext im Vordergrund`);
  await druckAbfangen(p);
  await k.locator("[data-aktion=drucken]").click();
  check(await p.evaluate(() => window.__druck) === 1 && await p.locator("#ewz-druck .ewz-blatt").count() === 1 && await p.locator("#ewz-druck .ewz-befund").count() >= 1, `${geraet} a: Drucken öffnet den Druck mit Rechnung und Befunden`);
  await p.emulateMedia({ media: "print" });
  const sichtbar = await p.evaluate(() => [...document.body.children].filter(x => x.id !== "ewz-druck" && getComputedStyle(x).display !== "none").map(x => x.tagName + "#" + x.id));
  check(!sichtbar.length && await p.locator("#ewz-druck .ewz-blatt").isVisible(), `${geraet} a: Druckbild nur mit Rechnung und Befunden (${sichtbar.join(", ")})`);
  if (geraet === "desktop") {
    const pdf = await p.pdf({ path: join(ORDNER, "a-kanzlei-druck.pdf"), format: "A4", printBackground: true });
    const seiten = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    check(seiten >= 2 && seiten <= 4, `desktop a: Druck als PDF, ${seiten} Seiten (Rechnung, Befunde auf neuer Seite)`);
  }
  await p.emulateMedia({ media: "screen" });
  await p.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  check(await p.locator("#ewz-druck").count() === 0, `${geraet} a: nach dem Druck ist die Seite wie vorher`);
  const [dl] = await Promise.all([p.waitForEvent("download"), k.locator("[data-aktion=bericht]").click()]);
  const pfad = join(ORDNER, `a-kanzlei-pruefbericht-${geraet}.html`);
  await dl.saveAs(pfad);
  const bericht = readFileSync(pfad, "utf8");
  check(/Prüfbericht: xrechnung\.xml/.test(bericht) && /BR-DE-15/.test(bericht) && /Was der Rechnungssteller ändern muss/.test(bericht) && !/<script/i.test(bericht) && /^Pruefbericht-RE-2026-0318\.html$/.test(dl.suggestedFilename()), `${geraet} a: Prüfbericht als HTML-Datei mit Befunden, ohne Skript (${dl.suggestedFilename()})`);
  await foto(p, `a-kanzlei-${geraet}`, { fullPage: true });
  const nachgeladen = anfragen.slice(vorPruefung).filter(x => /pruefung\.js|regeln\//.test(x.url) && x.geraet === geraet).length;
  check(nachgeladen >= 2, `${geraet} a: Prüfregeln laden erst beim ersten Prüfen nach (${nachgeladen} Dateien)`);
  fehlerfrei(p, `${geraet} a`);
  zahlen.reisen++;
  await c.close();
}

// ---------- b) Handwerksbetrieb ----------
const NUTZLAST = ["BCD", "002", "1", "SCT", "COBADEFFXXX", "Malerbetrieb Farbe und Fläche GmbH", "DE89370400440532013000", "EUR1342.32", "", "", "Rechnung 2026-1047"].join("\n");
async function reiseHandwerk(geraet, lang = "de") {
  console.log(`\nReise b – Handwerksbetrieb (${geraet}, ${lang}): ZUGFeRD-PDF, E-Rechnung?, bezahlen per GiroCode`);
  const c = await kontext(geraet), p = await oeffnen(c, SEITE[lang]);
  await c.grantPermissions(["clipboard-read", "clipboard-write"], { origin: HOST });
  await laden(p, b("zugferd.pdf"));
  const k = karte(p, "zugferd.pdf");
  const a = await text(k.locator("[data-teil=antwort]"));
  check(lang === "en" ? /Yes, this is an e-invoice/.test(a) && /ZUGFeRD|Factur-X/.test(a) && /EN 16931/.test(a) : /Ja, das ist eine E-Rechnung/.test(a) && /ZUGFeRD|Factur-X/.test(a) && /EN 16931/.test(a) && /ab Version 2\.0\.1/.test(a) && /MINIMUM und BASIC WL/.test(a),
    `${geraet} b: Antwort – E-Rechnung ja, ZUGFeRD mit Profil EN 16931, Hinweis auf MINIMUM und BASIC WL`);
  check(lang === "en" ? /embedded data counts/.test(a) : /zählen die eingebetteten Daten/.test(a), `${geraet} b: Hinweis, dass bei ZUGFeRD die Daten vorgehen`);
  const qr = k.locator(".ewz-qr-bild");
  await qr.scrollIntoViewIfNeeded();
  const inhalt = await qrLesen(await qr.screenshot());
  check(inhalt === NUTZLAST, `${geraet} b: GiroCode lesbar und richtig (EPC 002: BIC, Empfänger, IBAN, EUR 1342.32, Verwendungszweck)`);
  const werte = await text(k.locator(".ewz-zahlwerte"));
  check(/Malerbetrieb Farbe und Fläche GmbH/.test(werte) && /DE89 3704 0044 0532 0130 00/.test(werte) && (lang === "en" ? /€1,342\.32|1,342\.32/.test(werte) : /1\.342,32 €/.test(werte)) && /Rechnung 2026-1047/.test(werte), `${geraet} b: Zahlungsangaben sichtbar – Empfänger, IBAN, Betrag, Verwendungszweck`);
  await k.locator(".ewz-kopieren").nth(1).click();
  const ablage = await p.evaluate(() => navigator.clipboard.readText()).catch(e => "Fehler: " + e.message);
  check(ablage === "DE89370400440532013000", `${geraet} b: Knopf „Kopieren“ legt die IBAN ohne Leerzeichen in die Zwischenablage (${ablage})`);
  if (lang === "de") {
    const box = await qr.boundingBox();
    check(box && box.width >= 150 && box.x >= 0 && box.x + box.width <= GERAETE[geraet].viewport.width, `${geraet} b: QR-Code groß genug zum Scannen (${box && Math.round(box.width)} px) und ganz im Bild`);
    await foto(p, `b-handwerk-${geraet}`, { fullPage: true });
    await k.locator("[data-teil=antwort]").scrollIntoViewIfNeeded();
    await foto(p, `b-handwerk-${geraet}-antwort`);
    await qr.evaluate(el => el.scrollIntoView({ block: "center" }));
    await foto(p, `b-handwerk-${geraet}-girocode`);
  }
  const breite = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(breite <= 0, `${geraet} b: kein waagerechtes Scrollen (${breite} px zu breit)`);
  fehlerfrei(p, `${geraet} b`);
  zahlen.reisen++;
  await c.close();
}

// ---------- c) Kleinunternehmerin ----------
async function reiseKleinunternehmerin(geraet) {
  console.log(`\nReise c – Kleinunternehmerin (${geraet}): eigene Rechnung vor dem Versand prüfen`);
  const c = await kontext(geraet), p = await oeffnen(c, SEITE.de);
  await laden(p, d("kleinunternehmerin.xml"));
  const k = karte(p, "kleinunternehmerin.xml");
  const a = await text(k.locator("[data-teil=antwort]"));
  check(/Ja, das ist eine E-Rechnung/.test(a) && /5 Fehler, 3 Warnungen/.test(a) && /BMF-Schreiben vom 15\.10\.2026/.test(a) && /Steuerberatung/.test(a), `${geraet} c: Antwort mit Zahl der Befunde und Einordnung nach BMF 15.10.2026`);
  const befunde = await k.locator(".ewz-befund").evaluateAll(l => l.map(x => x.innerText.replace(/\s+/g, " ")));
  const vollstaendig = befunde.filter(x => /(FEHLER|WARNUNG|HINWEIS|Fehler|Warnung|Hinweis) Regel [A-Z]/.test(x) && /Was nicht stimmt: .{12,}/.test(x) && /Was der Rechnungssteller ändern muss: .{8,}/.test(x));
  check(befunde.length === 8 && vollstaendig.length === 8, `${geraet} c: acht Befunde, jeder mit Stufe, Regel, was nicht stimmt und was zu ändern ist (${vollstaendig.length}/${befunde.length})`);
  const alle = befunde.join(" ");
  check(/USt-IdNr/.test(alle) && /Telefonnummer/.test(alle) && /E-Mail-Adresse/.test(alle) && /Käuferreferenz/.test(alle) && /Grund der Steuerbefreiung/.test(alle) && /IBAN/.test(alle), `${geraet} c: Befunde nennen, was zu ändern ist – USt-IdNr., Telefon, E-Mail, Käuferreferenz, Befreiungsgrund, IBAN`);
  check(!/Prüfregel ist verletzt \(Originaltext unten\)/.test(alle), `${geraet} c: kein Befund nur mit allgemeinem Satz`);
  check(befunde.findIndex(x => /WARNUNG|Warnung/.test(x)) > befunde.findLastIndex(x => /FEHLER|Fehler/.test(x)), `${geraet} c: Fehler vor Warnungen`);
  const zahl = await text(k.locator(".ewz-zahlen"));
  check(/Kein GiroCode\. Die angegebene IBAN ist ungültig/.test(zahl) && /DE89 3704 0044 0532 0130 01/.test(zahl) && /570,00 €/.test(zahl), `${geraet} c: kein GiroCode bei ungültiger IBAN, mit Grund; Werte bleiben sichtbar`);
  const orig = k.locator(".ewz-befund details summary").first();
  await orig.click();
  check(await k.locator(".ewz-befund details[open] .ewz-orig").first().isVisible(), `${geraet} c: Originaltext der Regel aufklappbar`);
  await foto(p, `c-kleinunternehmerin-${geraet}`, { fullPage: true });
  fehlerfrei(p, `${geraet} c`);
  zahlen.reisen++;
  await c.close();
}

// ---------- d) Fehlerfälle ----------
function grosseRechnung(positionen) {
  const xml = readFileSync(b("xrechnung.xml"), "utf8");
  const zeile = xml.match(/<cac:InvoiceLine>[\s\S]*?<\/cac:InvoiceLine>/)[0];
  const alle = Array.from({ length: positionen }, (_, i) => zeile.replace(/<cbc:ID>[^<]*<\/cbc:ID>/, `<cbc:ID>${i + 1}</cbc:ID>`)).join("\n");
  return Buffer.from(xml.replace(/<cac:InvoiceLine>[\s\S]*<\/cac:InvoiceLine>/, alle));
}
async function reiseFehlerfaelle(geraet) {
  console.log(`\nReise d – Fehlerfälle (${geraet}): zehn Dateien, falsch, kaputt, groß, Gutschrift, Fremdwährung`);
  const c = await kontext(geraet), p = await oeffnen(c, SEITE.de);
  const zehn = [d("kleinunternehmerin.xml"), d("gutschrift.xml"), d("fremdwaehrung-usd.xml"), d("minimum.pdf"), d("ohne-xml.pdf"), d("foto.jpg"), d("bestellung-ubl.xml"), d("abgeschnitten.xml"), b("xrechnung.xml"), b("zugferd.pdf")];
  const s0 = Date.now();
  await laden(p, zehn);
  const dauer = (Date.now() - s0) / 1000;
  const zeilen = await p.locator(".ewz-uebersicht tbody tr").count();
  check(zeilen === 10 && await p.locator(".ewz-karte").count() === 10, `${geraet} d: zehn Dateien auf einmal – Übersicht mit zehn Zeilen, zehn Karten (${dauer.toFixed(1)} s)`);
  const antwort = async n => text(karte(p, n).locator("[data-teil=antwort], .ewz-antwort").first());
  const g = await text(karte(p, "gutschrift.xml"));
  check(/Gutschrift/.test(g) && /Kein GiroCode\. Es ist eine Gutschrift: Der Betrag wird an Sie gezahlt/.test(g) && /1\.342,32 €/.test(g), `${geraet} d: Gutschrift erkannt, kein GiroCode mit Grund, Betrag sichtbar`);
  const u = await text(karte(p, "fremdwaehrung-usd.xml"));
  check(/Ja, das ist eine E-Rechnung/.test(u) && /Kein GiroCode\. Der Betrag ist nicht in Euro \(USD\)/.test(u) && /DE02 1203 0000 0000 2020 51/.test(u) && /687,82/.test(u), `${geraet} d: Fremdwährung USD – E-Rechnung, kein GiroCode mit Grund, Werte sichtbar`);
  check(/Nein, das ist keine E-Rechnung/.test(await antwort("minimum.pdf")) && /MINIMUM/.test(await antwort("minimum.pdf")), `${geraet} d: ZUGFeRD MINIMUM – keine E-Rechnung, Profil genannt`);
  check(/Nein, das ist keine E-Rechnung/.test(await antwort("ohne-xml.pdf")) && /keine eingebetteten Rechnungsdaten/.test(await antwort("ohne-xml.pdf")), `${geraet} d: PDF ohne XML – keine E-Rechnung, freundlich erklärt`);
  check(/Nein, das ist keine E-Rechnung/.test(await antwort("foto.jpg")) && /Bild/.test(await antwort("foto.jpg")), `${geraet} d: Foto – keine E-Rechnung, als Bild erkannt`);
  const best = await text(karte(p, "bestellung-ubl.xml"));
  check(/Nein, das ist keine Rechnung/.test(best) && /anderes Dokument \(Order\)/.test(best) && !/Formatfehler/.test(best), `${geraet} d: XML ohne Rechnung (Bestellung) erkannt und erklärt, nicht als Formatfehler`);
  check(/Nein, das ist keine E-Rechnung/.test(await antwort("abgeschnitten.xml")) && /kein lesbares Rechnungs-XML/.test(await antwort("abgeschnitten.xml")), `${geraet} d: kaputte (abgeschnittene) XML – keine E-Rechnung, Formatfehler erklärt`);
  await foto(p, `d-zehn-dateien-${geraet}`);
  await p.locator("[data-aktion=alle-entfernen]").click();
  check(await p.locator(".ewz-karte").count() === 0, `${geraet} d: „Alle entfernen“ leert die Liste`);
  // Große Rechnung mit 2.000 Positionen und eine Datei über der Grenze von 20 MB
  const gross = grosseRechnung(2000);
  const s1 = Date.now();
  await p.setInputFiles("#ewz-datei", [{ name: "gross-2000-positionen.xml", mimeType: "application/xml", buffer: gross }]);
  await fertig(p, 1);
  const dauerGross = (Date.now() - s1) / 1000;
  const kg = karte(p, "gross-2000-positionen.xml");
  check(/Ja, das ist eine E-Rechnung/.test(await text(kg.locator("[data-teil=antwort]"))) && await kg.locator(".ewz-befund").count() >= 1 && dauerGross < 120, `${geraet} d: große Datei (${(gross.length / 1e6).toFixed(1)} MB, 2.000 Positionen) geprüft in ${dauerGross.toFixed(1)} s`);
  const zuGross = Buffer.concat([Buffer.from('<?xml version="1.0"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><!--'), Buffer.alloc(21 * 1024 * 1024, 32), Buffer.from("--></Invoice>")]);
  await p.setInputFiles("#ewz-datei", [{ name: "gross-21mb.xml", mimeType: "application/xml", buffer: zuGross }]);
  await fertig(p, 2);
  check(/Die Datei ist zu groß/.test(await text(karte(p, "gross-21mb.xml"))), `${geraet} d: Datei über 20 MB freundlich abgewiesen`);
  fehlerfrei(p, `${geraet} d`);
  zahlen.reisen++;
  await c.close();
}

// ---------- Datei zum Herunterladen ohne Netz ----------
async function ohneNetz(lang) {
  console.log(`\nDatei zum Herunterladen ohne Netz (${lang})`);
  const c = await browser.newContext({ ...GERAETE.desktop, offline: true });
  const netz = [];
  c.on("request", r => { if (!/^(file|data|blob):/.test(r.url())) netz.push(r.method() + " " + r.url()); });
  await c.route(/^https?:|^wss?:/, r => r.abort());
  const p = await c.newPage();
  const fehler = [];
  p.on("pageerror", e => fehler.push(String(e)));
  await p.goto(pathToFileURL(OFFLINE[lang]).href);
  await p.waitForSelector("#erechnung .ewz-start");
  await p.setInputFiles("#ewz-datei", [b("zugferd.pdf"), d("kleinunternehmerin.xml")]);
  await fertig(p, 2);
  const zf = await text(karte(p, "zugferd.pdf")), kl = await text(karte(p, "kleinunternehmerin.xml"));
  const ja = lang === "en" ? /Yes, this is an e-invoice/ : /Ja, das ist eine E-Rechnung/;
  check(ja.test(zf) && await karte(p, "zugferd.pdf").locator(".ewz-qr-bild svg").count() === 1 && /BR-CO-26/.test(kl) && /BR-DE-15/.test(kl), `${lang}: Datei prüft ohne Netz – Antwort, GiroCode und Befunde`);
  const qrInhalt = await qrLesen(await karte(p, "zugferd.pdf").locator(".ewz-qr-bild").screenshot());
  check(qrInhalt === NUTZLAST, `${lang}: GiroCode auch in der Datei richtig`);
  await p.locator("[data-beispiel=xrechnung]").click();
  await fertig(p, 3);
  check(await p.locator(".ewz-karte").count() === 3, `${lang}: Beispiel ist in der Datei enthalten`);
  check(!netz.length && !fehler.length, `${lang}: keine einzige Anfrage ins Netz, keine Skriptfehler (${netz.slice(0, 3).join(", ")}${fehler.slice(0, 2).join(" | ")})`);
  await foto(p, `datei-ohne-netz-${lang}`);
  await c.close();
}

// ---------- Barrierefreiheit: axe-core (Sicherheitsrichtlinie für das Einspielen von axe umgangen) ----------
async function barrierefrei(geraet, lang, art = "seite") {
  const c = await kontext(geraet, { bypassCSP: true });
  const p = await c.newPage();
  await p.goto(art === "datei" ? pathToFileURL(OFFLINE[lang]).href : SEITE[lang]);
  await p.waitForSelector("#erechnung .ewz-start");
  await laden(p, [b("zugferd.pdf"), d("kleinunternehmerin.xml"), d("foto.jpg")]);
  await p.addScriptTag({ path: axePfad() });
  const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }))
    .violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ziel: v.nodes.slice(0, 2).map(x => x.target.join(" ")).join("; ") })));
  const schwer = r.filter(v => ["serious", "critical"].includes(v.impact));
  zahlen.axe.push({ geraet, lang, art, alle: r.length, schwer: schwer.length, leicht: r.filter(v => !["serious", "critical"].includes(v.impact)).map(v => `${v.id} (${v.impact})`) });
  check(!schwer.length, `axe ${art} ${lang} ${geraet}: keine schweren oder kritischen Befunde (${r.length} insgesamt${r.length ? ": " + r.map(v => `${v.id}/${v.impact}/${v.n}`).join(", ") : ""})${schwer.length ? " – " + schwer.map(v => v.ziel).join(" | ") : ""}`);
  await c.close();
}

// ---------- Nur mit der Tastatur ----------
async function tastatur() {
  console.log("\nNur mit der Tastatur (Desktop)");
  const c = await kontext("desktop");
  await c.grantPermissions(["clipboard-read", "clipboard-write"], { origin: HOST });
  const p = await oeffnen(c, SEITE.de);
  await druckAbfangen(p);
  const fokus = () => p.evaluate(() => { const a = document.activeElement; return { id: a.id, tag: a.tagName, text: (a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 60), aktion: a.dataset.aktion || "", kopie: a.dataset.kopie || "", beispiel: a.dataset.beispiel || "", ring: (() => { const s = getComputedStyle(a); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 1 || s.boxShadow !== "none"; })() }; });
  async function bis(pruef, max = 120) { for (let i = 0; i < max; i++) { await p.keyboard.press("Tab"); zahlen.tasten++; const f = await fokus(); if (pruef(f)) return f; } return null; }
  const feld = await bis(f => f.id === "ewz-datei");
  check(!!feld, "Tab erreicht das Feld für die Datei");
  const [wahl] = await Promise.all([p.waitForEvent("filechooser"), p.keyboard.press("Space")]);
  await wahl.setFiles(b("zugferd.pdf"));
  await fertig(p, 1);
  check(await p.locator(".ewz-karte").count() === 1, "Leertaste öffnet die Dateiauswahl, die Rechnung wird geprüft");
  const druck = await bis(f => f.aktion === "drucken");
  check(druck && druck.ring, "Tab erreicht „Drucken“, Fokus sichtbar");
  await p.keyboard.press("Enter");
  check(await p.evaluate(() => window.__druck) === 1, "Enter auf „Drucken“ druckt");
  await p.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  const bt = await bis(f => f.aktion === "bt");
  await p.keyboard.press("Space");
  check(bt && await p.locator(".ewz-karte.ewz-mit-bt").count() === 1, "Leertaste schaltet „Feldnummern zeigen“");
  const kopie = await bis(f => f.kopie === "DE89370400440532013000");
  await p.keyboard.press("Enter");
  check(kopie && kopie.ring && await p.evaluate(() => navigator.clipboard.readText()) === "DE89370400440532013000" && /Kopiert/.test(await p.locator("#ewz-status").innerText()), "Kopieren der IBAN mit Enter, Bestätigung in der Statuszeile (für Screenreader)");
  await p.keyboard.press("Shift+Tab");
  await p.keyboard.press("Shift+Tab");
  const zurueck = await fokus();
  check(!!zurueck.tag, "Shift+Tab geht zurück");
  // zum Beispiel-Knopf zurück: von oben neu beginnen
  await p.evaluate(() => document.activeElement.blur());
  await p.locator("#ewz-datei").focus();
  const bsp = await bis(f => f.beispiel === "xrechnung", 10);
  await p.keyboard.press("Enter");
  await fertig(p, 2);
  check(bsp && bsp.ring && await p.locator(".ewz-karte").count() === 2, "Beispiel mit Tab und Enter erreichbar, Fokus sichtbar");
  const entfernen = await bis(f => f.aktion === "entfernen");
  await p.keyboard.press("Enter");
  check(entfernen && await p.locator(".ewz-karte").count() === 1, "„Entfernen“ mit der Tastatur");
  fehlerfrei(p, "Tastatur");
  await c.close();
}

try {
  for (const g of ["desktop", "handy"]) {
    await reiseKanzlei(g);
    await reiseHandwerk(g);
    await reiseKleinunternehmerin(g);
    await reiseFehlerfaelle(g);
  }
  await reiseHandwerk("desktop", "en");
  await tastatur();
  console.log("\nBarrierefreiheit (axe-core)");
  for (const g of ["desktop", "handy"]) for (const l of ["de", "en"]) await barrierefrei(g, l);
  await barrierefrei("desktop", "de", "datei");
  await ohneNetz("de");
  await ohneNetz("en");
} catch (e) { check(false, "Ablauf ohne Abbruch: " + (e && e.stack || e)); }

// ---------- Datenschutz: alle Anfragen der Reisen ----------
console.log("\nDatenschutz: Anfragen aller Reisen");
const netz = anfragen.filter(a => /^(https?|wss?):/.test(a.url));
const fremd = netz.filter(a => new URL(a.url).origin !== HOST);
const nichtGet = netz.filter(a => a.methode !== "GET");
const verrat = netz.filter(a => GEHEIM.some(g => (a.url + " " + a.daten).toLowerCase().includes(g.toLowerCase())));
const pfade = [...new Set(netz.map(a => new URL(a.url).pathname))].sort();
check(netz.length > 0 && !fremd.length, `nur Anfragen an ${HOST} (${netz.length} Anfragen, fremd: ${fremd.slice(0, 3).map(a => a.url).join(", ")})`);
check(!nichtGet.length && !netz.some(a => ["ping", "beacon", "eventsource", "websocket"].includes(a.art)), `nur GET – kein POST, kein Beacon, kein WebSocket (${nichtGet.slice(0, 3).map(a => a.methode + " " + a.url).join(", ")})`);
check(!verrat.length, `keine Rechnungsdaten oder Dateinamen in Anfragen (${verrat.slice(0, 3).map(a => a.url).join(", ")})`);
check(pfade.every(x => /^\/(werkzeuge\/(e-rechnung-pruefen|e-invoice-viewer)\/|assets\/|favicon|[a-z-]+\.(js|css|svg|ico|png|webmanifest)$)/.test(x)), `nur Seite und statische Dateien von robin.vision (${pfade.length} Pfade)`);
writeFileSync(join(ORDNER, "anfragen.json"), JSON.stringify({ host: HOST, anzahl: netz.length, pfade, methoden: [...new Set(netz.map(a => a.methode))] }, null, 1));

if (srv) await srv.schliessen();
await browser.close();
const { fails, oks } = ergebnis();
writeFileSync(join(ORDNER, "bericht.json"), JSON.stringify({ basis: BASIS, ok: oks, fehlgeschlagen: fails, reisen: zahlen.reisen, fotos: zahlen.fotos, tasten: zahlen.tasten, axe: zahlen.axe, anfragen: netz.length, sekunden: Math.round((Date.now() - t0) / 1000) }, null, 1));
console.log(`\n${oks} Prüfungen bestanden, ${fails} fehlgeschlagen; ${zahlen.reisen} Reisen, ${zahlen.fotos} Bildschirmfotos, ${netz.length} Anfragen, ${Math.round((Date.now() - t0) / 1000)} s → ${ORDNER}`);
process.exit(fails ? 1 : 0);
