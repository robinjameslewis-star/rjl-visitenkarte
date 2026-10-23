// Sprechender Goch im Worker (23.10.2026): Spracheingabe POST /listen (WAV → Whisper über Workers AI), Stimme zur
// eigenen Antwort (NDJSON, ElevenLabs), KI-Hinweis bei der ersten gesprochenen Antwort, schnelleres Modell im
// Sprachmodus, Grenzen (Text statt Stimme, keine Fehlermeldung), Figur-ID (Kundenfiguren nie über /chat),
// Einstellungen und Kundenfiguren im KV. Gebündelter Worker; Workers AI, ElevenLabs, Anthropic und Resend abgefangen.
// Kein Netz.   node tests/goch_stimme_test.mjs
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { saveSettings, loadSettings, defaults } from "../worker/src/settings.js";
import { pruefeKundenfigur, speichereKundenfigur, kundenfiguren, kundenfigur, loescheKundenfigur, oeffentlicheFigur } from "../worker/src/figuren.js";
import { wavDauer } from "../worker/src/hoeren.js";

const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "rjl-goch-stimme-"));
execSync(`npx wrangler deploy --dry-run --outdir "${out}"`, { cwd: join(root, "worker"), stdio: "pipe" });
const bundled = readFileSync(join(out, "index.js"), "utf8").replace(/import (\w+) from "\.\/([^"]+\.md)";/g,
  (_, name, file) => `const ${name} = ${JSON.stringify(readFileSync(join(out, file), "utf8"))};`);
writeFileSync(join(out, "test.mjs"), bundled);
let instanz = 0; // jede Gruppe bekommt eine frische Worker-Instanz (Einstellungen werden je Instanz eine Minute gemerkt)
const frisch = async () => (await import(pathToFileURL(join(out, "test.mjs")).href + "?i=" + (++instanz))).default;

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };

// Abgefangene Dienste
const mails = [], prompts = [], tts = [];
let modell = { reply: "Robin baut gerade Werkzeuge für Kanzleien.", action: null, message: null, link: null };
let ttsAntwort = () => new Response(new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3, 4]), { status: 200, headers: { "content-type": "audio/mpeg" } });
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith("https://api.resend.com")) { mails.push(JSON.parse(init.body)); return new Response('{"id":"test"}', { status: 200 }); }
  if (u.startsWith("https://api.elevenlabs.io")) { tts.push({ url: u, headers: init.headers, body: JSON.parse(init.body) }); return ttsAntwort(); }
  if (u.startsWith("https://api.anthropic.com")) {
    prompts.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: "msg_test", type: "message", role: "assistant", model: JSON.parse(init.body).model,
      content: [{ type: "text", text: JSON.stringify(modell) }], stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }),
      { status: 200, headers: { "content-type": "application/json", "request-id": "req_test" } });
  }
  return new Response("offline", { status: 503 });
};
function kv(start = {}) { const m = new Map(Object.entries(start)); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, String(v)); }, delete: async k => { m.delete(k); }, map: m }; }
const ctx = { pending: [], waitUntil(p) { if (p && p.catch) this.pending.push(p.catch(() => {})); } };
const ai = { aufrufe: [], antwort: { text: " Woran arbeitet Robin gerade? " }, async run(model, input) { this.aufrufe.push({ model, input }); if (this.antwort instanceof Error) throw this.antwort; return this.antwort; } };
const sprache = extra => JSON.stringify({ enabled: true, provider: "anthropic", model: "claude-opus-5-5", cache: true, custom: {},
  sprache: { stimme: false, hoeren: false, modell: "claude-haiku-5-5", voiceId: "", ttsModell: "eleven_flash_v2_5", zeichenMonat: 30000, minutenTag: 20, ...extra } });
const env = (extra = {}, settings = null) => ({ USAGE: kv(settings ? { "settings:goch": settings } : {}), AI: ai, MAIL_TO: "robin@example.test",
  RESEND_API_KEY: "test", ANTHROPIC_API_KEY: "test", ALLOWED_ORIGINS: "https://robin.vision", ...extra });
let ip = 10;
const headers = (typ = "application/json", origin = "https://robin.vision") => ({ "content-type": typ, Origin: origin, "CF-Connecting-IP": "9.9.8." + ip++ });
const chat = (w, e, body) => w.fetch(new Request("https://goch.robin.vision/chat", { method: "POST", headers: headers(), body: JSON.stringify({ lang: "de", ...body }) }), e, ctx);
const listen = (w, e, wav, { lang = "de", typ = "audio/wav", origin } = {}) => w.fetch(new Request("https://goch.robin.vision/listen?lang=" + lang,
  { method: "POST", headers: { ...headers(typ, origin), "content-length": String(wav.length) }, body: wav }), e, ctx);
