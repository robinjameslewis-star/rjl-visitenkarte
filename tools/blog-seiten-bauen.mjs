// Seiten des Blogs (Impulse) lokal neu bauen – so, wie die Redaktion sie beim Veröffentlichen baut (worker/src/blog.js, buildBlog).
// Nötig, wenn sich der Rahmen der Seiten ändert (etwa Kopf oder Newsletter-Kasten), ohne dass ein Beitrag veröffentlicht wird.
//   node tools/blog-seiten-bauen.mjs
// Schreibt nur Seiten; Löschungen meldet es, führt sie aber nicht aus. Danach: Tests, committen, PR.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseSettings, parsePost, buildBlog, POSTS_DIR, SETTINGS_PATH, IMAGES_DIR } from "../worker/src/blog.js";

const SITE_URL = "https://robin.vision/"; // wie SITE_URL in worker/wrangler.toml
const settings = parseSettings(readFileSync(SETTINGS_PATH, "utf8"));
const posts = readdirSync(POSTS_DIR).filter(n => n.endsWith(".md")).map(n => parsePost(readFileSync(join(POSTS_DIR, n), "utf8"), n.slice(0, -3)));
const eintraege = readdirSync("blog");
const { changes } = buildBlog({
  settings, posts, homepage: readFileSync("index.html", "utf8"), siteUrl: SITE_URL, images: readdirSync(IMAGES_DIR),
  existingDirs: eintraege.filter(n => statSync(join("blog", n)).isDirectory()), existingFiles: eintraege.filter(n => statSync(join("blog", n)).isFile()),
});
for (const c of changes) {
  if (c.delete) { console.log("  (nicht gelöscht)", c.path); continue; }
  const alt = (() => { try { return readFileSync(c.path, "utf8"); } catch { return null; } })();
  if (alt === c.content) continue;
  mkdirSync(dirname(c.path), { recursive: true });
  writeFileSync(c.path, c.content);
  console.log(alt === null ? "  neu         " : "  geändert    ", c.path);
}
