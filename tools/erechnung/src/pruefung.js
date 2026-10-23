// Schematron-Interpreter für die offiziellen Prüfregeln (EN 16931 von CEN, XRechnung von KoSIT); XPath über fontoxpath (MIT).
// Die Regelsätze kommen aus den XSLT-Dateien der KoSIT-Validator-Konfiguration (regeln-bauen.mjs). Semantik wie SchXslt, mit dem
// KoSIT sie übersetzt: Jedes Muster durchläuft alle Knoten des Dokuments; je Knoten und Muster feuert nur die erste passende Regel
// (höchste Priorität); ein Test meldet, wenn seine Bedingung wahr ist (assert: Bedingung nicht erfüllt, report: erfüllt).
const XS = "http://www.w3.org/2001/XMLSchema";
const registriert = new Set();

// Funktionen, die fontoxpath nicht wie Saxon rechnen kann, in gleicher Rechnung exakt in JavaScript.
// xr:checkIBAN (XRechnung, BR-DE-19/20) wandelt die IBAN in eine 20- bis 40-stellige Ganzzahl (xs:integer) und prüft „mod 97 = 1“;
// fontoxpath kennt xs:integer nur bis 2^53 und bricht ab, Saxon rechnet beliebig groß. Schritte wie im XSLT der KoSIT:
// Leerraum entfernen, Muster XR-IBAN-REGEX, die ersten vier Zeichen ans Ende, Buchstaben zu Zahlen (Codepunkt − 55), dann mod 97.
const ERSATZ = {
  "xr:checkIBAN": konstant => {
    const muster = new RegExp((konstant["XR-IBAN-REGEX"] || ["^[A-Z]{2}[0-9]{2}[a-zA-Z0-9]{0,30}$"])[0]);
    return (_ctx, iban) => {
      const n = String(iban).replace(/[ \t\n\r]/g, "");
      if (!muster.test(n)) return false;
      let ziffern = "";
      for (const ch of n.slice(4) + n.slice(0, 2).toUpperCase() + n.slice(2, 4)) { const cp = ch.codePointAt(0); ziffern += String(cp > 64 ? cp - 55 : cp - 48); }
      return BigInt(ziffern) % 97n === 1n;
    };
  },
};

// Regelsatz einmal vorbereiten: Funktionen als XQuery-Modul registrieren, Ausdrücke zusammensetzen
export function vorbereiten(satz, fx, kennung) {
  const ns = { ...satz.ns, xs: XS };
  // Funktionsmodule je Regelsatz unter eigener Adresse (UBL und CII definieren u:… verschieden)
  for (const p of new Set(satz.funktionen.map(f => f.name.split(":")[0]))) ns[p] = `${ns[p]}#${kennung}`;
  const resolver = p => ns[p] || null;
  // Konstante globale Variablen (ohne Bezug zum Dokument), die in Funktionen vorkommen, als Literale einsetzen
  const konstant = {};
  for (const g of satz.globale) {
    try {
      const v = fx.evaluateXPath(g.expr, null, null, {}, fx.evaluateXPath.ALL_RESULTS_TYPE, { namespaceResolver: resolver });
      if (v.every(x => typeof x === "string")) konstant[g.name] = v;
    } catch { /* braucht das Dokument */ }
  }
  const module = {};
  for (const f of satz.funktionen) {
    const [prefix, lokal] = f.name.split(":");
    if (ERSATZ[f.name]) {
      const uri = ns[prefix], schluessel = `${uri}|${lokal}`;
      if (!registriert.has(schluessel)) { fx.registerCustomXPathFunction({ namespaceURI: uri, localName: lokal }, f.params.map(p => p.as || "item()*"), f.as || "item()*", ERSATZ[f.name](konstant)); registriert.add(schluessel); }
      continue;
    }
    let body = f.body;
    for (const [name, werte] of Object.entries(konstant)) {
      body = body.replace(new RegExp(`\\$${name.replace(/[.-]/g, "\\$&")}(?![\\w.-])`, "g"), () => `(${werte.map(w => `'${w.replace(/'/g, "''")}'`).join(", ")})`);
    }
    (module[prefix] ||= []).push(`declare function ${f.name}(${f.params.map(p => `$${p.name}${p.as ? " as " + p.as : ""}`).join(", ")})${f.as ? " as " + f.as : ""} {\n${body}\n};`);
  }
  const imports = {};
  for (const [prefix, decls] of Object.entries(module)) {
    const uri = ns[prefix];
    const kopf = Object.entries(ns).filter(([p]) => p !== prefix && p !== "xs").map(([p, u]) => `declare namespace ${p} = "${u}";`).join("\n");
    if (!registriert.has(uri)) { fx.registerXQueryModule(`module namespace ${prefix} = "${uri}";\n${kopf}\n${decls.join("\n")}`); registriert.add(uri); }
    imports[prefix] = uri;
  }
  const optionen = { namespaceResolver: resolver, moduleImports: imports, language: fx.evaluateXPath.XQUERY_3_1_LANGUAGE };
  const muster = satz.muster.map(p => ({
    id: p.id,
    regeln: p.regeln.map(r => {
      const lets = r.lets.length ? `let ${r.lets.map(l => `$${l.name} := (${l.expr})`).join(",\n    ")}\nreturn ` : "";
      return { context: r.context, tests: r.tests, lets, auswahl: kontextAusdruck(r.context), alle: `${lets}(${r.tests.map(t => `boolean((${t.cond}))`).join(",\n ")})` };
    }),
  }));
  return { kennung, titel: satz.titel, globale: satz.globale, muster, optionen };
}

