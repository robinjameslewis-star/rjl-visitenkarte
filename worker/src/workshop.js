// Eingang „Workshop“ für den Memberbereich (Robin, 07.11.2026: „am liebsten, wenn ich die Workshops mit Goch einfach aus meinem
// Memberbereich heraus starten kann“). Nur über die Service Binding des Memberbereichs erreichbar (benannter Export, keine Route):
// keine Figur in der Redaktion, kein Messegerät, kein Gerätenachweis. Der Memberbereich prüft Robins Anmeldung und schickt die
// Figur mit jeder Anfrage; sie wird hier wie in der Redaktion geprüft. Abgerechnet wird über ein eigenes Tagesbudget („memberbereich“).
//   POST /chat           { figur: { …Felder wie in der Redaktion }, lang, messages, gesprochen, stimme, vortrag } → wie /kiosk/chat
//   POST /listen?lang=   WAV → wie /kiosk/listen
import { handleKiosk } from "./kiosk.js";
import { pruefeKundenfigur } from "./figuren.js";

export const GERAET = { id: "memberbereich", name: "Memberbereich", an: true, figuren: ["*"] };

const fehler = (text, status) => new Response(JSON.stringify({ error: text }), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export async function workshopAnfrage(request, env, ctx, deps) {
  const url = new URL(request.url), pfad = url.pathname;
  if (request.method !== "POST" || !["/chat", "/listen"].includes(pfad)) return fehler("Nicht gefunden.", 404);
  const geraet = { ...GERAET, antwortenTag: Math.round(+env.WORKSHOP_ANTWORTEN_TAG) || 600, minutenTag: Math.round(+env.WORKSHOP_MINUTEN_TAG) || 60 };
  if (pfad === "/listen") {
    const weiter = new Request("https://workshop.intern/kiosk/listen" + url.search, { method: "POST", headers: request.headers, body: await request.arrayBuffer() });
    return handleKiosk(weiter, env, ctx, deps, { geraet, figur: null });
  }
  let body;
  try { body = await request.json(); } catch { return fehler("Ungültige Anfrage.", 400); }
  let figur;
  try { figur = { ...pruefeKundenfigur({ ...(body && body.figur), einsatz: "workshop", antwortenTag: geraet.antwortenTag }), an: true }; }
  catch (e) { return fehler("Figur: " + e.message, 400); }
  const weiter = new Request("https://workshop.intern/kiosk/chat", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, figur: figur.id }) });
  return handleKiosk(weiter, env, ctx, deps, { geraet, figur });
}
