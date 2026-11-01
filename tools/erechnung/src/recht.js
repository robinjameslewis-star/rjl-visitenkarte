// Rechtliche Einordnung mit amtlichen Quellen (Robin, 23.10.2026: jede rechtliche Aussage belegen und den Stand nennen). Keine Beratung:
// Das Werkzeug ordnet das Format technisch ein und nennt die Fundstelle; ob eine Rechnung steuerlich ordnungsgemäß ist, beurteilt es nicht.
// Bei neuen BMF-Schreiben oder Gesetzesänderungen: Texte und STAND hier anpassen, Fundstellen prüfen.
export const STAND = "2026-10-23";
const BMF2025 = "https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/Umsatzsteuer-Anwendungserlass/2025-10-15-einfuehrung-obligatorische-e-rechnung.pdf?__blob=publicationFile";
const BMF2026 = "https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/Umsatzsteuer-Anwendungserlass/2026-10-15-obligatorische-elektronische-rechnung.pdf?__blob=publicationFile";
const USTG14 = "https://www.gesetze-im-internet.de/ustg_1980/__14.html";
const USTG14B = "https://www.gesetze-im-internet.de/ustg_1980/__14b.html";

// Fundstellen: [Text de, Text en, Adresse]
const UA = "Umsatzsteuer-Anwendungserlass (UStAE)", B25 = "Schreiben des Bundesfinanzministeriums vom 15.10.2025", B26 = "Schreiben des Bundesfinanzministeriums vom 15.10.2026";
const UAE = "German VAT Application Decree (UStAE)", B25E = "letter of the Federal Ministry of Finance (BMF) of 15 October 2025", B26E = "letter of the Federal Ministry of Finance (BMF) of 15 October 2026";
export const Q = {
  ustg14: ["§ 14 Abs. 1 Satz 3 und 6 Umsatzsteuergesetz (UStG)", "Section 14(1) sentences 3 and 6 German VAT Act (UStG)", USTG14],
  ustae11: [`Abschnitt 14.1 Abs. 11–13 ${UA}, gefasst durch ${B25}`, `Section 14.1(11)–(13) ${UAE}, as amended by the ${B25E}`, BMF2025],
  ustae14: [`Abschnitt 14.1 Abs. 14 ${UA}, gefasst durch ${B25}`, `Section 14.1(14) ${UAE}, as amended by the ${B25E}`, BMF2025],
  ustae2: [`Abschnitt 14.1 Abs. 2 Satz 4 Nr. 2 ${UA}, gefasst durch ${B25}`, `Section 14.1(2) sentence 4 no. 2 ${UAE}, as amended by the ${B25E}`, BMF2025],
  rn6a: [`${B25}, Randnummer 6a`, `${B25E}, para. 6a`, BMF2025],
  rn35a: [`${B25}, Randnummer 35a`, `${B25E}, para. 35a`, BMF2025],
  rn22: [`${B26}, Randnummern 22 und 23`, `${B26E}, paras. 22 and 23`, BMF2026],
  hybrid: [`Abschnitt 14.4 Abs. 3 ${UA}, gefasst durch ${B25}`, `Section 14.4(3) ${UAE}, as amended by the ${B25E}`, BMF2025],
  ustg14b: ["§ 14b Abs. 1 Umsatzsteuergesetz (UStG)", "Section 14b(1) German VAT Act (UStG)", USTG14B],
  rn60: [`${B25}, Randnummer 60`, `${B25E}, para. 60`, BMF2025],
  ustg146: ["§ 14 Abs. 1 Satz 6 Nr. 2 Umsatzsteuergesetz (UStG)", "Section 14(1) sentence 6 no. 2 German VAT Act (UStG)", USTG14],
};

