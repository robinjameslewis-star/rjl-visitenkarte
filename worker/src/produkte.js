// Die drei SmartFormular-Produkte (Robin, 17.10.2026) als gemeinsame Daten für die Seite „SmartFormular“ (smartformular.js), die
// Werkzeugseite (werkzeug.js, Abschnitt „Was kommt“) und die Karte auf der Startseite (tools/werkzeug-uebernehmen.mjs). Keine Importe.
// stand: "fertig" (kostenlos, verfügbar) | "beta" (auf Anfrage). href führt zur Werkzeugseite, sonst zur Beta-Anfrage. Texte aus
// Kundensicht, ohne interne Planung (Robin, 17.10.2026).
export const PRODUKTE = {
  de: [
    { id: "fibu-lite", kurz: "Kontoauszüge als PDF, Scan, CAMT, MT940 oder CSV werden zu Buchungsstapeln im DATEV-Format – offline im Browser, kostenlos.", name: "SmartFormular FiBu lite", stand: "fertig",
      text: "Der kostenlose Buchungsstapel-Generator: Kontoauszüge werden zu Buchungsstapeln im DATEV-Format, je Auszug und Monat einer – nach dem Muster des Vormonats, mit Summenprüfung. Eine Datei, läuft offline im Browser.", href: "buchungsstapel-generator/", knopf: "Zur Seite und zum Download" },
    { id: "fibu", kurz: "Belege, offene Posten und Saldenlisten zum geprüften Buchungsstapel – mit Klärliste und Herkunft je Zeile.", name: "SmartFormular FiBu", stand: "beta",
      text: "Für den laufenden Monat: FiBu bringt Kontoauszüge, Belege, offene Posten und Saldenlisten zusammen und erstellt den geprüften Buchungsstapel – mit Herkunft je Zeile und einer Klärliste für alles, was Ihre Entscheidung braucht.",
      punkte: ["Belege lesen und Zahlungen zuordnen, mit Skonto und Teilzahlungen", "Offene Posten ausziffern, Saldenlisten abstimmen", "Buchungsmuster je Mandant – als Datei bei Ihnen, ohne Modelltraining", "Klärliste und Herkunft je Zeile als Prüfprotokoll", "Umsatzsteuer-Voranmeldung überschlagen: Zahllast oder Vorsteuerüberhang nach Soll- oder Ist-Versteuerung"] },
    { id: "deklaration", kurz: "Der Jahresabschluss mit Abschlussplan, Rechenspur und E-Bilanz-Vorbereitung – für Kanzleien.", name: "SmartFormular Deklaration", stand: "beta",
      text: "Für den Jahresabschluss in der Kanzlei: Aus Vorjahresdaten, Verträgen, Beschlüssen und den Buchungen des Jahres entstehen Abschlussplan, Abschlussbuchungen mit Herleitung, Berichte und die Vorbereitung der E-Bilanz. Wahlrechte und Würdigung bleiben beim Berufsträger.",
      punkte: ["Abschlussplan: was ansteht, was aufzulösen ist", "Rechenmodule mit Rechenspur für AfA, Abgrenzungen, Rückstellungen und Steuern", "Werte aus Verträgen, Policen und Beschlüssen mit Zitat", "Abschlussmappe, Unterlagenanforderung, E-Bilanz-Vorbereitung"] },
  ],
  en: [
    { id: "fibu-lite", kurz: "Bank statements as PDF, scan, CAMT, MT940 or CSV become booking batches in the DATEV format – offline in your browser, free.", name: "SmartFormular FiBu lite", stand: "fertig",
      text: "The free Booking Batch Generator: bank statements become booking batches in the DATEV format, one per statement and month – following the previous month's pattern, with a totals check. One file, runs offline in your browser.", href: "booking-batch-generator/", knopf: "To the page and download" },
    { id: "fibu", kurz: "Documents, open items and trial balances into a checked booking batch – with a clarification list and the origin of every line.", name: "SmartFormular FiBu", stand: "beta",
      text: "For the current month: FiBu brings bank statements, documents, open items and trial balances together and produces the checked booking batch – with the origin of every line and a clarification list for everything that needs your decision.",
      punkte: ["Read documents and match payments, with discounts and part payments", "Clear open items, reconcile trial balances", "Posting patterns per client – as a file kept with you, no model training", "Clarification list and origin of every line as an audit trail", "Estimate the advance VAT return: VAT payable or refund on an accrual or cash basis"] },
    { id: "deklaration", kurz: "Year-end accounts with a closing plan, calculation trace and e-balance preparation – for accounting firms.", name: "SmartFormular Deklaration", stand: "beta",
      text: "For year-end accounts in the firm: from prior-year data, contracts, resolutions and the year's postings come the closing plan, closing entries with derivation, reports and the preparation of the e-balance sheet. Elections and judgement stay with the professional.",
      punkte: ["Closing plan: what is due, what is to be reversed", "Calculation modules with a trace for depreciation, accruals, provisions and taxes", "Values from contracts, policies and resolutions with citation", "Closing file, document request, e-balance preparation"] },
  ],
};
