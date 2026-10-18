// Seite „SmartFormular“ (werkzeuge/index.html, englisch werkzeuge/en/index.html; Robin, 17.10.2026): eigene Unterseite im
// SmartFormular-Erscheinungsbild „Nacht und Violett“, so ausführlich wie die Seite „Workshops“ – was ein SmartFormular ist, die drei
// Produkte (FiBu lite kostenlos zum Herunterladen; FiBu und Deklaration angekündigt, mit den geplanten Funktionen), Mensch und
// Maschine, offen für jedes Buchhaltungsprogramm (Robin, 17.10.2026: Alleinstellungsmerkmal), Sprachmodell optional, Fahrplan, Daten und Recht, Fragen und Antworten (FAQPage), Beta-Anfrage an Gochs Kontakt-Endpunkt.
// Keine Preise (auf Anfrage), keine Termine oder internen Planungen (Robin, 17.10.2026: Texte aus Kundensicht, knapp und professionell).
// Produktdaten in produkte.js; tools/werkzeug-uebernehmen.mjs schreibt beide Fassungen.
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
    seitentitel: "SmartFormular: Buchhaltung und Jahresabschluss mit Werkzeugen, die mitarbeiten – FiBu lite kostenlos | robin.vision",
    beschr: "SmartFormular von robin.vision: FiBu lite macht aus Kontoauszügen Buchungsstapel im DATEV-Format – kostenlos, offline im Browser. SmartFormular FiBu und Deklaration bringen Belege, offene Posten und den Jahresabschluss zusammen. Beta-Zugang auf Anfrage.",
    untertitel: "Werkzeuge für Buchhaltung und Jahresabschluss, die schon beim Ausfüllen mit der Sachbearbeitung beginnen. Prüfen, entscheiden und festschreiben bleibt bei Ihnen.",
    meta: "FiBu lite kostenlos · FiBu und Deklaration als Beta · für Kanzleien und Rechnungswesen",
    intro: [
      "Ein SmartFormular sieht aus wie ein gewohntes Formular – und arbeitet mit. Es hilft beim Ausfüllen, sichert die Vollständigkeit und erledigt die ersten Schritte der Sachbearbeitung, während Sie noch tippen. Jeder Vorschlag trägt seine Herkunft: Beleg, Regel, Vormonat oder Modell. Geprüft und festgeschrieben wird von Ihnen, in Ihrem Buchhaltungsprogramm.",
      "Heute steht SmartFormular FiBu lite bereit, der kostenlose Buchungsstapel-Generator. SmartFormular FiBu und SmartFormular Deklaration folgen – für den laufenden Monat und für den Jahresabschluss. Beide erprobe ich mit ausgewählten Kanzleien im Memberbereich; Beta-Zugang auf Anfrage.",
    ],
    liteKnopf: "FiBu lite kostenlos herunterladen", betaKnopf: "Beta-Zugang anfragen",
    produkteTitel: "Drei Produkte", fertig: "Kostenlos · verfügbar", inEntwicklung: "Beta · auf Anfrage",
    liteTitel: "SmartFormular FiBu lite",
    lite: [
      "Der Bankabruf fällt aus, der Auszug liegt nur als PDF vor, die Buchhaltung muss raus: FiBu lite liest Kontoauszüge als PDF, Scan, CAMT, MT940 oder CSV, nimmt den Buchungsstapel des Vormonats als Vorlage und erstellt je Auszug und Monat einen Buchungsstapel im DATEV-Format – mit Summenprüfung.",
      "Eine einzige Datei, die im Browser läuft, auch unter Windows. Ihre Auszüge und Buchungen verlassen den Rechner nicht; nichts wird hochgeladen, keine Anmeldung.",
    ],
    liteFakten: ["PDF, Scan, CAMT, MT940, CSV", "DATEV-Format (EXTF)", "Offline im Browser", "Kostenlos"],
    fassung: "Fassung", vom: "vom", laden: "Herunterladen", zurSeite: "Zur Werkzeugseite: Nutzungsbedingungen, Prüfsumme, Was ist neu",
    fibuTitel: "SmartFormular FiBu",
    fibuLead: "Für den laufenden Monat: FiBu macht aus Kontoauszügen und Belegen den geprüften Buchungsstapel – für Bank, Kreditoren und Debitoren – und stellt die Zusammenhänge zu Ihren offenen Posten her. FiBu nimmt Ihnen das Suchen und Abtippen ab; Sie prüfen und entscheiden.",
    fibuPunkte: [
      ["Bank buchen", "Kontoauszüge als PDF, Scan, CAMT, MT940 oder CSV werden zum Buchungsstapel für das Bankkonto – nach Ihrer Buchungsweise. FiBu stellt den Bezug zu Ihren OPOS-Listen her: welche Zahlung welchen Posten ausgleicht, was offen bleibt, wo ein Beleg fehlt."],
      ["Belege lesen und zuordnen", "Rechnungen und Gutschriften als PDF oder E-Rechnung: FiBu liest Betrag, Datum, Steuersatz und Rechnungsnummer und ordnet die Zahlung zu – auch bei Skonto und Teilzahlungen."],
      ["Kreditoren und Debitoren buchen", "Aus Eingangs- und Ausgangsrechnungen entsteht der Buchungsstapel auf den Personenkonten – mit Steuersatz und Kostenstelle aus dem Beleg und dem Gegenkonto nach Ihrer Buchungsweise."],
      ["Ihre Buchungsweise je Mandant", "Gegenkonto, Steuerschlüssel, Kostenstelle und Buchungstext folgen den letzten zwölf Monaten je Geschäftspartner – als Datei bei Ihnen, ohne Modelltraining."],
      ["Klärliste statt Rätselraten", "Was nicht eindeutig ist, wird zur Frage, die Sie mit einem Klick beantworten. Jede Zeile zeigt ihre Herkunft – nachvollziehbar und prüfbar nach GoBD."],
      ["Umsatzsteuer überschlagen", "Für die Umsatzsteuer-Voranmeldung: Sie wählen Soll- oder Ist-Versteuerung oder Ihre Rechtsform, FiBu errechnet aus Kontoauszügen und Belegen die voraussichtliche Zahllast oder den Vorsteuerüberhang – je Steuersatz, mit Herkunft jedes Betrags. Ein Überschlag zur Vorbereitung; die Voranmeldung erstellen und übermitteln Sie oder Ihre Kanzlei."],
    ],
    deklTitel: "SmartFormular Deklaration",
    deklClaim: "Das Arbeitspapier, das mitdenkt und vorarbeitet.",
    deklLead: "Für den Jahresabschluss in der Kanzlei. Deklaration erledigt die Vorarbeit, die jeder Abschluss braucht – vom Vorjahresvergleich bis zur Unterlage für das Abschlussgespräch. Jeder Vorschlag kommt mit Herleitung, jede Entscheidung bleibt bei Ihnen. Am Ende stehen ein Vorschlagsstapel für die Abschlussbuchungen und die Vorbereitung der E-Bilanz.",
    deklPunkte: [
      ["Vorjahreswerte und Entwicklungen", "Jede Position im Vorjahresvergleich, dazu die Entwicklungsübersichten – Anlagen, Rückstellungen, Darlehen, Eigenkapital – aus Saldenliste und Buchungen."],
      ["Darlehen abstimmen", "Zinsen und Tilgung gegen den Tilgungsplan, Anfangs- und Endbestand gegen Vertrag und Saldenbestätigung. Abweichungen stehen als Klärpunkt bereit."],
      ["Offene Posten prüfen", "Offene Debitoren und Kreditoren gegen die Saldenliste, Ausgleich nach dem Stichtag, Dubletten und falsch gebuchte Posten."],
      ["Alte Forderungen und Verbindlichkeiten", "Was seit Jahren offen steht, wird gefunden und für die Bewertung aufbereitet: Alter, letzte Bewegung, Vorschlag für Wertberichtigung oder Ausbuchung. Die Entscheidung trifft der Berufsträger."],
      ["Rückstellungen berechnen", "Abschluss- und Prüfungskosten, Aufbewahrung, Urlaub und Überstunden, Steuern – mit Rechenweg und Fortschreibung aus dem Vorjahr."],
      ["Zahlen ins Verhältnis setzen", "Umsatz, Rohertrag, Wareneinsatz, Personalkosten, Gewinn und weitere wichtige Positionen als Quoten, im Vergleich zum Vorjahr und mit den Auffälligkeiten, über die zu sprechen ist."],
      ["Abschlussgespräch vorbereiten", "Eine Gesprächsunterlage für den Mandanten: die wichtigsten Zahlen, Veränderungen zum Vorjahr, offene Fragen und die Entscheidungen, die beim Mandanten liegen."],
    ],
    deklGrenze: "Deklaration ist Software für Ihre Kanzlei, keine Steuerberatung. Akte, Fristen, Abzeichnung und Übermittlung bleiben in Ihrem Kanzleiprogramm.",
    menschKicker: "Das Prinzip", menschTitel: "Mensch und Maschine",
    mensch: [
      "SmartFormular bucht nicht und erklärt nicht. Es bereitet vor, markiert die Sicherheit jeder Zeile – sicher, Vorschlag, Klärung – und übergibt erst nach Ihrer Prüfung. So steigen Qualität und Tempo, weil Ihr Team weniger sucht und mehr entscheidet.",
    ],
    menschFakten: ["Vorschläge mit Herkunft", "Klärliste statt stiller Fehler", "Festschreibung in Ihrem Programm", "Würdigung beim Berufsträger"],
    programmeTitel: "Offen für jedes Buchhaltungsprogramm",
    programmeLead: "Nicht nur DATEV: SmartFormular wird so gebaut, dass es mit jedem Buchhaltungsprogramm Daten austauscht – importieren und exportieren, zuerst in Deutschland, langfristig weltweit. Sie behalten Ihr Programm; SmartFormular arbeitet ihm zu.",
    programme: [
      ["Import und Export", "Kontoauszüge, Belege, Buchungsstapel, offene Posten und Saldenlisten kommen aus Ihrem Programm herein; die Ergebnisse gehen in dem Format zurück, das Ihr Programm einliest."],
      ["Ein neutrales Datenmodell", "Intern arbeitet SmartFormular mit einem eigenen, programmunabhängigen Datenmodell. Jedes Programm kommt über eine eigene Anbindung hinzu – per Datei oder Schnittstelle, Schnittstellen zuerst lesend. An Ihrer Arbeit im SmartFormular ändert das nichts."],
      ["Von Deutschland in die Welt", "Zuerst die Programme, mit denen Kanzleien und Unternehmen im deutschsprachigen Raum arbeiten, mit ihren Kontenrahmen. Danach weitere Länder mit ihren Kontenrahmen, Steuerregeln und Standards für Bankdaten und E-Rechnungen."],
    ],
    programmeHeute: "Heute exportiert FiBu lite Buchungsstapel im DATEV-Format, das viele Programme einlesen. Welche Programme als Nächstes angebunden werden, richtet sich nach den Kanzleien und Unternehmen in der Beta – sagen Sie mir, womit Sie arbeiten.",
    kiTitel: "Sprachmodell: optional und unter Ihrer Kontrolle",
    ki: [
      ["Optional", "SmartFormular arbeitet mit Regeln. Ein Sprachmodell kommt nur dort dazu, wo Regeln nicht reichen – beim Lesen von Verwendungszwecken, Verträgen und Beschlüssen oder beim Formulieren von Entwürfen. Rechnen, abstimmen und würdigen bleiben Regelwerk und Mensch."],
      ["Kein Training mit Ihren Daten", "Ihre Daten trainieren kein Modell. Das Programm gibt dem Modell feste Vorgaben je Aufgabe und prüft jede Ausgabe – Schema, Summen, Konten."],
      ["In der EU, ohne Bindung", "Das Modell läuft bei einem europäischen Anbieter Ihrer Wahl oder lokal bei Ihnen. Das Programm zeigt, welcher Anbieter eingebunden ist; Daten gehen pseudonymisiert oder gar nicht hinaus."],
    ],
    fahrplanTitel: "So geht es weiter",
    fahrplan: [
      "FiBu lite steht bereit – kostenlos, mit neuen Fassungen über den Newsletter.",
      "SmartFormular FiBu erprobe ich als Beta mit ausgewählten Kanzleien im Memberbereich – mit Testdaten und Ihrer Rückmeldung.",
      "SmartFormular Deklaration folgt als Beta für Kanzleien, die den Jahresabschluss strukturierter vorbereiten wollen.",
    ],
    fahrplanHinweis: "Beta-Zugänge sind kostenfrei. Preise für FiBu und Deklaration erhalten Sie mit dem Angebot.",
    rechtTitel: "Daten und Recht",
    recht: [
      "FiBu lite verarbeitet alles auf Ihrem Rechner und überträgt nichts. Beta-Fassungen laufen im Memberbereich von robin.vision mit Testdaten; echte Mandanten- oder Personendaten setzen eine ausdrückliche Vereinbarung voraus. Die Daten liegen in Rechenzentren in der EU.",
      "SmartFormular erbringt keine Steuer- und keine Rechtsberatung. Ergebnisse sind Vorschläge; die Prüfung und jede Entscheidung bleiben bei Ihnen. Anbieter ist Robin James Lewis, handelnd unter robin.vision. DATEV ist eine eingetragene Marke der DATEV eG; SmartFormular steht in keiner Verbindung zur DATEV eG.",
    ],
    fragenTitel: "Fragen und Antworten",
    fragen: [
      ["Was unterscheidet FiBu lite von SmartFormular FiBu?", "FiBu lite kontiert Kontoauszüge nach dem Muster des Vormonats – kostenlos, offline. FiBu liest zusätzlich Belege, bucht Kreditoren und Debitoren, stellt die Zusammenhänge zu Ihren offenen Posten her, führt die Klärliste und zeigt die Herkunft jeder Zeile."],
      ["Brauche ich ein KI-Modell?", "Nein. SmartFormular arbeitet mit Regeln. Ein Modell lässt sich ergänzen, um Vorschläge dort zu verbessern, wo Regeln nicht reichen – in der EU, ohne Training mit Ihren Daten."],
      ["Mit welchen Programmen arbeitet SmartFormular?", "Ziel ist der Datenaustausch mit jedem Buchhaltungsprogramm – importieren und exportieren, zuerst in Deutschland, langfristig weltweit. Jedes Programm kommt über eine eigene Anbindung hinzu. Heute exportiert FiBu lite Buchungsstapel im DATEV-Format, das viele Programme einlesen; FiBu liest zum Start OPOS-Listen aus DATEV und ADDISON, weitere Programme folgen mit der Beta. Deklaration arbeitet neben Ihrem Kanzleiprogramm."],
      ["Berechnet FiBu die Umsatzsteuer-Voranmeldung?", "FiBu überschlägt sie: nach Soll- oder Ist-Versteuerung aus Kontoauszügen und Belegen, mit Zahllast oder Vorsteuerüberhang und der Herkunft jedes Betrags. Was unklar ist, etwa ein fehlender Beleg, steht in der Klärliste. Das ist eine Vorbereitung, keine Steuerberatung; übermittelt wird mit Ihrem Programm oder über Ihre Kanzlei."],
      ["Ersetzt SmartFormular Sachbearbeitende?", "Nein. Es nimmt Suchen und Abtippen ab und stellt Zusammenhänge her. Prüfen, entscheiden und festschreiben bleibt bei Ihrem Team."],
      ["Was kostet SmartFormular?", "FiBu lite ist kostenlos. Beta-Zugänge zu FiBu und Deklaration sind kostenfrei; Preise für die fertigen Produkte erhalten Sie mit dem Angebot."],
      ["Wie bekomme ich Beta-Zugang?", "Über das Formular unten. Sie erhalten einen Zugang zum Memberbereich, die Beta-Fassung mit Testdaten und einen kurzen Weg für Rückmeldungen."],
    ],
    betaTitel: "Beta-Zugang anfragen",
    betaLead: "FiBu und Deklaration entstehen gemeinsam mit Kanzleien, die sie im Alltag erproben. Ich melde mich persönlich per E-Mail.",
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
    seitentitel: "SmartFormular: bookkeeping and year-end accounts with tools that work with you – FiBu lite free | robin.vision",
    beschr: "SmartFormular by robin.vision: FiBu lite turns bank statements into booking batches in the DATEV format – free, offline in your browser. SmartFormular FiBu and Deklaration bring documents, open items and year-end accounts together. Beta access on request.",
    untertitel: "Tools for bookkeeping and year-end accounts that start the casework while you fill them in. Checking, deciding and finalising stay with you.",
    meta: "FiBu lite free · FiBu and Deklaration as a beta · for accounting firms and finance teams",
    intro: [
      "A SmartFormular looks like a familiar form – and works with you. It helps you fill it in, guarantees completeness and takes the first steps of the casework while you are still typing. Every suggestion carries its origin: document, rule, previous month or model. You check and finalise it in your accounting software.",
      "SmartFormular FiBu lite, the free Booking Batch Generator, is available today. SmartFormular FiBu and SmartFormular Deklaration follow – for the current month and for year-end accounts. I am testing both with selected firms in the member area; beta access on request.",
    ],
    liteKnopf: "Download FiBu lite for free", betaKnopf: "Request beta access",
    produkteTitel: "Three products", fertig: "Free · available", inEntwicklung: "Beta · on request",
    liteTitel: "SmartFormular FiBu lite",
    lite: [
      "The bank feed is down, the statement is only a PDF, the books have to go out: FiBu lite reads bank statements as PDF, scan, CAMT, MT940 or CSV, takes the previous month's booking batch as its template and produces one booking batch in the DATEV format per statement and month – with a totals check.",
      "A single file that runs in your browser, on Windows too. Your statements and postings never leave your computer; nothing is uploaded, no sign-up.",
    ],
    liteFakten: ["PDF, scan, CAMT, MT940, CSV", "DATEV format (EXTF)", "Offline in your browser", "Free"],
    fassung: "Version", vom: "of", laden: "Download", zurSeite: "To the tool page: terms of use, checksum, what's new",
    fibuTitel: "SmartFormular FiBu",
    fibuLead: "For the current month: FiBu turns bank statements and documents into the checked booking batch – for bank, payables and receivables – and links it to your open items. FiBu takes the searching and retyping off your hands; you check and decide.",
    fibuPunkte: [
      ["Post the bank account", "Bank statements as PDF, scan, CAMT, MT940 or CSV become the booking batch for the bank account – following your posting style. FiBu links them to your open-item lists: which payment settles which item, what remains open, where an invoice is missing."],
      ["Read and match documents", "Invoices and credit notes as PDF or e-invoice: FiBu reads amount, date, tax rate and invoice number and matches the payment – including early-payment discounts and part payments."],
      ["Post payables and receivables", "Purchase and sales invoices become the booking batch on the supplier and customer accounts – with tax rate and cost centre taken from the document and the contra account following your posting style."],
      ["Your posting style per client", "Contra account, tax key, cost centre and posting text follow the last twelve months per business partner – as a file kept with you, no model training."],
      ["A clarification list instead of guesswork", "Anything ambiguous becomes a question you answer with one click. Every line shows its origin – traceable and auditable under the German GoBD."],
      ["Estimate VAT", "For the German advance VAT return: you choose accrual or cash accounting, or your legal form, and FiBu works out from bank statements and documents the expected VAT payable or the excess input VAT to be refunded – by rate, with the origin of every amount. An estimate to prepare the return; you or your firm still prepare and file it."],
    ],
    deklTitel: "SmartFormular Deklaration",
    deklClaim: "The working paper that thinks ahead and does the groundwork.",
    deklLead: "For year-end accounts in the firm. Deklaration does the groundwork every set of accounts needs – from the prior-year comparison to the briefing for the year-end meeting. Every suggestion comes with its derivation, every decision stays with you. The result is a set of proposed closing entries and the preparation of the German e-balance sheet.",
    deklPunkte: [
      ["Prior-year figures and movements", "Every item compared with the prior year, plus movement schedules – fixed assets, provisions, loans, equity – from the trial balance and postings."],
      ["Reconcile loans", "Interest and repayments against the repayment schedule, opening and closing balances against the agreement and the bank confirmation. Differences are ready as clarification points."],
      ["Review open items", "Open receivables and payables against the trial balance, settlements after the balance sheet date, duplicates and items posted to the wrong account."],
      ["Long-outstanding receivables and payables", "Whatever has been open for years is found and prepared for valuation: age, last movement, a proposal for a write-down or write-off. The decision stays with the professional."],
      ["Calculate provisions", "Year-end and audit costs, document retention, holiday and overtime, taxes – with the calculation path and the roll-forward from the prior year."],
      ["Put the figures in proportion", "Revenue, gross profit, cost of materials, staff costs, profit and other key items as ratios, compared with the prior year and with the anomalies worth discussing."],
      ["Prepare the year-end meeting", "A briefing for the client: the key figures, changes on the prior year, open questions and the decisions that rest with the client."],
    ],
    deklGrenze: "Deklaration is software for your firm, not tax advice. File, deadlines, sign-off and transmission stay in your firm's software.",
    menschKicker: "The principle", menschTitel: "People and machine",
    mensch: [
      "SmartFormular does not post and does not declare. It prepares, marks the certainty of every line – certain, suggestion, clarification – and hands over only after your review. Quality and pace rise because your team searches less and decides more.",
    ],
    menschFakten: ["Suggestions with their origin", "A clarification list instead of silent errors", "Finalised in your software", "Judgement with the professional"],
    programmeTitel: "Open to every accounting package",
    programmeLead: "Not just DATEV: SmartFormular is being built to exchange data with every accounting package – importing and exporting, starting in Germany and in the long run worldwide. You keep your software; SmartFormular works alongside it.",
    programme: [
      ["Import and export", "Bank statements, documents, booking batches, open items and trial balances come in from your software; the results go back in the format your software imports."],
      ["A neutral data model", "Internally SmartFormular works with its own data model, independent of any package. Each package is added through its own connector – by file or interface, interfaces read-only at first. Your work in SmartFormular stays the same."],
      ["From Germany to the world", "First the packages that firms and companies in German-speaking countries use, with their charts of accounts. Then further countries with their charts of accounts, tax rules and standards for bank data and e-invoices."],
    ],
    programmeHeute: "Today FiBu lite exports booking batches in the DATEV format, which many programs import. Which packages are connected next depends on the firms and companies in the beta – tell me what you use.",
    kiTitel: "Language model: optional and under your control",
    ki: [
      ["Optional", "SmartFormular works with rules. A language model is added only where rules fall short – reading references, contracts and resolutions, or drafting texts. Calculating, reconciling and judging stay with rules and people."],
      ["No training on your data", "Your data does not train a model. The program gives the model fixed instructions per task and checks every output – schema, totals, accounts."],
      ["In the EU, no lock-in", "The model runs with a European provider of your choice or locally on your systems. The program shows which provider is involved; data leaves pseudonymised or not at all."],
    ],
    fahrplanTitel: "What comes next",
    fahrplan: [
      "FiBu lite is available – free, with new versions announced in the newsletter.",
      "I am testing SmartFormular FiBu as a beta with selected firms in the member area – with test data and your feedback.",
      "SmartFormular Deklaration follows as a beta for firms that want to prepare year-end accounts in a more structured way.",
    ],
    fahrplanHinweis: "Beta access is free of charge. Prices for FiBu and Deklaration come with the quote.",
    rechtTitel: "Data and legal",
    recht: [
      "FiBu lite processes everything on your computer and transmits nothing. Beta versions run in the robin.vision member area with test data; real client or personal data requires an explicit agreement. Data is stored in data centres in the EU.",
      "SmartFormular provides neither tax nor legal advice. Results are suggestions; review and every decision stay with you. The provider is Robin James Lewis, trading as robin.vision. DATEV is a registered trademark of DATEV eG; SmartFormular is not affiliated with DATEV eG.",
    ],
    fragenTitel: "Questions and answers",
    fragen: [
      ["What is the difference between FiBu lite and SmartFormular FiBu?", "FiBu lite posts bank statements by the previous month's pattern – free, offline. FiBu additionally reads documents, posts payables and receivables, links them to your open items, keeps the clarification list and shows the origin of every line."],
      ["Do I need an AI model?", "No. SmartFormular works with rules. A model can be added to improve suggestions where rules fall short – in the EU, without training on your data."],
      ["Which software does SmartFormular work with?", "The aim is to exchange data with every accounting package – importing and exporting, starting in Germany and in the long run worldwide. Each package is added through its own connector. Today FiBu lite exports booking batches in the DATEV format, which many programs import; at launch FiBu reads open-item lists from DATEV and ADDISON, with further packages following during the beta. Deklaration works alongside your firm's software."],
      ["Does FiBu calculate the advance VAT return?", "FiBu estimates it: on an accrual or cash basis from bank statements and documents, with the VAT payable or the excess input VAT and the origin of every amount. Anything unclear, such as a missing invoice, goes on the clarification list. It is preparation, not tax advice; the return is filed with your own software or by your firm."],
      ["Does SmartFormular replace accounting staff?", "No. It takes over searching and retyping and works out connections. Checking, deciding and finalising stay with your team."],
      ["What does SmartFormular cost?", "FiBu lite is free. Beta access to FiBu and Deklaration is free of charge; prices for the finished products come with the quote."],
      ["How do I get beta access?", "Through the form below. You receive access to the member area, the beta version with test data and a short route for feedback."],
    ],
    betaTitel: "Request beta access",
    betaLead: "FiBu and Deklaration are developed together with firms that test them in daily work. I will get back to you personally by email.",
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
<p class="untertitel">${esc(t.deklClaim)}</p>
<p>${esc(t.deklLead)}</p>
${liste(t.deklPunkte)}
<p class="hinweis">${esc(t.deklGrenze)}</p>
<section class="sf-kasten" aria-labelledby="mensch">
<p class="kicker">${esc(t.menschKicker)}</p>
<h2 id="mensch">${esc(t.menschTitel)}</h2>
${t.mensch.map(p => `<p class="frei">${esc(p)}</p>`).join("\n")}
<ul class="fakten">${t.menschFakten.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
</section>
<h2 id="programme">${esc(t.programmeTitel)}</h2>
<p>${esc(t.programmeLead)}</p>
${liste(t.programme)}
<p class="hinweis">${esc(t.programmeHeute)}</p>
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
<div><label for="b-produkt">${esc(t.felder.produkt)}</label><select id="b-produkt" name="produkt"><option value="fibu">SmartFormular FiBu</option><option value="deklaration">SmartFormular Deklaration</option><option value="beide">${esc(t.felder.beide)}</option></select></div>
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
