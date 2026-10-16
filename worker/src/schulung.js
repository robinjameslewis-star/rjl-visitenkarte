// Seite „Schulung“ (schulung/index.html, englisch training/index.html; Robin, 16.10.2026, Member-Repo #105): die Unterweisung
// KI-Kompetenz nach Art. 4 KI-Verordnung im Rahmen der Werkzeugseiten (werkzeug.js, rahmen) – Inhalt, Formate und Preise, Ablauf,
// Nachweis, Rechtsrahmen ohne Übertreibung (Art. 4 verlangt Maßnahmen, kein Zertifikat), Fragen und Antworten (FAQPage) und ein
// Anfrageformular über Gochs Kontakt-Endpunkt. Der Text steht hier fest (keine Redaktion); tools/schulung-bauen.mjs schreibt beide
// Seiten. Preise sind Robins Vorschlag aus dem Konzept (Vault); vor dem Verkauf: FernUSG-Weg und Rechnungsstellung (Konzept, 7).
import { rahmen } from "./werkzeug.js";
import { newsletterKasten } from "./kasten.js";
import { SEITEN } from "./sitemap.js";

const SITE = "https://robin.vision/";
export const KONTAKT_ENDPUNKT = "https://goch.robin.vision/contact";
export const MEMBER_PRUEFUNG = "https://member.robin.vision/zertifikat";
// Beide Sprachfassungen mit Pfad im Repository (Adressen in sitemap.js, SEITEN)
export const SCHULUNG = SEITEN.filter(s => s.id === "schulung").map(s => ({ ...s, pfad: s.adresse + "index.html" }));
export const schulungPfad = lang => SCHULUNG.find(s => s.lang === lang).pfad;
export const schulungUrl = lang => SITE + SCHULUNG.find(s => s.lang === lang).adresse;
// Preise netto in Euro (Konzept 16.10.2026): Vorschlag, Robin entscheidet
export const PREISE = { online: 49, online10: 39, online25: 29, live: 690, liveWeitere: 29, praesenz: 1490, praesenzWeitere: 29, auffrischung: 19 };

const eur = (n, lang) => lang === "en" ? `€${n.toLocaleString("en-GB")}` : `${n.toLocaleString("de-DE")} €`;

