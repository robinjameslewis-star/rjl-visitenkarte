# Worker: Goch, das Rotkehlchen von Robin

Cloudflare Worker als Proxy zwischen Website und Sprachmodell – und als Draht zu Robin.
Der Schlüssel bleibt im Worker, die Seite ruft nur `POST /chat` auf. Was Goch weiß, steht in
`profile.md` (wer Robin ist, wie Goch spricht, was er nie tut) und `aktuell.md` (woran Robin
gerade arbeitet; alle vier bis sechs Wochen erneuern). Beide Dateien sind öffentlich und von
Robin freigegeben; Herleitung im Vault unter `10_Projects/Website Visitenkarte/`.

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
3. `npx wrangler deploy` → URL der Form `https://rjl-goch.<konto>.workers.dev`.
4. In `../index.html` am `<body>` eintragen: `data-chat-endpoint="https://rjl-goch.<konto>.workers.dev/chat"`.
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
