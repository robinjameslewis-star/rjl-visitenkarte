// Lizenz-Tor für die SmartFormular-Werkzeuge (E-Rechnung lite, FiBu lite) – Gegenstück zu worker/src/lizenz.js.
// Eine Datei ohne Abhängigkeiten; E-Rechnung lite bindet sie über esbuild ein, FiBu lite (Repository buchungsstapel-lokal) als Kopie
// (browser/src/lizenz.js – beim Ändern dort mit übernehmen).
//
// lizenzTor({ werkzeug, lang, oeffentlich, wurzel, leiste }) → Promise, die sich erfüllt, sobald das Werkzeug arbeiten darf.
//   Vor dem 1. Januar 2027 sofort (keine Anmeldung, kein Netz). Danach: gültiger, signierter Status im Gerät → sofort, und im
//   Hintergrund ein frischer Status; sonst Anmeldemaske in `wurzel` (E-Mail → Code), bei Testende oder abgelaufener Lizenz der Weg
//   zum Kauf. `leiste` (Element, wahlweise) zeigt „Angemeldet als … · Test bis …“.
// Im Gerät liegen nur Sitzung und signierter Status (localStorage „rvlizenz:<werkzeug>“) – keine Rechnungen, keine Auszüge.

export const LIZENZPFLICHT_AB = Date.UTC(2026, 11, 31, 23); // 1. Januar 2027, 0 Uhr MEZ
const TAG = 86400000;
const WORKER = "https://goch.robin.vision/lizenz/";

const T = {
  de: {
    namen: { erechnung: "SmartFormular E-Rechnung lite", fibu: "SmartFormular FiBu lite" },
    anmeldenTitel: "Anmelden und weiterarbeiten",
    anmeldenText: n => `Seit dem 1. Januar 2027 braucht ${n} eine Anmeldung. Die ersten vier Wochen sind ein kostenloser Test. Sie bekommen einen Code per E-Mail – ein Passwort gibt es nicht. Ihre Dateien bleiben auf Ihrem Gerät.`,
    email: "E-Mail-Adresse", codeSchicken: "Code schicken", codeLabel: e => `Code aus der E-Mail an ${e} (sechs Ziffern, zehn Minuten gültig)`,
    anmelden: "Anmelden", neuerCode: "Neuen Code", andereAdresse: "Andere Adresse",
    testendeTitel: "Der Test ist beendet", abgelaufenTitel: "Ihre Lizenz ist abgelaufen",
    kaufText: n => `Für die weitere Nutzung von ${n} brauchen Sie eine Lizenz für ein Jahr. Sie verlängert sich nicht automatisch.`,
    kaufen: "Lizenz kaufen", kaufAus: "Der Kauf ist noch nicht freigeschaltet. Bitte schreiben Sie an robin@robin.vision.",
    kaufOffen: "Der Kauf ist in einem neuen Fenster geöffnet. Danach hier auf „Status aktualisieren“ drücken.",
    aktualisieren: "Status aktualisieren", abmelden: "Abmelden", angemeldet: e => `Angemeldet als ${e}`,
    testBis: d => `Test bis ${d}`, lizenzBis: d => `Lizenz bis ${d}`,
    offlineTitel: "Keine Verbindung", offlineText: "Für die Anmeldung braucht das Werkzeug einmal Internet. Danach arbeitet es bis zu 30 Tage auch ohne Verbindung.",
    nochmal: "Erneut versuchen", fehler: "Das hat nicht geklappt. Bitte später noch einmal versuchen.",
    keinSchluessel: "Die Lizenzprüfung ist in dieser Fassung nicht eingerichtet. Bitte laden Sie das Werkzeug neu von robin.vision.",
    datum: ms => new Date(ms).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
  },
  en: {
    namen: { erechnung: "SmartFormular E-Rechnung lite", fibu: "SmartFormular FiBu lite" },
    anmeldenTitel: "Sign in to keep working",
    anmeldenText: n => `Since 1 January 2027, ${n} requires signing in. The first four weeks are a free trial. You get a code by email – there is no password. Your files stay on your device.`,
    email: "Email address", codeSchicken: "Send code", codeLabel: e => `Code from the email to ${e} (six digits, valid for ten minutes)`,
    anmelden: "Sign in", neuerCode: "New code", andereAdresse: "Different address",
    testendeTitel: "The trial has ended", abgelaufenTitel: "Your licence has expired",
    kaufText: n => `To keep using ${n} you need a licence for one year. It does not renew automatically.`,
    kaufen: "Buy licence", kaufAus: "Purchasing is not open yet. Please write to robin@robin.vision.",
    kaufOffen: "The purchase has opened in a new window. Afterwards, press “Refresh status” here.",
    aktualisieren: "Refresh status", abmelden: "Sign out", angemeldet: e => `Signed in as ${e}`,
    testBis: d => `Trial until ${d}`, lizenzBis: d => `Licence until ${d}`,
    offlineTitel: "No connection", offlineText: "The tool needs the internet once to sign in. After that it works for up to 30 days without a connection.",
    nochmal: "Try again", fehler: "That did not work. Please try again later.",
    keinSchluessel: "Licence checking is not set up in this version. Please download the tool again from robin.vision.",
    datum: ms => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  },
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const b64dec = s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); s += "=".repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };

