// Seite „Über mich“ (ueber-mich/index.html, englisch about/index.html; Robin, 16.10.2026): eine eigene Seite im Rahmen der
// Werkzeugseiten (werkzeug.js, rahmen) mit Foto, Werdegang in Stationen, Kenntnissen, Ehrenamt und dem Weg zu LinkedIn, Termin
// und Nachricht. Der Text steht hier fest (keine Redaktion); tools/ueber-mich-bauen.mjs schreibt beide Seiten. Fakten aus Robins
// Lebenslauf (Stand Juli 2026) und Gochs Profil; Arbeitgeber und Vereine ohne Namen, keine privaten Daten (Rotlinie 09.10.2026).
import { rahmen } from "./werkzeug.js";
import { newsletterKasten } from "./kasten.js";
import { SEITEN } from "./sitemap.js";

const SITE = "https://robin.vision/";
export const LINKEDIN = "https://www.linkedin.com/in/robin-james-lewis-688945283/";
export const PORTRAIT = { datei: "assets/robin-james-lewis.jpg", breite: 720, hoehe: 900 };
// Beide Sprachfassungen mit Pfad im Repository (die Adressen stehen in sitemap.js, SEITEN, damit kein Importkreis entsteht)
export const UEBER_MICH = SEITEN.filter(s => s.id === "ueber-mich").map(s => ({ ...s, pfad: s.adresse + "index.html" }));
export const ueberMichPfad = lang => UEBER_MICH.find(s => s.lang === lang).pfad;
export const ueberMichUrl = lang => SITE + UEBER_MICH.find(s => s.lang === lang).adresse;

