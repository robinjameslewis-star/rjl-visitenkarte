// Newsletter „Impulse“: Anmeldung mit Double-Opt-In über Brevo (Sendinblue SAS, Frankreich). POST /newsletter
// { lang, email, website (Falle, bleibt leer), t (Zeitstempel beim Laden) }
// Der Worker legt den Kontakt über die Brevo-API an (POST /v3/contacts/doubleOptinConfirmation); Brevo schickt die
// Bestätigungsmail aus der Vorlage, erst nach dem Klick steht die Adresse in der Liste. Der Versand der Impulse läuft bei Brevo
// (RSS-Kampagne aus blog/feed.xml bzw. blog/en/feed.xml) – also erst, wenn Robin einen Beitrag veröffentlicht hat.
// Solange BREVO_API_KEY (Secret) und die IDs von Liste und Vorlage fehlen, antwortet der Endpunkt mit 503.
// Ob eine Adresse schon angemeldet ist, verrät die Antwort nicht: Jede gültige Anmeldung bekommt dieselbe Rückmeldung.

const perIp = new Map(); // je Instanz: ip -> [timestamps]
const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

const TEXT = {
  de: {
    ok: "Fast geschafft: Bitte bestätige die Anmeldung über den Link in der E-Mail, die gerade unterwegs ist.",
    invalid: "Bitte eine gültige E-Mail-Adresse angeben.",
    tooFast: "Das ging zu schnell – bitte noch einmal senden.",
    tooMany: "Für heute reicht es von dieser Adresse.",
    notYet: "Der Newsletter startet in Kürze – bitte schau bald wieder vorbei.",
    failed: "Die Anmeldung hat nicht geklappt. Bitte versuch es später noch einmal.",
  },
  en: {
    ok: "Almost done: please confirm via the link in the email that is on its way.",
    invalid: "Please enter a valid email address.",
    tooFast: "That was too quick – please send again.",
    tooMany: "That's enough from this address for today.",
    notYet: "The newsletter starts soon – please check back shortly.",
    failed: "Signing up didn't work. Please try again later.",
  },
};

export const eingerichtet = env => Boolean(env.BREVO_API_KEY && env.BREVO_LISTE_DE && env.BREVO_DOI_VORLAGE_DE && env.NEWSLETTER_BESTAETIGT_URL);

export async function handleNewsletter(request, env, ctx, cors) {
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors } });
  let body; try { body = await request.json(); } catch { return json({ error: "Ungültige Anfrage." }, 400); }
  const lang = body.lang === "en" ? "en" : "de", t = TEXT[lang];
  const email = String(body.email == null ? "" : body.email).trim().toLowerCase().slice(0, 120);

  if (String(body.website || "").trim()) return json({ ok: true, text: t.ok }); // Falle für Bots: still schlucken
  const alter = Date.now() - +(body.t || 0);
  if (!(alter >= 3000 && alter <= 86400_000)) return json({ error: t.tooFast }, 400);
  if (!EMAIL.test(email)) return json({ error: t.invalid }, 400);
  if (!eingerichtet(env)) return json({ error: t.notYet }, 503);

  // Grenzen: 3 je Besucher und Tag (je Instanz), MAX_NEWSLETTER_PER_DAY insgesamt (Zähler ohne Personenbezug)
  const ip = request.headers.get("CF-Connecting-IP") || "0", jetzt = Date.now();
  const gesendet = (perIp.get(ip) || []).filter(x => jetzt - x < 86400_000);
  if (gesendet.length >= 3) return json({ error: t.tooMany }, 429);
  let tagKey = null;
  if (env.USAGE) {
    tagKey = "newsletter:" + new Date().toISOString().slice(0, 10);
    if (+(await env.USAGE.get(tagKey) || 0) >= +(env.MAX_NEWSLETTER_PER_DAY || 100)) return json({ error: t.failed }, 429);
  }

  const liste = +(lang === "en" && env.BREVO_LISTE_EN ? env.BREVO_LISTE_EN : env.BREVO_LISTE_DE);
  const vorlage = +(lang === "en" && env.BREVO_DOI_VORLAGE_EN ? env.BREVO_DOI_VORLAGE_EN : env.BREVO_DOI_VORLAGE_DE);
  const ziel = new URL(env.NEWSLETTER_BESTAETIGT_URL);
  if (lang === "en") ziel.searchParams.set("lang", "en");
  const r = await fetch("https://api.brevo.com/v3/contacts/doubleOptinConfirmation", {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json", "api-key": env.BREVO_API_KEY },
    // Öffnungs- und Klickmessung nur anonym (contactPixelTrackingConsent: false)
    body: JSON.stringify({ email, includeListIds: [liste], templateId: vorlage, redirectionUrl: ziel.href, contactPixelTrackingConsent: false }),
  }).catch(() => null);
  // 201/204: Bestätigungsmail unterwegs. 400 „duplicate_parameter“: schon angemeldet – dieselbe Antwort, nichts verraten.
  let ok = r && (r.status === 201 || r.status === 204);
  if (r && r.status === 400) {
    const d = await r.json().catch(() => ({}));
    ok = /duplicate/i.test(String(d.code || "") + String(d.message || ""));
    if (!ok) console.error("Newsletter: Brevo 400", d.code); // ohne Adresse
  } else if (!ok) console.error("Newsletter: Brevo", r && r.status);
  if (!ok) return json({ error: t.failed }, 502);
  gesendet.push(jetzt); perIp.set(ip, gesendet);
  if (tagKey) ctx.waitUntil(env.USAGE.put(tagKey, String(+(await env.USAGE.get(tagKey) || 0) + 1), { expirationTtl: 35 * 86400 }));
  return json({ ok: true, text: t.ok });
}
