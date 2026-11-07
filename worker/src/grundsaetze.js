// Die beiden Grundsätze für Werkzeuge und Workshops (Robin, 19.10.2026; gefasst 24.10.2026): Klardaten nur in Werkzeuge, die
// dafür gemacht sind, und modellunabhängige Lösungen ohne Vendor-Lock-in. Gestaltung: am 19.10. zwei Karten mit Sinnbildern,
// am 03.11. nur eine Zeile unter der Einleitung; seit 04.11.2026 (Robin: „gesunder Mittelweg aus früher und jetzt“, mit dem Wort
// „Klardaten“, klarer platziert) ein ruhiger zweispaltiger Block ohne Karten und Sinnbilder – Workshops nach „Wie wir
// zusammenarbeiten“ (workshops.js), Werkzeuge vor dem Vergleich (uebersicht.js). Nicht auf der Startseite.

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const GRUNDSAETZE = {
  de: {
    label: "Zwei Grundsätze",
    punkte: [
      ["Klardaten", "Klardaten nur in Werkzeuge, die dafür gemacht sind",
        "Mandanten-, Personal- und Finanzdaten sind selten anonymisiert. Datenschutz, Verschwiegenheit und KI-Verordnung sind der Ausgangspunkt, nicht der Nachtrag."],
      ["Ohne Lock-in", "Modellunabhängig, ohne Vendor-Lock-in",
        "Lösungen, die mit verschiedenen Sprachmodellen und Anbietern arbeiten, haben Vorrang. So bleibt die Wahl bei Ihnen."],
    ],
  },
  en: {
    label: "Two principles",
    punkte: [
      ["Real data", "Real data only in tools built for it",
        "Client, staff and financial data is rarely anonymised. Data protection, confidentiality and the EU AI Act are the starting point, not an afterthought."],
      ["No lock-in", "Model-agnostic, no vendor lock-in",
        "Solutions that work with different language models and providers take priority. The choice stays with you."],
    ],
  },
};

// Stile (Variablen der jeweiligen Seite: --line, --copper, --green, --ink-soft, --serif, --sans)
export const GRUNDSAETZE_CSS = `.grundsaetze { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin: 34px 0 30px; padding: 20px 0 22px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.grundsaetze .gs-kicker { display: block; font: 500 11px/1.6 var(--sans); letter-spacing: .18em; text-transform: uppercase; color: var(--copper); }
.grundsaetze .gs-titel { display: block; margin: 3px 0 6px; font: 500 18px/1.3 var(--serif); color: var(--green); }
.grundsaetze .gs-nb { white-space: nowrap; }
.grundsaetze .gs-text { margin: 0; max-width: none; font-size: 14px; line-height: 1.55; color: var(--ink-soft); text-align: left; hyphens: manual; }
@media (max-width: 720px) { .grundsaetze { grid-template-columns: 1fr; gap: 18px; } }`;

// Block für eine Unterseite
export function grundsaetze(lang) {
  const t = GRUNDSAETZE[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  return `<section class="grundsaetze" aria-label="${esc(t.label)}">
${t.punkte.map(([kicker, titel, text]) => `<div><span class="gs-kicker">${esc(kicker)}</span><span class="gs-titel">${esc(titel).replace(/Vendor-Lock-in|vendor lock-in/, m => `<span class="gs-nb">${m}</span>`)}</span><p class="gs-text frei">${esc(text)}</p></div>`).join("\n")}
</section>`;
}
