// Kiosk-Route des Workers (Messegerät, 23.10.2026): Geräteanmeldung, Gerätebudget im Durable Object statt IP-Grenzen,
// Goch am Gerät ohne Links und Newsletter, Kundenfiguren nur hier (eigener Systemprompt, ohne Draht, nur freigegebene
// Geräte), Stimme mit der voiceId der Figur, Spracheingabe mit Gerätebudget, Lebenszeichen, Nachweis nur als Hash.
// Gebündelter Worker; Workers AI, ElevenLabs, Anthropic, Resend und das Durable Object als Attrappen. Kein Netz.
//   node tests/kiosk_worker_test.mjs
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { speichereGeraet, geraetStand } from "../worker/src/kiosk.js";
import { speichereKundenfigur } from "../worker/src/figuren.js";

const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "rjl-kiosk-worker-"));
execSync(`npx wrangler deploy --dry-run --outdir "${out}"`, { cwd: join(root, "worker"), stdio: "pipe" });
const bundled = readFileSync(join(out, "index.js"), "utf8").replace(/import (\w+) from "\.\/([^"]+\.md)";/g,
  (_, name, file) => `const ${name} = ${JSON.stringify(readFileSync(join(out, file), "utf8"))};`);
writeFileSync(join(out, "test.mjs"), bundled);
const modul = await import(pathToFileURL(join(out, "test.mjs")).href);
const worker = modul.default;

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };

const mails = [], prompts = [], tts = [];
let modell = { reply: "Robin baut Werkzeuge.", action: null, message: null, link: null, link2: null };
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith("https://api.resend.com")) { mails.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); }
  if (u.startsWith("https://api.elevenlabs.io")) { tts.push({ url: u, body: JSON.parse(init.body) }); return new Response(new Uint8Array([1, 2, 3]), { status: 200 }); }
  if (u.startsWith("https://api.anthropic.com")) {
    prompts.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [{ type: "text", text: JSON.stringify(modell) }],
      stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response("offline", { status: 503 });
};
function kv() { const m = new Map(); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, String(v)); }, delete: async k => { m.delete(k); }, map: m }; }
// Durable Object: je Name eine Instanz mit Speicher im RAM, Anfragen wie im Worker als fetch()
function geraeteNamespace(Klasse) {
  const instanzen = new Map();
  const speicher = () => { const m = new Map(); return { get: async k => m.get(k), put: async (k, v) => { m.set(k, v); },
    delete: async k => { (Array.isArray(k) ? k : [k]).forEach(x => m.delete(x)); }, list: async ({ prefix } = {}) => new Map([...m].filter(([k]) => !prefix || k.startsWith(prefix))) }; };
  return { idFromName: n => "id:" + n, get: id => { if (!instanzen.has(id)) instanzen.set(id, new Klasse({ storage: speicher() }, {})); const o = instanzen.get(id); return { fetch: (url, init) => o.fetch(new Request(url, init)) }; } };
}
const ctx = { pending: [], waitUntil(p) { if (p && p.catch) this.pending.push(p.catch(() => {})); } };
const ai = { aufrufe: 0, async run() { this.aufrufe++; return { text: "Was macht Robin?" }; } };
const settings = extra => JSON.stringify({ enabled: true, provider: "anthropic", model: "claude-opus-5-5", cache: true, custom: {},
  sprache: { stimme: true, hoeren: true, modell: "claude-haiku-5-5", voiceId: "GochVoice1234", ttsModell: "eleven_flash_v2_5", zeichenMonat: 100000, minutenTag: 20, ...extra } });
async function umgebung() {
  const e = { USAGE: kv(), AI: ai, GERAETE: geraeteNamespace(modul.Geraetebudget), MAIL_TO: "robin@example.test", RESEND_API_KEY: "r", ANTHROPIC_API_KEY: "a",
    ELEVENLABS_API_KEY: "xi", ALLOWED_ORIGINS: "https://robin.vision" };
  e.USAGE.map.set("settings:goch", settings());
  return e;
}
const kiosk = (e, pfad, token, body, typ = "application/json", methode = "POST") => worker.fetch(new Request("https://goch.robin.vision" + pfad,
  { method: methode, headers: { ...(token ? { authorization: "Bearer " + token } : {}), "content-type": typ }, body: methode === "GET" ? undefined : (typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body)) }), e, ctx);
