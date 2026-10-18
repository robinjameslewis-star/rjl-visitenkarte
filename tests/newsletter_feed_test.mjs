// Newsletter-Feeds (worker/src/blog.js, renderNewsletterFeed; Robin, 16.10.2026): je Sprache ein Feed für die RSS-Kampagne bei
// Brevo, jeder Eintrag mit der ganzen Ausgabe als HTML (Impuls mit Auszug, „Neu im Werkzeug“ mit der neuesten Fassung), jede
// Fassung zusätzlich als eigener Eintrag; Dateien im Repository entsprechen dem Modul; „Was ist neu“ lesbar. Kein Netz.
//   node tests/newsletter_feed_test.mjs
import { readFileSync, readdirSync } from "node:fs";
import { parsePost, POSTS_DIR, renderNewsletterFeed, auszug, NEWSLETTER_DIR, EN_DIR } from "../worker/src/blog.js";
import { WERKZEUGE, werkzeugPfad, werkzeugFelder } from "../worker/src/werkzeug.js";
import { neuigkeiten, neuigkeitKopf } from "../worker/src/neuigkeiten.js";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");
const SITE = "https://robin.vision/";

console.log("Was ist neu (neuigkeiten.js)");
const e = neuigkeiten("### Fassung a1b2c3d vom 5.11.2026\n\n- eins\n- zwei\n\n### Version 0abcdef, 3 October 2026\n\ntext");
check(e.length === 2 && e[0].fassung === "a1b2c3d" && e[0].datum === "2026-11-05" && e[0].text === "- eins\n- zwei" && e[1].fassung === "0abcdef" && e[1].datum === "2026-10-03", "Überschriften deutsch und englisch gelesen");
check(neuigkeitKopf("a1b2c3d", "2026-11-05", "de") === "### Fassung a1b2c3d vom 5.11.2026" && neuigkeitKopf("a1b2c3d", "2026-11-05", "en") === "### Version a1b2c3d, 5 November 2026", "Überschrift für eine neue Fassung");
check(neuigkeiten("").length === 0 && neuigkeiten("kein Eintrag").length === 0, "leer oder ohne Überschrift: keine Einträge");
check(auszug("# Titel\n\nErster Absatz.\n\n![Bild](x.jpg)\n\n> Zitat\n\nZweiter Absatz.\n\n- Liste") === "Erster Absatz.\n\nZweiter Absatz.", "Auszug nimmt nur Textabsätze");

console.log("\nFeeds im Repository");
const posts = readdirSync(root + POSTS_DIR).filter(n => n.endsWith(".md")).map(n => parsePost(lesen(`${POSTS_DIR}/${n}`), n.slice(0, -3)))
  .filter(p => p.status === "published" && p.date).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
const felder = Object.fromEntries(WERKZEUGE.map(w => [w.id, werkzeugFelder(lesen(werkzeugPfad(w.id)))]));
const werkzeuge = WERKZEUGE.map(w => ({ ...w, datum: felder[w.id].datei.datum, datei: felder[w.id].datei, neuigkeiten: felder[w.id].neuigkeiten }));
for (const lang of ["de", "en"]) {
  const pfad = `${NEWSLETTER_DIR}/${lang === "en" ? EN_DIR + "/" : ""}feed.xml`, xml = lesen(pfad);
  check(xml === renderNewsletterFeed({ posts, siteUrl: SITE, lang, werkzeuge }), `${pfad} entsteht genau aus dem Modul`);
  const eigene = posts.filter(p => p.lang === lang), fremde = posts.filter(p => p.lang !== lang);
  const fassungen = werkzeuge.filter(w => w.lang === lang).flatMap(w => neuigkeiten(w.neuigkeiten).map(n => ({ ...n, w })));
  check((xml.match(/<item>/g) || []).length === eigene.length + fassungen.length && (xml.match(/<\/item>/g) || []).length === eigene.length + fassungen.length, `${pfad}: ein Eintrag je Impuls und je Fassung (${eigene.length} + ${fassungen.length})`);
  check(eigene.every(p => xml.includes(`<guid isPermaLink="true">${SITE}blog/${p.slug}/</guid>`)) && fremde.every(p => !xml.includes(`blog/${p.slug}/`)), `${pfad}: nur Impulse dieser Sprache`);
  check(fassungen.every(n => xml.includes(`<guid isPermaLink="true">${SITE}werkzeuge/${n.w.id}/#fassung-${n.fassung}</guid>`)), `${pfad}: jede Fassung als eigener Eintrag`);
  const neuBlock = lang === "en" ? "<h3>New in SmartFormular FiBu lite</h3>" : "<h3>Neu im SmartFormular FiBu lite</h3>";
  check((xml.match(new RegExp(neuBlock.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length === eigene.length, `${pfad}: „Neu im Werkzeug“ in jedem Impuls-Eintrag`);
  check((xml.match(lang === "en" ? /<h3>Tools<\/h3>/g : /<h3>Werkzeuge<\/h3>/g) || []).length === eigene.length + fassungen.length && !xml.includes("<h3>SmartFormular</h3>") && xml.includes(`${SITE}werkzeuge/${lang === "en" ? "en/" : ""}"`) && (xml.match(/<h3>Workshops<\/h3>/g) || []).length === eigene.length + fassungen.length && xml.includes(`${SITE}workshops/${lang === "en" ? "en/" : ""}`), `${pfad}: Angebote Werkzeuge und Workshops in jedem Eintrag`);
  check((xml.match(/<description><!\[CDATA\[</g) || []).length === eigene.length + fassungen.length && !/undefined|\[object/.test(xml), `${pfad}: Beschreibungen der Einträge als HTML in CDATA, nichts Undefiniertes`);
  const daten = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map(m => Date.parse(m[1]));
  check(daten.every((d, i) => !i || d <= daten[i - 1]), `${pfad}: neueste zuerst`);
  check(eigene.every(p => { const i = xml.indexOf(`blog/${p.slug}/</guid>`); const stueck = xml.slice(i, xml.indexOf("</item>", i)); return stueck.length > 900 && stueck.includes(lang === "en" ? "Read the whole post" : "Den ganzen Impuls lesen"); }), `${pfad}: längerer Auszug je Impuls mit Verweis`);
}

console.log("\nRedaktion und Skripte");
const admin = lesen("worker/src/admin.js");
check(/wneu\$\{x\}/.test(admin) && /\['wneu','neuigkeiten'\]/.test(admin) && /neuigkeiten:\$\('wneu'\+x\)\.value/.test(admin), "Redaktion: Feld „Was ist neu“ wird gelesen und veröffentlicht");
check(/key === "werkzeug" \|\| key === "werkzeugEn"\) await rebuild/.test(admin) && /werkzeugFelder: felder/.test(admin), "Redaktion: Feeds werden nach Werkzeug-Texten und bei jedem Neubau geschrieben");
check(/neuigkeitKopf\(fassung, datum, w\.lang\)/.test(lesen("tools/werkzeug-uebernehmen.mjs")) && /renderNewsletterFeed/.test(lesen("tools/werkzeug-uebernehmen.mjs")) && /werkzeugFelder: felder/.test(lesen("tools/blog-seiten-bauen.mjs")), "Skripte: neue Fassung belegt „Was ist neu“ vor, beide Skripte schreiben die Feeds");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nNewsletter-Feeds in Ordnung.");
process.exit(fails ? 1 : 0);
