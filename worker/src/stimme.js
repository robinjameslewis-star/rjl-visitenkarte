// Stimme (Auftrag „Sprechender Goch“, 23.10.2026): vertont ausschließlich die eigene Antwort der Figur. Aufgerufen wird
// das nur aus /chat bzw. der Kiosk-Route mit dem Text, den der Worker selbst erzeugt hat – eine freie Vorlese-Route
// gibt es nicht. Anbieter umschaltbar; heute ElevenLabs (Secret ELEVENLABS_API_KEY). Ohne Stimme vom Server liest
// die Seite mit einer lokalen Browserstimme vor (goch-stimme.js), bei erreichter Grenze gar nicht: dann nur Text.
import { Buffer } from "node:buffer";

export const ANBIETER = { elevenlabs: "ElevenLabs" };
export const TTS_MODELLE = [
  { id: "eleven_flash_v2_5", label: "Flash v2.5 – schnellste Antwort (Standard)" },
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5 – schnell, etwas natürlicher" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2 – beste Qualität, langsamer" },
];
// Hinweis nach Art. 50 KI-VO, bei der ersten gesprochenen Antwort einer Sitzung vorangestellt (Text und Stimme gleich).
export const KI_HINWEIS = {
  de: "Kurz vorab: Ich bin eine KI, und meine Stimme ist künstlich erzeugt.",
  en: "Just so you know: I'm an AI, and my voice is artificially generated.",
};

const monat = (now = Date.now()) => new Date(now).toISOString().slice(0, 7);

export async function stimmeMonat(env, now = Date.now()) {
  const leer = { monat: monat(now), zeichen: 0, antworten: 0, msModell: 0, msStimme: 0, letzte: null };
  if (!env.USAGE) return leer;
  try { return { ...leer, ...JSON.parse(await env.USAGE.get("stimme:monat:" + monat(now))) }; } catch { return leer; }
}

// Ein Aufruf beim Anbieter. Liefert MP3 als Base64 (passt in eine Zeile der NDJSON-Antwort) und die Dauer des Aufrufs.
export async function vertonen(env, text, { voiceId, modell, lang }) {
  const started = Date.now();
  const model = modell || "eleven_flash_v2_5";
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: model, ...(/_v2_5$/.test(model) ? { language_code: lang === "en" ? "en" : "de" } : {}) }),
  });
  if (!r.ok) throw new Error("ElevenLabs " + r.status + ": " + (await r.text().catch(() => "")).slice(0, 200));
  const audio = new Uint8Array(await r.arrayBuffer());
  if (!audio.length) throw new Error("ElevenLabs: leere Antwort");
  return { mime: "audio/mpeg", daten: Buffer.from(audio).toString("base64"), ms: Date.now() - started };
}

// Stimme für eine Antwort: { stimme: {mime, daten, zeichen, ms} } oder { stimme: null, grund: "aus" | "grenze" | "fehler" }.
// „aus“ und „fehler“: die Seite darf mit lokaler Browserstimme vorlesen; „grenze“: nur Text, ohne Hinweis an den Besucher.
export async function stimmeFuerAntwort(env, ctx, text, { sprache, voiceId, lang, msModell, zaehler = "stimme:monat:" }) {
  if (!sprache || !sprache.stimme || !env.ELEVENLABS_API_KEY || !voiceId) return { stimme: null, grund: "aus" };
  const zeichen = text.length;
  const now = Date.now(), stand = await stimmeMonat(env, now);
  if (stand.zeichen + zeichen > (sprache.zeichenMonat || 0)) return { stimme: null, grund: "grenze" };
  let a;
  try { a = await vertonen(env, text, { voiceId, modell: sprache.ttsModell, lang }); }
  catch (e) { console.error("Stimme", String(e && e.message || e).slice(0, 300)); return { stimme: null, grund: "fehler" }; }
  // Ein Schreibzugriff je vertonter Antwort: Zeichen, Antworten und Antwortzeiten des Monats in einem Eintrag.
  if (env.USAGE) {
    const next = { ...stand, zeichen: stand.zeichen + zeichen, antworten: stand.antworten + 1,
      msModell: stand.msModell + (msModell || 0), msStimme: stand.msStimme + a.ms,
      letzte: { at: new Date(now).toISOString(), zeichen, msModell: msModell || null, msStimme: a.ms } };
    const write = env.USAGE.put(zaehler + monat(now), JSON.stringify(next), { expirationTtl: 70 * 86400 }).catch(() => {});
    ctx && ctx.waitUntil ? ctx.waitUntil(write) : await write;
  }
  return { stimme: { mime: a.mime, daten: a.daten, zeichen, ms: a.ms } };
}
