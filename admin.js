// Code Share Academy — admin review dashboard.
// Talks only to the cookie-gated /api/admin/* functions; no DB keys live here.
// `?mock=1` loads sample data and skips the network for local UI work.

const MOCK = new URLSearchParams(location.search).get('mock') === '1';
const THRESHOLD = 110; // px of drag before a swipe counts
const MAX_ROT = 14; // deg of tilt at full drag
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const DIR_STATUS = { right: 'enrolled', left: 'declined', down: 'waitlist' };

const COHORT = 'Saturdays 11:30–12:30 PM Pacific, Jul 25 – Sep 26, on Zoom.';
const ZELLE = '425-306-8726';

// ───────── elements ─────────
const loginView = document.getElementById('login-view');
const boardView = document.getElementById('board-view');
const loginForm = document.getElementById('login-form');
const pwInput = document.getElementById('pw');
const loginErr = document.getElementById('login-err');
const authState = document.getElementById('auth-state');
const authDot = document.getElementById('auth-dot');
const logoutBtn = document.getElementById('logout-btn');
const queueMeta = document.getElementById('queue-meta');
const queueMetaText = document.getElementById('queue-meta-text');

const stack = document.getElementById('stack');
const tpl = document.getElementById('card-tpl');
const cardActions = document.getElementById('card-actions');
const emptyState = document.getElementById('empty-state');
const scholarToggle = document.getElementById('scholar-toggle');

const drawer = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const drawerBody = document.getElementById('drawer-body');
const drawerName = document.getElementById('drawer-name');

const composerOverlay = document.getElementById('composer-overlay');
const composerForm = document.getElementById('composer');
const tmplSelect = document.getElementById('tmpl-select');
const composeFrom = document.getElementById('compose-from');
const composeSubject = document.getElementById('compose-subject');
const composeBody = document.getElementById('compose-body');
const composeTo = document.getElementById('compose-to');
const composeStatus = document.getElementById('compose-status');
const composeSend = document.getElementById('compose-send');

// ───────── state ─────────
let config = { aiEnabled: false, emailEnabled: false, fromAccounts: [], zelle: ZELLE };
let queue = []; // applications still pending a decision
let idx = 0; // index of the front card within queue
let composerRec = null; // applicant currently in the composer
let lastFocus = null; // element to restore focus to when an overlay closes

// ───────── api ─────────
async function api(path, opts = {}) {
  return fetch('/api/admin/' + path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
}

// ───────── boot ─────────
async function boot() {
  if (MOCK) {
    config = { aiEnabled: false, emailEnabled: true, fromAccounts: [{ label: 'hello@codeshareacademy.com', id: 'mock' }], zelle: ZELLE };
    startBoard(SAMPLE.slice());
    return;
  }
  const res = await api('applications');
  if (res.status === 401) return showLogin();
  if (!res.ok) {
    // Authenticated but the data call failed — a config/server issue, not a
    // login problem. Don't bounce silently to the password screen.
    showLogin();
    loginErr.textContent = 'Logged in, but couldn’t load applications — check the server config (ADMIN_DB_SECRET) and reload.';
    loginErr.classList.add('show');
    return;
  }
  const { applications } = await res.json();
  try {
    const c = await api('config');
    if (c.ok) config = await c.json();
  } catch { /* non-fatal */ }
  startBoard(applications || []);
}

function showLogin() {
  loginView.hidden = false;
  boardView.hidden = true;
  logoutBtn.hidden = true;
  queueMeta.hidden = true;
  pwInput.focus();
}

function startBoard(apps) {
  queue = apps.filter((a) => a.status === 'applied');
  idx = 0;
  loginView.hidden = true;
  boardView.hidden = false;
  logoutBtn.hidden = false;
  renderStack();
}

// ───────── login ─────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErr.classList.remove('show');
  if (MOCK) return boot();
  authState.textContent = 'checking…';
  const res = await api('login', { method: 'POST', body: JSON.stringify({ password: pwInput.value }) });
  if (res.ok) {
    authState.textContent = 'unlocked';
    authDot.style.background = 'var(--green)';
    pwInput.value = '';
    boot();
  } else {
    authState.textContent = 'locked';
    loginErr.textContent = res.status === 429 ? 'too many attempts — wait a bit' : 'access denied';
    loginErr.classList.add('show');
  }
});

logoutBtn.addEventListener('click', async () => {
  if (!MOCK) await api('logout', { method: 'POST' });
  location.reload();
});

