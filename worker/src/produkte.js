// Die drei SmartFormular-Produkte (Robin, 17.10.2026) als gemeinsame Daten für die Seite „SmartFormular“ (smartformular.js), die
// Werkzeugseite (werkzeug.js, Abschnitt „Was kommt“) und die Karte auf der Startseite (tools/werkzeug-uebernehmen.mjs). Keine Importe.
// stand: "fertig" (kostenlos, verfügbar) | "beta" (auf Anfrage). href führt zur Werkzeugseite, sonst zur Beta-Anfrage. Texte aus
// Kundensicht, ohne interne Planung (Robin, 17.10.2026).
export const PRODUKTE = {
  de: [
    { id: "fibu-lite", kurz: "Kontoauszüge als PDF, Scan, CAMT, MT940 oder CSV werden zu Buchungsstapeln im DATEV-Format – offline im Browser, kostenlos.", name: "SmartFormular FiBu lite", stand: "fertig",
      text: "Der kostenlose Buchungsstapel-Generator: Kontoauszüge werden zu Buchungsstapeln im DATEV-Format, je Auszug und Monat einer – nach dem Muster des Vormonats, mit Summenprüfung. Eine Datei, läuft offline im Browser.", href: "buchungsstapel-generator/", knopf: "Zur Seite und zum Download" },
    { id: "fibu", kurz: "Kontoauszüge und Belege zum geprüften Buchungsstapel – für Bank, Kreditoren und Debitoren, mit Bezug zu den offenen Posten.", name: "SmartFormular FiBu", stand: "beta",
      text: "Für den laufenden Monat: FiBu macht aus Kontoauszügen und Belegen den geprüften Buchungsstapel – für Bank, Kreditoren und Debitoren – und stellt die Zusammenhänge zu Ihren offenen Posten her. Mit Herkunft je Zeile und einer Klärliste für alles, was Ihre Entscheidung braucht.",
      punkte: ["Belege lesen und Zahlungen zuordnen, auch mit Skonto und Teilzahlungen", "Kreditoren und Debitoren buchen, mit Bezug zu den OPOS-Listen", "Ihre Buchungsweise je Mandant – als Datei bei Ihnen, ohne Modelltraining", "Klärliste und Herkunft je Zeile als Prüfprotokoll", "Umsatzsteuer-Voranmeldung überschlagen: Zahllast oder Vorsteuerüberhang nach Soll- oder Ist-Versteuerung"] },
    { id: "deklaration", kurz: "Das Arbeitspapier, das mitdenkt und vorarbeitet – für den Jahresabschluss in der Kanzlei.", name: "SmartFormular Deklaration", stand: "beta",
      text: "Für den Jahresabschluss in der Kanzlei: Deklaration stellt Vorjahreswerte und Entwicklungen auf, stimmt Darlehen und offene Posten ab, berechnet Rückstellungen, setzt die wichtigen Zahlen ins Verhältnis und bereitet das Abschlussgespräch vor. Wahlrechte und Würdigung bleiben beim Berufsträger.",
      punkte: ["Vorjahreswerte und Entwicklungen aufstellen", "Darlehen, offene Posten und alte Forderungen und Verbindlichkeiten prüfen", "Rückstellungen berechnen – mit Rechenweg", "Zahlen ins Verhältnis setzen, Abschlussgespräch vorbereiten"] },
  ],
  en: [
    { id: "fibu-lite", kurz: "Bank statements as PDF, scan, CAMT, MT940 or CSV become booking batches in the DATEV format – offline in your browser, free.", name: "SmartFormular FiBu lite", stand: "fertig",
      text: "The free Booking Batch Generator: bank statements become booking batches in the DATEV format, one per statement and month – following the previous month's pattern, with a totals check. One file, runs offline in your browser.", href: "booking-batch-generator/", knopf: "To the page and download" },
    { id: "fibu", kurz: "Bank statements and documents into a checked booking batch – for bank, payables and receivables, linked to your open items.", name: "SmartFormular FiBu", stand: "beta",
      text: "For the current month: FiBu turns bank statements and documents into the checked booking batch – for bank, payables and receivables – and links it to your open items. With the origin of every line and a clarification list for everything that needs your decision.",
      punkte: ["Read documents and match payments, including discounts and part payments", "Post payables and receivables, linked to the open-item lists", "Your posting style per client – as a file kept with you, no model training", "Clarification list and origin of every line as an audit trail", "Estimate the advance VAT return: VAT payable or refund on an accrual or cash basis"] },
    { id: "deklaration", kurz: "The working paper that thinks ahead and does the groundwork – for year-end accounts in the firm.", name: "SmartFormular Deklaration", stand: "beta",
      text: "For year-end accounts in the firm: Deklaration sets out prior-year figures and movements, reconciles loans and open items, calculates provisions, puts the key figures in proportion and prepares the year-end meeting. Elections and judgement stay with the professional.",
      punkte: ["Set out prior-year figures and movements", "Check loans, open items and long-outstanding receivables and payables", "Calculate provisions – with the calculation path", "Put the figures in proportion, prepare the year-end meeting"] },
  ],
};
