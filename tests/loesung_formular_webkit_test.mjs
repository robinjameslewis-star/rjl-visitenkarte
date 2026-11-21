// Anfrageformular der Seite „Individuelle Lösung“ in WebKit (Playwright; Robin, 21.11.2026: „individuelle lösung mit passendem formular,
// das lust auf die dienstleistung macht“, „budget noch abfragen“). Leer und ungültig geht nichts weg; vollständig genau eine Anfrage an
// Gochs /contact (hier an die Attrappe umgeleitet) mit Art „loesung“, Firma, Art, Budget und Aufgabe in der Nachricht; 390 px ohne Querscrollen.
//   Voraussetzungen: Seite (python3 tests/pruefserver.py 8788), Attrappe (python3 tests/goch_fake_worker.py 8787),
//   PLAYWRIGHT=/pfad/zum/ordner mit node_modules.  node tests/loesung_formular_webkit_test.mjs http://127.0.0.1:8788/ http://127.0.0.1:8787
import { createRequire } from "node:module";
import { stumm } from "./stumm.mjs";
const [seite = "http://127.0.0.1:8788/", attrappe = "http://127.0.0.1:8787"] = process.argv.slice(2);
let webkit;
try { ({ webkit } = createRequire((process.env.PLAYWRIGHT || process.cwd()) + "/")("playwright-core")); }
catch (_) { console.log("playwright-core nicht gefunden (PLAYWRIGHT=/pfad setzen) – Test übersprungen."); process.exit(0); }
let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FAIL ") + label + (info !== undefined ? " (" + JSON.stringify(info) + ")" : "")); if (!ok) fails++; };
const b = stumm(await webkit.launch());
for (const [lang, pfad] of [["de", "individuelle-loesung/"], ["en", "individuelle-loesung/en/"]]) {
  console.log(`${lang}, 390 px`);
  const vorher = (await (await fetch(attrappe + "/_contact")).json()).length;
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" }), p = await ctx.newPage();
  let anfragen = 0, fremd = [];
  await p.route("**/*", async r => {
    const u = r.request().url();
    if (u === "https://goch.robin.vision/contact") { anfragen++; const a = await r.fetch({ url: attrappe + "/contact" }); return r.fulfill({ response: a, headers: { ...a.headers(), "access-control-allow-origin": "*" } }); }
    if (u.startsWith(seite)) return r.continue();
    fremd.push(new URL(u).host); return r.abort();
  });
  await p.goto(seite + pfad + "?zeit=2026-11-21T12:00", { waitUntil: "load" }); await p.waitForTimeout(800);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "kein Querscrollen");
  await p.click("#loesung-senden"); await p.waitForTimeout(300);
  check(anfragen === 0 && /warn/.test(await p.getAttribute("#loesung-status", "class")), "leer: nichts gesendet, Hinweis");
  await p.fill("#l-name", "Erika Muster"); await p.fill("#l-email", "keine-adresse"); await p.fill("#l-text", "Wir tippen jeden Monat Lieferscheine ab.");
  await p.click("#loesung-senden"); await p.waitForTimeout(300);
  check(anfragen === 0, "ungültige E-Mail: nichts gesendet");
  await p.fill("#l-email", "erika@example.org"); await p.fill("#l-firma", "Muster GmbH");
  await p.selectOption("#l-art", { index: 2 }); await p.selectOption("#l-budget", { index: 2 });
  await p.waitForTimeout(4200); // Menschen brauchen ein paar Sekunden (Ladezeitpunkt)
  await p.click("#loesung-senden"); await p.waitForFunction(() => /ok|warn/.test(document.getElementById("loesung-status").className), null, { timeout: 8000 }).catch(() => {});
  const st = await p.evaluate(() => ({ cls: document.getElementById("loesung-status").className, text: document.getElementById("loesung-status").textContent, leer: document.getElementById("l-text").value === "" }));
  const neu = (await (await fetch(attrappe + "/_contact")).json()).slice(vorher);
  const m = neu[0] || {};
  check(anfragen === 1 && neu.length === 1 && st.cls.includes("ok") && st.leer, "vollständig: genau eine Anfrage, Bestätigung, Formular geleert", { anfragen, st });
  check(m.art === "loesung" && m.lang === lang && m.name === "Erika Muster" && /^Individuelle Lösung: Anfrage über robin\.vision/.test(m.message) && /Muster GmbH/.test(m.message)
    && /(Budget|budget): (250 bis 1\.000 €|€250 to €1,000)/.test(m.message) && /Lieferscheine/.test(m.message), "Nachricht mit Kennzeichnung, Firma, Art, Budget und Aufgabe", m);
  check(!fremd.length, "keine weiteren Anfragen nach außen", fremd);
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} FEHLER` : "\nAnfrageformular „Individuelle Lösung“: alles in Ordnung.");
process.exit(fails ? 1 : 0);
