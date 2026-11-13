// Gemeinsamer Seitenkopf (Robin, 16.10.2026: oben zu voll auf dem iPhone, Verweise sollen auf die Unterseiten führen, Termin
// bleibt): Wortmarke robin.vision, drei Seiten (Werkzeuge, Impulse, Über mich), Termin als Knopf, auf schmalen Bildschirmen ein
// Menü (details/summary, ohne Skript) mit denselben Seiten, Nachricht und der anderen Sprache. Seit 17.10.2026 heißen die Seiten SmartFormular, Impulse, Workshops (mit Unterweisung nach EU AI Act), Über mich (Robin); seit 18.10.2026 „Werkzeuge“ statt „SmartFormular“ (robin.vision stellt Werkzeuge vor, SmartFormular ist eines davon). Genutzt von werkzeug.js (rahmen)
// und blog.js (shell); die Startseite trägt denselben Aufbau von Hand (index.html: Sprachwahl statt Wortmarke, Texte je Sprache
// über language.js), tests/kopf_test.mjs hält beides zusammen. Seit Welle 2 der Textprüfung heißt der Werkzeugkasten
// „Robins Werkzeugkasten“ (Robin, 23.10.2026), seit 03.11.2026 „Werkzeuge“, englisch „Tools“ (Robin).
const T = {
  de: { tools: "Werkzeuge", posts: "Impulse", workshops: "Workshops", about: "Über mich", termin: "Termin", nachricht: "Nachricht", menue: "Menü", andere: "English", seiten: "Seiten" },
  en: { tools: "Tools", posts: "Food for Thought", workshops: "Workshops", about: "About", termin: "Appointment", nachricht: "Message", menue: "Menu", andere: "Deutsch", seiten: "Pages" },
};
// Ziele je Sprache, relativ zur Wurzel der Website
export const ZIELE = {
  de: { home: "", tools: "werkzeuge/", posts: "blog/", workshops: "workshops/", about: "ueber-mich/" },
  en: { home: "?lang=en", tools: "werkzeuge/en/", posts: "blog/en/", workshops: "workshops/en/", about: "about/" },
};
export const MARKE = `robin<span class="punkt">.</span>vision`;

// lang; up: Weg zur Wurzel („../“); aktiv: "tools" | "posts" | "workshops" | "about" | null; andere: Adresse der anderen Sprachfassung dieser
// Seite (sonst die Startseite in der anderen Sprache)
export function kopf(lang, up, { aktiv = null, andere = "" } = {}) {
  const l = lang === "en" ? "en" : "de", t = T[l], z = ZIELE[l], andereLang = l === "en" ? "de" : "en";
  const home = up + z.home;
  const link = k => `<a href="${up}${z[k]}"${aktiv === k ? ' aria-current="page"' : ""}>${t[k]}</a>`;
  const seiten = ["tools", "posts", "workshops", "about"].map(link).join("");
  return `<header class="kopf">
<a class="marke" href="${home}">${MARKE}</a>
<nav class="hauptnav" aria-label="${t.seiten}">${seiten}</nav>
<a class="termin" href="${home}#kontakt">${t.termin}</a>
<details class="menue"><summary aria-label="${t.menue}"><span></span></summary>
<nav aria-label="${t.seiten}">${seiten}<a href="${home}#nachricht">${t.nachricht}</a><a href="${andere || up + ZIELE[andereLang].home}" lang="${andereLang}" hreflang="${andereLang}">${t.andere}</a></nav>
</details>
</header>`;
}

