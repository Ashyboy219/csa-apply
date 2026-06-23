import { Link } from "react-router-dom";
import { content } from "../lib/content.js";

export default function TopNav() {
  const { nav } = content;
  return (
    <header className="nav">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="wrap nav-inner">
        <Link className="brandwrap" to="/">
          <span className="dots green" aria-hidden="true"><i></i><i></i><i></i></span>
          <span className="brand">CODE SHARE ACADEMY</span>
          <span className="path">/ the-edge.md</span>
        </Link>
        <nav className="nav-links">
          {nav.links.map((l) => (
            <a key={l.target} href={l.target}>{l.label}</a>
          ))}
        </nav>
        <div className="nav-cta">
          <Link className="btn" to={nav.cta.target}>{nav.cta.label}</Link>
        </div>
      </div>
    </header>
  );
}
