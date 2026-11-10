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
  ? `Vor der Veröffentlichung wurde das Werkzeug mit der Prüfung verglichen, die auch das Prüfprogramm der KoSIT verwendet – dieselben Regeldateien, ausgewertet außerhalb des Browsers: ${de(b.dokumente)} Testrechnungen (die Testsammlung der KoSIT, Beispiele und Testfälle von CEN und KoSIT und gezielt veränderte Fassungen davon), ${de(b.pruefungen)} Prüfungen, ${de(b.befundeReferenz)} Meldungen. Ergebnis: bei allen Testrechnungen dieselben Regelnummern. Abgeglichen sind die Regeln, nicht das ganze Prüfprogramm: Das prüft zusätzlich das XML-Schema, das Werkzeug nicht. Wo die Prüfung außerhalb des Browsers an ungültigen Werten scheitert, meldet auch das Werkzeug einen Formatfehler.`
  : "Vor jeder Veröffentlichung wird das Werkzeug an Tausenden Testrechnungen mit der Prüfung verglichen, die auch das Prüfprogramm der KoSIT verwendet; die Regelnummern müssen übereinstimmen.";
const ABGLEICH_EN = b && !b.abweichungen
  ? `Before publication, the tool was compared with the validation the KoSIT validator uses – the same rule files, run outside the browser: ${en(b.dokumente)} test invoices (the KoSIT test suite, examples and test cases from CEN and KoSIT and deliberately altered versions of them), ${en(b.pruefungen)} checks, ${en(b.befundeReferenz)} messages. Result: the same rule numbers for every test invoice. What was compared are the rules, not the whole validator: it also checks the XML schema, which the tool does not. Where the validation outside the browser fails on invalid values, the tool reports a format error too.`
  : "Before every release, the tool is compared on thousands of test invoices with the validation the KoSIT validator uses; the rule numbers must match.";

