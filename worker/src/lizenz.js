// Lizenzen für SmartFormular E-Rechnung lite und FiBu lite (Robin, 01.11.2026): bis 31.12.2026 ohne Anmeldung kostenlos testen,
// ab 1. Januar 2027 Anmeldung nur mit Code per E-Mail (kein Passwort, kein Passkey), vier Wochen Test je Werkzeug ab der ersten
// Anmeldung, danach Lizenz für ein Jahr (je Person, nicht je Gerät; höchstens LIZENZ_GERAETE angemeldete Geräte, das älteste
// fällt heraus). Kauf über Stripe Checkout (Einmalzahlung, keine automatische Verlängerung) oder – solange Stripe fehlt – als
// Testkauf, wenn LIZENZ_TESTKAUF = "1".
//
// Alle Pfade unter /lizenz/ sind für jede Herkunft offen (das Werkzeug läuft auch als lokale Datei, Origin „null“), ohne Cookies;
// der Browser schickt JSON als text/plain, damit es keine CORS-Vorabfrage braucht. Die Sitzung ist ein zufälliges Kennwort im
// Gerät (localStorage des Werkzeugs), im KV liegt nur ihr Hash.
//
// Der Status geht signiert zurück (ECDSA P-256). Das Werkzeug prüft die Signatur mit dem eingebauten öffentlichen Schlüssel und
// arbeitet damit bis zu OFFLINE_TAGE ohne Netz weiter. Den Schlüssel erzeugt der Worker beim ersten Abruf von GET /lizenz/schluessel
// selbst und legt ihn im KV ab (lizenz:schluessel) – niemand muss ein Geheimnis eintippen. Der öffentliche Teil wird beim Bauen der
// Werkzeuge eingebettet (tools/lizenz/oeffentlich.json).
//
// KV (Bindung USAGE):
//   lizenz:schluessel                privater und öffentlicher Schlüssel (JWK)
//   lizenz:konto:<eh>                { email, erstellt, test: {werkzeug: ISO}, lizenz: {werkzeug: ISO}, kaeufe: [...], sitzungen: [hash] }
//   lizenz:sitzung:<sha256(token)>   { eh, at }                       – läuft nach SITZUNG_TAGE ohne Nutzung ab
//   lizenz:code:<eh>                 { hash, exp, tries }             – zehn Minuten
//   lizenz:codes:<eh>:<Stunde>, lizenz:codes:<Tag>                    – Zähler gegen Missbrauch
//   lizenz:umsatz:<Jahr>             { <Land>: { verbraucher: {n, brutto_cent}, unternehmen: {n, brutto_cent} } } – Auswertung je Land
//                                    (Lieferschwelle 10.000 € für Verbraucher in anderen EU-Staaten, § 3a Abs. 5 UStG)
//
// Verbraucher (Robin 10.11.2026): Vor der Zahlung zeigt das Werkzeug eine Zusammenfassung mit dem Bruttopreis und dem Knopf
// „Zahlungspflichtig bestellen“ (§ 312j Abs. 3 BGB); nur dieser Klick (bestellt: true) startet die Zahlung. Nach der Zahlung geht eine
// Bestätigung mit Vertragsinhalt, Lizenzbedingungen und Widerrufsbelehrung (W2) per E-Mail (§ 312f Abs. 2 BGB); Widerruf und Kündigung
// laufen über member.robin.vision/widerruf und /kuendigen.
// <eh> = SHA-256 von "lizenz:" + E-Mail-Adresse (klein geschrieben).

