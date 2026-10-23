// Frei lizenzierte Testdaten für den Abgleich mit der offiziellen Prüfung holen (nur für Tests, nicht ausgeliefert):
//   cd tools/erechnung && node testdaten-holen.mjs
// Release-Archive mit festgeschriebener Prüfsumme, Repositories auf festem Commit. Ziel: .cache/testdaten/<name>/
//   KoSIT XRechnung-Testsuite 2026-08-31 (Apache 2.0), CEN-Beispiele EN 16931 1.3.16 (EUPL 1.2), CEN-Unit-Tests (EUPL 1.2),
//   Testfälle des XRechnung-Schematrons und der Validator-Konfiguration (Apache 2.0).
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL = join(HIER, ".cache", "testdaten");
const ARCHIVE = [
  { name: "kosit-testsuite", url: "https://github.com/itplr-kosit/xrechnung-testsuite/releases/download/v2026-08-31/xrechnung-3.0.2-testsuite-2026-08-31.zip", sha256: "1e81ef7563e0fa04c0e0b0631318a7e0843a3c0beb57d83ef95ac0c4a095e3d7" },
  { name: "cen-ubl-1.3.16", url: "https://github.com/ConnectingEurope/eInvoicing-EN16931/releases/download/validation-1.3.16/en16931-ubl-1.3.16.zip", sha256: "bafada015efbc5248bf5e05ad2191e1d9833ef96e9dd5f4bce420a747342da85" },
  { name: "cen-cii-1.3.16", url: "https://github.com/ConnectingEurope/eInvoicing-EN16931/releases/download/validation-1.3.16/en16931-cii-1.3.16.zip", sha256: "1cd53cb8a84d38aedc82c0caede217da983a7934dd663f793a092fd66443c561" },
];
const REPOS = [
  { name: "cen-repo", url: "https://github.com/ConnectingEurope/eInvoicing-EN16931.git", commit: "6e35e0ab8b09eb183f7d84b282e24ef95f9f5715" },
  { name: "xrechnung-schematron", url: "https://github.com/itplr-kosit/xrechnung-schematron.git", commit: "7e3ddbe224674427fd174a8406635708b0d50ed1" },
  { name: "validator-konfiguration", url: "https://github.com/itplr-kosit/validator-configuration-xrechnung.git", commit: "bd160dc19ba7a1f5b73c148a7fff60bf111ab590" },
];
mkdirSync(ZIEL, { recursive: true });
for (const a of ARCHIVE) {
  const zip = join(ZIEL, `${a.name}.zip`), ordner = join(ZIEL, a.name);
  if (!existsSync(zip)) { const r = await fetch(a.url); if (!r.ok) throw new Error(`${a.url}: HTTP ${r.status}`); writeFileSync(zip, Buffer.from(await r.arrayBuffer())); }
  const sha = createHash("sha256").update(readFileSync(zip)).digest("hex");
  if (sha !== a.sha256) throw new Error(`Prüfsumme stimmt nicht: ${zip}`);
  if (!existsSync(ordner)) { mkdirSync(ordner); execFileSync("unzip", ["-q", zip, "-d", ordner]); }
  console.log("ok", a.name);
}
for (const r of REPOS) {
  const ordner = join(ZIEL, r.name);
  if (!existsSync(ordner)) execFileSync("git", ["clone", "-q", "--no-checkout", r.url, ordner]);
  execFileSync("git", ["-C", ordner, "checkout", "-q", r.commit]);
  const kopf = execFileSync("git", ["-C", ordner, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (kopf !== r.commit) throw new Error(`${r.name}: falscher Stand ${kopf}`);
  console.log("ok", r.name, r.commit.slice(0, 7));
}
