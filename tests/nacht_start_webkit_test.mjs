// Unterseiten bei Nacht in WebKit: Jedes gemessene Bild der Seite steht in den Nachtfarben, auch nach Neuladen und nach „Zurück“.
// PLAYWRIGHT=<Ordner mit node_modules/playwright-core> node tests/nacht_start_webkit_test.mjs http://127.0.0.1:8794/
import { createRequire } from 'module';
const { webkit } = createRequire(process.env.PLAYWRIGHT + '/')('playwright-core');
const basis = process.argv[2] || 'http://127.0.0.1:8794/';
let fehler = 0; const check = (ok, text) => { console.log((ok ? 'ok   ' : 'FEHLER ') + text); if (!ok) fehler++; };
const PROBE = () => {
  window.__bilder = []; window.__zeigen = [];
  addEventListener('pageshow', e => window.__zeigen.push(e.persisted));
  // WebKit gibt gemischte Farben als color(srgb …) aus: über eine Zeichenfläche in rgb umrechnen
  const fl = document.createElement('canvas'); fl.width = fl.height = 1; const zf = fl.getContext('2d', { willReadFrequently: true });
  const rgb = f => { zf.clearRect(0, 0, 1, 1); zf.fillStyle = '#000'; zf.fillStyle = f; zf.fillRect(0, 0, 1, 1); const d = zf.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]}, ${d[1]}, ${d[2]})`; };
  window.__rgb = rgb;
  const mess = () => { const b = document.body; if (b && b.innerText.trim()) { const s = getComputedStyle(b), h = document.querySelector('main h1');
    window.__bilder.push([rgb(s.backgroundColor), s.backgroundBlendMode.split(',')[0].trim(), h ? rgb(getComputedStyle(h).color) : '']); } if (window.__bilder.length < 240) requestAnimationFrame(mess); };
  requestAnimationFrame(mess);
};
const NACHT = 'rgb(27, 34, 48)', TAGGRUEN = 'rgb(11, 61, 46)';
const gut = b => b.length > 0 && b.every(x => x[0] === NACHT && x[1] === 'multiply' && x[2] !== TAGGRUEN);
const b = await webkit.launch();
for (const [w, h] of [[390, 844], [1470, 956]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  await ctx.addInitScript(PROBE);
  const p = await ctx.newPage(); const q = '?zeit=2026-11-12T23:30';
  for (const seite of ['workshops/', 'werkzeuge/', 'ueber-mich/', 'blog/', 'blog/das-ende-des-erp/']) {
    await p.goto(basis + seite + q, { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const erst = await p.evaluate(() => window.__bilder);
    check(gut(erst), `${w} px ${seite}: Öffnen – alle ${erst.length} Bilder in Nachtfarben` + (gut(erst) ? '' : ' – ' + JSON.stringify(erst.find(x => x[0] !== NACHT || x[1] !== 'multiply' || x[2] === TAGGRUEN))));
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
    const neu = await p.evaluate(() => window.__bilder);
    check(gut(neu), `${w} px ${seite}: Neuladen – alle ${neu.length} Bilder in Nachtfarben`);
  }
  // Zurück: von einer Unterseite zur nächsten und zurück
  await p.goto(basis + 'workshops/' + q, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.goto(basis + 'werkzeuge/' + q, { waitUntil: 'load' }); await p.waitForTimeout(800);
  await p.goBack({ waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(1500);
  const z = await p.evaluate(() => ({ bilder: window.__bilder, zeigen: window.__zeigen, jetzt: window.__rgb(getComputedStyle(document.body).backgroundColor) }));
  const ausCache = z.zeigen.includes(true);
  check(z.jetzt === NACHT && (ausCache || gut(z.bilder)), `${w} px Zurück zu workshops/: Nachtfarben` + (ausCache ? ' (aus dem Zurück-Cache)' : ' (neu geladen; der Zurück-Cache greift in dieser Umgebung nicht)'));
  await ctx.close();
}
await b.close();
console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen` : '\nWebKit, Nachtstart der Unterseiten: alles in Ordnung.');
process.exit(fehler ? 1 : 0);
