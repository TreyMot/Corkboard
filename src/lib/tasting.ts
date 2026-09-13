import type { Colour } from "@/lib/rim";

// Tasting notes a member can pick for a bottle, one list per style. A starter set of common
// descriptors: replace any group or word here and the picker follows. Saved notes are plain
// text on the rating, so renaming a word later leaves old bottles with the old word.

export type TastingGroup = { label: string; notes: string[] };

const STRUCTURE_STILL = ["Dry", "Off-dry", "Sweet", "Light-bodied", "Medium-bodied", "Full-bodied"];

export const TASTING: Record<Colour, TastingGroup[]> = {
  red: [
    {
      label: "Red fruit",
      notes: ["Cherry", "Raspberry", "Strawberry", "Cranberry", "Red plum", "Pomegranate"],
    },
    {
      label: "Dark fruit",
      notes: ["Blackberry", "Blackcurrant", "Black cherry", "Plum", "Blueberry", "Fig", "Jammy"],
    },
    {
      label: "Floral and herbal",
      notes: ["Violet", "Rose", "Mint", "Eucalyptus", "Green pepper", "Sage"],
    },
    {
      label: "Spice and earth",
      notes: [
        "Black pepper",
        "Clove",
        "Licorice",
        "Leather",
        "Tobacco",
        "Earth",
        "Mushroom",
        "Forest floor",
        "Graphite",
      ],
    },
    {
      label: "Oak and age",
      notes: ["Vanilla", "Cedar", "Chocolate", "Coffee", "Mocha", "Smoke", "Toast"],
    },
    {
      label: "Structure",
      notes: [
        ...STRUCTURE_STILL,
        "Soft tannins",
        "Firm tannins",
        "Bright acidity",
        "Smooth",
        "Long finish",
      ],
    },
  ],
  white: [
    { label: "Citrus", notes: ["Lemon", "Lime", "Grapefruit", "Orange peel"] },
    {
      label: "Orchard and stone fruit",
      notes: ["Green apple", "Pear", "Quince", "Peach", "Apricot"],
    },
    {
      label: "Tropical",
      notes: ["Pineapple", "Mango", "Passion fruit", "Lychee", "Melon", "Banana"],
    },
    {
      label: "Floral and herbal",
      notes: ["Honeysuckle", "Jasmine", "Orange blossom", "Elderflower", "Cut grass", "Herbs"],
    },
    {
      label: "Mineral and other",
      notes: ["Flint", "Wet stone", "Saline", "Petrol", "Honey", "Almond"],
    },
    { label: "Oak", notes: ["Butter", "Vanilla", "Toast", "Brioche", "Cream"] },
    {
      label: "Structure",
      notes: [...STRUCTURE_STILL, "Crisp", "Bright acidity", "Round", "Creamy", "Long finish"],
    },
  ],
  rose: [
    {
      label: "Fruit",
      notes: [
        "Strawberry",
        "Raspberry",
        "Watermelon",
        "Cherry",
        "Red currant",
        "Peach",
        "Grapefruit",
        "Orange peel",
      ],
    },
    { label: "Floral and herbal", notes: ["Rose", "Hibiscus", "Lavender", "Herbs"] },
    { label: "Other", notes: ["Wet stone", "Saline", "Cream"] },
    { label: "Structure", notes: ["Dry", "Off-dry", "Crisp", "Refreshing", "Light-bodied"] },
  ],
  orange: [
    {
      label: "Fruit",
      notes: ["Dried apricot", "Orange peel", "Bruised apple", "Quince", "Marmalade"],
    },
    { label: "Other", notes: ["Tea", "Honey", "Nuts", "Spice", "Herbs", "Sourdough"] },
    { label: "Structure", notes: ["Dry", "Grippy", "Tannic", "Savory", "Long finish"] },
  ],
  sparkling: [
    {
      label: "Fruit",
      notes: ["Green apple", "Pear", "Lemon", "Peach", "Strawberry", "Raspberry"],
    },
    { label: "Bakery", notes: ["Brioche", "Toast", "Biscuit", "Yeast", "Almond", "Honey"] },
    { label: "Floral and mineral", notes: ["White flowers", "Chalk", "Mineral", "Cream"] },
    {
      label: "Bubbles and sweetness",
      notes: ["Fine bubbles", "Lively bubbles", "Creamy", "Crisp", "Brut", "Extra dry", "Sweet"],
    },
  ],
  fortified: [
    {
      label: "Fruit",
      notes: ["Raisin", "Fig", "Prune", "Dried cherry", "Blackberry", "Orange peel"],
    },
    {
      label: "Nutty and sweet",
      notes: ["Walnut", "Hazelnut", "Almond", "Caramel", "Toffee", "Honey", "Molasses"],
    },
    {
      label: "Spice and other",
      notes: ["Chocolate", "Coffee", "Cinnamon", "Clove", "Vanilla", "Leather", "Smoke"],
    },
    { label: "Structure", notes: ["Sweet", "Dry", "Rich", "Warming", "Long finish"] },
  ],
};

/** The database allows up to 40 per bottle. */
export const MAX_TASTING_NOTES = 40;
