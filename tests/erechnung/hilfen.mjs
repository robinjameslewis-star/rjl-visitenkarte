// Gemeinsame Hilfen der Tests für SmartFormular E-Rechnung lite: statischer Server für das Repository (wie GitHub Pages, ohne
// Weiterleitungen), Chrome über playwright-core (installiert in tools/erechnung, kein eigener Browser-Download) und Prüfung, wohin
// eine Seite Anfragen schickt.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { mkdtempSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

export const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const WZ = join(WURZEL, "tools", "erechnung");
const req = createRequire(join(WZ, "package.json"));
export const playwright = () => import(req.resolve("playwright-core"));
export const axePfad = () => req.resolve("axe-core/axe.min.js");

const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".xml": "application/xml", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
const HARNISCH = `<!doctype html><meta charset="utf-8"><title>Prüfkern</title><script src="/assets/erechnung/pruefung.js"></script>`;

// Server auf freiem Port; zusätzliche Seiten über extra (Pfad → Inhalt)
export function server(extra = {}) {
  const s = createServer(async (rq, rs) => {
    const pfad = decodeURIComponent(new URL(rq.url, "http://x").pathname);
    if (pfad === "/__pruefkern__.html") { rs.writeHead(200, { "content-type": TYPEN[".html"] }); return rs.end(HARNISCH); }
    if (extra[pfad]) { rs.writeHead(200, { "content-type": extra[pfad].typ || TYPEN[".html"] }); return rs.end(extra[pfad].inhalt); }
    let datei = join(WURZEL, pfad);
    if (!datei.startsWith(WURZEL)) { rs.writeHead(403); return rs.end(); }
    try {
      if ((await stat(datei)).isDirectory()) datei = join(datei, "index.html");
      const inhalt = await readFile(datei);
      rs.writeHead(200, { "content-type": TYPEN[extname(datei)] || "application/octet-stream" });
      rs.end(inhalt);
    } catch {
      rs.writeHead(404, { "content-type": TYPEN[".html"] });
      rs.end(await readFile(join(WURZEL, "404.html")).catch(() => "404"));
    }
  });
  return new Promise(ok => s.listen(0, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${s.address().port}`, schliessen: () => new Promise(r => s.close(r)) })));
}

export async function chrome() {
  const m = await playwright();
  return (m.chromium || m.default.chromium).launch({ channel: "chrome", headless: true });
}

let fails = 0, oks = 0;
export const check = (ok, label) => { console.log((ok ? "  ok   " : "  FEHLT ") + label); if (ok) oks++; else fails++; };
export const ergebnis = () => ({ fails, oks });

// Seit 20.11.2026 (Umzug auf smartformular.ai) gibt es auf robin.vision keine Werkzeugseite mehr. Die Tests des Werkzeugs öffnen es
// deshalb lokal auf einer Prüfseite mit Rahmen, Stilen und Einbettung der früheren Seite (appPruefseite in worker/src/werkzeug.js)
// – als Zusatzseiten für server(): /__werkzeug__/de/ und /__werkzeug__/en/.
export const WERKZEUG_SEITE = { de: "/__werkzeug__/de/", en: "/__werkzeug__/en/" };
export async function werkzeugSeitenLaden() {
  const { appPruefseite } = await import("../../worker/src/werkzeug.js");
  return { [WERKZEUG_SEITE.de]: { inhalt: appPruefseite("de") }, [WERKZEUG_SEITE.en]: { inhalt: appPruefseite("en") } };
}
export const werkzeugSeiten = () => SEITEN_CACHE;
const SEITEN_CACHE = await werkzeugSeitenLaden();
// Gebaute Werkzeug-Dateien (offline) statt der früheren Dateien unter werkzeuge/: einmal mit bauen.mjs --entwurf in einen Temp-Ordner
let gebaut = null;
export function werkzeugDateien() {
  if (gebaut) return gebaut;
  const tmp = mkdtempSync(join(tmpdir(), "rv-erechnung-datei-"));
  cpSync(join(WURZEL, "assets", "erechnung", "regeln"), join(tmp, "regeln"), { recursive: true });
  execFileSync("node", ["bauen.mjs", "--entwurf"], { cwd: WZ, env: { ...process.env, ERECHNUNG_ZIEL: tmp }, stdio: "pipe" });
  gebaut = { de: join(tmp, "dist", "E-Rechnung-lite.html"), en: join(tmp, "dist", "E-Invoice-Viewer.html"), ordner: tmp };
  return gebaut;
}
