# Worker: Goch, das Rotkehlchen von Robin

Cloudflare Worker als Proxy zwischen Website und Sprachmodell – und als Draht zu Robin.
Der Schlüssel bleibt im Worker, die Seite ruft nur `POST /chat` auf. Was Goch weiß, steht in
`profile.md` (wer Robin ist, wie Goch spricht, was er nie tut) und `aktuell.md` (woran Robin
gerade arbeitet; alle vier bis sechs Wochen erneuern). Beide Dateien sind öffentlich, von
Robin freigegeben und in der Redaktion (`/admin`) pflegbar; Herleitung im Vault unter `10_Projects/Website Visitenkarte/`.

## Schnittstelle

```
POST /chat   { "lang": "de"|"en", "messages": [{ "role": "user"|"assistant", "content": "…" }, …] }
→            { "reply": "…", "action": null|"calendar"|"contact"|"message", "sent": true|false }
GET  /       → "Goch" (Lebenszeichen)
```

`action: "message"` heißt: Der Besucher hat bestätigt, dass Goch Robin etwas ausrichten soll.
Der Worker prüft Name, E-Mail-Form und Text, begrenzt auf `MAX_MESSAGES_PER_IP_PER_DAY` und
sendet per Resend an `MAIL_TO`; Antwort-an ist die Besucheradresse. Nichts wird gespeichert.

## Einrichten (einmalig)

1. Cloudflare-Konto (kostenlos) und Node.js. Resend-Konto (kostenlos, 100 Mails/Tag).
2. `cd worker && npx wrangler login && npx wrangler secret put RESEND_API_KEY`
3. `npx wrangler deploy` → erreichbar unter `https://goch.robin.vision` (Custom Domain aus `wrangler.toml`) und `https://rjl-goch.<konto>.workers.dev`.
4. In `../index.html` am `<body>` eintragen: `data-chat-endpoint="https://goch.robin.vision/chat"`.
   Solange das Attribut leer ist, öffnet ein Klick auf den Vogel kein Gespräch, sondern
   wiederholt den Anflug; die Seite bleibt wie vor Goch.
5. `ALLOWED_ORIGINS` in `wrangler.toml` prüfen (GitHub-Pages-Adresse; später eigene Domain).

Lokal testen: `npx wrangler dev` (Port 8787), Seite mit `python3 -m http.server 8788` und
`http://localhost:8788/?goch=http://localhost:8787/chat` öffnen. Der Parameter `goch` gilt nur
für den eigenen Browser und überschreibt das Attribut.

## Modell

Seit 17.09.2026: **Claude Opus 5 über die Anthropic-API** (Robins Entscheidung), mit dem
offiziellen SDK (`@anthropic-ai/sdk`, `npm install` im Ordner `worker/`):

- Prompt-Caching: das Profil (rund 5.500 Token) wird zwischengespeichert, ab der zweiten Frage
  eines Gesprächs kostet es ein Zehntel.
- Festes Antwortschema (`output_config.format`): das Modell kann nur `{reply, action, message}`
  liefern – kein kaputtes JSON.
- Denkstufe `effort: "low"`: kurze Gesprächsantworten, wenig Denk-Token.
- Rückfall bei Ablehnung (`fallbacks: "default"`): antwortet in seltenen Fällen ein Schwestermodell.

Gemessen (17.09.2026): das Profil sind rund 9.500 Token; ab der zweiten Frage kommen sie aus
dem Zwischenspeicher. Ein Besucher mit 6 Fragen kostet bei Opus rund 9–10 ct (der erste Aufruf
schreibt den Zwischenspeicher, allein 5,5 ct), bei Sonnet 5 rund 4 ct. 20 Besucher im Monat:
≈ 22–25 € im Jahr (Opus), ≈ 10 € (Sonnet 5: `MODEL = "claude-sonnet-5"`). Deckel: `MAX_TURNS`
Fragen je Gespräch, danach führt der Worker ohne Modell zum Draht; `MAX_PER_IP_PER_HOUR` (12);
`MAX_PER_DAY` (60, Zähler in KV `USAGE`). Erreicht ein Deckel, oder antwortet das Modell nicht
(Störung, Guthaben leer), erfährt der Besucher nichts davon: Goch leitet in den gewohnten Draht
über. Bei leerem Guthaben bekommt Robin einmal eine Mail (Merker in KV, 30 Tage; zurückgesetzt,
sobald wieder eine Antwort gelingt). Guthaben ist Vorauszahlung ohne Nachbuchung, solange in der
Anthropic-Konsole kein Auto-Reload aktiv ist.

