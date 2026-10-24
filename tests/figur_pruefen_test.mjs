// Prüft tools/figur-pruefen.mjs: Goch besteht und passt zur Szene der Startseite; kaputte Pakete (falsche Maße,
// Auge außerhalb, zu groß, Rechte fehlen, Kundenfigur ohne Freigabe oder in Git, Ton zu lang) werden erkannt.
// Bilder und Töne sind nur Dateiköpfe, erzeugt im Test. Kein Netz.   node tests/figur_pruefen_test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { pruefen, bildmasse, opusDauer, versatz } from "../tools/figur-pruefen.mjs";

let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const has = (list, text) => list.some(x => x.includes(text));

// Dateiköpfe: WebP (VP8X), PNG (IHDR), Ogg/Opus (OpusHead + letzte Seite mit Granulposition)
function webp(w, h, pad = 0) {
  const b = Buffer.alloc(30 + pad);
  b.write("RIFF", 0); b.writeUInt32LE(b.length - 8, 4); b.write("WEBPVP8X", 8); b.writeUInt32LE(10, 16);
  b.writeUIntLE(w - 1, 24, 3); b.writeUIntLE(h - 1, 27, 3);
  return b;
}
function png(w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); b.write("IHDR", 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return b;
}
function ogg(sekunden, preskip = 312) {
  const head = Buffer.alloc(19); head.write("OpusHead", 0); head[8] = 1; head[9] = 1; head.writeUInt16LE(preskip, 10);
  const page = granule => { const p = Buffer.alloc(27); p.write("OggS", 0); p.writeBigInt64LE(BigInt(granule), 6); return p; };
  return Buffer.concat([page(0), head, Buffer.alloc(200), page(Math.round(sekunden * 48000) + preskip)]);
}

// 1. Dateiköpfe der echten Bilder
const vogel = bildmasse(readFileSync(root + "figuren/goch/bilder/vogel.webp"));
const flug = bildmasse(readFileSync(root + "figuren/goch/bilder/bestand/flugpose-3-abschlag.webp"));
check(vogel && vogel.breite === 1153 && vogel.hoehe === 637, "Maße der Sitzpose aus dem WebP-Kopf", vogel && `${vogel.breite} × ${vogel.hoehe}`);
check(flug && flug.breite === 1536 && flug.hoehe === 1024, "Maße einer verlustbehafteten Flugpose", flug && `${flug.breite} × ${flug.hoehe}`);
check(bildmasse(png(640, 480)).breite === 640 && bildmasse(Buffer.from("kein Bild")) === null, "PNG erkannt, Fremdes abgelehnt");
check(Math.abs(opusDauer(ogg(1.2)) - 1.2) < 0.001, "Dauer aus Ogg/Opus (Granulposition minus Vorlauf)");

// 2. Goch: besteht, Platzhalter als Hinweis, Szene der Startseite passt
const goch = pruefen(root + "figuren/goch", { html: root + "index.html" });
check(goch.fehler.length === 0, "Goch besteht samt Szene der Startseite", goch.fehler.join(" | "));
check(has(goch.hinweise, "schnabel-halb") && has(goch.hinweise, "lauschend"), "fehlende Posen von Goch nur als Hinweis (Platzhalter)");
const v = versatz(goch.figur, "aufschlag");
check(v.links.toFixed(4) === "-14.7441" && v.oben.toFixed(4) === "-40.8451" && v.breite.toFixed(4) === "133.2177", "Versatz der Aufschlagpose aus dem Augenpunkt wie im CSS");
const tmp = mkdtempSync(join(tmpdir(), "figur-pruefen-"));
writeFileSync(join(tmp, "index.html"), readFileSync(root + "index.html", "utf8").replace(".bird-up { left: -14.7441%", ".bird-up { left: -14.9%"));
cpSync(root + "figuren", join(tmp, "figuren"), { recursive: true });
cpSync(root + "worker", join(tmp, "worker"), { recursive: true, filter: s => !s.includes("node_modules") });
const verschoben = pruefen(join(tmp, "figuren/goch"), { html: join(tmp, "index.html") });
check(has(verschoben.fehler, ".bird-up"), "verschobene Flugpose im CSS wird erkannt", verschoben.fehler.join(" | "));

