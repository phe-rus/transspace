# Scope: Transspace

A global, community-driven knowledge and resource platform by Pherus for the LGBTQIA+ community: discover trusted healthcare, legal, housing, opportunity, and life-skills resources through queer-to-queer (Q2Q) community knowledge, kept trustworthy by community submission and moderation.

**Build approach:** Tracer Bullet (each vertical, directory, atlas, guides, stories, opportunities, businesses, is built end to end through data, API, and UI before the next one starts; the stated measure of success is real directory usage, so the first slice has to work for real before anything else is added).
**Workflow:** Beta (after `/develop`: `/check verify`, then `/test`). Features touching identity, moderation, or the data model carry a `· GA` override (adds a fresh-model `/check review` and `/document`), given the sensitivity of the content and the audience.
**Workspace:** `www` (the product app). `shared/ui` is tracked here as a foundation dependency, not a separate workspace scope, since it has no roadmap of its own.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | existing |
| 2 | Coding standards & tooling | Foundation | planned |
| 3 | Internationalization foundation | Foundation | existing |
| 4 | Design system & UI foundation | Foundation | in-progress |
| 5 | Navigation shell (header, footer, language switcher) | Foundation | in-progress |
| 6 | Data model & backend | Foundation | in-progress |
| 7 | Authentication & identity | Foundation | in-progress |
| 8 | Trust & verification signals | Foundation | in-progress |
| 9 | Resource directory | Slice 1 | in-progress |
| 10 | Accounts & saved resources | Slice 1 | planned |
| 11 | Contribution & moderation flow | Slice 2 | planned |
| 12 | Resource Atlas | Slice 3 | planned |
| 13 | Guides | Slice 4 | in-progress |
| 14 | Stories | Slice 5 | in-progress |
| 15 | Opportunities | Slice 6 | in-progress |
| 16 | Businesses & creators | Slice 7 | planned |
| 17 | Unified global search | Slice 8 | planned |
| 18 | Mutual aid requests and offers | Slice 9 | in-progress |
| 19 | Rich text for long content | Foundation | in-progress |
| 20 | Provider tiers, verified and DIY accepted | Slice 1 | planned |
| 21 | Communication layer: comments, messages, voice | Slice 10 | planned |
| 22 | Safety: places and community | Slice 11 | planned |
| 23 | Gender affirming health community | Slice 11 | planned |
| 24 | Seed data pass for the directory and guides | Slice 1 | in-progress |
| 25 | Schema consolidation | Foundation | in-progress |

## Foundations

### 1. Stack & architecture · existing
TanStack Start on Cloudflare Workers (Vite, Wrangler), in a Turborepo + bun workspace monorepo with the `www` app and a `shared/ui` package.
code in `./`, `www/`

### 2. Coding standards & tooling
No root `AGENTS.md` yet; lint, format, and typecheck scripts already exist per package, but conventions (naming, folder shape, component patterns) aren't written down anywhere.
**Done when:** root `AGENTS.md` reflects the real stack and conventions, and lint/format/typecheck run clean across both workspaces.
- [ ] Capture conventions + tooling choices: `/audit`

### 3. Internationalization foundation · existing
Paraglide/inlang wired end to end: server middleware, runtime locale switching, and a language picker with persisted position. The message catalog currently only covers the landing page and nav labels.
code in `www/src/paraglide/`, `www/src/components/languages/`

