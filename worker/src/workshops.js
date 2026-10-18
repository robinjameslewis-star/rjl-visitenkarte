// Seite „Workshops“ (workshops/index.html, englisch workshops/en/index.html; Robin, 17.10.2026): der Workshop KI-Kompetenz für Teams,
// mit der Unterweisung nach Art. 4 KI-Verordnung (EU AI Act) als hervorgehobenem Teil (Badge unter der Überschrift, eigener Kasten) – Workshop mit Robin
// (Hemmschwellen überwinden, Anwendungsfälle entwickeln, gemeinsam ein kleines Werkzeug im Browser bauen), Online-Lehrgang im
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
    seitentitel: "Workshop KI-Kompetenz mit Unterweisung nach EU AI Act für Kanzleien und Unternehmen | robin.vision",
    beschr: "KI-Kompetenz für Ihr Team: ein Workshop, der Hemmschwellen überwindet, ein Online-Lehrgang, der Ihre Mitarbeitenden schult und weiterentwickelt, und ein Test mit Zertifikat nach Art. 4 KI-Verordnung. Für Kanzleien und Unternehmen, online oder vor Ort, auf Deutsch oder Englisch.",
    untertitel: "Ein Workshop, der Hemmschwellen überwindet. Ein Online-Lehrgang, der Ihr Team schult und weiterentwickelt. Ein Zertifikat, das Ihre Maßnahme nach Art. 4 KI-Verordnung belegt.",
    meta: "Für Kanzleien und Unternehmen · online oder vor Ort, europaweit · auf Deutsch oder Englisch · Termine ab Januar 2027",
    intro: [
      "Künstliche Intelligenz ist in Ihrem Team angekommen – im Posteingang, in der Buchhaltung, im Alltag. Die KI-Verordnung verlangt deshalb von jedem Betrieb, der KI einsetzt, Maßnahmen zur KI-Kompetenz seines Personals. Dieser Workshop ist eine solche Maßnahme: praxisnah, auf Kanzlei und Rechnungswesen zugeschnitten, mit Nachweis.",
      "Ihr Team lernt, was KI heute kann und wo sie scheitert, welche Daten nie in ein öffentliches Werkzeug gehören und wie man Ergebnisse prüft, bevor sie zählen. Am Ende steht ein Zertifikat je Person – und die Sicherheit, KI im Alltag richtig einzusetzen.",
    ],
    anfrageTitel: "Workshop anfragen",
    teileTitel: "Drei Teile, ein Ergebnis",
    teile: [
      ["Workshop", "90 Minuten online oder ein halber Tag vor Ort. Ich greife die Fälle Ihres Teams auf, nehme Berührungsängste und entwickle mit Ihnen Anwendungsfälle für Ihren Alltag. Gemeinsam bauen wir ein kleines Werkzeug im Browser für einen echten Schmerzpunkt – so erlebt jede Person, was KI kann und wo sie sicher scheitert."],
      ["Online-Lehrgang", "Sieben Lektionen, die den Workshop vertiefen und in die tägliche Arbeit übertragen: Lernziele, Fälle aus dem Rechnungswesen, Selbstchecks und je Lektion eine Praxisaufgabe am eigenen Arbeitsplatz. Etwa 70 Minuten Lernzeit in Etappen, mit eigenem Zugang; das Skript dient zum Nachschlagen."],
      ["Test und Zertifikat", "15 Fragen, jede Antwort erklärt, Wiederholung jederzeit. Mit dem Bestehen erhält jede Person ihr Zertifikat über die Unterweisung nach EU AI Act – online prüfbar. Sie erhalten die Teilnehmerliste für Ihr Schulungsverzeichnis."],
    ],
    unterweisungKicker: "Teil dieses Workshops",
    unterweisungTitel: "Die Unterweisung nach EU AI Act",
    unterweisung: [
      "Mit Online-Lehrgang, Test und Zertifikat belegen Sie Ihre Maßnahme nach Art. 4 KI-Verordnung – je Person, mit Inhalten, Dauer, Fassung und Rechtsstand. Jedes Zertifikat ist drei Jahre online prüfbar; die Teilnehmerliste ergänzt Ihr Schulungsverzeichnis.",
    ],
    fakten: ["Art. 4 KI-Verordnung (EU AI Act)", "Zertifikat je Person, online prüfbar", "Teilnehmerliste für das Schulungsverzeichnis"],
    fuerWenTitel: "Für wen",
    fuerWen: [
      "Steuerkanzleien und Buchhaltungsbüros: Finanzbuchhaltung, Lohn, Jahresabschluss, Auszubildende, Empfang.",
      "Unternehmen: Rechnungswesen, Verwaltung, Assistenz – alle, die mit Belegen, Zahlen und Daten Dritter arbeiten.",
      "Keine Vorkenntnisse nötig. Die Beispiele kommen aus Ihrem Alltag: Buchungsvorschläge, Mandantenschreiben, Kontoauszüge, Zusammenfassungen.",
    ],
    inhaltTitel: "Inhalt",
    inhaltLead: "Sieben Kapitel – im Workshop angelegt, im Lehrgang mit Praxisaufgaben vertieft, im Test geprüft:",
    kapitel: [
      ["Was KI heute ist – und was nicht", "Sprachmodelle, Agenten, Automatisierung; warum KI überzeugend klingt, auch wenn sie falsch liegt", 11],
      ["Die KI-Verordnung in zehn Minuten", "Was Betreiber sind, welche Pflichten gelten, was Art. 4 verlangt", 10],
      ["Daten, die nie hinein dürfen", "Mandanten- und Personendaten, Berufsgeheimnis, DSGVO; sichere Wege mit Platzhaltern", 12],
      ["Ergebnisse prüfen", "Zahlen, Quellen und Rechtsstand prüfen; Vier-Augen-Prinzip; GoBD", 12],
      ["Gut fragen, gut arbeiten", "Aufgabe, Zusammenhang, Format und Grenzen; Vorlagen; wann KI nichts bringt", 8],
      ["Risiken im Alltag", "Deepfakes und Phishing, blindes Vertrauen, Schatten-KI; wie man meldet", 8],
      ["Regeln im Haus", "KI-Richtlinie, erlaubte Werkzeuge, Freigaben, Ansprechperson", 8],
    ],
    min: "Min.",
    werkzeugeTitel: "Werkzeuge im Workshop",
    werkzeuge: [
      "Der Workshop lebt von Vorführungen an echten Fällen. Dafür zeige ich ausgewählte Werkzeuge verschiedener Anbieter, etwa SmartFormular FiBu lite, FiBu und Deklaration. Was Sie einsetzen, entscheiden Sie.",
    ],
    partnerHinweis: "Weitere Werkzeuge stelle ich hier vor, sobald sie Teil des Workshops sind.",
    formateTitel: "Zwei Formate",
    formateLead: "Beide beginnen mit dem Workshop und enden mit demselben Zugang je Person: Online-Lehrgang, Skript, Test und Zertifikat für 90 Tage.",
    formate: [
      { name: "Workshop online", text: "90 Minuten per Videokonferenz mit Ihrem Team. Danach der Zugang für alle: Online-Lehrgang, Skript, Test und Zertifikat.",
        preis: "Preis auf Anfrage", klein: "für Teams bis etwa 12 Personen; größere Gruppen nach Absprache" },
      { name: "Workshop vor Ort", text: "Ein halber Tag bei Ihnen, mit Übungen an eigenen Fällen und einem Werkzeug für Ihren Schmerzpunkt. Danach der Zugang für alle.",
        preis: "Preis auf Anfrage", klein: "für Teams bis etwa 15 Personen, zuzüglich Fahrtkosten" },
    ],
    auffrischung: "Werkzeuge und Regeln ändern sich. Deshalb gibt es jährlich eine Auffrischung mit neuer Fassung, Test und Zertifikat – damit Ihr Nachweis aktuell bleibt.",
    ablaufTitel: "So läuft es",
    ablauf: [
      "Sie senden eine Anfrage mit Unternehmen, Teilnehmerzahl, Wunschtermin und Format. Sie erhalten Angebot und Terminvorschläge, in der Regel innerhalb von zwei Werktagen.",
      "Nach Ihrer Zusage richte ich Ihren Zugang im Memberbereich ein. Sie tragen Ihre Teilnehmenden ein; jede Person erhält eine Einladung und einen eigenen Zugang. Angemeldet wird per Link aus der E-Mail oder, wer möchte, mit Passkey – ein Passwort gibt es nicht.",
      "Der Workshop findet statt, online oder bei Ihnen. Danach arbeiten die Teilnehmenden den Online-Lehrgang in Etappen durch, wann es passt, und setzen die Praxisaufgaben an ihrem Arbeitsplatz um.",
      "Der Test schließt ab: 15 Fragen, jede Antwort erklärt, Wiederholung jederzeit. Mit dem Bestehen entsteht das Zertifikat als PDF – mit Nummer und Prüfcode.",
      "Sie laden die Teilnehmerliste für Ihr Schulungsverzeichnis herunter. Der Zugang gilt 90 Tage; die Zertifikate bleiben drei Jahre prüfbar.",
    ],
    nachweisTitel: "Nachweis und Zertifikat",
    nachweis: [
      "Das Zertifikat nennt Person, Organisation, Inhalte, Dauer, Datum, Fassung und Rechtsstand der Unterweisung sowie Nummer und Prüfcode. Es ist der Nachweis von robin.vision über eine Maßnahme nach Art. 4 KI-Verordnung – keine amtliche Bescheinigung, und das steht auch darauf.",
      `Jedes Zertifikat lässt sich unter <a href="${MEMBER_PRUEFUNG}">member.robin.vision/zertifikat</a> prüfen. Als Arbeitgeber sehen Sie je Person den Stand – eingeladen, begonnen, Lehrgang abgeschlossen, bestanden – und die Zertifikatsnummer.`,
    ],
    rechtTitel: "Rechtlicher Rahmen",
    recht: [
      "Art. 4 der KI-Verordnung (Verordnung (EU) 2024/1689) verpflichtet Anbieter und Betreiber von KI-Systemen zu Maßnahmen, die die KI-Kompetenz ihres Personals fördern. Welche Maßnahmen das sind, entscheidet der Betrieb; ein bestimmtes Format, ein Test oder ein Zertifikat sind nicht vorgeschrieben. Dieser Workshop ist eine solche Maßnahme – mit einem Nachweis, der zeigt, was Sie getan haben.",
      "Der Workshop erklärt Pflichten allgemein, mit Rechtsstand je Fassung. Er ist keine Rechtsberatung; für den Einzelfall verweist er auf Steuerberater, Rechtsanwälte und Datenschutzbeauftragte. Vertragspartner ist Robin James Lewis, handelnd unter robin.vision; es gelten die AGB des Memberbereichs.",
    ],
    fragenTitel: "Fragen und Antworten",
    fragen: [
      ["Ist diese Schulung Pflicht?", "Die KI-Verordnung verlangt von Betrieben, die KI einsetzen, Maßnahmen zur KI-Kompetenz ihres Personals – wie, entscheidet der Betrieb. Dieser Workshop ist eine solche Maßnahme, mit Nachweis."],
      ["Warum ein Workshop und nicht nur ein Online-Kurs?", "Weil Hemmschwellen im Gespräch fallen und Fragen aus dem eigenen Alltag am meisten bringen. Im Workshop entwickelt Ihr Team eigene Anwendungsfälle und baut ein kleines Werkzeug; der Lehrgang vertieft das Wissen und überträgt es mit Praxisaufgaben in den Alltag, der Test schließt ab."],
      ["Was ist das Werkzeug, das wir bauen?", "Eine einzelne HTML-Datei, die im Browser läuft und einen konkreten Handgriff Ihres Teams erleichtert – eine Liste prüfen, einen Text nach festen Regeln erzeugen, Zahlen zusammenfassen. Ohne Installation, ohne Daten in der Cloud."],
      ["Was sehe ich als Arbeitgeber?", "Je Person den Stand – eingeladen, begonnen, Lehrgang abgeschlossen, bestanden – und die Zertifikatsnummer, als Liste für Ihr Schulungsverzeichnis. Punkte und Versuche sehen Sie nicht."],
      ["Was passiert, wenn jemand den Test nicht besteht?", "Nach jeder Abgabe steht zu jeder Frage die richtige Antwort mit Erklärung. Der Test lässt sich beliebig wiederholen, mit neu gezogenen Fragen."],
      ["Welche Technik brauchen wir?", "Einen Browser und eine E-Mail-Adresse je Person. Angemeldet wird mit einem Link aus der E-Mail; wer möchte, richtet einen Passkey ein, zum Beispiel per Fingerabdruck. Ein Passwort gibt es nicht. Der Lehrgang läuft im Browser, auch auf dem Handy."],
      ["Werden im Workshop Produkte gezeigt?", "Ja, an echten Fällen: ausgewählte Werkzeuge verschiedener Anbieter, etwa SmartFormular. Die Inhalte der Unterweisung bleiben davon unberührt; was Sie einsetzen, entscheiden Sie."],
      ["Ist der Workshop Rechtsberatung?", "Nein. Er erklärt Pflichten allgemein und verweist für den Einzelfall auf Steuerberater, Rechtsanwälte und Datenschutzbeauftragte."],
    ],
    anfrageLead: "Fünf Angaben genügen. Sie erhalten Angebot und Terminvorschläge persönlich per E-Mail, in der Regel innerhalb von zwei Werktagen.",
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
    seitentitel: "AI literacy workshop with EU AI Act training for accounting firms and companies | robin.vision",
    beschr: "AI literacy for your team: a workshop that breaks down barriers, an online course that trains your staff and builds their skills, and a test with a certificate under Article 4 of the EU AI Act. For accounting firms and companies, online or on site, in German or English.",
    untertitel: "A workshop that breaks down barriers. An online course that trains your team and builds their skills. A certificate that documents your measure under Article 4 of the EU AI Act.",
    meta: "For accounting firms and companies · online or on site, across Europe · in German or English · dates from January 2027",
    intro: [
      "Artificial intelligence has arrived in your team – in the inbox, in bookkeeping, in everyday work. The EU AI Act therefore requires every organisation that uses AI to take measures to ensure the AI literacy of its staff. This workshop is one such measure: practical, tailored to accounting and finance, with evidence.",
      "Your team learns what AI can do today and where it fails, which data must never go into a public tool and how to check results before they count. At the end there is a certificate for each person – and the confidence to use AI properly in daily work.",
    ],
    anfrageTitel: "Enquire about a workshop",
    teileTitel: "Three parts, one result",
    teile: [
      ["Workshop", "90 minutes online or half a day on site. I pick up your team's cases, take away the apprehension and develop use cases for your daily work with you. Together we build a small browser tool for a real pain point – so everyone experiences what AI can do and where it reliably fails."],
      ["Online course", "Seven lessons that deepen the workshop and carry it into day-to-day work: learning objectives, cases from accounting, self-checks and, in every lesson, a practical task at the participant's own desk. About 70 minutes of study in stages, with personal access; the handout serves as a reference."],
      ["Test and certificate", "15 questions, every answer explained, repeatable at any time. On passing, each person receives their certificate for the EU AI Act training – verifiable online. You receive the participant list for your training records."],
    ],
    unterweisungKicker: "Part of this workshop",
    unterweisungTitel: "The EU AI Act training",
    unterweisung: [
      "With the online course, the test and the certificate you document your measure under Article 4 of the EU AI Act – per person, with content, duration, edition and legal position. Every certificate can be verified online for three years; the participant list completes your training records.",
    ],
    fakten: ["Article 4 of the EU AI Act", "Certificate per person, verifiable online", "Participant list for your training records"],
    fuerWenTitel: "Who it is for",
    fuerWen: [
      "Tax and accounting firms: bookkeeping, payroll, year-end accounts, trainees, front desk.",
      "Companies: finance, administration, assistants – everyone who works with documents, figures and third-party data.",
      "No prior knowledge needed. The examples come from your daily work: posting suggestions, client letters, bank statements, summaries.",
    ],
    inhaltTitel: "Content",
    inhaltLead: "Seven chapters – opened in the workshop, deepened in the course with practical tasks, checked in the test:",
    kapitel: [
      ["What AI is today – and what it is not", "Language models, agents, automation; why AI sounds convincing even when it is wrong", 11],
      ["The EU AI Act in ten minutes", "What a deployer is, which obligations apply, what Article 4 requires", 10],
      ["Data that must never go in", "Client and personal data, professional secrecy, GDPR; safe routes with placeholders", 12],
      ["Checking results", "Checking figures, sources and legal position; four-eyes principle; GoBD", 12],
      ["Asking well, working well", "Task, context, format and limits; templates; when AI adds nothing", 8],
      ["Everyday risks", "Deepfakes and phishing, blind trust, shadow AI; how to report", 8],
      ["House rules", "AI policy, approved tools, approvals, contact person", 8],
    ],
    min: "min",
    werkzeugeTitel: "Tools in the workshop",
    werkzeuge: [
      "The workshop thrives on demonstrations with real cases. For that I show selected tools from various providers, such as SmartFormular FiBu lite, FiBu and Deklaration. What you use is your decision.",
    ],
    partnerHinweis: "I will present further tools here as soon as they are part of the workshop.",
    formateTitel: "Two formats",
    formateLead: "Both start with the workshop and end with the same access per person: online course, handout, test and certificate for 90 days.",
    formate: [
      { name: "Online workshop", text: "90 minutes by video call with your team. Then access for everyone: online course, handout, test and certificate.",
        preis: "Price on request", klein: "for teams of up to about 12 people; larger groups by arrangement" },
      { name: "On-site workshop", text: "Half a day at your premises, with exercises on your own cases and a tool for your pain point. Then access for everyone.",
        preis: "Price on request", klein: "for teams of up to about 15 people, plus travel costs" },
    ],
    auffrischung: "Tools and rules change. That is why there is an annual refresher with a new edition, test and certificate – so that your evidence stays current.",
    ablaufTitel: "How it works",
    ablauf: [
      "You send an enquiry with your company, the number of participants, a preferred date and the format. You receive a quote and proposed dates, usually within two working days.",
      "Once you accept, I set up your access in the member area. You enter your participants; each person receives an invitation and their own access. Signing in works with a link sent by email or, if preferred, with a passkey – there is no password.",
      "The workshop takes place, online or at your premises. Afterwards the participants work through the online course in stages, whenever it suits them, and complete the practical tasks in their day-to-day work.",
      "The test completes it: 15 questions, every answer explained, repeatable at any time. On passing, the certificate is issued as a PDF – with a number and a verification code.",
      "You download the participant list for your training records. Access lasts 90 days; the certificates remain verifiable for three years.",
    ],
    nachweisTitel: "Evidence and certificate",
    nachweis: [
      "The certificate states the person, the organisation, the content, duration, date, edition and legal position of the training, plus its number and verification code. It is evidence issued by robin.vision of a measure under Article 4 of the EU AI Act – not an official attestation, and it says so.",
      `Any certificate can be verified at <a href="${MEMBER_PRUEFUNG}">member.robin.vision/zertifikat</a>. As the employer you see each person's status – invited, started, course completed, passed – and the certificate number.`,
    ],
    rechtTitel: "Legal framework",
    recht: [
      "Article 4 of the EU AI Act (Regulation (EU) 2024/1689) obliges providers and deployers of AI systems to take measures that promote the AI literacy of their staff. Which measures is for the organisation to decide; a particular format, a test or a certificate is not prescribed. This workshop is one such measure – with evidence that shows what you have done.",
      "The workshop explains obligations in general terms, with the legal position stated for each edition. It is not legal advice; for individual cases it refers to tax advisers, lawyers and data protection officers. Your contracting partner is Robin James Lewis, trading as robin.vision; the terms of the member area apply.",
    ],
    fragenTitel: "Questions and answers",
    fragen: [
      ["Is this training mandatory?", "The EU AI Act requires organisations that use AI to take measures to ensure the AI literacy of their staff – how is for the organisation to decide. This workshop is one such measure, with evidence."],
      ["Why a workshop and not just an online course?", "Because barriers fall in conversation and questions from your own daily work help most. In the workshop your team develops its own use cases and builds a small tool; the course deepens that knowledge and carries it into daily work with practical tasks, and the test completes it."],
      ["What is the tool we build?", "A single HTML file that runs in the browser and eases one concrete task of your team – checking a list, generating a text by fixed rules, summarising figures. No installation, no data in the cloud."],
      ["What do I see as the employer?", "Each person's status – invited, started, course completed, passed – and the certificate number, as a list for your training records. Scores and attempts are not shown."],
      ["What happens if someone fails the test?", "After every submission the correct answer and an explanation are shown for each question. The test can be repeated as often as needed, with freshly drawn questions."],
      ["What do we need technically?", "A browser and an email address per person. Participants sign in with a link sent by email; anyone who prefers can set up a passkey, for example by fingerprint. There is no password. The course runs in the browser, on a phone too."],
      ["Are products shown in the workshop?", "Yes, on real cases: selected tools from various providers, such as SmartFormular. The content of the training is not affected; what you use is your decision."],
      ["Is the workshop legal advice?", "No. It explains obligations in general terms and refers to tax advisers, lawyers and data protection officers for individual cases."],
    ],
    anfrageLead: "Five details are enough. You receive a quote and proposed dates personally by email, usually within two working days.",
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
    educationalLevel: "Beginner", timeRequired: "PT3H", teaches: t.kapitel.map(k => k[0]),
    hasCourseInstance: [
      { "@type": "CourseInstance", courseMode: "Online", courseWorkload: "PT3H", name: t.formate[0].name },
      { "@type": "CourseInstance", courseMode: "Onsite", courseWorkload: "PT4H30M", name: t.formate[1].name },
    ] }).replace(/</g, "\\u003c");
  const faq = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: lang,
    mainEntity: t.fragen.map(([f, a]) => ({ "@type": "Question", name: f, acceptedAnswer: { "@type": "Answer", text: a } })) }).replace(/</g, "\\u003c");
  return rahmen({ lang, up, titel: t.titel, seitentitel: t.seitentitel, beschr: t.beschr, canonical,
    alternates: [{ lang, href: canonical }, { lang: andere, href: workshopsUrl(andere) }],
    head: `<script type="application/ld+json">${kurs}</script>\n<script type="application/ld+json">${faq}</script>\n`, css: CSS, main, aktiv: "workshops" });
}
