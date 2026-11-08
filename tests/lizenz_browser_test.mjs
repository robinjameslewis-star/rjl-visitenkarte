// Lizenz-Tor im echten Chrome (playwright-core, Kanal „chrome“) mit gestellter Uhr: SmartFormular E-Rechnung lite als Datei zum
// Herunterladen und auf der Seite, gebaut mit eigenem Prüfschlüssel in einen Temp-Ordner. Die Seite (Werkzeugseite aus dem Repository,
// Oberfläche aus dem Temp-Ordner) hält „Prüfen“ dauerhaft frei und sperrt ab 2027 nur „Erstellen“; die Datei sperrt ab 2027 beide Reiter. Der Worker (src/lizenz.js) läuft in Node und beantwortet
// die Anfragen an goch.robin.vision/lizenz/ über page.route; Resend wird abgefangen. Kein Netz, das Repository bleibt unberührt.
// Liegt FiBu lite daneben (FIBU_REPO, Standard ~/Developer/buchungsstapel-lokal), wird auch dessen Datei mit demselben Schlüssel
// gebaut und geprüft, und die Kopie browser/src/lizenz.js muss dem Client hier gleichen.
//   node tests/lizenz_browser_test.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, cpSync, readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { WURZEL, WZ, chrome, check, ergebnis, server } from "./erechnung/hilfen.mjs";
import { handleLizenz } from "../worker/src/lizenz.js";

const tmp = mkdtempSync(join(tmpdir(), "rv-lizenz-"));
function kv() { const m = new Map(); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, String(v)); }, delete: async k => { m.delete(k); }, map: m }; }
const env = { USAGE: kv(), RESEND_API_KEY: "r", LIZENZ_TESTKAUF: "0", LIZENZ_PREIS: "199 € je Benutzer und Jahr" };
let uhr = Date.parse("2026-12-30T10:00:00+01:00");
const echtesNow = Date.now;
Date.now = () => uhr;
const mails = [];
const echtesFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith("https://api.resend.com")) { mails.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); }
  return echtesFetch(url, init);
};

// Schlüssel vom gestellten Worker, Build mit diesem Schlüssel
const { oeffentlich } = await (await handleLizenz(new Request("https://goch.robin.vision/lizenz/schluessel"), env, {})).json();
writeFileSync(join(tmp, "schluessel.json"), JSON.stringify(oeffentlich));
cpSync(join(WURZEL, "assets", "erechnung", "regeln"), join(tmp, "regeln"), { recursive: true });
execFileSync("node", ["bauen.mjs", "--entwurf"], { cwd: WZ, env: { ...process.env, ERECHNUNG_ZIEL: tmp, LIZENZ_SCHLUESSEL_DATEI: join(tmp, "schluessel.json") }, stdio: "pipe" });
const DATEI = pathToFileURL(join(tmp, "dist", "E-Rechnung-lite.html")).href;
check(readFileSync(join(tmp, "dist", "E-Rechnung-lite.html"), "utf8").includes("connect-src https://goch.robin.vision"), "Datei: CSP erlaubt nur die Lizenzprüfung");

const browser = await chrome();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
let netz = true, anfragen = [];
await page.route("https://goch.robin.vision/**", async route => {
  const rq = route.request();
  anfragen.push(new URL(rq.url()).pathname);
  if (!netz) return route.abort("internetdisconnected");
  const r = await handleLizenz(new Request(rq.url(), { method: rq.method(), headers: rq.headers(), body: rq.method() === "POST" ? rq.postData() : undefined }), env, {});
  route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() });
});
const zeit = async iso => { uhr = Date.parse(iso); await page.clock.setFixedTime(new Date(uhr)); };
const laden = async () => { await page.goto(DATEI); await page.waitForTimeout(400); };
const sichtbar = sel => page.locator(sel).isVisible();
const text = sel => page.locator(sel).innerText();

// a) vor 2027: keine Anmeldung, kein Netz
await zeit("2026-12-31T23:30:00+01:00");
await laden();
check(await sichtbar(".ewz-start") && !(await page.locator(".rvl-maske").count()), "31.12.2026: Werkzeug frei, keine Anmeldung");
check(anfragen.length === 0, "31.12.2026: keine Anfrage ins Netz");
await page.goto(DATEI + "#erstellen"); await page.waitForTimeout(400);
check(await sichtbar("#ewz-panel-erstellen .ewe") && await sichtbar("#ewz-tab-erstellen"), "31.12.2026: auch „Erstellen“ frei");
await page.goto("about:blank");

