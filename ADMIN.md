# Admin dashboard

A private review tool at **`/admin`** for triaging fall-cohort applications:

- **Pile tabs** (Pending / Admitted / Waitlist / Declined) with live counts — click
  any pile to revisit and re-decide.
- A **swipe stack**: each card shows the applicant, an **AI accept/reject verdict**
  (green / red / amber), an AI triage summary, and their project idea.
- An **always-on profile panel** beside the cards (no pop-ups) with every field +
  editable notes.
- A separate **`/compose`** page for templated emails (admit / scholarship /
  waitlist / decline) that send from a connected Gmail via Composio.

It is **noindexed + `no-store`** and gated by a passphrase. Until the env vars
below are set it loads but login fails — that's expected; nothing is exposed.

## Sign-in, identity, and the template lock

- Login asks for **your name + the passphrase** (default **`dugger`**, override
  with `ADMIN_PASSWORD`). Anyone with the passphrase is in. Your name is recorded
  on every decision (`reviewed_by`) and used to pick your own inbox.
- **Only "Ashish" can edit email wording.** On `/compose`, everyone can pick a
  canned template + a from-inbox and send, but the subject/body are read-only
  unless your name is Ashish — so nobody accidentally sends edited text from a
  colleague's inbox.

## How it's wired (security model)

This Supabase project is **shared** with an unrelated app, so the dashboard
**never uses the `service_role` key**. Instead:

- All DB access goes through `SECURITY DEFINER` RPCs scoped to *only* the camp
  tables, each gated by a server-only secret (`ADMIN_DB_SECRET`) and called with
  the public publishable key — so the worst-case blast radius of any leak is
  bounded to those tables.
- The serverless functions in `/api/admin/*` hold every secret. The browser
  never receives a DB or API key — only an HttpOnly, `SameSite=Strict`,
  HMAC-signed session cookie that **fails closed** if `ADMIN_JWT_SECRET` is weak.
- The AI summary call strips parent contact + last name before anything is sent
  to Anthropic.

`npx serve` does **not** run `/api`. Use **`vercel dev`** to exercise the backend
locally, or test the UI alone at **`/admin?mock=1`** (and `/compose?id=m1&mock=1`).

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | What it is |
| --- | --- | --- |
| `ADMIN_JWT_SECRET` | **yes** | Random ≥32-byte secret that signs the session cookie. `openssl rand -hex 32`. Rotating it logs everyone out. |
| `ADMIN_DB_SECRET` | **yes** | Gates the DB RPCs. Must equal the row in `public.camp_admin_config` (see "Rotating the DB secret"). |
| `ADMIN_PASSWORD` | no | Login passphrase. Defaults to `dugger` if unset. |
| `ANTHROPIC_API_KEY` | for AI | Anthropic key. Powers the on-card verdict + summary. If unset, cards fall back to a quote of the applicant's own answer. |
| `SUMMARY_MODEL` | no | Defaults to `claude-haiku-4-5-20251001`. Use `claude-sonnet-4-6` for sharper reads. |
| `COMPOSIO_API_KEY` | for email | Composio project API key. |
| `COMPOSIO_GMAIL_AUTH_CONFIG_ID` | for the in-app Connect button | The Gmail auth-config id from Composio (one config, reused by all instructors). Enables the **Connect Gmail** button. |
| `COMPOSIO_ACCOUNTS` | alt. to connecting | JSON array of pre-connected inboxes: `[{"label":"hello@…","id":"ca_xxx"}]`. |
| `COMPOSIO_CONNECTED_ACCOUNT_ID` | alt. | A single connected-account id (+ optional `COMPOSIO_FROM_LABEL`). |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | no | Default to the public values already in `app.js`. |

Degrades gracefully: no `ANTHROPIC_API_KEY` → no AI verdict/summary (answer-quote
fallback); no Composio config → the composer's Send is disabled with a hint.

## Connecting Gmail (so emails can go out)

1. Create a Composio account → **project API key** → `COMPOSIO_API_KEY`.
2. In Composio, create a **Gmail auth config** (one, reused by everyone) → set its
   id as `COMPOSIO_GMAIL_AUTH_CONFIG_ID`. For production, use your own Google
   OAuth client so the `gmail.send` scope is verified for your domain.
3. Each instructor clicks **Connect Gmail** in the dashboard nav, authorizes, and
   their inbox is stored against their name. It then appears in the `/compose`
   "from" dropdown — including for teammates, so **someone who can't connect can
   still send from a colleague's inbox**.
4. (Optional) Skip the button entirely by hard-coding inboxes in
   `COMPOSIO_ACCOUNTS`.

## Rotating the DB secret

```sql
update public.camp_admin_config
set secret = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where id;
select secret from public.camp_admin_config where id;  -- paste into ADMIN_DB_SECRET
```

## Privacy: what's sent to Anthropic

The verdict/summary call sends **first name, grade, experience, and the two essay
answers** to Anthropic. Parent contact + the student's **last name** are stripped
server-side first (`api/admin/summary.js` → `redact()`). To send *no* name, change
`redact()` to pass `applicant`.

## Decisions & shortcuts

- **Admit** → `status = enrolled` (also unlocks any referral credit). **Waitlist**
  → `waitlist`. **Decline** → `declined`. **★ scholarship** flags independent of
  status. Notes save on blur; sending stamps `last_emailed_at` + the template.
- Keyboard: **→** admit, **←** decline, **↓** waitlist.

## Still-thin spots (v1)

- **No undo** on a swipe (but every pile is one click away, so a mis-swipe is easy
  to correct — open the pile and re-decide).
- **No pagination** — all rows load at once; fine for a cohort, revisit at scale.
- The **template lock is client-side** (name-based) — a guardrail against
  accidents, not a hard security boundary, which matches the open "anyone with the
  passphrase" model.
- **Login throttle is per-instance** (best-effort); move to a shared store for hard
  rate-limiting.
- **Location is inferred from the phone area code**, not collected.
- The DB schema is checked in at `db/admin_dashboard.sql` (already applied live).
