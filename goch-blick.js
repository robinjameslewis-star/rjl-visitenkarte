// Blickkontakt (Robin, 23.10.2026): Mit eigener Einwilligung schaut Goch über die Kamera, ob jemand da ist, wo er ist und
// ob er zu ihm schaut – im eigenen Rahmen goch-kamera.html, der nur diese Zahlen meldet. Kommt jemand an den Bildschirm,
// bemerkt Goch ihn (blinzelt doppelt, richtet sich auf), zwitschert und spricht ihn an (fester Satz vom Worker: anlass
// „angekommen“, bei Rückkehr „zurueck“). Er wendet sich dem Gegenüber sichtbar zu, wird bei Blickkontakt aufmerksam und
// hört im Gesprächsmodus nur zu, wenn er angesehen wird. Keine Mimik, keine Gefühle, keine Wiedererkennung, nichts
// gespeichert, kein Bild verlässt das Gerät. Kein sichtbares Vorschaubild (störte, Robin 23.10.2026): Den Zustand zeigen
// der Schalter „Blickkontakt“ und die Kamera-Anzeige des Browsers. Aus mit „Blickkontakt“, beim Schließen, beim
// Tabwechsel und mit „Sprechen beenden“. Aktiv nur mit der Sprachfunktion (goch-stimme.js).
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const scene = $('scene'), panel = $('goch'), leiste = $('goch-sprache'), schalter = $('goch-blick-an'), platz = $('goch-kamera-platz');
  const einwilligung = $('goch-kamera-consent'), erlauben = $('goch-kamera-allow'), ablehnen = $('goch-kamera-deny'), log = $('goch-log');
  if (!scene || !panel || !schalter || !platz || !einwilligung || !window.GochStimme) return;
  const t = k => window.SiteLanguage.t(k);
  const koerper = window.GochStimme.koerper, input = $('goch-input');
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  // Wer länger als WIEDER_MS weg war, gilt beim Wiederkommen als neu angekommen; gegrüßt wird höchstens alle ABSTAND_MS.
  const WIEDER_MS = Math.max(500, +(lokal && new URL(location.href).searchParams.get('wiederda') || 20000)), ABSTAND_MS = Math.min(WIEDER_MS * 3, 120000);
  let erlaubt = false, an = false, bereit = false, rahmen = null, da = false, wegSeit = 0, herSeit = 0, zuletztHer = 0, hingewiesen = false;
  let neuDa = true, ersteSicht = true, angekommenSeit = 0, gegruesst = false, letzterGruss = -Infinity;

  const say = text => { const p = document.createElement('p'); p.className = 'goch-bubble goch-goch'; p.textContent = text; log.append(p); log.scrollTop = log.scrollHeight; };
  const nachziehen = () => { if (window.Goch && window.Goch.place) window.Goch.place(); };
  function zeigen() {
    schalter.setAttribute('aria-pressed', String(an));
    platz.hidden = !an;
    nachziehen();
  }
  function einschalten() {
    if (an) return;
    an = true; bereit = false; da = false; hingewiesen = false; neuDa = true; ersteSicht = true;
    rahmen = document.createElement('iframe');
    rahmen.src = 'goch-kamera.html?v=20261023';
    rahmen.allow = 'camera';
    rahmen.title = t('gochKameraTitel');
    rahmen.setAttribute('tabindex', '-1');
    platz.replaceChildren(rahmen);
    zeigen();
  }
  function ausschalten() {
    if (!an) return;
    an = false; bereit = false; da = false;
    if (rahmen) { try { rahmen.contentWindow.postMessage('stopp', location.origin); } catch (_) {} const r = rahmen; setTimeout(() => r.remove(), 150); }
    rahmen = null;
    delete scene.dataset.blickkontakt; delete scene.dataset.gegenueber; delete scene.dataset.kamera;
    koerper.richten(0);
    zeigen();
  }

  // Zahlen aus dem Rahmen: nur von dort und nur von dieser Seite
  addEventListener('message', e => {
    if (!rahmen || e.source !== rahmen.contentWindow || e.origin !== location.origin) return;
    const d = e.data || {};
    if (d.typ !== 'goch-blick') return;
    if (d.fehler) { ausschalten(); say(t('gochBlickFehler')); return; }
    if (d.bereit) { bereit = true; scene.dataset.kamera = 'bereit'; return; }
    const jetzt = performance.now();
    if (!d.da) {
      if (!wegSeit) wegSeit = jetzt;
      if (da && jetzt - wegSeit > 1500) { da = false; delete scene.dataset.gegenueber; delete scene.dataset.blickkontakt; koerper.richten(0); }
      if (wegSeit && jetzt - wegSeit > WIEDER_MS) neuDa = true;
      herSeit = 0;
      return;
    }
    wegSeit = 0;
    if (!da) { // bemerkt sein Gegenüber: doppelt blinzeln, kurz aufrichten
      da = true; angekommenSeit = jetzt; gegruesst = false;
      scene.dataset.gegenueber = '1';
      window.GochStimme.blinzeln(true);
    }
    // sichtbar zuwenden: sitzt das Gegenüber rechts, richtet sich Goch auf, links neigt er sich ihm zu
    const zu = Math.max(-1, Math.min(1, ((typeof d.x === 'number' ? d.x : .5) - .5) * 2));
    if (d.schautHer) {
      zuletztHer = jetzt;
      if (!herSeit) herSeit = jetzt;
      if (jetzt - herSeit > 400 && !scene.dataset.blickkontakt) { scene.dataset.blickkontakt = '1'; window.GochStimme.blinzeln(); }
    } else {
      herSeit = 0;
      if (jetzt - zuletztHer > 2000) delete scene.dataset.blickkontakt;
    }
    koerper.richten(zu * 2.6, scene.dataset.blickkontakt ? -1.2 : jetzt - angekommenSeit < 700 ? -1.6 : 0);
    ansprechen(d, jetzt);
  });

  // Jemand kommt an den Bildschirm: zwitschern und das Gespräch beginnen – sobald er herschaut (oder nach 1,5 s), nicht
  // wenn er gerade erst „Blickkontakt“ mitten im Gespräch eingeschaltet hat, nie während Goch spricht oder getippt wird.
  function ansprechen(d, jetzt) {
    if (!neuDa || gegruesst || !(d.schautHer || jetzt - angekommenSeit > 1500)) return;
    const begonnen = window.Goch.begonnen && window.Goch.begonnen();
    if (ersteSicht && begonnen) { neuDa = false; ersteSicht = false; return; } // war ja schon im Gespräch
    if (jetzt - letzterGruss < ABSTAND_MS || window.GochStimme.beschaeftigt() || (input && input.value.trim())) return;
    gegruesst = true; neuDa = false; ersteSicht = false; letzterGruss = jetzt;
    if (window.GochZwitschern && window.GochZwitschern.gruss) window.GochZwitschern.gruss();
    setTimeout(() => { if (an && window.Goch.begruessen) window.Goch.begruessen(begonnen ? 'zurueck' : 'angekommen'); }, 900);
  }

  // Für goch-stimme.js: zuhören nur, wenn Goch angesehen wird (oder die Kamera aus bzw. noch nicht bereit ist)
  window.GochBlick = {
    aufmerksam: () => !an || !bereit || performance.now() - zuletztHer < 2500,
    hinweisen() { if (!hingewiesen) { hingewiesen = true; say(t('gochBlickAnsehen')); } },
  };

  // Schalter und eigene Einwilligung
  schalter.addEventListener('click', () => {
    if (an) { ausschalten(); return; }
    if (!erlaubt) { einwilligung.hidden = false; leiste.hidden = true; erlauben.focus(); nachziehen(); return; }
    einschalten();
  });
  erlauben.addEventListener('click', () => { erlaubt = true; einwilligung.hidden = true; leiste.hidden = false; einschalten(); });
  ablehnen.addEventListener('click', () => { einwilligung.hidden = true; leiste.hidden = false; say(t('gochBlickDenied')); nachziehen(); });
  const ende = $('goch-stimme-ende');
  if (ende) ende.addEventListener('click', () => { ausschalten(); erlaubt = false; });
  new MutationObserver(() => { if (panel.hidden) { ausschalten(); einwilligung.hidden = true; } }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) ausschalten(); });
  addEventListener('pagehide', ausschalten);
})();
