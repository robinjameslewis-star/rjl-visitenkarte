// Verständliche Erklärungen zu den Regeln der EN 16931 (CEN) und der XRechnung (KoSIT): je Regel, was nicht stimmt, und was der
// Rechnungssteller ändern muss, auf Deutsch und Englisch. Eigene Texte (keine Übersetzung der Norm); der Originaltext der Regel
// steht im Werkzeug zusätzlich unter „Originaltext“. Regeln, die hier nicht einzeln stehen, erklärt die Familie (erklaeren unten).
import { feld } from "./felder.js";

const gross = s => s.charAt(0).toUpperCase() + s.slice(1);
const f = (bt, l) => `${feld(bt, l)} (${bt})`;
// Häufigstes Muster: eine Angabe fehlt (wo: wo sie fehlt, Deutsch → Englisch)
const WO = {
  "Bei einem Nachlass": "in an allowance", "Bei einem Zuschlag": "in a charge", "Bei einem Nachlass in einer Position": "in a line allowance",
  "Bei einem Zuschlag in einer Position": "in a line charge", "In der Steueraufschlüsselung": "in the VAT breakdown", "In den Zahlungsanweisungen": "in the payment instructions",
  "Bei einem Anhang": "in an attachment", "Beim Verweis auf eine vorherige Rechnung": "in the preceding invoice reference", "Beim Steuervertreter": "for the tax representative",
  "In der Lieferanschrift": "in the delivery address", "Bei Lastschrift": "for the direct debit",
};
const fehlt = (bt, wo = "") => ({
  de: [`${wo || "Es"} fehlt die Angabe „${feld(bt, "de")}“ (${bt}).`, `${gross(feld(bt, "de"))} angeben.`],
  en: [`Missing${wo ? " " + WO[wo] : ""}: ${f(bt, "en")}.`, `Add the ${feld(bt, "en")}.`],
});
const P = { de: "In mindestens einer Rechnungsposition", en: "In at least one invoice line" };
const zeile = bt => ({ de: [`${P.de} fehlt: ${f(bt, "de")}.`, `In jeder Position ${feld(bt, "de")} angeben.`], en: [`${P.en}, this is missing: ${f(bt, "en")}.`, `Give the ${feld(bt, "en")} in every line.`] });
const paar = (de1, de2, en1, en2) => ({ de: [de1, de2], en: [en1, en2] });

