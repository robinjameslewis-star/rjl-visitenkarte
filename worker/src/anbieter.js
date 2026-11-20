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
// Beiträge (Robin, 19.11.2026: „auf der Unterseite einer Lösung findet man den gesamten content zu dieser Lösung der veröffentlicht wurde“):
// alle veröffentlichten Impulse der Sprache, die den Namen der Lösung nennen, automatisch (auch beim Veröffentlichen über die Redaktion,
// blog.js buildBlog), dazu Beiträge auf anderen Kanälen aus links des Anbieters: [{ url, datum, kanal: "LinkedIn", titel: { de, en } }].
// Eigene Lösungen (Robin, 20.11.2026: SmartFormular „wie jede andere ki lösung“; partner.js, EIGENE): dieselbe Seite, Kennzeichen
// „Anzeige · robin.vision“, Wortmarke statt Bilddatei, dazu die Verweise auf die eigenen Werkzeuge (Sprungmarken #produkte, #fibu-lite,
// #e-rechnung, #abschluss, #beta – Ziele der Verweise von den Werkzeugseiten, aus Gochs Linkliste und der alten Marken der Übersicht).
import { rahmen, WERKZEUGE, ALTE_ADRESSEN } from "./werkzeug.js";
import { PARTNER, VORGESCHLAGEN, EIGENE, LOGO_BREITE, kennzeichen, vorschlagKennzeichen, anzeigeHref, kostenlosText, wortmarke, loesungUrl, KENNZ_CSS } from "./partner.js";

const SITE = "https://robin.vision/";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Vorgeschlagene Software, eigene Lösungen und bezahlte Partner ohne eigene Produktseite (seite) – in der Reihenfolge der Karten
export const ANBIETER = [...VORGESCHLAGEN.map(p => ({ ...p, art: "vorgeschlagen" })), ...EIGENE.map(p => ({ ...p, art: "eigen" })),
  ...PARTNER.filter(p => !p.seite).map(p => ({ ...p, art: "anzeige" }))];
export { anbieterAdresse } from "./partner.js";
import { anbieterAdresse } from "./partner.js";
export const anbieterPfad = (id, lang) => anbieterAdresse(id, lang) + "index.html";
// IDs dürfen keine vorhandene Seite unter werkzeuge/ überschreiben (beim Bauen geprüft, nicht beim Laden: werkzeug.js ↔ sitemap.js)
// Belegt sind die Werkzeugseiten, die englische Übersicht und die Weiterleitungen alter Adressen; jede ID gibt es nur einmal. Bis
// 20.11.2026 war auch „smartformular“ gesperrt (eigene Produktseite aus smartformular.js); seitdem ist es ein Eintrag der Liste.
export function anbieterPruefen(liste = ANBIETER) {
  const belegt = new Set([...WERKZEUGE.map(w => w.id), "en", ...ALTE_ADRESSEN.map(a => a.pfad.split("/")[1])]);
  for (const a of liste) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.id || "")) throw new Error(`Anbieter-ID ${a.id} ist keine Adresse (Kleinbuchstaben, Ziffern, Bindestrich)`);
    if (belegt.has(a.id)) throw new Error(`Anbieter-ID ${a.id} ist unter werkzeuge/ schon vergeben`);
    belegt.add(a.id);
  }
}

