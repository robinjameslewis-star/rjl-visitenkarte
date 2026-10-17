// Auffindbarkeit, Standarddateien und Anrede (Robin, 16.10.2026): Kopfdaten der Startseite, strukturierte Daten, sitemap.xml
// passt zu Beiträgen und Werkzeugen, robots.txt, 404-Seite, security.txt, Favicon an der Wurzel, Bild zum Teilen; alle deutschen
// Besuchertexte in der Sie-Form (Startseite, Worker, Gochs Profil); Kalender-Hinweis im Termin-Abschnitt. Kein Netz.
//   node tests/auffindbarkeit_test.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { parsePost, POSTS_DIR } from "../worker/src/blog.js";
import { WERKZEUGE } from "../worker/src/werkzeug.js";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");
const html = lesen("index.html");

console.log("Startseite: Kopfdaten");
check(/<title>robin\.vision – SmartFormular und Workshops zur KI-Kompetenz<\/title>/.test(html) && /og:site_name" content="robin\.vision"/.test(html), "Titel mit Marke robin.vision, nennt SmartFormular und Workshops");
check(/<link rel="canonical" href="https:\/\/robin\.vision\/">/.test(html), "canonical");
check(["de", "en", "x-default"].every(l => html.includes(`hreflang="${l}"`)), "hreflang de, en, x-default");
check(/property="og:title"/.test(html) && /property="og:image" content="https:\/\/robin\.vision\/assets\/teilen\.jpg"/.test(html) && existsSync(root + "assets/teilen.jpg"), "Open Graph mit Bild zum Teilen, Bild vorhanden");
const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
check(ld.length === 1 && ld[0]["@graph"].some(e => e["@type"] === "Person") && ld[0]["@graph"].some(e => e["@type"] === "WebSite"), "JSON-LD: Person und WebSite, gültiges JSON");
check(/application\/rss\+xml/.test(html), "Feeds im Kopf angekündigt");

console.log("Startseite: Aufbau");
const pos = id => html.indexOf(`id="${id}"`);
check(pos("werkzeuge") > 0 && pos("werkzeuge") < pos("ueber-mich") && pos("ueber-mich") < pos("blog") && pos("blog") < pos("newsletter") && pos("newsletter") < pos("kontakt") && pos("kontakt") < pos("nachricht"),
  "Reihenfolge: Werkzeuge, Über mich, Impulse, Newsletter, Termin, Nachricht");
check(/<p class="claim" data-i18n="claim">Mitten in der Transformation: SmartFormular für die Tage, an denen der Prozess hakt/.test(html) && /class="cta-primary"[^>]*data-href-en="werkzeuge\/en\/"/.test(html) && /class="cta-secondary"[^>]*data-href-en="workshops\/en\/"/.test(html), "Einstieg mit SmartFormular und Workshops über der Falz, Ziele je Sprache");
const booking = (html.match(/<div class="booking"[\s\S]*?<\/div>\n\n  <\/section>/) || [""])[0];
check(/id="consent-banner"/.test(booking), "Kalender-Hinweis steht im Termin-Abschnitt an der Stelle des Kalenders");
check(!/\.consent-banner \{[^}]*position: fixed/.test(html) && !/padding-bottom: var\(--consent-height/.test(html), "Kalender-Hinweis klebt nicht mehr am unteren Rand");
check(/<nav class="hauptnav"[^>]*><a href="werkzeuge\/" data-href-de="werkzeuge\/" data-href-en="werkzeuge\/en\/"/.test(html), "Menü beginnt mit Werkzeugen und führt auf die Unterseite");

console.log("Anrede Sie");
const DU = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner|bist du|schreib|trag|frag)\b/i;
const lang = lesen("language.js");
const deBlock = lang.slice(lang.indexOf("de: {"), lang.indexOf("en: {"));
const deTexte = [...deBlock.matchAll(/^\s*[a-zA-Z0-9]+: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/gm)].map(m => m[1] ?? m[2]);
const duTexte = deTexte.filter(t => DU.test(t));
check(deTexte.length > 40 && duTexte.length === 0, "language.js (Deutsch): kein Du", duTexte.map(t => t.slice(0, 40)).join(" | "));
const sichtbar = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
const duSichtbar = sichtbar.match(new RegExp(`[^.]{0,30}${DU.source}[^.]{0,30}`, "i"));
check(!duSichtbar, "Startseite (Standardtexte): kein Du", duSichtbar && duSichtbar[0].trim());
const worker = lesen("worker/src/index.js");
const deWorker = worker.slice(worker.indexOf("  de: {"), worker.indexOf("  en: {"));
check(!/\b(dir|dich|dein|deinen|bist du|schreib mir|sag es)\b/.test(deWorker), "Gochs Draht-Texte: kein Du");
const profil = lesen("worker/profile.md");
check(/- Du siezt/.test(profil) && /Fragen Sie mich etwas über ihn/.test(profil) && /Schauen Sie nach oben/.test(profil), "Gochs Profil: siezt, Vorstellung und Formulierungen in der Sie-Form");
check(/Es ist der 10\./.test(profil) && /außerhalb des perfekten Prozesses/.test(profil), "Gochs Profil kennt die Geschichte vom 10. und die Positionierung");

console.log("Dateien");
const sitemap = lesen("sitemap.xml");
const posts = readdirSync(root + POSTS_DIR).filter(n => n.endsWith(".md")).map(n => parsePost(lesen(`${POSTS_DIR}/${n}`), n.slice(0, -3)));
const published = posts.filter(p => p.status === "published" && p.date), drafts = posts.filter(p => p.status !== "published");
check(published.every(p => sitemap.includes(`<loc>https://robin.vision/blog/${p.slug}/</loc>`)), `sitemap.xml nennt alle ${published.length} veröffentlichten Impulse`);
check(drafts.every(p => !sitemap.includes(`/blog/${p.slug}/`)), `sitemap.xml ohne Entwürfe (${drafts.length})`);
check(WERKZEUGE.every(w => sitemap.includes(`<loc>https://robin.vision/werkzeuge/${w.id}/</loc>`)) && sitemap.includes("<loc>https://robin.vision/werkzeuge/en/</loc>"), "sitemap.xml nennt Werkzeuge und Übersichten");
check(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap) && (sitemap.match(/<url>/g) || []).length === (sitemap.match(/<\/url>/g) || []).length, "sitemap.xml wohlgeformt mit lastmod");
check(/Sitemap: https:\/\/robin\.vision\/sitemap\.xml/.test(lesen("robots.txt")), "robots.txt verweist auf die Sitemap");
const sec = lesen(".well-known/security.txt"), expires = (sec.match(/Expires: (\S+)/) || [])[1];
check(/Contact: mailto:robin@robin\.vision/.test(sec) && expires && new Date(expires) > new Date(), "security.txt mit Kontakt und Ablauf in der Zukunft", expires);
check(existsSync(root + "favicon.ico") && readFileSync(root + "favicon.ico").equals(readFileSync(root + "assets/favicon.ico")), "favicon.ico an der Wurzel, gleich assets/favicon.ico");
const nf = lesen("404.html");
check(/<title>Seite nicht gefunden/.test(nf) && /href="\/werkzeuge\/"/.test(nf) && /href="\/blog\/"/.test(nf) && /lang="en"/.test(nf), "404-Seite mit Wegen zu Startseite, Werkzeugen und Impulsen");
check(existsSync(root + ".nojekyll"), ".nojekyll vorhanden, damit .well-known ausgeliefert wird");

