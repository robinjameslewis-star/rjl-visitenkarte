// Blog der Website – gepflegt in der Redaktion, gespeichert im Repository, gebaut vom Worker.
// Quelle: blog/blog.json (Schalter, Titel) und blog/posts/<slug>.md (Beiträge mit Kopfzeilen).
// Erzeugt: blog/index.html (Liste), blog/<slug>/index.html (Beitrag), blog/feed.xml (RSS) und den
// Verweis auf der Startseite zwischen den Marken <!-- redaktion:blog-link --> … <!-- /redaktion:blog-link -->.
// Der Blog erscheint nur, wenn der Schalter an ist UND mindestens ein Beitrag veröffentlicht ist.
// Markdown ist bewusst eine kleine, sichere Teilmenge: alles wird maskiert, kein HTML aus dem Text.

export const POSTS_DIR = "blog/posts";
export const SETTINGS_PATH = "blog/blog.json";
const LINK_START = "<!-- redaktion:blog-link -->", LINK_END = "<!-- /redaktion:blog-link -->";
const SECTION_START = "<!-- redaktion:blog-section -->", SECTION_END = "<!-- /redaktion:blog-section -->";
export const IMAGES_DIR = "blog/bilder";
const TEASER_COUNT = 5;

export const DEFAULT_SETTINGS = { enabled: false, title: { de: "Blog", en: "Blog" }, intro: { de: "", en: "" } };

