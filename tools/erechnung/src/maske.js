// Maske für „Erstellen“ prüfen (ohne DOM, auch in Node): Pflichtfelder und Formate vor der eigentlichen Prüfung, je Feld eine
// Meldung in Klartext; dazu der Vorschlag der nächsten Rechnungsnummer und die Regel, wann gespeichert werden darf.
// Felder heißen wie im Modell: firma.name, firma.kontakt.email, empfaenger.plz, nummer, leistung.von, pos.2.menge …
import { T, EINHEITEN_ERSTELLEN } from "./texte.js";
import { ibanGueltig, bicGueltig } from "./iban.js";
import { dezimalLesen, summen, STELLEN, GRENZE, datumGueltig } from "./rechnen.js";

export const EMAIL = /^[^@\s]+@([^@.\s]+\.)+[^@.\s]+$/; // wie XR-EMAIL-REGEX der KoSIT (BR-DE-28)
export const LEITWEG = /^\d{2,12}(-[A-Za-z0-9]{1,30})?-\d{2}$/;
const leer = s => !String(s ?? "").trim();
const ziffern = s => (String(s || "").match(/\d/g) || []).length;
const ustidOk = (s, land) => { const v = String(s).replace(/\s+/g, "").toUpperCase(); return land === "DE" || v.startsWith("DE") ? /^DE\d{9}$/.test(v) : /^[A-Z]{2}[0-9A-Z+*.]{2,12}$/.test(v); };
const plzOk = (s, land) => land === "DE" ? /^\d{5}$/.test(String(s).trim()) : !leer(s);

