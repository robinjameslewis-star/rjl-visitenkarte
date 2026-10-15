// Downloadseite des Werkzeugs (worker/src/werkzeug.js, werkzeuge/buchungsstapel/): Felder hin und zurück, Prüfungen,
// Seite im Repository passt zu ihren Feldern und zur Datei daneben, Redaktion kennt den Inhalt. Kein Netz.
//   node tests/werkzeug_seite_test.mjs
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { WERKZEUG_PFAD, werkzeugFelder, werkzeugSeite } from "../worker/src/werkzeug.js";
import { CONTENT } from "../worker/src/admin.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const wurf = (fn) => { try { fn(); return ""; } catch (e) { return e.message; } };
const root = new URL("..", import.meta.url).pathname;

const html = readFileSync(root + WERKZEUG_PFAD, "utf8");
const f = werkzeugFelder(html);
check(werkzeugSeite(f) === html, "Seite im Repository entsteht genau aus ihren Feldern");
const datei = root + "werkzeuge/buchungsstapel/" + f.datei.name;
check(existsSync(datei), "Werkzeug-Datei liegt neben der Seite");
const roh = existsSync(datei) ? readFileSync(datei) : Buffer.alloc(0);
check(createHash("sha256").update(roh).digest("hex") === f.datei.sha256 && roh.length === f.datei.bytes, "Größe und SHA-256 stimmen mit der Datei überein");
check(roh.toString("utf8").includes(`Fassung <span class="mono">${f.datei.fassung}</span>`), "Fassung stimmt mit dem Fuß der Datei überein");
check(html.includes(`href="${f.datei.name}" download="${f.datei.name}"`), "Download-Knopf mit download-Attribut");
check(/<h2 id="nutzungsbedingungen">Nutzungsbedingungen<\/h2>/.test(html) && /Vorsatz und grobe Fahrlässigkeit/.test(html), "Nutzungsbedingungen auf der Seite");
check(/DATEV ist eine eingetragene Marke der DATEV eG/.test(html), "Markenhinweis");
check(!/ADDISON/.test(html), "Beschreibung ohne ADDISON-Bezug");

const boese = { ...f, beschreibung: f.beschreibung + "\n\n</script><script>alert(1)</script> <img src=x onerror=alert(1)>" };
const seite = werkzeugSeite(boese);
check(werkzeugFelder(seite).beschreibung === boese.beschreibung.trim(), "Felder überstehen </script> im Text");
check(!/<script>alert/.test(seite) && !/<img src=x/.test(seite), "Text wird maskiert, kein Skript auf der Seite");
check(/zu kurz/.test(wurf(() => werkzeugSeite({ ...f, beschreibung: "kurz" }))), "zu kurze Beschreibung abgewiesen");
check(/Nutzungsbedingungen/.test(wurf(() => werkzeugSeite({ ...f, nutzung: "" }))), "fehlende Nutzungsbedingungen abgewiesen");
check(/SHA-256/.test(wurf(() => werkzeugSeite({ ...f, datei: { ...f.datei, sha256: "abc" } }))), "ungültige Prüfsumme abgewiesen");
check(/Dateiname/.test(wurf(() => werkzeugSeite({ ...f, datei: { ...f.datei, name: "../index.html" } }))), "Dateiname mit Pfad abgewiesen");
check(werkzeugFelder("").datei.fassung === "", "leere Seite liefert leere Felder");

const c = CONTENT.werkzeug;
check(c && c.path === WERKZEUG_PFAD && c.join(c.split(html)) === html, "Redaktion: Inhalt „werkzeug“ liest und schreibt die Seite unverändert");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nAlles in Ordnung");
process.exit(fails ? 1 : 0);
