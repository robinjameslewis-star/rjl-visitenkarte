// E-Rechnung schreiben (ohne DOM, auch in Node): aus Firmendaten und Rechnung eine XRechnung 3.0 in der Syntax UBL 2.1 (Invoice).
// Die Elemente stehen in der Reihenfolge der UBL-2.1-XSD (im Browser wird das Schema nicht geprüft, darum fest geordnet); leere
// Angaben werden weggelassen (PEPPOL-EN16931-R008). Beträge rechnet rechnen.js exakt; Feldnummern (BT-…) nach EN 16931.
// Ein Serialisierer für CII (ZUGFeRD) kommt später an dasselbe Modell.
import { summen, STELLEN, betragText, mengeText, preisText, dezimalLesen, datumPlus, datumDe, STEUER, steuerVon } from "./rechnen.js";
import { ibanNormal } from "./iban.js";

export const KENNUNG = "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0"; // BT-24
export const PROZESS = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0"; // BT-23 (PEPPOL-EN16931-R001)
// Rechtstexte in der Datei bleiben deutsch (Empfänger in Deutschland); die Oberfläche zeigt die Übersetzung daneben
export const KLEIN = { grund: "Kleinunternehmer gemäß § 19 UStG", hinweis: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet." };
export const OHNE_REFERENZ = { de: "keine Angabe", en: "n/a" }; // BT-10 ist Pflicht (BR-DE-15), auch ohne Referenz des Kunden
export const zahlbarText = (datum, ziel) => ziel > 0 ? `Zahlbar ohne Abzug bis ${datumDe(datumPlus(datum, ziel))}.` : "Zahlbar sofort ohne Abzug.";

// Text für XML: Unicode in NFC, unzulässige Steuerzeichen und einzelne Surrogate entfernen, Sonderzeichen maskieren
export function xmlText(s) {
  return String(s ?? "").normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/\r\n?/g, "\n").trim()
    .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}
const leer = s => !xmlText(s);

// Kleiner Baukasten: e(name, inhalt, attribute) – Elemente ohne Inhalt fallen weg
const ATTR = a => Object.entries(a || {}).filter(([, v]) => v != null && v !== "").map(([k, v]) => ` ${k}="${xmlText(v)}"`).join("");
function e(name, inhalt, attr) {
  if (Array.isArray(inhalt)) {
    const kinder = inhalt.flat(Infinity).filter(Boolean);
    return kinder.length ? `<${name}${ATTR(attr)}>\n${kinder.map(k => k.replace(/^(?=<)/gm, "  ")).join("\n")}\n</${name}>` : "";
  }
  if (inhalt == null || leer(inhalt)) return "";
  return `<${name}${ATTR(attr)}>${xmlText(inhalt)}</${name}>`;
}
const geld = (name, cent) => e(name, betragText(cent), { currencyID: "EUR" });
const steuerKategorie = (name, code, grund) => e(name, [e("cbc:ID", STEUER[code].kategorie), e("cbc:Percent", String(STEUER[code].satz)),
  grund ? e("cbc:TaxExemptionReason", grund) : "", e("cac:TaxScheme", [e("cbc:ID", "VAT")])]);

function anschrift(a) {
  return e("cac:PostalAddress", [e("cbc:StreetName", a.strasse), e("cbc:AdditionalStreetName", a.zusatz), e("cbc:CityName", a.ort), e("cbc:PostalZone", a.plz),
    e("cac:Country", [e("cbc:IdentificationCode", (a.land || "DE").toUpperCase())])]);
}
const steuerSchema = (nummer, schema) => e("cac:PartyTaxScheme", [e("cbc:CompanyID", nummer), e("cac:TaxScheme", [e("cbc:ID", schema)])]);

// Verkäufer (BG-4): BT-34 ist die E-Mail des Kontakts (PEPPOL-EN16931-R020). Ohne USt-IdNr. und Handelsregister steht die
// Steuernummer zusätzlich als Kennung BT-29 (BR-CO-26 verlangt BT-29, BT-30 oder BT-31).
function verkaeufer(f) {
  const k = f.kontakt || {};
  const ersatz = leer(f.ustid) && leer(f.register) ? f.steuernummer : "";
  return e("cac:AccountingSupplierParty", [e("cac:Party", [
    e("cbc:EndpointID", k.email, { schemeID: "EM" }),
    ersatz ? e("cac:PartyIdentification", [e("cbc:ID", ersatz)]) : "",
    !leer(f.handelsname) && xmlText(f.handelsname) !== xmlText(f.name) ? e("cac:PartyName", [e("cbc:Name", f.handelsname)]) : "",
    anschrift(f),
    leer(f.ustid) ? "" : steuerSchema(String(f.ustid).replace(/\s+/g, "").toUpperCase(), "VAT"),
    leer(f.steuernummer) ? "" : steuerSchema(f.steuernummer, "FC"),
    e("cac:PartyLegalEntity", [e("cbc:RegistrationName", f.name), e("cbc:CompanyID", f.register)]),
    e("cac:Contact", [e("cbc:Name", k.name), e("cbc:Telephone", k.telefon), e("cbc:ElectronicMail", k.email)]),
  ])]);
}
// Käufer (BG-7): BT-49 ist die E-Mail des Empfängers, bei einer Behörde die Leitweg-ID (Schema 0204)
function kaeufer(r) {
  const k = r.empfaenger || {};
  const adresse = k.behoerde ? e("cbc:EndpointID", k.referenz, { schemeID: "0204" }) : e("cbc:EndpointID", k.email, { schemeID: "EM" });
  return e("cac:AccountingCustomerParty", [e("cac:Party", [
    adresse,
    anschrift(k),
    leer(k.ustid) ? "" : steuerSchema(String(k.ustid).replace(/\s+/g, "").toUpperCase(), "VAT"),
    e("cac:PartyLegalEntity", [e("cbc:RegistrationName", k.name)]),
  ])]);
}

