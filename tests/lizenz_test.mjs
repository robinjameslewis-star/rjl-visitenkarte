// Lizenzen ab 2027 (worker/src/lizenz.js und tools/lizenz/lizenz-client.js): Code per E-Mail, Anmeldung, Test vier Wochen,
// Testende, Testkauf, Stripe-Checkout und -Webhook, Geräte je Person, signierter Status und seine Prüfung im Werkzeug.
// Seit 21.11.2026 (Lücke 2 und 1): Ereignisprotokoll, fehlendes Konto → 500 und späterer Erfolg, Erstattung und Rückbuchung sperren,
// Entsperren, neuer Kauf hebt die Sperre auf, Erklärungen, Rückkehr mit Sitzungs-ID, täglicher Abgleich, Schloss je Konto.
// Seit 21.11.2026 (Lücke 4): Schlüsselkennung kid im Status, mehrere Schlüssel (aktiv und bekannt), GET /lizenz/schluessel mit Liste.
// KV im Speicher, Resend und Stripe abgefangen (Stripe nur als Attrappe), Uhr verstellbar. Kein Netz. Das Durable Object ist die
// echte Klasse Geraetebudget mit Speicher im Arbeitsspeicher; Anfragen laufen nacheinander wie hinter dem Eingangstor.
//   node tests/lizenz_test.mjs
import { handleLizenz, LIZENZPFLICHT_AB, stripeSignaturOk, _schluesselVergessen, lizenzAbgleich, lizenzVerwalten, erklaerungVermerken, gewaehren, sha256, schluesselKennung } from "../worker/src/lizenz.js";
import { Geraetebudget } from "../worker/src/kiosk.js";
import { tokenPruefen } from "../tools/lizenz/lizenz-client.js";
import { createHmac, createHash } from "node:crypto";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };

const TAG = 86400000;
let uhr = LIZENZPFLICHT_AB + 2 * TAG; // 3. Januar 2027
const echtesNow = Date.now;
Date.now = () => uhr;

// KV im Speicher; mit langsam = true gibt jedes get/put den Takt ab (gleichzeitige Anfragen verschränken sich wie im echten Worker)
const pause = () => new Promise(r => setTimeout(r, 1));
function kv() {
  const m = new Map(), o = { langsam: false, map: m };
  o.get = async k => { if (o.langsam) await pause(); return m.get(k) ?? null; };
  o.put = async (k, v) => { if (o.langsam) await pause(); m.set(k, String(v)); };
  o.delete = async k => { m.delete(k); };
  o.list = async ({ prefix = "", cursor } = {}) => { const alle = [...m.keys()].filter(k => k.startsWith(prefix)).sort(), ab = +(cursor || 0), teil = alle.slice(ab, ab + 2);
    return { keys: teil.map(name => ({ name })), list_complete: ab + 2 >= alle.length, cursor: ab + 2 >= alle.length ? undefined : String(ab + 2) }; };
  return o;
}
// echtes Durable Object Geraetebudget, je Name eine Instanz, Anfragen nacheinander (Eingangstor)
function durable() {
  const inst = new Map(); let anfragen = 0;
  return { anfragen: () => anfragen, idFromName: n => n, get: id => {
    if (!inst.has(id)) {
      const m = new Map(), obj = new Geraetebudget({ storage: { get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); }, list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))) } });
      let kette = Promise.resolve();
      inst.set(id, { fetch: (url, init) => { anfragen++; const p = kette.then(() => obj.fetch(new Request(url, init))); kette = p.catch(() => {}); return p; } });
    }
    return inst.get(id);
  } };
}
const mails = [], stripe = [], stripeSitzungen = new Map(), meldungen = [];
let stripeListe = [], stripeAus = false, csNr = 0;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith("https://api.resend.com")) { mails.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); }
  if (u.startsWith("https://api.stripe.com")) {
    if (stripeAus) return new Response("kaputt", { status: 500 });
    if ((init.method || "GET") === "POST") {
      const f = Object.fromEntries(new URLSearchParams(init.body)); stripe.push(f);
      const id = "cs_test_k" + (++csNr);
      stripeSitzungen.set(id, { id, status: "open", payment_status: "unpaid", payment_intent: null, metadata: { werkzeug: f["metadata[werkzeug]"], eh: f["metadata[eh]"] } });
      return new Response(JSON.stringify({ id, url: "https://checkout.stripe.com/c/pay/cs_1" }), { status: 200 });
    }
    const pfad = new URL(u).pathname.replace("/v1/", "");
    if (pfad === "checkout/sessions") return new Response(JSON.stringify({ data: stripeListe, has_more: false }), { status: 200 });
    const s = stripeSitzungen.get(pfad.slice("checkout/sessions/".length));
    return s ? new Response(JSON.stringify(s), { status: 200 }) : new Response('{"error":{}}', { status: 404 });
  }
  return new Response("offline", { status: 503 });
};
const deps = { melden: async (art, betreff, text) => { meldungen.push({ art, betreff, text }); } };
const env = { USAGE: kv(), GERAETE: durable(), RESEND_API_KEY: "r", LIZENZ_TESTKAUF: "0", LIZENZ_GERAETE: "2" };
const post = async (pfad, body, kopf = {}) => { const r = await handleLizenz(new Request("https://goch.robin.vision/lizenz/" + pfad, { method: "POST", headers: { "content-type": "text/plain", ...kopf }, body: typeof body === "string" ? body : JSON.stringify(body) }), env, {}, deps); return { status: r.status, cors: r.headers.get("access-control-allow-origin"), ...(await r.json()) }; };
const konto = async email => JSON.parse(await env.USAGE.get("lizenz:konto:" + await sha256("lizenz:" + email)));
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
check(/SmartFormular E-Rechnung Start/.test(mails[0].text) && !/lite/.test(mails[0].text) && mails[0].from.includes("robin.vision"), "Mailtext nennt das Werkzeug mit neuem Namen, Absender robin.vision");
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
// Umzug 20.11.2026: Herkunft smartformular.ai → Rückkehr dorthin; andere Herkunft (auch „null“ der heruntergeladenen Datei) wie bisher
for (const [herkunft, lang, soll] of [["https://smartformular.ai", "de", "https://smartformular.ai/e-rechnung-start/"], ["https://smartformular.ai", "en", "https://smartformular.ai/en/e-invoice-start/"],
  ["null", "de", "https://robin.vision/werkzeuge/e-rechnung-pruefen/"], ["https://robin.vision", "en", "https://robin.vision/werkzeuge/e-invoice-viewer/"], ["https://smartformular.ai.example", "de", "https://robin.vision/werkzeuge/e-rechnung-pruefen/"]]) {
  const rh = await post("kaufen", { werkzeug: "erechnung", lang, sitzung: sitzung1 }, { origin: herkunft });
  const g = stripe.at(-1);
  check(rh.url && g.success_url === soll + "?lizenz=gekauft&cs={CHECKOUT_SESSION_ID}" && g.cancel_url === soll && rh.cors === "*", `Rückkehr nach Stripe für Herkunft ${herkunft} (${lang}), mit Sitzungs-ID`);
}
const eh = f["metadata[eh]"];
check(f["payment_intent_data[metadata][eh]"] === eh, "Zahlung trägt das Konto in den Metadaten (für Erstattung und Rückbuchung)");
const kaufEreignis = (evt, cs, pi, e = eh, typ = "checkout.session.completed", werkzeug = "erechnung") => JSON.stringify({ id: evt, type: typ, data: { object: { id: cs, payment_status: "paid", payment_intent: pi, metadata: { werkzeug, eh: e }, client_reference_id: e } } });
const ereignis = kaufEreignis("evt_kauf1", "cs_test_kauf1", "pi_kauf1");
const sign = (roh, t = Math.floor(uhr / 1000), geheim = "whsec_test") => `t=${t},v1=${createHmac("sha256", geheim).update(t + "." + roh).digest("hex")}`;
r = await post("stripe", ereignis, { "stripe-signature": sign(ereignis, Math.floor(uhr / 1000), "falsch") });
check(r.status === 400, "Webhook mit falscher Signatur abgelehnt");
r = await post("stripe", ereignis, { "stripe-signature": sign(ereignis, Math.floor(uhr / 1000) - 600) });
check(r.status === 400, "Webhook zu alt abgelehnt");
r = await post("stripe", ereignis, { "stripe-signature": sign(ereignis) });
check(r.ok && r.status === 200, "Webhook angenommen");
const prot = JSON.parse(await env.USAGE.get("lizenz:ereignis:evt_kauf1"));
check(prot && prot.stand === "fertig" && prot.typ === "checkout.session.completed" && prot.bezug === "cs_test_kauf1", "Ereignisprotokoll: Ereignis als fertig vermerkt");
r = await post("stripe", ereignis, { "stripe-signature": sign(ereignis) });
check(r.status === 200 && r.doppelt === true, "doppeltes Ereignis: erkannt, nichts geändert");
r = await post("status", { werkzeug: "erechnung", sitzung: sitzung1 });
check(r.status.typ === "lizenz" && r.status.bis === uhr + 365 * TAG, "Zahlung schaltet ein Jahr frei, doppeltes Ereignis zählt einmal");
check((await konto("kanzlei@beispiel.de")).kaeufe.filter(k => k.id === "cs_test_kauf1").length === 1 && !(await env.USAGE.get("lizenz:offen:cs_test_kauf1")), "ein Kauf im Konto, keine offene Bestellung");
const ohneId = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test_x", payment_status: "paid", metadata: { werkzeug: "erechnung", eh } } } });
check((await post("stripe", ohneId, { "stripe-signature": sign(ohneId) })).status === 400, "Ereignis ohne Kennung abgelehnt");
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

