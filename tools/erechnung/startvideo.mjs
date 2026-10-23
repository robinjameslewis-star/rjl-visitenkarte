// Startvideo von SmartFormular E-Rechnung lite: Reise b (Handwerksbetrieb bekommt eine ZUGFeRD-Rechnung, prüft sie und bezahlt per
// GiroCode) im Hochformat 1080 × 1350, ohne Ton, mit kurzen Untertiteln. Aufnahme mit Chrome (playwright-core) als Einzelbilder
// der echten Seite mit der erfundenen Beispielrechnung, zusammengesetzt mit mp4.swift (AVFoundation, H.264).
//   cd tools/erechnung && node startvideo.mjs   → .cache/startpaket/E-Rechnung-lite_Startvideo.mp4
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { WZ, server, chrome } from "../../tests/erechnung/hilfen.mjs";

const ZIEL = join(WZ, ".cache", "startpaket"), BILDER = join(ZIEL, "bilder");
rmSync(BILDER, { recursive: true, force: true });
mkdirSync(BILDER, { recursive: true });
const srv = await server(), br = await chrome();
const c = await br.newContext({ viewport: { width: 540, height: 675 }, deviceScaleFactor: 2, locale: "de-DE", reducedMotion: "reduce" });
const p = await c.newPage();
await p.goto(`${srv.url}/werkzeuge/e-rechnung-pruefen/`);
await p.waitForSelector("#erechnung .ewz-start");
await p.evaluate(() => document.fonts.ready);
const liste = [];
let n = 0;
async function bild(dauer) {
  const datei = join(BILDER, `${String(++n).padStart(4, "0")}.png`);
  await p.screenshot({ path: datei });
  liste.push(`${datei}\t${Math.max(1, Math.round(dauer * 30))}`);
}
const untertitel = text => p.evaluate(t => {
  let u = document.getElementById("rv-untertitel");
  if (!u) {
    u = document.createElement("div"); u.id = "rv-untertitel";
    Object.assign(u.style, { position: "fixed", left: "0", right: "0", bottom: "0", zIndex: "9999", padding: "16px 20px 18px", background: "rgba(14,11,20,.94)",
      borderTop: "3px solid #A78BFA", color: "#fff", font: "600 19px/1.32 'Helvetica Neue', Arial, sans-serif", letterSpacing: ".01em" });
    document.body.appendChild(u);
  }
  u.textContent = t; u.style.display = t ? "block" : "none";
}, text);
async function scrollen(y, sek) {
  const von = await p.evaluate(() => scrollY), schritte = Math.round(sek * 15);
  for (let i = 1; i <= schritte; i++) {
    const s = i / schritte, e = s < .5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
    await p.evaluate(v => window.scrollTo(0, v), von + (y - von) * e);
    await bild(1 / 15);
  }
}
const oben = sel => p.evaluate(s => document.querySelector(s).getBoundingClientRect().top + scrollY - 12, sel);

// 1 Anfang: Titel der Seite
await untertitel("Eine E-Rechnung als PDF ist gekommen. Was steht drin – und wie bezahle ich sie?");
await bild(2.6);
// 2 Zum Werkzeug, Datei hinein
await scrollen(await oben("#werkzeug"), 1.2);
await untertitel("ZUGFeRD-PDF in das Feld ziehen. Die Rechnung bleibt auf dem Rechner, nichts wird hochgeladen.");
await bild(2.2);
await p.setInputFiles("#ewz-datei", join(WZ, "beispiele", "zugferd.pdf"));
await p.waitForFunction(() => window.RVErechnung.eintraege.length === 1 && window.RVErechnung.eintraege[0].pruefung.status === "fertig", null, { timeout: 60000 });
await p.evaluate(() => window.scrollTo(0, scrollY));
// 3 Antwort
await scrollen(await oben(".ewz-karte"), .8);
await untertitel("Sofort die Antwort: Ja, das ist eine E-Rechnung – mit Format, Profil und Fundstelle.");
await bild(3.2);
await scrollen(await oben("[data-teil=pruefzeile]") - 160, 1);
await untertitel("Geprüft mit den offiziellen Regeln von CEN und KoSIT: keine Fehler gefunden.");
await bild(2.6);
// 4 Bezahlen
await scrollen(await oben(".ewz-zahlen") - 40, 1.2);
await untertitel("Bezahlen: den GiroCode mit der Banking-App scannen. Empfänger, IBAN und Betrag sind ausgefüllt.");
await bild(3.4);
const iban = p.locator(".ewz-kopieren").nth(1);
await iban.scrollIntoViewIfNeeded();
await untertitel("Oder IBAN, Betrag und Verwendungszweck einzeln kopieren.");
await bild(1.2);
await iban.click();
await bild(2);
// 5 Lesbare Rechnung
await scrollen(await oben(".ewz-blatt"), 1.4);
await untertitel("Die Rechnung lesbar und druckbar – Positionen, Steuer, Summen.");
await bild(3);
// 6 Schluss
await p.evaluate(() => {
  const s = document.createElement("div");
  Object.assign(s.style, { position: "fixed", inset: "0", zIndex: "10000", background: "#0E0B14", color: "#EDE9FE", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", font: "400 18px/1.5 'Helvetica Neue', Arial, sans-serif" });
  s.innerHTML = `<div style="font:500 17px/1 'Helvetica Neue',Arial,sans-serif;color:#fff;letter-spacing:.02em;margin-bottom:18px">Smart<span style="color:#A78BFA">Formular</span></div>
<div style="font:400 44px/1.08 'EB Garamond',Georgia,serif;color:#fff;margin-bottom:14px">E-Rechnung lite</div>
<div style="font:400 24px/1.3 'EB Garamond',Georgia,serif;color:#C4B5FD;margin-bottom:28px">E-Rechnungen verstehen und bezahlen</div>
<div style="color:#9C94B8;margin-bottom:6px">XRechnung · ZUGFeRD · GiroCode</div><div style="color:#9C94B8;margin-bottom:34px">Kostenlos, im Browser, ohne Upload</div>
<div style="font-size:20px;color:#fff">robin.vision/werkzeuge/e-rechnung-pruefen</div>`;
  document.body.appendChild(s);
  document.getElementById("rv-untertitel").style.display = "none";
});
await bild(3);
await br.close(); await srv.schliessen();
const lst = join(ZIEL, "bilder.txt");
writeFileSync(lst, liste.join("\n"));
console.log(execFileSync("swift", [join(WZ, "mp4.swift"), lst, join(ZIEL, "E-Rechnung-lite_Startvideo.mp4")], { encoding: "utf8" }).trim());