const TEXT = {
  de: {
    titel: "Über mich",
    beschr: "Robin James Lewis aus Balingen: vom Handel über die Verwaltungsleitung eines Kulturzentrums zum Steuerfachangestellten. Werkzeuge für den Alltag im Rechnungswesen, Ehrenamt, LinkedIn.",
    meta: "Robin James Lewis · Balingen",
    alt: "Robin James Lewis, Porträt",
    beruf: "Steuerfachangestellter in Ausbildung",
    einleitung: [
      "Ich bin Robin James Lewis aus Balingen am Fuß der Schwäbischen Alb. Nach dreizehn Jahren im Handel und drei Jahren als Verwaltungsleiter eines Kulturzentrums werde ich Steuerfachangestellter, mit festem Mandantenkreis in Finanzbuchhaltung, Lohn und Jahresabschluss in einer Kanzlei in Balingen. Die Abschlussprüfung läuft im Winter 2026/27.",
      "Nebenher digitalisiere ich Kanzleiprozesse: Belege und Bankumsätze kommen über Importe statt von Hand in die Buchhaltung, Vorsysteme werden angebunden, Auswertungen entstehen per Skript. Dabei entstehen Werkzeuge für den Alltag außerhalb des perfekten Prozesses, mitten in der Realität der Transformation – für die Tage, an denen der Bankabruf ausfällt und trotzdem gebucht werden muss. Zuerst für mich, dann für alle, die dieselbe Arbeit tun. <a href=\"{werkzeuge}\">Diese Werkzeuge</a> stelle ich hier kostenlos bereit; dazu schreibe ich jeden Freitag einen <a href=\"{impulse}\">Impuls</a> zu Automatisierung und KI im Rechnungswesen.",
    ],
    stationenTitel: "Stationen",
    stationen: [
      ["2007–2016", "Einzelhandel: Verkäufer, später stellvertretender Marktleiter in einem Getränkefachmarkt."],
      ["2016–2020", "Assistent der Niederlassungsleitung derselben Kette: Personalbudget und Mietaufwand für bis zu 56 Filialen, Personalverwaltung, Verträge im Bereich Expansion."],
      ["2020–2023", "Verwaltungsleiter eines soziokulturellen Zentrums: Finanz- und Lohnbuchhaltung, Personal, Immobilien und Drittmittel, kaufmännische Begleitung eines Umbaus mit 10 Mio. € Volumen, Einführung einer Software zur Selbstverwaltung von Personaldaten, Krisenmanagement in der Pandemie."],
      ["seit 2024", "Umschulung zum Steuerfachangestellten; seit 2025 Praxis in einer Kanzlei mit eigenem Mandantenkreis. Dort Umstellung der Kreditoren- und Debitorenbuchhaltung auf automatisierte Importe und Aufbau eines Controlling-Systems mit wöchentlichem Kennzahlenbericht (Python, Schnittstellen)."],
      ["Abschlüsse", "Fachhochschulreife (2007), Ausbildereignungsprüfung der IHK (2017), Vorbereitungskurs DATEV Kanzlei-Rechnungswesen mit Abschluss „sehr gut“ (2023)."],
    ],
    kenntnisseTitel: "Womit ich arbeite",
    kenntnisse: "DATEV Kanzlei-Rechnungswesen, LODAS und Lohn und Gehalt, DATEV Unternehmen Online; ADDISON; Vorsysteme wie Finmatics, GetMyInvoices und Lexware Office; SAP ERP. Für Automatisierung und Schnittstellen Python, dazu Sprachmodelle wie Copilot und Claude – nach einer festen Regel: Die Modelle bereiten vor, ich entscheide. Ich arbeite auf Deutsch und Englisch.",
    ehrenamtTitel: "Ehrenamt",
    ehrenamt: "Ehrenamtlicher Richter am Verwaltungsgericht Sigmaringen. Zwei Kulturvereine habe ich als Gründungsschatzmeister mit aufgebaut; ich unterstütze Vereine bei Satzung, Gemeinnützigkeit, Buchhaltung und Förderanträgen.",
    vogelTitel: "Warum ein Rotkehlchen",
    vogel: "In meinem Geburtsjahr brütete ein Rotkehlchenpaar am Haus meiner Eltern, und die Jungen schlüpften – so kam ich zu meinem Namen. Auf Englisch heißt das Rotkehlchen robin, auf Walisisch robin goch; mein Vater stammt aus Wales. Deshalb sitzt auf der Startseite ein Rotkehlchen, und deshalb heißt mein Assistent dort Goch.",
    kontaktTitel: "Kontakt",
    linkedin: "Profil auf LinkedIn", termin: "Termin vereinbaren", nachricht: "Nachricht schreiben",
    andere: "This page in English",
  },
  en: {
    titel: "About me",
    beschr: "Robin James Lewis from Balingen, Germany: from retail via running the administration of a cultural centre to certified tax clerk. Tools for everyday accounting work, voluntary work, LinkedIn.",
    meta: "Robin James Lewis · Balingen, Germany",
    alt: "Robin James Lewis, portrait",
    beruf: "Trainee tax clerk",
    einleitung: [
      "I am Robin James Lewis from Balingen at the foot of the Swabian Alb in southern Germany. After thirteen years in retail and three years running the administration of a cultural centre, I am becoming a certified tax clerk, with my own set of clients in bookkeeping, payroll and annual accounts at a tax firm in Balingen. The final examinations take place in the winter of 2026/27.",
      "Alongside, I digitise the firm's processes: documents and bank transactions reach the books through imports instead of by hand, upstream systems are connected, reports are produced by script. Out of this come tools for everyday work outside the perfect process, in the middle of the transformation – for the days when the bank feed fails and the books still have to be done. First for myself, then for everyone doing the same work. I make <a href=\"{werkzeuge}\">these tools</a> available here free of charge, and every Friday I write a <a href=\"{impulse}\">short piece</a> on automation and AI in accounting.",
    ],
    stationenTitel: "Career",
    stationen: [
      ["2007–2016", "Retail: sales assistant, later deputy store manager at a beverage store."],
      ["2016–2020", "Assistant to the branch management of the same chain: staff budget and rent for up to 56 stores, HR administration, contracts for expansion."],
      ["2020–2023", "Head of administration of a socio-cultural centre: bookkeeping and payroll, HR, property and third-party funding, commercial management of a €10 million refurbishment, introduction of employee self-service software, crisis management during the pandemic."],
      ["since 2024", "Retraining as a certified tax clerk; since 2025 in practice at a tax firm with my own set of clients. There I moved accounts payable and receivable from manual entry to automated imports and built a controlling system with a weekly KPI report (Python, APIs)."],
      ["Qualifications", "Advanced technical college entrance qualification (2007), IHK trainer aptitude examination (2017), preparatory course DATEV Kanzlei-Rechnungswesen, passed with distinction (2023)."],
    ],
    kenntnisseTitel: "What I work with",
    kenntnisse: "DATEV Kanzlei-Rechnungswesen, LODAS and Lohn und Gehalt, DATEV Unternehmen Online; ADDISON; upstream systems such as Finmatics, GetMyInvoices and Lexware Office; SAP ERP. Python for automation and interfaces, plus language models such as Copilot and Claude – under one fixed rule: the models prepare, I decide. I work in German and English.",
    ehrenamtTitel: "Voluntary work",
    ehrenamt: "Lay judge at the Administrative Court of Sigmaringen. I helped set up two cultural associations as founding treasurer, and I support associations with statutes, charitable status, bookkeeping and funding applications.",
    vogelTitel: "Why a robin",
    vogel: "In the year I was born, a pair of robins nested at my parents' house and the chicks hatched – that is how I got my name. In Welsh a robin is a robin goch; my father is from Wales. That is why a robin sits on the home page, and why my assistant there is called Goch.",
    kontaktTitel: "Contact",
    linkedin: "Profile on LinkedIn", termin: "Book an appointment", nachricht: "Write a message",
    andere: "Diese Seite auf Deutsch",
  },
};

