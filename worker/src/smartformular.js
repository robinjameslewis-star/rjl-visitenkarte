// Seite „SmartFormular“ (werkzeuge/index.html, englisch werkzeuge/en/index.html; Robin, 17.10.2026): eigene Unterseite im
// SmartFormular-Erscheinungsbild „Nacht und Violett“, so ausführlich wie die Seite „Workshops“ – was ein SmartFormular ist, die drei
// Produkte (Fibu lite kostenlos zum Herunterladen; Fibu und Deklaration angekündigt, mit den geplanten Funktionen), Mensch und
// Maschine, Sprachmodell optional, Fahrplan, Daten und Recht, Fragen und Antworten (FAQPage), Beta-Anfrage an Gochs Kontakt-Endpunkt.
// Keine Preise (auf Anfrage). Produktdaten in produkte.js; tools/werkzeug-uebernehmen.mjs schreibt beide Fassungen.
import { rahmen, SF_CSS, WERKZEUGE, UEBERSICHT_PFAD } from "./werkzeug.js";
import { PRODUKTE } from "./produkte.js";
import { newsletterKasten } from "./kasten.js";

const SITE = "https://robin.vision/";
export const KONTAKT_ENDPUNKT = "https://goch.robin.vision/contact";
export const smartformularUrl = lang => `${SITE}${UEBERSICHT_PFAD[lang].replace(/index\.html$/, "")}`;

