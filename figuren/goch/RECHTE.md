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
| `bilder/teile/koerper.webp`, `bilder/teile/schwanz.webp`, `bilder/teile/kopf.webp`, `bilder/teile/kopf-schnabel-halb.webp`, `bilder/teile/kopf-schnabel-offen.webp`, `bilder/teile/kopf-blinzelnd.webp` | aus `bilder/vogel.webp` und den Schnabel- und Blinzelposen derselben Fassung geschnitten (24.10.2026): Körper, Kopf und Schwanz für die Bewegung auf der Seite | `tools/figur-teile.py` (numpy, Pillow), keine KI-Bilderzeugung | weicher Übergang an Hals und Schwanzwurzel; zusammengesetzt deckungsgleich mit der Sitzpose | wie oben |

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
| `toene/zwitschern.ogg`, `toene/zwitschern.mp3` | selbst erzeugt am 23.10.2026, Stil „frage“ (zwei reine Töne, der zweite steigt) – Robins Wahl aus vier Stilen, weil es zu einem gezeichneten Vogel besser passt als eine Feldaufnahme | `tools/figur-zwitschern.py --erzeugen frage` (numpy, PyAV) | keine fremden Rechte | Vorher kurz verwendet: „Robin Song in Madeira Forest“ (Sacha.Julien, Freesound 725201, CC0) – nicht mehr im Einsatz |

## Stimme

Gochs Stimme seit 23.10.2026 (Robins Wahl nach dem Anhören): „Piet“ (Convo, Thoughtful) aus der ElevenLabs Voice
Library, `voiceId` `2QhwfRSog8ArO9AfgYMU`. Am 23.10.2026 über die Schnittstelle mit Eleven v4 erprobt – läuft auch im
kostenlosen Tarif. Nutzung nach den Bedingungen der Voice Library; kommerziell nur mit bezahltem Tarif.

Vorher:
- „Rupert – Proper & At Your Service“ (Voice Library, Ersteller Robert Ranger, `voiceId` `89gcX1AeMGgcsN8ypHLu`), am
  23.10.2026 kurz gewählt; die Schnittstelle lehnt ihn im kostenlosen Tarif ab (402 Payment Required).
- Stimme „Goch“ (bleibt als Rückweg in „Meine Stimmen“), `voiceId` `sJ8mnaQVr5om2HJMoQ7o`, ElevenLabs Voice Design,
  erzeugt am 23.10.2026 aus der Beschreibung in `FIGUREN.md`, Vorschlag 2 von 3 – synthetisch, keine Nachbildung einer
  echten Person.
- Verworfen: „Wolf Spencer – Rough and Deep“ (Aufschlag 0,20 $ je 1.000 Credits, Anklang an eine bekannte
  Synchronstimme).

**Tarif:** Starter (bezahlt, mit kommerzieller Lizenz), laut Robin am 24.10.2026 abgeschlossen.

**Offen:** Für Piet aus der Voice
Library nachtragen: genauer Name, Ersteller, Aufschlag je Zeichen, Live-Moderation, Kündigungsfrist des Erstellers
sowie die Bedingungen (Fundstelle, Abrufdatum); Piet zu „Meine Stimmen“ hinzufügen. Außerdem: Konto
(E-Mail-Adresse) bestätigen, Widerspruch gegen Training, Auftragsverarbeitung, Fundstelle der Lizenzbedingungen mit
Abrufdatum.

## Wissen und Name

| Was | Herkunft | Rechte |
|---|---|---|
| `worker/profile.md`, `worker/aktuell.md`, `worker/links.md` | Robins eigene Texte, gepflegt in der Redaktion | Robin |
| Name „Goch“ | walisisch *robin goch* = Rotkehlchen | **offen:** keine Markenrecherche |
