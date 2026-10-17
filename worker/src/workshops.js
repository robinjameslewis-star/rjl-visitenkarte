// Seite „Workshops“ (workshops/index.html, englisch workshops/en/index.html; Robin, 17.10.2026): der Workshop KI-Kompetenz für Teams,
// mit der Unterweisung nach Art. 4 KI-Verordnung (EU AI Act) als hervorgehobenem Teil (Badge unter der Überschrift, eigener Kasten) – Workshop mit Robin
// (Hemmschwellen nehmen, Anwendungsfälle entwickeln, gemeinsam ein kleines Werkzeug im Browser bauen), Online-Lehrgang im
// Memberbereich, Test mit Zertifikat. Termine für 2027 auf Anfrage über ein kurzes Formular (Unternehmen, Ansprechperson, E-Mail,
// Teilnehmerzahl, Wunschtermin, online oder vor Ort) an Gochs Kontakt-Endpunkt; kein Kalender (Robin, 17.10.2026: Cal.com zeigte
// Termine in 2026 – vorerst weg), keine Preise (auf Anfrage; Robins Vorschlag steht im Konzept im Vault). Rechtsrahmen ohne
// Übertreibung, Fragen und Antworten (FAQPage), Course-Daten. Der Text steht hier fest (keine Redaktion); tools/workshops-bauen.mjs
// schreibt beide Seiten.
import { rahmen } from "./werkzeug.js";
import { newsletterKasten } from "./kasten.js";
import { SEITEN } from "./sitemap.js";
import { partnerListe } from "./partner.js";

const SITE = "https://robin.vision/";
export const KONTAKT_ENDPUNKT = "https://goch.robin.vision/contact";
export const MEMBER_PRUEFUNG = "https://member.robin.vision/zertifikat";
export const WORKSHOPS = SEITEN.filter(s => s.id === "workshops").map(s => ({ ...s, pfad: s.adresse + "index.html" }));
export const workshopsPfad = lang => WORKSHOPS.find(s => s.lang === lang).pfad;
export const workshopsUrl = lang => SITE + WORKSHOPS.find(s => s.lang === lang).adresse;

