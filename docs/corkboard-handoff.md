# Corkboard: project handoff for analysis

This document describes Corkboard as of September 13, 2026: what it is, how it was built, how it works, and what is still open. It is written for a reviewer (human or Claude) who has not seen the codebase. Nothing here is secret: no keys, passwords or personal member data are included.

Questions worth answering are listed at the end, in "What to analyse".

---

## 1. What Corkboard is

Corkboard is a private, invite-only wine journal. Think "Letterboxd for wine" for one small circle: the developer's parents and their wine-drinking friends. Members log bottles they have opened, rate them (stars, optional private 100-point score), add photos and notes, keep a wishlist, and see what the others poured.

- **Live at:** https://corkboard.wine (Cloudflare Workers), since September 12, 2026.
- **Audience size:** a handful of people. Three member accounts exist today, one of which is a development "Preview" account due for deletion.
- **Business model:** none. Free, no ads, no analytics. It is a paid client project for the developer, not a commercial product.
- **Must stay open to change:** invite-only at launch, but the developer wants the option of opening it more widely later.
- **Primary device:** iPhone. Roughly 95% of expected members use iPhones, which drove the HEIC photo work.
- **Regulated subject:** alcohol, so members confirm they are 21 or older when joining.

## 2. How it was built (timeline)

1. **Lovable prototype (August 2026).** The first version, then called "Grapevine Ratings", was generated in Lovable, a prompt-to-app builder. Lovable produced a TanStack Start app on "Lovable Cloud" (a Supabase project the developer could not administer). Thirteen of the database migrations date from this phase.
2. **Migration off Lovable (September 12, 2026).** The Lovable export was moved into its own repository, and the backend was moved to a Supabase project the developer owns (West US, Oregon). A legacy migration had to be patched to run on a fresh database.
3. **Visual rebuild.** The UI was rebuilt from a Claude Design file ("Corkboard Home.dc.html"). The developer locked a design direction in `DESIGN.md` (see section 7), and the home grid, bottle page, log form and profile were restyled against it.
4. **Label photo identification.** A member photographs a bottle and Claude (Opus 5) reads the label; the result is matched against LWIN, a public database of about 185,000 wines. It was tuned against 28 real iPhone photos from the developer (see section 5).
5. **iPhone photo support.** Browsers other than Safari cannot read HEIC, the iPhone's photo format, so a converter is loaded on demand.
6. **Pre-launch review.** A "ship gate" review (security, privacy, legal, accessibility) found seven blockers. All were fixed and tested live:
   - membership enforced in every database policy
   - a first-member bootstrap loophole removed
   - public sign-up disabled
   - a 21+ confirmation added
   - password reset added
   - account deletion added
   - draft policy pages written
   - an accessibility pass to zero automated violations
7. **Launch (September 12 and 13, 2026).**
   - domain bought (corkboard.wine, registered at Namecheap, DNS on Cloudflare)
   - email through Resend
   - deployment to Cloudflare Workers
   - security headers, and http and www redirects
   - a new favicon

**Tooling.** The rebuild, features, review and deployment were done with Claude Code (Claude Opus 5) in the Claude desktop app. The developer used three custom skills:
- **design-lock:** locks a visual direction and audits the UI for generated-looking design.
- **ship-gate:** the pre-publish security, privacy and legal checklist.
- **ponytail:** a "write the least code that works" discipline.

The code lives in a private GitHub repository (TreyMot/Corkboard).

## 3. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | TanStack Start 1.168 (React 19, TanStack Router 1.170, file-based routes) | Server-side rendering; server functions via `createServerFn` |
| Build | Vite 8, Nitro 3 beta (`cloudflare-module` preset) | Build config comes from `@lovable.dev/vite-tanstack-config`, a Lovable leftover still in use |
| Styling | Tailwind CSS v4 with custom `@utility` classes, some shadcn/Radix components | 46 shadcn component files exist; only some are used |
| Data fetching | TanStack Query 5 | |
| Database, auth, storage | Supabase (Postgres with row-level security, email and password auth, two storage buckets) | |
| AI | Anthropic TypeScript SDK 0.125, model `claude-opus-5` | Server-side only |
| Validation | Zod 3 (and `zod/v4` for the structured-output schema) | |
| Hosting | Cloudflare Workers, worker name `corkboard` | Static files served from Workers assets |
| Email | Resend, through Supabase's custom SMTP | Only password-reset emails are sent |
| Fonts | Cormorant Garamond and Archivo, self-hosted through Fontsource | Open Font Licence |

