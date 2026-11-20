// Gochs Antwort im Strom (20.11.2026, Robin: „so schnell wie möglich“): Text erscheint, während das Modell schreibt, der erste
// Satz geht zur Stimme, bevor das Modell fertig ist, der KI-Hinweis klingt vor dem ersten Wort. Draht und Feedback werden
// weder vorab gezeigt noch vertont. Ältere Seiten (ohne strom) bekommen die Antwort wie bisher.
// Gebündelter Worker; Anthropic (als SSE-Strom, langsam), ElevenLabs und Resend abgefangen. Kein Netz.
//   node tests/goch_strom_test.mjs
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { teilAntwort } from "../worker/src/strom.js";
import { KI_HINWEIS } from "../worker/src/stimme.js";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };

console.log("Halb fertiges JSON lesen (teilAntwort)");
{
  const ganz = JSON.stringify({ action: null, message: null, reply: "Gern. Robin baut \"Werkzeuge\" für Kanzleien – mit Ä, ö\nund \\ Zeichen 😀.", link: null });
  const ziel = JSON.parse(ganz).reply;
  let ok = true, fertigZuFrueh = false, zuletzt = "";
  for (let i = 0; i <= ganz.length; i++) {
    const t = teilAntwort(ganz.slice(0, i));
    if (t.falsch) { ok = false; break; }
    if (t.reply !== null) {
      if (!ziel.startsWith(t.reply) || t.reply.length < zuletzt.length) { ok = false; break; }
      zuletzt = t.reply;
      if (t.fertig && t.reply !== ziel) fertigZuFrueh = true;
    }
  }
  check(ok && !fertigZuFrueh && teilAntwort(ganz).fertig && teilAntwort(ganz).reply === ziel, "an jeder Stelle abgeschnitten: Text wächst, Escapes richtig, fertig erst am Ende");
  const esc = JSON.stringify({ action: null, message: null, reply: "ä" }).replace("ä", "\\u00e4");
  check(teilAntwort(esc).reply === "ä" && teilAntwort(esc.slice(0, esc.indexOf("\\u") + 4)).reply === "", "\\u-Escape erst, wenn vollständig");
  check(teilAntwort('{"action":"message","message":{"name":"A","email":"a@b.de","text":"x"},"reply":"Ich ri').action === "message", "action vor reply erkannt");
  check(teilAntwort('{"reply":"Hallo","action":null}').falsch === true, "reply vor action: falsch geordnet, nichts vorab");
  check(teilAntwort('{"action":null,"message":{"name":"","email":"","text":"x,\\"reply\\":\\"y"}').reply === null, "„reply“ in einem Textwert zählt nicht");
}

// Gebündelter Worker wie im Betrieb
const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "rjl-goch-strom-"));
execSync(`npx wrangler deploy --dry-run --outdir "${out}"`, { cwd: join(root, "worker"), stdio: "pipe" });
const bundled = readFileSync(join(out, "index.js"), "utf8").replace(/import (\w+) from "\.\/([^"]+\.md)";/g,
  (_, name, file) => `const ${name} = ${JSON.stringify(readFileSync(join(out, file), "utf8"))};`);
writeFileSync(join(out, "test.mjs"), bundled);
let instanz = 0;
const frisch = async () => (await import(pathToFileURL(join(out, "test.mjs")).href + "?i=" + (++instanz))).default;

