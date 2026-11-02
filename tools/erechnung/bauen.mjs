// SmartFormular E-Rechnung lite bauen:
//   cd tools/erechnung && npm install && node regeln-bauen.mjs && node bauen.mjs [--entwurf]
// Schreibt nach assets/erechnung/: app.js und app.css (Oberfläche), pruefung.js (Prüfkern: fontoxpath mit exakter Dezimalrechnung und
// der Interpreter; lädt erst beim ersten Prüfen), regeln/*.json (regeln-bauen.mjs), beispiele/ und LIZENZEN.txt. Dazu je Sprache die
// einzelne Datei zum Herunterladen (alles eingebettet, läuft offline und als lokale Datei; eine Content-Security-Policy erlaubt nur
// die Lizenzprüfung bei goch.robin.vision, die erst ab 2027 anläuft). Die Fassung ist der letzte Git-Stand von tools/erechnung; mit ungesicherten Änderungen nur als --entwurf.
// Danach: node tools/werkzeug-uebernehmen.mjs <beide Dateien> (Seiten, Übersichten, Sitemap neu) und die Tests.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { patchen } from "./fxpatch.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
// Für Tests (tests/lizenz_browser_test.mjs): anderes Ziel und eigener Prüfschlüssel über ERECHNUNG_ZIEL und LIZENZ_SCHLUESSEL_DATEI
const ZIEL = process.env.ERECHNUNG_ZIEL || join(WURZEL, "assets", "erechnung");
const entwurf = process.argv.includes("--entwurf");
const git = (...a) => execFileSync("git", ["-C", WURZEL, ...a], { encoding: "utf8" }).trim();

const geaendert = git("status", "--porcelain", "--", "tools/erechnung").split("\n").filter(Boolean);
if (geaendert.length && !entwurf) { console.error("Ungesicherte Änderungen in tools/erechnung – erst committen oder mit --entwurf bauen:\n" + geaendert.join("\n")); process.exit(1); }
const FASSUNG = entwurf && geaendert.length ? "entwurf" : git("log", "-1", "--format=%h", "--abbrev=7", "--", "tools/erechnung");
// Öffentlicher Schlüssel der Lizenzprüfung (vom Worker, GET goch.robin.vision/lizenz/schluessel); fehlt er, sperrt das Werkzeug ab 2027.
const SCHLUESSEL_DATEI = process.env.LIZENZ_SCHLUESSEL_DATEI || join(WURZEL, "tools", "lizenz", "oeffentlich.json");
const LIZENZ_SCHLUESSEL = existsSync(SCHLUESSEL_DATEI) ? JSON.stringify(JSON.parse(readFileSync(SCHLUESSEL_DATEI, "utf8"))) : "null";
if (LIZENZ_SCHLUESSEL === "null") console.warn("Achtung: tools/lizenz/oeffentlich.json fehlt – ab 1.1.2027 sperrt das Werkzeug.");
const DATUM = git("log", "-1", "--format=%cs", "--", "tools/erechnung");
console.log(`Fassung ${FASSUNG} vom ${DATUM}${entwurf ? " (Entwurf)" : ""}`);

// fontoxpath mit Dezimal-Patch als virtuelles Modul
const fxPlugin = {
  name: "fontoxpath-rv",
  setup(b) {
    b.onResolve({ filter: /^fontoxpath-rv$/ }, () => ({ path: "fontoxpath-rv", namespace: "fxrv" }));
    b.onLoad({ filter: /.*/, namespace: "fxrv" }, () => {
      const pfad = join(HIER, "node_modules", "fontoxpath", "dist", "fontoxpath.esm.js");
      return { contents: patchen(readFileSync(pfad, "utf8")), loader: "js", resolveDir: dirname(pfad) };
    });
  },
};
const gemeinsam = { bundle: true, minify: true, format: "iife", target: ["chrome100", "safari16", "firefox110"], legalComments: "none", logLevel: "warning", define: { __FASSUNG__: JSON.stringify(FASSUNG), __LIZENZ_SCHLUESSEL__: LIZENZ_SCHLUESSEL }, loader: { ".json": "json", ".ts": "ts" } };
const banner = teil => `/*! SmartFormular E-Rechnung lite ${FASSUNG} – ${teil} · robin.vision · Lizenzen und Quellen: LIZENZEN.txt */`;

