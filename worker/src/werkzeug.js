// Werkzeuge auf robin.vision: je Werkzeug und Sprache eine Downloadseite (werkzeuge/<id>/index.html) und je Sprache eine
// Übersicht (werkzeuge/index.html, werkzeuge/en/index.html; Robin, 15.10.2026). Eine Downloadseite entsteht vollständig aus
// Feldern: Beschreibung, Nutzungsbedingungen und ein kurzer Hinweis in der anderen Sprache (Markdown wie im Blog, in der
// Redaktion pflegbar) sowie die Angaben zur Datei (Name, Fassung, Datum, Größe, SHA-256), die tools/werkzeug-uebernehmen.mjs
// beim Einspielen einer neuen Fassung setzt. Die Felder stehen als JSON in der Seite selbst (script#werkzeug-daten), damit
// Redaktion und Skript sie zurücklesen können. Die Datei liegt daneben und wird mit „download“ ausgeliefert. Unter dem Download
// steht die Anmeldung zum Newsletter (kasten.js); der Download braucht keine Anmeldung.
import { renderMarkdown } from "./blog.js";
import { newsletterKasten, NEWSLETTER_ENDPUNKT, NEWSLETTER_SKRIPT, NEWSLETTER_CSS } from "./kasten.js";

export { NEWSLETTER_ENDPUNKT };
const SITE = "https://robin.vision/";

// Werkzeuge mit ihren Sprachfassungen. „gegenstueck“ ist dieselbe Datei in der anderen Sprache.
export const WERKZEUGE = [
  { id: "buchungsstapel-generator", lang: "de", titel: "Buchungsstapel-Generator", datei: "Buchungsstapel-Generator.html",
    gegenstueck: "posting-batch-generator",
    kurz: "Macht aus PDF-Kontoauszügen Buchungsstapel im DATEV-Format, auch aus gescannten. Läuft offline im Browser, auch unter Windows." },
  { id: "posting-batch-generator", lang: "en", titel: "Posting Batch Generator", datei: "Posting-Batch-Generator.html",
    gegenstueck: "buchungsstapel-generator",
    kurz: "Turns PDF bank statements, scanned ones included, into posting batches in the German DATEV format. Runs offline in your browser, Windows included." },
];
export const werkzeug = id => WERKZEUGE.find(w => w.id === id);
export const werkzeugPfad = id => `werkzeuge/${id}/index.html`;
export const werkzeugUrl = id => `${SITE}werkzeuge/${id}/`;
export const UEBERSICHT_PFAD = { de: "werkzeuge/index.html", en: "werkzeuge/en/index.html" };
// Bis 15.10.2026 hieß das Werkzeug „Kontoauszug-Konverter“; die alte Adresse leitet weiter.
export const ALTE_ADRESSEN = [{ pfad: "werkzeuge/kontoauszug-konverter/index.html", ziel: "buchungsstapel-generator" }];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DATEINAME = /^[A-Za-z0-9_.-]{1,80}\.html$/;

export const WERKZEUG_STANDARD = {
  beschreibung: "",
  nutzung: "",
  hinweis: "",
  datei: { name: "", fassung: "", datum: "", bytes: 0, sha256: "" },
};

// Felder aus einer vorhandenen Seite; „en“ war bis 15.10.2026 der Name des Hinweises in der anderen Sprache.
export function werkzeugFelder(html) {
  const m = String(html || "").match(/<script type="application\/json" id="werkzeug-daten">([\s\S]*?)<\/script>/);
  if (!m) return structuredClone(WERKZEUG_STANDARD);
  try {
    const d = JSON.parse(m[1]);
    const f = { ...structuredClone(WERKZEUG_STANDARD), ...d, datei: { ...WERKZEUG_STANDARD.datei, ...(d.datei || {}) } };
    if (!f.hinweis && d.en) f.hinweis = d.en;
    delete f.en;
    return f;
  } catch { return structuredClone(WERKZEUG_STANDARD); }
}

