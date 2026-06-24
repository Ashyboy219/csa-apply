// Supabase access for the admin dashboard. Import-only (underscore prefix).
//
// We deliberately do NOT use the service_role key: this Supabase project is
// shared with an unrelated app, and a service_role leak would expose all of it.
// Instead every call goes through a SECURITY DEFINER RPC scoped to exactly
// public.camp_application, gated by ADMIN_DB_SECRET. We call those RPCs with the
// PUBLIC (publishable) key — which is useless without the gate secret — so the
// worst-case blast radius is this one table.

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://xfyijkztkhfkuffmjqwq.supabase.co';
const PUBLISHABLE =
  process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_A7d4oGNXwTaH8vIx7Jl94Q_D_dD6uFE';

export async function rpc(fn, args = {}) {
  const gate = process.env.ADMIN_DB_SECRET;
  if (!gate) throw new Error('ADMIN_DB_SECRET not configured');

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: PUBLISHABLE,
      Authorization: `Bearer ${PUBLISHABLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_secret: gate, ...args }),
  });

  const text = await resp.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!resp.ok) {
    // Surface a terse reason server-side only; callers map this to a generic
    // client message so Postgres details never reach the browser.
    const err = new Error((data && data.message) || `db_${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  return data;
}