// Abgefangene Dienste. Anthropic antwortet im Strom als SSE in Stücken von 6 Zeichen, je 15 ms – so lässt sich prüfen, dass die
// Stimme beginnt, bevor das Modell fertig ist.
const prompts = [], tts = [], mails = [];
let modell = null, modellEnde = 0;
const sse = (ev, data) => `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`;
function strom(text) {
  const stuecke = text.match(/[\s\S]{1,6}/g), enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    async pull(c) {
      if (i === 0) {
        c.enqueue(enc.encode(sse("message_start", { type: "message_start", message: { id: "msg_t", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 9 } } })
          + sse("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })));
      }
      if (i < stuecke.length) {
        await new Promise(r => setTimeout(r, 15));
        c.enqueue(enc.encode(sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: stuecke[i++] } })));
        if (i === 1) i = 1; // erstes Stück geliefert
        return;
      }
      modellEnde = Date.now();
      c.enqueue(enc.encode(sse("content_block_stop", { type: "content_block_stop", index: 0 })
        + sse("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 40 } })
        + sse("message_stop", { type: "message_stop" })));
      c.close();
    },
  });
}
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith("https://api.resend.com")) { mails.push(JSON.parse(init.body)); return new Response('{"id":"t"}', { status: 200 }); }
  if (u.startsWith("https://api.elevenlabs.io")) {
    tts.push({ at: Date.now(), text: JSON.parse(init.body).text });
    return new Response(new Uint8Array([0x49, 0x44, 0x33, 1, 2]), { status: 200, headers: { "content-type": "audio/mpeg" } });
  }
  if (u.startsWith("https://api.anthropic.com")) {
    const b = JSON.parse(init.body); prompts.push(b);
    const text = JSON.stringify(modell);
    if (b.stream) return new Response(strom(text), { status: 200, headers: { "content-type": "text/event-stream", "request-id": "req_t" } });
    return new Response(JSON.stringify({ id: "msg_t", type: "message", role: "assistant", model: b.model, content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response("offline", { status: 503 });
};
function kv(start = {}) { const m = new Map(Object.entries(start)); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, String(v)); }, delete: async k => { m.delete(k); }, map: m }; }
const ctx = { pending: [], waitUntil(p) { if (p && p.catch) this.pending.push(p.catch(() => {})); } };
const settings = extra => JSON.stringify({ enabled: true, provider: "anthropic", model: "claude-opus-5-5", cache: true, custom: {},
  sprache: { stimme: true, hoeren: false, modell: "claude-haiku-5-5", voiceId: "Voice1234567890", ttsModell: "eleven_v4", zeichenMonat: 30000, minutenTag: 20, ...extra } });
const env = () => ({ USAGE: kv({ "settings:goch": settings() }), MAIL_TO: "robin@example.test", RESEND_API_KEY: "t", ANTHROPIC_API_KEY: "t",
  ELEVENLABS_API_KEY: "xi", ALLOWED_ORIGINS: "https://robin.vision" });
let ip = 10;
const chat = (w, e, body) => w.fetch(new Request("https://goch.robin.vision/chat", { method: "POST",
  headers: { "content-type": "application/json", Origin: "https://robin.vision", "CF-Connecting-IP": "9.9.7." + ip++ },
  body: JSON.stringify({ lang: "de", figur: "goch", messages: [{ role: "user", content: "Woran arbeitet Robin?" }], ...body }) }), e, ctx);
const zeilen = async r => (await r.text()).trim().split("\n").map(l => JSON.parse(l));

const ANTWORT = "Robin baut gerade Werkzeuge für Kanzleien und Unternehmen. Er arbeitet an der E-Rechnung und an Workshops zur KI. Möchten Sie mehr hören?";

console.log("Nur Text im Strom");
{
  modell = { action: null, message: null, reply: ANTWORT, link: null, link2: null, zeigen: null };
  const w = await frisch(), e = env();
  const r = await chat(w, e, { strom: true });
  const z = await zeilen(r); await Promise.all(ctx.pending);
  const vorab = z.filter(x => typeof x.vorab === "string"), antwort = z.find(x => "reply" in x);
  const p = prompts.at(-1), props = Object.keys(p.output_config.format.schema.properties);
  check(r.headers.get("content-type").includes("ndjson") && r.headers.get("access-control-allow-origin") === "https://robin.vision", "NDJSON mit CORS");
  check(p.stream === true && props.indexOf("action") < props.indexOf("reply"), "Modell im Strom, action vor reply im Schema", props.join(","));
  check(vorab.length >= 3 && vorab.every(x => ANTWORT.startsWith(x.vorab)) && vorab.every((x, i) => !i || x.vorab.length >= vorab[i - 1].vorab.length), "Text wächst in ganzen Wörtern", vorab.length + " Zeilen: " + vorab.map(x => x.vorab.length).join(","));
  check(antwort && antwort.reply === ANTWORT && z.indexOf(antwort) === z.length - 1 && !z.some(x => "stimme" in x), "Antwortzeile zuletzt, ohne Stimme");
}

