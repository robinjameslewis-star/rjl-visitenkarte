// SmartFormular E-Rechnung lite – Reiter „Erstellen“: eigene E-Rechnung (XRechnung 3.0, UBL) schreiben. Einmal die Firmendaten (nur
// im Gerät gespeichert), dann drei Schritte: Empfänger und Leistung, Positionen, Prüfen und speichern. Die Maske prüft beim Tippen
// (maske.js), die Vorschau zeigt genau das, was in der Datei steht (dieselbe Lesestrecke wie beim Prüfen), und vor dem Speichern
// läuft der eigene Prüfkern mit den offiziellen Regeln: Mit Fehlern wird nicht gespeichert. Kein Archiv – die XML-Datei ist das Original.
// Prüfkern, Ansicht, Befunde, GiroCode, Druck und Speichern kommen aus app.js (ctx), damit beide Reiter dasselbe zeigen.
import { ZUSATZ, Q, STAND } from "./recht.js";
import { EINHEITEN, EINHEITEN_ERSTELLEN, BEFREIUNGEN } from "./texte.js";
import { dateiLesen } from "./lesen.js";
import { ublSchreiben, dateiName, KLEIN } from "./erzeugen.js";
import { summen, geldAnzeige, datumGueltig, datumPlus } from "./rechnen.js";
import { maskePruefen, naechsteNummer, speichernErlaubt } from "./maske.js";
import { firmaLeer, firmaBereinigen, firmaLesen, firmaSichern, firmaLoeschen, nummerLesen, nummerMerken, firmaExport, firmaImport, speicherDa } from "./firma.js";
import { maskenfeld } from "./regeltexte.js";

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
  const neuePosition = f => ({ name: "", beschreibung: "", menge: "1", einheit: f.vorgaben.einheit || "C62", preis: "", steuer: f.kleinunternehmer ? "E" : f.vorgaben.satz || "S19" });
  const neueRechnung = (f, letzte, ziel) => ({ sprache: lang, nummer: naechsteNummer(letzte && letzte.letzte, heute()), datum: heute(),
    leistung: { art: "datum", datum: heute(), von: "", bis: "" },
    empfaenger: { name: "", strasse: "", zusatz: "", plz: "", ort: "", land: "DE", ustid: "", email: "", behoerde: false, referenz: "" },
    positionen: [neuePosition(f)], befreiung: { wahl: "", text: "" }, zielTage: String(ziel ?? f.vorgaben.zielTage), zweck: "", bemerkung: "" });
  const z = { firma: gespeichert || firmaLeer(), letzte: nummerLesen(), rechnung: null, meldungen: [], beruehrt: new Set(), alleZeigen: false, probe: false, sicherung: null,
    pruefung: null, geprueft: null, gespeichert: null, entfernt: null, geloescht: null, vorschauAuf: false, speicherDa: speicherDa() };
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
    : feld === "empfaenger.referenz" && z.rechnung.empfaenger.behoerde ? E.felder["empfaenger.leitweg"] : E.felder[feld] || feld;

  // ---------- Bausteine ----------
  function feld(f, o = {}) {
    const id = domId(f), v = wert(f) ?? "", hilfe = o.hilfe ?? E.hilfe[f];
    const beschr = [hilfe ? `${id}-h` : "", `${id}-f`].filter(Boolean).join(" ");
    const attr = [`id="${id}"`, `data-feld="${f}"`, `aria-describedby="${beschr}"`, o.pflicht ? 'aria-required="true"' : "", o.auto ? `autocomplete="${o.auto}"` : 'autocomplete="off"',
      o.modus ? `inputmode="${o.modus}"` : "", o.max ? `maxlength="${o.max}"` : "", o.spell === false ? 'spellcheck="false"' : ""].filter(Boolean).join(" ");
    const eingabe = o.optionen
      ? `<select ${attr}>${o.optionen.map(([w, n]) => `<option value="${esc(w)}"${String(w) === String(v) ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>`
      : o.typ === "textarea" ? `<textarea ${attr} rows="2">${esc(v)}</textarea>` : `<input type="${o.typ || "text"}" ${attr} value="${esc(v)}">`;
    return `<div class="ewe-feld${o.klasse ? " " + o.klasse : ""}"><label for="${id}">${f.startsWith("pos.") ? `<span class="ewe-sr">${esc(ersetze(E.posNr, { n: +f.split(".")[1] + 1 }))}: </span>` : ""}${esc(o.label || (f.startsWith("pos.") ? E.felder[`pos.${f.split(".")[2]}`] : label(f)))}${o.pflicht ? '<span class="ewe-pflicht" aria-hidden="true"> *</span>' : ""}</label>${eingabe}
${hilfe ? `<p class="ewe-hilfe" id="${id}-h">${esc(hilfe)}</p>` : ""}<p class="ewe-fehler" id="${id}-f" hidden></p></div>`;
  }
  const knopf = (e, text, art = "ewz-zweit", extra = "") => `<button type="button" class="${art}" data-e="${e}"${extra}>${esc(text)}</button>`;
  const abschnitt = (n, id, titel, inhalt) => `<section class="ewz-abschnitt ewe-schritt" aria-labelledby="${id}"><div class="ewz-n" aria-hidden="true">${n}</div><div class="ewz-inhalt">
<span class="ewz-label">${esc(E.schritt)} ${+n}</span><h2 id="${id}">${esc(titel)}</h2>${inhalt}</div></section>`;

  // ---------- Gerüst ----------
  wurzel.innerHTML = `<div class="ewe">
<div class="ewe-start"><p class="ewe-lead">${esc(E.lead)}</p><p>${knopf("probe", E.probe)}</p><div id="ewe-probe"></div></div>
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
</div>`;
  const $ = id => document.getElementById(id);
  const status = (html) => { $("ewe-status").innerHTML = html; };

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
    const doppelt = z.letzte && z.letzte.letzte && r.nummer.trim() === z.letzte.letzte && !z.probe;
    $("ewe-s1").innerHTML = `<div class="ewe-felder">
${feld("empfaenger.name", { pflicht: true, klasse: "ewe-breit" })}
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
<fieldset class="ewe-feld ewe-breit ewe-wahl"><legend>${esc(E.leistungArt)}</legend>${radio("datum", E.leistungDatum)}${radio("zeitraum", E.leistungZeitraum)}</fieldset>
${l.art === "zeitraum" ? feld("leistung.von", { pflicht: true, typ: "date" }) + feld("leistung.bis", { pflicht: true, typ: "date" }) : feld("leistung.datum", { pflicht: true, typ: "date" })}
</div>`;
    if (doppelt) $(`${domId("nummer")}-h`).classList.add("ewe-warn");
  }

  // ---------- 02 Positionen ----------
  const steuerOptionen = () => ["S19", "S7", "Z", "E"].map(c => [c, E.steuer[c]]);
  const einheiten = EINHEITEN_ERSTELLEN.map(c => [c, EINHEITEN[c][L]]);
  function schritt2Zeichnen() {
    const r = z.rechnung, f = z.firma, ku = f.kleinunternehmer;
    const zeile = (p, i) => `<li class="ewe-zeile" data-i="${i}">
<p class="ewe-zeile-kopf"><span class="ewe-zeile-nr">${esc(ersetze(E.posNr, { n: i + 1 }))}</span>${knopf("pos-weg", E.posEntfernen, "ewe-link", ` data-i="${i}" aria-label="${esc(ersetze(E.posEntfernenName, { n: i + 1 }))}"`)}</p>
<div class="ewe-zeile-felder">
${feld(`pos.${i}.name`, { pflicht: true, klasse: "ewe-p-name" })}
${feld(`pos.${i}.menge`, { pflicht: true, modus: "decimal", klasse: "ewe-p-zahl" })}
${feld(`pos.${i}.einheit`, { optionen: einheiten, klasse: "ewe-p-einheit" })}
${feld(`pos.${i}.preis`, { pflicht: true, modus: "decimal", klasse: "ewe-p-zahl", label: E.preisKurz })}
${ku ? `<div class="ewe-feld ewe-p-steuer"><span class="ewe-label-fest">${esc(E.felder["pos.steuer"])}</span><p class="ewe-fest">${esc(E.steuer.K)}</p></div>` : feld(`pos.${i}.steuer`, { optionen: steuerOptionen(), klasse: "ewe-p-steuer" })}
${feld(`pos.${i}.beschreibung`, { typ: "textarea", klasse: "ewe-p-beschr" })}
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
${mitZ ? `<p class="ewe-hinweis">${esc(E.nullHinweis)}</p>` : ""}
<div class="ewe-summen" id="ewe-summen"></div>`;
  }

  // ---------- 03 Prüfen und speichern ----------
  function schritt3Zeichnen() {
    $("ewe-s3").innerHTML = `<div class="ewe-felder">
${feld("zielTage", { pflicht: true, modus: "numeric", max: 3, hilfe: "" })}<p class="ewe-feld ewe-ziel-text ewz-klein" id="ewe-ziel-text"></p>
${feld("zweck", { klasse: "ewe-breit", max: 140 })}
${feld("bemerkung", { typ: "textarea", klasse: "ewe-breit" })}
</div>
<div class="ewe-zusammen" id="ewe-zusammen"></div>
<div class="ewe-fehlend" id="ewe-fehlend"></div>
<section class="ewe-pruefung" id="ewe-pruefung" aria-labelledby="ewe-hp"><h3 id="ewe-hp">${esc(t.abschnittBefunde)}</h3><div id="ewe-pruef-inhalt"></div>
<p class="ewz-klein">${esc(ersetze(E.schema, { stand: datumAnzeige(ctx.stand) }))}</p></section>
<div class="ewe-archiv"><p>${esc(ZUSATZ.archiv[lang])}</p>${quellenHtml(ZUSATZ.archiv.quellen)}<p class="ewz-stand">${t.stand}: ${datumAnzeige(STAND)}</p></div>
<div id="ewe-erfolg"></div>`;
  }
  function aktionZeichnen() {
    $("ewe-aktion").innerHTML = `<p class="ewe-aktion-betrag"><span class="ewz-mini">${esc(E.zuZahlen)}</span> <strong id="ewe-zahlbetrag" class="ewz-z"></strong></p>
${knopf("speichern", E.speichernKnopf, "ewz-haupt ewe-speichern")}`;
  }
  function allesZeichnen() { firmaZeichnen(); schritt1Zeichnen(); schritt2Zeichnen(); schritt3Zeichnen(); aktionZeichnen(); probeZeichnen(); aktualisieren(); }
  function probeZeichnen() {
    $("ewe-probe").innerHTML = z.probe ? `<p class="ewe-hinweis ewe-probe-hinweis">${esc(E.probeHinweis)} ${knopf("probe-ende", E.probeEnde)}</p>` : "";
    wurzel.querySelector('[data-e="probe"]').hidden = z.probe;
  }
  // Nach jeder Änderung: Maske, Summen, Fehler am Feld, Vorschau und Prüfung planen
  function aktualisieren() {
    z.meldungen = maskePruefen(z.firma, z.rechnung, lang);
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
    const zeilen = [[E.summeNetto, s.netto], ...s.gruppen.map(g => [g.kategorie === "S" ? ersetze(E.ustSatz, { satz: String(g.satz) }) : `${E.steuer[z.firma.kleinunternehmer ? "K" : g.kategorie]} (${geldAnzeige(g.basis, lang)})`, g.steuer])];
    const tab = $("ewe-summen");
    if (tab) tab.innerHTML = `<table class="ewe-summen-tab"><tbody>${zeilen.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td class="ewz-z">${geldAnzeige(v, lang)}</td></tr>`).join("")}
<tr class="ewe-stark"><th scope="row">${esc(E.zuZahlen)}</th><td class="ewz-z">${geldAnzeige(s.zahlbetrag, lang)}</td></tr></tbody></table>`;
    const r = z.rechnung, ziel = /^\d{1,3}$/.test(String(r.zielTage).trim()) ? +r.zielTage : null;
    const faellig = datumGueltig(r.datum) && ziel != null ? datumPlus(r.datum, ziel) : "";
    const zt = $("ewe-ziel-text");
    if (zt) zt.textContent = faellig ? (ziel ? ersetze(E.zahlbarBis, { datum: datumAnzeige(faellig) }) : E.zahlbarSofort) : "";
    const zus = $("ewe-zusammen");
    if (zus) zus.innerHTML = `<p class="ewz-mini">${esc(E.zuZahlen)}</p><p class="ewe-gross ewz-z">${geldAnzeige(s.zahlbetrag, lang)}</p>
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
    const xml = ublSchreiben(z.firma, z.rechnung);
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
    z.pruefung = e.pruefung; z.geprueft = { xml, e };
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
  async function speichernKlick() {
    z.alleZeigen = true;
    aktualisieren();
    if (z.meldungen.length) {
      const n = z.meldungen.length;
      status(esc(n === 1 ? E.gesperrt1 : ersetze(E.gesperrt, { n })));
      zumFeld(z.meldungen[0].feld);
      return;
    }
    const b = wurzel.querySelector('[data-e="speichern"]');
    b.setAttribute("aria-busy", "true");
    clearTimeout(pruefUhr);
    let r = null;
    for (let i = 0; i < 3 && !r; i++) r = await pruefenJetzt();
    b.removeAttribute("aria-busy");
    if (!r || !speichernErlaubt(r.e.pruefung)) {
      status(esc(r && r.e.pruefung.status === "fehler" ? ersetze(E.pruefKaputt, { meldung: r.e.pruefung.meldung }) : E.pruefFehler));
      $("ewe-hp").tabIndex = -1; $("ewe-hp").focus();
      return;
    }
    const datei = dateiName(z.rechnung.nummer);
    ctx.speichern(datei, r.xml, "application/xml");
    const nummer = z.rechnung.nummer.trim();
    if (!z.probe) { nummerMerken(nummer, z.rechnung.datum); z.letzte = { v: 1, letzte: nummer, datum: z.rechnung.datum }; }
    z.gespeichert = { datei, xml: r.xml, e: r.e };
    const naechste = naechsteNummer(z.probe ? nummer : z.letzte.letzte, heute());
    $("ewe-erfolg").innerHTML = `<div class="ewe-erfolg"><p class="ewe-erfolg-text" tabindex="-1" id="ewe-erfolg-text"><strong>${esc(ersetze(E.gespeichert, { datei }))}</strong></p>
${z.probe ? "" : `<p class="ewz-klein">${esc(ersetze(E.naechsteNr, { nummer: naechste }))}</p>`}
<div class="ewe-knoepfe">${knopf("drucken", E.drucken)}${knopf("im-pruefen", E.imPruefen)}${knopf("naechste", E.naechste)}</div></div>`;
    status(esc(ersetze(E.gespeichert, { datei })));
    $("ewe-erfolg-text").focus();
  }
  function drucken() {
    const g = z.gespeichert || z.geprueft;
    if (!g) return;
    ctx.druckenHtml(`${ctx.ansichtHtml(g.e)}<div class="ewe-druck-giro">${ctx.zahlenHtml(g.e)}</div>`);
  }
  function naechste() {
    const ziel = z.rechnung.zielTage;
    z.rechnung = neueRechnung(z.firma, z.probe ? { letzte: z.rechnung.nummer } : z.letzte, ziel);
    z.beruehrt.clear(); z.alleZeigen = false; z.gespeichert = null;
    allesZeichnen();
    $(domId("empfaenger.name")).focus();
  }

  // ---------- Beispieldaten (Regel 12): erfunden, nichts wird im Gerät gespeichert, die Nummer zählt nicht weiter ----------
  function probeStarten() {
    z.sicherung = { firma: z.firma, rechnung: z.rechnung, firmaOffen: z.firmaOffen };
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
  const firmaSpaeterSichern = () => { if (z.probe) return; clearTimeout(firmaUhr); firmaUhr = setTimeout(() => firmaSichern(z.firma), 250); };
  function firmaWeiter() {
    FIRMA_FELDER.forEach(f => z.beruehrt.add(f));
    aktualisieren();
    const erste = z.meldungen.find(m => m.feld.startsWith("firma."));
    if (erste) { zumFeld(erste.feld); return; }
    if (!z.probe) firmaSichern(z.firma);
    z.firmaOffen = false; firmaZeichnen(); schritt2Zeichnen(); aktualisieren();
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
  async function firmaAusDatei(datei) {
    const d = firmaImport(await datei.text().catch(() => ""));
    if (!d) { status(esc(E.importFehler)); return; }
    z.firma = d.firma; firmaSichern(z.firma);
    if (d.nummer && d.nummer.letzte) { z.letzte = { v: 1, ...d.nummer }; nummerMerken(d.nummer.letzte, d.nummer.datum); z.rechnung.nummer = naechsteNummer(d.nummer.letzte, heute()); }
    FIRMA_FELDER.forEach(f => z.beruehrt.add(f));
    allesZeichnen();
    status(esc(E.importOk));
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
    if (f === "befreiung.wahl") { const b = BEFREIUNGEN.find(x => x.id === el.value); z.rechnung.befreiung.text = b ? b.text : ""; }
    if (f.startsWith("firma.")) firmaSpaeterSichern();
    if (f === "firma.kleinunternehmer") z.rechnung.positionen.forEach(p => { if (z.firma.kleinunternehmer) p.steuer = "E"; else if (p.steuer === "E") p.steuer = z.firma.vorgaben.satz || "S19"; });
    if (ganzNeu.has(f) || /^pos\.\d+\.steuer$/.test(f)) {
      const id = document.activeElement && document.activeElement.id, wahl = el.type === "radio" ? el.value : null;
      if (f.startsWith("firma.")) firmaZeichnen();
      if (f.startsWith("empfaenger.") || f.startsWith("leistung.")) schritt1Zeichnen();
      schritt2Zeichnen();
      const neu = wahl ? wurzel.querySelector(`input[name="ewe-leistung-art"][value="${wahl}"]`) : id && $(id);
      if (neu) neu.focus();
    }
    if (f === "nummer") {
      const h = $(`${domId("nummer")}-h`), doppelt = z.letzte && z.letzte.letzte === String(el.value).trim() && !z.probe;
      if (h) { h.textContent = doppelt ? E.doppelt : E.hilfe.nummer; h.classList.toggle("ewe-warn", !!doppelt); }
    }
    aktualisieren();
  }
  wurzel.addEventListener("input", ev => { const el = ev.target; if (el.dataset.feld && !["checkbox", "radio", "select-one"].includes(el.type)) eingabe(el); });
  wurzel.addEventListener("change", ev => { const el = ev.target; if (el.dataset.feld && ["checkbox", "radio", "select-one"].includes(el.type)) eingabe(el); });
  wurzel.addEventListener("focusout", ev => {
    const f = ev.target.dataset && ev.target.dataset.feld;
    if (!f || z.beruehrt.has(f)) return;
    z.beruehrt.add(f); fehlerZeigen();
  });
  $("ewe-import-datei").addEventListener("change", ev => { const d = ev.target.files[0]; ev.target.value = ""; if (d) firmaAusDatei(d); });
  wurzel.addEventListener("click", ev => {
    const zf = ev.target.closest("[data-zumfeld]");
    if (zf) { ev.preventDefault(); zumFeld(zf.dataset.zumfeld); return; }
    const b = ev.target.closest("[data-e]");
    if (!b) return;
    switch (b.dataset.e) {
      case "speichern": speichernKlick(); break;
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
    get zustand() { return { firma: z.firma, rechnung: z.rechnung, meldungen: z.meldungen, pruefung: z.pruefung, gespeichert: z.gespeichert && { datei: z.gespeichert.datei, xml: z.gespeichert.xml }, probe: z.probe, letzte: z.letzte }; },
  };
}
