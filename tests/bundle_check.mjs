// Prüft das GEBÜNDELTE Worker-Paket (so, wie wrangler es hochlädt), nicht den Quelltext:
// 1. makeRenderer() aus dem Bündel läuft in einem fremden Kontext ohne Bündler-Helfer (wie im Browser der Redaktion),
// 2. das Seitenskript der Redaktion ist syntaktisch in Ordnung.
// Lauf vor jedem Deploy:  node tests/bundle_check.mjs        (baut mit `wrangler deploy --dry-run`)
import { execSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "rjl-bundle-"));
execSync(`npx wrangler deploy --dry-run --outdir "${out}"`, { cwd: join(root, "worker"), stdio: "pipe" });
const bundle = readFileSync(join(out, "index.js"), "utf8");

// makeRenderer aus dem Bündel herausschneiden (bis zur ersten Zeile, die nur aus "}" besteht)
const start = bundle.indexOf("function makeRenderer()");
if (start < 0) throw new Error("makeRenderer nicht im Bündel gefunden");
const end = bundle.indexOf("\n}\n", start);
const src = bundle.slice(start, end + 2);
let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };

// In einem leeren Kontext ausführen – dort gibt es kein __name, kein __defProp, nichts vom Bündler
let R = null, err = "";
try { R = vm.runInNewContext(`(${src})()`, {}); } catch (e) { err = e.message; }
check(R && typeof R.renderMarkdown === "function", "makeRenderer läuft ohne Bündler-Helfer", err);
if (R) {
  const html = R.renderMarkdown("## T\n\n**a** *b*\n\n> [K](https://x.y/z)\n> s\n\nhttps://youtu.be/dQw4w9WgXcQ\nV", "https://s/blog/", "de");
  check(/<h2>T<\/h2>/.test(html) && /<strong>a<\/strong> <em>b<\/em>/.test(html), "rendert Überschrift, fett, kursiv");
  check(/class="ref" href="https:\/\/x\.y\/z"/.test(html), "rendert Verweis-Karte");
  check(/class="yt" data-video="dQw4w9WgXcQ"/.test(html), "rendert Video-Platzhalter");
  check(R.dateText("2026-09-19", "de") === "19. September 2026", "dateText");
}
check(!/__name\(/.test(src), "kein __name im eingebetteten Renderer (keep_names = false in wrangler.toml)");

// Seitenskript der Redaktion aus dem Quelltext prüfen (PAGE ist exportiert)
const { PAGE } = await import(join(root, "worker/src/admin.js"));
const scripts = [...PAGE.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let synErr = "";
try { for (const sc of scripts) new Function(sc); } catch (e) { synErr = e.message; }
check(scripts.length === 1 && !synErr, "Seitenskript der Redaktion syntaktisch ok", synErr);

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen – NICHT deployen.` : "\nBündel in Ordnung.");
process.exit(fails ? 1 : 0);