// ---------- Lücke 2: fehlendes Konto → Fehlerantwort, später Erfolg ----------
const ehNeu = await sha256("lizenz:neu@beispiel.de");
const evNeu = kaufEreignis("evt_neu1", "cs_test_neu1", "pi_neu1", ehNeu);
r = await post("stripe", evNeu, { "stripe-signature": sign(evNeu) });
check(r.status === 500, "Konto fehlt: Fehlerantwort, damit Stripe wiederholt", String(r.status));
const protNeu = JSON.parse(await env.USAGE.get("lizenz:ereignis:evt_neu1"));
check(protNeu.stand === "fehler" && protNeu.versuche === 1, "Ereignisprotokoll: Fehler vermerkt, nicht fertig");
check(JSON.parse(await env.USAGE.get("lizenz:offen:cs_test_neu1"))?.grund === "Konto fehlt", "offene Bestellung bleibt stehen (für den Abgleich)");
check(JSON.parse(await env.USAGE.get("lizenz:zahlung:pi_neu1"))?.eh === ehNeu, "Zahlung → Konto vor dem Konto geschrieben");
await post("code", { werkzeug: "erechnung", email: "neu@beispiel.de" });
const sitzungNeu = (await post("anmelden", { werkzeug: "erechnung", email: "neu@beispiel.de", code: codeAusMail() })).sitzung;
r = await post("stripe", evNeu, { "stripe-signature": sign(evNeu) });
check(r.status === 200 && r.ok, "Wiederholung von Stripe: jetzt angenommen");
r = await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu });
check(r.status.typ === "lizenz" && !(await env.USAGE.get("lizenz:offen:cs_test_neu1")) && JSON.parse(await env.USAGE.get("lizenz:ereignis:evt_neu1")).stand === "fertig", "späterer Erfolg: Lizenz frei, offene Bestellung erledigt");
// Schreiben scheitert → Fehlerantwort
const putEcht = env.USAGE.put; env.USAGE.put = async (k, v, o) => { if (k.startsWith("lizenz:konto:")) throw new Error("KV kaputt"); return putEcht(k, v, o); };
const evKaputt = kaufEreignis("evt_kaputt", "cs_test_kaputt", "pi_kaputt");
r = await post("stripe", evKaputt, { "stripe-signature": sign(evKaputt) });
env.USAGE.put = putEcht;
check(r.status === 500 && JSON.parse(await env.USAGE.get("lizenz:ereignis:evt_kaputt")).stand === "fehler", "Schreiben scheitert: Fehlerantwort statt 200");
r = await post("stripe", evKaputt, { "stripe-signature": sign(evKaputt) });
check(r.status === 200 && (await konto("kanzlei@beispiel.de")).kaeufe.some(k => k.id === "cs_test_kaputt"), "nach der Störung: Wiederholung verbucht");

