// Lizenzen ab 2027 (worker/src/lizenz.js und tools/lizenz/lizenz-client.js): Code per E-Mail, Anmeldung, Test vier Wochen,
// Testende, Testkauf, Stripe-Checkout und -Webhook, Geräte je Person, signierter Status und seine Prüfung im Werkzeug.
// KV im Speicher, Resend und Stripe abgefangen, Uhr verstellbar. Kein Netz.
//   node tests/lizenz_test.mjs
import { handleLizenz, LIZENZPFLICHT_AB, stripeSignaturOk, _schluesselVergessen } from "../worker/src/lizenz.js";
import { tokenPruefen } from "../tools/lizenz/lizenz-client.js";
import { createHmac } from "node:crypto";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };

const TAG = 86400000;
let uhr = LIZENZPFLICHT_AB + 2 * TAG; // 3. Januar 2027
const echtesNow = Date.now;
Date.now = () => uhr;

function kv() { const m = new Map(); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, String(v)); }, delete: async k => { m.delete(k); }, map: m }; }
const mails = [], stripe = [];
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith("https://api.resend.com")) { mails.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); }
  if (u.startsWith("https://api.stripe.com")) { stripe.push(Object.fromEntries(new URLSearchParams(init.body))); return new Response('{"id":"cs_1","url":"https://checkout.stripe.com/c/pay/cs_1"}', { status: 200 }); }
  return new Response("offline", { status: 503 });
};
const env = { USAGE: kv(), RESEND_API_KEY: "r", LIZENZ_TESTKAUF: "0", LIZENZ_GERAETE: "2" };
const post = async (pfad, body, kopf = {}) => { const r = await handleLizenz(new Request("https://goch.robin.vision/lizenz/" + pfad, { method: "POST", headers: { "content-type": "text/plain", ...kopf }, body: typeof body === "string" ? body : JSON.stringify(body) }), env, {}); return { status: r.status, cors: r.headers.get("access-control-allow-origin"), ...(await r.json()) }; };
const codeAusMail = () => mails.at(-1).subject.match(/\d{6}/)[0];

// Schlüssel
const sr = await handleLizenz(new Request("https://goch.robin.vision/lizenz/schluessel"), env, {});
const { oeffentlich } = await sr.json();
check(oeffentlich && oeffentlich.kty === "EC" && oeffentlich.crv === "P-256" && !oeffentlich.d, "öffentlicher Schlüssel ohne privaten Teil");
_schluesselVergessen();
const sr2 = await (await handleLizenz(new Request("https://goch.robin.vision/lizenz/schluessel"), env, {})).json();
check(sr2.oeffentlich.x === oeffentlich.x, "Schlüssel bleibt im KV derselbe");

// Code anfordern
let r = await post("code", { werkzeug: "erechnung", email: "kein-adresse" });
check(r.status === 400, "ungültige Adresse abgelehnt");
r = await post("code", { werkzeug: "unbekannt", email: "a@b.de" });
check(r.status === 400, "unbekanntes Werkzeug abgelehnt");
r = await post("code", { werkzeug: "erechnung", lang: "de", email: "Kanzlei@Beispiel.de" });
check(r.ok && mails.length === 1 && mails[0].to[0] === "kanzlei@beispiel.de", "Code geht an die Adresse (klein geschrieben)");
check(r.cors === "*", "offen für jede Herkunft (lokale Datei)");
check(/SmartFormular E-Rechnung lite/.test(mails[0].text) && mails[0].from.includes("robin.vision"), "Mailtext nennt das Werkzeug, Absender robin.vision");
check(![...env.USAGE.map.keys()].some(k => k.includes("kanzlei@")), "Adresse nicht im Schlüssel des KV");