const CSS = `.portrait-row { display: grid; grid-template-columns: minmax(170px, 230px) 1fr; gap: 24px 32px; align-items: start; margin: 0 0 12px; }
.portrait { width: 100%; height: auto; display: block; border-radius: 3px; border: 1px solid var(--line); box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.portrait-row p:last-child { margin-bottom: 0; }
@media (max-width: 600px) { .portrait-row { grid-template-columns: 1fr; } .portrait { max-width: 200px; } }
.stationen { display: grid; grid-template-columns: max-content 1fr; gap: 10px 20px; margin: 0 0 18px; }
.stationen dt { color: var(--ink-muted); font-size: 14px; padding-top: 3px; }
.stationen dd { margin: 0; max-width: 60ch; }
@media (max-width: 480px) { .stationen { grid-template-columns: 1fr; gap: 2px 0; } .stationen dd { margin-bottom: 12px; } }
.wege { display: flex; flex-wrap: wrap; gap: 8px 22px; margin: 0 0 18px; padding: 0; list-style: none; }`;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function ueberMichSeite(lang) {
  const t = TEXT[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const andere = lang === "en" ? "de" : "en", up = "../", home = up + (lang === "en" ? "?lang=en" : "");
  const canonical = ueberMichUrl(lang);
  const main = `<article class="ueber-mich">
<h1>${t.titel}</h1>
<p class="meta">${t.meta} · <a href="${LINKEDIN}" rel="me noopener" target="_blank">LinkedIn</a></p>
<div class="portrait-row">
<img class="portrait" src="${up}${PORTRAIT.datei}" width="${PORTRAIT.breite}" height="${PORTRAIT.hoehe}" alt="${esc(t.alt)}" decoding="async">
<div>
${t.einleitung.map(p => `<p>${p.replace("{werkzeuge}", up + (lang === "en" ? "werkzeuge/en/" : "werkzeuge/")).replace("{impulse}", up + (lang === "en" ? "blog/en/" : "blog/"))}</p>`).join("\n")}
</div>
</div>
<h2 id="stationen">${t.stationenTitel}</h2>
<dl class="stationen">
${t.stationen.map(([wann, was]) => `<dt>${wann}</dt><dd>${was}</dd>`).join("\n")}
</dl>
<h2 id="kenntnisse">${t.kenntnisseTitel}</h2>
<p>${t.kenntnisse}</p>
<h2 id="ehrenamt">${t.ehrenamtTitel}</h2>
<p>${t.ehrenamt}</p>
<h2 id="rotkehlchen">${t.vogelTitel}</h2>
<p>${t.vogel}</p>
<h2 id="kontakt">${t.kontaktTitel}</h2>
<ul class="wege">
<li><a href="${LINKEDIN}" rel="me noopener" target="_blank">${t.linkedin}</a></li>
<li><a href="${home}#kontakt">${t.termin}</a></li>
<li><a href="${home}#nachricht">${t.nachricht}</a></li>
<li><a href="mailto:robin@robin.vision">robin@robin.vision</a></li>
</ul>
<p class="meta"><a href="${up}${UEBER_MICH.find(s => s.lang === andere).adresse}" lang="${andere}" hreflang="${andere}">${t.andere}</a></p>
${newsletterKasten(lang, up, "impuls")}
</article>`;
  // Strukturierte Daten: Profilseite der Person, Foto und LinkedIn als weiteres Profil
  const jsonld = JSON.stringify({ "@context": "https://schema.org", "@type": "ProfilePage", url: canonical, inLanguage: lang,
    mainEntity: { "@type": "Person", "@id": SITE + "#person", name: "Robin James Lewis", url: SITE, image: SITE + PORTRAIT.datei, jobTitle: t.beruf,
      address: { "@type": "PostalAddress", addressLocality: "Balingen", addressCountry: "DE" }, email: "mailto:robin@robin.vision",
      knowsLanguage: ["de", "en"], sameAs: [LINKEDIN] } }).replace(/</g, "\\u003c");
  return rahmen({ lang, up, titel: t.titel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: ueberMichUrl(andere) }],
    head: `<meta property="og:image" content="${SITE}${PORTRAIT.datei}">\n<script type="application/ld+json">${jsonld}</script>\n`, css: CSS, main });
}
