import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, BackToGrid, ErrorNote, ScreenHeading } from "@/components/AppShell";
import { SkeletonTiles, TileGrid, WineTile } from "@/components/WineTile";
import { getMemberRatings, getProfile, glassOf, memberLabel } from "@/lib/rim";
import { getPrimaryThumbUrls } from "@/lib/photos";

export const Route = createFileRoute("/_authenticated/member/$userId")({
  head: () => ({
    meta: [
      { title: "Member | Corkboard" },
      {
        name: "description",
        content: "Everything one member of the circle has poured, newest first.",
      },
      { property: "og:title", content: "Member | Corkboard" },
      { property: "og:description", content: "One member's ratings and notes." },
    ],
  }),
  component: MemberPage,
});

function MemberPage() {
  const { userId } = Route.useParams();
  const profile = useQuery({ queryKey: ["profile", userId], queryFn: () => getProfile(userId) });
  const ratings = useQuery({
    queryKey: ["member-ratings", userId],
    queryFn: () => getMemberRatings(userId),
  });
  const ids = (ratings.data ?? []).map((row) => row.id);
  const thumbs = useQuery({
    queryKey: ["member-thumbs", ids.join(",")],
    queryFn: () => getPrimaryThumbUrls("rating", ids),
    enabled: ids.length > 0,
  });

  return (
    <AppShell>
      <div style={{ paddingTop: 20 }}>
        <BackToGrid />
      </div>
      {profile.isError ? <ErrorNote onRetry={() => profile.refetch()} /> : null}
      <div style={{ padding: "22px 0 26px" }}>
        <ScreenHeading
          sub={
            ratings.data
              ? `${ratings.data.length} ${ratings.data.length === 1 ? "bottle" : "bottles"} poured, newest first.`
              : null
          }
        >
          {memberLabel(profile.data?.display_name) || "Member"}
        </ScreenHeading>
      </div>

      <div>
        {ratings.isLoading ? <SkeletonTiles /> : null}
        {ratings.data && ratings.data.length === 0 ? (
          <p className="text-muted-foreground">Nothing poured yet.</p>
        ) : null}
        {ratings.data && ratings.data.length > 0 ? (
          <TileGrid>
            {ratings.data.map((row) => (
              <WineTile
                key={row.id}
                wine={row.wine}
                vintage={row.bottling.vintage}
                stars={row.stars}
                note={glassOf(row.wine).label}
                photoUrl={thumbs.data?.get(row.id) ?? null}
                entry={{ type: "rating", id: row.id }}
              />
            ))}
          </TileGrid>
        ) : null}
      </div>
    </AppShell>
  );
}
