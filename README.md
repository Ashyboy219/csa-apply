# Code Share Academy

Marketing site + application form for the Code Share Academy fall cohort — an
AI + coding accelerator for grades 6–8. Midnight IDE aesthetic, full-width,
deliberately *not* a generic AI-template look.

## Stack

- **Vite + React 18** SPA, `react-router-dom` (`/` landing, `/apply` form).
- **React Bits** `LetterGlitch` for the animated terminal background; a small
  scroll-reveal and count-up are hand-rolled for reliability.
- **Supabase** for application submissions.
- Hosted on **Vercel** (SPA rewrite + security headers in `vercel.json`).

```
npm install
npm run dev      # http://localhost:4310
npm run build    # → dist/
```

## Structure

- `src/pages/Home.jsx` — the landing page, composed from `src/lib/content.js`.
- `src/pages/Apply.jsx` — the application form (lazy-loaded so Supabase only
  ships on `/apply`).
- `src/lib/content.js` — **all copy** lives here (one source of truth).
- `src/components/` — `TopNav`, `CodeWindow`, `GlitchBackground`, `Reveal`,
  `StatNumber`, `SiteFooter`.
- `src/reactbits/LetterGlitch.jsx` — vendored React Bits background.
- `src/index.css` — design system (tokens, sections, form).

## Data

Submissions land in `public.camp_application` in the `obsidian-codex-console`
Supabase project. The table is **insert-only** for the publishable/anon key:

- RLS enabled, single `INSERT` policy; `anon` is granted `INSERT` and nothing
  else, so the publishable key in the browser cannot read anyone's data back.
- Field-length + email-shape `CHECK` constraints guard against junk.

To read applications, use the Supabase dashboard or the service-role key (never
ship the service-role key to the browser):

```sql
select created_at, student_name, grade, experience, build_idea, motivation, parent_phone
from public.camp_application order by created_at desc;
```

## Design notes

Near-black ground (`#08090b`), a single GitHub-green accent (`#3fb950`) used on
a small fraction of the page, 1px hairline borders, sharp corners, and a real
type pairing — Bricolage Grotesque (display) · Public Sans (body) · IBM Plex
Mono (chrome). Scroll-reveals and the count-up fail open (content always ends
visible / on its final value) and honor `prefers-reduced-motion`.