export const TEXTE = {
  "BR-01": fehlt("BT-24"),
  "BR-02": fehlt("BT-1"),
  "BR-03": fehlt("BT-2"),
  "BR-04": fehlt("BT-3"),
  "BR-05": fehlt("BT-5"),
  "BR-06": fehlt("BT-27"),
  "BR-07": fehlt("BT-44"),
  "BR-08": fehlt("BG-5"),
  "BR-09": fehlt("BT-40"),
  "BR-10": fehlt("BG-8"),
  "BR-11": fehlt("BT-55"),
  "BR-12": fehlt("BT-106"),
  "BR-13": fehlt("BT-109"),
  "BR-14": fehlt("BT-112"),
  "BR-15": fehlt("BT-115"),
  "BR-16": paar("Die Rechnung hat keine einzige Rechnungsposition (BG-25).", "Mindestens eine Position mit Artikel, Menge und Betrag angeben.",
    "The invoice has no invoice line at all (BG-25).", "Add at least one line with item, quantity and amount."),
  "BR-17": paar("Ein abweichender Zahlungsempfänger (BG-10) ist angegeben, aber ohne Namen (BT-59).", "Den Namen des Zahlungsempfängers angeben.",
    "A different payee is given (BG-10) but without a name (BT-59).", "Add the payee's name."),
  "BR-18": fehlt("BT-62"),
  "BR-19": fehlt("BG-12"),
  "BR-20": fehlt("BT-69"),
  "BR-21": zeile("BT-126"),
  "BR-22": zeile("BT-129"),
  "BR-23": zeile("BT-130"),
  "BR-24": zeile("BT-131"),
  "BR-25": zeile("BT-153"),
  "BR-26": zeile("BT-146"),
  "BR-27": paar("Ein Nettopreis (BT-146) ist negativ.", "Preise positiv angeben; eine Gutschrift oder einen Abzug als eigene Position oder als Nachlass abbilden.",
    "An item net price (BT-146) is negative.", "Give prices as positive values; show credits or deductions as a separate line or as an allowance."),
  "BR-28": paar("Ein Bruttopreis (BT-148) ist negativ.", "Den Bruttopreis positiv angeben.", "An item gross price (BT-148) is negative.", "Give the gross price as a positive value."),
  "BR-29": paar("Der Abrechnungszeitraum endet vor seinem Beginn (BT-73, BT-74).", "Beginn und Ende des Abrechnungszeitraums prüfen.",
    "The invoicing period ends before it starts (BT-73, BT-74).", "Check the start and end of the invoicing period."),
  "BR-30": paar("Der Leistungszeitraum einer Position endet vor seinem Beginn (BT-134, BT-135).", "Beginn und Ende in der Position prüfen.",
    "An invoice line period ends before it starts (BT-134, BT-135).", "Check the start and end date in the line."),
  "BR-31": fehlt("BT-92", "Bei einem Nachlass"),
  "BR-32": fehlt("BT-95", "Bei einem Nachlass"),
  "BR-33": paar("Bei einem Nachlass fehlt der Grund (BT-97 oder BT-98).", "Den Grund des Nachlasses als Text oder Code angeben.",
    "An allowance has no reason (BT-97 or BT-98).", "Give the reason for the allowance as text or code."),
  "BR-36": fehlt("BT-99", "Bei einem Zuschlag"),
  "BR-37": fehlt("BT-102", "Bei einem Zuschlag"),
  "BR-38": paar("Bei einem Zuschlag fehlt der Grund (BT-104 oder BT-105).", "Den Grund des Zuschlags als Text oder Code angeben.",
    "A charge has no reason (BT-104 or BT-105).", "Give the reason for the charge as text or code."),
  "BR-41": fehlt("BT-136", "Bei einem Nachlass in einer Position"),
  "BR-42": paar("Bei einem Nachlass in einer Position fehlt der Grund (BT-139 oder BT-140).", "Den Grund als Text oder Code angeben.",
    "An invoice line allowance has no reason (BT-139 or BT-140).", "Give the reason as text or code."),
  "BR-43": fehlt("BT-141", "Bei einem Zuschlag in einer Position"),
  "BR-44": paar("Bei einem Zuschlag in einer Position fehlt der Grund (BT-144 oder BT-145).", "Den Grund als Text oder Code angeben.",
    "An invoice line charge has no reason (BT-144 or BT-145).", "Give the reason as text or code."),
  "BR-45": fehlt("BT-116", "In der Steueraufschlüsselung"),
  "BR-46": fehlt("BT-117", "In der Steueraufschlüsselung"),
  "BR-47": fehlt("BT-118", "In der Steueraufschlüsselung"),
  "BR-48": fehlt("BT-119", "In der Steueraufschlüsselung"),
  "BR-49": fehlt("BT-81", "In den Zahlungsanweisungen"),
  "BR-50": paar("Eine Überweisung ist angegeben, aber ohne IBAN oder Kontonummer (BT-84).", "Die IBAN des Kontos angeben, auf das gezahlt werden soll.",
    "A credit transfer is given but without an IBAN or account number (BT-84).", "Add the IBAN of the account to be paid into."),
  "BR-51": paar("Die Rechnung enthält eine vollständige Kartennummer (BT-87).", "Höchstens die ersten sechs und die letzten vier Ziffern zeigen.",
    "The invoice contains a full card number (BT-87).", "Show at most the first six and last four digits."),
  "BR-52": fehlt("BT-122", "Bei einem Anhang"),
  "BR-53": paar("Eine eigene Währung für die Umsatzsteuer (BT-6) ist angegeben, aber nicht die Umsatzsteuer in dieser Währung (BT-111).",
    "Den Steuerbetrag zusätzlich in der Steuerwährung angeben oder BT-6 weglassen.",
    "A separate VAT accounting currency (BT-6) is given, but not the VAT total in that currency (BT-111).", "Add the VAT total in that currency, or leave out BT-6."),
  "BR-54": paar("Bei einer Artikeleigenschaft fehlt der Name oder der Wert (BT-160, BT-161).", "Name und Wert der Eigenschaft angeben.",
    "An item attribute lacks its name or value (BT-160, BT-161).", "Give both the name and the value."),
  "BR-55": fehlt("BT-25", "Beim Verweis auf eine vorherige Rechnung"),
  "BR-56": fehlt("BT-63", "Beim Steuervertreter"),
  "BR-57": fehlt("BT-80", "In der Lieferanschrift"),
  "BR-61": paar("Für eine Überweisung fehlt die IBAN oder Kontonummer (BT-84).", "Die IBAN angeben.", "The IBAN or account number for the credit transfer is missing (BT-84).", "Add the IBAN."),
  "BR-62": paar("Bei der elektronischen Adresse des Rechnungsstellers (BT-34) fehlt die Angabe, um welche Art von Adresse es sich handelt.", "Die Art der Adresse angeben (zum Beispiel EM für E-Mail).",
    "The seller's electronic address (BT-34) lacks the scheme identifier.", "Add the scheme (for example EM for email)."),
  "BR-63": paar("Bei der elektronischen Adresse des Rechnungsempfängers (BT-49) fehlt die Angabe, um welche Art von Adresse es sich handelt.", "Die Art der Adresse angeben (zum Beispiel EM für E-Mail, 0204 für die Leitweg-ID).",
    "The buyer's electronic address (BT-49) lacks the scheme identifier.", "Add the scheme (for example EM for email, 0204 for a Leitweg-ID)."),
  "BR-64": paar("Bei einer Standard-Artikelnummer (BT-157) fehlt, nach welchem System sie vergeben ist.", "Das System angeben (zum Beispiel 0160 für GTIN).",
    "An item standard identifier (BT-157) lacks its scheme.", "Add the scheme (for example 0160 for GTIN)."),
  "BR-65": paar("Bei einer Warenklassifikation (BT-158) fehlt, nach welchem System sie vergeben ist.", "Das Klassifikationssystem angeben.",
    "An item classification (BT-158) lacks its scheme.", "Add the classification scheme."),
  "BR-CO-03": paar("Steuerdatum (BT-7) und Code für das Steuerdatum (BT-8) stehen beide in der Rechnung; erlaubt ist nur eines.", "Eine der beiden Angaben weglassen.",
    "Both the VAT point date (BT-7) and the VAT point date code (BT-8) are given; only one is allowed.", "Leave out one of them."),
  "BR-CO-04": zeile("BT-151"),
  "BR-CO-05": paar("Code und Text für den Grund eines Nachlasses passen nicht zusammen (BT-97, BT-98).", "Code und Text angleichen.",
    "The reason code and text of an allowance do not match (BT-97, BT-98).", "Make code and text consistent."),
  "BR-CO-06": paar("Code und Text für den Grund eines Zuschlags passen nicht zusammen (BT-104, BT-105).", "Code und Text angleichen.",
    "The reason code and text of a charge do not match (BT-104, BT-105).", "Make code and text consistent."),
  "BR-CO-07": paar("Code und Text für den Grund eines Nachlasses in einer Position passen nicht zusammen (BT-139, BT-140).", "Code und Text angleichen.",
    "The reason code and text of a line allowance do not match (BT-139, BT-140).", "Make code and text consistent."),
  "BR-CO-08": paar("Code und Text für den Grund eines Zuschlags in einer Position passen nicht zusammen (BT-144, BT-145).", "Code und Text angleichen.",
    "The reason code and text of a line charge do not match (BT-144, BT-145).", "Make code and text consistent."),
  "BR-CO-09": paar("Eine Umsatzsteuer-Identifikationsnummer beginnt nicht mit dem Länderkürzel (BT-31, BT-48 oder BT-63).", "Die USt-IdNr. vollständig mit Länderkürzel angeben, zum Beispiel DE123456789.",
    "A VAT identifier does not start with the country prefix (BT-31, BT-48 or BT-63).", "Give the full VAT number with its country prefix, for example DE123456789."),
  "BR-CO-10": paar("Die Summe der Positionen (BT-106) stimmt nicht mit der Summe der einzelnen Positionsbeträge (BT-131) überein.", "Summe neu berechnen lassen; meist ist eine Position gerundet oder fehlt in der Summe.",
    "The sum of line net amounts (BT-106) does not equal the total of the individual lines (BT-131).", "Have the sum recalculated; usually a line is rounded or missing from the total."),
  "BR-CO-11": paar("Die Summe der Nachlässe (BT-107) stimmt nicht mit den einzelnen Nachlässen (BT-92) überein.", "Summe der Nachlässe neu berechnen lassen.",
    "The sum of allowances (BT-107) does not equal the individual allowances (BT-92).", "Have the allowance total recalculated."),
  "BR-CO-12": paar("Die Summe der Zuschläge (BT-108) stimmt nicht mit den einzelnen Zuschlägen (BT-99) überein.", "Summe der Zuschläge neu berechnen lassen.",
    "The sum of charges (BT-108) does not equal the individual charges (BT-99).", "Have the charge total recalculated."),
  "BR-CO-13": paar("Der Gesamtbetrag ohne Umsatzsteuer (BT-109) ergibt sich nicht aus Positionen, Nachlässen und Zuschlägen.", "Den Nettobetrag neu berechnen lassen: Positionen minus Nachlässe plus Zuschläge.",
    "The total without VAT (BT-109) does not follow from lines, allowances and charges.", "Recalculate the net total: lines minus allowances plus charges."),
  "BR-CO-14": paar("Die Umsatzsteuer gesamt (BT-110) stimmt nicht mit der Summe der Steuerbeträge je Steuersatz (BT-117) überein.", "Den Steuerbetrag gesamt aus der Steueraufschlüsselung neu berechnen lassen.",
    "The VAT total (BT-110) does not equal the sum of the VAT amounts per rate (BT-117).", "Recalculate the VAT total from the VAT breakdown."),
  "BR-CO-15": paar("Der Gesamtbetrag mit Umsatzsteuer (BT-112) ist nicht netto (BT-109) plus Umsatzsteuer (BT-110).", "Den Bruttobetrag neu berechnen lassen.",
    "The total with VAT (BT-112) is not the net total (BT-109) plus VAT (BT-110).", "Recalculate the gross total."),
  "BR-CO-16": paar("Der Zahlbetrag (BT-115) ist nicht Gesamtbetrag mit Umsatzsteuer (BT-112) minus bereits gezahlt (BT-113) plus Rundung (BT-114).", "Den Zahlbetrag neu berechnen lassen.",
    "The amount due (BT-115) is not the total with VAT (BT-112) minus paid amount (BT-113) plus rounding (BT-114).", "Recalculate the amount due."),
  "BR-CO-17": paar("Ein Steuerbetrag (BT-117) passt nicht zu steuerpflichtigem Betrag (BT-116) und Steuersatz (BT-119).", "Den Steuerbetrag neu berechnen und auf Cent runden lassen.",
    "A VAT amount (BT-117) does not match the taxable amount (BT-116) and rate (BT-119).", "Recalculate the VAT amount and round it to the cent."),
  "BR-CO-18": paar("Die Rechnung hat keine Steueraufschlüsselung (BG-23).", "Je Steuersatz und Steuerkategorie den Nettobetrag und die Steuer angeben.",
    "The invoice has no VAT breakdown (BG-23).", "Give the net amount and VAT for each rate and VAT category."),
  "BR-CO-19": paar("Ein Abrechnungszeitraum (BG-14) ist angelegt, aber ohne Datum.", "Beginn, Ende oder beides angeben.", "An invoicing period (BG-14) is present but has no date.", "Give the start date, end date or both."),
  "BR-CO-20": paar("Ein Leistungszeitraum in einer Position (BG-26) ist angelegt, aber ohne Datum.", "Beginn, Ende oder beides angeben.", "An invoice line period (BG-26) is present but has no date.", "Give the start date, end date or both."),
  "BR-CO-21": paar("Bei einem Nachlass fehlt der Grund (BT-97 oder BT-98).", "Den Grund als Text oder Code angeben.", "An allowance has no reason (BT-97 or BT-98).", "Give the reason as text or code."),
  "BR-CO-22": paar("Bei einem Zuschlag fehlt der Grund (BT-104 oder BT-105).", "Den Grund als Text oder Code angeben.", "A charge has no reason (BT-104 or BT-105).", "Give the reason as text or code."),
  "BR-CO-23": paar("Bei einem Nachlass in einer Position fehlt der Grund (BT-139 oder BT-140).", "Den Grund als Text oder Code angeben.", "A line allowance has no reason (BT-139 or BT-140).", "Give the reason as text or code."),
  "BR-CO-24": paar("Bei einem Zuschlag in einer Position fehlt der Grund (BT-144 oder BT-145).", "Den Grund als Text oder Code angeben.", "A line charge has no reason (BT-144 or BT-145).", "Give the reason as text or code."),
  "BR-CO-25": paar("Der Zahlbetrag ist größer als null, aber es fehlen Fälligkeitsdatum (BT-9) und Zahlungsbedingungen (BT-20).", "Fälligkeitsdatum oder Zahlungsbedingungen angeben.",
    "The amount due is positive but there is neither a due date (BT-9) nor payment terms (BT-20).", "Give a due date or payment terms."),
  "BR-CO-26": paar("Die Rechnung nennt keine Kennung des Rechnungsstellers: weder Umsatzsteuer-Identifikationsnummer (BT-31) noch Handelsregisternummer (BT-30) noch eine andere Kennung (BT-29). Eine Steuernummer allein reicht dafür nicht.", "Mindestens eine dieser Angaben machen, meist die USt-IdNr.",
    "The invoice gives no identifier for the seller: no VAT identifier (BT-31), no commercial register number (BT-30) and no other identifier (BT-29). A tax number alone is not enough.", "Give at least one of them, usually the VAT number."),
  "BR-CL-01": paar("Der Code für die Art der Rechnung (BT-3) ist nicht zulässig.", "Einen zulässigen Code verwenden, zum Beispiel 380 für eine Rechnung oder 381 für eine Gutschrift.",
    "The invoice type code (BT-3) is not allowed.", "Use a valid code, for example 380 for an invoice or 381 for a credit note."),
  "BR-CL-03": paar("Ein Währungscode an einem Betrag ist kein gültiger Code nach ISO 4217.", "Den Währungscode korrigieren, zum Beispiel EUR.", "A currency code on an amount is not a valid ISO 4217 code.", "Correct the currency code, for example EUR."),
  "BR-CL-04": paar("Die Währung der Rechnung (BT-5) ist kein gültiger Code nach ISO 4217.", "Den Währungscode korrigieren, zum Beispiel EUR.", "The invoice currency (BT-5) is not a valid ISO 4217 code.", "Correct the currency code, for example EUR."),
  "BR-CL-05": paar("Die Währung für die Umsatzsteuer (BT-6) ist kein gültiger Code nach ISO 4217.", "Den Währungscode korrigieren.", "The VAT accounting currency (BT-6) is not a valid ISO 4217 code.", "Correct the currency code."),
  "BR-CL-06": paar("Der Code für das Steuerdatum (BT-8) ist nicht zulässig.", "Einen zulässigen Code verwenden oder die Angabe weglassen.", "The VAT point date code (BT-8) is not allowed.", "Use a valid code or leave it out."),
  "BR-CL-07": paar("Das System der Objektkennung (BT-18) ist nicht zulässig.", "Einen zulässigen Code verwenden.", "The scheme of the object identifier (BT-18) is not allowed.", "Use a valid code."),
  "BR-CL-08": paar("Der Betreff einer Bemerkung (BT-21) ist kein zulässiger Code.", "Einen zulässigen Code verwenden oder ihn weglassen.", "The subject code of a note (BT-21) is not allowed.", "Use a valid code or leave it out."),
  "BR-CL-10": paar("Das System einer Kennung (zum Beispiel bei BT-29 oder BT-46) ist kein zulässiger Code nach ISO 6523.", "Den Code des Systems korrigieren oder weglassen.",
    "The scheme of an identifier (for example BT-29 or BT-46) is not a valid ISO 6523 code.", "Correct or remove the scheme code."),
  "BR-CL-11": paar("Das System einer Registernummer (BT-30 oder BT-47) ist kein zulässiger Code nach ISO 6523.", "Den Code des Systems korrigieren oder weglassen.",
    "The scheme of a registration number (BT-30 or BT-47) is not a valid ISO 6523 code.", "Correct or remove the scheme code."),
  "BR-CL-13": paar("Das System einer Warenklassifikation (BT-158) ist nicht zulässig.", "Einen zulässigen Code verwenden.", "The scheme of an item classification (BT-158) is not allowed.", "Use a valid code."),
  "BR-CL-14": paar("Ein Ländercode ist kein gültiger Code nach ISO 3166-1.", "Den Ländercode korrigieren, zum Beispiel DE.", "A country code is not a valid ISO 3166-1 code.", "Correct the country code, for example DE."),
  "BR-CL-15": paar("Ein Ländercode ist kein gültiger Code nach ISO 3166-1.", "Den Ländercode korrigieren, zum Beispiel DE.", "A country code is not a valid ISO 3166-1 code.", "Correct the country code, for example DE."),
  "BR-CL-16": paar("Der Code der Zahlungsart (BT-81) ist nicht zulässig.", "Einen zulässigen Code verwenden, zum Beispiel 58 für SEPA-Überweisung.", "The payment means code (BT-81) is not allowed.", "Use a valid code, for example 58 for SEPA credit transfer."),
  "BR-CL-17": paar("Eine Steuerkategorie ist kein zulässiger Code.", "Einen zulässigen Code verwenden, zum Beispiel S für Umsatzsteuer zum Normal- oder ermäßigten Satz.", "A VAT category is not a valid code.", "Use a valid code, for example S for standard rated."),
  "BR-CL-18": paar("Eine Steuerkategorie ist kein zulässiger Code.", "Einen zulässigen Code verwenden, zum Beispiel S für Umsatzsteuer zum Normal- oder ermäßigten Satz.", "A VAT category is not a valid code.", "Use a valid code, for example S for standard rated."),
  "BR-CL-19": paar("Der Code für den Grund eines Nachlasses ist nicht zulässig.", "Einen zulässigen Code verwenden oder nur den Grund als Text angeben.", "An allowance reason code is not allowed.", "Use a valid code or give the reason only as text."),
  "BR-CL-20": paar("Der Code für den Grund eines Zuschlags ist nicht zulässig.", "Einen zulässigen Code verwenden oder nur den Grund als Text angeben.", "A charge reason code is not allowed.", "Use a valid code or give the reason only as text."),
  "BR-CL-21": paar("Das System einer Standard-Artikelnummer (BT-157) ist kein zulässiger Code.", "Einen zulässigen Code verwenden, zum Beispiel 0160 für GTIN.", "The scheme of an item standard identifier (BT-157) is not allowed.", "Use a valid code, for example 0160 for GTIN."),
  "BR-CL-22": paar("Der Code für den Grund der Steuerbefreiung (BT-121) ist nicht zulässig.", "Einen zulässigen Code (Liste VATEX) verwenden oder den Grund als Text angeben.", "The VAT exemption reason code (BT-121) is not allowed.", "Use a valid VATEX code or give the reason as text."),
  "BR-CL-23": paar("Eine Mengeneinheit ist kein zulässiger Code.", "Einen zulässigen Code verwenden, zum Beispiel C62 für Stück, HUR für Stunde oder LS für pauschal.", "A unit of measure is not a valid code.", "Use a valid code, for example C62 for piece, HUR for hour or LS for lump sum."),
  "BR-CL-24": paar("Der Dateityp eines Anhangs (BT-125) ist nicht zulässig.", "Den Anhang als PDF, PNG, JPEG, CSV, XLSX oder ODS anhängen.", "The file type of an attachment (BT-125) is not allowed.", "Attach it as PDF, PNG, JPEG, CSV, XLSX or ODS."),
  "BR-CL-25": paar("Die Art einer elektronischen Adresse (BT-34 oder BT-49) ist kein zulässiger Code.", "Einen zulässigen Code verwenden, zum Beispiel EM für E-Mail.", "The scheme of an electronic address (BT-34 or BT-49) is not a valid code.", "Use a valid code, for example EM for email."),
  "BR-CL-26": paar("Das System der Kennung des Lieferorts (BT-71) ist kein zulässiger Code.", "Den Code korrigieren oder weglassen.", "The scheme of the delivery location identifier (BT-71) is not allowed.", "Correct or remove the code."),
  "BR-DE-1": paar("Es fehlen Zahlungsanweisungen (BG-16): Die Rechnung sagt nicht, wie bezahlt werden soll.", "Zahlungsart angeben, bei Überweisung mit IBAN.", "Payment instructions are missing (BG-16): the invoice does not say how to pay.", "Give the payment means, with IBAN for a credit transfer."),
  "BR-DE-2": fehlt("BG-6"),
  "BR-DE-3": fehlt("BT-37"),
  "BR-DE-4": fehlt("BT-38"),
  "BR-DE-5": fehlt("BT-41"),
  "BR-DE-6": paar("Die Telefonnummer des Ansprechpartners (BT-42) fehlt oder ist leer.", "Eine vollständige Telefonnummer des Ansprechpartners angeben.", "The contact telephone number (BT-42) is missing or empty.", "Give a complete telephone number for the contact."),
  "BR-DE-7": paar("Die E-Mail-Adresse des Ansprechpartners (BT-43) fehlt oder ist leer.", "Eine E-Mail-Adresse des Ansprechpartners angeben.", "The contact email address (BT-43) is missing or empty.", "Give an email address for the contact."),
  "BR-DE-8": fehlt("BT-52"),
  "BR-DE-9": fehlt("BT-53"),
  "BR-DE-10": fehlt("BT-77", "In der Lieferanschrift"),
  "BR-DE-11": fehlt("BT-78", "In der Lieferanschrift"),
  "BR-DE-14": fehlt("BT-119", "In der Steueraufschlüsselung"),
  "BR-DE-15": paar("Es fehlt die Käuferreferenz (BT-10). Behörden nennen hier ihre Leitweg-ID, Unternehmen oft eine Bestell- oder Kostenstellennummer.", "Die Käuferreferenz eintragen; der Rechnungsempfänger nennt sie.",
    "The buyer reference (BT-10) is missing. Public bodies give their Leitweg-ID here, companies often an order or cost centre number.", "Enter the buyer reference; the buyer provides it."),
  "BR-DE-16": paar("Es fehlen Umsatzsteuer-Identifikationsnummer (BT-31) und Steuernummer (BT-32) des Rechnungsstellers.", "USt-IdNr. oder Steuernummer des Rechnungsstellers angeben.",
    "The seller's VAT identifier (BT-31) and tax number (BT-32) are both missing.", "Give the seller's VAT number or tax number."),
  "BR-DE-17": paar("Der Code für die Art der Rechnung (BT-3) ist in der XRechnung nicht vorgesehen.", "Einen der üblichen Codes verwenden: 380 Rechnung, 381 Gutschrift, 384 Rechnungskorrektur, 389 Gutschrift im Gutschriftsverfahren, 326 Teilrechnung, 875–877 Bau-Abschlags- und Schlussrechnungen.",
    "The invoice type code (BT-3) is not intended for XRechnung.", "Use one of the usual codes: 380 invoice, 381 credit note, 384 corrected invoice, 389 self-billed invoice, 326 partial invoice, 875–877 construction invoices."),
  "BR-DE-18": paar("Die Skonto-Angabe in den Zahlungsbedingungen (BT-20) hat nicht die vorgeschriebene Form.", "Skonto in dieser Form angeben: #SKONTO#TAGE=14#PROZENT=2.00# und danach einen Zeilenumbruch.",
    "The early-payment discount in the payment terms (BT-20) is not in the required form.", "Give the discount in this form: #SKONTO#TAGE=14#PROZENT=2.00# followed by a line break."),
  "BR-DE-19": paar("Die angegebene IBAN (BT-84) ist ungültig. Wichtig für die Zahlung: nicht auf diese IBAN überweisen.", "Die IBAN prüfen und korrigieren.", "The IBAN given (BT-84) is not valid. Important for payment: do not pay to this IBAN.", "Check and correct the IBAN."),
  "BR-DE-20": paar("Die IBAN des belasteten Kontos (BT-91) ist ungültig.", "Die IBAN prüfen und korrigieren.", "The IBAN of the debited account (BT-91) is not valid.", "Check and correct the IBAN."),
  "BR-DE-21": paar("Die Kennung der Spezifikation (BT-24) ist nicht die der XRechnung.", "Als Kennung urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0 verwenden.",
    "The specification identifier (BT-24) is not the XRechnung identifier.", "Use urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0."),
  "BR-DE-22": paar("Zwei Anhänge haben denselben Dateinamen.", "Jedem Anhang einen eigenen Dateinamen geben.", "Two attachments have the same file name.", "Give each attachment its own file name."),
  "BR-DE-23-a": paar("Als Zahlungsart ist Überweisung angegeben, aber ohne Kontoangaben (BG-17).", "IBAN und, wenn möglich, Kontoinhaber angeben.", "Credit transfer is given as payment means, but without account details (BG-17).", "Give the IBAN and, if possible, the account name."),
  "BR-DE-23-b": paar("Bei Überweisung stehen zusätzlich Karten- oder Lastschriftangaben in der Rechnung.", "Nur die Angaben zur gewählten Zahlungsart übermitteln.", "With credit transfer, card or direct debit details are also given.", "Send only the details for the chosen payment means."),
  "BR-DE-24-a": paar("Als Zahlungsart ist Kartenzahlung angegeben, aber ohne Kartenangaben (BG-18).", "Kartenangaben ergänzen.", "Card payment is given as payment means, but without card details (BG-18).", "Add the card details."),
  "BR-DE-24-b": paar("Bei Kartenzahlung stehen zusätzlich Überweisungs- oder Lastschriftangaben in der Rechnung.", "Nur die Angaben zur gewählten Zahlungsart übermitteln.", "With card payment, transfer or direct debit details are also given.", "Send only the details for the chosen payment means."),
  "BR-DE-25-a": paar("Als Zahlungsart ist Lastschrift angegeben, aber ohne Lastschriftangaben (BG-19).", "Mandatsreferenz, Gläubiger-ID und IBAN des belasteten Kontos angeben.", "Direct debit is given as payment means, but without direct debit details (BG-19).", "Give the mandate reference, creditor ID and IBAN of the debited account."),
  "BR-DE-25-b": paar("Bei Lastschrift stehen zusätzlich Überweisungs- oder Kartenangaben in der Rechnung.", "Nur die Angaben zur gewählten Zahlungsart übermitteln.", "With direct debit, transfer or card details are also given.", "Send only the details for the chosen payment means."),
  "BR-DE-26": paar("Eine Rechnungskorrektur (Code 384) nennt nicht die ursprüngliche Rechnung (BG-3).", "Nummer und Datum der korrigierten Rechnung angeben.", "A corrected invoice (code 384) does not name the original invoice (BG-3).", "Give the number and date of the corrected invoice."),
  "BR-DE-27": paar("Die Telefonnummer des Ansprechpartners (BT-42) fehlt oder hat weniger als drei Ziffern.", "Eine vollständige Telefonnummer angeben.", "The contact telephone number (BT-42) is missing or has fewer than three digits.", "Give a complete telephone number."),
  "BR-DE-28": paar("Die E-Mail-Adresse des Ansprechpartners (BT-43) fehlt oder sieht ungültig aus.", "Die E-Mail-Adresse prüfen.", "The contact email address (BT-43) is missing or looks invalid.", "Check the email address."),
  "BR-DE-30": fehlt("BT-90", "Bei Lastschrift"),
  "BR-DE-31": fehlt("BT-91", "Bei Lastschrift"),
  "BR-DE-TMP-32": paar("Die Rechnung nennt kein Liefer- oder Leistungsdatum (BT-72) und keinen Leistungszeitraum (BG-14 oder je Position BG-26).",
    "Liefer- oder Leistungsdatum oder den Leistungszeitraum angeben. Das ist ein Hinweis der XRechnung; unabhängig davon verlangt § 14 Abs. 4 UStG den Zeitpunkt der Leistung.",
    "The invoice gives no actual delivery date (BT-72) and no invoicing period (BG-14 or BG-26 per line).", "Give the delivery date or the period of service. This is an XRechnung notice; German VAT law also requires the date of supply."),
  "BR-TMP-2": paar("Die Adresse eines externen Dokuments (BT-124) ist keine vollständige Internetadresse.", "Eine vollständige Adresse mit https:// angeben.", "The external document location (BT-124) is not a complete web address.", "Give a full address starting with https://."),
  "BR-TMP-3": paar("Preisbasismenge oder Einheit stehen beim Brutto- und beim Nettopreis unterschiedlich (BT-149, BT-150).", "Beide Angaben gleich setzen.", "The price base quantity or unit differs between gross and net price (BT-149, BT-150).", "Make them identical."),
  "BR-TMP-4": paar("Ein Anhang hat mehr als eine Beschreibung (BT-123).", "Nur eine Beschreibung je Anhang angeben.", "An attachment has more than one description (BT-123).", "Give only one description per attachment."),
  "BR-TMP-5": paar("In einem Anhang-Eintrag stecken mehrere Dateien (BT-125).", "Für jede Datei einen eigenen Anhang anlegen.", "One attachment entry contains several files (BT-125).", "Create a separate attachment for each file."),
  "BR-TMP-6": paar("Ein Datum hat nicht das Format JJJJ-MM-TT.", "Datumsangaben im Format 2026-10-23 übermitteln.", "A date is not in the YYYY-MM-DD format.", "Send dates in the format 2026-10-23."),
  "BR-TMP-7": paar("Ein Datum hat nicht das Format JJJJMMTT mit der Formatangabe 102.", "Datumsangaben als 20261023 mit format=\"102\" übermitteln.", "A date is not in the YYYYMMDD format with format code 102.", "Send dates as 20261023 with format=\"102\"."),
  "PEPPOL-EN16931-R001": paar("Es fehlt die Angabe zum Geschäftsprozess (BT-23): eine technische Kennung, zu welchem Ablauf die Rechnung gehört.", "Den Geschäftsprozess im Rechnungsprogramm eintragen lassen; üblich ist urn:fdc:peppol.eu:2017:poacc:billing:01:1.0.",
    "The business process (BT-23) is missing: a technical identifier of the process the invoice belongs to.", "Have the business process entered in the invoicing software; the usual value is urn:fdc:peppol.eu:2017:poacc:billing:01:1.0."),
  "PEPPOL-EN16931-R005": paar("Die Währung für die Umsatzsteuer (BT-6) ist gleich der Rechnungswährung (BT-5).", "BT-6 nur angeben, wenn die Steuer in einer anderen Währung ausgewiesen wird.", "The VAT accounting currency (BT-6) equals the invoice currency (BT-5).", "Give BT-6 only if VAT is stated in a different currency."),
  "PEPPOL-EN16931-R008": paar("Die Datei enthält leere Elemente (ohne Inhalt).", "Leere Felder weglassen statt sie leer zu übermitteln.", "The file contains empty elements.", "Leave out empty fields instead of sending them empty."),
  "PEPPOL-EN16931-R010": paar("Es fehlt die elektronische Adresse des Rechnungsempfängers (BT-49): die Adresse, an die E-Rechnungen geschickt werden, etwa eine E-Mail-Adresse oder die Leitweg-ID. Eine E-Mail-Adresse an anderer Stelle der Rechnung zählt nicht.", "Die elektronische Adresse des Empfängers angeben.",
    "The buyer's electronic address (BT-49) is missing: the address e-invoices are sent to, such as an email address or the Leitweg-ID. An email address elsewhere in the invoice does not count.", "Give the buyer's electronic address."),
  "PEPPOL-EN16931-R020": paar("Es fehlt die elektronische Adresse des Rechnungsstellers (BT-34): die Adresse, unter der er E-Rechnungen empfängt, etwa eine E-Mail-Adresse. Eine E-Mail-Adresse an anderer Stelle der Rechnung zählt nicht.", "Die elektronische Adresse des Rechnungsstellers angeben.",
    "The seller's electronic address (BT-34) is missing: the address where the seller receives e-invoices, such as an email address. An email address elsewhere in the invoice does not count.", "Give the seller's electronic address."),
  "PEPPOL-EN16931-R040": paar("Ein Nachlass oder Zuschlag ist nicht Grundbetrag mal Prozentsatz.", "Betrag, Grundbetrag und Prozentsatz angleichen.", "An allowance or charge is not base amount times percentage.", "Make amount, base amount and percentage consistent."),
  "PEPPOL-EN16931-R041": paar("Bei einem Nachlass oder Zuschlag steht ein Prozentsatz ohne Grundbetrag.", "Den Grundbetrag ergänzen.", "An allowance or charge has a percentage but no base amount.", "Add the base amount."),
  "PEPPOL-EN16931-R042": paar("Bei einem Nachlass oder Zuschlag steht ein Grundbetrag ohne Prozentsatz.", "Den Prozentsatz ergänzen.", "An allowance or charge has a base amount but no percentage.", "Add the percentage."),
  "PEPPOL-EN16931-R043": paar("Bei einem Nachlass oder Zuschlag ist nicht eindeutig gekennzeichnet, ob es ein Nachlass oder ein Zuschlag ist.", "Als Kennzeichen true (Zuschlag) oder false (Nachlass) übermitteln.", "It is unclear whether an entry is an allowance or a charge.", "Send true (charge) or false (allowance)."),
  "PEPPOL-EN16931-R044": paar("Ein Zuschlag auf den Artikelpreis ist nicht erlaubt.", "Zuschläge als eigene Position oder als Zuschlag auf die Position angeben.", "A charge on the item price is not allowed.", "Show charges as a separate line or as a line charge."),
  "PEPPOL-EN16931-R046": paar("Der Nettopreis (BT-146) ist nicht Bruttopreis (BT-148) minus Rabatt (BT-147).", "Brutto-, Netto- und Rabattbetrag angleichen.", "The net price (BT-146) is not the gross price (BT-148) minus discount (BT-147).", "Make gross price, net price and discount consistent."),
  "PEPPOL-EN16931-R053": paar("Die Datei enthält mehr als eine Steuersumme mit Aufschlüsselung.", "Nur eine Steuersumme mit Aufschlüsselung übermitteln.", "The file contains more than one tax total with breakdown.", "Send only one tax total with breakdown."),
  "PEPPOL-EN16931-R054": paar("Bei abweichender Steuerwährung fehlt die zweite Steuersumme oder ist doppelt.", "Genau eine Steuersumme in der Steuerwährung angeben.", "With a separate VAT currency, the second tax total is missing or duplicated.", "Give exactly one tax total in the VAT currency."),
  "PEPPOL-EN16931-R055": paar("Die Umsatzsteuer in Rechnungs- und Steuerwährung hat unterschiedliche Vorzeichen.", "Beide Beträge mit demselben Vorzeichen angeben.", "The VAT totals in invoice and VAT currency have different signs.", "Give both amounts with the same sign."),
  "PEPPOL-EN16931-R061": fehlt("BT-89", "Bei Lastschrift"),
  "PEPPOL-EN16931-R101": paar("Ein Dokumentverweis in einer Position ist nur als Objektkennung (BT-128) erlaubt.", "Andere Verweise auf Rechnungsebene angeben.", "A document reference in a line is allowed only as an object identifier (BT-128).", "Give other references at invoice level."),
  "PEPPOL-EN16931-R110": paar("Der Leistungszeitraum einer Position beginnt vor dem Abrechnungszeitraum der Rechnung.", "Zeiträume angleichen.", "A line period starts before the invoicing period.", "Align the periods."),
  "PEPPOL-EN16931-R111": paar("Der Leistungszeitraum einer Position endet nach dem Abrechnungszeitraum der Rechnung.", "Zeiträume angleichen.", "A line period ends after the invoicing period.", "Align the periods."),
  "PEPPOL-EN16931-R120": paar("Der Nettobetrag einer Position (BT-131) ist nicht Menge mal Preis plus Zuschläge minus Nachlässe.", "Positionsbetrag neu berechnen lassen.", "A line net amount (BT-131) is not quantity times price plus charges minus allowances.", "Recalculate the line amount."),
  "PEPPOL-EN16931-R121": paar("Die Preisbasismenge (BT-149) ist nicht größer als null.", "Eine positive Preisbasismenge angeben, meist 1.", "The price base quantity (BT-149) is not above zero.", "Give a positive base quantity, usually 1."),
  "PEPPOL-EN16931-R130": paar("Die Einheit der Preisbasismenge (BT-150) unterscheidet sich von der Mengeneinheit (BT-130).", "Beide Einheiten gleich setzen.", "The price base quantity unit (BT-150) differs from the invoiced quantity unit (BT-130).", "Make both units the same."),
};
for (const k of ["PEPPOL-EN16931-R043-1", "PEPPOL-EN16931-R043-2"]) TEXTE[k] = TEXTE["PEPPOL-EN16931-R043"];
// Aufbau- und Datenformatregeln der Syntax und Regeln der XRechnung-Erweiterung, die in Testrechnungen häufig vorkommen (Abdeckung 23.10.2026)
Object.assign(TEXTE, {
  "UBL-SR-53": paar("Ein Steuerschema (PartyTaxScheme) ist angegeben, aber ohne die Umsatzsteuer-Identifikationsnummer dazu.", "Die USt-IdNr. eintragen oder das leere Steuerschema entfernen lassen.", "A tax scheme (PartyTaxScheme) is given without the VAT identifier.", "Add the VAT identifier or have the empty tax scheme removed."),
  "UBL-SR-51": paar("Eine Anschrift hat mehr als eine dritte Adresszeile.", "Nur eine dritte Adresszeile angeben.", "An address has more than one third address line.", "Give only one third address line."),
  "UBL-SR-48": paar("Eine Position hat keine oder mehr als eine Steuerkategorie.", "Jeder Position genau eine Steuerkategorie mit Steuersatz zuordnen.", "A line has no VAT category or more than one.", "Give every line exactly one VAT category with its rate."),
  "UBL-SR-07": fehlt("BT-25", "Beim Verweis auf eine vorherige Rechnung"),
  "UBL-SR-47": paar("Die Zahlungsanweisungen nennen unterschiedliche Zahlungsarten (BT-81).", "Für alle Zahlungsanweisungen dieselbe Zahlungsart angeben.", "The payment instructions give different payment means (BT-81).", "Use the same payment means in all payment instructions."),
  "UBL-SR-55": paar("Es ist mehr als ein Lastschriftmandat (BG-19) angegeben.", "Nur ein Mandat angeben.", "More than one direct debit mandate (BG-19) is given.", "Give only one mandate."),
  "UBL-SR-42": paar("Beim Rechnungssteller stehen mehr als zwei Steuerangaben (PartyTaxScheme).", "Höchstens USt-IdNr. und Steuernummer angeben.", "The seller has more than two tax entries (PartyTaxScheme).", "Give at most the VAT number and the tax number."),
  "UBL-SR-43": paar("Ein Dokumentverweis trägt ein Kennungsschema, obwohl er kein abgerechnetes Objekt ist (Dokumentart 130 oder 50).", "Das Kennungsschema entfernen oder die Dokumentart korrigieren.", "A document reference has an identifier scheme although it is not an invoiced object (document type 130 or 50).", "Remove the scheme or correct the document type."),
  "UBL-SR-44": paar("Es sind unterschiedliche Verwendungszwecke (BT-83) angegeben.", "Einen einzigen Verwendungszweck verwenden; er darf in mehreren Zahlungsanweisungen stehen.", "Different remittance information values (BT-83) are given.", "Use one single remittance information; it may appear in several payment instructions."),
  "UBL-DT-01": paar("Ein Betrag hat mehr als zwei Nachkommastellen.", "Beträge auf zwei Nachkommastellen (Cent) runden lassen.", "An amount has more than two decimals.", "Have amounts rounded to two decimals (cents)."),
  "UBL-DT-06": paar("Bei einem Anhang fehlt der Dateityp (MIME-Code).", "Den Dateityp angeben, zum Beispiel application/pdf.", "An attachment has no file type (MIME code).", "Give the file type, for example application/pdf."),
  "UBL-DT-07": paar("Bei einem Anhang fehlt der Dateiname.", "Den Dateinamen des Anhangs angeben.", "An attachment has no file name.", "Give the attachment's file name."),
  "CII-DT-097": paar("Ein Datum hat nicht das Format JJJJMMTT (Formatcode 102).", "Das Datum als JJJJMMTT angeben, zum Beispiel 20261023.", "A date is not in the format YYYYMMDD (format code 102).", "Give the date as YYYYMMDD, for example 20261023."),
  "CII-DT-037": paar("Als Steuerart ist nicht „VAT“ (Umsatzsteuer) angegeben.", "Als Steuerart VAT angeben.", "The tax type is not \"VAT\".", "Give VAT as the tax type."),
  "BR-DEX-02": paar("Der Nettobetrag einer Position (BT-131) entspricht nicht der Summe ihrer Unterpositionen.", "Die Beträge von Position und Unterpositionen abgleichen lassen.", "A line net amount (BT-131) does not equal the sum of its sub-lines.", "Have the amounts of the line and its sub-lines reconciled."),
  "BR-DEX-03": paar("Eine Unterposition (BG-DEX-01) hat nicht genau eine Steuerangabe (BG-DEX-06).", "Jeder Unterposition genau eine Steuerangabe zuordnen.", "A sub-line (BG-DEX-01) does not have exactly one VAT entry (BG-DEX-06).", "Give every sub-line exactly one VAT entry."),
  "BR-DEX-07": paar("Das Schema einer elektronischen Adresse ist nicht aus der zulässigen Liste (EAS).", "Ein zulässiges Schema angeben, zum Beispiel EM für eine E-Mail-Adresse oder 0204 für die Leitweg-ID.", "The scheme of an electronic address is not on the permitted list (EAS).", "Give a permitted scheme, for example EM for an email address or 0204 for the Leitweg-ID."),
  "BR-DEX-09": paar("Der Zahlbetrag (BT-115) stimmt nicht: Er muss Bruttobetrag (BT-112) minus bereits gezahlt (BT-113) plus Rundung (BT-114) plus Zahlungen Dritter (BT-DEX-002) sein.", "Den Zahlbetrag neu berechnen lassen.", "The amount due (BT-115) is wrong: it must be the total with VAT (BT-112) minus the amount paid (BT-113) plus rounding (BT-114) plus third-party payments (BT-DEX-002).", "Have the amount due recalculated."),
  "BR-DEX-10": paar("Bei einer Zahlung durch Dritte fehlt die Art der Zahlung (BT-DEX-001).", "Die Art der Zahlung angeben.", "For a third-party payment, the payment type (BT-DEX-001) is missing.", "Give the payment type."),
  "BR-DEX-11": paar("Bei einer Zahlung durch Dritte fehlt der Betrag (BT-DEX-002).", "Den Betrag angeben.", "For a third-party payment, the amount (BT-DEX-002) is missing.", "Give the amount."),
  "BR-DEX-12": paar("Bei einer Zahlung durch Dritte fehlt die Beschreibung (BT-DEX-003).", "Die Beschreibung angeben.", "For a third-party payment, the description (BT-DEX-003) is missing.", "Give the description."),
  "BR-DEX-14": paar("Die Währung einer Zahlung durch Dritte (BT-DEX-002) weicht von der Rechnungswährung (BT-5) ab.", "Dieselbe Währung wie die Rechnung verwenden.", "The currency of a third-party payment (BT-DEX-002) differs from the invoice currency (BT-5).", "Use the invoice currency."),
  "BR-DEX-15": paar("Die Datei scheint Unterpositionen zu verwenden; die XRechnung sieht das in der Syntax CII nicht vor.", "Die Positionen ohne Unterpositionen übermitteln.", "The file appears to use sub-lines; XRechnung does not support them in the CII syntax.", "Send the lines without sub-lines."),
});
// Kennungsschemata nach ISO 6523 (BR-DEX-04, -05, -06, -08)
for (const k of ["BR-DEX-04", "BR-DEX-05", "BR-DEX-06", "BR-DEX-08"]) TEXTE[k] = paar("Das Schema einer Kennung ist nicht aus der zulässigen Liste (ISO 6523).", "Ein zulässiges Schema angeben, zum Beispiel 0088 für eine GLN oder 0204 für die Leitweg-ID.",
  "The scheme of an identifier is not on the permitted list (ISO 6523).", "Give a permitted scheme, for example 0088 for a GLN or 0204 for the Leitweg-ID.");


