export type LabelCandidate = {
  source: "cellar" | "lwin";
  wine_id: string | null;
  lwin7: string | null;
  producer: string;
  cuvee: string | null;
  region: string | null;
  country: string | null;
  colour: string | null;
  /** Producer and name combined, 0 to 1. */
  score: number;
  /** How well the wine name alone matched, 0 to 1. */
  name_score: number;
};

// ponytail: fixed cut-offs, tuned on 28 real photos (2026-09-12); retune as the circle logs more.
const CONFIDENT = 0.72;
const CLEAR_LEAD = 0.08;
const EXACT = 0.99;
// A strong producer alone must not confirm a different wine from that producer
// ("1607 Ripasso" is not Albino Armani's Amarone).
const NAME_MIN = 0.7;

/**
 * The candidate to prefill, or null when nothing is strong and clearly ahead.
 * Candidates arrive best first. A wine the circle already has wins unless LWIN clearly
 * knows a better match, so a second photo of the same bottle doesn't create a duplicate.
 */
export function confidentMatch(candidates: LabelCandidate[]): LabelCandidate | null {
  const [top, second] = candidates;
  const [ownBest, ownNext] = candidates.filter((c) => c.source === "cellar");
  if (
    top &&
    ownBest &&
    ownBest.score >= CONFIDENT &&
    ownBest.name_score >= NAME_MIN &&
    top.score - ownBest.score < CLEAR_LEAD &&
    (!ownNext || ownBest.score - ownNext.score >= CLEAR_LEAD)
  ) {
    return ownBest;
  }
  if (!top || top.score < CONFIDENT || top.name_score < NAME_MIN) return null;
  // A unique exact producer-and-name match stands even when near misses crowd it
  // ("Barbaresco" against "Barbaresco, Pora" from the same producer).
  if (top.score >= EXACT && !(second && second.score >= EXACT)) return top;
  if (second && top.score - second.score < CLEAR_LEAD) return null;
  return top;
}
