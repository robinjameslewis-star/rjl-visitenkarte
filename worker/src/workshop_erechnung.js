// Seite „Workshop E-Rechnung“ (workshops/e-rechnung/, englisch workshops/en/e-rechnung/; seit 10.11.2026). Eigene Seite, getrennt vom
// Workshop KI-Kompetenz (Robin, 10.11.2026: „bitte vermische das nicht so“). Wortlaut der Beschreibung aus W1/W2 der Freigabeliste,
// freigegeben von der operativen Leitung am 10.11.2026 (Vollmacht Robin). Kein Bezug zu einem Werkzeug (Robin, 08.11.2026). Gebucht wird
// über die Selbstbuchung im Memberbereich. tools/workshops-bauen.mjs schreibt beide Seiten.
import { rahmen } from "./werkzeug.js";
import { newsletterKasten } from "./kasten.js";
import { SEITEN } from "./sitemap.js";
import { workshopUmschalter, UMSCHALTER_CSS, workshopVideo, VIDEO_CSS } from "./workshop_umschalter.js";

const SITE = "https://robin.vision/";
export const ERECHNUNG_BUCHEN = "https://member.robin.vision/workshop-buchen?workshop=e-rechnung&utm_source=website&utm_medium=";
export const WORKSHOP_ERECHNUNG = SEITEN.filter(s => s.id === "workshop-e-rechnung").map(s => ({ ...s, pfad: s.adresse + "index.html" }));
export const workshopErechnungUrl = lang => SITE + WORKSHOP_ERECHNUNG.find(s => s.lang === lang).adresse;

