// Firmendaten und zuletzt gespeicherte Rechnungsnummer im Gerät (localStorage „rverechnung:firma“ und „rverechnung:nummer“, nach
// dem Vorbild „rvlizenz:<werkzeug>“). Nichts wird hochgeladen; Kundendaten und Entwürfe bleiben nur im Fenster. Jeder Zugriff in
// try/catch: Im privaten Fenster, unter file:// in Safari oder bei gesperrtem Speicher läuft alles weiter, nur ohne Gedächtnis.
// Website und heruntergeladene Datei haben getrennte Speicher; darum lassen sich die Firmendaten als Datei sichern und übernehmen.
export const SCHLUESSEL = { firma: "rverechnung:firma", nummer: "rverechnung:nummer" };
const ART = "SmartFormular E-Rechnung lite – Firmendaten";

// Leere Firmendaten (Modell, Fassung 1); Vorgaben für neue Rechnungen
export const firmaLeer = () => ({ v: 1, name: "", handelsname: "", strasse: "", zusatz: "", plz: "", ort: "", land: "DE", steuernummer: "", ustid: "", register: "",
  kontakt: { name: "", telefon: "", email: "" }, bank: { iban: "", bic: "", inhaber: "" }, kleinunternehmer: false, vorgaben: { zielTage: 14, einheit: "C62", satz: "S19" } });

// Nur bekannte Felder, nur Text, gekürzt: so kommt aus Speicher oder Datei nichts Fremdes in die Maske
const text = (s, n = 200) => typeof s === "string" ? s.slice(0, n) : "";
export function firmaBereinigen(roh) {
  const l = firmaLeer();
  if (!roh || typeof roh !== "object") return l;
  for (const k of ["name", "handelsname", "strasse", "zusatz", "plz", "ort", "steuernummer", "ustid", "register"]) l[k] = text(roh[k]);
  for (const k of ["name", "telefon", "email"]) l.kontakt[k] = text(roh.kontakt && roh.kontakt[k]);
  for (const k of ["iban", "bic", "inhaber"]) l.bank[k] = text(roh.bank && roh.bank[k], k === "inhaber" ? 200 : 40);
  l.kleinunternehmer = roh.kleinunternehmer === true;
  const v = roh.vorgaben || {};
  if (Number.isInteger(v.zielTage) && v.zielTage >= 0 && v.zielTage <= 365) l.vorgaben.zielTage = v.zielTage;
  if (typeof v.einheit === "string") l.vorgaben.einheit = v.einheit.slice(0, 3);
  if (["S19", "S7", "Z", "E"].includes(v.satz)) l.vorgaben.satz = v.satz;
  return l;
}

function lesen(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }
function schreiben(k, wert) { try { localStorage.setItem(k, JSON.stringify(wert)); return true; } catch { return false; } }
function weg(k) { try { localStorage.removeItem(k); return true; } catch { return false; } }

// Ist ein dauerhafter Speicher da? (sonst Hinweis in der Maske)
export function speicherDa() {
  try { const k = "rverechnung:probe"; localStorage.setItem(k, "1"); localStorage.removeItem(k); return true; } catch { return false; }
}
export const firmaLesen = () => { const roh = lesen(SCHLUESSEL.firma); return roh ? firmaBereinigen(roh) : null; };
export const firmaSichern = f => schreiben(SCHLUESSEL.firma, firmaBereinigen(f));
// Löschen nimmt beides: Firmendaten und die gemerkte Nummer
export const firmaLoeschen = () => weg(SCHLUESSEL.firma) && weg(SCHLUESSEL.nummer);

// Zuletzt gespeicherte Rechnungsnummer – nur nach erfolgreichem Speichern geschrieben
export function nummerLesen() { const n = lesen(SCHLUESSEL.nummer); return n && typeof n.letzte === "string" ? n : null; }
export const nummerMerken = (letzte, datum) => schreiben(SCHLUESSEL.nummer, { v: 1, letzte: String(letzte).slice(0, 200), datum });

// Als Datei sichern (JSON) und wieder übernehmen
export function firmaExport(f, nummer) {
  return JSON.stringify({ art: ART, v: 1, firma: firmaBereinigen(f), nummer: nummer && nummer.letzte ? { letzte: nummer.letzte, datum: nummer.datum || "" } : null }, null, 1);
}
export function firmaImport(textInhalt) {
  let d;
  try { d = JSON.parse(textInhalt); } catch { return null; }
  if (!d || d.art !== ART || !d.firma) return null;
  return { firma: firmaBereinigen(d.firma), nummer: d.nummer && typeof d.nummer.letzte === "string" ? { letzte: d.nummer.letzte.slice(0, 200), datum: text(d.nummer.datum, 10) } : null };
}
