// Rechnen für „Erstellen“ (ohne DOM, auch in Node): Eingaben je Sprache lesen (1.234,56 bzw. 1,234.56), Beträge exakt als ganze
// Zahlen (BigInt) führen – Menge in Tausendsteln, Preis in Zehntausendsteln, Summen in Cent – und nach EN 16931 runden.
// Nie Gleitkomma: 0,1 + 0,2 bleibt 0,3, und 999.999.999,99 € bleiben auf den Cent genau.
export const STELLEN = { menge: 3, preis: 4, betrag: 2 };
export const GRENZE = 99999999999n; // 999.999.999,99 € – höchster Betrag für einen GiroCode
const ZEHN = n => 10n ** BigInt(n);

// Kaufmännisch runden (bei der Hälfte nach oben); alle Werte sind nicht negativ, damit gleich round() in XPath
export const rund = (wert, teiler) => (wert + teiler / 2n) / teiler;

// Zahl aus einer Eingabe: skaliert auf „stellen“ Nachkommastellen; null, wenn es keine nicht negative Zahl mit höchstens so vielen
// Nachkommastellen ist. Tausenderpunkte (de) bzw. -kommas (en) sind erlaubt; „0.5“ auf Deutsch gilt als 0,5, weil nach dem Punkt
// keine drei Ziffern folgen (umgekehrt „1,5“ auf Englisch). Vor dem Punkt nur eine 0 („0.500“) ist nie eine Tausendergruppe: 0,5.
// Gruppen beginnen nicht mit 0 („000.000“ und „0.500.000“ sind ungültig).
export function dezimalLesen(text, lang = "de", stellen = 2) {
  if (typeof text === "bigint") return text;
  let s = String(text ?? "").replace(/[\s  ']/g, "");
  if (!s) return null;
  const komma = lang === "en" ? "." : ",", gruppe = lang === "en" ? "," : ".";
  if (!s.includes(komma)) {
    const teile = s.split(gruppe);
    if (teile.length === 2 && (teile[1].length !== 3 || /^0*$/.test(teile[0]))) s = teile.join(komma);
  }
  const [ganz, nach = "", ...rest] = s.split(komma);
  if (rest.length) return null;
  const gruppiert = new RegExp(`^[1-9]\\d{0,2}(\\${gruppe}\\d{3})+$`);
  const g = !ganz.includes(gruppe) ? ganz : gruppiert.test(ganz) ? ganz.split(gruppe).join("") : null;
  if (g == null || !/^\d*$/.test(g) || !/^\d*$/.test(nach) || (!g && !nach) || nach.length > stellen) return null;
  if (g.length > 15) return null;
  return BigInt(g || "0") * ZEHN(stellen) + BigInt((nach + "0".repeat(stellen)).slice(0, stellen) || "0");
}

// Zahl als Text in der Datei: Punkt als Dezimaltrenner; mindestens „min“ Nachkommastellen, Nullen am Ende sonst weg
export function zahlText(wert, stellen, min = 0) {
  const s = wert.toString().padStart(stellen + 1, "0");
  const ganz = s.slice(0, s.length - stellen) || "0";
  let nach = stellen ? s.slice(-stellen) : "";
  while (nach.length > min && nach.endsWith("0")) nach = nach.slice(0, -1);
  return nach ? `${ganz}.${nach}` : ganz;
}
export const betragText = cent => zahlText(cent, 2, 2);
export const mengeText = m => zahlText(m, STELLEN.menge);
export const preisText = p => zahlText(p, STELLEN.preis, 2);

// Zahl für die Anzeige in der Oberfläche (1.234,56 bzw. 1,234.56), ohne Währung
export function zahlAnzeige(wert, stellen, lang = "de", min = stellen) {
  const [ganz, nach = ""] = zahlText(wert, stellen, min).split(".");
  const gruppe = lang === "en" ? "," : ".", komma = lang === "en" ? "." : ",";
  return ganz.replace(/\B(?=(\d{3})+(?!\d))/g, gruppe) + (nach ? komma + nach : "");
}
export const geldAnzeige = (cent, lang = "de") => lang === "en" ? `€${zahlAnzeige(cent, 2, "en")}` : `${zahlAnzeige(cent, 2, "de")} €`;

// Steuer je Position: S19, S7 (Normalsatz, ermäßigt), Z (Nullsatz), E (steuerfrei, auch Kleinunternehmer)
export const STEUER = { S19: { kategorie: "S", satz: 19n }, S7: { kategorie: "S", satz: 7n }, Z: { kategorie: "Z", satz: 0n }, E: { kategorie: "E", satz: 0n } };
// Kleinunternehmer gilt für die Rechnung, wie die Firmendaten es sagen; eine Stornorechnung behält aber die Steuer der ursprünglichen
// Rechnung (storno.klein, aus der Vorlage): Wer inzwischen Kleinunternehmer ist, berichtigt trotzdem die ausgewiesene Umsatzsteuer
export const kleinFuer = (rechnung, firma) => {
  const st = rechnung && rechnung.art === "storno" && rechnung.storno;
  return st && typeof st.klein === "boolean" ? st.klein : !!(firma && firma.kleinunternehmer);
};
export const steuerVon = (p, klein) => (klein ? "E" : p.steuer) || "S19";

// Nettobetrag einer Position (BT-131) in Cent: Menge × Preis, gerundet auf Cent (PEPPOL-EN16931-R120)
export function zeileNetto(menge, preis) {
  if (menge == null || preis == null) return null;
  return rund(menge * preis, ZEHN(STELLEN.menge + STELLEN.preis - STELLEN.betrag));
}

// Alle Summen der Rechnung nach EN 16931: Positionen (BT-131, BR-CO-10), je Steuerkategorie und Satz die Basis (BT-116) und
// die Steuer (BT-117, je Gruppe gerundet, BR-CO-17), Steuer gesamt (BT-110, BR-CO-14), brutto (BT-112, BR-CO-15) und Zahlbetrag.
// Ungültige Positionen zählen nicht mit (die Maske meldet sie); ohne Nachlässe und Zuschläge ist netto (BT-109) = Positionen.
export function summen(rechnung, firma, lang = rechnung.sprache || "de") {
  const klein = kleinFuer(rechnung, firma);
  const zeilen = (rechnung.positionen || []).map(p => {
    const menge = dezimalLesen(p.menge, lang, STELLEN.menge), preis = dezimalLesen(p.preis, lang, STELLEN.preis);
    const code = steuerVon(p, klein);
    return { menge, preis, code, ...STEUER[code], netto: zeileNetto(menge, preis) };
  });
  const gruppen = new Map();
  for (const z of zeilen) {
    if (z.netto == null) continue;
    const k = `${z.kategorie}${z.satz}`;
    if (!gruppen.has(k)) gruppen.set(k, { kategorie: z.kategorie, satz: z.satz, basis: 0n, steuer: 0n });
    gruppen.get(k).basis += z.netto;
  }
  const reihe = { S: 0, Z: 1, E: 2 };
  const liste = [...gruppen.values()].sort((a, b) => reihe[a.kategorie] - reihe[b.kategorie] || Number(b.satz - a.satz));
  for (const g of liste) g.steuer = g.kategorie === "S" ? rund(g.basis * g.satz, 100n) : 0n;
  const positionen = zeilen.reduce((s, z) => s + (z.netto ?? 0n), 0n);
  const steuer = liste.reduce((s, g) => s + g.steuer, 0n);
  return { zeilen, gruppen: liste, positionen, netto: positionen, steuer, brutto: positionen + steuer, zahlbetrag: positionen + steuer, klein };
}

// Datum JJJJ-MM-TT: gültig (auch 29.02. nur im Schaltjahr) und plus Tage
export function datumGueltig(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
export function datumPlus(s, tage) {
  const [j, m, t] = s.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t + tage)).toISOString().slice(0, 10);
}
// Plus ganze Monate; fehlt der Tag im Zielmonat, gilt dessen letzter Tag (31.01. + 1 Monat = 28.02.)
export function monatePlus(s, n) {
  const [j, m, t] = s.split("-").map(Number);
  const letzter = new Date(Date.UTC(j, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(j, m - 1 + n, Math.min(t, letzter))).toISOString().slice(0, 10);
}
export const datumDe = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? `${m[3]}.${m[2]}.${m[1]}` : s || ""; };
