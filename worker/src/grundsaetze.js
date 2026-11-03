// Die beiden Grundsätze für Werkzeuge und Workshops (Robin, 19.10.2026; gefasst 24.10.2026): echte Daten nur in Werkzeuge, die dafür
// gemacht sind, und modellunabhängige Lösungen ohne Vendor-Lock-in. Seit 03.11.2026 (Robin: „deutlich kleiner und weniger
// aufdringlich … Message und Alleinstellungsmerkmal trotzdem behalten“) keine Karten mehr und kein Abschnitt auf der Startseite,
// sondern eine ruhige Zeile unter der Einleitung der Seiten Werkzeuge (uebersicht.js) und Workshops (workshops.js).

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const GRUNDSAETZE = {
  de: "Echte Daten nur in Werkzeuge, die dafür gemacht sind – modellunabhängig, ohne Lock-in.",
  en: "Real data only in tools built for it – model-agnostic, no lock-in.",
};

// Stile (Variablen der jeweiligen Seite: --ink-muted, --sans)
export const GRUNDSAETZE_CSS = `.grundsatz-zeile { margin: 14px 0 0; font: 400 14px/1.5 var(--sans); letter-spacing: .01em; color: var(--ink-muted); }`;

// Zeile für eine Unterseite (direkt unter der Einleitung)
export function grundsaetze(lang) {
  const t = GRUNDSAETZE[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  return `<p class="grundsatz-zeile">${esc(t)}</p>`;
}