export function parseSettings(text) {
  try {
    const s = JSON.parse(text);
    return { enabled: s.enabled === true,
      title: { de: str(s.title && s.title.de) || "Blog", en: str(s.title && s.title.en) || "Blog" },
      intro: { de: str(s.intro && s.intro.de), en: str(s.intro && s.intro.en) } };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
export function validateSettings(f) {
  const out = { enabled: f.enabled === true, title: { de: str(f.title && f.title.de).slice(0, 60), en: str(f.title && f.title.en).slice(0, 60) },
    intro: { de: str(f.intro && f.intro.de).slice(0, 300), en: str(f.intro && f.intro.en).slice(0, 300) } };
  if (!out.title.de || !out.title.en) throw new Error("Der Blog braucht einen Titel auf Deutsch und Englisch.");
  return out;
}
export const composeSettings = s => JSON.stringify(s, null, 2) + "\n";
const str = v => typeof v === "string" ? v.trim() : "";

// ---------- Beiträge: Kopfzeilen zwischen --- und ---, dann der Text ----------

export function parsePost(md, slug) {
  const m = String(md).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const head = {}, body = m ? m[2] : String(md);
  if (m) for (const line of m[1].split("\n")) { const k = line.match(/^([a-z]+):\s*(.*)$/); if (k) head[k[1]] = k[2].trim().replace(/^"(.*)"$/, "$1"); }
  return { slug, title: head.title || slug, date: /^\d{4}-\d{2}-\d{2}$/.test(head.date || "") ? head.date : "",
    lang: head.lang === "en" ? "en" : "de", status: head.status === "published" ? "published" : "draft",
    summary: head.summary || "", body: body.replace(/^\n+/, "").replace(/\s+$/, "") };
}

export function validatePost(f, existingSlugs = []) {
  const title = str(f.title).replace(/\s+/g, " ").slice(0, 120);
  if (title.length < 3) throw new Error("Der Titel braucht mindestens drei Zeichen.");
  const date = str(f.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) throw new Error("Datum bitte als Kalenderdatum (JJJJ-MM-TT).");
  const lang = f.lang === "en" ? "en" : "de";
  const status = f.status === "published" ? "published" : "draft";
  const summary = str(f.summary).replace(/\s+/g, " ").slice(0, 300);
  const body = String(f.body || "").replace(/\r\n?/g, "\n").replace(/\s+$/, "");
  if (body.trim().length < 20) throw new Error("Der Text ist zu kurz – mindestens ein paar Sätze.");
  if (body.length > 40000) throw new Error("Der Text ist zu lang (höchstens 40.000 Zeichen).");
  let slug = str(f.slug) ? slugify(f.slug) : slugify(title);
  if (!slug) throw new Error("Aus dem Titel lässt sich keine Adresse bilden – bitte lateinische Buchstaben verwenden.");
  if (!str(f.slug)) { let base = slug, n = 2; while (existingSlugs.includes(slug)) slug = `${base}-${n++}`; }
  return { slug, title, date, lang, status, summary, body };
}
export function slugify(s) {
  return String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
export function composePost(p) {
  const q = v => '"' + String(v).replace(/"/g, "'") + '"';
  return `---\ntitle: ${q(p.title)}\ndate: ${p.date}\nlang: ${p.lang}\nstatus: ${p.status}\nsummary: ${q(p.summary)}\n---\n\n${p.body}\n`;
}

// ---------- Markdown, kleine sichere Teilmenge ----------

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = u => /^(https?:\/\/|mailto:)/i.test(u) ? u : null;
// Bildadressen: hochgeladene Bilder heißen im Text „bilder/name.jpg“; imgBase ist der Weg zum Ordner blog/
// von der jeweiligen Seite aus (Beitrag: ../, Vorschau: absolute Adresse); sonst nur https.
const imageUrl = (u, imgBase) => /^bilder\/[a-z0-9._-]+$/i.test(u) ? (imgBase || "") + u : safeUrl(u);

export function inline(text, imgBase) {
  let s = esc(text);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) => { const src = imageUrl(url, imgBase); return src ? `<img src="${esc(src)}" alt="${alt}" loading="lazy">` : alt; });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => safeUrl(url) ? `<a href="${esc(url)}"${/^https?:/i.test(url) ? ' rel="noopener"' : ""}>${label}</a>` : label);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  return s;
}

// YouTube-Adresse allein in einem Absatz (optional eine Titelzeile darunter) → Platzhalter; der Player lädt erst beim Klick.
const YT = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#][^\s]*)?$/;
const YT_TEXT = {
  de: { kicker: "Video · YouTube", load: "Video laden", note: "Beim Klick werden Inhalte von YouTube (Google) geladen.", privacy: "Datenschutz" },
  en: { kicker: "Video · YouTube", load: "Load video", note: "Clicking loads content from YouTube (Google).", privacy: "Privacy" },
};
export const videosUsed = md => String(md).split(/\n{2,}/).map(b => b.trim().split("\n")[0].trim().match(YT)).filter(Boolean).map(m => m[1]);

export function renderMarkdown(md, imgBase, lang = "de") {
  const blocks = String(md).replace(/\r\n?/g, "\n").split(/\n{2,}/).map(b => b.replace(/^\n+|\n+$/g, "")).filter(Boolean);
  const out = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const il = t => inline(t, imgBase);
    const yt = lines[0].trim().match(YT);
    if (yt && lines.length <= 2) {
      const t = YT_TEXT[lang] || YT_TEXT.de, title = lines[1] ? il(lines[1].trim()) : "";
      out.push(`<div class="yt" data-video="${yt[1]}" data-title="${esc(lines[1] ? lines[1].trim() : "YouTube")}"><span class="yt-kicker">${t.kicker}</span>${title ? `<span class="yt-title">${title}</span>` : ""}<button type="button" class="yt-play">${t.load}</button><span class="yt-note">${t.note} <a href="${esc((imgBase || "") + "../#privacy")}">${t.privacy}</a></span></div>`);
      continue;
    }
    if (/^#{2,3}\s/.test(lines[0]) && lines.length === 1) { const level = lines[0].match(/^(#+)/)[1].length; out.push(`<h${level}>${il(lines[0].replace(/^#+\s*/, ""))}</h${level}>`); continue; }
    if (/^(---|\*\*\*)$/.test(block)) { out.push("<hr>"); continue; }
    if (lines.every(l => /^>\s?/.test(l))) {
      const inner = lines.map(l => l.replace(/^>\s?/, ""));
      const card = inner[0].match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/); // Verweis auf eine fremde Seite: Karte statt Zitat
      if (card) {
        let host = ""; try { host = new URL(card[2]).hostname.replace(/^www\./, ""); } catch {}
        const rest = inner.slice(1).join("\n").trim();
        out.push(`<a class="ref" href="${esc(card[2])}" rel="noopener"><span class="ref-host">${esc(host)}</span><span class="ref-title">${inline(card[1], imgBase)}</span>${rest ? `<span class="ref-text">${inline(rest, imgBase).replace(/\n/g, "<br>")}</span>` : ""}</a>`);
        continue;
      }
      out.push(`<blockquote>${renderMarkdown(inner.join("\n"), imgBase, lang)}</blockquote>`); continue;
    }
    if (lines.every(l => /^[-*]\s+/.test(l))) { out.push("<ul>" + lines.map(l => `<li>${il(l.replace(/^[-*]\s+/, ""))}</li>`).join("") + "</ul>"); continue; }
    if (lines.every(l => /^\d+\.\s+/.test(l))) { out.push("<ol>" + lines.map(l => `<li>${il(l.replace(/^\d+\.\s+/, ""))}</li>`).join("") + "</ol>"); continue; }
    // Ein Bild allein in einem Absatz steht frei, ohne <p>-Rand darum
    if (lines.length === 1 && /^!\[[^\]]*\]\([^)\s]+\)$/.test(lines[0])) { const img = il(lines[0]); if (img.startsWith("<img")) { out.push(`<figure>${img}</figure>`); continue; } }
    out.push(`<p>${lines.map(il).join("<br>")}</p>`);
  }
  return out.join("\n");
}
// Bilder, die ein Text verwendet (Dateinamen unter blog/bilder/)
export const imagesUsed = md => [...String(md).matchAll(/!\[[^\]]*\]\(bilder\/([a-z0-9._-]+)\)/gi)].map(m => m[1]);
export const plainText = md => String(md).replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[*`#>]/g, "").replace(/\s+/g, " ").trim();

// ---------- Seiten ----------

const T = {
  de: { back: "Robin James Lewis", all: "Alle Beiträge", legal: "Impressum · Datenschutz", feed: "RSS", english: "English", german: "Deutsch", empty: "Noch keine Beiträge." },
  en: { back: "Robin James Lewis", all: "All posts", legal: "Legal notice · Privacy", feed: "RSS", english: "English", german: "German", empty: "No posts yet." },
};
const dateText = (iso, lang) => { const [y, m, d] = iso.split("-"); return lang === "en" ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : `${+d}. ${["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"][+m - 1]} ${y}`; };

function shell({ lang, title, description, depth, main, siteUrl, canonical, base }) {
  const up = base || "../".repeat(depth), t = T[lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} – Robin James Lewis</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="${up}assets/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="${up}assets/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Robin James Lewis – Blog" href="${up}blog/feed.xml">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<style>
@font-face { font-family: "EB Garamond"; font-style: normal; font-weight: 400 500; font-display: swap; src: url("${up}assets/fonts/eb-garamond-latin.woff2") format("woff2"); }
:root { --green: #0B3D2E; --copper: #B8724F; --ink: #1F1F1F; --ink-soft: #5C5C5C; --ink-muted: #9A9A9A; --line: #D6D9D6; --paper: #F3EFE5;
  --serif: "EB Garamond", "Cormorant Garamond", Baskerville, Georgia, serif; --sans: "Helvetica Neue", Inter, Arial, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; color: var(--ink); background: var(--paper) url("${up}assets/papier.jpg") repeat; background-size: 512px 512px; font: 400 17px/1.6 var(--sans); -webkit-font-smoothing: antialiased; }
.top { max-width: 680px; margin: 0 auto; padding: 28px 6vw 0; display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
.top a { color: var(--ink-soft); text-decoration: none; font-size: 12px; letter-spacing: .03em; }
.top a:hover { color: var(--green); }
.top .home { font: 500 15px/1 var(--serif); letter-spacing: .18em; text-transform: uppercase; color: var(--green); }
main { max-width: 680px; margin: 0 auto; padding: clamp(36px, 8vh, 80px) 6vw clamp(48px, 10vh, 110px); }
h1 { font: 400 clamp(30px, 4.2vw, 42px)/1.15 var(--serif); color: var(--green); margin: 0 0 8px; letter-spacing: .005em; }
.meta { color: var(--ink-muted); font-size: 13px; margin: 0 0 36px; }
.intro { color: var(--ink-soft); max-width: 52ch; margin: 0 0 36px; }
article h2 { font: 400 clamp(22px, 2.6vw, 27px)/1.25 var(--serif); color: var(--green); margin: 40px 0 10px; }
article h3 { font: 500 19px/1.3 var(--serif); margin: 30px 0 8px; }
article p, article li { max-width: 68ch; }
article p { margin: 0 0 18px; }
article a { color: var(--green); text-decoration: underline; text-decoration-color: var(--copper); text-underline-offset: .2em; }
article blockquote { margin: 24px 0; padding: 2px 0 2px 18px; border-left: 2px solid var(--copper); color: var(--ink-soft); }
article blockquote p:last-child { margin-bottom: 0; }
article .yt { aspect-ratio: 16 / 9; margin: 28px 0; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.35); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; gap: 8px; }
article .yt.yt-on { padding: 0; border: 0; background: #000; display: block; }
article .yt iframe { width: 100%; height: 100%; border: 0; display: block; }
article .yt-kicker { font-size: 12px; color: var(--ink-muted); letter-spacing: .03em; }
article .yt-title { font: 500 19px/1.3 var(--serif); color: var(--green); max-width: 40ch; }
article .yt-play { margin-top: 6px; min-height: 44px; border: 1px solid #D97932; border-radius: 3px; padding: 9px 16px; background: transparent; color: var(--ink); font: inherit; font-size: 14px; cursor: pointer; }
article .yt-play:hover { background: rgba(217,121,50,.08); }
article .yt-note { font-size: 12px; color: var(--ink-muted); max-width: 44ch; }
article .yt-note a { color: inherit; }
article .ref { display: block; margin: 26px 0; padding: 14px 18px; border: 1px solid var(--line); border-left: 2px solid var(--copper); border-radius: 3px; text-decoration: none; color: inherit; background: rgba(255,255,255,.35); }
article .ref:hover { border-color: var(--copper); }
article .ref-host { display: block; font-size: 12px; color: var(--ink-muted); letter-spacing: .03em; margin-bottom: 4px; }
article .ref-title { display: block; font: 500 19px/1.3 var(--serif); color: var(--green); }
article .ref-text { display: block; margin-top: 6px; color: var(--ink-soft); font-size: 15px; }
article hr { border: 0; border-top: 1px solid var(--line); margin: 36px 0; }
article img { max-width: 100%; height: auto; display: block; margin: 24px 0; }
article figure { margin: 28px 0; } article figure img { margin: 0; }
article code { font: 15px/1.4 ui-monospace, Menlo, monospace; background: rgba(0,0,0,.04); padding: 1px 5px; border-radius: 3px; }
article ul, article ol { padding-left: 22px; margin: 0 0 18px; }
.list { list-style: none; margin: 0; padding: 0; }
.list li { padding: 22px 0; border-top: 1px solid var(--line); }
.list li:last-child { border-bottom: 1px solid var(--line); }
.list a { color: var(--green); text-decoration: none; font: 400 clamp(21px, 2.4vw, 25px)/1.25 var(--serif); }
.list a:hover { text-decoration: underline; text-decoration-color: var(--copper); text-underline-offset: .2em; }
.list .when { display: block; color: var(--ink-muted); font-size: 13px; margin-bottom: 4px; }
.list .when span { margin-left: 8px; border: 1px solid var(--line); border-radius: 3px; padding: 0 5px; font-size: 11px; }
.list p { margin: 6px 0 0; color: var(--ink-soft); max-width: 60ch; }
.foot { max-width: 680px; margin: 0 auto; padding: 0 6vw 40px; font-size: 12px; color: var(--ink-muted); display: flex; gap: 14px; flex-wrap: wrap; }
.foot a { color: inherit; text-decoration: none; }
.foot a:hover { color: var(--ink-soft); }
</style>
</head>
<body>
<nav class="top" aria-label="Seite"><a class="home" href="${up}">${t.back}</a><a href="${depth > 1 ? "../" : "./"}">${t.all}</a></nav>
<main>
${main}
</main>
<footer class="foot"><a href="${up}#privacy">${t.legal}</a><a href="${up}blog/feed.xml">${t.feed}</a></footer>
</body>
</html>
`;
}

