// Zwitschern (Robin, 23.10.2026): Goch macht dezent darauf aufmerksam, dass er sprechen kann.
// Sichtbar: kleine Noten und ein Schnabelzucken – einmal nach der Landung, danach höchstens alle 60 s, insgesamt höchstens
// dreimal je Besuch; vorbei, sobald der Besucher Goch öffnet. Bei reduzierter Bewegung nur die Noten, ohne Bewegung.
// Hörbar erst nach einer Handlung des Besuchers: leise beim Öffnen des Gesprächs und als Bestätigung beim Einschalten der
// Stimme (goch-stimme.js), mit Stummschalter; die Wahl „stumm“ merkt sich der Browser (localStorage rjl-goch-stumm).
// Im offenen Gespräch (Robin, 23.10.2026): zu Beginn und in Pausen ab und zu ein Zwitschern – unregelmäßig, höchstens
// viermal je Gespräch, nie während Goch versteht, denkt oder spricht, nie während jemand spricht oder tippt; hörbar nur mit
// „Goch spricht“ und nicht stumm, sonst nur die Noten.
// Ohne Tondatei (data-goch-signalton am <body>, Pfad ohne Endung) zwitschert Goch nur sichtbar.
// Aktiv nur mit data-goch-stimme="an" (zum Testen lokal ?stimme=an, ?signalton=…, ?zwitschertakt=ms, ?pausentakt=ms).
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const scene = $('scene'), panel = $('goch'), noten = $('goch-noten'), stummKnopf = $('goch-stumm'), input = $('goch-input');
  if (!scene || !panel || !noten || scene.dataset.chat !== 'on') return;
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  function testwert(name) {
    if (!lokal) return null;
    const v = new URL(location.href).searchParams.get(name), key = 'rjl-goch-test-' + name;
    try { if (v != null) sessionStorage.setItem(key, v); return sessionStorage.getItem(key); } catch (_) { return v; }
  }
  if ((testwert('stimme') || document.body.dataset.gochStimme || '') !== 'an') return;

  const TAKT = Math.max(500, +(testwert('zwitschertakt') || 60000)), HOECHSTENS = 3, NACH_LANDUNG = 1500, DAUER = 2600;
  const PAUSE = Math.max(500, +(testwert('pausentakt') || 30000)), JE_GESPRAECH = 4; // in Pausen: nach 1–2,3 × PAUSE
  const LAUTSTAERKE = .35; // figuren/goch/figur.json, signalton.lautstaerke
  const tonBasis = testwert('signalton') || document.body.dataset.gochSignalton || '';

  // ---------- sichtbar ----------
  let gezeigt = 0, vorbei = false, timer = 0, ausblenden = 0;
  function noteZeigen() {
    clearTimeout(ausblenden);
    noten.hidden = false;
    noten.classList.remove('an'); void noten.offsetWidth; noten.classList.add('an');
    scene.classList.add('zwitschert');
    ausblenden = setTimeout(() => { scene.classList.remove('zwitschert'); noten.classList.remove('an'); noten.hidden = true; }, DAUER);
  }
  function zwitschern() {
    timer = 0;
    if (vorbei || gezeigt >= HOECHSTENS) return;
    if (document.hidden || scene.dataset.state !== 'rest') { timer = setTimeout(zwitschern, TAKT); return; }
    gezeigt++;
    noteZeigen();
    scene.dataset.zwitschern = String(gezeigt); // für Tests: wie oft schon
    if (gezeigt < HOECHSTENS) timer = setTimeout(zwitschern, TAKT);
  }
  const beiLandung = () => { if (!timer && !gezeigt && !vorbei && scene.dataset.state === 'rest') timer = setTimeout(zwitschern, NACH_LANDUNG); };
  new MutationObserver(beiLandung).observe(scene, { attributes: true, attributeFilter: ['data-state'] });
  beiLandung();

  // ---------- hörbar, nur nach einer Handlung ----------
  let stumm = false;
  try { stumm = localStorage.getItem('rjl-goch-stumm') === '1'; } catch (_) {}
  function datei() {
    if (/^data:/.test(tonBasis)) return tonBasis;
    return document.createElement('audio').canPlayType('audio/ogg; codecs=opus') ? tonBasis + '.ogg' : tonBasis + '.mp3';
  }
  function hoerbar(lautstaerke = LAUTSTAERKE) {
    if (stumm || !tonBasis) return;
    try { const a = new Audio(datei()); a.volume = lautstaerke; a.play().catch(() => {}); } catch (_) {}
  }
  // gruss: Goch bemerkt jemanden (goch-blick.js) – Noten, hörbar nur mit Stimme
  window.GochZwitschern = { bestaetigen: () => hoerbar(),
    gruss() { noteZeigen(); scene.dataset.gruss = String(+(scene.dataset.gruss || 0) + 1); if (window.GochStimme && window.GochStimme.laut()) hoerbar(LAUTSTAERKE * .8); } };
  if (tonBasis && stummKnopf) {
    // Der Knopf nennt, was er tut: „Zwitschern aus“ bzw. „Zwitschern an“ (Fußzeile des Gesprächs)
    const zeigen = () => { stummKnopf.textContent = window.SiteLanguage.t(stumm ? 'gochStummAn' : 'gochStummAus'); };
    stummKnopf.hidden = false; zeigen();
    window.addEventListener('site-languagechange', zeigen);
    stummKnopf.addEventListener('click', () => {
      stumm = !stumm; zeigen();
      try { if (stumm) localStorage.setItem('rjl-goch-stumm', '1'); else localStorage.removeItem('rjl-goch-stumm'); } catch (_) {}
    });
  }

  // Öffnen: Das Zwitschern zum Aufmerksammachen ist vorbei; leiser Gruß (Noten, und hörbar, wenn das Gespräch eben per
  // Klick aufging). Danach in Pausen ab und zu.
  let geoeffnet = 0, pausenTimer = 0, imGespraech = 0;
  const still = () => !document.hidden && !panel.hidden && scene.dataset.state === 'rest' && !panel.querySelector('.goch-thinking')
    && !(window.GochStimme && window.GochStimme.beschaeftigt()) && !(input && input.value.trim());
  function planen() { clearTimeout(pausenTimer); if (!panel.hidden && imGespraech < JE_GESPRAECH) pausenTimer = setTimeout(inDerPause, PAUSE * (1 + Math.random() * 1.3)); }
  function inDerPause() {
    if (panel.hidden) return;
    if (still()) {
      imGespraech++;
      scene.dataset.pausenZwitschern = String(imGespraech); // für Tests
      noteZeigen();
      if (window.GochStimme && window.GochStimme.laut()) hoerbar(LAUTSTAERKE * .7);
    }
    planen();
  }
  new MutationObserver(() => {
    if (panel.hidden) { clearTimeout(pausenTimer); return; }
    geoeffnet = performance.now();
    vorbei = true; clearTimeout(timer); timer = 0;
    imGespraech = 0; delete scene.dataset.pausenZwitschern; noteZeigen(); planen();
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  scene.addEventListener('click', () => { if (performance.now() - geoeffnet < 200) hoerbar(); });
  // Jede Handlung im Gespräch schiebt das nächste Pausenzwitschern hinaus: Es kommt nur, wenn wirklich Ruhe ist.
  window.addEventListener('goch-fertig', planen);
  if (input) input.addEventListener('input', planen);
})();
