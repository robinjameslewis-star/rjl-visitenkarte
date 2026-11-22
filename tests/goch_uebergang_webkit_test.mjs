// Großes und kleines Gesprächsfenster in WebKit (Playwright) – Robin, 22.11.2026: „Wenn einmal in das kleine Fenster gewechselt wurde,
// durch Scrollen oder durch Aktivieren des Gesprächsmodus, soll es im kleinen Fenster bleiben, bis man durch Klick auf das Fenster
// wieder in das große wechselt … auch beim großen Goch.“ – „vor allem auf dem iPhone nimmt das große Fenster sonst zu viel Platz ein.“
//   Handy: öffnet klein → Tipp darauf: groß, Eingabefeld hat den Fokus → schreiben, senden (bleibt groß) → scrollen: klein →
//   hinunter und ganz nach oben: bleibt klein, großer Goch auf dem Ast, kein kleiner Goch dazu, die Knöpfe der Bühne frei → Tipp: groß →
//   Knopf „Verkleinern“: klein → Tipp: groß → „Goch hört“: klein. Tipps auf die Schalter der Leiste wechseln nicht.
//   Tablet und Rechner: öffnet groß bei Goch → Knopf „Verkleinern“: klein → hinunter und wieder hinauf: bleibt klein → Klick: groß.
//   In jedem gezeichneten Bild: nie zwei Gochs, das offene Gespräch ist zu sehen; der Wechsel gleitet (bei reduzierter Bewegung
//   nicht); Verlauf, angefangener Text und der neueste Satz bleiben.
//   Voraussetzungen wie goch_webkit_test.mjs.  node tests/goch_uebergang_webkit_test.mjs http://127.0.0.1:8788/ http://127.0.0.1:8787
import { createRequire } from "node:module";
import { stumm } from "./stumm.mjs";
import { readFileSync } from "node:fs";
const [seite = "http://127.0.0.1:8788/", attrappe = "http://127.0.0.1:8787"] = process.argv.slice(2);
let webkit, devices;
try { ({ webkit, devices } = createRequire((process.env.PLAYWRIGHT || process.cwd()) + "/")("playwright-core")); }
catch (_) { console.log("playwright-core nicht gefunden (PLAYWRIGHT=/pfad setzen) – Test übersprungen."); process.exit(0); }
let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FAIL ") + label + (info !== undefined ? " (" + (typeof info === "string" ? info : JSON.stringify(info)) + ")" : "")); if (!ok) fails++; };
const q = "?goch=" + encodeURIComponent(attrappe + "/chat") + "&stimme=an&zwitschertakt=60000&zeit=2026-11-11T12:00";
// Liefert der Prüfserver denselben Stand wie dieser Ordner? (22.11.2026: Ein Server aus einer älteren Arbeitskopie ließ den Test rot
// werden, obwohl die Seite stimmte.) Sonst klar abbrechen statt Fehler zu melden, die nicht zu dieser Seite gehören.
{ const hier = readFileSync(new URL("../index.html", import.meta.url), "utf8"), dort = await (await fetch(seite + "index.html")).text();
  if (hier !== dort) { console.log("  FAIL Der Prüfserver unter " + seite + " liefert eine andere index.html als dieser Ordner – Server im Ordner dieses Tests starten."); process.exit(1); } }
await fetch(attrappe + "/_modus?hoeren=ok&stimme=ok");
const b = stumm(await webkit.launch());
const GERAETE = {
  "iPhone 390 × 844": { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
  "Tablet 768 × 1024": { viewport: { width: 768, height: 1024 } },
  "Rechner 1280 × 800": { viewport: { width: 1280, height: 800 } },
};
const MESSER = () => {
  window.__u = { bilder: 0, beide: 0, leer: 0, wechsel: 0, animiert: 0, form: "" };
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
  };
  requestAnimationFrame(bild);
};
const rollen = (p, ziel, pxs = 900) => p.evaluate(([z, v]) => new Promise(res => {
  const von = scrollY, dauer = Math.abs(z - von) / v * 1000, t0 = performance.now();
  const s = now => { const k = Math.min(1, (now - t0) / Math.max(1, dauer)); scrollTo(0, Math.round(von + (z - von) * k)); if (k < 1) requestAnimationFrame(s); else res(); };
  requestAnimationFrame(s);
}), [ziel, pxs]);
const stand = p => p.evaluate(() => { const l = document.getElementById("goch-log"), h = document.documentElement;
  return { u: { ...(window.__u || {}) }, eintraege: l.children.length, wert: document.getElementById("goch-input").value, unten: Math.round(l.scrollHeight - l.clientHeight - l.scrollTop), offen: !document.getElementById("goch").hidden,
    form: /goch-(unterwegs|zeile)/.test(h.className) ? "klein" : "gross", fokusLage: h.classList.contains("goch-fokus"), fort: h.classList.contains("goch-fort"), y: Math.round(scrollY), fokus: document.activeElement && document.activeElement.id }; });
