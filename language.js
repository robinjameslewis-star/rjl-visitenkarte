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
      privacyIntro: "Verantwortlich für diese Website ist Robin James Lewis; Name, Anschrift und E-Mail-Adresse stehen oben. Die Website verwendet keine eigene Besuchermessung und keine Werbetracker. Schriften und Bilder werden zusammen mit der Website bereitgestellt.",
      privacyHosting: "GitHub Pages stellt die Website bereit. Dabei verarbeitet GitHub, Inc. technische Zugriffsdaten, insbesondere die IP-Adresse, zur Auslieferung und Absicherung der Seite. Grundlage ist Art. 6 Abs. 1 lit. f DSGVO: das Interesse an einem zuverlässigen und sicheren Betrieb. Eine Verarbeitung in den USA ist möglich. Einzelheiten zu Empfängern, Speicherdauer und Übermittlungsgrundlagen beschreibt GitHub.",
      githubPrivacy: "Datenschutz bei GitHub",
      privacyChoice: "Die freiwillige Freigabe des eingebetteten Kalenders beruht auf § 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO. Ohne Zustimmung wird Cal.com hier nicht geladen. Die Auswahl mit Zeitpunkt, Ablaufdatum und Textversion wird für 180 Tage lokal im Browser gespeichert, ohne persönliche Kennung (§ 25 Abs. 2 Nr. 2 TDDDG; Art. 6 Abs. 1 lit. c DSGVO zum Nachweis der Entscheidung). Der Widerruf ist jederzeit über „Datenschutzeinstellungen“ möglich und gilt für die Zukunft. Bereits übermittelte Daten werden dadurch nicht gelöscht. Externe Links öffnen den jeweiligen Dienst erst beim Aufruf.",
      privacyCal: "Nach Freigabe verarbeitet Cal.com, Inc. IP-Adresse und Browserdaten, bei einer Buchung zusätzlich Kontakt- und Termindaten. Sicherheitscookies wie __cf_bm schützen vor Missbrauch. Cal.com verarbeitet Buchungsdaten im Auftrag und auch in den USA; laut Anbieter gelten dafür Standardvertragsklauseln oder ein Angemessenheitsmechanismus. Termine werden im verbundenen Google-Kalender verwaltet; bei Videoterminen kommt Google Meet hinzu.",
      calPrivacy: "Datenschutz bei Cal.com",
      googlePrivacy: "Datenschutz bei Google",
      privacyRetention: "Kontakt- und Termindaten dienen der Bearbeitung der Anfrage und der Organisation des Gesprächs (Art. 6 Abs. 1 lit. f DSGVO; bei vertragsbezogenen Anfragen lit. b). Sie werden so lange aufbewahrt, wie dies für diesen Zweck oder gesetzliche Pflichten erforderlich ist. Die Speicherdauer technischer Daten bei den Anbietern richtet sich nach deren verlinkten Angaben.",
      privacyRights: "Nach Maßgabe der DSGVO bestehen Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch, insbesondere gegen Verarbeitungen auf Grundlage berechtigter Interessen. Anfragen sind an die oben genannte E-Mail-Adresse möglich. Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde.",
      privacyAuthority: "Landesbeauftragter für den Datenschutz und die Informationsfreiheit Baden-Württemberg",

      navContact: 'Termin',
      navMessage: 'Nachricht', messageTitle: 'Nachricht schreiben',
      messageLead: 'Ich antworte persönlich per E-Mail.',
      fieldName: 'Name', fieldEmail: 'E-Mail-Adresse', fieldPhone: 'Telefon', optional: '(freiwillig)', fieldMessage: 'Nachricht',
      send: 'Senden', sending: 'Wird gesendet …', messageSent: 'Danke – deine Nachricht ist angekommen. Ich melde mich per E-Mail.',
      messageInvalid: 'Bitte Name, eine gültige E-Mail-Adresse und eine Nachricht angeben.',
      messageError: 'Das Senden hat nicht geklappt. Bitte schreib mir direkt per E-Mail an robinjameslewis@googlemail.com.',
      messageNote: 'Deine Angaben gehen per E-Mail an mich und werden nur für die Antwort verwendet. Einzelheiten stehen unter Impressum · Datenschutz.',
      privacyContact: 'Kontaktformular: Name, E-Mail-Adresse, freiwillig Telefonnummer und der Nachrichtentext werden beim Absenden über einen Cloudflare Worker (Cloudflare, Inc.) und den Versanddienst Resend (Resend, Inc., USA) per E-Mail an mich zugestellt und ausschließlich zur Beantwortung verwendet (Art. 6 Abs. 1 lit. b und f DSGVO). Es werden keine Cookies gesetzt und keine Eingaben auf dem Server gespeichert; ein Tageszähler ohne Personenbezug begrenzt Missbrauch.',
      contactTitle: 'Termin vereinbaren',
      contactLead: 'Per Video, am Telefon, in Balingen oder an einem Ort nach Wunsch. Jede Buchung ist zunächst ein Vorschlag; ich bestätige den Termin persönlich.',
      book: 'Termin vorschlagen', bookHint: ' – öffnet den Kalender in einem neuen Tab.',
      legalTitle: 'Impressum · Datenschutz',
      legalMstv: 'Verantwortlich für die Inhalte nach § 18 Abs. 2 MStV: Robin James Lewis, Anschrift wie oben.',
      description: 'Robin James Lewis – Termin vereinbaren.',
      language: 'Sprache', replay: 'Rotkehlchen noch einmal anfliegen lassen', replayTitle: 'Noch einmal anfliegen lassen',
      reloadTitle: 'Seite neu laden',
      // Goch, das Rotkehlchen von Robin (17.09.2026)
      gochOpen: 'Mit Goch sprechen, dem Rotkehlchen von Robin', gochOpenTitle: 'Mit Goch sprechen',
      gochName: 'Goch', gochRole: 'das Rotkehlchen von Robin', gochClose: 'Gespräch schließen',
      gochGreeting: 'Ich bin Goch, das Rotkehlchen von Robin. Frag mich etwas über ihn – oder richte ihm etwas aus.',
      gochQ1: 'Woran arbeitet Robin gerade?', gochQ2: 'Wer ist Robin?', gochQ3: 'Ich möchte Robin etwas ausrichten.',
      gochLabel: 'Deine Nachricht an Goch', gochPlaceholder: 'Schreib Goch …', gochSend: 'Senden',
      gochConsentText: 'Goch antwortet mit einem Sprachmodell. Was du hier schreibst, geht an einen Cloudflare-Server und an das Modell, auch in die USA. Gespeichert wird nichts; die Entscheidung gilt 180 Tage. Einverstanden?',
      gochAllow: 'Gespräch erlauben', gochDeny: 'Lieber nicht',
      gochDeniedNote: 'Verstanden – dann bleibe ich still. Robin erreichst du per E-Mail: robinjameslewis@googlemail.com',
      gochWithdraw: 'Einwilligung widerrufen', gochReconsider: 'Entscheidung ändern',
      gochWithdrawn: 'Einwilligung zurückgenommen. Beim nächsten Wort frage ich neu.',
      gochError: 'Gerade antworte ich nicht. Robin erreichst du per E-Mail:',
      gochCalendar: 'Termin vorschlagen',
      gochNote: 'Goch antwortet automatisch aus einem Text, den Robin freigegeben hat; nichts wird gespeichert. Keine steuerliche oder rechtliche Auskunft.',
      privacyGoch: 'Gespräch mit Goch: Das Gespräch mit dem Rotkehlchen ist freiwillig und beginnt erst nach Zustimmung (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO); die Auswahl wird wie beim Kalender für 180 Tage lokal im Browser gespeichert und ist im Gespräch jederzeit widerrufbar. Eingegebene Texte und die IP-Adresse werden an einen Cloudflare Worker (Cloudflare, Inc.) übertragen und von dort an das Sprachmodell Claude von Anthropic, PBC (USA) weitergegeben, das die Antwort erzeugt; Anthropic verwendet API-Eingaben laut seinen Bedingungen nicht zum Training. Der Worker speichert keine Gespräche, nur einen Tageszähler ohne Personenbezug sowie Fragen, die Goch nicht beantworten konnte – ohne Bezug zur fragenden Person, für 30 Tage, damit Robin das Profil ergänzen kann. Eine Nachricht an Robin wird erst nach ausdrücklicher Bestätigung mit Name und E-Mail-Adresse über den Versanddienst Resend (Resend, Inc., USA) per E-Mail zugestellt – zusammen mit dem Gesprächsverlauf dieser Sitzung, damit Robin den Zusammenhang kennt – und wie Kontaktdaten behandelt. Antworten des Sprachmodells sind automatisch erzeugt und keine verbindliche Auskunft.',
      privacyYoutube: 'Eingebettete Videos von YouTube (Google Ireland Ltd.) werden erst geladen, wenn Sie auf den Platzhalter klicken (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Dabei verarbeitet Google Ihre IP-Adresse und Browserdaten, auch in den USA; es wird die Variante ohne Cookies zur Wiedergabeverfolgung („youtube-nocookie“) verwendet. Ohne Klick wird keine Verbindung zu YouTube aufgebaut.',
      cloudflarePrivacy: 'Datenschutz bei Cloudflare', anthropicPrivacy: 'Datenschutz bei Anthropic', resendPrivacy: 'Datenschutz bei Resend',
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
      privacyIntro: "Robin James Lewis is responsible for this website; name, postal address and email address appear above. The website uses no visitor analytics of its own or advertising trackers. Fonts and images are served together with the website.",
      privacyHosting: "GitHub Pages hosts this website. GitHub, Inc. processes technical access data, including IP addresses, to deliver and secure it. The basis is Article 6(1)(f) GDPR: the interest in reliable and secure operation. Processing may take place in the United States. GitHub provides details of recipients, retention and transfer safeguards in its privacy statement.",
      githubPrivacy: "GitHub privacy statement",
      privacyChoice: "Permission for the embedded calendar is voluntary and based on section 25(1) TDDDG and Article 6(1)(a) GDPR. Cal.com is not loaded here without permission. The choice, timestamp, expiry and notice version are stored locally in the browser for 180 days without a personal identifier (section 25(2)(2) TDDDG; Article 6(1)(c) GDPR to record the decision). Permission can be withdrawn at any time in Privacy settings, with effect for the future. This does not delete data already transmitted. External links only open the respective service when followed.",
      privacyCal: "After permission, Cal.com, Inc. processes IP addresses and browser data, plus contact and appointment details when booking. Security cookies such as __cf_bm protect against misuse. Cal.com processes booking data on behalf of the host, including in the United States; it states that transfers use Standard Contractual Clauses or an adequacy mechanism. Appointments are managed in the connected Google Calendar; video appointments also use Google Meet.",
      calPrivacy: "Cal.com privacy policy",
      googlePrivacy: "Google privacy policy",
      privacyRetention: "Contact and appointment details are used to handle enquiries and organise conversations (Article 6(1)(f) GDPR; point (b) for contract-related enquiries). They are retained for as long as needed for these purposes or legal obligations. Providers describe retention of technical data in their linked policies.",
      privacyRights: "Subject to the GDPR, rights include access, rectification, erasure, restriction, data portability and objection, especially to processing based on legitimate interests. Requests can be sent to the email address above. There is also a right to complain to a data protection authority.",
      privacyAuthority: "Data protection authority for Baden-Württemberg",

      navContact: 'Appointment',
      navMessage: 'Message', messageTitle: 'Write a message',
      messageLead: 'I reply personally by email.',
      fieldName: 'Name', fieldEmail: 'Email address', fieldPhone: 'Phone', optional: '(optional)', fieldMessage: 'Message',
      send: 'Send', sending: 'Sending …', messageSent: 'Thank you – your message has arrived. I will get back to you by email.',
      messageInvalid: 'Please give your name, a valid email address and a message.',
      messageError: "Sending didn't work. Please email me directly at robinjameslewis@googlemail.com.",
      messageNote: 'Your details are sent to me by email and used only to reply. Details under Legal notice · Privacy.',
      privacyContact: 'Contact form: name, email address, optionally phone number and the message text are delivered to me by email when you submit, via a Cloudflare Worker (Cloudflare, Inc.) and the delivery service Resend (Resend, Inc., USA), and are used solely to reply (Art. 6(1)(b) and (f) GDPR). No cookies are set and no input is stored on the server; a daily counter without personal reference limits abuse.',
      contactTitle: 'Arrange an appointment',
      contactLead: 'By video, by phone, in Balingen or at a place of your choosing. Every booking is a proposal at first; I confirm each appointment personally.',
      book: 'Suggest a time', bookHint: ' — opens the calendar in a new tab.',
      legalTitle: 'Legal notice · Privacy',
      legalMstv: 'Responsible for content under § 18(2) MStV (German Interstate Media Treaty): Robin James Lewis, address as above.',
      description: 'Robin James Lewis — arrange an appointment.',
      language: 'Language', replay: 'Let the robin fly in again', replayTitle: 'Watch the robin fly in again',
      reloadTitle: 'Reload the page',
      // Goch, Robin's robin (17.09.2026)
      gochOpen: "Talk to Goch, Robin's robin", gochOpenTitle: 'Talk to Goch',
      gochName: 'Goch', gochRole: "Robin's robin", gochClose: 'Close the conversation',
      gochGreeting: "I'm Goch, Robin's robin – robin goch is Welsh for robin. Ask me about him, or leave him a message.",
      gochQ1: 'What is Robin working on?', gochQ2: 'Who is Robin?', gochQ3: "I'd like to leave Robin a message.",
      gochLabel: 'Your message to Goch', gochPlaceholder: 'Write to Goch …', gochSend: 'Send',
      gochConsentText: 'Goch answers with a language model. What you write here goes to a Cloudflare server and to the model, including in the United States. Nothing is stored; the choice lasts 180 days. Agreed?',
      gochAllow: 'Allow the conversation', gochDeny: 'Rather not',
      gochDeniedNote: "Understood – I'll stay quiet. You can reach Robin by email: robinjameslewis@googlemail.com",
      gochWithdraw: 'Withdraw permission', gochReconsider: 'Change decision',
      gochWithdrawn: "Permission withdrawn. I'll ask again before the next word.",
      gochError: "I can't answer right now. You can reach Robin by email:",
      gochCalendar: 'Suggest a time',
      gochNote: 'Goch answers automatically from a text Robin has approved; nothing is stored. No tax or legal advice.',
      privacyGoch: "Conversation with Goch: talking to the robin is voluntary and starts only after permission (section 25(1) TDDDG, Article 6(1)(a) GDPR); as with the calendar, the choice is stored locally in the browser for 180 days and can be withdrawn at any time within the conversation. Entered text and the IP address are sent to a Cloudflare Worker (Cloudflare, Inc.) and from there to the Claude language model of Anthropic, PBC (USA), which generates the answer; under its terms, Anthropic does not use API inputs for training. The Worker stores no conversations, only a daily counter without personal reference and questions Goch could not answer – without reference to the person asking, for 30 days, so that Robin can extend the profile. A message for Robin is delivered by email only after explicit confirmation with name and email address, via the delivery service Resend (Resend, Inc., USA) – together with the conversation of this session so that Robin has the context – and is treated like contact details. Answers from the language model are generated automatically and are not binding information.",
      privacyYoutube: 'Embedded YouTube videos (Google Ireland Ltd.) are loaded only when you click the placeholder (Section 25(1) TDDDG, Art. 6(1)(a) GDPR). Google then processes your IP address and browser data, including in the USA; the variant without playback-tracking cookies (“youtube-nocookie”) is used. Without a click, no connection to YouTube is made.',
      cloudflarePrivacy: 'Cloudflare privacy policy', anthropicPrivacy: 'Anthropic privacy policy', resendPrivacy: 'Resend privacy policy',
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
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
      element.setAttribute('aria-label', t(element.dataset.i18nAria));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-title-de]').forEach(element => { // von der Redaktion gesetzte Verweise
      element.textContent = element.dataset['title' + (language === 'en' ? 'En' : 'De')] || element.dataset.titleDe;
    });
    // Blog: jede Sprache nur ihre eigenen Beiträge; Abschnitt und Menüpunkt nur, wenn es Beiträge in dieser Sprache gibt
    document.querySelectorAll('.blog-teaser li[lang]').forEach(item => { item.hidden = item.lang !== language; });
    document.querySelectorAll('[data-langs]').forEach(element => { element.hidden = !element.dataset.langs.split(' ').includes(language); });
    document.querySelectorAll('[data-href-de]').forEach(link => { link.href = link.dataset['href' + (language === 'en' ? 'En' : 'De')] || link.dataset.hrefDe; });
    document.querySelector('.language-nav').setAttribute('aria-label', t('language'));
    document.querySelectorAll('[data-language]').forEach(link => {
      if (link.dataset.language === language) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const scene = document.getElementById('scene');
    const chat = scene.dataset.chat === 'on'; // goch.js: Klick öffnet das Gespräch statt des Anflugs
    scene.setAttribute('aria-label', t(chat ? 'gochOpen' : 'replay'));
    scene.title = t(chat ? 'gochOpenTitle' : 'replayTitle');
    const nameLink = document.getElementById('name-link');
    nameLink.title = t('reloadTitle');
    nameLink.href = '?lang=' + language; // ohne Skript führt der Link auf ./
    document.querySelector('meta[name="description"]').content = t('description');
    if (updateURL && changed) {
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      history.pushState(null, '', url);
    }
    if (changed) window.dispatchEvent(new CustomEvent('site-languagechange', { detail: { language } }));
  }

  window.SiteLanguage = { t, get current() { return language; }, refresh: () => apply(language) };
  window.addEventListener('popstate', () => apply(fromURL()));
  apply(language);
  document.querySelector('.language-nav').hidden = false;
})();
