import { content } from "../lib/content.js";

export default function SiteFooter() {
  const { footer } = content;
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>{footer.left}</span>
        <span>
          {footer.right} &nbsp;·&nbsp;{" "}
          <a href="tel:+14256775903">(425) 677-5903</a>
        </span>
      </div>
    </footer>
  );
}
