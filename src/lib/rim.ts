import { supabase } from "@/integrations/supabase/client";
import { BUCKET } from "@/lib/photos";
import { detectVarietal, normalizeVarietal } from "@/lib/varietal";
import type { LabelCandidate } from "@/lib/label-match";

export type Colour = "red" | "white" | "rose" | "orange" | "sparkling" | "fortified";

export const COLOURS: { value: Colour; label: string; mark: string }[] = [
  { value: "red", label: "Red", mark: "var(--color-wine-garnet)" },
  { value: "white", label: "White", mark: "var(--color-wine-straw)" },
  { value: "rose", label: "Rosé", mark: "var(--color-wine-onion)" },
  { value: "orange", label: "Orange", mark: "var(--color-wine-tawny)" },
  { value: "sparkling", label: "Sparkling", mark: "var(--color-wine-gold)" },
  { value: "fortified", label: "Fortified", mark: "var(--color-wine-violet)" },
];

export function colourInfo(colour: Colour) {
  return COLOURS.find((c) => c.value === colour) ?? COLOURS[0]!;
}

/** Colour in the glass: the six-step ramp. Data marks only, never a score. */
export type Glass = "straw" | "gold" | "onion" | "violet" | "garnet" | "tawny";

export const GLASS: { value: Glass; label: string; hex: string }[] = [
  { value: "straw", label: "Straw", hex: "var(--color-wine-straw)" },
  { value: "gold", label: "Gold", hex: "var(--color-wine-gold)" },
  { value: "onion", label: "Onion skin", hex: "var(--color-wine-onion)" },
  { value: "violet", label: "Violet", hex: "var(--color-wine-violet)" },
  { value: "garnet", label: "Garnet", hex: "var(--color-wine-garnet)" },
  { value: "tawny", label: "Tawny", hex: "var(--color-wine-tawny)" },
];

const GLASS_BY_STYLE: Record<Colour, Glass> = {
  red: "garnet",
  white: "straw",
  rose: "onion",
  orange: "gold",
  sparkling: "straw",
  fortified: "tawny",
};

export function glassForStyle(colour: Colour): Glass {
  return GLASS_BY_STYLE[colour];
}

/** The colour bar follows the style; members pick taste, not colour (wine.glass is no longer asked). */
export function glassOf(wine: Pick<Wine, "colour">) {
  return GLASS.find((g) => g.value === GLASS_BY_STYLE[wine.colour]) ?? GLASS[4]!;
}

export type Wine = {
  id: string;
  lwin7: string | null;
  producer: string;
  cuvee: string;
  region: string | null;
  colour: Colour;
  verified: boolean;
  varietal: string | null;
  varietal_raw: string | null;
  vineyard: string | null;
  location: string | null;
  country: string | null;
  glass: string | null;
};

export type Bottling = { id: string; wine_id: string; vintage: number | null; format_ml: number };

export function memberLabel(name: string | null | undefined) {
  return (name ?? "").replace(/^\[demo\]\s*/, "");
}

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
};

export type FeedRow = {
  id: string;
  /** Null while the bottle is in the cellar unopened. */
  stars: number | null;
  note: string | null;
  place: string | null;
  drunk_on: string | null;
  tasting_notes: string[];
  created_at: string;
  user_id: string;
  profile: Profile;
  bottling: Bottling;
  wine: Wine;
};

const WINE_COLS =
  "id,lwin7,producer,cuvee,region,colour,verified,varietal,varietal_raw,vineyard,location,country,glass";
const PROFILE_COLS = "id,display_name,avatar_url,joined_at";
const RATING_JOIN = `id,stars,note,place,drunk_on,tasting_notes,created_at,user_id,profile:profile!inner(${PROFILE_COLS}),bottling:bottling!inner(id,wine_id,vintage,format_ml,wine:wine!inner(${WINE_COLS}))`;

type RawRating = {
  id: string;
  stars: number | null;
  note: string | null;
  place: string | null;
  drunk_on: string | null;
  tasting_notes: string[];
  created_at: string;
  user_id: string;
  profile: Profile;
  bottling: Bottling & { wine: Wine };
};

