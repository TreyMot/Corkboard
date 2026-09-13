import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, ErrorNote, ScreenHeading } from "@/components/AppShell";
import { GlassLegend, SkeletonTiles, TileGrid, WineTile } from "@/components/WineTile";
import {
  COLOURS,
  getFeed,
  getMemberRatings,
  getWishlist,
  glassOf,
  memberLabel,
  type FeedRow,
  type Wine,
} from "@/lib/rim";
import { getPrimaryThumbUrls } from "@/lib/photos";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Corkboard" },
      {
        name: "description",
        content: "Your cellar, your wishlist, and what the circle has opened lately.",
      },
      { property: "og:title", content: "Corkboard" },
      {
        property: "og:description",
        content: "Your cellar, your wishlist, and what the circle has opened lately.",
      },
    ],
  }),
  component: HomePage,
});

type Item = {
  key: string;
  type: "rating" | "wishlist";
  id: string;
  wine: Wine;
  vintage: number | null | undefined;
  /** The viewer's own mark. */
  stars: number;
  createdAt: string;
  place: string | null;
  pouredBy: string | null;
};

const TABS = [
  {
    label: "Cellar",
    headline: "What you have been drinking",
    sub: "Every bottle you have poured and scored. Open one to adjust the rating, add a photograph, or write the note you will want next year.",
  },
  {
    label: "Wishlist",
    headline: "Bottles you are hunting",
    sub: "Kept out of the cellar until a bottle actually lands. Open one to drop it from the list.",
  },
  {
    label: "Circle",
    headline: "Lately in your circle",
    sub: "Bottles opened across the circle, newest first. The marks stay yours: a wine carries no score here until you have poured it.",
  },
] as const;

const SORTS = ["Recent", "Rating", "Vintage"] as const;
const TAB_W = 118;

