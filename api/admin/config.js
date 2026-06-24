// GET /api/admin/config -> non-secret config the dashboard needs to render
// (which features are wired up, the from-account list, the Zelle number).
import { requireAdmin, ok, fail } from '../_auth.js';

// Sending accounts come from either COMPOSIO_ACCOUNTS (JSON: [{label,id}])
// or a single COMPOSIO_CONNECTED_ACCOUNT_ID (+ optional COMPOSIO_FROM_LABEL).
// Exported so /api/admin/send-email can resolve the real connected_account_id.
export function sendingAccounts() {
  if (process.env.COMPOSIO_ACCOUNTS) {
    try {
      const parsed = JSON.parse(process.env.COMPOSIO_ACCOUNTS);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((a) => a && a.id)
          .map((a) => ({ label: String(a.label || a.id), id: String(a.id) }));
      }
    } catch {
      /* fall through */
    }
  }
  if (process.env.COMPOSIO_CONNECTED_ACCOUNT_ID) {
    return [
      {
        label: process.env.COMPOSIO_FROM_LABEL || 'default',
        id: process.env.COMPOSIO_CONNECTED_ACCOUNT_ID,
      },
    ];
  }
  return [];
}

export default async function handler(req, res) {
  if (!requireAdmin(req)) return fail(res, 401, 'Unauthorized');

  const accounts = sendingAccounts();
  return ok(res, {
    aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY),
    emailEnabled: Boolean(process.env.COMPOSIO_API_KEY) && accounts.length > 0,
    // Only expose labels + ids to the client (no secrets).
    fromAccounts: accounts.map((a) => ({ label: a.label, id: a.id })),
    zelle: '425-306-8726',
  });
}