const TEXT = {
  de: {
    titel: "Workshop KI-Kompetenz für Ihr Team",
    abzeichen: "Mit Unterweisung nach EU AI Act",
    seitentitel: "Workshop KI-Kompetenz mit Unterweisung nach EU AI Act (Art. 4 KI-Verordnung) für Kanzlei und Rechnungswesen – Workshop, Online-Lehrgang, Zertifikat | robin.vision",
    beschr: "KI-Kompetenz für Ihr Team: Workshop mit Robin James Lewis (online oder vor Ort), Online-Lehrgang zum Durchklicken, Test und Zertifikat als Nachweis nach Art. 4 KI-Verordnung. Für Kanzleien und Unternehmen, Termine ab 2027 buchbar.",
    untertitel: "Ein Workshop mit mir, der Online-Lehrgang zum Durchklicken und der Test mit Zertifikat nach Art. 4 KI-Verordnung – für Kanzlei und Rechnungswesen.",
    meta: "Termine ab Januar 2027 · europaweit, auf Deutsch oder Englisch · Rechtsstand 16. Oktober 2026",
    intro: [
      "Die KI-Verordnung verlangt von jedem Betrieb, der KI einsetzt, Maßnahmen zur KI-Kompetenz seines Personals (Art. 4). Welche Maßnahmen das sind, bestimmt der Betrieb; ein Zertifikat oder eine Prüfung schreibt das Gesetz nicht vor. Dieser Workshop ist eine solche Maßnahme, zugeschnitten auf Kanzlei und Rechnungswesen – und er beginnt nicht mit Folien, sondern mit Ihrem Team.",
      "Drei Teile: ein Workshop mit mir, der Hemmschwellen nimmt und in dem Ihr Team eigene Anwendungsfälle entwickelt und ein kleines Werkzeug für einen echten Schmerzpunkt baut; dann der Online-Lehrgang zum Durchklicken im Memberbereich, in dem jede Person in ihrem Tempo festigt, was zählt; dann der Test mit Zertifikat je Person und die Teilnehmerliste als Nachweis für Ihr Schulungsverzeichnis.",
    ],
    teileTitel: "Der Workshop in drei Teilen",
    teile: [
      ["Workshop", "90 Minuten online oder ein halber Tag vor Ort. Ich referiere frei, ohne Fachsprache, und greife Ihre Fälle auf: Wo hakt es im Alltag, wo wäre KI eine Hilfe, wo nicht? Gemeinsam entwickeln wir Anwendungsfälle für Ihr Team und bauen vor Ort ein kleines Werkzeug im Browser für einen Schmerzpunkt, den Sie mitbringen – damit alle sehen, was KI heute kann und wo sie sicher scheitert."],
      ["Online-Lehrgang", "Sieben Lektionen zum Durchklicken im Memberbereich, etwa 50 Minuten, jederzeit unterbrechbar: kurze Seiten, Beispiele aus dem Rechnungswesen, ein Merksatz und ein Selbstcheck je Lektion, das Skript als PDF zum Nachlesen. Jede Person hat ihren eigenen Zugang und ihren eigenen Stand."],
      ["Test und Zertifikat", "15 Fragen aus einem Vorrat von 30, bestanden ab 12 richtigen Antworten, jede Antwort erklärt, Wiederholung jederzeit. Mit dem Bestehen entsteht das Zertifikat über die Unterweisung nach Art. 4 KI-Verordnung (EU AI Act) als PDF, online prüfbar. Sie laden die Teilnehmerliste für Ihr Schulungsverzeichnis herunter."],
    ],
    unterweisungKicker: "Teil dieses Workshops",
    unterweisungTitel: "Die Unterweisung nach EU AI Act",
    unterweisung: [
      "Der Workshop enthält die Unterweisung, mit der Sie Ihre Maßnahme nach Art. 4 KI-Verordnung belegen: Jede Person durchläuft nach dem Workshop den Online-Lehrgang und den Test. Mit dem Bestehen entsteht das Zertifikat über die Unterweisung nach EU AI Act – mit Nummer und Prüfcode, drei Jahre online prüfbar. Sie laden die Teilnehmerliste für Ihr Schulungsverzeichnis herunter.",
      "Ein Zertifikat oder eine Prüfung schreibt das Gesetz nicht vor. Die Unterweisung ist Ihre dokumentierte Maßnahme – mit Inhalten, Dauer, Fassung und Rechtsstand auf jedem Zertifikat.",
    ],
    fakten: ["Art. 4 KI-Verordnung (EU AI Act)", "Zertifikat je Person, online prüfbar", "Teilnehmerliste für das Schulungsverzeichnis"],
    fuerWenTitel: "Für wen",
    fuerWen: [
      "Steuerkanzleien und Buchhaltungsbüros: Mitarbeitende in Finanzbuchhaltung, Lohn und Jahresabschluss, Auszubildende, Empfang.",
      "Unternehmen: Rechnungswesen, Verwaltung, Assistenz – alle, die mit Belegen, Zahlen und Daten Dritter arbeiten.",
      "Keine Vorkenntnisse nötig. Die Beispiele kommen aus dem Alltag: Buchungsvorschläge, Mandantenschreiben, Kontoauszüge, Zusammenfassungen.",
    ],
    inhaltTitel: "Inhalt des Lehrgangs",
    inhaltLead: "Sieben Kapitel, im Workshop angelegt, im Lehrgang vertieft, im Test geprüft:",
    kapitel: [
      ["Was KI heute ist – und was nicht", "Sprachmodelle, Agenten, Automatisierung; Wahrscheinlichkeit statt Wahrheit; Halluzination", 8],
      ["Die KI-Verordnung in zehn Minuten", "Risikoklassen, Zeitplan, Art. 4 (Maßnahmen zur Kompetenz), Art. 50 (Kennzeichnung), was Betreiber sind", 8],
      ["Daten, die nie hinein dürfen", "Mandanten- und Personendaten, Berufsgeheimnis (§ 203 StGB, § 62a StBerG), DSGVO; öffentliche gegen betriebliche Werkzeuge; Platzhalter", 10],
      ["Ergebnisse prüfen", "Prüfen wie die Arbeit eines unerfahrenen Kollegen (BStBK); Zahlen, Quellen, Rechtsstand; Vier-Augen-Prinzip; GoBD", 10],
      ["Gut fragen, gut arbeiten", "Aufgabe, Zusammenhang, Format, Grenzen; Vorlagen; Nacharbeit; wann KI nichts bringt", 6],
      ["Risiken im Alltag", "Deepfakes und Phishing, Automatisierungsvertrauen, Verzerrung, Schatten-KI; wie man meldet", 5],
      ["Regeln im Haus", "KI-Richtlinie, erlaubte Werkzeuge, Freigaben, KI-Verzeichnis, Ansprechperson; die Rolle der Beschäftigten", 5],
    ],
    min: "Min.",
    werkzeugeTitel: "Werkzeuge im Workshop",
    werkzeuge: [
      "Der Workshop lebt von Vorführungen an echten Fällen. Ich zeige eigene Produkte – SmartFormular Fibu lite, Fibu und Deklaration – und nach und nach Produkte von Partnerunternehmen, mit denen ich eine Vereinbarung geschlossen habe. Für Partnerangebote kann ich eine Gebühr oder Provision erhalten; sie sind auf der Website und in den Unterlagen als Partnerangebot gekennzeichnet. Die Inhalte der Unterweisung bleiben davon unberührt; was Sie einsetzen, entscheiden Sie.",
    ],
    partnerHinweis: "Partnerangebote folgen; die ersten Vereinbarungen sind in Vorbereitung.",
    partnerKennzeichnung: "Partnerangebot · Anzeige",
    formateTitel: "Zwei Formate",
    formateLead: "Beide beginnen mit dem Workshop und enden mit demselben Zugang je Person: Online-Lehrgang, Skript, Test und Zertifikat für 90 Tage.",
    formate: [
      { name: "Workshop online", text: "Videokonferenz von 90 Minuten mit Ihrem Team: Hemmschwellen nehmen, Anwendungsfälle entwickeln, gemeinsam ein kleines Werkzeug bauen. Danach der Zugang für alle: Online-Lehrgang, Skript, Test und Zertifikat.",
        preis: "Preis auf Anfrage", klein: "für Teams bis etwa 12 Personen, größere Gruppen nach Absprache" },
      { name: "Workshop vor Ort", text: "Ein halber Tag bei Ihnen: drei Stunden mit Übungen an eigenen Fällen und einem Werkzeug für Ihren Schmerzpunkt. Danach der Zugang für alle: Online-Lehrgang, Skript, Test und Zertifikat.",
        preis: "Preis auf Anfrage", klein: "für Teams bis etwa 15 Personen zuzüglich Fahrtkosten, größere Gruppen nach Absprache" },
    ],
    auffrischung: "Online-Lehrgang und Test ohne Workshop folgen, sobald die Zulassung nach dem Fernunterrichtsschutzgesetz vorliegt. Jährlich gibt es eine Auffrischung mit neuer Fassung (Rechtsstand, neue Werkzeuge), Test und Zertifikat. Preise nenne ich im Angebot, nach Ihrer Anfrage. Termine ab Januar 2027.",
    ablaufTitel: "So läuft es",
    ablauf: [
      "Sie schicken die Anfrage unten: Unternehmen, Ansprechperson, Teilnehmerzahl, Wunschtermin, online oder vor Ort. Ich antworte persönlich mit Angebot und Terminvorschlägen und schicke nach Ihrer Zusage die Auftragsbestätigung.",
      "Sie erhalten eine E-Rechnung. Mit dem Zahlungseingang wird Ihr Workshop im Memberbereich freigeschaltet (dort unter „Workshops“); Sie nehmen als Leitung die AGB an.",
      "Sie tragen Namen und E-Mail-Adressen Ihrer Mitarbeitenden ein. Jede Person bekommt eine Einladung und einen eigenen Zugang, der nur den Lehrgang zeigt – mit Passkey statt Passwort.",
      "Teil 1: der Workshop mit mir, online oder bei Ihnen. Teil 2: Die Teilnehmenden klicken den Online-Lehrgang durch, wann es passt, auch in Etappen; das Skript steht als PDF bereit.",
      "Teil 3, der Test: 15 Fragen, zufällig aus einem Vorrat von 30, bestanden ab 12 richtigen Antworten. Jede Antwort wird erklärt; Wiederholen ist jederzeit möglich.",
      "Mit dem Bestehen entsteht das Zertifikat als PDF – mit Nummer und Prüfcode, drei Jahre online prüfbar.",
      "Sie laden die Teilnehmerliste als Nachweis für Ihr Schulungsverzeichnis herunter. Der Zugang gilt 90 Tage; danach werden die Konten gelöscht, die Zertifikate bleiben.",
    ],
    nachweisTitel: "Nachweis und Zertifikat",
    nachweis: [
      "Das Zertifikat nennt Person, Organisation, Titel und Inhalte der Unterweisung, Dauer, Datum, Fassung und Rechtsstand, Zertifikatsnummer und Prüfcode. Es ist ein Nachweis von robin.vision über eine Maßnahme nach Art. 4 KI-Verordnung – keine amtliche oder akkreditierte Bescheinigung; das steht auch darauf.",
      `Prüfen lässt sich jedes Zertifikat unter <a href="${MEMBER_PRUEFUNG}">member.robin.vision/zertifikat</a> mit Nummer und Prüfcode. Der Arbeitgeber sieht je Person den Stand (eingeladen, begonnen, Lehrgang abgeschlossen, bestanden) und die Zertifikatsnummer, keine Punkte.`,
    ],
    rechtTitel: "Rechtlicher Rahmen",
    recht: [
      "Die KI-Verordnung (Verordnung (EU) 2024/1689, EU AI Act) gilt seit dem 2. Februar 2025 auch für die Pflicht zur KI-Kompetenz. Mit dem Digital Omnibus (Verordnung (EU) 2026/1744, in Kraft seit 27. Juli 2026) wurde Art. 4 abgeschwächt: Anbieter und Betreiber müssen Maßnahmen ergreifen, die die KI-Kompetenz ihres Personals fördern – ein bestimmtes Niveau je Person ist nicht mehr geschuldet. Vorgeschrieben sind weder Zertifikat noch Test noch Format; als Nachweis dient ein Schulungsverzeichnis.",
      "Seit dem 2. August 2026 beaufsichtigen die nationalen Marktüberwachungsbehörden die Pflicht; einen eigenen Bußgeldtatbestand gibt es nicht. Werbung mit „Pflichtschulung“ oder „Bußgeld“ passt dazu nicht. Der Workshop wird deshalb so angeboten, wie er ist: eine Maßnahme mit Nachweis.",
      "Der Workshop erklärt Pflichten allgemein, mit Rechtsstand je Fassung. Es ist keine Rechtsberatung; für den Einzelfall verweist es auf Steuerberater, Rechtsanwälte und Datenschutzbeauftragte. Vertragspartner ist Robin James Lewis, handelnd unter robin.vision; die robin.vision UG (haftungsbeschränkt) wird im Januar 2027 gegründet und übernimmt die Verträge nach ihrer Eintragung. Es gelten die AGB des Memberbereichs.",
    ],
    fragenTitel: "Fragen und Antworten",
    fragen: [
      ["Ist diese Schulung Pflicht?", "Nein. Art. 4 der KI-Verordnung verpflichtet Betriebe, die KI einsetzen, zu Maßnahmen, die die KI-Kompetenz ihres Personals fördern. Welche Maßnahmen das sind, entscheidet der Betrieb; ein Zertifikat oder eine Prüfung schreibt das Gesetz nicht vor. Der Workshop ist eine solche Maßnahme, mit Nachweis, damit Sie belegen können, was Sie getan haben."],
      ["Was ist die Unterweisung nach EU AI Act?", "Der dokumentierte Teil des Workshops: Jede Person klickt den Online-Lehrgang durch und legt den Test ab; mit dem Bestehen entsteht das Zertifikat über die Unterweisung nach Art. 4 KI-Verordnung, online prüfbar. Die Teilnehmerliste dient als Nachweis für Ihr Schulungsverzeichnis. Der Workshop davor nimmt Hemmschwellen und liefert die Beispiele aus Ihrem Alltag."],
      ["Warum beginnt alles mit dem Workshop und nicht mit dem Lehrgang?", "Weil Fragen aus dem eigenen Alltag am meisten bringen – und weil Hemmschwellen im Gespräch fallen, nicht beim Lesen. Im Workshop entwickelt Ihr Team eigene Anwendungsfälle und baut mit mir ein kleines Werkzeug für einen echten Schmerzpunkt. Der Lehrgang danach festigt den Stoff in kleinen Schritten, der Test schließt ab."],
      ["Was ist das Werkzeug, das wir im Workshop bauen?", "Eine einzelne HTML-Datei, die im Browser läuft und einen konkreten Handgriff Ihres Teams erleichtert – etwa eine Liste prüfen, einen Text nach festen Regeln bauen oder Zahlen aus einer Tabelle zusammenfassen. Ohne Installation, ohne Daten in der Cloud. Das Team erlebt dabei, wie man KI anleitet und ihre Ergebnisse prüft."],
      ["Was sieht der Arbeitgeber?", "Je Person den Stand – eingeladen, begonnen, Lehrgang abgeschlossen, bestanden – und die Zertifikatsnummer, als Liste für das Schulungsverzeichnis. Punkte und Zahl der Versuche sieht er nicht."],
      ["Wie lange gilt das Zertifikat?", "Es trägt Fassung und Rechtsstand der Unterweisung und bleibt drei Jahre online prüfbar. Weil sich Werkzeuge und Regeln ändern, gibt es jährlich eine Auffrischung mit neuer Fassung."],
      ["Was ist, wenn jemand den Test nicht besteht?", "Nach jeder Abgabe steht zu jeder Frage die richtige Antwort mit Erklärung. Der Test lässt sich beliebig wiederholen, mit neu gezogenen Fragen. Nicht bestandene Versuche sieht nur die Person selbst."],
      ["Welche Technik brauchen die Teilnehmenden?", "Einen Browser und eine E-Mail-Adresse. Der Zugang wird mit einem Passkey eingerichtet, zum Beispiel per Fingerabdruck oder Gesichtserkennung, ohne Passwort. Der Online-Lehrgang läuft im Browser, auch auf dem Handy; installiert wird nichts."],
      ["Ist der Workshop Rechtsberatung?", "Nein. Er erklärt Pflichten allgemein, mit Rechtsstand je Fassung, und verweist für den Einzelfall auf Steuerberater, Rechtsanwälte und Datenschutzbeauftragte."],
      ["Werden im Workshop Produkte gezeigt?", "Ja. Ich zeige Werkzeuge an echten Fällen: SmartFormular Fibu lite, Fibu und Deklaration von robin.vision – und nach und nach Produkte von Partnerunternehmen, für deren Vorstellung ich eine Gebühr oder Provision erhalten kann. Partnerangebote sind als solche gekennzeichnet; die Inhalte der Unterweisung ändern sich dadurch nicht. Was Sie einsetzen, entscheiden Sie; Verträge schließen Sie direkt mit dem Anbieter. Die AGB regeln das in § 8, die Hinweise für Teilnehmende nennen es ebenfalls."],
    ],
    anfrageTitel: "Workshop für 2027 anfragen",
    anfrageLead: "Fünf Angaben genügen. Ich antworte persönlich per E-Mail, in der Regel innerhalb von zwei Werktagen, mit Angebot und Terminvorschlägen.",
    felder: { firma: "Unternehmen oder Kanzlei", name: "Ansprechpartnerin oder Ansprechpartner", email: "E-Mail-Adresse", format: "Online oder vor Ort", personen: "Teilnehmerzahl", zeitraum: "Wunschtermin 2027", optional: "(freiwillig)" },
    formatOptionen: [["live", "Online (Videokonferenz)"], ["praesenz", "Vor Ort bei uns"], ["offen", "Noch offen"]],
    senden: "Anfrage senden", sendet: "Wird gesendet …",
    gesendet: "Danke – Ihre Anfrage ist angekommen. Ich melde mich per E-Mail.",
    ungueltig: "Bitte Unternehmen, Ansprechperson, eine gültige E-Mail-Adresse und die Teilnehmerzahl angeben.",
    fehler: "Das Senden hat nicht geklappt. Schreiben Sie mir bitte direkt an robin@robin.vision.",
    datenschutz: "Ihre Angaben gehen per E-Mail an mich und werden nur für die Antwort verwendet. Einzelheiten stehen unter Impressum · Datenschutz.",
    betreff: "Anfrage Workshop KI-Kompetenz",
    oder: "Oder direkt:", nachricht: "Nachricht schreiben",
    andere: "This page in English",
  },
  en: {
    titel: "AI literacy workshop for your team",
    abzeichen: "With EU AI Act training",
    seitentitel: "AI literacy workshop with EU AI Act training (Article 4) for accounting firms and finance teams – workshop, online course, certificate | robin.vision",
    beschr: "AI literacy for your team: a workshop with Robin James Lewis (online or on site), a click-through online course, a test and a certificate as evidence under Article 4 of the EU AI Act. For firms and companies, dates bookable from 2027.",
    untertitel: "A workshop with me, the click-through online course and the test with a certificate under Article 4 of the EU AI Act – for accounting firms and finance teams.",
    meta: "Dates from January 2027 · across Europe, in German or English · legal position as of 16 October 2026",
    intro: [
      "The EU AI Act requires every organisation that uses AI to take measures to ensure the AI literacy of its staff (Article 4). What those measures are is for the organisation to decide; the law prescribes neither a certificate nor an exam. This workshop is one such measure, tailored to accounting – and it starts with your team, not with slides.",
      "Three parts: a workshop with me that lowers the barriers to AI and in which your team develops its own use cases and builds a small tool for a real pain point; then the click-through online course in the member area, where each person consolidates what matters at their own pace; then the test with a certificate per person and the participant list as evidence for your training records.",
    ],
    teileTitel: "The workshop in three parts",
    teile: [
      ["Workshop", "90 minutes online or half a day on site. I speak freely, without jargon, and pick up your cases: where does everyday work get stuck, where would AI help, where not? Together we develop use cases for your team and build a small browser tool for a pain point you bring along – so everyone sees what AI can do today and where it reliably fails."],
      ["Online course", "Seven click-through lessons in the member area, about 50 minutes, pausable at any time: short pages, examples from accounting, a key takeaway and a self-check per lesson, the handout as a PDF. Each person has their own access and their own progress."],
      ["Test and certificate", "15 questions drawn from a pool of 30, passed from 12 correct answers, every answer explained, repeatable at any time. On passing, the certificate for the training under Article 4 of the EU AI Act is issued as a PDF, verifiable online. You download the participant list for your training records."],
    ],
    unterweisungKicker: "Part of this workshop",
    unterweisungTitel: "The EU AI Act training",
    unterweisung: [
      "The workshop includes the training with which you document your measure under Article 4 of the EU AI Act: after the workshop, each person completes the online course and the test. On passing, the certificate for the EU AI Act training is issued – with a number and a verification code, verifiable online for three years. You download the participant list for your training records.",
      "The law prescribes neither a certificate nor an exam. The training is your documented measure – with content, duration, edition and legal position stated on every certificate.",
    ],
    fakten: ["Article 4 of the EU AI Act", "Certificate per person, verifiable online", "Participant list for your training records"],
    fuerWenTitel: "Who it is for",
    fuerWen: [
      "Tax and accounting firms: staff in bookkeeping, payroll and year-end accounts, trainees, front desk.",
      "Companies: finance, administration, assistants – everyone who works with documents, figures and third-party data.",
      "No prior knowledge needed. The examples come from everyday work: posting suggestions, client letters, bank statements, summaries.",
    ],
    inhaltTitel: "Content of the course",
    inhaltLead: "Seven chapters, opened in the workshop, deepened in the course, checked in the test:",
    kapitel: [
      ["What AI is today – and what it is not", "Language models, agents, automation; probability rather than truth; hallucination", 8],
      ["The EU AI Act in ten minutes", "Risk classes, timeline, Article 4 (literacy measures), Article 50 (labelling), what a deployer is", 8],
      ["Data that must never go in", "Client and personal data, professional secrecy (Sections 203 StGB and 62a StBerG), GDPR; public versus company tools; placeholders", 10],
      ["Checking results", "Review AI output like the work of an inexperienced colleague (German Chamber of Tax Advisers); figures, sources, legal position; four-eyes principle; GoBD", 10],
      ["Asking well, working well", "Task, context, format, limits; templates; rework; when AI adds nothing", 6],
      ["Everyday risks", "Deepfakes and phishing, automation bias, bias in models, shadow AI; how to report", 5],
      ["House rules", "AI policy, approved tools, approvals, AI register, contact person; the employee's role", 5],
    ],
    min: "min",
    werkzeugeTitel: "Tools in the workshop",
    werkzeuge: [
      "The workshop thrives on demonstrations with real cases. I show my own products – SmartFormular Fibu lite, Fibu and Deklaration – and, over time, products from partner companies I have an agreement with. For partner offers I may receive a fee or a commission; they are labelled as partner offers on the website and in the materials. The content of the training is not affected; what you use is your decision.",
    ],
    partnerHinweis: "Partner offers will follow; the first agreements are being prepared.",
    partnerKennzeichnung: "Partner offer · Advertisement",
    formateTitel: "Two formats",
    formateLead: "Both start with the workshop and end with the same access per person: online course, handout, test and certificate for 90 days.",
    formate: [
      { name: "Online workshop", text: "A 90-minute video call with your team: lowering barriers, developing use cases, building a small tool together. Then access for everyone: online course, handout, test and certificate.",
        preis: "Price on request", klein: "for teams of up to about 12 people, larger groups by arrangement" },
      { name: "On-site workshop", text: "Half a day at your premises: three hours with exercises on your own cases and a tool for your pain point. Then access for everyone: online course, handout, test and certificate.",
        preis: "Price on request", klein: "for teams of up to about 15 people plus travel costs, larger groups by arrangement" },
    ],
    auffrischung: "Online course and test without a workshop will follow once the licence under the German Distance Learning Protection Act is in place. Each year there is a refresher with a new edition (legal position, new tools), test and certificate. I state prices in the quote, after your enquiry. Dates from January 2027. Workshops are held in German or English, across Europe; the online course is in German, an English edition follows.",
    ablaufTitel: "How it works",
    ablauf: [
      "You send the enquiry below: company, contact person, number of participants, preferred date, online or on site. I reply personally with a quote and proposed dates and send the order confirmation once you accept.",
      "You receive an e-invoice. Once payment arrives, your workshop is unlocked in the member area (under “Workshops” there); you accept the terms as the person in charge.",
      "You enter the names and email addresses of your staff. Each person receives an invitation and their own access that shows only the course – with a passkey instead of a password.",
      "Part 1: the workshop with me, online or at your premises. Part 2: participants click through the online course whenever it suits them, in stages if they like; the handout is available as a PDF.",
      "Part 3, the test: 15 questions drawn at random from a pool of 30, passed from 12 correct answers. Every answer is explained; repeating is possible at any time.",
      "On passing, the certificate is issued as a PDF – with a number and a verification code, verifiable online for three years.",
      "You download the participant list as evidence for your training records. Access lasts 90 days; the accounts are then deleted, the certificates remain.",
    ],
    nachweisTitel: "Evidence and certificate",
    nachweis: [
      "The certificate states the person, the organisation, the title and content of the training, duration, date, edition and legal position, certificate number and verification code. It is evidence issued by robin.vision of a measure under Article 4 of the EU AI Act – not an official or accredited attestation, and it says so.",
      `Any certificate can be verified at <a href="${MEMBER_PRUEFUNG}">member.robin.vision/zertifikat</a> with its number and code. The employer sees each person's status (invited, started, course completed, passed) and the certificate number, not the score.`,
    ],
    rechtTitel: "Legal framework",
    recht: [
      "The EU AI Act (Regulation (EU) 2024/1689) has applied to the AI literacy obligation since 2 February 2025. The Digital Omnibus (Regulation (EU) 2026/1744, in force since 27 July 2026) softened Article 4: providers and deployers must take measures that promote the AI literacy of their staff – a specific level per person is no longer owed. Neither a certificate nor a test nor a format is prescribed; a training record serves as evidence.",
      "Since 2 August 2026 the national market surveillance authorities oversee the obligation; there is no separate fine for breaching it. Advertising a “mandatory course” or threatening fines does not fit that picture, so the workshop is offered for what it is: a measure with evidence.",
      "The workshop explains obligations in general terms, with the legal position stated for each edition. It is not legal advice; for individual cases it refers to tax advisers, lawyers and data protection officers. Your contracting partner is Robin James Lewis, trading as robin.vision; robin.vision UG (haftungsbeschränkt) is being founded in January 2027 and will take over the contracts once registered. The terms of the member area apply.",
    ],
    fragenTitel: "Questions and answers",
    fragen: [
      ["Is this training mandatory?", "No. Article 4 of the EU AI Act obliges organisations that use AI to take measures that promote the AI literacy of their staff. Which measures is for the organisation to decide; the law prescribes neither a certificate nor an exam. The workshop is one such measure, with evidence so that you can show what you have done."],
      ["What is the EU AI Act training?", "The documented part of the workshop: each person clicks through the online course and takes the test; on passing, the certificate for the training under Article 4 of the EU AI Act is issued, verifiable online. The participant list serves as evidence for your training records. The workshop beforehand lowers the barriers and supplies the examples from your daily work."],
      ["Why does it all start with the workshop and not with the course?", "Because questions from your own daily work are what help most – and because barriers fall in conversation, not while reading. In the workshop your team develops its own use cases and builds a small tool with me for a real pain point. The course afterwards consolidates the material in small steps, and the test completes it."],
      ["What is the tool we build in the workshop?", "A single HTML file that runs in the browser and eases one concrete task of your team – checking a list, building a text by fixed rules, summarising figures from a table. No installation, no data in the cloud. The team experiences how to instruct AI and how to check its results."],
      ["What does the employer see?", "Each person's status – invited, started, course completed, passed – and the certificate number, as a list for the training records. Scores and the number of attempts are not shown."],
      ["How long is the certificate valid?", "It states the edition and legal position of the training and can be verified online for three years. Because tools and rules change, there is an annual refresher with a new edition."],
      ["What if someone fails the test?", "After every submission the correct answer and an explanation are shown for each question. The test can be repeated as often as needed, with freshly drawn questions. Failed attempts are visible only to the person."],
      ["What do participants need?", "A browser and an email address. Access is set up with a passkey, for example fingerprint or face recognition, without a password. The online course runs in the browser, on a phone too; nothing is installed."],
      ["Is the workshop legal advice?", "No. It explains obligations in general terms, with the legal position stated for each edition, and refers to tax advisers, lawyers and data protection officers for individual cases."],
      ["Are products shown in the workshop?", "Yes. I demonstrate tools on real cases: SmartFormular Fibu lite, Fibu and Deklaration by robin.vision – and, over time, products from partner companies that may pay me a fee or a commission for the presentation. Partner offers are labelled as such; the content of the training does not change because of them. What you use is your decision; contracts are made directly with the provider. The terms cover this in Section 8, and the notes for participants mention it too."],
    ],
    anfrageTitel: "Enquire about a workshop in 2027",
    anfrageLead: "Five details are enough. I reply personally by email, usually within two working days, with a quote and proposed dates.",
    felder: { firma: "Company or firm", name: "Contact person", email: "Email address", format: "Online or on site", personen: "Number of participants", zeitraum: "Preferred date in 2027", optional: "(optional)" },
    formatOptionen: [["live", "Online (video call)"], ["praesenz", "On site at our premises"], ["offen", "Not decided yet"]],
    senden: "Send enquiry", sendet: "Sending …",
    gesendet: "Thank you – your enquiry has arrived. I will get back to you by email.",
    ungueltig: "Please give your company, a contact person, a valid email address and the number of participants.",
    fehler: "Sending did not work. Please email me directly at robin@robin.vision.",
    datenschutz: "Your details are emailed to me and used only to reply. Details are under Legal notice · Privacy.",
    betreff: "Enquiry: AI literacy workshop",
    oder: "Or directly:", nachricht: "Write a message",
    andere: "Diese Seite auf Deutsch",
  },
};

