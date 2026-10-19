// Zwei Grundsätze für Werkzeugkasten und Workshops (Robin, 19.10.2026): rechtssichere Verarbeitung sensibler Klardaten und
// modellunabhängige Lösungen ohne Vendor-Lock-in. Eine Quelle für drei Stellen: Startseite (index.html zwischen den Marken
// <!-- grundsaetze --> und <!-- /grundsaetze -->, je Sprache ein Block, language.js blendet über data-langs um), Übersicht
// „Werkzeugkasten“ (uebersicht.js) und Workshops (workshops.js). Gestaltung wie die drei Schritte: Linienraster, Kupferzeile, Serifentitel.

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const GRUNDSAETZE = {
  de: {
    titel: "Zwei Grundsätze", titelStart: "Zwei Grundsätze für Werkzeugkasten und Workshops",
    punkte: [
      ["Klardaten", "Sensible Klardaten, rechtssicher verarbeitet",
        "Werkzeugkasten und Workshops sind auf die rechtssichere Verarbeitung sensibler Klardaten ausgerichtet – Mandanten-, Personal- und Finanzdaten, die nicht anonymisiert sind. Datenschutz, Verschwiegenheitspflichten und KI-Verordnung sind der Ausgangspunkt, nicht der Nachtrag."],
      ["Ohne Lock-in", "Modellunabhängig, ohne Vendor-Lock-in",
        "Lösungen, die mit verschiedenen Sprachmodellen und Anbietern arbeiten, haben Vorrang. So behalten Sie die Wahl und können wechseln, wenn sich Preise, Regeln oder Modelle ändern."],
    ],
  },
  en: {
    titel: "Two principles", titelStart: "Two principles behind our toolbox and workshops",
    punkte: [
      ["Plaintext data", "Sensitive plaintext data, handled lawfully",
        "Our toolbox and workshops are designed for the lawful processing of sensitive plaintext data – client, personnel and financial data that has not been anonymised. Data protection, confidentiality duties and the EU AI Act are the starting point, not an afterthought."],
      ["No lock-in", "Model-agnostic, no vendor lock-in",
        "Solutions that work with different language models and providers take priority. You keep the choice – and can switch when prices, rules or models change."],
    ],
  },
};

// Stile für Unterseiten und Startseite (Variablen der jeweiligen Seite: --line, --copper, --green, --ink-soft, --serif, --sans)
export const GRUNDSAETZE_CSS = `.grundsaetze-reihe { display: grid; grid-template-columns: 1fr 1fr; margin: 0 0 8px; padding: 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.grundsaetze-reihe > div { padding: 16px 18px 16px 0; }
.grundsaetze-reihe > div + div { padding-left: 18px; border-left: 1px solid var(--line); }
.grundsaetze .gs-kicker { display: block; font: 500 12px/1.6 var(--sans); letter-spacing: .18em; text-transform: uppercase; color: var(--copper); }
.grundsaetze .gs-titel { display: block; font: 500 20px/1.3 var(--serif); color: var(--green); margin: 2px 0 6px; }
.grundsaetze .gs-text { margin: 0; max-width: none; font-size: 15px; line-height: 1.55; color: var(--ink-soft); text-align: left; hyphens: manual; }
.grundsaetze .gs-nb { white-space: nowrap; }
@media (max-width: 720px) { .grundsaetze-reihe { grid-template-columns: 1fr; } .grundsaetze-reihe > div + div { padding-left: 0; border-left: 0; border-top: 1px solid var(--line); } }`;

const reihe = t => `<div class="grundsaetze-reihe">
${t.punkte.map(([kicker, titel, text]) => `<div><span class="gs-kicker">${esc(kicker)}</span><span class="gs-titel">${esc(titel).replace(/Vendor-Lock-in|vendor lock-in/, m => `<span class="gs-nb">${m}</span>`)}</span><p class="gs-text frei">${esc(text)}</p></div>`).join("\n")}
</div>`;

// Abschnitt für eine Unterseite (Überschrift h2 mit Sprungmarke #grundsaetze)
export function grundsaetze(lang) {
  const t = GRUNDSAETZE[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  return `<section class="grundsaetze" aria-labelledby="grundsaetze-titel">
<h2 id="grundsaetze-titel">${esc(t.titel)}</h2>
${reihe(t)}
</section>`;
}

// Beide Sprachen für die Startseite (eigener Abschnitt im Stil der übrigen Abschnitte, Englisch zunächst verborgen)
export const startGrundsaetze = () => ["de", "en"].map(lang => {
  const t = GRUNDSAETZE[lang];
  return `  <section class="blog-teaser grundsaetze" id="grundsaetze-${lang}" data-langs="${lang}"${lang === "de" ? "" : " hidden"} aria-labelledby="grundsaetze-titel-${lang}">
    <h2 id="grundsaetze-titel-${lang}">${esc(t.titelStart)}</h2>
    ${reihe(t).split("\n").join("\n    ")}
  </section>`;
}).join("\n");
