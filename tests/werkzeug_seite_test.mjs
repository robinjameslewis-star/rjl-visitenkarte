// Werkzeugseiten (worker/src/werkzeug.js): je Werkzeug und Sprache Felder hin und zurück, Prüfungen, Seite im Repository passt
// zu ihren Feldern und zur Datei daneben, Redaktion kennt den Inhalt; dazu Übersichten, Weiterleitung der alten Adresse,
// Werkzeugliste und Menüpunkt der Startseite, Newsletter-Kasten unter jedem Impuls. Kein Netz.
//   node tests/werkzeug_seite_test.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { WERKZEUGE, werkzeugPfad, werkzeugFelder, werkzeugSeite, werkzeugUebersicht, UEBERSICHT_PFAD, ALTE_ADRESSEN, weiterleitung } from "../worker/src/werkzeug.js";
import { parsePost, POSTS_DIR } from "../worker/src/blog.js";
import { CONTENT } from "../worker/src/admin.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const wurf = (fn) => { try { fn(); return ""; } catch (e) { return e.message; } };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");

const SPRACHE = {
  de: { titel: "Buchungsstapel-Generator", fassung: "Fassung", nutzung: "Nutzungsbedingungen", haftung: /Vorsatz und grobe Fahrlässigkeit/,
    marke: /DATEV ist eine eingetragene Marke der DATEV eG/, ohne: /Für den Download ist keine Anmeldung nötig/, kopf: /<a href="\.\.\/\.\.\/werkzeuge\/">Werkzeuge<\/a>/ },
  en: { titel: "Posting Batch Generator", fassung: "Version", nutzung: "Terms of use", haftung: /intent and gross negligence/,
    marke: /DATEV is a registered trademark of DATEV eG/, ohne: /No sign-up is needed for the download/, kopf: /<a href="\.\.\/\.\.\/werkzeuge\/en\/">Tools<\/a>/ },
};
const felder = {};
for (const w of WERKZEUGE) {
  const s = SPRACHE[w.lang], pfad = werkzeugPfad(w.id), html = lesen(pfad), f = felder[w.id] = werkzeugFelder(html);
  console.log(`\n${w.titel} (${pfad})`);
  check(werkzeugSeite(f, w.id) === html, "Seite im Repository entsteht genau aus ihren Feldern");
  const datei = root + pfad.replace(/index\.html$/, "") + f.datei.name;
  check(f.datei.name === w.datei && existsSync(datei), "Werkzeug-Datei liegt neben der Seite");
  const roh = existsSync(datei) ? readFileSync(datei) : Buffer.alloc(0);
  check(createHash("sha256").update(roh).digest("hex") === f.datei.sha256 && roh.length === f.datei.bytes, "Größe und SHA-256 stimmen mit der Datei überein");
  const text = roh.toString("utf8");
  check(text.includes(`${s.fassung} <span class="mono">${f.datei.fassung}</span>`), "Fassung stimmt mit dem Fuß der Datei überein");
  check(text.includes(`<html lang="${w.lang}">`) && text.includes(`<title>${w.titel}</title>`), "Datei in der Sprache der Seite");
  check(text.includes(`robin.vision/werkzeuge/${w.id}/`), "Fuß der Datei verweist auf diese Seite");
  check(html.includes(`<html lang="${w.lang}">`) && html.includes(`<title>${w.titel} – `) && html.includes(`<h1>${w.titel}</h1>`), "Titel und Sprache");
  check(html.includes(`href="${f.datei.name}" download="${f.datei.name}"`), "Download-Knopf mit download-Attribut");
  check(html.includes(`<h2 id="nutzungsbedingungen">${s.nutzung}</h2>`) && s.haftung.test(html), "Nutzungsbedingungen auf der Seite");
  check(s.marke.test(html), "Markenhinweis");
  check(!/ADDISON|Kontoauszug-Konverter|Bank Statement Converter/.test(html), "kein ADDISON-Bezug, kein alter Name");
  const nl = html.indexOf('id="newsletter"'), dl = html.indexOf('id="download"'), nb = html.indexOf('id="nutzungsbedingungen"');
  check(dl > 0 && nl > dl && nl < nb && html.indexOf("<h2", dl) === html.indexOf('<h2 id="newsletter-title"'), "Newsletter direkt unter dem Download, vor allem anderen");
  check(/data-newsletter-endpoint="https:\/\/goch\.robin\.vision\/newsletter"/.test(html) && /<script src="\.\.\/\.\.\/newsletter\.js\?v=[^"]+" defer><\/script>/.test(html), "Anmeldung über den Worker");
  check(/name="website"/.test(html) && s.ohne.test(html), "Falle für Bots; Download ohne Anmeldung (Kopplungsverbot)");
  check(/Tesseract/.test(html), "Lizenzen nennen auch Tesseract");
  check(s.kopf.test(html), "Kopf führt zu den Werkzeugen dieser Sprache");
  const anderes = WERKZEUGE.find(x => x.id === w.gegenstueck);
  check(html.includes(`hreflang="${anderes.lang}" href="https://robin.vision/werkzeuge/${anderes.id}/"`) && html.includes(`robin.vision/werkzeuge/${anderes.id}/`), "Verweis auf die Fassung in der anderen Sprache");
  const c = Object.values(CONTENT).find(x => x.path === pfad);
  check(c && c.join(c.split(html)) === html, "Redaktion liest und schreibt die Seite unverändert");
}

