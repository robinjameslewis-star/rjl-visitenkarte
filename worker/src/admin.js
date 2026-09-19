// Redaktion (/admin): Robin pflegt Inhalte der Website selbst und sieht Gochs Aufrufe und
// unbeantwortete Fragen. Anmeldung ohne Passwort: Einmal-Code per E-Mail an MAIL_TO (Resend).
// Speicher ist das GitHub-Repository (Historie, GitHub Pages baut daraus); der KV des Workers
// hält nur eine Kopie, damit Goch sofort die neue Fassung kennt. Neue Inhaltsarten (Blog, Textstellen
// der Seite) kommen als weiterer Eintrag in CONTENT dazu.
import * as gh from "./github.js";

const SESSION_TTL = 12 * 3600;      // Sekunden
const CODE_TTL = 10 * 60;
const MAX_CODES_PER_HOUR = 5;
const MAX_TRIES = 5;

export async function handleAdmin(request, env, ctx, deps) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/admin";
  if (!env.USAGE || !env.MAIL_TO) return text("Dashboard nicht eingerichtet (KV oder MAIL_TO fehlt).", 503);
  const session = await currentSession(request, env);

  // Anmeldung
  if (path === "/admin/login" && request.method === "POST") return login(request, env);
  if (path === "/admin/verify" && request.method === "POST") return verify(request, env);
  if (path === "/admin/logout" && request.method === "POST") {
    if (session) ctx.waitUntil(env.USAGE.delete("admin:session:" + session.token));
    return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
  }
  if (path === "/admin") {
    if (request.method !== "GET") return text("Method Not Allowed", 405);
    return html(session ? PAGE : LOGIN);
  }
  if (!path.startsWith("/admin/api/")) return text("Nicht gefunden.", 404);
  if (!session) return json({ error: "Nicht angemeldet." }, 401);
  // Schreibende Aufrufe nur aus der eigenen Seite (SameSite-Cookie plus eigener Header).
  if (request.method !== "GET" && request.headers.get("x-goch-admin") !== "1") return json({ error: "Verweigert." }, 403);

  const api = path.slice("/admin/api/".length);
  if (api === "state" && request.method === "GET") return json(await state(env, deps));
  const m = api.match(/^content\/([a-z0-9-]+)$/);
  if (m && CONTENT[m[1]]) {
    if (request.method === "PUT") return save(m[1], request, env, deps, session);
    if (request.method === "POST") return restore(m[1], env, deps, session);
  }
  if (api === "unanswered" && request.method === "DELETE") {
    const body = await readJson(request);
    const key = typeof body.key === "string" && body.key.startsWith("unanswered:") ? body.key : null;
    if (!key) return json({ error: "Ungültig." }, 400);
    await env.USAGE.delete(key);
    return json({ ok: true });
  }
  return json({ error: "Nicht gefunden." }, 404);
}

// ---------- Anmeldung: Code per E-Mail, Sitzung als Cookie, beides im KV ----------

async function login(request, env) {
  // Es gibt genau einen Empfänger: MAIL_TO. Kein Adressfeld, nichts zu vertippen (gmail/googlemail).
  const answer = json({ ok: true, note: "Code ist unterwegs." });
  const hourKey = "admin:codes:" + new Date().toISOString().slice(0, 13);
  const sent = +(await env.USAGE.get(hourKey) || 0);
  if (sent >= MAX_CODES_PER_HOUR) return answer;
  await env.USAGE.put(hourKey, String(sent + 1), { expirationTtl: 3600 });
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  await env.USAGE.put("admin:code", JSON.stringify({ hash: await sha256(code), exp: Date.now() + CODE_TTL * 1000, tries: 0 }),
    { expirationTtl: CODE_TTL });
  if (env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + env.RESEND_API_KEY },
      body: JSON.stringify({
        from: env.MAIL_FROM || "Goch <onboarding@resend.dev>", to: [env.MAIL_TO],
        subject: "Redaktion: Dein Anmeldecode " + code,
        text: `Dein Code für die Redaktion (robinjameslewis): ${code}\n\nGültig zehn Minuten. Wenn du dich nicht angemeldet hast, ignoriere diese Mail – ohne den Code passiert nichts.`,
      }),
    }).then(async r => { if (!r.ok) console.error("Anmeldecode: Resend", r.status, (await r.text()).slice(0, 200)); })
      .catch(e => console.error("Anmeldecode: Resend", String(e)));
  }
  return answer;
}

