# Lokaler Memberpilot

Funktionsprototyp für robin.vision, ausschließlich mit synthetischen Beispieldaten.
Er demonstriert die Aufnahme eines Unternehmensprofils, Robins Prüfung und die
darauf beruhende Memberansicht. Er ist weder veröffentlicht noch produktionsreif.

## Start

Python 3.10 oder neuer und `pypdf` werden benötigt. Im Codex-Arbeitsplatz ist beides
im gebündelten Python bereits vorhanden:

```sh
/Users/robin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 server.py
```

Aus diesem Verzeichnis starten, dann
`http://127.0.0.1:8765/prototypes/member-pilot/` öffnen. Mit `--port 8766` oder
`RV_PILOT_PORT=8766` ist der Port konfigurierbar. Der Server bindet ausschließlich
an `127.0.0.1`. Strg+C beendet ihn und verwirft alle seit dem Start eingegebenen Daten.

## Ablauf und Grenzen

Im geplanten ersten Pilot legt Robin das Profil vor der Einladung an: ausgefüllten
Fragebogen importieren, Antworten prüfen und bei Bedarf bearbeiten, Ansprache und
Segment festlegen, anschließend ausdrücklich freigeben. Erst die Freigabe ändert
das Profil der Memberansicht. Ein Import allein tut das nicht.

Das Onlineformular ist eine Vorschau auf eine spätere Ausbaustufe nach Anmeldung,
keine Selbstregistrierung für den ersten Pilot. Es beginnt mit Organisationsname,
Vision, Hindernis und Priorität. Alle weiteren Angaben sind optional. Speichern und
Einreichen erzeugen eine Selbstauskunft als Entwurf; auch sie benötigt eine Freigabe.
Fehlende Kernfelder werden angezeigt. Für die Freigabe ist serverseitig mindestens
der Organisationsname erforderlich.

**Keine echte Authentifizierung oder Rollenprüfung:** Jeder lokale Nutzer dieser
Demo kann Member- und Adminansicht öffnen. Der Demo-Token verhindert ungewollte
fremde Webanfragen; er ist keine Anmeldung und kein Mehrmandantenschutz. Ausschließlich
synthetische Daten verwenden. Es werden keine Einladungen, E-Mails oder externen
API-Aufrufe gesendet. Die Wiedervorlage ist ein gespeicherter Hinweis ohne Scheduler.
Der Prototyp enthält keinen externen KI-Dienst. Eigene Konto- und Kundentrennung,
Zugriffskontrollen und die tatsächliche Verarbeitung vertraulicher Daten sind nicht
umgesetzt.

## PDF-Import

`pypdf` liest Formularwerte im Arbeitsspeicher. Uploads, abgeleitete Antworten und
Profiländerungen werden nicht auf die Festplatte geschrieben. Bei einem Neustart
werden nur das Schema und das synthetische `demo-profile.json` erneut geladen.

- Höchstens 2 MiB pro PDF und 8 Seiten; keine verschlüsselten PDFs.
- Nur bekannte Fragebogenfelder. Metadaten `/RVFormVersion` und `/RVLanguage` sind
  optional; eine abweichende vorhandene Version wird abgewiesen.
- Die Formularstruktur wird zuerst mit `get_fields()` gelesen; Widgets ergänzen
  fehlende Werte. Widersprüchliche Werte werden abgewiesen.
- Deutsche und englische Auswahlwerte werden auf die deutschen Schemaoptionen
  normalisiert. Platzhalter werden leer, Checkboxen werden echte boolesche Werte.
- PDF-Aktionen, JavaScript, eingebettete Dateien und XFA werden nicht ausgeführt;
  erkannte aktive Inhalte werden abgewiesen. Es gibt weder OCR noch ein Sprachmodell.
- Signaturfelder werden nicht als Antworten übernommen. Signaturen werden nicht
  geprüft. Die Original-PDF wird nicht verändert oder neu geschrieben.

Downloads: `downloads/pilot-questionnaire-de.pdf` und `-en.pdf`. Sie werden separat
bereitgestellt und sind nur über explizit zugelassene statische Routen erreichbar.