console.log("\nPrüfungen der Felder");
const id = "buchungsstapel-generator", f = felder[id];
const boese = { ...f, beschreibung: f.beschreibung + "\n\n</script><script>alert(1)</script> <img src=x onerror=alert(1)>" };
const seite = werkzeugSeite(boese, id);
check(werkzeugFelder(seite).beschreibung === boese.beschreibung.trim(), "Felder überstehen </script> im Text");
check(!/<script>alert/.test(seite) && !/<img src=x/.test(seite), "Text wird maskiert, kein Skript auf der Seite");
check(/zu kurz/.test(wurf(() => werkzeugSeite({ ...f, beschreibung: "kurz" }, id))), "zu kurze Beschreibung abgewiesen");
check(/Nutzungsbedingungen/.test(wurf(() => werkzeugSeite({ ...f, nutzung: "" }, id))), "fehlende Nutzungsbedingungen abgewiesen");
check(/Hinweis/.test(wurf(() => werkzeugSeite({ ...f, hinweis: "" }, id))), "fehlender Hinweis in der anderen Sprache abgewiesen");
check(/SHA-256/.test(wurf(() => werkzeugSeite({ ...f, datei: { ...f.datei, sha256: "abc" } }, id))), "ungültige Prüfsumme abgewiesen");
check(/Dateiname/.test(wurf(() => werkzeugSeite({ ...f, datei: { ...f.datei, name: "../index.html" } }, id))), "Dateiname mit Pfad abgewiesen");
check(/Unbekanntes Werkzeug/.test(wurf(() => werkzeugSeite(f, "gibt-es-nicht"))), "unbekanntes Werkzeug abgewiesen");
check(werkzeugFelder("").datei.fassung === "", "leere Seite liefert leere Felder");
const alt = seite.replace(/"hinweis":/, '"en":');
check(werkzeugFelder(alt).hinweis === f.hinweis && !("en" in werkzeugFelder(alt)), "alter Feldname „en“ wird als Hinweis gelesen");

console.log("\nÜbersichten, Weiterleitung, Startseite");
for (const [lang, pfad] of Object.entries(UEBERSICHT_PFAD)) {
  const html = lesen(pfad);
  check(html === werkzeugUebersicht(lang, felder), `${pfad} ist aktuell`);
  const eigene = WERKZEUGE.filter(w => w.lang === lang), fremde = WERKZEUGE.filter(w => w.lang !== lang);
  check(eigene.every(w => html.includes(`werkzeuge/${w.id}/">${w.titel}</a>`)) && fremde.every(w => !html.includes(`>${w.titel}</a>`)), `${pfad}: nur Werkzeuge dieser Sprache`);
  check(html.includes('id="newsletter"') && html.includes(`<html lang="${lang}">`), `${pfad}: Newsletter und Sprache`);
}
for (const a of ALTE_ADRESSEN) {
  const html = lesen(a.pfad);
  check(html === weiterleitung(a.ziel) && html.includes(`url=../${a.ziel}/`), `${a.pfad} leitet auf ${a.ziel} weiter`);
  check(readdirSync(root + a.pfad.replace(/index\.html$/, "")).length === 1, `${a.pfad}: keine alte Datei mehr daneben`);
}
const start = lesen("index.html");
check(/<a href="#werkzeuge" data-i18n="navTools">Werkzeuge<\/a>/.test(start), "Startseite: Menüpunkt „Werkzeuge“");
check(WERKZEUGE.every(w => start.includes(`<li lang="${w.lang}"${w.lang === "de" ? "" : " hidden"}><span class="when">`) && start.includes(`href="werkzeuge/${w.id}/">${w.titel}</a>`)), "Startseite: Werkzeugliste je Sprache");
check(start.indexOf('id="werkzeuge"') < start.indexOf('id="newsletter"'), "Startseite: Werkzeuge vor dem Newsletter");
check(!/kontoauszug-konverter|Kontoauszug-Konverter/.test(start + lesen("language.js")), "Startseite und Sprachdatei ohne alten Namen");

console.log("\nNewsletter unter jedem Impuls");
for (const n of readdirSync(root + POSTS_DIR).filter(n => n.endsWith(".md"))) {
  const p = parsePost(lesen(`${POSTS_DIR}/${n}`), n.slice(0, -3));
  if (p.status !== "published") continue;
  const html = lesen(`blog/${p.slug}/index.html`);
  const titel = p.lang === "en" ? "Food for Thought and tools by email" : "Impulse und Werkzeuge per E-Mail";
  check(html.includes(`<h2 id="newsletter-title">${titel}</h2>`) && html.indexOf('id="newsletter"') > html.indexOf("</article>")
    && /data-newsletter-endpoint=/.test(html) && /newsletter\.js\?v=/.test(html) && html.includes(`werkzeuge/${p.lang === "en" ? "en/" : ""}"`), `blog/${p.slug}/: Kasten unter dem Beitrag, Werkzeuge im Kopf`);
}
for (const p of ["blog/index.html", "blog/en/index.html"]) check(lesen(p).includes('id="newsletter"'), `${p}: Newsletter unter der Liste`);

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nAlles in Ordnung");
process.exit(fails ? 1 : 0);
