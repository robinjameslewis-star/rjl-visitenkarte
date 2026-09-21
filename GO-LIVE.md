# Go-live – nur das, was zum Veröffentlichen nötig ist

**Online seit 14.09.2026:** https://robinjameslewis-star.github.io/rjl-visitenkarte/ – **seit 21.09.2026 unter https://robin.vision/**
(Domain bei Cloudflare Registrar; DNS only: A/AAAA der Wurzel auf GitHub Pages, `www` CNAME auf `robinjameslewis-star.github.io`,
GitHub „Custom domain“ = `robin.vision` mit erzwungenem HTTPS, Datei `CNAME` im Repository; `www` leitet auf die Wurzel um,
die alte Adresse leitet mit 301 um. Goch unter `goch.robin.vision` als Workers Custom Domain, siehe `worker/wrangler.toml`.)
Am 14.09.2026 kurz auf die Wartungsseite (Branch `wartung`) geschaltet, bis Einwilligung und
lokale Schriften fertig waren; seitdem wieder `main`.

Stand 14.09.2026. Reihenfolge einhalten; nichts Neues bauen, bevor Punkt 7 erledigt ist.
Fertige Punkte hier abhaken.

| # | Schritt | Wer | Dauer | Erledigt |
|---|---|---|---|---|
| 1 | **Cal.com-Konto** anlegen (Free), Benutzername merken | Robin | 5 min | ☑ 13.09. |
| 2 | **Google-Kalender verbinden** und als Zielkalender setzen, App „Google Meet“ installieren; **Apple Kalender verbinden** (app-spezifisches Passwort) nur zur Konfliktprüfung; Google-Konto in der Kalender-App des Macs/iPhones hinzufügen | Robin | 15 min | ☑ 13.09. |
| 3 | **Verfügbarkeit** und **Ereignistyp** „Terminvorschlag“ (Bestätigung erforderlich, 30 Min/1 h/2 Std, vier Orte) | Robin | 15 min | ☑ 13.09. |
| 4 | Buchungslinks in `index.html` (`data-booking-link`, `-en`) | Robin oder Claude | 1 min | ☑ 13.09. |
| 5 | **Domain** – Start ohne eigene Domain unter der GitHub-Adresse; eigene Domain später (Settings → Pages → Custom domain, CNAME beim Anbieter) | Robin | 10 min | ☑ vorerst |
| 6 | **Hosting: GitHub Pages** – Repository `robinjameslewis-star/rjl-visitenkarte`, Pages von `main`, HTTPS | Robin + Claude | 15 min | ☑ 14.09. |
| 7 | **Abnahme** auf iPhone (Safari), Mac (Safari, Chrome): Animation, Kalender inkl. Testbuchung, Nachricht öffnet Mailprogramm, Sprachwechsel, Impressum-Klappe | Robin | 10 min | ☑ 14.09. (Mac: Testbuchung, Testmail mit Signatur) |
| 8 | **Einwilligung** für Cal.com (Banner, Widerruf, Datenschutztext DE/EN) und **Schriften lokal** statt Google Fonts; Prüfung mit `tests/consent_test.py` lokal und live | Robin (ChatGPT) + Claude | – | ☑ 14.09. |

Danach ist die Seite online. Alles Weitere ist Phase 2.

## Veröffentlichen von Änderungen

    cd ~/Developer/rjl-visitenkarte && git add -A && git commit -m "…" && git push

GitHub Pages baut in ein bis zwei Minuten neu. Bei Skriptänderungen den `?v=`-Parameter in
`index.html` hochzählen, sonst sehen wiederkehrende Besucher alte Skripte. Ändert sich der
Einwilligungstext, zusätzlich `version` in `site.js` hochzählen (alle entscheiden neu).

## Wartungsseite ein- und ausschalten

Der Branch `wartung` zeigt nur Name, Vogel und Impressum – ohne Skripte, ohne Cal.com, ohne
Google Fonts. `assets/` bleibt erreichbar, damit das Signaturbild in E-Mails weiter erscheint.
Pages nicht abschalten (dann fehlt das Signaturbild in allen Mails), sondern die Quelle umstellen:

    # offline (Wartungsseite)
    gh api -X PUT repos/robinjameslewis-star/rjl-visitenkarte/pages -f 'source[branch]=wartung' -f 'source[path]=/'

    # wieder online (main)
    gh api -X PUT repos/robinjameslewis-star/rjl-visitenkarte/pages -f 'source[branch]=main' -f 'source[path]=/'

Danach baut Pages in ein bis zwei Minuten; falls nicht: `gh api -X POST repos/robinjameslewis-star/rjl-visitenkarte/pages/builds`.

## Wenn Robin zurückkommt (Übergabe)

Robin arbeitet in ChatGPT an den Flugposen und richtet Cal.com ein. Für die Fortsetzung braucht Claude:

1. **Cal.com-Benutzername** und Name des Ereignistyps (Vorschlag `gespraech`) → Schritt 4.
2. **Flugposen** als Dateien in `Second Brain/90_Meta/Design/Entwuerfe/13_Flugpose_1…4.png`
   (oder im Chat einfügen) → Freistellen, Skala prüfen, Bildfolge einbauen. Das ist Phase 2 und
   darf den Go-live nicht aufhalten: Wenn die Posen noch nicht stimmen, geht die Seite mit dem
   Gleitflug online.
3. Einmal `gh auth login` → Schritt 6.

## Bewusst nicht vor dem Go-live

- Flugposen (Robin erzeugt sie in ChatGPT; Einbau danach)
- LLM-Fenster („Rotkehlchen antwortet“) – Worker liegt vorbereitet in `worker/`, ist nicht eingebunden
- ~~Formular-Endpunkt~~ – Formular am 14.09.2026 entfernt; Kontakt über Termin oder E-Mail im Impressum
- Weitere Animationen, Analytics (Mehrsprachigkeit und Einwilligung sind inzwischen drin)
- Eigene Artikel (Blog): Markdown → Seiten im Papier-Design; GitHub Pages trägt das ohne Umzug – **vorher ladungsfähige Anschrift ins Impressum** (§ 18 Abs. 2 MStV); derzeit steht dort bewusst nur der Ort

## Was Claude vorbereitet hat

- Seite, Assets, README mit Cal.com-Anleitung
- Hosting-Hinweise unten; auf Zuruf: GitHub-Repository und Pages einrichten (dafür einmal `gh auth login` auf diesem Mac)

## Hosting in Kürze

**GitHub Pages:** neues öffentliches Repository `rjl-visitenkarte` → Inhalt dieses Ordners pushen →
Settings → Pages → Branch `main`, Ordner `/` → Adresse `https://<name>.github.io/rjl-visitenkarte/`;
eigene Domain unter „Custom domain“ eintragen, beim Domain-Anbieter CNAME auf `<name>.github.io`.

**Netlify Drop:** app.netlify.com/drop → Ordner (ohne `.git`, ohne `worker/`) hineinziehen → sofort
online unter `*.netlify.app`; Domain später unter „Domain management“.
