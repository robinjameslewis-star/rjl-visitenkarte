// LinkedIn-Karussell (Dokument-Post) zu SmartFormular E-Rechnung lite: „Ist das eine E-Rechnung? Sechs Dateien, sechs Antworten“,
// acht Seiten im Hochformat 1080 × 1350, Erscheinungsbild „Nacht und Violett“, jede rechtliche Aussage mit Fundstelle und Stand.
// Aufnahme mit Chrome (playwright-core) als PDF und als Einzelbilder (JPEG über sips).
//   cd tools/erechnung && node karussell.mjs   → .cache/startpaket/E-Rechnung-lite_Karussell.pdf (+ karussell/*.jpg)
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { WZ, WURZEL, chrome } from "../../tests/erechnung/hilfen.mjs";
import { STAND } from "./src/recht.js";

const ZIEL = join(WZ, ".cache", "startpaket"), BILDER = join(ZIEL, "karussell");
rmSync(BILDER, { recursive: true, force: true });
mkdirSync(BILDER, { recursive: true });
const stand = STAND.split("-").reverse().join(".");
const FAELLE = [
  { datei: "XRechnung (XML-Datei)", ja: true, urteil: "Ja, E-Rechnung", text: "Ein Format nach der europäischen Norm EN 16931. Solche Formate sind für E-Rechnungen zulässig.", quelle: "§ 14 Abs. 1 Satz 3 und 6 UStG" },
  { datei: "ZUGFeRD-PDF, Profil EN 16931", ja: true, urteil: "Ja, E-Rechnung", text: "ZUGFeRD ab Version 2.0.1 ist zulässig. Es zählen die im PDF eingebetteten Daten, nicht das sichtbare Bild.", quelle: "Abschnitt 14.1 Abs. 14 und 14.4 Abs. 3 UStAE" },
  { datei: "ZUGFeRD-PDF, Profil MINIMUM oder BASIC WL", ja: false, urteil: "Nein", text: "Diese einfachen Profile enthalten nicht alle Rechnungsangaben. Die Datei ist eine sonstige Rechnung.", quelle: "Abschnitt 14.1 Abs. 14 UStAE" },
  { datei: "PDF ohne eingebettete Daten", ja: false, urteil: "Nein", text: "Ein PDF, das nur ein Rechnungsbild enthält, ist eine sonstige Rechnung – auch wenn es per E-Mail kommt.", quelle: "Abschnitt 14.1 Abs. 2 UStAE" },
  { datei: "Foto oder Scan", ja: false, urteil: "Nein", text: "Ein Bild der Rechnung ist eine sonstige Rechnung, keine E-Rechnung.", quelle: "Abschnitt 14.1 Abs. 2 UStAE" },
  { datei: "XRechnung mit Fehlern bei den Geschäftsregeln", ja: true, urteil: "In der Regel ja", text: "Fehlende oder unstimmige Angaben sind kein Formatfehler. Fehlt aber eine Pflichtangabe, ist die Rechnung nicht ordnungsgemäß: berichtigen lassen.", quelle: "BMF-Schreiben vom 15.10.2026, Rn. 22 und 23" },
];
const css = `
@font-face { font-family: "EB Garamond"; font-weight: 400 500; src: url("file://${join(WURZEL, "assets", "fonts", "eb-garamond-latin.woff2")}") format("woff2"); }
@page { size: 1080px 1350px; margin: 0; }
html, body { margin: 0; background: #0E0B14; }
.seite { width: 1080px; height: 1350px; box-sizing: border-box; padding: 96px 88px 80px; position: relative; overflow: hidden; color: #EDE9FE;
  font-family: "Helvetica Neue", Arial, sans-serif; break-after: page; background: #0E0B14; display: flex; flex-direction: column; justify-content: center; }
.glanz { position: absolute; right: -260px; top: -300px; width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, rgba(124,58,237,.32), rgba(14,11,20,0) 65%); }
.marke { position: absolute; top: 96px; left: 88px; font-size: 30px; font-weight: 500; letter-spacing: .02em; color: #fff; margin: 0; } .marke span { color: #A78BFA; }
h1 { position: relative; font: 400 124px/1.02 "EB Garamond", Georgia, serif; color: #fff; margin: 0 0 34px; }
.unter { position: relative; font: 400 54px/1.25 "EB Garamond", Georgia, serif; color: #C4B5FD; margin: 0; }
.nr { position: relative; font-size: 28px; letter-spacing: .18em; text-transform: uppercase; color: #9C94B8; margin: 0 0 26px; }
.datei { position: relative; font: 400 86px/1.08 "EB Garamond", Georgia, serif; color: #fff; margin: 0 0 70px; }
.urteil { position: relative; align-self: flex-start; font-size: 60px; font-weight: 600; padding: 22px 36px; border-radius: 14px; margin: 0 0 54px; }
.urteil.ja { background: rgba(167,243,208,.14); color: #A7F3D0; border: 2px solid #A7F3D0; } .urteil.nein { background: rgba(252,165,165,.12); color: #FCA5A5; border: 2px solid #FCA5A5; }
.text { position: relative; font-size: 47px; line-height: 1.42; color: #EDE9FE; margin: 0; max-width: 860px; }
.fuss { position: absolute; left: 88px; right: 88px; bottom: 72px; display: flex; justify-content: space-between; font-size: 24px; color: #9C94B8; border-top: 1px solid #2A2340; padding-top: 22px; }
.adresse { position: relative; font-size: 46px; color: #fff; margin: 0 0 30px; } .adresse b { color: #A78BFA; font-weight: 400; }
.punkte { position: relative; list-style: none; padding: 0; margin: 0 0 60px; font-size: 44px; line-height: 1.6; color: #C4B5FD; }
.hinweis { position: relative; font-size: 28px; line-height: 1.45; color: #9C94B8; margin: 0; max-width: 880px; }`;
const fuss = (n, quelle) => `<div class="fuss"><span>${quelle ? `Quelle: ${quelle}` : "SmartFormular E-Rechnung lite"}</span><span>${n} / 8</span></div>`;
const seiten = [
  `<div class="seite"><div class="glanz"></div><p class="marke">Smart<span>Formular</span></p><h1>Ist das eine E&#8209;Rechnung?</h1><p class="unter">Sechs Dateien, sechs Antworten – mit Fundstelle.</p>${fuss(1)}</div>`,
  ...FAELLE.map((f, i) => `<div class="seite"><div class="glanz"></div><p class="marke">Smart<span>Formular</span></p><p class="nr">Datei ${i + 1}</p><p class="datei">${f.datei}</p>
<p class="urteil ${f.ja ? "ja" : "nein"}">${f.ja ? "✓" : "✗"} ${f.urteil}</p><p class="text">${f.text}</p>${fuss(i + 2, f.quelle)}</div>`),
  `<div class="seite"><div class="glanz"></div><p class="marke">Smart<span>Formular</span></p><h1 style="font-size:88px">Ihre Datei prüfen</h1>
<ul class="punkte"><li>Antwort mit Format und Fundstelle</li><li>Befunde in einfachen Worten</li><li>Lesbar, druckbar, GiroCode zum Bezahlen</li><li>Kostenlos testen bis 31.12.2026 · im Browser, ohne Upload</li></ul>
<p class="adresse">robin<b>.</b>vision/werkzeuge/e-rechnung-pruefen</p>
<p class="hinweis">Technische Einordnung nach den genannten Vorschriften, keine Steuerberatung. Stand der Rechtsangaben: ${stand}. UStG: Umsatzsteuergesetz, UStAE: Umsatzsteuer-Anwendungserlass in der Fassung des BMF-Schreibens vom 15.10.2025.</p>${fuss(8)}</div>`,
];
const br = await chrome();
const p = await br.newPage({ viewport: { width: 1080, height: 1350 } });
await p.setContent(`<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css}</style></head><body>${seiten.join("\n")}</body></html>`, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: join(ZIEL, "E-Rechnung-lite_Karussell.pdf"), width: "1080px", height: "1350px", printBackground: true });
const n = await p.locator(".seite").count();
for (let i = 0; i < n; i++) {
  const png = join(BILDER, `${i + 1}.png`);
  await p.locator(".seite").nth(i).screenshot({ path: png });
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "85", png, "--out", png.replace(/\.png$/, ".jpg")], { stdio: "ignore" });
  rmSync(png);
}
await br.close();
console.log(`${join(ZIEL, "E-Rechnung-lite_Karussell.pdf")}: ${n} Seiten`);
