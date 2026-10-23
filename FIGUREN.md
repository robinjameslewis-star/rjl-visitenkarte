# Figuren – neue Figur anlegen (Stand 23.10.2026)

Goch ist die erste Figur. Weitere Maskottchen oder Logos für Vorführungen bei Kunden kommen als **Figurenpaket**
dazu, ohne Codeänderung: ein Ordner mit `figur.json`, Bildern, Tönen und `RECHTE.md`. Auf der Website gibt es nur
Goch; das Messegerät (Kiosk) lädt die Figur, die in seiner Gerätekonfiguration steht.

## Paket

```
figuren/<id>/
  figur.json      Name, Rolle, Sprachen, Texte, Wissen, Animation, Signalton, Stimme, Farben, Kiosk
  bilder/         Posen (WebP oder PNG); Unterordner je Fassung möglich, z. B. bilder/bestand/
  toene/          Signalton: Ogg/Opus und MP3
  RECHTE.md       Herkunft, Werkzeug, Lizenz je Datei; bei Kundenfiguren die Freigabe des Kunden
```

`<id>`: a–z, 0–9 und Bindestrich, höchstens 40 Zeichen, gleich dem Ordnernamen. Kundenfiguren beginnen mit
`kunde-`. Vorbild ist `figuren/goch/`.

**Kundenfiguren kommen nie ins Repository.** Bilder und Töne liegen nur auf dem Gerät
(`/var/lib/goch-kiosk/figuren/<id>/`). Wissen, Persönlichkeit und `voiceId` pflegt Robin in der Redaktion (KV).
Abrufbar sind sie nur über die authentifizierte Kiosk-Route, nie über `/chat`. `.gitignore` sperrt alles unter
`figuren/` außer `goch/`; `tools/figur-pruefen.mjs` meldet eine versionierte Kundenfigur als Fehler.

## figur.json

| Feld | Inhalt |
|---|---|
| `format` | immer `1` |
| `id`, `name`, `rolle` | Kennung; Name und Rolle je Sprache (`{"de": …, "en": …}`) |
| `sprachen` | `["de"]`, `["en"]` oder `["de", "en"]` |
| `oeffentlich` | `true` nur für Figuren im Repository (Goch); Kundenfiguren `false` |
| `texte` | `{"quelle": "language.js", "schluessel": {…}}` (nur Goch) oder `{"quelle": "figur", "begruessung": {de, en}, "einstiegsfragen": {de: […], en: […]}}` mit ein bis vier Fragen |
| `wissen` | `{"quelle": "repository", "profil": …, "aktuell": …, "links": …}` (nur öffentlich) oder `{"quelle": "redaktion"}` |
| `animation.art` | `posen` (Bildfolge mit Augenpunkt) oder `logo` (ein Bild, das mit der Stimme pulsiert) |
| `animation.buehne`, `animation.auge` | bei `posen`: Bühne in Pixel (Seitenverhältnis der Szene) und Augenpunkt der Sitzpose |
| `animation.fassungen` | Ordner je Fassung, z. B. `{"standard": "bilder/"}`; Goch hat zwei (mit und ohne Landschaft) |
| `animation.posen` | je Pose `datei`, `breite`, `hoehe`, `auge`; fehlt eine Pose noch: `{"datei": null, "platzhalter": "neigen"}` |
| `animation.ebenen` | optional: feste Bilder in der Bühne, z. B. Gochs Ast – je `name`, `datei`, `breite`, `hoehe`, `links`, `oben` (Pixel der Bühne), `vorne` (über der Figur), wahlweise `fassungen` und `css` (Gegenstück in der Szene der Startseite, wird mit `--html` verglichen). Ebenen kippen und zwitschern nicht mit |
| `animation.logo`, `animation.puls` | bei `logo`: `datei`, `breite`, `hoehe`; Puls zwischen `min` und `max` (Standard 1,00–1,06) |
| `signalton` | `datei` (Ogg/Opus), `rueckfall` (MP3), `lautstaerke` 0–1; `null`, solange es keinen gibt |
| `stimme` | `anbieter` (`elevenlabs`, `browser`, `keine`), `voiceId`, `modell` (`eleven_v4` …), `einstellungen`, `seed`, `charakter`, `rueckfall` (`keine` = ohne Server-Stimme nur Text; `browser` = lokale Gerätestimme), `browser` |
| `farben` | `#RRGGBB` für Akzent, Linie, Papier |
| `kiosk` | Voreinstellungen fürs Gerät: `groesse` (Anteil der Breite), `untertitel`, `zwitschern` (`an`, `abklingzeit_s`, `entfernung_m`) |

