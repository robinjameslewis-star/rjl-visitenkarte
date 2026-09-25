// Passkeys (WebAuthn) als zweiter Faktor der Redaktion – ohne Bibliothek, nur WebCrypto.
// Registrierung: Attestation „none“, wir speichern Kennung und öffentlichen Schlüssel (ES256 oder RS256).
// Anmeldung: Signatur über authenticatorData || sha256(clientDataJSON) prüfen, dazu Challenge, Origin,
// rpId-Hash und das Flag „user verified“ (Face ID / Touch ID / Gerätecode).

export const b64url = {
  encode: bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  decode: s => { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); s += "=".repeat((4 - s.length % 4) % 4);
    const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; },
};

const sha256 = async data => new Uint8Array(await crypto.subtle.digest("SHA-256", data));
const equal = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// ---------- CBOR (nur, was WebAuthn braucht: Zahlen, Bytes, Text, Arrays, Maps) ----------
function cbor(bytes) {
  let i = 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  function len(info) {
    if (info < 24) return info;
    if (info === 24) return view.getUint8(i++);
    if (info === 25) { const v = view.getUint16(i); i += 2; return v; }
    if (info === 26) { const v = view.getUint32(i); i += 4; return v; }
    throw new Error("CBOR: Länge nicht unterstützt");
  }
  // Jedes Element braucht mindestens ein Byte: Längen über den Rest hinaus sind ungültig (kein Endlos-Lauf).
  const rest = n => { if (n > bytes.length - i) throw new Error("CBOR: Länge über das Ende hinaus"); return n; };
  function item() {
    if (i >= bytes.length) throw new Error("CBOR: unerwartetes Ende");
    const b = bytes[i++], major = b >> 5, info = b & 31;
    switch (major) {
      case 0: return len(info);
      case 1: return -1 - len(info);
      case 2: { const n = rest(len(info)); const v = bytes.slice(i, i + n); i += n; return v; }
      case 3: { const n = rest(len(info)); const v = new TextDecoder().decode(bytes.slice(i, i + n)); i += n; return v; }
      case 4: { const n = rest(len(info)); const a = []; for (let k = 0; k < n; k++) a.push(item()); return a; }
      case 5: { const n = rest(len(info)); const m = new Map(); for (let k = 0; k < n; k++) { const key = item(); m.set(key, item()); } return m; }
      case 7: if (info === 20) return false; if (info === 21) return true; if (info === 22) return null; throw new Error("CBOR: einfacher Wert");
      default: throw new Error("CBOR: Typ nicht unterstützt");
    }
  }
  return item();
}

// ---------- authenticatorData ----------
function parseAuthData(ad) {
  const rpIdHash = ad.slice(0, 32), flags = ad[32];
  const counter = new DataView(ad.buffer, ad.byteOffset + 33, 4).getUint32(0);
  const out = { rpIdHash, userPresent: !!(flags & 1), userVerified: !!(flags & 4), counter };
  if (flags & 64) { // attested credential data
    const credIdLen = (ad[53] << 8) | ad[54];
    out.credentialId = ad.slice(55, 55 + credIdLen);
    out.cosePublicKey = cbor(ad.slice(55 + credIdLen));
  }
  return out;
}

// COSE-Schlüssel → JWK für WebCrypto. ES256 (kty 2, crv P-256) oder RS256 (kty 3).
function coseToJwk(cose) {
  const kty = cose.get(1), alg = cose.get(3);
  if (kty === 2 && alg === -7) {
    return { alg: -7, jwk: { kty: "EC", crv: "P-256", x: b64url.encode(cose.get(-2)), y: b64url.encode(cose.get(-3)) },
      params: { name: "ECDSA", namedCurve: "P-256" }, sign: { name: "ECDSA", hash: "SHA-256" } };
  }
  if (kty === 3 && alg === -257) {
    return { alg: -257, jwk: { kty: "RSA", n: b64url.encode(cose.get(-1)), e: b64url.encode(cose.get(-2)) },
      params: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, sign: { name: "RSASSA-PKCS1-v1_5" } };
  }
  throw new Error("Passkey-Algorithmus nicht unterstützt (nur ES256/RS256).");
}

