// Unterseiten der Anbieter unter den Werkzeugen (Robin, 19.11.2026: „Das muss stringent logisch sein. Also eigene Seite für smartformular
// und oder Unterseiten für die Werkzeuge der anderen Anbieter. Am besten beides.“). Jede Karte auf robin.vision führt zuerst auf eine Seite
// von robin.vision; erst von dort geht es zur Website des Anbieters. Eine Seite je Anbieter und Sprache: werkzeuge/<id>/ und werkzeuge/<id>/en/.
// Inhalt: Kennzeichen wie auf der Karte, Logo, Name, Bereich, Text nach der Website des Anbieters, Verweis zum Anbieter (Anzeige mit
// rel="sponsored", vorgeschlagene Software ohne).
// Aufnahmen (Robin, 19.11.2026: „Lass das Aufnahme folgt weg füge einfach Aufnahmen ein sobald es welche gibt und veröffentliche alle die
// produziert und veröffentlicht werden dort“): Der Abschnitt erscheint erst mit der ersten Aufnahme, ohne Platzhalter. Je Aufnahme ein
// Eintrag in aufnahmen des Anbieters (partner.js): { datei: "kanzleikern-anmeldung" (assets/videos/anbieter/<datei>.mp4 und .jpg als
// Vorschaubild), datum: "2026-12-01", titel: { de, en } }. Es sind dieselben Clips wie auf LinkedIn und den anderen Kanälen; gezeigt erst
// nach Robins eigenem Test und nur mit Test- oder erfundenen Daten (Vereinbarung „Vorgeschlagene Software“ Nr. 3 und 5).
import { rahmen, WERKZEUGE } from "./werkzeug.js";
import { PARTNER, VORGESCHLAGEN, LOGO_BREITE, kennzeichen, vorschlagKennzeichen, anzeigeHref, KENNZ_CSS } from "./partner.js";

const SITE = "https://robin.vision/";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Vorgeschlagene Software und bezahlte Partner ohne eigene Produktseite (seite) – in der Reihenfolge der Karten
export const ANBIETER = [...VORGESCHLAGEN.map(p => ({ ...p, art: "vorgeschlagen" })), ...PARTNER.filter(p => !p.seite).map(p => ({ ...p, art: "anzeige" }))];
export { anbieterAdresse } from "./partner.js";
import { anbieterAdresse } from "./partner.js";
export const anbieterPfad = (id, lang) => anbieterAdresse(id, lang) + "index.html";
// IDs dürfen keine vorhandene Seite unter werkzeuge/ überschreiben (beim Bauen geprüft, nicht beim Laden: werkzeug.js ↔ sitemap.js)
export function anbieterPruefen() {
  const belegt = new Set([...WERKZEUGE.map(w => w.id), "smartformular", "en", "kontoauszug-konverter"]);
  for (const a of ANBIETER) if (belegt.has(a.id)) throw new Error(`Anbieter-ID ${a.id} ist unter werkzeuge/ schon vergeben`);
}

const T = {
  de: { werkzeuge: "Werkzeuge", zurueck: "← Werkzeuge", zumAnbieter: "Zur Website des Anbieters", aufnahmen: "Aufnahmen",
    aufnahmeHinweis: "Eigene Aufnahme von robin.vision mit Testdaten", vom: "vom",
    art: { vorgeschlagen: "Vorgeschlagen: robin.vision stellt diese Lösung unbezahlt vor. Verträge schließen Sie direkt mit dem Anbieter.",
      anzeige: "Anzeige: robin.vision erhält für vermittelte Kunden eine Vergütung. Verträge schließen Sie direkt mit dem Anbieter." },
    beschr: (p, b) => `${p.name} auf robin.vision: ${b}. ${p.text.de}` },
  en: { werkzeuge: "Tools", zurueck: "← Tools", zumAnbieter: "To the provider's website", aufnahmen: "Recordings",
    aufnahmeHinweis: "Recording by robin.vision with test data", vom: "of",
    art: { vorgeschlagen: "Suggested: robin.vision presents this solution unpaid. Contracts are made directly with the provider.",
      anzeige: "Ad: robin.vision receives a fee for customers it refers. Contracts are made directly with the provider." },
    beschr: (p, b) => `${p.name} on robin.vision: ${b}. ${p.text.en || p.text.de}` },
};