About 8,600 lines of TypeScript outside the generated UI kit. The largest files:
- `src/routes/_authenticated/add.tsx` (the log form, about 1,100 lines)
- `src/lib/rim.ts` (the data layer, about 680 lines)
- `src/integrations/supabase/types.ts` (generated)

## 4. Architecture

### Routes

| Path | Access | Purpose |
|---|---|---|
| `/` | public | Sign in, Join (invite code or pre-approved email), Forgot password |
| `/reset-password` | public | Set a new password from the emailed link |
| `/privacy`, `/terms`, `/accessibility` | public | Draft policy pages |
| `/feed` | members | Home: poster grid of logged bottles, with Cellar, Wishlist and Circle tabs; search; sorting by recent, rating or vintage |
| `/add` | members | Log a bottle: label photo, drill-down search (producer, range, bottling, vintage), rating, notes |
| `/entry/$entryType/$entryId` | members | One bottle: photos, rating, notes, private details |
| `/wine/$wineId` | members | One wine across all members' ratings; shared wine details anyone can correct |
| `/member/$userId` | members | One member's ratings |
| `/shelf` | members | Your profile: avatar, stats, invite codes, account deletion |
| `/api/public/hooks/purge-photos` | token | Cleanup webhook for removed photos. Not scheduled yet; refuses every call until a token exists. |

Every members-only route sits under `_authenticated/route.tsx`. It checks the Supabase session and then membership. Membership means the account has a row in the `profile` table, not just a login.

### Server functions (the only code that runs with elevated rights)

| Function | File | What it does |
|---|---|---|
| `joinWithInvite` | `src/lib/join.functions.ts` | Checks the invite code or pre-approved email and the 21+ confirmation, creates the auth user through the admin API, creates the profile. Can finish an account that exists without a profile, but only after verifying its password. |
| `identifyLabel` | `src/lib/label.functions.ts` | Checks membership, sends the label photo to Claude, and returns structured fields |
| `deleteMyAccount` | `src/lib/account.functions.ts` | Removes the member's storage files, then deletes the auth user. Database rows are removed by cascade. |
| `ensureDemoMember` | `src/lib/demo.functions.ts` | Development-only shortcut; refuses to run in production builds |

Everything else runs in the browser with the member's own session, and the database's row-level security decides what they can read and write. The service-role key is used only inside server functions and is never sent to the browser. This was checked by scanning the deployed files.

### Request path in production

A request reaches Cloudflare, which serves static files directly and passes everything else to the worker entry, `src/server.ts`. That entry:

1. redirects `www` and `http` to `https://corkboard.wine`
2. hands the request to TanStack Start for server rendering or a server function
3. adds the security headers (production only)
4. replaces the framework's bare error responses with a styled error page

## 5. Label photo identification

This is the most technically interesting feature.

**Flow**
1. The member taps "Photograph the label".
2. The browser decodes the photo (converting HEIC if needed) and scales it to at most 1568 px on the long edge, as a JPEG at quality 0.85.
3. The browser sends it to the `identifyLabel` server function.
4. The server confirms the caller is a member, then calls `client.beta.messages.parse` with:
   - `model: "claude-opus-5"` and `effort: "low"`
   - structured output from a Zod schema
   - Anthropic's server-side fallback beta
   - a workspace header
5. Claude returns a `LabelRead`: legible, several_wines, producer, cuvee, vintage, non_vintage, appellation, country, varietal, style, volume_ml. The prompt says null means "not printed", never a guess. Non-Latin scripts are transliterated.
6. The browser calls `match_label()` in Postgres. It compares the read against the circle's own wines first, then LWIN, using trigram similarity (`pg_trgm`) and accent-stripping (`unaccent`).
7. If `confidentMatch()` in `src/lib/label-match.ts` accepts the top result, the wine is adopted, through `adopt_lwin_wine()` when it comes from LWIN. Otherwise the form is prefilled with what was read, and the wine is marked "Not matched to LWIN".
8. The prefilled log form is the review step. The member corrects anything before saving. No separate confirmation screen is shown.

**Matching rules, learned from real photos**
- Generic producer words are stripped before comparing: chateau, domaine, vineyards, cellars and similar (`label_core()`).
- Several name candidates are tried: the cuvee, cuvee plus grape, the grape alone, and the appellation.
- A label's producer can equal an LWIN wine name only when the label has no cuvee.
- A style or colour mismatch costs 0.15.
- Confirmation requires a name score of at least 0.7. This blocks "right producer, wrong wine".
- The cut-offs are: confident 0.72, clear lead 0.08, exact 0.99, name minimum 0.7. A runnable check sits at `scripts/label-match.check.ts`.

