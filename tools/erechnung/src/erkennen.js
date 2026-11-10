// Rechnungsangaben aus Zeilen und Zellen erkennen (einlesen.js, pdftext.js; ohne DOM, auch in Node): Nummer, Datum, Leistung,
// Zahlungsziel, Empfänger und Absender (Anschriftblöcke mit PLZ und Ort), Positionen (Kopfzeile oder Beträge am Zeilenende),
// Steuer und die Summen des Dokuments. Ergebnis wie vorlage.js: { rechnung, hinweise, abweichung } und dazu firma (gefundene eigene
// Angaben, nur für leere Felder), gefunden (was erkannt wurde), summe (Netto und Brutto aus dem Dokument). Alles ist ein Vorschlag:
// Die Maske prüft danach jedes Feld, und die Summen werden mit denen des Dokuments verglichen.
import { EINHEITEN_ERSTELLEN } from "./texte.js";
import { summen, zahlText, STELLEN } from "./rechnen.js";
import { rechnungBereinigen, falten } from "./stamm.js";
import { ibanGueltig, ibanNormal, bicGueltig } from "./iban.js";

const MONATE = { januar: 1, jan: 1, january: 1, februar: 2, feb: 2, february: 2, märz: 3, maerz: 3, mär: 3, march: 3, mar: 3, april: 4, apr: 4, mai: 5, may: 5, juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, october: 10, oct: 10, november: 11, nov: 11, dezember: 12, dez: 12, december: 12, dec: 12 };
const L = "A-Za-zÄÖÜäöüßéèáàç";
const DATUM_RE = new RegExp(`(\\d{4}-\\d{2}-\\d{2})|(\\d{1,2})\\.\\s?(\\d{1,2})\\.\\s?(\\d{4}|\\d{2})(?!\\d)|(\\d{1,2})/(\\d{1,2})/(\\d{4}|\\d{2})(?!\\d)|(\\d{1,2})\\.?\\s+([${L}]{3,9})\\.?\\s+(\\d{4})|([${L}]{3,9})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})`, "g");
const iso = (j, m, d) => { j = +j < 100 ? 2000 + +j : +j; const dt = new Date(Date.UTC(j, m - 1, d)); return dt.getUTCFullYear() === j && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === +d && j > 1990 && j < 2100 ? `${j}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null; };
// Alle Daten in einem Text, in Reihenfolge; slash: TT/MM (en-GB), außer der zweite Teil ist über 12
export function datenIn(s) {
  const out = [];
  for (const m of String(s).matchAll(DATUM_RE)) {
    let d = null;
    if (m[1]) { const [j, mo, t] = m[1].split("-"); d = iso(j, +mo, +t); }
    else if (m[2]) d = iso(m[4], +m[3], +m[2]);
    else if (m[5]) d = +m[6] > 12 ? iso(m[7], +m[5], +m[6]) : iso(m[7], +m[6], +m[5]);
    else if (m[8]) { const mo = MONATE[m[9].toLowerCase()]; d = mo ? iso(m[10], mo, +m[8]) : null; }
    else if (m[11]) { const mo = MONATE[m[11].toLowerCase()]; d = mo ? iso(m[13], mo, +m[12]) : null; }
    if (d) out.push({ d, i: m.index, ende: m.index + m[0].length });
  }
  return out;
}

// Beträge: 1.234,56 / 1,234.56 / 1234.5 / 1 234,56 € / -12,00; dezimal = "de" | "en" (aus dem Dokument)
function zahlLesen(s, dezimal, max = 4) {
  let t = String(s).replace(/[€$£]|EUR|CHF|GBP|USD/gi, "").replace(/[\s  ']/g, "").replace(/^\((.*)\)$/, "-$1");
  if (!/^[-+−]?[\d.,]+-?$/.test(t)) return null;
  const neg = /^[-−]|-$/.test(t);
  t = t.replace(/[-+−]/g, "");
  const komma = t.lastIndexOf(","), punkt = t.lastIndexOf(".");
  let ganz = t, nach = "";
  const trenner = komma >= 0 && punkt >= 0 ? (komma > punkt ? "," : ".") : komma >= 0 ? (dezimal === "en" && /^\d{1,3}(,\d{3})+$/.test(t) ? null : ",") : punkt >= 0 ? (dezimal !== "en" && /^\d{1,3}(\.\d{3})+$/.test(t) ? null : ".") : null;
  if (trenner) { const i = t.lastIndexOf(trenner); ganz = t.slice(0, i); nach = t.slice(i + 1); }
  ganz = ganz.replace(/[.,]/g, "");
  if (!/^\d*$/.test(ganz) || !/^\d*$/.test(nach) || (!ganz && !nach) || nach.length > max) return null;
  return { wert: Number(`${neg ? "-" : ""}${ganz || "0"}.${nach || "0"}`), stellen: nach.length, text: `${neg ? "-" : ""}${ganz || "0"}${nach ? "." + nach : ""}` };
}
const cent = z => z == null ? null : BigInt(Math.round(z.wert * 100));
const feldText = (text, lang) => lang === "en" ? text : text.replace(".", ",");

const EINHEIT_WORTE = [[/^(stk|stck|stück|st|pcs?|pieces?|x|each|ea)\.?$/i, "C62"], [/^(std|stunden?|h|hrs?|hours?)\.?$/i, "HUR"], [/^(tage?|tg|days?|tagen)\.?$/i, "DAY"],
  [/^(monate?|mon|mt|months?)\.?$/i, "MON"], [/^(jahre?|years?|jhr)\.?$/i, "ANN"], [/^(pauschal|pausch|psch|pschl|lump ?sum|flat|pauschale)\.?$/i, "LS"], [/^(satz|set|sets)\.?$/i, "SET"],
  [/^kg\.?$/i, "KGM"], [/^(m|meter|lfm|lfdm)\.?$/i, "MTR"], [/^(m²|m2|qm)\.?$/i, "MTK"], [/^(l|liter|ltr)\.?$/i, "LTR"], [/^km\.?$/i, "KMT"], [/^kwh$/i, "KWH"]];
const einheitVon = w => { for (const [re, c] of EINHEIT_WORTE) if (re.test(String(w).trim())) return c; return null; };
const SONST_EINHEIT = /^(m³|m3|t|g|min|minuten|woche|wochen|wo|paar|karton|paket|packung|dose|flasche|fl|psch\.?|vh|le|leistung|einheit)\.?$/i;

const KOPF = {
  pos: /^(pos\.?|position|nr\.?|lfd\.?\s*nr\.?|#)$/i,
  text: /^(bezeichnung|beschreibung|leistung|leistungen|artikel|artikelbezeichnung|text|produkt|description|item|items|service|services|details|tätigkeit|leistungsbeschreibung)\b/i,
  menge: /^(menge|anzahl|anz\.?|stk\.?|stück|qty\.?|quantity|std\.?|stunden|hours|units?|stückzahl)$/i,
  einheit: /^(einheit|me|eh|unit|einh\.?)$/i,
  preis: /^(einzelpreis|e-?preis|ep|preis|stundensatz|satz|unit\s*price|rate|price|preis\/einheit|einzel)\b/i,
  gesamt: /^(gesamt|gesamtpreis|betrag|summe|total|amount|netto|gp|line\s*total|gesamtbetrag)\b/i,
  steuer: /^(mwst\.?|ust\.?|steuer|vat|tax|mwst\.?-?satz|ust\.?-?satz|%)$/i,
};
const kopfArt = t => { const s = String(t).replace(/[:€]|\(€\)|in €|eur/gi, "").trim(); for (const [k, re] of Object.entries(KOPF)) if (re.test(s)) return k; return null; };
const SUMME = /^(zwischen)?summe|^netto|^nettobetrag|^gesamt\s*(netto|brutto|betrag|summe)?\b|^total|^subtotal|^sub-total|^übertrag|^uebertrag|^mwst|^ust\b|^umsatzsteuer|^zzgl|^zuzüglich|^plus\s|^rechnungsbetrag|^endbetrag|^zu zahlen|^zahlbetrag|^bruttobetrag|^brutto|^amount due|^balance|^vat\b|^enthaltene|^inkl\.?\s*(\d|mwst|ust|umsatz|vat)|^abzgl|^skonto/i;
const LAENDER = { deutschland: "DE", germany: "DE", österreich: "AT", oesterreich: "AT", austria: "AT", schweiz: "CH", switzerland: "CH", belgien: "BE", belgium: "BE", niederlande: "NL",
  netherlands: "NL", luxemburg: "LU", luxembourg: "LU", frankreich: "FR", france: "FR", italien: "IT", italy: "IT", spanien: "ES", spain: "ES", polen: "PL", poland: "PL",
  dänemark: "DK", denmark: "DK", schweden: "SE", sweden: "SE", tschechien: "CZ", "czech republic": "CZ", "united kingdom": "GB", "vereinigtes königreich": "GB", großbritannien: "GB", uk: "GB",
  england: "GB", usa: "US", "united states": "US", "vereinigte staaten": "US" };
const PLZ_ORT = new RegExp(`^(?:(D|DE|A|AT|CH|L|B|NL)[-\\s])?(\\d{4,5})\\s+([${L}][${L}0-9 .\\-/()]*)$`);
const KONTAKT = /^(tel|telefon|fon|fax|phone|mobil|mobile|e-?mail|mail|www\.|web|internet|ust|vat|steuer|st\.?-?nr|iban|bic|bank|amtsgericht|hr[ab]\b|geschäftsführ|inhaber)/i;
const ANREDE = /^(herrn?|frau|firma|an|to|z\.?\s?hd\.?|attn\.?)$/i;

// Zeilen vorbereiten: Text je Zeile; senkrecht zerlegte Tabellen (Zelle je Absatz, z. B. aus Konvertern) wieder zu Zeilen machen
function vorbereiten(zeilen) {
  const z = zeilen.map(r => ({ bereich: "haupt", ...r, zellen: r.zellen.map(c => ({ ...c, t: String(c.t).replace(/\s+/g, " ").trim() })).filter(c => c.t) })).filter(r => r.zellen.length);
  const out = [];
  for (let i = 0; i < z.length; i++) {
    // Kopf aus mindestens drei einzelligen Zeilen, die alle Spaltenköpfe sind (darunter Menge, Preis oder Betrag)
    let n = 0;
    while (i + n < z.length && z[i + n].zellen.length === 1 && kopfArt(z[i + n].zellen[0].t)) n++;
    const arten = z.slice(i, i + n).map(r => kopfArt(r.zellen[0].t));
    if (n >= 3 && arten.some(a => a === "gesamt" || a === "preis") && arten.includes("text")) {
      out.push({ ...z[i], zellen: z.slice(i, i + n).map((r, k) => ({ t: r.zellen[0].t, x: k * 100 })), senkrecht: n });
      let j = i + n;
      // je n einzellige Zeilen eine Tabellenzeile, solange die letzte ein Betrag ist und keine Summenzeile beginnt
      while (j + n <= z.length) {
        const teil = z.slice(j, j + n);
        if (teil.some(r => r.zellen.length !== 1) || SUMME.test(teil[0].zellen[0].t) || !zahlLesen(teil[n - 1].zellen[0].t, "de")) break;
        out.push({ ...teil[0], zellen: teil.map((r, k) => ({ t: r.zellen[0].t, x: k * 100 })) });
        j += n;
      }
      // Summenblock: Bezeichnung und Betrag stehen untereinander
      while (j + 1 < z.length && z[j].zellen.length === 1 && z[j + 1].zellen.length === 1 && SUMME.test(z[j].zellen[0].t) && zahlLesen(z[j + 1].zellen[0].t, "de")) {
        out.push({ ...z[j], zellen: [z[j].zellen[0], { t: z[j + 1].zellen[0].t, x: 500 }] });
        j += 2;
      }
      i = j - 1;
      continue;
    }
    out.push(z[i]);
  }
  return out.map((r, i) => ({ ...r, i, text: r.zellen.map(c => c.t).join("  ") }));
}

// Dezimalschreibweise des Dokuments: 1.234,56 (de) oder 1,234.56 (en)
function dezimalVon(zeilen) {
  let de = 0, en = 0;
  for (const r of zeilen) { de += (r.text.match(/\d,\d{2}(?!\d)/g) || []).length; en += (r.text.match(/\d\.\d{2}(?!\d)(?!\.\d)/g) || []).length; }
  return en > de ? "en" : "de";
}

// Wert hinter einer Bezeichnung: in derselben Zelle („Rechnungsnummer: 2026-01“), in der nächsten Zelle oder in der Zeile darunter
function hinter(zeilen, re, passt = s => !!s.trim()) {
  for (const r of zeilen) {
    for (let k = 0; k < r.zellen.length; k++) {
      const m = re.exec(r.zellen[k].t);
      if (!m) continue;
      const rest = r.zellen[k].t.slice(m.index + m[0].length).replace(/^\s*[:.#]?\s*/, "");
      if (passt(rest)) return { wert: rest, zeile: r };
      if (!rest || /^[:.#\s]*$/.test(rest)) {
        if (k + 1 < r.zellen.length && passt(r.zellen[k + 1].t)) return { wert: r.zellen[k + 1].t, zeile: r };
        const unten = zeilen[r.i + 1];
        if (unten && r.zellen.length === 1) {
          const c = unten.zellen.find(c => Math.abs(c.x - r.zellen[k].x) <= Math.max(r.tol || 1, 1) * 3) || (unten.zellen.length === 1 ? unten.zellen[0] : null);
          if (c && passt(c.t)) return { wert: c.t, zeile: unten };
        }
      }
    }
  }
  return null;
}

// ---------- Anschriftblöcke ----------
function bloeckeFinden(zeilen) {
  const out = [];
  const naheX = (a, b, r) => Math.abs(a.x - b.x) <= (r.tol ?? 1);
  for (const r of zeilen) {
    for (const c of r.zellen) {
      // Absenderzeile „Name · Straße 1 · 12345 Ort“ (über dem Anschriftfeld oder im Fuß)
      const teile = c.t.split(/\s+[·•|]\s+|\s+[–-]\s+(?=\S)|,\s+(?=\d{4,5}\s)/).map(s => s.trim()).filter(Boolean);
      const pi = teile.findIndex(s => PLZ_ORT.test(s));
      if (teile.length >= 3 && pi >= 2) {
        const m = PLZ_ORT.exec(teile[pi]);
        out.push({ inline: true, name: teile[0], strasse: teile[pi - 1], zusatz: "", plz: m[2], ort: m[3].trim(), land: m[1] && /^(A|AT)$/.test(m[1]) ? "AT" : m[1] === "CH" ? "CH" : "DE", zeile: r, x: c.x, kontakt: false, empfLabel: false, bereich: r.bereich });
        continue;
      }
      const m = PLZ_ORT.exec(c.t);
      if (!m || teile.length > 1 && pi !== 0) continue;
      const hoch = [];
      let empfLabel = false;
      for (let j = r.i - 1; j >= 0 && hoch.length < 5; j--) {
        const o = zeilen[j], oc = o.zellen.find(x => naheX(x, c, o));
        if (!oc) break;
        if (r.y != null && o.y != null && (o.y - (hoch.length ? hoch[0].zeile.y : r.y)) > 2.4 * (r.g || 12)) break;
        if (PLZ_ORT.test(oc.t) || datenIn(oc.t).length || /\S\s+[·•|]\s+\S.*\d{4,5}\s/.test(oc.t)) break;
        if (/(rechnungs)?empfänger|^an:?$|^kunde:?$|bill(ed)? to|invoice to|rechnung an|leistungsempfänger|^empfänger|auftraggeber/i.test(oc.t) && /:$|^\S+$|to$/i.test(oc.t.trim())) { empfLabel = true; break; }
        if (/:\s*\S/.test(oc.t) && !/^z\.?\s?hd/i.test(oc.t)) break;
        if (KONTAKT.test(oc.t) || /@/.test(oc.t) || zeilen[j + 1].abstand) break;
        hoch.unshift({ t: oc.t, zeile: o });
      }
      // Bezeichnung direkt über dem Block (eine Zeile Abstand erlaubt)
      if (!empfLabel) for (let j = r.i - hoch.length - 1; j >= Math.max(0, r.i - hoch.length - 2); j--) { const o = zeilen[j]; if (o && o.zellen.some(x => naheX(x, c, o) && /empfänger|bill(ed)? to|invoice to|rechnung an|^an:?$|^kunde:?$/i.test(x.t))) empfLabel = true; }
      while (hoch.length && ANREDE.test(hoch[0].t)) hoch.shift();
      if (!hoch.length) continue;
      // Land in der Zeile darunter
      let land = m[1] && /^(A|AT)$/.test(m[1]) ? "AT" : m[1] === "CH" ? "CH" : "DE", unten = 1;
      const u = zeilen[r.i + 1], uc = u && u.zellen.find(x => naheX(x, c, u));
      if (uc && LAENDER[uc.t.toLowerCase().replace(/[.,]$/, "")]) { land = LAENDER[uc.t.toLowerCase().replace(/[.,]$/, "")]; unten = 2; }
      // Kontaktangaben im selben Block darunter: typisch für einen Briefkopf (Absender)
      let kontakt = false;
      for (let j = r.i + unten; j < Math.min(zeilen.length, r.i + unten + 3); j++) { const o = zeilen[j], oc = o.zellen.find(x => naheX(x, c, o)); if (oc && (KONTAKT.test(oc.t) || /@/.test(oc.t))) kontakt = true; if (!oc) break; }
      const namen = hoch.map(h => h.t);
      const strasse = namen.length >= 2 ? namen[namen.length - 1] : "";
      out.push({ inline: false, name: namen[0], zusatz: namen.slice(1, -1).join(", "), strasse, plz: m[2], ort: m[3].trim(), land, zeile: r, x: c.x, kontakt, empfLabel, bereich: r.bereich, bis: r.i + unten - 1, von: r.i - hoch.length });
    }
  }
  return out;
}

// ---------- Positionen ----------
function zeileLesen(r, dezimal) {
  const zellen = r.zellen.map(c => c.t);
  // „1 Stück“, „6,5 Std.“: Menge und Einheit in einer Zelle trennen; „2.450,00 €“ bleibt ein Betrag
  const teile = [];
  for (const t of zellen) {
    const m = /^([-\d.,]+)\s*([A-Za-zäöüÄÖÜ²³.]{1,12})$/.exec(t);
    if (m && zahlLesen(m[1], dezimal, 3) && (einheitVon(m[2]) || SONST_EINHEIT.test(m[2])) && !/^(eur|€)$/i.test(m[2])) { teile.push(m[1], m[2]); continue; }
    // „1 x“ „2x“
    teile.push(t);
  }
  let satz = null, einheit = null, einheitRoh = null;
  const zahlen = [], text = [];
  teile.forEach((t, k) => {
    const p = /^(\d{1,2}(?:[.,]\d{1,2})?)\s*%$/.exec(t);
    if (p) { satz = Number(p[1].replace(",", ".")); return; }
    const z = zahlLesen(t, dezimal);
    if (z) { zahlen.push({ ...z, k, betrag: /€|eur/i.test(t) || z.stellen === 2 }); return; }
    if (einheitVon(t) || SONST_EINHEIT.test(t)) { einheit = einheitVon(t); einheitRoh = t; return; }
    text.push({ t, k });
  });
  // Laufende Nummer vorn weg
  if (zahlen.length && zahlen[0].k === 0 && Number.isInteger(zahlen[0].wert) && zahlen[0].stellen === 0 && zahlen[0].wert < 1000 && text.length && text[0].k > 0) zahlen.shift();
  if (!zahlen.length || !text.length) return null;
  const gesamt = zahlen[zahlen.length - 1];
  let menge = null, preis = null;
  const passt = (m, p) => Math.abs(Math.round(m.wert * p.wert * 100) - Math.round(gesamt.wert * 100)) <= 1;
  if (zahlen.length >= 3) {
    // die rechten drei: Menge, Preis, Betrag; sonst jede Paarung links vom Betrag, die aufgeht
    const [a, b] = zahlen.slice(-3, -1);
    if (passt(a, b)) { menge = a; preis = b; }
    else for (let x = 0; x < zahlen.length - 1 && !menge; x++) for (let y = x + 1; y < zahlen.length - 1; y++) if (passt(zahlen[x], zahlen[y])) { menge = zahlen[x]; preis = zahlen[y]; break; }
    if (!menge) { menge = a; preis = b; }
  } else if (zahlen.length === 2) {
    const a = zahlen[0];
    if (Math.abs(a.wert - gesamt.wert) < 0.005) { preis = a; menge = { wert: 1, text: "1", stellen: 0 }; }
    else if (a.wert === 0) { preis = { wert: gesamt.wert, text: gesamt.text }; menge = { wert: 1, text: "1", stellen: 0 }; }
    else if (a.stellen <= 3 && !a.betrag && gesamt.wert !== 0 && Number.isFinite(gesamt.wert / a.wert)) { menge = a; }
    else { preis = a; menge = { wert: Math.round(gesamt.wert / a.wert * 1000) / 1000, text: zahlText(BigInt(Math.round(gesamt.wert / a.wert * 1000)), 3), stellen: 3 }; }
  }
  if (!menge) menge = { wert: 1, text: "1", stellen: 0 };
  if (!menge.wert) menge = { wert: 1, text: "1", stellen: 0 };
  if (!preis) {
    const p = gesamt.wert / menge.wert;
    preis = { wert: p, text: String(Math.round(p * 10000) / 10000) };
  }
  return { name: text.map(x => x.t).join(" "), menge, preis, gesamt, satz, einheit, einheitRoh };
}

function positionenFinden(zeilen, dezimal) {
  const ende = r => SUMME.test(r.zellen[0].t) || r.zellen.length <= 2 && r.zellen.some(c => SUMME.test(c.t));
  const kopf = zeilen.find(r => {
    const arten = r.zellen.flatMap(c => kopfArt(c.t) ? [kopfArt(c.t)] : c.t.split(/\s+/).map(kopfArt).filter(Boolean));
    return new Set(arten).size >= 3 && arten.includes("text") && (arten.includes("gesamt") || arten.includes("preis"));
  });
  const pos = [], uebersprungen = [];
  let start = kopf ? kopf.i + 1 : -1;
  let mitSteuer = !!kopf && kopf.zellen.some(c => kopfArt(c.t) === "steuer" || /mwst|ust|vat/i.test(c.t));
  const liste = kopf ? zeilen.slice(start) : zeilen;
  let letzte = null, offen = !!kopf;
  for (const r of liste) {
    if (r.bereich !== "haupt") continue;
    if (kopf && r.zellen.length >= 2 && r.zellen.filter(c => kopfArt(c.t)).length >= 3) { offen = true; continue; } // Kopf auf der Folgeseite
    if (/^(seite|page)\s+\d+/i.test(r.text) || /^(übertrag|uebertrag|carried forward)/i.test(r.text)) continue;
    if (ende(r)) { if (kopf && pos.length) offen = false; letzte = null; if (kopf && pos.length && !zeilen.slice(r.i + 1).some(x => x.zellen.filter(c => kopfArt(c.t)).length >= 3)) break; continue; }
    if (!offen && kopf) continue;
    const p = zeileLesen(r, dezimal);
    if (p) {
      // ohne Kopf: nur Zeilen, deren letzte Zelle ein Betrag mit zwei Nachkommastellen ist und die keine Angabe wie Datum oder IBAN sind
      if (!kopf && (p.gesamt.stellen !== 2 || datenIn(r.text).length || /iban|bic|tel|fax|steuer|ust-?id|konto|blz|hrb|telefon|plz/i.test(r.text))) { letzte = null; continue; }
      pos.push({ ...p, zeile: r });
      letzte = pos[pos.length - 1];
      continue;
    }
    // Text ohne Betrag unter einer Position: Beschreibung dazu
    if (letzte && kopf && r.zellen.every(c => !zahlLesen(c.t, dezimal)) && r.text.length < 300) { letzte.beschreibung = [letzte.beschreibung, r.text.replace(/\s{2,}/g, " ")].filter(Boolean).join("\n"); continue; }
    if (!kopf) letzte = null;
    else uebersprungen.push(r);
  }
  // Ohne Kopf: nur die erste zusammenhängende Gruppe vor der ersten Summenzeile
  if (!kopf && pos.length) {
    const erste = zeilen.find(r => ende(r) && r.i > pos[0].zeile.i);
    const gruppe = pos.filter(p => !erste || p.zeile.i < erste.i);
    return { pos: gruppe, mitSteuer: false, kopf: false };
  }
  return { pos, mitSteuer, kopf: !!kopf };
}

// Summen des Dokuments: Netto, Steuer je Satz (mit Bemessungsgrundlage, wenn angegeben), Brutto
function summenFinden(zeilen, dezimal, nach) {
  const s = { netto: null, brutto: null, steuern: [] };
  const betragAm = r => { for (let k = r.zellen.length - 1; k >= 0; k--) { const t = r.zellen[k].t.replace(/^.*?\s(?=[-\d.,]+\s*(€|EUR)?$)/i, ""); const z = zahlLesen(t, dezimal); if (z && z.stellen === 2) return z; } return null; };
  for (const r of zeilen) {
    if (r.i <= nach) continue;
    const t = r.text.toLowerCase();
    const b = betragAm(r);
    if (!b) continue;
    if (/(summe netto|nettobetrag|netto-?summe|gesamt netto|nettosumme|zwischensumme|^netto|^summe\b|subtotal|sub-total|net amount|total net|total excl)/.test(t) && s.netto == null) s.netto = b;
    else if (/(mwst|ust\b|umsatzsteuer|mehrwertsteuer|\bvat\b|\btax\b)/.test(t) && !/(inkl|enthalten|incl)/.test(t) && /\d\s*%/.test(t)) {
      const satz = Number((/(\d{1,2}(?:[.,]\d{1,2})?)\s*%/.exec(t) || [])[1]?.replace(",", "."));
      const basis = (/auf\s+([\d.,]+)|on\s+([\d.,]+)|von\s+([\d.,]+)/.exec(t) || []).slice(1).find(Boolean);
      s.steuern.push({ satz, betrag: b, basis: basis ? zahlLesen(basis, dezimal) : null });
    } else if (/(rechnungsbetrag|gesamtbetrag|bruttobetrag|endbetrag|zu zahlen|zahlbetrag|gesamtsumme|brutto|total due|amount due|grand total|balance due|^total\b|^gesamt\b|summe brutto|total amount)/.test(t)) s.brutto = b;
  }
  if (s.brutto == null && s.netto != null && !s.steuern.length) s.brutto = s.netto;
  return s;
}

// Hauptfunktion. firma: die eigenen Firmendaten (zur Unterscheidung von Absender und Empfänger); lang: Schreibweise der Felder
export function rechnungErkennen(zeilenRoh, { firma = null, lang = "de" } = {}) {
  const zeilen = vorbereiten(zeilenRoh || []);
  const dezimal = dezimalVon(zeilen);
  const alles = zeilen.map(r => r.text).join("\n");
  const hinweise = [], gefunden = {};
  const eigen = firma && firma.name ? falten(firma.name) : "";

  // Rechnungsnummer
  const NUMMER = /(rechnungs?\s*-?\s*(nummer|nr\.?|no\.?)|rechnung\s+(nr\.?|nummer|no\.?)|re\.?\s*-?\s*nr\.?|beleg\s*-?\s*(nummer|nr\.?)|invoice\s*(no\.?|number|#|nr\.?)|invoice\s+id)/i;
  const nrToken = s => { const m = /^[#:\s]*([A-Za-z0-9][\w\-/.]*\d[\w\-/.]*|\d+)/.exec(s); return m && !datenIn(m[1]).length ? m[1].replace(/[.,;:]$/, "") : ""; };
  let nr = hinter(zeilen, NUMMER, s => !!nrToken(s));
  let nummer = nr ? nrToken(nr.wert) : "";
  if (!nummer) { const t = zeilen.find(r => /^(rechnung|invoice)\s+[#:]?\s*[A-Za-z0-9\-/]*\d/i.test(r.zellen[0].t)); if (t) nummer = nrToken(t.zellen[0].t.replace(/^(rechnung|invoice)\s+/i, "")); }
  if (nummer) gefunden.nummer = true;

  // Rechnungsdatum: Bezeichnung, „Ort, den …“, sonst das erste Datum, das keiner anderen Bezeichnung gehört
  const datumHinter = re => { const h = hinter(zeilen, re, s => datenIn(s).length > 0 && datenIn(s)[0].i < 4); return h ? datenIn(h.wert)[0].d : ""; };
  let datum = datumHinter(/(rechnungsdatum|belegdatum|invoice\s*date|date\s+of\s+invoice|(?:^|[^A-Za-zäöüß-])datum(?![a-zäöü])|(?:^|[^A-Za-z ])date(?![a-z]))/i);
  if (!datum) { const m = /,\s*(den|am)?\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}|\d{1,2}\.\s+[A-Za-zä]+\s+\d{4})/i.exec(alles); if (m) datum = (datenIn(m[2])[0] || {}).d || ""; }
  if (!datum) {
    for (const r of zeilen) { if (/(leistung|liefer|fällig|zahlbar|bis zum|zeitraum|period|due|service|delivery|geburt)/i.test(r.text)) continue; const d = datenIn(r.text)[0]; if (d) { datum = d.d; break; } }
  }
  if (datum) gefunden.datum = true;

  // Leistung: Zeitraum oder Tag
  let leistung = null;
  const zr = hinter(zeilen, /(leistungszeitraum|abrechnungszeitraum|lieferzeitraum|zeitraum|service\s*period|billing\s*period|period(?! of)|leistung\s+vom)/i, s => datenIn(s).length >= 2);
  if (zr) { const d = datenIn(zr.wert); leistung = { art: "zeitraum", von: d[0].d, bis: d[1].d, datum: "" }; }
  if (!leistung) { const ld = datumHinter(/(leistungsdatum|lieferdatum|liefertag|leistungstag|tag der leistung|leistungszeitpunkt|lieferung am|leistung am|delivery\s*date|date\s*of\s*(supply|delivery|service)|service\s*date)/i); if (ld) leistung = { art: "datum", datum: ld, von: "", bis: "" }; }
  if (!leistung && /leistungsdatum entspricht dem rechnungsdatum|leistung(sdatum)? = rechnungsdatum/i.test(alles) && datum) leistung = { art: "datum", datum, von: "", bis: "" };
  if (!leistung) {
    // „Leistungszeitraum Oktober 2026“, „im Monat Oktober 2026“
    const m = new RegExp(`(leistungszeitraum|zeitraum|leistung|abrechnung|monat|period)[^\\n]{0,20}?\\b([${L}]{3,9})\\s+(\\d{4})\\b`, "i").exec(alles);
    const mo = m && MONATE[m[2].toLowerCase()];
    if (mo) { const von = iso(m[3], mo, 1), bis = iso(m[3], mo, new Date(Date.UTC(+m[3], mo, 0)).getUTCDate()); leistung = { art: "zeitraum", von, bis, datum: "" }; }
  }
  if (leistung) gefunden.leistung = true;
  else { leistung = { art: "datum", datum, von: "", bis: "" }; if (datum) hinweise.push({ art: "leistung", wert: "", name: "" }); }

  // Zahlungsziel in Tagen
  let zielTage = "";
  const zt = /(innerhalb|binnen|within|in)\s+(von\s+)?(\d{1,3})\s*(kalender)?(tagen|tage|days)|zahlungsziel:?\s*(\d{1,3})\s*tage|(\d{1,3})\s*tage\s+(netto|ohne abzug|rein netto)|net\s*(\d{1,3})\b|(\d{1,3})\s*days\s+net/i.exec(alles);
  if (zt) zielTage = String(+(zt[3] || zt[6] || zt[7] || zt[9] || zt[10]));
  if (!zielTage && datum) {
    const f = hinter(zeilen, /(fällig\s*(am|bis)?|zahlbar\s*(bis|am)(\s*zum)?|bis\s*zum|bis\s*spätestens|zahlungsfrist|fälligkeit|due\s*(date|by|on)?)/i, s => datenIn(s).length > 0 && datenIn(s)[0].i < 30);
    if (f) { const d = datenIn(f.wert)[0].d; const t = Math.round((Date.parse(d) - Date.parse(datum)) / 864e5); if (t >= 0 && t <= 365) zielTage = String(t); }
  }
  if (!zielTage && /(sofort|umgehend|ohne abzug sofort|due on receipt|payable immediately)/i.test(alles)) zielTage = "0";
  if (zielTage) gefunden.ziel = true;

  // Anschriften: Empfänger und Absender
  const bloecke = bloeckeFinden(zeilen);
  const absenderName = new Set(bloecke.filter(b => b.inline).map(b => falten(b.name)));
  const punkte = b => {
    let s = 0;
    if (b.empfLabel) s += 4;
    if (b.inline) s -= 6;
    if (eigen && (falten(b.name) === eigen || falten(b.name).includes(eigen) || eigen.includes(falten(b.name)))) s -= 5;
    if (absenderName.has(falten(b.name))) s -= 4;
    if (b.bereich !== "haupt" || b.zeile.unten) s -= 3;
    if (b.kontakt) s -= 2;
    if (b.strasse) s += 1;
    return s;
  };
  const kandidaten = bloecke.filter(b => !b.inline).map(b => ({ b, s: punkte(b) })).sort((a, b) => b.s - a.s || a.b.zeile.i - b.b.zeile.i);
  const empf = kandidaten.length && kandidaten[0].s > -2 ? kandidaten[0].b : null;
  const abs = bloecke.filter(b => b !== empf).map(b => ({ b, s: punkte(b) })).sort((a, b) => a.s - b.s || (b.b.inline - a.b.inline))[0]?.b || null;
  if (empf) gefunden.empfaenger = true;

  // Steuernummer, USt-IdNr., IBAN, BIC, E-Mail, Telefon, Handelsregister
  const stnr = /(steuer\s*-?\s*nummer|steuer-?nr\.?|st\.?\s*-?\s*nr\.?|stnr\.?|tax\s*(no\.?|number))\s*[:.]?\s*(\d[\d /]{8,16}\d)/i.exec(alles);
  const ustids = [...alles.matchAll(/\b(DE\s?\d{3}\s?\d{3}\s?\d{3}|ATU\d{8}|(?:BE|NL|LU|FR|IT|ES|PL|CZ|DK|SE|GB|CHE)[\s-]?[0-9A-Z.]{8,14}(?:\s?MWST)?)\b/g)].map(m => ({ wert: m[1].replace(/[\s.-]|MWST/g, ""), i: m.index }));
  const zeileVon = i => { let n = 0; for (const r of zeilen) { n += r.text.length + 1; if (n > i) return r; } return null; };
  let ustEigen = "", ustEmpf = "";
  for (const u of ustids) {
    const r = zeileVon(u.i), vorher = alles.slice(Math.max(0, u.i - 60), u.i);
    const beimEmpf = empf && r && ((r.i > empf.zeile.i && r.i <= empf.zeile.i + 3 && r.zellen.some(c => Math.abs(c.x - empf.x) <= (r.tol ?? 1))) || /(ihre|kunden|customer|leistungsempfänger|empfänger|buyer)[^\n]{0,30}$/i.test(vorher));
    if (beimEmpf) { if (!ustEmpf) ustEmpf = u.wert; } else if (!ustEigen && (!firma || !firma.ustid || ibanNormal(firma.ustid) === u.wert || !ustEigen)) ustEigen = u.wert;
  }
  let iban = "";
  const flach = alles.replace(/\n/g, " ");
  for (const m of flach.matchAll(/\b([A-Z]{2}\d{2})((?:\s?[A-Z0-9]){10,30})/g)) {
    const roh = (m[1] + m[2]).replace(/\s/g, "");
    for (let n = Math.min(34, roh.length); n >= 15; n--) if (ibanGueltig(roh.slice(0, n))) { iban = roh.slice(0, n); break; }
    if (iban) break;
  }
  const bicM = /\b(?:bic|swift(?:-?code)?|bic\/swift)\s*[:.]?\s*([A-Z]{4}\s?[A-Z]{2}\s?[A-Z0-9]{2}(?:\s?[A-Z0-9]{3})?)\b/i.exec(flach);
  const bic = bicM && bicGueltig(bicM[1].replace(/\s/g, "").toUpperCase()) ? bicM[1].replace(/\s/g, "").toUpperCase() : "";
  const mails = [...flach.matchAll(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g)].map(m => ({ wert: m[0], r: zeileVon(m.index) }));
  const naheBlock = (b, r) => b && r && r.i >= (b.von ?? b.zeile.i) - 1 && r.i <= (b.bis ?? b.zeile.i) + 4 && r.zellen.some(c => Math.abs(c.x - b.x) <= (r.tol ?? 1));
  const mailEmpf = (mails.find(m => naheBlock(empf, m.r) && !naheBlock(abs, m.r)) || {}).wert || ((/(e-?mail|mail)\s*(des|an|empfänger|kunde)[^:]*:\s*([\w.+-]+@[\w-]+(\.[\w-]+)+)/i.exec(flach) || [])[3]) || "";
  const mailEigen = (mails.find(m => m.wert !== mailEmpf) || {}).wert || "";
  const tel = /(?:tel(?:efon)?|fon|phone|mobil(?:e)?)\.?\s*[:.]?\s*(\+?\d[\d /()-]{4,22}\d)/i.exec(flach);
  const reg = /((?:[Aa]mtsgericht|Registergericht|AG)\s+[A-ZÄÖÜ][\wäöüß-]+(?:\s+(?!HR[AB]\b)[A-ZÄÖÜ][\wäöüß-]+)?\s*,?\s*)?\b(HR[AB]\s?\d+\s?[A-Z]?|GnR\s?\d+|PR\s?\d+|VR\s?\d+)\b/.exec(flach);
  // Ansprechpartner: Name unter dem Gruß
  const gruss = zeilen.findIndex(r => /^(mit freundlichen grüßen|mit freundlichem gruß|viele grüße|beste grüße|freundliche grüße|kind regards|best regards|yours sincerely)/i.test(r.zellen[0].t));
  const kontaktName = gruss >= 0 && zeilen[gruss + 1] && /^[A-ZÄÖÜ][a-zäöüß]+(\s+[A-ZÄÖÜ][\wäöüß.-]+){1,3}$/.test(zeilen[gruss + 1].zellen[0].t) ? zeilen[gruss + 1].zellen[0].t
    : ((/(?:[Gg]eschäftsführer(?:in)?|[Ii]nhaber(?:in)?|[Aa]nsprechpartner(?:in)?)\s*:?\s*([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß-]+)/.exec(flach) || [])[1] || "");

  // Steuer
  const klein = /§\s*19\s*(abs\.?\s*1\s*)?ustg|kleinunternehmer/i.test(alles);
  if (/§\s*13\s?b|reverse\s*charge|steuerschuldnerschaft des leistungsempfängers|steuerschuld(nerschaft)? geht|autoliquidation/i.test(alles)) hinweise.push({ art: "umkehr", wert: "", name: "" });
  if (/innergemeinschaftliche lieferung|§\s*4\s*nr\.?\s*1\s*b|intra-community supply/i.test(alles)) hinweise.push({ art: "eu", wert: "", name: "" });
  if (/(inkl\.?|inklusive|enthalten(e)?|includes|including)\s*(\d{1,2}\s*%\s*)?(mwst|ust|umsatzsteuer|mehrwertsteuer|vat)/i.test(alles) && !/(zzgl|zuzüglich|plus|netto)/i.test(alles)) hinweise.push({ art: "brutto", wert: "", name: "" });

  // Positionen und Summen
  const { pos, mitSteuer, kopf } = positionenFinden(zeilen, dezimal);
  const letztePos = pos.length ? pos[pos.length - 1].zeile.i : (empf ? empf.zeile.i : -1);
  const sum = summenFinden(zeilen, dezimal, letztePos);
  const saetze = [...new Set(sum.steuern.map(s => s.satz).filter(n => Number.isFinite(n)))];
  const satzCode = n => n === 19 ? "S19" : n === 7 ? "S7" : n === 0 ? "Z" : null;
  const vorgabe = firma && firma.vorgaben && firma.vorgaben.satz || "S19";
  let steuerAlle = klein || (firma && firma.kleinunternehmer) ? "E" : saetze.length === 1 ? satzCode(saetze[0]) : null;
  if (saetze.length === 1 && !satzCode(saetze[0])) hinweise.push({ art: "satz", wert: `${saetze[0]} %`, name: "" });
  // Zwei Sätze ohne Spalte: die Positionen finden, deren Summe die Bemessungsgrundlage eines Satzes ergibt
  let zuordnung = null;
  if (!steuerAlle && !mitSteuer && saetze.length === 2 && pos.length && pos.length <= 24) {
    const s7 = sum.steuern.find(s => s.satz === 7);
    const basis7 = s7 && (s7.basis ? cent(s7.basis) : BigInt(Math.round(Number(cent(s7.betrag)) / 0.07)));
    const cs = pos.map(p => cent(p.gesamt));
    if (basis7 != null) for (let m = 0; m < 1 << pos.length && !zuordnung; m++) { let s = 0n; for (let k = 0; k < pos.length; k++) if (m >> k & 1) s += cs[k]; if (s5(s, basis7, !s7.basis)) zuordnung = m; }
  }
  function s5(a, b, ungefaehr) { return ungefaehr ? (a > b ? a - b : b - a) <= 100n : a === b; }
  let ohneSatz = false;
  const positionen = pos.map((p, k) => {
    let steuer = steuerAlle || (p.satz != null ? satzCode(p.satz) : null) || (zuordnung != null ? (zuordnung >> k & 1 ? "S7" : "S19") : null);
    if (!steuer) { steuer = klein ? "E" : vorgabe; if (!steuerAlle && (saetze.length > 1 || p.satz != null)) hinweise.push({ art: "steuer", wert: p.satz != null ? `${p.satz} %` : "", name: p.name }); else if (!saetze.length) ohneSatz = true; }
    let einheit = p.einheit || "C62";
    if (!p.einheit && p.einheitRoh) hinweise.push({ art: "einheit", wert: p.einheitRoh, name: p.name });
    if (!EINHEITEN_ERSTELLEN.includes(einheit)) einheit = "C62";
    const preis = Math.round(p.preis.wert * 10000) / 10000, menge = Math.round(p.menge.wert * 1000) / 1000;
    return { name: p.name.slice(0, 400), beschreibung: (p.beschreibung || "").slice(0, 1000), menge: feldText(String(menge), lang), einheit, preis: feldText(String(preis), lang), steuer, artikelnr: "" };
  });
  if (ohneSatz && pos.length && !klein && !(firma && firma.kleinunternehmer)) hinweise.push({ art: sum.brutto && sum.netto && cent(sum.brutto) === cent(sum.netto) ? "ohneSteuer" : "steuer", wert: "", name: "" });
  if (pos.length) gefunden.positionen = pos.length;
  if (klein && !(firma && firma.kleinunternehmer) && firma && firma.name) hinweise.push({ art: "klein", wert: "", name: "" });

  // Leitweg-ID oder Referenz des Käufers (BT-10)
  const lw = /leitweg(?:-?id)?\s*[:.]?\s*(\d{2,12}(?:-[A-Za-z0-9]{1,30})?-\d{2})\b/i.exec(flach);
  const ref = hinter(zeilen, /(ihre?\s+bestell(ung|nummer|-?nr\.?)|bestell\s*-?\s*(nummer|nr\.?)|auftrags\s*-?\s*(nummer|nr\.?)|ihr(e)?\s+(zeichen|referenz)|referenz(nummer)?|kostenstelle|purchase\s*order|po\s*(no\.?|number)|your\s*ref(erence)?|buyer\s*reference|order\s*(no\.?|number))/i, s => /^[\w\-/.]{2,}/.test(s) && !datenIn(s).length);
  const referenz = lw ? lw[1] : ref ? ref.wert.split(/\s{2,}|\s(?=[A-ZÄÖÜ][a-zäöü]+:)/)[0].trim().slice(0, 80) : "";

  const r = rechnungBereinigen({
    sprache: lang, art: "rechnung", nummer, datum, klein: null, leistung,
    empfaenger: empf ? { name: empf.name, strasse: empf.strasse, zusatz: empf.zusatz, plz: empf.plz, ort: empf.ort, land: empf.land, ustid: ustEmpf, email: mailEmpf, behoerde: !!lw, referenz } : { name: "", strasse: "", zusatz: "", plz: "", ort: "", land: "DE", ustid: ustEmpf, email: "", behoerde: !!lw, referenz },
    positionen, befreiung: { wahl: "", text: "" }, nullsatz: positionen.some(p => p.steuer === "Z"), zielTage, zweck: "", bemerkung: "", bezug: "", storno: { nummer: "", datum: "" }, dauer: { turnus: "monat", tag: "1" },
  });
  // Eigene Angaben aus dem Dokument (nur Vorschläge für leere Felder)
  const eigeneDaten = {
    name: abs ? abs.name : "", strasse: abs ? abs.strasse : "", plz: abs ? abs.plz : "", ort: abs ? abs.ort : "",
    steuernummer: stnr ? stnr[3].replace(/\s+/g, " ").trim() : "", ustid: ustEigen, register: reg ? reg[0].replace(/\s+/g, " ").replace(/,\s*$/, "").trim() : "",
    kontakt: { name: kontaktName, telefon: tel ? tel[1].trim() : "", email: mailEigen }, bank: { iban, bic, inhaber: "" }, kleinunternehmer: klein,
  };
  // Nachrechnen und vergleichen
  const nachher = summen({ ...r, art: "rechnung" }, { kleinunternehmer: klein || !!(firma && firma.kleinunternehmer) }, lang);
  const soll = { netto: cent(sum.netto), brutto: cent(sum.brutto) };
  const abweichung = pos.length && ((soll.brutto != null && soll.brutto !== nachher.brutto) || (soll.brutto == null && soll.netto != null && soll.netto !== nachher.netto))
    ? { original: soll.brutto ?? soll.netto, hier: soll.brutto != null ? nachher.brutto : nachher.netto } : null;
  const bestaetigt = !!pos.length && !abweichung && (soll.brutto != null || soll.netto != null);
  if (!pos.length) hinweise.push({ art: "positionen", wert: "", name: "" });
  return { rechnung: r, firma: eigeneDaten, hinweise, abweichung, bestaetigt, summe: soll, gefunden, dezimal, kopf };
}

// Gefundene eigene Angaben nur in leere Felder der Firmendaten übernehmen; Ergebnis: neue Firmendaten und die übernommenen Felder
export function firmaErgaenzen(firma, vorschlag) {
  const f = JSON.parse(JSON.stringify(firma)), neu = [];
  const setze = (o, k, v, feld) => { if (v && !String(o[k] || "").trim()) { o[k] = v; neu.push(feld); } };
  for (const k of ["name", "strasse", "plz", "ort", "steuernummer", "ustid", "register"]) setze(f, k, vorschlag[k], `firma.${k}`);
  for (const k of ["name", "telefon", "email"]) setze(f.kontakt, k, vorschlag.kontakt[k], `firma.kontakt.${k}`);
  for (const k of ["iban", "bic"]) setze(f.bank, k, vorschlag.bank[k], `firma.bank.${k}`);
  if (vorschlag.kleinunternehmer && !f.kleinunternehmer && !String(firma.name || "").trim()) { f.kleinunternehmer = true; neu.push("firma.kleinunternehmer"); }
  return { firma: f, neu };
}
