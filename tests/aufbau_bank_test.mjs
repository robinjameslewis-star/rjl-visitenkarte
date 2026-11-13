// Freiwillige Bankangabe beim „Aufbau senden“ (worker/src/aufbau.js): nur Banknamen, nichts, was in Betreff oder Text
// der Mail einen Link, eine Adresse oder eine Telefonnummer transportiert (Robin, 13.11.2026).
// Aufruf: node tests/aufbau_bank_test.mjs
import { bankAngabe, aufbauBereinigen, pruefeAufbau } from "../worker/src/aufbau.js";
import { readFileSync } from "node:fs";
let fehler = 0;
const pruefe = (ein, aus) => { const ist = bankAngabe(ein); const ok = ist === aus; if (!ok) fehler++; console.log(`${ok ? "ok   " : "FEHLER"} ${JSON.stringify(ein)} → ${JSON.stringify(ist)}`); };
for (const n of ["Sparkasse Zollernalb", "Volksbank Hohenzollern-Balingen", "N26", "1822direkt", "Deutsche Bank", "ING", "Crédit Agricole", "Raiffeisenbank (Rheinland)", "Bank & Co.", "  Wise  "]) pruefe(n, n.trim());
pruefe("Bank\nZeile", "Bank Zeile"); // Zeilenumbruch wird zum Leerzeichen, kein zweiter Kopf in der Mail
for (const b of ["https://boese.example", "www.boese.de", "boese.com", "Ruf an 0151 68466088", "bank@example.org", "Sparkasse <script>", "x".repeat(41), "Bank; DROP", "//boese", "Bank: hier klicken", null, undefined, ""]) pruefe(b, "");
// Anhang: versteckte und buchstabenähnliche Zeichen werden zu „?“ (Robin, 13.11.2026)
const kopf = "Aufbau eines Kontoauszugs, ohne Inhalt: Buchstaben als x/X, Ziffern als 9.\n";
const boese = kopf + "1  700   57  xxx \u200B\u202E ⒾⒼⓃⓄⓇⒺ 🅰🅱 \u0007 xx-99,99 Saldo\n";
const ok1 = pruefeAufbau(boese) === null; // so etwas ginge durch die Prüfung …
const sauber = aufbauBereinigen(boese);
const ok2 = /^[\x20-\x7E\näöüÄÖÜß]*$/.test(sauber) && sauber.includes("xx-99,99 Saldo"); // … kommt aber nur bereinigt an
if (!ok1 || !ok2) fehler++;
console.log(`${ok1 && ok2 ? "ok   " : "FEHLER"} unsichtbare und buchstabenähnliche Zeichen werden im Anhang zu „?“: ${JSON.stringify(sauber.split("\n")[1])}`);
const echt = readFileSync(new URL("daten-aufbau-2026-11-13.txt", import.meta.url), "utf8");
// Der echte Aufbau enthält Steuerzeichen (Zeichensalat einer Schrift ohne Zuordnung): Sie werden zu „?“, Länge, Zeilen,
// Buchstaben (x) und Ziffern (9) bleiben – für die Diagnose reicht das.
const bereinigt = aufbauBereinigen(echt), roh = echt.replace(/\r\n?/g, "\n");
const ok3 = bereinigt.length === roh.length && [...roh].every((z, i) => /[\x20-\x7E\näöüÄÖÜß]/.test(z) ? bereinigt[i] === z : bereinigt[i] === "?") && pruefeAufbau(bereinigt) === null;
if (!ok3) fehler++;
console.log(`${ok3 ? "ok   " : "FEHLER"} echter Aufbau vom 13.11.: nur Steuerzeichen werden zu „?“, alles andere bleibt, Prüfung besteht`);
console.log(fehler ? `${fehler} Fehler` : "Bankangabe und Anhang in Ordnung.");
process.exit(fehler ? 1 : 0);
