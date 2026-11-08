// Frühere Rechnung als Vorlage (ohne DOM, auch in Node): Folgerechnung (nächste Nummer, nächster Zeitraum, sonst gleiche Angaben)
// und Stornorechnung (Bezug auf Nummer und Datum der ursprünglichen Rechnung, BG-3). Die Vorlage ist eine im Gerät gemerkte Rechnung
// (stamm.js) oder eine geladene XML-Datei: Deren Daten kommen aus derselben Lesestrecke wie beim Prüfen (lesen.js) und werden hier
// auf die Maske von „Erstellen“ abgebildet. Was die Maske nicht kennt (andere Steuerkategorien, Einheiten, Nachlässe und Zuschläge),
// wird gemeldet; danach werden die Summen nachgerechnet und mit denen der Datei verglichen (abweichung).
import { EINHEITEN_ERSTELLEN, BEFREIUNGEN } from "./texte.js";
import { datumGueltig, datumPlus, monatePlus, dezimalLesen, zahlText, summen, STELLEN } from "./rechnen.js";
import { naechsteNummer } from "./maske.js";
import { rechnungBereinigen } from "./stamm.js";
import { KLEIN, OHNE_REFERENZ, HINWEIS_ANFANG, laufzeitAusHinweis } from "./erzeugen.js";

// Zahl aus der Datei als Eingabe in der Sprache der Oberfläche (1234.5 → „1234,5“)
const zahlFeld = (n, lang) => n == null || !Number.isFinite(n) ? "" : (s => lang === "en" ? s : s.replace(".", ","))(String(n));
const cent = n => n == null || !Number.isFinite(n) ? null : BigInt(Math.round(n * 100));
// Preis je Einheit bei einer Basismenge (BT-149, „5,00 € je 100 Stück“): netto / Basis, wenn das auf vier Nachkommastellen aufgeht
function preisJeEinheit(netto, basis) {
  const n = dezimalLesen(String(netto), "en", 12), b = dezimalLesen(String(basis), "en", 12);
  if (n == null || b == null || b === 0n) return { preis: null, genau: false };
  const z = n * 10n ** BigInt(STELLEN.preis);
  return { preis: Number(zahlText((z + b / 2n) / b, STELLEN.preis)), genau: z % b === 0n };
}
const tageZwischen = (a, b) => Math.round((Date.UTC(...b.split("-").map((x, i) => i === 1 ? x - 1 : +x)) - Date.UTC(...a.split("-").map((x, i) => i === 1 ? x - 1 : +x))) / 864e5);

