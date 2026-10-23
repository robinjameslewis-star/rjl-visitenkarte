// Betriebseinstellungen für Goch, änderbar in der Redaktion ohne Deploy: an/aus, Anbieter, Modell, Cache,
// ein zweiter Anbieter über eine OpenAI-kompatible Schnittstelle. Liegen im KV (settings:goch); die
// Werte aus wrangler.toml sind der Ausgangspunkt. Der Schlüssel des zweiten Anbieters liegt ebenfalls im
// KV (nur für den Worker lesbar) – alternativ als Geheimnis CUSTOM_API_KEY, das dann Vorrang hat.
// Seit 23.10.2026 dazu „sprache“: Stimme (ElevenLabs) und Spracheingabe (Whisper) an/aus, ein eigenes, schnelleres
// Modell für den Sprachmodus, voiceId und die Kostenbremsen (vertonte Zeichen je Monat, Audiominuten je Tag).

export const ANTHROPIC_MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 – stärkstes Opus, günstiger als Opus 5 (Standard)" },
  { id: "claude-opus-5", label: "Claude Opus 5 – Vorgänger" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 – schnell, deutlich günstiger" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 – schnell, deutlich günstiger" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 – am schnellsten (Vorschlag für den Sprachmodus)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 – am günstigsten, knapper" },
];
export const PROVIDERS = {
  anthropic: "Anthropic (Claude)",
  openai: "Anderer Anbieter, OpenAI-kompatible Schnittstelle",
  "workers-ai": "Cloudflare Workers AI (kostenlos, Llama)",
};

export const TTS_MODELL_ID = /^eleven_[a-z0-9_]+$/;

let memo = { at: 0, value: null }; // je Instanz eine Minute gemerkt, damit nicht jede Frage den KV liest

export function defaults(env) {
  return {
    enabled: true,
    provider: PROVIDERS[env.PROVIDER] ? env.PROVIDER : "anthropic",
    model: env.MODEL || "claude-opus-5-5",
    cache: true,
    custom: { baseUrl: "", model: "", key: "" },
    // Aus, bis Robin in der Redaktion einschaltet: ohne Schalter weder Spracheingabe noch Stimme vom Server.
    sprache: { stimme: false, hoeren: false, modell: env.SPRACH_MODEL || "claude-haiku-5-5", voiceId: "", ttsModell: "eleven_flash_v2_5",
      zeichenMonat: +(env.MAX_STIMME_ZEICHEN_MONAT || 30000), minutenTag: +(env.MAX_HOEREN_MINUTEN_TAG || 20) },
  };
}

export async function loadSettings(env, fresh = false) {
  const base = defaults(env);
  if (!env.USAGE) return base;
  if (!fresh && memo.value && Date.now() - memo.at < 60_000) return memo.value;
  let stored = null;
  try { stored = JSON.parse(await env.USAGE.get("settings:goch")); } catch {}
  const s = merge(base, stored);
  memo = { at: Date.now(), value: s };
  return s;
}

function merge(base, stored) {
  if (!stored || typeof stored !== "object") return base;
  const custom = stored.custom && typeof stored.custom === "object" ? stored.custom : {};
  return {
    enabled: stored.enabled !== false,
    provider: PROVIDERS[stored.provider] ? stored.provider : base.provider,
    model: typeof stored.model === "string" && stored.model.trim() ? stored.model.trim() : base.model,
    cache: stored.cache !== false,
    custom: { baseUrl: str(custom.baseUrl), model: str(custom.model), key: str(custom.key) },
    sprache: mergeSprache(base.sprache, stored.sprache),
  };
}
const str = v => typeof v === "string" ? v.trim() : "";
const zahl = (v, fallback) => Number.isFinite(+v) && v !== "" && v !== null ? Math.round(+v) : fallback;
function mergeSprache(base, stored) {
  const s = stored && typeof stored === "object" ? stored : {};
  return {
    stimme: s.stimme === true, hoeren: s.hoeren === true,
    modell: str(s.modell) || base.modell, voiceId: typeof s.voiceId === "string" ? s.voiceId.trim() : base.voiceId,
    ttsModell: str(s.ttsModell) || base.ttsModell,
    zeichenMonat: zahl(s.zeichenMonat, base.zeichenMonat), minutenTag: zahl(s.minutenTag, base.minutenTag),
  };
}

