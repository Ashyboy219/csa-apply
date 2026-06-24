// POST /api/admin/connect  { name }  -> starts a Composio Gmail OAuth connection
// for this admin and returns the consent URL to redirect them to.
import { requireAdmin, sameOrigin, ok, fail } from '../_auth.js';

export default async function handler(req, res) {
  if (!requireAdmin(req)) return fail(res, 401, 'Unauthorized');
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!sameOrigin(req)) return fail(res, 403, 'Bad origin');
  if (!process.env.COMPOSIO_API_KEY) return fail(res, 503, 'Composio not configured');
  const authConfig = process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID;
  if (!authConfig) return fail(res, 503, 'Gmail connection not set up (COMPOSIO_GMAIL_AUTH_CONFIG_ID missing)');

  let body;
  try {
    body = req.body || {};
  } catch {
    return fail(res, 400, 'Bad request');
  }
  const name = String(body.name || '').trim().slice(0, 60);
  if (!name) return fail(res, 400, 'Missing name');

  const origin = `https://${req.headers.host}`;
  const callback = `${origin}/api/admin/composio-callback?name=${encodeURIComponent(name)}`;

  try {
    const resp = await fetch('https://backend.composio.dev/api/v3/connected_accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.COMPOSIO_API_KEY },
      body: JSON.stringify({
        auth_config: { id: authConfig },
        connection: { user_id: name, callback_url: callback },
      }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.redirect_url) return fail(res, 502, 'Could not start Gmail connection');
    return ok(res, { redirectUrl: json.redirect_url });
  } catch {
    return fail(res, 502, 'Could not start Gmail connection');
  }
}
