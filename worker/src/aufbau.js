// Aufbau eines nicht erkannten Kontoauszugs aus dem Werkzeug „Buchungsstapel-Generator“ (englisch „Booking Batch Generator“).
// POST /aufbau. Body (text/plain mit JSON, damit der Browser keine CORS-Vorabfrage braucht): { aufbau, bank, fassung, sprache }.
// Meldungen an das Werkzeug kommen in dessen Sprache (sprache: "en" seit Werkzeug-Fassung d296ef1, sonst deutsch).
// Das Werkzeug läuft meist als lokal geöffnete Datei (Origin „null“) – deshalb ist nur dieser Pfad für jede Herkunft offen,
// ohne Cookies und ohne Anmeldung. Der Worker prüft, dass der Text wirklich ohne Inhalt ist (keine Ziffern außer 9, Wörter nur
// aus x/X oder bekannten Spalten- und Fachwörtern; am Zeilenende darf in eckigen Klammern die Lage der Textblöcke stehen, das
// sind nur Zahlen), begrenzt die Menge und stellt ihn per Resend an MAIL_TO zu (als Anhang).
// Gespeichert wird nichts außer einem Tageszähler ohne Personenbezug (aufbau:YYYY-MM-DD).

const KOEPFE = ["Aufbau eines Kontoauszugs, ohne Inhalt", "Layout of a bank statement, without content"];
const MAX_ZEICHEN = 150000, MAX_ZEILEN = 3000;
// Dieselbe Liste wie BEKANNT in browser/src/auszug.js des Werkzeugs (Repository buchungsstapel-lokal)
const BEKANNT = new Set(("datum buchung buchungstag buchungsdatum wert valuta wertstellung vorgang erläuterung betrag soll haben eur "
  + "euro kontostand saldo alter neuer alt neu übertrag seite von blatt am vom per bis iban bic kontoauszug auszug nr umsätze umsatz "
  + "belastung lasten gutschrift gutschriften verwendungszweck empfänger auftraggeber beschreibung verbuchungsdatum angaben zu den "
  + "sepa lastschrift basislastschrift überweisung dauerauftrag kartenzahlung girocard entgelt entgelte zinsen abschluss "
  + "rechnungsabschluss anfangssaldo endsaldo summe in wir für sie gebucht referenz mandat eref mref svwz "
  + "date description incoming outgoing amount balance opening closing money out paid card transaction payment of issued by "
  + "received from sent to with reference converted cashback fee fees refund ending statement generated on page account holder "
  + "direct debit transfer topped up jan feb mar apr may jun jul aug sep oct nov dec").split(" "));

const perIp = new Map(); // je Instanz: ip -> [timestamps]
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });

// Meldungen in der Sprache des Werkzeugs; Schlüssel ist der deutsche Text
const EN = {
  "Kein Aufbau erhalten.": "No layout received.", "Der Aufbau ist zu lang.": "The layout is too long.",
  "Das ist kein Aufbau aus dem Werkzeug.": "This is not a layout from the tool.", "Der Aufbau hat zu viele Zeilen.": "The layout has too many lines.",
  "Zeile {n} hat nicht das Format des Aufbaus.": "Line {n} does not have the layout format.",
  "Zeile {n} enthält Ziffern – der Aufbau muss ohne Inhalt sein.": "Line {n} contains digits – the layout must be without content.",
  "Zeile {n} enthält Klartext – der Aufbau muss ohne Inhalt sein.": "Line {n} contains plain text – the layout must be without content.",
  "Ungültige Anfrage.": "Invalid request.", "Für diese Stunde reicht es – bitte später noch einmal senden.": "That is enough for this hour – please send again later.",
  "Heute sind schon viele Aufbauten eingegangen – bitte morgen noch einmal senden.": "Many layouts have already arrived today – please send again tomorrow.",
  "Der Empfang ist gerade nicht eingerichtet.": "Receiving is not set up at the moment.", "Das Senden hat nicht geklappt.": "Sending did not work.",
};
const uebersetzen = (sprache, text, n) => ((sprache === "en" && EN[text]) || text).replace("{n}", n);

