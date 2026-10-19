// Werkzeuge auf robin.vision: je Werkzeug und Sprache eine Downloadseite (werkzeuge/<id>/index.html) und je Sprache eine
// Übersicht (werkzeuge/index.html, werkzeuge/en/index.html; Robin, 15.10.2026; seit 18.10.2026 die Übersicht aller Werkzeuge, uebersicht.js). Eine Downloadseite entsteht vollständig aus
// Feldern: Beschreibung, Nutzungsbedingungen und ein kurzer Hinweis in der anderen Sprache (Markdown wie im Blog, in der
// Redaktion pflegbar) sowie die Angaben zur Datei (Name, Fassung, Datum, Größe, SHA-256), die tools/werkzeug-uebernehmen.mjs
// beim Einspielen einer neuen Fassung setzt. Die Felder stehen als JSON in der Seite selbst (script#werkzeug-daten), damit
// Redaktion und Skript sie zurücklesen können. Die Datei liegt daneben und wird mit „download“ ausgeliefert. Unter dem Download
// steht die Anmeldung zum Newsletter (kasten.js); der Download braucht keine Anmeldung.
import { renderMarkdown } from "./blog.js";
import { PRODUKTE } from "./produkte.js";
import { newsletterKasten, NEWSLETTER_ENDPUNKT, NEWSLETTER_SKRIPT, NEWSLETTER_CSS } from "./kasten.js";
import { kopf, KOPF_CSS } from "./kopf.js";
import { neuigkeiten } from "./neuigkeiten.js";
import { ROBIN_VISION, kennzeichen, anzeigeHref, KENNZ_CSS } from "./partner.js";

export { NEWSLETTER_ENDPUNKT };
const SITE = "https://robin.vision/";

// Werkzeuge mit ihren Sprachfassungen. „gegenstueck“ ist dieselbe Datei in der anderen Sprache.
export const WERKZEUGE = [
  { id: "buchungsstapel-generator", lang: "de", titel: "SmartFormular FiBu lite", datei: "Buchungsstapel-Generator.html",
    gegenstueck: "booking-batch-generator",
    kurz: "Es ist der 10., der Bankabruf fällt aus oder ist für dieses Konto nicht eingerichtet, es gibt nur den PDF-Auszug: Der Generator macht daraus Buchungsstapel im DATEV-Format, auch aus Scans. Offline im Browser, auch unter Windows.",
    // Für Suchmaschinen (16.10.2026): Seitentitel und Beschreibung mit den Begriffen, nach denen gesucht wird; Untertitel unter der Überschrift
    seitentitel: "SmartFormular FiBu lite (Buchungsstapel-Generator): Kontoauszug (PDF) in DATEV-Buchungsstapel umwandeln – kostenlos, offline",
    meta: "Kostenloses Werkzeug: Kontoauszüge als PDF, auch Scans, in Buchungsstapel im DATEV-Format (EXTF) umwandeln. Läuft offline im Browser, ohne Upload und ohne Anmeldung – für die Tage, an denen der Bankabruf ausfällt.",
    untertitel: "Der Buchungsstapel-Generator: Kontoauszug als PDF → Buchungsstapel im DATEV-Format (EXTF), offline im Browser" },
  { id: "booking-batch-generator", lang: "en", titel: "SmartFormular FiBu lite", datei: "Booking-Batch-Generator.html",
    gegenstueck: "buchungsstapel-generator",
    kurz: "The filing deadline is tomorrow, the bank feed is down or was never set up for this account, and all you have is the PDF statement: the generator turns it into booking batches in the DATEV format (EXTF), scans included. Offline in your browser, Windows included.",
    seitentitel: "SmartFormular FiBu lite (Booking Batch Generator): convert bank statement PDFs into DATEV booking batches – free, offline",
    meta: "Free tool: convert bank statements in PDF format, scans included, into booking batches in the DATEV format (EXTF). Runs offline in your browser, no upload, no sign-up – for the days when the bank feed is down.",
    untertitel: "The Booking Batch Generator: bank statement PDF → booking batch in the DATEV format (EXTF), offline in your browser" },
];
export const werkzeug = id => WERKZEUGE.find(w => w.id === id);

