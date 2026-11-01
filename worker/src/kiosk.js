// Kiosk-Route für das Messegerät (Robin, 23.10.2026). Nur der lokale Dienst auf dem Gerät ruft sie auf; der Gerätenachweis
// liegt dort, nie im Browser. Anmeldung: Authorization: Bearer <geraet>.<geheimnis> (in der Redaktion erzeugt, im KV nur
// als SHA-256), zusätzlich wahlweise ein Cloudflare-Client-Zertifikat (KIOSK_MTLS = "an"). Statt der IP-Grenzen der
// Website hat jedes Gerät ein eigenes Tagesbudget im Durable Object „Geraetebudget“ (Antworten, Sekunden Spracheingabe).
//   POST /kiosk/chat          { figur, lang, messages, gesprochen, stimme } → wie /chat (NDJSON mit Stimme)
//   POST /kiosk/listen?lang=  WAV → { text } wie /listen
//   GET  /kiosk/figur?id=     Name, Rolle, Begrüßung, Einstiegsfragen der Figur (ohne Wissen, Persönlichkeit, voiceId)
//   POST /kiosk/lebenszeichen { version, commit, figur, online, radar, puffer } → { ok }
// Kundenfiguren (KV, src/figuren.js) gibt es nur hier, und nur für Geräte, denen Robin sie freigegeben hat.
import { oeffentlicheFigur, kundenfigur, KUNDEN_ID } from "./figuren.js";
import { loadSettings } from "./settings.js";
import { handleListen, wavDauer, MAX_BYTES } from "./hoeren.js";
import { Buffer } from "node:buffer";

const GERAET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INDEX = "geraete:index";
const TEXT = {
  de: { grenze: "Für heute habe ich genug erzählt. Fragen Sie gern das Standpersonal.", aus: "Ich mache gerade Pause. Fragen Sie gern das Standpersonal." },
  en: { grenze: "That's enough from me for today. Do ask the staff on the stand.", aus: "I'm taking a break just now. Do ask the staff on the stand." },
};

// ---------- Gerätebudget (Durable Object): je Gerät eine Instanz, Anfragen laufen nacheinander – Prüfen und Buchen in einem ----------
export class Geraetebudget {
  constructor(state) { this.state = state; }
  async fetch(request) {
    const url = new URL(request.url), body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const tag = new Date().toISOString().slice(0, 10), s = this.state.storage;
    if (url.pathname === "/buchen") {
      const key = "tag:" + tag + ":" + body.art, stand = (await s.get(key)) || 0, menge = +body.menge || 0;
      if (stand + menge > (+body.grenze || 0)) return Response.json({ ok: false, stand });
      await s.put(key, stand + menge);
      if (!(await s.get("aufgeraeumt:" + tag))) await this.aufraeumen(tag);
      return Response.json({ ok: true, stand: stand + menge });
    }
    if (url.pathname === "/lebenszeichen") { await s.put("lebenszeichen", { ...body, at: new Date().toISOString() }); return Response.json({ ok: true }); }
    if (url.pathname === "/stand") {
      const heute = {};
      for (const art of ["antworten", "sekunden"]) heute[art] = (await s.get("tag:" + tag + ":" + art)) || 0;
      return Response.json({ lebenszeichen: (await s.get("lebenszeichen")) || null, heute });
    }
    return new Response("Nicht gefunden.", { status: 404 });
  }
  // Tageszähler älter als 40 Tage entfernen (einmal am Tag)
  async aufraeumen(tag) {
    const grenze = new Date(Date.now() - 40 * 86400_000).toISOString().slice(0, 10);
    const alt = [...(await this.state.storage.list({ prefix: "tag:" })).keys()].filter(k => k.slice(4, 14) < grenze);
    if (alt.length) await this.state.storage.delete(alt);
    await this.state.storage.put("aufgeraeumt:" + tag, true);
  }
}
const budget = (env, id) => env.GERAETE.get(env.GERAETE.idFromName(id));
async function buchen(env, id, art, menge, grenze) {
  const r = await budget(env, id).fetch("https://geraet/buchen", { method: "POST", body: JSON.stringify({ art, menge, grenze }) });
  return (await r.json()).ok === true;
}
export async function geraetStand(env, id) {
  try { return await (await budget(env, id).fetch("https://geraet/stand")).json(); } catch { return null; }
}

