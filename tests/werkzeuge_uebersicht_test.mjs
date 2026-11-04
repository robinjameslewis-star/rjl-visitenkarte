// Übersicht „Werkzeuge“ (worker/src/uebersicht.js) und Werkzeug-Slider der Startseite (worker/src/slider.js; Robin, 18.10.2026):
// gebaute Seiten entsprechen den Modulen; gleichrangige Karten, ohne Aufteilung nach Bereichen (Robin, 18.10.2026),
// Platzhalter, Vergleich, Workshops, Formular „Partner werden“ an Gochs Kontakt-Endpunkt, Weiterleitung
// alter Sprungmarken zur SmartFormular-Produktseite; Slider je Sprache; ein Probe-Partner erscheint wie alle anderen, nur der Verweis trägt rel="sponsored";
// nirgends eine Unterscheidung zwischen eigenen Produkten und Partnern (Robin, 18.10.2026). Jedes Werkzeug – Karte, Slider, Spalte im
// Vergleich – trägt dasselbe Kennzeichen „Anzeige · Anbieter“ mit Verweis auf die Erläuterung im Impressum (Robin, 18.10.2026, Option C);
// eigene kostenlose Werkzeuge (FiBu lite, E-Rechnung lite) tragen im Slider und im Vergleich „Kostenlos“ (Robin, 23.10.2026); der Platzhalter nichts. Vergleich mit acht Kriterien und Stand je Spalte (Recherche 18.10.2026, Option A).
// Kein Netz.
//   node tests/werkzeuge_uebersicht_test.mjs
import { readFileSync } from "node:fs";
import { UEBERSICHT_PFAD } from "../worker/src/werkzeug.js";
import { werkzeugeUebersicht, uebersichtUrl, ALTE_MARKEN, KONTAKT_ENDPUNKT } from "../worker/src/uebersicht.js";
import { slider, startSlider } from "../worker/src/slider.js";
import { PARTNER } from "../worker/src/partner.js";
import { grundsaetze, GRUNDSAETZE_CSS } from "../worker/src/grundsaetze.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");
const anzahl = (s, re) => (s.match(re) || []).length;

const T = {
  de: { titel: "Werkzeuge",
    platz: "Ihre Lösung auf robin.vision", knopf: "Partner werden",
    sf: '<a class="wz-knopf" href="../werkzeuge/smartformular/">', ziel: '"smartformular/"', nav: '<a href="../werkzeuge/" aria-current="page">Werkzeuge</a>',
    zeilen: ["Aufgabe", "Für wen", "Betrieb und Daten", "Sitz des Anbieters", "KI", "Schnittstellen", "Preis und Test", "Nachweise"], stand: "Stand",
    quelle: "Angaben der Anbieter, Stand je Spalte; Reihenfolge nach Aufnahme.", partnerSatz: "Partner zahlen für die Vorstellung.",
    anzeige: "Anzeige", erkl: "../#anzeigen" },
  en: { titel: "Tools",
    platz: "Your solution on robin.vision", knopf: "Become a partner",
    sf: '<a class="wz-knopf" href="../../werkzeuge/smartformular/en/">', ziel: '"../smartformular/en/"', nav: '<a href="../../werkzeuge/en/" aria-current="page">Tools</a>',
    zeilen: ["Task", "For whom", "Operation and data", "Provider based in", "AI", "Interfaces", "Price and trial", "Assurance"], stand: "As of",
    quelle: "Details supplied by the providers, dated per column; listed in the order they joined.", partnerSatz: "Partners pay to be presented.",
    anzeige: "Ad", erkl: "../../?lang=en#anzeigen" },
};

const kennz = (t, klasse, anbieter, href = t.erkl) => `<p class="${klasse}"><a href="${href}">${t.anzeige}</a> · <span>${anbieter}</span></p>`;
const thKennz = (t, anbieter) => `<span class="wz-th-kennz"><a href="${t.erkl}">${t.anzeige}</a> · <span>${anbieter}</span></span>`;

