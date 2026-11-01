// Dateien annehmen und verstehen: Dateiart erkennen (XML, PDF, Bild, Archiv …), XML sicher einlesen, Format und Profil bestimmen
// (XRechnung, ZUGFeRD/Factur-X, EN 16931, PEPPOL) und die Rechnungsdaten aus UBL oder CII in ein gemeinsames Modell bringen,
// das die lesbare Ansicht, die Zahlungsangaben und der GiroCode nutzen. Alles im Browser, ohne Netz.
import META from "./generiert/meta.json";
import { pdfLesen } from "./pdf.js";

export const GRENZE = { xml: 20 * 1024 * 1024, pdf: 60 * 1024 * 1024 };
const NS = {
  inv: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  cn: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
  cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  rsm: "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
  ram: "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
  udt: "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
  qdt: "urn:un:unece:uncefact:data:standard:QualifiedDataType:100",
};
const UBL_ANDERE = "urn:oasis:names:specification:ubl:schema:xsd:";
const FERD1 = "urn:ferd:CrossIndustryDocument:invoice:1p0";

// ---------- Navigation im DOM mit Präfixen ----------
const kinder = (el, qn) => { const [p, l] = qn.split(":"); const ns = NS[p]; return el ? Array.from(el.children).filter(c => c.localName === l && c.namespaceURI === ns) : []; };
const alle = (el, pfad) => pfad.split("/").reduce((cur, s) => cur.flatMap(e => kinder(e, s)), [el]);
const eins = (el, pfad) => (pfad ? alle(el, pfad)[0] : el) || null;
const txt = (el, pfad) => { const e = eins(el, pfad); return e ? e.textContent.trim() : ""; };
const attr = (el, pfad, a) => { const e = eins(el, pfad); return e ? (e.getAttribute(a) || "").trim() : ""; };
const zahl = s => { const t = String(s ?? "").trim(); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };

// ---------- Dateiart ----------
function magie(b) {
  const h = (...xs) => xs.every((x, i) => b[i] === x);
  if (h(0x25, 0x50, 0x44, 0x46)) return "pdf";
  if (h(0x50, 0x4b, 0x03, 0x04)) return "zip";
  if (h(0x89, 0x50, 0x4e, 0x47) || h(0xff, 0xd8, 0xff) || h(0x47, 0x49, 0x46, 0x38) || h(0x49, 0x49, 0x2a, 0x00) || h(0x4d, 0x4d, 0x00, 0x2a)) return "bild";
  if (h(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45) return "bild";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "bild"; // HEIC/AVIF
  if (h(0xd0, 0xcf, 0x11, 0xe0)) return "office";
  let i = 0;
  if (h(0xef, 0xbb, 0xbf)) i = 3;
  if (h(0xff, 0xfe) || h(0xfe, 0xff)) return "xml16";
  while (i < b.length && i < 4096 && (b[i] === 0x20 || b[i] === 0x0a || b[i] === 0x0d || b[i] === 0x09)) i++;
  if (b[i] === 0x3c) return "xml";
  return "anderes";
}

function dekodieren(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  const kopf = new TextDecoder("latin1").decode(bytes.subarray(0, 200));
  const enc = (/<\?xml[^>]*encoding\s*=\s*["']([A-Za-z0-9._-]+)["']/.exec(kopf) || [])[1] || "utf-8";
  try { return new TextDecoder(enc.toLowerCase(), { fatal: false }).decode(bytes).replace(/^﻿/, ""); } catch { return new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, ""); }
}

// XML einlesen; DTDs werden abgewiesen (E-Rechnungen haben keine; schützt vor Entitäten-Tricks)
export function xmlParsen(text) {
  if (/<!DOCTYPE/i.test(text.slice(0, 5000)) || /<!ENTITY/i.test(text)) return { fehler: "dtd" };
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const pe = doc.getElementsByTagName("parsererror")[0];
  if (pe || !doc.documentElement) return { fehler: "xml", meldung: pe ? pe.textContent.replace(/\s+/g, " ").trim().slice(0, 300) : "" };
  return { doc };
}

// ---------- Format, Profil, Szenario ----------
const SZ = META.szenarien;
function szenario(syntax, wurzel, kennung) {
  return SZ.find(s => s.syntax === syntax && (s.wurzel === wurzel || (syntax === "cii")) && s.kennung === kennung) || null;
}
// Bekannte Kennungen (BT-24); e = ist ein Format nach EN 16931 (§ 14 Abs. 1 Satz 6 Nr. 1 UStG, Abschnitt 14.1 Abs. 12–14 UStAE)
function profil(kennung, syntax, ausPdf) {
  const k = kennung;
  const XR = "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0";
  if (k === XR) return { id: "xrechnung", name: ausPdf ? "ZUGFeRD/Factur-X, Profil XRECHNUNG (XRechnung 3.0)" : "XRechnung 3.0", e: true };
  if (k === XR + "#conformant#urn:xeinkauf.de:kosit:extension:xrechnung_3.0") return { id: "xrechnung-extension", name: "XRechnung 3.0 mit Erweiterung (Extension)", e: true };
  if (k === XR + "#compliant#urn:xeinkauf.de:kosit:xrechnung:cvd_0.9") return { id: "xrechnung-cvd", name: "XRechnung 3.0 CVD (saubere Fahrzeuge)", e: true };
  if (/^urn:cen\.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_[12]\./.test(k) || /xrechnung_2\./.test(k)) return { id: "xrechnung-alt", name: `XRechnung, ältere Fassung (${k.split("_").pop()})`, e: true, alt: true };
  if (k === "urn:factur-x.eu:1p0:minimum") return { id: "minimum", name: "ZUGFeRD/Factur-X, Profil MINIMUM", e: false };
  if (k === "urn:factur-x.eu:1p0:basicwl") return { id: "basicwl", name: "ZUGFeRD/Factur-X, Profil BASIC WL", e: false };
  if (k === "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic") return { id: "basic", name: "ZUGFeRD/Factur-X, Profil BASIC", e: true };
  if (k === "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended" || k === "urn:cen.eu:en16931:2017#conformant#urn:zugferd.de:2p0:extended" || /urn:factur-x\.eu:1p0:extended/.test(k))
    return { id: "extended", name: "ZUGFeRD/Factur-X, Profil EXTENDED", e: true };
  if (k === "urn:cen.eu:en16931:2017") return { id: "en16931", name: ausPdf ? "ZUGFeRD/Factur-X, Profil EN 16931 (COMFORT)" : "EN 16931 (Kern-Datenmodell)", e: true };
  if (/^urn:cen\.eu:en16931:2017#compliant#urn:fdc:peppol\.eu:2017:poacc:billing:3\.0/.test(k)) return { id: "peppol", name: "Peppol BIS Billing 3.0", e: true };
  if (/^urn:cen\.eu:en16931:2017(#|$)/.test(k)) return { id: "cius", name: "andere Umsetzung der EN 16931", e: true, unbekannt: true };
  if (/^urn:ferd:CrossIndustryDocument:invoice:1p0/.test(k)) return { id: "zugferd1", name: "ZUGFeRD 1.0", e: false };
  return { id: "unbekannt", name: k ? "unbekannte Kennung" : "ohne Kennung", e: null, unbekannt: true };
}

// Welche Regelsätze laufen: Szenario der KoSIT-Konfiguration; sonst für Formate nach EN 16931 die Regeln der EN 16931
export function formatErkennen(doc, ausPdf = false) {
  const r = doc.documentElement, ns = r.namespaceURI, ln = r.localName;
  let syntax = null, wurzel = ln, kennung = "";
  if (ns === NS.inv && ln === "Invoice" || ns === NS.cn && ln === "CreditNote") { syntax = "ubl"; kennung = txt(r, "cbc:CustomizationID"); }
  else if (ns === NS.rsm && ln === "CrossIndustryInvoice") { syntax = "cii"; kennung = txt(r, "rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID"); }
  else if (ns === FERD1 || ln === "CrossIndustryDocument") return { art: "zugferd1", syntax: null, profil: profil(FERD1, null, ausPdf), saetze: [] };
  else if (ns && ns.startsWith(UBL_ANDERE)) return { art: "ubl-anderes", syntax: null, dokument: ln, saetze: [] };
  else return { art: "fremd", syntax: null, dokument: ln, namespace: ns || "", saetze: [] };
  const p = profil(kennung, syntax, ausPdf);
  const sz = szenario(syntax, wurzel, kennung);
  const saetze = sz ? sz.saetze : p.e ? [`en16931-${syntax}`] : [];
  return { art: "rechnung", syntax, wurzel, kennung, profil: p, szenario: sz ? sz.name : null, saetze, stufen: sz ? sz.stufen : {} };
}

// ---------- Datenmodell ----------
const datumUbl = s => /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s;
const datumCii = el => {
  if (!el) return "";
  const d = eins(el, "udt:DateTimeString") || eins(el, "qdt:DateTimeString") || el;
  const s = d.textContent.trim(), fmt = d.getAttribute ? d.getAttribute("format") : "";
  if (/^\d{8}$/.test(s) && (!fmt || fmt === "102")) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
};
const betrag = (el, pfad) => { const e = eins(el, pfad); return e ? { wert: zahl(e.textContent), roh: e.textContent.trim(), waehrung: e.getAttribute("currencyID") || "" } : null; };

function ublPartei(p) {
  if (!p) return null;
  const steuer = alle(p, "cac:PartyTaxScheme");
  const vat = steuer.find(s => txt(s, "cac:TaxScheme/cbc:ID").toUpperCase() === "VAT");
  const andere = steuer.find(s => s !== vat);
  const adr = eins(p, "cac:PostalAddress");
  return {
    name: txt(p, "cac:PartyLegalEntity/cbc:RegistrationName") || txt(p, "cac:PartyName/cbc:Name"),
    handelsname: txt(p, "cac:PartyName/cbc:Name"),
    kennungen: alle(p, "cac:PartyIdentification/cbc:ID").map(e => ({ wert: e.textContent.trim(), schema: e.getAttribute("schemeID") || "" })),
    register: txt(p, "cac:PartyLegalEntity/cbc:CompanyID"), rechtliches: txt(p, "cac:PartyLegalEntity/cbc:CompanyLegalForm"),
    ustid: vat ? txt(vat, "cbc:CompanyID") : "", steuernummer: andere ? txt(andere, "cbc:CompanyID") : "",
    elektronisch: txt(p, "cbc:EndpointID") ? { wert: txt(p, "cbc:EndpointID"), schema: attr(p, "cbc:EndpointID", "schemeID") } : null,
    anschrift: adr ? { zeilen: [txt(adr, "cbc:StreetName"), txt(adr, "cbc:AdditionalStreetName"), txt(adr, "cac:AddressLine/cbc:Line")].filter(Boolean), plz: txt(adr, "cbc:PostalZone"), ort: txt(adr, "cbc:CityName"), region: txt(adr, "cbc:CountrySubentity"), land: txt(adr, "cac:Country/cbc:IdentificationCode") } : null,
    kontakt: eins(p, "cac:Contact") ? { name: txt(p, "cac:Contact/cbc:Name"), telefon: txt(p, "cac:Contact/cbc:Telephone"), email: txt(p, "cac:Contact/cbc:ElectronicMail") } : null,
  };
}
function ublZuschlaege(el) {
  return alle(el, "cac:AllowanceCharge").map(a => ({
    zuschlag: txt(a, "cbc:ChargeIndicator").toLowerCase() === "true", betrag: zahl(txt(a, "cbc:Amount")), basis: zahl(txt(a, "cbc:BaseAmount")), prozent: zahl(txt(a, "cbc:MultiplierFactorNumeric")),
    grund: txt(a, "cbc:AllowanceChargeReason"), code: txt(a, "cbc:AllowanceChargeReasonCode"), kategorie: txt(a, "cac:TaxCategory/cbc:ID"), satz: zahl(txt(a, "cac:TaxCategory/cbc:Percent")),
  }));
}
function ublDaten(r) {
  const cn = r.localName === "CreditNote";
  const zm = alle(r, "cac:PaymentMeans");
  const tt = alle(r, "cac:TaxTotal"), mitAuf = tt.find(t => kinder(t, "cac:TaxSubtotal").length) || tt[0];
  const lmt = eins(r, "cac:LegalMonetaryTotal");
  const zeilenEl = alle(r, cn ? "cac:CreditNoteLine" : "cac:InvoiceLine");
  const zeile = l => {
    const it = eins(l, "cac:Item"), pr = eins(l, "cac:Price");
    return {
      id: txt(l, "cbc:ID"), notiz: alle(l, "cbc:Note").map(e => e.textContent.trim()).join("\n"),
      menge: zahl(txt(l, cn ? "cbc:CreditedQuantity" : "cbc:InvoicedQuantity")), einheit: attr(l, cn ? "cbc:CreditedQuantity" : "cbc:InvoicedQuantity", "unitCode"),
      netto: zahl(txt(l, "cbc:LineExtensionAmount")), bestellposition: txt(l, "cac:OrderLineReference/cbc:LineID"), konto: txt(l, "cbc:AccountingCost"),
      zeitraum: eins(l, "cac:InvoicePeriod") ? { von: txt(l, "cac:InvoicePeriod/cbc:StartDate"), bis: txt(l, "cac:InvoicePeriod/cbc:EndDate") } : null,
      zuschlaege: ublZuschlaege(l),
      preis: { netto: zahl(txt(pr, "cbc:PriceAmount")), basis: zahl(txt(pr, "cbc:BaseQuantity")), basisEinheit: attr(pr, "cbc:BaseQuantity", "unitCode"), rabatt: zahl(txt(pr, "cac:AllowanceCharge/cbc:Amount")), brutto: zahl(txt(pr, "cac:AllowanceCharge/cbc:BaseAmount")) },
      kategorie: txt(it, "cac:ClassifiedTaxCategory/cbc:ID"), satz: zahl(txt(it, "cac:ClassifiedTaxCategory/cbc:Percent")),
      name: txt(it, "cbc:Name"), beschreibung: txt(it, "cbc:Description"), artikelnr: txt(it, "cac:SellersItemIdentification/cbc:ID"), kundenartikelnr: txt(it, "cac:BuyersItemIdentification/cbc:ID"),
      gtin: txt(it, "cac:StandardItemIdentification/cbc:ID"), herkunft: txt(it, "cac:OriginCountry/cbc:IdentificationCode"),
      eigenschaften: alle(it, "cac:AdditionalItemProperty").map(e => ({ name: txt(e, "cbc:Name"), wert: txt(e, "cbc:Value") })),
      unter: alle(l, "cac:SubInvoiceLine").map(zeile),
    };
  };
  return {
    syntax: "ubl", gutschriftDokument: cn,
    nummer: txt(r, "cbc:ID"), datum: datumUbl(txt(r, "cbc:IssueDate")), art: txt(r, cn ? "cbc:CreditNoteTypeCode" : "cbc:InvoiceTypeCode"),
    faellig: txt(r, "cbc:DueDate") || txt(r, "cac:PaymentMeans/cbc:PaymentDueDate"), steuerdatum: txt(r, "cbc:TaxPointDate"),
    waehrung: txt(r, "cbc:DocumentCurrencyCode"), steuerwaehrung: txt(r, "cbc:TaxCurrencyCode"),
    notizen: alle(r, "cbc:Note").map(e => e.textContent.trim()).filter(Boolean),
    referenz: txt(r, "cbc:BuyerReference"), projekt: txt(r, "cac:ProjectReference/cbc:ID"), vertrag: txt(r, "cac:ContractDocumentReference/cbc:ID"),
    bestellung: txt(r, "cac:OrderReference/cbc:ID"), auftrag: txt(r, "cac:OrderReference/cbc:SalesOrderID"), lieferschein: txt(r, "cac:DespatchDocumentReference/cbc:ID"),
    wareneingang: txt(r, "cac:ReceiptDocumentReference/cbc:ID"), vergabe: txt(r, "cac:OriginatorDocumentReference/cbc:ID"), buchungskonto: txt(r, "cbc:AccountingCost"),
    vorherige: alle(r, "cac:BillingReference/cac:InvoiceDocumentReference").map(e => ({ nummer: txt(e, "cbc:ID"), datum: txt(e, "cbc:IssueDate") })),
    zeitraum: eins(r, "cac:InvoicePeriod") ? { von: txt(r, "cac:InvoicePeriod/cbc:StartDate"), bis: txt(r, "cac:InvoicePeriod/cbc:EndDate") } : null,
    verkaeufer: ublPartei(eins(r, "cac:AccountingSupplierParty/cac:Party")), kaeufer: ublPartei(eins(r, "cac:AccountingCustomerParty/cac:Party")),
    zahlungsempfaenger: eins(r, "cac:PayeeParty") ? { name: txt(r, "cac:PayeeParty/cac:PartyName/cbc:Name") } : null,
    steuervertreter: eins(r, "cac:TaxRepresentativeParty") ? ublPartei(eins(r, "cac:TaxRepresentativeParty")) : null,
    lieferung: eins(r, "cac:Delivery") ? { datum: txt(r, "cac:Delivery/cbc:ActualDeliveryDate"), name: txt(r, "cac:Delivery/cac:DeliveryParty/cac:PartyName/cbc:Name"), ort: txt(r, "cac:Delivery/cac:DeliveryLocation/cbc:ID"),
      anschrift: eins(r, "cac:Delivery/cac:DeliveryLocation/cac:Address") ? (a => ({ zeilen: [txt(a, "cbc:StreetName"), txt(a, "cbc:AdditionalStreetName")].filter(Boolean), plz: txt(a, "cbc:PostalZone"), ort: txt(a, "cbc:CityName"), land: txt(a, "cac:Country/cbc:IdentificationCode") }))(eins(r, "cac:Delivery/cac:DeliveryLocation/cac:Address")) : null } : null,
    zahlung: zm.map(m => ({ code: txt(m, "cbc:PaymentMeansCode"), text: attr(m, "cbc:PaymentMeansCode", "name"), zweck: txt(m, "cbc:PaymentID"),
      konten: alle(m, "cac:PayeeFinancialAccount").map(k => ({ iban: txt(k, "cbc:ID"), inhaber: txt(k, "cbc:Name"), bic: txt(k, "cac:FinancialInstitutionBranch/cbc:ID") })),
      karte: eins(m, "cac:CardAccount") ? { nummer: txt(m, "cac:CardAccount/cbc:PrimaryAccountNumberID"), inhaber: txt(m, "cac:CardAccount/cbc:HolderName") } : null,
      lastschrift: eins(m, "cac:PaymentMandate") ? { mandat: txt(m, "cac:PaymentMandate/cbc:ID"), konto: txt(m, "cac:PaymentMandate/cac:PayerFinancialAccount/cbc:ID") } : null })),
    glaeubigerId: alle(r, "cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID").filter(e => (e.getAttribute("schemeID") || "") === "SEPA").map(e => e.textContent.trim())[0] || "",
    bedingungen: alle(r, "cac:PaymentTerms/cbc:Note").map(e => e.textContent).join("\n").trim(),
    zuschlaege: ublZuschlaege(r),
    summen: lmt ? { positionen: zahl(txt(lmt, "cbc:LineExtensionAmount")), nachlaesse: zahl(txt(lmt, "cbc:AllowanceTotalAmount")), zuschlaege: zahl(txt(lmt, "cbc:ChargeTotalAmount")),
      netto: zahl(txt(lmt, "cbc:TaxExclusiveAmount")), steuer: mitAuf ? zahl(txt(mitAuf, "cbc:TaxAmount")) : null, brutto: zahl(txt(lmt, "cbc:TaxInclusiveAmount")),
      gezahlt: zahl(txt(lmt, "cbc:PrepaidAmount")), rundung: zahl(txt(lmt, "cbc:PayableRoundingAmount")), zahlbetrag: zahl(txt(lmt, "cbc:PayableAmount")),
      steuerInSteuerwaehrung: tt.filter(t => t !== mitAuf).map(t => betrag(t, "cbc:TaxAmount"))[0] || null } : {},
    steuern: mitAuf ? alle(mitAuf, "cac:TaxSubtotal").map(s => ({ basis: zahl(txt(s, "cbc:TaxableAmount")), betrag: zahl(txt(s, "cbc:TaxAmount")), kategorie: txt(s, "cac:TaxCategory/cbc:ID"),
      satz: zahl(txt(s, "cac:TaxCategory/cbc:Percent")), grund: txt(s, "cac:TaxCategory/cbc:TaxExemptionReason"), grundCode: txt(s, "cac:TaxCategory/cbc:TaxExemptionReasonCode") })) : [],
    anhaenge: alle(r, "cac:AdditionalDocumentReference").map(d => {
      const b = eins(d, "cac:Attachment/cbc:EmbeddedDocumentBinaryObject");
      return { id: txt(d, "cbc:ID"), typ: txt(d, "cbc:DocumentTypeCode"), beschreibung: txt(d, "cbc:DocumentDescription"), url: txt(d, "cac:Attachment/cac:ExternalReference/cbc:URI"),
        datei: b ? { name: b.getAttribute("filename") || "", mime: b.getAttribute("mimeCode") || "", base64: b.textContent.replace(/\s+/g, "") } : null };
    }),
    positionen: zeilenEl.map(zeile),
  };
}

function ciiPartei(p) {
  if (!p) return null;
  const reg = alle(p, "ram:SpecifiedTaxRegistration/ram:ID");
  const adr = eins(p, "ram:PostalTradeAddress"), kt = eins(p, "ram:DefinedTradeContact");
  return {
    name: txt(p, "ram:Name"), handelsname: txt(p, "ram:SpecifiedLegalOrganization/ram:TradingBusinessName"),
    kennungen: [...alle(p, "ram:ID").map(e => ({ wert: e.textContent.trim(), schema: "" })), ...alle(p, "ram:GlobalID").map(e => ({ wert: e.textContent.trim(), schema: e.getAttribute("schemeID") || "" }))],
    register: txt(p, "ram:SpecifiedLegalOrganization/ram:ID"), rechtliches: txt(p, "ram:Description"),
    ustid: (reg.find(e => (e.getAttribute("schemeID") || "").toUpperCase() === "VA") || { textContent: "" }).textContent.trim(),
    steuernummer: (reg.find(e => (e.getAttribute("schemeID") || "").toUpperCase() === "FC") || { textContent: "" }).textContent.trim(),
    elektronisch: txt(p, "ram:URIUniversalCommunication/ram:URIID") ? { wert: txt(p, "ram:URIUniversalCommunication/ram:URIID"), schema: attr(p, "ram:URIUniversalCommunication/ram:URIID", "schemeID") } : null,
    anschrift: adr ? { zeilen: [txt(adr, "ram:LineOne"), txt(adr, "ram:LineTwo"), txt(adr, "ram:LineThree")].filter(Boolean), plz: txt(adr, "ram:PostcodeCode"), ort: txt(adr, "ram:CityName"), region: txt(adr, "ram:CountrySubDivisionName"), land: txt(adr, "ram:CountryID") } : null,
    kontakt: kt ? { name: txt(kt, "ram:PersonName") || txt(kt, "ram:DepartmentName"), telefon: txt(kt, "ram:TelephoneUniversalCommunication/ram:CompleteNumber"), email: txt(kt, "ram:EmailURIUniversalCommunication/ram:URIID") } : null,
  };
}
function ciiZuschlaege(el) {
  return alle(el, "ram:SpecifiedTradeAllowanceCharge").map(a => ({
    zuschlag: txt(a, "ram:ChargeIndicator/udt:Indicator").toLowerCase() === "true", betrag: zahl(txt(a, "ram:ActualAmount")), basis: zahl(txt(a, "ram:BasisAmount")), prozent: zahl(txt(a, "ram:CalculationPercent")),
    grund: txt(a, "ram:Reason"), code: txt(a, "ram:ReasonCode"), kategorie: txt(a, "ram:CategoryTradeTax/ram:CategoryCode"), satz: zahl(txt(a, "ram:CategoryTradeTax/ram:RateApplicablePercent")),
  }));
}
function ciiDaten(r) {
  const ed = eins(r, "rsm:ExchangedDocument"), tx = eins(r, "rsm:SupplyChainTradeTransaction");
  const ag = eins(tx, "ram:ApplicableHeaderTradeAgreement"), de = eins(tx, "ram:ApplicableHeaderTradeDelivery"), st = eins(tx, "ram:ApplicableHeaderTradeSettlement");
  const ms = eins(st, "ram:SpecifiedTradeSettlementHeaderMonetarySummation");
  const waehrung = txt(st, "ram:InvoiceCurrencyCode");
  const steuerSummen = alle(ms, "ram:TaxTotalAmount");
  const steuerRechnung = steuerSummen.find(e => (e.getAttribute("currencyID") || waehrung) === waehrung) || steuerSummen[0];
  const steuerAndere = steuerSummen.find(e => e !== steuerRechnung);
  const verweise = alle(ag, "ram:AdditionalReferencedDocument");
  const zeile = l => {
    const pr = eins(l, "ram:SpecifiedTradeProduct"), la = eins(l, "ram:SpecifiedLineTradeAgreement"), ls = eins(l, "ram:SpecifiedLineTradeSettlement"), ld = eins(l, "ram:SpecifiedLineTradeDelivery");
    return {
      id: txt(l, "ram:AssociatedDocumentLineDocument/ram:LineID"), notiz: alle(l, "ram:AssociatedDocumentLineDocument/ram:IncludedNote/ram:Content").map(e => e.textContent.trim()).join("\n"),
      menge: zahl(txt(ld, "ram:BilledQuantity")), einheit: attr(ld, "ram:BilledQuantity", "unitCode"),
      netto: zahl(txt(ls, "ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount")), bestellposition: txt(la, "ram:BuyerOrderReferencedDocument/ram:LineID"),
      konto: txt(ls, "ram:ReceivableSpecifiedTradeAccountingAccount/ram:ID"),
      zeitraum: eins(ls, "ram:BillingSpecifiedPeriod") ? { von: datumCii(eins(ls, "ram:BillingSpecifiedPeriod/ram:StartDateTime")), bis: datumCii(eins(ls, "ram:BillingSpecifiedPeriod/ram:EndDateTime")) } : null,
      zuschlaege: ciiZuschlaege(ls),
      preis: { netto: zahl(txt(la, "ram:NetPriceProductTradePrice/ram:ChargeAmount")), basis: zahl(txt(la, "ram:NetPriceProductTradePrice/ram:BasisQuantity")), basisEinheit: attr(la, "ram:NetPriceProductTradePrice/ram:BasisQuantity", "unitCode"),
        rabatt: zahl(txt(la, "ram:GrossPriceProductTradePrice/ram:AppliedTradeAllowanceCharge/ram:ActualAmount")), brutto: zahl(txt(la, "ram:GrossPriceProductTradePrice/ram:ChargeAmount")) },
      kategorie: txt(ls, "ram:ApplicableTradeTax/ram:CategoryCode"), satz: zahl(txt(ls, "ram:ApplicableTradeTax/ram:RateApplicablePercent")),
      name: txt(pr, "ram:Name"), beschreibung: txt(pr, "ram:Description"), artikelnr: txt(pr, "ram:SellerAssignedID"), kundenartikelnr: txt(pr, "ram:BuyerAssignedID"),
      gtin: txt(pr, "ram:GlobalID"), herkunft: txt(pr, "ram:OriginTradeCountry/ram:ID"),
      eigenschaften: alle(pr, "ram:ApplicableProductCharacteristic").map(e => ({ name: txt(e, "ram:Description"), wert: txt(e, "ram:Value") })), unter: [],
    };
  };
  return {
    syntax: "cii", gutschriftDokument: false,
    nummer: txt(ed, "ram:ID"), datum: datumCii(eins(ed, "ram:IssueDateTime")), art: txt(ed, "ram:TypeCode"),
    faellig: datumCii(eins(st, "ram:SpecifiedTradePaymentTerms/ram:DueDateDateTime")), steuerdatum: datumCii(eins(st, "ram:ApplicableTradeTax/ram:TaxPointDate")),
    waehrung, steuerwaehrung: txt(st, "ram:TaxCurrencyCode"),
    notizen: alle(ed, "ram:IncludedNote").map(n => txt(n, "ram:Content")).filter(Boolean),
    referenz: txt(ag, "ram:BuyerReference"), projekt: txt(ag, "ram:SpecifiedProcuringProject/ram:ID"), vertrag: txt(ag, "ram:ContractReferencedDocument/ram:IssuerAssignedID"),
    bestellung: txt(ag, "ram:BuyerOrderReferencedDocument/ram:IssuerAssignedID"), auftrag: txt(ag, "ram:SellerOrderReferencedDocument/ram:IssuerAssignedID"),
    lieferschein: txt(de, "ram:DespatchAdviceReferencedDocument/ram:IssuerAssignedID"), wareneingang: txt(de, "ram:ReceivingAdviceReferencedDocument/ram:IssuerAssignedID"),
    vergabe: (verweise.find(v => txt(v, "ram:TypeCode") === "50") ? txt(verweise.find(v => txt(v, "ram:TypeCode") === "50"), "ram:IssuerAssignedID") : ""),
    buchungskonto: txt(st, "ram:ReceivableSpecifiedTradeAccountingAccount/ram:ID"),
    vorherige: alle(st, "ram:InvoiceReferencedDocument").map(e => ({ nummer: txt(e, "ram:IssuerAssignedID"), datum: datumCii(eins(e, "ram:FormattedIssueDateTime")) })),
    zeitraum: eins(st, "ram:BillingSpecifiedPeriod") ? { von: datumCii(eins(st, "ram:BillingSpecifiedPeriod/ram:StartDateTime")), bis: datumCii(eins(st, "ram:BillingSpecifiedPeriod/ram:EndDateTime")) } : null,
    verkaeufer: ciiPartei(eins(ag, "ram:SellerTradeParty")), kaeufer: ciiPartei(eins(ag, "ram:BuyerTradeParty")),
    zahlungsempfaenger: eins(st, "ram:PayeeTradeParty") ? { name: txt(st, "ram:PayeeTradeParty/ram:Name") } : null,
    steuervertreter: eins(ag, "ram:SellerTaxRepresentativeTradeParty") ? ciiPartei(eins(ag, "ram:SellerTaxRepresentativeTradeParty")) : null,
    lieferung: (eins(de, "ram:ShipToTradeParty") || eins(de, "ram:ActualDeliverySupplyChainEvent")) ? { datum: datumCii(eins(de, "ram:ActualDeliverySupplyChainEvent/ram:OccurrenceDateTime")),
      name: txt(de, "ram:ShipToTradeParty/ram:Name"), ort: txt(de, "ram:ShipToTradeParty/ram:ID"),
      anschrift: eins(de, "ram:ShipToTradeParty/ram:PostalTradeAddress") ? (a => ({ zeilen: [txt(a, "ram:LineOne"), txt(a, "ram:LineTwo")].filter(Boolean), plz: txt(a, "ram:PostcodeCode"), ort: txt(a, "ram:CityName"), land: txt(a, "ram:CountryID") }))(eins(de, "ram:ShipToTradeParty/ram:PostalTradeAddress")) : null } : null,
    zahlung: alle(st, "ram:SpecifiedTradeSettlementPaymentMeans").map(m => ({ code: txt(m, "ram:TypeCode"), text: txt(m, "ram:Information"), zweck: txt(st, "ram:PaymentReference"),
      konten: alle(m, "ram:PayeePartyCreditorFinancialAccount").map(k => ({ iban: txt(k, "ram:IBANID") || txt(k, "ram:ProprietaryID"), inhaber: txt(k, "ram:AccountName"), bic: txt(m, "ram:PayeeSpecifiedCreditorFinancialInstitution/ram:BICID") })),
      karte: eins(m, "ram:ApplicableTradeSettlementFinancialCard") ? { nummer: txt(m, "ram:ApplicableTradeSettlementFinancialCard/ram:ID"), inhaber: txt(m, "ram:ApplicableTradeSettlementFinancialCard/ram:CardholderName") } : null,
      lastschrift: eins(m, "ram:PayerPartyDebtorFinancialAccount") ? { mandat: txt(st, "ram:SpecifiedTradePaymentTerms/ram:DirectDebitMandateID"), konto: txt(m, "ram:PayerPartyDebtorFinancialAccount/ram:IBANID") } : null })),
    glaeubigerId: txt(st, "ram:CreditorReferenceID"),
    bedingungen: alle(st, "ram:SpecifiedTradePaymentTerms/ram:Description").map(e => e.textContent).join("\n").trim(),
    zuschlaege: ciiZuschlaege(st),
    summen: ms ? { positionen: zahl(txt(ms, "ram:LineTotalAmount")), nachlaesse: zahl(txt(ms, "ram:AllowanceTotalAmount")), zuschlaege: zahl(txt(ms, "ram:ChargeTotalAmount")),
      netto: zahl(txt(ms, "ram:TaxBasisTotalAmount")), steuer: steuerRechnung ? zahl(steuerRechnung.textContent) : null, brutto: zahl(txt(ms, "ram:GrandTotalAmount")),
      gezahlt: zahl(txt(ms, "ram:TotalPrepaidAmount")), rundung: zahl(txt(ms, "ram:RoundingAmount")), zahlbetrag: zahl(txt(ms, "ram:DuePayableAmount")),
      steuerInSteuerwaehrung: steuerAndere ? { wert: zahl(steuerAndere.textContent), waehrung: steuerAndere.getAttribute("currencyID") || "" } : null } : {},
    steuern: alle(st, "ram:ApplicableTradeTax").map(s => ({ basis: zahl(txt(s, "ram:BasisAmount")), betrag: zahl(txt(s, "ram:CalculatedAmount")), kategorie: txt(s, "ram:CategoryCode"),
      satz: zahl(txt(s, "ram:RateApplicablePercent")), grund: txt(s, "ram:ExemptionReason"), grundCode: txt(s, "ram:ExemptionReasonCode") })),
    anhaenge: verweise.filter(v => txt(v, "ram:TypeCode") === "916").map(v => {
      const b = eins(v, "ram:AttachmentBinaryObject");
      return { id: txt(v, "ram:IssuerAssignedID"), typ: "916", beschreibung: txt(v, "ram:Name"), url: txt(v, "ram:URIID"),
        datei: b ? { name: b.getAttribute("filename") || "", mime: b.getAttribute("mimeCode") || "", base64: b.textContent.replace(/\s+/g, "") } : null };
    }),
    positionen: alle(tx, "ram:IncludedSupplyChainTradeLineItem").map(zeile),
  };
}

export function datenLesen(doc, syntax) {
  const r = doc.documentElement;
  try { return syntax === "ubl" ? ublDaten(r) : ciiDaten(r); } catch (e) { return { fehler: String(e && e.message || e) }; }
}

// ---------- Eine Datei vollständig einlesen ----------
const endung = n => (String(n).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || "";
export async function dateiLesen(datei) {
  const name = datei.name || "Datei", groesse = datei.size || 0;
  const basis = { name, groesse };
  if (!groesse) return { ...basis, art: "leer" };
  if (groesse > GRENZE.pdf) return { ...basis, art: "zugross" };
  const bytes = new Uint8Array(await datei.arrayBuffer());
  const m = magie(bytes);
  if (m === "pdf") {
    let p;
    try { p = await pdfLesen(bytes); } catch { return { ...basis, art: "pdf-defekt" }; }
    if (p.verschluesselt && !p.dateien.some(d => d.bytes)) return { ...basis, art: "pdf-verschluesselt", pdf: p };
    const kandidaten = [];
    for (const d of p.dateien) {
      if (!d.bytes || magie(d.bytes) !== "xml") continue;
      const x = xmlParsen(dekodieren(d.bytes));
      if (x.doc) kandidaten.push({ datei: d, doc: x.doc, format: formatErkennen(x.doc, true) });
    }
    const bevorzugt = /^(factur-x|zugferd-invoice|xrechnung|zugferd_invoice|zugferd-rechnung)\.xml$/i;
    const k = kandidaten.find(c => c.format.art === "rechnung" && bevorzugt.test(c.datei.name)) || kandidaten.find(c => c.format.art === "rechnung") || kandidaten.find(c => c.format.art === "zugferd1");
    const anhaenge = p.dateien.filter(d => !k || d !== k.datei).map(d => ({ name: d.name, beschreibung: d.beschreibung, mime: d.mime, bytes: d.bytes }));
    if (!k) return { ...basis, art: "pdf-ohne-xml", pdf: { ...p, anhaenge } };
    if (k.format.art === "zugferd1") return { ...basis, art: "zugferd1", pdf: { ...p, anhaenge, xmlName: k.datei.name } };
    return { ...basis, art: "rechnung", herkunft: "pdf", pdfBytes: bytes, pdf: { ...p, anhaenge, xmlName: k.datei.name }, doc: k.doc, format: k.format, daten: datenLesen(k.doc, k.format.syntax), xmlBytes: k.datei.bytes };
  }
  if (m === "bild") return { ...basis, art: "bild" };
  if (m === "zip") return { ...basis, art: ["docx", "xlsx", "pptx", "odt", "ods"].includes(endung(name)) ? "office" : "zip" };
  if (m === "office") return { ...basis, art: "office" };
  if (m === "xml" || m === "xml16") {
    if (groesse > GRENZE.xml) return { ...basis, art: "zugross" };
    const x = xmlParsen(dekodieren(bytes));
    if (x.fehler) return { ...basis, art: x.fehler === "dtd" ? "xml-dtd" : "xml-defekt", meldung: x.meldung || "" };
    const format = formatErkennen(x.doc, false);
    if (format.art === "zugferd1") return { ...basis, art: "zugferd1" };
    if (format.art !== "rechnung") return { ...basis, art: "xml-fremd", format };
    return { ...basis, art: "rechnung", herkunft: "xml", doc: x.doc, format, daten: datenLesen(x.doc, format.syntax), xmlBytes: bytes };
  }
  return { ...basis, art: "unbekannt", endung: endung(name) };
}
