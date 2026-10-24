// Seitenwissen (Robin, 24.10.2026): Goch kennt alle Inhalte der Website. Prüft das Einlesen (Sitemap, Text aus <main>,
// ohne Verborgenes, ohne Regel-Lexikon und englische Doppel, gleiche Absätze nur einmal, Grenzen), das Zwischenspeichern
// (neu einlesen nur im Hintergrund, höchstens alle zehn Minuten ein Versuch) und den Einbau in Gochs Systemprompt und
// seine Links. Gebündelter Worker, Sprachmodell abgefangen. Kein Netz.
//   node tests/goch_seitenwissen_test.mjs
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as sw from "../worker/src/seitenwissen.js";

let fails = 0;
const check = (ok, label, info) => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (info !== undefined ? " (" + info + ")" : "")); if (!ok) fails++; };
const B = "https://robin.vision/";

const sitemap = `<?xml version="1.0"?><urlset>
<url><loc>${B}</loc><lastmod>2026-10-23</lastmod><xhtml:link rel="alternate" hreflang="de" href="${B}"/><xhtml:link rel="alternate" hreflang="en" href="${B}?lang=en"/></url>
<url><loc>${B}workshops/</loc><lastmod>2026-10-20</lastmod><xhtml:link rel="alternate" hreflang="de" href="${B}workshops/"/><xhtml:link rel="alternate" hreflang="en" href="${B}workshops/en/"/></url>
<url><loc>${B}workshops/en/</loc><xhtml:link rel="alternate" hreflang="de" href="${B}workshops/"/><xhtml:link rel="alternate" hreflang="en" href="${B}workshops/en/"/></url>
<url><loc>${B}blog/alt/</loc><lastmod>2026-09-25</lastmod></url>
<url><loc>${B}blog/neu/</loc><lastmod>2026-10-23</lastmod></url>
<url><loc>${B}blog/neu-en/</loc><lastmod>2026-10-23</lastmod></url>
<url><loc>${B}werkzeuge/e-rechnung-pruefen/regeln/br-de-15/</loc></url>
<url><loc>https://fremd.example/</loc></url>
</urlset>`;
const seite = (titel, main, lang = "de") => `<!doctype html><html lang="${lang}"><head><title>${titel}</title></head><body>
<header><nav>Werkzeugkasten Impulse</nav></header><main>${main}
<aside class="kasten"><p>Neue Impulse und Werkzeuge per E-Mail – einmal im Monat, abbestellbar mit einem Klick.</p></aside></main>
<footer>Impressum</footer><script>var geheim = 1;</script></body></html>`;
const SEITEN = {
  [B + "sitemap.xml"]: sitemap,
  [B]: seite("robin.vision", `<h1>robin<span>.</span>vision</h1><p>Werkzeuge und <b>Workshops</b> zur KI-Kompetenz.</p>
    <section class="goch" id="goch" hidden><h2>Goch</h2><p>Gespräch schließen</p><section><p>verschachtelt</p></section></section>
    <span class="gs-kicker">Klardaten</span><span class="gs-titel">Echte Daten</span><p aria-hidden="true">♪</p>
    <ul><li>FiBu lite</li><li>Deklaration</li></ul><p>Preis: 0&nbsp;€ &amp; offline.</p>`),
  [B + "workshops/"]: seite("Workshops", "<h1>Workshops</h1><p>Unterweisung nach Art. 4 KI-Verordnung.</p>"),
  [B + "blog/alt/"]: seite("Alter Impuls", "<h1>Alt</h1><p>Text alt.</p>"),
  [B + "blog/neu/"]: seite("Neuer Impuls", "<h1>Neu</h1><p>Text neu.</p>"),
  [B + "blog/neu-en/"]: seite("New thought", "<h1>New</h1><p>English text.</p>", "en"),
};
const geholt = [];
const holen = async u => { geholt.push(u); return SEITEN[u] ?? null; };