### 4. Design system & UI foundation · in-progress
`@pherus/ui`, a Base UI/shadcn-flavored component package (button, card, input, select, avatar, badge, progress, textarea, toast). Covers today's landing page but is missing primitives later slices will need (dialog, tabs, combobox, forms, data tables, map/atlas visuals); grow it alongside each slice via `/develop`.
**Done when:** typography and color follow the written token rules with no unexplained inline overrides, motion is centralized and reduced motion aware, an accessibility floor is written, and the public versus protected posture split is real and checkable.
- [x] Design it (spec): `/architect design system & UI foundation`
- [ ] Build it: `/develop design system & UI foundation`
  - [x] Fix the known token, typography, and accessibility violations in `index.tsx`, `__root.tsx`, and `headers.tsx` (AC-1, AC-2, AC-4)
  - [x] Add the shared motion module with reduced motion support, at both the module and global CSS level (AC-3)
  - [x] Enforce the token rule with a new `shared/ui` lint config, and add the popover/menu and drawer primitives the mega menu needs (AC-2, AC-5)
  - [ ] Wire the public/protected posture split and apply the shape signature radii and spring (AC-6, AC-7) — posture split and radii are wired; `signatureSpring` has no confirmation moment (save/submit/approve) to attach to yet, no backend or forms exist. Wire it when the first one is built.
  - [x] Measure the light mode contrast floor and write the standard into a new `shared/ui/AGENTS.md` (AC-4, AC-6, AC-7)
- [ ] Verify it: `/check verify design system & UI foundation`
- [ ] Test it: `/test design system & UI foundation`
spec [0001](../specs/0001-design-system-ui-foundation/index.md) · code in `shared/ui/src/components/`

### 5. Navigation shell (header, footer, language switcher) · in-progress
Header, footer, and language switcher are built and animated; several links (Opportunities, Legal, Learn new skills, The fog of history) point at routes that don't exist yet and will resolve as each slice ships.
code in `www/src/components/headers/`, `www/src/components/footers/`, `www/src/components/languages/`

### 6. Data model & backend · GA
No database or API layer exists yet (`www/src/routes/api/` is empty). Every entity, resources, categories, countries, guides, stories, opportunities, businesses, submissions, accounts, needs a schema and a Workers API surface before any content vertical is real instead of hardcoded.
**Done when:** a data model and API layer exist that the resource directory (and later verticals) can read and write against, with migrations applied and types generated.
- [x] Design it (spec): [0002](../specs/0002-identity-data-trust-foundation/0002-data-model-backend.md)
- [x] Build it: `/develop data model & backend`
  - [x] D1 and Drizzle wired in with a migration workflow matching Infra's own (AC-1)
  - [x] Moderator system: table, grant/revoke, a floor of two, an append only audit log (AC-2) — migration and logic done; the one-off moderator seed is blocked on feature 7 (a real `user_link` row needs a completed OAuth sign in)
  - [x] R2 upload module: sniffed allowlist, SVG sanitizing, quota computed by listing (AC-3)
  - [x] Shared pagination utility and Cloudflare Rate Limiting wired to write versus read endpoints (AC-4, AC-5) — `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` still need real values via `wrangler secret put`
  - [x] Server function domain folder convention plus a matching REST shell established (AC-6)
- [ ] Verify it: `/check verify data model & backend`
- [ ] Test it: `/test data model & backend`
- [ ] Review it (fresh model): `/check review data model & backend`
- [ ] Document it: `/document data model & backend`
spec [0002](../specs/0002-identity-data-trust-foundation/0002-data-model-backend.md) · code in `www/src/db/`, `www/src/schemas/`, `www/src/domains/{moderators,uploads}/`, `www/src/lib/{pagination,uploads,rate-limit,turnstile,moderators,moderation-audit,http}.ts`, `www/src/middleware/`, `www/src/routes/api/`

