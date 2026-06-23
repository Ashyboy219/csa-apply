import LetterGlitch from "../reactbits/LetterGlitch.jsx";

// Subtle, green-tinted terminal-glitch field behind the hero and final CTA.
// Opacity + vignette + a gradient fade (in CSS) keep it quiet — texture, not noise.
export default function GlitchBackground({ variant = "hero" }) {
  const outer = variant === "cta" ? "cta-bg" : "hero-bg";
  return (
    <div className={outer} aria-hidden="true">
      <div className="glitch-host">
        <LetterGlitch
          glitchColors={["#0e2a18", "#1c5333", "#3fb950"]}
          glitchSpeed={64}
          outerVignette={true}
          centerVignette={false}
          smooth={true}
        />
      </div>
      <div className="fade" />
    </div>
  );
}
