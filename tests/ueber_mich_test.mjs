// Seite „Über mich“ (worker/src/ueber_mich.js; Robin, 16.10.2026): beide Sprachfassungen entstehen genau aus dem Modul, tragen
// Foto, Stationen, Kenntnisse, Ehrenamt, LinkedIn und die Wege zu Termin und Nachricht, keine privaten Daten und keine
// Arbeitgebernamen; Menüpunkt in allen Rahmen (Startseite, Werkzeuge, Impulse), sitemap.xml, Gochs Linkliste. Kein Netz.
//   node tests/ueber_mich_test.mjs
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { UEBER_MICH, ueberMichSeite, ueberMichUrl, LINKEDIN, PORTRAIT } from "../worker/src/ueber_mich.js";
import { WERKZEUGE, werkzeugPfad, UEBERSICHT_PFAD } from "../worker/src/werkzeug.js";
import { parsePost, POSTS_DIR } from "../worker/src/blog.js";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");

// Private Daten (Rotlinie 09.10.2026) und Namen, die Robin nicht auf der Seite haben will (16.10.2026)
const PRIVAT = /0151|684660|gmail|googlemail|Höchststr|1988|20\.10\.|Hechingen|verheiratet|married|Sohn|Kind\b/i;
const NAMEN = /FRISTO|Sudhaus|M\.A\.G\.|Paderborn|Yidishland|Heimatklang|DAA\b/;
const DU = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner|bist du)\b/i;

const T = {
  de: { h1: "Über mich", nav: /<a href="\.\.\/ueber-mich\/" aria-current="page">Über mich<\/a>/, home: "../", stationen: "Stationen", ehrenamt: /Verwaltungsgericht Sigmaringen/, titel: "Über mich – robin.vision" },
  en: { h1: "About me", nav: /<a href="\.\.\/about\/" aria-current="page">About<\/a>/, home: "../?lang=en", stationen: "Career", ehrenamt: /Administrative Court of Sigmaringen/, titel: "About me – robin.vision" },
};
for (const s of UEBER_MICH) {
  const t = T[s.lang], html = lesen(s.pfad);
  console.log(`\n${s.pfad}`);
  check(html === ueberMichSeite(s.lang), "Seite im Repository entsteht genau aus dem Modul");
  check(html.includes(`<html lang="${s.lang}">`) && html.includes(`<title>${t.titel}</title>`) && html.includes(`<h1>${t.h1}</h1>`), "Sprache, Titel, Überschrift");
  check(html.includes(`<link rel="canonical" href="${ueberMichUrl(s.lang)}">`) && UEBER_MICH.every(a => html.includes(`hreflang="${a.lang}" href="${ueberMichUrl(a.lang)}"`)), "canonical und hreflang beider Fassungen");
  check(new RegExp(`<img class="portrait" src="\\.\\./${PORTRAIT.datei.replace(/[./]/g, "\\$&")}" width="${PORTRAIT.breite}" height="${PORTRAIT.hoehe}" alt="[^"]+"`).test(html), "Foto mit Maßen und Alternativtext");
  check((html.match(new RegExp(`href="${LINKEDIN.replace(/[./]/g, "\\$&")}" rel="me noopener" target="_blank">`, "g")) || []).length === 2, "LinkedIn zweimal verlinkt (Kopfzeile, Kontakt als Knopf), rel=me");
  check(html.includes(`<h2 id="stationen">${t.stationen}</h2>`) && (html.match(/<dt>/g) || []).length === 5 && /2007–2016/.test(html) && /2020–2023/.test(html), "fünf Stationen");
  check(/DATEV Kanzlei-Rechnungswesen/.test(html) && /Python/.test(html) && t.ehrenamt.test(html), "Kenntnisse und Ehrenamt");
  check(html.includes(`href="${t.home}#kontakt"`) && html.includes(`href="${t.home}#nachricht"`) && html.includes('href="mailto:robin@robin.vision"'), "Wege zu Termin, Nachricht und öffentlicher E-Mail");
  const sichtbar = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  check(!PRIVAT.test(sichtbar) && !PRIVAT.test(html.replace(/<style[\s\S]*?<\/style>/g, "")), "keine privaten Daten", (sichtbar.match(PRIVAT) || [""])[0]);
  check(!NAMEN.test(html), "keine Arbeitgeber- und Vereinsnamen", (html.match(NAMEN) || [""])[0]);
  if (s.lang === "de") check(!DU.test(sichtbar), "kein Du", (sichtbar.match(new RegExp(`.{0,30}${DU.source}.{0,30}`, "i")) || [""])[0]);
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let d = null; try { d = m && JSON.parse(m[1]); } catch {}
  check(d && d["@type"] === "ProfilePage" && d.mainEntity["@type"] === "Person" && d.mainEntity.sameAs.includes(LINKEDIN) && d.mainEntity.image.endsWith(PORTRAIT.datei), "JSON-LD: ProfilePage mit Person, Foto und LinkedIn");
  check(html.includes(`<meta property="og:image" content="https://robin.vision/${PORTRAIT.datei}">`), "Bild zum Teilen ist das Foto");
  check(html.includes('id="newsletter"') && /data-newsletter-endpoint="https:\/\/goch\.robin\.vision\/newsletter"/.test(html) && /newsletter\.js\?v=/.test(html), "Newsletter-Kasten und Anmeldung über den Worker");
  check(t.nav.test(html) && html.includes(`href="../${s.lang === "en" ? "werkzeuge/en/" : "werkzeuge/"}"`), "Kopf: Werkzeuge und Über mich dieser Sprache");
  const andere = UEBER_MICH.find(a => a.lang !== s.lang);
  check(html.includes(`<a href="../${andere.adresse}" lang="${andere.lang}" hreflang="${andere.lang}">`), "Verweis auf die andere Sprachfassung");
}

