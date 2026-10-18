// Übersicht „Werkzeuge“ (worker/src/uebersicht.js) und Werkzeug-Slider der Startseite (worker/src/slider.js; Robin, 18.10.2026):
// gebaute Seiten entsprechen den Modulen; gleichrangige Karten mit Kennzeichnung, ohne Aufteilung nach Bereichen (Robin, 18.10.2026),
// Platzhalter, Vergleich, Workshops, Formular „Partner werden“ an Gochs Kontakt-Endpunkt, Weiterleitung
// alter Sprungmarken zur SmartFormular-Produktseite; Slider je Sprache; ein Probe-Partner erscheint wie alle anderen, nur der Verweis trägt rel="sponsored";
// nirgends eine Unterscheidung zwischen eigenen Produkten und Partnern (Robin, 18.10.2026).
// Kein Netz.
//   node tests/werkzeuge_uebersicht_test.mjs
import { readFileSync } from "node:fs";
import { UEBERSICHT_PFAD } from "../worker/src/werkzeug.js";
import { werkzeugeUebersicht, uebersichtUrl, ALTE_MARKEN, KONTAKT_ENDPUNKT } from "../worker/src/uebersicht.js";
import { slider, startSlider } from "../worker/src/slider.js";
import { PARTNER } from "../worker/src/partner.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");
const anzahl = (s, re) => (s.match(re) || []).length;

