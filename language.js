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

      navContact: 'Termin', navTools: 'Werkzeuge', navPages: 'Seiten', menuLabel: 'Menü', byline: 'Robin James Lewis · Balingen',
      navMessage: 'Nachricht', messageTitle: 'Nachricht schreiben',
      messageLead: 'Ich antworte persönlich per E-Mail.',
      fieldName: 'Name', fieldEmail: 'E-Mail-Adresse', fieldPhone: 'Telefon', optional: '(freiwillig)', fieldMessage: 'Nachricht',
      send: 'Senden', sending: 'Wird gesendet …', messageSent: 'Danke – Ihre Nachricht ist angekommen. Ich melde mich per E-Mail.',
      messageInvalid: 'Bitte Name, eine gültige E-Mail-Adresse und eine Nachricht angeben.',
      messageError: 'Das Senden hat nicht geklappt. Bitte schreiben Sie mir direkt per E-Mail an robin@robin.vision.',
      messageNote: 'Ihre Angaben gehen per E-Mail an mich und werden nur für die Antwort verwendet. Einzelheiten stehen unter Impressum · Datenschutz.',
      // Newsletter „Impulse“ und Werkzeug (15.10.2026)
      newsletterTitle: 'Impulse, Werkzeuge und Workshops per E-Mail', newsletterLead: 'Jeden Freitag der neue Impuls, kurz und mit Quellen, dazu Neues zu den Werkzeugen und Workshops. Jederzeit abbestellbar.',
      newsletterSend: 'Anmelden', newsletterSending: 'Wird gesendet …',
      newsletterNote: 'Nach dem Absenden kommt eine E-Mail mit einem Bestätigungslink; erst danach sind Sie angemeldet. Versand über Brevo, Abmeldung jederzeit über den Link in jeder Ausgabe. Einzelheiten unter Impressum · Datenschutz.',
      newsletterInvalid: 'Bitte eine gültige E-Mail-Adresse angeben.',
      newsletterError: 'Die Anmeldung hat nicht geklappt. Bitte versuchen Sie es später noch einmal.',
      newsletterConfirmed: 'Danke – die Anmeldung ist bestätigt. Der nächste Impuls kommt am Freitag.',
      toolsTitle: 'Werkzeuge', toolsAll: 'Alle Werkzeuge im Überblick und im Vergleich',
      toolsLead: 'Software und KI-Lösungen für Rechnungswesen, Verwaltung und weitere Geschäftsprozesse – vorgestellt und verglichen auf robin.vision.',
      privacyNewsletter: 'Newsletter: Er bringt die Impulse und Neues zu den Werkzeugen und Workshops (neue Fassungen, Beta-Zugänge, Termine). Bei der Anmeldung geht die E-Mail-Adresse über einen Cloudflare Worker (Cloudflare, Inc.) an den Versanddienst Brevo (Sendinblue SAS, Paris, Frankreich). Brevo schickt eine Bestätigungsmail; erst nach dem Klick auf den Link ist die Adresse angemeldet (Double-Opt-In). Gespeichert werden die Adresse, die Sprache sowie Zeitpunkt und IP-Adresse von Anmeldung und Bestätigung, damit die Einwilligung nachweisbar ist. Grundlage ist die Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie lässt sich jederzeit über den Abmeldelink in jeder Ausgabe oder per E-Mail widerrufen; danach wird die Adresse gelöscht oder, soweit sie zum Nachweis nötig ist, gesperrt. Öffnungen und Klicks werden nicht personenbezogen ausgewertet. Brevo verarbeitet die Daten in meinem Auftrag. Die Ausgaben mit den Impulsen erstellt Brevo aus dem Blog-Feed mit dem Dienst Integry (USA), den Brevo als Unterauftragsverarbeiter einsetzt. Eine Verarbeitung in den USA ist dabei möglich; laut Brevo gelten dafür Standardvertragsklauseln.',
      privacyTool: 'Werkzeug „Buchungsstapel-Generator“ (englisch „Booking Batch Generator“): Der Download ist ohne Anmeldung möglich. Das Werkzeug verarbeitet Kontoauszüge nur im Browser und überträgt sie nicht. Nur wenn Sie bei einem nicht erkannten Auszug ausdrücklich „Aufbau senden“ wählen, geht dessen Aufbau ohne Inhalt (Buchstaben als x, Ziffern als 9, freiwillig der Name der Bank) über einen Cloudflare Worker und den Versanddienst Resend (Resend, Inc., USA) per E-Mail an mich, damit ich das Layout nachrüsten kann (Art. 6 Abs. 1 lit. a DSGVO). Die IP-Adresse wird dabei technisch verarbeitet, aber nicht gespeichert; ein Tageszähler ohne Personenbezug begrenzt Missbrauch.',
      brevoPrivacy: 'Datenschutz bei Brevo',
      privacyContact: 'Kontaktformular: Name, E-Mail-Adresse, freiwillig Telefonnummer und der Nachrichtentext werden beim Absenden über einen Cloudflare Worker (Cloudflare, Inc.) und den Versanddienst Resend (Resend, Inc., USA) per E-Mail an mich zugestellt und ausschließlich zur Beantwortung verwendet (Art. 6 Abs. 1 lit. b und f DSGVO). Es werden keine Cookies gesetzt und keine Eingaben auf dem Server gespeichert; ein Tageszähler ohne Personenbezug begrenzt Missbrauch.',
      contactTitle: 'Termin vereinbaren',
      contactLead: 'Per Video, am Telefon, in Balingen oder an einem Ort nach Wunsch. Jede Buchung ist zunächst ein Vorschlag; ich bestätige den Termin persönlich.',
      book: 'Termin vorschlagen', bookHint: ' – öffnet den Kalender in einem neuen Tab.',
      legalTitle: 'Impressum · Datenschutz',
      legalMstv: 'Verantwortlich für die Inhalte nach § 18 Abs. 2 MStV: Robin James Lewis, Anschrift wie oben.',
      description: 'Werkzeuge für den Alltag in Rechnungswesen, Verwaltung und weiteren Geschäftsprozessen – darunter SmartFormular, FiBu lite kostenlos. Workshops mit Unterweisung nach EU AI Act für Unternehmen, Kanzleien und Organisationen. Jeden Freitag ein Impuls.',
      title: 'robin.vision – Werkzeuge und Workshops zur KI-Kompetenz',
      // Über der Falz und „Über mich“ (Robin, 16.10.2026)
      claim: 'Mitten in der Transformation: Werkzeuge für den Alltag in Rechnungswesen, Verwaltung und weiteren Geschäftsprozessen, und Workshops für Teams, die KI sicher nutzen wollen – mit Unterweisung nach EU AI Act.',
      ctaTool: 'Werkzeuge', ctaWorkshops: 'Workshops',
      aboutTitle: 'Über mich', aboutMore: 'Mehr über mich', navAbout: 'Über mich',
      // Workshops (Robin, 17.10.2026): KI-Workshop mit Unterweisung nach EU AI Act
      navWorkshops: 'Workshops', workshopsTitle: 'Workshops', workshopsMore: 'Zum Workshop mit Unterweisung nach EU AI Act',
      workshopsLead: 'KI-Kompetenz für Ihr Team, mit Unterweisung nach EU AI Act: ein Workshop, der Hemmschwellen überwindet, ein Online-Lehrgang, der Ihre Mitarbeitenden schult und weiterentwickelt, und ein Test mit Zertifikat. Für Kanzleien und Unternehmen, online oder vor Ort, auf Deutsch oder Englisch. Termine ab Januar 2027.',
      aboutText: 'Ich bin Robin James Lewis aus Balingen. Nach dreizehn Jahren im Handel und drei Jahren als Verwaltungsleiter eines Kulturzentrums werde ich Steuerfachangestellter, mit festem Mandantenkreis in Finanzbuchhaltung, Lohn und Jahresabschluss in einer Balinger Kanzlei. Nebenher digitalisiere ich Kanzleiprozesse und baue Werkzeuge für den Alltag außerhalb des perfekten Prozesses, mitten in der Realität der Transformation: für die Tage, an denen der Bankabruf ausfällt und trotzdem gebucht werden muss. Zuerst für mich, dann für alle, die dieselbe Arbeit tun.',
      language: 'Sprache', replay: 'Rotkehlchen noch einmal anfliegen lassen', replayTitle: 'Noch einmal anfliegen lassen',
      reloadTitle: 'Seite neu laden',
      // Goch, das Rotkehlchen von Robin (17.09.2026)
      gochOpen: 'Mit Goch sprechen, dem Rotkehlchen von Robin', gochOpenTitle: 'Mit Goch sprechen',
      gochName: 'Goch', gochRole: 'das Rotkehlchen von Robin', gochClose: 'Gespräch schließen',
      gochGreeting: 'Ich bin Goch, das Rotkehlchen von Robin. Fragen Sie mich etwas über ihn – oder richten Sie ihm etwas aus.',
      gochQ1: 'Woran arbeitet Robin gerade?', gochQ2: 'Wer ist Robin?', gochQ3: 'Ich möchte Robin etwas ausrichten.', gochQ4: 'Was gibt\'s Neues?',
      gochLabel: 'Ihre Nachricht an Goch', gochPlaceholder: 'Schreiben Sie Goch …', gochSend: 'Senden',
      gochConsentText: 'Goch antwortet mit einem Sprachmodell. Was Sie hier schreiben, geht an einen Cloudflare-Server und an das Modell, auch in die USA. Gespeichert wird nichts; die Entscheidung gilt 180 Tage. Einverstanden?',
      gochAllow: 'Gespräch erlauben', gochDeny: 'Lieber nicht',
      gochDeniedNote: 'Verstanden – dann bleibe ich still. Robin erreichen Sie per E-Mail: robin@robin.vision',
      gochWithdraw: 'Einwilligung widerrufen', gochReconsider: 'Entscheidung ändern',
      gochWithdrawn: 'Einwilligung zurückgenommen. Beim nächsten Wort frage ich neu.',
      gochError: 'Gerade antworte ich nicht. Robin erreichen Sie per E-Mail:',
      gochCalendar: 'Termin vorschlagen',
      gochNote: 'Goch antwortet automatisch aus einem Text, den Robin freigegeben hat; nichts wird gespeichert. Keine steuerliche oder rechtliche Auskunft.',
      privacyGoch: 'Gespräch mit Goch: Das Gespräch mit dem Rotkehlchen ist freiwillig und beginnt erst nach Zustimmung (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO); die Auswahl wird wie beim Kalender für 180 Tage lokal im Browser gespeichert und ist im Gespräch jederzeit widerrufbar. Eingegebene Texte und die IP-Adresse werden an einen Cloudflare Worker (Cloudflare, Inc.) übertragen und von dort an das Sprachmodell Claude von Anthropic, PBC (USA) weitergegeben, das die Antwort erzeugt; Anthropic verwendet API-Eingaben laut seinen Bedingungen nicht zum Training. Der Worker speichert keine Gespräche, nur einen Tageszähler ohne Personenbezug sowie Fragen, die Goch nicht beantworten konnte – ohne Bezug zur fragenden Person, für 30 Tage, damit Robin das Profil ergänzen kann. Eine Nachricht an Robin wird erst nach ausdrücklicher Bestätigung mit Name und E-Mail-Adresse über den Versanddienst Resend (Resend, Inc., USA) per E-Mail zugestellt – zusammen mit dem Gesprächsverlauf dieser Sitzung, damit Robin den Zusammenhang kennt – und wie Kontaktdaten behandelt. Feedback zu den Werkzeugen geht nach ausdrücklicher Bestätigung genauso per E-Mail an Robin, aber ohne Gesprächsverlauf und ohne Name und Adresse, sofern Sie sie nicht selbst nennen. Bietet Goch die Anmeldung zum Newsletter an, geht die Adresse aus dem Feld darunter direkt an die Anmeldung (siehe Newsletter), nicht an das Sprachmodell. Antworten des Sprachmodells sind automatisch erzeugt und keine verbindliche Auskunft.',
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

      navContact: 'Appointment', navTools: 'Tools', navPages: 'Pages', menuLabel: 'Menu', byline: 'Robin James Lewis · Balingen, Germany',
      navMessage: 'Message', messageTitle: 'Write a message',
      messageLead: 'I reply personally by email.',
      fieldName: 'Name', fieldEmail: 'Email address', fieldPhone: 'Phone', optional: '(optional)', fieldMessage: 'Message',
      send: 'Send', sending: 'Sending …', messageSent: 'Thank you – your message has arrived. I will get back to you by email.',
      messageInvalid: 'Please give your name, a valid email address and a message.',
      messageError: "Sending didn't work. Please email me directly at robin@robin.vision.",
      messageNote: 'Your details are sent to me by email and used only to reply. Details under Legal notice · Privacy.',
      // Newsletter "Food for Thought" and tools (15.10.2026)
      newsletterTitle: 'Food for Thought, tools and workshops by email', newsletterLead: 'The new post every Friday, short and with sources, plus news of the tools and workshops. Unsubscribe at any time.',
      newsletterSend: 'Subscribe', newsletterSending: 'Sending …',
      newsletterNote: 'After sending you will get an email with a confirmation link; you are subscribed only after confirming. Sent via Brevo; unsubscribe at any time via the link in every issue. Details under Legal notice · Privacy.',
      newsletterInvalid: 'Please enter a valid email address.',
      newsletterError: "Signing up didn't work. Please try again later.",
      newsletterConfirmed: 'Thank you – your subscription is confirmed. The next post arrives on Friday.',
      toolsTitle: 'Tools', toolsAll: 'All tools at a glance and compared',
      toolsLead: 'Software and AI solutions for accounting, administration and other business processes – presented and compared on robin.vision.',
      privacyNewsletter: 'Newsletter: it brings the Food for Thought posts and news of the tools and workshops (new versions, beta access, dates). When you subscribe, your email address is sent via a Cloudflare Worker (Cloudflare, Inc.) to the email service Brevo (Sendinblue SAS, Paris, France). Brevo sends a confirmation email; the address is subscribed only after the link has been clicked (double opt-in). The address, the language and the time and IP address of subscription and confirmation are stored so that consent can be proven. The legal basis is consent (Art. 6(1)(a) GDPR). It can be withdrawn at any time via the unsubscribe link in every issue or by email; the address is then deleted or, where needed as proof, blocked. Opens and clicks are not evaluated per person. Brevo processes the data on my behalf. Brevo creates the issues with the Food for Thought posts from the blog feed using the service Integry (USA), which Brevo engages as a sub-processor. Processing may take place in the United States; Brevo states that transfers use Standard Contractual Clauses.',
      privacyTool: 'Tool "Booking Batch Generator" (in German "Buchungsstapel-Generator"): the download requires no sign-up. The tool processes bank statements only in the browser and does not transmit them. Only if you explicitly choose "Send layout to robin.vision" for a statement it cannot read, that statement\'s layout without content (letters as x, digits as 9, optionally the name of the bank) is sent to me by email via a Cloudflare Worker and the delivery service Resend (Resend, Inc., USA), so that I can add the layout (Art. 6(1)(a) GDPR). The IP address is processed technically but not stored; a daily counter without personal reference limits misuse.',
      brevoPrivacy: 'Brevo privacy policy',
      privacyContact: 'Contact form: name, email address, optionally phone number and the message text are delivered to me by email when you submit, via a Cloudflare Worker (Cloudflare, Inc.) and the delivery service Resend (Resend, Inc., USA), and are used solely to reply (Art. 6(1)(b) and (f) GDPR). No cookies are set and no input is stored on the server; a daily counter without personal reference limits abuse.',
      contactTitle: 'Arrange an appointment',
      contactLead: 'By video, by phone, in Balingen or at a place of your choosing. Every booking is a proposal at first; I confirm each appointment personally.',
      book: 'Suggest a time', bookHint: ' — opens the calendar in a new tab.',
      legalTitle: 'Legal notice · Privacy',
      legalMstv: 'Responsible for content under § 18(2) MStV (German Interstate Media Treaty): Robin James Lewis, address as above.',
      description: 'Tools for everyday work in accounting, administration and other business processes – including SmartFormular, FiBu lite free. Workshops with EU AI Act training for companies, accounting firms and organisations. A new post every Friday.',
      title: 'robin.vision – Tools and AI literacy workshops',
      claim: 'In the middle of the transformation: tools for everyday work in accounting, administration and other business processes, and workshops for teams that want to use AI safely – with EU AI Act training.',
      ctaTool: 'Tools', ctaWorkshops: 'Workshops',
      aboutTitle: 'About me', aboutMore: 'More about me', navAbout: 'About',
      // Workshops (Robin, 17.10.2026): AI literacy workshop with EU AI Act training
      navWorkshops: 'Workshops', workshopsTitle: 'Workshops', workshopsMore: 'To the workshop with EU AI Act training',
      workshopsLead: 'AI literacy for your team, with EU AI Act training: a workshop that breaks down barriers, an online course that trains your staff and builds their skills, and a test with a certificate. For accounting firms and companies, online or on site, in German or English. Dates from January 2027.',
      aboutText: "I'm Robin James Lewis from Balingen, Germany. After thirteen years in retail and three years running the administration of a cultural centre, I am becoming a certified tax clerk, with my own set of clients in bookkeeping, payroll and annual accounts at a tax firm in Balingen. Alongside, I digitise the firm's processes and build tools for everyday work outside the perfect process, in the middle of the transformation: for the days when the bank feed fails and the books still have to be done. First for myself, then for everyone doing the same work.",
      language: 'Language', replay: 'Let the robin fly in again', replayTitle: 'Watch the robin fly in again',
      reloadTitle: 'Reload the page',
      // Goch, Robin's robin (17.09.2026)
      gochOpen: "Talk to Goch, Robin's robin", gochOpenTitle: 'Talk to Goch',
      gochName: 'Goch', gochRole: "Robin's robin", gochClose: 'Close the conversation',
      gochGreeting: "I'm Goch, Robin's robin – robin goch is Welsh for robin. Ask me about him, or leave him a message.",
      gochQ1: 'What is Robin working on?', gochQ2: 'Who is Robin?', gochQ3: "I'd like to leave Robin a message.", gochQ4: "What's new?",
      gochLabel: 'Your message to Goch', gochPlaceholder: 'Write to Goch …', gochSend: 'Send',
      gochConsentText: 'Goch answers with a language model. What you write here goes to a Cloudflare server and to the model, including in the United States. Nothing is stored; the choice lasts 180 days. Agreed?',
      gochAllow: 'Allow the conversation', gochDeny: 'Rather not',
      gochDeniedNote: "Understood – I'll stay quiet. You can reach Robin by email: robin@robin.vision",
      gochWithdraw: 'Withdraw permission', gochReconsider: 'Change decision',
      gochWithdrawn: "Permission withdrawn. I'll ask again before the next word.",
      gochError: "I can't answer right now. You can reach Robin by email:",
      gochCalendar: 'Suggest a time',
      gochNote: 'Goch answers automatically from a text Robin has approved; nothing is stored. No tax or legal advice.',
      privacyGoch: "Conversation with Goch: talking to the robin is voluntary and starts only after permission (section 25(1) TDDDG, Article 6(1)(a) GDPR); as with the calendar, the choice is stored locally in the browser for 180 days and can be withdrawn at any time within the conversation. Entered text and the IP address are sent to a Cloudflare Worker (Cloudflare, Inc.) and from there to the Claude language model of Anthropic, PBC (USA), which generates the answer; under its terms, Anthropic does not use API inputs for training. The Worker stores no conversations, only a daily counter without personal reference and questions Goch could not answer – without reference to the person asking, for 30 days, so that Robin can extend the profile. A message for Robin is delivered by email only after explicit confirmation with name and email address, via the delivery service Resend (Resend, Inc., USA) – together with the conversation of this session so that Robin has the context – and is treated like contact details. Feedback on the tools is likewise emailed to Robin after explicit confirmation, but without the conversation and without name and address unless you give them yourself. If Goch offers the newsletter, the address entered in the field below goes directly to the sign-up (see Newsletter), not to the language model. Answers from the language model are generated automatically and are not binding information.",
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
    document.title = t('title');
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
