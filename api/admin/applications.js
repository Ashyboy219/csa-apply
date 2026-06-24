// GET /api/admin/applications -> all applications (newest + undecided first).
// Doubles as the session check: returns 401 when not authenticated.
import { requireAdmin, ok, fail } from '../_auth.js';
import { rpc } from '../_supabase.js';

export default async function handler(req, res) {
  if (!requireAdmin(req)) return fail(res, 401, 'Unauthorized');
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed');

  try {
    const rows = await rpc('admin_list_applications');
    return ok(res, { applications: Array.isArray(rows) ? rows : [] });
  } catch {
    return fail(res, 502, 'Could not load applications');
  }
}
