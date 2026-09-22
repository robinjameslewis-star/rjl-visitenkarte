# Landschaft – Prüfprotokoll (20.09.2026)

Umsetzung des Konzepts „nah und fern“ (Vault: `10_Projects/Website Visitenkarte/Landschaft_Prompts_ChatGPT.md`).
Gebaut von Codex (Bilder, Skript, Tests, Aufbereitung), fertiggestellt und geprüft von Claude, nachdem
Codex' Kontingent aufgebraucht war. Beschreibung in README, Abschnitt „Landschaft“.

## Was Claude nach der Übergabe geändert hat
- `landscape.js`: Jahreszeiten hießen in der Rechenschicht englisch (`autumn`), die Dateien deutsch
  (`herbst`) – Krone, Ferne und Blätter erschienen deshalb nie. Zuordnung `FILE` ergänzt.
- `landscape.js`/`index.html`: `?landschaft=an` übersteuert den Schalter `data-landschaft="aus"` – so
  lässt sich die Landschaft live prüfen, bevor die Redaktion sie einschaltet. Ausgeliefert mit `aus`.
- `goch.js`: Mit Landschaft steht der Name oben; die Sprechblase hängt jetzt unter ihm (vorher lief sie
  oben aus dem Fenster). Schnabel der Blase nach oben versetzt.
- `index.html`: Sprachlinks bekommen vor der Krone einen Lichthof in Papierfarbe; auf dem Handy sitzt
  die Krone unter den Sprachlinks mit weich auslaufender Oberkante; fallende Blätter werden nachts mit
  abgedunkelt.

## Geprüft
| Punkt | Ergebnis |
|---|---|
| `node tests/landscape.test.cjs` | 15/15 (Sonnenhöhe 21.06. 13:00 ≈ 65°, 21.12. ≈ 18°, Mitternacht negativ; Vollmond/Neumond nach USNO; Osten rechts; Jahreszeiten und Überblendung; Südhalbkugel; Zeitzonen; URL-Parameter) |
| `node tests/bird-flight.test.cjs` | bestanden |
| `python3 tests/consent_test.py` | alles bestanden |
| `python3 tests/goch_test.py` (mit Attrappe) | alle Prüfungen bestanden, keine Konsolenfehler |
| Redaktions-Marken und `data-*` am `<body>` | unverändert vorhanden (`redaktion:blog-link`, `redaktion:blog-section`, `data-chat-endpoint`, `data-contact-endpoint`, `data-version`) |
| Gewicht Erstaufruf (Schreibtisch, Herbst, AVIF) | 0,93 MB von 1,2 MB; Vogelbilder 431 KB (Budget 600); Krone 115 KB, Ferne 76 KB |
| `landscape.js` | 17,7 KB unkomprimiert (Budget 15 KB; lesbar belassen, gzip ≈ 6 KB) |
| Bildschirmfotos 1440 px: 13:00 / 18:50 (Sonne −6°, `--nacht` 0,5) / 23:00 | Tag: Krone rechts, Ferne hinter dem Vogel, Name im Himmel, Sonne; Dämmerung: Verlauf, Mondsichel links; Nacht: Nachtpalette, Sterne, Krone abgedunkelt, Name in Hellgrün |
| 390 px: 13:00 / 23:00 | einspaltig, Krone unter den Sprachlinks, Vogel auf dem Ast, Name unter der Szene; kein Querscrollen |
| `?landschaft=aus` und Schalter `aus` | Seite exakt wie vor der Landschaft (Name unten, alter Ast, Vogelbilder aus `assets/bestand/`, `multiply`) |
| Goch-Sprechblase mit Landschaft (1440 px) | unter dem Namen, 400 px breit, Schnabel zum Vogel |

## Nachbesserung 21.09.2026 (Robins Rückmeldung nach dem Einschalten)
1. **Ohne Landschaft blitzte erst der lange Ast auf, dann der kurze.** Die Startseite trug die Pfade der
   Landschaftsfassung (`assets/ast.webp`, 2800 px) und `landscape.js` tauschte erst nach dem Laden auf
   `assets/bestand/`. Jetzt trägt `index.html` die Pfade der **eingeschalteten** Fassung (Szene, Vorabladen,
   Astbreite); die Redaktion schreibt sie beim Umschalten mit (`applyLandscape`), `landscape.js` tauscht nur noch
   für `?landschaft=an|aus`. Geprüft im Browser: ohne Landschaft werden ausschließlich `assets/bestand/*` geladen
   (sechs Anfragen, keine doppelte), Ast 1153 px von Anfang an. `node tests/site_test.mjs` (13 Punkte).
2. **Der Vogel war durchsichtig** (Blätter hinter ihm schienen durch). Weiß → Transparenz macht helle Flächen wie
   den Bauch zwangsläufig transparent (kein Pixel hatte Alpha 255). Neues Verfahren `opaque_cutout` in
   `tools/landschaft-bilder.py` für Vogelbilder und Astverlängerung: Silhouette per Flutfüllung vom Bildrand,
   innen Alpha 1, 2-px-Saum mit geschätzter Deckung aus der nahen Innenfarbe. Vogelbilder jetzt 511 KB
   (Budget 600), Ast 183 KB, links weiterhin pixelgleich mit dem alten Ast. Krone und Ferne unverändert
   (dort ist das Durchscheinen des Papiers gewollt). Geprüft: Bauch nachts deckend vor dem Himmel, keine hellen Säume.
   `tools/landschaft-bilder.json` behält bei Teilläufen (`--skip-…`) jetzt die Einträge früherer Läufe.

