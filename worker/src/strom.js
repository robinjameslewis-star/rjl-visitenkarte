// Gochs Antwort im Strom (Robin, 20.11.2026: „die antwort muss so schnell wie möglich kommen“). Bisher wartete der Worker
// auf die ganze Antwort des Modells, vertonte dann den ersten Satz und zeigte den Text erst mit dem ersten Ton. Jetzt:
// – das Modell antwortet im Strom; der Text erscheint, während es schreibt (Zeilen { vorab }),
// – jeder fertige Sprechabschnitt geht sofort zur Stimme, der erste also, sobald der erste Satz steht,
// – der KI-Hinweis der ersten gesprochenen Antwort (gemerkt, kostet keine Zeichen) klingt schon, während das Modell denkt.
// Hier stehen nur die Bausteine ohne Netz (teilAntwort) und die Stimme in Abschnitten, die nach und nach dazukommen (sprecher).
import { stimmeMonat, festerSatz, vertonenMitGeduld, PARALLEL } from "./stimme.js";
import { kostenBuchen } from "./kosten.js";

// Halb fertiges JSON des Modells lesen: { action, reply, fertig } – action ist undefined, solange es noch nicht dasteht,
// reply null, solange das Feld nicht begonnen hat. Das Schema stellt action vor reply (index.js, gochOutput); kommt reply
// trotzdem zuerst, gilt die Antwort als „falsch“ geordnet und wird nicht vorab gezeigt oder vertont (Datenschutz: erst
// action entscheidet, ob der Worker den Text ersetzt und nur einen neutralen Satz spricht).
// Gesucht wird nur ein Schlüssel nach „{“ oder „,“ – in einem Textwert stünde vor dem Anführungszeichen ein Backslash.
const ESC = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" };
export function teilAntwort(roh) {
  const s = String(roh || "");
  const r = /[{,]\s*"reply"\s*:\s*"/.exec(s);
  const a = /[{,]\s*"action"\s*:\s*(?:null|"([a-z]+)")/.exec(s);
  if (r && (!a || a.index > r.index)) return { falsch: true, action: undefined, reply: null, fertig: false };
  const action = a ? a[1] || null : undefined;
  if (!r) return { action, reply: null, fertig: false };
  let out = "", i = r.index + r[0].length, fertig = false;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') { fertig = true; break; }
    if (c === "\\") {
      if (i + 1 >= s.length) break; // Escape noch nicht vollständig da
      const e = s[i + 1];
      if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
        out += String.fromCharCode(parseInt(hex, 16)); i += 6; continue;
      }
      out += ESC[e] ?? e; i += 2; continue;
    }
    out += c; i++;
  }
  return { action, reply: out, fertig };
}

