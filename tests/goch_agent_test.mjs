// Agentenschlüssel der Goch-Redaktion (worker/src/agent.js, tools/goch-agent.mjs), 17.11.2026.
// Prüft das gebündelte Worker-Paket (wie tests/worker_review_test.mjs) mit nachgebauter Umgebung: KV im Speicher (mit list und
// Metadaten), GitHub-API im Speicher, Anfragengrenze gezählt. Kein Netz, kein Modellaufruf, kein Deploy. Dazu das Hilfsskript mit
// einem nachgebauten „security“ und einem Server auf 127.0.0.1. Schlüssel entstehen zur Laufzeit und werden nie ausgegeben.
//   node tests/goch_agent_test.mjs
import { execSync, spawn } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "rjl-agent-"));
execSync(`npx wrangler deploy --dry-run --outdir "${out}"`, { cwd: join(root, "worker"), stdio: "pipe" });
const bundled = readFileSync(join(out, "index.js"), "utf8").replace(/import (\w+) from "\.\/([^"]+\.md)";/g,
  (_, name, file) => `const ${name} = ${JSON.stringify(readFileSync(join(out, file), "utf8"))};`);
writeFileSync(join(out, "test.mjs"), bundled);
const worker = (await import(pathToFileURL(join(out, "test.mjs")).href)).default;

let fails = 0, oks = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (ok) oks++; else fails++; };

// ---------- Nachbauten ----------
function kv(initial = {}) {
  const m = new Map(Object.entries(initial).map(([k, v]) => [k, { v, meta: null }]));
  return {
    map: m,
    get: async k => m.has(k) ? m.get(k).v : null,
    put: async (k, v, o = {}) => { m.set(k, { v: String(v), meta: o.metadata || null }); },
    delete: async k => { m.delete(k); },
    list: async ({ prefix = "", limit = 1000 } = {}) => ({ keys: [...m.keys()].filter(k => k.startsWith(prefix)).sort().slice(0, limit).map(name => ({ name, metadata: m.get(name).meta })), list_complete: true }),
  };
}
// GitHub: Dateien und Commits je Pfad im Speicher – genug für getFile, putFile, history
const repo = { files: new Map(), commits: [] };
const b64 = s => Buffer.from(s, "utf8").toString("base64");
let ghPuts = 0;
const mails = [];
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  if (u.hostname === "api.resend.com") { mails.push(JSON.parse(init.body)); return new Response('{"id":"t"}', { status: 200 }); }
  if (u.hostname === "api.github.com") {
    const method = init.method || "GET";
    let m = u.pathname.match(/^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
    if (m && method === "GET") {
      const path = decodeURIComponent(m[1]), ref = u.searchParams.get("ref");
      const c = ref && ref !== "main" ? repo.commits.find(x => x.sha === ref && x.path === path) : null;
      const content = c ? c.content : repo.files.get(path);
      if (content == null) return new Response('{"message":"Not Found"}', { status: 404 });
      return Response.json({ content: b64(content), sha: "f" + repo.commits.filter(x => x.path === path).length });
    }
    if (m && method === "PUT") {
      const path = decodeURIComponent(m[1]), body = JSON.parse(init.body);
      const content = Buffer.from(body.content, "base64").toString("utf8");
      repo.files.set(path, content); ghPuts++;
      const sha = "c" + (repo.commits.length + 1);
      repo.commits.unshift({ sha, path, content, message: body.message, date: new Date().toISOString() });
      return Response.json({ content: { sha: "f" + repo.commits.filter(x => x.path === path).length }, commit: { sha, html_url: "https://github.com/x/commit/" + sha } });
    }
    if (/\/commits$/.test(u.pathname) && method === "GET") {
      const path = u.searchParams.get("path"), n = +u.searchParams.get("per_page") || 2;
      return Response.json(repo.commits.filter(c => c.path === path).slice(0, n).map(c => ({ sha: c.sha, html_url: "", commit: { message: c.message, author: { date: c.date } } })));
    }
    return new Response('{"message":"Not Found"}', { status: 404 });
  }
  return new Response("offline", { status: 503 });
};
const ctx = { waitUntil: p => p && p.catch && p.catch(() => {}) };
let limitCalls = [];
const limiter = (max = 1000) => { const n = new Map(); return { limit: async ({ key }) => { limitCalls.push(key); n.set(key, (n.get(key) || 0) + 1); return { success: n.get(key) <= max }; } }; };
const toml = readFileSync(join(root, "worker", "wrangler.toml"), "utf8");
const env = (extra = {}) => ({ USAGE: kv(), MAIL_TO: "robin@example.test", MAIL_FROM: "Goch <goch@example.test>", RESEND_API_KEY: "test",
  ALLOWED_ORIGINS: "https://robin.vision", GITHUB_TOKEN: "gh-test", GITHUB_REPO: "x/y", GITHUB_BRANCH: "main", LOGIN_LIMIT: limiter(), AGENT_API: "an", ...extra });

