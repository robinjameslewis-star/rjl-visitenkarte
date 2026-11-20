// Agentenschlüssel der Redaktion (Robin 17.11.2026: „Ich möchte im Regelbetrieb alles über den Agenten machen und nur im Ausnahmefall
// selbst in der Redaktion arbeiten“). Verbindlich ist die Stufenliste im Vault (Unterlagen/2026-11-17_Agentenschluessel_Stufenliste.md,
// Abschnitt Goch-Redaktion). Vorbild: Memberbereich (robin-vision-member, src/agent.js).
//   Stufe 1: Der Agent handelt selbst, jede Aktion steht im Protokoll mit dem Akteur „agent“ (ohne Inhalte).
//   Stufe 2: gibt es in der Goch-Redaktion nicht.
//   Stufe 3: gibt es in der API nicht (Passkeys, Agentenschlüssel, Betrieb, Stimme, Landschaften, Blog, Messegeräte …).
// Die API (POST /admin/agent/<aktion>, JSON) kennt nur den Schlüssel im Kopf „Authorization: Bearer …“: keine Cookies, keine Sitzung,
// Anfragen mit Origin-Kopf (jeder Browser) werden abgewiesen. Funktionsschalter AGENT_API in wrangler.toml: nur "an" schaltet ein,
// sonst antwortet jeder Pfad unter /admin/agent mit 404 – Mergen schaltet nichts ein.
// Veröffentlichen und Wiederherstellen gehen über dieselben Funktionen wie die Redaktion (ops aus admin.js): gleiche Prüfungen,
// gleicher Commit ins GitHub-Repository, gleiche KV-Kopie.
//
// KV (Bindung USAGE):
//   agent:schluessel              Liste der Schlüssel (nur SHA-256-Prüfwert und Präfix, nie der Schlüssel selbst); schreibt nur die Redaktion
//   agent:zuletzt:<id>            letzte Nutzung eines Schlüssels (eigener Eintrag: die API schreibt die Liste nie, sonst könnte ein
//                                 Aufruf mit altem Stand eine Sperre überschreiben)
//   agent:zaehler:<JJJJ-MM-TT>    Aufrufe des Tages, je Stunde und ändernde je Stunde (Mengengrenze, Hinweis an Robin), 2 Tage
//   agent:log:<umgekehrte Zeit>   ein Eintrag je Aufruf (Metadaten, ohne Inhalte), 90 Tage; neueste zuerst in list()
//   agent:hinweis:<Stunde>        Merker: Hinweis an Robin in dieser Stunde schon verschickt

export const SCHLUESSEL_TAGE = 90;   // Ablauf, Robin verlängert
export const MAX_AKTIV = 3;          // gleichzeitig gültige Schlüssel
export const GRENZE_STUNDE = 60;     // Aufrufe je Uhrstunde (alle Aktionen, auch lesende)
export const GRENZE_TAG = 300;       // Aufrufe je Tag
export const HINWEIS_AB = 10;        // mehr als so viele ändernde Aktionen in einer Uhrstunde: Hinweis an Robin (höchstens einer je Stunde)
export const PRAEFIX = "gochag_";
export const AKTEUR_AGENT = "agent";
const MAX_BODY = 300_000;            // Profil höchstens 60.000 Zeichen, Werkzeugseiten kürzer – reichlich Luft für JSON
const LOG_TAGE = 90;
const MAX_FRAGEN_JE_AUFRUF = 50;
const SCHLUESSEL_RE = /^Bearer (gochag_[A-Za-z0-9_-]{43})$/;

export const agentAn = env => String(env.AGENT_API || "aus").trim() === "an";

// ---------- Aktionen: feste Tabelle Aktion → Stufe ----------
// art: lesen (zählt nur zur Mengengrenze) oder aendern (Stufe 1, zählt zusätzlich für den Hinweis an Robin).
// Jede Aktion: stufe, art, titel, parameter (für „hilfe“), ausfuehren(c, p) mit c = { env, deps, ops }.
const artVon = (p, ops) => {
  const art = typeof (p || {}).art === "string" ? p.art : "";
  if (!Object.hasOwn(ops.CONTENT, art)) throw fehler(`Bitte art angeben: ${Object.keys(ops.CONTENT).join(", ")}.`, 400);
  return art;
};

