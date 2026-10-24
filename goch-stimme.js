// Sprechender Goch auf der Startseite (Robin, 23.10.2026). Im geöffneten Gespräch zwei Schalter: „Mit Goch sprechen“
// (Mikrofon, Push-to-talk: Knopf halten oder tippen – sprechen – tippen, höchstens 20 s) und „Goch spricht laut“ (Stimme,
// auch beim Tippen). Beides erst nach einer eigenen Einwilligung, getrennt von der des Gesprächs; sie gilt nur für diesen
// Besuch (nur im Speicher, nicht im Browser abgelegt) und ist jederzeit abschaltbar. Ohne Aktivierung: keine
// Mikrofonfreigabe, kein Ton, keine Anfrage an /listen oder die Stimme. Gochs Antwort steht immer auch als Text da.
// Aktiv nur mit data-goch-stimme="an" am <body> (zum Testen lokal ?stimme=an).
(() => {
  'use strict';
  const language = window.SiteLanguage;
  const t = key => language.t(key);
  const $ = id => document.getElementById(id);
  const scene = $('scene'), panel = $('goch'), log = $('goch-log'), form = $('goch-form'), input = $('goch-input');
  if (!scene || !panel || !window.Goch || scene.dataset.chat !== 'on') return;
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
  const MAX_MS = 20000, HALTEN_MS = 350;
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-goch-stimme-text]').forEach(el => { el.hidden = false; }); // Datenschutzabsatz

  let erlaubt = false;           // Einwilligung dieses Besuchs, nur im Speicher
  let mikroAn = false, lautAn = false, schonGesprochen = false, wartet = null;
  let ctx = null;                // AudioContext, erst nach einer Berührung (iOS/Safari)
  let quelle = null, sprichtBrowser = false, aufnahme = null, startet = false;

  const say = text => { const p = document.createElement('p'); p.className = 'goch-bubble goch-goch'; p.textContent = text; log.append(p); log.scrollTop = log.scrollHeight; };
  const meldung = text => { status.textContent = text || ''; };

  // ---------- Schnabel und Lauschpose ----------
  // Mit eigenen Posen (data-pose="halb", "offen", "lauschen" in der Szene) wechselt das Bild; bis Robins Posen da sind,
  // neigt sich der Vogel nur leicht (CSS über .bird-tilt). Bei reduzierter Bewegung bleibt er ruhig.
  function zeige(pose) {
    const frames = [...scene.querySelectorAll('.bird-frame[data-pose]')];
    const ziel = pose && frames.find(f => f.dataset.pose === pose);
    if (scene.dataset.state !== 'rest') return false;
    if (!ziel) { frames.forEach(f => { if (['halb', 'offen', 'lauschen', 'zwitschern'].includes(f.dataset.pose)) f.style.opacity = '0'; }); return false; }
    frames.forEach(f => { f.style.opacity = f === ziel ? '1' : '0'; });
    return true;
  }
  function mund(stufe) { // 'zu' | 'halb' | 'offen'
    if (ruhig.matches) stufe = 'zu';
    if (stufe === 'zu') { delete scene.dataset.mund; if (!aufnahme) zeige('rest'); return; }
    if (!zeige(stufe)) scene.dataset.mund = stufe;
  }
  function lauschen(an) {
    if (an && !ruhig.matches) { if (!zeige('lauschen')) scene.dataset.lauscht = '1'; }
    else { delete scene.dataset.lauscht; zeige('rest'); }
  }

  // ---------- Ton ----------
  function audio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!ctx && Ctx) ctx = new Ctx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // iOS/Safari: Ton und Sprachausgabe nur, wenn sie in einer Berührung freigeschaltet wurden.
  function entsperren() {
    audio();
    if ('speechSynthesis' in window && !entsperren.sprache) {
      entsperren.sprache = true;
      try { const u = new SpeechSynthesisUtterance(''); u.volume = 0; speechSynthesis.speak(u); } catch (_) {}
    }
  }
  function schweigen() {
    if (quelle) { try { quelle.stop(); } catch (_) {} quelle = null; }
    if (sprichtBrowser && 'speechSynthesis' in window) speechSynthesis.cancel();
    sprichtBrowser = false;
    mund('zu');
  }
  function schnabel(analyser, src) {
    if (ruhig.matches) return;
    const daten = new Float32Array(analyser.fftSize);
    let weich = 0;
    const schritt = () => {
      if (quelle !== src) return;
      analyser.getFloatTimeDomainData(daten);
      let summe = 0;
      for (const v of daten) summe += v * v;
      weich = weich * .55 + Math.sqrt(summe / daten.length) * .45;
      mund(weich > .09 ? 'offen' : weich > .025 ? 'halb' : 'zu');
      requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }
  async function abspielen(stimme) {
    const c = audio();
    if (!c) return false;
    try {
      const bytes = Uint8Array.from(atob(stimme.daten), ch => ch.charCodeAt(0));
      const puffer = await c.decodeAudioData(bytes.buffer);
      if (!lautAn || panel.hidden) return true;
      schweigen();
      const src = c.createBufferSource(), analyser = c.createAnalyser();
      analyser.fftSize = 512;
      src.buffer = puffer;
      src.connect(analyser); analyser.connect(c.destination);
      quelle = src;
      src.onended = () => { if (quelle === src) { quelle = null; mund('zu'); } };
      src.start();
      schnabel(analyser, src);
      return true;
    } catch (_) { return false; }
  }
  // Rückfall ohne Stimme vom Server: nur lokale Stimmen des Geräts – Online-Stimmen (z. B. „Google Deutsch“) würden den
  // Text an einen weiteren Dienst schicken.
  function browserStimme(text) {
    if (!('speechSynthesis' in window) || !text) return;
    const lang = language.current === 'en' ? 'en' : 'de';
    const stimmen = speechSynthesis.getVoices().filter(v => v.localService && v.lang.toLowerCase().startsWith(lang));
    const stimme = stimmen.find(v => /GB/i.test(v.lang)) || stimmen[0];
    if (!stimme) return;
    schweigen();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = stimme; u.lang = stimme.lang;
    let zu = 0;
    u.onboundary = () => { mund('offen'); clearTimeout(zu); zu = setTimeout(() => mund('halb'), 110); };
    u.onend = u.onerror = () => { sprichtBrowser = false; clearTimeout(zu); mund('zu'); };
    sprichtBrowser = true;
    speechSynthesis.speak(u);
  }

  // ---------- Anfrage und Antwort (aus goch.js) ----------
  window.GochStimme = {
    anfrage(opts) {
      if (!erlaubt) return {};
      const z = {};
      if (opts && opts.gesprochen) z.gesprochen = true;
      if (lautAn) { schweigen(); z.stimme = { erste: !schonGesprochen }; schonGesprochen = true; kiHinweis.hidden = false; }
      if (Object.keys(z).length) z.figur = 'goch';
      return z;
    },
    async rest(reader, buf, dec, antwort) {
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
    },
  };
  // „grenze“: nur Text, ohne Hinweis. „aus“ und „fehler“: lokale Browserstimme, wenn es eine gibt.
  async function stimmeZurAntwort(z, antwort) {
    if (!z || !('stimme' in z) || !lautAn || panel.hidden) return;
    if (z.stimme && await abspielen(z.stimme)) return;
    if (z.grund !== 'grenze') browserStimme(antwort && antwort.reply);
  }

  // ---------- Schalter und Einwilligung ----------
  function aktualisieren() {
    // Schalter nur neben dem Textfeld: nicht, solange das Gespräch abgelehnt ist oder seine Einwilligung offen ist
    leiste.hidden = panel.hidden || form.hidden || !einwilligung.hidden;
    mikroSchalter.setAttribute('aria-pressed', String(mikroAn));
    lautSchalter.setAttribute('aria-pressed', String(lautAn));
    mikro.hidden = !mikroAn || leiste.hidden;
    beenden.hidden = !erlaubt;
    if (!mikroAn && aufnahme) stoppeAufnahme(false);
  }
  function umschalten(welcher) {
    entsperren(); // in der Berührung: Ton und Sprachausgabe freischalten (iOS/Safari)
    if (!erlaubt) {
      wartet = welcher;
      einwilligung.hidden = false; leiste.hidden = true;
      erlauben.focus();
      return;
    }
    if (welcher === 'mikro') {
      mikroAn = !mikroAn;
      meldung(mikroAn ? t('gochMikroHinweis') : '');
    } else {
      lautAn = !lautAn;
      if (lautAn) { kiHinweis.hidden = false; if (window.GochZwitschern) window.GochZwitschern.bestaetigen(); }
      else schweigen();
    }
    aktualisieren();
    if (welcher === 'mikro' && mikroAn) knopf.focus();
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
    schweigen(); stoppeAufnahme(false); meldung('');
    say(t('gochStimmeBeendet'));
    aktualisieren(); input.focus();
  });

  // ---------- Aufnahme: Push-to-talk, WAV 16 kHz mono ----------
  async function aufnehmen() {
    if (aufnahme || startet || !mikroAn) return;
    startet = true;
    schweigen();
    const c = audio();
    let stream;
    try {
      if (!c || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('kein Mikrofon');
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch (_) {
      startet = false; mikroAn = false; aktualisieren(); meldung(t('gochMikroVerweigert'));
      return;
    }
    startet = false;
    if (!mikroAn || panel.hidden) { stream.getTracks().forEach(tr => tr.stop()); return; }
    const src = c.createMediaStreamSource(stream), analyser = c.createAnalyser(), proc = c.createScriptProcessor(4096, 1, 1), still = c.createGain();
    still.gain.value = 0; // der Prozessor braucht einen Ausgang; hörbar wird nichts
    analyser.fftSize = 1024;
    const teile = [];
    proc.onaudioprocess = e => { if (aufnahme && aufnahme.proc === proc) teile.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
    src.connect(analyser); src.connect(proc); proc.connect(still); still.connect(c.destination);
    aufnahme = { stream, src, proc, still, analyser, teile, rate: c.sampleRate, start: performance.now() };
    aufnahme.timer = setTimeout(() => stoppeAufnahme(true), MAX_MS);
    knopf.setAttribute('aria-pressed', 'true');
    lauschen(true);
    pegel(aufnahme);
  }
  function pegel(a) {
    const daten = new Float32Array(a.analyser.fftSize);
    const schritt = () => {
      if (aufnahme !== a) { pegelBalken.style.width = '0'; return; }
      a.analyser.getFloatTimeDomainData(daten);
      let spitze = 0;
      for (const v of daten) spitze = Math.max(spitze, Math.abs(v));
      pegelBalken.style.width = Math.min(100, Math.round(spitze * 140)) + '%';
      const rest = Math.max(0, Math.ceil((MAX_MS - (performance.now() - a.start)) / 1000));
      const text = t('gochMikroHoert').replace('{s}', rest);
      if (status.textContent !== text) meldung(text);
      requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }
  function wav(teile, rate) {
    const ziel = 16000, verhaeltnis = rate / ziel;
    const laenge = teile.reduce((n, a) => n + a.length, 0), alle = new Float32Array(laenge);
    let pos = 0;
    for (const a of teile) { alle.set(a, pos); pos += a.length; }
    const n = Math.floor(laenge / verhaeltnis), b = new DataView(new ArrayBuffer(44 + n * 2));
    const text = (o, s) => [...s].forEach((ch, i) => b.setUint8(o + i, ch.charCodeAt(0)));
    text(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); text(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
    b.setUint32(24, ziel, true); b.setUint32(28, ziel * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); text(36, 'data'); b.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { // Mittelwert je Zielabtastung: einfacher Tiefpass gegen Aliasing
      const von = Math.floor(i * verhaeltnis), bis = Math.max(von + 1, Math.floor((i + 1) * verhaeltnis));
      let s = 0;
      for (let j = von; j < bis; j++) s += alle[j];
      const v = Math.max(-1, Math.min(1, s / (bis - von)));
      b.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
    return new Blob([b.buffer], { type: 'audio/wav' });
  }
  async function stoppeAufnahme(senden) {
    const a = aufnahme;
    if (!a) return;
    aufnahme = null;
    clearTimeout(a.timer);
    [a.proc, a.src, a.still].forEach(n => { try { n.disconnect(); } catch (_) {} });
    a.stream.getTracks().forEach(tr => tr.stop());
    knopf.setAttribute('aria-pressed', 'false');
    lauschen(false);
    pegelBalken.style.width = '0';
    if (!senden) { meldung(''); return; }
    if ((performance.now() - a.start) / 1000 < .4) { meldung(t('gochMikroKurz')); return; }
    meldung(t('gochMikroErkennen'));
    let d = {};
    try {
      const r = await fetch(listenEndpunkt + '?lang=' + (language.current === 'en' ? 'en' : 'de'),
        { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav(a.teile, a.rate) });
      d = await r.json().catch(() => ({}));
      if (r.status === 503) { mikroAn = false; aktualisieren(); meldung(t('gochMikroAusgeschaltet')); input.focus(); return; }
      if (!r.ok) { meldung(t('gochMikroFehler')); return; }
    } catch (_) { meldung(t('gochMikroFehler')); return; }
    if (d.grenze) { meldung(t('gochMikroGrenze')); input.focus(); return; } // Grenze erreicht: Tippen, ohne Fehlermeldung
    if (!d.text) { meldung(t('gochMikroNichts')); return; }
    meldung('');
    window.Goch.ask(d.text, { gesprochen: true });
  }
  // Halten: Aufnahme bis zum Loslassen. Kurz tippen: Aufnahme bis zum nächsten Tippen. Tastatur: Leertaste oder Enter.
  let gedrueckt = 0, perDruck = false;
  const druck = () => {
    if (aufnahme) { perDruck = false; stoppeAufnahme(true); return; }
    gedrueckt = performance.now(); perDruck = true; aufnehmen();
  };
  const los = () => {
    if (perDruck && aufnahme && performance.now() - gedrueckt >= HALTEN_MS) stoppeAufnahme(true);
    perDruck = false;
  };
  // Den Zeiger festhalten: Verschiebt sich die Sprechblase während der Aufnahme (Statuszeile), kommt das Loslassen trotzdem an.
  knopf.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    try { knopf.setPointerCapture(e.pointerId); } catch (_) {}
    entsperren(); druck();
  });
  knopf.addEventListener('pointerup', los);
  knopf.addEventListener('pointercancel', los);
  knopf.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); entsperren(); druck(); } });
  knopf.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); los(); } });
  knopf.addEventListener('click', e => e.preventDefault());

  // ---------- Gespräch geschlossen, ausgeschaltet oder abgelehnt ----------
  new MutationObserver(() => {
    if (panel.hidden) { schweigen(); stoppeAufnahme(false); einwilligung.hidden = true; wartet = null; }
    if (scene.dataset.chat !== 'on') { erlaubt = false; mikroAn = false; lautAn = false; }
    aktualisieren();
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(aktualisieren).observe(form, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(aktualisieren).observe($('goch-consent'), { attributes: true, attributeFilter: ['hidden'] });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { schweigen(); stoppeAufnahme(false); } });
  ruhig.addEventListener('change', () => mund('zu'));
  aktualisieren();
})();
