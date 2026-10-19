// Übersicht „Werkzeuge“ (werkzeuge/index.html, englisch werkzeuge/en/index.html; Robin, 18.10.2026): die Sparte von robin.vision als
// Berater, Coach und Vertriebspartner von Softwarelösungen (die drei Schritte stehen seit 18.10.2026 bei den Workshops: Partner sollen
// nicht den Eindruck bekommen, jede Anfrage zu ihren Produkten laufe über robin.vision), alle Werkzeuge als gleichrangige
// Karten ohne Unterscheidung zwischen eigenen Produkten und Partnern (Robin, 18.10.2026: SmartFormular ist ein Beispiel unter vielen
// Lösungen), jedes Werkzeug gleich gekennzeichnet (Robin, 18.10.2026, Option C: „Anzeige · Anbieter“ an Karte und Spalte, Verweis auf
// die Erläuterung im Impressum; Partnerverweise tragen rel="sponsored"), ohne Aufteilung nach
// Bereichen (Robin, 18.10.2026: viele Partner bieten alles aus einer Hand; die Bereiche beschreiben nur das Angebot), ein
// Vergleich und das Formular „Partner werden“ an Gochs Kontakt-Endpunkt. Erscheinungsbild robin.vision (Papier, Grün, Kupfer); die
// Produkte haben eigene Seiten unter werkzeuge/<produkt>/ (SmartFormular: smartformular.js). Weitere Lösungen kommen aus partner.js. Alte Sprungmarken der früheren SmartFormular-Seite (werkzeuge/#fibu …) leiten zur Produktseite weiter.
// tools/werkzeug-uebernehmen.mjs schreibt beide Fassungen; Vorlage war der Entwurf auf dem Zweig claude/werkzeuge-entwurf
// (tools/entwuerfe/werkzeuge-2026-10-18/).
import { rahmen, UEBERSICHT_PFAD } from "./werkzeug.js";
import { SMARTFORMULAR_PFAD } from "./smartformular.js";
import { PARTNER, ROBIN_VISION, kennzeichen, anzeigeHref } from "./partner.js";
import { newsletterKasten } from "./kasten.js";
import { grundsaetze, GRUNDSAETZE_CSS } from "./grundsaetze.js";

const SITE = "https://robin.vision/";
export const KONTAKT_ENDPUNKT = "https://goch.robin.vision/contact";
export const uebersichtUrl = lang => `${SITE}${UEBERSICHT_PFAD[lang].replace(/index\.html$/, "")}`;
// Sprungmarken der früheren SmartFormular-Seite unter werkzeuge/ (bis 18.10.2026)
export const ALTE_MARKEN = ["produkte", "fibu-lite", "fibu", "deklaration", "mensch", "programme", "sprachmodell", "fahrplan", "recht", "fragen", "beta", "downloads"];