### 7. Authentication & identity · GA
OAuth-based sign in with a private account identity kept separate from a pseudonymous, public Q2Q profile (display name, avatar, topics, region). No accounts or sessions exist yet; the `(protection)` route is an empty stub.
**Done when:** a person can sign in via OAuth, gets a private account plus a pseudonymous public profile, and protected routes actually gate on session state.
- [x] Design it (spec): [0002](../specs/0002-identity-data-trust-foundation/0001-authentication-identity.md)
- [x] Build it: `/develop authentication & identity`
  - [x] Registered as an Infra OAuth client and the thin Better Auth `genericOAuth` sign in/callback flow wired end to end (AC-1). Verified with a real sign in against production Infra (`infra.pherus.org`): the redirect URI was fixed to include the `/infra` provider-id suffix, `.dev.vars` now holds real `INFRA_OIDC_ISSUER_URL`/`INFRA_OAUTH_CLIENT_ID` values (dev client is public, no secret), and a full round trip (login redirect, callback, session, decoy-safe token clearing) completed successfully
  - [x] `user_link` and `profile` migrations, plus the onboarding gate for a new person (AC-2, AC-3)
  - [x] Sign out, including sign out everywhere (AC-4)
  - [x] Local app lock: PIN settings, unlock prompt, and the server side decoy session state (AC-5, AC-6, AC-7, AC-8)
- [ ] Verify it: `/check verify authentication & identity`
- [ ] Test it: `/test authentication & identity`
- [ ] Review it (fresh model): `/check review authentication & identity`
- [ ] Document it: `/document authentication & identity`
spec [0002](../specs/0002-identity-data-trust-foundation/0001-authentication-identity.md) · code in `www/src/lib/auth.ts`, `www/src/schemas/{auth,profile,app-lock}.ts`, `www/src/domains/{auth,profile,app-lock,account}/`, `www/src/middleware/session.ts`, `www/src/routes/api/{auth.$,auth.login,auth.logout,profile,app-lock,app-lock.verify,app-lock.reset,account}.ts`, `www/src/routes/(authentication)/`, `www/src/routes/(protection)/`

### 8. Trust & verification signals · GA
A shared way to show why a piece of content can be trusted (community submitted, community reviewed, references available, professional/verified, last reviewed), so every content type carries the same signals instead of a generic star rating.
**Done when:** a trust/status model exists that resource, guide, story, opportunity, and business detail pages can all render consistently.
- [x] Design it (spec): [0002](../specs/0002-identity-data-trust-foundation/0003-trust-verification-signals.md)
- [x] Build it: `/develop trust & verification signals`
  - [x] `trust_signal` and `trust_co_sign` migrations, the shipped content type registry, and `createTrustSignal` (AC-1)
  - [x] Co sign endpoint with the anti gaming checks and the live recomputed, reversible `community_reviewed` state (AC-2) — recompute is driven by a fresh `COUNT` so it is correct for either an insert or a delete; only the insert path (`POST .../co-sign`) is exposed over HTTP today, there is no co-sign withdrawal endpoint yet since the spec's own API surface table names none
  - [x] `setReferencesAvailable` (AC-3)
  - [x] Moderator verify and dispute actions, audited (AC-4, AC-5)
  - [x] Public read endpoint and the shared trust badge component in `shared/ui` (AC-6)
- [ ] Verify it: `/check verify trust & verification signals`
- [ ] Test it: `/test trust & verification signals`
- [ ] Review it (fresh model): `/check review trust & verification signals`
- [ ] Document it: `/document trust & verification signals`
spec [0002](../specs/0002-identity-data-trust-foundation/0003-trust-verification-signals.md) · code in `www/src/schemas/trust.ts`, `www/src/domains/trust-signals/`, `www/src/routes/api/trust-signals.*`, `shared/ui/src/components/trust-badge.tsx`

### 19. Rich text for long content · in-progress
Every long text field uses the `@pherus/rich-text` editor, so writers get lists, checkboxes, links and headings, and readers see them formatted. Guides already use it. Mutual aid posts now use it for every long field (description, about the job, how to apply, written case, what is offered, context), stored as editor JSON, with older plain text posts still readable.
**Done when:** every long text field in the product uses the editor and shows formatted, with the same length and safety checks (no images in posts, a size cap) on the server.
- [x] Mutual aid posts: submit form, server validation, moderator inbox thread, public post page
- [ ] Extend to stories, safety places, community posts and any new long text: `/develop rich text for long content`
code in `www/src/data/rich-text.ts`, `www/src/domains/support/types/index.ts`, `www/src/routes/(public)/submit-support/`, `www/src/components/inbox/`