const CSS = `.abzeichen { display: inline-block; margin: 0 0 16px; padding: 7px 14px; border: 1px solid var(--copper); border-radius: 999px; font: 500 12px/1.4 var(--sans); letter-spacing: .14em; text-transform: uppercase; color: var(--copper); }
.einleitung p { font-size: 18px; line-height: 1.65; }
.unterweisung { margin: 28px 0 8px; padding: 24px 26px 22px; border: 1px solid var(--line); border-left: 3px solid var(--copper); border-radius: 3px; background: rgba(184,114,79,.06); }
.unterweisung .kicker { margin: 0 0 4px; font: 500 12px/1.6 var(--sans); letter-spacing: .18em; text-transform: uppercase; color: var(--copper); }
.unterweisung h2 { margin: 0 0 10px; }
.unterweisung p { max-width: none; text-align: left; margin: 0 0 10px; }
.fakten { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 10px; }
.fakten li { margin: 0; max-width: none; padding: 6px 12px; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.6); font-size: 14px; color: var(--ink-soft); }
.teile { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 0 0 14px; counter-reset: teil; }
.teil { position: relative; padding: 26px 20px 20px; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.45); }
.teil::before { counter-increment: teil; content: "Teil " counter(teil); display: block; font: 500 12px/1.6 var(--sans); letter-spacing: .18em; text-transform: uppercase; color: var(--copper); margin: 0 0 6px; }
html[lang="en"] .teil::before { content: "Part " counter(teil); }
.teil h3 { margin: 0 0 10px; font: 500 21px/1.25 var(--serif); color: var(--green); }
.teil p { font-size: 15px; color: var(--ink-soft); margin: 0; max-width: none; text-align: left; }
.kapitel { list-style: none; margin: 0 0 8px; padding: 0; }
.kapitel li { display: grid; grid-template-columns: 40px 1fr auto; gap: 4px 16px; padding: 14px 0; border-top: 1px solid var(--line); max-width: none; text-align: left; }
.kapitel li:last-child { border-bottom: 1px solid var(--line); }
.kapitel .nr { font: 500 12px/1.9 var(--sans); letter-spacing: .18em; color: var(--copper); }
.kapitel strong { display: block; font-weight: 500; }
.kapitel span.was { display: block; color: var(--ink-soft); font-size: 15px; }
.kapitel .min { color: var(--ink-muted); font-size: 13px; white-space: nowrap; padding-top: 4px; }
.partner { list-style: none; margin: 0 0 14px; padding: 0; }
.partner li { padding: 14px 0; border-top: 1px solid var(--line); max-width: none; text-align: left; }
.partner li:last-child { border-bottom: 1px solid var(--line); }
.partner .kennzeichnung { display: inline-block; margin: 0 10px 4px 0; padding: 2px 8px; border: 1px solid var(--line); border-radius: 3px; font: 500 11px/1.6 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-muted); }
.partner p { margin: 4px 0 0; font-size: 15px; color: var(--ink-soft); max-width: none; text-align: left; }
.formate { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 0 0 14px; }
.format { padding: 22px 20px 18px; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.45); display: flex; flex-direction: column; }
.format h3 { margin: 0 0 8px; font: 500 20px/1.25 var(--serif); color: var(--green); }
.format p { font-size: 15px; color: var(--ink-soft); margin: 0 0 12px; max-width: none; text-align: left; flex: 1; }
.format .preis { font: 400 clamp(19px, 2.2vw, 23px)/1.2 var(--serif); color: var(--ink); margin: 0 0 4px; }
.format .klein { font: 400 13px/1.45 var(--sans); color: var(--ink-muted); margin: 0; flex: 0; }
.ablauf { counter-reset: schritt; list-style: none; padding: 0; margin: 0 0 18px; }
.ablauf li { position: relative; padding: 0 0 16px 46px; margin: 0; }
.ablauf li::before { counter-increment: schritt; content: counter(schritt); position: absolute; left: 0; top: 0; width: 30px; height: 30px; border-radius: 50%; background: var(--green); color: var(--paper); display: grid; place-items: center; font: 500 13px/1 var(--sans); }
.anfrage { position: relative; margin: 8px 0 8px; padding: 22px 24px 20px; border: 1px solid var(--line); border-left: 2px solid var(--copper); border-radius: 3px; background: rgba(255,255,255,.45); }
.anfrage .reihe { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.anfrage label { display: block; font-size: 14px; color: var(--ink-soft); margin: 12px 0 4px; }
.anfrage input, .anfrage select, .anfrage textarea { width: 100%; font: inherit; font-size: 16px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.7); color: var(--ink); }
.anfrage button { margin-top: 18px; padding: 11px 20px; border: 1px solid var(--green); border-radius: 3px; background: var(--green); color: var(--paper); font: inherit; font-size: 15px; cursor: pointer; }
.anfrage button:hover { background: #082d22; }
.anfrage button:disabled { opacity: .6; cursor: default; }
.anfrage button:focus-visible, .anfrage input:focus-visible, .anfrage select:focus-visible, .anfrage textarea:focus-visible { outline: 2px solid var(--copper); outline-offset: 2px; }
.anfrage .status { min-height: 1.4em; margin: 10px 0 0; font-size: 15px; }
.anfrage .status.ok { color: var(--green); }
.anfrage .status.warn { color: #A63D2F; }
.anfrage .falle { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.anfrage .hinweis { margin: 12px 0 0; }
.wege { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; margin: 0 0 20px; padding: 0; list-style: none; }
.wege li { margin: 0; max-width: none; }
.wege .knopf { display: inline-block; padding: 10px 16px; border-radius: 3px; text-decoration: none; font-size: 15px; background: var(--green); color: var(--paper); border: 1px solid var(--green); }
.wege .knopf:hover { background: #082d22; color: var(--paper); }
.wege .zweit { background: transparent; color: var(--ink); border-color: var(--copper); }
.wege .zweit:hover { background: rgba(184,114,79,.08); color: var(--ink); }
.wege .mail { font-size: 15px; }
@media (max-width: 720px) { .teile, .formate { grid-template-columns: 1fr; } .anfrage .reihe { grid-template-columns: 1fr; } .kapitel li { grid-template-columns: 40px 1fr; } .kapitel .min { grid-column: 2; padding-top: 0; } }`;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Browser-Teil: die Anfrage an Gochs Worker
// senden – wie das Kontaktformular der Startseite (contact.js): Felder zu einer Nachricht, Falle „website“, Ladezeitpunkt t.
const SKRIPT = (lang, t) => `<script>
(() => {
  'use strict';
  const T = ${JSON.stringify({ felder: t.felder, formate: Object.fromEntries(t.formatOptionen), sendet: t.sendet, gesendet: t.gesendet, ungueltig: t.ungueltig, fehler: t.fehler, betreff: t.betreff })};
  const form = document.getElementById('anfrage'); if (!form) return;
  const status = document.getElementById('anfrage-status'), knopf = document.getElementById('anfrage-senden'), geladen = Date.now();
  const say = (text, art) => { status.textContent = text; status.className = 'status' + (art ? ' ' + art : ''); };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const firma = (d.firma || '').trim(), name = (d.name || '').trim(), email = (d.email || '').trim(), personen = parseInt(d.personen, 10);
    if (firma.length < 2 || name.length < 2 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email) || !(personen > 0)) { say(T.ungueltig, 'warn'); return; }
    const zeile = (k, v) => v ? T.felder[k] + ': ' + String(v).trim() : null;
    const message = [T.betreff, '', zeile('firma', d.firma), zeile('format', T.formate[d.format] || d.format), zeile('personen', personen), zeile('zeitraum', d.zeitraum)]
      .filter(x => x !== null).join('\\n').trim();
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

export function workshopsSeite(lang) {
  const t = TEXT[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const andere = lang === "en" ? "de" : "en", up = lang === "en" ? "../../" : "../", home = up + (lang === "en" ? "?lang=en" : "");
  const canonical = workshopsUrl(lang);
  const main = `<article class="workshops">
