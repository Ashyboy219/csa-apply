import { useEffect, useState } from "react";

// Reliable "has this scrolled into view" hook. Uses scroll/resize listeners +
// an initial check rather than IntersectionObserver (which some headless and
// embedded contexts don't fire). Fails OPEN: if viewport metrics are missing
// or motion is reduced, it reports in-view immediately so content is never
// left hidden.
export function useInViewport(ref, { margin = 0.85 } = {}) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setInView(true);
      return;
    }

    let done = false;
    const check = () => {
      if (done) return;
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      // Fail open: if we can't measure the viewport, just show.
      if (!vh) {
        done = true;
        setInView(true);
        cleanup();
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.top < vh * margin && r.bottom > 0) {
        done = true;
        setInView(true);
        cleanup();
      }
    };
    const onScroll = () => requestAnimationFrame(check);
    function cleanup() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check(); // catch above-the-fold elements on mount
    const settle = setTimeout(check, 500); // re-check once layout settles

    return () => {
      cleanup();
      clearTimeout(settle);
    };
  }, [ref, margin]);

  return inView;
}
