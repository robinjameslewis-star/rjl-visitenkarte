// Eingang „Workshop“ für den Memberbereich (Robin, 07.11.2026: „am liebsten, wenn ich die Workshops mit Goch einfach aus meinem
// Memberbereich heraus starten kann“). Nur über die Service Binding des Memberbereichs erreichbar (benannter Export, keine Route):
// keine Figur in der Redaktion, kein Messegerät, kein Gerätenachweis. Der Memberbereich prüft Robins Anmeldung und schickt die
// Figur mit jeder Anfrage; sie wird hier wie in der Redaktion geprüft. Abgerechnet wird über ein eigenes Tagesbudget („memberbereich“).
//   POST /chat           { figur: { …Felder wie in der Redaktion }, lang, messages, gesprochen, stimme, vortrag } → wie /kiosk/chat
//   POST /listen?lang=   WAV → wie /kiosk/listen
// Budget je Termin (07.11.2026): Schickt der Memberbereich den Kopf X-Workshop-Budget mit, zählt statt des Tagesbudgets ein
// eigenes Budget für diesen Termin, über die ganze Laufzeit („gesamt“, Durable Object „memberbereich:<termin>“):
//   X-Workshop-Budget: {"termin":"tr_…","antworten":N,"minuten":N,"zeichen":N}
// 0 sperrt; ohne Angabe gilt die Vorgabe, nach oben deckeln die Obergrenzen (beides unten, per [vars] änderbar). Zusätzlich
// zählt eine Summe über alle Termine je Tag („memberbereich:termine“, src/kiosk.js). Ohne Kopf bleibt alles wie bisher.
import { handleKiosk } from "./kiosk.js";
import { pruefeKundenfigur } from "./figuren.js";

export const GERAET = { id: "memberbereich", name: "Memberbereich", an: true, figuren: ["*"] };
export const TERMIN_ID = /^tr_[A-Za-z0-9_-]{1,40}$/;
// je Art: [Variable der Vorgabe, Vorgabe, Variable der Obergrenze, Obergrenze] – Antworten, Minuten Spracheingabe, vertonte Zeichen
const TERMIN = { antworten: ["WORKSHOP_TERMIN_ANTWORTEN", 150, "WORKSHOP_TERMIN_MAX_ANTWORTEN", 400],
  minuten: ["WORKSHOP_TERMIN_MINUTEN", 15, "WORKSHOP_TERMIN_MAX_MINUTEN", 60],
  zeichen: ["WORKSHOP_TERMIN_ZEICHEN", 40000, "WORKSHOP_TERMIN_MAX_ZEICHEN", 150000] };

const fehler = (text, status) => new Response(JSON.stringify({ error: text }), { status, headers: { "content-type": "application/json; charset=utf-8" } });
// ganze Zahl ≥ 0 (auch als Text aus [vars]), sonst null
const ganz = v => { const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? +v : NaN; return Number.isInteger(n) && n >= 0 ? n : null; };

// Kopf X-Workshop-Budget lesen: null ohne Kopf, sonst { id, termin, antworten, minuten, zeichen }; wirft bei kaputtem Kopf.
export function terminBudget(kopf, env) {
  if (kopf == null || kopf === "") return null;
  let b;
  try { b = JSON.parse(kopf); } catch { throw new Error("kein gültiges JSON."); }
  if (!b || typeof b !== "object" || typeof b.termin !== "string" || !TERMIN_ID.test(b.termin)) throw new Error("Termin: tr_ und danach A–Z, a–z, 0–9, _ oder -, höchstens 40 Zeichen.");
  const werte = {};
  for (const [art, [vorgabe, standard, max, maxStandard]] of Object.entries(TERMIN))
    werte[art] = Math.min(ganz(b[art]) ?? ganz(env[vorgabe]) ?? standard, ganz(env[max]) ?? maxStandard);
  return { id: "memberbereich:" + b.termin, termin: b.termin, ...werte };
}

export async function workshopAnfrage(request, env, ctx, deps) {
  const url = new URL(request.url), pfad = url.pathname;
  if (request.method !== "POST" || !["/chat", "/listen"].includes(pfad)) return fehler("Nicht gefunden.", 404);
  let b;
  try { b = terminBudget(request.headers.get("x-workshop-budget"), env); } catch (e) { return fehler("Budget: " + e.message, 400); }
  const geraet = b
    ? { ...GERAET, id: b.id, antwortenTag: b.antworten, minutenTag: b.minuten, zeichenTermin: b.zeichen, zeitraum: "gesamt", termin: true }
    : { ...GERAET, antwortenTag: Math.round(+env.WORKSHOP_ANTWORTEN_TAG) || 600, minutenTag: Math.round(+env.WORKSHOP_MINUTEN_TAG) || 60 };
  if (pfad === "/listen") {
    const weiter = new Request("https://workshop.intern/kiosk/listen" + url.search, { method: "POST", headers: request.headers, body: await request.arrayBuffer() });
    return handleKiosk(weiter, env, ctx, deps, { geraet, figur: null });
  }
  let body;
  try { body = await request.json(); } catch { return fehler("Ungültige Anfrage.", 400); }
  let figur;
  // Budget je Termin: Es begrenzt das Gerät; die Figur verlangt 1 bis 5000 (Prüfung wie in der Redaktion), 0 sperrt über das Gerät.
  try { figur = { ...pruefeKundenfigur({ ...(body && body.figur), einsatz: "workshop", antwortenTag: b ? Math.max(1, Math.min(5000, b.antworten)) : geraet.antwortenTag }), an: true }; }
  catch (e) { return fehler("Figur: " + e.message, 400); }
  const weiter = new Request("https://workshop.intern/kiosk/chat", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, figur: figur.id }) });
  return handleKiosk(weiter, env, ctx, deps, { geraet, figur });
}
