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
  let begleitet = false, weicht = false; // Begleiter ohne offenes Gespräch; weicht: Unter ihm liegt gerade etwas Bedienbares (unten: Begleiter mit Stationen)
  // Der kleine Goch ist da: im Gesprächsmodus unterwegs, neben dem mitlaufenden Blatt oder als Begleiter
  const miniSicht = () => { mini.hidden = !(lage === 'unterwegs' || (lage === 'aus' && (!!breit || (begleitet && !weicht)))); };
  function setzen(neu) {
    if (neu === lage) return;
    const vorher = lage;
    lage = neu;
    html.classList.toggle('goch-fokus', neu === 'fokus');
    html.classList.toggle('goch-unterwegs', neu === 'unterwegs');
    if (neu === 'unterwegs') miniLaden();
    miniSicht();
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
  function miniPruefen() {
    const soll = !mini.hidden && !mini.classList.contains('goch-mini-weg') && (lage === 'unterwegs' || !!breit || begleitet);
    if (soll && !mini.classList.contains('fliegt-ab')) boden = getComputedStyle(mini).bottom;
    if (soll === miniDa) return;
    miniDa = soll;
    if (soll) { mini.classList.remove('fliegt-ab'); mini.style.bottom = ''; miniFlug(true, () => { gelandet = performance.now(); begleiterBald(); }); }
    // Nie zwei Gochs zugleich (Robin, 11.11.2026): Kommt der große Goch ins Bild, ist der kleine sofort weg – ohne Abflug.
    // Er fliegt nur ab, wenn der große nicht zu sehen ist (Gespräch geschlossen, „Seite ansehen“ aufgehoben).
    else if (sichtbar > .02 || grossImBild()) flugAus();
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
  function breitPruefen() {
    if (schmal.matches || panel.hidden) { breitSetzen(''); return; }
    if (!breit && sichtbar < .1) breitSetzen('blatt');      // Goch ist aus dem Bild
    else if (breit && sichtbar > .5) { breitSetzen(''); grossAn(); } // Goch ist wieder da: Das Blatt hängt wieder an seinem Ast, er fliegt an
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
  const untenBald = () => { if (!untenWartet && (!panel.hidden || begleitet)) { untenWartet = true; requestAnimationFrame(unten); } };
  if (vv) { vv.addEventListener('resize', untenBald); vv.addEventListener('scroll', untenBald); }
  window.addEventListener('scroll', untenBald, { passive: true });
  new MutationObserver(untenBald).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  if ('ResizeObserver' in window) new ResizeObserver(hoehe).observe(panel);
  new MutationObserver(breitPruefen).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  let wiederda = false;
  function pruefen() {
    // Eine einzelne gesprochene Frage (Mikrofon-Symbol, modus.einmal) vergrößert Goch nicht.
    if (!(schmal.matches && !panel.hidden && ((modus.mikro && !modus.einmal) || modus.laut))) setzen('aus');
    else if (lage === 'aus') { setzen(wiederda ? 'unterwegs' : 'fokus'); wiederda = false; } // nach einem Seitenwechsel als Kapsel, nicht groß
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
  // Kommt der große Goch zurück, fliegt er wieder an – nur wenn er gerade weder spricht noch zuhört (im Flug ruht der Schnabel)
  function grossAn() { if (window.GochFlug && !ruhig.matches && !window.GochStimme.beschaeftigt() && !modus.mikro) window.GochFlug.an(); }
  mini.addEventListener('click', () => {
    // Begleiter: Der Tipp öffnet das Gespräch – auf breiten Bildschirmen als mitlaufendes Blatt an Ort und Stelle, am Handy
    // bei Goch am Seitenanfang (dort steht das Gespräch ohne Sprachfunktion), er fliegt dort wieder an.
    if (begleitet) { wortAus(); if (schmal.matches) scrollTo(0, 0); else breitSetzen('blatt'); window.Goch.oeffnen(); if (schmal.matches) { rueckkehr = false; grossAn(); } return; }
    if (breit) scrollTo({ top: 0, behavior: ruhig.matches ? 'auto' : 'smooth' }); else { setzen('fokus'); grossAn(); }
  });
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
    // Nur am Griff des offenen Blatts. Auf der Kapsel gibt es keinen Wisch: Sie liegt in der Daumenzone, dort wäre es dieselbe
    // Geste wie Weiterscrollen. Ein Tipp auf die Kapsel oder den kleinen Goch klappt auf.
    const kapsel = () => lage === 'unterwegs' || breit === 'zeile';
    panel.addEventListener('touchstart', e => { y0 = (lage === 'aus' && !breit) || kapsel() || !e.target.closest('.goch-head') ? null : e.touches[0].clientY; }, { passive: true });
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
    mini.classList.toggle('goch-mini-weg', sichtbar > .02); // schon der Rand des großen Goch genügt: nie beide zugleich
    if (sichtbar > .02 && (mini.classList.contains('fliegt-ab') || mini.dataset.flug)) flugAus();
    if (sichtbar > 0 && rueckkehr) { rueckkehr = false; grossAn(); } // der Begleiter ist abgeflogen: Der große fliegt wieder an
    breitPruefen();
    if (typeof zweigPruefen === 'function') zweigPruefen();
  }, { threshold: [0, .02, .1, .35, .5, 1] }).observe(scene);
  // Der IntersectionObserver meldet erst ein Bild später. Solange der kleine Goch zu sehen ist, prüft deshalb schon das
  // Scrollen selbst, ob der große ins Bild kommt – dann ist der kleine im selben Bild weg.
  window.addEventListener('scroll', () => {
    if (!miniDa && !mini.classList.contains('fliegt-ab')) return;
    if (grossImBild()) { sichtbar = Math.max(sichtbar, .03); mini.classList.add('goch-mini-weg'); if (mini.classList.contains('fliegt-ab') || mini.dataset.flug) flugAus(); miniPruefen(); }
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
        stationen: 'stationen', rotkehlchen: 'rotkehlchen', kontakt: 'kontakt', neu: 'neu' }
    : { werkzeuge: 'werkzeuge', workshops: 'workshops', 'workshop-e-rechnung': 'ws_erechnung', blog: 'blog', 'ueber-mich': 'ueber_mich', nachricht: 'nachricht' };
  const TITEL = { 'was es kann': 'kann', 'was er kann': 'kann', 'what it does': 'kann', 'so geht es': 'so_geht_es', 'how it works': 'so_geht_es' };
  const BEDIENBAR = 'button, input, textarea, select, video, summary, a[class*="cta"], .wzs-karte a, .ws-karte a';
  const knopf = mini.querySelector('.goch-mini-knopf'), wort = document.createElement('span');
  wort.className = 'goch-mini-wort'; wort.hidden = true; wort.innerHTML = '<small></small><span></span>';
  mini.append(wort);
  let stationen = null, kandidat = null, kandidatT = 0, wortT = 0, gelandet = 0, rueckkehr = false, begleiterWartet = false, weichtT = 0, knopfOrt = null;
  const gesehen = new Set();
  function stationenSuchen() {
    stationen = [];
    if (unter) document.querySelectorAll('main h2').forEach(h => {
      const key = ORTE[h.id] || (!h.id && TITEL[h.textContent.trim().toLowerCase()]);
      if (key) stationen.push({ el: h, key, kopf: true });
    });
    else Object.keys(ORTE).forEach(id => { const el = $(id); if (el) stationen.push({ el, key: ORTE[id], kopf: false }); });
  }
  function stationJetzt() {
    const vh = innerHeight; let treffer = null;
    for (const s of stationen) {
      if (s.el.hidden) continue;
      const r = s.el.getBoundingClientRect();
      if (!r.height) continue;
      if (s.kopf ? r.top < vh * .6 && r.top > -vh * .4 : r.top < vh * .6 && r.bottom > vh * .3) treffer = s;
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
  // Kurze Runde von Ast zu Ast: Der Ast bleibt, Goch hebt ab, fliegt einen Bogen und landet wieder
  function miniRunde(fertig) {
    const lauf = ++flugLauf;
    const ende = () => { tier.classList.remove('fliegt'); tier.style.transform = ''; tier.style.opacity = ''; if (flugBilder) Object.values(flugBilder).forEach(i => { i.style.opacity = '0'; }); mini.dataset.flug = ''; fertig(); };
    flugBauen();
    if (ruhig.matches || document.hidden || !flugBilder || !Object.values(flugBilder).every(i => i.complete && i.naturalWidth)) { fertig(); return; }
    const dauer = 1250, start = performance.now(), w = tier.offsetWidth || 180;
    tier.classList.add('fliegt'); mini.dataset.flug = 'runde';
    const schritt = now => {
      if (lauf !== flugLauf) return;
      const p = Math.min(1, (now - start) / dauer), hoch = Math.sin(p * Math.PI);
      const x = (-hoch * .34 + Math.sin(p * Math.PI * 2) * .12) * w, y = -hoch * .62 * w;
      const pose = p > .8 ? 'landing' : ['up', 'glide', 'down', 'glide'][Math.floor((now - start) / 72) % 4];
      Object.entries(flugBilder).forEach(([k, i]) => { i.style.opacity = k === pose ? '1' : '0'; });
      tier.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(1 - hoch * .16).toFixed(3)})`;
      if (p < 1) requestAnimationFrame(schritt); else ende();
    };
    requestAnimationFrame(schritt);
  }
  function stationSagen(s) {
    if (!begleitet || kandidat !== s || gesehen.has(s.key)) return;
    const spaeter = ms => { kandidatT = setTimeout(() => stationSagen(s), ms); };
    if (!miniDa || mini.dataset.flug || weicht) { spaeter(400); return; } // er ist noch im Anflug oder macht gerade Platz
    wort.firstChild.textContent = t('gochWortWer'); wort.lastChild.textContent = t('gochStation_' + s.key);
    wort.hidden = false;
    if (!frei(wort.getBoundingClientRect())) { wort.hidden = true; spaeter(700); return; } // hier würde die Sprechblase etwas Bedienbares verdecken: später noch einmal
    wort.hidden = true;
    gesehen.add(s.key);
    const zeigen = () => {
      if (!begleitet || kandidat !== s || !miniDa) return;
      wort.hidden = false;
      if (!frei(wort.getBoundingClientRect())) { wort.hidden = true; return; }
      void wort.offsetWidth; wort.classList.add('da'); mini.classList.add('sagt'); // solange er etwas sagt, ruht „Platz machen“
      clearTimeout(wortT); wortT = setTimeout(wortAus, 6500);
    };
    if (performance.now() - gelandet < 2500) zeigen(); else miniRunde(zeigen); // gerade erst angeflogen: keine zweite Runde
  }
  function stationPruefen() {
    const s = stationJetzt();
    if (s !== kandidat) {
      kandidat = s; clearTimeout(kandidatT); wortAus();
      if (s && !gesehen.has(s.key)) kandidatT = setTimeout(() => stationSagen(s), 550); // erst wenn der Besucher im Abschnitt verweilt
    }
    if (!wort.hidden && !frei(wort.getBoundingClientRect())) wortAus();
    // Platz machen: Der Vogel nimmt Tipps an, deshalb zählen unter ihm auch gewöhnliche Verweise
    const r = knopf.getBoundingClientRect();
    if (r.width) knopfOrt = r;
    if (!frei(knopfOrt, BEDIENBAR + ', a[href]')) { clearTimeout(weichtT); weichtT = 0; if (!weicht) { weicht = true; wortAus(); miniSicht(); } }
    else if (weicht && !weichtT) weichtT = setTimeout(() => { weichtT = 0; weicht = false; if (begleitet) miniSicht(); }, 700);
  }
  const knopfText = () => knopf.setAttribute('aria-label', t(begleitet ? 'gochMiniFragen' : 'gochMini'));
  function begleiterPruefen() {
    begleiterWartet = false;
    const r = scene.getBoundingClientRect(), vor = innerHeight * .35;
    const an = panel.hidden && !platz && scene.dataset.chat === 'on' && lage === 'aus' && !breit && r.bottom < -vor - (begleitet ? 0 : 40);
    if (an !== begleitet) {
      begleitet = an;
      html.classList.toggle('goch-begleitet', an);
      if (an) { if (!stationen) stationenSuchen(); miniLaden(); unten(); }
      else { clearTimeout(kandidatT); clearTimeout(weichtT); weichtT = 0; weicht = false; kandidat = null; wortAus(); rueckkehr = panel.hidden; }
      miniSicht(); knopfText();
    }
    if (begleitet) stationPruefen();
  }
  const begleiterBald = () => { if (!begleiterWartet) { begleiterWartet = true; requestAnimationFrame(begleiterPruefen); } };
  window.addEventListener('scroll', begleiterBald, { passive: true });
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
  function zweigPruefen() {
    const zeigen = platz && panel.hidden && !miniDa && !mini.classList.contains('fliegt-ab') && sichtbar < .35;
    if (zeigen && !zweigBild.getAttribute('src')) { const ast = mini.querySelector('.goch-mini-ast'); zweigBild.src = ast.getAttribute('src') || ast.dataset.src; }
    zweig.hidden = !zeigen;
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
      window.Goch.schliessen(); // Gespräch zu: Der kleine Goch fliegt ab (miniPruefen), das Mikrofon ist zu
      begleiterPruefen(); // war er Begleiter ohne Gespräch, fliegt er hier ab
      setTimeout(zweigPruefen, 1300);
    }, ruhig.matches ? 1400 : 1500);
  });
  zweig.addEventListener('click', () => {
    platz = false; platzMerken(); zweig.hidden = true;
    if (platzAlsBegleiter) { platzAlsBegleiter = false; begleiterPruefen(); return; } // er kommt als Begleiter zurück, das Gespräch bleibt zu
    wiederda = schmal.matches; window.Goch.oeffnen(); pruefen(); breitPruefen();
  });
  // Wer Goch selbst antippt und das Gespräch öffnet, hebt die Bitte auf
  new MutationObserver(() => { if (!panel.hidden && platz) { platz = false; platzMerken(); } zweigPruefen(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  // Nach einem Seitenwechsel (Schritt 6): War das Gespräch offen, geht es wieder auf – auf breiten Bildschirmen als Blatt, am
  // Handy nur im Sprachmodus und dann als Kapsel neben dem kleinen Goch. Ohne Sprachmodus bleibt es am Handy zu (der Verlauf
  // ist beim Öffnen wieder da), sonst läge das Blatt beim Ankommen über der neuen Seite.
  modus = window.GochStimme.modus();
  if (!platz && window.Goch.wiederOffen && window.Goch.wiederOffen() && (!schmal.matches || modus.mikro || modus.laut)) { wiederda = schmal.matches; window.Goch.oeffnen(); }
  pruefen(); breitPruefen(); zweigPruefen();
})();