// XSLT-Muster als Ausdruck, der alle passenden Knoten liefert: P für absolute Teile, sonst /descendant-or-self::node()/(P)
function teileOberstes(s) {
  const teile = [];
  let tiefe = 0, q = null, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === "'" || c === '"') q = c;
    else if (c === "(" || c === "[") tiefe++;
    else if (c === ")" || c === "]") tiefe--;
    else if (c === "|" && tiefe === 0) { teile.push(s.slice(start, i).trim()); start = i + 1; }
  }
  teile.push(s.slice(start).trim());
  return teile;
}
export function kontextAusdruck(p) {
  const einzeln = t => t.startsWith("/") ? t : `/descendant-or-self::node()/(${t})`;
  const teile = teileOberstes(p);
  return teile.length === 1 ? einzeln(teile[0]) : teile.map(t => `(${einzeln(t)})`).join(" | ");
}

// Globale Variablen einmal je Dokument auswerten und mit ihrem Typ weitergeben
const TYP = `for $i in $__v return (if ($i instance of node()) then 'node()' else if ($i instance of xs:integer) then 'xs:integer' else if ($i instance of xs:decimal) then 'xs:decimal' else if ($i instance of xs:double) then 'xs:double' else if ($i instance of xs:boolean) then 'xs:boolean' else if ($i instance of xs:untypedAtomic) then 'xs:untypedAtomic' else 'xs:string')`;
function globaleWerte(fx, doc, v) {
  const vars = {}, offen = [...v.globale];
  let weiter = true;
  while (offen.length && weiter) {
    weiter = false;
    for (const g of [...offen]) {
      try {
        const werte = fx.evaluateXPath(g.expr, doc, null, vars, fx.evaluateXPath.ALL_RESULTS_TYPE, v.optionen);
        const typen = fx.evaluateXPath(`let $__v := (${g.expr}) return ${TYP}`, doc, null, vars, fx.evaluateXPath.ALL_RESULTS_TYPE, v.optionen);
        if (typen.some(t => t !== typen[0])) throw new Error(`Globale Variable ${g.name}: gemischte Typen`);
        vars[g.name] = !werte.length ? fx.createTypedValueFactory("item()*")([], null)
          : werte.length === 1 ? fx.createTypedValueFactory(typen[0])(werte[0], null) : fx.createTypedValueFactory(typen[0] + "*")(werte, null);
        offen.splice(offen.indexOf(g), 1);
        weiter = true;
      } catch (e) {
        if (!/XPST0008/.test(e.message)) throw new Error(`Globale Variable ${g.name}: ${e.message}`);
      }
    }
  }
  if (offen.length) throw new Error("Globale Variablen nicht auflösbar: " + offen.map(g => g.name).join(", "));
  return vars;
}

// Ort eines Knotens als Pfad (für Anzeige und Abgleich)
export function ort(n) {
  const teile = [];
  while (n && n.nodeType !== 9) {
    if (n.nodeType === 2) { teile.unshift("@" + n.name); n = n.ownerElement; continue; }
    if (n.nodeType === 1) {
      let i = 1;
      for (let s = n.previousSibling; s; s = s.previousSibling) if (s.nodeType === 1 && s.namespaceURI === n.namespaceURI && s.localName === n.localName) i++;
      teile.unshift(`${n.prefix ? n.prefix + ":" : ""}${n.localName}[${i}]`);
    } else teile.unshift(n.nodeType === 3 ? "text()" : "node()");
    n = n.parentNode;
  }
  return "/" + teile.join("/");
}

// Ein Dokument gegen einen vorbereiteten Regelsatz prüfen; pause() gibt der Oberfläche zwischendurch Zeit
export async function pruefen(fx, doc, v, { pause = null } = {}) {
  const vars = globaleWerte(fx, doc, v);
  const befunde = [], fehler = [];
  let schritte = 0;
  for (const m of v.muster) {
    const gefeuert = new Set();
    for (const r of m.regeln) {
      let knoten;
      try { knoten = fx.evaluateXPathToNodes(r.auswahl, doc, null, vars, v.optionen); }
      catch (e) { fehler.push({ regel: r.context, meldung: e.message }); continue; }
      for (const k of knoten) {
        if (gefeuert.has(k)) continue;
        gefeuert.add(k);
        let ergebnis;
        try { ergebnis = fx.evaluateXPath(r.alle, k, null, vars, fx.evaluateXPath.ALL_RESULTS_TYPE, v.optionen); }
        catch {
          // Einzeln auswerten, um den Test mit dem Fehler zu finden (Saxon bräche hier die ganze Prüfung ab)
          ergebnis = r.tests.map(t => {
            try { return fx.evaluateXPathToBoolean(`${r.lets}(${t.cond})`, k, null, vars, v.optionen); }
            catch (e) { fehler.push({ id: t.id, regel: r.context, ort: ort(k), meldung: e.message }); return null; }
          });
        }
        r.tests.forEach((t, i) => {
          if (ergebnis[i] === true) befunde.push({ id: t.id, flag: t.flag, art: t.art, ort: ort(k), knoten: k, text: nachricht(fx, t, k, r, vars, v) });
        });
        if (pause && ++schritte % 150 === 0) await pause();
      }
    }
  }
  return { befunde, fehler };
}

function nachricht(fx, t, k, r, vars, v) {
  return t.text.map(teil => {
    if (teil.t != null) return teil.t;
    try { return fx.evaluateXPathToString(`${r.lets}string-join((${teil.v}) ! string(.), ' ')`, k, null, vars, v.optionen); } catch { return ""; }
  }).join("").replace(/\s+/g, " ").trim();
}