console.log("1. Sitemap");
const liste = sw.sitemapLesen(sitemap, B);
check(liste.some(x => x.url === B + "workshops/" && x.en === B + "workshops/en/"), "deutsche Seite mit englischer Adresse");
check(!liste.some(x => x.url === B + "workshops/en/"), "englische Fassung übersprungen");
check(!liste.some(x => /regeln/.test(x.url)) && !liste.some(x => x.url.startsWith("https://fremd")), "kein Regel-Lexikon, keine fremden Adressen");

console.log("2. Text einer Seite");
const s = sw.seiteLesen(SEITEN[B]);
check(s.lang === "de" && s.titel === "robin.vision", "Sprache und Titel", s.titel);
check(/^## robin\. ?vision/m.test(s.text) && /Werkzeuge und Workshops zur KI-Kompetenz\./.test(s.text), "Überschrift und Absatz, Wortgrenzen erhalten", s.text.split("\n")[1]);
check(!/Gespräch schließen|verschachtelt|♪|geheim|Impressum|Werkzeugkasten Impulse/.test(s.text), "Verborgenes, Navigation, Fußzeile und Skripte fehlen");
check(/Klardaten Echte Daten/.test(s.text), "nebeneinanderstehende Elemente durch Leerzeichen getrennt");
check(/- FiBu lite\n- Deklaration/.test(s.text) && /Preis: 0 € & offline\./.test(s.text), "Listen und Zeichen", s.text.match(/Preis.*/)?.[0]);

console.log("3. Alles einlesen");
const w = await sw.aufbauen(B, holen);
const ids = w.seiten.map(x => x.id);
check(ids.join() === "seite-start,seite-workshops,seite-blog-neu,seite-blog-alt", "Startseite zuerst, Impulse vom neuesten an, englisches Doppel weg", ids.join());
const kasten = w.seiten.filter(x => x.text.includes("Neue Impulse und Werkzeuge per E-Mail")).length;
check(kasten === 1, "gleicher Absatz auf mehreren Seiten nur einmal", kasten);
check(!geholt.some(u => /regeln/.test(u)), "Regel-Lexikon nicht abgerufen");
const p = sw.prompt(w);
check(p.includes("# Inhalte der Website robin.vision") && p.includes("Link-Kennung seite-workshops") && p.includes("Unterweisung nach Art. 4"), "Abschnitt für den Systemprompt");
const ls = sw.links(w, [{ urls: [B + "workshops/"] }]);
check(!ls.some(l => l.id === "seite-workshops") && ls.some(l => l.id === "seite-blog-neu" && l.urls[0] === B + "blog/neu/"), "Links nur für Seiten, die links.md noch nicht führt");
check(sw.stand(w).seiten.length === 4 && sw.stand(w).woerter > 10, "Stand für die Redaktion");

console.log("4. Grenzen");
const viele = { [B + "sitemap.xml"]: `<urlset>${Array.from({ length: 30 }, (_, i) => `<url><loc>${B}s${i}/</loc></url>`).join("")}</urlset>` };
for (let i = 0; i < 30; i++) viele[`${B}s${i}/`] = seite("S" + i, `<p>${("Satz " + i + " mit Inhalt. ").repeat(400)}</p>`);
const gross = await sw.aufbauen(B, async u => viele[u] ?? null);
const zeichen = gross.seiten.reduce((n, x) => n + x.text.length, 0);
check(gross.seiten.every(x => x.text.length <= sw.GRENZEN.zeichenSeite) && zeichen <= sw.GRENZEN.zeichen, "je Seite und insgesamt begrenzt", zeichen);

console.log("5. Zwischenspeicher");
const kv = () => { const m = new Map(); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, delete: async k => { m.delete(k); }, map: m }; };
const warten = [];
const ctx = { waitUntil: q => warten.push(q) };
const e1 = { USAGE: kv(), SITE_URL: B };
check(await sw.laden(e1, ctx, holen) === null && warten.length === 1, "ohne Stand: Antwort sofort, Einlesen im Hintergrund");
await Promise.all(warten);
const gespeichert = JSON.parse(e1.USAGE.map.get("content:seiten"));
check(gespeichert.seiten.length === 4, "im KV gespeichert");
warten.length = 0;
check((await sw.laden(e1, ctx, holen)).seiten.length === 4 && warten.length === 0, "frischer Stand: kein neues Einlesen");
e1.USAGE.map.set("content:seiten", JSON.stringify({ ...gespeichert, stand: "2026-01-01T00:00:00Z" }));
await sw.laden(e1, ctx, holen);
check(warten.length === 0, "veralteter Stand, aber Versuch vor weniger als zehn Minuten: kein zweiter Versuch");
e1.USAGE.map.set("content:seiten-versuch", String(Date.now() - 11 * 60_000));
await sw.laden(e1, ctx, holen);
check(warten.length === 1, "nach zehn Minuten neuer Versuch");
check(await sw.laden({}, ctx, holen) === null, "ohne KV: kein Seitenwissen, kein Fehler");
const fehler = await sw.neuEinlesen({ USAGE: kv(), SITE_URL: B }, async () => null);
check(fehler.error && /Sitemap/.test(fehler.error), "Sitemap nicht erreichbar: Fehlermeldung statt Absturz", fehler.error);

