// POST /api/admin/logout -> clears the session cookie.
import { clearCookie, ok } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', clearCookie());
  return ok(res, { ok: true });
}
