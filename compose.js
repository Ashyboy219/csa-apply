// Compose page — full-page email composer for one applicant (id from the query).
// Template wording is editable only by Ashish; everyone else picks a canned
// template + a from-inbox and sends (prevents wrong content going out under
// someone's name). `?mock=1` uses a sample applicant for local UI work.

const params = new URLSearchParams(location.search);
const MOCK = params.get('mock') === '1';
const ID = params.get('id') || (MOCK ? 'm1' : '');
const ZELLE = '425-306-8726';
const COHORT = 'Saturdays 11:30–12:30 PM Pacific, Jul 25 – Sep 26, on Zoom.';

const adminName = (localStorage.getItem('csa_admin_name') || '').trim();
const canEdit = adminName.toLowerCase() === 'ashish';

const lede = document.getElementById('compose-lede');
const formEl = document.getElementById('compose-form');
const toEl = document.getElementById('compose-to');
const tmplSel = document.getElementById('tmpl');
const fromSel = document.getElementById('from');
const fromMeta = document.getElementById('compose-from-meta');
const lockNote = document.getElementById('lock-note');
const subjectEl = document.getElementById('subject');
const bodyEl = document.getElementById('body');
const statusEl = document.getElementById('compose-status');
const sendBtn = document.getElementById('send-btn');
const stateEl = document.getElementById('compose-state');

let rec = null;
let config = { emailEnabled: false, fromAccounts: [] };

async function api(path, opts = {}) {
  return fetch('/api/admin/' + path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
}

async function boot() {
  if (!ID) { lede.textContent = 'No applicant selected. Go back to the board and pick one.'; return; }

  if (MOCK) {
    rec = MOCK_REC;
    config = { emailEnabled: true, fromAccounts: [{ label: 'hello@codeshareacademy.com', id: 'mock', owner: 'shared' }] };
    return render();
  }

  const res = await api('applications');
  if (res.status === 401) { location.href = '/admin'; return; }
  if (!res.ok) { lede.textContent = 'Couldn’t load applications. Reload or go back to the board.'; return; }
  const { applications } = await res.json();
  rec = (applications || []).find((a) => a.id === ID);
  if (!rec) { lede.textContent = 'Applicant not found (they may have been removed).'; return; }
  try { const c = await api('config'); if (c.ok) config = await c.json(); } catch {}
  render();
}

function render() {
  lede.textContent = `Writing to ${rec.parent_name || 'a parent'} about ${first(rec)}. Pick a template, choose the inbox it sends from, and send.`;
  formEl.hidden = false;

  toEl.textContent = `to: ${rec.parent_name || 'parent'} · ${rec.parent_email || 'no email on file'}`;

  // from inboxes
  fromSel.innerHTML = '';
  (config.fromAccounts || []).forEach((a) => {
    const o = document.createElement('option');
    o.value = a.id;
    o.textContent = a.owner && a.owner !== 'shared' ? `${a.label} — ${a.owner}` : a.label;
    fromSel.append(o);
  });
  // default to my own inbox if I have one connected
  const mine = (config.fromAccounts || []).find((a) => (a.owner || '').toLowerCase() === adminName.toLowerCase());
  if (mine) fromSel.value = mine.id;
  updateFromMeta();

  // default template: scholarship if flagged, else admit
  tmplSel.value = rec.scholarship ? 'scholarship' : 'admit';
  applyTemplate();

  // lock wording for everyone except Ashish
  if (!canEdit) {
    subjectEl.readOnly = true;
    bodyEl.readOnly = true;
    lockNote.hidden = false;
  }

  const canSend = config.emailEnabled && (config.fromAccounts || []).length > 0;
  sendBtn.disabled = !canSend;
  if (!canSend) {
    statusEl.className = 'compose-status err';
    statusEl.textContent = 'No connected inbox yet. Connect a Gmail on the board (or ask a teammate who has) — then send from theirs.';
  }
}

function applyTemplate() {
  const t = TEMPLATES[tmplSel.value](rec);
  subjectEl.value = t.subject;
  bodyEl.value = t.body;
}

function updateFromMeta() {
  const opt = fromSel.options[fromSel.selectedIndex];
  fromMeta.textContent = opt ? `from: ${opt.textContent}` : '';
}

tmplSel.addEventListener('change', applyTemplate);
fromSel.addEventListener('change', updateFromMeta);

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.className = 'compose-status';
  statusEl.textContent = 'sending…';
  stateEl.textContent = 'sending';
  if (MOCK) { done('sent (mock)'); return; }
  sendBtn.disabled = true;
  try {
    const res = await api('send-email', {
      method: 'POST',
      body: JSON.stringify({ id: rec.id, to: rec.parent_email, subject: subjectEl.value, body: bodyEl.value, fromId: fromSel.value, template: tmplSel.value }),
    });
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'send failed'); }
    done('✓ sent — back to the board…');
    setTimeout(() => { location.href = '/admin'; }, 1100);
  } catch (err) {
    statusEl.className = 'compose-status err';
    statusEl.textContent = String(err.message || 'Send failed') + '. Check the inbox connection and try again.';
    stateEl.textContent = 'error';
    sendBtn.disabled = false;
  }
});

