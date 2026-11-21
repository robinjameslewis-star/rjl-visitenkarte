// Hilfe für Robin zu worker/LIZENZ_SCHLUESSEL.md – läuft nur lokal im eigenen Terminal, spricht mit keinem Netz.
// Gibt nie den privaten Teil aus, nur die Kennung (kid, öffentlich) und „ok“.
//   node lizenz-schluessel.mjs neu <datei>      neuen Schlüssel erzeugen und als privaten JWK in <datei> schreiben (nur für den Besitzer lesbar)
//   node lizenz-schluessel.mjs pruefen <datei>  Sicherung oder Schlüsseldatei prüfen: Probe signieren und prüfen, Kennung zeigen
// <datei> darf eine Sicherung des KV-Eintrags lizenz:schluessel sein ({ privat, oeffentlich, … }) oder ein privater JWK.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const P256 = { name: "ECDSA", namedCurve: "P-256" }, ALG = { name: "ECDSA", hash: "SHA-256" };
const kennung = ({ crv, kty, x, y }) => createHash("sha256").update(JSON.stringify({ crv, kty, x, y })).digest("base64url");
const [aktion, datei] = process.argv.slice(2);
const ende = (text, code = 1) => { console.log(text); process.exit(code); };
if (!datei || !["neu", "pruefen"].includes(aktion)) ende("Aufruf: node lizenz-schluessel.mjs neu|pruefen <datei>");

if (aktion === "neu") {
  if (existsSync(datei)) ende("Die Datei gibt es schon – nichts überschrieben.");
  const paar = await crypto.subtle.generateKey(P256, true, ["sign", "verify"]);
  const { kty, crv, x, y, d } = await crypto.subtle.exportKey("jwk", paar.privateKey);
  writeFileSync(datei, JSON.stringify({ kty, crv, x, y, d }), { mode: 0o600, flag: "wx" });
  ende(`Neuer Schlüssel geschrieben. Kennung (kid): ${kennung({ kty, crv, x, y })}`, 0);
}

let j; try { j = JSON.parse(readFileSync(datei, "utf8")); } catch { ende("Datei nicht lesbar oder kein JSON."); }
const privat = j && j.privat ? j.privat : j, oeff = j && j.oeffentlich ? j.oeffentlich : privat;
if (!privat || privat.kty !== "EC" || privat.crv !== "P-256" || typeof privat.d !== "string" || !oeff || oeff.x !== privat.x || oeff.y !== privat.y) ende("Kein vollständiger P-256-Schlüssel (privater und öffentlicher Teil passen nicht zusammen).");
try {
  const { kty, crv, x, y, d } = privat, probe = new TextEncoder().encode("lizenz-schluessel-probe");
  const sig = await crypto.subtle.sign(ALG, await crypto.subtle.importKey("jwk", { kty, crv, x, y, d }, P256, false, ["sign"]), probe);
  if (!await crypto.subtle.verify(ALG, await crypto.subtle.importKey("jwk", { kty, crv, x, y }, P256, false, ["verify"]), sig, probe)) throw new Error();
} catch { ende("Probe gescheitert: Der private Teil passt nicht zum öffentlichen."); }
ende(`ok – Kennung (kid): ${kennung(oeff)}`, 0);
