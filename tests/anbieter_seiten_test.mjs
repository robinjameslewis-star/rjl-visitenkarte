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
// Beiträge: veröffentlichte Impulse, die die Lösung nennen, automatisch; Entwürfe, andere Sprache und andere Themen nicht; dazu Links anderer Kanäle
{
  const a = { ...ANBIETER[0], links: [{ url: "https://www.linkedin.com/posts/probe", datum: "2026-12-03", kanal: "LinkedIn", titel: { de: "Clip auf LinkedIn", en: "Clip on LinkedIn" } }] };
  const posts = [
    { slug: "mit-loesung", title: `Erfahrung mit ${a.name}`, summary: "Kurz", body: "Text", date: "2026-12-02", lang: "de", status: "published" },
    { slug: "im-text", title: "Kanzleihandbuch", summary: "", body: `Wir zeigen ${a.name} im Alltag.`, date: "2026-11-30", lang: "de", status: "published" },
    { slug: "entwurf", title: `Entwurf ${a.name}`, summary: "", body: "", date: "2026-12-04", lang: "de", status: "draft" },
    { slug: "anderes", title: "Anderes Thema", summary: "", body: "nichts", date: "2026-12-05", lang: "de", status: "published" },
    { slug: "englisch", title: `About ${a.name}`, summary: "", body: "", date: "2026-12-01", lang: "en", status: "published" },
  ];
  const de = anbieterSeite(a, "de", posts), en = anbieterSeite(a, "en", posts);
  const reihenfolge = ["linkedin.com/posts/probe", "blog/mit-loesung/", "blog/im-text/"].map(x => de.indexOf(x));
  check(de.includes('<h2 id="beitraege">Beiträge</h2>') && reihenfolge.every((x, i) => x > 0 && (!i || x > reihenfolge[i - 1])) && de.includes('href="../../blog/mit-loesung/"') && de.includes('href="https://www.linkedin.com/posts/probe" rel="noopener" target="_blank"') && !de.includes("entwurf/") && !de.includes("anderes/") && !de.includes("englisch/"), "Beiträge: Impulse, die die Lösung nennen, und Links anderer Kanäle, neueste zuerst; keine Entwürfe, keine anderen Themen oder Sprachen");
  check(en.includes('<h2 id="beitraege">Posts</h2>') && en.includes('href="../../../blog/englisch/"') && en.includes("Clip on LinkedIn") && !en.includes("mit-loesung/"), "Beiträge englisch: nur englische Impulse");
}
// Zufällige Reihenfolge bei jedem Laden (Robin, 19.11.2026): Slider der Startseite mischt seine Karten
check(/Karten bei jedem Laden zufällig mischen[\s\S]{0,400}Math\.random\(\)/.test(readFileSync(root + "index.html", "utf8")), "Slider der Startseite mischt die Karten bei jedem Laden");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nUnterseiten der Anbieter in Ordnung.");
process.exit(fails ? 1 : 0);
