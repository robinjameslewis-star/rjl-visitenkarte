// Große Bildschirme (Robin, 12.11.2026) in WebKit (Playwright): Ab 1600 px Fensterbreite wachsen Kopfleiste, Blatt und Fuß der
// Unterseiten maßvoll, Goch wird größer, Krone und Burgberg haben eine Obergrenze; darunter bleibt alles, wie es ist.
// Flattersatz in den Workshop-Karten auf jeder Breite.
//   Voraussetzungen wie goch_webkit_test.mjs (Seite auf einem Prüfserver).  node tests/gross_webkit_test.mjs http://127.0.0.1:8788/
import { createRequire } from "node:module";
const [seite = "http://127.0.0.1:8788/"] = process.argv.slice(2);
let webkit;
try { ({ webkit } = createRequire((process.env.PLAYWRIGHT || process.cwd()) + "/")("playwright-core")); }
catch (_) { console.log("playwright-core nicht gefunden (PLAYWRIGHT=/pfad setzen) – Test übersprungen."); process.exit(0); }
let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FAIL ") + label + (info !== undefined ? " (" + JSON.stringify(info) + ")" : "")); if (!ok) fails++; };
const b = await webkit.launch();
const messen = async (w, h) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }), p = await ctx.newPage();
  await p.goto(seite + "workshops/?zwitschertakt=600000&zeit=2026-11-11T12:00", { waitUntil: "load" });
  await p.waitForFunction(() => document.querySelector(".goch-kopf .landscape-crown img") && document.querySelector(".goch-kopf .landscape-far img") && document.querySelector(".goch-kopf .scene"), null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(), main = q(".goch-kopf + main"), kopf = q(".goch-kopf"), krone = q(".goch-kopf .landscape-crown"), berg = q(".goch-kopf .landscape-far"), goch = q(".goch-kopf .scene"), text = document.querySelector(".ws-karte .inhalt p") || document.querySelector(".ws-karte p");
    const zeile = document.querySelector("article p:not(.meta)"), fs = parseFloat(getComputedStyle(zeile || document.body).fontSize);
    return { blatt: Math.round(main.width), mitte: Math.round(main.left + main.width / 2 - innerWidth / 2), krone: Math.round(krone.width), berg: Math.round(berg.width), bergOben: Math.round(berg.top - kopf.top), goch: Math.round(goch.width), satz: getComputedStyle(text).textAlign, quer: document.documentElement.scrollWidth > innerWidth + 1,
      karteZeichen: Math.round(text.getBoundingClientRect().width / (parseFloat(getComputedStyle(text).fontSize) * .5)) }; });
  await ctx.close(); return r;
};
const a = await messen(1470, 956), g = await messen(1920, 1080), x = await messen(2560, 1440);
check(a.blatt <= 782 && a.goch <= 331, "1470 px: Blatt und Goch wie bisher (780 px, 330 px)", a);
check(g.blatt >= 950 && g.blatt <= 1000 && Math.abs(g.mitte) < 3, "1920 px: Das Blatt ist rund 975 px breit und steht mittig", g);
check(x.blatt >= 1000 && x.blatt <= 1045, "2560 px: Das Blatt ist höchstens rund 1040 px breit", x);
check(g.goch > a.goch && x.goch >= g.goch && x.goch <= 400, "Goch wird auf großen Schirmen größer (bis 400 px)", [a.goch, g.goch, x.goch]);
check(g.krone <= 720 && x.krone <= 720, "die Krone hat eine Obergrenze (720 px)", [a.krone, g.krone, x.krone]);
check(g.berg <= 760 && x.berg <= 760 && g.bergOben >= -2 && x.bergOben >= -2, "der Burgberg ist höchstens 760 px breit und oben nicht abgeschnitten", [g.berg, g.bergOben, x.berg, x.bergOben]);
check([a, g, x].every(r => r.satz === "left" || r.satz === "start"), "Flattersatz in den Workshop-Karten auf jeder Breite", [a.satz, g.satz, x.satz]);
check([a, g, x].every(r => !r.quer), "kein seitliches Scrollen", [a.quer, g.quer, x.quer]);
check(g.karteZeichen <= 75 && x.karteZeichen <= 75, "Zeilen in den Karten bleiben unter rund 75 Zeichen", [g.karteZeichen, x.karteZeichen]);
await b.close();
console.log(fails ? `\n${fails} FEHLER` : "\nWebKit, große Bildschirme: alles in Ordnung.");
process.exit(fails ? 1 : 0);
