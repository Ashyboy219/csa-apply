// POST /api/admin/login  { password }  -> sets the session cookie.
import { checkPassword, issueToken, sessionCookie, noStore, ok, fail } from '../_auth.js';

// Best-effort per-instance throttle. Not bulletproof across serverless
// instances, but combined with a strong ADMIN_PASSWORD + the 400ms failure
// delay it makes online brute-force impractical. (See README for hardening.)
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

  if (!checkPassword(body.password)) {
    const count = (rec ? rec.count : 0) + 1;
    const lock = count >= 5 ? now + 10 * 60 * 1000 : 0;
    attempts.set(ip, { count: lock ? 0 : count, until: lock });
    await new Promise((r) => setTimeout(r, 400));
    return fail(res, 401, 'Incorrect password');
  }

  attempts.delete(ip);
  res.setHeader('Set-Cookie', sessionCookie(issueToken()));
  return ok(res, { ok: true });
}
