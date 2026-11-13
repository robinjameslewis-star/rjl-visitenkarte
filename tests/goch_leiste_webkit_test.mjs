// Gesprächsleiste in WebKit (Playwright) – Robin, 12.11.2026: „Es braucht auch noch so einen verkleinerten Modus für das über
// die Seite scrollen wenn Goch spricht oder Goch hört nicht an sind.“ Eine Leiste für alle drei Lagen (Text, „Goch spricht“,
// „Goch hört“), am Handy und am Rechner: schrumpfen beim Scrollen, beide Schalter in der Leiste, Tipp holt das Fenster mit
// Fokus, X schließt, keine Überlappung mit Goch und Ast, im sichtbaren Bereich (auch mit Leiste des Browsers, ?unten=80),
// nie zwei Gochs. Das Mikrofon ist künstlich, der Worker ist die Attrappe.
//   Voraussetzungen wie goch_webkit_test.mjs.  node tests/goch_leiste_webkit_test.mjs http://127.0.0.1:8788/ http://127.0.0.1:8787
import { createRequire } from "node:module";
import { stumm } from "./stumm.mjs";
const [seite = "http://127.0.0.1:8788/", attrappe = "http://127.0.0.1:8787"] = process.argv.slice(2);
let webkit, devices;
try { ({ webkit, devices } = createRequire((process.env.PLAYWRIGHT || process.cwd()) + "/")("playwright-core")); }
catch (_) { console.log("playwright-core nicht gefunden (PLAYWRIGHT=/pfad setzen) – Test übersprungen."); process.exit(0); }
let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FAIL ") + label + (info !== undefined ? " (" + (typeof info === "string" ? info : JSON.stringify(info)) + ")" : "")); if (!ok) fails++; };
const q = "?goch=" + encodeURIComponent(attrappe + "/chat") + "&stimme=an&zwitschertakt=60000&zeit=2026-11-11T12:00";
await fetch(attrappe + "/_modus?hoeren=ok&stimme=ok");
const b = stumm(await webkit.launch());
async function auf(breit, mehr = "") {
  const ctx = await b.newContext(breit ? { viewport: { width: 1280, height: 800 } } : { ...devices["iPhone 13"], viewport: { width: 390, height: 664 } });
  await ctx.addInitScript(() => {
    const kunst = async () => { const AC = window.AudioContext || window.webkitAudioContext, ac = new AC(); if (ac.state === "suspended") await ac.resume().catch(() => {});
      const osc = ac.createOscillator(), tor = ac.createGain(), ziel = ac.createMediaStreamDestination(); osc.frequency.value = 160; tor.gain.value = 0; osc.connect(tor); tor.connect(ziel); osc.start(); return ziel.stream; };
    try { Object.defineProperty(MediaDevices.prototype, "getUserMedia", { value: kunst, configurable: true, writable: true }); } catch (_) {}
    try { const at = Date.now(); localStorage.setItem("rjl-goch-consent", JSON.stringify({ allowed: true, at, expires: at + 180 * 864e5, version: "2026-10-16.1" })); } catch (_) {}
    // in jedem gezeichneten Bild: zwei Gochs zugleich? Leiste über Goch oder Ast?
    window.__m = { beide: 0, ueber: 0, bilder: 0 };
    const schneidet = (a, c) => a.width && c.width && a.right > c.left + .5 && a.left < c.right - .5 && a.bottom > c.top + .5 && a.top < c.bottom - .5;
    const bild = () => { requestAnimationFrame(bild);
      const m = document.getElementById("goch-mini"), s = document.getElementById("scene"), g = document.getElementById("goch"); if (!m || !s || !g) return;
      __m.bilder++;
      const klein = getComputedStyle(m).display !== "none" && +getComputedStyle(m).opacity > .05, r = s.getBoundingClientRect();
      if (klein && r.bottom > 2 && r.top < innerHeight - 2 && getComputedStyle(document.querySelector("#scene .bird-move")).visibility !== "hidden") __m.beide++;
      if (klein && !g.hidden && /goch-(unterwegs|zeile)/.test(document.documentElement.className)) {
        const l = g.getBoundingClientRect(), t = m.querySelector(".goch-mini-tier").getBoundingClientRect(), a = m.querySelector(".goch-mini-ast").getBoundingClientRect();
        if (!m.dataset.flug && (schneidet(l, t) || schneidet(l, a))) __m.ueber++;
      } };
    requestAnimationFrame(bild);
  });
  const p = await ctx.newPage(); p.fehler = []; p.on("pageerror", e => p.fehler.push(String(e).slice(0, 160)));
  await p.goto(seite + q + mehr);
  await p.waitForFunction(() => window.GochStimme && window.GochZeigen && window.Goch && document.getElementById("scene").dataset.state === "rest", null, { timeout: 40000 });
  await p.evaluate(() => window.Goch.oeffnen()); await p.waitForTimeout(500);
  return { p, ctx };
}
const stand = p => p.evaluate(() => { const g = document.getElementById("goch"), r = g.getBoundingClientRect(), k = id => { const e = document.getElementById(id), q = e.getBoundingClientRect(); return { w: Math.round(q.width), h: Math.round(q.height), an: e.getAttribute("aria-pressed"), name: e.getAttribute("aria-label") }; };
  const ki = document.getElementById("goch-ki"), unten = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--goch-unten")) || 0;
  return { lage: (document.documentElement.className.match(/goch-(unterwegs|zeile|fokus|angeheftet)/g) || []).join(" "), zu: g.hidden, y: Math.round(scrollY), laut: k("goch-l-laut"), mikro: k("goch-l-mikro"),
    imBild: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight - unten + 1, hoehe: Math.round(r.height), ki: getComputedStyle(ki).display !== "none" && /KI|AI/.test(getComputedStyle(ki, "::after").content),
    x: (() => { const c = document.getElementById("goch-close").getBoundingClientRect(); return Math.round(Math.min(c.width, c.height)); })(), zeile: (document.querySelector("#goch-log .goch-bubble:last-of-type") || {}).textContent || "",
    fokus: document.activeElement && document.activeElement.id, frage: !document.getElementById("goch-stimme-consent").hidden, m: { ...window.__m } }; });
