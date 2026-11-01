// Goch, das Rotkehlchen von Robin – LLM-Proxy für die Visitenkarte von Robin James Lewis.
// POST /chat  { lang: "de"|"en", messages: [{role:"user"|"assistant", content:"…"}, …] }
// Antwort:    { reply: "…", action: null | "calendar" | "contact" | "message" | "newsletter", sent: true|false|undefined,
//               (newsletter: die Seite zeigt unter der Antwort ein Feld zur Anmeldung, die Adresse geht nie an das Modell)
//               link: null | { label: "…", url: "https://…" }, link2: wie link (nur bei „Was gibt's Neues?“),
//               zeigen: null | Stelle der Startseite aus ZIELE (die Seite führt dorthin, während Goch spricht) }
// Mit anlass "angekommen" | "zurueck" | "nachfrage" (Blickkontakt) antwortet der Worker ohne Modell mit einem festen Satz.
//               – Links nur aus links.md, nie vom Modell erfunden
// Sprechender Goch (23.10.2026): { figur: "goch" } wählt die Figur (öffentlich nur Goch); { gesprochen: true } – die Frage
// kam per Spracheingabe – oder { stimme: {erste} } schaltet das schnellere Modell des Sprachmodus ein. Mit „stimme“
// antwortet der Worker als NDJSON: Zeile 1 die Antwort wie oben, Zeile 2 { stimme: {mime, daten, zeichen, ms} } oder
// { stimme: null, grund }. Vertont wird nur diese eigene Antwort; eine freie Vorlese-Route gibt es nicht.
// POST /listen?lang=de|en  WAV (16 Bit, mono, höchstens 20 s) → { text, sekunden } – Spracheingabe, src/hoeren.js
// Der Schlüssel zum Sprachmodell und zu Resend liegt nur hier, nie im Seitencode.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import PROFILE from "../profile.md";
import AKTUELL from "../aktuell.md";
import LINKS_MD from "../links.md";
import { handleAdmin } from "./admin.js";
import { raw as githubRaw } from "./github.js";
import { handleContact } from "./contact.js";
import { handleAufbau } from "./aufbau.js";
import { handleNewsletter } from "./newsletter.js";
import { loadSettings, rememberStatus } from "./settings.js";
import { oeffentlicheFigur } from "./figuren.js";
import { stimmeFuerAntwort, KI_HINWEIS, GESPROCHEN } from "./stimme.js";
import { handleListen } from "./hoeren.js";
import { handleKiosk, kundenSystem, GOCH_AM_GERAET } from "./kiosk.js";
import { laden as seitenLaden, prompt as seitenPrompt, links as seitenLinks } from "./seitenwissen.js";
// Durable Object des Messegeräts (Gerätebudget, src/kiosk.js) – muss vom Hauptmodul exportiert werden
export { Geraetebudget } from "./kiosk.js";

const perIp = new Map();         // weiche Grenze je Instanz: ip -> [timestamps der Anfragen]
const perIpMessages = new Map(); // je Instanz: ip -> [timestamps versendeter Nachrichten]
let lastUsage = null;            // Verbrauch des letzten Modellaufrufs (Status und Testfrage in der Redaktion)
let msLetzterModellaufruf = null; // Antwortzeit des Modells für die Statistik des Sprachmodus (je Instanz, ungefähr)