console.log("Strom mit Stimme, erste gesprochene Antwort");
{
  modell = { action: null, message: null, reply: ANTWORT, link: null, link2: null, zeigen: null };
  tts.length = 0;
  const w = await frisch(), e = env();
  const t0 = Date.now();
  const r = await chat(w, e, { strom: true, stimme: { erste: true, teile: true } });
  const z = await zeilen(r); await Promise.all(ctx.pending);
  const antwort = z.find(x => "reply" in x), ia = z.indexOf(antwort), stimmen = z.filter(x => x.stimme);
  const erster = tts.find(x => x.text.startsWith("Robin baut"));
  check(tts[0] && tts[0].text === KI_HINWEIS.de && tts[0].at - t0 < 40, "KI-Hinweis geht sofort zur Stimme, vor dem ersten Wort");
  check(erster && erster.text === "Robin baut gerade Werkzeuge für Kanzleien und Unternehmen." && erster.at < modellEnde, "erster Satz wird vertont, bevor das Modell fertig ist", erster ? (modellEnde - erster.at) + " ms früher" : "");
  check(z.slice(0, ia).some(x => x.stimme), "erste Abschnitte der Stimme schon vor der Antwortzeile");
  check(antwort.reply === KI_HINWEIS.de + " " + ANTWORT && antwort.ki === true && z.filter(x => x.vorab).every(x => x.vorab.startsWith(KI_HINWEIS.de)), "KI-Hinweis im Text vorn, auch im Vorabtext");
  check(tts.map(x => x.text).join(" ") === KI_HINWEIS.de + " " + ANTWORT && stimmen.length === 3 && stimmen.map(x => x.stimme.teil).join() === "1,2,3", "ganze Antwort vertont, jeder Abschnitt einmal, in Reihenfolge", tts.map(x => x.text.slice(0, 12)).join(" | "));
  const monat = JSON.parse(e.USAGE.map.get("stimme:monat:" + new Date().toISOString().slice(0, 7)));
  check(monat.zeichen === tts.map(x => x.text.length).reduce((a, b) => a + b) && monat.antworten === 1 && monat.strom.antworten === 1 && monat.letzte.msTon >= 0,
    "Monatswerte: vertonte Zeichen, Zeit bis zum ersten Ton", JSON.stringify(monat.letzte));
  // zweite Antwort: KI-Hinweis ist gemerkt, geht nicht mehr zum Anbieter
  tts.length = 0;
  await zeilen(await chat(w, e, { strom: true, stimme: { erste: true, teile: true } })); await Promise.all(ctx.pending);
  check(!tts.some(x => x.text === KI_HINWEIS.de), "KI-Hinweis beim nächsten Mal aus dem Speicher");
}

console.log("Draht und Adressen: nichts vorab");
{
  modell = { action: "message", message: { name: "Max Muster", email: "max@example.test", text: "Bitte um Rückruf" }, reply: "Ich richte Robin aus, dass Max Muster um Rückruf bittet.", link: null, link2: null, zeigen: null };
  tts.length = 0; mails.length = 0;
  const w = await frisch(), e = env();
  const z = await zeilen(await chat(w, e, { strom: true, stimme: { teile: true } })); await Promise.all(ctx.pending);
  const antwort = z.find(x => "reply" in x);
  check(!z.some(x => x.vorab) && !tts.some(x => /Max|Rückruf|example/.test(x.text)), "Draht: kein Vorabtext, keine Angaben bei ElevenLabs", tts.map(x => x.text).join(" | "));
  check(antwort.reply.startsWith("Ausgerichtet") && mails.length === 1 && tts.length === 1 && tts[0].text === "Ich habe Ihre Nachricht an Robin weitergegeben.", "Worker richtet aus, gesprochen nur der neutrale Satz");

  modell = { action: null, message: null, reply: "Schreiben Sie Robin gern. Seine Adresse ist robin@robin.vision, er antwortet schnell. Bis bald!", link: null, link2: null, zeigen: null };
  tts.length = 0;
  await zeilen(await chat(await frisch(), env(), { strom: true, stimme: { teile: true } })); await Promise.all(ctx.pending);
  check(!tts.some(x => x.text.includes("@")), "Abschnitt mit Adresse wird nicht vertont", tts.map(x => x.text).join(" | "));
}

console.log("Ohne strom wie bisher");
{
  modell = { action: null, message: null, reply: ANTWORT, link: null, link2: null, zeigen: null };
  const r = await chat(await frisch(), env(), {});
  const d = await r.json(); await Promise.all(ctx.pending);
  check(r.headers.get("content-type").includes("application/json") && d.reply === ANTWORT && prompts.at(-1).stream !== true, "ältere Seite: JSON, Modell ohne Strom");
  const o = await (await frisch()).fetch(new Request("https://goch.robin.vision/chat", { method: "OPTIONS", headers: { Origin: "https://robin.vision" } }), env(), ctx);
  check(o.status === 204 && o.headers.get("access-control-max-age") === "86400", "Vorabfrage wird einen Tag gemerkt");
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nStrom in Ordnung.");
process.exit(fails ? 1 : 0);