// Antworten auf „Ist das eine E-Rechnung?“: ja | nein | eingeschraenkt; satz mit {format}; quellen
export const ANTWORT = {
  ja: { urteil: "ja", de: ["Ja, das ist eine E-Rechnung.", "{format} ist ein Format nach der europäischen Norm EN 16931. Solche Formate sind für E-Rechnungen zulässig."],
    en: ["Yes, this is an e-invoice.", "{format} is a format based on the European standard EN 16931. Such formats are permitted for e-invoices in Germany."], quellen: ["ustg14", "ustae11"] },
  jaZugferd: { urteil: "ja", de: ["Ja, das ist eine E-Rechnung.", "Das PDF enthält die Rechnungsdaten zusätzlich als eingebettete Datei (XML): {format}. ZUGFeRD ab Version 2.0.1 ist ein zulässiges Format – außer in den Profilen MINIMUM und BASIC WL."],
    en: ["Yes, this is an e-invoice.", "The PDF also contains the invoice data as an embedded file (XML): {format}. ZUGFeRD from version 2.0.1 is a permitted format – except for the MINIMUM and BASIC WL profiles."], quellen: ["ustae14", "ustg14"] },
  neinProfil: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "{format}: ZUGFeRD gibt es in mehreren Stufen (Profilen) mit unterschiedlich vielen Angaben. Die Profile MINIMUM und BASIC WL enthalten nicht alle Rechnungsangaben; eine solche Datei ist keine E-Rechnung, sondern eine sonstige Rechnung."],
    en: ["No, this is not an e-invoice.", "{format}: ZUGFeRD comes in several levels (profiles) with different amounts of detail. The MINIMUM and BASIC WL profiles do not contain all invoice details; such a file is not an e-invoice but an \"other invoice\"."], quellen: ["ustae14"] },
  neinPdf: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "Das PDF enthält keine eingebetteten Rechnungsdaten (kein ZUGFeRD, kein Factur-X). Ein PDF ohne integrierte Datensätze ist eine sonstige Rechnung."],
    en: ["No, this is not an e-invoice.", "The PDF contains no embedded invoice data (no ZUGFeRD, no Factur-X). A PDF without integrated data is an \"other invoice\"."], quellen: ["ustae2"] },
  neinBild: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "Ein Bild (zum Beispiel ein Foto oder Scan) ist eine sonstige Rechnung, keine E-Rechnung."],
    en: ["No, this is not an e-invoice.", "An image (a photo or scan, for example) is an \"other invoice\", not an e-invoice."], quellen: ["ustae2"] },
  neinFormat: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "Eine Datei, die sich nicht als Rechnung lesen lässt, ist keine E-Rechnung, sondern eine sonstige Rechnung."],
    en: ["No, this is not an e-invoice.", "A file that cannot be read as an invoice is not an e-invoice but an \"other invoice\"."], quellen: ["ustae2", "rn6a"] },
  neinWerte: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung.", "{format}: Die Datei hat Formatfehler – Werte oder Angaben entsprechen nicht dem vorgeschriebenen Aufbau des Formats, zum Beispiel ein Datum in falscher Schreibweise, ein Betrag mit Buchstaben oder eine doppelte Angabe. Eine Datei mit Formatfehlern ist keine E-Rechnung, sondern eine sonstige Rechnung. Die Prüfregeln lassen sich darauf nicht vollständig anwenden."],
    en: ["No, this is not an e-invoice.", "{format}: the file has format errors – values or details do not follow the structure the format requires, such as a date written the wrong way, an amount with letters or a duplicated detail. A file with format errors is not an e-invoice but an \"other invoice\". The validation rules cannot be applied in full."], quellen: ["ustae2", "rn6a"] },
  keineRechnung: { urteil: "nein", de: ["Nein, das ist keine Rechnung.", ""], en: ["No, this is not an invoice.", ""], quellen: [] },
  neinZugferd1: { urteil: "nein", de: ["Nein, das ist keine E-Rechnung nach EN 16931.", "Die Daten sind im Format ZUGFeRD 1.0 eingebettet. Zulässig ist ZUGFeRD erst ab Version 2.0.1. Ein anderes Format kann nur gelten, wenn beide Seiten es vereinbart haben und sich die Angaben vollständig übertragen lassen – das prüft dieses Werkzeug nicht."],
    en: ["No, this is not an e-invoice under EN 16931.", "The data is embedded as ZUGFeRD 1.0. ZUGFeRD is permitted from version 2.0.1. Another format can only count if both sides have agreed on it and the details can be fully transferred – this tool does not check that."], quellen: ["ustae14", "ustg146"] },
  unklar: { urteil: "eingeschraenkt", de: ["Das Format ist nicht eindeutig.", "Die Datei ist eine Rechnung in UBL oder CII, nennt aber keine bekannte Kennung der EN 16931 ({format}). Geprüft werden die Regeln der EN 16931; ob ein anderes, vereinbartes Format vorliegt, beurteilt das Werkzeug nicht."],
    en: ["The format is unclear.", "The file is an invoice in UBL or CII but gives no known EN 16931 identifier ({format}). The EN 16931 rules are checked; whether another agreed format applies is not assessed."], quellen: ["ustg14", "ustg146"] },
};

