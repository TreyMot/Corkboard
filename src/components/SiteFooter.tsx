import { Link } from "@tanstack/react-router";

export const CONTACT_EMAIL = "motsenbockertrey@gmail.com";

/** On every page: the policy pages, a human contact, and a year that never goes stale. */
export function SiteFooter() {
  return (
    <footer
      className="relative mx-auto flex flex-wrap items-center border-t border-border text-muted-foreground"
      style={{
        zIndex: 1,
        maxWidth: 1360,
        gap: "8px 18px",
        padding: "18px 20px 28px",
        fontSize: 11.5,
      }}
    >
      <span>&copy; {new Date().getFullYear()} Corkboard</span>
      <Link to="/privacy" className="underline underline-offset-4 hover:text-gold">
        Privacy
      </Link>
      <Link to="/terms" className="underline underline-offset-4 hover:text-gold">
        Terms
      </Link>
      <Link to="/accessibility" className="underline underline-offset-4 hover:text-gold">
        Accessibility
      </Link>
      <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4 hover:text-gold">
        Contact {CONTACT_EMAIL}
      </a>
    </footer>
  );
}
