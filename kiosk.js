// Kiosk-Modus (Robin, 23.10.2026): das Messegerät – große Figur, Gespräch als Untertitel, Bedienung über Touch und einen
// USB-Taster (eine Taste, Standard F13). Ablauf: Ruhe → Taster/Touch → Hinweis (KI, Datenverarbeitung) → noch einmal
// drücken = Einwilligung → Push-to-talk (halten oder tippen – sprechen – tippen, höchstens 20 s) → Antwort als Untertitel
// und Stimme. Nach 60 s ohne Aktivität werden Gespräch und Einwilligung zurückgesetzt. Nichts wird im Browser gespeichert.
// Anwesenheit nur per Radar (Ereignis vom lokalen Dienst); dann zwitschert die Figur hörbar – mit Abklingzeit, nie in
// Ruhezeiten, nie während eines Gesprächs. Ohne Netz: vorbereitete Antworten zum Antippen. Keine Kamera.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const A = window.GochAudio, F = window.GochFigur, L = window.SiteLanguage;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || !A || !F) {
    const p = $('k-nur-geraet');
    p.textContent = (new URL(location.href).searchParams.get('lang') === 'en') ? 'This page only runs on the exhibition device.' : 'Diese Seite läuft nur am Messegerät.';
    p.hidden = false;
    return;
  }
  const lang = new URL(location.href).searchParams.get('lang') === 'en' ? 'en' : (new URL(location.href).searchParams.get('lang') === 'de' ? 'de' : null);
  const TEXT = {
    de: {
      einladung: 'Fragen Sie {name}: Knopf drücken oder Bildschirm berühren.', beispiele: 'Zum Beispiel:',
      hinweisTitel: 'Kurz vorab',
      hinweisText: '{name} ist eine KI mit künstlich erzeugter Stimme. Was Sie sagen, wird von Cloudflare in Text umgewandelt und von einem Sprachmodell beantwortet, auch in den USA; die Stimme erzeugt ElevenLabs (USA) aus der Antwort. Gespeichert wird nichts. Nach einer Minute ohne Gespräch beginnt alles von vorn.',
      hinweisWeiter: 'Zum Starten den Knopf noch einmal drücken oder hier tippen.', start: 'Gespräch starten',
      bereit: 'Knopf gedrückt halten und sprechen – oder tippen, sprechen, tippen.', hoert: 'Ich höre zu … noch {s} s', denkt: 'Einen Moment …',
      nichts: 'Das habe ich nicht verstanden. Bitte noch einmal.', kurz: 'Bitte etwas länger halten.',
      fehler: 'Gerade klappt es nicht. Bitte fragen Sie das Standpersonal.', grenze: 'Für heute habe ich genug erzählt. Bitte fragen Sie das Standpersonal.',
      offline: 'offline', offlineHinweis: 'Gerade ohne Netz – tippen Sie eine Frage an.', ki: 'KI · künstliche Stimme',
    },
    en: {
      einladung: 'Ask {name}: press the button or touch the screen.', beispiele: 'For example:',
      hinweisTitel: 'Before we start',
      hinweisText: "{name} is an AI with an artificially generated voice. What you say is turned into text by Cloudflare and answered by a language model, including in the United States; ElevenLabs (USA) generates the voice from the answer. Nothing is stored. After a minute without conversation everything starts afresh.",
      hinweisWeiter: 'Press the button again or tap here to start.', start: 'Start the conversation',
      bereit: 'Hold the button and speak – or tap, speak, tap.', hoert: 'Listening … {s} s left', denkt: 'One moment …',
      nichts: "I didn't catch that. Please try again.", kurz: 'Please hold a little longer.',
      fehler: "That isn't working right now. Please ask the staff on the stand.", grenze: "That's enough from me for today. Please ask the staff on the stand.",
      offline: 'offline', offlineHinweis: 'No connection at the moment – tap a question.', ki: 'AI · synthetic voice',
    },
  };

  let K = null;            // Gerätekonfiguration vom lokalen Dienst
  let figur = null;        // Steuerung aus figur.js
  let texte = null;        // Name, Rolle, Begrüßung, Einstiegsfragen in der Sprache
  let sprache = 'de';
  let zustand = 'ruhe';    // ruhe | hinweis | bereit | hoeren | denken | sprechen
  let verlauf = [];        // nur im Speicher, wird beim Zurücksetzen geleert
  let schonGesprochen = false, aufnahme = null, startet = false, gedrueckt = 0, perDruck = false;
  let online = true, offlineAntworten = [], letztesZwitschern = 0, untaetig = 0;
  const t = (key, name) => (TEXT[sprache][key] || '').replace('{name}', name || (texte && texte.name) || '');

  // ---------- Anzeige ----------
  function anleitung(text) { $('k-anleitung').textContent = text || ''; }
  function untertitel(besucher, antwort) {
    const box = $('k-untertitel');
    box.replaceChildren();
    if (besucher) { const p = document.createElement('p'); p.className = 'besucher'; p.textContent = besucher; box.append(p); }
    if (antwort) {
      const p = document.createElement('p');
      p.className = 'antwort' + (antwort.length > 300 ? ' sehr-lang' : antwort.length > 160 ? ' lang' : '');
      p.textContent = antwort; box.append(p);
    }
  }
  function beispiele() {
    const ul = $('k-beispiele');
    ul.replaceChildren();
    if (!online && offlineAntworten.length && zustand !== 'hinweis') {
      for (const a of offlineAntworten) {
        const li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button'; b.textContent = a.frage[sprache] || a.frage.de; b.dataset.offline = '1';
        b.addEventListener('click', e => { e.stopPropagation(); offlineAntwort(a); });
        li.append(b); ul.append(li);
      }
      return;
    }
    if (zustand !== 'ruhe' || !texte) return;
    for (const f of texte.fragen.slice(0, 3)) { const li = document.createElement('li'); li.textContent = f; ul.append(li); }
  }
  function zeigen() {
    $('k-hinweis').hidden = zustand !== 'hinweis';
    $('k-pegel').hidden = zustand !== 'hoeren';
    $('k-offline').hidden = online;
    document.body.dataset.zustand = zustand;
    if (zustand === 'ruhe') anleitung(online ? t('einladung') : t('offlineHinweis'));
    else if (zustand === 'bereit') anleitung(online ? t('bereit') : t('offlineHinweis'));
    else if (zustand === 'denken') anleitung(t('denkt'));
    beispiele();
  }

  // ---------- Inaktivität: nach K.inaktivitaet_s alles zurück, nichts bleibt ----------
  function aktiv() {
    clearTimeout(untaetig);
    untaetig = setTimeout(() => { if (zustand === 'hoeren' || zustand === 'denken' || A.spielt) aktiv(); else zuruecksetzen(); }, (K.inaktivitaet_s || 60) * 1000);
  }
  function zuruecksetzen() {
    clearTimeout(untaetig);
    if (aufnahme) { aufnahme.abbrechen(); aufnahme = null; }
    A.schweigen(); figur.ruhe(); figur.lauschen(false);
    verlauf = []; schonGesprochen = false; zustand = 'ruhe';
    untertitel('', ''); zeigen();
  }

  // ---------- Taster und Touch: ein Knopf für alles ----------
  function druck() {
    A.entsperren();
    if (zustand === 'ruhe') { zustand = online ? 'hinweis' : 'bereit'; zeigen(); aktiv(); return; }
    if (zustand === 'hinweis') { zustand = 'bereit'; untertitel('', texte.begruessung); zeigen(); aktiv(); return; }
    if (!online) { aktiv(); return; }
    if (zustand === 'sprechen') { A.schweigen(); figur.ruhe(); zustand = 'bereit'; }
    if (zustand === 'hoeren') { perDruck = false; stoppen(true); return; }
    if (zustand === 'bereit') { gedrueckt = performance.now(); perDruck = true; aufnehmen(); }
  }
  function los() {
    if (perDruck && aufnahme && performance.now() - gedrueckt >= 350) stoppen(true);
    perDruck = false;
  }

  // ---------- Aufnahme und Antwort ----------
  async function aufnehmen() {
    if (aufnahme || startet) return;
    startet = true; aktiv();
    let a;
    try { a = await A.aufnahme({ pegel: s => { $('k-pegel').firstElementChild.style.width = Math.min(100, Math.round(s * 140)) + '%'; } }); }
    catch (_) { startet = false; anleitung(t('fehler')); return; }
    startet = false;
    if (zustand !== 'bereit') { a.abbrechen(); return; }
    aufnahme = a; zustand = 'hoeren'; zeigen(); figur.lauschen(true);
    const max = (K.aufnahme_s || 20) * 1000;
    a.timer = setTimeout(() => stoppen(true), max);
    const rest = () => {
      if (aufnahme !== a) return;
      anleitung(t('hoert').replace('{s}', Math.max(0, Math.ceil(max / 1000 - a.dauer()))));
      requestAnimationFrame(rest);
    };
    requestAnimationFrame(rest);
  }
  async function stoppen(senden) {
    const a = aufnahme;
    if (!a) return;
    aufnahme = null; clearTimeout(a.timer);
    const dauer = a.dauer(), wav = senden ? a.stopp() : (a.abbrechen(), null);
    figur.lauschen(false);
    zustand = 'bereit'; zeigen(); aktiv();
    if (!senden) return;
    if (dauer < .4) { anleitung(t('kurz')); return; }
    zustand = 'denken'; zeigen();
    let d = {};
    try {
      const r = await fetch('/kiosk/listen?lang=' + sprache, { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav });
      d = await r.json().catch(() => ({}));
      if (d.offline) return offlineSchalten(false);
      if (!r.ok) { zustand = 'bereit'; zeigen(); anleitung(t('fehler')); return; }
    } catch (_) { return offlineSchalten(false); }
    if (d.grenze) { zustand = 'bereit'; zeigen(); anleitung(t('grenze')); return; }
    if (!d.text) { zustand = 'bereit'; zeigen(); anleitung(t('nichts')); return; }
    fragen(d.text);
  }
  async function fragen(text) {
    untertitel(text, '');
    verlauf.push({ role: 'user', content: text });
    zustand = 'denken'; zeigen(); aktiv();
    let antwort = null;
    try {
      const r = await fetch('/kiosk/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ figur: K.figur, lang: sprache, messages: verlauf.slice(-16), gesprochen: true, stimme: K.stimme === false ? undefined : { erste: !schonGesprochen } }) });
      if (r.status === 503) { const d = await r.json().catch(() => ({})); if (d.offline) { verlauf.pop(); return offlineSchalten(false); } }
      if (!r.ok) throw new Error(String(r.status));
      if (/ndjson/.test(r.headers.get('content-type') || '')) {
        const zeilen = (await r.text()).trim().split('\n').map(z => JSON.parse(z));
        antwort = zeilen[0]; antwort.stimmeZeile = zeilen[1] || null;
      } else antwort = await r.json();
    } catch (_) { verlauf.pop(); zustand = 'bereit'; zeigen(); anleitung(t('fehler')); return; }
    schonGesprochen = true;
    verlauf.push({ role: 'assistant', content: antwort.reply });
    untertitel(text, antwort.reply);
    sprechen(antwort.reply, antwort.stimmeZeile);
  }
  // Stimme aus der Antwort; ohne Stimme vom Server nur bei rueckfall „browser“ der Figur lokal vorlesen, sonst nur Text.
  async function sprechen(text, zeile, datei) {
    zustand = 'sprechen'; zeigen(); aktiv();
    const fertig = () => { if (zustand === 'sprechen') { zustand = 'bereit'; figur.ruhe(); zeigen(); aktiv(); } };
    let weich = 0;
    const pegel = rms => { weich = weich * .55 + rms * .45; figur.pegel(weich); };
    if (datei) {
      try {
        const buf = new Uint8Array(await (await fetch(datei)).arrayBuffer());
        let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        if (await A.abspielen(btoa(bin), { pegel, ende: fertig, lautstaerke: K.lautstaerke || 1 })) return;
      } catch (_) {}
    }
    if (zeile && zeile.stimme && await A.abspielen(zeile.stimme.daten, { pegel, ende: fertig, lautstaerke: K.lautstaerke || 1 })) return;
    // Gerätestimme nur, wenn die Figur sie erlaubt (figur.json, stimme.rueckfall „browser“) – Goch: immer dieselbe Stimme
    if ((!zeile || zeile.grund !== 'grenze') && figur.figur.stimme && figur.figur.stimme.rueckfall === 'browser') {
      let zu = 0;
      const b = (figur.figur.stimme && figur.figur.stimme.browser) || {};
      if (A.browserStimme(text, sprache, { vorzug: b[sprache] || [], tonhoehe: b.tonhoehe || 1, tempo: b.tempo || 1,
        wort: () => { figur.pegel(.12); clearTimeout(zu); zu = setTimeout(() => figur.pegel(.03), 110); }, ende: fertig })) return;
    }
    fertig();
  }

  // ---------- Ohne Netz ----------
  function offlineSchalten(an) {
    online = an;
    if (!an) { if (aufnahme) { aufnahme.abbrechen(); aufnahme = null; } figur.lauschen(false); if (zustand !== 'ruhe') zustand = 'bereit'; }
    zeigen();
  }
  function offlineAntwort(a) {
    aktiv();
    untertitel(a.frage[sprache] || a.frage.de, a.antwort[sprache] || a.antwort.de);
    sprechen(a.antwort[sprache] || a.antwort.de, null, a.audio && a.audio[sprache] ? '/kiosk/offline/' + encodeURIComponent(a.audio[sprache]) : null);
  }

  // ---------- Anwesenheit (Radar) → hörbares Zwitschern ----------
  function ruhezeit(jetzt = new Date()) {
    const minuten = jetzt.getHours() * 60 + jetzt.getMinutes();
    const m = s => { const [h, mi] = String(s).split(':').map(Number); return h * 60 + (mi || 0); };
    return (K.ruhezeiten || []).some(r => { const von = m(r.von), bis = m(r.bis); return von <= bis ? minuten >= von && minuten < bis : minuten >= von || minuten < bis; });
  }
  function anwesend(e) {
    const z = K.zwitschern || {};
    if (!z.an || zustand !== 'ruhe' || ruhezeit()) return;
    const [von, bis] = z.entfernung_m || [1, 3];
    if (typeof e.entfernung === 'number' && (e.entfernung < von || e.entfernung > bis)) return;
    if (Date.now() - letztesZwitschern < (z.abklingzeit_s || 30) * 1000) return;
    letztesZwitschern = Date.now();
    figur.zwitschern();
    document.body.dataset.gezwitschert = String(+(document.body.dataset.gezwitschert || 0) + 1); // für Tests
    const quelle = figur.signalton();
    if (quelle) { try { const ton = new Audio(quelle); ton.volume = Math.max(0, Math.min(1, z.lautstaerke ?? .5)); ton.play().catch(() => {}); } catch (_) {} }
  }

  // ---------- Start ----------
  async function start() {
    K = await (await fetch('/kiosk/konfiguration', { cache: 'no-store' })).json();
    sprache = lang || (K.sprache === 'en' ? 'en' : 'de');
    document.documentElement.lang = sprache;
    document.body.classList.toggle('kiosk-geraet', K.zeiger !== true);
    const basis = K.figurBasis || '/figur/' + K.figur + '/';
    const daten = await F.laden(basis);
    figur = F.bauen(daten, basis, $('scene'), { fassung: K.fassung });
    const noten = document.createElement('span');
    noten.className = 'noten'; noten.setAttribute('aria-hidden', 'true'); noten.innerHTML = '<span>♪</span><span>♫</span>';
    $('scene').append(noten);
    const groesse = Math.max(.3, Math.min(1, K.groesse || (daten.kiosk && daten.kiosk.groesse) || .82));
    const verhaeltnis = daten.animation.art === 'logo' ? daten.animation.logo.breite / daten.animation.logo.hoehe : daten.animation.buehne.breite / daten.animation.buehne.hoehe;
    $('scene').style.width = 'min(' + (groesse * 100) + 'vw, ' + (48 * verhaeltnis).toFixed(2) + 'vh)';
    // Texte: Goch aus language.js, Kundenfiguren aus der Redaktion (über den lokalen Dienst, offline zwischengespeichert)
    if (daten.texte && daten.texte.quelle === 'language.js' && L) {
      const k = daten.texte.schluessel;
      texte = { name: L.t(k.name) || daten.name[sprache], rolle: L.t(k.rolle) || daten.rolle[sprache], begruessung: L.t(k.begruessung), fragen: k.einstiegsfragen.map(x => L.t(x)) };
    } else {
      let meta = {};
      try { meta = await (await fetch('/kiosk/figur?id=' + encodeURIComponent(K.figur))).json(); } catch (_) {}
      const s = (meta.sprachen || []).includes(sprache) ? sprache : (meta.sprachen || [sprache])[0];
      texte = { name: (meta.name || daten.name || {})[s] || daten.id, rolle: (meta.rolle || daten.rolle || {})[s] || '',
        begruessung: (meta.begruessung || (daten.texte || {}).begruessung || {})[s] || '', fragen: (meta.fragen || (daten.texte || {}).einstiegsfragen || {})[s] || [] };
    }
    $('k-name').textContent = texte.name;
    $('k-rolle').textContent = texte.rolle;
    $('k-ki').textContent = TEXT[sprache].ki;
    $('k-offline').textContent = TEXT[sprache].offline;
    $('k-hinweis-titel').textContent = t('hinweisTitel');
    $('k-hinweis-text').textContent = t('hinweisText');
    $('k-hinweis-weiter').textContent = t('hinweisWeiter');
    $('k-start').textContent = t('start');
    $('scene').setAttribute('aria-label', texte.name + ', ' + texte.rolle);
    document.title = texte.name + ' – robin.vision';
    if (K.sprachwahl) {
      $('k-sprachen').hidden = false;
      $('k-sprachen').querySelectorAll('button').forEach(b => {
        b.setAttribute('aria-current', String(b.dataset.lang === sprache));
        b.addEventListener('pointerdown', e => e.stopPropagation());
        b.addEventListener('click', e => { e.stopPropagation(); const u = new URL(location.href); u.searchParams.set('lang', b.dataset.lang); location.replace(u); });
      });
    }
    try { offlineAntworten = (await (await fetch('/kiosk/offline')).json()).antworten || []; } catch (_) { offlineAntworten = []; }
    $('kiosk').hidden = false;
    zeigen();

    // Bedienung: Taster (eine Taste) und Touch auf dem ganzen Bildschirm
    const taste = K.taste || 'F13';
    window.addEventListener('keydown', e => { if ((e.key === taste || e.code === taste) && !e.repeat) { e.preventDefault(); druck(); } });
    window.addEventListener('keyup', e => { if (e.key === taste || e.code === taste) { e.preventDefault(); los(); } });
    $('kiosk').addEventListener('pointerdown', e => {
      if (e.target.closest('button[data-offline], .sprachen')) return;
      e.preventDefault();
      try { $('kiosk').setPointerCapture(e.pointerId); } catch (_) {}
      druck();
    });
    $('kiosk').addEventListener('pointerup', los);
    $('kiosk').addEventListener('pointercancel', los);
    $('k-start').addEventListener('click', e => e.stopPropagation());

    // Ereignisse vom lokalen Dienst: Radar, Netz
    const quelle = new EventSource('/ereignisse');
    quelle.onmessage = m => {
      let e; try { e = JSON.parse(m.data); } catch (_) { return; }
      if (e.typ === 'anwesend') anwesend(e);
      if (e.typ === 'netz') offlineSchalten(!!e.online);
    };
    // Lebenszeichen der Seite für den Wächter des Dienstes (startet den Browser neu, wenn es ausbleibt)
    setInterval(() => { fetch('/kiosk/puls', { method: 'POST' }).catch(() => {}); }, 30000);
    fetch('/kiosk/puls', { method: 'POST' }).catch(() => {});
    window.Kiosk = { get zustand() { return zustand; }, get verlauf() { return verlauf.length; }, anwesend, zuruecksetzen }; // für Tests
  }
  start().catch(e => { const p = $('k-nur-geraet'); p.textContent = 'Messegerät: ' + e.message; p.hidden = false; });
})();
