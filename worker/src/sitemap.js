// sitemap.xml der Website (Robin, 16.10.2026, Auffindbarkeit): Startseite in beiden Sprachen, Werkzeuge mit Übersichten,
// Impulse mit Listen. Geschrieben von der Redaktion beim Veröffentlichen (blog.js, buildBlog), lokal von
// tools/blog-seiten-bauen.mjs und tools/werkzeug-uebernehmen.mjs. Keine Abhängigkeiten, damit kein Importkreis entsteht.
const x = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

// posts: veröffentlichte Beiträge {slug, lang, date}; werkzeuge: {id, lang, gegenstueck, datum?} (worker/src/werkzeug.js)
export function renderSitemap({ siteUrl, posts = [], werkzeuge = [], heute = new Date().toISOString().slice(0, 10) }) {
  const eintraege = [];
  const eintrag = (loc, lastmod, alternates = []) => eintraege.push({ loc, lastmod, alternates });
  const alt = (lang, href) => ({ lang, href });
  eintrag(siteUrl, heute, [alt("de", siteUrl), alt("en", siteUrl + "?lang=en"), alt("x-default", siteUrl)]);
  const uebersicht = { de: siteUrl + "werkzeuge/", en: siteUrl + "werkzeuge/en/" };
  const neuestesWerkzeug = werkzeuge.map(w => w.datum || "").filter(Boolean).sort().at(-1) || heute;
  for (const lang of ["de", "en"]) eintrag(uebersicht[lang], neuestesWerkzeug, [alt("de", uebersicht.de), alt("en", uebersicht.en)]);
  for (const w of werkzeuge) {
    const anderes = werkzeuge.find(v => v.id === w.gegenstueck);
    eintrag(`${siteUrl}werkzeuge/${w.id}/`, w.datum || neuestesWerkzeug,
      [alt(w.lang, `${siteUrl}werkzeuge/${w.id}/`), ...(anderes ? [alt(anderes.lang, `${siteUrl}werkzeuge/${anderes.id}/`)] : [])]);
  }
  const listen = { de: siteUrl + "blog/", en: siteUrl + "blog/en/" };
  for (const lang of ["de", "en"]) {
    const eigene = posts.filter(p => p.lang === lang);
    if (!eigene.length) continue;
    eintrag(listen[lang], eigene.map(p => p.date).sort().at(-1), [alt("de", listen.de), alt("en", listen.en)]);
  }
  for (const p of posts) eintrag(`${siteUrl}blog/${p.slug}/`, p.date);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${eintraege.map(e => `  <url>
    <loc>${x(e.loc)}</loc>
    <lastmod>${x(e.lastmod)}</lastmod>${e.alternates.map(a => `
    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${x(a.href)}"/>`).join("")}
  </url>`).join("\n")}
</urlset>
`;
}