export function renderPostPage(post, settings, siteUrl, base) {
  const t = T[post.lang];
  const main = `<article lang="${post.lang}">
<h1>${esc(post.title)}</h1>
<p class="meta"><time datetime="${post.date}">${dateText(post.date, post.lang)}</time></p>
${renderMarkdown(post.body, base ? base + "blog/" : "../", post.lang)}
</article>
<script>
document.querySelectorAll(".yt-play").forEach(function (b) {
  b.addEventListener("click", function () {
    var box = b.closest(".yt"), id = box.dataset.video, f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0"; f.title = box.dataset.title;
    f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true; f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    box.replaceChildren(f); box.classList.add("yt-on");
  });
});
</script>`;
  return shell({ lang: post.lang, title: post.title, description: post.summary || plainText(post.body).slice(0, 160), depth: 2, main,
    siteUrl, canonical: siteUrl ? `${siteUrl}blog/${post.slug}/` : "", base });
}

export function renderListPage(posts, settings, siteUrl) {
  const lang = "de", t = T[lang];
  const items = posts.map(p => `<li lang="${p.lang}"><span class="when"><time datetime="${p.date}">${dateText(p.date, p.lang)}</time>${p.lang === "en" ? `<span>${T.de.english}</span>` : ""}</span><a href="${p.slug}/">${esc(p.title)}</a>${p.summary ? `<p>${esc(p.summary)}</p>` : ""}</li>`).join("\n");
  const main = `<h1>${esc(settings.title.de)}</h1>
${settings.intro.de ? `<p class="intro">${esc(settings.intro.de)}</p>` : ""}
${posts.length ? `<ul class="list">\n${items}\n</ul>` : `<p class="intro">${t.empty}</p>`}`;
  return shell({ lang, title: settings.title.de, description: settings.intro.de || `${settings.title.de} von Robin James Lewis`, depth: 1, main,
    siteUrl, canonical: siteUrl ? `${siteUrl}blog/` : "" });
}

