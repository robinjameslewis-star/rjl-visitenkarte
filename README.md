# Robin James Lewis – Visitenkarte

Eine Seite: das handgezeichnete Rotkehlchen fliegt an und landet auf dem Ast, darunter ein
Kontaktformular. Gestaltung nach dem persönlichen Designsystem 3.1
(`Second Brain/90_Meta/Design/Designsystem.md`).

**Veröffentlichung zuerst:** siehe `GO-LIVE.md`. Der Ordner `worker/` (LLM-Proxy) ist Phase 2 und nicht eingebunden.

## Dateien

- `index.html` – komplette Seite (HTML, CSS, JS), keine Abhängigkeiten außer Google Fonts
- `assets/vogel.png` – Vogel-Ebene (freigestellt, Beine enden an der Astkante)
- `assets/ast.png` – Ast-Ebene (Füße entfernt, Lücken rekonstruiert), liegt vor dem Vogel
- `assets/papier.jpg` – nahtlose Papierkachel
- `assets/favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`

## Animation

Ablauf: Ast wird gezeichnet (clip-path) → Vogel fliegt von links oben ein, kippt in den
Landeanflug, kurzes Flattern (scaleY), setzt leicht unter dem Landepunkt auf und richtet
sich auf → Ast federt → Name und Formular erscheinen. Danach atmet der Vogel minimal.
Klick auf die Szene lässt ihn noch einmal anfliegen. Bei `prefers-reduced-motion` steht
alles sofort.

## Termine (Cal.com)

Terminbuchung läuft über Cal.com (kostenloser Einzelplan: 1 Person, unbegrenzte Termine und
Kalender, Apple Calendar wird unterstützt). Die Seite bettet den Buchungskalender ein und
färbt ihn in die CI; ohne geladenes Skript bleibt ein Link „Termin wählen“.

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
6. Ereignistyp anlegen, z. B. `gespraech`, 30 Minuten. Orte zur Auswahl: **Google Meet**
   (Link entsteht je Buchung automatisch, Gäste brauchen kein Konto, jeder Browser),
   „Telefon (Gast ruft an)“ und „Vor Ort“ mit der Adresse.
7. In `index.html` den Link eintragen: `data-cal-link="BENUTZERNAME/gespraech"`.
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
