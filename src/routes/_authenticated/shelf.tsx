import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, BackToGrid, ErrorNote, useSignOut } from "@/components/AppShell";
import { InlineError } from "@/components/WineBits";
import { wineTitle } from "@/components/WineTile";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { avatarJpeg } from "@/lib/photos";
import {
  avatarUrl,
  countMembers,
  createInvite,
  getMemberRatings,
  getMyInvites,
  getProfile,
  getRackTotal,
  getWishlist,
  COLOURS,
  glassOf,
  initials,
  memberLabel,
} from "@/lib/rim";

export const Route = createFileRoute("/_authenticated/shelf")({
  head: () => ({
    meta: [
      { title: "Your profile | Corkboard" },
      { name: "description", content: "What you pour, your highest marks, and your invite codes." },
      { property: "og:title", content: "Your profile | Corkboard" },
      { property: "og:description", content: "What you pour and your highest marks." },
    ],
  }),
  component: ProfilePage,
});

const CAPS = { fontSize: 9.5, letterSpacing: "0.2em" } as const;

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const profile = useQuery({ queryKey: ["profile", user.id], queryFn: () => getProfile(user.id) });
  const rated = useQuery({
    queryKey: ["member-ratings", user.id],
    queryFn: () => getMemberRatings(user.id),
  });
  const wishlist = useQuery({
    queryKey: ["wishlist", user.id],
    queryFn: () => getWishlist(user.id),
  });
  const rack = useQuery({
    queryKey: ["rack-total", user.id],
    queryFn: () => getRackTotal(user.id),
  });
  const members = useQuery({ queryKey: ["member-count"], queryFn: countMembers });
  const avatar = useQuery({
    queryKey: ["avatar", profile.data?.avatar_url],
    queryFn: () => avatarUrl(profile.data?.avatar_url ?? null),
    enabled: !!profile.data?.avatar_url,
  });

  const rows = rated.data ?? [];
  const name = memberLabel(profile.data?.display_name);
  // Unopened bottles have no mark yet: they count in the cellar, not in the average.
  const tasted = rows.filter((r): r is typeof r & { stars: number } => r.stars != null);
  const average = tasted.length ? tasted.reduce((n, r) => n + r.stars, 0) / tasted.length : 0;
  const counts = COLOURS.map((c) => ({
    value: c.value,
    label: c.label,
    hex: glassOf({ colour: c.value }).hex,
    count: rows.filter((r) => r.wine.colour === c.value).length,
  }));
  const peak = Math.max(1, ...counts.map((c) => c.count));
  const top = [...tasted].sort((a, b) => b.stars - a.stars).slice(0, 5);
  const since = profile.data
    ? new Date(profile.data.joined_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;
  const others = members.data ? members.data - 1 : null;

  const stats = [
    { value: rows.length, label: "In your cellar" },
    { value: wishlist.data?.length ?? 0, label: "On the wishlist" },
    { value: average > 0 ? average.toFixed(1) : "–", label: "Average mark" },
    { value: rack.data ?? 0, label: "Bottles in the rack" },
  ];

  return (
    <AppShell>
      <div style={{ paddingTop: 20 }}>
        <BackToGrid />

        {profile.isError || rated.isError ? (
          <div style={{ marginTop: 22 }}>
            <ErrorNote onRetry={() => void Promise.all([profile.refetch(), rated.refetch()])} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-end" style={{ gap: 18, paddingTop: 22 }}>
          <div
            className="grid shrink-0 place-items-center overflow-hidden border font-display text-gold"
            style={{
              width: 74,
              height: 74,
              borderColor: "rgba(201,169,97,.5)",
              borderRadius: 3,
              fontSize: 26,
              letterSpacing: "0.1em",
            }}
          >
            {avatar.data ? (
              <img src={avatar.data} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(name || "?")
            )}
          </div>
          <div>
            <h1
              className="font-display text-foreground"
              style={{ fontWeight: 400, fontSize: 42, lineHeight: 1.04, margin: "0 0 4px" }}
            >
              {name || " "}
            </h1>
            <div
              className="uppercase text-eyebrow"
              style={{ fontSize: 10, letterSpacing: "0.18em" }}
            >
              {since ? `Member since ${since}` : " "}
              {others != null
                ? ` · ${others} ${others === 1 ? "other" : "others"} in the circle`
                : ""}
            </div>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 1,
            background: "var(--color-border)",
            marginTop: 30,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col bg-background"
              style={{ padding: "18px 16px", gap: 6 }}
            >
              <div
                className="font-display text-foreground tabular-nums"
                style={{ fontSize: 36, lineHeight: 1 }}
              >
                {s.value}
              </div>
              <div
                className="uppercase text-eyebrow"
                style={{ fontSize: 9.5, letterSpacing: "0.18em" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div
          className="grid items-start"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 38,
            paddingTop: 38,
          }}
        >
          <section>
            <h2
              className="uppercase text-eyebrow"
              style={{ ...CAPS, marginBottom: 16, fontWeight: 400 }}
            >
              What you pour
            </h2>
            <div className="flex flex-col" style={{ gap: 11 }}>
              {counts.map((c) => (
                <div key={c.value} className="flex items-center" style={{ gap: 12 }}>
                  <div
                    className="uppercase text-muted-foreground"
                    style={{ flex: "0 0 76px", fontSize: 10, letterSpacing: "0.12em" }}
                  >
                    {c.label}
                  </div>
                  <div
                    className="flex-1"
                    style={{ height: 8, background: "rgba(233,222,200,.08)" }}
                  >
                    <div
                      style={{
                        height: 8,
                        width: `${Math.round((c.count / peak) * 100)}%`,
                        background: c.hex,
                        transition: "width 200ms ease-out",
                      }}
                    />
                  </div>
                  <div
                    className="text-right tabular-nums"
                    style={{ flex: "0 0 22px", fontSize: 11, color: "#b9ae9d" }}
                  >
                    {c.count}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2
              className="uppercase text-eyebrow"
              style={{ ...CAPS, marginBottom: 16, fontWeight: 400 }}
            >
              Your highest marks
            </h2>
            {top.length === 0 ? (
              <p className="m-0 text-muted-foreground" style={{ fontSize: 13 }}>
                Nothing scored yet.
              </p>
            ) : (
              <div className="flex flex-col">
                {top.map((r) => (
                  <Link
                    key={r.id}
                    to="/entry/$entryType/$entryId"
                    params={{ entryType: "rating", entryId: r.id }}
                    className="flex items-baseline text-left transition-colors duration-[120ms] ease-out hover:bg-[rgba(201,169,97,.06)]"
                    style={{
                      gap: 12,
                      padding: "13px 2px",
                      minHeight: 44,
                      borderBottom: "1px solid rgba(233,222,200,.1)",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        flex: "0 0 auto",
                        width: 14,
                        height: 3,
                        background: glassOf(r.wine).hex,
                        transform: "translateY(-4px)",
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block font-display text-foreground"
                        style={{ fontSize: 18, lineHeight: 1.2 }}
                      >
                        {wineTitle(r.wine)}
                      </span>
                      {r.wine.cuvee ? (
                        <span
                          className="block uppercase text-eyebrow"
                          style={{ fontSize: 9.5, letterSpacing: "0.14em", marginTop: 3 }}
                        >
                          {r.wine.producer}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="font-display text-gold tabular-nums"
                      style={{ flex: "0 0 auto", fontSize: 19 }}
                    >
                      {r.stars.toFixed(1)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <Account userId={user.id} />
        <Invites userId={user.id} />
      </div>
    </AppShell>
  );
}

function Account({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const [uploading, setUploading] = useState(false);

  async function upload(picked: File) {
    setUploading(true);
    try {
      const jpeg = await avatarJpeg(picked);
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, jpeg, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { error: profileError } = await supabase
        .from("profile")
        .update({ avatar_url: path })
        .eq("id", userId);
      if (profileError) throw profileError;
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    } catch {
      toast("That didn't go through. Try again?");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="flex flex-wrap items-center border-t border-border"
      style={{ gap: 12, marginTop: 44, paddingTop: 20 }}
    >
      <label className="btn-gold">
        {uploading ? "Uploading" : "Change your photograph"}
        <input
          type="file"
          accept="image/*,.heic,.heif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      <button onClick={() => void signOut()} className="btn-quiet">
        Sign out
      </button>
      <DeleteAccount />
    </div>
  );
}

function DeleteAccount() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const remove = useServerFn(deleteMyAccount);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn-quiet ml-auto">
        Delete my account
      </button>
    );
  }
  return (
    <div
      role="group"
      aria-labelledby="delete-heading"
      className="w-full border border-border p-4"
      style={{ borderRadius: 3 }}
    >
      <p id="delete-heading" className="m-0 text-foreground" style={{ fontSize: 14 }}>
        Delete your account?
      </p>
      <p
        className="m-0 text-muted-foreground"
        style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6, maxWidth: "60ch" }}
      >
        This removes your profile, ratings, notes, private scores, wishlist, photographs and invite
        codes, and signs you out. It can't be undone. Wines you added stay in the circle's shared
        list.
      </p>
      {error ? <InlineError>{error}</InlineError> : null}
      <div className="flex flex-wrap" style={{ gap: 10, marginTop: 12 }}>
        <button
          disabled={busy}
          className="btn-gold"
          onClick={async () => {
            setBusy(true);
            setError(null);
            const result = await remove();
            if (!result.ok) {
              setBusy(false);
              setError(result.error);
              return;
            }
            queryClient.clear();
            await supabase.auth.signOut();
            navigate({ to: "/", replace: true });
          }}
        >
          {busy ? "Deleting" : "Yes, delete everything"}
        </button>
        <button className="btn-quiet" onClick={() => setConfirming(false)} disabled={busy}>
          Keep my account
        </button>
      </div>
    </div>
  );
}

function Invites({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const invites = useQuery({ queryKey: ["invites", userId], queryFn: () => getMyInvites(userId) });
  const [busy, setBusy] = useState(false);

  return (
    <section style={{ marginTop: 34 }}>
      <h2 className="uppercase text-eyebrow" style={{ ...CAPS, fontWeight: 400 }}>
        Invite a friend
      </h2>
      <p
        className="text-quiet"
        style={{ fontSize: 11, lineHeight: 1.6, margin: "8px 0 12px", maxWidth: "52ch" }}
      >
        Each code lets one person join the circle and lasts thirty days.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await createInvite(userId);
            await queryClient.invalidateQueries({ queryKey: ["invites", userId] });
          } catch {
            toast("That didn't go through. Try again?");
          } finally {
            setBusy(false);
          }
        }}
        className="btn-gold"
      >
        {busy ? "Creating" : "Generate a code"}
      </button>

      <ul className="flex flex-col" style={{ gap: 8, marginTop: 14, maxWidth: 620 }}>
        {(invites.data ?? []).map((invite) => {
          const link = `${typeof window === "undefined" ? "" : window.location.origin}/?code=${invite.code}`;
          return (
            <li key={invite.code} className="flex flex-wrap items-center" style={{ gap: 10 }}>
              <input
                readOnly
                value={link}
                aria-label="Invite link"
                className="field min-w-0 flex-1"
                style={{ fontSize: 12 }}
              />
              {invite.used_by ? (
                <span className="caps">Used</span>
              ) : (
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    toast("Link copied.");
                  }}
                  className="btn-quiet"
                >
                  Copy
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
