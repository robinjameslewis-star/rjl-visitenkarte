// Goch, das Rotkehlchen von Robin – LLM-Proxy für die Visitenkarte von Robin James Lewis.
// POST /chat  { lang: "de"|"en", messages: [{role:"user"|"assistant", content:"…"}, …] }
// Antwort:    { reply: "…", action: null | "calendar" | "contact" | "message", sent: true|false|undefined }
// Der Schlüssel zum Sprachmodell und zu Resend liegt nur hier, nie im Seitencode.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import PROFILE from "../profile.md";
import AKTUELL from "../aktuell.md";

const perIp = new Map();         // weiche Grenze je Instanz: ip -> [timestamps der Anfragen]
const perIpMessages = new Map(); // je Instanz: ip -> [timestamps versendeter Nachrichten]
let lastUsage = null;            // Verbrauch des letzten Modellaufrufs (nur für debug)

const TEXT = {
  de: {
    // Wenn das Modell nicht antworten kann oder soll (Tagesgrenze, Störung, Guthaben): kein Wort davon zum
    // Besucher – Goch leitet in den gewohnten Draht über, der Worker führt ihn ohne Modell zu Ende.
    quiet: "Das richte ich lieber direkt an Robin weiter. Was soll ich Robin ausrichten? Oder schreib ihm selbst: robinjameslewis@googlemail.com",
    sent: e => `Ausgerichtet. Robin antwortet dir persönlich per E-Mail an ${e}.`,
    summary: m => `Ich richte Robin aus: ${m.text} – Von: ${m.name}, ${m.email}. Unser Gespräch schicke ich mit, damit Robin den Zusammenhang kennt; wenn du das nicht möchtest, sag es. Soll ich das so senden?`,
    summaryBare: m => `Ich richte Robin aus: ${m.text} – Von: ${m.name}, ${m.email}. Ohne unser Gespräch, nur diese Nachricht. Soll ich das so senden?`,
    marker: "Soll ich das so senden",
    bareMarker: "Ohne unser Gespräch",
    cancelled: "In Ordnung, ich sende nichts. Wenn du es anders formulieren möchtest, sag es mir.",
    closing: "Für heute habe ich genug erzählt – mehr weiß Robin selbst. Soll ich ihm etwas ausrichten? Dann schreib mir, was.",
    askWhat: "Was soll ich Robin ausrichten?",
    askWho: "Und wie heißt du, und unter welcher E-Mail-Adresse kann Robin dir persönlich antworten?",
    closingMarker: "Soll ich ihm etwas ausrichten",
    whoMarker: "unter welcher E-Mail-Adresse kann Robin dir persönlich antworten",
    invalid: "Damit Robin dir persönlich antworten kann, brauche ich deinen Namen und eine gültige E-Mail-Adresse.",
    tooMany: "Mehr richte ich heute nicht aus – schreib Robin bitte direkt.",
    failed: "Das Ausrichten hat nicht geklappt. Schreib Robin bitte direkt per E-Mail.",
  },
  en: {
    quiet: "I'd rather pass that on to Robin directly. What should I pass on to Robin? Or write to him yourself: robinjameslewis@googlemail.com",
    sent: e => `Passed on. Robin will reply to you personally by email at ${e}.`,
    summary: m => `I'll pass on to Robin: ${m.text} – From: ${m.name}, ${m.email}. I'll include our conversation so Robin has the context; if you'd rather not, just say so. Shall I send it like this?`,
    summaryBare: m => `I'll pass on to Robin: ${m.text} – From: ${m.name}, ${m.email}. Without our conversation, just this message. Shall I send it like this?`,
    marker: "Shall I send it like this",
    bareMarker: "Without our conversation",
    cancelled: "All right, I won't send anything. If you'd like to phrase it differently, tell me.",
    closing: "That's enough from me for today – Robin knows the rest himself. Shall I pass something on to him? Then tell me what.",
    askWhat: "What should I pass on to Robin?",
    askWho: "And what's your name, and which email address can Robin reply to?",
    closingMarker: "Shall I pass something on to him",
    whoMarker: "which email address can Robin reply to",
    invalid: "For Robin to reply to you personally I need your name and a valid email address.",
    tooMany: "I won't pass on more than that today – please write to Robin directly.",
    failed: "Passing it on didn't work. Please write to Robin directly by email.",
  },
};

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response("Goch", { headers: { "content-type": "text/plain; charset=utf-8" } });
    if (request.method !== "POST" || url.pathname !== "/chat") return json({ error: "Nicht gefunden." }, 404, cors);
    if (allowed.length && !allowed.includes(origin)) return json({ error: "Herkunft nicht erlaubt." }, 403, cors);

    // Eingabe
    let body; try { body = await request.json(); } catch { return json({ error: "Ungültige Anfrage." }, 400, cors); }
    const lang = body.lang === "en" ? "en" : "de", t = TEXT[lang];
    const maxChars = +(env.MAX_INPUT_CHARS || 600), maxTurns = +(env.MAX_TURNS || 8);
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-24)
      .map(m => ({ role: m.role, content: m.content.slice(0, maxChars) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Keine Frage erhalten." }, 400, cors);

    // Grenzen
    const ip = request.headers.get("CF-Connecting-IP") || "0";
    const now = Date.now(), hour = 3600_000, day = 86400_000;
    const hits = (perIp.get(ip) || []).filter(x => now - x < hour);
    if (hits.length >= +(env.MAX_PER_IP_PER_HOUR || 12)) return json({ reply: t.quiet, action: null }, 200, cors);
    hits.push(now); perIp.set(ip, hits);

    // Antwort auf die eigene Rückfrage („Soll ich das so senden?“) versteht der Worker selbst:
    // Ja → senden; Nein → nichts; „ohne Gespräch“ → neue Zusammenfassung ohne Verlauf. Kein Modellaufruf nötig.
    const previous = messages.length >= 2 ? messages[messages.length - 2] : null;
    const lastText = messages[messages.length - 1].content;
    if (previous && previous.role === "assistant" && previous.content.includes(t.marker)) {
      const fields = fromSummary(previous.content);
      const noTranscript = NO_TRANSCRIPT.test(lastText);
      const bare = previous.content.includes(t.bareMarker) || noTranscript;
      if (fields && noTranscript && !CONFIRM.test(lastText)) return json({ reply: t.summaryBare(fields), action: null }, 200, cors);
      if (DECLINE.test(lastText)) return json({ reply: t.cancelled, action: null }, 200, cors);
      if (fields && CONFIRM.test(lastText)) {
        return await deliver(env, fields, lang, messages, !bare, ip, now, day, body, t, cors);
      }
    }

    // Deckel je Gespräch: nach MAX_TURNS Fragen übernimmt der Worker und führt nur noch zum Draht –
    // Anliegen, Name, E-Mail, Zusammenfassung – ohne Modell. Das begrenzt die Kosten je Besucher.
    const userTurns = messages.filter(x => x.role === "user").length;
    const closingAsked = previous && previous.role === "assistant" && (previous.content.includes(t.closingMarker) || previous.content.includes(t.askWhat));
    const whoAsked = previous && previous.role === "assistant" && previous.content.includes(t.whoMarker);
    if (whoAsked) {
      const m = completeMessage(null, messages);
      if (m) return json({ reply: t.summary(m), action: null }, 200, cors);
      return json({ reply: t.invalid, action: null }, 200, cors);
    }
    if (closingAsked) {
      if (DECLINE.test(lastText)) return json({ reply: t.cancelled, action: null }, 200, cors);
      const m = completeMessage(null, messages);
      if (m) return json({ reply: t.summary(m), action: null }, 200, cors);
      return json({ reply: t.askWho, action: null }, 200, cors);
    }
    if (userTurns > maxTurns) return json({ reply: t.closing, action: null }, 200, cors);

    // Tagesgrenze: zählt nur Modellaufrufe (die kosten), nicht die Antworten des Workers selbst.
    if (env.USAGE) {
      const key = "usage:" + new Date().toISOString().slice(0, 10);
      const used = +(await env.USAGE.get(key) || 0);
      if (used >= +(env.MAX_PER_DAY || 60)) return json({ reply: t.quiet, action: null }, 200, cors);
      ctx.waitUntil(env.USAGE.put(key, String(used + 1), { expirationTtl: 172800 }));
    }

    const system = PROFILE + "\n\n# Woran Robin gerade arbeitet\n\n" + AKTUELL + "\n\n" + FORMAT;
    let text;
    try {
      text = await complete(env, system, messages);
    } catch (e) {
      const detail = String(e && e.message || e).slice(0, 300);
      console.error("Modellfehler", detail);
      // Guthaben aufgebraucht: Robin einmal benachrichtigen (Merker in KV), nicht bei jedem Aufruf.
      if (/credit balance|insufficient credit|billing/i.test(detail)) ctx.waitUntil(notifyOnce(env, "credit",
        "Goch: Guthaben bei Anthropic aufgebraucht",
        "Die Anthropic-API meldet: " + detail + "\n\nGoch leitet Besucher bis auf Weiteres in den Draht (Nachricht per E-Mail), ohne Modell. Guthaben aufladen unter console.anthropic.com → Billing. Diese Nachricht kommt erst wieder, wenn danach eine Antwort gelungen ist und das Guthaben erneut ausgeht."));
      return json({ reply: t.quiet, action: null, ...(body.debug === true ? { detail } : {}) }, 200, cors);
    }
    if (env.USAGE) ctx.waitUntil(env.USAGE.delete("alert:credit").catch(() => {})); // Antwort gelungen: Merker zurücksetzen
    const out = parse(text);
    if (body.debug === true) { out.raw = String(text).slice(0, 2000); out.usage = lastUsage; }
    // Rückkopplung: Fragen, die Goch nicht beantworten konnte, ohne Personenbezug 30 Tage zählen,
    // damit Robin bei der Durchsicht sieht, was Besucher wirklich wissen wollten (Briefing Abschnitt 11).
    if (env.USAGE && UNKNOWN.test(out.reply)) ctx.waitUntil(rememberUnanswered(env, lastText, lang));

    // Der Draht: Nachricht an Robin. Das Protokoll gehört dem Worker, nicht dem Modell:
    // Felder notfalls aus dem Verlauf ergänzen, die Zusammenfassung selbst schreiben, und senden
    // nur, wenn der Besucher auf genau diese Zusammenfassung mit Ja geantwortet hat.
    if (out.action === "message") {
      const m = completeMessage(out.message, messages);
      if (!m) return json({ reply: t.invalid, action: null }, 200, cors);
      // Das Modell sammelt nur; gesendet wird erst nach Ja auf die Zusammenfassung des Workers (siehe oben).
      return json({ reply: t.summary(m), action: null }, 200, cors);
    }
    return json(out, 200, cors);
  },
};

const UNKNOWN = /das weiß ich nicht|weiß ich (leider )?nicht|kann dir nur robin sagen|i don't know|only robin can (tell|say|answer)|pass (that|this|it) (on )?to robin|(ask|check with) robin (for you|about that)/i;

// Frage ohne Personenbezug zählen: E-Mail-Adressen und lange Zahlen entfernt, auf 160 Zeichen gekürzt,
// Schlüssel aus der normalisierten Frage; Eintrag verfällt nach 30 Tagen ohne Wiederholung.
async function rememberUnanswered(env, question, lang) {
  const clean = String(question).replace(EMAIL_ANY, "[e-mail]").replace(/\+?\d[\d\s\/-]{6,}\d/g, "[nummer]").replace(/\s+/g, " ").trim().slice(0, 160);
  if (clean.length < 3) return;
  const key = "unanswered:" + clean.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, "").trim().slice(0, 120);
  let entry = null;
  try { entry = JSON.parse(await env.USAGE.get(key)); } catch {}
  const today = new Date().toISOString().slice(0, 10);
  entry = entry && typeof entry === "object" ? entry : { q: clean, lang, n: 0, first: today };
  entry.n += 1; entry.last = today;
  await env.USAGE.put(key, JSON.stringify(entry), { expirationTtl: 30 * 86400 });
}