// Goch im Kopf der Unterseiten („Ein Tal“, Schritt 4, 11.11.2026): ein Himmelsstreifen mit festem Platz unter dem Seitenkopf,
// damit nichts springt, wenn goch-seite.js nach dem Laden Goch auf seinen Ast setzt. Ist Goch ausgeschaltet, bleibt der
// Streifen leer. Schalter, Blatt und Stile holt goch-seite.js aus der Startseite – hier steht nur der Platz.
export const GOCH_SKRIPT = "goch-seite.js?v=20261202";
// Goch kennt die Seite (Schritt 5): Gruß und Einstiegsfragen je Seitenart, in der Sprache der Seite. Der Gruß steht als kleine
// Blase neben Goch und als erster Satz im Gespräch; er kommt aus der Seite, nicht vom Worker. Die Fragen ersetzen die der
// Startseite. Alles lässt sich aus den Inhalten der Seite beantworten (Seitenwissen); keine Preise, keine Zusagen.
export const GOCH_SEITEN = {
  de: {
    workshops: ["Willkommen bei den Workshops. Fragen Sie mich, welcher zu Ihnen passt.", ["Welcher Workshop passt zu uns?", "Was ist der Workshop E-Rechnung?", "Wie frage ich einen Workshop an?"]],
    ki: ["Hier geht es um den Workshop KI-Kompetenz. Fragen Sie mich, was Sie wissen möchten.", ["Für wen ist der Workshop?", "Wie läuft der Workshop ab?", "Was bekommen wir am Ende?"]],
    erechnung: ["Hier geht es um den Workshop E-Rechnung. Fragen Sie mich, was Sie wissen möchten.", ["Was lerne ich im Workshop?", "Wie lange dauert er?", "Wie buche ich den Workshop?"]],
    werkzeuge: ["Hier finden Sie die Werkzeuge. Fragen Sie mich, welches zu Ihnen passt.", ["Welches Werkzeug passt zu mir?", "Was ist SmartFormular?", "Wie probiere ich ein Werkzeug aus?"]],
    robin: ["Hier stellt sich Robin vor. Fragen Sie mich etwas über ihn.", ["Wer ist Robin?", "Woran arbeitet Robin gerade?", "Ich möchte Robin etwas ausrichten."]],
    impulse: ["Hier stehen Robins Impulse. Fragen Sie mich, worum es geht.", ["Worum geht es in den Impulsen?", "Was gibt's Neues?", "Wie bekomme ich die Impulse per E-Mail?"]],
    impuls: ["Fragen Sie mich etwas zu diesem Impuls.", ["Worum geht es in diesem Impuls?", "Was gibt's Neues?", "Ich möchte Robin etwas ausrichten."]],
  },
  en: {
    workshops: ["Welcome to the workshops. Ask me which one suits you.", ["Which workshop suits us?", "What is the e-invoicing workshop?", "How do I request a workshop?"]],
    ki: ["This page is about the AI literacy workshop. Ask me anything you'd like to know.", ["Who is the workshop for?", "How does the workshop work?", "What do we get at the end?"]],
    erechnung: ["This page is about the e-invoicing workshop. Ask me anything you'd like to know.", ["What will I learn?", "How long does it take?", "How do I book the workshop?"]],
    werkzeuge: ["Here you'll find the tools. Ask me which one suits you.", ["Which tool suits me?", "What is SmartFormular?", "How do I try a tool?"]],
    robin: ["This is where Robin introduces himself. Ask me something about him.", ["Who is Robin?", "What is Robin working on?", "I'd like to leave Robin a message."]],
    impulse: ["Here are Robin's articles. Ask me what they're about.", ["What are the articles about?", "What's new?", "How do I get the articles by email?"]],
    impuls: ["Ask me something about this article.", ["What is this article about?", "What's new?", "I'd like to leave Robin a message."]],
  },
};
const attr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
// tal: Schalter je Seite – ohne Landschaft und Tal bleibt der Himmelsstreifen; art: Schlüssel aus GOCH_SEITEN
export const gochKopf = (up, tal = true, art = "", lang = "de") => {
  const t = (GOCH_SEITEN[lang === "en" ? "en" : "de"] || {})[art];
  return `<div class="goch-kopf" id="goch-kopf"${tal ? "" : ' data-tal="aus"'}${t ? ` data-gruss="${attr(t[0])}" data-fragen="${attr(t[1].join("|"))}"` : ""}></div>`;
};
// Nachtfarben vor dem ersten Bild (Robin, 12.11.2026: Die Unterseiten zeigten nachts in der ersten Sekunde die Tagfarben).
// Die Palette steht im Stil der Seite, landscape.js lädt im Kopf und ruft dort gleich prepare() – Klasse und Farben stehen
// am <html>, bevor es ein <body> gibt (13.11.2026: mit dem Aufruf erst im <body> hatte WebKit unter Last das <body> schon in
// Tagfarben berechnet, ein Bild lang Tagpapier auf werkzeuge/). Das erste Skript im <body> ruft prepare() noch einmal. NACHT_CSS ist wörtlich die Palette aus index.html
// (tests/site_test.mjs vergleicht beide); die Versionsangabe ist die der Startseite, damit der Browser die Datei nur einmal lädt.
// Ohne landscape.js (Fehler, blockiert) bleibt die Seite in den Tagfarben. Bilder der Landschaft laden weiter erst nach dem
// Laden der Seite (goch-seite.js).
export const LANDSCHAFT_SKRIPT = "landscape.js?v=20261204";
export const nachtKopf = up => `<script src="${up}${LANDSCHAFT_SKRIPT}"></script>\n<script>window.RJLLandscape?.prepare();</script>\n`;
export const NACHT_START = `<script>window.RJLLandscape?.prepare();</script>\n`;
export const NACHT_CSS = `:root {
  --nacht: 0; --nacht-prozent: 0%;
  --paper-day: #F3EFE5; --paper-night: #1B2230;
  --ink-day: #1F1F1F; --ink-night: #E8E2D6;
  --ink-soft-day: #5C5C5C; --ink-soft-night: #B5AFA4;
  --ink-muted-day: #68665F; --ink-muted-night: #B5AFA4;
  --green-day: #0B3D2E; --green-night: #9FC4B3;
  --copper-day: #B8724F; --copper-night: #D39A78;
  --line-day: #D6D9D6; --line-night: #3A4351;
  --hover-day: #EDE5D8; --hover-night: #293241;
  --surface-day: #F8F5EE; --surface-night: #242D3B;
  --reply-day: #E3E3D8; --reply-night: #2B3842;
  --warning-day: #A63D2F; --warning-night: #F0AC91;
  --sky-top: #EDF2F1; --sky-bottom: #FAF4E8; --sky-glow: #E1A777;
  --star: #EEE8D9; --sun: #FAE5A7; --sun-halo: #F9DA9A;
  --moon-light: #EEE8D9;
  --leaf-copper: #B8724F; --leaf-ochre: #AE8951; --leaf-rust: #90513E;
  --snow: #E8E8DF; --petal: #F4E9DF;
}
html.landscape-on {
  --paper: var(--fallback-paper); --ink: var(--fallback-ink); --ink-soft: var(--fallback-ink-soft);
  --ink-muted: var(--fallback-ink-muted); --green: var(--fallback-green); --copper: var(--fallback-copper);
  --line: var(--fallback-line); --hover: var(--fallback-hover); --surface: var(--fallback-surface);
  --reply: var(--fallback-reply); --warning: var(--fallback-warning);
}
@supports (color: color-mix(in srgb, white, black)) {
  html.landscape-on {
    --paper: color-mix(in srgb, var(--paper-day), var(--paper-night) var(--nacht-prozent));
    --ink: var(--readable-ink, color-mix(in srgb, var(--ink-day), var(--ink-night) var(--nacht-prozent)));
    --ink-soft: var(--readable-ink-soft, color-mix(in srgb, var(--ink-soft-day), var(--ink-soft-night) var(--nacht-prozent)));
    --ink-muted: var(--readable-ink-muted, color-mix(in srgb, var(--ink-muted-day), var(--ink-muted-night) var(--nacht-prozent)));
    --green: var(--readable-green, color-mix(in srgb, var(--green-day), var(--green-night) var(--nacht-prozent)));
    --copper: color-mix(in srgb, var(--copper-day), var(--copper-night) var(--nacht-prozent));
    --line: color-mix(in srgb, var(--line-day), var(--line-night) var(--nacht-prozent));
    --hover: color-mix(in srgb, var(--hover-day), var(--hover-night) var(--nacht-prozent));
    --surface: color-mix(in srgb, var(--surface-day), var(--surface-night) var(--nacht-prozent));
    --reply: color-mix(in srgb, var(--reply-day), var(--reply-night) var(--nacht-prozent));
    --warning: var(--readable-warning, color-mix(in srgb, var(--warning-day), var(--warning-night) var(--nacht-prozent)));
  }
}
.landscape-on body { background-blend-mode: multiply; }`;
export const gochSkript = up => `<script src="${up}${GOCH_SKRIPT}" defer></script>\n`;
export const GOCH_KOPF_CSS = `.goch-kopf { --gw: clamp(170px, 40vw, 330px); position: relative; height: calc(66px + var(--gw) * .616 + clamp(30px, 6vh, 64px)); margin-top: -66px; overflow: hidden; overflow: clip visible; background: linear-gradient(rgba(176, 204, 218, .5), rgba(176, 204, 218, 0) 88%); background: linear-gradient(rgba(176, 204, 218, calc(.5 - var(--nacht, 0) * .5)), rgba(176, 204, 218, 0) 88%); } /* nachts kein heller Streifen, bevor der Himmel der Landschaft da ist */
/* Der Inhalt steht als ein Blatt über dem Tal (Schritt 8). Maße gelten immer, damit nichts springt; Fläche, Rand und Schatten
   kommen erst mit dem Tal (html.tal-on setzt landscape.js). */
.goch-kopf + main { position: relative; z-index: 1; padding-top: clamp(22px, 4vh, 44px); margin-bottom: clamp(40px, 9vh, 90px); border: 1px solid transparent; border-radius: 6px; transition: background-color 1.2s, border-color 1.2s, box-shadow 1.2s; }
.tal-on .goch-kopf + main { background: color-mix(in srgb, var(--surface, #F8F5EE) 92%, transparent); border-color: var(--line); box-shadow: 0 26px 50px -24px rgba(40, 32, 20, .28); }
.tal-on .goch-kopf ~ .foot { position: relative; z-index: 1; width: fit-content; padding: 10px 16px; margin-bottom: 40px; border: 1px solid var(--line); border-radius: 6px; background: color-mix(in srgb, var(--surface, #F8F5EE) 92%, transparent); }
@media (max-width: 720px) { .goch-kopf + main { margin-left: 14px; margin-right: 14px; padding-left: calc(7vw - 14px); padding-right: calc(7vw - 14px); } .tal-on .goch-kopf ~ .foot { margin-left: 14px; margin-right: 14px; } }
@media (prefers-reduced-motion: reduce) { .goch-kopf + main { transition: none; } }`;

// Stile des Kopfes; die Startseite ergänzt .kopf.start (über der Bühne, Sprachwahl statt Wortmarke)
export const KOPF_CSS = `.kopf { position: relative; z-index: 5; max-width: 780px; margin: 0 auto; padding: 18px min(6vw, 48px) 0; display: flex; align-items: center; gap: 18px; }
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
