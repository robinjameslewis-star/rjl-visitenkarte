// Partnerangebote (Robin, 17.10.2026): Produkte befreundeter Unternehmen und Geschäftspartner, die robin.vision gegen eine
// monatliche Gebühr und/oder Umsatzprovision auf der Website vorstellt und – sobald eine Partnervereinbarung geschlossen ist – in
// Workshops und Schulungsunterlagen als Beispiele für KI-Werkzeuge zeigt. Keine Unterscheidung zu eigenen Produkten (Robin, 18.10.2026).
// Kennzeichnung (Robin, 18.10.2026, Option C): jedes Werkzeug – SmartFormular wie Partner – trägt dasselbe kleine „Anzeige · Anbieter“
// (kennzeichen unten), das zur Erläuterung im Impressum führt (index.html, #anzeigen); Verweise zu Anbietern tragen rel="sponsored".
// Deshalb stehen unter „Werkzeuge“ nur Werkzeuge, die robin.vision selbst anbietet oder für deren Vorstellung es vergütet wird.
// Ausnahme (Robin, 23.10.2026): Eigene kostenlose Werkzeuge (FiBu lite, E-Rechnung lite) tragen statt „Anzeige · robin.vision“
// einfach „Kostenlos“ (kostenlos unten) – auf ihren Seiten, im Slider der Startseite und im Kopf ihrer Spalte im Vergleich. Partner,
// die Beta-Produkte und Stellen, die SmartFormular als Ganzes zeigen (Karte der Übersicht, Seite „SmartFormular“), bleiben bei „Anzeige“.
// Die Liste bleibt leer, bis die erste Vereinbarung steht; dann je Partner ein Eintrag, und die Seiten werden neu gebaut
// (tools/werkzeug-uebernehmen.mjs, tools/workshops-bauen.mjs).
export const PARTNER = [
  // { id: "beispiel", name: "Produktname", anbieter: "Firma GmbH" (kurz, steht am Kennzeichen), url: "https://…", verguetung: "gebuehr" | "provision" | "beides", seit: "2027-01-01",
  //   logo: "assets/partner/….svg", seite: "produkt" (eigene Produktseite unter werkzeuge/<seite>/), vergleich: { de: {…}, en: {…} } (Spalte im Vergleich,
  //   je Sprache die Felder aus dem Vergleichsbogen: stand "MM/JJJJ", aufgabe, fuer, daten (Betrieb und Datenstandort), sitz, ki (wofür, Modell
  //   und Ort, Training mit Kundendaten), schnittstellen, preis (Preismodell, „ab“, Test), nachweise – kurze Tatsachen, keine Werbesätze),
  //   text: { de: "Ein Satz, was das Werkzeug tut und wo es im Workshop vorkommt.", en: "One sentence on what the tool does and where it appears in the workshop." } },
  //   Weitere Felder: bereich: { de, en } (Chip auf der Karte), logoBreite (wie bei VORGESCHLAGEN), workshop: true (erst dann auf den
  //   Workshop-Seiten, nach Partnervereinbarung und Robins Test).
];

