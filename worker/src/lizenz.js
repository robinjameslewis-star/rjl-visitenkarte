// Lizenzen für SmartFormular E-Rechnung Start und Buchhaltung Start (bis 20.11.2026: E-Rechnung lite, FiBu lite; Robin, 01.11.2026): bis 31.12.2026 ohne Anmeldung kostenlos testen,
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
//                                    seit 21.11.2026 ergänzt (alte Konten gelten unverändert): sperre: {werkzeug: {ab, grund, quelle, id, am}},
//                                    verlauf: [{aktion, werkzeug, grund, quelle, id, am}], erklaerungen: [{art, vertrag, id, am}]
//   lizenz:ereignis:<evt_…>          { typ, bezug, stand: "fertig"|"fehler", versuche, am }  – Ereignisprotokoll Stripe, 90 Tage
//   lizenz:zahlung:<pi_…>            { eh, werkzeug, cs, am }          – Zahlung → Konto (Erstattung und Rückbuchung kennen nur die Zahlung)
//   lizenz:offen:<cs_…>              { eh, werkzeug, cs, pi, grund, am } – bezahlt, Lizenz noch nicht im Konto; der tägliche Abgleich meldet es
//   lizenz:erstattet:<pi_…>          { charge, am }                    – Erstattung kam vor der Zahlung an (Reihenfolge bei Stripe nicht fest)
//   lizenz:checkout:<eh>:<werkzeug>  { id, am }                        – offener Kauf; der Status fragt Stripe, falls der Webhook fehlt
//   lizenz:sitzung:<sha256(token)>   { eh, at }                       – läuft nach SITZUNG_TAGE ohne Nutzung ab
//   lizenz:code:<eh>                 { hash, exp, tries }             – zehn Minuten
//   lizenz:codes:<eh>:<Stunde>, lizenz:codes:<Tag>                    – Zähler gegen Missbrauch
// <eh> = SHA-256 von "lizenz:" + E-Mail-Adresse (klein geschrieben).

// Namen seit 20.11.2026 (Robin: „Lite gefällt mir nicht mehr …“, „Weg 3“, „Ja, so bestätigt“): nur der angezeigte Name ändert sich,
// die Kennungen erechnung/fibu bleiben (gekaufte Lizenzen und Signaturen gelten weiter). Seiten: Rückkehr nach Stripe je Herkunft –
// wer auf smartformular.ai kauft, kehrt dorthin zurück; alle anderen (robin.vision, heruntergeladene Datei mit Origin „null“) wie bisher.
export const SMARTFORMULAR = "https://smartformular.ai";
export const WERKZEUGE = {
  erechnung: { name: "SmartFormular E-Rechnung Start", nameEn: "SmartFormular E-Invoice Start",
    seite: "https://robin.vision/werkzeuge/e-rechnung-pruefen/", seiteEn: "https://robin.vision/werkzeuge/e-invoice-viewer/",
    neu: SMARTFORMULAR + "/e-rechnung-start/", neuEn: SMARTFORMULAR + "/en/e-invoice-start/" },
  fibu: { name: "SmartFormular Buchhaltung Start", nameEn: "SmartFormular Bookkeeping Start",
    seite: "https://robin.vision/werkzeuge/buchungsstapel-generator/", seiteEn: "https://robin.vision/werkzeuge/booking-batch-generator/",
    neu: SMARTFORMULAR + "/buchhaltung-start/", neuEn: SMARTFORMULAR + "/en/bookkeeping-start/" },
};
// Seite für die Rückkehr: nur die feste Herkunft https://smartformular.ai führt auf die neuen Seiten, sonst die bisherigen Adressen.
export function rueckkehrSeite(werkzeug, lang, herkunft) {
  const w = WERKZEUGE[werkzeug], en = lang === "en";
  return herkunft === SMARTFORMULAR ? (en ? w.neuEn : w.neu) : (en ? w.seiteEn : w.seite);
}
import { kostenBuchen, buchenIn, adresseFrei } from "./kosten.js";

// Einstellungen des Lizenzdienstes an einer Stelle (Robin, 21.11.2026: „der lizenzdienst muss ganz umziehen, dann mit smartformular
// auch als gesamtpaket verkauft werden kann“). Marke, Absender, Kontakt und Preise kommen aus [vars]; die Vorgaben ergeben genau die
// bisherigen Texte. Die Rückkehradressen nach Stripe stehen oben in WERKZEUGE (rueckkehrSeite). Hinweise an den Betreiber gehen über
// deps.melden, das der Worker mitgibt (index.js: notifyOnce) – der Dienst selbst kennt keine Empfängeradresse.
export function einstellungen(env) {
  return {
    marke: env.LIZENZ_MARKE || "SmartFormular",
    absender: env.LIZENZ_MAIL_FROM || "SmartFormular <lizenz@robin.vision>",
    kontakt: env.LIZENZ_KONTAKT || "robin@robin.vision",
    fuss: env.LIZENZ_MAIL_FUSS || "Robin James Lewis · robin.vision",
    preis: werkzeug => env["LIZENZ_PREIS_" + werkzeug.toUpperCase()] || env.LIZENZ_PREIS || "",
    stripePreis: werkzeug => env["STRIPE_PREIS_" + werkzeug.toUpperCase()],
  };
}
// Beginn der Lizenzpflicht: 1. Januar 2027, 0 Uhr in Deutschland (MEZ = UTC+1)
export const LIZENZPFLICHT_AB = Date.UTC(2026, 11, 31, 23);
const TAG = 86400000;
export const TEST_TAGE = 28, LIZENZ_TAGE = 365, OFFLINE_TAGE = 30, SITZUNG_TAGE = 400;
const CODE_TTL = 600, MAX_TRIES = 5, MAX_CODES_JE_ADRESSE_STUNDE = 5, MAX_CODES_JE_IP_STUNDE = 10;

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS } });

