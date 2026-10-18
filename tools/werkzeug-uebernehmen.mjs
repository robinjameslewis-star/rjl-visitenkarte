// Neue Fassungen der Werkzeuge auf die Website bringen (worker/src/werkzeug.js, WERKZEUGE):
//   node tools/werkzeug-uebernehmen.mjs ~/Developer/buchungsstapel-lokal/browser/dist/Buchungsstapel-Generator.html \
//                                       ~/Developer/buchungsstapel-lokal/browser/dist/Booking-Batch-Generator.html
// Je Datei: Werkzeug am Dateinamen erkennen, nach werkzeuge/<id>/ kopieren, Fassung aus dem Fuß lesen, Datum des Git-Stands der
// Quelle nehmen, Größe und SHA-256 berechnen und die Downloadseite mit den vorhandenen Texten neu bauen. Die Texte pflegt Robin
// in der Redaktion; gibt es eine Seite noch nicht, kommen die Starttexte unten zum Einsatz. Danach immer: Übersicht der Werkzeuge
// (werkzeuge/, werkzeuge/en/; uebersicht.js), Produktseite SmartFormular (werkzeuge/smartformular/, …/en/), alle Werkzeugseiten,
// Slider auf der Startseite und Weiterleitungen alter Adressen neu bauen.
// Ohne Datei („node tools/werkzeug-uebernehmen.mjs“) wird nur dieser zweite Teil neu gebaut.
// Danach: node tests/werkzeug_seite_test.mjs, committen, PR.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, basename, join } from "node:path";
import { WERKZEUGE, werkzeugPfad, werkzeugFelder, werkzeugSeite, UEBERSICHT_PFAD, ALTE_ADRESSEN, weiterleitung } from "../worker/src/werkzeug.js";
import { parsePost, parseSettings, POSTS_DIR, SETTINGS_PATH, renderNewsletterFeed, NEWSLETTER_DIR, EN_DIR } from "../worker/src/blog.js";
import { renderSitemap } from "../worker/src/sitemap.js";
import { neuigkeiten, neuigkeitKopf } from "../worker/src/neuigkeiten.js";
import { smartformularSeite, SMARTFORMULAR_PFAD } from "../worker/src/smartformular.js";
import { werkzeugeUebersicht } from "../worker/src/uebersicht.js";
import { startSlider } from "../worker/src/slider.js";