// Anmelden
r = await post("anmelden", { werkzeug: "erechnung", email: "kanzlei@beispiel.de", code: "000000" === codeAusMail() ? "111111" : "000000" });
check(r.status === 400 && /stimmt nicht/.test(r.error), "falscher Code abgelehnt");
r = await post("anmelden", { werkzeug: "erechnung", email: "kanzlei@beispiel.de", code: codeAusMail() });
check(/^[0-9a-f]{64}$/.test(r.sitzung || ""), "Anmeldung liefert Sitzung");
const sitzung1 = r.sitzung;
check(r.status.typ === "test" && r.status.bis === uhr + 28 * TAG, "Test vier Wochen ab erster Anmeldung", new Date(r.status.bis).toISOString());
check(r.status.gueltigBis === uhr + 28 * TAG, "offline gültig bis Testende (unter 30 Tagen)");
check(r.kauf === false && r.preis === "", "ohne Stripe und Testkauf: kein Kauf, kein Preis");
const st = await tokenPruefen(r.token, oeffentlich);
check(st && st.typ === "test" && st.email === "kanzlei@beispiel.de", "Werkzeug prüft die Signatur");
const [d, s] = r.token.split(".");
const gefaelscht = Buffer.from(JSON.stringify({ ...st, typ: "lizenz", bis: uhr + 999 * TAG })).toString("base64url") + "." + s;
check(await tokenPruefen(gefaelscht, oeffentlich) === null, "veränderter Status wird verworfen");
r = await post("anmelden", { werkzeug: "erechnung", email: "kanzlei@beispiel.de", code: "123456" });
check(r.status === 400, "Code nur einmal verwendbar");

// Status, zweites Werkzeug
r = await post("status", { werkzeug: "fibu", sitzung: sitzung1 });
check(r.status.typ === "test" && r.status.w === "fibu", "FiBu lite: eigener Test");
uhr += 10 * TAG;
r = await post("status", { werkzeug: "erechnung", sitzung: sitzung1 });
check(r.status.bis === LIZENZPFLICHT_AB + 30 * TAG, "Test läuft nicht neu an");
r = await post("status", { werkzeug: "erechnung", sitzung: "f".repeat(64) });
check(r.status === 401 && r.abgemeldet, "unbekannte Sitzung → neu anmelden");

// Testende
uhr = LIZENZPFLICHT_AB + 31 * TAG;
r = await post("status", { werkzeug: "erechnung", sitzung: sitzung1 });
check(r.status.typ === "testende" && r.status.gueltigBis <= uhr, "nach vier Wochen: Testende, nicht mehr frei");
r = await post("kaufen", { werkzeug: "erechnung", sitzung: sitzung1 });
check(r.status === 503, "Kauf ohne Stripe und Testkauf: noch nicht freigeschaltet");

// Testkauf
env.LIZENZ_TESTKAUF = "1"; env.LIZENZ_PREIS = "199 € je Benutzer und Jahr";
r = await post("status", { werkzeug: "erechnung", sitzung: sitzung1 });
check(r.kauf === true && r.preis.startsWith("199"), "Preistext kommt vom Worker");
r = await post("kaufen", { werkzeug: "erechnung", sitzung: sitzung1 });
check(r.testkauf && r.status.typ === "lizenz" && r.status.bis === uhr + 365 * TAG, "Testkauf: Lizenz ein Jahr");
check(r.status.gueltigBis === uhr + 30 * TAG, "offline höchstens 30 Tage, dann Prüfung");
uhr += 360 * TAG;
r = await post("kaufen", { werkzeug: "erechnung", sitzung: sitzung1 });
check(r.status.bis === LIZENZPFLICHT_AB + 31 * TAG + 730 * TAG, "Verlängerung schließt an (keine Tage verloren)");
uhr += 800 * TAG;
r = await post("status", { werkzeug: "erechnung", sitzung: sitzung1 });
check(r.status.typ === "abgelaufen", "abgelaufene Lizenz");
env.LIZENZ_TESTKAUF = "0";

