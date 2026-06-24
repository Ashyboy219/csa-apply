// GET /api/admin/config -> non-secret config the dashboard needs to render
// (which features are wired up, the from-inbox list, the Zelle number).
import { requireAdmin, ok, fail } from '../_auth.js';
import { allSendingAccounts } from './_accounts.js';

export default async function handler(req, res) {
  if (!requireAdmin(req)) return fail(res, 401, 'Unauthorized');

  const accounts = await allSendingAccounts();
  return ok(res, {
    aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY),
    emailEnabled: Boolean(process.env.COMPOSIO_API_KEY) && accounts.length > 0,
    // Gmail can be connected only once the API key + an auth config exist.
    canConnectGmail: Boolean(process.env.COMPOSIO_API_KEY) && Boolean(process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID),
    fromAccounts: accounts.map((a) => ({ label: a.label, id: a.id, owner: a.owner })),
    zelle: '425-306-8726',
  });
}