const frage = [{ role: "user", content: "Wer ist Robin?" }];
function wav(sek) { const n = Math.round(sek * 16000) * 2, b = Buffer.alloc(44 + n); b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n, 40); return new Uint8Array(b); }
const kunde = { id: "kunde-muster", sprachen: ["de", "en"], name: { de: "Muster", en: "Muster" }, rolle: { de: "der Empfang der Muster GmbH", en: "front desk" },
  begruessung: { de: "Willkommen!", en: "Welcome!" }, fragen: { de: ["Was bieten Sie an?"], en: ["What do you offer?"] }, persoenlichkeit: "Freundlich, trocken humorvoll.",
  wissen: "Die Muster GmbH baut Prüfgeräte für Kanzleien in Balingen. ".repeat(8), quellen: "Freigabe per E-Mail vom 20.10.2026", voiceId: "KundeVoice123", antwortenTag: 100 };

console.log("Anmeldung und Nachweis");
{
  const e = await umgebung();
  const { token, geraet } = await speichereGeraet(e, { id: "messe-1", name: "Stele Stuttgart", figuren: ["goch"], antwortenTag: 3, minutenTag: 1 });
  check(/^messe-1\.[A-Za-z0-9_-]{40,}$/.test(token) && !("tokenHash" in geraet), "Nachweis beim Anlegen einmal zurück, Hash nicht in der Antwort");
  check(!e.USAGE.map.get("geraet:messe-1").includes(token.split(".")[1]) && /"tokenHash":"[0-9a-f]{64}"/.test(e.USAGE.map.get("geraet:messe-1")), "im KV nur der SHA-256 des Geheimnisses");
  check((await speichereGeraet(e, { id: "messe-1", name: "Stele Stuttgart" })).token === null, "Ändern liefert keinen neuen Nachweis");
  check((await kiosk(e, "/kiosk/chat", null, { messages: frage })).status === 401, "ohne Nachweis: 401");
  check((await kiosk(e, "/kiosk/chat", "messe-1.falschfalschfalschfalschfalsch", { messages: frage })).status === 401, "falsches Geheimnis: 401");
  check((await kiosk(e, "/kiosk/chat", token, { messages: frage })).status === 200, "richtiger Nachweis: 200");
  const neu = (await speichereGeraet(e, { id: "messe-1" }, true)).token;
  check((await kiosk(e, "/kiosk/chat", token, { messages: frage })).status === 401 && (await kiosk(e, "/kiosk/chat", neu, { messages: frage })).status === 200, "neuer Nachweis: der alte gilt nicht mehr");
  await speichereGeraet(e, { id: "messe-1", an: false });
  check((await kiosk(e, "/kiosk/chat", neu, { messages: frage })).status === 401, "Gerät aus: 401");
  e.KIOSK_MTLS = "an"; await speichereGeraet(e, { id: "messe-1", an: true });
  check((await kiosk(e, "/kiosk/chat", neu, { messages: frage })).status === 401, "KIOSK_MTLS an, ohne geprüftes Client-Zertifikat: 401");
}

