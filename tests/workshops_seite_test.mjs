// Seite „Workshops“ (worker/src/workshops.js; Robin, 17.10.2026): beide Sprachfassungen entstehen genau aus dem Modul, heben die
// Unterweisung nach EU AI Act als Teil des Workshops hervor (Abzeichen unter der Überschrift, eigener Kasten), tragen drei Teile,
// sieben Kapitel, zwei Formate mit Preisen, Ablauf, Nachweis, Rechtsrahmen ohne „Pflichtschulung“-Werbung, Fragen (FAQPage), den
// Cal.com-Kalender erst nach Klick, das Anfrageformular über Gochs Kontakt-Endpunkt und den Kopf mit aktivem Menüpunkt;
// Startseite, sitemap.xml und Gochs Linkliste kennen die Seite. Seit der Textprüfung vom 23.10.2026: kein „Zertifikat nach Art. 4“,
// keine Frage zum selbst gebauten Werkzeug, „verschiedene Anbieter“ erst mit Partnern, Kasten „Wer den Workshop leitet“.
// Kein Netz.   node tests/workshops_seite_test.mjs
import { readFileSync } from "node:fs";
import { WORKSHOPS, workshopsSeite, workshopsUrl, KONTAKT_ENDPUNKT, MEMBER_PRUEFUNG } from "../worker/src/workshops.js";
import { PARTNER } from "../worker/src/partner.js";
import { SEITEN } from "../worker/src/sitemap.js";
import { PORTRAIT } from "../worker/src/ueber_mich.js";

import { grundsaetze } from "../worker/src/grundsaetze.js";
let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");

