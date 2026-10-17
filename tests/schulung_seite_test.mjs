// Seite „Schulung“ (worker/src/schulung.js; Robin, 16.10.2026, Member-Repo #105): beide Sprachfassungen entstehen genau aus dem
// Modul, tragen Inhalt, Formate mit Preisen, Ablauf, Nachweis, Rechtsrahmen ohne „Pflichtschulung“-Werbung, Fragen (FAQPage),
// das Anfrageformular über Gochs Kontakt-Endpunkt und den Kopf mit aktivem Menüpunkt; Startseite, sitemap.xml und Gochs
// Linkliste kennen die Seite. Kein Netz.   node tests/schulung_seite_test.mjs
import { readFileSync } from "node:fs";
import { SCHULUNG, schulungSeite, schulungUrl, PREISE, KONTAKT_ENDPUNKT, MEMBER_PRUEFUNG } from "../worker/src/schulung.js";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");

const PRIVAT = /0151|684660|gmail|googlemail|Höchststr|1988|Hechingen/i;
// In Anführungszeichen darf die Seite die Begriffe nennen, um sich davon abzugrenzen; als eigene Aussage nie.
const UEBERTRIEBEN = /(?<![„“"])Pflichtschulung|zertifizierungspflichtig|sonst droht|Bußgeld droht|(?<![“"])mandatory course|or face a fine|!/;
const DU = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i;
const T = {
  de: { h1: "Unterweisung KI-Kompetenz", nav: /<a href="\.\.\/schulung\/" aria-current="page">Schulung<\/a>/, home: "../", formate: ["Workshop online", "Workshop vor Ort"], preis: `${PREISE.live} € je Termin`, recht: /Verordnung \(EU\) 2026\/1744/, titel: "Unterweisung KI-Kompetenz nach Art. 4 KI-Verordnung" },
  en: { h1: "AI literacy training", nav: /<a href="\.\.\/training\/" aria-current="page">Training<\/a>/, home: "../?lang=en", formate: ["Online workshop", "On-site workshop"], preis: `€${PREISE.live} per session`, recht: /Regulation \(EU\) 2026\/1744/, titel: "AI literacy training under Article 4 of the EU AI Act" },
};
for (const s of SCHULUNG) {
  const t = T[s.lang], html = lesen(s.pfad);
  console.log(`\n${s.pfad}`);
  check(html === schulungSeite(s.lang), "Seite im Repository entsteht genau aus dem Modul");
  check(html.includes(`<html lang="${s.lang}">`) && html.includes(`<title>${t.titel}`) && html.includes(`<h1>${t.h1}</h1>`), "Sprache, Titel mit Suchbegriffen, Überschrift");
  check(html.includes(`<link rel="canonical" href="${schulungUrl(s.lang)}">`) && SCHULUNG.every(a => html.includes(`hreflang="${a.lang}" href="${schulungUrl(a.lang)}"`)), "canonical und hreflang beider Fassungen");
  check(t.nav.test(html) && html.includes(`<a class="termin" href="${t.home}#kontakt">`), "Kopf: Schulung aktiv, Termin bleibt");
  check((html.match(/<li><span class="nr">0\d<\/span>/g) || []).length === 7, "sieben Kapitel");
  check(t.formate.every(f => html.includes(`<h3>${f}</h3>`)) && html.includes(t.preis) && (html.match(/<section class="format">/g) || []).length === 2, "zwei Formate mit Preisen");
  check((html.match(/<ol class="ablauf">[\s\S]*?<\/ol>/) || [""])[0].split("<li>").length - 1 === 7, "Ablauf in sieben Schritten");
  check(/Online-Lehrgang|online course/.test(html) && !/Folien|slides/.test(html.replace(/<script[\s\S]*?<\/script>/g, "")), "Online-Lehrgang statt Folien");
  check(html.includes(`href="${MEMBER_PRUEFUNG}"`) && /keine amtliche oder akkreditierte Bescheinigung|not an official or accredited attestation/.test(html), "Nachweis: Prüfseite verlinkt, Zertifikat ehrlich eingeordnet");
  check(t.recht.test(html) && /2\. Februar 2025|2 February 2025/.test(html), "Rechtsrahmen mit Omnibus und Geltung seit Februar 2025");
  const sichtbar = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  check(!UEBERTRIEBEN.test(sichtbar), "keine Pflicht- oder Bußgeld-Werbung, keine Ausrufezeichen", (sichtbar.match(UEBERTRIEBEN) || [""])[0]);
  check(!PRIVAT.test(html), "keine privaten Daten", (html.match(PRIVAT) || [""])[0]);
  if (s.lang === "de") check(!DU.test(sichtbar), "kein Du", (sichtbar.match(new RegExp(`.{0,30}${DU.source}.{0,30}`, "i")) || [""])[0]);
  const form = (html.match(/<form class="anfrage" id="anfrage" novalidate>[\s\S]*?<\/form>/) || [""])[0];
  check(form.includes('name="firma"') && form.includes('name="email"') && form.includes('name="format"') && form.includes('name="personen"') && form.includes('name="website"') && form.includes('id="anfrage-status"'), "Anfrageformular mit Feldern, Falle und Statuszeile");
  check(html.includes(JSON.stringify(KONTAKT_ENDPUNKT)) && html.includes(`lang: ${JSON.stringify(s.lang)}`) && /t: geladen/.test(html), "Skript sendet an Gochs Kontakt-Endpunkt mit Sprache und Ladezeitpunkt");
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } });
  check(ld.length === 2 && ld.every(Boolean) && ld[0]["@type"] === "Course" && ld[0].hasCourseInstance.length === 2 && ld[1]["@type"] === "FAQPage" && ld[1].mainEntity.length === 8, "JSON-LD: Course mit zwei Durchführungen und FAQPage mit acht Fragen");
  check((html.match(/<div class="fragen">[\s\S]*?<\/div>/) || [""])[0].split("<h3>").length - 1 === 8, "acht Fragen sichtbar");
  check(html.includes('id="newsletter"') && /data-newsletter-endpoint="https:\/\/goch\.robin\.vision\/newsletter"/.test(html), "Newsletter-Kasten");
  const andere = SCHULUNG.find(a => a.lang !== s.lang);
  check(html.includes(`<a href="../${andere.adresse}" lang="${andere.lang}" hreflang="${andere.lang}">`), "Verweis auf die andere Sprachfassung");
}