const BASE = "https://goch.robin.vision";
const agentCall = (e, aktion, body, { key, headers = {}, method = "POST" } = {}) => worker.fetch(new Request(`${BASE}/admin/agent/${aktion}`, {
  method, headers: { "content-type": "application/json", "CF-Connecting-IP": "9.9.9.9", ...(key ? { authorization: "Bearer " + key } : {}), ...headers },
  body: method === "GET" ? undefined : JSON.stringify(body || {}) }), e, ctx);
async function sitzung(e, via) {
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
  await e.USAGE.put("admin:session:" + token, JSON.stringify({ email: e.MAIL_TO, at: new Date().toISOString(), via }));
  return token;
}
const redaktion = (e, token, api, method = "GET", body) => worker.fetch(new Request(`${BASE}/admin/api/${api}`, {
  method, headers: { "content-type": "application/json", "x-goch-admin": "1", cookie: "goch_admin=" + token }, body: body ? JSON.stringify(body) : undefined }), e, ctx);
async function neuerSchluessel(e, token) {
  const r = await redaktion(e, token, "agent/schluessel", "POST", { bezeichnung: "Test" });
  const d = await r.json();
  return { status: r.status, key: d.neu && d.neu.schluessel, id: d.neu && d.neu.id, d };
}
const logs = e => [...e.USAGE.map.entries()].filter(([k]) => k.startsWith("agent:log:")).map(([, v]) => v.meta);
const alleSchluesselWerte = [];

// 1. Funktionsschalter: wrangler.toml liefert „aus“, und aus heißt 404 für jeden Pfad – ohne KV-Zugriff
{
  check(/^AGENT_API = "aus"/m.test(toml), "wrangler.toml: AGENT_API = \"aus\" (Mergen schaltet nichts ein)");
  for (const wert of [undefined, "aus", "", "AN", "1", "true"]) {
    const e = env({ AGENT_API: wert });
    const r = await agentCall(e, "stand", {}, { key: "gochag_" + "a".repeat(43) });
    check(r.status === 404 && e.USAGE.map.size === 0, `Schalter ${JSON.stringify(wert)}: 404, nichts im KV`);
  }
  const e = env({ AGENT_API: "aus" });
  const r = await agentCall(e, "", {}, {});
  check(r.status === 404, "Schalter aus: auch /admin/agent/ ohne Aktion 404");
}

// 2. Schlüssel nur in der Redaktion mit Passkey-Sitzung; nur Prüfwert im KV; höchstens drei gültige
const e = env();
const pass = await sitzung(e, "Passkey MacBook");
{
  const code = await sitzung(e, "E-Mail-Code");
  const r = await neuerSchluessel(e, code);
  check(r.status === 403 && !r.key, "E-Mail-Code-Sitzung kann keinen Schlüssel erzeugen (403)");
  const ohne = await worker.fetch(new Request(`${BASE}/admin/api/agent/schluessel`, { method: "POST", headers: { "x-goch-admin": "1" }, body: "{}" }), e, ctx);
  check(ohne.status === 401, "ohne Sitzung: 401");
  const k = [];
  for (let i = 0; i < 3; i++) k.push(await neuerSchluessel(e, pass));
  check(k.every(x => x.status === 200 && /^gochag_[A-Za-z0-9_-]{43}$/.test(x.key)), "drei Schlüssel erzeugt (Format gochag_…)");
  alleSchluesselWerte.push(...k.map(x => x.key));
  const vierter = await neuerSchluessel(e, pass);
  check(vierter.status === 409, "vierter gültiger Schlüssel: 409");
  const gespeichert = e.USAGE.map.get("agent:schluessel").v;
  check(k.every(x => !gespeichert.includes(x.key) && !gespeichert.includes(x.key.slice(11))), "KV hält keinen Schlüssel, nur Prüfwert und Präfix");
  const liste = JSON.parse(gespeichert);
  check(liste.every(s => /^[a-f0-9]{64}$/.test(s.hash) && s.praefix.length === 11), "Prüfwert SHA-256 (hex) und Präfix mit 11 Zeichen");
  const tage = (Date.parse(liste[0].ablauf) - Date.now()) / 864e5;
  check(tage > 89.9 && tage <= 90, "Ablauf nach 90 Tagen");
  const ansicht = await (await redaktion(e, pass, "agent")).json();
  check(ansicht.schluessel.length === 3 && ansicht.schluessel.every(s => !("hash" in s)) && !JSON.stringify(ansicht).includes(k[0].key), "Ansicht ohne Prüfwert und ohne Schlüssel");
  globalThis.K = k;
}
const [k1, k2, k3] = globalThis.K;

