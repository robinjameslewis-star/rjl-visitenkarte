// Seite „Workshops“ in beiden Sprachen neu bauen (worker/src/workshops.js): workshops/index.html und workshops/en/index.html.
//   node tools/workshops-bauen.mjs
// Nötig nach jeder Änderung am Text in workshops.js oder am Rahmen (worker/src/werkzeug.js, rahmen; worker/src/kopf.js). Danach
// auch node tools/werkzeug-uebernehmen.mjs, node tools/ueber-mich-bauen.mjs und node tools/blog-seiten-bauen.mjs, damit alle
// Seiten denselben Kopf tragen und sitemap.xml die Seite kennt; dann node tests/workshops_seite_test.mjs, committen, PR.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { WORKSHOPS, workshopsSeite } from "../worker/src/workshops.js";

for (const s of WORKSHOPS) {
  const html = workshopsSeite(s.lang);
  const alt = existsSync(s.pfad) ? readFileSync(s.pfad, "utf8") : null;
  mkdirSync(dirname(s.pfad), { recursive: true });
  writeFileSync(s.pfad, html);
  console.log(`${alt === null ? "neu      " : alt === html ? "unverändert" : "geändert "} ${s.pfad}`);
}