// Stimme in Abschnitten, die nach und nach dazukommen: teil(satz) reiht ein (höchstens PARALLEL gleichzeitig beim Anbieter),
// geschrieben wird in der Reihenfolge des Einreihens: { stimme: {mime, daten, zeichen, ms, teil} } je Abschnitt oder einmal
// { stimme: null, grund } („aus“, „grenze“, „fehler“). Der Monatsdeckel wird je Abschnitt atomar vorgemerkt (src/kosten.js);
// was nicht zum Anbieter geht (gemerkter Satz, Fehler, Abbruch), bucht zurück. Wirft schreiben (Besucher hat abgebrochen),
// wird nichts Neues mehr vertont. ende() wartet auf alles und schreibt die Monatswerte in einem Eintrag.
// Nur für den Strom der Website (index.js); Messegerät und Workshop behalten stimmeInTeilen mit dem Budget je Termin.
export function sprecher(env, ctx, { sprache, voiceId, lang, einstellungen, seed, zaehler = "stimme:monat:", beginn = Date.now() }, schreiben) {
  const opts = { voiceId, modell: sprache && sprache.ttsModell, lang, einstellungen, seed }, grenze = (sprache && sprache.zeichenMonat) || 0;
  const bereit = (async () => {
    if (!sprache || !sprache.stimme || !env.ELEVENLABS_API_KEY || !voiceId) return "aus";
    const stand = await stimmeMonat(env);
    return stand.fehler ? "fehler" : stand; // KV nicht lesbar: lieber keine Stimme als ohne Deckel
  })();
  const fertigMarken = [], rueck = [];
  let kette = Promise.resolve(), aus = null, gemeldet = false, abgebrochen = false;
  let gebucht = 0, verbraucht = 0, anzahl = 0, msErsterTon = null, eingereiht = 0;
  const zurueck = n => { gebucht -= n; rueck.push(kostenBuchen(env, "zeichen", -n, 0, "monat").catch(() => {})); };
  const melden = async grund => { if (gemeldet) return; gemeldet = true; await schreiben({ stimme: null, grund }); };

  function teil(satz, { fest = false } = {}) {
    satz = String(satz || "").trim();
    if (!satz || aus || abgebrochen) return false;
    const i = eingereiht++, vorher = i >= PARALLEL ? fertigMarken[i - PARALLEL] : Promise.resolve();
    const job = (async () => {
      const stand = await bereit;
      if (typeof stand === "string") return { grund: stand };
      await vorher;
      if (aus || abgebrochen) return { grund: null };
      if (stand.zeichen + gebucht + satz.length > grenze) { aus = "grenze"; return { grund: "grenze" }; }
      gebucht += satz.length;
      const v = await kostenBuchen(env, "zeichen", satz.length, grenze, "monat", stand.zeichen);
      if (!v.ok) { gebucht -= satz.length; aus = v.fehler ? "fehler" : "grenze"; return { grund: aus }; }
      try {
        const a = fest ? await festerSatz(env, ctx, satz, opts) : await vertonenMitGeduld(env, satz, opts);
        if (a.gemerkt) zurueck(satz.length); else verbraucht += satz.length;
        return { a };
      } catch (e) {
        console.error("Stimme", String(e && e.message || e).slice(0, 300));
        zurueck(satz.length);
        return { grund: "fehler" };
      }
    })();
    fertigMarken[i] = job.then(() => {}, () => {});
    kette = kette.then(async () => {
      const r = await job;
      if (gemeldet || abgebrochen) return;
      if (r.a) {
        if (msErsterTon === null) msErsterTon = Date.now() - beginn;
        anzahl++;
        await schreiben({ stimme: { mime: r.a.mime, daten: r.a.daten, zeichen: satz.length, ms: r.a.ms, teil: anzahl } });
      } else if (r.grund) { aus = aus || r.grund; await melden(r.grund); }
    }).catch(() => { abgebrochen = true; });
    return true;
  }

  // msText: Zeit von der Anfrage bis zum ersten sichtbaren Text. Die Summe msModell + msStimme im Monatseintrag ist hier die
  // Wartezeit bis zum ersten Ton ab der Anfrage (wie bisher: Modell, dann Stimme), aufgeteilt am ersten Text.
  async function ende({ msText = null } = {}) {
    await kette;
    const stand = await bereit;
    if (!anzahl && !gemeldet && !abgebrochen) await melden(typeof stand === "string" ? stand : "fehler").catch(() => {});
    await Promise.all(rueck);
    if (!env.USAGE || msErsterTon === null) return;
    const jetzt = Date.now(), monat = new Date(jetzt).toISOString().slice(0, 7), alt = await stimmeMonat(env, jetzt);
    if (alt.fehler) return;
    const msM = Math.min(msText ?? msErsterTon, msErsterTon), msS = msErsterTon - msM;
    const s = alt.strom || { antworten: 0, msText: 0, msTon: 0 };
    const next = { ...alt, zeichen: alt.zeichen + verbraucht, antworten: alt.antworten + 1, msModell: alt.msModell + msM, msStimme: alt.msStimme + msS,
      strom: { antworten: s.antworten + 1, msText: s.msText + (msText ?? 0), msTon: s.msTon + msErsterTon },
      letzte: { at: new Date(jetzt).toISOString(), zeichen: verbraucht, msModell: msM, msStimme: msS, msText, msTon: msErsterTon } };
    const write = env.USAGE.put(zaehler + monat, JSON.stringify(next), { expirationTtl: 70 * 86400 }).catch(() => {});
    ctx && ctx.waitUntil ? ctx.waitUntil(write) : await write;
  }
  return { teil, ende, get eingereiht() { return eingereiht; } };
}
