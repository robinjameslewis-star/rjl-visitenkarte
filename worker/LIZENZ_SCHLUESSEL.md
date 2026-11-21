# Signaturschlüssel des Lizenzdienstes: Sicherung und Wechsel

Stand 21.11.2026 (Lücke 4). Gilt für jede Instanz des Lizenzkerns (`rjl-goch` für robin.vision, später der eigene Dienst für
SmartFormular). Code: `src/lizenz.js`, Abschnitt „Schlüssel“.

**Grundregel:** Den geheimen Schlüssel liest nur Robin selbst, in seinem eigenen Terminal, und die Ausgabe geht direkt in eine
Datei an seinem sicheren Ort. Nie in eine Claude-Sitzung, nie in den Chat, nie in Git, nie in eine E-Mail.

## Was es heute gibt

- **Ein Schlüssel**, ECDSA P-256. Der Worker hat ihn selbst erzeugt und im KV abgelegt (Bindung `USAGE`, Eintrag `lizenz:schluessel`,
  privater und öffentlicher Teil). Er ist kein Secret, sondern ein KV-Eintrag.
- Sein **öffentlicher Teil** steckt in jeder verteilten Werkzeug-Datei (`tools/lizenz/oeffentlich.json`, beim Bauen eingebettet).
  Darum bleibt dieser Schlüssel gültig und aktiv, bis alle Werkzeuge mehrere Schlüssel annehmen.
- **Neu:** Jeder Status trägt die Kennung `kid` des Schlüssels, der ihn signiert hat. `GET /lizenz/schluessel` nennt alle
  öffentlichen Schlüssel mit Kennung und Stand („aktiv“ oder „bekannt“). Die Kennung ist der Fingerabdruck des öffentlichen
  Schlüssels (RFC 7638) und darf öffentlich sein.

## Einstellungen

| Einstellung | Art | Bedeutung |
|---|---|---|
| KV `lizenz:schluessel` | KV | bisheriger Schlüssel, Name `kv`. Ohne `LIZENZ_SIGNATUR_AKTIV` signiert er (wie bisher). |
| `LIZENZ_SIGNATUR_PRIVAT_<NAME>` | Secret | weiterer Schlüssel als privater JWK (JSON). Name = `<NAME>` klein, etwa `2027`. |
| `LIZENZ_SIGNATUR_AKTIV` | `[vars]` | Name oder Kennung des Schlüssels, der signiert. Leer = `kv`. |
| `LIZENZ_SIGNATUR_BEKANNT` | `[vars]` | JSON-Liste öffentlicher Schlüssel, die nur „bekannt“ sind (signieren nie). |

Fehlt der Schlüssel aus `LIZENZ_SIGNATUR_AKTIV` oder ist er kaputt, signiert der KV-Schlüssel weiter. Das steht dann im
Worker-Protokoll („aktiver Signaturschlüssel nicht gefunden“), ohne Schlüsselteile. Prüfen: `GET /lizenz/schluessel`, Feld `aktiv`.

## Sicherer Zwischenordner

Die Dateien entstehen kurz auf dem Mac, bevor sie an den sicheren Ort kommen. Nicht auf den Schreibtisch und nicht nach
„Dokumente“ legen: Beide gleicht iCloud ab. Stattdessen einmal im eigenen Terminal:
```sh
umask 077; mkdir -p ~/.lizenz-sicherung
```
Am Ende den Ordner leeren: `rm -f ~/.lizenz-sicherung/*`.

## Schritt 1: Heutigen Schlüssel sichern (Robin, einmal, bald)

1. Einen sicheren Ort wählen: Passwort-Manager (sicherer Notizeintrag mit Anhang) oder verschlüsselter Datenträger, dazu eine
   zweite Kopie an einem anderen Ort.
2. Im eigenen Terminal, im Ordner `worker/` dieses Repositorys:
   ```sh
   umask 077; npx wrangler kv key get --binding=USAGE --remote "lizenz:schluessel" > ~/.lizenz-sicherung/kv-schluessel.json
   ```
   Die Datei nicht öffnen und nicht anzeigen lassen.
3. Die Sicherung prüfen, ohne sie zu öffnen (läuft nur lokal, gibt nur die Kennung aus):
   ```sh
   node lizenz-schluessel.mjs pruefen ~/.lizenz-sicherung/kv-schluessel.json
   ```
   Erwartet: `ok – Kennung (kid): j4WwgcH45lawAfR0jR3D5dZ_uPJ642ClLjkpO7QPOWI`. Das ist die Kennung des öffentlichen Schlüssels in
   `tools/lizenz/oeffentlich.json`, also des Schlüssels in den verteilten Werkzeugen. Steht dort eine andere Kennung oder
   „Probe gescheitert“, ist die Sicherung nicht brauchbar oder der Schlüssel im KV ist ein anderer als in den Werkzeugen. Dann nicht
   weitermachen und die Leitung fragen (ohne die Datei zu zeigen).
4. Die Datei an den sicheren Ort legen (beide Kopien), dazu Kennung und Datum notieren. Danach den Zwischenordner leeren.
5. Nach dem Ausrollen dieses PRs zeigt `GET https://goch.robin.vision/lizenz/schluessel` im Feld `aktiv` dieselbe Kennung.

