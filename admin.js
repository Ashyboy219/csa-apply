// Code Share Academy — admin review dashboard.
// Talks only to the cookie-gated /api/admin/* functions; no DB keys here.
// `?mock=1` loads sample data and skips the network for local UI work.

const MOCK = new URLSearchParams(location.search).get('mock') === '1';
const THRESHOLD = 110;
const MAX_ROT = 14;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DIR_STATUS = { right: 'enrolled', left: 'declined', down: 'waitlist' };
const PILES = ['applied', 'enrolled', 'waitlist', 'declined'];

// ───────── elements ─────────
const loginView = document.getElementById('login-view');
const boardView = document.getElementById('board-view');
const loginForm = document.getElementById('login-form');
const loginName = document.getElementById('login-name');
const pwInput = document.getElementById('pw');
const teamPwInput = document.getElementById('team-pw');
const loginErr = document.getElementById('login-err');
const authState = document.getElementById('auth-state');
const authDot = document.getElementById('auth-dot');
const logoutBtn = document.getElementById('logout-btn');
const connectBtn = document.getElementById('connect-gmail');
const whoami = document.getElementById('whoami');

const pileBar = document.getElementById('pile-bar');
const stack = document.getElementById('stack');
const tpl = document.getElementById('card-tpl');
const cardActions = document.getElementById('card-actions');
const emptyState = document.getElementById('empty-state');
const emptyH = document.getElementById('empty-h');
const emptyS = document.getElementById('empty-s');
const emptyTick = document.getElementById('empty-tick');
const scholarToggle = document.getElementById('scholar-toggle');
const boardHint = document.querySelector('.board-hint');

const profileTab = document.getElementById('profile-tab');
const profileLoc = document.getElementById('profile-loc');
const profileEmpty = document.getElementById('profile-empty');
const profileContent = document.getElementById('profile-content');
const toast = document.getElementById('toast');

// ───────── state ─────────
let config = { aiEnabled: false, emailEnabled: false, canConnectGmail: false, fromAccounts: [], zelle: '425-306-8726' };
let allApps = [];
let pile = 'applied';
let queue = [];
let idx = 0;
let busy = false;
let adminName = localStorage.getItem('csa_admin_name') || '';

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
  handleGmailReturn();
  if (MOCK) {
    config = { aiEnabled: false, emailEnabled: true, canConnectGmail: true, fromAccounts: [{ label: 'hello@codeshareacademy.com', id: 'mock', owner: 'shared' }], zelle: '425-306-8726' };
    startBoard(SAMPLE.slice());
    return;
  }
  const res = await api('applications');
  if (res.status === 401) return showLogin();
  if (!res.ok) {
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
  connectBtn.hidden = true;
  whoami.hidden = true;
  if (adminName) loginName.value = adminName;
  (adminName ? pwInput : loginName).focus();
}

function startBoard(apps) {
  allApps = apps;
  loginView.hidden = true;
  boardView.hidden = false;
  logoutBtn.hidden = false;
  connectBtn.hidden = !config.canConnectGmail;
  whoami.hidden = !adminName;
  whoami.textContent = adminName ? `${adminName}` : '';
  updateCounts();
  setPile('applied');
}

// ───────── login ─────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErr.classList.remove('show');
  adminName = loginName.value.trim() || adminName;
  if (MOCK) {
    if (adminName) localStorage.setItem('csa_admin_name', adminName);
    return boot();
  }
  authState.textContent = 'checking…';
  const res = await api('login', { method: 'POST', body: JSON.stringify({ name: adminName, password: pwInput.value, teamPassword: teamPwInput.value }) });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    adminName = data.name || adminName;
    if (adminName) localStorage.setItem('csa_admin_name', adminName);
    authState.textContent = 'unlocked';
    authDot.style.background = 'var(--green)';
    pwInput.value = '';
    teamPwInput.value = '';
    if (data.created) setTimeout(() => showToast('✓ Password set — use it next time', 'ok'), 400);
    boot();
  } else {
    authState.textContent = 'locked';
    loginErr.textContent = res.status === 429 ? 'too many attempts — wait a bit' : (data.error || 'access denied');
    loginErr.classList.add('show');
  }
});

