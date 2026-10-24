// Gemeinsame Hilfen der Tests für SmartFormular E-Rechnung lite: statischer Server für das Repository (wie GitHub Pages, ohne
// Weiterleitungen), Chrome über playwright-core (installiert in tools/erechnung, kein eigener Browser-Download) und Prüfung, wohin
// eine Seite Anfragen schickt.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

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
