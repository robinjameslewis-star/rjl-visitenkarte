// Seite „Individuelle Lösung“ in beiden Sprachen neu bauen (worker/src/individuelle_loesung.js): individuelle-loesung/index.html
// und individuelle-loesung/en/index.html.
//   node tools/individuelle-loesung-bauen.mjs
// Nötig nach jeder Änderung am Text in individuelle_loesung.js oder am Rahmen (worker/src/werkzeug.js, rahmen; worker/src/kopf.js).
// Danach auch node tools/werkzeug-uebernehmen.mjs, node tools/workshops-bauen.mjs, node tools/ueber-mich-bauen.mjs und
// node tools/blog-seiten-bauen.mjs (gleicher Kopf überall, sitemap.xml); dann die Tests, committen, PR.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { LOESUNG, loesungSeite } from "../worker/src/individuelle_loesung.js";

for (const s of LOESUNG) {
  const html = loesungSeite(s.lang);
  const alt = existsSync(s.pfad) ? readFileSync(s.pfad, "utf8") : null;
  mkdirSync(dirname(s.pfad), { recursive: true });
  writeFileSync(s.pfad, html);
  console.log(`${alt === null ? "neu      " : alt === html ? "unverändert" : "geändert "} ${s.pfad}`);
}