const TEXT = {
  de: {
    titel: "Unterweisung KI-Kompetenz",
    seitentitel: "Unterweisung KI-Kompetenz nach Art. 4 KI-Verordnung: Schulung für Kanzlei und Rechnungswesen – online oder vor Ort | robin.vision",
    beschr: "Schulung Ihrer Mitarbeitenden zur KI-Kompetenz nach Art. 4 KI-Verordnung, geschrieben für Kanzlei und Rechnungswesen: 90 Minuten mit Video, Skript, Test und Zertifikat. Online zum Selbstlernen, mit Live-Unterricht oder als Präsenzveranstaltung.",
    untertitel: "Für Mitarbeitende in Kanzleien und Unternehmen, die mit KI arbeiten – 90 Minuten, mit Test und Zertifikat.",
    meta: "Maßnahme nach Art. 4 KI-Verordnung · Rechtsstand 16. Oktober 2026 · Termine ab Januar 2027",
    intro: [
      "Die KI-Verordnung verlangt von jedem Betrieb, der KI einsetzt, Maßnahmen zur KI-Kompetenz seines Personals (Art. 4). Welche Maßnahmen das sind, bestimmt der Betrieb; ein Zertifikat oder eine Prüfung schreibt das Gesetz nicht vor. Diese Unterweisung ist eine solche Maßnahme, zugeschnitten auf das Rechnungswesen: Was KI kann und wo sie sicher scheitert, welche Daten nie in ein öffentliches Werkzeug gehören, wie man ein Ergebnis prüft, bevor es in eine Buchung oder ein Schreiben wandert.",
      "Jede Person bekommt einen eigenen Zugang zum Schulungsbereich auf member.robin.vision: das Video des Vortrags, das Skript zum Nachlesen, die Folien, ein Test mit 15 Fragen und nach dem Bestehen automatisch ein Zertifikat. Sie als Arbeitgeber sehen, wer teilgenommen und bestanden hat, und bekommen die Teilnehmerliste als Nachweis für Ihr Schulungsverzeichnis.",
    ],
    fuerWenTitel: "Für wen",
    fuerWen: [
      "Steuerkanzleien und Buchhaltungsbüros: Mitarbeitende in Finanzbuchhaltung, Lohn und Jahresabschluss, Auszubildende, Empfang.",
      "Unternehmen: Rechnungswesen, Verwaltung, Assistenz – alle, die mit Belegen, Zahlen und Daten Dritter arbeiten.",
      "Keine Vorkenntnisse nötig. Die Beispiele kommen aus dem Alltag in Kanzlei und Buchhaltung: Buchungsvorschläge, Mandantenschreiben, Kontoauszüge, Zusammenfassungen.",
    ],
    inhaltTitel: "Inhalt",
    inhaltLead: "Etwa 60 Minuten Vortrag, dazu Skript und Folien, am Ende der Test. Sieben Kapitel:",
    kapitel: [
      ["Was KI heute ist – und was nicht", "Sprachmodelle, Agenten, Automatisierung; Wahrscheinlichkeit statt Wahrheit; Halluzination", 10],
      ["Die KI-Verordnung in zehn Minuten", "Risikoklassen, Zeitplan, Art. 4 (Maßnahmen zur Kompetenz), Art. 50 (Kennzeichnung), was Betreiber sind", 10],
      ["Daten, die nie hinein dürfen", "Mandanten- und Personendaten, Berufsgeheimnis (§ 203 StGB, § 62a StBerG), DSGVO; öffentliche gegen betriebliche Werkzeuge; Platzhalter", 12],
      ["Ergebnisse prüfen", "Prüfen wie die Arbeit eines unerfahrenen Kollegen (BStBK); Zahlen, Quellen, Rechtsstand; Vier-Augen-Prinzip; GoBD", 12],
      ["Gut fragen, gut arbeiten", "Aufgabe, Zusammenhang, Format, Grenzen; Vorlagen; Nacharbeit; wann KI nichts bringt", 8],
      ["Risiken im Alltag", "Deepfakes und Phishing, Automatisierungsvertrauen, Verzerrung, Schatten-KI; wie man meldet", 5],
      ["Regeln im Haus", "KI-Richtlinie, erlaubte Werkzeuge, Freigaben, KI-Verzeichnis, Ansprechperson; die Rolle der Beschäftigten", 5],
    ],
    min: "Min.",
    formateTitel: "Drei Formate",
    formateLead: "Alle drei enden mit demselben Zugang je Person: Video, Skript, Folien, Test und Zertifikat für 90 Tage.",
    formate: [
      { name: "Online – Selbstlernen", text: "Zugang je Person: Video (etwa 60 Minuten), Skript, Folien, Test und Zertifikat. Fragen stellen die Teilnehmenden im Memberbereich; ich antworte dort.",
        preis: `${eur(PREISE.online, "de")} je Person`, klein: `ab 10 Personen ${eur(PREISE.online10, "de")}, ab 25 Personen ${eur(PREISE.online25, "de")} je Person` },
      { name: "Online – mit Live-Unterricht", text: "Videokonferenz von 90 Minuten mit mir: der Vortrag mit den Beispielen Ihres Hauses und Zeit für Fragen. Danach der Zugang für alle, mit Test und Zertifikat.",
        preis: `${eur(PREISE.live, "de")} je Termin`, klein: `bis 12 Personen, darüber ${eur(PREISE.liveWeitere, "de")} je weitere Person` },
      { name: "Präsenz", text: "Ein halber Tag bei Ihnen: drei Stunden mit Übungen an eigenen Fällen. Danach der Zugang für alle, mit Test und Zertifikat.",
        preis: `${eur(PREISE.praesenz, "de")} je Termin`, klein: `bis 15 Personen zuzüglich Fahrtkosten, darüber ${eur(PREISE.praesenzWeitere, "de")} je weitere Person` },
    ],
    auffrischung: `Jährliche Auffrischung mit neuer Fassung (Rechtsstand, neue Werkzeuge), Test und Zertifikat: ${eur(PREISE.auffrischung, "de")} je Person. Preise netto. Termine ab Januar 2027.`,
    ablaufTitel: "So läuft es",
    ablauf: [
      "Sie fragen an – mit Format, Personenzahl und Wunschzeitraum. Ich antworte mit einem Angebot und, bei Live und Präsenz, mit Terminvorschlägen.",
      "Nach Ihrer Bestätigung bekommen Sie eine E-Rechnung. Mit dem Zahlungseingang wird die Schulung im Memberbereich freigeschaltet.",
      "Sie tragen Namen und E-Mail-Adressen Ihrer Mitarbeitenden ein. Jede Person bekommt eine Einladung und einen eigenen Zugang, der nur die Schulung zeigt – mit Passkey statt Passwort.",
      "Die Teilnehmenden sehen das Video und lesen Skript und Folien, wann es passt, auch in Etappen. Live und Präsenz: der Termin mit mir, danach derselbe Zugang zum Nachlesen.",
      "Der Test: 15 Fragen, zufällig aus einem Vorrat von 30, bestanden ab 12 richtigen Antworten. Jede Antwort wird erklärt; Wiederholen ist jederzeit möglich.",
      "Mit dem Bestehen entsteht das Zertifikat als PDF – mit Nummer und Prüfcode, drei Jahre online prüfbar.",
      "Sie laden die Teilnehmerliste als Nachweis für Ihr Schulungsverzeichnis herunter. Der Zugang gilt 90 Tage; danach werden die Konten gelöscht, die Zertifikate bleiben.",
    ],
    nachweisTitel: "Nachweis und Zertifikat",
    nachweis: [
      "Das Zertifikat nennt Person, Organisation, Titel und Inhalte der Unterweisung, Dauer, Datum, Fassung und Rechtsstand, Zertifikatsnummer und Prüfcode. Es ist ein Nachweis von robin.vision über eine Maßnahme nach Art. 4 KI-Verordnung – keine amtliche oder akkreditierte Bescheinigung; das steht auch darauf.",
      `Prüfen lässt sich jedes Zertifikat unter <a href="${MEMBER_PRUEFUNG}">member.robin.vision/zertifikat</a> mit Nummer und Prüfcode. Der Arbeitgeber sieht je Person den Stand (eingeladen, begonnen, bestanden) und die Zertifikatsnummer, keine Punkte.`,
    ],
    rechtTitel: "Rechtlicher Rahmen",
    recht: [
      "Die KI-Verordnung (Verordnung (EU) 2024/1689) gilt seit dem 2. Februar 2025 auch für die Pflicht zur KI-Kompetenz. Mit dem Digital Omnibus (Verordnung (EU) 2026/1744, in Kraft seit 27. Juli 2026) wurde Art. 4 abgeschwächt: Anbieter und Betreiber müssen Maßnahmen ergreifen, die die KI-Kompetenz ihres Personals fördern – ein bestimmtes Niveau je Person ist nicht mehr geschuldet. Vorgeschrieben sind weder Zertifikat noch Test noch Format; als Nachweis dient ein Schulungsverzeichnis.",
      "Seit dem 2. August 2026 beaufsichtigen die nationalen Marktüberwachungsbehörden die Pflicht; einen eigenen Bußgeldtatbestand gibt es nicht. Werbung mit „Pflichtschulung“ oder „Bußgeld“ passt dazu nicht. Die Unterweisung wird deshalb so angeboten, wie sie ist: eine Maßnahme mit Nachweis.",
      "Die Unterweisung erklärt Pflichten allgemein, mit Rechtsstand je Fassung. Sie ist keine Rechtsberatung; für den Einzelfall verweist sie auf Steuerberater, Rechtsanwälte und Datenschutzbeauftragte.",
    ],
    fragenTitel: "Fragen und Antworten",
    fragen: [
      ["Ist diese Schulung Pflicht?", "Nein. Art. 4 der KI-Verordnung verpflichtet Betriebe, die KI einsetzen, zu Maßnahmen, die die KI-Kompetenz ihres Personals fördern. Welche Maßnahmen das sind, entscheidet der Betrieb; ein Zertifikat oder eine Prüfung schreibt das Gesetz nicht vor. Die Unterweisung ist eine solche Maßnahme, mit Nachweis, damit Sie belegen können, was Sie getan haben."],
      ["Was unterscheidet die Unterweisung von allgemeinen KI-Kursen?", "Sie ist für das Rechnungswesen geschrieben: Buchungsvorschläge, Mandantenschreiben, Kontoauszüge, Berufsgeheimnis, GoBD. Die Beispiele kommen aus der Praxis in Kanzlei und Buchhaltung."],
      ["Was sieht der Arbeitgeber?", "Je Person den Stand – eingeladen, begonnen, bestanden – und die Zertifikatsnummer, als Liste für das Schulungsverzeichnis. Punkte und Zahl der Versuche sieht er nicht."],
      ["Wie lange gilt das Zertifikat?", "Es trägt Fassung und Rechtsstand der Unterweisung und bleibt drei Jahre online prüfbar. Weil sich Werkzeuge und Regeln ändern, gibt es jährlich eine Auffrischung mit neuer Fassung."],
      ["Was ist, wenn jemand den Test nicht besteht?", "Nach jeder Abgabe steht zu jeder Frage die richtige Antwort mit Erklärung. Der Test lässt sich beliebig wiederholen, mit neu gezogenen Fragen. Nicht bestandene Versuche sieht nur die Person selbst."],
      ["Welche Technik brauchen die Teilnehmenden?", "Einen Browser und eine E-Mail-Adresse. Der Zugang wird mit einem Passkey eingerichtet, zum Beispiel per Fingerabdruck oder Gesichtserkennung, ohne Passwort. Video und Skript laufen im Browser; installiert wird nichts."],
      ["Ist die Unterweisung Rechtsberatung?", "Nein. Sie erklärt Pflichten allgemein, mit Rechtsstand je Fassung, und verweist für den Einzelfall auf Steuerberater, Rechtsanwälte und Datenschutzbeauftragte."],
    ],
    anfrageTitel: "Anfrage",
    anfrageLead: "Ich antworte persönlich per E-Mail, in der Regel innerhalb von zwei Werktagen, mit Angebot und Terminvorschlägen.",
    felder: { firma: "Kanzlei oder Unternehmen", name: "Ihr Name", email: "E-Mail-Adresse", format: "Format", personen: "Personen", zeitraum: "Wunschzeitraum", nachricht: "Nachricht", optional: "(freiwillig)" },
    formatOptionen: [["online", "Online – Selbstlernen"], ["live", "Online – mit Live-Unterricht"], ["praesenz", "Präsenz"], ["offen", "Noch offen"]],
    senden: "Anfrage senden", sendet: "Wird gesendet …",
    gesendet: "Danke – Ihre Anfrage ist angekommen. Ich melde mich per E-Mail.",
    ungueltig: "Bitte Name, eine gültige E-Mail-Adresse und mindestens eine Person angeben.",
    fehler: "Das Senden hat nicht geklappt. Schreiben Sie mir bitte direkt an robin@robin.vision.",
    datenschutz: "Ihre Angaben gehen per E-Mail an mich und werden nur für die Antwort verwendet. Einzelheiten stehen unter Impressum · Datenschutz.",
    betreff: "Anfrage Unterweisung KI-Kompetenz",
    oder: "Oder direkt:", termin: "Termin vereinbaren", nachricht: "Nachricht schreiben",
    andere: "This page in English",
  },
  en: {
    titel: "AI literacy training",
    seitentitel: "AI literacy training under Article 4 of the EU AI Act: for accounting firms and finance teams – online or on site | robin.vision",
    beschr: "Train your staff in AI literacy as required by Article 4 of the EU AI Act, written for accounting firms and finance teams: 90 minutes with video, handout, test and certificate. Self-paced online, online with live teaching, or on site.",
    untertitel: "For staff in accounting firms and companies who work with AI – 90 minutes, with a test and a certificate.",
    meta: "A measure under Article 4 of the EU AI Act · legal position as of 16 October 2026 · dates from January 2027 · taught in German",
    intro: [
      "The EU AI Act requires every organisation that uses AI to take measures to ensure the AI literacy of its staff (Article 4). What those measures are is for the organisation to decide; the law prescribes neither a certificate nor an exam. This training is one such measure, tailored to accounting: what AI can do and where it reliably fails, which data must never go into a public tool, and how to check a result before it ends up in a posting or a letter.",
      "Each participant gets their own access to the training area on member.robin.vision: the recorded lecture, the handout, the slides, a 15-question test and, on passing, a certificate issued automatically. As the employer you see who has taken part and passed, and you download the participant list as evidence for your training records.",
    ],
    fuerWenTitel: "Who it is for",
    fuerWen: [
      "Tax and accounting firms: staff in bookkeeping, payroll and year-end accounts, trainees, front desk.",
      "Companies: finance, administration, assistants – everyone who works with documents, figures and third-party data.",
      "No prior knowledge needed. The examples come from everyday work in firms and finance departments: posting suggestions, client letters, bank statements, summaries.",
    ],
    inhaltTitel: "Content",
    inhaltLead: "About 60 minutes of lecture, plus handout and slides, with the test at the end. Seven chapters:",
    kapitel: [
      ["What AI is today – and what it is not", "Language models, agents, automation; probability rather than truth; hallucination", 10],
      ["The EU AI Act in ten minutes", "Risk classes, timeline, Article 4 (literacy measures), Article 50 (labelling), what a deployer is", 10],
      ["Data that must never go in", "Client and personal data, professional secrecy (Sections 203 StGB and 62a StBerG), GDPR; public versus company tools; placeholders", 12],
      ["Checking results", "Review AI output like the work of an inexperienced colleague (German Chamber of Tax Advisers); figures, sources, legal position; four-eyes principle; GoBD", 12],
      ["Asking well, working well", "Task, context, format, limits; templates; rework; when AI adds nothing", 8],
      ["Everyday risks", "Deepfakes and phishing, automation bias, bias in models, shadow AI; how to report", 5],
      ["House rules", "AI policy, approved tools, approvals, AI register, contact person; the employee's role", 5],
    ],
    min: "min",
    formateTitel: "Three formats",
    formateLead: "All three end with the same access per person: video, handout, slides, test and certificate for 90 days.",
    formate: [
      { name: "Online – self-paced", text: "Access per person: video (about 60 minutes), handout, slides, test and certificate. Participants ask questions in the member area; I answer there.",
        preis: `${eur(PREISE.online, "en")} per person`, klein: `from 10 people ${eur(PREISE.online10, "en")}, from 25 people ${eur(PREISE.online25, "en")} per person` },
      { name: "Online – with live teaching", text: "A 90-minute video call with me: the lecture with examples from your firm and time for questions. Then access for everyone, with test and certificate.",
        preis: `${eur(PREISE.live, "en")} per session`, klein: `up to 12 people, then ${eur(PREISE.liveWeitere, "en")} per additional person` },
      { name: "On site", text: "Half a day at your premises: three hours with exercises on your own cases. Then access for everyone, with test and certificate.",
        preis: `${eur(PREISE.praesenz, "en")} per session`, klein: `up to 15 people plus travel costs, then ${eur(PREISE.praesenzWeitere, "en")} per additional person` },
    ],
    auffrischung: `Annual refresher with a new edition (legal position, new tools), test and certificate: ${eur(PREISE.auffrischung, "en")} per person. Prices exclude VAT. Dates from January 2027. The training is taught in German; an English edition is available on request.`,
    ablaufTitel: "How it works",
    ablauf: [
      "You send an enquiry with format, number of people and preferred period. I reply with a quote and, for live and on-site sessions, proposed dates.",
      "After your confirmation you receive an e-invoice. Once payment arrives, the training is unlocked in the member area.",
      "You enter the names and email addresses of your staff. Each person receives an invitation and their own access that shows only the training – with a passkey instead of a password.",
      "Participants watch the video and read the handout and slides whenever it suits them, in stages if they like. Live and on site: the session with me, then the same access for reading up.",
      "The test: 15 questions drawn at random from a pool of 30, passed from 12 correct answers. Every answer is explained; repeating is possible at any time.",
      "On passing, the certificate is issued as a PDF – with a number and a verification code, verifiable online for three years.",
      "You download the participant list as evidence for your training records. Access lasts 90 days; the accounts are then deleted, the certificates remain.",
    ],
    nachweisTitel: "Evidence and certificate",
    nachweis: [
      "The certificate states the person, the organisation, the title and content of the training, duration, date, edition and legal position, certificate number and verification code. It is evidence issued by robin.vision of a measure under Article 4 of the EU AI Act – not an official or accredited attestation, and it says so.",
      `Any certificate can be verified at <a href="${MEMBER_PRUEFUNG}">member.robin.vision/zertifikat</a> with its number and code. The employer sees each person's status (invited, started, passed) and the certificate number, not the score.`,
    ],
    rechtTitel: "Legal framework",
    recht: [
      "The EU AI Act (Regulation (EU) 2024/1689) has applied to the AI literacy obligation since 2 February 2025. The Digital Omnibus (Regulation (EU) 2026/1744, in force since 27 July 2026) softened Article 4: providers and deployers must take measures that promote the AI literacy of their staff – a specific level per person is no longer owed. Neither a certificate nor a test nor a format is prescribed; a training record serves as evidence.",
      "Since 2 August 2026 the national market surveillance authorities oversee the obligation; there is no separate fine for breaching it. Advertising a “mandatory course” or threatening fines does not fit that picture, so the training is offered for what it is: a measure with evidence.",
      "The training explains obligations in general terms, with the legal position stated for each edition. It is not legal advice; for individual cases it refers to tax advisers, lawyers and data protection officers.",
    ],
    fragenTitel: "Questions and answers",
    fragen: [
      ["Is this training mandatory?", "No. Article 4 of the EU AI Act obliges organisations that use AI to take measures that promote the AI literacy of their staff. Which measures is for the organisation to decide; the law prescribes neither a certificate nor an exam. The training is one such measure, with evidence so that you can show what you have done."],
      ["How does it differ from general AI courses?", "It is written for accounting: posting suggestions, client letters, bank statements, professional secrecy, German bookkeeping rules (GoBD). The examples come from practice in firms and finance departments."],
      ["What does the employer see?", "Each person's status – invited, started, passed – and the certificate number, as a list for the training records. Scores and the number of attempts are not shown."],
      ["How long is the certificate valid?", "It states the edition and legal position of the training and can be verified online for three years. Because tools and rules change, there is an annual refresher with a new edition."],
      ["What if someone fails the test?", "After every submission the correct answer and an explanation are shown for each question. The test can be repeated as often as needed, with freshly drawn questions. Failed attempts are visible only to the person."],
      ["What do participants need?", "A browser and an email address. Access is set up with a passkey, for example fingerprint or face recognition, without a password. Video and handout run in the browser; nothing is installed."],
      ["Is the training legal advice?", "No. It explains obligations in general terms, with the legal position stated for each edition, and refers to tax advisers, lawyers and data protection officers for individual cases."],
    ],
    anfrageTitel: "Enquiry",
    anfrageLead: "I reply personally by email, usually within two working days, with a quote and proposed dates.",
    felder: { firma: "Firm or company", name: "Your name", email: "Email address", format: "Format", personen: "People", zeitraum: "Preferred period", nachricht: "Message", optional: "(optional)" },
    formatOptionen: [["online", "Online – self-paced"], ["live", "Online – with live teaching"], ["praesenz", "On site"], ["offen", "Not decided yet"]],
    senden: "Send enquiry", sendet: "Sending …",
    gesendet: "Thank you – your enquiry has arrived. I will get back to you by email.",
    ungueltig: "Please give your name, a valid email address and at least one person.",
    fehler: "Sending did not work. Please email me directly at robin@robin.vision.",
    datenschutz: "Your details are emailed to me and used only to reply. Details are under Legal notice · Privacy.",
    betreff: "Enquiry: AI literacy training",
    oder: "Or directly:", termin: "Book an appointment", nachricht: "Write a message",
    andere: "Diese Seite auf Deutsch",
  },
};

