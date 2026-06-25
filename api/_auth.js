// Shared admin-auth helpers for the /api/admin/* serverless functions.
// Leading underscore => Vercel does NOT route this file; it is import-only.
//
// Auth model: a single shared password (ADMIN_PASSWORD) is exchanged at
// /api/admin/login for an HttpOnly, Secure, SameSite=Strict cookie holding an
// HMAC-signed { exp } token (signed with ADMIN_JWT_SECRET). The payload carries
// no PII. Every other admin endpoint calls requireAdmin(req) before doing work.
// Nothing here ever reaches the browser except the opaque signed token.

import crypto from 'node:crypto';

const COOKIE = '__Host-csa_admin';
const TTL_SECONDS = 8 * 60 * 60; // 8h sessions

// Fail closed: an empty/weak signing secret would let anyone forge a session
// cookie (the empty string is a key the attacker knows). Refuse to sign, and
// refuse to verify, unless a real secret is configured.
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || '';
const SECRET_OK = JWT_SECRET.length >= 32;

function sign(payloadB64) {
  if (!SECRET_OK) throw new Error('ADMIN_JWT_SECRET is missing or too short (need >= 32 chars)');
  return crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    // Compare against itself so the work (and timing) is constant-ish.
    crypto.timingSafeEqual(bb, bb);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

// The token now carries the signed-in admin's name so identity is server-verified
// (and tamper-proof under the HMAC), not just trusted from the client. Endpoints
// that act on "your" stuff (e.g. connecting a Gmail) read it from here.
export function issueToken(name) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const claims = { exp };
  if (name) claims.name = String(name).slice(0, 60);
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

// Returns the decoded payload ({ exp, name? }) on success, or null. Callers that
// only need a yes/no still work because an object is truthy and null is falsy.
export function verifyToken(token) {
  if (!SECRET_OK) return null;
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  if (!safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL_SECONDS}`;
}

export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function cookieFromHeader(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

export function requireAdmin(req) {
  const token = (req.cookies && req.cookies[COOKIE]) || cookieFromHeader(req, COOKIE);
  return verifyToken(token);
}

export function checkPassword(input) {
  // Shared team passphrase; defaults to 'dugger' so the tool works out of the box,
  // overridable via ADMIN_PASSWORD. Required on EVERY sign-in as an org-wide gate,
  // on top of each admin's personal password (see hashPassword/verifyPassword).
  const expected = process.env.ADMIN_PASSWORD || 'dugger';
  if (input == null) return false;
  return safeEqual(input, expected);
}

// Per-admin personal password. We store only a salted scrypt digest
// (`scrypt$<saltHex>$<hashHex>`) — never the plaintext, and no external deps.
export function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(plain), salt, 32);
  return `scrypt$${salt.toString('hex')}$${dk.toString('hex')}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  let salt, expected;
  try {
    salt = Buffer.from(parts[1], 'hex');
    expected = Buffer.from(parts[2], 'hex');
  } catch {
    return false;
  }
  if (!salt.length || !expected.length) return false;
  let dk;
  try {
    dk = crypto.scryptSync(String(plain), salt, expected.length);
  } catch {
    return false;
  }
  return dk.length === expected.length && crypto.timingSafeEqual(dk, expected);
}

// Mutating requests must originate from our own page (defense-in-depth on top
// of the SameSite=Strict cookie). Absent Origin (some same-site navigations) is
// allowed; a present, mismatched Origin is rejected.
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
}

export function ok(res, body) {
  noStore(res);
  return res.status(200).json(body);
}

export function fail(res, code, message) {
  noStore(res);
  return res.status(code).json({ error: message });
}