// Stripe
env.STRIPE_SECRET_KEY = "sk_test_x"; env.STRIPE_PREIS_ERECHNUNG = "price_123"; env.STRIPE_WEBHOOK_SECRET = "whsec_test";
r = await post("kaufen", { werkzeug: "erechnung", lang: "de", sitzung: sitzung1 });
check(r.url === "https://checkout.stripe.com/c/pay/cs_1", "Stripe-Checkout-Adresse zurück");
const f = stripe.at(-1);
check(f.mode === "payment" && f["line_items[0][price]"] === "price_123" && f.customer_email === "kanzlei@beispiel.de" && f["metadata[werkzeug]"] === "erechnung", "Checkout: Einmalzahlung, Preis, Adresse, Werkzeug");
check(f.success_url.startsWith("https://robin.vision/werkzeuge/e-rechnung-pruefen/"), "zurück auf die Werkzeugseite");
const eh = f["metadata[eh]"];
const ereignis = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "paid", metadata: { werkzeug: "erechnung", eh }, client_reference_id: eh } } });
const sign = (roh, t = Math.floor(uhr / 1000), geheim = "whsec_test") => `t=${t},v1=${createHmac("sha256", geheim).update(t + "." + roh).digest("hex")}`;
r = await post("stripe", ereignis, { "stripe-signature": sign(ereignis, Math.floor(uhr / 1000), "falsch") });
check(r.status === 400, "Webhook mit falscher Signatur abgelehnt");
r = await post("stripe", ereignis, { "stripe-signature": sign(ereignis, Math.floor(uhr / 1000) - 600) });
check(r.status === 400, "Webhook zu alt abgelehnt");
r = await post("stripe", ereignis, { "stripe-signature": sign(ereignis) });
check(r.ok, "Webhook angenommen");
await post("stripe", ereignis, { "stripe-signature": sign(ereignis) });
r = await post("status", { werkzeug: "erechnung", sitzung: sitzung1 });
check(r.status.typ === "lizenz" && r.status.bis === uhr + 365 * TAG, "Zahlung schaltet ein Jahr frei, doppeltes Ereignis zählt einmal");
check(await stripeSignaturOk("geheim", "t=1,v1=abc", "x", 1000) === false, "Signaturprüfung ohne gültigen Zeitstempel falsch");

// Geräte je Person (hier 2): drittes Gerät wirft das erste hinaus
await post("code", { werkzeug: "erechnung", email: "kanzlei@beispiel.de" });
const sitzung2 = (await post("anmelden", { werkzeug: "erechnung", email: "kanzlei@beispiel.de", code: codeAusMail() })).sitzung;
await post("code", { werkzeug: "erechnung", email: "kanzlei@beispiel.de" });
const sitzung3 = (await post("anmelden", { werkzeug: "erechnung", email: "kanzlei@beispiel.de", code: codeAusMail() })).sitzung;
check((await post("status", { werkzeug: "erechnung", sitzung: sitzung1 })).status === 401, "drittes Gerät: ältestes abgemeldet");
check((await post("status", { werkzeug: "erechnung", sitzung: sitzung3 })).status.typ === "lizenz", "Lizenz gilt auf dem neuen Gerät");
await post("abmelden", { werkzeug: "erechnung", sitzung: sitzung2 });
check((await post("status", { werkzeug: "erechnung", sitzung: sitzung2 })).status === 401, "Abmelden beendet die Sitzung");
check(![...env.USAGE.map.keys()].some(k => k.endsWith(sitzung3)), "Sitzung nur als Hash im KV");

// Grenzen
for (let i = 0; i < 6; i++) r = await post("code", { werkzeug: "erechnung", email: "viel@beispiel.de" });
check(r.status === 429, "höchstens fünf Codes je Adresse und Stunde");
r = await post("code", "kein json");
check(r.status === 400, "kaputte Anfrage abgelehnt");

Date.now = echtesNow;
console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nAlle Lizenzprüfungen bestanden.");
process.exit(fails ? 1 : 0);
