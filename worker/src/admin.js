// Redaktion (/admin): Robin pflegt Inhalte der Website selbst und sieht Gochs Aufrufe und
// unbeantwortete Fragen. Anmeldung ohne Passwort: Einmal-Code per E-Mail an MAIL_TO (Resend).
// Anmeldung: Passkey (Face ID / Touch ID, src/passkey.js) – Gerät plus Person, mehr braucht es nicht.
// Der E-Mail-Code ist nur der Erstzugang, solange kein Passkey eingerichtet ist; danach ist er abgeschaltet.
// Notausgang ohne Geräte: Index admin:passkeys im KV löschen (siehe README), dann gilt wieder der Code.
// Speicher ist das GitHub-Repository (Historie, GitHub Pages baut daraus); der KV des Workers
// hält nur eine Kopie, damit Goch sofort die neue Fassung kennt. Neue Inhaltsarten (Blog, Textstellen
// der Seite) kommen als weiterer Eintrag in CONTENT dazu.
import * as gh from "./github.js";
import * as pk from "./passkey.js";
import * as blog from "./blog.js";
import * as cfg from "./settings.js";

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
  if (path === "/admin/login/mode" && request.method === "GET") return json({ passkey: (await passkeyIds(env)).length > 0 });
  if (path === "/admin/login" && request.method === "POST") return login(request, env);
  if (path === "/admin/verify" && request.method === "POST") return verify(request, env);
  if (path === "/admin/passkey/login/options" && request.method === "POST") return passkeyLoginOptions(env, url);
  if (path === "/admin/passkey/login" && request.method === "POST") return passkeyLogin(request, env, url);
  if (path === "/admin/logout" && request.method === "POST") {
    if (session) ctx.waitUntil(env.USAGE.delete("admin:session:" + session.token));
    return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
  }
  if (path === "/admin") {
    if (request.method !== "GET") return text("Method Not Allowed", 405);
    return html(session ? PAGE : LOGIN);
  }
  // Schreibende Aufrufe nur aus der eigenen Seite (SameSite-Cookie plus eigener Header).
  if (request.method !== "GET" && request.headers.get("x-goch-admin") !== "1") return json({ error: "Verweigert." }, 403);
  if (!session) return json({ error: "Nicht angemeldet." }, 401);
  if (path === "/admin/passkey/options" && request.method === "POST") return passkeyRegisterOptions(env, session, url);
  if (path === "/admin/passkey/register" && request.method === "POST") return passkeyRegister(request, env, session, url);
  if (!path.startsWith("/admin/api/")) return text("Nicht gefunden.", 404);

  const api = path.slice("/admin/api/".length);
  if (api === "state" && request.method === "GET") return json(await state(env, deps));
  if (api === "passkeys" && request.method === "GET") return json({ passkeys: await listPasskeys(env) });
  if (api === "passkeys" && request.method === "DELETE") {
    const body = await readJson(request);
    const id = typeof body.id === "string" && /^[A-Za-z0-9_-]{16,300}$/.test(body.id) ? body.id : null;
    if (!id) return json({ error: "Ungültig." }, 400);
    await env.USAGE.delete("admin:passkey:" + id);
    await indexPasskey(env, id, false);
    return json({ passkeys: await listPasskeys(env) });
  }
  if (api.startsWith("blog")) return blogApi(api, request, env, deps, session, url);
  if (api.startsWith("goch")) return gochApi(api, request, env, deps, session);
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
  if ((await passkeyIds(env)).length) return json({ error: "Anmeldung nur mit Passkey." }, 403);
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
  if ((await passkeyIds(env)).length) return json({ error: "Anmeldung nur mit Passkey." }, 403);
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
  return json({ ok: true }, 200, { "set-cookie": cookie(await newSession(env, "E-Mail-Code"), SESSION_TTL) });
}

async function newSession(env, via) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.USAGE.put("admin:session:" + token, JSON.stringify({ email: env.MAIL_TO, at: new Date().toISOString(), via }), { expirationTtl: SESSION_TTL });
  return token;
}

// ---------- Passkeys: zweiter Faktor ----------

