# MediaPipe Tasks Vision – Herkunft und Änderungen

Für Gochs Blickkontakt (goch-kamera.html, goch-blick.js; Robin, 23.10.2026). Läuft nur im Browser des Besuchers, nachdem
er „Blickkontakt“ eingeschaltet und eingewilligt hat. Kein Bild verlässt das Gerät.

| Datei | Herkunft | Prüfsumme des Originals (SHA-256) |
|---|---|---|
| `vision_bundle.mjs` | npm `@mediapipe/tasks-vision@1.0.1` (31.07.2026), `package/vision_bundle.mjs` – **geändert**, siehe unten | `d885630c297c0b20b1fe86096cb06291c4c8080876f27852e724f24ac603713f` |
| `wasm/vision_wasm_internal.js` | dasselbe Paket, `package/wasm/` | `e170ee67dd4e16c1a6fcd8840a206687e5a59b22c20e4a902bc445b095454d73` |
| `wasm/vision_wasm_internal.wasm` | dasselbe Paket, `package/wasm/` | `8da277a733926eacd0474b8704b36742d6ec3231c57a860c5b889dff8f1df886` |
| `modelle/face_landmarker.task` | `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`, abgerufen 23.10.2026 | `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |
| `LICENSE` | Apache License 2.0, `https://www.apache.org/licenses/LICENSE-2.0.txt` | – |

Lizenz: MediaPipe ist Apache-2.0 (Copyright Google LLC). Das Modell steht laut den Modellkarten (BlazeFace,
FaceMesh V2) ebenfalls unter Apache 2.0 – **auf Googles Seite noch zu bestätigen**.

## Änderung (Apache 2.0, § 4 b)

`vision_bundle.mjs`: Die Nutzungsmeldung an Google ist abgeschaltet. MediaPipe sendet sonst alle 60 Sekunden Messwerte
zu Leistung und Nutzung an `odml.pa.googleapis.com` (eigener Datenschutzhinweis im Paket). Der Protokollierer gilt jetzt
von Anfang an als gestört: Er sammelt nichts, stellt keinen Zeitgeber und sendet nie. Kennzeichnung als Kommentar in der
ersten Zeile der Datei. Erzeugt mit `tools/mediapipe-uebernehmen.py`, das die Prüfsummen vergleicht und abbricht, wenn
die Stelle in einer anderen Version anders aussieht.

Zusätzlich lädt `goch-kamera.html` mit einer Content-Security-Policy, die Verbindungen nur zu robin.vision selbst
erlaubt (`connect-src 'self'`). Der Test `tests/goch_stimme_test.py` prüft, dass keine Anfrage an fremde Hosts geht.

Nicht genutzt: Ausdruckswerte (Blendshapes) – die Seite fragt sie nicht ab; keine Mimik- oder Gefühlsdeutung.
