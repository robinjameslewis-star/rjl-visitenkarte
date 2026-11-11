// Kostenbremsen der Website atomar (Sicherheitsprüfung 11.11.2026, M3): Prüfen und Buchen in einem Schritt im Durable Object
// „Geraetebudget“ (src/kiosk.js), Instanz „website:kosten“. Vorher lasen Worker-Instanzen einen KV-Zähler und schrieben ihn
// später zurück; viele gleichzeitige Anfragen kamen so über den Deckel. Die KV-Zähler bleiben für die Anzeige in der Redaktion.
//   art: "antworten" (Modellaufrufe je Tag), "zeichen" (vertonte Zeichen je Monat), "sekunden"/"anfragen" (Spracheingabe je Tag)
//   start: Stand aus dem KV, mit dem ein neuer Zeitraum beginnt (Übergang: der laufende Tag oder Monat zählt weiter)
// Ergebnis { ok, stand }; ist das Durable Object nicht erreichbar, { ok: false } – lieber keine Antwort als ohne Deckel.
// Negative Menge bucht zurück (nicht vertont, nicht erkannt).
export const KOSTEN = "website:kosten";

export function kostenBuchen(env, art, menge, grenze, zeitraum = "tag", start = 0) {
  return buchenIn(env, KOSTEN, art, menge, grenze, zeitraum, start);
}
// dasselbe in einer eigenen Instanz (z. B. Fehlversuche je Anmeldecode, src/lizenz.js)
export async function buchenIn(env, name, art, menge, grenze, zeitraum = "tag", start = 0) {
  if (!env.GERAETE) return { ok: true, ohne: true }; // ohne Bindung (alte Tests): nur der KV-Zähler davor
  try {
    const o = env.GERAETE.get(env.GERAETE.idFromName(name));
    const r = await o.fetch("https://geraet/buchen", { method: "POST", body: JSON.stringify({ art, menge, grenze, zeitraum, start: +start || 0 }) });
    const d = await r.json();
    return { ok: d.ok === true, stand: d.stand };
  } catch (e) {
    console.error("Kostenbremse", String(e && e.message || e).slice(0, 200));
    return { ok: false };
  }
}

// Anfragen je Adresse und Minute über die Cloudflare-Bindung GOCH_IP_LIMIT; zählt über alle Instanzen eines Standorts.
// Fehlt die Bindung oder antwortet sie nicht, bleibt nur die weiche Grenze je Instanz davor.
export async function adresseFrei(env, bereich, ip) {
  if (!env.GOCH_IP_LIMIT) return true;
  try { return (await env.GOCH_IP_LIMIT.limit({ key: bereich + ":" + ip })).success !== false; } catch { return true; }
}
