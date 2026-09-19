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