// Steuerkategorien und ihre Regelfamilien (BR-S-01 … BR-AG-10): je Familie gleiche Nummern mit gleicher Bedeutung
const KATEGORIEN = {
  S: ["S", "Umsatzsteuer zum Normal- oder ermäßigten Satz", "standard rated"], Z: ["Z", "Nullsatz", "zero rated"], E: ["E", "steuerbefreit", "exempt from VAT"],
  AE: ["AE", "Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge)", "reverse charge"], IC: ["K", "innergemeinschaftliche Lieferung", "intra-community supply"],
  G: ["G", "Ausfuhr außerhalb der EU", "export outside the EU"], O: ["O", "nicht steuerbar", "not subject to VAT"], AF: ["L", "IGIC (Kanarische Inseln)", "IGIC (Canary Islands)"],
  AG: ["M", "IPSI (Ceuta und Melilla)", "IPSI (Ceuta and Melilla)"], B: ["B", "Split Payment (Italien)", "split payment (Italy)"],
};
export const STEUERKATEGORIE = Object.fromEntries(Object.values(KATEGORIEN).map(([code, de, en]) => [code, [de, en]]));

function familie(fam, nr) {
  const k = KATEGORIEN[fam];
  if (!k) return null;
  const [code, de, en] = k, K = `„${de}“ (${code})`, KE = `"${en}" (${code})`;
  const ids = { AE: [" und die USt-IdNr. des Empfängers (BT-48)", " and the buyer's VAT number (BT-48)"], IC: [" und die USt-IdNr. des Empfängers (BT-48)", " and the buyer's VAT number (BT-48)"] }[fam] || ["", ""];
  const wo = { 2: ["Positionen", "lines"], 3: ["ein Nachlass", "an allowance"], 4: ["ein Zuschlag", "a charge"], 5: ["eine Position", "a line"], 6: ["ein Nachlass", "an allowance"], 7: ["ein Zuschlag", "a charge"] }[nr];
  const satzPflicht = { S: ["muss größer als null sein", "must be above zero"], AF: ["muss null oder größer sein", "must be zero or more"], AG: ["muss null oder größer sein", "must be zero or more"], O: ["darf nicht angegeben sein", "must not be given"] }[fam] || ["muss 0 sein", "must be 0"];
  const befreit = ["E", "AE", "IC", "G", "O"].includes(fam);
  switch (nr) {
    case 1: return paar(`Positionen, Nachlässe oder Zuschläge nutzen die Steuerkategorie ${K}, die Steueraufschlüsselung (BG-23) führt sie aber nicht richtig.`, `In der Steueraufschlüsselung eine Zeile für ${code} angeben${fam === "S" ? " (je Steuersatz eine)" : " (genau eine)"}.`,
      `Lines, allowances or charges use the VAT category ${KE}, but the VAT breakdown (BG-23) does not list it correctly.`, `Add a VAT breakdown entry for ${code}${fam === "S" ? " (one per rate)" : " (exactly one)"}.`);
    case 2: case 3: case 4:
      if (fam === "O") return paar(`${gross(wo[0])} mit ${K}: Die Rechnung darf dann keine Umsatzsteuer-Identifikationsnummern enthalten (BT-31, BT-48, BT-63).`, "USt-IdNr. entfernen oder die Steuerkategorie prüfen.",
        `${gross(wo[1])} with ${KE}: the invoice must then not contain VAT numbers (BT-31, BT-48, BT-63).`, "Remove the VAT numbers or check the VAT category.");
      return paar(`Für ${wo[0]} mit ${K} fehlt die USt-IdNr. oder Steuernummer des Rechnungsstellers (BT-31, BT-32)${ids[0]}.`, `Die fehlenden Nummern angeben.`,
        `For ${wo[1]} with ${KE}, the seller's VAT number or tax number (BT-31, BT-32)${ids[1]} is missing.`, "Add the missing numbers.");
    case 5: case 6: case 7:
      return paar(`Für ${wo[0]} mit ${K} stimmt der Steuersatz nicht: Er ${satzPflicht[0]}.`, "Steuersatz oder Steuerkategorie korrigieren.", `For ${wo[1]} with ${KE} the VAT rate is wrong: it ${satzPflicht[1]}.`, "Correct the VAT rate or category.");
    case 8: return paar(`Der steuerpflichtige Betrag für ${K} in der Steueraufschlüsselung (BT-116) stimmt nicht mit Positionen, Nachlässen und Zuschlägen dieser Kategorie überein.`, "Die Beträge neu berechnen lassen; oft ist eine Position der falschen Kategorie oder dem falschen Satz zugeordnet.",
      `The taxable amount for ${KE} in the VAT breakdown (BT-116) does not match the lines, allowances and charges of that category.`, "Have the amounts recalculated; often a line has the wrong category or rate.");
    case 9: return befreit || fam === "Z"
      ? paar(`Bei ${K} muss der Steuerbetrag in der Steueraufschlüsselung (BT-117) 0 sein.`, "Steuerbetrag auf 0 setzen oder die Steuerkategorie prüfen.", `With ${KE} the VAT amount in the breakdown (BT-117) must be 0.`, "Set the VAT amount to 0 or check the category.")
      : paar(`Der Steuerbetrag für ${K} (BT-117) ist nicht steuerpflichtiger Betrag mal Steuersatz.`, "Den Steuerbetrag neu berechnen und auf Cent runden lassen.", `The VAT amount for ${KE} (BT-117) is not taxable amount times rate.`, "Recalculate the VAT amount and round it to the cent.");
    case 10: return befreit
      ? paar(`Die Rechnung weist keine Umsatzsteuer aus – Steuerkategorie ${K} –, nennt aber keinen Grund dafür (BT-120 oder BT-121).`, "Den Grund angeben, zum Beispiel die Vorschrift des Umsatzsteuergesetzes, nach der keine Steuer berechnet wird.", `The invoice shows no VAT – category ${KE} – but gives no reason (BT-120 or BT-121).`, "Give the reason, for example the provision of the VAT Act under which no VAT is charged.")
      : paar(`Bei ${K} darf kein Grund für eine Steuerbefreiung angegeben sein (BT-120, BT-121).`, "Den Befreiungsgrund entfernen.", `With ${KE} no exemption reason may be given (BT-120, BT-121).`, "Remove the exemption reason.");
    case 11: if (fam === "IC") return paar("Bei einer innergemeinschaftlichen Lieferung fehlen Lieferdatum (BT-72) und Abrechnungszeitraum (BG-14).", "Lieferdatum oder Zeitraum angeben.", "For an intra-community supply, the delivery date (BT-72) and invoicing period (BG-14) are missing.", "Give the delivery date or period.");
      if (fam === "O") return paar("Neben „nicht steuerbar“ stehen weitere Steuerkategorien in der Steueraufschlüsselung.", "Eine nicht steuerbare Leistung getrennt abrechnen.", "Other VAT categories appear next to \"not subject to VAT\".", "Invoice non-taxable supplies separately.");
      break;
    case 12: if (fam === "IC") return paar("Bei einer innergemeinschaftlichen Lieferung fehlt das Land der Lieferanschrift (BT-80).", "Das Lieferland angeben.", "For an intra-community supply, the deliver-to country (BT-80) is missing.", "Give the country of delivery.");
      // falls through
    case 13: case 14:
      if (fam === "O") return paar("Neben „nicht steuerbar“ stehen Positionen, Nachlässe oder Zuschläge mit anderer Steuerkategorie.", "Eine nicht steuerbare Leistung getrennt abrechnen.", "Lines, allowances or charges with other VAT categories appear next to \"not subject to VAT\".", "Invoice non-taxable supplies separately.");
  }
  return null;
}

