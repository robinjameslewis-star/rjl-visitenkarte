// Stimme (Auftrag „Sprechender Goch“, 23.10.2026): vertont ausschließlich die eigene Antwort der Figur. Aufgerufen wird
// das nur aus /chat bzw. der Kiosk-Route mit dem Text, den der Worker selbst erzeugt hat – eine freie Vorlese-Route
// gibt es nicht. Anbieter umschaltbar; heute ElevenLabs (Secret ELEVENLABS_API_KEY). Ohne Stimme vom Server antwortet
// Goch nur als Text (figur.json: rueckfall „keine“ – jeder Besucher hört dieselbe Stimme oder keine).
import { Buffer } from "node:buffer";

export const ANBIETER = { elevenlabs: "ElevenLabs" };
// Modelle laut ElevenLabs (abgerufen 23.10.2026): v4 am menschlichsten, v4 Turbo ausdrucksstark in Echtzeit.
export const TTS_MODELLE = [
  { id: "eleven_v4", label: "Eleven v4 – am menschlichsten und ausdrucksstärksten (Standard)" },
  { id: "eleven_v4_turbo", label: "Eleven v4 Turbo – ausdrucksstark, schneller (Echtzeit)" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2 – Vorgänger, sehr gleichmäßig" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5 – schnellste und günstigste Antwort" },
];
// Für das Gespräch: Antworten werden vorgelesen – so formulieren, wie man spricht (im Sprachmodus an den Systemprompt).
export const GESPROCHEN = {
  de: "# Gesprochen\n\nDeine Antwort wird mit deiner Stimme vorgelesen. Sprich natürlich und warm, wie im Gespräch: kurze Sätze, keine Aufzählungen, keine Klammern, keine Abkürzungen oder Zeichen, die man nicht ausspricht. Schreib Zahlen und Uhrzeiten so, wie man sie sagt.",
  en: "# Spoken\n\nYour answer is read aloud in your voice. Speak naturally and warmly, as in conversation: short sentences, no lists, no brackets, no abbreviations or symbols nobody would say aloud. Write numbers and times the way people say them.",
};
// Ausgangswerte für eine warme, weiche Stimme (Goch: figur.json, stimme.einstellungen). Weniger Stabilität = lebendiger.
export const EINSTELLUNGEN = { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 0.95 };
// Hinweis nach Art. 50 KI-VO, bei der ersten gesprochenen Antwort einer Sitzung vorangestellt (Text und Stimme gleich).
export const KI_HINWEIS = {
  de: "Kurz vorab: Ich bin eine KI, und meine Stimme ist künstlich erzeugt.",
  en: "Just so you know: I'm an AI, and my voice is artificially generated.",
};

const monat = (now = Date.now()) => new Date(now).toISOString().slice(0, 7);

export async function stimmeMonat(env, now = Date.now()) {
  const leer = { monat: monat(now), zeichen: 0, antworten: 0, msModell: 0, msStimme: 0, letzte: null };
  if (!env.USAGE) return leer;
  try { return { ...leer, ...JSON.parse(await env.USAGE.get("stimme:monat:" + monat(now))) }; } catch { return { ...leer, fehler: true }; }
}

// Ein Aufruf beim Anbieter. Liefert MP3 als Base64 (passt in eine Zeile der NDJSON-Antwort) und die Dauer des Aufrufs.
export async function vertonen(env, text, { voiceId, modell, lang, einstellungen, seed }) {
  const started = Date.now();
  const model = modell || "eleven_v4";
  // v3/v4: nur Stabilität und Ähnlichkeit (weitere Regler sind dort nicht dokumentiert); ältere Modelle bekommen alle
  const alle = { ...EINSTELLUNGEN, ...(einstellungen || {}) };
  const regler = /^eleven_v[34]/.test(model) ? { stability: alle.stability, similarity_boost: alle.similarity_boost } : alle;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: model, voice_settings: regler, ...(Number.isInteger(seed) ? { seed } : {}),
      ...(/_v2_5$/.test(model) ? { language_code: lang === "en" ? "en" : "de" } : {}) }),
  });
  if (!r.ok) throw new Error("ElevenLabs " + r.status + ": " + (await r.text().catch(() => "")).slice(0, 200));
  const audio = new Uint8Array(await r.arrayBuffer());
  if (!audio.length) throw new Error("ElevenLabs: leere Antwort");
  return { mime: "audio/mpeg", daten: Buffer.from(audio).toString("base64"), ms: Date.now() - started };
}

// Vertonte Zeichen außerhalb einer Antwort zählen (Hörprobe in der Redaktion) – dieselbe Monatsgrenze.
export async function zeichenBuchen(env, zeichen, now = Date.now()) {
  if (!env.USAGE) return;
  const stand = await stimmeMonat(env, now);
  await env.USAGE.put("stimme:monat:" + monat(now), JSON.stringify({ ...stand, zeichen: stand.zeichen + zeichen }), { expirationTtl: 70 * 86400 }).catch(() => {});
}
export const PROBESATZ = {
  de: "Kurz vorab: Ich bin eine KI, und meine Stimme ist künstlich erzeugt. Ich bin Goch, das Rotkehlchen von Robin – fragen Sie mich gern, woran er gerade arbeitet.",
  en: "Just so you know: I'm an AI, and my voice is artificially generated. I'm Goch, Robin's robin – do ask me what he's working on.",
};

// Stimme für eine Antwort: { stimme: {mime, daten, zeichen, ms} } oder { stimme: null, grund: "aus" | "grenze" | "fehler" }.
// Die Seite liest dann nur bei rueckfall „browser“ der Figur lokal vor (nicht bei „grenze“); Goch bleibt beim Text.
export async function stimmeFuerAntwort(env, ctx, text, { sprache, voiceId, lang, msModell, einstellungen, seed, zaehler = "stimme:monat:" }) {
  if (!sprache || !sprache.stimme || !env.ELEVENLABS_API_KEY || !voiceId) return { stimme: null, grund: "aus" };
  const zeichen = text.length;
  const now = Date.now(), stand = await stimmeMonat(env, now);
  if (stand.fehler) return { stimme: null, grund: "fehler" }; // KV nicht lesbar: lieber keine Stimme als ohne Deckel
  if (stand.zeichen + zeichen > (sprache.zeichenMonat || 0)) return { stimme: null, grund: "grenze" };
  let a;
  try { a = await vertonen(env, text, { voiceId, modell: sprache.ttsModell, lang, einstellungen, seed }); }
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
