// Downloadseite des Werkzeugs „Buchungsstapel aus Kontoauszug“ (werkzeuge/buchungsstapel/index.html).
// Die Seite entsteht vollständig aus Feldern: Beschreibung, Nutzungsbedingungen und englischer Hinweis (Markdown wie im Blog,
// in der Redaktion pflegbar) sowie die Angaben zur Datei (Name, Fassung, Datum, Größe, SHA-256), die tools/werkzeug-uebernehmen.mjs
// beim Einspielen einer neuen Fassung setzt. Die Felder stehen als JSON in der Seite selbst (script#werkzeug-daten), damit die
// Redaktion sie zurücklesen kann. Die Datei liegt daneben und wird mit „download“ ausgeliefert.
import { renderMarkdown } from "./blog.js";

export const WERKZEUG_PFAD = "werkzeuge/buchungsstapel/index.html";
export const WERKZEUG_URL = "https://robin.vision/werkzeuge/buchungsstapel/";

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DATEINAME = /^[A-Za-z0-9_.-]{1,80}\.html$/;

export const WERKZEUG_STANDARD = {
  beschreibung: "",
  nutzung: "",
  en: "",
  datei: { name: "Buchungsstapel_aus_Kontoauszug.html", fassung: "", datum: "", bytes: 0, sha256: "" },
};

export function werkzeugFelder(html) {
  const m = String(html || "").match(/<script type="application\/json" id="werkzeug-daten">([\s\S]*?)<\/script>/);
  if (!m) return structuredClone(WERKZEUG_STANDARD);
  try {
    const d = JSON.parse(m[1]);
    return { ...structuredClone(WERKZEUG_STANDARD), ...d, datei: { ...WERKZEUG_STANDARD.datei, ...(d.datei || {}) } };
  } catch { return structuredClone(WERKZEUG_STANDARD); }
}

