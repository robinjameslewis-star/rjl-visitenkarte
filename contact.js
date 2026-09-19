// Nachricht schreiben: das Kontaktformular ganz unten – der zweite Eingang neben Goch.
// Sendet an den Worker (data-contact-endpoint), der die Nachricht per E-Mail zustellt. Keine Cookies, kein Speicher.
(() => {
  'use strict';
  const form = document.getElementById('message-form');
  if (!form) return;
  const language = window.SiteLanguage;
  const t = key => language.t(key);
  const status = document.getElementById('msg-status');
  const button = document.getElementById('msg-send');
  const loadedAt = Date.now(); // Menschen brauchen ein paar Sekunden; der Worker prüft das mit

  // Endpunkt: Attribut am <body>; beim lokalen Test (?goch=…/chat, siehe goch.js) derselbe Testserver
  function endpoint() {
    try {
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
        const kept = sessionStorage.getItem('rjl-goch-test');
        if (kept && /^https?:\/\//.test(kept)) return kept.replace(/\/chat\/?$/, '') + '/contact';
      }
    } catch (_) {}
    return document.body.dataset.contactEndpoint || '';
  }

  function say(text, kind) { status.textContent = text; status.className = 'msg-status' + (kind ? ' ' + kind : ''); }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = {
      lang: language.current,
      name: form.name.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim(),
      message: form.message.value.trim(), website: form.website.value, t: loadedAt,
    };
    if (data.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email) || data.message.length < 10) { say(t('messageInvalid'), 'warn'); return; }
    const url = endpoint();
    if (!url) { say(t('messageError'), 'warn'); return; }
    button.disabled = true; say(t('sending'));
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      const out = await r.json().catch(() => ({}));
      if (r.ok && out.ok) { say(t('messageSent'), 'ok'); form.reset(); }
      else say(out.error || t('messageError'), 'warn');
    } catch (_) { say(t('messageError'), 'warn'); }
    button.disabled = false;
  });
  window.addEventListener('site-languagechange', () => { if (status.className.includes('ok')) say(t('messageSent'), 'ok'); });
})();