export const START_ERECHNUNG = {
  "e-rechnung-pruefen": {
    beschreibung: `Eine E-Rechnung ist gekommen, und niemand kann sie öffnen? Oder Sie wollen Ihre eigene E-Rechnung vor dem Versand auf Fehler prüfen? Ziehen Sie die XRechnung oder ZUGFeRD-Rechnung in das Feld: SmartFormular E-Rechnung lite sagt, ob es eine E-Rechnung ist, zeigt sie lesbar, prüft sie mit den offiziellen Regeln und erklärt jeden Befund in einfachen Worten. Ist etwas zu zahlen, steht der GiroCode für die Banking-App bereit. Alles geschieht in diesem Browserfenster; Ihre Rechnungen verlassen den Rechner nicht.

## Was es kann

- **Ist das eine E-Rechnung?** Das Werkzeug antwortet mit Ja oder Nein und nennt das Format, zum Beispiel XRechnung oder ZUGFeRD, mit der Fundstelle im Gesetz. ZUGFeRD in den einfachen Stufen MINIMUM und BASIC WL und PDFs ohne eingebettete Rechnungsdaten erkennt es als keine E-Rechnung.
- **Lesbar und druckbar:** Rechnungssteller, Empfänger, Positionen, Steuer, Summen und Zahlungsangaben als übersichtliches Blatt, auf Wunsch mit den Feldnummern der Norm.
- **Geprüft mit den offiziellen Regeln:** den Regeln der europäischen Norm EN 16931 vom Europäischen Komitee für Normung (CEN) und den Regeln der XRechnung von der Koordinierungsstelle für IT-Standards (KoSIT) – dieselben, die das Prüfprogramm der KoSIT verwendet.
- **Verständliche Befunde:** je Befund die Stufe (Fehler, Warnung oder Hinweis), die Regelnummer und in einfachen Worten, was nicht stimmt und was der Rechnungssteller ändern muss.
- **Bezahlen per GiroCode:** Empfänger, IBAN, Betrag und Verwendungszweck mit Kopierknöpfen und als QR-Code für die Banking-App – nur bei gültiger IBAN, Betrag in Euro und Überweisung; andernfalls nennt das Werkzeug den Grund.
- **Außerdem:** mehrere Dateien auf einmal prüfen, Anhänge der Rechnung speichern, den Prüfbericht als Datei sichern.
- **E-Rechnungen erstellen:** Im Reiter „Erstellen“ schreiben Sie eine XRechnung (Syntax UBL). Ihre Firmendaten geben Sie einmal ein, dann Empfänger, Leistung und Positionen. Empfänger merkt sich das Werkzeug beim Speichern, häufige Positionen kommen in einen Katalog; beim Tippen erscheinen Vorschläge. Beide Listen lassen sich auch als CSV-Datei einlesen. Bei Bedarf schreiben Sie eine Abschlags-, Dauer- oder Stornorechnung oder nehmen eine frühere Rechnung als Vorlage für die Folgerechnung. Vor dem Speichern prüft das Werkzeug die Datei mit denselben offiziellen Regeln; mit Fehlern wird nicht gespeichert. Dazu gibt es eine Ansicht zum Drucken mit GiroCode. Nicht enthalten sind ein Archiv, Schlussrechnungen, ZUGFeRD und besondere Fälle wie die Steuerschuldnerschaft des Leistungsempfängers. Das Werkzeug archiviert nicht: Die gespeicherte XML-Datei ist das Original – bewahren Sie sie auf. Es ist keine Steuerberatung.

## So geht es

1. Die XML-Datei oder das ZUGFeRD-PDF in das Feld oben ziehen oder auswählen – oder ein Beispiel ansehen.
2. Die Antwort lesen: E-Rechnung ja oder nein, in welchem Format.
3. Die Befunde ansehen. Haben Sie die Rechnung bekommen, schicken Sie den Prüfbericht an den Rechnungssteller; bei Ihrer eigenen Rechnung ergänzen Sie die Angaben in Ihrem Rechnungsprogramm oder im Reiter „Erstellen“.
4. Drucken oder den Prüfbericht speichern; bezahlen per GiroCode oder mit den kopierten Angaben.
5. Die Originaldatei aufbewahren – die Ansicht ersetzt sie nicht.

## Was geprüft wird und was nicht

Kurz gesagt: Das Werkzeug prüft, ob alle nötigen Angaben vorhanden sind und zusammenpassen – die Geschäftsregeln der Norm. Ob die Angaben inhaltlich stimmen, etwa der Steuersatz, prüft es nicht.

Jeder Befund hat eine Stufe: **Fehler** – die Rechnung verletzt eine Regel, der Rechnungssteller sollte sie berichtigen; **Warnung** – bitte prüfen, die Rechnung kann trotzdem in Ordnung sein; **Hinweis** – nur zur Information.

Findet das Werkzeug Werte im falschen Format, etwa ein Datum in falscher Schreibweise, meldet es einen **Formatfehler**. Eine Datei mit Formatfehlern ist keine E-Rechnung. Fehlende oder unstimmige Angaben (Verstöße gegen Geschäftsregeln) sind dagegen kein Formatfehler.

Nicht geprüft wird das XML-Schema, also der formale Aufbau der Datei in allen Einzelheiten; Formatfehler, die nur dort auffallen, erkennt das Werkzeug nicht. Eine Prüfung ersetzt nicht die Kontrolle der Rechnung auf Vollständigkeit und Richtigkeit ([Schreiben des Bundesfinanzministeriums vom 15.10.2025](${BMF2025}), Randnummer 35a).

**Für Fachleute:** Geprüft werden die Geschäftsregeln der EN 16931 (CEN, Prüfregeln 1.3.16) und bei einer XRechnung zusätzlich die Regeln der XRechnung 3.0.2 (KoSIT, Schematron 2.6.0), unverändert aus der Konfiguration des KoSIT-Prüfprogramms vom 31.08.2026 und mit den dort festgelegten Stufen. Zur XRechnung gehören auch einige Regeln, deren Name mit PEPPOL beginnt. Für ZUGFeRD-Profile ohne eigenes Prüfszenario der KoSIT gelten die Regeln der EN 16931. Nicht geprüft werden die besonderen Regeln anderer Umsetzungen, etwa die vollständigen Regeln von Peppol BIS.

## Abgleich mit dem Prüfprogramm der KoSIT

${ABGLEICH_DE}

## Datenschutz

Die Rechnungen werden nur in Ihrem Browserfenster gelesen und geprüft. Von robin.vision werden das Werkzeug und beim ersten Prüfen die Prüfregeln geladen; Rechnungsdaten werden nicht übertragen und nicht gespeichert, es gibt kein Tracking. Beim Erstellen bleiben Ihre Firmendaten, die zuletzt gespeicherte Rechnungsnummer, gemerkte Empfänger, der Positionskatalog und Ihre letzten 20 gespeicherten Rechnungen (als Vorlage) nur im Speicher Ihres Browsers auf diesem Gerät, damit Sie nichts zweimal eingeben; auch sie werden nicht übertragen. Unter „Empfänger und Katalog“ ändern oder löschen Sie einzelne Empfänger und Positionen, unter „Aus früherer Rechnung“ einzelne gemerkte Rechnungen; Sie sichern alles als eine Datei für ein anderes Gerät und entfernen mit „Alle lokalen Daten löschen“ alles auf einmal. Entwürfe gelten nur, solange das Fenster offen ist. Eine Sicherheitsrichtlinie der Seite (Content Security Policy) erlaubt Verbindungen nur zu robin.vision. Ab dem 1. Januar 2027 verbinden sich das Erstellen auf dieser Seite und die Datei zum Herunterladen nur zur Anmeldung und Lizenzprüfung mit robin.vision (E-Mail-Adresse und Lizenzstand, nie Rechnungen); das Lesen und Prüfen braucht keine Anmeldung und keine solche Verbindung.

## Rechtliche Einordnung

Das Werkzeug ordnet das Format technisch ein und nennt die Fundstelle: [§ 14 Umsatzsteuergesetz (UStG)](https://www.gesetze-im-internet.de/ustg_1980/__14.html), Abschnitt 14.1 des Umsatzsteuer-Anwendungserlasses (UStAE) in der Fassung des [Schreibens des Bundesfinanzministeriums (BMF) vom 15.10.2025](${BMF2025}) und das [BMF-Schreiben vom 15.10.2026](${BMF2026}) zu Fehlern bei den Geschäftsregeln. Stand der Rechtsangaben: 23.10.2026. Es ist eine technische Einordnung, keine Steuer- oder Rechtsberatung; ob eine Rechnung im Einzelfall ordnungsgemäß ist, klären Sie mit Ihrer Steuerberatung.`,
    nutzung: `Stand: 8. November 2026

**Anbieter.** Robin James Lewis, Höchststr. 32, 72336 Balingen ([Impressum](https://robin.vision/#privacy)).

**Nutzung.** Das Lesen und Prüfen von E-Rechnungen auf dieser Seite (Reiter „Prüfen“) ist dauerhaft kostenlos und ohne Anmeldung. Das Erstellen von E-Rechnungen (Reiter „Erstellen“) und die Datei zum Herunterladen dürfen Sie bis zum 31.12.2026 kostenlos nutzen. Ab dem 1. Januar 2027 brauchen sie eine Lizenz, nach einem kostenlosen Test von vier Wochen ab Ihrer ersten Anmeldung; die Bedingungen stehen unten unter „Lizenz“. Sie dürfen das Werkzeug für sich selbst und in Ihrem Unternehmen oder Ihrer Kanzlei verwenden und die unveränderte Datei weitergeben. Nicht erlaubt ist, es zu verändern, zu verkaufen oder als eigenes Angebot zu vertreiben.

**Lizenz.** Die Lizenz kostet **238,00 € je Benutzer und Jahr** (inkl. 19 % USt; 200,00 € netto). Sie wird einmal im Voraus per Karte bezahlt, gilt ein Jahr ab dem Kauf und endet von selbst, ohne Kündigung und ohne Verlängerung. Sie gilt je Person auf bis zu drei Geräten. Kaufen können Sie ab dem 7. Januar 2027 im Werkzeug; Ihr Test läuft bis dahin weiter. Für den Kauf gelten die [AGB von robin.vision](https://member.robin.vision/agb). Verbraucher können den Kauf 14 Tage lang widerrufen: [Widerrufsbelehrung](https://member.robin.vision/widerrufsbelehrung#lizenz), [Vertrag widerrufen](https://member.robin.vision/widerruf).

**Keine Beratung, Ergebnis prüfen.** Das Werkzeug prüft technisch gegen Formate und Regeln. Es ist keine Steuer- oder Rechtsberatung und keine Prüfung der Rechnung auf inhaltliche Richtigkeit. Die rechtliche Einordnung nennt Fundstellen mit Stand; maßgeblich sind das Gesetz und die Originaldatei der Rechnung, nicht die Ansicht. Prüfen Sie vor jeder Überweisung Empfänger, IBAN und Betrag in Ihrer Banking-App.

**Gewährleistung und Haftung.** Soweit ich das Werkzeug kostenlos überlasse, hafte ich nur für Vorsatz und grobe Fahrlässigkeit, für Mängel nur, wenn ich sie arglistig verschwiegen habe. Für eine bezahlte Lizenz gelten die gesetzlichen Mängelrechte und die Haftungsregeln der AGB von robin.vision. Unberührt bleibt in jedem Fall die Haftung für Schäden aus der Verletzung von Leben, Körper oder Gesundheit und nach dem Produkthaftungsgesetz.

**Weiterentwicklung.** Für kostenlos überlassene Teile besteht kein Anspruch auf Aktualisierungen, Unterstützung oder dauerhafte Bereitstellung. Während einer bezahlten Lizenz stelle ich die Aktualisierungen bereit, die für die vertragsgemäße Nutzung nötig sind.

**Marken und Standards.** XRechnung ist ein Standard der Koordinierungsstelle für IT-Standards (KoSIT), ZUGFeRD ein Standard des Forums elektronische Rechnung Deutschland (FeRD), Factur-X dessen deutsch-französische Fassung; GiroCode bezeichnet den QR-Code für Überweisungen nach dem Standard des European Payments Council. Das Werkzeug steht in keiner Verbindung zu diesen Stellen und wird von ihnen weder geprüft noch unterstützt. Weitere genannte Namen sind Marken ihrer Inhaber.

**Lizenzen.** Das Werkzeug enthält die Prüfregeln der EN 16931 (CEN/TC 434, European Union Public Licence 1.2), die Regeln und Feldbezeichnungen der XRechnung (KoSIT, Apache License 2.0), fontoxpath, xspattern, whynot und prsc (MIT License) und die QR Code generator library von Project Nayuki (MIT License). Für diese Bestandteile gelten ihre eigenen Lizenzen; die Einschränkungen unter „Nutzung“ betreffen sie nicht. Die Lizenztexte und Quellen stehen in der Datei unter „Lizenzen und Quellen“ und in [LIZENZEN.txt](https://robin.vision/assets/erechnung/LIZENZEN.txt).

Es gilt deutsches Recht.`,
    hinweis: `An English version of this tool is available: [SmartFormular E-Rechnung lite in English (e-invoice viewer and validator)](https://robin.vision/werkzeuge/e-invoice-viewer/) – same functions, English user interface.`,
  },
  "e-invoice-viewer": {
    beschreibung: `An e-invoice has arrived and nobody can open it? Or you want to check your own e-invoice for errors before it goes out? Drag the XRechnung or ZUGFeRD invoice into the box: SmartFormular E-Rechnung lite tells you whether it is an e-invoice, shows it in readable form, checks it against the official rules and explains every finding in plain words. If there is something to pay, the GiroCode for your banking app is ready. Everything happens in this browser window; your invoices never leave your computer.

## What it does

- **Is this an e-invoice?** The tool answers yes or no and names the format, such as XRechnung or ZUGFeRD, with the legal source. It clearly flags ZUGFeRD files in the basic MINIMUM and BASIC WL profiles, and PDFs without embedded invoice data, as not e-invoices.
- **Readable and printable:** issuer, recipient, lines, VAT, totals and payment details as a clear page, with the standard's field numbers if you like.
- **Checked against the official rules:** the rules of the European standard EN 16931 from the European Committee for Standardization (CEN) and the XRechnung rules from the German Coordination Office for IT Standards (KoSIT) – the same rules the KoSIT validator uses.
- **Findings in plain words:** for each finding the level (error, warning or notice), the rule number, and in plain words what is wrong and what the issuer needs to change.
- **Pay by GiroCode:** payee, IBAN, amount and reference with copy buttons and as a QR code for your banking app – only with a valid IBAN, an amount in euros and credit transfer; otherwise the tool says why not.
- **Also:** check several files at once, save the invoice's attachments, save the validation report as a file.
- **Create e-invoices:** in the “Create” tab you write an XRechnung (UBL syntax). You enter your company details once, then the recipient, the supply and the items. The tool remembers recipients when you save, frequent items go into a catalogue, and suggestions appear as you type; both lists can also be imported from a CSV file. When needed, you write an interim, recurring or cancellation invoice, or use an earlier invoice as the template for the next one. Before saving, the tool checks the file against the same official rules; a file with errors is not saved. There is also a printable view with GiroCode. Not included are an archive, final invoices, ZUGFeRD and special cases such as the reverse charge. The tool does not archive: the saved XML file is the original – please keep it. It is not tax advice.

## How it works

1. Drag the XML file or the ZUGFeRD PDF into the box above, or choose it – or try an example.
2. Read the answer: e-invoice or not, and in which format.
3. Look at the findings. If you received the invoice, send the validation report to the issuer; for your own invoice, complete the details in your invoicing software or in the “Create” tab.
4. Print or save the validation report; pay by GiroCode or with the copied details.
5. Keep the original file – the view does not replace it.

## What is checked and what is not

In short: the tool checks whether all required details are there and fit together – the business rules of the standard. It does not check whether the details are correct, such as the VAT rate.

Each finding has a level: **error** – the invoice breaks a rule and the issuer should correct it; **warning** – please check, the invoice may still be in order; **notice** – for information only.

If the tool finds values in the wrong format, such as a date written the wrong way, it reports a **format error**. A file with format errors is not an e-invoice. Missing or inconsistent details (business rule breaches), by contrast, are not format errors.

The tool does not check the XML schema, the formal structure of the file in every detail; format errors that only show up there are not detected. A validation does not replace checking the invoice for completeness and accuracy ([letter of the German Federal Ministry of Finance of 15 October 2025](${BMF2025}), para. 35a).

**For specialists:** the tool checks the EN 16931 business rules (CEN, rule set 1.3.16) and, for an XRechnung, the XRechnung 3.0.2 rules as well (KoSIT, Schematron 2.6.0), taken unchanged from the KoSIT validator configuration of 31 August 2026, with the severity levels set there. XRechnung includes some rules whose names start with PEPPOL. ZUGFeRD profiles without a KoSIT scenario of their own are checked against the EN 16931 rules. Specific rules of other implementations, such as the full Peppol BIS rules, are not checked.

## Compared with the KoSIT validator

${ABGLEICH_EN}

## Privacy

Invoices are read and checked only in your browser window. The tool, and on the first check the validation rules, are loaded from robin.vision; no invoice data is transmitted or stored, and there is no tracking. When you create invoices, your company details, the last invoice number saved, remembered recipients, the item catalogue and your last 20 saved invoices (as templates) stay only in your browser's storage on this device, so you never enter anything twice; they are not transmitted either. Under “Recipients and catalogue” you change or delete single recipients and items, under “From an earlier invoice” single remembered invoices; you save everything as one file for another device, and “Delete all local data” removes it all at once. Drafts only last while the window is open. A security policy on the page (Content Security Policy) allows connections to robin.vision only. From 1 January 2027, creating invoices on this page and the downloadable file connect to robin.vision only to sign in and check the licence (email address and licence status, never invoices); reading and checking need no sign-in and no such connection.

## Legal classification

The tool classifies the format technically and names the source: [section 14 of the German VAT Act (UStG)](https://www.gesetze-im-internet.de/ustg_1980/__14.html), section 14.1 of the German VAT Application Decree (UStAE) as amended by the [letter of the Federal Ministry of Finance (BMF) of 15 October 2025](${BMF2025}), and the [BMF letter of 15 October 2026](${BMF2026}) on business rule errors. Legal information as of 23 October 2026. It is a technical classification, not tax or legal advice; whether an invoice meets the legal requirements in a particular case is a question for your tax adviser.`,
    nutzung: `As of: 8 November 2026

**Provider.** Robin James Lewis, Höchststr. 32, 72336 Balingen, Germany ([legal notice](https://robin.vision/?lang=en#privacy)).

**Use.** Reading and checking e-invoices on this page (“Check” tab) is free of charge for good, without signing in. Creating e-invoices (“Create” tab) and the downloadable file are free to use until 31 December 2026. From 1 January 2027 they require a licence, after a free four-week trial from your first sign-in; the terms are set out under “Licence” below. You may use the tool for yourself and in your company or practice, and pass on the unaltered file. You may not modify it, sell it or distribute it as your own offering.

**Licence.** The licence costs **€238.00 per user per year** (including 19% German VAT; €200.00 net). You pay once in advance by card; it runs for one year from purchase and ends by itself, with no notice needed and no renewal. It is per person, on up to three devices. You can buy it in the tool from 7 January 2027; your trial continues until then. The purchase is subject to the [general terms of robin.vision](https://member.robin.vision/agb) (in German). Consumers may withdraw from the purchase within 14 days: [withdrawal information](https://member.robin.vision/widerrufsbelehrung#lizenz) (in German), [withdraw from a contract](https://member.robin.vision/widerruf).

**No advice, check the result.** The tool checks technically against formats and rules. It is not tax or legal advice and does not check the invoice for accuracy of content. The legal classification names sources and their date; the law and the original invoice file prevail, not the view. Before every transfer, check payee, IBAN and amount in your banking app.

**Warranty and liability.** Where I provide the tool free of charge, I am liable only for intent and gross negligence, and for defects only if I fraudulently concealed them. For a paid licence, your statutory rights for defects and the liability rules of robin.vision’s general terms apply. In every case, liability for injury to life, body or health and under the German Product Liability Act remains unaffected.

**Further development.** For the parts provided free of charge there is no entitlement to updates, support or permanent availability. During a paid licence I provide the updates needed to keep the tool working as agreed.

**Trademarks and standards.** XRechnung is a standard of the German Coordination Office for IT Standards (KoSIT), ZUGFeRD a standard of the Forum elektronische Rechnung Deutschland (FeRD), and Factur-X its Franco-German counterpart; GiroCode denotes the QR code for credit transfers following the European Payments Council standard. The tool is not affiliated with these bodies and is neither reviewed nor endorsed by them. Other names mentioned are trademarks of their respective owners.

**Licences.** The tool contains the EN 16931 validation rules (CEN/TC 434, European Union Public Licence 1.2), the XRechnung rules and field labels (KoSIT, Apache License 2.0), fontoxpath, xspattern, whynot and prsc (MIT License) and the QR Code generator library by Project Nayuki (MIT License). These components are governed by their own licences; the restrictions under "Use" do not apply to them. The licence texts and sources are in the file under "Licences and sources" and in [LIZENZEN.txt](https://robin.vision/assets/erechnung/LIZENZEN.txt).

German law applies. These terms are a translation; in case of doubt, the German terms of use of [SmartFormular E-Rechnung lite](https://robin.vision/werkzeuge/e-rechnung-pruefen/#nutzungsbedingungen) apply.`,
    hinweis: `Eine deutsche Fassung des Werkzeugs gibt es unter [SmartFormular E-Rechnung lite auf Deutsch](https://robin.vision/werkzeuge/e-rechnung-pruefen/) – gleiche Funktionen, deutsche Oberfläche.`,
  },
};
