# Robin James Lewis – Visitenkarte

Online: **https://robin.vision/** (seit 21.09.2026 eigene Domain bei Cloudflare, Seite weiter auf GitHub Pages, Branch
`main`, Datei `CNAME`; die alte Adresse https://robinjameslewis-star.github.io/rjl-visitenkarte/ leitet um. Goch:
`https://goch.robin.vision`, Redaktion `https://goch.robin.vision/admin`; `rjl-goch.rjl.workers.dev` bleibt parallel
erreichbar. Der Branch `wartung` enthält eine Wartungsseite ohne Fremddienste, siehe `GO-LIVE.md`)

Eine Seite: das handgezeichnete Rotkehlchen fliegt an und landet auf dem Ast, darunter die
Terminbuchung (Cal.com, erst nach Einwilligung geladen). Gestaltung nach dem persönlichen Designsystem 3.1
(`Second Brain/90_Meta/Design/Designsystem.md`).

**Veröffentlichung zuerst:** siehe `GO-LIVE.md`. Der Ordner `worker/` enthält Goch, das Rotkehlchen
von Robin (LLM-Proxy und Draht zu Robin); die Sprechblase auf der Seite ist eingebaut, aber erst
aktiv, wenn `data-chat-endpoint` am `<body>` gesetzt ist – siehe unten und `worker/README.md`.

## Dateien

- `index.html` – Seite und Gestaltung; Einwilligungsbanner, Impressum und Datenschutzhinweise
- `language.js` – deutsche und englische Texte (Seite, Banner, Datenschutz), Sprachparameter in der URL
- `site.js` – Einwilligung (Speichern, Widerruf, Ablauf) und Cal.com-Einbettung in der gewählten Sprache
- `assets/fonts/eb-garamond-latin.woff2` – EB Garamond lokal (variable Schrift, Latin), Lizenz `OFL.txt` daneben
- `bird-flight.js` – Flugbahn, Bildwechsel und Landung, ohne Animationsbibliothek
- `figuren/goch/` – Figurenpaket von Goch (seit 23.10.2026): `figur.json`, `bilder/` (Sitzpose und vier Flugposen, `bilder/bestand/` ohne Landschaft), `RECHTE.md`; Anleitung für weitere Figuren in `FIGUREN.md`, Prüfung mit `tools/figur-pruefen.mjs`
- `tests/bird-flight.test.cjs` – Verhaltenstests für die Animation; `tests/im-browser.html` führt sie ohne Node im Browser aus
- `tests/consent_test.py` – Prüfung der Einwilligung in einem frischen Headless-Chrome
- `goch.js` – Goch: Sprechblase am Ast (Einwilligung, Gespräch, Nachricht an Robin)
- `worker/profile.md`, `worker/aktuell.md` – was Goch weiß (von Robin freigegeben, öffentlich, in der Redaktion pflegbar); `worker/src/index.js` der Cloudflare Worker
- `worker/src/admin.js` – Redaktion – Backend der Website unter `/admin` (Aktuell, Links, Zähler; Anmeldung per E-Mail-Code)
- `tests/goch_fake_worker.py` – Attrappe des Workers für Tests ohne Cloudflare; `tests/goch_test.py` – Prüfung der Sprechblase in Headless-Chrome
- `tests/admin_fake.mjs` – Attrappe der Redaktion (echte Dashboard-Seite, feste API-Antworten, echte Blog-Vorschau) zum Prüfen des Editors im Browser
- `tests/blog_test.mjs` – Blog-Renderer ohne Worker: Open-Graph-Angaben, Vorschaubild-Regeln
- `landscape.js` – Landschaft: Himmel, Sonne, Mond, Sterne, Jahreszeit, Nachtpalette, Blätter, Sätze aus `assets/landschaften/` (Abschnitt „Landschaft“); `tools/landschaft-bilder.py` – Bilder freistellen und exportieren; `tools/landschaft-schablone.py` – Schablone für Bildagenten; `tests/landscape.test.cjs`, `tests/site_test.mjs`, `tests/tal_test.py` (Tal hinter der Startseite: Gewicht, Aufbau, Bildschirmfotos)
- `tests/bundle_check.mjs` – prüft vor dem Deploy das gebündelte Worker-Paket (eingebetteter Renderer läuft ohne Bündler-Helfer, Seitenskript der Redaktion)
- `tests/admin_test.py` – Prüfung des Blog-Editors (Werkzeuge, Karte/Video, Live-Vorschau, eigenes Fenster, lokale Sicherung) in Headless-Chrome gegen die Attrappe
- `figuren/goch/bilder/vogel.webp` – Vogel-Ebene (Sitzpose; `bilder/bestand/vogel.webp` WebP q92 auf Weiß, 66 KB; Beine enden an der Astkante); bis 22.10.2026 unter `assets/`
- `assets/ast.webp` – Ast-Ebene (verlustfreies WebP mit Transparenz, 48 KB), liegt vor dem Vogel
- `assets/papier.jpg` – nahtlose Papierkachel
- `assets/favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`

## Animation

Vier Flugposen wechseln zwischen Aufschlag, Gleitflug, Abschlag und Landeanflug.
Ohne Landschaft folgt der Anflug einer Kurve von rechts oben zur Sitzposition; mit Landschaft
kommt Goch von rechts unter dem Ast und steigt vor der Landung links der Krone auf, mit
kurzen Schlagphasen, einer ruhigen Gleitphase und weichem Abbremsen. Beim Aufsetzen
federn Vogel und Ast gemeinsam aus. Für die CD-konforme Ansicht bleibt der Vogel mit Blick nach
links ausgerichtet; beim Aufsetzen faltet er nur die Flügel ein, ohne Drehung.
Danach steht die Illustration ruhig, auch bei reduzierter Bewegung.

`bird-flight.js` steuert die Bewegung mit einer einzigen requestAnimationFrame-Schleife.
Die Posen sind am Auge auf die Sitzillustration ausgerichtet; kurze Überblendungen
mildern den Bildwechsel. Alle Bilder werden vor dem Start dekodiert. Bei Bildfehlern,
langsamer Verbindung, verborgenem Tab oder Größenwechsel bleibt/erscheint die Sitzpose.
Klick, Enter oder Leertaste auf die Szene wiederholt den Flug ohne Warteschlange. Ein Klick auf
den **Namen** lädt die Seite neu (Robin, 17.09.2026; zuvor kurz auf dem Vogel); Sprache (URL) und
Einwilligung (localStorage) bleiben dabei erhalten.

**Ankunft (17.09.2026):** Bis der Anflug beginnt, bleibt der Ast leer. Vorher saß der Vogel bei
kaltem Cache erst auf dem Ast, bis die Flugbilder geladen und dekodiert waren, und flog dann erst
an. Umsetzung: ein Inline-Skript im `<head>` setzt die Klasse `js`, die CSS-Regel `.js .bird-rest`
blendet die Sitzpose aus, `bird-flight.js` startet im Zustand `arriving` und blendet per
Inline-Stil ein – beim Flugstart, bei reduzierter Bewegung, Bildfehler, Zeitüberschreitung oder
verborgenem Tab. Lädt `bird-flight.js` nicht, entfernt `onerror` die Klasse; ohne Skript sitzt der
Vogel von Anfang an. Die Flugbilder werden per `<link rel=preload>` vorgeladen (nur ohne
`prefers-reduced-motion`); die Sitzpose ist WebP statt PNG (66 statt 830 KB), der Ast
verlustfreies WebP (48 statt 193 KB). Geprüft mit gedrosseltem Netz (1,5 Mbit/s): Ast leer →
Anflug nach 3,9 s → Landung; die Sitzpose war vorher nie sichtbar.
Bei `prefers-reduced-motion` bleibt die Sitzpose statisch; Flugbilder werden beim
initialen Laden dieser Einstellung nicht angefordert. Inhalte bleiben sofort benutzbar.

Die vier Dateien `flugpose-1-aufschlag.webp` bis `flugpose-4-landeanflug.webp` (seit 23.10.2026 in `figuren/goch/bilder/`)
sind Website-Kopien der Entwürfe aus `Second Brain/90_Meta/Design/Entwuerfe/` (13_Flugpose_*.png).
Die vier Dateien sind WebP mit Qualität 86 (visuell verlustfrei), zusammen rund 430 KB; die verlustfreien Originale liegen als PNG im Vault.
Die Darstellung nutzt `mix-blend-mode: multiply`, damit Weiß mit dem Papier verschmilzt;
die Originaldateien werden weder freigestellt noch pixelweise bearbeitet. Deshalb kann auch die
Sitzpose auf Weiß statt transparent liegen (`vogel.webp`); das freigestellte PNG liegt in der
Git-Historie (bis Commit `8d5d812`) und im Vault.
Die Illustration ist eine Bildfolge aus vier gezeichneten Haltungen, keine anatomische
3D-Simulation. Geringe Zeichnungsunterschiede bleiben bei stark vergrößerter Ansicht sichtbar.

Einbau ausdrücklich von Robin am 13.09.2026 beauftragt (nach dem ursprünglichen Go-live-Plan).

## Einwilligung (Cookie-Banner)

Cal.com setzt Cookies und überträgt IP-Adresse und Browserdaten, auch in die USA. Deshalb wird
der Kalender erst nach Zustimmung geladen (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO).
Entscheidung Robin, 14.09.2026: Banner mit Einwilligung statt Zwei-Klick-Lösung, weil nach und
nach weitere Inhalte auf die Seite kommen.

So verhält sich die Seite:

- **Erster Besuch:** Karte im Abschnitt „Termin“ an der Stelle des Kalenders mit „Terminbuchung erlauben“
  und „Ohne Terminbuchung fortfahren“ (gleichwertig gestaltet) sowie Link zu Impressum & Datenschutz. Bis
  14.10.2026 klebte sie als Banner am unteren Rand und verdeckte am Handy die halbe Seite; seit 16.10.2026
  (Robin, Review der Live-Seite) steht sie dort, wo sie hingehört, und stört beim Lesen nicht. Bis zur
  Entscheidung geht **keine Anfrage** an cal.com; darunter steht der externe Link zum Buchungskalender
  (öffnet cal.com erst beim Klick).
- **Erlauben:** Cal.com-Skript und Iframe werden eingefügt, der Hinweis verschwindet.
- **Ablehnen:** Banner schließt, Hinweis und externer Link bleiben.
- **Widerruf:** Fußzeile → „Datenschutzeinstellungen“ zeigt die Karte wieder, rollt hin (mit „Schließen“
  und Escape). Wird bei laufendem Kalender abgelehnt, lädt die Seite neu, damit Skript und Iframe
  des Anbieters vollständig verschwinden. Cookies, die Cal.com bereits gesetzt hat, kann die Seite
  nicht löschen; das steht so im Datenschutztext.
- **Speicherung:** nur `localStorage` unter `rjl-calendar-consent` mit Entscheidung, Zeitpunkt,
  Ablauf (180 Tage) und Textversion – keine Kennung, kein Cookie. Abgelaufene, fremde oder defekte
  Werte gelten als „nicht entschieden“. Die Entscheidung gilt für beide Sprachen und wird zwischen
  offenen Tabs übernommen.
- **Textänderung:** Ändert sich der Einwilligungstext, in `site.js` die `version` hochzählen
  (z. B. `2026-09-14.2`) – dann entscheiden alle Besucher neu. Bei Skriptänderungen zusätzlich den
  `?v=`-Parameter in `index.html` hochzählen.
- **Ohne JavaScript:** kein Banner, kein Kalender, nur der externe Link.

Der Datenschutztext (Impressum-Klappe) nennt GitHub Pages (Hosting), Cal.com (nach Freigabe),
Google Kalender/Meet (Terminverwaltung), Speicherdauer, Betroffenenrechte und die
Aufsichtsbehörde Baden-Württemberg. Keine Rechtsberatung; bei Zweifeln prüfen lassen.

**Anschrift:** Seit 24.09.2026 nennt die Klappe Name, ladungsfähige Anschrift (Höchststr. 32,
72336 Balingen) und E-Mail, dazu den Verantwortlichen nach § 18 Abs. 2 MStV (Robin, Entscheidung
vom 24.09.2026: Blogartikel und geplanter Memberpilot machen die Seite geschäftsmäßig, § 5 DDG).

Prüfung: `python3 tests/consent_test.py http://localhost:8788/` (Chrome und `pip install
websockets` nötig) startet ein frisches Headless-Chrome und prüft alle Pfade inklusive
Netzwerkmitschnitt; am 14.09.2026 lokal und gegen die Live-Adresse bestanden.

## Schriften

EB Garamond liegt lokal unter `assets/fonts/` (variable Schrift, Gewichte 400–500, Latin mit
Umlauten und ß, 44 KB, SIL Open Font License – `OFL.txt` muss beiliegen). Google Fonts wird
nicht mehr geladen; damit geht vor der Einwilligung keine Anfrage an Google. Die Schrift
`Helvetica Neue`/Arial kommt vom System.

## Sprache und Ansprache

Die Auswahl „Deutsch / English“ steht oben rechts. Deutsch ist der Standard;
`?lang=en` öffnet die englische Fassung direkt. Die Sprache wird nur in der URL geführt,
ohne Cookies oder lokalen Speicher. Ein Wechsel übersetzt die Seitentexte, Bild-Bedienhinweise,
Meta-Beschreibung, Banner und Datenschutzhinweise; die Animation wird nicht neu gestartet.

Texte (Robin, 14.09.2026): schlicht — „Termin vereinbaren“ / „Arrange an appointment“.

**Anrede (Robin, 16.10.2026): überall Sie.** Startseite, Formulare, Hinweise, Newsletter, Werkzeugseiten, Impulse,
Bestätigungsmails – und Goch. Goch duzte bis dahin („Ein Vogel siezt nicht“); seit 16.10.2026 siezt er und duzt nur
zurück, wenn ein Besucher ihn duzt und erkennbar das Du möchte (`worker/profile.md`, „Wie du sprichst“; die festen Sätze
des Drahts in `worker/src/index.js`). `tests/auffindbarkeit_test.mjs` prüft die deutschen Texte auf Du-Formen.