const TEXT = {
  de: {
    ungueltig: "Ungültige Anfrage.", email: "Bitte eine gültige E-Mail-Adresse eingeben.", werkzeug: "Unbekanntes Werkzeug.",
    unterwegs: "Der Code ist unterwegs.", zuViele: "Für diese Stunde reicht es – bitte später noch einmal versuchen.",
    keinCode: "Kein gültiger Code. Bitte einen neuen anfordern.", versuche: "Zu viele Versuche. Bitte einen neuen Code anfordern.",
    falsch: "Der Code stimmt nicht.", sitzung: "Bitte neu anmelden.", nichtEingerichtet: "Die Lizenzprüfung ist gerade nicht eingerichtet.",
    kaufAus: k => `Der Kauf ist noch nicht freigeschaltet. Bitte schreiben Sie an ${k}.`, kaufFehler: "Der Kauf ließ sich gerade nicht starten. Bitte später noch einmal versuchen.", sendFehler: "Der Code ließ sich gerade nicht senden. Bitte später noch einmal versuchen.",
    betreff: (c, m) => `Ihr Anmeldecode für ${m}: ${c}`,
    mail: (c, w, f) => `Ihr Code für ${w}: ${c}\n\nEr gilt zehn Minuten. Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail – ohne den Code passiert nichts.\n\n${f}`,
  },
  en: {
    ungueltig: "Invalid request.", email: "Please enter a valid email address.", werkzeug: "Unknown tool.",
    unterwegs: "The code is on its way.", zuViele: "That is enough for this hour – please try again later.",
    keinCode: "No valid code. Please request a new one.", versuche: "Too many attempts. Please request a new code.",
    falsch: "The code is not correct.", sitzung: "Please sign in again.", nichtEingerichtet: "Licence checking is not set up at the moment.",
    kaufAus: k => `Purchasing is not open yet. Please write to ${k}.`, kaufFehler: "The purchase could not be started just now. Please try again later.", sendFehler: "The code could not be sent just now. Please try again later.",
    betreff: (c, m) => `Your ${m} sign-in code: ${c}`,
    mail: (c, w, f) => `Your code for ${w}: ${c}\n\nIt is valid for ten minutes. If you did not try to sign in, ignore this email – nothing happens without the code.\n\n${f}`,
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
    s = { privat: await crypto.subtle.exportKey("jwk", paar.privateKey), oeffentlich: await crypto.subtle.exportKey("jwk", paar.publicKey), erstellt: new Date(Date.now()).toISOString() };
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

// ---------- Konto: Lesen-Ändern-Schreiben unter Schloss ----------
// Konto-Änderungen (Anmeldung, Abmeldung, Teststart, Kauf, Sperre) liefen bisher als Lesen-Ändern-Schreiben ohne Absprache:
// zwei gleichzeitige Änderungen konnten sich überschreiben (Lücke 2). Jetzt nimmt jede Änderung ein Schloss je Konto im
// Durable Object „Geraetebudget“ (Bindung GERAETE, Pfad /schloss, src/kiosk.js): mit Ablauf und eigener Kennung, freigegeben in finally.
// Grenze (ehrlich): KV selbst kennt keine Sperre und kein „nur schreiben, wenn unverändert“. Ein Lesen an einem anderen Standort von
// Cloudflare kann bis etwa 60 Sekunden einen älteren Stand liefern, auch unter dem Schloss. Darum stehen die Tatsachen, die nie verloren
// gehen dürfen, zusätzlich in eigenen Schlüsseln, bevor das Konto geändert wird (lizenz:zahlung:, lizenz:offen:), und der tägliche
// Abgleich trägt eine verlorene Lizenz nach. Ohne Bindung (alte Tests) läuft die Änderung ohne Schloss.
const SCHLOSS_MS = 15000;
const warten = ms => new Promise(r => setTimeout(r, ms));
async function schlossNehmen(env, name) {
  if (!env.GERAETE) return { ohne: true };
  const wer = hex(crypto.getRandomValues(new Uint8Array(8)));
  try {
    const o = env.GERAETE.get(env.GERAETE.idFromName(name));
    for (let i = 0; i < 25; i++) {
      const r = await o.fetch("https://geraet/schloss", { method: "POST", body: JSON.stringify({ aktion: "nehmen", wer, ms: SCHLOSS_MS }) });
      if ((await r.json()).ok === true) return { o, wer };
      await warten(40 + i * 20);
    }
    return { belegt: true };
  } catch (e) { console.error("Lizenz: Schloss", String(e && e.message || e).slice(0, 200)); return { fehler: true }; }
}
async function schlossGeben(s) {
  if (s.o) await s.o.fetch("https://geraet/schloss", { method: "POST", body: JSON.stringify({ aktion: "geben", wer: s.wer }) }).catch(() => {});
}
export class KontoFehler extends Error {}
// aendern(konto | null) ändert das Konto im Speicher und gibt true zurück, wenn geschrieben werden soll (oder ein neues Konto).
// streng: ohne Schloss lieber Fehler (Webhook – Stripe wiederholt) als ein Schreiben ohne Absprache.
export async function mitKonto(env, eh, aendern, { streng = false } = {}) {
  const schloss = await schlossNehmen(env, "lizenz:konto:" + eh);
  if ((schloss.belegt || schloss.fehler) && streng) throw new KontoFehler("Schloss nicht verfügbar");
  try {
    let konto = await kvJson(env, kontoSchluessel(eh));
    const erg = await aendern(konto);
    if (erg && typeof erg === "object") konto = erg;
    if (erg && konto) await env.USAGE.put(kontoSchluessel(eh), JSON.stringify(konto));
    return konto;
  } finally { await schlossGeben(schloss); }
}

// ---------- Konto und Status ----------
const bisMs = iso => iso ? Date.parse(iso) : 0;
const VERLAUF_MAX = 50, ERKLAERUNGEN_MAX = 20;
const sperreVon = (konto, werkzeug, jetzt) => { const s = konto.sperre?.[werkzeug]; return s && bisMs(s.ab) <= jetzt ? s : null; };
function verlauf(konto, eintrag) { konto.verlauf = [...(konto.verlauf || []), { ...eintrag, am: new Date(Date.now()).toISOString() }].slice(-VERLAUF_MAX); }

// Stand eines Werkzeugs für ein Konto. Der Test beginnt bei der ersten Abfrage ab der Lizenzpflicht (vorher braucht niemand ihn).
// Gesperrt (Erstattung, Rückbuchung, von Hand) geht allem vor, auch einem laufenden Test: typ „gesperrt“, bis = Beginn der Sperre.
// Das Werkzeug kennt den Typ nicht, behandelt ihn aber wie jeden Stand außer „test“ und „lizenz“: nicht frei, Maske mit Kaufweg.
function stand(konto, werkzeug, jetzt) {
  const sperre = sperreVon(konto, werkzeug, jetzt);
  if (sperre) return { typ: "gesperrt", bis: bisMs(sperre.ab), neu: false };
  const lizenzBis = bisMs(konto.lizenz?.[werkzeug]);
  if (lizenzBis > jetzt) return { typ: "lizenz", bis: lizenzBis, neu: false };
  let testBis = bisMs(konto.test?.[werkzeug]), neu = false;
  if (!testBis) { testBis = Math.max(jetzt, LIZENZPFLICHT_AB) + TEST_TAGE * TAG; neu = true; }
  if (testBis > jetzt) return { typ: "test", bis: testBis, neu };
  return { typ: lizenzBis ? "abgelaufen" : "testende", bis: Math.max(lizenzBis, testBis), neu };
}

async function statusAntwort(env, eh, konto, werkzeug) {
  const jetzt = Date.now();
  let s = stand(konto, werkzeug, jetzt);
  if (s.neu) {
    konto = await mitKonto(env, eh, k => {
      if (!k || k.test?.[werkzeug]) return false;
      k.test = { ...(k.test || {}), [werkzeug]: new Date(s.bis).toISOString() };
      return true;
    }) || konto;
    s = stand(konto, werkzeug, jetzt);
  }
  const frei = s.typ === "lizenz" || s.typ === "test";
  // offline gültig bis: höchstens OFFLINE_TAGE, nie über das Ende von Test oder Lizenz hinaus. Grenze: ein vor der Sperre ausgestellter
  // Status gilt im Werkzeug ohne Netz weiter bis zu seinem gueltigBis (höchstens OFFLINE_TAGE); online sieht das Werkzeug die Sperre sofort.
  const inhalt = { w: werkzeug, typ: s.typ, bis: s.bis, gueltigBis: frei ? Math.min(s.bis, jetzt + OFFLINE_TAGE * TAG) : jetzt, ausgestellt: jetzt, email: konto.email };
  // Eine gesperrte Lizenz darf neu gekauft werden: der neue Kauf hebt die Sperre auf (gewaehren), sonst endete er bezahlt, aber gesperrt.
  return { status: inhalt, token: await signieren(env, inhalt), preis: einstellungen(env).preis(werkzeug), kauf: !!(stripeBereit(env, werkzeug) || env.LIZENZ_TESTKAUF === "1") };
}

async function sitzungLesen(env, token) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return null;
  const k = "lizenz:sitzung:" + await sha256(token), s = await kvJson(env, k);
  if (!s) return null;
  const konto = await kvJson(env, kontoSchluessel(s.eh));
  if (!konto) return null;
  // Sitzung bei Nutzung verlängern – höchstens einmal am Tag schreiben
  if (Date.now() - Date.parse(s.at) > TAG) await env.USAGE.put(k, JSON.stringify({ ...s, at: new Date(Date.now()).toISOString() }), { expirationTtl: SITZUNG_TAGE * 86400 });
  return { eh: s.eh, konto, k };
}

// Lizenz gewähren oder verlängern (Kauf, Testkauf, später auch von Hand). Doppelte Zahlungs-IDs zählen nur einmal.
// Ein neuer Kauf hebt eine Sperre des Werkzeugs auf (vermerkt im Verlauf). Ergebnis: Konto oder null (Konto fehlt).
export async function gewaehren(env, eh, werkzeug, quelle, id = "", { pi = "", streng = false } = {}) {
  if (!WERKZEUGE[werkzeug]) return null;
  return mitKonto(env, eh, konto => {
    if (!konto) return false;
    konto.kaeufe ||= [];
    if (id && konto.kaeufe.some(k => k.id === id)) return false;
    // Sperre aus derselben Zahlung (Erstattung kam vor oder während der Verbuchung) bleibt; jede andere hebt ein neuer Kauf auf.
    // Dann beginnt das neue Jahr heute – die gesperrte Restzeit zählt nicht mit (sonst zwei Jahre für eine Zahlung nach Erstattung).
    const alt = konto.sperre?.[werkzeug], selbe = !!(alt && pi && alt.pi === pi), heben = alt && !selbe;
    const jetzt = Date.now(), ab = alt ? jetzt : Math.max(jetzt, bisMs(konto.lizenz?.[werkzeug]));
    const bis = new Date(ab + LIZENZ_TAGE * TAG).toISOString();
    // Zahlung schon erstattet (Sperre aus derselben Zahlung): Kauf vermerken, aber ohne Lizenzzeit
    if (selbe) { konto.kaeufe.push({ werkzeug, am: new Date(jetzt).toISOString(), bis, quelle, id, pi, erstattet: { grund: alt.grund, id: alt.id, am: new Date(jetzt).toISOString() } }); return true; }
    konto.lizenz = { ...(konto.lizenz || {}), [werkzeug]: bis };
    konto.kaeufe.push({ werkzeug, am: new Date(jetzt).toISOString(), bis, quelle, id, ...(pi ? { pi } : {}) });
    if (heben) {
      const { [werkzeug]: alt, ...rest } = konto.sperre;
      konto.sperre = rest;
      verlauf(konto, { aktion: "entsperrt", werkzeug, grund: "neuer Kauf", quelle, id, vorher: alt.grund });
    }
    return true;
  }, { streng });
}

// Sperren ab einem Zeitpunkt (Vorgabe: sofort). Gleiche Kennung zweimal ändert nichts. Ergebnis: Konto oder null.
export async function sperren(env, eh, werkzeug, { grund, quelle, id = "", pi = "", ab = null, streng = false }) {
  if (!WERKZEUGE[werkzeug]) return null;
  return mitKonto(env, eh, konto => !!konto && sperreSetzen(konto, werkzeug, { grund, quelle, id, pi, ab }), { streng });
}
function sperreSetzen(konto, werkzeug, { grund, quelle, id = "", pi = "", ab = null }) {
  const alt = konto.sperre?.[werkzeug];
  if (alt && id && alt.id === id) return false;
  const sperre = { ab: ab || new Date(Date.now()).toISOString(), grund, quelle, id, ...(pi ? { pi } : {}), am: new Date(Date.now()).toISOString() };
  konto.sperre = { ...(konto.sperre || {}), [werkzeug]: alt && bisMs(alt.ab) <= bisMs(sperre.ab) ? { ...sperre, ab: alt.ab } : sperre };
  verlauf(konto, { aktion: "gesperrt", werkzeug, grund, quelle, id });
  return true;
}

// Volle Erstattung oder Rückbuchung einer Zahlung (zweite Prüfung, 21.11.2026): trifft nur die Lizenzzeit aus genau dieser Zahlung.
// Der Kauf wird als erstattet markiert; läuft danach noch ein anderer, nicht erstatteter Kauf desselben Werkzeugs, gilt die Lizenz bis
// zum spätesten Ende der übrigen Käufe. Ist keiner mehr übrig – oder steht die Zahlung nicht in der Kaufliste (alte Konten, noch nicht
// verbucht) –, wird wie bisher gesperrt. Ergebnis { konto, folge: "gekuerzt" | "gesperrt" } oder null (Konto fehlt).
export async function zahlungErstatten(env, eh, werkzeug, { pi = "", cs = "", grund, quelle, id = "", streng = false }) {
  if (!WERKZEUGE[werkzeug]) return null;
  let folge = "gesperrt";
  const konto = await mitKonto(env, eh, k => {
    if (!k) return false;
    const jetzt = Date.now(), kaeufe = (k.kaeufe || []).filter(x => x.werkzeug === werkzeug);
    const kauf = kaeufe.find(x => (pi && x.pi === pi) || (cs && x.id === cs));
    if (!kauf) return sperreSetzen(k, werkzeug, { grund, quelle, id, pi });
    const neu = !kauf.erstattet;
    if (neu) kauf.erstattet = { grund, id, am: new Date(jetzt).toISOString() };
    const ende = Math.max(0, ...kaeufe.filter(x => !x.erstattet).map(x => bisMs(x.bis)));
    if (ende > jetzt) {
      folge = "gekuerzt";
      k.lizenz = { ...(k.lizenz || {}), [werkzeug]: new Date(ende).toISOString() };
      if (neu) verlauf(k, { aktion: "erstattet", werkzeug, grund, quelle, id, bis: k.lizenz[werkzeug] });
      return true;
    }
    return sperreSetzen(k, werkzeug, { grund, quelle, id, pi }) || neu;
  }, { streng });
  return konto ? { konto, folge } : null;
}
export async function entsperren(env, eh, werkzeug, { grund, quelle }) {
  if (!WERKZEUGE[werkzeug]) return null;
  return mitKonto(env, eh, konto => {
    if (!konto || !konto.sperre?.[werkzeug]) return false;
    const { [werkzeug]: alt, ...rest } = konto.sperre;
    konto.sperre = rest;
    verlauf(konto, { aktion: "entsperrt", werkzeug, grund, quelle, vorher: alt.grund });
    return true;
  });
}

// Erklärung aus „Vertrag widerrufen“ oder „Verträge hier kündigen“ (heute im Memberbereich, robin-vision-member,
// src/produkte/schulung/verbraucher.js) am Lizenzkonto vermerken. Sperrt nie selbst: die Formulare sind öffentlich und die Adresse ist
// nicht bestätigt – sonst könnte jeder fremde Lizenzen sperren. Die Sperre kommt mit der Erstattung (Webhook) oder von Robin (Redaktion).
export async function erklaerungVermerken(env, { email, art, vertrag = "", id = "", am = "" }, deps = {}) {
  email = String(email || "").trim().toLowerCase();
  if (!adresseOk(email) || !["widerruf", "kuendigung"].includes(art)) return { ok: false, fehler: "ungueltig" };
  const eh = await sha256("lizenz:" + email), eintrag = { art, vertrag: String(vertrag).replace(/\s+/g, " ").slice(0, 300), id: String(id).slice(0, 60), am: am || new Date(Date.now()).toISOString() };
  const konto = await mitKonto(env, eh, k => {
    if (!k) return false;
    if (eintrag.id && (k.erklaerungen || []).some(e => e.id === eintrag.id)) return false;
    k.erklaerungen = [...(k.erklaerungen || []), eintrag].slice(-ERKLAERUNGEN_MAX);
    return true;
  });
  if (konto) await deps.melden?.("lizenz-erklaerung-" + (eintrag.id || eh.slice(0, 16) + ":" + eintrag.am), `Lizenz: ${art === "widerruf" ? "Widerruf" : "Kündigung"} zu einem Lizenzkonto`,
    `Zu einem Lizenzkonto (${einstellungen(env).marke}) ist ${art === "widerruf" ? "ein Widerruf" : "eine Kündigung"} eingegangen (${eintrag.id || "ohne Kennung"}).\n` +
    `Die Lizenz ist nicht gesperrt. Bei Widerruf: in Stripe erstatten – die Erstattung sperrt die Lizenz von selbst – oder in der Redaktion unter „Lizenzen“ sperren.`);
  return { ok: true, konto: !!konto };
}

// Übersicht für die Redaktion: ohne Sitzungen, ohne Hashes
export async function kontoUebersicht(env, email) {
  email = String(email || "").trim().toLowerCase();
  if (!adresseOk(email)) return null;
  const konto = await kvJson(env, kontoSchluessel(await sha256("lizenz:" + email)));
  if (!konto) return { gefunden: false };
  const jetzt = Date.now();
  return { gefunden: true, email: konto.email, erstellt: konto.erstellt, geraete: (konto.sitzungen || []).length,
    werkzeuge: Object.fromEntries(Object.keys(WERKZEUGE).map(w => { const s = stand(konto, w, jetzt); return [w, { typ: s.neu ? "noch nicht begonnen" : s.typ, bis: s.neu ? null : new Date(s.bis).toISOString(), sperre: konto.sperre?.[w] || null }]; })),
    kaeufe: konto.kaeufe || [], verlauf: konto.verlauf || [], erklaerungen: konto.erklaerungen || [] };
}

// Geschützter Weg für Robin: nur aus der Redaktion (admin.js, nach Anmeldung und eigenem Kopf), kein eigener offener Pfad.
export async function lizenzVerwalten(env, eingabe, deps = {}) {
  const email = String(eingabe?.email || "").trim().toLowerCase(), werkzeug = eingabe?.werkzeug, grund = String(eingabe?.grund || "").replace(/\s+/g, " ").slice(0, 200);
  if (!adresseOk(email)) return { fehler: "Bitte eine gültige E-Mail-Adresse." };
  const eh = await sha256("lizenz:" + email);
  if (eingabe.aktion === "erklaerung") {
    const r = await erklaerungVermerken(env, { email, art: eingabe.art, vertrag: grund, id: "redaktion-" + Date.now() }, deps);
    return r.ok ? (r.konto ? { konto: await kontoUebersicht(env, email) } : { fehler: "Kein Lizenzkonto zu dieser Adresse." }) : { fehler: "Ungültige Erklärung." };
  }
  if (!WERKZEUGE[werkzeug]) return { fehler: "Unbekanntes Werkzeug." };
  if (eingabe.aktion === "sperren") { if (!grund) return { fehler: "Bitte einen Grund nennen." }; if (!await sperren(env, eh, werkzeug, { grund, quelle: "redaktion", id: "redaktion-" + Date.now() })) return { fehler: "Kein Lizenzkonto zu dieser Adresse." }; }
  else if (eingabe.aktion === "entsperren") { if (!await entsperren(env, eh, werkzeug, { grund: grund || "von Hand", quelle: "redaktion" })) return { fehler: "Kein Konto oder keine Sperre." }; }
  else if (eingabe.aktion !== "anzeigen") return { fehler: "Unbekannte Aktion." };
  return { konto: await kontoUebersicht(env, email) };
}

// ---------- Stripe ----------
const stripePreis = (env, werkzeug) => einstellungen(env).stripePreis(werkzeug);
const stripeBereit = (env, werkzeug) => !!(env.STRIPE_SECRET_KEY && stripePreis(env, werkzeug));
const STRIPE = "https://api.stripe.com/v1/";
const stripeHolen = (env, pfad) => fetch(STRIPE + pfad, { headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY } });
const CS = /^cs_(test|live)_[A-Za-z0-9]{1,200}$/, PI = /^pi_[A-Za-z0-9]{1,100}$/, EH = /^[0-9a-f]{64}$/;
const checkoutSchluessel = (eh, werkzeug) => `lizenz:checkout:${eh}:${werkzeug}`;
const TAGE_90 = 90 * 86400, TAGE_800 = 800 * 86400;