// Alle Meldungen in der Reihenfolge der Maske: [{ feld, text }]; leer = alles ausgefüllt
export function maskePruefen(firma, rechnung, lang = "de") {
  const m = T[lang === "en" ? "en" : "de"].erstellen.melde, out = [];
  const melde = (feld, text) => out.push({ feld, text });
  const pflicht = (feld, wert) => { if (leer(wert)) { melde(feld, m.pflicht); return false; } return true; };
  const f = firma || {}, r = rechnung || {}, k = f.kontakt || {}, b = f.bank || {}, em = r.empfaenger || {};
  // Ihre Firmendaten
  pflicht("firma.name", f.name);
  pflicht("firma.strasse", f.strasse);
  if (pflicht("firma.plz", f.plz) && !plzOk(f.plz, "DE")) melde("firma.plz", m.plz);
  pflicht("firma.ort", f.ort);
  if (leer(f.steuernummer) && leer(f.ustid)) melde("firma.steuernummer", m.steuerFehlt);
  else if (!leer(f.steuernummer) && (!/^[\d\s/]+$/.test(f.steuernummer) || ziffern(f.steuernummer) < 10 || ziffern(f.steuernummer) > 13)) melde("firma.steuernummer", m.steuernummer);
  if (!leer(f.ustid) && !ustidOk(f.ustid, "DE")) melde("firma.ustid", m.ustid);
  pflicht("firma.kontakt.name", k.name);
  if (pflicht("firma.kontakt.telefon", k.telefon) && ziffern(k.telefon) < 3) melde("firma.kontakt.telefon", m.telefon);
  if (pflicht("firma.kontakt.email", k.email) && !EMAIL.test(String(k.email).trim())) melde("firma.kontakt.email", m.email);
  if (pflicht("firma.bank.iban", b.iban) && !ibanGueltig(b.iban)) melde("firma.bank.iban", m.iban);
  if (!leer(b.bic) && !bicGueltig(String(b.bic).replace(/\s+/g, ""))) melde("firma.bank.bic", m.bic);
  // 01 Empfänger und Leistung
  const land = String(em.land || "DE").toUpperCase();
  pflicht("empfaenger.name", em.name);
  pflicht("empfaenger.strasse", em.strasse);
  if (pflicht("empfaenger.plz", em.plz) && !plzOk(em.plz, land)) melde("empfaenger.plz", m.plz);
  pflicht("empfaenger.ort", em.ort);
  if (!/^[A-Z]{2}$/.test(land)) melde("empfaenger.land", m.land);
  if (em.behoerde) { if (pflicht("empfaenger.referenz", em.referenz) && !LEITWEG.test(String(em.referenz).trim())) melde("empfaenger.referenz", m.leitweg); }
  if (!em.behoerde || !leer(em.email)) { if (pflicht("empfaenger.email", em.email) && !EMAIL.test(String(em.email).trim())) melde("empfaenger.email", m.email); }
  if (!leer(em.ustid) && !ustidOk(em.ustid, land)) melde("empfaenger.ustid", m.ustid);
  pflicht("nummer", r.nummer);
  if (pflicht("datum", r.datum) && !datumGueltig(r.datum)) melde("datum", m.datum);
  // Rechnungsart: Abschlag mit Auftrag oder Projekt (BT-11), Storno mit Nummer und Datum der ursprünglichen Rechnung (BT-25, BT-26),
  // Dauerrechnung mit Laufzeit (BG-14) und dem Tag der Fälligkeit
  const art = r.art || "rechnung", st = r.storno || {}, da = r.dauer || {};
  if (art === "abschlag") pflicht("bezug", r.bezug);
  if (art === "storno") {
    pflicht("storno.nummer", st.nummer);
    if (pflicht("storno.datum", st.datum)) { if (!datumGueltig(st.datum)) melde("storno.datum", m.datum); else if (datumGueltig(r.datum) && st.datum > r.datum) melde("storno.datum", m.stornoDatum); }
  }
  if (art === "dauer" && !(/^\d{1,2}$/.test(String(da.tag ?? "").trim()) && +da.tag >= 1 && +da.tag <= 28)) melde("dauer.tag", m.tag);
  const l = art === "dauer" ? { ...(r.leistung || {}), art: "zeitraum" } : r.leistung || {};
  if (l.art === "zeitraum") {
    const von = pflicht("leistung.von", l.von) && (datumGueltig(l.von) || (melde("leistung.von", m.datum), false));
    const bis = pflicht("leistung.bis", l.bis) && (datumGueltig(l.bis) || (melde("leistung.bis", m.datum), false));
    if (von && bis && l.von > l.bis) melde("leistung.bis", m.zeitraum);
  } else if (pflicht("leistung.datum", l.datum) && !datumGueltig(l.datum)) melde("leistung.datum", m.datum);
  // 02 Positionen
  const pos = r.positionen || [];
  if (!pos.length) melde("pos", m.positionen);
  pos.forEach((p, i) => {
    pflicht(`pos.${i}.name`, p.name);
    const menge = dezimalLesen(p.menge, lang, STELLEN.menge), preis = dezimalLesen(p.preis, lang, STELLEN.preis);
    if (leer(p.menge)) melde(`pos.${i}.menge`, m.pflicht); else if (menge == null || menge <= 0n) melde(`pos.${i}.menge`, m.menge);
    if (leer(p.preis)) melde(`pos.${i}.preis`, m.pflicht); else if (preis == null) melde(`pos.${i}.preis`, m.preis);
    if (!EINHEITEN_ERSTELLEN.includes(p.einheit || "C62")) melde(`pos.${i}.einheit`, m.pflicht);
  });
  if (!f.kleinunternehmer && pos.some(p => p.steuer === "E")) pflicht("befreiung.text", r.befreiung && r.befreiung.text);
  // 0 % nur mit Grund: Den Nullsteuersatz bestätigt die Nutzerin ausdrücklich (§ 12 Abs. 3 UStG); Ausfuhr und EU-Fälle sind steuerfrei (E)
  if (!f.kleinunternehmer && pos.some(p => p.steuer === "Z") && r.nullsatz !== true) melde("nullsatz", m.nullsatz);
  if (out.every(x => !x.feld.startsWith("pos.")) && pos.length && summen(r, f, lang).zahlbetrag > GRENZE) melde(`pos.${pos.length - 1}.preis`, m.zuHoch);
  // 03 Prüfen und speichern
  if (art !== "storno" && art !== "dauer" && (!/^\d{1,3}$/.test(String(r.zielTage ?? "").trim()) || +r.zielTage > 365)) melde("zielTage", m.ziel);
  if ([...String(r.zweck || "")].length > 140) melde("zweck", m.zweck);
  return out;
}

