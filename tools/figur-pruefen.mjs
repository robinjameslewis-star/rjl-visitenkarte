// Prüft ein Figurenpaket (Anleitung: FIGUREN.md): Pflichtfelder in figur.json, Bildmaße und Augenpunkte,
// Dateigrößen, Signalton und Rechte-Eintrag. Ohne Abhängigkeiten; Bildmaße und Tondauer kommen aus dem Dateikopf.
//   node tools/figur-pruefen.mjs figuren/goch [--html index.html]
//   node tools/figur-pruefen.mjs /var/lib/goch-kiosk/figuren/kunde-x      (Kundenfigur auf dem Gerät)
// --html prüft zusätzlich, ob die Szene der Startseite (Bildmaße, CSS-Versätze der Flugposen) zu figur.json passt.
// Rückgabewert 1 bei Fehlern; Hinweise (z. B. Platzhalter statt Pose) brechen nicht ab.
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, basename, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Posen der Figur und ihre Namen in der Szene (data-pose in index.html, kiosk.html)
export const POSEN = { sitzend: "rest", aufschlag: "up", gleiten: "glide", abschlag: "down", landeanflug: "landing",
  "schnabel-halb": "halb", "schnabel-offen": "offen", lauschend: "lauschen", zwitschernd: "zwitschern", blinzelnd: "blinzeln" };
export const PFLICHT = ["sitzend", "schnabel-halb", "schnabel-offen", "lauschend"];
export const FLUG = ["aufschlag", "gleiten", "abschlag", "landeanflug"];
export const PLATZHALTER = ["neigen", "keiner"]; // neigen: leichte Kopfbewegung über .bird-tilt, bis die Pose da ist
export const GRENZEN = { bild: 250 * 1024, fassung: 1536 * 1024, ton: 50 * 1024, tonMin: 0.5, tonMax: 1.5 };
const SPRACHEN = ["de", "en"];
const HEX = /^#[0-9a-fA-F]{6}$/;

// Breite und Höhe aus dem Kopf einer WebP- oder PNG-Datei; null, wenn das Format nicht erkannt wird.
export function bildmasse(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString("ascii", 12, 16) === "IHDR")
    return { format: "png", breite: buf.readUInt32BE(16), hoehe: buf.readUInt32BE(20) };
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { format: "webp", breite: 1 + buf.readUIntLE(24, 3), hoehe: 1 + buf.readUIntLE(27, 3) };
  if (chunk === "VP8L" && buf[20] === 0x2f) {
    const bits = buf.readUInt32LE(21);
    return { format: "webp", breite: 1 + (bits & 0x3fff), hoehe: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (chunk === "VP8 " && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a)
    return { format: "webp", breite: buf.readUInt16LE(26) & 0x3fff, hoehe: buf.readUInt16LE(28) & 0x3fff };
  return null;
}

// Dauer einer Ogg/Opus-Datei in Sekunden: Granulposition der letzten Seite minus Vorlauf (OpusHead), bei 48 kHz.
export function opusDauer(buf) {
  const head = buf.indexOf("OpusHead");
  const last = buf.lastIndexOf("OggS");
  if (head < 0 || last < 0 || last + 14 > buf.length) return null;
  const granule = Number(buf.readBigInt64LE(last + 6)), preskip = buf.readUInt16LE(head + 10);
  return granule > 0 ? (granule - preskip) / 48000 : null;
}

// Lage einer Pose in der Bühne, am Auge auf die Sitzpose ausgerichtet: links/oben/breite in Prozent der Bühne
// (so stehen sie im CSS der Szene, z. B. .bird-up { left: -14.7441%; top: -40.8451% }).
export function versatz(figur, name) {
  const a = figur.animation, p = a.posen[name];
  return {
    links: -(p.auge[0] - a.auge[0]) / a.buehne.breite * 100,
    oben: -(p.auge[1] - a.auge[1]) / a.buehne.hoehe * 100,
    breite: p.breite / a.buehne.breite * 100,
  };
}

const istText = v => typeof v === "string" && v.trim().length > 0;
const istZahl = v => Number.isInteger(v) && v > 0;
const istPunkt = v => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);
const kb = n => Math.round(n / 1024) + " KB";