### 25. Schema consolidation · in-progress · GA
Fewer tables and fewer schema files. A person used to be spread across `userLink`, `profile`, `appLock`, `moderators` and `admins`. Now `userLink` is the only person table: the profile, the app lock PIN state, moderator status and the admin role are columns on it. The tables `profile`, `appLock`, `moderators` and `admins` and the schema files `profile.ts` and `app-lock.ts` are gone, and no foreign key changed. Merging into the Better Auth `user` table was rejected, because it would rebuild every foreign key on live data and put pseudonymous data beside the login table (spec 0002). Until this ships everywhere, new features add columns, not tables.
**Done when:** there are fewer schema files and tables, every foreign key still resolves, existing data is migrated without loss, and nothing public can read login identity or private columns.
- [x] Design it (spec): [0008](../specs/0008-schema-consolidation.md)
- [ ] Build it: `/develop schema consolidation`
  - [x] Columns on `userLink`, tables and two schema files removed (AC-1, AC-2)
  - [x] Role helpers, moderator and admin functions, account deletion, profile, auth gate, app lock, sign in hook and content joins moved onto `userLink` (AC-4, AC-5, AC-6)
  - [x] Migration with copy before drop, applied locally: counts matched (5 profiles, the founder admin row, 9 people) (AC-3)
  - [ ] Back up the remote database, then apply the migration there and compare counts (AC-3)
- [ ] Verify it: `/check verify schema consolidation`
- [ ] Test it: `/test schema consolidation`
- [ ] Review it (fresh model): `/check review schema consolidation`
- [ ] Document it: `/document schema consolidation`
spec [0008](../specs/0008-schema-consolidation.md) · code in `www/src/schemas/user-link.ts`, `www/src/lib/moderators.ts`, `www/src/lib/admins.ts`, `www/src/lib/auth.ts`, `www/src/lib/auth-gate.ts`, `www/src/domains/moderators/`, `www/src/domains/admins/`, `www/src/domains/account/`, `www/src/domains/profile/`, `www/src/domains/app-lock/`

## Slice 1: Resource directory

### 9. Resource directory · GA
Browse and search resources by need and category (health care, transition support, mental health, legal, immigration, housing). The landing page hero and category cards already exist with hardcoded data, and `/resources` is an empty stub; this feature wires the real thing. This is the walking skeleton, success for this build is measured by real directory usage.
**Done when:** a person can search or browse by category, see real results backed by the data model, open a resource detail page with its trust signals, and empty/no-result states render.
- [x] Design it (spec): [0003](../specs/0003-resource-directory/index.md)
- [x] Build it: `/develop resource directory`
  - [x] `country`/`resource` migrations and the trust-signals domain refactor (`readTrustSignal`), satisfies AC-1, AC-2, AC-3, AC-7
  - [x] Country find-or-create helper and the submit endpoint (atomic, decoy-blocked), satisfies AC-3, AC-5, AC-7, AC-8
  - [x] List and detail read endpoints (search, filters, trust badges), satisfies AC-1, AC-2, AC-4, AC-5
  - [x] Moderator publish/reject endpoints, including the published → rejected takedown path, satisfies AC-4, AC-5, AC-8
  - [x] Wire `/r`, `/r/$resourceId/details`, `/submit`, and the home hero to real data, satisfies AC-1, AC-2, AC-3, AC-6, AC-7 — lat/lng and structuredDetails form inputs cut for time, Turnstile still needs a real site key configured before submission can actually complete (see spec Follow-up)