const TEXT = {
  de: {
    titel: "Workshop E-Rechnung",
    seitentitel: "Workshop E-Rechnung im Selbstlernformat – robin.vision",
    beschr: "Workshop E-Rechnung im eigenen Browser: in etwa 45 Minuten empfangen, lesen und prüfen, was ab wann gilt, eigener Fahrplan bis 2028. Kostenlos bis 07.01.2027.",
    untertitel: "Selbstlernformat, etwa 45 Minuten, im eigenen Browser",
    text: "Seit 2025 müssen Unternehmen E-Rechnungen empfangen können, ab 2027 und 2028 auch selbst schreiben. Der Workshop zeigt Ihnen in etwa 45 Minuten, was eine E-Rechnung ist, wie Sie sie empfangen, lesen und prüfen und was für Ihren Betrieb ab wann gilt. Am Ende steht Ihr eigener Fahrplan bis 2028.",
    punkte: [
      "Direkt im Browser, wann es Ihnen passt, im eigenen Tempo",
      "Videos mit Goch, Selbstchecks und eine Übung mit realistischen Beispielrechnungen und Musterlösung",
      "Für Ihr Team: Kolleginnen und Kollegen gleich mit eintragen, jede Person bekommt ihren eigenen Zugang. Wer mag, zeigt den Workshop gemeinsam am Beamer oder im Call.",
      "Checkliste, Karte „Fragen an Ihre Software“ und Teilnahmebestätigung für jede Person",
    ],
    preisFett: "Kostenlos bis 07.01.2027",
    preis: " (Einführungsphase, Zugang 30 Tage ab Buchung).",
    knopf: "Workshop E-Rechnung buchen",
    medium: "workshop-e-rechnung",
    ablaufTitel: "So läuft es",
    ablauf: [
      "Formular ausfüllen – für sich allein oder gleich mit Kolleginnen und Kollegen.",
      "E-Mail-Adresse bestätigen. Danach kommt die Buchungsbestätigung mit Ihrem Zugang.",
      "Starten, wann es passt: Der Zugang gilt 30 Tage ab Buchung.",
      "Am Ende: Ihr Fahrplan bis 2028, die Checkliste und die Teilnahmebestätigung.",
    ],
    klein: "Für Unternehmen und Kanzleien. Selbstlernformat ohne Betreuung: Fragen zum Inhalt sind nicht Teil des Workshops.",
    andere: "English version",
    videoLabel: "Ausschnitt aus Kapitel 1: Ist ein PDF eine E-Rechnung?",
  },
  en: {
    titel: "E-invoicing workshop (in German)",
    seitentitel: "E-invoicing workshop, self-study – robin.vision",
    beschr: "E-invoicing workshop in your own browser: in about 45 minutes, receive, read and check e-invoices, what applies when, your own roadmap to 2028. Free until 7 January 2027.",
    untertitel: "Self-study, about 45 minutes, in your own browser",
    text: "Since 2025, businesses in Germany must be able to receive e-invoices; from 2027 and 2028 they must also issue them. In about 45 minutes, this workshop shows what an e-invoice is, how to receive, read and check one, and what applies to your business and when. You finish with your own roadmap to 2028.",
    punkte: [
      "Right in your browser, whenever it suits you, at your own pace",
      "Videos with Goch, self-checks and an exercise with realistic sample invoices and model solutions",
      "For your team: add colleagues when booking, each person gets their own access. If you like, show it together on a projector or in a call.",
      "Checklist, a card “Questions for your software” and a certificate of attendance for each person",
    ],
    preisFett: "Free until 7 January 2027",
    preis: " (launch phase, 30 days access from booking).",
    knopf: "Book the e-invoicing workshop",
    medium: "workshop-e-rechnung-en",
    ablaufTitel: "How it works",
    ablauf: [
      "Fill in the form – just for yourself or with colleagues.",
      "Confirm your email address. You then receive the booking confirmation with your access.",
      "Start whenever it suits you: access is valid for 30 days from booking.",
      "At the end: your roadmap to 2028, the checklist and the certificate of attendance.",
    ],
    klein: "For companies and accounting firms. Self-study format without tutoring: questions about the content are not part of the workshop. The workshop itself is in German.",
    andere: "Deutsche Fassung",
    videoLabel: "Excerpt from chapter 1: is a PDF an e-invoice?",
  },
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `.erechnung-seite .untertitel { margin-bottom: 22px; }
.erechnung-seite .punkte { margin: 22px 0; padding: 22px 26px 20px 44px; border: 1px solid var(--line); border-left: 3px solid var(--copper); border-radius: 3px; background: rgba(184,114,79,.06); }
.erechnung-seite .punkte li { margin: 0 0 8px; }
.erechnung-seite .preis { font-size: 17px; }
.erechnung-seite .knopf { display: inline-block; margin: 6px 0 4px; padding: 11px 18px; border-radius: 3px; text-decoration: none; font-size: 15px; background: var(--green); color: var(--paper); border: 1px solid var(--green); }
.erechnung-seite .knopf:hover { background: #082d22; color: var(--paper); }
.erechnung-seite .ablauf { padding-left: 22px; }
.erechnung-seite .ablauf li { margin: 0 0 8px; }
.erechnung-seite .klein { font-size: 14px; color: var(--ink-soft); }
` + UMSCHALTER_CSS + "\n" + VIDEO_CSS;

export function workshopErechnungSeite(lang) {
  const t = TEXT[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const andere = lang === "en" ? "de" : "en", up = lang === "en" ? "../../../" : "../../";
  const canonical = workshopErechnungUrl(lang), buchen = ERECHNUNG_BUCHEN + t.medium;
  const main = `<article class="workshops erechnung-seite">
${workshopUmschalter(lang, up, "erechnung")}
<h1>${esc(t.titel)}</h1>
<p class="untertitel">${esc(t.untertitel)}</p>
${workshopVideo(lang, up, "workshop-e-rechnung-ausschnitt", esc(t.videoLabel))}
<p>${esc(t.text)}</p>
<ul class="punkte">${t.punkte.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
<p class="preis"><strong>${esc(t.preisFett)}</strong>${esc(t.preis)}</p>
<p><a class="knopf" href="${esc(buchen)}">${esc(t.knopf)}</a></p>
<h2 id="ablauf">${esc(t.ablaufTitel)}</h2>
<ol class="ablauf">${t.ablauf.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
<p><a class="knopf" href="${esc(buchen)}">${esc(t.knopf)}</a></p>
<p class="klein">${esc(t.klein)}</p>
<p class="meta"><a href="${up}${WORKSHOP_ERECHNUNG.find(s => s.lang === andere).adresse}" lang="${andere}" hreflang="${andere}">${esc(t.andere)}</a></p>
${newsletterKasten(lang, up, "impuls")}
</article>`;
  const kurs = JSON.stringify({ "@context": "https://schema.org", "@type": "Course", name: t.titel, description: t.beschr, url: canonical, inLanguage: "de",
    provider: { "@type": "Person", "@id": SITE + "#person", name: "Robin James Lewis", url: SITE },
    educationalLevel: "Beginner", timeRequired: "PT45M",
    hasCourseInstance: [{ "@type": "CourseInstance", courseMode: "Online", courseWorkload: "PT45M" }] }).replace(/</g, "\\u003c");
  return rahmen({ goch: "erechnung", lang, up, titel: t.titel, seitentitel: t.seitentitel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: workshopErechnungUrl(andere) }],
    head: `<script type="application/ld+json">${kurs}</script>\n`, css: CSS, main, aktiv: "workshops" });
}
