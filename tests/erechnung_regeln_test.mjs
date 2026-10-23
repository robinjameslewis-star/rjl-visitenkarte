// Abnahme 1 – Richtigkeit: Für den ganzen Testkorpus liefert das Werkzeug im Browser (Chrome, ausgelieferter Prüfkern
// assets/erechnung/pruefung.js mit den Regeldateien assets/erechnung/regeln/) dieselben Regelnummern wie die offizielle Prüfung
// außerhalb des Browsers (saxonche mit denselben XSLT-Regeln der KoSIT-Konfiguration, tests/erechnung_referenz.py).
// Verglichen wird je Dokument und Regelsatz die Liste aller Meldungen (Regel, Kennzeichen, Art) – auch, wie oft eine Regel anschlägt.
// Bricht Saxon eine Prüfung ab (ungültiger Wert, etwa ein Datum „23.10.2026“), muss das Werkzeug für dieselbe Prüfung Auswertungsfehler
// melden. Jede andere Abweichung ist ein Fehler.
// Voraussetzung: tests/erechnung_korpus.mjs und tests/erechnung_referenz.py; dann  node tests/erechnung_regeln_test.mjs
// Schreibt tools/erechnung/.cache/korpus/bericht.json (Zahlen und Abweichungen).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { WZ, server, chrome } from "./erechnung/hilfen.mjs";

const KORPUS = join(WZ, ".cache", "korpus");
if (!existsSync(join(KORPUS, "referenz.json"))) { console.error("Referenz fehlt: erst tests/erechnung_korpus.mjs und tests/erechnung_referenz.py ausführen."); process.exit(1); }
let manifest = JSON.parse(readFileSync(join(KORPUS, "manifest.json"), "utf8"));
// --nur-abweichungen: nur die Dokumente, die im letzten Bericht abwichen (schneller Nachtest)
if (process.argv.includes("--nur-abweichungen")) { const alt = new Set(JSON.parse(readFileSync(join(KORPUS, "bericht.json"), "utf8")).abweichungenListe.map(a => a.datei)); manifest = manifest.filter(e => alt.has(e.datei)); }
const referenz = JSON.parse(readFileSync(join(KORPUS, "referenz.json"), "utf8"));
const t0 = Date.now();
const srv = await server();
const browser = await chrome();
const page = await browser.newPage();
const fremd = [];
page.on("request", r => { if (!r.url().startsWith(srv.url)) fremd.push(r.url()); });
await page.goto(`${srv.url}/__pruefkern__.html`);
await page.waitForFunction(() => !!window.RVPruefung);
await page.evaluate(() => {
  window.__saetze = {};
  window.__pruefe = async (text, saetze) => {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) return { parse: true };
    const out = {};
    for (const s of saetze) {
      window.__saetze[s] ||= fetch(`/assets/erechnung/regeln/${s}.json`).then(r => r.json()).then(d => window.RVPruefung.vorbereiten(d, window.RVPruefung.fx, s));
      const v = await window.__saetze[s];
      try {
        const { befunde, fehler } = await window.RVPruefung.pruefen(window.RVPruefung.fx, doc, v);
        out[s] = { b: befunde.map(b => [b.id, b.flag, b.art]), f: fehler.map(x => `${x.id || ""} ${String(x.meldung).slice(0, 120)}`) };
      } catch (e) { out[s] = { abbruch: String(e && e.message || e).slice(0, 200) }; }
    }
    return out;
  };
});

