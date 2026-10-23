// Starttexte der Werkzeugseiten von SmartFormular E-Rechnung lite (23.10.2026) für tools/werkzeug-uebernehmen.mjs – nur für die erste
// Fassung; danach gilt, was in der Redaktion steht. Die Zahlen des Abgleichs mit der offiziellen Prüfung kommen aus dem Bericht von
// tests/erechnung_regeln_test.mjs (tools/erechnung/.cache/korpus/bericht.json); ohne Bericht bleibt der Satz allgemein.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BERICHT = join(dirname(fileURLToPath(import.meta.url)), ".cache", "korpus", "bericht.json");
const b = existsSync(BERICHT) ? JSON.parse(readFileSync(BERICHT, "utf8")) : null;
const de = n => n.toLocaleString("de-DE"), en = n => n.toLocaleString("en-GB");
const BMF2025 = "https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/Umsatzsteuer-Anwendungserlass/2025-10-15-einfuehrung-obligatorische-e-rechnung.pdf?__blob=publicationFile";
const BMF2026 = "https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/Umsatzsteuer-Anwendungserlass/2026-10-15-obligatorische-elektronische-rechnung.pdf?__blob=publicationFile";

const ABGLEICH_DE = b && !b.abweichungen
  ? `Vor der Veröffentlichung wurde das Werkzeug im Browser mit der offiziellen Prüfung außerhalb des Browsers verglichen (Saxon mit denselben Regeldateien der KoSIT): ${de(b.dokumente)} Testrechnungen – die Testsammlung der KoSIT, Beispiele und Testfälle von CEN und KoSIT und gezielt veränderte Fassungen davon –, ${de(b.pruefungen)} Prüfungen, ${de(b.befundeReferenz)} Meldungen. Ergebnis: in jedem Fall dieselben Regelnummern; wo die offizielle Prüfung an ungültigen Werten scheitert, meldet auch das Werkzeug einen Formatfehler.`
  : "Vor jeder Veröffentlichung wird das Werkzeug im Browser an Tausenden Testrechnungen mit der offiziellen Prüfung außerhalb des Browsers verglichen; die Regelnummern müssen übereinstimmen.";
const ABGLEICH_EN = b && !b.abweichungen
  ? `Before publication, the tool was compared in the browser with the official validation outside the browser (Saxon with the same KoSIT rule files): ${en(b.dokumente)} test invoices – the KoSIT test suite, examples and test cases from CEN and KoSIT and deliberately altered versions of them –, ${en(b.pruefungen)} checks, ${en(b.befundeReferenz)} messages. Result: the same rule numbers in every case; where the official validation fails on invalid values, the tool reports a format error too.`
  : "Before every release, the tool is compared in the browser with the official validation outside the browser on thousands of test invoices; the rule numbers must match.";

