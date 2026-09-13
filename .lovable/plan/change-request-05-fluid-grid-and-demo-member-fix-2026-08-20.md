# Change request 05 — fluid grid and demo member fix

## 1. Demo member attribution

- Create six demo accounts (Dave, Carol, Jim, Susan, Marcy, Ray) with profiles stored as `[demo] Dave`, etc., so the existing one-step wipe (delete by `[demo]` prefix) still works.
- Redistribute the twenty seeded ratings unevenly: 6 / 5 / 3 / 3 / 2 / 1 across the six.
- Redistribute the five seeded wishlist entries across three of them.
- Strip the `[demo] ` prefix at display time only (in the data layer's profile mapping), so tiles read "Dave", never "PREVIEW". Stored value untouched.
- The Feed count line already computes live from the feed rows, so it will then read TWENTY BOTTLES · SIX OF YOU on its own — no hardcoding.

Note: the demo profiles need matching auth rows for the profile foreign key, so the seed inserts minimal, non-loginable demo auth users. The existing wipe SQL already removes them.

## 2. Fluid grid

- `TileGrid`: single rule, no breakpoint classes —
  `repeat(auto-fill, minmax(clamp(130px, 14vw, 190px), 1fr))`, column gap 14px, row gap 28px.
- Remove `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.
- `AppShell` gains a full-width content mode used by Feed and Shelf: drop `max-w-2xl`, page padding 20px, 40px from 768px up. Header block and grid therefore share the same left edge.
- Other screens (add, wine detail, member, join) keep the current narrow measure — long-form reading, not a grid.

## Not touched

Drill-down search, auth/invite/join, typography, palette, spacing ratios, microcopy, schema.

## Verification

Screenshots at 320px, 768px, 1440px and 2560px: column count grows smoothly, partial rows stay left-aligned at normal size, no horizontal scroll at 320px.