export const AKTIONEN = {
  hilfe: { stufe: 1, art: "lesen", titel: "Alle Aktionen mit Stufe und Parametern", parameter: "",
    ausfuehren: () => Object.entries(AKTIONEN).map(([aktion, a]) => ({ aktion, stufe: a.stufe, art: a.art, titel: a.titel, parameter: a.parameter })) },
  stand: { stufe: 1, art: "lesen", titel: "Stand: Aufrufe je Tag, Grenzen, Guthaben-Alarm, Inhalte mit letzter Änderung", parameter: "",
    async ausfuehren({ env, deps, ops }) {
      const s = await ops.state(env, deps);
      return {
        github: s.github, modell: s.model, grenzen: s.limits, guthaben_alarm: !!s.alert, profil_woerter: s.profileWords,
        aufrufe: s.usage.slice(0, 30), unbeantwortet: s.unanswered.length,
        inhalte: Object.fromEntries(Object.entries(s.content).map(([k, c]) => [k, { titel: c.title, pfad: c.path, fehler: c.error || null,
          zuletzt: c.meta && c.meta.last ? { datum: c.meta.last.date, nachricht: c.meta.last.message } : null, vorige_fassung: !!(c.meta && c.meta.hasPrev) }])),
      };
    } },
  inhalt: { stufe: 1, art: "lesen", titel: "Felder eines Inhalts lesen (Vorlage für veroeffentlichen)", parameter: "art",
    async ausfuehren({ env, deps, ops }, p) {
      const art = artVon(p, ops), c = (await ops.state(env, deps)).content[art];
      return { art, titel: c.title, pfad: c.path, felder: c.fields, zuletzt: c.meta && c.meta.last || null, vorige_fassung: !!(c.meta && c.meta.hasPrev), fehler: c.error || null };
    } },
  fragen: { stufe: 1, art: "lesen", titel: "Unbeantwortete Fragen (30 Tage, ohne Personenbezug)", parameter: "",
    async ausfuehren({ env, deps, ops }) { return (await ops.state(env, deps)).unanswered.map(q => ({ key: q.key, q: q.q, n: q.n, lang: q.lang, last: q.last })); } },
  fragen_erledigt: { stufe: 1, art: "aendern", titel: `Unbeantwortete Fragen erledigt setzen (key oder keys, höchstens ${MAX_FRAGEN_JE_AUFRUF})`, parameter: "key | keys: [key, …]",
    async ausfuehren({ env, ops }, p) {
      const keys = Array.isArray(p.keys) ? p.keys : p.key !== undefined ? [p.key] : [];
      if (!keys.length || keys.length > MAX_FRAGEN_JE_AUFRUF) throw fehler(`Bitte key oder keys angeben (1 bis ${MAX_FRAGEN_JE_AUFRUF}).`, 400);
      // Erst alle prüfen, dann löschen: ein ungültiger Schlüssel bricht ab, bevor etwas gelöscht ist
      for (const k of keys) if (!ops.frageSchluessel(k)) throw fehler("Ungültiger key (nur Einträge „unanswered:…“).", 400);
      for (const k of keys) await ops.frageErledigt(env, k);
      return { erledigt: keys.length };
    } },
  veroeffentlichen: { stufe: 1, art: "aendern", titel: "Inhalt veröffentlichen: Prüfung wie in der Redaktion, Commit ins Repository, Kopie in den KV",
    parameter: "art, felder (wie aus inhalt; profile: text · aktuell: stand, de, en · links: rows · werkzeug…: beschreibung, neuigkeiten, nutzung, hinweis, datei)",
    async ausfuehren({ env, deps, ops }, p) {
      const art = artVon(p, ops);
      if (!p.felder || typeof p.felder !== "object" || Array.isArray(p.felder)) throw fehler("Bitte felder als Objekt angeben (Vorlage: Aktion inhalt).", 400);
      const r = await ops.veroeffentlichen(art, p.felder, env, deps, AKTEUR_AGENT);
      return { art, geaendert: !r.note, hinweis: r.note || "Veröffentlicht – als Commit im Repository, Goch kennt die Fassung sofort." };
    } },
  wiederherstellen: { stufe: 1, art: "aendern", titel: "Vorige Fassung eines Inhalts wiederherstellen (als neuer Commit)", parameter: "art",
    async ausfuehren({ env, deps, ops }, p) {
      const art = artVon(p, ops);
      await ops.wiederherstellen(art, env, deps, AKTEUR_AGENT);
      return { art, hinweis: "Vorige Fassung ist live." };
    } },
};

