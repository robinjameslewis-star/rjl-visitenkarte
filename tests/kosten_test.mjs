// Kostenbremsen der Website atomar (Sicherheitsprüfung 11.11.2026, M3): viele gleichzeitige Anfragen bleiben unter den Deckeln
// für Gochs Antworten, Stimme und Spracheingabe. Bündelt den Worker wie kiosk_worker_test.mjs. Das nachgebildete Durable Object
// arbeitet Anfragen nacheinander ab wie das echte (Eingangstor); ohne dieses Tor wäre schon der alte Code „atomar“.
//   node tests/kosten_test.mjs
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "rjl-kosten-"));
execSync(`npx wrangler deploy --dry-run --outdir "${out}"`, { cwd: join(root, "worker"), stdio: "pipe" });
const bundled = readFileSync(join(out, "index.js"), "utf8").replace(/import (\w+) from "\.\/([^"]+\.md)";/g,
  (_, name, file) => `const ${name} = ${JSON.stringify(readFileSync(join(out, file), "utf8"))};`);
writeFileSync(join(out, "test.mjs"), bundled);
// je Fall ein frisches Modul: Einstellungen (eine Minute gemerkt) und weiche Grenzen je Instanz beginnen neu
const href = pathToFileURL(join(out, "test.mjs")).href;
let modul, worker, nr = 0;
const frisch = async () => { modul = await import(href + "?fall=" + (++nr)); worker = modul.default; };

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const pause = () => new Promise(r => setTimeout(r, 1));

let modellAufrufe = 0, ttsZeichen = 0, ttsFehler = false;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith("https://api.anthropic.com")) {
    modellAufrufe++; await pause();
    return new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-opus-5-5",
      content: [{ type: "text", text: JSON.stringify({ reply: "Robin baut Werkzeuge.", action: null, message: null, link: null, link2: null }) }],
      stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }),
      { status: 200, headers: { "content-type": "application/json" } });
  }
  if (u.startsWith("https://api.elevenlabs.io")) {
    await pause();
    if (ttsFehler) return new Response("kaputt", { status: 500 });
    ttsZeichen += JSON.parse(init.body).text.length; return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  }
  return new Response("offline", { status: 503 });
};
// KV mit Verzögerung: so überholen sich gleichzeitige Anfragen wie im echten Betrieb
function kv() { const m = new Map(); return { map: m, get: async k => { await pause(); return m.get(k) ?? null; }, put: async (k, v) => { await pause(); m.set(k, String(v)); },
  delete: async k => { m.delete(k); }, list: async ({ prefix } = {}) => ({ keys: [...m.keys()].filter(k => !prefix || k.startsWith(prefix)).map(name => ({ name })) }) }; }
function geraeteNamespace(Klasse) {
  const instanzen = new Map();
  const speicher = () => { const m = new Map(); return { map: m, get: async k => { await pause(); return m.get(k); }, put: async (k, v) => { await pause(); m.set(k, v); },
    delete: async k => { (Array.isArray(k) ? k : [k]).forEach(x => m.delete(x)); }, list: async ({ prefix } = {}) => new Map([...m].filter(([k]) => !prefix || k.startsWith(prefix))) }; };
  return { instanzen, idFromName: n => "id:" + n, get: id => {
    if (!instanzen.has(id)) instanzen.set(id, { o: new Klasse({ storage: speicher() }, {}), kette: Promise.resolve() });
    const i = instanzen.get(id);
    // Eingangstor: eine Anfrage nach der anderen
    return { fetch: (url, init) => { const p = i.kette.then(() => i.o.fetch(new Request(url, init))); i.kette = p.catch(() => {}); return p; } };
  } };
}
const ctx = () => ({ pending: [], waitUntil(p) { if (p && p.catch) this.pending.push(p.catch(() => {})); } });
const settings = extra => JSON.stringify({ enabled: true, provider: "anthropic", model: "claude-opus-5-5", cache: true, custom: {},
  sprache: { stimme: true, hoeren: true, modell: "claude-haiku-5-5", voiceId: "GochVoice1234", ttsModell: "eleven_flash_v2_5", zeichenMonat: 100000, minutenTag: 20, ...extra } });
async function umgebung(extra = {}, sprache = {}) {
  await frisch();
  const e = { USAGE: kv(), GERAETE: geraeteNamespace(modul.Geraetebudget), ANTHROPIC_API_KEY: "a", ELEVENLABS_API_KEY: "xi",
    ALLOWED_ORIGINS: "https://robin.vision", MAX_PER_DAY: "20", ...extra };
  e.USAGE.map.set("settings:goch", settings(sprache));
  return e;
}
const chat = (e, c, n, body = {}) => worker.fetch(new Request("https://goch.robin.vision/chat", { method: "POST",
  headers: { origin: "https://robin.vision", "content-type": "application/json", "CF-Connecting-IP": "10.0." + Math.floor(n / 200) + "." + (n % 200) },
  body: JSON.stringify({ messages: [{ role: "user", content: "Wer ist Robin?" }], ...body }) }), e, c);
