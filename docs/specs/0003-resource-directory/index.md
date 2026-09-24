# 0003. Resource directory

**Date**: 2026-09-24
**Status**: In Progress

## Summary

This decides how the resource directory (browse, search, submit, and moderate a listing) actually works, replacing the hardcoded prototype already built at `/`, `/r`, and `/submit`. A person can browse and search published resources by category, country, and city, open a detail page with its trust badges, and (once signed in) submit a new one. A moderator can publish or reject a pending submission. Several riskier pieces the prototype's own copy implied, a vetted-access tier, country-based legal risk gating, and country-scoped moderators, are deliberately left out of this build and flagged for their own future decisions, so the walking skeleton ships without a half-built safety system.

## Requirements

**User stories**:
- As anyone browsing the directory, I want to search and filter published resources by category, country, city, and a few trust/cost signals, so I can find something relevant to me.
- As anyone, I want to open a resource's detail page and see why it can be trusted, so I don't have to guess.
- As a signed-in person, I want to submit a new resource, so the directory grows from real community knowledge, including places the directory doesn't cover yet.
- As a moderator, I want to publish or reject a pending submission, so only reviewed content reaches the public directory.

**Acceptance criteria**:
- **AC-1**: Anyone, signed in or not, can list published resources filtered by category, subcategory, country, city, a keyword search (name, description, city, country), and the verified/free/international toggles, paginated newest first.
- **AC-2**: Opening a resource's detail page shows its full content plus trust badges (professional verified, community reports count, last reviewed) sourced live from the existing trust_signal record for that resource; an unknown or unpublished id returns a not-found state.
- **AC-3**: A signed-in person can submit a new resource; it is created with status `pending`, gets a trust_signal row via the existing `createTrustSignal`, and never appears in the public list or detail view until a moderator publishes it. The resource row and its trust_signal row are created atomically (one fails, neither exists). Submitting to a country not yet in the system creates it, matched case-insensitively so the same name never creates a duplicate row, even under two simultaneous first submissions.
- **AC-4**: Only a moderator can move a resource from `pending` to `published` or `rejected`, or take down an already-`published` resource by moving it to `rejected`; every such action writes a `moderation_action` row via the existing audit function. A moderator can list pending resources through a status filter that returns 403 for anyone else.
- **AC-5**: Every write endpoint (submit, publish, reject) requires Turnstile verification and is write-rate-limited; every read endpoint is read-rate-limited, matching the project's existing cross-cutting rule (spec 0002 AC-5).
- **AC-6**: The location used for `/r`'s "near me" browsing is set manually by the person through a country picker, held only in the page URL; it is never auto-detected from the device or the request's IP, and never written to persistent client storage, and defaults to no location set (browse everywhere). Carve-out, added after initial feedback, the engineer's explicit call: the home hero (`/`) alone may show the visitor's own country, read from Cloudflare's edge-attached `request.cf.country`, the same coarse signal any network intermediary already sees, never anything finer (no city, no coordinate, no IP itself stored or logged). This does not extend to `/r` or any other surface; the manual-only rule above still governs everywhere else.
- **AC-7**: A submission's category/subcategory pair is validated against the shipped registry (422 if unknown); `isFree` and `internationalAccess` are explicit booleans set by the submitter, never inferred by matching text in the cost estimate.
- **AC-8**: A session in decoy/duress mode (spec 0002's `isDecoy` state) can never submit, publish, or reject a resource; the existing `assertNotDecoy` check rejects the attempt.

## Decision

**Chosen option**: Option 1: Minimal walking skeleton, reuse every existing foundation.

## Feature design

**Data model sketch**:

| Table | Field | Type | Notes |
|---|---|---|---|
| `country` | `id` | text, primary key | |
| | `name` | text, required | dynamically created the first time a submission references it; uniqueness is enforced by a functional lowercase index (`lower(name)`), not a plain unique constraint, so casing never creates a duplicate row |
| | `createdAt` | timestamp, required | |
| `resource` | `id` | text, primary key | |
| | `name` | text, required | |
| | `category` | text, required | validated against the shipped `RESOURCE_CATEGORIES` constant |
| | `subcategory` | text, nullable | validated against that category's shipped subcategory list |
| | `countryId` | text, foreign key to `country.id`, required | |
| | `city` | text, required | free text |
| | `lat` / `lng` | real, nullable | stored for the future Resource Atlas feature; not rendered by this feature |
| | `description` | text, required | |
| | `estimate` | text, nullable | cost/wait placeholder shown as-is, e.g. "Free · same day" |
| | `isFree` | boolean, default false | explicit, set by the submitter, never derived from `estimate` |
| | `contact` | text, nullable | |
| | `internationalAccess` | boolean, default false | |
| | `structuredDetails` | text (JSON), nullable | category-specific key/value data, e.g. medications and dosage ranges for a pharmacy; also holds the mock prototype's `services` list under a conventional `services` key (no dedicated column); shape is not validated per category in this build |
| | `status` | text, required | `pending` \| `published` \| `rejected`; moderator-only transitions, including a `published` → `rejected` takedown |
| | `submittedBy` | text, foreign key to `userLink.id`, required | never a client-supplied value, always the session's own id |
| | `createdAt` / `updatedAt` | timestamp, required | |
| unique | `(countryId, name)` | | not enforced; two resources can share a name in the same country (this is a directory of real places, not a uniqueness-guaranteed catalog). A soft duplicate check at submission time (same name/country/city, case-insensitive) is a Follow-up, not built now. |
| search index | `lower(name)`, `lower(city)` | | functional indexes so `GET /resources`'s keyword search is case-insensitive across non-Latin scripts too, not relying on SQLite's default ASCII-only `LIKE` folding |

Logical link, not a foreign key: `resource` ↔ `trust_signal` via `trust_signal.contentType = "resource"`, `trust_signal.contentId = resource.id` (spec 0003 under 0002, already built, `"resource"` already a valid registered content type).

**State transitions**: `resource.status`: `pending` → `published` (moderator only) · `pending` → `rejected` (moderator only) · `published` → `rejected` (moderator only, a takedown of something already live, through the same reject endpoint and audit trail). No transition out of `rejected` in this build (no re-review path yet, see Follow-up).

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/resources` | GET | `category?`, `subcategory?`, `countryId?`, `city?`, `search?`, `verifiedOnly?`, `freeOnly?`, `internationalOnly?`, `status?`, `cursor?`, `limit?` | paginated list of resources (public fields only, no `submittedBy`), ordered newest first | none, no middleware; reads the session if one exists (optional, may be absent) to decide whether a non-`published` `status` is allowed | 422 unknown category, 403 a non-moderator (or no session) requesting a non-published status |
| `/resources/:id` | GET | none | full resource plus its trust_signal projection | none, no middleware; same optional-session check as the list endpoint | 404 not found, or not `published` and the caller isn't a moderator |
| `/resources` | POST | `name`, `category`, `subcategory?`, `countryName`, `city`, `description`, `estimate?`, `contact?`, `internationalAccess?`, `isFree?`, `structuredDetails?`, `lat?`, `lng?`, `turnstileToken` | `id`, `status: "pending"` | session required, decoy sessions rejected | 401 no session, 403 decoy session or Turnstile failed, 422 unknown category/subcategory, 429 rate limited |
| `/resources/:id/publish` | POST | `turnstileToken` | `id`, `status: "published"` | moderator only, decoy sessions rejected | 404, 403, 422 not currently `pending` |
| `/resources/:id/reject` | POST | `turnstileToken` | `id`, `status: "rejected"` | moderator only, decoy sessions rejected | 404, 403, 422 already `rejected` (allowed from `pending` or `published`, a takedown either way) |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `GET /resources` | the published-only filter | `resource.status` column, defaulted to `"published"` unless the caller has a moderator session and explicitly requests another value (read via `getCurrentSession()` + `isModerator()` called directly, no middleware, since the endpoint must still work with no session at all) |
| `GET /resources` | category/subcategory validity | the shipped `RESOURCE_CATEGORIES` / `RESOURCE_SUBCATEGORIES_BY_CATEGORY` constants (`www/src/data/resource-categories.ts`), same pattern as the trust-signal `CONTENT_TYPES` registry |
| `GET /resources` | the `verifiedOnly` filter | a `LEFT JOIN` to `trust_signal` on (`contentType = "resource"`, `contentId = resource.id`), filtered on `trust_signal.professionalVerified = true` when requested |
| `GET /resources` | sort order and pagination | `ORDER BY resource.createdAt DESC, resource.id DESC` (newest first); the cursor is this endpoint's own opaque token encoding `{createdAt, id}` of the last row, not the bare-`id` cursor `lib/pagination.ts` uses elsewhere, since `id` alone (a random UUID) carries no chronological order to page through |
| `GET /resources` | keyword search across name/description/city/country | a case-insensitive match against `resource.name`, `resource.description`, `resource.city` (via the functional `lower()` indexes above) and `country.name` (via a join), not SQLite's default ASCII-only `LIKE` |
| `GET /resources/:id` | trust badges (verified, community reports, last reviewed) | composed server-side by calling a new plain function, `readTrustSignal(contentType, contentId): Promise<TrustSignalRow \| null>`, extracted from the existing trust-signals domain (Build plan task 2) so this composition doesn't run through the `getTrustSignal` server function's own read-rate-limit call a second time or turn a merely-absent trust row into a 404 for the whole resource; "community reports" in the UI is `coSignCount`, and `lastReviewedAt`'s relative display ("3 weeks ago") is formatted client-side, not computed server-side |
| `POST /resources` | `submittedBy` | the session's own `userLinkId` from `SessionMiddleware`'s context, never a request body field |
| `POST /resources` | `countryId` | found-or-created against `country.name` via a case-insensitive lookup (the functional lowercase index above); the create path is an insert-if-absent (e.g. `onConflictDoNothing` on that index) followed by a select, not a plain check-then-insert, so two simultaneous first submissions for the same new country never both fail or both insert. Different spellings of the same real place ("USA" vs "United States") remain distinct rows in this build; merging them is a Follow-up, not solved here. |
| `POST /resources` | initial `status` | fixed to `"pending"`, never client-settable |
| `POST /resources` | the resource row and its `trust_signal` row | created together in one atomic D1 batch (the existing `createTrustSignal("resource", resource.id, submittedBy)` call and the resource insert either both land or neither does) |
| `POST /resources` \| `/publish` \| `/reject` | the decoy-session block | the existing `assertNotDecoy` check (spec 0002), applied to every write in this feature |
| `POST /resources/:id/publish` \| `/reject` | `moderation_action` row | the existing `logModerationAction`, actor = the moderator's session `userLinkId`, target = the resource id |
| location filter on `GET /resources` (`countryId`, `city`) | "current location" used for browsing | entirely client-side, held only in the page's URL search params; never written to `localStorage` or any other persistent client storage, consistent with this app's decoy/app-lock threat model (a value worth protecting on a seized device) |
| home hero (`/`) "your country" line | the visitor's own country, shown as "Name, CODE" (e.g. "Uganda, UG") | the AC-6 carve-out: `request.cf.country` (an ISO code Cloudflare's edge already attaches), converted to a localized display name via `Intl.DisplayNames` and shown alongside the raw code, never stored server-side; falls back to the country with the most published resources (name only, no code) when `cf.country` is unavailable (e.g. no real Cloudflare edge in front, as in local dev) |

**Key invariants**:
- A resource is visible through the public list or detail endpoints only when `status = "published"`, unless the caller has a moderator session.
- `countryId` always references an existing `country` row; a country row is created at most once per distinct (case-insensitive) name, even under concurrent first submissions.
- A `category`/`subcategory` pair is always validated against the shipped registry before it is stored; an invalid pair is rejected, never silently stored.
- `submittedBy` is always the session's own `userLinkId`; a client can never set it to another account.
- A resource and its `trust_signal` row are created atomically; one never exists without the other.
- Every publish or reject action writes exactly one `moderation_action` row. `reject` is reachable from both `pending` and `published`, so a moderator can take down something already live, not only screen a submission before it goes out.
- `isFree` and `internationalAccess` are explicit booleans set at submission time; nothing derives them from `estimate` or `description` text.
- A decoy/duress session (spec 0002's `isDecoy`) can never submit, publish, or reject; `assertNotDecoy` runs before any write in this feature.
- The manually-picked "current location" is never written to persistent client storage; it lives only in the URL for the current page view.

**Security model**: `GET /resources` and `GET /resources/:id` are public, no middleware, and read-rate-limited, generous and challenge-free, matching the trust-signal read endpoint; each reads the session if one happens to exist (never requiring one) purely to decide whether a non-published status is visible. `POST /resources` requires a session (any signed-in account, no minimum account age, unlike trust-signal co-signing) plus Turnstile, write rate limiting, and the decoy block. `POST /resources/:id/publish` and `/reject` require the caller's `userLinkId` to be present in the `moderators` table (the existing, global, unscoped table from spec 0002); both are Turnstile-verified, write-rate-limited, decoy-blocked, and audited. No compliance scope beyond what the identity/data foundation (spec 0002) already covers; `description`, `contact`, and `structuredDetails` are free text the submitter controls, moderation (including the takedown path) is the safety backstop, and no vetted-access tier exists yet in this build (see Consequences and Follow-up).

**Configuration required**: none. This feature reuses the D1, R2 (unused here), Turnstile, and rate limiter bindings already configured in `wrangler.jsonc`.

**Critical test scenarios**:
- Happy path: a signed-in person submits a resource in a country not yet in the system, a moderator publishes it, and it now appears in `GET /resources` and `GET /resources/:id` with its trust badges, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**
- Failure case: submitting the same new country name a second time (different case/whitespace) reuses the existing `country` row rather than creating a duplicate; submitting an unknown category returns 422, verifies **AC-3**, **AC-7**
- Concurrency: two requests submitting a resource to the same brand-new country name (differing only in case) at the same time both succeed, and both end up referencing the same single `country` row, verifies **AC-3**
- Takedown: a moderator rejects an already-`published` resource; it immediately stops appearing in `GET /resources` and `GET /resources/:id`, and the action is audited, verifies **AC-4**
- Auth/permission: an anonymous `POST /resources` returns 401; a non-moderator calling `/publish`, `/reject`, or `GET /resources?status=pending` returns 403, verifies **AC-4**, **AC-5**
- Decoy safety: a session in decoy mode attempting `POST /resources`, `/publish`, or `/reject` is rejected before any write happens, verifies **AC-8**
- Location handling: with no location set, `/r` browses every country; setting a country/city in the picker filters `GET /resources` by those explicit query params, the value lives only in the URL (nothing appears in `localStorage`), and no request to any endpoint ever carries a browser-geolocation coordinate or relies on request IP, verifies **AC-6**

## Build plan

1. [x] Create the `country` and `resource` migrations for the confirmed data model, including the functional lowercase indexes for uniqueness and search, satisfies **AC-1**–**AC-7**
2. [x] Refactor the existing trust-signals domain (`www/src/domains/trust-signals/func.ts`): extract a plain `readTrustSignal(contentType, contentId): Promise<TrustSignalRow | null>` that both the existing `getTrustSignal` server function and this feature's detail endpoint call, so composing it here doesn't double the read rate limit or turn a merely-absent trust row into a 404 for the whole resource, satisfies **AC-2**
3. [x] Build the country find-or-create helper (case-insensitive, insert-if-absent then select so a concurrent duplicate insert never fails or double-inserts), satisfies **AC-3**, **AC-7**
4. [x] Build the submit domain function and `POST /api/resources` (session required, `assertNotDecoy`, Turnstile, rate limit, one atomic D1 batch creating the resource as `pending` plus its `trust_signal` row), satisfies **AC-3**, **AC-5**, **AC-7**, **AC-8**
5. [x] Build the list domain function and `GET /api/resources` (filters including the `verifiedOnly` join to `trust_signal`, case-insensitive keyword search across `resource` and `country`, `ORDER BY createdAt DESC` with its own composite cursor, published-only default, optional-session moderator override for other statuses), satisfies **AC-1**, **AC-4**, **AC-5**
6. [x] Build the detail domain function and `GET /api/resources/:id` (composes the new `readTrustSignal`, optional-session moderator override for a non-published resource), satisfies **AC-2**, **AC-5**
7. [x] Build the publish domain function and endpoint (moderator only, Turnstile, `assertNotDecoy`, only from `pending`, `logModerationAction`) and the reject domain function and endpoint (same guards, reachable from `pending` or `published` as a takedown path), satisfies **AC-4**, **AC-5**, **AC-8**
8. [x] Wire `/r` and its category/subcategory subpages (list), `/r/$resourceId/details` (detail), and `/submit` to the real endpoints via TanStack Query, replacing the `atlasResources` mock and adding the list's empty/no-result state; keep the "Save resource", "Suggest update", and "Request full address" actions disabled (still out of scope); `/atlas` and `components/atlas/*` keep reading the mock data (out of scope, Resource Atlas's own future job), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-6**, **AC-7** — the submit form got `isFree` (AC-7 requires it); the optional `lat`/`lng` and `structuredDetails` inputs were left out of the form as a deliberate cut (see Follow-up), the API accepts them either way
9. [x] Wire the home page (`/`) hero to the manual location picker (state lives only in the URL, never persisted client-side) and a real nearby-resource count; remove the hardcoded "Berlin, DE" and the "vetted access" copy (`areaSummary`), since that tier is not built in this pass, satisfies **AC-6** — no separate location picker was added to the home hero itself (it links to `/r`, where the real picker lives); the count is an honest lower bound ("N+") since the list endpoint paginates rather than counting

## Consequences

**Positive**:
- The directory becomes real: search, filter, submit, and moderate all work end to end against live data instead of a hardcoded mock.
- Every trust badge on a resource is powered by the trust-signal system with zero duplicate logic, and every submission is auditable through the existing moderation trail.
- Countries are never assumed; the directory can represent a place the very first time someone submits a resource there.
- A moderator can take a bad listing back down even after it published, not only screen it beforehand; the single most safety-critical gap the cross-check surfaced does not ship open.

**Negative / tradeoffs**:
- Any moderator can publish or reject a resource from any country; there is no country-scoped authorization yet, so trust in moderators is global, not localized, until feature 11 is designed.
- A submitter has no self-service way to see their own submission's status; they have to be told out of band that it published or was rejected.
- A published resource is protected only by the takedown path (a moderator noticing and acting); there is no automatic extra protection for a resource that turns out to be sensitive, and no vetted-access tier limits who can see it in the meantime.
- Different spellings of the same country ("USA" vs "United States") create separate rows with no automatic merge; the directory can end up with duplicate countries until a moderator-facing merge tool exists (Follow-up).

**Neutral**:
- `structuredDetails` is an unvalidated JSON blob in this build; nothing stops a submitter from putting arbitrary keys in it, and nothing renders it specially on the detail page yet beyond what a future UI pass chooses to do with it.
- The home page's `areaSummary` copy needs to change (it currently references "vetted access", which this build does not implement); Build plan task 9 covers this.
- This feature's own list endpoint uses a different pagination cursor shape (`{createdAt, id}`) than the bare-`id` cursor other list endpoints (e.g. `listModerators`) use; `lib/pagination.ts`'s shared `toPage` helper isn't reused as-is here, since those endpoints have no meaningful sort order to page through and this one does.

## Follow-up

- [ ] Country-scoped moderators plus a real moderator/admin review dashboard under `(protection)`: design as scope feature 11's own `/architect` pass, right after this spec ships. The current model is one global moderator status-flip action with no dashboard.
- [ ] Vetted-access visibility tier and country-risk auto-gating (hiding certain listings or exact addresses from unvetted accounts based on a country's laws): deliberately deferred given the safety stakes; needs its own dedicated decision, not a rushed addition here.
- [ ] The `/support` page requested alongside this feature is not covered by this spec. It isn't a named row in `docs/scope/scope.md` and its actual content (crisis lines, a contact form, an FAQ) was never defined; it needs its own scoping pass before `/develop` touches it.
- [ ] Resource photo upload: the detail page currently shows a text placeholder. Wiring the existing R2 upload module (spec 0002) to resources is a natural follow-up, not required for this walking skeleton.
- [ ] Reviews/quotes per resource: deferred per the engineer's own call during this conversation; the mock's `reviews` field is not part of this build.
- [ ] Saved/bookmarked resources: scope feature 10's job (Accounts & saved resources); the "Save resource" button stays disabled until that feature is designed.
- [ ] `structuredDetails` has no per-category shape validation in this build; if it turns out submitters need guardrails (e.g. a pharmacy's medication list needs a consistent shape), a follow-up pass can add per-category zod schemas without a migration, since the column itself is already free-form JSON.
- [ ] Country name variants ("USA" vs "United States" vs "Deutschland") are not merged automatically; a moderator-facing country-merge tool is future work once duplicate countries actually show up in practice.
- [ ] A soft duplicate-submission check (same name/country/city, case-insensitive, already exists) surfaced to the moderator reviewing a pending item: a quality-of-life improvement, not required for any acceptance criterion here.
- [ ] No re-review path out of `rejected` exists in this build (a wrongly rejected resource has no resubmit or appeal flow); revisit once the moderation flow (feature 11) is designed.
- [ ] The submit form doesn't expose `lat`/`lng` or `structuredDetails` inputs (the API accepts both; the UI just doesn't collect them yet), cut for time. Neither is required by any acceptance criterion here.
- [ ] Turnstile has no client-side widget anywhere in this app yet (built now, `www/src/components/turnstile-widget.tsx`, reading `VITE_TURNSTILE_SITE_KEY`), and that site key, like `TURNSTILE_SECRET_KEY` (spec 0002), still needs a real value. Until both exist, `/submit` can render but can never actually get a token to submit with. This isn't new scope creep, it's a pre-existing configuration gap (spec 0002 Follow-up) surfacing at the first form that actually needs it.
- [ ] `GET /resources` gained a `country` (name) filter alongside the spec'd `countryId`, kept as an additive, unused-by-the-UI capability. The `/r` location picker itself was reworked after initial feedback into a real `<select>` backed by a new `listCountries` query (only countries with a published resource, so picking one is never a dead end), using `countryId` directly rather than free text. `city` was dropped from the picker UI entirely for now (still a supported API filter, just not exposed); no acceptance criterion required it.
- [ ] `ModeratorMiddleware`'s context now also carries `isDecoy` (previously only `userLinkId`), and `grantModerator`/`revokeModerator` (spec 0002) now call `assertNotDecoy` like every other private write does. This closes a real gap this build's own AC-8 surfaced (a decoy session could previously grant or revoke moderator status), not something spec 0002 asked for directly.
- [ ] The home page hero (`/`) was also fixed after initial feedback, outside this spec's own file list but a direct consequence of it: `signedIn` now reads the real `authGateQueryOptions()` state instead of a hardcoded `true`, "Welcome back, River." now interpolates the real profile display name (falling back to no name at all rather than a fabricated one), "Open the map" now links to `/atlas` instead of `/r`, the "Explore" and "Crisis support" cards now actually link to `/r` and `/support` (they never had a real `href` before), and "Trending in your communities" now shows an honest empty state instead of three hardcoded fake posts. A real community/discussion data model does not exist anywhere in this codebase; "real trending data" is not buildable without designing that system first, and this build did not invent one.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
