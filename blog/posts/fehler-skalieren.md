---
title: "Fehler skalieren – warum vor ARP die alten Regeln auf den Tisch gehören"
date: 2026-10-16
lang: de
status: draft
summary: "Fehler in Buchungsregeln und Vorjahresdaten wiederholen sich bei jedem Vorgang – wer Agenten einführen will, prüft zuerst die alten Regeln."
---

![Illustration: links eine Regelkarte mit einer umkreisten kupfernen Zeile; gestrichelte Linien tragen sie weiter auf zwei, vier und acht Kopien, auf denen dieselbe Zeile steht. Auf der letzten Kopie sitzt ein Rotkehlchen und blickt zurück nach links.](bilder/fehler-skalieren.jpg)

Ich habe gesehen, wie automatische Regeln für Geldeingänge auf der Bank danebenliegen. Eine Regel bucht die Erstattung der Krankenkasse für die Lohnfortzahlung als Erlös mit Umsatzsteuer. Eine andere erfasst einen Erlös, der in der Debitorenbuchhaltung schon steht, ein zweites Mal, wieder mit Umsatzsteuer. Und ein Kreditorenkonto, fest verknüpft mit Aufwandskonto und Steuerschlüssel, zieht Vorsteuer mit dem falschen Steuersatz. Ein Fehler in einer Regel bleibt kein Einzelfall. Er skaliert.

Ein ERP ist ein sehr gutes Archiv. Es sagt Ihnen, was war. Seit 2025 taucht ein Begriff auf, der mehr verspricht: ARP, Agentic Resource Planning. Agenten beobachten laufend, rechnen Folgen durch und handeln innerhalb von Leitplanken, die ein Mensch setzt – oder legen die Entscheidung zur Freigabe vor. So beschreibt es das Softwareunternehmen SHAKE, das daraus 2026 eine eigene Kategorie gemacht hat.

Am Maßstab ändert sich nichts. Nach § 145 Abs. 1 AO müssen sich Geschäftsvorfälle „in ihrer Entstehung und Abwicklung verfolgen lassen“. Ob ein Mensch, eine Regel oder ein Agent bucht, spielt dafür keine Rolle.

Schwierig wird es, wenn sich zwei Informationen widersprechen. Der Kreditor ist mit festem Steuerschlüssel und Aufwandskonto verknüpft, die E-Rechnung desselben Lieferanten weist einen anderen Steuersatz aus. Beides liegt vor. Wer gewinnt – die Regel oder der Sachverhalt? Für den Vorsteuerabzug zählt nach § 15 Abs. 1 Satz 1 Nr. 1 UStG die gesetzlich geschuldete Steuer für die tatsächliche Leistung. Die Regel ist eine Annahme aus der Vergangenheit, die Rechnung ein Beleg für den Sachverhalt. Doch auch sie kann falsch sein. Ein Widerspruch ist deshalb nichts, was eine Software still entscheiden sollte. Er ist ein Grund anzuhalten. Solange die Rechnung ein Belegbild war, fiel er nur auf, wenn jemand hinsah. Mit dem Datensatz der E-Rechnung lässt er sich maschinell erkennen.

Ein Agent, der aus Vorjahresbuchungen lernt, übernimmt deren Fehler als Muster. Nachvollziehbar wird er aus meiner Sicht nur, wenn festgehalten ist, welche Leitplanken ein Mensch gesetzt hat, welche Quelle bei einem Widerspruch Vorrang hat und wo ein Mensch freigibt.

ARP ist heute vor allem Anspruch. Gartner erwartet, dass über 40 % der agentischen KI-Projekte bis Ende 2027 abgebrochen werden, unter anderem wegen unzureichender Risikokontrolle (25.06.2025). Die Vorbereitung beginnt deshalb nicht mit neuer Software, sondern mit sorgfältiger Analyse der alten Abläufe: Welche Regeln laufen, wer hat sie angelegt, stimmen die Vorjahresdaten, und was passiert, wenn Regel und Beleg sich widersprechen?

Wann haben Sie zuletzt die automatischen Regeln in Ihrer Buchhaltung durchgesehen?
