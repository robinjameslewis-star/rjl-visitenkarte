# Robin James Lewis – Visitenkarte

Eine Seite: das handgezeichnete Rotkehlchen fliegt an und landet auf dem Ast, darunter ein
Kontaktformular. Gestaltung nach dem persönlichen Designsystem 3.1
(`Second Brain/90_Meta/Design/Designsystem.md`).

**Veröffentlichung zuerst:** siehe `GO-LIVE.md`. Der Ordner `worker/` (LLM-Proxy) ist Phase 2 und nicht eingebunden.

## Dateien

- `index.html` – Seite und Gestaltung; Kontaktformular und Cal.com-Einbettung
- `language.js` – deutsche und englische Texte, Sprachauswahl und Sprachparameter in der URL
- `site.js` – Formularmeldungen und Cal.com-Einbettung in der gewählten Sprache
- `bird-flight.js` – Flugbahn, Bildwechsel und Landung, ohne Animationsbibliothek
- `assets/flugpose-*.webp` – vier verlustfreie Flugposen
- `tests/bird-flight.test.cjs` – Verhaltenstests für die Animation
- `assets/vogel.png` – Vogel-Ebene (freigestellt, Beine enden an der Astkante)
- `assets/ast.png` – Ast-Ebene (Füße entfernt, Lücken rekonstruiert), liegt vor dem Vogel
- `assets/papier.jpg` – nahtlose Papierkachel
- `assets/favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`

## Animation

Vier Flugposen wechseln zwischen Aufschlag, Gleitflug, Abschlag und Landeanflug.
Der Anflug folgt einer kontinuierlichen Kurve von rechts oben nach unten zur Sitzposition, mit
kurzen Schlagphasen, einer ruhigen Gleitphase und weichem Abbremsen. Beim Aufsetzen
federn Vogel und Ast gemeinsam aus. Für die CD-konforme Ansicht bleibt der Vogel mit Blick nach
links ausgerichtet; beim Aufsetzen faltet er nur die Flügel ein, ohne Drehung.
Danach steht die Illustration ruhig, auch bei reduzierter Bewegung.

`bird-flight.js` steuert die Bewegung mit einer einzigen requestAnimationFrame-Schleife.
Die Posen sind am Auge auf die Sitzillustration ausgerichtet; kurze Überblendungen
mildern den Bildwechsel. Alle Bilder werden vor dem Start dekodiert. Bei Bildfehlern,
langsamer Verbindung, verborgenem Tab oder Größenwechsel bleibt/erscheint die Sitzpose.
Klick, Enter oder Leertaste auf die Szene wiederholt den Flug ohne Warteschlange.
Bei `prefers-reduced-motion` bleibt die Sitzpose statisch; Flugbilder werden beim
initialen Laden dieser Einstellung nicht angefordert. Inhalte bleiben sofort benutzbar.

Die vier Dateien `assets/flugpose-1-aufschlag.webp` bis `assets/flugpose-4-landeanflug.webp`
sind Website-Kopien der Entwürfe aus `Second Brain/90_Meta/Design/Entwuerfe/` (13_Flugpose_*.png).
Die vier Dateien sind WebP mit Qualität 86 (visuell verlustfrei), zusammen rund 430 KB; die verlustfreien Originale liegen als PNG im Vault.
Die Darstellung nutzt `mix-blend-mode: multiply`, damit Weiß mit dem Papier verschmilzt;
die Originaldateien werden weder freigestellt noch pixelweise bearbeitet.
Die Illustration ist eine Bildfolge aus vier gezeichneten Haltungen, keine anatomische
3D-Simulation. Geringe Zeichnungsunterschiede bleiben bei stark vergrößerter Ansicht sichtbar.

Einbau ausdrücklich von Robin am 13.09.2026 beauftragt (nach dem ursprünglichen Go-live-Plan).

## Sprache und Ansprache

Die Auswahl „Deutsch / English“ steht oben rechts. Deutsch ist der Standard;
`?lang=en` öffnet die englische Fassung direkt. Die Sprache wird nur in der URL geführt,
ohne Cookies oder lokalen Speicher. Ein Wechsel übersetzt die Seitentexte, Formulartitel,
Statusmeldungen, Bild-Bedienhinweise, Meta-Beschreibung und den Datenschutzhinweis.
Formulareingaben bleiben erhalten; die Animation wird nicht neu gestartet.

Texte (Robin, 14.09.2026): schlicht — „Termin vereinbaren“ / „Arrange an appointment“, ohne Du/Sie.
Der Einleitungssatz nennt Orte (auch ein Ort nach Wunsch des Gastes) und dass jede
Buchung erst ein Vorschlag ist, den Robin persönlich bestätigt.

Für Englisch wird der zweite Ereignistyp (`…-en`) geladen; die Texte im Kalender selbst
stammen von Cal.com. Beide Buchungslinks laden (geprüft 14.09.2026).

## Termine (Cal.com)

Terminbuchung läuft über Cal.com (kostenloser Einzelplan: 1 Person, unbegrenzte Termine und
Kalender, Apple Calendar wird unterstützt). Die Seite bettet den Buchungskalender ein und
färbt ihn in die CI; ohne geladenes Skript bleibt ein Link „Termin finden“ / „Find a time“.

Einrichtung (einmalig, ca. 30 Minuten):