| Anbieter | `PROVIDER` | `MODEL` | Secret |
|---|---|---|---|
| Anthropic | `anthropic` | `claude-opus-5` / `claude-sonnet-5` | `npx wrangler secret put ANTHROPIC_API_KEY` |
| Workers AI (Notweg, kostenlos, 10.000 Neuronen/Tag ≈ 40 Antworten) | `workers-ai` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | keins |

Danach `npx wrangler deploy`. Beim Anbieterwechsel den Datenschutzabsatz auf der Seite anpassen.

## Was der Worker selbst entscheidet (nicht das Modell)

Das Modell sammelt nur; das Protokoll gehört dem Worker: Er ergänzt Name und E-Mail notfalls
aus dem Verlauf, schreibt die Zusammenfassung („… Soll ich das so senden?“), versteht darauf
Ja / Nein / „ohne Gespräch“ selbst, sendet nur nach Ja, und führt nach `MAX_TURNS` Fragen ohne
Modell zum Draht. Abgeschnittene oder wiederholte Modellantworten werden gerettet und gekürzt.

## Grenzen und Kosten

- Workers Free: 100.000 Anfragen/Tag. Workers AI Free: 10.000 Neuronen am Tag – mit dem
  70B-Modell nur rund 40 Antworten; bei erschöpftem Kontingent antwortet Goch mit dem Hinweis
  auf die E-Mail. Deshalb läuft das Modell bei Anthropic.
- `MAX_PER_IP_PER_HOUR` (weich, je Instanz) und `MAX_PER_DAY` (hart, braucht KV) deckeln den
  Verkehr; `MAX_MESSAGES_PER_IP_PER_DAY` die Nachrichten an Robin. Mit Anthropic/OpenAI ist
  `MAX_PER_DAY` die Kostenbremse: 400 kurze Antworten am Tag sind bei Sonnet-Klasse Modellen
  wenige Euro im Monat.
- Resend Free: 100 Mails/Tag, Absender `onboarding@resend.dev`. Mit eigener Domain: Domain bei
  Resend verifizieren und `MAIL_FROM` ändern – oder auf Cloudflare Email Routing wechseln.

## Datenschutz

Besuchereingaben gehen an den Worker und von dort an das Modell; eine bestätigte Nachricht
zusätzlich an Resend und per E-Mail an Robin. Workers AI trainiert nicht auf Eingaben; bei
Anthropic/OpenAI gelten deren API-Bedingungen (kein Training per Standard-API). Keine
Speicherung im Worker außer dem Tageszähler. Die Seite fragt vor dem ersten Wort um
Einwilligung; der Datenschutztext im Impressum beschreibt die Beteiligten.

## Durchsicht (monatlich)

`sh fragen.sh` (im Ordner `worker/`) listet die Fragen, die Goch in den letzten 30 Tagen nicht
beantworten konnte – ohne Personenbezug, mit Häufigkeit. Zusammen mit `profile.md` und
`aktuell.md` ist das die Grundlage der Durchsicht: Robin entscheidet, was ein Satz im Profil
wird; das Profil bleibt bei rund 9.000 Token (neuer Satz verdrängt einen schwächeren).

## Links (`links.md`)

Tabelle „Kennung | Wann | Text DE | Text EN | Adresse“. Der Worker hängt „Kennung – Wann“ ans Profil
und lässt im Antwortfeld `link` nur Kennungen aus der Tabelle zu; die Adresse setzt er selbst ein
(`{ label, url }`), die Seite zeigt den Link unter der Antwort in neuem Tab. Jeder Link höchstens
einmal je Gespräch: Die Seite merkt sich „(Link: Text)“ im Verlauf, der Worker prüft darauf.
Zeilen ohne https-Adresse gelten nicht. Nach Änderung: `npm run deploy`.

