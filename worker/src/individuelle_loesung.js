// Seite „Individuelle Lösung“ (individuelle-loesung/, englisch individuelle-loesung/en/; Robin, 21.11.2026: Menü „Werkzeuge · Individuelle
// Lösung (neu) · Workshops · Über mich“). Sie beschreiben ein Problem, ich baue eine geprüfte Lösung mit einer Änderungsrunde. Ohne Preise,
// ohne Fristen und ohne Zahlung auf der Seite; „Sie erhalten vorab ein Angebot“. Anfrageformular (Robin, 21.11.2026: „individuelle lösung mit
// passendem formular, das lust auf die dienstleistung macht und nicht nur email anbieten“) nach dem Muster „Software vorschlagen“
// (uebersicht.js): an Gochs /contact wie das Kontaktformular der Startseite (Datenschutz: Abschnitt Kontaktformular), Falle und
// Ladezeitpunkt, art: "loesung" setzt im Worker den Betreff „Website · Individuelle Lösung: …“. Termin und E-Mail klein darunter. Text fest im Code (keine Redaktion); tools/individuelle-loesung-bauen.mjs schreibt beide Seiten.
import { rahmen } from "./werkzeug.js";
import { newsletterKasten } from "./kasten.js";
import { SEITEN } from "./sitemap.js";
import { KONTAKT_ENDPUNKT } from "./uebersicht.js";

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
    anfrageTitel: "Erzählen Sie mir von Ihrer Aufgabe",
    anfrage: "Was hält Sie im Büro immer wieder auf? Beschreiben Sie es in ein paar Sätzen. So etwas kann daraus werden:",
    ideen: ["Aus einem Stapel Bestandspläne eine durchsuchbare Übersicht", "Ein Formular, das Angaben prüft, bevor sie ins System gehen", "Eine Vorlage, die aus Ihren Daten einen fertigen Bericht macht"],
    felder: { name: "Name", email: "E-Mail-Adresse", firma: "Unternehmen oder Kanzlei", art: "Worum geht es?", budget: "Ihr Budget", text: "Was soll die Lösung tun?", optional: "(freiwillig)", waehlen: "Bitte wählen" },
    artWerte: ["Dokumente und Formulare", "Daten und Tabellen", "Abläufe im Büro", "Gestaltung", "Etwas anderes"],
    // Budget (Robin, 21.11.2026: „budget noch abfragen“): nur der Rahmen des Kunden, keine Angabe, was eine Lösung kostet
    budgetWerte: ["bis 250 €", "250 bis 1.000 €", "1.000 bis 5.000 €", "mehr als 5.000 €", "Weiß ich noch nicht"],
    platzhalter: "Zum Beispiel: Jeden Monat kommen Lieferscheine als PDF, und wir tippen die Positionen in Excel ab. Ich hätte gern eine Lösung, die das zusammenführt und die Summen prüft.",
    textHinweis: "Bitte beschreiben Sie die Aufgabe, nicht die Inhalte: keine Mandanten- oder Gesundheitsdaten und keine echten personenbezogenen Daten mitschicken.",
    senden: "Anfrage senden", sendet: "Wird gesendet …",
    gesendet: "Danke, Ihre Anfrage ist angekommen. Ich melde mich persönlich mit einer Einschätzung.",
    ungueltig: "Bitte Name, eine gültige E-Mail-Adresse und ein paar Sätze zur Aufgabe angeben.",
    fehler: "Das Senden hat nicht geklappt. Schreiben Sie mir bitte direkt an robin@robin.vision.",
    datenschutz: "Ihre Angaben gehen per E-Mail an mich und werden nur für die Antwort verwendet. Einzelheiten stehen unter Impressum · Datenschutz.",
    betreff: "Individuelle Lösung: Anfrage über robin.vision",
    lieber: "Lieber im Gespräch?", termin: "Termin vereinbaren",
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
    anfrageTitel: "Tell me about your task",
    anfrage: "What keeps holding you up at work? Describe it in a few sentences. This is the kind of thing it can become:",
    ideen: ["A searchable overview from a stack of as-built plans", "A form that checks entries before they go into your system", "A template that turns your data into a finished report"],
    felder: { name: "Name", email: "Email address", firma: "Company or firm", art: "What is it about?", budget: "Your budget", text: "What should the solution do?", optional: "(optional)", waehlen: "Please choose" },
    artWerte: ["Documents and forms", "Data and spreadsheets", "Office processes", "Design", "Something else"],
    budgetWerte: ["up to €250", "€250 to €1,000", "€1,000 to €5,000", "more than €5,000", "Not sure yet"],
    platzhalter: "For example: every month we receive delivery notes as PDFs and type the items into Excel by hand. I'd like a solution that brings them together and checks the totals.",
    textHinweis: "Please describe the task, not the contents: don't send client data, health data or any real personal data.",
    senden: "Send enquiry", sendet: "Sending …",
    gesendet: "Thank you, your enquiry has arrived. I'll get back to you personally with my assessment.",
    ungueltig: "Please give your name, a valid email address and a few sentences about the task.",
    fehler: "Sending did not work. Please email me directly at robin@robin.vision.",
    datenschutz: "Your details are emailed to me and used only to reply. Details are under Legal notice · Privacy.",
    betreff: "Individuelle Lösung: Anfrage über robin.vision (English)",
    lieber: "Prefer to talk?", termin: "Book an appointment",
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
.loesung .hinweis { color: var(--ink-muted); font-size: 13px; }
.ideen { list-style: none; margin: 0 0 6px; padding: 0; display: grid; gap: 8px; }
.ideen li { margin: 0; max-width: none; text-align: left; padding: 10px 14px; border-left: 2px solid var(--copper); background: rgba(255,255,255,.45); font: 400 18px/1.35 var(--serif); color: var(--green); }
.lo-form { margin: 22px 0 10px; padding: 22px 24px 18px; border: 1px solid var(--line); border-left: 2px solid var(--copper); border-radius: 3px; background: rgba(255,255,255,.45); }
.lo-form .reihe { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.lo-form label { display: block; font-size: 14px; color: var(--ink-soft); margin: 12px 0 4px; }
.lo-form label span { color: var(--ink-muted); }
.lo-form input, .lo-form select, .lo-form textarea { width: 100%; font: inherit; font-size: 16px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.7); color: var(--ink); }
.lo-form textarea { min-height: 170px; resize: vertical; }
.lo-form select { min-height: 44px; }
.lo-form input:focus-visible, .lo-form select:focus-visible, .lo-form textarea:focus-visible { outline: 1px solid var(--copper); outline-offset: 1px; border-color: var(--copper); }
.lo-form .feldhinweis { margin: 6px 0 0; font-size: 13px; color: var(--ink-soft); }
.lo-form button { margin-top: 18px; padding: 11px 20px; border: 1px solid var(--green); border-radius: 3px; background: var(--green); color: var(--paper); font: inherit; font-size: 15px; cursor: pointer; }
.lo-form button:hover { background: #082d22; }
.lo-form button:disabled { opacity: .6; cursor: default; }
.lo-form .status { min-height: 1.4em; margin: 10px 0 0; font-size: 15px; }
.lo-form .status.ok { color: var(--green); } .lo-form .status.warn { color: #A63D2F; }
.lo-form .falle { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.lo-form .hinweis { margin: 8px 0 0; }
.lo-weitere { font-size: 15px; color: var(--ink-soft); }
@media (max-width: 600px) { .lo-form { padding: 18px 16px 14px; } .lo-form .reihe { grid-template-columns: 1fr; } .lo-form textarea { min-height: 210px; } }`;

// Formular: prüft im Browser, sendet an Gochs /contact (wie das Kontaktformular der Startseite), meldet das Ergebnis im Statusfeld
const SKRIPT = (lang, t) => `<script>
(() => {
  'use strict';
  const form = document.getElementById('loesung-anfrage'); if (!form) return;
  const status = document.getElementById('loesung-status'), knopf = document.getElementById('loesung-senden'), geladen = Date.now();
  const T = ${JSON.stringify({ betreff: t.betreff, firma: t.felder.firma, art: t.felder.art, budget: t.felder.budget, sendet: t.sendet, gesendet: t.gesendet, ungueltig: t.ungueltig, fehler: t.fehler })};
  const say = (text, art) => { status.textContent = text; status.className = 'status' + (art ? ' ' + art : ''); };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const name = (d.name || '').trim(), email = (d.email || '').trim(), text = (d.text || '').trim();
    if (name.length < 2 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email) || text.length < 20) { say(T.ungueltig, 'warn'); return; }
    const message = [T.betreff, '', d.firma && d.firma.trim() ? T.firma + ': ' + d.firma.trim() : null, d.art ? T.art.replace(/\\?$/, '') + ': ' + d.art : null, d.budget ? T.budget + ': ' + d.budget : null, '', text].filter(x => x !== null).join('\\n').replace(/\\n{3,}/g, '\\n\\n').trim();
    knopf.disabled = true; say(T.sendet);
    try {
      const r = await fetch(${JSON.stringify(KONTAKT_ENDPUNKT)}, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang: ${JSON.stringify(lang)}, art: 'loesung', name, email, phone: '', message, website: d.website || '', t: geladen }) });
      const out = await r.json().catch(() => ({}));
      if (r.ok && out.ok) { say(T.gesendet, 'ok'); form.reset(); } else say(out.error || T.fehler, 'warn');
    } catch (_) { say(T.fehler, 'warn'); }
    knopf.disabled = false;
  });
})();
</script>`;

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
<p class="frei">${esc(t.anfrage)}</p>
<ul class="ideen">${t.ideen.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
<form class="lo-form" id="loesung-anfrage" novalidate>
<div class="reihe">
<div><label for="l-name">${esc(t.felder.name)}</label><input type="text" id="l-name" name="name" maxlength="80" required autocomplete="name"></div>
<div><label for="l-email">${esc(t.felder.email)}</label><input type="email" id="l-email" name="email" maxlength="120" required autocomplete="email"></div>
<div><label for="l-firma">${esc(t.felder.firma)} <span>${esc(t.felder.optional)}</span></label><input type="text" id="l-firma" name="firma" maxlength="120" autocomplete="organization"></div>
<div><label for="l-art">${esc(t.felder.art)} <span>${esc(t.felder.optional)}</span></label><select id="l-art" name="art"><option value="">${esc(t.felder.waehlen)}</option>${t.artWerte.map(w => `<option>${esc(w)}</option>`).join("")}</select></div>
<div><label for="l-budget">${esc(t.felder.budget)} <span>${esc(t.felder.optional)}</span></label><select id="l-budget" name="budget"><option value="">${esc(t.felder.waehlen)}</option>${t.budgetWerte.map(w => `<option>${esc(w)}</option>`).join("")}</select></div>
</div>
<label for="l-text">${esc(t.felder.text)}</label><textarea id="l-text" name="text" maxlength="2500" required aria-describedby="l-text-hinweis" placeholder="${esc(t.platzhalter)}"></textarea>
<p class="feldhinweis" id="l-text-hinweis">${esc(t.textHinweis)}</p>
<div class="falle" aria-hidden="true"><label for="l-website">Website</label><input type="text" id="l-website" name="website" tabindex="-1" autocomplete="off"></div>
<button type="submit" id="loesung-senden">${esc(t.senden)}</button>
<p class="status" id="loesung-status" role="status" aria-live="polite"></p>
<p class="meta hinweis">${esc(t.datenschutz)}</p>
</form>
<p class="lo-weitere">${esc(t.lieber)} <a href="${home}#kontakt">${esc(t.termin)}</a> · <a href="mailto:robin@robin.vision">robin@robin.vision</a></p>
<p class="meta"><a href="${up}${LOESUNG.find(s => s.lang === andere).adresse}" lang="${andere}" hreflang="${andere}">${esc(t.andere)}</a></p>
${newsletterKasten(lang, up, "impuls")}
</article>
${SKRIPT(lang, t)}`;
  return rahmen({ goch: "loesung", lang, up, titel: t.titel, seitentitel: t.seitentitel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: url(andere) }], css: CSS, main, aktiv: "loesung" });
}