// b) 3.1.2027: Anmeldung per Code
await zeit("2027-01-03T09:00:00+01:00");
await laden();
check(await sichtbar(".rvl-maske") && !(await sichtbar(".ewz-start")) && !(await sichtbar("#ewz-tab-pruefen")) && !(await sichtbar("#ewz-tab-erstellen")), "3.1.2027 Datei: Anmeldemaske statt Ablage, beide Reiter gesperrt");
check(/vier Wochen/.test(await text(".rvl-maske")), "Maske nennt den Test von vier Wochen");
await page.fill("#rvl-email", "kanzlei@beispiel.de");
await page.click("#rvl-senden");
await page.waitForSelector("#rvl-code");
check(mails.length === 1 && mails[0].to[0] === "kanzlei@beispiel.de", "Code per E-Mail verschickt");
await page.fill("#rvl-code", "000000");
await page.click("#rvl-anmelden");
await page.waitForSelector(".rvl-fehler");
check(/stimmt nicht/.test(await text(".rvl-fehler")), "falscher Code: Hinweis");
await page.fill("#rvl-code", mails[0].subject.match(/\d{6}/)[0]);
await page.click("#rvl-anmelden");
await page.waitForSelector(".ewz-start:not([hidden])");
check(!(await page.locator(".rvl-maske").count()), "richtiger Code: Werkzeug frei");
check(/Test bis 31\.01\.2027/.test(await text(".rvl-leiste")) && /kanzlei@beispiel\.de/.test(await text(".rvl-leiste")), "Leiste: angemeldet, Test bis 31.01.2027");
await page.click('[data-beispiel="xrechnung"]');
await page.waitForSelector(".ewz-karte, #ewz-ergebnisse section", { timeout: 15000 });
check(await page.locator("#ewz-ergebnisse").innerText().then(t => t.length > 50), "Beispielrechnung wird gelesen");
check(!JSON.stringify(anfragen).match(/pruef|regeln/), "nur Lizenzpfade im Netz, keine Rechnungsdaten");

// c) später ohne Netz: läuft mit gespeichertem Status
netz = false;
await zeit("2027-01-20T09:00:00+01:00");
await laden();
check(await sichtbar(".ewz-start") && !(await page.locator(".rvl-maske").count()), "20.1. ohne Netz: läuft weiter");

// d) nach dem Test: Weg zur Lizenz
netz = true;
await zeit("2027-02-05T09:00:00+01:00");
await laden();
check(/Test ist beendet/.test(await text(".rvl-maske")) && !(await sichtbar(".ewz-start")), "5.2.: Test beendet, Ablage gesperrt");
check(/noch nicht freigeschaltet/.test(await text(".rvl-maske")), "ohne Kauf: Hinweis auf robin@robin.vision");
await page.goto(DATEI + "#erstellen"); await page.waitForTimeout(400);
check(!(await sichtbar("#ewz-tab-erstellen")) && !(await sichtbar("#ewz-panel-erstellen")) && !(await page.locator("#ewz-panel-erstellen .ewe").count()) && /Test ist beendet/.test(await text(".rvl-maske")),
  "5.2.: auch „Erstellen“ gesperrt – kein Reiter, keine Maske, auch mit #erstellen");
await page.goto(DATEI); await page.waitForTimeout(400);
env.LIZENZ_TESTKAUF = "1";
await page.click("#rvl-neu-laden");
await page.waitForSelector("#rvl-kaufen");
check(/199 € je Benutzer und Jahr/.test(await text(".rvl-maske")), "Preis aus dem Worker sichtbar");
await page.click("#rvl-kaufen");
await page.waitForSelector(".rvl-leiste:not([hidden])");
check(/Lizenz bis 05\.02\.2028/.test(await text(".rvl-leiste")), "Testkauf: Lizenz bis 05.02.2028");

// e) Uhr zurück auf 2026: kein Schlupfloch
await zeit("2026-12-01T09:00:00+01:00");
netz = false;
anfragen = [];
await laden();
check(!(await sichtbar(".ewz-start")) || anfragen.length > 0, "Uhr auf 2026 zurückgestellt: kein Freilauf ohne Prüfung");

// f) mehr als 30 Tage ohne Netz
await zeit("2027-03-20T09:00:00+01:00");
await laden();
check(/Keine Verbindung/.test(await text(".rvl-maske")), "nach 30 Tagen ohne Netz: Verbindung nötig");
netz = true;
await page.click("#rvl-nochmal");
await page.waitForSelector(".ewz-start:not([hidden])");
check(true, "mit Netz wieder frei");

// g) Abmelden
await page.click('[data-rvl="abmelden"]');
await page.waitForSelector("#rvl-email");
check(true, "Abmelden führt zur Anmeldung");

// h) englische Datei
const en = pathToFileURL(join(tmp, "dist", "E-Invoice-Viewer.html")).href;
await page.goto(en); await page.waitForTimeout(400);
check(/Sign in to keep working/.test(await text(".rvl-maske")), "englische Datei: englische Maske");

