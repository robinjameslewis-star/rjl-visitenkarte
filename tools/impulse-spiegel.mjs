#!/usr/bin/env node
// Veröffentlichte Blogbeiträge als Notizen in einen Obsidian-Ordner spiegeln, damit Copilot for Obsidian sie als Grundlage
// nutzen kann (Anschluss an frühere Impulse, keine Wiederholungen). Liest die Quellen öffentlich von GitHub (main),
// schreibt nur Beiträge mit status: published. Entwürfe bleiben draußen. Nichts wird gelöscht.
//   node tools/impulse-spiegel.mjs "<Vault>/10_Projects/robin_vision/Impulse/Veroeffentlicht"
import { parsePost } from "../worker/src/blog.js";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = "robinjameslewis-star/rjl-visitenkarte", SITE = "https://robin.vision/";
const target = process.argv[2];
if (!target) { console.error("Zielordner fehlt."); process.exit(1); }
mkdirSync(target, { recursive: true });

const list = await (await fetch(`https://api.github.com/repos/${REPO}/contents/blog/posts?ref=main`, { headers: { "User-Agent": "impulse-spiegel" } })).json();
if (!Array.isArray(list)) { console.error("GitHub antwortet nicht wie erwartet:", list.message || list); process.exit(1); }

const today = new Date().toISOString().slice(0, 10), seen = new Set();
const q = s => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
for (const f of list.filter(f => f.type === "file" && f.name.endsWith(".md"))) {
  const post = parsePost(await (await fetch(f.download_url)).text(), f.name.slice(0, -3));
  if (post.status !== "published") continue;
  seen.add(post.slug);
  const en = post.lang === "en", url = `${SITE}blog/${post.slug}/`;
  const body = post.body.replace(/!\[([^\]]*)\]\((bilder\/[a-z0-9._-]+)\)/gi, (m, alt, p) => `![${alt}](${SITE}blog/${p})`); // Bilder in Obsidian sichtbar
  const file = join(target, `${post.slug}.md`);
  const created = existsSync(file) ? (readFileSync(file, "utf8").match(/^erstellt: (\S+)/m) || [])[1] || today : today;
  const note = `---
titel: ${q(post.title)}
typ: referenz
status: erledigt
bereich: selbststaendigkeit
erstellt: ${created}
aktualisiert: ${today}
datum: ${post.date}
sprache: ${post.lang}
url: ${url}
kurzfassung: ${q(post.summary)}
tags: [${en ? "impuls-veroeffentlicht-en" : "impuls-veroeffentlicht"}]
quellen: [${q(`Veröffentlichter Beitrag, gespiegelt aus GitHub ${REPO}/blog/posts/${f.name}`)}]
---

# ${post.title}

> Automatisch gespiegelt von ${url} – hier nicht bearbeiten, Änderungen in der Redaktion.

${body}
`;
  const old = existsSync(file) ? readFileSync(file, "utf8").replace(/^aktualisiert: .*$/m, "") : null;
  if (old === note.replace(/^aktualisiert: .*$/m, "")) { console.log("  unverändert ", post.slug); continue; }
  writeFileSync(file, note);
  console.log(old ? "  aktualisiert " : "  neu         ", post.slug);
}
for (const n of readdirSync(target).filter(n => n.endsWith(".md") && !seen.has(n.slice(0, -3))))
  console.log("  nicht mehr veröffentlicht (bleibt liegen):", n);
