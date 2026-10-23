// Rechtliche Einordnung mit amtlichen Quellen (Robin, 23.10.2026: jede rechtliche Aussage belegen und den Stand nennen). Keine Beratung:
// Das Werkzeug ordnet das Format technisch ein und nennt die Fundstelle; ob eine Rechnung steuerlich ordnungsgemäß ist, beurteilt es nicht.
// Bei neuen BMF-Schreiben oder Gesetzesänderungen: Texte und STAND hier anpassen, Fundstellen prüfen.
export const STAND = "2026-10-23";
const BMF2025 = "https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/Umsatzsteuer-Anwendungserlass/2025-10-15-einfuehrung-obligatorische-e-rechnung.pdf?__blob=publicationFile";
const BMF2026 = "https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/Umsatzsteuer-Anwendungserlass/2026-10-15-obligatorische-elektronische-rechnung.pdf?__blob=publicationFile";
const USTG14 = "https://www.gesetze-im-internet.de/ustg_1980/__14.html";
const USTG14B = "https://www.gesetze-im-internet.de/ustg_1980/__14b.html";

// Fundstellen: [Text de, Text en, Adresse]
export const Q = {
  ustg14: ["§ 14 Abs. 1 Satz 3 und 6 UStG", "Section 14(1) sentences 3 and 6 German VAT Act (UStG)", USTG14],
  ustae11: ["Abschnitt 14.1 Abs. 11–13 UStAE, gefasst durch BMF-Schreiben vom 15.10.2025", "Section 14.1(11)–(13) UStAE, as amended by the Federal Ministry of Finance (BMF) letter of 15 October 2025", BMF2025],
  ustae14: ["Abschnitt 14.1 Abs. 14 UStAE, gefasst durch BMF-Schreiben vom 15.10.2025", "Section 14.1(14) UStAE, as amended by the BMF letter of 15 October 2025", BMF2025],
  ustae2: ["Abschnitt 14.1 Abs. 2 Satz 4 Nr. 2 UStAE, gefasst durch BMF-Schreiben vom 15.10.2025", "Section 14.1(2) sentence 4 no. 2 UStAE, as amended by the BMF letter of 15 October 2025", BMF2025],
  rn6a: ["BMF-Schreiben vom 15.10.2025, Rn. 6a", "BMF letter of 15 October 2025, para. 6a", BMF2025],
  rn35a: ["BMF-Schreiben vom 15.10.2025, Rn. 35a", "BMF letter of 15 October 2025, para. 35a", BMF2025],
  rn22: ["BMF-Schreiben vom 15.10.2026, Rn. 22 und 23", "BMF letter of 15 October 2026, paras. 22 and 23", BMF2026],
  hybrid: ["Abschnitt 14.4 Abs. 3 UStAE, gefasst durch BMF-Schreiben vom 15.10.2025", "Section 14.4(3) UStAE, as amended by the BMF letter of 15 October 2025", BMF2025],
  ustg14b: ["§ 14b Abs. 1 UStG", "Section 14b(1) UStG", USTG14B],
  rn60: ["BMF-Schreiben vom 15.10.2025, Rn. 60", "BMF letter of 15 October 2025, para. 60", BMF2025],
  ustg146: ["§ 14 Abs. 1 Satz 6 Nr. 2 UStG", "Section 14(1) sentence 6 no. 2 UStG", USTG14],
};