**Über der Falz (16.10.2026):** unter dem Namen eine Zeile zur Positionierung und zwei Knöpfe („Werkzeug herunterladen“,
„Impulse lesen“, Ziele je Sprache). Reihenfolge der Abschnitte: Werkzeuge → Über mich → Impulse → Newsletter → Termin →
Nachricht; das Menü: Werkzeuge · Impulse · Termin · Nachricht. Robins Positionierung (16.10.2026): Werkzeuge für den
Alltag außerhalb des perfekten Prozesses, mitten in der Realität der Transformation – „Es ist der 10., der Bankabruf
fällt aus, es gibt nur den PDF-Auszug.“
Der Einleitungssatz nennt Orte (auch ein Ort nach Wunsch des Gastes) und dass jede
Buchung erst ein Vorschlag ist, den Robin persönlich bestätigt.

Für Englisch wird der zweite Ereignistyp (`…-en`) geladen; die Texte im Kalender selbst
stammen von Cal.com. Beide Buchungslinks laden (geprüft 14.09.2026).

## Termine (Cal.com)

Terminbuchung läuft über Cal.com (kostenloser Einzelplan: 1 Person, unbegrenzte Termine und
Kalender, Apple Calendar wird unterstützt). Die Seite bettet den Buchungskalender nach
Einwilligung ein und färbt ihn in die CI; ohne Zustimmung oder ohne Skript bleibt der Link
„Termin vorschlagen“ / „Suggest a time“ zum Kalender bei cal.com.

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

Anzeige: Ab ca. 900 px Breite stehen Monat und Uhrzeiten nebeneinander; auf dem Handy
untereinander. Die Höhe des eingebetteten Bereichs meldet Cal.com selbst.

Cal.com sendet Bestätigungen und Erinnerungen selbst und trägt den Termin in den Google-
Kalender ein, der auf allen Geräten erscheint. Die frühere Eigenlösung (eigener Kalender aus `termine.json` mit
Apple-Kalender-Export) liegt in der Git-Historie (Commit `1da32ec`).

## Kontakt ohne Formular

Das Kontaktformular wurde am 14.09.2026 entfernt (Robin): `mailto:` öffnete auf vielen Rechnern
kein Mailprogramm, ein Formulardienst hätte einen Fremdanbieter bedeutet. Kontakt läuft über die
Terminbuchung oder die E-Mail-Adresse im Impressum. Die Formularfassung liegt in der
Git-Historie (Commit `dc3e9d4`).

## Veröffentlichen

Statisch – jeder Host geht: GitHub Pages (Repository → Settings → Pages → Branch `main`),
Netlify Drop (Ordner ziehen) oder ein beliebiger Webspace. Eigene Domain per CNAME.
Wartungsseite ein- und ausschalten: siehe `GO-LIVE.md`.

## Herkunft der Ebenen

Aus `Second Brain/90_Meta/Design/Vorlagen/Assets/rotkehlchen_freigestellt.png` am 13.09.2026
getrennt (seit 17.09.2026 als WebP ausgeliefert, Geometrie unverändert): Schnitt bei Zeile 583, Fußzonen (x 410–492 und 536–626) im Ast aus den
Nachbarabschnitten rekonstruiert. Landeposition: Vogel 20 px (3,43 % seiner Höhe) tiefer
als die Rohebene, damit die Beinenden hinter dem Ast liegen.

## Prüfung der Animationssteuerung

