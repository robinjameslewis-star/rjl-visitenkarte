// Regel-Lexikon von SmartFormular E-Rechnung lite (Robin, 23.10.2026, Kampagne Ziel B): je Prüfregel mit eigener Erklärung eine Seite
// auf Deutsch (werkzeuge/e-rechnung-pruefen/regeln/<id>/) und Englisch (werkzeuge/e-invoice-viewer/rules/<id>/), je eine Übersicht und
// sitemap-regeln.xml (in robots.txt genannt). Inhalt je Seite: was die Meldung bedeutet und was der Rechnungssteller ändern muss
// (regeltexte.js), betroffene Felder, Herkunft und Stufe (Regeldateien und Szenarien der KoSIT), Originaltext mit Quelle und Lizenz,
// Kontext und Test für die IT, verwandte Regeln, Weg zum Werkzeug. Regeln, die nur über Vorlagen erklärt werden, bekommen keine Seite.
//   node tools/erechnung/lexikon.mjs            schreibt die Seiten
//   node tools/erechnung/lexikon.mjs --pruefen  vergleicht nur und meldet, was abweicht (Exit 1)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rahmen, SF_CSS } from "../../worker/src/werkzeug.js";
import { newsletterKasten } from "../../worker/src/kasten.js";
import { erklaeren, eigeneErklaerung, regelSlug, LEXIKON } from "./src/regeltexte.js";
import { feld } from "./src/felder.js";
import { T as UI } from "./src/texte.js";

const HIER = dirname(fileURLToPath(import.meta.url)), WURZEL = join(HIER, "..", "..");
const META = JSON.parse(readFileSync(join(HIER, "src", "generiert", "meta.json"), "utf8"));
const SAETZE = ["en16931-ubl", "en16931-cii", "xrechnung-ubl", "xrechnung-cii"];
export const LEXIKON_PFAD = { de: "werkzeuge/e-rechnung-pruefen/regeln/", en: "werkzeuge/e-invoice-viewer/rules/" };
const WERKZEUG = { de: "werkzeuge/e-rechnung-pruefen/", en: "werkzeuge/e-invoice-viewer/" };
const KASTEN = { de: "werkzeuge/", en: "werkzeuge/en/" };
const SITE = "https://robin.vision/";
const QUELLE_URL = { en16931: "https://github.com/ConnectingEurope/eInvoicing-EN16931", xrechnung: "https://github.com/itplr-kosit/xrechnung-schematron" };
const datum = s => s.split("-").reverse().join(".");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nat = s => s.replace(/\d+/g, d => d.padStart(5, "0"));