// Zusätze unter der Antwort
export const ZUSATZ = {
  geschaeftsregel: { de: "Das Format stimmt, aber einige Angaben fehlen oder passen nicht zu den Regeln der Norm (Geschäftsregeln, siehe die Befunde unten). Das ist kein Formatfehler: Die Datei bleibt in der Regel eine E-Rechnung. Fehlt allerdings eine Pflichtangabe nach § 14 Abs. 4 UStG oder ist sie falsch, ist die Rechnung nicht ordnungsgemäß. Ob das hier zutrifft und ob Sie die Rechnung bis zur Berichtigung bezahlen und buchen, klären Sie im Zweifel mit Ihrer Steuerberatung.",
    en: "The format is right, but some details are missing or do not fit the rules of the standard (business rules, see the findings below). This is not a format error: as a rule, the file remains an e-invoice. If a mandatory invoice detail under section 14(4) UStG is missing or wrong, however, the invoice does not meet the legal requirements. Whether that applies here, and whether to pay and book the invoice before it is corrected, is a question for your tax adviser if in doubt.", quellen: ["rn22", "rn35a"] },
  technisch: { de: "Geprüft wird technisch: Format und Geschäftsregeln. Ob die Angaben inhaltlich stimmen, zum Beispiel der Steuersatz, prüft das Werkzeug nicht. Eine Prüfung ersetzt nicht die Kontrolle der Rechnung auf Vollständigkeit und Richtigkeit.",
    en: "The check is technical: format and business rules. Whether the details are correct, the VAT rate for example, is not checked. A validation does not replace checking the invoice for completeness and accuracy.", quellen: ["rn35a"] },
  hybrid: { de: "Ein ZUGFeRD-PDF enthält das sichtbare Rechnungsbild und zusätzlich die Rechnungsdaten für Programme. Es zählen die eingebetteten Daten; genau diese zeigt die Ansicht unten. Steht im sichtbaren PDF etwas anderes, etwa ein anderer Betrag, fragen Sie vor der Zahlung beim Rechnungssteller nach.",
    en: "A ZUGFeRD PDF contains the visible invoice image and also the invoice data for software. The embedded data counts; the view below shows exactly this data. If the visible PDF says something else, such as a different amount, ask the issuer before you pay.", quellen: ["hybrid"] },
  sonstige: { de: "„Sonstige Rechnung“ nennt das Umsatzsteuerrecht jede Rechnung, die keine E-Rechnung ist, etwa auf Papier, als einfaches PDF oder als Foto. Brauchen Sie eine E-Rechnung, bitten Sie den Rechnungssteller um eine XRechnung oder eine ZUGFeRD-Rechnung (nicht im Profil MINIMUM oder BASIC WL). Ob Sie die Rechnung so annehmen können, klären Sie im Zweifel mit Ihrer Steuerberatung.",
    en: "German VAT law calls every invoice that is not an e-invoice an \"other invoice\" (sonstige Rechnung) – on paper, as a plain PDF or as a photo, for example. If you need an e-invoice, ask the issuer for an XRechnung or a ZUGFeRD invoice (not in the MINIMUM or BASIC WL profile). Whether you can accept the invoice as it is, is a question for your tax adviser if in doubt.", quellen: ["ustae2"] },
  aufbewahren: { de: "Bewahren Sie die Originaldatei (XML-Datei oder ZUGFeRD-PDF) unverändert auf. Diese Ansicht oder ein Ausdruck ersetzen sie nicht.",
    en: "Keep the original file (XML file or ZUGFeRD PDF) unchanged. This view or a printout does not replace it.", quellen: ["ustg14b", "rn60"] },
  aufbewahrenSonst: { de: "Bewahren Sie die Originaldatei auf.", en: "Keep the original file.", quellen: [] },
  altXR: { de: "Die Datei nennt eine ältere XRechnung-Fassung. Geprüft werden die Regeln der EN 16931, nicht die der aktuellen XRechnung 3.0.",
    en: "The file names an older XRechnung version. The EN 16931 rules are checked, not those of the current XRechnung 3.0.", quellen: [] },
  ohneSzenario: { de: "Für dieses Profil hat die KoSIT kein eigenes Prüfszenario. Geprüft werden die Regeln der EN 16931 (CEN); besondere Regeln dieses Profils nicht.",
    en: "KoSIT has no validation scenario of its own for this profile. The EN 16931 rules (CEN) are checked; rules specific to this profile are not.", quellen: [] },
};