function wav(sek) { const n = Math.round(sek * 16000) * 2, b = Buffer.alloc(44 + n); b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n, 40); return new Uint8Array(b); }
const hoeren = (e, c, n) => worker.fetch(new Request("https://goch.robin.vision/listen?lang=de", { method: "POST",
  headers: { origin: "https://robin.vision", "content-type": "audio/wav", "CF-Connecting-IP": "10.1." + Math.floor(n / 200) + "." + (n % 200) }, body: wav(10) }), e, c);
const tag = new Date().toISOString().slice(0, 10), monat = tag.slice(0, 7);
const kosten = e => e.GERAETE.instanzen.get("id:website:kosten").o.state.storage.map;

console.log("Antworten je Tag");
{
  const e = await umgebung(), c = ctx(); modellAufrufe = 0;
  await Promise.all(Array.from({ length: 60 }, (_, n) => chat(e, c, n)));
  await Promise.all(c.pending);
  check(modellAufrufe === 20, "60 gleichzeitige Fragen, Deckel 20: genau 20 Modellaufrufe", "Aufrufe " + modellAufrufe);
  check(kosten(e).get("tag:" + tag + ":antworten") === 20, "Durable Object zählt 20");
  check(e.USAGE.map.get("usage:" + tag) === "20", "KV-Anzeige der Redaktion stimmt", e.USAGE.map.get("usage:" + tag));
}
{
  const e = await umgebung(), c = ctx(); modellAufrufe = 0;
  e.USAGE.map.set("usage:" + tag, "15"); // vor dem Ausrollen schon 15 gezählt
  await Promise.all(Array.from({ length: 30 }, (_, n) => chat(e, c, n)));
  check(modellAufrufe === 5, "Übergang: der Tag zählt beim Stand aus dem KV weiter (15 + 5)", "Aufrufe " + modellAufrufe);
}
{
  const e = await umgebung({ GERAETE: { idFromName: n => n, get: () => ({ fetch: async () => { throw new Error("weg"); } }) } }), c = ctx(); modellAufrufe = 0;
  const r = await (await chat(e, c, 1)).json();
  check(modellAufrufe === 0 && r.reply && r.action === null, "Durable Object nicht erreichbar: kein Modellaufruf, Goch macht Pause");
}

console.log("Stimme je Monat");
{
  const e = await umgebung({ MAX_PER_DAY: "500" }, { zeichenMonat: 210 }), c = ctx(); ttsZeichen = 0; // „Robin baut Werkzeuge.“ = 21 Zeichen
  const antworten = await Promise.all(Array.from({ length: 30 }, (_, n) => chat(e, c, n, { stimme: {} }).then(r => r.text())));
  await Promise.all(c.pending);
  check(ttsZeichen <= 210 && ttsZeichen === 210, "30 gleichzeitige Antworten mit Stimme, Deckel 210 Zeichen: höchstens 210 vertont", "vertont " + ttsZeichen);
  check(antworten.filter(a => a.includes('"grund":"grenze"')).length === 20, "die übrigen 20 bekommen nur Text");
  check(kosten(e).get("monat:" + monat + ":zeichen") === 210, "Durable Object zählt 210 Zeichen");
}
{
  const e = await umgebung({ MAX_PER_DAY: "500" }, { zeichenMonat: 1000 }), c = ctx(); ttsFehler = true;
  await (await chat(e, c, 1, { stimme: {} })).text(); await Promise.all(c.pending); ttsFehler = false;
  check(kosten(e).get("monat:" + monat + ":zeichen") === 0, "Anbieter-Fehler: vorgemerkte Zeichen gehen zurück", String(kosten(e).get("monat:" + monat + ":zeichen")));
}

console.log("Spracheingabe je Tag");
{
  const e = await umgebung({ MAX_HOEREN_ANFRAGEN_TAG: "400" }, { minutenTag: 1 }), c = ctx(); // 60 s, Aufnahmen à 10 s
  let erkannt = 0; e.AI = { async run() { erkannt++; await pause(); return { text: "Was macht Robin?" }; } };
  await Promise.all(Array.from({ length: 20 }, (_, n) => hoeren(e, c, n)));
  check(erkannt === 6, "20 gleichzeitige Aufnahmen à 10 s, Deckel 60 s: genau 6 erkannt", "erkannt " + erkannt);
}
{
  const e = await umgebung({ MAX_HOEREN_ANFRAGEN_TAG: "3" }, { minutenTag: 20 }), c = ctx();
  let erkannt = 0; e.AI = { async run() { erkannt++; await pause(); return { text: "Was macht Robin?" }; } };
  await Promise.all(Array.from({ length: 10 }, (_, n) => hoeren(e, c, n)));
  check(erkannt === 3 && kosten(e).get("tag:" + tag + ":sekunden") === 30, "Deckel Aufnahmen 3: 3 erkannt, Sekunden der abgewiesenen zurückgebucht",
    erkannt + " / " + kosten(e).get("tag:" + tag + ":sekunden"));
}
{
  const e = await umgebung({}, { minutenTag: 20 }), c = ctx();
  e.AI = { async run() { throw new Error("Erkennung kaputt"); } };
  await hoeren(e, c, 1);
  check(kosten(e).get("tag:" + tag + ":sekunden") === 0 && kosten(e).get("tag:" + tag + ":anfragen") === 0, "Erkennung scheitert: beide Zähler zurück");
}