const T = {
  de: {
    lexikon: "Prüfregeln", werkzeug: "SmartFormular E-Rechnung lite", kasten: "Robins Werkzeugkasten",
    titelIndex: "Prüfregeln der E-Rechnung verständlich erklärt",
    seitentitelIndex: "Prüfregeln der E-Rechnung erklärt: BR-DE, BR-CO, PEPPOL | SmartFormular E-Rechnung lite",
    untertitelIndex: "Was Meldungen wie BR-DE-15, BR-CO-26 oder PEPPOL-EN16931-R010 bedeuten – und was der Rechnungssteller ändern muss.",
    beschrIndex: n => `${n} Prüfregeln der XRechnung und der EN 16931 in einfachen Worten: was die Meldung bedeutet und was der Rechnungssteller ändern muss, mit Originaltext und Feldern.`,
    introIndex: "Prüfprogramme melden Fehler in E-Rechnungen mit Nummern wie BR-DE-15. Hier steht zu jeder Regel, was nicht stimmt und was zu ändern ist, dazu der Originaltext der Regel. Ihre eigene Rechnung prüfen Sie kostenlos im Browser, ohne Upload – das Werkzeug zeigt alle Befunde mit dieser Erklärung.",
    knopf: "E-Rechnung prüfen", was: "Was die Meldung bedeutet", tun: "Was der Rechnungssteller ändern muss", felder: "Betroffene Felder",
    herkunft: "Herkunft", regelwerkL: "Regelwerk", syntaxL: "Syntax", stufeL: "Stufe", inXR: "in der XRechnung",
    original: "Originaltext der Regel", technik: "Technische Angaben für die IT", kontext: "Kontext", test: "Test", verwandt: "Verwandte Regeln", alle: "Alle Prüfregeln",
    regelwerk: { en16931: "EN 16931 (CEN, Prüfregeln 1.3.16)", xrechnung: "XRechnung 3.0.2 (KoSIT, Schematron 2.6.0)" },
    quelle: { en16931: "CEN/TC 434, Prüfregeln der EN 16931 1.3.16, European Union Public Licence 1.2", xrechnung: "KoSIT, XRechnung-Schematron 2.6.0, Apache License 2.0" },
    quelleL: "Quelle", platzhalter: "(…) steht für einen Wert aus der Rechnung.",
    meta: (rw, st) => `Prüfregel der ${rw} · Stufe: ${st}`,
    cta: id => `Ihre Rechnung meldet ${id}? Prüfen Sie sie kostenlos mit SmartFormular E-Rechnung lite: Das Werkzeug zeigt alle Befunde mit Erklärung, die Rechnung lesbar und einen GiroCode zum Bezahlen – im Browser, ohne Upload.`,
    hinweis: stand => `Technische Erklärung von robin.vision, keine Steuer- oder Rechtsberatung. Stand der Prüfregeln: ${stand} (Konfiguration des KoSIT-Prüfprogramms).`,
    seitentitel: (id, k) => `${id}: ${k} | E-Rechnung prüfen`,
    gruppen: { xr: "XRechnung (BR-DE)", br: "Grundregeln der EN 16931 (BR)", co: "Zusammenhänge und Summen (BR-CO)", ust: "Umsatzsteuer nach Steuerkategorie (BR-S, BR-E, BR-AE …)",
      cl: "Codelisten (BR-CL)", peppol: "Peppol-Regeln in der XRechnung (PEPPOL-EN16931)", aufbau: "Aufbau und Datenformate (UBL, CII)" },
    anzahl: n => `${n} Regeln`,
  },
  en: {
    lexikon: "Validation rules", werkzeug: "SmartFormular E-Rechnung lite", kasten: "Robin's Tech Stack",
    titelIndex: "E-invoice validation rules explained",
    seitentitelIndex: "E-invoice validation rules explained: BR-DE, BR-CO, PEPPOL | SmartFormular E-Rechnung lite",
    untertitelIndex: "What messages such as BR-DE-15, BR-CO-26 or PEPPOL-EN16931-R010 mean – and what the issuer needs to change.",
    beschrIndex: n => `${n} XRechnung and EN 16931 validation rules in plain words: what the message means and what the issuer needs to change, with the original rule text and fields.`,
    introIndex: "Validators report errors in e-invoices with numbers such as BR-DE-15. Here you find, for every rule, what is wrong and what to change, plus the original rule text. Check your own invoice free of charge in your browser, without uploading it – the tool shows every finding with this explanation.",
    knopf: "Check an e-invoice", was: "What the message means", tun: "What the issuer needs to change", felder: "Fields concerned",
    herkunft: "Origin", regelwerkL: "Rule set", syntaxL: "Syntax", stufeL: "Level", inXR: "in XRechnung",
    original: "Original rule text", technik: "Technical details for IT", kontext: "Context", test: "Test", verwandt: "Related rules", alle: "All validation rules",
    regelwerk: { en16931: "EN 16931 (CEN, rule set 1.3.16)", xrechnung: "XRechnung 3.0.2 (KoSIT, Schematron 2.6.0)" },
    quelle: { en16931: "CEN/TC 434, EN 16931 validation rules 1.3.16, European Union Public Licence 1.2", xrechnung: "KoSIT, XRechnung Schematron 2.6.0, Apache License 2.0" },
    quelleL: "Source", platzhalter: "(…) stands for a value from the invoice.",
    meta: (rw, st) => `Validation rule of ${rw} · Level: ${st}`,
    cta: id => `Your invoice reports ${id}? Check it free of charge with SmartFormular E-Rechnung lite: the tool shows every finding with an explanation, the invoice in readable form and a GiroCode to pay – in your browser, no upload.`,
    hinweis: stand => `Technical explanation by robin.vision, not tax or legal advice. Rules as of ${stand} (KoSIT validator configuration).`,
    seitentitel: (id, k) => `${id}: ${k} | E-invoice validation rule`,
    gruppen: { xr: "XRechnung (BR-DE)", br: "Core rules of EN 16931 (BR)", co: "Consistency and totals (BR-CO)", ust: "VAT by category (BR-S, BR-E, BR-AE …)",
      cl: "Code lists (BR-CL)", peppol: "Peppol rules in XRechnung (PEPPOL-EN16931)", aufbau: "Structure and data formats (UBL, CII)" },
    anzahl: n => `${n} rules`,
  },
};
const GRUPPEN = [["xr", /^BR-(DE|DEX|DE-TMP|TMP)-/], ["co", /^BR-CO-/], ["ust", /^BR-(S|Z|E|AE|IC|G|O|AF|AG|B)-/], ["cl", /^BR-CL-/], ["peppol", /^PEPPOL-/], ["aufbau", /^(UBL|CII)-/], ["br", /^BR-/]];
const gruppe = id => (GRUPPEN.find(([, re]) => re.test(id)) || ["br"])[0];
const STUFE = { de: { fehler: "Fehler", warnung: "Warnung", hinweis: "Hinweis" }, en: { fehler: "Error", warning: "Warning", warnung: "Warning", hinweis: "Notice" } };
const stufeAus = f => f === "warning" ? "warnung" : f === "information" || f === "info" ? "hinweis" : f === "error" ? "fehler" : "fehler";