<h1>${esc(t.titel)}</h1>
<p class="abzeichen">${esc(t.abzeichen)}</p>
<p class="untertitel">${esc(t.untertitel)}</p>
<p class="meta">${esc(t.meta)}</p>
<div class="einleitung">
${t.intro.map(p => `<p>${esc(p)}</p>`).join("\n")}
</div>
<ul class="wege">
<li><a class="knopf" href="#anfrage">${esc(t.anfrageTitel)}</a></li>
<li><a class="mail" href="mailto:robin@robin.vision">robin@robin.vision</a></li>
</ul>
<h2 id="teile">${esc(t.teileTitel)}</h2>
<div class="teile">
${t.teile.map(([titel, text]) => `<section class="teil"><h3>${esc(titel)}</h3><p class="frei">${esc(text)}</p></section>`).join("\n")}
</div>
<section class="unterweisung" aria-labelledby="unterweisung">
<p class="kicker">${esc(t.unterweisungKicker)}</p>
<h2 id="unterweisung">${esc(t.unterweisungTitel)}</h2>
${t.unterweisung.map(p => `<p class="frei">${esc(p)}</p>`).join("\n")}
<ul class="fakten">${t.fakten.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
</section>
<h2 id="fuer-wen">${esc(t.fuerWenTitel)}</h2>
<ul>
${t.fuerWen.map(p => `<li>${esc(p)}</li>`).join("\n")}
</ul>
<h2 id="inhalt">${esc(t.inhaltTitel)}</h2>
<p>${esc(t.inhaltLead)}</p>
<ol class="kapitel">
${t.kapitel.map(([titel, was, min], i) => `<li><span class="nr">0${i + 1}</span><div><strong>${esc(titel)}</strong><span class="was">${esc(was)}</span></div><span class="min">${min} ${t.min}</span></li>`).join("\n")}
</ol>
<h2 id="werkzeuge">${esc(t.werkzeugeTitel)}</h2>
${t.werkzeuge.map(p => `<p>${esc(p)}</p>`).join("\n")}
${partnerListe(lang, t)}
<h2 id="formate">${esc(t.formateTitel)}</h2>
<p>${esc(t.formateLead)}</p>
<div class="formate">
${t.formate.map(f => `<section class="format"><h3>${esc(f.name)}</h3><p class="frei">${esc(f.text)}</p><p class="preis frei">${esc(f.preis)}</p><p class="klein frei">${esc(f.klein)}</p></section>`).join("\n")}
</div>
<p class="hinweis">${esc(t.auffrischung)}</p>
<h2 id="ablauf">${esc(t.ablaufTitel)}</h2>
<ol class="ablauf">
${t.ablauf.map(s => `<li>${esc(s)}</li>`).join("\n")}
</ol>
<h2 id="nachweis">${esc(t.nachweisTitel)}</h2>
${t.nachweis.map(p => `<p>${p}</p>`).join("\n")}
<h2 id="recht">${esc(t.rechtTitel)}</h2>
${t.recht.map(p => `<p>${esc(p)}</p>`).join("\n")}
<h2 id="fragen">${esc(t.fragenTitel)}</h2>
<div class="fragen">
${t.fragen.map(([f, a]) => `<h3>${esc(f)}</h3>\n<p>${esc(a)}</p>`).join("\n")}
</div>
<h2 id="anfrage">${esc(t.anfrageTitel)}</h2>
<p>${esc(t.anfrageLead)}</p>
<form class="anfrage" id="anfrage" novalidate>
<div class="reihe">
<div><label for="a-firma">${esc(t.felder.firma)}</label><input type="text" id="a-firma" name="firma" maxlength="120" required autocomplete="organization"></div>
<div><label for="a-name">${esc(t.felder.name)}</label><input type="text" id="a-name" name="name" maxlength="80" required autocomplete="name"></div>
<div><label for="a-email">${esc(t.felder.email)}</label><input type="email" id="a-email" name="email" maxlength="120" required autocomplete="email"></div>
<div><label for="a-format">${esc(t.felder.format)}</label><select id="a-format" name="format">${t.formatOptionen.map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
<div><label for="a-personen">${esc(t.felder.personen)}</label><input type="number" id="a-personen" name="personen" min="1" max="500" value="10" required></div>
<div><label for="a-zeitraum">${esc(t.felder.zeitraum)} <span>${esc(t.felder.optional)}</span></label><input type="text" id="a-zeitraum" name="zeitraum" maxlength="80" placeholder="z. B. Februar 2027"></div>
</div>
<div class="falle" aria-hidden="true"><label for="a-website">Website</label><input type="text" id="a-website" name="website" tabindex="-1" autocomplete="off"></div>
<button type="submit" id="anfrage-senden">${esc(t.senden)}</button>
<p class="status" id="anfrage-status" role="status" aria-live="polite"></p>
<p class="meta hinweis">${esc(t.datenschutz)}</p>
</form>
<p class="meta">${esc(t.oder)} <a href="${home}#nachricht">${esc(t.nachricht)}</a> · <a href="mailto:robin@robin.vision">robin@robin.vision</a></p>
<p class="meta"><a href="${up}${WORKSHOPS.find(s => s.lang === andere).adresse}" lang="${andere}" hreflang="${andere}">${esc(t.andere)}</a></p>
${newsletterKasten(lang, up, "impuls")}
</article>
${SKRIPT(lang, t)}`;
  const kurs = JSON.stringify({ "@context": "https://schema.org", "@type": "Course", name: `${t.titel} – ${t.abzeichen}`, description: t.beschr, url: canonical, inLanguage: "de",
    provider: { "@type": "Person", "@id": SITE + "#person", name: "Robin James Lewis", url: SITE },
    educationalLevel: "Beginner", timeRequired: "PT2H30M", teaches: t.kapitel.map(k => k[0]),
    hasCourseInstance: [
      { "@type": "CourseInstance", courseMode: "Online", courseWorkload: "PT2H30M", name: t.formate[0].name },
      { "@type": "CourseInstance", courseMode: "Onsite", courseWorkload: "PT4H", name: t.formate[1].name },
    ] }).replace(/</g, "\\u003c");
  const faq = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: lang,
    mainEntity: t.fragen.map(([f, a]) => ({ "@type": "Question", name: f, acceptedAnswer: { "@type": "Answer", text: a } })) }).replace(/</g, "\\u003c");
  return rahmen({ lang, up, titel: t.titel, seitentitel: t.seitentitel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: workshopsUrl(andere) }],
    head: `<script type="application/ld+json">${kurs}</script>\n<script type="application/ld+json">${faq}</script>\n`, css: CSS, main, aktiv: "workshops" });
}
