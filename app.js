// Code Share Academy — apply form submission.
// Writes one row to public.camp_application in the obsidian-codex-console
// Supabase project. The publishable key is meant to live in the browser;
// the row is insert-only for anon (no read access via this key), so the
// worst a visitor can do is submit an application.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://xfyijkztkhfkuffmjqwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A7d4oGNXwTaH8vIx7Jl94Q_D_dD6uFE";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.getElementById("apply-form");
const submitBtn = document.getElementById("submit-btn");
const errorBox = document.getElementById("form-error");
const sbState = document.getElementById("sb-state");

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
    showError("A few fields still need answers — check the highlighted lines.");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    student_name: data.student_name.trim(),
    grade: data.grade,
    parent_name: data.parent_name.trim(),
    parent_phone: data.parent_phone.trim(),
    parent_email: data.parent_email.trim(),
    experience: data.experience,
    build_idea: data.build_idea.trim(),
    motivation: data.motivation.trim(),
    availability: data.availability,
    heard_from: data.heard_from?.trim() || null,
    user_agent: navigator.userAgent.slice(0, 500),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  sbState.textContent = "writing…";

  try {
    const { error } = await supabase.from("camp_application").insert(payload);
    if (error) throw error;
    renderSuccess(payload);
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

function renderSuccess(payload) {
  const editor = form;
  const firstName = payload.student_name.split(/\s+/)[0] || "you";

  editor.innerHTML = `
    <div class="editor-bar">
      <span class="dots small" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="tab">application.py <span class="x" aria-hidden="true">×</span></span>
      <span class="editor-meta">~/future-coders ›&nbsp; saved</span>
    </div>
    <div class="received">
      <div class="ok">✓ application received</div>
      <div><span class="cmt"># seat request logged for </span><span class="val">${escapeHtml(firstName)}</span></div>
      <div class="cmt"># grade: <span class="val">${escapeHtml(payload.grade)}</span> · experience: <span class="val">${escapeHtml(payload.experience)}</span></div>
      <br />
      <div>We read every one. Expect a text at <span class="val">${escapeHtml(payload.parent_phone)}</span> within a few days.</div>
      <div class="cmt"># questions before then? call or text <a href="tel:+14256775903">(425) 677-5903</a></div>
    </div>
    <div class="statusbar" aria-hidden="true">
      <span class="sb-dot"></span><span>saved</span>
      <span class="sep">·</span><span>main</span>
      <span class="sep">·</span><span>see you Saturday</span>
      <span class="sb-right">first class — free</span>
    </div>`;

  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
