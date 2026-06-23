import { useRef, useEffect, useState } from "react";
import { useInViewport } from "../lib/useInViewport.js";

// Count-up that always ends on the right number. Animates when scrolled into
// view; a time-based fallback guarantees it runs (and lands on `to`) even if a
// scroll trigger never fires, so the stat is never stuck at 0.
export default function StatNumber({ to, duration = 1400, prefix = "", suffix = "" }) {
  const ref = useRef(null);
  const inView = useInViewport(ref, { margin: 0.95 });
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const rafRef = useRef(0);
  const finalRef = useRef(0);

  function animate() {
    if (started.current) return;
    started.current = true;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVal(to);
      return;
    }
    let start = 0;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(to * easeOutCubic(p)));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    // Guarantee the final value lands even where rAF is throttled (e.g. an
    // offscreen / background tab) — correctness never depends on rAF firing.
    finalRef.current = setTimeout(() => setVal(to), duration + 200);
  }

  useEffect(() => {
    if (inView) animate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  useEffect(() => {
    const t = setTimeout(animate, 1800);
    return () => {
      clearTimeout(t);
      clearTimeout(finalRef.current);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}