// 3. Abweisungen: falsch, Format, abgelaufen, gesperrt → 401; Origin → 403; GET → 405; Cookie zählt nicht
{
  const vorher = e.USAGE.map.size;
  check((await agentCall(e, "stand", {}, {})).status === 401, "ohne Schlüssel: 401");
  check((await agentCall(e, "stand", {}, { key: "gochag_" + "b".repeat(43) })).status === 401, "falscher Schlüssel: 401");
  check((await agentCall(e, "stand", {}, { key: k1.key.slice(0, -1) })).status === 401, "abgeschnittener Schlüssel: 401");
  check((await agentCall(e, "stand", {}, { key: k1.key + "x" })).status === 401, "verlängerter Schlüssel: 401");
  const cookieNur = await agentCall(e, "stand", {}, { headers: { cookie: "goch_admin=" + pass } });
  check(cookieNur.status === 401, "Redaktions-Cookie ohne Schlüssel: 401 (keine Cookies)");
  check(e.USAGE.map.size === vorher, "abgewiesene Anfragen schreiben nichts in den KV");
  const o = await agentCall(e, "stand", {}, { key: k1.key, headers: { origin: "https://robin.vision" } });
  check(o.status === 403, "mit Origin-Kopf (Browser): 403, auch mit gültigem Schlüssel");
  const o2 = await agentCall(e, "stand", {}, { key: k1.key, headers: { origin: "https://goch.robin.vision" } });
  check(o2.status === 403, "Origin der Redaktion selbst: 403");
  check((await agentCall(e, "stand", null, { key: k1.key, method: "GET" })).status === 405, "GET: 405");
  check(limitCalls.length > 0 && limitCalls.every(x => x.startsWith("agent:")), "Grenze je Minute mit eigenem Zählerschlüssel „agent:…“");

  // abgelaufen
  const liste = JSON.parse(e.USAGE.map.get("agent:schluessel").v);
  const s2 = liste.find(s => s.id === k2.id); s2.ablauf = new Date(Date.now() - 1000).toISOString();
  await e.USAGE.put("agent:schluessel", JSON.stringify(liste));
  check((await agentCall(e, "stand", {}, { key: k2.key })).status === 401, "abgelaufener Schlüssel: 401");
  // verlängern macht ihn wieder gültig
  const v = await redaktion(e, pass, "agent/verlaengern", "POST", { id: k2.id });
  check(v.status === 200 && (await agentCall(e, "hilfe", {}, { key: k2.key })).status === 200, "verlängert: wieder gültig");
  // gesperrt
  const sp = await redaktion(e, pass, "agent/sperren", "POST", { id: k3.id });
  check(sp.status === 200 && (await agentCall(e, "hilfe", {}, { key: k3.key })).status === 401, "gesperrter Schlüssel: 401");
  check((await redaktion(e, pass, "agent/verlaengern", "POST", { id: k3.id })).status === 404, "gesperrter Schlüssel lässt sich nicht verlängern");
  const code = await sitzung(e, "E-Mail-Code");
  check((await redaktion(e, code, "agent/sperren", "POST", { id: k1.id })).status === 403, "Sperren ohne Passkey-Sitzung: 403");
  // nach dem Sperren ist wieder Platz für einen dritten
  const n = await neuerSchluessel(e, pass);
  check(n.status === 200, "nach dem Sperren: neuer dritter Schlüssel möglich");
  alleSchluesselWerte.push(n.key);
}