// Alle Regeln aus den vier Regelsätzen: Texte, Kontexte, Stufen; dazu Abweichungen der Stufe in den XRechnung-Szenarien
function regeln() {
  const alle = new Map();
  for (const satz of SAETZE) {
    const d = JSON.parse(readFileSync(join(WURZEL, "assets", "erechnung", "regeln", `${satz}.json`), "utf8"));
    for (const m of d.muster) for (const r of m.regeln) for (const t of r.tests) {
      const e = alle.get(t.id) || { id: t.id, flag: t.flag, text: t.text, werk: satz.split("-")[0], syntax: new Set(), technik: [] };
      e.syntax.add(satz.split("-")[1]);
      if (!e.technik.some(x => x.syntax === satz.split("-")[1])) e.technik.push({ syntax: satz.split("-")[1], kontext: r.context, test: t.cond });
      alle.set(t.id, e);
    }
  }
  const xr = META.szenarien.filter(s => /^EN16931 XRechnung \((UBL Invoice|CII)\)$/.test(s.name));
  for (const e of alle.values()) { const s = xr.map(x => x.stufen && x.stufen[e.id]).find(Boolean); if (s) e.xrStufe = stufeAus(s); }
  return [...alle.values()].filter(e => eigeneErklaerung(e.id)).sort((a, b) => nat(a.id).localeCompare(nat(b.id)));
}
const originalText = e => e.text.map(x => x.t != null ? x.t : "(…)").join("").replace(/^\s*\[[^\]]+\]\s*-?\s*/, "").replace(/\s+/g, " ").trim();
const ersterSatz = (s, max) => { const m = /^(.+?[.!?])(\s|$)/.exec(s); let k = (m ? m[1] : s).replace(/[.]$/, ""); if (k.length > max) k = k.slice(0, k.lastIndexOf(" ", max - 1)) + " …"; return k; };
const kurz = (s, max) => s.length <= max ? s : s.slice(0, s.lastIndexOf(" ", max - 2)) + " …";
const felderVon = (...texte) => [...new Set(texte.join(" ").match(/\bB[TG]-\d+\b/g) || [])].sort((a, b) => nat(a).localeCompare(nat(b)));
const LX_CSS = `.brotkrume { margin: 0 0 18px; font-size: 13px; letter-spacing: .02em; color: #8B83A8; }
.brotkrume a { color: #C4B5FD; text-decoration: underline; text-decoration-color: #7C3AED; text-underline-offset: .2em; }
.lx-orig { margin: 0 0 10px; padding: 12px 16px; border-left: 3px solid #7C3AED; background: #1C1726; border-radius: 3px; color: #EDE9FE; font-size: 15px; }
.lx-felder li, .lx-gruppe li { text-align: left; } .lx-felder code, .lx-gruppe code { font: 13px/1.4 ui-monospace, Menlo, monospace; color: #fff; }
.lx-herkunft { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 18px; font-size: 15px; } .lx-herkunft dt { color: #8B83A8; } .lx-herkunft dd { margin: 0; }
details.lx-technik { margin: 8px 0 24px; font-size: 14px; } details.lx-technik summary { cursor: pointer; color: #C4B5FD; }
details.lx-technik pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #16121F; border: 1px solid #2A2340; padding: 10px; font: 12px/1.5 ui-monospace, Menlo, monospace; color: #C4B5FD; }
.lx-gruppe { list-style: none; padding: 0 !important; } .lx-gruppe li { padding: 8px 0; border-top: 1px solid #2A2340; margin: 0; } .lx-gruppe li span { display: block; color: #C4B5FD; font-size: 15px; }
.lx-inhalt { columns: 2; font-size: 15px; } @media (max-width: 600px) { .lx-inhalt { columns: 1; } }`;

