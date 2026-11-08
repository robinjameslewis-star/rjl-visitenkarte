// Frühere Rechnung als Vorlage (ohne DOM, auch in Node): Folgerechnung (nächste Nummer, nächster Zeitraum, sonst gleiche Angaben)
// und Stornorechnung (Bezug auf Nummer und Datum der ursprünglichen Rechnung, BG-3). Die Vorlage ist eine im Gerät gemerkte Rechnung
// (stamm.js) oder eine geladene XML-Datei: Deren Daten kommen aus derselben Lesestrecke wie beim Prüfen (lesen.js) und werden hier
// auf die Maske von „Erstellen“ abgebildet. Was die Maske nicht kennt (andere Steuerkategorien, Einheiten), wird gemeldet.
import { EINHEITEN_ERSTELLEN, BEFREIUNGEN } from "./texte.js";
import { datumGueltig, datumPlus, dezimalLesen, zahlText, STELLEN } from "./rechnen.js";
import { naechsteNummer } from "./maske.js";
import { rechnungBereinigen } from "./stamm.js";
import { KLEIN, OHNE_REFERENZ, HINWEIS_ANFANG } from "./erzeugen.js";

// Zahl aus der Datei als Eingabe in der Sprache der Oberfläche (1234.5 → „1234,5“)
const zahlFeld = (n, lang) => n == null || !Number.isFinite(n) ? "" : (s => lang === "en" ? s : s.replace(".", ","))(String(n));
const tageZwischen = (a, b) => Math.round((Date.UTC(...b.split("-").map((x, i) => i === 1 ? x - 1 : +x)) - Date.UTC(...a.split("-").map((x, i) => i === 1 ? x - 1 : +x))) / 864e5);

// Aus den gelesenen Daten (lesen.js) die Angaben der Maske; hinweise: was nicht übernommen werden konnte
export function rechnungAusDaten(d, lang = "de") {
  const hinweise = [];
  const k = d.kaeufer || {}, adr = k.anschrift || {}, el = k.elektronisch || null;
  const behoerde = !!el && el.schema === "0204";
  const ref = String(d.referenz || "").trim();
  const art = d.gutschriftDokument || d.art === "381" ? "storno" : d.art === "326" ? "abschlag" : (d.notizen || []).some(n => n.startsWith(HINWEIS_ANFANG.dauer)) ? "dauer" : "rechnung";
  const notizen = (d.notizen || []).filter(n => n !== KLEIN.hinweis && !Object.values(HINWEIS_ANFANG).some(a => n.startsWith(a)));
  const positionen = (d.positionen || []).map(p => {
    let steuer = p.kategorie === "S" && p.satz === 19 ? "S19" : p.kategorie === "S" && p.satz === 7 ? "S7" : p.kategorie === "Z" ? "Z" : p.kategorie === "E" ? "E" : null;
    if (!steuer) { hinweise.push({ art: "steuer", wert: `${p.kategorie} ${p.satz ?? ""}`.trim(), name: p.name }); steuer = "S19"; }
    let einheit = p.einheit || "C62";
    if (!EINHEITEN_ERSTELLEN.includes(einheit)) { hinweise.push({ art: "einheit", wert: einheit, name: p.name }); einheit = "C62"; }
    return { name: p.name || "", beschreibung: p.beschreibung || "", menge: zahlFeld(p.menge, lang), einheit, preis: zahlFeld(p.preis && p.preis.netto, lang), steuer, artikelnr: p.artikelnr || "" };
  });
  const e = (d.steuern || []).find(s => s.kategorie === "E");
  const grund = e && e.grund && e.grund !== KLEIN.grund ? e.grund : "";
  const b = BEFREIUNGEN.find(x => x.text === grund);
  const zt = d.zeitraum || null, lief = d.lieferung && d.lieferung.datum;
  const ziel = datumGueltig(d.datum) && datumGueltig(d.faellig) ? tageZwischen(d.datum, d.faellig) : null;
  const zweck = (d.zahlung && d.zahlung[0] && d.zahlung[0].zweck) || "";
  const bed = String(d.bedingungen || "");
  const dauer = { turnus: /vierteljährlich/.test(bed) ? "quartal" : /(^|\s)jährlich/.test(bed) ? "jahr" : "monat", tag: (/jeweils am (\d{1,2})\./.exec(bed) || [])[1] || "1" };
  const vorher = (d.vorherige || [])[0] || {};
  const r = rechnungBereinigen({
    sprache: lang, art, nummer: d.nummer, datum: d.datum,
    leistung: zt && (zt.von || zt.bis) ? { art: "zeitraum", von: zt.von, bis: zt.bis } : { art: "datum", datum: lief || d.datum },
    empfaenger: { name: k.name, strasse: (adr.zeilen || [])[0] || "", zusatz: (adr.zeilen || [])[1] || "", plz: adr.plz, ort: adr.ort, land: adr.land || "DE", ustid: k.ustid,
      email: el && el.schema === "EM" ? el.wert : (k.kontakt && k.kontakt.email) || "", behoerde, referenz: behoerde ? el.wert : Object.values(OHNE_REFERENZ).includes(ref) ? "" : ref },
    positionen, befreiung: b ? { wahl: b.id, text: b.text } : grund ? { wahl: "eigen", text: grund } : { wahl: "", text: "" },
    nullsatz: positionen.some(p => p.steuer === "Z"), zielTage: ziel != null && ziel >= 0 && ziel <= 365 ? String(ziel) : "", zweck: zweck === `Rechnung ${d.nummer}` ? "" : zweck,
    bemerkung: notizen.join("\n"), bezug: d.projekt || "", storno: { nummer: vorher.nummer || "", datum: vorher.datum || "" }, dauer,
  });
  return { rechnung: r, hinweise };
}

