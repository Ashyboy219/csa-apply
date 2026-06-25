// POST /api/admin/login  { name, password, teamPassword }
// Two credentials are required:
//   - teamPassword: the shared org passphrase (ADMIN_PASSWORD) — the org-wide gate.
//   - password:     the admin's OWN personal password. On first sign-in whatever
//                   they type becomes their password; after that it must match.
// Requiring both means knowing the shared passphrase alone can't let someone sign
// in as another instructor. The signed-in name is baked into the session cookie.
import {
  checkPassword, hashPassword, verifyPassword,
  issueToken, sessionCookie, noStore, ok, fail,
} from '../_auth.js';
import { rpc } from '../_supabase.js';

// Best-effort per-instance throttle. Combined with the failure delay it makes
// online brute-force impractical. (See ADMIN.md.)
const attempts = new Map(); // ip -> { count, until }

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.until > now) return fail(res, 429, 'Too many attempts. Try again later.');

  let body;
  try {
    body = req.body || {};
  } catch {
    return fail(res, 400, 'Bad request');
  }

  const name = String(body.name || '').trim().slice(0, 60);
  const personal = body.password;
  const team = body.teamPassword;

  const recordFail = () => {
    const count = (rec ? rec.count : 0) + 1;
    const lock = count >= 5 ? now + 10 * 60 * 1000 : 0;
    attempts.set(ip, { count: lock ? 0 : count, until: lock });
  };
  const reject = async (code, msg) => {
    recordFail();
    await new Promise((r) => setTimeout(r, 400)); // constant-ish failure delay
    return fail(res, code, msg);
  };

  // 1. Shared passphrase — the org-wide gate, kept for confirmation.
  if (!checkPassword(team)) return reject(401, 'Incorrect team passphrase');
  // 2. Name + a personal password are both required.
  if (!name) return fail(res, 400, 'Enter your name');
  if (personal == null || String(personal).length < 1) return fail(res, 400, 'Choose a personal password');

  // 3. Personal password: first sign-in for a name sets it; afterwards it must
  //    match. We can only do this if the DB is reachable, so fail closed if not —
  //    the personal password is now part of the auth boundary, not convenience.
  let created = false;
  try {
    const rows = await rpc('admin_get_credentials', { p_name: name });
    const existing = Array.isArray(rows) && rows[0] ? rows[0].password_hash : null;
    if (!existing) {
      await rpc('admin_set_password', { p_name: name, p_hash: hashPassword(personal) });
      created = true;
    } else if (!verifyPassword(personal, existing)) {
      return reject(401, 'Incorrect password');
    } else {
      try { await rpc('admin_upsert_self', { p_name: name }); } catch { /* last_seen is best-effort */ }
    }
  } catch {
    return fail(res, 503, 'Sign-in temporarily unavailable — try again shortly.');
  }

  attempts.delete(ip);
  res.setHeader('Set-Cookie', sessionCookie(issueToken(name)));
  return ok(res, { ok: true, name, created });
}
