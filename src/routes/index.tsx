import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FieldLabel } from "@/components/EditWine";
import { SiteFooter } from "@/components/SiteFooter";
import { InlineError } from "@/components/WineBits";
import { supabase } from "@/integrations/supabase/client";
import { joinWithInvite } from "@/lib/join.functions";
import { ensureDemoMember } from "@/lib/demo.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Corkboard: a private wine journal" },
      {
        name: "description",
        content:
          "Corkboard is an invite-only journal for a small circle of wine drinkers: log the bottles you've had, rate them, and read what people you know thought.",
      },
      { property: "og:title", content: "Corkboard: a private wine journal" },
      {
        property: "og:description",
        content:
          "An invite-only wine journal for a small circle. Log bottles, rate them, keep a list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    const code = typeof search["code"] === "string" ? search["code"] : undefined;
    return (code ? { code } : {}) as { code?: string };
  },
  component: JoinPage,
});

type Mode = "signin" | "join" | "forgot";

const TITLES: Record<Mode, string> = {
  signin: "Sign in",
  join: "Join",
  forgot: "Send reset link",
};

function JoinPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/" });
  const join = useServerFn(joinWithInvite);
  const enterPreview = useServerFn(ensureDemoMember);
  const [mode, setMode] = useState<Mode>(search.code ? "join" : "signin");
  const [code, setCode] = useState(search.code ?? "");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed", replace: true });
    });
  }, [navigate]);

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "forgot") {
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        // Same answer either way, so the form never reveals who is a member.
        setNotice(
          "If that email belongs to a member, a reset link is on its way. Check your inbox.",
        );
        return;
      }
      if (mode === "join") {
        if (!ageConfirmed) {
          setError("Corkboard is for adults 21 and over. Tick the box to confirm.");
          return;
        }
        const result = await join({
          data: { code, email, password, displayName, ageConfirmed: true },
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(mode === "signin" ? "That email and password don't match." : signInError.message);
        return;
      }
      // A right password on an account with no profile (say, one added in the Supabase
      // dashboard) isn't membership yet: send it to Join rather than bouncing off the guard.
      const { data: profile } = await supabase
        .from("profile")
        .select("id")
        .eq("id", signedIn.user.id)
        .maybeSingle();
      if (!profile) {
        await supabase.auth.signOut();
        setMode("join");
        setNotice(
          "That account isn't set up as a member yet. Finish joining here with the same email and password.",
        );
        return;
      }
      navigate({ to: "/feed", replace: true });
    } catch {
      setError("That didn't go through. Try again?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      <main>
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
          <p
            className="font-display uppercase text-gold"
            style={{ fontSize: 19, letterSpacing: "0.16em" }}
          >
            Corkboard
          </p>
          <h1 className="screen-heading" style={{ margin: "22px 0 8px" }}>
            A private journal for the bottles a small circle has actually opened.
          </h1>
          <p className="m-0 text-muted-foreground" style={{ fontSize: 13 }}>
            By invitation only.
          </p>

          <form onSubmit={submit} className="flex flex-col" style={{ gap: 18, marginTop: 36 }}>
            {mode === "join" ? (
              <>
                <div>
                  <FieldLabel htmlFor="code">Invite code</FieldLabel>
                  <input
                    id="code"
                    className="field"
                    style={{ letterSpacing: "0.2em" }}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    autoCapitalize="characters"
                    autoComplete="off"
                    aria-describedby="code-hint"
                  />
                  <p
                    id="code-hint"
                    className="m-0 text-muted-foreground"
                    style={{ fontSize: 11, marginTop: 6 }}
                  >
                    Leave blank if your email was added in advance.
                  </p>
                </div>
                <div>
                  <FieldLabel htmlFor="display_name">Your name</FieldLabel>
                  <input
                    id="display_name"
                    className="field"
                    required
                    maxLength={60}
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </>
            ) : null}

            <div>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <input
                id="email"
                className="field"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== "forgot" ? (
              <div>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <input
                  id="password"
                  className="field"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "join" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {mode === "join" ? (
                  <p className="m-0 text-muted-foreground" style={{ fontSize: 11, marginTop: 6 }}>
                    At least 8 characters.
                  </p>
                ) : null}
              </div>
            ) : null}

            {mode === "join" ? (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <label
                  className="flex cursor-pointer items-start text-ink"
                  style={{ gap: 10, fontSize: 13, lineHeight: 1.5 }}
                >
                  <input
                    type="checkbox"
                    required
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 1,
                      accentColor: "var(--color-gold)",
                    }}
                  />
                  I am 21 or older.
                </label>
                <p className="m-0 text-muted-foreground" style={{ fontSize: 11, lineHeight: 1.6 }}>
                  By joining you agree to the{" "}
                  <Link to="/terms" className="underline underline-offset-4">
                    terms
                  </Link>{" "}
                  and the{" "}
                  <Link to="/privacy" className="underline underline-offset-4">
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            {error ? <InlineError>{error}</InlineError> : null}
            {notice ? (
              <p role="status" className="m-0 text-ink" style={{ fontSize: 13, lineHeight: 1.6 }}>
                {notice}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="btn-gold"
              style={{ fontSize: 11, background: "rgba(201,169,97,.12)" }}
            >
              {busy ? "One moment" : TITLES[mode]}
            </button>
          </form>

          <div className="flex flex-col items-start" style={{ gap: 4, marginTop: 22 }}>
            {mode === "signin" ? (
              <button
                type="button"
                onClick={() => switchTo("forgot")}
                className="back-link"
                style={{ border: 0 }}
              >
                Forgot your password?
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => switchTo(mode === "signin" ? "join" : "signin")}
              className="back-link"
              style={{ border: 0 }}
            >
              {mode === "signin" ? "Have an invite code? Join" : "Back to sign in"}
            </button>
          </div>

          {import.meta.env.DEV ? (
            <div className="border-t border-border" style={{ marginTop: 40, paddingTop: 22 }}>
              <p className="caps m-0">Preview only</p>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const result = await enterPreview({});
                    if (!result.ok) {
                      setError("Preview access isn't available.");
                      return;
                    }
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                      email: result.email,
                      password: result.password,
                    });
                    if (signInError) {
                      setError("Preview access isn't available.");
                      return;
                    }
                    navigate({ to: "/feed", replace: true });
                  } catch {
                    setError("Preview access isn't available.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="btn-quiet"
                style={{ marginTop: 10 }}
              >
                Skip login and enter as Preview
              </button>
              <p className="m-0 text-muted-foreground" style={{ fontSize: 11, marginTop: 8 }}>
                This shortcut only exists while you're building; it disappears from the published
                site.
              </p>
            </div>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
