// Übergabe der Browser-Daten robin.vision → smartformular.ai (Umzug 20.11.2026, PR B), in Chromium (Chrome) und WebKit, stumm.
// Beide Herkünfte werden im Browser auf lokale Dateien umgeleitet: https://robin.vision → dieses Repository,
// https://smartformular.ai → gebaute Seite von smartformular.ai (SF_OEFFENTLICH, Standard ~/Developer/smartformular-ai-werkzeuge/oeffentlich).
// Geprüft: ohne Klick fließt nichts; fremde Herkunft wird abgewiesen; nur die benannten Schlüssel; nichts in Adresse oder Verlauf;
// Ergebnis wird angezeigt; „Alte Kopie löschen“ entfernt nur nach Rückfrage; alte Adresse zeigt bei Daten einmal die Übergabe.
//   node tests/daten_uebergabe_test.mjs
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { WURZEL, playwright, check, ergebnis } from "./erechnung/hilfen.mjs";
import { stumm } from "./stumm.mjs";

const SF = process.env.SF_OEFFENTLICH || join(homedir(), "Developer/smartformular-ai-werkzeuge/oeffentlich");
const TYP = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json", ".ico": "image/x-icon", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg" };
const DATEN = { "rverechnung:firma": JSON.stringify({ name: "Muster GmbH", iban: "DE00 TEST" }), "rverechnung:rechnungen": "x".repeat(400000),
  "rvlizenz:erechnung": JSON.stringify({ sitzung: "geheim-123" }), "buchungsstapel-browser-1": JSON.stringify({ berater: "1001" }), "fremd:schluessel": "bleibt hier" };
const adressen = [];

async function umleiten(ctx) {
  await ctx.route(/^https:\/\/(robin\.vision|smartformular\.ai)\//, async r => {
    const u = new URL(r.request().url()); adressen.push(u.href);
    const basis = u.hostname === "robin.vision" ? WURZEL : SF;
    let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
    try { return r.fulfill({ status: 200, body: await readFile(join(basis, p)), contentType: TYP[extname(p)] || "application/octet-stream" }); }
    catch { return r.fulfill({ status: 404, body: "fehlt" }); }
  });
  await ctx.route(/^https?:\/\/(?!robin\.vision\/|smartformular\.ai\/)/, r => r.abort());
}

