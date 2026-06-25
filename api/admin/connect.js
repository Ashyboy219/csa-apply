// POST /api/admin/connect  ->  starts a Composio Gmail OAuth connection for the
// signed-in admin and returns the consent URL to redirect them to.
import { requireAdmin, sameOrigin, ok, fail } from '../_auth.js';

export default async function handler(req, res) {
  const session = requireAdmin(req);
  if (!session) return fail(res, 401, 'Unauthorized');
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!sameOrigin(req)) return fail(res, 403, 'Bad origin');
  if (!process.env.COMPOSIO_API_KEY) return fail(res, 503, 'Composio not configured');
  const authConfig = process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID;
  if (!authConfig) return fail(res, 503, 'Gmail connection not set up (COMPOSIO_GMAIL_AUTH_CONFIG_ID missing)');

  // Bind to the signed-in identity (from the HMAC cookie), not a client-supplied
  // name, so an admin can only ever connect a Gmail for themselves.
  let body;
  try {
    body = req.body || {};
  } catch {
    return fail(res, 400, 'Bad request');
  }
  const name = String(session.name || body.name || '').trim().slice(0, 60);
  if (!name) return fail(res, 400, 'Missing name');

  const origin = `https://${req.headers.host}`;
  const callback = `${origin}/api/admin/composio-callback?name=${encodeURIComponent(name)}`;

  try {
    // Composio-managed OAuth auth configs must use the /link endpoint; the old
    // POST /connected_accounts path is no longer supported for them. Composio
    // redirects the browser back to callback_url with &status=success&
    // connected_account_id=... appended (composio-callback.js reads those).
    const resp = await fetch('https://backend.composio.dev/api/v3/connected_accounts/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.COMPOSIO_API_KEY },
      body: JSON.stringify({ auth_config_id: authConfig, user_id: name, callback_url: callback }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.redirect_url) {
      // Surface Composio's reason (admin-only endpoint) so failures are debuggable.
      const detail = (json && json.error && json.error.message) || `composio_${resp.status}`;
      return fail(res, 502, `Could not start Gmail connection: ${detail}`);
    }
    return ok(res, { redirectUrl: json.redirect_url });
  } catch {
    return fail(res, 502, 'Could not start Gmail connection');
  }
}
