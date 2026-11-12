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
  let fort = false; // Übergabe (Startseite): Der große Goch ist von der Bühne auf den kleinen Ast geflogen, der Bühnen-Ast ist leer
  let ohneGoch = false; // „Platz machen“ bei offenem Gespräch: Goch ist weg, die Leiste bleibt
  let begleitet = false, weicht = false; // Begleiter ohne offenes Gespräch; weicht: Unter ihm liegt gerade etwas Bedienbares (unten: Begleiter mit Stationen)
  // Der kleine Goch ist da: im Gesprächsmodus unterwegs, neben dem mitlaufenden Blatt oder als Begleiter
  const miniSicht = () => { mini.hidden = ohneGoch || !(lage === 'unterwegs' || (lage === 'aus' && (!!breit || (begleitet && !weicht)))); };
  function setzen(neu) {
    if (neu === lage) return;
    const vorher = lage;
    lage = neu;
    // Vollbild mit Stimme: Goch sitzt groß oben. Saß er als kleiner unten (Übergabe), ist er sofort wieder der große.
    if (neu === 'fokus' && fort) { flugAus(); gabeHin = false; gabeZurueck = false; miniDa = false; fortSetzen(false); mini.classList.add('goch-mini-weg'); }
    html.classList.toggle('goch-fokus', neu === 'fokus');
    html.classList.toggle('goch-unterwegs', neu === 'unterwegs');
    if (neu === 'unterwegs') miniLaden();
    miniSicht();
    zurSeite.hidden = neu !== 'fokus';
    if (neu === 'fokus') { zuletzt = scrollY; eigen(); scrollTo(0, 0); } // zuletzt: wo die Seite stand, bevor Goch groß wurde
    if (neu === 'aus' && vorher === 'fokus') { eigen(); scrollTo(0, zuletzt); }
    window.Goch.place();
    hoehe(); untenBald();
  }
  // Der Besucher gibt die Seite frei: zurück an die Stelle, an der er war, bevor Goch groß wurde.
  function freigeben() { if (lage !== 'fokus') return; klein = true; vomScrollen = false; setzen('unterwegs'); eigen(); scrollTo(0, zuletzt); }
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
  // ---------- Flug des kleinen Goch (Robin, 11.11.2026: bei jedem Auftritt anfliegen, bei jedem Rückzug abfliegen) ----------
  // Die Flugbilder sind die des großen Goch (bird-flight.js hat sie nach dem ersten Bild der Seite geladen). Sind sie nicht da,
  // bei reduzierter Bewegung oder im verborgenen Tab erscheint und verschwindet er ohne Flug.
  const FLUG = { up: [-14.7441, -45.52], glide: [-15.4380, -43.17], down: [-16.9124, -34.22], landing: [-16.5655, -43.64] }; // links, oben in % der Sitzpose
  const tier = mini.querySelector('.goch-mini-tier');
  let flugBilder = null, flugLauf = 0, miniDa = false, boden = '';
  function flugBauen() {
    if (flugBilder) return;
    flugBilder = {};
    scene.querySelectorAll('.bird-flight[data-pose]').forEach(f => {
      const src = f.getAttribute('src'), ort = FLUG[f.dataset.pose];
      if (!src || !ort) return; // noch nicht geladen: beim nächsten Mal
      const i = document.createElement('img');
      i.className = 'goch-mini-flug'; i.alt = ''; i.src = src; i.style.left = ort[0] + '%'; i.style.top = ort[1] + '%';
      tier.append(i); flugBilder[f.dataset.pose] = i;
    });
    if (Object.keys(flugBilder).length < 4) { Object.values(flugBilder).forEach(i => i.remove()); flugBilder = null; }
  }
  function miniFlug(an, fertig) {
    const lauf = ++flugLauf;
    const ende = () => { tier.classList.remove('fliegt'); tier.style.transform = ''; tier.style.opacity = ''; if (flugBilder) Object.values(flugBilder).forEach(i => { i.style.opacity = '0'; }); mini.dataset.flug = ''; fertig(); };
    flugBauen();
    if (ruhig.matches || document.hidden || !flugBilder || !Object.values(flugBilder).every(i => i.complete && i.naturalWidth)) { ende(); return; }
    const dauer = an ? 1500 : 1100, start = performance.now(), w = tier.offsetWidth || 180;
    tier.classList.add('fliegt'); mini.dataset.flug = an ? 'an' : 'ab';
    const schritt = now => {
      if (lauf !== flugLauf) return;
      const p = Math.min(1, (now - start) / dauer);
      const fern = an ? Math.pow(1 - p, 1.7) : Math.pow(p, 1.6); // 1 = weit weg, 0 = auf dem Ast
      const x = (an ? .9 : -1.25) * fern * w, y = -(an ? 1.35 : 1.5) * fern * w - Math.sin(p * Math.PI) * w * .06;
      const pose = an && p > .78 ? 'landing' : ['up', 'glide', 'down', 'glide'][Math.floor((now - start) / 72) % 4];
      Object.entries(flugBilder).forEach(([k, i]) => { i.style.opacity = k === pose ? '1' : '0'; });
      tier.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(1 - fern * .42).toFixed(3)})`;
      tier.style.opacity = an ? Math.min(1, p / .12).toFixed(2) : (1 - Math.max(0, (p - .7) / .3)).toFixed(2);
      if (p < 1) requestAnimationFrame(schritt); else ende();
    };
    requestAnimationFrame(schritt);
  }
  // Ist der große Goch gerade im Fenster? Sofort gemessen – der IntersectionObserver meldet erst ein Bild später.
  const grossImBild = () => { const r = scene.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  // Flug sofort beenden und den kleinen Goch ohne Abflug verschwinden lassen
  function flugAus() {
    flugLauf++; tier.classList.remove('fliegt'); tier.style.transform = ''; tier.style.opacity = '';
    if (flugBilder) Object.values(flugBilder).forEach(i => { i.style.opacity = '0'; });
    mini.dataset.flug = ''; mini.classList.remove('fliegt-ab'); mini.style.bottom = '';
  }
  // Übergabe: derselbe Vogel fliegt zwischen Bühnen-Ast und kleinem Ast. Gezeichnet wird der kleine Goch; er beginnt (oder
  // endet) genau auf dem Platz und in der Größe des großen, dessen Bild in diesem Augenblick aus- oder eingeblendet wird.
  let gabeHin = false, gabeZurueck = false;
  function gabeFlug(hin, fertig) {
    const lauf = ++flugLauf;
    const ende = () => { tier.classList.remove('fliegt'); tier.style.transform = ''; tier.style.opacity = ''; if (flugBilder) Object.values(flugBilder).forEach(i => { i.style.opacity = '0'; }); mini.dataset.flug = ''; fertig(); };
    flugBauen();
    if (ruhig.matches || document.hidden || !flugBilder || !Object.values(flugBilder).every(i => i.complete && i.naturalWidth)) { ende(); return; }
    // Goch fliegt nur vorwärts (Robin, 12.11.2026): Alle Bilder blicken nach links. Bewegt er sich nach rechts, ist das Bild
    // für den Flug gespiegelt; zur Landung blickt er wieder in seine Sitzrichtung.
    // Hin: Er hebt vom Bühnen-Ast ab und fliegt (gespiegelt) nach rechts hinaus bis zu dem Punkt, an dem der gewohnte Anflug
    // des kleinen Goch beginnt – von dort landet er genau wie auf den Unterseiten: von rechts oben, vorwärts (miniFlug).
    // Zurück: vom kleinen Ast nach links hinauf zur Bühne – das ist schon vorwärts.
    const dauer = hin ? 800 : 1500, start = performance.now(), gross = scene.querySelector('.bird-rest');
    tier.classList.add('fliegt'); mini.dataset.flug = hin ? 'an' : 'ab';
    let xAlt = null, rechts = hin;
    const schritt = now => {
      if (lauf !== flugLauf) { if (!hin) fertig(); return; } // ein anderer Flug hat übernommen: Der Rückweg wird trotzdem abgeschlossen
      const p = Math.min(1, (now - start) / dauer);
      tier.style.transform = '';
      const m = tier.getBoundingClientRect(), g = gross.getBoundingClientRect(), w = m.width || 180; // Drehpunkt des kleinen: die Füße (44 % / 94 %)
      const bx = g.left + g.width * .44 - m.left - m.width * .44, by = g.top + g.height * .94 - m.top - m.height * .94, bs = g.width / m.width; // Bühnen-Ast, vom kleinen Ast aus
      let x, y, s, sicht = 1;
      if (hin) {
        const e = p * p * (3 - 2 * p), ax = .9 * w, ay = -1.35 * w, as = .58; // Anfang des gewohnten Anflugs (miniFlug)
        x = bx + (ax - bx) * e; y = by + (ay - by) * e - Math.sin(p * Math.PI) * innerHeight * .05; s = bs + (as - bs) * e;
        sicht = 1 - Math.max(0, (p - .75) / .25);
      } else {
        const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        x = bx * e; y = by * e - Math.sin(p * Math.PI) * innerHeight * .07; s = 1 + (bs - 1) * e;
      }
      if (xAlt !== null && Math.abs(x - xAlt) > .3) rechts = x > xAlt;
      xAlt = x;
      const pose = !hin && p > .82 ? 'landing' : ['up', 'glide', 'down', 'glide'][Math.floor((now - start) / 72) % 4];
      Object.entries(flugBilder).forEach(([k, i]) => { i.style.opacity = k === pose ? '1' : '0'; });
      tier.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(rechts ? -s : s).toFixed(3)}, ${s.toFixed(3)})`;
      tier.style.opacity = sicht.toFixed(2);
      if (p < 1) requestAnimationFrame(schritt);
      else if (hin) miniFlug(true, fertig); // ab hier der gewohnte Anflug von rechts oben
      else ende();
    };
    schritt(start);
  }
  function miniPruefen() {
    if (gabeZurueck) return; // der Rückflug zur Bühne läuft: Er endet selbst (gabePruefen)
    const soll = !mini.hidden && !mini.classList.contains('goch-mini-weg') && (lage === 'unterwegs' || !!breit || begleitet);
    if (soll && !mini.classList.contains('fliegt-ab')) boden = getComputedStyle(mini).bottom;
    if (soll === miniDa) return;
    miniDa = soll;
    if (soll) { mini.classList.remove('fliegt-ab'); mini.style.bottom = ''; if (gabeHin) { gabeHin = false; gabeFlug(true, begleiterBald); } else miniFlug(true, begleiterBald); }
    // Nie zwei Gochs zugleich (Robin, 11.11.2026): Kommt der große Goch ins Bild, ist der kleine sofort weg – ohne Abflug.
    // Er fliegt nur ab, wenn der große nicht zu sehen ist (Gespräch geschlossen, „Seite ansehen“ aufgehoben).
    else if (!fort && (sichtbar > .02 || grossImBild())) flugAus();
    else { mini.style.bottom = boden; mini.classList.add('fliegt-ab'); miniFlug(false, () => { if (!miniDa) { mini.classList.remove('fliegt-ab'); mini.style.bottom = ''; } }); }
  }
  new MutationObserver(miniPruefen).observe(mini, { attributes: true, attributeFilter: ['hidden', 'class'] });
  new MutationObserver(miniPruefen).observe(html, { attributes: true, attributeFilter: ['class'] });
  // ---------- Breite Bildschirme: mitlaufendes Blatt ----------
  let breit = '', sichtbar = 1; // breit: '' | 'blatt' | 'zeile'; sichtbar: Anteil des großen Goch im Fenster
  function breitSetzen(neu) {
    if (neu === breit) return;
    breit = neu;
    html.classList.toggle('goch-angeheftet', !!neu);
    html.classList.toggle('goch-zeile', neu === 'zeile');
    if (neu) miniLaden();
    if (lage === 'aus') { miniSicht(); zurSeite.hidden = neu !== 'blatt'; }
    window.Goch.place();
    hoehe();
  }
  // Wer gerade im Fenster schreibt, behält es: Dann läuft es als Fenster mit, bis das Textfeld verlassen ist
  const schreibt = () => { const a = document.activeElement; return !!a && panel.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName); };
  function breitPruefen() {
    if (schmal.matches || panel.hidden) { breitSetzen(''); return; }
    if (!breit && (sichtbar < .1 || fort)) breitSetzen(schreibt() ? 'blatt' : 'zeile'); // Goch ist aus dem Bild: Leiste (Robin, 12.11.2026), kein mitlaufendes Fenster
    else if (breit && sichtbar > .5 && !fort) { breitSetzen(''); if (!gabeZurueck) grossAn(); } // Goch ist wieder da: Das Blatt hängt wieder an seinem Ast, er fliegt an
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
  // Messhilfe für das echte Gerät (12.11.2026: Die Leiste lag an Robins iPhone teils unter der Leiste von Safari; in der
  // Prüfumgebung gibt es diese Leiste nicht). Mit ?goch-messen=1 stehen die Maße oben links – ein Bildschirmfoto genügt.
  if (new URL(location.href).searchParams.has('goch-messen')) {
    const m = document.createElement('pre'), fuss = document.createElement('i');
    m.style.cssText = 'position:fixed;z-index:99;left:6px;top:6px;margin:0;padding:6px 8px;font:11px/1.35 ui-monospace,monospace;background:#fff;color:#000;border:1px solid #999;pointer-events:none;white-space:pre';
    fuss.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:env(safe-area-inset-bottom);visibility:hidden';
    document.body.append(m, fuss);
    const zeigen = () => { m.textContent = `innerHeight ${innerHeight}\nclientHeight ${html.clientHeight}\nvv.height ${vv ? Math.round(vv.height) : '-'}\nvv.offsetTop ${vv ? Math.round(vv.offsetTop) : '-'}\nvv.scale ${vv ? vv.scale.toFixed(2) : '-'}\nsafe-bottom ${fuss.offsetHeight}\n--goch-unten ${html.style.getPropertyValue('--goch-unten') || '-'}\nscrollY ${Math.round(scrollY)}`; };
    setInterval(zeigen, 300); zeigen();
  }
  const untenBald = () => { if (!untenWartet && (!panel.hidden || begleitet)) { untenWartet = true; requestAnimationFrame(unten); } };
  if (vv) { vv.addEventListener('resize', untenBald); vv.addEventListener('scroll', untenBald); }
  window.addEventListener('scroll', untenBald, { passive: true });
  new MutationObserver(untenBald).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  if ('ResizeObserver' in window) new ResizeObserver(hoehe).observe(panel);
  new MutationObserver(breitPruefen).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  // ---------- Gesprächsleiste (Robin, 12.11.2026) ----------
  // Eine verkleinerte Form für alle Lagen – Text, „Goch spricht“, „Goch hört“: Beginnt der Besucher bei offenem Gespräch zu
  // scrollen, wird aus dem Fenster eine Leiste (klein). Sie trägt beide Schalter, die letzte Zeile des Gesprächs und das X;
  // ein Tipp auf die Zeile holt das Fenster zurück. Ob die Leiste steht, hängt nicht an den Schaltern: Wer in der Leiste
  // „Goch hört“ oder „Goch spricht“ schaltet, bleibt in der Leiste und an seiner Stelle der Seite.
  let wiederda = false, klein = false, eigenScroll = 0, scrollStart = 0, frage = false, frageZeile = false;
  const stimmeAn = () => (modus.mikro && !modus.einmal) || modus.laut; // eine einzelne gesprochene Frage (einmal) vergrößert Goch nicht
  const eigen = () => { eigenScroll = performance.now(); };
  function pruefen() {
    if (!schmal.matches || panel.hidden) { klein = false; setzen('aus'); return; }
    if (wiederda) { klein = true; wiederda = false; } // nach einem Seitenwechsel als Leiste, nicht groß
    setzen(frage ? 'aus' : klein ? 'unterwegs' : stimmeAn() ? 'fokus' : 'aus'); // frage: Die Einwilligung für die Stimme steht im Fenster
  }
  function einklappen() {
    if (panel.hidden) return;
    if (schmal.matches) { klein = true; pruefen(); } else if (breit === 'blatt') breitSetzen('zeile');
  }
  function aufklappen(fokus) {
    if (panel.hidden) return;
    if (schmal.matches) { klein = false; pruefen(); } else if (breit === 'zeile') breitSetzen('blatt');
    scrollStart = scrollY;
    const feld = $('goch-input');
    if (fokus && feld && feld.offsetParent) feld.focus({ preventScroll: true }); // im selben Tipp, sonst öffnet iOS die Tastatur nicht
  }
  // Schalter der Leiste: Sie drücken die Schalter des Fensters – Einwilligung, Grenzen und Hinweise bleiben, wie sie sind
  const leisteKnopf = (id, ziel, zeichen) => {
    const k = document.createElement('button');
    k.type = 'button'; k.id = id; k.className = 'goch-l-knopf'; k.setAttribute('aria-pressed', 'false');
    k.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${zeichen}</svg>`;
    k.addEventListener('click', e => { e.stopPropagation(); const z = $(ziel); if (z) z.click(); });
    return k;
  };
  const lLaut = leisteKnopf('goch-l-laut', 'goch-laut', '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4"/>');
  const lMikro = leisteKnopf('goch-l-mikro', 'goch-mikro-an', '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>');
  panel.prepend(lLaut, lMikro);
  function leisteStand() {
    const sprache = $('goch-sprache'), da = !!sprache && !sprache.hidden;
    lLaut.hidden = lMikro.hidden = !da;
    lLaut.setAttribute('aria-label', t('gochLaut')); lMikro.setAttribute('aria-label', t('gochMikroAn'));
    lLaut.setAttribute('aria-pressed', String(!!modus.laut)); lMikro.setAttribute('aria-pressed', String(!!modus.mikro && !modus.einmal));
  }
  leisteStand();
  if ($('goch-sprache')) new MutationObserver(leisteStand).observe($('goch-sprache'), { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('site-languagechange', leisteStand);
  // Fragt „Goch hört“ zum ersten Mal nach der Einwilligung, braucht sie das Fenster
  const stimmFrage = $('goch-stimme-consent');
  // (nur solange sie offen ist; danach steht wieder die Leiste, die Seite bleibt, wo sie war).
  if (stimmFrage) new MutationObserver(() => {
    if (!stimmFrage.hidden) {
      if (lage === 'unterwegs') { frage = true; eigen(); pruefen(); }
      else if (breit === 'zeile') { frageZeile = true; breitSetzen('blatt'); }
    } else {
      if (frage) { frage = false; eigen(); pruefen(); scrollStart = scrollY; }
      if (frageZeile) { frageZeile = false; if (breit === 'blatt') breitSetzen('zeile'); }
    }
  }).observe(stimmFrage, { attributes: true, attributeFilter: ['hidden'] });
  // Scrollen bei offenem Fenster: nach 40 px zur Leiste. Nicht bei eigenem Scrollen der Seite, nicht solange im Fenster
  // geschrieben wird (die Tastatur verschiebt die Seite), nicht im Vollbild mit Stimme (dort gibt ein Wisch die Seite frei).
  // Am Handy liegt das Fenster fest im Bild; am Rechner hängt es an Goch und wird zur Leiste, sobald Goch aus dem Bild ist.
  // Zurück ganz oben beim großen Goch wird aus der Leiste des Text-Gesprächs wieder das Fenster.
  let vomScrollen = false;
  window.addEventListener('scroll', () => {
    if (panel.hidden) return;
    if (performance.now() - eigenScroll < 900) { scrollStart = scrollY; return; }
    const a = document.activeElement;
    if (a && panel.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName)) { scrollStart = scrollY; return; }
    if (!schmal.matches) { if (breit === 'blatt' && Math.abs(scrollY - scrollStart) >= 40) breitSetzen('zeile'); return; } // aufgeklapptes Fenster am Rechner
    if (lage === 'aus' && !frage && Math.abs(scrollY - scrollStart) >= 40) { vomScrollen = true; einklappen(); }
    else if (lage === 'unterwegs' && vomScrollen && !stimmeAn() && scrollY <= 8) { vomScrollen = false; klein = false; pruefen(); scrollStart = scrollY; }
  }, { passive: true });
  new MutationObserver(() => { scrollStart = scrollY; vomScrollen = false; eigen(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  function zeigen(ziel) {
    const el = stelle(ziel);
    if (!el) return;
    if (lage === 'fokus') { klein = true; setzen('unterwegs'); }
    eigen();
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
  window.addEventListener('goch-modus', e => { modus = e.detail; leisteStand(); pruefen(); if (ohneGoch) zweigPruefen(); });
  // Im Gesprächsmodus führt die Seite von selbst hin, während Goch spricht
  window.addEventListener('goch-antwort', e => { const z = e.detail && e.detail.zeigen; if (lage !== 'aus' && ZIELE.includes(z)) zeigen(z); });
  schmal.addEventListener('change', () => { pruefen(); breitPruefen(); });
  // Kommt der große Goch zurück, fliegt er wieder an – nur wenn er gerade weder spricht noch zuhört (im Flug ruht der Schnabel)
  function grossAn() { if (window.GochFlug && !ruhig.matches && !window.GochStimme.beschaeftigt() && !modus.mikro) window.GochFlug.an(); }
  mini.addEventListener('click', () => {
    // Begleiter: Der Tipp öffnet das Gespräch – auf breiten Bildschirmen als mitlaufendes Blatt an Ort und Stelle, am Handy
    // bei Goch am Seitenanfang (dort steht das Gespräch ohne Sprachfunktion), er fliegt dort wieder an.
    if (begleitet) { wortAus(); eigen(); if (schmal.matches) scrollTo(0, 0); else breitSetzen('blatt'); window.Goch.oeffnen(); if (schmal.matches) { rueckkehr = false; if (unter) grossAn(); } return; }
    // Tipp auf den kleinen Goch neben der Leiste: das normale Gesprächsfenster (mit Stimme am Handy groß bei Goch)
    if (breit) { if (breit === 'zeile') aufklappen(true); else { eigen(); scrollTo({ top: 0, behavior: ruhig.matches ? 'auto' : 'smooth' }); } }
    else { aufklappen(true); if (lage === 'fokus') grossAn(); }
  });
  zurSeite.addEventListener('click', () => { if (breit) breitSetzen('zeile'); else if (lage === 'fokus') freigeben(); else einklappen(); });
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
    // Nur am Griff des offenen Blatts. Auf der Kapsel gibt es keinen Wisch: Sie liegt in der Daumenzone, dort wäre es dieselbe
    // Geste wie Weiterscrollen. Ein Tipp auf die Kapsel oder den kleinen Goch klappt auf.
    const kapsel = () => lage === 'unterwegs' || breit === 'zeile';
    panel.addEventListener('touchstart', e => { y0 = (lage === 'aus' && !breit) || kapsel() || !e.target.closest('.goch-head') ? null : e.touches[0].clientY; }, { passive: true });
    panel.addEventListener('touchmove', e => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0;
      if (breit) { if (dy > 36 && breit === 'blatt') { y0 = null; breitSetzen('zeile'); } else if (dy < -36 && breit === 'zeile') { y0 = null; breitSetzen('blatt'); } return; }
      if (dy > 36 && lage === 'fokus') { y0 = null; freigeben(); }
      else if (dy < -36 && lage === 'unterwegs') { y0 = null; aufklappen(false); }
    }, { passive: true });
    panel.addEventListener('touchend', () => { y0 = null; });
  }
  // Die schmale Leiste ist das eingeklappte Blatt: Ein Tipp darauf (nicht auf Knöpfe oder Verweise) klappt es wieder auf
  panel.addEventListener('click', e => {
    if (e.target.closest('button, a, input, textarea')) return;
    if (ohneGoch) { zweig.click(); return; } // Pille oben: Der Tipp holt Goch und die Leiste zurück nach unten
    if (lage === 'unterwegs' || breit === 'zeile') aufklappen(true);
  });
  // Der kleine Goch erscheint erst, wenn der große aus dem Bild ist – nie zwei Gochs zugleich
  if ('IntersectionObserver' in window) new IntersectionObserver(es => {
    sichtbar = es[es.length - 1].intersectionRatio;
    mini.classList.toggle('goch-mini-weg', sichtbar > .02 && !fort); // schon der Rand des großen Goch genügt: nie beide zugleich (fort: Sein Bild ist aus, er sitzt als kleiner unten)
    if (sichtbar > .02 && !fort && (mini.classList.contains('fliegt-ab') || mini.dataset.flug)) flugAus();
    if (sichtbar > 0 && rueckkehr) { rueckkehr = false; if (unter) grossAn(); } // der Begleiter ist abgeflogen: Der große fliegt wieder an
    breitPruefen();
    if (typeof zweigPruefen === 'function') zweigPruefen();
  }, { threshold: [0, .02, .1, .35, .5, 1] }).observe(scene);
  // Der IntersectionObserver meldet erst ein Bild später. Solange der kleine Goch zu sehen ist, prüft deshalb schon das
  // Scrollen selbst, ob der große ins Bild kommt – dann ist der kleine im selben Bild weg.
  window.addEventListener('scroll', () => {
    if (!miniDa && !mini.classList.contains('fliegt-ab')) return;
    if (grossImBild() && !fort) { sichtbar = Math.max(sichtbar, .03); mini.classList.add('goch-mini-weg'); if (mini.classList.contains('fliegt-ab') || mini.dataset.flug) flugAus(); miniPruefen(); }
  }, { passive: true });
  // ---------- Begleiter mit Stationen (Robin, 11.11.2026: „auf der startseite soll goch auch mitfliegen“) ----------
  // Auch ohne offenes Gespräch: Ist der große Goch weit genug aus dem Bild, fliegt der kleine an und sitzt unten rechts auf
  // seinem Ast. Kommt ein Abschnitt ins Bild, zu dem er etwas weiß, fliegt er eine kurze Runde, landet und sagt einen Satz
  // als Sprechblase – je Abschnitt höchstens einmal je Seitenaufruf (nur im Arbeitsspeicher, nichts wird im Browser abgelegt).
  // Die Sätze stehen in language.js (gochStation_…), es geht keine Anfrage an den Worker, und er spricht sie nicht.
  // Scrollt der Besucher zurück, fliegt der kleine ab, bevor der große erscheint (Vorlauf: ein gutes Drittel der Fensterhöhe); der große
  // fliegt dann wieder an. Ein Tipp auf den kleinen öffnet das Gespräch. Liegt ein Knopf, ein Feld, ein Video oder ein
  // Verweis unter ihm, fliegt er ab und kommt erst wieder, wenn sein Platz eine Weile frei ist (sein Platz steht fest im
  // Fenster und wird gemerkt, solange er zu sehen ist). Die Sprechblase erscheint nur, wo sie nichts Bedienbares verdeckt.
  const unter = !!document.body.dataset.gochSeite;
  const ORTE = unter
    ? { 'k-workshops': 'workshops', 'k-workshop-e-rechnung': 'ws_erechnung', ablauf: 'ablauf', anfrage: 'anfrage', fragen: 'fragen', vergleich: 'vergleich',
        stationen: 'stationen', rotkehlchen: 'rotkehlchen', kontakt: 'kontakt', neu: 'neu', 'newsletter-title': 'newsletter_seite' }
    : { werkzeuge: 'werkzeuge', workshops: 'workshops', 'workshop-e-rechnung': 'ws_erechnung', blog: 'blog', newsletter: 'newsletter', 'ueber-mich': 'ueber_mich',
        termin: 'termin', nachricht: 'nachricht', anbieter: 'anbieter' };
  // Eigene Sätze je Unterseite (12.11.2026): Die Kennungen der Überschriften sind allgemein (inhalt, werkzeuge, partner …),
  // deshalb gelten sie nur auf der Seite, zu deren Text der Satz gehört. Deutsch und Englisch tragen dieselben Kennungen.
  const SEITEN = [
    [/\/workshops\/(en\/)?ki-kompetenz\/$/, { zusammenarbeit: 'ki_zusammenarbeit', 'plan-b': 'ki_plan_b', teile: 'ki_teile', unterweisung: 'ki_unterweisung', 'fuer-wen': 'ki_fuer_wen',
      inhalt: 'ki_inhalt', werkzeuge: 'ki_werkzeuge', leitung: 'ki_leitung', formate: 'ki_formate', nachweis: 'ki_nachweis' }],
    [/\/(ueber-mich|about)\/$/, { kenntnisse: 'um_kenntnisse', ehrenamt: 'um_ehrenamt' }],
    [/\/werkzeuge\/(en\/)?$/, { ueberblick: 'wz_ueberblick', 'partner-anzeigen': 'wz_partner_anzeigen', 'workshops-hinweis': 'wz_workshops', partner: 'wz_partner' }],
  ];
  const EIGEN = unter ? (SEITEN.find(([muster]) => muster.test(location.pathname.replace(/index\.html$/, ''))) || [0, {}])[1] : {};
  const TITEL = { 'was es kann': 'kann', 'was er kann': 'kann', 'what it does': 'kann', 'so geht es': 'so_geht_es', 'how it works': 'so_geht_es' };
  const BEDIENBAR = 'button, input, textarea, select, video, summary, a[class*="cta"], .wzs-karte a, .ws-karte a';
  const knopf = mini.querySelector('.goch-mini-knopf'), wort = document.createElement('span');
  wort.className = 'goch-mini-wort'; wort.hidden = true; wort.innerHTML = '<small></small><span></span>';
  mini.append(wort);
  let stationen = null, kandidat = null, kandidatT = 0, wortT = 0, rueckkehr = false, begleiterWartet = false, weichtT = 0, knopfOrt = null, hoch = 0, durch = false, seitWeg = 0;
  const PLAETZE = ['', 'links', 'hoch']; // Plätze der Sprechblase: über dem Vogel, links neben ihm, weiter oben
  // Jeder Abschnitt ist eine Station (Robin, 12.11.2026: keine stumme Station). Hat er keinen eigenen Satz, bietet Goch an,
  // Fragen zur Überschrift zu beantworten – mehr als dort steht, sagt er nicht.
  function stationenSuchen() {
    stationen = [];
    const titel = h => (h && h.textContent || '').replace(/\s+/g, ' ').trim();
    if (unter) document.querySelectorAll('main h2').forEach(h => {
      const key = EIGEN[h.id] || ORTE[h.id] || (!h.id && TITEL[titel(h).toLowerCase()]) || '';
      if (key || titel(h)) stationen.push({ el: h, key, kopf: true, h });
    });
    else document.querySelectorAll('main > section:not(.stage)').forEach(el => {
      const h = el.querySelector('h2'), key = ORTE[el.id || (el.classList.contains('contact') ? 'termin' : '')] || '';
      if (key || titel(h)) stationen.push({ el, key, kopf: false, h });
    });
  }
  const stationText = s => s.key ? t('gochStation_' + s.key) : t('gochStationAllgemein').replace('{titel}', (s.h.textContent || '').replace(/\s+/g, ' ').trim());
  function stationJetzt() {
    const vh = innerHeight; let treffer = null;
    for (const s of stationen) {
      if (s.el.hidden) continue;
      const r = s.el.getBoundingClientRect();
      if (!r.height) continue;
      const ab = s.key === 'werkzeuge' && !unter ? .78 : .6; // die erste Station gleich nach der Landung (Übergabe bei 70 %)
      if (s.kopf ? r.top < vh * .6 && r.top > -vh * .4 : r.top < vh * ab && r.bottom > vh * .3) treffer = s;
    }
    return treffer;
  }
  // Liegt unter der Fläche etwas Bedienbares der Seite?
  function frei(z, was) {
    if (!z || !z.width) return true;
    for (const k of document.querySelectorAll(was || BEDIENBAR)) {
      if (mini.contains(k) || panel.contains(k)) continue;
      const r = k.getBoundingClientRect();
      if (r.width && r.bottom > z.top && r.top < z.bottom && r.right > z.left && r.left < z.right && r.bottom > 0 && r.top < innerHeight) return false;
    }
    return true;
  }
  function wortAus() { clearTimeout(wortT); wort.classList.remove('da'); wort.hidden = true; mini.classList.remove('sagt'); }
  // Platz der Sprechblase: der erste, an dem sie nichts Bedienbares verdeckt. Ist keiner frei, erscheint sie trotzdem am
  // gewohnten Platz – sie lässt Tipps durch und geht nach 6,5 s; stumm bleibt Goch an keiner Station.
  function wortPlatz() {
    for (const platz of PLAETZE) {
      wort.dataset.platz = platz;
      const r = wort.getBoundingClientRect();
      if (r.left >= 4 && r.top >= 4 && frei(r)) return true;
    }
    wort.dataset.platz = '';
    return false;
  }
  function stationSagen(s) {
    if (!begleitet || kandidat !== s) return;
    if (!miniDa || mini.dataset.flug || weicht) { kandidatT = setTimeout(() => stationSagen(s), 400); return; } // er ist noch im Anflug oder macht gerade Platz
    wort.firstChild.textContent = t('gochWortWer'); wort.lastChild.textContent = stationText(s);
    wort.hidden = false; wortPlatz();
    // Er bleibt auf dem Ast sitzen (Robin, 12.11.2026): geflogen wird nur beim Astwechsel und beim Wechsel der Seite
    void wort.offsetWidth; wort.classList.add('da'); mini.classList.add('sagt'); // solange er etwas sagt, ruht „Platz machen“
    clearTimeout(wortT); wortT = setTimeout(wortAus, 6500);
  }
  function stationPruefen() {
    const s = stationJetzt();
    if (s !== kandidat) {
      // Auch beim Zurückkommen sagt er den Satz wieder (Robin, 12.11.2026); die kurze Wartezeit verhindert Aufblitzen beim schnellen Scrollen
      kandidat = s; clearTimeout(kandidatT); wortAus();
      if (s) kandidatT = setTimeout(() => stationSagen(s), 300);
    }
    if (!wort.hidden && !frei(wort.getBoundingClientRect())) wortPlatz(); // beim Scrollen liegt jetzt etwas darunter: Platz wechseln
    // Er bleibt sitzen (Robin, 12.11.2026: „Der kleine Goch ist einfach da bis er mit Platz machen weggeschickt wird“): kein
    // Abflug, keine neue Höhe. Liegt unter ihm etwas Bedienbares – auch ein gewöhnlicher Verweis –, wird er durchlässig und
    // etwas blasser (.durch): Tipps gehen durch ihn hindurch zur Seite, bis sein Platz wieder frei ist.
    const r = knopf.getBoundingClientRect();
    if (r.width) knopfOrt = r;
    const besetzt = !frei(knopfOrt, BEDIENBAR + ', a[href]');
    if (besetzt !== durch) { durch = besetzt; mini.classList.toggle('durch', durch); }
    // „Platz machen“ sitzt am Handy links neben ihm und bleibt bedienbar – außer die Taste läge selbst über Bedienbarem
    const taste = mini.querySelector('.goch-platz'), tr = taste && taste.getBoundingClientRect();
    mini.classList.toggle('platz-durch', !!tr && tr.width > 0 && !frei(tr, BEDIENBAR + ', a[href]'));
  }
  const knopfText = () => knopf.setAttribute('aria-label', t(begleitet ? 'gochMiniFragen' : 'gochMini'));
  // ---------- Übergabe auf der Startseite (Robin, 12.11.2026: „B mit kleinem A“) ----------
  // Kommt die Überschrift „Werkzeuge“ ins Bild (ab 70 % der Fensterhöhe), hebt der große Goch von seinem Bühnen-Ast ab und
  // fliegt im Bogen auf den kleinen Ast am rechten Rand; er wird dabei kleiner. Es ist derselbe Vogel: Das Bild des großen ist
  // aus (.goch-fort), solange er unten sitzt – der Bühnen-Ast bleibt leer, nie sind zwei Gochs zu sehen. Zurück: Ist die Bühne
  // wieder zu mehr als der Hälfte im Bild (und die Überschrift unter 78 %), fliegt er hinauf und wird groß. Bei reduzierter
  // Bewegung ohne Flug. Ein offenes Gespräch wird dabei zur Leiste; im Vollbild mit Stimme bleibt er oben.
  const werkzeugKopf = unter ? null : document.querySelector('#werkzeuge h2');
  const fortSetzen = an => { fort = an; scene.classList.toggle('goch-fort', an); html.classList.toggle('goch-fort', an); if (an) mini.classList.remove('goch-mini-weg'); };
  function gabePruefen() {
    if (!werkzeugKopf || gabeZurueck || mini.dataset.flug) return;
    const vh = innerHeight, oben = werkzeugKopf.getBoundingClientRect().top, s = scene.getBoundingClientRect();
    const sicht = Math.max(0, Math.min(vh, s.bottom) - Math.max(0, s.top)) / Math.max(1, s.height);
    if (!fort) {
      // Am Rechner steht die Überschrift schon beim Laden im Bild: Er fliegt erst, wenn der Besucher ein Stück gescrollt hat
      // Hängt am Rechner gerade das Gesprächsfenster an Goch, bleibt er, bis die Bühne aus dem Bild ist – sonst würde schon
      // ein kleines Scrollen zum unteren Rand des Fensters das Gespräch zur Leiste machen
      const amAst = !panel.hidden && !schmal.matches && !breit && sicht >= .1;
      if (!amAst && oben < vh * .7 && scrollY > vh * .12 && scene.dataset.chat === 'on' && scene.dataset.state === 'rest' && lage !== 'fokus' && !platz && !ohneGoch) {
        miniLaden(); gabeHin = true; fortSetzen(true);
        if (!panel.hidden && !schmal.matches) breitPruefen(); // offenes Gespräch am Rechner: Leiste
        miniPruefen();
      }
    } else if (platz || ohneGoch) { fortSetzen(false); }
    else if (sicht > .5 && (oben > vh * .78 || scrollY < vh * .05)) {
      wortAus();
      // Er sitzt gerade nicht (noch im Anflug) oder die Bewegung ist reduziert: ohne Flug hinauf; sonst fliegt er oben wieder an
      if (!miniDa || ruhig.matches) { const flug = !miniDa && !ruhig.matches; fortSetzen(false); mini.classList.add('goch-mini-weg'); miniSicht(); begleiterBald(); breitPruefen(); if (flug && panel.hidden) grossAn(); return; }
      gabeZurueck = true; boden = getComputedStyle(mini).bottom; mini.style.bottom = boden; mini.classList.add('fliegt-ab');
      let erledigt = false;
      const oben = () => {
        if (erledigt) return;
        erledigt = true;
        // im selben Bild: kleiner weg, großer wieder da
        miniDa = false; gabeZurueck = false; mini.classList.remove('fliegt-ab'); mini.style.bottom = '';
        fortSetzen(false); mini.classList.add('goch-mini-weg'); rueckkehr = false;
        begleiterPruefen(); breitPruefen();
      };
      gabeFlug(false, oben);
      setTimeout(() => { if (!erledigt) { flugAus(); oben(); } }, 2600); // Sicherung: Der Rückweg endet in jedem Fall (verborgener Tab, abgebrochener Flug)
    }
  }
  function begleiterPruefen() {
    begleiterWartet = false;
    const r = scene.getBoundingClientRect(), vor = innerHeight * .35;
    gabePruefen();
    // Unterseiten: sobald der große Goch weit genug aus dem Bild ist. Startseite: sobald er selbst heruntergeflogen ist (Übergabe)
    const an = panel.hidden && !platz && scene.dataset.chat === 'on' && lage === 'aus' && !breit && (unter ? r.bottom < -vor - (begleitet ? 0 : 40) : fort);
    if (an !== begleitet) {
      begleitet = an;
      html.classList.toggle('goch-begleitet', an);
      if (an) { if (!stationen) stationenSuchen(); miniLaden(); unten(); }
      else { clearTimeout(kandidatT); clearTimeout(weichtT); weichtT = 0; weicht = false; kandidat = null; wortAus(); rueckkehr = unter && panel.hidden; hoch = 0; knopfOrt = null; durch = false; mini.classList.remove('durch'); mini.style.removeProperty('--goch-hoch'); }
      miniSicht(); knopfText();
    }
    if (begleitet && !gabeZurueck) stationPruefen(); // im Rückflug zur Bühne weder Sätze noch Platz machen
  }
  const begleiterBald = () => { if (!begleiterWartet) { begleiterWartet = true; requestAnimationFrame(begleiterPruefen); } };
  window.addEventListener('scroll', begleiterBald, { passive: true });
  if (werkzeugKopf) {
    new MutationObserver(begleiterBald).observe(scene, { attributes: true, attributeFilter: ['data-state', 'data-chat'] });
    // Vogel, Ast und Flugbilder des kleinen schon bereitlegen (dieselben Dateien wie oben, nach dem Laden der Seite)
    const bereit = () => setTimeout(() => { miniLaden(); flugBauen(); }, 600);
    if (document.readyState === 'complete') bereit(); else window.addEventListener('load', bereit, { once: true });
  }
  window.addEventListener('resize', () => { knopfOrt = null; begleiterBald(); }, { passive: true });
  window.addEventListener('site-languagechange', () => { knopfText(); wortAus(); });
  new MutationObserver(begleiterPruefen).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(begleiterBald).observe(scene, { attributes: true, attributeFilter: ['data-chat'] });
  begleiterBald();
  // Der kleine Goch wippt, solange Goch spricht (data-spricht an der Szene, goch-audio.js, bewegung)
  new MutationObserver(() => mini.classList.toggle('spricht', !!scene.dataset.spricht)).observe(scene, { attributes: true, attributeFilter: ['data-spricht'] });
  // ---------- „Platz machen“ (Entwurf vom 11.11.2026) ----------
  // Knopf über dem kleinen Goch. Goch antwortet kurz (fester Satz der Seite, keine Anfrage), das Gespräch geht zu – damit ist auch
  // das Mikrofon zu –, er fliegt ab, und am rechten Rand bleibt die Spitze seines Zweigs. Ein Tipp darauf ruft ihn zurück: Das
  // Gespräch ist wieder da wie zuvor (Kapsel am Handy, Blatt auf breiten Bildschirmen). Die Bitte gilt für den Besuch, auch über
  // Seitenwechsel (sessionStorage); wer Goch selbst antippt, hebt sie auf. Der Zweig zeigt sich nur, wenn Goch nicht im Bild ist.
  const platzKey = 'rjl-goch-platz';
  let platz = false, geht = 0, platzAlsBegleiter = false; // platzAlsBegleiter: Die Bitte kam ohne offenes Gespräch
  try { platz = sessionStorage.getItem(platzKey) === '1'; } catch (_) {}
  const platzKnopf = document.createElement('button'), zweig = document.createElement('button');
  platzKnopf.type = 'button'; platzKnopf.className = 'goch-platz'; platzKnopf.id = 'goch-platz';
  zweig.type = 'button'; zweig.className = 'goch-zweig'; zweig.id = 'goch-zweig'; zweig.hidden = true;
  const zweigBild = document.createElement('img'); zweigBild.alt = ''; zweig.append(zweigBild);
  const platzTexte = () => { platzKnopf.textContent = t('gochPlatz'); zweig.setAttribute('aria-label', t('gochZweig')); zweig.title = t('gochZweig'); };
  platzTexte(); window.addEventListener('site-languagechange', platzTexte);
  mini.append(platzKnopf); document.body.append(zweig);
  function platzMerken() { try { if (platz) sessionStorage.setItem(platzKey, '1'); else sessionStorage.removeItem(platzKey); } catch (_) {} }
  // „Platz machen“ bei offenem Gespräch: Pille und Zweig sitzen oben rechts, immer unter der Kopfleiste der Seite
  function obenLage() {
    const kopf = document.querySelector('header'), u = kopf ? kopf.getBoundingClientRect().bottom : 0;
    html.style.setProperty('--goch-oben', Math.round(Math.max(10, u + 8)) + 'px');
  }
  function obenAus() { ohneGoch = false; html.classList.remove('goch-oben'); html.style.removeProperty('--goch-oben'); miniSicht(); hoehe(); }
  window.addEventListener('scroll', () => { if (ohneGoch) obenLage(); }, { passive: true });
  function zweigPruefen() {
    const zeigen = platz && (panel.hidden || ohneGoch) && !miniDa && !mini.classList.contains('fliegt-ab') && sichtbar < .35;
    if (zeigen && !zweigBild.getAttribute('src')) { const ast = mini.querySelector('.goch-mini-ast'); zweigBild.src = ast.getAttribute('src') || ast.dataset.src; }
    zweig.hidden = !zeigen;
    // Die Pille zeigt sich mit dem Zweig. Beim großen Goch oben ruhen beide – außer das Mikrofon ist offen: Dann bleibt die
    // Pille stehen, damit ein offenes Mikrofon nie ohne Anzeige ist.
    html.classList.toggle('goch-zweig-da', zeigen || (ohneGoch && !!modus.mikro && !modus.einmal));
    if (ohneGoch) obenLage();
  }
  platzKnopf.addEventListener('click', e => {
    e.stopPropagation(); // nicht der Tipp auf den kleinen Goch
    if (geht) return;
    mini.classList.add('geht');
    const wort = document.createElement('span');
    wort.className = 'goch-platz-wort'; wort.setAttribute('role', 'status'); wort.textContent = t('gochPlatzWort');
    mini.append(wort);
    geht = setTimeout(() => {
      geht = 0; wort.remove(); mini.classList.remove('geht');
      platzAlsBegleiter = panel.hidden;
      platz = true; platzMerken();
      // Bei offenem Gespräch bleibt die Leiste (Robin, 12.11.2026): Nur Goch fliegt ab, der Zweig ruft ihn zurück
      // Die Leiste zieht mit: oben am Rand als kleine Pille neben dem Zweig, unten bleibt nichts liegen
      if (!panel.hidden) { ohneGoch = true; einklappen(); html.classList.add('goch-oben'); obenLage(); miniSicht(); setTimeout(zweigPruefen, 1300); return; }
      begleiterPruefen(); // war er Begleiter ohne Gespräch, fliegt er hier ab
      setTimeout(zweigPruefen, 1300);
    }, ruhig.matches ? 1400 : 1500);
  });
  zweig.addEventListener('click', () => {
    platz = false; platzMerken(); zweig.hidden = true;
    if (ohneGoch) { obenAus(); return; } // das Gespräch war die ganze Zeit offen: Goch setzt sich wieder neben die Leiste, sie liegt wieder unten
    if (platzAlsBegleiter) { platzAlsBegleiter = false; begleiterPruefen(); return; } // er kommt als Begleiter zurück, das Gespräch bleibt zu
    wiederda = schmal.matches; window.Goch.oeffnen(); pruefen(); breitPruefen();
  });
  // Wer Goch selbst antippt und das Gespräch öffnet, hebt die Bitte auf
  new MutationObserver(() => { if (panel.hidden && ohneGoch) obenAus(); if (!panel.hidden && platz && !ohneGoch) { platz = false; platzMerken(); } zweigPruefen(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  // Nach einem Seitenwechsel (Schritt 6): War das Gespräch offen, geht es wieder auf – auf breiten Bildschirmen als Blatt, am
  // Handy nur im Sprachmodus und dann als Kapsel neben dem kleinen Goch. Ohne Sprachmodus bleibt es am Handy zu (der Verlauf
  // ist beim Öffnen wieder da), sonst läge das Blatt beim Ankommen über der neuen Seite.
  modus = window.GochStimme.modus();
  if (!platz && window.Goch.wiederOffen && window.Goch.wiederOffen() && (!schmal.matches || modus.mikro || modus.laut)) { wiederda = schmal.matches; window.Goch.oeffnen(); }
  pruefen(); breitPruefen(); zweigPruefen();
})();
