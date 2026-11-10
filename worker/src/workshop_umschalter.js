// Umschalter zwischen den Workshops (seit 10.11.2026; Robin: Workshop E-Rechnung nicht mit dem KI-Workshop vermischen).
// Jede Seite trägt nur ihren eigenen Inhalt; oben steht eine schmale Leiste mit beiden Workshops, die aktuelle Seite markiert.
// adressen: { ki, erechnung } relativ zur Wurzel der Website; up führt von der Seite zur Wurzel.
const T = {
  de: { label: "Workshops", ki: "KI-Kompetenz", erechnung: "E-Rechnung" },
  en: { label: "Workshops", ki: "AI literacy", erechnung: "E-invoicing" },
};
const ADRESSEN = {
  de: { ki: "workshops/", erechnung: "workshops/e-rechnung/" },
  en: { ki: "workshops/en/", erechnung: "workshops/en/e-rechnung/" },
};

export function workshopUmschalter(lang, up, aktiv) {
  const t = T[lang], a = ADRESSEN[lang];
  const link = id => id === aktiv
    ? `<a href="${up}${a[id]}" aria-current="page">${t[id]}</a>`
    : `<a href="${up}${a[id]}">${t[id]}</a>`;
  return `<nav class="ws-umschalter" aria-label="${t.label}">${link("ki")}${link("erechnung")}</nav>`;
}

export const UMSCHALTER_CSS = `.ws-umschalter { display: flex; gap: 6px; margin: 0 0 22px; font: 500 13px/1.4 var(--sans); }
.ws-umschalter a { padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--ink-soft); text-decoration: none; }
.ws-umschalter a:hover { border-color: var(--green); color: var(--green); }
.ws-umschalter a[aria-current="page"] { border-color: var(--green); background: var(--green); color: var(--paper); }`;