// Starttexte (nur für die erste Fassung einer Seite; danach gilt, was in der Redaktion steht)
const START = {
  "buchungsstapel-generator": {
    beschreibung: `Es ist der 10., die Buchhaltung muss raus, und ausgerechnet jetzt fällt der Bankabruf aus oder ist für dieses Konto nicht eingerichtet. Es gibt nur den PDF-Kontoauszug. Bevor Stunden mit dem Abtippen vergehen: Der Buchungsstapel-Generator macht aus Kontoauszügen im PDF-Format Buchungsstapel im DATEV-Format (DatevPro, EXTF), je Auszug und Monat einen, auch aus gescannten Auszügen. Er läuft vollständig in Ihrem Browser, ohne Installation und ohne Konto, auch unter Windows. Ein Werkzeug für den Alltag außerhalb des perfekten Prozesses.

## Was er kann

- **Ohne Vorlage:** Jeder Umsatz wird auf ein festes Bank- und Gegenkonto gebucht, etwa ein Verrechnungskonto. Soll und Haben ergeben sich aus der Zahlungsrichtung.
- **Mit Vorlage:** Laden Sie den Buchungsstapel des Vormonats dazu, übernimmt der Generator Gegenkonto, BU-Schlüssel und Buchungstext aus ähnlichen Buchungen. Unsichere Vorschläge sind markiert.
- **Viele Banken:** Das Layout eines Auszugs erkennt er selbst. Geprüft ist er mit Auszügen im Stil von Sparkasse, Volks- und Raiffeisenbanken, Deutscher Bank, Commerzbank, Postbank, ING, DKB, N26, Wise und Revolut, auch englischsprachig.
- **Auch Scans:** Gescannte Auszüge, auch in Schwarz-Weiß, liest er per Texterkennung, ebenfalls offline, einige Sekunden je Seite.
- **Summenprüfung:** Je Auszug vergleicht er die gelesenen Umsätze mit dem Kontostand und nennt bei einer Abweichung den Betrag, der vermutlich fehlt.

## So geht es

1. Datei herunterladen und per Doppelklick in Edge oder Chrome öffnen.
2. Wahlweise den Buchungsstapel des Vormonats laden. Dann übernimmt der Generator dessen Gegenkonten, sonst gilt ein festes Gegenkonto.
3. Die Kontoauszüge als PDF hineinziehen.
4. „Buchungsstapel erstellen“, die Buchungen prüfen und exportieren. Die Summenprüfung zeigt, ob alles gelesen wurde.
5. Den Buchungsstapel in Ihrer Buchhaltung über den Import für das DATEV-Format einlesen.

Vor dem ersten Einsatz mit einem Testmandanten prüfen.

## Wenn etwas nicht stimmt

- Bei gescannten Auszügen kann sich die Texterkennung bei Ziffern irren. Hinweise unter der Summenprüfung beachten; Beträge lassen sich in der Tabelle korrigieren.
- Liest der Generator einen Auszug nicht, können Sie dessen Aufbau ohne Inhalt an robin.vision senden oder speichern und per E-Mail schicken. Er enthält keine Namen, Beträge oder Kontonummern; das Layout wird dann nachgerüstet.

## Datenschutz

Kontoauszüge, Vorlage und Buchungen werden nur in Ihrem Browserfenster verarbeitet. Die Datei kann keine Verbindung ins Internet aufbauen, mit einer Ausnahme, die Sie selbst auslösen: Erkennt der Generator einen Auszug nicht, können Sie dessen Aufbau ohne Inhalt (Buchstaben als x, Ziffern als 9) an robin.vision senden. Sie sehen vorher genau, was gesendet wird.`,
    nutzung: `Stand: 15. Oktober 2026

**Anbieter.** Robin James Lewis, Höchststr. 32, 72336 Balingen ([Impressum](https://robin.vision/#privacy)).

**Nutzung.** Sie dürfen das Werkzeug kostenlos nutzen, für sich selbst und in Ihrem Unternehmen oder Ihrer Kanzlei, und die unveränderte Datei weitergeben. Nicht erlaubt ist, es zu verändern, zu verkaufen oder als eigenes Angebot zu vertreiben.

**Keine Beratung, Ergebnis prüfen.** Das Werkzeug ist eine technische Hilfe und keine Steuer- oder Rechtsberatung. Prüfen Sie jeden Buchungsstapel vor dem Import und vor der Festschreibung; die Summenprüfung je Auszug hilft dabei.

**Gewährleistung und Haftung.** Das Werkzeug wird unentgeltlich überlassen. Ich hafte nur für Vorsatz und grobe Fahrlässigkeit, für Mängel nur, wenn ich sie arglistig verschwiegen habe. Unberührt bleibt die Haftung für Schäden aus der Verletzung von Leben, Körper oder Gesundheit und nach dem Produkthaftungsgesetz.

**Weiterentwicklung.** Ein Anspruch auf Aktualisierungen, Unterstützung oder dauerhafte Bereitstellung besteht nicht.

**Marken.** DATEV ist eine eingetragene Marke der DATEV eG. Das Werkzeug steht in keiner Verbindung zur DATEV eG und wird von ihr weder geprüft noch unterstützt. Weitere genannte Namen sind Marken ihrer Inhaber.

**Lizenzen.** Das Werkzeug enthält pdf.js (Mozilla Foundation) und Tesseract mit tesseract.js für die Texterkennung, beide unter der Apache License 2.0, sowie die Schrift EB Garamond (SIL Open Font License 1.1). Die Lizenztexte stehen in der Datei unter „Hinweise, Datenschutz und Lizenzen“.

Es gilt deutsches Recht.`,
    hinweis: `An English version of this tool is available as the [Booking Batch Generator](https://robin.vision/werkzeuge/booking-batch-generator/): same functions, English user interface. The export file is the same in both: a CSV file in the DATEV format (EXTF).`,
  },
  "booking-batch-generator": {
    beschreibung: `The filing deadline is tomorrow, and right now the bank feed is down or was never set up for this account. All you have is the PDF statement. Before you lose hours keying it in by hand: the Booking Batch Generator turns bank statements in PDF format into booking batches in the DATEV format (DatevPro, EXTF), one per statement and month, scanned statements included. It runs entirely in your browser, with no installation and no account, Windows included. A tool for everyday work outside the perfect process. Any accounting software with a DATEV import can read them; more under “About the format” below.

## What it does

- **Without a template:** every transaction is posted to a fixed bank account and contra account, such as a clearing account. Debit and credit follow from the direction of the payment.
- **With a template:** load the previous month's booking batch as well, and the generator takes the contra account, BU key and posting text from similar postings. Uncertain suggestions are marked.
- **Many banks:** it recognises the layout of a statement by itself. It has been tested with statements in the style of Sparkasse, Volks- und Raiffeisenbanken, Deutsche Bank, Commerzbank, Postbank, ING, DKB, N26, Wise and Revolut, English-language ones included.
- **Scans too:** it reads scanned statements, black and white ones included, using text recognition, also offline, in a few seconds per page.
- **Balance check:** for each statement it compares the transactions read with the balance and, if there is a difference, names the amount that is probably missing.

## How it works

1. Download the file and open it with a double-click in Edge or Chrome.
2. Optionally load the previous month's booking batch. The generator then takes its contra accounts; otherwise a fixed contra account applies.
3. Drag in the bank statements as PDF files.
4. Click “Create booking batches”, check the postings and export them. The balance check shows whether everything was read.
5. Import the booking batch into your accounting software using its import for the DATEV format.

Test it with a test client before using it for the first time.

## If something is not right

- With scanned statements, text recognition can get digits wrong. Note the remarks below the balance check; amounts can be corrected in the table.
- If the generator cannot read a statement, you can send its layout without content to robin.vision, or save it and send it by email. It contains no names, amounts or account numbers; support for the layout is then added.

## About the format

Each booking batch is a CSV file in the DATEV format, also known as EXTF or DatevPro format: semicolons between the fields, Windows-1252 encoding, a header line that marks the file as a booking batch, then one line per posting with amount, debit or credit, account, contra account, BU key, date and posting text. DATEV is the standard for exchanging bookkeeping data in Germany. Accounting software with a DATEV import reads these files; most systems used in Germany offer one, international systems often in their German edition. Check whether your software has such an import before you start.

## Privacy

Bank statements, template and postings are processed only in your browser window. The file cannot connect to the internet, with one exception that you trigger yourself: if the generator does not recognise a statement, you can send its layout without content (letters as x, digits as 9) to robin.vision. You see exactly what will be sent beforehand.`,
    nutzung: `As of: 16 October 2026

**Provider.** Robin James Lewis, Höchststr. 32, 72336 Balingen, Germany ([legal notice](https://robin.vision/?lang=en#privacy)).

**Use.** You may use the tool free of charge, for yourself and in your company or practice, and pass on the unaltered file. You may not modify it, sell it or distribute it as your own offering.

**No advice, check the result.** The tool is a technical aid and not tax or legal advice. Check every booking batch before importing it and before finalising it; the balance check for each statement helps with this.

**Warranty and liability.** The tool is provided free of charge. I am liable only for intent and gross negligence, and for defects only if I fraudulently concealed them. Liability for injury to life, body or health and under the German Product Liability Act remains unaffected.

**Further development.** There is no entitlement to updates, support or permanent availability.

**Trademarks.** DATEV is a registered trademark of DATEV eG. The tool is not affiliated with DATEV eG and is neither reviewed nor endorsed by it. Other names mentioned are trademarks of their respective owners.

**Licences.** The tool contains pdf.js (Mozilla Foundation) and Tesseract with tesseract.js for text recognition, both under the Apache License 2.0, and the typeface EB Garamond (SIL Open Font License 1.1). The licence texts are in the file under “Notes, privacy and licences”.

German law applies. These terms are a translation; in case of doubt, the German terms of use of the [Buchungsstapel-Generator](https://robin.vision/werkzeuge/buchungsstapel-generator/#nutzungsbedingungen) apply.`,
    hinweis: `Eine deutsche Fassung des Werkzeugs gibt es als [Buchungsstapel-Generator](https://robin.vision/werkzeuge/buchungsstapel-generator/): gleiche Funktionen, deutsche Oberfläche.`,
  },
};