## Bildvorgaben

- **Format:** WebP (Qualität 86–92) oder PNG; je Bild höchstens 250 KB, alle Posen einer Fassung zusammen höchstens 1,5 MB.
- **Hintergrund:** reines Weiß `#FFFFFF`. Die Seite legt das Bild mit `mix-blend-mode: multiply` aufs Papier; Weiß
  verschwindet, nichts wird freigestellt. Für Hintergründe, die nicht weiß sind (Landschaft), eine eigene Fassung
  mit Transparenz.
- **Maße:** Die Sitzpose ist so breit wie die Bühne (Goch: 1153 px, Bühne 1153 × 710). Alle anderen Posen haben
  denselben Maßstab: gleiche Körper- und Kopfgröße in Pixeln. Andere Bildformate sind erlaubt (Gochs Flugposen sind
  1536 × 1024); die Lage regelt der Augenpunkt.
- **Augenpunkt:** Mitte der Pupille in Pixeln, gemessen vom linken oberen Bildrand (z. B. in Pixelmator oder GIMP
  die Cursorposition ablesen). Die Seite richtet jede Pose am Auge auf die Sitzpose aus. `figur-pruefen` rechnet
  daraus die CSS-Versätze und vergleicht sie mit der Szene (`--html index.html`).
- **Blickrichtung:** wie im Designsystem nach links, nie spiegeln.

## Posen

| Pose | Pflicht | Zweck |
|---|---|---|
| `sitzend` | ja | Ruhe, Schnabel geschlossen |
| `schnabel-halb` | ja | Sprechen, leise Silben |
| `schnabel-offen` | ja | Sprechen, laute Silben |
| `lauschend` | ja | während der Aufnahme: Kopf leicht geneigt, aufmerksam |
| `zwitschernd` | nein | Zwitschern (sonst kurzes Schnabelzucken) |
| `aufschlag`, `gleiten`, `abschlag`, `landeanflug` | nein, aber nur alle vier | Anflug (Goch); ohne sie erscheint die Figur ohne Flug |

**Gerätestimme:** nur bei `stimme.rueckfall: "browser"` (etwa eine Kundenfigur ohne eigene Stimme). `stimme.browser` nennt
bevorzugte lokale Stimmen je Sprache, dazu `tonhoehe` und `tempo`. Goch nutzt sie nicht: Jeder Besucher soll dieselbe
Stimme hören (siehe „Stimme“).

Solange Robins Posen für Goch fehlen, steht `"platzhalter": "neigen"`: Der Schnabel folgt der Stimme dann als leichte
Kopfbewegung über `.bird-tilt`.

### Prompt-Vorlage für ChatGPT

Jede Pose einzeln, jedes Mal **mit dem Original** als Vorlage (nicht mit dem letzten Ergebnis, sonst wandert der Strich):

