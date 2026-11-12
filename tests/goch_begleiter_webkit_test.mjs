// Begleiter mit Stationen in WebKit (Playwright) – Robin, 11.11.2026: „auf der startseite soll goch auch mitfliegen“.
// Ohne offenes Gespräch: Der kleine Goch fliegt an, wenn der große aus dem Bild ist, sitzt auf seinem Ast und sagt je neuem
// Abschnitt einen Satz als Sprechblase, ohne neu zu fliegen (Robin, 12.11.2026) – je Abschnitt einmal, ohne Anfrage an den Worker. Beim
// Hochscrollen fliegt er ab, bevor der große erscheint; nie sind beide zu sehen. Ein Tipp öffnet das Gespräch.
//   Voraussetzungen wie goch_webkit_test.mjs: Seite (python3 tests/pruefserver.py 8788), Attrappe (python3 tests/goch_fake_worker.py 8787),
//   PLAYWRIGHT=/pfad/zum/ordner mit node_modules.  node tests/goch_begleiter_webkit_test.mjs http://127.0.0.1:8788/ http://127.0.0.1:8787
import { createRequire } from "node:module";
const [seite = "http://127.0.0.1:8788/", attrappe = "http://127.0.0.1:8787"] = process.argv.slice(2);
let webkit, devices;
try { ({ webkit, devices } = createRequire((process.env.PLAYWRIGHT || process.cwd()) + "/")("playwright-core")); }
catch (_) { console.log("playwright-core nicht gefunden (PLAYWRIGHT=/pfad setzen) – Test übersprungen."); process.exit(0); }