1. Konto auf cal.com anlegen (Free). Benutzername merken.
2. **Google-Kalender verbinden** (Einstellungen → Kalender → Google Calendar, mit dem Google-Konto
   anmelden). Diesen Kalender als **Zielkalender** setzen – dorthin schreibt Cal.com die Buchungen,
   und nur so kann es Google-Meet-Links erzeugen. Dann die App **Google Meet** installieren
   (Apps → Konferenzen).
3. **Apple Kalender verbinden** (Einstellungen → Kalender → Apple Calendar) mit einem
   **app-spezifischen Passwort** (appleid.apple.com → Anmeldung und Sicherheit →
   App-spezifische Passwörter). Diese Kalender nur zur **Konfliktprüfung** anhaken.
4. Damit gebuchte Termine auf iPhone und Mac erscheinen: das Google-Konto einmal in der
   Kalender-App hinzufügen (Systemeinstellungen → Internetaccounts → Google → Kalender).
5. Verfügbarkeit: Einstellungen → Verfügbarkeit → Wochenplan (das ist die Freigabe), dazu
   „Datumsüberschreibungen“ für einzelne Tage. Pufferzeiten und Mindestvorlauf setzen.
6. Ereignistypen (Deutsch `robin-james-lewis`, Englisch `robin-james-lewis-en`), jeweils:
   - **Erweitert → „Bestätigung erforderlich“** einschalten. Damit ist jede Buchung ein
     Vorschlag: Der Gast erhält „Buchung eingereicht, wartet auf Bestätigung“, Robin bestätigt
     oder lehnt per Mail oder in Cal.com ab; erst dann gibt es Kalendereintrag und Meet-Link.
     Optional: nur bei kurzfristigen Buchungen (unter X Stunden Vorlauf) bestätigen lassen.
   - **Dauer:** „Mehrere Dauern zulassen“ (z. B. 15, 30, 60 Minuten) – der Gast wählt.
   - **Orte, mehrere zur Auswahl:** Google Meet (Link je Buchung), „Telefon (Gast wird
     angerufen)“ bzw. „Organisator ruft an“, „Persönlich – Adresse des Organisators“ (Balingen)
     und **„Persönlich – Adresse des Teilnehmers“**: der Gast trägt seinen Ortsvorschlag ein.
   - Name und Beschreibung des Ereignistyps schlicht: „Termin“ / „Appointment“; in der
     Beschreibung ein Satz, dass der Termin nach Bestätigung gilt.
7. In `index.html` stehen die Links in `data-booking-link` (Deutsch) und `data-booking-link-en` (Englisch).
   Nicht `data-cal-link` verwenden – das Attribut öffnet durch Cal.coms Skript ein dunkles Popup.
8. Cal.com → Einstellungen → Allgemein: Sprache Deutsch, Zeitzone Europe/Berlin, Wochenstart Montag;
   Erscheinungsbild: Hell. Die Seite färbt den eingebetteten Kalender selbst in die CI-Farben.

Warum nicht FaceTime: Ein FaceTime-Link ist dauerhaft; wer ihn hat, kann jederzeit anklopfen
(Entscheidung Robin, 13.09.2026). Google Meet erzeugt je Termin einen eigenen Link. Cal Video
(Cal.coms eigener Dienst) wäre die Alternative ohne Google-Konto – ebenfalls ein Link je Termin,
Gästen aber weniger vertraut.

Anzeige: Ab ca. 900 px Breite stehen Ereignisdetails, Monat und Uhrzeiten nebeneinander; auf dem
Handy untereinander. Der eingebettete Bereich hat eine Mindesthöhe von 640 px, bis Cal.com seine
Höhe meldet. In der Claude-Vorschau (Artefakt) ist das Cal.com-Skript aus Sicherheitsgründen
blockiert; dort erscheint nur der Link „Termin wählen“ – auf der echten Seite der Kalender.

Cal.com sendet Bestätigungen und Erinnerungen selbst und trägt den Termin in den Google-
Kalender ein, der auf allen Geräten erscheint. Die frühere Eigenlösung (eigener Kalender aus `termine.json` mit
Apple-Kalender-Export) liegt in der Git-Historie (Commit `1da32ec`).

## Formular

Ohne Konfiguration öffnet „Nachricht senden“ das Mailprogramm mit vorausgefüllter Mail
(`mailto:`). Für echten Versand ohne Mailprogramm einen Formular-Endpunkt eintragen:

    <form id="form" data-endpoint="https://formspree.io/f/DEINE-ID">

Der Endpunkt bekommt `{name, email, message}` als JSON. Honigtopf-Feld `company` ist enthalten.

## Veröffentlichen

Statisch – jeder Host geht: GitHub Pages (Repository → Settings → Pages → Branch `main`),
Netlify Drop (Ordner ziehen) oder ein beliebiger Webspace. Eigene Domain per CNAME.

## Herkunft der Ebenen

Aus `Second Brain/90_Meta/Design/Vorlagen/Assets/rotkehlchen_freigestellt.png` am 13.09.2026
getrennt: Schnitt bei Zeile 583, Fußzonen (x 410–492 und 536–626) im Ast aus den
Nachbarabschnitten rekonstruiert. Landeposition: Vogel 20 px (3,43 % seiner Höhe) tiefer
als die Rohebene, damit die Beinenden hinter dem Ast liegen.

## Prüfung der Animationssteuerung

`node tests/bird-flight.test.cjs` prüft die vier Posen und das Ende der Animation,
schnelle Wiederholung, reduzierte Bewegung, Bildladefehler, Tabwechsel und Größenänderung.
Die visuelle Abnahme erfolgt zusätzlich im Browser auf breitem und schmalem Bildschirm.
