// SmartFormular E-Rechnung lite – Reiter „Erstellen“: eigene E-Rechnung (XRechnung 3.0, UBL) schreiben. Einmal die Firmendaten (nur
// im Gerät gespeichert), dann drei Schritte: Empfänger und Leistung, Positionen, Prüfen und speichern. Die Maske prüft beim Tippen
// (maske.js), die Vorschau zeigt genau das, was in der Datei steht (dieselbe Lesestrecke wie beim Prüfen), und vor dem Speichern
// läuft der eigene Prüfkern mit den offiziellen Regeln: Mit Fehlern wird nicht gespeichert. Kein Archiv – die XML-Datei ist das Original.
// Prüfkern, Ansicht, Befunde, GiroCode, Druck und Speichern kommen aus app.js (ctx), damit beide Reiter dasselbe zeigen.
// Eine bestehende Rechnung (Word, PDF, Excel, Text oder XML) lässt sich übernehmen: gelesen nur im Browser (einlesen.js, erkennen.js),
// danach steht sie in der Maske zum Prüfen; ihre Summe wird mit der des Dokuments verglichen.
// Dazu, nur bei Bedarf sichtbar: Rechnungsarten (Abschlag, Dauer, Storno), eine frühere Rechnung als Vorlage (vorlage.js) und gemerkte
// Empfänger und Positionen mit Vorschlägen beim Tippen, CSV und einer Sicherung aller lokalen Daten (stamm.js, csv.js).
import { ZUSATZ, Q, STAND_ERSTELLEN } from "./recht.js";
import { EINHEITEN, EINHEITEN_ERSTELLEN, BEFREIUNGEN } from "./texte.js";
import { dateiLesen } from "./lesen.js";
import { ublSchreiben, dateiName, KLEIN, faelligkeiten, ersterZeitraum } from "./erzeugen.js";
import { summen, geldAnzeige, datumGueltig, datumPlus, kleinFuer } from "./rechnen.js";
import { ARTEN, TURNUS, GRENZEN, listeLesen, listeSichern, schreibFehler, rechnungenLesen, empfaengerMerken, katalogMerken, rechnungMerken, vorschlaege, empfaengerBereinigen, katalogBereinigen,
  empfaengerSchluessel, katalogSchluessel, preisFest, preisFuer, alleExport, alleImport, stammLoeschen, falten } from "./stamm.js";
import { csvLesen, csvSchreiben } from "./csv.js";
import { rechnungAusDaten, folgeRechnung, stornoRechnung, spracheWechseln } from "./vorlage.js";
import { maskePruefen, naechsteNummer, nummerSpaeter, speichernErlaubt } from "./maske.js";
import { firmaLeer, firmaBereinigen, firmaLesen, firmaSichern, firmaLoeschen, nummerLesen, nummerMerken, firmaExport, firmaImport, speicherDa } from "./firma.js";
import { maskenfeld } from "./regeltexte.js";
import { dokumentLesen } from "./einlesen.js";
import { rechnungErkennen, firmaErgaenzen } from "./erkennen.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ersetze = (s, w) => s.replace(/\{(\w+)\}/g, (_, k) => w[k] ?? "");
const pause = () => new Promise(r => setTimeout(r, 0));
const heute = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const domId = feld => `ewe-${feld.replace(/\./g, "-")}`;
const LAENDER = ["DE", "AT", "CH", "BE", "NL", "LU", "FR", "IT", "ES", "PL", "CZ", "DK", "SE", "GB", "US"];
const FIRMA_FELDER = ["firma.name", "firma.handelsname", "firma.strasse", "firma.zusatz", "firma.plz", "firma.ort", "firma.steuernummer", "firma.ustid", "firma.register",
  "firma.kontakt.name", "firma.kontakt.telefon", "firma.kontakt.email", "firma.bank.iban", "firma.bank.bic", "firma.bank.inhaber"];