console.log("6. Gochs Systemprompt und Links (gebündelter Worker)");
const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "rjl-goch-seitenwissen-"));
execSync(`npx wrangler deploy --dry-run --outdir "${out}"`, { cwd: join(root, "worker"), stdio: "pipe" });
writeFileSync(join(out, "test.mjs"), readFileSync(join(out, "index.js"), "utf8").replace(/import (\w+) from "\.\/([^"]+\.md)";/g,
  (_, name, file) => `const ${name} = ${JSON.stringify(readFileSync(join(out, file), "utf8"))};`));
const prompts = [];
let modell = { reply: "Dazu gibt es einen Impuls.", action: null, message: null, link: "seite-blog-neu", link2: null, zeigen: null };
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith("https://api.anthropic.com")) {
    prompts.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5",
      content: [{ type: "text", text: JSON.stringify(modell) }], stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }),
      { status: 200, headers: { "content-type": "application/json", "request-id": "req_test" } });
  }
  return new Response("offline", { status: 503 });
};
const worker = (await import(pathToFileURL(join(out, "test.mjs")).href)).default;
const e2 = { USAGE: kv(), ANTHROPIC_API_KEY: "test", ALLOWED_ORIGINS: "https://robin.vision", SITE_URL: B };
await e2.USAGE.put("content:seiten", JSON.stringify(w));
const r = await (await worker.fetch(new Request("https://goch.robin.vision/chat", { method: "POST",
  headers: { "content-type": "application/json", Origin: "https://robin.vision", "CF-Connecting-IP": "9.9.9.1" },
  body: JSON.stringify({ lang: "de", messages: [{ role: "user", content: "Gibt es etwas Neues?" }] }) }), e2, { waitUntil: () => {} })).json();
const system = prompts.at(-1)?.system?.[0]?.text || "";
check(system.includes("# Inhalte der Website robin.vision") && system.includes("Text neu.") && system.indexOf("# Inhalte der Website") > system.indexOf("# Woran Robin gerade arbeitet"), "Seitenwissen im Systemprompt, nach „Woran Robin gerade arbeitet“");
check(/- seite-blog-neu \(„Neuer Impuls“\)/.test(system), "Impuls als Link angeboten");
check(r.link && r.link.url === B + "blog/neu/" && r.link.label === "Neuer Impuls", "Link auf den Impuls in der Antwort", JSON.stringify(r.link));

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nSeitenwissen in Ordnung.");
process.exit(fails ? 1 : 0);