const lesen = id => existsSync(werkzeugPfad(id)) ? werkzeugFelder(readFileSync(werkzeugPfad(id), "utf8")) : null;

for (const quelle of process.argv.slice(2)) {
  if (!existsSync(quelle)) { console.error(`Datei fehlt: ${quelle}`); process.exit(1); }
  const name = basename(quelle), w = WERKZEUGE.find(x => x.datei === name);
  if (!w) { console.error(`${name}: kein Werkzeug mit diesem Dateinamen (worker/src/werkzeug.js, WERKZEUGE).`); process.exit(1); }
  const daten = readFileSync(quelle);
  const fassung = (daten.toString("utf8").match(/(?:Fassung|Version) <span class="mono">([^<]+)<\/span>/) || [])[1] || "";
  if (!/^[0-9a-f]{7}$/.test(fassung)) {
    console.error(`${name}: Fassung „${fassung}“ ist kein sauberer Git-Stand. Im Werkzeug erst committen, dann neu bauen (python3 browser/build.py).`);
    process.exit(1);
  }
  let datum = new Date().toISOString().slice(0, 10);
  try { datum = execFileSync("git", ["-C", dirname(quelle), "log", "-1", "--format=%cs", fassung], { encoding: "utf8" }).trim() || datum; } catch {}
  const ordner = dirname(werkzeugPfad(w.id));
  mkdirSync(ordner, { recursive: true });
  copyFileSync(quelle, join(ordner, name));
  const felder = lesen(w.id) || { ...START[w.id] };
  // „Was ist neu“ für die neue Fassung vorbelegen: Überschrift und die Commit-Zeilen seit der vorigen Fassung als Stichpunkte;
  // Robin bringt sie in der Redaktion in Sätze (der neueste Eintrag steht auch im Newsletter)
  const vorige = felder.datei && felder.datei.fassung;
  if (!neuigkeiten(felder.neuigkeiten).some(e => e.fassung === fassung)) {
    let zeilen = [];
    if (vorige && vorige !== fassung) { try { zeilen = execFileSync("git", ["-C", dirname(quelle), "log", "--format=%s", `${vorige}..${fassung}`], { encoding: "utf8" }).trim().split("\n").filter(Boolean); } catch {} }
    felder.neuigkeiten = `${neuigkeitKopf(fassung, datum, w.lang)}\n\n${(zeilen.length ? zeilen : ["…"]).map(z => `- ${z}`).join("\n")}${felder.neuigkeiten ? "\n\n" + felder.neuigkeiten : ""}`;
    console.log(`${name}: „Was ist neu“ für Fassung ${fassung} vorbelegt (${zeilen.length} Commit-Zeilen) – in der Redaktion in Sätze bringen.`);
  }
  felder.datei = { name, fassung, datum, bytes: daten.length, sha256: createHash("sha256").update(daten).digest("hex") };
  writeFileSync(werkzeugPfad(w.id), werkzeugSeite(felder, w.id));
  console.log(`${name}: Fassung ${fassung} vom ${datum}, ${daten.length} Bytes, SHA-256 ${felder.datei.sha256}`);
}

