// POST /api/admin/send-email  { id, to, subject, body, fromId, template }
// Sends a plain-text email from a connected Gmail account via Composio (v3),
// then records the outreach on the application row.
import { requireAdmin, sameOrigin, ok, fail } from '../_auth.js';
import { rpc } from '../_supabase.js';
import { sendingAccounts } from './config.js';

export default async function handler(req, res) {
  if (!requireAdmin(req)) return fail(res, 401, 'Unauthorized');
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!sameOrigin(req)) return fail(res, 403, 'Bad origin');
  if (!process.env.COMPOSIO_API_KEY) return fail(res, 503, 'Email not configured');

  let payload;
  try {
    payload = req.body || {};
  } catch {
    return fail(res, 400, 'Bad request');
  }

  const { id, to, subject, body, fromId, template } = payload;
  if (!to || !subject || !body) return fail(res, 400, 'Missing recipient, subject, or body');

  const accounts = sendingAccounts();
  if (!accounts.length) return fail(res, 503, 'No sending account configured');
  // Don't silently fall back to another inbox when a from-account is named.
  const account = fromId ? accounts.find((a) => a.id === fromId) : accounts[0];
  if (!account) return fail(res, 400, 'Unknown sending account');

  try {
    const resp = await fetch(
      'https://backend.composio.dev/api/v3/tools/execute/GMAIL_SEND_EMAIL',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.COMPOSIO_API_KEY },
        body: JSON.stringify({
          connected_account_id: account.id,
          arguments: { recipient_email: to, subject, body, is_html: false },
        }),
      }
    );
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || json.successful !== true) return fail(res, 502, 'Email send failed');

    if (id) {
      try {
        await rpc('admin_mark_emailed', { p_id: id, p_template: template || 'custom' });
      } catch {
        /* non-fatal: the email went out even if the timestamp write failed */
      }
    }
    return ok(res, { messageId: json.data?.response_data?.id || null, from: account.label });
  } catch {
    return fail(res, 502, 'Email send failed');
  }
}