let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FAIL ") + label + (info !== undefined ? " (" + (typeof info === "string" ? info : JSON.stringify(info)) + ")" : "")); if (!ok) fails++; };
const q = "?goch=" + encodeURIComponent(attrappe + "/chat") + "&stimme=an&zwitschertakt=60000&zeit=2026-11-11T12:00";
const b = await webkit.launch();
async function auf(pfad, opt = {}) {
  const ctx = await b.newContext(opt.breit ? { viewport: { width: 1280, height: 800 }, reducedMotion: opt.ruhig ? "reduce" : "no-preference" } : { ...devices["iPhone 13"], viewport: { width: 390, height: 664 }, reducedMotion: opt.ruhig ? "reduce" : "no-preference" });
  await ctx.addInitScript(() => { try { const at = Date.now(); localStorage.setItem("rjl-goch-consent", JSON.stringify({ allowed: true, at, expires: at + 180 * 864e5, version: "2026-10-16.1" })); } catch (_) {} });
  const p = await ctx.newPage(); p.fehler = []; p.worker = 0;
  p.on("pageerror", e => p.fehler.push(String(e).slice(0, 160)));
  p.on("request", r => { if (r.url().startsWith(attrappe)) p.worker++; });
  await p.goto(seite + pfad + q);
  await p.waitForFunction(() => window.GochStimme && window.GochZeigen && document.getElementById("scene").dataset.state === "rest", null, { timeout: 40000 });
  // je gezeichnetem Bild: zwei Gochs zugleich? kleiner Goch ohne Ast? welche Flüge?
  await p.evaluate(() => {
    window.__m = { beide: 0, ohneAst: 0, flug: {} };
    const bild = () => {
      const s = document.getElementById("scene").getBoundingClientRect(), m = document.getElementById("goch-mini"), da = getComputedStyle(m).display !== "none";
      if (s.bottom > 2 && s.top < innerHeight - 2 && da) __m.beide++;
      if (da) { const a = m.querySelector(".goch-mini-ast"), tier = m.querySelector(".goch-mini-tier"); if (a.complete && tier.getBoundingClientRect().width && !(a.naturalWidth && a.getBoundingClientRect().width > 100) && !m.classList.contains("fliegt-ab")) __m.ohneAst++; }
      if (m.dataset.flug) __m.flug[m.dataset.flug] = (__m.flug[m.dataset.flug] || 0) + 1;
      requestAnimationFrame(bild);
    };
    requestAnimationFrame(bild);
  });
  return { p, ctx };
}
// wie ein Besucher scrollen: in Schritten bis zur Stelle
async function zu(p, ziel, lage = .25) {
  const y = await p.evaluate(([z, l]) => { const e = typeof z === "number" ? null : document.querySelector(z); return Math.max(0, Math.round(e ? e.getBoundingClientRect().top + scrollY - innerHeight * l : z)); }, [ziel, lage]);
  const von = await p.evaluate(() => scrollY), n = Math.max(1, Math.round(Math.abs(y - von) / 160));
  for (let i = 1; i <= n; i++) { await p.evaluate(v => scrollTo(0, v), Math.round(von + (y - von) * i / n)); await p.waitForTimeout(40); }
}
const stand = p => p.evaluate(() => {
  const m = document.getElementById("goch-mini"), w = m.querySelector(".goch-mini-wort"), da = getComputedStyle(m).display !== "none";
  const sicht = da && w && !w.hidden && w.classList.contains("da");
  let verdeckt = 0, imFenster = true;
  if (sicht) { const z = w.getBoundingClientRect(); imFenster = z.left >= 0 && z.right <= innerWidth && z.top >= 0 && z.bottom <= innerHeight;
    document.querySelectorAll('button, input, textarea, select, video, summary, a[class*="cta"], .wzs-karte a, .ws-karte a').forEach(k => { if (m.contains(k) || document.getElementById("goch").contains(k)) return; const r = k.getBoundingClientRect(); if (r.width && r.bottom > z.top && r.top < z.bottom && r.right > z.left && r.left < z.right) verdeckt++; }); }
  return { klasse: (document.documentElement.className.match(/goch-\w+/g) || []).join(" "), klein: da, wort: sicht ? w.lastChild.textContent : "", wer: sicht ? w.firstChild.textContent : "", verdeckt, imFenster,
    etikett: m.querySelector(".goch-mini-knopf").getAttribute("aria-label"), blatt: !document.getElementById("goch").hidden, y: Math.round(scrollY), gross: document.getElementById("scene").dataset.state, flug: __m.flug, beide: __m.beide, ohneAst: __m.ohneAst };
});
const wort = (p, re, ms = 9000) => p.waitForFunction(r => { const w = document.querySelector(".goch-mini-wort"); return w && !w.hidden && w.classList.contains("da") && new RegExp(r).test(w.lastChild.textContent); }, re, { timeout: ms }).then(() => true, () => false);

