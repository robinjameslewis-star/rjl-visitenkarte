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
  const version = '2026-09-17.1'; // bei geändertem Einwilligungstext hochzählen
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

  // ---------- Gespräch ----------
  const history = []; // {role, content} – nur die Runde, kein Speicher
  let opened = false, busy = false, pending = null, returnFocus = null;

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
  function place() {
    if (panel.hidden || narrow.matches) { panel.style.cssText = ''; return; }
    const base = (panel.offsetParent || stage).getBoundingClientRect(); // .perch, der Bezugsrahmen der Lage
    const nameBox = nameLink.getBoundingClientRect(), sceneBox = scene.getBoundingClientRect();
    const left = nameBox.left - base.left;
    const right = sceneBox.left + sceneBox.width * .24 - base.left; // vor dem Vogelkörper
    panel.style.left = left + 'px';
    panel.style.width = Math.max(260, Math.min(400, right - left)) + 'px';
    panel.style.bottom = (base.bottom - nameBox.top + 14) + 'px';
    panel.style.maxHeight = Math.max(240, Math.min(560, nameBox.top + scrollY - 24)) + 'px';
  }
  function open() {
    if (!panel.hidden) { input.focus(); return; }
    returnFocus = document.activeElement;
    panel.hidden = false;
    place();
    panel.scrollIntoView({ block: 'nearest' });
    scene.setAttribute('aria-expanded', 'true');
    if (!opened) { opened = true; bubble('goch', t('gochGreeting')); }
    if (choice && !choice.allowed) bubble('goch', t('gochDeniedNote'));
    setAvailability();
    (form.hidden ? closeButton : input).focus();
  }
  function close() {
    panel.hidden = true;
    scene.setAttribute('aria-expanded', 'false');
    consentBox.hidden = true;
    const target = returnFocus && returnFocus !== document.body ? returnFocus : scene;
    if (target.focus) target.focus();
    returnFocus = null;
  }
  function askConsent(text) {
    pending = text;
    consentBox.hidden = false;
    form.hidden = true; starters.hidden = true;
    document.getElementById('goch-allow').focus();
  }
  async function ask(text) {
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
        body: JSON.stringify({ lang: language.current, messages: history.slice(-24) })
      });
      if (r.status === 503) { switchOff(); return; } // in der Redaktion ausgeschaltet: Vogel fliegt wieder statt zu sprechen
      if (!r.ok) throw new Error(String(r.status));
      data = await r.json();
      if (!data || typeof data.reply !== 'string') throw new Error('format');
    } catch (_) {
      thinking.remove();
      const p = bubble('goch', t('gochError') + ' ');
      p.append(link('mailto:robinjameslewis@googlemail.com', 'robinjameslewis@googlemail.com'));
      history.pop();
      busy = false; setAvailability(); input.focus();
      return;
    }
    thinking.classList.remove('goch-thinking');
    thinking.textContent = data.reply;
    if (data.action === 'calendar') {
      thinking.append(' ', link('#kontakt', t('gochCalendar')));
    } else if (data.action === 'contact') {
      thinking.append(' ', link('mailto:robinjameslewis@googlemail.com', 'robinjameslewis@googlemail.com'));
    }
    // Link aus Robins Liste (links.md im Worker): nur https, öffnet in neuem Tab. Der Verlauf merkt sich
    // „(Link: Text)“, damit der Worker denselben Link nicht noch einmal anbietet.
    const l = data.link;
    let remembered = data.reply;
    if (l && typeof l.url === 'string' && /^https:\/\//.test(l.url) && typeof l.label === 'string' && l.label) {
      thinking.append(' ', link(l.url, l.label, true));
      remembered += ' (Link: ' + l.label + ')';
    }
    history.push({ role: 'assistant', content: remembered });
    log.scrollTop = log.scrollHeight;
    busy = false; setAvailability(); input.focus();
  }

  // Goch ausgeschaltet (Worker antwortet 503, z. B. weil die Seite noch aus dem Cache kommt): Gespräch schließen,
  // Vogel wie vor Goch – der Klick wiederholt den Anflug.
  function switchOff() {
    busy = false; history.length = 0; log.replaceChildren(); opened = false;
    panel.hidden = true; scene.setAttribute('aria-expanded', 'false');
    delete scene.dataset.chat; language.refresh();
    scene.removeEventListener('click', onClick);
  }
  const onClick = event => { event.preventDefault(); open(); };
  scene.addEventListener('click', onClick);
  closeButton.addEventListener('click', close);
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
    store(false); pending = null; consentBox.hidden = true;
    bubble('goch', t('gochDeniedNote'));
    setAvailability(); closeButton.focus();
  });
  withdraw.addEventListener('click', () => {
    forget(); consentBox.hidden = true; setAvailability();
    bubble('goch', t('gochWithdrawn'));
    input.focus();
  });
  window.addEventListener('site-languagechange', setAvailability);
  window.addEventListener('resize', place, { passive: true });
  narrow.addEventListener('change', place);
})();