// ---------- Geräte (Redaktion) ----------
const hash = async s => Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))).toString("hex");
function gleich(a, b) { // Vergleich in fester Zeit
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function geraete(env) {
  let ids = [];
  try { ids = JSON.parse(await env.USAGE.get(INDEX)) || []; } catch {}
  const liste = await Promise.all(ids.map(async id => { try { return JSON.parse(await env.USAGE.get("geraet:" + id)); } catch { return null; } }));
  return liste.filter(Boolean).map(({ tokenHash, ...g }) => g);
}
// Anlegen oder ändern. Beim Anlegen (und mit neuesGeheimnis) kommt der Gerätenachweis einmal zurück; gespeichert wird nur der Hash.
export async function speichereGeraet(env, input, neuesGeheimnis = false) {
  const i = input && typeof input === "object" ? input : {};
  const id = String(i.id || "").trim().toLowerCase();
  if (!GERAET_ID.test(id) || id.length > 30) throw new Error("Kennung des Geräts: a–z, 0–9, Bindestriche (z. B. messe-1), höchstens 30 Zeichen.");
  let alt = null;
  try { alt = JSON.parse(await env.USAGE.get("geraet:" + id)); } catch {}
  const name = String(i.name ?? (alt && alt.name) ?? "").trim().slice(0, 60);
  if (!name) throw new Error("Bitte einen Namen für das Gerät angeben (z. B. „Stele Messe Stuttgart“).");
  const figuren = (Array.isArray(i.figuren) ? i.figuren : (alt ? alt.figuren : ["goch"])).map(f => String(f).trim()).filter(f => f === "goch" || f === "*" || KUNDEN_ID.test(f));
  if (!figuren.length) throw new Error("Mindestens eine Figur freigeben (goch, kunde-… oder * für alle).");
  const zahl = (v, d, max) => { const n = Math.round(+(v ?? d)); if (!(n >= 0 && n <= max)) throw new Error("Grenzen: Antworten 0–5000, Minuten 0–1440 je Tag."); return n; };
  const g = { id, name, an: i.an ?? (alt ? alt.an : true), figuren, antwortenTag: zahl(i.antwortenTag, alt ? alt.antwortenTag : 300, 5000),
    minutenTag: zahl(i.minutenTag, alt ? alt.minutenTag : 60, 1440), zertifikat: String(i.zertifikat ?? (alt && alt.zertifikat) ?? "").trim().toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 64),
    erstellt: alt ? alt.erstellt : new Date().toISOString(), tokenHash: alt ? alt.tokenHash : "" };
  let token = null;
  if (!alt || neuesGeheimnis) {
    const geheimnis = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
    token = id + "." + geheimnis;
    g.tokenHash = await hash(geheimnis);
  }
  await env.USAGE.put("geraet:" + id, JSON.stringify(g));
  let ids = [];
  try { ids = JSON.parse(await env.USAGE.get(INDEX)) || []; } catch {}
  if (!ids.includes(id)) await env.USAGE.put(INDEX, JSON.stringify([...ids, id].sort()));
  const { tokenHash, ...sichtbar } = g;
  return { geraet: sichtbar, token };
}
export async function loescheGeraet(env, id) {
  if (!GERAET_ID.test(String(id || ""))) throw new Error("Ungültige Kennung.");
  await env.USAGE.delete("geraet:" + id);
  let ids = [];
  try { ids = JSON.parse(await env.USAGE.get(INDEX)) || []; } catch {}
  await env.USAGE.put(INDEX, JSON.stringify(ids.filter(x => x !== id)));
}