function regelSeite(e, lang, liste) {
  const t = T[lang], up = "../../../../", slug = regelSlug(e.id);
  const [was, tun] = erklaeren(e.id, originalText(e), lang);
  const orig = originalText(e);
  const st = STUFE[lang][stufeAus(e.flag)] + (e.xrStufe && e.xrStufe !== stufeAus(e.flag) ? ` (${t.inXR}: ${STUFE[lang][e.xrStufe]})` : "");
  const rw = t.regelwerk[e.werk];
  const felder = felderVon(orig, was, tun);
  const url = `${LEXIKON[lang]}${slug}/`, andere = lang === "en" ? "de" : "en";
  const gr = liste.filter(x => gruppe(x.id) === gruppe(e.id)), i = gr.findIndex(x => x.id === e.id);
  const verwandt = [...gr.slice(Math.max(0, i - 3), i), ...gr.slice(i + 1, i + 4)];
  const k = ersterSatz(was, 58);
  const main = `<p class="sf-marke">Smart<span>Formular</span></p>
<article>
<p class="brotkrume"><a href="${up}${KASTEN[lang]}">${t.kasten}</a> › <a href="../../">${t.werkzeug}</a> › <a href="../">${t.lexikon}</a> › ${esc(e.id)}</p>
<h1>${esc(e.id)}</h1>
<p class="untertitel">${esc(ersterSatz(was, 140))}</p>
<p class="meta">${esc(t.meta(rw, st))}</p>
<h2>${t.was}</h2>
<p>${esc(was)}</p>
<h2>${t.tun}</h2>
<p>${esc(tun)}</p>${e.id.startsWith("PEPPOL-") ? `\n<p>${esc(UI[lang].peppolHinweis)}</p>` : ""}
${felder.length ? `<h2>${t.felder}</h2>\n<ul class="lx-felder">${felder.map(f => `<li><code>${f}</code> ${esc(feld(f, lang) === f ? "" : feld(f, lang))}</li>`).join("")}</ul>\n` : ""}<div class="download">
<p class="hinweis">${esc(t.cta(e.id))}</p>
<a class="knopf" href="../../#werkzeug">${t.knopf}</a>
</div>
<h2>${t.herkunft}</h2>
<dl class="lx-herkunft"><dt>${t.regelwerkL}</dt><dd>${esc(rw)}</dd><dt>${t.syntaxL}</dt><dd>${[...e.syntax].sort().map(s => s.toUpperCase()).join(", ")}</dd><dt>${t.stufeL}</dt><dd>${esc(st)}</dd></dl>
<h2>${t.original}</h2>
<p class="lx-orig" lang="${/[äöüß]|\b(muss|darf|sollte|eine|einer|wenn)\b/i.test(orig) ? "de" : "en"}">${esc(orig)}</p>
<p class="meta">${t.quelleL}: <a href="${QUELLE_URL[e.werk]}" rel="noopener">${esc(t.quelle[e.werk])}</a>${/\(…\)/.test(orig) ? ` · ${esc(t.platzhalter)}` : ""}</p>
<details class="lx-technik"><summary>${t.technik}</summary>
${e.technik.map(x => `<p><strong>${x.syntax.toUpperCase()}</strong></p><pre>${t.kontext}: ${esc(x.kontext)}\n${t.test}: ${esc(x.test)}</pre>`).join("\n")}
</details>
${verwandt.length ? `<h2>${t.verwandt}</h2>\n<ul class="lx-gruppe">${verwandt.map(v => `<li><a href="../${regelSlug(v.id)}/">${esc(v.id)}</a><span>${esc(ersterSatz(erklaeren(v.id, originalText(v), lang)[0], 110))}</span></li>`).join("")}</ul>\n` : ""}<p><a href="../">${t.alle}</a></p>
<p class="meta hinweis">${esc(t.hinweis(datum(META.stand)))}</p>
</article>
${newsletterKasten(lang, up, "impuls")}`;
  const ld = [{ "@context": "https://schema.org", "@type": "DefinedTerm", name: e.id, termCode: e.id, description: `${was} ${tun}`, url, inLanguage: lang,
    inDefinedTermSet: { "@type": "DefinedTermSet", name: t.titelIndex, url: LEXIKON[lang] } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [[t.kasten, SITE + KASTEN[lang]], [t.werkzeug, SITE + WERKZEUG[lang]], [t.lexikon, LEXIKON[lang]], [e.id, url]]
      .map(([name, item], n) => ({ "@type": "ListItem", position: n + 1, name, item })) }];
  return rahmen({ lang, up, titel: `${e.id} – ${t.lexikon}`, seitentitel: t.seitentitel(e.id, k), beschr: kurz(`${was} ${tun}`, 160), canonical: url,
    alternates: [{ lang, href: url }, { lang: andere, href: `${LEXIKON[andere]}${slug}/` }],
    head: ld.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>\n`).join(""), main, aktiv: "tools", css: SF_CSS + "\n" + LX_CSS });
}

function indexSeite(lang, liste) {
  const t = T[lang], up = "../../../", andere = lang === "en" ? "de" : "en";
  const gruppen = GRUPPEN.map(([g]) => [g, liste.filter(x => gruppe(x.id) === g)]).filter(([, l]) => l.length);
  const main = `<p class="sf-marke">Smart<span>Formular</span></p>
<article>
<p class="brotkrume"><a href="${up}${KASTEN[lang]}">${t.kasten}</a> › <a href="../">${t.werkzeug}</a> › ${t.lexikon}</p>
<h1>${t.titelIndex}</h1>
<p class="untertitel">${esc(t.untertitelIndex)}</p>
<p>${esc(t.introIndex)}</p>
<div class="download"><a class="knopf" href="../#werkzeug">${t.knopf}</a></div>
<ul class="lx-inhalt">${gruppen.map(([g, l]) => `<li><a href="#${g}">${esc(t.gruppen[g])}</a> · ${t.anzahl(l.length)}</li>`).join("")}</ul>
${gruppen.map(([g, l]) => `<h2 id="${g}">${esc(t.gruppen[g])}</h2>\n<ul class="lx-gruppe">${l.map(x => `<li><a href="${regelSlug(x.id)}/">${esc(x.id)}</a><span>${esc(ersterSatz(erklaeren(x.id, originalText(x), lang)[0], 120))}</span></li>`).join("")}</ul>`).join("\n")}
<p class="meta hinweis">${esc(t.hinweis(datum(META.stand)))}</p>
</article>
${newsletterKasten(lang, up, "impuls")}`;
  const ld = { "@context": "https://schema.org", "@type": "DefinedTermSet", name: t.titelIndex, url: LEXIKON[lang], inLanguage: lang,
    hasDefinedTerm: liste.map(x => ({ "@type": "DefinedTerm", name: x.id, termCode: x.id, url: `${LEXIKON[lang]}${regelSlug(x.id)}/` })) };
  return rahmen({ lang, up, titel: t.titelIndex, seitentitel: t.seitentitelIndex, beschr: t.beschrIndex(liste.length), canonical: LEXIKON[lang],
    alternates: [{ lang, href: LEXIKON[lang] }, { lang: andere, href: LEXIKON[andere] }],
    head: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n`, main, aktiv: "tools", css: SF_CSS + "\n" + LX_CSS });
}

