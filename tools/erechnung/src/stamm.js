// Gemerkte Empfänger, Positionskatalog und die letzten Rechnungen im Gerät (ohne DOM, auch in Node): localStorage
// „rverechnung:empfaenger“, „rverechnung:katalog“ und „rverechnung:rechnungen“, nach dem Vorbild von firma.js. Gemerkt wird beim
// Speichern einer Rechnung (Empfänger, Rechnung) und auf Wunsch aus einer Position („In den Katalog“) oder per CSV (csv.js).
// Nichts wird hochgeladen. Ohne dauerhaften Speicher (privates Fenster, gesperrter Speicher) gilt alles nur, solange das Fenster offen
// ist: Die Listen liegen dann nur im Arbeitsspeicher. Dazu die Sicherung aller lokalen Daten als eine Datei für den Gerätewechsel.
import { EINHEITEN_ERSTELLEN } from "./texte.js";
import { dezimalLesen, preisText, STELLEN, datumGueltig } from "./rechnen.js";
import { SCHLUESSEL, firmaBereinigen, firmaImport } from "./firma.js";

export const STAMM = { empfaenger: "rverechnung:empfaenger", katalog: "rverechnung:katalog", rechnungen: "rverechnung:rechnungen" };
export const GRENZEN = { empfaenger: 2000, katalog: 2000, rechnungen: 20 };
const ART = "SmartFormular E-Rechnung lite – lokale Daten";
const STEUERN = ["S19", "S7", "Z", "E"];
export const ARTEN = ["rechnung", "abschlag", "dauer", "storno"];
export const TURNUS = ["monat", "quartal", "jahr"];