// ───────── card stack ─────────
function renderStack() {
  stack.innerHTML = '';
  const remaining = queue.length - idx;
  const empty = remaining <= 0;
  emptyState.hidden = !empty;
  cardActions.style.visibility = empty ? 'hidden' : 'visible';
  queueMeta.hidden = false;
  queueMetaText.textContent = empty ? 'queue clear' : `${remaining} to review`;
  if (empty) return;

  const slice = queue.slice(idx, idx + 4);
  // Append back-to-front so the front card is painted last (on top).
  for (let d = slice.length - 1; d >= 0; d--) {
    const rec = slice[d];
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.depth = String(d);
    card.style.zIndex = String(10 - d);
    fillCard(card, rec);
    stack.appendChild(card);
    if (d === 0) attachDrag(card, rec);
  }
  syncScholar();
  ensureSummary(queue[idx]);
}

function fillCard(card, rec) {
  const first = (rec.student_name || 'applicant').trim().split(/\s+/)[0];
  card.querySelector('[data-tab]').textContent = slug(first);
  card.querySelector('[data-name]').textContent = rec.student_name || '—';
  card.querySelector('[data-grade]').textContent = rec.grade || '';
  card.querySelector('[data-exp]').textContent = rec.experience || '';
  card.querySelector('[data-loc]').textContent = areaCodeHint(rec.parent_phone);
  card.querySelector('[data-idea]').textContent = rec.build_idea || '—';
  card.querySelector('[data-count]').textContent = `${idx + 1}/${queue.length}`;
  const schol = card.querySelector('[data-schol]');
  schol.hidden = !rec.scholarship;
  const ai = card.querySelector('[data-ai]');
  if (rec.ai_summary) {
    ai.textContent = rec.ai_summary;
    ai.classList.remove('loading');
  } else if (config.aiEnabled && !MOCK) {
    ai.textContent = 'summarizing…';
    ai.classList.add('loading');
  } else {
    // No AI configured — fall back to their own words (the scholarship answer)
    // so the card is never blank.
    const m = (rec.motivation || '').trim();
    ai.textContent = m ? '“' + (m.length > 150 ? m.slice(0, 150) + '…' : m) + '”' : 'Open the full profile to read their answers.';
    ai.classList.remove('loading');
  }
}

// Lazily generate the AI summary for the front applicant, once.
async function ensureSummary(rec) {
  if (!rec || MOCK || !config.aiEnabled || rec.ai_summary || rec._sumTried) return;
  rec._sumTried = true;
  try {
    const res = await api('summary', { method: 'POST', body: JSON.stringify({ application: rec }) });
    if (!res.ok) throw new Error('summary');
    const { summary } = await res.json();
    rec.ai_summary = summary;
    const front = frontCard();
    if (front && queue[idx] === rec) {
      const ai = front.querySelector('[data-ai]');
      ai.textContent = summary;
      ai.classList.remove('loading');
    }
  } catch {
    const front = frontCard();
    if (front && queue[idx] === rec) {
      const ai = front.querySelector('[data-ai]');
      ai.textContent = 'Summary unavailable. Open the full profile.';
    }
  }
}

function frontCard() {
  return stack.querySelector('.swipe-card[data-depth="0"]');
}

// ───────── drag + keyboard ─────────
function attachDrag(card, rec) {
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
  const vAdmit = card.querySelector('.verdict.admit');
  const vDecline = card.querySelector('.verdict.decline');
  const vWait = card.querySelector('.verdict.waitlist');

  card.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY; dx = dy = 0;
    card.classList.remove('snapback');
    try { card.setPointerCapture(e.pointerId); } catch {}
  });
  card.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX; dy = e.clientY - startY;
    const rot = Math.max(-MAX_ROT, Math.min(MAX_ROT, dx / 12));
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    vAdmit.style.opacity = dx > 0 ? Math.min(1, dx / THRESHOLD) : 0;
    vDecline.style.opacity = dx < 0 ? Math.min(1, -dx / THRESHOLD) : 0;
    vWait.style.opacity = dy > 0 && Math.abs(dx) < 40 ? Math.min(1, dy / THRESHOLD) : 0;
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { card.releasePointerCapture(e.pointerId); } catch {}
    let dir = null;
    if (dy > THRESHOLD && Math.abs(dx) < Math.abs(dy)) dir = 'down';
    else if (dx > THRESHOLD) dir = 'right';
    else if (dx < -THRESHOLD) dir = 'left';
    if (dir && commit(dir)) return; // committed → card flies off
    // under threshold, or commit refused (mid-fling) → snap home
    card.classList.add('snapback');
    card.style.transform = '';
    vAdmit.style.opacity = vDecline.style.opacity = vWait.style.opacity = 0;
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