// Passkeys über einen Index lesen statt über list(): list() hinkt bis zu einer Minute hinterher,
// der Index ist sofort nach dem Schreiben sichtbar (und die Anmeldung verlangt den zweiten Faktor sofort).
async function passkeyIds(env) {
  try { const a = JSON.parse(await env.USAGE.get("admin:passkeys")); return Array.isArray(a) ? a : []; } catch { return []; }
}
async function listPasskeys(env) {
  const out = [];
  for (const id of await passkeyIds(env)) { try { const c = JSON.parse(await env.USAGE.get("admin:passkey:" + id)); if (c) out.push(c); } catch {} }
  return out;
}
async function indexPasskey(env, id, add) {
  const ids = (await passkeyIds(env)).filter(x => x !== id);
  if (add) ids.push(id);
  await env.USAGE.put("admin:passkeys", JSON.stringify(ids));
}
async function challengeFor(env, key) {
  const challenge = pk.randomChallenge();
  await env.USAGE.put("admin:challenge:" + key, challenge, { expirationTtl: 300 });
  return challenge;
}
async function takeChallenge(env, key) {
  const c = await env.USAGE.get("admin:challenge:" + key);
  await env.USAGE.delete("admin:challenge:" + key).catch(() => {});
  return c;
}
async function passkeyRegisterOptions(env, session, url) {
  const existing = await listPasskeys(env);
  const userId = pk.b64url.encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("redaktion:" + env.MAIL_TO))));
  return json({
    challenge: await challengeFor(env, session.token),
    rp: { id: url.hostname, name: "Redaktion robinjameslewis" },
    user: { id: userId, name: env.MAIL_TO, displayName: "Robin" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    attestation: "none", timeout: 60000,
    excludeCredentials: existing.map(c => ({ type: "public-key", id: c.id, transports: c.transports })),
  });
}
async function passkeyRegister(request, env, session, url) {
  const body = await readJson(request);
  const challenge = await takeChallenge(env, session.token);
  if (!challenge) return json({ error: "Keine Challenge – noch einmal versuchen." }, 400);
  try {
    const cred = await pk.verifyRegistration(body, { challenge, origin: url.origin, rpId: url.hostname });
    const name = String(body.name || "").replace(/[^\p{L}\p{N} .,-]/gu, "").trim().slice(0, 40) || "Passkey";
    await env.USAGE.put("admin:passkey:" + cred.id, JSON.stringify({ ...cred, name, at: new Date().toISOString() }));
    await indexPasskey(env, cred.id, true);
  } catch (e) { return json({ error: e.message }, 400); }
  return json({ passkeys: await listPasskeys(env) });
}
async function passkeyLoginOptions(env, url) {
  const creds = await listPasskeys(env);
  if (!creds.length) return json({ error: "Kein Passkey eingerichtet." }, 400);
  const cid = hex(crypto.getRandomValues(new Uint8Array(16))); // Kennung der Challenge, kommt mit der Antwort zurück
  return json({ cid, challenge: await challengeFor(env, "login:" + cid), rpId: url.hostname, userVerification: "required", timeout: 60000,
    allowCredentials: creds.map(c => ({ type: "public-key", id: c.id, transports: c.transports })) });
}
async function passkeyLogin(request, env, url) {
  const body = await readJson(request);
  const cid = typeof body.cid === "string" && /^[a-f0-9]{32}$/.test(body.cid) ? body.cid : "";
  const challenge = cid ? await takeChallenge(env, "login:" + cid) : null;
  if (!challenge) return json({ error: "Keine Challenge – Seite neu laden." }, 400);
  const id = typeof body.id === "string" ? body.id : "";
  let cred = null; try { cred = JSON.parse(await env.USAGE.get("admin:passkey:" + id)); } catch {}
  if (!cred) return json({ error: "Unbekannter Passkey." }, 400);
  try {
    const counter = await pk.verifyAssertion(body, cred, { challenge, origin: url.origin, rpId: url.hostname });
    cred.counter = counter; cred.lastUsed = new Date().toISOString();
    await env.USAGE.put("admin:passkey:" + cred.id, JSON.stringify(cred));
  } catch (e) { return json({ error: e.message }, 400); }
  return json({ ok: true }, 200, { "set-cookie": cookie(await newSession(env, "Passkey " + cred.name), SESSION_TTL) });
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

// ---------- Blog: Beiträge und Schalter, gebaut vom Worker (src/blog.js), gespeichert als ein Commit ----------

async function blogApi(api, request, env, deps, session, url) {
  if (!gh.configured(env)) return json({ error: "GitHub-Schlüssel fehlt – der Blog braucht das Repository." }, 503);
  try {
    if (api === "blog" && request.method === "GET") return json(await blogState(env));
    if (api === "blog/settings" && request.method === "PUT") {
      const settings = blog.validateSettings(await readJson(request));
      const current = await loadBlog(env);
      const r = await rebuild(env, { ...current, settings }, [{ path: blog.SETTINGS_PATH, content: blog.composeSettings(settings) }],
        `Redaktion: Blog ${settings.enabled ? "eingeschaltet" : "ausgeschaltet"} – „${settings.title.de}“`);
      return json({ ...(await blogState(env, r)), note: r.visible ? "Veröffentlicht – der Blog ist auf der Website sichtbar, sobald GitHub Pages gebaut hat (etwa eine Minute)." : "Gespeichert – der Blog bleibt auf der Website verborgen." });
    }
    if (api === "blog/post" && request.method === "GET") {
      const slug = blog.slugify(url.searchParams.get("slug") || "");
      const f = slug ? await gh.getFile(env, `${blog.POSTS_DIR}/${slug}.md`) : null;
      if (!f) return json({ error: "Beitrag nicht gefunden." }, 404);
      const h = await gh.history(env, `${blog.POSTS_DIR}/${slug}.md`, 2);
      return json({ post: blog.parsePost(f.content, slug), hasPrev: h.length > 1, historyUrl: gh.historyUrl(env, `${blog.POSTS_DIR}/${slug}.md`) });
    }
    if (api === "blog/preview" && request.method === "POST") {
      const f = await readJson(request);
      const post = { slug: "vorschau", title: String(f.title || "Ohne Titel").slice(0, 120), date: /^\d{4}-\d{2}-\d{2}$/.test(f.date || "") ? f.date : new Date().toISOString().slice(0, 10),
        lang: f.lang === "en" ? "en" : "de", status: "draft", summary: String(f.summary || "").slice(0, 300), body: String(f.body || "").slice(0, 40000) };
      const settings = (await loadBlog(env)).settings;
      return json({ html: blog.renderPostPage(post, settings, env.SITE_URL || "", env.SITE_URL || "") });
    }
    if (api === "blog/post" && request.method === "PUT") {
      const body = await readJson(request);
      const current = await loadBlog(env);
      const post = blog.validatePost(body, current.posts.map(p => p.slug));
      const others = current.posts.filter(p => p.slug !== post.slug);
      const isNew = !current.posts.some(p => p.slug === post.slug);
      const r = await rebuild(env, { ...current, posts: [...others, post] }, [{ path: `${blog.POSTS_DIR}/${post.slug}.md`, content: blog.composePost(post) }],
        `Redaktion: Beitrag „${post.title}“ ${post.status === "published" ? "veröffentlicht" : "als Entwurf gespeichert"}`);
      const note = post.status === "published" ? (r.visible ? "Veröffentlicht – auf der Website in etwa einer Minute." : "Veröffentlicht, aber der Blog ist ausgeschaltet – oben einschalten, damit er erscheint.")
        : "Als Entwurf gespeichert – nicht auf der Website." + (isNew ? "" : " Eine frühere veröffentlichte Fassung ist damit offline.");
      return json({ ...(await blogState(env, r)), slug: post.slug, note });
    }
    if (api === "blog/post" && request.method === "DELETE") {
      const slug = blog.slugify((await readJson(request)).slug || "");
      const current = await loadBlog(env);
      const post = current.posts.find(p => p.slug === slug);
      if (!post) return json({ error: "Beitrag nicht gefunden." }, 404);
      const r = await rebuild(env, { ...current, posts: current.posts.filter(p => p.slug !== slug) }, [{ path: `${blog.POSTS_DIR}/${slug}.md`, delete: true }],
        `Redaktion: Beitrag „${post.title}“ gelöscht`);
      return json({ ...(await blogState(env, r)), note: "Gelöscht. Im Verlauf auf GitHub bleibt der Text erhalten." });
    }
    if (api === "blog/images" && request.method === "GET") return json({ images: await listImages(env) });
    if (api === "blog/image" && request.method === "POST") {
      const body = await readJson(request);
      const img = checkImage(body);
      const base = blog.slugify(String(body.name || "bild").replace(/\.[a-z0-9]+$/i, "")).slice(0, 40) || "bild";
      const existing = (await listImages(env)).map(i => i.name);
      let name = `${base}.${img.ext}`, n = 2;
      while (existing.includes(name)) name = `${base}-${n++}.${img.ext}`;
      const c = await gh.commitFiles(env, [{ path: `${blog.IMAGES_DIR}/${name}`, base64: img.base64 }], `Redaktion: Bild „${name}“ hochgeladen`);
      return json({ name, markdown: `![${String(body.alt || "").replace(/[\[\]]/g, "").slice(0, 120)}](bilder/${name})`, images: await listImages(env), commit: c.url });
    }
    if (api === "blog/image" && request.method === "DELETE") {
      const name = String((await readJson(request)).name || "");
      if (!/^[a-z0-9._-]+$/i.test(name)) return json({ error: "Ungültig." }, 400);
      const used = (await loadBlog(env)).posts.filter(p => blog.imagesUsed(p.body).includes(name));
      if (used.length) return json({ error: `Das Bild wird noch verwendet: „${used[0].title}“. Erst dort entfernen.` }, 400);
      await gh.commitFiles(env, [{ path: `${blog.IMAGES_DIR}/${name}`, delete: true }], `Redaktion: Bild „${name}“ gelöscht`);
      return json({ images: await listImages(env) });
    }
    if (api === "blog/post/restore" && request.method === "POST") {
      const slug = blog.slugify((await readJson(request)).slug || "");
      const path = `${blog.POSTS_DIR}/${slug}.md`;
      const h = await gh.history(env, path, 2);
      if (h.length < 2) return json({ error: "Keine vorige Fassung vorhanden." }, 400);
      const prev = await gh.getFile(env, path, h[1].sha);
      if (!prev) return json({ error: "Vorige Fassung nicht lesbar." }, 400);
      const post = blog.parsePost(prev.content, slug);
      const current = await loadBlog(env);
      const r = await rebuild(env, { ...current, posts: [...current.posts.filter(p => p.slug !== slug), post] }, [{ path, content: prev.content }],
        `Redaktion: Beitrag „${post.title}“ – vorige Fassung wiederhergestellt`);
      return json({ ...(await blogState(env, r)), slug, note: "Vorige Fassung ist gespeichert." });
    }
  } catch (e) { return json({ error: e.message }, e.status ? 502 : 400); }
  return json({ error: "Nicht gefunden." }, 404);
}

async function listImages(env) {
  return (await gh.listDir(env, blog.IMAGES_DIR)).filter(e => e.type === "file" && /\.(jpe?g|png|webp)$/i.test(e.name))
    .map(e => ({ name: e.name, size: e.size || 0 })).sort((a, b) => a.name < b.name ? -1 : 1);
}
// Bilddaten prüfen: Base64, höchstens 1,5 MB, Typ an den ersten Bytes (JPEG, PNG, WebP) – nicht an der Endung.
function checkImage(body) {
  const data = String(body.data || "").replace(/^data:[^,]*,/, "");
  if (!data || !/^[A-Za-z0-9+/=\s]+$/.test(data)) return fail("Keine Bilddaten erhalten.");
  const bytes = Uint8Array.from(atob(data.replace(/\s/g, "")), c => c.charCodeAt(0));
  if (bytes.length > 1.5 * 1024 * 1024) return fail("Bild zu groß (höchstens 1,5 MB nach dem Verkleinern).");
  if (bytes.length < 100) return fail("Bild zu klein oder leer.");
  const h = [...bytes.slice(0, 12)];
  let ext = null;
  if (h[0] === 0xFF && h[1] === 0xD8 && h[2] === 0xFF) ext = "jpg";
  else if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4E && h[3] === 0x47) ext = "png";
  else if (String.fromCharCode(...h.slice(0, 4)) === "RIFF" && String.fromCharCode(...h.slice(8, 12)) === "WEBP") ext = "webp";
  if (!ext) return fail("Nur JPEG, PNG oder WebP.");
  return { ext, base64: data.replace(/\s/g, "") };
}
function fail(msg) { throw new Error(msg); }

async function loadBlog(env) {
  const file = await gh.getFile(env, blog.SETTINGS_PATH);
  const settings = file ? blog.parseSettings(file.content) : { ...blog.DEFAULT_SETTINGS };
  const posts = [];
  for (const e of await gh.listDir(env, blog.POSTS_DIR)) {
    if (e.type !== "file" || !e.name.endsWith(".md")) continue;
    const f = await gh.getFile(env, e.path);
    if (f) posts.push(blog.parsePost(f.content, e.name.slice(0, -3)));
  }
  return { settings, posts };
}

