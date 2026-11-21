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
import { werkzeugeUebersicht, uebersichtUrl, ALTE_MARKEN, MARKEN_ZIEL, KONTAKT_ENDPUNKT, VERGLEICH_SICHTBAR } from "../worker/src/uebersicht.js";
import { slider, startSlider } from "../worker/src/slider.js";
import { PARTNER, VORGESCHLAGEN, EIGENE } from "../worker/src/partner.js";
import { EIGENE_WERKZEUGE_IM_SLIDER } from "../worker/src/slider.js";
const V = VORGESCHLAGEN.length, P = PARTNER.length, E = EIGENE.length;
import { grundsaetze, GRUNDSAETZE_CSS } from "../worker/src/grundsaetze.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");
const anzahl = (s, re) => (s.match(re) || []).length;

const T = {
  de: { titel: "Werkzeuge",
    platz: "Ihre Lösung auf robin.vision", knopf: "Software vorschlagen",
    sf: '<a class="wz-knopf" href="../werkzeuge/smartformular/">', ziel: '"smartformular/"', nav: '<a href="../werkzeuge/" aria-current="page">Werkzeuge</a>',
    zeilen: ["Aufgabe", "Für wen", "Betrieb und Daten", "Sitz des Anbieters", "KI", "Schnittstellen", "Preis und Test", "Nachweise"], stand: "Stand",
    quelle: "Angaben der Anbieter, Stand je Spalte; Reihenfolge nach Aufnahme.", partnerSatz: "Partner zahlen für die Vorstellung.",
    anzeige: "Anzeige", erkl: "../#anzeigen" },
  en: { titel: "Tools",
    platz: "Your solution on robin.vision", knopf: "Suggest your software",
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
  const reihe = html.match(/<div class="wz-reihe" tabindex="0" role="region"[\s\S]*?<\/div>\n<script>[\s\S]*?<\/script>\n/)?.[0] || "";
  check((reihe.match(/<article class="wz-karte">/g) || []).length === V + E + P && reihe.includes("Math.random()") && (reihe.match(/<h3>([^<]+)<\/h3>/) || [])[1] === (V ? VORGESCHLAGEN[0].name : "SmartFormular"), "Wischbare Reihe mit allen Karten – vorgeschlagene Software, eigene Lösungen, Anzeigen –, je Lösung genau eine, bei jedem Laden gemischt");
  // SmartFormular wie jede andere Lösung (Robin, 20.11.2026): eine Karte, gleicher Aufbau, Kennzeichen „Anzeige · robin.vision“
  const karten = reihe.match(/<article class="wz-karte">[\s\S]*?<\/article>/g) || [];
  const sfKarte = karten.find(k => k.includes("<h3>SmartFormular</h3>")) || "";
  const gestalt = k => k.replace(/<span class="wz-logo[^"]*" aria-hidden="true">.*<\/span>\n/, "LOGO\n").replace(/>[^<\n]+</g, "><").replace(/href="[^"]*"/g, 'href=""');
  check(karten.filter(k => /Smart<span>Formular|SmartFormular|FiBu lite|E-Rechnung lite/.test(k)).length === 1 && sfKarte.startsWith(`<article class="wz-karte">\n${kennz(t, "wz-kennz", "robin.vision")}\n<span class="wz-logo wz-logo-sf" aria-hidden="true">Smart<span>Formular</span></span>`)
    && sfKarte.includes(`<ul class="wz-chips"><li>TaxTech</li></ul>`) && sfKarte.includes(`<a class="wz-knopf" href="${lang === "en" ? "../../werkzeuge/smartformular/en/" : "../werkzeuge/smartformular/"}">${lang === "en" ? "To the product" : "Zum Produkt"}</a>`)
    && !sfKarte.includes("smartformular.ai") && !sfKarte.includes("sponsored"), "SmartFormular: genau eine Karte, Kennzeichen „Anzeige · robin.vision“, Bereich „TaxTech“ (Robin, 21.11.2026), „Zum Produkt“ führt auf die Unterseite (Robin, 20.11.2026)");
  check(karten.filter(k => k.includes("#anzeigen")).every(k => gestalt(k) === gestalt(sfKarte)) && !html.includes("wz-mehr") && !/Mehr zu SmartFormular|More about SmartFormular|Zu SmartFormular|To SmartFormular/.test(html), "SmartFormular-Karte ist gebaut wie jede andere Anzeige; kein eigener Verweis „Mehr zu SmartFormular“ mehr");
  check(html.indexOf('id="ueberblick"') < html.indexOf('class="wz-reihe"') && !html.includes('id="partner-anzeigen"') && !html.includes('<div class="wz-raster">'), "kein eigener Abschnitt „Anzeigen“: Anzeigen stehen im Überblick (Robin, 19.11.2026)");
  check(!/Partnerangebot|Partner offer|Advertisement|Eigene Produkte|Own products|eigene Produkte|own products|Partnerlösungen|partner solutions/.test(html.replace(/<footer[\s\S]*<\/footer>/, "")), "keine Unterscheidung zwischen eigenen Produkten und Partnern (Robin, 18.10.2026)");
  check(!(raster.match(/<article class="wz-karte wz-platzhalter">[\s\S]*?<\/article>/)?.[0] || "").includes("wz-kennz"), "Platzhalter (falls da) ohne Kennzeichen");
  check(!/Produkt von robin\.vision|product by robin\.vision/i.test(html), "nirgends „Produkt von robin.vision“ (Robin, 18.10.2026)");
  check(!html.includes("wz-platzhalter") && !html.includes(`<h3>${t.platz}</h3>`), "keine Karte „Ihre Lösung auf robin.vision“ mehr (Robin, 16.11.2026)");
  check(html.includes('<h2 id="partner">') && html.includes('id="partner-anfrage"'), "Formular „Partner werden“ bleibt");
  check(!/rel="sponsored/.test(raster) && !/rel="sponsored/.test(reihe), "Karten verweisen auf Unterseiten von robin.vision; rel=sponsored steht erst dort am Verweis zum Anbieter (Robin, 19.11.2026)");
  // Andreas Schoba (Robin, 19.11.2026): Kategorie „KI-Skills“, Wortmarke von seiner Website. Seit 20.11.2026 „Vorgeschlagen“ statt „Anzeige“:
  // bis zur Eintragung der UG gibt es keine Vergütung (Robin, 20.11.2026, Freigabeliste F66)
  const schoba = (reihe.match(/<article class="wz-karte">[\s\S]*?<\/article>/g) || []).find(k => k.includes("<h3>Andreas Schoba</h3>")) || "";
  check(schoba.startsWith(`<article class="wz-karte">\n<p class="wz-kennz">${lang === "en" ? "Suggested" : "Vorgeschlagen"} · <span>Andreas Schoba</span></p>\n<span class="wz-logo wz-logo-bild" aria-hidden="true"><img src="${lang === "en" ? "../../" : "../"}assets/partner/andreas-schoba.png" alt="" width="161"></span>`) && schoba.includes(`<ul class="wz-chips"><li>${lang === "en" ? "AI skills" : "KI-Skills"}</li></ul>`) && schoba.includes(`href="${lang === "en" ? "../../werkzeuge/andreas-schoba/en/" : "../werkzeuge/andreas-schoba/"}"`) && !/€|Gulde|DATEV/.test(schoba), `${lang}: Karte Andreas Schoba im Überblick – Kennzeichen, Wortmarke 161 px, Chip „KI-Skills“, Verweis auf seine Unterseite, ohne Preise und ohne Gulde`);
  // Vergleich vorübergehend aus (Robin, 12.11.2026); Aufbau und Daten werden weiter an der eingeschalteten Fassung geprüft
  check(VERGLEICH_SICHTBAR || (!html.includes('id="vergleich"') && !html.includes('<table class="wz-tabelle">') && !html.includes('class="meta wz-quelle"')), "Vergleichstabelle vorübergehend nicht auf der Seite (Robin, 12.11.2026)");
  const htmlV = werkzeugeUebersicht(lang, { vergleich: true });
  const tabelle = htmlV.match(/<table class="wz-tabelle">[\s\S]*?<\/table>/)?.[0] || "";
  const zeilen = [...tabelle.matchAll(/<tr><th scope="row">([^<]*)<\/th>/g)].map(m => m[1].replace(/\u00AD/g, ""));
  check(anzahl(tabelle, /<th scope="col"/g) === 5 && zeilen.join("|") === t.zeilen.join("|") && !/>(Bereich|Area|Programme|Software|Status|Einführung und Schulung|Implementation and training)</.test(tabelle) && /Komplettlösung aus einer Hand|all-in-one suites/.test(tabelle) && tabelle.includes('class="wz-frei-spalte"') && anzahl(tabelle, /href="#partner"/g) === 1, "Vergleich: drei Werkzeuge (E-Rechnung lite seit 23.10.2026, FiBu archiviert 16.11.2026), „Ihr Produkt“, acht Kriterien nach der Recherche vom 18.10.2026, Weg zum Formular");
  check(anzahl(tabelle, /<td><\/td>/g) === 0 && anzahl(tabelle, /<span class="wz-th-stand">/g) === 3 && tabelle.includes(`<span class="wz-th-stand">${t.stand} 10/2026</span>`), "jede SmartFormular-Zelle gefüllt, Stand der Angaben im Kopf je Spalte");
  check(anzahl(tabelle, new RegExp(thKennz(t, "robin.vision").replace(/[.?*+^$[\]\\(){}|]/g, "\\$&"), "g")) === 1 && anzahl(tabelle, new RegExp(`<span class="wz-th-kennz">${lang === "en" ? "Free trial until 31 Dec 2026" : "Kostenlos testen bis 31.12.2026"}</span>`, "g")) === 1 && anzahl(tabelle, new RegExp(`<span class="wz-th-kennz">${lang === "en" ? "Free to check" : "Prüfen kostenlos"}</span>`, "g")) === 1 && anzahl(tabelle, /class="wz-th-kennz"/g) === 3 && !/wz-frei-spalte"><span class="wz-th-kennz/.test(tabelle), "Vergleich: Abschluss mit „Anzeige · robin.vision“, FiBu lite und E-Rechnung lite mit „Kostenlos“, die Spalte „Ihr Produkt“ ohne");
  check(!/Testsieger|empfohlen|recommended|★|\b[1-5],[0-9] \/ 5\b/.test(tabelle), "keine Noten, Sterne oder Empfehlungen im Vergleich (§ 6 UWG)");
  const quelle = htmlV.match(/<\/table>\n<\/div>\n<p class="meta wz-quelle">([^<]*)<\/p>/)?.[1] || "";
  check(quelle === t.quelle, "unter dem Vergleich: Herkunft der Angaben und Reihenfolge, ohne Partner kein Satz zur Bezahlung");
  check(htmlV.indexOf('id="ueberblick"') < htmlV.indexOf('id="vergleich"') && htmlV.indexOf('id="vergleich"') < htmlV.indexOf('id="workshops-hinweis"') && htmlV.indexOf('id="workshops-hinweis"') < htmlV.indexOf('id="partner"'), "Reihenfolge: Überblick, Vergleich, Workshops, Partner werden");
  const form = html.match(/<form class="wz-form wz-kasten" id="partner-anfrage"[\s\S]*?<\/form>/)?.[0] || "";
  check(["firma", "name", "email", "produkt", "nachricht", "website"].every(n => form.includes(`name="${n}"`)) && !form.includes('name="bereich"') && form.includes('tabindex="-1"') && form.includes('role="status"'), "Formular „Partner werden“: Felder, Falle, Statuszeile");
  check(['<select id="p-fuer" name="fuer"><option value="">', '<select id="p-standort" name="standort"><option value="">'].every(x => form.includes(x)) && !/<select[^>]*required/.test(form) && anzahl(form, /<option>/g) === 9 && html.includes("d.fuer ? T.fuer") && html.includes("d.standort ? T.standort"), "Formular: zwei freiwillige Auswahlfelder (Für wen, Datenstandort), in der Nachricht an Robin");
  check(html.includes(`<h2 id="partner">${t.knopf}</h2>`) && html.includes(JSON.stringify(KONTAKT_ENDPUNKT)) && html.includes("'content-type': 'application/json'"), "Formular sendet an Gochs Kontakt-Endpunkt");
  check(html.includes(JSON.stringify(ALTE_MARKEN)) && html.includes(`location.replace(${t.ziel}`) && ["fibu", "deklaration", "beta"].every(m => ALTE_MARKEN.includes(m)), "alte Sprungmarken (#fibu, #deklaration, #beta …) leiten zur Unterseite SmartFormular");
  { const unterseite = lesen(lang === "en" ? "werkzeuge/smartformular/en/index.html" : "werkzeuge/smartformular/index.html");
    check(html.includes(JSON.stringify(MARKEN_ZIEL)) && Object.values(MARKEN_ZIEL).every(m => unterseite.includes(`id="${m}"`)) && ["produkte", "fibu-lite", "beta"].every(m => unterseite.includes(`id="${m}"`)), "umbenannte Marken (#fibu, #downloads, #deklaration) haben ein Ziel auf der Unterseite"); }
  check(html.includes('id="newsletter"') && !/etwa von FiBu lite|such as FiBu lite|Beta-Start von FiBu|beta start of FiBu/.test(html), "Newsletter-Kasten ohne FiBu lite und Beta-Start (Robin, 18.10.2026)");
  check(!/kleines Werkzeug|Schmerzpunkt|small tool|pain point/i.test(html) && /Hemmschwellen beim Umgang mit KI und neuer Software|hesitation about AI and new software/.test(html), "Workshop-Kasten: Hemmschwellen statt selbst gebautem Werkzeug (Robin, 18.10.2026)");
}

console.log("\nVorgeschlagene Software (Robin, 16.11.2026)");
{
  const ws = ["workshops/index.html", "workshops/en/index.html"].map(lesen).join("");
  for (const lang of ["de", "en"]) {
    const html = werkzeugeUebersicht(lang), s = slider(lang);
    for (const v of VORGESCHLAGEN) {
      const karte = (html.match(/<article class="wz-karte">[\s\S]*?<\/article>/g) || []).find(k => k.includes(`<h3>${v.name}</h3>`)) || "";
      const zeichen = `${lang === "en" ? "Suggested" : "Vorgeschlagen"} · <span>${v.anbieter}</span>`;
      check(karte.includes(`<p class="wz-kennz">${zeichen}</p>`) && !karte.includes("#anzeigen") && !karte.includes("sponsored") && karte.includes(`href="${lang === "en" ? "../../" : "../"}werkzeuge/${v.id}/${lang === "en" ? "en/" : ""}"`) && !karte.includes(v.url) && karte.includes(v.logo), `${lang}: ${v.name} als Karte mit „${zeichen.replace(/<\/?span>/g, "")}“, ohne „Anzeige“ und ohne rel=sponsored, mit Logo, Verweis auf die eigene Unterseite (Robin, 19.11.2026)`);
      check(s.includes(`<h3>${v.name}</h3>`) && s.includes(`<p class="wzs-kennz">${zeichen}</p>`) && !/Partner/.test(karte), `${lang}: ${v.name} im Slider, nirgends „Partner“ an der Karte`);
      check((s.match(/<h3>([^<]+)<\/h3>/) || [])[1] === VORGESCHLAGEN[0].name, `${lang}: ${VORGESCHLAGEN[0].name} im Slider der Startseite vor SmartFormular (Robin, 16.11.2026)`);
      check(!ws.includes(v.name), `${v.name} nicht auf den Workshop-Seiten (erst nach Robins Test)`);
    }
  }
}

console.log("\nProbe-Partner");
const probeVergleich = { stand: "01/2027", aufgabe: "Probe-Aufgabe", fuer: "Probe", daten: "Probe", sitz: "Probe", ki: "Probe", schnittstellen: "Probe", preis: "Probe", nachweise: "Probe" };
PARTNER.push({ id: "probe", name: "Probe-Werkzeug", anbieter: "Probe GmbH", url: "https://example.org/",
  vergleich: { de: probeVergleich, en: probeVergleich },
  text: { de: "Ein Satz zum Werkzeug.", en: "One sentence on the tool." } });
try {
  for (const lang of ["de", "en"]) {
    const t = T[lang], html = werkzeugeUebersicht(lang, { vergleich: true }), s = slider(lang);
    const karte = (html.match(/<article class="wz-karte">[\s\S]*?<\/article>/g) || []).find(k => k.includes("Probe-Werkzeug")) || "";
    check(karte.includes("<h3>Probe-Werkzeug</h3>") && karte.startsWith(`<article class="wz-karte">\n${kennz(t, "wz-kennz", "Probe GmbH")}`) && karte.includes(`href="${lang === "en" ? "../../werkzeuge/probe/en/" : "../werkzeuge/probe/"}"`), `${lang}: Partnerkarte wie alle anderen – gleiches Kennzeichen mit dem Anbieter, Verweis auf die Unterseite`);
    check(s.includes("<h3>Probe-Werkzeug</h3>") && s.includes(kennz(t, "wzs-kennz", "Probe GmbH", "#anzeigen")) && s.includes(`href="werkzeuge/probe/${lang === "en" ? "en/" : ""}"`) && !s.includes(t.platz) && !/wzs-bereich">Partner</.test((s.match(/<article class="wzs-karte">(?:(?!<\/article>)[\s\S])*?Probe-Werkzeug[\s\S]*?<\/article>/) || ["wzs-bereich\">Partner<"])[0]), `${lang}: Slider zeigt den Partner, ohne Anbieterkarte, mit Kennzeichen, ohne Bereich „Partner“`);
    const tabelle = html.match(/<table class="wz-tabelle">[\s\S]*?<\/table>/)?.[0] || "";
    check(anzahl(tabelle, /<th scope="col"/g) === 6 && tabelle.includes(`Probe-Werkzeug<span class="wz-th-stand">${t.stand} 01/2027</span>`) && tabelle.indexOf("Probe-Werkzeug") < tabelle.indexOf('class="wz-frei-spalte"') && tabelle.includes('<td><a href="https://example.org/" rel="sponsored noopener" target="_blank">'), `${lang}: Partner als Spalte nach den SmartFormular-Produkten, mit Stand, Verweis mit rel="sponsored"`);
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
  check(anzahl(s, /<article class="wzs-karte/g) === E + V + P && anzahl(s, /<i( class="an")?><\/i>/g) === E + V + P && anzahl(s, /class="wzs-pfeil"/g) === 2, `${lang}: je Lösung genau eine Karte – vorgeschlagene Software, SmartFormular, Anzeigen –, je ein Punkt, zwei Pfeile`);
  const sf = lang === "en" ? "werkzeuge/smartformular/en/" : "werkzeuge/smartformular/";
  const sfKarte = (s.match(/<article class="wzs-karte">[\s\S]*?<\/article>/g) || []).filter(k => /SmartFormular|Smart<span>Formular|FiBu lite|E-Rechnung lite/.test(k));
  check(sfKarte.length === 1 && sfKarte[0].includes(kennz(t, "wzs-kennz", "robin.vision", "#anzeigen")) && sfKarte[0].includes('<div class="wzs-logo wzs-logo-sf" aria-hidden="true">Smart<span>Formular</span></div>') && sfKarte[0].includes("<h3>SmartFormular</h3>")
    && sfKarte[0].includes(`<a href="${sf}">${lang === "en" ? "To the product" : "Zum Produkt"}</a>`) && !s.includes("smartformular.ai") && !/Kostenlos testen|Free trial|Prüfen kostenlos|Free to check/.test(s), `${lang}: SmartFormular mit genau einer Karte „Anzeige · robin.vision“, die auf die Unterseite führt (Robin, 20.11.2026; F62 Variante a)`);
  check(anzahl(s, /wzs-kennz/g) === E + V + P && !/Produkt von robin\.vision|product by robin\.vision|Partnerangebot|Partner offer/i.test(s) && !s.includes(t.platz) && !s.includes("wzs-platzhalter") && !s.includes("#partner"), `${lang}: jede Karte mit Kennzeichen, keine Anbieterkarte im Slider`);
  // Variante b (F62): FiBu lite und E-Rechnung lite behalten eigene Karten mit „Kostenlos“ – ein Schalter in slider.js
  const b = slider(lang, { werkzeuge: true });
  check(anzahl(b, /<article class="wzs-karte/g) === E + V + P + 2 && anzahl(b, /<i( class="an")?><\/i>/g) === E + V + P + 2 && anzahl(b, new RegExp(`<p class="wzs-kennz">${lang === "en" ? "Free trial until 31 Dec 2026" : "Kostenlos testen bis 31.12.2026"}</p>`, "g")) === 1 && anzahl(b, new RegExp(`<p class="wzs-kennz">${lang === "en" ? "Free to check" : "Prüfen kostenlos"}</p>`, "g")) === 1
    && b.includes(`href="https://smartformular.ai/${lang === "en" ? "en/bookkeeping-start" : "buchhaltung-start"}/"`) && b.includes(`href="https://smartformular.ai/${lang === "en" ? "en/e-invoice-start" : "e-rechnung-start"}/"`) && !b.includes("#abschluss") && EIGENE_WERKZEUGE_IM_SLIDER === false, `${lang}: Variante b vorbereitet (zwei kostenlose Werkzeuge mit eigener Karte), ausgeschaltet`);
}
check(start.includes('<p id="anzeigen" data-i18n="legalAds">Anzeigen: Werkzeuge mit dem Kennzeichen „Anzeige“') && /legalAds: 'Advertising: tools marked “Ad”/.test(lesen("language.js")) && /Gebühr oder Provision/.test(start) && /beteiligt ist/.test(start) && start.includes("location.hash === '#anzeigen'") && start.includes("impressum.open = true"), "Impressum: Erläuterung „Anzeigen“ (DE/EN) mit Sprungmarke #anzeigen, die das Impressum aufklappt");
check(start.includes("document.querySelectorAll('.wzs')") && /\.wzs\[hidden\] \{ display: none; \}/.test(start) && /\.wzs-spur \{[^}]*scroll-snap-type: x mandatory/.test(start), "Slider: Stile mit scroll-snap, kleines Skript für Pfeile und Punkte");
check(start.includes('href="werkzeuge/" data-i18n="toolsAll"') || /data-i18n="toolsAll"/.test(start), "Startseite: Verweis auf die Übersicht mit Vergleich");
check(/Rechnungswesen, Verwaltung und andere Geschäftsprozesse/.test(start) && /accounting, administration and other business processes/.test(lesen("language.js")), "Startseite und Sprachdatei: andere Geschäftsprozesse");
check(![start, lesen("language.js"), lesen("werkzeuge/index.html"), lesen("werkzeuge/en/index.html"), lesen("worker/profile.md"), lesen("worker/links.md")].some(h => /Business[- ]IT/i.test(h)), "nirgends mehr „Business-IT“ (Robin, 18.10.2026)");
check([start, lesen("language.js"), lesen("werkzeuge/index.html")].every(h => h.includes("vorgestellt auf robin.vision") && !h.includes("verglichen") && !/Abläufe analysieren, Teams schulen|eingeführt und geschult/.test(h)) && /presented on robin\.vision/.test(lesen("werkzeuge/en/index.html") + lesen("language.js")) && !/analyse your processes, train your team|selected, implemented/.test(lesen("language.js") + lesen("werkzeuge/en/index.html")), "Werkzeuge neutral: „vorgestellt und verglichen auf robin.vision“, robin.vision nicht als Zwischenstation (Robin, 18.10.2026)");

console.log("\nGrundsätze (Robin, 19.10.2026)");
const startHtml = lesen("index.html");
check(!startHtml.includes("grundsaetze") && !startHtml.includes("gs-karte"), "Startseite ohne Grundsätze (Robin, 03.11.2026)");
check(/<section class="blog-teaser anbieter" id="anbieter"/.test(startHtml) && /data-i18n="anbieterText">[^<]*robin.vision vor\.</.test(startHtml) && /href="werkzeuge\/#partner" data-href-de="werkzeuge\/#partner" data-href-en="werkzeuge\/en\/#partner" data-i18n="anbieterKnopf">Software vorschlagen</.test(startHtml), "Startseite: Hinweis für Anbieter mit „Software vorschlagen“ (Option B, Wortlaut 17.11.2026)");
for (const [lang, pfad] of Object.entries(UEBERSICHT_PFAD)) {
  const html = lesen(pfad);
  check(html.includes(grundsaetze(lang)) && html.includes(GRUNDSAETZE_CSS) && (html.indexOf('id="vergleich"') < 0 || html.indexOf('class="grundsaetze"') < html.indexOf('id="vergleich"')) && html.indexOf('id="partner-anzeigen"') < html.indexOf('class="grundsaetze"') && (lang === "en" || html.includes("Klardaten nur in Werkzeuge")) && !html.includes("gs-karte"), `${lang}: zwei Grundsätze als ruhiger Block vor dem Vergleich, mit „Klardaten“ (Robin, 04.11.2026)`);
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nAlles in Ordnung");
process.exit(fails ? 1 : 0);