// Die Kommentarzeilen am Anfang von profile.md (Änderungshistorie, interne Begründungen) gehören nicht in den Systemprompt.
const ohneKommentarkopf = s => String(s).replace(/^(?:#[^\n]*\n)+\s*/, "");

const TEXT = {
  de: {
    // Wenn das Modell nicht antworten kann oder soll (Tagesgrenze, Störung, Guthaben): kein Wort davon zum
    // Besucher – Goch leitet in den gewohnten Draht über, der Worker führt ihn ohne Modell zu Ende.
    quiet: "Das richte ich lieber direkt an Robin weiter. Was soll ich Robin ausrichten? Oder schreiben Sie ihm selbst: robin@robin.vision",
    // Goch spricht von sich aus an, wenn jemand an den Bildschirm kommt (Blickkontakt) – feste Sätze, kein Modell
    angekommen: ["Hallo! Schön, dass Sie vorbeischauen. Fragen Sie mich gern, woran Robin gerade arbeitet.",
      "Ah, hallo! Ich bin Goch, Robins Rotkehlchen. Womit kann ich Ihnen helfen?",
      "Da sind Sie ja! Möchten Sie wissen, was Robin gerade baut?"],
    zurueck: ["Da sind Sie wieder! Wo waren wir stehen geblieben?", "Schön, Sie wiederzusehen. Haben Sie noch eine Frage?"],
    nachfrage: ["Möchten Sie wissen, woran Robin gerade arbeitet?", "Fragen Sie mich ruhig etwas – zum Beispiel, was das SmartFormular kann.",
      "Soll ich Ihnen von Robins Workshops erzählen?"],
    sent: e => `Ausgerichtet. Robin antwortet Ihnen persönlich per E-Mail an ${e}.`,
    summary: m => `Ich richte Robin aus: ${m.text} – Von: ${m.name}, ${m.email}. Unser Gespräch schicke ich mit, damit Robin den Zusammenhang kennt; wenn Sie das nicht möchten, sagen Sie es. Soll ich das so senden?`,
    summaryBare: m => `Ich richte Robin aus: ${m.text} – Von: ${m.name}, ${m.email}. Ohne unser Gespräch, nur diese Nachricht. Soll ich das so senden?`,
    marker: "Soll ich das so senden",
    bareMarker: "Ohne unser Gespräch",
    cancelled: "In Ordnung, ich sende nichts. Wenn Sie es anders formulieren möchten, sagen Sie es mir.",
    closing: "Für heute habe ich genug erzählt – mehr weiß Robin selbst. Soll ich ihm etwas ausrichten? Dann schreiben Sie mir, was.",
    askWhat: "Was soll ich Robin ausrichten?",
    askWho: "Und wie heißen Sie, und unter welcher E-Mail-Adresse kann Robin Ihnen persönlich antworten?",
    closingMarker: "Soll ich ihm etwas ausrichten",
    whoMarker: "unter welcher E-Mail-Adresse kann Robin Ihnen persönlich antworten",
    invalid: "Damit Robin Ihnen persönlich antworten kann, brauche ich Ihren Namen und eine gültige E-Mail-Adresse.",
    tooMany: "Mehr richte ich heute nicht aus – schreiben Sie Robin bitte direkt.",
    failed: "Das Ausrichten hat nicht geklappt. Schreiben Sie Robin bitte direkt per E-Mail.",
    // Feedback zu den Werkzeugen (Robin, 15.10.2026): ohne Pflicht zu Name und Adresse, ohne Gesprächsverlauf
    feedbackSummary: f => `Ich gebe Robin dieses Feedback weiter: „${f.text}“${f.email ? ` – Von: ${f.name || f.email}, ${f.email}.` : /[.!?…]$/.test(f.text) ? "" : "."} Soll ich das so senden?`,
    feedbackSent: "Weitergegeben, danke. Robin liest jedes Feedback.",
    geraetStill: "Gerade antworte ich nicht. Fragen Sie gern das Standpersonal.", // Kundenfigur am Messegerät
  },
  en: {
    quiet: "I'd rather pass that on to Robin directly. What should I pass on to Robin? Or write to him yourself: robin@robin.vision",
    angekommen: ["Hello! Nice of you to drop by. Feel free to ask me what Robin is working on.",
      "Oh, hello! I'm Goch, Robin's robin. How can I help?",
      "There you are! Would you like to know what Robin is building right now?"],
    zurueck: ["There you are again! Where were we?", "Nice to see you again. Anything else you'd like to ask?"],
    nachfrage: ["Would you like to know what Robin is working on?", "Feel free to ask me something – for example, what SmartFormular can do.",
      "Shall I tell you about Robin's workshops?"],
    sent: e => `Passed on. Robin will reply to you personally by email at ${e}.`,
    summary: m => `I'll pass on to Robin: ${m.text} – From: ${m.name}, ${m.email}. I'll include our conversation so Robin has the context; if you'd rather not, just say so. Shall I send it like this?`,
    summaryBare: m => `I'll pass on to Robin: ${m.text} – From: ${m.name}, ${m.email}. Without our conversation, just this message. Shall I send it like this?`,
    marker: "Shall I send it like this",
    bareMarker: "Without our conversation",
    cancelled: "All right, I won't send anything. If you'd like to phrase it differently, tell me.",
    closing: "That's enough from me for today – Robin knows the rest himself. Shall I pass something on to him? Then tell me what.",
    askWhat: "What should I pass on to Robin?",
    askWho: "And what's your name, and which email address can Robin reply to?",
    closingMarker: "Shall I pass something on to him",
    whoMarker: "which email address can Robin reply to",
    invalid: "For Robin to reply to you personally I need your name and a valid email address.",
    tooMany: "I won't pass on more than that today – please write to Robin directly.",
    failed: "Passing it on didn't work. Please write to Robin directly by email.",
    feedbackSummary: f => `I'll pass this feedback on to Robin: “${f.text}”${f.email ? ` – From: ${f.name || f.email}, ${f.email}.` : /[.!?…]$/.test(f.text) ? "" : "."} Shall I send it like this?`,
    feedbackSent: "Passed on – thank you. Robin reads all feedback.",
    geraetStill: "I can't answer just now. Do ask the staff on the stand.",
  },
};

const worker = {
  // Vorne: Stimme zur Antwort von /chat (NDJSON), nur wenn die Seite sie verlangt; sonst unverändert durchgereicht.
  async fetch(request, env, ctx) {
    if (request.method === "POST" && new URL(request.url).pathname === "/chat") {
      let body = null;
      try { body = await request.clone().json(); } catch {}
      const response = await worker.handle(request, env, ctx);
      return body && body.stimme && response.status === 200 ? mitStimme(response, body, env, ctx) : response;
    }
    return worker.handle(request, env, ctx);
  },

  // intern: Aufruf der Kiosk-Route (src/kiosk.js) mit angemeldetem Gerät – { geraet, figur, kunde, lang }. Dann gelten statt
  // Herkunft, IP- und Tagesgrenze der Website das Gerätebudget; Kundenfiguren antworten mit eigenem Systemprompt, ohne
  // Draht, Links und Newsletter.
  async handle(request, env, ctx, intern = null) {
    // Messegerät: eigene Route mit Geräteanmeldung, ruft für das Gespräch wieder handle() auf (intern)
    if (!intern && new URL(request.url).pathname.startsWith("/kiosk/")) return handleKiosk(request, env, ctx, { handle: worker.handle, mitStimme });
    // Aufbau aus dem Werkzeug „Buchungsstapel-Generator“ (englisch „Booking Batch Generator“): offen für jede Herkunft (lokale Datei), eigene Prüfung (src/aufbau.js)
    if (new URL(request.url).pathname === "/aufbau") return handleAufbau(request, env, ctx);
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response("Goch", { headers: { "content-type": "text/plain; charset=utf-8" } });
    // Dashboard für Robin (Anmeldung per E-Mail-Code, Inhalte im KV) – eigene Seite, kein CORS.
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return handleAdmin(request, env, ctx, { parseLinks, files: { aktuell: AKTUELL, links: LINKS_MD, profile: PROFILE },
        profileWords: PROFILE.split(/\s+/).filter(Boolean).length, testGoch });
    }
    if (request.method !== "POST" || !["/chat", "/contact", "/newsletter", "/listen"].includes(url.pathname)) return json({ error: "Nicht gefunden." }, 404, cors);
    if (!intern && allowed.length && !allowed.includes(origin)) return json({ error: "Herkunft nicht erlaubt." }, 403, cors);
    // Kontaktformular: zweiter Eingang neben Goch, gleiche Zustellung per Resend (src/contact.js)
    if (url.pathname === "/contact") return handleContact(request, env, ctx, cors);
    // Newsletter „Impulse“: Anmeldung mit Double-Opt-In über Brevo (src/newsletter.js)
    if (url.pathname === "/newsletter") return handleNewsletter(request, env, ctx, cors);

    // Betriebseinstellungen aus der Redaktion (an/aus, Anbieter, Modell, Cache, Sprache)
    const settings = await loadSettings(env);
    if (!settings.enabled) return json({ error: "Goch ist zurzeit ausgeschaltet." }, 503, cors);
    // Spracheingabe: WAV → Text (src/hoeren.js); der Text läuft danach als Besuchertext über /chat
    if (url.pathname === "/listen") return handleListen(request, env, ctx, cors, settings);

    // Eingabe
    let body; try { body = await request.json(); } catch { return json({ error: "Ungültige Anfrage." }, 400, cors); }
    const lang = body.lang === "en" ? "en" : "de", t = TEXT[lang];
    // Figur: über diese öffentliche Route nur Figuren aus dem Repository (Goch). Kundenfiguren nie hier, nur am Kiosk.
    if (!intern && !oeffentlicheFigur(body.figur)) return json({ error: "Unbekannte Figur." }, 400, cors);
    const kunde = !!(intern && intern.kunde);
    // Goch beginnt das Gespräch, wenn jemand an den Bildschirm kommt (Blickkontakt der Startseite, Robin, 23.10.2026):
    // fester Satz des Workers, kein Modellaufruf, keine Eingabe des Besuchers – die Stimme vertont also wieder nur Gochs
    // eigenen Text. Zählt wie eine Frage (Grenze je IP und Stunde); an der Grenze schweigt Goch (leere Antwort).
    if (!intern && ["angekommen", "zurueck", "nachfrage"].includes(body.anlass)) {
      const ip = request.headers.get("CF-Connecting-IP") || "0", jetzt = Date.now();
      const hits = (perIp.get(ip) || []).filter(x => jetzt - x < 3600_000);
      if (hits.length >= +(env.MAX_PER_IP_PER_HOUR || 12)) return json({ reply: "", action: null }, 200, cors);
      hits.push(jetzt); perIp.set(ip, hits);
      const saetze = t[body.anlass];
      return json({ reply: saetze[Math.floor(Math.random() * saetze.length)], action: null, anlass: body.anlass }, 200, cors);
    }
    // Sprachmodus: schnelleres Modell aus der Redaktion (nur bei Anthropic; andere Anbieter behalten ihr Modell)
    const sprachmodus = body.gesprochen === true || !!body.stimme;
    const modelSettings = sprachmodus && settings.provider === "anthropic" && settings.sprache && settings.sprache.modell
      ? { ...settings, model: settings.sprache.modell } : settings;
    const maxChars = +(env.MAX_INPUT_CHARS || 600), maxTurns = +(env.MAX_TURNS || 8);
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-24)
      .map(m => ({ role: m.role, content: m.content.slice(0, maxChars) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Keine Frage erhalten." }, 400, cors);

    // Grenzen
    const ip = request.headers.get("CF-Connecting-IP") || "0";
    const now = Date.now(), hour = 3600_000, day = 86400_000;
    if (!intern) { // Messegerät: Gerätebudget statt IP-Grenze (src/kiosk.js)
      const hits = (perIp.get(ip) || []).filter(x => now - x < hour);
      if (hits.length >= +(env.MAX_PER_IP_PER_HOUR || 12)) return json({ reply: t.quiet, action: null }, 200, cors);
      hits.push(now); perIp.set(ip, hits);
    }

    // Antwort auf die eigene Rückfrage („Soll ich das so senden?“) versteht der Worker selbst:
    // Ja → senden; Nein → nichts; „ohne Gespräch“ → neue Zusammenfassung ohne Verlauf. Kein Modellaufruf nötig.
    const previous = messages.length >= 2 ? messages[messages.length - 2] : null;
    const lastText = messages[messages.length - 1].content;
    if (!kunde && previous && previous.role === "assistant" && previous.content.includes(t.marker)) {
      const feedback = fromFeedback(previous.content);
      if (feedback && CONFIRM.test(lastText) && !DECLINE.test(lastText)) return await deliverFeedback(env, feedback, lang, ip, now, day, t, cors);
      const fields = fromSummary(previous.content);
      const noTranscript = NO_TRANSCRIPT.test(lastText);
      const bare = previous.content.includes(t.bareMarker) || noTranscript;
      if (fields && noTranscript && !CONFIRM.test(lastText)) return json({ reply: t.summaryBare(fields), action: null }, 200, cors);
      if (DECLINE.test(lastText)) return json({ reply: t.cancelled, action: null }, 200, cors);
      if (fields && CONFIRM.test(lastText)) {
        return await deliver(env, fields, lang, messages, !bare, ip, now, day, t, cors);
      }
    }

    // Deckel je Gespräch: nach MAX_TURNS Fragen übernimmt der Worker und führt nur noch zum Draht –
    // Anliegen, Name, E-Mail, Zusammenfassung – ohne Modell. Das begrenzt die Kosten je Besucher.
    const userTurns = messages.filter(x => x.role === "user").length;
    const closingAsked = previous && previous.role === "assistant" && (previous.content.includes(t.closingMarker) || previous.content.includes(t.askWhat));
    const whoAsked = previous && previous.role === "assistant" && previous.content.includes(t.whoMarker);
    if (!kunde && whoAsked) return json({ reply: nextDrahtReply(t, gatherMessage(null, messages), true), action: null }, 200, cors);
    if (!kunde && closingAsked) {
      if (DECLINE.test(lastText)) return json({ reply: t.cancelled, action: null }, 200, cors);
      return json({ reply: nextDrahtReply(t, gatherMessage(null, messages), false), action: null }, 200, cors);
    }
    if (!kunde && userTurns > maxTurns) return json({ reply: t.closing, action: null }, 200, cors);

    // Tagesgrenze: zählt nur Modellaufrufe (die kosten), nicht die Antworten des Workers selbst. Messegerät: Gerätebudget.
    if (env.USAGE && !intern) {
      const key = "usage:" + new Date().toISOString().slice(0, 10);
      const used = +(await env.USAGE.get(key) || 0);
      if (used >= +(env.MAX_PER_DAY || 60)) return json({ reply: t.quiet, action: null }, 200, cors);
      ctx.waitUntil(env.USAGE.put(key, String(used + 1), { expirationTtl: 35 * 86400 }));
    }

    const content = kunde ? { links: [], linkIds: [] } : await loadContent(env, ctx);
    const system = kunde ? kundenSystem(intern.figur, lang)
      : ohneKommentarkopf(content.profile) + "\n\n# Woran Robin gerade arbeitet\n\n" + content.aktuell + seitenPrompt(content.seiten) + linksPrompt(content.links) + "\n\n" + FORMAT + (intern ? "\n\n" + GOCH_AM_GERAET : "");
    const zeigen = body.kannZeigen === true && !intern && !kunde;
    // vorgelesen: so formulieren, wie man spricht; im Sprachmodus der Startseite: Stellen der Seite zeigen
    const systemText = system + (body.stimme ? "\n\n" + GESPROCHEN[lang] : "") + (zeigen ? "\n\n" + ZEIGEN : "");
    let text;
    try {
      text = await complete(env, systemText, messages, content.linkIds, modelSettings);
    } catch (e) {
      const detail = String(e && e.message || e).slice(0, 300);
      console.error("Modellfehler", detail);
      // Guthaben aufgebraucht: Robin einmal benachrichtigen (Merker in KV), nicht bei jedem Aufruf.
      if (/credit balance|insufficient credit|billing/i.test(detail)) ctx.waitUntil(notifyOnce(env, "credit",
        "Goch: Guthaben bei Anthropic aufgebraucht",
        "Die Anthropic-API meldet: " + detail + "\n\nGoch leitet Besucher bis auf Weiteres in den Draht (Nachricht per E-Mail), ohne Modell. Guthaben aufladen unter console.anthropic.com → Billing. Diese Nachricht kommt erst wieder, wenn danach eine Antwort gelungen ist und das Guthaben erneut ausgeht."));
      return json({ reply: kunde ? t.geraetStill : t.quiet, action: null }, 200, cors);
    }
    if (env.USAGE) ctx.waitUntil(env.USAGE.delete("alert:credit").catch(() => {})); // Antwort gelungen: Merker zurücksetzen
    ctx.waitUntil(rememberStatus(env, lastUsage, settings.provider));
    msLetzterModellaufruf = lastUsage && lastUsage.ms || null;
    const out = parse(text, content.linkIds);
    // Kundenfigur am Messegerät: nur Text, höchstens „contact“; kein Draht, keine Links, keine Rückkopplung in Gochs Profil.
    if (kunde) return json({ reply: out.reply, action: out.action === "contact" ? "contact" : null, link: null, link2: null }, 200, cors);
    // Goch am Messegerät: keine Links und keine Anmeldung zum Newsletter (kein Feld am Gerät)
    if (!zeigen) out.zeigen = null;
    if (intern) { out.link = null; out.link2 = null; if (out.action === "newsletter") out.action = null; }
    // Rückkopplung: Fragen, die Goch nicht beantworten konnte, ohne Personenbezug 30 Tage zählen,
    // damit Robin bei der Durchsicht sieht, was Besucher wirklich wissen wollten (Briefing Abschnitt 11).
    if (env.USAGE && UNKNOWN.test(out.reply)) ctx.waitUntil(rememberUnanswered(env, lastText, lang));
    // Link: das Modell nennt nur eine Kennung, die Adresse kommt aus links.md. Jeder Link einmal je Gespräch –
    // die Seite hängt „(Link: Text)“ an den Verlauf, daran erkennt der Worker, was schon angeboten wurde.
    if (!intern) out.link = resolveLink(out.link, lang, messages, content.links);
    // Zweiter Link nur zusammen mit einem ersten und nicht derselbe (Antwort auf „Was gibt's Neues?“)
    out.link2 = out.link && out.link2 ? resolveLink(out.link2, lang, messages, content.links) : null;
    if (out.link2 && out.link2.url === out.link.url) out.link2 = null;

    // Der Draht: Nachricht an Robin. Das Protokoll gehört dem Worker, nicht dem Modell:
    // Felder notfalls aus dem Verlauf ergänzen, die Zusammenfassung selbst schreiben, und senden
    // nur, wenn der Besucher auf genau diese Zusammenfassung mit Ja geantwortet hat.
    if (out.action === "message") {
      // Das Modell sammelt nur; gesendet wird erst nach Ja auf die Zusammenfassung des Workers (siehe oben).
      return json({ reply: nextDrahtReply(t, gatherMessage(out.message, messages), false), action: null }, 200, cors);
    }
    // Feedback zu den Werkzeugen: Zusammenfassung schreibt der Worker, gesendet wird erst nach Ja (siehe oben)
    if (out.action === "feedback") {
      const f = gatherFeedback(out.message);
      return json(f ? { reply: t.feedbackSummary(f), action: null } : { ...out, action: null }, 200, cors);
    }
    delete out.message;
    return json(out, 200, cors);
  },
};

export default worker;

// Antwort von /chat um die Stimme ergänzen: Zeile 1 sofort (die Seite zeigt den Text), Zeile 2 mit dem MP3, sobald es
// da ist. Bei der ersten gesprochenen Antwort einer Sitzung stellt der Worker den KI-Hinweis voran (Art. 50 KI-VO) –
// im Text und in der Stimme gleich. Kein Fehler erreicht den Besucher: ohne Stimme nur { stimme: null, grund }, nie ein
// Fehlertext des Anbieters; die Seite zeigt den Text und den allgemeinen Hinweis, dass es gerade nur im Chat geht.
async function mitStimme(response, body, env, ctx, optionen = {}) {
  let out;
  try { out = await response.json(); } catch { return response; }
  if (!out || typeof out.reply !== "string" || !out.reply.trim()) return new Response(JSON.stringify(out), response);
  const lang = body.lang === "en" ? "en" : "de", wunsch = body.stimme, t = TEXT[lang];
  // Draht und Feedback: Der Text zeigt die Zusammenfassung mit Name, Adresse und Nachricht; gesprochen wird nur ein neutraler
  // Satz – ElevenLabs erhält nie die Eingaben des Besuchers (Datenschutzabsatz „Sprechen mit Goch“).
  const istDraht = out.reply.includes(t.marker) || out.reply.includes("@") || out.reply.startsWith(lang === "en" ? "I'll pass this feedback on to Robin" : "Ich gebe Robin dieses Feedback weiter");
  let gesprochen = istDraht ? (lang === "en" ? "I've noted your message and your details – shall I send it like this?" : "Ich habe Ihre Nachricht und Ihre Angaben notiert – soll ich das so senden?") : out.reply;
  if (wunsch && wunsch.erste === true) { out.reply = KI_HINWEIS[lang] + " " + out.reply; gesprochen = KI_HINWEIS[lang] + " " + gesprochen; }
  out.ki = true; // die Seite zeigt den Hinweis „KI · künstliche Stimme“ dauerhaft an
  const msModell = msLetzterModellaufruf; msLetzterModellaufruf = null;
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter(), enc = new TextEncoder();
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/x-ndjson; charset=utf-8");
  headers.set("cache-control", "no-store");
  ctx.waitUntil((async () => {
    try {
      await writer.write(enc.encode(JSON.stringify(out) + "\n"));
      const settings = await loadSettings(env);
      const figur = oeffentlicheFigur(body.figur) || oeffentlicheFigur();
      const voiceId = optionen.voiceId !== undefined ? optionen.voiceId // Kundenfigur: ihre eigene Stimme aus der Redaktion
        : (settings.sprache && settings.sprache.voiceId) || (figur.stimme && figur.stimme.voiceId) || "";
      // Stimmcharakter: Goch aus figur.json (warm, weich), Kundenfiguren mit den Ausgangswerten
      const einstellungen = optionen.voiceId !== undefined ? undefined : figur.stimme && figur.stimme.einstellungen;
      const seed = optionen.voiceId !== undefined ? undefined : figur.stimme && figur.stimme.seed; // gleichbleibender Klang
      const r = await stimmeFuerAntwort(env, ctx, gesprochen, { sprache: settings.sprache, voiceId, lang, msModell, einstellungen, seed });
      if (r.grund === "grenze") ctx.waitUntil(notifyOnce(env, "stimme-grenze-" + new Date().toISOString().slice(0, 7),
        "Goch: Monatsgrenze für die Stimme erreicht",
        "Die Grenze für vertonte Zeichen in diesem Monat ist erreicht. Goch antwortet bis zum Monatsende nur noch als Text; Besucher sehen nur den allgemeinen Hinweis, dass ein Gespräch gerade nur im Chat möglich ist. Grenze ändern: Redaktion → Goch – Stimme und Spracheingabe."));
      await writer.write(enc.encode(JSON.stringify(r) + "\n"));
    } catch (e) {
      console.error("Stimme (Antwort)", String(e && e.message || e).slice(0, 300));
      try { await writer.write(enc.encode(JSON.stringify({ stimme: null, grund: "fehler" }) + "\n")); } catch {}
    } finally { try { await writer.close(); } catch {} }
  })());
  return new Response(readable, { status: 200, headers });
}

const UNKNOWN = /das weiß ich nicht|weiß ich (leider )?nicht|kann dir nur robin sagen|i don't know|only robin can (tell|say|answer)|pass (that|this|it) (on )?to robin|(ask|check with) robin (for you|about that)/i;

// Frage ohne Personenbezug zählen: E-Mail-Adressen und lange Zahlen entfernt, auf 160 Zeichen gekürzt,
// Schlüssel aus der normalisierten Frage; Eintrag verfällt nach 30 Tagen ohne Wiederholung.
async function rememberUnanswered(env, question, lang) {
  const clean = String(question).replace(EMAIL_ANY, "[e-mail]").replace(/\+?\d[\d\s\/-]{6,}\d/g, "[nummer]").replace(/\s+/g, " ").trim().slice(0, 160);
  if (clean.length < 3) return;
  const key = "unanswered:" + clean.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, "").trim().slice(0, 120);
  let entry = null;
  try { entry = JSON.parse(await env.USAGE.get(key)); } catch {}
  const today = new Date().toISOString().slice(0, 10);
  entry = entry && typeof entry === "object" ? entry : { q: clean, lang, n: 0, first: today };
  entry.n += 1; entry.last = today;
  await env.USAGE.put(key, JSON.stringify(entry), { expirationTtl: 30 * 86400 });
}

// Einmalige Benachrichtigung an Robin über Resend; der Merker in KV verhindert Wiederholungen.
async function notifyOnce(env, kind, subject, text) {
  if (!env.USAGE || !env.RESEND_API_KEY || !env.MAIL_TO) return;
  const key = "alert:" + kind;
  if (await env.USAGE.get(key)) return;
  await env.USAGE.put(key, new Date().toISOString(), { expirationTtl: 30 * 86400 });
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": "Bearer " + env.RESEND_API_KEY },
    body: JSON.stringify({ from: env.MAIL_FROM || "Goch <onboarding@resend.dev>", to: [env.MAIL_TO], subject, text }),
  }).catch(() => {});
}

