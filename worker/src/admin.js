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
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' https:; font-src https:; frame-src 'self' about:; form-action 'none'; base-uri 'none'" } });
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

const PAGE = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Redaktion · robinjameslewis</title><style>${STYLE}</style></head>
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
<div id="beditor" hidden style="margin-top:16px;border-top:1px solid var(--line);padding-top:8px">
<div class="row"><div><label for="ptitle">Titel</label><input id="ptitle" maxlength="120"></div><div><label for="pdate">Datum</label><input id="pdate" type="date" style="max-width:200px"></div></div>
<div class="row"><div><label for="plang">Sprache</label><select id="plang" style="width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:#fff"><option value="de">Deutsch</option><option value="en">English</option></select></div>
<div><label for="pstatus">Status</label><select id="pstatus" style="width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:#fff"><option value="draft">Entwurf (nicht auf der Website)</option><option value="published">Veröffentlicht</option></select></div></div>
<label for="psummary">Kurzfassung (ein, zwei Sätze – steht in der Liste und im RSS)</label><input id="psummary" maxlength="300">
<label for="pbody">Text</label><textarea id="pbody" style="min-height:360px;font-family:inherit;font-size:15px"></textarea>
<p class="note">Absätze durch Leerzeile. <code>## Zwischenüberschrift</code>, <code>**fett**</code>, <code>*kursiv*</code>, <code>- Aufzählung</code>, <code>1. Nummerierung</code>, <code>&gt; Zitat</code>, <code>[Linktext](https://…)</code>, <code>![Bildbeschreibung](https://…)</code>. Mehr nicht – und nichts davon kann die Seite kaputtmachen.</p>
<div style="margin:12px 0 0;padding:12px;border:1px dashed var(--line);border-radius:8px">
<div class="bar" style="margin:0"><label class="quiet" style="display:inline-block;margin:0;padding:8px 14px;border:1px solid var(--line);border-radius:999px;cursor:pointer;color:var(--ink);font-size:15px">Bild hochladen<input id="pimg" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
<input id="palt" placeholder="Bildbeschreibung (für Menschen, die das Bild nicht sehen)" style="flex:1;min-width:200px"><span class="msg" id="mI"></span></div>
<p class="note" style="margin:8px 0 0">Das Bild wird im Browser auf höchstens 1600 Pixel verkleinert und ohne Aufnahmedaten (Ort, Kamera) gespeichert; im Text erscheint es an der Cursorstelle. Vorhandene Bilder:</p>
<div id="pimgs" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div></div>
<p class="note" id="pslug"></p>
<div class="bar"><button id="bpsave">Speichern</button><button class="quiet" id="bpreview">Vorschau</button><button class="quiet" id="bprev">Vorige Fassung</button><button class="quiet" id="bdel">Löschen</button><a class="note" id="bhist" target="_blank" rel="noopener">Verlauf</a><button class="quiet" id="bcancel">Schließen</button><span class="msg" id="mP"></span></div>
<iframe id="bframe" hidden title="Vorschau" style="width:100%;height:560px;border:1px solid var(--line);border-radius:8px;background:#fff;margin-top:12px"></iframe>
</div></section>

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
// ---- Blog ----
let B=null,editing=null;
function renderBlog(b){B=b;$('benabled').checked=b.settings.enabled;$('btde').value=b.settings.title.de;$('bten').value=b.settings.title.en;$('bide').value=b.settings.intro.de;$('bien').value=b.settings.intro.en;
 $('bsrc').innerHTML=b.visible?'Auf der Website: <b>sichtbar</b> – '+b.published+(b.published===1?' veröffentlichter Beitrag':' veröffentlichte Beiträge')+'.':'Auf der Website: <b>verborgen</b> – '+esc(b.reason)+' ('+b.published+' veröffentlicht, '+b.posts.length+' insgesamt.)';
 $('bopen').href=b.url;$('bopen').hidden=!b.visible;
 $('bposts').innerHTML=b.posts.map(p=>'<li><span class="note" style="min-width:90px">'+p.date+'</span><span class="lang">'+p.lang+'</span><span style="flex:1">'+esc(p.title)+'</span><span class="note">'+(p.status==='published'?'veröffentlicht':'Entwurf')+'</span><button class="quiet" data-slug="'+esc(p.slug)+'" style="padding:4px 10px;font-size:13px">Bearbeiten</button></li>').join('');
 $('bnote').textContent=b.posts.length?'':'Noch keine Beiträge. „+ Neuer Beitrag“ legt den ersten an; als Entwurf bleibt er unsichtbar, bis du ihn veröffentlichst.';}
function openEditor(p,meta){editing=p?p.slug:null;$('beditor').hidden=false;$('bframe').hidden=true;$('mP').textContent='';
 $('ptitle').value=p?p.title:'';$('pdate').value=p?p.date:new Date().toISOString().slice(0,10);$('plang').value=p?p.lang:'de';$('pstatus').value=p?p.status:'draft';$('psummary').value=p?p.summary:'';$('pbody').value=p?p.body:'';
 $('pslug').textContent=p?'Adresse: '+B.url+p.slug+'/':'Die Adresse entsteht aus dem Titel und bleibt danach fest.';
 $('bprev').hidden=!p;$('bprev').disabled=!(meta&&meta.hasPrev);$('bdel').hidden=!p;$('bhist').hidden=!p;if(meta)$('bhist').href=meta.historyUrl;
 $('beditor').scrollIntoView({behavior:'smooth',block:'start'});$('ptitle').focus();}
