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
- `assets/flugpose-*.webp` – vier verlustfreie Flugposen
- `tests/bird-flight.test.cjs` – Verhaltenstests für die Animation; `tests/im-browser.html` führt sie ohne Node im Browser aus
- `tests/consent_test.py` – Prüfung der Einwilligung in einem frischen Headless-Chrome
- `goch.js` – Goch: Sprechblase am Ast (Einwilligung, Gespräch, Nachricht an Robin)
- `worker/profile.md`, `worker/aktuell.md` – was Goch weiß (von Robin freigegeben, öffentlich, in der Redaktion pflegbar); `worker/src/index.js` der Cloudflare Worker
- `worker/src/admin.js` – Redaktion – Backend der Website unter `/admin` (Aktuell, Links, Zähler; Anmeldung per E-Mail-Code)
- `tests/goch_fake_worker.py` – Attrappe des Workers für Tests ohne Cloudflare; `tests/goch_test.py` – Prüfung der Sprechblase in Headless-Chrome
- `tests/admin_fake.mjs` – Attrappe der Redaktion (echte Dashboard-Seite, feste API-Antworten, echte Blog-Vorschau) zum Prüfen des Editors im Browser
- `tests/blog_test.mjs` – Blog-Renderer ohne Worker: Open-Graph-Angaben, Vorschaubild-Regeln
- `landscape.js` – Landschaft: Himmel, Sonne, Mond, Sterne, Jahreszeit, Nachtpalette, Blätter, Sätze aus `assets/landschaften/` (Abschnitt „Landschaft“); `tools/landschaft-bilder.py` – Bilder freistellen und exportieren; `tools/landschaft-schablone.py` – Schablone für Bildagenten; `tests/landscape.test.cjs`, `tests/site_test.mjs`
- `tests/bundle_check.mjs` – prüft vor dem Deploy das gebündelte Worker-Paket (eingebetteter Renderer läuft ohne Bündler-Helfer, Seitenskript der Redaktion)
- `tests/admin_test.py` – Prüfung des Blog-Editors (Werkzeuge, Karte/Video, Live-Vorschau, eigenes Fenster, lokale Sicherung) in Headless-Chrome gegen die Attrappe
- `assets/vogel.webp` – Vogel-Ebene (Sitzpose, WebP q92 auf Weiß, 66 KB; Beine enden an der Astkante)
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

Die vier Dateien `assets/flugpose-1-aufschlag.webp` bis `assets/flugpose-4-landeanflug.webp`
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

- **Erster Besuch:** Banner am unteren Rand mit „Terminbuchung erlauben“ und „Ohne Terminbuchung
  fortfahren“ (gleichwertig gestaltet) sowie Link zu Impressum & Datenschutz. Bis zur Entscheidung
  geht **keine Anfrage** an cal.com; im Kalenderbereich steht ein Hinweis und der externe Link zum
  Buchungskalender (öffnet cal.com erst beim Klick).
- **Erlauben:** Cal.com-Skript und Iframe werden eingefügt, der Hinweis verschwindet.
- **Ablehnen:** Banner schließt, Hinweis und externer Link bleiben.
- **Widerruf:** Fußzeile → „Datenschutzeinstellungen“ öffnet das Banner erneut (mit „Schließen“
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

**Anschrift:** Die Klappe nennt Name, Ort (72336 Balingen) und E-Mail, keine Straße (Robin,
14.09.2026). Für eine private Seite ohne Angebot, Werbung oder berufliche Leistung greift die
Impressumspflicht (§ 5 DDG) nicht; § 18 Abs. 1 MStV nimmt persönliche Zwecke aus; Art. 13 DSGVO
verlangt „Kontaktdaten“, hier Name und E-Mail. **Sobald Artikel erscheinen (§ 18 Abs. 2 MStV)
oder die Seite beruflich genutzt wird (§ 5 DDG), ist eine ladungsfähige Anschrift Pflicht** –
dann Privatadresse oder Impressum-Service (c/o, Post wird weitergeleitet; Postfach reicht nicht).

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

Texte (Robin, 14.09.2026): schlicht — „Termin vereinbaren“ / „Arrange an appointment“, ohne Du/Sie.
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
`<ebene>-<jahreszeit>-<breite>.webp` (Ferne 1400/800, Krone 1000/560; AVIF optional). Welcher Satz läuft, steht am
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