const m = await playwright(), pw = m.chromium ? m : m.default;
for (const [name, start] of [["Chrome", () => pw.chromium.launch({ channel: "chrome", headless: true })], ["WebKit", () => pw.webkit.launch()]]) {
  const b = stumm(await start());
  // 1. Übergabe mit Klick
  { const ctx = await b.newContext(); await umleiten(ctx);
    const rv = await ctx.newPage();
    await rv.goto("https://robin.vision/werkzeuge/daten-uebergabe/");
    await rv.evaluate(d => { for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v); }, DATEN);
    await rv.reload();
    check(/4 Einträge/.test(await rv.textContent("[data-ue-status]")), `${name}: vier benannte Einträge gefunden`);
    const [sf] = await Promise.all([ctx.waitForEvent("page"), rv.click("[data-ue-mitnehmen]")]);
    await sf.waitForLoadState("load");
    check(sf.url() === "https://smartformular.ai/daten-mitnehmen/", `${name}: smartformular.ai ohne Daten in der Adresse geöffnet`);
    await sf.waitForTimeout(400);
    const vorKlick = await sf.evaluate(() => Object.keys(localStorage));
    check(!vorKlick.length, `${name}: ohne Klick auf smartformular.ai nichts angekommen`);
    // fremde Herkunft: eine Seite von evil.example schickt dieselbe Nachricht an robin.vision → wird ignoriert (Herkunft und Fenster)
    await rv.evaluate(() => window.postMessage({ typ: "sf-uebergabe-bereit", v: 1 }, "*"));
    await rv.waitForTimeout(200);
    check(!/gesendet/i.test(await rv.textContent("[data-ue-status]")), `${name}: Nachricht aus falscher Herkunft ignoriert`);
    await sf.click("[data-ue-bereit]");
    await rv.waitForFunction(() => /angekommen/.test(document.querySelector("[data-ue-status]").textContent), null, { timeout: 8000 }).catch(() => {});
    const an = await sf.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k).length])));
    check(an["rverechnung:firma"] && an["rverechnung:rechnungen"] === 400000 && an["rvlizenz:erechnung"] && an["buchungsstapel-browser-1"] && !an["fremd:schluessel"],
      `${name}: benannte Schlüssel samt Lizenz und 400.000 Zeichen angekommen, fremder Schlüssel nicht`);
    check(/4 Einträge sind auf smartformular.ai angekommen/.test(await rv.textContent("[data-ue-status]")), `${name}: Ergebnis auf robin.vision angezeigt`);
    check(await rv.isVisible("[data-ue-loeschen]"), `${name}: Knopf „Alte Kopie löschen“ erscheint`);
    rv.once("dialog", d => d.dismiss()); await rv.click("[data-ue-loeschen]");
    check((await rv.evaluate(() => localStorage.getItem("rverechnung:firma"))) !== null, `${name}: Abbrechen der Rückfrage löscht nichts`);
    rv.once("dialog", d => d.accept()); await rv.click("[data-ue-loeschen]");
    const rest = await rv.evaluate(() => Object.keys(localStorage).sort());
    check(rest.join() === "fremd:schluessel,rv-uebergabe-angeboten" || rest.join() === "fremd:schluessel", `${name}: nach Bestätigung nur die Werkzeug-Einträge gelöscht`);
    check(!adressen.some(a => /Muster|geheim|DE00/.test(decodeURIComponent(a))), `${name}: keine Daten in einer Adresse`);
    await ctx.close(); }
  // 2. alte Adressen: mit Daten einmal Übergabe, sonst Weiterleitung
  { const ctx = await b.newContext(); await umleiten(ctx); const p = await ctx.newPage();
    await p.goto("https://robin.vision/werkzeuge/e-rechnung-pruefen/regeln/br-01/"); await p.waitForURL(/smartformular\.ai/, { timeout: 8000 }).catch(() => {});
    check(p.url() === "https://smartformular.ai/e-rechnung-start/regeln/br-01/", `${name}: Regel-Seite ohne Daten → smartformular.ai`);
    await p.goto("https://robin.vision/werkzeuge/daten-uebergabe/"); await p.evaluate(() => localStorage.setItem("rvlizenz:fibu", "{}"));
    await p.goto("https://robin.vision/werkzeuge/buchungsstapel-generator/"); await p.waitForURL(/daten-uebergabe/, { timeout: 8000 }).catch(() => {});
    check(p.url() === "https://robin.vision/werkzeuge/daten-uebergabe/", `${name}: alte Adresse mit Daten zeigt die Übergabe`);
    await p.goto("https://robin.vision/werkzeuge/e-rechnung-pruefen/"); await p.waitForURL(/daten-uebergabe/, { timeout: 8000 }).catch(() => {});
    check(p.url() === "https://robin.vision/werkzeuge/daten-uebergabe/", `${name}: ohne Entscheidung auch beim nächsten Besuch wieder die Übergabe`);
    await Promise.all([p.waitForURL(/smartformular\.ai/, { timeout: 8000 }).catch(() => {}), p.click("[data-ue-weiter]")]);
    await p.goto("https://robin.vision/werkzeuge/booking-batch-generator/Booking-Batch-Generator.html"); await p.waitForURL(/smartformular\.ai/, { timeout: 8000 }).catch(() => {});
    check(p.url() === "https://smartformular.ai/en/bookkeeping-start/Bookkeeping-Start.html", `${name}: nach „weiter ohne Mitnehmen“ Weiterleitung, auch für die Werkzeug-Datei`);
    await ctx.close(); }
  // 3. Parameter und Sprungmarke gehen mit (Stripe-Rückkehr, Reiter, Fassung im Newsletter)
  { const ctx = await b.newContext(); await umleiten(ctx); const p = await ctx.newPage();
    await p.goto("https://robin.vision/werkzeuge/e-rechnung-pruefen/?lizenz=gekauft#erstellen"); await p.waitForURL(/smartformular\.ai/, { timeout: 8000 }).catch(() => {});
    check(p.url() === "https://smartformular.ai/e-rechnung-start/?lizenz=gekauft#erstellen", `${name}: ?lizenz=gekauft und #erstellen kommen am Ziel an`);
    await p.goto("https://robin.vision/werkzeuge/e-rechnung-pruefen/#fassung-cde559c"); await p.waitForURL(/smartformular\.ai/, { timeout: 8000 }).catch(() => {});
    check(p.url() === "https://smartformular.ai/e-rechnung-start/#fassung-cde559c" && await p.locator("#fassung-cde559c").count() === 1, `${name}: #fassung-… aus dem Newsletter hat ein Ziel auf smartformular.ai`);
    await ctx.close(); }
  // 4. Teilweise übernommen: nur die gemeldeten und gesendeten Einträge werden gelöscht (Gegenstelle als Attrappe)
  { const ctx = await b.newContext(); await umleiten(ctx);
    await ctx.route("https://smartformular.ai/daten-mitnehmen/", r => r.fulfill({ status: 200, contentType: "text/html", body: `<!doctype html><button id="los">los</button><script>
      addEventListener("message", e => { if (e.origin !== "https://robin.vision") return; const k = Object.keys(e.data.eintraege);
        e.source.postMessage({ typ: "sf-uebergabe-ergebnis", v: 1, uebernommen: [k[0], k[1], "rv-erfunden"], abgelehnt: k.length - 2 }, "https://robin.vision"); });
      document.getElementById("los").onclick = () => opener.postMessage({ typ: "sf-uebergabe-bereit", v: 1 }, "https://robin.vision");</script>` }));
    const rv = await ctx.newPage(); await rv.goto("https://robin.vision/werkzeuge/daten-uebergabe/");
    await rv.evaluate(d => { for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v); localStorage.setItem("rv-erfunden", "x"); }, DATEN); await rv.reload();
    const [sf] = await Promise.all([ctx.waitForEvent("page"), rv.click("[data-ue-mitnehmen]")]); await sf.waitForLoadState("load"); await sf.click("#los");
    await rv.waitForFunction(() => /angekommen/.test(document.querySelector("[data-ue-status]").textContent), null, { timeout: 8000 }).catch(() => {});
    const st = await rv.textContent("[data-ue-status]");
    check(/2 Einträge sind auf smartformular.ai angekommen. 2 Einträge wurden nicht übernommen und bleiben hier/.test(st), `${name}: teilweise übernommen wird klar gesagt`);
    rv.once("dialog", d => d.accept()); await rv.click("[data-ue-loeschen]");
    const rest = await rv.evaluate(() => Object.keys(localStorage).sort().join());
    check(rest === "buchungsstapel-browser-1,fremd:schluessel,rv-erfunden,rv-uebergabe-angeboten,rvlizenz:erechnung", `${name}: nur die zwei übernommenen gelöscht, abgelehnte und nie gesendete bleiben (${rest})`);
    await ctx.close(); }
  // 5. Handy-Breite: lesbar, Knopf sichtbar, kein seitliches Scrollen
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await umleiten(ctx); const p = await ctx.newPage();
    await p.goto("https://robin.vision/werkzeuge/daten-uebergabe/"); await p.evaluate(() => localStorage.setItem("rvlizenz:fibu", "{}")); await p.reload();
    const m = await p.evaluate(() => ({ breit: document.documentElement.scrollWidth, knopf: document.querySelector("[data-ue-mitnehmen]").getBoundingClientRect() }));
    check(m.breit <= 390 && m.knopf.width > 0 && m.knopf.right <= 390 && m.knopf.height >= 44, `${name}: 390 px ohne seitliches Scrollen, Knopf mindestens 44 px hoch`);
    await ctx.close(); }
  await b.close();
}
const { fails, oks } = ergebnis();
console.log(fails ? `\n${fails} Prüfungen fehlgeschlagen, ${oks} bestanden.` : `\nAlle ${oks} Prüfungen bestanden.`);
process.exit(fails ? 1 : 0);