Wiederherstellen (nur wenn der KV-Eintrag verloren ist): `npx wrangler kv key put --binding=USAGE --remote "lizenz:schluessel" --path <Sicherungsdatei>`.
Danach muss `GET /lizenz/schluessel` die notierte Kennung zeigen. Der Worker erzeugt seit diesem PR nach einem Lesefehler oder bei
unlesbarem Inhalt keinen neuen Schlüssel mehr. Fehlt der Eintrag aber ganz und ist `LIZENZ_SIGNATUR_AKTIV` leer, erzeugt er wie
bisher einen neuen. Darum sofort wiederherstellen.

## Schritt 2: Zweiten Schlüssel anlegen (Robin, wenn ein Wechsel ansteht)

1. Im eigenen Terminal, im Ordner `worker/`, einen neuen Schlüssel erzeugen. Er geht direkt in eine Datei, die nur Robin lesen darf.
   Angezeigt wird nur die Kennung:
   ```sh
   node lizenz-schluessel.mjs neu ~/.lizenz-sicherung/signatur-2027.json
   node lizenz-schluessel.mjs pruefen ~/.lizenz-sicherung/signatur-2027.json
   ```
2. Als Secret hinterlegen. Der Inhalt kommt aus der Datei, nichts wird angezeigt:
   ```sh
   npx wrangler secret put LIZENZ_SIGNATUR_PRIVAT_2027 < ~/.lizenz-sicherung/signatur-2027.json
   ```
3. Die Datei wie in Schritt 1 sichern (Kennung notieren), dann den Zwischenordner leeren.
4. Prüfen: `GET /lizenz/schluessel` zeigt zwei Schlüssel. Der alte ist `aktiv`, der neue `bekannt` mit der notierten Kennung. Es
   ändert sich für niemanden etwas.

## Schritt 3: Werkzeuge vorbereiten (Leitung SmartFormular)

Die Werkzeuge müssen mehrere öffentliche Schlüssel annehmen, bevor umgestellt wird (Auftrag im PR „Lizenzdienst: Schlüsselkennung
und mehrere Schlüssel (Lücke 4)“): `kid` aus dem Status lesen, den passenden Schlüssel aus einer eingebauten Liste wählen, ohne
`kid` alle Schlüssel der Liste versuchen. Die Liste beim Bauen aus `GET /lizenz/schluessel` (Feld `schluessel`) nehmen, mit altem
und neuem Schlüssel. Erst wenn diese Fassungen verteilt sind und alte Dateien keine Rolle mehr spielen, kommt Schritt 4.

## Schritt 4: Umstellen (Robin, per PR)

1. In `wrangler.toml` unter `[vars]` `LIZENZ_SIGNATUR_AKTIV = "2027"` setzen (eigener PR, Ausrollen wie immer nur auf Robins Wort).
2. Prüfen: `GET /lizenz/schluessel` zeigt den neuen Schlüssel als `aktiv`, den alten als `bekannt`.
3. Den alten Schlüssel **nicht löschen**. Der KV-Eintrag bleibt, und damit bleibt er „bekannt“. Zurück geht es, indem man
   `LIZENZ_SIGNATUR_AKTIV` wieder leert.

**Grenze (ehrlich):** Werkzeug-Dateien, die nur den alten Schlüssel eingebaut haben, nehmen nach dem Umstellen keinen frischen
Status mehr an. Weiter arbeiten nur Geräte, die schon einen gültigen Status gespeichert haben, und das höchstens bis zu dessen
Ablauf (bis 30 Tage, `OFFLINE_TAGE`). Jede neue Anmeldung mit einer alten Datei scheitert sofort, auch ein zweiter Versuch hilft
nicht. Darum: erst Schritt 3, dann umstellen, und nur ohne Not, wenn alte Dateien ersetzt sind.

## Notfall: Schlüssel verraten

Dann sofort umstellen (Schritt 2 und 4 am selben Tag), auch wenn alte Dateien dadurch stehen bleiben. Kunden mit alten Dateien
brauchen eine neue Fassung. Noch nicht gebaut: den verratenen Schlüssel aus der Liste „bekannt“ zu nehmen. Heute bleibt der
KV-Schlüssel gelistet, solange der KV-Eintrag existiert. Das wäre ein eigener kleiner PR (Einstellung für zurückgezogene Kennungen).

## Zweite Instanz (eigener Dienst für SmartFormular)

Der Kern ist derselbe, alle Schlüssel kommen aus Einstellungen. Die neue Instanz bekommt ihren Schlüssel als Secret
`LIZENZ_SIGNATUR_PRIVAT_<NAME>` und `LIZENZ_SIGNATUR_AKTIV = "<NAME>"`. Mit gesetztem `LIZENZ_SIGNATUR_AKTIV` erzeugt sie nie selbst
einen KV-Schlüssel. Soll sie Status für alte Dateien ausstellen, die den robin.vision-Schlüssel eingebaut haben, braucht sie dessen
privaten Teil als Secret (aus der Sicherung in Schritt 1, von Robin selbst eingespielt). Das entscheidet der Umzug
(`LIZENZDIENST_UMZUG.md`), nicht dieser PR.
