// Prüfregeln für SmartFormular E-Rechnung lite aus den offiziellen Quellen erzeugen:
//   cd tools/erechnung && node regeln-bauen.mjs
// Lädt die KoSIT-Validator-Konfiguration (quellen.json, Prüfsumme festgeschrieben) und liest daraus die vier XSLT-Regelsätze, die der
// KoSIT-Validator ausführt: EN 16931 (CEN) für UBL und CII sowie XRechnung (KoSIT) für UBL und CII. Gelesen werden die kompilierten
// XSLT-Dateien, nicht die .sch-Quellen: Die veröffentlichte .sch-Datei der CEN weicht in einer Regel (CII-SR-282) vom ausgelieferten
// XSLT ab; maßgeblich ist, was der Validator prüft. Aus scenarios.xml kommen die Szenarien mit den abweichenden Stufen (customLevel),
// aus der KoSIT-Visualisierung die deutschen und englischen Feldbezeichnungen (BT/BG). Ergebnis:
//   assets/erechnung/regeln/{en16931-ubl,en16931-cii,xrechnung-ubl,xrechnung-cii}.json  (lädt das Werkzeug beim ersten Prüfen)
//   src/generiert/meta.json                                                          (Szenarien, Feldnamen, Fassungen; im Werkzeug eingebaut)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseXmlDocument } from "slimdom";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const CACHE = join(HIER, ".cache");
const QUELLEN = JSON.parse(readFileSync(join(HIER, "quellen.json"), "utf8"));
const XSL = "http://www.w3.org/1999/XSL/Transform", SVRL = "http://purl.oclc.org/dsdl/svrl", SCHX = "https://doi.org/10.5281/zenodo.1495494";
const SATZ = {
  "en16931-ubl": "resources/ubl/2.1/xsl/EN16931-UBL-validation.xsl",
  "en16931-cii": "resources/cii/16b/xsl/EN16931-CII-validation.xsl",
  "xrechnung-ubl": "resources/xrechnung/3.0.2/xsl/XRechnung-UBL-validation.xsl",
  "xrechnung-cii": "resources/xrechnung/3.0.2/xsl/XRechnung-CII-validation.xsl",
};

