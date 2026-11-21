// Werkzeug-Slider auf der Startseite (index.html, Abschnitt #werkzeuge; Robin, 18.10.2026): je Produkt eine Karte, alle gleich
// gekennzeichnet („Anzeige · Anbieter“, Verweis auf die Erläuterung #anzeigen im Impressum; keine Unterscheidung zwischen eigenen
// Produkten und Partnern), mit Logo, Name, einem Satz, Bereich und „Zum Produkt“ – die Lösungen aus partner.js.
// Die Karte für Anbieter steht seit Welle 2 der Textprüfung (Robin, 23.10.2026, Option B) als Hinweis weiter unten (index.html, #anbieter). Je Sprache ein Slider; language.js blendet den der anderen Sprache über data-langs aus.
// Ohne Skript lässt er sich wischen und scrollen, das kleine Skript in index.html ergänzt Pfeile und Punkte. Stile in index.html (.wzs).
// tools/werkzeug-uebernehmen.mjs setzt das Ergebnis zwischen die Marken <!-- werkzeuge:liste --> ein.
// Seit 20.11.2026 (Robin, nach dem Live-Gang von smartformular.ai: „samrtformular taucht dort wie jede andere ki lösung auf“) steht
// SmartFormular hier mit einer Karte wie jede andere Lösung (partner.js, EIGENE) statt mit drei Produktkarten.
import { PARTNER, VORGESCHLAGEN, EIGENE, LOGO_BREITE, SLIDER_FAKTOR, kennzeichen, vorschlagKennzeichen, kostenlos, anbieterAdresse, wortmarke } from "./partner.js";

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TEXT = {
  de: { label: "Werkzeuge", rolle: "Karussell", zurueck: "Zurück", weiter: "Weiter", zumProdukt: "Zum Produkt", zumAnbieter: "Zum Anbieter" },
  en: { label: "Tools", rolle: "Carousel", zurueck: "Previous", weiter: "Next", zumProdukt: "To the product", zumAnbieter: "To the provider" },
};

// Robin wählt noch (Freigabeliste F62): false = nur die eine Karte „SmartFormular“ (streng „wie jede andere“; FiBu lite und E-Rechnung
// lite erreicht man über die Unterseite und über smartformular.ai). true = die kostenlosen Werkzeuge der eigenen Lösungen (partner.js,
// werkzeuge mit frei) behalten daneben ihre eigenen Karten mit „Kostenlos“, bis sie umziehen. Danach neu bauen (tools/werkzeug-uebernehmen.mjs).
export const EIGENE_WERKZEUGE_IM_SLIDER = false;

const karte = ({ kennz = "", logo, name, text, bereich, href, link, sponsored = false, extern = false }) => `        <article class="wzs-karte">
          ${kennz ? kennz + "\n          " : ""}${logo}
          <h3>${esc(name)}</h3>
          <p>${esc(text)}</p>
          <p class="wzs-fuss"><span class="wzs-bereich">${esc(bereich)}</span><a href="${esc(href)}"${sponsored ? ' rel="sponsored noopener" target="_blank"' : extern ? ' rel="noopener" target="_blank"' : ""}>${esc(link)}</a></p>
        </article>`;

// Slider einer Sprache
export function slider(lang, { werkzeuge = EIGENE_WERKZEUGE_IM_SLIDER } = {}) {
  const t = TEXT[lang];
  const kennz = anbieter => kennzeichen(lang, "#anzeigen", anbieter, "wzs-kennz");
  const logo = p => p.wortmarke ? `<div class="wzs-logo wzs-logo-sf" aria-hidden="true">${wortmarke(p)}</div>`
    : p.logo ? `<div class="wzs-logo wzs-logo-bild" aria-hidden="true"><img src="${esc(p.logo)}" alt="" width="${Math.round((p.logoBreite || LOGO_BREITE) * SLIDER_FAKTOR)}"></div>`
    : `<div class="wzs-logo" aria-hidden="true">${esc(p.name)}</div>`;
  // Eine Karte je Lösung, alle gleich gebaut; nur das Kennzeichen unterscheidet sich
  const loesung = (p, kennzeichnung) => karte({ kennz: kennzeichnung, logo: logo(p), name: p.name, text: (p.text && (p.text[lang] || p.text.de)) || "",
    bereich: p.bereich ? (p.bereich[lang] || p.bereich.de) : "", href: p.seite ? `werkzeuge/${p.seite}/` : anbieterAdresse(p.id, lang), link: t.zumProdukt });
  // Eigene Lösungen (SmartFormular): seit 21.11.2026 „Vorgeschlagen · robin.vision“ (Robin); auf Wunsch dazu die kostenlosen Werkzeuge mit „Kostenlos“ (Robin, 23.10.2026)
  const eigene = EIGENE.flatMap(p => [loesung(p, vorschlagKennzeichen(lang, p.anbieter, "wzs-kennz")), ...(werkzeuge ? ((p.werkzeuge && p.werkzeuge[lang]) || []).filter(w => w.frei)
    .map(w => karte({ kennz: kostenlos(lang, "wzs-kennz", w.frei), logo: logo(p), name: w.name, text: w.text, bereich: w.bereich, href: w.extern ? (lang === "en" ? p.urlEn : p.url) + w.href : w.href, extern: !!w.extern, link: t.zumProdukt })) : [])]);
  const partner = PARTNER.map(p => loesung(p, kennz(p.anbieter)));
  const vorgeschlagen = VORGESCHLAGEN.map(p => loesung(p, vorschlagKennzeichen(lang, p.anbieter, "wzs-kennz")));
  // Vorgeschlagene Software zuerst (Robin, 16.11.2026: „kanzleikern dann vor smartformular auf der startseite“)
  const alle = [...vorgeschlagen, ...eigene, ...partner];
  return `    <div class="wzs" data-langs="${lang}"${lang === "de" ? "" : " hidden"} aria-roledescription="${t.rolle}" aria-label="${t.label}">
      <div class="wzs-spur" tabindex="0">
${alle.join("\n")}
      </div>
      <div class="wzs-steuerung"><button type="button" class="wzs-pfeil" data-richtung="-1" aria-label="${t.zurueck}">←</button><span class="wzs-punkte" aria-hidden="true">${alle.map((_, i) => `<i${i ? "" : ' class="an"'}></i>`).join("")}</span><button type="button" class="wzs-pfeil" data-richtung="1" aria-label="${t.weiter}">→</button></div>
    </div>`;
}

// Beide Sprachen für die Startseite
export const startSlider = () => `${slider("de")}\n${slider("en")}`;