function speicher(w) {
  const k = "rvlizenz:" + w;
  let d = {};
  try { d = JSON.parse(localStorage.getItem(k)) || {}; } catch {}
  d.sichern = () => { try { const { sichern, ...rest } = d; localStorage.setItem(k, JSON.stringify(rest)); } catch {} };
  return d;
}

// Signierten Status prüfen: „daten.signatur“, ECDSA P-256 mit SHA-256 über den Text „daten“.
export async function tokenPruefen(token, oeffentlich) {
  try {
    const [daten, sig] = String(token || "").split(".");
    if (!daten || !sig || !oeffentlich) return null;
    const key = await crypto.subtle.importKey("jwk", oeffentlich, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64dec(sig), new TextEncoder().encode(daten));
    return ok ? JSON.parse(new TextDecoder().decode(b64dec(daten))) : null;
  } catch { return null; }
}

async function senden(pfad, body) {
  // text/plain: keine CORS-Vorabfrage, auch aus der lokalen Datei
  const r = await fetch(WORKER + pfad, { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify(body), credentials: "omit" });
  let d = {}; try { d = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, ...d };
}

const frei = st => st && (st.typ === "test" || st.typ === "lizenz");

export async function lizenzTor(o) {
  const { werkzeug, oeffentlich, wurzel } = o, lang = o.lang === "en" ? "en" : "de", t = T[lang], name = t.namen[werkzeug];
  const jetzt = o.jetzt ? o.jetzt() : Date.now();
  const sp = speicher(werkzeug);
  // Uhr zurückgestellt? Dann zählt die späteste je gesehene Zeit.
  const uhrZurueck = (sp.zuletzt || 0) - jetzt > TAG;
  if (jetzt < LIZENZPFLICHT_AB && !uhrZurueck && (sp.zuletzt || 0) < LIZENZPFLICHT_AB) return { frei: true, vorher: true };
  sp.zuletzt = Math.max(sp.zuletzt || 0, jetzt); sp.sichern();

  const leisteZeigen = st => {
    if (!o.leiste) return;
    o.leiste.hidden = false;
    o.leiste.innerHTML = `<span>${esc(t.angemeldet(st.email))} · ${esc(st.typ === "lizenz" ? t.lizenzBis(t.datum(st.bis)) : t.testBis(t.datum(st.bis)))}</span>`
      + (st.typ === "test" ? ` · <button type="button" class="rvl-link" data-rvl="kaufen-leiste">${esc(t.kaufen)}</button>` : "")
      + ` · <button type="button" class="rvl-link" data-rvl="abmelden">${esc(t.abmelden)}</button>`;
    o.leiste.onclick = async e => {
      const b = e.target.closest("[data-rvl]"); if (!b) return;
      if (b.dataset.rvl === "abmelden") { await senden("abmelden", { werkzeug, lang, sitzung: sp.sitzung }).catch(() => {}); delete sp.sitzung; delete sp.token; sp.sichern(); location.reload(); }
      if (b.dataset.rvl === "kaufen-leiste") kaufen();
    };
  };
  const kaufen = async () => {
    const r = await senden("kaufen", { werkzeug, lang, sitzung: sp.sitzung }).catch(() => null);
    if (r && r.url) { if (location.protocol === "file:") { window.open(r.url, "_blank", "noopener"); return "offen"; } location.href = r.url; return "weg"; }
    if (r && r.token) { sp.token = r.token; sp.sichern(); return "gekauft"; }
    return r && r.error ? r.error : t.fehler;
  };

  if (!oeffentlich) { wurzel.innerHTML = maske(t.offlineTitel, `<p>${esc(t.keinSchluessel)}</p>`); return new Promise(() => {}); }

  // 1. gültiger Status im Gerät
  const st = await tokenPruefen(sp.token, oeffentlich);
  if (st && st.w === werkzeug && frei(st) && st.gueltigBis > jetzt && st.ausgestellt - jetzt < TAG && !uhrZurueck) {
    leisteZeigen(st);
    if (sp.sitzung) senden("status", { werkzeug, lang, sitzung: sp.sitzung }).then(async r => {
      if (r.token && await tokenPruefen(r.token, oeffentlich)) { sp.token = r.token; sp.sichern(); leisteZeigen(r.status); }
      else if (r.abgemeldet) { delete sp.sitzung; delete sp.token; sp.sichern(); }
    }).catch(() => {});
    return { frei: true, status: st };
  }

  // 2. Sitzung vorhanden: frischen Status holen; 3. sonst Maske
  return new Promise(fertig => {
    const zeigen = async (schritt, info = {}) => {
      if (schritt === "pruefen") {
        if (!sp.sitzung) return zeigen("email");
        let r; try { r = await senden("status", { werkzeug, lang, sitzung: sp.sitzung }); } catch { return zeigen("offline"); }
        if (r.abgemeldet) { delete sp.sitzung; delete sp.token; sp.sichern(); return zeigen("email"); }
        if (!r.token) return zeigen("email", { fehler: r.error || t.fehler });
        return ergebnis(r);
      }
      if (schritt === "email") {
        wurzel.innerHTML = maske(t.anmeldenTitel, `<p>${esc(t.anmeldenText(name))}</p>
<label class="rvl-label" for="rvl-email">${esc(t.email)}</label><input id="rvl-email" class="rvl-feld" type="email" autocomplete="email" value="${esc(sp.email || "")}">
<p><button type="button" class="rvl-knopf" id="rvl-senden">${esc(t.codeSchicken)}</button></p>`, info.fehler);
        const feld = wurzel.querySelector("#rvl-email"), knopf = wurzel.querySelector("#rvl-senden");
        const los = async () => {
          knopf.disabled = true;
          let r; try { r = await senden("code", { werkzeug, lang, email: feld.value.trim() }); } catch { return zeigen("offline"); }
          if (!r.ok) return zeigen("email", { fehler: r.error || t.fehler });
          sp.email = feld.value.trim().toLowerCase(); sp.sichern(); zeigen("code");
        };
        knopf.onclick = los; feld.onkeydown = e => { if (e.key === "Enter") los(); }; feld.focus();
      }
      if (schritt === "code") {
        wurzel.innerHTML = maske(t.anmeldenTitel, `<label class="rvl-label" for="rvl-code">${esc(t.codeLabel(sp.email))}</label>
<input id="rvl-code" class="rvl-feld" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
<p><button type="button" class="rvl-knopf" id="rvl-anmelden">${esc(t.anmelden)}</button> <button type="button" class="rvl-link" id="rvl-neu">${esc(t.neuerCode)}</button> · <button type="button" class="rvl-link" id="rvl-andere">${esc(t.andereAdresse)}</button></p>`, info.fehler);
        const feld = wurzel.querySelector("#rvl-code");
        const los = async () => {
          let r; try { r = await senden("anmelden", { werkzeug, lang, email: sp.email, code: feld.value }); } catch { return zeigen("offline"); }
          if (!r.sitzung) return zeigen("code", { fehler: r.error || t.fehler });
          sp.sitzung = r.sitzung; sp.sichern(); ergebnis(r);
        };
        wurzel.querySelector("#rvl-anmelden").onclick = los; feld.onkeydown = e => { if (e.key === "Enter") los(); };
        wurzel.querySelector("#rvl-neu").onclick = async () => { await senden("code", { werkzeug, lang, email: sp.email }).catch(() => {}); zeigen("code"); };
        wurzel.querySelector("#rvl-andere").onclick = () => zeigen("email");
        feld.focus();
      }
      if (schritt === "kauf") {
        const s = info.status;
        wurzel.innerHTML = maske(s.typ === "abgelaufen" ? t.abgelaufenTitel : t.testendeTitel, `<p>${esc(t.kaufText(name))}${info.preis ? " " + esc(info.preis) : ""}</p>
<p>${info.kauf ? `<button type="button" class="rvl-knopf" id="rvl-kaufen">${esc(t.kaufen)}</button> ` : `${esc(t.kaufAus)} `}<button type="button" class="rvl-link" id="rvl-neu-laden">${esc(t.aktualisieren)}</button> · <button type="button" class="rvl-link" id="rvl-abmelden">${esc(t.abmelden)}</button></p>
<p class="rvl-klein">${esc(t.angemeldet(s.email))}</p>`, info.fehler);
        const k = wurzel.querySelector("#rvl-kaufen");
        if (k) k.onclick = async () => {
          k.disabled = true;
          const r = await kaufen();
          if (r === "gekauft") return zeigen("pruefen");
          if (r === "offen") return zeigen("kauf", { ...info, fehler: t.kaufOffen });
          if (r !== "weg") zeigen("kauf", { ...info, fehler: r });
        };
        wurzel.querySelector("#rvl-neu-laden").onclick = () => zeigen("pruefen");
        wurzel.querySelector("#rvl-abmelden").onclick = async () => { await senden("abmelden", { werkzeug, lang, sitzung: sp.sitzung }).catch(() => {}); delete sp.sitzung; delete sp.token; sp.sichern(); zeigen("email"); };
      }
      if (schritt === "offline") {
        wurzel.innerHTML = maske(t.offlineTitel, `<p>${esc(t.offlineText)}</p><p><button type="button" class="rvl-knopf" id="rvl-nochmal">${esc(t.nochmal)}</button></p>`);
        wurzel.querySelector("#rvl-nochmal").onclick = () => zeigen("pruefen");
      }
    };
    const ergebnis = async r => {
      const s = await tokenPruefen(r.token, oeffentlich);
      if (!s || s.w !== werkzeug) return zeigen("email", { fehler: t.fehler });
      sp.token = r.token; sp.sichern();
      if (frei(s)) { leisteZeigen(s); fertig({ frei: true, status: s, neu: true }); return; }
      zeigen("kauf", { status: s, preis: r.preis, kauf: r.kauf });
    };
    zeigen("pruefen");
  });
}