// 3. Kundenfigur als Logo außerhalb des Repos: besteht
function paket(name, figur, dateien = {}, rechte = null) {
  const dir = join(tmp, "geraet", name);
  mkdirSync(join(dir, "bilder"), { recursive: true }); mkdirSync(join(dir, "toene"), { recursive: true });
  writeFileSync(join(dir, "figur.json"), JSON.stringify(figur, null, 2));
  for (const [p, buf] of Object.entries(dateien)) writeFileSync(join(dir, p), buf);
  writeFileSync(join(dir, "RECHTE.md"), rechte ?? `# Rechte\n\n${Object.keys(dateien).map(p => `- \`${p}\`: vom Kunden geliefert`).join("\n")}\n\n## Freigabe des Kunden\n\nFreigegeben per E-Mail am 20.10.2026.\n`);
  return dir;
}
const logo = id => ({
  format: 1, id, name: { de: "Muster", en: "Muster" }, rolle: { de: "Empfang der Muster GmbH", en: "Front desk" },
  sprachen: ["de", "en"], oeffentlich: false,
  texte: { quelle: "figur", begruessung: { de: "Willkommen.", en: "Welcome." }, einstiegsfragen: { de: ["Was bieten Sie an?"], en: ["What do you offer?"] } },
  wissen: { quelle: "redaktion" },
  animation: { art: "logo", fassungen: { standard: "bilder/" }, logo: { datei: "logo.png", breite: 800, hoehe: 400 }, puls: { min: 1, max: 1.06 } },
  signalton: { datei: null }, stimme: { anbieter: "browser", voiceId: "", rueckfall: "browser" }, farben: { akzent: "#003366" },
  kiosk: { groesse: 0.6, zwitschern: { an: false, abklingzeit_s: 30, entfernung_m: [1, 3] } },
});
const ok = pruefen(paket("kunde-muster", logo("kunde-muster"), { "bilder/logo.png": png(800, 400) }));
check(ok.fehler.length === 0, "Kundenfigur (Logo) mit Freigabe besteht", ok.fehler.join(" | "));

// 4. Fehler werden erkannt
const fall = (label, name, figur, dateien, rechte, erwartet) => {
  const r = pruefen(paket(name, figur, dateien, rechte));
  check(has(r.fehler, erwartet), label, r.fehler.join(" | ") || "kein Fehler gemeldet");
};
fall("falsche Bildmaße", "kunde-masse", logo("kunde-masse"), { "bilder/logo.png": png(799, 400) }, null, "799 × 400");
fall("id passt nicht zum Ordner", "kunde-ordner", logo("anders"), { "bilder/logo.png": png(800, 400) }, null, "Ordnernamen");
fall("Rechte-Eintrag fehlt", "kunde-rechte", logo("kunde-rechte"), { "bilder/logo.png": png(800, 400) }, "# Rechte\n\n## Freigabe des Kunden\n\n20.10.2026\n", "nennt bilder/logo.png nicht");
fall("Kundenfigur ohne Freigabe", "kunde-freigabe", logo("kunde-freigabe"), { "bilder/logo.png": png(800, 400) }, "# Rechte\n\n- `bilder/logo.png`: Kunde\n", "Freigabe des Kunden");
fall("Wissen einer Kundenfigur im Repository", "kunde-wissen", { ...logo("kunde-wissen"), wissen: { quelle: "repository", profil: "a.md", aktuell: "b.md", links: "c.md" } }, { "bilder/logo.png": png(800, 400) }, null, "Redaktion");
fall("Bild zu groß", "kunde-gross", { ...logo("kunde-gross"), animation: { ...logo("x").animation, logo: { datei: "logo.webp", breite: 800, hoehe: 400 } } }, { "bilder/logo.webp": webp(800, 400, 300 * 1024) }, null, "höchstens 250 KB");