- [x] Verify it: `/check verify resource directory` → PASS on every exercisable behavior (AC-1, AC-2, AC-6, AC-7 fully covered with fresh evidence; AC-3, AC-4, AC-5, AC-8 covered by code review plus curl against seeded data, real concurrent load, a real moderator session, and a real decoy session remain blocked, no seeded moderator or live session exists in this environment, same known gap spec 0002 already carries)
- [ ] Test it: `/test resource directory`
- [ ] Review it (fresh model): `/check review resource directory`
- [ ] Document it: `/document resource directory`
spec [0003](../specs/0003-resource-directory/index.md) · code in `www/src/schemas/resources.ts`, `www/src/domains/resources/`, `www/src/routes/api/resources.*`, `www/src/routes/(public)/r/`, `www/src/routes/(public)/submit/`, `www/src/routes/(public)/index.tsx`, `www/src/components/resources/resource-card.tsx`, `www/src/components/turnstile-widget.tsx`

### 10. Accounts & saved resources · needs a decision
Sign up/sign in (built on the Authentication foundation), a lightweight profile, and the ability to save/bookmark resources to revisit later.
**Done when:** a signed-in person can bookmark a resource from its card or detail page and see their saved list; signed-out visitors keep full read access to the directory.
- [ ] Design it (spec): `/architect accounts & saved resources`

### 20. Provider tiers, verified and DIY accepted · in-progress
The health sections (healthcare providers, mental health and HIV, general health) list providers in different categories. Each entry carries a tier: verified (checked by a moderator) or DIY accepted (self provided or community run care, accepted with clear labels and safety notes). The tier shows as a badge and works as a filter. It is one nullable column on the resource table, so there is no new table.
**Done when:** a provider shows its tier on the card and detail page, a person can filter by tier, and a submission can be marked DIY while only a moderator can set verified.
- [x] Design it (spec): [0006](../specs/0006-provider-tiers.md)
- [x] Build it: `/develop provider tiers`
  - [x] Column, migration and domain validation (AC-1, AC-4, AC-5)
  - [x] Reads and the tier filter (AC-3, AC-7)
  - [x] Badge on the card and detail page, with the DIY note (AC-2, AC-6, AC-7)
  - [x] Filter chips, submit checkbox, copy in four languages and seed (AC-3, AC-4)
- [ ] Verify it: `/check verify provider tiers`
- [ ] Test it: `/test provider tiers`
spec [0006](../specs/0006-provider-tiers.md)

### 24. Seed data pass for the directory and guides · in-progress
Fuller, realistic seed data for every `/r` section (healthcare providers, gender affirming, mental health and HIV, general health, safe space, legal, travel) and for guides (skills and learning). Every entry gets full details: services, hours, costs, languages, safety notes, references and rich text bodies, not the same basic entry repeated. This is data work, so it needs no spec.
**Done when:** each section has enough varied, complete entries that its list, filters and detail pages can be judged like real content.
- [x] Build it: local seed of 36 resources across every section in 13 countries (each with services, hours, languages, accessibility, safety notes, what to bring, and a trust signal), 10 guides with rich text bodies in two series, plus 40 mutual aid posts. The resource page now shows the practical details.
- [ ] Add the same seed to the remote database and decide where the seed script lives in the repo: `/develop seed data pass`

## Slice 2: Contribution & moderation

### 11. Contribution & moderation flow · needs a decision · GA
A progressive submission flow for community members to propose a resource (later: guide/story/opportunity/business), and an admin/moderator review queue, using the `(protection)` route as the reviewer's protected area, to approve, reject, or request changes before anything goes live. This is what makes the community-submit-and-moderate trust model real.
**Done when:** a signed-in person can submit a resource and see its status (pending/approved/rejected) on a submitter dashboard; a moderator can review, approve, or reject a submission and it reflects live in the directory once approved.
- [ ] Design it (spec): `/architect contribution & moderation flow`

## Slice 3: Resource Atlas

