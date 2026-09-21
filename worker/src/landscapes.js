// Landschaften der Startseite: ein Satz = Bilder je Ebene (ferne, krone) und Jahreszeit, dazu Blätterart und
// Himmelsfarben. Speicher ist das Repository: assets/landschaften/<satz>/landschaft.json und daneben
// <ebene>-<jahreszeit>-<breite>.webp (Ferne 1400/800, Krone 1000/560). Die Bilder bereitet der Browser der
// Redaktion auf (Weiß → Transparenz, Beschnitt, zwei Größen, WebP); hier wird nur geprüft und committet.
// Beschreibung und Standardwerte (normalizeSet, Größen, Budgets) teilt sich der Worker mit der Seite: landscape.js.
import * as gh from "./github.js";
import landscape from "../../landscape.js";
export { landscape }; // normalizeSet, SEASONS, LAYERS, DEFAULT_SET – dieselbe Fassung wie im Browser

export const DIR = landscape.SET_DIR.replace(/\/$/, "");
export const DEFAULT_SLUG = "burgberg-herbst";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEASON_NAMES = { herbst: "Herbst", winter: "Winter", fruehling: "Frühling", sommer: "Sommer" };
const LAYER_NAMES = { ferne: "Ferne", krone: "Krone" };
const fail = msg => { const e = new Error(msg); e.status = 400; throw e; };