// ---------- Lücke 1: Erstattung, Rückbuchung, Entsperren ----------
const { tokenPruefen: pruefe } = await import("../tools/lizenz/lizenz-client.js");
const charge = (evt, typ, o) => JSON.stringify({ id: evt, type: typ, data: { object: o } });
const evErst = charge("evt_erst1", "charge.refunded", { id: "ch_neu1", payment_intent: "pi_neu1", amount: 23800, amount_refunded: 23800, refunded: true, metadata: {} });
r = await post("stripe", evErst, { "stripe-signature": sign(evErst) });
check(r.status === 200, "Erstattung angenommen");
r = await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu });
const stGesperrt = await pruefe(r.token, oeffentlich);
check(r.status.typ === "gesperrt" && r.status.gueltigBis <= uhr && stGesperrt?.typ === "gesperrt", "Erstattung sperrt: Status „gesperrt“, signiert, nicht offline gültig");
check(!(stGesperrt.typ === "test" || stGesperrt.typ === "lizenz"), "Werkzeug (unverändert) lässt eine gesperrte Lizenz nicht arbeiten");
const kNeu = await konto("neu@beispiel.de");
check(kNeu.sperre?.erechnung?.grund === "erstattung" && kNeu.sperre.erechnung.ab === new Date(uhr).toISOString() && kNeu.verlauf.at(-1).aktion === "gesperrt", "Konto kennt „gesperrt ab“ und den Grund");
r = await post("status", { werkzeug: "fibu", sitzung: sitzungNeu });
check(r.status.typ === "test", "Sperre gilt je Werkzeug (Buchhaltung Start bleibt im Test)");
r = await post("stripe", evErst, { "stripe-signature": sign(evErst) });
check(r.doppelt === true, "doppelte Erstattung: einmal verarbeitet");
// Teilerstattung: keine Sperre, Hinweis an Robin
const evTeil = charge("evt_teil1", "charge.refunded", { id: "ch_kauf1", payment_intent: "pi_kauf1", amount: 23800, amount_refunded: 5000, refunded: false });
await post("stripe", evTeil, { "stripe-signature": sign(evTeil) });
check((await post("status", { werkzeug: "erechnung", sitzung: sitzung3 })).status.typ === "lizenz" && meldungen.some(m => m.art === "lizenz-teilerstattung-ch_kauf1"), "Teilerstattung: Lizenz bleibt frei, Robin bekommt einen Hinweis");
// fremde Zahlung (Memberbereich auf demselben Stripe-Konto)
const evFremd = charge("evt_fremd1", "charge.refunded", { id: "ch_fremd", payment_intent: "pi_fremd", amount: 100, amount_refunded: 100, refunded: true, metadata: { selbstbuchung: "sbs_x" } });
r = await post("stripe", evFremd, { "stripe-signature": sign(evFremd) });
check(r.status === 200 && r.ignoriert === true, "Erstattung einer fremden Zahlung: angenommen und übergangen");
// Entsperren über den Weg der Redaktion
r = await lizenzVerwalten(env, { email: "neu@beispiel.de", werkzeug: "erechnung", aktion: "entsperren", grund: "Erstattung zurückgenommen" }, deps);
check(r.konto?.werkzeuge.erechnung.typ === "lizenz" && !r.konto.werkzeuge.erechnung.sperre, "Entsperren: Lizenz gilt wieder");
check((await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu })).status.typ === "lizenz", "Status nach dem Entsperren: Lizenz");
r = await lizenzVerwalten(env, { email: "neu@beispiel.de", werkzeug: "erechnung", aktion: "sperren" }, deps);
check(!!r.fehler, "Sperren von Hand nur mit Grund");
r = await lizenzVerwalten(env, { email: "neu@beispiel.de", werkzeug: "erechnung", aktion: "sperren", grund: "Widerruf per E-Mail" }, deps);
check(r.konto?.werkzeuge.erechnung.typ === "gesperrt" && r.konto.werkzeuge.erechnung.sperre.quelle === "redaktion", "Sperren von Hand (Redaktion)");
check(!JSON.stringify(r.konto).includes((await konto("neu@beispiel.de")).sitzungen[0]), "Übersicht der Redaktion ohne Sitzungen");
await lizenzVerwalten(env, { email: "neu@beispiel.de", werkzeug: "erechnung", aktion: "entsperren" }, deps);
// Rückbuchung
const evRueck = charge("evt_rueck1", "charge.dispute.created", { id: "dp_1", charge: "ch_neu1", payment_intent: "pi_neu1", amount: 23800 });
r = await post("stripe", evRueck, { "stripe-signature": sign(evRueck) });
check(r.status === 200 && (await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu })).status.typ === "gesperrt", "Rückbuchung sperrt");
check((await konto("neu@beispiel.de")).sperre.erechnung.grund === "rueckbuchung" && meldungen.some(m => m.art === "lizenz-rueckbuchung-dp_1"), "Rückbuchung: Grund vermerkt, Robin bekommt einen Hinweis");
// neuer Kauf hebt die Sperre auf (sonst endete er bezahlt, aber gesperrt)
r = await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu });
check(r.kauf === true, "gesperrte Lizenz: Kaufweg bleibt offen");
const evNeu2 = kaufEreignis("evt_neu2", "cs_test_neu2", "pi_neu2", ehNeu);
await post("stripe", evNeu2, { "stripe-signature": sign(evNeu2) });
const kNeu2 = await konto("neu@beispiel.de");
r = await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu });
check(r.status.typ === "lizenz" && !kNeu2.sperre.erechnung && kNeu2.verlauf.at(-1).grund === "neuer Kauf", "neuer Kauf hebt die Sperre auf (im Verlauf vermerkt)");
check(r.status.bis === uhr + 365 * TAG, "nach einer Sperre beginnt das neue Jahr heute (kein zweites Jahr für eine Zahlung)", new Date(r.status.bis).toISOString());
// Verbuchung scheitert (500), dann Erstattung, dann Wiederholung: die eigene Zahlung hebt ihre Sperre nicht auf
const putEcht2 = env.USAGE.put; env.USAGE.put = async (k, v, o) => { if (k.startsWith("lizenz:konto:")) throw new Error("KV kaputt"); return putEcht2(k, v, o); };
const evNeu4 = kaufEreignis("evt_neu4", "cs_test_neu4", "pi_neu4", ehNeu);
check((await post("stripe", evNeu4, { "stripe-signature": sign(evNeu4) })).status === 500, "Verbuchung scheitert: 500");
env.USAGE.put = putEcht2;
const evErst4 = charge("evt_erst4", "charge.refunded", { id: "ch_neu4", payment_intent: "pi_neu4", amount: 100, amount_refunded: 100, refunded: true });
await post("stripe", evErst4, { "stripe-signature": sign(evErst4) });
await post("stripe", evNeu4, { "stripe-signature": sign(evNeu4) });
check((await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu })).status.typ === "gesperrt" && (await konto("neu@beispiel.de")).kaeufe.some(k => k.id === "cs_test_neu4"), "erstattete Zahlung, später verbucht: bleibt gesperrt");
await lizenzVerwalten(env, { email: "neu@beispiel.de", werkzeug: "erechnung", aktion: "entsperren" }, deps);
// Erstattung vor der Zahlung (Reihenfolge bei Stripe nicht fest)
const evErstVorher = charge("evt_erst3", "charge.refunded", { id: "ch_neu3", payment_intent: "pi_neu3", amount: 100, amount_refunded: 100, refunded: true });
await post("stripe", evErstVorher, { "stripe-signature": sign(evErstVorher) });
const evNeu3 = kaufEreignis("evt_neu3", "cs_test_neu3", "pi_neu3", ehNeu);
const endeVor3 = (await konto("neu@beispiel.de")).lizenz.erechnung;
await post("stripe", evNeu3, { "stripe-signature": sign(evNeu3) });
const k3 = await konto("neu@beispiel.de");
check((await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu })).status.typ === "lizenz" && k3.lizenz.erechnung === endeVor3 && k3.kaeufe.find(k => k.id === "cs_test_neu3").erstattet,
  "Erstattung vor der Zahlung: Zahlung verbucht und als erstattet markiert, ohne Lizenzzeit; der laufende Kauf bleibt");