async function verify(request, env) {
  const body = await readJson(request);
  const code = String(body.code || "").replace(/\D/g, "");
  let entry = null;
  try { entry = JSON.parse(await env.USAGE.get("admin:code")); } catch {}
  if (!entry || entry.exp < Date.now()) return json({ error: "Kein gültiger Code. Fordere einen neuen an." }, 400);
  if (entry.tries >= MAX_TRIES) { await env.USAGE.delete("admin:code"); return json({ error: "Zu viele Versuche. Fordere einen neuen Code an." }, 400); }
  if (code.length !== 6 || await sha256(code) !== entry.hash) {
    entry.tries += 1;
    await env.USAGE.put("admin:code", JSON.stringify(entry), { expirationTtl: CODE_TTL });
    return json({ error: "Code stimmt nicht." }, 400);
  }
  await env.USAGE.delete("admin:code");
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.USAGE.put("admin:session:" + token, JSON.stringify({ email: env.MAIL_TO, at: new Date().toISOString() }), { expirationTtl: SESSION_TTL });
  return json({ ok: true }, 200, { "set-cookie": cookie(token, SESSION_TTL) });
}

async function currentSession(request, env) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)goch_admin=([a-f0-9]{64})/);
  if (!m) return null;
  const raw = await env.USAGE.get("admin:session:" + m[1]);
  if (!raw) return null;
  try { return { token: m[1], ...JSON.parse(raw) }; } catch { return null; }
}

function cookie(token, maxAge) {
  return `goch_admin=${token}; Path=/admin; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

// ---------- Inhalte: Registry, GitHub als Quelle, KV als Kopie ----------

// Jede Inhaltsart: Datei im Repository, Zerlegen in Felder (für die Seite), Zusammenbauen und Prüfen
// (aus den Feldern). Weitere Arten – Blogbeiträge, Textstellen der Seite – kommen hier dazu.
const CONTENT = {
  aktuell: {
    path: "worker/aktuell.md", title: "Woran Robin gerade arbeitet",
    split: md => ({
      stand: (md.match(/Stand (\d{2}\.\d{2}\.\d{4})/) || [])[1] || "",
      de: ((md.split(/^## Deutsch\s*$/m)[1] || "").split(/^## English\s*$/m)[0] || "").trim(),
      en: (md.split(/^## English\s*$/m)[1] || "").trim(),
    }),
    join(f) {
      const stand = String(f.stand || "").trim(), de = String(f.de || ""), en = String(f.en || "");
      if (!/^\d{2}\.\d{2}\.\d{4}$/.test(stand)) throw new Error("Stand bitte als TT.MM.JJJJ.");
      if (de.trim().length < 20 || en.trim().length < 20) throw new Error("Deutsch und Englisch brauchen beide Text.");
      if (de.length > 6000 || en.length > 6000) throw new Error("Zu lang – höchstens 6.000 Zeichen je Sprache.");
      return `# Woran Robin gerade arbeitet – Stand ${stand}. Von Robin freigegeben (Dashboard); alle 4–6 Wochen erneuern.\n` +
        `# Wird dem Systemprompt angehängt.\n\n## Deutsch\n\n${de.trim()}\n\n## English\n\n${en.trim()}\n`;
    },
    summary: f => "Stand " + f.stand,
  },
  links: {
    path: "worker/links.md", title: "Links, die Goch anbieten darf",
    split: (md, deps) => ({ rows: deps.parseLinks(md) }),
    join(f, deps) {
      const rows = Array.isArray(f.rows) ? f.rows : null;
      if (!rows || rows.length > 20) throw new Error("Ungültig (höchstens 20 Links).");
      const clean = [], seen = new Set();
      for (const [i, r] of rows.entries()) {
        const n = i + 1;
        const id = String(r.id || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const when = String(r.when || "").trim(), de = String(r.de || "").trim(), en = String(r.en || "").trim() || de;
        let url = String(r.url || "").trim();
        if (!id) throw new Error(`Zeile ${n}: Kennung fehlt (Buchstaben, Ziffern, Bindestrich).`);
        if (seen.has(id)) throw new Error(`Zeile ${n}: Kennung „${id}“ kommt doppelt vor.`);
        if (!when || !de) throw new Error(`Zeile ${n}: „Wann“ und „Text DE“ brauchen Inhalt.`);
        if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
        try { const u = new URL(url); if (u.protocol !== "https:") throw 0; url = u.href; } catch { throw new Error(`Zeile ${n}: Adresse muss mit https:// beginnen.`); }
        if ([id, when, de, en].some(v => v.length > 200) || url.length > 500) throw new Error(`Zeile ${n}: zu lang.`);
        seen.add(id); clean.push({ id, when, de, en, url });
      }
      const cell = v => String(v).replace(/\|/g, "／").replace(/\s+/g, " ").trim();
      const md = "# Links, die Goch anbieten darf – gepflegt im Dashboard. Nur Adressen, die öffentlich sein dürfen.\n" +
        "# Goch nennt nur die Kennung; die Adresse setzt der Worker ein. „Wann“ ist sein Hinweis, wann der Link passt.\n\n" +
        "| Kennung | Wann passt der Link | Text DE | Text EN | Adresse |\n|---|---|---|---|---|\n" +
        clean.map(r => `| ${cell(r.id)} | ${cell(r.when)} | ${cell(r.de)} | ${cell(r.en)} | ${cell(r.url)} |`).join("\n") + "\n";
      if (deps.parseLinks(md).length !== clean.length) throw new Error("Interner Fehler beim Zusammenbau der Tabelle.");
      return md;
    },
    summary: f => (Array.isArray(f.rows) ? f.rows.length : 0) + " Links",
  },
};