console.log("\nStartseite, Sitemap, Goch");
const start = lesen("index.html");
check((start.match(/<a href="schulung\/" data-href-de="schulung\/" data-href-en="training\/" data-i18n="navSchulung">Schulung<\/a><a href="ueber-mich\/"/g) || []).length === 2, "Startseite: Menüpunkt in beiden Navigationen vor „Über mich“");
check(start.includes('<section class="blog-teaser schulung" id="schulung" aria-labelledby="schulung-title">') && start.indexOf('id="schulung"') > start.indexOf('id="werkzeuge"') && start.indexOf('id="schulung"') < start.indexOf('id="ueber-mich"'), "Startseite: Abschnitt zwischen Werkzeugen und Über mich");
check(/data-i18n="schulungMore">Mehr zur Unterweisung<\/a>/.test(start), "Startseite: Verweis auf die Seite");
const lang = lesen("language.js");
check(/schulungTitle: 'Unterweisung KI-Kompetenz'/.test(lang) && /schulungTitle: 'AI literacy training'/.test(lang) && /schulungLead: /.test(lang) && /schulungMore: 'More about the training'/.test(lang), "language.js: Titel, Text und Verweis in beiden Sprachen");
const sitemap = lesen("sitemap.xml");
check(SCHULUNG.every(s => sitemap.includes(`<loc>${schulungUrl(s.lang)}</loc>`)), "sitemap.xml nennt beide Fassungen");
const links = lesen("worker/links.md");
check(/^\| schulung \|.*https:\/\/robin\.vision\/schulung\/ https:\/\/robin\.vision\/training\/ \|$/m.test(links), "Gochs Linkliste kennt die Seite");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nSeite „Schulung“ in Ordnung.");
process.exit(fails ? 1 : 0);