async function stripeCheckout(env, konto, eh, werkzeug, lang, herkunft = "") {
  const seite = rueckkehrSeite(werkzeug, lang, herkunft);
  const f = new URLSearchParams({
    mode: "payment", "line_items[0][price]": stripePreis(env, werkzeug), "line_items[0][quantity]": "1",
    customer_email: konto.email, client_reference_id: eh, "metadata[werkzeug]": werkzeug, "metadata[eh]": eh,
    "payment_intent_data[metadata][werkzeug]": werkzeug, "payment_intent_data[metadata][eh]": eh, "invoice_creation[enabled]": "true", locale: lang === "en" ? "en" : "de",
    // Rückkehr mit Sitzungs-ID (Stripe setzt sie ein): POST /lizenz/rueckkehr wertet sie aus, falls der Webhook noch fehlt
    success_url: seite + "?lizenz=gekauft&cs={CHECKOUT_SESSION_ID}", cancel_url: seite,
  });
  const r = await fetch(STRIPE + "checkout/sessions", {
    method: "POST", headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY, "content-type": "application/x-www-form-urlencoded" }, body: f,
  });
  if (!r.ok) { console.error("Lizenz: Stripe", r.status, (await r.text()).slice(0, 300)); return null; }
  const d = await r.json();
  // offener Kauf: der Status fragt Stripe nach dieser Sitzung, solange der Webhook fehlt (zwei Tage; Stripe-Sitzungen enden nach einem)
  if (d.id && CS.test(d.id)) await env.USAGE.put(checkoutSchluessel(eh, werkzeug), JSON.stringify({ id: d.id, am: new Date(Date.now()).toISOString() }), { expirationTtl: 2 * 86400 }).catch(() => {});
  return d.url || null;
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

