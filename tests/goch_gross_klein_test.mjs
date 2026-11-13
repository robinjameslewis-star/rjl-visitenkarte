// Groß ↔ Klein im Gespräch mit Goch – Robin, 13.11.2026 (Safari am Mac, 1470 px): „hier könnte wenn goch spricht und goch
// hört an ist auch nur das kleine fenster kommen anstatt dem großen chatfenster. dann sieht man die burg. es sollte leichter
// sein zwischen großem chatfenster und kleinem fenster für das gespräch mit goch umzuschalten“.
// Geprüft in WebKit und Chrome, am Rechner (1470 px) und am Handy (390, 375, 360 px): ein Umschalter links neben dem X in
// beiden Formen, ein Tipp je Richtung; am Rechner die kleine Form auch bei der Bühne (ohne kleinen Goch), von selbst klein,
// sobald „Goch hört“ und „Goch spricht“ beide an sind; „Groß“ bleibt danach groß; die Einwilligung für die Stimme bekommt
// ihr Fenster; nie zwei Gochs; alle Tasten der Kapsel ganz im Bild. Das Mikrofon ist künstlich, der Worker ist die Attrappe.
//   Voraussetzungen wie goch_webkit_test.mjs.  node tests/goch_gross_klein_test.mjs http://127.0.0.1:8788/ http://127.0.0.1:8787
import { createRequire } from "node:module";
import { stumm } from "./stumm.mjs";
const [seite = "http://127.0.0.1:8788/", attrappe = "http://127.0.0.1:8787"] = process.argv.slice(2);
let webkit, chromium, devices;
try { ({ webkit, chromium, devices } = createRequire((process.env.PLAYWRIGHT || process.cwd()) + "/")("playwright-core")); }
catch (_) { console.log("playwright-core nicht gefunden (PLAYWRIGHT=/pfad setzen) – Test übersprungen."); process.exit(0); }
let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FAIL ") + label + (info !== undefined ? " (" + (typeof info === "string" ? info : JSON.stringify(info)) + ")" : "")); if (!ok) fails++; };
const q = "?goch=" + encodeURIComponent(attrappe + "/chat") + "&stimme=an&zwitschertakt=60000&zeit=2026-11-11T12:00";
await fetch(attrappe + "/_modus?hoeren=ok&stimme=ok");