function maske(titel, inhalt, fehler) {
  return `<div class="rvl-maske" role="region" aria-labelledby="rvl-titel"><h2 id="rvl-titel">${esc(titel)}</h2>${inhalt}${fehler ? `<p class="rvl-fehler" role="alert">${esc(fehler)}</p>` : ""}</div>`;
}

// Schlichte Grundgestaltung; die Werkzeuge erben Schrift und Farben und können die Klassen überschreiben.
export const LIZENZ_CSS = `.rvl-maske{max-width:34rem;margin:1.5rem auto;padding:1.25rem 1.5rem;border:1px solid currentColor;border-radius:10px}
.rvl-maske h2{margin:0 0 .6rem;font-size:1.25rem}.rvl-label{display:block;margin:.8rem 0 .3rem;font-weight:600}
.rvl-feld{width:100%;box-sizing:border-box;padding:.55rem .7rem;font:inherit;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit}
.rvl-knopf{font:inherit;padding:.5rem 1rem;border-radius:6px;cursor:pointer}
.rvl-knopf{background:#1d4ed8;color:#fff;border-color:#1d4ed8}.rvl-knopf:disabled{opacity:.6}
.rvl-link{font:inherit;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer}
.rvl-fehler{color:#b91c1c;font-weight:600}.rvl-klein{font-size:.85em;opacity:.8}
.rvl-leiste{font-size:.85em;opacity:.85;margin:.25rem 0 .75rem}`;
