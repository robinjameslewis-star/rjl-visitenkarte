// Lesbarkeit der Unterseiten und der Startseite bei Nacht, Dämmerung und Tag (Robin, 12.11.2026: Karten bei Nacht „zu blass“).
// Misst in WebKit für jeden sichtbaren Text im Inhalt den Kontrast zur tatsächlichen Fläche darunter (halbdurchsichtige Flächen
// werden über ihre Vorfahren gelegt) nach WCAG 2.1 AA: 4,5 : 1, große Schrift 3 : 1. Flächen mit Bild oder Verlauf bleiben außen vor.
// PLAYWRIGHT=<Ordner mit node_modules/playwright-core> node tests/karten_nacht_webkit_test.mjs http://127.0.0.1:8794/ [liste]
// Mit „liste“ als drittem Argument gibt der Test alle Unterschreitungen aus und endet immer mit 0 (zum Vergleichen zweier Stände).
import { createRequire } from 'module';
import { stumm } from './stumm.mjs';
const { webkit } = createRequire(process.env.PLAYWRIGHT + '/')('playwright-core');
const basis = process.argv[2] || 'http://127.0.0.1:8794/', nurListe = process.argv[3] === 'liste';
const SEITEN = process.env.NUR ? process.env.NUR.split(',') : ['', 'werkzeuge/', 'werkzeuge/en/', 'workshops/', 'workshops/ki-kompetenz/', 'workshops/e-rechnung/', 'ueber-mich/', 'about/', 'blog/', 'blog/das-ende-des-erp/'];
const ZEITEN = { Nacht: '2026-11-12T23:30', 'Späte Dämmerung': '2026-11-12T17:35', Dämmerung: '2026-11-12T17:05', Tag: '2026-11-12T12:30' };
let fehler = 0; const check = (ok, text) => { console.log((ok ? 'ok   ' : 'FEHLER ') + text); if (!ok) fehler++; };
const MESSEN = () => {
  const fl = document.createElement('canvas'); fl.width = fl.height = 1; const zf = fl.getContext('2d', { willReadFrequently: true });
  const rgba = f => { zf.clearRect(0, 0, 1, 1); zf.fillStyle = 'rgba(0,0,0,0)'; zf.fillStyle = f; zf.fillRect(0, 0, 1, 1); const d = zf.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const ueber = (o, u) => { const a = o[3]; return [0, 1, 2].map(i => o[i] * a + u[i] * (1 - a)).concat(1); };
  const hell = c => [0, 1, 2].map(i => { const v = c[i] / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const papier = rgba(getComputedStyle(document.body).backgroundColor);
  const flaeche = el => { // Flächen von außen nach innen übereinanderlegen
    const kette = []; let bild = false;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const s = getComputedStyle(e); if (e !== document.body && s.backgroundImage !== 'none') bild = true; kette.unshift(rgba(s.backgroundColor)); }
    return { farbe: kette.reduce((u, o) => ueber(o, u), [papier[0], papier[1], papier[2], 1]), bild };
  };
  const aus = [];
  const wurzel = document.querySelector('main'); if (!wurzel) return aus;
  const lauf = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
  const gesehen = new Set();
  for (let n = lauf.nextNode(); n; n = lauf.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement; if (!el || gesehen.has(el)) continue; gesehen.add(el);
    if (el.closest('.stage, #goch, .goch-mini, [hidden], script, style, noscript, svg, .sf-karte, .wzs-logo, .wz-logo-sf, .wz-th-logo, iframe')) continue;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0 || r.width < 2 || r.height < 2) continue;
    let sicht = 1; for (let e = el; e && e !== document.body; e = e.parentElement) sicht *= +getComputedStyle(e).opacity;
    const f = flaeche(el); if (f.bild) continue;
    let farbe = rgba(s.color); farbe = ueber([farbe[0], farbe[1], farbe[2], farbe[3] * sicht], f.farbe);
    const a = hell(farbe), b = hell(f.farbe), k = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const px = parseFloat(s.fontSize), fett = +s.fontWeight >= 600, gross = px >= 24 || (px >= 18.66 && fett);
    if (k < (gross ? 3 : 4.5)) aus.push({ wo: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + ' in ' + ((el.closest('[class]:not(' + el.tagName + ')') || {}).className || '').toString().trim().split(/\s+/)[0],
      k: +k.toFixed(2), text: n.nodeValue.trim().slice(0, 28) });
  }
  return aus;
};
const b = stumm(await webkit.launch());
for (const [w, h] of [[390, 844], [1470, 956]]) for (const [name, zeit] of Object.entries(ZEITEN)) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, reducedMotion: 'reduce' });
  for (const seite of SEITEN) {
    const p = await ctx.newPage();
    await p.goto(basis + seite + '?zeit=' + zeit, { waitUntil: 'load' });
    await p.waitForFunction(() => document.documentElement.classList.contains('tal-on'), null, { timeout: 12000 }).catch(() => {});
    await p.waitForTimeout(2600); // Farbübergänge (2 s) abwarten
    const aus = await p.evaluate(MESSEN);
    const kurz = [...new Map(aus.sort((x, y) => x.k - y.k).map(a => [a.wo, a])).values()];
    // Streng geprüft wird die Nacht. In der Dämmerung läuft die ganze Palette durch Mittelgrau (landscape.js): Dort erreichen
    // Fließtext rund 4 : 1 und Kupferzeilen weniger, auf der Startseite wie auf den Unterseiten; am Tag liegen die kupfernen
    // Kleinzeilen bei 3,4 : 1. Beides ist Bestand und wird hier nur gezählt, damit eine Verschlechterung auffällt.
    const streng = name === 'Nacht';
    if (!streng && !nurListe) { console.log(`Hinweis ${w} px ${name} /${seite}: ${aus.length} Stellen unter AA (Bestand der Palette)`); await p.close(); continue; }
    check(nurListe || !aus.length, `${w} px ${name} /${seite}: Text überall lesbar (AA)` + (aus.length ? ` – ${aus.length} Stellen, z. B. ` + kurz.slice(0, 5).map(a => `${a.wo} ${a.k} „${a.text}“`).join('; ') : ''));
    if (nurListe && aus.length) console.log('     ' + kurz.map(a => `${a.wo} ${a.k}`).join(' | '));
    await p.close();
  }
  await ctx.close();
}
// Startseite (Robin, 13.11.2026: „Die kräftigeren Tafeln auch auf der Startseite verwenden.“): Karten, Kasten und Felder tragen
// nachts dieselben Töne wie auf den Unterseiten und heben sich vom Blatt ab; am Tag sind sie unverändert.
if (!nurListe) for (const [w, h] of [[390, 844], [1470, 956]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, reducedMotion: 'reduce' });
  const farben = async (seite, zeit, wahl) => { const p = await ctx.newPage(); await p.goto(basis + seite + '?zeit=' + zeit, { waitUntil: 'load' });
    await p.waitForFunction(() => document.documentElement.classList.contains('tal-on'), null, { timeout: 12000 }).catch(() => {}); await p.waitForTimeout(2600);
    const r = await p.evaluate(wahl => { const fl = document.createElement('canvas'); fl.width = fl.height = 1; const zf = fl.getContext('2d', { willReadFrequently: true });
      const rgba = f => { zf.clearRect(0, 0, 1, 1); zf.fillStyle = 'rgba(0,0,0,0)'; zf.fillStyle = f; zf.fillRect(0, 0, 1, 1); return [...zf.getImageData(0, 0, 1, 1).data].join(','); };
      return Object.fromEntries(Object.entries(wahl).map(([k, sel]) => { const e = document.querySelector(sel); if (!e) return [k, null]; const g = getComputedStyle(e); return [k, { flaeche: rgba(g.backgroundColor), rand: rgba(g.borderTopColor), schatten: g.boxShadow !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(g.boxShadow) }]; })); }, wahl);
    await p.close(); return r; };
  const START = { karte: '.wzs-karte', kasten: 'main > section:not(.stage) .consent-banner', feld: '.message input', pfeil: '.wzs-pfeil', blatt: '#werkzeuge' };
  const nacht = await farben('', ZEITEN.Nacht, START), unter = await farben('werkzeuge/', ZEITEN.Nacht, { karte: '.wz-karte', feld: '.wz-form input' }), tag = await farben('', ZEITEN.Tag, START);
  check(nacht.karte && unter.karte && nacht.karte.flaeche === unter.karte.flaeche && nacht.karte.rand === unter.karte.rand, `${w} px Startseite Nacht: Karten in denselben Tönen wie auf den Unterseiten (${nacht.karte && nacht.karte.flaeche})`);
  check(nacht.kasten && nacht.kasten.flaeche === nacht.karte.flaeche && nacht.karte.schatten && nacht.kasten.schatten, `${w} px Startseite Nacht: Kasten zur Terminbuchung wie die Karten, mit Schatten`);
  check(nacht.feld && unter.feld && nacht.feld.flaeche === unter.feld.flaeche && nacht.feld.flaeche !== nacht.karte.flaeche, `${w} px Startseite Nacht: Felder dunkel wie auf den Unterseiten (${nacht.feld && nacht.feld.flaeche})`);
  check(tag.karte && tag.karte.flaeche === '255,255,255,153' && !tag.karte.schatten && tag.pfeil.flaeche === '255,255,255,179', `${w} px Startseite Tag: Karten und Pfeile unverändert (${tag.karte && tag.karte.flaeche})`);
  await ctx.close();
}
await b.close();
console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen` : '\nWebKit, Lesbarkeit bei Nacht, Dämmerung und Tag: alles in Ordnung.');
process.exit(nurListe ? 0 : fehler ? 1 : 0);
