import { Link } from "@tanstack/react-router";
import { Stars } from "@/components/Stars";
import { glassOf, type Wine } from "@/lib/rim";

/** The wine's display name: the cuvee, or the producer when the wine has none. */
export function wineTitle(wine: Wine) {
  return wine.cuvee || wine.producer;
}

export function vintageText(vintage: number | null | undefined) {
  return vintage === undefined ? "" : vintage === null ? "NV" : String(vintage);
}

/** Cream printed label plate: the designed no-photo state, never a placeholder. */
export function LabelPlate({ wine, vintage }: { wine: Wine; vintage: number | null | undefined }) {
  const place = wine.region ?? wine.country;
  const sub = wine.varietal_raw ?? wine.varietal;
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-between bg-plate text-center text-plate-foreground"
      style={{
        padding: "16px 13px",
        boxShadow:
          "inset 0 0 0 1px rgba(36,28,19,.12), inset 0 0 0 5px var(--color-plate), inset 0 0 0 6px rgba(36,28,19,.18)",
      }}
    >
      <div className="flex w-full flex-col items-center" style={{ gap: 8 }}>
        <div
          className="text-plate-caps uppercase"
          style={{ fontSize: 8.5, letterSpacing: "0.24em" }}
        >
          {place ?? " "}
        </div>
        <div style={{ width: 26, height: 1, background: "rgba(36,28,19,.35)" }} />
      </div>
      <div className="flex flex-col items-center" style={{ gap: 7 }}>
        {wine.cuvee ? (
          <div
            className="font-display text-plate-muted uppercase"
            style={{ fontSize: 9.5, letterSpacing: "0.22em" }}
          >
            {wine.producer}
          </div>
        ) : null}
        <div className="font-display text-pretty italic" style={{ fontSize: 23, lineHeight: 1.12 }}>
          {wineTitle(wine)}
        </div>
        {sub ? (
          <div
            className="text-plate-caps uppercase"
            style={{ fontSize: 8.5, letterSpacing: "0.2em" }}
          >
            {sub}
          </div>
        ) : null}
      </div>
      <div className="flex w-full flex-col items-center" style={{ gap: 8 }}>
        <div className="w-full" style={{ height: 1, background: "var(--color-plate-rule)" }} />
        <div
          className="font-display tabular-nums"
          style={{ fontSize: 15, letterSpacing: "0.14em", color: "#3a3024" }}
        >
          {vintageText(vintage) || " "}
        </div>
      </div>
    </div>
  );
}

/** The 2:3 frame: photo or plate, the glass-colour bar, the wishlist corner. */
export function TileFrame({
  wine,
  vintage,
  photoUrl,
  wish,
  children,
  interactive,
}: {
  wine: Wine;
  vintage: number | null | undefined;
  photoUrl?: string | null | undefined;
  wish?: boolean | undefined;
  children?: React.ReactNode;
  /** Inside a link: gold border on hover, a slight press. */
  interactive?: boolean;
}) {
  const motion = interactive
    ? " transition-[transform,border-color] duration-[140ms] ease-out group-hover:border-[rgba(201,169,97,.55)] group-active:scale-[.985]"
    : "";
  return (
    <div
      className={`relative border border-border bg-card${motion}`}
      style={{ aspectRatio: "2 / 3" }}
    >
      {children ??
        (photoUrl ? (
          <img
            src={photoUrl}
            alt={`Bottle of ${wine.producer} ${wine.cuvee ?? ""}`.trim()}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <LabelPlate wine={wine} vintage={vintage} />
        ))}
      {wish ? (
        <div
          aria-hidden
          className="absolute top-0 right-0"
          style={{
            borderTop: "24px solid var(--color-gold)",
            borderLeft: "24px solid transparent",
          }}
        />
      ) : null}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: 3, background: glassOf(wine).hex }}
      />
    </div>
  );
}

export type WineTileProps = {
  wine: Wine;
  /** undefined hides the vintage (wishlist items have none); null reads NV. */
  vintage?: number | null | undefined;
  /** The viewer's own mark; 0 shows empty stars. Omit to hide the stars. */
  stars?: number | undefined;
  /** Right-hand caption: glass colour, "Wishlist", "Poured by Carol". */
  note?: string;
  photoUrl?: string | null;
  wish?: boolean;
  /** Link to one member's entry rather than the wine. */
  entry?: { type: "rating" | "wishlist"; id: string };
};

export function WineTile({ wine, vintage, stars, note, photoUrl, wish, entry }: WineTileProps) {
  const inner = (
    <>
      <TileFrame wine={wine} vintage={vintage} photoUrl={photoUrl} wish={wish} interactive />
      <div className="flex flex-col" style={{ paddingTop: 9, gap: 4 }}>
        <div
          className="font-display text-pretty text-foreground"
          style={{ fontSize: 17, lineHeight: 1.2 }}
        >
          {wineTitle(wine)}
        </div>
        {wine.cuvee ? (
          <div
            className="uppercase text-eyebrow"
            style={{ fontSize: 9.5, letterSpacing: "0.14em" }}
          >
            {wine.producer}
          </div>
        ) : null}
        <div className="flex items-center" style={{ gap: 8, marginTop: 2 }}>
          {vintage !== undefined ? (
            <>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {vintageText(vintage)}
              </span>
              {stars !== undefined ? (
                <span
                  aria-hidden
                  style={{ width: 1, height: 10, background: "var(--color-dim)" }}
                />
              ) : null}
            </>
          ) : null}
          {stars !== undefined ? <Stars value={stars} /> : null}
          {note ? (
            <span
              className="ml-auto truncate text-quiet uppercase"
              style={{ fontSize: 9.5, letterSpacing: "0.1em" }}
            >
              {note}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-w-0">
      {entry ? (
        <Link
          to="/entry/$entryType/$entryId"
          params={{ entryType: entry.type, entryId: entry.id }}
          className="group block"
        >
          {inner}
        </Link>
      ) : (
        <Link to="/wine/$wineId" params={{ wineId: wine.id }} className="group block">
          {inner}
        </Link>
      )}
    </div>
  );
}

export function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(min(168px, calc(50% - 9px)), 1fr))",
        gap: "26px 18px",
      }}
    >
      {children}
    </div>
  );
}

export function SkeletonTiles({ count = 6 }: { count?: number }) {
  return (
    <TileGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} aria-hidden className="min-w-0">
          <div
            className="w-full animate-pulse border border-border bg-card"
            style={{ aspectRatio: "2 / 3" }}
          />
          <div className="mt-3 h-3 w-3/4 animate-pulse bg-card" />
          <div className="mt-2 h-2 w-1/2 animate-pulse bg-card" />
        </div>
      ))}
    </TileGrid>
  );
}