await lizenzVerwalten(env, { email: "neu@beispiel.de", werkzeug: "erechnung", aktion: "entsperren" }, deps);
// Zahlung fehlgeschlagen (Lastschrift): nichts gewährt
const evFail = JSON.stringify({ id: "evt_fail1", type: "checkout.session.async_payment_failed", data: { object: { id: "cs_test_fail1", payment_status: "unpaid", metadata: { werkzeug: "fibu", eh: ehNeu } } } });
r = await post("stripe", evFail, { "stripe-signature": sign(evFail) });
check(r.status === 200 && (await post("status", { werkzeug: "fibu", sitzung: sitzungNeu })).status.typ === "test", "Zahlung fehlgeschlagen: angenommen, keine Lizenz");

// ---------- Erstattung trifft nur die Zeit aus genau dieser Zahlung (zweite Prüfung, 21.11.2026) ----------
{
  const zwei = async (email, n) => { // Kauf und Verlängerung nach vier Monaten
    await post("code", { werkzeug: "erechnung", email }, { "CF-Connecting-IP": "ip-" + email }); const sz = (await post("anmelden", { werkzeug: "erechnung", email, code: codeAusMail() })).sitzung;
    const e = await sha256("lizenz:" + email);
    for (const i of [1, 2]) { const ev = kaufEreignis(`evt_${n}k${i}`, `cs_test_${n}k${i}`, `pi_${n}k${i}`, e); await post("stripe", ev, { "stripe-signature": sign(ev) }); if (i === 1) uhr += 120 * TAG; }
    const k = await konto(email); return { sz, e, b1: k.kaeufe[0].bis, b2: k.kaeufe[1].bis };
  };
  const erst = async (n, i, typ = "charge.refunded") => { const ev = charge(`evt_${n}e${i}${typ.length}`, typ, { id: `ch_${n}${i}${typ.length}`, payment_intent: `pi_${n}k${i}`, amount: 100, amount_refunded: 100, refunded: true }); return (await post("stripe", ev, { "stripe-signature": sign(ev) })).status; };
  const st = async sz => (await post("status", { werkzeug: "erechnung", sitzung: sz })).status;
  const start = uhr;
  // a) ältere Zahlung erstattet → gültig bis Ende der neueren
  let a = await zwei("zwei-a@beispiel.de", "za");
  check(await erst("za", 1) === 200, "zwei Käufe, ältere erstattet: angenommen");
  let s1 = await st(a.sz), ka = await konto("zwei-a@beispiel.de");
  check(s1.typ === "lizenz" && s1.bis === Date.parse(a.b2) && !ka.sperre?.erechnung && ka.kaeufe[0].erstattet && !ka.kaeufe[1].erstattet, "ältere erstattet: Lizenz gilt bis Ende des neueren Kaufs", new Date(s1.bis).toISOString());
  // b) neuere Zahlung erstattet, ältere läuft noch → bis Ende der älteren
  uhr = start; let b = await zwei("zwei-b@beispiel.de", "zb");
  await erst("zb", 2); s1 = await st(b.sz);
  check(s1.typ === "lizenz" && s1.bis === Date.parse(b.b1), "neuere erstattet: Lizenz gilt bis Ende des älteren Kaufs", new Date(s1.bis).toISOString());
  // c) neuere erstattet, ältere schon abgelaufen → gesperrt
  uhr = start; let c = await zwei("zwei-c@beispiel.de", "zc");
  uhr = Date.parse(c.b1) + TAG; await erst("zc", 2); s1 = await st(c.sz);
  check(s1.typ === "gesperrt" && (await konto("zwei-c@beispiel.de")).sperre.erechnung.grund === "erstattung", "neuere erstattet, ältere abgelaufen: gesperrt");
  // d) beide erstattet → gesperrt
  uhr = start; await erst("za", 2); s1 = await st(a.sz);
  check(s1.typ === "gesperrt", "beide Zahlungen erstattet: gesperrt");
  // e) Rückbuchung ebenso: ältere → bis Ende der neueren; neuere bei abgelaufener älterer → gesperrt
  uhr = start; let d = await zwei("zwei-d@beispiel.de", "zd");
  await erst("zd", 1, "charge.dispute.created"); s1 = await st(d.sz);
  check(s1.typ === "lizenz" && s1.bis === Date.parse(d.b2), "Rückbuchung der älteren Zahlung: Lizenz bis Ende der neueren");
  uhr = start; let f = await zwei("zwei-f@beispiel.de", "zf");
  await erst("zf", 2, "charge.dispute.created"); s1 = await st(f.sz);
  check(s1.typ === "lizenz" && s1.bis === Date.parse(f.b1), "Rückbuchung der neueren Zahlung: Lizenz bis Ende der älteren");
  uhr = Date.parse(f.b1) + TAG; await erst("zf", 1, "charge.dispute.created"); s1 = await st(f.sz);
  check(s1.typ === "gesperrt" && (await konto("zwei-f@beispiel.de")).sperre.erechnung.grund === "rueckbuchung", "Rückbuchung, keine gültige Zahlung mehr: gesperrt");
  // f) altes Konto ohne Zahlungsliste: Erstattung sperrt wie bisher
  uhr = start;
  const ehAlt2 = await sha256("lizenz:alt2@beispiel.de");
  await env.USAGE.put("lizenz:konto:" + ehAlt2, JSON.stringify({ email: "alt2@beispiel.de", erstellt: "2027-01-02T00:00:00.000Z", test: {}, lizenz: { erechnung: new Date(uhr + 100 * TAG).toISOString() }, sitzungen: [] }));
  await env.USAGE.put("lizenz:zahlung:pi_alt2", JSON.stringify({ eh: ehAlt2, werkzeug: "erechnung", cs: "cs_test_alt2" }));
  const evAlt2 = charge("evt_alt2", "charge.refunded", { id: "ch_alt2", payment_intent: "pi_alt2", amount: 100, amount_refunded: 100, refunded: true });
  await post("stripe", evAlt2, { "stripe-signature": sign(evAlt2) });
  check((await konto("alt2@beispiel.de")).sperre?.erechnung?.grund === "erstattung", "altes Konto ohne Kaufliste: Erstattung sperrt wie bisher");
  uhr = start;
}

