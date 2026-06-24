# Admin dashboard

A private review tool at **`/admin`** for triaging fall-cohort applications: a
Tinder-style swipe stack, an AI triage summary per card, a full-profile drawer,
and a templated email composer (admit / scholarship / waitlist / decline) that
sends from a connected Gmail via Composio.

It is **noindexed + `no-store`** and gated by a password. Until the environment
variables below are set in Vercel it will load but the login will fail — that's
expected; nothing is exposed.

## How it's wired (security model)

This Supabase project is **shared** with an unrelated app, so the dashboard
**never uses the `service_role` key**. Instead:

- All DB access goes through four `SECURITY DEFINER` RPCs scoped to *only*
  `public.camp_application`, each gated by a server-only secret
  (`ADMIN_DB_SECRET`). They're called with the public publishable key, so the
  worst-case blast radius of any leak is this one table.
- The serverless functions in `/api/admin/*` hold every secret. The browser
  never receives a DB or API key — only an HttpOnly, `SameSite=Strict`,
  HMAC-signed session cookie.
- The AI summary call strips parent contact + last name before anything is sent
  to Anthropic.

`npx serve` (the static dev server) does **not** run `/api`. Use **`vercel dev`**
to exercise the backend locally, or test the UI alone at **`/admin?mock=1`**
(loads sample applicants, no network).

## Environment variables (set in Vercel → Project → Settings → Environment Variables)

| Variable | Required | What it is |
| --- | --- | --- |
| `ADMIN_PASSWORD` | **yes** | The shared login password. Pick something strong. |
| `ADMIN_JWT_SECRET` | **yes** | Random ≥32-byte secret that signs the session cookie. Generate: `openssl rand -hex 32`. Rotating it logs everyone out. |
| `ADMIN_DB_SECRET` | **yes** | Gates the DB RPCs. Must equal the value stored in `public.camp_admin_config` (see "Rotating the DB secret"). |
| `ANTHROPIC_API_KEY` | for AI summaries | Anthropic API key. If unset, summaries are disabled and cards link to the full profile instead. |
| `SUMMARY_MODEL` | no | Defaults to `claude-haiku-4-5-20251001`. Set to `claude-sonnet-4-6` for sharper reads. |
| `COMPOSIO_API_KEY` | for email | Composio project API key. |
| `COMPOSIO_ACCOUNTS` | for email | JSON array of connected Gmail accounts: `[{"label":"hello@codeshareacademy.com","id":"ca_xxx"}]`. |
| `COMPOSIO_CONNECTED_ACCOUNT_ID` | alt. to above | A single connected account id (with optional `COMPOSIO_FROM_LABEL`) if you only send from one inbox. |
| `SUPABASE_URL` | no | Defaults to the project URL already in `app.js`. |
| `SUPABASE_PUBLISHABLE_KEY` | no | Defaults to the public key already in `app.js`. |

The dashboard degrades gracefully: without `ANTHROPIC_API_KEY` the AI summary is
hidden; without Composio config the email composer opens but Send is disabled
with a hint.

## Connecting Gmail via Composio (one-time, for email)

1. Create a Composio account and grab the **project API key** → `COMPOSIO_API_KEY`.
2. In the Composio dashboard, create a **Gmail auth config** (one config, reused
   by everyone). For production, use your own Google OAuth client so Google's
   `gmail.send` scope is verified for your domain.
3. **Connect each instructor's Gmail** through the OAuth flow. After they
   authorize, copy the **`connected_account_id`** (starts with `ca_`, status
   `ACTIVE`) from the dashboard's Connected Accounts list.
4. Put them in `COMPOSIO_ACCOUNTS`, e.g.
   `[{"label":"ashish@codeshareacademy.com","id":"ca_abc123"}]`. Those labels
   populate the composer's "from" dropdown.

## Rotating the DB secret

`ADMIN_DB_SECRET` must match the row in `public.camp_admin_config`. To rotate it,
run this in the Supabase SQL editor and paste the printed value into Vercel:

```sql
update public.camp_admin_config
set secret = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where id;
select secret from public.camp_admin_config where id;  -- copy into ADMIN_DB_SECRET
```

## Privacy: what's sent to Anthropic

The AI summary call sends **first name, grade, experience, and the two essay
answers** to Anthropic. Parent name/phone/email and the student's **last name**
are stripped server-side first (`api/admin/summary.js` → `redact()`). If you
prefer to send *no* name, change `redact()` to pass `applicant`. Without
`ANTHROPIC_API_KEY` the on-card summary falls back to a quote of the applicant's
own scholarship answer — nothing is sent anywhere.

## Known limitations (v1)

This is a single-pass review queue built for a small cohort. Not yet included:

- **No undo / no revisiting a decided applicant.** Once swiped, an applicant
  leaves the queue (their row is updated in Supabase, so nothing is lost — but
  there's no in-app list to reopen or re-email them). A "decided" list/filter
  view is the natural next step.
- **No pagination.** All rows load at once — fine for dozens, revisit at scale.
- **No per-admin attribution.** Login is one shared password; the `reviewed_by`
  column + `p_reviewer` RPC arg exist but aren't populated. Add a name-on-login
  to wire them.
- **Login throttle is per-instance** (best-effort) — fine with a strong password;
  move to a shared store (Vercel KV/Upstash) for hard rate-limiting.
- **Location is inferred from the parent phone area code**, not collected. Add a
  city field to the apply form if you need real location.

## What a decision does

- **Admit** → `status = enrolled` (this is also what unlocks any referral credit
  the applicant earned).
- **Waitlist** → `status = waitlist`. **Decline** → `status = declined`.
- **★ scholarship** flags the row independent of status.
- Notes save on blur; sending an email stamps `last_emailed_at` + the template.

Keyboard: **→** admit, **←** decline, **↓** waitlist, **Esc** closes a panel.
