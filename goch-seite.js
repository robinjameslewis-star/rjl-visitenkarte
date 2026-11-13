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
  // Sofort, noch vor dem Holen der Startseite (Robin, 12.11.2026, großer Bildschirm): Flattersatz in Karten und im
  // Newsletter-Kasten auf jeder Breite; ab 1600 px Fensterbreite wachsen Kopfleiste, Blatt und Fuß maßvoll mit (zoom: Text,
  // Karten und Bilder im selben Maß, die Zeilenlänge in Zeichen bleibt), Goch wird etwas größer, Krone und Burgberg bekommen
  // eine Obergrenze. Unter 1600 px ändert sich außer dem Flattersatz nichts. Steht hier und nicht im Seitenrahmen des Workers,
  // damit keine Seite neu gebaut werden muss; gehört beim nächsten Umbau des Rahmens dorthin (worker/src/kopf.js).
  // Die Kopfleiste wächst mit zoom, also rückt der Himmel um dasselbe Maß nach oben (sonst bleibt über ihm ein Streifen
  // Papier stehen, Robin 13.11.2026); seine Höhe wächst mit, das Blatt bleibt an seinem Platz.
  const gross = document.createElement('style');
  gross.id = 'goch-seite-gross';
  gross.textContent = `.ws-karte p, .ws-karte li, .newsletter p { text-align: left !important; hyphens: manual !important; }
@media (min-width: 1600px) {
  :root { --gb: 1.12; }
  .kopf, .goch-kopf + main, .goch-kopf ~ .foot { zoom: var(--gb); }
  .goch-kopf { --gw: clamp(330px, 19vw, 400px) !important; margin-top: calc(-66px * var(--gb)); height: calc(66px * var(--gb) + var(--gw) * .616 + clamp(30px, 6vh, 64px)); }
  .goch-kopf .landscape-crown { width: min(max(320px, calc(40% + (100vw - 100%) * .15)), clamp(600px, 33vw, 720px)) !important; }
  .goch-kopf .landscape-far { width: min(55%, 760px) !important; left: calc(39.5% - min(27.5%, 380px)) !important; }
  .goch-kopf .goch-gruss { left: max(14px, calc(50% - (390px - 48px) * var(--gb))); }
}
@media (min-width: 1900px) { :root { --gb: 1.25; } }
@media (min-width: 2400px) { :root { --gb: 1.33; } }`;
  document.head.append(gross);
  // Nachtfarben (Robin, 12.11.2026): Der Seitenrahmen setzt die Palette schon vor dem ersten Bild (worker/src/kopf.js,
  // NACHT_START). Kommt die Seite aus dem Zurück-Cache des Browsers, stimmt die Uhrzeit nicht mehr: neu rechnen.
  window.addEventListener('pageshow', e => { try { if (e.persisted && window.RJLLandscape && document.documentElement.classList.contains('landscape-on')) window.RJLLandscape.prepare(); } catch (_) {} });
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
    // Goch kennt die Seite (Schritt 5): Gruß und Einstiegsfragen stehen im Rahmen der Seite (data-gruss, data-fragen)
    const gruss = platz.dataset.gruss || '', fragen = (platz.dataset.fragen || '').split('|').filter(Boolean);
    if (gruss) body.dataset.gochGruss = gruss;
    if (fragen.length) blatt.querySelectorAll('#goch-starters .goch-starter').forEach((k, i) => { k.removeAttribute('data-i18n'); if (fragen[i]) k.textContent = fragen[i]; else k.remove(); });
    blatt.querySelectorAll('a[href^="#"]').forEach(a => a.setAttribute('href', body.dataset.gochHeim + a.getAttribute('href'))); // Impressum & Datenschutz stehen auf der Startseite
    body.append(uebernehmen(quelle.papier), uebernehmen(quelle.mini), blatt);

    // Skripte in der Reihenfolge der Startseite, mit deren Versionsangaben
    // Landschaft wie auf der Startseite (Schritt 8, Robin 11.11.2026): Der Kopf ist eine kleine Bühne mit Himmel, Sonne, Mond,
    // Sternen, Krone und Ferne; hinter der Seite liegt das Tal. Schalter: der der Redaktion (data-landschaft der Startseite)
    // und je Seite data-tal="aus" am Platz (Rahmen); zum Prüfen ?landschaft=aus und ?tal=aus wie auf der Startseite.
    const land = [...doc.querySelectorAll('script[src]')].map(x => x.getAttribute('src')).find(a => a.split('?')[0] === 'landscape.js');
    if (land && platz.dataset.tal !== 'aus' && schalter.landschaft !== 'aus') {
      body.dataset.landschaft = schalter.landschaft || 'an';
      if (schalter.landschaftSatz) body.dataset.landschaftSatz = schalter.landschaftSatz;
      if (schalter.tal) body.dataset.tal = schalter.tal;
      // Der Seitenrahmen hat landscape.js schon im Kopf geladen; nur wenn die Startseite eine andere Fassung trägt, lädt sie hier neu.
      const schon = !!(window.RJLLandscape && window.RJLLandscape.init) && [...document.scripts].some(s => s.src === wurzel + land);
      const da = schon || await new Promise(f => { const s = document.createElement('script'); s.src = wurzel + land; s.onload = () => f(true); s.onerror = () => f(false); document.head.append(s); });
      try {
        if (da && window.RJLLandscape) { window.RJLLandscape.prepare(); window.RJLLandscape.init(); delete scene.dataset.flightRoute; } // Anflug von oben: Unter dem Ast liegt hier das Blatt der Seite
      } catch (_) { document.documentElement.classList.add('landscape-off'); }
    } else { body.dataset.landschaft = 'aus'; document.documentElement.classList.remove('landscape-on'); } // Schalter aus: die früh gesetzten Nachtfarben wieder nehmen
    const adressen = SKRIPTE.map(name => { const s = [...doc.querySelectorAll('script[src]')].find(x => x.getAttribute('src').split('?')[0] === name); return s && s.getAttribute('src'); });
    if (adressen.some(a => !a)) return;
    adressen.forEach((a, i) => {
      const s = document.createElement('script'); s.src = wurzel + a; s.async = false;
      if (i === 0) s.onerror = () => { document.documentElement.classList.remove('js'); scene.dataset.state = 'rest'; }; // ohne Flugskript sitzt Goch einfach
      document.head.append(s);
    });
    platz.classList.add('bereit');
    // Kleine Begrüßung neben Goch, sobald er gelandet ist: einmal je Seite und Besuch, verschwindet von selbst, beim Scrollen
    // und wenn das Gespräch aufgeht. Ein Tipp darauf öffnet das Gespräch. Sie stellt keine Anfrage.
    if (gruss) {
      const merk = 'rjl-goch-gruss:' + location.pathname;
      let gezeigt = false; try { gezeigt = !!sessionStorage.getItem(merk); } catch (_) {}
      if (!gezeigt) {
        const blase = document.createElement('button');
        blase.type = 'button'; blase.className = 'goch-gruss'; blase.id = 'goch-gruss';
        const kopf = document.createElement('span'); kopf.className = 'goch-gruss-wer'; kopf.textContent = en ? 'Goch · AI character' : 'Goch · KI-Figur';
        const text = document.createElement('span'); text.textContent = gruss;
        blase.append(kopf, text);
        let weg = false, uhr = 0;
        const fort = () => { if (weg) return; weg = true; clearTimeout(uhr); blase.classList.remove('da'); setTimeout(() => blase.remove(), 500); removeEventListener('scroll', beimScrollen); };
        const beimScrollen = () => { if (scrollY > 160) fort(); };
        const zeigen = () => {
          if (weg || blase.isConnected || !blatt.hidden) return;
          platz.append(blase); void blase.offsetWidth; blase.classList.add('da');
          try { sessionStorage.setItem(merk, '1'); } catch (_) {}
          uhr = setTimeout(fort, 9000); addEventListener('scroll', beimScrollen, { passive: true });
        };
        blase.addEventListener('click', () => { fort(); scene.click(); });
        new MutationObserver(() => { if (!blatt.hidden) fort(); }).observe(blatt, { attributes: true, attributeFilter: ['hidden'] });
        const gelandet = () => { if (scene.dataset.state === 'rest') { landung.disconnect(); setTimeout(zeigen, 500); } };
        const landung = new MutationObserver(gelandet); landung.observe(scene, { attributes: true, attributeFilter: ['data-state'] }); gelandet();
      }
    }
    // Unterkante des Kopfes: Darunter endet das offene Blatt, damit Goch und sein Ast frei bleiben (goch-seite.css)
    const kante = () => document.documentElement.style.setProperty('--goch-kopf-unten', Math.round(platz.getBoundingClientRect().bottom + scrollY) + 'px');
    kante(); window.addEventListener('resize', kante, { passive: true });
  }
  const bald = () => (window.requestIdleCallback || (f => setTimeout(f, 200)))(holen);
  if (document.readyState === 'complete') bald(); else window.addEventListener('load', bald, { once: true });
})();
