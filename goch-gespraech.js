// Gesprächsmodus auf dem Handy und „Goch zeigt“ (Robin, 23.10.2026). Ist im offenen Gespräch Stimme oder Spracheingabe an,
// rückt Goch auf schmalen Bildschirmen in den Fokus: Papier über der Seite, Goch groß oben, darunter das Gespräch. Führt
// eine Antwort zu einer Stelle der Startseite (zeigen, Worker: ZIELE), tritt Goch in den Hintergrund: kleiner Goch in der
// Ecke, das Gespräch als schmale Leiste, die Seite scrollt hin und hebt die Stelle kurz hervor. Ein Tipp auf den kleinen
// Goch holt ihn zurück, „Seite ansehen“ schickt ihn von sich aus in die Ecke. Auf großen Bildschirmen steht in der Antwort
// nur ein Verweis zur Stelle. Aktiv nur mit der Sprachfunktion (goch-stimme.js, data-goch-stimme="an").
// Den großen Goch aufheben (Robin, 11.11.2026): Tipp oder Wisch neben dem Blatt, Wisch nach unten am Griff des Blatts oder
// „Seite ansehen“, Wisch über den großen Goch. Die Seite steht dann wieder dort, wo der Besucher war, und scrollt wie gewohnt; Goch hört weiter zu und
// antwortet in der Leiste. Zurück: Tipp auf die Leiste oder den kleinen Goch, Wisch nach oben am Griff. Nie durch Tippen
// ins Textfeld, die Tastatur oder Scrollen im Verlauf.
// Tablet und Rechner (über 720 px, 11.11.2026): kein Vollbild. Das Blatt hängt neben Goch; scrollt Goch aus dem Bild, läuft
// es als festes Blatt unten rechts mit (html.goch-angeheftet), darüber der kleine Goch auf seinem Ast vom rechten Rand.
// „Seite ansehen“ oder der Griff verkleinern es zur Zeile (html.goch-zeile), ein Tipp darauf klappt es wieder auf, ein Tipp
// auf den kleinen Goch führt zurück zu Goch.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const scene = $('scene'), panel = $('goch'), mini = $('goch-mini'), zurSeite = $('goch-zur-seite');
  if (!scene || !panel || !mini || !zurSeite || !window.Goch || !window.GochStimme) return;
  const html = document.documentElement, schmal = matchMedia('(max-width: 720px)'), ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  const ZIELE = ['werkzeuge', 'workshops', 'ueber-mich', 'blog', 'newsletter', 'nachricht', 'grundsaetze'];
  const t = k => window.SiteLanguage.t(k);
  const stelle = ziel => $(ziel === 'grundsaetze' ? 'grundsaetze-' + (window.SiteLanguage.current === 'en' ? 'en' : 'de') : ziel);

  let modus = { mikro: false, laut: false, einmal: false }, lage = 'aus', zuletzt = 0; // lage: aus | fokus | unterwegs
  function setzen(neu) {
    if (neu === lage) return;
    const vorher = lage;
    lage = neu;
    html.classList.toggle('goch-fokus', neu === 'fokus');
    html.classList.toggle('goch-unterwegs', neu === 'unterwegs');
    if (neu === 'unterwegs') miniLaden();
    mini.hidden = neu !== 'unterwegs';
    zurSeite.hidden = neu !== 'fokus';
    if (neu === 'fokus') { zuletzt = scrollY; scrollTo(0, 0); } // zuletzt: wo die Seite stand, bevor Goch groß wurde
    if (neu === 'aus' && vorher === 'fokus') scrollTo(0, zuletzt);
    window.Goch.place();
    hoehe(); untenBald();
  }
  // Der Besucher gibt die Seite frei: zurück an die Stelle, an der er war, bevor Goch groß wurde.
  function freigeben() { if (lage !== 'fokus') return; setzen('unterwegs'); scrollTo(0, zuletzt); }
  // Kleiner Goch: Vogel und Ast laden erst, wenn er gebraucht wird. Danach bekommt er dieselben beweglichen Teile wie der
  // große (goch-leben.js) und bewegt den Schnabel synchron zur Stimme (data-schnabel an der Szene, goch-stimme.js). Er steht
  // sonst still. Bei reduzierter Bewegung bleibt das ruhige Bild.
  let miniLeben = null, miniBaut = false;
  const schnabel = () => { if (miniLeben) { const s = scene.dataset.schnabel; miniLeben.kopf(s === 'halb' || s === 'offen' ? s : 'rest'); mini.dataset.schnabel = s || 'zu'; } };
  function miniLaden() {
    mini.querySelectorAll('.goch-mini-vogel, .goch-mini-ast').forEach(img => { if (!img.getAttribute('src')) img.src = img.dataset.src; });
    if (miniBaut || ruhig.matches || !window.GochLeben) return;
    miniBaut = true;
    const basis = (window.RJLWurzel || '') + 'figuren/goch/';
    fetch(basis + 'figur.json').then(r => r.ok ? r.json() : null).then(figur => {
      const a = figur && figur.animation, t = a && a.teile, s = a && a.posen && a.posen.sitzend;
      if (!t || !s) return;
      const leben = window.GochLeben.bauen({ ziel: mini.querySelector('.goch-mini-tier'), basis, teile: t, breite: s.breite, hoehe: s.hoehe,
        bereit: () => { mini.dataset.leben = '1'; leben.posenLaden(); miniLeben = leben; schnabel(); } });
      leben.laden();
    }).catch(() => {});
  }
  new MutationObserver(schnabel).observe(scene, { attributes: true, attributeFilter: ['data-schnabel'] });
  // ---------- Breite Bildschirme: mitlaufendes Blatt ----------
  let breit = '', sichtbar = 1; // breit: '' | 'blatt' | 'zeile'; sichtbar: Anteil des großen Goch im Fenster
  function breitSetzen(neu) {
    if (neu === breit) return;
    breit = neu;
    html.classList.toggle('goch-angeheftet', !!neu);
    html.classList.toggle('goch-zeile', neu === 'zeile');
    if (neu) miniLaden();
    if (lage === 'aus') { mini.hidden = !neu; zurSeite.hidden = neu !== 'blatt'; }
    window.Goch.place();
    hoehe();
  }
  function breitPruefen() {
    if (schmal.matches || panel.hidden) { breitSetzen(''); return; }
    if (!breit && sichtbar < .1) breitSetzen('blatt');      // Goch ist aus dem Bild
    else if (breit && sichtbar > .5) breitSetzen('');       // Goch ist wieder da: Das Blatt hängt wieder an seinem Ast
  }
  // Der kleine Goch sitzt über dem Blatt: dessen Höhe als --goch-blatt-h
  const hoehe = () => { if (breit || lage !== 'aus') html.style.setProperty('--goch-blatt-h', panel.offsetHeight + 'px'); else html.style.removeProperty('--goch-blatt-h'); };
  // Leiste des Browsers am unteren Rand (Safari am iPhone, Robin 11.11.2026: sie schwebte über der Begleitleiste und verdeckte
  // „Pause“): Was das sichtbare Fenster unten kürzer ist als das Fenster der Seite, rückt das Blatt als --goch-unten nach oben.
  // Nur bis 140 px – die Tastatur ist höher und hebt das Blatt nicht an; nicht beim Zoomen. Lokal zum Prüfen: ?unten=80.
  const vv = window.visualViewport, lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const probe = lokal ? +(new URL(location.href).searchParams.get('unten') || 0) : 0;
  let untenWartet = false;
  function unten() {
    untenWartet = false;
    let d = probe;
    if (!d && vv && Math.abs(vv.scale - 1) < .01) d = Math.round(html.clientHeight - vv.height - vv.offsetTop);
    html.style.setProperty('--goch-unten', (d > 0 && d <= 140 ? d : 0) + 'px');
  }
  const untenBald = () => { if (!untenWartet && !panel.hidden) { untenWartet = true; requestAnimationFrame(unten); } };
  if (vv) { vv.addEventListener('resize', untenBald); vv.addEventListener('scroll', untenBald); }
  window.addEventListener('scroll', untenBald, { passive: true });
  new MutationObserver(untenBald).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  if ('ResizeObserver' in window) new ResizeObserver(hoehe).observe(panel);
  new MutationObserver(breitPruefen).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  function pruefen() {
    // Eine einzelne gesprochene Frage (Mikrofon-Symbol, modus.einmal) vergrößert Goch nicht.
    if (!(schmal.matches && !panel.hidden && ((modus.mikro && !modus.einmal) || modus.laut))) setzen('aus');
    else if (lage === 'aus') setzen('fokus');
  }
  function zeigen(ziel) {
    const el = stelle(ziel);
    if (!el) return;
    if (lage === 'fokus') setzen('unterwegs');
    el.scrollIntoView({ behavior: ruhig.matches ? 'auto' : 'smooth', block: 'start' });
    el.classList.remove('goch-gezeigt'); void el.offsetWidth; el.classList.add('goch-gezeigt');
    setTimeout(() => el.classList.remove('goch-gezeigt'), 3200);
  }
  // Für goch.js: Verweis in der Antwort („Werkzeuge ansehen“), führt zur Stelle
  window.GochZeigen = {
    link(ziel) {
      if (!ZIELE.includes(ziel) || !stelle(ziel)) return document.createTextNode('');
      const a = document.createElement('a');
      a.className = 'goch-zeigen'; a.href = '#' + stelle(ziel).id; a.textContent = t('gochZiel_' + ziel.replace('-', '_'));
      a.addEventListener('click', e => { e.preventDefault(); zeigen(ziel); });
      return a;
    },
  };
  window.addEventListener('goch-modus', e => { modus = e.detail; pruefen(); });
  // Im Gesprächsmodus führt die Seite von selbst hin, während Goch spricht
  window.addEventListener('goch-antwort', e => { const z = e.detail && e.detail.zeigen; if (lage !== 'aus' && ZIELE.includes(z)) zeigen(z); });
  schmal.addEventListener('change', () => { pruefen(); breitPruefen(); });
  mini.addEventListener('click', () => { if (breit) scrollTo({ top: 0, behavior: ruhig.matches ? 'auto' : 'smooth' }); else setzen('fokus'); });
  zurSeite.addEventListener('click', () => { if (breit) breitSetzen('zeile'); else freigeben(); });
  // Neben dem Blatt: Tipp, Wisch oder Mausrad auf dem Papier gibt die Seite frei
  const papier = $('goch-papier'), kopf = panel.querySelector('.goch-head');
  if (papier) {
    // Ist das Textfeld aktiv, schließt der Tipp daneben nur die Tastatur
    let schrieb = false; // beim Aufsetzen gemerkt: Der Browser nimmt dem Textfeld den Fokus schon vor dem Klick
    papier.addEventListener('pointerdown', () => { const a = document.activeElement; schrieb = !!a && panel.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName); });
    papier.addEventListener('click', () => { if (schrieb) { schrieb = false; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } else freigeben(); });
    papier.addEventListener('touchmove', freigeben, { passive: true });
    papier.addEventListener('wheel', freigeben, { passive: true });
  }
  // Auch ein senkrechter Wisch über den großen Goch gibt frei (er füllt das obere Drittel); der Tipp auf ihn bleibt wie bisher
  let sy = null;
  scene.addEventListener('touchstart', e => { sy = lage === 'fokus' ? e.touches[0].clientY : null; }, { passive: true });
  scene.addEventListener('touchmove', e => { if (sy !== null && Math.abs(e.touches[0].clientY - sy) > 36) { sy = null; freigeben(); } }, { passive: true });
  scene.addEventListener('touchend', () => { sy = null; });
  // Griff am Blatt: nach unten wischen gibt frei, nach oben holt Goch zurück
  if (kopf) {
    let y0 = null;
    // Als Kapsel (unterwegs, Zeile) zählt der Wisch nach oben überall auf ihr; im Blatt nur am Griff
    const kapsel = () => lage === 'unterwegs' || breit === 'zeile';
    panel.addEventListener('touchstart', e => { y0 = (lage === 'aus' && !breit) || !(kapsel() || e.target.closest('.goch-head')) ? null : e.touches[0].clientY; }, { passive: true });
    panel.addEventListener('touchmove', e => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0;
      if (breit) { if (dy > 36 && breit === 'blatt') { y0 = null; breitSetzen('zeile'); } else if (dy < -36 && breit === 'zeile') { y0 = null; breitSetzen('blatt'); } return; }
      if (dy > 36 && lage === 'fokus') { y0 = null; freigeben(); }
      else if (dy < -36 && lage === 'unterwegs') { y0 = null; setzen('fokus'); }
    }, { passive: true });
    panel.addEventListener('touchend', () => { y0 = null; });
  }
  // Die schmale Leiste ist das eingeklappte Blatt: Ein Tipp darauf (nicht auf Knöpfe oder Verweise) klappt es wieder auf
  panel.addEventListener('click', e => {
    if (e.target.closest('button, a, input, textarea')) return;
    if (lage === 'unterwegs') setzen('fokus'); else if (breit === 'zeile') breitSetzen('blatt');
  });
  // Der kleine Goch erscheint erst, wenn der große aus dem Bild ist – nie zwei Gochs zugleich
  if ('IntersectionObserver' in window) new IntersectionObserver(es => {
    sichtbar = es[es.length - 1].intersectionRatio;
    mini.classList.toggle('goch-mini-weg', sichtbar > .35);
    breitPruefen();
  }, { threshold: [0, .1, .35, .5, 1] }).observe(scene);
  // Der kleine Goch wippt, solange Goch spricht (data-spricht an der Szene, goch-audio.js, bewegung)
  new MutationObserver(() => mini.classList.toggle('spricht', !!scene.dataset.spricht)).observe(scene, { attributes: true, attributeFilter: ['data-spricht'] });
})();
