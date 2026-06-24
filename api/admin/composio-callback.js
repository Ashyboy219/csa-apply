// GET /api/admin/composio-callback?name=...  -> Composio redirects the admin
// here after Gmail consent, appending connected_account_id (+ status). We store
// it against the admin and bounce back to the board. This is a top-level browser
// redirect (the admin's cookie is present); it only links a real Composio
// connection id to a name, so it's safe to run without the JSON-API guards.
import { rpc } from '../_supabase.js';

function redirect(res, to) {
  res.statusCode = 302;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', to);
  res.end();
}

export default async function handler(req, res) {
  const q = req.query || {};
  const name = String(q.name || '').trim();
  const accountId = q.connected_account_id || q.connectedAccountId || q.connectedAccountID;
  const status = String(q.status || '').toLowerCase();

  if (!name || !accountId || (status && status !== 'success' && status !== 'active')) {
    return redirect(res, '/admin?gmail=failed');
  }
  try {
    await rpc('admin_set_gmail', { p_name: name, p_account_id: String(accountId), p_label: `${name} (Gmail)` });
  } catch {
    return redirect(res, '/admin?gmail=failed');
  }
  return redirect(res, '/admin?gmail=connected');
}