function HomePage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState(0);
  const [sort, setSort] = useState(0);
  const [q, setQ] = useState("");
  const [style, setStyle] = useState("All");
  const [country, setCountry] = useState("All");

  const mine = useQuery({
    queryKey: ["member-ratings", user.id],
    queryFn: () => getMemberRatings(user.id),
  });
  const wishlist = useQuery({
    queryKey: ["wishlist", user.id],
    queryFn: () => getWishlist(user.id),
  });
  const feed = useQuery({ queryKey: ["feed"], queryFn: getFeed });

  const ratingIds = [
    ...new Set([...(mine.data ?? []), ...(feed.data ?? [])].map((r) => r.id)),
  ].sort();
  const ratingThumbs = useQuery({
    queryKey: ["rating-thumbs", ratingIds.join(",")],
    queryFn: () => getPrimaryThumbUrls("rating", ratingIds),
    enabled: ratingIds.length > 0,
  });
  const wishIds = (wishlist.data ?? []).map((w) => w.id);
  const wishThumbs = useQuery({
    queryKey: ["wish-thumbs", wishIds.join(",")],
    queryFn: () => getPrimaryThumbUrls("wishlist", wishIds),
    enabled: wishIds.length > 0,
  });

  const lists = useMemo(() => {
    const myStars = new Map((mine.data ?? []).map((r) => [r.bottling.id, r.stars]));
    const fromRating = (r: FeedRow, stars: number): Item => ({
      key: `rating:${r.id}`,
      type: "rating",
      id: r.id,
      wine: r.wine,
      vintage: r.bottling.vintage,
      stars,
      createdAt: r.created_at,
      place: r.place,
      pouredBy: r.user_id === user.id ? "you" : memberLabel(r.profile.display_name),
    });
    const cellar = (mine.data ?? []).map((r) => fromRating(r, r.stars));
    const wish = (wishlist.data ?? []).map<Item>((w) => ({
      key: `wishlist:${w.id}`,
      type: "wishlist",
      id: w.id,
      wine: w.wine,
      vintage: undefined,
      stars: 0,
      createdAt: w.created_at,
      place: null,
      pouredBy: null,
    }));
    const circle = (feed.data ?? []).map((r) => fromRating(r, myStars.get(r.bottling.id) ?? 0));
    return [cellar, wish, circle];
  }, [mine.data, wishlist.data, feed.data, user.id]);

  const wishWines = new Set((wishlist.data ?? []).map((w) => w.wine.id));
  const everything = [...new Map(lists.flat().map((i) => [i.key, i])).values()];

  const term = q.trim().toLowerCase();
  const pool = term ? everything : lists[tab]!;
  const shown = pool.filter((i) => {
    if (style !== "All" && i.wine.colour !== style) return false;
    if (country !== "All" && i.wine.country !== country) return false;
    if (!term) return true;
    const w = i.wine;
    return [
      w.producer,
      w.cuvee,
      w.region,
      w.vineyard,
      w.location,
      w.varietal,
      w.varietal_raw,
      w.country,
      i.place,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
  if (sort === 0) shown.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === 1) shown.sort((a, b) => b.stars - a.stars);
  if (sort === 2) shown.sort((a, b) => (a.vintage ?? 99999) - (b.vintage ?? 99999));

  const thumbFor = (i: Item) =>
    (i.type === "rating" ? ratingThumbs.data?.get(i.id) : wishThumbs.data?.get(i.id)) ?? null;
  const noteFor = (i: Item) => {
    if (tab === 2 && i.pouredBy) return `Poured by ${i.pouredBy}`;
    if (i.stars > 0) return glassOf(i.wine).label;
    return i.type === "wishlist" || wishWines.has(i.wine.id) ? "Wishlist" : "Not yet rated";
  };

  const styles = COLOURS.filter((c) => everything.some((i) => i.wine.colour === c.value));
  const countries = [
    ...new Set(everything.map((i) => i.wine.country).filter((c): c is string => !!c)),
  ].sort();
  const filterGroups = [
    {
      label: "Style",
      value: style,
      set: setStyle,
      options: [{ value: "All", label: "All" }, ...styles],
    },
    ...(countries.length
      ? [
          {
            label: "Country",
            value: country,
            set: setCountry,
            options: ["All", ...countries].map((c) => ({ value: c, label: c })),
          },
        ]
      : []),
  ];
  const filtering = term !== "" || style !== "All" || country !== "All";
  const active = [mine, wishlist, feed][tab]!;
  const loading = term ? mine.isLoading || wishlist.isLoading || feed.isLoading : active.isLoading;

  return (
    <AppShell>
      <div
        className="flex flex-wrap items-end justify-between"
        style={{ gap: 20, padding: "28px 0 18px" }}
      >
        <ScreenHeading sub={TABS[tab]!.sub}>{TABS[tab]!.headline}</ScreenHeading>
        <div
          role="group"
          aria-label="Sort"
          className="flex overflow-hidden border"
          style={{ borderColor: "rgba(233,222,200,.18)", borderRadius: 3 }}
        >
          {SORTS.map((label, i) => (
            <button
              key={label}
              onClick={() => setSort(i)}
              aria-pressed={sort === i}
              className="cursor-pointer border-0 uppercase transition-colors duration-[120ms] ease-out"
              style={{
                fontSize: 10.5,
                letterSpacing: "0.13em",
                padding: "10px 13px",
                minHeight: 40,
                borderLeft: i ? "1px solid rgba(233,222,200,.12)" : 0,
                background: sort === i ? "rgba(201,169,97,.14)" : "transparent",
                color: sort === i ? "var(--color-gold)" : "var(--color-muted-foreground)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-border" style={{ marginBottom: 22 }}>
        <div role="tablist" className="relative flex">
          {TABS.map((t, i) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className="cursor-pointer border-0 bg-transparent uppercase transition-colors duration-[140ms] ease-out"
              style={{
                width: TAB_W,
                minHeight: 44,
                padding: "12px 0",
                fontSize: 11,
                letterSpacing: "0.15em",
                color: tab === i ? "var(--color-foreground)" : "var(--color-eyebrow)",
              }}
            >
              {t.label}
              <span
                className="block text-quiet tabular-nums"
                style={{ fontSize: 10, letterSpacing: "0.06em", marginTop: 3 }}
              >
                {lists[i]!.length}
              </span>
            </button>
          ))}
          <div
            aria-hidden
            className="absolute left-0 bg-gold"
            style={{
              bottom: -1,
              width: TAB_W,
              height: 1,
              transform: `translateX(${tab * TAB_W}px)`,
              transition: "transform 180ms cubic-bezier(.2,.7,.3,1)",
            }}
          />
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 14, paddingBottom: 22 }}>
        <div className="relative" style={{ maxWidth: 440 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search wine, producer, place, varietal"
            aria-label="Search wine, producer, place, varietal"
            className="w-full border-0 border-b bg-transparent font-display text-foreground outline-none transition-colors duration-[140ms] ease-out placeholder:text-quiet hover:border-[rgba(201,169,97,.5)] focus:border-gold"
            style={{
              minHeight: 44,
              borderColor: "var(--color-input)",
              padding: "11px 30px 11px 2px",
              fontSize: 19,
            }}
          />
          {q ? (
            <button
              onClick={() => setQ("")}
              aria-label="Clear the search"
              className="absolute top-0 right-0 cursor-pointer border-0 bg-transparent text-gold"
              style={{ height: 44, width: 28, fontSize: 15, lineHeight: 1 }}
            >
              &#215;
            </button>
          ) : null}
        </div>
        {term ? (
          <div className="text-eyebrow" style={{ fontSize: 11, letterSpacing: "0.04em" }}>
            {shown.length === 1 ? "One match" : `${shown.length} matches`} across your cellar, your
            wishlist and your circle.
          </div>
        ) : null}

        <div className="flex flex-wrap" style={{ gap: "18px 30px" }}>
          {filterGroups.map((g) => (
            <div key={g.label} className="flex min-w-0 flex-col" style={{ gap: 8 }}>
              <div className="caps text-quiet" style={{ fontSize: 9 }}>
                {g.label}
              </div>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {g.options.map((o) => (
                  <button
                    key={o.value}
                    className="chip"
                    data-on={g.value === o.value}
                    aria-pressed={g.value === o.value}
                    onClick={() => g.set(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? <SkeletonTiles count={8} /> : null}
      {!term && active.isError ? <ErrorNote onRetry={() => active.refetch()} /> : null}

      {!loading && shown.length === 0 ? (
        filtering ? (
          <div
            className="flex flex-col items-start border-t border-border"
            style={{ padding: "34px 0 10px", gap: 10 }}
          >
            <div className="font-display text-foreground italic" style={{ fontSize: 26 }}>
              Nothing in the rack matches.
            </div>
            <button
              className="btn-gold"
              onClick={() => {
                setQ("");
                setStyle("All");
                setCountry("All");
              }}
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <EmptyTab tab={tab} />
        )
      ) : null}

      {!loading && shown.length > 0 ? (
        <TileGrid>
          {shown.map((i) => (
            <WineTile
              key={i.key}
              wine={i.wine}
              vintage={i.vintage}
              stars={i.stars}
              note={noteFor(i)}
              photoUrl={thumbFor(i)}
              wish={i.type === "wishlist" || wishWines.has(i.wine.id)}
              entry={{ type: i.type, id: i.id }}
            />
          ))}
        </TileGrid>
      ) : null}

      <GlassLegend />
    </AppShell>
  );
}

function EmptyTab({ tab }: { tab: number }) {
  const copy = [
    {
      line: "Nothing poured yet.",
      hint: "The first bottle you log lands here with its label plate.",
    },
    { line: "Nothing on the list.", hint: "Any wine can be added from its bottle page." },
    { line: "Nothing opened in the circle yet.", hint: "Bottles appear here as members log them." },
  ][tab]!;
  return (
    <div
      className="flex flex-col items-start border-t border-border"
      style={{ padding: "34px 0 10px", gap: 10 }}
    >
      <div className="font-display text-foreground italic" style={{ fontSize: 26 }}>
        {copy.line}
      </div>
      <p className="m-0 text-muted-foreground" style={{ fontSize: 13 }}>
        {copy.hint}
      </p>
      {tab !== 1 ? (
        <Link to="/add" className="btn-gold">
          Log a bottle
        </Link>
      ) : null}
    </div>
  );
}
