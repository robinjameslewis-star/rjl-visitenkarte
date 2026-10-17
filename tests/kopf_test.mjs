// Seitenkopf (worker/src/kopf.js; Robin, 16.10.2026): Wortmarke robin.vision, Verweise auf die Unterseiten statt auf Stellen im
// Einseiter, Termin bleibt, Menü für schmale Bildschirme; Startseite trägt denselben Aufbau mit Sprachwahl, ihre Stile sind die
// aus kopf.js. Kein Netz.   node tests/kopf_test.mjs
import { readFileSync, readdirSync } from "node:fs";
import { kopf, KOPF_CSS, MARKE } from "../worker/src/kopf.js";
import { WERKZEUGE, werkzeugPfad, UEBERSICHT_PFAD } from "../worker/src/werkzeug.js";
import { UEBER_MICH } from "../worker/src/ueber_mich.js";
import { WORKSHOPS } from "../worker/src/workshops.js";
import { parsePost, POSTS_DIR } from "../worker/src/blog.js";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");

console.log("Modul");
const de = kopf("de", "../", { aktiv: "tools" }), en = kopf("en", "../../", { aktiv: "about", andere: "https://robin.vision/ueber-mich/" });
check(de.includes(`<a class="marke" href="../">${MARKE}</a>`) && en.includes(`<a class="marke" href="../../?lang=en">${MARKE}</a>`), "Wortmarke robin.vision führt zur Startseite der Sprache");
check(/<nav class="hauptnav" aria-label="Seiten"><a href="\.\.\/werkzeuge\/" aria-current="page">SmartFormular<\/a><a href="\.\.\/blog\/">Impulse<\/a><a href="\.\.\/workshops\/">Workshops<\/a><a href="\.\.\/ueber-mich\/">Über mich<\/a><\/nav>/.test(de), "vier Seiten, aktive markiert, keine Sprungmarken");
check(en.includes('<a href="../../werkzeuge/en/">SmartFormular</a><a href="../../blog/en/">Food for Thought</a><a href="../../workshops/en/">Workshops</a><a href="../../about/" aria-current="page">About</a>'), "englische Ziele");
check(de.includes('<a class="termin" href="../#kontakt">Termin</a>') && en.includes('<a class="termin" href="../../?lang=en#kontakt">Appointment</a>'), "Termin bleibt und führt zum Termin-Abschnitt der Startseite");
check(de.includes('<details class="menue"><summary aria-label="Menü">') && de.includes('<a href="../#nachricht">Nachricht</a><a href="../?lang=en" lang="en" hreflang="en">English</a>') && en.includes('<a href="https://robin.vision/ueber-mich/" lang="de" hreflang="de">Deutsch</a>'), "Menü mit Nachricht und der anderen Sprache (Gegenstück, sonst Startseite)");
check(!/href="#/.test(de.replace(/#kontakt|#nachricht/g, "")), "keine weiteren Sprungmarken");

console.log("\nUnterseiten");
const seiten = [...WERKZEUGE.map(w => [werkzeugPfad(w.id), w.lang, "tools"]), ...Object.entries(UEBERSICHT_PFAD).map(([l, p]) => [p, l, "tools"]),
  ...UEBER_MICH.map(s => [s.pfad, s.lang, "about"]), ...WORKSHOPS.map(s => [s.pfad, s.lang, "workshops"]), ["blog/index.html", "de", "posts"], ["blog/en/index.html", "en", "posts"],
  ...readdirSync(root + POSTS_DIR).filter(n => n.endsWith(".md")).map(n => parsePost(lesen(`${POSTS_DIR}/${n}`), n.slice(0, -3))).filter(p => p.status === "published").map(p => [`blog/${p.slug}/index.html`, p.lang, "posts"])];
const ziel = { de: { tools: "werkzeuge/", posts: "blog/", workshops: "workshops/", about: "ueber-mich/" }, en: { tools: "werkzeuge/en/", posts: "blog/en/", workshops: "workshops/en/", about: "about/" } };
for (const [pfad, lang, aktiv] of seiten) {
  const html = lesen(pfad), up = "../".repeat(pfad.split("/").length - 1);
  const ok = html.includes('<header class="kopf">') && html.includes(`<a class="marke" href="${up}${lang === "en" ? "?lang=en" : ""}">${MARKE}</a>`)
    && html.includes(`<a href="${up}${ziel[lang][aktiv]}" aria-current="page">`) && html.includes(`<a class="termin" href="${up}${lang === "en" ? "?lang=en" : ""}#kontakt">`)
    && html.includes(KOPF_CSS) && !html.includes('class="top"');
  check(ok, `${pfad}: Kopf mit Wortmarke, aktivem Menüpunkt „${aktiv}“, Termin und Stilen`);
}

console.log("\nStartseite");
const start = lesen("index.html");
check(start.includes('<header class="kopf start">') && start.indexOf('<nav class="language-nav"') > start.indexOf('<header class="kopf start">') && start.indexOf('</header>') > start.indexOf('</details>'), "Kopf über der Bühne: Sprachwahl, Seiten, Termin, Menü");
check(/<nav class="hauptnav" aria-label="Seiten" data-i18n-aria="navPages"><a href="werkzeuge\/" data-href-de="werkzeuge\/" data-href-en="werkzeuge\/en\/" data-i18n="navTools">SmartFormular<\/a><!-- redaktion:blog-link --><a href="blog\/" data-href-de="blog\/" data-href-en="blog\/en\/"/.test(start), "Seiten führen auf die Unterseiten, Ziel je Sprache; Impulse zwischen den Marken der Redaktion");
check(start.includes('<a class="termin" href="#kontakt" data-i18n="navContact">Termin</a>') && !/<a[^>]*href="#werkzeuge"|<a[^>]*href="#blog"/.test(start.slice(start.indexOf('<header class="kopf start">'), start.indexOf('</header>'))), "Termin springt zum Termin-Abschnitt; sonst keine Sprungmarken im Kopf");
check(start.includes('<a href="#nachricht" data-i18n="navMessage">Nachricht</a></nav>\n</details>'), "Nachricht im Menü");
const startCss = start.replace(/^  /gm, "");
check(KOPF_CSS.split("\n").every(z => startCss.includes(z)), "Stile der Startseite enthalten KOPF_CSS Zeile für Zeile");
check(start.includes(`<h1 class="name"><a id="name-link" href="./" title="Seite neu laden">${MARKE}</a></h1>`) && /<p class="byline" data-i18n="byline">Robin James Lewis · Balingen<\/p>/.test(start), "Wortmarke robin.vision als Überschrift, Name in der Zeile darunter");
check(!/text-transform: uppercase; letter-spacing: \.28em/.test(start.slice(start.indexOf(".name {"), start.indexOf(".name {") + 300)), "Überschrift nicht mehr in Versalien gesperrt");
const lang = lesen("language.js");
check(/menuLabel: 'Menü'/.test(lang) && /menuLabel: 'Menu'/.test(lang) && /byline: 'Robin James Lewis · Balingen'/.test(lang) && /navPages: 'Pages'/.test(lang), "language.js: Menü, Seiten und Zeile unter der Wortmarke in beiden Sprachen");
check((lang.match(/navWorkshops: 'Workshops'/g) || []).length === 2 && (start.match(/data-i18n="navWorkshops">Workshops<\/a>/g) || []).length === 2, "Workshops in beiden Navigationen der Startseite und in language.js");
check(!/site-nav/.test(start) && !/site-nav/.test(lesen("site.js") + lesen("goch.js") + lesen("landscape.js")), "altes Menü (site-nav) nirgends mehr");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nSeitenkopf in Ordnung.");
process.exit(fails ? 1 : 0);
