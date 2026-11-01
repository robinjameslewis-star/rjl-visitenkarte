// GiroCode (EPC-QR, Version 002, European Payments Council EPC069-12) für die Banking-App – nur wenn sicher überwiesen werden kann:
// gültige IBAN, Zahlbetrag (BT-115) größer null, Währung EUR, Zahlungsart Überweisung (30, 42, 58). Sonst ein Grund, warum nicht.
import qrcodegen from "./qrcodegen.ts";
import { GUTSCHRIFTEN } from "./texte.js";

const LAENGE = { AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GI: 23, GR: 27, HR: 21, HU: 28, IE: 22,
  IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22, AL: 28, ME: 22, MD: 24, MK: 19, RS: 22, UA: 29 };
export const UEBERWEISUNG = ["30", "42", "58"];

export function ibanNormal(s) { return String(s || "").replace(/\s+/g, "").toUpperCase(); }
export function ibanGueltig(s) {
  const iban = ibanNormal(s);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(iban)) return false;
  if (LAENGE[iban.slice(0, 2)] && LAENGE[iban.slice(0, 2)] !== iban.length) return false;
  const umgestellt = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const c of umgestellt) {
    const z = c >= "A" ? String(c.charCodeAt(0) - 55) : c;
    for (const d of z) rest = (rest * 10 + (d.charCodeAt(0) - 48)) % 97;
  }
  return rest === 1;
}
export const ibanLesbar = s => ibanNormal(s).replace(/(.{4})/g, "$1 ").trim();
const bicGueltig = s => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(String(s || "").trim().toUpperCase());

// Zahlungsdaten aus dem Modell: Empfänger, IBAN, BIC, Betrag, Verwendungszweck und ob ein GiroCode möglich ist
export function zahlung(d) {
  const zm = (d.zahlung || []);
  const ueb = zm.find(z => UEBERWEISUNG.includes(z.code) && z.konten.length) || zm.find(z => z.konten.length) || zm[0] || null;
  const konto = ueb && ueb.konten[0] || null;
  const empfaenger = (konto && konto.inhaber) || (d.zahlungsempfaenger && d.zahlungsempfaenger.name) || (d.verkaeufer && d.verkaeufer.name) || "";
  const betrag = d.summen ? d.summen.zahlbetrag : null;
  const zweck = (ueb && ueb.zweck) || (d.nummer ? (d.sprache === "en" ? "Invoice " : "Rechnung ") + d.nummer : "");
  const out = { empfaenger, iban: konto ? ibanNormal(konto.iban) : "", bic: konto ? String(konto.bic || "").trim().toUpperCase() : "", betrag, waehrung: d.waehrung || "", zweck, code: ueb ? ueb.code : "",
    lastschrift: zm.some(z => ["49", "59"].includes(z.code)), karte: zm.some(z => ["48", "54", "55"].includes(z.code)), grund: null, nutzlast: null };
  if (d.gutschriftDokument || GUTSCHRIFTEN.includes(d.art) || d.art === "389") out.grund = "gutschrift-dokument";
  else if (!zm.length) out.grund = "keine-zahlungsart";
  else if (out.lastschrift && !konto) out.grund = "lastschrift";
  else if (!UEBERWEISUNG.includes(out.code)) out.grund = out.karte ? "karte" : "keine-ueberweisung";
  else if (!konto || !out.iban) out.grund = "keine-iban";
  else if (!ibanGueltig(out.iban)) out.grund = "iban-ungueltig";
  else if (out.waehrung !== "EUR") out.grund = "waehrung";
  else if (!(betrag > 0)) out.grund = betrag === 0 ? "nichts-zu-zahlen" : betrag == null ? "kein-betrag" : "gutschrift";
  else if (betrag > 999999999.99) out.grund = "zu-hoch";
  else if (!empfaenger) out.grund = "kein-empfaenger";
  if (!out.grund) {
    const kurz = (s, n) => [...String(s).replace(/[\r\n]+/g, " ").trim()].slice(0, n).join("");
    out.nutzlast = ["BCD", "002", "1", "SCT", bicGueltig(out.bic) ? out.bic : "", kurz(empfaenger, 70), out.iban, `EUR${betrag.toFixed(2)}`, "", "", kurz(zweck, 140)].join("\n");
  }
  return out;
}

// QR-Code als SVG (Fehlerkorrektur M wie von EPC verlangt, Ruhezone 4 Module)
export function qrSvg(text, titel) {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
  const n = qr.size, rand = 4;
  let pfad = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.getModule(x, y)) pfad += `M${x + rand},${y + rand}h1v1h-1z`;
  const g = n + 2 * rand;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g} ${g}" role="img" aria-label="${String(titel).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))}" shape-rendering="crispEdges"><rect width="${g}" height="${g}" fill="#fff"/><path d="${pfad}" fill="#000"/></svg>`;
}