// ---------- Erklärungen (Widerruf, Kündigung) ----------
meldungen.length = 0;
r = await erklaerungVermerken(env, { email: "Neu@Beispiel.de", art: "widerruf", vertrag: "Lizenz E-Rechnung Start", id: "erk_1" }, deps);
const kErk = await konto("neu@beispiel.de");
check(r.ok && r.konto && kErk.erklaerungen.at(-1).art === "widerruf" && !kErk.sperre?.erechnung, "Widerruf am Konto vermerkt, sperrt nicht selbst (Formular ohne bestätigte Adresse)");
check(meldungen.length === 1 && /nicht gesperrt/.test(meldungen[0].text) && !meldungen[0].text.includes("neu@beispiel.de"), "Robin bekommt einen Hinweis, ohne Adresse in der Mail");
await erklaerungVermerken(env, { email: "neu@beispiel.de", art: "widerruf", id: "erk_1" }, deps);
check((await konto("neu@beispiel.de")).erklaerungen.length === 1, "dieselbe Erklärung zählt einmal");
r = await post("erklaerung", { email: "neu@beispiel.de", art: "kuendigung" });
check(r.status === 404, "Eingang für den Memberbereich ohne Secret zu");
env.LIZENZ_DIENST_SCHLUESSEL = "s".repeat(40);
r = await post("erklaerung", { email: "neu@beispiel.de", art: "kuendigung" }, { authorization: "Bearer falsch" });
check(r.status === 403, "Eingang mit falschem Schlüssel verweigert");
r = await post("erklaerung", { email: "neu@beispiel.de", art: "kuendigung", id: "erk_2" }, { authorization: "Bearer " + "s".repeat(40) });
check(r.ok && r.konto && (await konto("neu@beispiel.de")).erklaerungen.at(-1).art === "kuendigung", "Eingang mit Schlüssel: Kündigung vermerkt");
delete env.LIZENZ_DIENST_SCHLUESSEL;