// Alle vorhandenen Werkzeugseiten aus ihren Feldern (Rahmen und Kurzbeschreibung kommen aus worker/src/werkzeug.js)
for (const w of WERKZEUGE) { const f = lesen(w.id); if (f && f.datei.fassung) writeFileSync(werkzeugPfad(w.id), werkzeugSeite(f, w.id)); }
// Übersicht der Werkzeuge und Produktseite SmartFormular je Sprache
const alle = Object.fromEntries(WERKZEUGE.map(w => [w.id, lesen(w.id) || {}]));
for (const [lang, pfad] of Object.entries(UEBERSICHT_PFAD)) {
  mkdirSync(dirname(pfad), { recursive: true });
  writeFileSync(pfad, werkzeugeUebersicht(lang));
}
for (const [lang, pfad] of Object.entries(SMARTFORMULAR_PFAD)) {
  mkdirSync(dirname(pfad), { recursive: true });
  writeFileSync(pfad, smartformularSeite(lang, alle));
}
// Slider auf der Startseite (zwischen den Marken; language.js blendet den Slider der anderen Sprache über data-langs aus)
const START_MARKE = "<!-- werkzeuge:liste -->", ENDE_MARKE = "<!-- /werkzeuge:liste -->";
const start = readFileSync("index.html", "utf8"), i = start.indexOf(START_MARKE), j = start.indexOf(ENDE_MARKE);
if (i < 0 || j < i) { console.error("index.html: Marken für die Werkzeugliste fehlen."); process.exit(1); }
const liste = startSlider();
writeFileSync("index.html", start.slice(0, i + START_MARKE.length) + "\n" + liste + "\n" + start.slice(j));
// Weiterleitungen alter Adressen
for (const a of ALTE_ADRESSEN) { mkdirSync(dirname(a.pfad), { recursive: true }); writeFileSync(a.pfad, weiterleitung(a.ziel)); }
// sitemap.xml mit dem Datum der Fassungen (dieselbe Datei schreibt die Redaktion beim Veröffentlichen eines Impulses)
const posts = readdirSync(POSTS_DIR).filter(n => n.endsWith(".md")).map(n => parsePost(readFileSync(join(POSTS_DIR, n), "utf8"), n.slice(0, -3)))
  .filter(p => p.status === "published" && p.date);
const mitFeldern = WERKZEUGE.map(w => ({ ...w, datum: (alle[w.id].datei || {}).datum, datei: alle[w.id].datei, neuigkeiten: alle[w.id].neuigkeiten || "" }));
writeFileSync("sitemap.xml", renderSitemap({ siteUrl: "https://robin.vision/", posts, werkzeuge: mitFeldern }));
// Newsletter-Feeds (dieselbe Datei schreibt die Redaktion beim Veröffentlichen eines Impulses oder einer Werkzeugseite)
for (const lang of ["de", "en"]) {
  const pfad = `${NEWSLETTER_DIR}/${lang === "en" ? EN_DIR + "/" : ""}feed.xml`;
  mkdirSync(dirname(pfad), { recursive: true });
  writeFileSync(pfad, renderNewsletterFeed({ posts, siteUrl: "https://robin.vision/", lang, werkzeuge: mitFeldern }));
}
console.log("Übersichten, Liste auf der Startseite, Weiterleitungen, sitemap.xml und Newsletter-Feeds neu gebaut.");