**Results so far:** tested on the developer's 28 real iPhone photos. The final tuning gave 8 correct LWIN matches and 0 wrong ones. The rest fell back to the prefilled form, which is the intended safe failure. About 40% of the photos showed several bottles; the model flags this and the form says which bottle it read.

**Data:** LWIN (from Liv-ex) is licensed CC BY 4.0. The attribution and licence link appear on wine pages. It was seeded once by `scripts/seed_lwin.py` (185,366 "Live" wine and fortified rows); the script can be re-run.

**Security:** only the server holds the Anthropic key. Only members can call the function and run the match. Members cannot set `wine.verified` or `wine.lwin7` directly because of column-level grants; only `adopt_lwin_wine()` can.

**Not measured:** the cost per label read, and accuracy on foreign labels.

## 6. Data model

**Tables** (all in `public`, all with row-level security):

| Table | Holds |
|---|---|
| `profile` | One row per member: display name, avatar, `age_confirmed_at`. Its existence is membership. |
| `allowed_email` | Pre-approved emails that can join without a code (the two founders) |
| `invite` | 8-character single-use codes a member creates; expire after 30 days |
| `wine` | Shared wine identity: producer, cuvee, colour, glass colour, varietal, vineyard, location, country, `lwin7`, `verified` |
| `bottling` | A wine's vintage and bottle size |
| `rating` | One member's rating of a bottling: stars, note, place, date |
| `rating_private` | Private to the rater: 100-point score, bottles owned |
| `wishlist_item` | Private wishlist entries |
| `entry_photos` | Photo records for ratings and wishlist items, soft-deleted through `deleted_at` (view `entry_photos_active`) |
| `wine_edit_log` | Every correction to shared wine details: who, when, what |
| `lwin_wine` | The LWIN reference data, with trigram indexes |
| `job_token` | Secret for the purge webhook (empty, so the webhook is off) |

**Functions:**
- `is_member()`: runs with elevated rights and a pinned search path; granted to signed-in users only.
- `match_label()`: runs with elevated rights and checks membership itself.
- `adopt_lwin_wine()`, `label_core()`, `label_field_score()`, `search_producers()`.

**Security model**
- Every policy requires `(SELECT public.is_member())`. Wrapping the call in a SELECT lets Postgres evaluate it once per query instead of once per row, which fixed a timeout.
- Profile self-insert is revoked, so the only way in is the `joinWithInvite` server function.
- TRUNCATE, TRIGGER and REFERENCES are revoked.
- Text length limits are enforced as CHECK constraints: notes up to 2,000 characters, display names 1 to 60.

**Storage:** two buckets, `avatars` and `entry-photos`, private. Each has a 10 MB limit and accepts only JPEG, PNG and WebP. Photos are served through signed URLs that last one hour.

**Migrations:** 22 in `supabase/migrations/`. Thirteen come from Lovable. Nine were added on September 12 and 13: design fields, label identification, three rounds of match tuning, membership hardening, the membership speed fix, the elevated-rights match function, and age confirmation.

## 7. Design system (from `DESIGN.md`)

- **Reference object:** a printed wine label (a cream plate) against the dark of a cellar, laid out as a poster grid.
- **Palette:**
  - ground `#14100D` and surface `#1B1612`
  - cream label plates `#EDE3CE` with ink `#241C13`
  - text `#EFE6D2` and `#E8DFCB`; muted greys raised to pass 4.5:1 contrast
  - one accent, straw gold `#C9A961`, used only for strokes, outlines and small marks
- **Colour-in-glass ramp** (straw, gold, onion, violet, garnet, tawny): data marks only, never fills, and never a stand-in for a score.
- **Type:** Cormorant Garamond for wine names, headings and figures; Archivo for interface text and small letterspaced caps.
- **Radius:** 3px on controls, 0 on tiles and photos.
- **Motion:** a short, listed set of transitions, all switched off under reduced-motion settings.
- **Banned:** purple gradients, pill-shaped buttons, vague hero copy, emoji as icons, em dashes in copy, filled gold buttons, script faces, fake reviews or metrics.

## 8. Photos

- **Decoding:** the file type is detected from the file's own header, not its name. HEIC files are converted in the browser by `heic-to` (libheif compiled to WebAssembly, about 3 MB, loaded only when needed). iPhone Safari already hands web pages JPEGs.
- **Re-encoding:** every photo is re-drawn on a canvas before upload. This strips location and camera data.
  - Bottle photos: full size 1200 px long edge, plus a 400×600 thumbnail.
  - Avatars: 800 px.