console.log("Werkzeugseiten und Impulse: strukturierte Daten");
for (const w of WERKZEUGE) {
  const seite = lesen(`werkzeuge/${w.id}/index.html`);
  const m = seite.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let d = null; try { d = m && JSON.parse(m[1]); } catch {}
  check(d && d["@type"] === "SoftwareApplication" && d.name === w.titel && d.offers.price === "0" && /^[0-9a-f]{7}$/.test(d.softwareVersion), `${w.id}: SoftwareApplication mit Fassung und Preis 0`);
  const alle = [...seite.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } });
  check(alle.some(x => x && x["@type"] === "FAQPage" && x.mainEntity.length >= 5), `${w.id}: FAQPage mit Fragen und Antworten`);
  check(/<title>[^<]*DATEV[^<]*<\/title>/.test(seite) && /<meta name="description" content="[^"]*(Kontoausz|bank statement)[^"]*DATEV/.test(seite), `${w.id}: Titel und Beschreibung tragen die Suchbegriffe`);
}
for (const [l, p] of Object.entries({ de: "werkzeuge/index.html", en: "werkzeuge/en/index.html" })) check(/<title>[^<]*(Buchhaltung|bookkeeping)[^<]*<\/title>/.test(lesen(p)), `${p}: Übersicht mit eigenem Suchtitel`);
for (const p of published) {
  const seite = lesen(`blog/${p.slug}/index.html`);
  const m = seite.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let d = null; try { d = m && JSON.parse(m[1]); } catch {}
  check(d && d["@type"] === "BlogPosting" && d.datePublished === p.date && d.inLanguage === p.lang, `blog/${p.slug}/: BlogPosting`);
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nAuffindbarkeit, Dateien und Anrede in Ordnung.");
process.exit(fails ? 1 : 0);