export function renderFeed(posts, settings, siteUrl) {
  const x = s => String(s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const items = posts.map(p => `  <item>
    <title>${x(p.title)}</title>
    <link>${x(siteUrl)}blog/${p.slug}/</link>
    <guid isPermaLink="true">${x(siteUrl)}blog/${p.slug}/</guid>
    <pubDate>${new Date(p.date + "T09:00:00Z").toUTCString()}</pubDate>
    <description>${x(p.summary || plainText(p.body).slice(0, 300))}</description>
  </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Robin James Lewis – ${x(settings.title.de)}</title>
  <link>${x(siteUrl)}blog/</link>
  <description>${x(settings.intro.de || settings.title.de)}</description>
  <language>de</language>
${items}
</channel>
</rss>
`;
}

// Startseite: Verweis zwischen den Marken setzen oder leeren. Liefert null, wenn nichts zu ändern ist.
function between(html, start, end, inner, what) {
  const i = html.indexOf(start), j = html.indexOf(end);
  if (i < 0 || j < 0 || j < i) throw new Error("Startseite hat keine Marken für " + what + ".");
  return html.slice(0, i + start.length) + inner + html.slice(j);
}
export function updateHomepage(html, settings, posts) {
  const visible = !!posts;
  const link = visible ? `<a href="#blog" data-title-de="${esc(settings.title.de)}" data-title-en="${esc(settings.title.en)}">${esc(settings.title.de)}</a>` : "";
  let next = between(html, LINK_START, LINK_END, link, "den Blog-Verweis");
  next = between(next, SECTION_START, SECTION_END, visible ? teaser(settings, posts) : "", "den Blog-Abschnitt");
  return next === html ? null : next;
}
// Abschnitt unter dem Kalender: die neuesten Beiträge, Titel und Einleitung je Sprache umschaltbar (language.js)
function teaser(settings, posts) {
  const items = posts.slice(0, TEASER_COUNT).map(p => `      <li lang="${p.lang}"><span class="when"><time datetime="${p.date}">${dateText(p.date, p.lang)}</time>${p.lang === "en" ? "<span>English</span>" : ""}</span><a href="blog/${p.slug}/">${esc(p.title)}</a>${p.summary ? `<p>${esc(p.summary)}</p>` : ""}</li>`).join("\n");
  const intro = settings.intro.de || settings.intro.en ? `\n    <p class="lead" data-title-de="${esc(settings.intro.de || settings.intro.en)}" data-title-en="${esc(settings.intro.en || settings.intro.de)}">${esc(settings.intro.de || settings.intro.en)}</p>` : "";
  return `
  <section class="blog-teaser" id="blog" aria-labelledby="blog-title">
    <h2 id="blog-title" data-title-de="${esc(settings.title.de)}" data-title-en="${esc(settings.title.en)}">${esc(settings.title.de)}</h2>${intro}
    <ul>
${items}
    </ul>
    <p class="all"><a href="blog/" data-title-de="Alle Beiträge" data-title-en="All posts">Alle Beiträge</a></p>
  </section>
  `;
}

// Alles zusammen: aus Einstellungen, Beiträgen und Startseite die Dateiänderungen für einen Commit.
export function buildBlog({ settings, posts, homepage, existingDirs = [], existingFiles = [], siteUrl }) {
  const published = posts.filter(p => p.status === "published" && p.date).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const visible = settings.enabled && published.length > 0;
  const changes = [];
  const shown = visible ? published : [];
  if (visible) {
    changes.push({ path: "blog/index.html", content: renderListPage(shown, settings, siteUrl) });
    changes.push({ path: "blog/feed.xml", content: renderFeed(shown, settings, siteUrl) });
  } else { // verborgen heißt: gar nicht erreichbar, auch nicht als leere Liste
    for (const f of ["index.html", "feed.xml"]) if (existingFiles.includes(f)) changes.push({ path: "blog/" + f, delete: true });
  }
  const keep = new Set(shown.map(p => p.slug));
  for (const p of shown) changes.push({ path: `blog/${p.slug}/index.html`, content: renderPostPage(p, settings, siteUrl) });
  for (const dir of existingDirs) if (dir !== "posts" && !keep.has(dir)) changes.push({ path: `blog/${dir}/index.html`, delete: true });
  const home = updateHomepage(homepage, settings, visible ? published : null);
  if (home) changes.push({ path: "index.html", content: home });
  return { changes, visible, publishedCount: published.length };
}
