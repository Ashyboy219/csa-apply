// The passion_project.py editor from the original flyer — a real student
// project shipped in week 7 — plus a small build log underneath.
export default function CodeWindow() {
  return (
    <div className="col-visual">
      <div className="editor">
        <div className="editor-bar">
          <span className="dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span className="tab">passion_project.py <span className="x" aria-hidden="true">×</span></span>
          <span className="editor-meta">~/future-coders ›&nbsp; UTF-8</span>
        </div>
        <div className="code">
          <div className="row"><span className="gut">1</span><span><span className="cm"># passion_project.py — shipped in week 7</span></span></div>
          <div className="row"><span className="gut">2</span><span><span className="kw">from</span> studio <span className="kw">import</span> Agent, ship</span></div>
          <div className="row"><span className="gut">3</span><span>idea = <span className="str">"an app that quizzes my class on anything"</span></span></div>
          <div className="row"><span className="gut">4</span><span>app = <span className="fn">Agent</span>(idea).<span className="fn">build</span>()   <span className="cm"># describe it → AI writes the code</span></span></div>
          <div className="row"><span className="gut">5</span><span><span className="fn">ship</span>(app)                <span className="cm"># live, shareable, and entirely theirs</span></span></div>
          <div className="row"><span className="gut">6</span><span><span className="cm"># reviewed by a founder who ships real AI </span><span className="ok">✓</span></span></div>
        </div>
        <div className="statusbar" aria-hidden="true">
          <span className="sb-dot"></span><span>shipped</span>
          <span className="sep">·</span><span>main</span>
          <span className="sep">·</span><span>Python</span>
          <span className="sep">·</span><span>built by a 7th grader</span>
          <span className="sb-right">Ln 9, Col 41</span>
        </div>
      </div>

      <div className="buildlog" aria-hidden="true">
        <div className="ll"><span className="c">✓</span><span>idea → working app in one Saturday</span></div>
        <div className="ll"><span className="c">✓</span><span>deployed to the web · shareable link</span></div>
        <div className="ll"><span className="c">✓</span><span>entirely theirs — understood end to end</span></div>
      </div>
    </div>
  );
}
