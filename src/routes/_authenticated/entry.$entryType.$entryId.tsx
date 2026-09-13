import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, BackToGrid, ErrorNote } from "@/components/AppShell";
import { EditWine, FieldLabel } from "@/components/EditWine";
import { EntryPhotos } from "@/components/EntryPhotos";
import { StarPicker, Stars, ratingLabel } from "@/components/Stars";
import { IdentityNote, SkeletonRows } from "@/components/WineBits";
import { TileFrame, vintageText, wineTitle } from "@/components/WineTile";
import {
  addToWishlist,
  colourInfo,
  formatDate,
  formatFormat,
  getBottlesOwned,
  getRatingById,
  getWishlistItem,
  glassOf,
  isOnWishlist,
  memberLabel,
  removeWishlistItem,
  setBottlesOwned,
  updateMyRating,
  type FeedRow,
  type WishlistEntry,
} from "@/lib/rim";
import type { EntryType } from "@/lib/photos";

export const Route = createFileRoute("/_authenticated/entry/$entryType/$entryId")({
  head: () => ({
    meta: [
      { title: "Bottle | Corkboard" },
      {
        name: "description",
        content: "One bottle from one member, with the photograph, rating and where it was poured.",
      },
      { property: "og:title", content: "Bottle | Corkboard" },
      { property: "og:description", content: "Photograph, rating and notes for a single bottle." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: ({ params }) => {
    if (params.entryType !== "rating" && params.entryType !== "wishlist") throw notFound();
  },
  component: EntryPage,
});

const RULE = "rgba(233,222,200,.14)";

function EntryPage() {
  const { entryType, entryId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const type = entryType as EntryType;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const entry = useQuery({
    queryKey: ["entry", type, entryId],
    queryFn: async (): Promise<FeedRow | WishlistEntry | null> =>
      type === "rating" ? getRatingById(entryId) : getWishlistItem(entryId),
  });
  const data = entry.data;
  const rating = data && type === "rating" ? (data as FeedRow) : null;
  const ownerId = rating ? rating.user_id : (data as WishlistEntry | null)?.user_id;
  const mine = ownerId === user.id;
  const wineId = data?.wine.id;

  const wish = useQuery({
    queryKey: ["wish", user.id, wineId],
    queryFn: () => isOnWishlist(user.id, wineId!),
    enabled: !!wineId,
  });
  const owned = useQuery({
    queryKey: ["bottles-owned", entryId],
    queryFn: () => getBottlesOwned(entryId),
    enabled: !!rating && mine,
  });

  const [place, setPlace] = useState("");
  useEffect(() => setPlace(rating?.place ?? ""), [rating?.place]);

  if (entry.isLoading) {
    return (
      <AppShell>
        <div style={{ paddingTop: 20 }}>
          <SkeletonRows count={3} />
        </div>
      </AppShell>
    );
  }
  if (entry.isError || !data) {
    return (
      <AppShell>
        <div style={{ paddingTop: 20 }}>
          <ErrorNote message="That bottle couldn't be found." onRetry={() => entry.refetch()} />
        </div>
      </AppShell>
    );
  }

  const wine = data.wine;
  const vintage = rating ? rating.bottling.vintage : undefined;
  const glass = glassOf(wine);
  const note = rating ? rating.note : (data as WishlistEntry).note;
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["entry", type, entryId] }),
      queryClient.invalidateQueries({ queryKey: ["member-ratings"] }),
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
      queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
      queryClient.invalidateQueries({ queryKey: ["wish"] }),
    ]);
  const failed = () => toast("That didn't go through. Try again?");

  async function rate(stars: number) {
    try {
      await updateMyRating(entryId, { stars });
      await refresh();
    } catch {
      failed();
    }
  }

  async function savePlace() {
    const next = place.trim() || null;
    if (next === (rating?.place ?? null)) return;
    try {
      await updateMyRating(entryId, { place: next });
      await refresh();
    } catch {
      failed();
    }
  }

  async function changeOwned(delta: number) {
    // Read the cache, not the render closure, so quick repeat taps each count.
    const next = Math.max(
      0,
      (queryClient.getQueryData<number>(["bottles-owned", entryId]) ?? 0) + delta,
    );
    queryClient.setQueryData(["bottles-owned", entryId], next);
    try {
      await setBottlesOwned(entryId, user.id, next);
    } catch {
      failed();
      await owned.refetch();
    }
  }

  async function toggleWish() {
    try {
      if (wish.data) {
        await removeWishlistItem(wish.data);
        await refresh();
        if (type === "wishlist") {
          toast("Off the wishlist.");
          navigate({ to: "/feed" });
        }
      } else {
        await addToWishlist(user.id, wine.id);
        await refresh();
        toast("On the wishlist.");
      }
    } catch {
      failed();
    }
  }

  const facts: { label: string; value: string; swatch?: string }[] = [
    { label: "Vineyard", value: wine.vineyard ?? "Not recorded" },
    { label: "Location", value: wine.location ?? "Not recorded" },
    {
      label: "Vintage",
      value:
        vintage === undefined
          ? "Any"
          : `${vintageText(vintage)}${rating && rating.bottling.format_ml !== 750 ? `, ${formatFormat(rating.bottling.format_ml)}` : ""}`,
    },
    { label: "Varietal", value: wine.varietal_raw ?? wine.varietal ?? "Not recorded" },
    { label: "Style", value: colourInfo(wine.colour).label },
    { label: "Color", value: glass.label, swatch: glass.hex },
    ...(rating
      ? [
          {
            label: "Poured",
            value: `${mine ? "By you" : `By ${memberLabel(rating.profile.display_name)}`}, ${formatDate(rating.drunk_on)}`,
          },
        ]
      : []),
  ];
  const ownedCount = owned.data ?? 0;

  return (
    <AppShell>
      <div style={{ paddingTop: 20 }}>
        <BackToGrid />

        <div
          className="grid items-start"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 38,
            paddingTop: 22,
          }}
        >
          <div className="flex flex-col" style={{ maxWidth: 400, gap: 14 }}>
            <EntryPhotos
              type={type}
              entryId={entryId}
              ownerId={ownerId!}
              canEdit={mine}
              fallback={<TileFrame wine={wine} vintage={vintage} wish={type === "wishlist"} />}
            />
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="uppercase text-gold" style={{ fontSize: 9.5, letterSpacing: "0.22em" }}>
              {[wine.region, wine.country].filter(Boolean).join(", ") || " "}
            </div>
            <h1
              className="font-display text-pretty text-foreground"
              style={{ fontWeight: 400, fontSize: 52, lineHeight: 1.02, margin: "8px 0 6px" }}
            >
              {wineTitle(wine)}
            </h1>
            {wine.cuvee ? (
              <div className="font-display italic" style={{ fontSize: 19, color: "#b9ae9d" }}>
                {wine.producer}
              </div>
            ) : null}

            <div style={{ height: 1, background: RULE, marginTop: 22 }} />
            {facts.map((f) => (
              <div
                key={f.label}
                className="flex items-baseline"
                style={{
                  gap: 16,
                  padding: "13px 0",
                  borderBottom: "1px solid rgba(233,222,200,.1)",
                }}
              >
                <div
                  className="uppercase text-eyebrow"
                  style={{ flex: "0 0 92px", fontSize: 9.5, letterSpacing: "0.18em" }}
                >
                  {f.label}
                </div>
                <div
                  className="flex min-w-0 flex-1 items-center tabular-nums"
                  style={{
                    gap: 9,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: f.value === "Not recorded" ? "var(--color-quiet)" : "var(--color-ink)",
                  }}
                >
                  {f.swatch ? (
                    <span
                      aria-hidden
                      style={{ width: 18, height: 3, flex: "0 0 auto", background: f.swatch }}
                    />
                  ) : null}
                  <span>{f.value}</span>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center" style={{ gap: 18, padding: "24px 0 4px" }}>
              {rating ? (
                <div className="flex flex-col" style={{ gap: 6 }}>
                  <div className="caps">
                    {mine ? "Your rating" : `${memberLabel(rating.profile.display_name)}'s rating`}
                  </div>
                  {mine ? (
                    <StarPicker value={rating.stars} onChange={(v) => void rate(v)} />
                  ) : (
                    <div className="flex items-center">
                      <Stars value={rating.stars} size={30} />
                      <span
                        className="font-display text-foreground tabular-nums"
                        style={{ fontSize: 26, marginLeft: 10 }}
                      >
                        {ratingLabel(rating.stars)}
                      </span>
                    </div>
                  )}
                </div>
              ) : mine ? (
                <Link
                  to="/add"
                  search={{ wine: wine.id, wishlist: entryId }}
                  className="btn-gold"
                  style={{ background: "rgba(201,169,97,.12)" }}
                >
                  I have had this now
                </Link>
              ) : null}

              <button
                onClick={() => void toggleWish()}
                disabled={wish.isLoading}
                className="btn-gold ml-auto self-end"
                style={{
                  padding: "12px 16px",
                  background: wish.data ? "rgba(201,169,97,.18)" : undefined,
                }}
              >
                {wish.data ? "On the wishlist" : "Add to wishlist"}
              </button>
            </div>

            {rating && (mine || rating.place) ? (
              <>
                <div style={{ height: 1, background: RULE, margin: "20px 0 18px" }} />
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: "20px 26px",
                  }}
                >
                  <div className="flex flex-col">
                    <FieldLabel htmlFor="place">
                      {mine ? "Where you drank it" : "Where it was poured"}
                    </FieldLabel>
                    {mine ? (
                      <input
                        id="place"
                        className="field"
                        style={{ fontSize: 13.5 }}
                        value={place}
                        maxLength={200}
                        placeholder="At the Kesslers, in the garden"
                        onChange={(e) => setPlace(e.target.value)}
                        onBlur={() => void savePlace()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                      />
                    ) : (
                      <p className="m-0 text-ink" style={{ fontSize: 14 }}>
                        {rating.place}
                      </p>
                    )}
                  </div>
                  {mine ? (
                    <div className="flex flex-col" style={{ gap: 8 }}>
                      <div className="caps">Bottles owned</div>
                      <div
                        className="flex items-stretch border"
                        style={{
                          borderColor: "rgba(233,222,200,.18)",
                          borderRadius: 3,
                          width: 150,
                        }}
                      >
                        <button
                          onClick={() => void changeOwned(-1)}
                          aria-label="One fewer bottle"
                          className="cursor-pointer border-0 bg-transparent text-gold transition-colors duration-[120ms] ease-out hover:bg-[rgba(201,169,97,.1)]"
                          style={{
                            width: 44,
                            minHeight: 44,
                            borderRight: "1px solid rgba(233,222,200,.12)",
                            fontSize: 16,
                            lineHeight: 1,
                          }}
                        >
                          &#8722;
                        </button>
                        <div
                          className="grid flex-1 place-items-center text-foreground tabular-nums"
                          style={{ fontSize: 15, letterSpacing: "0.04em" }}
                          aria-live="polite"
                        >
                          {ownedCount}
                        </div>
                        <button
                          onClick={() => void changeOwned(1)}
                          aria-label="One more bottle"
                          className="cursor-pointer border-0 bg-transparent text-gold transition-colors duration-[120ms] ease-out hover:bg-[rgba(201,169,97,.1)]"
                          style={{
                            width: 44,
                            minHeight: 44,
                            borderLeft: "1px solid rgba(233,222,200,.12)",
                            fontSize: 16,
                            lineHeight: 1,
                          }}
                        >
                          +
                        </button>
                      </div>
                      <div className="text-quiet" style={{ fontSize: 11 }}>
                        {ownedCount === 0
                          ? "None in the rack right now."
                          : ownedCount === 1
                            ? "One bottle in the rack."
                            : `${ownedCount} bottles in the rack.`}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {note ? (
              <>
                <div style={{ height: 1, background: RULE, margin: "22px 0 18px" }} />
                <div className="caps" style={{ marginBottom: 9 }}>
                  Note
                </div>
                <p
                  className="m-0 text-ink"
                  style={{ fontSize: 14, lineHeight: 1.7, maxWidth: "60ch" }}
                >
                  {note}
                </p>
              </>
            ) : null}

            <div
              className="flex flex-wrap items-center border-t border-border"
              style={{ gap: 14, marginTop: 26, paddingTop: 18 }}
            >
              {!editing ? (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="btn-gold"
                    style={{ padding: "0 18px" }}
                  >
                    Edit bottle
                  </button>
                  <span className="text-quiet" style={{ fontSize: 11, lineHeight: 1.6 }}>
                    Correct the vineyard, location, varietal or color in glass.
                  </span>
                </>
              ) : null}
              <Link
                to="/wine/$wineId"
                params={{ wineId: wine.id }}
                className="ml-auto text-muted-foreground underline underline-offset-4"
                style={{ fontSize: 12 }}
              >
                Every note on this wine
              </Link>
            </div>
            <div style={{ marginTop: 12 }}>
              <IdentityNote wine={wine} />
            </div>
            {editing ? (
              <EditWine wine={wine} userId={user.id} onDone={() => setEditing(false)} />
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
