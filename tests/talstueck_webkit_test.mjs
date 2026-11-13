// Talstück vor „Werkzeuge“ („Bühne läuft aus“, Robin 12.11.2026) in WebKit: Der Waldhang setzt unter der Bühne an und läuft im
// Nebel aus – kein zweiter Kamm; nimmt keinen Platz, kein Sprung beim Laden, keine zusätzliche Anfrage.
// Seit 13.11.2026 (Robin: „Läd es später beim reload nach“, „wie zwei Landschaften übereinander“): Der Waldhang entsteht mit der
// Bühne (Bild vorab angefordert, vor den Ebenen des Tals, kein eigenes Einblenden), und solange er im Fenster steht, bleibt das
// feste Tal verborgen – geprüft in WebKit und Chrome bei 390, 1470, 1920 und 2560 px.
// PLAYWRIGHT=<Ordner mit node_modules/playwright-core> node tests/talstueck_webkit_test.mjs http://127.0.0.1:8794/
import { createRequire } from 'module';
import { stumm } from './stumm.mjs';
const { webkit, chromium } = createRequire(process.env.PLAYWRIGHT + '/')('playwright-core');
const basis = process.argv[2] || 'http://127.0.0.1:8794/';
let fehler = 0; const check = (ok, text, info) => { console.log((ok ? 'ok   ' : 'FEHLER ') + text + (!ok && info ? ' ' + JSON.stringify(info) : '')); if (!ok) fehler++; };
const b = stumm(await webkit.launch());
for (const [w, h] of [[390, 844], [1470, 956]]) {
  for (const zeit of ['2026-11-12T12:00', '2027-01-15T22:00', '2027-04-20T12:00', '2027-07-15T21:15']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    const p = await ctx.newPage(); const hang = [];
    p.on('request', r => { if (/\/hang-/.test(r.url())) hang.push(r.url().split('/').pop()); });
    await p.goto(basis + '?zeit=' + zeit, { waitUntil: 'domcontentloaded' });
    const lage = () => p.evaluate(() => ({ werk: document.querySelector('#werkzeuge').offsetTop /* Lage im Dokument, ohne das Heranrücken der Blätter (.tal-tief) */, hoch: document.documentElement.scrollHeight, breit: document.documentElement.scrollWidth }));
    const vorher = await lage();
    await p.waitForSelector('.tal-stueck.da', { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(2600); // Einblenden und Heranrücken der Blätter
    const nachher = await lage();
    const m = await p.evaluate(() => { const s = document.querySelector('.tal-stueck'); if (!s) return null;
      const r = s.getBoundingClientRect(), st = document.querySelector('.stage').getBoundingClientRect(), bl = document.querySelector('#werkzeuge');
      const frei = parseFloat(getComputedStyle(bl).marginTop) - 28, img = [...s.querySelectorAll('img')];
      const bild = s.querySelector('picture'), gs = getComputedStyle(s), gi = getComputedStyle(img[0]);
      return { da: s.classList.contains('da'), sicht: gs.opacity, kronen: r.top + r.height * .09, oben: st.bottom, unten: st.bottom + frei, hoch: r.height,
        datei: img.map(i => (i.currentSrc || '').split('/').pop()), gespiegelt: getComputedStyle(bild).transform !== 'none', maske: (gs.webkitMaskImage || gs.maskImage || ''),
        bildsicht: +gi.opacity, weich: gi.filter, knopf: Math.max(...[...document.querySelectorAll('.stage .cta a')].map(a => a.getBoundingClientRect().bottom)),
        bilder: img.length, geladen: img.every(i => i.complete && i.naturalWidth > 0), ebene: getComputedStyle(s).zIndex, zeiger: getComputedStyle(s).pointerEvents, links: r.left, rechts: r.right, fenster: document.documentElement.clientWidth }; });
    const n = `${w} px, ${zeit}: `;
    check(!!m && m.da && m.sicht === '1' && m.bilder >= 1 && m.geladen, n + 'Talstück steht und ist eingeblendet');
    if (m) {
      check(m.datei.every(d => /^hang-/.test(d)) && !m.gespiegelt, n + 'zeigt den Hang des Tals, ungespiegelt');
      check(new Set(hang).size === m.bilder && hang.length === m.bilder, n + `keine zusätzliche Anfrage: der Hang lädt je Jahreszeit einmal (${hang.join(', ')})`);
      check(Math.abs(m.kronen - m.oben) < m.hoch * .05 && m.kronen >= m.knopf + 8, n + 'die Baumkronen setzen am Ende der Bühne an und bleiben unter den Knöpfen');
      check(/linear-gradient/.test(m.maske) && m.bildsicht > .35 && m.bildsicht <= .6 && /blur/.test(m.weich), n + 'läuft nach unten im Nebel aus (Maske, halbe Deckkraft, weich)');
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
    if (s.hidden) return frei < 70; const r = s.getBoundingClientRect(); return r.top + r.height * .12 - st.bottom > -2 && r.top + r.height * .09 - st.bottom < r.height * .05; }), 'nach dem Drehen: Lage folgt dem Ende der Bühne (oder aus, wenn der Streifen zu schmal ist)');
  await ctx.close();
}
{ // Unterseite: kein Talstück
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.goto(basis + 'workshops/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  check(await p.evaluate(() => !document.querySelector('.tal-stueck')), 'Unterseite: kein Talstück');
  await ctx.close();
}
await b.close();
for (const [name, start] of [['WebKit', async () => stumm(await webkit.launch())], ['Chrome', async () => stumm(await chromium.launch({ channel: 'chrome' }))]]) {
  let m; try { m = await start(); } catch (e) { console.log('–    ' + name + ' nicht gefunden, übersprungen'); continue; }
  for (const [w, h] of [[390, 844], [1470, 956], [1920, 1080], [2560, 1440]]) {
    const ctx = await m.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const n = `${name}, ${w} px: `;
    const folge = []; p.on('request', r => { const k = (r.url().match(/\/(hang|krone|mitte|grund)-/) || [])[1]; if (k && !folge.includes(k)) folge.push(k); });
    await p.goto(basis + '?zeit=2026-11-13T11:00', { waitUntil: 'commit' });
    await p.waitForFunction(() => { const i = document.querySelector('.tal-stueck img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
    const frueh = await p.evaluate(() => { const s = document.querySelector('.tal-stueck'), g = s && getComputedStyle(s); return !!s && { sicht: g.opacity, dauer: g.transitionDuration, vorab: !!document.querySelector('link[rel=preload][href*="/hang-"]'), tal: !!document.querySelector('.tal .tal-ebene') }; });
    await p.waitForLoadState('load'); await p.waitForFunction(() => document.querySelector('.tal .tal-ebene img'), null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(800);
    check(!!frueh && frueh.sicht === '1' && frueh.dauer === '0s' && frueh.vorab && folge.includes('hang') && folge.includes('mitte') && folge.indexOf('hang') < folge.indexOf('mitte') && folge.indexOf('hang') < folge.indexOf('grund'), n + `der Waldhang steht mit der Bühne: Bild vorab angefordert, vor den Ebenen des Tals (${folge.join(', ')}), ohne eigenes Einblenden`);
    const sicht = () => p.evaluate(() => { const t = document.querySelector('.tal'), s = document.querySelector('.tal-stueck'); return { auf: +t.style.getPropertyValue('--auf'), ebene: Math.max(...[...t.querySelectorAll('.tal-ebene img')].map(i => +getComputedStyle(i).opacity)), fern: +t.querySelector('.tal-fern').style.opacity, ende: s.offsetTop + s.offsetHeight * .45 }; });
    const oben = await sicht();
    check(oben.auf === 0 && oben.ebene === 0 && oben.fern === 0, n + 'am Seitenanfang nur eine Landschaft: das feste Tal ist verborgen', oben);
    await p.evaluate(y => scrollTo(0, y), Math.round(oben.ende - 6)); await p.waitForTimeout(400); const noch = await sicht();
    check(noch.auf === 0 && noch.ebene === 0 && noch.fern === 0, n + 'solange das Talstück im Fenster steht (bis sein Nebel oben hinaus ist), bleibt das Tal verborgen', noch);
    await p.evaluate(y => scrollTo(0, y), Math.round(oben.ende + h * .15)); await p.waitForTimeout(400); const mitte = await sicht();
    check(mitte.auf > .2 && mitte.auf < .8 && Math.abs(mitte.ebene - mitte.auf) < .02, n + 'danach kommt das Tal fließend herauf', mitte);
    await p.evaluate(y => scrollTo(0, y), Math.round(oben.ende + h * .3 + 4)); await p.waitForTimeout(400); const unten = await sicht();
    check(unten.auf === 1 && unten.ebene === 1, n + 'ein knappes Drittel der Fensterhöhe später steht das Tal ganz', unten);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400); const wieder = await sicht();
    check(wieder.auf === 0 && wieder.ebene === 0, n + 'zurück am Seitenanfang ist das Tal wieder verborgen');
    // Mehrmals hin und her (Robin 13.11.2026: nach dem ersten Mal zeigte die Seite „nicht mehr die neue tiefere landschaft“):
    // Bei jedem Herunterscrollen kommt das Tal wieder herauf und die Blätter rücken wieder aus der Tiefe heran; oben ist das
    // Tal jedes Mal wieder verborgen und die Blätter unter dem Fenster stehen wieder in der Tiefe.
    const lage = () => p.evaluate(() => { const t = document.querySelector('.tal'); return { auf: +t.style.getPropertyValue('--auf'), ebene: Math.max(...[...t.querySelectorAll('.tal-ebene img')].map(i => +getComputedStyle(i).opacity)), sichtbar: [...t.querySelectorAll('.tal-ebene')].some(e => e.getBoundingClientRect().top < innerHeight - 20), tief: document.querySelectorAll('.tal-tief').length }; });
    // schrittweise wie mit dem Mausrad (ein Sprung ans Seitenende ließe die mittleren Blätter nie ins Fenster kommen)
    const fahrt = runter => p.evaluate(async runter => { const ende = document.documentElement.scrollHeight - innerHeight, schritt = innerHeight * .45;
      for (let y = scrollY; runter ? y < ende : y > 0;) { y = runter ? Math.min(ende, y + schritt) : Math.max(0, y - schritt); scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); } }, runter);
    const anfang = await lage(), runden = [];
    for (let r = 1; r <= 4; r++) {
      await fahrt(true); await p.waitForTimeout(450); const u = await lage();
      await fahrt(false); await p.waitForTimeout(450); const o = await lage();
      runden.push({ r, unten: u, oben: o });
    }
    check(runden.every(x => x.unten.auf === 1 && x.unten.ebene === 1 && x.unten.sichtbar), n + 'viermal runter: das Tal steht jedes Mal wieder im Bild', runden.map(x => x.unten));
    check(runden.every(x => x.oben.auf === 0 && x.oben.ebene === 0), n + 'viermal hoch: das Tal ist oben jedes Mal wieder verborgen', runden.map(x => x.oben));
    check(anfang.tief > 0 && runden.every(x => x.unten.tief === 0 && x.oben.tief === anfang.tief), n + `die Blätter rücken bei jedem Durchgang wieder aus der Tiefe heran (${anfang.tief} Blätter)`, [anfang.tief, ...runden.map(x => [x.unten.tief, x.oben.tief])]);
    await ctx.close();
  }
  await m.close();
}
console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen` : '\nalle Prüfungen bestanden');
process.exit(fehler ? 1 : 0);