// Einmalige Benachrichtigung an Robin über Resend; der Merker in KV verhindert Wiederholungen.
async function notifyOnce(env, kind, subject, text) {
  if (!env.USAGE || !env.RESEND_API_KEY || !env.MAIL_TO) return;
  const key = "alert:" + kind;
  if (await env.USAGE.get(key)) return;
  await env.USAGE.put(key, new Date().toISOString(), { expirationTtl: 30 * 86400 });
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": "Bearer " + env.RESEND_API_KEY },
    body: JSON.stringify({ from: env.MAIL_FROM || "Goch <onboarding@resend.dev>", to: [env.MAIL_TO], subject, text }),
  }).catch(() => {});
}

async function deliver(env, m, lang, messages, withTranscript, ip, now, day, body, t, cors) {
  const sentToday = (perIpMessages.get(ip) || []).filter(x => now - x < day);
  if (sentToday.length >= +(env.MAX_MESSAGES_PER_IP_PER_DAY || 3)) return json({ reply: t.tooMany, action: "contact" }, 200, cors);
  const result = await sendMail(env, m, lang, messages, withTranscript);
  if (!result.ok) {
    console.error("Resend-Fehler", result.status, result.detail);
    return json({ reply: t.failed, action: "contact", sent: false, ...(body.debug === true ? { detail: result.detail } : {}) }, 200, cors);
  }
  sentToday.push(now); perIpMessages.set(ip, sentToday);
  return json({ reply: t.sent(m.email), action: "message", sent: true, ...(body.debug === true ? { id: result.id } : {}) }, 200, cors);
}

