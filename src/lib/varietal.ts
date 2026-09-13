// Controlled varietal vocabulary. Members never type a varietal; anything that
// arrives from a label, an import or a hand-typed cuvée is squeezed through
// here so "Cab Sauv", "Cabernet" and "Cabernet Sauvignon" become one row.

export const VARIETALS = [
  "Cabernet Sauvignon",
  "Cabernet Franc",
  "Merlot",
  "Pinot Noir",
  "Syrah",
  "Grenache",
  "Malbec",
  "Tempranillo",
  "Sangiovese",
  "Nebbiolo",
  "Zinfandel",
  "Petite Sirah",
  "Barbera",
  "Mourvèdre",
  "Carménère",
  "Gamay",
  "Chardonnay",
  "Sauvignon Blanc",
  "Riesling",
  "Pinot Gris",
  "Pinot Blanc",
  "Chenin Blanc",
  "Viognier",
  "Gewürztraminer",
  "Albariño",
  "Grüner Veltliner",
  "Sémillon",
  "Muscat",
  "Verdejo",
  "Vermentino",
  "Trebbiano",
  "Glera",
  "Red Blend",
  "White Blend",
  "Rosé",
] as const;

export type Varietal = (typeof VARIETALS)[number];

// alias (already lowercased, de-accented, punctuation stripped) -> canonical
const ALIASES: Record<string, Varietal> = {
  cab: "Cabernet Sauvignon",
  cabernet: "Cabernet Sauvignon",
  "cab sauv": "Cabernet Sauvignon",
  "cab sav": "Cabernet Sauvignon",
  "cabernet sauv": "Cabernet Sauvignon",
  "cabernet sauvignon": "Cabernet Sauvignon",
  cs: "Cabernet Sauvignon",
  "cab franc": "Cabernet Franc",
  "cabernet franc": "Cabernet Franc",
  cf: "Cabernet Franc",
  merlot: "Merlot",
  "pinot noir": "Pinot Noir",
  "pinot nero": "Pinot Noir",
  spatburgunder: "Pinot Noir",
  pn: "Pinot Noir",
  syrah: "Syrah",
  shiraz: "Syrah",
  grenache: "Grenache",
  garnacha: "Grenache",
  malbec: "Malbec",
  tempranillo: "Tempranillo",
  "tinto fino": "Tempranillo",
  sangiovese: "Sangiovese",
  brunello: "Sangiovese",
  nebbiolo: "Nebbiolo",
  zinfandel: "Zinfandel",
  zin: "Zinfandel",
  primitivo: "Zinfandel",
  "petite sirah": "Petite Sirah",
  petit_sirah: "Petite Sirah",
  durif: "Petite Sirah",
  barbera: "Barbera",
  mourvedre: "Mourvèdre",
  monastrell: "Mourvèdre",
  carmenere: "Carménère",
  gamay: "Gamay",
  chardonnay: "Chardonnay",
  chard: "Chardonnay",
  "sauvignon blanc": "Sauvignon Blanc",
  "sauv blanc": "Sauvignon Blanc",
  "sauv blance": "Sauvignon Blanc",
  sb: "Sauvignon Blanc",
  riesling: "Riesling",
  "pinot gris": "Pinot Gris",
  "pinot grigio": "Pinot Gris",
  "pinot blanc": "Pinot Blanc",
  "pinot bianco": "Pinot Blanc",
  weissburgunder: "Pinot Blanc",
  "chenin blanc": "Chenin Blanc",
  chenin: "Chenin Blanc",
  viognier: "Viognier",
  gewurztraminer: "Gewürztraminer",
  gewurz: "Gewürztraminer",
  albarino: "Albariño",
  alvarinho: "Albariño",
  "gruner veltliner": "Grüner Veltliner",
  gruner: "Grüner Veltliner",
  semillon: "Sémillon",
  muscat: "Muscat",
  moscato: "Muscat",
  verdejo: "Verdejo",
  vermentino: "Vermentino",
  trebbiano: "Trebbiano",
  glera: "Glera",
  prosecco: "Glera",
  "red blend": "Red Blend",
  "red table wine": "Red Blend",
  meritage: "Red Blend",
  "white blend": "White Blend",
  rose: "Rosé",
  rosado: "Rosé",
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CANONICAL_BY_FOLD = new Map<string, Varietal>(VARIETALS.map((v) => [fold(v), v]));

/** Resolve any wording to a single controlled value, or null when unknown. */
export function normalizeVarietal(input: string | null | undefined): Varietal | null {
  if (!input) return null;
  const key = fold(input);
  if (!key) return null;
  return CANONICAL_BY_FOLD.get(key) ?? ALIASES[key] ?? null;
}

const BLENDS: Varietal[] = ["Red Blend", "White Blend"];
const WHITE_GRAPES = new Set<Varietal>([
  "Chardonnay",
  "Sauvignon Blanc",
  "Riesling",
  "Pinot Gris",
  "Pinot Blanc",
  "Chenin Blanc",
  "Viognier",
  "Gewürztraminer",
  "Albariño",
  "Grüner Veltliner",
  "Sémillon",
  "Muscat",
  "Verdejo",
  "Vermentino",
  "Trebbiano",
  "Glera",
]);

/** The picker's order: blends first, then grapes A to Z. */
export const VARIETAL_GROUPS: { label: string; options: Varietal[] }[] = [
  { label: "Blends", options: BLENDS },
  {
    label: "Grapes",
    options: VARIETALS.filter((v) => !BLENDS.includes(v)).sort((a, b) => a.localeCompare(b)),
  },
];

// Longest first, so "cabernet franc" claims its words before "cabernet" can.
const DETECT_KEYS: [string, Varietal][] = [
  ...CANONICAL_BY_FOLD,
  ...Object.entries(ALIASES).filter(([key]) => key.length >= 4),
].sort((a, b) => b[0].length - a[0].length);

/**
 * Find the varietal in free text (a cuvée, or a label's "85% Malbec, 10% Cabernet Sauvignon").
 * Two or more grapes, or the word "blend", make it a Red or White Blend: white when every
 * grape named is white, or by the wine's style when no grape is named.
 */
export function detectVarietal(
  text: string | null | undefined,
  style?: string | null,
): Varietal | null {
  if (!text) return null;
  let haystack = ` ${fold(text)} `;
  const found = new Set<Varietal>();
  for (const [key, value] of DETECT_KEYS) {
    const needle = ` ${key} `;
    if (!haystack.includes(needle)) continue;
    found.add(value);
    haystack = haystack.split(needle).join(" ");
  }
  const named = BLENDS.find((b) => found.has(b));
  if (named) return named;
  const grapes = [...found].filter((v) => v !== "Rosé");
  const saysBlend = / blend /.test(haystack);
  if (grapes.length >= 2 || (saysBlend && (grapes.length || style))) {
    const white = grapes.length ? grapes.every((g) => WHITE_GRAPES.has(g)) : style === "white";
    return white ? "White Blend" : "Red Blend";
  }
  return grapes[0] ?? (found.has("Rosé") ? "Rosé" : null);
}