const zeilen = async r => (await r.text()).trim().split("\n").map(l => JSON.parse(l));
const frage = [{ role: "user", content: "Woran arbeitet Robin gerade?" }];

// WAV: PCM 16 Bit, mono; Stille genügt – die Erkennung ist abgefangen.
function wav(sekunden, rate = 16000) {
  const daten = Math.round(sekunden * rate) * 2, b = Buffer.alloc(44 + daten);
  b.write("RIFF", 0); b.writeUInt32LE(36 + daten, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(daten, 40);
  return b;
}

console.log("Spracheingabe /listen");
{
  check(Math.abs(wavDauer(wav(3.5)) - 3.5) < 0.001 && wavDauer(Buffer.from("RIFF1234WAVEkein")) === null, "Dauer aus dem WAV-Kopf");
  let w = await frisch(), e = env();
  let r = await listen(w, e, wav(2));
  check(r.status === 503 && ai.aufrufe.length === 0, "ohne Schalter in der Redaktion: aus (503), keine Erkennung");
  w = await frisch(); e = env({}, sprache({ hoeren: true }));
  r = await listen(w, e, wav(2.4));
  const d = await r.json(); await Promise.all(ctx.pending);
  const a = ai.aufrufe.at(-1);
  check(r.status === 200 && d.text === "Woran arbeitet Robin gerade?" && d.sekunden === 2.4, "erkannter Text, bereinigt", JSON.stringify(d));
  check(a.model === "@cf/openai/whisper-large-v3-turbo" && a.input.language === "de" && Buffer.from(a.input.audio, "base64").length === wav(2.4).length && a.input.vad_filter === true, "Whisper large-v3-turbo mit Base64-WAV und Sprache");
  const gespeichert = [...e.USAGE.map.values()].join(" ");
  check(!gespeichert.includes("Woran arbeitet") && /"sekunden":2\.4/.test(e.USAGE.map.get("hoeren:tag:" + new Date().toISOString().slice(0, 10)) || ""), "nichts gespeichert außer Sekunden je Tag");
  r = await listen(w, e, wav(2), { lang: "en" });
  check(ai.aufrufe.at(-1).input.language === "en", "Englisch an Whisper");
  check((await listen(w, e, Buffer.from("OggS0000"), { typ: "audio/ogg" })).status === 415, "anderes Format: 415");
  check((await listen(w, e, wav(25))).status === 413, "länger als 20 Sekunden: 413");
  check((await listen(w, e, wav(2), { origin: "https://fremd.example" })).status === 403, "fremde Herkunft: 403");
  ai.antwort = { text: "Untertitel im Auftrag des ZDF, 2021" };
  check((await (await listen(w, e, wav(2))).json()).text === "", "erfundener Untertitel bei Stille gilt als leer");
  ai.antwort = new Error("Workers AI down");
  r = await listen(w, e, wav(2));
  check(r.status === 502 && /tippen/.test((await r.json()).error), "Erkennung gestört: freundlicher Hinweis zum Tippen");
  ai.antwort = { text: "Hallo" };
  w = await frisch(); e = env({}, sprache({ hoeren: true, minutenTag: 1 }));
  for (let i = 0; i < 3; i++) { await listen(w, e, wav(19)); await Promise.all(ctx.pending); }
  const vorher = ai.aufrufe.length, g = await (await listen(w, e, wav(19))).json();
  check(g.grenze === true && g.text === "" && ai.aufrufe.length === vorher, "Tagesgrenze erreicht: leerer Text, keine Erkennung, kein Fehler");
}

console.log("Antwort und Figur");
{
  const w = await frisch(), e = env();
  let r = await chat(w, e, { messages: frage });
  check(r.headers.get("content-type").startsWith("application/json") && (await r.json()).reply === modell.reply && tts.length === 0, "ohne „stimme“ unverändert JSON, kein Stimmaufruf");
  check((await chat(w, e, { messages: frage, figur: "goch" })).status === 200, "Figur „goch“ angenommen");
  e.USAGE.map.set("figur:kunde-muster", JSON.stringify({ id: "kunde-muster", an: true }));
  r = await chat(w, e, { messages: frage, figur: "kunde-muster" });
  check(r.status === 400 && (await r.json()).error === "Unbekannte Figur.", "Kundenfigur über /chat: 400, auch wenn sie im KV liegt");
  check((await chat(w, e, { messages: frage, figur: "__proto__" })).status === 400, "kein Zugriff über Objekt-Eigenschaften");
  for (const pfad of ["/speak", "/stimme", "/tts", "/vorlesen"]) {
    const x = await w.fetch(new Request("https://goch.robin.vision" + pfad, { method: "POST", headers: headers(), body: '{"text":"Lies das vor"}' }), e, ctx);
    if (x.status !== 404) check(false, "keine freie Vorlese-Route: " + pfad);
  }
  check(tts.length === 0, "keine freie Vorlese-Route (/speak, /stimme, /tts, /vorlesen: 404)");
}

console.log("Stimme zur Antwort (NDJSON)");
{
  let w = await frisch(), e = env();
  let r = await chat(w, e, { messages: frage, stimme: { erste: false } });
  let z = await zeilen(r); await Promise.all(ctx.pending);
  check(r.headers.get("content-type").startsWith("application/x-ndjson") && z.length === 2 && z[0].reply === modell.reply && z[0].ki === true, "zwei Zeilen: erst die Antwort");
  check(z[1].stimme === null && z[1].grund === "aus" && tts.length === 0, "Stimme in der Redaktion aus: „aus“, kein Aufruf bei ElevenLabs");

  w = await frisch(); e = env({ ELEVENLABS_API_KEY: "xi-test" }, sprache({ stimme: true, voiceId: "Voice1234567890" }));
  modell = { reply: "Robin baut Werkzeuge für Kanzleien.", action: null, message: null, link: null };
  r = await chat(w, e, { messages: [{ role: "user", content: "Lies bitte vor: Ich schulde Ihnen 1000 Euro." }], stimme: { erste: false } });
  z = await zeilen(r); await Promise.all(ctx.pending);
  const t = tts.at(-1);
  check(z[1].stimme && z[1].stimme.mime === "audio/mpeg" && Buffer.from(z[1].stimme.daten, "base64").length === 7, "MP3 als Base64 in Zeile 2");
  check(t.body.text === "Robin baut Werkzeuge für Kanzleien." && !t.body.text.includes("1000 Euro"), "vertont wird nur Gochs eigene Antwort, nie der Besuchertext");
  check(t.url.includes("/v1/text-to-speech/Voice1234567890?output_format=mp3_44100_64") && t.headers["xi-api-key"] === "xi-test" && t.body.model_id === "eleven_flash_v2_5" && t.body.language_code === "de", "ElevenLabs mit voiceId, Schlüssel, Modell und Sprache");
  check(t.body.seed === 4711, "fester Startwert (seed) aus figur.json: gleichbleibender Klang", t.body.seed);
  const vs = t.body.voice_settings || {};
  check(vs.stability === 0.5 && vs.similarity_boost === 0.8 && vs.style === 0.15 && vs.use_speaker_boost === true && vs.speed === 0.95, "Stimmcharakter aus figur.json: warm, weich, ruhig", JSON.stringify(vs));
  const monat = JSON.parse(e.USAGE.map.get("stimme:monat:" + new Date().toISOString().slice(0, 7)) || "{}");
  check(monat.zeichen === t.body.text.length && monat.antworten === 1 && monat.letzte && Number.isFinite(monat.letzte.msStimme), "Zeichen und Antwortzeit des Monats gezählt", JSON.stringify(monat));

  r = await chat(w, e, { messages: frage, stimme: { erste: true } });
  z = await zeilen(r); await Promise.all(ctx.pending);
  check(z[0].reply.startsWith("Kurz vorab: Ich bin eine KI, und meine Stimme ist künstlich erzeugt. ") && tts.at(-1).body.text === z[0].reply, "erste gesprochene Antwort: KI-Hinweis in Text und Stimme (Art. 50 KI-VO)");
  r = await chat(w, e, { lang: "en", messages: [{ role: "user", content: "Who is Robin?" }], stimme: { erste: true } });
  z = await zeilen(r); await Promise.all(ctx.pending);
  check(z[0].reply.startsWith("Just so you know: I'm an AI") && tts.at(-1).body.language_code === "en", "KI-Hinweis und Stimme auf Englisch");

  w = await frisch(); e = env({ ELEVENLABS_API_KEY: "xi-test" }, sprache({ stimme: true, voiceId: "Voice1234567890", ttsModell: "eleven_v4" }));
  await zeilen(await chat(w, e, { messages: frage, stimme: {} })); await Promise.all(ctx.pending);
  const v4 = tts.at(-1).body;
  check(v4.model_id === "eleven_v4" && JSON.stringify(Object.keys(v4.voice_settings).sort()) === '["similarity_boost","stability"]' && !("language_code" in v4), "Eleven v4: nur Stabilität und Ähnlichkeit, ohne language_code", JSON.stringify(v4.voice_settings));
  ttsAntwort = () => new Response("kaputt", { status: 500 });
  z = await zeilen(await chat(w, e, { messages: frage, stimme: {} })); await Promise.all(ctx.pending);
  check(z[0].reply && z[1].stimme === null && z[1].grund === "fehler", "Anbieter gestört: Text bleibt, Stimme „fehler“ (die Seite liest lokal vor)");
  ttsAntwort = () => new Response(new Uint8Array([1, 2, 3]), { status: 200 });

  w = await frisch(); e = env({ ELEVENLABS_API_KEY: "xi-test" }, sprache({ stimme: true, voiceId: "Voice1234567890", zeichenMonat: 10 }));
  const vorher = tts.length, mailsVorher = mails.length;
  z = await zeilen(await chat(w, e, { messages: frage, stimme: {} })); await Promise.all(ctx.pending);
  check(z[0].reply === modell.reply && z[1].stimme === null && z[1].grund === "grenze" && tts.length === vorher, "Monatsgrenze erreicht: Text statt Stimme, kein Aufruf, keine Fehlermeldung");
  await zeilen(await chat(w, e, { messages: frage, stimme: {} })); await Promise.all(ctx.pending);
  check(mails.length === mailsVorher + 1 && /Monatsgrenze für die Stimme/.test(mails.at(-1).subject), "Robin bekommt einmal eine E-Mail, nicht bei jeder Antwort");
}

console.log("Sprachmodus: schnelleres Modell");
{
  const w = await frisch(), e = env({}, sprache({ modell: "claude-haiku-5-5" }));
  await chat(w, e, { messages: frage });
  check(prompts.at(-1).model === "claude-opus-5-5", "getippt ohne Stimme: Standardmodell");
  await chat(w, e, { messages: frage, gesprochen: true });
  check(prompts.at(-1).model === "claude-haiku-5-5", "Frage per Spracheingabe: Modell des Sprachmodus");
  await zeilen(await chat(w, e, { messages: frage, stimme: {} }));
  check(prompts.at(-1).model === "claude-haiku-5-5", "mit Stimme: Modell des Sprachmodus");
  check(/# Gesprochen/.test(prompts.at(-1).system[0].text), "mit Stimme: Hinweis, so zu formulieren, wie man spricht");
  await chat(w, e, { messages: frage, gesprochen: true });
  check(!/# Gesprochen/.test(prompts.at(-1).system[0].text), "nur Spracheingabe, ohne Stimme: kein Sprechstil-Hinweis");
}

console.log("Einstellungen und Kundenfiguren");
{
  const base = defaults({});
  check(base.sprache.stimme === false && base.sprache.hoeren === false && base.sprache.zeichenMonat === 30000 && base.sprache.minutenTag === 20, "ab Werk aus, Grenzen 30.000 Zeichen und 20 Minuten");
  check(base.sprache.ttsModell === "eleven_v4", "Stimmmodell ab Werk: Eleven v4 (am menschlichsten)");
  const e = { USAGE: kv(), ANTHROPIC_API_KEY: "x", AI: ai };
  const prev = await loadSettings(e, true);
  let fehler = "";
  try { await saveSettings(e, { sprache: { stimme: true, voiceId: "Voice1234567890" } }, prev); } catch (x) { fehler = x.message; }
  check(/ELEVENLABS_API_KEY/.test(fehler), "Stimme ohne Schlüssel lässt sich nicht einschalten", fehler);
  try { await saveSettings({ ...e, ELEVENLABS_API_KEY: "k" }, { sprache: { stimme: true, voiceId: "" } }, prev); fehler = ""; } catch (x) { fehler = x.message; }
  check(/Voice ID/.test(fehler), "Stimme ohne Voice ID abgelehnt");
  const ok = await saveSettings({ ...e, ELEVENLABS_API_KEY: "k" }, { sprache: { stimme: true, hoeren: true, voiceId: "Voice1234567890", zeichenMonat: "12000" } }, prev);
  check(ok.sprache.stimme && ok.sprache.hoeren && ok.sprache.zeichenMonat === 12000 && ok.model === prev.model, "Sprache gespeichert, Betrieb unverändert");
  const wieder = await saveSettings(e, { enabled: true }, ok);
  check(wieder.sprache.voiceId === "Voice1234567890", "Speichern des Betriebs lässt die Sprache stehen");

  check(oeffentlicheFigur() && oeffentlicheFigur().id === "goch" && oeffentlicheFigur("kunde-x") === null && oeffentlicheFigur("toString") === null, "öffentlich nur Goch");
  const figur = { id: "Kunde-Muster", sprachen: ["de"], name: { de: "Muster" }, rolle: { de: "Empfang" }, begruessung: { de: "Willkommen!" },
    fragen: { de: ["Was bieten Sie an?", "", "Wo finde ich Sie?"] }, persoenlichkeit: "Freundlich, Sie-Form.", wissen: "Die Muster GmbH. ".repeat(20), quellen: "Freigabe per E-Mail am 20.10.2026" };
  const n = pruefeKundenfigur(figur);
  check(n.id === "kunde-muster" && n.fragen.de.length === 2 && n.antwortenTag === 200, "Kundenfigur geprüft und bereinigt");
  for (const [label, kaputt, text] of [["Kennung ohne kunde-", { ...figur, id: "muster" }, "Kennung"], ["ohne Quellen", { ...figur, quellen: "" }, "Quellen"],
    ["zu wenig Wissen", { ...figur, wissen: "kurz" }, "Wissen"], ["Voice ID mit Sonderzeichen", { ...figur, voiceId: "abc/def../x" }, "Voice ID"]]) {
    let m = ""; try { pruefeKundenfigur(kaputt); } catch (x) { m = x.message; }
    check(m.includes(text), "abgelehnt: " + label, m);
  }
  const ke = { USAGE: kv() };
  await speichereKundenfigur(ke, figur);
  check((await kundenfiguren(ke)).length === 1 && (await kundenfigur(ke, "kunde-muster")).name.de === "Muster" && ![...ke.USAGE.map.keys()].some(k => !/^figur:|^figuren:index$/.test(k)), "gespeichert nur im KV (figur:…, Index)");
  await loescheKundenfigur(ke, "kunde-muster");
  check((await kundenfiguren(ke)).length === 0, "gelöscht");
}

console.log("Goch zeigt eine Stelle der Seite (zeigen)");
{
  const w = await frisch(), e = env({}, sprache({}));
  modell = { reply: "Hier sehen Sie alle Werkzeuge.", action: null, message: null, link: null, zeigen: "werkzeuge" };
  const systemtext = () => prompts.at(-1).system.map(s => s.text).join("\n");
  let o = await (await chat(w, e, { messages: [{ role: "user", content: "Zeig mir die Werkzeuge" }], kannZeigen: true })).json();
  check(o.zeigen === "werkzeuge" && o.reply === "Hier sehen Sie alle Werkzeuge.", "erlaubte Stelle wird weitergegeben", o.zeigen);
  check(/Zusätzliches Feld "zeigen"/.test(systemtext()), "Hinweis nennt die erlaubten Stellen");
  modell = { reply: "Hier entlang.", action: null, message: null, link: null, zeigen: "redaktion" };
  o = await (await chat(w, e, { messages: [{ role: "user", content: "Zeig mir die Redaktion" }], kannZeigen: true })).json();
  check(o.zeigen === null, "unbekannte Stelle verworfen", o.zeigen);
  modell = { reply: "Hier sehen Sie alle Werkzeuge.", action: null, message: null, link: null, zeigen: "werkzeuge" };
  o = await (await chat(w, e, { messages: [{ role: "user", content: "Zeig mir die Werkzeuge" }] })).json();
  check(o.zeigen === null && !/Zusätzliches Feld "zeigen"/.test(systemtext()), "ohne kannZeigen: kein Hinweis, keine Stelle – wie vorher", o.zeigen);
  modell = { reply: "Robin baut gerade Werkzeuge für Kanzleien.", action: null, message: null, link: null };
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nStimme, Spracheingabe und Figuren in Ordnung.");
process.exit(fails ? 1 : 0);