// Die Felder aus der eigenen Zusammenfassung lesen – zuverlässiger als jede Modellausgabe.
function fromSummary(text) {
  const m = text.match(/^(?:Ich richte Robin aus|I'll pass on to Robin): ([\s\S]*?) – (?:Von|From): (.*?), (\S+@\S+?)\.(?:\s|$)/);
  if (!m || !EMAIL.test(m[3])) return null;
  return { text: m[1].trim(), name: m[2].trim(), email: m[3] };
}

const FORMAT = `# Antwortformat

Antworte ausschließlich als JSON-Objekt ohne Markdown: {"reply": "…", "action": null}
"action" ist null oder eines von:
- "calendar": der Besucher möchte ein Gespräch oder einen Termin.
- "contact": der Besucher fragt nach Kontaktdaten.
- "message": der Besucher möchte Robin etwas ausrichten (oder hat Ja gesagt, als du angeboten hast, Robin zu fragen)
  UND hat seinen Namen und seine E-Mail-Adresse bereits genannt. Dann zusätzlich:
  "message": {"name": "…", "email": "…", "text": "…"} – Name und E-Mail-Adresse wörtlich aus den Nachrichten des
  Besuchers, "text" die Frage oder das Anliegen in seinen Worten. Nie Platzhalter wie "?" oder "unbekannt" eintragen.
  Fehlt Name oder E-Mail-Adresse: kein "message", sondern in "reply" danach fragen.
  Zusammenfassung, Rückfrage „Soll ich das so senden?“ und die Bestätigung „Ausgerichtet“ schreibt der Worker –
  du schreibst diese Sätze nie selbst.
"reply" ist immer dein Text an den Besucher, in dessen Sprache.`;

const CONFIRM = /^\s*(ja|yes|yep|jo|jap|ok|okay|sure|passt|stimmt|genau|richtig|sende|senden|schick|send|go ahead|do it|absenden)\b/i;
const DECLINE = /^\s*(nein|no|nope|lieber nicht|doch nicht|abbrechen|cancel|stop)\b|\b(nicht|don't|do not|not)\s+(senden|schicken|abschicken|send)\b/i;
const NO_TRANSCRIPT = /(ohne|nicht|kein|keinen|no|without|don't|do not|nur die nachricht|only the message)[^.!?]{0,60}(gespräch|verlauf|unterhaltung|chat|conversation|transcript|history)|(gespräch|verlauf|unterhaltung|conversation|transcript|history)[^.!?]{0,40}(nicht|weglassen|raus|weg|out|off|leave)/i;
const EMAIL_ANY = /[^\s@<>,;:"']+@[^\s@<>,;:"']+\.[^\s@<>,;:"']{2,}/;

// Fehlende Felder aus dem Verlauf ergänzen: die letzte E-Mail-Adresse, die der Besucher genannt hat,
// der Name aus derselben Nachricht, die Frage aus der ersten Besuchernachricht.
function completeMessage(m, messages) {
  const out = { name: "", email: "", text: "" };
  if (m && typeof m === "object") {
    out.name = String(m.name || "").trim().slice(0, 80);
    out.email = String(m.email || "").trim().slice(0, 254);
    out.text = String(m.text || "").replace(/[',"\s]+$/, "").trim().slice(0, 2000);
  }
  const users = messages.filter(x => x.role === "user").map(x => x.content);
  if (!EMAIL.test(out.email)) {
    out.email = "";
    for (let i = users.length - 1; i >= 0 && !out.email; i--) {
      const hit = users[i].match(EMAIL_ANY);
      if (hit && EMAIL.test(hit[0])) {
        out.email = hit[0];
        if (out.name.length < 2 || /[?]/.test(out.name)) {
          const rest = users[i].replace(hit[0], "").replace(/\b(name|e-?mail|adresse|address|ich heiße|ich bin|mein name ist|my name is|i am|i'm)\b/gi, "")
            .replace(/[:,;()\[\]"'–-]+/g, " ").replace(/\s+/g, " ").trim();
          if (rest.length >= 2 && rest.length <= 80) out.name = rest;
        }
      }
    }
  }
  if (!out.text || out.text.length < 3 || /[?]{2,}|\bunbekannt\b/i.test(out.text)) {
    // Das Anliegen ist die letzte Besuchernachricht vor Name/E-Mail, die keine Bestätigung ist –
    // ohne die Einleitung „Ich möchte Robin etwas ausrichten:“.
    const candidates = users.filter(u => !CONFIRM.test(u) && !DECLINE.test(u) && !EMAIL_ANY.test(u) && u.trim().length >= 3);
    const last = candidates[candidates.length - 1] || "";
    out.text = last.replace(/^\s*(ich möchte|ich will|ich würde gern|i('d| would) like to|i want to)\s+(robin|ihm|him)?\s*(etwas|something)?\s*(ausrichten|mitteilen|sagen|leave a message|tell)\s*[:,.-]?\s*/i, "").trim().slice(0, 2000);
  }
  if (out.name.length < 2 || /[?]/.test(out.name) || !EMAIL.test(out.email) || out.text.length < 3) return null;
  return out;
}

// Antwortschema: das Modell kann nur dieses Format liefern – kein kaputtes JSON, keine Platzhalter im Aufbau.
const GochOutput = z.object({
  reply: z.string(),
  action: z.enum(["calendar", "contact", "message"]).nullable(),
  message: z.object({ name: z.string(), email: z.string(), text: z.string() }).nullable(),
});

async function complete(env, system, messages) {
  const provider = env.PROVIDER || "workers-ai";
  if (provider === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY fehlt");
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const response = await client.beta.messages.create({
      model: env.MODEL || "claude-opus-5",
      max_tokens: 1024,
      // Das Profil ist bei jeder Frage identisch → Prompt-Caching: ab der zweiten Frage ein Zehntel des Preises.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
      // Kurze Gesprächsantworten brauchen wenig Denkarbeit; das Schema erzwingt das Antwortformat.
      output_config: { effort: "low", format: zodOutputFormat(GochOutput) },
      // Empfehlung von Anthropic: bei einer seltenen Ablehnung durch die Sicherheitsprüfung
      // beantwortet ein Schwestermodell die Anfrage im selben Aufruf.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") return JSON.stringify({ reply: "", action: "contact", message: null });
    lastUsage = { model: response.model, input: response.usage.input_tokens, cache_write: response.usage.cache_creation_input_tokens,
      cache_read: response.usage.cache_read_input_tokens, output: response.usage.output_tokens };
    return response.content.filter(b => b.type === "text").map(b => b.text).join("");
  }
  // Workers AI (Start). Erst im JSON-Modus (zuverlässiges Format), bei Ablehnung ohne.
  const model = env.MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  // Kürzeres Limit und Wiederholungsstrafe: das Modell neigt sonst zu Endlosschleifen aus Abschiedsformeln.
  const input = { messages: [{ role: "system", content: system }, ...messages], max_tokens: 320, temperature: 0.45,
    repetition_penalty: 1.15, frequency_penalty: 0.4 };
  let d, first;
  try {
    d = await env.AI.run(model, { ...input, response_format: { type: "json_schema", json_schema: SCHEMA } });
  } catch (e) {
    first = e;
    try { d = await env.AI.run(model, input); }
    catch (e2) { throw new Error("mit Schema: " + String(first && first.message || first) + " | ohne Schema: " + String(e2 && e2.message || e2)); }
  }
  return asText(d);
}

const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    action: { type: ["string", "null"], enum: ["calendar", "contact", "message", null] },
    message: { type: ["object", "null"], properties: { name: { type: "string" }, email: { type: "string" }, text: { type: "string" } }, required: ["name", "email", "text"] },
  },
  required: ["reply", "action"],
};

// Workers AI antwortet je nach Modell und Modus mit Text, { response: Text }, { response: Objekt }
// oder im OpenAI-Format; alles wird zu dem Text, den parse() liest.
function asText(d) {
  if (typeof d === "string") return d;
  if (!d || typeof d !== "object") return "";
  if (typeof d.response === "string") return d.response;
  if (d.response && typeof d.response === "object") return JSON.stringify(d.response);
  const choice = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  if (typeof choice === "string") return choice;
  return JSON.stringify(d);
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

function parse(text) {
  text = String(text);
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const o = JSON.parse(m[0]);
      const action = ["calendar", "contact", "message"].includes(o.action) ? o.action : null;
      const reply = typeof o.reply === "string" ? o.reply : (o.reply == null ? "" : JSON.stringify(o.reply));
      const out = { reply: tidy(reply), action };
      if (action === "message" && o.message && typeof o.message === "object") out.message = o.message;
      return out;
    } catch {}
  }
  // Abgeschnittenes oder kaputtes JSON (Token-Limit, Endlosschleife): retten, was da ist.
  if (/^\s*\{/.test(text)) {
    const reply = (text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/) || [])[1] || "";
    const action = (text.match(/"action"\s*:\s*"(calendar|contact|message)"/) || [])[1] || null;
    const out = { reply: tidy(reply.replace(/\\"/g, '"').replace(/\\n/g, " ")), action };
    if (action === "message") {
      const name = (text.match(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || "";
      const email = (text.match(/"email"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || "";
      const body = (text.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || "";
      out.message = { name, email, text: body };
    }
    return out;
  }
  return { reply: tidy(text), action: null };
}

// Doppelte Sätze streichen (Endlosschleifen), Länge kappen, am Satzende abschneiden.
function tidy(reply) {
  const seen = new Set(), keep = [];
  // Die Sprechblase zeigt Text roh: Markdown-Zeichen (Sternchen, Backticks, Unterstriche) entfernen.
  reply = String(reply).replace(/\*\*?([^*]+)\*\*?/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/(^|\s)_([^_]+)_(?=\s|[.,;:!?]|$)/g, "$1$2");
  for (const part of reply.trim().split(/(?<=[.!?])\s+/)) {
    const key = part.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key); keep.push(part);
  }
  let out = keep.join(" ").slice(0, 700);
  if (out.length === 700) out = out.replace(/\s+\S*$/, "") + " …";
  return out;
}

// Versand über Resend (kostenloser Tarif; Absender resend.dev, bis eine eigene Domain da ist).
// Nichts wird gespeichert. Robin bekommt die bestätigte Nachricht und – auf seinen Wunsch – den
// Gesprächsverlauf dieser Runde, damit er den Zusammenhang kennt (steht so im Datenschutztext
// und in der Rückfrage an den Besucher).
async function sendMail(env, m, lang, messages, withTranscript = true) {
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return { ok: false, status: 0, detail: "RESEND_API_KEY oder MAIL_TO fehlt" };
  const when = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  const transcript = messages.slice(0, -1) // die Bestätigung selbst ist kein Inhalt
    .map(x => (x.role === "user" ? "Besucher: " : "Goch: ") + x.content.replace(/\s+/g, " ").trim()).join("\n");
  const text = [
    `Goch richtet aus (${lang === "en" ? "Englisch" : "Deutsch"}, ${when} Uhr):`, "",
    m.text, "",
    `Von: ${m.name} <${m.email}>`, "",
    "Der Besucher erwartet eine persönliche Antwort. „Antworten“ geht direkt an ihn (Antwort-an ist gesetzt).", "",
    withTranscript ? "— Gesprächsverlauf —\n" + transcript : "(Der Besucher wollte den Gesprächsverlauf nicht mitschicken.)",
  ].join("\n");
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + env.RESEND_API_KEY },
      body: JSON.stringify({
        from: env.MAIL_FROM || "Goch <onboarding@resend.dev>",
        to: [env.MAIL_TO],
        reply_to: m.email,
        subject: `Goch: Nachricht von ${m.name}`,
        text,
      }),
    });
    const detail = await r.text().catch(() => "");
    let id = "";
    try { id = JSON.parse(detail).id || ""; } catch {}
    return { ok: r.ok, status: r.status, detail: detail.slice(0, 300), id };
  } catch (e) { return { ok: false, status: 0, detail: String(e).slice(0, 300) }; }
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}
