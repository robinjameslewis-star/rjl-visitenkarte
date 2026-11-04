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

      navContact: 'Termin', navTools: 'Werkzeuge', navPages: 'Seiten', menuLabel: 'Menü',
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
      toolsLead: 'Software und KI-Lösungen für Rechnungswesen, Verwaltung und andere Geschäftsprozesse – vorgestellt und verglichen auf robin.vision.',
      privacyNewsletter: 'Newsletter: Er bringt die Impulse und Neues zu den Werkzeugen und Workshops (neue Fassungen, Beta-Zugänge, Termine). Bei der Anmeldung geht die E-Mail-Adresse über einen Cloudflare Worker (Cloudflare, Inc.) an den Versanddienst Brevo (Sendinblue SAS, Paris, Frankreich). Brevo schickt eine Bestätigungsmail; erst nach dem Klick auf den Link ist die Adresse angemeldet (Double-Opt-In). Gespeichert werden die Adresse, die Sprache sowie Zeitpunkt und IP-Adresse von Anmeldung und Bestätigung, damit die Einwilligung nachweisbar ist. Grundlage ist die Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie lässt sich jederzeit über den Abmeldelink in jeder Ausgabe oder per E-Mail widerrufen; danach wird die Adresse gelöscht oder, soweit sie zum Nachweis nötig ist, gesperrt. Öffnungen und Klicks werden nicht personenbezogen ausgewertet. Brevo verarbeitet die Daten in meinem Auftrag. Die Ausgaben mit den Impulsen erstellt Brevo aus dem Blog-Feed mit dem Dienst Integry (USA), den Brevo als Unterauftragsverarbeiter einsetzt. Eine Verarbeitung in den USA ist dabei möglich; laut Brevo gelten dafür Standardvertragsklauseln.',
      privacyTool: 'Werkzeug „Buchungsstapel-Generator“ (englisch „Booking Batch Generator“): Der Download ist ohne Anmeldung möglich. Das Werkzeug verarbeitet Kontoauszüge nur im Browser und überträgt sie nicht. Nur wenn Sie bei einem nicht erkannten Auszug ausdrücklich „Aufbau senden“ wählen, geht dessen Aufbau ohne Inhalt (Buchstaben als x, Ziffern als 9, freiwillig der Name der Bank) über einen Cloudflare Worker und den Versanddienst Resend (Resend, Inc., USA) per E-Mail an mich, damit ich das Layout nachrüsten kann (Art. 6 Abs. 1 lit. a DSGVO). Die IP-Adresse wird dabei technisch verarbeitet, aber nicht gespeichert; ein Tageszähler ohne Personenbezug begrenzt Missbrauch.',
      brevoPrivacy: 'Datenschutz bei Brevo',
      privacyContact: 'Kontaktformular: Name, E-Mail-Adresse, freiwillig Telefonnummer und der Nachrichtentext werden beim Absenden über einen Cloudflare Worker (Cloudflare, Inc.) und den Versanddienst Resend (Resend, Inc., USA) per E-Mail an mich zugestellt und ausschließlich zur Beantwortung verwendet (Art. 6 Abs. 1 lit. b und f DSGVO). Es werden keine Cookies gesetzt und keine Eingaben auf dem Server gespeichert; ein Tageszähler ohne Personenbezug begrenzt Missbrauch.',
      contactTitle: 'Termin vereinbaren',
      contactLead: 'Ein unverbindliches Gespräch über einen Workshop für Ihr Team oder eine Partnerschaft bei den Werkzeugen. Per Video, am Telefon, in Balingen oder an einem Ort nach Wunsch. Jede Buchung ist zunächst ein Vorschlag; ich bestätige den Termin persönlich.',
      book: 'Termin vorschlagen', bookHint: ' – öffnet den Kalender in einem neuen Tab.',
      legalTitle: 'Impressum · Datenschutz',
      legalMstv: 'Verantwortlich für die Inhalte nach § 18 Abs. 2 MStV: Robin James Lewis, Anschrift wie oben.',
      legalAds: 'Anzeigen: Werkzeuge mit dem Kennzeichen „Anzeige“ stellt robin.vision zu Werbezwecken vor. Anbieter ist robin.vision selbst, ein Unternehmen, an dem Robin James Lewis beteiligt ist, oder ein anderes Unternehmen, das robin.vision für die Vorstellung vergütet (Gebühr oder Provision aus vermittelten Umsätzen). Der Anbieter steht jeweils neben dem Kennzeichen; Verträge über ein Werkzeug schließen Sie mit dem Anbieter.',
      description: 'Werkzeuge fürs Rechnungswesen, kostenlos testen bis 31.12.2026: E-Rechnungen prüfen und bezahlen, Kontoauszüge zu Buchungsstapeln. Workshops zur KI-Kompetenz mit Unterweisung nach EU AI Act. Jeden Freitag ein Impuls.',
      title: 'robin.vision – Werkzeuge und Workshops zur KI-Kompetenz',
      // Über der Falz und „Über mich“ (Robin, 16.10.2026)
      slogan: 'Prozesse effizient gestalten', claim: 'Werkzeuge und Workshops für Unternehmen und Kanzleien.',
      ctaTool: 'Werkzeuge ausprobieren', ctaWorkshops: 'Workshop für Ihr Team', ctaWorkshopsZusatz: 'mit Unterweisung nach EU AI Act',
      aboutTitle: 'Über mich', aboutMore: 'Mehr über mich', navAbout: 'Über mich',
      // Workshops (Robin, 17.10.2026): KI-Workshop mit Unterweisung nach EU AI Act
      navWorkshops: 'Workshops', workshopsTitle: 'Workshops', workshopsMore: 'Mehr zum Workshop', workshopsAnfrage: 'Workshop anfragen',
      workshopsLead: 'KI-Kompetenz für Ihr Team, mit Unterweisung nach EU AI Act. Für Kanzleien und Unternehmen, online oder vor Ort, auf Deutsch oder Englisch. Termine ab Januar 2027; Anfragen sind schon möglich.',
      // Startseite nach Option B (Robin, 23.10.2026): Workshops ausführlicher, Hinweis für Anbieter weiter unten
      workshopsTeil1Titel: 'Workshop:', workshopsTeil1: '90 Minuten online oder ein halber Tag vor Ort – Hemmschwellen abbauen, Anwendungsfälle aus Ihrem Alltag.',
      workshopsTeil2Titel: 'Online-Lehrgang:', workshopsTeil2: 'sieben Lektionen, etwa 70 Minuten, mit Praxisaufgaben am eigenen Arbeitsplatz.',
      workshopsTeil3Titel: 'Test und Zertifikat:', workshopsTeil3: 'je Person, online prüfbar, als Nachweis Ihrer Maßnahme nach Art. 4 KI-Verordnung.',
      workshopsLeitung: 'Ich leite die Workshops selbst – aus der Praxis einer Steuerkanzlei und mit Ausbildereignung (IHK).',
      anbieterTitle: 'Für Anbieter', anbieterKnopf: 'Partner werden',
      anbieterText: 'Sie entwickeln Software oder KI-Lösungen für Rechnungswesen, Verwaltung oder andere Geschäftsprozesse? Stellen Sie sie auf robin.vision vor.',
      aboutText: 'Ich bin Robin James Lewis aus Balingen. Nach dreizehn Jahren im Handel und drei Jahren als Verwaltungsleiter eines Kulturzentrums werde ich Steuerfachangestellter, mit festem Mandantenkreis in Finanzbuchhaltung, Lohn und Jahresabschluss in einer Balinger Kanzlei. Aus der operativen Arbeit und der Einarbeitung neuer Mitarbeitender in Verwaltung und Rechnungswesen verschiedener Branchen kenne ich die Stellen, an denen Daten doppelt erfasst werden und sich Abläufe vereinfachen oder automatisieren lassen. Daraus entwickle ich Werkzeuge, die sich in den Arbeitsalltag einfügen – und gebe dieses Wissen in Workshops weiter.',
      language: 'Sprache', replay: 'Rotkehlchen noch einmal anfliegen lassen', replayTitle: 'Noch einmal anfliegen lassen',
      reloadTitle: 'Seite neu laden',
      // Goch, das Rotkehlchen von Robin (17.09.2026)
      gochOpen: 'Mit Goch sprechen, dem Rotkehlchen von Robin', gochOpenTitle: 'Mit Goch sprechen',
      gochName: 'Goch', gochRole: 'das Rotkehlchen von Robin', gochClose: 'Gespräch schließen',
      gochGreeting: 'Ich bin Goch, das Rotkehlchen von Robin. Fragen Sie mich etwas über ihn – oder richten Sie ihm etwas aus.',
      gochQ1: 'Woran arbeitet Robin gerade?', gochQ2: 'Wer ist Robin?', gochQ3: 'Ich möchte Robin etwas ausrichten.', gochQ4: 'Was gibt\'s Neues?',
      gochLabel: 'Ihre Nachricht an Goch', gochPlaceholder: 'Schreiben Sie Goch …', gochSend: 'Senden',
      gochConsentText: 'Goch antwortet mit einem Sprachmodell. Was Sie hier schreiben, geht an einen Cloudflare-Server und an das Modell, auch in die USA. Gespräche werden nicht gespeichert; nur Fragen, die Goch nicht beantworten konnte, 30 Tage ohne Bezug zu Ihnen. Die Entscheidung gilt 180 Tage. Einverstanden?',
      gochAllow: 'Gespräch erlauben', gochDeny: 'Lieber nicht',
      gochDeniedNote: 'Verstanden – dann bleibe ich still. Robin erreichen Sie per E-Mail: robin@robin.vision',
      gochWithdraw: 'Einwilligung widerrufen', gochReconsider: 'Entscheidung ändern',
      gochWithdrawn: 'Einwilligung zurückgenommen. Beim nächsten Wort frage ich neu.',
      gochError: 'Gerade antworte ich nicht. Robin erreichen Sie per E-Mail:',
      gochCalendar: 'Termin vorschlagen',
      gochNote: 'Goch antwortet automatisch aus einem Text, den Robin freigegeben hat; Gespräche werden nicht gespeichert. Keine steuerliche oder rechtliche Auskunft.',
      // Sprechender Goch (23.10.2026): Schalter, eigene Einwilligung, Mikrofon, Hinweis KI
      gochMikroAn: 'Mit Goch sprechen', gochLaut: 'Goch spricht laut', gochStummAus: 'Zwitschern aus', gochStummAn: 'Zwitschern an', gochKi: 'KI · künstliche Stimme',
      gochStimmeConsentText: 'Sprechen mit Goch: Solange „Mit Goch sprechen“ an ist, ist Ihr Mikrofon offen; nur gesprochene Abschnitte gehen an Cloudflare (auch USA) und werden in Text umgewandelt, gespeichert wird nichts. Nach einer Minute Stille geht es aus. Gochs Antworten spricht eine künstliche Stimme von ElevenLabs (USA), die nur seinen Antworttext erhält. Gilt nur für diesen Besuch, jederzeit beendbar. Einverstanden?',
      gochStimmeAllow: 'Sprechen erlauben', gochStimmeDenied: 'In Ordnung – dann bleibt es beim Schreiben.',
      gochStimmeEnde: 'Sprechen beenden', gochStimmeBeendet: 'Sprechen beendet. Mikrofon und Stimme sind aus.',
      gochNurChat: 'Sprechen geht gerade nicht – ein Gespräch ist im Moment nur hier im Chat möglich. Schreiben Sie mir gern.',
      gochZurSeite: 'Seite ansehen', gochMini: 'Zurück zu Goch',
      gochBlickAn: 'Blickkontakt', gochKameraAllow: 'Kamera erlauben', gochKameraTitel: 'Kamera-Vorschau für den Blickkontakt',
      gochKameraConsentText: 'Blickkontakt mit Goch: Ihre Kamera bleibt auf diesem Gerät. Goch erkennt nur, ob ein Gesicht da ist, wo es ist und ob es zu ihm schaut – kein Bild verlässt das Gerät, nichts wird gespeichert, keine Mimik, keine Gefühle, keine Wiedererkennung. Kommt jemand an den Bildschirm, zwitschert Goch und spricht ihn an. Gilt nur für diesen Besuch. Einverstanden?',
      gochBlickDenied: 'In Ordnung – Goch bleibt ohne Kamera.', gochBlickFehler: 'Blickkontakt geht auf diesem Gerät gerade nicht.',
      gochBlickAnsehen: 'Schauen Sie Goch an, wenn Sie mit ihm sprechen – dann hört er zu.',
      gochZiel_werkzeuge: 'Werkzeuge ansehen', gochZiel_workshops: 'Workshops ansehen', gochZiel_ueber_mich: 'Über Robin', gochZiel_blog: 'Impulse lesen',
      gochZiel_newsletter: 'Zum Newsletter', gochZiel_nachricht: 'Robin schreiben', gochZiel_grundsaetze: 'Grundsätze ansehen',
      gochMikroKnopf: 'Weiter zuhören', gochKnopfPause: 'Pause', gochKnopfWeiter: 'Weiter zuhören', gochKnopfFertig: 'Fertig',
      gochMikroHinweis: 'Sprechen Sie einfach – Goch antwortet, sobald Sie kurz innehalten.', gochZuhoeren: 'Goch hört zu …',
      gochMikroHoert: 'Ich höre … (eine kurze Pause genügt, noch {s} s)', gochMikroErkennen: 'Ich verstehe …',
      gochZuhoerenPause: 'Zuhören pausiert – das Mikrofon ist aus.', gochZuhoerenSchlaeft: 'Eine Minute Stille – das Mikrofon ist aus. „Weiter zuhören“ öffnet es wieder.',
      gochMikroNichts: 'Ich habe nichts verstanden – sagen Sie es gern noch einmal oder tippen Sie.',
      gochMikroFehler: 'Gerade verstehe ich Sie nicht. Bitte tippen Sie Ihre Frage.', gochMikroGrenze: 'Bitte tippen Sie Ihre Frage.',
      gochMikroVerweigert: 'Dafür braucht es das Mikrofon – Sie können es im Browser freigeben oder einfach tippen.',
      gochMikroAusgeschaltet: 'Die Spracheingabe ist gerade ausgeschaltet. Bitte tippen Sie.',
      privacyGoch: 'Gespräch mit Goch: Das Gespräch mit dem Rotkehlchen ist freiwillig und beginnt erst nach Zustimmung (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO); die Auswahl wird wie beim Kalender für 180 Tage lokal im Browser gespeichert und ist im Gespräch jederzeit widerrufbar. Eingegebene Texte und die IP-Adresse werden an einen Cloudflare Worker (Cloudflare, Inc.) übertragen und von dort an das Sprachmodell Claude von Anthropic, PBC (USA) weitergegeben, das die Antwort erzeugt; Anthropic verwendet API-Eingaben laut seinen Bedingungen nicht zum Training. Der Worker speichert keine Gespräche, nur einen Tageszähler ohne Personenbezug sowie Fragen, die Goch nicht beantworten konnte – ohne Bezug zur fragenden Person, für 30 Tage, damit Robin das Profil ergänzen kann. Eine Nachricht an Robin wird erst nach ausdrücklicher Bestätigung über den Versanddienst Resend (Resend, Inc., USA) per E-Mail zugestellt – nur der bestätigte Text, ohne Gesprächsverlauf, mit Name und E-Mail-Adresse nur, wenn Sie sie selbst nennen – und wie Kontaktdaten behandelt. Feedback zu den Werkzeugen geht nach ausdrücklicher Bestätigung genauso per E-Mail an Robin, aber ohne Gesprächsverlauf und ohne Name und Adresse, sofern Sie sie nicht selbst nennen. Bietet Goch die Anmeldung zum Newsletter an, geht die Adresse aus dem Feld darunter direkt an die Anmeldung (siehe Newsletter), nicht an das Sprachmodell. Antworten des Sprachmodells sind automatisch erzeugt und keine verbindliche Auskunft.',
      privacyYoutube: 'Eingebettete Videos von YouTube (Google Ireland Ltd.) werden erst geladen, wenn Sie auf den Platzhalter klicken (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Dabei verarbeitet Google Ihre IP-Adresse und Browserdaten, auch in den USA; es wird die Variante ohne Cookies zur Wiedergabeverfolgung („youtube-nocookie“) verwendet. Ohne Klick wird keine Verbindung zu YouTube aufgebaut.',
      cloudflarePrivacy: 'Datenschutz bei Cloudflare', anthropicPrivacy: 'Datenschutz bei Anthropic', resendPrivacy: 'Datenschutz bei Resend',
      // Von Robin am 24.10.2026 freigegeben (übermittelt über die Release-Sitzung); sichtbar erst, wenn die Funktion an ist
      // (data-goch-stimme; der Absatz zum Blickkontakt zusätzlich nur mit data-goch-blick)
      privacyGochStimme: 'Sprechen mit Goch: Spracheingabe und Stimme sind freiwillig und beginnen erst, wenn Sie im Gespräch „Mit Goch sprechen“ oder „Goch spricht laut“ einschalten und dafür eigens einwilligen (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung gilt nur für diesen Besuch, wird nicht im Browser gespeichert und lässt sich im Gespräch jederzeit beenden. Solange „Mit Goch sprechen“ eingeschaltet ist, ist das Mikrofon offen. Ob Sie sprechen, erkennt Ihr Browser selbst an der Lautstärke; erst wenn Sie kurz innehalten, wird der gesprochene Abschnitt (höchstens 20 Sekunden) übertragen – Stille und Geräusche dazwischen nicht. Während Goch antwortet, hört er nicht zu. Nach einer Minute ohne Sprache, mit „Pause“, beim Schließen des Gesprächs, beim Verlassen der Seite und mit „Sprechen beenden“ wird das Mikrofon geschlossen; beim Wechsel in einen anderen Tab bleibt es an. Jeder Abschnitt geht mit Ihrer IP-Adresse an einen Cloudflare Worker und wird dort mit Workers AI (Cloudflare, Inc., auch in den USA) in Text umgewandelt; weder Abschnitt noch Text werden gespeichert; gezählt werden nur Gesamtdauer und Zahl der Aufnahmen je Tag, ohne Personenbezug. Ihre IP-Adresse wird nur kurz im Arbeitsspeicher verarbeitet, um Missbrauch zu begrenzen (höchstens eine Stunde), und nicht gespeichert. Der erkannte Text erscheint im Gespräch und wird wie getippter Text verarbeitet. Gochs Antworten spricht eine künstlich erzeugte Stimme von ElevenLabs (Eleven Labs, Inc., USA); dafür erhält ElevenLabs als Auftragsverarbeiter nur Gochs Antworttext, nie Ihre Eingaben. Steht diese Stimme nicht zur Verfügung, antwortet Goch nur als Text. Bei der ersten gesprochenen Antwort sagt Goch, dass er eine KI mit künstlich erzeugter Stimme ist; ein Hinweis im Gespräch zeigt das dauerhaft an.',
      privacyGochBlick: 'Blickkontakt mit Goch: freiwillig; beginnt erst, wenn Sie im Gespräch „Blickkontakt“ einschalten und eigens einwilligen (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Das Kamerabild wird ausschließlich in Ihrem Browser ausgewertet, mit MediaPipe von Google (Apache-2.0), das robin.vision selbst ausliefert; dessen Nutzungsmeldung an Google ist abgeschaltet, Verbindungen zu fremden Servern sind technisch gesperrt. Ausgewertet wird nur, ob ein Gesicht im Bild ist, wo es ist und ob es zum Bildschirm schaut; danach bewegt sich Goch, und im Gesprächsmodus hört er nur zu, wenn Sie ihn ansehen. Es gibt keine Mimik- oder Gefühlserkennung und keine Wiedererkennung; weder Bilder noch Messwerte verlassen Ihr Gerät, nichts wird gespeichert. Kommt jemand an den Bildschirm, zwitschert Goch und begrüßt ihn; dafür fragt die Seite bei Gochs Server einen festen Begrüßungssatz an – wie bei einer Frage, ohne Kamerabild oder Messwerte. Solange die Kamera an ist, ist der Schalter „Blickkontakt“ gedrückt, und Ihr Browser zeigt seine Kamera-Anzeige. Sie geht aus mit „Blickkontakt“, beim Schließen des Gesprächs, beim Verlassen der Seite und mit „Sprechen beenden“; beim Wechsel in einen anderen Tab bleibt sie an.',
      elevenlabsPrivacy: 'Datenschutz bei ElevenLabs',
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

      navContact: 'Appointment', navTools: "Tools", navPages: 'Pages', menuLabel: 'Menu',
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
      toolsTitle: "Tools", toolsAll: 'All tools at a glance and compared',
      toolsLead: 'Software and AI solutions for accounting, administration and other business processes – presented and compared on robin.vision.',
      privacyNewsletter: 'Newsletter: it brings the Food for Thought posts and news of the tools and workshops (new versions, beta access, dates). When you subscribe, your email address is sent via a Cloudflare Worker (Cloudflare, Inc.) to the email service Brevo (Sendinblue SAS, Paris, France). Brevo sends a confirmation email; the address is subscribed only after the link has been clicked (double opt-in). The address, the language and the time and IP address of subscription and confirmation are stored so that consent can be proven. The legal basis is consent (Art. 6(1)(a) GDPR). It can be withdrawn at any time via the unsubscribe link in every issue or by email; the address is then deleted or, where needed as proof, blocked. Opens and clicks are not evaluated per person. Brevo processes the data on my behalf. Brevo creates the issues with the Food for Thought posts from the blog feed using the service Integry (USA), which Brevo engages as a sub-processor. Processing may take place in the United States; Brevo states that transfers use Standard Contractual Clauses.',
      privacyTool: 'Tool "Booking Batch Generator" (in German "Buchungsstapel-Generator"): the download requires no sign-up. The tool processes bank statements only in the browser and does not transmit them. Only if you explicitly choose "Send layout to robin.vision" for a statement it cannot read, that statement\'s layout without content (letters as x, digits as 9, optionally the name of the bank) is sent to me by email via a Cloudflare Worker and the delivery service Resend (Resend, Inc., USA), so that I can add the layout (Art. 6(1)(a) GDPR). The IP address is processed technically but not stored; a daily counter without personal reference limits misuse.',
      brevoPrivacy: 'Brevo privacy policy',
      privacyContact: 'Contact form: name, email address, optionally phone number and the message text are delivered to me by email when you submit, via a Cloudflare Worker (Cloudflare, Inc.) and the delivery service Resend (Resend, Inc., USA), and are used solely to reply (Art. 6(1)(b) and (f) GDPR). No cookies are set and no input is stored on the server; a daily counter without personal reference limits abuse.',
      contactTitle: 'Arrange an appointment',
      contactLead: "An informal conversation about a workshop for your team or a partnership on the Tools page. By video, by phone, in Balingen or at a place of your choosing. Every booking is a proposal at first; I confirm each appointment personally.",
      book: 'Suggest a time', bookHint: ' — opens the calendar in a new tab.',
      legalTitle: 'Legal notice · Privacy',
      legalMstv: 'Responsible for content under § 18(2) MStV (German Interstate Media Treaty): Robin James Lewis, address as above.',
      legalAds: 'Advertising: tools marked “Ad” are presented by robin.vision for advertising purposes. The provider is robin.vision itself, a company in which Robin James Lewis has a stake, or another company that pays robin.vision to present its tool (a fee or a commission on sales referred). The provider is named next to the label; any contract for a tool is made with its provider.',
      description: 'Accounting tools, free to try until 31 December 2026: check and pay e-invoices, turn bank statements into booking batches. AI literacy workshops with EU AI Act training. New Food for Thought every Friday.',
      title: 'robin.vision – Tools and AI literacy workshops',
      slogan: 'Making processes efficient', claim: 'Tools and workshops for businesses and accounting firms.',
      ctaTool: 'Try the tools', ctaWorkshops: 'Workshop for your team', ctaWorkshopsZusatz: 'with EU AI Act training',
      aboutTitle: 'About me', aboutMore: 'More about me', navAbout: 'About',
      // Workshops (Robin, 17.10.2026): AI literacy workshop with EU AI Act training
      navWorkshops: 'Workshops', workshopsTitle: 'Workshops', workshopsMore: 'More about the workshop', workshopsAnfrage: 'Enquire about a workshop',
      workshopsLead: 'AI literacy for your team, with EU AI Act training. For accounting firms and businesses, online or on site, in German or English. Dates from January 2027; enquiries are welcome now.',
      // Startseite nach Option B (Robin, 23.10.2026): Workshops ausführlicher, Hinweis für Anbieter weiter unten
      workshopsTeil1Titel: 'Workshop:', workshopsTeil1: '90 minutes online or half a day on site – overcoming hesitation, use cases from your daily work.',
      workshopsTeil2Titel: 'Online course:', workshopsTeil2: "seven lessons, about 70 minutes, with practical tasks at each participant's own desk.",
      workshopsTeil3Titel: 'Test and certificate:', workshopsTeil3: 'per person, verifiable online, documenting your measures under Article 4 of the EU AI Act.',
      workshopsLeitung: 'I run the workshops myself – drawing on daily practice at a tax firm, and with the IHK trainer qualification.',
      anbieterTitle: 'For providers', anbieterKnopf: 'Become a partner',
      anbieterText: "Do you develop software or AI solutions for accounting, administration or other business processes? Present them on robin.vision.",
      aboutText: "I'm Robin James Lewis from Balingen, Germany. After thirteen years in retail and three years running the administration of a cultural centre, I am becoming a certified tax clerk, with my own set of clients in bookkeeping, payroll and annual accounts at a tax firm in Balingen. Working hands-on and training new staff in administration and accounting across different industries, I have learned where data gets entered twice and where processes can be simplified or automated. From this I build tools that fit into the working day – and pass this knowledge on in workshops.",
      language: 'Language', replay: 'Let the robin fly in again', replayTitle: 'Watch the robin fly in again',
      reloadTitle: 'Reload the page',
      // Goch, Robin's robin (17.09.2026)
      gochOpen: "Talk to Goch, Robin's robin", gochOpenTitle: 'Talk to Goch',
      gochName: 'Goch', gochRole: "Robin's robin", gochClose: 'Close the conversation',
      gochGreeting: "I'm Goch, Robin's robin – robin goch is Welsh for robin. Ask me about him, or leave him a message.",
      gochQ1: 'What is Robin working on?', gochQ2: 'Who is Robin?', gochQ3: "I'd like to leave Robin a message.", gochQ4: "What's new?",
      gochLabel: 'Your message to Goch', gochPlaceholder: 'Write to Goch …', gochSend: 'Send',
      gochConsentText: 'Goch answers with a language model. What you write here goes to a Cloudflare server and to the model, including in the United States. Conversations are not stored; only questions Goch could not answer are kept for 30 days, without reference to you. The choice lasts 180 days. Agreed?',
      gochAllow: 'Allow the conversation', gochDeny: 'Rather not',
      gochDeniedNote: "Understood – I'll stay quiet. You can reach Robin by email: robin@robin.vision",
      gochWithdraw: 'Withdraw permission', gochReconsider: 'Change decision',
      gochWithdrawn: "Permission withdrawn. I'll ask again before the next word.",
      gochError: "I can't answer right now. You can reach Robin by email:",
      gochCalendar: 'Suggest a time',
      gochNote: 'Goch answers automatically from a text Robin has approved; conversations are not stored. No tax or legal advice.',
      gochMikroAn: 'Talk to Goch', gochLaut: 'Goch speaks aloud', gochStummAus: 'Chirping off', gochStummAn: 'Chirping on', gochKi: 'AI · synthetic voice',
      gochStimmeConsentText: "Talking to Goch: while 'Talk to Goch' is on, your microphone is open; only spoken passages go to Cloudflare (including the USA) to be turned into text – nothing is stored. After a minute of silence it turns off. Goch's answers are spoken by a synthetic voice from ElevenLabs (USA), which receives only his reply. For this visit only, and you can end it at any time. Agreed?",
      gochStimmeAllow: 'Allow speech', gochStimmeDenied: "Fine – we'll stick to writing.",
      gochStimmeEnde: 'Stop speech', gochStimmeBeendet: 'Speech stopped. Microphone and voice are off.',
      gochNurChat: "Speaking isn't possible right now – for the moment we can only talk here in the chat. Feel free to type.",
      gochZurSeite: 'View the page', gochMini: 'Back to Goch',
      gochBlickAn: 'Eye contact', gochKameraAllow: 'Allow camera', gochKameraTitel: 'Camera preview for eye contact',
      gochKameraConsentText: "Eye contact with Goch: your camera stays on this device. Goch only detects whether a face is there, where it is and whether it is looking at him – no image leaves the device, nothing is stored, no facial expressions, no emotions, no recognition. When someone comes to the screen, Goch chirps and greets them. For this visit only. Agreed?",
      gochBlickDenied: 'All right – Goch stays without the camera.', gochBlickFehler: "Eye contact isn't available on this device right now.",
      gochBlickAnsehen: 'Look at Goch when you speak to him – then he listens.',
      gochZiel_werkzeuge: 'See the tools', gochZiel_workshops: 'See the workshops', gochZiel_ueber_mich: 'About Robin', gochZiel_blog: 'Read Food for Thought',
      gochZiel_newsletter: 'To the newsletter', gochZiel_nachricht: 'Write to Robin', gochZiel_grundsaetze: 'See the principles',
      gochMikroKnopf: 'Listen again', gochKnopfPause: 'Pause', gochKnopfWeiter: 'Listen again', gochKnopfFertig: 'Done',
      gochMikroHinweis: 'Just speak – Goch answers as soon as you pause briefly.', gochZuhoeren: 'Goch is listening …',
      gochMikroHoert: 'Listening … (a short pause is enough, {s} s left)', gochMikroErkennen: 'Working it out …',
      gochZuhoerenPause: 'Listening paused – the microphone is off.', gochZuhoerenSchlaeft: "A minute of silence – the microphone is off. 'Listen again' turns it back on.",
      gochMikroNichts: "I didn't catch that – feel free to say it again or type.",
      gochMikroFehler: "I can't make you out just now. Please type your question.", gochMikroGrenze: 'Please type your question.',
      gochMikroVerweigert: 'That needs the microphone – you can allow it in your browser or simply type.',
      gochMikroAusgeschaltet: 'Voice input is switched off at the moment. Please type.',
      privacyGoch: "Conversation with Goch: talking to the robin is voluntary and starts only after permission (section 25(1) TDDDG, Article 6(1)(a) GDPR); as with the calendar, the choice is stored locally in the browser for 180 days and can be withdrawn at any time within the conversation. Entered text and the IP address are sent to a Cloudflare Worker (Cloudflare, Inc.) and from there to the Claude language model of Anthropic, PBC (USA), which generates the answer; under its terms, Anthropic does not use API inputs for training. The Worker stores no conversations, only a daily counter without personal reference and questions Goch could not answer – without reference to the person asking, for 30 days, so that Robin can extend the profile. A message for Robin is delivered by email only after explicit confirmation, via the delivery service Resend (Resend, Inc., USA) – just the confirmed text, without the conversation, and with your name and email address only if you give them yourself – and is treated like contact details. Feedback on the tools is likewise emailed to Robin after explicit confirmation, but without the conversation and without name and address unless you give them yourself. If Goch offers the newsletter, the address entered in the field below goes directly to the sign-up (see Newsletter), not to the language model. Answers from the language model are generated automatically and are not binding information.",
      privacyYoutube: 'Embedded YouTube videos (Google Ireland Ltd.) are loaded only when you click the placeholder (Section 25(1) TDDDG, Art. 6(1)(a) GDPR). Google then processes your IP address and browser data, including in the USA; the variant without playback-tracking cookies (“youtube-nocookie”) is used. Without a click, no connection to YouTube is made.',
      cloudflarePrivacy: 'Cloudflare privacy policy', anthropicPrivacy: 'Anthropic privacy policy', resendPrivacy: 'Resend privacy policy',
      privacyGochStimme: "Talking to Goch: voice input and the spoken voice are voluntary and only start once you switch on 'Talk to Goch' or 'Goch speaks aloud' in the conversation and give separate consent for it (section 25(1) TDDDG, Article 6(1)(a) GDPR). Consent lasts for this visit only, is not stored in your browser and can be ended at any time in the conversation. While 'Talk to Goch' is switched on, the microphone is open. Your browser works out from the volume when you are speaking; only once you pause briefly is the spoken passage (20 seconds at most) passed on – not the silence or noise in between. While Goch answers, he does not listen. The microphone is closed after a minute without speech, with 'Pause', when you close the conversation, when you leave the page and with 'Stop speech'; it stays on when you switch to another tab. Each passage goes, together with your IP address, to a Cloudflare Worker and is turned into text there with Workers AI (Cloudflare, Inc., including in the United States); neither the passage nor the text is stored – only the total duration and number of recordings per day are counted, without personal reference. Your IP address is processed briefly in memory to limit misuse (for an hour at most) and is not stored. The recognised text appears in the conversation and is handled like typed text. Goch's answers are spoken by an artificially generated voice from ElevenLabs (Eleven Labs, Inc., USA); as a processor, ElevenLabs receives only Goch's reply, never what you say or type. If that voice is unavailable, Goch answers in text only. With the first spoken answer Goch says that he is an AI with an artificially generated voice, and a label in the conversation shows this throughout.",
      privacyGochBlick: "Eye contact with Goch: voluntary; it only starts once you switch on 'Eye contact' in the conversation and give separate consent (section 25(1) TDDDG, Article 6(1)(a) GDPR). The camera image is analysed solely in your browser, using MediaPipe by Google (Apache-2.0), which robin.vision serves itself; its usage reporting to Google is switched off and connections to third-party servers are technically blocked. All that is analysed is whether a face is in the picture, where it is and whether it is looking at the screen; Goch moves accordingly, and in conversation mode he only listens while you look at him. There is no facial-expression or emotion recognition and no recognition of persons; neither images nor measurements leave your device, nothing is stored. When someone comes to the screen, Goch chirps and greets them; for this the page asks Goch's server for a fixed greeting – like a question, without any camera image or measurements. While the camera is on, the 'Eye contact' switch is pressed and your browser shows its camera indicator. It turns off with 'Eye contact', when you close the conversation, when you leave the page and with 'Stop speech'; it stays on when you switch to another tab.",
      elevenlabsPrivacy: 'ElevenLabs privacy policy',
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
