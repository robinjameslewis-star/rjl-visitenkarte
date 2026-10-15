// Newsletter (Impulse und Werkzeuge): Anmeldung über den Worker (data-newsletter-endpoint), der Brevo die Bestätigungsmail
// schicken lässt (Double-Opt-In). Der Abschnitt bleibt verborgen, solange kein Endpunkt gesetzt ist. Nach der Bestätigung führt
// Brevo auf ?newsletter=bestaetigt#newsletter zurück; dann zeigt der Abschnitt den Dank. Keine Cookies, kein Speicher.
// Auf der Startseite kommen die Texte aus language.js; auf Seiten ohne Sprachmodul (Impulse, Werkzeugseiten, ihre Übersichten)
// die Texte unten in der Sprache der Seite (<html lang>), deutsch in der Sie-Form. Die Sprache wählt die Liste in Brevo.
(() => {
  'use strict';
  const section = document.getElementById('newsletter');
  const form = document.getElementById('newsletter-form');
  if (!section || !form) return;
  const TEXTE = {
    de: {
      newsletterSending: 'Wird gesendet …', newsletterInvalid: 'Bitte eine gültige E-Mail-Adresse angeben.',
      newsletterError: 'Die Anmeldung hat nicht geklappt. Bitte versuchen Sie es später noch einmal.',
      newsletterSent: 'Fast geschafft: Bitte bestätigen Sie die Anmeldung über den Link in der E-Mail, die gerade unterwegs ist.',
      newsletterConfirmed: 'Danke, die Anmeldung ist bestätigt.',
    },
    en: {
      newsletterSending: 'Sending …', newsletterInvalid: 'Please enter a valid email address.',
      newsletterError: 'Signing up did not work. Please try again later.',
      newsletterSent: 'Almost done: please confirm your subscription via the link in the email that is on its way.',
      newsletterConfirmed: 'Thank you, your subscription is confirmed.',
    },
  };
  const seite = document.documentElement.lang === 'en' ? 'en' : 'de';
  const language = window.SiteLanguage || { current: seite, t: key => TEXTE[seite][key] || key, eigeneTexte: true };
  const t = key => language.t(key);
  const status = document.getElementById('nl-status');
  const button = document.getElementById('nl-send');
  const loadedAt = Date.now();
  const endpoint = document.body.dataset.newsletterEndpoint || '';
  const confirmed = new URL(location.href).searchParams.get('newsletter') === 'bestaetigt';
  let state = confirmed ? 'confirmed' : '';

  function say(text, kind) { status.textContent = text; status.className = 'msg-status' + (kind ? ' ' + kind : ''); }
  function show() {
    if (state === 'confirmed') say(t('newsletterConfirmed'), 'ok');
  }

  if (!endpoint && !confirmed) return; // noch nicht eingerichtet: Abschnitt bleibt verborgen
  section.hidden = false;
  if (!endpoint) { form.querySelector('.field').hidden = true; button.hidden = true; }
  show();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = { lang: language.current, email: form.email.value.trim(), website: form.website.value, t: loadedAt };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) { say(t('newsletterInvalid'), 'warn'); return; }
    button.disabled = true; say(t('newsletterSending'));
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      const out = await r.json().catch(() => ({}));
      if (r.ok && out.ok) { state = 'sent'; say(language.eigeneTexte ? t('newsletterSent') : out.text || t('newsletterConfirmed'), 'ok'); form.reset(); }
      else say(out.error || t('newsletterError'), 'warn');
    } catch (_) { say(t('newsletterError'), 'warn'); }
    button.disabled = false;
  });
  window.addEventListener('site-languagechange', show);
})();
