// Übersicht „Werkzeuge“ (werkzeuge/index.html, englisch werkzeuge/en/index.html; Robin, 18.10.2026): die Sparte von robin.vision als
// Berater, Coach und Vertriebspartner von Softwarelösungen – Auswählen, Einführen, Schulen –, alle Werkzeuge als gleichrangige Karten
// (SmartFormular wird vorgestellt wie eine Partnerlösung, die Produktmarke steckt nur im Logo-Feld), ein Filter nach Bereichen, ein
// Vergleich und das Formular „Partner werden“ an Gochs Kontakt-Endpunkt. Erscheinungsbild robin.vision (Papier, Grün, Kupfer); die
// Produkte haben eigene Seiten unter werkzeuge/<produkt>/ (SmartFormular: smartformular.js). Partnerangebote kommen aus partner.js und
// sind als Anzeige gekennzeichnet. Alte Sprungmarken der früheren SmartFormular-Seite (werkzeuge/#fibu …) leiten zur Produktseite weiter.
// tools/werkzeug-uebernehmen.mjs schreibt beide Fassungen; Vorlage war der Entwurf auf dem Zweig claude/werkzeuge-entwurf
// (tools/entwuerfe/werkzeuge-2026-10-18/).
import { rahmen, UEBERSICHT_PFAD } from "./werkzeug.js";
import { SMARTFORMULAR_PFAD } from "./smartformular.js";
import { PARTNER } from "./partner.js";
import { newsletterKasten } from "./kasten.js";

const SITE = "https://robin.vision/";
export const KONTAKT_ENDPUNKT = "https://goch.robin.vision/contact";
export const uebersichtUrl = lang => `${SITE}${UEBERSICHT_PFAD[lang].replace(/index\.html$/, "")}`;
// Sprungmarken der früheren SmartFormular-Seite unter werkzeuge/ (bis 18.10.2026)
export const ALTE_MARKEN = ["produkte", "fibu-lite", "fibu", "deklaration", "mensch", "programme", "sprachmodell", "fahrplan", "recht", "fragen", "beta", "downloads"];
// Bereiche der Sparte (Robin, 18.10.2026: erst „Unternehmensführung“, dann „Business-IT“, jetzt „weitere Geschäftsprozesse“)
export const BEREICHE = ["rechnungswesen", "verwaltung", "geschaeftsprozesse"];