const PRIVAT = /\b01[5-7]\d[ \-]?\d{3}[ \-]?\d{3,}\b|gmail|googlemail|Höchststr|\b19[5-9]\d\b/i;
// In Anführungszeichen darf die Seite die Begriffe nennen, um sich davon abzugrenzen; als eigene Aussage nie.
const UEBERTRIEBEN = /(?<![„“"])Pflichtschulung|zertifizierungspflichtig|sonst droht|Bußgeld droht|(?<![“"])mandatory course|or face a fine|!/;
const DU = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i;
const T = {
  de: { h1: "Workshop KI-Kompetenz für Ihr Team", abzeichen: "Mit Unterweisung nach EU AI Act", up: "../", nav: /<a href="\.\.\/workshops\/" aria-current="page">Workshops<\/a>/, home: "../", formate: ["Workshop online", "Workshop vor Ort"], preis: "Preis auf Anfrage", recht: /Verordnung \(EU\) 2024\/1689/, titel: "Workshop KI-Kompetenz mit Unterweisung nach EU AI Act", kasten: "Die Unterweisung nach EU AI Act" },
  en: { h1: "AI literacy workshop for your team", abzeichen: "With EU AI Act training", up: "../../", nav: /<a href="\.\.\/\.\.\/workshops\/en\/" aria-current="page">Workshops<\/a>/, home: "../../?lang=en", formate: ["Online workshop", "On-site workshop"], preis: "Price on request", recht: /Regulation \(EU\) 2024\/1689/, titel: "AI literacy workshop with EU AI Act training", kasten: "The EU AI Act training" },
};
for (const s of WORKSHOPS) {
  const t = T[s.lang], html = lesen(s.pfad);
  console.log(`\n${s.pfad}`);
  check(html === workshopsSeite(s.lang), "Seite im Repository entsteht genau aus dem Modul");
  check(html.includes(`<html lang="${s.lang}">`) && html.includes(`<title>${t.titel}`) && html.includes(`<h1>${t.h1}</h1>`), "Sprache, Titel mit Suchbegriffen, Überschrift");
  check(html.includes(`<h1>${t.h1}</h1>\n<p class="abzeichen">${t.abzeichen}</p>`), "Abzeichen „Unterweisung nach EU AI Act“ direkt unter der Überschrift");
  const kasten = (html.match(/<section class="unterweisung" aria-labelledby="unterweisung">[\s\S]*?<\/section>/) || [""])[0];
  check(kasten.includes(`<h2 id="unterweisung">${t.kasten}</h2>`) && (kasten.match(/<li>/g) || []).length === 3 && html.indexOf('class="unterweisung"') < html.indexOf('id="fuer-wen"'), "Kasten zur Unterweisung mit drei Fakten vor „Für wen“");
  check(html.includes(`<link rel="canonical" href="${workshopsUrl(s.lang)}">`) && WORKSHOPS.every(a => html.includes(`hreflang="${a.lang}" href="${workshopsUrl(a.lang)}"`)), "canonical und hreflang beider Fassungen");
  check(t.nav.test(html) && html.includes(`<a class="termin" href="${t.home}#kontakt">`), "Kopf: Workshops aktiv, Termin bleibt, Pfade zur Wurzel stimmen");
  check((html.match(/<section class="teil">/g) || []).length === 3, "drei Teile");
  check((((html.match(/<ol class="kapitel">[\s\S]*?<\/ol>/) || [""])[0]).match(/<li><span class="nr">0\d<\/span>/g) || []).length === 7, "sieben Kapitel");
  check(t.formate.every(f => html.includes(`<h3>${f}</h3>`)) && (html.match(new RegExp(`<p class="preis frei">${t.preis}</p>`, "g")) || []).length === 2 && (html.match(/<section class="format">/g) || []).length === 2, "zwei Formate, Preis auf Anfrage");
  // Der Workshop E-Rechnung (Selbstlernformat) nennt seinen Preis (W1/W2, freigegeben 10.11.2026); der KI-Workshop bleibt „auf Anfrage“.
  const erechnung = (html.match(/<section class="unterweisung erechnung"[\s\S]*?<\/section>/) || [""])[0], ohneErechnung = html.replace(erechnung, "");
  check(erechnung && /47,60 €|€47\.60/.test(erechnung) && erechnung.includes("workshop-buchen?workshop=e-rechnung"), "Workshop E-Rechnung mit Preis und Buchungslink");
  check(!/\d+(?:\.\d{3})? ?€|€ ?\d|\bEUR\b|"price"/.test(ohneErechnung), "sonst keine Preise auf der Seite (auf Anfrage)", (ohneErechnung.match(/.{0,30}(?:\d ?€|€ ?\d|EUR|"price").{0,30}/) || [""])[0]);
  check((html.match(/<ol class="ablauf">[\s\S]*?<\/ol>/) || [""])[0].split("<li>").length - 1 === 5, "Ablauf in fünf Schritten");
  check(/Online-Lehrgang|online course/.test(html) && !/Folien|slides/.test(html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/nicht mit Folien|not with slides/g, "")), "Online-Lehrgang statt Folien (die Abgrenzung „nicht mit Folien“ darf stehen)");
  check(html.includes(`href="${MEMBER_PRUEFUNG}"`) && /keine amtliche Bescheinigung|not an official attestation/.test(html), "Nachweis: Prüfseite verlinkt, Zertifikat ehrlich eingeordnet");
  check(t.recht.test(html) && /Januar 2027|January 2027/.test(html) && !/Omnibus|2026\/1744|UG \(haftungsbeschränkt\)/.test(html), "Rechtsrahmen knapp: Art. 4 mit Fundstelle, Termine ab 2027, ohne interne Planung");
  const sichtbar = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  check(!UEBERTRIEBEN.test(sichtbar), "keine Pflicht- oder Bußgeld-Werbung, keine Ausrufezeichen", (sichtbar.match(UEBERTRIEBEN) || [""])[0]);
  check(!PRIVAT.test(html), "keine privaten Daten", (html.match(PRIVAT) || [""])[0]);
  if (s.lang === "de") check(!DU.test(sichtbar), "kein Du", (sichtbar.match(new RegExp(`.{0,30}${DU.source}.{0,30}`, "i")) || [""])[0]);
  check(!/coaching/i.test(sichtbar), "Angebot heißt Workshop, nicht Coaching (auch der Memberbereich heißt seit 17.10.2026 „Workshops“)", (sichtbar.match(/.{0,30}coaching.{0,30}/i) || [""])[0]);
  check(!/cal\.com|kalender|calendar/i.test(html), "kein Kalender und kein Cal.com auf der Seite (Robin, 17.10.2026)", (html.match(/.{0,30}(?:cal\.com|kalender|calendar).{0,30}/i) || [""])[0]);
  const form = (html.match(/<form class="anfrage" id="anfrage" novalidate>[\s\S]*?<\/form>/) || [""])[0];
  check(form.includes('name="firma" maxlength="120" required') && form.includes('name="name" maxlength="80" required') && form.includes('name="email" maxlength="120" required') && form.includes('name="format"') && form.includes('name="personen" min="1" max="500" value="10" required') && form.includes('name="zeitraum"') && !form.includes('name="nachricht"') && form.includes('name="website"') && form.includes('id="anfrage-status"'), "kurzes Anfrageformular: Unternehmen, Ansprechperson, E-Mail, online oder vor Ort, Teilnehmerzahl, Wunschtermin; Falle und Statuszeile; kein Freitext");
  check(html.includes(JSON.stringify(KONTAKT_ENDPUNKT)) && html.includes(`lang: ${JSON.stringify(s.lang)}`) && /t: geladen/.test(html), "Skript sendet an Gochs Kontakt-Endpunkt mit Sprache und Ladezeitpunkt");
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } });
  check(ld.length === 2 && ld.every(Boolean) && ld[0]["@type"] === "Course" && ld[0].hasCourseInstance.length === 2 && ld[0].hasCourseInstance.every(c => !c.offers) && ld[1]["@type"] === "FAQPage" && ld[1].mainEntity.length === 7, "JSON-LD: Course mit zwei Durchführungen und FAQPage mit sieben Fragen");
  check((html.match(/<div class="fragen">[\s\S]*?<\/div>/) || [""])[0].split("<h3>").length - 1 === 7, "sieben Fragen sichtbar");
  check(html.includes('id="plan-b"') && /Plan-B-Tool|plan B tool/.test(html) && /doppeltem Boden|safety net/.test(html) && html.indexOf('id="zusammenarbeit"') < html.indexOf('id="plan-b"') && html.indexOf('id="plan-b"') < html.indexOf('class="grundsaetze"'), "Plan-B-Tool nach „Wie wir zusammenarbeiten“ – das Bauen im Workshop ist zurück (Robin, 04.11.2026; ersetzt die Entscheidung vom 18.10.2026)");
  check(!/Zertifikat nach Art\. 4|certificate under Article 4/.test(html), "kein „Zertifikat nach Art. 4“: Art. 4 schreibt kein Zertifikat vor, es belegt die Maßnahme (Textprüfung 23.10.2026)", (html.match(/.{0,30}(?:Zertifikat nach Art\. 4|certificate under Article 4).{0,30}/) || [""])[0]);
  check(PARTNER.length > 0 || !/verschiedener Anbieter|various providers/.test(sichtbar), "„verschiedene Anbieter“ erst, wenn Partner vorgestellt werden (Textprüfung 23.10.2026)", (sichtbar.match(/.{0,30}(?:verschiedener Anbieter|various providers).{0,30}/) || [""])[0]);
  const leitung = (html.match(/<section class="leitung" aria-labelledby="leitung">[\s\S]*?<\/section>/) || [""])[0];
  const ueberMich = SEITEN.find(a => a.id === "ueber-mich" && a.lang === s.lang).adresse;
  check(leitung.includes('<h2 id="leitung">') && leitung.includes(`src="${t.up}${PORTRAIT.datei}"`) && leitung.includes(`href="${t.up}${ueberMich}"`) && html.indexOf('id="werkzeuge"') < html.indexOf('id="leitung"') && html.indexOf('id="leitung"') < html.indexOf('id="formate"'), "Kasten „Wer den Workshop leitet“ mit Porträt und Verweis auf „Über mich“, vor den Formaten (Textprüfung 23.10.2026)");
  const schritte = (html.match(/<ol class="schritte">[\s\S]*?<\/ol>/) || [""])[0];
  check(html.includes(grundsaetze(s.lang)) && html.indexOf('id="zusammenarbeit"') < html.indexOf('class="grundsaetze"') && html.indexOf('class="grundsaetze"') < html.indexOf('id="teile"'), "Grundsätze als ruhiger Block nach „Wie wir zusammenarbeiten“ (Robin, 04.11.2026)");
  check((schritte.match(/<li>/g) || []).length === 3 && (s.lang === "en" ? ["Analyse", "Train", "Develop"] : ["Analysieren", "Schulen", "Weiterentwickeln"]).every((w, i) => schritte.includes(`<span class="nr">0${i + 1}</span><strong>${w}</strong>`)) && /unverbindliches Gespräch|no-obligation call/.test(schritte) && html.indexOf('id="zusammenarbeit"') < html.indexOf('id="teile"'), "Drei Schritte der Zusammenarbeit vor den drei Teilen, Einstieg mit unverbindlichem Gespräch (Robin, 18.10.2026)");
  const werkzeuge = (html.match(/<h2 id="werkzeuge">[\s\S]*?(?=<section class="leitung"|<h2 id="formate">)/) || [""])[0];
  check(!/Partnerangebot|partner offer|Advertisement|eigene Produkte|own products/i.test(werkzeuge) && /SmartFormular FiBu lite/.test(werkzeuge) && (PARTNER.length ? (werkzeuge.match(/rel="sponsored noopener"/g) || []).length === PARTNER.length && (werkzeuge.match(/<p class="kennzeichnung"><a href="[^"]*#anzeigen">/g) || []).length === PARTNER.length : /stelle ich hier vor|present further tools here/.test(werkzeuge)), "Werkzeuge im Workshop: verschiedene Anbieter ohne Unterscheidung und ohne Kennzeichnung, Partnerverweise mit rel=sponsored (Robin, 18.10.2026)");
  check(PARTNER.every(p => p.id && p.name && p.anbieter && /^https:\/\//.test(p.url) && ["gebuehr", "provision", "beides"].includes(p.verguetung) && p.text && p.text.de), "Partnerliste vollständig (Name, Anbieter, https-Adresse, Vergütungsart, Text)");
  check(html.includes('id="newsletter"') && /data-newsletter-endpoint="https:\/\/goch\.robin\.vision\/newsletter"/.test(html), "Newsletter-Kasten");
  const andere = WORKSHOPS.find(a => a.lang !== s.lang);
  check(html.includes(`<a href="${t.up}${andere.adresse}" lang="${andere.lang}" hreflang="${andere.lang}">`), "Verweis auf die andere Sprachfassung");
}

console.log("\nStartseite, Sitemap, Goch");
const start = lesen("index.html");
check((start.match(/<a href="workshops\/" data-href-de="workshops\/" data-href-en="workshops\/en\/" data-i18n="navWorkshops">Workshops<\/a><a href="ueber-mich\/"/g) || []).length === 2, "Startseite: Menüpunkt „Workshops“ in beiden Navigationen vor „Über mich“");
check(start.includes('<section class="blog-teaser workshops" id="workshops" aria-labelledby="workshops-title">') && start.indexOf('id="workshops"') > start.indexOf('id="werkzeuge"') && start.indexOf('id="workshops"') < start.indexOf('id="ueber-mich"'), "Startseite: Abschnitt zwischen SmartFormularen und Über mich");
check(/data-i18n="workshopsMore">Mehr zum Workshop<\/a>/.test(start) && /data-i18n="workshopsLead">[^<]*mit Unterweisung nach EU AI Act/.test(start)
  && /href="workshops\/#anfrage" data-href-de="workshops\/#anfrage" data-href-en="workshops\/en\/#anfrage" data-i18n="workshopsAnfrage">Workshop anfragen<\/a>/.test(start)
  && /data-i18n="workshopsTeil3">[^<]*als Nachweis Ihrer Maßnahme nach Art\. 4 KI-Verordnung/.test(start) && /data-i18n="workshopsLeitung">Ich leite die Workshops selbst/.test(start),
  "Startseite (Option B): Unterweisung nach EU AI Act, drei Teile, Leitung, „Workshop anfragen“ und „Mehr zum Workshop“");
const lang = lesen("language.js");
check((lang.match(/workshopsTitle: 'Workshops'/g) || []).length === 2 && /workshopsLead: '[^']*with EU AI Act training/.test(lang) && /workshopsMore: 'More about the workshop'/.test(lang) && /workshopsAnfrage: 'Enquire about a workshop'/.test(lang), "language.js: Titel, Text und Verweis in beiden Sprachen");
const sitemap = lesen("sitemap.xml");
check(WORKSHOPS.every(s => sitemap.includes(`<loc>${workshopsUrl(s.lang)}</loc>`)), "sitemap.xml nennt beide Fassungen");
const links = lesen("worker/links.md");
check(/^\| workshops \|.*https:\/\/robin\.vision\/workshops\/ https:\/\/robin\.vision\/workshops\/en\/ \|$/m.test(links), "Gochs Linkliste kennt die Seite");
const profil = lesen("worker/profile.md");
check(/\*\*Workshops\*\* – im Menü „Workshops“ \(Link „workshops“\)/.test(profil) && /„workshops“ im Feld "link"/.test(profil), "Goch kennt den Bereich Workshops und den Link");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nSeite „Workshops“ in Ordnung.");
process.exit(fails ? 1 : 0);