// Alle Dateien unter einem Ordner, relativ zum Paket (ohne .DS_Store)
function dateien(paket, unterordner) {
  const start = join(paket, unterordner);
  if (!existsSync(start)) return [];
  const out = [];
  const lauf = dir => readdirSync(dir, { withFileTypes: true }).forEach(e => {
    if (e.name === ".DS_Store" || e.name === ".gitkeep") return;
    const p = join(dir, e.name);
    e.isDirectory() ? lauf(p) : out.push(relative(paket, p));
  });
  lauf(start);
  return out.sort();
}

// Rechte-Eintrag: Jede Datei unter bilder/ und toene/ muss in RECHTE.md in Backticks genannt sein (Muster mit * erlaubt).
function genannt(rechte, datei) {
  const namen = [...rechte.matchAll(/`([^`]+)`/g)].map(m => m[1].trim());
  return namen.some(n => n === datei || (n.includes("*") &&
    new RegExp("^" + n.split("*").map(s => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*") + "$").test(datei)));
}

export function pruefen(ordner, { html } = {}) {
  const fehler = [], hinweise = [];
  const paket = resolve(ordner);
  const f = t => fehler.push(t), h = t => hinweise.push(t);
  let figur;
  try { figur = JSON.parse(readFileSync(join(paket, "figur.json"), "utf8")); }
  catch (e) { f("figur.json fehlt oder ist kein gültiges JSON: " + e.message); return { fehler, hinweise, figur: null }; }

  // Stammdaten
  if (figur.format !== 1) f("format muss 1 sein");
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(figur.id || "")) f("id: nur a–z, 0–9 und Bindestrich, höchstens 40 Zeichen");
  else if (figur.id !== basename(paket)) f(`id „${figur.id}“ muss dem Ordnernamen „${basename(paket)}“ entsprechen`);
  const sprachen = Array.isArray(figur.sprachen) ? figur.sprachen : [];
  if (!sprachen.length || !sprachen.every(s => SPRACHEN.includes(s))) f("sprachen: Liste aus „de“ und/oder „en“");
  for (const s of sprachen) {
    if (!istText(figur.name && figur.name[s])) f(`name.${s} fehlt`);
    if (!istText(figur.rolle && figur.rolle[s])) f(`rolle.${s} fehlt`);
  }
  if (typeof figur.oeffentlich !== "boolean") f("oeffentlich: true (Repo, Website) oder false (Kundenfigur, nur auf dem Gerät)");
  const kunde = figur.oeffentlich === false;

  // Texte: Verweise auf language.js oder eigene Texte je Sprache
  const t = figur.texte || {};
  if (t.quelle === "language.js") {
    const k = t.schluessel || {};
    if (!istText(k.begruessung) || !Array.isArray(k.einstiegsfragen) || !k.einstiegsfragen.length) f("texte.schluessel: begruessung und einstiegsfragen nennen");
    if (kunde) f("Kundenfiguren bringen eigene Texte mit (texte.quelle „figur“); language.js ist öffentlich");
  } else if (t.quelle === "figur") {
    for (const s of sprachen) {
      if (!istText(t.begruessung && t.begruessung[s])) f(`texte.begruessung.${s} fehlt`);
      const fragen = t.einstiegsfragen && t.einstiegsfragen[s];
      if (!Array.isArray(fragen) || fragen.length < 1 || fragen.length > 4 || !fragen.every(istText)) f(`texte.einstiegsfragen.${s}: eine bis vier Fragen`);
    }
  } else f("texte.quelle: „language.js“ oder „figur“");

  // Wissen: öffentlich im Repository, Kundenfiguren nur in der Redaktion (KV)
  const w = figur.wissen || {};
  if (w.quelle === "repository") {
    if (kunde) f("Wissen einer Kundenfigur gehört in die Redaktion (wissen.quelle „redaktion“), nie ins Repository");
    const root = resolve(paket, "..", "..");
    for (const k of ["profil", "aktuell", "links"]) {
      if (!istText(w[k])) f(`wissen.${k} fehlt`);
      else if (!existsSync(join(root, w[k]))) f(`wissen.${k}: ${w[k]} nicht gefunden`);
    }
  } else if (w.quelle !== "redaktion") f("wissen.quelle: „repository“ (öffentlich) oder „redaktion“");

  // Animation
  const a = figur.animation || {};
  const fassungen = a.fassungen && typeof a.fassungen === "object" ? Object.entries(a.fassungen) : [];
  if (!fassungen.length) f("animation.fassungen: mindestens eine, z. B. { \"standard\": \"bilder/\" }");
  for (const [name, dir] of fassungen) {
    if (typeof dir !== "string" || !/^bilder\/([a-z0-9-]+\/)*$/.test(dir)) f(`Fassung „${name}“: Ordner unter bilder/, mit / am Ende`);
    else if (!existsSync(join(paket, dir))) f(`Fassung „${name}“: Ordner ${dir} fehlt`);
  }
  const bild = (datei, breite, hoehe, label) => {
    let summe = 0;
    for (const [fassung, dir] of fassungen) {
      const pfad = join(paket, dir, datei), wo = `${label} (${fassung})`;
      if (!existsSync(pfad)) { f(`${wo}: ${dir}${datei} fehlt`); continue; }
      const buf = readFileSync(pfad), m = bildmasse(buf);
      summe += buf.length;
      if (!m) f(`${wo}: kein WebP oder PNG`);
      else if (m.breite !== breite || m.hoehe !== hoehe) f(`${wo}: ${m.breite} × ${m.hoehe} px, laut figur.json ${breite} × ${hoehe}`);
      if (buf.length > GRENZEN.bild) f(`${wo}: ${kb(buf.length)}, höchstens ${kb(GRENZEN.bild)}`);
    }
    return summe;
  };
  if (a.art === "posen") {
    const b = a.buehne || {};
    if (!istZahl(b.breite) || !istZahl(b.hoehe)) f("animation.buehne: breite und hoehe in Pixel");
    if (!istPunkt(a.auge) || a.auge[0] < 0 || a.auge[1] < 0 || a.auge[0] > b.breite || a.auge[1] > b.hoehe) f("animation.auge: [x, y] innerhalb der Bühne");
    const posen = a.posen && typeof a.posen === "object" ? a.posen : {};
    for (const k of Object.keys(posen)) if (!(k in POSEN)) f(`Pose „${k}“ unbekannt (erlaubt: ${Object.keys(POSEN).join(", ")})`);
    for (const k of PFLICHT) {
      const p = posen[k];
      if (!p) f(`Pflichtpose „${k}“ fehlt`);
      else if (p.datei == null) PLATZHALTER.includes(p.platzhalter) ? h(`Pose „${k}“ fehlt noch – Platzhalter „${p.platzhalter}“`) : f(`Pose „${k}“: datei oder platzhalter („neigen“, „keiner“) angeben`);
    }
    const flug = FLUG.filter(k => posen[k] && posen[k].datei);
    if (flug.length && flug.length !== FLUG.length) f(`Flugposen nur vollständig: ${FLUG.join(", ")}`);
    if (!flug.length) h("ohne Flugposen: die Figur erscheint ohne Anflug");
    if (posen.zwitschernd && posen.zwitschernd.datei == null && posen.zwitschernd.platzhalter == null) f("Pose „zwitschernd“: datei oder platzhalter angeben");
    const summe = {};
    for (const [k, p] of Object.entries(posen)) {
      if (!p || p.datei == null || !(k in POSEN)) continue;
      if (!istText(p.datei) || !/^[a-z0-9][a-z0-9.-]*\.(webp|png)$/.test(p.datei)) { f(`Pose „${k}“: Dateiname a–z, 0–9, Bindestrich, .webp oder .png`); continue; }
      if (!istZahl(p.breite) || !istZahl(p.hoehe)) { f(`Pose „${k}“: breite und hoehe angeben`); continue; }
      if (!istPunkt(p.auge) || p.auge[0] < 0 || p.auge[1] < 0 || p.auge[0] >= p.breite || p.auge[1] >= p.hoehe) f(`Pose „${k}“: auge [x, y] innerhalb des Bildes (${p.breite} × ${p.hoehe})`);
      summe[k] = bild(p.datei, p.breite, p.hoehe, `Pose „${k}“`);
    }
    const s = posen.sitzend;
    if (s && s.datei && (s.breite !== b.breite || !istPunkt(s.auge) || s.auge[0] !== a.auge[0] || s.auge[1] !== a.auge[1]))
      f("Sitzpose füllt die Bühnenbreite: sitzend.breite = buehne.breite und sitzend.auge = animation.auge");
    const gesamt = Object.values(summe).reduce((x, y) => x + y, 0) / Math.max(1, fassungen.length);
    if (gesamt > GRENZEN.fassung) f(`Posen zusammen ${kb(gesamt)} je Fassung, höchstens ${kb(GRENZEN.fassung)}`);
  } else if (a.art === "logo") {
    const l = a.logo || {};
    if (!istText(l.datei) || !istZahl(l.breite) || !istZahl(l.hoehe)) f("animation.logo: datei, breite, hoehe");
    else bild(l.datei, l.breite, l.hoehe, "Logo");
    const puls = a.puls || { min: 1, max: 1.06 };
    if (!(puls.min >= 0.8 && puls.max <= 1.25 && puls.min < puls.max)) f("animation.puls: min ≥ 0,8, max ≤ 1,25, min < max");
  } else f("animation.art: „posen“ oder „logo“");

  // Ebenen (optional, z. B. Gochs Ast): fest in der Bühne, Lage in Pixeln der Bühne bzw. des Logos
  const flaeche = a.art === "logo" ? a.logo || {} : a.buehne || {};
  if (a.ebenen != null && !Array.isArray(a.ebenen)) f("animation.ebenen: Liste");
  for (const [i, e] of (Array.isArray(a.ebenen) ? a.ebenen : []).entries()) {
    const wo = `Ebene ${i + 1}${e && e.name ? " „" + e.name + "“" : ""}`;
    if (!e || !/^[a-z0-9-]{1,30}$/.test(e.name || "")) { f(`${wo}: name a–z, 0–9, Bindestrich`); continue; }
    if (!istText(e.datei) || !/^[a-z0-9][a-z0-9.-]*\.(webp|png)$/.test(e.datei) || !istZahl(e.breite) || !istZahl(e.hoehe)) { f(`${wo}: datei (.webp/.png), breite, hoehe`); continue; }
    if (![e.links, e.oben].every(Number.isFinite) || e.links < 0 || e.oben < 0 || e.links + e.breite > flaeche.breite + 0.5 || e.oben > flaeche.hoehe) f(`${wo}: links/oben in Pixeln innerhalb der Bühne`);
    if (typeof e.vorne !== "boolean") f(`${wo}: vorne true (über der Figur) oder false (dahinter)`);
    const nur = e.fassungen == null ? fassungen.map(([n]) => n) : e.fassungen;
    if (!Array.isArray(nur) || !nur.length || !nur.every(n => a.fassungen && a.fassungen[n])) { f(`${wo}: fassungen nur aus animation.fassungen`); continue; }
    for (const n of nur) {
      const pfad = join(paket, a.fassungen[n], e.datei);
      if (!existsSync(pfad)) { f(`${wo} (${n}): ${a.fassungen[n]}${e.datei} fehlt`); continue; }
      const buf = readFileSync(pfad), m = bildmasse(buf);
      if (!m || m.breite !== e.breite || m.hoehe !== e.hoehe) f(`${wo} (${n}): ${m ? m.breite + " × " + m.hoehe : "kein Bild"}, laut figur.json ${e.breite} × ${e.hoehe}`);
      if (buf.length > GRENZEN.bild) f(`${wo} (${n}): ${kb(buf.length)}, höchstens ${kb(GRENZEN.bild)}`);
    }
  }

  // Signalton: Ogg/Opus mit MP3-Rückfall, kurz, klein
  const ton = figur.signalton || {};
  if (ton.datei == null) h("kein Signalton – die Figur macht sich nur sichtbar bemerkbar");
  else {
    const pfad = join(paket, "toene", String(ton.datei));
    if (!/\.(ogg|opus)$/.test(ton.datei)) f("signalton.datei: Ogg/Opus (.ogg oder .opus) unter toene/");
    else if (!existsSync(pfad)) f(`signalton: toene/${ton.datei} fehlt`);
    else {
      const buf = readFileSync(pfad), d = opusDauer(buf);
      if (buf.length > GRENZEN.ton) f(`signalton: ${kb(buf.length)}, höchstens ${kb(GRENZEN.ton)}`);
      if (d == null) f("signalton: Dauer nicht lesbar (kein Ogg/Opus?)");
      else if (d < GRENZEN.tonMin || d > GRENZEN.tonMax) f(`signalton: ${d.toFixed(2)} s, erlaubt ${GRENZEN.tonMin}–${GRENZEN.tonMax} s`);
    }
    const mp3 = join(paket, "toene", String(ton.rueckfall || ""));
    if (!ton.rueckfall || !/\.mp3$/.test(ton.rueckfall) || !existsSync(mp3)) f("signalton.rueckfall: MP3 unter toene/ (Safari)");
    else if (statSync(mp3).size > GRENZEN.ton) f(`signalton.rueckfall: ${kb(statSync(mp3).size)}, höchstens ${kb(GRENZEN.ton)}`);
  }
  if (ton.lautstaerke != null && !(ton.lautstaerke > 0 && ton.lautstaerke <= 1)) f("signalton.lautstaerke: zwischen 0 und 1");

  // Stimme
  const st = figur.stimme || {};
  if (!["elevenlabs", "browser", "keine"].includes(st.anbieter)) f("stimme.anbieter: „elevenlabs“, „browser“ oder „keine“");
  if (!["browser", "keine"].includes(st.rueckfall)) f("stimme.rueckfall: „browser“ oder „keine“");
  if (st.anbieter === "elevenlabs" && !istText(st.voiceId)) h("stimme.voiceId leer – in der Redaktion eintragen");
  if (kunde && istText(st.voiceId)) h("stimme.voiceId einer Kundenfigur gehört in die Redaktion, nicht in die Datei");
  const ein = st.einstellungen || {}, bereich = { stability: [0, 1], similarity_boost: [0, 1], style: [0, 1], speed: [0.7, 1.2] };
  for (const [k, v] of Object.entries(ein)) {
    if (k === "use_speaker_boost") { if (typeof v !== "boolean") f("stimme.einstellungen.use_speaker_boost: true oder false"); }
    else if (!bereich[k]) f(`stimme.einstellungen.${k}: unbekannt (erlaubt: ${Object.keys(bereich).join(", ")}, use_speaker_boost)`);
    else if (!(v >= bereich[k][0] && v <= bereich[k][1])) f(`stimme.einstellungen.${k}: ${bereich[k][0]} bis ${bereich[k][1]}`);
  }
  if (st.seed != null && !(Number.isInteger(st.seed) && st.seed >= 0 && st.seed <= 4294967295)) f("stimme.seed: ganze Zahl ab 0");
  if (st.rueckfall === "keine" && st.browser) h("stimme.browser wird nicht genutzt (rueckfall „keine“: nur die Stimme vom Server)");
  const br = st.browser;
  if (br) {
    for (const s of ["de", "en"]) if (br[s] != null && !(Array.isArray(br[s]) && br[s].every(istText))) f(`stimme.browser.${s}: Liste von Stimmnamen`);
    if (br.tonhoehe != null && !(br.tonhoehe >= 0.5 && br.tonhoehe <= 1.5)) f("stimme.browser.tonhoehe: 0,5 bis 1,5");
    if (br.tempo != null && !(br.tempo >= 0.5 && br.tempo <= 1.5)) f("stimme.browser.tempo: 0,5 bis 1,5");
  }

  // Farben und Kiosk
  for (const [k, v] of Object.entries(figur.farben || {})) if (!HEX.test(v)) f(`farben.${k}: #RRGGBB`);
  const ki = figur.kiosk;
  if (ki) {
    if (ki.groesse != null && !(ki.groesse >= 0.3 && ki.groesse <= 1)) f("kiosk.groesse: 0,3 bis 1 (Anteil der Bildschirmbreite)");
    const z = ki.zwitschern || {};
    if (z.abklingzeit_s != null && !(z.abklingzeit_s >= 5)) f("kiosk.zwitschern.abklingzeit_s: mindestens 5");
    if (z.entfernung_m != null && !(Array.isArray(z.entfernung_m) && z.entfernung_m.length === 2 && z.entfernung_m[0] < z.entfernung_m[1])) f("kiosk.zwitschern.entfernung_m: [von, bis] in Metern");
  }

  // Rechte: jede Datei genannt; Kundenfiguren mit Freigabe des Kunden
  const rechtePfad = join(paket, "RECHTE.md");
  if (!existsSync(rechtePfad)) f("RECHTE.md fehlt");
  else {
    const rechte = readFileSync(rechtePfad, "utf8");
    for (const d of [...dateien(paket, "bilder"), ...dateien(paket, "toene")])
      if (!genannt(rechte, d)) f(`RECHTE.md nennt ${d} nicht (Herkunft, Werkzeug, Lizenz)`);
    if (kunde) {
      const teil = rechte.split(/^## /m).find(s => /^Freigabe des Kunden/i.test(s));
      if (!teil || !/\b(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})\b/.test(teil)) f("RECHTE.md: Abschnitt „## Freigabe des Kunden“ mit Datum fehlt");
    }
  }

  // Kundenmaterial nie ins öffentliche Repo
  if (kunde) {
    try {
      const tracked = execFileSync("git", ["-C", paket, "ls-files", "."], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (tracked) f("Kundenfigur liegt in Git: " + tracked.split("\n").slice(0, 3).join(", ") + " – sofort entfernen, nie committen");
      else h("Kundenfigur liegt in einem Git-Arbeitsordner (nicht versioniert); besser außerhalb, z. B. /var/lib/goch-kiosk/figuren/");
    } catch { /* kein Git-Ordner: richtig so */ }
  }

  if (html && a.art === "posen") pruefeSzene(figur, paket, html, f);
  return { fehler, hinweise, figur };
}

// Szene einer Seite gegen figur.json: Bildmaße an den <img>, Pfade ins Paket, CSS-Versätze der Flugposen.
function pruefeSzene(figur, paket, htmlPfad, f) {
  const html = readFileSync(htmlPfad, "utf8");
  const szene = (html.match(/<button class="scene"[\s\S]*?<\/button>/) || [""])[0];
  if (!szene) { f(`${htmlPfad}: keine Szene gefunden`); return; }
  const a = figur.animation, rund = x => Math.round(x * 10000) / 10000;
  const prefix = relative(resolve(htmlPfad, ".."), paket).split("\\").join("/") + "/bilder/";
  for (const [k, p] of Object.entries(a.posen)) {
    if (!p || !p.datei) continue;
    // Schnabelposen und Blinzeln lädt die Startseite erst beim Sprechen: data-mundpose und data-src-spaet statt data-pose und src
    const attr = k.startsWith("schnabel-") || k === "blinzelnd" ? "data-mundpose" : "data-pose";
    const img = (szene.match(new RegExp(`<img[^>]*${attr}="${POSEN[k]}"[^>]*>`)) || [""])[0];
    if (!img) { f(`Szene: Bild für Pose „${k}“ (${attr}="${POSEN[k]}") fehlt`); continue; }
    const src = (img.match(/ (?:data-src-spaet|data-src|src)="([^"]+)"/) || [])[1] || "";
    if (!src.startsWith(prefix) || !src.endsWith("/" + p.datei)) f(`Szene: Pose „${k}“ zeigt auf ${src}, erwartet ${prefix}…${p.datei}`);
    const w = +(img.match(/width="(\d+)"/) || [])[1], hh = +(img.match(/height="(\d+)"/) || [])[1];
    if (w !== p.breite || hh !== p.hoehe) f(`Szene: Pose „${k}“ hat width/height ${w} × ${hh}, laut figur.json ${p.breite} × ${p.hoehe}`);
  }
  const css = html.match(/<style[\s\S]*?<\/style>/g)?.join("\n") || "";
  const regel = sel => (css.match(new RegExp(`\\${sel}\\s*\\{([^}]*)\\}`)) || [])[1] || "";
  const prozent = (text, eig) => { const m = text.match(new RegExp(`(?:^|[;\\s])${eig}:\\s*(-?[\\d.]+)%`)); return m ? +m[1] : NaN; };
  const flug = FLUG.filter(k => a.posen[k] && a.posen[k].datei);
  if (flug.length) {
    const breite = prozent(regel(".bird-flight"), "width"), soll = rund(versatz(figur, flug[0]).breite);
    if (Math.abs(breite - soll) > 0.0002) f(`CSS .bird-flight: width ${breite}%, aus figur.json ${soll}%`);
  }
  // Ebenen mit Gegenstück in der Szene (css, z. B. ".branch"): gleiche Höhe wie im CSS der Seite
  for (const e of a.ebenen || []) {
    if (!e || !e.css) continue;
    const oben = prozent(regel(e.css), "top"), soll = e.oben / a.buehne.hoehe * 100;
    if (!(Math.abs(oben - soll) <= 0.01)) f(`CSS ${e.css}: top ${oben}%, aus figur.json ${rund(soll)}% (Ebene „${e.name}“)`);
  }
  for (const k of flug) {
    const v = versatz(figur, k), r = regel(".bird-" + POSEN[k]);
    const links = prozent(r, "left"), oben = prozent(r, "top");
    if (Math.abs(links - rund(v.links)) > 0.0002 || Math.abs(oben - rund(v.oben)) > 0.0002)
      f(`CSS .bird-${POSEN[k]}: left ${links}%, top ${oben}% – aus dem Augenpunkt ${rund(v.links)}%, ${rund(v.oben)}%`);
  }
}

// Aufruf von der Kommandozeile
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), i = args.indexOf("--html");
  const html = i >= 0 ? args.splice(i, 2)[1] : null;
  const ordner = args[0];
  if (!ordner) { console.error("Aufruf: node tools/figur-pruefen.mjs <Figurenordner> [--html index.html]"); process.exit(2); }
  const { fehler, hinweise, figur } = pruefen(ordner, { html });
  console.log(`Figur ${figur ? `„${figur.name && figur.name.de || figur.id}“ (${figur.id})` : ordner}`);
  hinweise.forEach(x => console.log("  Hinweis " + x));
  fehler.forEach(x => console.log("  FEHLER  " + x));
  console.log(fehler.length ? `\n${fehler.length} Fehler.` : "\nPaket in Ordnung.");
  process.exit(fehler.length ? 1 : 0);
}