async function state(env, deps) {
  const github = gh.configured(env);
  const out = { github, repo: env.GITHUB_REPO || "", content: {}, usage: [], unanswered: [], alert: null,
    limits: { perDay: +(env.MAX_PER_DAY || 60), perHour: +(env.MAX_PER_IP_PER_HOUR || 12), turns: +(env.MAX_TURNS || 8) },
    profileWords: deps.profileWords, model: env.MODEL || "" };
  for (const [key, c] of Object.entries(CONTENT)) {
    // Fassung: Repository (mit Schlüssel), sonst KV-Kopie, sonst die mitgelieferte Datei.
    let md = null, meta = null, error = null;
    if (github) {
      try {
        const f = await gh.getFile(env, c.path);
        if (f) { md = f.content; const h = await gh.history(env, c.path, 2); meta = { last: h[0] || null, hasPrev: h.length > 1 }; }
      } catch (e) { error = e.message; }
    }
    if (md == null) md = (await env.USAGE.get("content:" + key)) || deps.files[key];
    out.content[key] = { title: c.title, path: c.path, fields: c.split(md, deps), meta, error, historyUrl: env.GITHUB_REPO ? gh.historyUrl(env, c.path) : "" };
  }
  out.alert = await env.USAGE.get("alert:credit");
  const days = await env.USAGE.list({ prefix: "usage:" });
  for (const k of days.keys) out.usage.push({ date: k.name.slice(6), n: +(await env.USAGE.get(k.name) || 0) });
  out.usage.sort((a, b) => a.date < b.date ? 1 : -1);
  const qs = await env.USAGE.list({ prefix: "unanswered:" });
  for (const k of qs.keys) {
    try { const e = JSON.parse(await env.USAGE.get(k.name)); if (e) out.unanswered.push({ key: k.name, ...e }); } catch {}
  }
  out.unanswered.sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1));
  return out;
}

