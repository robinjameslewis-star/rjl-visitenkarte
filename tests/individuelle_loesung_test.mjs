// Neues Konzept (Robin, 21.11.2026): Seite „Individuelle Lösung“, Kernzeile, SmartFormular als TaxTech und „Vorgeschlagen · robin.vision“, Satz zur Offenheit
// auf „Werkzeuge“, Absatz „Was robin.vision ist“ auf „Über mich“, Goch kennt alles. Kein Netz.   node tests/individuelle_loesung_test.mjs
import { readFileSync } from "node:fs";
import { LOESUNG, loesungSeite } from "../worker/src/individuelle_loesung.js";
import { EIGENE } from "../worker/src/partner.js";
import { handleContact } from "../worker/src/contact.js";

let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (info !== undefined ? " " + JSON.stringify(info) : "")); if (!ok) fails++; };
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
  check(!/€|EUR|Euro|\d\s*(Werktag|working day|Tag|day)/i.test(main.replace(/<select id="l-budget"[\s\S]*?<\/select>/, "")), `${s.pfad}: keine Preise, keine Fristen`);
  check(/Angebot|quote/.test(main) && /Steuer- oder Rechtsberatung|tax or legal advice/.test(main) && /Mandantendaten|client data/.test(main), `${s.pfad}: vorab ein Angebot, Grenzen genannt`);
  const formular = (main.match(/<form class="lo-form" id="loesung-anfrage"[\s\S]*?<\/form>/) || [""])[0];
  check(formular && ["name", "email", "firma", "art", "budget", "text", "website"].every(n => formular.includes(`name="${n}"`)) && formular.includes('class="falle"') && /placeholder="[^"]{40,}"/.test(formular)
    && /Mandanten|client data/.test(formular) && main.includes('href="mailto:robin@robin.vision"') && main.includes(`href="${up}${s.lang === "en" ? "?lang=en" : ""}#kontakt"`), `${s.pfad}: Anfrageformular (Name, E-Mail, Firma, Art, Budget, Aufgabe, Falle), Hinweis zu Daten, Termin und E-Mail darunter`);
  check(html.includes('"https://goch.robin.vision/contact"') && html.includes("art: 'loesung'") && html.includes("t: geladen"), `${s.pfad}: sendet an Gochs /contact mit Art „loesung“ und Ladezeitpunkt`);
  check(html.includes('data-gruss="') && /<div class="goch-kopf"/.test(html), `${s.pfad}: Goch mit Gruß für die Seite`);
}
const sitemap = lesen("sitemap.xml");
check(sitemap.includes("<loc>https://robin.vision/individuelle-loesung/</loc>") && sitemap.includes("<loc>https://robin.vision/individuelle-loesung/en/</loc>"), "sitemap.xml kennt beide Fassungen");
const llms = lesen("llms.txt");
check(llms.includes("https://robin.vision/individuelle-loesung/") && llms.includes(KERN.de) && llms.includes("TaxTech"), "llms.txt: Seite, Kernzeile, TaxTech");

console.log("\nStartseite");
const start = lesen("index.html"), sprache = lesen("language.js");
check(start.includes(`<title>robin.vision – Werkzeuge und Workshops für Unternehmen und Kanzleien</title>`) && start.includes(`<span class="slogan" data-i18n="slogan">Prozesse effizient gestalten</span>`) && start.includes(`<p class="kernzeile" data-i18n="kernzeile">${KERN.de}</p>`)
  && sprache.includes(`kernzeile: '${KERN.de}'`) && sprache.includes(`kernzeile: '${KERN.en}'`) && sprache.includes("slogan: 'Streamlining processes'"), "Titel und Leitsatz wie vorher, Kernzeile kleiner darunter (Robin, 21.11.2026), DE und EN");
