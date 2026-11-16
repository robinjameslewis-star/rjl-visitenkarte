// Die SmartFormular-Produkte (Robin, 17.10.2026; E-Rechnung lite seit 23.10.2026) als gemeinsame Daten für die Seite „SmartFormular“ (smartformular.js), die
// Werkzeugseite (werkzeug.js, Abschnitt „Was kommt“) und die Karte auf der Startseite (tools/werkzeug-uebernehmen.mjs). Keine Importe.
// stand: "fertig" (kostenlos, verfügbar) | "beta" (auf Anfrage). href führt zur Werkzeugseite, sonst zur Beta-Anfrage. Texte aus
// Kundensicht, ohne interne Planung (Robin, 17.10.2026). SmartFormular FiBu archiviert (Robin, 16.11.2026: „mach mal smartformular fibu raus,
// das macht für mich gerade keinen sinn mehr aktuell, archivieren“); Texte im Git-Verlauf und im Vault.
export const PRODUKTE = {
  de: [
    { id: "fibu-lite", kurz: "Kontoauszüge als PDF, Scan, CAMT, MT940 oder CSV werden zu Buchungsstapeln im DATEV-Format – offline im Browser, kostenlos testen bis 31.12.2026.", name: "SmartFormular FiBu lite", stand: "fertig",
      text: "Der Buchungsstapel-Generator, kostenlos testen bis 31.12.2026: Kontoauszüge werden zu Buchungsstapeln im DATEV-Format, je Auszug und Monat einer – nach dem Muster des Vormonats, mit Summenprüfung. Eine Datei, läuft offline im Browser.", href: "buchungsstapel-generator/", knopf: "Zur Seite und zum Download" },
    { id: "e-rechnung-lite", kurz: "E-Rechnungen verstehen und bezahlen: XRechnung und ZUGFeRD lesen, mit den offiziellen Regeln prüfen, per GiroCode zahlen – im Browser, kostenlos testen bis 31.12.2026.", name: "SmartFormular E-Rechnung lite", stand: "fertig",
      text: "Ist das eine E-Rechnung, was steht drin, was fehlt? XRechnung oder ZUGFeRD hineinziehen: lesbar ansehen und drucken, mit den Regeln von CEN und KoSIT prüfen, jeden Befund verständlich erklärt, per GiroCode bezahlen. Direkt auf der Seite, ohne Upload.", href: "e-rechnung-pruefen/", knopf: "Zum Werkzeug" },
    { id: "deklaration", kurz: "Das Arbeitspapier, das mitdenkt und vorarbeitet – für den Jahresabschluss in der Kanzlei.", name: "SmartFormular Abschluss", stand: "beta",
      text: "Für den Jahresabschluss in der Kanzlei, mit den Daten aus Ihrem Buchhaltungsprogramm: SmartFormular Abschluss stellt Vorjahreswerte und Entwicklungen auf, stimmt Darlehen und offene Posten ab, berechnet Rückstellungen, setzt die wichtigen Zahlen ins Verhältnis und bereitet das Abschlussgespräch vor. Wahlrechte und Würdigung bleiben beim Berufsträger.",
      punkte: ["Vorjahreswerte und Entwicklungen aufstellen", "Darlehen, offene Posten und alte Forderungen und Verbindlichkeiten prüfen", "Rückstellungen berechnen – mit Rechenweg", "Zahlen ins Verhältnis setzen, Abschlussgespräch vorbereiten"] },
  ],
  en: [
    { id: "fibu-lite", kurz: "Bank statements as PDF, scan, CAMT, MT940 or CSV become booking batches in the DATEV format – offline in your browser, free to try until 31 December 2026.", name: "SmartFormular FiBu lite", stand: "fertig",
      text: "The Booking Batch Generator, free to try until 31 December 2026: bank statements become booking batches in the DATEV format, one per statement and month – following the previous month's pattern, with a totals check. One file, runs offline in your browser.", href: "booking-batch-generator/", knopf: "To the page and download" },
    { id: "e-rechnung-lite", kurz: "Understand and pay e-invoices: read XRechnung and ZUGFeRD, check them against the official rules, pay by GiroCode – in your browser, free to try until 31 December 2026.", name: "SmartFormular E-Rechnung lite", stand: "fertig",
      text: "Is it an e-invoice, what does it say, what is missing? Drop in an XRechnung or ZUGFeRD invoice: read and print it, check it against the CEN and KoSIT rules with every finding explained, pay by GiroCode. Right on the page, no upload.", href: "e-invoice-viewer/", knopf: "To the tool" },
    { id: "deklaration", kurz: "The working paper that thinks ahead and does the groundwork – for year-end accounts in the firm.", name: "SmartFormular Abschluss", stand: "beta",
      text: "For year-end accounts in the firm, with the data from your accounting software: SmartFormular Abschluss sets out prior-year figures and movements, reconciles loans and open items, calculates provisions, puts the key figures in proportion and prepares the year-end meeting. Elections and judgement stay with the professional.",
      punkte: ["Set out prior-year figures and movements", "Check loans, open items and long-outstanding receivables and payables", "Calculate provisions – with the calculation path", "Put the figures in proportion, prepare the year-end meeting"] },
  ],
};
