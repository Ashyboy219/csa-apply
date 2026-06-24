// Resolve the list of Gmail inboxes emails can be sent from. Import-only.
// Two sources, merged: per-admin connected accounts (camp_admin, via Composio
// OAuth) and any shared env-configured accounts. This is what powers both the
// composer's "from" dropdown and "send via a colleague's inbox".
import { rpc } from '../_supabase.js';

export function envAccounts() {
  if (process.env.COMPOSIO_ACCOUNTS) {
    try {
      const parsed = JSON.parse(process.env.COMPOSIO_ACCOUNTS);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((a) => a && a.id)
          .map((a) => ({ label: String(a.label || a.id), id: String(a.id), owner: 'shared' }));
      }
    } catch {
      /* ignore malformed env */
    }
  }
  if (process.env.COMPOSIO_CONNECTED_ACCOUNT_ID) {
    return [{ label: process.env.COMPOSIO_FROM_LABEL || 'shared inbox', id: process.env.COMPOSIO_CONNECTED_ACCOUNT_ID, owner: 'shared' }];
  }
  return [];
}

export async function allSendingAccounts() {
  let admins = [];
  try {
    const rows = await rpc('admin_list_admins');
    admins = (Array.isArray(rows) ? rows : [])
      .filter((a) => a.gmail_account_id)
      .map((a) => ({ label: a.gmail_label || `${a.name} (Gmail)`, id: a.gmail_account_id, owner: a.name }));
  } catch {
    /* DB unreachable -> fall back to env only */
  }
  const byId = new Map();
  for (const a of [...admins, ...envAccounts()]) {
    if (!byId.has(a.id)) byId.set(a.id, a);
  }
  return [...byId.values()];
}
