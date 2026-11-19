// Unterseiten der Anbieter (worker/src/anbieter.js; Robin, 19.11.2026): jede Karte führt auf eine Seite von robin.vision, erst dort geht
// es zum Anbieter; Aufnahmen erscheinen erst, wenn es welche gibt (kein Platzhalter).
//   node tests/anbieter_seiten_test.mjs
import { readFileSync, existsSync } from "node:fs";
import { ANBIETER, anbieterSeite, anbieterPfad, anbieterPruefen } from "../worker/src/anbieter.js";
import { SEITEN } from "../worker/src/sitemap.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const sitemap = readFileSync(root + "sitemap.xml", "utf8");

anbieterPruefen();
check(ANBIETER.length >= 3 && ANBIETER.some(a => a.art === "anzeige") && ANBIETER.some(a => a.art === "vorgeschlagen"), "vorgeschlagene Software und Anzeigen haben Unterseiten");
for (const a of ANBIETER) for (const lang of ["de", "en"]) {
  const pfad = anbieterPfad(a.id, lang), html = anbieterSeite(a, lang);
  const adresse = `https://robin.vision/${pfad.replace(/index\.html$/, "")}`;
  check(existsSync(root + pfad) && readFileSync(root + pfad, "utf8") === html, `${a.id} ${lang}: Datei gebaut und aktuell`);
  const zumAnbieter = html.match(new RegExp(`<a class="an-knopf" href="${a.url.replace(/[.?*+^$[\]\\(){}|/]/g, "\\$&")}" rel="([^"]+)" target="_blank">`));
  check(zumAnbieter && zumAnbieter[1] === (a.art === "anzeige" ? "sponsored noopener" : "noopener"), `${a.id} ${lang}: Verweis zum Anbieter ${a.art === "anzeige" ? "mit" : "ohne"} rel=sponsored`);
  const kennz = a.art === "anzeige" ? `<p class="kennz"><a href="${lang === "en" ? "../../../?lang=en" : "../../"}#anzeigen">${lang === "en" ? "Ad" : "Anzeige"}</a> · <span>${a.anbieter}</span></p>`
    : `<p class="kennz">${lang === "en" ? "Suggested" : "Vorgeschlagen"} · <span>${a.anbieter}</span></p>`;
  check(html.includes(kennz) && html.includes(`<h1>${a.name}</h1>`) && (!a.logo || html.includes(a.logo)), `${a.id} ${lang}: Kennzeichen wie auf der Karte, Name und Logo`);
  check(html.includes(`<link rel="canonical" href="${adresse}">`) && sitemap.includes(`<loc>${adresse}</loc>`) && SEITEN.some(s => s.adresse === pfad.replace(/index\.html$/, "")), `${a.id} ${lang}: kanonische Adresse, in der Sitemap`);
  check(!/Aufnahme folgt|Recording to follow|coming soon|folgt in Kürze/i.test(html) && ((a.aufnahmen || []).length ? html.includes('id="aufnahmen"') : !html.includes('id="aufnahmen"') && !html.includes("<video")), `${a.id} ${lang}: Aufnahmen nur, wenn es welche gibt, kein Platzhalter (Robin, 19.11.2026)`);
  check(!/DATEV|€/.test(html.replace(/<head>[\s\S]*<\/head>/, "")), `${a.id} ${lang}: ohne DATEV und ohne Preise`);
}
// Mit einer Aufnahme: Abschnitt mit Video, Vorschaubild, Titel, Datum und Hinweis „Testdaten“
{
  const a = { ...ANBIETER[0], aufnahmen: [{ datei: "probe-clip", datum: "2026-12-01", titel: { de: "Erste Schritte", en: "First steps" } }] };
  const de = anbieterSeite(a, "de"), en = anbieterSeite(a, "en");
  check(de.includes('<h2 id="aufnahmen">Aufnahmen</h2>') && de.includes('<source src="../../assets/videos/anbieter/probe-clip.mp4" type="video/mp4">') && de.includes('poster="../../assets/videos/anbieter/probe-clip.jpg"') && de.includes("<strong>Erste Schritte</strong> · Eigene Aufnahme von robin.vision mit Testdaten, vom 1.12.2026"), "mit Aufnahme: Video mit Titel, Datum und Hinweis (de)");
  check(en.includes('<h2 id="aufnahmen">Recordings</h2>') && en.includes("../../../assets/videos/anbieter/probe-clip.mp4") && en.includes("of 1 December 2026") && !/autoplay/.test(de + en) && de.includes('preload="none"'), "mit Aufnahme: englisch, kein Autoplay, erst beim Abspielen geladen");
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nUnterseiten der Anbieter in Ordnung.");
process.exit(fails ? 1 : 0);