// Veröffentlichen: Felder prüfen und zusammenbauen, ins Repository schreiben (Commit), Kopie in den KV.
async function save(key, request, env, deps, session) {
  if (!gh.configured(env)) return json({ error: "GitHub-Schlüssel fehlt – Veröffentlichen ist noch nicht eingerichtet." }, 503);
  const c = CONTENT[key];
  const body = await readJson(request);
  let md;
  try { md = c.join(body, deps); } catch (e) { return json({ error: e.message }, 400); }
  try {
    const current = await gh.getFile(env, c.path);
    if (current && current.content === md) return json({ ...(await state(env, deps)), note: "Keine Änderung – nichts veröffentlicht." });
    const summary = c.summary(c.split(md, deps));
    await gh.putFile(env, c.path, md, `Dashboard: ${c.title} – ${summary}`, current && current.sha);
    await cache(env, key, md, session.email);
  } catch (e) { return json({ error: e.message }, 502); }
  return json(await state(env, deps));
}

// Vorige Fassung: Inhalt des vorletzten Commits dieser Datei als neuen Commit schreiben (nichts wird gelöscht).
async function restore(key, env, deps, session) {
  if (!gh.configured(env)) return json({ error: "GitHub-Schlüssel fehlt." }, 503);
  const c = CONTENT[key];
  try {
    const h = await gh.history(env, c.path, 2);
    if (h.length < 2) return json({ error: "Keine vorige Fassung vorhanden." }, 400);
    const prev = await gh.getFile(env, c.path, h[1].sha);
    const current = await gh.getFile(env, c.path);
    if (!prev) return json({ error: "Vorige Fassung nicht lesbar." }, 400);
    await gh.putFile(env, c.path, prev.content, `Dashboard: ${c.title} – vorige Fassung wiederhergestellt`, current && current.sha);
    await cache(env, key, prev.content, session.email);
  } catch (e) { return json({ error: e.message }, 502); }
  return json(await state(env, deps));
}

async function cache(env, key, md, by) {
  await env.USAGE.put("content:" + key, md);
  await env.USAGE.put("content:" + key + ":meta", JSON.stringify({ at: new Date().toISOString(), by }));
  await env.USAGE.delete("content:checked").catch(() => {});
}

// ---------- Helfer ----------