`node tests/bird-flight.test.cjs` prüft leeren Ast bis zum Flugstart, Hintergrund-Tab, die vier
Posen und das Ende der Animation, Wiederholung per Klick, reduzierte Bewegung, Bildladefehler,
Tabwechsel und Größenänderung. Ohne Node:
`tests/im-browser.html` über den lokalen Server öffnen (z. B. `python3 -m http.server 8788`
im Projektordner → http://localhost:8788/tests/im-browser.html); dort laufen dieselben Tests.
`python3 tests/consent_test.py <Adresse>` prüft die Einwilligung (siehe oben).
Die visuelle Abnahme erfolgt zusätzlich im Browser auf breitem und schmalem Bildschirm.

## Landschaft (Stand 21.09.2026)

Um Goch herum liegt eine Landschaft in zwei Ebenen – **nah**: sein Ast, der rechts aus dem Bild läuft,
und darüber ein Stück Buchenkrone desselben Baums; **fern**: der Kegelberg mit der Burg Hohenzollern im
Herbstdunst, hinter dem Vogel auf Körperhöhe. Dazwischen Papier. Der Name steht im Himmel auf Augenhöhe
des Vogels. Die Seite zeigt Tageszeit, Mondphase und Jahreszeit **des Besuchers**: Himmel, Sonne,
Mond (mit echter Phase), Sterne, im Herbst fallende Blätter, nachts die ganze Seite in der Nachtpalette.
Alles wird im Browser berechnet (`landscape.js`, eigene Portierung von SunCalc 1.9.0, BSD-2 – siehe
`LICENSE-SUNCALC`): Uhrzeit aus der Geräteuhr, ungefährer Ort aus der Zeitzone (Tabelle im Skript,
Rückfall 45° N / UTC-Versatz), keine Standortabfrage, kein Fremddienst, nichts wird gespeichert.

**Schalter:** `data-landschaft="an|aus"` am `<body>` – in der Redaktion unter „Startseite – Landschaft“ (ein Haken, „Veröffentlichen“ = Commit; dort auch Vorschau-Links für Mittag, Dämmerung, Nacht und ohne Landschaft). Steht er auf `aus`, ist die
Seite exakt die von vor der Landschaft: Vogel und Ast kommen aus `assets/bestand/` (byteidentische
Originale, kurzer Ast, weißer Grund und `multiply`). Vogel und Ast gibt es also zweimal, und die
Redaktion schreibt beim Umschalten **beide Pfade mit** (Szene, `<link rel="preload">` im `<head>`, Astbreite
1153/2800 – `applyLandscape` in `worker/src/admin.js`), damit vom ersten Bild an das Richtige in der Seite
steht und nichts doppelt geladen wird; `landscape.js` tauscht nur noch für `?landschaft=an|aus` zur
Laufzeit (dabei blitzt der andere Ast kurz auf – das ist der Preis der Vorschau). Zum Prüfen: `?landschaft=an`
übersteuert den Schalter, `?landschaft=aus` schaltet ab, `?zeit=YYYY-MM-DDTHH:mm` setzt die Uhr, `?ort=lat,lon`
den Ort (z. B. `?landschaft=an&zeit=2026-10-14T23:00`). `node tests/site_test.mjs` prüft, dass Pfade und
Schalter zusammenpassen und das Umschalten in beide Richtungen die Datei sonst unangetastet lässt.

**Bilder mit Alpha statt Weiß.** `mix-blend-mode: multiply` trägt nur auf hellem Papier; auf dem
Nachtpapier verschwänden Landschaft und Vogel. Deshalb sind Krone, Ferne, die fünf Vogelbilder und die
Astverlängerung freigestellt (`tools/landschaft-bilder.py`, Protokoll in `tools/landschaft-bilder.json`)
und werden ohne Blendmodus gezeigt. Zwei Verfahren: Krone und Ferne bekommen **Weiß → Transparenz**
(a = 1 − min(R,G,B)/255) – das Papier scheint durch, wie bei Aquarell gewollt. Vogel und Ast sind Figuren
und müssen **deckend** sein: Weiß → Transparenz allein machte den hellen Bauch durchsichtig (Blätter und
Nachthimmel schienen durch). `opaque_cutout` bestimmt deshalb die Silhouette per Flutfüllung vom Bildrand,
setzt innen Alpha 1 mit Originalfarbe und schätzt nur im 2-px-Saum die Deckung aus der nahen Innenfarbe
(kleinste Quadrate; Untergrenze Weiß → Transparenz; Saumfarbe vom Weiß befreit – kein heller Rand, kein
Geisterbild). `remove_white_fringe` entfernt anschließend verbliebenes Weiß im 3-px-Randsaum,
auch am ursprünglichen Aststück; deckende Innenflächen und die Landekoordinaten bleiben erhalten.
Nachts dunkeln native CSS-Filter jedes Vogelbild und das Astbild gleichmäßig ab
(`brightness(0.6) saturate(0.82)` bei voller Nacht). Der bewegte Flugcontainer bleibt ohne Filter,
damit beim Posenwechsel keine SVG-Filterfläche flackert. Landschaft und Blätter behalten den
SVG-Farbfilter (`#landscape-moonlight`, × 0,55/0,62/0,80). Dateien: `krone-herbst-{1000,560}.{avif,webp}` und
`ferne-herbst-{1400,800}.{avif,webp}` im Satz-Ordner `assets/landschaften/burgberg-herbst/` (AVIF zuerst,
WebP als Rückfall, `srcset`; nur die aktuelle Jahreszeit wird geladen), `assets/ast.webp` (2800 × 167, links
geometrisch unverändert, Weißsaum bereinigt). Weitere Jahreszeiten und ganz neue Landschaften kommen über die Redaktion (unten)
oder das Werkzeug (`python3 tools/landschaft-bilder.py --set <ordner> --season winter --crown … --distance …
--skip-birds --skip-branch`, schreibt auch AVIF und trägt die Ebenen in `landschaft.json` ein); fehlt eine
Jahreszeit, bleibt die Seite ohne diese Ebene nutzbar.

**Landschaften in der Redaktion (Stand 21.09.2026).** Eine Landschaft ist ein **Satz**: Ordner
`assets/landschaften/<satz>/` mit `landschaft.json` (`name`, `ebenen` je Jahreszeit `herbst|winter|fruehling|sommer`
× Ebene `ferne|krone` mit `{avif, bytes}`, `blaetter` je Jahreszeit `blaetter|schnee|blueten|keine`, `himmel` je
Zustand `tag|tief|daemmerung|nacht` als drei Farben oben/unten/Glühen) und den Bildern
`<ebene>-<jahreszeit>-<breite>.webp` (Ferne 1400/800, Krone 1000/560, Talebenen `mitte`, `hang`, `grund` 1400/900; AVIF optional). Welcher Satz läuft, steht am
`<body>`: `data-landschaft-satz="<satz>"` neben dem Schalter `data-landschaft`; `landscape.js` lädt die
`landschaft.json` nach, baut nur vorhandene Ebenen, nimmt Blätterart und Himmelsfarben daraus.
`?landschaft=<satz>` zeigt jeden Satz zur Probe. Beschreibung und Standardwerte (`normalizeSet`, Größen, Budgets)
stehen einmal in `landscape.js` und werden vom Worker mitbenutzt (`worker/src/landscapes.js`).
Der Redaktionsabschnitt „Landschaften“ (worker/README) lädt Bilder hoch, bereitet sie **im Browser** auf (Weiß →
Transparenz, Beschnitt, zwei Größen, WebP unter Budget – Port der Python-Schritte, ohne AVIF und ohne Vorfilter)
und zeigt sie sofort auf der echten Startseite: Die Seite nimmt per `postMessage` (nur vom Worker-Ursprung, den
`data-contact-endpoint` nennt) ungespeicherte Bilder, Blätterart und Himmelsfarben entgegen. Für die Bildagenten
gibt es im Vault den Rahmenprompt (`Landschaft_Rahmenprompt`) und die Schablone der Bühne
(`tools/landschaft-schablone.py` erzeugt sie aus der echten Seite).

**Sprachwahl (21.09.2026):** zwei Flaggen (Deutsch, Englisch; Inline-SVG, keine Emoji – Windows zeigt dort Buchstaben)
links oben vor dem Menü statt Text rechts oben, wo sie in der Krone untergingen. Text bleibt versteckt für Vorlesen und
Suchmaschinen (`.visually-hidden`), `data-language`/`aria-current` unverändert für `language.js`; die aktive Flagge voll,
die andere gedämpft, ein Kupferstrich darunter. Das Menü rückt um 74 px nach rechts.

**Bühnenlogik:** Blick vom Zeller Horn nach Norden – Osten rechts, Westen links; Sonne und Mond wandern
von rechts nach links, die Höhe ist echt (0° Horizont, 65° oberer Rand), auf der Südhalbkugel gespiegelt.
Jahreszeiten meteorologisch, südlich des Äquators um sechs Monate versetzt, zehn Tage Überblendung.
Nachtpalette (Papier `#1B2230`, Tinte `#E8E2D6`, Grün `#9FC4B3`, Kupfer `#D39A78`, Linien `#3A4351`,
Akzent bleibt `#D97932`) wird über `--nacht` (0…1 nach Sonnenhöhe −12…0°) mit `color-mix()` gemischt;
Textfarben werden zur Laufzeit nachgeführt, bis jedes Paar ≥ 4,5 : 1 hat (`--readable-*`). Cal.com wird
nachts mit `theme: "dark"` initialisiert. Goch hängt mit Landschaft unter dem Namen statt darüber.
`prefers-reduced-motion`: keine Bewegung; verborgener Tab: Blätter und Sterne pausieren.
Breite Bildschirme: Reicht der Ast (2,43 Szenenbreiten) nicht bis zum Fensterrand (ab ≈ 2100 px), rückt die Krone
ans Astende (`--landscape-inset`), der Ast läuft weich aus, die Blätter fallen weiter neben dem Vogel. Ab 2200 px
wachsen Bühne und Textspalten mit (`--seite`, `--text` in `:root`: 1120/980 px plus 35 % der Breite über 2200 px –
4K bei 100 % zeigt den Vogel dann etwa doppelt so groß); darunter liefern die Formeln exakt die alten Werte.

**Gewicht:** Erstaufruf Schreibtisch/Herbst ≈ 1,0 MB (Budget 1,2 MB; Krone-AVIF 118 KB, Ferne-AVIF 77 KB,
Ast 183 KB, Vogelbilder zusammen 511 KB – deckend und ohne Vorfilter etwas schwerer als die 431 KB der
durchsichtigen Fassung, Budget 600 KB); ohne Landschaft lädt die Seite nur `assets/bestand/` wie früher.
`landscape.js` ≈ 23 KB unkomprimiert (Budget 15 KB, bewusst lesbar mit Kommentaren – gzip ≈ 7 KB).
**Prüfen:** `node tests/landscape.test.cjs` (15 Punkte: Sonnenhöhen 48,27° N/8,85° O,
Mondphasen nach USNO, Bühne, Jahreszeiten, Zeitzonen, URL-Parameter) – auch in `tests/im-browser.html`;
`node tests/site_test.mjs` (Schalter und Bildpfade); dazu unverändert `bird-flight.test.cjs`, `consent_test.py`, `goch_test.py`.

## Goch, das Rotkehlchen von Robin (Stand 17.09.2026)

Klick auf den Vogel öffnet eine Sprechblase am Ast: Gruß, drei Einstiegsfragen, Textfeld. Goch
spricht für Robin aus `worker/profile.md` und `worker/aktuell.md` – sonst weiß er nichts und sagt
das. Er duzt; wer Englisch schreibt, bekommt Englisch. Vor dem ersten Wort fragt die Sprechblase um
Einwilligung (eigene Stufe `rjl-goch-consent`, 180 Tage, Widerruf in der Sprechblase); vorher geht
keine Anfrage an den Endpunkt. Wer Robin etwas ausrichten will, nennt Name und E-Mail, Goch fasst
zusammen, und erst nach ausdrücklichem Ja sendet der Worker per Resend eine E-Mail an Robin.
Was Robin gerade macht, erzählt Goch aus `aktuell.md` (alle vier bis sechs Wochen erneuern); einen
sichtbaren Absatz dazu gibt es auf der Seite bewusst nicht (Robin, 17.09.2026).

**Schalter:** `data-chat-endpoint` am `<body>`, gesetzt auf `https://goch.robin.vision/chat`
(live seit 17.09.2026). Leer: kein Gespräch, Klick auf den Vogel wiederholt den Anflug. Zum
Testen: lokal `?goch=http://localhost:8787/chat` oder `?goch=off` (nur auf localhost wirksam), auf
der veröffentlichten Seite `localStorage.setItem('rjl-goch-endpoint', 'https://…/chat')` in der
Browserkonsole – so sieht nur der eigene Browser den Vogel sprechen.

**Datenschutz:** Absatz „Gespräch mit Goch“ im Impressum (Cloudflare, Sprachmodell, Resend, keine
Speicherung außer Tageszähler). Beim Wechsel des Modellanbieters (Workers AI → Anthropic/OpenAI)
den Absatz anpassen.

**Prüfen:** `python3 tests/goch_fake_worker.py 8787`, dazu `python3 -m http.server 8788`, dann
`python3 tests/goch_test.py http://localhost:8788/ http://localhost:8787` (14 Gruppen, u. a. Links aus `worker/links.md`, keine
Anfrage vor Einwilligung, Nachricht kommt an, Serverfehler, Escape, Englisch, Handy). Die
Flug-Tests (`tests/im-browser.html`) und `tests/consent_test.py` bleiben unverändert gültig.

## Blog

Gepflegt in der Redaktion (`https://goch.robin.vision/admin`, Abschnitt „Blog“), gespeichert im
Repository: `blog/blog.json` (Schalter, Titel DE/EN, Einleitung) und `blog/posts/<slug>.md` (Kopfzeilen
`title`, `date`, `lang`, `status`, `summary`, dann Text). Der Worker baut daraus `blog/index.html`,
`blog/<slug>/index.html` und `blog/feed.xml` im Stil der Visitenkarte und setzt auf der Startseite den
Verweis in der Leiste oben links (`<!-- redaktion:blog-link -->`) und den Abschnitt mit den neuesten fünf
Beiträgen unter dem Kalender (`<!-- redaktion:blog-section -->`) – alles als ein Commit (`worker/src/blog.js`, `worker/src/github.js`). Sichtbar nur, wenn der Schalter an ist
**und** mindestens ein Beitrag veröffentlicht ist; sonst sind `/blog/` und der Feed nicht erreichbar.
Markdown ist eine kleine, maskierte Teilmenge (Überschriften ##/###, fett, kursiv, Listen, Zitat,
Links, Bilder, Trennlinie); kein HTML aus dem Text. Bilder lädt die Redaktion nach `blog/bilder/` hoch
(im Browser auf 1600 px verkleinert und ohne Aufnahmedaten, im Worker an den ersten Bytes geprüft,
höchstens 1,5 MB); im Text stehen sie als `![Beschreibung](bilder/name.jpg)`, sonst nur https-Adressen. Entwürfe stehen nicht auf der Seite,
liegen aber als Datei im öffentlichen Repository. Die Marken in `index.html` nicht entfernen.
`.nojekyll` sorgt dafür, dass GitHub Pages die erzeugten Dateien unverändert ausliefert.

Der Editor in der Redaktion braucht kein Markdown-Wissen: Werkzeugleiste über dem Text (Überschrift,
Fett, Kursiv, Aufzählung, Nummerierung, Zitat, Link, Linie – markieren und drücken, ⌘B/⌘I/⌘K; alles
mit ⌘Z rückgängig), darunter Eingabeflächen für Bild (Hochladen), Verweis-Karte (Adresse, Titel, Satz)
und YouTube-Video (Adresse wird geprüft und auf `watch?v=…` bereinigt, Vorschaubild zur Kontrolle);
alles landet an der Cursorstelle als eigener Absatz. Wortzahl und Lesezeit stehen rechts in der
Leiste. Während des Schreibens sichert der Browser den Text lokal (`localStorage`, nur auf dem Gerät);
läuft die Sitzung ab oder geht der Tab zu, bietet der Editor den Stand beim nächsten Öffnen an.
**Live-Vorschau:** Rechts neben dem Text (ab 1100 px Breite, sonst darunter) steht der Beitrag im Design der
Website und folgt jedem Tastendruck – derselbe Renderer wie beim Veröffentlichen (`makeRenderer()` aus
`worker/src/blog.js`, als Quelltext in die Seite eingebettet). „Eigenes Fenster“ öffnet die Vorschau als
eigenes Browserfenster für einen zweiten Bildschirm (die eingebaute macht dann Platz, bis das Fenster zugeht);
„Ausblenden“ merkt sich der Browser.
**Auf LinkedIn teilen (Stufe 1):** Bei einem veröffentlichten Beitrag zeigt der Editor einen Kasten mit vorbelegtem
Text (Kurzfassung + Adresse, änderbar); „Auf LinkedIn teilen“ öffnet LinkedIn am Rechner mit diesem Text
(`feed/?shareActive=true&text=…`, inoffiziell, nur Desktop), auf dem Handy das offizielle Teilen-Fenster nur mit
dem Link (`sharing/share-offsite/?url=…`) – gepostet wird immer bei LinkedIn selbst, nichts geht automatisch raus.
In der Beitragsliste gibt es den Knopf „LinkedIn“ ebenfalls. Die Blogseiten tragen dafür Open-Graph-Angaben
(Titel, Kurzfassung, erstes Bild des Beitrags, Datum), die auch WhatsApp und Signal für die Vorschau nutzen.
Eine Vollautomatik über LinkedIns API (App an eine Unternehmensseite gebunden, Berechtigung läuft alle 60 Tage ab)
ist bewusst nicht gebaut – siehe Vault-Briefing.
**Auf Instagram teilen:** Instagram nimmt von Webseiten nichts entgegen, Beiträge brauchen ein Bild, Links im Text
sind nicht anklickbar. Der Kasten daneben erzeugt deshalb im Browser (Canvas) eine Karte im Stil der Seite –
Papier, Name in Kapitälchen, Kupferstrich, Titel in EB Garamond, Datum, Rotkehlchen (`assets/signatur-rotkehlchen.png`),
Adresse – zum Herunterladen (1080 × 1080) oder, auf dem Handy, per Teilen-Blatt direkt in die Instagram-App;
dazu ein Text zum Kopieren (Titel, Kurzfassung, „Link im Profil“). „Als Vorschaubild speichern“ legt dieselbe Karte
als `blog/bilder/karte-<slug>.jpg` (1200 × 630) ab und baut die Seiten neu: Sie wird `og:image`, wenn der Beitrag kein
eigenes Bild hat (das erste Bild im Text hat Vorrang). Die Karte lädt Papier, Schrift und Vogel von der Website
(GitHub Pages liefert CORS-Freigabe); fehlen sie, entsteht eine schlichte Karte ohne Textur.
Ausprobieren ohne Anmeldung und ohne GitHub: `node tests/admin_fake.mjs 8789` → http://localhost:8789/admin;
Prüfung des Editors in Headless-Chrome: `python3 tests/admin_test.py`.

### Reparatur von Anflug und Handychat (22.09.2026)
Auf schmalen Fenstern hängt die geöffnete Goch-Sprechblase direkt am `body`, damit ihr
fester Vordergrund nicht in der isolierten Landschaft eingeschlossen bleibt. Auf dem Desktop
kehrt derselbe DOM-Knoten zum Ast zurück; Gespräch und Ereignisse bleiben erhalten.
Zusätzliche Prüfungen: `python3 tests/goch-landscape_test.py` (lokaler Webserver auf Port 8788,
Chrome und websockets) und `python3 tests/landscape-matte_test.py` (Pillow und NumPy).
Prüfumfang und Bilder stehen in `LANDSCHAFT.md`.

**Nacht direkt beim Laden.** `landscape.js` wird einmal synchron am Ende des `<head>` geladen.
`prepare()` direkt nach dem öffnenden body berechnet die Anfangspalette mit denselben Sonnen- und
Farbfunktionen wie das Minuten-Update. `init()` am Ende des body baut die Szene auf, weiterhin vor
Anflug und Einwilligung. Erst nach dem Anfangszustand aktiviert `landscape-ready` die Farbüberblendung.
So gibt es nachts keinen hellen Zwischenzustand; es wird weder eine zweite Uhrzeitberechnung
nachgebaut noch die Seite versteckt. Bei Ladefehler des Skripts bleibt die Grundseite nutzbar.
Der frühe Skriptabruf wartet vor dem ersten Seitenbild auf die lokale Datei (einmalig und cachebar).
`python3 tests/landscape-start_test.py` prüft Nacht, Tag, beide Aus-Schalter und einen Skriptladefehler
bei deaktiviertem Cache und gedrosseltem Netz.


## Werkzeuge: Buchungsstapel-Generator / Booking Batch Generator (15.10.2026)

Bereich „Werkzeuge“ im Menü der Startseite (`#werkzeuge`, englisch „Tools“) mit Übersichten unter `werkzeuge/` und
`werkzeuge/en/`. Erstes Werkzeug: der **Buchungsstapel-Generator** (`werkzeuge/buchungsstapel-generator/`), englisch der
**Booking Batch Generator** (`werkzeuge/booking-batch-generator/`, englische Oberfläche, gleiche Funktionen). Kostenloser
Download ohne Anmeldung. Das Werkzeug hieß bis 15.10.2026 „Kontoauszug-Konverter“; `werkzeuge/kontoauszug-konverter/`
leitet weiter (GitHub Pages kennt keine Weiterleitung auf dem Server, deshalb eine kleine Seite mit `meta refresh`).
Quelle: Repository `buchungsstapel-lokal` (Browser-Variante; `browser/build.py` baut beide Sprachen aus einer Quelle).

- **Werkzeuge und Sprachen:** Liste `WERKZEUGE` in `worker/src/werkzeug.js` (id, Sprache, Titel, Dateiname, Gegenstück in der
  anderen Sprache, Kurzbeschreibung). Daraus entstehen Downloadseiten, Übersichten, die Liste auf der Startseite (zwischen
  `<!-- werkzeuge:liste -->`) und die Weiterleitungen alter Adressen (`ALTE_ADRESSEN`).
- **Downloadseite:** entsteht vollständig aus Feldern: Beschreibung, Nutzungsbedingungen, ein kurzer Hinweis in der anderen
  Sprache (Markdown wie im Blog) und Angaben zur Datei. Die Felder stehen als JSON in der Seite (`script#werkzeug-daten`).
  Die englischen Nutzungsbedingungen sind eine Übersetzung; im Zweifel gelten die deutschen (Entwurf von Claude, keine
  anwaltliche Prüfung).
- **Redaktion:** Abschnitte „Website – Werkzeug …“ für beide Seiten (Inhalte `werkzeug` und `werkzeugEn` in `CONTENT`):
  Texte ändern, veröffentlichen, vorige Fassung. Die Datei selbst kommt nicht über die Redaktion.
- **Neue Fassung:** im Werkzeug committen und bauen (`python3 browser/build.py`), dann
  `node tools/werkzeug-uebernehmen.mjs ~/Developer/buchungsstapel-lokal/browser/dist/Buchungsstapel-Generator.html ~/Developer/buchungsstapel-lokal/browser/dist/Booking-Batch-Generator.html`
  (kopiert die Dateien, liest Fassung und Datum, setzt Größe und SHA-256, baut Seiten, Übersichten, Startseitenliste und
  Weiterleitungen neu), `node tests/werkzeug_seite_test.mjs`, PR. Ohne Dateien baut das Skript nur den zweiten Teil neu.
- **Aufbau-Meldungen:** Erkennt das Werkzeug einen Auszug nicht, kann der Nutzer auf Knopfdruck den Aufbau ohne Inhalt
  senden. `POST /aufbau` im Worker (`worker/src/aufbau.js`): offen für jede Herkunft (das Werkzeug läuft als lokale Datei),
  prüft die Anonymisierung (keine Ziffern außer 9, nur x/X oder bekannte Wörter; deutsche oder englische Kopfzeile),
  höchstens 3 je Adresse und Stunde und `MAX_AUFBAU_PER_DAY` am Tag; Zustellung per Resend an `MAIL_TO`, der Aufbau als
  Anhang. Meldungen an das Werkzeug kommen in dessen Sprache (`sprache` im Body). Gespeichert wird nichts.

## Goch kennt Werkzeuge und Newsletter (15.10.2026)

Auf Robins Wunsch erzählt Goch von den Werkzeugen, dem Buchungsstapel-Generator und dem Newsletter und verlinkt dorthin.
Die Anmeldung zum Newsletter und Feedback zu den Werkzeugen nimmt er ebenfalls an.

- **Wissen:** Abschnitt „Werkzeuge und Newsletter“ in `worker/profile.md` (in der Redaktion unter „Goch – Profil“ pflegbar).
- **Links:** `werkzeuge`, `buchungsstapel-generator` und `newsletter` in `worker/links.md`. Eine Adresszelle darf jetzt zwei
  Adressen enthalten, durch Leerzeichen getrennt: erst die deutsche, dann die englische. Goch verlinkt in der Sprache des
  Gesprächs; die Redaktion prüft beide Adressen.
- **„Was gibt's Neues?“** (16.10.2026): Startknopf statt „Erzähl mir von deiner Landschaft“. Goch erzählt vom neuesten Werkzeug
  und von den Impulsen jeden Freitag und gibt zwei Links (`link` und `link2`; nur diese Antwort hat zwei). Kommt ein neues
  Werkzeug dazu, den Satz „derzeit der Buchungsstapel-Generator“ im Profil anpassen.
- **Newsletter im Gespräch:** action `newsletter`. `goch.js` zeigt unter der Antwort ein Feld für die E-Mail-Adresse. Die
  Adresse geht direkt an `POST /newsletter` (Double-Opt-In wie auf der Seite), nie an das Sprachmodell.
- **Feedback:** action `feedback` mit dem Text des Besuchers. Der Worker schreibt die Zusammenfassung („Ich gebe Robin dieses
  Feedback weiter: „…“ Soll ich das so senden?“) und sendet erst nach dem Ja eine Mail an `MAIL_TO` (Betreff „Goch:
  Feedback zu den Werkzeugen“): ohne Gesprächsverlauf, Name und Adresse nur, wenn der Besucher sie selbst genannt hat. Es
  gelten dieselben Grenzen wie beim Draht. Test: `node tests/goch_werkzeuge_test.mjs` (Sprachmodell und Resend abgefangen).

## Newsletter-Kasten unter Impulsen und Werkzeugen (15.10.2026)

Unter jedem Impuls, unter den Impuls-Listen (`blog/`, `blog/en/`), auf allen Werkzeugseiten und den Übersichten steht die
Anmeldung zum Newsletter mit kurzer Beschreibung, in der Sprache der Seite (Sie-Form wie in den Impulsen). Der Kasten kommt
aus `worker/src/kasten.js`; `newsletter.js` nimmt auf Seiten ohne Sprachmodul die Sprache aus `<html lang>` und meldet damit
bei der deutschen oder englischen Liste an. Der Kopf der Impuls-Seiten führt zusätzlich zu den Werkzeugen.
Die Redaktion baut die Impuls-Seiten beim Veröffentlichen neu; ändert sich nur der Rahmen, baut
`node tools/blog-seiten-bauen.mjs` sie lokal neu (wie `buildBlog`, ohne zu löschen).

## Newsletter: Impulse und Werkzeuge (15.10.2026, Brevo noch einzurichten)

Inhalt (Robin, 15.10.2026): jeden Freitag der neue Impuls, dazu Neues zu den Werkzeugen (neue Werkzeuge und Fassungen).
Anmeldung auf der Startseite (`#newsletter`) und unter Impulsen und Werkzeugen (Abschnitt oben), alle über
`newsletter.js` (Startseite in der Du-Form aus `language.js`, Downloadseite in der Sie-Form aus dem Skript selbst).
Double-Opt-In über Brevo (Sendinblue SAS, Frankreich): Der Worker legt den Kontakt an (`POST /newsletter`,
`worker/src/newsletter.js`), Brevo schickt die Bestätigungsmail. Der Endpunkt ist in `index.html` und `worker/src/werkzeug.js`
gesetzt; ohne Einrichtung antwortet er mit 503. Versand der Impulse: Brevo-RSS-Kampagne aus `blog/feed.xml` (Deutsch) und
`blog/en/feed.xml` (Englisch). Eine Ausgabe entsteht nur, wenn Robin einen Beitrag veröffentlicht hat, und nur als Entwurf;
abschicken muss Robin sie selbst. Neues zu den Werkzeugen schickt Robin als eigene Kampagne an dieselben Listen.

Einrichten (Robin; Konto, DNS und Schlüssel sind seine Schritte), vor dem Merge:
1. Brevo-Konto anlegen, Vertrag zur Auftragsverarbeitung in den Kontoeinstellungen annehmen.
2. Absenderdomain `robin.vision` bei Brevo bestätigen (DNS-Einträge für Brevo-Code und DKIM; DMARC besteht schon).
3. Listen „Newsletter DE“ und „Newsletter EN“ anlegen; je eine Vorlage vom Typ Double-Opt-In mit dem Bestätigungslink
   `{{ params.DOIurl }}`. Vorschlag für die deutsche Vorlage – Betreff: „Bitte bestätigen: Newsletter von Robin James Lewis“;
   Text: „Bitte bestätigen Sie Ihre Anmeldung zum Newsletter mit den Impulsen und Neuem zu meinen Werkzeugen: [Anmeldung
   bestätigen]. Haben Sie sich nicht angemeldet, ignorieren Sie diese E-Mail; dann geschieht nichts.“ Dazu Impressum.
4. In Brevo die Öffnungs- und Klickmessung abschalten oder nur anonym zulassen.
5. RSS-Kampagne je Sprache. Eingerichtet am 15.10.2026 nach Robins Entscheidung:
   - Integrationen „Impulse DE“ und „Impulse EN“, Feed wie oben, an „Newsletter DE“ bzw. „Newsletter EN“.
   - Vorlagen „Newsletter Impuls DE (RSS)“ (#4) und „Newsletter Impuls EN (RSS)“ (#5) mit Impressum und Abmeldelink.
   - Betreff ist der Titel des Beitrags. Abfrage freitags um 12 Uhr; dabei entsteht nur ein Entwurf.
   - Warum 12 statt 10 Uhr: Brevo nimmt nur Beiträge, deren Feed-Zeit mindestens 30 Minuten vor der Abfrage liegt. Der Feed
     trägt 09:00 UTC, also 11 Uhr Sommerzeit.
   - Die RSS-Kampagne ist eine Integration des Brevo-Partners Integry (USA). Brevo führt Integry im Vertrag zur
     Auftragsverarbeitung als optionalen Unterauftragnehmer, mit Standardvertragsklauseln. Die Datenschutzerklärung nennt das.
6. `npx wrangler secret put BREVO_API_KEY` (im Ordner `worker`). Die IDs von Listen und Vorlagen stehen in
   `worker/wrangler.toml` (`BREVO_LISTE_DE/EN` = 3/4, `BREVO_DOI_VORLAGE_DE/EN` = 1/2, eingetragen 15.10.2026).

## Auffindbarkeit und Standarddateien (16.10.2026)

- Startseite: aussagekräftiger Titel und Beschreibung (`language.js` setzt beide je Sprache), `canonical`, `hreflang`
  (de, en, x-default), Open Graph mit Bild zum Teilen `assets/teilen.jpg` (1200 × 630; Vorlage `tools/teilen-bild.html`,
  Anleitung darin), Feeds im Kopf, JSON-LD `Person` und `WebSite`.
- Werkzeugseiten: JSON-LD `SoftwareApplication` (kostenlos, Fassung, Datum, Größe, Nutzungsbedingungen). Impulse: `BlogPosting`.
- `sitemap.xml` entsteht aus Beiträgen und Werkzeugen (`worker/src/sitemap.js`): die Redaktion schreibt sie bei jedem
  Veröffentlichen mit (`buildBlog`, Parameter `werkzeuge`), lokal `tools/blog-seiten-bauen.mjs` und
  `tools/werkzeug-uebernehmen.mjs`. `robots.txt` verweist darauf.
- `404.html` (GitHub Pages zeigt sie bei unbekannten Adressen), `favicon.ico` an der Wurzel, `.well-known/security.txt`
  (Ablauf 16.10.2027 – vorher erneuern).
- Prüfung: `node tests/auffindbarkeit_test.mjs`.
- Suchbegriffe (16.10.2026): Werkzeugseiten tragen in `WERKZEUGE` einen `seitentitel`, eine `meta`-Beschreibung und einen
  `untertitel` mit den Begriffen, nach denen gesucht wird („Kontoauszug (PDF) in DATEV-Buchungsstapel“); `rahmen` nimmt
  `seitentitel`. Dazu je Werkzeug „Fragen und Antworten“ (`FRAGEN` in `werkzeug.js`, fest im Code) sichtbar vor den
  Nutzungsbedingungen und als `FAQPage`-JSON-LD; die Übersichten haben eigene Suchtitel; „Über mich“ verweist auf Werkzeuge
  und Impulse. Nicht im Repository: Google Search Console und Bing Webmaster Tools (Robin bestätigt die Domain per DNS-TXT
  bei Cloudflare und reicht `sitemap.xml` ein).

## Feinschliff der Unterseiten (16.10.2026, Vorbild anthropic.com)

- Robin: Abschnitte sollen stärker hervortreten, Texte eher im Blocksatz, Stil erhalten. Rahmen (`werkzeug.js`, `rahmen`) und
  Impulse (`blog.js`, `shell`): Spalte 780 px, Überschrift größer, 64 px Abstand zwischen den Abschnitten, Blocksatz mit
  Silbentrennung ab 720 px (`article p`, außer `.meta`, `.untertitel`, `.hinweis`, `.frei`).
- „Über mich“ (`ueber_mich.js`): Foto links umflossen, Einleitung größer, Stationen als Zeitleiste (Jahre in Kupfer-Versalien,
  Hairlines wie in den Listen), Kenntnisse als Marken (`marken`), Ehrenamt und „Warum ein Rotkehlchen“ als zwei Karten (mit
  `assets/signatur-rotkehlchen.png`), Kontakt als Knöpfe (LinkedIn grün, Termin und Nachricht mit Kupferrand); unter 720 px eine
  Spalte, unter 600 px Foto über dem Text. Kopf-Spalte in `kopf.js` und `index.html` ebenfalls 780 px.
- Startseite (Robin: „auf die gesamte Website übertragen“): dieselben Kupfer-Nummern vor jedem Abschnitt (`main` zählt
  `.blog-teaser`, `.message`, `.contact`; der verborgene Newsletter-Abschnitt zählt erst, wenn er sichtbar ist), größere
  Überschriften, mehr Abstand, Werkzeug-Eintrag als Karte, „Alle …“-Verweise als Knöpfe mit Kupferrand, „Über mich“-Absatz im
  Blocksatz ab 720 px; der Termin-Titel ohne Inline-Stil.
- Nachtrag (Robin, 16.10.2026): die Kupfer-Nummern sind wieder weg (gefielen nicht); die Überschriften „Werkzeuge“, „Über mich“
  und „Impulse“ auf der Startseite verweisen auf ihre Unterseiten (Ziel je Sprache; den Impuls-Titel schreibt die Redaktion in
  `blog.js`, `teaser`).

## „Was ist neu“ und Newsletter-Feed (16.10.2026)

*Ergänzt 17.10.2026:* Jede Ausgabe im Feed hat jetzt den Aufbau Impuls → „Neu im SmartFormular FiBu lite“ (neueste Fassung) →
„SmartFormular“ (FiBu lite kostenlos, FiBu und Abschluss als Beta, Link zur Seite) → „Workshops“ (Unterweisung nach EU AI Act,
Termine 2027 auf Anfrage, Link); Kanalbeschreibung „Impulse, SmartFormular und Workshops per E-Mail“. Prüfung:
`node tests/newsletter_feed_test.mjs`. Die Brevo-Vorlage muss nichts wissen – sie nimmt die Beschreibung des Eintrags als HTML.

- Robin: Jede neue Fassung des Buchungsstapel-Generators wird auf der Website angekündigt und beschrieben; der Newsletter soll
  länger sein und immer das aktuellste Update des aktuellsten Werkzeugs enthalten, gefüttert über die Werkzeugseite.
- **Feld `neuigkeiten`** der Werkzeugseiten (Redaktion: „Was ist neu“): Markdown, je Fassung eine Überschrift
  „### Fassung a1b2c3d vom 15.10.2026“ (englisch „### Version a1b2c3d, 15 October 2026“), darunter Stichpunkte, neueste zuerst.
  `worker/src/neuigkeiten.js` liest Fassung und Datum aus der Überschrift; die Seite zeigt den Abschnitt „Was ist neu“ mit
  Ankern `#fassung-<id>` vor den Fragen. `tools/werkzeug-uebernehmen.mjs` belegt beim Einspielen einer neuen Fassung den
  Eintrag mit den Commit-Zeilen seit der vorigen Fassung vor – in der Redaktion in Sätze bringen.
- **Newsletter-Feeds** `newsletter/feed.xml` und `newsletter/en/feed.xml` (`renderNewsletterFeed` in `blog.js`): Brevo füllt
  beim Versand nur die seit dem letzten Lauf neuen Einträge ein (Test-Mail 16.10.2026: ein Eintrag, Beschreibung mit
  wörtlichem `<description>`-Tag bei reinem Text). Deshalb trägt jeder Eintrag die ganze Ausgabe als HTML in CDATA: Impuls mit
  Zusammenfassung, Auszug (`auszug`, etwa 900 Zeichen Textabsätze) und Verweis, darunter „Neu im Buchungsstapel-Generator“ mit
  der neuesten Fassung; jede Fassung ist zusätzlich ein eigener Eintrag (Ausgabe auch in einer Woche ohne Impuls). Die Feeds
  schreiben `buildBlog` (Redaktion bei jedem Veröffentlichen; Felder der Werkzeugseiten liest `rebuild` aus dem Repository, das
  Speichern einer Werkzeugseite baut sie mit), `tools/blog-seiten-bauen.mjs` und `tools/werkzeug-uebernehmen.mjs`.
- **Brevo:** Die Integrationen „Impulse DE/EN“ müssen auf die neuen Feeds zeigen (statt `blog/feed.xml`); im Template genügt
  `{{ item.DESCRIPTION | safe }}`, der Knopf „Impuls lesen“ passt bei Fassungs-Einträgen nicht mehr („Auf robin.vision lesen“).
- Prüfung: `node tests/newsletter_feed_test.mjs`.

## Marke im Tab (16.10.2026)

- Robin: Im Tab stand noch „Robin James Lewis“. Seitentitel enden jetzt auf „– robin.vision“ (Rahmen `werkzeug.js`,
  Impulse `blog.js`, Startseite `index.html`/`language.js`, 404-Seite), `og:site_name` ist `robin.vision`, die Feed-Titel
  „robin.vision – Impulse“ bzw. „robin.vision – Food for Thought“. Der Name bleibt in Beschreibung, JSON-LD und Texten.

## Seitenkopf und Navigation (16.10.2026)

- Robin: oben zu voll auf dem iPhone; alle Verweise außer „Über mich“ sprangen nur an Stellen im Einseiter; sie sollen auf die
  Unterseiten führen, Termin bleibt; „Robin James Lewis“ als Logo der Startseite durch „robin.vision“ ersetzen.
- Ein gemeinsamer Kopf für alle Seiten (`worker/src/kopf.js`, `kopf(lang, up, { aktiv, andere })` und `KOPF_CSS`): Wortmarke
  `robin.vision` (Punkt in Kupfer), drei Seiten Werkzeuge · Impulse · Über mich (aktive Seite mit Kupferlinie), „Termin“ als
  Knopf zum Termin-Abschnitt der Startseite, ab 720 px Breite ein Menü aus `details/summary` (ohne Skript) mit denselben
  Seiten, „Nachricht“ und der anderen Sprache. Werkzeugseiten und Übersichten (`rahmen`), Impulse und Listen (`shell`) nutzen
  ihn; „Nachricht“ steht nur noch im Menü (und im Termin-Abschnitt darunter).
- Startseite: derselbe Aufbau von Hand (`<header class="kopf start">`, über der Bühne, links die Sprachwahl statt der
  Wortmarke); Ziele je Sprache über `data-href-de/en`, Texte über `language.js` (`navTools`, `navAbout`, `navContact`,
  `navMessage`, `menuLabel`, `navPages`). Der Verweis auf die Impulse bleibt zwischen den Marken der Redaktion
  (`updateHomepage` schreibt ihn mit Ziel `blog/`). Die Überschrift der Bühne ist jetzt die Wortmarke `robin.vision`, darunter
  die Zeile „Robin James Lewis · Balingen“ (`byline`); Titel, Beschreibung und JSON-LD nennen den Namen weiter.
- Prüfung: `node tests/kopf_test.mjs` (Modul, alle gebauten Seiten, Startseite inklusive Stilgleichheit mit `KOPF_CSS`).

## Seite „Über mich“ (16.10.2026)

- Eigene Seite im Rahmen der Werkzeugseiten: `ueber-mich/` (deutsch) und `about/` (englisch), Text fest in
  `worker/src/ueber_mich.js` (keine Redaktion): Foto `assets/robin-james-lewis.jpg` (720 × 900, aus dem Bewerbungsbild, ohne
  Metadaten), Einleitung, Stationen mit Jahren, Kenntnisse, Ehrenamt, „Warum ein Rotkehlchen“, Kontakt mit LinkedIn
  (`LINKEDIN`, `rel="me"`), Termin, Nachricht und öffentlicher E-Mail; darunter der Newsletter-Kasten. Auf Robins Wunsch ohne
  Arbeitgeber- und Vereinsnamen und ohne private Daten; JSON-LD `ProfilePage` mit `Person`, Foto und `sameAs` LinkedIn.
- Menüpunkt „Über mich“/„About“ in allen Rahmen: Startseite (`navAbout`, Ziel je Sprache über `data-href-de/en`; im Abschnitt
  „Über mich“ der Verweis `aboutMore`), Werkzeugseiten und Übersichten (`rahmen` in `werkzeug.js`, jetzt exportiert, mit
  Parameter `css`), Impulse und Listen (`shell` in `blog.js`). `sitemap.xml` kennt beide Fassungen (`SEITEN` in `sitemap.js`,
  Stand des Textes als `lastmod`). Goch kennt die Seite (`links.md` Kennung `ueber-mich`; dort auch die aktuelle LinkedIn-Adresse).
- Bauen: `node tools/ueber-mich-bauen.mjs`, danach `node tools/werkzeug-uebernehmen.mjs` und `node tools/blog-seiten-bauen.mjs`
  (gleicher Kopf überall, Sitemap). Prüfung: `node tests/ueber_mich_test.mjs`.

## Seite „Workshops“ und Bereich „SmartFormular“ (17.10.2026)

**Workshops.** Der Workshop KI-Kompetenz für Teams, mit der Unterweisung nach Art. 4 KI-Verordnung (EU AI Act) als hervorgehobenem
Teil (Abzeichen unter der Überschrift, eigener Kasten „Teil dieses Workshops“), als eigene Seite `workshops/` (englisch
`workshops/en/`), gebaut aus `worker/src/workshops.js` mit `node tools/workshops-bauen.mjs`. Inhalt (Stand 24.10.2026): drei Teile (Workshop mit Robin –
Hemmschwellen nehmen, Anwendungsfälle entwickeln –, Online-Lehrgang im Memberbereich, Test mit Zertifikat), für wen, sieben
Kapitel, Kasten „Wer den Workshop leitet“, zwei Formate (online, vor Ort; Preise auf Anfrage), Ablauf in sieben Schritten,
Nachweis und Zertifikat (prüfbar unter member.robin.vision/zertifikat), Rechtsrahmen ohne „Pflichtschulung“-Werbung und mit der
robin.vision UG als „in Gründung, Januar 2027“, sieben Fragen als FAQPage, ein Anfrageformular, das wie das Kontaktformular an Gochs `/contact` sendet (Felder
zu einer Nachricht, Bot-Falle `website`, Ladezeitpunkt `t`), strukturierte Daten als `Course` mit zwei Durchführungen. Menüpunkt
„Workshops“ im Seitenkopf (`worker/src/kopf.js`) vor „Über mich“, Abschnitt auf der Startseite zwischen SmartFormular und Über mich,
Einträge in `sitemap.xml` (`worker/src/sitemap.js`, SEITEN) und in Gochs Linkliste (`worker/links.md`, Kennung `workshops`); Abschnitt „Werkzeuge im Workshop“ mit
Partnerangeboten aus `worker/src/partner.js` (Produkte befreundeter Unternehmen gegen Gebühr oder Provision; Liste leer bis zur
ersten Vereinbarung; Kennzeichnung wie alle Werkzeuge, siehe unten, Verweise mit `rel="sponsored"`; die AGB des
Memberbereichs regeln Vorstellungen in Workshops und Unterlagen in § 8). Gochs
Profil (`worker/profile.md`) kennt das Angebot und bietet es aktiv an. Die Durchführung läuft im Memberbereich (Repository
`robin-vision-member`, App `schulung`, dort im Portal „Coachings“). Prüfung: `node tests/workshops_seite_test.mjs`.

**SmartFormular.** Der Bereich „Werkzeuge“ heißt im Menü jetzt „SmartFormular“ (Bezeichnung im Singular, Robin 17.10.2026); die
Seite `werkzeuge/` (englisch `werkzeuge/en/`) ist eine eigene, ausführliche Unterseite aus `worker/src/smartformular.js` im
SmartFormular-Erscheinungsbild (Nacht und Violett, `SF_CSS` in `werkzeug.js`), so umfangreich wie die Seite „Workshops“: Einleitung,
drei Produktkacheln, „FiBu lite heute“ mit Download, „Was SmartFormular FiBu dazulernt“ (sieben geplante Funktionen), „SmartFormular
Abschluss“ (sechs Punkte), Kasten „Mensch und Maschine“, Sprachmodell optional, Fahrplan, Daten und Recht, acht Fragen (FAQPage,
dazu SoftwareApplication für FiBu lite), Beta-Anfrage, Downloads. Keine Preise (auf Anfrage). Die Produktdaten liegen in
`worker/src/produkte.js` (auch für die Werkzeugseite und die Startseite). Startseite: FiBu lite als Karte im
SmartFormular-Erscheinungsbild mit Knopf zum Werkzeug, darunter die Ankündigungen FiBu und Abschluss (`tools/werkzeug-uebernehmen.mjs`).
Alter Stand der Übersicht: drei
Kacheln – SmartFormular FiBu lite (bisher Buchungsstapel-Generator, kostenlos, fertig), SmartFormular FiBu und SmartFormular
Abschluss (in Entwicklung, Beta 2027) –, ein Beta-Anfrageformular an Gochs `/contact`, der Hinweis zur optionalen KI (EU-Hosting,
kein Training, kein Vendor-Lock) und der Download. Die Werkzeugseite von FiBu lite trägt den Abschnitt „Was kommt“ mit dem Ausblick.
Gochs Linkliste kennt `smartformular-fibu` und `smartformular-deklaration` (Anker auf der Übersicht). Prüfung:
`node tests/werkzeug_seite_test.mjs`, `node tests/goch_werkzeuge_test.mjs`.

## Kennzeichen „Anzeige“ an allen Werkzeugen (18.10.2026)

Robin, 18.10.2026 (Option C aus der Vault-Notiz „Partnerangebote und Produktplatzierung“, Abschnitt 6): Jedes Werkzeug trägt dasselbe
kleine Kennzeichen „Anzeige · Anbieter“ (englisch „Ad“) – SmartFormular („Anzeige · robin.vision“) wie jeder Partner, ohne
Unterscheidung. Es steht auf den Karten der Übersicht und des Startseiten-Sliders, im Kopf jeder Spalte des Vergleichs, auf den
Produktseiten (SmartFormular, FiBu lite) und an Partnerangeboten der Seite „Workshops“; der Platzhalter „Hier könnte Ihr Produkt
stehen“ und die Spalte „Ihr Produkt“ tragen keins. „Anzeige“ verweist auf den Absatz `#anzeigen` im Impressum (index.html, DE und
`legalAds` in language.js), ein kleines Skript in index.html klappt das Impressum dabei auf. Bausteine in `worker/src/partner.js`
(`kennzeichen`, `anzeigeHref`, `KENNZ_CSS`). Deshalb stehen unter „Werkzeuge“ nur Werkzeuge, die robin.vision selbst anbietet oder für
deren Vorstellung es vergütet wird. Gestaltung dezent (Robin, 18.10.2026: „noch zu groß“): normale Schreibung, nicht fett, ohne
Sperrung, Unterstreichung nur beim Darüberfahren, Grau #767676 auf Papier (lesbar bleiben – sonst verfehlt es den Zweck).
Prüfung: `node tests/werkzeuge_uebersicht_test.mjs`, `node tests/workshops_seite_test.mjs`.

**Ausnahme für eigene kostenlose Werkzeuge (Robin, 23.10.2026):** FiBu lite und E-Rechnung lite tragen statt „Anzeige · robin.vision“
einfach „Kostenlos“ (englisch „Free“, ohne Verweis) – über dem Titel ihrer Seiten, auf ihren Karten im Startseiten-Slider und im Kopf
ihrer Spalte im Vergleich (`kostenlos` in `worker/src/partner.js`, Kennung `frei: true` in `slider.js` und `uebersicht.js`). Anlass: In der
Laien-Textprüfung wirkte „Anzeige“ an einem kostenlosen Werkzeug wie Werbung oder ein Bezahlangebot. Partner, die Beta-Produkte FiBu und
Abschluss und die Stellen, die SmartFormular als Ganzes zeigen (Karte der Übersicht, Seite „SmartFormular“), behalten „Anzeige“.
Die Zeile unter dem Titel der Werkzeugseiten nennt nur noch Fassung und Datum („Kostenlos“ steht schon darüber).

## Werkzeug: SmartFormular E-Rechnung lite (23.10.2026)

Zweites kostenloses SmartFormular-Werkzeug (Robin, 23.10.2026, Option A „verstehen und bezahlen“): E-Rechnungen als XRechnung
(UBL, CII) und ZUGFeRD/Factur-X lesen, drucken, mit den offiziellen Regeln prüfen und per GiroCode bezahlen. Seiten
`werkzeuge/e-rechnung-pruefen/` (deutsch) und `werkzeuge/e-invoice-viewer/` (englisch, „E-invoice viewer and validator“). Anders als
FiBu lite läuft es **direkt auf der Seite** (`app: "erechnung"` in `WERKZEUGE`) und zusätzlich als **eine Datei offline**
(`E-Rechnung-lite.html`, `E-Invoice-Viewer.html`). Quelle: `tools/erechnung/` in diesem Repository.

- **Datenschutz:** Rechnungen werden nur im Browser gelesen. Die Seite lädt Oberfläche und – erst beim ersten Prüfen – Prüfkern und
  Regeln von robin.vision (`assets/erechnung/`), sonst nichts; eine CSP im Seitenkopf erlaubt Skripte und Verbindungen nur von
  robin.vision (`goch.robin.vision` für die Newsletter-Anmeldung). Die Datei hat `connect-src 'none'` und enthält Regeln und Beispiele.
- **Prüfregeln:** die Schematron-Regeln der KoSIT-Validator-Konfiguration (EN 16931 von CEN, XRechnung von KoSIT), als JSON
  (`assets/erechnung/regeln/`) aus den kompilierten XSLT übertragen (`tools/erechnung/regeln-bauen.mjs`, Quellen mit SHA-256 in
  `quellen.json`). Ausgewertet von einem eigenen Schematron-Interpreter (`src/pruefung.js`) auf fontoxpath (MIT) mit Anpassungen für
  exakte Dezimalrechnung und Saxon-gleiches Verhalten (`fxpatch.mjs`, jede Ersetzung muss genau einmal greifen). Nicht geprüft:
  XML-Schema (XSD).
- **Texte:** Antwort „Ist das eine E-Rechnung?“ mit Fundstellen und Stand in `src/recht.js` (`STAND`); Erklärung je Regel in
  `src/regeltexte.js` (was nicht stimmt, was der Rechnungssteller ändern muss); Oberfläche in `src/texte.js`. Keine Steuer- oder
  Rechtsberatung, keine Worte wie „rechtssicher“. **Bei neuen BMF-Schreiben oder Gesetzesänderungen** `recht.js` anpassen und `STAND`
  setzen, Starttexte und Fragen der Seiten (`werkzeug.js`, Redaktion) mitziehen.
- **Bauen:** `cd tools/erechnung && npm ci && node regeln-bauen.mjs && node bauen.mjs` (Fassung = letzter Commit in
  `tools/erechnung`; mit ungesicherten Änderungen nur `--entwurf`). Danach
  `node tools/werkzeug-uebernehmen.mjs tools/erechnung/.cache/dist/E-Rechnung-lite.html tools/erechnung/.cache/dist/E-Invoice-Viewer.html`
  und „Was ist neu“ in Sätze bringen. Bilder zum Teilen (auch FiBu lite): `node tools/erechnung/teilen-bilder.mjs`.
- **Abgleich mit der offiziellen Prüfung:** `node tools/erechnung/testdaten-holen.mjs`, `node tests/erechnung_korpus.mjs`,
  `tools/erechnung/.cache/venv/bin/python tests/erechnung_referenz.py 8` (saxonche, `pip install saxonche`), dann
  `node tests/erechnung_regeln_test.mjs`: dieselben Regelnummern im Browser wie mit Saxon, jede Abweichung ist ein Fehler.
- **Rechnung übernehmen (Erstellen):** Eine bestehende Rechnung als Word (.docx), PDF mit Textebene, OpenDocument (.odt), Excel (.xlsx),
  Text oder XML wird im Browser gelesen (`src/einlesen.js`, `src/pdftext.js`, ohne Bibliothek) und in die Maske übernommen
  (`src/erkennen.js`: Nummer, Datum, Leistung, Zahlungsziel, Anschriften, Positionen, Steuer, Summen); leere Firmendaten werden ergänzt,
  der Betrag wird mit dem des Dokuments verglichen. E-Rechnungen (XML, ZUGFeRD) laufen über dieselbe Lesestrecke wie beim Prüfen. Nicht
  gelesen: Scans ohne Text, .doc, RTF, verschlüsselte PDFs. Test: `node tests/erechnung_einlesen_test.mjs` (Testrechnungen und ihre
  Quellen in `tests/erechnung/daten/einlesen/`, Erzeuger Chrome, macOS-Druck und textutil; Word- und Excel-Aufbau im Test gebaut).
- **Kundenreisen, Datenschutz, axe, Tastatur:** `node tests/erechnung_reisen_test.mjs` (Chrome über playwright-core; Fotos, Druck-PDF
  und Berichte in `tools/erechnung/.cache/reisen/`); nach dem Deploy mit `--basis https://robin.vision`.
- **Regel-Lexikon** (Robin, 23.10.2026): je Prüfregel mit eigener Erklärung (`eigeneErklaerung` in `src/regeltexte.js`, derzeit 290)
  eine Seite unter `werkzeuge/e-rechnung-pruefen/regeln/<id>/` und `werkzeuge/e-invoice-viewer/rules/<id>/`, je eine Übersicht und
  `sitemap-regeln.xml` (in `robots.txt`). Im Werkzeug führt jeder solche Befund über „Mehr zu dieser Regel“ dorthin. Nach Änderungen an
  Regeln oder Erklärtexten: `node tools/erechnung/lexikon.mjs`; Prüfung: `node tests/erechnung_lexikon_test.mjs`.
- **Lizenzen:** EUPL 1.2 (Regeln CEN), Apache 2.0 (KoSIT), MIT (fontoxpath, xspattern, whynot, prsc, Nayuki QR); Texte in
  `tools/erechnung/lizenzen/` und ausgeliefert als `assets/erechnung/LIZENZEN.txt` sowie im Fuß der Datei.
- **Nach dem Zusammenführen:** Worker neu ausrollen (`cd worker && npm run deploy`), damit die Redaktion die neuen Seiten kennt
  (`werkzeugEr`, `werkzeugErEn`) und Sitemap und Newsletter-Feeds beim nächsten Neubau die neuen Werkzeuge behalten.

## Figuren-Struktur (23.10.2026)

Goch ist der Prototyp einer austauschbaren Figur (Auftrag „Sprechender Goch“, Teil A). Alles Figurenspezifische liegt in
`figuren/goch/`: `figur.json` (Name, Rolle, Sprachen, Verweise auf die Texte in `language.js`, Wissen, Posen mit
Augenpunkt, Signalton, Stimme, Farben, Kiosk), `bilder/` und `RECHTE.md` (Herkunft, Werkzeug, Lizenz je Datei).
Weitere Maskottchen oder Logos für Kundenvorführungen kommen als Paket dazu, ohne Codeänderung – Anleitung mit
Bildvorgaben, Pflichtposen, Prompt-Vorlage, Stimme, Signalton und Rechte-Eintrag in `FIGUREN.md`.

- **Sichtbar ändert sich nichts.** Die Vogelbilder sind von `assets/` und `assets/bestand/` nach `figuren/goch/bilder/` und
  `figuren/goch/bilder/bestand/` umgezogen; der Ast gehört zur Szene und bleibt in `assets/`. `landscape.js` und
  `applyLandscape` (Redaktion) schalten jetzt je Ordner nur `bestand/` um und erkennen alte und neue Pfade.
  `tools/landschaft-bilder.py` liest und schreibt die Vogelbilder im Paket. Die Szene in `index.html` bleibt festes
  Markup (kein zusätzlicher Abruf vor dem ersten Bild); `figur.json` beschreibt sie, `figur-pruefen --html` hält beides
  deckungsgleich.
- **Reihenfolge beim Deploy:** erst den Worker deployen (`cd worker && npx wrangler deploy`), dann den PR mergen. Ein alter
  Worker fände die neuen Bildpfade nicht und würde beim Umschalten der Landschaft den Vogel nicht mittauschen.
- **Gochs Wissen** bleibt in `worker/profile.md`, `aktuell.md` und `links.md` (dorthin schreibt die Redaktion);
  `figur.json` verweist darauf.
- **Kundenfiguren** kommen nie ins Repository: `.gitignore` sperrt `figuren/*` außer `goch/`, und `figur-pruefen`
  meldet eine versionierte Kundenfigur als Fehler.

Prüfen:

```sh
node tools/figur-pruefen.mjs figuren/goch --html index.html
node tests/figur_pruefen_test.mjs
node tests/site_test.mjs
# Bildvergleich vorher/nachher (Desktop 1440 und Handy 390, Tag und Nacht, mit und ohne Landschaft, jede Pose einzeln):
python3 -m http.server 8791 --bind 127.0.0.1   # im alten Stand
python3 -m http.server 8792 --bind 127.0.0.1   # im neuen Stand
python3 tests/figur_bildvergleich.py http://127.0.0.1:8791 http://127.0.0.1:8792 /tmp/figur-vergleich
```

Ergebnis am 23.10.2026 gegen `main` (b49edec): 16 von 16 Ansichten identisch oder höchstens eine Farbstufe abweichend
(Rauschen der Papierkachel, das Chrome auch bei zwei Aufnahmen derselben Seite zeigt).

## Sprechender Goch (23.10.2026, Entwurf – noch nicht veröffentlicht)

Auftrag Robin, 23.10.2026: Goch spricht auf der Startseite, aber erst, wenn ein Besucher das bewusst einschaltet; ein
sichtbares Zwitschern macht dezent darauf aufmerksam; dazu ein Kiosk-Modus für ein Messegerät. Keine Kamera, keine
Mimik- oder Gefühlserkennung. Vorbereitet in vier PRs (Figuren-Struktur, Worker, Startseite, Kiosk).

### Worker: Spracheingabe, Stimme, Figur-ID

- **`POST /listen?lang=de|en`** (`worker/src/hoeren.js`): ein WAV (PCM 16 Bit, mono, höchstens 20 s). Die Seite wandelt jede
  Aufnahme selbst in WAV um – so kommt jedes Browserformat gleich an, und die Dauer steht exakt im Kopf. Erkennung mit
  Whisper large-v3-turbo über Workers AI (Bindung `AI`), Begriffe wie robin.vision und SmartFormular als Kontext; was
  Whisper bei Stille erfindet („Untertitel im Auftrag …“), gilt als leer. Nichts wird gespeichert, gezählt werden nur
  Sekunden je Tag. Der erkannte Text erscheint als Besuchertext und läuft über `/chat` – Draht, Newsletter, Links und
  Grenzen bleiben unverändert.
- **Stimme** (`worker/src/stimme.js`): `/chat` mit `stimme` antwortet als NDJSON – Zeile 1 die Antwort wie immer (die Seite
  zeigt sofort den Text), Zeile 2 das MP3 als Base64 oder `{stimme: null, grund}`. Die Startseite verlangt `stimme.teile`: Dann
  folgt je Abschnitt eine Zeile, der erste ist ein einzelner Satz, und Zeile 1 kommt zusammen mit ihm, spätestens nach 2 s; Goch
  beginnt so, bevor die ganze Antwort vertont ist (Robin, 06.11.2026). Der KI-Hinweis wird einmal vertont und gemerkt. Vertont wird nur diese eigene Antwort;
  eine freie Vorlese-Route gibt es nicht. Anbieter ElevenLabs (Secret `ELEVENLABS_API_KEY`, `voiceId` aus der Redaktion,
  sonst aus `figur.json`), Modell Eleven v4, Regler und fester Startwert (`seed`) aus `figur.json` – jeder Besucher hört
  dieselbe Stimme. Ohne Stimme (`aus`, `fehler`, `grenze`) antwortet Goch nur als Text; eine Gerätestimme gibt es nur
  für Figuren mit `stimme.rueckfall: "browser"`. Für Goch schaltet die Seite dann Stimme, Mikrofon und Kamera ab und
  schreibt in den Chat nur „Sprechen geht gerade nicht – ein Gespräch ist im Moment nur hier im Chat möglich.“ Den Grund
  (etwa die Meldung von ElevenLabs) sieht kein Besucher; er steht nur im Protokoll des Workers.
- **KI-Hinweis (Art. 50 KI-VO):** Bei der ersten gesprochenen Antwort einer Sitzung (`stimme: {erste: true}`) stellt der
  Worker „Kurz vorab: Ich bin eine KI, und meine Stimme ist künstlich erzeugt.“ voran – in Text und Stimme gleich.
- **Sprachmodus:** Kam die Frage per Spracheingabe (`gesprochen: true`) oder ist die Stimme an, antwortet das Modell aus
  der Redaktion („Modell im Sprachmodus“, Vorschlag Claude Haiku 5.5). Mit Stimme kommt der Hinweis „Gesprochen“ (auch: höchstens 40 Wörter, Robin, 06.11.2026) in den
  Systemprompt (kurze Sätze, keine Aufzählungen, Zahlen wie gesprochen). Antwortzeiten von Modell und Stimme werden je
  Monat gezählt und in der Redaktion gezeigt.
- **Kostenbremsen:** vertonte Zeichen je Monat (`MAX_STIMME_ZEICHEN_MONAT`, 30.000) und Audiominuten je Tag
  (`MAX_HOEREN_MINUTEN_TAG`, 20), eigene Zähler im KV (`stimme:monat:…`, `hoeren:tag:…`, je ein Schreibzugriff). Ist
  eine Grenze erreicht, antwortet Goch nur als Text bzw. bietet Tippen an – ohne Fehlermeldung; Robin bekommt einmal im
  Monat eine E-Mail.
- **Figur-ID:** `/chat` nimmt `figur`; öffentlich gilt nur `goch` (`worker/src/figuren.js`), alles andere ergibt 400 –
  auch eine Kundenfigur, die im KV liegt.
- **Redaktion:** Abschnitt „Goch – Stimme und Spracheingabe“ (Schalter, Modell im Sprachmodus, Stimmmodell, Voice ID,
  Grenzen, Zähler, Antwortzeiten, „Stimme anhören“: Probesatz mit der eingetragenen Voice ID, vor dem Speichern,
  zählt zur Monatsgrenze) und „Figuren für Vorführungen“ (Kundenfiguren: Einsatz Messe oder Workshop, Name, Rolle,
  Begrüßung, Einstiegsfragen, Persönlichkeit, Wissen, Quellen, Voice ID, Tagesgrenze – nur im KV, nie GitHub). Beides ist
  ab Werk aus. Der Einsatz bestimmt den Rahmen im Systemprompt (`worker/src/kiosk.js`, `kundenSystem`): am Messestand
  verweist die Figur an das Standpersonal, im Workshop erklärt sie die Regeln aus dem Wissen allgemein, gibt keine Auskunft
  zum Einzelfall und verweist an die Workshopleitung (24.10.2026).

Deploy (Robin, lokal): `cd worker && npx wrangler secret put ELEVENLABS_API_KEY`, dann `npx wrangler deploy`; danach in
der Redaktion Voice ID eintragen und einschalten. Prüfen: `node tests/goch_stimme_test.mjs` (Workers AI, ElevenLabs,
Anthropic und Resend abgefangen), `node tests/bundle_check.mjs`, `python3 tests/admin_test.py` gegen `node tests/admin_fake.mjs 8789`.
Vorführung ohne Worker: `python3 tests/goch_fake_worker.py 8787 --stimme mac` (macOS-Stimme serverseitig, für alle gleich;
nur Platzhalter) oder `--stimme elevenlabs` mit `ELEVENLABS_API_KEY` und `GOCH_VOICE_ID` als Umgebungsvariablen.

### Startseite: Sprachmodus und Zwitschern

Alles ist aus, bis `data-goch-stimme="an"` am `<body>` steht (zum Testen lokal `?stimme=an`). Robin setzt das Attribut,
wenn die Datenschutztexte freigegeben und Stimme und Spracheingabe in der Redaktion eingeschaltet sind.

- **Schalter** (`goch-stimme.js`): im geöffneten Gespräch „Goch hört“ und „Goch spricht“. Beim ersten
  Einschalten fragt eine eigene Einwilligung (getrennt von der des Gesprächs); sie gilt nur für diesen Besuch, liegt nur im
  Speicher der Seite und endet mit „Sprechen beenden“. Ohne Einschalten: kein `getUserMedia`, kein Ton, kein AudioContext,
  keine Anfrage an `/listen` oder die Stimme (geprüft).
- **Eine Frage sprechen** (Robin, 11.11.2026): Das Mikrofon-Symbol am Eingabefeld (`#goch-mikro-einmal`) schaltet
  „Goch hört“ sichtbar ein und nach genau einer Frage wieder aus; das Mikrofon ist danach zu. So bleibt die Einwilligung
  wörtlich richtig (offen nur, solange „Goch hört“ an ist). Es braucht dieselbe Einwilligung, vergrößert Goch am Handy
  nicht und endet auch mit „Pause“, nach einer Minute Stille, mit einem Tipp auf den Schalter oder beim Schließen. Ist
  „Goch hört“ an, ist das Symbol ausgeblendet. Geprüft in `tests/goch_einmal_test.py` (auch: ohne Antippen kein Mikrofon).
- **Sprechen – Gespräch ohne Knopf** (Robin, 23.10.2026): Ist „Goch hört“ an, hört Goch zu. Der Browser erkennt
  selbst an der Lautstärke, wann jemand spricht und wann er nach einer kurzen Pause (0,9 s) fertig ist (`goch-audio.js`,
  `erkenner` und `zuhoeren`; Grundrauschen = leisester Block der letzten 1,5 s, kurze Geräusche unter 0,25 s werden
  verworfen). Erst dann geht der gesprochene Abschnitt mit kurzem Vor- und Nachlauf als WAV (16 kHz mono, höchstens 20 s)
  an `/listen`; der erkannte Text erscheint als Besuchertext und läuft über `/chat` (`gesprochen: true`). Während Goch
  versteht, denkt oder spricht, hört er nicht zu; danach wieder. Der Knopf heißt je nach Lage „Pause“, „Fertig“ (sendet
  sofort) oder „Weiter zuhören“. Das Mikrofon schließt nach einer Minute ohne Sprache, mit „Pause“, beim
  Schließen des Gesprächs und mit „Sprechen beenden“. Test: `node tests/goch_hoeren_test.mjs` (Erkennung) und
  `tests/goch_stimme_test.py` (künstliche Stimme im Browser statt Mikrofon).
- **Stimme:** Ist „Goch spricht“ an, verlangt `goch.js` die Stimme (NDJSON, in Abschnitten) und zeigt die Antwort zusammen mit dem ersten Satz als Text;
  das MP3 spielt über Web Audio, der Schnabel folgt der Lautstärke (`AnalyserNode` → zu/halb/offen): Die Seite tauscht
  dafür Bilder mit halb und weit geöffnetem Schnabel (`data-mundpose`, abgeleitet aus dem Original mit
  `tools/figur-schnabel.py`, geladen erst beim Einschalten über `data-src-spaet`). Dazu neigt er sich mit betonten Silben
  leicht nach vorn, wechselt an Satzpausen die Kopfhaltung und schaut in Gesprächspausen ab und zu kurz zur Seite
  (`goch-audio.js`, `bewegung`: CSS-Variablen `--goch-neigung`, `--goch-hub`, gedreht um die Füße). Lauschen: leichte
  Neigung (`data-lauscht`, `.bird-tilt`), bis Robins Pose da ist. Ohne Stimme vom Server antwortet Goch nur als Text, ohne
  Hinweis – keine Gerätestimme, damit alle dieselbe Stimme hören. Ab der ersten gesprochenen Antwort steht „KI · künstliche Stimme“ im Gespräch.
- **iOS/Safari:** AudioContext und Sprachausgabe werden in der Berührung des Schalters bzw. Knopfs freigeschaltet.
- **Zwitscher-Ton:** `figuren/goch/toene/zwitschern.ogg` und `.mp3` (selbst erzeugt, Stil „frage“: `tools/figur-zwitschern.py --erzeugen frage`),
  eingeschaltet mit `data-goch-signalton="figuren/goch/toene/zwitschern"` am `<body>`; am Messegerät aus `figur.json`.
- **Zwitschern** (`goch-zwitschern.js`): sichtbar kleine Noten und ein Schnabelzucken, 1,5 s nach der Landung, danach
  höchstens alle 60 s, insgesamt dreimal je Seitenaufruf; vorbei, sobald Goch offen ist. Bei reduzierter Bewegung nur die
  Noten. Hörbar nur nach einer Handlung: leise beim Öffnen des Gesprächs und als Bestätigung beim Einschalten der Stimme;
  „Zwitschern aus“ in der Fußzeile des Gesprächs, gemerkt in `localStorage` (`rjl-goch-stumm`). Im offenen Gespräch zu
  Beginn und in Pausen ab und zu (nach 30–70 s Ruhe, höchstens viermal je Gespräch), nie während Goch denkt, spricht oder
  zuhört und nie während getippt wird; hörbar nur mit „Goch spricht“. Solange es keine
  Tondatei gibt (`data-goch-signalton` leer), zwitschert Goch nur sichtbar. Datei: `figuren/goch/toene/zwitschern.ogg`
  und `.mp3`, dann `data-goch-signalton="figuren/goch/toene/zwitschern"`.
- **Handy:** Mit Sprachschaltern oder deren Einwilligung darf das Blatt 80 % der Höhe nutzen, damit Verlauf und Knöpfe
  sichtbar bleiben.
- **Großen Goch aufheben** (Robin, 11.11.2026, `goch-gespraech.js`): Im Gesprächsmodus am Handy gibt ein Tipp oder Wisch
  neben dem Blatt, ein Wisch nach unten am Griff des Blatts oder „Seite ansehen“ die Seite frei. Sie steht dann wieder dort,
  wo der Besucher war, und scrollt wie gewohnt; Goch hört weiter zu und antwortet in der schmalen Leiste. Zurück: Tipp auf
  die Leiste oder den kleinen Goch, Wisch nach oben am Griff. Der kleine Goch erscheint erst, wenn der große aus dem Bild
  ist. Tippen ins Textfeld, die Tastatur und Scrollen im Verlauf heben nichts auf.
- **Gesprächsmodus auf dem Handy** (`goch-gespraech.js`, Robin, 23.10.2026): Ist im offenen Gespräch Stimme oder
  Spracheingabe an, rückt Goch in den Fokus – Papier über der Seite (`.goch-papier`), Goch groß oben auf dem Ast, darunter
  das Gespräch. „Seite ansehen“ oder eine Antwort mit `zeigen` schicken ihn klein in die Ecke (`#goch-mini`), das Gespräch
  wird zur Leiste, die Seite scrollt zur Stelle und hebt sie kurz hervor; ein Tipp auf den kleinen Goch holt ihn zurück.
- **Goch zeigt** (Worker: `zeigen`, feste Liste `ZIELE`): nur wenn die Seite `kannZeigen` meldet (Sprachfunktion an), sonst
  bleibt alles wie vorher. In der Antwort steht ein Verweis („Werkzeuge ansehen“); auf großen Bildschirmen führt nur er hin.
- **Blinzeln** (`vogel-blinzeln.webp`, abgeleitet mit `tools/figur-augen.py`): im offenen Gespräch alle paar Sekunden,
  ab und zu doppelt, nie während Goch spricht oder jemand zu ihm spricht.
- **Blickkontakt** (`goch-blick.js`, `goch-kamera.html`, `goch-kamera.js`, `goch-blickrechnung.js`): dritter Schalter mit
  eigener Einwilligung. Die Kamera wird nur im eigenen Rahmen `goch-kamera.html` ausgewertet – Content-Security-Policy
  `connect-src 'self'`, MediaPipe Face Landmarker aus `vendor/mediapipe/` (selbst ausgeliefert, Nutzungsmeldung an Google
  abgeschaltet, siehe `vendor/mediapipe/HINWEIS.md` und `tools/mediapipe-uebernehmen.py`). An die Seite gehen nur Zahlen:
  da, Lage, Größe, Kopfrichtung, schaut her – keine Bilder, keine Ausdruckswerte, keine Wiedererkennung. Goch bemerkt sein
  Gegenüber (blinzelt doppelt, richtet sich auf), wendet sich ihm sichtbar zu, wird bei Blickkontakt aufmerksam und hört
  im Gesprächsmodus nur zu, wenn er angesehen wird. Kontakt suchen (Robin, 23.10.2026): Kommt jemand an den Bildschirm
  (neu oder nach 6 s Abwesenheit), zwitschert Goch und spricht ihn an; steht jemand weiter weg (Gesicht schmal), lockt er
  erst mit Zwitschern (höchstens dreimal) und spricht beim Näherkommen oder Herschauen an; schaut jemand her und schweigt
  15 s, fragt er nach (höchstens zweimal). Alles feste Sätze vom Worker (`anlass` „angekommen“, „zurueck“, „nachfrage“,
  kein Modellaufruf, zählt zur Grenze je IP); gegrüßt höchstens alle 30 s, nicht beim Einschalten mitten im Gespräch. Kein sichtbares
  Vorschaubild (Robin, 23.10.2026: störte) – den Zustand zeigen der Schalter und die Kamera-Anzeige des Browsers; aus mit
  „Blickkontakt“, beim Schließen und mit „Sprechen beenden“ – beim Tabwechsel bleiben Kamera und Mikrofon an (Robin, 23.10.2026). Geladen wird MediaPipe (rund 16 MB) erst nach der Einwilligung. Am Messegerät keine Kamera.
  **Eigener Schalter (24.10.2026):** Der Blickkontakt erscheint nur mit `data-goch-blick="an"` am `<body>` (lokal zum Testen
  `?blick=an`), unabhängig von `data-goch-stimme`. Ohne ihn fehlen der Knopf und der Datenschutzabsatz zur Kamera – so kann
  die Stimme live gehen, bevor der Blickkontakt auf iPhone und Mac erprobt ist.
  Tests: `node tests/goch_blick_test.mjs` (Rechnung), `tests/goch_stimme_test.py` (Rahmen, CSP, keine fremden Hosts,
  zuhören nur mit Blick – Gesicht über einen lokalen Testhaken vorgespielt).
- **Datenschutz:** Absatz „Sprechen mit Goch“ (DE/EN, `privacyGochStimme`) – Entwurf, von Robin freizugeben; sichtbar erst,
  wenn die Funktion an ist. Die Einwilligung des Gesprächs (`rjl-goch-consent`) bleibt unverändert, weil ihr Text weiter
  stimmt; die Sprach-Einwilligung wird nicht gespeichert, also gibt es keine Version hochzuzählen.
- **Schnabelposen (23.10.2026):** `vogel-schnabel-halb.webp` und `vogel-schnabel-offen.webp` in beiden Fassungen, abgeleitet
  aus der Sitzpose mit `tools/figur-schnabel.py` (Unterschnabel 7° bzw. 14° aufgeklappt, Rachen und Zunge ergänzt) –
  Zwischenlösung, bis gezeichnete Posen da sind; Kehle und Kopf bewegen sich nicht mit. In der Szene als
  `data-mundpose` mit `data-src-spaet`: geladen erst, wenn ein Besucher Stimme oder Spracheingabe einschaltet; die Landschaft
  schaltet die Pfade mit. Gezeichnete Posen (Nano Banana oder ChatGPT, Prompt in `FIGUREN.md`) ersetzen die Dateien gleichen
  Namens – ohne Codeänderung; nach `tools/landschaft-bilder.py` auch `tools/figur-schnabel.py` neu laufen lassen, solange die
  abgeleiteten Posen gelten. Die Lauschpose fehlt noch (Platzhalter: leichtes Neigen).
- **Stimme warm, weich, männlich (Robin, 23.10.2026):** ElevenLabs ab Werk mit Multilingual v2 und den Einstellungen aus
  `figur.json` (`stability` 0,5, `similarity_boost` 0,8, `style` 0,15, `speed` 0,95); Prompt für Voice Design in `FIGUREN.md`.
  Rückfall im Browser: bevorzugt Markus, Yannick, Viktor, Martin (Premium vor einfach), sonst Reed oder Eddy; Englisch
  Daniel; etwas tiefer und ruhiger (`stimme.browser`).
- **Vorführung am Mac mit echter Spracherkennung:** Die Attrappe erkennt auf Wunsch lokal mit faster-whisper
  (`python3 tests/goch_fake_worker.py 8787 --whisper <Modellordner>`, Modell „base“ rund 145 MB, `pip install faster-whisper
  numpy`); nichts verlässt den Rechner. Die Antworten bleiben die festen Texte der Attrappe. Mikrofon nur in Chrome oder
  Safari, nicht im Browser-Bereich der Claude-App.
- **Höhe der Sprechblase:** Mit Sprachschaltern wird die Blase so hoch wie ihr Inhalt plus Platz für den Verlauf
  (`goch.js`, `mindesthoehe`); vorher ragte die Fußzeile bei eingeschalteter Landschaft über die Seite.
- **Goch lebt (24.10.2026, `goch-leben.js`):** Körper, Kopf und Schwanz sind eigene Teile aus der Sitzpose
  (`tools/figur-teile.py`, `figur.json` → `animation.teile`); zusammengesetzt ergeben sie genau die Sitzpose. Sitzt Goch,
  übernehmen sie: kurze, ruckartige Kopfbewegungen mit Pausen, Knicksen mit gehobenem Schwanz, Schwanzzucken,
  Blinzeln, kaum sichtbares Atmen – um die Fußlinie, die Füße bleiben auf dem Ast. Mit der Stimme nickt der Kopf,
  beim Zuhören senkt er sich leicht; Schnabel und Blinzeln wechseln nur den Kopf (statt ganzer Posen). Daten: rund
  90 KB beim ersten Laden, die Schnabelköpfe (je 18 KB) erst mit der Stimme; nur `transform` und `opacity`. Ohne
  Skript, bei reduzierter Bewegung und im Flug bleibt alles wie vorher. Das Messegerät nutzt dieselben Teile
  (`figur.js`). Test: `python3 tests/goch_leben_test.py http://localhost:8788/`.
- **Seitenwissen (24.10.2026, `worker/src/seitenwissen.js`):** Goch kennt alle Inhalte der Website, wie sie gerade live
  sind. Der Worker liest die Sitemap von `SITE_URL`, holt jede deutsche Seite (englische Doppel und das Regel-Lexikon nicht),
  zieht den sichtbaren Text aus `<main>` (ohne Verborgenes, Navigation, Skripte; gleiche Absätze nur einmal; höchstens
  40 Seiten, 8.000 Zeichen je Seite, 70.000 insgesamt) und speichert ihn im KV (`content:seiten`). Neu eingelesen wird im
  Hintergrund, wenn der Stand älter als sechs Stunden ist (höchstens ein Versuch je zehn Minuten), oder in der Redaktion
  unter „Goch – Profil“ mit „Jetzt neu einlesen“ – nie während einer Antwort. Der Text steht im Systemprompt nach „Woran
  Robin gerade arbeitet“; jede Seite ist zugleich ein Link (`seite-…`), sofern `links.md` die Adresse nicht schon führt.
  Am 24.10.2026: 12 Seiten, rund 6.700 Wörter. Test: `node tests/goch_seitenwissen_test.mjs`.
- **Clips mit Goch (24.10.2026, `tools/goch-clip.py`):** aus einem Drehbuch (JSON: Sätze, Aussprache, Karten,
  Kopfhaltung) ein MP4 in 4:5 – jeder Satz einzeln vertont über die Attrappe (`POST /_vertonen`, Stimme aus
  `GOCH_VOICE_ID`, Schlüssel bleibt in der Attrappe), zwischengespeichert; Goch Bild für Bild synchron zum Ton auf
  `tools/goch-clip/clip.html`, Untertitel und Karten, Zwitschern am Anfang und Ende. Kein Teil der Website.
  Layout „vortrag“ (16:9, 24.10.2026) für Workshops: `tools/goch-vortrag.py` schreibt aus Skript (Markdown) und Folien
  (HTML mit `data-bloecke` je Folie) ein Drehbuch je Kapitel – Folie zum Absatz, Aussprache von Paragrafen und
  Gesetzesnamen; erster Einsatz: Unterweisung KI-Kompetenz, Kanzlei-Fassung (Vault). Port für Chrome mit
  `GOCH_CLIP_PORT`. Neben jedem Video entstehen Absatzmarken (`<video>.marken.json`: je Absatz und Satz Anfang, Ende,
  Text, Folie, dazu die Stimme), erst wenn das Video fertig ist; `--nur-marken [--stimme-id <id>]` schreibt sie neu nur
  aus dem Ton-Zwischenspeicher – ohne Rendern, ohne Stimmdienst, und ohne etwas zu schreiben, wenn ein Satz fehlt.
- **Workshop-Bühne (24.10.2026, `buehne.html` + `buehne.js`):** Robin: „die perfekte Mischung aus Videos und freiem
  Sprechen, wenn Fragen gestellt werden“. Gochs Vortrag läuft als Kapitelvideo (geprüfter Text); meldet sich jemand
  (H oder kurz die Taste), spricht Goch zu Ende wie ein Referent – bis zum Absatzende, wenn das höchstens 12 s entfernt
  ist, sonst bis zum Satzende –, und an derselben Stelle erscheint er live im selben Layout (Karte, Kapitel, Goch auf dem
  Ast, Untertitel). Er beantwortet die Frage frei aus dem Wissen der Workshop-Figur und kennt dabei den Stand des
  Vortrags (`vortrag` in `/kiosk/chat`: Kapitel, gerade Gesagtes, was als Nächstes kommt, Fragen bisher). Mit W leitet er
  über und es geht dort weiter, wo er aufgehört hat – oder dahinter, wenn die Antwort den nächsten Teil schon abdeckte
  (Worker: `weiter: "ueberspringen"`); Esc ohne Überleitung. Im letzten Kapitel blickt er vor der Zusammenfassung kurz auf
  die Fragen zurück. Läuft am Laptop über den lokalen Dienst (`--vortrag <Ordner>`), Einrichtung in `kiosk/README.md`.
  Im Worker (`kundenVortrag` in `worker/src/kiosk.js`): der feste Systemprompt der Figur bleibt Block 1 (gecacht), der
  Stand des Vortrags kommt als Block 2 dazu; die Fragen der Teilnehmenden stehen nie im Systemprompt, sondern als
  Zitat vor der letzten Nutzernachricht; `weiter` nur bei der Überleitung und nur, wenn es etwas zu überspringen gibt.
  Ohne Antwort des Modells (Fehler, Grenze, aus) sagt eine Workshop-Figur einen eigenen Satz mit `fehler: true`, ohne
  Stimme. Test: `python3 tests/buehne_test.py` (braucht zusätzlich PyAV).

### Messegerät (Kiosk)

Einrichtung, Betrieb und Datenschutz am Gerät stehen in `kiosk/README.md`; Hinweisschild in `kiosk/hinweisschild.md`.

- **Seite** `kiosk.html` + `kiosk.js`: derselbe Code wie die Website – `language.js` (Texte), `goch-audio.js` (Aufnahme als WAV,
  Stimme, Pegel; seit 23.10.2026 auch von `goch-stimme.js` genutzt) und `figur.js` (lädt ein Figurenpaket: Posen am Auge
  ausgerichtet oder ein Logo, das mit der Stimme pulsiert). Hochformat 1080 × 1920 und 2160 × 3840, große Figur, Gespräch als
  Untertitel. Bedienung: Touch und ein USB-Taster (F13). Erster Druck zeigt den Hinweis, der zweite ist die Einwilligung;
  nach 60 s ohne Aktivität ist alles zurückgesetzt. Nichts wird im Browser gespeichert. Läuft nur unter localhost.
- **Lokaler Dienst** `kiosk/dienst/goch_kiosk.py` (Python, Standardbibliothek): liefert nur die Dateien des Kiosks aus
  einem festen Commit aus, reicht `/kiosk/*` mit dem Gerätenachweis an den Worker weiter (der Nachweis liegt nur dort),
  puffert ohne Netz bestätigte Nachrichten an Robin, meldet Radar (HLK-LD2410, `radar_ld2410.py`) und Netz als Ereignisse,
  schickt Lebenszeichen. systemd mit Watchdog, Wächter für Chromium, Chromium-Richtlinien in `kiosk/chromium/`.
- **Worker** `worker/src/kiosk.js`: `/kiosk/chat`, `/kiosk/listen`, `/kiosk/figur`, `/kiosk/lebenszeichen` mit
  Geräteanmeldung (Nachweis aus der Redaktion, im KV nur als SHA-256; wahlweise Client-Zertifikat, `KIOSK_MTLS`).
  Gerätebudget im Durable Object `Geraetebudget` statt der IP-Grenzen der Website. Kundenfiguren nur hier und nur für
  freigegebene Geräte: eigener Systemprompt aus Persönlichkeit und Wissen der Redaktion, ohne Draht, Links und Newsletter,
  Stimme mit ihrer eigenen `voiceId`. Goch am Gerät antwortet kürzer, ohne Links und ohne Newsletter-Feld.
- **Redaktion:** Abschnitt „Messegeräte“ (Gerät anlegen, Nachweis einmal anzeigen oder erneuern, freigegebene Figuren,
  Tagesbudget, Fingerabdruck des Zertifikats, Lebenszeichen und Verbrauch heute).
- **Offline:** vorbereitete Antworten mit Stimme erzeugt `kiosk/dienst/offline_antworten.py` auf dem Gerät; sie bleiben dort.

Deploy: Der nächste `npx wrangler deploy` legt das Durable Object an (Migration `v1-geraetebudget` in `wrangler.toml`).
Prüfen: `node tests/kiosk_worker_test.mjs`, `python3 tests/kiosk_dienst_test.py`, `python3 tests/kiosk_test.py` (startet
Dienst und Attrappe selbst; Bildschirmfotos im Hochformat).

Prüfen: `python3 tests/goch_stimme_test.py http://localhost:8788/ http://localhost:8787` (Seite und
`tests/goch_fake_worker.py` wie beim Goch-Test; Chromes Testmikrofon, 14 Gruppen: vor jeder Handlung, Öffnen, Einwilligung,
Stimme, Grenze, Mikrofon, 20 s, Spracheingabe aus/Grenze, Beenden, reduzierte Bewegung, Englisch, ohne Schalter, Handy,
Konsole). `tests/goch_test.py` und der Bildvergleich (`tests/figur_bildvergleich.py`) belegen, dass ohne Schalter alles
bleibt wie vorher.

## Sicherheit der Auslieferung (Stand 16.10.2026)

GitHub Pages sendet keine eigenen Sicherheits-Kopfzeilen (kein HSTS, keine CSP); dafür bräuchte es den Cloudflare-Proxy
vor der Seite (Review 16.10.2026, Paket B, noch nicht gebaut). Umgesetzt am 16.10.2026: Dependabot-Warnungen und
Sicherheits-Updates im Repository, `security.txt`, DNSSEC und CAA-Einträge bei Cloudflare (siehe Vault-Notiz zum Review).
Offen: Zweigschutz auf `main` und ein eigenes Repository für die Werkzeugdateien (Paket F).

## Mond: Sichtbarkeit und Verdeckung (10.10.2026)

Die beleuchtete Fläche wird weiterhin aus der astronomischen Beleuchtungsfraktion berechnet.
Am Tag ist die unbeleuchtete Seite unsichtbar; eine sehr sonnennahe Sichel verblasst zusätzlich.
Weißes Tageslicht geht stetig in das warme Nachtweiß über. Nur im dunklen Himmel kann schwaches
Erdlicht die übrige Scheibe zeigen. Das ist eine Kontrastnäherung, keine photometrische Simulation.
Die künstlerische Bühnenbahn, die Zeitzonen-Näherung und die vorhandene Terminatorausrichtung
bleiben bestehen; die Szene ist kein maßstäbliches Planetarium.

Verdeckung ist unabhängig von dieser Helligkeit: Die vollständige Mondscheibe maskiert Sterne;
Burg, Berg und Krone maskieren die Himmelskörper. Die Landschaftsbilder behalten ihre ursprüngliche
Aquarelltransparenz. Eine lokale Canvas-Maske liest aus der vorhandenen Bildalpha die Geländeoberkante
(Schwelle 8/255) und verdeckt darunter vollständig. Kronen berücksichtigen Bildalpha, Saison-Deckkraft
und den mobilen oberen Verlauf. Masken werden bei Bildwechsel und Größenänderung neu berechnet,
ansonsten wiederverwendet. Keine zusätzlichen Bilddateien oder Netzwerkdienste.

SVG-Mond und Sonne erhalten ein echtes `hidden`-Attribut mit expliziter CSS-Regel unter dem Horizont.
Ihre Höhe hängt direkt von `--horizon` ab, damit Drehen/Vergrößern des Fensters sofort stimmt.
Die langsame Positionsanimation entfällt, damit Mond und seine Sternmaske synchron bleiben.

Prüfen:

```sh
node --test tests/landscape.test.cjs tests/moon.test.cjs tests/bird-flight.test.cjs
node tests/site_test.mjs
# Lokaler Server; Playwright und pngjs müssen im Node-Suchpfad installiert/verfügbar sein.
python3 -m http.server 8789 --bind 127.0.0.1
node tests/moon-browser.test.cjs http://127.0.0.1:8789 /tmp/mond-pruefung
```

Der Browsertest verwendet Chrome (macOS-Pfad voreingestellt, überschreibbar über `CHROME`), blockiert
externe Anfragen und schreibt Pixelprüfungen, Sichttafel und Bildschirmfotos in den Ausgabeordner.
Er prüft 33 Phasenflächen, acht Hauptphasen bei Tag/Dämmerung/Nacht auf 390/1440 px, Verdeckung,
Sterne hinter der dunklen Hälfte, den Fehlerzeitpunkt 05.10.2026 19:46 MESZ, Resize sowie Winterwechsel.
Die Sichttafel zeigt die Phasen vergrößert und ungedreht zum Vergleich; nicht alle Kombinationen sind
zu einer bestimmten Uhrzeit gleichzeitig am Himmel sichtbar.

Physikalische Grundlage: [NASA – Mondphasen, Erdlicht und Tagesmond](https://science.nasa.gov/moon/moon-phases/),
[SunCalc 1.9.0 – Mondbeleuchtung und Winkel](https://github.com/mourner/suncalc/tree/v1.9.0#moon-illumination).