// 3b. Die API schreibt die Schlüsselliste nie (eine Sperre kann nicht von einem Aufruf mit altem Stand überschrieben werden);
//     „höchstens drei gültige“ gilt auch beim Verlängern
{
  const f = env();
  const p = await sitzung(f, "Passkey MacBook");
  const a = await neuerSchluessel(f, p), b = await neuerSchluessel(f, p), c = await neuerSchluessel(f, p);
  alleSchluesselWerte.push(a.key, b.key, c.key);
  const vorher = f.USAGE.map.get("agent:schluessel").v;
  check((await agentCall(f, "hilfe", {}, { key: a.key })).status === 200 && f.USAGE.map.get("agent:schluessel").v === vorher, "gültiger Aufruf lässt agent:schluessel unverändert");
  check(!!f.USAGE.map.get("agent:zuletzt:" + a.id), "letzte Nutzung in eigenem Eintrag");
  const ansicht = await (await redaktion(f, p, "agent")).json();
  check(ansicht.schluessel.find(s => s.id === a.id).zuletzt, "Ansicht zeigt die letzte Nutzung");
  // Aufruf, der noch den Stand vor der Sperre liest
  const alt = vorher;
  await redaktion(f, p, "agent/sperren", "POST", { id: b.id });
  const echtGet = f.USAGE.get;
  f.USAGE.get = async k => k === "agent:schluessel" ? alt : echtGet(k);
  f.USAGE.map.delete("agent:zuletzt:" + b.id);
  await agentCall(f, "hilfe", {}, { key: b.key });
  f.USAGE.get = echtGet;
  check(JSON.parse(f.USAGE.map.get("agent:schluessel").v).find(s => s.id === b.id).gesperrt, "Aufruf mit altem Stand überschreibt die Sperre nicht");
  check((await agentCall(f, "hilfe", {}, { key: b.key })).status === 401, "gesperrt bleibt gesperrt");
  // abgelaufen + drei gültige: Verlängern 409
  const d = await neuerSchluessel(f, p); alleSchluesselWerte.push(d.key);
  const l = JSON.parse(f.USAGE.map.get("agent:schluessel").v); l.find(s => s.id === c.id).ablauf = new Date(Date.now() - 1000).toISOString();
  await f.USAGE.put("agent:schluessel", JSON.stringify(l));
  const e4 = await neuerSchluessel(f, p); alleSchluesselWerte.push(e4.key);
  check(e4.status === 200, "abgelaufener zählt nicht: dritter gültiger wieder möglich");
  check((await redaktion(f, p, "agent/verlaengern", "POST", { id: c.id })).status === 409, "abgelaufenen verlängern bei drei gültigen: 409");
  check((await redaktion(f, p, "agent/verlaengern", "POST", { id: a.id })).status === 200, "gültigen verlängern bei drei gültigen: geht");
}

// 4. Stufe 3 ist nicht erreichbar; feste Tabelle
{
  const h = await (await agentCall(e, "hilfe", {}, { key: k1.key })).json();
  const namen = h.ergebnis.map(a => a.aktion).sort();
  check(JSON.stringify(namen) === JSON.stringify(["fragen", "fragen_erledigt", "hilfe", "inhalt", "stand", "veroeffentlichen", "wiederherstellen"]), "Tabelle: genau sieben Aktionen");
  check(h.ergebnis.every(a => a.stufe === 1), "alle Aktionen Stufe 1");
  for (const a of ["passkeys", "passkey_loeschen", "schluessel", "schluessel_erzeugen", "agent_schluessel", "sperren", "goch", "blog", "geraete", "landschaften", "site",
    "constructor", "__proto__", "toString", "hasOwnProperty", "content", "unanswered"]) {
    const r = await agentCall(e, a, { id: "x" }, { key: k1.key });
    check(r.status === 404, `Aktion „${a}“: 404`);
  }
  for (const pfad of ["api/passkeys", "api/agent/schluessel", "passkey/options", "STAND"]) {
    const r = await worker.fetch(new Request(`${BASE}/admin/agent/${pfad}`, { method: "POST", headers: { authorization: "Bearer " + k1.key, "content-type": "application/json" }, body: "{}" }), e, ctx);
    check(r.status === 404, `Pfad /admin/agent/${pfad}: 404`);
  }
  const hoch = await worker.fetch(new Request(`${BASE}/admin/agent/../api/state`, { headers: { authorization: "Bearer " + k1.key } }), e, ctx);
  check(hoch.status === 401, "/admin/agent/../api/state (wird zu /admin/api/state): 401 ohne Sitzung");
  // Bearer gilt nirgends sonst in der Redaktion
  const s = await worker.fetch(new Request(`${BASE}/admin/api/passkeys`, { method: "DELETE", headers: { authorization: "Bearer " + k1.key, "x-goch-admin": "1", "content-type": "application/json" }, body: '{"id":"aaaaaaaaaaaaaaaaaaaa"}' }), e, ctx);
  check(s.status === 401, "Bearer-Schlüssel an /admin/api/passkeys: 401");
  const sk = await worker.fetch(new Request(`${BASE}/admin/api/agent/schluessel`, { method: "POST", headers: { authorization: "Bearer " + k1.key, "x-goch-admin": "1" }, body: "{}" }), e, ctx);
  check(sk.status === 401, "Bearer-Schlüssel an der Schlüsselverwaltung: 401");
}