// Prüfen und Seite bauen; wirft mit deutscher Meldung, wenn etwas nicht passt
export function werkzeugSeite(f) {
  const text = k => String(f[k] || "").replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
  const beschreibung = text("beschreibung"), nutzung = text("nutzung"), en = text("en");
  if (beschreibung.length < 80) throw new Error("Die Beschreibung ist zu kurz.");
  if (nutzung.length < 200) throw new Error("Die Nutzungsbedingungen fehlen oder sind zu kurz.");
  if (en.length < 40) throw new Error("Der englische Hinweis fehlt.");
  if ([beschreibung, nutzung, en].some(t => t.length > 12000)) throw new Error("Ein Text ist zu lang (höchstens 12.000 Zeichen).");
  const d = f.datei || {};
  if (!DATEINAME.test(d.name || "")) throw new Error("Dateiname der Werkzeug-Datei ungültig.");
  if (!/^[0-9a-f]{7}$/.test(d.fassung || "")) throw new Error("Fassung fehlt (7 Zeichen aus dem Git-Stand).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.datum || "")) throw new Error("Datum der Fassung fehlt.");
  if (!(+d.bytes > 100000)) throw new Error("Größe der Datei fehlt.");
  if (!/^[0-9a-f]{64}$/.test(d.sha256 || "")) throw new Error("SHA-256 der Datei fehlt.");
  const datei = { name: d.name, fassung: d.fassung, datum: d.datum, bytes: +d.bytes, sha256: d.sha256 };
  const daten = JSON.stringify({ beschreibung, nutzung, en, datei }).replace(/</g, "\\u003c");
  const [j, m, t] = datei.datum.split("-");
  const mb = (datei.bytes / 1e6).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const titel = "Buchungsstapel aus Kontoauszug";
  const beschr = "Kostenloses Werkzeug: aus PDF-Kontoauszügen je Monat ein Buchungsstapel im DatevPro-Format (DATEV-Format). Läuft offline im Browser.";
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel} – Robin James Lewis</title>
<meta name="description" content="${esc(beschr)}">
<link rel="icon" href="../../assets/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="../../assets/apple-touch-icon.png">
<link rel="canonical" href="${WERKZEUG_URL}">
<meta property="og:site_name" content="Robin James Lewis">
<meta property="og:type" content="website">
<meta property="og:title" content="${titel}">
<meta property="og:description" content="${esc(beschr)}">
<meta property="og:locale" content="de_DE">
<meta property="og:url" content="${WERKZEUG_URL}">
<meta name="twitter:card" content="summary">
<style>
@font-face { font-family: "EB Garamond"; font-style: normal; font-weight: 400 500; font-display: swap; src: url("../../assets/fonts/eb-garamond-latin.woff2") format("woff2"); }
:root { --green: #0B3D2E; --copper: #B8724F; --ink: #1F1F1F; --ink-soft: #5C5C5C; --ink-muted: #9A9A9A; --line: #D6D9D6; --paper: #F3EFE5;
  --serif: "EB Garamond", "Cormorant Garamond", Baskerville, Georgia, serif; --sans: "Helvetica Neue", Inter, Arial, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; color: var(--ink); background: var(--paper) url("../../assets/papier.jpg") repeat; background-size: 512px 512px; font: 400 17px/1.6 var(--sans); -webkit-font-smoothing: antialiased; }
.top { max-width: 680px; margin: 0 auto; padding: 28px 6vw 0; display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
.top a { color: var(--ink-soft); text-decoration: none; font-size: 12px; letter-spacing: .03em; }
.top a:hover { color: var(--green); }
.top .home { font: 500 15px/1 var(--serif); letter-spacing: .18em; text-transform: uppercase; color: var(--green); }
main { max-width: 680px; margin: 0 auto; padding: clamp(36px, 8vh, 80px) 6vw clamp(48px, 10vh, 110px); }
h1 { font: 400 clamp(30px, 4.2vw, 42px)/1.15 var(--serif); color: var(--green); margin: 0 0 8px; letter-spacing: .005em; }
.meta { color: var(--ink-muted); font-size: 13px; margin: 0 0 32px; }
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
.nutzung { font-size: 15px; color: var(--ink-soft); }
.nutzung strong { color: var(--ink); font-weight: 500; }
.foot { max-width: 680px; margin: 0 auto; padding: 0 6vw 40px; font-size: 12px; color: var(--ink-muted); display: flex; gap: 14px; flex-wrap: wrap; }
.foot a { color: inherit; text-decoration: none; }
.foot a:hover { color: var(--ink-soft); }
</style>
<script type="application/json" id="werkzeug-daten">${daten}</script>
</head>
<body>
<nav class="top" aria-label="Seite"><a class="home" href="../../">Robin James Lewis</a><a href="../../blog/">Impulse</a></nav>
<main>
<article>
<h1>${titel}</h1>
<p class="meta">Kostenloses Werkzeug · Fassung ${esc(datei.fassung)} vom ${+t}.${+m}.${j}</p>
${renderMarkdown(beschreibung, "", "de")}
<div class="download" id="download">
<a class="knopf" href="${esc(datei.name)}" download="${esc(datei.name)}">Herunterladen (${mb} MB)</a>
<dl><dt>Datei</dt><dd>${esc(datei.name)}</dd><dt>Fassung</dt><dd>${esc(datei.fassung)} vom ${+t}.${+m}.${j}</dd>
<dt>SHA-256</dt><dd><code>${esc(datei.sha256)}</code></dd></dl>
<p class="meta hinweis">Mit dem Herunterladen gelten die Nutzungsbedingungen unten. Unter Windows lässt sich die Prüfsumme in der PowerShell mit <code>Get-FileHash</code> vergleichen.</p>
</div>
<h2 id="nutzungsbedingungen">Nutzungsbedingungen</h2>
<div class="nutzung">
${renderMarkdown(nutzung, "", "de")}
</div>
<h2 id="english" lang="en">In English</h2>
<div lang="en">
${renderMarkdown(en, "", "en")}
</div>
</article>
</main>
<footer class="foot"><a href="../../#privacy">Impressum · Datenschutz</a><a href="../../#newsletter">Newsletter</a><a href="../../blog/feed.xml">RSS</a></footer>
</body>
</html>
`;
}
