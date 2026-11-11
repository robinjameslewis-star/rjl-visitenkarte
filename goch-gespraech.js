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
    if (neu === 'unterwegs') { const img = mini.querySelector('img'); if (!img.getAttribute('src')) img.src = img.dataset.src; }
    mini.hidden = neu !== 'unterwegs';
    zurSeite.hidden = neu !== 'fokus';
    if (neu === 'fokus') { zuletzt = scrollY; scrollTo(0, 0); } // zuletzt: wo die Seite stand, bevor Goch groß wurde
    if (neu === 'aus' && vorher === 'fokus') scrollTo(0, zuletzt);
    window.Goch.place();
  }
  // Der Besucher gibt die Seite frei: zurück an die Stelle, an der er war, bevor Goch groß wurde.
  function freigeben() { if (lage !== 'fokus') return; setzen('unterwegs'); scrollTo(0, zuletzt); }
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
  schmal.addEventListener('change', pruefen);
  mini.addEventListener('click', () => setzen('fokus'));
  zurSeite.addEventListener('click', freigeben);
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
    kopf.addEventListener('touchstart', e => { y0 = lage === 'aus' ? null : e.touches[0].clientY; }, { passive: true });
    kopf.addEventListener('touchmove', e => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0;
      if (dy > 36 && lage === 'fokus') { y0 = null; freigeben(); }
      else if (dy < -36 && lage === 'unterwegs') { y0 = null; setzen('fokus'); }
    }, { passive: true });
    kopf.addEventListener('touchend', () => { y0 = null; });
  }
  // Die schmale Leiste ist das eingeklappte Blatt: Ein Tipp darauf (nicht auf Knöpfe oder Verweise) klappt es wieder auf
  panel.addEventListener('click', e => { if (lage === 'unterwegs' && !e.target.closest('button, a, input, textarea')) setzen('fokus'); });
  // Der kleine Goch erscheint erst, wenn der große aus dem Bild ist – nie zwei Gochs zugleich
  if ('IntersectionObserver' in window) new IntersectionObserver(es => mini.classList.toggle('goch-mini-weg', es[es.length - 1].intersectionRatio > .35), { threshold: [0, .35, 1] }).observe(scene);
  // Der kleine Goch wippt, solange Goch spricht (data-spricht an der Szene, goch-audio.js, bewegung)
  new MutationObserver(() => mini.classList.toggle('spricht', !!scene.dataset.spricht)).observe(scene, { attributes: true, attributeFilter: ['data-spricht'] });
})();