const TEXT = {
  de: {
    titel: "Effiziente Werkzeuge für Rechnungswesen, Verwaltung und weitere Geschäftsprozesse",
    seitentitel: "Effiziente Werkzeuge und KI-Lösungen für Rechnungswesen, Verwaltung und weitere Geschäftsprozesse | robin.vision",
    beschr: "Software und KI-Lösungen für Rechnungswesen, Verwaltung und weitere Geschäftsprozesse – ausgewählt, eingeführt und geschult mit robin.vision. Mit SmartFormular, Vergleich und Partnerprogramm.",
    untertitel: "Software und KI-Lösungen, die im Alltag tragen – ausgewählt, eingeführt und geschult mit robin.vision. Viele davon zeige ich in den Workshops an echten Fällen.",
    rolle: [
      // Drei Schritte (Robin, 18.10.2026): Analysieren · Schulen · Weiterentwickeln statt Auswählen · Einführen · Schulen; die
      // Hemmschwelle soll gering sein – die Analyse kann ein Gespräch sein, im Workshop entstehen Ansätze und Hemmschwellen fallen
      ["Analysieren", "Den Anfang macht ein kurzes, unverbindliches Gespräch: Ich verschaffe mir ein Bild von Ihren Abläufen und von der Software und KI, die Sie bereits einsetzen."],
      ["Schulen", "Im Workshop erarbeiten wir gemeinsam Ansätze zur Optimierung Ihrer Prozesse – an Ihren eigenen Fällen. Dabei überwinden wir Hemmschwellen im Umgang mit KI."],
      ["Weiterentwickeln", "Was sich im Alltag bewährt, bauen wir Schritt für Schritt aus – Abläufe, Regeln und Vorlagen entwickeln sich mit Ihrem Team weiter."],
    ],
    filterLabel: "Bereiche", alle: "Alle",
    bereiche: { rechnungswesen: "Rechnungswesen", verwaltung: "Verwaltung", geschaeftsprozesse: "Weitere Geschäftsprozesse" },
    ueberblickTitel: "Werkzeuge im Überblick",
    ueberblickLead: "Eigene Produkte und ausgewählte Lösungen anderer Anbieter – von robin.vision geprüft, eingeführt und in den Workshops gezeigt. Partnerangebote sind als Anzeige gekennzeichnet.",
    partner: "Partnerangebot · Anzeige",
    sf: { text: "Formulare, die mitarbeiten – für die Tage, an denen der Prozess hakt. FiBu lite gibt es kostenlos; FiBu und Deklaration kommen als Beta.",
      chips: ["Rechnungswesen", "Im Workshop gezeigt", "Einführung"], knopf: "Zu SmartFormular" },
    platzhalter: { logo: "Ihr Logo", titel: "Hier könnte Ihr Produkt stehen",
      text: "Sie entwickeln Software oder KI-Lösungen für Rechnungswesen, Verwaltung oder weitere Geschäftsprozesse? Ich stelle ausgewählte Lösungen hier vor, zeige sie in meinen Workshops und auf Fachmessen.",
      chips: ["Website", "Workshops", "Fachmessen"], knopf: "Partner werden" },
    frei: "Platz frei", zumProdukt: "Zum Produkt", zumAnbieter: "Zum Anbieter",
    vergleichTitel: "Im Vergleich",
    vergleichLead: "Was die Werkzeuge leisten, wo die Daten liegen und wie sie sich an Ihr Programm anschließen.",
    ihrProdukt: "Ihr Produkt",
    kriterien: { bereich: "Bereich", aufgabe: "Aufgabe", fuer: "Für wen", daten: "Daten", programme: "Programme", modell: "Sprach\u00ADmodell" },
    vergleich: [
      { name: "FiBu lite", href: "werkzeuge/buchungsstapel-generator/", bereich: "Rechnungswesen", aufgabe: "Kontoauszüge zu Buchungsstapeln", fuer: "Kanzleien und Unternehmen",
        daten: "Bleiben auf Ihrem Rechner", programme: "DATEV-Format", modell: "Nein" },
      { name: "FiBu", href: "werkzeuge/smartformular/#fibu", bereich: "Rechnungswesen", aufgabe: "Bank, Kreditoren und Debitoren buchen, Bezug zu den offenen Posten", fuer: "Sachbearbeitung in Kanzlei und Unternehmen",
        daten: "Rechenzentren in der EU", programme: "DATEV und ADDISON zum Start, weitere folgen", modell: "Optional, EU, ohne Training" },
      { name: "Deklaration", href: "werkzeuge/smartformular/#deklaration", bereich: "Jahresabschluss", aufgabe: "Arbeitspapier, das mitdenkt und vorarbeitet", fuer: "Kanzleien",
        daten: "Rechenzentren in der EU", programme: "Neben Ihrem Kanzleiprogramm", modell: "Optional, EU, ohne Training" },
    ],
    ihrBereich: "Verwaltung, weitere Geschäftsprozesse …",
    formTitel: "Partner werden",
    formLead: "Stellen Sie Ihre Lösung hier, in meinen Workshops und bei meinen Auftritten auf Fachmessen und Netzwerkveranstaltungen vor. Erzählen Sie mir kurz von Ihrem Produkt; ich melde mich persönlich per E-Mail.",
    felder: { firma: "Unternehmen", name: "Ansprechperson", email: "E-Mail-Adresse", produkt: "Produkt oder Website", bereich: "Bereich", nachricht: "Worum geht es?", optional: "(freiwillig)", mehrere: "Mehrere" },
    senden: "Anfrage senden", sendet: "Wird gesendet …",
    gesendet: "Danke – Ihre Anfrage ist angekommen. Ich melde mich per E-Mail.",
    ungueltig: "Bitte Unternehmen, Ansprechperson und eine gültige E-Mail-Adresse angeben.",
    fehler: "Das Senden hat nicht geklappt. Schreiben Sie mir bitte direkt an robin@robin.vision.",
    datenschutz: "Ihre Angaben gehen per E-Mail an mich und werden nur für die Antwort verwendet. Einzelheiten stehen unter Impressum · Datenschutz.",
    betreff: "Partneranfrage: Werkzeuge auf robin.vision",
    workshopKicker: "In den Workshops", workshopTitel: "Werkzeuge erleben, bevor Sie entscheiden",
    workshopText: "Im Workshop zeige ich eigene Produkte und Partnerlösungen an Fällen aus Ihrem Alltag – und Ihr Team baut selbst ein kleines Werkzeug für einen echten Schmerzpunkt.",
    workshopKnopf: "Zu den Workshops", workshopHref: "workshops/",
    andere: "This page in English",
  },
  en: {
    titel: "Efficient tools for accounting, administration and other business processes",
    seitentitel: "Efficient tools and AI solutions for accounting, administration and other business processes | robin.vision",
    beschr: "Software and AI solutions for accounting, administration and other business processes – selected, implemented and learned with robin.vision. With SmartFormular, a comparison and a partner programme.",
    untertitel: "Software and AI solutions that hold up in daily work – selected, implemented and learned with robin.vision. I show many of them in the workshops using real cases.",
    rolle: [
      ["Analyse", "It starts with a short, no-obligation call: I get a picture of your processes and of the software and AI you already use."],
      ["Train", "In the workshop we develop ways to improve your processes together, using your own cases – and overcome any hesitation about working with AI."],
      ["Develop", "We build step by step on what works in practice – your processes, rules and templates evolve with your team."],
    ],
    filterLabel: "Areas", alle: "All",
    bereiche: { rechnungswesen: "Accounting", verwaltung: "Administration", geschaeftsprozesse: "Other business processes" },
    ueberblickTitel: "Tools at a glance",
    ueberblickLead: "Own products and selected solutions from other providers – tested, implemented and shown in the workshops by robin.vision. Partner offers are labelled as advertisements.",
    partner: "Partner offer · Advertisement",
    sf: { text: "Forms that work with you – for the days when the process stalls. FiBu lite is free; FiBu and Deklaration are coming as a beta.",
      chips: ["Accounting", "Shown in the workshop", "Implementation"], knopf: "To SmartFormular" },
    platzhalter: { logo: "Your logo", titel: "Your product could be here",
      text: "You develop software or AI solutions for accounting, administration or other business processes? I present selected solutions here and show them in my workshops and at trade fairs.",
      chips: ["Website", "Workshops", "Trade fairs"], knopf: "Become a partner" },
    frei: "Space available", zumProdukt: "To the product", zumAnbieter: "To the provider",
    vergleichTitel: "Comparison",
    vergleichLead: "What the tools do, where the data is kept and how they connect to your software.",
    ihrProdukt: "Your product",
    kriterien: { bereich: "Area", aufgabe: "Task", fuer: "For whom", daten: "Data", programme: "Software", modell: "Language model" },
    vergleich: [
      { name: "FiBu lite", href: "werkzeuge/booking-batch-generator/", bereich: "Accounting", aufgabe: "Bank statements into booking batches", fuer: "Firms and companies",
        daten: "Stays on your computer", programme: "DATEV format", modell: "No" },
      { name: "FiBu", href: "werkzeuge/smartformular/en/#fibu", bereich: "Accounting", aufgabe: "Post bank, payables and receivables, linked to open items", fuer: "Accounting staff in firms and companies",
        daten: "Data centres in the EU", programme: "DATEV and ADDISON at launch, more to follow", modell: "Optional, EU, no training" },
      { name: "Deklaration", href: "werkzeuge/smartformular/en/#deklaration", bereich: "Year-end accounts", aufgabe: "Working paper that thinks ahead and does the groundwork", fuer: "Accounting firms",
        daten: "Data centres in the EU", programme: "Alongside your firm's software", modell: "Optional, EU, no training" },
    ],
    ihrBereich: "Administration, other business processes …",
    formTitel: "Become a partner",
    formLead: "Present your solution here, in my workshops and when I appear at trade fairs and networking events. Tell me briefly about your product; I will get back to you personally by email.",
    felder: { firma: "Company", name: "Contact person", email: "Email address", produkt: "Product or website", bereich: "Area", nachricht: "What is it about?", optional: "(optional)", mehrere: "Several" },
    senden: "Send enquiry", sendet: "Sending …",
    gesendet: "Thank you – your enquiry has arrived. I will get back to you by email.",
    ungueltig: "Please give your company, a contact person and a valid email address.",
    fehler: "Sending did not work. Please email me directly at robin@robin.vision.",
    datenschutz: "Your details are emailed to me and used only to reply. Details are under Legal notice · Privacy.",
    betreff: "Partner enquiry: tools on robin.vision",
    workshopKicker: "In the workshops", workshopTitel: "Experience tools before you decide",
    workshopText: "In the workshop I show own products and partner solutions using cases from your daily work – and your team builds a small tool for a real pain point itself.",
    workshopKnopf: "To the workshops", workshopHref: "workshops/en/",
    andere: "Diese Seite auf Deutsch",
  },
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SF_LOGO = `<span class="wz-logo wz-logo-sf" aria-hidden="true">Smart<span>Formular</span></span>`;

const CSS = `.wz .frei { text-align: left; hyphens: manual; }
.wz-rolle { list-style: none; margin: 26px 0 30px; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.wz-rolle li { margin: 0; max-width: none; padding: 16px 18px 16px 0; text-align: left; }
.wz-rolle li + li { padding-left: 18px; border-left: 1px solid var(--line); }
.wz-rolle .nr { display: block; font: 500 12px/1.6 var(--sans); letter-spacing: .18em; color: var(--copper); }
.wz-rolle strong { display: block; font: 500 20px/1.3 var(--serif); color: var(--green); margin: 2px 0 4px; }
.wz-rolle .was { display: block; font-size: 15px; color: var(--ink-soft); }
.wz-filter { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 6px; }
.wz-filter button { padding: 6px 14px; border: 1px solid var(--line); border-radius: 999px; font: 400 14px/1.4 var(--sans); color: var(--ink-soft); background: rgba(255,255,255,.5); cursor: pointer; }
.wz-filter button:hover { border-color: var(--green); color: var(--green); }
.wz-filter button[aria-pressed="true"] { background: var(--green); border-color: var(--green); color: var(--paper); }
.wz-hinweis { color: var(--ink-soft); font-size: 15px; }
.wz-raster { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 10px 0 18px; }
.wz-karte { margin: 0; padding: 22px 22px 18px; border: 1px solid var(--line); border-radius: 6px; background: rgba(255,255,255,.55); display: flex; flex-direction: column; }
.wz-karte[hidden] { display: none; }
.wz-karte h3 { margin: 0 0 8px; font: 500 22px/1.25 var(--serif); color: var(--green); }
.wz-karte p { font-size: 15px; color: var(--ink-soft); max-width: none; }
.wz-karte > p:last-child { margin-top: auto; margin-bottom: 0; }
.wz-karte .wz-kennz, .wz-karte .wz-kat { margin: 0 0 12px; font: 500 11px/1.6 var(--sans); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-muted); }
.wz-karte .wz-kat { color: var(--copper); margin: 0; }
.wz-karte .wz-frei-text { margin: 0; font: 400 18px/1.3 var(--serif); color: var(--ink-muted); }
.wz-logo { width: max-content; height: 44px; padding: 0 16px; display: flex; align-items: center; margin: 0 0 14px; border: 1px dashed var(--line); border-radius: 4px; font: 500 12px/1 var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-muted); background: rgba(255,255,255,.6); }
.wz-logo img { max-height: 32px; width: auto; }
.wz-logo-sf { border: 0; background: #0E0B14; color: #fff; font-size: 15px; letter-spacing: .01em; text-transform: none; } .wz-logo-sf span { color: #A78BFA; }
.wz-platzhalter { border: 1.5px dashed var(--copper); }
.wz-chips { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 14px; padding: 0; }
.wz-chips li { margin: 0; padding: 4px 10px; border: 1px solid var(--line); border-radius: 3px; font-size: 13px; color: var(--ink-soft); background: rgba(255,255,255,.6); text-align: left; }
.wz-frei { border: 1px dashed var(--line); background: rgba(255,255,255,.25); justify-content: space-between; min-height: 110px; }
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
  .wz-rolle { grid-template-columns: 1fr; }
  .wz-rolle li + li { padding-left: 0; border-left: 0; border-top: 1px solid var(--line); }
  .wz-raster, .wz-form .reihe { grid-template-columns: 1fr; }
  .wz-tabelle { min-width: 620px; }
  .wz-frei { min-height: 90px; }
}`;

// Browser-Teil: Filter nach Bereichen, „Partner werden“ an Gochs Kontakt-Endpunkt (wie die Beta-Anfrage auf der SmartFormular-Seite:
// Felder zu einer Nachricht, Falle „website“, Ladezeitpunkt t) und Weiterleitung alter Sprungmarken zur SmartFormular-Produktseite
const SKRIPT = (lang, t, sfZiel) => `<script>
(() => {
  'use strict';
  const alt = ${JSON.stringify(ALTE_MARKEN)}, marke = location.hash.slice(1);
  if (alt.includes(marke)) { location.replace(${JSON.stringify(sfZiel)} + '#' + marke); return; }
  const knoepfe = [...document.querySelectorAll('.wz-filter button')], karten = [...document.querySelectorAll('.wz-raster [data-bereiche]')];
  knoepfe.forEach(k => k.addEventListener('click', () => {
    knoepfe.forEach(x => x.setAttribute('aria-pressed', String(x === k)));
    const b = k.dataset.bereich;
    karten.forEach(c => { const liste = c.dataset.bereiche.split(' '); c.hidden = !(b === 'alle' || liste.includes('alle') || liste.includes(b)); });
  }));
  const form = document.getElementById('partner-anfrage'); if (!form) return;
  const status = document.getElementById('partner-status'), knopf = document.getElementById('partner-senden'), geladen = Date.now();
  const T = ${JSON.stringify({ betreff: t.betreff, firma: t.felder.firma, produkt: t.felder.produkt, bereich: t.felder.bereich, sendet: t.sendet, gesendet: t.gesendet, ungueltig: t.ungueltig, fehler: t.fehler })};
  const say = (text, art) => { status.textContent = text; status.className = 'status' + (art ? ' ' + art : ''); };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const firma = (d.firma || '').trim(), name = (d.name || '').trim(), email = (d.email || '').trim();
    if (firma.length < 2 || name.length < 2 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)) { say(T.ungueltig, 'warn'); return; }
    const message = [T.betreff, '', T.firma + ': ' + firma, d.produkt ? T.produkt + ': ' + d.produkt.trim() : null, T.bereich + ': ' + (d.bereich || ''), '', (d.nachricht || '').trim()].filter(x => x !== null).join('\\n').trim();
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

// Karten aller Werkzeuge: SmartFormular, dann die Partnerangebote (partner.js), dann der Platzhalter und freie Plätze je Bereich
function karten(lang, t, up) {
  const sfHref = up + SMARTFORMULAR_PFAD[lang].replace(/index\.html$/, "");
  const chips = liste => `<ul class="wz-chips">${liste.map(c => `<li>${esc(c)}</li>`).join("")}</ul>`;
  // SmartFormular ohne Kennzeichnung („Produkt von robin.vision“ entfällt, Robin 18.10.2026); die leere Zeile hält die Karten in einer Flucht
  const sf = `<article class="wz-karte" data-bereiche="rechnungswesen">
<p class="wz-kennz frei" aria-hidden="true">&nbsp;</p>
${SF_LOGO}
<h3>SmartFormular</h3>
<p class="frei">${esc(t.sf.text)}</p>
${chips(t.sf.chips)}
<p class="frei"><a class="wz-knopf" href="${sfHref}">${esc(t.sf.knopf)}</a></p>
</article>`;
  const partner = PARTNER.map(p => {
    const bereiche = (p.bereiche || []).filter(b => BEREICHE.includes(b));
    const seite = p.seite ? up + `werkzeuge/${p.seite}/` : null;
    return `<article class="wz-karte" data-bereiche="${esc(bereiche.join(" ") || "alle")}">
<p class="wz-kennz frei">${esc(t.partner)}</p>
<span class="wz-logo" aria-hidden="true">${p.logo ? `<img src="${esc(up + p.logo)}" alt="">` : esc(p.name)}</span>
<h3>${esc(p.name)}</h3>
<p class="frei">${esc((p.text && (p.text[lang] || p.text.de)) || "")}</p>
${chips(bereiche.map(b => t.bereiche[b]))}
<p class="frei">${seite ? `<a class="wz-knopf" href="${seite}">${esc(t.zumProdukt)}</a>` : `<a class="wz-knopf" href="${esc(p.url)}" rel="sponsored noopener" target="_blank">${esc(t.zumAnbieter)}</a>`}</p>
</article>`;
  });
  const platz = `<article class="wz-karte wz-platzhalter" data-bereiche="alle">
<p class="wz-kennz frei">${esc(t.partner)}</p>
<span class="wz-logo" aria-hidden="true">${esc(t.platzhalter.logo)}</span>
<h3>${esc(t.platzhalter.titel)}</h3>
<p class="frei">${esc(t.platzhalter.text)}</p>
${chips(t.platzhalter.chips)}
<p class="frei"><a class="wz-knopf zweit" href="#partner">${esc(t.platzhalter.knopf)}</a></p>
</article>`;
  const belegt = new Set(["rechnungswesen", ...PARTNER.flatMap(p => p.bereiche || [])]);
  const freie = BEREICHE.filter(b => !belegt.has(b)).map(b => `<article class="wz-karte wz-frei" data-bereiche="${b}"><p class="wz-kat frei">${esc(t.bereiche[b])}</p><p class="wz-frei-text frei">${esc(t.frei)}</p></article>`);
  return [sf, ...partner, platz, ...freie].join("\n");
}

// Vergleichstabelle: Spalten je Werkzeug (SmartFormular-Produkte, Partner mit Vergleichsangaben), zuletzt „Ihr Produkt“;
// Zeilen „Stand“ und „Einführung und Schulung“ entfallen seit 18.10.2026 (Robin)
function vergleich(lang, t, up) {
  const spalten = [...t.vergleich.map(v => ({ ...v, logo: `<span class="wz-th-logo">Smart<span>Formular</span></span>`, href: up + v.href })),
    ...PARTNER.filter(p => p.vergleich && p.vergleich[lang]).map(p => ({ ...p.vergleich[lang], name: p.name, logo: "", href: p.seite ? up + `werkzeuge/${p.seite}/` : p.url, sponsored: !p.seite }))];
  const zeilen = Object.entries(t.kriterien).map(([k, label]) => `<tr><th scope="row">${esc(label)}</th>${spalten.map(s => `<td>${esc(s[k] || "")}</td>`).join("")}<td class="wz-frei-spalte">${k === "bereich" ? esc(t.ihrBereich) : ""}</td></tr>`).join("\n");
  return `<div class="wz-tabelle-rahmen">
<table class="wz-tabelle">
<colgroup><col class="wz-kriterium">${spalten.map(() => "<col>").join("")}<col></colgroup>
<thead><tr><th scope="col"></th>${spalten.map(s => `<th scope="col">${s.logo}${esc(s.name)}</th>`).join("")}<th scope="col" class="wz-frei-spalte"><span class="wz-th-ihr">${esc(t.platzhalter.logo)}</span>${esc(t.ihrProdukt)}</th></tr></thead>
<tbody>
${zeilen}
<tr class="wz-tabelle-wege"><th scope="row"></th>${spalten.map(s => `<td><a href="${esc(s.href)}"${s.sponsored ? ' rel="sponsored noopener" target="_blank"' : ""}>${esc(t.zumProdukt)}</a></td>`).join("")}<td class="wz-frei-spalte"><a href="#partner">${esc(t.platzhalter.knopf)}</a></td></tr>
</tbody>
</table>
</div>`;
}

// Die Übersicht einer Sprache
export function werkzeugeUebersicht(lang) {
  const t = TEXT[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const andere = lang === "en" ? "de" : "en", up = lang === "en" ? "../../" : "../";
  const canonical = uebersichtUrl(lang);
  const sfZiel = lang === "en" ? "../smartformular/en/" : "smartformular/";
  const filter = `<div class="wz-filter" role="group" aria-label="${esc(t.filterLabel)}"><button type="button" data-bereich="alle" aria-pressed="true">${esc(t.alle)}</button>${BEREICHE.map(b => `<button type="button" data-bereich="${b}" aria-pressed="false">${esc(t.bereiche[b])}</button>`).join("")}</div>`;
  const main = `<article class="wz">
<h1>${esc(t.titel)}</h1>
<p class="untertitel">${esc(t.untertitel)}</p>
<ol class="wz-rolle">
${t.rolle.map(([titel, was], i) => `<li><span class="nr">0${i + 1}</span><strong>${esc(titel)}</strong><span class="was">${esc(was)}</span></li>`).join("\n")}
</ol>
${filter}
<h2 id="ueberblick">${esc(t.ueberblickTitel)}</h2>
<p class="wz-hinweis frei">${esc(t.ueberblickLead)}</p>
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
</div>
<label for="p-bereich">${esc(t.felder.bereich)}</label><select id="p-bereich" name="bereich">${BEREICHE.map(b => `<option value="${esc(t.bereiche[b])}">${esc(t.bereiche[b])}</option>`).join("")}<option value="${esc(t.felder.mehrere)}">${esc(t.felder.mehrere)}</option></select>
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
    alternates: [{ lang, href: canonical }, { lang: andere, href: uebersichtUrl(andere) }], css: CSS, main, aktiv: "tools" });
}
