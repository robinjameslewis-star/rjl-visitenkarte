# Messegerät (Kiosk) – Einrichtung und Betrieb

Stand 23.10.2026, Entwurf. Hardware ist angefragt: Stele hochkant (43–55 Zoll), Linux-Mini-PC, Taster, Lautsprecher,
USB-Mikrofon-Array, Radarsensor für Anwesenheit. Keine Kamera, keine Mimik- oder Gefühlserkennung.

## Aufbau

```
Chromium (Kiosk, http://localhost:8080/kiosk.html)
   │  Seite, /kiosk/chat, /kiosk/listen, /kiosk/figur, /ereignisse
   ▼
lokaler Dienst  kiosk/dienst/goch_kiosk.py  (127.0.0.1:8080, Gerätenachweis nur hier)
   │  HTTPS mit „Authorization: Bearer <gerät>.<geheimnis>“, wahlweise Client-Zertifikat
   ▼
Worker goch.robin.vision  /kiosk/*  (Gerätebudget im Durable Object, Kundenfiguren aus dem KV)
   └─ Whisper (Workers AI) · Claude · ElevenLabs

Radar HLK-LD2410 (USB-Seriell) → Dienst → Ereignis „anwesend“ → Seite zwitschert
USB-Taster (sendet F13) → Seite
```

Die Seite ist derselbe Code wie die Website: `kiosk.html` mit `language.js` (Texte), `goch-audio.js` (Aufnahme als WAV,
Stimme, Pegel) und `figur.js` (Figurenpaket). Der Dienst liefert nur diese Dateien aus einem festen Commit aus.

## Ablauf am Gerät

1. **Ruhe:** Figur, Einladung „Knopf drücken oder Bildschirm berühren“, Beispielfragen.
2. **Hinweis:** Erster Druck zeigt den Hinweis (KI, künstliche Stimme, Verarbeitung, nichts gespeichert, Neustart nach
   einer Minute). **Zweiter Druck = Einwilligung.**
3. **Sprechen:** Knopf halten – sprechen – loslassen, oder tippen – sprechen – tippen; höchstens 20 s. Die Figur lauscht.
   Am Messestand bewusst mit Knopf (Umstehende, Lärm); die Website hört ohne Knopf zu (`goch-audio.js`, `zuhoeren`) – das
   ließe sich hier per Konfiguration nachrüsten.
4. **Antwort:** als Untertitel und mit Stimme; der Schnabel folgt der Lautstärke (Logo: pulsiert).
5. **Zurücksetzen:** 60 s ohne Aktivität → Gespräch und Einwilligung gelöscht, zurück zu 1. Nichts bleibt im Browser.
6. **Anwesenheit:** Steht jemand 1–3 m vor dem Gerät, zwitschert die Figur hörbar – mit Abklingzeit (30 s), nie in den
   Ruhezeiten, nie während eines Gesprächs. In Gesprächspausen zwitschert sie einmal leise nach 12–25 s
   (`zwitschern.pause_s`), in Ruhe und Pausen schaut sie ab und zu kurz zur Seite und blinzelt (Pose `blinzelnd`); beim
   Sprechen bewegt sie sich mit der Stimme (um die Füße gedreht, der Ast bleibt fest). Blickkontakt per Kamera gibt es am
   Gerät bewusst nicht (öffentlicher Raum, Umstehende) – nur auf der Website, mit eigener Einwilligung.
7. **Ohne Netz:** Hinweis „offline“, vorbereitete Antworten zum Antippen (mit Stimme, vorab erzeugt). Bestätigte
   Nachrichten an Robin puffert der Dienst und sendet sie, sobald das Netz zurück ist.

## Einrichten

1. **Rechner:** Debian 12 oder Ubuntu 24.04 LTS (minimal), automatische Sicherheitsupdates, Festplattenverschlüsselung
   (LUKS) – der Puffer kann Name und E-Mail-Adresse eines Besuchers enthalten.
2. **Pakete, Benutzer, Dienste:** `sudo sh kiosk/einrichten.sh <commit>` (Chromium, cage, Python, pyserial, PipeWire;
   Benutzer `goch` für den Dienst, `kiosk` für den Browser; systemd-Einheiten und Chromium-Richtlinien).
3. **Gerätenachweis:** Redaktion → „Messegeräte“ → „Neues Gerät“ (Kennung, Name, freigegebene Figuren, Tagesbudget).
   Der Nachweis erscheint **einmal**; ihn in `/etc/goch-kiosk/geraet.json` als `token` eintragen (Datei `chmod 600`,
   Besitzer `goch`). Nie in den Browser, nie in eine E-Mail. Verloren → „Neuen Nachweis erzeugen“.
4. **Konfiguration:** `/etc/goch-kiosk/konfiguration.json` (Vorlage `konfiguration.beispiel.json`): Figur, Sprache,
   Sprachwahl, Lautstärke, Zwitschern (an, Abklingzeit, Entfernung, Lautstärke), Ruhezeiten, Inaktivität, Taste, Radar-Port.
5. **Taster:** auf F13 programmieren (z. B. PCsensor-Fußschalter: `footswitch -k f13`); prüfen mit `evtest`.
6. **Radar HLK-LD2410:** USB-Seriell-Adapter, Port über `/dev/serial/by-id/…` eintragen, 256 000 Baud. Über dem Bildschirm
   montieren, zum Gang ausgerichtet; Bereich in `zwitschern.entfernung_m`. Ohne Radar weckt nur der Taster.