export function erstellenStarten(ctx) {
  const { wurzel, lang, t } = ctx, E = t.erstellen, L = lang === "en" ? 1 : 0;
  const quellenHtml = keys => keys.length ? `<p class="ewz-quellen">${t.quellen}: ${keys.map(k => `<a href="${esc(Q[k][2])}" target="_blank" rel="noopener">${esc(Q[k][L])}</a>`).join("; ")}.</p>` : "";
  const datumAnzeige = s => { if (!datumGueltig(s)) return s || ""; const [j, m, d] = s.split("-"); return lang === "en" ? new Date(Date.UTC(+j, +m - 1, +d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : `${d}.${m}.${j}`; };
  let landNamen = null;
  const landName = c => { try { landNamen ||= new Intl.DisplayNames([lang === "en" ? "en-GB" : "de-DE"], { type: "region" }); return landNamen.of(c) || c; } catch { return c; } };

  // ---------- Zustand ----------
  const gespeichert = firmaLesen();
  const neuePosition = f => ({ name: "", beschreibung: "", menge: "1", einheit: f.vorgaben.einheit || "C62", preis: "", steuer: f.kleinunternehmer ? "E" : f.vorgaben.satz || "S19", artikelnr: "" });
  const neueRechnung = (f, letzte, ziel) => ({ sprache: lang, art: "rechnung", nummer: naechsteNummer(letzte && letzte.letzte, heute()), datum: heute(),
    leistung: { art: "datum", datum: heute(), von: "", bis: "" },
    empfaenger: { name: "", strasse: "", zusatz: "", plz: "", ort: "", land: "DE", ustid: "", email: "", behoerde: false, referenz: "" },
    positionen: [neuePosition(f)], befreiung: { wahl: "", text: "" }, nullsatz: false, zielTage: String(ziel ?? f.vorgaben.zielTage), zweck: "", bemerkung: "",
    bezug: "", storno: { nummer: "", datum: "" }, dauer: { turnus: "monat", tag: "1" } });
  const z = { firma: gespeichert || firmaLeer(), letzte: nummerLesen(), rechnung: null, meldungen: [], beruehrt: new Set(), alleZeigen: false, probe: false, sicherung: null,
    pruefung: null, geprueft: null, gespeichert: null, entfernt: null, geloescht: null, vorschauAuf: false, speicherDa: speicherDa(),
    // Gemerkt im Gerät (stamm.js); Tafeln „Aus früherer Rechnung“ und „Empfänger und Katalog“ nur auf Wunsch offen
    empfaenger: listeLesen("empfaenger"), katalog: listeLesen("katalog"), rechnungen: rechnungenLesen(), artOffen: false, vorlageOffen: false, vorlageDatei: null,
    stammOffen: false, filter: { empfaenger: "", katalog: "" }, bearbeiten: null, csv: null, stammWeg: null, alleWeg: null };
  z.rechnung = neueRechnung(z.firma, z.letzte);
  z.firmaOffen = !gespeichert || maskePruefen(z.firma, z.rechnung, lang).some(m => m.feld.startsWith("firma."));

  // Pfad im Modell: firma.kontakt.email → z.firma.kontakt, "email"; pos.2.menge → Position 3; sonst in der Rechnung
  function ort(feld) {
    const teile = feld.split(".");
    if (teile[0] === "pos") return [z.rechnung.positionen[+teile[1]], teile[2]];
    let o = teile[0] === "firma" ? z.firma : z.rechnung;
    for (const k of teile.slice(teile[0] === "firma" ? 1 : 0, -1)) o = o[k];
    return [o, teile[teile.length - 1]];
  }
  const wert = feld => { const [o, k] = ort(feld); return o ? o[k] : ""; };
  const label = feld => feld.startsWith("pos.") ? `${ersetze(E.posNr, { n: +feld.split(".")[1] + 1 })}: ${E.felder[`pos.${feld.split(".")[2]}`]}`
    : feld === "empfaenger.referenz" && z.rechnung.empfaenger.behoerde ? E.felder["empfaenger.leitweg"]
    : z.rechnung.art === "dauer" && feld === "leistung.von" ? E.dauerVon : z.rechnung.art === "dauer" && feld === "leistung.bis" ? E.dauerBis : E.felder[feld] || feld;

  // ---------- Bausteine ----------
  function feld(f, o = {}) {
    const id = domId(f), v = wert(f) ?? "", hilfe = o.hilfe ?? E.hilfe[f];
    const beschr = [hilfe ? `${id}-h` : "", `${id}-f`].filter(Boolean).join(" ");
    const attr = [`id="${id}"`, `data-feld="${f}"`, `aria-describedby="${beschr}"`, o.pflicht ? 'aria-required="true"' : "", o.auto ? `autocomplete="${o.auto}"` : 'autocomplete="off"',
      o.modus ? `inputmode="${o.modus}"` : "", o.max ? `maxlength="${o.max}"` : "", o.spell === false ? 'spellcheck="false"' : "",
      // Vorschläge aus gemerkten Daten: Kombinationsfeld mit Liste (ARIA 1.2), nur wenn es etwas zu zeigen gibt
      o.vorschlag ? `role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-liste" data-vorschlag="${o.vorschlag}"` : ""].filter(Boolean).join(" ");
    const eingabe = o.optionen
      ? `<select ${attr}>${o.optionen.map(([w, n]) => `<option value="${esc(w)}"${String(w) === String(v) ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>`
      : o.typ === "textarea" ? `<textarea ${attr} rows="2">${esc(v)}</textarea>` : `<input type="${o.typ || "text"}" ${attr} value="${esc(v)}">`
        + (o.vorschlag ? `<ul class="ewe-vorschlaege" id="${id}-liste" role="listbox" aria-label="${esc(E.vorschlaege)}" hidden></ul>` : "");
    return `<div class="ewe-feld${o.klasse ? " " + o.klasse : ""}${o.vorschlag ? " ewe-kombi" : ""}"><label for="${id}">${f.startsWith("pos.") ? `<span class="ewe-sr">${esc(ersetze(E.posNr, { n: +f.split(".")[1] + 1 }))}: </span>` : ""}${esc(o.label || (f.startsWith("pos.") ? E.felder[`pos.${f.split(".")[2]}`] : label(f)))}${o.pflicht ? '<span class="ewe-pflicht" aria-hidden="true"> *</span>' : ""}</label>${eingabe}
${hilfe ? `<p class="ewe-hilfe" id="${id}-h">${esc(hilfe)}</p>` : ""}<p class="ewe-fehler" id="${id}-f" hidden></p></div>`;
  }
  const knopf = (e, text, art = "ewz-zweit", extra = "") => `<button type="button" class="${art}" data-e="${e}"${extra}>${esc(text)}</button>`;
  const abschnitt = (n, id, titel, inhalt) => `<section class="ewz-abschnitt ewe-schritt" aria-labelledby="${id}"><div class="ewz-n" aria-hidden="true">${n}</div><div class="ewz-inhalt">
<span class="ewz-label">${esc(E.schritt)} ${+n}</span><h2 id="${id}">${esc(titel)}</h2>${inhalt}</div></section>`;

  // ---------- Gerüst ----------
  wurzel.innerHTML = `<div class="ewe">
<div class="ewe-start"><p class="ewe-lead">${esc(E.lead)}</p><p class="ewe-knoepfe">${knopf("einlesen", E.einlesen, "ewz-zweit", ' aria-describedby="ewe-einlesen-h"')}${knopf("probe", E.probe)}${knopf("vorlage-auf", E.vorlageAuf, "ewz-zweit", ' aria-expanded="false" aria-controls="ewe-vorlage"')}${knopf("stamm-auf", E.stammAuf, "ewz-zweit", ' aria-expanded="false" aria-controls="ewe-stamm"')}</p>
<p class="ewz-klein ewe-einlesen-hilfe" id="ewe-einlesen-h">${esc(E.einlesenHilfe)}</p>
<div id="ewe-einlesen"></div><div id="ewe-probe"></div><div id="ewe-vorlage" hidden></div><div id="ewe-stamm" hidden></div></div>
<div class="ewe-raster">
<div class="ewe-eingabe">
<section class="ewz-abschnitt ewe-firma" aria-labelledby="ewe-hf"><div class="ewz-n ewe-n-leer" aria-hidden="true"></div><div class="ewz-inhalt" id="ewe-firma"></div></section>
${abschnitt("01", "ewe-h1", E.schrittE1, `<div id="ewe-s1"></div>`)}
${abschnitt("02", "ewe-h2", E.schrittE2, `<div id="ewe-s2"></div>`)}
${abschnitt("03", "ewe-h3", E.schrittE3, `<div id="ewe-s3"></div>`)}
<div class="ewe-aktion" id="ewe-aktion"></div>
</div>
<aside class="ewe-vorschau" id="ewe-vorschau" aria-labelledby="ewe-hv">
<div class="ewe-vorschau-kopf"><h2 id="ewe-hv">${esc(E.vorschau)}</h2><button type="button" class="ewz-zweit ewe-nur-handy" data-e="vorschau" aria-expanded="false" aria-controls="ewe-vorschau-inhalt">${esc(E.vorschauZeigen)}</button></div>
<div class="ewe-vorschau-inhalt" id="ewe-vorschau-inhalt"><p class="ewz-klein">${esc(E.vorschauHinweis)}</p><div id="ewe-blatt"><p class="ewz-klein">${esc(E.vorschauLeer)}</p></div><div id="ewe-giro"></div></div>
</aside>
</div>
<p class="ewe-status" id="ewe-status" role="status" aria-live="polite"></p>
<input type="file" id="ewe-import-datei" accept=".json,application/json" hidden>
<input type="file" id="ewe-vorlage-eingabe" accept=".xml,.pdf,.docx,.odt,.xlsx,.txt,application/xml,text/xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain" hidden><input type="file" id="ewe-einlesen-eingabe" accept=".xml,.pdf,.docx,.odt,.xlsx,.txt,application/xml,text/xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain" hidden><input type="file" id="ewe-csv-eingabe" accept=".csv,text/csv,text/plain" hidden>
<input type="file" id="ewe-alle-eingabe" accept=".json,application/json" hidden>
</div>`;
  const $ = id => document.getElementById(id);
  // Scheiterte seit der letzten Meldung ein Schreiben in den Speicher des Browsers (voll), steht das deutlich mit in der Meldung
  const vollText = () => schreibFehler() && z.speicherDa ? `<strong class="ewe-warn">${esc(E.speicherVoll)}</strong>` : "";
  const status = (html) => { const v = vollText(); $("ewe-status").innerHTML = [html, v].filter(Boolean).join(" "); };

  // ---------- Ihre Firmendaten ----------
  function firmaZeichnen() {
    const f = z.firma, box = $("ewe-firma");
    if (!z.firmaOffen) {
      box.innerHTML = `<p class="ewe-firma-zeile"><span class="ewz-mini" id="ewe-hf">${esc(E.firmaVon)}</span> <strong>${esc(f.name)}</strong>${f.kleinunternehmer ? ` · <span class="ewz-klein">${esc(E.steuer.K)}</span>` : ""} · ${knopf("firma-auf", E.aendern, "ewe-link", ` aria-label="${esc(`${E.firmaT}: ${E.aendern}`)}"`)}</p>`;
      return;
    }
    const gruppe = (titel, inhalt) => `<fieldset class="ewe-gruppe"><legend>${esc(titel)}</legend><div class="ewe-felder">${inhalt}</div></fieldset>`;
    box.innerHTML = `<h2 id="ewe-hf">${esc(E.firmaT)}</h2><p class="ewz-klein">${esc(E.firmaLokal)}${z.probe ? "" : ` ${esc(E.lagerHinweis)}`}</p>
${!z.speicherDa ? `<p class="ewe-hinweis">${esc(E.speicherFehlt)}</p>` : location.protocol === "file:" ? `<p class="ewz-klein">${esc(E.speicherDatei)}</p>` : ""}
${gruppe(E.firmaGruppen.firma, feld("firma.name", { pflicht: true, auto: "organization", klasse: "ewe-breit" }) + feld("firma.handelsname", { klasse: "ewe-breit" })
  + feld("firma.strasse", { pflicht: true, auto: "address-line1", klasse: "ewe-breit" }) + feld("firma.zusatz", { auto: "address-line2", klasse: "ewe-breit" })
  + feld("firma.plz", { pflicht: true, auto: "postal-code", modus: "numeric", max: 5 }) + feld("firma.ort", { pflicht: true, auto: "address-level2" }))}
${gruppe(E.firmaGruppen.steuer, feld("firma.steuernummer", { klasse: "ewe-breit", spell: false }) + feld("firma.ustid", { spell: false }) + feld("firma.register")
  + `<div class="ewe-feld ewe-breit"><label class="ewz-check ewe-check"><input type="checkbox" id="ewe-firma-kleinunternehmer" data-feld="firma.kleinunternehmer" aria-describedby="ewe-klein-h"${f.kleinunternehmer ? " checked" : ""}> ${esc(E.klein)}</label>
<p class="ewe-hilfe" id="ewe-klein-h">${esc(E.klein19)}</p>${quellenHtml(ZUSATZ.klein.quellen)}</div>`)}
${gruppe(E.firmaGruppen.kontakt, feld("firma.kontakt.name", { pflicht: true, auto: "name" }) + feld("firma.kontakt.telefon", { pflicht: true, typ: "tel", auto: "tel" })
  + feld("firma.kontakt.email", { pflicht: true, typ: "email", auto: "email", klasse: "ewe-breit", spell: false }))}
${gruppe(E.firmaGruppen.bank, feld("firma.bank.iban", { pflicht: true, klasse: "ewe-breit", spell: false, max: 42 }) + feld("firma.bank.bic", { spell: false, max: 14 }) + feld("firma.bank.inhaber"))}
<p class="ewz-klein"><span aria-hidden="true">*</span> ${lang === "en" ? "required" : "Pflichtangabe"}</p>
<div class="ewe-knoepfe">${knopf("firma-weiter", E.weiter, "ewz-haupt")}${z.probe ? "" : knopf("firma-export", E.firmaExport) + knopf("firma-import", E.firmaImport) + knopf("firma-loeschen", E.firmaLoeschen)}</div>`;
  }

  // ---------- 01 Empfänger und Leistung ----------
  function schritt1Zeichnen() {
    const r = z.rechnung, em = r.empfaenger, l = r.leistung;
    const laender = [...new Set([...LAENDER, em.land])].map(c => [c, landName(c)]);
    const radio = (w, text) => `<label class="ewz-check ewe-check"><input type="radio" name="ewe-leistung-art" value="${w}" data-feld="leistung.art"${l.art === w ? " checked" : ""}> ${esc(text)}</label>`;
    const doppelt = istDoppelt(r.nummer), art = r.art || "rechnung";
    const artRadio = w => `<label class="ewz-check ewe-check ewe-art-wahl"><input type="radio" name="ewe-art" value="${w}" data-feld="art"${art === w ? " checked" : ""}> <span><strong>${esc(E.art.namen[w])}</strong> <span class="ewz-klein">– ${esc(E.art.kurz[w])}</span></span></label>`;
    // Rechnungsart: Vorgabe „Rechnung“, die anderen nur aufgeklappt
    const artBlock = `<details class="ewe-art" id="ewe-art"${z.artOffen || art !== "rechnung" ? " open" : ""}><summary>${esc(art === "rechnung" ? E.art.andere : ersetze(E.art.aktuell, { name: E.art.namen[art] }))}</summary>
<fieldset class="ewe-wahl ewe-art-liste"><legend class="ewe-sr">${esc(E.art.legende)}</legend>${ARTEN.map(artRadio).join("")}</fieldset></details>`;
    const artFelder = art === "abschlag" ? feld("bezug", { pflicht: true, klasse: "ewe-breit" })
      : art === "storno" ? feld("storno.nummer", { pflicht: true, spell: false }) + feld("storno.datum", { pflicht: true, typ: "date" })
      : art === "dauer" ? feld("dauer.turnus", { optionen: TURNUS.map(t => [t, E.turnus[t]]) }) + feld("dauer.tag", { pflicht: true, modus: "numeric", max: 2 })
        + `<p class="ewe-feld ewe-breit ewz-klein" id="ewe-dauer-text" aria-live="polite"></p>` : "";
    const artHinweis = art === "abschlag" ? [E.abschlagHinweis, ["ustg145"]] : art === "storno" ? [E.stornoHinweis, ["rn20"]] : art === "dauer" ? [E.dauerHinweis, ["dauer"]] : null;
    const leistung = art === "dauer"
      ? `<fieldset class="ewe-feld ewe-breit ewe-wahl"><legend>${esc(E.dauerLaufzeit)}</legend><div class="ewe-felder">${feld("leistung.von", { pflicht: true, typ: "date", label: E.dauerVon })}${feld("leistung.bis", { pflicht: true, typ: "date", label: E.dauerBis })}</div></fieldset>`
      : `<fieldset class="ewe-feld ewe-breit ewe-wahl"><legend>${esc(E.leistungArt)}</legend>${radio("datum", E.leistungDatum)}${radio("zeitraum", E.leistungZeitraum)}</fieldset>
${l.art === "zeitraum" ? feld("leistung.von", { pflicht: true, typ: "date" }) + feld("leistung.bis", { pflicht: true, typ: "date" }) : feld("leistung.datum", { pflicht: true, typ: "date" })}`;
    $("ewe-s1").innerHTML = `${artBlock}
${artHinweis ? `<div class="ewe-hinweis ewe-art-hinweis"><p>${esc(artHinweis[0])}</p>${quellenHtml(artHinweis[1])}</div>` : ""}
<div class="ewe-felder">
${feld("empfaenger.name", { pflicht: true, klasse: "ewe-breit", vorschlag: z.probe ? "" : "empfaenger" })}
${feld("empfaenger.strasse", { pflicht: true, klasse: "ewe-breit" })}${feld("empfaenger.zusatz", { klasse: "ewe-breit" })}
${feld("empfaenger.plz", { pflicht: true, modus: em.land === "DE" ? "numeric" : "", max: 10 })}${feld("empfaenger.ort", { pflicht: true })}
${feld("empfaenger.land", { pflicht: true, optionen: laender })}
<div class="ewe-feld ewe-breit"><label class="ewz-check ewe-check"><input type="checkbox" id="ewe-empfaenger-behoerde" data-feld="empfaenger.behoerde"${em.behoerde ? " checked" : ""}> ${esc(E.felder["empfaenger.behoerde"])}</label></div>
${em.behoerde ? feld("empfaenger.referenz", { pflicht: true, klasse: "ewe-breit", hilfe: E.hilfe["empfaenger.leitweg"], spell: false }) : ""}
${feld("empfaenger.email", { pflicht: !em.behoerde, typ: "email", klasse: "ewe-breit", spell: false })}
${em.behoerde ? "" : feld("empfaenger.referenz", { klasse: "ewe-breit" })}
${feld("empfaenger.ustid", { spell: false })}
</div>
${em.land !== "DE" ? `<p class="ewe-hinweis">${esc(E.auslandHinweis)}</p>` : ""}
<div class="ewe-felder ewe-abstand">
${feld("nummer", { pflicht: true, klasse: "ewe-breit", spell: false, hilfe: doppelt ? E.doppelt : E.hilfe.nummer })}
${feld("datum", { pflicht: true, typ: "date" })}
${artFelder}
${leistung}
</div>`;
    if (doppelt) $(`${domId("nummer")}-h`).classList.add("ewe-warn");
    $("ewe-art").addEventListener("toggle", ev => { z.artOffen = ev.target.open; });
  }
  // Schon gespeicherte Nummer? (nur die zuletzt gemerkte; im Beispiel nie)
  const istDoppelt = nummer => !z.probe && !!z.letzte && !!z.letzte.letzte && String(nummer || "").trim() === z.letzte.letzte;
  function nummerHinweis() {
    const h = $(`${domId("nummer")}-h`), doppelt = istDoppelt(z.rechnung.nummer);
    if (h) { h.textContent = doppelt ? E.doppelt : E.hilfe.nummer; h.classList.toggle("ewe-warn", doppelt); }
  }

  // ---------- 02 Positionen ----------
  const steuerOptionen = () => ["S19", "S7", "Z", "E"].map(c => [c, E.steuer[c]]);
  const einheiten = EINHEITEN_ERSTELLEN.map(c => [c, EINHEITEN[c][L]]);
  function schritt2Zeichnen() {
    const r = z.rechnung, f = z.firma, ku = kleinFuer(r, f);
    const zeile = (p, i) => `<li class="ewe-zeile" data-i="${i}">
<p class="ewe-zeile-kopf"><span class="ewe-zeile-nr">${esc(ersetze(E.posNr, { n: i + 1 }))}</span><span class="ewe-zeile-knoepfe">${z.probe ? "" : knopf("pos-katalog", E.inKatalog, "ewe-link", ` data-i="${i}" aria-label="${esc(ersetze(E.inKatalogName, { n: i + 1 }))}"`)}${knopf("pos-weg", E.posEntfernen, "ewe-link", ` data-i="${i}" aria-label="${esc(ersetze(E.posEntfernenName, { n: i + 1 }))}"`)}</span></p>
<div class="ewe-zeile-felder">
${feld(`pos.${i}.name`, { pflicht: true, klasse: "ewe-p-name", vorschlag: z.probe ? "" : "katalog" })}
${feld(`pos.${i}.menge`, { pflicht: true, modus: "decimal", klasse: "ewe-p-zahl" })}
${feld(`pos.${i}.einheit`, { optionen: einheiten, klasse: "ewe-p-einheit" })}
${feld(`pos.${i}.preis`, { pflicht: true, modus: "decimal", klasse: "ewe-p-zahl", label: E.preisKurz })}
${ku ? `<div class="ewe-feld ewe-p-steuer"><span class="ewe-label-fest">${esc(E.felder["pos.steuer"])}</span><p class="ewe-fest">${esc(E.steuer.K)}</p></div>` : feld(`pos.${i}.steuer`, { optionen: steuerOptionen(), klasse: "ewe-p-steuer" })}
${feld(`pos.${i}.beschreibung`, { typ: "textarea", klasse: "ewe-p-beschr" })}
${p.artikelnr ? feld(`pos.${i}.artikelnr`, { klasse: "ewe-p-zahl", spell: false, max: 60 }) : ""}
<div class="ewe-feld ewe-p-netto"><span class="ewe-label-fest">${esc(E.posNetto)}</span><output class="ewe-netto ewz-z" id="ewe-pos-${i}-netto" for="${domId(`pos.${i}.menge`)} ${domId(`pos.${i}.preis`)}"></output></div>
</div></li>`;
    const mitE = !ku && r.positionen.some(p => p.steuer === "E"), mitZ = !ku && r.positionen.some(p => p.steuer === "Z");
    const wahl = r.befreiung.wahl;
    $("ewe-s2").innerHTML = `${ku ? `<p class="ewe-hinweis">${esc(E.steuerGesperrt)}${lang === "en" ? ` ${esc(E.inDatei)}: <span lang="de">„${esc(KLEIN.hinweis)}“</span>` : ""}</p>` : ""}
<p class="ewe-fehler" id="ewe-pos-f" hidden></p>
<ol class="ewe-positionen" aria-label="${esc(E.schrittE2)}">${r.positionen.map(zeile).join("")}</ol>
<p>${knopf("pos-neu", `+ ${E.posHinzu}`)}</p>
${mitE ? `<div class="ewe-befreiung"><div class="ewe-felder">
${feld("befreiung.wahl", { pflicht: true, klasse: "ewe-breit", label: E.felder["befreiung.text"], hilfe: E.befreiungHinweis, optionen: [["", "–"], ...BEFREIUNGEN.map(b => [b.id, b.name[L]]), ["eigen", E.befreiungEigen]] })}
${wahl === "eigen" ? feld("befreiung.text", { pflicht: true, klasse: "ewe-breit", hilfe: "" }) : wahl && lang === "en" ? `<p class="ewz-klein ewe-breit">${esc(E.inDatei)}: <span lang="de">„${esc(r.befreiung.text)}“</span></p>` : ""}
</div>${quellenHtml(ZUSATZ.befreiung.quellen)}</div>` : ""}
${mitZ ? `<div class="ewe-hinweis"><p>${esc(E.nullHinweis)}</p><div class="ewe-feld"><label class="ewz-check ewe-check"><input type="checkbox" id="${domId("nullsatz")}" data-feld="nullsatz" aria-required="true" aria-describedby="${domId("nullsatz")}-f"${r.nullsatz ? " checked" : ""}> ${esc(E.nullBestaetigen)}</label>
<p class="ewe-fehler" id="${domId("nullsatz")}-f" hidden></p></div></div>` : ""}
<div class="ewe-summen" id="ewe-summen"></div>`;
  }

  // ---------- 03 Prüfen und speichern ----------
  function schritt3Zeichnen() {
    const ohneZiel = ["storno", "dauer"].includes(z.rechnung.art);
    $("ewe-s3").innerHTML = `<div class="ewe-felder">
${ohneZiel ? "" : feld("zielTage", { pflicht: true, modus: "numeric", max: 3, hilfe: "" })}<p class="ewe-feld ewe-ziel-text ewz-klein${ohneZiel ? " ewe-breit" : ""}" id="ewe-ziel-text"></p>
${feld("zweck", { klasse: "ewe-breit", max: 140 })}
${feld("bemerkung", { typ: "textarea", klasse: "ewe-breit" })}
</div>
<div class="ewe-zusammen" id="ewe-zusammen"></div>
<div class="ewe-fehlend" id="ewe-fehlend"></div>
<section class="ewe-pruefung" id="ewe-pruefung" aria-labelledby="ewe-hp"><h3 id="ewe-hp">${esc(t.abschnittBefunde)}</h3><div id="ewe-pruef-inhalt"></div>
<p class="ewz-klein">${esc(ersetze(E.schema, { stand: datumAnzeige(ctx.stand) }))}</p></section>
<div class="ewe-archiv"><p>${esc(ZUSATZ.archiv[lang])}</p>${quellenHtml(ZUSATZ.archiv.quellen)}<p class="ewz-stand">${t.stand}: ${datumAnzeige(STAND_ERSTELLEN)}</p></div>
<div id="ewe-erfolg"></div>`;
  }
  function aktionZeichnen() {
    $("ewe-aktion").innerHTML = `<p class="ewe-aktion-betrag"><span class="ewz-mini">${esc(z.rechnung.art === "storno" ? E.betragStorno : E.zuZahlen)}</span> <strong id="ewe-zahlbetrag" class="ewz-z"></strong></p>
${knopf("speichern", E.speichernKnopf, "ewz-haupt ewe-speichern")}`;
  }
  function allesZeichnen() { einlesenZeichnen(); firmaZeichnen(); schritt1Zeichnen(); schritt2Zeichnen(); schritt3Zeichnen(); aktionZeichnen(); probeZeichnen(); vorlageZeichnen(); stammZeichnen(); aktualisieren(); }
  function probeZeichnen() {
    $("ewe-probe").innerHTML = z.probe ? `<p class="ewe-hinweis ewe-probe-hinweis">${esc(E.probeHinweis)} ${knopf("probe-ende", E.probeEnde)}</p>` : "";
    // Im Beispiel keine eigenen gemerkten Daten
    for (const e of ["einlesen", "probe", "vorlage-auf", "stamm-auf"]) wurzel.querySelector(`[data-e="${e}"]`).hidden = z.probe;
    $("ewe-einlesen-h").hidden = z.probe;
    if (z.probe) { z.vorlageOffen = false; z.stammOffen = false; }
  }
  // Nach jeder Änderung: Maske, Summen, Fehler am Feld, Vorschau und Prüfung planen
  function aktualisieren() {
    z.meldungen = maskePruefen(z.firma, z.rechnung, lang);
    if (z.einlesen) einlesenFehltZeichnen();
    fehlerZeigen();
    summenZeigen();
    vorschauPlanen();
    pruefungPlanen();
  }
  function fehlerZeigen() {
    const je = new Map();
    for (const m of z.meldungen) if (!je.has(m.feld)) je.set(m.feld, m.text);
    wurzel.querySelectorAll(".ewe-fehler").forEach(p => {
      const eingabe = $(p.id.slice(0, -2)), f = p.id === "ewe-pos-f" ? "pos" : eingabe && eingabe.dataset.feld;
      const passend = je.has(f) ? f : f === "befreiung.wahl" && je.has("befreiung.text") ? "befreiung.text" : null;
      const zeigen = !!passend && (z.alleZeigen || z.beruehrt.has(f));
      p.hidden = !zeigen; p.textContent = zeigen ? je.get(passend) : "";
      if (eingabe && eingabe.dataset.feld) { if (zeigen) eingabe.setAttribute("aria-invalid", "true"); else eingabe.removeAttribute("aria-invalid"); }
    });
    const liste = $("ewe-fehlend");
    if (!liste) return;
    const n = z.meldungen.length;
    liste.innerHTML = n && z.alleZeigen ? `<p class="ewe-gesperrt"><strong>${esc(n === 1 ? E.gesperrt1 : ersetze(E.gesperrt, { n }))}</strong></p><p class="ewz-klein">${esc(E.felderFehlen)}</p>
<ul>${z.meldungen.map(m => `<li><a href="#${domId(m.feld)}" data-zumfeld="${esc(m.feld)}">${esc(label(m.feld))}</a>: ${esc(m.text)}</li>`).join("")}</ul>` : "";
  }
  function summenZeigen() {
    const s = summen(z.rechnung, z.firma, lang);
    s.zeilen.forEach((x, i) => { const o = $(`ewe-pos-${i}-netto`); if (o) o.textContent = x.netto == null ? "–" : geldAnzeige(x.netto, lang); });
    const zeilen = [[E.summeNetto, s.netto], ...s.gruppen.map(g => [g.kategorie === "S" ? ersetze(E.ustSatz, { satz: String(g.satz) }) : `${E.steuer[s.klein ? "K" : g.kategorie]} (${geldAnzeige(g.basis, lang)})`, g.steuer])];
    const tab = $("ewe-summen");
    if (tab) tab.innerHTML = `<table class="ewe-summen-tab"><tbody>${zeilen.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td class="ewz-z">${geldAnzeige(v, lang)}</td></tr>`).join("")}
<tr class="ewe-stark"><th scope="row">${esc(E.zuZahlen)}</th><td class="ewz-z">${geldAnzeige(s.zahlbetrag, lang)}</td></tr></tbody></table>`;
    const r = z.rechnung, ziel = /^\d{1,3}$/.test(String(r.zielTage).trim()) ? +r.zielTage : null;
    const dauer = r.art === "dauer" ? faelligkeiten(r.leistung.von, r.leistung.bis, r.dauer.turnus, r.dauer.tag) : null;
    const ez = dauer && dauer.length ? ersterZeitraum(r.leistung.von, r.leistung.bis, r.dauer.turnus) : null;
    const dauerText = !dauer || !dauer.length ? "" : ersetze(dauer.length > 1 ? E.dauerFaellig : E.dauerFaellig1,
      { anzahl: String(dauer.length), betrag: geldAnzeige(s.zahlbetrag, lang), erste: datumAnzeige(dauer[0]), letzte: datumAnzeige(dauer[dauer.length - 1]) })
      + " " + ersetze(E.dauerErster, { von: datumAnzeige(ez.von), bis: datumAnzeige(ez.bis) });
    const faellig = r.art === "storno" ? "" : dauer ? dauer[0] || "" : datumGueltig(r.datum) && ziel != null ? datumPlus(r.datum, ziel) : "";
    const zt = $("ewe-ziel-text");
    if (zt) zt.textContent = r.art === "storno" ? "" : dauer ? dauerText : faellig ? (ziel ? ersetze(E.zahlbarBis, { datum: datumAnzeige(faellig) }) : E.zahlbarSofort) : "";
    const dt = $("ewe-dauer-text");
    if (dt) dt.textContent = dauerText;
    const zus = $("ewe-zusammen");
    if (zus) zus.innerHTML = `<p class="ewz-mini">${esc(r.art === "storno" ? E.betragStorno : E.zuZahlen)}</p><p class="ewe-gross ewz-z">${geldAnzeige(s.zahlbetrag, lang)}</p>
<p class="ewz-klein">${[r.empfaenger.name, r.nummer, faellig ? ersetze(E.faelligAm, { datum: datumAnzeige(faellig) }) : ""].filter(x => String(x).trim()).map(esc).join(" · ")}</p>`;
    const zb = $("ewe-zahlbetrag");
    if (zb) zb.textContent = geldAnzeige(s.zahlbetrag, lang);
  }

  // ---------- Vorschau: dieselbe Lesestrecke wie beim Prüfen ----------
  let vorschauUhr = 0, pruefUhr = 0, lauf = 0;
  const lesen = async xml => {
    const e = await dateiLesen(new File([xml], dateiName(z.rechnung.nummer), { type: "application/xml" }));
    if (e.daten && !e.daten.fehler) e.daten.sprache = lang;
    e.nr = 0;
    return e;
  };
  function vorschauPlanen() {
    clearTimeout(vorschauUhr);
    vorschauUhr = setTimeout(async () => {
      const xml = ublSchreiben(z.firma, z.rechnung);
      const e = await lesen(xml);
      if (e.art !== "rechnung") return;
      $("ewe-blatt").innerHTML = ctx.ansichtHtml(e);
      $("ewe-giro").innerHTML = `<div class="ewe-giro-teil"><h3>${esc(t.abschnittZahlen)}</h3>${ctx.zahlenHtml(e)}</div>`;
    }, 150);
  }

  // ---------- Prüfung mit dem Prüfkern ----------
  function pruefungPlanen() {
    clearTimeout(pruefUhr);
    lauf++;
    if (z.meldungen.length) { z.pruefung = null; pruefZeigen({ status: "wartet" }); return; }
    pruefZeigen({ status: "laeuft" });
    pruefUhr = setTimeout(() => { pruefenJetzt().catch(() => {}); }, 600);
  }
  async function pruefenJetzt() {
    const meinLauf = ++lauf;
    const xml = ublSchreiben(z.firma, z.rechnung), nummer = String(z.rechnung.nummer).trim(), datum = z.rechnung.datum;
    const e = await lesen(xml);
    e.pruefung = { status: "laeuft", befunde: [], fehler: [] };
    try {
      if (!window.RVPruefung) pruefZeigen({ status: "laedt" });
      const k = await ctx.kern();
      for (const id of e.format.saetze) {
        const v = await ctx.regelsatz(id);
        const { befunde, fehler } = await k.pruefen(k.fx, e.doc, v, { pause });
        for (const b of befunde) { b.satz = id; b.stufe = ctx.stufe(b, e.format.stufen); delete b.knoten; }
        e.pruefung.befunde.push(...befunde);
        e.pruefung.fehler.push(...fehler);
      }
      e.pruefung.status = "fertig";
    } catch (err) {
      e.pruefung.status = "fehler";
      e.pruefung.meldung = String(err && err.message || err);
    }
    if (meinLauf !== lauf) return null;
    z.pruefung = e.pruefung; z.geprueft = { xml, e, nummer, datum };
    pruefZeigen(e.pruefung, e);
    return z.geprueft;
  }
  function pruefZeigen(pr, e) {
    const box = $("ewe-pruef-inhalt");
    if (!box) return;
    const zeile = (klasse, text) => `<p class="ewz-pruefstand ${klasse}">${klasse === "ewe-laeuft" ? '<span class="ewz-spinner" aria-hidden="true"></span>' : ""}${esc(text)}</p>`;
    if (pr.status === "wartet") { box.innerHTML = zeile("", E.pruefWartet); return; }
    if (pr.status === "laeuft" || pr.status === "laedt") { box.innerHTML = zeile("ewe-laeuft", pr.status === "laedt" ? E.pruefLaedt : E.pruefLaeuft); return; }
    if (pr.status === "fehler") { box.innerHTML = zeile("ewz-rot", ersetze(E.pruefKaputt, { meldung: pr.meldung })); return; }
    const zz = ctx.zaehlen(e), ok = speichernErlaubt(pr);
    box.innerHTML = zeile(!ok ? "ewz-rot" : zz.warnung || zz.hinweis ? "ewz-gelb" : "ewz-gruen", !ok ? E.pruefFehler : zz.warnung ? E.pruefWarn : E.pruefOk)
      + (pr.befunde.length || pr.fehler.length ? ctx.befundeHtml(e, { eigene: true, zumFeld: maskenfeld }) : "");
  }

  // ---------- Speichern ----------
  let speichertGerade = false;
  async function speichernKlick(trotzDoppelt = false) {
    if (speichertGerade) return;
    z.alleZeigen = true;
    aktualisieren();
    const gesperrt = () => {
      if (!z.meldungen.length) return false;
      const n = z.meldungen.length;
      status(esc(n === 1 ? E.gesperrt1 : ersetze(E.gesperrt, { n })));
      zumFeld(z.meldungen[0].feld);
      return true;
    };
    if (gesperrt()) return;
    // Dieselbe Nummer noch einmal: nur nach ausdrücklicher Bestätigung (Rechnungsnummern nur einmal vergeben)
    if (!trotzDoppelt && istDoppelt(z.rechnung.nummer)) {
      status(`${esc(ersetze(E.doppeltFrage, { nummer: z.rechnung.nummer.trim() }))} ${knopf("speichern-doch", E.doppeltDoch, "ewe-link")}`);
      $("ewe-status").querySelector("button").focus();
      return;
    }
    const b = wurzel.querySelector('[data-e="speichern"]');
    b.setAttribute("aria-busy", "true");
    speichertGerade = true;
    clearTimeout(pruefUhr);
    // Ändert sich während der Prüfung etwas, verwirft pruefenJetzt das Ergebnis; vor dem nächsten Versuch zählt die Maske neu
    let r = null;
    for (let i = 0; i < 3 && !r; i++) {
      if (i) { aktualisieren(); clearTimeout(pruefUhr); if (z.meldungen.length) break; }
      r = await pruefenJetzt();
    }
    speichertGerade = false;
    b.removeAttribute("aria-busy");
    if (!r && gesperrt()) return;
    if (!r || !speichernErlaubt(r.e.pruefung)) {
      status(esc(r && r.e.pruefung.status === "fehler" ? ersetze(E.pruefKaputt, { meldung: r.e.pruefung.meldung }) : E.pruefFehler));
      $("ewe-hp").tabIndex = -1; $("ewe-hp").focus();
      return;
    }
    // Dateiname und gemerkte Nummer aus der geprüften Datei, nicht aus der Maske; eine ältere Nummer setzt den Zähler nicht zurück
    const nummer = r.nummer, datei = dateiName(nummer);
    ctx.speichern(datei, r.xml, "application/xml");
    if (!z.probe && nummerSpaeter(nummer, z.letzte && z.letzte.letzte)) { nummerMerken(nummer, r.datum); z.letzte = { v: 1, letzte: nummer, datum: r.datum }; }
    // Empfänger und Rechnung im Gerät merken (für Vorschläge, Folge- und Stornorechnung); im Beispiel nie
    if (!z.probe) {
      z.empfaenger = empfaengerMerken(z.rechnung.empfaenger);
      z.rechnungen = rechnungMerken({ ...z.rechnung, nummer, klein: kleinFuer(z.rechnung, z.firma) }, summen(z.rechnung, z.firma, lang).zahlbetrag);
      const voll = vollText();
      if (voll) $("ewe-status").innerHTML = voll;
    }
    z.gespeichert = { datei, xml: r.xml, e: r.e };
    nummerHinweis();
    const naechste = naechsteNummer(z.probe ? nummer : z.letzte && z.letzte.letzte, heute());
    $("ewe-erfolg").innerHTML = `<div class="ewe-erfolg"><p class="ewe-erfolg-text" tabindex="-1" id="ewe-erfolg-text"><strong>${esc(ersetze(E.gespeichert, { datei }))}</strong></p>
${z.probe ? "" : `<p class="ewz-klein">${esc(ersetze(E.naechsteNr, { nummer: naechste }))}</p>`}
<div class="ewe-knoepfe">${knopf("drucken", E.drucken)}${knopf("im-pruefen", E.imPruefen)}${knopf("naechste", E.naechste)}</div></div>`;
    status(esc(ersetze(E.gespeichert, { datei })));
    $("ewe-erfolg-text").focus();
  }
  function drucken() {
    const g = z.gespeichert || z.geprueft;
    if (!g) return;
    const datei = g.datei || dateiName(g.nummer);
    ctx.druckenHtml(`${ctx.ansichtHtml(g.e)}<div class="ewe-druck-giro">${ctx.zahlenHtml(g.e)}</div><p class="ewe-druck-fuss">${esc(ersetze(E.druckFuss, { datei }))}</p>`);
  }
  function naechste() {
    const ziel = z.rechnung.zielTage;
    z.rechnung = neueRechnung(z.firma, z.probe ? { letzte: z.rechnung.nummer } : z.letzte, ziel); z.einlesen = null;
    z.beruehrt.clear(); z.alleZeigen = false; z.gespeichert = null; z.artOffen = false;
    allesZeichnen();
    $(domId("empfaenger.name")).focus();
  }

  // ---------- Beispieldaten (Regel 12): erfunden, nichts wird im Gerät gespeichert, die Nummer zählt nicht weiter ----------
  function probeStarten() {
    z.sicherung = { firma: z.firma, rechnung: z.rechnung, firmaOffen: z.firmaOffen }; z.einlesen = null;
    z.probe = true; z.firmaOffen = false;
    z.firma = firmaBereinigen({ name: "Glaserei Lindgrün GmbH", strasse: "Uferweg 12", plz: "54321", ort: "Beispielhausen", steuernummer: "21/815/08150", ustid: "DE999999999",
      register: "HRB 1234, Amtsgericht Beispielhausen", kontakt: { name: "Jonas Feldberg", telefon: "+49 1234 98765-0", email: "rechnung@glaserei-lindgruen.example" },
      bank: { iban: "DE29100100100987654321", bic: "PBNKDEFFXXX" }, vorgaben: { zielTage: 14 } });
    const r = neueRechnung(z.firma, { letzte: "RE-2026-0099" }, 14);
    Object.assign(r.empfaenger, { name: "Kanzlei Weidenhof Partnerschaft", strasse: "Lindenallee 4", plz: "54322", ort: "Beispielhausen", email: "buchhaltung@kanzlei-weidenhof.example", referenz: "Bestellung 7734" });
    const komma = lang === "en" ? "." : ",";
    r.positionen = [
      { name: lang === "en" ? "Repair of shop window" : "Reparatur Schaufenster", beschreibung: lang === "en" ? "Laminated safety glass, 2.40 × 1.80 m" : "Verbundsicherheitsglas, 2,40 × 1,80 m", menge: "1", einheit: "C62", preis: `480${komma}00`, steuer: "S19" },
      { name: lang === "en" ? "Call-out" : "Anfahrt", beschreibung: "", menge: "1", einheit: "LS", preis: `45${komma}00`, steuer: "S19" },
      { name: lang === "en" ? "Book: Caring for glass" : "Fachbuch „Glas richtig pflegen“", beschreibung: "", menge: "2", einheit: "C62", preis: `24${komma}90`, steuer: "S7" },
    ];
    z.rechnung = r; z.beruehrt.clear(); z.alleZeigen = false; z.gespeichert = null;
    allesZeichnen();
    $("ewe-probe").querySelector("button").focus();
  }
  function probeBeenden() {
    Object.assign(z, z.sicherung, { probe: false, sicherung: null, gespeichert: null });
    z.beruehrt.clear(); z.alleZeigen = false;
    allesZeichnen();
    wurzel.querySelector('[data-e="probe"]').focus();
  }

  // ---------- Firmendaten sichern, löschen, als Datei ----------
  let firmaUhr = 0;
  // Das Objekt beim Planen festhalten: Startet in den 250 ms das Beispiel, landen trotzdem die eigenen Firmendaten im Gerät
  const firmaSpaeterSichern = () => { if (z.probe) return; clearTimeout(firmaUhr); const f = z.firma; firmaUhr = setTimeout(() => firmaSichern(f), 250); };
  function firmaWeiter() {
    FIRMA_FELDER.forEach(f => z.beruehrt.add(f));
    aktualisieren();
    const erste = z.meldungen.find(m => m.feld.startsWith("firma."));
    if (erste) { zumFeld(erste.feld); return; }
    if (!z.probe) firmaSichern(z.firma);
    z.firmaOffen = false; firmaZeichnen(); schritt2Zeichnen(); einlesenZeichnen(); aktualisieren();
    $(domId("empfaenger.name")).focus();
  }
  function firmaWeg() {
    z.geloescht = { firma: z.firma, letzte: z.letzte };
    firmaLoeschen();
    z.firma = firmaLeer(); z.letzte = null; z.firmaOffen = true;
    z.rechnung.nummer = naechsteNummer(null, heute());
    allesZeichnen();
    status(`${esc(E.geloescht)} ${knopf("firma-zurueck", E.rueckgaengig, "ewe-link")}`);
    $("ewe-status").querySelector("button").focus();
  }
  function firmaZurueck() {
    if (!z.geloescht) return;
    z.firma = z.geloescht.firma; z.letzte = z.geloescht.letzte; z.geloescht = null;
    firmaSichern(z.firma);
    if (z.letzte) nummerMerken(z.letzte.letzte, z.letzte.datum);
    z.rechnung.nummer = naechsteNummer(z.letzte && z.letzte.letzte, heute());
    allesZeichnen();
    status(esc(E.wiederda));
    $(domId("firma.name")).focus();
  }
  // Nummer aus einer Datei nur übernehmen, wenn sie später ist als die gemerkte: Eine ältere Sicherung setzt den Zähler nicht zurück
  // (sonst schlüge das Werkzeug schon vergebene Nummern vor, § 14 Abs. 4 Satz 1 Nr. 4 UStG)
  function nummerUebernehmen(n) {
    if (!n || !n.letzte || !nummerSpaeter(n.letzte, z.letzte && z.letzte.letzte)) return false;
    z.letzte = { v: 1, ...n }; nummerMerken(n.letzte, n.datum);
    return true;
  }
  async function firmaAusDatei(datei) {
    const d = firmaImport(await datei.text().catch(() => ""));
    if (!d) { status(esc(E.importFehler)); return; }
    z.firma = d.firma; firmaSichern(z.firma);
    if (nummerUebernehmen(d.nummer)) z.rechnung.nummer = naechsteNummer(d.nummer.letzte, heute());
    FIRMA_FELDER.forEach(f => z.beruehrt.add(f));
    allesZeichnen();
    status(esc(E.importOk));
  }

  // ---------- Vorschläge beim Tippen (Empfänger, Katalog) ----------
  let vs = null;
  const vorschlagListe = art => art === "empfaenger" ? z.empfaenger : z.katalog;
  function vorschlagZu() {
    if (!vs) return;
    const ul = $(`${vs.el.id}-liste`);
    if (ul) { ul.hidden = true; ul.innerHTML = ""; }
    vs.el.setAttribute("aria-expanded", "false"); vs.el.removeAttribute("aria-activedescendant");
    vs = null;
  }
  function vorschlagZeigen(el) {
    if (vs && vs.el !== el) vorschlagZu();
    const art = el.dataset.vorschlag, liste = vorschlagListe(art), treffer = z.probe ? [] : vorschlaege(liste, el.value);
    const ul = $(`${el.id}-liste`);
    if (!ul || !treffer.length) { if (vs) vorschlagZu(); return; }
    vs = { el, art, treffer, aktiv: -1 };
    ul.innerHTML = treffer.map((t, k) => {
      const x = liste[t];
      const neben = art === "empfaenger" ? [[x.plz, x.ort].filter(Boolean).join(" "), x.email].filter(Boolean).join(" · ")
        : [x.artikelnr, x.preis !== "" ? `${preisFuer(x.preis, lang)} €` : "", EINHEITEN[x.einheit] ? EINHEITEN[x.einheit][L] : ""].filter(Boolean).join(" · ");
      return `<li role="option" id="${el.id}-o${k}" data-wahl="${k}" aria-selected="false"><span class="ewe-v-name">${esc(x.name)}</span>${neben ? ` <span class="ewe-v-neben">${esc(neben)}</span>` : ""}</li>`;
    }).join("");
    ul.hidden = false;
    el.setAttribute("aria-expanded", "true"); el.removeAttribute("aria-activedescendant");
  }
  function vorschlagMarkieren(k) {
    if (!vs) return;
    vs.aktiv = k;
    const ul = $(`${vs.el.id}-liste`);
    ul.querySelectorAll("[role=option]").forEach((li, i) => { li.setAttribute("aria-selected", String(i === k)); li.classList.toggle("ewe-aktiv", i === k); if (i === k) li.scrollIntoView({ block: "nearest" }); });
    vs.el.setAttribute("aria-activedescendant", `${vs.el.id}-o${k}`);
  }
  function vorschlagNehmen(k) {
    if (!vs) return;
    const { el, art, treffer } = vs, x = vorschlagListe(art)[treffer[k]];
    vorschlagZu();
    if (!x) return;
    if (art === "empfaenger") {
      Object.assign(z.rechnung.empfaenger, empfaengerBereinigen(x));
      ["name", "strasse", "plz", "ort", "email", "referenz"].forEach(f => z.beruehrt.add(`empfaenger.${f}`));
      schritt1Zeichnen(); aktualisieren();
      status(esc(ersetze(E.empfaengerUebernommen, { name: x.name })));
      const n = $(domId("empfaenger.name")); n.focus(); n.setSelectionRange(n.value.length, n.value.length);
    } else {
      const i = +el.dataset.feld.split(".")[1], p = z.rechnung.positionen[i];
      Object.assign(p, { name: x.name, beschreibung: x.beschreibung, einheit: x.einheit, preis: preisFuer(x.preis, lang), artikelnr: x.artikelnr });
      if (!kleinFuer(z.rechnung, z.firma)) p.steuer = x.steuer;
      schritt2Zeichnen(); aktualisieren();
      status(esc(ersetze(E.posUebernommen, { name: x.name })));
      const m = $(domId(`pos.${i}.menge`)); m.focus(); m.select();
    }
  }
  function inKatalog(i) {
    const p = z.rechnung.positionen[i];
    if (!p || !String(p.name).trim()) { zumFeld(`pos.${i}.name`); return; }
    const { liste, neu } = katalogMerken({ ...p, preis: preisFest(p.preis, lang), steuer: z.firma.kleinunternehmer ? z.firma.vorgaben.satz || "S19" : p.steuer });
    z.katalog = liste;
    status(esc(ersetze(neu ? E.katalogNeu : E.katalogAkt, { name: String(p.name).trim() })));
  }

  // ---------- Frühere Rechnung als Vorlage: Folgerechnung, Stornorechnung ----------
  function vorlageZeichnen() {
    const box = $("ewe-vorlage"), auf = wurzel.querySelector('[data-e="vorlage-auf"]');
    box.hidden = !z.vorlageOffen; auf.setAttribute("aria-expanded", String(z.vorlageOffen));
    if (!z.vorlageOffen) { box.innerHTML = ""; return; }
    const gesperrt = q => q === "datei" && !!z.vorlageDatei.abweichung;
    const zeile = (r, q) => `<li class="ewe-liste-zeile"><span class="ewe-liste-text"><strong>${esc(r.nummer)}</strong> · ${esc(datumAnzeige(r.datum))}${r.empfaenger.name ? ` · ${esc(r.empfaenger.name)}` : ""}${r.betrag ? ` · <span class="ewz-z">${esc(geldAnzeige(BigInt(r.betrag), lang))}</span>` : ""}${r.art !== "rechnung" ? ` · ${esc(E.art.namen[r.art])}` : ""}</span>
<span class="ewe-liste-knoepfe">${knopf("folge", E.folge, "ewe-link", ` data-q="${q}" aria-label="${esc(ersetze(E.folgeName, { nummer: r.nummer }))}"`)}${r.art !== "storno" && !gesperrt(q) ? knopf("storno", E.stornieren, "ewe-link", ` data-q="${q}" aria-label="${esc(ersetze(E.stornierenName, { nummer: r.nummer }))}"`) : ""}${q !== "datei" ? knopf("vorlage-weg", E.loeschen, "ewe-link", ` data-q="${q}" aria-label="${esc(ersetze(E.vorlageWegName, { nummer: r.nummer }))}"`) : ""}</span></li>`;
    box.innerHTML = `<section class="ewe-tafel" aria-labelledby="ewe-hvl"><h2 id="ewe-hvl" tabindex="-1">${esc(E.vorlageT)}</h2>
${z.rechnungen.length ? `<p class="ewz-klein">${esc(E.vorlageLokal)}</p><ul class="ewe-liste">${z.rechnungen.map((r, i) => zeile(r, i)).join("")}</ul>` : `<p class="ewz-klein">${esc(E.vorlageLeer)}</p>`}
${z.vorlageDatei ? `<p class="ewz-klein">${esc(ersetze(E.vorlageAusDatei, { datei: z.vorlageDatei.datei }))}</p><ul class="ewe-liste">${zeile(z.vorlageDatei.rechnung, "datei")}</ul>
${z.vorlageDatei.abweichung ? `<p class="ewe-hinweis ewe-warn">${esc(ersetze(E.vorlageAbweichung, { original: geldAnzeige(z.vorlageDatei.abweichung.original, lang), hier: geldAnzeige(z.vorlageDatei.abweichung.hier, lang) }))}</p>` : ""}` : ""}
<div class="ewe-knoepfe">${knopf("vorlage-datei", E.vorlageDatei)}${knopf("vorlage-zu", E.schliessen)}</div></section>`;
  }
  // Eine Datei lesen: E-Rechnung (XML, ZUGFeRD) genau über die Lesestrecke des Prüfens, sonst Word, PDF, Excel, Text über erkennen.js
  async function dokumentAuswerten(datei) {
    const e = await dateiLesen(datei).catch(() => null);
    if (e && e.art === "rechnung" && e.daten && !e.daten.fehler) return { ...rechnungAusDaten(e.daten, lang), quelle: "xml", gefunden: null, firma: null };
    if (e && ["xml-defekt", "xml-dtd", "xml-fremd", "zugferd1"].includes(e.art)) return { fehler: "format" };
    const bytes = new Uint8Array(await datei.arrayBuffer().catch(() => new ArrayBuffer(0)));
    const d = await dokumentLesen(bytes, datei.name).catch(() => ({ fehler: "defekt" }));
    if (d.fehler) return d;
    try { return { ...rechnungErkennen(d.zeilen, { firma: z.firma.name.trim() ? z.firma : null, lang }), quelle: d.art }; } catch { return { fehler: "defekt" }; }
  }
  async function vorlageAusDatei(datei) {
    status(esc(E.vorlageLaedt));
    const e = await dokumentAuswerten(datei);
    if (e.fehler || (e.quelle !== "xml" && !e.rechnung.positionen.length)) { status(esc(e.fehler ? E.einlesenFehler[e.fehler] || E.vorlageFehler : E.vorlageFehler)); return; }
    z.vorlageDatei = { datei: datei.name, rechnung: e.rechnung, hinweise: e.quelle === "xml" ? e.hinweise : [], abweichung: e.abweichung };
    status("");
    vorlageZeichnen();
    wurzel.querySelector('#ewe-vorlage [data-q="datei"]').focus();
  }
  function vorlageNehmen(q, wie) {
    const quelle = q === "datei" ? z.vorlageDatei : { rechnung: z.rechnungen[+q], hinweise: [], abweichung: null };
    if (!quelle || !quelle.rechnung || (wie === "storno" && quelle.abweichung)) return;
    const alt = spracheWechseln(quelle.rechnung, lang), letzte = z.letzte && z.letzte.letzte;
    const r = (wie === "storno" ? stornoRechnung : folgeRechnung)(alt, letzte, heute());
    if (!String(r.zielTage).trim()) r.zielTage = String(z.firma.vorgaben.zielTage);
    // Folgerechnung: Steuer nach den Firmendaten von heute; Stornorechnung: Steuer der ursprünglichen Rechnung (kleinFuer)
    if (wie !== "storno" && z.firma.kleinunternehmer) r.positionen.forEach(p => { p.steuer = "E"; });
    else if (wie !== "storno" && alt.klein === true) r.positionen.forEach(p => { if (p.steuer === "E") p.steuer = z.firma.vorgaben.satz || "S19"; });
    if (!r.positionen.length) r.positionen = [neuePosition(z.firma)];
    z.rechnung = r; z.beruehrt.clear(); z.alleZeigen = false; z.gespeichert = null; z.vorlageOffen = false; z.artOffen = r.art !== "rechnung"; z.einlesen = null;
    allesZeichnen();
    const HT = { steuer: E.vorlageSteuer, einheit: E.vorlageEinheit, zuschlag: E.vorlageZuschlag, basis: E.vorlageBasis };
    const h = [...new Set(quelle.hinweise.map(x => ersetze(x.art === "zuschlag" && !x.name ? E.vorlageZuschlagR : HT[x.art] || "", { wert: x.wert, name: x.name })))];
    const kleinWechsel = wie === "storno" && r.storno.klein !== !!z.firma.kleinunternehmer ? " " + (r.storno.klein ? E.stornoKleinAlt : E.stornoSteuerAlt) : "";
    const ab = quelle.abweichung ? " " + ersetze(E.vorlageAbweichung, { original: geldAnzeige(quelle.abweichung.original, lang), hier: geldAnzeige(quelle.abweichung.hier, lang) }) : "";
    status(esc(ersetze(wie === "storno" ? E.stornoOk : E.folgeOk, { nummer: alt.nummer }) + kleinWechsel + (h.length ? " " + ersetze(E.vorlageHinweise, { liste: h.join("; ") }) : "") + ab));
    $(domId(wie === "storno" ? "storno.nummer" : "nummer")).focus();
  }

  // ---------- Bestehende Rechnung übernehmen: so, wie sie ist (gleiche Nummer, gleiches Datum), zum Prüfen in der Maske ----------
  async function einlesenUebernehmen(datei) {
    status(esc(E.einlesenLaedt));
    const e = await dokumentAuswerten(datei);
    if (e.fehler) { status(esc(E.einlesenFehler[e.fehler] || E.einlesenFehler.defekt)); return; }
    const r = spracheWechseln(e.rechnung, lang), g = e.gefunden || { nummer: !!r.nummer, datum: !!r.datum, leistung: true, empfaenger: !!r.empfaenger.name, positionen: r.positionen.length };
    if (!Object.values(g).some(Boolean)) { status(esc(ersetze(E.einlesenNichts, { datei: datei.name }))); return; }
    const vorher = z.rechnung, teile = [];
    if (!r.nummer.trim()) { r.nummer = vorher.nummer; teile.push(E.einlesenOhneNummer); }
    if (!r.datum) r.datum = heute();
    if (r.leistung.art === "datum" && !r.leistung.datum) r.leistung.datum = r.datum;
    if (!String(r.zielTage).trim()) r.zielTage = String(z.firma.vorgaben.zielTage);
    if (z.firma.kleinunternehmer) r.positionen.forEach(p => { p.steuer = "E"; });
    if (!r.positionen.length) r.positionen = [neuePosition(z.firma)];
    // Eigene Angaben nur in leere Felder; kommt das Dokument von jemand anderem, bleibt alles, wie es ist
    let firmaNeu = [];
    if (e.firma) {
      const a = falten(e.firma.name), b = falten(z.firma.name);
      if (b && a && a !== b && !a.includes(b) && !b.includes(a)) teile.push(ersetze(E.einlesenAnders, { name: e.firma.name }));
      else { const x = firmaErgaenzen(z.firma, e.firma); firmaNeu = x.neu; if (firmaNeu.length) { z.firma = x.firma; z.firmaOffen = true; } }
    }
    z.rechnung = r; z.beruehrt.clear(); firmaNeu.forEach(f => z.beruehrt.add(f)); z.alleZeigen = true; z.gespeichert = null; z.vorlageOffen = false; z.artOffen = r.art !== "rechnung";
    allesZeichnen();
    const T = E.einlesenTeile, liste = [g.nummer && T.nummer, g.datum && T.datum, g.leistung && T.leistung, g.empfaenger && T.empfaenger,
      g.positionen && (g.positionen === 1 ? T.positionen1 : ersetze(T.positionen, { n: g.positionen })), g.ziel && T.ziel].filter(Boolean);
    const H = E.einlesenHinweis, VT = { steuer: E.vorlageSteuer, einheit: E.vorlageEinheit, zuschlag: E.vorlageZuschlag, basis: E.vorlageBasis };
    const text = x => x.art === "zuschlag" && !x.name ? E.vorlageZuschlagR : e.quelle === "xml" ? VT[x.art] || "" : x.art === "steuer" && !x.name ? H.steuerAlle : H[x.art] || VT[x.art] || "";
    const h = [...new Set(e.hinweise.map(x => ersetze(text(x), { wert: x.wert, name: x.name })).filter(Boolean))];
    const geld = c => geldAnzeige(BigInt(c), lang);
    z.einlesen = { text: [ersetze(E.einlesenOk, { datei: datei.name, liste: liste.join(", ") || "–" }), ...teile].filter(Boolean).join(" "), firma: firmaNeu.length > 0,
      summe: e.abweichung ? { warn: true, text: ersetze(E.einlesenAbweichung, { original: geld(e.abweichung.original), hier: geld(e.abweichung.hier) }) } : e.bestaetigt ? { warn: false, text: ersetze(E.einlesenSumme, { betrag: geld(e.summe.brutto ?? e.summe.netto) }) } : null,
      hinweise: h.length ? ersetze(E.vorlageHinweise, { liste: h.join("; ") }) : "" };
    status("");
    einlesenZeichnen();
    const box = $("ewe-einlesen-box");
    box.focus(); box.scrollIntoView({ block: "start", behavior: "auto" });
  }
  function einlesenFehltZeichnen() {
    const p = $("ewe-einlesen-fehlt");
    if (!p) return;
    const fehlt = [...new Map(z.meldungen.map(m => [m.feld, m])).values()];
    p.innerHTML = fehlt.length ? `${esc(E.einlesenFehlt)} ${fehlt.slice(0, 8).map(m => `<a href="#${domId(m.feld)}" data-zumfeld="${esc(m.feld)}">${esc(label(m.feld))}</a>`).join(", ")}${fehlt.length > 8 ? " …" : ""}` : esc(E.einlesenVollstaendig);
  }
  // Ergebnis des Übernehmens oben im Blick: was gefunden wurde, ob der Betrag stimmt, was noch fehlt (mit Sprung zum Feld)
  function einlesenZeichnen() {
    const box = $("ewe-einlesen"), x = z.einlesen;
    if (!x) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="ewe-hinweis ewe-einlesen-ergebnis" id="ewe-einlesen-box" tabindex="-1"><p>${esc(x.text)}${x.firma && z.firmaOffen ? ` ${esc(E.einlesenFirma)}` : ""}</p>
${x.summe ? `<p class="${x.summe.warn ? "ewe-warn" : "ewe-ok"}"><strong>${esc(x.summe.text)}</strong></p>` : ""}${x.hinweise ? `<p>${esc(x.hinweise)}</p>` : ""}
<p id="ewe-einlesen-fehlt"></p>
<p>${knopf("einlesen-zu", E.schliessen, "ewe-link")}</p></div>`;
    einlesenFehltZeichnen();
  }

  // ---------- Gemerkte Empfänger und Katalog: ändern, löschen, CSV, alle lokalen Daten ----------
  const STAMM_FELDER = { empfaenger: ["name", "strasse", "zusatz", "plz", "ort", "land", "ustid", "email", "referenz", "behoerde"], katalog: ["name", "beschreibung", "einheit", "preis", "steuer", "artikelnr"] };
  const stammListe = art => art === "empfaenger" ? z.empfaenger : z.katalog;
  const stammSetzen = (art, liste) => { if (art === "empfaenger") z.empfaenger = liste; else z.katalog = liste; listeSichern(art, liste); };
  const steuerName = c => E.steuer[c] || c;
  function stammZeile(art, x, i) {
    const pre = art === "empfaenger" ? "e" : "k";
    if (z.bearbeiten && z.bearbeiten.art === art && z.bearbeiten.i === i) {
      const id = f => `ewe-st-${pre}-${f}`;
      const eing = f => f === "behoerde" ? `<div class="ewe-feld ewe-breit"><label class="ewz-check ewe-check"><input type="checkbox" id="${id(f)}"${x.behoerde ? " checked" : ""}> ${esc(E.felder[`e.${f}`])}</label></div>`
        : f === "einheit" ? `<div class="ewe-feld"><label for="${id(f)}">${esc(E.felder["k.einheit"])}</label><select id="${id(f)}">${einheiten.map(([w, n]) => `<option value="${w}"${w === x.einheit ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></div>`
        : f === "steuer" ? `<div class="ewe-feld"><label for="${id(f)}">${esc(E.felder["k.steuer"])}</label><select id="${id(f)}">${steuerOptionen().map(([w, n]) => `<option value="${w}"${w === x.steuer ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></div>`
        : `<div class="ewe-feld${["name", "strasse", "beschreibung", "email"].includes(f) ? " ewe-breit" : ""}"><label for="${id(f)}">${esc(E.felder[`${pre}.${f}`])}</label><input id="${id(f)}" autocomplete="off" value="${esc(f === "preis" ? preisFuer(x.preis, lang) : x[f])}"${f === "preis" ? ' inputmode="decimal"' : ""} aria-describedby="${id(f)}-f"><p class="ewe-fehler" id="${id(f)}-f" hidden></p></div>`;
      return `<li class="ewe-liste-zeile ewe-bearbeiten"><div class="ewe-felder">${STAMM_FELDER[art].map(eing).join("")}</div>
<div class="ewe-knoepfe">${knopf("st-sichern", E.uebernehmen, "ewz-haupt", ` data-art="${art}"`)}${knopf("st-abbrechen", E.abbrechen, "ewz-zweit", ` data-art="${art}"`)}</div></li>`;
    }
    const text = art === "empfaenger" ? [x.strasse, [x.plz, x.ort].filter(Boolean).join(" "), x.email].filter(Boolean).join(" · ")
      : [x.preis !== "" ? `${preisFuer(x.preis, lang)} €` : "", EINHEITEN[x.einheit] ? EINHEITEN[x.einheit][L] : x.einheit, steuerName(x.steuer), x.artikelnr].filter(Boolean).join(" · ");
    return `<li class="ewe-liste-zeile"><span class="ewe-liste-text"><strong>${esc(x.name)}</strong>${text ? ` <span class="ewz-klein">${esc(text)}</span>` : ""}</span>
<span class="ewe-liste-knoepfe">${knopf("st-aendern", E.aendern, "ewe-link", ` data-art="${art}" data-i="${i}" aria-label="${esc(ersetze(E.aendernName, { name: x.name }))}"`)}${knopf("st-weg", E.loeschen, "ewe-link", ` data-art="${art}" data-i="${i}" aria-label="${esc(ersetze(E.loeschenName, { name: x.name }))}"`)}</span></li>`;
  }
  function stammListeZeichnen(art) {
    const ul = $(`ewe-st-liste-${art}`);
    if (!ul) return;
    const alle = stammListe(art), f = falten(z.filter[art]);
    const idx = alle.map((_, i) => i).filter(i => !f || falten(alle[i].name).includes(f) || falten(alle[i].artikelnr || "").includes(f) || falten(alle[i].ort || "").includes(f));
    ul.innerHTML = idx.length ? idx.slice(0, 50).map(i => stammZeile(art, alle[i], i)).join("") : `<li class="ewz-klein">${esc(art === "empfaenger" ? E.leerE : E.leerK)}</li>`;
    $(`ewe-st-mehr-${art}`).textContent = idx.length > 50 ? ersetze(E.weitere, { n: String(idx.length - 50) }) : "";
  }
  function csvVorschau(art) {
    const c = z.csv;
    if (!c || c.art !== art) return "";
    const r = c.ergebnis;
    if (!r.ok) return `<div class="ewe-csv" id="ewe-csv-${art}"><p class="ewe-hinweis" tabindex="-1" id="ewe-csv-kopf-${art}">${esc(r.fehler === "leer" ? E.csvLeer : ersetze(E.csvKeinName, { beispiel: E.csvBeispiel[art] }))}</p>
<div class="ewe-knoepfe">${knopf("csv-abbrechen", E.abbrechen, "ewz-zweit", ` data-art="${art}"`)}</div></div>`;
    const name = f => E.felder[`${art === "empfaenger" ? "e" : "k"}.${f}`];
    const neuAlle = r.ergebnis.filter(x => x.status === "neu").length, platz = Math.max(0, GRENZEN[art] - stammListe(art).length), neu = Math.min(neuAlle, platz);
    const HW = { einheit: E.csvEinheit, preis: E.csvPreisPruefen };
    const zeile = x => `<tr><td class="ewz-z">${x.zeile}</td><td>${esc(x.eintrag.name || "–")}</td><td>${esc(art === "empfaenger" ? [x.eintrag.plz, x.eintrag.ort].filter(Boolean).join(" ") : [x.eintrag.preis !== "" ? `${preisFuer(x.eintrag.preis, lang)} €` : "", steuerName(x.eintrag.steuer)].filter(Boolean).join(" · "))}</td>
<td class="ewe-csv-${x.status}">${esc(E.csvStatus[x.status])}${x.grund ? ` (${esc(E.csvGrund[x.grund])})` : ""}${x.hinweise.map(h => ` · ${esc(ersetze(HW[h.art] || "", { wert: h.wert, preis: h.art === "preis" ? `${preisFuer(x.eintrag.preis, lang)} €` : "" }))}`).join("")}</td></tr>`;
    return `<div class="ewe-csv" id="ewe-csv-${art}"><h4 tabindex="-1" id="ewe-csv-kopf-${art}">${esc(ersetze(E.csvT, { datei: c.datei }))}</h4>
<p class="ewz-klein">${esc(ersetze(E.csvInfo, { zs: r.zeichensatz, sep: E.csvSep[r.trennzeichen], n: String(r.zeilen) }))}</p>
<p class="ewz-klein">${esc(E.csvSpalten)}: ${r.spalten.map(s => `${esc(s.kopf || "–")} → ${s.feld ? esc(name(s.feld)) : `<em>${esc(E.csvUngenutzt)}</em>`}`).join("; ")}</p>
<p><strong>${esc(ersetze(E.csvZaehler, Object.fromEntries(Object.entries(r.zaehler).map(([k, v]) => [k, String(v)]))))}</strong></p>
<div class="ewe-csv-tab"><table><thead><tr><th scope="col">${esc(E.csvZeile)}</th><th scope="col">${esc(name("name"))}</th><th scope="col">${esc(art === "empfaenger" ? name("ort") : name("preis"))}</th><th scope="col">Status</th></tr></thead>
<tbody>${r.ergebnis.slice(0, 20).map(zeile).join("")}</tbody></table></div>${r.ergebnis.length > 20 ? `<p class="ewz-klein">${esc(ersetze(E.csvWeitere, { n: String(r.ergebnis.length - 20) }))}</p>` : ""}
${neuAlle > neu ? `<p class="ewe-hinweis">${esc(ersetze(E.csvGrenze, { grenze: String(GRENZEN[art]), platz: String(neu), rest: String(neuAlle - neu) }))}</p>` : ""}
<div class="ewe-knoepfe">${neu ? knopf("csv-ok", ersetze(E.csvUebernehmen, { n: String(neu) }), "ewz-haupt", ` data-art="${art}"`) : `<p class="ewz-klein">${esc(E.csvNichts)}</p>`}${knopf("csv-abbrechen", E.abbrechen, "ewz-zweit", ` data-art="${art}"`)}</div></div>`;
  }
  function stammZeichnen() {
    const box = $("ewe-stamm"), auf = wurzel.querySelector('[data-e="stamm-auf"]');
    box.hidden = !z.stammOffen; auf.setAttribute("aria-expanded", String(z.stammOffen));
    if (!z.stammOffen) { box.innerHTML = ""; return; }
    const teil = art => {
      const n = stammListe(art).length, titel = art === "empfaenger" ? E.empfaengerT : E.katalogT;
      return `<section class="ewe-stamm-teil" aria-labelledby="ewe-st-h-${art}"><h3 id="ewe-st-h-${art}">${esc(titel)} <span class="ewz-klein">(${n})</span></h3>
${n > 8 ? `<p class="ewe-feld"><label for="ewe-st-filter-${art}" class="ewe-sr">${esc(ersetze(E.suchen, { was: titel }))}</label><input type="search" id="ewe-st-filter-${art}" data-filter="${art}" placeholder="${esc(ersetze(E.suchen, { was: titel }))}" value="${esc(z.filter[art])}" autocomplete="off"></p>` : ""}
<ul class="ewe-liste" id="ewe-st-liste-${art}"></ul><p class="ewz-klein" id="ewe-st-mehr-${art}"></p>
<div class="ewe-knoepfe">${knopf("csv-ein", E.csvEin, "ewz-zweit", ` data-art="${art}"`)}${n ? knopf("csv-aus", E.csvAus, "ewz-zweit", ` data-art="${art}"`) : ""}</div>${csvVorschau(art)}</section>`;
    };
    box.innerHTML = `<section class="ewe-tafel" aria-labelledby="ewe-hst"><h2 id="ewe-hst" tabindex="-1">${esc(E.stammT)}</h2><p class="ewz-klein">${esc(E.stammLokal)}</p>
${z.speicherDa ? "" : `<p class="ewe-hinweis">${esc(E.ohneSpeicher)}</p>`}
${teil("empfaenger")}${teil("katalog")}
<section class="ewe-stamm-teil" aria-labelledby="ewe-st-h-alle"><h3 id="ewe-st-h-alle">${esc(E.alleT)}</h3><p class="ewz-klein">${esc(E.alleText)}</p>
<div class="ewe-knoepfe">${knopf("alle-aus", E.alleAus)}${knopf("alle-ein", E.alleEin)}${knopf("alle-weg", E.alleLoeschen)}</div></section>
<div class="ewe-knoepfe">${knopf("stamm-zu", E.schliessen)}</div></section>`;
    stammListeZeichnen("empfaenger"); stammListeZeichnen("katalog");
  }
  function stammSichern(art) {
    const { i } = z.bearbeiten, pre = art === "empfaenger" ? "e" : "k", w = f => { const el = $(`ewe-st-${pre}-${f}`); return el ? (el.type === "checkbox" ? el.checked : el.value) : ""; };
    const roh = Object.fromEntries(STAMM_FELDER[art].map(f => [f, w(f)]));
    const fehler = (f, text) => { const p = $(`ewe-st-${pre}-${f}-f`), el = $(`ewe-st-${pre}-${f}`); p.hidden = false; p.textContent = text; el.setAttribute("aria-invalid", "true"); el.focus(); };
    if (!String(roh.name).trim()) { fehler("name", E.melde.pflicht); return; }
    if (art === "katalog") { if (String(roh.preis).trim() && preisFest(roh.preis, lang) === "") { fehler("preis", E.melde.preis); return; } roh.preis = preisFest(roh.preis, lang); }
    const x = art === "empfaenger" ? empfaengerBereinigen(roh) : katalogBereinigen(roh), sch = art === "empfaenger" ? empfaengerSchluessel : katalogSchluessel;
    const liste = stammListe(art).filter((y, j) => j !== i && sch(y) !== sch(x));
    liste.splice(Math.min(i, liste.length), 0, x);
    z.bearbeiten = null;
    stammSetzen(art, liste);
    stammListeZeichnen(art);
    status(esc(E.eintragOk));
    const k = wurzel.querySelector(`#ewe-st-liste-${art} [data-e="st-aendern"][data-i="${liste.indexOf(x)}"]`);
    if (k) k.focus();
  }
  async function csvEinlesen(datei, art) {
    const bytes = new Uint8Array(await datei.arrayBuffer().catch(() => new ArrayBuffer(0)));
    z.csv = { art, datei: datei.name, ergebnis: csvLesen(bytes, art, stammListe(art), z.firma.vorgaben.satz || "S19") };
    stammZeichnen();
    $(`ewe-csv-kopf-${art}`).focus();
  }
  function csvUebernehmen(art) {
    if (!z.csv || z.csv.art !== art) return;
    const platz = Math.max(0, GRENZEN[art] - stammListe(art).length);
    const neu = z.csv.ergebnis.ergebnis.filter(x => x.status === "neu").map(x => x.eintrag).slice(0, platz);
    stammSetzen(art, [...stammListe(art), ...neu]);
    z.csv = null;
    stammZeichnen();
    status(esc(ersetze(E.csvOk, { n: String(neu.length) })));
    $(`ewe-st-h-${art}`).tabIndex = -1; $(`ewe-st-h-${art}`).focus();
  }
  const alleJetzt = () => ({ firma: z.probe ? z.sicherung.firma : z.firma, nummer: z.probe ? null : z.letzte, empfaenger: z.empfaenger, katalog: z.katalog, rechnungen: z.rechnungen });
  function alleAnwenden(d) {
    if (d.firma && String(d.firma.name).trim()) { z.firma = d.firma; firmaSichern(z.firma); }
    nummerUebernehmen(d.nummer);
    for (const art of ["empfaenger", "katalog"]) if (d[art]) stammSetzen(art, d[art]);
    if (d.rechnungen) { z.rechnungen = d.rechnungen; listeSichern("rechnungen", d.rechnungen); }
    z.rechnung.nummer = naechsteNummer(z.letzte && z.letzte.letzte, heute());
    z.firmaOffen = maskePruefen(z.firma, z.rechnung, lang).some(m => m.feld.startsWith("firma."));
  }
  async function alleAusDatei(datei) {
    const d = alleImport(await datei.text().catch(() => ""));
    if (!d) { status(esc(E.alleImportFehler)); return; }
    alleAnwenden(d);
    FIRMA_FELDER.forEach(f => z.beruehrt.add(f));
    allesZeichnen();
    status(esc(ersetze(E.alleImportOk, { e: String(z.empfaenger.length), k: String(z.katalog.length), r: String(z.rechnungen.length) })));
  }
  function alleWeg() {
    z.alleWeg = { firma: z.firma, nummer: z.letzte, empfaenger: z.empfaenger, katalog: z.katalog, rechnungen: z.rechnungen };
    firmaLoeschen(); stammLoeschen();
    z.firma = firmaLeer(); z.letzte = null; z.empfaenger = []; z.katalog = []; z.rechnungen = []; z.firmaOffen = true; z.csv = null; z.bearbeiten = null;
    z.rechnung.nummer = naechsteNummer(null, heute());
    allesZeichnen();
    status(`${esc(E.alleGeloescht)} ${knopf("alle-zurueck", E.rueckgaengig, "ewe-link")}`);
    $("ewe-status").querySelector("button").focus();
  }

  // ---------- Zum Feld springen ----------
  function zumFeld(feld) {
    if (feld.startsWith("firma.") && !z.firmaOffen) { z.firmaOffen = true; firmaZeichnen(); aktualisieren(); }
    if (feld === "befreiung.text" && z.rechnung.befreiung.wahl !== "eigen") feld = "befreiung.wahl";
    if (/^pos\.\d+\./.test(feld) && !z.rechnung.positionen[+feld.split(".")[1]]) feld = "pos";
    const el = feld === "pos" ? wurzel.querySelector('[data-e="pos-neu"]') : $(domId(feld));
    if (el) { el.focus(); el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  }

  // ---------- Ereignisse ----------
  const ganzNeu = new Set(["firma.kleinunternehmer", "empfaenger.behoerde", "empfaenger.land", "leistung.art", "befreiung.wahl"]);
  function eingabe(el) {
    const f = el.dataset.feld;
    if (!f) return;
    const [o, k] = ort(f);
    if (!o) return;
    o[k] = el.type === "checkbox" ? el.checked : el.value;
    // Rechnungsart: Schritte 01 und 03 neu, Fokus bleibt auf der Wahl; Dauerrechnung mit Laufzeit ab dem nächsten Monat für ein Jahr
    if (f === "art") {
      const r = z.rechnung;
      if (r.art === "dauer") {
        r.leistung.art = "zeitraum";
        if (!r.leistung.von || !r.leistung.bis) { const [j, m] = heute().split("-").map(Number); r.leistung.von = new Date(Date.UTC(j, m, 1)).toISOString().slice(0, 10); r.leistung.bis = new Date(Date.UTC(j + 1, m, 0)).toISOString().slice(0, 10); }
      }
      z.artOffen = true;
      schritt1Zeichnen(); schritt3Zeichnen(); aktionZeichnen(); aktualisieren();
      const neu = wurzel.querySelector(`input[name="ewe-art"][value="${el.value}"]`);
      if (neu) neu.focus();
      return;
    }
    if (f === "befreiung.wahl") { const b = BEFREIUNGEN.find(x => x.id === el.value); z.rechnung.befreiung.text = b ? b.text : ""; }
    if (f.startsWith("firma.")) firmaSpaeterSichern();
    if (f === "firma.kleinunternehmer" && !(z.rechnung.art === "storno" && typeof z.rechnung.storno.klein === "boolean")) z.rechnung.positionen.forEach(p => { if (z.firma.kleinunternehmer) p.steuer = "E"; else if (p.steuer === "E") p.steuer = z.firma.vorgaben.satz || "S19"; });
    if (ganzNeu.has(f) || /^pos\.\d+\.steuer$/.test(f)) {
      const id = document.activeElement && document.activeElement.id, wahl = el.type === "radio" ? el.value : null;
      if (f.startsWith("firma.")) firmaZeichnen();
      if (f.startsWith("empfaenger.") || f.startsWith("leistung.")) schritt1Zeichnen();
      schritt2Zeichnen();
      const neu = wahl ? wurzel.querySelector(`input[name="ewe-leistung-art"][value="${wahl}"]`) : id && $(id);
      if (neu) neu.focus();
    }
    if (f === "nummer") nummerHinweis();
    aktualisieren();
  }
  wurzel.addEventListener("input", ev => {
    const el = ev.target;
    if (el.dataset.feld && !["checkbox", "radio", "select-one"].includes(el.type)) { eingabe(el); if (el.dataset.vorschlag) vorschlagZeigen(el); }
    if (el.dataset.filter) { z.filter[el.dataset.filter] = el.value; stammListeZeichnen(el.dataset.filter); }
  });
  // Vorschläge mit der Tastatur: Pfeile wählen, Enter übernimmt, Escape schließt
  wurzel.addEventListener("keydown", ev => {
    const el = ev.target;
    if (!el.dataset || !el.dataset.vorschlag) return;
    if (!vs || vs.el !== el) { if (ev.key === "ArrowDown" && el.value) { vorschlagZeigen(el); if (vs) { ev.preventDefault(); vorschlagMarkieren(0); } } return; }
    const n = vs.treffer.length;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); vorschlagMarkieren(((vs.aktiv < 0 ? (ev.key === "ArrowDown" ? -1 : 0) : vs.aktiv) + (ev.key === "ArrowDown" ? 1 : -1) + n) % n); }
    else if (ev.key === "Enter" && vs.aktiv >= 0) { ev.preventDefault(); vorschlagNehmen(vs.aktiv); }
    else if (ev.key === "Escape") { ev.preventDefault(); vorschlagZu(); }
  });
  // Maus und Finger: der Fokus bleibt im Feld, ein Klick übernimmt
  wurzel.addEventListener("mousedown", ev => { if (ev.target.closest(".ewe-vorschlaege [role=option]")) ev.preventDefault(); });
  wurzel.addEventListener("change", ev => { const el = ev.target; if (el.dataset.feld && ["checkbox", "radio", "select-one"].includes(el.type)) eingabe(el); });
  wurzel.addEventListener("focusout", ev => {
    if (vs && ev.target === vs.el) vorschlagZu();
    const f = ev.target.dataset && ev.target.dataset.feld;
    if (!f || z.beruehrt.has(f)) return;
    z.beruehrt.add(f); fehlerZeigen();
  });
  $("ewe-import-datei").addEventListener("change", ev => { const d = ev.target.files[0]; ev.target.value = ""; if (d) firmaAusDatei(d); });
  $("ewe-vorlage-eingabe").addEventListener("change", ev => { const d = ev.target.files[0]; ev.target.value = ""; if (d) vorlageAusDatei(d); });
  $("ewe-einlesen-eingabe").addEventListener("change", ev => { const d = ev.target.files[0]; ev.target.value = ""; if (d) einlesenUebernehmen(d); });
  let csvArt = "empfaenger";
  $("ewe-csv-eingabe").addEventListener("change", ev => { const d = ev.target.files[0]; ev.target.value = ""; if (d) csvEinlesen(d, csvArt); });
  $("ewe-alle-eingabe").addEventListener("change", ev => { const d = ev.target.files[0]; ev.target.value = ""; if (d) alleAusDatei(d); });
  wurzel.addEventListener("click", ev => {
    const zf = ev.target.closest("[data-zumfeld]");
    if (zf) { ev.preventDefault(); zumFeld(zf.dataset.zumfeld); return; }
    const wahl = ev.target.closest(".ewe-vorschlaege [role=option]");
    if (wahl && vs) { vorschlagNehmen(+wahl.dataset.wahl); return; }
    const b = ev.target.closest("[data-e]");
    if (!b) return;
    const art = b.dataset.art;
    switch (b.dataset.e) {
      case "pos-katalog": inKatalog(+b.dataset.i); break;
      case "vorlage-auf": z.vorlageOffen = !z.vorlageOffen; vorlageZeichnen(); if (z.vorlageOffen) $("ewe-hvl").focus(); break;
      case "vorlage-zu": z.vorlageOffen = false; vorlageZeichnen(); wurzel.querySelector('[data-e="vorlage-auf"]').focus(); break;
      case "vorlage-datei": $("ewe-vorlage-eingabe").click(); break;
      case "einlesen": $("ewe-einlesen-eingabe").click(); break;
      case "einlesen-zu": z.einlesen = null; einlesenZeichnen(); wurzel.querySelector('[data-e="einlesen"]').focus(); break;
      case "folge": vorlageNehmen(b.dataset.q, "folge"); break;
      case "vorlage-weg": {
        const i = +b.dataset.q, liste = [...z.rechnungen], [x] = liste.splice(i, 1);
        if (!x) break;
        z.rechnungen = liste; listeSichern("rechnungen", liste);
        vorlageZeichnen();
        status(esc(ersetze(E.vorlageWeg, { nummer: x.nummer })));
        const weiter = wurzel.querySelector(`#ewe-vorlage [data-e="vorlage-weg"][data-q="${Math.min(i, liste.length - 1)}"]`) || $("ewe-hvl");
        weiter.focus();
        break;
      }
      case "storno": vorlageNehmen(b.dataset.q, "storno"); break;
      case "stamm-auf": z.stammOffen = !z.stammOffen; z.bearbeiten = null; z.csv = null; stammZeichnen(); if (z.stammOffen) $("ewe-hst").focus(); break;
      case "stamm-zu": z.stammOffen = false; stammZeichnen(); wurzel.querySelector('[data-e="stamm-auf"]').focus(); break;
      case "st-aendern": z.bearbeiten = { art, i: +b.dataset.i }; stammListeZeichnen(art); $(`ewe-st-${art === "empfaenger" ? "e" : "k"}-name`).focus(); break;
      case "st-abbrechen": { const i = z.bearbeiten && z.bearbeiten.i; z.bearbeiten = null; stammListeZeichnen(art); const k = wurzel.querySelector(`#ewe-st-liste-${art} [data-e="st-aendern"][data-i="${i}"]`); if (k) k.focus(); break; }
      case "st-sichern": stammSichern(art); break;
      case "st-weg": {
        const i = +b.dataset.i, liste = [...stammListe(art)], [x] = liste.splice(i, 1);
        z.stammWeg = { art, i, x }; z.bearbeiten = null;
        stammSetzen(art, liste); stammZeichnen();
        status(`${esc(ersetze(E.eintragWeg, { name: x.name }))} ${knopf("st-zurueck", E.rueckgaengig, "ewe-link")}`);
        $("ewe-status").querySelector("button").focus();
        break;
      }
      case "st-zurueck": {
        if (!z.stammWeg) break;
        const { art: a, i, x } = z.stammWeg, liste = [...stammListe(a)];
        liste.splice(Math.min(i, liste.length), 0, x);
        z.stammWeg = null; stammSetzen(a, liste); status("");
        if (z.stammOffen) { stammZeichnen(); const k = wurzel.querySelector(`#ewe-st-liste-${a} [data-e="st-aendern"][data-i="${i}"]`); if (k) k.focus(); }
        break;
      }
      case "csv-ein": csvArt = art; $("ewe-csv-eingabe").click(); break;
      case "csv-aus": ctx.speichern(E.csvDatei[art], csvSchreiben(stammListe(art), art, lang), "text/csv;charset=utf-8"); break;
      case "csv-ok": csvUebernehmen(art); break;
      case "csv-abbrechen": z.csv = null; stammZeichnen(); wurzel.querySelector(`[data-e="csv-ein"][data-art="${art}"]`).focus(); break;
      case "alle-aus": ctx.speichern(E.csvDatei.alle, alleExport(alleJetzt()), "application/json"); break;
      case "alle-ein": $("ewe-alle-eingabe").click(); break;
      case "alle-weg": alleWeg(); break;
      case "alle-zurueck": if (z.alleWeg) { alleAnwenden(z.alleWeg); z.alleWeg = null; allesZeichnen(); status(esc(E.alleWieder)); wurzel.querySelector('[data-e="stamm-auf"]').focus(); } break;
      case "speichern": speichernKlick(); break;
      case "speichern-doch": status(""); speichernKlick(true); break;
      case "firma-auf": z.firmaOffen = true; firmaZeichnen(); aktualisieren(); $(domId("firma.name")).focus(); break;
      case "firma-weiter": firmaWeiter(); break;
      case "firma-export": ctx.speichern(lang === "en" ? "SmartFormular-company-details.json" : "SmartFormular-Firmendaten.json", firmaExport(z.firma, z.letzte), "application/json"); break;
      case "firma-import": $("ewe-import-datei").click(); break;
      case "firma-loeschen": firmaWeg(); break;
      case "firma-zurueck": firmaZurueck(); break;
      case "pos-neu": {
        z.rechnung.positionen.push(neuePosition(z.firma));
        schritt2Zeichnen(); aktualisieren();
        $(domId(`pos.${z.rechnung.positionen.length - 1}.name`)).focus();
        break;
      }
      case "pos-weg": {
        const i = +b.dataset.i;
        z.entfernt = { i, p: z.rechnung.positionen.splice(i, 1)[0] };
        z.beruehrt = new Set([...z.beruehrt].filter(f => !f.startsWith("pos.")));
        schritt2Zeichnen(); aktualisieren();
        status(`${esc(ersetze(E.posEntfernt, { n: i + 1 }))} ${knopf("pos-zurueck", E.rueckgaengig, "ewe-link")}`);
        $("ewe-status").querySelector("button").focus();
        break;
      }
      case "pos-zurueck": {
        if (!z.entfernt) break;
        z.rechnung.positionen.splice(Math.min(z.entfernt.i, z.rechnung.positionen.length), 0, z.entfernt.p);
        const i = Math.min(z.entfernt.i, z.rechnung.positionen.length - 1);
        z.entfernt = null; status("");
        schritt2Zeichnen(); aktualisieren();
        $(domId(`pos.${i}.name`)).focus();
        break;
      }
      case "vorschau": {
        z.vorschauAuf = !z.vorschauAuf;
        $("ewe-vorschau").classList.toggle("ewe-auf", z.vorschauAuf);
        b.setAttribute("aria-expanded", String(z.vorschauAuf));
        b.textContent = z.vorschauAuf ? E.vorschauVerbergen : E.vorschauZeigen;
        break;
      }
      case "drucken": drucken(); break;
      case "im-pruefen": if (z.gespeichert) ctx.imPruefen(new File([z.gespeichert.xml], z.gespeichert.datei, { type: "application/xml" })); break;
      case "naechste": naechste(); break;
      case "probe": probeStarten(); break;
      case "probe-ende": probeBeenden(); break;
    }
  });

  allesZeichnen();
  return {
    // Beim Öffnen des Reiters: Prüfkern und Regeln schon laden, damit die erste Prüfung sofort läuft
    geoeffnet() { ctx.kern().then(() => Promise.all(["en16931-ubl", "xrechnung-ubl"].map(id => ctx.regelsatz(id)))).catch(() => {}); },
    // Für Tests: nur der Zustand, keine Daten nach außen
    get zustand() { return { firma: z.firma, rechnung: z.rechnung, meldungen: z.meldungen, pruefung: z.pruefung, gespeichert: z.gespeichert && { datei: z.gespeichert.datei, xml: z.gespeichert.xml }, probe: z.probe, letzte: z.letzte,
      empfaenger: z.empfaenger, katalog: z.katalog, rechnungen: z.rechnungen.map(r => ({ nummer: r.nummer, art: r.art })) }; },
  };
}
