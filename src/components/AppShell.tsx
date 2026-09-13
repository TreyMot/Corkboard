import { Link, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, initials, memberLabel } from "@/lib/rim";

const GROUND = {
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(233,222,200,.035) 0 1px, transparent 1px 46px), radial-gradient(120% 70% at 50% 0%, rgba(201,169,97,.07), transparent 60%)",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const profile = useQuery({ queryKey: ["profile", user.id], queryFn: () => getProfile(user.id) });
  const onLog = path === "/add";
  const onProfile = path === "/shelf";

  return (
    <div
      className="relative min-h-screen bg-background text-ink"
      style={{ ...GROUND, paddingBottom: 64 }}
    >
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          // Move focus explicitly; the router swallows the plain hash jump.
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <div
        aria-hidden
        className="pointer-events-none fixed font-display italic select-none"
        style={{
          right: "-2vw",
          bottom: "-6vh",
          fontSize: "52vh",
          lineHeight: 0.72,
          color: "rgba(201,169,97,.045)",
          zIndex: 0,
        }}
      >
        C
      </div>

      <header
        className="sticky top-0 flex items-center justify-between gap-3 border-b border-border px-4 sm:px-5"
        style={{
          paddingTop: 14,
          paddingBottom: 14,
          borderTop: "2px solid var(--color-gold)",
          background: "rgba(20,16,13,.94)",
          zIndex: 5,
        }}
      >
        <div className="flex items-baseline" style={{ gap: 10 }}>
          <Link
            to="/feed"
            className="font-display text-[19px] tracking-[0.1em] uppercase sm:text-[23px] sm:tracking-[0.16em]"
            style={{ color: "var(--color-foreground)" }}
          >
            Corkboard
          </Link>
          <span
            className="hidden border uppercase text-eyebrow sm:inline"
            style={{
              fontSize: 9.5,
              letterSpacing: "0.2em",
              borderColor: "rgba(233,222,200,.2)",
              padding: "2px 6px",
              borderRadius: 3,
            }}
          >
            Invite only
          </span>
        </div>
        <nav className="flex items-center" style={{ gap: 8 }}>
          <Link
            to="/add"
            className="btn-gold whitespace-nowrap px-3 tracking-[0.1em] sm:px-[14px] sm:tracking-[0.14em]"
            style={{
              fontSize: 11,
              paddingTop: 9,
              paddingBottom: 9,
              background: onLog ? "rgba(201,169,97,.18)" : undefined,
            }}
          >
            Log a bottle
          </Link>
          <Link
            to="/shelf"
            aria-label="Your profile"
            className="grid place-items-center border transition-colors duration-[140ms] ease-out hover:border-gold"
            style={{
              width: 40,
              height: 40,
              borderRadius: 3,
              borderColor: onProfile ? "var(--color-gold)" : "rgba(233,222,200,.24)",
              background: onProfile ? "rgba(201,169,97,.14)" : "transparent",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "#b9ae9d",
            }}
          >
            {initials(memberLabel(profile.data?.display_name))}
          </Link>
        </nav>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="relative mx-auto outline-none"
        style={{ zIndex: 1, maxWidth: 1360, padding: "0 20px" }}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/** Screen heading in Cormorant, with an optional line of context under it. */
export function ScreenHeading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: 620 }}>
      <h1 className="screen-heading break-words" style={{ margin: "0 0 8px" }}>
        {children}
      </h1>
      {sub ? (
        <p
          className="m-0 text-muted-foreground"
          style={{ fontSize: 13, lineHeight: 1.65, maxWidth: "52ch" }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export function BackToGrid() {
  return (
    <Link to="/feed" className="back-link">
      <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>
        &#8592;
      </span>
      Back to the grid
    </Link>
  );
}

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
}

export function ErrorNote({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="border border-border bg-card p-5" style={{ borderRadius: 3 }}>
      <p className="text-destructive">{message ?? "That didn't go through. Try again?"}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="tap mt-2 text-sm text-muted-foreground underline underline-offset-4"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