- **Cropping:** a crop sheet with drag and arrow-key panning.
- **Removal:** removed photos are soft-deleted (hidden at once). They are physically erased only when the account is deleted, because the purge job is not scheduled. The privacy policy says exactly this.

## 9. Security and privacy posture (verified live)

- **Anonymous visitors** are refused by every table, view and function.
- **A signed-in non-member** sees empty results everywhere and cannot create a profile.
- **Public sign-up is disabled** in Supabase (the API returns 422).
- **Account deletion** is complete: the auth user, database rows and storage files all go.
- **21+ confirmation:** required by the server, not just the form, and its date is stored.
- **Security headers in production:**
  - a Content Security Policy that allows only the site itself, plus Supabase for data and images
  - HSTS, nosniff, `X-Frame-Options: DENY` and a referrer policy
  - a permissions policy that turns off the microphone, location, payments and USB
  - The policy has to allow inline scripts (server-rendered pages hydrate through inline script tags), plus `blob:` workers and WebAssembly for the HEIC converter.
- **No trackers:** no analytics, no ads, no third-party scripts, and no requests to Google Fonts.
- **Search engines:** `robots.txt` tells them to stay out.
- **Secrets:** the deployed public files were scanned for secret values and none were found. `.env` is git-ignored.
- **Accessibility:** zero violations from the axe-core automated checker on every main screen.
  - a skip link and focus traps in dialogs
  - star-rating hit targets widened
  - contrast measured, not eyeballed
  - not yet tested with screen readers or by members with disabilities

## 10. Deployment and operations

- **Deploy:** `npm run build`, then `npx wrangler deploy` from the repository root. Nitro merges the root `wrangler.jsonc` (worker name, logs, the two custom domains) into the generated config.
- **Runtime secrets on Cloudflare** (names only): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_WORKSPACE_ID`.
- **Build-time public values:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, baked into the browser code.
- **DNS on Cloudflare:**
  - the two app domains, created by the deploy
  - Resend's DKIM key at `resend._domainkey`, and CNAMEs at `send` and `rsend`
  - a DMARC policy of `p=reject` with strict alignment
  - `v=spf1 -all` on the bare domain, and a catch-all DKIM record with an empty key (the domain itself sends nothing; Resend sends through `send.corkboard.wine`)
- **Email:** Supabase sends only password-reset emails, through Resend, from `no-reply@corkboard.wine`, using a Corkboard-styled template kept in `supabase/templates/recovery.html`.
- **Logs:** Workers Logs is on. There is no alerting yet.
- **Scripts:**
  - `scripts/seed_lwin.py`: re-seeds LWIN
  - `scripts/label-match.check.ts`: checks the match cut-offs
  - `scripts/delete-preview-member.sql`: removes the development Preview account
- **Workflow:** no CI and no automated tests beyond that match check. Linting and type-checking are run by hand.

## 11. Third parties and licences

| Service | Role | Data it sees |
|---|---|---|
| Supabase | Database, auth, storage (US, Oregon) | Everything members store |
| Anthropic | Label reading | Only label photos a member chooses to send |
| Cloudflare | Hosting, DNS | Requests, IP addresses in logs |
| Resend | Password-reset email | Member email addresses, reset links |
| Namecheap | Domain registrar | None beyond registration |
| GitHub | Private source repository | Code only |

Licences:
- LWIN: CC BY 4.0, attribution shown.
- heic-to: LGPL-3.0. A licence notice still needs shipping.
- Fonts: OFL.
- lucide icons: ISC.
- Radix and shadcn: MIT.

## 12. Decisions already made (do not re-litigate)

- **Label reading:** Claude Opus 5, server-side.
- **LWIN:** a one-time seed that can be re-run, not a scheduled sync.
- **Unmatched wines:** a quiet "Not matched to LWIN" note. No marker on tiles.
- **Review step:** the prefilled form is the review; no confirmation screen.
- **Barcode scanning:** dropped for good. Reference-image matching was ruled out.
- **Design:** the ground is cellar-dark `#14100D`. The drill-down log search is kept even though the design file showed a flat form.
- **Joining:** founders join through the pre-approved email list; everyone else needs an invite code. There is no first-member bootstrap.
- **Age limit:** 21+.
- **Policy pages:** good-faith drafts, not legal review. The developer will consult a lawyer later and accepts the risk for this family-and-friends group.

## 13. Known gaps and open items