> Verwende das hochgeladene Bild als exakte Vorlage. Ändere nur **den Schnabel: leicht geöffnet, etwa ein Drittel**.
> Alles andere bleibt exakt unverändert: Körper, Gefieder, Farben, Zeichenstrich, Ast, Lichtrichtung, Bildausschnitt,
> Größe und Lage des Vogels, Lage des Auges, Blick nach links. Hintergrund reines Weiß (#FFFFFF), kein Schatten, keine
> Unschärfe, kein Text. Bildformat genau wie die Vorlage (1153 × 637 Pixel).

Statt des fett gesetzten Teils:

| Pose | „Ändere nur …“ |
|---|---|
| `schnabel-halb` | den Schnabel: leicht geöffnet, etwa ein Drittel |
| `schnabel-offen` | den Schnabel: deutlich geöffnet, wie mitten im Singen |
| `lauschend` | den Kopf: leicht zur Seite geneigt, Blick aufmerksam, als lausche der Vogel; Schnabel geschlossen |
| `zwitschernd` | den Schnabel: geöffnet, Kehle leicht gehoben, wie beim Zwitschern |

> English: Use the uploaded image as an exact template. Change only **the beak: slightly open, about a third**.
> Everything else stays exactly the same: body, plumage, colours, line work, branch, lighting, framing, size and
> position of the bird, position of the eye, facing left. Pure white background (#FFFFFF), no shadow, no blur, no
> text. Same image size as the template (1153 × 637 pixels).

Danach: Maße und Augenpunkt messen, als WebP speichern
(`python3 -c "from PIL import Image; Image.open('in.png').save('out.webp', quality=90)"`), in `figur.json` eintragen,
`RECHTE.md` ergänzen, prüfen.

## Stimme – dieselbe für alle

Grundsatz (Robin, 23.10.2026): Jeder Besucher hört dieselbe Stimme, menschlich und passend zur Figur. Deshalb vertont nur
der Server (ElevenLabs), und Goch steht auf `"rueckfall": "keine"`: Ist die Stimme gestört oder die Monatsgrenze erreicht,
antwortet Goch nur als Text. Eine Gerätestimme klänge auf jedem Rechner anders.

1. **Konto:** robin@robin.vision, bezahlter Tarif (kommerzielle Nutzung). In den Kontoeinstellungen der Nutzung für
   Training widersprechen; Auftragsverarbeitung abschließen.
2. **Stimme finden** – drei Wege:
   - **Voice Design** (Standard): eine neue, synthetische Stimme aus einer Beschreibung. Voice Design versteht Englisch
     am besten. Für Goch (warm, weich, männlich):

     > A warm, soft, gentle male voice, mid-forties, medium-low pitch. Calm, friendly and unhurried, with a slight smile in
     > the voice, close and intimate like a trusted storyteller. Clear standard German pronunciation without dialect,
     > natural breathing, no radio announcer tone. Studio quality.

     Abwandlungen, wenn es noch nicht passt: „…slightly husky, relaxed, like a friendly neighbour telling a story by the
     fire…“ (rauer, gemütlicher) oder „…light and bright, gently amused, curious like a small bird…“ (leichter, näher an
     einem Rotkehlchen). Mehrere Vorschläge erzeugen, die zwei besten speichern und vergleichen.
   - **Voice Library:** fertige Stimmen anderer Nutzer. Nur mit Freigabe für kommerzielle Nutzung; die Bedingungen der
     Stimme prüfen (auch, ob und mit welcher Frist der Ersteller sie zurückziehen kann) und in `RECHTE.md` festhalten.
   - **Professional Voice Clone** eines echten Sprechers: am natürlichsten, aber nur mit schriftlicher Einwilligung und
     Vertrag (Zweck, Dauer, Vergütung, Widerruf). Die Stimme einer echten Person nie ohne das nachbilden.
3. **Anhören:** Redaktion → „Goch – Stimme und Spracheingabe“ → Voice ID eintragen → „Stimme anhören“ (geht vor dem
   Speichern; zählt zur Monatsgrenze). Prüfen mit dem KI-Hinweis, einer langen Antwort und einer Rückfrage, auf
   Laptop-, Handy- und Messelautsprecher: warm statt Ansager, kein Dialekt, natürliche Atmung, Zahlen und Namen
   (Balingen, SmartFormular, DATEV) richtig. Englisch mit „Just so you know: I'm an AI …“ prüfen; klingt es zu deutsch,
   eine zweite Stimme nur für Englisch anlegen.
4. **Modell und Regler** (`figur.json`, `stimme`): Eleven v4 ist Standard (am menschlichsten), v4 Turbo, wenn Antworten
   zu lange dauern, Multilingual v2 als Rückweg. Bei v3 und v4 wirken nur `stability` 0,5 (lebendig, nicht monoton) und
   `similarity_boost` 0,8; `style` 0,15, `use_speaker_boost` und `speed` 0,95 nur bei älteren Modellen. `seed` 4711 hält
   den Klang von Antwort zu Antwort gleich.
5. **Sprechstil:** Mit Stimme bekommt das Sprachmodell den Hinweis „Gesprochen“: kurze Sätze, keine Aufzählungen,
   Zahlen und Uhrzeiten so, wie man sie sagt (`GESPROCHEN` in `worker/src/stimme.js`).
6. Die **Voice ID** in der Redaktion speichern (bei einer Kundenfigur dort bei der Figur, nie in ihrer Datei).
7. In `RECHTE.md` eintragen: Weg (Design, Library, Clone), Tarif, Datum, `voiceId`, Fundstelle der Lizenzbedingungen.

**Vorführung am Mac ohne Worker:** `tests/goch_fake_worker.py --stimme mac` spricht serverseitig mit einer macOS-Stimme
(Markus oder Yannick in Premium, wenn geladen, sonst Reed) – nur ein Platzhalter, aber für alle gleich und mit
Schnabel. Mit der echten Stimme: `--stimme elevenlabs`, Schlüssel und Voice ID nur als Umgebungsvariablen
(`ELEVENLABS_API_KEY`, `GOCH_VOICE_ID`) im eigenen Terminal.

## Signalton

- 0,5–1,5 s, normalisiert, als Ogg/Opus plus MP3-Rückfall, je unter 50 KB.
- Quelle: echte Aufnahme nur mit kommerziell nutzbarer Lizenz (CC0, CC BY, gekauft, selbst aufgenommen) oder ein
  erzeugter Ton. xeno-canto ist meist CC BY-NC-SA und damit ungeeignet.
- Umwandeln mit ffmpeg:
  ```sh
  ffmpeg -i quelle.wav -t 1.0 -af "loudnorm=I=-18:TP=-2,afade=t=in:d=0.02,afade=t=out:st=0.9:d=0.1" -ac 1 -c:a libopus -b:a 40k toene/zwitschern.ogg
  ffmpeg -i quelle.wav -t 1.0 -af "loudnorm=I=-18:TP=-2,afade=t=in:d=0.02,afade=t=out:st=0.9:d=0.1" -ac 1 -c:a libmp3lame -b:a 64k toene/zwitschern.mp3
  ```

## Wissen und Persönlichkeit

- Aufbau wie `worker/profile.md`: wer die Figur ist, wie sie spricht (Sie-Form), was sie nie tut, was sie weiß.
- Nur Angaben, die der Kunde freigibt oder die öffentlich sind. Beim Sammeln von der Website des Kunden `robots.txt`
  und Nutzungsvorbehalte für Text- und Data-Mining (§ 44b UrhG) beachten; Quellen mit Abrufdatum festhalten.
- Kundenfiguren: Text in der Redaktion bei der Figur einfügen (KV), nie als Datei im Repository.

## Rechte (`RECHTE.md`)

Je Datei unter `bilder/` und `toene/` eine Zeile mit Pfad in Backticks (Muster mit `*` erlaubt): Herkunft, Werkzeug,
Bearbeitung, Lizenz. Kein Material ohne kommerziell nutzbare Lizenz. Kundenfiguren zusätzlich:

```
## Freigabe des Kunden

Freigegeben von <Name, Funktion> am <TT.MM.JJJJ> per <E-Mail/Vertrag>: Nutzung von Logo, Bildern, Texten und Stimme
für Vorführungen am Messegerät von robin.vision, bis <Datum oder Widerruf>.
```

## Prüfen

```sh
node tools/figur-pruefen.mjs figuren/goch --html index.html
node tools/figur-pruefen.mjs /var/lib/goch-kiosk/figuren/kunde-muster
```

Prüft Pflichtfelder, Bildmaße aus dem Dateikopf, Augenpunkte, Dateigrößen, Dauer und Größe des Signaltons und ob jede
Datei in `RECHTE.md` steht; bei Kundenfiguren die Freigabe und dass nichts in Git liegt. Hinweise (fehlende Pose mit
Platzhalter, leere `voiceId`) brechen nicht ab.
