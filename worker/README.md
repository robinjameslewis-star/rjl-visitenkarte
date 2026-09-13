# Worker: das Rotkehlchen antwortet

**Phase 2 – nach dem Go-live.** Vorbereitet, nicht eingebunden; die Seite enthält kein Chat-Fenster,
bis Robin das Profil (`profile.md`) freigegeben hat und die Seite online ist.

Cloudflare Worker als Proxy zwischen Website und Sprachmodell. Der Schlüssel bleibt im Worker,
die Seite ruft nur `POST /chat` auf.

## Einrichten (einmalig)

1. Cloudflare-Konto (kostenlos), Node.js installiert.
2. `cd worker && npx wrangler login && npx wrangler deploy` → URL der Form `https://rjl-rotkehlchen.<konto>.workers.dev`.
3. In `../index.html` eintragen: `data-chat-endpoint="https://rjl-rotkehlchen.<konto>.workers.dev/chat"`.
4. In `wrangler.toml` die eigene Domain in `ALLOWED_ORIGINS` eintragen.
5. `profile.md` prüfen – das ist der Text, aus dem das Rotkehlchen spricht.

## Anbieter wechseln

| Anbieter | `PROVIDER` | `MODEL` (Beispiel) | Secret |
|---|---|---|---|
| Workers AI (Start, Free-Kontingent) | `workers-ai` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | keins |
| Anthropic | `anthropic` | `claude-sonnet-5` | `npx wrangler secret put ANTHROPIC_API_KEY` |
| OpenAI | `openai` | `gpt-4.1-mini` | `npx wrangler secret put OPENAI_API_KEY` |

Danach `npx wrangler deploy`. Modellnamen vor dem Wechsel in der jeweiligen Dokumentation prüfen.

## Grenzen und Kosten

- Workers Free: 100.000 Anfragen/Tag. Workers AI Free: tägliches Kontingent („Neurons“); ein
  70B-Modell verbraucht davon mehr als ein 8B-Modell. Bei erschöpftem Kontingent antwortet der
  Worker mit dem Hinweis auf das Formular – es entstehen keine Kosten, solange kein Bezahlplan aktiv ist.
- `MAX_PER_IP_PER_HOUR` (weich, je Instanz) und `MAX_PER_DAY` (hart, braucht KV) deckeln den Verkehr.
  Mit Anthropic/OpenAI ist `MAX_PER_DAY` die Kostenbremse: 400 kurze Antworten am Tag sind bei
  Sonnet-Klasse Modellen wenige Euro im Monat; die Zahl bewusst wählen.
- Cloudflare AI Gateway (kostenlos) kann davor geschaltet werden: Protokoll, Cache, weitere Limits.

## Datenschutz

Besuchereingaben gehen an den Worker und von dort an das Modell. Workers AI trainiert nicht auf
Eingaben; bei Anthropic/OpenAI gelten deren API-Bedingungen (kein Training per Standard-API).
Im Impressum der Seite steht der Hinweis. Keine Speicherung im Worker außer dem Tageszähler.
