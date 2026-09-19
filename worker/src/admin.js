// Gochs Dashboard: /admin – Robin pflegt „Aktuell“ und die Links selbst und sieht Aufrufe und
// unbeantwortete Fragen. Anmeldung ohne Passwort: Einmal-Code per E-Mail an MAIL_TO (Resend).
// Inhalte liegen dann im KV-Speicher (content:aktuell, content:links) und gehen sofort live;
// die Dateien im Repository bleiben Rückfallebene. Jede Veröffentlichung hebt die vorige Fassung auf.

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
  if (api === "aktuell" && request.method === "PUT") return saveAktuell(request, env, deps, session);
  if (api === "links" && request.method === "PUT") return saveLinks(request, env, deps, session);
  if (api === "restore" && request.method === "POST") return restore(request, env, deps);
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
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const answer = json({ ok: true, note: "Wenn die Adresse stimmt, ist ein Code unterwegs." });
  if (!email || email !== String(env.MAIL_TO).trim().toLowerCase()) return answer; // nichts verraten
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
        subject: "Goch: Dein Anmeldecode " + code,
        text: `Dein Code für Gochs Dashboard: ${code}\n\nGültig zehn Minuten. Wenn du dich nicht angemeldet hast, ignoriere diese Mail – ohne den Code passiert nichts.`,
      }),
    }).catch(() => {});
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

// ---------- Zustand für die Seite ----------

async function state(env, deps) {
  const [aktuellKv, aktuellMeta, linksKv, linksMeta, alert] = await Promise.all([
    env.USAGE.get("content:aktuell"), env.USAGE.get("content:aktuell:meta"),
    env.USAGE.get("content:links"), env.USAGE.get("content:links:meta"), env.USAGE.get("alert:credit"),
  ]);
  const usage = [], unanswered = [];
  const days = await env.USAGE.list({ prefix: "usage:" });
  for (const k of days.keys) usage.push({ date: k.name.slice(6), n: +(await env.USAGE.get(k.name) || 0) });
  usage.sort((a, b) => a.date < b.date ? 1 : -1);
  const qs = await env.USAGE.list({ prefix: "unanswered:" });
  for (const k of qs.keys) {
    try { const e = JSON.parse(await env.USAGE.get(k.name)); if (e) unanswered.push({ key: k.name, ...e }); } catch {}
  }
  unanswered.sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1));
  const aktuellMd = aktuellKv || deps.aktuellFile, linksMd = linksKv || deps.linksFile;
  return {
    aktuell: { ...splitAktuell(aktuellMd), source: aktuellKv ? "dashboard" : "datei", meta: parseMeta(aktuellMeta),
      hasPrev: !!(await env.USAGE.get("content:aktuell:prev")) },
    links: { rows: deps.parseLinks(linksMd), source: linksKv ? "dashboard" : "datei", meta: parseMeta(linksMeta),
      hasPrev: !!(await env.USAGE.get("content:links:prev")) },
    usage, unanswered, alert: alert || null,
    limits: { perDay: +(env.MAX_PER_DAY || 60), perHour: +(env.MAX_PER_IP_PER_HOUR || 12), turns: +(env.MAX_TURNS || 8) },
    profileWords: deps.profileWords, model: env.MODEL || "",
  };
}