function onKey(e) {
  if (!boardView.hidden && drawer.classList.contains('open')) return;
  if (!composerOverlay.classList.contains('open') && !boardView.hidden) {
    if (e.key === 'ArrowRight') commit('right');
    else if (e.key === 'ArrowLeft') commit('left');
    else if (e.key === 'ArrowDown') commit('down');
  }
}

// ───────── decisions ─────────
let busy = false;

// Returns true if the decision was applied; false if it refused (mid-fling or
// no card) so the caller can snap the dragged card back instead of stranding it.
function commit(dir) {
  if (busy) return false;
  const rec = queue[idx];
  const card = frontCard();
  if (!rec || !card) return false;
  busy = true;
  const status = DIR_STATUS[dir];
  rec.status = status;
  saveUpdate(rec.id, { status });

  let advanced = false;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    idx++;
    renderStack();
    busy = false;
  };
  if (reduceMotion) {
    advance();
    return true;
  }
  const flyX = dir === 'right' ? 700 : dir === 'left' ? -700 : 0;
  const flyY = dir === 'down' ? 800 : 0;
  card.classList.add('fling');
  card.style.transform = `translate(${flyX}px, ${flyY}px) rotate(${flyX / 40}deg)`;
  card.style.opacity = '0';
  card.addEventListener('transitionend', advance, { once: true });
  // Guarantee the queue advances even if transitionend never fires
  // (interrupted transitions, background tabs, headless rendering).
  setTimeout(advance, 420);
  return true;
}

function syncScholar() {
  const rec = queue[idx];
  scholarToggle.classList.toggle('on', Boolean(rec && rec.scholarship));
}

scholarToggle.addEventListener('click', () => {
  const rec = queue[idx];
  if (!rec) return;
  rec.scholarship = !rec.scholarship;
  scholarToggle.classList.toggle('on', rec.scholarship);
  const badge = frontCard()?.querySelector('[data-schol]');
  if (badge) badge.hidden = !rec.scholarship;
  saveUpdate(rec.id, { scholarship: rec.scholarship });
});

cardActions.querySelectorAll('[data-dir]').forEach((b) =>
  b.addEventListener('click', () => commit(b.dataset.dir))
);
document.getElementById('open-profile').addEventListener('click', () => openDrawer(queue[idx]));
document.getElementById('email-btn').addEventListener('click', () => openComposer(queue[idx]));
document.getElementById('reload-btn').addEventListener('click', () => location.reload());

async function saveUpdate(id, patch) {
  if (MOCK || !id) return;
  try {
    await api('update', { method: 'POST', body: JSON.stringify({ id, ...patch }) });
  } catch { /* optimistic UI; a failed write is non-fatal here */ }
}

