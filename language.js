(() => {
  'use strict';
  const messages = {
    de: {
      consentTitle: "Ein Kalender, eine Entscheidung",
      consentText: "Für die eingebettete Terminbuchung lädt Cal.com nach Zustimmung externe Inhalte und verwendet Cookies, unter anderem zum Schutz vor Missbrauch. Dabei werden IP-Adresse und Browserdaten auch in den USA verarbeitet. Die Auswahl gilt für 180 Tage und lässt sich jederzeit in den Datenschutzeinstellungen ändern.",
      consentAllow: "Terminbuchung erlauben",
      consentDeny: "Ohne Terminbuchung fortfahren",
      consentSettings: "Datenschutzeinstellungen",
      consentClose: "Schließen",
      privacyDetails: "Impressum & Datenschutz",
      bookingNotice: "Der eingebettete Kalender ist ausgeschaltet. Die Terminbuchung bleibt über den externen Link erreichbar.",
      privacyIntro: "Verantwortlich für diese Website ist Robin James Lewis; Anschrift und E-Mail-Adresse stehen oben. Die Website verwendet keine eigene Besuchermessung und keine Werbetracker. Schriften und Bilder werden zusammen mit der Website bereitgestellt.",
      privacyHosting: "GitHub Pages stellt die Website bereit. Dabei verarbeitet GitHub, Inc. technische Zugriffsdaten, insbesondere die IP-Adresse, zur Auslieferung und Absicherung der Seite. Grundlage ist Art. 6 Abs. 1 lit. f DSGVO: das Interesse an einem zuverlässigen und sicheren Betrieb. Eine Verarbeitung in den USA ist möglich. Einzelheiten zu Empfängern, Speicherdauer und Übermittlungsgrundlagen beschreibt GitHub.",
      githubPrivacy: "Datenschutz bei GitHub",
      privacyChoice: "Die freiwillige Freigabe des eingebetteten Kalenders beruht auf § 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO. Ohne Zustimmung wird Cal.com hier nicht geladen. Die Auswahl mit Zeitpunkt, Ablaufdatum und Textversion wird für 180 Tage lokal im Browser gespeichert, ohne persönliche Kennung (§ 25 Abs. 2 Nr. 2 TDDDG; Art. 6 Abs. 1 lit. c DSGVO zum Nachweis der Entscheidung). Der Widerruf ist jederzeit über „Datenschutzeinstellungen“ möglich und gilt für die Zukunft. Bereits übermittelte Daten werden dadurch nicht gelöscht. Externe Links öffnen den jeweiligen Dienst erst beim Aufruf.",
      privacyCal: "Nach Freigabe verarbeitet Cal.com, Inc. IP-Adresse und Browserdaten, bei einer Buchung zusätzlich Kontakt- und Termindaten. Sicherheitscookies wie __cf_bm schützen vor Missbrauch. Cal.com verarbeitet Buchungsdaten im Auftrag und auch in den USA; laut Anbieter gelten dafür Standardvertragsklauseln oder ein Angemessenheitsmechanismus. Termine werden im verbundenen Google-Kalender verwaltet; bei Videoterminen kommt Google Meet hinzu.",
      calPrivacy: "Datenschutz bei Cal.com",
      googlePrivacy: "Datenschutz bei Google",
      privacyRetention: "Kontakt- und Termindaten dienen der Bearbeitung der Anfrage und der Organisation des Gesprächs (Art. 6 Abs. 1 lit. f DSGVO; bei vertragsbezogenen Anfragen lit. b). Sie werden so lange aufbewahrt, wie dies für diesen Zweck oder gesetzliche Pflichten erforderlich ist. Die Speicherdauer technischer Daten bei den Anbietern richtet sich nach deren verlinkten Angaben.",
      privacyRights: "Nach Maßgabe der DSGVO bestehen Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch, insbesondere gegen Verarbeitungen auf Grundlage berechtigter Interessen. Anfragen sind an die oben genannte E-Mail-Adresse möglich. Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde.",
      privacyAuthority: "Landesbeauftragter für den Datenschutz und die Informationsfreiheit Baden-Württemberg",

      contactTitle: 'Termin vereinbaren',
      contactLead: 'Per Video, am Telefon, in Balingen oder an einem Ort nach Wunsch. Jede Buchung ist zunächst ein Vorschlag; ich bestätige den Termin persönlich.',
      book: 'Termin vorschlagen', bookHint: ' – öffnet den Kalender in einem neuen Tab.',
      legalTitle: 'Impressum · Datenschutz',
      description: 'Robin James Lewis – Termin vereinbaren.',
      language: 'Sprache', replay: 'Rotkehlchen noch einmal anfliegen lassen', replayTitle: 'Noch einmal anfliegen lassen',
    },
    en: {
      consentTitle: "A calendar, a choice",
      consentText: "With permission, Cal.com loads external content for appointment booking and uses cookies, including protection against misuse. This involves processing IP addresses and browser data, including in the United States. This choice lasts for 180 days and can be changed at any time in Privacy settings.",
      consentAllow: "Allow appointment booking",
      consentDeny: "Continue without booking",
      consentSettings: "Privacy settings",
      consentClose: "Close",
      privacyDetails: "Legal notice & privacy",
      bookingNotice: "The embedded calendar is switched off. Appointments can still be arranged using the external link.",
      privacyIntro: "Robin James Lewis is responsible for this website; the postal and email addresses appear above. The website uses no visitor analytics of its own or advertising trackers. Fonts and images are served together with the website.",
      privacyHosting: "GitHub Pages hosts this website. GitHub, Inc. processes technical access data, including IP addresses, to deliver and secure it. The basis is Article 6(1)(f) GDPR: the interest in reliable and secure operation. Processing may take place in the United States. GitHub provides details of recipients, retention and transfer safeguards in its privacy statement.",
      githubPrivacy: "GitHub privacy statement",
      privacyChoice: "Permission for the embedded calendar is voluntary and based on section 25(1) TDDDG and Article 6(1)(a) GDPR. Cal.com is not loaded here without permission. The choice, timestamp, expiry and notice version are stored locally in the browser for 180 days without a personal identifier (section 25(2)(2) TDDDG; Article 6(1)(c) GDPR to record the decision). Permission can be withdrawn at any time in Privacy settings, with effect for the future. This does not delete data already transmitted. External links only open the respective service when followed.",
      privacyCal: "After permission, Cal.com, Inc. processes IP addresses and browser data, plus contact and appointment details when booking. Security cookies such as __cf_bm protect against misuse. Cal.com processes booking data on behalf of the host, including in the United States; it states that transfers use Standard Contractual Clauses or an adequacy mechanism. Appointments are managed in the connected Google Calendar; video appointments also use Google Meet.",
      calPrivacy: "Cal.com privacy policy",
      googlePrivacy: "Google privacy policy",
      privacyRetention: "Contact and appointment details are used to handle enquiries and organise conversations (Article 6(1)(f) GDPR; point (b) for contract-related enquiries). They are retained for as long as needed for these purposes or legal obligations. Providers describe retention of technical data in their linked policies.",
      privacyRights: "Subject to the GDPR, rights include access, rectification, erasure, restriction, data portability and objection, especially to processing based on legitimate interests. Requests can be sent to the email address above. There is also a right to complain to a data protection authority.",
      privacyAuthority: "Data protection authority for Baden-Württemberg",

      contactTitle: 'Arrange an appointment',
      contactLead: 'By video, by phone, in Balingen or at a place of your choosing. Every booking is a proposal at first; I confirm each appointment personally.',
      book: 'Suggest a time', bookHint: ' — opens the calendar in a new tab.',
      legalTitle: 'Legal notice · Privacy',
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
    document.querySelectorAll('[data-language]').forEach(link => {
      if (link.dataset.language === language) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
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
  window.addEventListener('popstate', () => apply(fromURL()));
  apply(language);
  document.querySelector('.language-nav').hidden = false;
})();
