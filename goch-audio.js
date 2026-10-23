// Gemeinsame Tonbausteine für die Startseite (goch-stimme.js) und das Messegerät (kiosk.js), 23.10.2026.
// AudioContext erst nach einer Berührung (iOS/Safari), Aufnahme als WAV (PCM 16 Bit, mono, 16 kHz) über Web Audio –
// unabhängig vom Format, das der Browser sonst aufnehmen würde –, Wiedergabe mit Pegel für Schnabel oder Logo und
// Rückfall auf lokale Browserstimmen. Nichts wird gespeichert.
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

  // Rückfall ohne Stimme vom Server: nur lokale Stimmen des Geräts – Online-Stimmen (z. B. „Google Deutsch“) würden den
  // Text an einen weiteren Dienst schicken. wort() bei jeder Wortgrenze (Schnabel), ende() danach.
  function browserStimme(text, lang, { wort, ende } = {}) {
    if (!('speechSynthesis' in window) || !text) return false;
    const stimmen = speechSynthesis.getVoices().filter(v => v.localService && v.lang.toLowerCase().startsWith(lang === 'en' ? 'en' : 'de'));
    const stimme = stimmen.find(v => /GB/i.test(v.lang)) || stimmen[0];
    if (!stimme) return false;
    schweigen();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = stimme; u.lang = stimme.lang;
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

  window.GochAudio = { audio, entsperren, schweigen, abspielen, browserStimme, aufnahme, wav, get spielt() { return !!quelle || sprichtBrowser; } };
})();
