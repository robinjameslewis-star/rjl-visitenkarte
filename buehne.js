// Workshop-Bühne (Robin, 24.10.2026): „die perfekte Mischung aus Videos und freiem Sprechen, wenn Fragen gestellt werden“.
// Gochs Vortrag läuft als Kapitelvideo (geprüfter Text, Folie zum Satz). Meldet sich jemand (H oder kurz die Taste),
// spricht Goch zu Ende wie ein Referent: bis zum Absatzende, wenn das höchstens 12 s entfernt ist, sonst bis zum Satzende.
// An derselben Stelle erscheint er live (gleiches Layout, Bild deckungsgleich), bittet um die Frage und antwortet frei aus
// seinem Wissen – mit dem Stand des Vortrags (Kapitel, gerade Gesagtes, was als Nächstes kommt, Fragen bisher). Mit W
// leitet er zurück; haben die Antworten den nächsten Teil schon abgedeckt, springt die Bühne darüber. Im letzten Kapitel
// blickt er vor der Zusammenfassung kurz auf die Fragen zurück. Antworten und Überleitungen kommen über den lokalen Dienst
// von der Workshop-Figur (Einsatz „workshop“); Stimme wie im Video. Fehler zeigt die Bühne nie, nur „Das nimmt Robin gleich auf.“
(() => {
  'use strict';
  const A = window.GochAudio;
  const $ = id => document.getElementById(id);
  const feld = $('feld'), video = $('video'), folie = $('folie'), kapitelEl = $('kapitel'), hinweis = $('hinweis'),
    untertitel = $('untertitel'), eingabe = $('eingabe'), anzeige = $('anzeige');
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  // Adressen: am Laptop beim lokalen Dienst (leer), im Memberbereich unter dem Termin (window.BUEHNE.api, Robin 07.11.2026)
  const api = (window.BUEHNE && window.BUEHNE.api) || '';
  let K = {}, liste = [], marken = null, kap = -1, angemeldet = null, uebersprungen = 0, rueckblickGemacht = false, modus = 'video';
  let verlauf = [], fragen = [], vorgemerkt = [], weiterNach = null, absatz = -1, satz = -1, beschaeftigt = false, leben = null, untertitelTimer = 0;
  let aufnahme = null, startet = false, tasteUnten = false, gedrueckt = 0;
  // Jede Unterbrechung (Kapitelwechsel, zurück ins Video, Esc) zählt hoch; was davor angestoßen wurde, verfällt dann
  let takt = 0, letzteZeit = 0;
  const lang = () => (K.sprache === 'en' ? 'en' : 'de');
  const T = {
    bitte: { de: 'Ihre Frage, bitte.', en: 'Your question, please.' },
    robin: { de: 'Das nimmt Robin gleich auf.', en: 'Robin will pick that up in a moment.' },
    hoere: { de: 'Ich höre zu …', en: 'Listening …' },
    nicht: { de: 'Das habe ich nicht verstanden – bitte tippen (T).', en: 'I did not catch that – please type it (T).' },
    mikro: { de: 'Kein Mikrofon – bitte tippen (T).', en: 'No microphone – please type (T).' },
  };
  const t = schluessel => T[schluessel][lang()];

  // ---------- Bühne skalieren (960 × 540 → Fenster) ----------
  function skalieren() {
    const k = Math.min(innerWidth / 960, innerHeight / 540);
    feld.style.transform = `scale(${k}) translate(-480px, -270px)`;
  }
  addEventListener('resize', skalieren); skalieren();

  // ---------- Goch live (Teile aus dem Figurenpaket, wie im Video) ----------
  async function gochBauen() {
    const basis = K.figurBasis || '/figur/goch/'; // Bilder: Konfiguration „paket“; geantwortet wird als K.figur
    const figur = await (await fetch(basis + 'figur.json')).json();
    const a = figur.animation, s = a.posen.sitzend, buehne = $('buehne'), ordner = basis + (a.fassungen['ohne-landschaft'] || 'bilder/');
    const pz = (v, g) => (v / g * 100).toFixed(3) + '%';
    for (const e of a.ebenen || []) {
      const i = new Image(); i.className = 'ast'; i.alt = ''; i.src = ordner + e.datei;
      Object.assign(i.style, { top: pz(e.oben, a.buehne.hoehe), width: pz(e.breite, a.buehne.breite), left: pz(e.links, a.buehne.breite) });
      buehne.append(i);
    }
    const halter = document.createElement('div'); halter.className = 'goch'; buehne.append(halter);
    // Sitzpose: bleibt bei reduzierter Bewegung oder wenn die Teile nicht laden (wie figur.js am Messegerät)
    const sitz = new Image(); sitz.className = 'sitz'; sitz.alt = ''; sitz.src = basis + (a.fassungen['mit-landschaft'] || 'bilder/') + s.datei; // freigestellt
    halter.append(sitz);
    if (!window.GochLeben || !a.teile || ruhig.matches) return;
    leben = window.GochLeben.bauen({ ziel: halter, basis, teile: a.teile, breite: s.breite, hoehe: s.hoehe, bereit: () => { halter.dataset.leben = '1'; } });
    if (await leben.laden()) { leben.posenLaden(); leben.start(); } else leben = null;
  }
  let weich = 0;
  const pegel = rms => {
    weich = weich * .55 + rms * .45;
    if (!leben) return;
    leben.kopf(weich > .09 ? 'offen' : weich > .025 ? 'halb' : 'rest');
    leben.stimme(rms);
  };
  const ruhe = () => { weich = 0; if (leben) { leben.kopf('rest'); leben.ende(); } };

  // ---------- Untertitel wie im Video: Stücke von höchstens ~58 Zeichen, im Takt der Stimme ----------
  function teilen(text, laenge = 58) {
    const stuecke = []; let rest = text.trim();
    while (rest.length > laenge) {
      let schnitt = -1;
      for (const m of rest.matchAll(/[,:;.?!]\s|\s–\s/g)) { const e = m.index + m[0].length; if (e >= 12 && e <= laenge + 8) schnitt = e; }
      if (schnitt < 0) schnitt = rest.lastIndexOf(' ', laenge) > 0 ? rest.lastIndexOf(' ', laenge) : laenge;
      stuecke.push(rest.slice(0, schnitt).trim()); rest = rest.slice(schnitt).trim();
    }
    return rest ? [...stuecke, rest] : stuecke;
  }
  function zeigeText(text, frage) {
    clearTimeout(untertitelTimer);
    untertitel.replaceChildren();
    if (frage) { const s = document.createElement('small'); s.textContent = frage; untertitel.append(s); }
    if (text) untertitel.append(document.createTextNode(text));
  }
  function untertitelImTakt(text, sekunden) {
    const stuecke = teilen(text), gesamt = stuecke.reduce((n, s) => n + s.length, 0) || 1;
    let i = 0;
    const weiter = () => {
      if (i >= stuecke.length) return;
      zeigeText(stuecke[i]);
      untertitelTimer = setTimeout(weiter, Math.max(900, sekunden * 1000 * stuecke[i].length / gesamt)); i++;
    };
    weiter();
  }

  // ---------- Sprechen: Antwort vom Worker (NDJSON: Text, dann Stimme) ----------
  async function sprechen(text, zeile) {
    const daten = zeile && zeile.stimme && zeile.stimme.daten;
    let sekunden = Math.max(2, text.length / 15);
    if (daten) {
      try { sekunden = (atob(daten).length * 8) / 64000; } catch (_) {} // grob über die Bitrate (MP3, 64 kbit/s); reicht für den Untertiteltakt
    }
    untertitelImTakt(text, sekunden);
    if (!daten) { await new Promise(r => setTimeout(r, sekunden * 1000)); return; }
    const g = takt;
    await new Promise(fertig => {
      A.abspielen(daten, { pegel, ende: () => { ruhe(); fertig(); }, lautstaerke: K.lautstaerke || 1 })
        .then(ok => { if (!ok) { ruhe(); fertig(); } else if (g !== takt) A.schweigen(); }); // während des Dekodierens unterbrochen
    });
  }
  // Antwort der Workshop-Figur; wirft bei Fehlern – auch bei einer Ersatzantwort des Workers (fehler: true)
  async function anfrage(messages, zweck, extra = {}) {
    const z = kontext();
    const r = await fetch(api + '/kiosk/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ figur: K.figur, lang: lang(), messages: messages.slice(-12), gesprochen: true, stimme: { erste: false },
        vortrag: { zweck, kapitel: marken ? `${marken.kapitel}: ${marken.titel}` : '', gesagt: z.gesagt, naechstes: z.naechstes,
          danach: z.danach, fragen, ...extra } }) });
    if (!r.ok) throw new Error(String(r.status));
    let a;
    if (/ndjson/.test(r.headers.get('content-type') || '')) {
      const zeilen = (await r.text()).trim().split('\n').map(z => JSON.parse(z));
      a = { ...zeilen[0], stimmeZeile: zeilen[1] || null };
    } else a = await r.json();
    if (!a || a.fehler || typeof a.reply !== 'string' || !a.reply.trim()) throw new Error('fehler');
    return a;
  }

  // ---------- Kapitel und Absätze ----------
  async function kapitelStarten(i, ab = 0) {
    if (!liste[i]) return;
    const g = ++takt; // was noch läuft (Antwort, Überleitung, Aufnahme), gilt nicht mehr
    A.schweigen(); aufnahmeBeenden(); zeigeText('');
    beschaeftigt = false; angemeldet = null; vorgemerkt = []; weiterNach = null; verlauf = []; absatz = satz = -1;
    let m;
    try { m = await (await fetch(api + '/vortrag/' + encodeURIComponent(liste[i].marken))).json(); } catch (_) { return; }
    if (g !== takt) return;
    kap = i; marken = m; rueckblickGemacht = false;
    tafelZu(); terminMelden();
    kapitelEl.replaceChildren(document.createTextNode(marken.kapitel || ''));
    const b = document.createElement('b'); b.textContent = marken.titel || ''; kapitelEl.append(b);
    hinweisZeigen();
    video.src = api + '/vortrag/' + encodeURIComponent(marken.video);
    video.currentTime = letzteZeit = ab;
    modusSetzen('video');
    await video.play().catch(() => {});
    status();
  }
  // Stand im Vortrag: Absatz `absatz`, darin `satz` = zuletzt fertig gesprochener Satz
  const absaetze = () => (marken ? marken.absaetze : []);
  const absatzBei = t => absaetze().reduce((n, a, j) => (t >= a.von - .05 ? j : n), 0);
  const saetzeVon = a => (a.saetze && a.saetze.length ? a.saetze : [{ von: a.von, bis: a.bis, text: a.text, folie: a.folie }]);
  // Wohin halten, wenn sich jemand bei t meldet: Absatzende, wenn nah; sonst das nächste Satzende
  function haltpunkt(t) {
    const j = absatzBei(t), a = absaetze()[j];
    if (!a) return null;
    const s = saetzeVon(a);
    if (a.bis - t <= 12) return { j, k: s.length - 1, zeit: a.bis };
    const k = s.findIndex(x => x.bis >= t + .3);
    return k < 0 ? { j, k: s.length - 1, zeit: a.bis } : { j, k, zeit: s[k].bis };
  }
  // Von Hand angehalten: der zuletzt fertige Satz
  function standBei(t) {
    const j = absatzBei(t), a = absaetze()[j];
    if (!a) return { j: -1, k: -1 };
    let k = -1;
    saetzeVon(a).forEach((x, i) => { if (x.bis <= t + .05) k = i; });
    return k < 0 && j > 0 ? { j: j - 1, k: saetzeVon(absaetze()[j - 1]).length - 1 } : { j, k };
  }
  // Was gesagt ist, was als Nächstes kommt, was danach – und wo es weitergeht: weiter (null = Kapitelende) und
  // ueberspringen (null = es gibt nichts zu überspringen; der Worker bietet es nur an, wenn „danach“ nicht leer ist)
  function kontext() {
    const abs = absaetze(), a = abs[absatz], ab = x => (x ? Math.max(0, x.von - .25) : null);
    if (!a) return { gesagt: '', naechstes: '', danach: '', weiter: null, ueberspringen: null };
    const s = saetzeVon(a), text = x => (x ? x.text : '');
    if (satz < s.length - 1) return { gesagt: s.slice(0, satz + 1).map(text).join(' '), naechstes: s.slice(satz + 1).map(text).join(' '),
      danach: text(abs[absatz + 1]), weiter: ab(s[satz + 1]), ueberspringen: ab(abs[absatz + 1]) };
    return { gesagt: a.text, naechstes: text(abs[absatz + 1]), danach: text(abs[absatz + 2]), weiter: ab(abs[absatz + 1]),
      ueberspringen: ab(abs[absatz + 2]) };
  }
  // Folie, die das Video bei t zeigt: die des zuletzt begonnenen Satzes (im Video wechselt sie 0,15 s vor dem Satz)
  function folieBei(t) {
    let f = '';
    for (const a of absaetze()) for (const x of saetzeVon(a)) if (x.von - .15 <= t || !f) f = x.folie || a.folie || f;
    return f;
  }
  // Rückblick fällig: letztes Kapitel, Fragen gestellt, noch keiner, und der Absatz vor der Zusammenfassung ist gesagt
  const rueckblickBei = j => kap === liste.length - 1 && fragen.length > 0 && !rueckblickGemacht && j === absaetze().length - 3;
  function pruefen() {
    if (modus !== 'video' || !marken || video.paused || video.seeking || beschaeftigt) return;
    const t = video.currentTime, j = absatzBei(t), a = absaetze()[j], vorher = letzteZeit;
    letzteZeit = t;
    // Rückblick vor dem vorletzten Absatz (den zehn Sätzen zum Mitnehmen) – nur beim Überqueren im laufenden Video
    if (rueckblickBei(j) && !angemeldet && a && vorher < a.bis - .04 && t >= a.bis - .04) {
      video.pause(); absatz = j; satz = saetzeVon(a).length - 1;
      return rueckblick();
    }
    if (angemeldet && t >= angemeldet.zeit - .04) {
      video.pause(); absatz = angemeldet.j; satz = angemeldet.k;
      liveFrage();
    }
  }
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const schleife = () => { pruefen(); video.requestVideoFrameCallback(schleife); };
    video.requestVideoFrameCallback(schleife);
  } else video.addEventListener('timeupdate', pruefen);
  setInterval(pruefen, 40); // Rückfall, auch wenn keine Bilder kommen
  video.addEventListener('seeked', () => { letzteZeit = video.currentTime; }); // ein Sprung überquert nichts

  function modusSetzen(m) {
    modus = m; feld.dataset.modus = m === 'video' ? 'video' : 'live';
    if (m !== 'video') {
      const f = folieBei(video.currentTime);
      if (f) folie.src = api + '/vortrag/folien/' + encodeURIComponent(f);
    }
    status();
  }
  function hinweisZeigen(text) {
    hinweis.replaceChildren();
    if (text) hinweis.textContent = text;
    else if (angemeldet && modus === 'video') { const s = document.createElement('span'); s.className = 'an'; hinweis.append(s, document.createTextNode('Frage gemeldet')); }
  }
  function status() {
    anzeige.textContent = `Kapitel ${kap >= 0 ? kap : '–'} · ${modus}${angemeldet ? ' · Frage gemeldet' : ''}${fragen.length ? ' · ' + fragen.length + ' Fragen' : ''}${terminStatus && terminStatus !== 'offen' ? ' · Termin ' + terminStatus + ': bitte am Pult öffnen' : ''}`;
  }

  // ---------- Zwischenfrage ----------
  function anmelden() {
    if (modus !== 'video' || !marken) return;
    if (video.paused || video.ended) { ({ j: absatz, k: satz } = standBei(video.currentTime)); angemeldet = null; video.pause(); return liveFrage(); }
    if (!angemeldet) angemeldet = haltpunkt(video.currentTime);
    hinweisZeigen(); status();
  }
  function liveFrage() {
    const auto = angemeldet && angemeldet.auto;
    angemeldet = null; hinweisZeigen();
    if (auto) return automatisch();
    verlauf = [];
    modusSetzen('frage');
    zeigeText(t('bitte'));
    if (leben) leben.lauschen(true);
    if (vorgemerkt.length) frageStellen(vorgemerkt.shift()); // getippt, während das Video lief
  }
  async function frageStellen(text) {
    text = String(text || '').trim();
    if (!text || modus === 'video') return;
    if (modus !== 'frage' || beschaeftigt) { vorgemerkt.push(text); return; } // Goch spricht oder blickt zurück: danach stellen
    const g = takt;
    beschaeftigt = true;
    if (leben) leben.lauschen(false);
    fragen.push(text); verlauf.push({ role: 'user', content: text });
    zeigeText('…', text);
    let a = null;
    try { a = await anfrage(verlauf, 'frage'); } catch (_) {}
    if (g !== takt || !a) {
      const i = fragen.lastIndexOf(text); if (i >= 0) fragen.splice(i, 1); // nicht beantwortet: zählt nicht für den Rückblick
      if (g !== takt) return;
      verlauf.pop(); zeigeText(t('robin'));
    } else {
      verlauf.push({ role: 'assistant', content: a.reply });
      await sprechen(a.reply, a.stimmeZeile);
      if (g !== takt) return;
    }
    beschaeftigt = false; status();
    if (vorgemerkt.length) return frageStellen(vorgemerkt.shift());
    if (weiterNach !== null) { const m = weiterNach; weiterNach = null; weiter(m); }
  }
  // Zurück in den Vortrag: Überleitung, dann weiter, wo Goch aufgehört hat – oder dahinter, wenn die Antworten das schon klärten
  async function weiter(mitUeberleitung = true) {
    if (modus === 'video') return;
    if (beschaeftigt) { weiterNach = mitUeberleitung; return; } // nach der laufenden Antwort
    const a = absaetze()[absatz];
    if (mitUeberleitung && a && rueckblickBei(absatz) && satz === saetzeVon(a).length - 1) return rueckblick(); // statt Überleitung
    const g = takt, z = kontext();
    let ziel = z.weiter;
    if (mitUeberleitung && verlauf.length) {
      beschaeftigt = true;
      try {
        const a = await anfrage([...verlauf, { role: 'user', content: lang() === 'en' ? 'Back to the talk.' : 'Weiter im Vortrag.' }], 'ueberleitung');
        if (g !== takt) return;
        if (a.weiter === 'ueberspringen' && z.ueberspringen !== null) { ziel = z.ueberspringen; uebersprungen++; }
        await sprechen(a.reply, a.stimmeZeile);
      } catch (_) { /* ohne Überleitung weiter */ }
      if (g !== takt) return;
      beschaeftigt = false;
    }
    zurueckInsVideo(ziel);
  }
  async function rueckblick() {
    rueckblickGemacht = true;
    const g = takt;
    modusSetzen('rueckblick'); zeigeText(''); beschaeftigt = true;
    try {
      const a = await anfrage([{ role: 'user', content: lang() === 'en' ? 'Look back.' : 'Rückblick.' }], 'rueckblick');
      if (g !== takt) return;
      await sprechen(a.reply, a.stimmeZeile);
    } catch (_) {}
    if (g !== takt) return;
    beschaeftigt = false;
    zurueckInsVideo(kontext().weiter);
  }
  // Esc, während Goch spricht: Stimme aus, ohne Überleitung zurück; auch vorgemerkte Fragen verfallen
  function abbrechen() {
    A.schweigen();
    beschaeftigt = false; vorgemerkt = [];
    zurueckInsVideo(kontext().weiter);
  }
  // Zurück ins Video. Fragen, die während Überleitung oder Rückblick getippt wurden, bleiben vorgemerkt: die Bühne hält
  // dafür am nächsten Satz- oder Absatzende wieder an.
  function zurueckInsVideo(zeit) {
    takt++; aufnahmeBeenden(); zeigeText('');
    weiterNach = null; verlauf = [];
    if (leben) leben.lauschen(false);
    modusSetzen('video');
    if (zeit === null) { // Kapitelende: am letzten Bild stehen bleiben – play() finge sonst von vorn an; N für das nächste
      video.pause();
      if (isFinite(video.duration)) video.currentTime = video.duration;
      if (vorgemerkt.length) return liveFrage();
      kapitelEnde();
      return status();
    }
    video.currentTime = letzteZeit = zeit;
    if (vorgemerkt.length) { angemeldet = haltpunkt(zeit + .3); hinweisZeigen(); }
    video.play().catch(() => {});
  }

  // ---------- Frage sprechen (Taste halten) oder tippen ----------
  function aufnahmeBeenden() { if (aufnahme) { aufnahme.abbrechen(); aufnahme = null; } }
  async function aufnahmeStarten() {
    if (aufnahme || startet || modus !== 'frage' || beschaeftigt) return;
    const g = takt;
    startet = true;
    A.entsperren();
    let r;
    try { r = await A.aufnahme({}); } catch (_) { startet = false; if (g === takt) zeigeText(t('mikro')); return; }
    startet = false;
    // Taste schon wieder los (kurzer Druck, Rückfrage nach dem Mikrofon) oder Bühne weiter: Mikrofon gleich wieder zu
    if (g !== takt || !tasteUnten || modus !== 'frage') { r.abbrechen(); return; }
    aufnahme = r;
    if (leben) leben.lauschen(true);
    zeigeText(t('hoere'));
  }
  async function aufnahmeSenden() {
    const a = aufnahme; aufnahme = null;
    if (!a) return;
    const g = takt, dauer = a.dauer(), wav = a.stopp();
    if (dauer < .5) { zeigeText(t('bitte')); return; }
    zeigeText('…');
    try {
      const r = await fetch(api + '/kiosk/listen?lang=' + lang(), { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav });
      const d = await r.json().catch(() => ({}));
      if (g !== takt || modus !== 'frage') return; // inzwischen zurück im Video: Frage verfällt
      if (d.text) return frageStellen(d.text);
    } catch (_) { if (g !== takt) return; }
    zeigeText(t('nicht'));
  }
  function tippen(an) {
    if (an) { feld.dataset.tippen = '1'; eingabe.value = ''; eingabe.focus(); } else { delete feld.dataset.tippen; eingabe.blur(); }
  }
  eingabe.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const text = eingabe.value.trim(); tippen(false);
      if (!text) return;
      if (modus === 'video') { vorgemerkt.push(text); anmelden(); if (modus === 'video' && !angemeldet) vorgemerkt.pop(); } // am Haltepunkt stellen
      else frageStellen(text);
    }
    if (e.key === 'Escape') tippen(false);
  });
  eingabe.addEventListener('blur', () => { if (document.hasFocus()) delete feld.dataset.tippen; }); // Klick auf die Bühne: zu; Fensterwechsel: bleibt offen

  // ---------- Terminseite (Robin, 07.11.2026): Fragen kommen vom QR-Code, Goch nimmt sie an der passenden Stelle dran ----------
  // Robin begleitet nur: Die Bühne hält selbst am nächsten Absatzende, spricht die schon vertonte Antwort und läuft weiter. Eine
  // Frage zu einem späteren Kapitel wartet bis dorthin. Gesperrte Fragen verschwinden aus der Reihe, bevor sie dran sind.
  let termin = null, letzterHalt = 0, tafelUhr = 0, terminStatus = '';
  const reihe = new Map(), erledigt = new Set(), aufgabenGezeigt = new Set(), ABSTAND_MS = 45000, JE_HALT = 2;
  const $$ = { qr: $('qr'), titel: $('tafel-titel'), text: $('tafel-text'), link: $('tafel-link'), uhr: $('tafel-uhr'), tafelQr: $('tafel-qr') };
  const passend = e => { if (!e.kapitel) return true; const i = liste.findIndex(k => k.titel === e.kapitel); return i < 0 || i <= kap; };
  const bereit = () => [...reihe.values()].filter(e => e.antwort && passend(e));
  async function terminAbruf() {
    let d; try { const r = await fetch(api + '/termin/stand'); if (!r.ok) return; d = await r.json(); } catch (_) { return; }
    if (!Array.isArray(d.fragen)) return;
    terminStatus = d.status || ''; status();
    const ids = new Set(d.fragen.map(f => f.id));
    for (const id of reihe.keys()) if (!ids.has(id)) reihe.delete(id);
    // Vorgemerkter Halt, aber die Frage ist gesperrt: nicht anhalten
    if (angemeldet && angemeldet.auto && !bereit().length) { angemeldet = null; hinweisZeigen(); status(); }
    // Rückmeldung noch nicht angekommen: Frage nicht noch einmal vertonen, Meldung wiederholen
    for (const id of erledigt) if (ids.has(id)) melden(id); else erledigt.delete(id);
    for (const f of d.fragen) if (!reihe.has(f.id) && !erledigt.has(f.id)) { const e = { ...f, antwort: null, versuche: 0 }; reihe.set(f.id, e); vorbereiten(e); }
    terminPruefen();
  }
  // Im Hintergrund beantworten und vertonen: Am Haltepunkt gibt es dann keine Wartezeit.
  async function vorbereiten(e) {
    if (e.antwort || !reihe.has(e.id)) return;
    // Zweimal gescheitert: Die Frage geht ans Pult zurück und blockiert die Reihe nicht.
    if (e.versuche >= 2) { reihe.delete(e.id); erledigt.add(e.id); return melden(e.id, 'zurueck'); }
    e.versuche++;
    try { e.antwort = await anfrage([{ role: 'user', content: e.text }], 'frage', { schriftlich: true }); terminPruefen(); }
    catch (_) { vorbereiten(e); }
  }
  const melden = (id, stand = 'beantwortet') => fetch(api + '/termin/frage/' + encodeURIComponent(id), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: stand }) }).catch(() => {});
  function terminPruefen() {
    if (modus !== 'video' || angemeldet || beschaeftigt || !marken || feld.dataset.tafel !== undefined || !bereit().length) return;
    if (video.ended) { ({ j: absatz, k: satz } = standBei(video.currentTime)); return automatisch(); }
    if (video.paused || performance.now() - letzterHalt < ABSTAND_MS && letzterHalt) return;
    const t = video.currentTime; let j = absatzBei(t), a = absaetze()[j];
    if (!a) return;
    if (a.bis - t < 2 && absaetze()[j + 1]) a = absaetze()[++j];
    angemeldet = { j, k: saetzeVon(a).length - 1, zeit: a.bis, auto: true };
    hinweisZeigen(); status();
  }
  async function automatisch() {
    const g = takt, dran = bereit().slice(0, JE_HALT);
    if (!dran.length) { if (modus === 'video' && video.paused && !video.ended) video.play().catch(() => {}); return; }
    verlauf = []; modusSetzen('frage'); zeigeText(''); beschaeftigt = true;
    for (const e of dran) {
      reihe.delete(e.id); erledigt.add(e.id); melden(e.id);
      fragen.push(e.text); verlauf.push({ role: 'user', content: e.text }, { role: 'assistant', content: e.antwort.reply });
      // Nie den Wortlaut ins Bild: Er kann Namen enthalten. Goch nennt die Frage in eigenen Worten.
      hinweisZeigen(lang() === 'en' ? 'Question from the audience' : 'Frage aus der Runde');
      await sprechen(e.antwort.reply, e.antwort.stimmeZeile);
      if (g !== takt) { hinweisZeigen(); return; }
    }
    hinweisZeigen(); beschaeftigt = false; letzterHalt = performance.now();
    weiter(true);
  }
  function terminMelden() {
    if (termin && marken) fetch(api + '/termin/stand', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kapitel: marken.titel || '' }) }).catch(() => {});
  }
  function tafel(titel, text, minuten) {
    if (!termin) return;
    clearInterval(tafelUhr);
    $$.titel.textContent = titel; $$.text.textContent = text; $$.link.textContent = termin.link; $$.uhr.textContent = '';
    feld.dataset.tafel = '1';
    if (minuten) {
      const ende = Date.now() + minuten * 60000;
      const zeigen = () => { const r = Math.max(0, Math.round((ende - Date.now()) / 1000)); $$.uhr.textContent = Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0'); };
      zeigen(); tafelUhr = setInterval(zeigen, 1000);
    }
  }
  function tafelZu() { clearInterval(tafelUhr); delete feld.dataset.tafel; }
  // Am Kapitelende: Aufgaben aus den Absatzmarken („aufgabe“: eine oder eine Liste { id, titel, minuten, text }) auf die Seite, die letzte groß ins Bild; N geht weiter.
  function kapitelEnde() {
    const liste = [].concat((marken && marken.aufgabe) || []).filter(a => !aufgabenGezeigt.has(a.id));
    if (!termin || !liste.length) return;
    for (const a of liste) {
      aufgabenGezeigt.add(a.id);
      fetch(api + '/termin/aufgabe/' + encodeURIComponent(a.id), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ an: true }) })
        .then(r => { if (!r.ok) throw 0; }).catch(() => hinweisZeigen(lang() === 'en' ? 'Exercise could not be shown: please use the console.' : 'Aufgabe kam nicht auf die Seite: bitte am Pult zeigen.'));
    }
    const a = liste[liste.length - 1];
    tafel(a.titel || '', a.text || (lang() === 'en' ? 'Now on your device.' : 'Jetzt auf Ihrem Gerät.'), a.minuten);
  }
  video.addEventListener('ended', () => { if (bereit().length) terminPruefen(); else kapitelEnde(); });
  async function terminStart() {
    let d; try { const r = await fetch(api + '/termin/info'); if (!r.ok) return; d = await r.json(); } catch (_) { return; }
    termin = d; feld.dataset.termin = '1';
    $$.qr.querySelector('img').src = api + '/termin/qr.svg'; $$.tafelQr.src = api + '/termin/qr.svg';
    terminAbruf(); setInterval(terminAbruf, 4000);
    if (kap < 0) tafel(lang() === 'en' ? 'Questions and exercises' : 'Fragen und Aufgaben', lang() === 'en' ? 'Scan the code. You can ask at any time, no login needed.' : 'Scannen Sie den Code. Fragen können Sie jederzeit stellen, ohne Anmeldung.');
  }

  // ---------- Tasten ----------
  const taste = () => K.taste || 'Space';
  const istTaste = e => e.code === taste() || e.key === taste() || (taste() === 'Space' && e.key === ' ');
  addEventListener('keydown', e => {
    if (document.activeElement === eingabe) return;
    A.entsperren();
    if (istTaste(e)) {
      e.preventDefault();
      if (e.repeat) return;
      tasteUnten = true; gedrueckt = performance.now();
      if (modus === 'video') anmelden(); else aufnahmeStarten();
      return;
    }
    const k = e.key.toLowerCase();
    if (/^[0-9hwrtpnq?]$/.test(k)) e.preventDefault(); // T: kein „t“ im Eingabefeld
    if (k === 'q') { if (feld.dataset.tafel !== undefined) tafelZu(); else tafel(lang() === 'en' ? 'Questions and exercises' : 'Fragen und Aufgaben', lang() === 'en' ? 'Scan the code.' : 'Scannen Sie den Code.'); return; }
    if (/^[0-9]$/.test(k)) kapitelStarten(+k);
    else if (k === 'h') anmelden();
    else if (k === 'w') weiter(true);
    else if (k === 'escape') { if (modus !== 'video') { if (beschaeftigt) abbrechen(); else weiter(false); } }
    else if (k === 'r' && modus === 'video' && marken) { video.pause(); ({ j: absatz, k: satz } = standBei(video.currentTime)); rueckblick(); }
    else if (k === 't') tippen(true);
    else if (k === 'p' && modus === 'video') { video.paused ? video.play() : video.pause(); }
    else if (k === 'n') kapitelStarten(kap + 1);
    else if (k === '?') document.body.classList.toggle('hilfe-an');
  });
  addEventListener('keyup', e => {
    if (!istTaste(e)) return;
    tasteUnten = false;
    if (!aufnahme) return;
    if (performance.now() - gedrueckt > 350) aufnahmeSenden(); else aufnahmeBeenden();
  });
  video.addEventListener('ended', status);

  // ---------- Start ----------
  (async () => {
    try { K = await (await fetch(api + '/kiosk/konfiguration')).json(); } catch (_) {}
    let listeFehler = false;
    try { const r = await fetch(api + '/vortrag/liste'); liste = await r.json(); listeFehler = !r.ok && r.status !== 404; } catch (_) { liste = []; }
    if (!Array.isArray(liste)) liste = [];
    await gochBauen().catch(() => {});
    await terminStart();
    window.GochBuehne = { kapitelStarten, anmelden, frageStellen, weiter, rueckblick,
      zustand: () => ({ tafel: feld.dataset.tafel !== undefined, reihe: reihe.size, modus, kap, absatz, satz, angemeldet, beschaeftigt, fragen: fragen.slice(), uebersprungen, zeit: video.currentTime, folie: folie.getAttribute('src') }) };
    // über Video und Live-Bild sichtbar (#hinweis), nicht im unsichtbaren Live-Untertitel
    if (!liste.length) hinweisZeigen(listeFehler ? (lang() === 'en' ? 'Talk folder not readable (USB stick?).' : 'Vortragsordner nicht lesbar (Stick?).')
      : (K.ohneVortrag || (lang() === 'en' ? 'No talk set up (local service with --vortrag).' : 'Kein Vortrag eingerichtet (lokaler Dienst mit --vortrag).')));
    status();
  })();
})();