// 5. Fragen: ansehen und erledigt setzen, nur „unanswered:…“ (nie admin:passkeys)
{
  await e.USAGE.put("unanswered:wie alt ist goch", JSON.stringify({ q: "Wie alt ist Goch?", n: 3, lang: "de", last: "2026-11-16" }));
  await e.USAGE.put("unanswered:was kostet das", JSON.stringify({ q: "Was kostet das?", n: 1, lang: "de", last: "2026-11-15" }));
  await e.USAGE.put("admin:passkeys", JSON.stringify(["abc"]));
  const f = await (await agentCall(e, "fragen", {}, { key: k1.key })).json();
  check(f.ergebnis.length === 2 && f.ergebnis[0].n === 3, "fragen: zwei, häufigste zuerst");
  const boes = await agentCall(e, "fragen_erledigt", { keys: ["unanswered:was kostet das", "admin:passkeys"] }, { key: k1.key });
  check(boes.status === 400 && e.USAGE.map.has("admin:passkeys") && e.USAGE.map.has("unanswered:was kostet das"), "fragen_erledigt mit admin:passkeys: 400, nichts gelöscht");
  check((await agentCall(e, "fragen_erledigt", { key: "admin:session:x" }, { key: k1.key })).status === 400, "fragen_erledigt mit admin:session:…: 400");
  const ok = await agentCall(e, "fragen_erledigt", { keys: ["unanswered:was kostet das", "unanswered:wie alt ist goch"] }, { key: k1.key });
  check(ok.status === 200 && !e.USAGE.map.has("unanswered:was kostet das") && !e.USAGE.map.has("unanswered:wie alt ist goch"), "fragen_erledigt: beide entfernt");
  // derselbe Schutz in der Redaktion
  const r = await redaktion(e, pass, "unanswered", "DELETE", { key: "admin:passkeys" });
  check(r.status === 400 && e.USAGE.map.has("admin:passkeys"), "Redaktion: unanswered DELETE mit admin:passkeys weiter 400");
  e.USAGE.map.delete("admin:passkeys");
}

