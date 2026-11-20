// Unterseiten der Anbieter (worker/src/anbieter.js; Robin, 19.11.2026): jede Karte führt auf eine Seite von robin.vision, erst dort geht
// es zum Anbieter; Aufnahmen erscheinen erst, wenn es welche gibt (kein Platzhalter).
//   node tests/anbieter_seiten_test.mjs
import { readFileSync, existsSync } from "node:fs";
import { ANBIETER, anbieterSeite, anbieterPfad, anbieterPruefen } from "../worker/src/anbieter.js";
import { WERKZEUGE, ALTE_ADRESSEN, werkzeugFelder, werkzeugPfad } from "../worker/src/werkzeug.js";
import { SEITEN } from "../worker/src/sitemap.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const sitemap = readFileSync(root + "sitemap.xml", "utf8");
const anzahlId = (html, id) => html.split(`id="${id}"`).length - 1;

anbieterPruefen();
// ID-Schutz (seit 20.11.2026 ohne feste Sperre für „smartformular“): keine Werkzeugseite, keine Weiterleitung, nichts doppelt
{
  const wirft = liste => { try { anbieterPruefen(liste); return false; } catch { return true; } };
  check(wirft([{ id: WERKZEUGE[0].id }]) && wirft([{ id: "en" }]) && wirft([{ id: ALTE_ADRESSEN[0].pfad.split("/")[1] }]) && wirft([{ id: "doppelt" }, { id: "doppelt" }]) && wirft([{ id: "../x" }]) && wirft([{}]) && !wirft([{ id: "neu-1" }]),
    "ID-Schutz: Werkzeugseiten, englische Übersicht, alte Adressen, doppelte und ungültige IDs werden abgelehnt");
  check(new Set(ANBIETER.map(a => a.id)).size === ANBIETER.length && ANBIETER.filter(a => a.id === "smartformular").length === 1 && !existsSync(root + "worker/src/smartformular.js"), "SmartFormular ist ein Eintrag der Liste; die frühere Produktseite (smartformular.js) gibt es nicht mehr");
}
check(ANBIETER.length >= 4 && ["anzeige", "vorgeschlagen", "eigen"].every(art => ANBIETER.some(a => a.art === art)), "vorgeschlagene Software, eigene Lösungen und Anzeigen haben Unterseiten");
check(ANBIETER.every(a => sitemap.split(`<loc>https://robin.vision/werkzeuge/${a.id}/</loc>`).length === 2), "jede Unterseite steht genau einmal in der Sitemap");
for (const a of ANBIETER) for (const lang of ["de", "en"]) {
  const pfad = anbieterPfad(a.id, lang), html = anbieterSeite(a, lang);
  const adresse = `https://robin.vision/${pfad.replace(/index\.html$/, "")}`;
  check(existsSync(root + pfad) && readFileSync(root + pfad, "utf8") === html, `${a.id} ${lang}: Datei gebaut und aktuell`);
  const zumAnbieter = html.match(new RegExp(`<a class="an-knopf" href="${((lang === "en" && a.urlEn) || a.url).replace(/[.?*+^$[\]\\(){}|/]/g, "\\$&")}" rel="([^"]+)" target="_blank">`));
  check(zumAnbieter && zumAnbieter[1] === (a.art === "anzeige" ? "sponsored noopener" : "noopener"), `${a.id} ${lang}: Verweis zum Anbieter ${a.art === "anzeige" ? "mit" : "ohne"} rel=sponsored`);
  const kennz = a.art !== "vorgeschlagen" ? `<p class="kennz"><a href="${lang === "en" ? "../../../?lang=en" : "../../"}#anzeigen">${lang === "en" ? "Ad" : "Anzeige"}</a> · <span>${a.anbieter}</span></p>`
    : `<p class="kennz">${lang === "en" ? "Suggested" : "Vorgeschlagen"} · <span>${a.anbieter}</span></p>`;
  check(html.includes(kennz) && html.includes(`<h1>${a.name}</h1>`) && (!a.logo || html.includes(a.logo)) && (a.logo || a.wortmarke), `${a.id} ${lang}: Kennzeichen wie auf der Karte, Name und Logo`);
  check(html.includes('class="an-art"') === (a.art !== "eigen") && html.includes("<title>") && !html.includes("--paper: #0E0B14"), `${a.id} ${lang}: Hinweis zur Art nur bei fremden Lösungen, Rahmen von robin.vision`);
  check(html.includes(`<link rel="canonical" href="${adresse}">`) && sitemap.includes(`<loc>${adresse}</loc>`) && SEITEN.some(s => s.adresse === pfad.replace(/index\.html$/, "")), `${a.id} ${lang}: kanonische Adresse, in der Sitemap`);
  check(!/Aufnahme folgt|Recording to follow|coming soon|folgt in Kürze/i.test(html) && ((a.aufnahmen || []).length ? html.includes('id="aufnahmen"') : !html.includes('id="aufnahmen"') && !html.includes("<video")), `${a.id} ${lang}: Aufnahmen nur, wenn es welche gibt, kein Platzhalter (Robin, 19.11.2026)`);
  check(!/DATEV|€/.test(html.replace(/<head>[\s\S]*<\/head>/, "")), `${a.id} ${lang}: ohne DATEV und ohne Preise`);
}
// SmartFormular wie jede andere Lösung (Robin, 20.11.2026): Unterseite im Rahmen von robin.vision, Verweis auf smartformular.ai,
// FiBu lite und E-Rechnung lite sichtbar verlinkt, alte Sprungmarken (#abschluss, #beta) haben ein Ziel
{
  const sf = ANBIETER.find(a => a.id === "smartformular");
  for (const lang of ["de", "en"]) {
    const html = anbieterSeite(sf, lang), up = lang === "en" ? "../../../" : "../../", ai = lang === "en" ? "https://smartformular.ai/en/" : "https://smartformular.ai/";
    const haupt = html.match(/<article class="anbieter">[\s\S]*<\/article>/)?.[0] || "";
    check(sf.art === "eigen" && sf.anbieter === "robin.vision" && haupt.includes('<span class="an-logo an-wortmarke" aria-hidden="true">Smart<span>Formular</span></span>') && haupt.includes(`<a class="an-knopf" href="${ai}" rel="noopener" target="_blank">`), `smartformular ${lang}: Wortmarke, Verweis auf smartformular.ai ohne rel=sponsored`);
    const eigene = WERKZEUGE.filter(w => w.lang === lang);
    check(eigene.length === 2 && eigene.every(w => haupt.includes(`<a href="${up}werkzeuge/${w.id}/">`) && existsSync(root + werkzeugPfad(w.id))), `smartformular ${lang}: FiBu lite und E-Rechnung lite verlinkt, Seiten vorhanden`);
    check(["produkte", "fibu-lite", "e-rechnung", "abschluss", "beta"].every(m => anzahlId(haupt, m) === 1) && haupt.includes(`href="${ai}#abschluss"`) && haupt.includes(`href="${ai}#beta"`), `smartformular ${lang}: Sprungmarken #produkte, #fibu-lite, #e-rechnung, #abschluss, #beta; Abschluss und Beta führen zu smartformular.ai`);
    check(/<title>[^<]*(Buchhaltung|bookkeeping)[^<]*\| robin\.vision<\/title>/.test(html) && !/<form|FAQPage|sf-kachel|Memberbereich|member area/.test(html) && haupt.length < 3500, `smartformular ${lang}: kurze Seite ohne Formular und ohne die Abschnitte der früheren Produktseite`);
    // Verweise der Werkzeugseiten („Beta-Zugang anfragen“) zeigen weiter auf …/smartformular/#beta
    check(eigene.every(w => readFileSync(root + werkzeugPfad(w.id), "utf8").includes(`href="../../werkzeuge/smartformular/${lang === "en" ? "en/" : ""}#beta"`)), `smartformular ${lang}: Werkzeugseiten verweisen auf #beta der Unterseite`);
  }
  const ai = readFileSync(root + "worker/links.md", "utf8");
  check(ai.includes("https://robin.vision/werkzeuge/smartformular/#abschluss") && ai.includes("https://robin.vision/werkzeuge/smartformular/ https://robin.vision/werkzeuge/smartformular/en/"), "Gochs Linkliste: smartformular und smartformular-deklaration zeigen auf die Unterseite und ihre Marke #abschluss");
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
