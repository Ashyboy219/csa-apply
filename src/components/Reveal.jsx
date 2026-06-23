import { useRef } from "react";
import { useInViewport } from "../lib/useInViewport.js";

// Subtle scroll-reveal: reveal-once, always ends visible.
export default function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const shown = useInViewport(ref);
  return (
    <div
      ref={ref}
      className={`reveal${shown ? " in" : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