for (const breit of [false, true]) {
  console.log("Startseite, " + (breit ? "Rechner 1280" : "Handy 390"));
  const { p, ctx } = await auf("", { breit });
  let s = await stand(p);
  check(!s.klein && s.klasse === "", "am Seitenanfang sitzt nur der große Goch", s.klasse);
  await zu(p, "#workshops", .75);
  check(await wort(p, "Werkzeuge"), "bei den Werkzeugen fliegt der kleine an und sagt seinen Satz");
  s = await stand(p);
  check(s.klein && s.klasse === "goch-begleitet" && !s.blatt, "der Begleiter ist da, das Gespräch ist zu", s.klasse);
  check(/KI|AI/.test(s.wer), "die Sprechblase trägt die Kennzeichnung als KI-Figur", s.wer);
  check(s.verdeckt === 0 && s.imFenster, "die Sprechblase liegt im Fenster und verdeckt nichts Bedienbares", { verdeckt: s.verdeckt, imFenster: s.imFenster });
  check(s.flug.an > 0 && !s.flug.runde, "er ist angeflogen", s.flug);
  const anfluege = s.flug.an;
  check(s.etikett === "Goch fragen", "der kleine Goch heißt jetzt „Goch fragen“", s.etikett);
  await p.waitForTimeout(2600);
  await zu(p, "#workshops", .2);
  check(await wort(p, "leitet Robin"), "beim Workshop KI-Kompetenz sagt er den nächsten Satz");
  s = await stand(p);
  check(!s.flug.runde && s.flug.an === anfluege && !s.flug.ab && s.klein, "er sitzt beim Abschnittswechsel: kein Flug, nur die Sprechblase wechselt", s.flug);
  check(s.verdeckt === 0 && s.imFenster, "auch diese Sprechblase verdeckt nichts Bedienbares", { verdeckt: s.verdeckt, imFenster: s.imFenster });
  // Füße am Ast (Robin, 12.11.2026): Im Sitzen bewegt sich nur der Körper über den Füßen – beim Sprechen, Knicksen, Atmen, Kopfdrehen.
  // Drei Messpunkte an den Zehen laufen mit allen Bewegungen des Körpers mit; gemessen wird ihre Lage zum Ast in jedem gezeichneten Bild.
  const fuss = await p.evaluate(() => new Promise(fertig => {
    const mini = document.getElementById("goch-mini"), tier = mini.querySelector(".goch-mini-tier"), ast = mini.querySelector(".goch-mini-ast"), scene = document.getElementById("scene");
    const knicks = tier.querySelector(".leben-knicks"), traeger = knicks || tier;
    const punkte = [[38, 96], [44.5, 94], [51, 96]].map(([x, y]) => { const i = document.createElement("i"); i.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:1px;height:1px;pointer-events:none`; traeger.append(i); return i; });
    const kopf = tier.querySelector(".leben-kopf"), start = performance.now(), lagen = [], koepfe = [];
    scene.dataset.spricht = "1"; // der kleine Goch übernimmt „spricht“ von der Szene
    const bild = now => {
      const a = ast.getBoundingClientRect();
      lagen.push(punkte.map(i => { const r = i.getBoundingClientRect(); return [r.left - a.left, r.top - a.top]; }));
      if (kopf) koepfe.push(kopf.getBoundingClientRect().top - a.top);
      const t = now - start;
      if (knicks) { if (t > 500 && t < 700) knicks.dataset.knickst = "1"; else delete knicks.dataset.knickst; }
      if (kopf && t > 900 && t < 1300) kopf.style.transform = "rotate(5deg)";
      if (t < 1900) requestAnimationFrame(bild);
      else {
        const sprach = mini.classList.contains("spricht"); delete scene.dataset.spricht; if (kopf) kopf.style.transform = ""; punkte.forEach(i => i.remove());
        const weg = Math.max(...lagen.flatMap(l => l.map((q, n) => Math.hypot(q[0] - lagen[0][n][0], q[1] - lagen[0][n][1]))));
        fertig({ bilder: lagen.length, weg: +weg.toFixed(2), kopf: koepfe.length ? +(Math.max(...koepfe) - Math.min(...koepfe)).toFixed(2) : null, leben: !!knicks, spricht: sprach });
      }
    };
    requestAnimationFrame(bild);
  }));
  check(fuss.bilder > 40 && fuss.spricht && fuss.weg <= .75, "im Sitzen bleiben die Füße auf dem Ast: beim Sprechen, Knicksen und Kopfdrehen höchstens 0,75 px in jedem gezeichneten Bild", fuss);
  check(fuss.kopf === null || fuss.kopf > 1, "dabei bewegt sich der Körper über den Füßen", fuss);
  await zu(p, "#workshops", .75);
  check(await wort(p, "Werkzeuge"), "zurück bei den Werkzeugen sagt er seinen Satz wieder (Robin, 12.11.2026: nicht nur einmal je Abschnitt)");
  s = await stand(p);
  check(!s.flug.runde, "auch dabei keine Runde", s.flug);
  // Keine stumme Station: alle Abschnitte der Startseite hinunter und wieder hinauf, je Abschnitt eine Sprechblase
  {
    const WEG = [["#workshops", .75, "Werkzeuge"], ["#workshops", .4, "leitet Robin"], ["#workshop-e-rechnung", .4, "führe ich"], ["#blog", .4, "Freitag"], ["#newsletter", .4, "per E-Mail"],
      ["#ueber-mich", .4, "stellt Robin"], ["section.contact", .4, "Gespräch mit Robin"], ["#nachricht", .4, "antwortet"], ["#anbieter", .4, "vorstellen"]];
    const da = await p.evaluate(w => w.map(([z]) => { const e = document.querySelector(z); return !!e && !e.hidden; }), WEG);
    const weg = WEG.filter((_, i) => da[i]);
    check(weg.length >= 8, "die Startseite hat mindestens acht Abschnitte mit Station", weg.length);
    for (const [richtung, liste] of [["hinunter", weg], ["hinauf", [...weg].reverse().slice(1)]]) {
      const stumm = [];
      for (const [z, l, re] of liste) {
        await zu(p, z, l);
        if (!await wort(p, re, 8000)) stumm.push(re);
        const b = await p.evaluate(() => { const w = document.querySelector(".goch-mini-wort").getBoundingClientRect(); return w.left >= 0 && w.top >= 0 && w.right <= innerWidth + 1 && w.bottom <= innerHeight + 1; });
        if (!b) stumm.push(re + " (Sprechblase nicht im Fenster)");
      }
      check(stumm.length === 0, `${richtung}: jeder Abschnitt bekommt seine Sprechblase, ganz im Fenster`, stumm);
    }
    s = await stand(p);
    check(!s.flug.runde && s.beide === 0, "dabei keine Runde und nie zwei Gochs", { flug: s.flug, beide: s.beide });
    await zu(p, "#workshops", .75); await p.waitForTimeout(600);
  }
  check(p.worker === 0, "bis hierher ging keine Anfrage an den Worker", p.worker);
  // zurück nach oben: der kleine fliegt ab, bevor der große erscheint
  const ab0 = s.flug.ab || 0;
  await zu(p, 0);
  await p.waitForTimeout(600);
  s = await stand(p);
  check(!s.klein && s.klasse === "", "am Seitenanfang ist der kleine weg", s.klasse);
  check((s.flug.ab || 0) > ab0, "er ist abgeflogen", s.flug);
  check(s.beide === 0, "in keinem gezeichneten Bild waren zwei Gochs zu sehen", s.beide);
  await p.waitForFunction(() => document.getElementById("scene").dataset.state === "rest", null, { timeout: 8000 }).catch(() => {});
  check((await stand(p)).gross === "rest", "der große Goch sitzt wieder auf seinem Ast");
  // Tipp auf den kleinen öffnet das Gespräch
  // Platz machen: Liegt etwas Bedienbares unter dem Vogel, fliegt er ab; der Tipp dort erreicht die Seite
  {
    await zu(p, "#workshops", .75);
    await p.waitForFunction(() => { const m = document.getElementById("goch-mini"); return getComputedStyle(m).display === "block" && !m.dataset.flug && !m.classList.contains("fliegt-ab"); }, null, { timeout: 8000 }).catch(() => {});
    const ort = await p.evaluate(() => { const r = document.getElementById("goch-mini-knopf").getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
    const dy = await p.evaluate(o => { const k = [...document.querySelectorAll("main a[href], main button")].find(e => { const r = e.getBoundingClientRect(); return r.height > 20 && e.getClientRects().length === 1 && r.left < o.x - 10 && r.right > o.x + 10 && r.top > o.y; }); if (!k) return null; k.id = k.id || "probe-ziel"; window.__ziel = k; const r = k.getBoundingClientRect(); return Math.round(r.top + r.height / 2 - o.y); }, ort);
    if (dy === null) check(breit, breit ? "am Rechner liegt unter seinem Platz am rechten Rand nichts Bedienbares" : "ein Knopf oder Verweis für die Probe „Platz machen“ gefunden");
    else {
      await zu(p, (await p.evaluate(() => scrollY)) + dy); await p.waitForTimeout(1700);
      const r = await p.evaluate(o => { const m = document.getElementById("goch-mini"), e = document.elementFromPoint(o.x, o.y); return { klein: getComputedStyle(m).display, trifft: !!e && !m.contains(e) && !!e.closest("main a[href], main button"), was: e && e.tagName + "." + e.className }; }, ort);
      check(r.trifft, "liegt ein Knopf oder Verweis unter seinem Platz, ist er dort weg und der Tipp erreicht die Seite", r);
      for (let i = 0; i < 6; i++) { await p.evaluate(() => scrollBy(0, 4)); await p.waitForTimeout(150); }
      await p.waitForTimeout(2200);
      // Astwechsel statt Verschwinden: Er darf auf einer freien Höhe wieder sitzen, aber nie über etwas Bedienbarem
      const neu = await p.evaluate(() => { const m = document.getElementById("goch-mini"), k = document.getElementById("goch-mini-knopf").getBoundingClientRect();
        const sitzt = getComputedStyle(m).display === "block" && !m.dataset.flug && !m.classList.contains("fliegt-ab");
        const ueber = sitzt && [...document.querySelectorAll("main a[href], main button, main input, main textarea")].some(e => { const r = e.getBoundingClientRect(); return r.width && r.bottom > k.top && r.top < k.bottom && r.right > k.left && r.left < k.right; });
        return { sitzt, ueber, ast: sitzt && m.querySelector(".goch-mini-ast").getBoundingClientRect().right >= innerWidth - 1 }; });
      check(!neu.ueber && (!neu.sitzt || neu.ast), "sitzt er wieder, dann auf einer freien Höhe, mit Ast vom rechten Rand, über nichts Bedienbarem", neu);
    }
  }
  await zu(p, "#blog", .2);
  // eine Stelle suchen, an der sein Platz frei ist
  let sitzt = false;
  for (let i = 0; i < 30 && !sitzt; i++) {
    sitzt = await p.waitForFunction(() => { const m = document.getElementById("goch-mini"); return getComputedStyle(m).display === "block" && !m.dataset.flug && !m.classList.contains("fliegt-ab"); }, null, { timeout: 2600 }).then(() => true, () => false);
    if (!sitzt) await p.evaluate(() => scrollBy(0, 70));
  }
  check(sitzt, "ist sein Platz wieder frei, kommt er zurück");
  const vor = await p.evaluate(() => scrollY);
  await p.locator("#goch-mini-knopf").click(); await p.waitForTimeout(1500);
  s = await stand(p);
  if (breit) check(s.blatt && s.klasse.includes("goch-angeheftet") && Math.abs(s.y - vor) < 4 && s.klein, "ein Tipp öffnet das Gespräch als mitlaufendes Blatt, die Seite bleibt stehen", { klasse: s.klasse, y: s.y, vor });
  else check(s.blatt && !s.klein && s.y < 300, "ein Tipp öffnet das Gespräch bei Goch am Seitenanfang", { klasse: s.klasse, y: s.y });
  check(s.beide === 0 && s.ohneAst === 0, "nie zwei Gochs, nie ein kleiner Goch ohne Ast", { beide: s.beide, ohneAst: s.ohneAst });
  check(p.fehler.length === 0, "keine Skriptfehler", p.fehler.slice(0, 2));
  await ctx.close();
}
{
  console.log("Reduzierte Bewegung, Handy");
  const { p, ctx } = await auf("", { ruhig: true });
  await zu(p, "#workshops", .75);
  check(await wort(p, "Werkzeuge"), "der kleine Goch sitzt da und sagt seinen Satz");
  await zu(p, "#workshops", .2);
  check(await wort(p, "leitet Robin"), "auch den nächsten");
  const s = await stand(p);
  check(Object.keys(s.flug).length === 0, "ohne Flug", s.flug);
  check(s.beide === 0 && p.fehler.length === 0, "nie zwei Gochs, keine Skriptfehler", p.fehler.slice(0, 2));
  await ctx.close();
}
{
  console.log("Platz machen als Begleiter, Handy");
  const { p, ctx } = await auf("");
  await zu(p, "#workshops", .75);
  await p.waitForFunction(() => { const m = document.getElementById("goch-mini"), k = document.getElementById("goch-platz"); return getComputedStyle(m).display === "block" && !m.dataset.flug && !m.classList.contains("sagt") && k && getComputedStyle(k).display !== "none"; }, null, { timeout: 16000 }).catch(() => {});
  await p.locator("#goch-platz").click(); await p.waitForTimeout(800);
  check(await p.evaluate(() => { const w = document.querySelector(".goch-platz-wort"); return !!w && /warte/.test(w.textContent); }), "„Platz machen“: Goch antwortet kurz");
  await p.waitForTimeout(3200);
  let r = await p.evaluate(() => ({ klein: getComputedStyle(document.getElementById("goch-mini")).display, zweig: !document.getElementById("goch-zweig").hidden, kl: (document.documentElement.className.match(/goch-\w+/g) || []).join(" "), blatt: !document.getElementById("goch").hidden }));
  check(r.klein === "none" && r.zweig && r.kl === "" && !r.blatt, "er ist abgeflogen, der Zweig am Rand bleibt, das Gespräch ist zu", r);
  await zu(p, "#blog", .2); await p.waitForTimeout(2500);
  check(await p.evaluate(() => getComputedStyle(document.getElementById("goch-mini")).display) === "none", "er bleibt weg, auch im nächsten Abschnitt");
  await p.locator("#goch-zweig").click();
  let da = false;
  for (let i = 0; i < 20 && !da; i++) { da = await p.waitForFunction(() => document.documentElement.classList.contains("goch-begleitet") && getComputedStyle(document.getElementById("goch-mini")).display === "block", null, { timeout: 2600 }).then(() => true, () => false); if (!da) await p.evaluate(() => scrollBy(0, 70)); }
  r = await p.evaluate(() => ({ zweig: !document.getElementById("goch-zweig").hidden, blatt: !document.getElementById("goch").hidden, beide: __m.beide }));
  check(da && !r.zweig && !r.blatt && r.beide === 0, "ein Tipp auf den Zweig holt ihn als Begleiter zurück, das Gespräch bleibt zu", r);
  check(p.worker === 0 && p.fehler.length === 0, "keine Anfrage an den Worker, keine Skriptfehler", { worker: p.worker, fehler: p.fehler.slice(0, 2) });
  await ctx.close();
}
for (const [pfad, ziel, re, name] of [["workshops/ki-kompetenz/", "#ablauf", "Schritt für Schritt", "Workshop KI-Kompetenz"], ["ueber-mich/", "#rotkehlchen", "Rotkehlchen", "Über mich"], ["workshops/en/ki-kompetenz/", "#ablauf", "step by step", "Workshop KI-Kompetenz (englisch)"]]) {
  console.log("Unterseite " + name + ", Handy");
  const { p, ctx } = await auf(pfad);
  await zu(p, ziel, .3);
  check(await wort(p, re), "der Begleiter sagt den Satz zum Abschnitt");
  let s = await stand(p);
  check(s.klasse === "goch-begleitet" && s.verdeckt === 0 && s.imFenster, "Begleiter da, Sprechblase frei", { klasse: s.klasse, verdeckt: s.verdeckt, wort: s.wort });
  await zu(p, 0); await p.waitForTimeout(600);
  s = await stand(p);
  check(!s.klein && s.beide === 0 && s.ohneAst === 0, "oben ist der kleine weg; nie zwei Gochs, nie ohne Ast", { beide: s.beide, ohneAst: s.ohneAst });
  check(p.worker === 0 && p.fehler.length === 0, "keine Anfrage an den Worker, keine Skriptfehler", { worker: p.worker, fehler: p.fehler.slice(0, 2) });
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} FEHLER` : "\nWebKit, Begleiter: alles in Ordnung.");
process.exit(fails ? 1 : 0);