export const WERKZEUGE = {
  erechnung: { name: "SmartFormular E-Rechnung lite", seite: "https://robin.vision/werkzeuge/e-rechnung-pruefen/", seiteEn: "https://robin.vision/werkzeuge/e-invoice-viewer/" },
  fibu: { name: "SmartFormular FiBu lite", seite: "https://robin.vision/werkzeuge/buchungsstapel-generator/", seiteEn: "https://robin.vision/werkzeuge/booking-batch-generator/" },
};
// Beginn der Lizenzpflicht: 1. Januar 2027, 0 Uhr in Deutschland (MEZ = UTC+1)
export const LIZENZPFLICHT_AB = Date.UTC(2026, 11, 31, 23);
const TAG = 86400000;
export const TEST_TAGE = 28, LIZENZ_TAGE = 365, OFFLINE_TAGE = 30, SITZUNG_TAGE = 400;
const CODE_TTL = 600, MAX_TRIES = 5, MAX_CODES_JE_ADRESSE_STUNDE = 5, MAX_CODES_JE_IP_STUNDE = 10;

// Anbieter und Adressen für Bestätigung und Belehrung (gleicher Wortlaut wie im Memberbereich, verbraucher.js)
export const ANBIETER = "Robin James Lewis, robin.vision, Höchststr. 32, 72336 Balingen";
export const TELEFON = "0151 68466088", ANBIETER_MAIL = "robin@robin.vision";
export const ADRESSEN = { agb: "https://member.robin.vision/agb", belehrung: "https://member.robin.vision/widerrufsbelehrung#lizenz",
  widerruf: "https://member.robin.vision/widerruf", kuendigen: "https://member.robin.vision/kuendigen" };

// Preis je Werkzeug, nur an dieser Stelle: LIZENZ_NETTO_CENT_<WERKZEUG> (sonst LIZENZ_NETTO_CENT). Rechenweise wie im Memberbereich:
// netto mal Menge (hier 1), Umsatzsteuer 19 % gerundet, brutto = netto + Steuer. Angezeigt wird der Bruttopreis hervorgehoben.
export function preisDaten(env, werkzeug = "") {
  const netto = Math.round(+(env["LIZENZ_NETTO_CENT_" + String(werkzeug).toUpperCase()] || env.LIZENZ_NETTO_CENT) || 0);
  if (!(netto > 0)) return null;
  const ust = Math.round(netto * 19 / 100);
  return { brutto_cent: netto + ust, netto_cent: netto, ust_cent: ust, satz: 19 };
}
const euro = (cent, lang) => lang === "en" ? "€" + (cent / 100).toFixed(2) : (cent / 100).toFixed(2).replace(".", ",") + " €";
export const preisText = (p, lang = "de") => !p ? "" : lang === "en"
  ? `${euro(p.brutto_cent, "en")} per user per year (including 19% German VAT; ${euro(p.netto_cent, "en")} net)`
  : `${euro(p.brutto_cent)} je Benutzer und Jahr (inkl. 19 % USt; ${euro(p.netto_cent)} netto)`;

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS } });

const TEXT = {
  de: {
    ungueltig: "Ungültige Anfrage.", email: "Bitte eine gültige E-Mail-Adresse eingeben.", werkzeug: "Unbekanntes Werkzeug.",
    unterwegs: "Der Code ist unterwegs.", zuViele: "Für diese Stunde reicht es – bitte später noch einmal versuchen.",
    keinCode: "Kein gültiger Code. Bitte einen neuen anfordern.", versuche: "Zu viele Versuche. Bitte einen neuen Code anfordern.",
    falsch: "Der Code stimmt nicht.", sitzung: "Bitte neu anmelden.", nichtEingerichtet: "Die Lizenzprüfung ist gerade nicht eingerichtet.",
    kaufAus: "Kaufen können Sie die Lizenz ab dem 7. Januar 2027 hier im Werkzeug. Fragen beantwortet robin@robin.vision.",
    nichtBestellt: "Bitte laden Sie das Werkzeug neu von robin.vision: Die aktuelle Fassung zeigt vor dem Kauf die Zusammenfassung mit „Zahlungspflichtig bestellen“.", kaufFehler: "Der Kauf ließ sich gerade nicht starten. Bitte später noch einmal versuchen.", sendFehler: "Der Code ließ sich gerade nicht senden. Bitte später noch einmal versuchen.",
    betreff: c => `Ihr Anmeldecode für SmartFormular: ${c}`,
    mail: (c, w) => `Ihr Code für ${w}: ${c}\n\nEr gilt zehn Minuten. Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail – ohne den Code passiert nichts.\n\nRobin James Lewis · robin.vision`,
  },
  en: {
    ungueltig: "Invalid request.", email: "Please enter a valid email address.", werkzeug: "Unknown tool.",
    unterwegs: "The code is on its way.", zuViele: "That is enough for this hour – please try again later.",
    keinCode: "No valid code. Please request a new one.", versuche: "Too many attempts. Please request a new code.",
    falsch: "The code is not correct.", sitzung: "Please sign in again.", nichtEingerichtet: "Licence checking is not set up at the moment.",
    kaufAus: "You can buy the licence here in the tool from 7 January 2027. For questions, write to robin@robin.vision.",
    nichtBestellt: "Please download the tool again from robin.vision: the current version shows the summary with “Order with obligation to pay” before you buy.", kaufFehler: "The purchase could not be started just now. Please try again later.", sendFehler: "The code could not be sent just now. Please try again later.",
    betreff: c => `Your SmartFormular sign-in code: ${c}`,
    mail: (c, w) => `Your code for ${w}: ${c}\n\nIt is valid for ten minutes. If you did not try to sign in, ignore this email – nothing happens without the code.\n\nRobin James Lewis · robin.vision`,
  },
};