async function anmelden(request, env) {
  const m = (request.headers.get("authorization") || "").match(/^Bearer ([a-z0-9-]{1,30})\.([A-Za-z0-9_-]{20,100})$/);
  if (!m || !env.USAGE) return null;
  let g = null;
  try { g = JSON.parse(await env.USAGE.get("geraet:" + m[1])); } catch {}
  if (!g || !g.an || !g.tokenHash || !gleich(await hash(m[2]), g.tokenHash)) return null;
  if (env.KIOSK_MTLS === "an") { // zusätzlich: Client-Zertifikat, von Cloudflare geprüft (API Shield → mTLS)
    const tls = request.cf && request.cf.tlsClientAuth;
    if (!tls || tls.certVerified !== "SUCCESS") return null;
    if (g.zertifikat && String(tls.certFingerprintSHA256 || "").toLowerCase() !== g.zertifikat) return null;
  }
  return g;
}

// Figur für dieses Gerät: Goch immer (wenn freigegeben), Kundenfiguren nur aus dem KV, eingeschaltet und freigegeben.
async function figurFuer(env, geraet, id) {
  const darf = geraet.figuren.includes("*") || geraet.figuren.includes(id);
  if (!darf) return { fehler: 403 };
  if (id === "goch") return { goch: oeffentlicheFigur("goch") };
  const f = await kundenfigur(env, id);
  return f && f.an ? { kunde: f } : { fehler: 404 };
}

// Systemprompt einer Kundenfigur: Persönlichkeit und Wissen aus der Redaktion, feste Regeln für den Messestand.
export function kundenSystem(f, lang) {
  const s = f.sprachen.includes(lang) ? lang : f.sprachen[0];
  return [
    "# Wer du bist",
    `Du bist ${f.name[s]}${f.rolle[s] ? ", " + f.rolle[s] : ""}. Du erscheinst als Figur auf einem Bildschirm an einem Messestand und sprichst mit Besucherinnen und Besuchern, die vor dir stehen und dich hören. Du bist eine KI mit künstlich erzeugter Stimme; das wurde dem Besucher gesagt.`,
    "# Persönlichkeit", f.persoenlichkeit || "Freundlich, sachlich und kurz.",
    "# Was du weißt (freigegeben)", f.wissen,
    "# Regeln",
    "- Antworte in der Sprache des Besuchers, in der Sie-Form, in zwei bis drei kurzen Sätzen, die gesprochen gut klingen – keine Aufzählungen, keine Links, keine Sonderzeichen.",
    "- Erzähle nur, was oben steht. Weißt du etwas nicht, sag das offen und verweise auf das Standpersonal. Erfinde nichts, keine Preise, keine Zusagen.",
    "- Frage nie nach Namen, Adressen oder anderen persönlichen Angaben. Keine Rechts-, Steuer-, Finanz- oder Medizinberatung.",
    "- Eingerichtet hat dich robin.vision für diese Vorführung; Fragen zur Technik beantwortet das Standpersonal.",
    "# Antwortformat",
    'Antworte ausschließlich als JSON-Objekt ohne Markdown: {"reply": "…", "action": null, "message": null, "link": null, "link2": null}. "action" ist null oder "contact", wenn jemand Kontaktdaten möchte; alles andere bleibt null.',
  ].join("\n\n");
}
// Zusatz für Goch am Messegerät
export const GOCH_AM_GERAET = `# Am Messegerät

Du sprichst gerade nicht auf der Website, sondern an einem Bildschirm an einem Messestand; der Besucher steht vor dir und
hört dich. Antworte kürzer als sonst – zwei bis drei Sätze –, ohne Links ("link" und "link2" null) und ohne Anmeldung
zum Newsletter ("action" nie "newsletter"; erzähl davon, dann merkt man sich robin.vision). Wer Robin etwas ausrichten
möchte, nennt Namen und E-Mail-Adresse; bitte um Buchstabieren, wenn die Adresse unklar klingt.`;

