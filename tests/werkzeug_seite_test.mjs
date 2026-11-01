// Werkzeugseiten (worker/src/werkzeug.js): je Werkzeug und Sprache Felder hin und zurück, Prüfungen, Seite im Repository passt
// zu ihren Feldern und zur Datei daneben, Redaktion kennt den Inhalt; dazu Übersichten, Weiterleitung der alten Adresse,
// Slider und Menüpunkt der Startseite (Einzelheiten der Übersicht und des Sliders: werkzeuge_uebersicht_test.mjs), Newsletter-Kasten unter jedem Impuls. Kein Netz.
//   node tests/werkzeug_seite_test.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { WERKZEUGE, werkzeugPfad, werkzeugFelder, werkzeugSeite, UEBERSICHT_PFAD, ALTE_ADRESSEN, weiterleitung, TEILEN_BILD } from "../worker/src/werkzeug.js";
import { parsePost, POSTS_DIR } from "../worker/src/blog.js";
import { neuigkeiten } from "../worker/src/neuigkeiten.js";
import { CONTENT } from "../worker/src/admin.js";
import { werkzeugeUebersicht } from "../worker/src/uebersicht.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const wurf = (fn) => { try { fn(); return ""; } catch (e) { return e.message; } };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");

const SPRACHE = {
  de: { fassung: "Fassung", nutzung: "Nutzungsbedingungen", haftung: /Vorsatz und grobe Fahrlässigkeit/,
    neu: "Was ist neu", ohne: /Für den Download ist keine Anmeldung nötig/, kopf: /<a href="\.\.\/\.\.\/werkzeuge\/" aria-current="page">Robins Werkzeugkasten<\/a>/ },
  en: { fassung: "Version", nutzung: "Terms of use", haftung: /intent and gross negligence/,
    neu: "What's new", ohne: /No sign-up is needed for the download/, kopf: /<a href="\.\.\/\.\.\/werkzeuge\/en\/" aria-current="page">Robin's Tech Stack<\/a>/ },
};
// je Werkzeug: Suchbegriffe in Titel und Beschreibung, Markenhinweis, Lizenzen
const ART = {
  "buchungsstapel-generator": { such: [/DATEV/], marke: /DATEV ist eine eingetragene Marke der DATEV eG/, lizenz: /Tesseract/ },
  "booking-batch-generator": { such: [/DATEV/], marke: /DATEV is a registered trademark of DATEV eG/, lizenz: /Tesseract/ },
  "e-rechnung-pruefen": { such: [/E-Rechnung prüfen/, /XRechnung öffnen/, /ZUGFeRD prüfen/], marke: /XRechnung ist ein Standard der Koordinierungsstelle für IT-Standards/, lizenz: /European Union Public Licence 1\.2.*Apache License 2\.0.*MIT License/s },
  "e-invoice-viewer": { such: [/E-invoice viewer and validator/, /XRechnung/, /ZUGFeRD/], marke: /XRechnung is a standard of the German Coordination Office for IT Standards/, lizenz: /European Union Public Licence 1\.2.*Apache License 2\.0.*MIT License/s },
};
const felder = {};
for (const w of WERKZEUGE) {
  const s = SPRACHE[w.lang], a = ART[w.id], pfad = werkzeugPfad(w.id), html = lesen(pfad), f = felder[w.id] = werkzeugFelder(html);
  console.log(`\n${w.titel} (${pfad})`);
  check(werkzeugSeite(f, w.id) === html, "Seite im Repository entsteht genau aus ihren Feldern");
  const datei = root + pfad.replace(/index\.html$/, "") + f.datei.name;
  check(f.datei.name === w.datei && existsSync(datei), "Werkzeug-Datei liegt neben der Seite");
  const roh = existsSync(datei) ? readFileSync(datei) : Buffer.alloc(0);
  check(createHash("sha256").update(roh).digest("hex") === f.datei.sha256 && roh.length === f.datei.bytes, "Größe und SHA-256 stimmen mit der Datei überein");
  const text = roh.toString("utf8");
  check(text.includes(`${s.fassung} <span class="mono">${f.datei.fassung}</span>`), "Fassung stimmt mit dem Fuß der Datei überein");
  check(text.includes(`<html lang="${w.lang}">`) && text.includes(`<title>${w.titel}</title>`) && text.includes("Smart<span>Formular</span>"), "Datei in der Sprache der Seite, Titel und Wortmarke SmartFormular");
  check(text.includes(`robin.vision/werkzeuge/${w.id}/`), "Fuß der Datei verweist auf diese Seite");
  check(html.includes(`<html lang="${w.lang}">`) && html.includes(`<title>${w.seitentitel}</title>`) && html.includes(`<h1>${w.titel}</h1>`), "Titel (mit Suchbegriffen) und Sprache");
  check(html.includes(`<p class="untertitel">${w.untertitel}</p>`) && html.includes(`<meta name="description" content="${w.meta}">`) && a.such.every(r => r.test(w.seitentitel) && r.test(w.meta)), "Untertitel und Beschreibung mit Suchbegriffen");
  const bild = TEILEN_BILD[w.id];
  check(bild && html.includes(`<meta property="og:image" content="https://robin.vision/${bild}">`) && html.includes('<meta name="twitter:card" content="summary_large_image">') && existsSync(root + bild), "Bild zum Teilen (og:image) liegt im Repository");
  const faq = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])).find(d => d["@type"] === "FAQPage");
  check(faq && faq.mainEntity.length >= 5 && faq.mainEntity.every(q => html.includes(`<h3>${q.name.replace(/&/g, "&amp;")}</h3>`)) && html.indexOf('id="fragen"') < html.indexOf('id="nutzungsbedingungen"'), "Fragen und Antworten sichtbar und als FAQPage, vor den Nutzungsbedingungen");
  check(html.includes(`href="${f.datei.name}" download="${f.datei.name}"`), "Download-Knopf mit download-Attribut");
  check(html.includes(`<h2 id="nutzungsbedingungen">${s.nutzung}</h2>`) && s.haftung.test(html), "Nutzungsbedingungen auf der Seite");
  check(a.marke.test(html), "Markenhinweis");
  check(html.includes(`<p class="kennz">${w.lang === "en" ? "Free until 31 Dec 2026" : "Kostenlos bis 31.12.2026"}</p>\n<h1>`) && !/class="kennz"><a [^>]*>(Anzeige|Ad)<\/a>/.test(html), "Kennzeichen „Kostenlos“ statt „Anzeige“ über dem Titel (Robin, 23.10.2026)");
  check(!/ADDISON|Kontoauszug-Konverter|Bank Statement Converter|Posting Batch Generator/.test(html), "kein ADDISON-Bezug, kein alter Name");
  const nl = html.indexOf('id="newsletter"'), dl = html.indexOf('id="download"'), nb = html.indexOf('id="nutzungsbedingungen"');
  check(dl > 0 && nl > dl && nl < nb && html.indexOf("<h2", dl) === html.indexOf('<h2 id="newsletter-title"'), "Newsletter direkt unter dem Download, vor allem anderen");
  check(/data-newsletter-endpoint="https:\/\/goch\.robin\.vision\/newsletter"/.test(html) && /<script src="\.\.\/\.\.\/newsletter\.js\?v=[^"]+" defer><\/script>/.test(html), "Anmeldung über den Worker");
  check(/name="website"/.test(html) && s.ohne.test(html), "Falle für Bots; Download ohne Anmeldung (Kopplungsverbot)");
  check(a.lizenz.test(html), "Lizenzen der Bestandteile genannt");
  if (w.app) {
    // Werkzeug direkt auf der Seite: eigener Abschnitt, Sicherheitsrichtlinie nur für robin.vision, alle Teile von robin.vision
    const csp = (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/) || [])[1] || "";
    check(html.includes(`<div id="${w.app}" data-lang="${w.lang}"`) && html.indexOf(`id="${w.app}"`) < html.indexOf('id="download"'), "Werkzeug auf der Seite, vor dem Download");
    check(/default-src 'self'/.test(csp) && /script-src 'self'(;|$)/.test(csp) && !/unsafe-inline'[^;]*script|script-src[^;]*unsafe/.test(csp) && /connect-src 'self' https:\/\/goch\.robin\.vision(;|$)/.test(csp), "Sicherheitsrichtlinie: Skripte und Verbindungen nur von robin.vision");
    const teile = [...html.matchAll(/(?:src|href)="(\.\.\/\.\.\/assets\/erechnung\/[^"?]+)/g)].map(m => m[1].replace("../../", ""));
    check(teile.length >= 2 && teile.every(t => existsSync(root + t)), "Skript und Stil des Werkzeugs liegen im Repository");
    check(!/https?:\/\/(?!robin\.vision|goch\.robin\.vision|schema\.org|www\.gesetze-im-internet\.de|www\.bundesfinanzministerium\.de|github\.com)[^"' )<]+\.(js|css)/.test(html), "keine Skripte oder Stile von fremden Hosts");
  }
  const neu = neuigkeiten(f.neuigkeiten);
  check(neu.length >= 1 && neu[0].fassung === f.datei.fassung && neu[0].datum === f.datei.datum && html.includes(`<h2 id="neu">${s.neu}</h2>`) && html.includes(`<h3 id="fassung-${f.datei.fassung}">`), "„Was ist neu“ mit Eintrag zur aktuellen Fassung (Fassung und Datum aus der Überschrift)");
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
  check(html === werkzeugeUebersicht(lang), `${pfad} ist aktuell`);
  const eigene = WERKZEUGE.filter(w => w.lang === lang), fremde = WERKZEUGE.filter(w => w.lang !== lang);
  check(eigene.every(w => html.includes(`werkzeuge/${w.id}/"`)) && fremde.every(w => !html.includes(`werkzeuge/${w.id}/"`)), `${pfad}: nur Werkzeuge dieser Sprache`);
  check(html.includes('id="newsletter"') && html.includes(`<html lang="${lang}">`), `${pfad}: Newsletter und Sprache`);
}
for (const a of ALTE_ADRESSEN) {
  const html = lesen(a.pfad);
  check(html === weiterleitung(a.ziel) && html.includes(`url=../${a.ziel}/`), `${a.pfad} leitet auf ${a.ziel} weiter`);
  check(readdirSync(root + a.pfad.replace(/index\.html$/, "")).length === 1, `${a.pfad}: keine alte Datei mehr daneben`);
}
const start = lesen("index.html");
check(/<a href="werkzeuge\/" data-href-de="werkzeuge\/" data-href-en="werkzeuge\/en\/" data-i18n="navTools">Robins Werkzeugkasten<\/a>/.test(start), "Startseite: Menüpunkt „Robins Werkzeugkasten“ führt auf die Übersicht");
check(WERKZEUGE.every(w => start.includes(`<div class="wzs" data-langs="${w.lang}"`) && start.includes(`href="werkzeuge/${w.id}/">`)), "Startseite: Slider je Sprache mit Karte zum Werkzeug");
check(start.indexOf('id="werkzeuge"') < start.indexOf('id="newsletter"'), "Startseite: Werkzeuge vor dem Newsletter");
check(!/kontoauszug-konverter|Kontoauszug-Konverter/.test(start + lesen("language.js")), "Startseite und Sprachdatei ohne alten Namen");

console.log("\nNewsletter unter jedem Impuls");
for (const n of readdirSync(root + POSTS_DIR).filter(n => n.endsWith(".md"))) {
  const p = parsePost(lesen(`${POSTS_DIR}/${n}`), n.slice(0, -3));
  if (p.status !== "published") continue;
  const html = lesen(`blog/${p.slug}/index.html`);
  const titel = p.lang === "en" ? "Food for Thought, tools and workshops by email" : "Impulse, Werkzeuge und Workshops per E-Mail";
  check(html.includes(`<h2 id="newsletter-title">${titel}</h2>`) && html.indexOf('id="newsletter"') > html.indexOf("</article>")
    && /data-newsletter-endpoint=/.test(html) && /newsletter\.js\?v=/.test(html) && html.includes(`werkzeuge/${p.lang === "en" ? "en/" : ""}"`), `blog/${p.slug}/: Kasten unter dem Beitrag, Werkzeuge im Kopf`);
}
for (const p of ["blog/index.html", "blog/en/index.html"]) check(lesen(p).includes('id="newsletter"'), `${p}: Newsletter unter der Liste`);

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nAlles in Ordnung");
process.exit(fails ? 1 : 0);
