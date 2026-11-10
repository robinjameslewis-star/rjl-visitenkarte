// Umschalter zwischen den Workshops (seit 10.11.2026; Robin: Workshop E-Rechnung nicht mit dem KI-Workshop vermischen).
// Jede Seite trägt nur ihren eigenen Inhalt; oben steht eine schmale Leiste mit beiden Workshops, die aktuelle Seite markiert.
// adressen: { ki, erechnung } relativ zur Wurzel der Website; up führt von der Seite zur Wurzel.
const T = {
  de: { label: "Workshops", ki: "KI-Kompetenz", erechnung: "E-Rechnung" },
  en: { label: "Workshops", ki: "AI literacy", erechnung: "E-invoicing" },
};
const ADRESSEN = {
  de: { ki: "workshops/ki-kompetenz/", erechnung: "workshops/e-rechnung/" },
  en: { ki: "workshops/en/ki-kompetenz/", erechnung: "workshops/en/e-rechnung/" },
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

// Ausschnitt aus dem Workshop als Video (Robin, 10.11.2026: „ich fände es auch besser wenn hier ein videoausschnitt aus dem workshop kommt,
// einer der lust auf den workshop macht“; KI-Kompetenz: Ausschnitt mit Goch, bis Robins Aufnahme „live mit Goch in Präsenz“ da ist).
// Kein Autoplay: Ton gehört dazu, die Untertitel stehen im Bild. Erst beim Abspielen geladen (preload none, Vorschaubild).
const VIDEO_T = {
  de: { hinweis: "Ausschnitt aus dem Workshop · KI-Figur, künstliche Stimme" },
  en: { hinweis: "Excerpt from the workshop (in German) · AI character, synthetic voice" },
};
export function workshopVideo(lang, up, datei, label) {
  const v = `${up}assets/videos/${datei}`;
  return `<figure class="ws-video"><video controls playsinline preload="none" poster="${v}.jpg" width="640" height="360" aria-label="${label}"><source src="${v}.mp4" type="video/mp4"></video><figcaption>${VIDEO_T[lang].hinweis}</figcaption></figure>`;
}
export const VIDEO_CSS = `.ws-video { margin: 26px 0 28px; }
.ws-video video { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; border-radius: 6px; background: #efe9dc; box-shadow: 0 10px 28px rgba(31,31,31,.14), 0 1px 3px rgba(31,31,31,.10); }
.ws-video figcaption { margin-top: 8px; font-size: 13px; color: var(--ink-soft); }`;