const text = (s, n = 200) => typeof s === "string" ? s.slice(0, n) : typeof s === "number" ? String(s).slice(0, n) : "";
// Für Vergleiche: Unicode NFC, klein, Leerraum zusammengefasst
export const falten = s => String(s ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

// ---------- Bereinigen: nur bekannte Felder, nur Text, gekürzt ----------
export function empfaengerBereinigen(roh) {
  const r = roh && typeof roh === "object" ? roh : {};
  const land = text(r.land, 2).toUpperCase();
  return { name: text(r.name), strasse: text(r.strasse), zusatz: text(r.zusatz), plz: text(r.plz, 10), ort: text(r.ort), land: /^[A-Z]{2}$/.test(land) ? land : "DE",
    ustid: text(r.ustid, 20), email: text(r.email), referenz: text(r.referenz), behoerde: r.behoerde === true };
}
// Preis im Katalog in fester Schreibweise mit Punkt (12.3456), unabhängig von der Sprache der Oberfläche
export const preisFest = (eingabe, lang) => { const p = dezimalLesen(eingabe, lang, STELLEN.preis); return p == null ? "" : preisText(p); };
export const preisFuer = (fest, lang) => { const p = dezimalLesen(fest, "en", STELLEN.preis); if (p == null) return ""; const s = preisText(p); return lang === "en" ? s : s.replace(".", ","); };
export function katalogBereinigen(roh) {
  const r = roh && typeof roh === "object" ? roh : {};
  return { name: text(r.name, 400), beschreibung: text(r.beschreibung, 1000), einheit: EINHEITEN_ERSTELLEN.includes(r.einheit) ? r.einheit : "C62",
    preis: preisFest(text(r.preis, 30), "en"), steuer: STEUERN.includes(r.steuer) ? r.steuer : "S19", artikelnr: text(r.artikelnr, 60) };
}
// Eine gemerkte Rechnung: die Angaben der Maske ohne Firmendaten (für Folge- und Stornorechnung)
const datum = s => datumGueltig(s) ? s : "";
export function rechnungBereinigen(roh) {
  const r = roh && typeof roh === "object" ? roh : {}, l = r.leistung || {}, b = r.befreiung || {}, st = r.storno || {}, d = r.dauer || {};
  return { sprache: r.sprache === "en" ? "en" : "de", art: ARTEN.includes(r.art) ? r.art : "rechnung", nummer: text(r.nummer), datum: datum(r.datum),
    leistung: { art: l.art === "zeitraum" ? "zeitraum" : "datum", datum: datum(l.datum), von: datum(l.von), bis: datum(l.bis) },
    empfaenger: empfaengerBereinigen(r.empfaenger),
    positionen: (Array.isArray(r.positionen) ? r.positionen : []).slice(0, 500).map(p => ({ name: text(p && p.name, 400), beschreibung: text(p && p.beschreibung, 1000), menge: text(p && p.menge, 30),
      einheit: EINHEITEN_ERSTELLEN.includes(p && p.einheit) ? p.einheit : "C62", preis: text(p && p.preis, 30), steuer: STEUERN.includes(p && p.steuer) ? p.steuer : "S19", artikelnr: text(p && p.artikelnr, 60) })),
    befreiung: { wahl: text(b.wahl, 20), text: text(b.text, 400) }, nullsatz: r.nullsatz === true, zielTage: text(r.zielTage, 3), zweck: text(r.zweck, 140), bemerkung: text(r.bemerkung, 2000),
    bezug: text(r.bezug), storno: { nummer: text(st.nummer), datum: datum(st.datum) }, dauer: { turnus: TURNUS.includes(d.turnus) ? d.turnus : "monat", tag: /^\d{1,2}$/.test(text(d.tag)) ? text(d.tag) : "1" } };
}

// Gleiche Einträge erkennen: Empfänger an Name und PLZ, Katalog an der Artikelnummer, sonst an der Bezeichnung
export const empfaengerSchluessel = e => `${falten(e.name)}|${falten(e.plz)}`;
export const katalogSchluessel = k => String(k.artikelnr || "").trim() ? `#${falten(k.artikelnr)}` : falten(k.name);

// ---------- Speicher mit Rückfall auf den Arbeitsspeicher ----------
const fluechtig = new Map();
function lesen(k) { try { const s = localStorage.getItem(k); if (s != null) return JSON.parse(s); } catch { /* gesperrt oder kaputt */ } return fluechtig.has(k) ? fluechtig.get(k) : null; }
function schreiben(k, wert) { fluechtig.set(k, wert); try { localStorage.setItem(k, JSON.stringify(wert)); return true; } catch { return false; } }
function weg(k) { fluechtig.delete(k); try { localStorage.removeItem(k); return true; } catch { return false; } }

const betragBereinigen = b => /^\d{1,13}$/.test(String(b ?? "")) ? String(b) : "";
const LESER = { empfaenger: empfaengerBereinigen, katalog: katalogBereinigen, rechnungen: r => ({ ...rechnungBereinigen(r), betrag: betragBereinigen(r && r.betrag) }) };
export function listeLesen(art) {
  const roh = lesen(STAMM[art]);
  const liste = roh && Array.isArray(roh.liste) ? roh.liste : [];
  return liste.slice(0, GRENZEN[art]).map(LESER[art]).filter(x => art === "rechnungen" ? x.nummer : x.name.trim());
}
export const listeSichern = (art, liste) => schreiben(STAMM[art], { v: 1, liste: liste.slice(0, GRENZEN[art]).map(LESER[art]) });

// Einfügen oder ersetzen (gleicher Schlüssel); das Neueste steht vorn
function einreihen(liste, eintrag, schluessel) {
  const k = schluessel(eintrag);
  return [eintrag, ...liste.filter(x => schluessel(x) !== k)];
}
export function empfaengerMerken(e) {
  const x = empfaengerBereinigen(e);
  if (!x.name.trim()) return listeLesen("empfaenger");
  const liste = einreihen(listeLesen("empfaenger"), x, empfaengerSchluessel);
  listeSichern("empfaenger", liste);
  return liste;
}
export function katalogMerken(k) {
  const x = katalogBereinigen(k);
  if (!x.name.trim()) return { liste: listeLesen("katalog"), neu: false };
  const alt = listeLesen("katalog"), neu = !alt.some(y => katalogSchluessel(y) === katalogSchluessel(x));
  const liste = einreihen(alt, x, katalogSchluessel);
  listeSichern("katalog", liste);
  return { liste, neu };
}
// Gespeicherte Rechnung merken (gleiche Nummer ersetzt), höchstens die letzten 20
export function rechnungMerken(r, betrag) {
  const x = { ...rechnungBereinigen(r), betrag: String(betrag ?? "") };
  if (!x.nummer.trim()) return listeLesen("rechnungen");
  const liste = einreihen(listeLesen("rechnungen"), x, y => y.nummer.trim());
  listeSichern("rechnungen", liste);
  return liste;
}
export const rechnungenLesen = () => listeLesen("rechnungen");

// Vorschläge beim Tippen: Anfang des Namens zuerst, dann irgendwo im Namen (Katalog auch an der Artikelnummer); höchstens n
// Suche ohne Akzente: „ga“ findet auch „Gärtnerei“
const suchFalten = s => falten(s).replace(/ß/g, "ss").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
export function vorschlaege(liste, eingabe, n = 6) {
  const t = suchFalten(eingabe);
  if (!t) return [];
  const vorn = [], mitte = [];
  liste.forEach((x, i) => {
    const name = suchFalten(x.name), nr = suchFalten(x.artikelnr || "");
    if (name.startsWith(t) || (nr && nr.startsWith(t))) vorn.push(i);
    else if (name.includes(t)) mitte.push(i);
  });
  return [...vorn, ...mitte].slice(0, n);
}

// ---------- Alle lokalen Daten: als eine Datei sichern, übernehmen, löschen ----------
export function alleLesen() {
  let firma = null, nummer = null;
  try { const f = JSON.parse(localStorage.getItem(SCHLUESSEL.firma) || "null"); firma = f ? firmaBereinigen(f) : null; } catch { /* ohne Speicher */ }
  try { const n = JSON.parse(localStorage.getItem(SCHLUESSEL.nummer) || "null"); nummer = n && typeof n.letzte === "string" ? { letzte: n.letzte.slice(0, 200), datum: text(n.datum, 10) } : null; } catch { /* ohne Speicher */ }
  return { firma, nummer, empfaenger: listeLesen("empfaenger"), katalog: listeLesen("katalog"), rechnungen: rechnungenLesen() };
}
export function alleExport(d) {
  return JSON.stringify({ art: ART, v: 1, firma: d.firma ? firmaBereinigen(d.firma) : null, nummer: d.nummer && d.nummer.letzte ? { letzte: d.nummer.letzte, datum: d.nummer.datum || "" } : null,
    empfaenger: (d.empfaenger || []).map(LESER.empfaenger), katalog: (d.katalog || []).map(LESER.katalog), rechnungen: (d.rechnungen || []).map(LESER.rechnungen) }, null, 1);
}
// Übernimmt auch die Datei „Firmendaten“ (firma.js); null, wenn die Datei nicht von diesem Werkzeug stammt
export function alleImport(inhalt) {
  let d;
  try { d = JSON.parse(inhalt); } catch { return null; }
  if (!d || typeof d !== "object") return null;
  if (d.art !== ART) { const f = firmaImport(inhalt); return f ? { firma: f.firma, nummer: f.nummer, empfaenger: null, katalog: null, rechnungen: null } : null; }
  const liste = (x, art) => Array.isArray(x) ? x.slice(0, GRENZEN[art]).map(LESER[art]).filter(y => art === "rechnungen" ? y.nummer : y.name.trim()) : [];
  return { firma: d.firma ? firmaBereinigen(d.firma) : null, nummer: d.nummer && typeof d.nummer.letzte === "string" ? { letzte: d.nummer.letzte.slice(0, 200), datum: text(d.nummer.datum, 10) } : null,
    empfaenger: liste(d.empfaenger, "empfaenger"), katalog: liste(d.katalog, "katalog"), rechnungen: liste(d.rechnungen, "rechnungen") };
}
// Löscht Empfänger, Katalog und gemerkte Rechnungen (Firmendaten und Nummer löscht firma.js)
export function stammLoeschen() { return [STAMM.empfaenger, STAMM.katalog, STAMM.rechnungen].map(weg).every(Boolean); }
