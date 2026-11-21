// Seite „Individuelle Lösung“ (individuelle-loesung/, englisch individuelle-loesung/en/; Robin, 21.11.2026: Menü „Werkzeuge · Individuelle
// Lösung (neu) · Workshops · Über mich“). Sie beschreiben ein Problem, ich baue eine geprüfte Lösung mit einer Änderungsrunde. Ohne Preise,
// ohne Fristen und ohne Zahlung auf der Seite; „Sie erhalten vorab ein Angebot“. Kein eigenes Formular: Anfrage über die vorhandenen Wege
// der Startseite (Nachricht an Gochs /contact, Termin, E-Mail), damit keine neue Datenverarbeitung entsteht. Text fest im Code (keine Redaktion); tools/individuelle-loesung-bauen.mjs schreibt beide Seiten.
import { rahmen } from "./werkzeug.js";
import { newsletterKasten } from "./kasten.js";
import { SEITEN } from "./sitemap.js";

const SITE = "https://robin.vision/";
export const LOESUNG = SEITEN.filter(s => s.id === "individuelle-loesung").map(s => ({ ...s, pfad: s.adresse + "index.html" }));
const url = lang => SITE + LOESUNG.find(s => s.lang === lang).adresse;

const TEXT = {
  de: {
    titel: "Individuelle Lösung", seitentitel: "Individuelle Lösung: eine KI-Lösung für Ihr Problem – robin.vision",
    beschr: "Sie beschreiben ein Problem aus Ihrem Arbeitsalltag, ich baue eine passende Lösung: mit KI erstellt, von mir geprüft, mit einer Änderungsrunde. Sie erhalten vorab ein Angebot.",
    untertitel: "Für ein Problem aus Ihrem Arbeitsalltag, das keine fertige Software löst.",
    wasTitel: "Was es ist",
    was: "Sie beschreiben mir ein Problem aus Ihrem Arbeitsalltag. Ich baue eine passende Lösung, mit KI erstellt und von mir geprüft, bevor Sie sie bekommen. Eine Änderungsrunde ist dabei.",
    beispieleLabel: "Zum Beispiel:",
    beispiele: ["Skizzen als saubere Pläne", "Tabellen zusammenführen und prüfen", "Vorlagen und Formulare bauen", "Unterlagen ordnen und gestalten"],
    ablaufTitel: "So läuft es ab",
    ablauf: [
      ["Sie beschreiben das Problem", "Was Sie brauchen, wofür und in welcher Form. Schicken Sie zunächst nur die Beschreibung, noch keine Unterlagen."],
      ["Sie erhalten vorab ein Angebot", "Ich prüfe, ob und wie ich die Aufgabe lösen kann, und frage nach, wenn etwas offen ist. Dann erhalten Sie ein Angebot."],
      ["Sie bekommen die geprüfte Lösung", "Nach Ihrer Zusage erstelle ich die Lösung mit KI und prüfe sie selbst. Sie erhalten das Ergebnis und eine Änderungsrunde."],
    ],
    fuerTitel: "Für wen",
    fuer: "Für kleine Unternehmen, Selbstständige und Privatpersonen mit einem einmaligen Problem rund um Dokumente, Daten oder Gestaltung. Auch Kanzleien können anfragen, solange es nicht um Daten ihrer Mandanten geht.",
    grenzenTitel: "Was ich nicht mache",
    grenzen: [
      "keine Steuer- oder Rechtsberatung und nichts, wofür es eine besondere Erlaubnis braucht",
      "keine Mandantendaten von Kanzleien und keine Gesundheitsdaten",
      "keine amtlichen Unterlagen, Bauvorlagen, Statik, Gutachten oder Wertermittlungen",
      "nichts, was täuschen soll, etwa Belege, Zeugnisse oder Bewertungen",
    ],
    vermerk: "Jede Lösung ist mit KI erstellt und von mir geprüft. Sie ist nicht amtlich und ersetzt keine Beratung. Bitte prüfen Sie sie vor der Verwendung.",
    anfrageTitel: "Anfrage",
    anfrage: "Beschreiben Sie Ihr Problem in einer Nachricht oder in einem kurzen Gespräch. Ich antworte persönlich per E-Mail.",
    nachricht: "Nachricht schreiben", termin: "Termin vereinbaren",
    anfrageHinweis: "Bitte schicken Sie mit der ersten Nachricht keine Unterlagen und keine Daten anderer Personen.",
    andere: "This page in English",
  },
  en: {
    titel: "Custom solution", seitentitel: "Custom solution: an AI solution for your problem – robin.vision",
    beschr: "You describe a problem from your working day, and I build a solution that fits: created with AI, checked by me, with one round of changes. You receive a quote first.",
    untertitel: "For a problem from your working day that no off-the-shelf software solves.",
    wasTitel: "What it is",
    was: "You describe a problem from your working day. I build a solution that fits, created with AI and checked by me before you receive it. One round of changes is included.",
    beispieleLabel: "For example:",
    beispiele: ["Clean drawings from sketches", "Merging and checking spreadsheets", "Building templates and forms", "Organising and designing documents"],
    ablaufTitel: "How it works",
    ablauf: [
      ["You describe the problem", "What you need, what it is for and in what form. To begin with, send only the description, no documents yet."],
      ["You receive a quote first", "I check whether and how I can solve the task and ask if anything is unclear. Then you receive a quote."],
      ["You get the checked solution", "Once you accept, I create the solution with AI and check it myself. You receive the result and one round of changes."],
    ],
    fuerTitel: "Who it is for",
    fuer: "For small businesses, the self-employed and private individuals with a one-off problem involving documents, data or design. Accounting firms are welcome to ask too, as long as no client data is involved.",
    grenzenTitel: "What I don't do",
    grenzen: [
      "no tax or legal advice, and nothing that requires a special licence",
      "no client data from accounting firms and no health data",
      "no official documents, planning applications, structural calculations, expert reports or valuations",
      "nothing intended to deceive, such as receipts, references or reviews",
    ],
    vermerk: "Every solution is created with AI and checked by me. It is not an official document and does not replace professional advice. Please check it before you use it.",
    anfrageTitel: "Enquiry",
    anfrage: "Describe your problem in a message or a short call. I reply personally by email.",
    nachricht: "Write a message", termin: "Book an appointment",
    anfrageHinweis: "Please do not send any documents or other people's data with your first message.",
    andere: "Diese Seite auf Deutsch",
  },
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `.loesung .beispiele { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.loesung .beispiele li { margin: 0; max-width: none; text-align: left; font: 400 14px/1.2 var(--sans); padding: 8px 12px; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.45); color: var(--ink); }
.loesung .beispiele-label { margin: 0 0 8px; color: var(--ink-soft); font-size: 15px; }
.schritte { list-style: none; counter-reset: schritt; margin: 0 0 10px; padding: 0; }
.schritte li { counter-increment: schritt; display: grid; grid-template-columns: 44px 1fr; gap: 4px 14px; padding: 18px 0; border-top: 1px solid var(--line); max-width: none; text-align: left; }
.schritte li:last-child { border-bottom: 1px solid var(--line); }
.schritte li::before { content: counter(schritt); grid-row: span 2; width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid var(--copper); border-radius: 50%; font: 400 18px/1 var(--serif); color: var(--copper); }
.schritte strong { font: 500 19px/1.3 var(--serif); color: var(--ink); }
.schritte span { color: var(--ink-soft); }
.grenzen { margin: 0 0 18px; padding-left: 1.2em; }
.grenzen li { margin: 0 0 6px; text-align: left; }
.vermerk { color: var(--ink-soft); font-size: 15px; }
.wege { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; margin: 0 0 14px; padding: 0; list-style: none; }
.wege li { margin: 0; max-width: none; }
.wege .knopf { display: inline-block; padding: 11px 18px; border-radius: 3px; text-decoration: none; font-size: 15px; background: var(--green); color: var(--paper); border: 1px solid var(--green); }
.wege .knopf:hover { background: #082d22; color: var(--paper); }
.wege .zweit { background: transparent; color: var(--ink); border-color: var(--copper); }
.wege .zweit:hover { background: rgba(184,114,79,.08); color: var(--ink); }
.wege .mail { font-size: 15px; }
.loesung .hinweis { color: var(--ink-muted); font-size: 13px; }`;

export function loesungSeite(lang) {
  const t = TEXT[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const andere = lang === "en" ? "de" : "en", up = lang === "en" ? "../../" : "../", home = up + (lang === "en" ? "?lang=en" : "");
  const canonical = url(lang);
  const main = `<article class="loesung">
<h1>${esc(t.titel)}</h1>
<p class="untertitel">${esc(t.untertitel)}</p>
<h2 id="was">${esc(t.wasTitel)}</h2>
<p>${esc(t.was)}</p>
<p class="beispiele-label">${esc(t.beispieleLabel)}</p>
<ul class="beispiele">${t.beispiele.map(b => `<li>${esc(b)}</li>`).join("")}</ul>
<h2 id="ablauf">${esc(t.ablaufTitel)}</h2>
<ol class="schritte">
${t.ablauf.map(([titel, text]) => `<li><strong>${esc(titel)}</strong><span>${esc(text)}</span></li>`).join("\n")}
</ol>
<h2 id="fuer-wen">${esc(t.fuerTitel)}</h2>
<p>${esc(t.fuer)}</p>
<h2 id="grenzen">${esc(t.grenzenTitel)}</h2>
<ul class="grenzen">
${t.grenzen.map(g => `<li>${esc(g)}</li>`).join("\n")}
</ul>
<p class="vermerk frei">${esc(t.vermerk)}</p>
<h2 id="anfrage">${esc(t.anfrageTitel)}</h2>
<p>${esc(t.anfrage)}</p>
<ul class="wege">
<li><a class="knopf" href="${home}#nachricht">${esc(t.nachricht)}</a></li>
<li><a class="knopf zweit" href="${home}#kontakt">${esc(t.termin)}</a></li>
<li><a class="mail" href="mailto:robin@robin.vision">robin@robin.vision</a></li>
</ul>
<p class="hinweis">${esc(t.anfrageHinweis)}</p>
<p class="meta"><a href="${up}${LOESUNG.find(s => s.lang === andere).adresse}" lang="${andere}" hreflang="${andere}">${esc(t.andere)}</a></p>
${newsletterKasten(lang, up, "impuls")}
</article>`;
  return rahmen({ goch: "loesung", lang, up, titel: t.titel, seitentitel: t.seitentitel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: url(andere) }], css: CSS, main, aktiv: "loesung" });
}
