// Seite „Über mich“ in beiden Sprachen neu bauen (worker/src/ueber_mich.js): ueber-mich/index.html und about/index.html.
//   node tools/ueber-mich-bauen.mjs
// Nötig nach jeder Änderung am Text in ueber_mich.js oder am Rahmen (worker/src/werkzeug.js, rahmen). Danach auch
// node tools/werkzeug-uebernehmen.mjs und node tools/blog-seiten-bauen.mjs, damit Werkzeug- und Impulsseiten denselben Kopf
// tragen und sitemap.xml die Seite kennt; dann node tests/ueber_mich_test.mjs, committen, PR.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { UEBER_MICH, ueberMichSeite, PORTRAIT } from "../worker/src/ueber_mich.js";

if (!existsSync(PORTRAIT.datei)) { console.error(`Foto fehlt: ${PORTRAIT.datei}`); process.exit(1); }
for (const s of UEBER_MICH) {
  const html = ueberMichSeite(s.lang);
  const alt = existsSync(s.pfad) ? readFileSync(s.pfad, "utf8") : null;
  mkdirSync(dirname(s.pfad), { recursive: true });
  writeFileSync(s.pfad, html);
  console.log(`${alt === null ? "neu      " : alt === html ? "unverändert" : "geändert "} ${s.pfad}`);
}