// kleines Fenster antippen: auf seine Fläche (die letzte Zeile), nicht auf Knöpfe – mit echtem Tipp, damit iOS die Tastatur öffnen dürfte
const antippen = async p => { const r = await p.evaluate(() => { const e = document.querySelector("#goch-log > :last-child") || document.getElementById("goch-log"), q = e.getBoundingClientRect(); return { x: q.left + Math.min(30, q.width / 2), y: q.top + q.height / 2 }; }); await p.mouse.click(r.x, r.y); };
const umschalten = async p => { await p.waitForTimeout(450); return stand(p); };

for (const [name, opt] of Object.entries(GERAETE)) for (const ruhig of [false, true]) {
  const handy = name.startsWith("iPhone");
  if (ruhig && !handy) continue;
  console.log(name + (ruhig ? ", reduzierte Bewegung" : ""));
  const ctx = await b.newContext({ ...opt, reducedMotion: ruhig ? "reduce" : "no-preference" });
  await ctx.addInitScript(() => {
    try { const at = Date.now(); localStorage.setItem("rjl-goch-consent", JSON.stringify({ allowed: true, at, expires: at + 180 * 864e5, version: "2026-10-16.1" })); } catch (_) {}
    const kunst = async () => { const AC = window.AudioContext || window.webkitAudioContext, ac = new AC(); if (ac.state === "suspended") await ac.resume().catch(() => {}); const osc = ac.createOscillator(), tor = ac.createGain(), ziel = ac.createMediaStreamDestination(); tor.gain.value = 0; osc.connect(tor); tor.connect(ziel); osc.start(); return ziel.stream; };
    try { Object.defineProperty(MediaDevices.prototype, "getUserMedia", { value: kunst, configurable: true, writable: true }); } catch (_) {}
  });
  const p = await ctx.newPage(); const fehler = []; p.on("pageerror", e => fehler.push(String(e).slice(0, 160)));
  await p.goto(seite + q);
  await p.waitForFunction(() => window.GochStimme && window.GochZeigen && window.Goch && document.getElementById("scene").dataset.state === "rest", null, { timeout: 40000 });
  await p.waitForTimeout(800);
  await p.evaluate(MESSER);
  await p.evaluate(() => document.getElementById("scene").click()); // Tipp auf den großen Goch öffnet das Gespräch
  let s = await umschalten(p);
  if (!s.offen) { await p.evaluate(() => window.Goch.oeffnen()); s = await umschalten(p); }
  if (handy) {
    check(s.offen && s.form === "klein" && s.fokus !== "goch-input", "das Gespräch öffnet am Handy als kleines Fenster, ohne Tastatur", { form: s.form, fokus: s.fokus });
    const frei = await p.evaluate(() => { const g = document.getElementById("goch").getBoundingClientRect(), hin = document.querySelector(".goch-l-hinweis"), hr = hin.getBoundingClientRect();
      const knoepfe = [...document.querySelectorAll(".intro .cta a, .intro .cta button")].filter(k => k.getBoundingClientRect().width);
      const vogel = document.querySelector("#scene .bird-rest").getBoundingClientRect(), ueber = (a, c) => a.right > c.left && a.left < c.right && a.bottom > c.top && a.top < c.bottom;
      return { knoepfe: knoepfe.length, verdeckt: knoepfe.filter(k => ueber(g, k.getBoundingClientRect())).length, vogel: ueber(g, vogel), hinweis: hr.width > 0 ? hin.textContent : "" }; });
    check(frei.knoepfe >= 2 && frei.verdeckt === 0 && !frei.vogel, "das kleine Fenster verdeckt weder Goch noch die Knöpfe der Bühne", frei);
    check(/schreiben/i.test(frei.hinweis), "das kleine Fenster zeigt „Hier mit Goch schreiben“", frei.hinweis);
    await antippen(p); s = await umschalten(p);
    check(s.form === "gross" && s.fokus === "goch-input", "ein Tipp darauf öffnet das große Fenster, das Eingabefeld hat den Fokus", { form: s.form, fokus: s.fokus });
  } else check(s.offen && s.form === "gross", "das Gespräch öffnet am Rechner groß bei Goch", s.form);
  // schreiben und senden: bleibt groß
  for (const [frage, n] of [["Was machst du?", 3], ["Und was noch?", 5]]) {
    await p.locator("#goch-input").fill(frage); await p.locator("#goch-send").click();
    await p.waitForFunction(n => document.querySelectorAll("#goch-log .goch-bubble").length >= n && !document.querySelector(".goch-thinking"), n, { timeout: 15000 });
  }
  await p.locator("#goch-input").fill("angefangen");
  s = await stand(p);
  check(s.form === "gross", "Schreiben, Senden und Tippen ins Eingabefeld lassen es groß", s.form);
  if (handy) { await rollen(p, 120); s = await umschalten(p); check(s.form === "gross" && s.fokus === "goch-input", "solange im Textfeld geschrieben wird, bleibt es beim Scrollen groß", { form: s.form, fokus: s.fokus }); await rollen(p, 0); await p.waitForTimeout(300); }
  await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(200);
  const vorher = await stand(p);
  await p.evaluate(() => { __u.wechsel = 0; __u.animiert = 0; });
  // groß → klein: am Handy durch Scrollen, am Rechner durch den Knopf
  if (handy) { await rollen(p, 160); s = await umschalten(p); check(s.form === "klein", "Scrollen macht das große Fenster klein", s.form); }
  else { await p.locator("#goch-verkleinern").click(); s = await umschalten(p); check(s.form === "klein", "der Knopf „Verkleinern“ macht es klein", s.form); }
  check(ruhig ? s.u.animiert === 0 : s.u.animiert >= 3, ruhig ? "bei reduzierter Bewegung ohne Animation" : "der Wechsel gleitet (Animation am Fenster)", s.u.animiert);
  // hinunter bis zu den Werkzeugen und zurück: bleibt klein
  const tief = await p.evaluate(() => Math.round(document.querySelector("#werkzeuge").getBoundingClientRect().top + scrollY));
  await rollen(p, tief); await p.waitForTimeout(2800);
  await rollen(p, 0); await p.waitForFunction(() => !document.documentElement.classList.contains("goch-fort"), null, { timeout: 6000 }).catch(() => {}); await p.waitForTimeout(2600);
  s = await stand(p);
  check(s.form === "klein" && !s.fort && s.u.wechsel === 1, "wieder oben beim großen Goch bleibt es klein", { form: s.form, fort: s.fort, wechsel: s.u.wechsel });
  const kleinerGoch = await p.evaluate(() => getComputedStyle(document.getElementById("goch-mini")).display !== "none");
  check(!kleinerGoch, "dabei kein kleiner Goch zusätzlich", kleinerGoch);
  // Tipps auf die Schalter der Leiste wechseln nicht
  if (await p.locator("#goch-l-laut").isVisible()) {
    await p.locator("#goch-l-laut").click(); await p.waitForTimeout(500);
    if (await p.locator("#goch-stimme-allow").isVisible()) await p.locator("#goch-stimme-allow").click();
    await p.waitForTimeout(900); s = await stand(p); check(s.form === "klein", "„Goch spricht“ in der Leiste: Sie bleibt klein", s.form);
    await p.locator("#goch-l-laut").click(); await p.waitForTimeout(500);
  } else check(false, "Schalter „Goch spricht“ in der Leiste gefunden");
  // klein → groß nur durch Klick
  await antippen(p); s = await umschalten(p);
  check(s.form === "gross" && !s.fokusLage, "ein Klick auf das kleine Fenster öffnet das große", { form: s.form });
  check(s.eintraege >= vorher.eintraege && s.wert === "angefangen" && s.unten <= 4, "Verlauf, angefangener Text und neuester Satz bleiben", { vorher: vorher.eintraege, jetzt: s.eintraege, wert: s.wert, unten: s.unten });
  if (handy) { await p.evaluate(() => document.activeElement.blur()); await p.locator("#goch-verkleinern").click(); s = await umschalten(p); check(s.form === "klein", "der Knopf „Verkleinern“ macht es klein", s.form); await antippen(p); s = await umschalten(p); }
  // Gesprächsmodus: „Goch hört“ einschalten macht es klein
  await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await p.locator("#goch-mikro-an").click(); await p.waitForTimeout(500);
  if (await p.locator("#goch-stimme-allow").isVisible()) await p.locator("#goch-stimme-allow").click();
  await p.waitForTimeout(1300); s = await stand(p);
  check(s.form === "klein", "„Goch hört“ einschalten macht es klein (Gesprächsmodus)", { form: s.form, fokusLage: s.fokusLage });
  await p.locator("#goch-l-mikro").click().catch(() => {}); await p.waitForTimeout(600);
  s = await stand(p);
  check(s.u.beide === 0, "in keinem gezeichneten Bild zwei Gochs", s.u);
  check(s.u.leer === 0, "das offene Gespräch war in jedem Bild zu sehen (kein leerer Zwischenstand)", s.u.leer);
  check(fehler.length === 0, "keine Skriptfehler", fehler);
  await ctx.close();
}
await b.close();
console.log(fails ? `WebKit, Fenster: ${fails} Fehler.` : "WebKit, Fenster: alles in Ordnung.");
process.exit(fails ? 1 : 0);