const sortiert = l => [...l].map(x => x.join("|")).sort();
const zahlen = { dokumente: 0, pruefungen: 0, befundeReferenz: 0, befundeWerkzeug: 0, gleich: 0, abbruchBeide: 0, abweichungen: 0, regelnAusgeloest: new Set(), gruppen: {} };
const abweichungen = [];
const STAPEL = 40;
for (let i = 0; i < manifest.length; i += STAPEL) {
  const teil = manifest.slice(i, i + STAPEL);
  const ergebnisse = [];
  for (const e of teil) ergebnisse.push(await page.evaluate(([text, saetze]) => window.__pruefe(text, saetze), [readFileSync(join(KORPUS, e.datei), "utf8"), e.saetze]));
  teil.forEach((e, k) => {
    const w = ergebnisse[k], r = referenz[e.datei] || {};
    zahlen.dokumente++;
    const g = zahlen.gruppen[e.gruppe] ||= { dokumente: 0, pruefungen: 0, abweichungen: 0 };
    g.dokumente++;
    if (w.parse || r.parse) { if (!(w.parse && r.parse)) { zahlen.abweichungen++; g.abweichungen++; abweichungen.push({ datei: e.datei, art: "einlesen", werkzeug: !!w.parse, referenz: r.parse || null }); } return; }
    for (const s of e.saetze) {
      zahlen.pruefungen++; g.pruefungen++;
      const rs = r[s], ws = w[s];
      if (Array.isArray(rs)) {
        zahlen.befundeReferenz += rs.length;
        rs.forEach(x => zahlen.regelnAusgeloest.add(x[0]));
        const gleich = ws && !ws.abbruch && !ws.f.length && JSON.stringify(sortiert(rs)) === JSON.stringify(sortiert(ws.b));
        if (ws && ws.b) zahlen.befundeWerkzeug += ws.b.length;
        if (gleich) zahlen.gleich++;
        else {
          zahlen.abweichungen++; g.abweichungen++;
          const a = new Map(), b = new Map();
          for (const x of sortiert(rs)) a.set(x, (a.get(x) || 0) + 1);
          for (const x of sortiert(ws && ws.b || [])) b.set(x, (b.get(x) || 0) + 1);
          const nurR = [...a].filter(([x, n]) => (b.get(x) || 0) < n).map(([x]) => x), nurW = [...b].filter(([x, n]) => (a.get(x) || 0) < n).map(([x]) => x);
          abweichungen.push({ datei: e.datei, satz: s, nurReferenz: nurR, nurWerkzeug: nurW, werkzeugFehler: ws && (ws.f || ws.abbruch) });
        }
      } else {
        // Saxon bricht ab: das Werkzeug muss Auswertungsfehler melden
        if (ws && (ws.abbruch || (ws.f && ws.f.length))) zahlen.abbruchBeide++;
        else { zahlen.abweichungen++; g.abweichungen++; abweichungen.push({ datei: e.datei, satz: s, art: "abbruch nur in der Referenz", referenz: rs && rs.abbruch, werkzeug: ws && ws.b && ws.b.length }); }
      }
    }
  });
  process.stdout.write(`\r  ${Math.min(i + STAPEL, manifest.length)} / ${manifest.length} Dokumente, Abweichungen: ${zahlen.abweichungen}   `);
}
console.log("");
await browser.close();
await srv.schliessen();
const regeln = ["en16931-ubl", "en16931-cii", "xrechnung-ubl", "xrechnung-cii"].flatMap(id => JSON.parse(readFileSync(join(WZ, "..", "..", "assets", "erechnung", "regeln", `${id}.json`), "utf8")).muster.flatMap(m => m.regeln.flatMap(r => r.tests.map(t => t.id))));
const bericht = { ...zahlen, regelnAusgeloest: zahlen.regelnAusgeloest.size, regelnGesamt: new Set(regeln).size, fremdeAnfragen: fremd, sekunden: Math.round((Date.now() - t0) / 1000), abweichungenListe: abweichungen.slice(0, 200) };
if (!process.argv.includes("--nur-abweichungen")) writeFileSync(join(KORPUS, "bericht.json"), JSON.stringify(bericht, null, 1));
console.log(`Abgleich Browser ↔ saxonche: ${bericht.dokumente} Dokumente, ${bericht.pruefungen} Prüfungen, ${bericht.befundeReferenz} Meldungen der Referenz, ${bericht.regelnAusgeloest} von ${bericht.regelnGesamt} Regeln mindestens einmal ausgelöst`);
console.log(`  gleich: ${bericht.gleich}, beide abgebrochen (ungültige Werte): ${bericht.abbruchBeide}, Abweichungen: ${bericht.abweichungen}, Anfragen an fremde Hosts: ${fremd.length}, ${bericht.sekunden} s`);
for (const [g, z] of Object.entries(bericht.gruppen)) console.log(`  ${g}: ${z.dokumente} Dokumente, ${z.pruefungen} Prüfungen, ${z.abweichungen} Abweichungen`);
for (const a of abweichungen.slice(0, 15)) console.log("  ABWEICHUNG", JSON.stringify(a).slice(0, 400));
process.exit(bericht.abweichungen || fremd.length ? 1 : 0);
