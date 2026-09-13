import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, BackToGrid, ErrorNote } from "@/components/AppShell";
import { EditWine } from "@/components/EditWine";
import { Stars } from "@/components/Stars";
import { ColourMark, IdentityNote, SkeletonRows } from "@/components/WineBits";
import { wineTitle } from "@/components/WineTile";
import {
  addToWishlist,
  formatDate,
  formatFormat,
  getWine,
  getWineRatings,
  glassOf,
  isOnWishlist,
  memberLabel,
} from "@/lib/rim";

export const Route = createFileRoute("/_authenticated/wine/$wineId")({
  head: () => ({
    meta: [
      { title: "Wine | Corkboard" },
      {
        name: "description",
        content: "One wine, its vintages, and what the circle thought of each.",
      },
      { property: "og:title", content: "Wine | Corkboard" },
      {
        property: "og:description",
        content: "Vintages of this wine and every member's note on them.",
      },
    ],
  }),
  component: WinePage,
});

function WinePage() {
  const { wineId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const wine = useQuery({ queryKey: ["wine", wineId], queryFn: () => getWine(wineId) });
  const ratings = useQuery({
    queryKey: ["wine-ratings", wineId],
    queryFn: () => getWineRatings(wineId),
  });
  const wish = useQuery({
    queryKey: ["wish", user.id, wineId],
    queryFn: () => isOnWishlist(user.id, wineId),
  });

  if (wine.isLoading) {
    return (
      <AppShell>
        <SkeletonRows count={3} />
      </AppShell>
    );
  }
  if (wine.isError || !wine.data) {
    return (
      <AppShell>
        <ErrorNote message="That wine couldn't be found." onRetry={() => wine.refetch()} />
      </AppShell>
    );
  }

  const w = wine.data;
  const byVintage = new Map<
    string,
    typeof ratings.data extends undefined ? never : NonNullable<typeof ratings.data>
  >();
  for (const r of ratings.data ?? []) {
    const key = `${r.bottling.vintage ?? "NV"}·${r.bottling.format_ml}`;
    const list = byVintage.get(key) ?? [];
    list.push(r);
    byVintage.set(key, list);
  }

  return (
    <AppShell>
      <div style={{ paddingTop: 20 }}>
        <BackToGrid />
      </div>
      <div
        className="uppercase text-gold"
        style={{ fontSize: 9.5, letterSpacing: "0.22em", marginTop: 22 }}
      >
        {[w.region, w.country].filter(Boolean).join(", ") || "\u00a0"}
      </div>
      <h1
        className="font-display text-pretty text-foreground"
        style={{ fontWeight: 400, fontSize: 52, lineHeight: 1.02, margin: "8px 0 6px" }}
      >
        {wineTitle(w)}
      </h1>
      {w.cuvee ? (
        <div className="font-display italic" style={{ fontSize: 19, color: "#b9ae9d" }}>
          {w.producer}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center" style={{ gap: 14, margin: "14px 0 22px" }}>
        <ColourMark colour={w.colour} />
        <span className="inline-flex items-center text-xs text-muted-foreground" style={{ gap: 7 }}>
          <span aria-hidden style={{ width: 16, height: 3, background: glassOf(w).hex }} />
          {glassOf(w).label}
        </span>
        <IdentityNote wine={w} />
      </div>

      <div className="flex flex-wrap" style={{ gap: 10 }}>
        <Link
          to="/add"
          search={{ wine: w.id }}
          className="btn-gold"
          style={{ background: "rgba(201,169,97,.12)" }}
        >
          Log this wine
        </Link>
        <button
          onClick={async () => {
            try {
              await addToWishlist(user.id, w.id);
              await queryClient.invalidateQueries({ queryKey: ["wish"] });
              await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
              toast("On the wishlist.");
            } catch {
              toast("That didn't go through. Try again?");
            }
          }}
          disabled={!!wish.data}
          className="btn-gold"
          style={{ background: wish.data ? "rgba(201,169,97,.18)" : undefined }}
        >
          {wish.data ? "On the wishlist" : "Add to wishlist"}
        </button>
        <button onClick={() => setEditing((v) => !v)} className="btn-quiet">
          {editing ? "Cancel edit" : "Edit bottle"}
        </button>
      </div>

      {editing ? <EditWine wine={w} userId={user.id} onDone={() => setEditing(false)} /> : null}

      <h2 className="caps mt-10" style={{ fontWeight: 400 }}>
        Vintages
      </h2>
      <div className="mt-3 space-y-6">
        {ratings.isLoading ? <SkeletonRows count={2} /> : null}
        {ratings.data && ratings.data.length === 0 ? (
          <p className="text-muted-foreground">No one has logged this yet.</p>
        ) : null}
        {[...byVintage.entries()].map(([key, rows]) => {
          const first = rows[0]!;
          return (
            <section
              key={key}
              className="border border-border bg-card p-5"
              style={{ borderRadius: 3 }}
            >
              <h3 className="text-[10px] tracking-[0.18em] text-eyebrow uppercase">
                {first.bottling.vintage ?? "Non-vintage"} · {formatFormat(first.bottling.format_ml)}
              </h3>
              <ul className="mt-3 space-y-4">
                {rows.map((r) => (
                  <li key={r.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                    <p className="text-xs tracking-wider text-muted-foreground uppercase">
                      <Link
                        to="/member/$userId"
                        params={{ userId: r.user_id }}
                        className="underline underline-offset-4"
                      >
                        {memberLabel(r.profile.display_name)}
                      </Link>{" "}
                      · {formatDate(r.drunk_on)}
                    </p>
                    <div className="mt-1">
                      <Stars value={r.stars} />
                    </div>
                    {r.note ? (
                      <p className="mt-2 leading-relaxed text-foreground/90">{r.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
