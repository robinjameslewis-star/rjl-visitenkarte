// Seite „SmartFormular“ (worker/src/smartformular.js; Robin, 17.10.2026): beide Sprachfassungen entstehen genau aus dem Modul und den
// Feldern der Werkzeugseiten, tragen Wortmarke, Abzeichen, drei Produktkacheln, FiBu lite mit Download und Fassung, die geplanten
// Funktionen von FiBu und Deklaration, Mensch und Maschine, Sprachmodell, Fahrplan, Daten und Recht, acht Fragen (FAQPage,
// SoftwareApplication), die Beta-Anfrage an Gochs Kontakt-Endpunkt und den Kopf mit aktivem Menüpunkt; keine Preise. Kein Netz.
//   node tests/smartformular_seite_test.mjs
import { readFileSync } from "node:fs";
import { WERKZEUGE, werkzeugPfad, werkzeugFelder, UEBERSICHT_PFAD } from "../worker/src/werkzeug.js";
import { smartformularSeite, smartformularUrl, KONTAKT_ENDPUNKT } from "../worker/src/smartformular.js";
import { PRODUKTE } from "../worker/src/produkte.js";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");

const PRIVAT = /0151|684660|gmail|googlemail|Höchststr|1988|Hechingen/i;
const UEBERTRIEBEN = /revolution|einzigartig|unique|best in class|!/i;
const DU = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i;
const felder = Object.fromEntries(WERKZEUGE.map(w => [w.id, werkzeugFelder(lesen(werkzeugPfad(w.id)))]));
const T = {
  de: { up: "../", nav: /<a href="\.\.\/werkzeuge\/" aria-current="page">SmartFormular<\/a>/, home: "../", abzeichen: "Formulare, die mitarbeiten", titel: "SmartFormular: Buchhaltung und Jahresabschluss", kasten: "Mensch und Maschine", knopf: "FiBu lite kostenlos herunterladen" },
  en: { up: "../../", nav: /<a href="\.\.\/\.\.\/werkzeuge\/en\/" aria-current="page">SmartFormular<\/a>/, home: "../../?lang=en", abzeichen: "Forms that work with you", titel: "SmartFormular: bookkeeping and year-end accounts", kasten: "People and machine", knopf: "Download FiBu lite for free" },
};
for (const lang of ["de", "en"]) {
  const t = T[lang], pfad = UEBERSICHT_PFAD[lang], html = lesen(pfad), P = PRODUKTE[lang];
  console.log(`\n${pfad}`);
  check(html === smartformularSeite(lang, felder), "Seite im Repository entsteht genau aus dem Modul und den Werkzeugfeldern");
  check(html.includes(`<html lang="${lang}">`) && html.includes(`<title>${t.titel}`) && html.includes('<h1 class="sf-wortmarke" aria-label="SmartFormular">Smart<span>Formular</span></h1>'), "Sprache, Titel mit Suchbegriffen, Wortmarke als Überschrift");
  check(html.includes(`<p class="abzeichen">${t.abzeichen}</p>`), "Abzeichen unter der Wortmarke");
  check(html.includes(`<link rel="canonical" href="${smartformularUrl(lang)}">`) && ["de", "en"].every(l => html.includes(`hreflang="${l}" href="${smartformularUrl(l)}"`)), "canonical und hreflang beider Fassungen");
  check(t.nav.test(html) && html.includes(`<a class="termin" href="${t.home}#kontakt">`), "Kopf: SmartFormular aktiv, Termin bleibt, Pfade zur Wurzel stimmen");
  check(P.every(p => html.includes(`id="${p.id}"`) && html.includes(`<h3>${p.name}</h3>`)) && (html.match(/<section class="sf-kachel/g) || []).length === 3 && (html.match(/class="sf-stand">/g) || []).length >= 3, "drei Produktkacheln mit Stand und Anker");
  const lite = WERKZEUGE.find(w => w.lang === lang), d = felder[lite.id].datei;
  check(html.includes(`<a class="knopf" href="${t.up}werkzeuge/${lite.id}/">${t.knopf}</a>`) && html.includes(`<a class="sf-knopf" href="${t.up}werkzeuge/${lite.id}/">`) && html.includes(`${d.fassung}`), "FiBu lite: Knopf zum Werkzeug oben und im Abschnitt, Fassung aus der Werkzeugseite");
  check((html.match(/<ol class="sf-liste">/g) || []).length === 4 && (html.match(/<span class="nr">0\d<\/span>/g) || []).length === 6 + 7 + 3 + 3, "Listen: sechs Punkte FiBu (mit Umsatzsteuer-Überschlag), sieben Punkte Deklaration, drei zu den Programmen, drei zum Sprachmodell");
  check(/<h2 id="deklaration">[^<]*<\/h2>\n<p class="untertitel">(Das Arbeitspapier, das mitdenkt und vorarbeitet\.|The working paper that thinks ahead and does the groundwork\.)<\/p>/.test(html), "Deklaration mit dem Claim „Das Arbeitspapier, das mitdenkt und vorarbeitet“");
  check(/<h2 id="programme">/.test(html) && /DATEV/.test(html.match(/<h2 id="programme">[\s\S]*?<h2 id="sprachmodell">/)[0]), "Abschnitt „Offen für jedes Buchhaltungsprogramm“ vor dem Sprachmodell");
  check(html.includes(`<h2 id="mensch">${t.kasten}</h2>`) && (html.match(/<ul class="fakten">/g) || []).length === 2, "Kasten „Mensch und Maschine“ und zwei Faktenleisten");
  check((html.match(/<ol class="ablauf">[\s\S]*?<\/ol>/) || [""])[0].split("<li>").length - 1 === 3 && !/2027|Q1|Stufe|stage/.test((html.match(/<ol class="ablauf">[\s\S]*?<\/ol>/) || [""])[0]), "„So geht es weiter“ in drei Schritten, ohne Termine");
  check(/DATEV eG/.test(html) && /Mandanten- oder Personendaten|client or personal data/.test(html) && !/UG \(haftungsbeschränkt\)|Bedrock|Azure|Ollama/.test(html), "Daten und Recht: Marke, Testdaten-Regel, ohne interne Planung und Anbieterlisten");
  const sichtbar = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  check(!/\d+(?:\.\d{3})? ?€|€ ?\d|\bEUR\b/.test(sichtbar), "keine Preise auf der Seite (auf Anfrage)", (sichtbar.match(/.{0,30}(?:\d ?€|€ ?\d|EUR).{0,30}/) || [""])[0]);
  check(!UEBERTRIEBEN.test(sichtbar), "keine Superlative, keine Ausrufezeichen", (sichtbar.match(UEBERTRIEBEN) || [""])[0]);
  check(!PRIVAT.test(html), "keine privaten Daten", (html.match(PRIVAT) || [""])[0]);
  if (lang === "de") check(!DU.test(sichtbar), "kein Du", (sichtbar.match(new RegExp(`.{0,30}${DU.source}.{0,30}`, "i")) || [""])[0]);
  check(!/Werkzeuge<\/a>|SmartFormulare\b/.test(sichtbar.replace(/SmartFormular-Produkte/g, "")), "Bezeichnung „SmartFormular“ im Singular, kein „Werkzeuge“-Menüpunkt mehr", (sichtbar.match(/.{0,30}SmartFormulare.{0,30}/) || [""])[0]);
  const form = (html.match(/<form class="beta" id="beta-anfrage" novalidate>[\s\S]*?<\/form>/) || [""])[0];
  check(form.includes('name="firma"') && form.includes('name="name" maxlength="80" required') && form.includes('name="email" maxlength="120" required') && form.includes('name="produkt"') && form.includes('name="website"') && form.includes('id="beta-status"'), "Beta-Anfrage mit Feldern, Falle und Statuszeile");
  check(html.includes(JSON.stringify(KONTAKT_ENDPUNKT)) && html.includes(`lang: ${JSON.stringify(lang)}`) && /t: geladen/.test(html), "Skript sendet an Gochs Kontakt-Endpunkt mit Sprache und Ladezeitpunkt");
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } });
  check(ld.length === 2 && ld.every(Boolean) && ld[0]["@type"] === "SoftwareApplication" && ld[0].isAccessibleForFree === true && ld[1]["@type"] === "FAQPage" && ld[1].mainEntity.length === 7, "JSON-LD: SoftwareApplication für FiBu lite und FAQPage mit sieben Fragen");
  check((html.match(/<div class="fragen">[\s\S]*?<\/div>/) || [""])[0].split("<h3>").length - 1 === 7, "sieben Fragen sichtbar");
  check(html.includes('id="downloads"') && html.includes('id="newsletter"') && /data-newsletter-endpoint="https:\/\/goch\.robin\.vision\/newsletter"/.test(html), "Downloads und Newsletter-Kasten");
  const andere = lang === "en" ? "de" : "en";
  check(html.includes(`<a href="${t.up}${UEBERSICHT_PFAD[andere].replace(/index\.html$/, "")}" lang="${andere}" hreflang="${andere}">`), "Verweis auf die andere Sprachfassung");
}

console.log("\nProduktdaten");
for (const lang of ["de", "en"]) {
  const P = PRODUKTE[lang];
  check(P.length === 3 && P.map(p => p.id).join() === "fibu-lite,fibu,deklaration" && P.every(p => p.name && p.text && p.kurz && ["fertig", "beta"].includes(p.stand)), `${lang}: drei Produkte mit Name, Text, Kurztext und Stand`);
  check(P[0].stand === "fertig" && P[0].href && P.slice(1).every(p => p.stand === "beta" && Array.isArray(p.punkte)) && P[1].punkte.length === 5 && P[2].punkte.length === 4, `${lang}: FiBu lite fertig mit Verweis, FiBu (fünf Punkte) und Deklaration (vier Punkte) als Beta`);
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nSeite „SmartFormular“ in Ordnung.");
process.exit(fails ? 1 : 0);
