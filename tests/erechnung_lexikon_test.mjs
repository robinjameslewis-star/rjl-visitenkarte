// Regel-Lexikon von SmartFormular E-Rechnung lite (tools/erechnung/lexikon.mjs; Robin, 23.10.2026): die Seiten im Repository entsprechen
// dem Generator; je Regel mit eigener Erklärung eine deutsche und eine englische Seite, keine Seite für Regeln, die nur über Vorlagen
// erklärt werden; Titel, Beschreibung, canonical, hreflang, strukturierte Daten; alle relativen Verweise führen zu vorhandenen Seiten;
// Übersichten, sitemap-regeln.xml, robots.txt und llms.txt; Werkzeug und Werkzeugseite verweisen auf das Lexikon; Sprache und Grenzen
// (keine Beratungswörter, keine Du-Form, keine privaten Daten). Kein Netz.
//   node tests/erechnung_lexikon_test.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { lexikonDateien, LEXIKON_PFAD } from "../tools/erechnung/lexikon.mjs";
import { eigeneErklaerung, regelSlug, LEXIKON } from "../tools/erechnung/src/regeltexte.js";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(join(root, p), "utf8");
const { dateien, liste } = lexikonDateien();

console.log("Stand der Dateien");
const abweichend = [...dateien].filter(([p, inhalt]) => !existsSync(join(root, p)) || lesen(p) !== inhalt).map(([p]) => p);
check(!abweichend.length, `alle ${dateien.size} Dateien entsprechen dem Generator`, abweichend.slice(0, 3).join(", "));
for (const lang of ["de", "en"]) {
  const ordner = readdirSync(join(root, LEXIKON_PFAD[lang]), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  check(ordner.length === liste.length && ordner.every(n => dateien.has(`${LEXIKON_PFAD[lang]}${n}/index.html`)), `${lang}: ${liste.length} Regelseiten, keine übrigen Ordner`);
}

console.log("\nAuswahl der Regeln");
const alleIds = new Set(["en16931-ubl", "en16931-cii", "xrechnung-ubl", "xrechnung-cii"].flatMap(s => JSON.parse(lesen(`assets/erechnung/regeln/${s}.json`)).muster.flatMap(m => m.regeln.flatMap(r => r.tests.map(t => t.id)))));
const mitText = [...alleIds].filter(eigeneErklaerung);
check(liste.length === mitText.length && liste.every(e => eigeneErklaerung(e.id)), `genau die Regeln mit eigener Erklärung (${mitText.length} von ${alleIds.size})`);
check(["BR-DE-15", "BR-CO-26", "PEPPOL-EN16931-R010", "BR-E-10", "BR-DE-19", "UBL-SR-53"].every(id => liste.some(e => e.id === id)), "wichtige Regeln dabei (BR-DE-15, BR-CO-26, PEPPOL-EN16931-R010, BR-E-10, BR-DE-19, UBL-SR-53)");
check(["UBL-CR-001", "BR-DEC-12", "CII-SR-001"].every(id => !existsSync(join(root, LEXIKON_PFAD.de, regelSlug(id)))), "keine Seiten für Regeln, die nur über Vorlagen erklärt werden");

console.log("\nRegelseiten");
const BERATUNG = /rechtssicher|GoBD-konform|amtlich geprüft|garantiert/i, DU = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i, PRIVAT = /googlemail|\+49 ?151|0151 ?684|684 ?660|Höchststr/i;
const fehler = { titel: [], canonical: [], beschr: [], ld: [], verweis: [], sprache: [], text: [] };
for (const e of liste) for (const lang of ["de", "en"]) {
  const pfad = `${LEXIKON_PFAD[lang]}${regelSlug(e.id)}/index.html`, html = lesen(pfad), url = `${LEXIKON[lang]}${regelSlug(e.id)}/`, andere = lang === "en" ? "de" : "en";
  if (!new RegExp(`<title>${e.id.replace(/[-]/g, "\\-")}: `).test(html) || !html.includes(`<h1>${e.id}</h1>`)) fehler.titel.push(pfad);
  if (!html.includes(`<link rel="canonical" href="${url}">`) || !html.includes(`hreflang="${andere}" href="${LEXIKON[andere]}${regelSlug(e.id)}/"`) || !html.includes(`<html lang="${lang}">`)) fehler.canonical.push(pfad);
  const beschr = ((html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  if (beschr.length < 40 || beschr.length > 170) fehler.beschr.push(`${pfad} (${beschr.length})`);
  try { const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])); if (!(ld[0]["@type"] === "DefinedTerm" && ld[0].termCode === e.id && ld[1]["@type"] === "BreadcrumbList" && ld[1].itemListElement.length === 4)) fehler.ld.push(pfad); } catch { fehler.ld.push(pfad); }
  const ordner = posix.dirname(pfad) + "/";
  const relativ = [...html.matchAll(/href="((?:\.\.\/)+[^"#]*)(#[^"]*)?"/g)].map(m => m[1]).filter(h => !/\.(ico|png|js|xml)$|\?/.test(h));
  for (const h of relativ) { const ziel = posix.normalize(ordner + h); if (!existsSync(join(root, ziel.endsWith("/") ? ziel + "index.html" : ziel))) fehler.verweis.push(`${pfad} → ${h}`); }
  if (!html.includes('<a class="knopf" href="../../#werkzeug">')) fehler.verweis.push(`${pfad} ohne Weg zum Werkzeug`);
  const sichtbar = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  if (BERATUNG.test(sichtbar) || PRIVAT.test(html) || (lang === "de" && DU.test(sichtbar.replace(/lang="en"[\s\S]*?<\/p>/g, "")))) fehler.sprache.push(pfad);
  if (!html.includes(lang === "en" ? "What the message means" : "Was die Meldung bedeutet") || !html.includes(lang === "en" ? "What the issuer needs to change" : "Was der Rechnungssteller ändern muss") || !/class="lx-orig"/.test(html)) fehler.text.push(pfad);
}
check(!fehler.titel.length, "Titel beginnt mit der Regelnummer, Überschrift ist die Regelnummer", fehler.titel.slice(0, 2).join(", "));
check(!fehler.canonical.length, "Sprache, canonical und hreflang zur anderen Sprachfassung", fehler.canonical.slice(0, 2).join(", "));
check(!fehler.beschr.length, "Beschreibung 40–170 Zeichen", fehler.beschr.slice(0, 2).join(", "));
check(!fehler.ld.length, "strukturierte Daten: DefinedTerm mit Regelnummer und BreadcrumbList", fehler.ld.slice(0, 2).join(", "));
check(!fehler.verweis.length, "alle relativen Verweise führen zu vorhandenen Seiten, Knopf zum Werkzeug", fehler.verweis.slice(0, 3).join(", "));
check(!fehler.text.length, "Abschnitte: was die Meldung bedeutet, was zu ändern ist, Originaltext", fehler.text.slice(0, 2).join(", "));
check(!fehler.sprache.length, "keine Beratungswörter, keine Du-Form, keine privaten Daten", fehler.sprache.slice(0, 2).join(", "));
const br15 = lesen(`${LEXIKON_PFAD.de}br-de-15/index.html`);
check(/Käuferreferenz/.test(br15) && br15.includes("<code>BT-10</code>") && /KoSIT, XRechnung-Schematron 2\.6\.0, Apache License 2\.0/.test(br15) && /Stufe: Fehler/.test(br15), "BR-DE-15: Erklärung, Feld BT-10, Quelle mit Lizenz, Stufe");
const cl23 = lesen(`${LEXIKON_PFAD.de}br-cl-23/index.html`);
check(/Fehler \(in der XRechnung: Warnung\)/.test(cl23), "Stufe aus den XRechnung-Szenarien (BR-CL-23: in der XRechnung Warnung)");

console.log("\nÜbersichten und Auffindbarkeit");
for (const lang of ["de", "en"]) {
  const html = lesen(`${LEXIKON_PFAD[lang]}index.html`);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  check(liste.every(e => html.includes(`href="${regelSlug(e.id)}/"`)) && ld["@type"] === "DefinedTermSet" && ld.hasDefinedTerm.length === liste.length && html.includes(`<link rel="canonical" href="${LEXIKON[lang]}">`), `${lang}: Übersicht verlinkt alle ${liste.length} Regeln, DefinedTermSet, canonical`);
}
const sitemap = lesen("sitemap-regeln.xml");
check((sitemap.match(/<loc>/g) || []).length === liste.length * 2 + 2 && sitemap.includes(`<loc>${LEXIKON.de}br-de-15/</loc>`), `sitemap-regeln.xml mit ${liste.length * 2 + 2} Adressen`);
check(lesen("robots.txt").includes("Sitemap: https://robin.vision/sitemap-regeln.xml") && lesen("llms.txt").includes(`(${LEXIKON.de})`), "robots.txt nennt die Sitemap, llms.txt das Lexikon");
check(lesen("werkzeuge/e-rechnung-pruefen/index.html").includes('<a href="regeln/">') && lesen("werkzeuge/e-invoice-viewer/index.html").includes('<a href="rules/">'), "Werkzeugseiten verweisen auf das Lexikon");
const app = lesen("assets/erechnung/app.js");
check(app.includes("Mehr zu dieser Regel") && app.includes("More about this rule") && app.includes(LEXIKON.de) && app.includes(LEXIKON.en), "Werkzeug: Befunde mit eigener Erklärung verweisen auf ihre Regelseite");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nRegel-Lexikon in Ordnung.");
process.exit(fails ? 1 : 0);