const perIp = new Map(); // je Instanz: ip -> [Zeitpunkte]
function ipGrenze(ip) {
  const jetzt = Date.now(), liste = (perIp.get(ip) || []).filter(t => jetzt - t < 3600000);
  if (liste.length >= MAX_CODES_JE_IP_STUNDE) return false;
  liste.push(jetzt); perIp.set(ip, liste);
  return true;
}

const enc = new TextEncoder();
const hex = b => [...b].map(x => x.toString(16).padStart(2, "0")).join("");
export const sha256 = async s => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));
export const b64url = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const adresseOk = e => typeof e === "string" && e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const kontoSchluessel = eh => "lizenz:konto:" + eh;

async function lesen(request) {
  try { const t = await request.text(); return t.length > 4000 ? null : JSON.parse(t); } catch { return null; }
}
async function kvJson(env, k) { try { return JSON.parse(await env.USAGE.get(k)); } catch { return null; } }

// ---------- Schlüssel ----------
let schluesselCache = null;
export async function schluessel(env) {
  if (schluesselCache) return schluesselCache;
  let s = await kvJson(env, "lizenz:schluessel");
  if (!s) {
    const paar = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    s = { privat: await crypto.subtle.exportKey("jwk", paar.privateKey), oeffentlich: await crypto.subtle.exportKey("jwk", paar.publicKey), erstellt: new Date().toISOString() };
    await env.USAGE.put("lizenz:schluessel", JSON.stringify(s));
  }
  const privat = await crypto.subtle.importKey("jwk", s.privat, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const { kty, crv, x, y } = s.oeffentlich;
  return (schluesselCache = { privat, oeffentlich: { kty, crv, x, y } });
}
export function _schluesselVergessen() { schluesselCache = null; } // nur für Tests

async function signieren(env, inhalt) {
  const { privat } = await schluessel(env);
  const daten = b64url(enc.encode(JSON.stringify(inhalt)));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privat, enc.encode(daten));
  return daten + "." + b64url(sig);
}

// ---------- Konto und Status ----------
const bisMs = iso => iso ? Date.parse(iso) : 0;

// Stand eines Werkzeugs für ein Konto. Der Test beginnt bei der ersten Abfrage ab der Lizenzpflicht (vorher braucht niemand ihn).
function stand(konto, werkzeug, jetzt) {
  const lizenzBis = bisMs(konto.lizenz?.[werkzeug]);
  if (lizenzBis > jetzt) return { typ: "lizenz", bis: lizenzBis, neu: false };
  let testBis = bisMs(konto.test?.[werkzeug]), neu = false;
  if (!testBis) { testBis = Math.max(jetzt, LIZENZPFLICHT_AB) + TEST_TAGE * TAG; neu = true; }
  if (testBis > jetzt) return { typ: "test", bis: testBis, neu };
  return { typ: lizenzBis ? "abgelaufen" : "testende", bis: Math.max(lizenzBis, testBis), neu };
}

