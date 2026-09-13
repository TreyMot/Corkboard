// Run: node --experimental-strip-types scripts/label-match.check.ts
import assert from "node:assert/strict";
import { confidentMatch, type LabelCandidate } from "../src/lib/label-match.ts";

const c = (
  score: number,
  source: LabelCandidate["source"] = "lwin",
  nameScore = 1,
): LabelCandidate => ({
  source,
  wine_id: null,
  lwin7: "1234567",
  producer: "Domaine Dujac",
  cuvee: null,
  region: null,
  country: null,
  colour: null,
  score,
  name_score: nameScore,
});

assert.equal(confidentMatch([]), null, "no candidates");
assert.equal(confidentMatch([c(0.6)]), null, "weak lone candidate");
assert.equal(confidentMatch([c(0.9)])?.score, 0.9, "strong lone candidate");
assert.equal(confidentMatch([c(0.9), c(0.85)]), null, "strong but not clearly ahead");
assert.equal(confidentMatch([c(0.9, "cellar"), c(0.7)])?.source, "cellar", "clear lead wins");
assert.equal(
  confidentMatch([c(0.9, "lwin"), c(0.88, "cellar")])?.source,
  "cellar",
  "the circle's own wine wins a near tie with LWIN",
);
assert.equal(
  confidentMatch([c(1.0, "lwin"), c(0.8, "cellar")])?.source,
  "lwin",
  "LWIN wins when clearly better than the cellar match",
);
assert.equal(
  confidentMatch([c(0.9, "cellar"), c(0.88, "cellar")]),
  null,
  "two similar cellar wines stay ambiguous",
);
assert.equal(confidentMatch([c(1.0), c(0.94)])?.score, 1.0, "unique exact match stands");
assert.equal(confidentMatch([c(1.0), c(1.0)]), null, "two exact matches stay ambiguous");
assert.equal(
  confidentMatch([c(0.79, "lwin", 0.4), c(0.67, "lwin", 0.1)]),
  null,
  "right producer, wrong wine is not confirmed",
);
console.log("label-match: ok");