const CSS = `.einleitung p { font-size: 18px; line-height: 1.65; }
.kapitel { list-style: none; margin: 0 0 8px; padding: 0; }
.kapitel li { display: grid; grid-template-columns: 40px 1fr auto; gap: 4px 16px; padding: 14px 0; border-top: 1px solid var(--line); max-width: none; text-align: left; }
.kapitel li:last-child { border-bottom: 1px solid var(--line); }
.kapitel .nr { font: 500 12px/1.9 var(--sans); letter-spacing: .18em; color: var(--copper); }
.kapitel strong { display: block; font-weight: 500; }
.kapitel span.was { display: block; color: var(--ink-soft); font-size: 15px; }
.kapitel .min { color: var(--ink-muted); font-size: 13px; white-space: nowrap; padding-top: 4px; }
.formate { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 0 0 14px; }
.format { padding: 22px 20px 18px; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.45); display: flex; flex-direction: column; }
.format h3 { margin: 0 0 8px; font: 500 20px/1.25 var(--serif); color: var(--green); }
.format p { font-size: 15px; color: var(--ink-soft); margin: 0 0 12px; max-width: none; text-align: left; flex: 1; }
.format .preis { font: 400 clamp(26px, 3vw, 32px)/1.1 var(--serif); color: var(--ink); margin: 0 0 4px; }
.format .klein { font: 400 13px/1.45 var(--sans); color: var(--ink-muted); margin: 0; flex: 0; }
.ablauf { counter-reset: schritt; list-style: none; padding: 0; margin: 0 0 18px; }
.ablauf li { position: relative; padding: 0 0 16px 46px; margin: 0; }
.ablauf li::before { counter-increment: schritt; content: counter(schritt); position: absolute; left: 0; top: 0; width: 30px; height: 30px; border-radius: 50%; background: var(--green); color: var(--paper); display: grid; place-items: center; font: 500 13px/1 var(--sans); }
.anfrage { position: relative; margin: 8px 0 8px; padding: 22px 24px 20px; border: 1px solid var(--line); border-left: 2px solid var(--copper); border-radius: 3px; background: rgba(255,255,255,.45); }
.anfrage .reihe { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.anfrage label { display: block; font-size: 14px; color: var(--ink-soft); margin: 12px 0 4px; }
.anfrage input, .anfrage select, .anfrage textarea { width: 100%; font: inherit; font-size: 16px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 3px; background: rgba(255,255,255,.7); color: var(--ink); }
.anfrage textarea { min-height: 110px; resize: vertical; }
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
.wege .knopf { display: inline-block; padding: 10px 16px; border-radius: 3px; text-decoration: none; font-size: 15px; background: transparent; color: var(--ink); border: 1px solid var(--copper); }
.wege .knopf:hover { background: rgba(184,114,79,.08); color: var(--ink); }
.wege .mail { font-size: 15px; }
@media (max-width: 720px) { .formate { grid-template-columns: 1fr; } .anfrage .reihe { grid-template-columns: 1fr; } .kapitel li { grid-template-columns: 40px 1fr; } .kapitel .min { grid-column: 2; padding-top: 0; } }`;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Anfrage: baut aus den Feldern eine Nachricht und schickt sie wie das Kontaktformular der Startseite an Gochs Worker (contact.js).
// Keine Cookies, kein Speicher; das unsichtbare Feld „website“ bleibt leer, t ist der Ladezeitpunkt (Bot-Falle des Workers).
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
    const name = (d.name || '').trim(), email = (d.email || '').trim(), personen = parseInt(d.personen, 10);
    if (name.length < 2 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email) || !(personen > 0)) { say(T.ungueltig, 'warn'); return; }
    const zeile = (k, v) => v ? T.felder[k] + ': ' + String(v).trim() : null;
    const message = [T.betreff, '', zeile('firma', d.firma), zeile('format', T.formate[d.format] || d.format), zeile('personen', personen), zeile('zeitraum', d.zeitraum), '', (d.nachricht || '').trim()]
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