// Bezahlte Checkout-Sitzung ins Konto: erst die Tatsachen in eigene Schlüssel (Zahlung → Konto, offene Bestellung), dann das Konto.
// Ergebnis { konto } oder { fehlt: true } (Konto nicht lesbar – Stripe soll wiederholen, der Abgleich meldet es).
async function bezahltVerbuchen(env, s, { streng = true } = {}) {
  const werkzeug = s.metadata?.werkzeug, eh = s.metadata?.eh || s.client_reference_id, pi = PI.test(s.payment_intent || "") ? s.payment_intent : "";
  const jetzt = new Date(Date.now()).toISOString();
  if (pi) await env.USAGE.put("lizenz:zahlung:" + pi, JSON.stringify({ eh, werkzeug, cs: s.id, am: jetzt }), { expirationTtl: TAGE_800 });
  const ok = "lizenz:offen:" + s.id;
  await env.USAGE.put(ok, JSON.stringify({ eh, werkzeug, cs: s.id, pi, grund: "in Arbeit", am: jetzt }), { expirationTtl: TAGE_90 });
  const konto = await gewaehren(env, eh, werkzeug, "stripe", s.id, { pi, streng });
  if (!konto || !(konto.kaeufe || []).some(k => k.id === s.id)) {
    await env.USAGE.put(ok, JSON.stringify({ eh, werkzeug, cs: s.id, pi, grund: konto ? "Kauf nicht im Konto" : "Konto fehlt", am: jetzt }), { expirationTtl: TAGE_90 });
    return { fehlt: true };
  }
  // Erstattung kam schon vor der Zahlung an: gleich sperren
  const erstattet = pi ? await kvJson(env, "lizenz:erstattet:" + pi) : null;
  if (erstattet) await zahlungErstatten(env, eh, werkzeug, { pi, cs: s.id, grund: "erstattung", quelle: "stripe", id: erstattet.charge || pi, streng });
  await env.USAGE.delete(ok);
  const offen = await kvJson(env, checkoutSchluessel(eh, werkzeug));
  if (offen && offen.id === s.id) await env.USAGE.delete(checkoutSchluessel(eh, werkzeug));
  return { konto };
}

