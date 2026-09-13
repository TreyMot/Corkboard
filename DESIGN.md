# DESIGN LOCK: Corkboard

Source of truth: Claude Design project "Corkboard Frontend Design", file `Corkboard Home.dc.html`. Tokens live in `src/styles.css`.

- **Audience + problem:** a small invite-only circle of wine drinkers (the client's parents and their friends) who want to remember what they poured, how they scored it, and what the others opened.
- **Reference:** the printed wine label (a cream label plate) against the dark of a cellar, laid out as a poster grid.
- **Palette** (70 / 20 / 10):
  - 70, ground: cellar-dark `#14100D`, surface `#1B1612`, hairlines `rgba(233,222,200,.14)` (decorative only); control borders and empty stars `rgba(233,222,200,.39)` for 3:1 non-text contrast.
  - 20, text and plates: `#EFE6D2` headings, `#E8DFCB` body, muted `#9A9086` / `#988F84` / `#918A7F` (raised 2026-09-13 so small text clears 4.5:1 even on the textured ground), plate `#EDE3CE` with ink `#241C13`.
  - 10, accent: straw gold `#C9A961` (hover `#E3CE8B`) for strokes, outlines, small marks.
  - Colour-in-glass ramp, **data marks only** (3px bars and swatches, never fills or theme colour): straw `#E3CE8B`, gold `#D8A93F`, onion `#D99A7A`, violet `#7A3B6E`, garnet `#8E1F2C`, tawny `#8A4B22`.
- **Type:** Cormorant Garamond for wine names, headings and figures (label typography); Archivo for UI text and the small letterspaced caps (label small print). Both are OFL via Google Fonts, no paid tier.
- **Radius:** 3px on buttons, inputs, chips and the header badge; 0 on tiles, plates and photographs. Nothing else.
- **Motion** (all under `prefers-reduced-motion: reduce` switch to none):
  - colour, border and background transitions on hover and selection, 110 to 140ms ease-out
  - tab rail slide, 180ms `cubic-bezier(.2,.7,.3,1)`
  - tile press scale to .985
  - star fill width, 120ms
  - profile breakdown bar width, 200ms
- **Banned in this project:** purple gradients, pill-shaped buttons, vague hero copy, emoji used as icons, em dashes in any copy, filled gold buttons (primary actions are a gold outline, at most a 12% gold tint), deep green grounds, Tangerine or any script face, the colour ramp standing in for a score, fake reviews or metrics.

Locked 2026-09-12. Ground colour settled as cellar-dark by the client's developer after the design import.