async function statusAntwort(env, eh, konto, werkzeug, lang = "de") {
  const jetzt = Date.now(), s = stand(konto, werkzeug, jetzt);
  if (s.neu) { konto.test = { ...(konto.test || {}), [werkzeug]: new Date(s.bis).toISOString() }; await env.USAGE.put(kontoSchluessel(eh), JSON.stringify(konto)); }
  const frei = s.typ === "lizenz" || s.typ === "test";
  // offline gültig bis: höchstens OFFLINE_TAGE, nie über das Ende von Test oder Lizenz hinaus
  const inhalt = { w: werkzeug, typ: s.typ, bis: s.bis, gueltigBis: frei ? Math.min(s.bis, jetzt + OFFLINE_TAGE * TAG) : jetzt, ausgestellt: jetzt, email: konto.email };
  return { status: inhalt, token: await signieren(env, inhalt), preis: preisText(preisDaten(env, werkzeug), lang) || env.LIZENZ_PREIS || "", preisDaten: preisDaten(env, werkzeug), geraete: geraete(env), adressen: ADRESSEN, kauf: !!(stripeBereit(env, werkzeug) || env.LIZENZ_TESTKAUF === "1") };
}

async function sitzungLesen(env, token) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return null;
  const k = "lizenz:sitzung:" + await sha256(token), s = await kvJson(env, k);
  if (!s) return null;
  const konto = await kvJson(env, kontoSchluessel(s.eh));
  if (!konto) return null;
  // Sitzung bei Nutzung verlängern – höchstens einmal am Tag schreiben
  if (Date.now() - Date.parse(s.at) > TAG) await env.USAGE.put(k, JSON.stringify({ ...s, at: new Date().toISOString() }), { expirationTtl: SITZUNG_TAGE * 86400 });
  return { eh: s.eh, konto, k };
}

const geraete = env => Math.max(1, +(env.LIZENZ_GERAETE || 3));

// Lizenz gewähren oder verlängern (Kauf, Testkauf, später auch von Hand). Doppelte Zahlungs-IDs zählen nur einmal.
// angaben: weitere Felder des Kaufs (Land, Betrag, USt-IdNr. ja/nein) für Bestätigung und Auswertung
export async function gewaehren(env, eh, werkzeug, quelle, id = "", angaben = {}) {
  const konto = await kvJson(env, kontoSchluessel(eh));
  if (!konto || !WERKZEUGE[werkzeug]) return null;
  konto.kaeufe ||= [];
  if (id && konto.kaeufe.some(k => k.id === id)) return konto;
  const jetzt = Date.now(), ab = Math.max(jetzt, bisMs(konto.lizenz?.[werkzeug]));
  const bis = new Date(ab + LIZENZ_TAGE * TAG).toISOString();
  konto.lizenz = { ...(konto.lizenz || {}), [werkzeug]: bis };
  konto.kaeufe.push({ werkzeug, am: new Date(jetzt).toISOString(), bis, quelle, id, ...angaben });
  await env.USAGE.put(kontoSchluessel(eh), JSON.stringify(konto));
  return konto;
}

// ---------- Stripe ----------
const stripePreis = (env, werkzeug) => env["STRIPE_PREIS_" + werkzeug.toUpperCase()];
const stripeBereit = (env, werkzeug) => !!(env.STRIPE_SECRET_KEY && stripePreis(env, werkzeug));