const rollen = async (p, y) => { const von = await p.evaluate(() => scrollY), n = Math.max(1, Math.round(Math.abs(y - von) / 60)); for (let i = 1; i <= n; i++) { await p.evaluate(v => scrollTo(0, v), Math.round(von + (y - von) * i / n)); await p.waitForTimeout(40); } };
const klein = s => /goch-unterwegs|goch-zeile/.test(s.lage);

for (const breit of [false, true]) for (const art of ["Text", "Goch spricht", "Goch hört"]) {
  console.log(`${breit ? "Rechner 1280" : "Handy 390"}, ${art}`);
  const { p, ctx } = await auf(breit);
  if (art !== "Text") { await p.locator(art === "Goch hört" ? "#goch-mikro-an" : "#goch-laut").click(); await p.waitForTimeout(400); await p.locator("#goch-stimme-allow").click(); await p.waitForTimeout(1300); }
  let s = await stand(p);
  check(!s.zu && !klein(s), "das Gespräch ist als Fenster offen", s.lage);
  // schrumpfen beim Scrollen
  if (!breit && art !== "Text") { // Vollbild mit Stimme: Ein Wisch neben dem Blatt gibt die Seite frei
    await p.evaluate(() => document.getElementById("goch-papier").dispatchEvent(new WheelEvent("wheel", { deltaY: 120, bubbles: true }))); await p.waitForTimeout(300);
  } else if (!breit) { await rollen(p, 30); await p.waitForTimeout(250); check(!klein(await stand(p)), "nach 30 px ist es noch das Fenster"); }
  await rollen(p, 900); await p.waitForTimeout(2600);
  s = await stand(p);
  check(klein(s) && s.imBild && s.hoehe <= 130, "beim Scrollen wird es zur Leiste, ganz im Fenster", { lage: s.lage, imBild: s.imBild, hoehe: s.hoehe });
  check(s.laut.w >= 44 && s.laut.h >= 44 && s.mikro.w >= 44 && s.mikro.h >= 44 && s.x >= 44, "Lautsprecher, Mikrofon und X sind mindestens 44 × 44 px", { laut: s.laut, mikro: s.mikro, x: s.x });
  check(/Goch/.test(s.laut.name || "") && /Goch/.test(s.mikro.name || "") && s.laut.name !== s.mikro.name, "beide Schalter haben einen Namen", [s.laut.name, s.mikro.name]);
  check(s.laut.an === String(art === "Goch spricht") && s.mikro.an === String(art === "Goch hört"), "die Schalter zeigen die Lage (aria-pressed)", [s.laut.an, s.mikro.an]);
  check(s.ki, "die Kennzeichnung „KI“ bleibt sichtbar");
  check(s.zeile.length > 5, "die letzte Zeile des Gesprächs steht in der Leiste", s.zeile.slice(0, 40));
  // Schalter in der Leiste: wirken sofort, die Leiste und die Stelle der Seite bleiben
  const y0 = s.y;
  await p.locator("#goch-l-laut").click(); await p.waitForTimeout(500);
  s = await stand(p);
  if (art === "Text") { // erstes Mal: Die Einwilligung für die Stimme braucht das Fenster
    check(s.frage && !klein(s), "beim ersten Mal fragt Goch wie bisher (Einwilligung im Fenster)", s.lage);
    await p.locator("#goch-stimme-allow").click(); await p.waitForTimeout(1300); s = await stand(p);
  }
  check(klein(s) && Math.abs(s.y - y0) < 3 && s.laut.an === String(art !== "Goch spricht"), "„Goch spricht“ schaltet in der Leiste um; Leiste und Stelle der Seite bleiben", { lage: s.lage, y: s.y, y0, an: s.laut.an });
  await p.locator("#goch-l-mikro").click(); await p.waitForTimeout(1300);
  s = await stand(p);
  check(klein(s) && Math.abs(s.y - y0) < 3 && s.mikro.an === String(art !== "Goch hört"), "„Goch hört“ schaltet in der Leiste um; Leiste und Stelle der Seite bleiben", { lage: s.lage, y: s.y, an: s.mikro.an });
  check(s.m.ueber === 0, "die Leiste lag in keinem gezeichneten Bild über Goch oder seinem Ast", s.m);
  // beide aus: Die Leiste bleibt auch als reines Text-Gespräch
  if (s.laut.an === "true") { await p.locator("#goch-l-laut").click(); await p.waitForTimeout(400); }
  if ((await stand(p)).mikro.an === "true") { await p.locator("#goch-l-mikro").click(); await p.waitForTimeout(600); }
  s = await stand(p);
  check(klein(s) && s.laut.an === "false" && s.mikro.an === "false" && !s.zu, "sind beide Schalter aus, bleibt die Leiste", s.lage);
  // Tipp auf die Zeile holt das Fenster, Eingabefeld fokussiert
  await p.locator("#goch-log").click({ position: { x: 20, y: 8 } }); await p.waitForTimeout(600);
  s = await stand(p);
  check(!klein(s) && !s.zu && s.fokus === "goch-input", "ein Tipp auf die Zeile holt das Fenster zurück, das Eingabefeld hat den Fokus", { lage: s.lage, fokus: s.fokus });
  // wieder zur Leiste, dann X
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await rollen(p, 1100); await p.waitForTimeout(900);
  s = await stand(p);
  check(klein(s), "beim Weiterscrollen wird es wieder zur Leiste", s.lage);
  if (!breit) { // zurück beim großen Goch: wieder das Fenster
    await rollen(p, 0); await p.waitForTimeout(900); s = await stand(p);
    check(!klein(s) && !s.zu, "zurück ganz oben beim großen Goch ist es wieder das Fenster", s.lage);
    await rollen(p, 700); await p.waitForTimeout(900);
  } else { await rollen(p, 0); await p.waitForFunction(() => !document.documentElement.classList.contains("goch-fort"), null, { timeout: 6000 }).catch(() => {}); await p.waitForTimeout(600); s = await stand(p); check(!klein(s) && !s.zu && !/angeheftet/.test(s.lage), "zurück beim großen Goch hängt das Fenster wieder an seinem Ast", s.lage); await rollen(p, 900); await p.waitForTimeout(1200); }
  await p.locator("#goch-close").click(); await p.waitForTimeout(500);
  s = await stand(p);
  check(s.zu && !klein(s), "X schließt das Gespräch", s.lage);
  check(s.m.beide === 0, "in keinem gezeichneten Bild waren zwei Gochs zu sehen", s.m);
  check(p.fehler.length === 0, "keine Skriptfehler", p.fehler);
  await ctx.close();
}
// „Platz machen“ bei offenem Gespräch (Robin, 12.11.2026): Die Leiste zieht mit Goch nach oben und wird zur Pille neben dem Zweig
for (const breit of [false, true]) {
  console.log(`Platz machen mit Leiste, ${breit ? "Rechner 1280" : "Handy 390"}`);
  const { p, ctx } = await auf(breit);
  await p.locator("#goch-laut").click(); await p.waitForTimeout(400); await p.locator("#goch-stimme-allow").click(); await p.waitForTimeout(1300);
  if (!breit) { await p.evaluate(() => document.getElementById("goch-papier").dispatchEvent(new WheelEvent("wheel", { deltaY: 120, bubbles: true }))); await p.waitForTimeout(300); }
  await rollen(p, 900);
  await p.waitForFunction(() => { const m = document.getElementById("goch-mini"); return getComputedStyle(m).display === "block" && !m.dataset.flug; }, null, { timeout: 8000 }).catch(() => {});
  await p.evaluate(() => document.getElementById("goch-platz").click());
  await p.waitForFunction(() => !document.getElementById("goch-zweig").hidden, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(500);
  const oben = () => p.evaluate(() => { const g = document.getElementById("goch"), r = g.getBoundingClientRect(), z = document.getElementById("goch-zweig"), zr = z.getBoundingClientRect(), m = document.getElementById("goch-mini"), k = document.querySelector("header");
    const kr = k ? k.getBoundingClientRect() : { bottom: 0 }, sichtbar = e => !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0;
    const unten = [g, z, m].filter(e => sichtbar(e) && e.getBoundingClientRect().bottom > innerHeight * .6).length;
    return { pille: sichtbar(g) && !g.hidden, pr: [r.left, r.top, r.right, r.bottom].map(Math.round), hoehe: Math.round(r.height), breite: Math.round(r.width), zweig: !z.hidden, zr: [zr.left, zr.top, zr.right].map(Math.round), neben: Math.abs(r.top - zr.top) < 30 && r.right <= zr.left + 6,
      unten, klein: getComputedStyle(m).display, kopfFrei: r.top >= kr.bottom - 1 || kr.bottom <= 0, zeile: sichtbar(document.getElementById("goch-log")), x: sichtbar(document.getElementById("goch-close")), ki: getComputedStyle(document.getElementById("goch-ki")).display !== "none",
      laut: document.getElementById("goch-l-laut").getAttribute("aria-pressed"), mikro: document.getElementById("goch-l-mikro").getAttribute("aria-pressed"), w: Math.round(document.getElementById("goch-l-laut").getBoundingClientRect().width), y: Math.round(scrollY), m: { ...__m } }; });
  let o = await oben();
  check(o.pille && o.zweig && o.neben && o.pr[1] < 200 && o.hoehe <= 60, "nach „Platz machen“ sitzt oben eine Pille neben dem Zweig", o);
  check(o.unten === 0 && o.klein === "none", "unten bleibt nichts liegen, der kleine Goch ist fort", { unten: o.unten, klein: o.klein });
  check(!o.zeile && !o.x && o.ki && o.w >= 44, "die Pille trägt Lautsprecher, Mikrofon und „KI“, keine Textzeile", { zeile: o.zeile, x: o.x, ki: o.ki, w: o.w });
  check(o.kopfFrei, "sie liegt unter der Kopfleiste, nicht darüber", o.pr);
  const y0 = o.y, laut0 = o.laut;
  await p.locator("#goch-l-laut").click(); await p.waitForTimeout(500);
  await p.locator("#goch-l-mikro").click(); await p.waitForTimeout(1300);
  o = await oben();
  check(o.pille && o.laut !== laut0 && o.mikro === "true" && Math.abs(o.y - y0) < 3, "die Schalter wirken in der Pille; Pille und Stelle der Seite bleiben", { laut: o.laut, mikro: o.mikro, y: o.y });
  await rollen(p, 1400); await p.waitForTimeout(600);
  o = await oben();
  check(o.pille && o.zweig && o.mikro === "true", "beim Weiterlesen bleiben Pille und Zweig oben, das Mikrofon bleibt offen", o.pr);
  await p.locator("#goch-ki").click(); // Tipp auf die Pille (nicht auf einen Schalter)
  await p.waitForFunction(() => { const m = document.getElementById("goch-mini"); return getComputedStyle(m).display === "block" && !m.dataset.flug; }, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(400);
  const s = await stand(p), u = await oben();
  check(klein(s) && !s.zu && u.klein === "block" && !u.zweig && u.pr[3] > 400 && u.zeile, "ein Tipp auf die Pille holt Goch und die Leiste zurück nach unten", { lage: s.lage, klein: u.klein, zweig: u.zweig, pr: u.pr });
  check(s.m.beide === 0 && s.m.ueber === 0, "dabei nie zwei Gochs, die Leiste nie über Goch oder Ast", s.m);
  check(p.fehler.length === 0, "keine Skriptfehler", p.fehler);
  await ctx.close();
}
// Leiste des Browsers am unteren Rand (Safari): Die Leiste rückt darüber
for (const unten of [0, 80]) {
  const { p, ctx } = await auf(false, "&unten=" + unten);
  await rollen(p, 700); await p.waitForTimeout(2200);
  const r = await p.evaluate(() => { const g = document.getElementById("goch").getBoundingClientRect(), a = document.querySelector("#goch-mini .goch-mini-ast").getBoundingClientRect(); return { leisteUnten: Math.round(innerHeight - g.bottom), astUnten: Math.round(innerHeight - a.bottom) }; });
  check(r.leisteUnten >= unten + 8 && r.astUnten >= unten, `mit ${unten} px Leiste des Browsers bleiben Gesprächsleiste und Ast darüber`, r);
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} FEHLER` : "\nWebKit, Gesprächsleiste: alles in Ordnung.");
process.exit(fails ? 1 : 0);