const datum = (iso, lang) => { const [j, m, t] = iso.split("-"); return lang === "en"
  ? new Date(Date.UTC(+j, +m - 1, +t)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : `${+t}.${+m}.${j}`; };

const CSS = `${KENNZ_CSS}
.an-zurueck { margin: 0 0 22px; font-size: 14px; } .an-zurueck a { color: var(--green); text-decoration: none; } .an-zurueck a:hover { text-decoration: underline; text-underline-offset: .2em; }
.an-logo { box-sizing: border-box; width: 196px; max-width: 100%; height: 50px; padding: 0 14px; display: flex; align-items: center; justify-content: center; margin: 0 0 18px; border: 1px solid #E4E1D8; border-radius: 4px; background: #fff; }
.an-logo img { display: block; height: auto; max-width: 100%; }
.an-chips { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 22px; padding: 0 !important; }
.an-chips li { margin: 0; padding: 4px 10px; border: 1px solid var(--line); border-radius: 3px; font-size: 13px; color: var(--ink-soft); background: rgba(255,255,255,.6); }
.an-knopf { display: inline-block; padding: 11px 20px; border: 1px solid var(--green); border-radius: 3px; background: var(--green); color: var(--paper) !important; text-decoration: none !important; font-size: 15px; }
.an-knopf:hover { background: #082d22; }
.an-art { color: var(--ink-muted); font-size: 13px; margin: 18px 0 0; }
.an-video { margin: 22px 0 30px; }
.an-video video { display: block; width: 100%; height: auto; border-radius: 6px; background: #efe9dc; box-shadow: 0 10px 28px rgba(31,31,31,.14), 0 1px 3px rgba(31,31,31,.10); }
.an-video figcaption { margin-top: 8px; font-size: 13px; color: var(--ink-soft); }
.an-video figcaption strong { color: var(--ink); font-weight: 500; }`;

export function anbieterSeite(p, lang) {
  const t = T[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const up = lang === "en" ? "../../../" : "../../";
  const bereich = p.bereich ? (p.bereich[lang] || p.bereich.de) : "";
  const text = (p.text && (p.text[lang] || p.text.de)) || "";
  const kennz = p.art === "anzeige" ? kennzeichen(lang, anzeigeHref(lang, up), p.anbieter, "kennz") : vorschlagKennzeichen(lang, p.anbieter, "kennz");
  const logo = p.logo ? `<span class="an-logo" aria-hidden="true"><img src="${esc(up + p.logo)}" alt="" width="${p.logoBreite || LOGO_BREITE}"></span>` : "";
  const rel = p.art === "anzeige" ? "sponsored noopener" : "noopener";
  const aufnahmen = [...(p.aufnahmen || [])].sort((a, b) => b.datum.localeCompare(a.datum));
  const videos = aufnahmen.length ? `<h2 id="aufnahmen">${t.aufnahmen}</h2>
${aufnahmen.map(a => { const v = `${up}assets/videos/anbieter/${a.datei}`, titel = a.titel[lang] || a.titel.de;
    return `<figure class="an-video"><video controls playsinline preload="none" poster="${esc(v)}.jpg" aria-label="${esc(titel)}"><source src="${esc(v)}.mp4" type="video/mp4"></video><figcaption><strong>${esc(titel)}</strong> · ${t.aufnahmeHinweis}, ${t.vom} ${datum(a.datum, lang)}</figcaption></figure>`; }).join("\n")}
` : "";
  const main = `<article class="anbieter">
<p class="an-zurueck"><a href="${up}${lang === "en" ? "werkzeuge/en/" : "werkzeuge/"}">${t.zurueck}</a></p>
${kennz}
${logo}
<h1>${esc(p.name)}</h1>
${bereich ? `<ul class="an-chips wz-chips"><li>${esc(bereich)}</li></ul>` : ""}
<p class="intro">${esc(text)}</p>
${videos}<p><a class="an-knopf" href="${esc(p.url)}" rel="${rel}" target="_blank">${t.zumAnbieter}</a></p>
<p class="an-art">${t.art[p.art]}</p>
</article>`;
  return rahmen({ lang, up, titel: p.name, seitentitel: `${p.name}${bereich ? " – " + bereich : ""} | robin.vision`, beschr: t.beschr(p, bereich).slice(0, 300),
    canonical: SITE + anbieterAdresse(p.id, lang), alternates: [{ lang: "de", href: SITE + anbieterAdresse(p.id, "de") }, { lang: "en", href: SITE + anbieterAdresse(p.id, "en") }],
    css: CSS, main, aktiv: "tools", goch: "werkzeuge" });
}