console.log("\nFoto");
const foto = root + PORTRAIT.datei;
check(existsSync(foto) && statSync(foto).size < 120000 && readFileSync(foto).subarray(0, 2).equals(Buffer.from([0xff, 0xd8])), "Foto vorhanden, JPEG, unter 120 KB", existsSync(foto) ? `${statSync(foto).size} B` : "fehlt");
check(!/ICC_PROFILE|http:\/\/ns\.adobe\.com\/xap/.test(readFileSync(foto, "latin1")), "Foto ohne Farbprofil- und XMP-Metadaten");

console.log("\nMenüpunkt in allen Rahmen");
const start = lesen("index.html");
check(/<a href="ueber-mich\/" data-href-de="ueber-mich\/" data-href-en="about\/" data-i18n="navAbout">Über mich<\/a><\/nav>\n<a class="termin" href="#kontakt"/.test(start), "Startseite: Menüpunkt vor „Termin“, Ziel je Sprache");
check(/data-i18n="aboutMore">Mehr über mich<\/a>/.test(start) && start.indexOf('data-i18n="aboutMore"') > start.indexOf('id="ueber-mich"'), "Startseite: Verweis „Mehr über mich“ im Abschnitt");
const ld = JSON.parse((start.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]);
const person = ld["@graph"].find(e => e["@type"] === "Person");
check(person.image.endsWith(PORTRAIT.datei) && person.sameAs.includes(LINKEDIN), "Startseite: Person mit Foto und LinkedIn");
const lang = lesen("language.js");
check(/navAbout: 'Über mich'/.test(lang) && /navAbout: 'About'/.test(lang) && /aboutMore: 'Mehr über mich'/.test(lang) && /aboutMore: 'More about me'/.test(lang), "language.js: Menüpunkt und Verweis in beiden Sprachen");
for (const w of WERKZEUGE) check(T[w.lang].nav.source && new RegExp(`<a href="\\.\\./\\.\\./${w.lang === "en" ? "about" : "ueber-mich"}/">${w.lang === "en" ? "About" : "Über mich"}</a></nav>`).test(lesen(werkzeugPfad(w.id))), `${werkzeugPfad(w.id)}: Menüpunkt`);
for (const [l, p] of Object.entries(UEBERSICHT_PFAD)) check(lesen(p).includes(`${l === "en" ? "about/\">About" : "ueber-mich/\">Über mich"}</a></nav>`), `${p}: Menüpunkt`);
const posts = readdirSync(root + POSTS_DIR).filter(n => n.endsWith(".md")).map(n => parsePost(lesen(`${POSTS_DIR}/${n}`), n.slice(0, -3))).filter(p => p.status === "published");
for (const p of posts) check(lesen(`blog/${p.slug}/index.html`).includes(`${p.lang === "en" ? "about/\">About" : "ueber-mich/\">Über mich"}</a></nav>`), `blog/${p.slug}/: Menüpunkt`);
for (const p of ["blog/index.html", "blog/en/index.html"]) check(lesen(p).includes(`${p.includes("/en/") ? "about/\">About" : "ueber-mich/\">Über mich"}</a></nav>`), `${p}: Menüpunkt`);

console.log("\nSitemap und Goch");
const sitemap = lesen("sitemap.xml");
check(UEBER_MICH.every(s => sitemap.includes(`<loc>${ueberMichUrl(s.lang)}</loc>`) && sitemap.includes(`hreflang="${s.lang}" href="${ueberMichUrl(s.lang)}"`)), "sitemap.xml nennt beide Fassungen mit hreflang");
const links = lesen("worker/links.md");
check(links.includes(`| linkedin |`) && links.includes(`| ${LINKEDIN} |`), "links.md: LinkedIn-Adresse wie auf der Seite");
check(/\| ueber-mich \|[^\n]*\| https:\/\/robin\.vision\/ueber-mich\/ https:\/\/robin\.vision\/about\/ \|/.test(links), "links.md: Seite „Über mich“ in beiden Sprachen");
check(/Seite „Über mich“/.test(lesen("worker/profile.md")), "Gochs Profil kennt die Seite");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nSeite „Über mich“ in Ordnung.");
process.exit(fails ? 1 : 0);