// ---------- Rückkehr von Stripe ohne Webhook ----------
env.STRIPE_PREIS_FIBU = "price_456";
r = await post("kaufen", { werkzeug: "fibu", sitzung: sitzungNeu });
const csFibu = "cs_test_k" + csNr;
check(r.url && JSON.parse(await env.USAGE.get(`lizenz:checkout:${ehNeu}:fibu`)).id === csFibu, "Kauf merkt sich die offene Sitzung");
r = await post("status", { werkzeug: "fibu", sitzung: sitzungNeu });
check(r.status.typ === "test", "noch nicht bezahlt: Status unverändert");
Object.assign(stripeSitzungen.get(csFibu), { status: "complete", payment_status: "paid", payment_intent: "pi_fibu1" });
uhr += 20000;
r = await post("status", { werkzeug: "fibu", sitzung: sitzungNeu });
check(r.status.typ === "lizenz" && !(await env.USAGE.get(`lizenz:checkout:${ehNeu}:fibu`)), "Rückkehr ohne Webhook: Status fragt Stripe, Lizenz frei");
const evSpaet = kaufEreignis("evt_spaet", csFibu, "pi_fibu1", ehNeu, "checkout.session.completed", "fibu");
await post("stripe", evSpaet, { "stripe-signature": sign(evSpaet) });
check((await konto("neu@beispiel.de")).kaeufe.filter(k => k.id === csFibu).length === 1, "später eintreffender Webhook zählt nicht doppelt");
// Rückkehr mit Sitzungs-ID (neuere Werkzeuge)
r = await post("kaufen", { werkzeug: "erechnung", sitzung: sitzung3 });
const csK = "cs_test_k" + csNr;
Object.assign(stripeSitzungen.get(csK), { status: "complete", payment_status: "paid", payment_intent: "pi_k" });
const vorher = (await konto("kanzlei@beispiel.de")).lizenz.erechnung;
r = await post("rueckkehr", { werkzeug: "erechnung", sitzung: sitzungNeu, cs: csK });
check(r.status === 403, "Rückkehr mit fremder Sitzungs-ID abgelehnt");
uhr += 20000;
r = await post("rueckkehr", { werkzeug: "erechnung", sitzung: sitzung3, cs: csK });
check(r.kaufStand === "bezahlt" && r.status.typ === "lizenz" && (await konto("kanzlei@beispiel.de")).lizenz.erechnung > vorher, "Rückkehr mit Sitzungs-ID: Kauf verbucht, Käufer sieht seinen Stand");
r = await post("rueckkehr", { werkzeug: "erechnung", sitzung: sitzung3, cs: "kein_cs" });
check(r.status === 400, "Rückkehr mit ungültiger Sitzungs-ID abgelehnt");

// ---------- täglicher Abgleich ----------
meldungen.length = 0;
const ehFehlt = await sha256("lizenz:verloren@beispiel.de");
const sess = (id, e, w = "erechnung") => ({ id, status: "complete", payment_status: "paid", payment_intent: "pi_" + id.slice(8), metadata: { werkzeug: w, eh: e }, client_reference_id: e });
// Konto vorhanden, Lizenz fehlt (Webhook nie angekommen); ohne Konto; schon verbucht; unbezahlt; fremder Verkauf
stripeListe = [sess("cs_test_nach1", ehNeu, "fibu"), sess("cs_test_fehlt1", ehFehlt), sess("cs_test_kauf1", eh), { ...sess("cs_test_unbez", ehFehlt), payment_status: "unpaid" }, { id: "cs_test_frem", status: "complete", payment_status: "paid", metadata: { selbstbuchung: "sbs_1" } }];
let ab = await lizenzAbgleich(env, deps);
check(ab.fehlend.length === 1 && ab.fehlend[0].cs === "cs_test_fehlt1", "Abgleich findet genau die bezahlte Bestellung ohne Lizenz", JSON.stringify(ab.fehlend));
check(ab.nachgetragen.length === 1 && ab.nachgetragen[0].cs === "cs_test_nach1" && (await konto("neu@beispiel.de")).kaeufe.some(k => k.id === "cs_test_nach1"), "Abgleich trägt nach, wenn das Konto da ist");
const mailAb = meldungen.find(m => m.art.startsWith("lizenz-abgleich-"));
check(mailAb && mailAb.text.includes("cs_test_fehlt1") && mailAb.text.includes("Nachgetragen") && !mailAb.text.includes("cs_test_kauf1") && !mailAb.text.includes("cs_test_unbez"), "Mail an Robin nennt genau die fehlende Lizenz (und die nachgetragene)");
uhr += TAG; meldungen.length = 0; stripeListe = [];
ab = await lizenzAbgleich(env, deps);
check(ab.fehlend.length === 1 && ab.nachgetragen.length === 0 && meldungen.length === 1 && meldungen[0].art.endsWith(new Date(uhr).toISOString().slice(0, 10)), "am nächsten Tag wieder gemeldet, bis erledigt (eigener Merker, nicht nur Stripe)");
stripeAus = true; meldungen.length = 0;
await env.USAGE.delete("lizenz:offen:cs_test_fehlt1");
ab = await lizenzAbgleich(env, deps);
check(ab.stripe === "nicht erreichbar" && meldungen.length === 1 && /nicht erreichbar/.test(meldungen[0].text), "Stripe nicht erreichbar: Robin erfährt es");
stripeAus = false; meldungen.length = 0;
ab = await lizenzAbgleich(env, deps);
check(ab.fehlend.length === 0 && meldungen.length === 0, "nichts offen: keine Mail");

// ---------- Schloss je Konto: gleichzeitige Änderungen überschreiben sich nicht ----------
env.USAGE.langsam = true;
await Promise.all([1, 2, 3, 4, 5].map(i => gewaehren(env, ehNeu, "fibu", "test", "gleichzeitig-" + i)));
const kG = await konto("neu@beispiel.de");
check(kG.kaeufe.filter(k => k.id.startsWith("gleichzeitig-")).length === 5, "fünf gleichzeitige Käufe: alle im Konto (Schloss)");
const ohneSchloss = { ...env, GERAETE: undefined };
await Promise.all([1, 2, 3, 4, 5].map(i => gewaehren(ohneSchloss, ehNeu, "fibu", "test", "ohne-" + i)));
check((await konto("neu@beispiel.de")).kaeufe.filter(k => k.id.startsWith("ohne-")).length < 5, "Gegenprobe ohne Schloss: Änderungen gehen verloren (der Test prüft also etwas)");
env.USAGE.langsam = false;

