// Neue Fassung des Werkzeugs „Buchungsstapel aus Kontoauszug“ auf die Website bringen:
//   node tools/werkzeug-uebernehmen.mjs ~/Developer/buchungsstapel-lokal/browser/dist/Buchungsstapel_aus_Kontoauszug.html
// Kopiert die Datei nach werkzeuge/buchungsstapel/, liest die Fassung aus ihrem Fuß, nimmt das Datum des Git-Stands der Quelle,
// berechnet Größe und SHA-256 und baut die Downloadseite mit den vorhandenen Texten neu (worker/src/werkzeug.js). Die Texte
// pflegt Robin in der Redaktion; gibt es die Seite noch nicht, kommen die Starttexte unten zum Einsatz.
// Danach: node tests/werkzeug_seite_test.mjs, committen, PR.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, basename, join } from "node:path";
import { WERKZEUG_PFAD, werkzeugFelder, werkzeugSeite } from "../worker/src/werkzeug.js";

// Starttexte (nur für die erste Fassung der Seite; danach gilt, was in der Redaktion steht)
const START = {
  beschreibung: `Das Werkzeug liest Kontoauszüge als PDF und erstellt daraus je Monat einen Buchungsstapel im DatevPro-Format (DATEV-Format, EXTF) für den Import in die Buchhaltung. Es läuft vollständig in Ihrem Browser, ohne Installation und ohne Konto, auch unter Windows.

## Was es kann

- **Ohne Vorlage:** Jeder Umsatz wird auf ein festes Bank- und Gegenkonto gebucht, etwa ein Verrechnungskonto. Soll und Haben ergeben sich aus der Zahlungsrichtung.
- **Mit Vorlage:** Laden Sie den Buchungsstapel des Vormonats dazu, übernimmt das Werkzeug Gegenkonto, BU-Schlüssel und Buchungstext aus ähnlichen Buchungen. Unsichere Vorschläge sind markiert.
- **Viele Banken:** Das Layout eines Auszugs erkennt das Werkzeug selbst. Geprüft ist es mit Auszügen im Stil von Sparkasse, Volks- und Raiffeisenbanken, Deutscher Bank, Commerzbank, Postbank, ING, DKB, N26, Wise und Revolut, auch englischsprachig.
- **Summenprüfung:** Je Auszug vergleicht es die gelesenen Umsätze mit dem Kontostand.

## Datenschutz

Kontoauszüge, Vorlage und Buchungen werden nur in Ihrem Browserfenster verarbeitet. Die Datei kann keine Verbindung ins Internet aufbauen, mit einer Ausnahme, die Sie selbst auslösen: Erkennt das Werkzeug einen Auszug nicht, können Sie dessen Aufbau ohne Inhalt (Buchstaben als x, Ziffern als 9) an robin.vision senden, damit das Layout nachgerüstet wird. Sie sehen vorher genau, was gesendet wird.

## So geht es

1. Datei herunterladen und speichern.
2. Per Doppelklick in Microsoft Edge oder Google Chrome öffnen.
3. Kontoauszüge als PDF laden, Buchungen prüfen und exportieren.
4. Den Buchungsstapel in Ihre Buchhaltung importieren (DatevPro-Format), vor dem ersten Einsatz mit einem Testmandanten.

Gescannte Auszüge ohne Text liest das Werkzeug nicht. Neue Fassungen und die wöchentlichen Impulse gibt es im [Newsletter](https://robin.vision/#newsletter).`,
  nutzung: `Stand: 15. Oktober 2026

**Anbieter.** Robin James Lewis, Höchststr. 32, 72336 Balingen ([Impressum](https://robin.vision/#privacy)).

**Nutzung.** Sie dürfen das Werkzeug kostenlos nutzen, für sich selbst und in Ihrem Unternehmen oder Ihrer Kanzlei, und die unveränderte Datei weitergeben. Nicht erlaubt ist, es zu verändern, zu verkaufen oder als eigenes Angebot zu vertreiben.

**Keine Beratung, Ergebnis prüfen.** Das Werkzeug ist eine technische Hilfe und keine Steuer- oder Rechtsberatung. Prüfen Sie jeden Buchungsstapel vor dem Import und vor der Festschreibung; die Summenprüfung je Auszug hilft dabei.

**Gewährleistung und Haftung.** Das Werkzeug wird unentgeltlich überlassen. Ich hafte nur für Vorsatz und grobe Fahrlässigkeit, für Mängel nur, wenn ich sie arglistig verschwiegen habe. Unberührt bleibt die Haftung für Schäden aus der Verletzung von Leben, Körper oder Gesundheit und nach dem Produkthaftungsgesetz.

**Weiterentwicklung.** Ein Anspruch auf Aktualisierungen, Unterstützung oder dauerhafte Bereitstellung besteht nicht.

**Marken.** DATEV ist eine eingetragene Marke der DATEV eG. Das Werkzeug steht in keiner Verbindung zur DATEV eG und wird von ihr weder geprüft noch unterstützt. Weitere genannte Namen sind Marken ihrer Inhaber.

**Lizenzen.** Das Werkzeug enthält pdf.js (Mozilla Foundation, Apache License 2.0) und die Schrift EB Garamond (SIL Open Font License 1.1). Die Lizenztexte stehen in der Datei unter „Hinweise, Datenschutz und Lizenzen“.

Es gilt deutsches Recht.`,
  en: `A free, German-language tool that turns PDF bank statements into monthly booking batches in the DATEV format (EXTF) for import into German accounting software. It runs entirely in your browser; statements and bookings never leave your computer. The terms of use above (in German) apply.`,
};

const quelle = process.argv[2];
if (!quelle || !existsSync(quelle)) { console.error("Aufruf: node tools/werkzeug-uebernehmen.mjs <gebaute HTML-Datei des Werkzeugs>"); process.exit(1); }
const daten = readFileSync(quelle);
const fassung = (daten.toString("utf8").match(/Fassung <span class="mono">([^<]+)<\/span>/) || [])[1] || "";
if (!/^[0-9a-f]{7}$/.test(fassung)) {
  console.error(`Fassung „${fassung}“ ist kein sauberer Git-Stand. Im Werkzeug erst committen, dann neu bauen (python3 browser/build.py).`);
  process.exit(1);
}
let datum = new Date().toISOString().slice(0, 10);
try { datum = execFileSync("git", ["-C", dirname(quelle), "log", "-1", "--format=%cs", fassung], { encoding: "utf8" }).trim() || datum; } catch {}

const ordner = dirname(WERKZEUG_PFAD), name = basename(quelle);
mkdirSync(ordner, { recursive: true });
copyFileSync(quelle, join(ordner, name));
const felder = existsSync(WERKZEUG_PFAD) ? werkzeugFelder(readFileSync(WERKZEUG_PFAD, "utf8")) : { ...START };
felder.datei = { name, fassung, datum, bytes: daten.length, sha256: createHash("sha256").update(daten).digest("hex") };
writeFileSync(WERKZEUG_PFAD, werkzeugSeite(felder));
console.log(`${name}: Fassung ${fassung} vom ${datum}, ${daten.length} Bytes, SHA-256 ${felder.datei.sha256}`);
