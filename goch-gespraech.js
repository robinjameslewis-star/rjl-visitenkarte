// Gesprächsmodus auf dem Handy und „Goch zeigt“ (Robin, 23.10.2026). Ist im offenen Gespräch Stimme oder Spracheingabe an,
// rückt Goch auf schmalen Bildschirmen in den Fokus: Papier über der Seite, Goch groß oben, darunter das Gespräch. Führt
// eine Antwort zu einer Stelle der Startseite (zeigen, Worker: ZIELE), tritt Goch in den Hintergrund: kleiner Goch in der
// Ecke, das Gespräch als schmale Leiste, die Seite scrollt hin und hebt die Stelle kurz hervor. Ein Tipp auf den kleinen
// Goch holt ihn zurück, „Seite ansehen“ schickt ihn von sich aus in die Ecke. Auf großen Bildschirmen steht in der Antwort
// nur ein Verweis zur Stelle. Aktiv nur mit der Sprachfunktion (goch-stimme.js, data-goch-stimme="an").
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const scene = $('scene'), panel = $('goch'), mini = $('goch-mini'), zurSeite = $('goch-zur-seite');
  if (!scene || !panel || !mini || !zurSeite || !window.Goch || !window.GochStimme) return;
  const html = document.documentElement, schmal = matchMedia('(max-width: 720px)'), ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  const ZIELE = ['werkzeuge', 'workshops', 'ueber-mich', 'blog', 'newsletter', 'nachricht', 'grundsaetze'];
  const t = k => window.SiteLanguage.t(k);
  const stelle = ziel => $(ziel === 'grundsaetze' ? 'grundsaetze-' + (window.SiteLanguage.current === 'en' ? 'en' : 'de') : ziel);

  let modus = { mikro: false, laut: false }, lage = 'aus', gemerkt = 0; // lage: aus | fokus | unterwegs
  function setzen(neu) {
    if (neu === lage) return;
    const vorher = lage;
    lage = neu;
    html.classList.toggle('goch-fokus', neu === 'fokus');
    html.classList.toggle('goch-unterwegs', neu === 'unterwegs');
    if (neu === 'unterwegs') { const img = mini.querySelector('img'); if (!img.getAttribute('src')) img.src = img.dataset.src; }
    mini.hidden = neu !== 'unterwegs';
    zurSeite.hidden = neu !== 'fokus';
    if (neu === 'fokus') { if (vorher === 'aus') gemerkt = scrollY; scrollTo(0, 0); }
    if (neu === 'aus' && vorher === 'fokus') scrollTo(0, gemerkt);
    window.Goch.place();
  }
  function pruefen() {
    if (!(schmal.matches && !panel.hidden && (modus.mikro || modus.laut))) setzen('aus');
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
  zurSeite.addEventListener('click', () => setzen('unterwegs'));
  // Der kleine Goch wippt, solange Goch spricht (data-spricht an der Szene, goch-audio.js, bewegung)
  new MutationObserver(() => mini.classList.toggle('spricht', !!scene.dataset.spricht)).observe(scene, { attributes: true, attributeFilter: ['data-spricht'] });
})();