function done(msg) {
  statusEl.className = 'compose-status ok';
  statusEl.textContent = msg;
  stateEl.textContent = 'sent';
}

// ───────── templates ─────────
const TEMPLATES = {
  admit: (r) => ({
    subject: 'You’re in — Code Share Academy fall cohort',
    body:
`Hi ${r.parent_name || 'there'},

Great news — ${first(r)} has a seat in the Code Share Academy fall cohort. We loved the project idea ("${short(r.build_idea)}") and can’t wait to help build it.

Tuition is $225 for the full 10-Saturday cohort. To lock the seat, send $225 via Zelle to ${ZELLE} (Code Share Academy). Reply here once it’s sent and we’ll confirm the spot.

Classes: ${COHORT}

— The Code Share Academy team`,
  }),
  scholarship: (r) => ({
    subject: `A scholarship seat for ${first(r)} — Code Share Academy`,
    body:
`Hi ${r.parent_name || 'there'},

We read every application, and ${first(r)}’s stood out — we’d like to offer a full scholarship seat in the fall cohort.

The cohort is normally $225; the scholarship covers it in full, so there’s nothing to pay. (If you ever want to chip in toward another student’s seat, our Zelle is ${ZELLE} — completely optional.)

Classes: ${COHORT}

Just reply to claim the seat and we’ll send the Zoom details.

— The Code Share Academy team`,
  }),
  waitlist: (r) => ({
    subject: `Code Share Academy — waitlist update for ${first(r)}`,
    body:
`Hi ${r.parent_name || 'there'},

Thank you for applying. The first cohort is only 12 seats and filled quickly, so we’ve placed ${first(r)} on the waitlist. If a seat opens we’ll reach out right away — you’d be first in line.

— The Code Share Academy team`,
  }),
  decline: (r) => ({
    subject: 'Code Share Academy — about your application',
    body:
`Hi ${r.parent_name || 'there'},

Thank you for applying to Code Share Academy, and for the time ${first(r)} put into it. We can’t offer a seat this cohort, but we’d genuinely welcome a future application — keep building.

— The Code Share Academy team`,
  }),
};

function first(r) { return (r.student_name || 'your student').trim().split(/\s+/)[0]; }
function short(s) { s = (s || '').trim(); return s.length > 80 ? s.slice(0, 80) + '…' : s; }

const MOCK_REC = {
  id: 'm1', student_name: 'Maya Hartwell', build_idea: 'An app that quizzes you from your own class notes.',
  parent_name: 'Dana Hartwell', parent_email: 'dana@example.com', scholarship: false,
};

boot();
