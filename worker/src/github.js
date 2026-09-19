// GitHub als Speicher für Inhalte, die Robin im Dashboard pflegt. Das Repository ist die Quelle
// (Historie, Rückfallebene, GitHub Pages baut daraus); der KV des Workers ist nur ein Zwischenspeicher,
// damit Goch nicht bei jeder Frage zu GitHub muss. Braucht GITHUB_TOKEN (fein abgestuft, nur dieses
// Repository, nur „Contents: Read and write“) als Worker-Geheimnis und GITHUB_REPO / GITHUB_BRANCH.

const API = "https://api.github.com";

export function configured(env) { return !!(env.GITHUB_TOKEN && env.GITHUB_REPO); }

function headers(env) {
  return { "authorization": "Bearer " + env.GITHUB_TOKEN, "accept": "application/vnd.github+json",
    "x-github-api-version": "2022-11-28", "user-agent": "rjl-goch-dashboard" };
}
async function call(env, method, path, body) {
  const r = await fetch(API + path, { method, headers: { ...headers(env), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data && data.message ? data.message : "HTTP " + r.status;
    const e = new Error(r.status === 401 || r.status === 403 ? "GitHub lehnt den Schlüssel ab (" + msg + ")." :
      r.status === 404 ? "GitHub: Datei oder Repository nicht gefunden (" + msg + ")." :
      r.status === 409 ? "GitHub: Die Datei wurde zwischenzeitlich geändert – Seite neu laden." : "GitHub: " + msg);
    e.status = r.status; throw e;
  }
  return data;
}

// UTF-8 sicher nach und von Base64 (atob/btoa allein können keine Umlaute).
const encode = s => { const b = new TextEncoder().encode(s); let out = ""; for (const x of b) out += String.fromCharCode(x); return btoa(out); };
const decode = b64 => { const s = atob(b64.replace(/\n/g, "")); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new TextDecoder().decode(b); };

// Datei lesen: { content, sha } – oder null, wenn sie nicht existiert.
export async function getFile(env, path, ref) {
  try {
    const d = await call(env, "GET", `/repos/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(ref || env.GITHUB_BRANCH || "main")}`);
    return { content: decode(d.content || ""), sha: d.sha };
  } catch (e) { if (e.status === 404) return null; throw e; }
}

// Datei schreiben (anlegen oder ersetzen). sha der bekannten Fassung verhindert, dass eine fremde
// Änderung stillschweigend überschrieben wird. Liefert die Commit-Angaben.
export async function putFile(env, path, content, message, sha) {
  const d = await call(env, "PUT", `/repos/${env.GITHUB_REPO}/contents/${path}`, {
    message, content: encode(content), branch: env.GITHUB_BRANCH || "main", ...(sha ? { sha } : {}),
  });
  return { sha: d.content && d.content.sha, commit: d.commit && d.commit.sha, url: d.commit && d.commit.html_url };
}

// Letzte Commits, die eine Datei berührt haben (neueste zuerst).
export async function history(env, path, n = 2) {
  const d = await call(env, "GET", `/repos/${env.GITHUB_REPO}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(env.GITHUB_BRANCH || "main")}&per_page=${n}`);
  return (Array.isArray(d) ? d : []).map(c => ({ sha: c.sha, date: c.commit && c.commit.author && c.commit.author.date,
    message: (c.commit && c.commit.message || "").split("\n")[0], url: c.html_url }));
}

// Rohfassung ohne Schlüssel (öffentliches Repository) – für den Zwischenspeicher-Abgleich im Chat.
export async function raw(env, path) {
  const r = await fetch(`https://raw.githubusercontent.com/${env.GITHUB_REPO}/${env.GITHUB_BRANCH || "main"}/${path}`,
    { headers: { "user-agent": "rjl-goch" }, cf: { cacheTtl: 60, cacheEverything: true } });
  return r.ok ? await r.text() : null;
}

export function historyUrl(env, path) {
  return `https://github.com/${env.GITHUB_REPO}/commits/${env.GITHUB_BRANCH || "main"}/${path}`;
}

// Ordnerinhalt: [{ name, type: "file"|"dir", path, sha }] – oder [] wenn der Ordner fehlt.
export async function listDir(env, path) {
  try {
    const d = await call(env, "GET", `/repos/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(env.GITHUB_BRANCH || "main")}`);
    return Array.isArray(d) ? d.map(e => ({ name: e.name, type: e.type, path: e.path, sha: e.sha, size: e.size })) : [];
  } catch (e) { if (e.status === 404) return []; throw e; }
}

// Mehrere Dateien in einem Commit (Git-Data-API): changes = [{ path, content } | { path, base64 } | { path, delete: true }].
// Ein Commit statt vieler, damit Liste, Beitrag, Feed und Startseite immer zusammenpassen. Binäres (Bilder)
// geht als eigener Blob mit Base64.
export async function commitFiles(env, changes, message) {
  const repo = env.GITHUB_REPO, branch = env.GITHUB_BRANCH || "main";
  const ref = await call(env, "GET", `/repos/${repo}/git/ref/heads/${branch}`);
  const head = ref.object.sha;
  const base = await call(env, "GET", `/repos/${repo}/git/commits/${head}`);
  const tree = [];
  for (const c of changes) {
    if (c.delete) tree.push({ path: c.path, mode: "100644", type: "blob", sha: null });
    else if (c.base64) { const b = await call(env, "POST", `/repos/${repo}/git/blobs`, { content: c.base64, encoding: "base64" }); tree.push({ path: c.path, mode: "100644", type: "blob", sha: b.sha }); }
    else tree.push({ path: c.path, mode: "100644", type: "blob", content: c.content });
  }
  const newTree = await call(env, "POST", `/repos/${repo}/git/trees`, { base_tree: base.tree.sha, tree });
  const commit = await call(env, "POST", `/repos/${repo}/git/commits`, { message, tree: newTree.sha, parents: [head] });
  await call(env, "PATCH", `/repos/${repo}/git/refs/heads/${branch}`, { sha: commit.sha });
  return { sha: commit.sha, url: `https://github.com/${repo}/commit/${commit.sha}` };
}
