// Kontaktformular der Website – der zweite Eingang neben Goch. POST /contact
// { lang, name, email, phone, message, website (Falle, bleibt leer), t (Zeitstempel beim Laden) }
// Zustellung per Resend an MAIL_TO mit reply_to auf den Absender. Nichts wird gespeichert; nur ein
// Tageszähler ohne Personenbezug (contact:YYYY-MM-DD) begrenzt Missbrauch, dazu 3 Nachrichten je Adresse und Tag.

const perIp = new Map(); // je Instanz: ip -> [timestamps]
const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

const TEXT = {
  de: {
    invalid: "Bitte Name, eine gültige E-Mail-Adresse und eine Nachricht angeben.",
    tooFast: "Das ging zu schnell – bitte noch einmal senden.",
    tooMany: "Für heute reicht es von dieser Adresse – schreib mir gern direkt per E-Mail.",
    failed: "Das Senden hat nicht geklappt. Bitte schreib mir direkt per E-Mail.",
  },
  en: {
    invalid: "Please give your name, a valid email address and a message.",
    tooFast: "That was too quick – please send again.",
    tooMany: "That's enough from this address for today – please email me directly.",
    failed: "Sending didn't work. Please email me directly.",
  },
};

export async function handleContact(request, env, ctx, cors) {
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors } });
  let body; try { body = await request.json(); } catch { return json({ error: "Ungültige Anfrage." }, 400); }
  const lang = body.lang === "en" ? "en" : "de", t = TEXT[lang];
  const clean = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
  const name = clean(body.name, 80), email = clean(body.email, 120).toLowerCase(), phone = clean(body.phone, 40);
  const message = String(body.message == null ? "" : body.message).replace(/\r\n?/g, "\n").trim().slice(0, 3000);

  // Falle für Bots: das unsichtbare Feld muss leer bleiben; Menschen brauchen ein paar Sekunden.
  if (clean(body.website, 10)) return json({ ok: true }); // still schlucken
  const age = Date.now() - +(body.t || 0);
  if (!(age >= 4000 && age <= 86400_000)) return json({ error: t.tooFast }, 400);
  if (name.length < 2 || !EMAIL.test(email) || message.length < 10) return json({ error: t.invalid }, 400);
  if (phone && !/^[+\d][\d\s()/.-]{4,}$/.test(phone)) return json({ error: t.invalid }, 400);

  // Grenzen: 3 je Adresse und Tag, 30 am Tag insgesamt (ohne Personenbezug)
  const ip = request.headers.get("CF-Connecting-IP") || "0", now = Date.now(), day = 86400_000;
  const sent = (perIp.get(ip) || []).filter(x => now - x < day);
  if (sent.length >= +(env.MAX_MESSAGES_PER_IP_PER_DAY || 3)) return json({ error: t.tooMany }, 429);
  let dayKey = null;
  if (env.USAGE) {
    dayKey = "contact:" + new Date().toISOString().slice(0, 10);
    const used = +(await env.USAGE.get(dayKey) || 0);
    if (used >= +(env.MAX_CONTACT_PER_DAY || 30)) return json({ error: t.tooMany }, 429);
  }
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return json({ error: t.failed }, 503);

  const when = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" });
  const text = [
    `Nachricht über das Formular der Website (${lang === "en" ? "Englisch" : "Deutsch"}, ${when} Uhr):`, "",
    message, "",
    "—",
    `Von: ${name}`,
    `E-Mail: ${email}`,
    phone ? `Telefon: ${phone}` : null,
    "", "Antworten geht direkt auf diese Mail (Antwortadresse ist die des Absenders).",
  ].filter(x => x !== null).join("\n");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": "Bearer " + env.RESEND_API_KEY },
    body: JSON.stringify({ from: env.MAIL_FROM || "Goch <onboarding@resend.dev>", to: [env.MAIL_TO], reply_to: email,
      subject: `Website: Nachricht von ${name}`, text }),
  }).catch(() => null);
  if (!r || !r.ok) {
    console.error("Kontaktformular: Resend", r && r.status, r ? (await r.text()).slice(0, 200) : "keine Antwort");
    return json({ error: t.failed }, 502);
  }
  sent.push(now); perIp.set(ip, sent);
  if (dayKey) ctx.waitUntil(env.USAGE.put(dayKey, String(+(await env.USAGE.get(dayKey) || 0) + 1), { expirationTtl: 35 * 86400 }));
  return json({ ok: true });
}