// 6. Veröffentlichen und Wiederherstellen: derselbe Weg wie die Redaktion (Prüfungen, Commit, KV-Kopie)
{
  repo.files.set("worker/aktuell.md", "# alt\n\n## Deutsch\n\nAlter Text, lang genug für die Prüfung.\n\n## English\n\nOld text, long enough for the check.\n");
  repo.commits.unshift({ sha: "c0", path: "worker/aktuell.md", content: repo.files.get("worker/aktuell.md"), message: "Anfang", date: "2026-11-01T00:00:00Z" });
  const felder = { stand: "17.11.2026", de: "Robin baut die Agentenschlüssel für die Redaktion.", en: "Robin is building agent keys for the editor." };
  const i = await (await agentCall(e, "inhalt", { art: "aktuell" }, { key: k1.key })).json();
  check(i.ergebnis && i.ergebnis.felder && /Alter Text/.test(i.ergebnis.felder.de), "inhalt: liefert die Felder aus dem Repository");
  const falsch = await agentCall(e, "veroeffentlichen", { art: "aktuell", felder: { ...felder, stand: "17.11." } }, { key: k1.key });
  check(falsch.status === 400 && /TT\.MM\.JJJJ/.test((await falsch.json()).error) && ghPuts === 0, "Prüfung der Redaktion greift (Stand falsch → 400, kein Commit)");
  const tel = "Goch ".repeat(310) + " Ruf an: +49 151 1234 5678";
  const tp = await agentCall(e, "veroeffentlichen", { art: "profile", felder: { text: tel } }, { key: k1.key });
  check(tp.status === 400 && ghPuts === 0, "Profil mit Telefonnummer: 400 wie in der Redaktion");
  check(!JSON.stringify(logs(e)).includes("1234"), "Protokoll ohne zitierte Eingaben");
  for (const art of ["constructor", "__proto__", "toString", "passkeys", ""]) {
    const r = await agentCall(e, "veroeffentlichen", { art, felder }, { key: k1.key });
    check(r.status === 400, `veroeffentlichen mit art „${art}“: 400`);
  }
  check((await agentCall(e, "veroeffentlichen", { art: "aktuell", felder: "x" }, { key: k1.key })).status === 400, "felder kein Objekt: 400");

  const ok = await agentCall(e, "veroeffentlichen", { art: "aktuell", felder }, { key: k1.key });
  const agentFassung = repo.files.get("worker/aktuell.md");
  check(ok.status === 200 && ghPuts === 1 && /Stand 17\.11\.2026/.test(agentFassung), "veroeffentlichen: Commit ins Repository");
  check(/^Agent: Woran Robin gerade arbeitet – Stand 17\.11\.2026$/.test(repo.commits[0].message), "Commit-Nachricht „Agent: …“");
  check(e.USAGE.map.get("content:aktuell").v === agentFassung && JSON.parse(e.USAGE.map.get("content:aktuell:meta").v).by === "agent", "KV-Kopie wie in der Redaktion, by = agent");
  const nochmal = await (await agentCall(e, "veroeffentlichen", { art: "aktuell", felder }, { key: k1.key })).json();
  check(nochmal.ergebnis.geaendert === false && ghPuts === 1, "gleiche Fassung: keine Änderung, kein Commit");
  // gleiche Felder über die Redaktion ergeben dieselbe Datei
  repo.files.set("worker/aktuell.md", "x");
  const red = await redaktion(e, pass, "content/aktuell", "PUT", felder);
  check(red.status === 200 && repo.files.get("worker/aktuell.md") === agentFassung && /^Dashboard: /.test(repo.commits[0].message), "Redaktion schreibt aus denselben Feldern dieselbe Datei (Nachricht weiter „Dashboard: …“)");
  // wiederherstellen: Inhalt des vorletzten Commits dieser Datei als neuer Commit
  repo.commits.unshift({ sha: "cx", path: "worker/aktuell.md", content: "neueste", message: "neu", date: new Date().toISOString() }); repo.files.set("worker/aktuell.md", "neueste");
  const vorige = repo.commits.filter(c => c.path === "worker/aktuell.md")[1].content;
  const w = await agentCall(e, "wiederherstellen", { art: "aktuell" }, { key: k1.key });
  check(w.status === 200 && vorige === agentFassung && repo.files.get("worker/aktuell.md") === vorige && /^Agent: .*vorige Fassung wiederhergestellt$/.test(repo.commits[0].message), "wiederherstellen: vorige Fassung als neuer Commit");
  check(e.USAGE.map.get("content:aktuell").v === vorige, "wiederherstellen: KV-Kopie nachgezogen");
  const ohneGh = env({ GITHUB_TOKEN: "" });
  ohneGh.USAGE = e.USAGE;
  const r503 = await agentCall(ohneGh, "veroeffentlichen", { art: "aktuell", felder }, { key: k1.key });
  check(r503.status === 503, "ohne GitHub-Schlüssel: 503 wie in der Redaktion");
  const st = await (await agentCall(e, "stand", {}, { key: k1.key })).json();
  check(st.ergebnis && st.ergebnis.inhalte && st.ergebnis.inhalte.aktuell && "aufrufe" in st.ergebnis && !("fields" in st.ergebnis.inhalte.aktuell), "stand: Übersicht ohne volle Texte");
}

