// Rotkehlchen – LLM-Proxy für die Visitenkarte von Robin James Lewis.
// POST /chat  { messages: [{role:"user"|"assistant", content:"…"}, …] }
// Antwort:    { reply: "…", action: null | "calendar" | "form" | "contact", prefill: "…" }
import PROFILE from "../profile.md";

const perIp = new Map(); // weiche Grenze je Instanz: ip -> [timestamps]

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
    if (request.method !== "POST" || url.pathname !== "/chat") return json({ error: "Nicht gefunden." }, 404, cors);
    if (allowed.length && !allowed.includes(origin)) return json({ error: "Herkunft nicht erlaubt." }, 403, cors);

    // Grenzen
    const ip = request.headers.get("CF-Connecting-IP") || "0";
    const now = Date.now(), hour = 3600_000;
    const hits = (perIp.get(ip) || []).filter(t => now - t < hour);
    if (hits.length >= +(env.MAX_PER_IP_PER_HOUR || 20)) return json({ reply: "Für heute genug von mir – schreiben Sie Robin gern direkt.", action: "form" }, 200, cors);
    hits.push(now); perIp.set(ip, hits);
    if (env.USAGE) {
      const key = "usage:" + new Date().toISOString().slice(0, 10);
      const used = +(await env.USAGE.get(key) || 0);
      if (used >= +(env.MAX_PER_DAY || 400)) return json({ reply: "Das Tageskontingent ist erreicht. Morgen wieder – oder gleich eine Nachricht an Robin.", action: "form" }, 200, cors);
      ctx.waitUntil(env.USAGE.put(key, String(used + 1), { expirationTtl: 172800 }));
    }

    // Eingabe
    let body; try { body = await request.json(); } catch { return json({ error: "Ungültige Anfrage." }, 400, cors); }
    const maxChars = +(env.MAX_INPUT_CHARS || 600), maxTurns = +(env.MAX_TURNS || 8);
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-maxTurns * 2)
      .map(m => ({ role: m.role, content: m.content.slice(0, maxChars) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Keine Frage erhalten." }, 400, cors);

    const system = PROFILE + "\n\n" + FORMAT;
    let text;
    try {
      text = await complete(env, system, messages);
    } catch (e) {
      return json({ reply: "Gerade antworte ich nicht – Robin erreichen Sie über das Formular.", action: "form" }, 200, cors);
    }
    return json(parse(text), 200, cors);
  },
};

const FORMAT = `Antworte ausschließlich als JSON-Objekt ohne Markdown: {"reply": "…", "action": null, "prefill": ""}.
"action" ist null oder eines von "calendar" (Besucher will einen Termin), "form" (Besucher will Robin etwas mitteilen, das du nicht beantworten kannst oder sollst), "contact" (Besucher fragt nach Kontaktdaten).
"prefill" ist ein kurzer Vorschlag für die Nachricht an Robin, wenn action "form" ist, sonst leer.`;

async function complete(env, system, messages) {
  const provider = env.PROVIDER || "workers-ai";
  if (provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.MODEL || "claude-sonnet-5", max_tokens: 400, temperature: 0.6, system, messages }),
    });
    if (!r.ok) throw new Error("anthropic " + r.status);
    const d = await r.json(); return d.content.map(c => c.text || "").join("");
  }
  if (provider === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + env.OPENAI_API_KEY },
      body: JSON.stringify({ model: env.MODEL || "gpt-4.1-mini", max_tokens: 400, temperature: 0.6,
        messages: [{ role: "system", content: system }, ...messages], response_format: { type: "json_object" } }),
    });
    if (!r.ok) throw new Error("openai " + r.status);
    const d = await r.json(); return d.choices[0].message.content;
  }
  // Workers AI (Start)
  const d = await env.AI.run(env.MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [{ role: "system", content: system }, ...messages], max_tokens: 400, temperature: 0.6,
  });
  return typeof d === "string" ? d : (d.response || "");
}

function parse(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (m) { try { const o = JSON.parse(m[0]); return { reply: String(o.reply || "").trim(), action: ["calendar", "form", "contact"].includes(o.action) ? o.action : null, prefill: String(o.prefill || "").slice(0, 300) }; } catch {} }
  return { reply: String(text).trim().slice(0, 800), action: null, prefill: "" };
}
function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}