## API

Alle Antworten haben `Cache-Control: no-store`. Jeder POST benötigt JSON und den
Header `X-Demo-Token` aus `GET /api/state`. Wenn vorhanden, muss der Origin exakt
dem lokalen Host und Port entsprechen. Der Host wird ebenfalls geprüft.

| Route | Ergebnis / Eingabe |
|---|---|
| `GET /api/state` | `{profile, draft, csrfToken}` |
| `GET /api/questionnaire` | Fragebogenschema |
| `POST /api/import` | `{filename, pdfBase64}` → `{draft}` |
| `POST /api/intake` | `{fields, mode: "save" oder "submit", language?: "de" oder "en"}` → `{draft}` |
| `POST /api/publish` | `{draftId, fields, confirmed: true, informalAddressApproved, segments, reviewNote, nextFollowUp}` → `{profile, draft: null}` |

`fields` ist ein flaches Objekt mit Schema-IDs. Das Onlineformular sendet bei jedem
Speichern alle aktuell vorhandenen Antworten. Es wird nichts mit einem alten oder
anderen PDF-Entwurf vermischt. Jeder neue Entwurf erhält eine neue ID; ältere IDs
können danach nicht freigegeben werden. Fehler ändern weder Profil noch Entwurf.
Nach Freigabe wird die Entwurfs-ID ungültig. Das einzige Profil heißt `demo-firm`.

`nextFollowUp` hat die Form `{nextAt: "2026-10-22", text: "…"}`; leer bedeutet
keine Wiedervorlage. Zulässige Segmente: `accounting`, `business`, `startup`,
`nonprofit`. `informalAddressApproved` muss explizit `true` oder `false` sein.
Ein Entwurf enthält `id`, `fields`, `source`, `missing`, `warnings`, `status`,
`profileId` und `createdAt`. Die Quelle hat `kind: "pdf"` oder `"online"`.

Fehler: `{error: {code, message, details?}}` mit passendem HTTP-Status. Keine
Stapelspuren oder Uploadinhalte werden an den Browser ausgegeben oder protokolliert.

## Tests

```sh
/Users/robin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -B -m unittest -v test_intake.py
```

Die Tests erzeugen synthetische Formulare im RAM und prüfen Import, Unicode,
Checkboxen, beide Formularsprachen, beschädigte und aktive PDFs, Entwurfswechsel,
Profilfreigabe sowie Host-, Origin- und Tokenprüfung. Für Tests werden keine
Kundendateien verwendet.

### Browser-Smoke-Test

Bei laufendem lokalem Server aus diesem Verzeichnis ausführen:

```sh
RV_PILOT_URL=http://127.0.0.1:8765/prototypes/member-pilot/ node tools/browser_smoke.cjs
```

Benötigt werden Node.js, Playwright, Chrome sowie Python mit `pypdf`. Playwright
wird mit `require('playwright')` geladen; bei zentraler Installation dessen
`node_modules` über `NODE_PATH` angeben. `RV_PILOT_PYTHON` setzt den Pythonpfad
(Standard `python3`), `RV_PILOT_CHROME` optional den Chrome-Pfad (sonst installierter
Chrome-Kanal). Die Server-URL kann alternativ als erstes Argument übergeben werden.
Nur `localhost` und `127.0.0.1` sind zugelassen.

Der Test erzeugt seine synthetische PDF selbst aus dem deutschen Downloadformular
in einem temporären Ordner. Er prüft Import, ausdrückliche Freigabe, Memberansicht,
DE/EN, spätere Online-Selbstauskunft und 28 Ansichten in Desktop-/Mobilbreite.
Er verändert das RAM-Demoprofil und hinterlässt einen Testentwurf; ein Neustart des
Servers setzt beides zurück. Es werden keine Nachrichten oder Einladungen versandt.

Screenshots und `result.json` liegen standardmäßig im gemeldeten temporären Ordner;
`RV_PILOT_ARTIFACTS` kann einen anderen Ausgabeordner festlegen. Die erzeugte
Test-PDF wird entfernt und der Browser auch bei einem Fehler geschlossen.
