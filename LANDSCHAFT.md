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

## Offen / Robins Abnahme
- Live prüfen mit `?landschaft=an&zeit=…` (Mittag, Dämmerung, Mitternacht, ein Vollmond, Handy); dann
  Schalter in der Redaktion auf „an“.
- Weitere Jahreszeiten (Winter bis 1. Dezember) nach README-Abschnitt „Landschaft“.
- Idee: nachts ein warmer Lichtpunkt an der Burg (Robins Entscheidung).
