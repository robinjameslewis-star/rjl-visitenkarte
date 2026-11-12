// Goch, das Rotkehlchen von Robin: Sprechblase am Ast.
// Ohne Endpunkt (data-chat-endpoint leer, kein ?goch=) bleibt die Seite wie vor Goch:
// ein Klick auf den Vogel wiederholt den Anflug. Mit Endpunkt öffnet der Klick das Gespräch.
(() => {
  'use strict';
  const language = window.SiteLanguage;
  const t = key => language.t(key);
  const scene = document.getElementById('scene');
  const panel = document.getElementById('goch');
  const log = document.getElementById('goch-log');
  const form = document.getElementById('goch-form');
  const input = document.getElementById('goch-input');
  const send = document.getElementById('goch-send');
  const starters = document.getElementById('goch-starters');
  const consentBox = document.getElementById('goch-consent');
  const withdraw = document.getElementById('goch-withdraw');
  const closeButton = document.getElementById('goch-close');

  // ---------- Endpunkt: Attribut am <body>. Zum Testen überschreibbar – lokal per ?goch=URL, auf der
  // veröffentlichten Seite nur über localStorage 'rjl-goch-endpoint' (setzt Robin selbst im Browser),
  // damit niemand per Link einen fremden Endpunkt unterschieben kann. ----------
  function endpointFrom() {
    const valid = value => typeof value === 'string' && /^https?:\/\//.test(value) ? value : '';
    try { const own = valid(localStorage.getItem('rjl-goch-endpoint')); if (own) return own; } catch (_) {}
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      // Der Testschalter bleibt im Tab erhalten (sessionStorage), auch nach Sprachwechsel oder Neuladen;
      // ?goch=off schaltet Goch für Tests ab.
      const param = new URL(location.href).searchParams.get('goch');
      const local = param === 'off' ? 'off' : valid(param);
      try {
        if (local) sessionStorage.setItem('rjl-goch-test', local);
        const kept = sessionStorage.getItem('rjl-goch-test');
        if (kept === 'off') return '';
        if (valid(kept)) return kept;
      } catch (_) { if (local) return local === 'off' ? '' : local; }
    }
    return document.body.dataset.chatEndpoint || '';
  }
  const endpoint = endpointFrom();
  if (!endpoint) return;
  scene.dataset.chat = 'on';
  language.refresh();

  // ---------- Einwilligung: wie beim Kalender, eigene Stufe, nur im Browser gespeichert ----------
  const storeKey = 'rjl-goch-consent';
  const version = '2026-10-16.1'; // bei geändertem Einwilligungstext hochzählen (16.10.2026: Sie-Form)
  const maxAge = 180 * 24 * 60 * 60 * 1000;
  function readChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(storeKey));
      if (value && value.version === version && typeof value.allowed === 'boolean' &&
          Number.isFinite(value.at) && value.at <= Date.now() &&
          value.expires === value.at + maxAge && value.expires > Date.now()) return value;
    } catch (_) { /* Speicher nicht verfügbar: gilt als keine Zustimmung. */ }
    return null;
  }
  let choice = readChoice();
  function store(allowed) {
    const now = Date.now();
    choice = { allowed, at: now, expires: now + maxAge, version };
    try { localStorage.setItem(storeKey, JSON.stringify(choice)); } catch (_) {}
  }
  function forget() {
    choice = null;
    try { localStorage.removeItem(storeKey); } catch (_) {}
  }

  const unterseite = !!document.body.dataset.gochSeite, heim = document.body.dataset.gochHeim || ''; // Unterseiten (goch-seite.js); heim: Adresse der Startseite
  // ---------- Gespräch ----------
  const history = []; // {role, content} – nur die Runde, kein Speicher
  let opened = false, busy = false, pending = null, returnFocus = null;
  // Gespräch über Seitenwechsel („Ein Tal“, Schritt 6, 11.11.2026): Der Verlauf bleibt für diesen Besuch im Browser
  // (sessionStorage, endet mit dem Tab), nie auf einem Server. So beginnt Goch nicht auf jeder Seite neu. Gemerkt werden die
  // letzten 24 Einträge, die Sprache und ob das Gespräch offen war. Der Deckel je Gespräch (Worker, MAX_TURNS) zählt die
  // Antworten im gesendeten Verlauf und gilt damit über alle Seiten. Ohne Einwilligung ins Gespräch wird nichts gemerkt.
  const merkKey = 'rjl-goch-verlauf';
  const vergessen = () => { try { sessionStorage.removeItem(merkKey); } catch (_) {} };
  function merken() {
    try {
      if (!choice || !choice.allowed || !history.length) { sessionStorage.removeItem(merkKey); return; }
      sessionStorage.setItem(merkKey, JSON.stringify({ v: 1, lang: language.current, offen: !panel.hidden, verlauf: history.slice(-24) }));
    } catch (_) { /* ohne Speicher beginnt das Gespräch auf der nächsten Seite neu */ }
  }

  function bubble(role, text) {
    const p = document.createElement('p');
    p.className = 'goch-bubble goch-' + role;
    p.textContent = text;
    log.append(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }
  function link(href, label, external) {
    const a = document.createElement('a');
    a.href = href; a.textContent = label; a.className = 'goch-action';
    if (external) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }
  // Newsletter im Gespräch (Robin, 15.10.2026): Goch bietet die Anmeldung an, die Seite zeigt ein Feld. Die Adresse geht wie
  // beim Formular der Seite direkt an die Anmeldung (data-newsletter-endpoint, Double-Opt-In über Brevo), nie an das Modell.
  function newsletterForm() {
    const target = document.body.dataset.newsletterEndpoint || '';
    if (!/^https:\/\//.test(target)) return null;
    const shown = Date.now();
    const box = document.createElement('form');
    box.className = 'goch-nl'; box.noValidate = true;
    const field = document.createElement('input');
    field.type = 'email'; field.required = true; field.maxLength = 120; field.autocomplete = 'email'; field.inputMode = 'email';
    field.placeholder = t('fieldEmail'); field.setAttribute('aria-label', t('fieldEmail'));
    const button = document.createElement('button');
    button.type = 'submit'; button.className = 'goch-send'; button.textContent = t('newsletterSend');
    const status = document.createElement('p');
    status.className = 'goch-nl-status'; status.setAttribute('role', 'status');
    box.append(field, button, status);
    box.addEventListener('submit', async event => {
      event.preventDefault();
      const email = field.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { status.textContent = t('newsletterInvalid'); field.focus(); return; }
      button.disabled = true; status.textContent = t('newsletterSending');
      try {
        const r = await fetch(target, { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ lang: language.current, email, website: '', t: shown }) });
        const out = await r.json().catch(() => ({}));
        if (r.ok && out.ok) { status.textContent = out.text || t('newsletterConfirmed'); field.disabled = true; return; }
        status.textContent = out.error || t('newsletterError');
      } catch (_) { status.textContent = t('newsletterError'); }
      button.disabled = false;
    });
    return box;
  }
  function setAvailability() {
    const denied = choice && !choice.allowed;
    form.hidden = denied; starters.hidden = denied || history.length > 0;
    withdraw.hidden = !choice;
    withdraw.textContent = denied ? t('gochReconsider') : t('gochWithdraw');
    input.disabled = busy; send.disabled = busy;
  }
  // Die Sprechblase steht links über dem Namen und reicht in den freien Himmel neben dem Vogel;
  // auf dem Handy (≤ 720 px) ist sie per CSS ein Blatt am unteren Rand.
  const stage = document.querySelector('.stage');
  const nameLink = document.getElementById('name-link');
  const narrow = matchMedia('(max-width: 720px)');
  const panelHome = panel.parentNode;
  // Mit Sprachschaltern (goch-stimme.js) braucht die Blase mehr Platz: so hoch wie ihr Inhalt plus Raum für den Verlauf,
  // sonst schrumpft der Verlauf auf null und die Fußzeile ragt über die Seite (Robin, 23.10.2026).
  function mindesthoehe() {
    if (!panel.querySelector('#goch-sprache:not([hidden]), #goch-mikro:not([hidden])')) return 0;
    const s = getComputedStyle(panel), abstand = parseFloat(s.rowGap) || 10;
    const kinder = [...panel.children].filter(k => k !== log && !k.hidden && getComputedStyle(k).display !== 'none');
    return kinder.reduce((h, k) => h + k.offsetHeight + abstand, parseFloat(s.paddingTop) + parseFloat(s.paddingBottom) + 2) + 150;
  }
  function place() {
    // Das feste Handyfenster gehört auf die Seitenebene, nicht in die isolierte Landschaft.
    // Desktop: zurück an den Ast. Ereignisse und Gesprächszustand bleiben am selben DOM-Knoten.
    // Ebenso das mitlaufende Blatt auf breiten Bildschirmen (goch-gespraech.js, html.goch-angeheftet): Goch ist aus dem Bild.
    // Auf Unterseiten (goch-seite.js) ist das Gespräch in jeder Breite ein Blatt am unteren Rand.
    const blatt = narrow.matches || unterseite || document.documentElement.classList.contains('goch-angeheftet');
    const parent = blatt ? document.body : panelHome;
    if (panel.parentNode !== parent) {
      const aktiv = panel.contains(document.activeElement) ? document.activeElement : null; // Umhängen nimmt den Fokus
      parent.appendChild(panel);
      if (aktiv) aktiv.focus({ preventScroll: true });
    }
    if (panel.hidden || blatt) { panel.style.cssText = ''; return; }
    const base = (panel.offsetParent || stage).getBoundingClientRect(); // .perch, der Bezugsrahmen der Lage
    const nameBox = nameLink.getBoundingClientRect(), sceneBox = scene.getBoundingClientRect();
    const left = nameBox.left - base.left;
    const right = sceneBox.left + sceneBox.width * .24 - base.left; // vor dem Vogelkörper
    panel.style.left = left + 'px';
    panel.style.width = Math.max(260, Math.min(400, right - left)) + 'px';
    if (document.documentElement.classList.contains('landscape-on')) {
      // Mit Landschaft steht der Name oben im Himmel: Die Blase hängt unter ihm, vor der fernen Landschaft.
      panel.style.bottom = 'auto';
      panel.style.top = (nameBox.bottom - base.top + 16) + 'px';
      panel.style.maxHeight = Math.max(mindesthoehe(), 240, Math.min(520, base.bottom - nameBox.bottom + 120)) + 'px';
    } else {
      panel.style.bottom = (base.bottom - nameBox.top + 14) + 'px';
      panel.style.maxHeight = Math.max(mindesthoehe(), 240, Math.min(560, nameBox.top + scrollY - 24)) + 'px';
    }
  }
  function open(still) { // still: wieder geöffnet nach einem Seitenwechsel – ohne Fokus (am Handy ginge die Tastatur auf) und ohne Scrollen
    if (!panel.hidden) { input.focus(); return; }
    returnFocus = document.activeElement;
    panel.hidden = false;
    place();
    if (still !== true) panel.scrollIntoView({ block: 'nearest' });
    scene.setAttribute('aria-expanded', 'true');
    if (!opened) { opened = true; bubble('goch', document.body.dataset.gochGruss || t('gochGreeting')); }
    if (choice && !choice.allowed) bubble('goch', t('gochDeniedNote'));
    setAvailability();
    if (still !== true) (form.hidden ? closeButton : input).focus();
    merken();
  }
  function close(still) { // still: „Platz machen“ – ohne Fokus auf Goch, sonst spränge die Seite zu ihm
    panel.hidden = true;
    merken();
    scene.setAttribute('aria-expanded', 'false');
    consentBox.hidden = true;
    const target = returnFocus && returnFocus !== document.body ? returnFocus : scene;
    if (still !== true && target.focus) target.focus();
    returnFocus = null;
  }
  function askConsent(text) {
    pending = text;
    consentBox.hidden = false;
    form.hidden = true; starters.hidden = true;
    document.getElementById('goch-allow').focus();
  }
  // Sprechender Goch (23.10.2026): goch-stimme.js ergänzt die Anfrage nur, wenn der Besucher Spracheingabe oder Stimme
  // eingeschaltet hat (gesprochen, stimme, figur); sonst bleibt sie wie vorher. Mit Stimme antwortet der Worker als NDJSON:
  // die erste Zeile ist die gewohnte Antwort, den Rest (die Stimme) liest goch-stimme.js.
  const zusatz = opts => (window.GochStimme && window.GochStimme.anfrage(opts)) || {};
  async function ersteZeile(r) {
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buf += dec.decode(value, { stream: true });
      const i = buf.indexOf('\n');
      if (i >= 0 || done) {
        const first = JSON.parse(i >= 0 ? buf.slice(0, i) : buf);
        if (window.GochStimme && !done) window.GochStimme.rest(reader, buf.slice(i + 1), dec, first); else if (!done) reader.cancel();
        return first;
      }
    }
  }
  async function ask(text, opts = {}) {
    text = text.trim().slice(0, 600);
    if (!text || busy) return;
    if (!choice || !choice.allowed) { askConsent(text); return; }
    busy = true; setAvailability();
    bubble('you', text);
    history.push({ role: 'user', content: text });
    const thinking = bubble('goch', '…');
    thinking.classList.add('goch-thinking');
    let data;
    try {
      const r = await fetch(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        // Unterseiten nennen ihren Pfad, damit Goch weiß, wo der Besucher ist (der Worker nimmt nur Seiten, die er selbst kennt)
        body: JSON.stringify({ lang: language.current, messages: history.slice(-24), ...(unterseite ? { seite: location.pathname } : {}), ...zusatz(opts) })
      });
      if (r.status === 503) { switchOff(); return; } // in der Redaktion ausgeschaltet: Vogel fliegt wieder statt zu sprechen
      if (!r.ok) throw new Error(String(r.status));
      data = /ndjson/.test(r.headers.get('content-type') || '') ? await ersteZeile(r) : await r.json();
      if (!data || typeof data.reply !== 'string') throw new Error('format');
    } catch (_) {
      thinking.remove();
      const p = bubble('goch', t('gochError') + ' ');
      p.append(link('mailto:robin@robin.vision', 'robin@robin.vision'));
      history.pop();
      busy = false; setAvailability(); input.focus();
      window.dispatchEvent(new CustomEvent('goch-fertig'));
      return;
    }
    thinking.classList.remove('goch-thinking');
    thinking.textContent = data.reply;
    if (data.action === 'calendar') {
      thinking.append(' ', link(heim + '#kontakt', t('gochCalendar')));
    } else if (data.action === 'contact') {
      thinking.append(' ', link('mailto:robin@robin.vision', 'robin@robin.vision'));
    }
    // Link aus Robins Liste (links.md im Worker): nur https, öffnet in neuem Tab. Der Verlauf merkt sich
    // „(Link: Text)“, damit der Worker denselben Link nicht noch einmal anbietet.
    let remembered = data.reply;
    for (const l of [data.link, data.link2]) { // link2 nur bei „Was gibt's Neues?“
      if (l && typeof l.url === 'string' && /^https:\/\//.test(l.url) && typeof l.label === 'string' && l.label) {
        thinking.append(' ', link(l.url, l.label, true));
        remembered += ' (Link: ' + l.label + ')';
      }
    }
    // Sprachmodus (goch-gespraech.js): Verweis zur Stelle der Seite, die Goch zeigt; auf dem Handy führt die Seite hin
    if (data.zeigen && window.GochZeigen) thinking.append(' ', window.GochZeigen.link(data.zeigen));
    history.push({ role: 'assistant', content: remembered });
    merken();
    window.dispatchEvent(new CustomEvent('goch-antwort', { detail: data }));
    const nl = data.action === 'newsletter' ? newsletterForm() : null;
    if (nl) log.append(nl);
    log.scrollTop = log.scrollHeight;
    busy = false; setAvailability();
    (nl ? nl.querySelector('input') : input).focus();
    window.dispatchEvent(new CustomEvent('goch-fertig')); // goch-stimme.js: danach wieder zuhören
  }

  // Goch beginnt das Gespräch von sich aus (goch-blick.js: jemand kommt an den Bildschirm). Fester Satz vom Worker
  // (anlass „angekommen“ oder „zurueck“), erscheint als Gochs Antwort und steht im Verlauf; mit Stimme wird er vorgelesen.
  // Nur mit Einwilligung ins Gespräch und wenn gerade nichts läuft.
  async function begruessen(anlass) {
    if (busy || !choice || !choice.allowed || panel.hidden || form.hidden) return false;
    busy = true; setAvailability();
    let data = null;
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang: language.current, messages: history.slice(-24), anlass, ...zusatz({}) }) });
      if (r.ok) data = /ndjson/.test(r.headers.get('content-type') || '') ? await ersteZeile(r) : await r.json();
    } catch (_) { data = null; }
    busy = false; setAvailability();
    const ok = !!(data && typeof data.reply === 'string' && data.reply.trim());
    if (ok) { bubble('goch', data.reply); history.push({ role: 'assistant', content: data.reply }); log.scrollTop = log.scrollHeight; merken(); }
    window.dispatchEvent(new CustomEvent('goch-fertig'));
    return ok;
  }

  // Goch ausgeschaltet (Worker antwortet 503, z. B. weil die Seite noch aus dem Cache kommt): Gespräch schließen,
  // Vogel wie vor Goch – der Klick wiederholt den Anflug.
  function switchOff() {
    vergessen();
    busy = false; history.length = 0; log.replaceChildren(); opened = false;
    panel.hidden = true; scene.setAttribute('aria-expanded', 'false');
    delete scene.dataset.chat; language.refresh();
    scene.removeEventListener('click', onClick);
  }
  const onClick = event => { event.preventDefault(); open(); };
  scene.addEventListener('click', onClick);
  closeButton.addEventListener('click', () => close());
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  form.addEventListener('submit', event => { event.preventDefault(); const v = input.value; input.value = ''; ask(v); });
  input.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.keyCode === 13) && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
  });
  starters.addEventListener('click', event => {
    const b = event.target.closest('button'); if (b) ask(b.textContent);
  });
  document.getElementById('goch-allow').addEventListener('click', () => {
    store(true); consentBox.hidden = true; setAvailability();
    const text = pending; pending = null;
    if (text) ask(text); else input.focus();
  });
  document.getElementById('goch-deny').addEventListener('click', () => {
    store(false); pending = null; consentBox.hidden = true; vergessen();
    bubble('goch', t('gochDeniedNote'));
    setAvailability(); closeButton.focus();
  });
  withdraw.addEventListener('click', () => {
    forget(); vergessen(); consentBox.hidden = true; setAvailability();
    bubble('goch', t('gochWithdrawn'));
    input.focus();
  });
  // Für goch-stimme.js: erkannten Text als Besuchertext senden, Endpunkt für /listen ableiten.
  // Verlauf dieses Besuchs wieder aufnehmen (nur mit Einwilligung ins Gespräch und in derselben Sprache)
  let wiederOffen = false;
  (() => {
    let m = null;
    try { m = JSON.parse(sessionStorage.getItem(merkKey)); } catch (_) {}
    if (!m) return;
    if (m.v !== 1 || !Array.isArray(m.verlauf) || !choice || !choice.allowed || m.lang !== language.current) { vergessen(); return; }
    const gut = m.verlauf.filter(e => e && (e.role === 'user' || e.role === 'assistant') && typeof e.content === 'string' && e.content.length <= 4000).slice(-24);
    if (!gut.length) { vergessen(); return; }
    opened = true;
    bubble('goch', document.body.dataset.gochGruss || t('gochGreeting'));
    gut.forEach(e => { history.push({ role: e.role, content: e.content }); bubble(e.role === 'user' ? 'you' : 'goch', e.role === 'assistant' ? e.content.replace(/ \(Link: [^)]*\)/g, '') : e.content); });
    wiederOffen = m.offen === true;
  })();
  window.Goch = { ask: (text, opts) => ask(text, opts), endpoint, place, begruessen,
    // für goch-gespraech.js: war das Gespräch vor dem Seitenwechsel offen, geht es dort wieder auf (still)
    wiederOffen: () => wiederOffen, oeffnen: () => { wiederOffen = false; open(true); }, schliessen: () => close(true),
    begonnen: () => history.some(m => m.role === 'user') };
  window.addEventListener('site-languagechange', setAvailability);
  window.addEventListener('resize', place, { passive: true });
  narrow.addEventListener('change', place);
})();