## Redaktion (`/admin`)

`https://goch.robin.vision/admin` (alt und weiter gültig: `https://rjl-goch.rjl.workers.dev/admin`) – Anmeldung mit **Passkey** (Face ID / Touch ID,
WebAuthn in `src/passkey.js`, Sitzung zwölf Stunden als Cookie). Solange kein Passkey eingerichtet ist,
gilt als Erstzugang ein Einmal-Code per E-Mail an `MAIL_TO` (Resend, zehn Minuten); sobald ein Passkey
existiert, ist der Code-Weg abgeschaltet. Passkeys gelten **je Adresse** (rpId): Jeder Passkey merkt sich seit 21.09.2026 seine
Adresse, ältere gehören zu `rjl-goch.rjl.workers.dev`; unter `goch.robin.vision` gilt deshalb zunächst wieder der E-Mail-Code, bis dort
ein Passkey eingerichtet ist. Passkeys verwaltet der Abschnitt „Sicherheit“ (Index
`admin:passkeys`, Einträge `admin:passkey:<id>` im KV). **Notausgang** ohne Geräte, im Ordner `worker/`:

    npx wrangler kv key delete --binding USAGE --remote admin:passkeys

Danach gilt wieder der E-Mail-Code; die alten Passkeys sind verwaist und werden beim nächsten
Einrichten nicht mehr angeboten. Passkeys hängen an der Adresse (rpId) – bei einem Umzug auf eine
eigene Domain neu einrichten. Backend der Website („Redaktion“). Robin pflegt dort „Woran Robin
gerade arbeitet“ (Deutsch/Englisch, Stand) und die Links, sieht Antworten je Tag, die
unbeantworteten Fragen (Häkchen = erledigt) und den Guthaben-Alarm.

**Speicher ist das Repository.** Jede Veröffentlichung ist ein Commit auf `main`
(`worker/aktuell.md`, `worker/links.md`), „Vorige Fassung“ schreibt den Stand des vorletzten
Commits als neuen Commit, „Verlauf“ öffnet die Historie auf GitHub. Der Worker hält im KV eine
Kopie (`content:aktuell`, `content:links`) und gleicht sie alle fünf Minuten mit der Rohfassung auf
GitHub ab – Änderungen außerhalb des Dashboards kommen so auch an; nach dem Dashboard sofort.
Nötig: Geheimnis `GITHUB_TOKEN` (fein abgestuft, nur dieses Repository, Contents: Read and write;
läuft nach höchstens einem Jahr ab – dann erneuern) und die Variablen `GITHUB_REPO`, `GITHUB_BRANCH`.
Ohne Schlüssel liest das Dashboard, schreibt aber nicht.

Weitere Inhaltsarten (Blogbeiträge, Textstellen der Seite) kommen als Eintrag in `CONTENT`
(`src/admin.js`) dazu: Pfad im Repository, Zerlegen in Felder, Zusammenbauen mit Prüfung. GitHub-Zugriff: `src/github.js`.

**E-Mail seit 21.09.2026:** Goch schreibt von `goch@robin.vision` (Resend-Domain verifiziert: DKIM `resend._domainkey`, SPF-CNAMEs `send`/`rsend`, DMARC `p=none`); Post an `robin@robin.vision` leitet Cloudflare Email Routing an Robins Gmail weiter (MX/SPF-Einträge gesperrt verwaltet, Catch-all aus).

