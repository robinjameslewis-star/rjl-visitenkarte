// Prüft den Blog-Renderer (worker/src/blog.js) ohne Worker: Open-Graph-Angaben, Vorschaubild-Regeln.
//   node tests/blog_test.mjs
import * as blog from "../worker/src/blog.js";
let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const site = "https://site.example/";
const base = { slug: "test", title: "Ein <Titel>", date: "2026-09-19", lang: "de", status: "published", summary: "Kurz & gut." };
const tags = html => Object.fromEntries([...html.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)">/g)].map(m => [m[1], m[2]]));

let t = tags(blog.renderPostPage({ ...base, body: "Text." }, blog.DEFAULT_SETTINGS, site, site));
check(t["og:title"] === "Ein &lt;Titel&gt;" && t["og:description"] === "Kurz &amp; gut." && t["og:type"] === "article", "og:title/description/type maskiert");
check(t["og:url"] === site + "blog/test/" && t["og:locale"] === "de_DE" && t["article:published_time"] === "2026-09-19", "og:url, Sprache, Datum");
check(!("og:image" in t) && t["twitter:card"] === "summary", "ohne Bild: kein og:image, kleine Karte");

t = tags(blog.renderPostPage({ ...base, body: "Text.\n\n![b](bilder/foto.jpg)" }, blog.DEFAULT_SETTINGS, site, site));
check(t["og:image"] === site + "blog/bilder/foto.jpg" && t["twitter:card"] === "summary_large_image", "erstes Bild des Beitrags wird og:image");

t = tags(blog.renderPostPage({ ...base, body: "Text." }, blog.DEFAULT_SETTINGS, site, site, ["karte-test.jpg"]));
check(t["og:image"] === site + "blog/bilder/karte-test.jpg", "ohne Bild, mit Karte: karte-<slug>.jpg wird og:image");

t = tags(blog.renderPostPage({ ...base, body: "![b](bilder/foto.jpg)" }, blog.DEFAULT_SETTINGS, site, site, ["karte-test.jpg"]));
check(t["og:image"] === site + "blog/bilder/foto.jpg", "Bild im Beitrag hat Vorrang vor der Karte");

// Veröffentlichen: Quellordner posts/ und bilder/ werden nie als alte Beitragsseiten gelöscht (GitRPC::BadObjectState, 25.09.2026)
{
  const b = blog.buildBlog({ settings: { ...blog.DEFAULT_SETTINGS, enabled: true }, posts: [{ ...base, body: "Text." }], homepage: (await import("node:fs")).readFileSync(new URL("../index.html", import.meta.url), "utf8"),
    existingDirs: ["posts", "bilder", "en", "test", "alter-beitrag"], existingFiles: [], siteUrl: site });
  const deletes = b.changes.filter(c => c.delete).map(c => c.path);
  check(JSON.stringify(deletes) === JSON.stringify(["blog/alter-beitrag/index.html"]), "nur alte Beitragsseiten werden gelöscht, nicht posts/ oder bilder/", deletes.join(", "));
}

// Sprachen getrennt (Robin, 25.09.2026): deutsche Beiträge nur auf der deutschen, englische nur auf der englischen Seite
{
  const de = { ...base, slug: "beitrag-de", title: "Deutscher Beitrag", lang: "de", body: "Text." };
  const en = { ...base, slug: "post-en", title: "English post", lang: "en", body: "Text." };
  const settings = { ...blog.DEFAULT_SETTINGS, enabled: true, title: { de: "Impulse", en: "Food for thought" }, intro: { de: "Einleitung", en: "Intro" } };
  const listDe = blog.renderListPage([de, en], settings, site, "de"), listEn = blog.renderListPage([de, en], settings, site, "en");
  check(listDe.includes("Deutscher Beitrag") && !listDe.includes("English post") && listDe.includes('<html lang="de">'), "deutsche Liste nur mit deutschen Beiträgen");
  check(listEn.includes("English post") && !listEn.includes("Deutscher Beitrag") && listEn.includes('<html lang="en">') && listEn.includes('href="../post-en/"') && listEn.includes("Food for thought"), "englische Liste unter blog/en/ nur mit englischen Beiträgen");
  const feedEn = blog.renderFeed([de, en], settings, site, "en");
  check(feedEn.includes("English post") && !feedEn.includes("Deutscher Beitrag") && feedEn.includes("<language>en</language>"), "englischer Feed nur englisch");
  const pageEn = blog.renderPostPage(en, settings, site, undefined);
  check(pageEn.includes('class="home" href="../../?lang=en"') && pageEn.includes('href="../en/">All posts') && pageEn.includes('href="../../blog/en/feed.xml"'), "englischer Beitrag verweist auf englische Startseite, Liste und Feed");
  const pageDe = blog.renderPostPage(de, settings, site, undefined);
  check(pageDe.includes('class="home" href="../../"') && pageDe.includes('href="../">Alle Beiträge'), "deutscher Beitrag verweist auf deutsche Startseite und Liste");
  const home = (await import("node:fs")).readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const b = blog.buildBlog({ settings, posts: [de, en], homepage: home, existingDirs: [], existingFiles: [], siteUrl: site });
  const paths = b.changes.map(c => c.path);
  check(["blog/index.html", "blog/feed.xml", "blog/en/index.html", "blog/en/feed.xml"].every(x => paths.includes(x)), "Listen und Feeds je Sprache werden geschrieben");
  const teaser = b.changes.find(c => c.path === "index.html").content;
  check(/<li lang="de"><span/.test(teaser) && /<li lang="en" hidden>/.test(teaser) && teaser.includes('data-href-en="blog/en/"') && teaser.includes('data-langs="de en"'), "Startseite: englische Einträge ohne Skript verborgen, Umschalter kennt blog/en/");
  const hidden = blog.buildBlog({ settings: { ...settings, enabled: false }, posts: [de, en], homepage: home, existingDirs: ["en"], existingFiles: ["index.html", "feed.xml"], siteUrl: site });
  check(["blog/en/index.html", "blog/en/feed.xml", "blog/index.html", "blog/feed.xml"].every(x => hidden.changes.some(c => c.delete && c.path === x)), "ausgeschaltet: beide Listen und Feeds werden entfernt");
  check(blog.validatePost({ title: "Englisch", slug: "en", date: "2026-09-25", body: "Ein paar Sätze Text." }).slug === "en-beitrag", "Adresse „en“ ist reserviert");
}

t = tags(renderList());
function renderList() { return blog.renderListPage([{ ...base, body: "" }], blog.DEFAULT_SETTINGS, site); }
check(t["og:type"] === "website" && t["og:url"] === site + "blog/", "Liste: og:type website");

check(blog.firstImage("![x](https://a.b/c.png)", site) === "https://a.b/c.png" && blog.firstImage("![x](http://a.b/c.png)", site) === "", "fremde Bilder nur per https");
check(blog.shareImage({ slug: "x", body: "" }, "", ["karte-x.jpg"]) === "", "ohne Seitenadresse kein Vorschaubild");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nBlog-Renderer in Ordnung.");
process.exit(fails ? 1 : 0);