function postBody(){return {slug:editing||'',title:$('ptitle').value,date:$('pdate').value,lang:$('plang').value,status:$('pstatus').value,summary:$('psummary').value,body:$('pbody').value};}
$('bsave').onclick=async()=>{if(!confirm('Blog-Einstellungen jetzt veröffentlichen?'))return;try{const r=await api('blog/settings','PUT',{enabled:$('benabled').checked,title:{de:$('btde').value,en:$('bten').value},intro:{de:$('bide').value,en:$('bien').value}});renderBlog(r);say('mB',r.note,true);}catch(e){say('mB',e.message);}};
$('bnew').onclick=()=>openEditor(null);
$('bposts').onclick=async e=>{const b=e.target.closest('button[data-slug]');if(!b)return;try{const d=await api('blog/post?slug='+encodeURIComponent(b.dataset.slug));openEditor(d.post,d);}catch(err){say('mB',err.message);}};
$('bcancel').onclick=()=>{$('beditor').hidden=true;editing=null;};
$('bpreview').onclick=async()=>{try{const d=await api('blog/preview','POST',postBody());$('bframe').srcdoc=d.html;$('bframe').hidden=false;$('bframe').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){say('mP',e.message);}};
$('bpsave').onclick=async()=>{const st=$('pstatus').value;if(!confirm(st==='published'?'Beitrag jetzt veröffentlichen?':'Beitrag als Entwurf speichern?'))return;$('bpsave').disabled=true;try{const r=await api('blog/post','PUT',postBody());renderBlog(r);editing=r.slug;$('pslug').textContent='Adresse: '+r.url+r.slug+'/';$('bprev').hidden=false;$('bdel').hidden=false;$('bhist').hidden=false;$('bhist').href=r.historyUrl+'/'+r.slug+'.md';say('mP',r.note,true);}catch(e){say('mP',e.message);}finally{$('bpsave').disabled=false;}};
$('bdel').onclick=async()=>{if(!editing||!confirm('Diesen Beitrag löschen? Er verschwindet von der Website; im Verlauf auf GitHub bleibt er erhalten.'))return;try{const r=await api('blog/post','DELETE',{slug:editing});renderBlog(r);$('beditor').hidden=true;editing=null;say('mB',r.note,true);}catch(e){say('mP',e.message);}};
$('bprev').onclick=async()=>{if(!editing||!confirm('Vorige Fassung dieses Beitrags wiederherstellen? (Als neue Änderung, nichts geht verloren.)'))return;try{const r=await api('blog/post/restore','POST',{slug:editing});renderBlog(r);const d=await api('blog/post?slug='+encodeURIComponent(editing));openEditor(d.post,d);say('mP',r.note,true);}catch(e){say('mP',e.message);}};
// ---- Bilder ----
function insertAtCursor(text){const t=$('pbody');const a=t.selectionStart||0,b=t.selectionEnd||0;const before=t.value.slice(0,a),after=t.value.slice(b);const pad=before&&!before.endsWith('\\n\\n')?(before.endsWith('\\n')?'\\n':'\\n\\n'):'';t.value=before+pad+text+'\\n\\n'+after;t.focus();const pos=(before+pad+text).length;t.setSelectionRange(pos,pos);}
function renderImages(list){$('pimgs').innerHTML=list.length?list.map(i=>'<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:6px;padding:4px 6px;font-size:12px"><img src="'+esc(B.url)+'bilder/'+esc(i.name)+'" alt="" style="height:36px;width:48px;object-fit:cover;border-radius:3px;background:#eee"><span>'+esc(i.name)+'</span><button class="quiet" data-ins="'+esc(i.name)+'" style="padding:2px 8px;font-size:12px">einfügen</button><button class="x" data-del="'+esc(i.name)+'" title="Bild löschen">×</button></span>').join(''):'<span class="note">noch keine</span>';}
async function shrink(file){const url=URL.createObjectURL(file);try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Bild nicht lesbar.'));i.src=url;});
 const max=1600,k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const w=Math.round(img.naturalWidth*k),h=Math.round(img.naturalHeight*k);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
 const png=file.type==='image/png'&&file.size<400000;const data=c.toDataURL(png?'image/png':'image/jpeg',0.84);return data;}finally{URL.revokeObjectURL(url);}}
$('pimg').onchange=async()=>{const f=$('pimg').files[0];if(!f)return;$('mI').className='msg';$('mI').textContent='wird hochgeladen …';try{const data=await shrink(f);const r=await api('blog/image','POST',{name:f.name,alt:$('palt').value,data});insertAtCursor(r.markdown);renderImages(r.images);$('palt').value='';say('mI','Bild gespeichert und eingefügt.',true);}catch(e){say('mI',e.message);}finally{$('pimg').value='';}};
$('pimgs').onclick=async e=>{const ins=e.target.closest('button[data-ins]');if(ins){insertAtCursor('!['+($('palt').value||'')+'](bilder/'+ins.dataset.ins+')');return;}const del=e.target.closest('button[data-del]');if(del&&confirm('Bild „'+del.dataset.del+'“ löschen? Geht nur, wenn kein Beitrag es verwendet.')){try{const r=await api('blog/image','DELETE',{name:del.dataset.del});renderImages(r.images);}catch(err){say('mI',err.message);}}};
const _openEditor=openEditor;openEditor=function(p,meta){_openEditor(p,meta);api('blog/images').then(d=>d&&renderImages(d.images)).catch(()=>{});};
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
