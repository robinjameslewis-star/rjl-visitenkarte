// SmartFormular E-Rechnung lite – Oberfläche: Dateien annehmen, sofort die Antwort „Ist das eine E-Rechnung?“, lesbare Ansicht,
// Zahlungsangaben mit GiroCode, Prüfung mit den offiziellen Regeln (lädt beim ersten Prüfen nach), Druck und Prüfbericht.
// Läuft auf robin.vision (Regeln und Prüfkern als statische Dateien von dort) und als einzelne Datei offline (alles eingebettet).
import { T, ARTEN, ZAHLUNGSARTEN, EINHEITEN, GUTSCHRIFTEN } from "./texte.js";
import { ANTWORT, ZUSATZ, Q, STAND } from "./recht.js";
import { dateiLesen } from "./lesen.js";
import { erklaeren, STEUERKATEGORIE } from "./regeltexte.js";
import { feld } from "./felder.js";
import { zahlung, qrSvg, ibanLesbar } from "./girocode.js";
import META from "./generiert/meta.json";

/* global __FASSUNG__ */
const FASSUNG = typeof __FASSUNG__ === "string" ? __FASSUNG__ : "dev";
const wurzel = document.getElementById("erechnung");
const lang = (wurzel.dataset.lang || document.documentElement.lang || "de").startsWith("en") ? "en" : "de";
const basis = wurzel.dataset.basis || "./";
const t = T[lang];
const L = lang === "en" ? "en-GB" : "de-DE";