function toFeedRow(row: RawRating): FeedRow {
  const { wine, ...bottling } = row.bottling;
  return {
    id: row.id,
    stars: row.stars == null ? null : Number(row.stars),
    note: row.note,
    place: row.place,
    drunk_on: row.drunk_on,
    tasting_notes: row.tasting_notes ?? [],
    created_at: row.created_at,
    user_id: row.user_id,
    profile: row.profile,
    bottling,
    wine,
  };
}

export function formatFormat(ml: number) {
  if (ml === 750) return "750ml";
  if (ml === 1500) return "Magnum";
  if (ml === 375) return "Half";
  return `${ml}ml`;
}

export function wineSubtitle(wine: Wine, vintage?: number | null) {
  return [wine.producer, vintage == null ? "NV" : String(vintage), wine.region]
    .filter(Boolean)
    .join(" · ");
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(iso: string) {
  // A bare "YYYY-MM-DD" (drunk_on) is a calendar day; new Date() would read it as UTC midnight
  // and show the previous day west of Greenwich.
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Today as a local "YYYY-MM-DD", for date inputs. */
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getFeed(): Promise<FeedRow[]> {
  const { data, error } = await supabase
    .from("rating")
    .select(RATING_JOIN)
    .not("stars", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as RawRating[]).map(toFeedRow);
}

export async function getMemberRatings(userId: string): Promise<FeedRow[]> {
  const { data, error } = await supabase
    .from("rating")
    .select(RATING_JOIN)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawRating[]).map(toFeedRow);
}

export async function searchWines(term: string): Promise<Wine[]> {
  const q = term.trim().replace(/[%,()]/g, "");
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from("wine")
    .select(WINE_COLS)
    .or(`producer.ilike.${like},cuvee.ilike.${like},region.ilike.${like}`)
    .order("verified", { ascending: false })
    .order("producer")
    .limit(25);
  if (error) throw error;
  return (data ?? []) as Wine[];
}

export async function getWine(wineId: string): Promise<Wine | null> {
  const { data, error } = await supabase
    .from("wine")
    .select(WINE_COLS)
    .eq("id", wineId)
    .maybeSingle();
  if (error) throw error;
  return (data as Wine) ?? null;
}

export async function getWineRatings(wineId: string): Promise<FeedRow[]> {
  const { data: bottlings, error: bErr } = await supabase
    .from("bottling")
    .select("id,wine_id,vintage,format_ml")
    .eq("wine_id", wineId);
  if (bErr) throw bErr;
  const ids = (bottlings ?? []).map((b) => b.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("rating")
    .select(RATING_JOIN)
    .in("bottling_id", ids)
    .not("stars", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawRating[]).map(toFeedRow);
}

export async function getWineBottlings(wineId: string): Promise<Bottling[]> {
  const { data, error } = await supabase
    .from("bottling")
    .select("id,wine_id,vintage,format_ml")
    .eq("wine_id", wineId)
    .order("vintage", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Bottling[];
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profile")
    .select(PROFILE_COLS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export type WishlistRow = { id: string; note: string | null; created_at: string; wine: Wine };

export async function getWishlist(userId: string): Promise<WishlistRow[]> {
  const { data, error } = await supabase
    .from("wishlist_item")
    .select(`id,note,created_at,wine:wine!inner(${WINE_COLS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as WishlistRow[];
}

export async function addToWishlist(userId: string, wineId: string) {
  const { error } = await supabase
    .from("wishlist_item")
    .insert({ user_id: userId, wine_id: wineId });
  if (error && error.code !== "23505") throw error;
}

export async function removeWishlistItem(id: string) {
  // Deleting the item cascades its photo rows, so remove the files first or they're orphaned.
  const { data: photos } = await supabase
    .from("entry_photos")
    .select("storage_path,thumb_path")
    .eq("wishlist_item_id", id);
  const paths = (photos ?? []).flatMap((p) => [p.storage_path, p.thumb_path]);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  const { error } = await supabase.from("wishlist_item").delete().eq("id", id);
  if (error) throw error;
}

export async function isOnWishlist(userId: string, wineId: string) {
  const { data, error } = await supabase
    .from("wishlist_item")
    .select("id")
    .eq("user_id", userId)
    .eq("wine_id", wineId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function createWine(input: {
  producer: string;
  cuvee: string | null;
  region: string | null;
  colour: Colour;
  varietal?: string | null;
  varietal_raw?: string | null;
  vineyard?: string | null;
  location?: string | null;
  country?: string | null;
  glass?: Glass | null;
}): Promise<Wine> {
  const { data, error } = await supabase
    .from("wine")
    // verified and lwin7 are not writable by members; they default to false / null.
    .insert(input)
    .select(WINE_COLS)
    .single();
  if (error) throw error;
  return data as Wine;
}

export async function ensureBottling(
  wineId: string,
  vintage: number | null,
  formatMl: number,
): Promise<Bottling> {
  const existing = await supabase
    .from("bottling")
    .select("id,wine_id,vintage,format_ml")
    .eq("wine_id", wineId)
    .eq("format_ml", formatMl)
    .filter("vintage", vintage == null ? "is" : "eq", vintage == null ? null : vintage)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as Bottling;

  const { data, error } = await supabase
    .from("bottling")
    .insert({ wine_id: wineId, vintage, format_ml: formatMl })
    .select("id,wine_id,vintage,format_ml")
    .single();
  if (error) throw error;
  return data as Bottling;
}

export async function getMyRatingFor(userId: string, bottlingId: string) {
  const { data, error } = await supabase
    .from("rating")
    .select("id,stars,note,drunk_on")
    .eq("user_id", userId)
    .eq("bottling_id", bottlingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveRating(input: {
  id?: string;
  userId: string;
  bottlingId: string;
  /** Null for a bottle not opened yet; drunkOn is then null too. */
  stars: number | null;
  note: string | null;
  place?: string | null;
  score100: number | null;
  drunkOn: string | null;
  tastingNotes?: string[];
  bottlesOwned?: number | undefined;
}) {
  let ratingId = input.id;
  if (ratingId) {
    const { error } = await supabase
      .from("rating")
      .update({
        stars: input.stars,
        note: input.note,
        place: input.place ?? null,
        drunk_on: input.drunkOn,
        tasting_notes: input.tastingNotes ?? [],
      })
      .eq("id", ratingId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("rating")
      .insert({
        user_id: input.userId,
        bottling_id: input.bottlingId,
        stars: input.stars,
        note: input.note,
        place: input.place ?? null,
        drunk_on: input.drunkOn,
        tasting_notes: input.tastingNotes ?? [],
      })
      .select("id")
      .single();
    if (error) throw error;
    ratingId = data.id as string;
  }

  // Upsert rather than delete when the score is cleared: the row also holds bottles_owned.
  const { error } = await supabase.from("rating_private").upsert({
    rating_id: ratingId,
    user_id: input.userId,
    score_100: input.score100,
    ...(input.bottlesOwned != null ? { bottles_owned: Math.max(0, input.bottlesOwned) } : {}),
  });
  if (error) throw error;
  return ratingId;
}

/** Quick edits from the bottle page: the member's own stars, date, place or tasting notes. */
export async function updateMyRating(
  ratingId: string,
  changes: {
    stars?: number | null;
    drunk_on?: string | null;
    place?: string | null;
    tasting_notes?: string[];
  },
) {
  const { error } = await supabase.from("rating").update(changes).eq("id", ratingId);
  if (error) throw error;
}

export async function getBottlesOwned(ratingId: string) {
  const { data, error } = await supabase
    .from("rating_private")
    .select("bottles_owned")
    .eq("rating_id", ratingId)
    .maybeSingle();
  if (error) throw error;
  return data?.bottles_owned ?? 0;
}

export async function setBottlesOwned(ratingId: string, userId: string, count: number) {
  const { error } = await supabase
    .from("rating_private")
    .upsert({ rating_id: ratingId, user_id: userId, bottles_owned: Math.max(0, count) });
  if (error) throw error;
}

/** Bottles on hand per logged bottle, for the cellar totals. Private to the member. */
export async function getBottlesOwnedMap(userId: string) {
  const { data, error } = await supabase
    .from("rating_private")
    .select("rating_id,bottles_owned")
    .eq("user_id", userId);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.rating_id, row.bottles_owned ?? 0]));
}

/** Total bottles in the member's rack, across every rated bottling. */
export async function getRackTotal(userId: string) {
  const { data, error } = await supabase
    .from("rating_private")
    .select("bottles_owned")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).reduce((n, row) => n + (row.bottles_owned ?? 0), 0);
}

export async function countMembers() {
  const { count, error } = await supabase
    .from("profile")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getPrivateScore(ratingId: string) {
  const { data, error } = await supabase
    .from("rating_private")
    .select("score_100")
    .eq("rating_id", ratingId)
    .maybeSingle();
  if (error) throw error;
  return data?.score_100 ?? null;
}

export type WineChanges = {
  producer: string;
  cuvee: string | null;
  region: string | null;
  colour: Colour;
  vineyard: string | null;
  location: string | null;
  country: string | null;
  varietal: string | null;
  glass: Glass | null;
};

export async function updateWine(userId: string, wine: Wine, changes: WineChanges) {
  const fields = Object.keys(changes) as (keyof WineChanges)[];
  const log = fields
    .filter((f) => (wine[f] ?? null) !== (changes[f] ?? null))
    .map((f) => ({
      wine_id: wine.id,
      user_id: userId,
      field_name: f,
      old_value: wine[f] == null ? null : String(wine[f]),
      new_value: changes[f] == null ? null : String(changes[f]),
    }));
  if (!log.length) return;

  const { error } = await supabase.from("wine").update(changes).eq("id", wine.id);
  if (error) throw error;
  const { error: logError } = await supabase.from("wine_edit_log").insert(log);
  if (logError) throw logError;
}

export async function avatarUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

export async function createInvite(userId: string) {
  const code = randomCode();
  const { error } = await supabase.from("invite").insert({ code, created_by: userId });
  if (error) throw error;
  return code;
}

export async function getMyInvites(userId: string) {
  const { data, error } = await supabase
    .from("invite")
    .select("code,used_by,created_at,expires_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Progressive drill-down: Brand → Range → Bottling → Vintage
// ---------------------------------------------------------------------------

export type ProducerMatch = { producer: string; wine_count: number; score: number };

export async function searchProducers(term: string): Promise<ProducerMatch[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc("search_producers", { q, max_rows: 12 });
  if (error) throw error;
  return ((data ?? []) as ProducerMatch[]).map((row) => ({
    producer: row.producer,
    wine_count: Number(row.wine_count),
    score: Number(row.score),
  }));
}

export async function getWinesByProducer(producer: string): Promise<Wine[]> {
  const { data, error } = await supabase
    .from("wine")
    .select(WINE_COLS)
    .eq("producer", producer)
    .order("cuvee");
  if (error) throw error;
  return (data ?? []) as Wine[];
}

export type Range = {
  key: string;
  label: string;
  source: "varietal" | "region" | "other";
  wines: Wine[];
};

/** Group a producer's wines into ranges: normalized varietal first, region as fallback. */
export function buildRanges(wines: Wine[]): Range[] {
  const groups = new Map<string, Range>();
  for (const wine of wines) {
    const varietal =
      normalizeVarietal(wine.varietal) ??
      detectVarietal(wine.varietal) ??
      detectVarietal(wine.cuvee, wine.colour);
    const label = varietal ?? wine.region ?? "Other";
    const source: Range["source"] = varietal ? "varietal" : wine.region ? "region" : "other";
    const key = `${source}:${label.toLowerCase()}`;
    const existing = groups.get(key);
    if (existing) existing.wines.push(wine);
    else groups.set(key, { key, label, source, wines: [wine] });
  }
  return [...groups.values()].sort((a, b) => {
    if (a.source !== b.source)
      return a.source === "varietal" ? -1 : b.source === "varietal" ? 1 : 0;
    return a.label.localeCompare(b.label);
  });
}

export type VintageOption = { value: number | null; label: string; logged: boolean };

const RECENT_YEARS = 25;

export function buildVintageOptions(bottlings: Bottling[]): VintageOption[] {
  const logged = [
    ...new Set(bottlings.map((b) => b.vintage).filter((v): v is number => v != null)),
  ].sort((a, b) => b - a);
  const thisYear = new Date().getFullYear();
  const generated: number[] = [];
  for (let year = thisYear; year > thisYear - RECENT_YEARS; year -= 1) {
    if (!logged.includes(year)) generated.push(year);
  }
  return [
    ...logged.map((v) => ({ value: v, label: String(v), logged: true })),
    ...generated.map((v) => ({ value: v, label: String(v), logged: false })),
    { value: null, label: "Non-vintage", logged: bottlings.some((b) => b.vintage == null) },
  ];
}

/** The member's own most recently logged wines — the shortcut list on an empty search. */
export async function getMyRecentWines(userId: string, limit = 6): Promise<Wine[]> {
  const { data, error } = await supabase
    .from("rating")
    .select(`created_at,bottling:bottling!inner(wine:wine!inner(${WINE_COLS}))`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  const seen = new Set<string>();
  const wines: Wine[] = [];
  for (const row of (data ?? []) as unknown as { bottling: { wine: Wine } }[]) {
    const wine = row.bottling.wine;
    if (seen.has(wine.id)) continue;
    seen.add(wine.id);
    wines.push(wine);
    if (wines.length >= limit) break;
  }
  return wines;
}

// ---------------------------------------------------------------------------
// Single entries (a logged bottle, or a wishlist item)
// ---------------------------------------------------------------------------

export async function getRatingById(id: string): Promise<FeedRow | null> {
  const { data, error } = await supabase
    .from("rating")
    .select(RATING_JOIN)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toFeedRow(data as unknown as RawRating) : null;
}

export type WishlistEntry = {
  id: string;
  note: string | null;
  created_at: string;
  user_id: string;
  wine: Wine;
};

export async function getWishlistItem(id: string): Promise<WishlistEntry | null> {
  const { data, error } = await supabase
    .from("wishlist_item")
    .select(`id,note,created_at,user_id,wine:wine!inner(${WINE_COLS})`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as WishlistEntry) ?? null;
}

// ---------------------------------------------------------------------------
// Label identification: candidates from the circle's wines, then LWIN
// ---------------------------------------------------------------------------

export { confidentMatch, type LabelCandidate } from "@/lib/label-match";

/** names: the ways the label might name the wine (cuvee, grape, appellation), best first. */
export async function matchLabel(
  producer: string,
  names: string[],
  colour: Colour | null,
  hasCuvee: boolean,
): Promise<LabelCandidate[]> {
  const { data, error } = await supabase.rpc("match_label", {
    p_producer: producer,
    p_names: names,
    p_has_cuvee: hasCuvee,
    ...(colour ? { p_colour: colour } : {}),
    max_rows: 5,
  });
  if (error) throw error;
  return ((data ?? []) as LabelCandidate[]).map((c) => ({
    ...c,
    score: Number(c.score),
    name_score: Number(c.name_score),
  }));
}

/** Create (or reuse) the verified local wine for an LWIN code. Identity comes from LWIN. */
export async function adoptLwinWine(input: {
  lwin7: string;
  colour: Colour;
  varietal: string | null;
  glass: Glass | null;
  vineyard: string | null;
  location: string | null;
}): Promise<Wine> {
  const { data, error } = await supabase.rpc("adopt_lwin_wine", {
    p_lwin7: input.lwin7,
    p_colour: input.colour,
    ...(input.varietal ? { p_varietal: input.varietal } : {}),
    ...(input.glass ? { p_glass: input.glass } : {}),
    ...(input.vineyard ? { p_vineyard: input.vineyard } : {}),
    ...(input.location ? { p_location: input.location } : {}),
  });
  if (error) throw error;
  const wine = await getWine(data as string);
  if (!wine) throw new Error("Adopted wine not found");
  return wine;
}