console.log("Grenze je Adresse und Minute");
{
  const e = await umgebung({ MAX_PER_DAY: "500" }), c = ctx(); modellAufrufe = 0;
  e.GOCH_IP_LIMIT = { zaehler: new Map(), async limit({ key }) { const n = (this.zaehler.get(key) || 0) + 1; this.zaehler.set(key, n); return { success: n <= 10 }; } };
  const gleicheAdresse = n => worker.fetch(new Request("https://goch.robin.vision/chat", { method: "POST",
    headers: { origin: "https://robin.vision", "content-type": "application/json", "CF-Connecting-IP": "10.9.9." + (n % 2) },
    body: JSON.stringify({ messages: [{ role: "user", content: "Wer ist Robin?" }] }) }), e, c);
  await Promise.all(Array.from({ length: 30 }, (_, n) => gleicheAdresse(n)));
  check(modellAufrufe <= 20, "zwei Adressen, je 15 Fragen: höchstens 10 je Adresse beim Modell", "Aufrufe " + modellAufrufe);
}

console.log("Anmeldecode der Lizenz (M4)");
{
  const e = await umgebung({ RESEND_API_KEY: "r", MAX_LIZENZ_CODES_PER_DAY: "100" }), c = ctx();
  const mails = [], alt = globalThis.fetch;
  globalThis.fetch = async (url, init) => String(url).startsWith("https://api.resend.com") ? (mails.push(JSON.parse(init.body)), new Response('{"id":"x"}')) : alt(url, init);
  const lizenz = (pfad, body, ip = "10.5.0.1") => worker.fetch(new Request("https://goch.robin.vision/lizenz/" + pfad, { method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify({ werkzeug: "erechnung", email: "test@example.test", ...body }) }), e, c);
  check((await lizenz("code", {})).status === 200 && mails.length === 1, "Code verschickt");
  const code = mails[0].text.match(/\b\d{6}\b/)[0];
  const falsch = String((+code + 1) % 1_000_000).padStart(6, "0");
  const antworten = await Promise.all(Array.from({ length: 20 }, (_, n) => lizenz("anmelden", { code: falsch }, "10.5.1." + n).then(r => r.json())));
  check(antworten.filter(a => /falsch|incorrect|stimmt nicht/i.test(a.error || "")).length <= 5, "20 gleichzeitige falsche Versuche: höchstens 5 verglichen",
    antworten.map(a => a.error).filter(Boolean).length + " Fehler");
  const danach = await (await lizenz("anmelden", { code }, "10.5.2.1")).json();
  check(!danach.sitzung, "danach hilft auch der richtige Code nicht mehr (neuen Code anfordern)");
  mails.length = 0; await lizenz("code", {}, "10.5.3.1");
  const neu = mails[0].text.match(/\b\d{6}\b/)[0];
  await lizenz("anmelden", { code: falsch === neu ? "000000" : falsch }, "10.5.3.2");
  const gut = await (await lizenz("anmelden", { code: neu }, "10.5.3.3")).json();
  check(typeof gut.sitzung === "string" && gut.sitzung.length > 20, "neuer Code: nach einem Fehlversuch klappt die Anmeldung");
  // Tagesdeckel atomar: 120 gleichzeitige Anforderungen für verschiedene Adressen, Deckel 100
  const e2 = await umgebung({ RESEND_API_KEY: "r", MAX_LIZENZ_CODES_PER_DAY: "100" }); mails.length = 0;
  await Promise.all(Array.from({ length: 120 }, (_, n) => worker.fetch(new Request("https://goch.robin.vision/lizenz/code", { method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": "10.6." + Math.floor(n / 9) + "." + n },
    body: JSON.stringify({ werkzeug: "erechnung", email: `p${n}@example.test` }) }), e2, ctx())));
  check(mails.length === 100, "120 gleichzeitige Code-Anforderungen, Deckel 100: genau 100 Mails", mails.length + " Mails");
  globalThis.fetch = alt;
}

console.log("Sicherheitsköpfe (N1)");
{
  const e = await umgebung(), c = ctx();
  for (const pfad of ["/", "/admin"]) {
    const r = await worker.fetch(new Request("https://goch.robin.vision" + pfad), e, c);
    check(/max-age=31536000/.test(r.headers.get("strict-transport-security") || "") && r.headers.get("x-content-type-options") === "nosniff", "HSTS und nosniff auf " + pfad);
  }
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nKostenbremsen in Ordnung.");
process.exit(fails ? 1 : 0);
