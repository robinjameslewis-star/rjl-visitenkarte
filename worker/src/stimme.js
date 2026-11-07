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
// Kurz (Robin, 06.11.2026: „Ja, kürzer“): Lange Antworten kosten Wartezeit beim Schreiben und klingen nach Vortrag.
export const GESPROCHEN = {
  de: "# Gesprochen\n\nDeine Antwort wird mit deiner Stimme vorgelesen. Sprich natürlich und warm, wie im Gespräch: kurze Sätze, keine Aufzählungen, keine Klammern, keine Abkürzungen oder Zeichen, die man nicht ausspricht. Schreib Zahlen und Uhrzeiten so, wie man sie sagt.\n\nHalte dich im Gespräch besonders kurz: zwei bis drei kurze Sätze, zusammen höchstens 40 Wörter, auch bei „Was gibt's Neues?“ und wenn du ein Angebot vorstellst. Sag das Wichtigste zuerst und frag dann, ob der Besucher mehr hören möchte. Länger nur, wenn jemand ausdrücklich um mehr bittet. Das geht allen Längenangaben oben vor.",
  en: "# Spoken\n\nYour answer is read aloud in your voice. Speak naturally and warmly, as in conversation: short sentences, no lists, no brackets, no abbreviations or symbols nobody would say aloud. Write numbers and times the way people say them.\n\nKeep it especially brief in conversation: two or three short sentences, at most 40 words in total, also for „What's new?“ and when you introduce an offer. Say the most important thing first, then ask whether the visitor would like to hear more. Go longer only if someone explicitly asks for more. This takes precedence over all length guidance above.",
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
  if (stand.fehler) return; // KV nicht lesbar: Zähler nicht mit einem Nullstand überschreiben
  await env.USAGE.put("stimme:monat:" + monat(now), JSON.stringify({ ...stand, zeichen: stand.zeichen + zeichen }), { expirationTtl: 70 * 86400 }).catch(() => {});
}
export const PROBESATZ = {
  de: "Kurz vorab: Ich bin eine KI, und meine Stimme ist künstlich erzeugt. Ich bin Goch, das Rotkehlchen von Robin – fragen Sie mich gern, woran er gerade arbeitet.",
  en: "Just so you know: I'm an AI, and my voice is artificially generated. I'm Goch, Robin's robin – do ask me what he's working on.",
};

