// Spracheingabe (POST /listen?lang=de|en, Auftrag „Sprechender Goch“, 23.10.2026). Die Seite schickt immer ein WAV
// (PCM 16 Bit, mono, 16 kHz, höchstens 20 s): Sie wandelt jede Aufnahme selbst um, damit jedes Browserformat (Chrome
// WebM/Opus, Safari MP4/AAC) gleich ankommt und die Dauer exakt im Kopf steht – so zählt die Tagesgrenze echte
// Sekunden. Whisper large-v3-turbo über Workers AI erkennt den Text. Gespeichert wird nichts, gezählt nur Sekunden.
import { Buffer } from "node:buffer";

export const MODELL = "@cf/openai/whisper-large-v3-turbo";
export const MAX_SEKUNDEN = 20;
const MAX_BYTES = 44 + MAX_SEKUNDEN * 48000 * 2 + 4096; // Kopf + 20 s bei höchstens 48 kHz mono, etwas Spielraum
const perIp = new Map(); // weiche Grenze je Instanz: ip -> [Zeitpunkte]

// Begriffe, die Whisper sonst gern verhört; als Kontext, nicht als Vorgabe.
const KONTEXT = {
  de: "Gespräch mit Goch, dem Rotkehlchen von Robin. robin.vision, SmartFormular, FiBu lite, Workshops, Buchungsstapel, DATEV.",
  en: "A conversation with Goch, Robin's robin. robin.vision, SmartFormular, FiBu lite, workshops, booking batch, DATEV.",
};
// Was Whisper bei Stille oder Rauschen gern erfindet: dann gilt die Aufnahme als leer.
const ERFUNDEN = /^(?:untertitel(?:ung)?\b.*|vielen dank(?:,)? fürs zuschauen.*|danke fürs zuschauen.*|thanks? (?:you )?for watching.*|subtitles? by.*|copyright\b.*|\W*(?:musik|music|applaus|applause)\W*|amara\.org.*|\.+)$/i;

// Dauer eines WAV in Sekunden aus dem Kopf; null, wenn es kein PCM-WAV ist, das hier angenommen wird.
export function wavDauer(buf) {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let pos = 12, fmt = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4), size = buf.readUInt32LE(pos + 4), body = pos + 8;
    if (id === "fmt " && size >= 16) fmt = { format: buf.readUInt16LE(body), kanaele: buf.readUInt16LE(body + 2),
      rate: buf.readUInt32LE(body + 4), byteRate: buf.readUInt32LE(body + 8), bits: buf.readUInt16LE(body + 14) };
    if (id === "data") {
      if (!fmt || fmt.format !== 1 || fmt.bits !== 16 || fmt.kanaele < 1 || fmt.kanaele > 2 || fmt.rate < 8000 || fmt.rate > 48000) return null;
      if (fmt.byteRate !== fmt.rate * fmt.kanaele * 2) return null;
      return Math.min(size, buf.length - body) / fmt.byteRate;
    }
    pos = body + size + (size % 2);
  }
  return null;
}

export async function hoerenTag(env, now = Date.now()) {
  const leer = { tag: new Date(now).toISOString().slice(0, 10), sekunden: 0, anfragen: 0, ms: 0 };
  if (!env.USAGE) return leer;
  try { return { ...leer, ...JSON.parse(await env.USAGE.get("hoeren:tag:" + leer.tag)) }; } catch { return leer; }
}

function antwort(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors } });
}

// settings: Betriebseinstellungen (settings.js); zaehler: eigener Zählerschlüssel, z. B. für das Kiosk-Gerätebudget.
// zaehlen: false für das Messegerät – dort bucht src/kiosk.js die Sekunden im Gerätebudget.
export async function handleListen(request, env, ctx, cors, settings, { zaehler = "hoeren:tag:", ipGrenze = true, zaehlen = true } = {}) {
  const sprache = settings.sprache || {};
  if (!sprache.hoeren || !env.AI) return antwort({ error: "Spracheingabe ist zurzeit ausgeschaltet." }, 503, cors);
  const lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "de";
  const typ = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!["audio/wav", "audio/x-wav", "audio/wave"].includes(typ)) return antwort({ error: "Bitte als WAV senden." }, 415, cors);
  const laenge = +(request.headers.get("content-length") || 0);
  if (laenge > MAX_BYTES) return antwort({ error: `Höchstens ${MAX_SEKUNDEN} Sekunden.` }, 413, cors);
  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.length > MAX_BYTES) return antwort({ error: `Höchstens ${MAX_SEKUNDEN} Sekunden.` }, 413, cors);
  const dauer = wavDauer(buf);
  if (dauer == null) return antwort({ error: "Bitte als WAV (PCM, 16 Bit) senden." }, 415, cors);
  if (dauer > MAX_SEKUNDEN + 0.5) return antwort({ error: `Höchstens ${MAX_SEKUNDEN} Sekunden.` }, 413, cors);
  if (dauer < 0.3) return antwort({ text: "", sekunden: 0 }, 200, cors);

  // Grenzen: weich je Adresse und Instanz, hart je Tag in Sekunden (KV). Erreicht: leerer Text, die Seite bietet Tippen an.
  const now = Date.now();
  if (ipGrenze) {
    const ip = request.headers.get("CF-Connecting-IP") || "0";
    const hits = (perIp.get(ip) || []).filter(x => now - x < 3600_000);
    if (hits.length >= +(env.MAX_HOEREN_PER_IP_PER_HOUR || 30)) return antwort({ text: "", grenze: true }, 200, cors);
    hits.push(now); perIp.set(ip, hits);
  }
  const tagKey = zaehler + new Date(now).toISOString().slice(0, 10);
  let stand = { sekunden: 0, anfragen: 0, ms: 0 };
  if (env.USAGE && zaehlen) try { stand = { ...stand, ...JSON.parse(await env.USAGE.get(tagKey)) }; } catch {}
  if (zaehlen && stand.sekunden + dauer > (sprache.minutenTag || 0) * 60) return antwort({ text: "", grenze: true }, 200, cors);

  const started = Date.now();
  let out;
  try {
    out = await env.AI.run(MODELL, { audio: buf.toString("base64"), task: "transcribe", language: lang, vad_filter: true,
      condition_on_previous_text: false, initial_prompt: KONTEXT[lang] });
  } catch (e) {
    console.error("Spracheingabe", String(e && e.message || e).slice(0, 300)); // nie den Inhalt protokollieren
    return antwort({ error: "Ich habe Sie gerade nicht verstanden. Bitte tippen Sie Ihre Frage." }, 502, cors);
  }
  const ms = Date.now() - started;
  let text = String(out && out.text || "").replace(/\s+/g, " ").trim();
  if (ERFUNDEN.test(text)) text = "";
  text = text.slice(0, +(env.MAX_INPUT_CHARS || 600));
  if (env.USAGE && zaehlen) {
    const next = { ...stand, sekunden: Math.round((stand.sekunden + dauer) * 10) / 10, anfragen: stand.anfragen + 1, ms: stand.ms + ms };
    ctx.waitUntil(env.USAGE.put(tagKey, JSON.stringify(next), { expirationTtl: 40 * 86400 }).catch(() => {}));
  }
  return antwort({ text, sekunden: Math.round(dauer * 10) / 10, ms }, 200, cors);
}