const T = {
  de: { titel: "Effiziente Werkzeuge für Rechnungswesen, Verwaltung und weitere Geschäftsprozesse",
    platz: "Hier könnte Ihr Produkt stehen", knopf: "Partner werden",
    sf: '<a class="wz-knopf" href="../werkzeuge/smartformular/">', ziel: '"smartformular/"', nav: '<a href="../werkzeuge/" aria-current="page">Werkzeuge</a>' },
  en: { titel: "Efficient tools for accounting, administration and other business processes",
    platz: "Your product could be here", knopf: "Become a partner",
    sf: '<a class="wz-knopf" href="../../werkzeuge/smartformular/en/">', ziel: '"../smartformular/en/"', nav: '<a href="../../werkzeuge/en/" aria-current="page">Tools</a>' },
};

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
  const raster = html.match(/<div class="wz-raster">[\s\S]*?<\/div>\n<h2/)?.[0] || "";
  check(raster.includes('<article class="wz-karte">\n<span class="wz-logo wz-logo-sf"') && raster.includes(t.sf), "Karte SmartFormular: ohne Kennzeichnung, Knopf zur Produktseite");
  check(!/wz-kennz|Partnerangebot|Partner offer|Anzeige|Advertisement|Eigene Produkte|Own products|eigene Produkte|own products|Partnerlösungen|partner solutions/.test(html.replace(/<footer[\s\S]*<\/footer>/, "")), "keine Unterscheidung zwischen eigenen Produkten und Partnern, keine Kennzeichnung (Robin, 18.10.2026)");
  check(!/Produkt von robin\.vision|product by robin\.vision/i.test(html), "nirgends „Produkt von robin.vision“ (Robin, 18.10.2026)");
  check(raster.includes('class="wz-karte wz-platzhalter"') && raster.includes(`<h3>${t.platz}</h3>`) && raster.includes('href="#partner"'), "Platzhalter „Hier könnte Ihr Produkt stehen“ mit Weg zum Formular");
  check((raster.match(/<article class="wz-karte/g) || []).length === 2, "zwei Karten: SmartFormular und der Platzhalter");
  check(!/rel="sponsored/.test(raster), "ohne Partner kein Verweis mit rel=sponsored");
  const tabelle = html.match(/<table class="wz-tabelle">[\s\S]*?<\/table>/)?.[0] || "";
  check(anzahl(tabelle, /<th scope="col"/g) === 5 && anzahl(tabelle, /<tr><th scope="row">/g) === 4 && !/>(Bereich|Area|Programme|Software|Stand|Status|Einführung und Schulung|Implementation and training)</.test(tabelle) && /Komplettlösung aus einer Hand|all-in-one suites/.test(tabelle) && tabelle.includes('class="wz-frei-spalte"') && anzahl(tabelle, /href="#partner"/g) === 1, "Vergleich: drei Werkzeuge, „Ihr Produkt“, vier Kriterien (Aufgabe, Für wen, Daten, Sprachmodell), Weg zum Formular");
  check(html.indexOf('id="ueberblick"') < html.indexOf('id="vergleich"') && html.indexOf('id="vergleich"') < html.indexOf('id="workshops-hinweis"') && html.indexOf('id="workshops-hinweis"') < html.indexOf('id="partner"'), "Reihenfolge: Überblick, Vergleich, Workshops, Partner werden");
  const form = html.match(/<form class="wz-form wz-kasten" id="partner-anfrage"[\s\S]*?<\/form>/)?.[0] || "";
  check(["firma", "name", "email", "produkt", "nachricht", "website"].every(n => form.includes(`name="${n}"`)) && !form.includes('name="bereich"') && form.includes('tabindex="-1"') && form.includes('role="status"'), "Formular „Partner werden“: Felder, Falle, Statuszeile");
  check(html.includes(`<h2 id="partner">${t.knopf}</h2>`) && html.includes(JSON.stringify(KONTAKT_ENDPUNKT)) && html.includes("'content-type': 'application/json'"), "Formular sendet an Gochs Kontakt-Endpunkt");
  check(html.includes(JSON.stringify(ALTE_MARKEN)) && html.includes(`location.replace(${t.ziel}`) && ["fibu", "deklaration", "beta"].every(m => ALTE_MARKEN.includes(m)), "alte Sprungmarken (#fibu, #deklaration, #beta …) leiten zur Produktseite");
  check(html.includes('id="newsletter"'), "Newsletter-Kasten");
}

console.log("\nProbe-Partner");
PARTNER.push({ id: "probe", name: "Probe-Werkzeug", anbieter: "Probe GmbH", url: "https://example.org/",
  text: { de: "Ein Satz zum Werkzeug.", en: "One sentence on the tool." } });
try {
  for (const lang of ["de", "en"]) {
    const t = T[lang], html = werkzeugeUebersicht(lang), s = slider(lang);
    const karte = (html.match(/<article class="wz-karte">[\s\S]*?<\/article>/g) || []).find(k => k.includes("Probe-Werkzeug")) || "";
    check(karte.includes("<h3>Probe-Werkzeug</h3>") && !karte.includes("wz-kennz") && karte.includes('href="https://example.org/" rel="sponsored noopener" target="_blank"'), `${lang}: Partnerkarte wie alle anderen, nur der Verweis mit rel="sponsored"`);
    check(s.includes("<h3>Probe-Werkzeug</h3>") && s.includes('href="https://example.org/" rel="sponsored noopener" target="_blank"') && s.indexOf("Probe-Werkzeug") < s.indexOf(t.platz), `${lang}: Slider zeigt den Partner vor dem Platzhalter`);
  }
} finally { PARTNER.pop(); }

console.log("\nStartseite");
const start = lesen("index.html");
const liste = start.match(/<!-- werkzeuge:liste -->\n([\s\S]*?)\n\s*<!-- \/werkzeuge:liste -->/)?.[1];
check(liste === startSlider(), "Slider auf der Startseite entspricht dem Modul");
for (const lang of ["de", "en"]) {
  const s = slider(lang), t = T[lang];
  check(s.startsWith(`    <div class="wzs" data-langs="${lang}"${lang === "de" ? "" : " hidden"}`), `${lang}: eigener Slider, über data-langs geschaltet`);
  check(anzahl(s, /<article class="wzs-karte/g) === 4 && anzahl(s, /<i( class="an")?><\/i>/g) === 4 && anzahl(s, /class="wzs-pfeil"/g) === 2, `${lang}: vier Karten, vier Punkte, zwei Pfeile`);
  check(!s.includes("wzs-kennz") && !/Produkt von robin\.vision|product by robin\.vision|Partnerangebot|Partner offer|Anzeige|Advertisement/i.test(s) && s.includes(`<h3>${t.platz}</h3>`) && s.includes(`href="werkzeuge/${lang === "en" ? "en/" : ""}#partner"`), `${lang}: drei SmartFormular-Produkte und Platzhalter ohne Kennzeichnung, Platzhalter führt zu „Partner werden“`);
  const sf = lang === "en" ? "werkzeuge/smartformular/en/" : "werkzeuge/smartformular/";
  check(s.includes(`href="${sf}#fibu"`) && s.includes(`href="${sf}#deklaration"`), `${lang}: FiBu und Deklaration führen zur Produktseite`);
}
check(start.includes("document.querySelectorAll('.wzs')") && /\.wzs\[hidden\] \{ display: none; \}/.test(start) && /\.wzs-spur \{[^}]*scroll-snap-type: x mandatory/.test(start), "Slider: Stile mit scroll-snap, kleines Skript für Pfeile und Punkte");
check(start.includes('href="werkzeuge/" data-i18n="toolsAll"') || /data-i18n="toolsAll"/.test(start), "Startseite: Verweis auf die Übersicht mit Vergleich");
check(/Rechnungswesen, Verwaltung und weitere Geschäftsprozesse/.test(start) && /accounting, administration and other business processes/.test(lesen("language.js")), "Startseite und Sprachdatei: weitere Geschäftsprozesse");
check(![start, lesen("language.js"), lesen("werkzeuge/index.html"), lesen("werkzeuge/en/index.html"), lesen("worker/profile.md"), lesen("worker/links.md")].some(h => /Business[- ]IT/i.test(h)), "nirgends mehr „Business-IT“ (Robin, 18.10.2026)");
check([start, lesen("language.js"), lesen("werkzeuge/index.html")].every(h => h.includes("vorgestellt und verglichen auf robin.vision") && !/Abläufe analysieren, Teams schulen|eingeführt und geschult/.test(h)) && /presented and compared on robin\.vision/.test(lesen("werkzeuge/en/index.html") + lesen("language.js")) && !/analyse your processes, train your team|selected, implemented/.test(lesen("language.js") + lesen("werkzeuge/en/index.html")), "Werkzeuge neutral: „vorgestellt und verglichen auf robin.vision“, robin.vision nicht als Zwischenstation (Robin, 18.10.2026)");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nAlles in Ordnung");
process.exit(fails ? 1 : 0);
