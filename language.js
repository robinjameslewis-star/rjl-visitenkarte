(() => {
  'use strict';
  const messages = {
    de: {
      contactTitle: 'Termin vereinbaren',
      contactLead: 'Per Video, am Telefon, in Balingen oder an einem Ort nach Wunsch. Jede Buchung ist zunächst ein Vorschlag; ich bestätige den Termin persönlich. Für alles andere: die E-Mail-Adresse im Impressum.',
      book: 'Termin vorschlagen', bookHint: ' – öffnet den Kalender in einem neuen Tab.',
      legalTitle: 'Impressum · Datenschutz',
      privacy: 'Private Seite. Sie speichert nichts, setzt keine Cookies und zählt keine Besucher. Die Terminbuchung stellt Cal.com bereit (Cal.com, Inc.); Videogespräche finden über Google Meet statt; dort gelten die jeweiligen Datenschutzbestimmungen. Schriften werden von Google Fonts geladen.',
      description: 'Robin James Lewis – Termin vereinbaren.',
      language: 'Sprache', replay: 'Rotkehlchen noch einmal anfliegen lassen', replayTitle: 'Noch einmal anfliegen lassen',
    },
    en: {
      contactTitle: 'Arrange an appointment',
      contactLead: 'By video, by phone, in Balingen or at a place of your choosing. Every booking is a proposal at first; I confirm each appointment personally. For anything else, the email address is in the legal notice.',
      book: 'Suggest a time', bookHint: ' — opens the calendar in a new tab.',
      legalTitle: 'Legal notice · Privacy',
      privacy: 'Personal website. It stores nothing, sets no cookies and does not count visitors. Booking is provided by Cal.com (Cal.com, Inc.); video calls use Google Meet. Their respective privacy policies apply. Fonts are loaded from Google Fonts.',
      description: 'Robin James Lewis — arrange an appointment.',
      language: 'Language', replay: 'Let the robin fly in again', replayTitle: 'Watch the robin fly in again',
    }
  };
  const fromURL = () => new URL(location.href).searchParams.get('lang') === 'en' ? 'en' : 'de';
  let language = fromURL();
  const t = key => messages[language][key];

  function apply(next, updateURL = false) {
    if (!Object.hasOwn(messages, next)) return;
    const changed = language !== next;
    language = next;
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelector('.language-nav').setAttribute('aria-label', t('language'));
    document.querySelectorAll('[data-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    const scene = document.getElementById('scene');
    scene.setAttribute('aria-label', t('replay'));
    scene.title = t('replayTitle');
    document.querySelector('meta[name="description"]').content = t('description');
    if (updateURL && changed) {
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      history.pushState(null, '', url);
    }
    if (changed) window.dispatchEvent(new CustomEvent('site-languagechange', { detail: { language } }));
  }

  window.SiteLanguage = { t, get current() { return language; } };
  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => apply(button.dataset.language, true));
  });
  window.addEventListener('popstate', () => apply(fromURL()));
  apply(language);
  document.querySelector('.language-nav').hidden = false;
})();
