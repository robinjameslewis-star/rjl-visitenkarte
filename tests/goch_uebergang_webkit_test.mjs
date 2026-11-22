// Übergang großes ↔ kleines Gesprächsfenster in WebKit (Playwright) – Robin, 22.11.2026, am iPhone: „Der Übergang von kleinem Goch
// mit kleinem Goch Fenster zu großem Goch mit kleinem und großem Goch Fenster stimmt nicht. … Das muss flüssiger werden.“
// Bei offenem Gespräch auf der Startseite hinunter bis zu den Werkzeugen und zurück, in jedem gezeichneten Bild gemessen:
//   - nie zwei Gochs zugleich, das offene Gespräch ist in jedem Bild zu sehen (kein leerer Zwischenstand),
//   - am Handy gehören großer Goch und großes Fenster zusammen: keine Leiste neben dem sitzenden großen Goch, kein großes Fenster,
//     während er als kleiner unten sitzt oder zurückfliegt,
//   - der Wechsel gleitet (Animation am Fenster), bei reduzierter Bewegung ohne Animation,
//   - Verlauf, angefangener Text und der neueste Satz bleiben; Zittern an der Grenze schaltet nicht hin und her;
//   - am Rechner fliegt der große Goch nach der Rückkehr nicht ein zweites Mal an.
//   Voraussetzungen wie goch_webkit_test.mjs.  node tests/goch_uebergang_webkit_test.mjs http://127.0.0.1:8788/ http://127.0.0.1:8787
import { createRequire } from "node:module";
import { stumm } from "./stumm.mjs";
const [seite = "http://127.0.0.1:8788/", attrappe = "http://127.0.0.1:8787"] = process.argv.slice(2);
let webkit, devices;
try { ({ webkit, devices } = createRequire((process.env.PLAYWRIGHT || process.cwd()) + "/")("playwright-core")); }
catch (_) { console.log("playwright-core nicht gefunden (PLAYWRIGHT=/pfad setzen) – Test übersprungen."); process.exit(0); }
let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FAIL ") + label + (info !== undefined ? " (" + (typeof info === "string" ? info : JSON.stringify(info)) + ")" : "")); if (!ok) fails++; };
const q = "?goch=" + encodeURIComponent(attrappe + "/chat") + "&stimme=an&zwitschertakt=60000&zeit=2026-11-11T12:00";
const b = stumm(await webkit.launch());
const GERAETE = {
  "iPhone 390 × 844": { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
  "Tablet 768 × 1024": { viewport: { width: 768, height: 1024 } },
  "Rechner 1280 × 800": { viewport: { width: 1280, height: 800 } },
};
const MESSER = () => {
  window.__u = { bilder: 0, beide: 0, leer: 0, leisteNebenGross: 0, fensterOhneGross: 0, wechsel: 0, animiert: 0, form: "", anfluege: 0, flugAlt: false };
  const bild = () => {
    requestAnimationFrame(bild);
    const g = document.getElementById("goch"), m = document.getElementById("goch-mini"), s = document.getElementById("scene"), h = document.documentElement;
    if (!g || !m || !s || g.hidden) return;
    __u.bilder++;
    const sr = s.getBoundingClientRect(), gross = sr.bottom > 2 && sr.top < innerHeight - 2 && getComputedStyle(s.querySelector(".bird-move")).visibility !== "hidden";
    const tier = m.querySelector(".goch-mini-tier").getBoundingClientRect();
    const klein = getComputedStyle(m).display !== "none" && tier.width > 0 && tier.bottom > 0 && tier.top < innerHeight && +getComputedStyle(m.querySelector(".goch-mini-tier")).opacity > .05;
    if (gross && klein) __u.beide++;
    const cs = getComputedStyle(g), r = g.getBoundingClientRect();
    if (!(r.width > 0 && r.bottom > 0 && r.top < innerHeight && +cs.opacity > .05 && cs.visibility !== "hidden")) __u.leer++;
    const form = /goch-(unterwegs|zeile)/.test(h.className) ? "klein" : "gross";
    if (__u.form && form !== __u.form) __u.wechsel++;
    __u.form = form;
    if (g.getAnimations().length) __u.animiert++;
    if (innerWidth <= 720) {
      if (form === "klein" && gross && !h.classList.contains("goch-fort") && s.dataset.state === "rest") __u.leisteNebenGross++;
      if (form === "gross" && h.classList.contains("goch-fort")) __u.fensterOhneGross++;
    }
    const fliegt = s.classList.contains("is-flying"); if (fliegt && !__u.flugAlt) __u.anfluege++; __u.flugAlt = fliegt;
  };
  requestAnimationFrame(bild);
};
const rollen = (p, ziel, pxs = 900) => p.evaluate(([z, v]) => new Promise(res => {
  const von = scrollY, dauer = Math.abs(z - von) / v * 1000, t0 = performance.now();
  const s = now => { const k = Math.min(1, (now - t0) / Math.max(1, dauer)); scrollTo(0, Math.round(von + (z - von) * k)); if (k < 1) requestAnimationFrame(s); else res(); };
  requestAnimationFrame(s);
}), [ziel, pxs]);
const stand = p => p.evaluate(() => { const l = document.getElementById("goch-log");
  return { u: { ...(window.__u || {}) }, eintraege: l.children.length, wert: document.getElementById("goch-input").value, unten: Math.round(l.scrollHeight - l.clientHeight - l.scrollTop), offen: !document.getElementById("goch").hidden,
    form: /goch-(unterwegs|zeile)/.test(document.documentElement.className) ? "klein" : "gross", fort: document.documentElement.classList.contains("goch-fort"), y: Math.round(scrollY) }; });

for (const [name, opt] of Object.entries(GERAETE)) for (const ruhig of [false, true]) {
  if (ruhig && !name.startsWith("iPhone")) continue;
  console.log(name + (ruhig ? ", reduzierte Bewegung" : ""));
  const ctx = await b.newContext({ ...opt, reducedMotion: ruhig ? "reduce" : "no-preference" });
  await ctx.addInitScript(() => { try { const at = Date.now(); localStorage.setItem("rjl-goch-consent", JSON.stringify({ allowed: true, at, expires: at + 180 * 864e5, version: "2026-10-16.1" })); } catch (_) {} });
  const p = await ctx.newPage(); const fehler = []; p.on("pageerror", e => fehler.push(String(e).slice(0, 160)));
  await p.goto(seite + q);
  await p.waitForFunction(() => window.GochStimme && window.GochZeigen && window.Goch && document.getElementById("scene").dataset.state === "rest", null, { timeout: 40000 });
  await p.waitForTimeout(800);
  await p.evaluate(() => window.Goch.oeffnen()); await p.waitForTimeout(300);
  for (const frage of ["Was machst du?", "Und was noch?"]) {
    await p.locator("#goch-input").fill(frage); await p.locator("#goch-input").press("Enter");
    await p.waitForFunction(n => document.querySelectorAll("#goch-log .goch-bubble").length >= n && !document.querySelector(".goch-thinking"), frage === "Was machst du?" ? 3 : 5, { timeout: 15000 });
  }
  await p.locator("#goch-input").fill("angefangen"); await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(400);
  const vorher = await stand(p);
  await p.evaluate(MESSER);
  const tief = await p.evaluate(() => Math.round(document.querySelector("#werkzeuge").getBoundingClientRect().top + scrollY));
  await rollen(p, tief); await p.waitForTimeout(2800);
  let s = await stand(p);
  check(s.form === "klein" && s.fort, "unten bei den Werkzeugen: kleiner Goch mit Leiste", { form: s.form, fort: s.fort });
  check(s.u.wechsel === 1, "hinunter genau ein Wechsel des Fensters", s.u.wechsel);
  check(ruhig ? s.u.animiert === 0 : s.u.animiert >= 3, ruhig ? "bei reduzierter Bewegung ohne Animation" : "der Wechsel gleitet (Animation am Fenster)", s.u.animiert);
  await rollen(p, 0); await p.waitForFunction(() => !document.documentElement.classList.contains("goch-fort"), null, { timeout: 6000 }).catch(() => {}); await p.waitForTimeout(1200);
  s = await stand(p);
  check(s.form === "gross" && !s.fort && s.offen, "zurück oben: großer Goch mit großem Fenster", { form: s.form, fort: s.fort });
  check(s.u.wechsel === 2, "hin und zurück genau zwei Wechsel", s.u.wechsel);
  check(s.u.beide === 0, "in keinem gezeichneten Bild zwei Gochs", s.u);
  check(s.u.leer === 0, "das offene Gespräch war in jedem Bild zu sehen (kein leerer Zwischenstand)", s.u.leer);
  if (name.startsWith("iPhone")) {
    check(s.u.leisteNebenGross === 0, "keine Leiste neben dem sitzenden großen Goch", s.u.leisteNebenGross);
    check(s.u.fensterOhneGross === 0, "kein großes Fenster, solange Goch unten sitzt oder zurückfliegt", s.u.fensterOhneGross);
  } else if (!ruhig) check(s.u.anfluege <= 0, "nach der Rückkehr fliegt der große Goch nicht ein zweites Mal an", s.u.anfluege);
  check(s.eintraege === vorher.eintraege && s.wert === "angefangen", "Verlauf und angefangener Text bleiben", { vorher: vorher.eintraege, jetzt: s.eintraege, wert: s.wert });
  check(s.unten <= 4, "das große Fenster zeigt wieder den neuesten Satz", s.unten);
  // Zittern an der Grenze: Wo hinunter gewechselt wird, fünfmal 40 px hin und her – höchstens ein Wechsel
  const grenze = await p.evaluate(() => new Promise(res => { let y = 0; const t = () => { if (/goch-(unterwegs|zeile)/.test(document.documentElement.className) || y > 3000) { res(y); return; } y += 8; scrollTo(0, y); requestAnimationFrame(t); }; t(); }));
  await p.waitForTimeout(300);
  await p.evaluate(() => { __u.wechsel = 0; });
  for (let i = 0; i < 5; i++) { await rollen(p, grenze - 20, 500); await rollen(p, grenze + 20, 500); }
  await p.waitForTimeout(1500);
  s = await stand(p);
  check(s.u.wechsel <= 1, "Zittern um die Grenze (±20 px) schaltet nicht hin und her", { grenze, wechsel: s.u.wechsel });
  // Wer im Fenster schreibt, behält es (Handy): Fokus im Textfeld, über die Übergabe hinaus scrollen – Fenster, Fokus und Text bleiben
  if (name.startsWith("iPhone") && !ruhig) {
    await rollen(p, 0); await p.waitForFunction(() => !document.documentElement.classList.contains("goch-fort") && !/goch-unterwegs/.test(document.documentElement.className), null, { timeout: 6000 }).catch(() => {}); await p.waitForTimeout(800);
    await p.locator("#goch-input").focus(); await p.waitForTimeout(200);
    await rollen(p, grenze + 160); await p.waitForTimeout(900);
    s = await stand(p);
    const fokus = await p.evaluate(() => document.activeElement && document.activeElement.id);
    check(s.form === "gross" && fokus === "goch-input" && s.wert === "angefangen", "beim Schreiben bleibt das Fenster groß, Fokus und Text bleiben", { form: s.form, fokus, wert: s.wert });
    await p.evaluate(() => document.activeElement.blur()); await rollen(p, grenze + 260); await p.waitForTimeout(1500);
    s = await stand(p);
    check(s.form === "klein" && s.fort, "nach dem Schreiben folgt beim Weiterscrollen die Übergabe", { form: s.form, fort: s.fort });
  }
  check(fehler.length === 0, "keine Skriptfehler", fehler);
  await ctx.close();
}
await b.close();
console.log(fails ? `WebKit, Übergang: ${fails} Fehler.` : "WebKit, Übergang: alles in Ordnung.");
process.exit(fails ? 1 : 0);
