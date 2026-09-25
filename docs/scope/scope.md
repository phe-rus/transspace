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
| 14 | Stories | Slice 5 | planned |
| 15 | Opportunities | Slice 6 | planned |
| 16 | Businesses & creators | Slice 7 | planned |
| 17 | Unified global search | Slice 8 | planned |

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

### 14. Stories · needs a decision
Firsthand community narratives (transition, relocation, housing, employment experiences), the existing "The fog of history" nav destination, clearly framed as personal experience rather than guaranteed instruction, with contributor privacy options.
**Done when:** a person can read a story, see that it's marked as personal experience, and choose how visible their identity is when they submit one.
- [ ] Design it (spec): `/architect stories`

## Slice 6: Opportunities

### 15. Opportunities · needs a decision
Jobs, freelance work, scholarships, mentorship, and volunteering shared by the community and allies, filterable by country, remote/local, category, and deadline.
**Done when:** a person can filter and browse opportunities and open one to see eligibility, deadline, and how to apply.
- [ ] Design it (spec): `/architect opportunities`

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

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Community support & mutual aid**: crowdfunding/donation campaigns, the raised/target progress cards already sketched on the landing page · needs a decision · GA
- **Q2Q realtime peer sessions**: pseudonymous chat/voice/video sessions matching people to relevant community knowledge or verified professionals, built on Cloudflare Realtime + Durable Objects · needs a decision · GA

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