// Fragen und Antworten je Werkzeug (16.10.2026): sichtbar auf der Seite und als FAQPage für Suchmaschinen. Fest im Code, nicht in der Redaktion.
export const FRAGEN = {
  "buchungsstapel-generator": [
    ["Welche Banken erkennt der Buchungsstapel-Generator?", "Das Layout eines Auszugs erkennt er selbst. Geprüft ist er mit Kontoauszügen im Stil von Sparkasse, Volks- und Raiffeisenbanken, Deutscher Bank, Commerzbank, Postbank, ING, DKB, N26, Wise und Revolut. Liest er einen Auszug nicht, können Sie dessen Aufbau ohne Inhalt senden; das Layout wird dann nachgerüstet."],
    ["Funktioniert er auch mit gescannten Kontoauszügen?", "Ja. Gescannte Auszüge, auch in Schwarz-Weiß, liest er per Texterkennung, ebenfalls offline, in einigen Sekunden je Seite. Die Summenprüfung je Auszug zeigt, ob alle Umsätze gelesen wurden; Beträge lassen sich in der Tabelle korrigieren."],
    ["Was ist ein Buchungsstapel im DATEV-Format (EXTF)?", "Eine CSV-Datei im DATEV-Format, auch EXTF- oder DatevPro-Format genannt: Semikolon zwischen den Feldern, eine Kopfzeile, die die Datei als Buchungsstapel kennzeichnet, dann eine Zeile je Buchung mit Betrag, Soll/Haben, Konto, Gegenkonto, BU-Schlüssel, Datum und Buchungstext. Buchhaltungsprogramme mit DATEV-Import lesen diese Dateien."],
    ["Werden meine Kontoauszüge hochgeladen?", "Nein. Kontoauszüge, Vorlage und Buchungen werden nur in Ihrem Browserfenster verarbeitet. Die Datei baut keine Verbindung ins Internet auf, mit einer Ausnahme, die Sie selbst auslösen: das freiwillige Senden eines Auszug-Aufbaus ohne Inhalt."],
    ["Wie kommt der Buchungsstapel in DATEV Kanzlei-Rechnungswesen?", "Über den Import für Buchungsstapel im DATEV-Format (in DATEV Kanzlei-Rechnungswesen unter Bestand → Importieren). Andere Buchhaltungsprogramme mit DATEV-Import lesen die Datei ebenso. Vor dem ersten Einsatz mit einem Testmandanten prüfen, jeden Stapel vor der Festschreibung kontrollieren."],
    ["Was kostet der Buchungsstapel-Generator?", "Nichts. Download ohne Anmeldung, Nutzung in Kanzlei und Unternehmen erlaubt; es gelten die Nutzungsbedingungen auf dieser Seite. Ein Anspruch auf Aktualisierungen oder Unterstützung besteht nicht."],
  ],
  "booking-batch-generator": [
    ["Which banks does the Booking Batch Generator recognise?", "It recognises the layout of a statement by itself. It has been tested with statements in the style of Sparkasse, Volks- und Raiffeisenbanken, Deutsche Bank, Commerzbank, Postbank, ING, DKB, N26, Wise and Revolut. If it cannot read a statement, you can send its layout without content and support for the layout is added."],
    ["Does it work with scanned bank statements?", "Yes. It reads scanned statements, black and white ones included, using text recognition, also offline, in a few seconds per page. The balance check for each statement shows whether every transaction was read; amounts can be corrected in the table."],
    ["What is a booking batch in the DATEV format (EXTF)?", "A CSV file in the DATEV format, also known as EXTF or DatevPro format: semicolons between the fields, a header line that marks the file as a booking batch, then one line per posting with amount, debit or credit, account, contra account, BU key, date and posting text. Accounting software with a DATEV import reads these files."],
    ["Are my bank statements uploaded?", "No. Bank statements, template and postings are processed only in your browser window. The file does not connect to the internet, with one exception that you trigger yourself: voluntarily sending the layout of a statement without content."],
    ["How do I import the booking batch into DATEV?", "Through the import for booking batches in the DATEV format (in DATEV Kanzlei-Rechnungswesen under Bestand → Importieren). Other accounting software with a DATEV import reads the file as well. Test it with a test client first and check every batch before finalising it."],
    ["What does the Booking Batch Generator cost?", "Nothing. Download without sign-up, use in your firm or company permitted; the terms of use on this page apply. There is no entitlement to updates or support."],
  ],
};
export const werkzeugPfad = id => `werkzeuge/${id}/index.html`;
export const werkzeugUrl = id => `${SITE}werkzeuge/${id}/`;
export const UEBERSICHT_PFAD = { de: "werkzeuge/index.html", en: "werkzeuge/en/index.html" };
const KONTAKT_ENDPUNKT = "https://goch.robin.vision/contact";
// Bis 15.10.2026 hieß das Werkzeug „Kontoauszug-Konverter“; die alte Adresse leitet weiter.
export const ALTE_ADRESSEN = [{ pfad: "werkzeuge/kontoauszug-konverter/index.html", ziel: "buchungsstapel-generator" }];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DATEINAME = /^[A-Za-z0-9_.-]{1,80}\.html$/;