// Prüfen und speichern. `previous` liefert den alten Schlüssel, wenn keiner mitgeschickt wird.
export async function saveSettings(env, input, previous) {
  const s = merge(defaults(env), { ...previous, ...input, custom: { ...previous.custom, ...(input.custom || {}) },
    sprache: { ...previous.sprache, ...(input.sprache && typeof input.sprache === "object" ? input.sprache : {}) } });
  if (input.custom && input.custom.key === "") s.custom.key = previous.custom.key; // leer = unverändert
  if (s.provider === "anthropic") {
    if (!/^claude-[a-z0-9.-]+$/.test(s.model)) throw new Error("Modellname für Anthropic muss mit „claude-“ beginnen.");
    if (!env.ANTHROPIC_API_KEY) throw new Error("Für Anthropic fehlt das Geheimnis ANTHROPIC_API_KEY im Worker.");
  }
  if (s.provider === "openai") {
    let u; try { u = new URL(s.custom.baseUrl); if (u.protocol !== "https:") throw 0; } catch { throw new Error("Basis-Adresse des Anbieters muss mit https:// beginnen (z. B. https://api.openai.com/v1)."); }
    if (!s.custom.model) throw new Error("Bitte den Modellnamen des Anbieters angeben.");
    if (!s.custom.key && !env.CUSTOM_API_KEY) throw new Error("Für den anderen Anbieter fehlt der API-Schlüssel.");
  }
  if (s.provider === "workers-ai" && !env.AI) throw new Error("Workers AI ist in diesem Worker nicht eingebunden.");
  // Sprache nur prüfen, wenn sie mitgeschickt wird: Speichern des Betriebs scheitert nicht an einem später entfernten Schlüssel.
  const sp = s.sprache;
  if (input.sprache) {
    if (!/^claude-[a-z0-9.-]+$/.test(sp.modell)) throw new Error("Modell für den Sprachmodus muss mit „claude-“ beginnen.");
    if (sp.voiceId && !/^[A-Za-z0-9]{10,40}$/.test(sp.voiceId)) throw new Error("Voice ID: nur Buchstaben und Ziffern, wie bei ElevenLabs angezeigt.");
    if (!TTS_MODELL_ID.test(sp.ttsModell)) throw new Error("Stimmmodell von ElevenLabs beginnt mit „eleven_“.");
    if (!(sp.zeichenMonat >= 0 && sp.zeichenMonat <= 2_000_000)) throw new Error("Vertonte Zeichen je Monat: 0 bis 2.000.000.");
    if (!(sp.minutenTag >= 0 && sp.minutenTag <= 1440)) throw new Error("Audiominuten je Tag: 0 bis 1440.");
    if (sp.stimme && !env.ELEVENLABS_API_KEY) throw new Error("Für die Stimme fehlt das Geheimnis ELEVENLABS_API_KEY im Worker.");
    if (sp.stimme && !sp.voiceId) throw new Error("Für die Stimme bitte die Voice ID von ElevenLabs eintragen.");
    if (sp.hoeren && !env.AI) throw new Error("Für die Spracheingabe fehlt Workers AI (Bindung AI) im Worker.");
  }
  await env.USAGE.put("settings:goch", JSON.stringify(s));
  memo = { at: 0, value: null };
  return s;
}

// Für die Anzeige: Schlüssel nie herausgeben, nur ob und wie er endet.
export function publicSettings(s, env) {
  const key = env.CUSTOM_API_KEY || s.custom.key;
  return { ...s, custom: { baseUrl: s.custom.baseUrl, model: s.custom.model, key: "", keySet: !!key,
    keyHint: key ? "…" + key.slice(-4) : "", keySource: env.CUSTOM_API_KEY ? "Geheimnis" : (s.custom.key ? "Redaktion" : "") } };
}

// Letzte erfolgreiche Antwort merken (Modell, Zeit, Verbrauch) – die ehrliche Anzeige „verbunden“.
export async function rememberStatus(env, usage, provider) {
  if (!env.USAGE || !usage) return;
  await env.USAGE.put("status:goch", JSON.stringify({ at: new Date().toISOString(), provider, ...usage }), { expirationTtl: 35 * 86400 }).catch(() => {});
}
export async function readStatus(env) {
  try { return JSON.parse(await env.USAGE.get("status:goch")); } catch { return null; }
}
