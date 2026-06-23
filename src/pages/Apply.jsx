import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

const EXPERIENCE = [
  { value: "Total beginner", label: "Total beginner", note: "never written code" },
  { value: "Tinkered a bit", label: "Tinkered a bit", note: "Scratch, a class, YouTube" },
  { value: "Built things before", label: "Built things", note: "finished a project or two" },
];

export default function Apply() {
  const formRef = useRef(null);
  const okRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [tried, setTried] = useState(false);
  const [experience, setExperience] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setTried(true);
    const form = formRef.current;
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) firstInvalid.focus();
      setError("A few fields still need answers — check the highlighted lines.");
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

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("camp_application").insert(payload);
      if (insertError) throw insertError;
      setDone(payload);
      window.scrollTo({ top: 0, behavior: "smooth" });
      requestAnimationFrame(() => okRef.current?.focus());
    } catch (err) {
      console.error("Submission failed:", err);
      setSubmitting(false);
      setError("Something went wrong sending that. Try again, or call or text (425) 677-5903 to grab a seat.");
    }
  }

  return (
    <>
      <header className="nav">
        <a className="skip-link" href="#main">Skip to content</a>
        <div className="wrap nav-inner">
          <Link className="brandwrap" to="/">
            <span className="dots green" aria-hidden="true"><i></i><i></i><i></i></span>
            <span className="brand">CODE SHARE ACADEMY</span>
            <span className="path">/ apply.md</span>
          </Link>
          <div className="nav-links" style={{ marginLeft: "auto" }}>
            <Link to="/">← overview</Link>
          </div>
        </div>
      </header>

      <main id="main" className="apply-main">
        {done ? (
          <Received payload={done} headingRef={okRef} />
        ) : (
          <>
            <div className="apply-head">
              <p className="eyebrow">application · ai + coding · grades 6–8</p>
              <h1 className="headline">Claim a <span className="g">free first class</span>.</h1>
              <p className="lead">
                First class is free, then $25 a class — pay as you go. This takes about three
                minutes, and a founder who actually ships AI reads <b>every single one</b>.
              </p>
            </div>

            <form ref={formRef} className={`form-editor${tried ? " submitted" : ""}`} noValidate onSubmit={onSubmit}>
              <div className="editor-bar">
                <span className="dots" aria-hidden="true"><i></i><i></i><i></i></span>
                <span className="tab">application.py <span className="x" aria-hidden="true">×</span></span>
                <span className="editor-meta">~/future-coders ›&nbsp; UTF-8</span>
              </div>

              <div className="editor-body">
                <Field n="01" id="student_name" label="# student's name" req>
                  <input id="student_name" name="student_name" type="text" autoComplete="name" maxLength={120} required placeholder="first and last" />
                </Field>

                <Field n="02" id="grade" label="# grade this fall" req>
                  <select id="grade" name="grade" required defaultValue="">
                    <option value="" disabled hidden>select…</option>
                    <option value="6th grade">6th grade</option>
                    <option value="7th grade">7th grade</option>
                    <option value="8th grade">8th grade</option>
                    <option value="other">other (tell us below)</option>
                  </select>
                </Field>

                <Field n="03" id="parent_name" label="# parent / guardian name" req>
                  <input id="parent_name" name="parent_name" type="text" autoComplete="name" maxLength={120} required placeholder="who we'll be in touch with" />
                </Field>

                <Field n="04" id="parent_phone" labelNode={<># parent phone <span className="hint">— we register by call or text</span></>} req>
                  <input id="parent_phone" name="parent_phone" type="tel" autoComplete="tel" maxLength={40} required placeholder="(425) 555-0123" />
                </Field>

                <Field n="05" id="parent_email" label="# parent email" req>
                  <input id="parent_email" name="parent_email" type="email" autoComplete="email" maxLength={200} required placeholder="you@example.com" />
                </Field>

                <Field n="06" labelId="experience-label" label="# how much has the student coded?" req>
                  <div
                    className="segmented"
                    role="radiogroup"
                    aria-labelledby="experience-label"
                    aria-required="true"
                    aria-invalid={tried && !experience ? "true" : undefined}
                  >
                    {EXPERIENCE.map((opt, i) => (
                      <label key={opt.value}>
                        <input
                          type="radio"
                          name="experience"
                          value={opt.value}
                          required={i === 0}
                          checked={experience === opt.value}
                          onChange={(e) => setExperience(e.target.value)}
                        />
                        <span className="opt">{opt.label}<small>{opt.note}</small></span>
                      </label>
                    ))}
                  </div>
                </Field>

                <Field n="07" id="build_idea" label="# if you could build ONE thing with AI, what would it be?" req>
                  <textarea id="build_idea" name="build_idea" maxLength={2000} required placeholder="a game, an app for your class, a bot that does your chores — anything. doesn't have to be realistic." />
                </Field>

                <Field n="08" id="motivation" labelNode={<># why do you want in? <span className="hint">— a sentence or two is plenty</span></>} req>
                  <textarea id="motivation" name="motivation" maxLength={2000} required placeholder="what's pulling you to this?" />
                </Field>

                <Field n="09" id="availability" label="# Saturdays 11:30–12:30, Jul 25 – Sep 26" req>
                  <select id="availability" name="availability" required defaultValue="">
                    <option value="" disabled hidden>select…</option>
                    <option value="Yes — all of them">Yes — I can make all of them</option>
                    <option value="Most of them">Most of them</option>
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                </Field>

                <Field n="10" id="heard_from" labelNode={<># how'd you hear about us? <span className="hint">— optional</span></>}>
                  <input id="heard_from" name="heard_from" type="text" maxLength={200} placeholder="a friend, school, instagram…" />
                </Field>
              </div>

              {error && <div className="form-error show" role="alert">✗ {error}</div>}

              <div className="submit-row">
                <button className="submit" type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Submit application →"}
                </button>
                <span className="submit-note">no account · no payment · just hit send</span>
              </div>

              <div className="statusbar" aria-hidden="true">
                <span className="sb-dot"></span><span>{submitting ? "writing…" : "ready"}</span>
                <span className="sep">·</span><span>main</span>
                <span className="sep">·</span><span>seats limited</span>
                <span className="sb-right">we read every one</span>
              </div>
            </form>
          </>
        )}
      </main>
    </>
  );
}

function Field({ n, id, label, labelNode, labelId, req, children }) {
  return (
    <div className="line">
      <span className="ln" aria-hidden="true">{n}</span>
      <div className="field">
        <label htmlFor={labelId ? undefined : id} id={labelId}>
          {labelNode || label}
          {req && <span className="req">*</span>}
        </label>
        {children}
      </div>
    </div>
  );
}

function Received({ payload, headingRef }) {
  const firstName = (payload.student_name || "you").split(/\s+/)[0];
  return (
    <div className="form-editor" role="status" aria-live="polite">
      <div className="editor-bar">
        <span className="dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span className="tab">application.py <span className="x" aria-hidden="true">×</span></span>
        <span className="editor-meta">~/future-coders ›&nbsp; saved</span>
      </div>
      <div className="received">
        <div className="ok" ref={headingRef} tabIndex={-1}>✓ application received</div>
        <div><span className="cmt"># seat request logged for </span><span className="val">{firstName}</span></div>
        <div className="cmt"># grade: <span className="val">{payload.grade}</span> · experience: <span className="val">{payload.experience}</span></div>
        <br />
        <div>We read every one. Expect a text at <span className="val">{payload.parent_phone}</span> within a few days.</div>
        <div className="cmt"># questions before then? call or text <a href="tel:+14256775903">(425) 677-5903</a></div>
      </div>
      <div className="statusbar" aria-hidden="true">
        <span className="sb-dot"></span><span>saved</span>
        <span className="sep">·</span><span>main</span>
        <span className="sep">·</span><span>see you Saturday</span>
        <span className="sb-right">first class — free</span>
      </div>
    </div>
  );
}
