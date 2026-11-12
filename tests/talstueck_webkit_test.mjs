// Talstück vor „Werkzeuge“ (Hang und Nebel, 12.11.2026) in WebKit: steht im Streifen, nimmt keinen Platz, kein Sprung beim Laden.
// PLAYWRIGHT=<Ordner mit node_modules/playwright-core> node tests/talstueck_webkit_test.mjs http://127.0.0.1:8794/
import { createRequire } from 'module';
const { webkit } = createRequire(process.env.PLAYWRIGHT + '/')('playwright-core');
const basis = process.argv[2] || 'http://127.0.0.1:8794/';
let fehler = 0; const check = (ok, text) => { console.log((ok ? 'ok   ' : 'FEHLER ') + text); if (!ok) fehler++; };
const b = await webkit.launch();
for (const [w, h] of [[390, 844], [1470, 956]]) {
  for (const zeit of ['2026-11-12T12:00', '2027-01-15T22:00', '2027-04-20T12:00', '2027-07-15T21:15']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    const p = await ctx.newPage();
    await p.goto(basis + '?zeit=' + zeit, { waitUntil: 'domcontentloaded' });
    const lage = () => p.evaluate(() => ({ werk: document.querySelector('#werkzeuge').offsetTop /* Lage im Dokument, ohne das Heranrücken der Blätter (.tal-tief) */, hoch: document.documentElement.scrollHeight, breit: document.documentElement.scrollWidth }));
    const vorher = await lage();
    await p.waitForSelector('.tal-stueck.da', { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(2600); // Einblenden und Heranrücken der Blätter
    const nachher = await lage();
    const m = await p.evaluate(() => { const s = document.querySelector('.tal-stueck'); if (!s) return null;
      const r = s.getBoundingClientRect(), st = document.querySelector('.stage').getBoundingClientRect(), bl = document.querySelector('#werkzeuge');
      const frei = parseFloat(getComputedStyle(bl).marginTop) - 28, img = [...s.querySelectorAll('img')];
      return { da: s.classList.contains('da'), sicht: getComputedStyle(s).opacity, kamm: r.top + r.height * .235, mitte: st.bottom + frei / 2, oben: st.bottom, unten: st.bottom + frei,
        bilder: img.length, geladen: img.every(i => i.complete && i.naturalWidth > 0), ebene: getComputedStyle(s).zIndex, zeiger: getComputedStyle(s).pointerEvents, links: r.left, rechts: r.right, fenster: document.documentElement.clientWidth }; });
    const n = `${w} px, ${zeit}: `;
    check(!!m && m.da && m.sicht === '1' && m.bilder >= 1 && m.geladen, n + 'Talstück steht und ist eingeblendet');
    if (m) {
      check(Math.abs(m.kamm - m.mitte) < 2 && m.kamm > m.oben && m.kamm < m.unten, n + 'Kamm liegt mittig im freien Streifen');
      check(m.links === 0 && Math.abs(m.rechts - m.fenster) < 1, n + 'ganze Breite, ohne Lücke am Rand');
      check(m.ebene === '-1' && m.zeiger === 'none', n + 'liegt hinter allem und fängt keine Tipps');
    }
    check(vorher.werk === nachher.werk && vorher.hoch === nachher.hoch && nachher.breit <= w, n + `kein Sprung: „Werkzeuge“ bleibt bei ${nachher.werk} px, Seitenhöhe gleich, kein Querscrollen`);
    await ctx.close();
  }
}
{ // reduzierte Bewegung: steht ohne Einblenden; Fenster drehen: Lage folgt
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
  await p.goto(basis, { waitUntil: 'load' }); await p.waitForSelector('.tal-stueck.da', { timeout: 15000 }).catch(() => {});
  check(await p.evaluate(() => { const s = document.querySelector('.tal-stueck'); return !!s && getComputedStyle(s).transitionDuration === '0s' && getComputedStyle(s).opacity === '1'; }), 'reduzierte Bewegung: steht sofort, ohne Übergang');
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(500);
  check(await p.evaluate(() => { const s = document.querySelector('.tal-stueck'), st = document.querySelector('.stage').getBoundingClientRect(), frei = parseFloat(getComputedStyle(document.querySelector('#werkzeuge')).marginTop) - 28;
    if (s.hidden) return frei < 70; const r = s.getBoundingClientRect(); return Math.abs(r.top + r.height * .235 - (st.bottom + frei / 2)) < 2; }), 'nach dem Drehen: Lage folgt dem Streifen (oder aus, wenn der Streifen zu schmal ist)');
  await ctx.close();
}
{ // Unterseite: kein Talstück
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.goto(basis + 'workshops/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  check(await p.evaluate(() => !document.querySelector('.tal-stueck')), 'Unterseite: kein Talstück');
  await ctx.close();
}
await b.close();
console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen` : '\nalle Prüfungen bestanden');
process.exit(fehler ? 1 : 0);
