// Goch lebt (Robin, 24.10.2026): Kopf und Schwanz sind eigene Teile aus der Sitzpose (tools/figur-teile.py, figur.json
// animation.teile). Die Seite bewegt sie einzeln wie bei einem echten Rotkehlchen: kurze, ruckartige Kopfbewegungen mit
// Pausen, Knicksen mit Schwanzzucken, Blinzeln, kaum sichtbares Atmen. Schnabel und Blinzeln wechseln nur den Kopf. Nur transform
// und opacity (Grafikkarte, kein Video). Die Teile laden erst, wenn Goch sitzt (rund 90 KB, Schnabelköpfe erst mit der
// Stimme); bis dahin, ohne Skript und bei reduzierter Bewegung bleibt die Sitzpose. Startseite: baut sich selbst in
// #scene; Messegerät: figur.js ruft GochLeben.bauen.
(() => {
  'use strict';
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  const zufall = (a, b) => a + Math.random() * (b - a);
  // Posen aus figur.json und ihre Namen in der Szene (wie NAMEN in figur.js)
  const NAMEN = { sitzend: 'rest', 'schnabel-halb': 'halb', 'schnabel-offen': 'offen', blinzelnd: 'blinzeln' };

  // Eigene Regeln, damit Startseite und Messegerät dieselben haben. Die Füße bleiben beim Knicksen und Atmen auf dem
  // Ast (Drehpunkt auf der Fußlinie).
  function regeln() {
    if (document.getElementById('goch-leben-css')) return;
    const s = document.createElement('style');
    s.id = 'goch-leben-css';
    s.textContent = `
.leben { position: absolute; left: 0; top: 0; width: 100%; display: none; pointer-events: none; transform-origin: 44% 94%; }
.leben[data-an] { display: block; animation: leben-atmen 1.5s ease-in-out infinite alternate; }
.leben-knicks, .leben-glied, .leben-teil { position: absolute; left: 0; top: 0; width: 100%; height: 100%; max-width: none; }
.leben-knicks { transform-origin: 44% 94%; transition: transform 170ms ease-out; }
.leben-knicks[data-knickst] { transform: scaleY(.965) skewX(1.2deg); transition: transform 100ms ease-in; }
.leben-glied { transition: transform 70ms ease-out; will-change: transform; }
.leben-teil { opacity: 1; }
.leben-koerper { clip-path: inset(0 0 2.5% 0); }
@keyframes leben-atmen { to { transform: scaleY(1.004) scaleX(.998); } }
@media (prefers-reduced-motion: reduce) { .leben { display: none !important; } }`;
    document.head.append(s);
  }

  // Baut die Teile in `ziel` (Element über der Sitzpose, gleiche Breite). basis: Ordner des Figurenpakets.
  // sitzt(): darf sich die Figur gerade bewegen (Startseite: nicht im Flug). bereit(): Teile geladen, Sitzpose ausblenden.
  function bauen({ ziel, basis, teile, breite, hoehe, sitzt = () => true, bereit = () => {} }) {
    regeln();
    const pz = (v, gesamt) => (v / gesamt * 100).toFixed(3) + '%';
    const ordner = basis + teile.ordner;
    const huelle = document.createElement('span');
    huelle.className = 'leben'; huelle.setAttribute('aria-hidden', 'true');
    huelle.style.aspectRatio = breite + ' / ' + hoehe;
    const knicks = document.createElement('span'); knicks.className = 'leben-knicks';
    const bild = (datei, klasse) => {
      const i = document.createElement('img');
      i.className = 'leben-teil' + (klasse ? ' ' + klasse : ''); i.alt = ''; i.decoding = 'async'; i.draggable = false;
      i.dataset.src = ordner + datei;
      return i;
    };
    const glied = (name, cfg) => {
      const g = document.createElement('span');
      g.className = 'leben-glied leben-' + name;
      g.style.transformOrigin = pz(cfg.drehpunkt[0], breite) + ' ' + pz(cfg.drehpunkt[1], hoehe);
      return g;
    };
    const koerper = bild(teile.koerper, 'leben-koerper');
    const schwanz = glied('schwanz', teile.schwanz); schwanz.append(bild(teile.schwanz.datei));
    const kopf = glied('kopf', teile.kopf);
    const koepfe = {};
    for (const [pose, datei] of Object.entries(teile.kopf.posen || {})) {
      if (!NAMEN[pose]) continue;
      const i = bild(datei); i.dataset.kopf = NAMEN[pose]; i.style.opacity = NAMEN[pose] === 'rest' ? '1' : '0';
      kopf.append(koepfe[NAMEN[pose]] = i);
    }
    knicks.append(koerper, schwanz, kopf);
    huelle.append(knicks);
    ziel.append(huelle);

    const W = teile.kopf.winkel || 6, WS = teile.schwanz.winkel || 8;
    let aktiv = false, an = false, timer = 0, basisWinkel = 0, lauscht = false, spricht = false, pegel = 0;
    const kopfWinkel = (grad, ms) => { kopf.style.transitionDuration = ms + 'ms'; kopf.style.transform = 'rotate(' + grad.toFixed(2) + 'deg)'; };
    const schwanzWinkel = (grad, ms) => { schwanz.style.transitionDuration = ms + 'ms'; schwanz.style.transform = 'rotate(' + grad.toFixed(2) + 'deg)'; };
    const laden = img => {
      if (!img.getAttribute('src')) img.src = img.dataset.src;
      return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    };
    const darf = () => aktiv && an && !ruhig.matches && !document.hidden && sitzt();

    // Ruheverhalten: alle ein bis drei Sekunden eine kleine Handlung – meist ein Kopfruck (schnell hin, dann still),
    // manchmal ein Knicks mit gehobenem Schwanz, ein Schwanzzucken oder ein Blinzeln, oft gar nichts.
    function takt() {
      clearTimeout(timer);
      if (!an) return;
      timer = setTimeout(() => { if (darf() && !spricht && !lauscht) handlung(); takt(); }, zufall(900, 3200));
    }
    function handlung() {
      const r = Math.random();
      if (r < .48) { basisWinkel = Math.random() < .3 ? 0 : zufall(-W, W * .6); kopfWinkel(basisWinkel, 70); }
      else if (r < .64) knicksen();
      else if (r < .82) schwanzZucken(Math.random() < .3);
      else if (r < .94) blinzeln();
    }
    function blinzeln() {
      if (!steuerung.kopf('blinzeln')) return;
      setTimeout(() => { if (!spricht) steuerung.kopf('rest'); }, 110);
    }
    function knicksen() {
      knicks.dataset.knickst = '1'; schwanzWinkel(-WS, 90);
      setTimeout(() => { delete knicks.dataset.knickst; }, 120);
      setTimeout(() => schwanzWinkel(0, 220), 170);
    }
    function schwanzZucken(doppelt) {
      schwanzWinkel(-zufall(WS * .5, WS), 70);
      setTimeout(() => { schwanzWinkel(0, 170); if (doppelt) setTimeout(() => schwanzZucken(false), 230); }, 110);
    }

    const steuerung = {
      // Körper, Schwanz und Kopf laden; danach übernehmen die Teile die Sitzpose
      async laden() {
        await Promise.all([koerper, schwanz.firstChild, koepfe.rest, koepfe.blinzeln].filter(Boolean).map(laden));
        if (!koerper.naturalWidth || !koepfe.rest || !koepfe.rest.naturalWidth) return false;
        aktiv = true; huelle.dataset.an = '1'; bereit();
        return true;
      },
      // Schnabel- und Blinzelköpfe (erst mit der Stimme, goch-stimme.js posenLaden)
      posenLaden() { Object.values(koepfe).forEach(laden); },
      aktiv: () => aktiv,
      start() { an = true; takt(); },
      stopp() { an = false; clearTimeout(timer); kopfWinkel(0, 160); schwanzWinkel(0, 160); },
      // Kopf in einer Pose zeigen ('rest', 'halb', 'offen', 'blinzeln'); false, wenn es den Kopf (noch) nicht gibt
      kopf(pose) {
        const img = koepfe[pose];
        if (!aktiv || !img || !img.complete || !img.naturalWidth) return false;
        Object.values(koepfe).forEach(i => { i.style.opacity = i === img ? '1' : '0'; });
        return true;
      },
      // Mit der Stimme nickt der Kopf leicht (je Bild, goch-audio.js bewegung)
      stimme(rms) {
        if (!darf()) return;
        spricht = true;
        pegel = pegel * .7 + rms * .3;
        kopfWinkel(basisWinkel * .4 - Math.min(2.5, pegel * 14), 80);
      },
      ende() { spricht = false; pegel = 0; if (aktiv) kopfWinkel(lauscht ? -W * .7 : basisWinkel * .4, 160); },
      // Zuhören: Kopf aufmerksam leicht gesenkt
      lauschen(ja) { lauscht = !!ja; if (aktiv && !ruhig.matches) kopfWinkel(lauscht ? -W * .7 : 0, 120); },
    };
    return steuerung;
  }

  // Steuerung für eine Szene oder Bühne (goch-stimme.js, goch-audio.js); Startseite und figur.js hängen sie dort an
  const fuer = el => { for (let e = el; e; e = e.parentElement) if (e.__gochLeben) return e.__gochLeben; return null; };

  window.GochLeben = { bauen, fuer };

  // Startseite: in die Szene über der Sitzpose; Teile laden, sobald Goch gelandet ist
  const scene = document.getElementById('scene'), tilt = scene && scene.querySelector('.bird-tilt');
  if (!scene || !tilt || ruhig.matches) return;
  fetch('figuren/goch/figur.json').then(r => r.ok ? r.json() : null).then(figur => {
    const a = figur && figur.animation, t = a && a.teile, s = a && a.posen && a.posen.sitzend;
    if (!t || !s) return;
    const leben = bauen({ ziel: tilt, basis: 'figuren/goch/', teile: t, breite: s.breite, hoehe: s.hoehe,
      sitzt: () => scene.dataset.state === 'rest',
      // war die Stimme schon vor der Landung an (ganze Schnabelposen angefordert), gleich auch die Schnabelköpfe laden
      bereit: () => { scene.dataset.leben = '1'; if (scene.querySelector('.bird-mund[src]')) leben.posenLaden(); } });
    scene.__gochLeben = leben;
    // Zuhören (goch-stimme.js setzt data-lauscht, solange keine eigene Pose dafür da ist)
    new MutationObserver(() => leben.lauschen(!!scene.dataset.lauscht)).observe(scene, { attributes: true, attributeFilter: ['data-lauscht'] });
    let gestartet = false;
    const los = () => {
      if (gestartet || scene.dataset.state !== 'rest') return;
      gestartet = true; beobachter.disconnect();
      leben.laden().then(ok => { if (ok) leben.start(); });
    };
    const beobachter = new MutationObserver(los);
    beobachter.observe(scene, { attributes: true, attributeFilter: ['data-state'] });
    los();
  }).catch(() => {});
})();