async function laden(q) {
  mkdirSync(CACHE, { recursive: true });
  const ziel = join(CACHE, q.url.split("/").pop());
  if (!existsSync(ziel)) {
    const r = await fetch(q.url);
    if (!r.ok) throw new Error(`${q.url}: HTTP ${r.status}`);
    writeFileSync(ziel, Buffer.from(await r.arrayBuffer()));
  }
  const sha = createHash("sha256").update(readFileSync(ziel)).digest("hex");
  if (sha !== q.sha256) throw new Error(`Prüfsumme stimmt nicht: ${ziel} (${sha}) – nicht verwenden`);
  return ziel;
}
const ausZip = (zip, pfad) => execFileSync("unzip", ["-p", zip, pfad], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");

const el = (n, ns, name) => n.nodeType === 1 && (!ns || n.namespaceURI === ns) && (!name || n.localName === name);
const kinder = (n, ns, name) => Array.from(n.childNodes).filter(k => el(k, ns, name));
const ws = s => String(s).replace(/\s+/g, " ").trim();
const lit = s => `'${String(s).replace(/'/g, "''")}'`;

// Sequenzkonstruktor einer XSLT-Funktion (param, variable, sequence, choose) als XQuery-Ausdruck
function sequenz(knoten, name) {
  const lets = [], werte = [];
  for (const k of knoten) {
    if (k.nodeType === 3) { if (k.nodeValue.trim()) throw new Error(`${name}: Text im Sequenzkonstruktor`); continue; }
    if (k.nodeType !== 1) continue;
    if (k.namespaceURI !== XSL) throw new Error(`${name}: fremdes Element ${k.localName}`);
    if (k.localName === "param") continue;
    if (k.localName === "variable") {
      if (werte.length) throw new Error(`${name}: Variable nach einem Wert`);
      const sel = k.getAttribute("select"), as = k.getAttribute("as");
      const ausdruck = sel != null ? sel : kinder(k, XSL).length ? sequenz(Array.from(k.childNodes), name) : lit(k.textContent);
      lets.push(`$${k.getAttribute("name")}${as ? " as " + as : ""} := (${ausdruck})`);
    } else if (k.localName === "sequence") werte.push(`(${k.getAttribute("select")})`);
    else if (k.localName === "choose") {
      const sonst = kinder(k, XSL, "otherwise")[0];
      let a = sonst ? `(${sequenz(Array.from(sonst.childNodes), name)})` : "()";
      for (const w of kinder(k, XSL, "when").reverse()) a = `(if (${w.getAttribute("test")}) then (${sequenz(Array.from(w.childNodes), name)}) else ${a})`;
      werte.push(a);
    } else throw new Error(`${name}: ${k.localName} im Sequenzkonstruktor`);
  }
  const wert = werte.length === 1 ? werte[0] : `(${werte.join(", ")})`;
  return lets.length ? `let ${lets.join(", ")} return ${wert}` : wert;
}

function nachricht(textEl) {
  const teile = [];
  for (const n of Array.from(textEl.childNodes)) {
    if (n.nodeType === 3) teile.push({ t: n.nodeValue.replace(/\s+/g, " ") });
    else if (el(n, XSL, "value-of")) teile.push({ v: n.getAttribute("select") });
    else if (n.nodeType === 1) teile.push({ t: n.textContent.replace(/\s+/g, " ") });
  }
  if (teile[0] && teile[0].t != null) teile[0].t = teile[0].t.trimStart();
  if (teile.at(-1) && teile.at(-1).t != null) teile.at(-1).t = teile.at(-1).t.trimEnd();
  return teile;
}

// SchXslt-XSLT -> Regelsatz: globale Variablen, Funktionen, Muster mit Regeln (Kontext, lets, Tests) in Prioritätsfolge
export function konvertieren(xslt) {
  const doc = parseXmlDocument(xslt), wurzel = doc.documentElement;
  const ns = {};
  for (const a of Array.from(wurzel.attributes)) if (a.prefix === "xmlns") ns[a.localName] = a.value;
  for (const p of ["xsl", "svrl", "schxslt", "schxslt-api", "error", "rdf", "sch"]) delete ns[p];
  const svrlOut = doc.getElementsByTagNameNS(SVRL, "schematron-output")[0];
  const globale = [], funktionen = [], regeln = [];
  for (const k of kinder(wurzel, XSL)) {
    const name = k.getAttribute("name") || "";
    if ((k.localName === "param" || k.localName === "variable") && !name.startsWith("schxslt")) {
      const sel = k.getAttribute("select");
      globale.push({ name, expr: sel != null ? sel : lit(k.textContent) });
    } else if (k.localName === "function" && !name.startsWith("schxslt")) {
      funktionen.push({ name, as: k.getAttribute("as") || "", params: kinder(k, XSL, "param").map(p => ({ name: p.getAttribute("name"), as: p.getAttribute("as") || "" })),
        body: sequenz(Array.from(k.childNodes), name) });
    } else if (k.localName === "template" && k.getAttribute("match") && k.getAttribute("mode") && k.getAttribute("mode") !== "#all") {
      const lets = [], tests = [];
      let muster = null;
      for (const c of kinder(k, XSL)) {
        if (c.localName === "param") continue;
        if (c.localName === "variable") { lets.push({ name: c.getAttribute("name"), expr: c.getAttribute("select") }); continue; }
        if (c.localName !== "choose") throw new Error("Unerwartet in Regel: " + c.localName);
        muster = (kinder(c, XSL, "when")[0].getAttribute("test").match(/patterns-matched\[\. = '([^']+)'\]/) || [])[1];
        const rule = kinder(kinder(c, XSL, "otherwise")[0], SCHX, "rule")[0];
        for (const x of kinder(rule)) {
          if (el(x, SVRL, "fired-rule")) continue;
          if (el(x, XSL, "variable")) { lets.push({ name: x.getAttribute("name"), expr: x.getAttribute("select") }); continue; }
          if (!el(x, XSL, "if")) throw new Error("Unerwartet im Regelinhalt: " + x.localName);
          const a = kinder(x)[0];
          if (!(el(a, SVRL, "failed-assert") || el(a, SVRL, "successful-report"))) throw new Error("xsl:if ohne Meldung");
          tests.push({ art: a.localName === "failed-assert" ? "assert" : "report", id: a.getAttribute("id"), flag: a.getAttribute("flag") || "",
            cond: x.getAttribute("test"), text: nachricht(kinder(a, SVRL, "text")[0]) });
        }
      }
      if (!muster) throw new Error("Regel ohne Muster: " + k.getAttribute("match"));
      if (lets.some(l => l.expr == null)) throw new Error("let ohne select");
      regeln.push({ muster, prio: +k.getAttribute("priority"), context: ws(k.getAttribute("match")), lets, tests });
    }
  }
  const ordnung = [...new Set(regeln.map(r => r.muster))];
  const muster = ordnung.map(id => ({ id, regeln: regeln.filter(r => r.muster === id).sort((a, b) => b.prio - a.prio).map(({ muster: _m, prio: _p, ...r }) => r) }));
  return { titel: svrlOut ? svrlOut.getAttribute("title") : "", ns, globale, funktionen, muster };
}

// Szenarien der KoSIT-Konfiguration: Kennung des Formats -> Regelsätze und abweichende Stufen
function szenarien(xml) {
  const doc = parseXmlDocument(xml), S = doc.documentElement.namespaceURI;
  return Array.from(doc.getElementsByTagNameNS(S, "scenario")).map(s => {
    const name = s.getElementsByTagNameNS(S, "name")[0].textContent.trim();
    const match = s.getElementsByTagNameNS(S, "match")[0].textContent;
    const kennung = (match.match(/'(urn:[^']+)'/) || [])[1] || "";
    const syntax = /CrossIndustryInvoice/.test(match) ? "cii" : "ubl", wurzel = /creditnote:CreditNote/.test(match) ? "CreditNote" : syntax === "cii" ? "CrossIndustryInvoice" : "Invoice";
    const saetze = Array.from(s.getElementsByTagNameNS(S, "validateWithSchematron")).map(v => {
      const loc = v.getElementsByTagNameNS(S, "location")[0].textContent.trim();
      return Object.entries(SATZ).find(([, p]) => p === loc)?.[0];
    });
    if (saetze.some(x => !x)) throw new Error("Unbekannter Regelsatz in Szenario " + name);
    const stufen = Object.fromEntries(Array.from(s.getElementsByTagNameNS(S, "customLevel")).map(c => [c.textContent.trim(), c.getAttribute("level")]));
    return { name, syntax, wurzel, kennung, saetze, stufen };
  });
}

function feldnamen(xml) {
  const doc = parseXmlDocument(xml), out = {};
  for (const e of Array.from(doc.getElementsByTagName("entry"))) {
    const id = e.getAttribute("id");
    if (id && /^B[TG]-\d+$/.test(id) && !(id in out)) out[id] = e.textContent.trim();
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const zip = await laden(QUELLEN.konfiguration), vis = await laden(QUELLEN.visualisierung);
  const ziel = join(WURZEL, "assets", "erechnung", "regeln");
  mkdirSync(ziel, { recursive: true });
  const fassungen = {};
  for (const [id, pfad] of Object.entries(SATZ)) {
    const satz = konvertieren(ausZip(zip, pfad));
    const n = satz.muster.reduce((s, p) => s + p.regeln.reduce((t, r) => t + r.tests.length, 0), 0);
    const roh = ausZip(zip, pfad);
    const erwartet = (roh.match(/<svrl:(failed-assert|successful-report)\b/g) || []).length;
    if (n !== erwartet) throw new Error(`${id}: ${n} Tests gelesen, ${erwartet} im XSLT`);
    satz.quelle = { datei: pfad, sha256: createHash("sha256").update(roh).digest("hex") };
    writeFileSync(join(ziel, `${id}.json`), JSON.stringify(satz));
    fassungen[id] = { titel: satz.titel, tests: n, ids: [...new Set(satz.muster.flatMap(p => p.regeln.flatMap(r => r.tests.map(t => t.id))))].length };
    console.log(`${id}: ${satz.titel} – ${n} Tests, ${fassungen[id].ids} Regelnummern`);
  }
  const meta = {
    stand: QUELLEN.konfiguration.url.match(/v(\d{4}-\d{2}-\d{2})/)[1],
    quelle: QUELLEN.konfiguration.name,
    fassungen,
    szenarien: szenarien(ausZip(zip, "scenarios.xml")),
    felder: { de: feldnamen(ausZip(vis, "xsl/l10n/de.xml")), en: feldnamen(ausZip(vis, "xsl/l10n/en.xml")) },
  };
  mkdirSync(join(HIER, "src", "generiert"), { recursive: true });
  writeFileSync(join(HIER, "src", "generiert", "meta.json"), JSON.stringify(meta, null, 1));
  console.log(`Szenarien: ${meta.szenarien.length}, Feldnamen: ${Object.keys(meta.felder.de).length} (de) / ${Object.keys(meta.felder.en).length} (en)`);
}
