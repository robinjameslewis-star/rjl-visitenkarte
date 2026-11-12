// „Goch hört“ und „nie zwei Gochs“ in WebKit (Playwright, iPhone 13) – die Maschine von Safari. Nachstellung der Befunde von
// Robin am iPhone (11.11.2026): Nimmt Goch die Frage nach der Sprechpause an – groß, als Kapsel, mit „Goch spricht“? Sagt er
// es sichtbar, wenn die Spracheingabe an ihre Grenze kommt? Sind beim Hochscrollen nie beide Gochs zu sehen?
// Das Mikrofon ist künstlich (Sägezahn, solange __sprich wahr ist); der Worker ist die Attrappe.
//   Voraussetzungen: laufende Seite (python3 tests/pruefserver.py 8788) und Attrappe (python3 tests/goch_fake_worker.py 8787),
//   playwright-core mit WebKit (npx playwright install webkit). Ort von playwright-core über PLAYWRIGHT=/pfad/zum/ordner mit node_modules.
//   node tests/goch_webkit_test.mjs http://127.0.0.1:8788/ http://127.0.0.1:8787
import { createRequire } from "node:module";
const [seite = "http://127.0.0.1:8788/", attrappe = "http://127.0.0.1:8787"] = process.argv.slice(2);
let webkit, devices;
try { ({ webkit, devices } = createRequire((process.env.PLAYWRIGHT || process.cwd()) + "/")("playwright-core")); }
catch (_) { console.log("playwright-core nicht gefunden (PLAYWRIGHT=/pfad setzen) – Test übersprungen."); process.exit(0); }

let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FAIL ") + label + (info !== undefined ? " (" + (typeof info === "string" ? info : JSON.stringify(info)) + ")" : "")); if (!ok) fails++; };
const q = "?goch=" + encodeURIComponent(attrappe + "/chat") + "&stimme=an&zwitschertakt=60000&zeit=2026-11-11T12:00";
const listen = () => fetch(attrappe + "/_listen").then(r => r.json()).then(a => a.length);
const modus = m => fetch(attrappe + "/_modus?" + m);

const b = await webkit.launch();
async function seiteAuf() {
  const ctx = await b.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 664 } });
  await ctx.addInitScript(() => {
    window.__z = { gum: 0 }; window.__sprich = false;
    const kunst = async () => {
      __z.gum++;
      const AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
      if (ac.state === "suspended") await ac.resume().catch(() => {});
      const osc = ac.createOscillator(), tor = ac.createGain(), ziel = ac.createMediaStreamDestination();
      osc.type = "sawtooth"; osc.frequency.value = 160; tor.gain.value = 0; osc.connect(tor); tor.connect(ziel); osc.start();
      setInterval(() => { tor.gain.value = __sprich ? .25 : 0; }, 10);
      return ziel.stream;
    };
    try { Object.defineProperty(MediaDevices.prototype, "getUserMedia", { value: kunst, configurable: true, writable: true }); } catch (_) {}
    try { const at = Date.now(); localStorage.setItem("rjl-goch-consent", JSON.stringify({ allowed: true, at, expires: at + 180 * 864e5, version: "2026-10-16.1" })); } catch (_) {}
  });
  const p = await ctx.newPage(); p.fehler = []; p.on("pageerror", e => p.fehler.push(String(e).slice(0, 160)));
  await p.goto(seite + q);
  await p.waitForFunction(() => window.GochStimme && window.GochZeigen && document.getElementById("scene").dataset.state === "rest", null, { timeout: 40000 });
  await p.locator("#scene").click({ position: { x: 150, y: 90 } }); await p.waitForTimeout(500);
  return { p, ctx };
}
const stand = p => p.evaluate(() => ({ lage: (document.documentElement.className.match(/goch-\w+/g) || []).filter(k => k !== "goch-fort").join(" "), zustand: document.getElementById("goch-mikro").dataset.zustand, an: document.getElementById("goch-mikro-an").getAttribute("aria-pressed"), blasen: document.querySelectorAll(".goch-bubble").length, letzte: [...document.querySelectorAll(".goch-bubble")].pop().textContent.slice(0, 60) }));
async function frage(p) { const n = await listen(); await p.evaluate(() => { __sprich = true; }); await p.waitForTimeout(1500); await p.evaluate(() => { __sprich = false; }); await p.waitForTimeout(4200); return (await listen()) - n; }
async function hoertAn(p) { await p.locator("#goch-mikro-an").click(); await p.waitForTimeout(400); await p.locator("#goch-stimme-allow").click(); await p.waitForTimeout(1500); }