// Zahlung → Konto und Werkzeug: über den eigenen Schlüssel, sonst über die Metadaten der Zahlung (payment_intent_data[metadata], seit
// 21.11.2026 mit eh). Zahlungen anderer Verkäufe desselben Stripe-Kontos (Memberbereich, Selbstbuchung) haben keins von beiden.
async function zahlungZuordnen(env, o) {
  const pi = PI.test(o.payment_intent || "") ? o.payment_intent : "";
  const z = pi ? await kvJson(env, "lizenz:zahlung:" + pi) : null;
  if (z && EH.test(z.eh || "") && WERKZEUGE[z.werkzeug]) return { ...z, pi };
  const m = o.metadata || {};
  if (EH.test(m.eh || "") && WERKZEUGE[m.werkzeug]) return { eh: m.eh, werkzeug: m.werkzeug, pi };
  return { pi, unbekannt: true };
}

async function ereignisVerarbeiten(env, ev, deps) {
  const o = ev.data.object, typ = ev.type;
  if (typ === "checkout.session.completed" || typ === "checkout.session.async_payment_succeeded") {
    const werkzeug = o.metadata?.werkzeug, eh = o.metadata?.eh || o.client_reference_id;
    if (!WERKZEUGE[werkzeug] || !EH.test(eh || "") || !CS.test(o.id || "")) return { ignoriert: true };
    if (o.payment_status !== "paid") return { bezug: o.id }; // später bezahlt (Lastschrift): async_payment_succeeded folgt
    const r = await bezahltVerbuchen(env, o);
    return r.fehlt ? { fehler: "Konto fehlt", bezug: o.id } : { bezug: o.id };
  }
  if (typ === "checkout.session.async_payment_failed" || typ === "checkout.session.expired") {
    const werkzeug = o.metadata?.werkzeug, eh = o.metadata?.eh || o.client_reference_id;
    if (!WERKZEUGE[werkzeug] || !EH.test(eh || "")) return { ignoriert: true };
    // keine Lizenz gewährt (erst „paid“ gewährt), also nichts zu sperren; der offene Kauf ist erledigt
    const offen = await kvJson(env, checkoutSchluessel(eh, werkzeug));
    if (offen && offen.id === o.id) await env.USAGE.delete(checkoutSchluessel(eh, werkzeug));
    return { bezug: o.id };
  }
  if (typ === "charge.refunded" || typ === "charge.dispute.created") {
    const z = await zahlungZuordnen(env, o), rueck = typ === "charge.dispute.created";
    if (z.unbekannt) {
      // Erstattung vor der Zahlung verbucht? Merken; bezahltVerbuchen sperrt dann sofort. Fremde Zahlungen: nur dieser kurze Merker.
      if (z.pi && !rueck && o.refunded === true) await env.USAGE.put("lizenz:erstattet:" + z.pi, JSON.stringify({ charge: o.id, am: new Date(Date.now()).toISOString() }), { expirationTtl: TAGE_90 });
      return { ignoriert: true };
    }
    const voll = rueck || o.refunded === true || (+o.amount > 0 && +o.amount_refunded >= +o.amount);
    if (!voll) {
      await deps.melden?.("lizenz-teilerstattung-" + o.id, "Lizenz: Teilerstattung – Lizenz bleibt frei", `Zur Zahlung ${z.pi || "?"} (${z.werkzeug}) wurde ein Teil erstattet (${o.amount_refunded} von ${o.amount} Cent). Die Lizenz bleibt frei. Sperren bei Bedarf in der Redaktion unter „Lizenzen“.`);
      return { bezug: z.pi };
    }
    const r = await zahlungErstatten(env, z.eh, z.werkzeug, { pi: z.pi, cs: z.cs || "", grund: rueck ? "rueckbuchung" : "erstattung", quelle: "stripe", id: o.id, streng: true });
    if (!r) return { fehler: "Konto fehlt", bezug: z.pi };
    const folgeText = r.folge === "gekuerzt" ? `Die Lizenzzeit aus dieser Zahlung ist entfallen; ein anderer Kauf läuft noch, die Lizenz gilt bis ${r.konto.lizenz[z.werkzeug].slice(0, 10)}.` : "Die Lizenz ist ab jetzt gesperrt.";
    if (rueck) await deps.melden?.("lizenz-rueckbuchung-" + o.id, "Lizenz: Rückbuchung", `Zur Zahlung ${z.pi || "?"} (${z.werkzeug}) hat die Bank eine Rückbuchung eröffnet (${o.id}). ${folgeText} Antwort an Stripe im Dashboard; entsperren in der Redaktion unter „Lizenzen“.`);
    return { bezug: z.pi };
  }
  return { ignoriert: true };
}

