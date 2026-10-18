// Übersicht „Werkzeuge“ (worker/src/uebersicht.js) und Werkzeug-Slider der Startseite (worker/src/slider.js; Robin, 18.10.2026):
// gebaute Seiten entsprechen den Modulen; gleichrangige Karten mit Kennzeichnung, Filter nach Bereichen (Rechnungswesen, Verwaltung,
// Business-IT), Platzhalter und freie Plätze, Vergleich, Workshops, Formular „Partner werden“ an Gochs Kontakt-Endpunkt, Weiterleitung
// alter Sprungmarken zur SmartFormular-Produktseite; Slider je Sprache; ein Probe-Partner erscheint als Anzeige mit rel="sponsored".
// Kein Netz.
//   node tests/werkzeuge_uebersicht_test.mjs
import { readFileSync } from "node:fs";
import { UEBERSICHT_PFAD } from "../worker/src/werkzeug.js";
import { werkzeugeUebersicht, uebersichtUrl, BEREICHE, ALTE_MARKEN, KONTAKT_ENDPUNKT } from "../worker/src/uebersicht.js";
import { slider, startSlider } from "../worker/src/slider.js";
import { PARTNER } from "../worker/src/partner.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");
const anzahl = (s, re) => (s.match(re) || []).length;

const T = {
  de: { titel: "Effiziente Werkzeuge für Rechnungswesen, Verwaltung und Business-IT", bereiche: ["Rechnungswesen", "Verwaltung", "Business-IT"],
    partner: "Partnerangebot · Anzeige", platz: "Hier könnte Ihr Produkt stehen", knopf: "Partner werden",
    sf: '<a class="wz-knopf" href="../werkzeuge/smartformular/">', ziel: '"smartformular/"', nav: '<a href="../werkzeuge/" aria-current="page">Werkzeuge</a>' },
  en: { titel: "Efficient tools for accounting, administration and business IT", bereiche: ["Accounting", "Administration", "Business IT"],
    partner: "Partner offer · Advertisement", platz: "Your product could be here", knopf: "Become a partner",
    sf: '<a class="wz-knopf" href="../../werkzeuge/smartformular/en/">', ziel: '"../smartformular/en/"', nav: '<a href="../../werkzeuge/en/" aria-current="page">Tools</a>' },
};