await modus("hoeren=ok&stimme=ok");
for (const art of ["gross", "kapsel", "mit Stimme"]) {
  console.log("„Goch hört“, " + art);
  const { p, ctx } = await seiteAuf();
  await hoertAn(p);
  if (art === "mit Stimme") { await p.locator("#goch-laut").click(); await p.waitForTimeout(600); }
  if (art === "kapsel") { await p.locator("#goch-zur-seite").click(); await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(2500); }
  let s = await stand(p);
  check(s.zustand === "hoert" && s.an === "true" && s.lage === (art === "kapsel" ? "goch-unterwegs" : "goch-fokus"), "Goch hört zu", s);
  const gesendet = await frage(p); s = await stand(p);
  check(gesendet === 1 && s.blasen === 3, "nach der Sprechpause geht die Frage ab, Goch antwortet", { gesendet, blasen: s.blasen });
  check(s.zustand === "hoert" && s.an === "true", "danach hört er weiter zu", s);
  const noch = await frage(p); s = await stand(p);
  check(noch === 1 && s.blasen === 5, "auch die zweite Frage kommt an", { noch, blasen: s.blasen });
  check(p.fehler.length === 0, "keine Skriptfehler", p.fehler.slice(0, 2));
  await ctx.close();
}
for (const art of ["gross", "kapsel"]) {
  console.log("Grenze der Spracheingabe erreicht, " + art);
  const { p, ctx } = await seiteAuf();
  await hoertAn(p);
  if (art === "kapsel") { await p.locator("#goch-zur-seite").click(); await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(2500); }
  await modus("hoeren=grenze");
  await frage(p); const s = await stand(p);
  await modus("hoeren=ok");
  check(s.an === "false", "„Goch hört“ geht aus", s.an);
  check(/tippen/i.test(s.letzte) && s.blasen === 2, "Goch sagt sichtbar im Gespräch, dass man jetzt tippen soll", s.letzte);
  check(await p.evaluate(() => { const l = [...document.querySelectorAll(".goch-bubble")].pop(), r = l.getBoundingClientRect(); return r.height > 0 && r.bottom <= innerHeight && r.top >= 0; }), "der Hinweis ist im Fenster zu sehen" + (art === "kapsel" ? " (als letzter Satz der Kapsel)" : ""));
  await ctx.close();
}
{
  console.log("Nie zwei Gochs zugleich");
  const { p, ctx } = await seiteAuf();
  await p.locator("#goch-laut").click(); await p.waitForTimeout(400); await p.locator("#goch-stimme-allow").click(); await p.waitForTimeout(1200);
  await p.locator("#goch-zur-seite").click(); await p.evaluate(() => scrollTo(0, 900));
  await p.waitForFunction(() => { const m = document.getElementById("goch-mini"); return getComputedStyle(m).display === "block" && !m.dataset.flug; }, null, { timeout: 8000 });
  check(true, "unten sitzt der kleine Goch");
  // je gezeichnetem Bild messen (requestAnimationFrame läuft nach den Scroll-Ereignissen, kurz vor dem Zeichnen)
  await p.evaluate(() => { window.__beide = 0; window.__misst = true; const bild = () => { const s = document.getElementById("scene").getBoundingClientRect(), m = document.getElementById("goch-mini"); if (s.bottom > 2 && s.top < innerHeight - 2 && getComputedStyle(m).display !== "none" && getComputedStyle(document.querySelector("#scene .bird-move")).visibility !== "hidden") __beide++; if (__misst) requestAnimationFrame(bild); }; requestAnimationFrame(bild); });
  for (const y of [760, 620, 480, 340, 200, 60, 0]) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(180); }
  // seit der Übergabe (12.11.2026) fliegt derselbe Vogel hinauf: Der kleine ist weg, wenn der große wieder auf dem Bühnen-Ast sitzt
  await p.waitForFunction(() => getComputedStyle(document.getElementById("goch-mini")).display === "none" && !document.documentElement.classList.contains("goch-fort"), null, { timeout: 6000 }).catch(() => {});
  const r = await p.evaluate(() => { __misst = false; return { beide: __beide, klein: getComputedStyle(document.getElementById("goch-mini")).display, gross: getComputedStyle(document.querySelector("#scene .bird-move")).visibility }; });
  check(r.beide === 0 && r.klein === "none" && r.gross !== "hidden", "beim Hochscrollen fliegt er hinauf: nie zwei Gochs, oben sitzt wieder der große", r);
  await p.evaluate(() => scrollTo(0, 900));
  await p.waitForFunction(() => getComputedStyle(document.getElementById("goch-mini")).display === "block", null, { timeout: 8000 });
  check(true, "wieder unten fliegt der kleine neu an");
  check(p.fehler.length === 0, "keine Skriptfehler", p.fehler.slice(0, 2));
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} FEHLER` : "\nWebKit: alles in Ordnung.");
process.exit(fails ? 1 : 0);
