// Regel-Lexikon von SmartFormular E-Rechnung lite (tools/erechnung/lexikon.mjs; Robin, 23.10.2026): die Seiten im Repository entsprechen
// Seit 20.11.2026 (Umzug auf smartformular.ai, PR B) stehen an allen Adressen des Lexikons Weiterleitungsseiten (W1); die Inhalte
// baut smartformular.ai aus derselben Quelle. Geprüft wird: der Generator wählt weiter dieselben Regeln, jede seiner Seiten hat an der
// alten Adresse eine Weiterleitung auf die gleiche Seite unter smartformular.ai, keine übrigen Ordner, kein Eintrag in Sitemap und robots.txt.
//   node tests/erechnung_lexikon_test.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { lexikonDateien, LEXIKON_PFAD } from "../tools/erechnung/lexikon.mjs";
import { umzugSeite } from "../worker/src/werkzeug.js";
import { eigeneErklaerung, regelSlug, LEXIKON } from "../tools/erechnung/src/regeltexte.js";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(join(root, p), "utf8");
const { dateien, liste } = lexikonDateien();

console.log("Weiterleitungen an den alten Adressen")
const NEU = { de: "https://smartformular.ai/e-rechnung-start/regeln/", en: "https://smartformular.ai/en/e-invoice-start/rules/" };
const seiten = [...dateien.keys()].filter(p => p.endsWith("index.html"));
const falsch = seiten.filter(p => { const lang = p.startsWith(LEXIKON_PFAD.en) ? "en" : "de"; const rest = p.slice(LEXIKON_PFAD[lang].length, -"index.html".length);
  return !existsSync(join(root, p)) || lesen(p) !== umzugSeite(NEU[lang] + rest, lang); });
check(seiten.length === liste.length * 2 + 2 && !falsch.length, `alle ${seiten.length} Seiten des Lexikons leiten auf smartformular.ai weiter`, falsch.slice(0, 3).join(", "));
for (const lang of ["de", "en"]) {
  const ordner = readdirSync(join(root, LEXIKON_PFAD[lang]), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  check(ordner.length === liste.length && ordner.every(n => dateien.has(`${LEXIKON_PFAD[lang]}${n}/index.html`)), `${lang}: ${liste.length} Weiterleitungen, keine übrigen Ordner`);
}
check(!existsSync(join(root, "sitemap-regeln.xml")) && !lesen("robots.txt").includes("sitemap-regeln") && lesen("llms.txt").includes("(https://smartformular.ai/e-rechnung-start/regeln/)"), "keine sitemap-regeln.xml mehr, robots.txt ohne sie, llms.txt nennt das Lexikon auf smartformular.ai");

console.log("\nAuswahl der Regeln");
const alleIds = new Set(["en16931-ubl", "en16931-cii", "xrechnung-ubl", "xrechnung-cii"].flatMap(s => JSON.parse(lesen(`assets/erechnung/regeln/${s}.json`)).muster.flatMap(m => m.regeln.flatMap(r => r.tests.map(t => t.id)))));
const mitText = [...alleIds].filter(eigeneErklaerung);
check(liste.length === mitText.length && liste.every(e => eigeneErklaerung(e.id)), `genau die Regeln mit eigener Erklärung (${mitText.length} von ${alleIds.size})`);
check(["BR-DE-15", "BR-CO-26", "PEPPOL-EN16931-R010", "BR-E-10", "BR-DE-19", "UBL-SR-53"].every(id => liste.some(e => e.id === id)), "wichtige Regeln dabei (BR-DE-15, BR-CO-26, PEPPOL-EN16931-R010, BR-E-10, BR-DE-19, UBL-SR-53)");
check(["UBL-CR-001", "BR-DEC-12", "CII-SR-001"].every(id => !existsSync(join(root, LEXIKON_PFAD.de, regelSlug(id)))), "keine Seiten für Regeln, die nur über Vorlagen erklärt werden");

const app = lesen("assets/erechnung/app.js");
check(app.includes("Mehr zu dieser Regel") && app.includes("More about this rule") && app.includes(LEXIKON.de) && app.includes(LEXIKON.en), "Werkzeug: Befunde mit eigener Erklärung verweisen auf ihre Regelseite");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nRegel-Lexikon in Ordnung.");
process.exit(fails ? 1 : 0);