// 7. Protokoll: jede Aktion mit Akteur „agent“, ohne Inhalte; Ansicht in der Redaktion
{
  const l = logs(e);
  const agentEintraege = l.filter(x => x.akteur === "agent");
  check(agentEintraege.length > 20, "Protokoll: Einträge mit Akteur „agent“");
  check(l.some(x => x.akteur === "robin" && x.aktion === "schluessel_erzeugt") && l.some(x => x.aktion === "schluessel_gesperrt"), "Schlüsselverwaltung steht mit Akteur „robin“ im Protokoll");
  check(agentEintraege.some(x => x.aktion === "veroeffentlichen" && x.art === "aktuell" && x.status === 200), "Veröffentlichen protokolliert mit art und Status");
  check(agentEintraege.some(x => x.aktion === "passkeys" && x.status === 404), "Versuch einer Stufe-3-Aktion steht im Protokoll (404)");
  const roh = JSON.stringify(l);
  check(!/Agentenschlüssel für die Redaktion|Robin baut|Telefon|unanswered:|gochag_/.test(roh), "Protokoll ohne Texte, Fragen und Schlüssel");
  check(l.every(x => Object.keys(x).every(k => ["at", "akteur", "aktion", "art", "stufe", "anzahl", "status", "schluessel"].includes(k))), "Protokoll: nur feste Felder");
  const ansicht = await (await redaktion(e, pass, "agent")).json();
  check(Array.isArray(ansicht.protokoll) && ansicht.protokoll.length === Math.min(200, l.length) && ansicht.protokoll[0].at >= ansicht.protokoll.at(-1).at, "Ansicht „Was der Agent getan hat“: neueste zuerst");
  check(ansicht.an === true && ansicht.mitPasskey === true, "Ansicht: Schalter und Passkey-Sitzung angezeigt");
  const code = await sitzung(e, "E-Mail-Code");
  const lesen = await redaktion(e, code, "agent");
  check(lesen.status === 200 && (await lesen.json()).mitPasskey === false, "Ansehen geht mit jeder Sitzung, Verwalten nicht");
  const aus = env({ AGENT_API: "aus" }); aus.USAGE = e.USAGE;
  const ansichtAus = await redaktion(aus, pass, "agent");
  check(ansichtAus.status === 200 && (await ansichtAus.json()).an === false, "Schalter aus: Verwaltung in der Redaktion bleibt (Schlüssel vorbereiten)");
}

// 8. Mengengrenze und Hinweis an Robin
{
  const g = env();
  const p = await sitzung(g, "Passkey MacBook");
  const { key } = await neuerSchluessel(g, p); alleSchluesselWerte.push(key);
  const j = new Date().toISOString();
  const tag = j.slice(0, 10), std = j.slice(11, 13);
  mails.length = 0;
  await g.USAGE.put("unanswered:a", JSON.stringify({ q: "a", n: 1, lang: "de", last: tag }));
  for (let i = 0; i < 11; i++) await agentCall(g, "fragen_erledigt", { key: "unanswered:a" }, { key });
  check(mails.length === 1 && /sehr aktiv/.test(mails[0].subject) && !/unanswered/.test(mails[0].text), "mehr als 10 Änderungen in der Stunde: ein Hinweis an Robin, ohne Inhalte");
  await agentCall(g, "fragen_erledigt", { key: "unanswered:a" }, { key });
  check(mails.length === 1, "höchstens ein Hinweis je Stunde");
  await g.USAGE.put("agent:zaehler:" + tag, JSON.stringify({ n: 5, h: { [std]: 60 }, a: {} }));
  check((await agentCall(g, "hilfe", {}, { key })).status === 429, "60 Aufrufe in der Stunde: 429");
  await g.USAGE.put("agent:zaehler:" + tag, JSON.stringify({ n: 300, h: {}, a: {} }));
  check((await agentCall(g, "hilfe", {}, { key })).status === 429, "300 Aufrufe am Tag: 429");
  const m = env({ LOGIN_LIMIT: limiter(2) });
  const mp = await sitzung(m, "Passkey MacBook");
  const mk = await neuerSchluessel(m, mp); alleSchluesselWerte.push(mk.key);
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push((await agentCall(m, "hilfe", {}, { key: mk.key })).status);
  check(codes.join() === "200,200,429", "Grenze je Minute (Bindung LOGIN_LIMIT): 429");
  await g.USAGE.put("agent:zaehler:" + tag, JSON.stringify({ n: 0, h: {}, a: {} }));
  const big = await agentCall(g, "hilfe", { x: "y".repeat(300_001) }, { key });
  check(big.status === 413, "zu große Anfrage: 413");
}