// ---------- Helfer ----------

function fehler(text, status = 400) { const e = new Error(text); e.status = status; return e; }
function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
}
const nowIso = () => new Date().toISOString();
const plusTage = n => new Date(Date.now() + n * 864e5).toISOString();
function hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function sha256(s) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))); }
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const gueltig = (s, jetzt = nowIso()) => !s.gesperrt && s.ablauf > jetzt;

// ---------- Schlüssel (nur Redaktion, Passkey-Sitzung) ----------

async function liste(env) {
  try { const a = JSON.parse(await env.USAGE.get("agent:schluessel")); return Array.isArray(a) ? a : []; } catch { return []; }
}
async function speichern(env, list) {
  // Höchstens 20 Einträge: zuerst fallen alte gesperrte oder abgelaufene heraus, gültige nie
  const jetzt = nowIso();
  while (list.length > 20) { const i = list.findIndex(s => !gueltig(s, jetzt)); if (i < 0) break; list.splice(i, 1); }
  await env.USAGE.put("agent:schluessel", JSON.stringify(list));
}
// Für die Ansicht: ohne Prüfwert
export async function schluesselListe(env) {
  const jetzt = nowIso();
  return Promise.all((await liste(env)).sort((a, b) => a.erstellt < b.erstellt ? 1 : -1)
    .map(async ({ hash, ...s }) => ({ ...s, zuletzt: (await env.USAGE.get("agent:zuletzt:" + s.id)) || s.zuletzt || null, gueltig: gueltig(s, jetzt) })));
}
// Erzeugen: Der Schlüssel steht nur in dieser Antwort; gespeichert wird sein SHA-256-Prüfwert und ein kurzes Präfix zum Wiedererkennen.
export async function schluesselErzeugen(env, bezeichnung) {
  const list = await liste(env), jetzt = nowIso();
  if (list.filter(s => gueltig(s, jetzt)).length >= MAX_AKTIV) throw fehler(`Es gibt schon ${MAX_AKTIV} gültige Schlüssel. Bitte zuerst einen sperren.`, 409);
  const schluessel = PRAEFIX + b64url(crypto.getRandomValues(new Uint8Array(32)));
  const id = "ak_" + hex(crypto.getRandomValues(new Uint8Array(6)));
  const name = String(bezeichnung || "").replace(/[^\p{L}\p{N} .,()-]/gu, "").trim().slice(0, 60) || "Agentenbetrieb auf Robins Mac";
  list.push({ id, bezeichnung: name, praefix: schluessel.slice(0, PRAEFIX.length + 4), hash: await sha256(schluessel), erstellt: jetzt, ablauf: plusTage(SCHLUESSEL_TAGE), gesperrt: null, zuletzt: null });
  await speichern(env, list);
  await protokoll(env, { akteur: "robin", aktion: "schluessel_erzeugt", schluessel: id, status: 200 });
  return { id, schluessel };
}
export async function schluesselSperren(env, id) {
  const list = await liste(env), s = list.find(x => x.id === id && !x.gesperrt);
  if (!s) throw fehler("Diesen Schlüssel gibt es nicht oder er ist schon gesperrt.", 404);
  s.gesperrt = nowIso();
  await speichern(env, list);
  await protokoll(env, { akteur: "robin", aktion: "schluessel_gesperrt", schluessel: id, status: 200 });
}
// Verlängern: SCHLUESSEL_TAGE ab heute; gesperrte bleiben gesperrt. Ein abgelaufener wird nur wieder gültig, wenn Platz ist.
export async function schluesselVerlaengern(env, id) {
  const list = await liste(env), s = list.find(x => x.id === id && !x.gesperrt), jetzt = nowIso();
  if (!s) throw fehler("Diesen Schlüssel gibt es nicht oder er ist gesperrt.", 404);
  if (!gueltig(s, jetzt) && list.filter(x => gueltig(x, jetzt)).length >= MAX_AKTIV)
    throw fehler(`Es gibt schon ${MAX_AKTIV} gültige Schlüssel. Bitte zuerst einen sperren.`, 409);
  s.ablauf = plusTage(SCHLUESSEL_TAGE);
  await speichern(env, list);
  await protokoll(env, { akteur: "robin", aktion: "schluessel_verlaengert", schluessel: id, status: 200 });
}
// Prüft „Authorization: Bearer gochag_…“: liefert den Eintrag oder null (falsch, abgelaufen, gesperrt – nach außen gleich).
// Schreibt nie die Liste. „zuletzt“ steht in einem eigenen Eintrag, erst nach bestandener Prüfung und höchstens alle zehn Minuten
// (KV-Schreibkontingent).
export async function schluesselPruefen(env, request) {
  const m = (request.headers.get("authorization") || "").match(SCHLUESSEL_RE);
  if (!m) return null;
  const hash = await sha256(m[1]), jetzt = nowIso();
  const s = (await liste(env)).find(x => x.hash === hash);
  if (!s || !gueltig(s, jetzt)) return null;
  const zuletzt = await env.USAGE.get("agent:zuletzt:" + s.id);
  if (!zuletzt || Date.parse(jetzt) - Date.parse(zuletzt) > 10 * 60e3) await env.USAGE.put("agent:zuletzt:" + s.id, jetzt, { expirationTtl: (SCHLUESSEL_TAGE + 30) * 86400 });
  return s;
}