// „Aktuell“: Kopfzeile mit Stand, dann „## Deutsch“ und „## English“.
function splitAktuell(md) {
  const stand = (md.match(/Stand (\d{2}\.\d{2}\.\d{4})/) || [])[1] || "";
  const de = ((md.split(/^## Deutsch\s*$/m)[1] || "").split(/^## English\s*$/m)[0] || "").trim();
  const en = (md.split(/^## English\s*$/m)[1] || "").trim();
  return { stand, de, en };
}
function joinAktuell({ stand, de, en }) {
  return `# Woran Robin gerade arbeitet – Stand ${stand}. Von Robin freigegeben (Dashboard); alle 4–6 Wochen erneuern.\n\n## Deutsch\n\n${de.trim()}\n\n## English\n\n${en.trim()}\n`;
}
function joinLinks(rows) {
  const head = "# Links, die Goch anbieten darf – aus dem Dashboard. Nur Adressen, die öffentlich sein dürfen.\n\n" +
    "| Kennung | Wann passt der Link | Text DE | Text EN | Adresse |\n|---|---|---|---|---|\n";
  const cell = v => String(v).replace(/\|/g, "／").replace(/\s+/g, " ").trim();
  return head + rows.map(r => `| ${cell(r.id)} | ${cell(r.when)} | ${cell(r.de)} | ${cell(r.en)} | ${cell(r.url)} |`).join("\n") + "\n";
}

async function saveAktuell(request, env, deps, session) {
  const body = await readJson(request);
  const stand = String(body.stand || "").trim(), de = String(body.de || ""), en = String(body.en || "");
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(stand)) return json({ error: "Stand bitte als TT.MM.JJJJ." }, 400);
  if (de.trim().length < 20 || en.trim().length < 20) return json({ error: "Deutsch und Englisch brauchen beide Text." }, 400);
  if (de.length > 6000 || en.length > 6000) return json({ error: "Zu lang – höchstens 6.000 Zeichen je Sprache." }, 400);
  await publish(env, "aktuell", joinAktuell({ stand, de, en }), deps.aktuellFile, session);
  return json(await state(env, deps));
}

async function saveLinks(request, env, deps, session) {
  const body = await readJson(request);
  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows || rows.length > 20) return json({ error: "Ungültig (höchstens 20 Links)." }, 400);
  const clean = [], seen = new Set();
  for (const [i, r] of rows.entries()) {
    const n = i + 1;
    const id = String(r.id || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const when = String(r.when || "").trim(), de = String(r.de || "").trim(), en = String(r.en || "").trim() || de;
    let url = String(r.url || "").trim();
    if (!id) return json({ error: `Zeile ${n}: Kennung fehlt (Buchstaben, Ziffern, Bindestrich).` }, 400);
    if (seen.has(id)) return json({ error: `Zeile ${n}: Kennung „${id}“ kommt doppelt vor.` }, 400);
    if (!when || !de) return json({ error: `Zeile ${n}: „Wann“ und „Text DE“ brauchen Inhalt.` }, 400);
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    try { const u = new URL(url); if (u.protocol !== "https:") throw 0; url = u.href; } catch { return json({ error: `Zeile ${n}: Adresse muss mit https:// beginnen.` }, 400); }
    if ([id, when, de, en].some(v => v.length > 200) || url.length > 500) return json({ error: `Zeile ${n}: zu lang.` }, 400);
    seen.add(id); clean.push({ id, when, de, en, url });
  }
  const md = joinLinks(clean);
  if (deps.parseLinks(md).length !== clean.length) return json({ error: "Interner Fehler beim Zusammenbau der Tabelle." }, 500);
  await publish(env, "links", md, deps.linksFile, session);
  return json(await state(env, deps));
}

async function publish(env, what, md, fileVersion, session) {
  const current = await env.USAGE.get("content:" + what);
  await env.USAGE.put("content:" + what + ":prev", current || fileVersion);
  await env.USAGE.put("content:" + what, md);
  await env.USAGE.put("content:" + what + ":meta", JSON.stringify({ at: new Date().toISOString(), by: session.email }));
}

async function restore(request, env, deps) {
  const body = await readJson(request);
  const what = body.what === "links" ? "links" : body.what === "aktuell" ? "aktuell" : null;
  if (!what) return json({ error: "Ungültig." }, 400);
  if (body.toFile === true) {
    await Promise.all(["", ":prev", ":meta"].map(s => env.USAGE.delete("content:" + what + s)));
    return json(await state(env, deps));
  }
  const prev = await env.USAGE.get("content:" + what + ":prev");
  if (!prev) return json({ error: "Keine vorige Fassung vorhanden." }, 400);
  const current = await env.USAGE.get("content:" + what);
  await env.USAGE.put("content:" + what, prev);
  await env.USAGE.put("content:" + what + ":prev", current || (what === "links" ? deps.linksFile : deps.aktuellFile));
  await env.USAGE.put("content:" + what + ":meta", JSON.stringify({ at: new Date().toISOString(), by: "Wiederherstellung" }));
  return json(await state(env, deps));
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

const LOGIN = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Goch – Anmeldung</title><style>${STYLE}</style></head>
<body><main class="login"><h1>GOCH · DASHBOARD</h1><p class="sub">Anmeldung mit Einmal-Code per E-Mail.</p>
<section id="step1"><label for="email">Deine E-Mail-Adresse</label><input id="email" type="email" autocomplete="email" autofocus>
<div class="bar"><button id="send">Code schicken</button><span class="msg" id="m1"></span></div></section>
<section id="step2" hidden><label for="code">Code aus der E-Mail (sechs Ziffern, zehn Minuten gültig)</label><input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
<div class="bar"><button id="go">Anmelden</button><button class="quiet" id="again">Neuen Code</button><span class="msg" id="m2"></span></div></section>
<script>
const $=id=>document.getElementById(id);
async function post(p,b){const r=await fetch(p,{method:'POST',headers:{'content-type':'application/json','x-goch-admin':'1'},body:JSON.stringify(b)});return {ok:r.ok,...(await r.json().catch(()=>({})))};}
$('send').onclick=async()=>{$('send').disabled=true;await post('/admin/login',{email:$('email').value});$('step1').hidden=true;$('step2').hidden=false;$('code').focus();};
$('email').onkeydown=e=>{if(e.key==='Enter')$('send').click();};
$('again').onclick=()=>{$('step2').hidden=true;$('step1').hidden=false;$('send').disabled=false;$('m2').textContent='';};
$('go').onclick=async()=>{const r=await post('/admin/verify',{code:$('code').value});if(r.ok)location.reload();else{$('m2').className='msg warn';$('m2').textContent=r.error||'Fehler';}};
$('code').onkeydown=e=>{if(e.key==='Enter')$('go').click();};
</script></main></body></html>`;

const PAGE = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Goch – Dashboard</title><style>${STYLE}</style></head>
<body><main>
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><h1>GOCH · DASHBOARD</h1><button class="quiet" id="logout">Abmelden</button></div>
<p class="sub">Was du hier veröffentlichst, ist innerhalb einer Minute live. Die Dateien im Repository bleiben als Rückfallebene.</p>

<section><h2>Übersicht</h2><div class="stats">
<div class="stat"><b id="today">–</b><span>Antworten heute (Grenze <span id="perDay">–</span>)</span></div>
<div class="stat"><b id="month">–</b><span>Antworten in 30 Tagen</span></div>
<div class="stat"><b id="alert">–</b><span>Guthaben-Alarm</span></div></div>
<div class="days" id="days" title="Antworten je Tag, letzte 30 Tage"></div>
<p class="note" id="meta"></p></section>

<section><h2>Unbeantwortete Fragen <span class="note">(30 Tage, ohne Personenbezug)</span></h2><ul class="q" id="qs"></ul><p class="note" id="qnote"></p></section>

<section><h2>Woran Robin gerade arbeitet</h2><p class="src" id="asrc"></p>
<label for="stand">Stand (TT.MM.JJJJ)</label><input id="stand" style="max-width:160px">
<div class="row"><div><label for="de">Deutsch</label><textarea id="de"></textarea></div><div><label for="en">English</label><textarea id="en"></textarea></div></div>
<div class="bar"><button id="saveA">Veröffentlichen</button><button class="quiet" id="prevA">Vorige Fassung</button><button class="quiet" id="fileA">Auf Datei zurücksetzen</button><span class="msg" id="mA"></span></div>
<p class="note">Nummerierte Punkte, Fettdruck mit ** ** ist erlaubt. Beide Sprachen dieselben Punkte.</p></section>

<section><h2>Links, die Goch anbieten darf</h2><p class="src" id="lsrc"></p>
<table><thead><tr><th style="width:12%">Kennung</th><th style="width:30%">Wann passt der Link</th><th style="width:19%">Text DE</th><th style="width:19%">Text EN</th><th>Adresse (https)</th><th></th></tr></thead><tbody id="rows"></tbody></table>
<div class="bar"><button class="quiet" id="addRow">+ Zeile</button><button id="saveL">Veröffentlichen</button><button class="quiet" id="prevL">Vorige Fassung</button><button class="quiet" id="fileL">Auf Datei zurücksetzen</button><span class="msg" id="mL"></span></div>
<p class="note">Goch nennt nur die Kennung; die Adresse setzt der Worker ein. „Wann“ ist sein Hinweis, bei welchen Fragen der Link passt – je genauer, desto seltener kommt er unpassend.</p></section>

<script>
const $=id=>document.getElementById(id);
const H={'content-type':'application/json','x-goch-admin':'1'};
async function api(p,method='GET',body){const r=await fetch('/admin/api/'+p,{method,headers:H,body:body?JSON.stringify(body):undefined});if(r.status===401){location.reload();return null;}const d=await r.json().catch(()=>({error:'Antwort unlesbar'}));if(!r.ok)throw new Error(d.error||('Fehler '+r.status));return d;}
function say(id,txt,ok){const m=$(id);m.className='msg '+(ok?'ok':'warn');m.textContent=txt;if(ok)setTimeout(()=>{if(m.textContent===txt)m.textContent='';},6000);}
function fmt(iso){if(!iso)return '';const d=new Date(iso);return d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})+' Uhr';}
function src(meta,source){return source==='dashboard'?'Quelle: <b>Dashboard</b>, veröffentlicht '+fmt(meta&&meta.at):'Quelle: <b>Datei im Repository</b> – noch nichts über das Dashboard veröffentlicht.';}
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
 $('asrc').innerHTML=src(s.aktuell.meta,s.aktuell.source);$('stand').value=s.aktuell.stand;$('de').value=s.aktuell.de;$('en').value=s.aktuell.en;$('prevA').disabled=!s.aktuell.hasPrev;$('fileA').disabled=s.aktuell.source!=='dashboard';
 $('lsrc').innerHTML=src(s.links.meta,s.links.source);$('rows').innerHTML='';s.links.rows.forEach(addRow);$('prevL').disabled=!s.links.hasPrev;$('fileL').disabled=s.links.source!=='dashboard';}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function addRow(r={}){const tr=document.createElement('tr');tr.innerHTML=['id','when','de','en','url'].map(k=>'<td><input data-k="'+k+'" value="'+esc(r[k]||'')+'"'+(k==='url'?' placeholder="https://…"':'')+'></td>').join('')+'<td><button class="x" title="Zeile entfernen">×</button></td>';tr.querySelector('.x').onclick=()=>tr.remove();$('rows').append(tr);}
function rows(){return [...$('rows').querySelectorAll('tr')].map(tr=>Object.fromEntries([...tr.querySelectorAll('input')].map(i=>[i.dataset.k,i.value])));}
$('addRow').onclick=()=>addRow();
$('saveA').onclick=async()=>{if(!confirm('„Woran Robin gerade arbeitet“ jetzt veröffentlichen?'))return;try{render(await api('aktuell','PUT',{stand:$('stand').value,de:$('de').value,en:$('en').value}));say('mA','Veröffentlicht.',true);}catch(e){say('mA',e.message);}};
$('saveL').onclick=async()=>{if(!confirm('Links jetzt veröffentlichen?'))return;try{render(await api('links','PUT',{rows:rows()}));say('mL','Veröffentlicht.',true);}catch(e){say('mL',e.message);}};
$('prevA').onclick=async()=>{if(!confirm('Vorige Fassung von „Aktuell“ wiederherstellen?'))return;try{render(await api('restore','POST',{what:'aktuell'}));say('mA','Vorige Fassung ist live.',true);}catch(e){say('mA',e.message);}};
$('prevL').onclick=async()=>{if(!confirm('Vorige Fassung der Links wiederherstellen?'))return;try{render(await api('restore','POST',{what:'links'}));say('mL','Vorige Fassung ist live.',true);}catch(e){say('mL',e.message);}};
$('fileA').onclick=async()=>{if(!confirm('Dashboard-Fassung verwerfen und wieder die Datei aus dem Repository verwenden?'))return;try{render(await api('restore','POST',{what:'aktuell',toFile:true}));say('mA','Datei ist wieder live.',true);}catch(e){say('mA',e.message);}};
$('fileL').onclick=async()=>{if(!confirm('Dashboard-Fassung verwerfen und wieder die Datei aus dem Repository verwenden?'))return;try{render(await api('restore','POST',{what:'links',toFile:true}));say('mL','Datei ist wieder live.',true);}catch(e){say('mL',e.message);}};
$('qs').onclick=async e=>{const b=e.target.closest('button[data-k]');if(!b)return;try{await api('unanswered','DELETE',{key:b.dataset.k});render(await api('state'));}catch(err){say('mA',err.message);}};
$('logout').onclick=async()=>{await fetch('/admin/logout',{method:'POST',headers:H});location.reload();};
api('state').then(s=>s&&render(s)).catch(e=>alert(e.message));
</script></main></body></html>`;
