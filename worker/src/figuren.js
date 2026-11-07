// Figuren (FIGUREN.md). Goch ist öffentlich: Paket im Repository (figuren/goch/figur.json), Wissen in worker/*.md.
// Kundenfiguren für Vorführungen liegen nur im KV (figur:<id>), gepflegt in der Redaktion – nie in GitHub, nie über die
// öffentliche Route /chat erreichbar. Die Kiosk-Route liest sie erst nach Anmeldung des Geräts.
import GOCH from "../../figuren/goch/figur.json" with { type: "json" };

export const OEFFENTLICH = { goch: GOCH };
export const STANDARD = "goch";
export const KUNDEN_ID = /^kunde-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INDEX = "figuren:index";
const GRENZEN = { name: 60, rolle: 120, begruessung: 400, frage: 120, persoenlichkeit: 8000, wissen: 40000, quellen: 3000 };
export const EINSAETZE = ["messe", "workshop"];

// Öffentliche Route: nur Figuren aus dem Repository; ohne Angabe Goch. Unbekanntes → null (der Aufrufer antwortet 400).
export function oeffentlicheFigur(id) {
  if (id == null || id === "") return OEFFENTLICH[STANDARD];
  return typeof id === "string" && Object.hasOwn(OEFFENTLICH, id) ? OEFFENTLICH[id] : null;
}

export async function kundenfigur(env, id) {
  if (!env.USAGE || typeof id !== "string" || id.length > 40 || !KUNDEN_ID.test(id)) return null;
  try { const f = JSON.parse(await env.USAGE.get("figur:" + id)); return f && f.id === id ? f : null; } catch { return null; }
}

// Übersicht für die Redaktion (über einen Index statt list(): list() hinkt bis zu einer Minute hinterher)
export async function kundenfiguren(env) {
  let ids = [];
  try { ids = JSON.parse(await env.USAGE.get(INDEX)) || []; } catch {}
  const figuren = await Promise.all(ids.map(id => kundenfigur(env, id)));
  return figuren.filter(Boolean).map(f => ({ ...f, wissenWorte: f.wissen.split(/\s+/).filter(Boolean).length }));
}

const text = (v, max) => typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";

// Prüfen mit deutscher Fehlermeldung statt stillem Verwerfen (Redaktion für Laien).
export function pruefeKundenfigur(input) {
  const i = input && typeof input === "object" ? input : {};
  const id = text(i.id, 40).toLowerCase();
  if (!KUNDEN_ID.test(id)) throw new Error("Kennung: „kunde-“ und danach a–z, 0–9, Bindestriche (z. B. kunde-muster), höchstens 40 Zeichen.");
  const sprachen = (Array.isArray(i.sprachen) ? i.sprachen : []).filter(s => s === "de" || s === "en");
  if (!sprachen.length) throw new Error("Mindestens eine Sprache wählen.");
  const je = (feld, max) => Object.fromEntries(sprachen.map(s => [s, text(i[feld] && i[feld][s], max)]));
  const name = je("name", GRENZEN.name), rolle = je("rolle", GRENZEN.rolle), begruessung = je("begruessung", GRENZEN.begruessung);
  const fragen = Object.fromEntries(sprachen.map(s => [s, (Array.isArray(i.fragen && i.fragen[s]) ? i.fragen[s] : [])
    .map(q => text(q, GRENZEN.frage)).filter(Boolean).slice(0, 4)]));
  for (const s of sprachen) {
    if (!name[s]) throw new Error(`Name (${s}) fehlt.`);
    if (!begruessung[s]) throw new Error(`Begrüßung (${s}) fehlt.`);
  }
  const persoenlichkeit = text(i.persoenlichkeit, GRENZEN.persoenlichkeit), wissen = text(i.wissen, GRENZEN.wissen);
  if (wissen.length < 200) throw new Error("Wissen: mindestens ein paar Absätze (200 Zeichen) – sonst kann die Figur nichts erzählen.");
  const quellen = text(i.quellen, GRENZEN.quellen);
  if (!quellen) throw new Error("Quellen des Wissens angeben (Freigabe des Kunden oder öffentliche Seiten mit Abrufdatum).");
  const voiceId = text(i.voiceId, 40);
  if (voiceId && !/^[A-Za-z0-9]{10,40}$/.test(voiceId)) throw new Error("Voice ID: nur Buchstaben und Ziffern, wie bei ElevenLabs angezeigt.");
  const antwortenTag = Math.round(+i.antwortenTag || 200);
  if (!(antwortenTag >= 1 && antwortenTag <= 5000)) throw new Error("Antworten je Tag: 1 bis 5000.");
  // Einsatz (Robin, 24.10.2026): Messe (Stand, Standpersonal) oder Workshop (Schulung, Workshopleitung) – bestimmt den
  // Rahmen im Systemprompt (kiosk.js, kundenSystem). Ohne Angabe Messe, wie bisher.
  const einsatz = i.einsatz == null || i.einsatz === "" ? "messe" : i.einsatz;
  if (!EINSAETZE.includes(einsatz)) throw new Error("Einsatz: „messe“ oder „workshop“.");
  return { id, an: i.an !== false, einsatz, sprachen, name, rolle, begruessung, fragen, persoenlichkeit, wissen, quellen, voiceId, antwortenTag,
    geaendert: new Date().toISOString() };
}

export async function speichereKundenfigur(env, input) {
  const f = pruefeKundenfigur(input);
  await env.USAGE.put("figur:" + f.id, JSON.stringify(f));
  let ids = [];
  try { ids = JSON.parse(await env.USAGE.get(INDEX)) || []; } catch {}
  if (!ids.includes(f.id)) await env.USAGE.put(INDEX, JSON.stringify([...ids, f.id].sort()));
  return f;
}

export async function loescheKundenfigur(env, id) {
  if (typeof id !== "string" || !KUNDEN_ID.test(id)) throw new Error("Ungültige Kennung.");
  await env.USAGE.delete("figur:" + id);
  let ids = [];
  try { ids = JSON.parse(await env.USAGE.get(INDEX)) || []; } catch {}
  await env.USAGE.put(INDEX, JSON.stringify(ids.filter(x => x !== id)));
}