// Antworten auf „Ist das eine E-Rechnung?“: ja | nein | eingeschraenkt; satz mit {format}; quellen
export const ANTWORT = {
  ja: { urteil: "ja", de: ["Ja, das ist eine E-Rechnung.", "{format} folgt der europäischen Norm EN 16931. Formate nach dieser Norm sind für E-Rechnungen immer zulässig."],
    en: ["Yes, this is an e-invoice.", "{format} follows the European standard EN 16931. Formats that follow this standard are always permitted for e-invoices in Germany."], quellen: ["ustg14", "ustae11"] },
  jaZugferd: { urteil: "ja", de: ["Ja, das ist eine E-Rechnung.", "Das PDF enthält die Rechnungsdaten als XML: {format}. ZUGFeRD ab Version 2.0.1 ist ein zulässiges Format – außer in den Profilen MINIMUM und BASIC WL."],
    en: ["Yes, this is an e-invoice.", "The PDF contains the invoice data as XML: {format}. ZUGFeRD from version 2.0.1 is a permitted format – except for the MINIMUM and BASIC WL profiles."], quellen: ["ustae14", "ustg14"] },
  neinProfil: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "{format}: Dieses Profil enthält nicht alle Angaben einer Rechnung. ZUGFeRD in den Profilen MINIMUM und BASIC WL ist keine E-Rechnung, sondern eine sonstige Rechnung."],
    en: ["No, this is not an e-invoice.", "{format}: this profile does not contain all the details of an invoice. ZUGFeRD in the MINIMUM and BASIC WL profiles is not an e-invoice but an \"other invoice\"."], quellen: ["ustae14"] },
  neinPdf: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "Das PDF enthält keine eingebetteten Rechnungsdaten (kein ZUGFeRD, kein Factur-X). Ein PDF ohne integrierte Datensätze ist eine sonstige Rechnung."],
    en: ["No, this is not an e-invoice.", "The PDF contains no embedded invoice data (no ZUGFeRD, no Factur-X). A PDF without integrated data is an \"other invoice\"."], quellen: ["ustae2"] },
  neinBild: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "Ein Bild (zum Beispiel ein Foto oder Scan) ist eine sonstige Rechnung, keine E-Rechnung."],
    en: ["No, this is not an e-invoice.", "An image (a photo or scan, for example) is an \"other invoice\", not an e-invoice."], quellen: ["ustae2"] },
  neinFormat: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "Die Datei ist kein lesbares Rechnungs-XML. Eine Datei mit Formatfehlern ist keine E-Rechnung, sondern eine sonstige Rechnung."],
    en: ["No, this is not an e-invoice.", "The file is not readable invoice XML. A file with format errors is not an e-invoice but an \"other invoice\"."], quellen: ["ustae2", "rn6a"] },
  neinWerte: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "{format}: Die Datei enthält Werte oder Angaben, die nicht dem vorgeschriebenen Format entsprechen – zum Beispiel ein ungültiges Datum, einen Betrag mit Buchstaben oder eine doppelte Angabe. Die offiziellen Prüfregeln lassen sich darauf nicht vollständig anwenden. Eine Datei mit Formatfehlern ist keine E-Rechnung, sondern eine sonstige Rechnung."],
    en: ["No, this is not an e-invoice.", "{format}: the file contains values or details that do not follow the required format – an invalid date, an amount with letters or a duplicated detail, for example. The official validation rules cannot be applied in full. A file with format errors is not an e-invoice but an \"other invoice\"."], quellen: ["ustae2", "rn6a"] },
  keineRechnung: { urteil: "nein", de: ["Nein, das ist keine Rechnung.", "Die Datei ist ein XML-Dokument, aber keine Rechnung und keine Gutschrift."],
    en: ["No, this is not an invoice.", "The file is an XML document, but not an invoice or credit note."], quellen: [] },
  neinZugferd1: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung nach EN 16931.", "Die Daten sind im Format ZUGFeRD 1.0 eingebettet. Zulässig ist ZUGFeRD erst ab Version 2.0.1. Ein anderes Format kann nur gelten, wenn beide Seiten es vereinbart haben und sich die Angaben vollständig übertragen lassen – das prüft dieses Werkzeug nicht."],
    en: ["No, this is not an e-invoice under EN 16931.", "The data is embedded as ZUGFeRD 1.0. ZUGFeRD is permitted from version 2.0.1. Another format can only count if both sides have agreed on it and the details can be fully transferred – this tool does not check that."], quellen: ["ustae14", "ustg146"] },
  unklar: { urteil: "eingeschraenkt", de: ["Das Format ist nicht eindeutig.", "Die Datei ist eine Rechnung in UBL oder CII, nennt aber keine bekannte Kennung der EN 16931 ({format}). Geprüft werden die Regeln der EN 16931; ob ein anderes, vereinbartes Format vorliegt, beurteilt das Werkzeug nicht."],
    en: ["The format is unclear.", "The file is an invoice in UBL or CII but gives no known EN 16931 identifier ({format}). The EN 16931 rules are checked; whether another agreed format applies is not assessed."], quellen: ["ustg14", "ustg146"] },
};

// Zusätze unter der Antwort
export const ZUSATZ = {
  geschaeftsregel: { de: "Die Prüfung hat Verstöße gegen Geschäftsregeln gefunden. Umsatzsteuerlich ist das kein Formatfehler: Die Datei bleibt grundsätzlich eine E-Rechnung. Technisch entspricht sie aber nicht der EN 16931. Betrifft ein Fehler eine Pflichtangabe nach § 14 Abs. 4 UStG, ist die Rechnung nicht ordnungsgemäß – das klären Sie im Zweifel mit Ihrer Steuerberatung.",
    en: "The check found breaches of business rules. For VAT purposes this is not a format error: the file generally remains an e-invoice. Technically, however, it does not conform to EN 16931. If an error concerns a mandatory invoice detail under section 14(4) UStG, the invoice is not in proper form – if in doubt, check this with your tax adviser.", quellen: ["rn22", "rn35a"] },
  technisch: { de: "Geprüft wird technisch: Format und Geschäftsregeln. Ob die Angaben inhaltlich stimmen, zum Beispiel der Steuersatz, prüft das Werkzeug nicht. Eine Prüfung ersetzt nicht die Kontrolle der Rechnung auf Vollständigkeit und Richtigkeit.",
    en: "The check is technical: format and business rules. Whether the details are correct, the VAT rate for example, is not checked. A validation does not replace checking the invoice for completeness and accuracy.", quellen: ["rn35a"] },
  hybrid: { de: "Bei ZUGFeRD zählen die eingebetteten Daten. Weicht das sichtbare PDF davon ab, gehen die Daten vor; die Ansicht unten zeigt die Daten.",
    en: "With ZUGFeRD the embedded data counts. If the visible PDF differs, the data takes precedence; the view below shows the data.", quellen: ["hybrid"] },
  aufbewahren: { de: "Bewahren Sie die Originaldatei auf. Diese Ansicht und ein Ausdruck ersetzen sie nicht: Bei einer E-Rechnung ist zumindest der strukturierte Teil unversehrt in seiner ursprünglichen Form aufzubewahren.",
    en: "Keep the original file. This view and a printout do not replace it: for an e-invoice, at least the structured part must be kept intact in its original form.", quellen: ["ustg14b", "rn60"] },
  altXR: { de: "Die Datei nennt eine ältere XRechnung-Fassung. Geprüft werden die Regeln der EN 16931, nicht die der aktuellen XRechnung 3.0.",
    en: "The file names an older XRechnung version. The EN 16931 rules are checked, not those of the current XRechnung 3.0.", quellen: [] },
  ohneSzenario: { de: "Für dieses Profil hat die KoSIT kein eigenes Prüfszenario. Geprüft werden die Regeln der EN 16931 (CEN); besondere Regeln dieses Profils nicht.",
    en: "KoSIT has no validation scenario of its own for this profile. The EN 16931 rules (CEN) are checked; rules specific to this profile are not.", quellen: [] },
};