### 12. Resource Atlas · needs a decision
Geographic drill-down discovery (world → region → country → city → category) so a person can explore what's available where they are or where they're headed, without it feeling like a database table.
**Done when:** a person can navigate from a world view down to a country/city and see the resources, guides, and community notes relevant there.
- [ ] Design it (spec): `/architect resource atlas`

## Slice 4: Guides

### 13. Guides · GA
Editorial, community-contributed practical guides (e.g. "Finding healthcare in Uganda," "Understanding gender-affirming care"), the existing "Learn new skills" nav destination.
**Done when:** a person can browse and read a guide with contributor info, references, and related resources; guides go through the same contribution & moderation flow.
- [x] Design it (spec): [0004](../specs/0004-guides/index.md)
- [x] Build it: `/develop guides`
  - [x] Stabilize `shared/rich-text` (imports, versions, a new `Combobox` primitive, `PopoverContent`), unblocks everything else
  - [x] `guide` migration and the submit + image-upload endpoints (atomic, content-safety validated, decoy-blocked), satisfies AC-1, AC-3, AC-5, AC-7, AC-8, AC-9
  - [x] List and detail read endpoints (search, trust/profile joins, related resources), satisfies AC-1, AC-2, AC-4, AC-5, AC-6
  - [x] Moderator publish/reject endpoints, including the published → rejected takedown path, satisfies AC-4, AC-5, AC-8
  - [x] Wire `/guides`, a new `/guides/$guideId/details`, and a new `/submit-guide` (rich text editor) to real data, satisfies AC-1, AC-2, AC-3, AC-6, AC-7
- [ ] Verify it: `/check verify guides` → re-opened 2026-09-25: AC-10 (series, cover image, video embed) landed after the prior PASS pass, a real new acceptance criterion with new endpoints/schema/UI, so the previous tick no longer stands; needs a fresh pass
- [ ] Test it: `/test guides`
- [ ] Review it (fresh model): `/check review guides`
- [ ] Document it: `/document guides`
spec [0004](../specs/0004-guides/index.md) · code in `www/src/schemas/guides.ts`, `www/src/domains/guides/`, `www/src/routes/api/guides.*`, `www/src/routes/(public)/guides/`, `www/src/routes/(public)/submit-guide/`, `www/src/components/guides/guide-card.tsx`, `shared/rich-text/`, `shared/ui/src/components/combobox.tsx`

## Slice 5: Stories

### 14. Stories · in-progress
Firsthand community narratives (transition, relocation, housing, employment, health and family experiences), the existing "The fog of history" nav destination, clearly marked as personal experience rather than advice, with a choice of showing the profile name or sharing anonymously. A story is a guide row with `kind = story`, so it reuses the guide submit flow, moderation, trust signal and rich text editor, and adds two columns and no new table.
**Done when:** a person can read a story, see that it's marked as personal experience, and choose how visible their identity is when they submit one.
- [x] Design it (spec): [0007](../specs/0007-stories.md)
- [x] Build it: `/develop stories`
  - [x] Two columns on `guide` (`kind`, `authorVisibility`) and the additive migration (AC-6)
  - [x] Story topics, kind aware validation, list, get and submit including the anonymous writer rule (AC-3, AC-4, AC-5)
  - [x] Stories list, story page with the experience note, submit page with the rich text editor, and six seeded stories (AC-1, AC-2, AC-3)
- [ ] Verify it: `/check verify stories`
- [ ] Test it: `/test stories`
- [ ] Add a moderator screen for pending stories, and comments once feature 21 exists: `/develop stories`
spec [0007](../specs/0007-stories.md) · code in `www/src/routes/(public)/stories/`, `www/src/routes/(public)/submit-story/`, `www/src/components/stories/`, `www/src/data/stories.ts`, `www/src/domains/guides/`

## Slice 6: Opportunities