const T = {
  de: {
    home: "", blog: "Impulse", blogHref: "blog/", tools: "Werkzeuge", toolsHref: "werkzeuge/",
    frei: "Kostenloses Werkzeug", fassung: "Fassung", vom: "vom", laden: "Herunterladen", datei: "Datei",
    agb: "Mit dem Herunterladen gelten die Nutzungsbedingungen unten. Unter Windows lässt sich die Prüfsumme in der PowerShell mit <code>Get-FileHash</code> vergleichen.",
    nutzung: "Nutzungsbedingungen", andere: "In English", legal: "Impressum · Datenschutz",
    kurz: "Werkzeuge", lead: "Kostenlose Werkzeuge für die Buchhaltung. Sie laufen offline im Browser; Ihre Daten verlassen den Rechner nicht.",
    andereUebersicht: "English", leer: "Noch keine Werkzeuge.",
    zuLang: "Ein Text ist zu lang (höchstens 12.000 Zeichen).",
  },
  en: {
    home: "?lang=en", blog: "Food for Thought", blogHref: "blog/en/", tools: "Tools", toolsHref: "werkzeuge/en/",
    frei: "Free tool", fassung: "Version", vom: "of", laden: "Download", datei: "File",
    agb: "The terms of use below apply to the download. On Windows, you can compare the checksum in PowerShell with <code>Get-FileHash</code>.",
    nutzung: "Terms of use", andere: "Auf Deutsch", legal: "Legal notice · Privacy",
    kurz: "Tools", lead: "Free tools for bookkeeping. They run offline in your browser; your data never leaves your computer.",
    andereUebersicht: "Deutsch", leer: "No tools yet.",
    zuLang: "Ein Text ist zu lang (höchstens 12.000 Zeichen).",
  },
};
const datumText = (iso, lang) => {
  const [j, m, t] = iso.split("-");
  return lang === "en" ? new Date(Date.UTC(+j, +m - 1, +t)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : `${+t}.${+m}.${j}`;
};

// Gemeinsamer Rahmen der Werkzeugseiten: Kopf mit Startseite, Impulsen und Werkzeugen, Fuß, Newsletter-Skript
function rahmen({ lang, up, titel, beschr, canonical, alternates = [], head = "", main }) {
  const t = T[lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)} – Robin James Lewis</title>
<meta name="description" content="${esc(beschr)}">
<link rel="icon" href="${up}assets/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="${up}assets/apple-touch-icon.png">
<link rel="canonical" href="${canonical}">
${alternates.map(a => `<link rel="alternate" hreflang="${a.lang}" href="${a.href}">`).join("\n")}
<meta property="og:site_name" content="Robin James Lewis">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschr)}">
<meta property="og:locale" content="${lang === "en" ? "en_GB" : "de_DE"}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<style>
@font-face { font-family: "EB Garamond"; font-style: normal; font-weight: 400 500; font-display: swap; src: url("${up}assets/fonts/eb-garamond-latin.woff2") format("woff2"); }
:root { --green: #0B3D2E; --copper: #B8724F; --ink: #1F1F1F; --ink-soft: #5C5C5C; --ink-muted: #9A9A9A; --line: #D6D9D6; --paper: #F3EFE5;
  --serif: "EB Garamond", "Cormorant Garamond", Baskerville, Georgia, serif; --sans: "Helvetica Neue", Inter, Arial, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; color: var(--ink); background: var(--paper) url("${up}assets/papier.jpg") repeat; background-size: 512px 512px; font: 400 17px/1.6 var(--sans); -webkit-font-smoothing: antialiased; }