const posen = (id, extra = {}) => ({
  ...logo(id),
  animation: {
    art: "posen", buehne: { breite: 1000, hoehe: 700 }, auge: [300, 100], fassungen: { standard: "bilder/" },
    posen: {
      sitzend: { datei: "sitzend.webp", breite: 1000, hoehe: 600, auge: [300, 100] },
      "schnabel-halb": { datei: "halb.webp", breite: 1000, hoehe: 600, auge: [300, 100] },
      "schnabel-offen": { datei: "offen.webp", breite: 1000, hoehe: 600, auge: [300, 100] },
      lauschend: { datei: "lauschend.webp", breite: 1000, hoehe: 600, auge: [300, 100] },
      ...extra,
    },
  },
});
const vier = { "bilder/sitzend.webp": webp(1000, 600), "bilder/halb.webp": webp(1000, 600), "bilder/offen.webp": webp(1000, 600), "bilder/lauschend.webp": webp(1000, 600) };
const r1 = pruefen(paket("kunde-posen", posen("kunde-posen"), vier));
check(r1.fehler.length === 0 && has(r1.hinweise, "ohne Flugposen"), "Kundenfigur mit vier Pflichtposen besteht", r1.fehler.join(" | "));
fall("Auge außerhalb des Bildes", "kunde-auge", posen("kunde-auge", { lauschend: { datei: "lauschend.webp", breite: 1000, hoehe: 600, auge: [300, 650] } }), vier, null, "innerhalb des Bildes");
fall("Pflichtpose ohne Platzhalter", "kunde-pflicht", posen("kunde-pflicht", { "schnabel-offen": { datei: null } }), vier, null, "platzhalter");
fall("unbekannte Pose", "kunde-pose", posen("kunde-pose", { winken: { datei: "w.webp", breite: 10, hoehe: 10, auge: [1, 1] } }), vier, null, "unbekannt");
fall("Flugposen unvollständig", "kunde-flug", posen("kunde-flug", { aufschlag: { datei: "sitzend.webp", breite: 1000, hoehe: 600, auge: [300, 100] } }), vier, null, "nur vollständig");

// 5. Signalton
const ton = (id, sek, mp3 = true) => [{ ...logo(id), signalton: { datei: "zwitschern.ogg", rueckfall: mp3 ? "zwitschern.mp3" : null, lautstaerke: 0.4 } },
  { "bilder/logo.png": png(800, 400), "toene/zwitschern.ogg": ogg(sek), ...(mp3 ? { "toene/zwitschern.mp3": Buffer.alloc(9000) } : {}) }];
check(pruefen(paket("kunde-ton", ...ton("kunde-ton", 1.0))).fehler.length === 0, "Signalton 1,0 s mit MP3-Rückfall besteht");
fall("Signalton zu lang", "kunde-lang", ...ton("kunde-lang", 2.5), null, "erlaubt 0.5–1.5 s");
fall("MP3-Rückfall fehlt", "kunde-mp3", ...ton("kunde-mp3", 1.0, false), null, "rueckfall");

// 6. Kundenfigur in Git wird erkannt
const repo = join(tmp, "repo");
mkdirSync(join(repo, "figuren"), { recursive: true });
execFileSync("git", ["init", "-q", repo]);
const inGit = join(repo, "figuren", "kunde-git");
cpSync(paket("kunde-git", logo("kunde-git"), { "bilder/logo.png": png(800, 400) }), inGit, { recursive: true });
execFileSync("git", ["-C", repo, "add", "figuren"]);
check(has(pruefen(inGit).fehler, "liegt in Git"), "versionierte Kundenfigur wird als Fehler gemeldet");

// 7. Schutz im Repository: .gitignore lässt nur Goch unter figuren/ zu
const ignore = readFileSync(root + ".gitignore", "utf8");
check(/^figuren\/\*$/m.test(ignore) && /^!figuren\/goch\/$/m.test(ignore), ".gitignore: figuren/* außer goch/");
const ignoriert = pfad => { try { execFileSync("git", ["-C", root, "check-ignore", "-q", "--no-index", pfad], { stdio: "ignore" }); return true; } catch { return false; } };
check(ignoriert("figuren/kunde-test/figur.json") && !ignoriert("figuren/goch/figur.json") && !ignoriert("figuren/goch/bilder/vogel.webp"), "eine Kundenfigur unter figuren/ würde ignoriert, Goch nicht");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nPrüfwerkzeug in Ordnung.");
process.exit(fails ? 1 : 0);