// ---------- Protokoll und Mengengrenze ----------

// Ein Eintrag je Aufruf: Zeit, Akteur, Aktion, Inhaltsart, Stufe, HTTP-Status, Kennung des Schlüssels – nie Parameter, Texte oder
// Fehlermeldungen (die Prüfungen zitieren Eingaben). Daten in den Metadaten, damit die Ansicht mit list() auskommt.
export async function protokoll(env, e) {
  const at = nowIso();
  const eintrag = { at, akteur: e.akteur, aktion: e.aktion, ...(e.art ? { art: e.art } : {}), ...(e.stufe ? { stufe: e.stufe } : {}),
    ...(e.anzahl ? { anzahl: e.anzahl } : {}), status: e.status, ...(e.schluessel ? { schluessel: e.schluessel } : {}) };
  const key = "agent:log:" + String(9e15 - Date.now()).padStart(16, "0") + ":" + hex(crypto.getRandomValues(new Uint8Array(3)));
  await env.USAGE.put(key, "", { expirationTtl: LOG_TAGE * 86400, metadata: eintrag });
}
export async function protokollListe(env, n = 200) {
  const r = await env.USAGE.list({ prefix: "agent:log:", limit: Math.min(1000, n) });
  return r.keys.map(k => k.metadata).filter(Boolean);
}
const tagVon = iso => iso.slice(0, 10), stundeVon = iso => iso.slice(11, 13);
async function zaehlerLesen(env, tag) {
  try { const z = JSON.parse(await env.USAGE.get("agent:zaehler:" + tag)); if (z && typeof z.n === "number") return z; } catch {}
  return { n: 0, h: {}, a: {} };
}
export async function zaehlerStand(env) { const j = nowIso(); const z = await zaehlerLesen(env, tagVon(j)); return { tag: z.n, stunde: z.h[stundeVon(j)] || 0, aendernStunde: z.a[stundeVon(j)] || 0 }; }