check(!/saeule/.test(start + sprache) && !/Kanzlei-Agent|agents for accounting firms/.test(start + sprache + lesen("worker/profile.md") + lesen("llms.txt")), "keine Kacheln, keine Kanzlei-Agenten (Robin, 21.11.2026)");
const abschnitte = [...start.matchAll(/\n  <section class="([^"]+)"(?: id="([^"]*)")?/g)].map(m => m[2] || m[1]);
check(abschnitte[0] === "stage" && abschnitte[1] === "werkzeuge", "nach der Bühne direkt die Leiste der Werkzeuge", abschnitte.slice(0, 3));
// Individuelle Lösung auf der Startseite (Robin, 22.11.2026: „Individuelle lösung ist noch nicht auf der startseite“, „Beides“)
check(abschnitte.join(" ") === "stage werkzeuge workshops workshop-e-rechnung individuelle-loesung blog newsletter ueber-mich contact nachricht anbieter", "Abschnitte: Individuelle Lösung nach den Workshops, sonst Reihenfolge wie vorher", abschnitte);
const kopfKnoepfe = (start.match(/<p class="cta"><a class="cta-primary" href="werkzeuge\/"[\s\S]*?<\/p>/) || [""])[0];
check((kopfKnoepfe.match(/<a /g) || []).length === 3 && kopfKnoepfe.includes('<a class="cta-secondary cta-loesung" href="individuelle-loesung/" data-href-de="individuelle-loesung/" data-href-en="individuelle-loesung/en/"><span data-i18n="ctaLoesung">Ihre eigene Lösung</span><small data-i18n="ctaLoesungZusatz">Aufgabe schildern · Angebot</small></a></p>')
  && sprache.includes("ctaLoesung: 'Ihre eigene Lösung', ctaLoesungZusatz: 'Aufgabe schildern · Angebot'") && sprache.includes("ctaLoesung: 'Your own solution', ctaLoesungZusatz: 'Describe your task · quote'"), "Kopf: dritter Knopf „Ihre eigene Lösung“ nach den beiden Knöpfen, DE und EN");