const TEXT = {
  de: {
    titel: "SmartFormular",
    abzeichen: "Formulare, die mitarbeiten",
    seitentitel: "SmartFormular von robin.vision: Fibu lite kostenlos herunterladen, SmartFormular Fibu und Deklaration angekündigt – Buchhaltung und Jahresabschluss, human in the loop | robin.vision",
    beschr: "SmartFormular von robin.vision: Fibu lite macht aus Kontoauszügen Buchungsstapel im DATEV-Format, kostenlos und offline. SmartFormular Fibu (Belege, OPOS, SuSa, Klärliste) und SmartFormular Deklaration (Jahresabschluss mit Rechenspur und E-Bilanz-Vorbereitung) entstehen gerade – Beta-Zugang auf Anfrage.",
    untertitel: "Werkzeuge für Buchhaltung und Jahresabschluss, die beim Ausfüllen schon mit der Sachbearbeitung beginnen – prüfen, entscheiden und festschreiben bleibt bei Menschen.",
    meta: "Fibu lite kostenlos · Fibu und Deklaration in Entwicklung, Beta 2027 · Stand 17. Oktober 2026",
    intro: [
      "Ein SmartFormular sieht aus wie ein gewohntes Formular. Es hilft beim Ausfüllen, sichert die Vollständigkeit und beginnt schon beim Ausfüllen mit der Sachbearbeitung oder erstellt Bearbeitungshinweise. Es begleitet Sachbearbeitende und ersetzt sie nicht: Jeder Vorschlag trägt seine Herkunft – Beleg, Regel, Vormonat oder Modell –, geprüft und festgeschrieben wird von Menschen im Buchhaltungsprogramm.",
      "Drei Produkte: SmartFormular Fibu lite, der kostenlose Buchungsstapel-Generator, den Sie heute herunterladen. SmartFormular Fibu, das aus Kontoauszügen, Belegen, Buchungsstapeln, OPOS- und SuSa-Listen den geprüften Buchungsstapel für den laufenden Monat erstellt. SmartFormular Deklaration, das den Jahresabschluss in der Kanzlei vorbereitet. Fibu und Deklaration entstehen gerade; Beta-Zugang im Memberbereich auf Anfrage.",
    ],
    liteKnopf: "Fibu lite kostenlos herunterladen", betaKnopf: "Beta-Zugang anfragen",
    produkteTitel: "Drei Produkte", fertig: "Kostenlos · fertig", inEntwicklung: "In Entwicklung · Beta 2027",
    liteTitel: "SmartFormular Fibu lite heute",
    lite: [
      "Es ist der 10., die Buchhaltung muss raus, der Bankabruf fällt aus oder ist für dieses Konto nicht eingerichtet – es gibt nur den Kontoauszug als PDF. Fibu lite liest den Auszug (PDF mit Layout-Erkennung, Scan mit Texterkennung, CAMT.053, MT940, CSV), nimmt den Buchungsstapel des Vormonats als Vorlage – Berater, Mandant, Kontenrahmen, Gegenkonten – und erstellt je Auszug und Monat einen Buchungsstapel im DATEV-Format (EXTF), mit Summenprüfung.",
      "Eine einzige HTML-Datei, die im Browser läuft, auch unter Windows: Auszüge und Buchungen verlassen den Rechner nicht, nichts wird hochgeladen, keine Anmeldung. Kostenlos; es gelten die Nutzungsbedingungen auf der Werkzeugseite, dort stehen auch Prüfsumme, Fassung und „Was ist neu“.",
    ],
    liteFakten: ["PDF, Scan, CAMT, MT940, CSV", "Buchungsstapel im DATEV-Format (EXTF)", "Offline im Browser, ohne Upload", "Kostenlos, ohne Anmeldung"],
    fassung: "Fassung", vom: "vom", laden: "Herunterladen", zurSeite: "Zur Werkzeugseite: Nutzungsbedingungen, Prüfsumme, Was ist neu",
    fibuTitel: "Was SmartFormular Fibu dazulernt",
    fibuLead: "Fibu lite kontiert nach Muster. SmartFormular Fibu stellt Zusammenhänge her – zwischen Zahlung, Posten und Beleg – und erstellt den geprüften Stapel für den laufenden Monat. Geplant sind:",
    fibuPunkte: [
      ["Belege lesen und zuordnen", "Rechnungen und Gutschriften als PDF oder E-Rechnung (XRechnung, ZUGFeRD) lesen, Zahlungen über Betrag, Datum, Verwendungszweck, Rechnungsnummer und IBAN zuordnen, Skonto und Teilzahlungen erkennen; Gegenkonto, Steuerschlüssel und Kostenstelle aus dem Beleg ableiten, Pflichtangaben nach § 14 UStG als feste Prüfung."],
      ["OPOS ausziffern", "Offene Posten aus DATEV- oder ADDISON-Export einlesen, Zahlungen ausziffern, Restposten erklären, Mahnstufen und Dubletten erkennen; Debitoren und Kreditoren statt Sammelkonto, wenn die Vorlage sie führt."],
      ["SuSa abstimmen", "Summen- und Saldenliste gegen den Stapel halten: fehlende wiederkehrende Buchungen, Vorzeichen- und Kontenwechsel, Saldensprünge; Abstimmung von Bank und Kasse nach dem Import."],
      ["Zwölf Monate Muster je Mandant", "Nicht nur der Vormonat: das Muster der letzten zwölf Monate je Zahlungspartner – Gegenkonto, Steuerschlüssel, Text. Das Muster ist eine Datei des Mandanten bei Ihnen, kein Modelltraining."],
      ["Klärliste statt Rätselraten", "Alles, was die Regeln nicht sicher zuordnen, kommt als Frage an die Sachbearbeitung – etwa „Zahlung 1.190,00 an Muster GmbH: Rechnung 4711 oder 4712?“ –, mit einem Klick zu entscheiden."],
      ["Herkunft je Zeile", "Beleg, Regel, Vormonat oder Modell – sichtbar im Stapel, exportierbar als Prüfprotokoll. Automatische Buchungen bleiben nachvollziehbar (GoBD); ein Vorschlag ist kein Beleg."],
      ["Sprachmodell nur, wo Regeln nicht reichen", "Unklarer Verwendungszweck, Beleg ohne Rechnungsnummer, Freitext: Hier schlägt ein Modell vor – mit festen Vorgaben und immer ohne Häkchen. Festgeschrieben wird im Buchhaltungsprogramm, nach Ihrer Prüfung."],
    ],
    deklTitel: "SmartFormular Deklaration: der Jahresabschluss",
    deklLead: "Für Kanzleien. Aus Vorjahresdaten, Verträgen, Beschlüssen, Buchungen des Jahres und Kontobewegungen stellt Deklaration die Zusammenhänge für den Abschluss her – als Buchungsstapel, Berichte und Vorbereitung der E-Bilanz, jeder Vorschlag mit Herleitung. Geplant sind:",
    deklPunkte: [
      ["Eingaben", "Vorjahresjournale und -abschlüsse mit Vorträgen, Anlagenverzeichnis, Lohnauswertungen, Verträge (Darlehen, Miete, Leasing, Versicherungen, Gesellschafter), Gesellschafterbeschlüsse, Buchungen oder Belege des Jahres, Kontobewegungen, Mandats- und Auftragsdaten."],
      ["Abschlussplan aus dem Vorjahr", "Welche Abschlussbuchungen fehlen, welche Abgrenzungen aufzulösen sind, welche Rückstellungen fortzuschreiben – der größte Hebel für die wiederkehrenden Aufgaben."],
      ["Rechenmodule mit Rechenspur", "AfA je Zugang, § 7g EStG, Rechnungsabgrenzung, Rückstellungen für Personal, Archiv und Abschluss, Gewerbe- und Körperschaftsteuer, nicht abziehbare Betriebsausgaben, Überleitung von der Handels- zur Steuerbilanz – jede Zahl mit ihrem Rechenweg."],
      ["Gestufter Prüfkatalog und Dokumentenstufe", "Standardprüfungen nach Fehler, Fehlergefahr und Auffälligkeit; Werte aus Darlehensvertrag, Police und Beschluss mit Pflichtzitat aus Seite und Zeile."],
      ["Ergebnisse", "Vorschlagsstapel der Abschlussbuchungen im DATEV-Format mit Herleitung, Abschlussmappe mit Kontennachweis je Bilanzposten, Berichte (Vorjahresvergleich, Abweichungserklärungen als Entwurf, Unterlagenanforderung mit Status), Vorbereitung der E-Bilanz (Taxonomie-Zuordnung, Plausibilitäten, Übergabe an das übermittelnde Programm)."],
      ["Entscheidungsvorlagen", "Wahlrechte, Wesentlichkeit, Einzelwertberichtigung, Rückstellungen mit Ermessen: Rechtsfolge, Wahlrecht und Entscheidung getrennt aufbereitet – die Würdigung bleibt beim Berufsträger."],
    ],
    deklGrenze: "Deklaration erstellt keine Steuererklärung für Mandanten von robin.vision. Es ist Software, die die Kanzlei im Rahmen ihrer Befugnis nach dem Steuerberatungsgesetz einsetzt; Akte, Fristen, Abzeichnung und Übermittlung bleiben im Kanzleiprogramm.",
    menschKicker: "Das Prinzip", menschTitel: "Mensch und Maschine",
    mensch: [
      "SmartFormular bucht nicht und erklärt nicht. Es erstellt Stapel, markiert die Sicherheit je Zeile – sicher, Vorschlag, Klärung –, führt die Klärliste und übergibt erst nach der Prüfung durch die Sachbearbeitung. Festgeschrieben wird im Buchhaltungsprogramm, die steuerliche Würdigung bleibt beim Berufsträger.",
      "Das ist kein Zwischenschritt bis zur Vollautomatik, sondern das Prinzip: Qualität und Tempo steigen, weil Menschen weniger suchen und mehr entscheiden.",
    ],
    menschFakten: ["Vorschläge mit Herkunft", "Klärliste statt stiller Fehler", "Festschreibung im Buchhaltungsprogramm", "Würdigung beim Berufsträger"],
    kiTitel: "Sprachmodell: optional, ohne Training, in der EU, ohne Bindung",
    ki: [
      ["Optional", "Fibu lite arbeitet heute vollständig mit Regeln, Deklaration in der ersten Stufe ebenso. Ein Modell verbessert Vorschläge dort, wo Regeln nicht reichen: Texte lesen (Verwendungszwecke, Verträge, Beschlüsse), Entwürfe formulieren (Klärfrage, Anforderungsschreiben), Zuordnungen vorschlagen. Rechnen, abstimmen und würdigen bleiben Code und Mensch."],
      ["Kein Training", "Ihre Daten trainieren kein Modell. Das Muster eines Mandanten ist eine Datei bei Ihnen, kein Modellgewicht."],
      ["Skills statt freier Agenten", "Das Programm gibt dem Modell je Aufgabe feste Vorgaben: Eingabe, erlaubte Ausgaben, Pflichtzitat, Verbote – keine Beträge erfinden, keine Konten außerhalb des Kontenrahmens. Ausgaben werden deterministisch geprüft: Schema, Summen, Konten."],
      ["EU-Hosting, anbieterneutral", "Zwei Schnittstellen-Dialekte hinter einer Abstraktion, Profile je Anbieter – Bedrock EU, Azure EU, STACKIT oder IONOS mit offenen Modellen, lokal mit Ollama. Das Programm zeigt, welcher Anbieter konfiguriert ist; Daten gehen pseudonymisiert oder gar nicht hinaus."],
    ],
    fahrplanTitel: "Fahrplan",
    fahrplan: [
      "Heute: SmartFormular Fibu lite, kostenlos zum Herunterladen; neue Fassungen kündigt der Newsletter an.",
      "Anfang 2027: SmartFormular Fibu als Beta im Memberbereich von robin.vision – mit Testdaten, mit Ihrer Rückmeldung.",
      "Im Laufe des ersten Halbjahrs 2027: SmartFormular Deklaration als Beta für Kanzleien.",
      "Danach: Fibu lite im SmartFormular-Erscheinungsbild, lesende Anbindungen an Buchhaltungsprogramme, ein eigener Bereich im Memberbereich.",
    ],
    fahrplanHinweis: "Termine sind Planung, keine Zusage. Preise für Fibu und Deklaration nenne ich mit dem Angebot, nach Ihrer Anfrage.",
    rechtTitel: "Daten und Recht",
    recht: [
      "Fibu lite verarbeitet alles im Browser auf Ihrem Rechner und überträgt nichts. Beta-Fassungen von Fibu und Deklaration laufen im Memberbereich von robin.vision mit Testdaten; echte Mandanten- oder Personendaten setzen eine ausdrückliche Vereinbarung voraus (AGB des Memberbereichs, § 3 Abs. 3). Kanzleien beachten § 203 StGB und § 62a StBerG; ist ein Modellanbieter eingebunden, zeigt das Programm, welcher – der Vertrag nach § 62a StBerG läuft zwischen Kanzlei und Anbieter.",
      "SmartFormular erbringt keine Steuerberatung und keine Rechtsberatung. Ergebnisse sind Vorschläge; die Prüfung und jede Entscheidung bleiben bei Ihnen und Ihren Beraterinnen und Beratern. Anbieter ist Robin James Lewis, handelnd unter robin.vision; die robin.vision UG (haftungsbeschränkt) wird im Januar 2027 gegründet und übernimmt die Verträge nach ihrer Eintragung. DATEV ist eine eingetragene Marke der DATEV eG; SmartFormular steht in keiner Verbindung zur DATEV eG.",
    ],
    fragenTitel: "Fragen und Antworten",
    fragen: [
      ["Was unterscheidet SmartFormular Fibu lite von SmartFormular Fibu?", "Fibu lite kontiert Kontoauszüge nach dem Muster des Vormonats und erstellt Buchungsstapel im DATEV-Format – kostenlos, offline. Fibu stellt zusätzlich Zusammenhänge zu Belegen, offenen Posten und Saldenlisten her, führt eine Klärliste und zeigt die Herkunft jeder Zeile. Fibu lite bleibt kostenlos."],
      ["Brauche ich ein KI-Modell?", "Nein. Fibu lite arbeitet ohne Modell, Fibu und Deklaration ebenfalls in ihrer Grundform. Ein Modell lässt sich einbinden, um Vorschläge dort zu verbessern, wo Regeln nicht reichen – in der EU gehostet, ohne Training mit Ihren Daten, bei einem Anbieter Ihrer Wahl."],
      ["Mit welchen Programmen arbeitet SmartFormular?", "Fibu lite exportiert Buchungsstapel im DATEV-Format (EXTF), das viele Programme einlesen. Fibu liest OPOS- und SuSa-Exporte aus DATEV und ADDISON; Deklaration ist für die Arbeit neben dem Kanzleiprogramm gedacht. Lesende Anbindungen sind geplant."],
      ["Ersetzt SmartFormular Sachbearbeitende?", "Nein. Es nimmt Suchen und Abtippen ab und stellt Zusammenhänge her; prüfen, entscheiden und festschreiben bleibt bei Menschen. Das ist das Prinzip, nicht ein Zwischenschritt."],
      ["Was kostet SmartFormular?", "Fibu lite ist kostenlos. Für Fibu und Deklaration nenne ich Preise mit dem Angebot, nach Ihrer Anfrage; Beta-Zugänge sind kostenfrei und laufen mit Testdaten."],
      ["Wie bekomme ich Beta-Zugang?", "Über das Formular unten. Sie erhalten einen Zugang zum Memberbereich von robin.vision, dort die Beta-Fassung mit Testdaten und einen kurzen Weg für Rückmeldungen. Ihre Rückmeldung fließt in die nächste Fassung ein."],
      ["Wohin gehen meine Daten?", "Bei Fibu lite nirgendwohin – alles läuft im Browser auf Ihrem Rechner. Im Memberbereich liegen Beta-Daten in Rechenzentren in der EU; echte Mandantendaten nur nach ausdrücklicher Vereinbarung."],
      ["Fibu lite erkennt meinen Kontoauszug nicht – was dann?", "Senden Sie den Aufbau des Auszugs ohne Inhalt aus dem Werkzeug heraus (Buchstaben als x, Ziffern als 9); dann rüste ich das Layout in einer neuen Fassung nach. Der Newsletter kündigt jede Fassung an."],
    ],
    betaTitel: "Beta-Zugang anfragen",
    betaLead: "Fibu und Deklaration werden im Memberbereich von robin.vision erprobt – mit Testdaten, mit Ihrer Rückmeldung, bevor sie fertig sind. Ich antworte persönlich per E-Mail.",
    felder: { firma: "Kanzlei oder Unternehmen", name: "Ihr Name", email: "E-Mail-Adresse", produkt: "Interesse an", nachricht: "Ihre Lage oder Frage", optional: "(freiwillig)", beide: "Beiden" },
    senden: "Beta-Zugang anfragen", sendet: "Wird gesendet …",
    gesendet: "Danke – Ihre Anfrage ist angekommen. Ich melde mich per E-Mail.",
    ungueltig: "Bitte Name und eine gültige E-Mail-Adresse angeben.",
    fehler: "Das Senden hat nicht geklappt. Schreiben Sie mir bitte direkt an robin@robin.vision.",
    datenschutz: "Ihre Angaben gehen per E-Mail an mich und werden nur für die Antwort verwendet. Einzelheiten stehen unter Impressum · Datenschutz.",
    betreff: "Anfrage Beta-Zugang SmartFormular",
    downloadsTitel: "Zum Herunterladen", leer: "Noch kein SmartFormular.",
    andere: "This page in English",
  },
  en: {
    titel: "SmartFormular",
    abzeichen: "Forms that work with you",
    seitentitel: "SmartFormular by robin.vision: download Fibu lite for free, SmartFormular Fibu and Deklaration announced – bookkeeping and year-end accounts, human in the loop | robin.vision",
    beschr: "SmartFormular by robin.vision: Fibu lite turns bank statements into booking batches in the DATEV format, free and offline. SmartFormular Fibu (documents, open items, trial balance, clarification list) and SmartFormular Deklaration (year-end accounts with a calculation trace and e-balance preparation) are in the making – beta access on request.",
    untertitel: "Tools for bookkeeping and year-end accounts that start the casework while you fill them in – checking, deciding and finalising stay with people.",
    meta: "Fibu lite free · Fibu and Deklaration in development, beta 2027 · as of 17 October 2026",
    intro: [
      "A SmartFormular looks like a familiar form. It helps you fill it in, guarantees completeness and starts the actual casework while you type, or produces processing notes. It supports accounting staff and does not replace them: every suggestion carries its origin – document, rule, previous month or model – and people check and finalise it in the accounting software.",
      "Three products: SmartFormular Fibu lite, the free Booking Batch Generator you can download today. SmartFormular Fibu, which turns bank statements, documents, booking batches, open-item and trial-balance lists into the checked booking batch for the current month. SmartFormular Deklaration, which prepares year-end accounts in the firm. Fibu and Deklaration are in the making; beta access in the member area on request.",
    ],
    liteKnopf: "Download Fibu lite for free", betaKnopf: "Request beta access",
    produkteTitel: "Three products", fertig: "Free · ready", inEntwicklung: "In development · beta 2027",
    liteTitel: "SmartFormular Fibu lite today",
    lite: [
      "The filing deadline is tomorrow, the bank feed is down or was never set up for this account – all you have is the PDF statement. Fibu lite reads the statement (PDF with layout detection, scans with text recognition, CAMT.053, MT940, CSV), takes the previous month's booking batch as its template – adviser, client, chart of accounts, contra accounts – and produces one booking batch in the DATEV format (EXTF) per statement and month, with a totals check.",
      "A single HTML file that runs in your browser, on Windows too: statements and postings never leave your computer, nothing is uploaded, no sign-up. Free; the terms of use on the tool page apply, and that page also shows the checksum, the version and what's new.",
    ],
    liteFakten: ["PDF, scan, CAMT, MT940, CSV", "Booking batch in the DATEV format (EXTF)", "Offline in your browser, no upload", "Free, no sign-up"],
    fassung: "Version", vom: "of", laden: "Download", zurSeite: "To the tool page: terms of use, checksum, what's new",
    fibuTitel: "What SmartFormular Fibu adds",
    fibuLead: "Fibu lite posts by pattern. SmartFormular Fibu works out the connections – between payment, item and document – and produces the checked batch for the current month. Planned:",
    fibuPunkte: [
      ["Read and match documents", "Read invoices and credit notes as PDF or e-invoice (XRechnung, ZUGFeRD), match payments by amount, date, reference, invoice number and IBAN, recognise discounts and part payments; derive contra account, tax key and cost centre from the document, check the mandatory invoice details as a fixed rule."],
      ["Clear open items", "Import open items from DATEV or ADDISON exports, clear payments, explain remaining balances, recognise dunning levels and duplicates; debtors and creditors instead of a collective account where the template keeps them."],
      ["Reconcile the trial balance", "Hold the trial balance against the batch: missing recurring postings, sign and account changes, balance jumps; reconcile bank and cash after the import."],
      ["Twelve months of patterns per client", "Not just the previous month: the pattern of the last twelve months per counterparty – contra account, tax key, text. The pattern is a file of the client, kept with you, not model training."],
      ["A clarification list instead of guesswork", "Everything the rules cannot assign with certainty comes to the clerk as a question – such as “payment of 1,190.00 to Muster GmbH: invoice 4711 or 4712?” – decided with one click."],
      ["Origin of every line", "Document, rule, previous month or model – visible in the batch, exportable as an audit trail. Automated postings stay traceable (German GoBD); a suggestion is not a document."],
      ["A language model only where rules fall short", "Unclear reference, document without an invoice number, free text: here a model suggests – with fixed instructions and never pre-ticked. Postings are finalised in your accounting software, after your review."],
    ],
    deklTitel: "SmartFormular Deklaration: year-end accounts",
    deklLead: "For accounting firms. From prior-year data, contracts, resolutions, the year's postings and bank movements, Deklaration works out the connections for the closing – as booking batches, reports and the preparation of the German e-balance sheet, every suggestion with its derivation. Planned:",
    deklPunkte: [
      ["Inputs", "Prior-year journals and accounts with opening balances, fixed-asset register, payroll reports, contracts (loans, rent, leasing, insurance, shareholders), shareholder resolutions, the year's postings or documents, bank movements, engagement data."],
      ["Closing plan from the prior year", "Which closing entries are missing, which accruals are to be reversed, which provisions to roll forward – the biggest lever for the recurring tasks."],
      ["Calculation modules with a trace", "Depreciation per addition, Section 7g EStG, prepayments and accruals, provisions for staff, archiving and closing costs, trade and corporation tax, non-deductible expenses, reconciliation from commercial to tax balance sheet – every figure with its calculation path."],
      ["Graded check list and document stage", "Standard checks by error, risk of error and anomaly; values from loan agreement, policy and resolution with a mandatory citation of page and line."],
      ["Results", "Proposed batch of closing entries in the DATEV format with derivation, closing file with account evidence per balance sheet item, reports (prior-year comparison, draft variance explanations, document request with status), preparation of the e-balance sheet (taxonomy mapping, plausibility checks, hand-over to the transmitting software)."],
      ["Decision templates", "Elections, materiality, specific allowances, provisions involving judgement: legal consequence, election and decision prepared separately – the judgement stays with the professional."],
    ],
    deklGrenze: "Deklaration does not prepare tax returns for clients of robin.vision. It is software that the firm uses within its authority under the German Tax Advisory Act; file, deadlines, sign-off and transmission stay in the firm's software.",
    menschKicker: "The principle", menschTitel: "People and machine",
    mensch: [
      "SmartFormular does not post and does not declare. It produces batches, marks the certainty of every line – certain, suggestion, clarification –, keeps the clarification list and hands over only after the clerk's review. Postings are finalised in the accounting software; the tax judgement stays with the professional.",
      "This is not a stopgap on the way to full automation; it is the principle: quality and pace rise because people search less and decide more.",
    ],
    menschFakten: ["Suggestions with their origin", "A clarification list instead of silent errors", "Finalised in the accounting software", "Judgement with the professional"],
    kiTitel: "Language model: optional, no training, in the EU, no lock-in",
    ki: [
      ["Optional", "Fibu lite works entirely with rules today, and so does Deklaration in its first stage. A model improves suggestions where rules fall short: reading text (references, contracts, resolutions), drafting (clarification questions, document requests), proposing assignments. Calculating, reconciling and judging stay with code and people."],
      ["No training", "Your data does not train a model. A client's pattern is a file kept with you, not a model weight."],
      ["Skills instead of free agents", "For each task the program gives the model fixed instructions: input, permitted output, mandatory citation, prohibitions – no invented amounts, no accounts outside the chart. Output is checked deterministically: schema, totals, accounts."],
      ["EU hosting, vendor-neutral", "Two API dialects behind one abstraction, a profile per provider – Bedrock EU, Azure EU, STACKIT or IONOS with open models, Ollama locally. The program shows which provider is configured; data leaves pseudonymised or not at all."],
    ],
    fahrplanTitel: "Roadmap",
    fahrplan: [
      "Today: SmartFormular Fibu lite, free to download; the newsletter announces new versions.",
      "Early 2027: SmartFormular Fibu as a beta in the robin.vision member area – with test data and your feedback.",
      "During the first half of 2027: SmartFormular Deklaration as a beta for accounting firms.",
      "After that: Fibu lite in the SmartFormular look, read-only connections to accounting software, its own area in the member area.",
    ],
    fahrplanHinweis: "Dates are plans, not commitments. I state prices for Fibu and Deklaration in the quote, after your enquiry.",
    rechtTitel: "Data and legal",
    recht: [
      "Fibu lite processes everything in the browser on your computer and transmits nothing. Beta versions of Fibu and Deklaration run in the robin.vision member area with test data; real client or personal data requires an explicit agreement (terms of the member area, Section 3(3)). Firms observe Sections 203 StGB and 62a StBerG; if a model provider is involved, the program shows which one – the contract under Section 62a StBerG is between the firm and the provider.",
      "SmartFormular provides neither tax nor legal advice. Results are suggestions; review and every decision stay with you and your advisers. The provider is Robin James Lewis, trading as robin.vision; robin.vision UG (haftungsbeschränkt) is being founded in January 2027 and will take over the contracts once registered. DATEV is a registered trademark of DATEV eG; SmartFormular is not affiliated with DATEV eG.",
    ],
    fragenTitel: "Questions and answers",
    fragen: [
      ["What is the difference between SmartFormular Fibu lite and SmartFormular Fibu?", "Fibu lite posts bank statements by the previous month's pattern and produces booking batches in the DATEV format – free, offline. Fibu additionally works out the connections to documents, open items and trial balances, keeps a clarification list and shows the origin of every line. Fibu lite stays free."],
      ["Do I need an AI model?", "No. Fibu lite works without a model, and so do Fibu and Deklaration in their basic form. A model can be added to improve suggestions where rules fall short – hosted in the EU, no training on your data, with a provider of your choice."],
      ["Which software does SmartFormular work with?", "Fibu lite exports booking batches in the DATEV format (EXTF), which many programs import. Fibu reads open-item and trial-balance exports from DATEV and ADDISON; Deklaration is designed to work alongside the firm's software. Read-only connections are planned."],
      ["Does SmartFormular replace accounting staff?", "No. It takes over searching and retyping and works out connections; checking, deciding and finalising stay with people. That is the principle, not a stopgap."],
      ["What does SmartFormular cost?", "Fibu lite is free. For Fibu and Deklaration I state prices in the quote, after your enquiry; beta access is free of charge and runs with test data."],
      ["How do I get beta access?", "Through the form below. You receive access to the robin.vision member area, the beta version with test data and a short route for feedback. Your feedback goes into the next version."],
      ["Where does my data go?", "With Fibu lite, nowhere – everything runs in the browser on your computer. In the member area, beta data is stored in data centres in the EU; real client data only after an explicit agreement."],
      ["Fibu lite does not recognise my bank statement – what now?", "Send the statement's layout without its content from inside the tool (letters as x, digits as 9); I then add the layout in a new version. The newsletter announces every version."],
    ],
    betaTitel: "Request beta access",
    betaLead: "Fibu and Deklaration are being tested in the robin.vision member area – with test data and your feedback, before they are finished. I reply personally by email.",
    felder: { firma: "Firm or company", name: "Your name", email: "Email address", produkt: "Interested in", nachricht: "Your situation or question", optional: "(optional)", beide: "Both" },
    senden: "Request beta access", sendet: "Sending …",
    gesendet: "Thank you – your request has arrived. I will get back to you by email.",
    ungueltig: "Please give your name and a valid email address.",
    fehler: "Sending did not work. Please email me directly at robin@robin.vision.",
    datenschutz: "Your details are emailed to me and used only to reply. Details are under Legal notice · Privacy.",
    betreff: "Beta access request: SmartFormular",
    downloadsTitel: "Downloads", leer: "No SmartFormular yet.",
    andere: "Diese Seite auf Deutsch",
  },
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const datumText = (iso, lang) => {
  const [j, m, t] = String(iso).split("-");
  return lang === "en" ? new Date(Date.UTC(+j, +m - 1, +t)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : `${+t}.${+m}.${j}`;
};

// Stile der Seite – über dem Erscheinungsbild SmartFormular (SF_CSS aus werkzeug.js)
const CSS = `${SF_CSS}
.abzeichen { display: inline-block; margin: 0 0 16px; padding: 7px 14px; border: 1px solid #A78BFA; border-radius: 999px; font: 500 12px/1.4 var(--sans); letter-spacing: .14em; text-transform: uppercase; color: #A78BFA; }
.sf-wortmarke { margin: 0 0 14px; }
.einleitung p { font-size: 18px; line-height: 1.65; }
.wege { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; margin: 0 0 20px; padding: 0; list-style: none; }
.wege li { margin: 0; max-width: none; }
.wege .knopf { display: inline-block; padding: 10px 18px; border-radius: 4px; text-decoration: none; font-size: 15px; background: #7C3AED; color: #fff; border: 1px solid #7C3AED; }
.wege .knopf:hover { background: #6D28D9; color: #fff; }
.wege .zweit { background: transparent; color: #EDE9FE; border-color: #A78BFA; }
.wege .zweit:hover { background: rgba(167,139,250,.12); color: #fff; }
.wege .mail { font-size: 15px; }
.sf-kacheln { margin: 18px 0 8px; }
.sf-kachel h3 { margin: 0 0 10px; font: 500 24px/1.25 var(--serif); color: #fff; }
.fakten { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 10px; }
.fakten li { margin: 0; max-width: none; padding: 6px 12px; border: 1px solid #2A2340; border-radius: 4px; background: #1C1726; font-size: 14px; color: #C4B5FD; }
.download-zeile { margin: 16px 0 6px; display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; }
.download-zeile .stand { color: #8B83A8; font-size: 14px; }
.sf-liste { list-style: none; margin: 0 0 8px; padding: 0; counter-reset: punkt; }
.sf-liste li { display: grid; grid-template-columns: 40px 1fr; gap: 4px 16px; padding: 14px 0; border-top: 1px solid #2A2340; max-width: none; text-align: left; }
.sf-liste li:last-child { border-bottom: 1px solid #2A2340; }
.sf-liste .nr { font: 500 12px/1.9 var(--sans); letter-spacing: .18em; color: #A78BFA; }
.sf-liste strong { display: block; font-weight: 500; color: #fff; }
.sf-liste span.was { display: block; color: #C4B5FD; font-size: 15px; }
.sf-kasten { margin: 28px 0 8px; padding: 24px 26px 22px; border: 1px solid #2A2340; border-left: 3px solid #A78BFA; border-radius: 6px; background: #1C1726; }
.sf-kasten .kicker { margin: 0 0 4px; font: 500 12px/1.6 var(--sans); letter-spacing: .18em; text-transform: uppercase; color: #A78BFA; }
.sf-kasten h2 { margin: 0 0 10px; }
.sf-kasten p { max-width: none; text-align: left; margin: 0 0 10px; }
.ablauf { counter-reset: schritt; list-style: none; padding: 0; margin: 0 0 12px; }
.ablauf li { position: relative; padding: 0 0 16px 46px; margin: 0; max-width: none; text-align: left; }
.ablauf li::before { counter-increment: schritt; content: counter(schritt); position: absolute; left: 0; top: 0; width: 30px; height: 30px; border-radius: 50%; background: #7C3AED; color: #fff; display: grid; place-items: center; font: 500 13px/1 var(--sans); }
.fragen h3 { color: #fff; }
.beta .falle { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
@media (max-width: 720px) { .sf-liste li { grid-template-columns: 32px 1fr; } }`;

// Browser-Teil: Beta-Anfrage an Gochs Worker – wie das Kontaktformular der Startseite (contact.js): Felder zu einer Nachricht,
// Falle „website“, Ladezeitpunkt t
const SKRIPT = (lang, t) => `<script>
(() => {
  'use strict';
  const form = document.getElementById('beta-anfrage'); if (!form) return;
  const status = document.getElementById('beta-status'), knopf = document.getElementById('beta-senden'), geladen = Date.now();
  const T = ${JSON.stringify({ betreff: t.betreff, produkt: t.felder.produkt, firma: t.felder.firma, sendet: t.sendet, gesendet: t.gesendet, ungueltig: t.ungueltig, fehler: t.fehler })};
  const say = (text, art) => { status.textContent = text; status.className = 'status' + (art ? ' ' + art : ''); };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const name = (d.name || '').trim(), email = (d.email || '').trim();
    if (name.length < 2 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)) { say(T.ungueltig, 'warn'); return; }
    const message = [T.betreff, '', T.produkt + ': ' + (d.produkt || ''), d.firma ? T.firma + ': ' + d.firma.trim() : null, '', (d.nachricht || '').trim()].filter(x => x !== null).join('\\n').trim();
    knopf.disabled = true; say(T.sendet);
    try {
      const r = await fetch(${JSON.stringify(KONTAKT_ENDPUNKT)}, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang: ${JSON.stringify(lang)}, name, email, phone: '', message, website: d.website || '', t: geladen }) });
      const out = await r.json().catch(() => ({}));
      if (r.ok && out.ok) { say(T.gesendet, 'ok'); form.reset(); } else say(out.error || T.fehler, 'warn');
    } catch (_) { say(T.fehler, 'warn'); }
    knopf.disabled = false;
  });
})();
</script>`;

// Die Seite „SmartFormular“ einer Sprache; felder: Felder der Werkzeugseiten (werkzeugFelder) je Werkzeug-Kennung, für Fassung und Datei
export function smartformularSeite(lang, felder = {}) {
  const t = TEXT[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const andere = lang === "en" ? "de" : "en", up = lang === "en" ? "../../" : "../";
  const canonical = smartformularUrl(lang);
  const eigene = WERKZEUGE.filter(w => w.lang === lang), lite = eigene.find(w => w.id.includes("buchungsstapel") || w.id.includes("booking")) || eigene[0];
  const liteHref = lite ? `${up}werkzeuge/${lite.id}/` : "#produkte";
  const liteDatei = lite ? (felder[lite.id] || {}).datei || {} : {};
  const stand = liteDatei.fassung && liteDatei.datum ? `${t.fassung} ${esc(liteDatei.fassung)} ${t.vom} ${datumText(liteDatei.datum, lang)}` : "";
  const kachel = p => `<section class="sf-kachel${p.stand === "beta" ? " beta" : ""}" id="${p.id}"><p class="sf-stand">${p.stand === "beta" ? t.inEntwicklung : t.fertig}</p><h3>${esc(p.name)}</h3><p class="frei">${esc(p.text)}</p>
${p.punkte ? `<ul>${p.punkte.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
<p class="sf-wege">${p.href ? `<a class="sf-knopf" href="${up}werkzeuge/${p.href}">${esc(p.knopf)}</a>` : `<a class="sf-knopf" href="#beta">${esc(t.betaKnopf)}</a>`}</p></section>`;
  const liste = punkte => `<ol class="sf-liste">\n${punkte.map(([titel, was], i) => `<li><span class="nr">0${i + 1}</span><div><strong>${esc(titel)}</strong><span class="was">${esc(was)}</span></div></li>`).join("\n")}\n</ol>`;
  const downloads = eigene.map(w => {
    const d = (felder[w.id] || {}).datei || {};
    const st = d.fassung && d.datum ? `${t.fassung} ${esc(d.fassung)} ${t.vom} ${datumText(d.datum, lang)}` : "";
    return `<li><span class="when">${t.fertig}${st ? " · " + st : ""}</span><a href="${up}werkzeuge/${w.id}/">${esc(w.titel)}</a><p>${esc(w.kurz)}</p></li>`;
  }).join("\n");
  const main = `<article class="smartformular">
<h1 class="sf-wortmarke" aria-label="${esc(t.titel)}">Smart<span>Formular</span></h1>
<p class="abzeichen">${esc(t.abzeichen)}</p>
<p class="untertitel">${esc(t.untertitel)}</p>
<p class="meta">${esc(t.meta)}</p>
<div class="einleitung">
${t.intro.map(p => `<p>${esc(p)}</p>`).join("\n")}
</div>
<ul class="wege">
<li><a class="knopf" href="${liteHref}">${esc(t.liteKnopf)}</a></li>
<li><a class="knopf zweit" href="#beta">${esc(t.betaKnopf)}</a></li>
<li><a class="mail" href="mailto:robin@robin.vision">robin@robin.vision</a></li>
</ul>
<h2 id="produkte">${esc(t.produkteTitel)}</h2>
<div class="sf-kacheln">${PRODUKTE[lang].map(kachel).join("\n")}</div>
<h2 id="fibu-lite">${esc(t.liteTitel)}</h2>
${t.lite.map(p => `<p>${esc(p)}</p>`).join("\n")}
<ul class="fakten">${t.liteFakten.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
<p class="download-zeile"><a class="sf-knopf" href="${liteHref}">${esc(t.laden)}: ${esc(lite ? lite.titel : t.titel)}</a>${stand ? `<span class="stand">${stand}</span>` : ""}</p>
<p class="meta"><a href="${liteHref}">${esc(t.zurSeite)}</a></p>
<h2 id="fibu">${esc(t.fibuTitel)}</h2>
<p>${esc(t.fibuLead)}</p>
${liste(t.fibuPunkte)}
<h2 id="deklaration">${esc(t.deklTitel)}</h2>
<p>${esc(t.deklLead)}</p>
${liste(t.deklPunkte)}
<p class="hinweis">${esc(t.deklGrenze)}</p>
<section class="sf-kasten" aria-labelledby="mensch">
<p class="kicker">${esc(t.menschKicker)}</p>
<h2 id="mensch">${esc(t.menschTitel)}</h2>
${t.mensch.map(p => `<p class="frei">${esc(p)}</p>`).join("\n")}
<ul class="fakten">${t.menschFakten.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
</section>
<h2 id="sprachmodell">${esc(t.kiTitel)}</h2>
${liste(t.ki)}
<h2 id="fahrplan">${esc(t.fahrplanTitel)}</h2>
<ol class="ablauf">
${t.fahrplan.map(s => `<li>${esc(s)}</li>`).join("\n")}
</ol>
<p class="hinweis">${esc(t.fahrplanHinweis)}</p>
<h2 id="recht">${esc(t.rechtTitel)}</h2>
${t.recht.map(p => `<p>${esc(p)}</p>`).join("\n")}
<h2 id="fragen">${esc(t.fragenTitel)}</h2>
<div class="fragen">
${t.fragen.map(([f, a]) => `<h3>${esc(f)}</h3>\n<p>${esc(a)}</p>`).join("\n")}
</div>
<h2 id="beta">${esc(t.betaTitel)}</h2>
<p>${esc(t.betaLead)}</p>
<form class="beta" id="beta-anfrage" novalidate>
<div class="reihe">
<div><label for="b-firma">${esc(t.felder.firma)}</label><input type="text" id="b-firma" name="firma" maxlength="120" autocomplete="organization"></div>
<div><label for="b-name">${esc(t.felder.name)}</label><input type="text" id="b-name" name="name" maxlength="80" required autocomplete="name"></div>
<div><label for="b-email">${esc(t.felder.email)}</label><input type="email" id="b-email" name="email" maxlength="120" required autocomplete="email"></div>
<div><label for="b-produkt">${esc(t.felder.produkt)}</label><select id="b-produkt" name="produkt"><option value="fibu">SmartFormular Fibu</option><option value="deklaration">SmartFormular Deklaration</option><option value="beide">${esc(t.felder.beide)}</option></select></div>
</div>
<label for="b-nachricht">${esc(t.felder.nachricht)} <span>${esc(t.felder.optional)}</span></label><textarea id="b-nachricht" name="nachricht" maxlength="2000"></textarea>
<div class="falle" aria-hidden="true"><label for="b-website">Website</label><input type="text" id="b-website" name="website" tabindex="-1" autocomplete="off"></div>
<button type="submit" id="beta-senden">${esc(t.senden)}</button>
<p class="status" id="beta-status" role="status" aria-live="polite"></p>
<p class="meta hinweis">${esc(t.datenschutz)}</p>
</form>
${eigene.length ? `<h2 id="downloads">${esc(t.downloadsTitel)}</h2><ul class="list">\n${downloads}\n</ul>` : `<p class="intro">${esc(t.leer)}</p>`}
<p class="meta"><a href="${up}${UEBERSICHT_PFAD[andere].replace(/index\.html$/, "")}" lang="${andere}" hreflang="${andere}">${esc(t.andere)}</a></p>
${newsletterKasten(lang, up, "werkzeug")}
</article>
${SKRIPT(lang, t)}`;
  const software = lite ? JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: lite.titel, applicationCategory: "BusinessApplication", operatingSystem: "Web browser",
    url: `${SITE}werkzeuge/${lite.id}/`, description: lite.kurz, inLanguage: lang, isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@type": "Person", "@id": SITE + "#person", name: "Robin James Lewis", url: SITE } }).replace(/</g, "\\u003c") : "";
  const faq = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: lang,
    mainEntity: t.fragen.map(([f, a]) => ({ "@type": "Question", name: f, acceptedAnswer: { "@type": "Answer", text: a } })) }).replace(/</g, "\\u003c");
  return rahmen({ lang, up, titel: t.titel, seitentitel: t.seitentitel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: smartformularUrl(andere) }],
    head: `${software ? `<script type="application/ld+json">${software}</script>\n` : ""}<script type="application/ld+json">${faq}</script>\n`, css: CSS, main, aktiv: "tools" });
}

// Bisheriger Name der Übersicht (tools/werkzeug-uebernehmen.mjs, Tests)
export const werkzeugUebersicht = smartformularSeite;