// j) Seite: „Prüfen“ dauerhaft frei, „Erstellen“ ab 2027 mit Lizenztor (eigener Ursprung, eigener Speicher)
const srv = await server();
const SEITE_URL = `${srv.url}/werkzeuge/e-rechnung-pruefen/`;
await page.route(`${srv.url}/assets/erechnung/**`, async route => {
  const pfad = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/assets\/erechnung\//, "");
  const datei = join(tmp, pfad);
  if (!existsSync(datei)) return route.fulfill({ status: 404, body: "" });
  const typ = { js: "text/javascript", css: "text/css", json: "application/json", xml: "application/xml", pdf: "application/pdf" }[pfad.split(".").pop()] || "application/octet-stream";
  route.fulfill({ status: 200, headers: { "content-type": typ }, body: readFileSync(datei) });
});
const seiteLaden = async (hash = "") => { await page.goto("about:blank"); await page.goto(SEITE_URL + hash); await page.waitForSelector("#ewz-kopfzeile:not([hidden])"); await page.waitForTimeout(400); };
const beispielPruefen = async () => {
  await page.click('[data-beispiel="xrechnung"]');
  await page.waitForFunction(() => window.RVErechnung && window.RVErechnung.eintraege.length > 0 && window.RVErechnung.eintraege.every(e => e.pruefung.status === "fertig"), null, { timeout: 30000 });
};

await zeit("2026-12-31T23:30:00+01:00"); anfragen = [];
await seiteLaden();
check(await sichtbar(".ewz-start") && !(await page.locator(".rvl-maske").count()) && await page.evaluate(() => window.RVErechnung.seite === true), "Seite 31.12.2026: Prüfen frei, keine Anmeldung, Seiten-Fassung");
await seiteLaden("#erstellen");
await page.waitForSelector("#ewz-panel-erstellen:not([hidden]) .ewe");
check(!(await page.locator(".rvl-maske").count()) && anfragen.length === 0, "Seite 31.12.2026: Erstellen frei, auch mit #erstellen, keine Anfrage ins Netz");

await zeit("2027-01-03T09:00:00+01:00"); anfragen = [];
await seiteLaden();
check(await sichtbar(".ewz-start") && await sichtbar("#ewz-tab-pruefen") && await sichtbar("#ewz-tab-erstellen") && !(await page.locator(".rvl-maske").count()), "Seite 3.1.2027: Prüfen frei ohne Anmeldung, beide Reiter sichtbar");
await beispielPruefen();
check(await page.evaluate(() => window.RVErechnung.eintraege[0].pruefung.befunde !== undefined) && await page.locator("#ewz-ergebnisse").innerText().then(x => x.length > 50), "Seite 3.1.2027: Beispielrechnung gelesen und geprüft");
check(anfragen.length === 0, "Seite 3.1.2027: Prüfen ohne Anfrage an die Lizenzprüfung");
await page.click("#ewz-tab-erstellen");
await page.waitForSelector("#ewz-panel-erstellen .rvl-maske");
check(!(await page.locator("#ewz-panel-erstellen .ewe").count()) && /vier Wochen/.test(await text("#ewz-panel-erstellen .rvl-maske")) && await sichtbar(".ewz-tor-hinweis"),
  "Seite 3.1.2027: Erstellen gesperrt, Anmeldemaske im Reiter (vier Wochen Test), Hinweis auf kostenloses Prüfen");
await page.click("#ewz-tab-pruefen");
check(await sichtbar(".ewz-start") && await page.locator("#ewz-ergebnisse .ewz-karte").count() > 0, "Seite: zurück im Reiter Prüfen, Ergebnis bleibt nutzbar");
await seiteLaden("#erstellen");
check(await sichtbar("#ewz-panel-erstellen .rvl-maske") && !(await page.locator("#ewz-panel-erstellen .ewe").count()) && await page.locator(".ewz-start").count() === 1, "Seite 3.1.2027: #erstellen in der Adresse öffnet nur das Tor");
await seiteLaden();
await page.evaluate(() => { location.hash = "#erstellen"; });
await page.waitForTimeout(300);
check(await sichtbar("#ewz-panel-erstellen .rvl-maske") && !(await page.locator("#ewz-panel-erstellen .ewe").count()), "Seite: #erstellen nachträglich (hashchange) öffnet nur das Tor");
await page.evaluate(() => { const b = document.getElementById("ewz-tab-erstellen"); b.removeAttribute("hidden"); b.click(); });
check(!(await page.locator("#ewz-panel-erstellen .ewe").count()), "Seite: mehrfaches Öffnen umgeht das Tor nicht");

