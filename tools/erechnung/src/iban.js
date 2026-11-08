// IBAN und BIC prüfen und lesbar zeigen (ohne DOM, auch in Node): Länge je Land und Prüfziffer nach ISO 13616 (Modulo 97).
const LAENGE = { AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GI: 23, GR: 27, HR: 21, HU: 28, IE: 22,
  IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22, AL: 28, ME: 22, MD: 24, MK: 19, RS: 22, UA: 29 };
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
export const bicGueltig = s => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(String(s || "").trim().toUpperCase());