// ---------- alte Konten und Einstellungen ----------
const ehAlt = await sha256("lizenz:alt@beispiel.de"), tokAlt = "a".repeat(64);
await env.USAGE.put("lizenz:konto:" + ehAlt, JSON.stringify({ email: "alt@beispiel.de", erstellt: "2027-01-02T00:00:00.000Z", test: {}, lizenz: { erechnung: new Date(uhr + 100 * TAG).toISOString() }, kaeufe: [{ werkzeug: "erechnung", id: "cs_1", quelle: "stripe" }], sitzungen: [await sha256(tokAlt)] }));
await env.USAGE.put("lizenz:sitzung:" + await sha256(tokAlt), JSON.stringify({ eh: ehAlt, at: new Date(uhr).toISOString() }));
check((await post("status", { werkzeug: "erechnung", sitzung: tokAlt })).status.typ === "lizenz", "Konto im alten Format gilt weiter");
Object.assign(env, { LIZENZ_MARKE: "Marke X", LIZENZ_MAIL_FROM: "X <lizenz@x.example>", LIZENZ_MAIL_FUSS: "X GmbH", LIZENZ_KONTAKT: "hilfe@x.example", LIZENZ_PREIS_FIBU: "220 € im Jahr" });
await post("code", { werkzeug: "fibu", email: "einst@beispiel.de" });
check(mails.at(-1).from === "X <lizenz@x.example>" && mails.at(-1).subject.includes("Marke X") && mails.at(-1).text.endsWith("X GmbH"), "Marke, Absender und Fuß aus den Einstellungen");
env.LIZENZ_TESTKAUF = "0"; delete env.STRIPE_SECRET_KEY;
r = await post("kaufen", { werkzeug: "fibu", sitzung: sitzungNeu });
check(r.status === 503 && r.error.includes("hilfe@x.example"), "Kontakt aus den Einstellungen");
check((await post("status", { werkzeug: "fibu", sitzung: sitzungNeu })).preis === "220 € im Jahr" && (await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu })).preis.startsWith("199"), "Preis je Werkzeug, sonst der gemeinsame");

// ---------- Lücke 4: Schlüsselkennung und mehrere Schlüssel ----------
// Schlüssel für die Tests werden hier erzeugt (nie ein echter); der private Teil steht nur im Arbeitsspeicher.
const schluesselHolen = async (e = env) => { const r = await handleLizenz(new Request("https://goch.robin.vision/lizenz/schluessel"), e, {}); return { status: r.status, cors: r.headers.get("access-control-allow-origin"), ...(await r.json()) }; };
const kidKv = await schluesselKennung(oeffentlich);
const teile = t => JSON.parse(Buffer.from(t.split(".")[0], "base64url").toString());
// ohne zweiten Schlüssel: alles wie bisher, nur mit Kennung
_schluesselVergessen();
let sl = await schluesselHolen();
check(sl.status === 200 && sl.cors === "*", "GET /lizenz/schluessel offen für jede Herkunft");
check(JSON.stringify(sl.oeffentlich) === JSON.stringify(oeffentlich), "ohne zweiten Schlüssel: „oeffentlich“ unverändert (kty, crv, x, y)");
check(/^[A-Za-z0-9_-]{43}$/.test(kidKv) && sl.aktiv === kidKv && sl.schluessel.length === 1 && sl.schluessel[0].kid === kidKv && sl.schluessel[0].stand === "aktiv" && !sl.schluessel.some(x => x.d), "Liste: ein Schlüssel, Kennung = Fingerabdruck, ohne privaten Teil");
// Fingerabdruck nach RFC 7638 (Beispiel aus RFC 7638 Abschnitt 3.1 ist RSA; hier gegen die Rechnung von Hand)
check(kidKv === Buffer.from(createHash("sha256").update(`{"crv":"P-256","kty":"EC","x":"${oeffentlich.x}","y":"${oeffentlich.y}"}`).digest()).toString("base64url"), "Kennung nach RFC 7638 (SHA-256 über crv, kty, x, y)");
r = await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu });
check(r.status.kid === kidKv && r.kid === kidKv && teile(r.token).kid === kidKv, "Status trägt die Kennung (im signierten Teil und daneben)");
const stAltWerkzeug = await tokenPruefen(r.token, oeffentlich);
check(stAltWerkzeug && stAltWerkzeug.w === "erechnung" && stAltWerkzeug.kid === kidKv, "unverändertes Werkzeug prüft den Status mit kid weiter (Signatur über den ganzen Text)");
check(await tokenPruefen(r.token, sl.schluessel[0]) !== null, "Eintrag der Liste lässt sich direkt als Schlüssel verwenden (alg, use, kid stören importKey nicht)");

// zweiter Schlüssel als Secret, noch nicht aktiv: signiert wird weiter mit dem KV-Schlüssel
const paar2 = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const priv2 = await crypto.subtle.exportKey("jwk", paar2.privateKey), oeff2 = { kty: "EC", crv: "P-256", x: priv2.x, y: priv2.y }, kid2 = await schluesselKennung(oeff2);
env.LIZENZ_SIGNATUR_PRIVAT_2027 = JSON.stringify(priv2);
sl = await schluesselHolen();
check(sl.aktiv === kidKv && sl.schluessel.length === 2 && sl.schluessel.find(x => x.kid === kid2)?.stand === "bekannt" && JSON.stringify(sl.oeffentlich) === JSON.stringify(oeffentlich), "zweiter Schlüssel ohne Umstellung: bekannt, KV-Schlüssel bleibt aktiv");
check(!JSON.stringify(sl).includes(priv2.d), "privater Teil des zweiten Schlüssels nie in der Antwort");
const tokVorher = (await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu })).token;
check(teile(tokVorher).kid === kidKv && await tokenPruefen(tokVorher, oeffentlich), "vor dem Umstellen: signiert mit dem KV-Schlüssel");

