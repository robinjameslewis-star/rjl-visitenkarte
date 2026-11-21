// Neues Konzept (Robin, 21.11.2026): Seite „Individuelle Lösung“, Kernzeile, vier Säulen, SmartFormular als TaxTech, Satz zur Offenheit
// auf „Werkzeuge“, Absatz „Was robin.vision ist“ auf „Über mich“, Goch kennt alles. Kein Netz.   node tests/individuelle_loesung_test.mjs
import { readFileSync } from "node:fs";
import { LOESUNG, loesungSeite } from "../worker/src/individuelle_loesung.js";
import { EIGENE } from "../worker/src/partner.js";

let fails = 0;
const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const lesen = p => readFileSync(root + p, "utf8");
const KERN = { de: "Ich baue und finde KI-Lösungen für Kanzleien und Unternehmen – und zeige, wie man damit arbeitet.",
  en: "I build and find AI solutions for accounting firms and businesses – and show you how to work with them." };

console.log("Seite „Individuelle Lösung“");
check(LOESUNG.map(s => s.adresse).join(" ") === "individuelle-loesung/ individuelle-loesung/en/", "Adressen DE und EN aus sitemap.js");
for (const s of LOESUNG) {
  const html = lesen(s.pfad), gebaut = loesungSeite(s.lang), up = s.lang === "en" ? "../../" : "../";
  const main = html.slice(html.indexOf("<main>"), html.indexOf("</main>"));
  check(html === gebaut, `${s.pfad}: gebaut (tools/individuelle-loesung-bauen.mjs)`);
  check(html.includes(`<a href="${up}${s.adresse}" aria-current="page">`), `${s.pfad}: Menüpunkt aktiv`);
  check((main.match(/<ol class="schritte">[\s\S]*?<\/ol>/) || [""])[0].split("<li>").length - 1 === 3, `${s.pfad}: drei Schritte`);
  check(!/€|EUR|Euro|\d\s*(Werktag|working day|Tag|day)/i.test(main), `${s.pfad}: keine Preise, keine Fristen`);
  check(/Angebot|quote/.test(main) && /Steuer- oder Rechtsberatung|tax or legal advice/.test(main) && /Mandantendaten|client data/.test(main), `${s.pfad}: vorab ein Angebot, Grenzen genannt`);
  check(main.includes(`href="${up}${s.lang === "en" ? "?lang=en" : ""}#nachricht"`) && main.includes('href="mailto:robin@robin.vision"') && !/<form\b/.test(main.replace(/<section class="newsletter"[\s\S]*?<\/section>/, "")), `${s.pfad}: Anfrage über die vorhandenen Wege, kein eigenes Formular`);
  check(html.includes('data-gruss="') && /<div class="goch-kopf"/.test(html), `${s.pfad}: Goch mit Gruß für die Seite`);
}
const sitemap = lesen("sitemap.xml");
check(sitemap.includes("<loc>https://robin.vision/individuelle-loesung/</loc>") && sitemap.includes("<loc>https://robin.vision/individuelle-loesung/en/</loc>"), "sitemap.xml kennt beide Fassungen");
const llms = lesen("llms.txt");
check(llms.includes("https://robin.vision/individuelle-loesung/") && llms.includes(KERN.de) && llms.includes("TaxTech"), "llms.txt: Seite, Kernzeile, TaxTech");