7. **Ton:** Mikrofon-Array und Lautsprecher als Standardquelle bzw. -ausgabe in PipeWire; die Echounterdrückung macht
   Chromium (`echoCancellation`).
8. **Hochformat:** am besten ein Panel, das nativ hochkant läuft. Sonst die Ausgabe drehen, z. B. mit `wlr-randr --output
   <Name> --transform 90` als `ExecStartPost` des Browser-Dienstes – am Gerät prüfen. Seite ausgelegt für 1080 × 1920 und
   2160 × 3840.
9. **Offline-Antworten:** nach dem ersten Start `sudo -u goch python3 /opt/goch-kiosk/seite/kiosk/dienst/offline_antworten.py
   kiosk/offline-fragen.beispiel.json /var/lib/goch-kiosk/offline/goch` (fragt die Figur über den Dienst, speichert Text und
   Stimme auf dem Gerät).
10. **Hinweisschild** aus `hinweisschild.md` drucken und neben den Bildschirm stellen.

## Kundenfigur

- Paket nach `FIGUREN.md` bauen und auf dem Mac prüfen: `node tools/figur-pruefen.mjs <ordner>` (Freigabe des Kunden in
  `RECHTE.md`). Danach nur auf das Gerät kopieren: `/var/lib/goch-kiosk/figuren/<kunde-…>/`. **Nie ins Repository.**
- Redaktion → „Figuren für Vorführungen“: Name, Rolle, Begrüßung, Einstiegsfragen, Persönlichkeit, Wissen (nur Freigegebenes
  oder Öffentliches, Quellen mit Datum), Voice ID, Tagesgrenze.
- Redaktion → „Messegeräte“: Figur für das Gerät freigeben; in `konfiguration.json` `"figur": "kunde-…"` setzen, Dienst neu
  starten. Über die öffentliche Route `/chat` ist eine Kundenfigur nie erreichbar.

## Betrieb

- **Aktualisieren:** `git -C /opt/goch-kiosk/seite fetch && git -C /opt/goch-kiosk/seite checkout <commit>`, dann
  `systemctl restart goch-kiosk goch-kiosk-browser`.
- **Zustand:** Redaktion → „Messegeräte“ (Lebenszeichen alle fünf Minuten, Stand, Puffer, Antworten und Minuten heute).
  Am Gerät: `journalctl -u goch-kiosk` – ohne Gesprächsinhalte.
- **Neustarts:** systemd startet den Dienst neu, wenn er abstürzt oder sich 60 s nicht meldet; der Wächter
  (`goch-kiosk-waechter.timer`) startet Chromium neu, wenn die Seite zwei Minuten kein Lebenszeichen schickt.
- **Client-Zertifikat (optional):** Cloudflare-Dashboard → SSL/TLS → Client-Zertifikate → je Gerät eins erzeugen; mTLS
  für `goch.robin.vision` einschalten und eine Regel für `/kiosk/*`; im Worker `KIOSK_MTLS = "an"`; Zertifikat und
  Schlüssel in `geraet.json` (`zertifikat`, `schluessel`), Fingerabdruck in der Redaktion beim Gerät.

## Datenschutz am Gerät

- Einwilligung: Bildschirmhinweis und Schild; ein Gespräch beginnt nur per Taster oder Touch und erst nach zweitem Druck.
  Zurücksetzen nach 60 s; das Browserprofil wird bei jedem Start gelöscht, die Richtlinien verbieten Verlauf, Passwörter,
  Autofill und Cookies über die Sitzung hinaus.
- Mikrofon nur während der Aufnahme offen (`AudioCaptureAllowedUrls` nur für `http://localhost:8080`); Kamera gesperrt
  (`VideoCaptureAllowed: false`) und nicht angeschlossen. Radar meldet nur „jemand in 1–3 m“ – keine Bilder, keine Kennung.
- Puffer nur für bestätigte Nachrichten an Robin ohne Netz: Datei `puffer.jsonl`, `chmod 600`, höchstens 14 Tage, gelöscht
  nach dem Senden. Zwischenspeicher der Figurentexte ohne Personenbezug.

## Prüfen ohne Hardware

```sh
node tests/kiosk_worker_test.mjs                                   # Kiosk-Route, Gerätebudget, Kundenfiguren (Attrappen)
python3 tests/kiosk_dienst_test.py                                 # lokaler Dienst: Weiterleitung, Nachweis, Puffer, Radar
python3 tests/kiosk_test.py                                        # Seite im Hochformat gegen Dienst und Worker-Attrappe
```

Vorführung am Mac mit echter Spracherkennung: Attrappe mit `--whisper <Modellordner> --stimme mac` starten (siehe
`tests/goch_fake_worker.py`; `--stimme mac` spricht mit einer macOS-Stimme als Platzhalter, `--stimme elevenlabs` mit der
echten Stimme), Dienst mit `--test` und `"taste": "Space"` in der Konfiguration – die Leertaste ersetzt den Taster.

## Offen

- Hardware: Modell von Taster, Radar, Mikrofon-Array und Panel; Drehung des Bildschirms am Gerät prüfen.
- Messetermin, Kunde und Kaufhypothese (Arbeitsregel 2) – Robin.
- Vor dem ersten Einsatz: Datenschutztexte und Hinweisschild freigeben (Robin), AV-Vertrag mit ElevenLabs.