console.log("Goch am Gerät: Budget statt IP-Grenzen, ohne Links und Newsletter");
{
  const e = await umgebung();
  const { token } = await speichereGeraet(e, { id: "messe-2", name: "Test", figuren: ["goch"], antwortenTag: 15, minutenTag: 1 });
  modell = { reply: "Robin baut Werkzeuge.", action: "newsletter", message: null, link: "werkzeuge", link2: null };
  let ok = 0; const aufrufeVorher = prompts.length;
  for (let i = 0; i < 15; i++) if ((await kiosk(e, "/kiosk/chat", token, { lang: "de", messages: frage })).status === 200) ok++;
  const r = await (await kiosk(e, "/kiosk/chat", token, { lang: "de", messages: frage })).json();
  check(ok === 15, "15 Antworten hintereinander (keine Grenze je Adresse)", ok);
  check(r.reply.startsWith("Für heute habe ich genug erzählt") && prompts.length - aufrufeVorher === 15, "16. Antwort: Gerätebudget erreicht, freundlicher Text, kein Modellaufruf", r.reply);
  check(![...e.USAGE.map.keys()].some(k => k.startsWith("usage:")), "Tageszähler der Website unberührt");
  const sys = prompts.at(-1).system[0].text;
  check(sys.includes("# Am Messegerät") && sys.includes("# Woran Robin gerade arbeitet"), "Gochs Profil plus Hinweis für das Messegerät");
  const e2 = await umgebung(); const t2 = (await speichereGeraet(e2, { id: "messe-3", name: "T", figuren: ["goch"] })).token;
  const a = await (await kiosk(e2, "/kiosk/chat", t2, { lang: "de", messages: frage })).json();
  check(a.link === null && a.link2 === null && a.action === null, "keine Links und keine Newsletter-Anmeldung am Gerät", JSON.stringify(a));
  // Draht: viele Besucher hinter einem Gerät – die Grenze je Adresse gilt nicht, die Tagesgrenze insgesamt schon
  const zusammenfassung = "Ich richte Robin aus: „Bitte melden“ – Von: Max Muster, max@example.com. Soll ich das so senden?";
  const vorher = mails.length;
  for (let i = 0; i < 4; i++) await kiosk(e2, "/kiosk/chat", t2, { lang: "de", messages: [{ role: "user", content: "Ich möchte Robin etwas ausrichten" }, { role: "assistant", content: zusammenfassung }, { role: "user", content: "Ja" }] });
  check(mails.length === vorher + 4, "vier bestätigte Nachrichten an Robin vom selben Gerät zugestellt", mails.length - vorher);
}