async function readJson(request) { try { return await request.json(); } catch { return {}; } }
function parseMeta(raw) { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
async function sha256(s) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))); }
function hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, "0")).join(""); }
function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
}
function text(s, status = 200) { return new Response(s, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } }); }
function html(s) {
  return new Response(s, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
    "x-frame-options": "DENY", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'" } });
}

// ---------- Seiten ----------

const STYLE = `
:root{--paper:#F6F1E8;--ink:#2B2A28;--muted:#7A736A;--copper:#B06A3B;--line:#E2D9CB;--card:#FFFDF9;--ok:#4C7A4C;--warn:#A63D2F}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 -apple-system,"Helvetica Neue",Arial,sans-serif}
main{max-width:920px;margin:0 auto;padding:28px 18px 60px}h1{font:600 22px/1.2 Georgia,"Times New Roman",serif;letter-spacing:.06em;margin:0 0 4px}
h2{font:600 17px/1.3 Georgia,serif;margin:0 0 10px}.sub{color:var(--muted);margin:0 0 24px}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;margin:0 0 18px}
label{display:block;font-size:13px;color:var(--muted);margin:10px 0 4px}textarea,input{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:#fff;color:var(--ink)}
textarea{min-height:220px;resize:vertical;font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:1.45}
.row{display:grid;gap:14px;grid-template-columns:1fr 1fr}@media(max-width:720px){.row{grid-template-columns:1fr}}
button{font:inherit;padding:8px 14px;border-radius:999px;border:1px solid var(--copper);background:var(--copper);color:#fff;cursor:pointer}
button.quiet{background:transparent;color:var(--ink);border-color:var(--line)}button:disabled{opacity:.5;cursor:default}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}.note{font-size:13px;color:var(--muted)}
.msg{font-size:14px;margin-left:auto}.msg.ok{color:var(--ok)}.msg.warn{color:var(--warn)}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px 6px;border-bottom:1px solid var(--line);vertical-align:top}
td input{padding:6px 8px;font-size:13px}.x{border:0;background:none;color:var(--muted);cursor:pointer;font-size:16px;padding:4px 8px}
.stats{display:grid;gap:12px;grid-template-columns:repeat(3,1fr)}@media(max-width:720px){.stats{grid-template-columns:1fr}}
.stat{border:1px solid var(--line);border-radius:8px;padding:12px}.stat b{display:block;font:600 26px/1.1 Georgia,serif}.stat span{font-size:13px;color:var(--muted)}
.days{display:flex;gap:3px;align-items:flex-end;height:48px;margin-top:8px}.days i{flex:1;background:var(--copper);opacity:.75;border-radius:2px 2px 0 0;min-height:2px}
ul.q{list-style:none;padding:0;margin:0}ul.q li{display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--line)}ul.q li:last-child{border:0}
ul.q .n{min-width:36px;color:var(--muted);font-variant-numeric:tabular-nums}ul.q .lang{font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:0 4px}
.src{font-size:12px;color:var(--muted)}.src b{color:var(--ink);font-weight:500}
.login{max-width:420px;margin:12vh auto 0}
`;

const LOGIN = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Redaktion – Anmeldung</title><style>${STYLE}</style></head>
<body><main class="login"><h1>REDAKTION</h1><p class="sub">robinjameslewis – Anmeldung mit Einmal-Code per E-Mail.</p>
<section id="step1"><p class="note" style="margin:0 0 6px">Der Code geht an Robins hinterlegte Adresse.</p>
<div class="bar" style="margin:0"><button id="send" autofocus>Code schicken</button><span class="msg" id="m1"></span></div></section>
<section id="step2" hidden><label for="code">Code aus der E-Mail (sechs Ziffern, zehn Minuten gültig)</label><input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
<div class="bar"><button id="go">Anmelden</button><button class="quiet" id="again">Neuen Code</button><span class="msg" id="m2"></span></div></section>
<script>
const $=id=>document.getElementById(id);
async function post(p,b){const r=await fetch(p,{method:'POST',headers:{'content-type':'application/json','x-goch-admin':'1'},body:JSON.stringify(b)});return {ok:r.ok,...(await r.json().catch(()=>({})))};}
$('send').onclick=async()=>{$('send').disabled=true;await post('/admin/login',{});$('step1').hidden=true;$('step2').hidden=false;$('code').focus();};
$('again').onclick=()=>{$('step2').hidden=true;$('step1').hidden=false;$('send').disabled=false;$('m2').textContent='';};
$('go').onclick=async()=>{const r=await post('/admin/verify',{code:$('code').value});if(r.ok)location.reload();else{$('m2').className='msg warn';$('m2').textContent=r.error||'Fehler';}};
$('code').onkeydown=e=>{if(e.key==='Enter')$('go').click();};
</script></main></body></html>`;

const PAGE = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Redaktion · robinjameslewis</title><style>${STYLE}</style></head>
<body><main>
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><h1>REDAKTION</h1><button class="quiet" id="logout">Abmelden</button></div>
<p class="sub">Inhalte der Website robinjameslewis. Was du hier veröffentlichst, wird als Änderung im Repository gespeichert und ist innerhalb einer Minute live.</p>
<p class="note" id="ghnote" hidden style="border:1px solid var(--warn);border-radius:8px;padding:10px 12px;color:var(--warn)"></p>

<section><h2>Goch – Übersicht</h2><div class="stats">
<div class="stat"><b id="today">–</b><span>Antworten heute (Grenze <span id="perDay">–</span>)</span></div>
<div class="stat"><b id="month">–</b><span>Antworten in 30 Tagen</span></div>
<div class="stat"><b id="alert">–</b><span>Guthaben-Alarm</span></div></div>
<div class="days" id="days" title="Antworten je Tag, letzte 30 Tage"></div>
<p class="note" id="meta"></p></section>

<section><h2>Goch – unbeantwortete Fragen <span class="note">(30 Tage, ohne Personenbezug)</span></h2><ul class="q" id="qs"></ul><p class="note" id="qnote"></p></section>

<section><h2>Goch – Woran Robin gerade arbeitet</h2><p class="src" id="asrc"></p>
<label for="stand">Stand (TT.MM.JJJJ)</label><input id="stand" style="max-width:160px">
<div class="row"><div><label for="de">Deutsch</label><textarea id="de"></textarea></div><div><label for="en">English</label><textarea id="en"></textarea></div></div>
<div class="bar"><button id="saveA">Veröffentlichen</button><button class="quiet" id="prevA">Vorige Fassung</button><a class="note" id="histA" target="_blank" rel="noopener">Verlauf</a><span class="msg" id="mA"></span></div>
<p class="note">Nummerierte Punkte, Fettdruck mit ** ** ist erlaubt. Beide Sprachen dieselben Punkte.</p></section>

<section><h2>Goch – Links, die er anbieten darf</h2><p class="src" id="lsrc"></p>
<table><thead><tr><th style="width:12%">Kennung</th><th style="width:30%">Wann passt der Link</th><th style="width:19%">Text DE</th><th style="width:19%">Text EN</th><th>Adresse (https)</th><th></th></tr></thead><tbody id="rows"></tbody></table>
<div class="bar"><button class="quiet" id="addRow">+ Zeile</button><button id="saveL">Veröffentlichen</button><button class="quiet" id="prevL">Vorige Fassung</button><a class="note" id="histL" target="_blank" rel="noopener">Verlauf</a><span class="msg" id="mL"></span></div>
<p class="note">Goch nennt nur die Kennung; die Adresse setzt der Worker ein. „Wann“ ist sein Hinweis, bei welchen Fragen der Link passt – je genauer, desto seltener kommt er unpassend.</p></section>

<script>
const $=id=>document.getElementById(id);
const H={'content-type':'application/json','x-goch-admin':'1'};
async function api(p,method='GET',body){const r=await fetch('/admin/api/'+p,{method,headers:H,body:body?JSON.stringify(body):undefined});if(r.status===401){location.reload();return null;}const d=await r.json().catch(()=>({error:'Antwort unlesbar'}));if(!r.ok)throw new Error(d.error||('Fehler '+r.status));return d;}
function say(id,txt,ok){const m=$(id);m.className='msg '+(ok?'ok':'warn');m.textContent=txt;if(ok)setTimeout(()=>{if(m.textContent===txt)m.textContent='';},6000);}
function fmt(iso){if(!iso)return '';const d=new Date(iso);return d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})+' Uhr';}
function src(c){if(c.error)return 'Repository nicht erreichbar: '+esc(c.error);if(!c.meta)return 'Quelle: <b>mitgelieferte Datei</b> (GitHub-Schlüssel fehlt).';const l=c.meta.last;return l?'Zuletzt geändert '+fmt(l.date)+' – „'+esc(l.message)+'“':'Im Repository, noch ohne Verlauf.';}
let S=null;
function render(s){S=s;
 const today=new Date().toISOString().slice(0,10);const t=s.usage.find(u=>u.date===today);$('today').textContent=t?t.n:0;$('perDay').textContent=s.limits.perDay;
 const cut=new Date(Date.now()-30*864e5).toISOString().slice(0,10);const last=s.usage.filter(u=>u.date>=cut);$('month').textContent=last.reduce((a,u)=>a+u.n,0);
 $('alert').textContent=s.alert?'aktiv':'keiner';$('alert').style.color=s.alert?'var(--warn)':'var(--ok)';
 const byDate=Object.fromEntries(last.map(u=>[u.date,u.n]));const max=Math.max(1,...last.map(u=>u.n));const bars=[];
 for(let i=29;i>=0;i--){const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10);const n=byDate[d]||0;bars.push('<i style="height:'+Math.round(n/max*100)+'%" title="'+d+': '+n+'"></i>');}
 $('days').innerHTML=bars.join('');
 $('meta').textContent='Modell '+s.model+' · Profil '+s.profileWords+' Wörter (≈ '+Math.round(s.profileWords*4.4/100)*100+' Tokens) · Grenzen: '+s.limits.perHour+' je Stunde und Adresse, '+s.limits.turns+' Fragen je Gespräch.';
 $('qs').innerHTML=s.unanswered.map(q=>'<li><span class="n">'+q.n+'×</span><span class="lang">'+q.lang+'</span><span style="flex:1">'+esc(q.q)+'</span><span class="note">'+q.last+'</span><button class="x" title="erledigt" data-k="'+esc(q.key)+'">✓</button></li>').join('');
 $('qnote').textContent=s.unanswered.length?'✓ entfernt die Frage aus der Liste – wenn du sie ins Profil aufgenommen hast oder sie nichts für Goch ist.':'Nichts offen.';
 $('ghnote').hidden=s.github;$('ghnote').textContent='Veröffentlichen ist noch nicht freigeschaltet: Der GitHub-Schlüssel fehlt. Lesen geht, Schreiben noch nicht.';
 const A=s.content.aktuell,L=s.content.links;
 $('asrc').innerHTML=src(A);$('stand').value=A.fields.stand;$('de').value=A.fields.de;$('en').value=A.fields.en;$('prevA').disabled=!(A.meta&&A.meta.hasPrev);$('saveA').disabled=!s.github;$('histA').href=A.historyUrl;$('histA').hidden=!A.historyUrl;
 $('lsrc').innerHTML=src(L);$('rows').innerHTML='';L.fields.rows.forEach(addRow);$('prevL').disabled=!(L.meta&&L.meta.hasPrev);$('saveL').disabled=!s.github;$('histL').href=L.historyUrl;$('histL').hidden=!L.historyUrl;}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function addRow(r={}){const tr=document.createElement('tr');tr.innerHTML=['id','when','de','en','url'].map(k=>'<td><input data-k="'+k+'" value="'+esc(r[k]||'')+'"'+(k==='url'?' placeholder="https://…"':'')+'></td>').join('')+'<td><button class="x" title="Zeile entfernen">×</button></td>';tr.querySelector('.x').onclick=()=>tr.remove();$('rows').append(tr);}
function rows(){return [...$('rows').querySelectorAll('tr')].map(tr=>Object.fromEntries([...tr.querySelectorAll('input')].map(i=>[i.dataset.k,i.value])));}
$('addRow').onclick=()=>addRow();
async function publish(key,msgId,body){try{const s=await api('content/'+key,'PUT',body);render(s);say(msgId,s.note||'Veröffentlicht – als Änderung im Repository gespeichert.',true);}catch(e){say(msgId,e.message);}}
$('saveA').onclick=()=>{if(confirm('„Woran Robin gerade arbeitet“ jetzt veröffentlichen?'))publish('aktuell','mA',{stand:$('stand').value,de:$('de').value,en:$('en').value});};
$('saveL').onclick=()=>{if(confirm('Links jetzt veröffentlichen?'))publish('links','mL',{rows:rows()});};
$('prevA').onclick=async()=>{if(!confirm('Vorige Fassung von „Aktuell“ wiederherstellen? (Als neue Änderung, nichts geht verloren.)'))return;try{render(await api('content/aktuell','POST'));say('mA','Vorige Fassung ist live.',true);}catch(e){say('mA',e.message);}};
$('prevL').onclick=async()=>{if(!confirm('Vorige Fassung der Links wiederherstellen? (Als neue Änderung, nichts geht verloren.)'))return;try{render(await api('content/links','POST'));say('mL','Vorige Fassung ist live.',true);}catch(e){say('mL',e.message);}};
$('qs').onclick=async e=>{const b=e.target.closest('button[data-k]');if(!b)return;try{await api('unanswered','DELETE',{key:b.dataset.k});render(await api('state'));}catch(err){say('mA',err.message);}};
$('logout').onclick=async()=>{await fetch('/admin/logout',{method:'POST',headers:H});location.reload();};
api('state').then(s=>s&&render(s)).catch(e=>alert(e.message));
</script></main></body></html>`;
