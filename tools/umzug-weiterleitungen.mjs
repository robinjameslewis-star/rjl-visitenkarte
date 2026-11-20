// Umzug der Werkzeuge auf smartformular.ai (Robin 20.11.2026, Weg B, Z1, W2; Plan ~/Developer/smartformular-ai/UMZUG_WERKZEUGE.md).
// Schreibt an jede alte Werkzeug-Adresse eine kleine Weiterleitungsseite (W1, Rückfall zu den 301-Regeln bei Cloudflare):
// canonical auf die neue Adresse, noindex, ohne Skript meta refresh, mit Skript einmal die Übergabe-Seite, wenn Daten im Browser liegen.
//   node tools/umzug-weiterleitungen.mjs          schreibt die Seiten (vorher alle Werkzeug-Seiten unter werkzeuge/…)
//   node tools/umzug-weiterleitungen.mjs --liste  zeigt nur die Zuordnung alt → neu
import { readdirSync, statSync, writeFileSync, existsSync } from "fs";
import { join, relative } from "path";
const SF = "https://smartformular.ai/";
// Gleiche Zuordnung wie smartformular.ai (werkzeug-seiten.mjs: ORDNER, DATEIEN)
export const ORDNER = [
  ["werkzeuge/e-rechnung-pruefen/", "e-rechnung-start/", "de"],
  ["werkzeuge/e-invoice-viewer/", "en/e-invoice-start/", "en"],
  ["werkzeuge/buchungsstapel-generator/", "buchhaltung-start/", "de"],
  ["werkzeuge/booking-batch-generator/", "en/bookkeeping-start/", "en"],
];
export const DATEIEN = { "E-Rechnung-lite.html": "E-Rechnung-Start.html", "E-Invoice-Viewer.html": "E-Invoice-Start.html",
  "Buchungsstapel-Generator.html": "Buchhaltung-Start.html", "Booking-Batch-Generator.html": "Bookkeeping-Start.html" };
import { umzugSeite as seite } from "../worker/src/werkzeug.js";
export { seite };
const alle = (d) => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? alle(p) : [p]; });
export function zuordnung(wurzel = ".") {
  const liste = [];
  for (const [alt, neu, lang] of ORDNER) {
    const ordner = join(wurzel, alt);
    if (!existsSync(ordner)) continue;
    for (const datei of alle(ordner)) {
      const rel = relative(ordner, datei).split("\\").join("/");
      if (rel.endsWith("index.html")) liste.push({ datei, lang, neu: SF + neu + rel.slice(0, -"index.html".length) });
      else if (DATEIEN[rel]) liste.push({ datei, lang, neu: SF + neu + DATEIEN[rel] });
    }
  }
  return liste;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const liste = zuordnung();
  if (process.argv.includes("--liste")) for (const z of liste) console.log(z.datei, "→", z.neu);
  else { for (const z of liste) writeFileSync(z.datei, seite(z.neu, z.lang)); console.log(`${liste.length} Weiterleitungsseiten geschrieben.`); }
}
