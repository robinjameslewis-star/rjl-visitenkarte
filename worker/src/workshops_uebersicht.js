// Übersicht „Workshops“ (workshops/, englisch workshops/en/; seit 10.11.2026). Zwei gleichrangige Workshops als gleich gebaute Karten,
// jede mit Vorschaubild aus ihrem Videoausschnitt, einem Satz, Preis/Termin und zwei Knöpfen (Robin, 10.11.2026: jedes Angebot eine eigene,
// gleich gebaute Einheit; Menüpunkt „Workshops“ führt hierher). Alte Sprungmarken der früheren KI-Seite unter workshops/ (etwa #anfrage aus
// Beiträgen und Mails) leitet ein kleines Skript auf workshops/ki-kompetenz/ weiter. tools/workshops-bauen.mjs schreibt beide Seiten.
import { rahmen } from "./werkzeug.js";
import { newsletterKasten } from "./kasten.js";
import { SEITEN } from "./sitemap.js";

const SITE = "https://robin.vision/";
export const UEBERSICHT = SEITEN.filter(s => s.id === "workshops-uebersicht").map(s => ({ ...s, pfad: s.adresse + "index.html" }));
const url = lang => SITE + UEBERSICHT.find(s => s.lang === lang).adresse;
const adresse = (id, lang) => SEITEN.find(s => s.id === id && s.lang === lang).adresse;
const BUCHEN = "https://member.robin.vision/workshop-buchen?workshop=e-rechnung&utm_source=website&utm_medium=";

// Sprungmarken der KI-Seite (workshops.js); #e-rechnung stammt aus PR 92 (Abschnitt, der heute eine eigene Seite ist)
const KI_MARKEN = ["anfrage", "zusammenarbeit", "plan-b", "teile", "unterweisung", "fuer-wen", "inhalt", "werkzeuge", "leitung", "formate", "ablauf", "nachweis", "recht", "fragen"];