// Sprechabschnitte (Robin, 06.11.2026: schneller und flüssiger anfangen). Vertont wird nicht mehr die ganze Antwort am Stück:
// Goch beginnt, sobald der erste Satz fertig ist, der Rest folgt, während er spricht. Geteilt wird nur an Satzenden; der erste
// Abschnitt ist ein einzelner Satz (nur ein sehr kurzer wie „Gern.“ nimmt den nächsten mit), die weiteren fassen Sätze bis
// etwa 240 Zeichen zusammen, damit die Stimme im Fluss bleibt. Abkürzungen und Ordnungszahlen („z. B.“, „am 3. Mai“) sind kein Satzende.
const KEIN_SATZENDE = /(?:^|[\s(„"])(?:\p{L}|\d{1,2}|bzw|ca|Dr|Prof|Nr|St|Str|ggf|evtl|inkl|vgl|etc|usw|sog|Mr|Mrs|Ms|vs|No)\.$/u;
export function sprechTeile(text, { ersterMin = 25, weitereMax = 240 } = {}) {
  const saetze = [];
  let start = 0;
  for (const m of text.matchAll(/[.!?…]+["“”'’)]*\s+/g)) {
    const ende = m.index + m[0].trimEnd().length, satz = text.slice(start, ende), danach = text[m.index + m[0].length] || "";
    if (/\.$/.test(satz) && KEIN_SATZENDE.test(satz)) continue;
    if (/\p{Ll}/u.test(danach)) continue; // klein weiter: kein Satzende
    saetze.push(satz.trim()); start = m.index + m[0].length;
  }
  if (text.slice(start).trim()) saetze.push(text.slice(start).trim());
  const teile = [];
  for (const satz of saetze) {
    const zuletzt = teile[teile.length - 1];
    if (zuletzt === undefined) teile.push(satz);
    else if (teile.length === 1 ? zuletzt.length < ersterMin : zuletzt.length + 1 + satz.length <= weitereMax) teile[teile.length - 1] = zuletzt + " " + satz;
    else teile.push(satz);
  }
  return teile;
}

// Ein Abschnitt, der immer gleich lautet (KI-Hinweis): einmal vertonen und merken, das spart bei jeder ersten Antwort Zeit und
// Zeichen. Der Schlüssel enthält Stimme und Modell, eine Änderung in der Redaktion vertont neu.
async function festerSatz(env, ctx, text, opts) {
  const roh = new TextEncoder().encode(JSON.stringify([opts.voiceId, opts.modell, opts.einstellungen, opts.seed, opts.lang, text]));
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", roh))].slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
  const key = "stimme:fest:" + hash;
  if (env.USAGE) {
    try { const da = JSON.parse(await env.USAGE.get(key)); if (da && da.daten) return { ...da, ms: 0, gemerkt: true }; } catch {}
  }
  const a = await vertonen(env, text, opts);
  if (env.USAGE) ctx.waitUntil(env.USAGE.put(key, JSON.stringify({ mime: a.mime, daten: a.daten }), { expirationTtl: 90 * 86400 }).catch(() => {}));
  return a;
}

// Zwei Aufrufe gleichzeitig reichen, ein Abschnitt entsteht schneller, als Goch ihn spricht; mehr lässt nicht jeder Tarif von
// ElevenLabs zu. Ist der Anbieter gerade ausgelastet (429), einmal kurz warten und neu versuchen.
const PARALLEL = 2, WARTEN_MS = 500;
async function vertonenMitGeduld(env, text, opts) {
  try { return await vertonen(env, text, opts); }
  catch (e) {
    if (!/ElevenLabs 429/.test(String(e && e.message))) throw e;
    await new Promise(r => setTimeout(r, WARTEN_MS));
    return vertonen(env, text, opts);
  }
}

// Stimme in Abschnitten: schreiben(zeile) je Abschnitt und in der richtigen Reihenfolge, { stimme: {mime, daten, zeichen, ms, teil, teile} },
// oder einmal { stimme: null, grund }. Wirft schreiben (Besucher hat abgebrochen), wird nichts Neues mehr vertont. Gezählt werden
// nur die Zeichen, die wirklich zum Anbieter gingen; msStimme ist jetzt die Wartezeit bis zum ersten Ton.
export async function stimmeInTeilen(env, ctx, text, { sprache, voiceId, lang, msModell, einstellungen, seed, fest = [], zaehler = "stimme:monat:", budget }, schreiben) {
  if (!sprache || !sprache.stimme || !env.ELEVENLABS_API_KEY || !voiceId) return schreiben({ stimme: null, grund: "aus" });
  const now = Date.now(), stand = await stimmeMonat(env, now);
  if (stand.fehler) return schreiben({ stimme: null, grund: "fehler" });
  if (stand.zeichen + text.length > (sprache.zeichenMonat || 0)) return schreiben({ stimme: null, grund: "grenze" });
  if (budget && !(await budget(text.length))) return schreiben({ stimme: null, grund: "grenze_termin" });
  const teile = sprechTeile(text), opts = { voiceId, modell: sprache.ttsModell, lang, einstellungen, seed }, beginn = Date.now(), auftraege = [];
  let zeichen = 0, msErster = null, naechster = 0;
  const starten = satz => (fest.includes(satz) ? festerSatz(env, ctx, satz, opts) : vertonenMitGeduld(env, satz, opts))
    .then(a => { if (!a.gemerkt) zeichen += satz.length; return a; })
    .catch(e => { console.error("Stimme", String(e && e.message || e).slice(0, 300)); return null; });
  try {
    for (let i = 0; i < teile.length; i++) {
      while (naechster < teile.length && naechster < i + PARALLEL) auftraege[naechster] = starten(teile[naechster++]);
      const a = await auftraege[i];
      if (!a) return await schreiben({ stimme: null, grund: "fehler" });
      if (msErster === null) msErster = Date.now() - beginn;
      await schreiben({ stimme: { mime: a.mime, daten: a.daten, zeichen: teile[i].length, ms: a.ms, teil: i + 1, teile: teile.length } });
    }
  } finally {
    // Budget je Termin: was nicht zum Anbieter ging (Fehler, Abbruch, gemerkter Satz), zurückbuchen
    if (budget && text.length > zeichen) await Promise.resolve(budget(zeichen - text.length)).catch(() => {});
    if (env.USAGE && msErster !== null) {
      const next = { ...stand, zeichen: stand.zeichen + zeichen, antworten: stand.antworten + 1,
        msModell: stand.msModell + (msModell || 0), msStimme: stand.msStimme + msErster,
        letzte: { at: new Date(now).toISOString(), zeichen, msModell: msModell || null, msStimme: msErster } };
      const write = env.USAGE.put(zaehler + monat(now), JSON.stringify(next), { expirationTtl: 70 * 86400 }).catch(() => {});
      ctx && ctx.waitUntil ? ctx.waitUntil(write) : await write;
    }
  }
}

// Stimme für eine Antwort: { stimme: {mime, daten, zeichen, ms} } oder { stimme: null, grund: "aus" | "grenze" | "grenze_termin" | "fehler" }.
// Die Seite liest dann nur bei rueckfall „browser“ der Figur lokal vor (nicht bei „grenze“); Goch bleibt beim Text.
// budget (nur Budget je Termin, src/kiosk.js): async (zeichen) → true, wenn gebucht; false ergibt „grenze_termin“ – nach der
// Monatsprüfung und vor dem ersten Vertonen. Das gilt ebenso für stimmeInTeilen. Nicht vertonte Zeichen gehen mit
// budget(-n) zurück.
export async function stimmeFuerAntwort(env, ctx, text, { sprache, voiceId, lang, msModell, einstellungen, seed, zaehler = "stimme:monat:", budget }) {
  if (!sprache || !sprache.stimme || !env.ELEVENLABS_API_KEY || !voiceId) return { stimme: null, grund: "aus" };
  const zeichen = text.length;
  const now = Date.now(), stand = await stimmeMonat(env, now);
  if (stand.fehler) return { stimme: null, grund: "fehler" }; // KV nicht lesbar: lieber keine Stimme als ohne Deckel
  if (stand.zeichen + zeichen > (sprache.zeichenMonat || 0)) return { stimme: null, grund: "grenze" };
  if (budget && !(await budget(zeichen))) return { stimme: null, grund: "grenze_termin" };
  let a;
  try { a = await vertonen(env, text, { voiceId, modell: sprache.ttsModell, lang, einstellungen, seed }); }
  catch (e) {
    console.error("Stimme", String(e && e.message || e).slice(0, 300));
    if (budget) await Promise.resolve(budget(-zeichen)).catch(() => {}); // nichts vertont: Budget je Termin zurück
    return { stimme: null, grund: "fehler" };
  }
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
