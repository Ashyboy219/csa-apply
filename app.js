// Code Share Academy — apply form submission.
// Submits one application through the submit_camp_application RPC, which also
// mints the applicant's referral code, in the obsidian-codex-console Supabase
// project. The publishable key is browser-safe: a visitor can only submit an
// application (insert-only, no read), and all referral validation + the
// "joined" gate live server-side, so the form cannot be used to game rewards.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://xfyijkztkhfkuffmjqwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A7d4oGNXwTaH8vIx7Jl94Q_D_dD6uFE";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.getElementById("apply-form");
const submitBtn = document.getElementById("submit-btn");
const errorBox = document.getElementById("form-error");
const sbState = document.getElementById("sb-state");
const referralInput = document.getElementById("referral_code");

// Prefill the referral code from a ?ref= link, e.g. /apply?ref=37WHPQ5.
const refFromUrl = new URLSearchParams(location.search).get("ref");
if (refFromUrl && referralInput && !referralInput.value) {
  referralInput.value = refFromUrl.trim().toUpperCase().slice(0, 12);
}

function showError(message) {
  errorBox.textContent = "✗ " + message;
  errorBox.classList.add("show");
}

function clearError() {
  errorBox.classList.remove("show");
  errorBox.textContent = "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  // Surface native validation styling only once the user has tried to send.
  form.classList.add("submitted");
  if (!form.checkValidity()) {
    const firstInvalid = form.querySelector(":invalid");
    if (firstInvalid) firstInvalid.focus();
    showError("A few fields still need answers. Check the highlighted lines.");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const referredBy = (data.referral_code || "").trim().toUpperCase() || null;

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  sbState.textContent = "writing…";

  try {
    const { data: result, error } = await supabase.rpc("submit_camp_application", {
      p_student_name: data.student_name.trim(),
      p_grade: data.grade,
      p_parent_name: data.parent_name.trim(),
      p_parent_phone: data.parent_phone.trim(),
      p_parent_email: data.parent_email.trim(),
      p_experience: data.experience,
      p_build_idea: data.build_idea.trim(),
      p_motivation: data.motivation.trim(),
      p_availability: data.availability,
      p_heard_from: data.heard_from?.trim() || null,
      p_user_agent: navigator.userAgent.slice(0, 500),
      p_referred_by_code: referredBy,
    });
    if (error) throw error;

    renderSuccess({
      firstName: data.student_name.trim().split(/\s+/)[0] || "you",
      grade: data.grade,
      experience: data.experience,
      parentPhone: data.parent_phone.trim(),
      referralCode: result?.referral_code || null,
      referralAccepted: !!result?.referral_accepted,
      referralEntered: !!referredBy,
    });
  } catch (err) {
    console.error("Submission failed:", err);
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit application →";
    sbState.textContent = "error";
    showError(
      "Something went wrong sending that. Try again, or just call or text (425) 677-5903 to grab a seat."
    );
  }
});

function renderSuccess(info) {
  const link = info.referralCode
    ? `${location.origin}/apply?ref=${encodeURIComponent(info.referralCode)}`
    : null;

  const referredLine = info.referralAccepted
    ? `<div class="cmt"># applied with a friend's link &mdash; when you join, you <b>both</b> get a class free <span class="ok">✓</span></div>`
    : info.referralEntered
      ? `<div class="cmt"># (that referral code didn't match, but you're all set)</div>`
      : "";

  const referBlock = link
    ? `
    <div class="refer-box">
      <div class="refer-h">Refer a friend &mdash; you both get a class free</div>
      <div class="refer-sub">Share your link. When a friend joins with it, you each get a free class. No limit on how many friends.</div>
      <div class="refer-row">
        <input class="refer-link" id="refer-link" type="text" readonly value="${escapeHtml(link)}" aria-label="Your referral link" />
        <button class="copy-btn" type="button" id="copy-link">Copy link</button>
      </div>
      <div class="refer-code">your code: <b>${escapeHtml(info.referralCode)}</b></div>
    </div>`
    : "";

  form.innerHTML = `
    <div class="editor-bar">
      <span class="dots small" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="tab">application.py <span class="x" aria-hidden="true">×</span></span>
      <span class="editor-meta">~/code-share ›&nbsp; saved</span>
    </div>
    <div class="received">
      <div class="ok">✓ application received</div>
      <div><span class="cmt"># seat request logged for </span><span class="val">${escapeHtml(info.firstName)}</span></div>
      <div class="cmt"># grade: <span class="val">${escapeHtml(info.grade)}</span> · experience: <span class="val">${escapeHtml(info.experience)}</span></div>
      ${referredLine}
      <br />
      <div>We read every one. Expect a text at <span class="val">${escapeHtml(info.parentPhone)}</span> within a few days.</div>
      <div class="cmt"># questions before then? call or text <a href="tel:+14256775903">(425) 677-5903</a></div>
      ${referBlock}
    </div>
    <div class="statusbar" aria-hidden="true">
      <span class="sb-left"><span class="sb-dot"></span><span class="ok-t">saved</span><span class="sep">·</span><span>main</span><span class="sep">·</span><span>see you Saturday</span></span>
      <span class="sb-right">first class, free</span>
    </div>`;

  const copyBtn = document.getElementById("copy-link");
  if (copyBtn && link) {
    copyBtn.addEventListener("click", async () => {
      const flash = () => {
        copyBtn.textContent = "Copied ✓";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "Copy link";
          copyBtn.classList.remove("copied");
        }, 1800);
      };
      try {
        await navigator.clipboard.writeText(link);
        flash();
      } catch {
        const el = document.getElementById("refer-link");
        el.focus();
        el.select();
        try { document.execCommand("copy"); } catch {}
        flash();
      }
    });
  }

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