// Umstellen per Einstellung (Name oder Kennung)
env.LIZENZ_SIGNATUR_AKTIV = "2027";
r = await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu });
check(r.kid === kid2 && teile(r.token).kid === kid2 && await tokenPruefen(r.token, oeff2) && await tokenPruefen(r.token, oeffentlich) === null, "nach dem Umstellen: signiert mit dem aktiven Schlüssel (Name „2027“)");
sl = await schluesselHolen();
check(sl.aktiv === kid2 && sl.schluessel.find(x => x.kid === kidKv)?.stand === "bekannt" && sl.oeffentlich.x === oeff2.x, "Liste: neuer Schlüssel aktiv, alter bleibt bekannt");
const altAusListe = sl.schluessel.find(x => x.kid === teile(tokVorher).kid);
check(altAusListe && await tokenPruefen(tokVorher, altAusListe) && await tokenPruefen(tokVorher, oeffentlich), "Status vom alten, nur noch bekannten Schlüssel: prüfbar über die Liste und mit dem eingebauten Schlüssel");
env.LIZENZ_SIGNATUR_AKTIV = kid2;
check((await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu })).kid === kid2, "Umstellen auch über die Kennung");

// Fehleinstellung: unbekannter Name → KV-Schlüssel signiert weiter, kein neuer Schlüssel im KV
const kvVorher = await env.USAGE.get("lizenz:schluessel");
const fehlerAus = console.error; let fehlerText = ""; console.error = (...a) => { fehlerText += a.join(" ") + "\n"; };
env.LIZENZ_SIGNATUR_AKTIV = "gibt-es-nicht";
r = await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu });
check(r.kid === kidKv && await tokenPruefen(r.token, oeffentlich) && await env.USAGE.get("lizenz:schluessel") === kvVorher, "unbekannter aktiver Schlüssel: KV-Schlüssel signiert weiter, nichts neu erzeugt");
// kaputter privater Teil (passt nicht zum öffentlichen): Probe scheitert, Ersatz signiert
const fremd = await crypto.subtle.exportKey("jwk", (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])).publicKey);
env.LIZENZ_SIGNATUR_PRIVAT_KAPUTT = JSON.stringify({ ...priv2, x: fremd.x, y: fremd.y, kid: "kaputt" });
fehlerText = "";
env.LIZENZ_SIGNATUR_PRIVAT_UNLESBAR = "kein json";
env.LIZENZ_SIGNATUR_AKTIV = "kaputt";
r = await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu });
check(r.status.typ && r.kid === kidKv && await tokenPruefen(r.token, oeffentlich) && /kaputt/.test(fehlerText) && /nicht ladbar/.test(fehlerText), "Schlüssel, der die Probe nicht besteht, signiert nie; KV-Schlüssel springt ein");
console.error = fehlerAus;
check(!fehlerText.includes(priv2.d) && !fehlerText.includes("kein json") && /unlesbar/.test(fehlerText), "Fehler im Protokoll ohne Schlüsselteile");
delete env.LIZENZ_SIGNATUR_PRIVAT_KAPUTT; delete env.LIZENZ_SIGNATUR_PRIVAT_UNLESBAR;

// nur bekannte öffentliche Schlüssel aus [vars] (etwa ein ausgemusterter oder der der anderen Instanz) – signieren nie
const paar3 = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const oeff3 = await crypto.subtle.exportKey("jwk", paar3.publicKey);
env.LIZENZ_SIGNATUR_BEKANNT = JSON.stringify([{ kty: "EC", crv: "P-256", x: oeff3.x, y: oeff3.y, kid: "alt-1" }, { kty: "RSA" }]);
env.LIZENZ_SIGNATUR_AKTIV = "alt-1";
console.error = () => {};
sl = await schluesselHolen();
r = await post("status", { werkzeug: "erechnung", sitzung: sitzungNeu });
console.error = fehlerAus;
check(sl.schluessel.some(x => x.kid === "alt-1" && x.stand === "bekannt") && sl.schluessel.length === 3 && sl.aktiv === kidKv && r.kid === kidKv, "bekannter Schlüssel mit eigener Kennung: gelistet, signiert nie (Ersatz KV)");
delete env.LIZENZ_SIGNATUR_BEKANNT; delete env.LIZENZ_SIGNATUR_AKTIV;

// Instanz ohne KV-Schlüssel, nur mit Secret (etwa der eigene Dienst auf smartformular.ai): kein KV-Schlüssel wird erzeugt
const envNeu = { ...env, USAGE: kv(), LIZENZ_SIGNATUR_AKTIV: "2027" };
_schluesselVergessen();
sl = await schluesselHolen(envNeu);
check(sl.aktiv === kid2 && sl.schluessel.length === 1 && await envNeu.USAGE.get("lizenz:schluessel") === null, "andere Instanz nur mit Secret: signiert damit, erzeugt keinen KV-Schlüssel");
// ganz ohne Schlüssel und mit Einstellung: 503 statt eines neuen Schlüssels
const envLeer = { USAGE: kv(), LIZENZ_SIGNATUR_AKTIV: "x" };
_schluesselVergessen(); console.error = () => {};
sl = await schluesselHolen(envLeer);
console.error = fehlerAus;
check(sl.status === 503 && await envLeer.USAGE.get("lizenz:schluessel") === null, "kein Schlüssel ladbar: 503, nichts erzeugt");
// zurück: ohne Einstellungen wieder genau wie vorher
delete env.LIZENZ_SIGNATUR_PRIVAT_2027;
_schluesselVergessen();
sl = await schluesselHolen();
check(sl.aktiv === kidKv && sl.schluessel.length === 1 && JSON.stringify(sl.oeffentlich) === JSON.stringify(oeffentlich), "ohne Einstellungen wieder ein Schlüssel wie vorher");

Date.now = echtesNow;
console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nAlle Lizenzprüfungen bestanden.");
process.exit(fails ? 1 : 0);
