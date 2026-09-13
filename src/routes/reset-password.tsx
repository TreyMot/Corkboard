import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FieldLabel } from "@/components/EditWine";
import { SiteFooter } from "@/components/SiteFooter";
import { InlineError } from "@/components/WineBits";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Choose a new password | Corkboard" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

/**
 * Landing page for the emailed reset link. supabase-js reads the recovery token from the
 * URL and opens a short-lived session; this page only lets that session set a password.
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setState("ready");
    });
    // The link may already have been processed before this listener attached.
    supabase.auth.getSession().then(({ data }) => {
      setState((s) => (data.session ? "ready" : s === "checking" ? "expired" : s));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords don't match. Type the same one twice.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("That password couldn't be saved. Use at least 8 characters and try again.");
      return;
    }
    navigate({ to: "/feed", replace: true });
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
            Choose a new password
          </h1>

          {state === "checking" ? (
            <p className="text-muted-foreground" style={{ fontSize: 13 }} role="status">
              Checking your reset link.
            </p>
          ) : state === "expired" ? (
            <>
              <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.6 }}>
                This reset link has expired or was already used. Ask for a new one from the sign-in
                page.
              </p>
              <Link to="/" className="back-link" style={{ marginTop: 12, alignSelf: "flex-start" }}>
                Back to sign in
              </Link>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col" style={{ gap: 18, marginTop: 24 }}>
              <div>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <input
                  id="new-password"
                  className="field"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="m-0 text-muted-foreground" style={{ fontSize: 11, marginTop: 6 }}>
                  At least 8 characters.
                </p>
              </div>
              <div>
                <FieldLabel htmlFor="confirm-password">Type it again</FieldLabel>
                <input
                  id="confirm-password"
                  className="field"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {error ? <InlineError>{error}</InlineError> : null}
              <button
                type="submit"
                disabled={busy}
                className="btn-gold"
                style={{ fontSize: 11, background: "rgba(201,169,97,.12)" }}
              >
                {busy ? "Saving" : "Save new password"}
              </button>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