function antwort(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

// deps: { handle, mitStimme } aus src/index.js (derselbe Weg wie /chat)
export async function handleKiosk(request, env, ctx, deps) {
  const url = new URL(request.url);
  if (!env.GERAETE) return antwort({ error: "Kiosk nicht eingerichtet (Durable Object GERAETE fehlt)." }, 503);
  const geraet = await anmelden(request, env);
  if (!geraet) return antwort({ error: "Gerät nicht angemeldet." }, 401);
  const settings = await loadSettings(env);

  if (url.pathname === "/kiosk/lebenszeichen" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const sauber = Object.fromEntries(["version", "commit", "figur", "online", "radar", "puffer", "fehler"].map(k => [k, k === "puffer" ? (typeof b[k] === "number" && Number.isFinite(b[k]) ? Math.max(0, Math.min(9999, Math.floor(b[k]))) : null) : typeof b[k] === "string" ? b[k].slice(0, 120) : (typeof b[k] === "number" || typeof b[k] === "boolean" ? b[k] : null)]));
    await budget(env, geraet.id).fetch("https://geraet/lebenszeichen", { method: "POST", body: JSON.stringify(sauber) });
    return antwort({ ok: true });
  }
  if (url.pathname === "/kiosk/figur" && request.method === "GET") {
    const id = url.searchParams.get("id") || "goch", r = await figurFuer(env, geraet, id);
    if (r.fehler) return antwort({ error: r.fehler === 403 ? "Figur für dieses Gerät nicht freigegeben." : "Figur nicht gefunden." }, r.fehler);
    if (r.goch) return antwort({ id: "goch", sprachen: r.goch.sprachen, name: r.goch.name, rolle: r.goch.rolle, texte: "language.js" });
    const { id: fid, sprachen, name, rolle, begruessung, fragen, geaendert } = r.kunde; // ohne Wissen, Persönlichkeit, voiceId
    return antwort({ id: fid, sprachen, name, rolle, begruessung, fragen, geaendert });
  }
  if (url.pathname === "/kiosk/listen" && request.method === "POST") {
    if (!settings.enabled) return antwort({ error: "Goch ist zurzeit ausgeschaltet." }, 503);
    // Erst prüfen, dann buchen: Ist die Spracheingabe aus oder die Aufnahme zu groß, bleibt das Gerätebudget unberührt.
    if (!settings.sprache || !settings.sprache.hoeren || !env.AI) return antwort({ error: "Spracheingabe ist zurzeit ausgeschaltet." }, 503);
    if (+(request.headers.get("content-length") || 0) > MAX_BYTES) return antwort({ error: "Höchstens 20 Sekunden." }, 413);
    const buf = Buffer.from(await request.clone().arrayBuffer());
    if (buf.length > MAX_BYTES) return antwort({ error: "Höchstens 20 Sekunden." }, 413);
    const dauer = wavDauer(buf);
    if (dauer != null && dauer >= 0.3 && !(await buchen(env, geraet.id, "sekunden", Math.ceil(dauer), geraet.minutenTag * 60)))
      return antwort({ text: "", grenze: true });
    return handleListen(request, env, ctx, {}, settings, { zaehlen: false, ipGrenze: false });
  }
  if (url.pathname === "/kiosk/chat" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return antwort({ error: "Ungültige Anfrage." }, 400); }
    const lang = body.lang === "en" ? "en" : "de";
    const r = await figurFuer(env, geraet, typeof body.figur === "string" ? body.figur : "goch");
    if (r.fehler) return antwort({ error: r.fehler === 403 ? "Figur für dieses Gerät nicht freigegeben." : "Figur nicht gefunden." }, r.fehler);
    if (!settings.enabled) return antwort({ reply: TEXT[lang].aus, action: null });
    const grenze = Math.min(geraet.antwortenTag, r.kunde ? r.kunde.antwortenTag : Infinity);
    if (!(await buchen(env, geraet.id, "antworten", 1, grenze))) return antwort({ reply: TEXT[lang].grenze, action: null }); // ohne Fehlermeldung
    const { figur: _f, ...rest } = body;
    const intern = new Request("https://kiosk.intern/chat", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "kiosk:" + geraet.id },
      body: JSON.stringify({ ...rest, lang }) });
    const res = await deps.handle(intern, env, ctx, { geraet, figur: r.kunde || r.goch, kunde: !!r.kunde, lang });
    if (!body.stimme || res.status !== 200) return res;
    return deps.mitStimme(res, { ...body, lang }, env, ctx, r.kunde ? { voiceId: r.kunde.voiceId || "" } : {});
  }
  return antwort({ error: "Nicht gefunden." }, 404);
}