// Nächste Rechnungsnummer: Ziffern am Ende plus eins (Präfix, Suffix und Breite bleiben, RE-2026-0041 → RE-2026-0042); steht im
// Präfix ein älteres Jahr, gilt das aktuelle Jahr und der Zähler beginnt bei 1 (2025-017 → 2026-001). Steht das Jahr hinten
// („lfd. Nr./Jahr“), zählt die Ziffernfolge davor (RE-12/2026 → RE-13/2026, im neuen Jahr RE-1/2027). Ohne letzte Nummer: JJJJ-001.
const JAHR = /(^|\D)((?:19|20)\d{2})(?=\D|$)/;
function nummerTeile(s) {
  const m = /^(.*?)(\d+)(\D*)$/.exec(s);
  if (!m) return null;
  const [, vor, zahl, nach] = m;
  const hinten = /^(.*?)(\d+)(\D+)$/.exec(vor);
  // Jahr am Ende, davor ein Zähler: Zähler ist die vordere Ziffernfolge, das Jahr gehört zum Suffix
  if (/^(19|20)\d{2}$/.test(zahl) && hinten && !JAHR.test(hinten[1] + hinten[2])) return { vor: hinten[1], zahl: hinten[2], nach: hinten[3] + zahl + nach, jahrHinten: { mitte: hinten[3], jahr: zahl, rest: nach } };
  return { vor, zahl, nach, jahrHinten: null };
}
export function naechsteNummer(letzte, heute) {
  const jahr = String(heute || "").slice(0, 4) || String(new Date().getFullYear());
  const s = String(letzte || "").trim();
  if (!s) return `${jahr}-001`;
  const t = nummerTeile(s);
  if (!t) return `${s}-1`;
  const { vor, zahl, nach, jahrHinten } = t;
  const eins = "1".padStart(zahl.length, "0");
  if (jahrHinten && +jahrHinten.jahr < +jahr) return vor + eins + jahrHinten.mitte + jahr + jahrHinten.rest;
  const alt = JAHR.exec(vor);
  if (alt && +alt[2] < +jahr) return vor.slice(0, alt.index + alt[1].length) + jahr + vor.slice(alt.index + alt[0].length) + eins + nach;
  return vor + (BigInt(zahl) + 1n).toString().padStart(zahl.length, "0") + nach;
}

// Ist „neu“ später als die gemerkte Nummer? Nur dann wird sie gemerkt – eine nachträglich erstellte ältere Nummer (RE-2026-0017 nach
// RE-2026-0041) setzt den Zähler nicht zurück. Gleiches Muster: Jahr, dann Zähler vergleichen; ein anderes Muster gilt als neu.
export function nummerSpaeter(neu, alt) {
  const a = String(alt || "").trim(), n = String(neu || "").trim();
  if (!a) return true;
  if (n === a) return false;
  const ta = nummerTeile(a), tn = nummerTeile(n);
  if (!ta || !tn) return true;
  const jahr = t => +(t.jahrHinten ? t.jahrHinten.jahr : (JAHR.exec(t.vor) || [])[2] || 0);
  const ohneJahr = t => (t.vor + "|" + t.nach).replace(/(19|20)\d{2}/g, "J");
  if (ohneJahr(ta) !== ohneJahr(tn)) return true;
  if (jahr(tn) !== jahr(ta)) return jahr(tn) > jahr(ta);
  return BigInt(tn.zahl) > BigInt(ta.zahl);
}

// Speichern nur, wenn die Prüfung gelaufen ist: keine Fehler und keine Auswertungsfehler; Warnungen und Hinweise sind erlaubt
export function speichernErlaubt(pruefung) {
  return !!pruefung && pruefung.status === "fertig" && !(pruefung.fehler || []).length && !(pruefung.befunde || []).some(b => b.stufe === "fehler");
}