.top { max-width: 680px; margin: 0 auto; padding: 28px 6vw 0; display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
.top a { color: var(--ink-soft); text-decoration: none; font-size: 12px; letter-spacing: .03em; }
.top a:hover { color: var(--green); }
.top .home { font: 500 15px/1 var(--serif); letter-spacing: .18em; text-transform: uppercase; color: var(--green); margin-right: auto; }
main { max-width: 680px; margin: 0 auto; padding: clamp(36px, 8vh, 80px) 6vw clamp(48px, 10vh, 110px); }
h1 { font: 400 clamp(30px, 4.2vw, 42px)/1.15 var(--serif); color: var(--green); margin: 0 0 8px; letter-spacing: .005em; }
.meta { color: var(--ink-muted); font-size: 13px; margin: 0 0 32px; }
.meta a { color: var(--green); text-decoration: underline; text-decoration-color: var(--copper); text-underline-offset: .2em; }
.intro { color: var(--ink-soft); max-width: 52ch; margin: 0 0 36px; }
article h2 { font: 400 clamp(22px, 2.6vw, 27px)/1.25 var(--serif); color: var(--green); margin: 40px 0 10px; }
article h3 { font: 500 19px/1.3 var(--serif); margin: 30px 0 8px; }
article p, article li { max-width: 68ch; }
article p { margin: 0 0 18px; }
article a { color: var(--green); text-decoration: underline; text-decoration-color: var(--copper); text-underline-offset: .2em; }
article ul, article ol { padding-left: 22px; margin: 0 0 18px; }
article li { margin-bottom: 6px; }
.download { margin: 32px 0 8px; padding: 20px 22px; border: 1px solid var(--line); border-left: 2px solid var(--copper); border-radius: 3px; background: rgba(255,255,255,.4); display: grid; gap: 10px; }
.download a.knopf { justify-self: start; display: inline-block; padding: 11px 20px; border: 1px solid var(--green); border-radius: 3px; color: var(--paper); background: var(--green); text-decoration: none; font-size: 15px; }
.download a.knopf:hover { background: #082d22; }
.download a.knopf:focus-visible { outline: 2px solid var(--copper); outline-offset: 2px; }
.download dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 14px; margin: 0; font-size: 13px; color: var(--ink-soft); }
.download dt { color: var(--ink-muted); }
.download dd { margin: 0; min-width: 0; }
.download code { font: 12px/1.4 ui-monospace, Menlo, monospace; overflow-wrap: anywhere; }
.download .hinweis { margin: 0; }
.download + .newsletter { margin-top: 18px; }
${NEWSLETTER_CSS}
.nutzung { font-size: 15px; color: var(--ink-soft); }
.nutzung strong { color: var(--ink); font-weight: 500; }
.list { list-style: none; margin: 0 0 8px; padding: 0; }
.list li { padding: 22px 0; border-top: 1px solid var(--line); }
.list li:last-child { border-bottom: 1px solid var(--line); }
.list a { color: var(--green); text-decoration: none; font: 400 clamp(21px, 2.4vw, 25px)/1.25 var(--serif); }
.list a:hover { text-decoration: underline; text-decoration-color: var(--copper); text-underline-offset: .2em; }
.list .when { display: block; color: var(--ink-muted); font-size: 13px; margin-bottom: 4px; }
.list p { margin: 6px 0 0; color: var(--ink-soft); max-width: 60ch; }
.foot { max-width: 680px; margin: 0 auto; padding: 0 6vw 40px; font-size: 12px; color: var(--ink-muted); display: flex; gap: 14px; flex-wrap: wrap; }
.foot a { color: inherit; text-decoration: none; }
.foot a:hover { color: var(--ink-soft); }
</style>
${head}</head>
<body data-newsletter-endpoint="${NEWSLETTER_ENDPUNKT}">
<nav class="top" aria-label="${lang === "en" ? "Page" : "Seite"}"><a class="home" href="${up}${t.home}">Robin James Lewis</a><a href="${up}${t.blogHref}">${t.blog}</a><a href="${up}${t.toolsHref}">${t.tools}</a></nav>
<main>
${main}
</main>
<footer class="foot"><a href="${up}${t.home}#privacy">${t.legal}</a><a href="#newsletter">Newsletter</a><a href="${up}${lang === "en" ? "blog/en/" : "blog/"}feed.xml">RSS</a></footer>
<script src="${up}${NEWSLETTER_SKRIPT}" defer></script>
</body>
</html>
`;
}

// Prüfen und Downloadseite bauen; wirft mit deutscher Meldung, wenn etwas nicht passt (die Redaktion ist deutsch)
export function werkzeugSeite(f, id = "buchungsstapel-generator") {
  const w = werkzeug(id);
  if (!w) throw new Error("Unbekanntes Werkzeug: " + id);
  const lang = w.lang, t = T[lang], up = "../../";
  const text = k => String(f[k] || "").replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
  const beschreibung = text("beschreibung"), nutzung = text("nutzung"), hinweis = text("hinweis") || text("en");
  if (beschreibung.length < 80) throw new Error("Die Beschreibung ist zu kurz.");
  if (nutzung.length < 200) throw new Error("Die Nutzungsbedingungen fehlen oder sind zu kurz.");
  if (hinweis.length < 40) throw new Error(`Der Hinweis auf ${lang === "en" ? "Deutsch" : "Englisch"} fehlt.`);
  if ([beschreibung, nutzung, hinweis].some(x => x.length > 12000)) throw new Error(t.zuLang);
  const d = f.datei || {};
  if (!DATEINAME.test(d.name || "")) throw new Error("Dateiname der Werkzeug-Datei ungültig.");
  if (!/^[0-9a-f]{7}$/.test(d.fassung || "")) throw new Error("Fassung fehlt (7 Zeichen aus dem Git-Stand).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.datum || "")) throw new Error("Datum der Fassung fehlt.");
  if (!(+d.bytes > 100000)) throw new Error("Größe der Datei fehlt.");
  if (!/^[0-9a-f]{64}$/.test(d.sha256 || "")) throw new Error("SHA-256 der Datei fehlt.");
  const datei = { name: d.name, fassung: d.fassung, datum: d.datum, bytes: +d.bytes, sha256: d.sha256 };
  const daten = JSON.stringify({ beschreibung, nutzung, hinweis, datei }).replace(/</g, "\\u003c");
  const mb = (datei.bytes / 1e6).toLocaleString(lang === "en" ? "en-GB" : "de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const stand = `${t.fassung} ${esc(datei.fassung)} ${t.vom} ${datumText(datei.datum, lang)}`;
  const anderes = werkzeug(w.gegenstueck), andereLang = lang === "en" ? "de" : "en";
  // Einleitung (bis zur ersten Zwischenüberschrift) vor Download und Newsletter, der Rest danach
  const [einleitung, ...rest] = beschreibung.split(/\n(?=## )/);
  const main = `<article>
<h1>${esc(w.titel)}</h1>
<p class="meta">${t.frei} · ${stand}</p>
${renderMarkdown(einleitung, "", lang)}
<div class="download" id="download">
<a class="knopf" href="${esc(datei.name)}" download="${esc(datei.name)}">${t.laden} (${mb} MB)</a>
<dl><dt>${t.datei}</dt><dd>${esc(datei.name)}</dd><dt>${t.fassung}</dt><dd>${esc(datei.fassung)} ${t.vom} ${datumText(datei.datum, lang)}</dd>
<dt>SHA-256</dt><dd><code>${esc(datei.sha256)}</code></dd></dl>
<p class="meta hinweis">${t.agb}</p>
</div>
${newsletterKasten(lang, up, "werkzeug")}
${rest.length ? renderMarkdown(rest.join("\n"), "", lang) : ""}
<h2 id="nutzungsbedingungen">${t.nutzung}</h2>
<div class="nutzung">
${renderMarkdown(nutzung, "", lang)}
</div>
<h2 id="${andereLang === "en" ? "english" : "deutsch"}" lang="${andereLang}">${t.andere}</h2>
<div lang="${andereLang}">
${renderMarkdown(hinweis, "", andereLang)}
</div>
</article>`;
  return rahmen({ lang, up, titel: w.titel, beschr: (lang === "en" ? "Free tool: " : "Kostenloses Werkzeug: ") + w.kurz, canonical: werkzeugUrl(id),
    alternates: anderes ? [{ lang, href: werkzeugUrl(id) }, { lang: anderes.lang, href: werkzeugUrl(anderes.id) }] : [],
    head: `<script type="application/json" id="werkzeug-daten">${daten}</script>\n`, main });
}

// Übersicht je Sprache: alle Werkzeuge dieser Sprache mit Stand der Datei (felder: id → Felder der Seite)
export function werkzeugUebersicht(lang, felder = {}) {
  const t = T[lang], up = lang === "en" ? "../../" : "../";
  const eigene = WERKZEUGE.filter(w => w.lang === lang);
  const items = eigene.map(w => {
    const d = (felder[w.id] || {}).datei || {};
    const stand = d.fassung && d.datum ? `${t.fassung} ${esc(d.fassung)} ${t.vom} ${datumText(d.datum, lang)}` : "";
    return `<li><span class="when">${t.frei}${stand ? " · " + stand : ""}</span><a href="${up}werkzeuge/${w.id}/">${esc(w.titel)}</a><p>${esc(w.kurz)}</p></li>`;
  }).join("\n");
  const andere = lang === "en" ? "de" : "en", canonical = `${SITE}${UEBERSICHT_PFAD[lang].replace(/index\.html$/, "")}`;
  const main = `<h1>${t.kurz}</h1>
<p class="intro">${t.lead}</p>
${eigene.length ? `<ul class="list">\n${items}\n</ul>` : `<p class="intro">${t.leer}</p>`}
<p class="meta"><a href="${up}${T[andere].toolsHref}" lang="${andere}" hreflang="${andere}">${t.andereUebersicht}</a></p>
${newsletterKasten(lang, up, "werkzeug")}`;
  return rahmen({ lang, up, titel: t.kurz, beschr: t.lead, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: `${SITE}${UEBERSICHT_PFAD[andere].replace(/index\.html$/, "")}` }], main });
}

// Weiterleitung für eine alte Adresse (GitHub Pages kennt keine Weiterleitungen auf dem Server)
export function weiterleitung(zielId) {
  const ziel = `../${zielId}/`, w = werkzeug(zielId);
  return `<!doctype html>
<html lang="${w.lang}">
<head>
<meta charset="utf-8">
<title>${esc(w.titel)} – Robin James Lewis</title>
<link rel="canonical" href="${werkzeugUrl(zielId)}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${ziel}">
</head>
<body>
<p>Der Kontoauszug-Konverter heißt jetzt <a href="${ziel}">${esc(w.titel)}</a>.</p>
</body>
</html>
`;
}
