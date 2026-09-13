(() => {
  'use strict';
  const messages = {
    de: {
      contactTitle: 'Termin vereinbaren',
      contactLead: 'Per Video, am Telefon, in Balingen oder an einem Ort nach Wunsch. Jede Buchung ist zunächst ein Vorschlag; ich bestätige den Termin persönlich.',
      book: 'Termin vorschlagen', bookHint: ' – öffnet den Kalender in einem neuen Tab.',
      phone: 'Telefonnummer (optional)', phoneBody: 'Telefon',
      messageTitle: 'Oder eine Nachricht', name: 'Name', email: 'E-Mail', message: 'Nachricht', company: 'Firma', send: 'Nachricht senden',
      legalTitle: 'Impressum · Datenschutz',
      privacy: 'Private Seite. Das Nachrichtenformular öffnet das Mailprogramm mit den eingetragenen Angaben; diese Seite speichert nichts, setzt keine Cookies und zählt keine Besucher. Die Terminbuchung stellt Cal.com bereit (Cal.com, Inc.); Videogespräche finden über Google Meet statt; dort gelten die jeweiligen Datenschutzbestimmungen. Schriften werden von Google Fonts geladen.',
      description: 'Robin James Lewis – Termin vereinbaren oder Nachricht schreiben.',
      language: 'Sprache', replay: 'Rotkehlchen noch einmal anfliegen lassen', replayTitle: 'Noch einmal anfliegen lassen',
      invalid: 'Für die Nachricht fehlen noch ein Name, eine gültige E-Mail-Adresse oder ein Text.',
      sending: 'Die Nachricht ist unterwegs …', success: 'Vielen Dank. Die Nachricht ist angekommen.',
      error: 'Das hat leider nicht geklappt. Alternativ geht es direkt per E-Mail: robinjameslewis@googlemail.com.',
      mailOpened: 'Die Nachricht ist im Mailprogramm vorbereitet und kann dort versendet werden.',
      subject: 'Nachricht von '
    },
    en: {
      contactTitle: 'Arrange an appointment',
      contactLead: 'By video, by phone, in Balingen or at a place of your choosing. Every booking is a proposal at first; I confirm each appointment personally.',
      book: 'Suggest a time', bookHint: ' — opens the calendar in a new tab.',
      phone: 'Phone number (optional)', phoneBody: 'Phone',
      messageTitle: 'Or a message', name: 'Name', email: 'Email', message: 'Message', company: 'Company', send: 'Send message',
      legalTitle: 'Legal notice · Privacy',
      privacy: 'Personal website. The message form opens the email application with the details entered; this website stores nothing, sets no cookies and does not count visitors. Booking is provided by Cal.com (Cal.com, Inc.); video calls use Google Meet. Their respective privacy policies apply. Fonts are loaded from Google Fonts.',
      description: 'Robin James Lewis — arrange an appointment or send a message.',
      language: 'Language', replay: 'Let the robin fly in again', replayTitle: 'Watch the robin fly in again',
      invalid: 'A name, a valid email address and a message are needed before continuing.',
      sending: 'Sending the message …', success: 'Thank you. The message has arrived.',
      error: 'That did not work, unfortunately. Email is another option: robinjameslewis@googlemail.com.',
      mailOpened: 'The message is ready in the email application and can be sent from there.',
      subject: 'Message from '
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
    const status = document.getElementById('status');
    if (status.dataset.message) status.textContent = t(status.dataset.message);
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
