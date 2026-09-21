// Attrappe der Redaktion für Tests der Oberfläche: liefert die echte Dashboard-Seite (PAGE aus
// worker/src/admin.js) ohne Anmeldung und beantwortet die API mit festen Werten. Kein GitHub, kein KV.
// Die Blog-Vorschau rendert echt (blog.js). Gespeicherte Beiträge liegen nur im Speicher.
//   node tests/admin_fake.mjs 8789   → http://localhost:8789/admin
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { PAGE } from "../worker/src/admin.js";
import * as blog from "../worker/src/blog.js";
import landscape from "../landscape.js";

const port = +(process.argv[2] || 8789);
const settings = { enabled: true, title: { de: "Neuigkeiten", en: "News" }, intro: { de: "", en: "" } };
const posts = [{ slug: "erster-beitrag", title: "Erster Beitrag", date: "2026-09-19", lang: "de", status: "draft", summary: "Ein Test.",
  body: "Erster Absatz mit etwas Text.\n\nZweiter Absatz.\n\n## Eine Überschrift\n\nDritter Absatz." }];
const images = [{ name: "beispiel.jpg", size: 1234 }];
const saved = []; // was PUT blog/post erhielt
// Landschaften: der echte Herbst-Satz aus dem Repository plus alles, was die Oberfläche anlegt (nur im Speicher; Bilder werden nicht abgelegt)
const sets = [{ slug: "burgberg-herbst", ...landscape.normalizeSet(JSON.parse(await readFile(new URL("../assets/landschaften/burgberg-herbst/landschaft.json", import.meta.url), "utf8"))) }];
let site = { landschaft: "aus", satz: "burgberg-herbst" };
const landState = () => ({ ...site, url: SITE, landschaften: sets, standard: landscape.normalizeSet(null),
  sizes: Object.fromEntries(Object.entries(landscape.LAYERS).map(([k, v]) => [k, v.sizes])), budgets: Object.fromEntries(Object.entries(landscape.LAYERS).map(([k, v]) => [k, v.budget])) });

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
    let rel = normalize(decodeURIComponent(u.pathname.slice(6))).replace(/^(\.\.[/\\])+/, "");
    if (rel === "" || rel === ".") rel = "index.html"; else if (rel.endsWith("/")) rel += "index.html"; // /site/ → Startseite (Vorschau der Landschaften)
    try { let data = await readFile(join(ROOT, rel));
      // Die Startseite nennt den Worker (data-contact-endpoint); Vorschau-Nachrichten der Redaktion nimmt sie nur von dessen Ursprung an – hier also von der Attrappe.
      if (rel === "index.html") data = Buffer.from(data.toString("utf8").replace(/data-contact-endpoint="[^"]*"/, `data-contact-endpoint="http://localhost:${port}/contact"`));
      res.writeHead(200, { "content-type": MIME[extname(rel)] || "application/octet-stream", "access-control-allow-origin": "*" }); return res.end(data); }
    catch { res.writeHead(404); return res.end(); }
  }
  const api = u.pathname.replace(/^\/admin\/api\//, "");
  if (api === "state") return json(res, { usage: [], limits: { perDay: 60, perHour: 12, turns: 8 }, alert: false, model: "claude-opus-5", profileWords: 2700,
    unanswered: [], github: true, content: { aktuell: { fields: { stand: "19.09.2026", de: "", en: "" }, meta: { hasPrev: false }, historyUrl: "" },
      links: { fields: { rows: [] }, meta: { hasPrev: false }, historyUrl: "" } } });
  if (api === "site" && req.method === "GET") return json(res, { ...site, url: SITE });
  if (api === "site" && req.method === "PUT") { const f = await readBody(req); site = { landschaft: f.landschaft === "an" ? "an" : "aus", satz: sets.some(s => s.slug === f.satz) ? f.satz : site.satz }; return json(res, { ...site, url: SITE, note: "Schalter gesetzt (Attrappe)." }); }
  if (api === "landschaften" && req.method === "GET") return json(res, landState());
  if (api === "landschaften/satz" && req.method === "PUT") { const f = await readBody(req); const slug = String(f.slug || "").toLowerCase(); let s = sets.find(x => x.slug === slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return json(res, { error: "Ungültiger Name der Landschaft." }, 400);
    if (s && f.neu === true) return json(res, { error: `„${slug}“ gibt es schon – bitte einen anderen Namen wählen.` }, 400);
    const next = landscape.normalizeSet({ ...(s || {}), name: f.name, blaetter: f.blaetter, himmel: f.himmel, ebenen: s ? s.ebenen : {} });
    if (s) Object.assign(s, next); else sets.push({ slug, ...next }); return json(res, { slug, commit: null }); }
  if (api === "landschaften/satz" && req.method === "DELETE") { const f = await readBody(req); if (f.slug === site.satz) return json(res, { error: "Die aktive Landschaft kann nicht gelöscht werden – erst eine andere veröffentlichen." }, 400);
    const i = sets.findIndex(x => x.slug === f.slug); if (i < 0) return json(res, { error: "Diese Landschaft gibt es nicht." }, 400); sets.splice(i, 1); return json(res, { commit: null }); }
  if (api === "landschaften/ebene" && req.method === "POST") { const f = await readBody(req); const s = sets.find(x => x.slug === f.slug); if (!s) return json(res, { error: "Bitte die Landschaft zuerst anlegen (Name speichern)." }, 400);
    const sizes = (landscape.LAYERS[f.ebene] || {}).sizes; if (!sizes || !landscape.SEASONS.includes(f.saison)) return json(res, { error: "Unbekannte Ebene oder Jahreszeit." }, 400);
    const big = Buffer.from(String((f.bilder || {})[sizes[0]] || ""), "base64"); if (big.subarray(0, 4).toString() !== "RIFF" || big.subarray(8, 12).toString() !== "WEBP") return json(res, { error: "Kein WebP." }, 400);
    s.ebenen[f.saison] = { ...s.ebenen[f.saison], [f.ebene]: { avif: false, bytes: big.length } }; return json(res, { slug: s.slug, commit: null, bytes: big.length }); }
  if (api === "landschaften/ebene" && req.method === "DELETE") { const f = await readBody(req); const s = sets.find(x => x.slug === f.slug); if (!s || !s.ebenen[f.saison] || !s.ebenen[f.saison][f.ebene]) return json(res, { error: "Diese Ebene gibt es nicht." }, 400);
    delete s.ebenen[f.saison][f.ebene]; if (!Object.keys(s.ebenen[f.saison]).length) delete s.ebenen[f.saison]; return json(res, { slug: s.slug, commit: null }); }
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