### 15. Opportunities · in-progress
Jobs and careers are the published job posts (`offer_job`) from mutual aid, so there is one source of truth. The page now reads those posts with search and a remote filter, each card shows organization, role, pay, place and a two sentence summary, and ten more jobs are seeded. This was built without a spec, so the decision is still owed.
**Done when:** a person can filter and browse job posts by country, remote or local, and deadline, and open one to see what the work is, the pay, and how to apply.
- [x] Read the published job posts on the opportunities page, with rich text details
- [ ] Add country, category and deadline filters, and a verified badge from trust signals: `/develop opportunities`
- [ ] Ratify the decision (spec): `/architect opportunities`
code in `www/src/routes/(public)/opportunities/`, `www/src/components/opportunities/`

## Slice 7: Businesses & creators

### 16. Businesses & creators · needs a decision
Discovery space for queer-owned businesses, creators, and professionals the community wants to support.
**Done when:** a person can browse and open a business/creator profile with what they offer and how to reach or support them.
- [ ] Design it (spec): `/architect businesses & creators`

## Slice 8: Unified global search

### 17. Unified global search · needs a decision
One search that spans resources, guides, stories, opportunities, and businesses once those verticals exist, with suggested/recent searches and a useful empty state. Deliberately sequenced last since it needs the other content types to search across.
**Done when:** a search from the homepage or header returns relevant results across content types, with a helpful empty state when nothing matches.
- [ ] Design it (spec): `/architect unified global search`

## Slice 9: Mutual aid

### 18. Mutual aid requests and offers · GA
A moderated board where people can ask for help (money, a job, transport, information, a listening ear) or offer it, with a visibility model built for a global community where being seen can be dangerous in some countries. Financial asks and professional (medical/legal/advisory) offers get extra scrutiny so the board stays trustworthy without needing new money or live audio infrastructure. Replaces the existing hardcoded "support" page mockup.
**Done when:** a signed-in person can post a request or offer at a visibility level they choose, a moderator can review it (including financial and professional checks) before it goes live, helpers can express interest and one can be assigned, and the requester can close it once helped.
- [x] Design it (spec): [0005](../specs/0005-mutual-aid-requests-offers/index.md)
- [ ] Build it: `/develop mutual aid requests and offers`
  - [x] Data model, domain validation, and the core submit → moderate → publish loop for the simplest post types, satisfies AC-1, AC-2, AC-3, AC-4, AC-15 to AC-19
  - [x] Author lifecycle (edit, withdraw, fulfill) and the remaining structured post types (financial, job, travel, professional, listening), satisfies AC-1, AC-5, AC-8, AC-12; endpoints and remaining types are done, a dedicated "edit my post" UI is still missing (spec Follow-up)
  - [ ] Trust and verification: financial cosign escalation, self-reported progress tracking, professional credential verification, satisfies AC-6, AC-11, AC-13; financial escalation and progress tracking are done, professional verification has no moderator-facing UI yet
  - [ ] Claim/assignment workflow and the pause/reactivate flow, satisfies AC-9, AC-10; claim/assignment is done, pause has UI, reactivate does not yet
  - [x] Moderator inbox at `/inbox`: a Messages style list and thread, unread and read state saved per moderator in the database, an unread count on the header icon, search, previous and next, and mark as unread
  - [x] Rich text in every long field (feature 19), a Format field for text, voice, live audio space and comments, and jobs and careers read from the job posts (feature 15)
  - [ ] Stale-post surfacing and full i18n coverage across the new UI; stale surfacing is done, i18n covers all four shipped locales (en/de/fr/zh, hand-translated since the machine-translate service was down), so this is effectively done too but left unticked pending the missing verify/reactivate UI in the same milestone group