// Vorgeschlagene Software (Robin, 16.11.2026, nach Kanzleikern): unbezahlt vorgestellte Lösungen in der kostenlosen Testphase
// (Vereinbarung „Vorgeschlagene Software“, Unterlagen 2026-11-16). Kein „Partner“ und keine „Anzeige“, weil robin.vision dafür nicht
// vergütet wird; Kennzeichen „Vorgeschlagen · Anbieter“, Verweis ohne rel="sponsored". Nur auf robin.vision (Werkzeuge, Startseite),
// nicht auf den Workshop-Seiten: dort erst nach Robins eigenem Test. Texte nur nach den Angaben auf der Website des Anbieters.
// Logo unverändert von der Website des Anbieters (Arbeitsregeln Abschnitt 8). Sobald Geld oder ein geldwerter Vorteil fließt, wechselt
// der Eintrag nach PARTNER.
export const VORGESCHLAGEN = [
  { id: "kanzleikern", name: "Kanzleikern", anbieter: "Dashtax GbR", url: "https://kanzleikern.com/", logo: "assets/partner/kanzleikern.svg", logoBreite: 140, seit: "2026-11-16",
    quelle: "kanzleikern.com, abgerufen 16.11.2026; Freigabe Aurel Bäcker per Mail 16.11.2026",
    bereich: { de: "Kanzleiwissen", en: "Practice knowledge" },
    text: { de: "Software für Ihr Kanzleihandbuch: Abläufe und Prüfreihenfolgen an einem Ort, KI-Suche mit Quellen, per MCP in Ihrer KI.",
      en: "Software for your firm's practice manual: processes and review sequences in one place, AI search with sources, available to your own AI via MCP." } },
  // PrimeBalance (Vereinbarung 19.11.2026, Fassung des Anbieters): Stand nennen; DATEV nicht nennen (Robin, 19.11.2026); Logo unverändert.
  // Logo: Symbol und Schriftzug wie im Kopf von prime-balance.de (Robin, 19.11.2026: „prime balance hat einen schriftzug“). Der Schriftzug ist dort
  // Text in Fraunces 600 (OFL) mit den Farben der Website; als Bild nachgesetzt, Symbol unverändert.
  { id: "primebalance", name: "PrimeBalance", anbieter: "PrimeBalance UG", url: "https://www.prime-balance.de/", logo: "assets/partner/primebalance-schriftzug.png", logoBreite: 158, seit: "2026-11-19",
    quelle: "prime-balance.de, abgerufen 19.11.2026; Zustimmung Konrad Erwerle per Mail 19.11.2026",
    bereich: { de: "KI-Agenten", en: "Agentic AI" },
    text: { de: "Virtuelle KI-Kanzlei für Steuerberater: Das Team bucht Belege vor und bereitet den Monatsabschluss vor, Sie prüfen und geben frei. Mandantendaten in Frankfurt am Main. Angaben des Anbieters, Stand 19.11.2026.",
      en: "Virtual AI firm for tax advisers: the team pre-posts receipts and prepares the month-end close, you review and approve. Client data in Frankfurt am Main. Provider's information as of 19 Nov 2026." } },
  // Andreas Schoba (Robin, 19.11.2026: „das gehört jetzt zur kategorie Ki Skills“): Zustimmung per WhatsApp 19.11.2026, 16:28 („Klar“) auf Robins
  // Frage, ob er das Angebot wie auf andreas-schoba.de und im Newsletter zeigen darf. Bis zur Eintragung der UG ohne Vergütung, deshalb
  // „Vorgeschlagen“ (Robin, 20.11.2026: „das muss andreas schoba weg gilt erst ab ug eintragung“; Kennzeichen von Robin gewählt, Freigabeliste F66).
  // Mit dem ersten Partnervertrag mit Vergütung nach der Eintragung wechselt der Eintrag nach PARTNER (verguetung: "provision") und trägt wieder „Anzeige“. Logo: seine Wortmarke (WordPress-Seitenlogo logo-andreas-schoba.webp, 1000 × 170), nur der durchsichtige Rand abgeschnitten
  // (720 × 71, Pixel unverändert, als PNG). Ohne Preise und ohne die Gulde Kommunikation GmbH (dort läuft die Betreuung; keine eigene
  // Zustimmung). Nicht auf den Workshop-Seiten.
  { id: "andreas-schoba", name: "Andreas Schoba", anbieter: "Andreas Schoba", url: "https://www.optimierung-der-webseite.de/seo-newsletter/", seit: "2026-11-19",
    quelle: "optimierung-der-webseite.de/seo-newsletter (Weiterleitung von andreas-schoba.de), abgerufen 19.11.2026; Zustimmung Andreas Schoba per WhatsApp 19.11.2026",
    logo: "assets/partner/andreas-schoba.png", logoBreite: 161,
    bereich: { de: "KI-Skills", en: "AI skills" },
    text: { de: "SEO und GEO mit Claude: Andreas Schoba arbeitet mit selbst gebauten SEO-Skills und Grounding Pages, damit Unternehmen bei Google und in den Antworten von ChatGPT, Gemini und Perplexity auftauchen. Newsletter, Beratung und monatliche Betreuung. Angaben des Anbieters, Stand 19.11.2026.",
      en: "SEO and GEO with Claude: Andreas Schoba works with self-built SEO skills and grounding pages so that businesses show up on Google and in answers from ChatGPT, Gemini and Perplexity. Newsletter, consulting and monthly support. Provider's information as of 19 Nov 2026." } },
];
// Eigene Lösungen von robin.vision (Robin, 20.11.2026, nach dem Live-Gang von smartformular.ai: „smartformular ist lvie jetzt robin.vision so
// umbauen wie besprochen, samrtformular taucht dort wie jede andere ki lösung auf,“): ein Eintrag wie jede andere Lösung – eine Karte, eine
// Unterseite werkzeuge/<id>/ im Rahmen von robin.vision, von dort zur eigenen Website. Kennzeichen weiter „Anzeige · robin.vision“
// (Erläuterung im Impressum, #anzeigen: „Anbieter ist robin.vision selbst …“); kein rel="sponsored" und kein Vergütungssatz, weil niemand
// robin.vision dafür bezahlt. wortmarke: Schriftzug als Text wie im Kopf von smartformular.ai (dort kein Bild; Arbeitsregeln Abschnitt 8,
// Bezugswert 20 px Schrift) statt logo. werkzeuge: Verweise der Unterseite je Sprache (anker = Sprungmarke; frei = Kennzeichen wie
// kostenlos unten; extern = Verweis nach url + href; mehr = zweiter Verweis). FiBu lite und E-Rechnung lite liegen noch auf robin.vision
// und ziehen später um; die Texte sind die der früheren Karten im Slider der Startseite.
export const EIGENE = [
  { id: "smartformular", name: "SmartFormular", anbieter: "robin.vision", url: "https://smartformular.ai/", urlEn: "https://smartformular.ai/en/", seit: "2026-11-20",
    wortmarke: ["Smart", "Formular"],
    bereich: { de: "Rechnungswesen", en: "Accounting" },
    text: { de: "Formulare, die mitarbeiten – für die Tage, an denen der Prozess hakt. E-Rechnung lite prüft E-Rechnungen kostenlos, FiBu lite lässt sich bis 31.12.2026 kostenlos testen; Abschluss kommt als Beta.",
      en: "Forms that work with you – for the days when the process stalls. E-Rechnung lite checks e-invoices free of charge, FiBu lite is free to try until 31 December 2026; Abschluss is coming as a beta." },
    mehr: { de: "Ein SmartFormular sieht aus wie ein gewohntes Formular – und arbeitet mit. Es hilft beim Ausfüllen, sichert die Vollständigkeit und erledigt die ersten Schritte der Sachbearbeitung, während Sie noch tippen. Prüfen, entscheiden und festschreiben bleibt bei Ihnen.",
      en: "A SmartFormular looks like a familiar form – and works with you. It helps you fill it in, checks for completeness and takes the first steps of the casework while you are still typing. Checking, deciding and finalising stay with you." },
    seitentitel: { de: "SmartFormular: Werkzeuge für Buchhaltung und Jahresabschluss | robin.vision", en: "SmartFormular: tools for bookkeeping and year-end accounts | robin.vision" },
    knopf: { de: "Zu smartformular.ai", en: "To smartformular.ai" },
    werkzeuge: {
      de: [
        { anker: "fibu-lite", frei: true, name: "FiBu lite", text: "Kontoauszüge zu Buchungsstapeln – offline im Browser.", bereich: "Rechnungswesen", href: "werkzeuge/buchungsstapel-generator/" },
        { anker: "e-rechnung", frei: "erechnung", name: "E-Rechnung lite", text: "E-Rechnungen lesen, prüfen und per GiroCode bezahlen – im Browser.", bereich: "Rechnungswesen", href: "werkzeuge/e-rechnung-pruefen/" },
        { anker: "abschluss", stand: "Beta · auf Anfrage", name: "Abschluss", text: "Das Arbeitspapier für den Jahresabschluss, das mitdenkt und vorarbeitet.", bereich: "Jahresabschluss", extern: true, href: "#abschluss",
          mehr: { anker: "beta", text: "Beta-Zugang anfragen", href: "#beta" } },
      ],
      en: [
        { anker: "fibu-lite", frei: true, name: "FiBu lite", text: "Bank statements into booking batches – offline in your browser.", bereich: "Accounting", href: "werkzeuge/booking-batch-generator/" },
        { anker: "e-rechnung", frei: "erechnung", name: "E-Rechnung lite", text: "Read, check and pay e-invoices by GiroCode – in your browser.", bereich: "Accounting", href: "werkzeuge/e-invoice-viewer/" },
        { anker: "abschluss", stand: "Beta · on request", name: "Abschluss", text: "The working paper for year-end accounts that thinks ahead and does the groundwork.", bereich: "Year-end accounts", extern: true, href: "#abschluss",
          mehr: { anker: "beta", text: "Request beta access", href: "#beta" } },
      ],
    } },
];
// Wortmarke als Text in der Logobox (Karte, Slider, Unterseite)
export const wortmarke = p => `${esc(p.wortmarke[0])}<span>${esc(p.wortmarke[1])}</span>`;
// Website der Lösung in der Sprache der Seite
export const loesungUrl = (p, lang) => (lang === "en" && p.urlEn) || p.url;
// logoBreite: Breite des Logos in px auf der Seite Werkzeuge (Box 196 × 50), im Slider 88 %. Optisch abgeglichen, damit die Schrift aller
// Logos gleich hoch wirkt (Robin, 19.11.2026: „bestmögliche darstellung bei möglichst gleicher größe“); ohne Angabe 150 px.
export const LOGO_BREITE = 150, SLIDER_FAKTOR = 0.88;
export const VORSCHLAG = { de: "Vorgeschlagen", en: "Suggested" };
export const vorschlagKennzeichen = (lang, anbieter, klasse) => `<p class="${klasse}">${VORSCHLAG[lang]} · <span>${esc(anbieter)}</span></p>`;

