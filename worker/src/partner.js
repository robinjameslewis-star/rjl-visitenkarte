// Partnerangebote (Robin, 17.10.2026): Produkte befreundeter Unternehmen und Geschäftspartner, die robin.vision gegen eine
// monatliche Gebühr und/oder Umsatzprovision auf der Website vorstellt und – sobald eine Partnervereinbarung geschlossen ist – in
// Workshops und Schulungsunterlagen als Beispiele für KI-Werkzeuge zeigt. Jede Vorstellung ist als Partnerangebot gekennzeichnet
// (kommerzielle Kommunikation, § 5a Abs. 4 UWG, § 6 DDG); Verweise tragen rel="sponsored". Die Liste bleibt leer, bis die erste
// Vereinbarung steht; dann je Partner ein Eintrag, und die Seiten werden neu gebaut (tools/workshops-bauen.mjs).
export const PARTNER = [
  // { id: "beispiel", name: "Produktname", anbieter: "Firma GmbH, Ort", url: "https://…", verguetung: "gebuehr" | "provision" | "beides", seit: "2027-01-01",
  //   text: { de: "Ein Satz, was das Werkzeug tut und wo es im Workshop vorkommt.", en: "One sentence on what the tool does and where it appears in the workshop." } },
];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Liste der Partnerangebote für eine Seite – leer: der Hinweis, dass Partnerangebote folgen
export function partnerListe(lang, t) {
  if (!PARTNER.length) return `<p class="hinweis">${esc(t.partnerHinweis)}</p>`;
  return `<ul class="partner">${PARTNER.map(p => `<li><span class="kennzeichnung">${esc(t.partnerKennzeichnung)}</span><a href="${esc(p.url)}" rel="sponsored noopener" target="_blank">${esc(p.name)}</a> · ${esc(p.anbieter)}<p>${esc(p.text[lang] || p.text.de)}</p></li>`).join("\n")}</ul>`;
}