**Gochs Profil in der Redaktion (seit 21.09.2026).** `profile.md` ist der dritte Eintrag in `CONTENT`: Abschnitt
„Goch – Profil“ mit dem ganzen Text, Wortzahl (≈ Tokens), Veröffentlichen (Commit auf `worker/profile.md` + KV-Kopie
`content:profile`), „Vorige Fassung“, „Verlauf“. Der Worker nimmt das Profil wie Aktuell und Links aus dem KV
(Abgleich mit GitHub alle fünf Minuten); die mitgelieferte Datei ist nur noch Rückfall – auch dann, wenn die
KV-Kopie leer oder kürzer als 500 Zeichen wäre (ein kaputtes Profil darf Goch nicht stumm machen). Prüfung beim
Speichern: mindestens 300 Wörter, höchstens 60.000 Zeichen, „Goch“ muss vorkommen, keine Telefon- oder
Kontonummern (die E-Mail-Adresse steht drin, Goch nennt sie auf Frage). Robins Regel bleibt: Alles im Profil darf
öffentlich sein – keine Namen aus der Familie, keine Adresse, nichts zu Finanzen, Gesundheit, Mandanten.
Die Links stehen im Prompt jetzt mit Titel (`- song2 („Steve Miller Band – Fly Like An Eagle“): NUR wenn …`),
damit Goch etwa sein Lieblingslied beim Namen nennen kann; das Profil verweist dafür auf die Links.

**Landschaften** (`site`- und `landschaften`-API in `src/admin.js`, Logik in `src/landscapes.js`): Schalter, Wahl
des Satzes, Bestand, Editor. „Veröffentlichen“ = Commit auf `index.html`: `applyLandscape(html, wish, satz)` setzt
`data-landschaft="an|aus"` und `data-landschaft-satz="<satz>"` am `<body>` **und** die Bildpfade von Vogel und Ast in
einem Zug – `assets/bestand/` (ohne Landschaft: kurzer Ast 1153 px, Vogel auf Weiß) oder `assets/` (mit Landschaft:
langer Ast 2800 px, freigestellter Vogel) – in der Szene und in den `<link rel="preload">` des `<head>`, dazu die
Astbreite. So steht vom ersten Bild an das Richtige in der Seite; `landscape.js` tauscht nur noch für die
Vorschau-Links (`?landschaft=an|aus|<satz>`) zur Laufzeit.
Bestand: `GET landschaften` listet die Ordner unter `assets/landschaften/` mit ihrer `landschaft.json`
(`normalizeSet` aus `landscape.js`, das der Worker importiert – eine Fassung für Seite und Redaktion) und liefert
Standardwerte, Größen und Budgets mit. `PUT landschaften/satz` legt einen Satz an oder ändert Name, Blätterart,
Himmelsfarben (Ordnername aus dem Namen, `neu: true` verhindert Überschreiben). `POST landschaften/ebene` nimmt
zwei fertige WebP (Base64; geprüft: RIFF/WEBP-Kennung, Budget Ferne 150 KB, Krone 120 KB) und schreibt sie mit der
Beschreibung in einem Commit; ein früheres AVIF derselben Ebene wird dabei gelöscht. `DELETE landschaften/ebene`
und `DELETE landschaften/satz` (nie der aktive) räumen auf – der Verlauf auf GitHub behält alles.
Die Aufbereitung geschieht im Browser der Redaktion (`prepareLayer` im Seitenskript: Weiß → Transparenz mit
a = 1 − min(R,G,B)/255, Beschnitt wie im Python-Werkzeug, zwei Größen, Ferne mit weichem Rand, WebP mit sinkender
Qualität bis unters Budget); die Vorschau ist die echte Startseite im Rahmen (`frame-src` erlaubt `SITE_URL`;
Schreibtisch = 1280 px skaliert, Handy = 390 px), der die ungespeicherten Bilder, Blätterart und Himmelsfarben per
`postMessage` bekommt. Prüfung ohne Worker: `node tests/site_test.mjs` (Schalter, Satz, Rundreise) und
`python3 tests/admin_test.py` (Abschnitt 9: Aufbereitung mit Test-PNGs, Vorschau per Nachricht, Speichern).

