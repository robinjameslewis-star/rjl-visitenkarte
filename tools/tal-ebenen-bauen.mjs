#!/usr/bin/env node
// Talebenen des Landschaftssatzes bauen: Höhenzüge (mitte), Hang (hang) und Talgrund (grund) für Herbst und Winter.
// Gerechnete Vorlage (tools/tal-ebenen-malen.html), bis gemalte Ebenen über die Redaktion kommen. Schreibt je Ebene und
// Jahreszeit zwei WebP-Breiten nach assets/landschaften/<satz>/ und trägt sie in landschaft.json ein – derselbe Ort und
// dieselbe Form wie die Redaktion (ohne AVIF). Größen und Budgets kommen aus landscape.js (LAYERS).
//   node tools/tal-ebenen-bauen.mjs [satz]        Standard: burgberg-herbst
// Braucht Chrome (Pfad über CHROME=… änderbar). Gleiche Eingaben ergeben gleiche Bilder.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const landscape = createRequire(import.meta.url)(root + "landscape.js");
const EBENEN = ["mitte", "hang", "grund"], satz = process.argv[2] || "burgberg-herbst";
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(satz)) throw new Error("Ungültiger Satz: " + satz);
const dir = `${root}${landscape.SET_DIR}${satz}/`, beschreibung = dir + "landschaft.json";
if (!existsSync(beschreibung)) throw new Error("Satz nicht gefunden: " + beschreibung);
const { sizes, budget } = landscape.LAYERS.mitte;
for (const e of EBENEN) if (String(landscape.LAYERS[e].sizes) !== String(sizes) || landscape.LAYERS[e].budget !== budget) throw new Error("Talebenen brauchen dieselben Größen und dasselbe Budget.");

const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const seite = pathToFileURL(root + "tools/tal-ebenen-malen.html").href + "?budget=" + budget + "&breiten=" + sizes.join(",");
const dom = execFileSync(chrome, ["--headless=new", "--disable-gpu", "--virtual-time-budget=60000", "--dump-dom", seite], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!m || !m[1].trim()) throw new Error("Die Seite hat keine Bilder geliefert.");
const bilder = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));

const set = JSON.parse(readFileSync(beschreibung, "utf8"));
set.ebenen = set.ebenen || {};
for (const [name, je] of Object.entries(bilder)) {
  const [ebene, jahr] = name.split("-");
  if (!EBENEN.includes(ebene) || !landscape.SEASONS.includes(jahr)) throw new Error("Unerwartetes Bild: " + name);
  for (const breite of sizes) {
    const b = je[breite]; if (!b) throw new Error(`${name}: Breite ${breite} fehlt.`);
    if (b.ueber) throw new Error(`${name}-${breite}: auch stark verdichtet ${b.bytes} Bytes, Budget ${budget}.`);
    const daten = Buffer.from(b.url.split(",")[1], "base64");
    if (daten.length > budget) throw new Error(`${name}-${breite}: ${daten.length} Bytes über dem Budget von ${budget}.`);
    writeFileSync(`${dir}${ebene}-${jahr}-${breite}.webp`, daten);
    console.log(`${ebene}-${jahr}-${breite}.webp  ${String(Math.round(daten.length / 1024)).padStart(4)} KB  (Güte ${b.q})`);
  }
  set.ebenen[jahr] = { ...set.ebenen[jahr], [ebene]: { avif: false, bytes: Buffer.from(je[sizes[0]].url.split(",")[1], "base64").length } };
}
writeFileSync(beschreibung, JSON.stringify(landscape.normalizeSet(set), null, 2) + "\n");
console.log("landschaft.json aktualisiert: " + beschreibung.slice(root.length));