async function stripeCheckout(env, konto, eh, werkzeug, lang) {
  const w = WERKZEUGE[werkzeug], seite = lang === "en" ? w.seiteEn : w.seite;
  const f = new URLSearchParams({
    mode: "payment", "line_items[0][price]": stripePreis(env, werkzeug), "line_items[0][quantity]": "1",
    customer_email: konto.email, client_reference_id: eh, "metadata[werkzeug]": werkzeug, "metadata[eh]": eh,
    "payment_intent_data[metadata][werkzeug]": werkzeug, "invoice_creation[enabled]": "true", locale: lang === "en" ? "en" : "de",
    // Anschrift (Land) für die Auswertung je Staat, USt-IdNr. freiwillig: mit Nummer zählt der Kauf als Unternehmen
    billing_address_collection: "required", "tax_id_collection[enabled]": "true", "metadata[lang]": lang === "en" ? "en" : "de", "metadata[bestellt_am]": new Date().toISOString(),
    success_url: seite + "?lizenz=gekauft", cancel_url: seite,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST", headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY, "content-type": "application/x-www-form-urlencoded" }, body: f,
  });
  if (!r.ok) { console.error("Lizenz: Stripe", r.status, (await r.text()).slice(0, 300)); return null; }
  return (await r.json()).url || null;
}

// Signatur nach Stripe: Kopf „t=…,v1=…“, HMAC-SHA256 über „t.Rohtext“ mit dem Webhook-Geheimnis, höchstens fünf Minuten alt.
export async function stripeSignaturOk(geheimnis, kopf, roh, jetzt = Date.now()) {
  if (!geheimnis || !kopf) return false;
  const teile = Object.fromEntries(kopf.split(",").map(p => p.split("=")).filter(p => p.length === 2).map(([a, b]) => [a.trim(), b.trim()]));
  const t = +teile.t;
  if (!t || Math.abs(jetzt / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(geheimnis), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const soll = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(t + "." + roh))));
  const v1 = kopf.split(",").map(p => p.trim()).filter(p => p.startsWith("v1=")).map(p => p.slice(3));
  return v1.some(v => v.length === soll.length && [...v].every((c, i) => c === soll[i]));
}

async function stripeWebhook(request, env) {
  const roh = await request.text();
  if (!await stripeSignaturOk(env.STRIPE_WEBHOOK_SECRET, request.headers.get("stripe-signature"), roh)) return json({ error: "Signatur ungültig." }, 400);
  let ev; try { ev = JSON.parse(roh); } catch { return json({ error: "Ungültig." }, 400); }
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    const s = ev.data?.object || {};
    const werkzeug = s.metadata?.werkzeug, eh = s.metadata?.eh || s.client_reference_id;
    if (s.payment_status === "paid" && WERKZEUGE[werkzeug] && /^[0-9a-f]{64}$/.test(eh || "")) {
      const vorher = await kvJson(env, kontoSchluessel(eh));
      const schonDa = (vorher?.kaeufe || []).some(k => k.id === s.id);
      const land = String(s.customer_details?.address?.country || "").toUpperCase().slice(0, 2) || null;
      const angaben = { land, brutto_cent: Number.isInteger(s.amount_total) ? s.amount_total : null, ustid: !!(s.customer_details?.tax_ids || []).length, lang: s.metadata?.lang === "en" ? "en" : "de" };
      const konto = await gewaehren(env, eh, werkzeug, "stripe", s.id, angaben);
      if (!konto) console.error("Lizenz: Konto zu Zahlung fehlt", s.id);
      else if (!schonDa) {
        await umsatzZaehlen(env, angaben);
        await bestaetigen(env, konto, konto.kaeufe.at(-1), s.customer_details?.email || konto.email);
      }
    }
  }
  return json({ ok: true });
}

// ---------- Auswertung je Land und Bestätigung ----------
export async function umsatzZaehlen(env, a, jetzt = Date.now()) {
  const k = "lizenz:umsatz:" + new Date(jetzt).getUTCFullYear(), u = await kvJson(env, k) || {};
  const land = a.land || "??", art = a.ustid ? "unternehmen" : "verbraucher";
  const z = ((u[land] ||= {})[art] ||= { n: 0, brutto_cent: 0 });
  z.n += 1; z.brutto_cent += a.brutto_cent || 0;
  await env.USAGE.put(k, JSON.stringify(u));
}