// Neue Person erst im März 2027: auch dann vier Wochen kostenlos testen
await zeit("2027-03-10T09:00:00+01:00");
await seiteLaden("#erstellen");
await page.fill("#rvl-email", "maerz@beispiel.de");
await page.click("#rvl-senden");
await page.waitForSelector("#rvl-code");
await page.fill("#rvl-code", mails.at(-1).subject.match(/\d{6}/)[0]);
await page.click("#rvl-anmelden");
await page.waitForSelector("#ewz-panel-erstellen:not([hidden]) .ewe");
check(/Test bis 07\.04\.2027/.test(await text(".rvl-leiste")) && /maerz@beispiel\.de/.test(await text(".rvl-leiste")), "Seite 10.3.2027: neue Person, Erstellen frei, Test bis 07.04.2027 (vier Wochen)");
check(!JSON.stringify(anfragen).match(/pruef|regeln/), "Seite: nur Lizenzpfade im Netz");

await zeit("2027-04-10T09:00:00+01:00"); anfragen = [];
await seiteLaden();
check(await sichtbar(".ewz-start") && !(await page.locator(".rvl-maske").count()) && anfragen.length === 0, "Seite 10.4.2027 nach dem Test: Prüfen frei, ohne Anfrage");
await page.click("#ewz-tab-erstellen");
await page.waitForSelector("#ewz-panel-erstellen .rvl-maske");
check(/Test ist beendet/.test(await text("#ewz-panel-erstellen .rvl-maske")) && !(await page.locator("#ewz-panel-erstellen .ewe").count()), "Seite 10.4.2027: Erstellen nach dem Test nur mit Lizenz");

// Englische Seite
await page.goto("about:blank"); await page.goto(`${srv.url}/werkzeuge/e-invoice-viewer/#erstellen`);
await page.waitForSelector("#ewz-panel-erstellen .rvl-maske");
check(/The trial has ended/.test(await text("#ewz-panel-erstellen .rvl-maske")) && /“Check” tab/.test(await text(".ewz-tor-hinweis")) && await page.locator(".ewz-start").count() === 1,
  "englische Seite: Tor nur im Reiter Create, englischer Hinweis");
await srv.schliessen();

// i) FiBu lite
const FIBU = process.env.FIBU_REPO || join(homedir(), "Developer", "buchungsstapel-lokal");
if (existsSync(join(FIBU, "browser", "build.py"))) {
  const kopie = readFileSync(join(FIBU, "browser", "src", "lizenz.js"), "utf8").split("\n").slice(1).join("\n");
  check(kopie === readFileSync(join(WURZEL, "tools", "lizenz", "lizenz-client.js"), "utf8"), "FiBu lite: Kopie des Clients ist aktuell");
  execFileSync("python3", [join(FIBU, "browser", "build.py")], { env: { ...process.env, FIBU_ZIEL: join(tmp, "fibu"), LIZENZ_SCHLUESSEL_DATEI: join(tmp, "schluessel.json") }, stdio: "pipe" });
  const fibu = pathToFileURL(join(tmp, "fibu", "Buchungsstapel-Generator.html")).href;
  const fibuLaden = async () => { await page.goto(fibu); await page.waitForTimeout(800); };
  await zeit("2026-12-15T09:00:00+01:00"); anfragen = [];
  await fibuLaden();
  check(await sichtbar("main") && !(await page.locator(".rvl-maske").count()) && anfragen.length === 0, "FiBu 15.12.2026: frei, ohne Anfrage");
  await zeit("2027-01-04T09:00:00+01:00");
  await fibuLaden();
  check(await sichtbar(".rvl-maske") && !(await sichtbar("main")), "FiBu 4.1.2027: Anmeldemaske, Arbeitsfläche verborgen");
  await page.fill("#rvl-email", "buero@beispiel.de");
  await page.click("#rvl-senden");
  await page.waitForSelector("#rvl-code");
  await page.fill("#rvl-code", mails.at(-1).subject.match(/\d{6}/)[0]);
  await page.click("#rvl-anmelden");
  await page.waitForSelector("main:not([hidden])");
  check(/Test bis 01\.02\.2027/.test(await text(".rvl-leiste")), "FiBu: angemeldet, eigener Test bis 01.02.2027");
  check(await page.locator("#ablage_auszug").isVisible(), "FiBu: Ablage für Auszüge bereit");
  await page.goto(pathToFileURL(join(tmp, "fibu", "Booking-Batch-Generator.html")).href); await page.waitForTimeout(800);
  check(/Signed in as buero@beispiel\.de · Trial until 1 Feb 2027/.test(await text(".rvl-leiste")), "FiBu englisch: dieselbe Anmeldung, englische Leiste");
} else console.log("  –    FiBu lite nicht gefunden, übersprungen");

await browser.close();
Date.now = echtesNow;
const { fails, oks } = ergebnis();
console.log(fails ? `\n${fails} von ${fails + oks} Prüfungen fehlgeschlagen.` : `\nAlle ${oks} Prüfungen bestanden.`);
process.exit(fails ? 1 : 0);