const TEXT = {
  de: {
    titel: "Workshops", seitentitel: "Workshops: KI-Kompetenz und E-Rechnung – robin.vision",
    beschr: "Zwei Workshops für Unternehmen und Kanzleien: KI-Kompetenz für Ihr Team mit Unterweisung nach EU AI Act, und der Workshop E-Rechnung im eigenen Browser.",
    untertitel: "Für Unternehmen und Kanzleien",
    karten: [
      { id: "workshops", bild: "workshop-ki-kompetenz-ausschnitt", titel: "Workshop KI-Kompetenz",
        text: "KI-Kompetenz für Ihr Team, mit Unterweisung nach EU AI Act. Ich leite ihn selbst, online oder vor Ort.",
        fakt: "Termine ab Januar 2027 · Preis auf Anfrage", erst: ["Workshop anfragen", "#anfrage"], mehr: "Mehr zum Workshop" },
      { id: "workshop-e-rechnung", bild: "workshop-e-rechnung-ausschnitt", titel: "Workshop E-Rechnung",
        text: "Was eine E-Rechnung ist, wie Sie sie empfangen, lesen und prüfen und was für Ihren Betrieb ab wann gilt. Etwa 45 Minuten im eigenen Browser, mit Goch als Gastgeber.",
        fakt: "Kostenlos bis 07.01.2027 (Einführungsphase)", erst: ["Workshop E-Rechnung buchen", "buchen"], mehr: "Mehr zum Workshop" },
    ],
    andere: "English version",
  },
  en: {
    titel: "Workshops", seitentitel: "Workshops: AI literacy and e-invoicing – robin.vision",
    beschr: "Two workshops for companies and accounting firms: AI literacy for your team with EU AI Act training, and the e-invoicing workshop in your own browser.",
    untertitel: "For companies and accounting firms",
    karten: [
      { id: "workshops", bild: "workshop-ki-kompetenz-ausschnitt", titel: "AI literacy workshop",
        text: "AI literacy for your team, with EU AI Act training. I run it myself, online or on site.",
        fakt: "Sessions from January 2027 · price on request", erst: ["Enquire about a workshop", "#anfrage"], mehr: "More about the workshop" },
      { id: "workshop-e-rechnung", bild: "workshop-e-rechnung-ausschnitt", titel: "E-invoicing workshop (in German)",
        text: "What an e-invoice is, how to receive, read and check one, and what applies to your business and when. About 45 minutes in your own browser, with Goch as your host.",
        fakt: "Free until 7 January 2027 (launch phase)", erst: ["Book the e-invoicing workshop", "buchen"], mehr: "More about the workshop" },
    ],
    andere: "Deutsche Fassung",
  },
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `.ws-karten { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin: 28px 0 34px; }
@media (max-width: 720px) { .ws-karten { grid-template-columns: 1fr; } }
.ws-karte { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 6px; background: rgba(255,255,255,.35); overflow: hidden; }
.ws-karte > a.bild { display: block; }
.ws-karte img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; }
.ws-karte .inhalt { display: flex; flex-direction: column; gap: 10px; padding: 18px 20px 20px; flex: 1; }
.ws-karte h2 { margin: 0; font: 400 26px/1.2 var(--serif); }
.ws-karte h2 a { color: var(--green); text-decoration: none; }
.ws-karte p { margin: 0; }
.ws-karte .fakt { font-size: 15px; color: var(--ink-soft); }
.ws-karte .knoepfe { display: flex; flex-wrap: wrap; gap: 10px; margin-top: auto; padding-top: 6px; }
.ws-karte .knoepfe a { display: inline-block; padding: 10px 16px; border-radius: 3px; text-decoration: none; font-size: 15px; }
.ws-karte .knoepfe .erst { background: var(--green); color: var(--paper); border: 1px solid var(--green); }
.ws-karte .knoepfe .erst:hover { background: #082d22; }
.ws-karte .knoepfe .mehr { border: 1px solid var(--copper); color: var(--ink); }`;

export function uebersichtSeite(lang) {
  const t = TEXT[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const andere = lang === "en" ? "de" : "en", up = lang === "en" ? "../../" : "../";
  const canonical = url(lang);
  const ki = adresse("workshops", lang), er = adresse("workshop-e-rechnung", lang);
  const karte = k => {
    const seite = up + (k.id === "workshops" ? ki : er);
    const erst = k.erst[1] === "buchen" ? BUCHEN + (lang === "en" ? "uebersicht-en" : "uebersicht") : seite + k.erst[1];
    return `<section class="ws-karte" aria-labelledby="k-${k.id}"><a class="bild" href="${seite}" tabindex="-1" aria-hidden="true"><img src="${up}assets/videos/${k.bild}.jpg" alt="" width="960" height="540" loading="lazy" decoding="async"></a>
<div class="inhalt"><h2 id="k-${k.id}"><a href="${seite}">${esc(k.titel)}</a></h2><p>${esc(k.text)}</p><p class="fakt">${esc(k.fakt)}</p>
<p class="knoepfe"><a class="erst" href="${esc(erst)}">${esc(k.erst[0])}</a><a class="mehr" href="${seite}">${esc(k.mehr)}</a></p></div></section>`;
  };
  const weiter = `<script>(function () { var m = location.hash.slice(1), ki = ${JSON.stringify(KI_MARKEN)};
  if (ki.indexOf(m) >= 0) location.replace(${JSON.stringify(up + ki)} + "#" + m);
  else if (m === "e-rechnung") location.replace(${JSON.stringify(up + er)}); })();</script>`;
  const main = `<article class="workshops">
<h1>${esc(t.titel)}</h1>
<p class="untertitel">${esc(t.untertitel)}</p>
<div class="ws-karten">
${t.karten.map(karte).join("\n")}
</div>
<p class="meta"><a href="${up}${UEBERSICHT.find(s => s.lang === andere).adresse}" lang="${andere}" hreflang="${andere}">${esc(t.andere)}</a></p>
${newsletterKasten(lang, up, "impuls")}
</article>`;
  return rahmen({ goch: true, lang, up, titel: t.titel, seitentitel: t.seitentitel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: url(andere) }],
    head: weiter + "\n", css: CSS, main, aktiv: "workshops" });
}
