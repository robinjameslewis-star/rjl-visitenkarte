// Gemeinsamer Seitenkopf (Robin, 16.10.2026: oben zu voll auf dem iPhone, Verweise sollen auf die Unterseiten führen, Termin
// bleibt): Wortmarke robin.vision, drei Seiten (Werkzeuge, Impulse, Über mich), Termin als Knopf, auf schmalen Bildschirmen ein
// Menü (details/summary, ohne Skript) mit denselben Seiten, Nachricht und der anderen Sprache. Vierte Seite „Schulung“ seit 16.10.2026. Genutzt von werkzeug.js (rahmen)
// und blog.js (shell); die Startseite trägt denselben Aufbau von Hand (index.html: Sprachwahl statt Wortmarke, Texte je Sprache
// über language.js), tests/kopf_test.mjs hält beides zusammen.
const T = {
  de: { tools: "Werkzeuge", posts: "Impulse", schulung: "Schulung", about: "Über mich", termin: "Termin", nachricht: "Nachricht", menue: "Menü", andere: "English", seiten: "Seiten" },
  en: { tools: "Tools", posts: "Food for Thought", schulung: "Training", about: "About", termin: "Appointment", nachricht: "Message", menue: "Menu", andere: "Deutsch", seiten: "Pages" },
};
// Ziele je Sprache, relativ zur Wurzel der Website
export const ZIELE = {
  de: { home: "", tools: "werkzeuge/", posts: "blog/", schulung: "schulung/", about: "ueber-mich/" },
  en: { home: "?lang=en", tools: "werkzeuge/en/", posts: "blog/en/", schulung: "training/", about: "about/" },
};
export const MARKE = `robin<span class="punkt">.</span>vision`;

// lang; up: Weg zur Wurzel („../“); aktiv: "tools" | "posts" | "schulung" | "about" | null; andere: Adresse der anderen Sprachfassung dieser
// Seite (sonst die Startseite in der anderen Sprache)
export function kopf(lang, up, { aktiv = null, andere = "" } = {}) {
  const l = lang === "en" ? "en" : "de", t = T[l], z = ZIELE[l], andereLang = l === "en" ? "de" : "en";
  const home = up + z.home;
  const link = k => `<a href="${up}${z[k]}"${aktiv === k ? ' aria-current="page"' : ""}>${t[k]}</a>`;
  const seiten = ["tools", "posts", "schulung", "about"].map(link).join("");
  return `<header class="kopf">
<a class="marke" href="${home}">${MARKE}</a>
<nav class="hauptnav" aria-label="${t.seiten}">${seiten}</nav>
<a class="termin" href="${home}#kontakt">${t.termin}</a>
<details class="menue"><summary aria-label="${t.menue}"><span></span></summary>
<nav aria-label="${t.seiten}">${seiten}<a href="${home}#nachricht">${t.nachricht}</a><a href="${andere || up + ZIELE[andereLang].home}" lang="${andereLang}" hreflang="${andereLang}">${t.andere}</a></nav>
</details>
</header>`;
}

// Stile des Kopfes; die Startseite ergänzt .kopf.start (über der Bühne, Sprachwahl statt Wortmarke)
export const KOPF_CSS = `.kopf { position: relative; z-index: 5; max-width: 780px; margin: 0 auto; padding: 18px 6vw 0; display: flex; align-items: center; gap: 18px; }
.kopf .marke { margin-right: auto; font: 400 20px/1 var(--serif); letter-spacing: .01em; color: var(--green); text-decoration: none; }
.kopf .marke .punkt { color: var(--copper); }
.kopf .hauptnav { display: flex; gap: 18px; }
.kopf .hauptnav a { padding: 10px 0; color: var(--ink-soft); text-decoration: none; font-size: 13px; letter-spacing: .03em; white-space: nowrap; }
.kopf .hauptnav a:hover { color: var(--green); }
.kopf .hauptnav a[aria-current="page"] { color: var(--green); box-shadow: inset 0 -1px 0 var(--copper); }
.kopf .termin { padding: 8px 14px; border: 1px solid var(--green); border-radius: 3px; color: var(--green); text-decoration: none; font-size: 13px; letter-spacing: .03em; white-space: nowrap; }
.kopf .termin:hover { background: var(--green); color: var(--paper); }
.kopf a:focus-visible { outline: 1px solid var(--copper); outline-offset: 3px; }
.kopf .menue { position: relative; display: none; }
.kopf .menue summary { list-style: none; cursor: pointer; width: 44px; height: 44px; margin-right: -10px; display: grid; place-items: center; }
.kopf .menue summary::-webkit-details-marker { display: none; }
.kopf .menue summary span { position: relative; display: block; width: 20px; height: 1.5px; background: var(--green); box-shadow: 0 -6px 0 var(--green), 0 6px 0 var(--green); }
.kopf .menue[open] summary span { background: transparent; box-shadow: none; }
.kopf .menue[open] summary span::before, .kopf .menue[open] summary span::after { content: ""; position: absolute; left: 0; top: 0; width: 20px; height: 1.5px; background: var(--green); transform: rotate(45deg); }
.kopf .menue[open] summary span::after { transform: rotate(-45deg); }
.kopf .menue nav { position: absolute; right: -6px; top: 50px; min-width: 220px; padding: 8px 0; display: flex; flex-direction: column; background: var(--paper); border: 1px solid var(--line); border-radius: 3px; box-shadow: 0 10px 30px rgba(0,0,0,.14); }
.kopf .menue nav a { padding: 11px 20px; color: var(--ink); text-decoration: none; font-size: 15px; }
.kopf .menue nav a:hover { background: rgba(0,0,0,.04); color: var(--green); }
.kopf .menue nav a[aria-current="page"] { color: var(--green); }
@media (max-width: 720px) { .kopf { gap: 10px; } .kopf .hauptnav { display: none; } .kopf .menue { display: block; } }`;