// Aus den gelesenen Daten (lesen.js) die Angaben der Maske; hinweise: was nicht übernommen werden konnte
export function rechnungAusDaten(d, lang = "de") {
  const hinweise = [];
  const k = d.kaeufer || {}, adr = k.anschrift || {}, el = k.elektronisch || null;
  const behoerde = !!el && el.schema === "0204";
  const ref = String(d.referenz || "").trim();
  const dauerNotiz = (d.notizen || []).find(n => n.startsWith(HINWEIS_ANFANG.dauer));
  const art = d.gutschriftDokument || d.art === "381" ? "storno" : d.art === "326" ? "abschlag" : dauerNotiz ? "dauer" : "rechnung";
  const notizen = (d.notizen || []).filter(n => n !== KLEIN.hinweis && !Object.values(HINWEIS_ANFANG).some(a => n.startsWith(a)));
  // Als Kleinunternehmer ausgestellt? (für die Steuer einer Stornorechnung)
  const klein = (d.notizen || []).includes(KLEIN.hinweis) || (d.steuern || []).some(s => s.kategorie === "E" && s.grund === KLEIN.grund);
  if ((d.zuschlaege || []).length) hinweise.push({ art: "zuschlag", wert: "", name: "" });
  const positionen = (d.positionen || []).map(p => {
    let steuer = p.kategorie === "S" && p.satz === 19 ? "S19" : p.kategorie === "S" && p.satz === 7 ? "S7" : p.kategorie === "Z" ? "Z" : p.kategorie === "E" ? "E" : null;
    if (!steuer) { hinweise.push({ art: "steuer", wert: `${p.kategorie} ${p.satz ?? ""}`.trim(), name: p.name }); steuer = "S19"; }
    let einheit = p.einheit || "C62";
    if (!EINHEITEN_ERSTELLEN.includes(einheit)) { hinweise.push({ art: "einheit", wert: einheit, name: p.name }); einheit = "C62"; }
    if ((p.zuschlaege || []).length) hinweise.push({ art: "zuschlag", wert: "", name: p.name });
    const pr = p.preis || {};
    let preis = pr.netto;
    if (pr.basis != null && pr.basis !== 1 && preis != null) {
      const u = preisJeEinheit(preis, pr.basis);
      if (u.preis != null) preis = u.preis;
      if (!u.genau) hinweise.push({ art: "basis", wert: zahlFeld(pr.basis, lang), name: p.name });
    }
    return { name: p.name || "", beschreibung: p.beschreibung || "", menge: zahlFeld(p.menge, lang), einheit, preis: zahlFeld(preis, lang), steuer, artikelnr: p.artikelnr || "" };
  });
  const e = (d.steuern || []).find(s => s.kategorie === "E");
  const grund = e && e.grund && e.grund !== KLEIN.grund ? e.grund : "";
  const b = BEFREIUNGEN.find(x => x.text === grund);
  // Dauerrechnung: In der Datei steht nur der erste Zeitraum (BG-14), die Laufzeit im Hinweis
  const zt = (art === "dauer" && laufzeitAusHinweis(dauerNotiz)) || d.zeitraum || null, lief = d.lieferung && d.lieferung.datum;
  const ziel = datumGueltig(d.datum) && datumGueltig(d.faellig) ? tageZwischen(d.datum, d.faellig) : null;
  const zweck = (d.zahlung && d.zahlung[0] && d.zahlung[0].zweck) || "";
  const bed = String(d.bedingungen || "");
  const dauer = { turnus: /vierteljährlich/.test(bed) ? "quartal" : /(^|\s)jährlich/.test(bed) ? "jahr" : "monat", tag: (/jeweils am (\d{1,2})\./.exec(bed) || [])[1] || "1" };
  const vorher = (d.vorherige || [])[0] || {};
  const r = rechnungBereinigen({
    sprache: lang, art, nummer: d.nummer, datum: d.datum, klein,
    leistung: zt && (zt.von || zt.bis) ? { art: "zeitraum", von: zt.von, bis: zt.bis } : { art: "datum", datum: lief || d.datum },
    empfaenger: { name: k.name, strasse: (adr.zeilen || [])[0] || "", zusatz: (adr.zeilen || [])[1] || "", plz: adr.plz, ort: adr.ort, land: adr.land || "DE", ustid: k.ustid,
      email: el && el.schema === "EM" ? el.wert : (k.kontakt && k.kontakt.email) || "", behoerde, referenz: behoerde ? el.wert : Object.values(OHNE_REFERENZ).includes(ref) ? "" : ref },
    positionen, befreiung: b ? { wahl: b.id, text: b.text } : grund ? { wahl: "eigen", text: grund } : { wahl: "", text: "" },
    nullsatz: positionen.some(p => p.steuer === "Z"), zielTage: ziel != null && ziel >= 0 && ziel <= 365 ? String(ziel) : "", zweck: zweck === `Rechnung ${d.nummer}` ? "" : zweck,
    bemerkung: notizen.join("\n"), bezug: d.projekt || "", storno: { nummer: vorher.nummer || "", datum: vorher.datum || "" }, dauer,
  });
  // Nachrechnen: Weichen netto oder brutto von der Datei ab, stimmt eine Folge- oder Stornorechnung daraus nicht (Storno gesperrt)
  const sm = d.summen || {}, nach = summen({ ...r, art: "rechnung" }, { kleinunternehmer: klein }, lang);
  const soll = { netto: cent(sm.netto), brutto: cent(sm.brutto) };
  const abweichung = (soll.netto != null && soll.netto !== nach.netto) || (soll.brutto != null && soll.brutto !== nach.brutto)
    ? { original: soll.brutto ?? soll.netto, hier: soll.brutto != null ? nach.brutto : nach.netto } : null;
  return { rechnung: r, hinweise, abweichung };
}

// Nächster Zeitraum gleicher Länge: ganze Monate rücken um ihre Zahl von Monaten weiter (01.11.–30.11., 15.01.–14.02., 01.01.–31.03.;
// erkannt daran, dass der Tag nach dem Ende der Beginn plus n Monate ist), sonst um ihre Tage
export function naechsterZeitraum(von, bis) {
  if (!datumGueltig(von) || !datumGueltig(bis) || von > bis) return { von: "", bis: "" };
  const [jv, mv] = von.split("-").map(Number), [jb, mb] = bis.split("-").map(Number);
  const nach = datumPlus(bis, 1), diff = (jb - jv) * 12 + (mb - mv);
  for (const n of [diff, diff + 1]) if (n >= 1 && monatePlus(von, n) === nach) return { von: nach, bis: datumPlus(monatePlus(von, 2 * n), -1) };
  const tage = tageZwischen(von, bis) + 1;
  return { von: datumPlus(von, tage), bis: datumPlus(bis, tage) };
}

// Folgerechnung: gleiche Angaben, neue Nummer und neues Datum, Zeitraum weiter (ein Leistungstag wird heute); aus einer Storno-
// rechnung wird wieder eine Rechnung
export function folgeRechnung(alt, letzte, heute) {
  const r = rechnungBereinigen(alt);
  r.art = r.art === "storno" ? "rechnung" : r.art;
  r.storno = { nummer: "", datum: "", klein: null };
  r.klein = null;
  r.nummer = naechsteNummer(letzte || r.nummer, heute);
  r.datum = heute;
  if (r.leistung.art === "zeitraum") Object.assign(r.leistung, naechsterZeitraum(r.leistung.von, r.leistung.bis));
  else r.leistung.datum = heute;
  return r;
}
// Stornorechnung: dieselben Positionen und dieselbe Leistung, Bezug auf die ursprüngliche Rechnung, eigene neue Nummer
export function stornoRechnung(alt, letzte, heute) {
  const r = rechnungBereinigen(alt);
  // Steuer der ursprünglichen Rechnung behalten (kleinFuer); unbekannt: Kleinunternehmer, wenn alle Positionen ohne Befreiungsgrund steuerfrei sind
  const klein = typeof r.klein === "boolean" ? r.klein : r.positionen.length > 0 && r.positionen.every(p => p.steuer === "E") && !r.befreiung.text.trim();
  r.storno = { nummer: r.nummer, datum: r.datum, klein };
  r.klein = null;
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