// Widerrufsbelehrung W2 und Muster-Widerrufsformular: amtliches Muster (Anlage 1 und 2 zu Art. 246a EGBGB), nicht umformulieren
export const BELEHRUNG = `Widerrufsbelehrung

Widerrufsrecht

Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.

Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.

Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${ANBIETER}, Telefon: ${TELEFON}, E-Mail: ${ANBIETER_MAIL}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Sie können Ihr Widerrufsrecht auch online unter ${ADRESSEN.widerruf.replace("https://", "")} ausüben. Wenn Sie diese Online-Funktion nutzen, übermitteln wir Ihnen auf einem dauerhaften Datenträger (z. B. durch eine E-Mail) unverzüglich eine Eingangsbestätigung mit Informationen zum Inhalt der Widerrufserklärung sowie dem Datum und der Uhrzeit ihres Eingangs.

Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.

Folgen des Widerrufs

Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.

Muster-Widerrufsformular

(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)

– An ${ANBIETER}, E-Mail: ${ANBIETER_MAIL}:

– Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)

– Bestellt am (*)/erhalten am (*)

– Name des/der Verbraucher(s)

– Anschrift des/der Verbraucher(s)

– Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)

– Datum

(*) Unzutreffendes streichen.`;

const base64 = b => { let t = ""; for (let i = 0; i < b.length; i += 0x8000) t += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(t); };
const datumDe = ms => new Date(ms).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

// Bestätigung des Vertrags (§ 312f Abs. 2 BGB, Art. 246a § 1 EGBGB): Vertragsinhalt, Lizenzbedingungen, Belehrung – im Text der E-Mail,
// die AGB als Anhang (Abruf von member.robin.vision/agb; fehlt er, geht die Mail trotzdem, mit Link, und Robin bekommt einen Hinweis im Log).
export function bestaetigungText(env, konto, kauf) {
  // Betrag wie bezahlt; Steuer aus dem eingestellten Preis, solange der Betrag dazu passt, sonst aus dem Betrag herausgerechnet
  const w = WERKZEUGE[kauf.werkzeug], p = preisDaten(env, kauf.werkzeug), brutto = kauf.brutto_cent ?? p?.brutto_cent ?? 0;
  const netto = p && p.brutto_cent === brutto ? p.netto_cent : Math.round(brutto * 100 / 119);
  return `Guten Tag,

Ihr Kauf ist bestätigt. Hier steht alles, was zu Ihrem Vertrag gehört.

Vertragspartner: ${ANBIETER}, Telefon ${TELEFON}, ${ANBIETER_MAIL}

Leistung: Lizenz für ${w.name} – Erstellen von E-Rechnungen und die Datei zum Herunterladen – für eine Person (${konto.email}) auf bis zu ${geraete(env)} Geräten. Lesen und Prüfen bleiben ohnehin kostenlos.
Gesamtpreis: ${euro(brutto)} einschließlich ${euro(brutto - netto)} Umsatzsteuer (19 %), bezahlt per Karte am ${datumDe(Date.parse(kauf.am))}. Die Rechnung kommt mit gesonderter E-Mail.
Laufzeit: ein Jahr, bis ${datumDe(Date.parse(kauf.bis))}. Der Vertrag endet dann von selbst; eine Verlängerung gibt es nicht.
Technik: aktueller Browser; Internet für die Anmeldung per Code, danach arbeitet das Werkzeug bis zu 30 Tage auch ohne Verbindung. Ihre Rechnungsdaten bleiben in Ihrem Browser.
Mängel: Für digitale Inhalte gelten die gesetzlichen Mängelrechte. Während der Laufzeit erhalten Sie die Aktualisierungen, die für die vertragsgemäße Nutzung nötig sind.

Bedingungen: Es gelten die Nutzungs- und Lizenzbedingungen auf ${w.seite}#nutzungsbedingungen und die Allgemeinen Geschäftsbedingungen von robin.vision (im Anhang; auch unter ${ADRESSEN.agb}).

Widerruf: Als Verbraucher können Sie 14 Tage lang widerrufen, am einfachsten unter ${ADRESSEN.widerruf} („Vertrag widerrufen“). Sie erhalten dann den ganzen Preis zurück, die Lizenz endet.
Verträge hier kündigen: ${ADRESSEN.kuendigen}

${BELEHRUNG}

Robin James Lewis · robin.vision`;
}