// Befreiungsgrund (BT-120) je Steuerkategorie: E mit § 19 oder dem gewählten Grund; S und Z ohne (BR-S-10, BR-Z-10)
const grundVon = (code, r, f) => code !== "E" ? "" : f.kleinunternehmer ? KLEIN.grund : (r.befreiung && r.befreiung.text) || "";

// Die ganze Rechnung als XML-Text
export function ublSchreiben(firma, rechnung) {
  const f = firma || {}, r = rechnung || {}, lang = r.sprache || "de";
  const s = summen(r, f, lang);
  const ziel = Number.isInteger(+r.zielTage) && +r.zielTage >= 0 ? +r.zielTage : 0;
  const faellig = r.datum && /^\d{4}-\d{2}-\d{2}$/.test(r.datum) ? datumPlus(r.datum, ziel) : "";
  const l = r.leistung || {};
  const referenz = xmlText((r.empfaenger || {}).referenz) || OHNE_REFERENZ[lang];
  const notizen = [f.kleinunternehmer ? KLEIN.hinweis : "", r.bemerkung];
  const bank = f.bank || {};
  const zweck = leer(r.zweck) ? `Rechnung ${r.nummer || ""}`.trim() : r.zweck;
  const zeilen = (r.positionen || []).map((p, i) => {
    const z = s.zeilen[i];
    return e("cac:InvoiceLine", [
      e("cbc:ID", String(i + 1)),
      e("cbc:InvoicedQuantity", z.menge != null ? mengeText(z.menge) : "", { unitCode: p.einheit || "C62" }),
      z.netto != null ? geld("cbc:LineExtensionAmount", z.netto) : "",
      e("cac:Item", [e("cbc:Description", p.beschreibung), e("cbc:Name", p.name), steuerKategorie("cac:ClassifiedTaxCategory", z.code)]),
      e("cac:Price", [z.preis != null ? e("cbc:PriceAmount", preisText(z.preis), { currencyID: "EUR" }) : ""]),
    ]);
  });
  const teile = [
    e("cbc:CustomizationID", KENNUNG),
    e("cbc:ProfileID", PROZESS),
    e("cbc:ID", r.nummer),
    e("cbc:IssueDate", r.datum),
    e("cbc:DueDate", faellig),
    e("cbc:InvoiceTypeCode", "380"),
    ...notizen.map(n => e("cbc:Note", n)),
    e("cbc:DocumentCurrencyCode", "EUR"),
    e("cbc:BuyerReference", referenz),
    l.art === "zeitraum" ? e("cac:InvoicePeriod", [e("cbc:StartDate", l.von), e("cbc:EndDate", l.bis)]) : "",
    verkaeufer(f),
    kaeufer(r),
    l.art !== "zeitraum" ? e("cac:Delivery", [e("cbc:ActualDeliveryDate", l.datum)]) : "",
    e("cac:PaymentMeans", [e("cbc:PaymentMeansCode", "58"), e("cbc:PaymentID", zweck),
      e("cac:PayeeFinancialAccount", [e("cbc:ID", ibanNormal(bank.iban)), e("cbc:Name", leer(bank.inhaber) ? f.name : bank.inhaber),
        leer(bank.bic) ? "" : e("cac:FinancialInstitutionBranch", [e("cbc:ID", String(bank.bic).replace(/\s+/g, "").toUpperCase())])])]),
    r.datum ? e("cac:PaymentTerms", [e("cbc:Note", zahlbarText(r.datum, ziel))]) : "",
    e("cac:TaxTotal", [geld("cbc:TaxAmount", s.steuer), ...s.gruppen.map(g => {
      const code = g.kategorie === "S" ? `S${g.satz}` : g.kategorie;
      return e("cac:TaxSubtotal", [geld("cbc:TaxableAmount", g.basis), geld("cbc:TaxAmount", g.steuer), steuerKategorie("cac:TaxCategory", code, grundVon(code, r, f))]);
    })]),
    e("cac:LegalMonetaryTotal", [geld("cbc:LineExtensionAmount", s.positionen), geld("cbc:TaxExclusiveAmount", s.netto), geld("cbc:TaxInclusiveAmount", s.brutto),
      geld("cbc:PayableAmount", s.zahlbetrag)]),
    ...zeilen,
  ].filter(Boolean);
  return `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
${teile.map(k => k.replace(/^(?=<)/gm, "  ")).join("\n")}
</ubl:Invoice>
`;
}

// Dateiname aus der Rechnungsnummer: nur sichere Zeichen
export const dateiName = nummer => `${String(nummer || "E-Rechnung").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "").slice(0, 80) || "E-Rechnung"}.xml`;
export { STELLEN, dezimalLesen, steuerVon };