export function slugify(s) {
  return String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
const checkSlug = s => { s = String(s || ""); if (!SLUG.test(s) || s.length > 40) fail("Ungültiger Name der Landschaft."); return s; };
const checkSeason = s => { if (!landscape.SEASONS.includes(s)) fail("Unbekannte Jahreszeit."); return s; };
const checkLayer = s => { if (!landscape.LAYERS[s]) fail("Unbekannte Ebene."); return s; };
const filePath = (slug, layer, season, width, ext = "webp") => `${DIR}/${slug}/${layer}-${season}-${width}.${ext}`;

// WebP-Daten prüfen: Base64, Kennung RIFF…WEBP, Größenbudget der Ebene (gilt für beide Größen).
function checkWebp(data, limit, label) {
  const b64 = String(data || "").replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  if (!b64 || !/^[A-Za-z0-9+/=]+$/.test(b64)) fail(`${label}: keine Bilddaten erhalten.`);
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const tag = (a, b) => String.fromCharCode(...bytes.slice(a, b));
  if (bytes.length < 100 || tag(0, 4) !== "RIFF" || tag(8, 12) !== "WEBP") fail(`${label}: kein WebP.`);
  if (bytes.length > limit) fail(`${label}: ${Math.round(bytes.length / 1024)} KB überschreiten das Budget von ${Math.round(limit / 1024)} KB.`);
  return { base64: b64, bytes: bytes.length };
}

// Alle Sätze aus dem Ordner lesen (ein Ordner je Satz mit landschaft.json). Ohne GitHub: leer.
export async function listSets(env) {
  if (!gh.configured(env)) return [];
  const sets = [];
  for (const d of await gh.listDir(env, DIR)) {
    if (d.type !== "dir" || !SLUG.test(d.name)) continue;
    const f = await gh.getFile(env, `${DIR}/${d.name}/landschaft.json`);
    let raw = null; try { raw = f && JSON.parse(f.content); } catch { raw = null; }
    sets.push({ slug: d.name, ...landscape.normalizeSet(raw), beschreibung: !!f });
  }
  return sets.sort((a, b) => a.slug === DEFAULT_SLUG ? -1 : b.slug === DEFAULT_SLUG ? 1 : a.name.localeCompare(b.name, "de"));
}
async function readSet(env, slug) {
  const f = await gh.getFile(env, `${DIR}/${slug}/landschaft.json`);
  let raw = null; try { raw = f && JSON.parse(f.content); } catch { raw = null; }
  return { exists: !!f, set: landscape.normalizeSet(raw) };
}
const compose = set => JSON.stringify({ name: set.name, ebenen: set.ebenen, blaetter: set.blaetter, himmel: set.himmel }, null, 2) + "\n";

// Satz anlegen oder Name, Blätterart und Himmelsfarben ändern (die Bilder bleiben).
export async function saveSet(env, body) {
  const name = String(body.name || "").trim().slice(0, 80);
  if (!name) fail("Bitte einen Namen für die Landschaft angeben.");
  const slug = checkSlug(body.slug || slugify(name));
  const { exists, set } = await readSet(env, slug);
  if (!exists && body.neu === false) fail("Diese Landschaft gibt es nicht mehr.");
  if (exists && body.neu === true) fail(`„${slug}“ gibt es schon – bitte einen anderen Namen wählen.`);
  const next = landscape.normalizeSet({ ...set, name, blaetter: body.blaetter || set.blaetter, himmel: body.himmel || set.himmel, ebenen: set.ebenen });
  const c = await gh.commitFiles(env, [{ path: `${DIR}/${slug}/landschaft.json`, content: compose(next) }],
    exists ? `Redaktion: Landschaft „${name}“ geändert` : `Redaktion: Landschaft „${name}“ angelegt`);
  return { slug, commit: c.url };
}

// Eine Ebene einer Jahreszeit speichern: zwei WebP-Größen und die Beschreibung in einem Commit.
export async function saveLayer(env, body) {
  const slug = checkSlug(body.slug), layer = checkLayer(String(body.ebene || "")), season = checkSeason(String(body.saison || ""));
  const { exists, set } = await readSet(env, slug);
  if (!exists) fail("Bitte die Landschaft zuerst anlegen (Name speichern).");
  const { sizes, budget } = landscape.LAYERS[layer], images = body.bilder || {};
  const big = checkWebp(images[sizes[0]], budget, `${LAYER_NAMES[layer]} ${sizes[0]} px`);
  const small = checkWebp(images[sizes[1]], budget, `${LAYER_NAMES[layer]} ${sizes[1]} px`);
  const before = (set.ebenen[season] || {})[layer];
  const changes = [
    { path: filePath(slug, layer, season, sizes[0]), base64: big.base64 },
    { path: filePath(slug, layer, season, sizes[1]), base64: small.base64 },
  ];
  if (before && before.avif) sizes.forEach(w => changes.push({ path: filePath(slug, layer, season, w, "avif"), delete: true })); // altes AVIF passt nicht mehr zum neuen Bild
  set.ebenen[season] = { ...set.ebenen[season], [layer]: { avif: false, bytes: big.bytes } };
  changes.push({ path: `${DIR}/${slug}/landschaft.json`, content: compose(set) });
  const c = await gh.commitFiles(env, changes, `Redaktion: Landschaft „${set.name || slug}“ – ${LAYER_NAMES[layer]} ${SEASON_NAMES[season]} gespeichert`);
  return { slug, commit: c.url, bytes: big.bytes };
}

// Eine Ebene einer Jahreszeit entfernen (Bilder und Eintrag).
export async function deleteLayer(env, body) {
  const slug = checkSlug(body.slug), layer = checkLayer(String(body.ebene || "")), season = checkSeason(String(body.saison || ""));
  const { exists, set } = await readSet(env, slug);
  const before = exists && (set.ebenen[season] || {})[layer];
  if (!before) fail("Diese Ebene gibt es nicht.");
  const changes = [];
  landscape.LAYERS[layer].sizes.forEach(w => { changes.push({ path: filePath(slug, layer, season, w), delete: true }); if (before.avif) changes.push({ path: filePath(slug, layer, season, w, "avif"), delete: true }); });
  delete set.ebenen[season][layer]; if (!Object.keys(set.ebenen[season]).length) delete set.ebenen[season];
  changes.push({ path: `${DIR}/${slug}/landschaft.json`, content: compose(set) });
  const c = await gh.commitFiles(env, changes, `Redaktion: Landschaft „${set.name || slug}“ – ${LAYER_NAMES[layer]} ${SEASON_NAMES[season]} entfernt`);
  return { slug, commit: c.url };
}

// Einen ganzen Satz entfernen – nie den aktiven. Der Verlauf auf GitHub behält alles.
export async function deleteSet(env, slug, activeSlug) {
  slug = checkSlug(slug);
  if (slug === activeSlug) fail("Die aktive Landschaft kann nicht gelöscht werden – erst eine andere veröffentlichen.");
  const files = await gh.listDir(env, `${DIR}/${slug}`);
  if (!files.length) fail("Diese Landschaft gibt es nicht.");
  const c = await gh.commitFiles(env, files.filter(f => f.type === "file").map(f => ({ path: f.path, delete: true })), `Redaktion: Landschaft „${slug}“ gelöscht`);
  return { commit: c.url };
}