async function bestaetigen(env, konto, kauf, an) {
  if (!env.RESEND_API_KEY || !adresseOk(an || "")) { console.error("Lizenz: Bestätigung nicht möglich", kauf.id); return false; }
  const anhaenge = [];
  try {
    const r = await fetch(env.LIZENZ_AGB_URL || ADRESSEN.agb, { headers: { accept: "text/html" } });
    if (r.ok) anhaenge.push({ filename: "AGB-robin.vision.html", content: base64(enc.encode(await r.text())) });
    else console.error("Lizenz: AGB nicht abrufbar", r.status);
  } catch (e) { console.error("Lizenz: AGB nicht abrufbar", String(e)); }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + env.RESEND_API_KEY },
    body: JSON.stringify({ from: env.LIZENZ_MAIL_FROM || "SmartFormular <lizenz@robin.vision>", to: [an], reply_to: ANBIETER_MAIL,
      subject: `Ihre Lizenz: ${WERKZEUGE[kauf.werkzeug].name} – Bestätigung und Vertragsunterlagen`, text: bestaetigungText(env, konto, kauf), ...(anhaenge.length ? { attachments: anhaenge } : {}) }),
  }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
  if (!r.ok) console.error("Lizenz: Bestätigung Resend", r.status, (await r.text()).slice(0, 200));
  return r.ok;
}

