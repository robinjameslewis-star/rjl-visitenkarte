// Sprechender Goch auf der Startseite (Robin, 23.10.2026). Im geöffneten Gespräch zwei Schalter: „Mit Goch sprechen“
// (Gespräch ohne Knopf: Goch hört zu und antwortet, sobald der Besucher eine kurze Pause macht; höchstens 20 s je Frage)
// und „Goch spricht laut“ (Stimme, auch beim Tippen). Beides erst nach einer eigenen Einwilligung, getrennt von der des
// Gesprächs; sie gilt nur für diesen Besuch (nur im Speicher, nicht im Browser abgelegt) und ist jederzeit abschaltbar.
// Ohne Aktivierung: keine Mikrofonfreigabe, kein Ton, keine Anfrage an /listen oder die Stimme. Gochs Antwort steht immer
// auch als Text da. Aktiv nur mit data-goch-stimme="an" am <body> (zum Testen lokal ?stimme=an).
(() => {
  'use strict';
  const language = window.SiteLanguage;
  const t = key => language.t(key);
  const $ = id => document.getElementById(id);
  const scene = $('scene'), panel = $('goch'), log = $('goch-log'), form = $('goch-form'), input = $('goch-input');
  if (!scene || !panel || !window.Goch || !window.GochAudio || scene.dataset.chat !== 'on') return;
  const A = window.GochAudio; // Tonbausteine, gemeinsam mit dem Messegerät (goch-audio.js)
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  // Testschalter nur lokal, wie ?goch= in goch.js; bleibt im Tab erhalten (sessionStorage).
  function testwert(name) {
    if (!lokal) return null;
    const v = new URL(location.href).searchParams.get(name), key = 'rjl-goch-test-' + name;
    try { if (v != null) sessionStorage.setItem(key, v); return sessionStorage.getItem(key); } catch (_) { return v; }
  }
  if ((testwert('stimme') || document.body.dataset.gochStimme || '') !== 'an') return;

  const leiste = $('goch-sprache'), mikroSchalter = $('goch-mikro-an'), lautSchalter = $('goch-laut');
  const einwilligung = $('goch-stimme-consent'), erlauben = $('goch-stimme-allow'), ablehnen = $('goch-stimme-deny');
  const mikro = $('goch-mikro'), knopf = $('goch-mikro-knopf'), pegelBalken = $('goch-pegel'), status = $('goch-mikro-status');
  const kiHinweis = $('goch-ki'), beenden = $('goch-stimme-ende');
  const listenEndpunkt = window.Goch.endpoint.replace(/\/chat$/, '/listen');
  const MAX_MS = 20000, STILLE_MS = Math.max(1000, +(testwert('stille') || 60000));
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-goch-stimme-text]').forEach(el => { el.hidden = false; }); // Datenschutzabsatz

  let erlaubt = false;           // Einwilligung dieses Besuchs, nur im Speicher
  let mikroAn = false, lautAn = false, schonGesprochen = false, wartet = null;
  let denkt = false, restLaeuft = false, spielt = false; // Goch beantwortet gerade eine Frage bzw. spricht

  const say = text => { const p = document.createElement('p'); p.className = 'goch-bubble goch-goch'; p.textContent = text; log.append(p); log.scrollTop = log.scrollHeight; };
  // Höhe der Sprechblase nachziehen, wenn Zeilen erscheinen oder verschwinden (goch.js, place)
  const nachziehen = () => { if (window.Goch.place) window.Goch.place(); };
  const meldung = text => { const war = !!status.textContent; status.textContent = text || ''; if (war !== !!status.textContent) nachziehen(); };

  // ---------- Schnabel, Lauschpose und Bewegung ----------
  // Schnabelposen (data-mundpose="halb", "offen" in der Szene) werden erst beim Einschalten geladen und dann gewechselt;
  // fehlt eine Pose (z. B. „lauschen“, solange Robins Pose fehlt), neigt sich der Vogel nur leicht (CSS über .bird-tilt).
  // Dazu bewegt er sich mit der Stimme und schaut in Pausen ab und zu zur Seite (goch-audio.js, bewegung).
  // Bei reduzierter Bewegung bleibt er ruhig.
  const koerper = A.bewegung(scene);
  const nameVon = f => f.dataset.pose || f.dataset.mundpose;
  function zeige(pose) {
    if (scene.dataset.state !== 'rest') return false;
    const leben = window.GochLeben && window.GochLeben.fuer(scene); // Teile statt ganzer Posen (goch-leben.js)
    if (leben && leben.aktiv()) return leben.kopf(pose);
    const frames = [...scene.querySelectorAll('.bird-frame[data-pose], .bird-frame[data-mundpose]')];
    const ziel = frames.find(f => nameVon(f) === pose && (f.dataset.pose || (f.complete && f.naturalWidth > 0)));
    if (!ziel) return false;
    frames.forEach(f => { if (f.dataset.pose === 'rest' || f.dataset.mundpose) f.style.opacity = f === ziel ? '1' : '0'; });
    return true;
  }
  function posenLaden() {
    const leben = window.GochLeben && window.GochLeben.fuer(scene);
    if (leben && leben.aktiv()) { leben.posenLaden(); return; } // nur die kleinen Köpfe statt ganzer Posen
    scene.querySelectorAll('.bird-frame[data-src-spaet]').forEach(f => { if (!f.getAttribute('src')) f.src = f.dataset.srcSpaet; });
  }
  function mund(stufe) { // 'zu' | 'halb' | 'offen'
    if (ruhig.matches) stufe = 'zu';
    if (stufe === 'zu') { delete scene.dataset.mund; if (zustand !== 'spricht') zeige('rest'); return; }
    if (zeige(stufe)) delete scene.dataset.mund; else scene.dataset.mund = stufe;
  }
  function lauschen(an) {
    if (an && !ruhig.matches) { if (!zeige('lauschen')) scene.dataset.lauscht = '1'; }
    else { delete scene.dataset.lauscht; zeige('rest'); }
  }
  // Blinzeln (Robin, 23.10.2026): im offenen Gespräch alle paar Sekunden, ab und zu doppelt; nie während Goch spricht oder
  // jemand zu ihm spricht. Die Pose „blinzeln“ wird wie die Schnabelposen erst beim Einschalten geladen.
  let blinzelTimer = 0;
  function blinzeln(doppelt = false) {
    if (ruhig.matches || spielt || zustand === 'spricht' || scene.dataset.mund || scene.dataset.lauscht || !zeige('blinzeln')) return;
    setTimeout(() => { if (!spielt) zeige('rest'); if (doppelt) setTimeout(() => blinzeln(), 170); }, 110);
  }
  function blinzelnPlanen(an) {
    if (!an) { clearTimeout(blinzelTimer); blinzelTimer = 0; return; }
    if (blinzelTimer) return;
    blinzelTimer = setTimeout(() => { blinzelTimer = 0; blinzeln(Math.random() < .2); blinzelnPlanen(erlaubt && !panel.hidden); }, 2500 + Math.random() * 4000);
  }
  const blicken = () => { koerper.blicken(erlaubt && !panel.hidden); blinzelnPlanen(erlaubt && !panel.hidden); };

  // ---------- Ton (goch-audio.js) ----------
  const entsperren = A.entsperren;
  function schweigen() { A.schweigen(); mund('zu'); koerper.ende(); }
  async function abspielen(stimme) {
    if (!lautAn || panel.hidden) return true;
    let weich = 0;
    const ok = await A.abspielen(stimme.daten, {
      pegel: rms => { weich = weich * .55 + rms * .45; mund(weich > .09 ? 'offen' : weich > .025 ? 'halb' : 'zu'); koerper.stimme(rms); },
      ende: () => { spielt = false; mund('zu'); koerper.ende(); weiterHoeren(); },
    });
    if (ok) spielt = true;
    return ok;
  }
  // Rückfall auf eine Stimme des Geräts nur, wenn Gochs Paket ihn erlaubt (figur.json, stimme.rueckfall „browser“). Für Goch
  // „keine“ (Robin, 23.10.2026): Jeder Besucher hört dieselbe Stimme – ohne Stimme vom Server nur Text.
  let stimmCfg = null;
  async function browserStimme(text) {
    if (!stimmCfg) {
      try { stimmCfg = (await (await fetch('figuren/goch/figur.json')).json()).stimme || {}; } catch (_) { stimmCfg = {}; }
    }
    if (stimmCfg.rueckfall !== 'browser') return false;
    const charakter = stimmCfg.browser || {};
    const lang = language.current === 'en' ? 'en' : 'de';
    let zu = 0;
    A.browserStimme(text, lang, { vorzug: charakter[lang] || [], tonhoehe: charakter.tonhoehe || 1, tempo: charakter.tempo || 1,
      wort: () => { mund('offen'); clearTimeout(zu); zu = setTimeout(() => mund('halb'), 110); },
      ende: () => { clearTimeout(zu); mund('zu'); },
    });
    return true;
  }

  // Fragt Goch nach Angaben, die man buchstabiert oder diktiert (E-Mail-Adresse, Name, Telefon), wartet der nächste Abschnitt
  // länger auf das Ende, damit eine kurze Pause beim Diktieren nicht mitten in der Adresse abschickt (Robin, 01.11.2026).
  const DIKTAT_PAUSE_MS = 2500;
  let diktat = false;
  const fragtNachAngaben = text => /\?/.test(text || '') && /e-?mail|mail-?adresse|ihren? namen?|your name|telefon|phone|nummer|number/i.test(text || '');

  // ---------- Anfrage und Antwort (aus goch.js) ----------
  window.GochStimme = {
    anfrage(opts) {
      denkt = true;
      if (ohr) { ohr.anhalten(); if (zustand !== 'pause') setzeZustand('denkt'); }
      if (!erlaubt) return { kannZeigen: true };
      const z = {};
      if (opts && opts.gesprochen) z.gesprochen = true;
      if (lautAn) { schweigen(); z.stimme = { erste: !schonGesprochen }; schonGesprochen = true; if (kiHinweis.hidden) { kiHinweis.hidden = false; nachziehen(); } }
      if (Object.keys(z).length) z.figur = 'goch';
      z.kannZeigen = true; // die Seite kann zu Stellen führen (goch-gespraech.js)
      return z;
    },
    async rest(reader, buf, dec, antwort) {
      restLaeuft = true;
      diktat = fragtNachAngaben(antwort && antwort.reply);
      try {
        for (;;) {
          const i = buf.indexOf('\n');
          if (i >= 0) {
            const zeile = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (zeile) await stimmeZurAntwort(JSON.parse(zeile), antwort);
            continue;
          }
          const { value, done } = await reader.read();
          if (done) { if (buf.trim()) await stimmeZurAntwort(JSON.parse(buf), antwort); return; }
          buf += dec.decode(value, { stream: true });
        }
      } catch (_) { /* ohne Stimme bleibt der Text */ }
      finally { restLaeuft = false; if (!spielt) weiterHoeren(); }
    },
    // für goch-zwitschern.js: in Gesprächspausen zwitschern, hörbar nur mit Stimme
    beschaeftigt: () => denkt || restLaeuft || spielt || zustand === 'spricht',
    laut: () => lautAn,
    blinzeln: doppelt => blinzeln(!!doppelt), // für goch-blick.js: Goch bemerkt jemanden
    koerper,                    // für goch-blick.js: dem Gegenüber zuwenden
  };
  // Ohne Stimme („aus“, „grenze“, „fehler“ oder nicht abspielbar): Gerätestimme nur, wenn die Figur sie erlaubt (Goch:
  // nein). Sonst bleibt die Antwort als Text, Sprechen schaltet sich ab, und im Chat steht nur ein allgemeiner Hinweis –
  // nie ein Grund oder Anbieter (Robin, 23.10.2026).
  async function stimmeZurAntwort(z, antwort) {
    if (!z || !('stimme' in z) || !lautAn || panel.hidden) return;
    if (z.stimme && await abspielen(z.stimme)) return;
    if (z.grund !== 'grenze' && await browserStimme(antwort && antwort.reply)) return;
    nurChat();
  }
  function nurChat() {
    if (!lautAn) return;
    mikroAn = false; lautAn = false;
    schweigen(); zuhoerenStoppen(); setzeZustand('aus'); meldung('');
    say(t('gochNurChat'));
    aktualisieren(); input.focus();
    window.dispatchEvent(new CustomEvent('goch-nur-chat')); // goch-blick.js: Kamera aus
  }
  window.addEventListener('goch-fertig', () => { denkt = false; setTimeout(() => { if (!restLaeuft && !spielt) weiterHoeren(); }, 0); });

  // ---------- Gespräch ohne Knopf (Robin, 23.10.2026) ----------
  // Ist „Mit Goch sprechen“ an, hört Goch zu: Der Browser erkennt selbst, wann jemand spricht und wann er nach einer kurzen
  // Pause fertig ist (goch-audio.js, zuhoeren); erst dann geht dieser Abschnitt (WAV 16 kHz, höchstens 20 s) an /listen.
  // Während Goch versteht, denkt oder spricht, hört er nicht zu. Nach einer Minute ohne Sprache, beim Wechsel des Tabs, mit
  // „Pause“ oder beim Schließen des Gesprächs schließt er das Mikrofon; „Weiter zuhören“ öffnet es wieder.
  // Zustände: aus | hoert | spricht (der Besucher) | denkt (Goch) | pause. Der Knopf heißt „Pause“, „Fertig“ oder „Weiter zuhören“.
  let ohr = null, oeffnet = false, zustand = 'aus', stilleTimer = 0, ersteRunde = true;
  function setzeZustand(z, text) {
    zustand = z;
    mikro.dataset.zustand = z;
    knopf.setAttribute('aria-pressed', String(z === 'spricht'));
    const k = z === 'spricht' ? 'gochKnopfFertig' : z === 'pause' || z === 'aus' ? 'gochKnopfWeiter' : 'gochKnopfPause';
    knopf.dataset.i18n = k; knopf.textContent = t(k);
    if (text !== undefined) meldung(text);
    if (z !== 'spricht') pegelBalken.style.width = '0';
    clearTimeout(stilleTimer);
    if (z === 'hoert') stilleTimer = setTimeout(() => schlafen(t('gochZuhoerenSchlaeft')), STILLE_MS);
  }
  async function zuhoerenStarten() {
    if (ohr || oeffnet || !mikroAn || panel.hidden) return;
    oeffnet = true;
    let o;
    try {
      o = await A.zuhoeren({
        maxMs: MAX_MS,
        pegel: (rms, spricht) => { if (spricht) pegelBalken.style.width = Math.min(100, Math.round(rms * 600)) + '%'; },
        start: () => {
          // Mit Blickkontakt (goch-blick.js) hört Goch nur zu, wenn er angesehen wird – Gespräche nebenan zählen nicht
          if (window.GochBlick && !window.GochBlick.aufmerksam()) { ohr.anhalten(); ohr.weiter(); window.GochBlick.hinweisen(); return; }
          setzeZustand('spricht'); lauschen(true); restzeitZeigen();
        },
        ende: abschnitt,
      });
    } catch (_) {
      oeffnet = false; mikroAn = false; setzeZustand('aus'); aktualisieren(); meldung(t('gochMikroVerweigert'));
      return;
    }
    oeffnet = false;
    if (!mikroAn || panel.hidden) { o.stopp(); return; }
    ohr = o;
    if (denkt || restLaeuft || spielt) { ohr.anhalten(); setzeZustand('denkt'); return; }
    setzeZustand('hoert', t(ersteRunde ? 'gochMikroHinweis' : 'gochZuhoeren'));
    ersteRunde = false;
  }
  function zuhoerenStoppen() {
    clearTimeout(stilleTimer);
    if (ohr) { ohr.stopp(); ohr = null; }
    if (scene.dataset.lauscht) lauschen(false);
  }
  function schlafen(text) { zuhoerenStoppen(); setzeZustand('pause', text); }
  function mikroAus(text) { mikroAn = false; zuhoerenStoppen(); setzeZustand('aus'); aktualisieren(); meldung(text); input.focus(); }
  function restzeitZeigen() {
    const beginn = performance.now();
    const schritt = () => {
      if (zustand !== 'spricht') return;
      const text = t('gochMikroHoert').replace('{s}', Math.max(0, Math.ceil((MAX_MS - (performance.now() - beginn)) / 1000)));
      if (status.textContent !== text) meldung(text);
      requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }
  // Ein gesprochener Abschnitt ist zu Ende (kurze Pause, „Fertig“ oder 20 s): erkennen lassen und als Frage stellen.
  async function abschnitt(daten) {
    if (scene.dataset.lauscht) lauschen(false);
    if (!daten) { if (zustand === 'spricht') setzeZustand('hoert', t('gochZuhoeren')); return; } // nur ein Geräusch
    if (ohr) ohr.anhalten();
    setzeZustand('denkt', t('gochMikroErkennen'));
    let d = {};
    try {
      const r = await fetch(listenEndpunkt + '?lang=' + (language.current === 'en' ? 'en' : 'de'),
        { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: daten });
      d = await r.json().catch(() => ({}));
      if (r.status === 503) { mikroAus(t('gochMikroAusgeschaltet')); return; }
      if (!r.ok) { weiterHoeren(t('gochMikroFehler')); return; }
    } catch (_) { weiterHoeren(t('gochMikroFehler')); return; }
    if (d.grenze) { mikroAus(t('gochMikroGrenze')); return; } // Grenze erreicht: Tippen, ohne Fehlermeldung
    if (!d.text) { weiterHoeren(t('gochMikroNichts')); return; }
    meldung('');
    window.Goch.ask(d.text, { gesprochen: true });
  }
  // Nach der Antwort (und Gochs Stimme) wieder zuhören – nicht, wenn der Besucher inzwischen „Pause“ gewählt hat.
  function weiterHoeren(text) {
    if (!ohr || zustand !== 'denkt') return;
    setTimeout(() => {
      if (!ohr || zustand !== 'denkt' || denkt || restLaeuft || spielt) return;
      ohr.pause(diktat ? DIKTAT_PAUSE_MS : 0); diktat = false; // nach einer Frage nach E-Mail, Name oder Telefon länger warten
      ohr.weiter(); setzeZustand('hoert', text || t('gochZuhoeren'));
    }, 400);
  }
  knopf.addEventListener('click', () => {
    entsperren();
    if (zustand === 'spricht') { if (ohr) ohr.fertig(); return; }
    if (zustand === 'pause' || zustand === 'aus') { zuhoerenStarten(); return; }
    schlafen(t('gochZuhoerenPause'));
  });
  // Beim Tabwechsel bleibt das Mikrofon an (Robin, 23.10.2026: das Abschalten verwirrte); es schließt nach einer Minute Stille.

  // ---------- Schalter und Einwilligung ----------
  function aktualisieren() {
    // Schalter nur neben dem Textfeld: nicht, solange das Gespräch abgelehnt ist oder seine Einwilligung offen ist
    const kameraFrage = $('goch-kamera-consent');
    leiste.hidden = panel.hidden || form.hidden || !einwilligung.hidden || (!!kameraFrage && !kameraFrage.hidden);
    mikroSchalter.setAttribute('aria-pressed', String(mikroAn));
    lautSchalter.setAttribute('aria-pressed', String(lautAn));
    mikro.hidden = !mikroAn || leiste.hidden;
    beenden.hidden = !erlaubt;
    if (!mikroAn && ohr) { zuhoerenStoppen(); setzeZustand('aus'); }
    blicken();
    nachziehen();
    window.dispatchEvent(new CustomEvent('goch-modus', { detail: { mikro: mikroAn, laut: lautAn } })); // goch-gespraech.js
  }
  function umschalten(welcher) {
    entsperren(); // in der Berührung: Ton und Sprachausgabe freischalten (iOS/Safari)
    if (!erlaubt) {
      wartet = welcher;
      einwilligung.hidden = false; leiste.hidden = true;
      erlauben.focus();
      return;
    }
    posenLaden();
    if (welcher === 'mikro') {
      mikroAn = !mikroAn;
      if (!mikroAn) { zuhoerenStoppen(); setzeZustand('aus'); meldung(''); }
    } else {
      lautAn = !lautAn;
      if (lautAn) { kiHinweis.hidden = false; if (window.GochZwitschern) window.GochZwitschern.bestaetigen(); }
      else schweigen();
    }
    aktualisieren();
    if (welcher === 'mikro' && mikroAn) { knopf.focus(); zuhoerenStarten(); }
  }
  mikroSchalter.addEventListener('click', () => umschalten('mikro'));
  lautSchalter.addEventListener('click', () => umschalten('laut'));
  erlauben.addEventListener('click', () => {
    erlaubt = true; einwilligung.hidden = true;
    const w = wartet; wartet = null;
    if (w) umschalten(w); else aktualisieren();
  });
  ablehnen.addEventListener('click', () => {
    wartet = null; einwilligung.hidden = true;
    say(t('gochStimmeDenied'));
    aktualisieren(); input.focus();
  });
  beenden.addEventListener('click', () => {
    erlaubt = false; mikroAn = false; lautAn = false;
    schweigen(); zuhoerenStoppen(); setzeZustand('aus'); meldung('');
    say(t('gochStimmeBeendet'));
    aktualisieren(); input.focus();
  });

  // ---------- Gespräch geschlossen, ausgeschaltet oder abgelehnt ----------
  new MutationObserver(() => {
    if (panel.hidden) { schweigen(); if (ohr) schlafen(''); einwilligung.hidden = true; wartet = null; }
    if (scene.dataset.chat !== 'on') { erlaubt = false; mikroAn = false; lautAn = false; }
    aktualisieren();
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(aktualisieren).observe(form, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(aktualisieren).observe($('goch-consent'), { attributes: true, attributeFilter: ['hidden'] });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { schweigen(); if (ohr) schlafen(''); } });
  ruhig.addEventListener('change', () => { mund('zu'); koerper.ende(); });
  aktualisieren();
})();