for (const [lang, pfad] of Object.entries(UEBERSICHT_PFAD)) {
  const t = T[lang], html = lesen(pfad);
  console.log(`\n${pfad}`);
  check(html === werkzeugeUebersicht(lang), "Seite im Repository entsteht genau aus dem Modul");
  check(html.includes(`<html lang="${lang}">`) && html.includes(`<h1>${t.titel.replace(/Business[- ]IT/, m => `<span class="wz-nb">${m}</span>`)}</h1>`) && html.includes(`<link rel="canonical" href="${uebersichtUrl(lang)}">`), "Sprache, Überschrift, canonical");
  check(html.includes(t.nav), "Kopf: Menüpunkt Werkzeuge aktiv");
  check(!html.includes('class="abzeichen"') && html.indexOf("<h1>") < html.indexOf('class="untertitel"') && html.indexOf('<article class="wz">\n<h1>') > 0, "Seite beginnt mit der Überschrift, ohne Abzeichen (Robin, 18.10.2026)");
  check(anzahl(html.match(/<ol class="wz-rolle">[\s\S]*?<\/ol>/)?.[0] || "", /<li>/g) === 3, "Drei Schritte: Auswählen, Einführen, Schulen");
  check(BEREICHE.join() === "rechnungswesen,verwaltung,business-it" && BEREICHE.every((b, i) => html.includes(`<button type="button" data-bereich="${b}" aria-pressed="false">${t.bereiche[i]}</button>`))
    && html.includes('data-bereich="alle" aria-pressed="true"'), "Filter: Alle, Rechnungswesen, Verwaltung, Business-IT");
  check(!/Unternehmensführung|management/i.test(html.replace(/<footer[\s\S]*<\/footer>/, "")), "kein Bereich „Unternehmensführung“ mehr");
  const raster = html.match(/<div class="wz-raster">[\s\S]*?<\/div>\n<h2/)?.[0] || "";
  check(raster.includes('data-bereiche="rechnungswesen"') && raster.includes('<article class="wz-karte" data-bereiche="rechnungswesen">\n<p class="wz-kennz frei" aria-hidden="true">&nbsp;</p>') && raster.includes(t.sf), "Karte SmartFormular: ohne Kennzeichnung, Knopf zur Produktseite");
  check(!/Produkt von robin\.vision|product by robin\.vision/i.test(html), "nirgends „Produkt von robin.vision“ (Robin, 18.10.2026)");
  check(raster.includes('class="wz-karte wz-platzhalter" data-bereiche="alle"') && raster.includes(`<h3>${t.platz}</h3>`) && raster.includes(`<p class="wz-kennz frei">${t.partner}</p>`) && raster.includes('href="#partner"'), "Platzhalter „Hier könnte Ihr Produkt stehen“ mit Kennzeichnung und Weg zum Formular");
  check(raster.includes('wz-frei" data-bereiche="verwaltung"') && raster.includes('wz-frei" data-bereiche="business-it"') && !raster.includes('wz-frei" data-bereiche="rechnungswesen"'), "freie Plätze für Verwaltung und Business-IT");
  check(!/rel="sponsored/.test(raster), "ohne Partner kein Anzeigen-Verweis");
  const tabelle = html.match(/<table class="wz-tabelle">[\s\S]*?<\/table>/)?.[0] || "";
  check(anzahl(tabelle, /<th scope="col"/g) === 5 && anzahl(tabelle, /<tr><th scope="row">/g) === 6 && !/>(Stand|Status|Einführung und Schulung|Implementation and training)</.test(tabelle) && tabelle.includes('class="wz-frei-spalte"') && anzahl(tabelle, /href="#partner"/g) === 1, "Vergleich: drei Werkzeuge, „Ihr Produkt“, sechs Kriterien (ohne Stand, Einführung und Schulung), Weg zum Formular");
  check(html.indexOf('id="ueberblick"') < html.indexOf('id="vergleich"') && html.indexOf('id="vergleich"') < html.indexOf('id="workshops-hinweis"') && html.indexOf('id="workshops-hinweis"') < html.indexOf('id="partner"'), "Reihenfolge: Überblick, Vergleich, Workshops, Partner werden");
  const form = html.match(/<form class="wz-form wz-kasten" id="partner-anfrage"[\s\S]*?<\/form>/)?.[0] || "";
  check(["firma", "name", "email", "produkt", "bereich", "nachricht", "website"].every(n => form.includes(`name="${n}"`)) && form.includes('tabindex="-1"') && form.includes('role="status"'), "Formular „Partner werden“: Felder, Falle, Statuszeile");
  check(T[lang].bereiche.every(b => form.includes(`<option value="${b}">`)), "Formular: Bereiche zur Auswahl");
  check(html.includes(`<h2 id="partner">${t.knopf}</h2>`) && html.includes(JSON.stringify(KONTAKT_ENDPUNKT)) && html.includes("'content-type': 'application/json'"), "Formular sendet an Gochs Kontakt-Endpunkt");
  check(html.includes(JSON.stringify(ALTE_MARKEN)) && html.includes(`location.replace(${t.ziel}`) && ["fibu", "deklaration", "beta"].every(m => ALTE_MARKEN.includes(m)), "alte Sprungmarken (#fibu, #deklaration, #beta …) leiten zur Produktseite");
  check(html.includes('id="newsletter"'), "Newsletter-Kasten");
}

console.log("\nProbe-Partner");
PARTNER.push({ id: "probe", name: "Probe-Werkzeug", anbieter: "Probe GmbH", url: "https://example.org/", bereiche: ["verwaltung"],
  text: { de: "Ein Satz zum Werkzeug.", en: "One sentence on the tool." } });
try {
  for (const lang of ["de", "en"]) {
    const t = T[lang], html = werkzeugeUebersicht(lang), s = slider(lang);
    const karte = html.match(/<article class="wz-karte" data-bereiche="verwaltung">[\s\S]*?<\/article>/)?.[0] || "";
    check(karte.includes(`<p class="wz-kennz frei">${t.partner}</p>`) && karte.includes('href="https://example.org/" rel="sponsored noopener" target="_blank"'), `${lang}: Partnerkarte als Anzeige, Verweis mit rel="sponsored"`);
    check(!html.includes('wz-frei" data-bereiche="verwaltung"') && html.includes('wz-frei" data-bereiche="business-it"'), `${lang}: belegter Bereich verliert den freien Platz`);
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
  check(anzahl(s, /<p class="wzs-kennz" aria-hidden="true">&nbsp;<\/p>/g) === 3 && !/Produkt von robin\.vision|product by robin\.vision/i.test(s) && anzahl(s, new RegExp(`<p class="wzs-kennz">${t.partner}</p>`, "g")) === 1 && s.includes(`<h3>${t.platz}</h3>`) && s.includes(`href="werkzeuge/${lang === "en" ? "en/" : ""}#partner"`), `${lang}: drei SmartFormular-Produkte ohne Kennzeichnung, Platzhalter als Partnerangebot zu „Partner werden“`);
  const sf = lang === "en" ? "werkzeuge/smartformular/en/" : "werkzeuge/smartformular/";
  check(s.includes(`href="${sf}#fibu"`) && s.includes(`href="${sf}#deklaration"`), `${lang}: FiBu und Deklaration führen zur Produktseite`);
}
check(start.includes("document.querySelectorAll('.wzs')") && /\.wzs\[hidden\] \{ display: none; \}/.test(start) && /\.wzs-spur \{[^}]*scroll-snap-type: x mandatory/.test(start), "Slider: Stile mit scroll-snap, kleines Skript für Pfeile und Punkte");
check(start.includes('href="werkzeuge/" data-i18n="toolsAll"') || /data-i18n="toolsAll"/.test(start), "Startseite: Verweis auf die Übersicht mit Vergleich");
check(/Rechnungswesen, Verwaltung und Business-IT/.test(start) && /accounting, administration and business IT/.test(lesen("language.js")), "Startseite und Sprachdatei: Business-IT");
check([start, lesen("language.js"), lesen("werkzeuge/index.html")].every(h => h.includes("geschult mit robin.vision") && !h.includes("geschult von robin.vision")) && /learned with robin\.vision/.test(lesen("werkzeuge/en/index.html")) && !/taught by robin\.vision/.test(lesen("language.js") + lesen("werkzeuge/en/index.html")), "„ausgewählt, eingeführt und geschult mit robin.vision“ (Robin, 18.10.2026)");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nAlles in Ordnung");
process.exit(fails ? 1 : 0);