export const WERKZEUG_STANDARD = {
  beschreibung: "",
  nutzung: "",
  hinweis: "",
  neuigkeiten: "", // „Was ist neu“ je Fassung (neuigkeiten.js); der neueste Eintrag steht auch im Newsletter
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
    f.neuigkeiten = String(f.neuigkeiten || "");
    return f;
  } catch { return structuredClone(WERKZEUG_STANDARD); }
}

const T = {
  de: {
    home: "", blog: "Impulse", blogHref: "blog/", tools: "Werkzeugkasten", toolsHref: "werkzeuge/", sfHref: "werkzeuge/smartformular/", about: "Über mich", aboutHref: "ueber-mich/",
    frei: "Kostenlos", fassung: "Fassung", vom: "vom", laden: "Herunterladen", datei: "Datei",
    agb: "Mit dem Herunterladen gelten die Nutzungsbedingungen unten. Unter Windows lässt sich die Prüfsumme in der PowerShell mit <code>Get-FileHash</code> vergleichen.",
    nutzung: "Nutzungsbedingungen", andere: "In English", legal: "Impressum · Datenschutz", fragen: "Fragen und Antworten", neu: "Was ist neu",
    kurz: "SmartFormular", seitentitel: "SmartFormular von robin.vision: FiBu lite kostenlos, FiBu und Deklaration als Beta – Buchhaltung und Jahresabschluss mit KI, human in the loop | robin.vision",
    lead: "Ein SmartFormular sieht aus wie ein gewohntes Formular, hilft beim Ausfüllen, sichert die Vollständigkeit und beginnt schon beim Ausfüllen mit der Sachbearbeitung. Es begleitet Sachbearbeitende und ersetzt sie nicht: Jeder Vorschlag trägt seine Herkunft, geprüft wird von Menschen. FiBu lite gibt es heute kostenlos; FiBu und Deklaration entstehen gerade – Beta-Zugang im Memberbereich auf Anfrage.",
    andereUebersicht: "English", leer: "Noch kein SmartFormular.", ausblick: "Was kommt", beta: "Beta-Zugang anfragen", betaLead: "FiBu und Deklaration werden im Memberbereich von robin.vision erprobt – mit Testdaten, mit Ihrer Rückmeldung, bevor sie fertig sind. Ich antworte persönlich per E-Mail.",
    lite: "Kostenlos herunterladen", inEntwicklung: "In Entwicklung · Beta 2027", fertig: "Kostenlos · fertig", ki: "Ein Sprachmodell kann, muss aber nicht eingebunden sein: in der EU gehostet, ohne Training mit Kundendaten, ohne Bindung an einen Anbieter – das Programm gibt dem Modell feste Vorgaben als Skills, Rechnen und Prüfen bleiben Regelwerk und Mensch.",
    produkte: PRODUKTE.de,
    zuLang: "Ein Text ist zu lang (höchstens 12.000 Zeichen).",
  },
  en: {
    home: "?lang=en", blog: "Food for Thought", blogHref: "blog/en/", tools: "Toolbox", toolsHref: "werkzeuge/en/", sfHref: "werkzeuge/smartformular/en/", about: "About", aboutHref: "about/",
    frei: "Free", fassung: "Version", vom: "of", laden: "Download", datei: "File",
    agb: "The terms of use below apply to the download. On Windows, you can compare the checksum in PowerShell with <code>Get-FileHash</code>.",
    nutzung: "Terms of use", andere: "Auf Deutsch", legal: "Legal notice · Privacy", fragen: "Questions and answers", neu: "What's new",
    kurz: "SmartFormular", seitentitel: "SmartFormular by robin.vision: FiBu lite free, FiBu and Deklaration in beta – bookkeeping and year-end accounts with AI, human in the loop | robin.vision",
    lead: "A SmartFormular looks like a familiar form, helps you fill it in, guarantees completeness and starts the actual casework while you type. It supports accounting staff and does not replace them: every suggestion carries its origin, and people do the checking. FiBu lite is free today; FiBu and Deklaration are in the making – beta access in the member area on request.",
    andereUebersicht: "Deutsch", leer: "No SmartFormular yet.", ausblick: "What's next", beta: "Request beta access", betaLead: "FiBu and Deklaration are being tested in the robin.vision member area – with test data and your feedback, before they are finished. I reply personally by email.",
    lite: "Download for free", inEntwicklung: "In development · beta 2027", fertig: "Free · ready", ki: "A language model can, but need not, be involved: hosted in the EU, no training on customer data, no vendor lock-in – the program gives the model fixed instructions as skills, while calculating and checking stay with rules and people.",
    produkte: PRODUKTE.en,
    zuLang: "Ein Text ist zu lang (höchstens 12.000 Zeichen).",
  },
};
const datumText = (iso, lang) => {
  const [j, m, t] = iso.split("-");
  return lang === "en" ? new Date(Date.UTC(+j, +m - 1, +t)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : `${+t}.${+m}.${j}`;
};

// Gemeinsamer Rahmen der Werkzeugseiten und der Seite „Über mich“ (ueber_mich.js): Seitenkopf (kopf.js) mit Wortmarke, Seiten,
// Termin und Menü, Fuß, Newsletter-Skript; css ergänzt die Stile der Seite, aktiv markiert den Menüpunkt dieser Seite
export function rahmen({ lang, up, titel, seitentitel = "", beschr, canonical, alternates = [], head = "", css = "", main, aktiv = null }) {
  const andere = (alternates.find(a => a.lang !== lang) || {}).href || "";
  const t = T[lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(seitentitel || titel + " – robin.vision")}</title>
<meta name="description" content="${esc(beschr)}">
<link rel="icon" href="${up}assets/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="${up}assets/apple-touch-icon.png">
<link rel="canonical" href="${canonical}">
${alternates.map(a => `<link rel="alternate" hreflang="${a.lang}" href="${a.href}">`).join("\n")}
<meta property="og:site_name" content="robin.vision">
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
${KOPF_CSS}
main { max-width: 780px; margin: 0 auto; padding: clamp(40px, 9vh, 96px) 6vw clamp(56px, 10vh, 120px); }
h1 { font: 400 clamp(34px, 5vw, 52px)/1.1 var(--serif); color: var(--green); margin: 0 0 10px; letter-spacing: 0; }
.untertitel { font: 400 clamp(18px, 2vw, 21px)/1.4 var(--serif); color: var(--ink-soft); margin: 0 0 6px; max-width: 60ch; }
.meta { color: var(--ink-muted); font-size: 13px; letter-spacing: .02em; margin: 0 0 36px; }
.meta a { color: var(--green); text-decoration: underline; text-decoration-color: var(--copper); text-underline-offset: .2em; }
.intro { color: var(--ink-soft); max-width: 52ch; margin: 0 0 36px; }
article > h2 { font: 400 clamp(26px, 3vw, 32px)/1.2 var(--serif); color: var(--green); margin: 64px 0 16px; }
article h2 { font: 400 clamp(22px, 2.6vw, 27px)/1.25 var(--serif); color: var(--green); margin: 40px 0 10px; }
article h3 { font: 500 19px/1.3 var(--serif); margin: 30px 0 8px; }
article p, article li { max-width: 68ch; }
article p { margin: 0 0 18px; }
@media (min-width: 720px) { article p:not(.meta):not(.untertitel):not(.hinweis):not(.frei), article li { text-align: justify; hyphens: auto; } }
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
.fragen h3, .neuigkeiten h3 { font: 500 19px/1.3 var(--serif); margin: 22px 0 6px; }
.fragen p { color: var(--ink-soft); }
.list { list-style: none; margin: 0 0 8px; padding: 0; }
.list li { padding: 22px 0; border-top: 1px solid var(--line); }
.list li:last-child { border-bottom: 1px solid var(--line); }
.list a { color: var(--green); text-decoration: none; font: 400 clamp(21px, 2.4vw, 25px)/1.25 var(--serif); }
.list a:hover { text-decoration: underline; text-decoration-color: var(--copper); text-underline-offset: .2em; }
.list .when { display: block; color: var(--ink-muted); font-size: 13px; margin-bottom: 4px; }
.list p { margin: 6px 0 0; color: var(--ink-soft); max-width: 60ch; }
.foot { max-width: 780px; margin: 0 auto; padding: 0 6vw 48px; font-size: 12px; color: var(--ink-muted); display: flex; gap: 14px; flex-wrap: wrap; }
.foot a { color: inherit; text-decoration: none; }
.foot a:hover { color: var(--ink-soft); }
${css}</style>
${head}</head>
<body data-newsletter-endpoint="${NEWSLETTER_ENDPUNKT}">
${kopf(lang, up, { aktiv, andere })}
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
  const beschreibung = text("beschreibung"), nutzung = text("nutzung"), hinweis = text("hinweis") || text("en"), neu = text("neuigkeiten");
  if (beschreibung.length < 80) throw new Error("Die Beschreibung ist zu kurz.");
  if (nutzung.length < 200) throw new Error("Die Nutzungsbedingungen fehlen oder sind zu kurz.");
  if (hinweis.length < 40) throw new Error(`Der Hinweis auf ${lang === "en" ? "Deutsch" : "Englisch"} fehlt.`);
  if ([beschreibung, nutzung, hinweis, neu].some(x => x.length > 12000)) throw new Error(t.zuLang);
  const d = f.datei || {};
  if (!DATEINAME.test(d.name || "")) throw new Error("Dateiname der Werkzeug-Datei ungültig.");
  if (!/^[0-9a-f]{7}$/.test(d.fassung || "")) throw new Error("Fassung fehlt (7 Zeichen aus dem Git-Stand).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.datum || "")) throw new Error("Datum der Fassung fehlt.");
  if (!(+d.bytes > 100000)) throw new Error("Größe der Datei fehlt.");
  if (!/^[0-9a-f]{64}$/.test(d.sha256 || "")) throw new Error("SHA-256 der Datei fehlt.");
  const datei = { name: d.name, fassung: d.fassung, datum: d.datum, bytes: +d.bytes, sha256: d.sha256 };
  const daten = JSON.stringify({ beschreibung, nutzung, hinweis, neuigkeiten: neu, datei }).replace(/</g, "\\u003c");
  const mb = (datei.bytes / 1e6).toLocaleString(lang === "en" ? "en-GB" : "de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const stand = `${t.fassung} ${esc(datei.fassung)} ${t.vom} ${datumText(datei.datum, lang)}`;
  const anderes = werkzeug(w.gegenstueck), andereLang = lang === "en" ? "de" : "en";
  // Einleitung (bis zur ersten Zwischenüberschrift) vor Download und Newsletter, der Rest danach
  const [einleitung, ...rest] = beschreibung.split(/\n(?=## )/);
  const fragen = FRAGEN[id] || [];
  const main = `<article>
${kennzeichen(lang, anzeigeHref(lang, up), ROBIN_VISION, "kennz")}
<h1>${esc(w.titel)}</h1>
${w.untertitel ? `<p class="untertitel">${esc(w.untertitel)}</p>\n` : ""}<p class="meta">${t.frei} · ${stand}</p>
${renderMarkdown(einleitung, "", lang)}
<div class="download" id="download">
<a class="knopf" href="${esc(datei.name)}" download="${esc(datei.name)}">${t.laden} (${mb} MB)</a>
<dl><dt>${t.datei}</dt><dd>${esc(datei.name)}</dd><dt>${t.fassung}</dt><dd>${esc(datei.fassung)} ${t.vom} ${datumText(datei.datum, lang)}</dd>
<dt>SHA-256</dt><dd><code>${esc(datei.sha256)}</code></dd></dl>
<p class="meta hinweis">${t.agb}</p>
</div>
${newsletterKasten(lang, up, "werkzeug")}
${rest.length ? renderMarkdown(rest.join("\n"), "", lang) : ""}
${neu ? `<h2 id="neu">${t.neu}</h2>\n<div class="neuigkeiten">\n${neuigkeiten(neu).map(e => `<h3 id="fassung-${esc(e.fassung || e.datum)}">${esc(e.titel)}</h3>\n${renderMarkdown(e.text, "", lang)}`).join("\n")}\n</div>` : ""}
${fragen.length ? `<h2 id="fragen">${t.fragen}</h2>\n<div class="fragen">\n${fragen.map(([f, a]) => `<h3>${esc(f)}</h3>\n<p>${esc(a)}</p>`).join("\n")}\n</div>` : ""}
<h2 id="ausblick">${t.ausblick}</h2>
<p>${lang === "en" ? "FiBu lite is the first SmartFormular. Two more are in the making: <strong>SmartFormular FiBu</strong> turns bank statements and documents into the checked booking batch of the month – for bank, payables and receivables, linked to your open items; <strong>SmartFormular Deklaration</strong> is the working paper for year-end accounts that thinks ahead and does the groundwork. Beta access in the member area on request." : "FiBu lite ist das erste SmartFormular. Zwei weitere entstehen: <strong>SmartFormular FiBu</strong> macht aus Kontoauszügen und Belegen den geprüften Buchungsstapel des Monats – für Bank, Kreditoren und Debitoren, mit Bezug zu den offenen Posten; <strong>SmartFormular Deklaration</strong> ist das Arbeitspapier für den Jahresabschluss, das mitdenkt und vorarbeitet. Beta-Zugang im Memberbereich auf Anfrage."}
<a href="${up}${T[lang].sfHref}#beta">${lang === "en" ? "Request beta access" : "Beta-Zugang anfragen"}</a>.</p>
<h2 id="nutzungsbedingungen">${t.nutzung}</h2>
<div class="nutzung">
${renderMarkdown(nutzung, "", lang)}
</div>
<h2 id="${andereLang === "en" ? "english" : "deutsch"}" lang="${andereLang}">${t.andere}</h2>
<div lang="${andereLang}">
${renderMarkdown(hinweis, "", andereLang)}
</div>
</article>`;
  // Strukturierte Daten für Suchmaschinen: kostenlose Browser-Anwendung mit Fassung, Datum, Größe und Nutzungsbedingungen
  const jsonld = JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: w.titel, description: w.kurz, url: werkzeugUrl(id),
    applicationCategory: "BusinessApplication", operatingSystem: "Windows, macOS, Linux (Browser: Edge, Chrome)", inLanguage: lang,
    softwareVersion: datei.fassung, datePublished: datei.datum, fileSize: `${(datei.bytes / 1e6).toFixed(1)} MB`, downloadUrl: werkzeugUrl(id) + datei.name,
    isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, license: werkzeugUrl(id) + "#nutzungsbedingungen",
    author: { "@type": "Person", name: "Robin James Lewis", url: SITE } }).replace(/</g, "\\u003c");
  const faq = fragen.length ? JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: lang,
    mainEntity: fragen.map(([f, a]) => ({ "@type": "Question", name: f, acceptedAnswer: { "@type": "Answer", text: a } })) }).replace(/</g, "\\u003c") : "";
  return rahmen({ lang, up, titel: w.titel, seitentitel: w.seitentitel, beschr: w.meta || (lang === "en" ? "Free tool: " : "Kostenloses Werkzeug: ") + w.kurz, canonical: werkzeugUrl(id),
    alternates: anderes ? [{ lang, href: werkzeugUrl(id) }, { lang: anderes.lang, href: werkzeugUrl(anderes.id) }] : [],
    head: `<script type="application/json" id="werkzeug-daten">${daten}</script>\n<script type="application/ld+json">${jsonld}</script>\n${faq ? `<script type="application/ld+json">${faq}</script>\n` : ""}`, main: `<p class="sf-marke">Smart<span>Formular</span></p>` + main, aktiv: "tools", css: SF_CSS + "\n" + KENNZ_CSS });
}

// Übersicht je Sprache: alle Werkzeuge dieser Sprache mit Stand der Datei (felder: id → Felder der Seite)
// Erscheinungsbild SmartFormular „Nacht und Violett“ (Robin 29.09.2026, #77 im Member-Repo; seit 17.10.2026 auch der Bereich auf der Website)
export const SF_CSS = `:root { --green: #EDE9FE; --copper: #A78BFA; --ink: #EDE9FE; --ink-soft: #C4B5FD; --ink-muted: #8B83A8; --line: #2A2340; --paper: #0E0B14; }
body { background: #0E0B14; color: #EDE9FE; }
.kopf .termin { border-color: #A78BFA; color: #EDE9FE; } .kopf .termin:hover { background: #7C3AED; color: #fff; }
.kopf .menue nav { background: #1C1726; box-shadow: 0 10px 30px rgba(0,0,0,.5); } .kopf .menue nav a:hover { background: rgba(255,255,255,.06); }
.sf-marke { margin: 0 0 6px; font: 500 15px/1.2 var(--sans); letter-spacing: .02em; color: #fff; } .sf-marke span, .sf-wortmarke span { color: #A78BFA; }
.sf-kacheln { display: grid; grid-template-columns: 1fr; gap: 16px; margin: 28px 0 18px; }
.sf-kachel { padding: 24px 24px 20px; border: 1px solid #2A2340; border-radius: 6px; background: #1C1726; }
.sf-kachel.beta { background: #16121f; }
.sf-kachel h2 { margin: 0 0 10px; font: 500 24px/1.25 var(--serif); color: #fff; }
.sf-kachel p { color: #C4B5FD; max-width: none; text-align: left; }
.sf-kachel ul { margin: 0 0 14px; padding-left: 20px; } .sf-kachel li { color: #C4B5FD; font-size: 15px; margin-bottom: 4px; text-align: left; max-width: none; }
.sf-stand { margin: 0 0 8px; font: 500 12px/1.6 var(--sans); letter-spacing: .14em; text-transform: uppercase; color: #A78BFA; }
.sf-kachel.beta .sf-stand { color: #D4C8FF; }
.sf-wege { margin: 10px 0 0; }
.sf-knopf { display: inline-block; padding: 10px 18px; border-radius: 4px; background: #7C3AED; color: #fff; text-decoration: none; font-size: 15px; } .sf-knopf:hover { background: #6D28D9; }
.sf-ki { color: #C4B5FD; font-size: 15px; border-left: 2px solid #7C3AED; padding-left: 14px; }
.beta { position: relative; margin: 8px 0 8px; padding: 22px 24px 20px; border: 1px solid #2A2340; border-left: 2px solid #7C3AED; border-radius: 6px; background: #1C1726; }
.beta .reihe { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.beta label { display: block; font-size: 14px; color: #C4B5FD; margin: 12px 0 4px; }
.beta input, .beta select, .beta textarea { width: 100%; font: inherit; font-size: 16px; padding: 9px 11px; border: 1px solid #2A2340; border-radius: 4px; background: #0E0B14; color: #EDE9FE; }
.beta textarea { min-height: 100px; resize: vertical; }
.beta button { margin-top: 18px; padding: 11px 20px; border: 1px solid #7C3AED; border-radius: 4px; background: #7C3AED; color: #fff; font: inherit; font-size: 15px; cursor: pointer; } .beta button:hover { background: #6D28D9; } .beta button:disabled { opacity: .6; }
.beta .status { min-height: 1.4em; margin: 10px 0 0; font-size: 15px; } .beta .status.ok { color: #A7F3D0; } .beta .status.warn { color: #FCA5A5; }
.beta .falle { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.list li { border-color: #2A2340; } .list a { color: #fff; } .list .when { color: #8B83A8; } .list p { color: #C4B5FD; }
.download { background: #1C1726; border-color: #2A2340; border-left-color: #7C3AED; } .download a.knopf { background: #7C3AED; border-color: #7C3AED; color: #fff; } .download a.knopf:hover { background: #6D28D9; }
.newsletter { background: #1C1726; border-color: #2A2340; border-left-color: #A78BFA; }
.newsletter input { background: #0E0B14; color: #EDE9FE; border-color: #2A2340; } .newsletter button { background: #7C3AED; border-color: #7C3AED; color: #fff; }
.foot a:hover { color: #EDE9FE; }
@media (max-width: 720px) { .beta .reihe { grid-template-columns: 1fr; } }`;

// Weiterleitung für eine alte Adresse (GitHub Pages kennt keine Weiterleitungen auf dem Server)
export function weiterleitung(zielId) {
  const ziel = `../${zielId}/`, w = werkzeug(zielId);
  return `<!doctype html>
<html lang="${w.lang}">
<head>
<meta charset="utf-8">
<title>${esc(w.titel)} – robin.vision</title>
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
