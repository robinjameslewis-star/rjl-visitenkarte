# Go-live – nur das, was zum Veröffentlichen nötig ist

Stand 13.09.2026. Reihenfolge einhalten; nichts Neues bauen, bevor Punkt 7 erledigt ist.
Fertige Punkte hier abhaken.

| # | Schritt | Wer | Dauer | Erledigt |
|---|---|---|---|---|
| 1 | **Cal.com-Konto** anlegen (Free), Benutzername merken | Robin | 5 min | ☐ |
| 2 | **Apple Kalender verbinden** (app-spezifisches Passwort von appleid.apple.com), Konfliktkalender und Zielkalender wählen | Robin | 10 min | ☐ |
| 3 | **Verfügbarkeit** (Wochenplan + Datumsausnahmen) und **Ereignistyp** `gespraech`, 30 min, Orte: FaceTime-Link (in FaceTime „Link erstellen“), Telefon, vor Ort; Sprache Deutsch, Wochenstart Montag | Robin | 15 min | ☐ |
| 4 | `data-cal-link="BENUTZERNAME/gespraech"` in `index.html` eintragen | Robin oder Claude | 1 min | ☐ |
| 5 | **Domain** entscheiden (z. B. robinjameslewis.de) und registrieren – oder ohne Domain unter der Hosting-Adresse starten | Robin | 10 min | ☐ |
| 6 | **Hosting**: GitHub Pages (Repository anlegen, Ordner hochladen, Pages aktivieren) oder Netlify Drop (Ordner ins Fenster ziehen). Beides kostenlos, HTTPS inklusive | Robin (Claude bereitet vor) | 15 min | ☐ |
| 7 | **Abnahme** auf iPhone (Safari), Mac (Safari, Chrome): Animation, Kalender lädt, Nachricht öffnet Mailprogramm, Impressum-Klappe | Robin | 10 min | ☐ |

Danach ist die Seite online. Alles Weitere ist Phase 2.

## Bewusst nicht vor dem Go-live

- Flugposen (Robin erzeugt sie in ChatGPT; Einbau danach)
- LLM-Fenster („Rotkehlchen antwortet“) – Worker liegt vorbereitet in `worker/`, ist nicht eingebunden
- Formular-Endpunkt statt `mailto:` – erst, wenn `mailto:` im Alltag stört
- Weitere Animationen, Mehrsprachigkeit, Analytics
- Eigene Artikel (Blog): Markdown → Seiten im Papier-Design; GitHub Pages trägt das ohne Umzug

## Was Claude vorbereitet hat

- Seite, Assets, README mit Cal.com-Anleitung
- Hosting-Hinweise unten; auf Zuruf: GitHub-Repository und Pages einrichten (dafür einmal `gh auth login` auf diesem Mac)

## Hosting in Kürze

**GitHub Pages:** neues öffentliches Repository `rjl-visitenkarte` → Inhalt dieses Ordners pushen →
Settings → Pages → Branch `main`, Ordner `/` → Adresse `https://<name>.github.io/rjl-visitenkarte/`;
eigene Domain unter „Custom domain“ eintragen, beim Domain-Anbieter CNAME auf `<name>.github.io`.

**Netlify Drop:** app.netlify.com/drop → Ordner (ohne `.git`, ohne `worker/`) hineinziehen → sofort
online unter `*.netlify.app`; Domain später unter „Domain management“.