**Needs doing before inviting more people**
- Delete the development "Preview" member (it shows up in the circle). Use `scripts/delete-preview-member.sql`.
- Set a monthly spending cap on the Anthropic workspace.

**Should fix**
- No rate limit on `identifyLabel`, joining, or the purge webhook.
- Invite codes use `Math.random()`. `crypto.getRandomValues()` is the correct source for anything guess-resistant.
- The purge webhook compares its token with `!==`; a constant-time comparison is the norm. The purge job is also not scheduled.
- There is no error alerting. Logs exist, but nobody is notified.
- Lovable leftovers:
  - the Lovable error reporter
  - `previewAuthStorage`
  - `@lovable.dev/cloud-auth-js` and the `@lovable.dev/vite-tanstack-config` build wrapper
  - `AGENTS.md` and the `.lovable/` folder
- Dependency hygiene: an npm release cooldown and `ignore-scripts`, the `js-yaml` override, and the heic-to LGPL notice.
- Move from Supabase's legacy JWT service-role key to the newer `sb_secret_` key format.
- Handoff documents for the client: account ownership, recurring costs, key rotation, a data inventory and an incident one-pager.
- Error messages are not yet tied to their form fields for screen readers (`aria-describedby`).
- Remaining design-rule drift:
  - filled gold buttons on the 404 and error pages and in the toast action
  - gold tints above 12% in a few places
  - a few stray border radii

**Unknowns**
- The cost per label read.
- Label accuracy on foreign labels.
- Behaviour with more than a handful of members; not load-tested, though the expected load is tiny.
- Screen-reader usability.

## 14. Repository map

```
src/
  server.ts                    Worker entry: redirects, security headers, error page
  start.ts                     TanStack Start setup
  styles.css                   Design tokens and utilities
  routes/
    __root.tsx                 Head tags, fonts, auth listener
    index.tsx                  Sign in / Join / Forgot password
    reset-password.tsx, privacy.tsx, terms.tsx, accessibility.tsx
    _authenticated/            Members-only area (route.tsx is the guard)
      feed.tsx, add.tsx, entry.$entryType.$entryId.tsx, wine.$wineId.tsx,
      member.$userId.tsx, shelf.tsx
    api/public/hooks/purge-photos.ts
  lib/
    rim.ts                     Data layer: wines, ratings, wishlist, invites
    photos.ts                  Decode, HEIC fallback, crop, re-encode, upload, signed URLs
    label.functions.ts         Claude label reading (server)
    label-match.ts             Match confidence rules
    join.functions.ts          Joining (server)
    account.functions.ts       Account deletion (server)
    demo.functions.ts          Development-only preview member (server)
    varietal.ts                Grape name normalisation
  components/                  AppShell, WineTile, EditWine, EntryPhotos, PhotoCropSheet,
                               Stars, SiteFooter, LegalPage, useModal, WineBits, ui/ (shadcn)
  integrations/supabase/       Browser client, server admin client, auth middleware, types
supabase/
  migrations/                  22 SQL migrations
  templates/recovery.html      Password-reset email
  config.toml
scripts/                       seed_lwin.py, label-match.check.ts, delete-preview-member.sql
public/                        favicon.ico, apple-touch-icon.png, robots.txt, _headers
DESIGN.md                      The design lock
wrangler.jsonc                 Cloudflare worker name, logs, domains
```

## 15. What to analyse

Useful questions for a reviewer:

1. **Architecture:** is splitting the work between browser-side Supabase calls under row-level security and a few elevated server functions sound for this scale? What would change if the circle grew to a few hundred people or opened to the public?
2. **Security:** given the policies and grants described in section 6, is there any path for a signed-in non-member, or a member, to read private data (another member's private scores, wishlist or wishlist photos) or to escalate privileges?
3. **Label identification:**
   - Are the matching thresholds well reasoned?
   - How would you build an evaluation set, and what would you measure?
   - Is Opus 5 at low effort the right cost and accuracy trade-off for a label read?
4. **Lovable exit:** what is the cleanest way to remove the remaining Lovable dependencies, especially the build wrapper, without breaking the Cloudflare build?
5. **Operations:** what is the minimum useful alerting and backup setup for a one-developer, family-and-friends app on Supabase and Cloudflare?
6. **Product:** what would make the app more useful to older, non-technical iPhone users who mostly want to remember what they drank and what their friends liked?
7. **Code health:** `add.tsx` is about 1,100 lines and `rim.ts` about 680. Are there splits worth making, or is this fine for the size of the project?
8. **Privacy:** do the draft privacy and terms pages match what the system actually does, as described here? This is not a request for legal advice.