// Alle Dateien des Lexikons: Pfad → Inhalt
export function lexikonDateien() {
  const liste = regeln(), dateien = new Map();
  for (const lang of ["de", "en"]) {
    dateien.set(`${LEXIKON_PFAD[lang]}index.html`, indexSeite(lang, liste));
    for (const e of liste) dateien.set(`${LEXIKON_PFAD[lang]}${regelSlug(e.id)}/index.html`, regelSeite(e, lang, liste));
  }
  const urls = [...dateien.keys()].map(p => SITE + p.replace(/index\.html$/, ""));
  dateien.set("sitemap-regeln.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${META.stand}</lastmod></url>`).join("\n")}\n</urlset>\n`);
  return { dateien, liste };
}

if (process.argv[1] && process.argv[1].endsWith("lexikon.mjs")) {
  const pruefen = process.argv.includes("--pruefen");
  const { dateien, liste } = lexikonDateien();
  let abweichend = 0;
  if (!pruefen) for (const lang of ["de", "en"]) {
    // Seiten von Regeln, die es nicht mehr gibt, entfernen
    const ordner = join(WURZEL, LEXIKON_PFAD[lang]);
    if (existsSync(ordner)) for (const n of readdirSync(ordner, { withFileTypes: true })) if (n.isDirectory() && !dateien.has(`${LEXIKON_PFAD[lang]}${n.name}/index.html`)) rmSync(join(ordner, n.name), { recursive: true });
  }
  for (const [pfad, inhalt] of dateien) {
    const ziel = join(WURZEL, pfad);
    if (pruefen) { if (!existsSync(ziel) || readFileSync(ziel, "utf8") !== inhalt) { abweichend++; if (abweichend <= 5) console.log("weicht ab:", pfad); } continue; }
    mkdirSync(dirname(ziel), { recursive: true });
    writeFileSync(ziel, inhalt);
  }
  console.log(pruefen ? `${abweichend} von ${dateien.size} Dateien weichen ab` : `${liste.length} Regeln, ${dateien.size} Dateien geschrieben`);
  process.exit(pruefen && abweichend ? 1 : 0);
}