// 9. Hilfsskript: Schlüssel aus dem (nachgebauten) Schlüsselbund, nie in der Ausgabe, nur https hinaus
{
  const bin = mkdtempSync(join(tmpdir(), "rjl-agent-bin-"));
  const key = "gochag_" + Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  writeFileSync(join(bin, "security"), `#!/bin/sh\n[ "$1 $2 $3 $4" = "find-generic-password -s vision.robin.goch-agent -w" ] || exit 44\necho "${key}"\n`);
  chmodSync(join(bin, "security"), 0o755);
  let gesehen = "";
  const server = createServer((req, res) => {
    gesehen = req.headers.authorization || "";
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      const a = req.url.split("/").pop();
      res.setHeader("content-type", "application/json");
      // Der Server spiegelt den Schlüssel absichtlich zurück – das Skript darf ihn trotzdem nie zeigen
      if (a === "hilfe") return res.end(JSON.stringify({ ok: true, ergebnis: [{ aktion: "hilfe", stufe: 1, titel: "Echo " + gesehen, parameter: "" }] }));
      if (a === "fehler") { res.statusCode = 400; return res.end(JSON.stringify({ error: "kaputt: " + gesehen })); }
      res.end(JSON.stringify({ ok: true, ergebnis: { echo: gesehen, body: JSON.parse(body || "{}") } }));
    });
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const lauf = (args, extra = {}) => new Promise(res => {
    const p = spawn(process.execPath, [join(root, "tools", "goch-agent.mjs"), ...args], { env: { ...process.env, PATH: bin + ":" + process.env.PATH, AGENT_URL: `http://127.0.0.1:${port}`, ...extra } });
    let o = "", er = ""; p.stdout.on("data", d => o += d); p.stderr.on("data", d => er += d); p.on("close", code => res({ code, o, er }));
  });
  const r1 = await lauf(["hilfe"]);
  check(r1.code === 0 && gesehen === "Bearer " + key && /Echo Bearer \[Schlüssel\]/.test(r1.o), "hilfe: Schlüssel aus dem Schlüsselbund gesendet, in der Ausgabe ersetzt");
  const r2 = await lauf(["stand", '{"art":"aktuell"}']);
  check(r2.code === 0 && /"art": "aktuell"/.test(r2.o), "Aktion mit JSON-Parametern");
  const datei = join(bin, "p.json"); writeFileSync(datei, '{"art":"profile"}');
  const r3 = await lauf(["inhalt", "@" + datei]);
  check(r3.code === 0 && /"art": "profile"/.test(r3.o), "Parameter aus @datei");
  const r4 = await lauf(["fehler"]);
  check(r4.code === 1 && /400: kaputt: Bearer \[Schlüssel\]/.test(r4.er), "Fehlerantwort: Schlüssel ersetzt");
  const r5 = await lauf(["hilfe"], { AGENT_URL: "http://goch.robin.vision" });
  check(r5.code === 2 && /nur über https/.test(r5.er), "http an fremde Adresse: verweigert");
  const r6 = await lauf(["hilfe"], { AGENT_URL: `http://127.0.0.1:1` });
  check(r6.code === 4, "keine Verbindung: Fehlercode 4");
  const r7 = await lauf(["Hilfe!"]);
  check(r7.code === 2, "ungültiger Aktionsname: Aufrufhilfe");
  const r8 = await lauf(["hilfe", "[1]"]);
  check(r8.code === 2, "Parameter kein Objekt: verweigert");
  writeFileSync(join(bin, "security"), "#!/bin/sh\necho 'kaputt'\n");
  const r9 = await lauf(["hilfe"]);
  check(r9.code === 3 && !/kaputt/.test(r9.er + r9.o), "kein gültiger Schlüssel im Schlüsselbund: Code 3, Ausgabe von security nicht weitergegeben");
  const alle = [r1, r2, r3, r4, r5, r6, r7, r8, r9].map(r => r.o + r.er).join("\n");
  check(!alle.includes(key) && !alle.includes(key.slice(7)), "keine Ausgabe des Skripts enthält den Schlüssel");
  const src = readFileSync(join(root, "tools", "goch-agent.mjs"), "utf8");
  check(/redirect: "manual"/.test(src) && !/console\.log/.test(src), "Skript: keine Weiterleitung mit dem Schlüssel, kein console.log");
  server.close();
  rmSync(bin, { recursive: true, force: true });
}

// Kein Schlüssel aus diesem Lauf in einer Ausgabe dieses Tests (er schreibt nur Beschriftungen)
check(alleSchluesselWerte.length >= 5 && alleSchluesselWerte.every(Boolean), "Testschlüssel erzeugt (nicht ausgegeben)");
rmSync(out, { recursive: true, force: true });
console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen, ${oks} in Ordnung.` : `\nAgentenschlüssel in Ordnung (${oks} Prüfungen).`);
process.exit(fails ? 1 : 0);
