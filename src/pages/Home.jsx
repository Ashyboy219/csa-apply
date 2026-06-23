import { Link } from "react-router-dom";
import { content } from "../lib/content.js";
import TopNav from "../components/TopNav.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import CodeWindow from "../components/CodeWindow.jsx";
import GlitchBackground from "../components/GlitchBackground.jsx";
import Reveal from "../components/Reveal.jsx";
import StatNumber from "../components/StatNumber.jsx";

const html = (s) => ({ dangerouslySetInnerHTML: { __html: s } });

function TerminalCard({ title, meta, lines }) {
  return (
    <div className="col-visual">
      <div className="editor">
        <div className="editor-bar">
          <span className="dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span className="tab">{title}</span>
          {meta && <span className="editor-meta">{meta}</span>}
        </div>
        <div className="code">
          {lines.map((l, i) => (
            <div className="row" key={i}>
              <span className="gut">{String(i + 1).padStart(2, "0")}</span>
              <span>
                {l.ok && <span className="ok">✓ </span>}
                <span className={l.cm ? "cm" : ""}>{l.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- per-kind section renderers --------------------------------------- */

function Statement({ s }) {
  return (
    <div className="wrap statement">
      <Reveal>
        <p className="eyebrow">{s.eyebrow}</p>
        <h2 className="h2" {...html(s.heading_html)} />
        <p className="lead">{s.body}</p>
        {s.microcopy && <p className="microline">{s.microcopy}</p>}
      </Reveal>
    </div>
  );
}

function Split({ s, reverse, visual }) {
  return (
    <div className="wrap">
      <Reveal>
        <div className={`split${reverse ? " reverse" : ""}`}>
          <div>
            <p className="eyebrow">{s.eyebrow}</p>
            <h2 className="h2" {...html(s.heading_html)} />
            <p className="lead">{s.body}</p>
            {s.microcopy && <p className="microline">{s.microcopy}</p>}
          </div>
          {visual}
        </div>
      </Reveal>
    </div>
  );
}

function ClaudeMax({ s }) {
  return (
    <div className="wrap">
      <Reveal>
        <div className="maxband">
          <div>
            <p className="eyebrow">{s.eyebrow}</p>
            <h2 className="h2" {...html(s.heading_html)} />
            <p className="lead">{s.body}</p>
            <p className="microline">{s.microcopy}</p>
          </div>
          <div className="priceflip" aria-hidden="true">
            <span className="was">$200/mo</span>
            <span className="now">$0<small>included</small></span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function Curriculum({ s }) {
  return (
    <div className="wrap">
      <Reveal>
        <p className="eyebrow">{s.eyebrow}</p>
        <h2 className="h2" {...html(s.heading_html)} />
        <p className="lead">{s.body}</p>
      </Reveal>
      <Reveal delay={80}>
        <div className="weeks-grid">
          {s.weeks.map((w) => (
            <div className={`wk${w.last ? " last" : ""}`} key={w.n}>
              <div className="wn">{w.n}</div>
              <div className="wt">{w.t}</div>
              <div className="wd">{w.d}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function Payoff({ s }) {
  return (
    <div className="wrap">
      <Reveal>
        <p className="eyebrow">{s.eyebrow}</p>
        <h2 className="h2" {...html(s.heading_html)} />
        <p className="lead">{s.body}</p>
      </Reveal>
      <Reveal delay={80}>
        <div className="versus">
          <div className="vcard">
            <div className="vk">// the kid who waits</div>
            <div className="vt">Used AI</div>
            <p>Typed questions into a chatbot, copied the answers, a little bored by it. Blends in with everyone else who did the same.</p>
          </div>
          <div className="vcard win">
            <div className="vk">// the kid who starts now</div>
            <div className="vt">Built with AI</div>
            <p>Walks into the school year with a finished project they can explain to anyone — a teacher, an admissions reader, a room full of adults.</p>
          </div>
        </div>
      </Reveal>
      {s.microcopy && (
        <Reveal>
          <p className="microline" style={{ textAlign: "center", marginTop: 28 }}>{s.microcopy}</p>
        </Reveal>
      )}
    </div>
  );
}

function Instructors({ s }) {
  return (
    <div className="wrap">
      <Reveal>
        <p className="eyebrow">{s.eyebrow}</p>
        <h2 className="h2" {...html(s.heading_html)} />
      </Reveal>
      <Reveal delay={60}>
        <div className="teachers" style={{ marginTop: 28 }}>
          {s.teachers.map((t) => (
            <div className="teacher" key={t.initials}>
              <span className="av" aria-hidden="true">{t.initials}</span>
              <div>
                <div className="nm">{t.name}</div>
                <div className="ro">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="lead">{s.body}</p>
        <p className="microline">{s.microcopy}</p>
        <p className="sources">
          {s.sources.map((src, i) => (
            <span key={src.href}>
              {i > 0 && <span className="sep">·</span>}
              <a href={src.href} target="_blank" rel="noopener noreferrer">{src.label}</a>
            </span>
          ))}
        </p>
      </Reveal>
    </div>
  );
}

function Specs({ s }) {
  return (
    <div className="wrap">
      <Reveal>
        <p className="eyebrow">{s.eyebrow}</p>
        <h2 className="h2" {...html(s.heading_html)} />
        <p className="lead">{s.body}</p>
      </Reveal>
      <Reveal delay={80}>
        <div className="specs-grid">
          {s.specs.map((sp) => (
            <div className="spec" key={sp.k}>
              <div className="k">{sp.k}</div>
              <div className="v">{sp.v}</div>
              <div className="s">{sp.s}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function Fomo({ s }) {
  return (
    <div className="wrap">
      <Reveal>
        <div className="fomo-band">
          <p className="eyebrow">{s.eyebrow}</p>
          <h2 className="h2" {...html(s.heading_html)} style={{ maxWidth: "26ch" }} />
          <p className="lead" style={{ maxWidth: "70ch" }}>{s.body}</p>
          <p className="microline">{s.microcopy}</p>
        </div>
      </Reveal>
    </div>
  );
}

function renderSection(s) {
  switch (s.kind) {
    case "window-quote":
      return <Statement s={s} />;
    case "accelerator":
      return (
        <Split
          s={s}
          visual={
            <TerminalCard
              title="cohort.log"
              meta="10 weeks → demo day"
              lines={[
                { text: "spark    → a kid with an idea", cm: true },
                { text: "tools    → the real AI, included" },
                { text: "deadline → ship by week 10" },
                { text: "demo day → they present what they built", ok: true },
              ]}
            />
          }
        />
      );
    case "build":
      return (
        <Split
          s={s}
          reverse
          visual={
            <TerminalCard
              title="students_have_shipped.txt"
              meta="real projects"
              lines={[
                { text: "a quiz bot for my whole class", ok: true },
                { text: "an app that sorts my trading cards", ok: true },
                { text: "a chatbot for the game I love", ok: true },
                { text: "...whatever lights them up", cm: true },
              ]}
            />
          }
        />
      );
    case "claude-max":
      return <ClaudeMax s={s} />;
    case "curriculum":
      return <Curriculum s={s} />;
    case "payoff":
      return <Payoff s={s} />;
    case "instructors":
      return <Instructors s={s} />;
    case "specs":
      return <Specs s={s} />;
    case "fomo":
      return <Fomo s={s} />;
    default:
      return <Statement s={s} />;
  }
}

export default function Home() {
  const { hero, stats, sections, cta_band } = content;
  return (
    <>
      <TopNav />

      <main id="main">
      {/* HERO */}
      <section className="hero">
        <GlitchBackground variant="hero" />
        <div className="wrap hero-inner">
          <div>
            <span className="badge"><span className="diamond" aria-hidden="true"></span> 1st place · TiE Global Pitch Competition</span>
            <p className="hero-eyebrow">{hero.eyebrow}</p>
            <h1 {...html(hero.headline_html)} />
            <p className="subhead">{hero.subhead}</p>
            <div className="hero-ctas">
              <Link className="btn" to={hero.primary_cta.target}>{hero.primary_cta.label} →</Link>
              <a className="btn-ghost" href={hero.secondary_cta.target}>{hero.secondary_cta.label}</a>
            </div>
            <p className="urgency"><span className="dot" aria-hidden="true"></span>{hero.urgency_microcopy}</p>
          </div>
          <CodeWindow />
        </div>
      </section>

      {/* STATS */}
      <div className="wrap">
        <div className="stats">
          {stats.map((st, i) => {
            const accent = i === 1 || i === 2;
            return (
              <div className="stat" key={st.label}>
                <div className={`num${accent ? " accent" : ""}`}>
                  <StatNumber to={st.value} prefix={st.prefix || ""} suffix={st.suffix || ""} />
                </div>
                <div className="lab">{st.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTIONS */}
      {sections.map((s) => (
        <section className="section" id={s.id} key={s.id}>
          {renderSection(s)}
        </section>
      ))}

      {/* FINAL CTA */}
      <section className="section cta">
        <GlitchBackground variant="cta" />
        <div className="wrap">
          <Reveal>
            <div className="cta-inner">
              <h2 {...html(cta_band.headline_html)} />
              <p className="subhead">{cta_band.subhead}</p>
              <div className="cta-actions">
                <Link className="btn" to={cta_band.primary_cta.target}>{cta_band.primary_cta.label} →</Link>
                <a className="cta-phone" href="tel:+14256775903">{cta_band.phone}</a>
              </div>
              <p className="cta-urgency">{cta_band.urgency}</p>
            </div>
          </Reveal>
        </div>
      </section>
      </main>

      <SiteFooter />
    </>
  );
}