async function reihe(name, b, handy) {
  async function auf(breite, { pfad = "" } = {}) {
    const ctx = await b.newContext(breite > 720 ? { viewport: { width: breite, height: 840 } } : handy(breite));
    await ctx.addInitScript(() => {
      const kunst = async () => { const AC = window.AudioContext || window.webkitAudioContext, ac = new AC(); if (ac.state === "suspended") await ac.resume().catch(() => {});
        const osc = ac.createOscillator(), tor = ac.createGain(), ziel = ac.createMediaStreamDestination(); osc.frequency.value = 160; tor.gain.value = 0; osc.connect(tor); tor.connect(ziel); osc.start(); return ziel.stream; };
      try { Object.defineProperty(MediaDevices.prototype, "getUserMedia", { value: kunst, configurable: true, writable: true }); } catch (_) {}
      try { const at = Date.now(); localStorage.setItem("rjl-goch-consent", JSON.stringify({ allowed: true, at, expires: at + 180 * 864e5, version: "2026-10-16.1" })); } catch (_) {}
      window.__m = { beide: 0, ueber: 0 }; // in jedem gezeichneten Bild: zwei Gochs zugleich? Leiste über Goch oder Ast?
      const schneidet = (a, c) => a.width && c.width && a.right > c.left + .5 && a.left < c.right - .5 && a.bottom > c.top + .5 && a.top < c.bottom - .5;
      const bild = () => { requestAnimationFrame(bild);
        const m = document.getElementById("goch-mini"), s = document.getElementById("scene"), g = document.getElementById("goch"); if (!m || !s || !g) return;
        const klein = getComputedStyle(m).display !== "none" && +getComputedStyle(m).opacity > .05, r = s.getBoundingClientRect();
        if (klein && r.bottom > 2 && r.top < innerHeight - 2 && getComputedStyle(document.querySelector("#scene .bird-move")).visibility !== "hidden") __m.beide++;
        if (klein && !g.hidden && /goch-(unterwegs|zeile)/.test(document.documentElement.className)) {
          const l = g.getBoundingClientRect(), t = m.querySelector(".goch-mini-tier").getBoundingClientRect(), a = m.querySelector(".goch-mini-ast").getBoundingClientRect();
          if (!m.dataset.flug && (schneidet(l, t) || schneidet(l, a))) __m.ueber++;
        } };
      requestAnimationFrame(bild);
    });
    const p = await ctx.newPage(); p.fehler = []; p.on("pageerror", e => p.fehler.push(String(e).slice(0, 160)));
    await p.goto(seite + pfad + q);
    await p.waitForFunction(() => window.GochStimme && window.GochZeigen && window.Goch && document.getElementById("scene") && document.getElementById("scene").dataset.state === "rest" && document.getElementById("goch-gross-klein"), null, { timeout: 40000 });
    await p.evaluate(() => window.Goch.oeffnen()); await p.waitForTimeout(600);
    return { p, ctx };
  }
  const stand = p => p.evaluate(() => {
    const g = document.getElementById("goch"), r = g.getBoundingClientRect(), d = document.documentElement, um = document.getElementById("goch-gross-klein"), x = document.getElementById("goch-close");
    const u = um.getBoundingClientRect(), c = x.getBoundingClientRect(), m = document.getElementById("goch-mini"), s = document.getElementById("scene").getBoundingClientRect();
    const zu = e => { const q = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && q.width > 0; };
    const drin = q => q.width > 0 && q.left >= r.left - .5 && q.right <= r.right + .5 && q.top >= r.top - .5 && q.bottom <= r.bottom + .5 && q.left >= 0 && q.top >= 0 && q.right <= innerWidth + .5 && q.bottom <= innerHeight + .5;
    const oben = (e, q) => { const t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!t && (t === e || e.contains(t)); };
    const tasten = ["goch-l-laut", "goch-l-mikro", "goch-gross-klein", "goch-close"].map(id => { const e = document.getElementById(id), q = e.getBoundingClientRect(); return { id, w: Math.round(q.width), h: Math.round(q.height), drin: drin(q), oben: zu(e) && oben(e, q) }; });
    return { klasse: (d.className.match(/goch-(unterwegs|zeile-frei|zeile|fokus|angeheftet|oben)\b/g) || []).join(" "), zu: g.hidden, y: Math.round(scrollY),
      klein: /goch-unterwegs|goch-zeile/.test(d.className), fokus: d.classList.contains("goch-fokus"), amAst: !d.classList.contains("goch-angeheftet") && g.parentNode !== document.body,
      um: { da: zu(um), text: um.textContent.trim(), name: um.getAttribute("aria-label"), zuX: Math.round(c.left - u.right), mitte: Math.abs((u.top + u.height / 2) - (c.top + c.height / 2)) < 8, w: Math.round(u.width), h: Math.round(u.height), drin: drin(u), oben: zu(um) && oben(um, u), eckeX: Math.round(r.right - u.right) },
      tasten, feld: zu(document.getElementById("goch-input")), blasen: [...document.querySelectorAll("#goch-log .goch-bubble")].filter(zu).length,
      ki: getComputedStyle(document.getElementById("goch-ki")).display !== "none", frage: !document.getElementById("goch-stimme-consent").hidden,
      aktiv: document.activeElement && document.activeElement.id, laut: document.getElementById("goch-laut").getAttribute("aria-pressed"), mikro: document.getElementById("goch-mikro-an").getAttribute("aria-pressed"),
      lMikro: document.getElementById("goch-l-mikro").getAttribute("aria-pressed"),
      mini: getComputedStyle(m).display !== "none" && +getComputedStyle(m).opacity > .05, gross: s.bottom > 2 && s.top < innerHeight - 2 && !document.getElementById("scene").classList.contains("goch-fort"),
      r: [r.left, r.top, r.right, r.bottom].map(Math.round), imBild: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, hoehe: Math.round(r.height),
      ueberGoch: r.right > s.left && r.left < s.right && r.bottom > s.top && r.top < s.bottom, vh: innerHeight, m: { ...window.__m } }; });
  const um = async p => { await p.locator("#goch-gross-klein").click(); await p.waitForTimeout(700); return stand(p); };
  const stimme = async (p, was) => { for (const id of was) { await p.locator(id).click(); await p.waitForTimeout(450); if (await p.locator("#goch-stimme-allow").isVisible()) await p.locator("#goch-stimme-allow").click(); await p.waitForTimeout(1200); } };
  const rollen = async (p, y) => { const von = await p.evaluate(() => scrollY), n = Math.max(1, Math.round(Math.abs(y - von) / 60)); for (let i = 1; i <= n; i++) { await p.evaluate(v => scrollTo(0, v), Math.round(von + (y - von) * i / n)); await p.waitForTimeout(16); } };
  const fragen = async p => { await p.evaluate(() => window.Goch.ask("Was gibt's Neues?")); await p.waitForTimeout(2200); };

  // ---------- Rechner ----------
  console.log(`${name}, Rechner 1470: Umschalter im Text-Gespräch`);
  { const { p, ctx } = await auf(1470);
    await fragen(p);
    let s = await stand(p);
    check(!s.klein && s.amAst && s.um.da && s.um.text === "Klein" && /Kleines Fenster/.test(s.um.name), "im großen Fenster steht der Umschalter „Klein“", s.um);
    check(s.um.zuX >= 0 && s.um.zuX <= 16 && s.um.mitte && s.um.oben, "er sitzt links neben dem X, auf dessen Höhe", s.um);
    const eckeGross = s.um.eckeX;
    s = await um(p);
    check(s.klein && s.y === 0 && s.gross && !s.mini, "ein Tipp: kleine Form, an Ort und Stelle bei der Bühne, ohne kleinen Goch", { klasse: s.klasse, y: s.y, mini: s.mini });
    check(s.imBild && s.hoehe <= 80 && s.r[1] > s.vh * .8 && !s.ueberGoch && /zeile-frei/.test(s.klasse), "die Leiste liegt unten rechts am Rand, Goch und die Burg sind frei", { r: s.r, hoehe: s.hoehe });
    check(!s.feld && s.blasen === 1 && s.ki, "sie zeigt die letzte Zeile und „KI“, Textfeld und Verlauf sind eingeklappt", { feld: s.feld, blasen: s.blasen });
    check(s.um.da && s.um.text === "Groß" && /Großes Fenster/.test(s.um.name) && s.um.zuX >= 0 && s.um.zuX <= 16 && s.um.mitte && s.um.oben && s.um.h >= 44, "in der Leiste steht „Groß“ an derselben Stelle: links neben dem X", s.um);
    check(Math.abs(s.um.eckeX - eckeGross) <= 24, "Abstand zur rechten Kante des Fensters in beiden Formen gleich (±24 px)", [eckeGross, s.um.eckeX]);
    check(s.tasten.every(t => t.drin && t.oben && t.h >= 44), "alle Tasten der Leiste sind ganz im Bild und bedienbar", s.tasten);
    await p.setViewportSize({ width: 1470, height: 700 }); await p.waitForTimeout(400); await p.setViewportSize({ width: 1470, height: 840 }); await p.waitForTimeout(500);
    s = await stand(p);
    check(s.klein && !s.mini, "die kleine Form bleibt nach einer Größenänderung des Fensters", s.klasse);
    // hinunter: Goch fliegt auf den kleinen Ast neben die Leiste; hinauf: Die Leiste bleibt klein
    await rollen(p, 900); await p.waitForTimeout(3200);
    s = await stand(p);
    check(s.klein && s.mini && !/zeile-frei/.test(s.klasse) && s.imBild, "beim Scrollen bleibt die Leiste, der kleine Goch setzt sich daneben", s.klasse);
    await rollen(p, 0); await p.waitForTimeout(3600);
    s = await stand(p);
    check(s.klein && !s.mini && s.gross && /zeile-frei/.test(s.klasse), "zurück oben: weiter klein (gewählt ist gewählt), der große Goch sitzt wieder", s.klasse);
    check(s.m.beide === 0 && s.m.ueber === 0, "in keinem Bild zwei Gochs, die Leiste nie über Goch oder Ast", s.m);
    s = await um(p);
    check(!s.klein && s.amAst && s.feld && s.blasen >= 3 && s.um.text === "Klein", "ein Tipp auf „Groß“: das Fenster hängt wieder an Gochs Ast, mit Verlauf und Textfeld", { klasse: s.klasse, blasen: s.blasen });
    check(s.aktiv !== "goch-input", "der Umschalter setzt den Fokus nicht ins Textfeld");
    // Tipp auf den Text der Leiste holt das Fenster ebenfalls
    s = await um(p);
    await p.locator("#goch-log").click({ position: { x: 20, y: 8 } }); await p.waitForTimeout(600);
    s = await stand(p);
    check(!s.klein && s.amAst, "auch ein Tipp auf die Zeile der Leiste holt das Fenster an den Ast", s.klasse);
    // X: Das nächste Gespräch beginnt wieder groß
    await um(p); await p.locator("#goch-close").click(); await p.waitForTimeout(500);
    await p.evaluate(() => window.Goch.oeffnen()); await p.waitForTimeout(700);
    s = await stand(p);
    check(!s.zu && !s.klein && s.amAst, "nach X und erneutem Öffnen ist das Gespräch wieder das große Fenster", s.klasse);
    check(!p.fehler.length, "keine Skriptfehler", p.fehler);
    await ctx.close(); }

  console.log(`${name}, Rechner 1470: „Goch hört“ und „Goch spricht“`);
  { const { p, ctx } = await auf(1470);
    // Robins Weg: Frage tippen, mit Enter senden (der Fokus bleibt im Textfeld), dann beide Schalter
    await p.locator("#goch-input").click(); await p.keyboard.type("Was gibt's Neues?"); await p.keyboard.press("Enter"); await p.waitForTimeout(2200);
    check(await p.evaluate(() => document.activeElement && document.activeElement.id) === "goch-input", "nach Enter steht der Fokus noch im Textfeld");
    await stimme(p, ["#goch-mikro-an"]);
    let s = await stand(p);
    check(!s.klein && s.mikro === "true", "nur „Goch hört“: Das Fenster bleibt groß", s.klasse);
    await stimme(p, ["#goch-laut"]);
    s = await stand(p);
    check(s.klein && s.laut === "true" && s.mikro === "true" && !s.mini && s.gross && !s.ueberGoch && s.r[1] > s.vh * .8, "beide an: von selbst die kleine Form, die Bühne ist frei", { klasse: s.klasse, r: s.r });
    check(s.lMikro === "true" && s.tasten[1].oben && s.ki, "das offene Mikrofon ist in der Leiste angezeigt, „KI“ steht da", s.tasten[1]);
    s = await um(p);
    check(!s.klein && s.amAst && s.laut === "true" && s.mikro === "true", "„Groß“ holt das Fenster, beide Schalter bleiben an", s.klasse);
    await fragen(p);
    await rollen(p, 30); await p.waitForTimeout(300);
    await p.setViewportSize({ width: 1400, height: 800 }); await p.waitForTimeout(400); await p.setViewportSize({ width: 1470, height: 840 }); await p.waitForTimeout(600);
    s = await stand(p);
    check(!s.klein, "es bleibt groß: nach einer Antwort, 30 px Scrollen und einer Größenänderung", s.klasse);
    await rollen(p, 0);
    await p.locator("#goch-laut").click(); await p.waitForTimeout(700); await p.locator("#goch-laut").click(); await p.waitForTimeout(1200);
    s = await stand(p);
    check(!s.klein && s.laut === "true", "wer „Groß“ gewählt hat, behält das Fenster auch beim erneuten Einschalten", s.klasse);
    check(s.m.beide === 0, "in keinem Bild zwei Gochs", s.m);
    check(!p.fehler.length, "keine Skriptfehler", p.fehler);
    await ctx.close(); }

  console.log(`${name}, Rechner 1470: „Groß“ bei halb gescrollter Bühne`);
  { const { p, ctx } = await auf(1470);
    await fragen(p);
    let s = await um(p);
    await rollen(p, 90); await p.waitForTimeout(500);
    s = await um(p); await p.waitForTimeout(900); s = await stand(p);
    check(!s.klein && s.um.drin && s.tasten[3].drin, "90 px gescrollt: Das große Fenster ist mit Umschalter und X ganz im Bild", { y: s.y, r: s.r });
    // Goch spricht gerade (er fliegt dann nicht hinunter), die Bühne ist halb aus dem Bild
    await um(p);
    await p.evaluate(() => { const sz = document.getElementById("scene"); window.__halt = new MutationObserver(() => { if (sz.dataset.state !== "talk") sz.dataset.state = "talk"; }); sz.dataset.state = "talk"; window.__halt.observe(sz, { attributes: true, attributeFilter: ["data-state"] }); });
    await rollen(p, 300); await p.waitForTimeout(700);
    s = await stand(p);
    if (s.klein && s.gross && !s.mini) {
      s = await um(p); await p.waitForTimeout(1200); s = await stand(p);
      check(!s.klein && s.um.drin && s.tasten[3].drin && s.feld, "300 px gescrollt, Goch noch oben: „Groß“ zeigt das Fenster mit Umschalter und X im Bild", { y: s.y, r: s.r, klasse: s.klasse });
    } else console.log("  –    Lage „halb gescrollt, Goch oben“ ließ sich nicht herstellen", s.klasse);
    await p.evaluate(() => window.__halt.disconnect());
    check(s.m.beide === 0 && !p.fehler.length, "nie zwei Gochs, keine Skriptfehler", [s.m, p.fehler]);
    await ctx.close(); }

  console.log(`${name}, Rechner 1470: Einwilligung für die Stimme aus der kleinen Form`);
  { const { p, ctx } = await auf(1470);
    await fragen(p);
    let s = await um(p);
    await p.locator("#goch-l-mikro").click(); await p.waitForTimeout(600);
    s = await stand(p);
    check(s.frage && !s.klein && await p.locator("#goch-stimme-allow").isVisible(), "die Frage nach der Einwilligung bekommt das Fenster", s.klasse);
    await p.locator("#goch-stimme-allow").click(); await p.waitForTimeout(1400);
    s = await stand(p);
    check(!s.frage && s.klein && s.lMikro === "true", "danach steht wieder die kleine Form, „Goch hört“ ist an", s.klasse);
    await ctx.close(); }

  console.log(`${name}, Rechner 1470: Unterseite Werkzeuge`);
  { const { p, ctx } = await auf(1470, { pfad: "werkzeuge/" });
    await fragen(p);
    let s = await stand(p);
    check(!s.klein && s.um.da && s.um.text === "Klein" && s.um.oben, "auch dort steht der Umschalter im Fenster", s.um);
    s = await um(p);
    check(s.klein && !s.mini && s.imBild && s.um.text === "Groß" && s.um.oben, "klein: Leiste ohne kleinen Goch", s.klasse);
    s = await um(p);
    check(!s.klein && s.feld, "und wieder groß", s.klasse);
    check(s.m.beide === 0 && !p.fehler.length, "nie zwei Gochs, keine Skriptfehler", [s.m, p.fehler]);
    await ctx.close(); }

  // ---------- Handy ----------
  for (const breite of [390, 375, 360]) {
    console.log(`${name}, Handy ${breite}: Umschalter`);
    const { p, ctx } = await auf(breite);
    await fragen(p);
    let s = await stand(p);
    check(!s.klein && s.um.da && s.um.text === "Klein" && s.um.zuX >= 0 && s.um.zuX <= 16 && s.um.oben && s.um.h >= 32, "im Fenster steht „Klein“ links neben dem X", s.um);
    s = await um(p);
    check(s.klein && s.imBild && s.y === 0, "ein Tipp: Kapsel, die Seite bleibt an ihrer Stelle", { klasse: s.klasse, y: s.y });
    check(s.tasten.every(t => t.drin && t.oben && t.w >= 44 && t.h >= 44), "Lautsprecher, Mikrofon, „Groß“ und X: je 44 × 44 px, ganz im Bild, nichts verdeckt", s.tasten);
    check(s.um.zuX >= 0 && s.um.zuX <= 16 && s.um.mitte && /Großes Fenster/.test(s.um.name) && s.ki && s.blasen === 1, "„Groß“ sitzt links neben dem X, „KI“ und die letzte Zeile stehen da", s.um);
    s = await um(p);
    check(!s.klein && s.feld && s.aktiv !== "goch-input", "ein Tipp: wieder das Fenster, ohne Tastatur", s.klasse);
    if (breite === 390) {
      await stimme(p, ["#goch-mikro-an", "#goch-laut"]);
      s = await stand(p);
      check(s.fokus && s.laut === "true" && s.mikro === "true", "beide an: Am Handy bleibt Goch groß (Vollbild wie bisher)", s.klasse);
      await p.evaluate(() => scrollTo(0, 0));
      s = await um(p);
      check(s.klein && !s.fokus && s.lMikro === "true" && s.tasten.every(t => t.drin && t.oben), "„Klein“ gibt die Seite frei, das offene Mikrofon bleibt angezeigt", s.klasse);
      s = await um(p);
      check(s.fokus, "„Groß“ holt Goch wieder groß", s.klasse);
      // „Platz machen“: In der Pille oben gibt es keinen Umschalter
      await um(p); await rollen(p, 900); await p.waitForTimeout(2600);
      await p.evaluate(() => document.getElementById("goch-platz").click()); await p.waitForTimeout(3200);
      s = await stand(p);
      check(/goch-oben/.test(s.klasse) && !s.um.da, "nach „Platz machen“ trägt die Pille keinen Umschalter", s.klasse);
    }
    check(s.m.beide === 0 && s.m.ueber === 0, "nie zwei Gochs, die Kapsel nie über Goch oder Ast", s.m);
    check(!p.fehler.length, "keine Skriptfehler", p.fehler);
    await ctx.close();
  }
}

const iphone = breite => ({ ...devices["iPhone 13"], viewport: { width: breite, height: 664 } });
const androide = breite => ({ viewport: { width: breite, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
{ const b = stumm(await webkit.launch()); await reihe("WebKit", b, iphone); await b.close(); }
try { const b = stumm(await chromium.launch({ channel: "chrome" })); await reihe("Chrome", b, androide); await b.close(); }
catch (e) { if (/executable|channel|install/i.test(String(e))) console.log("  –    Chrome nicht gefunden, dort übersprungen."); else { check(false, "Chrome-Lauf", String(e).slice(0, 300)); } }
console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nalle Prüfungen bestanden");
process.exit(fails ? 1 : 0);
