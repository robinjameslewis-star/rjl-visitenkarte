// Aufbau-Meldungen aus dem Werkzeug (/aufbau) und Newsletter-Anmeldung (/newsletter): prüft das gebündelte Worker-Paket
// mit nachgebauter Umgebung (KV im Speicher, Resend und Brevo abgefangen). Kein Netz.
//   node tests/werkzeug_newsletter_test.mjs
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "rjl-werkzeug-"));
execSync(`npx wrangler deploy --dry-run --outdir "${out}"`, { cwd: join(root, "worker"), stdio: "pipe" });
const bundled = readFileSync(join(out, "index.js"), "utf8").replace(/import (\w+) from "\.\/([^"]+\.md)";/g,
  (_, name, file) => `const ${name} = ${JSON.stringify(readFileSync(join(out, file), "utf8"))};`);
writeFileSync(join(out, "test.mjs"), bundled);
const worker = (await import(pathToFileURL(join(out, "test.mjs")).href)).default;

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
function kv() { const m = new Map(); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, delete: async k => { m.delete(k); }, map: m }; }
const mails = [], brevo = [];
let brevoAntwort = { status: 201, body: "{}" };
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith("https://api.resend.com")) { mails.push(JSON.parse(init.body)); return new Response('{"id":"test"}', { status: 200 }); }
  if (String(url).startsWith("https://api.brevo.com")) { brevo.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) }); return new Response(brevoAntwort.body, { status: brevoAntwort.status }); }
  return new Response("offline", { status: 503 });
};
const ctx = { waitUntil: p => p && p.catch && p.catch(() => {}) };
const env = (extra = {}) => ({ USAGE: kv(), MAIL_TO: "robin@example.test", RESEND_API_KEY: "test", ALLOWED_ORIGINS: "https://robin.vision", ...extra });

// Ein Aufbau, wie ihn das Werkzeug erzeugt (Buchstaben x/X, Ziffern 9, bekannte Wörter bleiben)
const AUFBAU = ["Aufbau eines Kontoauszugs, ohne Inhalt: Buchstaben als x/X, Ziffern als 9. Spalten: Seite, Höhe, linker Rand, Text.", "",
  "1  762   42  Xxxx Xxxxxx XX", "1  452   42  Description  Incoming  Outgoing  Amount",
  "1  429   42  Card transaction of 99.99 EUR issued by Xxxxxxx.xxx  -99.99  9,999.99   [42 380 520]",
  "1  415   42  99 Sep 9999 | Card ending in 9999 | Xxxxxxxx Xxxxxx"].join("\n");
const senden = (e, body, origin = "null", ip = "2.2.2.2") => worker.fetch(new Request("https://goch.robin.vision/aufbau", { method: "POST",
  headers: { "content-type": "text/plain;charset=UTF-8", Origin: origin, "CF-Connecting-IP": ip }, body: typeof body === "string" ? body : JSON.stringify(body) }), e, ctx);

console.log("Aufbau aus dem Werkzeug (/aufbau)");
{
  const e = env();
  let r = await senden(e, { aufbau: AUFBAU, bank: "Wise\u0000 ", fassung: "9cc82e7" });
  check(r.status === 200, "gültiger Aufbau aus lokaler Datei (Origin null) wird angenommen");
  check(r.headers.get("Access-Control-Allow-Origin") === "*", "CORS offen nur für diesen Pfad");
  const m = mails.at(-1);
  check(m && m.to[0] === "robin@example.test" && /Wise\)$/.test(m.subject), "Mail an MAIL_TO, Bank im Betreff ohne Steuerzeichen");
  check(m && m.attachments?.length === 1 && Buffer.from(m.attachments[0].content, "base64").toString("utf8") === AUFBAU, "Aufbau unverändert als Anhang");
  check(m && /Fassung des Werkzeugs: 9cc82e7/.test(m.text), "Fassung in der Mail");
  check(e.USAGE.map.get("aufbau:" + new Date().toISOString().slice(0, 10)) === "1", "Tageszähler ohne Personenbezug");

  const zahl = AUFBAU.replace("99.99 EUR", "45.99 EUR");
  r = await senden(env(), { aufbau: zahl });
  check(r.status === 400 && /Ziffern/.test((await r.json()).error), "echte Ziffern im Text werden abgewiesen");
  r = await senden(env(), { aufbau: AUFBAU.replace("Xxxx Xxxxxx XX", "Wise Europe SA") });
  check(r.status === 400 && /Klartext/.test((await r.json()).error), "Klartext wird abgewiesen");
  r = await senden(env(), { aufbau: AUFBAU.replace("Xxxx Xxxxxx XX", "Xxxx Trône XX") });
  check(r.status === 400, "auch Akzentbuchstaben im Klartext werden abgewiesen");
  r = await senden(env(), { aufbau: AUFBAU.replace("[42 380 520]", "[42 380 Wise]") });
  check(r.status === 400, "Klartext in den Lagen der Textblöcke abgewiesen");
  r = await senden(env(), { aufbau: AUFBAU.replace("  9,999.99   [42 380 520]", "  1,234.56   [42 380 520]") });
  check(r.status === 400, "Ziffern im Text vor den Lagen abgewiesen");
  r = await senden(env(), { aufbau: "Irgendein Text ".repeat(10) });
  check(r.status === 400, "fremder Text wird abgewiesen");
  r = await senden(env(), "kein JSON");
  check(r.status === 400, "ungültige Anfrage wird abgewiesen");
  r = await worker.fetch(new Request("https://goch.robin.vision/aufbau", { method: "GET" }), env(), ctx);
  check(r.status === 404, "nur POST");

  const e2 = env();
  const ergebnisse = [];
  for (let i = 0; i < 4; i++) ergebnisse.push((await senden(e2, { aufbau: AUFBAU }, "null", "3.3.3.3")).status);
  check(ergebnisse.slice(0, 3).every(s => s === 200) && ergebnisse[3] === 429, "höchstens 3 je Adresse und Stunde");
  const e3 = env({ MAX_AUFBAU_PER_DAY: "1" });
  await senden(e3, { aufbau: AUFBAU }, "null", "4.4.4.4");
  check((await senden(e3, { aufbau: AUFBAU }, "null", "5.5.5.5")).status === 429, "Tagesgrenze insgesamt");
  check((await senden(env({ RESEND_API_KEY: "" }), { aufbau: AUFBAU }, "null", "6.6.6.6")).status === 503, "ohne Resend-Schlüssel: 503");
}