mkdirSync(join(ZIEL, "beispiele"), { recursive: true });
const app = await esbuild.build({ ...gemeinsam, entryPoints: [join(HIER, "src", "app.js")], write: false, banner: { js: banner("Oberfläche (enthält QR Code generator library, Project Nayuki, MIT)") } });
const kern = await esbuild.build({ ...gemeinsam, entryPoints: [join(HIER, "src", "pruefung-eintrag.js")], write: false, plugins: [fxPlugin], banner: { js: banner("Prüfkern (enthält fontoxpath 3.34.0, Fonto Group BV, MIT; xspattern, whynot, prsc, Stef Busking, MIT)") } });
const css = await esbuild.build({ entryPoints: [join(HIER, "src", "app.css")], write: false, minify: true, logLevel: "warning" });
const APP = app.outputFiles[0].text, KERN = kern.outputFiles[0].text, CSS = css.outputFiles[0].text;
writeFileSync(join(ZIEL, "app.js"), APP);
writeFileSync(join(ZIEL, "pruefung.js"), KERN);
writeFileSync(join(ZIEL, "app.css"), `/* SmartFormular E-Rechnung lite ${FASSUNG} */\n${CSS}`);
for (const n of ["xrechnung.xml", "zugferd.pdf"]) copyFileSync(join(HIER, "beispiele", n), join(ZIEL, "beispiele", n));

// Lizenztexte aller ausgelieferten Bestandteile
const lizenz = (titel, pfad) => `${"=".repeat(78)}\n${titel}\n${"=".repeat(78)}\n${readFileSync(pfad, "utf8").trim()}\n`;
const nm = p => join(HIER, "node_modules", p);
const LIZENZEN = `SmartFormular E-Rechnung lite – Lizenzen und Quellen (Fassung ${FASSUNG})
Anbieter: Robin James Lewis, robin.vision. Das Werkzeug selbst: Nutzungsbedingungen auf https://robin.vision/werkzeuge/e-rechnung-pruefen/

Enthaltene Bestandteile:
- Prüfregeln EN 16931 (CEN/TC 434, eInvoicing-EN16931 1.3.16), aus der KoSIT-Validator-Konfiguration XRechnung 3.0.2 vom 31.08.2026:
  EUPL 1.2. Die Dateien regeln/en16931-*.json sind daraus abgeleitet (in JSON übertragen, sonst unverändert) und stehen ebenfalls unter der EUPL 1.2.
  Quelle: https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/tag/v2026-08-31 und https://github.com/ConnectingEurope/eInvoicing-EN16931
- Prüfregeln XRechnung (KoSIT, XRechnung-Schematron 2.6.0) und Szenarien der Validator-Konfiguration: Apache License 2.0
- Feldbezeichnungen aus der KoSIT XRechnung-Visualisierung vom 13.10.2026: Apache License 2.0
- fontoxpath 3.34.0 (Fonto Group BV, Martin Middel) mit Dezimal-Anpassung: MIT
- xspattern 3.1.0, whynot 5.0.0, prsc 4.0.0 (Stef Busking): MIT
- QR Code generator library (Project Nayuki): MIT

${lizenz("EUPL 1.2 – Prüfregeln EN 16931 (CEN/TC 434)", join(HIER, "lizenzen", "EUPL-1.2.txt"))}
${lizenz("Apache License 2.0 – KoSIT (Validator-Konfiguration, XRechnung-Schematron, Visualisierung)", join(HIER, "lizenzen", "Apache-2.0.txt"))}
${lizenz("NOTICE – KoSIT", join(HIER, "lizenzen", "NOTICE-KoSIT.txt"))}
${lizenz("MIT – fontoxpath", nm("fontoxpath/LICENSE.md"))}
${lizenz("MIT – xspattern", nm("xspattern/LICENSE"))}
${lizenz("MIT – whynot", nm("whynot/LICENSE"))}
${lizenz("MIT – prsc", nm("prsc/LICENSE"))}
${lizenz("MIT – QR Code generator library (Project Nayuki)", join(HIER, "lizenzen", "MIT-Nayuki.txt"))}`;
writeFileSync(join(ZIEL, "LIZENZEN.txt"), LIZENZEN);

