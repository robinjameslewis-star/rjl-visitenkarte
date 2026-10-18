// Partnerangebote (Robin, 17.10.2026): Produkte befreundeter Unternehmen und Geschäftspartner, die robin.vision gegen eine
// monatliche Gebühr und/oder Umsatzprovision auf der Website vorstellt und – sobald eine Partnervereinbarung geschlossen ist – in
// Workshops und Schulungsunterlagen als Beispiele für KI-Werkzeuge zeigt. Keine Unterscheidung zu eigenen Produkten (Robin, 18.10.2026).
// Kennzeichnung (Robin, 18.10.2026, Option C): jedes Werkzeug – SmartFormular wie Partner – trägt dasselbe kleine „Anzeige · Anbieter“
// (kennzeichen unten), das zur Erläuterung im Impressum führt (index.html, #anzeigen); Verweise zu Anbietern tragen rel="sponsored".
// Deshalb stehen unter „Werkzeuge“ nur Werkzeuge, die robin.vision selbst anbietet oder für deren Vorstellung es vergütet wird.
// Die Liste bleibt leer, bis die erste Vereinbarung steht; dann je Partner ein Eintrag, und die Seiten werden neu gebaut
// (tools/werkzeug-uebernehmen.mjs, tools/workshops-bauen.mjs).
export const PARTNER = [
  // { id: "beispiel", name: "Produktname", anbieter: "Firma GmbH" (kurz, steht am Kennzeichen), url: "https://…", verguetung: "gebuehr" | "provision" | "beides", seit: "2027-01-01",
  //   logo: "assets/partner/….svg", seite: "produkt" (eigene Produktseite unter werkzeuge/<seite>/), vergleich: { de: {…}, en: {…} } (Spalte im Vergleich,
  //   je Sprache die Felder aus dem Vergleichsbogen: stand "MM/JJJJ", aufgabe, fuer, daten (Betrieb und Datenstandort), sitz, ki (wofür, Modell
  //   und Ort, Training mit Kundendaten), schnittstellen, preis (Preismodell, „ab“, Test), nachweise – kurze Tatsachen, keine Werbesätze),
  //   text: { de: "Ein Satz, was das Werkzeug tut und wo es im Workshop vorkommt.", en: "One sentence on what the tool does and where it appears in the workshop." } },
];

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

// Liste der Partnerangebote für eine Seite – leer: der Hinweis, dass Partnerangebote folgen
export function partnerListe(lang, t, up) {
  if (!PARTNER.length) return `<p class="hinweis">${esc(t.partnerHinweis)}</p>`;
  return `<ul class="partner">${PARTNER.map(p => `<li>${kennzeichen(lang, anzeigeHref(lang, up), p.anbieter, "kennzeichnung")}<a href="${esc(p.url)}" rel="sponsored noopener" target="_blank">${esc(p.name)}</a><p>${esc(p.text[lang] || p.text.de)}</p></li>`).join("\n")}</ul>`;
}