// ---------- Anfragen ----------
export async function handleLizenz(request, env, ctx) {
  const url = new URL(request.url), pfad = url.pathname.slice("/lizenz/".length);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (!env.USAGE) return json({ error: TEXT.de.nichtEingerichtet }, 503);
  if (pfad === "schluessel" && request.method === "GET") return json({ oeffentlich: (await schluessel(env)).oeffentlich });
  if (request.method !== "POST") return json({ error: "Nicht gefunden." }, 404);
  if (pfad === "stripe") return stripeWebhook(request, env);

  const body = await lesen(request);
  const lang = body?.lang === "en" ? "en" : "de", t = TEXT[lang];
  if (!body || typeof body !== "object") return json({ error: t.ungueltig }, 400);
  const werkzeug = body.werkzeug;
  if (!WERKZEUGE[werkzeug]) return json({ error: t.werkzeug }, 400);

  if (pfad === "code") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!adresseOk(email)) return json({ error: t.email }, 400);
    if (!ipGrenze(request.headers.get("CF-Connecting-IP") || "?")) return json({ error: t.zuViele }, 429);
    const eh = await sha256("lizenz:" + email), stunde = new Date().toISOString().slice(0, 13);
    const tag = "lizenz:codes:" + stunde.slice(0, 10), jeAdresse = `lizenz:codes:${eh}:${stunde}`;
    const n = +(await env.USAGE.get(jeAdresse) || 0), nTag = +(await env.USAGE.get(tag) || 0);
    if (n >= MAX_CODES_JE_ADRESSE_STUNDE || nTag >= +(env.MAX_LIZENZ_CODES_PER_DAY || 300)) return json({ error: t.zuViele }, 429);
    if (!env.RESEND_API_KEY) return json({ error: t.nichtEingerichtet }, 503);
    await env.USAGE.put(jeAdresse, String(n + 1), { expirationTtl: 3600 });
    await env.USAGE.put(tag, String(nTag + 1), { expirationTtl: 2 * 86400 });
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    await env.USAGE.put("lizenz:code:" + eh, JSON.stringify({ hash: await sha256(code), exp: Date.now() + CODE_TTL * 1000, tries: 0 }), { expirationTtl: CODE_TTL });
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + env.RESEND_API_KEY },
      body: JSON.stringify({ from: env.LIZENZ_MAIL_FROM || "SmartFormular <lizenz@robin.vision>", to: [email], subject: t.betreff(code), text: t.mail(code, WERKZEUGE[werkzeug].name) }),
    }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
    if (!r.ok) { console.error("Lizenz: Resend", r.status, (await r.text()).slice(0, 200)); return json({ error: t.sendFehler }, 502); }
    return json({ ok: true, hinweis: t.unterwegs });
  }

  if (pfad === "anmelden") {
    const email = String(body.email || "").trim().toLowerCase(), code = String(body.code || "").replace(/\D/g, "");
    if (!adresseOk(email)) return json({ error: t.email }, 400);
    const eh = await sha256("lizenz:" + email), ck = "lizenz:code:" + eh, eintrag = await kvJson(env, ck);
    if (!eintrag || eintrag.exp < Date.now()) return json({ error: t.keinCode }, 400);
    if (eintrag.tries >= MAX_TRIES) { await env.USAGE.delete(ck); return json({ error: t.versuche }, 400); }
    if (code.length !== 6 || await sha256(code) !== eintrag.hash) {
      eintrag.tries += 1;
      await env.USAGE.put(ck, JSON.stringify(eintrag), { expirationTtl: CODE_TTL });
      return json({ error: t.falsch }, 400);
    }
    await env.USAGE.delete(ck);
    const konto = await kvJson(env, kontoSchluessel(eh)) || { email, erstellt: new Date().toISOString(), test: {}, lizenz: {}, kaeufe: [], sitzungen: [] };
    const token = hex(crypto.getRandomValues(new Uint8Array(32))), th = await sha256(token);
    await env.USAGE.put("lizenz:sitzung:" + th, JSON.stringify({ eh, at: new Date().toISOString() }), { expirationTtl: SITZUNG_TAGE * 86400 });
    // je Person höchstens LIZENZ_GERAETE Geräte: das älteste fällt heraus
    konto.sitzungen = [...(konto.sitzungen || []), th];
    const max = geraete(env);
    while (konto.sitzungen.length > max) await env.USAGE.delete("lizenz:sitzung:" + konto.sitzungen.shift());
    await env.USAGE.put(kontoSchluessel(eh), JSON.stringify(konto));
    return json({ sitzung: token, ...await statusAntwort(env, eh, konto, werkzeug, lang) });
  }

  const s = await sitzungLesen(env, body.sitzung);
  if (pfad === "abmelden") {
    if (s) { await env.USAGE.delete(s.k); s.konto.sitzungen = (s.konto.sitzungen || []).filter(h => "lizenz:sitzung:" + h !== s.k); await env.USAGE.put(kontoSchluessel(s.eh), JSON.stringify(s.konto)); }
    return json({ ok: true });
  }
  if (!s) return json({ error: t.sitzung, abgemeldet: true }, 401);
  if (pfad === "status") return json(await statusAntwort(env, s.eh, s.konto, werkzeug, lang));
  if (pfad === "kaufen") {
    // Nur der Klick auf „Zahlungspflichtig bestellen“ nach der Zusammenfassung startet die Zahlung (ältere Fassungen ohne Zusammenfassung nicht)
    if (body.bestellt !== true) return json({ error: t.nichtBestellt }, 409);
    if (stripeBereit(env, werkzeug)) {
      const ziel = await stripeCheckout(env, s.konto, s.eh, werkzeug, lang);
      return ziel ? json({ url: ziel }) : json({ error: t.kaufFehler }, 502);
    }
    if (env.LIZENZ_TESTKAUF === "1") {
      const konto = await gewaehren(env, s.eh, werkzeug, "testkauf", "test-" + Date.now());
      return json({ testkauf: true, ...await statusAntwort(env, s.eh, konto, werkzeug, lang) });
    }
    return json({ error: t.kaufAus }, 503);
  }
  return json({ error: "Nicht gefunden." }, 404);
}