// Erklärung zu einem Befund: [was, tun] in der gewünschten Sprache; englisch = Originaltext der Regel
export function erklaeren(id, englisch, lang) {
  const l = lang === "en" ? "en" : "de";
  if (TEXTE[id]) return TEXTE[id][l];
  const m = /^BR-([A-Z]+)-(\d+)$/.exec(id);
  if (m) { const x = familie(m[1], +m[2]); if (x) return x[l]; }
  const dec = /^BR-DEC-\d+$/.test(id) && (String(englisch).match(/\b(BT-\d+)\b/) || [])[1];
  if (dec) return l === "de"
    ? [`Der Betrag „${feld(dec, "de")}“ (${dec}) hat mehr Nachkommastellen als erlaubt.`, "Den Betrag auf zwei Nachkommastellen (Cent) runden lassen."]
    : [`The amount "${feld(dec, "en")}" (${dec}) has more decimals than allowed.`, "Have the amount rounded to two decimals (cents)."];
  englisch = String(englisch).replace(/^\s*\[[^\]]+\]\s*-?\s*/, "");
  const element = (englisch.match(/(?:should not include (?:the |an? )?|should not be present[: ]*|^)([A-Z][A-Za-z]+(?:\/[A-Za-z:@]+)*)\s+(?:should not be present|shall occur maximum once|must not be present)?/) || [])[1] || "";
  if (/^(UBL-CR|CII-SR)-/.test(id) || (/^(UBL|CII)-DT-/.test(id) && /should not be present|shall not be used|must not be present/.test(englisch))) return l === "de"
    ? [`Die Datei enthält eine Angabe, die die EN 16931 nicht vorsieht${element ? ` (${element})` : ""}.`, "Die Angabe weglassen oder an der dafür vorgesehenen Stelle übermitteln. Empfänger dürfen sie übergehen."]
    : [`The file contains information that EN 16931 does not provide for${element ? ` (${element})` : ""}.`, "Leave it out or send it in the intended field. Recipients may ignore it."];
  if (/^UBL-SR-/.test(id)) return l === "de"
    ? [/maximum once|more than once/.test(englisch) ? "Eine Angabe kommt öfter vor als erlaubt." : "Die Datei verletzt eine Aufbauregel der UBL-Syntax.", "Den Aufbau im Rechnungsprogramm korrigieren lassen."]
    : [/maximum once|more than once/.test(englisch) ? "An element occurs more often than allowed." : "The file breaks a structural rule of the UBL syntax.", "Have the structure corrected in the invoicing software."];
  if (/^(UBL|CII)-DT-/.test(id)) return l === "de"
    ? ["Ein Datenformat oder Attribut entspricht nicht den Vorgaben der EN 16931.", "Das Format der Angabe im Rechnungsprogramm korrigieren lassen."]
    : ["A data format or attribute does not meet the EN 16931 requirements.", "Have the format corrected in the invoicing software."];
  if (/^BR-DEX-/.test(id)) return l === "de" ? ["Eine Regel der XRechnung-Erweiterung (Extension) ist verletzt.", "Die Angaben der Erweiterung prüfen."] : ["A rule of the XRechnung extension is broken.", "Check the extension details."];
  if (/CVD/.test(id)) return l === "de" ? ["Eine Angabe zu sauberen Fahrzeugen (Clean Vehicles Directive) fehlt oder ist unzulässig.", "Die Fahrzeugangaben nach den Vorgaben der XRechnung CVD ergänzen."] : ["A Clean Vehicles Directive detail is missing or invalid.", "Complete the vehicle details as XRechnung CVD requires."];
  return l === "de" ? ["Eine Prüfregel ist verletzt (Originaltext unten).", "Den Hinweis an den Rechnungssteller weitergeben."] : ["A validation rule is broken (original text below).", "Pass the notice on to the issuer of the invoice."];
}