// Webhook: Fehlerantwort (500), wenn ein eigenes, bezahltes Ereignis nicht ankommt – Stripe stellt dann bis zu drei Tage neu zu.
// Ereignisprotokoll lizenz:ereignis:<id> (Vorbild stripe_ereignisse im Memberbereich): erst nach Erfolg „fertig“, ein doppeltes
// Ereignis danach ändert nichts. Gleichzeitig doppelt zugestellte Ereignisse sind trotzdem sicher: Kauf und Sperre sind je Kennung einmalig.
async function stripeWebhook(request, env, deps) {
  const roh = await request.text();
  if (!await stripeSignaturOk(env.STRIPE_WEBHOOK_SECRET, request.headers.get("stripe-signature"), roh)) return json({ error: "Signatur ungültig." }, 400);
  let ev = null; try { ev = JSON.parse(roh); } catch {}
  if (!ev || typeof ev.id !== "string" || !/^evt_[A-Za-z0-9_]{1,100}$/.test(ev.id) || !ev.data?.object) return json({ error: "Ungültig." }, 400);
  const ek = "lizenz:ereignis:" + ev.id, alt = await kvJson(env, ek), typ = String(ev.type).slice(0, 80);
  if (alt && alt.stand === "fertig") return json({ ok: true, doppelt: true });
  let erg;
  try { erg = await ereignisVerarbeiten(env, ev, deps); }
  catch (e) { console.error("Lizenz: Webhook", ev.id, String(e && e.message || e).slice(0, 200)); erg = { fehler: "vorübergehend" }; }
  if (erg.ignoriert) return json({ ok: true, ignoriert: true });
  if (erg.fehler) {
    await env.USAGE.put(ek, JSON.stringify({ typ, bezug: erg.bezug || "", stand: "fehler", grund: erg.fehler, versuche: (alt?.versuche || 0) + 1, am: new Date(Date.now()).toISOString() }), { expirationTtl: TAGE_90 }).catch(() => {});
    console.error("Lizenz: Ereignis nicht verbucht", ev.id, erg.fehler);
    return json({ error: "Vorübergehender Fehler." }, 500);
  }
  await env.USAGE.put(ek, JSON.stringify({ typ, bezug: erg.bezug || "", stand: "fertig", versuche: (alt?.versuche || 0) + 1, am: new Date(Date.now()).toISOString() }), { expirationTtl: TAGE_90 }).catch(() => {});
  return json({ ok: true });
}

// Rückkehr von Stripe, auch ohne Webhook: Sitzung bei Stripe nachsehen; gewährt nur, wenn sie zum angemeldeten Konto gehört.
// Ergebnis: "bezahlt" | "offen" | "abgelaufen" | "fremd" | null (Stripe nicht erreichbar oder nicht eingerichtet)
const nachgesehen = new Map(); // je Instanz: cs -> Zeitpunkt (höchstens alle 15 Sekunden bei Stripe nachsehen)
async function checkoutNachsehen(env, eh, werkzeug, cs) {
  if (!stripeBereit(env, werkzeug) || !CS.test(cs || "")) return null;
  const jetzt = Date.now();
  if (jetzt - (nachgesehen.get(cs) || 0) < 15000) return "offen";
  nachgesehen.set(cs, jetzt);
  let s; try { const r = await stripeHolen(env, "checkout/sessions/" + cs); if (!r.ok) return null; s = await r.json(); } catch { return null; }
  if (s.metadata?.eh !== eh || s.metadata?.werkzeug !== werkzeug) return "fremd";
  if (s.payment_status === "paid") return (await bezahltVerbuchen(env, s, { streng: false })).fehlt ? null : "bezahlt";
  if (s.status === "expired") { const offen = await kvJson(env, checkoutSchluessel(eh, werkzeug)); if (offen && offen.id === cs) await env.USAGE.delete(checkoutSchluessel(eh, werkzeug)); return "abgelaufen"; }
  return "offen";
}