console.log("Kundenfiguren nur am freigegebenen Gerät");
{
  const e = await umgebung(), mailsVorher = mails.length;
  await speichereKundenfigur(e, kunde);
  const nur = (await speichereGeraet(e, { id: "messe-4", name: "Nur Goch", figuren: ["goch"] })).token;
  const alle = (await speichereGeraet(e, { id: "messe-5", name: "Kunde", figuren: ["goch", "kunde-muster"] })).token;
  check((await kiosk(e, "/kiosk/chat", nur, { figur: "kunde-muster", messages: frage })).status === 403, "nicht freigegeben: 403");
  modell = { reply: "Wir bauen Prüfgeräte.", action: "message", message: { name: "x", email: "x@y.z", text: "t" }, link: null, link2: null };
  const r = await kiosk(e, "/kiosk/chat", alle, { figur: "kunde-muster", lang: "de", messages: [{ role: "user", content: "Was bieten Sie an?" }] });
  const a = await r.json(), sys = prompts.at(-1).system[0].text;
  check(r.status === 200 && a.reply === "Wir bauen Prüfgeräte." && a.action === null && a.link === null, "Antwort der Kundenfigur, ohne Draht und Links", JSON.stringify(a));
  check(sys.includes("Du bist Muster, der Empfang der Muster GmbH") && sys.includes("Prüfgeräte für Kanzleien") && sys.includes("Freundlich, trocken humorvoll") && !sys.includes("Woran Robin gerade arbeitet"), "eigener Systemprompt mit Wissen und Persönlichkeit, ohne Gochs Profil");
  check(mails.length === mailsVorher && !e.USAGE.map.has("draht:" + new Date().toISOString().slice(0, 10)), "kein Draht für Kundenfiguren");
  const pub = await worker.fetch(new Request("https://goch.robin.vision/chat", { method: "POST", headers: { "content-type": "application/json", Origin: "https://robin.vision", "CF-Connecting-IP": "1.2.3.4" },
    body: JSON.stringify({ figur: "kunde-muster", lang: "de", messages: frage }) }), e, ctx);
  check(pub.status === 400, "über die öffentliche Route /chat weiterhin 400");
  const meta = await (await kiosk(e, "/kiosk/figur?id=kunde-muster", alle, null, "application/json", "GET")).json();
  check(meta.name.de === "Muster" && meta.begruessung.de === "Willkommen!" && !("wissen" in meta) && !("persoenlichkeit" in meta) && !("voiceId" in meta) && !("quellen" in meta), "Figur-Texte für das Gerät ohne Wissen, Persönlichkeit, Quellen und voiceId", Object.keys(meta).join(","));
  check((await kiosk(e, "/kiosk/figur?id=kunde-muster", nur, null, "application/json", "GET")).status === 403, "Texte nur für freigegebene Geräte");
  modell = { reply: "Willkommen am Stand.", action: null, message: null, link: null, link2: null };
  const z = (await (await kiosk(e, "/kiosk/chat", alle, { figur: "kunde-muster", lang: "de", messages: frage, gesprochen: true, stimme: { erste: true } })).text()).trim().split("\n").map(l => JSON.parse(l));
  await Promise.all(ctx.pending);
  check(z[0].reply.startsWith("Kurz vorab: Ich bin eine KI") && z[1].stimme && tts.at(-1).url.includes("/text-to-speech/KundeVoice123"), "Stimme der Kundenfigur (ihre voiceId), KI-Hinweis vorn");
  await speichereKundenfigur(e, { ...kunde, voiceId: "" });
  const z2 = (await (await kiosk(e, "/kiosk/chat", alle, { figur: "kunde-muster", lang: "de", messages: frage, stimme: {} })).text()).trim().split("\n").map(l => JSON.parse(l));
  check(z2[1].stimme === null && z2[1].grund === "aus" && !tts.at(-1).url.includes("GochVoice"), "ohne eigene voiceId nie Gochs Stimme – das Gerät liest lokal vor");
  await speichereKundenfigur(e, { ...kunde, an: false });
  check((await kiosk(e, "/kiosk/chat", alle, { figur: "kunde-muster", messages: frage })).status === 404, "Kundenfigur aus: 404");
}

console.log("Spracheingabe mit Gerätebudget, Lebenszeichen");
{
  const e = await umgebung();
  const { token } = await speichereGeraet(e, { id: "messe-6", name: "Mikro", figuren: ["goch"], minutenTag: 1 });
  let texte = [];
  for (let i = 0; i < 4; i++) { texte.push(await (await kiosk(e, "/kiosk/listen?lang=de", token, wav(19), "audio/wav")).json()); await Promise.all(ctx.pending); }
  check(texte.slice(0, 3).every(t => t.text === "Was macht Robin?") && texte[3].grenze === true && texte[3].text === "", "drei Aufnahmen à 19 s, die vierte über der Minute: Grenze, ohne Fehler", JSON.stringify(texte[3]));
  check(![...e.USAGE.map.keys()].some(k => k.startsWith("hoeren:tag:")), "Zähler der Website unberührt (Gerätebudget im Durable Object)");
  await kiosk(e, "/kiosk/lebenszeichen", token, { version: "1", commit: "abc1234", figur: "goch", online: true, radar: "ok", puffer: 0, inhalt: "nicht speichern" });
  const stand = await geraetStand(e, "messe-6");
  check(stand.lebenszeichen && stand.lebenszeichen.commit === "abc1234" && !("inhalt" in stand.lebenszeichen) && stand.heute.sekunden === 57, "Lebenszeichen gespeichert (nur bekannte Felder), Sekunden heute", JSON.stringify(stand));
  check((await kiosk(e, "/kiosk/unbekannt", token, {})).status === 404, "unbekannte Kiosk-Route: 404");
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nKiosk-Route in Ordnung.");
process.exit(fails ? 1 : 0);
