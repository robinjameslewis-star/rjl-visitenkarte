#!/usr/bin/env node
// Agentenbetrieb auf Robins Mac (Robin 17.11.2026): ruft die Agenten-API der Goch-Redaktion auf (worker/src/agent.js).
// Der Schlüssel liegt nur im macOS-Schlüsselbund (Dienst vision.robin.goch-agent) und wird hier gelesen – nie ausgegeben, nie in eine
// Datei geschrieben und nie als Argument an ein anderes Programm gegeben. Einrichten: worker/README.md, Abschnitt „Agentenschlüssel“.
//
//   node tools/goch-agent.mjs hilfe                                   alle Aktionen mit Stufe
//   node tools/goch-agent.mjs <aktion> ['{"art":"aktuell"}']           eine Aktion, Parameter als JSON
//   node tools/goch-agent.mjs <aktion> @parameter.json                Parameter aus einer Datei (z. B. ganzes Profil)
//
// Ziel: https://goch.robin.vision (AGENT_URL ändert es; unverschlüsselt nur an den eigenen Rechner, für Tests).
// Es gibt nur Stufe 1 (der Agent handelt selbst, alles steht im Protokoll der Redaktion); Stufe 3 gibt es über den Schlüssel nicht.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [aktion, roh, ...rest] = process.argv.slice(2);
const DIENST = "vision.robin.goch-agent";
const BASIS = (process.env.AGENT_URL || "https://goch.robin.vision").replace(/\/+$/, "");

const fehler = (text, code = 1) => { process.stderr.write(`${text}\n`); process.exit(code); };
if (!aktion || !/^[a-z_]{2,40}$/.test(aktion) || rest.length) fehler("Aufruf: node tools/goch-agent.mjs <aktion> [json | @datei.json]   (Übersicht: node tools/goch-agent.mjs hilfe)", 2);
// Den Schlüssel nur verschlüsselt verschicken: https, unverschlüsselt allein an den eigenen Rechner (Tests)
let ziel;
try { ziel = new URL(BASIS); } catch { fehler("AGENT_URL ist keine gültige Adresse.", 2); }
if (!(ziel.protocol === "https:" || (ziel.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(ziel.hostname)))) fehler("Der Schlüssel geht nur über https hinaus.", 2);

let parameter = {};
try {
  const text = !roh ? "{}" : roh.startsWith("@") ? readFileSync(roh.slice(1), "utf8") : roh;
  parameter = JSON.parse(text);
  if (!parameter || typeof parameter !== "object" || Array.isArray(parameter)) throw new Error();
} catch { fehler("Parameter bitte als JSON-Objekt, z. B. '{\"art\":\"aktuell\"}' oder @datei.json.", 2); }

// Schlüssel aus dem Schlüsselbund. Fehlermeldungen von security gehen nicht weiter (sie könnten den Wert enthalten).
let schluessel = "";
try {
  schluessel = execFileSync("security", ["find-generic-password", "-s", DIENST, "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
} catch { schluessel = ""; }
if (!/^gochag_[A-Za-z0-9_-]{43}$/.test(schluessel)) fehler(`Kein gültiger Agentenschlüssel im Schlüsselbund (Dienst ${DIENST}). Einrichten: worker/README.md, Abschnitt „Agentenschlüssel“.`, 3);
const ohneSchluessel = text => String(text).split(schluessel).join("[Schlüssel]");

let res, text;
try {
  // redirect: "manual" – eine Weiterleitung darf den Kopf mit dem Schlüssel nicht an eine andere Adresse tragen
  res = await fetch(`${BASIS}/admin/agent/${aktion}`, { method: "POST", headers: { Authorization: `Bearer ${schluessel}`, "Content-Type": "application/json" },
    body: JSON.stringify(parameter), redirect: "manual" });
  text = await res.text();
} catch (e) {
  fehler(ohneSchluessel(`Keine Verbindung zu ${BASIS} (${(e && e.cause && e.cause.code) || (e && e.name) || "Fehler"}).`), 4);
}
let daten = null;
try { daten = JSON.parse(text); } catch { daten = null; }
if (!res.ok) fehler(ohneSchluessel(`${res.status}: ${daten && daten.error ? daten.error : res.status === 404 && !daten ? "nicht gefunden (Agent-API ausgeschaltet?)" : "unerwartete Antwort"}`), 1);

if (aktion === "hilfe" && daten && Array.isArray(daten.ergebnis)) {
  const zeilen = daten.ergebnis.map(a => `  Stufe ${a.stufe}  ${String(a.aktion).padEnd(18)} ${a.titel}${a.parameter ? `\n${" ".repeat(29)}Parameter: ${a.parameter}` : ""}`);
  process.stdout.write(ohneSchluessel(`Aktionen der Goch-Redaktion (nur Stufe 1: der Agent handelt selbst, alles im Protokoll; Stufe 3 gibt es hier nicht)\n${zeilen.join("\n")}\n`));
} else {
  process.stdout.write(ohneSchluessel(`${JSON.stringify(daten ?? text, null, 2)}\n`));
}
