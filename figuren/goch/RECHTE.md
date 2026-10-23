# Rechte – Figur „Goch“

Stand 23.10.2026. Je Datei: Herkunft, Werkzeug, Bearbeitung, Nutzungsrechte. Was nicht belegt ist, steht als **offen** da.
Keine Rechtsberatung; die Angaben dienen der Investor-Checkliste (Punkt 2: Rechte an Code und Marke).

## Bilder

| Datei | Herkunft | Werkzeug | Bearbeitung | Nutzungsrechte |
|---|---|---|---|---|
| `bilder/bestand/vogel.webp` | Sitzpose aus der Illustration „Rotkehlchen Handzeichnung“, Designsystem 3.0 vom 12.09.2026 (Vault `90_Meta/Design/Bilder/Rotkehlchen_Handzeichnung.png`) | Bildgenerierung in ChatGPT (OpenAI), Designstudie in Robins Sitzung vom 12.09.2026 | Freistellung `90_Meta/Design/Vorlagen/Assets/rotkehlchen_freigestellt.png`; am 13.09.2026 in Vogel- und Ast-Ebene getrennt (Schnitt bei Zeile 583), WebP Qualität 92 auf Weiß | siehe unten „KI-erzeugte Bilder“ |
| `bilder/bestand/flugpose-1-aufschlag.webp`, `bilder/bestand/flugpose-2-gleiten.webp`, `bilder/bestand/flugpose-3-abschlag.webp`, `bilder/bestand/flugpose-4-landeanflug.webp` | Vier Flugposen nach `90_Meta/Design/Flugposen_Briefing.md`, Originale `90_Meta/Design/Entwuerfe/13_Flugpose_*.png` vom 13.09.2026 | eingebautes Bildwerkzeug der ChatGPT-/Codex-Sitzung, Handzeichnung als einzige Stilreferenz | WebP Qualität 86, am Auge auf die Sitzpose ausgerichtet (Versätze in `figur.json`) | wie oben |
| `bilder/bestand/ast.webp` | Ast aus derselben Illustration (Schnitt bei Zeile 583, 13.09.2026); byte-gleiche Kopie von `assets/bestand/ast.webp`, damit Goch am Messegerät auf dem Ast sitzt (Ebene in `figur.json`, 23.10.2026) | wie Sitzpose | keine; `tests/figur_pruefen_test.mjs` prüft, dass die Kopie gleich bleibt | wie oben |
| `bilder/bestand/vogel-schnabel-halb.webp`, `bilder/bestand/vogel-schnabel-offen.webp`, `bilder/vogel-schnabel-halb.webp`, `bilder/vogel-schnabel-offen.webp` | aus der Sitzpose der jeweiligen Fassung abgeleitet (23.10.2026): Unterschnabel 5° bzw. 10° aufgeklappt, Inneres dunkel und gedeckt | `tools/figur-schnabel.py` (Pillow), keine KI-Bilderzeugung | Zwischenlösung bis zu gezeichneten Posen | wie oben |
| `bilder/bestand/vogel-blinzeln.webp`, `bilder/vogel-blinzeln.webp` | aus der Sitzpose der jeweiligen Fassung abgeleitet (23.10.2026): Auge mit Federn aus der Umgebung abgedeckt, geschlossenes Lid gezeichnet | `tools/figur-augen.py` (Pillow), keine KI-Bilderzeugung | Zwischenlösung bis zu gezeichneten Posen | wie oben |
| `bilder/vogel.webp`, `bilder/flugpose-1-aufschlag.webp`, `bilder/flugpose-2-gleiten.webp`, `bilder/flugpose-3-abschlag.webp`, `bilder/flugpose-4-landeanflug.webp` | aus `bilder/bestand/` abgeleitet (Fassung mit Landschaft), 20./21.09.2026; neu erzeugt 23.10.2026 (eingeschlossenes Weiß zwischen Zehen und Federn durchsichtig) | `tools/landschaft-bilder.py` (deckende Freistellung, Saum entfärbt, eingeschlossene Löcher frei) | Bericht `tools/landschaft-bilder.json` | wie oben |

**KI-erzeugte Bilder.** Laut den Nutzungsbedingungen von OpenAI gehört die Ausgabe dem Nutzer, kommerzielle Nutzung
ist erlaubt. Ob rein KI-erzeugte Bilder urheberrechtlich geschützt sind, ist zweifelhaft: Robin darf sie nutzen,
kann Nachahmungen aber womöglich nicht untersagen. Schutz der Figur eher über eine Marke.

**Offen:**
- Robin bestätigt, dass die Bilder mit seinem **privaten** ChatGPT-Konto entstanden sind (nicht mit einem Konto des
  Arbeitgebers). Die damals geltende Fassung der OpenAI-Bedingungen ist nicht archiviert.
- Vor einer Gründung: Rechte an Figur, Bildern und Code schriftlich auf die Gesellschaft übertragen (Checkliste Punkt 2).

## Töne

| Datei | Herkunft | Werkzeug | Lizenz |
|---|---|---|---|
| `toene/` | **offen** – noch keine Datei. Bis Robin liefert, zwitschert Goch nur sichtbar, ohne Ton. | – | Nur CC0 oder CC BY, gekauft, selbst aufgenommen oder erzeugt. xeno-canto ist meist CC BY-NC-SA und damit ungeeignet. Datei, Quelle (Adresse, Abrufdatum), Urheber und Lizenz hier eintragen. |

## Stimme

Gochs Stimme seit 23.10.2026 (Robins Wahl): „Rupert – Proper & At Your Service“ aus der ElevenLabs Voice Library,
Ersteller Robert Ranger, `voiceId` `89gcX1AeMGgcsN8ypHLu` (am 23.10.2026 zu „Meine Stimmen“ hinzugefügt). Deutsch,
kein Aufschlag je Zeichen, keine Live-Moderation, Kündigungsfrist des Erstellers zwei Jahre (zieht er die Stimme zurück,
bleibt sie so lange nutzbar). Nutzung nach den Bedingungen der Voice Library; kommerziell nur mit bezahltem Tarif.

Vorher (bleibt als Rückweg in „Meine Stimmen“): Stimme „Goch“, `voiceId` `sJ8mnaQVr5om2HJMoQ7o`, ElevenLabs Voice Design,
erzeugt am 23.10.2026 aus der Beschreibung in `FIGUREN.md`, Vorschlag 2 von 3 – synthetisch, keine Nachbildung einer
echten Person. Verworfen: „Wolf Spencer – Rough and Deep“ (Aufschlag 0,20 $ je 1.000 Credits, Anklang an eine bekannte
Synchronstimme).

**Offen:** Am 23.10.2026 lief das Konto noch im kostenlosen Tarif, der keine kommerzielle Lizenz enthält. Vor dem
ersten Einsatz einen bezahlten Tarif abschließen (Robin) und hier Tarif und Datum eintragen; die Bedingungen der Voice
Library für Ruperts Stimme (Fundstelle, Abrufdatum) hier festhalten. Außerdem: Konto
(E-Mail-Adresse) bestätigen, Widerspruch gegen Training, Auftragsverarbeitung, Fundstelle der Lizenzbedingungen mit
Abrufdatum.

## Wissen und Name

| Was | Herkunft | Rechte |
|---|---|---|
| `worker/profile.md`, `worker/aktuell.md`, `worker/links.md` | Robins eigene Texte, gepflegt in der Redaktion | Robin |
| Name „Goch“ | walisisch *robin goch* = Rotkehlchen | **offen:** keine Markenrecherche |