// Der Verlauf kommt vom Browser – wer die Rückfrage fälscht, landet hier ohne Modellaufruf. Darum neben der Grenze
// je Adresse (nur je Instanz) eine Tagesgrenze über alle Besucher im KV, wie beim Kontaktformular.
async function deliver(env, m, lang, messages, withTranscript, ip, now, day, t, cors) {
  const sentToday = (perIpMessages.get(ip) || []).filter(x => now - x < day);
  // Messegerät („kiosk:…“): viele Besucher hinter einer Kennung – nur die Tagesgrenze insgesamt gilt
  if (!String(ip).startsWith("kiosk:") && sentToday.length >= +(env.MAX_MESSAGES_PER_IP_PER_DAY || 3)) return json({ reply: t.tooMany, action: "contact" }, 200, cors);
  const dayKey = "draht:" + new Date(now).toISOString().slice(0, 10);
  const used = env.USAGE ? +(await env.USAGE.get(dayKey) || 0) : 0;
  if (used >= +(env.MAX_DRAHT_PER_DAY || 20)) return json({ reply: t.tooMany, action: "contact" }, 200, cors);
  const result = await sendMail(env, m, lang, messages, withTranscript);
  if (!result.ok) {
    console.error("Resend-Fehler", result.status, result.detail);
    return json({ reply: t.failed, action: "contact", sent: false }, 200, cors);
  }
  sentToday.push(now); perIpMessages.set(ip, sentToday);
  if (env.USAGE) await env.USAGE.put(dayKey, String(used + 1), { expirationTtl: 35 * 86400 }).catch(() => {});
  return json({ reply: t.sent(m.email), action: "message", sent: true }, 200, cors);
}