logoutBtn.addEventListener('click', async () => {
  if (!MOCK) await api('logout', { method: 'POST' });
  location.reload();
});

connectBtn.addEventListener('click', async () => {
  if (MOCK) return showToast('Connect Gmail isn’t available in mock mode', 'err');
  showToast('Starting Gmail connection…');
  try {
    const res = await api('connect', { method: 'POST', body: JSON.stringify({ name: adminName }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.redirectUrl) { window.location.href = data.redirectUrl; return; }
    showToast(data.error || 'Couldn’t start Gmail connection', 'err');
  } catch {
    showToast('Couldn’t start Gmail connection', 'err');
  }
});

// ───────── piles ─────────
function updateCounts() {
  for (const p of PILES) {
    const n = allApps.filter((a) => a.status === p).length;
    const el = document.querySelector(`[data-pile-n="${p}"]`);
    if (el) el.textContent = String(n);
  }
}

function setPile(p) {
  pile = p;
  pileBar.querySelectorAll('.pile').forEach((b) => {
    const on = b.dataset.pile === p;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  queue = allApps.filter((a) => a.status === p);
  idx = 0;
  renderStack();
}

pileBar.querySelectorAll('.pile').forEach((b) =>
  b.addEventListener('click', () => setPile(b.dataset.pile))
);

// ───────── card stack ─────────
function renderStack() {
  stack.innerHTML = '';
  const remaining = queue.length - idx;
  const empty = remaining <= 0;
  emptyState.hidden = !empty;
  cardActions.style.visibility = empty ? 'hidden' : 'visible';
  boardHint.style.visibility = empty ? 'hidden' : 'visible';

  if (empty) {
    const labels = { applied: ['Pile clear', 'Every application here has a decision.'], enrolled: ['No admits yet', 'Admitted students will show up here.'], waitlist: ['Waitlist empty', 'No one is waitlisted right now.'], declined: ['None declined', 'Declined applications will show up here.'] };
    const [h, s] = labels[pile] || ['Empty', ''];
    emptyH.textContent = h; emptyS.textContent = s;
    emptyTick.textContent = pile === 'applied' ? '✓' : '·';
    renderProfile(null);
    return;
  }

  const slice = queue.slice(idx, idx + 4);
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
  renderProfile(queue[idx]);
  ensureSummary(queue[idx]);
}

function verdictMeta(v) {
  if (v === 'accept') return { cls: 'accept', label: '✓ accept' };
  if (v === 'reject') return { cls: 'reject', label: '✗ reject' };
  if (v === 'maybe') return { cls: 'maybe', label: '~ maybe' };
  return { cls: '', label: 'no verdict yet' };
}

function fillCard(card, rec) {
  const first = (rec.student_name || 'applicant').trim().split(/\s+/)[0];
  card.querySelector('[data-tab]').textContent = slug(first);
  card.querySelector('[data-name]').textContent = rec.student_name || '—';
  card.querySelector('[data-grade]').textContent = rec.grade || '';
  card.querySelector('[data-exp]').textContent = rec.experience || '';
  card.querySelector('[data-idea]').textContent = rec.build_idea || '—';
  card.querySelector('[data-count]').textContent = `${idx + 1}/${queue.length}`;
  card.querySelector('[data-state]').textContent = rec.status || 'applied';
  card.querySelector('[data-schol]').hidden = !rec.scholarship;

  const vm = verdictMeta(rec.ai_verdict);
  const pillEl = card.querySelector('[data-verdict-pill]');
  pillEl.textContent = vm.label;
  pillEl.className = 'verdict-pill' + (vm.cls ? ' ' + vm.cls : '');
  card.classList.remove('v-accept', 'v-reject', 'v-maybe');
  if (vm.cls) card.classList.add('v-' + vm.cls);

  const ai = card.querySelector('[data-ai]');
  if (rec.ai_summary) {
    ai.textContent = rec.ai_summary;
    ai.classList.remove('loading');
  } else if (config.aiEnabled && !MOCK) {
    ai.textContent = 'summarizing…';
    ai.classList.add('loading');
  } else {
    const m = (rec.motivation || '').trim();
    ai.textContent = m ? '“' + (m.length > 140 ? m.slice(0, 140) + '…' : m) + '”' : 'Open the profile to read their answers.';
    ai.classList.remove('loading');
  }
}

async function ensureSummary(rec) {
  if (!rec || MOCK || !config.aiEnabled || rec.ai_summary || rec._sumTried) return;
  rec._sumTried = true;
  try {
    const res = await api('summary', { method: 'POST', body: JSON.stringify({ application: rec }) });
    if (!res.ok) throw new Error();
    const { summary, verdict } = await res.json();
    rec.ai_summary = summary;
    rec.ai_verdict = verdict || rec.ai_verdict;
    if (queue[idx] === rec) {
      const front = frontCard();
      if (front) fillCard(front, rec);
      renderProfile(rec);
    }
  } catch {
    if (queue[idx] === rec) {
      const front = frontCard();
      const ai = front && front.querySelector('[data-ai]');
      if (ai) ai.textContent = 'Summary unavailable. Read their answers in the profile.';
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
    if (dir && commit(dir)) return;
    card.classList.add('snapback');
    card.style.transform = '';
    vAdmit.style.opacity = vDecline.style.opacity = vWait.style.opacity = 0;
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

function onKey(e) {
  if (boardView.hidden) return;
  if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); commit('right'); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); commit('left'); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); commit('down'); }
}

// ───────── decisions ─────────
function commit(dir) {
  if (busy) return false;
  const rec = queue[idx];
  const card = frontCard();
  if (!rec || !card) return false;
  busy = true;
  const status = DIR_STATUS[dir];
  rec.status = status;
  saveUpdate(rec.id, { status });
  updateCounts();

  let advanced = false;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    idx++;
    renderStack();
    busy = false;
  };
  if (reduceMotion) { advance(); return true; }
  const flyX = dir === 'right' ? 700 : dir === 'left' ? -700 : 0;
  const flyY = dir === 'down' ? 800 : 0;
  card.classList.add('fling');
  card.style.transform = `translate(${flyX}px, ${flyY}px) rotate(${flyX / 40}deg)`;
  card.style.opacity = '0';
  card.addEventListener('transitionend', advance, { once: true });
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
  renderProfile(rec);
  saveUpdate(rec.id, { scholarship: rec.scholarship });
});

cardActions.querySelectorAll('[data-dir]').forEach((b) =>
  b.addEventListener('click', () => commit(b.dataset.dir))
);
document.getElementById('reload-btn').addEventListener('click', () => location.reload());

async function saveUpdate(id, patch) {
  if (MOCK || !id) return;
  try {
    await api('update', { method: 'POST', body: JSON.stringify({ id, reviewer: adminName || null, ...patch }) });
  } catch { /* optimistic */ }
}

// ───────── inline profile pane ─────────
function renderProfile(rec) {
  if (!rec) {
    profileEmpty.hidden = false;
    profileContent.hidden = true;
    profileContent.innerHTML = '';
    profileTab.textContent = 'profile';
    profileLoc.textContent = '';
    return;
  }
  profileEmpty.hidden = true;
  profileContent.hidden = false;
  profileContent.innerHTML = '';
  profileTab.textContent = slug((rec.student_name || 'applicant').split(/\s+/)[0]);
  profileLoc.textContent = areaCodeHint(rec.parent_phone);

  // head: name + verdict
  const head = el('div', 'profile-head');
  const nm = el('div', 'profile-name'); nm.textContent = rec.student_name || '—';
  const vm = verdictMeta(rec.ai_verdict);
  const vEl = el('div', 'profile-verdict' + (vm.cls ? ' ' + vm.cls : '')); vEl.textContent = vm.label;
  head.append(nm, vEl);
  profileContent.append(head);

  // chips: status, grade, exp, scholarship
  const chips = el('div', 'profile-chips');
  chips.append(chip(rec.status || 'applied', 'status-' + (rec.status || 'applied')));
  if (rec.grade) chips.append(chip(rec.grade));
  if (rec.experience) chips.append(chip(rec.experience));
  if (rec.scholarship) chips.append(chip('★ scholarship', 'schol'));
  profileContent.append(chips);

  // AI summary box
  const aiBox = el('div', 'profile-ai');
  const aiHead = el('div', 'k'); aiHead.append(text('AI SUMMARY'));
  if (config.aiEnabled && !MOCK) {
    const gen = el('button', 'ai-gen-btn'); gen.textContent = rec.ai_summary ? 'regenerate' : 'generate';
    gen.addEventListener('click', () => generateSummary(rec, aiVal, gen));
    aiHead.append(gen);
  }
  const aiVal = el('div', 'v'); aiVal.textContent = rec.ai_summary || (config.aiEnabled ? 'Generating…' : 'AI not configured yet.');
  aiBox.append(aiHead, aiVal);
  profileContent.append(aiBox);

  // essays
  profileContent.append(field('What they want to build', rec.build_idea, true));
  profileContent.append(field('Built / fixed / figured out', rec.motivation, true));

  // grid of facts
  const grid = el('div', 'p-grid');
  grid.append(field('Availability', rec.availability));
  grid.append(field('Location (area code)', areaCodeHint(rec.parent_phone)));
  grid.append(field('Heard from', rec.heard_from || '—'));
  grid.append(field('Referral used', rec.referred_by_code || '—'));
  profileContent.append(grid);

  // contact
  profileContent.append(field('Parent / guardian', rec.parent_name || '—'));
  const cg = el('div', 'p-grid');
  cg.append(linkField('Phone', rec.parent_phone, 'tel:' + (rec.parent_phone || '').replace(/[^\d+]/g, '')));
  cg.append(linkField('Email', rec.parent_email, 'mailto:' + (rec.parent_email || '')));
  profileContent.append(cg);
  profileContent.append(field('Applied', fmtDate(rec.created_at)));

  // notes
  const nf = el('div', 'p-field'); nf.append(kv('Notes'));
  const ta = el('textarea'); ta.value = rec.admin_notes || ''; ta.placeholder = 'Private notes for the team…';
  ta.addEventListener('blur', () => {
    if (ta.value !== (rec.admin_notes || '')) { rec.admin_notes = ta.value; saveUpdate(rec.id, { note: ta.value }); }
  });
  nf.append(ta);
  profileContent.append(nf);

  // actions
  const actions = el('div', 'profile-actions');
  const email = el('a', 'email-btn'); email.textContent = '✉ Email';
  email.href = '/compose?id=' + encodeURIComponent(rec.id);
  if (rec.last_emailed_at) { const sent = el('span', 'p-chip'); sent.textContent = 'emailed · ' + (rec.last_email_template || ''); actions.append(email, sent); }
  else actions.append(email);
  profileContent.append(actions);
}

async function generateSummary(rec, valEl, btn) {
  btn.disabled = true;
  valEl.textContent = 'generating…';
  try {
    const res = await api('summary', { method: 'POST', body: JSON.stringify({ application: rec }) });
    if (!res.ok) throw new Error();
    const { summary, verdict } = await res.json();
    rec.ai_summary = summary;
    rec.ai_verdict = verdict || rec.ai_verdict;
    if (queue[idx] === rec) { const f = frontCard(); if (f) fillCard(f, rec); }
    renderProfile(rec);
  } catch {
    valEl.textContent = 'Could not generate a summary.';
    btn.disabled = false;
  }
}

// ───────── toast + gmail return ─────────
let toastTimer = null;
function showToast(msg, type) {
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function handleGmailReturn() {
  const g = new URLSearchParams(location.search).get('gmail');
  if (!g) return;
  history.replaceState(null, '', location.pathname);
  setTimeout(() => showToast(g === 'connected' ? '✓ Gmail connected' : 'Gmail connection failed', g === 'connected' ? 'ok' : 'err'), 300);
}

// ───────── helpers ─────────
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
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch { return iso; }
}
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function text(t) { return document.createTextNode(t); }
function kv(label) { const k = el('div', 'k'); k.textContent = label; return k; }
function chip(label, cls) { const c = el('span', 'p-chip' + (cls ? ' ' + cls : '')); c.textContent = label; return c; }
function field(k, v, essay) {
  const f = el('div', 'p-field' + (essay ? ' essay' : ''));
  f.append(kv(k));
  const val = el('div', 'v'); val.textContent = v == null || v === '' ? '—' : String(v);
  f.append(val);
  return f;
}
function linkField(k, label, href) {
  const f = el('div', 'p-field');
  f.append(kv(k));
  const v = el('div', 'v');
  if (label) { const a = el('a'); a.href = href; a.textContent = label; v.append(a); } else v.textContent = '—';
  f.append(v);
  return f;
}

window.addEventListener('keydown', onKey);

// ───────── sample data (mock mode) ─────────
const SAMPLE = [
  { id: 'm1', status: 'applied', created_at: '2026-06-21T18:30:00Z', student_name: 'Maya Hartwell', grade: '7th grade', experience: 'Tinkered a bit',
    build_idea: 'An app that quizzes you from your own class notes — you paste them in and it makes flashcards and a practice test.',
    motivation: 'I fixed my little brother’s Scratch game when it kept crashing — a loop never ended. Took me a weekend of trial and error.',
    availability: 'Yes, all of them', parent_name: 'Dana Hartwell', parent_phone: '(425) 555-0123', parent_email: 'dana@example.com',
    heard_from: 'a friend', referred_by_code: '37WHPQ5',
    ai_summary: 'Maya (7th, tinkered a bit) wants a notes-to-flashcards study app — useful and well-scoped.\nScholarship: strong — debugged a real infinite loop, clear follow-through.',
    ai_verdict: 'accept', scholarship: false, admin_notes: '' },
  { id: 'm2', status: 'applied', created_at: '2026-06-22T15:05:00Z', student_name: 'Leo Park', grade: '8th grade', experience: 'Built things before',
    build_idea: 'A Discord bot for my robotics team that tracks who’s bringing what to competitions and pings people the night before.',
    motivation: 'I set up a shared spreadsheet for our team and added formulas so it auto-totals parts cost. People actually use it now.',
    availability: 'Most of them', parent_name: 'Grace Park', parent_phone: '(206) 555-0177', parent_email: 'grace.park@example.com',
    heard_from: 'school', referred_by_code: null, ai_summary: '', ai_verdict: 'maybe', scholarship: false, admin_notes: '' },
  { id: 'm3', status: 'applied', created_at: '2026-06-23T01:12:00Z', student_name: 'Aria Nguyen', grade: '6th grade', experience: 'Total beginner',
    build_idea: 'A website where you log how much water you drink and a little plant grows when you hit your goal.',
    motivation: 'I taught myself to crochet from YouTube and sold a few at a school fair. I like figuring stuff out until it works.',
    availability: 'Yes, all of them', parent_name: 'Tom Nguyen', parent_phone: '(253) 555-0190', parent_email: 'tnguyen@example.com',
    heard_from: 'instagram', referred_by_code: null, ai_summary: '', ai_verdict: null, scholarship: true, admin_notes: 'Cost is tight — strong scholarship candidate.' },
  { id: 'm4', status: 'enrolled', created_at: '2026-06-20T12:00:00Z', student_name: 'Sam Rivera', grade: '7th grade', experience: 'Tinkered a bit',
    build_idea: 'A game where you guide a robot through a maze by writing little commands.',
    motivation: 'I modded a Minecraft world with command blocks so my friends and I could do parkour races.',
    availability: 'Yes, all of them', parent_name: 'Jo Rivera', parent_phone: '(425) 555-0144', parent_email: 'jo@example.com',
    heard_from: 'a friend', referred_by_code: null, ai_summary: 'Sam (7th) wants a code-the-robot maze game; modded Minecraft with command blocks.\nScholarship: solid maker instinct.',
    ai_verdict: 'accept', scholarship: false, admin_notes: '', last_emailed_at: '2026-06-23T00:00:00Z', last_email_template: 'admit' },
];

boot();