// Aus Einstellungen und Beiträgen alle Seiten neu bauen und zusammen mit den Quelländerungen als ein Commit schreiben.
async function rebuild(env, { settings, posts }, sourceChanges, message) {
  const home = await gh.getFile(env, "index.html");
  if (!home) throw new Error("Startseite (index.html) nicht im Repository gefunden.");
  const entries = await gh.listDir(env, "blog");
  const built = blog.buildBlog({ settings, posts, homepage: home.content, siteUrl: env.SITE_URL || "",
    existingDirs: entries.filter(e => e.type === "dir").map(e => e.name), existingFiles: entries.filter(e => e.type === "file").map(e => e.name) });
  const changes = [...sourceChanges, ...built.changes];
  const commit = changes.length ? await gh.commitFiles(env, changes, message) : null;
  return { ...built, commit, settings, posts };
}

async function blogState(env, r) {
  const { settings, posts } = r || await loadBlog(env);
  const published = posts.filter(p => p.status === "published").length;
  const visible = settings.enabled && published > 0;
  return { settings, visible, published,
    reason: visible ? "" : !settings.enabled ? "Schalter ist aus." : "Kein Beitrag veröffentlicht.",
    posts: posts.map(p => ({ slug: p.slug, title: p.title, date: p.date, lang: p.lang, status: p.status, summary: p.summary }))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
    url: (env.SITE_URL || "") + "blog/", historyUrl: gh.historyUrl(env, blog.POSTS_DIR), commit: r && r.commit ? r.commit.url : null };
}

// ---------- Goch: Betrieb (an/aus, Anbieter, Modell, Cache, Testfrage) ----------

const ENDPOINT_ATTR = /data-chat-endpoint="[^"]*"/;
async function gochApi(api, request, env, deps, session) {
  try {
    if (api === "goch" && request.method === "GET") return json(await gochState(env));
    if (api === "goch" && request.method === "PUT") {
      const input = await readJson(request);
      const previous = await cfg.loadSettings(env, true);
      const next = await cfg.saveSettings(env, input, previous);
      let note = "Gespeichert – gilt ab der nächsten Frage.";
      // An/aus auch auf der Seite: ohne Endpunkt öffnet der Vogel kein Gespräch, sondern fliegt wie früher.
      if (next.enabled !== previous.enabled && gh.configured(env)) {
        const home = await gh.getFile(env, "index.html");
        if (home && ENDPOINT_ATTR.test(home.content)) {
          const url = (env.CHAT_ENDPOINT || "https://rjl-goch.rjl.workers.dev/chat");
          const html = home.content.replace(ENDPOINT_ATTR, `data-chat-endpoint="${next.enabled ? url : ""}"`);
          if (html !== home.content) {
            await gh.putFile(env, "index.html", html, `Redaktion: Goch ${next.enabled ? "eingeschaltet" : "ausgeschaltet"}`, home.sha);
            note = next.enabled ? "Goch ist eingeschaltet – auf der Website in etwa einer Minute wieder da." : "Goch ist ausgeschaltet – der Worker antwortet nicht mehr, und die Website zeigt in etwa einer Minute kein Gespräch mehr.";
          }
        }
      } else if (next.enabled !== previous.enabled) {
        note = next.enabled ? "Goch antwortet wieder." : "Goch antwortet nicht mehr (die Sprechblase bleibt ohne GitHub-Schlüssel sichtbar und zeigt einen Hinweis).";
      }
      return json({ ...(await gochState(env)), note });
    }
    if (api === "goch/test" && request.method === "POST") {
      const body = await readJson(request);
      const settings = await cfg.loadSettings(env, true);
      const started = Date.now();
      const r = await deps.testGoch(env, String(body.question || "").slice(0, 600), settings, body.lang === "en" ? "en" : "de");
      return json({ ...r, ms: Date.now() - started, model: r.usage && r.usage.model, provider: settings.provider });
    }
  } catch (e) { return json({ error: e.message }, e.status ? 502 : 400); }
  return json({ error: "Nicht gefunden." }, 404);
}
async function gochState(env) {
  const settings = await cfg.loadSettings(env, true);
  let pageOn = null;
  if (gh.configured(env)) { try { const home = await gh.getFile(env, "index.html"); const m = home && home.content.match(ENDPOINT_ATTR); pageOn = m ? /https?:/.test(m[0]) : null; } catch {} }
  return { settings: cfg.publicSettings(settings, env), status: await cfg.readStatus(env), models: cfg.ANTHROPIC_MODELS, providers: cfg.PROVIDERS,
    pageOn, keys: { anthropic: !!env.ANTHROPIC_API_KEY, custom: !!env.CUSTOM_API_KEY, workersAi: !!env.AI } };
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
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' https:; font-src https:; frame-src 'self' about: https://www.youtube-nocookie.com; form-action 'none'; base-uri 'none'" } });
}

// ---------- Seiten ----------

const STYLE = `
:root{--paper:#F6F1E8;--ink:#2B2A28;--muted:#7A736A;--copper:#B06A3B;--line:#E2D9CB;--card:#FFFDF9;--ok:#4C7A4C;--warn:#A63D2F}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 -apple-system,"Helvetica Neue",Arial,sans-serif}
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
.tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 6px}.tools button{padding:4px 11px;font-size:13px;background:#fff;color:var(--ink);border-color:var(--line)}.tools button:hover{border-color:var(--copper)}
.box{margin:12px 0 0;padding:12px 14px 14px;border:1px dashed var(--line);border-radius:8px}.box h3{font:600 14px/1.3 Georgia,serif;margin:0}.box .note{margin:2px 0 0}.box label{margin:8px 0 3px}.box .bar{margin-top:10px}
.boxes{display:grid;gap:12px;grid-template-columns:1fr 1fr}@media(max-width:720px){.boxes{grid-template-columns:1fr}}
.draft{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0 0;padding:8px 12px;border:1px solid #E6C9A8;background:#FBF3E9;border-radius:8px;font-size:13px}
body.editing main{max-width:1380px}
.ed{display:grid;gap:18px;grid-template-columns:minmax(0,1fr) minmax(320px,46%);grid-template-areas:"a pv" "b pv";align-items:start}
.ed.nopv{grid-template-columns:1fr;grid-template-areas:"a" "b"}.ed.nopv .pv{display:none}
.ed-a{grid-area:a;min-width:0}.ed-b{grid-area:b;min-width:0}.pv{grid-area:pv;position:sticky;top:12px;display:flex;flex-direction:column;height:calc(100vh - 24px);min-height:480px}
.pvbar{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--muted);margin:0 0 6px}.pvbar button{padding:3px 10px;font-size:12px}
.pv iframe{flex:1;width:100%;border:1px solid var(--line);border-radius:8px;background:#fff;min-height:0}
@media(max-width:1099px){body.editing main{max-width:920px}.ed{grid-template-columns:1fr;grid-template-areas:"a" "pv" "b"}.pv{position:static;height:520px}}
.ytp{display:flex;gap:10px;align-items:center;margin-top:8px;font-size:13px;color:var(--muted)}.ytp img{width:96px;height:54px;object-fit:cover;border-radius:4px;background:#eee}
`;

const LOGIN = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Redaktion – Anmeldung</title><style>${STYLE}</style></head>
<body><main class="login"><h1>REDAKTION</h1><p class="sub" id="sub">robinjameslewis</p>
<section id="step1" hidden><p class="note" style="margin:0 0 6px">Noch kein Passkey eingerichtet – Erstzugang mit Einmal-Code. Der Code geht an Robins hinterlegte Adresse.</p>
<div class="bar" style="margin:0"><button id="send" autofocus>Code schicken</button><span class="msg" id="m1"></span></div></section>
<section id="step2" hidden><label for="code">Code aus der E-Mail (sechs Ziffern, zehn Minuten gültig)</label><input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
<div class="bar"><button id="go">Weiter</button><button class="quiet" id="again">Neuen Code</button><span class="msg" id="m2"></span></div></section>
<section id="step3" hidden><p class="note" style="margin:0 0 6px">Anmeldung mit deinem Gerät: Face ID, Touch ID oder Gerätecode.</p>
<div class="bar" style="margin:0"><button id="pass">Mit Passkey anmelden</button><span class="msg" id="m3"></span></div></section>
<script>
const $=id=>document.getElementById(id);
const bu={enc:b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''),dec:s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}};
async function post(p,b){const r=await fetch(p,{method:'POST',headers:{'content-type':'application/json','x-goch-admin':'1'},body:JSON.stringify(b||{})});return {ok:r.ok,...(await r.json().catch(()=>({})))};}
function show(n){for(const k of [1,2,3])$('step'+k).hidden=k!==n;}
$('send').onclick=async()=>{$('send').disabled=true;await post('/admin/login',{});show(2);$('code').focus();};
$('again').onclick=()=>{show(1);$('send').disabled=false;$('m2').textContent='';};
$('go').onclick=async()=>{const r=await post('/admin/verify',{code:$('code').value});if(!r.ok){$('m2').className='msg warn';$('m2').textContent=r.error||'Fehler';return;}location.reload();};
$('code').onkeydown=e=>{if(e.key==='Enter')$('go').click();};
$('pass').onclick=async()=>{$('m3').textContent='';try{if(!window.PublicKeyCredential)throw new Error('Dieser Browser kann keine Passkeys.');const o=await post('/admin/passkey/login/options');if(!o.ok)throw new Error(o.error||'Fehler');
 const cred=await navigator.credentials.get({publicKey:{challenge:bu.dec(o.challenge),rpId:o.rpId,userVerification:o.userVerification,timeout:o.timeout,allowCredentials:o.allowCredentials.map(c=>({type:c.type,id:bu.dec(c.id),transports:c.transports}))}});
 const r=await post('/admin/passkey/login',{cid:o.cid,id:cred.id,clientDataJSON:bu.enc(cred.response.clientDataJSON),authenticatorData:bu.enc(cred.response.authenticatorData),signature:bu.enc(cred.response.signature)});
 if(!r.ok)throw new Error(r.error||'Fehler');location.reload();}catch(e){$('m3').className='msg warn';$('m3').textContent=e.name==='NotAllowedError'?'Abgebrochen oder abgelehnt.':e.message;}};