// ---------- Täglicher Abgleich (scheduled, index.js) ----------
// Findet bezahlte Bestellungen ohne Lizenz: offene Einträge (lizenz:offen:) und – mit Stripe – bezahlte Checkout-Sitzungen der
// letzten ABGLEICH_TAGE. Gibt es das Konto, trägt er die Lizenz nach (einmalig je Sitzung) und sagt es; fehlt es, meldet er die
// Bestellung jeden Tag neu, bis sie erledigt ist. Ergebnis { fehlend, nachgetragen, stripe }.
const ABGLEICH_TAGE = 4, ABGLEICH_SEITEN = 10;
async function kvListe(env, prefix) {
  const namen = []; let cursor;
  if (typeof env.USAGE.list !== "function") return namen;
  for (let i = 0; i < 20; i++) {
    const r = await env.USAGE.list({ prefix, cursor });
    namen.push(...r.keys.map(k => k.name));
    if (r.list_complete || !r.cursor) break;
    cursor = r.cursor;
  }
  return namen;
}
export async function lizenzAbgleich(env, deps = {}) {
  if (!env.USAGE) return null;
  const fehlend = [], nachgetragen = [], gesehen = new Set();
  let stripe = "nicht eingerichtet";
  const pruefen = async (s, quelle) => {
    if (gesehen.has(s.id)) return; gesehen.add(s.id);
    const eh = s.metadata?.eh || s.client_reference_id, werkzeug = s.metadata?.werkzeug;
    const konto = await kvJson(env, kontoSchluessel(eh));
    if (konto && (konto.kaeufe || []).some(k => k.id === s.id)) { await env.USAGE.delete("lizenz:offen:" + s.id); return; }
    const r = konto ? await bezahltVerbuchen(env, s, { streng: false }).catch(() => ({ fehlt: true })) : { fehlt: true };
    if (r.fehlt) {
      if (!konto) await env.USAGE.put("lizenz:offen:" + s.id, JSON.stringify({ eh, werkzeug, cs: s.id, pi: s.payment_intent || "", grund: "Konto fehlt", am: new Date(Date.now()).toISOString() }), { expirationTtl: TAGE_90 }).catch(() => {});
      fehlend.push({ cs: s.id, werkzeug, quelle, grund: konto ? "Kauf nicht im Konto" : "Konto fehlt" });
    } else nachgetragen.push({ cs: s.id, werkzeug, quelle });
  };
  for (const k of await kvListe(env, "lizenz:offen:")) {
    const o = await kvJson(env, k);
    if (o && CS.test(o.cs || "") && EH.test(o.eh || "") && WERKZEUGE[o.werkzeug]) await pruefen({ id: o.cs, payment_intent: o.pi, metadata: { eh: o.eh, werkzeug: o.werkzeug }, payment_status: "paid" }, "offen");
  }
  if (env.STRIPE_SECRET_KEY) {
    try {
      const seit = Math.floor(Date.now() / 1000) - ABGLEICH_TAGE * 86400;
      let nach = "", seiten = 0;
      for (; seiten < ABGLEICH_SEITEN; seiten++) {
        const r = await stripeHolen(env, `checkout/sessions?limit=100&status=complete&created[gte]=${seit}${nach ? "&starting_after=" + nach : ""}`);
        if (!r.ok) throw new Error("Stripe " + r.status);
        const d = await r.json(), liste = d.data || [];
        for (const s of liste) if (s.payment_status === "paid" && CS.test(s.id || "") && WERKZEUGE[s.metadata?.werkzeug] && EH.test(s.metadata?.eh || s.client_reference_id || "")) await pruefen(s, "stripe");
        if (!d.has_more || !liste.length) break;
        nach = liste.at(-1).id;
      }
      stripe = seiten >= ABGLEICH_SEITEN ? "nur die ersten Seiten geprüft" : "geprüft";
    } catch (e) { stripe = "nicht erreichbar"; console.error("Lizenz: Abgleich", String(e && e.message || e).slice(0, 200)); }
  }
  if (fehlend.length || nachgetragen.length || stripe === "nicht erreichbar") {
    const zeile = x => `- ${x.cs} (${x.werkzeug}${x.grund ? ", " + x.grund : ""})`;
    await deps.melden?.("lizenz-abgleich-" + new Date(Date.now()).toISOString().slice(0, 10), `Lizenz-Abgleich: ${fehlend.length} bezahlte Bestellung(en) ohne Lizenz`,
      `Täglicher Abgleich des Lizenzdienstes (${einstellungen(env).marke}).\n\n` +
      (fehlend.length ? `Bezahlt, aber ohne Lizenz – bitte prüfen (Stripe: Zahlung und Kunde; Ereignis erneut senden oder erstatten):\n${fehlend.map(zeile).join("\n")}\n\n` : "") +
      (nachgetragen.length ? `Nachgetragen (bezahlt, Konto vorhanden, Lizenz fehlte; jetzt frei):\n${nachgetragen.map(zeile).join("\n")}\n\n` : "") +
      `Abgleich mit Stripe: ${stripe}.`);
  }
  return { fehlend, nachgetragen, stripe };
}

// Erklärungen aus dem Memberbereich (Widerruf, Kündigung): vorbereitete Schnittstelle, zu ohne LIZENZ_DIENST_SCHLUESSEL (Secret).
// Nur Vermerk am Konto und Hinweis an Robin, nie eine Sperre. Der Memberbereich ruft sie heute noch nicht auf.
async function erklaerungEingang(request, env, deps) {
  const soll = env.LIZENZ_DIENST_SCHLUESSEL;
  if (!soll || soll.length < 32) return json({ error: "Nicht gefunden." }, 404);
  const ist = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (await sha256("k:" + ist) !== await sha256("k:" + soll)) return json({ error: "Verweigert." }, 403);
  const body = await lesen(request);
  if (!body || typeof body !== "object") return json({ error: "Ungültig." }, 400);
  const r = await erklaerungVermerken(env, { email: body.email, art: body.art, vertrag: body.vertrag, id: body.id, am: body.am }, deps);
  return r.ok ? json({ ok: true, konto: r.konto }) : json({ error: "Ungültig." }, 400);
}