// Unterseite je Anbieter unter den Werkzeugen (anbieter.js); hier, damit sitemap.js sie ohne Kreisimport kennt
export const anbieterAdresse = (id, lang) => lang === "en" ? `werkzeuge/${id}/en/` : `werkzeuge/${id}/`;
export const ANBIETER_SEITEN = [...VORGESCHLAGEN, ...EIGENE, ...PARTNER.filter(p => !p.seite)].flatMap(a => ["de", "en"].map(lang => ({ id: "anbieter-" + a.id, lang,
  adresse: anbieterAdresse(a.id, lang), stand: [a.seit, ...(a.aufnahmen || []).map(x => x.datum)].filter(Boolean).sort().at(-1) })));

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Kennzeichen an jedem Werkzeug: „Anzeige“ (Verweis auf die Erläuterung) und der Anbieter
export const ROBIN_VISION = "robin.vision";
export const ANZEIGE = { de: "Anzeige", en: "Ad" };
// Dezent (Robin, 18.10.2026): normale Schreibung, nicht fett, ohne Sperrung, Unterstreichung nur beim Darüberfahren – aber lesbar
export const KENNZ_CSS = `.kennz { margin: 0 0 8px; font: 400 11.5px/1.5 var(--sans); color: var(--ink-muted); }
.kennz a { color: inherit; text-decoration: none; } .kennz a:hover { text-decoration: underline; text-underline-offset: .2em; }`;
export const anzeigeHref = (lang, up) => `${up}${lang === "en" ? "?lang=en" : ""}#anzeigen`;
export const kennzeichen = (lang, href, anbieter, klasse) =>
  `<p class="${klasse}"><a href="${esc(href)}">${ANZEIGE[lang]}</a> · <span>${esc(anbieter)}</span></p>`;