async function checkClientData(clientDataJSON, type, challenge, origin) {
  const c = JSON.parse(new TextDecoder().decode(clientDataJSON));
  if (c.type !== type) throw new Error("Passkey: falscher Vorgang.");
  if (c.challenge !== challenge) throw new Error("Passkey: Challenge stimmt nicht – Seite neu laden.");
  if (c.origin !== origin) throw new Error("Passkey: falsche Herkunft (" + c.origin + ").");
  return c;
}

// Registrierung prüfen. Liefert das zu speichernde Credential.
export async function verifyRegistration(body, { challenge, origin, rpId }) {
  const clientDataJSON = b64url.decode(body.clientDataJSON);
  await checkClientData(clientDataJSON, "webauthn.create", challenge, origin);
  const att = cbor(b64url.decode(body.attestationObject));
  const ad = parseAuthData(att.get("authData"));
  if (!equal(ad.rpIdHash, await sha256(new TextEncoder().encode(rpId)))) throw new Error("Passkey: rpId stimmt nicht.");
  if (!ad.userPresent || !ad.userVerified) throw new Error("Passkey: Gerät hat dich nicht verifiziert (Face ID / Touch ID / Code nötig).");
  if (!ad.credentialId || !ad.cosePublicKey) throw new Error("Passkey: keine Schlüsseldaten.");
  const key = coseToJwk(ad.cosePublicKey);
  return { id: b64url.encode(ad.credentialId), alg: key.alg, jwk: key.jwk, counter: ad.counter,
    transports: Array.isArray(body.transports) ? body.transports.filter(t => typeof t === "string").slice(0, 6) : [] };
}

// Anmeldung prüfen. `cred` ist das gespeicherte Credential. Liefert den neuen Zähler.
export async function verifyAssertion(body, cred, { challenge, origin, rpId }) {
  const clientDataJSON = b64url.decode(body.clientDataJSON);
  await checkClientData(clientDataJSON, "webauthn.get", challenge, origin);
  const authData = b64url.decode(body.authenticatorData);
  const ad = parseAuthData(authData);
  if (!equal(ad.rpIdHash, await sha256(new TextEncoder().encode(rpId)))) throw new Error("Passkey: rpId stimmt nicht.");
  if (!ad.userPresent || !ad.userVerified) throw new Error("Passkey: Gerät hat dich nicht verifiziert.");
  const key = coseToJwk(new Map(cred.alg === -7 ? [[1, 2], [3, -7], [-2, b64url.decode(cred.jwk.x)], [-3, b64url.decode(cred.jwk.y)]]
    : [[1, 3], [3, -257], [-1, b64url.decode(cred.jwk.n)], [-2, b64url.decode(cred.jwk.e)]]));
  const pub = await crypto.subtle.importKey("jwk", key.jwk, key.params, false, ["verify"]);
  let sig = b64url.decode(body.signature);
  if (cred.alg === -7) sig = derToRaw(sig);
  const signed = new Uint8Array(authData.length + 32);
  signed.set(authData); signed.set(await sha256(clientDataJSON), authData.length);
  const ok = await crypto.subtle.verify(key.sign, pub, sig, signed);
  if (!ok) throw new Error("Passkey: Signatur ungültig.");
  if (cred.counter && ad.counter && ad.counter <= cred.counter) throw new Error("Passkey: Zähler rückläufig – möglicher Klon, Anmeldung abgelehnt.");
  return ad.counter;
}

// ECDSA-Signatur von DER (wie WebAuthn sie liefert) nach r||s (wie WebCrypto sie erwartet).
function derToRaw(der) {
  if (der[0] !== 0x30) return der;
  let i = 2; if (der[1] & 0x80) i += der[1] & 0x7f;
  const read = () => { if (der[i++] !== 0x02) throw new Error("DER"); let n = der[i++]; let v = der.slice(i, i + n); i += n;
    while (v.length > 32 && v[0] === 0) v = v.slice(1); const out = new Uint8Array(32); out.set(v, 32 - v.length); return out; };
  const r = read(), s = read(), out = new Uint8Array(64); out.set(r); out.set(s, 32); return out;
}

export function randomChallenge() { return b64url.encode(crypto.getRandomValues(new Uint8Array(32))); }