// Ist der Text ein Aufbau ohne Inhalt? Liefert null oder eine Fehlermeldung (in der Sprache des Werkzeugs).
export function pruefeAufbau(text, sprache = "de") {
  const f = (t, n) => uebersetzen(sprache, t, n);
  if (typeof text !== "string" || text.length < 50) return f("Kein Aufbau erhalten.");
  if (text.length > MAX_ZEICHEN) return f("Der Aufbau ist zu lang.");
  const zeilen = text.replace(/\r\n?/g, "\n").split("\n");
  if (!KOEPFE.some(k => zeilen[0].startsWith(k))) return f("Das ist kein Aufbau aus dem Werkzeug.");
  if (zeilen.length > MAX_ZEILEN) return f("Der Aufbau hat zu viele Zeilen.");
  for (const [i, z] of zeilen.slice(1).entries()) {
    if (!z.trim()) continue;
    // Seite, Höhe, linker Rand, Text, wahlweise die Lage der Textblöcke („   [72 323 451]“, seit Werkzeug-Fassung 9c301c2)
    const m = z.match(/^\s*\d{1,3}\s+-?\d{1,5}\s+-?\d{1,5} {2}(.*?)(?: {3}\[-?\d{1,5}(?: -?\d{1,5}){1,40}\])?$/);
    if (!m) return f("Zeile {n} hat nicht das Format des Aufbaus.", i + 2);
    if (/[0-8]/.test(m[1]) || /[^\P{Nd}9]/u.test(m[1])) return f("Zeile {n} enthält Ziffern – der Aufbau muss ohne Inhalt sein.", i + 2);
    for (const w of m[1].split(/\s+/)) {
      const buchstaben = w.replace(/\P{L}/gu, "");
      if (buchstaben && !/^[xX]+$/.test(buchstaben) && !BEKANNT.has(w.toLowerCase().replace(/[^a-zäöüß]/g, ""))) {
        return f("Zeile {n} enthält Klartext – der Aufbau muss ohne Inhalt sein.", i + 2);
      }
    }
  }
  return null;
}

export async function handleAufbau(request, env, ctx) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return json({ error: "Nicht gefunden." }, 404);
  const laenge = +(request.headers.get("content-length") || 0);
  if (laenge > MAX_ZEICHEN * 4) return json({ error: "Der Aufbau ist zu lang." }, 413);
  let body;
  try { body = JSON.parse(await request.text()); } catch { return json({ error: "Ungültige Anfrage." }, 400); }
  const sprache = body.sprache === "en" ? "en" : "de", f = t => uebersetzen(sprache, t);
  const aufbau = typeof body.aufbau === "string" ? body.aufbau.replace(/\r\n?/g, "\n") : "";
  const fehler = pruefeAufbau(aufbau, sprache);
  if (fehler) return json({ error: fehler }, 400);
  const bank = String(body.bank == null ? "" : body.bank).replace(/[\p{C}]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  const fassung = /^([0-9a-f]{7}\+?|unbekannt)$/.test(String(body.fassung)) ? String(body.fassung) : "unbekannt";

  // Grenzen: 3 je Adresse und Stunde (je Instanz), MAX_AUFBAU_PER_DAY am Tag insgesamt (ohne Personenbezug)
  const ip = request.headers.get("CF-Connecting-IP") || "0", jetzt = Date.now();
  const gesendet = (perIp.get(ip) || []).filter(x => jetzt - x < 3600_000);
  if (gesendet.length >= 3) return json({ error: f("Für diese Stunde reicht es – bitte später noch einmal senden.") }, 429);
  let tagKey = null;
  if (env.USAGE) {
    tagKey = "aufbau:" + new Date().toISOString().slice(0, 10);
    if (+(await env.USAGE.get(tagKey) || 0) >= +(env.MAX_AUFBAU_PER_DAY || 20)) {
      return json({ error: f("Heute sind schon viele Aufbauten eingegangen – bitte morgen noch einmal senden.") }, 429);
    }
  }
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return json({ error: f("Der Empfang ist gerade nicht eingerichtet.") }, 503);

  const datum = new Date().toISOString().slice(0, 10), zeilen = aufbau.split("\n").length;
  const text = [
    "Ein Kontoauszug wurde vom Werkzeug „Buchungsstapel-Generator“ nicht erkannt; der Aufbau ohne Inhalt liegt im Anhang.", "",
    `Fassung des Werkzeugs: ${fassung}${sprache === "en" ? " (englische Fassung „Booking Batch Generator“)" : ""}`, `Bank (Angabe des Absenders): ${bank || "–"}`, `Zeilen: ${zeilen}`, "",
    "Zum Nachrüsten: Aufbau in buchungsstapel-lokal als Muster nachbauen (tests/bankmuster.py) und beide Leser prüfen.",
  ].join("\n");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": "Bearer " + env.RESEND_API_KEY },
    body: JSON.stringify({ from: env.MAIL_FROM || "Goch <onboarding@resend.dev>", to: [env.MAIL_TO],
      subject: `Werkzeug: Aufbau eines Kontoauszugs${bank ? " (" + bank + ")" : ""}`, text,
      attachments: [{ filename: `Aufbau_Kontoauszug_${datum}.txt`, content: Buffer.from(aufbau, "utf8").toString("base64") }] }),
  }).catch(() => null);
  if (!r || !r.ok) {
    console.error("Aufbau: Resend", r && r.status); // keine Inhalte ins Protokoll
    return json({ error: f("Das Senden hat nicht geklappt.") }, 502);
  }
  gesendet.push(jetzt); perIp.set(ip, gesendet);
  if (tagKey) ctx.waitUntil(env.USAGE.put(tagKey, String(+(await env.USAGE.get(tagKey) || 0) + 1), { expirationTtl: 35 * 86400 }));
  return json({ ok: true });
}