export const START_ERECHNUNG = {
  "e-rechnung-pruefen": {
    beschreibung: `Eine E-Rechnung ist gekommen, und niemand kann sie öffnen? Oder die eigene Rechnung soll vor dem Versand stimmen? Ziehen Sie die XRechnung oder ZUGFeRD-Rechnung in das Feld: SmartFormular E-Rechnung lite sagt sofort, ob es eine E-Rechnung ist, zeigt sie lesbar, prüft sie mit den offiziellen Regeln und erklärt jeden Befund in einem Satz. Ist etwas zu zahlen, steht der GiroCode für die Banking-App bereit. Alles geschieht in diesem Browserfenster; Ihre Rechnungen verlassen den Rechner nicht.

## Was es kann

- **Ist das eine E-Rechnung?** Format (XRechnung, ZUGFeRD/Factur-X, EN 16931, Peppol), Syntax (UBL oder CII), Profil und Fassung – mit der amtlichen Fundstelle. ZUGFeRD in den Profilen MINIMUM und BASIC WL und PDFs ohne eingebettete Daten benennt es klar als keine E-Rechnung.
- **Lesbar und druckbar:** Rechnungssteller, Empfänger, Positionen, Steuer, Summen und Zahlungsangaben als übersichtliches Blatt, auf Wunsch mit den Feldnummern (BT) der Norm.
- **Geprüft mit den offiziellen Regeln:** den Geschäftsregeln der EN 16931 von CEN und den Regeln der XRechnung von der KoSIT – dieselben, die der Prüfer der KoSIT verwendet.
- **Verständliche Befunde:** je Befund Fehler, Warnung oder Hinweis, die Regelnummer, das betroffene Feld und ein Satz, was nicht stimmt und was der Rechnungssteller ändern muss.
- **Bezahlen per GiroCode:** Empfänger, IBAN, Betrag und Verwendungszweck mit Kopierknöpfen und als QR-Code für die Banking-App – nur bei gültiger IBAN, Betrag in Euro und Überweisung; sonst steht da, warum nicht.
- **Mehrere Dateien auf einmal**, Anhänge der Rechnung speichern, Prüfbericht als Datei.

## So geht es

1. Die XML-Datei oder das ZUGFeRD-PDF in das Feld oben ziehen oder auswählen – oder ein Beispiel ansehen.
2. Die Antwort lesen: E-Rechnung ja oder nein, in welchem Format.
3. Die Befunde ansehen; jeder sagt, was zu ändern ist.
4. Drucken oder den Prüfbericht speichern; bezahlen per GiroCode oder mit den kopierten Angaben.
5. Die Originaldatei aufbewahren – die Ansicht ersetzt sie nicht.

## Was geprüft wird und was nicht

Geprüft werden die Geschäftsregeln der EN 16931 (CEN, Prüfregeln 1.3.16) und bei einer XRechnung zusätzlich die Regeln der XRechnung 3.0.2 (KoSIT, Schematron 2.6.0), unverändert aus der Konfiguration des KoSIT-Prüfers vom 31.08.2026 und mit den dort festgelegten Stufen. Für ZUGFeRD-Profile ohne eigenes Szenario der KoSIT gelten die Regeln der EN 16931. Enthält eine Datei Werte im falschen Format, etwa ein Datum oder einen Betrag, lassen sich die Regeln nicht vollständig anwenden; das Werkzeug meldet das als Formatfehler.

Nicht geprüft werden das XML-Schema (der formale Aufbau der Datei), besondere Regeln anderer Umsetzungen wie Peppol und ob die Angaben inhaltlich stimmen – ob zum Beispiel der Steuersatz zur Leistung passt. Eine Validierung ersetzt nicht die Prüfung der Rechnung auf Vollständigkeit und Richtigkeit ([BMF-Schreiben vom 15.10.2025](${BMF2025}), Rn. 35a).

## Genau wie der Prüfer der KoSIT

${ABGLEICH_DE}

## Datenschutz

Die Rechnungen werden nur in Ihrem Browserfenster gelesen und geprüft. Von robin.vision werden das Werkzeug und beim ersten Prüfen die Prüfregeln geladen; Rechnungsdaten werden nicht übertragen und nicht gespeichert, es gibt kein Tracking. Eine Sicherheitsrichtlinie der Seite (Content Security Policy) erlaubt Verbindungen nur zu robin.vision. Die Datei zum Herunterladen kann gar keine Verbindung ins Internet aufbauen.

## Rechtliche Einordnung

Das Werkzeug ordnet das Format technisch ein und nennt die Fundstelle: [§ 14 UStG](https://www.gesetze-im-internet.de/ustg_1980/__14.html), Abschnitt 14.1 UStAE in der Fassung des [BMF-Schreibens vom 15.10.2025](${BMF2025}) und das [BMF-Schreiben vom 15.10.2026](${BMF2026}) zu Geschäftsregelfehlern. Stand der Rechtsangaben: 23.10.2026. Es ist keine Steuer- oder Rechtsberatung; ob eine Rechnung im Einzelfall ordnungsgemäß ist, klären Sie mit Ihrer Steuerberatung.`,
    nutzung: `Stand: 23. Oktober 2026

**Anbieter.** Robin James Lewis, Höchststr. 32, 72336 Balingen ([Impressum](https://robin.vision/#privacy)).

**Nutzung.** Sie dürfen das Werkzeug kostenlos nutzen, auf dieser Seite und als Datei, für sich selbst und in Ihrem Unternehmen oder Ihrer Kanzlei, und die unveränderte Datei weitergeben. Nicht erlaubt ist, es zu verändern, zu verkaufen oder als eigenes Angebot zu vertreiben.

**Keine Beratung, Ergebnis prüfen.** Das Werkzeug prüft technisch gegen Formate und Regeln. Es ist keine Steuer- oder Rechtsberatung und keine Prüfung der Rechnung auf inhaltliche Richtigkeit. Die rechtliche Einordnung nennt Fundstellen mit Stand; maßgeblich sind das Gesetz und die Originaldatei der Rechnung, nicht die Ansicht. Prüfen Sie vor jeder Überweisung Empfänger, IBAN und Betrag in Ihrer Banking-App.

**Gewährleistung und Haftung.** Das Werkzeug wird unentgeltlich überlassen. Ich hafte nur für Vorsatz und grobe Fahrlässigkeit, für Mängel nur, wenn ich sie arglistig verschwiegen habe. Unberührt bleibt die Haftung für Schäden aus der Verletzung von Leben, Körper oder Gesundheit und nach dem Produkthaftungsgesetz.

**Weiterentwicklung.** Ein Anspruch auf Aktualisierungen, Unterstützung oder dauerhafte Bereitstellung besteht nicht.

**Marken und Standards.** XRechnung ist ein Standard der Koordinierungsstelle für IT-Standards (KoSIT), ZUGFeRD ein Standard des Forums elektronische Rechnung Deutschland (FeRD), Factur-X dessen deutsch-französische Fassung; GiroCode bezeichnet den QR-Code für Überweisungen nach dem Standard des European Payments Council. Das Werkzeug steht in keiner Verbindung zu diesen Stellen und wird von ihnen weder geprüft noch unterstützt. Weitere genannte Namen sind Marken ihrer Inhaber.

**Lizenzen.** Das Werkzeug enthält die Prüfregeln der EN 16931 (CEN/TC 434, European Union Public Licence 1.2), die Regeln und Feldbezeichnungen der XRechnung (KoSIT, Apache License 2.0), fontoxpath, xspattern, whynot und prsc (MIT License) und die QR Code generator library von Project Nayuki (MIT License). Für diese Bestandteile gelten ihre eigenen Lizenzen; die Einschränkungen unter „Nutzung“ betreffen sie nicht. Die Lizenztexte und Quellen stehen in der Datei unter „Lizenzen und Quellen“ und in [LIZENZEN.txt](https://robin.vision/assets/erechnung/LIZENZEN.txt).

Es gilt deutsches Recht.`,
    hinweis: `An English version of this tool is available as the [e-invoice viewer and validator](https://robin.vision/werkzeuge/e-invoice-viewer/): same functions, English user interface.`,
  },
  "e-invoice-viewer": {
    beschreibung: `An e-invoice has arrived and nobody can open it? Or your own invoice needs to be right before it goes out? Drag the XRechnung or ZUGFeRD invoice into the box: SmartFormular E-Rechnung lite tells you at once whether it is an e-invoice, shows it in readable form, checks it against the official rules and explains every finding in one sentence. If there is something to pay, the GiroCode for your banking app is ready. Everything happens in this browser window; your invoices never leave your computer.

## What it does

- **Is this an e-invoice?** Format (XRechnung, ZUGFeRD/Factur-X, EN 16931, Peppol), syntax (UBL or CII), profile and version – with the legal source. It names ZUGFeRD in the MINIMUM and BASIC WL profiles, and PDFs without embedded data, clearly as not an e-invoice.
- **Readable and printable:** issuer, recipient, lines, VAT, totals and payment details as a clear page, with the standard's field numbers (BT) if you like.
- **Checked against the official rules:** the EN 16931 business rules from CEN and the XRechnung rules from KoSIT – the same rules the KoSIT validator uses.
- **Findings in plain words:** for each finding, error, warning or notice, the rule number, the field concerned and a sentence on what is wrong and what the issuer needs to change.
- **Pay by GiroCode:** payee, IBAN, amount and reference with copy buttons and as a QR code for your banking app – only with a valid IBAN, an amount in euros and credit transfer; otherwise it says why not.
- **Several files at once**, save the invoice's attachments, check report as a file.

## How it works

1. Drag the XML file or the ZUGFeRD PDF into the box above, or choose it – or try an example.
2. Read the answer: e-invoice or not, and in which format.
3. Look at the findings; each one says what to change.
4. Print or save the check report; pay by GiroCode or with the copied details.
5. Keep the original file – the view does not replace it.

## What is checked and what is not

The tool checks the EN 16931 business rules (CEN, rule set 1.3.16) and, for an XRechnung, the XRechnung 3.0.2 rules as well (KoSIT, Schematron 2.6.0), taken unchanged from the KoSIT validator configuration of 31 August 2026, with the severity levels set there. ZUGFeRD profiles without a KoSIT scenario of their own are checked against the EN 16931 rules. If a file contains values in the wrong format, such as a date or an amount, the rules cannot be applied in full; the tool reports this as a format error.

Not checked are the XML schema (the formal structure of the file), specific rules of other implementations such as Peppol, and whether the details are correct – whether the VAT rate suits the supply, for example. A validation does not replace checking the invoice for completeness and accuracy ([German Federal Ministry of Finance letter of 15 October 2025](${BMF2025}), para. 35a).

## Just like the KoSIT validator

${ABGLEICH_EN}

## Privacy

Invoices are read and checked only in your browser window. The tool, and on the first check the validation rules, are loaded from robin.vision; no invoice data is transmitted or stored, and there is no tracking. A security policy on the page (Content Security Policy) allows connections to robin.vision only. The downloadable file cannot connect to the internet at all.

## Legal classification

The tool classifies the format technically and names the source: [section 14 UStG](https://www.gesetze-im-internet.de/ustg_1980/__14.html), section 14.1 UStAE as amended by the [Federal Ministry of Finance letter of 15 October 2025](${BMF2025}), and the [letter of 15 October 2026](${BMF2026}) on business-rule errors. Legal information as of 23 October 2026. It is not tax or legal advice; whether an invoice is in proper form in a particular case is a question for your tax adviser.`,
    nutzung: `As of: 23 October 2026

**Provider.** Robin James Lewis, Höchststr. 32, 72336 Balingen, Germany ([legal notice](https://robin.vision/?lang=en#privacy)).

**Use.** You may use the tool free of charge, on this page and as a file, for yourself and in your company or practice, and pass on the unaltered file. You may not modify it, sell it or distribute it as your own offering.

**No advice, check the result.** The tool checks technically against formats and rules. It is not tax or legal advice and does not check the invoice for accuracy of content. The legal classification names sources and their date; the law and the original invoice file prevail, not the view. Before every transfer, check payee, IBAN and amount in your banking app.

**Warranty and liability.** The tool is provided free of charge. I am liable only for intent and gross negligence, and for defects only if I fraudulently concealed them. Liability for injury to life, body or health and under the German Product Liability Act remains unaffected.

**Further development.** There is no entitlement to updates, support or permanent availability.

**Trademarks and standards.** XRechnung is a standard of the German Coordination Office for IT Standards (KoSIT), ZUGFeRD a standard of the Forum elektronische Rechnung Deutschland (FeRD), and Factur-X its Franco-German counterpart; GiroCode denotes the QR code for credit transfers following the European Payments Council standard. The tool is not affiliated with these bodies and is neither reviewed nor endorsed by them. Other names mentioned are trademarks of their respective owners.

**Licences.** The tool contains the EN 16931 validation rules (CEN/TC 434, European Union Public Licence 1.2), the XRechnung rules and field labels (KoSIT, Apache License 2.0), fontoxpath, xspattern, whynot and prsc (MIT License) and the QR Code generator library by Project Nayuki (MIT License). These components are governed by their own licences; the restrictions under "Use" do not apply to them. The licence texts and sources are in the file under "Licences and sources" and in [LIZENZEN.txt](https://robin.vision/assets/erechnung/LIZENZEN.txt).

German law applies. These terms are a translation; in case of doubt, the German terms of use of [E-Rechnung prüfen](https://robin.vision/werkzeuge/e-rechnung-pruefen/#nutzungsbedingungen) apply.`,
    hinweis: `Eine deutsche Fassung des Werkzeugs gibt es unter [E-Rechnung prüfen](https://robin.vision/werkzeuge/e-rechnung-pruefen/): gleiche Funktionen, deutsche Oberfläche.`,
  },
};
