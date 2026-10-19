// Zwei Grundsätze für Werkzeugkasten und Workshops (Robin, 19.10.2026): rechtssichere Verarbeitung sensibler Klardaten und
// modellunabhängige Lösungen ohne Vendor-Lock-in. Eine Quelle für drei Stellen: Startseite (index.html zwischen den Marken
// <!-- grundsaetze --> und <!-- /grundsaetze -->, je Sprache ein Block, language.js blendet über data-langs um), Übersicht
// „Werkzeugkasten“ (uebersicht.js) und Workshops (workshops.js). Gestaltung (Robin, 19.10.2026: „etwas aufwändiger und herausragender,
// nicht übertrieben“): zwei Karten mit Kupferkante oben, Sinnbild im grünen Kreis, Kupferzeile, Serifentitel; nachts die Seitenfarben.

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
export const GRUNDSAETZE_CSS = `.grundsaetze-reihe { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 8px 0 10px; padding: 0; }
.gs-karte { position: relative; overflow: hidden; margin: 0; padding: 24px 24px 22px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255,255,255,.6); background: var(--surface, rgba(255,255,255,.6)); box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 10px 28px -18px rgba(11,61,46,.35); }
.gs-karte::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--copper); }
.gs-icon { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; margin: 0 0 14px; border-radius: 50%; color: var(--green); background: rgba(11,61,46,.07); background: color-mix(in srgb, var(--green) 10%, transparent); border: 1px solid rgba(11,61,46,.16); border-color: color-mix(in srgb, var(--green) 22%, transparent); }
.gs-icon svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.grundsaetze .gs-kicker { display: block; font: 500 12px/1.6 var(--sans); letter-spacing: .18em; text-transform: uppercase; color: var(--copper); }
.grundsaetze .gs-titel { display: block; font: 500 21px/1.3 var(--serif); color: var(--green); margin: 4px 0 8px; }
.grundsaetze .gs-text { margin: 0; max-width: none; font-size: 15px; line-height: 1.6; color: var(--ink-soft); text-align: left; hyphens: manual; }
.grundsaetze .gs-nb { white-space: nowrap; }
@media (max-width: 720px) { .grundsaetze-reihe { grid-template-columns: 1fr; gap: 14px; } .gs-karte { padding: 20px 20px 18px; } }`;

// Sinnbilder (Linien, Farbe aus dem Text): Schild mit Schloss für Klardaten, Wechselpfeile für „ohne Lock-in“
const ICONS = [
  `<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10.2 11V9.6a1.8 1.8 0 0 1 3.6 0V11"/></svg>`,
  `<svg viewBox="0 0 24 24"><path d="M5 8h13"/><path d="M15 5l3 3-3 3"/><path d="M19 16H6"/><path d="M9 13l-3 3 3 3"/></svg>`,
];
const reihe = t => `<div class="grundsaetze-reihe">
${t.punkte.map(([kicker, titel, text], i) => `<article class="gs-karte"><span class="gs-icon" aria-hidden="true">${ICONS[i]}</span><span class="gs-kicker">${esc(kicker)}</span><span class="gs-titel">${esc(titel).replace(/Vendor-Lock-in|vendor lock-in/, m => `<span class="gs-nb">${m}</span>`)}</span><p class="gs-text frei">${esc(text)}</p></article>`).join("\n")}
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