const TEXT = {
  de: {
    titel: "Effiziente Werkzeuge für Rechnungswesen, Verwaltung und weitere Geschäftsprozesse",
    seitentitel: "Effiziente Werkzeuge und KI-Lösungen für Rechnungswesen, Verwaltung und weitere Geschäftsprozesse | robin.vision",
    beschr: "Software und KI-Lösungen für Rechnungswesen, Verwaltung und weitere Geschäftsprozesse – vorgestellt und verglichen auf robin.vision. Mit SmartFormular, Vergleich und Partnerprogramm.",
    untertitel: "Software und KI-Lösungen, die im Alltag tragen – vorgestellt und verglichen auf robin.vision. Viele davon zeige ich in den Workshops an echten Fällen.",
    ueberblickTitel: "Werkzeuge im Überblick",
    sf: { text: "Formulare, die mitarbeiten – für die Tage, an denen der Prozess hakt. FiBu lite gibt es kostenlos; FiBu und Deklaration kommen als Beta.",
      chips: ["Rechnungswesen", "Im Workshop gezeigt", "Schulung"], knopf: "Zu SmartFormular" },
    platzhalter: { logo: "Ihr Logo", titel: "Hier könnte Ihr Produkt stehen",
      text: "Sie entwickeln Software oder KI-Lösungen für Rechnungswesen, Verwaltung oder weitere Geschäftsprozesse? Ich stelle ausgewählte Lösungen hier vor, zeige sie in meinen Workshops und auf Fachmessen.",
      chips: ["Website", "Workshops", "Fachmessen"], knopf: "Partner werden" },
    zumProdukt: "Zum Produkt", zumAnbieter: "Zum Anbieter",
    vergleichTitel: "Im Vergleich",
    vergleichLead: "Für jede Lösung dieselben Angaben: was sie leistet, wo die Daten liegen, wie KI eingesetzt wird und wie sie sich anbinden lässt.",
    vergleichQuelle: "Angaben der Anbieter, Stand je Spalte; Reihenfolge nach Aufnahme.",
    stand: "Stand",
    ihrProdukt: "Ihr Produkt",
    kriterien: { aufgabe: "Aufgabe", fuer: "Für wen", daten: "Betrieb und Daten", sitz: "Sitz des Anbieters", ki: "KI",
      schnittstellen: "Schnitt­stellen", preis: "Preis und Test", nachweise: "Nachweise" },
    vergleich: [
      { name: "FiBu lite", href: "werkzeuge/buchungsstapel-generator/", stand: "10/2026", aufgabe: "Kontoauszüge zu Buchungsstapeln", fuer: "Kanzleien und Unternehmen",
        daten: "Eine Datei im Browser, offline; die Daten bleiben auf Ihrem Rechner", sitz: "Deutschland", ki: "Nein, arbeitet mit Regeln",
        schnittstellen: "Liest PDF, Scan, CAMT, MT940, CSV; Buchungsstapel im DATEV-Format", preis: "Kostenlos, ohne Anmeldung",
        nachweise: "Prüfsumme je Fassung; nichts wird hochgeladen" },
      { name: "FiBu", href: "werkzeuge/smartformular/#fibu", stand: "10/2026", aufgabe: "Bank, Kreditoren und Debitoren buchen, Bezug zu den offenen Posten", fuer: "Sachbearbeitung in Kanzlei und Unternehmen",
        daten: "Im Browser über den Memberbereich; Rechenzentren in der EU", sitz: "Deutschland",
        ki: "Optional: Sprachmodell in der EU oder lokal, ohne Training mit Ihren Daten",
        schnittstellen: "Offen für jedes Buchhaltungsprogramm, per Datei oder Schnittstelle", preis: "Beta kostenfrei; Preis mit dem Angebot",
        nachweise: "Beta mit Testdaten; echte Daten nur mit Vereinbarung" },
      { name: "Deklaration", href: "werkzeuge/smartformular/#deklaration", stand: "10/2026", aufgabe: "Arbeitspapier, das mitdenkt und vorarbeitet", fuer: "Kanzleien",
        daten: "Im Browser über den Memberbereich; Rechenzentren in der EU", sitz: "Deutschland",
        ki: "Optional: Sprachmodell in der EU oder lokal, ohne Training mit Ihren Daten",
        schnittstellen: "Neben Ihrem Kanzleiprogramm, per Datei oder Schnittstelle", preis: "Beta kostenfrei; Preis mit dem Angebot",
        nachweise: "Beta mit Testdaten; echte Daten nur mit Vereinbarung" },
    ],
    ihrProduktText: "Ihre Lösung – auch als Komplettlösung aus einer Hand",
    formTitel: "Partner werden",
    formLead: "Stellen Sie Ihre Lösung hier, in meinen Workshops und bei meinen Auftritten auf Fachmessen und Netzwerkveranstaltungen vor. Erzählen Sie mir kurz von Ihrem Produkt; ich melde mich persönlich per E-Mail.",
    felder: { firma: "Unternehmen", name: "Ansprechperson", email: "E-Mail-Adresse", produkt: "Produkt oder Website", nachricht: "Worum geht es?", optional: "(freiwillig)",
      fuer: "Für wen", standort: "Wo liegen die Daten?", waehlen: "Bitte wählen" },
    // Zwei freiwillige Auswahlfelder für die erste Einschätzung (Recherche Vergleich, 18.10.2026); die übrigen Angaben folgen nach der
    // Zusage im Vergleichsbogen (partner.js, Feld vergleich)
    fuerWerte: ["Kanzleien", "Unternehmen", "Organisationen", "Mehrere davon"],
    standortWerte: ["Deutschland", "EU", "Schweiz", "Beim Kunden (lokal)", "Anderswo"],
    senden: "Anfrage senden", sendet: "Wird gesendet …",
    gesendet: "Danke – Ihre Anfrage ist angekommen. Ich melde mich per E-Mail.",
    ungueltig: "Bitte Unternehmen, Ansprechperson und eine gültige E-Mail-Adresse angeben.",
    fehler: "Das Senden hat nicht geklappt. Schreiben Sie mir bitte direkt an robin@robin.vision.",
    datenschutz: "Ihre Angaben gehen per E-Mail an mich und werden nur für die Antwort verwendet. Einzelheiten stehen unter Impressum · Datenschutz.",
    betreff: "Partneranfrage: Werkzeuge auf robin.vision",
    workshopKicker: "In den Workshops", workshopTitel: "Werkzeuge erleben, bevor Sie entscheiden",
    workshopText: "Im Workshop zeige ich ausgewählte Werkzeuge an Fällen aus Ihrem Alltag und überwinde mit Ihrem Team Hemmschwellen beim Umgang mit KI und neuer Software.",
    workshopKnopf: "Zu den Workshops", workshopHref: "workshops/",
    andere: "This page in English",
  },
  en: {
    titel: "Efficient tools for accounting, administration and other business processes",
    seitentitel: "Efficient tools and AI solutions for accounting, administration and other business processes | robin.vision",
    beschr: "Software and AI solutions for accounting, administration and other business processes – presented and compared on robin.vision. With SmartFormular, a comparison and a partner programme.",
    untertitel: "Software and AI solutions that hold up in daily work – presented and compared on robin.vision. I show many of them in the workshops using real cases.",
    ueberblickTitel: "Tools at a glance",
    sf: { text: "Forms that work with you – for the days when the process stalls. FiBu lite is free; FiBu and Deklaration are coming as a beta.",
      chips: ["Accounting", "Shown in the workshop", "Training"], knopf: "To SmartFormular" },
    platzhalter: { logo: "Your logo", titel: "Your product could be here",
      text: "You develop software or AI solutions for accounting, administration or other business processes? I present selected solutions here and show them in my workshops and at trade fairs.",
      chips: ["Website", "Workshops", "Trade fairs"], knopf: "Become a partner" },
    zumProdukt: "To the product", zumAnbieter: "To the provider",
    vergleichTitel: "Comparison",
    vergleichLead: "The same details for every solution: what it does, where the data is kept, how AI is used and how it connects to your software.",
    vergleichQuelle: "Details supplied by the providers, dated per column; listed in the order they joined.",
    stand: "As of",
    ihrProdukt: "Your product",
    kriterien: { aufgabe: "Task", fuer: "For whom", daten: "Operation and data", sitz: "Provider based in", ki: "AI",
      schnittstellen: "Interfaces", preis: "Price and trial", nachweise: "Assurance" },
    vergleich: [
      { name: "FiBu lite", href: "werkzeuge/booking-batch-generator/", stand: "10/2026", aufgabe: "Bank statements into booking batches", fuer: "Firms and companies",
        daten: "A single file in your browser, offline; the data stays on your computer", sitz: "Germany", ki: "No, works with rules",
        schnittstellen: "Reads PDF, scan, CAMT, MT940, CSV; booking batches in the DATEV format", preis: "Free, no sign-up",
        nachweise: "Checksum for every version; nothing is uploaded" },
      { name: "FiBu", href: "werkzeuge/smartformular/en/#fibu", stand: "10/2026", aufgabe: "Post bank, payables and receivables, linked to open items", fuer: "Accounting staff in firms and companies",
        daten: "In the browser via the member area; data centres in the EU", sitz: "Germany",
        ki: "Optional: language model in the EU or on your own systems, no training on your data",
        schnittstellen: "Open to any accounting package, by file or interface", preis: "Beta free of charge; prices come with the quote",
        nachweise: "Beta with test data; real data only by agreement" },
      { name: "Deklaration", href: "werkzeuge/smartformular/en/#deklaration", stand: "10/2026", aufgabe: "Working paper that thinks ahead and does the groundwork", fuer: "Accounting firms",
        daten: "In the browser via the member area; data centres in the EU", sitz: "Germany",
        ki: "Optional: language model in the EU or on your own systems, no training on your data",
        schnittstellen: "Alongside your firm's software, by file or interface", preis: "Beta free of charge; prices come with the quote",
        nachweise: "Beta with test data; real data only by agreement" },
    ],
    ihrProduktText: "Your solution – including all-in-one suites",
    formTitel: "Become a partner",
    formLead: "Present your solution here, in my workshops and when I appear at trade fairs and networking events. Tell me briefly about your product; I will get back to you personally by email.",
    felder: { firma: "Company", name: "Contact person", email: "Email address", produkt: "Product or website", nachricht: "What is it about?", optional: "(optional)",
      fuer: "For whom", standort: "Where is the data kept?", waehlen: "Please choose" },
    fuerWerte: ["Accounting firms", "Companies", "Organisations", "Several of these"],
    standortWerte: ["Germany", "EU", "Switzerland", "With the customer (on premises)", "Elsewhere"],
    senden: "Send enquiry", sendet: "Sending …",
    gesendet: "Thank you – your enquiry has arrived. I will get back to you by email.",
    ungueltig: "Please give your company, a contact person and a valid email address.",
    fehler: "Sending did not work. Please email me directly at robin@robin.vision.",
    datenschutz: "Your details are emailed to me and used only to reply. Details are under Legal notice · Privacy.",
    betreff: "Partner enquiry: tools on robin.vision",
    workshopKicker: "In the workshops", workshopTitel: "Experience tools before you decide",
    workshopText: "In the workshop I show selected tools using cases from your daily work and help your team overcome any hesitation about AI and new software.",
    workshopKnopf: "To the workshops", workshopHref: "workshops/en/",
    andere: "Diese Seite auf Deutsch",
  },
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SF_LOGO = `<span class="wz-logo wz-logo-sf" aria-hidden="true">Smart<span>Formular</span></span>`;

const CSS = `.wz .frei { text-align: left; hyphens: manual; }
.wz-hinweis { color: var(--ink-soft); font-size: 15px; }
.wz-raster { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 10px 0 18px; }
.wz-karte { margin: 0; padding: 22px 22px 18px; border: 1px solid var(--line); border-radius: 6px; background: rgba(255,255,255,.55); display: flex; flex-direction: column; }
.wz-karte h3 { margin: 0 0 8px; font: 500 22px/1.25 var(--serif); color: var(--green); }
.wz-karte p { font-size: 15px; color: var(--ink-soft); max-width: none; }
.wz-karte > p:last-child { margin-top: auto; margin-bottom: 0; }
.wz-logo { width: max-content; height: 44px; padding: 0 16px; display: flex; align-items: center; margin: 0 0 14px; border: 1px dashed var(--line); border-radius: 4px; font: 500 12px/1 var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-muted); background: rgba(255,255,255,.6); }
.wz-logo img { max-height: 32px; width: auto; }
.wz-karte .wz-kennz { margin: 0 0 8px; font: 400 11.5px/1.5 var(--sans); color: #767676; }
.wz-th-kennz { display: block; margin: 0 0 6px; font: 400 11px/1.45 var(--sans); color: #767676; hyphens: manual; }
.wz-kennz a, .wz-th-kennz a { color: inherit; text-decoration: none; } .wz-kennz a:hover, .wz-th-kennz a:hover { text-decoration: underline; text-underline-offset: .2em; }
.wz-th-kennz span { white-space: nowrap; }
.wz-logo-sf { border: 0; background: #0E0B14; color: #fff; font-size: 15px; letter-spacing: .01em; text-transform: none; } .wz-logo-sf span { color: #A78BFA; }
.wz-platzhalter { border: 1.5px dashed var(--copper); }
.wz-chips { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 14px; padding: 0; }
.wz-chips li { margin: 0; padding: 4px 10px; border: 1px solid var(--line); border-radius: 3px; font-size: 13px; color: var(--ink-soft); background: rgba(255,255,255,.6); text-align: left; }
.wz-knopf { display: inline-block; padding: 10px 18px; border: 1px solid var(--green); border-radius: 3px; background: var(--green); color: var(--paper) !important; text-decoration: none !important; font-size: 15px; }
.wz-knopf:hover { background: #082d22; }
.wz-knopf.zweit { background: transparent; color: var(--green) !important; }
.wz-knopf.zweit:hover { background: var(--green); color: var(--paper) !important; }
.wz-tabelle-rahmen { overflow-x: auto; margin: 10px 0 18px; border: 1px solid var(--line); border-radius: 6px; background: rgba(255,255,255,.55); }
.wz-tabelle { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 13.5px; }
.wz-tabelle th, .wz-tabelle td { padding: 11px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; color: var(--ink-soft); line-height: 1.45; overflow-wrap: break-word; hyphens: auto; }
.wz-tabelle thead th { font: 500 17px/1.25 var(--serif); color: var(--green); vertical-align: bottom; padding-top: 16px; }
.wz-tabelle tbody th { hyphens: manual; overflow-wrap: normal; font: 500 11px/1.6 var(--sans); letter-spacing: .06em; text-transform: uppercase; color: var(--copper); }
.wz-tabelle col.wz-kriterium { width: 108px; }
.wz-tabelle tr:last-child th, .wz-tabelle tr:last-child td { border-bottom: 0; }
.wz-th-logo { display: block; width: max-content; margin: 0 0 8px; padding: 5px 10px; border-radius: 3px; background: #0E0B14; color: #fff; font: 500 12px/1 var(--sans); } .wz-th-logo span { color: #A78BFA; }
.wz-th-ihr { display: block; width: max-content; margin: 0 0 8px; padding: 4px 10px; border: 1px dashed var(--line); border-radius: 3px; font: 500 11px/1 var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-muted); }
.wz-frei-spalte { background: repeating-linear-gradient(135deg, rgba(184,114,79,.05) 0 8px, transparent 8px 16px); color: var(--ink-muted) !important; }
.wz-kasten { margin: 26px 0 8px; padding: 22px 24px 18px; border: 1px solid var(--line); border-left: 2px solid var(--copper); border-radius: 3px; background: rgba(255,255,255,.45); }
.wz-kasten .kicker { margin: 0 0 4px; font: 500 12px/1.6 var(--sans); letter-spacing: .18em; text-transform: uppercase; color: var(--copper); }
.wz-kasten h2 { margin: 0 0 8px; }
.wz-form .reihe { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.wz-form label { display: block; font-size: 14px; color: var(--ink-soft); margin: 12px 0 4px; }
.wz-form label span { color: var(--ink-muted); }
.wz-form input, .wz-form select, .wz-form textarea { width: 100%; font: inherit; font-size: 16px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.7); color: var(--ink); }
.wz-form textarea { min-height: 96px; resize: vertical; }
.wz-form button { margin-top: 18px; padding: 11px 20px; border: 1px solid var(--green); border-radius: 3px; background: var(--green); color: var(--paper); font: inherit; font-size: 15px; cursor: pointer; }
.wz-form button:disabled { opacity: .6; cursor: default; }
.wz-form .status { min-height: 1.4em; margin: 10px 0 0; font-size: 15px; }
.wz-form .status.ok { color: var(--green); } .wz-form .status.warn { color: #A63D2F; }
.wz-form .falle { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
@media (max-width: 720px) {
  .wz-raster, .wz-form .reihe { grid-template-columns: 1fr; }
  .wz-tabelle { min-width: 620px; }
}
/* Vergleich auf großen Bildschirmen breiter als die Textspalte (Robin, 19.10.2026: Tabelle auf großem Bildschirm „zerschossen“) */
.wz-tabelle thead th { hyphens: manual; overflow-wrap: normal; }
.wz-th-logo, .wz-th-ihr { max-width: 100%; }
@media (min-width: 1100px) {
  .wz-tabelle-rahmen { width: min(1060px, calc(100vw - 96px)); margin-left: 50%; transform: translateX(-50%); }
  .wz-tabelle { font-size: 14px; }
}
.wz-th-stand { display: block; margin-top: 4px; font: 400 11px/1.4 var(--sans); letter-spacing: .02em; color: var(--ink-muted); }
.wz .wz-quelle { margin: -8px 0 26px; }`;

// Browser-Teil: „Partner werden“ an Gochs Kontakt-Endpunkt (wie die Beta-Anfrage auf der SmartFormular-Seite:
// Felder zu einer Nachricht, Falle „website“, Ladezeitpunkt t) und Weiterleitung alter Sprungmarken zur SmartFormular-Produktseite
const SKRIPT = (lang, t, sfZiel) => `<script>
(() => {
  'use strict';
  const alt = ${JSON.stringify(ALTE_MARKEN)}, marke = location.hash.slice(1);
  if (alt.includes(marke)) { location.replace(${JSON.stringify(sfZiel)} + '#' + marke); return; }
  const form = document.getElementById('partner-anfrage'); if (!form) return;
  const status = document.getElementById('partner-status'), knopf = document.getElementById('partner-senden'), geladen = Date.now();
  const T = ${JSON.stringify({ betreff: t.betreff, firma: t.felder.firma, produkt: t.felder.produkt, fuer: t.felder.fuer, standort: t.felder.standort, sendet: t.sendet, gesendet: t.gesendet, ungueltig: t.ungueltig, fehler: t.fehler })};
  const say = (text, art) => { status.textContent = text; status.className = 'status' + (art ? ' ' + art : ''); };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const firma = (d.firma || '').trim(), name = (d.name || '').trim(), email = (d.email || '').trim();
    if (firma.length < 2 || name.length < 2 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)) { say(T.ungueltig, 'warn'); return; }
    const message = [T.betreff, '', T.firma + ': ' + firma, d.produkt ? T.produkt + ': ' + d.produkt.trim() : null,
      d.fuer ? T.fuer + ': ' + d.fuer : null, d.standort ? T.standort + ': ' + d.standort : null, '', (d.nachricht || '').trim()].filter(x => x !== null).join('\\n').trim();
    knopf.disabled = true; say(T.sendet);
    try {
      const r = await fetch(${JSON.stringify(KONTAKT_ENDPUNKT)}, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang: ${JSON.stringify(lang)}, name, email, phone: '', message, website: d.website || '', t: geladen }) });
      const out = await r.json().catch(() => ({}));
      if (r.ok && out.ok) { say(T.gesendet, 'ok'); form.reset(); } else say(out.error || T.fehler, 'warn');
    } catch (_) { say(T.fehler, 'warn'); }
    knopf.disabled = false;
  });
})();
</script>`;

// Karten aller Werkzeuge: SmartFormular, dann die Lösungen aus partner.js, zuletzt der Platzhalter
function karten(lang, t, up) {
  const sfHref = up + SMARTFORMULAR_PFAD[lang].replace(/index\.html$/, "");
  const kennz = anbieter => kennzeichen(lang, anzeigeHref(lang, up), anbieter, "wz-kennz");
  const chips = liste => `<ul class="wz-chips">${liste.map(c => `<li>${esc(c)}</li>`).join("")}</ul>`;
  const sf = `<article class="wz-karte">
${kennz(ROBIN_VISION)}
${SF_LOGO}
<h3>SmartFormular</h3>
<p class="frei">${esc(t.sf.text)}</p>
${chips(t.sf.chips)}
<p class="frei"><a class="wz-knopf" href="${sfHref}">${esc(t.sf.knopf)}</a></p>
</article>`;
  const partner = PARTNER.map(p => {
    const seite = p.seite ? up + `werkzeuge/${p.seite}/` : null;
    return `<article class="wz-karte">
${kennz(p.anbieter)}
<span class="wz-logo" aria-hidden="true">${p.logo ? `<img src="${esc(up + p.logo)}" alt="">` : esc(p.name)}</span>
<h3>${esc(p.name)}</h3>
<p class="frei">${esc((p.text && (p.text[lang] || p.text.de)) || "")}</p>
<p class="frei">${seite ? `<a class="wz-knopf" href="${seite}">${esc(t.zumProdukt)}</a>` : `<a class="wz-knopf" href="${esc(p.url)}" rel="sponsored noopener" target="_blank">${esc(t.zumAnbieter)}</a>`}</p>
</article>`;
  });
  const platz = `<article class="wz-karte wz-platzhalter">
<span class="wz-logo" aria-hidden="true">${esc(t.platzhalter.logo)}</span>
<h3>${esc(t.platzhalter.titel)}</h3>
<p class="frei">${esc(t.platzhalter.text)}</p>
${chips(t.platzhalter.chips)}
<p class="frei"><a class="wz-knopf zweit" href="#partner">${esc(t.platzhalter.knopf)}</a></p>
</article>`;
  return [sf, ...partner, platz].join("\n");
}

// Vergleichstabelle: Spalten je Werkzeug (SmartFormular-Produkte, Partner mit Vergleichsangaben), zuletzt „Ihr Produkt“.
// Acht Zeilen nach der Recherche vom 18.10.2026 (Vault: 2026-10-18_Werkzeuge_Vergleich_Kriterien_Recherche, Option A, von Robin
// gewählt): Aufgabe, Für wen, Betrieb und Daten, Sitz des Anbieters, KI, Schnittstellen, Preis und Test, Nachweise – Tatsachen, die
// jeder Anbieter für Komplettlösung wie Einzelwerkzeug liefern kann, keine Noten. Im Kopf je Spalte der Stand der Angaben. Darunter
// eine Zeile zur Herkunft der Angaben und zur Reihenfolge. Jede Spalte trägt im Kopf dasselbe Kennzeichen „Anzeige · Anbieter“ wie die
// Karten (Robin, 18.10.2026, Option C). Steckbriefe mit Filter folgen später (Option B).
function vergleich(lang, t, up) {
  const partner = PARTNER.filter(p => p.vergleich && p.vergleich[lang]);
  const spalten = [...t.vergleich.map(v => ({ ...v, anbieter: ROBIN_VISION, logo: `<span class="wz-th-logo">Smart<span>Formular</span></span>`, href: up + v.href })),
    ...partner.map(p => ({ ...p.vergleich[lang], name: p.name, anbieter: p.anbieter, logo: "", href: p.seite ? up + `werkzeuge/${p.seite}/` : p.url, sponsored: !p.seite }))];
  const kennz = s => kennzeichen(lang, anzeigeHref(lang, up), s.anbieter, "wz-th-kennz").replace(/^<p /, "<span ").replace(/<\/p>$/, "</span>");
  const zeilen = Object.entries(t.kriterien).map(([k, label]) => `<tr><th scope="row">${esc(label)}</th>${spalten.map(s => `<td>${esc(s[k] || "")}</td>`).join("")}<td class="wz-frei-spalte">${k === "aufgabe" ? esc(t.ihrProduktText) : ""}</td></tr>`).join("\n");
  return `<div class="wz-tabelle-rahmen">
<table class="wz-tabelle">
<colgroup><col class="wz-kriterium">${spalten.map(() => "<col>").join("")}<col></colgroup>
<thead><tr><th scope="col"></th>${spalten.map(s => `<th scope="col">${kennz(s)}${s.logo}${esc(s.name)}${s.stand ? `<span class="wz-th-stand">${esc(t.stand)} ${esc(s.stand)}</span>` : ""}</th>`).join("")}<th scope="col" class="wz-frei-spalte"><span class="wz-th-ihr">${esc(t.platzhalter.logo)}</span>${esc(t.ihrProdukt)}</th></tr></thead>
<tbody>
${zeilen}
<tr class="wz-tabelle-wege"><th scope="row"></th>${spalten.map(s => `<td><a href="${esc(s.href)}"${s.sponsored ? ' rel="sponsored noopener" target="_blank"' : ""}>${esc(t.zumProdukt)}</a></td>`).join("")}<td class="wz-frei-spalte"><a href="#partner">${esc(t.platzhalter.knopf)}</a></td></tr>
</tbody>
</table>
</div>
<p class="meta wz-quelle">${esc(t.vergleichQuelle)}</p>`;
}

// Die Übersicht einer Sprache
export function werkzeugeUebersicht(lang) {
  const t = TEXT[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const andere = lang === "en" ? "de" : "en", up = lang === "en" ? "../../" : "../";
  const canonical = uebersichtUrl(lang);
  const sfZiel = lang === "en" ? "../smartformular/en/" : "smartformular/";
  const main = `<article class="wz">
<h1>${esc(t.titel)}</h1>
<p class="untertitel">${esc(t.untertitel)}</p>
${grundsaetze(lang)}
<h2 id="ueberblick">${esc(t.ueberblickTitel)}</h2>
<div class="wz-raster">
${karten(lang, t, up)}
</div>
<h2 id="vergleich">${esc(t.vergleichTitel)}</h2>
<p class="wz-hinweis frei">${esc(t.vergleichLead)}</p>
${vergleich(lang, t, up)}
<section class="wz-kasten" aria-labelledby="workshops-hinweis">
<p class="kicker">${esc(t.workshopKicker)}</p>
<h2 id="workshops-hinweis">${esc(t.workshopTitel)}</h2>
<p class="frei">${esc(t.workshopText)}</p>
<p class="frei"><a class="wz-knopf zweit" href="${up}${t.workshopHref}">${esc(t.workshopKnopf)}</a></p>
</section>
<h2 id="partner">${esc(t.formTitel)}</h2>
<p class="frei">${esc(t.formLead)}</p>
<form class="wz-form wz-kasten" id="partner-anfrage" novalidate>
<div class="reihe">
<div><label for="p-firma">${esc(t.felder.firma)}</label><input type="text" id="p-firma" name="firma" maxlength="120" required autocomplete="organization"></div>
<div><label for="p-name">${esc(t.felder.name)}</label><input type="text" id="p-name" name="name" maxlength="80" required autocomplete="name"></div>
<div><label for="p-email">${esc(t.felder.email)}</label><input type="email" id="p-email" name="email" maxlength="120" required autocomplete="email"></div>
<div><label for="p-produkt">${esc(t.felder.produkt)} <span>${esc(t.felder.optional)}</span></label><input type="text" id="p-produkt" name="produkt" maxlength="200"></div>
<div><label for="p-fuer">${esc(t.felder.fuer)} <span>${esc(t.felder.optional)}</span></label><select id="p-fuer" name="fuer"><option value="">${esc(t.felder.waehlen)}</option>${t.fuerWerte.map(w => `<option>${esc(w)}</option>`).join("")}</select></div>
<div><label for="p-standort">${esc(t.felder.standort)} <span>${esc(t.felder.optional)}</span></label><select id="p-standort" name="standort"><option value="">${esc(t.felder.waehlen)}</option>${t.standortWerte.map(w => `<option>${esc(w)}</option>`).join("")}</select></div>
</div>
<label for="p-nachricht">${esc(t.felder.nachricht)} <span>${esc(t.felder.optional)}</span></label><textarea id="p-nachricht" name="nachricht" maxlength="2000"></textarea>
<div class="falle" aria-hidden="true"><label for="p-website">Website</label><input type="text" id="p-website" name="website" tabindex="-1" autocomplete="off"></div>
<button type="submit" id="partner-senden">${esc(t.senden)}</button>
<p class="status" id="partner-status" role="status" aria-live="polite"></p>
<p class="meta hinweis">${esc(t.datenschutz)}</p>
</form>
<p class="meta"><a href="${up}${UEBERSICHT_PFAD[andere].replace(/index\.html$/, "")}" lang="${andere}" hreflang="${andere}">${esc(t.andere)}</a></p>
${newsletterKasten(lang, up, "werkzeug")}
</article>
${SKRIPT(lang, t, sfZiel)}`;
  return rahmen({ lang, up, titel: t.titel, seitentitel: t.seitentitel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: uebersichtUrl(andere) }], css: CSS + "\n" + GRUNDSAETZE_CSS, main, aktiv: "tools" });
}
