// POST /api/admin/update  { id, status?, scholarship?, note?, reviewer? }
// Applies an admit/decline/waitlist decision, scholarship flag, and/or notes.
import { requireAdmin, sameOrigin, ok, fail } from '../_auth.js';
import { rpc } from '../_supabase.js';

const STATUSES = ['applied', 'enrolled', 'declined', 'waitlist', 'withdrawn'];

export default async function handler(req, res) {
  if (!requireAdmin(req)) return fail(res, 401, 'Unauthorized');
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!sameOrigin(req)) return fail(res, 403, 'Bad origin');

  let body;
  try {
    body = req.body || {};
  } catch {
    return fail(res, 400, 'Bad request');
  }

  const { id, status, scholarship, note, reviewer } = body;
  if (!id) return fail(res, 400, 'Missing id');
  if (status != null && !STATUSES.includes(status)) return fail(res, 400, 'Bad status');

  try {
    const row = await rpc('admin_update_application', {
      p_id: id,
      p_status: status ?? null,
      p_scholarship: typeof scholarship === 'boolean' ? scholarship : null,
      p_note: note ?? null,
      p_reviewer: reviewer ?? null,
    });
    return ok(res, { application: row });
  } catch {
    return fail(res, 502, 'Update failed');
  }
}