const abschnitt = (start.match(/<section class="blog-teaser loesung-start" id="individuelle-loesung"[\s\S]*?<\/section>/) || [""])[0];
const ideen = l => [...(loesungSeite(l).match(/<ul class="ideen">([\s\S]*?)<\/ul>/) || ["", ""])[1].matchAll(/<li>([^<]*)<\/li>/g)].map(m => m[1].replace(/&#39;/g, "'"));
check(ideen("de").length === 4 && ideen("de").every((t, i) => abschnitt.includes(`<li data-i18n="loesungIdee${i + 1}">${t}</li>`) && sprache.includes(`loesungIdee${i + 1}: '${t}'`))
  && ideen("en").length === 4 && ideen("en").every((t, i) => sprache.includes(`loesungIdee${i + 1}: '${t}'`)), "Abschnitt: die vier Beispiele wörtlich aus individuelle_loesung.js (ideen), DE und EN");
check(abschnitt.includes('data-href-en="individuelle-loesung/en/" data-i18n="loesungTitle">Individuelle Lösung</a></h2>') && sprache.includes("loesungTitle: 'Custom solution'")
  && abschnitt.includes('<a class="cta-primary" href="individuelle-loesung/#anfrage" data-href-de="individuelle-loesung/#anfrage" data-href-en="individuelle-loesung/en/#anfrage" data-i18n="loesungKnopf">Aufgabe beschreiben</a>')
  && LOESUNG.every(s => lesen(s.pfad).includes('id="anfrage"')) && /Sie erhalten vorab ein Angebot\./.test(abschnitt) && sprache.includes("You receive a quote first."), "Abschnitt: Überschrift, Angebot vorab, Knopf „Aufgabe beschreiben“ zum Formular (#anfrage), DE und EN");
const loesungEn = ["loesungTitle", "loesungLead", "loesungBeispiele", "loesungIdee1", "loesungIdee2", "loesungIdee3", "loesungIdee4", "loesungKnopf"].map(k => (sprache.match(new RegExp(`${k}: '([^']*)'`, "g")) || []).join(" ")).join(" ");
check(!/€|EUR|Euro|\d/.test(abschnitt.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, "") + loesungEn.replace(/loesung\w+/g, "")), "Abschnitt: keine Preise, keine Fristen, DE und EN");

console.log("\nSmartFormular als TaxTech");
const sf = EIGENE.find(p => p.id === "smartformular");
check(sf.bereich.de === "TaxTech" && sf.bereich.en === "TaxTech" && Object.values(sf.werkzeuge).flat().every(w => w.bereich === "TaxTech"), "partner.js: Bereich TaxTech, DE und EN gleich");
for (const p of ["werkzeuge/smartformular/index.html", "werkzeuge/smartformular/en/index.html"]) check(lesen(p).includes('<ul class="an-chips wz-chips"><li>TaxTech</li></ul>'), `${p}: Chip TaxTech`);
const sfSlider = (start.match(/<article class="wzs-karte">(?:(?!<\/article>)[\s\S])*?<h3>SmartFormular<\/h3>[\s\S]*?<\/article>/g) || []);
check(sfSlider.length === 2 && sfSlider.every(k => k.includes('<span class="wzs-bereich">TaxTech</span>')), "Slider der Startseite: SmartFormular mit TaxTech (DE und EN)");
check(!/smartformular[^\n]*Rechnungswesen<\/li>/i.test(lesen("werkzeuge/index.html")), "Werkzeuge: SmartFormular nicht mehr unter „Rechnungswesen“");

const vk = { de: '<p class="wz-kennz">Vorgeschlagen · <span>robin.vision</span></p>', en: '<p class="wz-kennz">Suggested · <span>robin.vision</span></p>' };
check(["de", "en"].every(l => lesen(l === "en" ? "werkzeuge/en/index.html" : "werkzeuge/index.html").includes(vk[l])) && start.includes('<p class="wzs-kennz">Vorgeschlagen · <span>robin.vision</span></p>') && start.includes('<p class="wzs-kennz">Suggested · <span>robin.vision</span></p>'), "SmartFormular „Vorgeschlagen · robin.vision“ auf Werkzeuge und im Slider");
check(lesen("werkzeuge/smartformular/index.html").includes('<p class="kennz">Vorgeschlagen · <span>robin.vision</span></p>') && lesen("werkzeuge/smartformular/index.html").includes("Vorgeschlagen: robin.vision entwickelt diese Lösung selbst.")
  && lesen("werkzeuge/smartformular/en/index.html").includes("Suggested: robin.vision develops this solution itself.") && !/unbezahlt|unpaid|sponsored/.test(lesen("werkzeuge/smartformular/index.html") + lesen("werkzeuge/smartformular/en/index.html")), "Unterseite SmartFormular: Kennzeichen und eigener Hinweis, nicht „unbezahlt“, ohne sponsored");

console.log("\nWerkzeuge, Über mich, Goch");
check(lesen("werkzeuge/index.html").includes("Manche Lösungen entwickle ich selbst, andere empfehle ich. Eigene Lösungen sind als solche gekennzeichnet.")
  && lesen("werkzeuge/en/index.html").includes("Some solutions I develop myself, others I recommend. My own solutions are labelled as such."), "Satz zur Offenheit auf Werkzeuge, DE und EN");
check(/<h2 id="robin-vision">Was robin.vision ist<\/h2>/.test(lesen("ueber-mich/index.html")) && /<h2 id="robin-vision">What robin.vision is<\/h2>/.test(lesen("about/index.html"))
  && lesen("ueber-mich/index.html").includes('href="../individuelle-loesung/"'), "Über mich: Absatz „Was robin.vision ist“ mit Verweis auf die Individuelle Lösung");
check(!/UG|Gesellschaft|GmbH/.test((lesen("ueber-mich/index.html").match(/<h2 id="robin-vision">[\s\S]*?<\/p>/) || [""])[0]), "Über mich: keine Gesellschaft im Absatz");
const profil = lesen("worker/profile.md").replace(/\s+/g, " "), links = lesen("worker/links.md");
check(profil.includes(KERN.de) && /Individuelle Lösung/.test(profil) && /TaxTech/.test(profil) && !/nicht als „eigenes Produkt“/.test(profil), "Gochs Profil: Kernzeile, Individuelle Lösung, TaxTech, offen gemischt");
check(/^\| individuelle-loesung \|[^\n]*https:\/\/robin\.vision\/individuelle-loesung\/ https:\/\/robin\.vision\/individuelle-loesung\/en\/ \|$/m.test(links), "Gochs Linkliste: individuelle-loesung mit beiden Adressen");

console.log("\nWorker: Betreff der Anfrage");
{
  const mails = [], echt = globalThis.fetch;
  globalThis.fetch = async (url, opt) => { mails.push(JSON.parse(opt.body)); return new Response("{}", { status: 200 }); };
  const env = { RESEND_API_KEY: "test", MAIL_TO: "robin@example.org" }, ctx = { waitUntil() {} };
  const senden = (art, ip) => handleContact(new Request("https://goch.example/contact", { method: "POST", headers: { "CF-Connecting-IP": ip },
    body: JSON.stringify({ lang: "de", art, name: "Erika Muster", email: "erika@example.org", message: "Individuelle Lösung: Anfrage über robin.vision", t: Date.now() - 6000 }) }), env, ctx, {});
  await senden("loesung", "10.0.0.1"); await senden("constructor", "10.0.0.2"); await senden(undefined, "10.0.0.3");
  globalThis.fetch = echt;
  check(mails.map(m => m.subject).join(" | ") === "Website · Individuelle Lösung: Nachricht von Erika Muster | Website: Nachricht von Erika Muster | Website: Nachricht von Erika Muster", "Betreff mit „Individuelle Lösung“ nur bei art=loesung");
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nNeues Konzept in Ordnung.");
process.exit(fails ? 1 : 0);