async function mengenHinweis(env, ctx, anzahl, stunde) {
  if (anzahl <= HINWEIS_AB || !env.RESEND_API_KEY) return;
  const merker = "agent:hinweis:" + stunde;
  if (await env.USAGE.get(merker)) return;
  await env.USAGE.put(merker, "1", { expirationTtl: 3700 });
  const senden = fetch("https://api.resend.com/emails", {
    method: "POST", headers: { "content-type": "application/json", "authorization": "Bearer " + env.RESEND_API_KEY },
    body: JSON.stringify({ from: env.MAIL_FROM || "Goch <onboarding@resend.dev>", to: [env.MAIL_TO],
      subject: "Redaktion: Der Agent war in dieser Stunde sehr aktiv",
      text: `Der Agent hat in dieser Stunde mehr als ${HINWEIS_AB} Änderungen in der Goch-Redaktion vorgenommen (${anzahl}).\n\n` +
        "Was er getan hat, steht in der Redaktion unter „Agent – Schlüssel und Protokoll“. Wenn das nicht so sein soll: dort den Schlüssel sperren." }),
  }).then(r => { if (!r.ok) console.error("Agent-Hinweis: Resend", r.status); }).catch(e => console.error("Agent-Hinweis: Resend", String(e)));
  if (ctx && ctx.waitUntil) ctx.waitUntil(senden); else await senden;
}

async function parameterLesen(request) {
  const n = Number(request.headers.get("content-length"));
  if (n > MAX_BODY) throw fehler("Anfrage zu groß.", 413);
  const text = await request.text();
  if (text.length > MAX_BODY) throw fehler("Anfrage zu groß.", 413);
  if (!text.trim()) return {};
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) throw fehler("JSON erwartet.", 415);
  let p;
  try { p = JSON.parse(text); } catch { throw fehler("Ungültiges JSON.", 400); }
  if (!p || typeof p !== "object" || Array.isArray(p)) throw fehler("Parameter bitte als JSON-Objekt.", 400);
  return p;
}

// ---------- API: POST /admin/agent/<aktion> ----------