// Kennzeichen eigener kostenloser Werkzeuge, gleich gestaltet, ohne Verweis
export const KOSTENLOS = { de: "Kostenlos testen bis 31.12.2026", en: "Free trial until 31 Dec 2026" };
// E-Rechnung lite (Robin, 08.11.2026): Prüfen auf der Seite dauerhaft kostenlos; Erstellen und Datei bis 31.12.2026, danach Test und Lizenz
export const KOSTENLOS_ART = { erechnung: { de: "Prüfen kostenlos", en: "Free to check" } };
export const kostenlosText = (lang, art) => (KOSTENLOS_ART[art] || KOSTENLOS)[lang];
export const kostenlos = (lang, klasse, art) => `<p class="${klasse}">${kostenlosText(lang, art)}</p>`;

// Liste der Partnerangebote für eine Seite – leer: der Hinweis, dass Partnerangebote folgen
// Nur Einträge mit workshop: true (Partnervereinbarung und Robins eigener Test); Website-Anzeigen allein bleiben außen vor.
export function partnerListe(lang, t, up) {
  const liste = PARTNER.filter(p => p.workshop);
  if (!liste.length) return `<p class="hinweis">${esc(t.partnerHinweis)}</p>`;
  return `<ul class="partner">${liste.map(p => `<li>${kennzeichen(lang, anzeigeHref(lang, up), p.anbieter, "kennzeichnung")}<a href="${esc(p.url)}" rel="sponsored noopener" target="_blank">${esc(p.name)}</a><p>${esc(p.text[lang] || p.text.de)}</p></li>`).join("\n")}</ul>`;
}
