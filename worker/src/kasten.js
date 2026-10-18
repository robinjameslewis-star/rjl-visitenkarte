// Newsletter-Anmeldung unter jedem Impuls, den Impuls-Listen und allen Werkzeugseiten (blog.js, werkzeug.js; Robin, 15.10.2026).
// Der Kasten ist zunächst verborgen; newsletter.js zeigt ihn, sobald am <body> data-newsletter-endpoint steht, und meldet mit der
// Sprache der Seite an (deutsche bzw. englische Liste in Brevo). Sie-Form wie in den Impulsen.

// Wie data-newsletter-endpoint auf der Startseite (index.html)
export const NEWSLETTER_ENDPUNKT = "https://goch.robin.vision/newsletter";
export const NEWSLETTER_SKRIPT = "newsletter.js?v=20261016";

const TEXT = {
  de: {
    impuls: ["Impulse, Werkzeuge und Workshops per E-Mail", "Jeden Freitag der neue Impuls, dazu Neues zu den Werkzeugen und Workshops. Jederzeit abbestellbar."],
    werkzeug: ["Neues zu den Werkzeugen per E-Mail", "Der Newsletter informiert über neue Werkzeuge, neue Fassungen und die Workshops, dazu jeden Freitag über den neuen Impuls. Für den Download ist keine Anmeldung nötig."],
    email: "E-Mail-Adresse", senden: "Anmelden",
    hinweis: privacy => `Nach dem Absenden kommt eine E-Mail mit einem Bestätigungslink; erst danach sind Sie angemeldet. Versand über Brevo, abbestellen jederzeit über den Link in jeder Ausgabe. Einzelheiten unter <a href="${privacy}">Datenschutz</a>.`,
  },
  en: {
    impuls: ["Food for Thought, tools and workshops by email", "The new post every Friday, plus news of the tools and workshops. Unsubscribe at any time."],
    werkzeug: ["News of the tools by email", "The newsletter reports on new tools, new versions and the workshops, plus the new post every Friday. No sign-up is needed for the download."],
    email: "Email address", senden: "Subscribe",
    hinweis: privacy => `After sending you will receive an email with a confirmation link; you are subscribed only once you have confirmed. Sent via Brevo; unsubscribe at any time via the link in every issue. Details under <a href="${privacy}">Privacy</a>.`,
  },
};

// up: Weg zur Startseite („../../“); art: "impuls" oder "werkzeug"
export function newsletterKasten(lang, up, art = "impuls") {
  const t = TEXT[lang === "en" ? "en" : "de"], [titel, text] = t[art] || t.impuls;
  const privacy = up + (lang === "en" ? "?lang=en" : "") + "#privacy";
  return `<section class="newsletter" id="newsletter" aria-labelledby="newsletter-title" hidden>
<h2 id="newsletter-title">${titel}</h2>
<p>${text}</p>
<form id="newsletter-form" novalidate>
<div class="field"><label for="nl-email">${t.email}</label><input id="nl-email" name="email" type="email" required maxlength="120" autocomplete="email" inputmode="email" placeholder="${t.email}"></div>
<div class="field hp" aria-hidden="true"><label for="nl-website">Website</label><input id="nl-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
<button type="submit" id="nl-send">${t.senden}</button><span class="msg-status" id="nl-status" role="status" aria-live="polite"></span>
<p class="hint">${t.hinweis(privacy)}</p>
</form>
</section>`;
}

export const NEWSLETTER_CSS = `.newsletter { margin: 40px 0 8px; padding: 18px 22px; border: 1px solid var(--line); border-left: 2px solid var(--green); border-radius: 3px; background: rgba(255,255,255,.4); }
.newsletter h2 { font: 400 22px/1.25 var(--serif); color: var(--green); margin: 0 0 6px; }
.newsletter p { margin: 0 0 12px; max-width: 68ch; }
.newsletter form { display: flex; flex-wrap: wrap; gap: 8px 10px; align-items: center; }
.newsletter label { position: absolute; left: -9999px; }
.newsletter .field:not(.hp) { flex: 1 1 260px; min-width: 0; }
.newsletter input[type=email] { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 3px; font: inherit; font-size: 15px; background: #fff; }
.newsletter button { padding: 10px 18px; border: 1px solid var(--green); border-radius: 3px; color: var(--green); background: transparent; font: inherit; font-size: 15px; cursor: pointer; }
.newsletter button:hover { background: var(--green); color: var(--paper); }
.newsletter .hp { position: absolute; left: -9999px; }
.newsletter .msg-status { flex-basis: 100%; font-size: 14px; color: var(--ink-soft); }
.newsletter .msg-status:empty { display: none; }
.newsletter .msg-status.ok { color: var(--green); }
.newsletter .msg-status.warn { color: #8a3b12; }
.newsletter .hint { flex-basis: 100%; margin: 0; font-size: 13px; color: var(--ink-muted); }
.newsletter .hint a { color: inherit; }`;