// ops (aus admin.js): CONTENT, state, veroeffentlichen, wiederherstellen, frageSchluessel, frageErledigt – dieselben Funktionen wie die Redaktion.
export async function agentApi(request, env, ctx, deps, ops) {
  if (!agentAn(env)) return new Response("Nicht gefunden.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  if (!env.USAGE) return json({ error: "Nicht eingerichtet (KV fehlt)." }, 503);
  // Kein Weg über einen Browser: Browser senden bei POST und bei Anfragen anderer Seiten immer Origin, das Skript auf Robins Mac nie.
  if (request.headers.get("origin")) return json({ error: "Nicht erlaubt." }, 403);
  if (request.method !== "POST") return json({ error: "Bitte POST." }, 405, { allow: "POST" });
  // Anfragen je Minute, gezählt von Cloudflare ohne KV – auch für falsche Schlüssel (eigener Zählerschlüssel, nicht der der Anmeldung)
  if (env.LOGIN_LIMIT) {
    const { success } = await env.LOGIN_LIMIT.limit({ key: "agent:" + (request.headers.get("cf-connecting-ip") || "0") });
    if (!success) return json({ error: "Zu viele Anfragen – bitte eine Minute warten." }, 429, { "retry-after": "60" });
  }
  const s = await schluesselPruefen(env, request);
  if (!s) return json({ error: "Schlüssel ungültig, abgelaufen oder gesperrt." }, 401, { "www-authenticate": "Bearer" });
  const name = new URL(request.url).pathname.replace(/\/+$/, "").slice("/admin/agent/".length);
  const a = /^[a-z_]{2,40}$/.test(name) && Object.hasOwn(AKTIONEN, name) ? AKTIONEN[name] : null;

  // Mengengrenze je Uhrstunde und Tag, für jeden Aufruf mit gültigem Schlüssel (ein Schreibvorgang je Aufruf; bei parallelen Aufrufen
  // kann der Zähler knapp zu niedrig sein, die Grenze je Minute oben bleibt hart)
  const jetzt = nowIso(), tag = tagVon(jetzt), std = stundeVon(jetzt);
  const z = await zaehlerLesen(env, tag);
  if ((z.h[std] || 0) >= GRENZE_STUNDE) return json({ error: `Mengengrenze erreicht (${GRENZE_STUNDE} Aufrufe je Stunde). Bitte in der nächsten Stunde weiter.` }, 429);
  if (z.n >= GRENZE_TAG) return json({ error: `Mengengrenze erreicht (${GRENZE_TAG} Aufrufe je Tag). Bitte morgen weiter.` }, 429);
  z.n += 1; z.h[std] = (z.h[std] || 0) + 1;
  if (a && a.art === "aendern") z.a[std] = (z.a[std] || 0) + 1;
  await env.USAGE.put("agent:zaehler:" + tag, JSON.stringify(z), { expirationTtl: 2 * 86400 });

  if (!a || a.stufe !== 1) {
    // Auch das steht im Protokoll (z. B. ein Versuch, Passkeys zu ändern); den Namen nur, wenn er wie eine Aktion aussieht
    await protokoll(env, { akteur: AKTEUR_AGENT, aktion: /^[a-z_]{2,40}$/.test(name) ? name : "(unbekannt)", status: 404, schluessel: s.id });
    return json({ error: "Diese Aktion gibt es nicht. Alle Aktionen: hilfe." }, 404);
  }

  let status = 500, p = {};
  try {
    p = await parameterLesen(request);
    const ergebnis = await a.ausfuehren({ env, deps, ops }, p);
    status = 200;
    return json({ ok: true, ergebnis: ergebnis ?? null });
  } catch (e) {
    status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return json({ error: e.message || "Fehler." }, status);
  } finally {
    const art = typeof p.art === "string" && Object.hasOwn(ops.CONTENT, p.art) ? p.art : null;
    const anzahl = name === "fragen_erledigt" && status === 200 ? (Array.isArray(p.keys) ? p.keys.length : 1) : null;
    await protokoll(env, { akteur: AKTEUR_AGENT, aktion: name, art, stufe: a.stufe, anzahl, status, schluessel: s.id });
    if (a.art === "aendern") await mengenHinweis(env, ctx, z.a[std], tag + "T" + std);
  }
}

// ---------- Redaktion: /admin/api/agent… (Stufe 3, nur mit Passkey-Sitzung) ----------

export async function verwaltungApi(api, request, env, session, readJson) {
  const mitPasskey = typeof session.via === "string" && session.via.startsWith("Passkey");
  const stand = async () => ({ an: agentAn(env), mitPasskey, schluessel: await schluesselListe(env), protokoll: await protokollListe(env, 200),
    zaehler: await zaehlerStand(env), grenzen: { stunde: GRENZE_STUNDE, tag: GRENZE_TAG, hinweisAb: HINWEIS_AB, tage: SCHLUESSEL_TAGE, maxAktiv: MAX_AKTIV } });
  try {
    if (api === "agent" && request.method === "GET") return json(await stand());
    if (request.method !== "POST") return json({ error: "Nicht gefunden." }, 404);
    if (!mitPasskey) return json({ error: "Agentenschlüssel verwaltet nur, wer mit Passkey angemeldet ist." }, 403);
    const body = await readJson(request);
    if (api === "agent/schluessel") { const r = await schluesselErzeugen(env, body.bezeichnung); return json({ ...(await stand()), neu: r }); }
    const id = typeof body.id === "string" && /^ak_[a-f0-9]{12}$/.test(body.id) ? body.id : null;
    if (!id) return json({ error: "Ungültig." }, 400);
    if (api === "agent/sperren") { await schluesselSperren(env, id); return json({ ...(await stand()), note: "Gesperrt. Er gilt sofort hier und in der Regel binnen einer Minute an allen Standorten nicht mehr (KV-Abgleich)." }); }
    if (api === "agent/verlaengern") { await schluesselVerlaengern(env, id); return json({ ...(await stand()), note: `Um ${SCHLUESSEL_TAGE} Tage ab heute verlängert.` }); }
  } catch (e) { return json({ error: e.message }, e.status || 400); }
  return json({ error: "Nicht gefunden." }, 404);
}
