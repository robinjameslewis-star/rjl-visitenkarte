// Gemeinsame Tonbausteine für die Startseite (goch-stimme.js) und das Messegerät (kiosk.js), 23.10.2026.
// AudioContext erst nach einer Berührung (iOS/Safari), Aufnahme als WAV (PCM 16 Bit, mono, 16 kHz) über Web Audio –
// unabhängig vom Format, das der Browser sonst aufnehmen würde –, Zuhören ohne Knopf mit Sprecherkennung im Browser,
// Wiedergabe mit Pegel für Schnabel, Bewegung oder Logo und lokalen Browserstimmen für Figuren, die das erlauben
// (rueckfall „browser“; Goch nicht). Nichts wird gespeichert.
(() => {
  'use strict';
  let ctx = null, quelle = null, sprichtBrowser = false, freigeschaltet = false;

  function audio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!ctx && Ctx) ctx = new Ctx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // In einer Berührung aufrufen: schaltet Ton und Sprachausgabe frei (iOS/Safari spielen sonst nichts ab).
  function entsperren() {
    audio();
    if ('speechSynthesis' in window && !freigeschaltet) {
      freigeschaltet = true;
      try { const u = new SpeechSynthesisUtterance(''); u.volume = 0; speechSynthesis.speak(u); } catch (_) {}
    }
  }
  function schweigen() {
    if (quelle) { const q = quelle; quelle = null; try { q.stop(); } catch (_) {} if (q.ende) q.ende(); }
    if (sprichtBrowser && 'speechSynthesis' in window) speechSynthesis.cancel();
    sprichtBrowser = false;
  }

  // MP3 (oder WAV) als Base64 abspielen. pegel(rms) je Bild, solange es spielt; ende() danach. false, wenn es nicht geht.
  async function abspielen(daten, { pegel, ende, lautstaerke = 1 } = {}) {
    const c = audio();
    if (!c) return false;
    let puffer;
    try {
      const bytes = Uint8Array.from(atob(daten), ch => ch.charCodeAt(0));
      puffer = await c.decodeAudioData(bytes.buffer);
    } catch (_) { return false; }
    schweigen();
    const src = c.createBufferSource(), analyser = c.createAnalyser(), gain = c.createGain();
    analyser.fftSize = 512; gain.gain.value = lautstaerke;
    src.buffer = puffer;
    src.connect(analyser); analyser.connect(gain); gain.connect(c.destination);
    src.ende = () => { if (ende) ende(); };
    quelle = src;
    src.onended = () => { if (quelle === src) { quelle = null; src.ende(); } };
    src.start();
    if (pegel) {
      const werte = new Float32Array(analyser.fftSize);
      const schritt = () => {
        if (quelle !== src) return;
        analyser.getFloatTimeDomainData(werte);
        let summe = 0;
        for (const v of werte) summe += v * v;
        pegel(Math.sqrt(summe / werte.length));
        requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    }
    return true;
  }

  // Stimme des Geräts wählen: nur lokale Stimmen (Online-Stimmen wie „Google Deutsch“ schicken den Text an einen weiteren
  // Dienst); zuerst die Namen aus dem Vorzug der Figur (Goch: warme Männerstimmen wie Markus, Yannick, Daniel), dabei
  // „Premium“/„Erweitert“ vor der einfachen Fassung; sonst die erste lokale Stimme der Sprache, britisches Englisch zuerst.
  function stimmeWaehlen(stimmen, lang, vorzug = []) {
    const sprache = lang === 'en' ? 'en' : 'de';
    const lokal = stimmen.filter(v => v.localService && String(v.lang).toLowerCase().replace('_', '-').startsWith(sprache));
    const gut = v => /premium|erweitert|enhanced|verbessert/i.test(v.name) ? 0 : 1;
    for (const name of vorzug) {
      const treffer = lokal.filter(v => v.name.toLowerCase().startsWith(name.toLowerCase())).sort((a, b) => gut(a) - gut(b));
      if (treffer.length) return treffer[0];
    }
    return lokal.find(v => /GB/i.test(v.lang)) || lokal[0] || null;
  }
  // Rückfall ohne Stimme vom Server. wort() bei jeder Wortgrenze (Schnabel), ende() danach; vorzug, tonhoehe und tempo
  // aus figur.json (stimme.browser).
  function browserStimme(text, lang, { wort, ende, vorzug, tonhoehe = 1, tempo = 1 } = {}) {
    if (!('speechSynthesis' in window) || !text) return false;
    const stimme = stimmeWaehlen(speechSynthesis.getVoices(), lang, vorzug);
    if (!stimme) return false;
    schweigen();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = stimme; u.lang = stimme.lang; u.pitch = tonhoehe; u.rate = tempo;
    u.onboundary = () => { if (wort) wort(); };
    u.onend = u.onerror = () => { sprichtBrowser = false; if (ende) ende(); };
    sprichtBrowser = true;
    speechSynthesis.speak(u);
    return true;
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

  // Aufnahme starten: fragt das Mikrofon an (nur hier) und liefert { stopp() → WAV, abbrechen(), dauer() }.
  // pegel(spitze) je Bild für die Anzeige. Das Mikrofon ist nur offen, bis stopp() oder abbrechen() gerufen wird.
  async function aufnahme({ pegel } = {}) {
    const c = audio();
    if (!c || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('kein Mikrofon');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    schweigen();
    const src = c.createMediaStreamSource(stream), analyser = c.createAnalyser(), proc = c.createScriptProcessor(4096, 1, 1), still = c.createGain();
    still.gain.value = 0; // der Prozessor braucht einen Ausgang; hörbar wird nichts
    analyser.fftSize = 1024;
    const teile = [], start = performance.now();
    let offen = true;
    proc.onaudioprocess = e => { if (offen) teile.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
    src.connect(analyser); src.connect(proc); proc.connect(still); still.connect(c.destination);
    const schliessen = () => {
      offen = false;
      [proc, src, still].forEach(n => { try { n.disconnect(); } catch (_) {} });
      stream.getTracks().forEach(tr => tr.stop());
    };
    if (pegel) {
      const werte = new Float32Array(analyser.fftSize);
      const schritt = () => {
        if (!offen) return;
        analyser.getFloatTimeDomainData(werte);
        let spitze = 0;
        for (const v of werte) spitze = Math.max(spitze, Math.abs(v));
        pegel(spitze);
        requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    }
    return {
      dauer: () => (performance.now() - start) / 1000,
      stopp: () => { schliessen(); return wav(teile, c.sampleRate); },
      abbrechen: schliessen,
    };
  }

  // Sprecherkennung im Browser (Robin, 23.10.2026: Gespräch ohne Knopf). Entscheidet nur aus der Lautstärke je Block, ob
  // jemand spricht und wann er fertig ist. Grundrauschen = leisester Block der letzten 1,5 s (ein Lüfter gilt so nicht als
  // Sprache); zu kurz ist, was weniger als minMs wirklich laut war (Räuspern, Klopfen). Reine Rechnung, ohne Mikrofon prüfbar.
  // block(Float32Array) liefert { rms }, beim Beginn { start: true } und am Ende { ende: true, teile, sprechMs, zuKurz }.
  function erkenner({ rate, pauseMs = 900, minMs = 250, maxMs = 20000, vorlaufMs = 300, startMs = 120, fensterMs = 1500 } = {}) {
    let spricht = false, laut = 0, leise = 0, dauer = 0, stimmhaft = 0, vorlauf = [], teile = [], verlauf = [];
    const abschluss = (weg = 0) => {
      const r = { ende: true, teile: teile.slice(0, teile.length - weg), sprechMs: dauer - leise, zuKurz: stimmhaft < minMs };
      spricht = false; laut = leise = dauer = stimmhaft = 0; teile = [];
      return r;
    };
    return {
      get spricht() { return spricht; },
      zuruecksetzen() { spricht = false; laut = leise = dauer = stimmhaft = 0; vorlauf = []; teile = []; },
      fertig() { return spricht ? abschluss() : null; },
      block(d) {
        const ms = d.length / rate * 1000;
        let s = 0;
        for (const v of d) s += v * v;
        const rms = Math.sqrt(s / d.length);
        verlauf.push(rms);
        while (verlauf.length * ms > fensterMs) verlauf.shift();
        const schwelle = Math.max(.012, Math.max(.003, Math.min(...verlauf)) * 3.5);
        if (!spricht) {
          vorlauf.push(d);
          while (vorlauf.length * ms > vorlaufMs + ms) vorlauf.shift();
          laut = rms >= schwelle ? laut + ms : 0;
          if (laut < startMs) return { rms };
          spricht = true; teile = vorlauf; vorlauf = []; dauer = teile.length * ms; stimmhaft = laut; leise = 0;
          return { rms, start: true };
        }
        teile.push(d); dauer += ms;
        if (rms >= schwelle) stimmhaft += ms;
        leise = rms < schwelle * .7 ? leise + ms : 0;
        if (leise >= pauseMs || dauer >= maxMs) return { rms, ...abschluss(Math.max(0, Math.floor((leise - 250) / ms))) };
        return { rms };
      },
    };
  }

  // Zuhören ohne Knopf: Mikrofon offen, bis stopp() gerufen wird; geschickt wird nur, was der Erkenner als gesprochenen
  // Abschnitt meldet (ende(WAV, Sekunden), zu Kurzes als ende(null)). anhalten() lässt die Blöcke ungenutzt verfallen
  // (z. B. während Goch spricht), weiter() hört wieder hin, fertig() beendet den laufenden Abschnitt sofort.
  async function zuhoeren({ pegel, start, ende, ...optionen } = {}) {
    const c = audio();
    if (!c || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('kein Mikrofon');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    const src = c.createMediaStreamSource(stream), proc = c.createScriptProcessor(2048, 1, 1), still = c.createGain();
    still.gain.value = 0;
    const e = erkenner({ rate: c.sampleRate, ...optionen });
    let angehalten = false, offen = true;
    const melden = r => { if (r && r.ende && ende) ende(r.zuKurz ? null : wav(r.teile, c.sampleRate), r.sprechMs / 1000); };
    proc.onaudioprocess = ev => {
      if (!offen) return;
      if (angehalten) { if (pegel) pegel(0, false); return; }
      const r = e.block(new Float32Array(ev.inputBuffer.getChannelData(0)));
      if (pegel) pegel(r.rms, e.spricht);
      if (r.start && start) start();
      melden(r);
    };
    src.connect(proc); proc.connect(still); still.connect(c.destination);
    return {
      get spricht() { return e.spricht; },
      anhalten() { angehalten = true; e.zuruecksetzen(); },
      weiter() { angehalten = false; },
      fertig() { melden(e.fertig()); },
      stopp() {
        if (!offen) return;
        offen = false;
        [proc, src, still].forEach(n => { try { n.disconnect(); } catch (_) {} });
        stream.getTracks().forEach(tr => tr.stop());
      },
    };
  }

  // Bewegung zur Stimme (Robin, 23.10.2026: mehr Leben beim Sprechen). Goch neigt sich mit betonten Silben leicht nach vorn
  // und hebt sich ein wenig, wechselt an Satzpausen die Kopfhaltung und schaut in Gesprächspausen ab und zu kurz zur Seite.
  // Setzt nur CSS-Variablen (--goch-neigung in Grad, --goch-streck als Faktor) und data-bewegt am Element; per CSS geneigt
  // und gestreckt über der Fußlinie, damit die Füße auf dem Ast bleiben. richten() gibt eine Grundhaltung vor (Blickkontakt: Goch wendet sich dem Gegenüber zu); alles
  // andere spielt um sie herum. Bei reduzierter Bewegung nichts.
  function bewegung(ziel) {
    const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
    let huelle = 0, haltung = 0, leiseSeit = 0, gewechselt = true, blickAn = false, timer = 0, aus = 0, imBlick = false;
    let basis = 0, basisHub = 0;
    const leben = () => window.GochLeben && window.GochLeben.fuer(ziel); // Kopf nickt mit (goch-leben.js)
    const setzen = (neigung, hub) => {
      clearTimeout(aus); ziel.dataset.bewegt = '1';
      ziel.style.setProperty('--goch-neigung', neigung.toFixed(2) + 'deg');
      ziel.style.setProperty('--goch-streck', (1 - hub * .015).toFixed(4)); // hub < 0: aufrichten, ohne abzuheben
    };
    const zurueck = () => {
      setzen(basis, basisHub);
      if (!basis && !basisHub) aus = setTimeout(() => { if (!ziel.dataset.spricht) delete ziel.dataset.bewegt; }, 400);
    };
    function naechsterBlick() {
      clearTimeout(timer);
      if (!blickAn) return;
      timer = setTimeout(() => {
        if (!blickAn) return;
        if (ruhig.matches || ziel.dataset.spricht || ziel.dataset.lauscht || document.hidden) return naechsterBlick();
        imBlick = true;
        setzen(basis + (Math.random() < .5 ? -1 : 1) * (.8 + Math.random()), basisHub);
        timer = setTimeout(() => { imBlick = false; if (!ziel.dataset.spricht) zurueck(); naechsterBlick(); }, 700 + Math.random() * 700);
      }, 4000 + Math.random() * 5000);
    }
    return {
      stimme(rms) { // je Bild, solange die Stimme spielt
        if (ruhig.matches) return;
        ziel.dataset.spricht = '1';
        huelle = huelle * .8 + rms * .2;
        const jetzt = performance.now();
        if (rms < .02) {
          if (!leiseSeit) leiseSeit = jetzt;
          if (!gewechselt && jetzt - leiseSeit > 250) { haltung = (Math.random() * 2 - 1) * 1.1; gewechselt = true; }
        } else { leiseSeit = 0; gewechselt = false; }
        setzen(basis + haltung - Math.min(1.4, huelle * 9), basisHub - Math.min(.5, huelle * 3));
        const l = leben(); if (l) l.stimme(rms);
      },
      richten(grad, hub = 0) { // Grundhaltung, z. B. dem Gegenüber zugewandt (goch-blick.js)
        if (ruhig.matches) { grad = 0; hub = 0; }
        basis = grad; basisHub = hub;
        if (!ziel.dataset.spricht && !imBlick) zurueck();
      },
      ende() { huelle = 0; haltung = 0; const l = leben(); if (l) l.ende(); if (ziel.dataset.spricht) { delete ziel.dataset.spricht; zurueck(); } },
      blicken(an) {
        if (an === blickAn) return;
        blickAn = an;
        if (an) naechsterBlick(); else { clearTimeout(timer); imBlick = false; if (!ziel.dataset.spricht && ziel.dataset.bewegt) zurueck(); }
      },
    };
  }

  window.GochAudio = { audio, entsperren, schweigen, abspielen, browserStimme, stimmeWaehlen, aufnahme, zuhoeren, erkenner, bewegung, wav, get spielt() { return !!quelle || sprichtBrowser; } };
})();
