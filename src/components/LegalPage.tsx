import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";

/** Shared layout for the policy pages, readable signed in or out. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-ink">
      <main className="mx-auto" style={{ maxWidth: 720, padding: "28px 20px 48px" }}>
        <Link
          to="/"
          className="font-display uppercase text-gold"
          style={{ fontSize: 19, letterSpacing: "0.16em" }}
        >
          Corkboard
        </Link>
        <h1 className="screen-heading" style={{ margin: "28px 0 6px" }}>
          {title}
        </h1>
        <p className="caps m-0">Last updated {updated}</p>
        <div className="legal">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