## Landschaften in der Redaktion (21.09.2026)
Robins Idee: Landschaften in ChatGPT/Nano Banana malen lassen und selbst einbetten, mit Bestand zum Umschalten.
Gebaut: Sätze unter `assets/landschaften/<satz>/` (erster Satz `burgberg-herbst`, Dateien dorthin verschoben),
`data-landschaft-satz` am `<body>`, Abschnitt „Landschaften“ in der Redaktion (Schalter + Satzwahl, Bestand,
Editor mit Aufbereitung im Browser und Vorschau auf der echten Startseite), Rahmenprompt und Schablone im Vault.
Geprüft: `node tests/site_test.mjs` (17 Punkte), `python3 tests/admin_test.py` (Abschnitt 9: Test-PNGs → WebP
unter Budget, Weiß durchsichtig/Motiv deckend, Vorschau per Nachricht, Himmelsfarbe und Blätterart sofort,
Speichern, Nacht- und Handy-Vorschau), `node tests/bundle_check.mjs`, `node tests/landscape.test.cjs` 15/15;
Bilder des Herbst-Satzes nach dem Verschieben byteidentisch (Werkzeug deterministisch, `git mv` ohne Änderung).

## Breite Bildschirme (21.09.2026, Robins Foto vom 4K-Monitor)
Der Ast (2,43 Szenenbreiten) endete mit harter Kante im Papier, die Krone hing am fernen Fensterrand, die Blätter fielen
über leeren Himmel. Jetzt: Reicht der Ast nicht bis zum Rand (ab ≈ 2100 px), setzt `landscape.js` `--landscape-inset`,
die Krone rückt ans Astende (Breite wie auf einem Fenster, das dort endet, höchstens 1,15 Szenenbreiten), der Ast läuft
über die letzten 15 % weich aus (`mask-image`), die Blätter fallen wieder neben dem Vogel. Geprüft bei 1920 (unverändert:
Inset 0, keine Maske), 2560 und 3840 px. Dazu (Robins Wunsch): Ab 2200 px wachsen Bühne und Textspalten mit
(`--seite`/`--text`), bei 3840 px ist die Bühne 1694 px breit (Vogel 648 statt 303 px); bis 2199 px unverändert
(bei 1920 geprüft: Bühne 1120, Text 980, Menü und Sprachlinks an alter Stelle).

## Offen / Robins Abnahme
- Live prüfen mit den Vorschau-Links der Redaktion (Mittag, Dämmerung, Nacht, Handy); dann Schalter auf „an“.
- Weitere Jahreszeiten (Winter bis 1. Dezember) nach README-Abschnitt „Landschaft“.
- Idee: nachts ein warmer Lichtpunkt an der Burg (Robins Entscheidung).

## Reparatur 22.09.2026: Anflug, Nachtfarben und Handychat
- Bei eingeschalteter Landschaft beginnt der Anflug rechts unter dem Ast und steigt links der
  Krone zur unveränderten Landeposition auf. Ohne Landschaft bleibt die bisherige Flugkurve.
- Alle fünf Vogelbilder und der Ast erhalten denselben nativen Nachtfilter; der bewegte Container
  hat keinen SVG-Filter mehr. Sieben Stichproben über den Anflug zeigen durchgehend
  `brightness(0.6) saturate(0.82)` bei voller Nacht.
- Weißreste am transparenten Rand werden reproduzierbar im Bildskript entfernt. Der helle Bauch
  bleibt deckend. Am alten Aststück werden nun ebenfalls Randpixel korrigiert: Die frühere
  Pixelgleichheit gilt dort deshalb nicht mehr; Größe, Lage und Innenzeichnung bleiben erhalten.
  Vogelbilder zusammen: 595.136 Bytes (Budget 600.000); Ast: 187.020 Bytes, 2800 × 167 px.
  Die Originale unter `assets/bestand/` bleiben unverändert.
- Der mobile Chat liegt direkt am body und damit über Name und Kalender. Beim Vergrößern
  kehrt er zum Ast zurück. Geprüft in Headless Chrome bei 390 und 1440 px, Breitenwechsel auf
  1024 px; Landschaft an/aus. Ein lokales Kalender-iframe mit eigenem Stapelkontext prüft die
  Überdeckung; kein Rasterpunkt der mobilen Sprechblase wird verdeckt. Kein Gerätetest in Safari.
- Bestanden: Flugtests 8, Landschaftstests 15, Site-/Redaktionsprüfungen 17, Bildtests 2;
  vollständige Goch- und Einwilligungs-Browsertests sowie der neue Landschaft-/Chat-Browserlauf.
- Backend, site.js und Redaktionsmarken bleiben unberührt. Der veröffentlichte Schalter bleibt aus.

Belege: [Anflug nachts](tests/screenshots/goch-reparatur/1440-nacht-1600.png),
[Handychat](tests/screenshots/goch-reparatur/390-chat-an.png),
[Messprotokoll](tests/screenshots/goch-reparatur/report.json).