// ---------- Hilfen ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ersetze = (s, w) => s.replace(/\{(\w+)\}/g, (_, k) => w[k] ?? "");
const geld = (n, w) => {
  if (n == null) return "";
  try { return new Intl.NumberFormat(L, { style: "currency", currency: w || "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }
  catch { return `${new Intl.NumberFormat(L, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${w || ""}`.trim(); }
};
const zahl = (n, max = 4) => n == null ? "" : new Intl.NumberFormat(L, { maximumFractionDigits: max }).format(n);
const prozent = n => n == null ? "" : `${zahl(n, 2)} %`;
const datum = s => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return s || "";
  return lang === "en" ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : `${m[3]}.${m[2]}.${m[1]}`;
};
let regionen = null;
const land = c => { if (!c) return ""; try { regionen ||= new Intl.DisplayNames([L], { type: "region" }); return regionen.of(c.toUpperCase()) || c; } catch { return c; } };
const liste = (map, c) => c ? (map[c] ? map[c][lang === "en" ? 1 : 0] : c) : "";
const einheit = c => liste(EINHEITEN, c);
const groesse = b => b < 1024 ? `${b} B` : b < 1048576 ? `${zahl(b / 1024, 0)} KB` : `${zahl(b / 1048576, 1)} MB`;
const bt = (id, inhalt) => `<span data-bt="${id}">${inhalt}</span>`;
const quellenHtml = keys => keys.length ? `<p class="ewz-quellen">${t.quellen}: ${keys.map(k => `<a href="${esc(Q[k][2])}" target="_blank" rel="noopener">${esc(Q[k][lang === "en" ? 1 : 0])}</a>`).join("; ")}.</p>` : "";
const pause = () => new Promise(r => setTimeout(r, 0));

// ---------- Gerüst ----------
wurzel.innerHTML = `
<section class="ewz-abschnitt ewz-start" aria-labelledby="ewz-h1">
  <div class="ewz-n" aria-hidden="true">01</div>
  <div class="ewz-inhalt">
    <span class="ewz-label">${t.schritt1}</span>
    <h2 id="ewz-h1">${t.schritt1t}</h2>
    <label class="ewz-ablage" id="ewz-ablage">
      <input type="file" id="ewz-datei" multiple accept=".xml,.pdf,application/xml,text/xml,application/pdf">
      <span>${t.ablage}</span>
      <small>${t.ablageKlein}</small>
    </label>
    <p class="ewz-beispiele">${t.beispiel} <button type="button" class="ewz-zweit" data-beispiel="xrechnung">${t.beispielXR}</button> <button type="button" class="ewz-zweit" data-beispiel="zugferd">${t.beispielZF}</button></p>
    <p class="ewz-status" id="ewz-status" role="status" aria-live="polite"></p>
  </div>
</section>
<div id="ewz-uebersicht"></div>
<div id="ewz-ergebnisse"></div>`;
const status = document.getElementById("ewz-status");
const ergebnisse = document.getElementById("ewz-ergebnisse");
const uebersicht = document.getElementById("ewz-uebersicht");
const sagen = s => { status.textContent = s; };

// ---------- Prüfkern und Regeln (laden beim ersten Prüfen nach) ----------
let kernVersprechen = null;
const saetze = new Map();
function kern() {
  if (window.RVPruefung) return Promise.resolve(window.RVPruefung);
  return kernVersprechen ||= new Promise((ok, nein) => {
    const s = document.createElement("script");
    s.src = `${basis}pruefung.js?v=${FASSUNG}`;
    s.onload = () => window.RVPruefung ? ok(window.RVPruefung) : nein(new Error("Prüfkern fehlt"));
    s.onerror = () => { kernVersprechen = null; nein(new Error(lang === "en" ? "The validation rules could not be loaded." : "Die Prüfregeln ließen sich nicht laden.")); };
    document.head.appendChild(s);
  });
}
async function regelsatz(id) {
  if (saetze.has(id)) return saetze.get(id);
  const k = await kern();
  const eingebettet = window.RV_REGELN && window.RV_REGELN[id];
  const daten = eingebettet || await fetch(`${basis}regeln/${id}.json?v=${FASSUNG}`, { credentials: "omit" }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
  const v = k.vorbereiten(daten, k.fx, id);
  saetze.set(id, v);
  return v;
}

// ---------- Zustand ----------
let laufendeNummer = 0;
const eintraege = [];
let warteschlange = Promise.resolve();

async function annehmen(dateien) {
  const neu = Array.from(dateien);
  if (!neu.length) return;
  sagen(t.liest);
  const frisch = [];
  for (const d of neu) {
    let e;
    try { e = await dateiLesen(d); } catch (err) { e = { name: d.name, groesse: d.size, art: "unbekannt", meldung: String(err) }; }
    e.nr = ++laufendeNummer;
    e.pruefung = { status: e.art === "rechnung" && e.format.saetze.length ? "offen" : "keine", befunde: [], fehler: [] };
    if (e.daten && !e.daten.fehler) e.daten.sprache = lang;
    eintraege.push(e);
    frisch.push(e);
    ergebnisse.insertAdjacentHTML("beforeend", karte(e));
  }
  uebersichtZeichnen();
  if (frisch.length === 1 && eintraege.length === 1) { /* erste Datei: Ergebnis im Blick */ }
  sagen(eintraege.length > 1 ? ersetze(t.fertigN, { n: eintraege.length }) : t.fertig);
  const zuPruefen = frisch.filter(e => e.pruefung.status === "offen");
  if (zuPruefen.length) warteschlange = warteschlange.then(() => pruefenAlle(zuPruefen));
  const erste = document.getElementById(`ewz-k${frisch[0].nr}`);
  if (erste) erste.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

async function pruefenAlle(liste) {
  let i = 0;
  for (const e of liste) {
    if (!eintraege.includes(e)) continue;
    i++;
    e.pruefung.status = "laeuft";
    teilZeichnen(e);
    sagen(liste.length > 1 ? ersetze(t.prueftN, { i, n: liste.length }) : t.prueft);
    try {
      if (!window.RVPruefung) sagen(t.laedt);
      for (const id of e.format.saetze) {
        const v = await regelsatz(id);
        sagen(liste.length > 1 ? ersetze(t.prueftN, { i, n: liste.length }) : t.prueft);
        const { befunde, fehler } = await window.RVPruefung.pruefen(window.RVPruefung.fx, e.doc, v, { pause });
        for (const b of befunde) { b.satz = id; b.stufe = stufe(b, e.format.stufen); delete b.knoten; }
        e.pruefung.befunde.push(...befunde);
        e.pruefung.fehler.push(...fehler);
      }
      e.pruefung.status = "fertig";
    } catch (err) {
      e.pruefung.status = "fehler";
      e.pruefung.meldung = String(err && err.message || err);
    }
    teilZeichnen(e);
    uebersichtZeichnen();
  }
  sagen(t.fertig);
}
// Stufe wie im Prüfer der KoSIT: Abweichungen des Szenarios (customLevel), sonst nach Kennzeichen der Regel
function stufe(b, stufen) {
  const s = stufen && stufen[b.id];
  if (s) return s === "error" ? "fehler" : s === "warning" ? "warnung" : "hinweis";
  return b.flag === "warning" ? "warnung" : b.flag === "information" || b.flag === "info" ? "hinweis" : "fehler";
}
function zaehlen(e) {
  const ids = { fehler: new Set(), warnung: new Set(), hinweis: new Set() };
  for (const b of e.pruefung.befunde) ids[b.stufe].add(b.id);
  return { fehler: ids.fehler.size, warnung: ids.warnung.size, hinweis: ids.hinweis.size };
}

// ---------- Antwort ----------
function antwort(e) {
  const a = e.art;
  if (a === "rechnung") {
    const p = e.format.profil;
    if (e.pruefung.status === "fertig" && e.pruefung.fehler.length && p.e !== false) return ANTWORT.neinWerte;
    if (p.e === false) return ANTWORT.neinProfil;
    if (p.e == null || p.unbekannt) return ANTWORT.unklar;
    return e.herkunft === "pdf" ? ANTWORT.jaZugferd : ANTWORT.ja;
  }
  if (a === "pdf-ohne-xml") return ANTWORT.neinPdf;
  if (a === "bild") return ANTWORT.neinBild;
  if (a === "xml-fremd") return ANTWORT.keineRechnung;
  if (a === "xml-defekt" || a === "xml-dtd") return ANTWORT.neinFormat;
  if (a === "zugferd1") return ANTWORT.neinZugferd1;
  return null;
}
function formatZeilen(e) {
  if (e.art !== "rechnung") return "";
  const f = e.format, p = f.profil;
  const syntax = f.syntax === "ubl" ? `UBL 2.1 (${f.wurzel})` : "UN/CEFACT CII (D16B)";
  const zeilen = [[t.format, esc(p.name)], [t.syntax, esc(syntax)]];
  if (e.herkunft === "pdf") zeilen.push([lang === "en" ? "Embedded as" : "Eingebettet als", esc(e.pdf.xmlName || "XML")]);
  zeilen.push([t.kennung, `<code>${esc(f.kennung || "–")}</code>`]);
  if (e.pdf && e.pdf.xmp && e.pdf.xmp.profil) zeilen.push([lang === "en" ? "Profile in PDF metadata" : "Profil in den PDF-Metadaten", esc(e.pdf.xmp.profil)]);
  return `<dl class="ewz-format">${zeilen.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
}
function pruefZeile(e) {
  const pr = e.pruefung;
  if (pr.status === "keine") return "";
  if (pr.status === "offen" || pr.status === "laeuft") return `<p class="ewz-pruefstand"><span class="ewz-spinner" aria-hidden="true"></span>${t.pruefung}: ${t.prueftLaeuft}</p>`;
  if (pr.status === "fehler") return `<p class="ewz-pruefstand ewz-rot">${esc(ersetze(t.fehlerBeimPruefen, { meldung: pr.meldung }))}</p>`;
  const z = zaehlen(e);
  const text = [pr.fehler.length ? `${t.formatfehler} (${formatWerte(pr.fehler).length})` : "", z.fehler || z.warnung || z.hinweis ? t.zaehler(z.fehler, z.warnung, z.hinweis) : pr.fehler.length ? "" : t.keineFehler].filter(Boolean).join(", ");
  const regeln = ersetze(e.format.saetze.some(s => s.startsWith("xrechnung")) ? t.regeln : t.regelnNur, { stand: datum(META.stand) });
  return `<p class="ewz-pruefstand ${pr.fehler.length ? "ewz-rot" : z.fehler ? "ewz-gelb" : "ewz-gruen"}"><strong>${t.pruefung}:</strong> ${esc(text)} <a href="#ewz-b${e.nr}">${lang === "en" ? "Details" : "Einzelheiten"}</a></p>
<p class="ewz-klein">${esc(regeln)}</p>`;
}
function antwortHtml(e) {
  const a = antwort(e);
  const fertig = e.pruefung.status === "fertig", z = fertig ? zaehlen(e) : { fehler: 0 };
  if (!a) {
    const [kopf, text] = t.art[e.art] || t.art.unbekannt;
    return `<div class="ewz-antwort ewz-neutral"><p class="ewz-urteil">${esc(kopf)}</p><p>${esc(text)}</p></div>`;
  }
  const [kopf, satz] = a[lang];
  const klasse = a.urteil === "nein" ? "ewz-nein" : a.urteil === "eingeschraenkt" ? "ewz-unklar" : z.fehler ? "ewz-gelb" : "ewz-ja";
  const formatName = e.art === "rechnung" ? e.format.profil.name : "";
  let zusatz = "";
  if (e.art === "xml-fremd") zusatz = `<p>${esc(ersetze(t.art["xml-fremd"][1], { dokument: t.xmlFremd(e.format.dokument || "?", e.format.namespace || "") }))}</p>`;
  else if (e.art === "xml-defekt") zusatz = `<p>${esc(t.art["xml-defekt"][1])}</p>`;
  else if (e.art === "xml-dtd") zusatz = `<p>${esc(t.art["xml-dtd"][1])}</p>`;
  let hinweise = "";
  if (e.art === "rechnung") {
    if (fertig && z.fehler && a.urteil === "ja") hinweise += `<p class="ewz-zusatz">${esc(ZUSATZ.geschaeftsregel[lang])}</p>${quellenHtml(ZUSATZ.geschaeftsregel.quellen)}`;
    if (e.format.profil.alt) hinweise += `<p class="ewz-zusatz">${esc(ZUSATZ.altXR[lang])}</p>`;
    else if (!e.format.szenario && e.format.saetze.length && e.format.profil.id !== "en16931") hinweise += `<p class="ewz-zusatz">${esc(ZUSATZ.ohneSzenario[lang])}</p>`;
    if (e.herkunft === "pdf") hinweise += `<p class="ewz-zusatz">${esc(ZUSATZ.hybrid[lang])}</p>${quellenHtml(ZUSATZ.hybrid.quellen)}`;
  }
  return `<div class="ewz-antwort ${klasse}" data-teil="antwort">
<p class="ewz-frage">${lang === "en" ? "Is this an e-invoice?" : "Ist das eine E-Rechnung?"}</p>
<p class="ewz-urteil">${esc(kopf)}</p>
<p>${esc(ersetze(satz, { format: formatName }))}</p>${zusatz}
${quellenHtml(a.quellen)}
${formatZeilen(e)}
<div data-teil="pruefzeile">${pruefZeile(e)}</div>
${hinweise}
${a.quellen.length || hinweise ? `<p class="ewz-stand">${t.stand}: ${datum(STAND)}</p>` : ""}
</div>`;
}

// ---------- Befunde ----------
// Auswertungsfehler: Werte im falschen Format (dort bricht auch der Prüfer der KoSIT ab) – verständlich, je Meldung einmal
function formatWerte(fehler) {
  const out = new Map();
  for (const f of fehler) {
    const m = String(f.meldung || "");
    let satz;
    const cast = /Cannot cast (.*?) to xs:(\w+)/.exec(m);
    if (cast && /decimal|double|integer|float/.test(cast[2])) satz = t.werte.zahl(cast[1]);
    else if (cast && /date|time/i.test(cast[2])) satz = t.werte.datum(cast[1]);
    else if (cast && cast[2] === "boolean") satz = t.werte.wahr(cast[1]);
    else if (/Invalid date/.test(m)) satz = t.werte.datum((/"([^"]+)"/.exec(m) || [])[1] || "");
    else if (/Multiplicity|more than one|effective boolean value of a sequence/.test(m)) satz = t.werte.mehrfach();
    else satz = t.werte.sonst();
    if (!out.has(satz)) out.set(satz, { satz, orte: new Set(), meldung: m });
    if (f.ort) out.get(satz).orte.add(f.ort);
  }
  return [...out.values()];
}
function befundeHtml(e) {
  const pr = e.pruefung;
  if (pr.status === "keine") return "";
  if (pr.status !== "fertig") return `<p class="ewz-klein">${t.pruefung}: ${pr.status === "fehler" ? esc(pr.meldung) : t.prueftLaeuft}</p>`;
  const werte = pr.fehler.length ? `<ol class="ewz-befunde">${formatWerte(pr.fehler).map(w => `<li class="ewz-befund ewz-fehler"><p class="ewz-befund-kopf"><span class="ewz-stufe">${t.formatfehler}</span></p>
<p><strong>${t.wasFehlt}:</strong> ${esc(w.satz)}</p><p><strong>${t.wasTun}:</strong> ${esc(t.formatTun)}</p>
<details><summary>${t.technisch}</summary><p class="ewz-orig" lang="en">${esc(w.meldung.slice(0, 300))}</p>${w.orte.size ? `<p class="ewz-klein">${t.formatOrt}: ${[...w.orte].slice(0, 5).map(o => `<code>${esc(o)}</code>`).join(", ")}</p>` : ""}</details></li>`).join("")}</ol>` : "";
  if (!pr.befunde.length) return werte || `<p class="ewz-ok-text">${esc(t.keineBefunde)}</p>`;
  const gruppen = new Map();
  for (const b of pr.befunde) {
    if (!gruppen.has(b.id)) gruppen.set(b.id, { ...b, orte: [] });
    gruppen.get(b.id).orte.push(b.ort);
  }
  const rang = { fehler: 0, warnung: 1, hinweis: 2 };
  const nat = s => s.replace(/\d+/g, d => d.padStart(5, "0"));
  const sortiert = [...gruppen.values()].sort((a, b) => rang[a.stufe] - rang[b.stufe] || nat(a.id).localeCompare(nat(b.id)));
  const z = zaehlen(e);
  const kopf = werte + (!z.fehler && !pr.fehler.length ? `<p class="ewz-ok-text">${esc(t.nurWarnungen)}</p>` : "");
  const MAX = 12;
  const item = (g, i) => {
    const [was, tun] = erklaeren(g.id, g.text, lang);
    const felder = [...new Set((g.text.match(/\bB[TG]-\d+\b/g) || []))];
    return `<li class="ewz-befund ewz-${g.stufe}"${i >= MAX ? " hidden data-mehr" : ""}>
<p class="ewz-befund-kopf"><span class="ewz-stufe">${t[g.stufe]}</span> <span class="ewz-regel">${t.regel} ${esc(g.id)}</span>${felder.length ? ` <span class="ewz-feld">${t.feld} ${felder.map(f => `<abbr title="${esc(feld(f, lang))}">${f}</abbr>`).join(", ")}</span>` : ""}${g.orte.length > 1 ? ` <span class="ewz-anzahl">${g.orte.length}×</span>` : ""}</p>
<p><strong>${t.wasFehlt}:</strong> ${esc(was)}</p>
<p><strong>${t.wasTun}:</strong> ${esc(tun)}</p>
<details><summary>${t.original}</summary><p class="ewz-orig" lang="${/[äöüß]/i.test(g.text) ? "de" : "en"}">${esc(g.text)}</p><p class="ewz-klein">${t.ort}: ${g.orte.slice(0, 5).map(o => `<code>${esc(o)}</code>`).join(", ")}${g.orte.length > 5 ? " …" : ""}</p></details>
</li>`;
  };
  return `${kopf}<ol class="ewz-befunde">${sortiert.map(item).join("")}</ol>${sortiert.length > MAX ? `<button type="button" class="ewz-zweit" data-aktion="mehr" aria-expanded="false" data-n="${sortiert.length}">${esc(ersetze(t.mehrAnzeigen, { n: sortiert.length }))}</button>` : ""}`;
}

// ---------- Bezahlen ----------
function skonto(bed) {
  const out = [];
  const re = /#SKONTO#TAGE=(\d+)#PROZENT=(\d+\.\d{2})(?:#BASISBETRAG=(-?\d+\.\d{2}))?#/g;
  let m;
  while ((m = re.exec(bed || ""))) out.push({ tage: +m[1], prozent: +m[2], basis: m[3] ? +m[3] : null });
  return out;
}
const kopierbar = (label, wert, anzeige) => wert ? `<div class="ewz-kopie"><dt>${label}</dt><dd><span class="ewz-wert">${esc(anzeige || wert)}</span> <button type="button" class="ewz-kopieren" data-kopie="${esc(wert)}" aria-label="${esc(`${label} ${t.kopieren.toLowerCase()}`)}">${t.kopieren}</button></dd></div>` : "";
function zahlenHtml(e) {
  const d = e.daten;
  const z = zahlung(d);
  const werte = `<dl class="ewz-zahlwerte">
${kopierbar(t.empfaenger, z.empfaenger)}
${kopierbar(t.iban, z.iban, ibanLesbar(z.iban))}
${kopierbar(t.bic, z.bic)}
${z.betrag != null ? kopierbar(t.betrag, z.betrag.toFixed(2), geld(z.betrag, z.waehrung)) : ""}
${kopierbar(t.zweck, z.zweck)}
${d.faellig ? `<div class="ewz-kopie"><dt>${t.faellig}</dt><dd>${esc(datum(d.faellig))}</dd></div>` : ""}
${skonto(d.bedingungen).map(s => `<div class="ewz-kopie"><dt>${t.skonto}</dt><dd>${esc(t.skontoText(zahl(s.prozent, 2), s.tage, s.basis != null ? geld(s.basis, d.waehrung) : ""))}</dd></div>`).join("")}
</dl>`;
  const lastschrift = (d.zahlung || []).find(x => x.lastschrift);
  const ls = lastschrift ? `<p class="ewz-klein">${t.mandat}: ${esc(lastschrift.lastschrift.mandat || "–")} · ${t.glaeubiger}: ${esc(d.glaeubigerId || "–")} · ${t.konto}: ${esc(ibanLesbar(lastschrift.lastschrift.konto) || "–")}</p>` : "";
  const qr = z.nutzlast
    ? `<figure class="ewz-qr"><div class="ewz-qr-bild">${qrSvg(z.nutzlast, ersetze(t.girocodeAlt, { betrag: geld(z.betrag, "EUR"), empfaenger: z.empfaenger }))}</div><figcaption><strong>${t.girocode}</strong> – ${esc(t.girocodeLead)}</figcaption></figure>`
    : `<p class="ewz-kein-qr"><strong>${esc(t.keinGirocode)}</strong> ${esc(ersetze(t.grund[z.grund] || z.grund, { code: z.code, waehrung: z.waehrung }))}</p>`;
  return `<div class="ewz-zahlen">${qr}${werte}</div>${ls}`;
}

// ---------- Lesbare Ansicht ----------
// Zahlungsbedingungen: Skonto-Zeilen der XRechnung (#SKONTO#TAGE=…#PROZENT=…#) lesbar, sonst der Text
function bedingungenText(bed, w) {
  return bed.split(/\r?\n/).filter(z => z.trim()).map(z => {
    const m = /^#SKONTO#TAGE=(\d+)#PROZENT=(\d+\.\d{2})(?:#BASISBETRAG=(-?\d+\.\d{2}))?#$/.exec(z.trim());
    return m ? esc(t.skontoText(zahl(+m[2], 2), +m[1], m[3] ? geld(+m[3], w) : "")) : esc(z);
  }).join("<br>");
}
function partei(p, titel, btName) {
  if (!p) return "";
  const a = p.anschrift;
  const zeilen = [
    p.name ? `<strong>${bt(btName, esc(p.name))}</strong>` : "",
    p.handelsname && p.handelsname !== p.name ? esc(p.handelsname) : "",
    ...(a ? [...a.zeilen.map(esc), [a.plz, a.ort].filter(Boolean).map(esc).join(" "), a.land && a.land !== "DE" ? esc(land(a.land)) : ""] : []),
  ].filter(Boolean);
  const extra = [
    p.ustid ? `${t.ustid} ${esc(p.ustid)}` : "", p.steuernummer ? `${t.steuernr} ${esc(p.steuernummer)}` : "", p.register ? `${t.register} ${esc(p.register)}` : "",
    p.kontakt && (p.kontakt.name || p.kontakt.telefon || p.kontakt.email) ? [p.kontakt.name, p.kontakt.telefon ? `${t.tel} ${p.kontakt.telefon}` : "", p.kontakt.email].filter(Boolean).map(esc).join(" · ") : "",
    p.elektronisch ? `${t.elektronisch}: ${esc(p.elektronisch.wert)}` : "",
  ].filter(Boolean);
  return `<div class="ewz-partei"><p class="ewz-mini">${titel}</p><p>${zeilen.join("<br>")}</p>${extra.length ? `<p class="ewz-klein">${extra.join("<br>")}</p>` : ""}</div>`;
}
function ansichtHtml(e) {
  const d = e.daten;
  if (!d || d.fehler) return `<p class="ewz-klein">${esc(d && d.fehler || "")}</p>`;
  const w = d.waehrung;
  const gutschrift = d.gutschriftDokument || GUTSCHRIFTEN.includes(d.art);
  const kopfwerte = [
    [t.nr, d.nummer, "BT-1"], [t.datum, datum(d.datum), "BT-2"], [t.faellig, datum(d.faellig), "BT-9"],
    [t.lieferdatum, d.lieferung && datum(d.lieferung.datum), "BT-72"], [t.zeitraum, d.zeitraum && [datum(d.zeitraum.von), datum(d.zeitraum.bis)].filter(Boolean).join(" – "), "BG-14"],
    [t.referenz, d.referenz, "BT-10"], [t.bestellung, d.bestellung, "BT-13"], [t.auftrag, d.auftrag, "BT-14"], [t.vertrag, d.vertrag, "BT-12"], [t.projekt, d.projekt, "BT-11"],
    [t.lieferschein, d.lieferschein, "BT-16"], [t.vergabe, d.vergabe, "BT-17"],
    ...d.vorherige.map(v => [t.vorherige, [v.nummer, datum(v.datum)].filter(Boolean).join(", "), "BG-3"]),
  ].filter(x => x[1]);
  const pos = d.positionen.map(p => {
    const unter = p.unter && p.unter.length ? p.unter.map(u => `<tr class="ewz-unter"><td>${esc(u.id)}</td><td>${esc(u.name)}</td><td class="ewz-z">${zahl(u.menge)}</td><td>${esc(einheit(u.einheit))}</td><td class="ewz-z">${geld(u.preis.netto, w)}</td><td class="ewz-z">${prozent(u.satz)}</td><td class="ewz-z">${geld(u.netto, w)}</td></tr>`).join("") : "";
    const details = [p.beschreibung, p.artikelnr ? `${lang === "en" ? "Item no." : "Art.-Nr."} ${p.artikelnr}` : "", p.notiz, p.zeitraum ? [datum(p.zeitraum.von), datum(p.zeitraum.bis)].filter(Boolean).join(" – ") : "",
      ...p.eigenschaften.map(x => `${x.name}: ${x.wert}`), ...p.zuschlaege.map(z => `${z.zuschlag ? t.zuschlag : t.nachlass}: ${geld(z.betrag, w)}${z.grund ? ` (${z.grund})` : ""}`)].filter(Boolean);
    return `<tr><td>${bt("BT-126", esc(p.id))}</td><td>${bt("BT-153", esc(p.name))}${details.length ? `<div class="ewz-klein">${details.map(esc).join("<br>")}</div>` : ""}</td><td class="ewz-z">${bt("BT-129", zahl(p.menge))}</td><td>${bt("BT-130", esc(einheit(p.einheit)))}</td><td class="ewz-z">${bt("BT-146", geld(p.preis.netto, w))}${p.preis.basis && p.preis.basis !== 1 ? `<div class="ewz-klein">/ ${zahl(p.preis.basis)} ${esc(einheit(p.preis.basisEinheit || p.einheit))}</div>` : ""}</td><td class="ewz-z">${bt("BT-152", prozent(p.satz))}${p.kategorie && p.kategorie !== "S" ? ` <abbr title="${esc((STEUERKATEGORIE[p.kategorie] || [p.kategorie])[lang === "en" ? 1 : 0])}">${esc(p.kategorie)}</abbr>` : ""}</td><td class="ewz-z">${bt("BT-131", geld(p.netto, w))}</td></tr>${unter}`;
  }).join("");
  const s = d.summen || {};
  const sz = (label, wert, id, stark) => wert == null ? "" : `<tr${stark ? ' class="ewz-stark"' : ""}><th scope="row">${label}</th><td class="ewz-z">${bt(id, geld(wert, w))}</td></tr>`;
  const doks = d.zuschlaege.map(z => `<tr><th scope="row">${z.zuschlag ? t.zuschlag : t.nachlass}${z.grund ? ` (${esc(z.grund)})` : ""}${z.prozent != null ? ` ${zahl(z.prozent, 2)} %` : ""}</th><td class="ewz-z">${z.zuschlag ? "" : "−"}${geld(z.betrag, w)}</td></tr>`).join("");
  const steuern = d.steuern.map(x => `<tr><td>${esc((STEUERKATEGORIE[x.kategorie] || [x.kategorie])[lang === "en" ? 1 : 0])}</td><td class="ewz-z">${prozent(x.satz)}</td><td class="ewz-z">${geld(x.basis, w)}</td><td class="ewz-z">${geld(x.betrag, w)}</td><td>${esc([x.grund, x.grundCode].filter(Boolean).join(" · "))}</td></tr>`).join("");
  const zahlarten = (d.zahlung || []).map(z => [liste(ZAHLUNGSARTEN, z.code) || z.text, ...z.konten.map(k => [k.inhaber, ibanLesbar(k.iban), k.bic].filter(Boolean).join(", ")), z.zweck ? `${t.zweck}: ${z.zweck}` : ""].filter(Boolean).join(" · "));
  return `<article class="ewz-blatt" aria-label="${esc(t.abschnittRechnung)}">
<header class="ewz-blatt-kopf">
${partei(d.verkaeufer, t.von, "BT-27")}
<div class="ewz-titel"><p class="ewz-art">${esc(liste(ARTEN, d.art) || (gutschrift ? t.gutschrift : t.rechnung))}${d.art && !ARTEN[d.art] ? ` (${esc(d.art)})` : ""}</p>
<dl>${kopfwerte.map(([k, v, id]) => `<dt>${k}</dt><dd>${bt(id, esc(v))}</dd>`).join("")}</dl></div>
</header>
<div class="ewz-blatt-parteien">${partei(d.kaeufer, t.an, "BT-44")}${d.lieferung && (d.lieferung.name || d.lieferung.anschrift) ? partei({ name: d.lieferung.name, anschrift: d.lieferung.anschrift }, t.lieferung, "BT-70") : ""}${d.zahlungsempfaenger && d.zahlungsempfaenger.name ? partei(d.zahlungsempfaenger, t.zahlungsempfaenger, "BT-59") : ""}</div>
${d.notizen.length ? `<div class="ewz-notizen"><p class="ewz-mini">${t.bemerkungen}</p>${d.notizen.map(n => `<p>${bt("BT-22", esc(n).replace(/\n/g, "<br>"))}</p>`).join("")}</div>` : ""}
<div class="ewz-tabelle" tabindex="0" role="group" aria-label="${esc(t.tabPositionen)}"><table class="ewz-pos"><thead><tr><th scope="col">${t.pos}</th><th scope="col">${t.artikel}</th><th scope="col" class="ewz-z">${t.menge}</th><th scope="col">${t.einheit}</th><th scope="col" class="ewz-z">${t.preis}</th><th scope="col" class="ewz-z">${t.ust}</th><th scope="col" class="ewz-z">${t.netto}</th></tr></thead><tbody>${pos}</tbody></table></div>
<div class="ewz-summen-reihe">
<table class="ewz-summen"><tbody>
${sz(t.summePos, s.positionen, "BT-106")}${doks}${sz(t.nettoGesamt, s.netto, "BT-109")}${sz(t.ustGesamt, s.steuer, "BT-110")}${sz(t.brutto, s.brutto, "BT-112")}${sz(t.gezahlt, s.gezahlt, "BT-113")}${sz(t.rundung, s.rundung, "BT-114")}${sz(t.zuZahlen, s.zahlbetrag, "BT-115", true)}
${s.steuerInSteuerwaehrung && s.steuerInSteuerwaehrung.wert != null ? `<tr><th scope="row">${t.ustGesamt} (${esc(s.steuerInSteuerwaehrung.waehrung || d.steuerwaehrung)})</th><td class="ewz-z">${geld(s.steuerInSteuerwaehrung.wert, s.steuerInSteuerwaehrung.waehrung || d.steuerwaehrung)}</td></tr>` : ""}
</tbody></table></div>
${steuern ? `<div class="ewz-tabelle" tabindex="0" role="group" aria-label="${esc(t.tabSteuer)}"><table class="ewz-steuer"><caption>${t.steuer}</caption><thead><tr><th scope="col">${t.kategorie}</th><th scope="col" class="ewz-z">${t.satz}</th><th scope="col" class="ewz-z">${t.basis}</th><th scope="col" class="ewz-z">${t.steuer}</th><th scope="col">${t.befreiung}</th></tr></thead><tbody>${steuern}</tbody></table></div>` : ""}
<div class="ewz-blatt-fuss">
${zahlarten.length ? `<p><span class="ewz-mini">${t.zahlungsart}</span><br>${zahlarten.map(esc).join("<br>")}</p>` : ""}
${d.bedingungen ? `<p><span class="ewz-mini">${t.bedingungen}</span><br>${bt("BT-20", bedingungenText(d.bedingungen, w))}</p>` : ""}
<p class="ewz-klein ewz-ansicht-hinweis">${esc(t.ansichtHinweis)} ${esc(e.name)}</p>
</div>
</article>`;
}

// ---------- Anhänge ----------
function anhaengeHtml(e) {
  const eigene = (e.daten && e.daten.anhaenge || []);
  const pdf = (e.pdf && e.pdf.anhaenge || []).filter(a => a.bytes);
  if (!eigene.length && !pdf.length) return "";
  const li = [
    ...eigene.map((a, i) => `<li><strong>${esc(a.datei && a.datei.name || a.id || "")}</strong>${a.beschreibung ? ` – ${esc(a.beschreibung)}` : ""}${a.datei && a.datei.base64 ? ` <button type="button" class="ewz-zweit" data-anhang="x${i}">${t.anhangLaden}</button>` : a.url ? ` <span class="ewz-klein">${t.anhangExtern}: ${esc(a.url)}</span>` : ""}</li>`),
    ...pdf.map((a, i) => `<li><strong>${esc(a.name || "Datei")}</strong>${a.beschreibung ? ` – ${esc(a.beschreibung)}` : ""} <button type="button" class="ewz-zweit" data-anhang="p${i}">${t.anhangLaden}</button></li>`),
  ];
  return `<ul class="ewz-anhaenge">${li.join("")}</ul>`;
}

// ---------- Karte je Datei ----------
function karte(e) {
  const rechnung = e.art === "rechnung" && e.daten && !e.daten.fehler;
  const abschnitt = (id, titel, inhalt, teil) => inhalt ? `<section class="ewz-teil" aria-labelledby="ewz-${id}${e.nr} ewz-dn${e.nr}"${teil ? ` data-teil="${teil}"` : ""}><h3 id="ewz-${id}${e.nr}">${titel}</h3>${inhalt}</section>` : "";
  return `<section class="ewz-karte" id="ewz-k${e.nr}" aria-labelledby="ewz-t${e.nr}" data-nr="${e.nr}">
<div class="ewz-karte-kopf"><h2 id="ewz-t${e.nr}"><span class="ewz-dateiname" id="ewz-dn${e.nr}">${esc(e.name)}</span> <span class="ewz-klein">${groesse(e.groesse)}</span></h2>
<div class="ewz-knoepfe">${rechnung ? `<button type="button" class="ewz-haupt" data-aktion="drucken">${t.drucken}</button><button type="button" class="ewz-zweit" data-aktion="bericht">${t.bericht}</button><label class="ewz-check"><input type="checkbox" data-aktion="bt"> ${t.btZeigen}</label>` : ""}<button type="button" class="ewz-zweit" data-aktion="entfernen" aria-label="${esc(`${t.schliessen}: ${e.name}`)}">${t.schliessen}</button></div></div>
${antwortHtml(e)}
${rechnung ? abschnitt("z", t.abschnittZahlen, zahlenHtml(e)) : ""}
${abschnitt("b", t.abschnittBefunde, e.pruefung.status === "keine" ? "" : befundeHtml(e), "befunde")}
${rechnung ? abschnitt("r", t.abschnittRechnung, ansichtHtml(e)) : ""}
${abschnitt("a", t.abschnittAnhaenge, anhaengeHtml(e))}
${e.art === "rechnung" ? `<p class="ewz-aufbewahren">${esc(ZUSATZ.aufbewahren[lang])}</p>${quellenHtml(ZUSATZ.aufbewahren.quellen)}` : ""}
</section>`;
}
function teilZeichnen(e) {
  const k = document.getElementById(`ewz-k${e.nr}`);
  if (!k) return;
  const alt = k.querySelector("[data-teil=antwort]");
  if (alt) alt.outerHTML = antwortHtml(e);
  const b = k.querySelector("[data-teil=befunde]");
  if (b) b.innerHTML = `<h3 id="ewz-b${e.nr}">${t.abschnittBefunde}</h3>${befundeHtml(e)}`;
}
function uebersichtZeichnen() {
  if (eintraege.length < 2) { uebersicht.innerHTML = ""; return; }
  const zeile = e => {
    const a = antwort(e), z = e.pruefung.status === "fertig" ? zaehlen(e) : null;
    const urteil = a ? (a.urteil === "ja" ? t.ja : a.urteil === "nein" ? t.nein : t.eingeschraenkt) : "–";
    const bef = e.pruefung.status === "keine" ? "–" : z ? (t.zaehler(z.fehler, z.warnung, z.hinweis) || t.keineFehler) : t.prueftLaeuft;
    const zb = e.daten && e.daten.summen ? geld(e.daten.summen.zahlbetrag, e.daten.waehrung) : "";
    return `<tr><td><a href="#ewz-k${e.nr}">${esc(e.name)}</a></td><td>${urteil}</td><td>${esc(bef)}</td><td class="ewz-z">${zb}</td></tr>`;
  };
  uebersicht.innerHTML = `<section class="ewz-uebersicht" aria-labelledby="ewz-ue"><div class="ewz-karte-kopf"><h2 id="ewz-ue">${t.uebersicht}</h2><div class="ewz-knoepfe"><button type="button" class="ewz-zweit" data-aktion="alle-entfernen">${t.alleEntfernen}</button></div></div>
<div class="ewz-tabelle" tabindex="0" role="group" aria-label="${esc(t.uebersicht)}"><table><thead><tr><th scope="col">${t.datei}</th><th scope="col">${t.eRechnung}</th><th scope="col">${t.befunde}</th><th scope="col" class="ewz-z">${t.zahlbetrag}</th></tr></thead><tbody>${eintraege.map(zeile).join("")}</tbody></table></div></section>`;
}

// ---------- Druck und Bericht ----------
function drucken(e) {
  const k = document.getElementById(`ewz-k${e.nr}`);
  const blatt = k.querySelector(".ewz-blatt");
  const antwortBox = k.querySelector("[data-teil=antwort]");
  const bef = k.querySelector("[data-teil=befunde]");
  const huelle = document.createElement("div");
  huelle.id = "ewz-druck";
  huelle.className = "ewz-druck" + (k.classList.contains("ewz-mit-bt") ? " ewz-mit-bt" : "");
  huelle.innerHTML = (blatt ? blatt.outerHTML : "") + (antwortBox ? `<div class="ewz-druck-pruefung">${antwortBox.outerHTML}${bef ? bef.outerHTML : ""}</div>` : "");
  huelle.querySelectorAll("details").forEach(d => d.setAttribute("open", ""));
  huelle.querySelectorAll("[hidden]").forEach(x => x.removeAttribute("hidden"));
  huelle.querySelectorAll("button").forEach(x => x.remove());
  document.body.appendChild(huelle);
  document.body.classList.add("ewz-druckt");
  const weg = () => { document.body.classList.remove("ewz-druckt"); huelle.remove(); window.removeEventListener("afterprint", weg); };
  window.addEventListener("afterprint", weg);
  window.print();
  setTimeout(() => { if (document.body.contains(huelle) && !matchMedia("print").matches) weg(); }, 1500);
}
function speichern(name, inhalt, typ) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.style.display = "none";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function bericht(e) {
  const k = document.getElementById(`ewz-k${e.nr}`);
  const css = `body{font:14px/1.5 Helvetica,Arial,sans-serif;color:#1f1f1f;max-width:900px;margin:32px auto;padding:0 20px}h1{font-size:22px}h2,h3{font-size:16px;margin:22px 0 6px}.ewz-befund{border-left:3px solid #999;padding:4px 10px;margin:8px 0;list-style:none}.ewz-fehler{border-color:#b42318}.ewz-warnung{border-color:#b26b00}.ewz-hinweis{border-color:#6b7280}code{font-size:12px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:4px;text-align:left}.ewz-z{text-align:right}a{color:#4c1d95}`;
  const teile = k.cloneNode(true);
  teile.querySelectorAll("button,.ewz-knoepfe,.ewz-qr").forEach(x => x.remove());
  teile.querySelectorAll("details").forEach(d => d.setAttribute("open", ""));
  teile.querySelectorAll("[hidden]").forEach(x => x.removeAttribute("hidden"));
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(lang === "en" ? "Check report" : "Prüfbericht")} – ${esc(e.name)}</title><style>${css}</style></head><body>
<h1>${esc(lang === "en" ? "Check report" : "Prüfbericht")}: ${esc(e.name)}</h1>
<p>${esc(lang === "en" ? "Created" : "Erstellt")}: ${new Date().toLocaleString(L)} · SmartFormular E-Rechnung lite ${esc(FASSUNG)} · ${esc(lang === "en" ? "Rule set" : "Prüfregeln")}: ${esc(META.quelle)}</p>
${teile.innerHTML}</body></html>`;
  speichern(`${lang === "en" ? "Check-report" : "Pruefbericht"}-${(e.daten && e.daten.nummer || e.name).replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 60)}.html`, html, "text/html;charset=utf-8");
}
function anhangSpeichern(e, key) {
  if (key[0] === "x") {
    const a = e.daten.anhaenge[+key.slice(1)];
    const bin = atob(a.datei.base64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    speichern(a.datei.name || `${a.id || "Anhang"}`, u, a.datei.mime || "application/octet-stream");
  } else {
    const a = e.pdf.anhaenge.filter(x => x.bytes)[+key.slice(1)];
    speichern(a.name || "Anhang", a.bytes, a.mime || "application/octet-stream");
  }
}

// ---------- Ereignisse ----------
const ablage = document.getElementById("ewz-ablage"), eingabe = document.getElementById("ewz-datei");
eingabe.addEventListener("change", () => { annehmen(eingabe.files); eingabe.value = ""; });
for (const z of [ablage, wurzel]) {
  z.addEventListener("dragover", ev => { ev.preventDefault(); ablage.classList.add("ewz-drueber"); });
  z.addEventListener("dragleave", ev => { if (!z.contains(ev.relatedTarget)) ablage.classList.remove("ewz-drueber"); });
  z.addEventListener("drop", ev => { ev.preventDefault(); ablage.classList.remove("ewz-drueber"); if (ev.dataTransfer && ev.dataTransfer.files.length) annehmen(ev.dataTransfer.files); });
}
wurzel.addEventListener("click", async ev => {
  const el = ev.target.closest("button, a, input");
  if (!el) return;
  const k = el.closest(".ewz-karte"), e = k ? eintraege.find(x => x.nr === +k.dataset.nr) : null;
  if (el.dataset.beispiel) {
    const name = el.dataset.beispiel === "zugferd" ? (lang === "en" ? "ZUGFeRD-example.pdf" : "ZUGFeRD-Beispiel.pdf") : (lang === "en" ? "XRechnung-example.xml" : "XRechnung-Beispiel.xml");
    const eingebettet = window.RV_BEISPIELE && window.RV_BEISPIELE[el.dataset.beispiel];
    try {
      const daten = eingebettet ? Uint8Array.from(atob(eingebettet), c => c.charCodeAt(0)) : new Uint8Array(await (await fetch(`${basis}beispiele/${el.dataset.beispiel === "zugferd" ? "zugferd.pdf" : "xrechnung.xml"}?v=${FASSUNG}`, { credentials: "omit" })).arrayBuffer());
      annehmen([new File([daten], name, { type: el.dataset.beispiel === "zugferd" ? "application/pdf" : "application/xml" })]);
    } catch { sagen(lang === "en" ? "The example could not be loaded." : "Das Beispiel ließ sich nicht laden."); }
    return;
  }
  if (el.dataset.kopie != null) {
    const ok = () => { const alt = el.textContent; el.textContent = t.kopiert; sagen(`${t.kopiert}: ${el.dataset.kopie}`); setTimeout(() => { el.textContent = alt; }, 1600); };
    try { await navigator.clipboard.writeText(el.dataset.kopie); ok(); }
    catch { const f = document.createElement("textarea"); f.value = el.dataset.kopie; document.body.appendChild(f); f.select(); try { document.execCommand("copy"); ok(); } finally { f.remove(); } }
    return;
  }
  if (el.dataset.anhang && e) { anhangSpeichern(e, el.dataset.anhang); return; }
  switch (el.dataset.aktion) {
    case "drucken": if (e) drucken(e); break;
    case "bericht": if (e) bericht(e); break;
    case "bt": if (k) k.classList.toggle("ewz-mit-bt", el.checked); break;
    case "mehr": {
      const auf = el.getAttribute("aria-expanded") !== "true";
      el.closest("section").querySelectorAll("[data-mehr]").forEach(x => { x.hidden = !auf; });
      el.setAttribute("aria-expanded", String(auf));
      el.textContent = auf ? t.wenigerAnzeigen : ersetze(t.mehrAnzeigen, { n: el.dataset.n });
      break;
    }
    case "entfernen": if (e) { eintraege.splice(eintraege.indexOf(e), 1); k.remove(); uebersichtZeichnen(); eingabe.focus(); } break;
    case "alle-entfernen": eintraege.length = 0; ergebnisse.innerHTML = ""; uebersichtZeichnen(); eingabe.focus(); break;
  }
});
// Für Tests: Zustand lesbar machen (keine Daten nach außen)
window.RVErechnung = { eintraege, fertig: () => warteschlange, fassung: FASSUNG };