console.log("\nStartseite");
const start = lesen("index.html"), sprache = lesen("language.js");
check(start.includes(`<title>robin.vision – ${KERN.de}</title>`) && sprache.includes(`slogan: '${KERN.de}'`) && sprache.includes(`slogan: '${KERN.en}'`), "Kernzeile in Titel und unter der Wortmarke, DE und EN");
const saeulen = (start.match(/<section class="saeulen"[\s\S]*?<\/section>/) || [""])[0];
check((saeulen.match(/<li><a /g) || []).length === 4 && ["Eigene Lösungen", "Empfohlene Lösungen", "Workshops", "Ihre eigene Lösung"].every(x => saeulen.includes(x)), "vier Kacheln unter der Kernzeile");
check(["werkzeuge/", "werkzeuge/", "workshops/", "individuelle-loesung/"].every((z, i) => (saeulen.match(/data-href-de="([^"]+)"/g) || [])[i] === `data-href-de="${z}"`)
  && (saeulen.match(/data-href-en="[^"]+"/g) || []).length === 4, "Kacheln führen auf Werkzeuge, Werkzeuge, Workshops, Individuelle Lösung (Ziel je Sprache)");
check(["saeuleEigeneTitel", "saeuleEmpfohlenTitel", "saeuleWorkshopsTitel", "saeuleLoesungTitel", "saeuleEigeneText", "saeuleLoesungText"].every(k => (sprache.match(new RegExp(k + ": '", "g")) || []).length === 2), "Kacheln in language.js DE und EN");
check(/in Entwicklung/.test(saeulen) && !/20(26|27)/.test(saeulen), "Kanzlei-Agenten nur „in Entwicklung“, kein Termin");

console.log("\nSmartFormular als TaxTech");
const sf = EIGENE.find(p => p.id === "smartformular");
check(sf.bereich.de === "TaxTech" && sf.bereich.en === "TaxTech" && Object.values(sf.werkzeuge).flat().every(w => w.bereich === "TaxTech"), "partner.js: Bereich TaxTech, DE und EN gleich");
for (const p of ["werkzeuge/smartformular/index.html", "werkzeuge/smartformular/en/index.html"]) check(lesen(p).includes('<ul class="an-chips wz-chips"><li>TaxTech</li></ul>'), `${p}: Chip TaxTech`);
const sfSlider = (start.match(/<article class="wzs-karte">(?:(?!<\/article>)[\s\S])*?<h3>SmartFormular<\/h3>[\s\S]*?<\/article>/g) || []);
check(sfSlider.length === 2 && sfSlider.every(k => k.includes('<span class="wzs-bereich">TaxTech</span>')), "Slider der Startseite: SmartFormular mit TaxTech (DE und EN)");
check(!/smartformular[^\n]*Rechnungswesen<\/li>/i.test(lesen("werkzeuge/index.html")), "Werkzeuge: SmartFormular nicht mehr unter „Rechnungswesen“");

console.log("\nWerkzeuge, Über mich, Goch");
check(lesen("werkzeuge/index.html").includes("Manche Lösungen entwickle ich selbst, andere empfehle ich. Eigene Lösungen sind als solche gekennzeichnet.")
  && lesen("werkzeuge/en/index.html").includes("Some solutions I develop myself, others I recommend. My own solutions are labelled as such."), "Satz zur Offenheit auf Werkzeuge, DE und EN");
check(/<h2 id="robin-vision">Was robin.vision ist<\/h2>/.test(lesen("ueber-mich/index.html")) && /<h2 id="robin-vision">What robin.vision is<\/h2>/.test(lesen("about/index.html"))
  && lesen("ueber-mich/index.html").includes('href="../individuelle-loesung/"'), "Über mich: Absatz „Was robin.vision ist“ mit Verweis auf die Individuelle Lösung");
check(!/UG|Gesellschaft|GmbH/.test((lesen("ueber-mich/index.html").match(/<h2 id="robin-vision">[\s\S]*?<\/p>/) || [""])[0]), "Über mich: keine Gesellschaft im Absatz");
const profil = lesen("worker/profile.md").replace(/\s+/g, " "), links = lesen("worker/links.md");
check(profil.includes(KERN.de) && /Individuelle Lösung/.test(profil) && /TaxTech/.test(profil) && !/nicht als „eigenes Produkt“/.test(profil), "Gochs Profil: Kernzeile, Individuelle Lösung, TaxTech, offen gemischt");
check(/^\| individuelle-loesung \|[^\n]*https:\/\/robin\.vision\/individuelle-loesung\/ https:\/\/robin\.vision\/individuelle-loesung\/en\/ \|$/m.test(links), "Gochs Linkliste: individuelle-loesung mit beiden Adressen");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nNeues Konzept in Ordnung.");
process.exit(fails ? 1 : 0);