// Einzelne Datei je Sprache
const SEITE = {
  de: { datei: "E-Rechnung-lite.html", id: "e-rechnung-pruefen", fassung: "Fassung", offline: "Läuft offline in diesem Browserfenster. Ab 1. Januar 2027 verbindet sich die Datei nur zur Anmeldung und Lizenzprüfung mit robin.vision; Rechnungen werden nie übertragen.", lizenzen: "Lizenzen und Quellen", seite: "Nutzungsbedingungen, neue Fassungen und Fragen" },
  en: { datei: "E-Invoice-Viewer.html", id: "e-invoice-viewer", fassung: "Version", offline: "Runs offline in this browser window. From 1 January 2027 the file connects to robin.vision only to sign in and check the licence; invoices are never transmitted.", lizenzen: "Licences and sources", seite: "Terms of use, new versions and questions" },
};
const T = (await import("./src/texte.js")).T;
const ohneSchluss = s => s.replace(/<\/(script)/gi, "<\\/$1");
const regeln = Object.fromEntries(["en16931-ubl", "en16931-cii", "xrechnung-ubl", "xrechnung-cii"].map(id => [id, JSON.parse(readFileSync(join(ZIEL, "regeln", `${id}.json`), "utf8"))]));
const b64 = p => existsSync(p) ? readFileSync(p).toString("base64") : "";
const escHtml = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
for (const [lang, s] of Object.entries(SEITE)) {
  const t = T[lang];
  const beispiele = { xrechnung: b64(join(HIER, "beispiele", "xrechnung.xml")), zugferd: b64(join(HIER, "beispiele", "zugferd.pdf")) };
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src https://goch.robin.vision; form-action 'none'; base-uri 'none'">
<meta name="referrer" content="no-referrer">
<title>${t.titel}</title>
<style>
html { background: #0E0B14; }
body { margin: 0; color: #EDE9FE; font: 400 15px/1.55 "Helvetica Neue", Inter, Arial, sans-serif; }
.seite { max-width: 1100px; margin: 0 auto; padding: 0 32px 40px; }
.kopf { padding: 34px 0 18px; }
.wortmarke { font: 500 16px/1 "Helvetica Neue", Arial, sans-serif; letter-spacing: .02em; color: #fff; margin-bottom: 14px; }
.wortmarke span { color: #A78BFA; }
h1 { font: 400 34px/1.15 "EB Garamond", Georgia, serif; color: #fff; margin: 0; }
.lead { font: 400 18px/1.45 "EB Garamond", Georgia, serif; color: #C4B5FD; max-width: 62ch; margin: 10px 0 0; }
.fuss { margin-top: 40px; padding-top: 16px; border-top: 1px solid #2A2340; font-size: 13px; color: #9C94B8; }
.fuss a { color: #A78BFA; } .fuss .mono { font-family: Menlo, Consolas, monospace; }
.fuss details { margin-top: 10px; } .fuss summary { cursor: pointer; color: #C4B5FD; }
.fuss pre { max-height: 360px; overflow: auto; white-space: pre-wrap; background: #16121F; border: 1px solid #2A2340; padding: 10px; font: 11px/1.45 Menlo, Consolas, monospace; color: #C4B5FD; }
@media (max-width: 720px) { .seite { padding: 0 16px 32px; } h1 { font-size: 28px; } }
${CSS}
</style>
</head>
<body>
<div class="seite">
<header class="kopf"><div class="wortmarke">Smart<span>Formular</span></div><h1>E-Rechnung lite</h1><p class="lead">${escHtml(t.lead)}</p></header>
<main><div id="erechnung" data-lang="${lang}"></div></main>
<footer class="fuss">
<p>${escHtml(s.offline)} ${s.fassung} <span class="mono">${FASSUNG}</span> · <a href="https://robin.vision/werkzeuge/${s.id}/" rel="noopener">robin.vision</a> – ${escHtml(s.seite)}</p>
<details><summary>${escHtml(s.lizenzen)}</summary><pre>${escHtml(LIZENZEN)}</pre></details>
</footer>
</div>
<script type="application/json" id="rv-regeln">${ohneSchluss(JSON.stringify(regeln))}</script>
<script type="application/json" id="rv-beispiele">${JSON.stringify(beispiele)}</script>
<script>window.RV_REGELN = JSON.parse(document.getElementById("rv-regeln").textContent); window.RV_BEISPIELE = JSON.parse(document.getElementById("rv-beispiele").textContent);</script>
<script>${ohneSchluss(KERN)}</script>
<script>${ohneSchluss(APP)}</script>
</body>
</html>
`;
  const ordner = process.env.ERECHNUNG_ZIEL ? join(ZIEL, "dist") : join(HIER, ".cache", "dist");
  mkdirSync(ordner, { recursive: true });
  writeFileSync(join(ordner, s.datei), html);
  console.log(`${s.datei}: ${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB → tools/erechnung/.cache/dist/`);
}
console.log(`assets/erechnung: app.js ${(APP.length / 1024).toFixed(0)} KB, pruefung.js ${(KERN.length / 1024).toFixed(0)} KB, app.css ${(CSS.length / 1024).toFixed(0)} KB`);