export function schulungSeite(lang) {
  const t = TEXT[lang];
  if (!t) throw new Error("Unbekannte Sprache: " + lang);
  const andere = lang === "en" ? "de" : "en", up = "../", home = up + (lang === "en" ? "?lang=en" : "");
  const canonical = schulungUrl(lang);
  const main = `<article class="schulung">
<h1>${esc(t.titel)}</h1>
<p class="untertitel">${esc(t.untertitel)}</p>
<p class="meta">${esc(t.meta)}</p>
<div class="einleitung">
${t.intro.map(p => `<p>${esc(p)}</p>`).join("\n")}
</div>
<ul class="wege">
<li><a class="knopf" href="#anfrage">${esc(t.anfrageTitel)}</a></li>
<li><a class="knopf" href="${home}#kontakt">${esc(t.termin)}</a></li>
<li><a class="mail" href="mailto:robin@robin.vision">robin@robin.vision</a></li>
</ul>
<h2 id="fuer-wen">${esc(t.fuerWenTitel)}</h2>
<ul>
${t.fuerWen.map(p => `<li>${esc(p)}</li>`).join("\n")}
</ul>
<h2 id="inhalt">${esc(t.inhaltTitel)}</h2>
<p>${esc(t.inhaltLead)}</p>
<ol class="kapitel">
${t.kapitel.map(([titel, was, min], i) => `<li><span class="nr">0${i + 1}</span><div><strong>${esc(titel)}</strong><span class="was">${esc(was)}</span></div><span class="min">${min} ${t.min}</span></li>`).join("\n")}
</ol>
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
<div><label for="a-firma">${esc(t.felder.firma)}</label><input type="text" id="a-firma" name="firma" maxlength="120" autocomplete="organization"></div>
<div><label for="a-name">${esc(t.felder.name)}</label><input type="text" id="a-name" name="name" maxlength="80" required autocomplete="name"></div>
<div><label for="a-email">${esc(t.felder.email)}</label><input type="email" id="a-email" name="email" maxlength="120" required autocomplete="email"></div>
<div><label for="a-format">${esc(t.felder.format)}</label><select id="a-format" name="format">${t.formatOptionen.map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
<div><label for="a-personen">${esc(t.felder.personen)}</label><input type="number" id="a-personen" name="personen" min="1" max="500" value="10" required></div>
<div><label for="a-zeitraum">${esc(t.felder.zeitraum)} <span>${esc(t.felder.optional)}</span></label><input type="text" id="a-zeitraum" name="zeitraum" maxlength="80"></div>
</div>
<label for="a-nachricht">${esc(t.felder.nachricht)} <span>${esc(t.felder.optional)}</span></label><textarea id="a-nachricht" name="nachricht" maxlength="2000"></textarea>
<div class="falle" aria-hidden="true"><label for="a-website">Website</label><input type="text" id="a-website" name="website" tabindex="-1" autocomplete="off"></div>
<button type="submit" id="anfrage-senden">${esc(t.senden)}</button>
<p class="status" id="anfrage-status" role="status" aria-live="polite"></p>
<p class="meta hinweis">${esc(t.datenschutz)}</p>
</form>
<p class="meta">${esc(t.oder)} <a href="${home}#kontakt">${esc(t.termin)}</a> · <a href="${home}#nachricht">${esc(t.nachricht)}</a> · <a href="mailto:robin@robin.vision">robin@robin.vision</a></p>
<p class="meta"><a href="${up}${SCHULUNG.find(s => s.lang === andere).adresse}" lang="${andere}" hreflang="${andere}">${esc(t.andere)}</a></p>
${newsletterKasten(lang, up, "impuls")}
</article>
${SKRIPT(lang, t)}`;
  // Strukturierte Daten: Kurs mit drei Durchführungsarten und Preisen, dazu die Fragen als FAQPage
  const kurs = JSON.stringify({ "@context": "https://schema.org", "@type": "Course", name: t.titel, description: t.beschr, url: canonical, inLanguage: "de",
    provider: { "@type": "Person", "@id": SITE + "#person", name: "Robin James Lewis", url: SITE },
    educationalLevel: "Beginner", timeRequired: "PT1H30M", teaches: t.kapitel.map(k => k[0]),
    hasCourseInstance: [
      { "@type": "CourseInstance", courseMode: "Online", courseWorkload: "PT1H30M", name: t.formate[0].name, offers: { "@type": "Offer", price: String(PREISE.online), priceCurrency: "EUR", category: "per person" } },
      { "@type": "CourseInstance", courseMode: "Online", courseWorkload: "PT1H30M", name: t.formate[1].name, offers: { "@type": "Offer", price: String(PREISE.live), priceCurrency: "EUR", category: "per session, up to 12 people" } },
      { "@type": "CourseInstance", courseMode: "Onsite", courseWorkload: "PT3H", name: t.formate[2].name, offers: { "@type": "Offer", price: String(PREISE.praesenz), priceCurrency: "EUR", category: "per session, up to 15 people" } },
    ] }).replace(/</g, "\\u003c");
  const faq = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: lang,
    mainEntity: t.fragen.map(([f, a]) => ({ "@type": "Question", name: f, acceptedAnswer: { "@type": "Answer", text: a } })) }).replace(/</g, "\\u003c");
  return rahmen({ lang, up, titel: t.titel, seitentitel: t.seitentitel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: schulungUrl(andere) }],
    head: `<script type="application/ld+json">${kurs}</script>\n<script type="application/ld+json">${faq}</script>\n`, css: CSS, main, aktiv: "schulung" });
}