**Betrieb (Goch – Betrieb in der Redaktion, `src/settings.js`):** an/aus, Anbieter, Modell, Prompt-Cache,
zweiter Anbieter über eine OpenAI-kompatible Schnittstelle – im KV (`settings:goch`), gilt ohne Deploy
ab der nächsten Frage (je Instanz eine Minute gemerkt). „Aus“ schaltet den Worker (503) und entfernt per
Commit den Endpunkt aus `index.html` (Vogel fliegt wieder statt zu sprechen); „An“ trägt `CHAT_ENDPOINT`
wieder ein. Anzeige „verbunden“ = letzte erfolgreiche Antwort (`status:goch`: Modell, Zeit, Tokens).
Testfrage: `POST /admin/api/goch/test` ruft das Modell mit dem echten Kontext, ohne Tageszähler.
Der Schlüssel des zweiten Anbieters liegt im KV; das Geheimnis `CUSTOM_API_KEY` hat Vorrang.
Die Werte in `wrangler.toml` (`PROVIDER`, `MODEL`) sind nur noch der Ausgangspunkt.

**Blog:** `src/blog.js` – Einstellungen und Beiträge lesen/prüfen, Markdown-Teilmenge rendern, Liste,
Beitragsseiten, RSS und Startseitenverweis bauen; `rebuild()` in `src/admin.js` schreibt Quelle und
erzeugte Seiten als einen Commit (`commitFiles`, Git-Data-API). Vorschau über `/admin/api/blog/preview`.
Der Editor im Dashboard (Skript in `PAGE`, Abschnitt „Editor: Werkzeuge“) schreibt Markdown über
`replaceRange()` mit `execCommand('insertText')`, damit ⌘Z funktioniert; Blöcke (Überschrift, Listen,
Zitat, Karte, Video, Bild) bekommen automatisch Leerzeilen um sich, weil der Renderer Absätze an
Leerzeilen trennt. Die YouTube-Prüfung im Browser ist dieselbe Regel wie `YT` in `blog.js`.
Lokale Sicherung: `localStorage` unter `redaktion:entwurf:<slug|neu>`, gelöscht nach Speichern/Löschen.
Live-Vorschau: Die Seitenhülle (Design, CSS) kommt einmal je Öffnen vom Worker (`/admin/api/blog/preview`
mit leerem Text); danach zeichnet der Browser nur den `<article>` neu – mit `makeRenderer()` aus `blog.js`,
dessen Quelltext per `${blog.makeRenderer.toString()}` in `PAGE` steht. Die Fabrik darf deshalb nichts
von außerhalb verwenden (esc, inline, renderMarkdown, YT, dateText liegen alle darin). Eigenes Fenster:
`window.open` + `document.write(hülle)`, gleiches Neuzeichnen; ein Intervall merkt das Schließen.
CSP `frame-src` erlaubt `youtube-nocookie.com`, damit „Video laden“ auch in der Vorschau geht.
Teilen: LinkedIn öffnet nur ein Fenster (kein API). Instagram: Karte per Canvas im Browser (`drawCard` im Seitenskript,
Maße 1080² für Instagram, 1200×630 als Vorschaubild); `POST /admin/api/blog/image` mit `card: <slug>` legt sie als
`blog/bilder/karte-<slug>.jpg` ab, ersetzt eine vorhandene und baut die Seiten im selben Commit neu (`rebuild(..., extraImages)`),
damit `shareImage()` in `blog.js` sie als `og:image` einsetzt, solange der Beitrag kein eigenes Bild hat.
**Vor jedem Deploy `node tests/bundle_check.mjs`** – prüft das gebündelte Paket, nicht den Quelltext:
esbuild schleust mit `keep_names` (Wrangler-Standard) `__name(...)`-Aufrufe in Funktionen ein; im
Browser fehlte dieser Helfer, das Seitenskript brach ab und das Dashboard war leer (19.09.2026).
Darum `keep_names = false` in `wrangler.toml`, ein Schutz im Seitenskript und diese Prüfung.
`PAGE` ist exportiert, damit `tests/admin_fake.mjs` die Seite ohne Anmeldung ausliefern kann.
Achtung bei Änderungen am Seitenskript: Es steht in einem Template-Literal – `\n` und Regex-Escapes
müssen dort doppelt (`\\n`) geschrieben werden; die Syntaxprüfung der eingebetteten Skripte
(`new Function`) vor dem Deploy fängt das ab.

**Lokal arbeiten:** Vor Änderungen an `worker/aktuell.md` oder `worker/links.md` erst `git pull`,
weil das Dashboard direkt auf `main` schreibt.