// Feedback zu den Werkzeugen: kurz, ohne Steuerzeichen; Name und Adresse nur, wenn der Besucher sie selbst genannt hat.
function gatherFeedback(m) {
  if (!m || typeof m !== "object") return null;
  const text = String(m.text || "").replace(/[\p{C}]/gu, " ").replace(/[„“”"]/g, "'").replace(/\s+/g, " ").trim().slice(0, 600);
  if (text.length < 3) return null;
  const email = EMAIL.test(String(m.email || "").trim()) ? String(m.email).trim() : "";
  const name = email ? String(m.name || "").replace(/[\p{C},]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80) : "";
  return { text, name, email };
}
function fromFeedback(text) {
  const m = String(text).match(/^(?:Ich gebe Robin dieses Feedback weiter: „|I'll pass this feedback on to Robin: “)([\s\S]*?)[“”](?: – (?:Von|From): (.*?), (\S+@\S+?)\.)?\.? (?:Soll ich|Shall I)/);
  if (!m || !m[1].trim()) return null;
  return { text: m[1].trim().slice(0, 600), name: (m[2] || "").trim(), email: m[3] && EMAIL.test(m[3]) ? m[3] : "" };
}
// Feedback zustellen: gleiche Grenzen wie der Draht (je Adresse und Tag, insgesamt je Tag), ohne Gesprächsverlauf.
async function deliverFeedback(env, f, lang, ip, now, day, t, cors) {
  const sentToday = (perIpMessages.get(ip) || []).filter(x => now - x < day);
  // Messegerät („kiosk:…“): viele Besucher hinter einer Kennung – nur die Tagesgrenze insgesamt gilt
  if (!String(ip).startsWith("kiosk:") && sentToday.length >= +(env.MAX_MESSAGES_PER_IP_PER_DAY || 3)) return json({ reply: t.tooMany, action: "contact" }, 200, cors);
  const dayKey = "draht:" + new Date(now).toISOString().slice(0, 10);
  const used = env.USAGE ? +(await env.USAGE.get(dayKey) || 0) : 0;
  if (used >= +(env.MAX_DRAHT_PER_DAY || 20)) return json({ reply: t.tooMany, action: "contact" }, 200, cors);
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return json({ reply: t.failed, action: "contact", sent: false }, 200, cors);
  const when = new Date(now).toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": "Bearer " + env.RESEND_API_KEY },
    body: JSON.stringify({
      from: env.MAIL_FROM || "Goch <onboarding@resend.dev>", to: [env.MAIL_TO], ...(f.email ? { reply_to: f.email } : {}),
      subject: "Goch: Feedback zu den Werkzeugen",
      text: [`Feedback über Goch (${lang === "en" ? "Englisch" : "Deutsch"}, ${when} Uhr):`, "", f.text, "",
        f.email ? `Von: ${f.name || "–"} <${f.email}> („Antworten“ geht an ihn)` : "Ohne Namen und Adresse.", "",
        "Ohne Gesprächsverlauf; der Besucher hat genau diesen Text bestätigt."].join("\n"),
    }),
  }).catch(() => null);
  if (!r || !r.ok) { console.error("Resend-Fehler (Feedback)", r && r.status); return json({ reply: t.failed, action: "contact", sent: false }, 200, cors); }
  sentToday.push(now); perIpMessages.set(ip, sentToday);
  if (env.USAGE) await env.USAGE.put(dayKey, String(used + 1), { expirationTtl: 35 * 86400 }).catch(() => {});
  return json({ reply: t.feedbackSent, action: null, sent: true }, 200, cors);
}

// Die Felder aus der eigenen Zusammenfassung lesen – zuverlässiger als jede Modellausgabe.
function fromSummary(text) {
  const m = text.match(/^(?:Ich richte Robin aus|I'll pass on to Robin): ([\s\S]*?) – (?:Von|From): (.*?), (\S+@\S+?)\.(?:\s|$)/);
  if (!m || !EMAIL.test(m[3])) return null;
  return { text: m[1].trim(), name: m[2].trim(), email: m[3] };
}

const FORMAT = `# Antwortformat

Antworte ausschließlich als JSON-Objekt ohne Markdown: {"reply": "…", "action": null}
"action" ist null oder eines von:
- "calendar": der Besucher möchte ein Gespräch oder einen Termin.
- "contact": der Besucher fragt nach Kontaktdaten.
- "message": der Besucher möchte Robin etwas ausrichten (oder hat Ja gesagt, als du angeboten hast, Robin zu fragen)
  UND hat seinen Namen und seine E-Mail-Adresse bereits genannt. Dann zusätzlich:
  "message": {"name": "…", "email": "…", "text": "…"} – Name und E-Mail-Adresse wörtlich aus den Nachrichten des
  Besuchers, "text" die Frage oder das Anliegen in seinen Worten. Nie Platzhalter wie "?" oder "unbekannt" eintragen.
  Fehlt Name oder E-Mail-Adresse: kein "message", sondern in "reply" danach fragen.
  Zusammenfassung, Rückfrage „Soll ich das so senden?“ und die Bestätigung „Ausgerichtet“ schreibt der Worker –
  du schreibst diese Sätze nie selbst.
- "newsletter": du bietest die Anmeldung zum Newsletter an, und der Besucher möchte sie (oder fragt, wie er von neuen
  Werkzeugen und Impulsen erfährt). Die Seite zeigt dann unter deiner Antwort ein Feld für die E-Mail-Adresse. Du fragst
  nie im Gespräch nach der Adresse für den Newsletter und sagst nie, jemand sei angemeldet.
- "feedback": der Besucher gibt Feedback zu Robins Werkzeugen (zum Beispiel zu SmartFormular FiBu lite). Dann zusätzlich
  "message": {"name": "", "email": "", "text": "…"} – "text" das Feedback in seinen Worten, ohne Beträge, Kontonummern
  oder Namen aus seinen Unterlagen. Name und E-Mail-Adresse nur, wenn er sie selbst genannt hat, sonst leer lassen.
  Zusammenfassung und Rückfrage schreibt der Worker.
"link" ist null oder eine Kennung aus „Links, die du anbieten darfst“ (falls vorhanden).
"link2" ist null – außer bei „Was gibt's Neues?“: dann die zweite Kennung (siehe Profil).
"reply" ist immer dein Text an den Besucher, in dessen Sprache.`;

// Stellen der Startseite, zu denen Goch führen darf (Robin, 23.10.2026: Goch zeigt, während er spricht). Die Seite kennt
// dieselben Kennungen (goch.js, ZIELE); alles andere wird verworfen.
export const ZIELE = ["werkzeuge", "workshops", "ueber-mich", "blog", "newsletter", "nachricht", "grundsaetze"];
// Nur wenn die Seite meldet, dass sie dorthin führen kann (kannZeigen, Sprachmodus der Startseite) – sonst bleibt alles wie vorher.
const ZEIGEN = `# Seite zeigen

Zusätzliches Feld "zeigen": null oder eine Stelle dieser Seite, zu der die Seite den Besucher führt, während du sprichst –
wenn er etwas sehen möchte („Zeig mir …“, „Wo finde ich …“) oder es deine Antwort klar unterstützt: "werkzeuge" (Werkzeuge
im Überblick), "workshops", "ueber-mich" (über Robin), "blog" (Impulse), "newsletter", "nachricht" (Robin schreiben),
"grundsaetze" (Robins Grundsätze). Dann sag in "reply" kurz, was dort zu sehen ist. Sonst null.`;

const CONFIRM = /^\s*(ja|yes|yep|jo|jap|ok|okay|sure|passt|stimmt|genau|richtig|sende|senden|schick|send|go ahead|do it|absenden)\b/i;
const DECLINE = /^\s*(nein|no|nope|lieber nicht|doch nicht|abbrechen|cancel|stop)\b|\b(nicht|don't|do not|not)\s+(senden|schicken|abschicken|send)\b/i;
const NO_TRANSCRIPT = /(ohne|nicht|kein|keinen|no|without|don't|do not|nur die nachricht|only the message)[^.!?]{0,60}(gespräch|verlauf|unterhaltung|chat|conversation|transcript|history)|(gespräch|verlauf|unterhaltung|conversation|transcript|history)[^.!?]{0,40}(nicht|weglassen|raus|weg|out|off|leave)/i;
const EMAIL_ANY = /[^\s@<>,;:"']+@[^\s@<>,;:"']+\.[^\s@<>,;:"']{2,}/;

// Felder für den Draht sammeln: Name, E-Mail-Adresse, Anliegen. Was das Modell liefert, gilt, wenn es brauchbar ist;
// sonst kommt es aus dem Verlauf – Adresse und Name aus der letzten Besuchernachricht mit Adresse (dort oft auch das
// Anliegen: „Max, max@example.com, bitte ruf mich an“), das Anliegen sonst aus der letzten Nachricht ohne Adresse.
// Liefert die Felder auch unvollständig; was fehlt, entscheidet über die nächste Rückfrage.
function gatherMessage(m, messages) {
  const out = { name: "", email: "", text: "" };
  if (m && typeof m === "object") {
    out.name = String(m.name || "").trim().slice(0, 80);
    out.email = String(m.email || "").trim().slice(0, 254);
    out.text = String(m.text || "").replace(/[',"\s]+$/, "").trim().slice(0, 2000);
  }
  const users = messages.filter(x => x.role === "user").map(x => x.content);
  let split = null, at = -1;
  for (let i = users.length - 1; i >= 0 && !split; i--) { split = splitVisitorMessage(users[i]); if (split) at = i; }
  if (!EMAIL.test(out.email)) out.email = split ? split.email : "";
  if (out.name.length < 2 || /[?]/.test(out.name)) {
    out.name = split && split.name ? split.name : "";
    // Sonst ein Name allein in einer eigenen Nachricht: zuerst danach (Antwort auf die Rückfrage), dann direkt davor
    const near = at < 0 ? [] : [...users.slice(at + 1).reverse(), ...(at > 0 ? [users[at - 1]] : [])];
    for (const u of near) {
      if (out.name) break;
      const c = u.trim().replace(/[.!]+$/, "");
      out.name = nameFrom(c) || (looksLikeName(c) ? c : "");
    }
  }
  if (!out.text || out.text.length < 3 || /[?]{2,}|\bunbekannt\b/i.test(out.text)) {
    out.text = split && split.text.length >= 3 ? split.text : "";
    if (!out.text) {
      // Das Anliegen ist die letzte Besuchernachricht ohne Adresse, die keine Bestätigung ist –
      // ohne die Einleitung „Ich möchte Robin etwas ausrichten:“.
      const candidates = users.filter(u => !CONFIRM.test(u) && !DECLINE.test(u) && !EMAIL_ANY.test(u) && u.trim().length >= 3)
        .map(u => u.replace(/^\s*(ich möchte|ich will|ich würde gern|i('d| would) like to|i want to)\s+(robin|ihm|him)?\s*(etwas|something)?\s*(ausrichten|mitteilen|sagen|leave a message|tell)\s*[:,.-]?\s*/i, "").trim())
        .filter(u => u.length >= 3 && !(out.name && u.replace(/[.!]+$/, "") === out.name));
      out.text = (candidates[candidates.length - 1] || "").slice(0, 2000);
    }
  }
  return out;
}
const hasSender = m => m.name.length >= 2 && !/[?]/.test(m.name) && EMAIL.test(m.email);
const isComplete = m => hasSender(m) && m.text.length >= 3;
// Nächste Antwort im Draht: Zusammenfassung, wenn alles da ist – sonst genau nach dem fragen, was fehlt.
function nextDrahtReply(t, m, whoAsked) {
  if (isComplete(m)) return t.summary(m);
  if (!hasSender(m)) return whoAsked ? t.invalid : t.askWho;
  return t.askWhat;
}

const GREETING = /^(hallo|hi|hey|moin|servus|grüß gott|guten (tag|morgen|abend)|liebe[rs]?|hello|dear|good (morning|afternoon|evening))\b/i;
const NOT_A_NAME = /^(bitte|danke|gern|gerne|ja|nein|ok|okay|test|termin|frage|rückruf|anruf|please|thanks|thank you|yes|no)\b/i;
const STRONG_INTRO = /(?:^|\b)(ich heiße|mein name ist|my name is|name)\s*:?\s+/i;
const WEAK_INTRO = /(?:^|\b)(ich bin|hier ist|hier spricht|i am|i'm|this is)\s+/i;
const FIELD_LABEL = /^\s*(?:e-?mail|mail|adresse|address|nachricht|message|anliegen)\s*:\s*/i;
const FIELD_LABEL_ANY = /\b(?:e-?mail|mail|adresse|address|nachricht|message|anliegen)\s*:\s*/gi;

function looksLikeName(s, maxWords = 3) {
  const words = s.trim().split(/\s+/);
  return s.length >= 2 && s.length <= 60 && words.length <= maxWords && !GREETING.test(s) && !NOT_A_NAME.test(s)
    && words.every(w => /^[\p{L}][\p{L}'.-]*$/u.test(w));
}
// Name aus einem eingeleiteten Teil: „mein Name ist …“ trägt bis vier Wörter; „ich bin …“ nur zwei Wörter oder
// durchgehend großgeschrieben – sonst würde „ich bin interessiert an …“ zum Namen.
function nameFrom(p) {
  let m = p.match(STRONG_INTRO);
  if (m) { const c = p.slice(m.index + m[0].length).trim(); return looksLikeName(c, 4) ? c : ""; }
  m = p.match(WEAK_INTRO);
  if (m) {
    const c = p.slice(m.index + m[0].length).trim(), words = c.split(/\s+/);
    return looksLikeName(c) && (words.length <= 2 || words.every(w => /^\p{Lu}/u.test(w))) ? c : "";
  }
  return "";
}

// Eine Besuchernachricht mit E-Mail-Adresse zerlegen. Teile trennen Komma, Semikolon, Zeilenumbruch, Gedankenstrich
// und Satzende. Name ist ein ausdrücklich eingeleiteter Teil („ich heiße …“) oder der kurze Teil direkt vor oder nach
// der Adresse; der Rest ist das Anliegen. Ohne gültige Adresse: null.
function splitVisitorMessage(text) {
  const src = String(text), hit = src.match(EMAIL_ANY);
  if (!hit) return null;
  const email = hit[0].replace(/[.!?)\]]+$/, "");
  if (!EMAIL.test(email)) return null;
  const raw = src.replace(hit[0], "\n\u0000\n").split(/\n|[;,]|\s[–-]\s|(?<=[.!?])\s+/);
  const parts = raw.map(p => p === "\u0000" ? p : p.replace(FIELD_LABEL, "").replace(/^[\s.:–-]+|[\s.:!–-]+$/g, "").trim());
  const pos = parts.indexOf("\u0000");
  let nameIdx = -1, name = "";
  // 1. ausdrücklich eingeleitet: „ich heiße Max Muster“, „mein Name ist …“, „Name: …“
  parts.forEach((p, i) => {
    if (nameIdx >= 0 || !p || p === "\u0000") return;
    const c = nameFrom(p);
    if (c) { nameIdx = i; name = c; }
  });
  // 2. sonst der kurze Teil direkt vor der Adresse, dann direkt danach, dann der erste kurze Teil überhaupt
  if (nameIdx < 0) {
    for (const i of [pos - 1, pos + 1, ...parts.keys()]) {
      const p = parts[i];
      if (i >= 0 && i < parts.length && p && p !== "\u0000" && !STRONG_INTRO.test(p) && !WEAK_INTRO.test(p) && looksLikeName(p)) { nameIdx = i; name = p; break; }
    }
  }
  // Anliegen: der Wortlaut ohne Adresse, Namensteil und Feldbezeichnungen; übrige Trennzeichen aufgeräumt
  let rest = src.replace(hit[0], " " + hit[0].slice(email.length)); // Satzzeichen hinter der Adresse bleibt
  if (nameIdx >= 0) rest = rest.replace(raw[nameIdx], " ");
  return { email, name, text: tidyRest(rest).slice(0, 2000) };
}

// Reste nach dem Herauslösen aufräumen: verwaiste Kommas, doppelte Punkte, Trennzeichen am Rand.
function tidyRest(s) {
  let r = s.replace(FIELD_LABEL_ANY, " ").replace(/\s+/g, " "), prev;
  do { prev = r; r = r.replace(/\s*[,;]\s*(?=[,;.!?]|$)/g, ""); } while (r !== prev);
  return r.replace(/([.!?])\s*[.,;]+/g, "$1").replace(/\s+([.!?,;])/g, "$1").replace(/^[\s,;:.–-]+|[\s,;:–-]+$/g, "").trim();
}

// Profil, Aktuell und Links: Quelle ist das Repository (Robin pflegt sie in der Redaktion, die dort Commits schreibt).
// Der KV hält eine Kopie für schnelle Antworten; alle fünf Minuten wird sie im Hintergrund mit der
// Rohfassung auf GitHub abgeglichen, damit auch Änderungen außerhalb der Redaktion ankommen.
// Ohne KV oder GitHub gelten die mitgelieferten Dateien (das Profil also auch nach einem Deploy ohne KV-Kopie).
const CONTENT_FILES = { profile: "worker/profile.md", aktuell: "worker/aktuell.md", links: "worker/links.md" };
async function loadContent(env, ctx) {
  let profile = PROFILE, aktuell = AKTUELL, linksMd = LINKS_MD;
  if (env.USAGE) {
    const [p, a, l, checked] = await Promise.all(["content:profile", "content:aktuell", "content:links", "content:checked"].map(k => env.USAGE.get(k).catch(() => null)));
    if (p && p.trim().length > 500) profile = p; // ein leeres oder verstümmeltes Profil darf Goch nicht stumm machen
    if (a) aktuell = a;
    if (l) linksMd = l;
    if (env.GITHUB_REPO && ctx && (!checked || Date.now() - +checked > 300_000)) ctx.waitUntil(refreshContent(env, { profile: p, aktuell: a, links: l }));
  }
  const links = parseLinks(linksMd);
  // Seitenwissen (seitenwissen.js): alle Inhalte der Website, im Hintergrund aufgefrischt; jede Seite auch als Link
  const seiten = await seitenLaden(env, ctx);
  const alle = links.concat(seitenLinks(seiten, links));
  return { profile, aktuell, seiten, links: alle, linkIds: alle.map(x => x.id) };
}
async function refreshContent(env, known) {
  await env.USAGE.put("content:checked", String(Date.now()), { expirationTtl: 3600 }).catch(() => {});
  for (const [key, path] of Object.entries(CONTENT_FILES)) {
    try {
      const fresh = await githubRaw(env, path);
      if (fresh && fresh !== known[key]) await env.USAGE.put("content:" + key, fresh);
    } catch (e) { console.error("Abgleich mit GitHub", key, String(e && e.message || e)); }
  }
}

// links.md: Tabelle „Kennung | Wann | Text DE | Text EN | Adresse“. Zeilen ohne gültige https-Adresse gelten nicht.
function parseLinks(md) {
  const out = [];
  for (const line of String(md).split("\n")) {
    if (!/^\s*\|/.test(line) || /^\s*\|\s*-{3,}/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map(c => c.trim());
    if (cells.length < 5) continue;
    let [id, when, de, en, url] = cells;
    id = id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!id || id === "kennung" || !when || !de) continue;
    // Adresse: eine für beide Sprachen oder zwei, durch Leerzeichen getrennt (erst deutsch, dann englisch)
    const urls = url.split(/\s+/).filter(Boolean).slice(0, 2).map(u => /^https?:\/\//i.test(u) ? u : "https://" + u);
    if (!urls.length || !urls.every(u => /^https:\/\/[^\s"'<>]+$/i.test(u))) continue;
    out.push({ id, when, de, en: en || de, url: urls.join(" "), urls });
  }
  return out;
}
function linksPrompt(links) {
  if (!links.length) return "";
  return "\n\n# Links, die du anbieten darfst\n\nGib im Feld \"link\" die Kennung an – nur wenn die Frage " +
    "das Thema selbst trifft, höchstens einen je Antwort, sonst null. Die Adresse schreibst du nie in den Text; " +
    "den Titel in Anführungszeichen darfst du nennen (z. B. bei deinem Lieblingslied).\n" +
    links.map(l => `- ${l.id} („${l.de}“): ${l.when}`).join("\n");
}
function resolveLink(id, lang, messages, links) {
  const l = links.find(x => x.id === id);
  if (!l) return null;
  const label = lang === "en" ? l.en : l.de;
  const offered = messages.some(m => m.role === "assistant" && m.content.includes("(Link: " + label + ")"));
  const urls = l.urls || [l.url];
  return offered ? null : { label, url: (lang === "en" && urls[1]) || urls[0] };
}

// Antwortschema: das Modell kann nur dieses Format liefern – kein kaputtes JSON, keine Platzhalter im Aufbau.
const gochOutput = linkIds => z.object({
  reply: z.string(),
  action: z.enum(["calendar", "contact", "message", "newsletter", "feedback"]).nullable(),
  message: z.object({ name: z.string(), email: z.string(), text: z.string() }).nullable(),
  link: linkIds.length ? z.enum(linkIds).nullable() : z.null(),
  link2: linkIds.length ? z.enum(linkIds).nullable() : z.null(),
  zeigen: z.enum(ZIELE).nullable(),
});

export async function complete(env, system, messages, linkIds = [], settings = null) {
  settings = settings || { provider: env.PROVIDER || "anthropic", model: env.MODEL || "claude-opus-5-5", cache: true, custom: {} };
  const provider = settings.provider;
  const started = Date.now();
  if (provider === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY fehlt");
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const response = await client.beta.messages.create({
      model: settings.model || "claude-opus-5-5",
      max_tokens: 1024,
      // Das Profil ist bei jeder Frage identisch → Prompt-Caching: ab der zweiten Frage ein Zehntel des Preises.
      // In der Redaktion abschaltbar (zum Vergleich der Kosten oder bei Problemen).
      system: [{ type: "text", text: system, ...(settings.cache !== false ? { cache_control: { type: "ephemeral" } } : {}) }],
      messages,
      // Kurze Gesprächsantworten brauchen wenig Denkarbeit; das Schema erzwingt das Antwortformat.
      output_config: { effort: "low", format: zodOutputFormat(gochOutput(linkIds)) },
      // Empfehlung von Anthropic: bei einer seltenen Ablehnung durch die Sicherheitsprüfung
      // beantwortet ein Schwestermodell die Anfrage im selben Aufruf.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") return JSON.stringify({ reply: "", action: "contact", message: null });
    lastUsage = { model: response.model, input: response.usage.input_tokens, cache_write: response.usage.cache_creation_input_tokens,
      cache_read: response.usage.cache_read_input_tokens, output: response.usage.output_tokens, ms: Date.now() - started };
    return response.content.filter(b => b.type === "text").map(b => b.text).join("");
  }
  if (provider === "openai") {
    // Anderer Anbieter über die OpenAI-kompatible Schnittstelle (OpenAI, Mistral, Groq, DeepSeek, OpenRouter, …).
    // Bekommt denselben Kontext und dieselben Anweisungen; JSON-Antwort erbeten, parse() rettet notfalls.
    const key = env.CUSTOM_API_KEY || settings.custom.key;
    if (!key || !settings.custom.baseUrl || !settings.custom.model) throw new Error("Anderer Anbieter unvollständig eingerichtet");
    const r = await fetch(settings.custom.baseUrl.replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + key },
      body: JSON.stringify({
        model: settings.custom.model, max_tokens: 600, temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system + "\n\nAntworte ausschließlich mit dem JSON-Objekt." }, ...messages],
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("Anbieter " + r.status + ": " + String(d && d.error && d.error.message || JSON.stringify(d)).slice(0, 200));
    const choice = d.choices && d.choices[0] && d.choices[0].message;
    const text = choice ? (typeof choice.content === "string" ? choice.content : JSON.stringify(choice.content)) : "";
    lastUsage = { model: d.model || settings.custom.model, input: d.usage && d.usage.prompt_tokens, output: d.usage && d.usage.completion_tokens,
      cache_read: d.usage && d.usage.prompt_tokens_details && d.usage.prompt_tokens_details.cached_tokens, ms: Date.now() - started };
    return text;
  }
  // Workers AI (kostenlos). Erst im JSON-Modus (zuverlässiges Format), bei Ablehnung ohne.
  if (!env.AI) throw new Error("Workers AI nicht eingebunden");
  const model = /^@cf\//.test(settings.model) ? settings.model : "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  // Kürzeres Limit und Wiederholungsstrafe: das Modell neigt sonst zu Endlosschleifen aus Abschiedsformeln.
  const input = { messages: [{ role: "system", content: system }, ...messages], max_tokens: 320, temperature: 0.45,
    repetition_penalty: 1.15, frequency_penalty: 0.4 };
  let d, first;
  try {
    d = await env.AI.run(model, { ...input, response_format: { type: "json_schema", json_schema: schemaFor(linkIds) } });
  } catch (e) {
    first = e;
    try { d = await env.AI.run(model, input); }
    catch (e2) { throw new Error("mit Schema: " + String(first && first.message || first) + " | ohne Schema: " + String(e2 && e2.message || e2)); }
  }
  lastUsage = { model, ms: Date.now() - started };
  return asText(d);
}

const schemaFor = linkIds => ({
  type: "object",
  properties: {
    reply: { type: "string" },
    action: { type: ["string", "null"], enum: ["calendar", "contact", "message", null] },
    link: { type: ["string", "null"], enum: [...linkIds, null] },
    zeigen: { type: ["string", "null"], enum: [...ZIELE, null] },
    message: { type: ["object", "null"], properties: { name: { type: "string" }, email: { type: "string" }, text: { type: "string" } }, required: ["name", "email", "text"] },
  },
  required: ["reply", "action"],
});

// Workers AI antwortet je nach Modell und Modus mit Text, { response: Text }, { response: Objekt }
// oder im OpenAI-Format; alles wird zu dem Text, den parse() liest.
function asText(d) {
  if (typeof d === "string") return d;
  if (!d || typeof d !== "object") return "";
  if (typeof d.response === "string") return d.response;
  if (d.response && typeof d.response === "object") return JSON.stringify(d.response);
  const choice = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  if (typeof choice === "string") return choice;
  return JSON.stringify(d);
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

function parse(text, linkIds = []) {
  text = String(text);
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const o = JSON.parse(m[0]);
      const action = ["calendar", "contact", "message", "newsletter", "feedback"].includes(o.action) ? o.action : null;
      const reply = typeof o.reply === "string" ? o.reply : (o.reply == null ? "" : JSON.stringify(o.reply));
      const out = { reply: tidy(reply), action, link: linkIds.includes(o.link) ? o.link : null, link2: linkIds.includes(o.link2) ? o.link2 : null, zeigen: ZIELE.includes(o.zeigen) ? o.zeigen : null };
      if ((action === "message" || action === "feedback") && o.message && typeof o.message === "object") out.message = o.message;
      return out;
    } catch {}
  }
  // Abgeschnittenes oder kaputtes JSON (Token-Limit, Endlosschleife): retten, was da ist.
  if (/^\s*\{/.test(text)) {
    const reply = (text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/) || [])[1] || "";
    const action = (text.match(/"action"\s*:\s*"(calendar|contact|message|newsletter|feedback)"/) || [])[1] || null;
    const link = (text.match(/"link"\s*:\s*"([a-z0-9-]+)"/) || [])[1] || null;
    const zeigen = (text.match(/"zeigen"\s*:\s*"([a-z-]+)"/) || [])[1] || null;
    const out = { reply: tidy(reply.replace(/\\"/g, '"').replace(/\\n/g, " ")), action, link: linkIds.includes(link) ? link : null, zeigen: ZIELE.includes(zeigen) ? zeigen : null };
    if (action === "message" || action === "feedback") {
      const name = (text.match(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || "";
      const email = (text.match(/"email"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || "";
      const body = (text.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || "";
      out.message = { name, email, text: body };
    }
    return out;
  }
  return { reply: tidy(text), action: null, link: null };
}

// Doppelte Sätze streichen (Endlosschleifen), Länge kappen, am Satzende abschneiden.
function tidy(reply) {
  const seen = new Set(), keep = [];
  // Die Sprechblase zeigt Text roh: Markdown-Zeichen (Sternchen, Backticks, Unterstriche) entfernen.
  reply = String(reply).replace(/\s*\(Link: [^)]*\)/g, "").replace(/\*\*?([^*]+)\*\*?/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/(^|\s)_([^_]+)_(?=\s|[.,;:!?]|$)/g, "$1$2");
  for (const part of reply.trim().split(/(?<=[.!?])\s+/)) {
    const key = part.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key); keep.push(part);
  }
  let out = keep.join(" ").slice(0, 700);
  if (out.length === 700) out = out.replace(/\s+\S*$/, "") + " …";
  return out;
}

// Versand über Resend (kostenloser Tarif; Absender resend.dev, bis eine eigene Domain da ist).
// Nichts wird gespeichert. Robin bekommt die bestätigte Nachricht und – auf seinen Wunsch – den
// Gesprächsverlauf dieser Runde, damit er den Zusammenhang kennt (steht so im Datenschutztext
// und in der Rückfrage an den Besucher).
async function sendMail(env, m, lang, messages, withTranscript = true) {
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return { ok: false, status: 0, detail: "RESEND_API_KEY oder MAIL_TO fehlt" };
  const when = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  const transcript = messages.slice(0, -1) // die Bestätigung selbst ist kein Inhalt
    .map(x => (x.role === "user" ? "Besucher: " : "Goch: ") + x.content.replace(/\s+/g, " ").trim()).join("\n");
  const text = [
    `Goch richtet aus (${lang === "en" ? "Englisch" : "Deutsch"}, ${when} Uhr):`, "",
    m.text, "",
    `Von: ${m.name} <${m.email}>`, "",
    "Der Besucher erwartet eine persönliche Antwort. „Antworten“ geht direkt an ihn (Antwort-an ist gesetzt).", "",
    withTranscript ? "— Gesprächsverlauf —\n" + transcript : "(Der Besucher wollte den Gesprächsverlauf nicht mitschicken.)",
  ].join("\n");
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + env.RESEND_API_KEY },
      body: JSON.stringify({
        from: env.MAIL_FROM || "Goch <onboarding@resend.dev>",
        to: [env.MAIL_TO],
        reply_to: m.email,
        subject: `Goch: Nachricht von ${m.name}`,
        text,
      }),
    });
    const detail = await r.text().catch(() => "");
    let id = "";
    try { id = JSON.parse(detail).id || ""; } catch {}
    return { ok: r.ok, status: r.status, detail: detail.slice(0, 300), id };
  } catch (e) { return { ok: false, status: 0, detail: String(e).slice(0, 300) }; }
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}

// Testfrage aus der Redaktion: derselbe Kontext, dieselben Anweisungen, das eingestellte Modell –
// aber ohne Tageszähler, ohne Draht-Logik. Liefert Antwort und Verbrauch, damit Robin sieht, was verbunden ist.
async function testGoch(env, question, settings, lang = "de") {
  const content = await loadContent(env, null);
  const system = ohneKommentarkopf(content.profile) + "\n\n# Woran Robin gerade arbeitet\n\n" + content.aktuell + seitenPrompt(content.seiten) + linksPrompt(content.links) + "\n\n" + FORMAT;
  lastUsage = null;
  const text = await complete(env, system, [{ role: "user", content: String(question || (lang === "en" ? "Who is Robin?" : "Wer ist Robin?")).slice(0, 600) }], content.linkIds, settings);
  const out = parse(text, content.linkIds);
  out.link = resolveLink(out.link, lang, [], content.links);
  await rememberStatus(env, lastUsage, settings.provider);
  return { reply: out.reply, action: out.action, link: out.link, usage: lastUsage, raw: String(text).slice(0, 600) };
}