// Nächster Zeitraum gleicher Länge: ganze Monate (1. bis Monatsletzter) rücken um ihre Zahl von Monaten weiter, sonst um ihre Tage
export function naechsterZeitraum(von, bis) {
  if (!datumGueltig(von) || !datumGueltig(bis) || von > bis) return { von: "", bis: "" };
  const [jv, mv, tv] = von.split("-").map(Number), [jb, mb] = bis.split("-").map(Number);
  const ultimo = datumPlus(bis, 1).endsWith("-01");
  if (tv === 1 && ultimo) {
    const n = (jb - jv) * 12 + (mb - mv) + 1;
    const start = new Date(Date.UTC(jv, mv - 1 + n, 1)), ende = new Date(Date.UTC(jv, mv - 1 + 2 * n, 0));
    return { von: start.toISOString().slice(0, 10), bis: ende.toISOString().slice(0, 10) };
  }
  const tage = tageZwischen(von, bis) + 1;
  return { von: datumPlus(von, tage), bis: datumPlus(bis, tage) };
}

// Folgerechnung: gleiche Angaben, neue Nummer und neues Datum, Zeitraum weiter (ein Leistungstag wird heute); aus einer Storno-
// rechnung wird wieder eine Rechnung
export function folgeRechnung(alt, letzte, heute) {
  const r = rechnungBereinigen(alt);
  r.art = r.art === "storno" ? "rechnung" : r.art;
  r.storno = { nummer: "", datum: "" };
  r.nummer = naechsteNummer(letzte || r.nummer, heute);
  r.datum = heute;
  if (r.leistung.art === "zeitraum") Object.assign(r.leistung, naechsterZeitraum(r.leistung.von, r.leistung.bis));
  else r.leistung.datum = heute;
  return r;
}
// Stornorechnung: dieselben Positionen und dieselbe Leistung, Bezug auf die ursprüngliche Rechnung, eigene neue Nummer
export function stornoRechnung(alt, letzte, heute) {
  const r = rechnungBereinigen(alt);
  r.storno = { nummer: r.nummer, datum: r.datum };
  r.art = "storno";
  r.nummer = naechsteNummer(letzte || r.nummer, heute);
  r.datum = heute;
  return r;
}

// Mengen und Preise in die Schreibweise der Oberfläche bringen (eine auf Englisch gemerkte Rechnung in der deutschen Oberfläche)
export function spracheWechseln(r, lang) {
  if ((r.sprache || "de") === lang) return r;
  const um = (v, stellen) => { const x = dezimalLesen(v, r.sprache || "de", stellen); if (x == null) return v; const t = zahlText(x, stellen); return lang === "en" ? t : t.replace(".", ","); };
  return { ...r, sprache: lang, positionen: r.positionen.map(p => ({ ...p, menge: um(p.menge, STELLEN.menge), preis: um(p.preis, STELLEN.preis) })) };
}
