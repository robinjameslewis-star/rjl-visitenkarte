// Attrappe der Redaktion für Tests der Oberfläche: liefert die echte Dashboard-Seite (PAGE aus
// worker/src/admin.js) ohne Anmeldung und beantwortet die API mit festen Werten. Kein GitHub, kein KV.
// Die Blog-Vorschau rendert echt (blog.js). Gespeicherte Beiträge liegen nur im Speicher.
//   node tests/admin_fake.mjs 8789   → http://localhost:8789/admin
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { PAGE } from "../worker/src/admin.js";
import * as blog from "../worker/src/blog.js";

const port = +(process.argv[2] || 8789);
const settings = { enabled: true, title: { de: "Neuigkeiten", en: "News" }, intro: { de: "", en: "" } };
const posts = [{ slug: "erster-beitrag", title: "Erster Beitrag", date: "2026-09-19", lang: "de", status: "draft", summary: "Ein Test.",
  body: "Erster Absatz mit etwas Text.\n\nZweiter Absatz.\n\n## Eine Überschrift\n\nDritter Absatz." }];
const images = [{ name: "beispiel.jpg", size: 1234 }];
const saved = []; // was PUT blog/post erhielt

const SITE = `http://localhost:${port}/site/`; // die Website selbst wird aus dem Projektordner ausgeliefert (Papier, Schrift, Rotkehlchen für die Karte)
const ROOT = new URL("..", import.meta.url).pathname;
const MIME = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };
const blogState = () => ({ settings, visible: false, reason: "noch nichts veröffentlicht", published: 0,
  posts: posts.map(({ body, ...p }) => p), url: SITE + "blog/" });

const json = (res, obj, status = 200) => { res.writeHead(status, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(r => { let s = ""; req.on("data", c => s += c); req.on("end", () => { try { r(JSON.parse(s || "{}")); } catch { r({}); } }); });

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/admin") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(PAGE); }
  if (u.pathname === "/_saved") return json(res, saved);
  if (u.pathname.startsWith("/site/")) { // statische Dateien der Website
    const rel = normalize(decodeURIComponent(u.pathname.slice(6))).replace(/^(\.\.[/\\])+/, "");
    try { const data = await readFile(join(ROOT, rel)); res.writeHead(200, { "content-type": MIME[extname(rel)] || "application/octet-stream", "access-control-allow-origin": "*" }); return res.end(data); }
    catch { res.writeHead(404); return res.end(); }
  }
  const api = u.pathname.replace(/^\/admin\/api\//, "");
  if (api === "state") return json(res, { usage: [], limits: { perDay: 60, perHour: 12, turns: 8 }, alert: false, model: "claude-opus-5", profileWords: 2700,
    unanswered: [], github: true, content: { aktuell: { fields: { stand: "19.09.2026", de: "", en: "" }, meta: { hasPrev: false }, historyUrl: "" },
      links: { fields: { rows: [] }, meta: { hasPrev: false }, historyUrl: "" } } });
  if (api === "site" && req.method === "GET") return json(res, { landschaft: "aus", url: SITE });
  if (api === "site" && req.method === "PUT") { const f = await readBody(req); return json(res, { landschaft: f.landschaft === "an" ? "an" : "aus", url: SITE, note: "Schalter gesetzt (Attrappe)." }); }
  if (api === "passkeys") return json(res, { passkeys: [{ id: "k1", name: "MacBook", at: "2026-09-19T08:00:00Z" }] });
  if (api === "goch") return json(res, { settings: { enabled: true, provider: "anthropic", model: "claude-opus-5", cache: true,
    custom: { baseUrl: "", model: "", key: "", keySet: false, keyHint: "", keySource: "" } }, providers: { anthropic: "Anthropic (Claude)" },
    models: [{ id: "claude-opus-5", label: "Claude Opus 5" }], keys: { anthropic: true, workersAi: false }, status: null, pageOn: true });
  if (api === "blog" && req.method === "GET") return json(res, blogState());
  if (api === "blog/images") return json(res, { images });
  if (api === "blog/post" && req.method === "GET") { const p = posts.find(p => p.slug === u.searchParams.get("slug")); return p ? json(res, { post: p, hasPrev: false, historyUrl: "" }) : json(res, { error: "Nicht gefunden." }, 404); }
  if (api === "blog/preview" && req.method === "POST") { const f = await readBody(req);
    const post = { slug: "vorschau", title: f.title || "Ohne Titel", date: f.date || "2026-09-19", lang: f.lang === "en" ? "en" : "de", status: "draft", summary: f.summary || "", body: f.body || "" };
    return json(res, { html: blog.renderPostPage(post, settings, SITE, SITE) }); }
  if (api === "blog/image" && req.method === "POST") { const f = await readBody(req); // Attrappe: nichts wird gespeichert, nur der Name gemerkt
    const name = f.card ? `${blog.CARD_PREFIX}${f.card}.jpg` : String(f.name || "bild").replace(/\.[a-z0-9]+$/i, "") + ".jpg";
    if (!images.some(i => i.name === name)) images.push({ name, size: (f.data || "").length });
    return json(res, { name, markdown: `![](bilder/${name})`, images, commit: null }); }
  if (api === "blog/post" && req.method === "PUT") { const f = await readBody(req); saved.push(f);
    try { const p = blog.validatePost(f, posts.filter(x => x.slug !== f.slug).map(x => x.slug)); const i = posts.findIndex(x => x.slug === p.slug); if (i >= 0) posts[i] = p; else posts.push(p);
      return json(res, { ...blogState(), slug: p.slug, historyUrl: "", note: "Gespeichert (Attrappe)." }); } catch (e) { return json(res, { error: e.message }, 400); } }
  json(res, { error: "Attrappe kennt " + req.method + " " + api + " nicht." }, 404);
}).listen(port, () => console.log("Redaktions-Attrappe: http://localhost:" + port + "/admin"));
