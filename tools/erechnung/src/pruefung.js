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
      return { context: r.context, tests: r.tests, lets, letNamen: new Set(r.lets.map(l => l.name)), auswahl: kontextAusdruck(r.context), passt: musterPraedikat(r.context),
        alle: `${lets}(${r.tests.map(t => `boolean((${t.cond}))`).join(",\n ")})` };
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

// Dasselbe Muster als Bedingung für einen einzelnen Knoten (Kontextknoten): Schritte von hinten nach vorn über parent:: und ancestor::.
// XSLT 3.0 (5.5.4): Ein Fehler beim Abgleich eines Musters mit einem Knoten gilt als „passt nicht“. Schlägt die Auswahl aller Knoten
// fehl, prüft pruefen() deshalb jeden Knoten einzeln mit dieser Bedingung. Die Muster der Regeln haben keine Positionsprädikate.
function schritte(pfad) {
  const teile = [], trenner = [];
  let tiefe = 0, q = null, start = 0;
  for (let i = 0; i < pfad.length; i++) {
    const c = pfad[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === "'" || c === '"') q = c;
    else if (c === "(" || c === "[") tiefe++;
    else if (c === ")" || c === "]") tiefe--;
    else if (c === "/" && tiefe === 0) {
      teile.push(pfad.slice(start, i).trim());
      if (pfad[i + 1] === "/") { trenner.push("//"); i++; } else trenner.push("/");
      start = i + 1;
    }
  }
  teile.push(pfad.slice(start).trim());
  return { teile, trenner };
}
function selbst(schritt) {
  if (schritt.startsWith("(")) {
    let tiefe = 0, i = 0;
    for (; i < schritt.length; i++) { if (schritt[i] === "(") tiefe++; else if (schritt[i] === ")" && --tiefe === 0) break; }
    return `self::node()[${musterPraedikat(schritt.slice(1, i))}]${schritt.slice(i + 1)}`;
  }
  const m = /^(@?)([^[\s]+)(.*)$/s.exec(schritt);
  const [, at, test, rest] = m;
  if (at) return `self::attribute(${test === "*" ? "" : test})${rest}`;
  if (/^(node|text|comment|processing-instruction)\(\)$/.test(test)) return `self::${test}${rest}`;
  return `self::${test}${rest}`;
}
export function musterPraedikat(p) {
  const teile = teileOberstes(p);
  if (teile.length > 1) return teile.map(x => `(${musterPraedikat(x)})`).join(" or ");
  let pfad = teile[0], fuehrung = "";
  if (pfad === "/") return ". instance of document-node()";
  if (pfad.startsWith("//")) { fuehrung = "//"; pfad = pfad.slice(2); } else if (pfad.startsWith("/")) { fuehrung = "/"; pfad = pfad.slice(1); }
  const { teile: st, trenner } = schritte(pfad);
  const kette = i => {
    let e = selbst(st[i]);
    if (i > 0) e += `[${trenner[i - 1] === "//" ? "ancestor" : "parent"}::node()[${kette(i - 1)}]]`;
    else if (fuehrung === "/") e += "[parent::node() instance of document-node()]";
    return e;
  };
  return `exists(${kette(st.length - 1)})`;
}

// Alle Knoten eines Dokuments (Elemente, Attribute, Text) für den Abgleich einzelner Knoten
function knotenListe(doc) {
  const out = [doc];
  const lauf = n => { for (let k = n.firstChild; k; k = k.nextSibling) { out.push(k); if (k.nodeType === 1) { for (const a of Array.from(k.attributes)) if (!/^xmlns(:|$)/.test(a.name)) out.push(a); lauf(k); } } };
  lauf(doc);
  return out;
}

// Globale Variablen einmal je Dokument auswerten und mit ihrem Typ weitergeben
const TYP = `for $i in $__v return (if ($i instance of node()) then 'node()' else if ($i instance of xs:integer) then 'xs:integer' else if ($i instance of xs:decimal) then 'xs:decimal' else if ($i instance of xs:double) then 'xs:double' else if ($i instance of xs:boolean) then 'xs:boolean' else if ($i instance of xs:untypedAtomic) then 'xs:untypedAtomic' else 'xs:string')`;
// Wie in XSLT werden globale Variablen nur bei Bedarf ausgewertet: Schlägt eine fehl (etwa wegen doppelter Elemente), ist das nur dann
// ein Fehler, wenn eine Regel sie wirklich braucht. Solche Variablen (kaputt) setzt pruefen() als Ausdruck in die Regeln ein.
function globaleWerte(fx, doc, v) {
  const vars = {}, offen = [...v.globale], kaputt = new Map();
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
        if (!/XPST0008/.test(e.message)) { kaputt.set(g.name, g.expr); offen.splice(offen.indexOf(g), 1); weiter = true; }
      }
    }
  }
  for (const g of offen) kaputt.set(g.name, g.expr);
  return { vars, kaputt };
}
// Verweise auf nicht auswertbare globale Variablen durch ihren Ausdruck ersetzen, ausgewertet am Dokumentknoten (wie in XSLT)
function einsetzer(kaputt) {
  if (!kaputt.size) return null;
  const re = new RegExp(`\\$(${[...kaputt.keys()].map(n => n.replace(/[.-]/g, "\\$&")).join("|")})(?![\\w.-])`, "g");
  const ersetzen = (s, ausser = new Set(), tiefe = 0) => tiefe > 10 ? s : s.replace(re, (ganz, name) => ausser.has(name) ? ganz : `(/ ! (${ersetzen(kaputt.get(name), new Set(), tiefe + 1)}))`);
  return ersetzen;
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
  const { vars, kaputt } = globaleWerte(fx, doc, v);
  const ersetzen = einsetzer(kaputt);
  const befunde = [], fehler = [];
  let zaehler = 0, alleKnoten = null;
  for (const m of v.muster) {
    const gefeuert = new Set();
    for (const r0 of m.regeln) {
      const r = ersetzen ? angepasst(r0, s => ersetzen(s, r0.letNamen)) : r0;
      let knoten;
      try { knoten = fx.evaluateXPathToNodes(r.auswahl, doc, null, vars, v.optionen); }
      catch {
        // Fehler beim Musterabgleich gilt je Knoten als „passt nicht“ (XSLT 3.0)
        alleKnoten ||= knotenListe(doc);
        knoten = alleKnoten.filter(k => { try { return fx.evaluateXPathToBoolean(r.passt, k, null, vars, v.optionen); } catch { return false; } });
      }
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
        if (pause && ++zaehler % 150 === 0) await pause();
      }
    }
  }
  return { befunde, fehler };
}

function angepasst(r, f) {
  return { ...r, lets: f(r.lets), auswahl: f(r.auswahl), passt: f(r.passt), alle: f(r.alle),
    tests: r.tests.map(t => ({ ...t, cond: f(t.cond), text: t.text.map(x => x.v != null ? { v: f(x.v) } : x) })) };
}

function nachricht(fx, t, k, r, vars, v) {
  return t.text.map(teil => {
    if (teil.t != null) return teil.t;
    try { return fx.evaluateXPathToString(`${r.lets}string-join((${teil.v}) ! string(.), ' ')`, k, null, vars, v.optionen); } catch { return ""; }
  }).join("").replace(/\s+/g, " ").trim();
}
