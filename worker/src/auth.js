// Sign in with Google (ID token verified on the server) and cookie sessions. Taken from the vkcscience.com test system.

const COOKIE = "neet_s";
const SESSION_DAYS = 30;
const GOOGLE_CERTS = "https://www.googleapis.com/oauth2/v3/certs";

let jwksCache = { keys: null, until: 0 };

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function googleKeys(fresh = false) {
  if (!fresh && jwksCache.keys && Date.now() < jwksCache.until) return jwksCache.keys;
  // fresh: Google has started signing with a key we have not seen, so skip every cache.
  const res = await fetch(GOOGLE_CERTS, fresh ? { cache: "no-store" } : { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error("Could not load Google keys");
  const { keys } = await res.json();
  jwksCache = { keys, until: Date.now() + 3600 * 1000 };
  return keys;
}

// Returns the verified token payload, or throws.
export async function verifyGoogleIdToken(idToken, clientId) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const header = b64urlJson(parts[0]);
  const payload = b64urlJson(parts[1]);
  if (header.alg !== "RS256") throw new Error("Unexpected algorithm");

  let jwk = (await googleKeys()).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(true)).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Unknown signing key");
  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!ok) throw new Error("Bad signature");

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== clientId) throw new Error("Token is for another app");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(payload.iss)) throw new Error("Bad issuer");
  if (!payload.exp || payload.exp < now - 60) throw new Error("Token expired");
  if (!payload.email || payload.email_verified !== true) throw new Error("Email not verified");
  return payload;
}

async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function upsertStudent(env, { sub, email, name, picture }) {
  await env.DB.prepare(
    `INSERT INTO students (google_sub, email, name, picture, last_login_at)
     VALUES (?1, ?2, ?3, ?4, datetime('now'))
     ON CONFLICT(google_sub) DO UPDATE SET email = ?2, picture = ?4, last_login_at = datetime('now')`
  ).bind(sub, email.toLowerCase(), name || email, picture || null).run();
  return env.DB.prepare("SELECT * FROM students WHERE google_sub = ?").bind(sub).first();
}

export async function createSession(env, studentId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token_hash, student_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256hex(token), studentId, expires).run();
  // Occasionally clear out expired sessions.
  if (Math.random() < 0.05) await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(new Date().toISOString()).run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

function readCookie(request) {
  const h = request.headers.get("Cookie") || "";
  const m = h.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? m[1] : null;
}

export async function currentStudent(request, env) {
  const token = readCookie(request);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT s.* FROM sessions x JOIN students s ON s.id = x.student_id
     WHERE x.token_hash = ? AND x.expires_at > ?`
  ).bind(await sha256hex(token), new Date().toISOString()).first();
  if (!row) return null;
  const admins = String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  row.is_admin = admins.includes(row.email.toLowerCase());
  return row;
}

export async function destroySession(request, env) {
  const token = readCookie(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256hex(token)).run();
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