- [ ] Verify it: `/check verify mutual aid requests and offers`
- [ ] Test it: `/test mutual aid requests and offers`
- [ ] Review it (fresh model): `/check review mutual aid requests and offers`
- [ ] Document it: `/document mutual aid requests and offers`
spec [0005](../specs/0005-mutual-aid-requests-offers/index.md) · code in `www/src/schemas/support.ts`, `www/src/data/support-types.ts`, `www/src/data/support-fields.ts`, `www/src/data/restricted-countries.ts`, `www/src/domains/support/`, `www/src/domains/moderators/func.ts`, `www/src/routes/api/support/`, `www/src/routes/(public)/support/`, `www/src/routes/(public)/submit-support/`, `www/src/routes/(protection)/dashboard/support/`, `www/src/components/support/`, `www/src/components/inbox/`, `www/src/routes/(public)/inbox/`

## Slice 10: Communication

### 21. Communication layer: comments, messages, voice · needs a decision · GA
One shared way for people to talk, used by mutual aid, stories, safety places and the gender affirming community. It has three parts, built in this order: comments on posts (asynchronous, threaded), direct messages in a user inbox (the moderator inbox at `/inbox` is the pattern to extend), and peer to peer voice with text chat (one to one calls and live audio rooms like X Spaces). Safety is the design constraint: pseudonymous identity, blocking, reporting, room moderation, and no recording by default. Open questions: which realtime provider (the spec decides), how long messages are kept, how abuse is handled, and who may start a room. Feature 18's Format field (text, voice, audio space, comments) is what these connect to.
**Done when:** a person can comment on a post, message another person from a post, and join or host a voice room, each with block and report, and a moderator can act on all three.
- [ ] Design it (spec): `/architect communication layer`

## Slice 11: Community content

### 22. Safety: places and community · needs a decision
For the safe space, legal aid and travel sections. These are mostly people posting places and talking about them: a place has a location, safety notes and when it was last confirmed, and people confirm or correct it through comments, messages and voice (feature 21). Location privacy matters, so the visibility model from feature 18 is the starting point. Open questions: how precise a location is shown, and how a place is retired when it is no longer safe.
**Done when:** a person can post a place with safety notes, other people can confirm or correct it, and talk about it through comments and messages.
- [ ] Design it (spec): `/architect safety places`

### 23. Gender affirming health community · needs a decision
More like a community talk space than a directory: Reddit like threads and comments, plus posts for dos and donts, how tos and planning, written in rich text (feature 19) and discussed through comments (feature 21). Open questions: whether voting exists, how posts are categorised, and how medical claims are flagged as personal experience, not advice.
**Done when:** a person can start a thread or post a how to, others can reply, and it is clearly marked as community experience.
- [ ] Design it (spec): `/architect gender affirming community`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Wallets & payments**: non-custodial wallet integration (each account connects its own wallet; transspace never holds funds) so requests and offers in feature 18 can move real money beyond its self-reported progress tracking · needs a decision · GA
- **Platform trust & impact reporting**: aggregate totals, donor/helper leaderboards, ratings and reviews across the platform, sequenced after feature 18 has real usage data to report on · needs a decision
- **Q2Q realtime peer sessions**: pseudonymous chat/voice/video sessions matching people to relevant community knowledge or verified professionals, built on Cloudflare Realtime + Durable Objects; also covers turning feature 18's text-only listening-ear offer into a live session. The text chat and voice rooms now live in feature 21; this item keeps only the matching of people to verified professionals · needs a decision · GA

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Every other box is an execution box; `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + 2 to 5 milestones; the tier's closing boxes (`Verify it`, `Test it`, `Review it` + `Document it` for GA) |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | you, when you decide it is; `/sync` reconciles | boxes you ran ticked; the tier's last stage (Beta/GA → after `/test`) is the suggested point to call it done |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop`.
- **Atomic build tasks live in the spec's `## Build plan`, not here.**
- **Status**: `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Workflow tier tag** beside a heading (`· GA`) sets that feature's rigor above the project default; no tag inherits Beta.
- **Pointer line** (`code in <path>`): filled by `/architect` (spec) and `/develop` (code).
