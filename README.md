# Code Share Academy — apply

A short application form for the Code Share Academy fall cohort (AI + coding,
grades 6–8). Single static page, styled to match the cohort flyer: midnight IDE
aesthetic, one green accent, hairline structure, monospace chrome.

## Stack

- Static `index.html` + `styles.css` + `app.js` — no build step.
- Submissions go straight to Supabase from the browser via `@supabase/supabase-js`.
- Hosted on Vercel.

## Data

Rows land in `public.camp_application` in the `obsidian-codex-console` Supabase
project. The table is **insert-only** for the `anon` / publishable key:

- RLS is enabled; the single policy allows `INSERT` only.
- `anon` / `authenticated` are granted `INSERT` and nothing else, so the
  publishable key in `app.js` cannot read anyone's data back.
- Field lengths and a basic email shape are enforced with `CHECK` constraints.

To read applications, use the Supabase dashboard or the service-role key
(never ship the service-role key to the browser).

```sql
select created_at, student_name, grade, experience, build_idea
from public.camp_application
order by created_at desc;
```

## Local preview

It's plain static files — open `index.html`, or:

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

## Design

The look is deliberately *not* the default Tailwind/AI-generated SaaS template:
near-black ground (`#08090b`), a single GitHub-green accent (`#3fb950`) used on
under ~2% of the page, 1px hairline borders, sharp corners, and a real type
pairing — Bricolage Grotesque (display) · Public Sans (body) · IBM Plex Mono
(chrome). The form is framed as a code editor with a numbered line per question.