console.log("Newsletter (/newsletter)");
{
  const anmelden = (e, body, origin = "https://robin.vision", ip = "7.7.7.7") => worker.fetch(new Request("https://goch.robin.vision/newsletter", { method: "POST",
    headers: { "content-type": "application/json", Origin: origin, "CF-Connecting-IP": ip }, body: JSON.stringify(body) }), e, ctx);
  const brevoEnv = (extra = {}) => env({ BREVO_API_KEY: "xkeysib-test", BREVO_LISTE_DE: "3", BREVO_LISTE_EN: "4", BREVO_DOI_VORLAGE_DE: "7",
    BREVO_DOI_VORLAGE_EN: "8", NEWSLETTER_BESTAETIGT_URL: "https://robin.vision/?newsletter=bestaetigt#newsletter", ...extra });
  const t = Date.now() - 10_000;

  let r = await anmelden(env(), { lang: "de", email: "leser@example.test", t });
  check(r.status === 503 && /startet in Kürze/.test((await r.json()).error), "ohne Einrichtung: freundliches 503");
  r = await anmelden(brevoEnv(), { lang: "de", email: "Leser@Example.test", t });
  const a = brevo.at(-1);
  check(r.status === 200 && /bestätige/.test((await r.json()).text), "Anmeldung: Bitte bestätigen");
  check(a && a.url.endsWith("/v3/contacts/doubleOptinConfirmation") && a.headers["api-key"] === "xkeysib-test", "Brevo-Aufruf mit Schlüssel im Kopf");
  check(a && a.body.email === "leser@example.test" && a.body.includeListIds[0] === 3 && a.body.templateId === 7, "Liste und Vorlage DE, Adresse klein");
  check(a && a.body.contactPixelTrackingConsent === false, "Öffnungs- und Klickmessung nur anonym");
  r = await anmelden(brevoEnv(), { lang: "en", email: "reader@example.test", t }, "https://robin.vision", "8.8.8.8");
  const b = brevo.at(-1);
  check(r.status === 200 && b.body.includeListIds[0] === 4 && b.body.templateId === 8 && /lang=en/.test(b.body.redirectionUrl), "englische Liste, Vorlage und Rücksprung");
  brevoAntwort = { status: 400, body: JSON.stringify({ code: "duplicate_parameter", message: "Contact already exist" }) };
  r = await anmelden(brevoEnv(), { lang: "de", email: "schon@example.test", t }, "https://robin.vision", "9.9.9.9");
  check(r.status === 200, "schon angemeldet: dieselbe Antwort, nichts verraten");
  brevoAntwort = { status: 400, body: JSON.stringify({ code: "invalid_parameter" }) };
  r = await anmelden(brevoEnv(), { lang: "de", email: "x@example.test", t }, "https://robin.vision", "10.0.0.1");
  check(r.status === 502, "anderer Fehler von Brevo: 502");
  brevoAntwort = { status: 201, body: "{}" };
  const vorher = brevo.length;
  r = await anmelden(brevoEnv(), { lang: "de", email: "bot@example.test", website: "spam", t }, "https://robin.vision", "10.0.0.2");
  check(r.status === 200 && brevo.length === vorher, "Falle: Bot bekommt ok, Brevo wird nicht gerufen");
  r = await anmelden(brevoEnv(), { lang: "de", email: "schnell@example.test", t: Date.now() }, "https://robin.vision", "10.0.0.3");
  check(r.status === 400, "zu schnell abgeschickt");
  r = await anmelden(brevoEnv(), { lang: "de", email: "keine-adresse", t }, "https://robin.vision", "10.0.0.4");
  check(r.status === 400, "ungültige Adresse");
  r = await anmelden(brevoEnv(), { lang: "de", email: "fremd@example.test", t }, "https://boese.example", "10.0.0.5");
  check(r.status === 403, "fremde Herkunft abgewiesen");
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nAlles in Ordnung");
process.exit(fails ? 1 : 0);
