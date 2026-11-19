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
  //   Weitere Felder: bereich: { de, en } (Chip auf der Karte), logoBreite (wie bei VORGESCHLAGEN), logoText (ohne Logo-Datei: Name als Text in der
  //   Box, Schrift wie im Kopf der Anbieter-Website), workshop: true (erst dann auf den Workshop-Seiten, nach Partnervereinbarung und Robins Test).
  // Andreas Schoba (Robin, 19.11.2026: „das gehört jetzt zur kategorie Ki Skills“): Zustimmung per WhatsApp 19.11.2026, 16:28 („Klar“) auf Robins
  // Frage, ob er das Angebot wie auf andreas-schoba.de und im Newsletter zeigen darf. Provision für vermittelte Kunden (Robin, 19.11.2026), deshalb
  // „Anzeige“. Kein Logo auf seiner Website: Name als Text. Ohne Preise und ohne die Gulde Kommunikation GmbH (dort läuft die Betreuung; keine
  // eigene Zustimmung). Nicht auf den Workshop-Seiten.
  { id: "andreas-schoba", name: "Andreas Schoba", anbieter: "Andreas Schoba", url: "https://www.optimierung-der-webseite.de/seo-newsletter/", verguetung: "provision", seit: "2026-11-19",
    quelle: "optimierung-der-webseite.de/seo-newsletter (Weiterleitung von andreas-schoba.de), abgerufen 19.11.2026; Zustimmung Andreas Schoba per WhatsApp 19.11.2026",
    logoText: "Andreas Schoba",
    bereich: { de: "KI-Skills", en: "AI skills" },
    text: { de: "SEO und GEO mit Claude: Andreas Schoba arbeitet mit selbst gebauten SEO-Skills und Grounding Pages, damit Unternehmen bei Google und in den Antworten von ChatGPT, Gemini und Perplexity auftauchen. Newsletter, Beratung und monatliche Betreuung. Angaben des Anbieters, Stand 19.11.2026.",
      en: "SEO and GEO with Claude: Andreas Schoba works with self-built SEO skills and grounding pages so that businesses show up on Google and in answers from ChatGPT, Gemini and Perplexity. Newsletter, consulting and monthly support. Provider's information as of 19 Nov 2026." } },
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
];
// logoBreite: Breite des Logos in px auf der Seite Werkzeuge (Box 196 × 50), im Slider 88 %. Optisch abgeglichen, damit die Schrift aller
// Logos gleich hoch wirkt (Robin, 19.11.2026: „bestmögliche darstellung bei möglichst gleicher größe“); ohne Angabe 150 px.
export const LOGO_BREITE = 150, SLIDER_FAKTOR = 0.88;
export const VORSCHLAG = { de: "Vorgeschlagen", en: "Suggested" };
export const vorschlagKennzeichen = (lang, anbieter, klasse) => `<p class="${klasse}">${VORSCHLAG[lang]} · <span>${esc(anbieter)}</span></p>`;

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
