// Zwitschern (Robin, 23.10.2026): Goch macht dezent darauf aufmerksam, dass er sprechen kann.
// Sichtbar: kleine Noten und ein Schnabelzucken – einmal nach der Landung, danach höchstens alle 60 s, insgesamt höchstens
// dreimal je Besuch; vorbei, sobald der Besucher Goch öffnet. Bei reduzierter Bewegung nur die Noten, ohne Bewegung.
// Hörbar erst nach einer Handlung des Besuchers: leise beim Öffnen des Gesprächs und als Bestätigung beim Einschalten der
// Stimme (goch-stimme.js), mit Stummschalter; die Wahl „stumm“ merkt sich der Browser (localStorage rjl-goch-stumm).
// Ohne Tondatei (data-goch-signalton am <body>, Pfad ohne Endung) zwitschert Goch nur sichtbar.
// Aktiv nur mit data-goch-stimme="an" (zum Testen lokal ?stimme=an, ?signalton=…, ?zwitschertakt=ms).
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const scene = $('scene'), panel = $('goch'), noten = $('goch-noten'), stummKnopf = $('goch-stumm');
  if (!scene || !panel || !noten || scene.dataset.chat !== 'on') return;
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  function testwert(name) {
    if (!lokal) return null;
    const v = new URL(location.href).searchParams.get(name), key = 'rjl-goch-test-' + name;
    try { if (v != null) sessionStorage.setItem(key, v); return sessionStorage.getItem(key); } catch (_) { return v; }
  }
  if ((testwert('stimme') || document.body.dataset.gochStimme || '') !== 'an') return;

  const TAKT = Math.max(500, +(testwert('zwitschertakt') || 60000)), HOECHSTENS = 3, NACH_LANDUNG = 1500, DAUER = 2600;
  const LAUTSTAERKE = .35; // figuren/goch/figur.json, signalton.lautstaerke
  const tonBasis = testwert('signalton') || document.body.dataset.gochSignalton || '';

  // ---------- sichtbar ----------
  let gezeigt = 0, vorbei = false, timer = 0;
  function zwitschern() {
    timer = 0;
    if (vorbei || gezeigt >= HOECHSTENS) return;
    if (document.hidden || scene.dataset.state !== 'rest') { timer = setTimeout(zwitschern, TAKT); return; }
    gezeigt++;
    noten.hidden = false;
    noten.classList.remove('an'); void noten.offsetWidth; noten.classList.add('an');
    scene.classList.add('zwitschert');
    scene.dataset.zwitschern = String(gezeigt); // für Tests: wie oft schon
    setTimeout(() => { scene.classList.remove('zwitschert'); noten.classList.remove('an'); noten.hidden = true; }, DAUER);
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
  function hoerbar() {
    if (stumm || !tonBasis) return;
    try { const a = new Audio(datei()); a.volume = LAUTSTAERKE; a.play().catch(() => {}); } catch (_) {}
  }
  window.GochZwitschern = { bestaetigen: hoerbar };
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

  // Öffnen: Das sichtbare Zwitschern ist vorbei; leiser Gruß, wenn das Gespräch eben per Klick aufging.
  let geoeffnet = 0;
  new MutationObserver(() => {
    if (panel.hidden) return;
    geoeffnet = performance.now();
    vorbei = true; clearTimeout(timer); timer = 0;
    scene.classList.remove('zwitschert'); noten.classList.remove('an'); noten.hidden = true;
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  scene.addEventListener('click', () => { if (performance.now() - geoeffnet < 200) hoerbar(); });
})();