for (const [lang, pfad] of Object.entries(UEBERSICHT_PFAD)) {
  const t = T[lang], html = lesen(pfad);
  console.log(`\n${pfad}`);
  check(html === werkzeugeUebersicht(lang), "Seite im Repository entsteht genau aus dem Modul");
  check(html.includes(`<html lang="${lang}">`) && html.includes(`<h1>${t.titel}</h1>`) && html.includes(`<link rel="canonical" href="${uebersichtUrl(lang)}">`), "Sprache, Überschrift, canonical");
  check(html.includes(t.nav), "Kopf: Menüpunkt Werkzeuge aktiv");
  check(!html.includes('class="abzeichen"') && html.indexOf("<h1>") < html.indexOf('class="untertitel"') && html.indexOf('<article class="wz">\n<h1>') > 0, "Seite beginnt mit der Überschrift, ohne Abzeichen (Robin, 18.10.2026)");
  check(!html.includes("wz-rolle") && !/<strong>(Analysieren|Analyse)<\/strong>/.test(html), "keine drei Schritte auf der Übersicht – sie stehen bei den Workshops (Robin, 18.10.2026)");
  check(!html.includes('class="wz-filter"') && !html.includes("data-bereich") && !html.includes('wz-frei"'), "keine Aufteilung nach Bereichen: kein Filter, keine freien Plätze je Bereich (Robin, 18.10.2026)");
  check(!/Unternehmensführung|management/i.test(html.replace(/<footer[\s\S]*<\/footer>/, "")), "kein Bereich „Unternehmensführung“ mehr");
  const raster = html.match(/<div class="wz-raster">[\s\S]*?<\/div>\n<(?:h2|section)/)?.[0] || "";
  const reihe = html.match(/<div class="wz-reihe" tabindex="0" role="region"[\s\S]*?<\/div>\n<p class="frei wz-mehr">/)?.[0] || "";
  check((reihe.match(/<article class="wz-karte">/g) || []).length === 4 && reihe.includes(`${kennz(t, "wz-kennz", "robin.vision")}\n<span class="wz-logo wz-logo-sf"`) && (reihe.match(/wz-logo-sf/g) || []).length === 4, "SmartFormular als wischbare Reihe: vier Produkte, Kennzeichen wie im Slider (Robin, 03.11.2026)");
  check(html.indexOf('id="ueberblick"') < html.indexOf('class="wz-reihe"') && html.indexOf('class="wz-reihe"') < html.indexOf('id="partner-anzeigen"') && html.indexOf('id="partner-anzeigen"') < html.indexOf('class="wz-raster"'), "erst SmartFormular, dann die Partner (Robin, 03.11.2026)");
  check(!/Partnerangebot|Partner offer|Advertisement|Eigene Produkte|Own products|eigene Produkte|own products|Partnerlösungen|partner solutions/.test(html.replace(/<footer[\s\S]*<\/footer>/, "")), "keine Unterscheidung zwischen eigenen Produkten und Partnern (Robin, 18.10.2026)");
  check(!(raster.match(/<article class="wz-karte wz-platzhalter">[\s\S]*?<\/article>/)?.[0] || "wz-kennz").includes("wz-kennz"), "Platzhalter ohne Kennzeichen");
  check(!/Produkt von robin\.vision|product by robin\.vision/i.test(html), "nirgends „Produkt von robin.vision“ (Robin, 18.10.2026)");
  check(raster.includes('class="wz-karte wz-platzhalter"') && raster.includes(`<h3>${t.platz}</h3>`) && raster.includes('href="#partner"'), "Partnerkarte „Ihre Lösung auf robin.vision“ mit Weg zum Formular");
  check((raster.match(/<article class="wz-karte/g) || []).length === 1, "ohne Partner nur der Platzhalter");
  check(!/rel="sponsored/.test(raster), "ohne Partner kein Verweis mit rel=sponsored");
  const tabelle = html.match(/<table class="wz-tabelle">[\s\S]*?<\/table>/)?.[0] || "";
  const zeilen = [...tabelle.matchAll(/<tr><th scope="row">([^<]*)<\/th>/g)].map(m => m[1].replace(/\u00AD/g, ""));
  check(anzahl(tabelle, /<th scope="col"/g) === 6 && zeilen.join("|") === t.zeilen.join("|") && !/>(Bereich|Area|Programme|Software|Status|Einführung und Schulung|Implementation and training)</.test(tabelle) && /Komplettlösung aus einer Hand|all-in-one suites/.test(tabelle) && tabelle.includes('class="wz-frei-spalte"') && anzahl(tabelle, /href="#partner"/g) === 1, "Vergleich: vier Werkzeuge (E-Rechnung lite seit 23.10.2026), „Ihr Produkt“, acht Kriterien nach der Recherche vom 18.10.2026, Weg zum Formular");
  check(anzahl(tabelle, /<td><\/td>/g) === 0 && anzahl(tabelle, /<span class="wz-th-stand">/g) === 4 && tabelle.includes(`<span class="wz-th-stand">${t.stand} 10/2026</span>`), "jede SmartFormular-Zelle gefüllt, Stand der Angaben im Kopf je Spalte");
  check(anzahl(tabelle, new RegExp(thKennz(t, "robin.vision").replace(/[.?*+^$[\]\\(){}|]/g, "\\$&"), "g")) === 2 && anzahl(tabelle, new RegExp(`<span class="wz-th-kennz">${lang === "en" ? "Free trial until 31 Dec 2026" : "Kostenlos testen bis 31.12.2026"}</span>`, "g")) === 2 && anzahl(tabelle, /class="wz-th-kennz"/g) === 4 && !/wz-frei-spalte"><span class="wz-th-kennz/.test(tabelle), "Vergleich: FiBu und Deklaration mit „Anzeige · robin.vision“, FiBu lite und E-Rechnung lite mit „Kostenlos“, die Spalte „Ihr Produkt“ ohne");
  check(!/Testsieger|empfohlen|recommended|★|\b[1-5],[0-9] \/ 5\b/.test(tabelle), "keine Noten, Sterne oder Empfehlungen im Vergleich (§ 6 UWG)");
  const quelle = html.match(/<\/table>\n<\/div>\n<p class="meta wz-quelle">([^<]*)<\/p>/)?.[1] || "";
  check(quelle === t.quelle, "unter dem Vergleich: Herkunft der Angaben und Reihenfolge, ohne Partner kein Satz zur Bezahlung");
  check(html.indexOf('id="ueberblick"') < html.indexOf('id="vergleich"') && html.indexOf('id="vergleich"') < html.indexOf('id="workshops-hinweis"') && html.indexOf('id="workshops-hinweis"') < html.indexOf('id="partner"'), "Reihenfolge: Überblick, Vergleich, Workshops, Partner werden");
  const form = html.match(/<form class="wz-form wz-kasten" id="partner-anfrage"[\s\S]*?<\/form>/)?.[0] || "";
  check(["firma", "name", "email", "produkt", "nachricht", "website"].every(n => form.includes(`name="${n}"`)) && !form.includes('name="bereich"') && form.includes('tabindex="-1"') && form.includes('role="status"'), "Formular „Partner werden“: Felder, Falle, Statuszeile");
  check(['<select id="p-fuer" name="fuer"><option value="">', '<select id="p-standort" name="standort"><option value="">'].every(x => form.includes(x)) && !/<select[^>]*required/.test(form) && anzahl(form, /<option>/g) === 9 && html.includes("d.fuer ? T.fuer") && html.includes("d.standort ? T.standort"), "Formular: zwei freiwillige Auswahlfelder (Für wen, Datenstandort), in der Nachricht an Robin");
  check(html.includes(`<h2 id="partner">${t.knopf}</h2>`) && html.includes(JSON.stringify(KONTAKT_ENDPUNKT)) && html.includes("'content-type': 'application/json'"), "Formular sendet an Gochs Kontakt-Endpunkt");
  check(html.includes(JSON.stringify(ALTE_MARKEN)) && html.includes(`location.replace(${t.ziel}`) && ["fibu", "deklaration", "beta"].every(m => ALTE_MARKEN.includes(m)), "alte Sprungmarken (#fibu, #deklaration, #beta …) leiten zur Produktseite");
  check(html.includes('id="newsletter"') && !/etwa von FiBu lite|such as FiBu lite|Beta-Start von FiBu|beta start of FiBu/.test(html), "Newsletter-Kasten ohne FiBu lite und Beta-Start (Robin, 18.10.2026)");
  check(!/kleines Werkzeug|Schmerzpunkt|small tool|pain point/i.test(html) && /Hemmschwellen beim Umgang mit KI und neuer Software|hesitation about AI and new software/.test(html), "Workshop-Kasten: Hemmschwellen statt selbst gebautem Werkzeug (Robin, 18.10.2026)");
}

console.log("\nProbe-Partner");
const probeVergleich = { stand: "01/2027", aufgabe: "Probe-Aufgabe", fuer: "Probe", daten: "Probe", sitz: "Probe", ki: "Probe", schnittstellen: "Probe", preis: "Probe", nachweise: "Probe" };
PARTNER.push({ id: "probe", name: "Probe-Werkzeug", anbieter: "Probe GmbH", url: "https://example.org/",
  vergleich: { de: probeVergleich, en: probeVergleich },
  text: { de: "Ein Satz zum Werkzeug.", en: "One sentence on the tool." } });
try {
  for (const lang of ["de", "en"]) {
    const t = T[lang], html = werkzeugeUebersicht(lang), s = slider(lang);
    const karte = (html.match(/<article class="wz-karte">[\s\S]*?<\/article>/g) || []).find(k => k.includes("Probe-Werkzeug")) || "";
    check(karte.includes("<h3>Probe-Werkzeug</h3>") && karte.startsWith(`<article class="wz-karte">\n${kennz(t, "wz-kennz", "Probe GmbH")}`) && karte.includes('href="https://example.org/" rel="sponsored noopener" target="_blank"'), `${lang}: Partnerkarte wie alle anderen – gleiches Kennzeichen mit dem Anbieter, Verweis mit rel="sponsored"`);
    check(s.includes("<h3>Probe-Werkzeug</h3>") && s.includes(kennz(t, "wzs-kennz", "Probe GmbH", "#anzeigen")) && s.includes('href="https://example.org/" rel="sponsored noopener" target="_blank"') && !s.includes(t.platz) && !/wzs-bereich">Partner</.test((s.match(/<article class="wzs-karte">(?:(?!<\/article>)[\s\S])*?Probe-Werkzeug[\s\S]*?<\/article>/) || ["wzs-bereich\">Partner<"])[0]), `${lang}: Slider zeigt den Partner, ohne Anbieterkarte, mit Kennzeichen, ohne Bereich „Partner“`);
    const tabelle = html.match(/<table class="wz-tabelle">[\s\S]*?<\/table>/)?.[0] || "";
    check(anzahl(tabelle, /<th scope="col"/g) === 7 && tabelle.includes(`Probe-Werkzeug<span class="wz-th-stand">${t.stand} 01/2027</span>`) && tabelle.indexOf("Probe-Werkzeug") < tabelle.indexOf('class="wz-frei-spalte"') && tabelle.includes('<td><a href="https://example.org/" rel="sponsored noopener" target="_blank">'), `${lang}: Partner als Spalte nach den SmartFormular-Produkten, mit Stand, Verweis mit rel="sponsored"`);
    check(tabelle.includes(`${thKennz(t, "Probe GmbH")}Probe-Werkzeug`) && html.includes(`<p class="meta wz-quelle">${t.quelle}</p>`) && !html.includes(t.partnerSatz), `${lang}: Partnerspalte mit demselben Kennzeichen; kein eigener Satz über Partner unter dem Vergleich`);
  }
} finally { PARTNER.pop(); }

console.log("\nStartseite");
const start = lesen("index.html");
const liste = start.match(/<!-- werkzeuge:liste -->\n([\s\S]*?)\n\s*<!-- \/werkzeuge:liste -->/)?.[1];
check(liste === startSlider(), "Slider auf der Startseite entspricht dem Modul");
for (const lang of ["de", "en"]) {
  const s = slider(lang), t = T[lang];
  check(s.startsWith(`    <div class="wzs" data-langs="${lang}"${lang === "de" ? "" : " hidden"}`), `${lang}: eigener Slider, über data-langs geschaltet`);
  check(anzahl(s, /<article class="wzs-karte/g) === 4 && anzahl(s, /<i( class="an")?><\/i>/g) === 4 && anzahl(s, /class="wzs-pfeil"/g) === 2, `${lang}: vier Karten, vier Punkte, zwei Pfeile – die Anbieterkarte steht seit Option B weiter unten`);
  check(anzahl(s, new RegExp(kennz(t, "wzs-kennz", "robin.vision", "#anzeigen").replace(/[.?*+^$[\]\\(){}|]/g, "\\$&"), "g")) === 2 && anzahl(s, new RegExp(`<p class="wzs-kennz">${lang === "en" ? "Free trial until 31 Dec 2026" : "Kostenlos testen bis 31.12.2026"}</p>`, "g")) === 2 && anzahl(s, /wzs-kennz/g) === 4 && !/Produkt von robin\.vision|product by robin\.vision|Partnerangebot|Partner offer/i.test(s) && !s.includes(t.platz) && !s.includes("wzs-platzhalter") && !s.includes("#partner"), `${lang}: vier SmartFormular-Produkte – zwei mit „Kostenlos“, zwei mit „Anzeige · robin.vision“ –, keine Anbieterkarte im Slider`);
  const sf = lang === "en" ? "werkzeuge/smartformular/en/" : "werkzeuge/smartformular/";
  check(s.includes(`href="${sf}#fibu"`) && s.includes(`href="${sf}#abschluss"`), `${lang}: FiBu und Abschluss führen zur Produktseite`);
}
check(start.includes('<p id="anzeigen" data-i18n="legalAds">Anzeigen: Werkzeuge mit dem Kennzeichen „Anzeige“') && /legalAds: 'Advertising: tools marked “Ad”/.test(lesen("language.js")) && /Gebühr oder Provision/.test(start) && /beteiligt ist/.test(start) && start.includes("location.hash === '#anzeigen'") && start.includes("impressum.open = true"), "Impressum: Erläuterung „Anzeigen“ (DE/EN) mit Sprungmarke #anzeigen, die das Impressum aufklappt");
check(start.includes("document.querySelectorAll('.wzs')") && /\.wzs\[hidden\] \{ display: none; \}/.test(start) && /\.wzs-spur \{[^}]*scroll-snap-type: x mandatory/.test(start), "Slider: Stile mit scroll-snap, kleines Skript für Pfeile und Punkte");
check(start.includes('href="werkzeuge/" data-i18n="toolsAll"') || /data-i18n="toolsAll"/.test(start), "Startseite: Verweis auf die Übersicht mit Vergleich");
check(/Rechnungswesen, Verwaltung und andere Geschäftsprozesse/.test(start) && /accounting, administration and other business processes/.test(lesen("language.js")), "Startseite und Sprachdatei: andere Geschäftsprozesse");
check(![start, lesen("language.js"), lesen("werkzeuge/index.html"), lesen("werkzeuge/en/index.html"), lesen("worker/profile.md"), lesen("worker/links.md")].some(h => /Business[- ]IT/i.test(h)), "nirgends mehr „Business-IT“ (Robin, 18.10.2026)");
check([start, lesen("language.js"), lesen("werkzeuge/index.html")].every(h => h.includes("vorgestellt und verglichen auf robin.vision") && !/Abläufe analysieren, Teams schulen|eingeführt und geschult/.test(h)) && /presented and compared on robin\.vision/.test(lesen("werkzeuge/en/index.html") + lesen("language.js")) && !/analyse your processes, train your team|selected, implemented/.test(lesen("language.js") + lesen("werkzeuge/en/index.html")), "Werkzeuge neutral: „vorgestellt und verglichen auf robin.vision“, robin.vision nicht als Zwischenstation (Robin, 18.10.2026)");

console.log("\nGrundsätze (Robin, 19.10.2026)");
const startHtml = lesen("index.html");
check(!startHtml.includes("grundsaetze") && !startHtml.includes("gs-karte"), "Startseite ohne Grundsätze (Robin, 03.11.2026)");
check(/<section class="blog-teaser anbieter" id="anbieter"/.test(startHtml) && /data-i18n="anbieterText">[^<]*robin.vision vor\.</.test(startHtml) && /href="werkzeuge\/#partner" data-href-de="werkzeuge\/#partner" data-href-en="werkzeuge\/en\/#partner" data-i18n="anbieterKnopf">Partner werden</.test(startHtml), "Startseite: Hinweis für Anbieter mit „Partner werden“ (Option B)");
for (const [lang, pfad] of Object.entries(UEBERSICHT_PFAD)) {
  const html = lesen(pfad);
  check(html.includes(grundsaetze(lang)) && html.includes(GRUNDSAETZE_CSS) && html.indexOf('class="grundsaetze"') < html.indexOf('id="vergleich"') && html.indexOf('id="partner-anzeigen"') < html.indexOf('class="grundsaetze"') && (lang === "en" || html.includes("Klardaten nur in Werkzeuge")) && !html.includes("gs-karte"), `${lang}: zwei Grundsätze als ruhiger Block vor dem Vergleich, mit „Klardaten“ (Robin, 04.11.2026)`);
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nAlles in Ordnung");
process.exit(fails ? 1 : 0);