// ---------- Anfragen ----------
// deps.melden(art, betreff, text): Hinweis an den Betreiber (index.js: notifyOnce, je art einmal)
export async function handleLizenz(request, env, ctx, deps = {}) {
  const url = new URL(request.url), pfad = url.pathname.slice("/lizenz/".length);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (!env.USAGE) return json({ error: TEXT.de.nichtEingerichtet }, 503);
  if (pfad === "schluessel" && request.method === "GET") return json({ oeffentlich: (await schluessel(env)).oeffentlich });
  if (request.method !== "POST") return json({ error: "Nicht gefunden." }, 404);
  if (pfad === "stripe") return stripeWebhook(request, env, deps);
  if (pfad === "erklaerung") return erklaerungEingang(request, env, deps);

  const body = await lesen(request);
  const lang = body?.lang === "en" ? "en" : "de", t = TEXT[lang], e = einstellungen(env);
  if (!body || typeof body !== "object") return json({ error: t.ungueltig }, 400);
  const werkzeug = body.werkzeug;
  if (!WERKZEUGE[werkzeug]) return json({ error: t.werkzeug }, 400);

  if (pfad === "code") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!adresseOk(email)) return json({ error: t.email }, 400);
    const ip = request.headers.get("CF-Connecting-IP") || "?";
    if (!ipGrenze(ip) || !(await adresseFrei(env, "lizenz-code", ip))) return json({ error: t.zuViele }, 429);
    const eh = await sha256("lizenz:" + email), stunde = new Date(Date.now()).toISOString().slice(0, 13);
    const tag = "lizenz:codes:" + stunde.slice(0, 10), jeAdresse = `lizenz:codes:${eh}:${stunde}`;
    const n = +(await env.USAGE.get(jeAdresse) || 0), nTag = +(await env.USAGE.get(tag) || 0);
    if (n >= MAX_CODES_JE_ADRESSE_STUNDE || nTag >= +(env.MAX_LIZENZ_CODES_PER_DAY || 300)) return json({ error: t.zuViele }, 429);
    if (!env.RESEND_API_KEY) return json({ error: t.nichtEingerichtet }, 503);
    // Tagesdeckel atomar (Sicherheitsprüfung 11.11.2026, M4); der KV-Zähler davor bleibt als erste, schnelle Grenze
    const gebucht = await kostenBuchen(env, "lizenzcodes", 1, +(env.MAX_LIZENZ_CODES_PER_DAY || 300), "tag", nTag);
    if (!gebucht.ok) return gebucht.fehler ? json({ error: t.nichtEingerichtet }, 503) : json({ error: t.zuViele }, 429);
    await env.USAGE.put(jeAdresse, String(n + 1), { expirationTtl: 3600 });
    await env.USAGE.put(tag, String(gebucht.ohne ? nTag + 1 : gebucht.stand), { expirationTtl: 2 * 86400 });
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    await env.USAGE.put("lizenz:code:" + eh, JSON.stringify({ hash: await sha256(code), exp: Date.now() + CODE_TTL * 1000, tries: 0 }), { expirationTtl: CODE_TTL });
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + env.RESEND_API_KEY },
      body: JSON.stringify({ from: e.absender, to: [email], subject: t.betreff(code, e.marke), text: t.mail(code, t === TEXT.en ? WERKZEUGE[werkzeug].nameEn : WERKZEUGE[werkzeug].name, e.fuss) }),
    }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
    if (!r.ok) { console.error("Lizenz: Resend", r.status, (await r.text()).slice(0, 200)); return json({ error: t.sendFehler }, 502); }
    return json({ ok: true, hinweis: t.unterwegs });
  }

  if (pfad === "anmelden") {
    const email = String(body.email || "").trim().toLowerCase(), code = String(body.code || "").replace(/\D/g, "");
    if (!adresseOk(email)) return json({ error: t.email }, 400);
    if (!(await adresseFrei(env, "lizenz-anmelden", request.headers.get("CF-Connecting-IP") || "?"))) return json({ error: t.zuViele }, 429);
    const eh = await sha256("lizenz:" + email), ck = "lizenz:code:" + eh, eintrag = await kvJson(env, ck);
    if (!eintrag || eintrag.exp < Date.now()) return json({ error: t.keinCode }, 400);
    if (eintrag.tries >= MAX_TRIES) { await env.USAGE.delete(ck); return json({ error: t.versuche }, 400); }
    // Jeder Versuch zählt atomar je Code, bevor verglichen wird (M4): gleichzeitige Versuche kommen nicht über MAX_TRIES
    const versuch = await buchenIn(env, "lizenz:" + eh, "versuche:" + eintrag.hash.slice(0, 16), 1, MAX_TRIES, "gesamt");
    if (versuch.fehler) return json({ error: t.nichtEingerichtet }, 503); // Zähler nicht erreichbar: Code bleibt gültig
    if (!versuch.ok) { await env.USAGE.delete(ck); return json({ error: t.versuche }, 400); }
    if (code.length !== 6 || await sha256(code) !== eintrag.hash) {
      eintrag.tries += 1;
      await env.USAGE.put(ck, JSON.stringify(eintrag), { expirationTtl: CODE_TTL });
      return json({ error: t.falsch }, 400);
    }
    await env.USAGE.delete(ck);
    const token = hex(crypto.getRandomValues(new Uint8Array(32))), th = await sha256(token);
    await env.USAGE.put("lizenz:sitzung:" + th, JSON.stringify({ eh, at: new Date(Date.now()).toISOString() }), { expirationTtl: SITZUNG_TAGE * 86400 });
    // je Person höchstens LIZENZ_GERAETE Geräte: das älteste fällt heraus
    const max = Math.max(1, +(env.LIZENZ_GERAETE || 3)), weg = [];
    const konto = await mitKonto(env, eh, k => {
      k ||= { email, erstellt: new Date(Date.now()).toISOString(), test: {}, lizenz: {}, kaeufe: [], sitzungen: [] };
      k.sitzungen = [...(k.sitzungen || []), th];
      while (k.sitzungen.length > max) weg.push(k.sitzungen.shift());
      return k;
    });
    for (const h of weg) await env.USAGE.delete("lizenz:sitzung:" + h);
    return json({ sitzung: token, ...await statusAntwort(env, eh, konto, werkzeug) });
  }

  const s = await sitzungLesen(env, body.sitzung);
  if (pfad === "abmelden") {
    if (s) {
      await env.USAGE.delete(s.k);
      await mitKonto(env, s.eh, k => { if (!k) return false; k.sitzungen = (k.sitzungen || []).filter(h => "lizenz:sitzung:" + h !== s.k); return true; });
    }
    return json({ ok: true });
  }
  if (!s) return json({ error: t.sitzung, abgemeldet: true }, 401);
  if (pfad === "status") {
    // offener Kauf und noch keine Lizenz: bei Stripe nachsehen (Rückkehr ohne Webhook, Knopf „Status aktualisieren“)
    const offen = await kvJson(env, checkoutSchluessel(s.eh, werkzeug));
    if (offen && stand(s.konto, werkzeug, Date.now()).typ !== "lizenz" && await checkoutNachsehen(env, s.eh, werkzeug, offen.id) === "bezahlt")
      s.konto = await kvJson(env, kontoSchluessel(s.eh)) || s.konto;
    return json(await statusAntwort(env, s.eh, s.konto, werkzeug));
  }
  if (pfad === "rueckkehr") {
    // ?lizenz=gekauft&cs=… von Stripe: eine neuere Fassung des Werkzeugs schickt die Sitzungs-ID mit
    const cs = String(body.cs || "");
    if (!CS.test(cs)) return json({ error: t.ungueltig }, 400);
    if (!(await adresseFrei(env, "lizenz-rueckkehr", request.headers.get("CF-Connecting-IP") || "?"))) return json({ error: t.zuViele }, 429);
    const r = await checkoutNachsehen(env, s.eh, werkzeug, cs);
    if (r === "fremd") return json({ error: t.ungueltig }, 403);
    const konto = r === "bezahlt" ? await kvJson(env, kontoSchluessel(s.eh)) || s.konto : s.konto;
    return json({ ...await statusAntwort(env, s.eh, konto, werkzeug), kaufStand: r || "unbekannt" });
  }
  if (pfad === "kaufen") {
    if (stripeBereit(env, werkzeug)) {
      const ziel = await stripeCheckout(env, s.konto, s.eh, werkzeug, lang, request.headers.get("origin") || "");
      return ziel ? json({ url: ziel }) : json({ error: t.kaufFehler }, 502);
    }
    if (env.LIZENZ_TESTKAUF === "1") {
      const konto = await gewaehren(env, s.eh, werkzeug, "testkauf", "test-" + Date.now());
      return json({ testkauf: true, ...await statusAntwort(env, s.eh, konto, werkzeug) });
    }
    return json({ error: t.kaufAus(e.kontakt) }, 503);
  }
  return json({ error: "Nicht gefunden." }, 404);
}