// ───────── full-profile drawer ─────────
function openDrawer(rec) {
  if (!rec) return;
  lastFocus = document.activeElement;
  drawerName.textContent = slug((rec.student_name || 'applicant').split(/\s+/)[0]);
  drawerBody.innerHTML = '';

  // AI summary block (with on-demand generate)
  const aiBox = el('div', 'profile-ai');
  const aiHead = el('div', 'k');
  aiHead.append(text('AI SUMMARY'));
  if (config.aiEnabled && !MOCK) {
    const gen = el('button', 'ai-gen-btn');
    gen.textContent = rec.ai_summary ? 'regenerate' : 'generate';
    gen.addEventListener('click', () => generateSummary(rec, aiVal, gen));
    aiHead.append(gen);
  }
  const aiVal = el('div', 'v');
  aiVal.textContent = rec.ai_summary || 'Not generated yet.';
  aiBox.append(aiHead, aiVal);
  drawerBody.append(aiBox);

  field('Status', (rec.status || 'applied') + (rec.scholarship ? '  ·  ★ scholarship' : ''));
  field('Grade', rec.grade);
  field('Experience', rec.experience);
  field('Availability', rec.availability);
  field('Location (inferred from area code)', areaCodeHint(rec.parent_phone));
  essay('What they want to build', rec.build_idea);
  essay('Built / fixed / figured out', rec.motivation);
  contactField('Parent / guardian', rec.parent_name);
  linkField('Parent phone', rec.parent_phone, 'tel:' + (rec.parent_phone || '').replace(/[^\d+]/g, ''));
  linkField('Parent email', rec.parent_email, 'mailto:' + (rec.parent_email || ''));
  field('Heard from', rec.heard_from || '—');
  field('Referral code used', rec.referred_by_code || '—');
  field('Applied', fmtDate(rec.created_at));

  // notes
  const nf = el('div', 'profile-field');
  nf.append(kv('Notes'));
  const ta = el('textarea');
  ta.value = rec.admin_notes || '';
  ta.placeholder = 'Private notes for the team…';
  ta.addEventListener('blur', () => {
    if (ta.value !== (rec.admin_notes || '')) {
      rec.admin_notes = ta.value;
      saveUpdate(rec.id, { note: ta.value });
    }
  });
  nf.append(ta);
  drawerBody.append(nf);

  // actions
  const actions = el('div', 'drawer-actions');
  const emailBtn = el('button', 'act-btn');
  emailBtn.textContent = '✉ Email';
  emailBtn.addEventListener('click', () => { closeDrawer(); openComposer(rec); });
  actions.append(emailBtn);
  drawerBody.append(actions);

  drawer.classList.add('open');
  drawerOverlay.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  document.getElementById('drawer-close').focus();

  function field(k, v) { drawerBody.append(simpleField(k, v)); }
  function contactField(k, v) { drawerBody.append(simpleField(k, v || '—')); }
  function essay(k, v) {
    const f = simpleField(k, v || '—');
    f.classList.add('essay');
    drawerBody.append(f);
  }
  function linkField(k, label, href) {
    const f = el('div', 'profile-field');
    f.append(kv(k));
    const v = el('div', 'v');
    if (label) { const a = el('a'); a.href = href; a.textContent = label; v.append(a); }
    else v.textContent = '—';
    f.append(v);
    drawerBody.append(f);
  }
}

async function generateSummary(rec, valEl, btn) {
  btn.disabled = true;
  valEl.textContent = 'generating…';
  try {
    const res = await api('summary', { method: 'POST', body: JSON.stringify({ application: rec }) });
    if (!res.ok) throw new Error();
    const { summary } = await res.json();
    rec.ai_summary = summary;
    valEl.textContent = summary;
    btn.textContent = 'regenerate';
    const front = frontCard();
    if (front && queue[idx] === rec) {
      const ai = front.querySelector('[data-ai]');
      ai.textContent = summary;
      ai.classList.remove('loading');
    }
  } catch {
    valEl.textContent = 'Could not generate a summary.';
  } finally {
    btn.disabled = false;
  }
}

function closeDrawer() {
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
drawerOverlay.addEventListener('click', closeDrawer);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);

// ───────── email composer ─────────
function openComposer(rec, key) {
  if (!rec) return;
  lastFocus = document.activeElement;
  composerRec = rec;
  composeFrom.innerHTML = '';
  (config.fromAccounts || []).forEach((a) => {
    const o = document.createElement('option');
    o.value = a.id; o.textContent = a.label;
    composeFrom.append(o);
  });
  const chosen = key || (rec.scholarship ? 'scholarship' : 'admit');
  tmplSelect.value = chosen;
  composeTo.textContent = `to: ${rec.parent_name || 'parent'} · ${rec.parent_email || 'no email'}`;
  applyTemplate(chosen, rec);

  const canSend = config.emailEnabled && (config.fromAccounts || []).length > 0;
  composeSend.disabled = !canSend;
  composeStatus.className = 'compose-status';
  composeStatus.textContent = canSend ? '' : 'Email isn’t configured yet (set COMPOSIO_API_KEY + a connected account).';

  composerOverlay.classList.add('open');
  tmplSelect.focus();
}

function applyTemplate(key, rec) {
  const t = TEMPLATES[key](rec);
  composeSubject.value = t.subject;
  composeBody.value = t.body;
}

tmplSelect.addEventListener('change', () => composerRec && applyTemplate(tmplSelect.value, composerRec));

