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

t = tags(renderList());
function renderList() { return blog.renderListPage([{ ...base, body: "" }], blog.DEFAULT_SETTINGS, site); }
check(t["og:type"] === "website" && t["og:url"] === site + "blog/", "Liste: og:type website");

check(blog.firstImage("![x](https://a.b/c.png)", site) === "https://a.b/c.png" && blog.firstImage("![x](http://a.b/c.png)", site) === "", "fremde Bilder nur per https");
check(blog.shareImage({ slug: "x", body: "" }, "", ["karte-x.jpg"]) === "", "ohne Seitenadresse kein Vorschaubild");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nBlog-Renderer in Ordnung.");
process.exit(fails ? 1 : 0);