const T = {
  de: { beitraege: "Beiträge", impuls: "Impuls", werkzeuge: "Werkzeuge", zurueck: "← Werkzeuge", zumAnbieter: "Zur Website des Anbieters", aufnahmen: "Aufnahmen", werkzeugeTitel: "Werkzeuge",
    aufnahmeHinweis: "Eigene Aufnahme von robin.vision mit Testdaten", vom: "vom",
    art: { vorgeschlagen: "Vorgeschlagen: robin.vision stellt diese Lösung unbezahlt vor. Verträge schließen Sie direkt mit dem Anbieter.",
      anzeige: "Anzeige: robin.vision erhält für vermittelte Kunden eine Vergütung. Verträge schließen Sie direkt mit dem Anbieter." },
    beschr: (p, b) => `${p.name} auf robin.vision: ${b}. ${p.text.de}` },
  en: { beitraege: "Posts", impuls: "Insight", werkzeuge: "Tools", zurueck: "← Tools", zumAnbieter: "To the provider's website", aufnahmen: "Recordings", werkzeugeTitel: "Tools",
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
.an-wortmarke { border: 0; background: #0E0B14; color: #fff; font: 500 20px/1 var(--sans); letter-spacing: .01em; } .an-wortmarke span { color: #A78BFA; }
.an-mehr { max-width: 60ch; color: var(--ink-soft); }
.an-werkzeuge { margin-bottom: 30px; } .an-werkzeuge li { scroll-margin-top: 90px; } .an-werkzeuge .an-weiter { margin-top: 10px; }
.an-werkzeuge .an-weiter a { font: inherit; color: var(--green); text-decoration: underline; text-decoration-color: var(--copper); text-underline-offset: .2em; }
.an-chips { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 22px; padding: 0 !important; }
.an-chips li { margin: 0; padding: 4px 10px; border: 1px solid var(--line); border-radius: 3px; font-size: 13px; color: var(--ink-soft); background: rgba(255,255,255,.6); }
.an-knopf { display: inline-block; padding: 11px 20px; border: 1px solid var(--green); border-radius: 3px; background: var(--green); color: var(--paper) !important; text-decoration: none !important; font-size: 15px; }
.an-knopf:hover { background: #082d22; }
.an-art { color: var(--ink-muted); font-size: 13px; margin: 18px 0 0; }
.an-video { margin: 22px 0 30px; }
.an-video video { display: block; width: 100%; height: auto; border-radius: 6px; background: #efe9dc; box-shadow: 0 10px 28px rgba(31,31,31,.14), 0 1px 3px rgba(31,31,31,.10); }
.an-video figcaption { margin-top: 8px; font-size: 13px; color: var(--ink-soft); }
.an-video figcaption strong { color: var(--ink); font-weight: 500; }`;

// Veröffentlichte Impulse, die die Lösung nennen (Titel, Zusammenfassung oder Text), neueste zuerst
export const anbieterBeitraege = (p, lang, posts = []) => posts.filter(b => b.status === "published" && b.date && b.lang === lang
  && [b.title, b.summary, b.body].join("\n").includes(p.name)).sort((a, b) => b.date.localeCompare(a.date));

export function anbieterSeite(p, lang, posts = []) {
  const t = T[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const up = lang === "en" ? "../../../" : "../../";
  const bereich = p.bereich ? (p.bereich[lang] || p.bereich.de) : "";
  const text = (p.text && (p.text[lang] || p.text.de)) || "";
  const kennz = p.art !== "vorgeschlagen" ? kennzeichen(lang, anzeigeHref(lang, up), p.anbieter, "kennz") : vorschlagKennzeichen(lang, p.anbieter, "kennz");
  const logo = p.wortmarke ? `<span class="an-logo an-wortmarke" aria-hidden="true">${wortmarke(p)}</span>`
    : p.logo ? `<span class="an-logo" aria-hidden="true"><img src="${esc(up + p.logo)}" alt="" width="${p.logoBreite || LOGO_BREITE}"></span>` : "";
  const url = loesungUrl(p, lang);
  // Eigene Werkzeuge der Lösung: auf robin.vision (relativ) oder auf der Website der Lösung (extern)
  const ziel = w => w.extern ? { href: url + w.href, zusatz: ' rel="noopener" target="_blank"' } : { href: up + w.href, zusatz: "" };
  const weg = w => { const z = ziel(w); return `<a href="${esc(z.href)}"${z.zusatz}>`; };
  const eigeneWerkzeuge = p.werkzeuge && p.werkzeuge[lang] ? `<h2 id="produkte">${t.werkzeugeTitel}</h2>
<ul class="list an-werkzeuge">
${p.werkzeuge[lang].map(w => `<li id="${esc(w.anker)}"><span class="when">${esc(w.frei ? kostenlosText(lang, w.frei) : w.stand)}</span>${weg(w)}${esc(w.name)}</a><p>${esc(w.text)}</p>${w.mehr
    ? `<p class="an-weiter" id="${esc(w.mehr.anker)}">${weg({ ...w, href: w.mehr.href })}${esc(w.mehr.text)}</a></p>` : ""}</li>`).join("\n")}
</ul>
` : "";
  const rel = p.art === "anzeige" ? "sponsored noopener" : "noopener";
  const aufnahmen = [...(p.aufnahmen || [])].sort((a, b) => b.datum.localeCompare(a.datum));
  const videos = aufnahmen.length ? `<h2 id="aufnahmen">${t.aufnahmen}</h2>
${aufnahmen.map(a => { const v = `${up}assets/videos/anbieter/${a.datei}`, titel = a.titel[lang] || a.titel.de;
    return `<figure class="an-video"><video controls playsinline preload="none" poster="${esc(v)}.jpg" aria-label="${esc(titel)}"><source src="${esc(v)}.mp4" type="video/mp4"></video><figcaption><strong>${esc(titel)}</strong> · ${t.aufnahmeHinweis}, ${t.vom} ${datum(a.datum, lang)}</figcaption></figure>`; }).join("\n")}
` : "";
  const eigene = anbieterBeitraege(p, lang, posts).map(b => ({ datum: b.date, href: `${up}blog/${b.slug}/`, titel: b.title, art: t.impuls, text: b.summary }));
  const fremde = (p.links || []).filter(l => !l.lang || l.lang === lang).map(l => ({ datum: l.datum, href: l.url, titel: l.titel[lang] || l.titel.de, art: l.kanal, extern: true }));
  const liste = [...eigene, ...fremde].sort((a, b) => b.datum.localeCompare(a.datum));
  const beitraege = liste.length ? `<h2 id="beitraege">${t.beitraege}</h2>
<ul class="list">
${liste.map(b => `<li><span class="when">${datum(b.datum, lang)} · ${esc(b.art)}</span><a href="${esc(b.href)}"${b.extern ? ' rel="noopener" target="_blank"' : ""}>${esc(b.titel)}</a>${b.text ? `<p>${esc(b.text)}</p>` : ""}</li>`).join("\n")}
</ul>
` : "";
  const main = `<article class="anbieter">
<p class="an-zurueck"><a href="${up}${lang === "en" ? "werkzeuge/en/" : "werkzeuge/"}">${t.zurueck}</a></p>
${kennz}
${logo}
<h1>${esc(p.name)}</h1>
${bereich ? `<ul class="an-chips wz-chips"><li>${esc(bereich)}</li></ul>` : ""}
<p class="intro">${esc(text)}</p>
${p.mehr ? `<p class="an-mehr">${esc(p.mehr[lang] || p.mehr.de)}</p>\n` : ""}${eigeneWerkzeuge}${videos}${beitraege}<p><a class="an-knopf" href="${esc(url)}" rel="${rel}" target="_blank">${p.knopf && p.knopf[lang] ? esc(p.knopf[lang]) : t.zumAnbieter}</a></p>
${t.art[p.art] ? `<p class="an-art">${t.art[p.art]}</p>\n` : ""}</article>`;
  return rahmen({ lang, up, titel: p.name, seitentitel: (p.seitentitel && p.seitentitel[lang]) || `${p.name}${bereich ? " – " + bereich : ""} | robin.vision`, beschr: t.beschr(p, bereich).slice(0, 300),
    canonical: SITE + anbieterAdresse(p.id, lang), alternates: [{ lang: "de", href: SITE + anbieterAdresse(p.id, "de") }, { lang: "en", href: SITE + anbieterAdresse(p.id, "en") }],
    css: CSS, main, aktiv: "tools", goch: "werkzeuge" });
}
