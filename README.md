# Robin James Lewis – Visitenkarte

Eine Seite: das handgezeichnete Rotkehlchen fliegt an und landet auf dem Ast, darunter ein
Kontaktformular. Gestaltung nach dem persönlichen Designsystem 3.1
(`Second Brain/90_Meta/Design/Designsystem.md`).

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

## Termine (Kalender)

Die Seite zeigt freigegebene Zeiten aus `termine.json` (Monatsansicht, Kupferpunkt = frei).
Eine gewählte Zeit wandert in die Anfrage; die Art (FaceTime, Telefon, vor Ort) wählt der Gast.
Gebucht wird nichts automatisch: Die Anfrage kommt als Mail, Robin bestätigt mit einer
Kalendereinladung – bei FaceTime mit seinem FaceTime-Link (einmal in FaceTime „Link erstellen“,
der Link bleibt gültig; Gäste ohne Apple-Gerät öffnen ihn im Browser).

Freigeben – zwei Wege:

1. **Apple Kalender:** Kalender „Frei“ anlegen, dort Zeitblöcke eintragen (z. B. Do 14–15 Uhr),
   dann `tools/frei-export.sh` ausführen. Das Skript liest den Kalender „Frei“ (nächste 90 Tage,
   30-Minuten-Raster) und schreibt `termine.json`. Danach committen/hochladen. Beim ersten Lauf
   fragt macOS nach Kalenderzugriff für das Terminal.
2. **Von Hand:** `termine.json` bearbeiten: `{"datum": "2026-09-18", "zeiten": ["14:00", "14:30"]}`.

Vergangene Tage blendet die Seite selbst aus.

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
