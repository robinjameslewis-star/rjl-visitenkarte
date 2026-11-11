// Goch auf den Unterseiten („Ein Tal“, Schritt 4, 11.11.2026). Die Seitenrahmen (worker/src/werkzeug.js rahmen, blog.js
// shell) tragen nur einen Himmelsstreifen mit festem Platz (#goch-kopf) und dieses Skript. Nach dem ersten Bild der Seite
// holt es alles Weitere aus der Startseite – dieselbe Quelle wie dort, nichts wird doppelt gepflegt:
//   – Schalter und Endpunkt aus deren <body> (schaltet die Redaktion Goch aus, ist er überall aus),
//   – Vogel, Gesprächsblatt, kleiner Goch als Markup, die Stile zwischen den Marken „goch-seite:an“ und „goch-seite:aus“,
//   – die Skripte des Gesprächs mit ihren Versionsangaben.
// Goch sitzt dann auf seinem Ast, der vom rechten Rand kommt; ein Tipp öffnet das Gespräch als Blatt. Er begrüßt nicht von
// selbst und stellt keine Anfrage, bevor der Besucher fragt. Ohne Skript, ohne Netz oder mit ausgeschaltetem Goch bleibt
// der Streifen leer und die Seite wie zuvor.
(() => {
  'use strict';
  const skript = document.currentScript, platz = document.getElementById('goch-kopf');
  if (!skript || !platz || window.RJLWurzel) return;
  const wurzel = new URL('.', skript.src).href; // Adresse der Wurzel der Website, mit Schrägstrich am Ende
  const SKRIPTE = ['bird-flight.js', 'language.js', 'goch.js', 'goch-audio.js', 'goch-leben.js', 'goch-stimme.js', 'goch-gespraech.js'];
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const absolut = v => /^([a-z]+:|\/|#)/i.test(v);

  async function holen() {
    let text;
    try { const r = await fetch(wurzel + 'index.html'); if (!r.ok) return; text = await r.text(); } catch (_) { return; }
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const quelle = { scene: doc.getElementById('scene'), blatt: doc.getElementById('goch'), mini: doc.getElementById('goch-mini'), papier: doc.getElementById('goch-papier') };
    if (!quelle.scene || !quelle.blatt || !quelle.mini || !quelle.papier) return;
    // Schalter der Redaktion; lokal lässt sich Goch wie auf der Startseite mit ?goch=… prüfen (goch.js, endpointFrom)
    const schalter = doc.body.dataset;
    let probe = false;
    try { probe = lokal && (new URL(location.href).searchParams.has('goch') || !!sessionStorage.getItem('rjl-goch-test')); } catch (_) {}
    if (!schalter.chatEndpoint && !probe) return;
    // Stile: nur die markierten Bereiche; Bildadressen auf die Wurzel
    const stile = [...doc.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const teile = [...stile.matchAll(/\/\* goch-seite:an[^*]*\*\/([\s\S]*?)\/\* goch-seite:aus \*\//g)].map(m => m[1]);
    if (!teile.length) return;
    const style = document.createElement('style');
    style.id = 'goch-seite-stile';
    style.textContent = teile.join('\n').replace(/url\((["']?)(?![a-z]+:|\/)/gi, 'url($1' + wurzel);
    const eigene = document.createElement('link');
    eigene.rel = 'stylesheet'; eigene.href = wurzel + 'goch-seite.css?v=' + (new URL(skript.src).searchParams.get('v') || '');
    const geladen = new Promise(fertig => { eigene.onload = eigene.onerror = fertig; });
    document.head.append(style, eigene);
    await geladen;

    const body = document.body, en = document.documentElement.lang === 'en';
    window.RJLWurzel = wurzel;
    body.dataset.gochSeite = 'unter';
    body.dataset.gochHeim = wurzel + (en ? '?lang=en' : '');
    if (schalter.chatEndpoint) body.dataset.chatEndpoint = schalter.chatEndpoint;
    if (schalter.gochStimme) body.dataset.gochStimme = schalter.gochStimme;

    const uebernehmen = knoten => {
      const k = document.importNode(knoten, true);
      [k, ...k.querySelectorAll('*')].forEach(e => ['src', 'data-src', 'data-src-spaet'].forEach(a => {
        let v = e.getAttribute && e.getAttribute(a); if (!v || absolut(v)) return;
        if (v === 'assets/ast.webp') v = 'assets/ast-1400.webp'; // halbe Breite genügt hier und spart rund 130 KB
        e.setAttribute(a, wurzel + v);
      }));
      return k;
    };
    // Goch fliegt an wie auf der Startseite (Robin, 11.11.2026: bei jedem Auftritt): bird-flight.js lädt die Flugbilder erst
    // jetzt, also nach dem ersten Bild der Seite, und setzt nach der Landung den Zustand „rest“. Bis dahin ist der Ast leer
    // (Klasse js wie auf der Startseite). Bei reduzierter Bewegung sitzt er sofort.
    const scene = uebernehmen(quelle.scene);
    document.documentElement.classList.add('js');
    scene.querySelectorAll('img').forEach(i => { i.removeAttribute('fetchpriority'); i.decoding = 'async'; });
    const stage = document.createElement('div'), perch = document.createElement('div');
    stage.className = 'stage'; perch.className = 'perch';
    perch.append(scene); stage.append(perch); platz.append(stage);
    const blatt = uebernehmen(quelle.blatt);
    blatt.hidden = true;
    blatt.querySelectorAll('#goch-blick-an, #goch-kamera-consent, #goch-stumm').forEach(e => e.remove()); // Blickkontakt und Zwitschern gibt es nur auf der Startseite
    blatt.querySelectorAll('a[href^="#"]').forEach(a => a.setAttribute('href', body.dataset.gochHeim + a.getAttribute('href'))); // Impressum & Datenschutz stehen auf der Startseite
    body.append(uebernehmen(quelle.papier), uebernehmen(quelle.mini), blatt);

    // Skripte in der Reihenfolge der Startseite, mit deren Versionsangaben
    const adressen = SKRIPTE.map(name => { const s = [...doc.querySelectorAll('script[src]')].find(x => x.getAttribute('src').split('?')[0] === name); return s && s.getAttribute('src'); });
    if (adressen.some(a => !a)) return;
    adressen.forEach((a, i) => {
      const s = document.createElement('script'); s.src = wurzel + a; s.async = false;
      if (i === 0) s.onerror = () => { document.documentElement.classList.remove('js'); scene.dataset.state = 'rest'; }; // ohne Flugskript sitzt Goch einfach
      document.head.append(s);
    });
    platz.classList.add('bereit');
    // Unterkante des Kopfes: Darunter endet das offene Blatt, damit Goch und sein Ast frei bleiben (goch-seite.css)
    const kante = () => document.documentElement.style.setProperty('--goch-kopf-unten', Math.round(platz.getBoundingClientRect().bottom + scrollY) + 'px');
    kante(); window.addEventListener('resize', kante, { passive: true });
  }
  const bald = () => (window.requestIdleCallback || (f => setTimeout(f, 200)))(holen);
  if (document.readyState === 'complete') bald(); else window.addEventListener('load', bald, { once: true });
})();
