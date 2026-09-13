// Run: node --experimental-strip-types scripts/varietal.check.ts
import assert from "node:assert/strict";
import { detectVarietal } from "../src/lib/varietal.ts";

const cases: [string, string | null, string | null][] = [
  ["85% Malbec, 10% Cabernet Sauvignon, 5% Syrah", null, "Red Blend"],
  ["Cabernet Franc", null, "Cabernet Franc"],
  ["Cabernet Sauvignon", null, "Cabernet Sauvignon"],
  ["Sauvignon Blanc and Sémillon", null, "White Blend"],
  ["Chardonnay, Pinot Noir", null, "Red Blend"],
  ["Chairman's Blend", "red", "Red Blend"],
  ["House Blend", "white", "White Blend"],
  ["Chairman's Blend", null, null],
  ["Meritage", null, "Red Blend"],
  ["Rosé of Pinot Noir", null, "Pinot Noir"],
  ["Reserve Nagengast Estate Vineyard", "red", null],
  ["Pinot Grigio", null, "Pinot Gris"],
];
for (const [text, style, want] of cases) assert.equal(detectVarietal(text, style), want, text);
console.log(`varietal: ${cases.length} cases pass`);
