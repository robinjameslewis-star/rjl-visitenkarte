// Freiwillige Bankangabe beim „Aufbau senden“ (worker/src/aufbau.js): nur Banknamen, nichts, was in Betreff oder Text
// der Mail einen Link, eine Adresse oder eine Telefonnummer transportiert (Robin, 13.11.2026).
// Aufruf: node tests/aufbau_bank_test.mjs
import { bankAngabe } from "../worker/src/aufbau.js";
let fehler = 0;
const pruefe = (ein, aus) => { const ist = bankAngabe(ein); const ok = ist === aus; if (!ok) fehler++; console.log(`${ok ? "ok   " : "FEHLER"} ${JSON.stringify(ein)} → ${JSON.stringify(ist)}`); };
for (const n of ["Sparkasse Zollernalb", "Volksbank Hohenzollern-Balingen", "N26", "1822direkt", "Deutsche Bank", "ING", "Crédit Agricole", "Raiffeisenbank (Rheinland)", "Bank & Co.", "  Wise  "]) pruefe(n, n.trim());
pruefe("Bank\nZeile", "Bank Zeile"); // Zeilenumbruch wird zum Leerzeichen, kein zweiter Kopf in der Mail
for (const b of ["https://boese.example", "www.boese.de", "boese.com", "Ruf an 0151 68466088", "bank@example.org", "Sparkasse <script>", "x".repeat(41), "Bank; DROP", "//boese", "Bank: hier klicken", null, undefined, ""]) pruefe(b, "");
console.log(fehler ? `${fehler} Fehler` : "Bankangabe in Ordnung.");
process.exit(fehler ? 1 : 0);
