// Bilder zum Teilen (og:image, 1200 × 630) für die Werkzeugseiten von FiBu lite und E-Rechnung lite, je Sprache, im Erscheinungsbild
// SmartFormular „Nacht und Violett“. Der QR-Code führt zur Werkzeugseite (echt, lesbar). Aufnahme mit Chrome ohne Fenster, JPEG mit sips.
//   cd tools/erechnung && node teilen-bilder.mjs      → assets/teilen-{fibu-lite,e-rechnung-lite}{,-en}.jpg
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const HIER = dirname(fileURLToPath(import.meta.url)), WURZEL = join(HIER, "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const qrCode = await esbuild.build({ stdin: { contents: 'import q from "./src/qrcodegen.ts"; export default q;', resolveDir: HIER, loader: "js" }, bundle: true, write: false, format: "esm", loader: { ".ts": "ts" } });
const { default: qrcodegen } = await import("data:text/javascript;base64," + Buffer.from(qrCode.outputFiles[0].text).toString("base64"));
function qr(text) {
  const q = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM), n = q.size, r = 2;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.getModule(x, y)) d += `M${x + r},${y + r}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * r} ${n + 2 * r}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#0E0B14"/></svg>`;
}
const BILDER = [
  { datei: "teilen-e-rechnung-lite.jpg", produkt: "E-Rechnung lite", claim: "E-Rechnungen verstehen und bezahlen", zeile: "XRechnung · ZUGFeRD · GiroCode · im Browser, ohne Upload",
    karte: ["Ist das eine E-Rechnung?", "✓ Ja, das ist eine E-Rechnung.", "Prüfung: Regeln von CEN und KoSIT"], url: "https://robin.vision/werkzeuge/e-rechnung-pruefen/" },
  { datei: "teilen-e-rechnung-lite-en.jpg", produkt: "E-Rechnung lite", claim: "E-invoice viewer and validator", zeile: "XRechnung · ZUGFeRD · GiroCode · in your browser, no upload",
    karte: ["Is this an e-invoice?", "✓ Yes, this is an e-invoice.", "Checked against CEN and KoSIT rules"], url: "https://robin.vision/werkzeuge/e-invoice-viewer/" },
  { datei: "teilen-fibu-lite.jpg", produkt: "FiBu lite", claim: "Kontoauszüge zu Buchungsstapeln", zeile: "PDF, Scan, CAMT, MT940 · DATEV-Format · offline, kostenlos",
    karte: ["Buchungsstapel", "Kontoauszug → DATEV-Format (EXTF)", "Mit Summenprüfung je Auszug"], url: "https://robin.vision/werkzeuge/buchungsstapel-generator/" },
  { datei: "teilen-fibu-lite-en.jpg", produkt: "FiBu lite", claim: "Bank statements into booking batches", zeile: "PDF, scan, CAMT, MT940 · DATEV format · offline, free",
    karte: ["Booking batch", "Bank statement → DATEV format (EXTF)", "With a totals check per statement"], url: "https://robin.vision/werkzeuge/booking-batch-generator/" },
];
const tmp = join(HIER, ".cache", "teilen");
mkdirSync(tmp, { recursive: true });
for (const b of BILDER) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "EB Garamond"; font-weight: 400 500; src: url("${join(WURZEL, "assets", "fonts", "eb-garamond-latin.woff2")}") format("woff2"); }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body { background: #0E0B14; color: #EDE9FE; font-family: "Helvetica Neue", Arial, sans-serif; position: relative; }
.glanz { position: absolute; right: -180px; top: -220px; width: 760px; height: 760px; border-radius: 50%; background: radial-gradient(circle, rgba(124,58,237,.35), rgba(14,11,20,0) 65%); }
.links { position: absolute; left: 76px; top: 92px; width: 600px; }
.marke { font-size: 24px; font-weight: 500; letter-spacing: .02em; color: #fff; margin: 0 0 26px; } .marke span { color: #A78BFA; }
h1 { font: 400 76px/1.05 "EB Garamond", Georgia, serif; color: #fff; margin: 0 0 18px; }
.claim { font: 400 38px/1.25 "EB Garamond", Georgia, serif; color: #C4B5FD; margin: 0 0 30px; }
.zeile { font-size: 21px; color: #9C94B8; margin: 0; }
.url { position: absolute; left: 76px; bottom: 58px; font-size: 22px; letter-spacing: .04em; color: #EDE9FE; } .url b { color: #A78BFA; font-weight: 400; }
.karte { position: absolute; right: 70px; top: 120px; width: 380px; background: #1C1726; border: 1px solid #2A2340; border-left: 4px solid #A7F3D0; border-radius: 10px; padding: 26px 26px 24px; }
.karte .k1 { font-size: 13px; letter-spacing: .16em; text-transform: uppercase; color: #C4B5FD; margin: 0 0 8px; }
.karte .k2 { font: 400 27px/1.2 "EB Garamond", Georgia, serif; color: #fff; margin: 0 0 12px; }
.karte .k3 { font-size: 16px; color: #C4B5FD; margin: 0 0 18px; }
.qr { width: 138px; height: 138px; background: #fff; padding: 6px; border-radius: 6px; } .qr svg { width: 100%; height: 100%; display: block; }
.qrtext { position: absolute; right: 26px; bottom: 30px; width: 190px; font-size: 14px; color: #9C94B8; text-align: left; }
</style></head><body><div class="glanz"></div>
<div class="links"><p class="marke">Smart<span>Formular</span></p><h1>${b.produkt}</h1><p class="claim">${b.claim}</p><p class="zeile">${b.zeile}</p></div>
<p class="url">robin<b>.</b>vision</p>
<div class="karte"><p class="k1">${b.karte[0]}</p><p class="k2">${b.karte[1]}</p><p class="k3">${b.karte[2]}</p><div class="qr">${qr(b.url)}</div><p class="qrtext">${b.url.replace("https://", "")}</p></div>
</body></html>`;
  const quelle = join(tmp, b.datei.replace(/\.jpg$/, ".html")), png = join(tmp, b.datei.replace(/\.jpg$/, ".png"));
  writeFileSync(quelle, html);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1200,630", `--screenshot=${png}`, "file://" + quelle], { stdio: "ignore" });
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "86", png, "--out", join(WURZEL, "assets", b.datei)], { stdio: "ignore" });
  console.log("assets/" + b.datei);
}
