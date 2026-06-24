// POST /api/admin/summary  { application }  -> generates + caches an AI triage
// summary via Claude Haiku, then returns it. PII (parent contact, last name) is
// stripped server-side BEFORE the model call.
import { requireAdmin, sameOrigin, ok, fail } from '../_auth.js';
import { rpc } from '../_supabase.js';

const MODEL = process.env.SUMMARY_MODEL || 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT =
  'You are an admissions triage assistant for a middle-school coding camp run by kid founders. ' +
  "Given one applicant's data, write 2-3 punchy sentences an instructor can read in five seconds: " +
  'who they are, their experience level, and what they want to build. Then add one final line ' +
  'beginning "Scholarship:" giving a blunt read on scholarship-worthiness and likely follow-through, ' +
  "judged mainly from their motivation answer (what they've built, fixed, or figured out). " +
  'Be concrete and specific to THIS applicant. No fluff, no preamble, no restating the questions, ' +
  'no markdown, no headers. Plain text only. Stay under 60 words total.';

// Minimize PII sent to the model: first name only, no parent contact.
function redact(app) {
  const v = (x) => (x == null || String(x).trim() === '' ? 'not provided' : String(x).trim());
  const first = (app.student_name || '').trim().split(/\s+/)[0] || 'applicant';
  return (
    `Applicant:\n` +
    `Name: ${first}\n` +
    `Grade: ${v(app.grade)}\n` +
    `Experience: ${v(app.experience)}\n` +
    `What they want to build: ${v(app.build_idea)}\n` +
    `Something they've built, fixed, or figured out: ${v(app.motivation)}\n` +
    `Availability: ${v(app.availability)}\n` +
    `Referral: ${app.referred_by_code ? 'referred by a friend' : 'none'}\n\n` +
    `Write the triage summary now.`
  );
}

async function summarize(app) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: redact(app) }],
    }),
  });
  if (!resp.ok) throw new Error(`anthropic_${resp.status}`);
  const data = await resp.json();
  const block = (data.content || []).find((b) => b.type === 'text');
  return block ? block.text.trim() : '';
}

export default async function handler(req, res) {
  if (!requireAdmin(req)) return fail(res, 401, 'Unauthorized');
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!sameOrigin(req)) return fail(res, 403, 'Bad origin');
  if (!process.env.ANTHROPIC_API_KEY) return fail(res, 503, 'AI summary not configured');

  let body;
  try {
    body = req.body || {};
  } catch {
    return fail(res, 400, 'Bad request');
  }
  const app = body.application;
  if (!app || !app.id) return fail(res, 400, 'Missing application');

  try {
    const summary = await summarize(app);
    if (!summary) return fail(res, 502, 'Empty summary');
    const row = await rpc('admin_set_summary', { p_id: app.id, p_summary: summary });
    return ok(res, { summary, application: row });
  } catch {
    return fail(res, 502, 'Summary failed');
  }
}
