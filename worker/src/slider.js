// Werkzeug-Slider auf der Startseite (index.html, Abschnitt #werkzeuge; Robin, 18.10.2026): je Produkt eine Karte, alle gleich
// gekennzeichnet („Anzeige · Anbieter“, Verweis auf die Erläuterung #anzeigen im Impressum; keine Unterscheidung zwischen eigenen
// Produkten und Partnern), mit Logo, Name, einem Satz, Bereich und „Zum Produkt“ – heute die SmartFormular-Produkte, danach die Lösungen aus partner.js.
// Die Karte für Anbieter steht seit Welle 2 der Textprüfung (Robin, 23.10.2026, Option B) als Hinweis weiter unten (index.html, #anbieter). Je Sprache ein Slider; language.js blendet den der anderen Sprache über data-langs aus.
// Ohne Skript lässt er sich wischen und scrollen, das kleine Skript in index.html ergänzt Pfeile und Punkte. Stile in index.html (.wzs).
// tools/werkzeug-uebernehmen.mjs setzt das Ergebnis zwischen die Marken <!-- werkzeuge:liste --> ein.
import { PARTNER, ROBIN_VISION, kennzeichen, kostenlos } from "./partner.js";

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TEXT = {
  de: { label: "Werkzeuge", rolle: "Karussell", zurueck: "Zurück", weiter: "Weiter",
    zumProdukt: "Zum Produkt", zumAnbieter: "Zum Anbieter",
    produkte: [
      { frei: true, name: "FiBu lite", text: "Kontoauszüge zu Buchungsstapeln – offline im Browser.", bereich: "Rechnungswesen", href: "werkzeuge/buchungsstapel-generator/" },
      { frei: "erechnung", name: "E-Rechnung lite", text: "E-Rechnungen lesen, prüfen und per GiroCode bezahlen – im Browser.", bereich: "Rechnungswesen", href: "werkzeuge/e-rechnung-pruefen/" },
      { name: "FiBu", text: "Bank, Kreditoren und Debitoren buchen – mit Bezug zu den offenen Posten.", bereich: "Rechnungswesen", href: "werkzeuge/smartformular/#fibu" },
      { name: "Abschluss", text: "Das Arbeitspapier für den Jahresabschluss, das mitdenkt und vorarbeitet.", bereich: "Jahresabschluss", href: "werkzeuge/smartformular/#abschluss" },
    ] },
  en: { label: "Tools", rolle: "Carousel", zurueck: "Previous", weiter: "Next",
    zumProdukt: "To the product", zumAnbieter: "To the provider",
    produkte: [
      { frei: true, name: "FiBu lite", text: "Bank statements into booking batches – offline in your browser.", bereich: "Accounting", href: "werkzeuge/booking-batch-generator/" },
      { frei: "erechnung", name: "E-Rechnung lite", text: "Read, check and pay e-invoices by GiroCode – in your browser.", bereich: "Accounting", href: "werkzeuge/e-invoice-viewer/" },
      { name: "FiBu", text: "Post bank, payables and receivables – linked to your open items.", bereich: "Accounting", href: "werkzeuge/smartformular/en/#fibu" },
      { name: "Abschluss", text: "The working paper for year-end accounts that thinks ahead and does the groundwork.", bereich: "Year-end accounts", href: "werkzeuge/smartformular/en/#abschluss" },
    ] },
};

// Produkte je Sprache, auch für die Kartenreihe auf der Seite Werkzeuge (uebersicht.js; Robin, 03.11.2026)
export const PRODUKTE = { de: TEXT.de.produkte, en: TEXT.en.produkte };

const karte = ({ kennz = "", logo, name, text, bereich, href, link, sponsored = false }) => `        <article class="wzs-karte">
          ${kennz ? kennz + "\n          " : ""}${logo}
          <h3>${esc(name)}</h3>
          <p>${esc(text)}</p>
          <p class="wzs-fuss"><span class="wzs-bereich">${esc(bereich)}</span><a href="${esc(href)}"${sponsored ? ' rel="sponsored noopener" target="_blank"' : ""}>${esc(link)}</a></p>
        </article>`;

// Slider einer Sprache
export function slider(lang) {
  const t = TEXT[lang];
  const sfLogo = `<div class="wzs-logo wzs-logo-sf" aria-hidden="true">Smart<span>Formular</span></div>`;
  const kennz = anbieter => kennzeichen(lang, "#anzeigen", anbieter, "wzs-kennz");
  // Eigene kostenlose Werkzeuge: „Kostenlos“ statt „Anzeige · robin.vision“ (Robin, 23.10.2026)
  const eigene = t.produkte.map(p => karte({ kennz: p.frei ? kostenlos(lang, "wzs-kennz", p.frei) : kennz(ROBIN_VISION), logo: sfLogo, name: p.name, text: p.text, bereich: p.bereich, href: p.href, link: t.zumProdukt }));
  const partner = PARTNER.map(p => karte({ kennz: kennz(p.anbieter), logo: `<div class="wzs-logo" aria-hidden="true">${p.logo ? `<img src="${esc(p.logo)}" alt="">` : esc(p.name)}</div>`,
    name: p.name, text: (p.text && (p.text[lang] || p.text.de)) || "", bereich: p.bereich || "",
    href: p.seite ? `werkzeuge/${p.seite}/` : p.url, link: p.seite ? t.zumProdukt : t.zumAnbieter, sponsored: !p.seite }));
  const alle = [...eigene, ...partner];
  return `    <div class="wzs" data-langs="${lang}"${lang === "de" ? "" : " hidden"} aria-roledescription="${t.rolle}" aria-label="${t.label}">
      <div class="wzs-spur" tabindex="0">
${alle.join("\n")}
      </div>
      <div class="wzs-steuerung"><button type="button" class="wzs-pfeil" data-richtung="-1" aria-label="${t.zurueck}">←</button><span class="wzs-punkte" aria-hidden="true">${alle.map((_, i) => `<i${i ? "" : ' class="an"'}></i>`).join("")}</span><button type="button" class="wzs-pfeil" data-richtung="1" aria-label="${t.weiter}">→</button></div>
    </div>`;
}

// Beide Sprachen für die Startseite
export const startSlider = () => `${slider("de")}\n${slider("en")}`;