function closeComposer() {
  composerOverlay.classList.remove('open');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
composerOverlay.addEventListener('click', (e) => { if (e.target === composerOverlay) closeComposer(); });
document.getElementById('composer-close').addEventListener('click', closeComposer);

composerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!composerRec) return;
  composeStatus.className = 'compose-status';
  composeStatus.textContent = 'sending…';
  if (MOCK) { composeStatus.className = 'compose-status ok'; composeStatus.textContent = 'sent (mock)'; return; }
  composeSend.disabled = true;
  try {
    const res = await api('send-email', {
      method: 'POST',
      body: JSON.stringify({
        id: composerRec.id,
        to: composerRec.parent_email,
        subject: composeSubject.value,
        body: composeBody.value,
        fromId: composeFrom.value,
        template: tmplSelect.value,
      }),
    });
    if (!res.ok) throw new Error();
    composerRec.last_email_template = tmplSelect.value;
    composeStatus.className = 'compose-status ok';
    composeStatus.textContent = '✓ sent';
    setTimeout(closeComposer, 900);
  } catch {
    composeStatus.className = 'compose-status err';
    composeStatus.textContent = 'Send failed. Check the connected account and try again.';
  } finally {
    composeSend.disabled = false;
  }
});

// ───────── email templates ─────────
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

// ───────── utilities ─────────
function first(r) { return (r.student_name || 'your student').trim().split(/\s+/)[0]; }
function short(s) { s = (s || '').trim(); return s.length > 80 ? s.slice(0, 80) + '…' : s; }
function slug(s) { return (s || 'applicant').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'applicant'; }

function areaCodeHint(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  const m = digits.length >= 10 ? digits.slice(-10).slice(0, 3) : null;
  const map = { '425': 'Eastside Seattle', '206': 'Seattle', '253': 'Tacoma', '360': 'WA', '564': 'WA' };
  if (!m) return '☎ unknown';
  return `${m} · ${map[m] || 'unknown area'}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function text(t) { return document.createTextNode(t); }
function kv(label) { const k = el('div', 'k'); k.textContent = label; return k; }
function simpleField(k, v) {
  const f = el('div', 'profile-field');
  f.append(kv(k));
  const val = el('div', 'v');
  val.textContent = v == null || v === '' ? '—' : String(v);
  f.append(val);
  return f;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (composerOverlay.classList.contains('open')) return closeComposer();
    if (drawer.classList.contains('open')) return closeDrawer();
  }
  onKey(e);
});

// ───────── sample data (mock mode) ─────────
const SAMPLE = [
  {
    id: 'm1', status: 'applied', created_at: '2026-06-21T18:30:00Z',
    student_name: 'Maya Hartwell', grade: '7th grade', experience: 'Tinkered a bit',
    build_idea: 'An app that quizzes you from your own class notes — you paste them in and it makes flashcards and a practice test.',
    motivation: 'I fixed my little brother’s Scratch game when it kept crashing — turned out a loop never ended. Took me a weekend of trial and error.',
    availability: 'Yes, all of them', parent_name: 'Dana Hartwell', parent_phone: '(425) 555-0123',
    parent_email: 'dana@example.com', heard_from: 'a friend', referred_by_code: '37WHPQ5',
    ai_summary: 'Maya (7th, tinkered a bit) wants a notes-to-flashcards study app — a genuinely useful, well-scoped idea.\nScholarship: strong — debugged a real infinite loop in her brother’s game, clear follow-through.',
    scholarship: false, admin_notes: '',
  },
  {
    id: 'm2', status: 'applied', created_at: '2026-06-22T15:05:00Z',
    student_name: 'Leo Park', grade: '8th grade', experience: 'Built things before',
    build_idea: 'A Discord bot for my robotics team that tracks who’s bringing what to competitions and pings people the night before.',
    motivation: 'I set up a shared spreadsheet for our team and added formulas so it auto-totals parts cost. People actually use it now.',
    availability: 'Most of them', parent_name: 'Grace Park', parent_phone: '(206) 555-0177',
    parent_email: 'grace.park@example.com', heard_from: 'school', referred_by_code: null,
    ai_summary: '', scholarship: false, admin_notes: '',
  },
  {
    id: 'm3', status: 'applied', created_at: '2026-06-23T01:12:00Z',
    student_name: 'Aria Nguyen', grade: '6th grade', experience: 'Total beginner',
    build_idea: 'A website where you log how much water you drink and a little plant grows when you hit your goal.',
    motivation: 'I taught myself to crochet from YouTube and sold a few at a school fair. I like figuring stuff out until it works.',
    availability: 'Yes, all of them', parent_name: 'Tom Nguyen', parent_phone: '(253) 555-0190',
    parent_email: 'tnguyen@example.com', heard_from: 'instagram', referred_by_code: null,
    ai_summary: '', scholarship: true, admin_notes: 'Mom mentioned cost is tight — strong scholarship candidate.',
  },
];

boot();