fetch('/admin/login/mode').then(r=>r.json()).then(m=>{if(m.passkey){show(3);$('pass').focus();}else{show(1);$('send').focus();}}).catch(()=>{show(1);});
</script></main></body></html>`;

export const PAGE = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Redaktion · robinjameslewis</title><style>${STYLE}</style></head>
<body><main>
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><h1>REDAKTION</h1><button class="quiet" id="logout">Abmelden</button></div>
<p class="sub">Inhalte der Website robinjameslewis. Was du hier veröffentlichst, wird als Änderung im Repository gespeichert und ist innerhalb einer Minute live.</p>
<p class="note" id="ghnote" hidden style="border:1px solid var(--warn);border-radius:8px;padding:10px 12px;color:var(--warn)"></p>

<section id="sec"><h2>Sicherheit</h2><p class="note" id="secnote"></p><ul class="q" id="keys"></ul>
<div class="bar"><input id="keyname" placeholder="Name, z. B. MacBook oder iPhone" style="max-width:260px"><button id="addKey">Passkey einrichten</button><span class="msg" id="mK"></span></div>
<p class="note">Ein Passkey liegt in deinem iCloud-Schlüsselbund und gilt damit auf Mac und iPhone. Sobald einer eingerichtet ist, meldet nur noch der Passkey an – der E-Mail-Code ist dann abgeschaltet, wer nur dein Postfach hat, kommt nicht herein. Richte einen zweiten als Ersatz ein (anderes Gerät oder Sicherheitsschlüssel). Sind alle Geräte weg, hilft der Notausgang im Terminal (README).</p></section>

<section><h2>Blog</h2><p class="src" id="bsrc"></p>
<label style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--ink);margin:12px 0 4px"><input type="checkbox" id="benabled" style="width:auto;margin:0"> Blog auf der Website anzeigen</label>
<p class="note" style="margin:0 0 6px">Der Blog erscheint nur, wenn dieser Schalter an ist <b>und</b> mindestens ein Beitrag veröffentlicht ist. Dann bekommt die Startseite oben links einen Verweis.</p>
<div class="row"><div><label for="btde">Titel Deutsch</label><input id="btde"></div><div><label for="bten">Title English</label><input id="bten"></div></div>
<div class="row"><div><label for="bide">Einleitungssatz Deutsch (optional)</label><input id="bide"></div><div><label for="bien">Intro sentence English (optional)</label><input id="bien"></div></div>
<div class="bar"><button id="bsave">Einstellungen veröffentlichen</button><a class="note" id="bopen" target="_blank" rel="noopener">Blog ansehen</a><span class="msg" id="mB"></span></div>
<h2 style="margin-top:26px">Beiträge</h2><ul class="q" id="bposts"></ul><p class="note" id="bnote"></p>
<div class="bar"><button class="quiet" id="bnew">+ Neuer Beitrag</button></div>
<div id="beditor" hidden style="margin-top:16px;border-top:1px solid var(--line);padding-top:8px"><div class="ed" id="ed"><div class="ed-a">
<div class="row"><div><label for="ptitle">Titel</label><input id="ptitle" maxlength="120"></div><div><label for="pdate">Datum</label><input id="pdate" type="date" style="max-width:200px"></div></div>
<div class="row"><div><label for="plang">Sprache</label><select id="plang" style="width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:#fff"><option value="de">Deutsch</option><option value="en">English</option></select></div>
<div><label for="pstatus">Status</label><select id="pstatus" style="width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:#fff"><option value="draft">Entwurf (nicht auf der Website)</option><option value="published">Veröffentlicht</option></select></div></div>
<label for="psummary">Kurzfassung (ein, zwei Sätze – steht in der Liste und im RSS)</label><input id="psummary" maxlength="300">
<label for="pbody">Text</label>
<div class="tools" role="toolbar" aria-label="Formatierung" id="ptools"><button type="button" data-t="h" title="Zwischenüberschrift">Überschrift</button><button type="button" data-t="b" title="Fett (⌘B)"><b>Fett</b></button><button type="button" data-t="i" title="Kursiv (⌘I)"><i>Kursiv</i></button><button type="button" data-t="ul" title="Aufzählung">• Aufzählung</button><button type="button" data-t="ol" title="Nummerierung">1. Nummerierung</button><button type="button" data-t="q" title="Zitat">„ Zitat</button><button type="button" data-t="a" title="Link im Satz (⌘K)">Link</button><button type="button" data-t="hr" title="Trennlinie">— Linie</button><span class="note" id="pcount" style="margin-left:auto"></span></div>
<div id="plink" hidden class="box" style="margin:0 0 8px"><h3>Link im Satz</h3><div class="bar" style="margin-top:6px"><input id="platext" placeholder="Linktext" style="flex:1;min-width:140px"><input id="plaurl" placeholder="https://…" style="flex:2;min-width:220px"><button type="button" class="quiet" id="plaok">Link einfügen</button><button type="button" class="x" id="plax" title="Schließen">×</button><span class="msg" id="mLa"></span></div></div>
<textarea id="pbody" style="min-height:360px;font-family:inherit;font-size:15px" spellcheck="true"></textarea>
<div id="pdraft" hidden class="draft"><span style="flex:1" id="pdrafttext"></span><button type="button" class="quiet" id="pdraftuse" style="padding:4px 12px;font-size:13px">Wiederherstellen</button><button type="button" class="quiet" id="pdraftdrop" style="padding:4px 12px;font-size:13px">Verwerfen</button></div>
<p class="note">Absätze durch eine Leerzeile trennen. Text markieren und oben auf einen Knopf drücken – oder tippen: <code>**fett**</code>, <code>*kursiv*</code>, <code>## Überschrift</code>, <code>- Punkt</code>, <code>1. Punkt</code>, <code>&gt; Zitat</code>, <code>[Text](https://…)</code>. Mehr nicht – und nichts davon kann die Seite kaputtmachen. Bild, Karte und Video landen an der Cursorstelle.</p>
</div><div class="ed-b">
<div class="box"><h3>Bild</h3><p class="note">Wird im Browser auf höchstens 1600 Pixel verkleinert und ohne Aufnahmedaten (Ort, Kamera) gespeichert.</p>
<div class="bar"><label class="quiet" style="display:inline-block;margin:0;padding:8px 14px;border:1px solid var(--line);border-radius:999px;cursor:pointer;color:var(--ink);font-size:15px">Bild hochladen<input id="pimg" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
<input id="palt" placeholder="Bildbeschreibung (für Menschen, die das Bild nicht sehen)" style="flex:1;min-width:200px"><span class="msg" id="mI"></span></div>
<p class="note" style="margin-top:10px">Vorhandene Bilder:</p><div id="pimgs" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px"></div></div>
<div class="boxes">
<div class="box"><h3>Verweis-Karte</h3><p class="note">LinkedIn-Beitrag, Instagram, Artikel: eine Karte mit Titel und einem Satz, die auf die fremde Seite führt. Fremde Dienste werden dabei nicht geladen.</p>
<label for="prurl">Adresse</label><input id="prurl" placeholder="https://www.linkedin.com/posts/…" inputmode="url">
<label for="prtitle">Titel</label><input id="prtitle" placeholder="Titel des Beitrags oder Artikels" maxlength="160">
<label for="prtext">Ein Satz dazu (optional)</label><input id="prtext" placeholder="Warum das lesenswert ist" maxlength="300">
<div class="bar"><button type="button" class="quiet" id="prok">Karte einfügen</button><span class="msg" id="mR"></span></div></div>
<div class="box"><h3>YouTube-Video</h3><p class="note">Auf der Seite erscheint ein Platzhalter; der Player lädt erst, wenn jemand klickt (steht so im Datenschutz).</p>
<label for="pyurl">Adresse des Videos</label><input id="pyurl" placeholder="https://www.youtube.com/watch?v=… oder https://youtu.be/…" inputmode="url">
<label for="pytitle">Titel (optional)</label><input id="pytitle" placeholder="Titel des Videos" maxlength="160">
<div class="ytp" id="pyprev" hidden><img id="pyimg" alt=""><span id="pytext"></span></div>
<div class="bar"><button type="button" class="quiet" id="pyok">Video einfügen</button><span class="msg" id="mY"></span></div></div>
</div>
<p class="note" id="pslug"></p>
<div class="bar"><button id="bpsave">Speichern</button><button class="quiet" id="bpvshow" hidden>Vorschau anzeigen</button><button class="quiet" id="bprev">Vorige Fassung</button><button class="quiet" id="bdel">Löschen</button><a class="note" id="bhist" target="_blank" rel="noopener">Verlauf</a><button class="quiet" id="bcancel">Schließen</button><span class="msg" id="mP"></span></div>
<div class="box" id="pshare" hidden><h3>Auf LinkedIn teilen</h3><p class="note">Öffnet LinkedIn am Rechner mit diesem Text; dort siehst du die Vorschau und klickst „Posten“. Auf dem Handy übergibt LinkedIn nur den Link – dann „Text kopieren“ und einfügen. Titel, Kurzfassung und das erste Bild des Beitrags liefert die Seite als Vorschau mit.</p>
<label for="pstext">Text für LinkedIn</label><textarea id="pstext" style="min-height:96px;font-family:inherit;font-size:14px"></textarea>
<div class="bar"><button type="button" class="quiet" id="pshareli">Auf LinkedIn teilen</button><button type="button" class="quiet" id="pscopy">Text kopieren</button><span class="note" id="psurl" style="word-break:break-all"></span><span class="msg" id="mS"></span></div></div>
</div><div class="pv" id="pv"><div class="pvbar"><span style="flex:1">Vorschau – so sieht der Beitrag auf der Website aus</span><button type="button" class="quiet" id="bpvwin" title="Für den zweiten Bildschirm">Eigenes Fenster</button><button type="button" class="quiet" id="bpvhide">Ausblenden</button></div><iframe id="bframe" title="Vorschau"></iframe><p class="note" id="pvnote" style="margin:4px 0 0"></p></div></div>
</div></section>

<section><h2>Goch – Betrieb</h2><p class="src" id="gstat"></p>
<label style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--ink);margin:12px 0 4px"><input type="checkbox" id="genabled" style="width:auto;margin:0"> Goch ist eingeschaltet (antwortet auf der Website)</label>
<p class="note" style="margin:0 0 10px">Aus heißt: Der Worker antwortet nicht mehr, und die Website zeigt kein Gespräch – der Vogel fliegt beim Klick wie früher. Beides sofort bzw. nach einer Minute.</p>
<label for="gprovider">Anbieter</label><select id="gprovider" style="width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:#fff"></select>
<div id="ganthropic"><label for="gmodel">Modell</label><select id="gmodel" style="width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:#fff"></select>
<label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--ink);margin:10px 0 0"><input type="checkbox" id="gcache" style="width:auto;margin:0"> Prompt-Cache verwenden (Profil wird zwischengespeichert – ab der zweiten Frage ein Zehntel des Eingabepreises)</label></div>
<div id="gcustom" hidden><div class="row"><div><label for="gurl">Basis-Adresse der Schnittstelle</label><input id="gurl" placeholder="https://api.openai.com/v1"></div><div><label for="gcmodel">Modellname</label><input id="gcmodel" placeholder="z. B. gpt-4.1-mini"></div></div>
<label for="gkey">API-Schlüssel des Anbieters <span class="note" id="gkeyhint"></span></label><input id="gkey" type="password" autocomplete="off" placeholder="leer lassen = unverändert">
<p class="note">Der Anbieter bekommt denselben Kontext und dieselben Anweisungen wie Claude (Profil, Aktuell, Links, Antwortformat). Funktioniert mit jeder OpenAI-kompatiblen Schnittstelle: OpenAI, Mistral, Groq, DeepSeek, OpenRouter. Der Schlüssel liegt im Speicher des Workers; sicherer ist das Geheimnis <code>CUSTOM_API_KEY</code> per Terminal, das dann Vorrang hat.</p></div>
<div class="bar"><button id="gsave">Speichern</button><span class="msg" id="mG"></span></div>
<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)"><label for="gq">Testfrage an das eingestellte Modell (kostet einen Cent, zählt nicht als Besucher)</label>
<div class="bar" style="margin:0"><input id="gq" value="Wer ist Robin?" style="flex:1;min-width:200px"><button class="quiet" id="gtest">Fragen</button><span class="msg" id="mT"></span></div>
<p id="gout" style="margin:10px 0 0;font-size:14px;white-space:pre-wrap"></p></div></section>

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
const bu={enc:b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''),dec:s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}};
function renderKeys(list){$('keys').innerHTML=list.map(k=>'<li><span style="flex:1">'+esc(k.name)+'</span><span class="note">eingerichtet '+fmt(k.at)+(k.lastUsed?', zuletzt '+fmt(k.lastUsed):'')+'</span><button class="x" title="entfernen" data-id="'+esc(k.id)+'">×</button></li>').join('');
 const sn=$('secnote');if(!list.length){sn.style.color='var(--warn)';sn.textContent='Kein zweiter Faktor: Wer Zugang zu deinem Postfach hat, könnte hier veröffentlichen. Richte jetzt einen Passkey ein.';}else{sn.style.color='';sn.textContent=list.length+(list.length===1?' Passkey':' Passkeys')+' – die Anmeldung geht nur noch mit Passkey; der E-Mail-Code ist abgeschaltet.';}}
$('addKey').onclick=async()=>{$('mK').textContent='';try{if(!window.PublicKeyCredential)throw new Error('Dieser Browser kann keine Passkeys.');const r0=await fetch('/admin/passkey/options',{method:'POST',headers:H});const o=await r0.json();if(!r0.ok)throw new Error(o.error||'Fehler');
 const cred=await navigator.credentials.create({publicKey:{...o,challenge:bu.dec(o.challenge),user:{...o.user,id:bu.dec(o.user.id)},excludeCredentials:o.excludeCredentials.map(c=>({type:c.type,id:bu.dec(c.id),transports:c.transports}))}});
 const transports=cred.response.getTransports?cred.response.getTransports():[];
 const r=await fetch('/admin/passkey/register',{method:'POST',headers:H,body:JSON.stringify({name:$('keyname').value,clientDataJSON:bu.enc(cred.response.clientDataJSON),attestationObject:bu.enc(cred.response.attestationObject),transports})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Fehler');
 renderKeys(d.passkeys);$('keyname').value='';say('mK','Passkey eingerichtet.',true);}catch(e){say('mK',e.name==='NotAllowedError'?'Abgebrochen oder abgelehnt.':e.name==='InvalidStateError'?'Dieses Gerät ist schon eingerichtet.':e.message);}};
$('keys').onclick=async e=>{const b=e.target.closest('button[data-id]');if(!b)return;if(!confirm('Diesen Passkey entfernen? Ist es der letzte, gilt danach wieder der E-Mail-Code als Erstzugang.'))return;try{const d=await api('passkeys','DELETE',{id:b.dataset.id});renderKeys(d.passkeys);}catch(err){say('mK',err.message);}};
api('passkeys').then(d=>d&&renderKeys(d.passkeys)).catch(()=>{});
// ---- Goch: Betrieb ----
let G=null;
function renderGoch(g){G=g;const s=g.settings;$('genabled').checked=s.enabled;
 $('gprovider').innerHTML=Object.entries(g.providers).map(([k,v])=>'<option value="'+k+'"'+(k===s.provider?' selected':'')+(k==='anthropic'&&!g.keys.anthropic?' disabled':'')+(k==='workers-ai'&&!g.keys.workersAi?' disabled':'')+'>'+esc(v)+'</option>').join('');
 $('gmodel').innerHTML=g.models.map(m=>'<option value="'+m.id+'"'+(m.id===s.model?' selected':'')+'>'+esc(m.label)+'</option>').join('')+(g.models.some(m=>m.id===s.model)?'':'<option value="'+esc(s.model)+'" selected>'+esc(s.model)+'</option>');
 $('gcache').checked=s.cache;$('gurl').value=s.custom.baseUrl;$('gcmodel').value=s.custom.model;$('gkey').value='';$('gkeyhint').textContent=s.custom.keySet?'(hinterlegt '+s.custom.keyHint+', Quelle: '+s.custom.keySource+')':'(fehlt)';
 providerView();
 const st=g.status;const live=s.provider==='anthropic'?s.model:s.provider==='openai'?(s.custom.model+' bei '+(s.custom.baseUrl||'?')):s.model;
 $('gstat').innerHTML=(s.enabled?'<b>An.</b> ':'<b style="color:var(--warn)">Aus.</b> ')+'Eingestellt: <b>'+esc(g.providers[s.provider])+'</b> – '+esc(live)+(s.provider==='anthropic'?(s.cache?', Cache an':', Cache aus'):'')+
  (st?'<br>Letzte Antwort '+fmt(st.at)+' von <b>'+esc(st.model||'?')+'</b>'+(st.cache_read!=null?' · Cache gelesen '+st.cache_read+' Tokens':'')+(st.output!=null?' · Ausgabe '+st.output+' Tokens':'')+(st.ms?' · '+st.ms+' ms':''):'<br>Noch keine Antwort gemerkt.')+
  (g.pageOn===false?'<br><span style="color:var(--warn)">Die Startseite hat zurzeit keinen Endpunkt – Goch ist dort ausgeblendet.</span>':'');}
function providerView(){const p=$('gprovider').value;$('ganthropic').hidden=p!=='anthropic';$('gcustom').hidden=p!=='openai';}
$('gprovider').onchange=providerView;
$('gsave').onclick=async()=>{const p=$('gprovider').value;const body={enabled:$('genabled').checked,provider:p,cache:$('gcache').checked,model:p==='anthropic'?$('gmodel').value:(p==='workers-ai'?'@cf/meta/llama-3.3-70b-instruct-fp8-fast':G.settings.model),custom:{baseUrl:$('gurl').value,model:$('gcmodel').value,key:$('gkey').value}};
 if(G&&G.settings.enabled&&!body.enabled&&!confirm('Goch ausschalten? Besucher können dann nicht mehr mit ihm sprechen.'))return;
 try{const r=await api('goch','PUT',body);renderGoch(r);say('mG',r.note,true);}catch(e){say('mG',e.message);}};
$('gtest').onclick=async()=>{$('gtest').disabled=true;$('gout').textContent='';say('mT','fragt …');try{const r=await api('goch/test','POST',{question:$('gq').value});$('gout').textContent=r.reply+(r.link?'\\n[Link: '+r.link.label+']':'');say('mT','Antwort von '+(r.model||'?')+' in '+r.ms+' ms'+(r.usage&&r.usage.cache_read!=null?' · Cache gelesen '+r.usage.cache_read:'')+(r.usage&&r.usage.output!=null?' · Ausgabe '+r.usage.output+' Tokens':''),true);const g=await api('goch');renderGoch(g);}catch(e){say('mT',e.message);}finally{$('gtest').disabled=false;}};
api('goch').then(g=>g&&renderGoch(g)).catch(e=>{$('gstat').textContent='Betrieb nicht ladbar: '+e.message;});
// ---- Blog ----
let B=null,editing=null;
function renderBlog(b){B=b;$('benabled').checked=b.settings.enabled;$('btde').value=b.settings.title.de;$('bten').value=b.settings.title.en;$('bide').value=b.settings.intro.de;$('bien').value=b.settings.intro.en;
 $('bsrc').innerHTML=b.visible?'Auf der Website: <b>sichtbar</b> – '+b.published+(b.published===1?' veröffentlichter Beitrag':' veröffentlichte Beiträge')+'.':'Auf der Website: <b>verborgen</b> – '+esc(b.reason)+' ('+b.published+' veröffentlicht, '+b.posts.length+' insgesamt.)';
 $('bopen').href=b.url;$('bopen').hidden=!b.visible;
 $('bposts').innerHTML=b.posts.map(p=>'<li><span class="note" style="min-width:90px">'+p.date+'</span><span class="lang">'+p.lang+'</span><span style="flex:1">'+esc(p.title)+'</span><span class="note">'+(p.status==='published'?'veröffentlicht':'Entwurf')+'</span>'+(p.status==='published'?'<button class="quiet" data-share="'+esc(p.slug)+'" title="Auf LinkedIn teilen" style="padding:4px 10px;font-size:13px">LinkedIn</button>':'')+'<button class="quiet" data-slug="'+esc(p.slug)+'" style="padding:4px 10px;font-size:13px">Bearbeiten</button></li>').join('');
 $('bnote').textContent=b.posts.length?'':'Noch keine Beiträge. „+ Neuer Beitrag“ legt den ersten an; als Entwurf bleibt er unsichtbar, bis du ihn veröffentlichst.';}
function openEditor(p,meta){editing=p?p.slug:null;savedStatus=p?p.status:null;$('beditor').hidden=false;$('mP').textContent='';
 $('ptitle').value=p?p.title:'';$('pdate').value=p?p.date:new Date().toISOString().slice(0,10);$('plang').value=p?p.lang:'de';$('pstatus').value=p?p.status:'draft';$('psummary').value=p?p.summary:'';$('pbody').value=p?p.body:'';
 $('pslug').textContent=p?'Adresse: '+B.url+p.slug+'/':'Die Adresse entsteht aus dem Titel und bleibt danach fest.';
 $('bprev').hidden=!p;$('bprev').disabled=!(meta&&meta.hasPrev);$('bdel').hidden=!p;$('bhist').hidden=!p;if(meta)$('bhist').href=meta.historyUrl;
 $('beditor').scrollIntoView({behavior:'smooth',block:'start'});$('ptitle').focus();}
function postBody(){return {slug:editing||'',title:$('ptitle').value,date:$('pdate').value,lang:$('plang').value,status:$('pstatus').value,summary:$('psummary').value,body:$('pbody').value};}
$('bsave').onclick=async()=>{if(!confirm('Blog-Einstellungen jetzt veröffentlichen?'))return;try{const r=await api('blog/settings','PUT',{enabled:$('benabled').checked,title:{de:$('btde').value,en:$('bten').value},intro:{de:$('bide').value,en:$('bien').value}});renderBlog(r);say('mB',r.note,true);}catch(e){say('mB',e.message);}};
$('bnew').onclick=()=>openEditor(null);
$('bposts').onclick=async e=>{const sh=e.target.closest('button[data-share]');if(sh){const p=B.posts.find(x=>x.slug===sh.dataset.share);openLinkedIn(shareText(p.summary,p.title,shareUrlFor(p.slug)),shareUrlFor(p.slug));return;}const b=e.target.closest('button[data-slug]');if(!b)return;try{const d=await api('blog/post?slug='+encodeURIComponent(b.dataset.slug));openEditor(d.post,d);}catch(err){say('mB',err.message);}};
$('bcancel').onclick=()=>{$('beditor').hidden=true;editing=null;pvLayout();};
$('bpsave').onclick=async()=>{const st=$('pstatus').value;if(!confirm(st==='published'?'Beitrag jetzt veröffentlichen?':'Beitrag als Entwurf speichern?'))return;$('bpsave').disabled=true;try{const r=await api('blog/post','PUT',postBody());renderBlog(r);dropDraft();editing=r.slug;dropDraft();savedStatus=st;shareBox();$('pslug').textContent='Adresse: '+r.url+r.slug+'/';$('bprev').hidden=false;$('bdel').hidden=false;$('bhist').hidden=false;$('bhist').href=r.historyUrl+'/'+r.slug+'.md';say('mP',r.note,true);}catch(e){say('mP',e.message);}finally{$('bpsave').disabled=false;}};
$('bdel').onclick=async()=>{if(!editing||!confirm('Diesen Beitrag löschen? Er verschwindet von der Website; im Verlauf auf GitHub bleibt er erhalten.'))return;try{const r=await api('blog/post','DELETE',{slug:editing});renderBlog(r);dropDraft();$('beditor').hidden=true;editing=null;pvLayout();say('mB',r.note,true);}catch(e){say('mP',e.message);}};
$('bprev').onclick=async()=>{if(!editing||!confirm('Vorige Fassung dieses Beitrags wiederherstellen? (Als neue Änderung, nichts geht verloren.)'))return;try{const r=await api('blog/post/restore','POST',{slug:editing});renderBlog(r);const d=await api('blog/post?slug='+encodeURIComponent(editing));openEditor(d.post,d);say('mP',r.note,true);}catch(e){say('mP',e.message);}};
// ---- Editor: Werkzeuge ----
// Alle Änderungen am Text laufen über replaceRange, damit ⌘Z (Rückgängig) im Browser weiter funktioniert.
const T=$('pbody');
function replaceRange(a,b,text,sa,sb){T.focus();T.setSelectionRange(a,b);let ok=false;try{ok=document.execCommand('insertText',false,text);}catch(e){}
 if(!ok||T.value.slice(a,a+text.length)!==text){T.setRangeText(text,a,b,'end');}
 T.setSelectionRange(sa==null?a+text.length:sa,sb==null?(sa==null?a+text.length:sa):sb);changed();}
function selection(){let a=T.selectionStart||0,b=T.selectionEnd||0;const v=T.value;while(a<b&&/\\s/.test(v[a]))a++;while(b>a&&/\\s/.test(v[b-1]))b--;return [a,b];}
function wrap(m,ph){const [a,b]=selection(),v=T.value,s=v.slice(a,b);
 if(s.length>=2*m.length&&s.startsWith(m)&&s.endsWith(m)){replaceRange(a,b,s.slice(m.length,s.length-m.length),a,b-2*m.length);return;}
 if(v.slice(a-m.length,a)===m&&v.slice(b,b+m.length)===m){replaceRange(a-m.length,b+m.length,s,a-m.length,b-m.length);return;}
 const t=s||ph,sp=!s&&a>0&&!/[\\s(]/.test(v[a-1])?' ':'';replaceRange(a,b,sp+m+t+m,a+sp.length+m.length,a+sp.length+m.length+t.length);}
const PREFIX={h:/^##\\s+/,ul:/^[-*]\\s+/,ol:/^\\d+\\.\\s+/,q:/^>\\s?/},ANY=/^(#{2,3}\\s+|[-*]\\s+|\\d+\\.\\s+|>\\s?)/,PH={h:'Zwischenüberschrift',ul:'Punkt',ol:'Punkt',q:'Zitat'};
function block(kind){const v=T.value;let [a,b]=[T.selectionStart||0,T.selectionEnd||0];if(b>a&&v[b-1]==='\\n')b--;
 const ls=v.lastIndexOf('\\n',a-1)+1;let le=v.indexOf('\\n',kind==='h'?a:b);if(le<0)le=v.length;
 const L=v.slice(ls,le).split('\\n');const re=PREFIX[kind];const on=L.every(l=>re.test(l));let out,ph=false;
 if(on)out=L.map(l=>l.replace(re,''));
 else{const clean=L.map(l=>l.replace(ANY,''));if(clean.length===1&&!clean[0]){clean[0]=PH[kind];ph=true;}
  out=clean.map((l,i)=>kind==='h'?'## '+l:kind==='ul'?'- '+l:kind==='ol'?(i+1)+'. '+l:'> '+l);}
 // Ein Block braucht Leerzeilen um sich, sonst hängt er am Absatz davor oder danach.
 let pre='',post='';if(!on){if(ls>=2&&v[ls-2]!=='\\n')pre='\\n';if(le<v.length&&v[le+1]&&v[le+1]!=='\\n')post='\\n';}
 const body=out.join('\\n');const p0=ls+pre.length;
 if(ph){const m=body.length-PH[kind].length;replaceRange(ls,le,pre+body+post,p0+m,p0+body.length);}else replaceRange(ls,le,pre+body+post,p0,p0+body.length);}
// Ein Block (Bild, Karte, Video, Linie) steht allein zwischen Leerzeilen; der Cursor landet danach in einer eigenen Leerzeile.
function insertAtCursor(text){const a=T.selectionStart||0,b=T.selectionEnd||0;const before=T.value.slice(0,a);let k=b;while(T.value[k]==='\\n')k++;const rest=T.value.slice(k);
 const pad=before&&!before.endsWith('\\n\\n')?(before.endsWith('\\n')?'\\n':'\\n\\n'):'';const ins=pad+text+'\\n\\n'+(rest?'\\n\\n':'');
 replaceRange(a,k,ins,a+pad.length+text.length+2);}
function linkBox(){const [a,b]=selection();const s=T.value.slice(a,b);const isUrl=/^https?:\\/\\/\\S+$/i.test(s);$('platext').value=isUrl?'':s;$('plaurl').value=isUrl?s:'';$('plink').hidden=false;$('mLa').textContent='';(isUrl||!s?$('platext'):$('plaurl')).focus();}
$('plax').onclick=()=>{$('plink').hidden=true;T.focus();};
$('plaok').onclick=()=>{const t=$('platext').value.trim().replace(/[\\[\\]]/g,''),u=$('plaurl').value.trim().replace(/\\)/g,'%29').replace(/\\s/g,'%20');
 if(!t)return say('mLa','Bitte einen Linktext angeben.');if(!/^(https?:\\/\\/\\S+|mailto:\\S+@\\S+)$/i.test(u))return say('mLa','Die Adresse muss mit https:// beginnen.');
 const [a,b]=selection();replaceRange(a,b,'['+t+']('+u+')');$('plink').hidden=true;};
$('plaurl').onkeydown=$('platext').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('plaok').click();}if(e.key==='Escape'){$('plax').click();}};
$('ptools').onclick=e=>{const b=e.target.closest('button[data-t]');if(!b)return;const k=b.dataset.t;
 if(k==='b')wrap('**','fett');else if(k==='i')wrap('*','kursiv');else if(k==='a')linkBox();else if(k==='hr')insertAtCursor('---');else block(k);};
T.onkeydown=e=>{if(!(e.metaKey||e.ctrlKey)||e.altKey)return;const k=e.key.toLowerCase();if(k==='b'){e.preventDefault();wrap('**','fett');}else if(k==='i'){e.preventDefault();wrap('*','kursiv');}else if(k==='k'){e.preventDefault();linkBox();}};
// Wortzahl und lokale Sicherung (im Browser, nur auf diesem Gerät) – falls die Sitzung abläuft oder der Tab zugeht.
let draftTimer=null;function draftKey(){return 'redaktion:entwurf:'+(editing||'neu');}
function count(){const w=(T.value.match(/\\S+/g)||[]).length;$('pcount').textContent=w?w+(w===1?' Wort':' Wörter')+' · ≈ '+Math.max(1,Math.round(w/200))+' Min. Lesezeit':'';}
function changed(){count();refreshPreview();clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{const d=postBody();if(d.title||d.body||d.summary)localStorage.setItem(draftKey(),JSON.stringify({at:new Date().toISOString(),...d}));}catch(e){}},600);}
T.oninput=changed;['ptitle','psummary'].forEach(id=>{$(id).oninput=changed;});
function dropDraft(){clearTimeout(draftTimer);try{localStorage.removeItem(draftKey());}catch(e){}$('pdraft').hidden=true;}
function offerDraft(p){$('pdraft').hidden=true;let d=null;try{d=JSON.parse(localStorage.getItem(draftKey()));}catch(e){}if(!d)return;
 const same=d.body===(p?p.body:'')&&d.title===(p?p.title:'')&&d.summary===(p?p.summary:'');if(same){dropDraft();return;}
 $('pdrafttext').textContent='Hier liegt ein nicht gespeicherter Text vom '+fmt(d.at)+(d.title?' („'+d.title+'“)':'')+'.';$('pdraft').hidden=false;
 $('pdraftuse').onclick=()=>{$('ptitle').value=d.title||'';$('psummary').value=d.summary||'';T.value=d.body||'';if(d.date)$('pdate').value=d.date;if(d.lang)$('plang').value=d.lang;if(d.status)$('pstatus').value=d.status;$('pdraft').hidden=true;changed();};
 $('pdraftdrop').onclick=()=>{if(confirm('Den nicht gespeicherten Text verwerfen?'))dropDraft();};}
// ---- Einfügen: Bild, Verweis-Karte, YouTube ----
function renderImages(list){$('pimgs').innerHTML=list.length?list.map(i=>'<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:6px;padding:4px 6px;font-size:12px"><img src="'+esc(B.url)+'bilder/'+esc(i.name)+'" alt="" style="height:36px;width:48px;object-fit:cover;border-radius:3px;background:#eee"><span>'+esc(i.name)+'</span><button class="quiet" data-ins="'+esc(i.name)+'" style="padding:2px 8px;font-size:12px">einfügen</button><button class="x" data-del="'+esc(i.name)+'" title="Bild löschen">×</button></span>').join(''):'<span class="note">noch keine</span>';}
async function shrink(file){const url=URL.createObjectURL(file);try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Bild nicht lesbar.'));i.src=url;});
 const max=1600,k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const w=Math.round(img.naturalWidth*k),h=Math.round(img.naturalHeight*k);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
 const png=file.type==='image/png'&&file.size<400000;const data=c.toDataURL(png?'image/png':'image/jpeg',0.84);return data;}finally{URL.revokeObjectURL(url);}}
$('pimg').onchange=async()=>{const f=$('pimg').files[0];if(!f)return;$('mI').className='msg';$('mI').textContent='wird hochgeladen …';try{const data=await shrink(f);const r=await api('blog/image','POST',{name:f.name,alt:$('palt').value,data});insertAtCursor(r.markdown);renderImages(r.images);$('palt').value='';say('mI','Bild gespeichert und eingefügt.',true);}catch(e){say('mI',e.message);}finally{$('pimg').value='';}};
$('pimgs').onclick=async e=>{const ins=e.target.closest('button[data-ins]');if(ins){insertAtCursor('!['+($('palt').value||'').replace(/[\\[\\]]/g,'')+'](bilder/'+ins.dataset.ins+')');return;}const del=e.target.closest('button[data-del]');if(del&&confirm('Bild „'+del.dataset.del+'“ löschen? Geht nur, wenn kein Beitrag es verwendet.')){try{const r=await api('blog/image','DELETE',{name:del.dataset.del});renderImages(r.images);}catch(err){say('mI',err.message);}}};
const cleanUrl=u=>u.trim().replace(/\\)/g,'%29').replace(/\\s/g,'%20');
$('prok').onclick=()=>{const u=cleanUrl($('prurl').value),t=$('prtitle').value.trim().replace(/[\\[\\]]/g,''),x=$('prtext').value.trim().replace(/^>\\s*/,'');
 if(!/^https:\\/\\/[^\\s/]+\\.[^\\s/]+/i.test(u))return say('mR','Die Adresse muss mit https:// beginnen, z. B. https://www.linkedin.com/posts/…');
 if(!t)return say('mR','Bitte einen Titel angeben – er steht groß auf der Karte.');
 insertAtCursor('> ['+t+']('+u+')'+(x?'\\n> '+x:''));$('prurl').value=$('prtitle').value=$('prtext').value='';say('mR','Karte eingefügt.',true);};
const YT=/^https?:\\/\\/(?:www\\.|m\\.)?(?:youtube\\.com\\/(?:watch\\?(?:[^#\\s]*&)?v=|shorts\\/|live\\/)|youtu\\.be\\/)([A-Za-z0-9_-]{11})(?:[?&#][^\\s]*)?$/;
function ytId(){const m=$('pyurl').value.trim().match(YT);return m?m[1]:null;}
$('pyurl').oninput=()=>{const id=ytId();$('pyprev').hidden=!id;$('mY').textContent='';if(id){$('pyimg').src='https://i.ytimg.com/vi/'+id+'/mqdefault.jpg';$('pytext').textContent='Video erkannt (Kennung '+id+').';}};
$('pyok').onclick=()=>{const id=ytId();if(!id)return say('mY','Das ist keine YouTube-Adresse. Sie sieht so aus: https://www.youtube.com/watch?v=… oder https://youtu.be/…');
 const t=$('pytitle').value.trim().replace(/\\s+/g,' ');insertAtCursor('https://www.youtube.com/watch?v='+id+(t?'\\n'+t:''));$('pyurl').value=$('pytitle').value='';$('pyprev').hidden=true;say('mY','Video eingefügt.',true);};
$('prurl').oninput=()=>{$('mR').textContent='';};
// ---- Live-Vorschau: derselbe Renderer wie im Worker (makeRenderer aus blog.js), hier im Browser ----
// Die Seitenhülle (Design der Website) kommt einmal vom Worker; danach wird nur der Artikel neu gezeichnet –
// im Rahmen rechts bzw. unten und, auf Wunsch, in einem eigenen Fenster für den zweiten Bildschirm.
// Der Bündler (esbuild) darf hier keine Helfer wie __name einschleusen – wrangler.toml: keep_names = false;
// zur Sicherheit ein Schutz, damit ein Fehler im Renderer nie das übrige Dashboard lahmlegt.
window.__name=window.__name||(f=>f);let R=null;try{R=(${blog.makeRenderer.toString()})();}catch(e){console.error('Vorschau-Renderer',e);}
let pvShell='',pvWin=null,pvTimer=null,pvWatch=null;
const pvOff=()=>{try{return localStorage.getItem('redaktion:vorschau')==='aus';}catch(e){return false;}};
function pvLayout(){const off=pvOff(),win=!!(pvWin&&!pvWin.closed);$('ed').classList.toggle('nopv',off||win);$('bpvshow').hidden=!off||win;document.body.classList.toggle('editing',!$('beditor').hidden&&!off&&!win);}
function articleHtml(){if(!R)return '<p class="meta">Live-Vorschau nicht verfügbar – bitte Robin Bescheid geben.</p>';const d=postBody();const lang=d.lang==='en'?'en':'de';const date=/^\\d{4}-\\d{2}-\\d{2}$/.test(d.date)?d.date:new Date().toISOString().slice(0,10);const site=B?B.url.replace(/blog\\/$/,''):'';
 return '<h1>'+R.esc(d.title||'Ohne Titel')+'</h1>\\n<p class="meta"><time datetime="'+date+'">'+R.dateText(date,lang)+'</time></p>\\n'+R.renderMarkdown(d.body,site+'blog/',lang);}
function paint(doc){if(!doc)return;const art=doc.querySelector('article');if(!art)return;const lang=$('plang').value==='en'?'en':'de';art.innerHTML=articleHtml();art.lang=lang;doc.documentElement.lang=lang;doc.title=($('ptitle').value||'Ohne Titel')+' – Vorschau';
 doc.querySelectorAll('.yt-play').forEach(b=>{b.onclick=()=>{const box=b.closest('.yt'),f=doc.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+box.dataset.video+'?autoplay=1&rel=0';f.title=box.dataset.title;f.allow='autoplay; encrypted-media; picture-in-picture';f.allowFullscreen=true;box.replaceChildren(f);box.classList.add('yt-on');};});}
function refreshPreview(){clearTimeout(pvTimer);pvTimer=setTimeout(()=>{const f=$('bframe');if(pvShell&&f.contentDocument&&f.contentDocument.querySelector('article'))paint(f.contentDocument);if(pvWin&&!pvWin.closed)paint(pvWin.document);},120);}
async function loadPreview(){pvLayout();$('pvnote').textContent='';try{const d=await api('blog/preview','POST',{...postBody(),body:''});pvShell=d.html;const f=$('bframe');f.onload=()=>paint(f.contentDocument);f.srcdoc=pvShell;if(pvWin&&!pvWin.closed)openPvWin(false);}catch(e){$('pvnote').textContent='Vorschau nicht ladbar: '+e.message;}}
function openPvWin(focus=true){const w=pvWin&&!pvWin.closed?pvWin:window.open('','rjl-vorschau','width=780,height=960');if(!w){say('mP','Der Browser hat das Fenster blockiert – bitte Pop-ups für diese Seite erlauben.');return;}
 pvWin=w;w.document.open();w.document.write(pvShell);w.document.close();paint(w.document);if(focus)w.focus();pvLayout();
 clearInterval(pvWatch);pvWatch=setInterval(()=>{if(!pvWin||pvWin.closed){clearInterval(pvWatch);pvWin=null;pvLayout();refreshPreview();}},800);}
$('bpvwin').onclick=()=>{if(!pvShell)return say('mP','Die Vorschau lädt noch – gleich noch einmal drücken.');openPvWin();};
$('bpvhide').onclick=()=>{try{localStorage.setItem('redaktion:vorschau','aus');}catch(e){}pvLayout();};
$('bpvshow').onclick=()=>{try{localStorage.removeItem('redaktion:vorschau');}catch(e){}pvLayout();refreshPreview();};
['pdate','plang'].forEach(id=>{$(id).onchange=changed;});
window.addEventListener('beforeunload',()=>{if(pvWin&&!pvWin.closed)pvWin.close();});
// ---- Teilen: LinkedIn (Stufe 1 – öffnet LinkedIns Teilen-Fenster mit vorbelegtem Text; gepostet wird dort) ----
let savedStatus=null;
function shareUrlFor(slug){return B?B.url+slug+'/':'';}
function shareText(summary,title,url){return (summary||title||'').trim()+'\\n\\n'+url;}
function shareBox(){const on=!!(editing&&savedStatus==='published');$('pshare').hidden=!on;if(!on)return;const url=shareUrlFor(editing);$('psurl').textContent=url;
 if($('pstext').dataset.slug!==editing){$('pstext').dataset.slug=editing;$('pstext').value=shareText($('psummary').value,$('ptitle').value,url);}}
// Am Rechner nimmt LinkedIn den Text vorbelegt entgegen (inoffiziell, klappt seit Jahren); auf dem Handy nur den Link – dort Text kopieren und einfügen.
function openLinkedIn(text,url){const mobile=matchMedia('(max-width: 900px)').matches;const u=(text.trim()&&!mobile)?'https://www.linkedin.com/feed/?shareActive=true&text='+encodeURIComponent(text.trim()):'https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(url);
 const w=window.open(u,'_blank','noopener');if(!w)say('mS','Der Browser hat das Fenster blockiert – bitte Pop-ups für diese Seite erlauben.');}
$('pshareli').onclick=()=>openLinkedIn($('pstext').value,shareUrlFor(editing));
$('pscopy').onclick=async()=>{try{await navigator.clipboard.writeText($('pstext').value);say('mS','Text kopiert.',true);}catch(e){say('mS','Kopieren nicht möglich – bitte den Text markieren und kopieren.');}};
const _openEditor=openEditor;openEditor=function(p,meta){_openEditor(p,meta);$('plink').hidden=true;count();offerDraft(p);shareBox();loadPreview();api('blog/images').then(d=>d&&renderImages(d.images)).catch(()=>{});};
api('blog').then(b=>b&&renderBlog(b)).catch(e=>{$('bsrc').textContent='Blog nicht ladbar: '+e.message;});
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
