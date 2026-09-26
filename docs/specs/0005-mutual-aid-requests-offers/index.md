# 0005. Mutual aid requests and offers

**Date**: 2026-09-25
**Status**: In Progress

## Summary

This turns the existing "support" page from a hardcoded mockup into a real, moderated board where people can ask for help (money, a job, transport, a listening ear) or offer it, with a privacy model built for a global community where being visible can be dangerous in some countries. Financial asks and professional (for example medical or legal) offers get extra checks so the board stays trustworthy without adding new money or live audio systems yet, those are separate future decisions. Every write goes through the moderation, audit, and abuse protection (Turnstile human check, rate limiting) already used for resources and guides. This revision incorporates a cross-check pass that closed eleven build-blocking gaps in the first draft, most notably a role that did not exist in this codebase and a country-matching bug that would have made the geo-lock silently do nothing.

## Requirements

**User stories**:
- As someone needing help, I want to post a request (money, transport, information, a listening ear) at a visibility level I choose, so that I control my own exposure while still reaching people who can help.
- As someone offering help, I want to post a job, a professional service, transport, or general offer, so that people looking for that kind of help can find and respond to it.
- As a moderator, I want every post reviewed before it is visible, with financial and professional claims specifically checked, so the board stays trustworthy and the project stays out of legal jeopardy.
- As a requester, I want to close my own post once I am helped, so the board reflects reality instead of accumulating dead requests.

**Acceptance criteria** (the contract, each independently checkable):
- **AC-1**: A signed in person can submit a post of type `request_general`, `request_info`, `request_food`, `request_financial`, `request_travel`, `offer_job`, `offer_travel`, `offer_listening`, `offer_general`, or `offer_professional`. Each type's required structured fields (see **Per-type structuredDetails fields** below) are validated server side; a submission missing one is rejected with 422.
- **AC-2**: A submitted post starts as `pending`. Posts flagged `isUrgent` (request types only) are surfaced ahead of non-urgent ones in the moderation queue. `isUrgent: true` on an `offer_*` type is rejected with 422.
- **AC-3**: A moderator can publish or reject a `pending` post. The action is rejected with 403 if the acting moderator is the post's own author, with no exception. Spec 0002 AC-2 guarantees at least two moderators exist, so a different moderator can always pick it up.
- **AC-4**: A published post's visible content follows its `visibilityTier`: `public` (anyone sees the full post), `sensitive` (a signed out or non-viewing caller sees only `id`, `type`, `direction`, `isUrgent`, `title`, `createdAt`, nothing about the author, no amounts, no counts; full detail requires sign in), `critical` (same redaction as sensitive, plus a signed out visitor whose country resolves to one on the restricted country list, or whose country cannot be determined at all, sees a locked message instead of even the redacted view; a signed in visitor always sees full content regardless of country), `private` (signed in only, and excluded from every list or search result; reachable only by direct link/id).
- **AC-5**: The author sets `visibilityTier` at submission and may change it later via edit (which re-queues the post per AC-12, same as any other edit). A moderator may move a post to a more restrictive tier during review; a moderator may never move a post to a less restrictive tier under any circumstance, that direction is the author's call alone.
- **AC-6**: A `request_financial` submission is rejected unless the account is at least 7 days old (the same threshold this codebase already uses for cosign eligibility). A `support_post`'s `trustSignal` row is created when the post is **published**, not at submission, a deliberate deviation from how `resource` creates its trust signal at submit time, so an unreviewed financial ask cannot accumulate cosigns before a moderator has seen it. Once published, reaching the existing community-review cosign threshold shows a "community reviewed" badge; cosigns never affect list ordering.
- **AC-7**: An account may have at most one open `request_financial` post at a time, where open means status `pending`, `published`, or `paused`; `rejected`, `fulfilled`, and `withdrawn` are closed. A second attempt while one is open is rejected with 409, enforced by a database constraint (not a read-then-write check) so two simultaneous submissions cannot both succeed.
- **AC-8**: The requester can mark their own post `fulfilled` or `withdrawn` from any open status. Doing so auto-declines the post's still-`interested` `support_claim` rows only; an already-`assigned` claim is left untouched. A helper can withdraw their own `interested` claim at any time; the post's author or a moderator can decline a specific claim directly.
- **AC-9**: A moderator can `pause` a published post with a reason, recorded as a `support_update` of kind `pause_reason`. The requester can add an explanation while paused, recorded as kind `pause_response`. Any moderator, including a different one than who paused it, can reactivate it after reviewing that explanation; reactivation is subject to the same self-review block as AC-3.
- **AC-10**: A signed in user other than a post's author can express interest in it (request or offer alike) by creating a `support_claim`, at most one per person per post. The post's author or a moderator can mark one claim `assigned`; at most one claim per post may be `assigned` at a time, and assigning a new one returns the previous assignee to `interested`.
- **AC-11**: A financial post displays a raised amount alongside its target, both in the post's chosen currency. The requester or a moderator can post a `support_update` of kind `progress` carrying an amount; that amount is the new cumulative self-reported total (not a delta), and the most recently posted `progress` update is what displays as the raised figure. A negative amount is rejected. The UI labels this as self reported, not a verified transaction.
- **AC-12**: Editing a published post (title, `structuredDetails`, or `visibilityTier`) returns it to `pending` and clears `moderatedBy`; its claims and update history are untouched. A `paused` post cannot be edited until it is reactivated or withdrawn. A `pending` post can be edited without any further status change.
- **AC-13**: An `offer_professional` submission requires structured credential fields (profession, license or registration number, jurisdiction). A moderator sets the post's `trustSignal.professionalVerified` after review, through the same self-review block as AC-3 (a moderator cannot verify their own professional offer); the verified badge renders only when true.
- **AC-14**: A published post with no `support_claim` or `support_update` activity for 30 days is surfaced in the moderator queue as stale, oldest-stale first. It is never auto-closed.
- **AC-15**: Every support write endpoint requires Turnstile verification and the existing write rate limiter; every read endpoint uses the existing read rate limiter.
- **AC-16**: Every moderator action (publish, reject, pause, reactivate, escalate tier, assign a claim as moderator, verify a professional offer) writes one row to the existing `moderationAction` audit log.
- **AC-17**: A post authored by an account holding the moderator role visibly shows that on its card and detail view, to signed in viewers only; a signed out visitor never sees which accounts are moderators.
- **AC-18**: List and detail endpoints never return `private` tier posts to any caller other than the author, and never return `sensitive` or `private` full detail, or `critical` detail blocked by the restricted country check, to a signed out caller. This applies to the trust badge (cosign count, verified status) shown on a post too, not only to the post body: a signed out caller cannot use the trust signal path to learn a post exists or how active it is when the post itself would be hidden from them.
- **AC-19**: The restricted country list (for the `critical` tier geo lock) is a maintained code constant, `RESTRICTED_COUNTRY_CODES`, seeded at launch from a recognized reference source (the ILGA World "State-Sponsored Homophobia" criminalization map) and updated through normal code review, not a moderator facing CRUD surface; a live, unreviewed edit path is the wrong control for a list that decides who is protected. It applies uniformly to every `critical` tier post; there is no per-post override.
- **AC-20**: An offer (`direction = offer`) may be marked `isRecurring` to signal ongoing availability rather than a one-time offer, for example a standing "available to talk" listening-ear post, carried over from the original support page mockup's `recurring` field so that concept isn't lost in the rebuild. A recurring offer renders as a wide, standing card in the list, visually distinct from a one-off post. `isRecurring: true` is rejected with 422 on any `request_*` type.

**Per-type structuredDetails fields** (validated server side per AC-1; every field listed required unless marked optional):

| Type | Required fields |
|---|---|
| `request_general` | `description` (text, min 50 chars) |
| `request_info` | `description` (text) |
| `request_food` | `description` (text); `portions` (text, optional) |
| `request_financial` | `writtenCase` (text, min 200 chars); `targetAmount` (integer, minor units); `currency` (ISO 4217 code) |
| `request_travel` | `description` (text); `area` (text); `timeframe` (text) |
| `offer_job` | `role` (text); `compensation` (text, may state "unpaid"/"volunteer"); `remoteOrLocal` (`remote` \| `local` \| `hybrid`); `howToApply` (text); `org` (text, optional, may stay pseudonymous) |
| `offer_travel` | `area` (text); `timeframe` (text); `whatIsOffered` (text) |
| `offer_listening` | `availability` (text); `languages` (text, optional); `topics` (text, optional) |
| `offer_general` | `description` (text) |
| `offer_professional` | `profession` (text); `licenseOrRegistrationNumber` (text); `jurisdiction` (text); `context` (text, optional) |

## Decision

**Chosen option**: Option 2: Full model

Build the complete request/offer board described in this spec: tiered visibility with a geo lock, structured per-type intake, claim/assignment, and trust checks reused from the existing `trustSignal` system, in one coherent build sliced into shippable stages (see Build plan).

## Feature design

**Data model sketch**:

- `support_post`: `id` (PK), `type` (text, not null; validated at the domain layer against a `SUPPORT_POST_TYPES` constant, no DB enum, same convention as `resource.category`), `direction` (`request` | `offer`, derived from `type` at write time), `isUrgent` (boolean, not null, default false; only valid when `direction = request`), `isRecurring` (boolean, not null, default false; only valid when `direction = offer`), `title` (text, not null), `visibilityTier` (`public` | `sensitive` | `critical` | `private`, not null), `status` (`pending` | `published` | `rejected` | `paused` | `withdrawn` | `fulfilled`, not null), `authorUserLinkId` (FK → `userLink.id`, not null), `structuredDetails` (text, JSON, not null; shape validated per `type` before write), `moderatedBy` (FK → `userLink.id`, nullable), `moderatedAt` (timestamp, nullable), `createdAt`/`updatedAt` (timestamps, not null).
- `support_claim`: `id` (PK), `supportPostId` (FK → `support_post.id`, not null), `helperUserLinkId` (FK → `userLink.id`, not null), `status` (`interested` | `assigned` | `declined` | `withdrawn`, not null), `message` (text, nullable), `createdAt` (not null), `assignedAt` (nullable), `assignedBy` (FK → `userLink.id`, nullable).
- `support_update`: `id` (PK), `supportPostId` (FK → `support_post.id`, not null), `authorUserLinkId` (FK → `userLink.id`, not null), `kind` (`progress` | `pause_reason` | `pause_response` | `reactivation_note` | `withdrawal_reason` | `rejection_reason` | `moderator_note`, not null), `amount` (integer, minor units, nullable; only meaningful for `kind = progress`), `body` (text, nullable), `createdAt` (not null).
- `profile.ageRange` (new, nullable, text): an optional self-reported range (for example "18-24"), not an exact birthdate, shown to moderators only. Extends the existing `profile` table from spec 0002. This spec adds the column and reads it if set; it does not add a settings UI to set it, that belongs to the profile domain (see Follow-up), so the field reads as unset until that lands.
- `RESTRICTED_COUNTRY_CODES` (new domain constant, not a table, per AC-19): a list of ISO 3166-1 alpha-2 codes, seeded from the named reference source, changed through code review.
- Reused unchanged: `trustSignal`/`trustCoSign` (contentType `"support_post"`, added to the existing `CONTENT_TYPES` registry; `coSignCount` drives the community-reviewed badge on a financial ask, `professionalVerified`/`professionalVerifiedBy` is the professional-offer badge), `moderationAction` (every moderator action on a support post), `userLink`/`profile` (identity), the existing Cloudflare geo helper that resolves a request's ISO country code (already returns `null` for a missing/undetermined value).

**Indexes**:
- `support_post(status, type)`, `support_post(createdAt, id)` for cursor pagination (mirrors `resource`'s composite index).
- `support_post(authorUserLinkId)`, a **partial unique index** `WHERE type = 'request_financial' AND status IN ('pending', 'published', 'paused')`, enforcing AC-7 atomically instead of a read-then-write check.
- `support_claim(supportPostId, helperUserLinkId)`, unique, at most one claim per person per post.
- `support_claim(supportPostId)`, a **partial unique index** `WHERE status = 'assigned'`, enforcing AC-10's single-assignee rule atomically.
- `support_update(supportPostId, createdAt)`.

**State transitions**:

`support_post.status`: `pending` → `published` | `rejected`; `published` ⇄ `paused`; `published` | `paused` → `fulfilled` | `withdrawn`; `pending` → `withdrawn`. An edit to a `published` post returns it to `pending`.

`support_claim.status`: `interested` → `assigned` | `declined` | `withdrawn`.

**Read visibility by status**: `published` posts appear in lists and detail per their `visibilityTier`. `fulfilled` posts are readable by direct link and appear in lists only behind an explicit "show fulfilled" filter, never the default list. `pending`, `rejected`, `paused`, and `withdrawn` posts are readable only by their author and by moderators.

**List ordering**: default list order is `createdAt DESC, id DESC` (same convention as `resource`). The moderation queue orders `isUrgent DESC, createdAt ASC`. The stale queue (AC-14) orders oldest-stale-first.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/support | GET | type?, direction?, cursor | paginated posts, filtered by viewer's visibility | public (filtered) | 429 |
| /api/support/:id | GET | id | post detail, filtered by tier/viewer, includes trust badge | public (filtered) | 404, 403 (private/geo-blocked) |
| /api/support | POST | type (req), title (req), structuredDetails (req), visibilityTier (req), turnstileToken (req) | id, status: pending | signed in | 403 (financial age gate), 409 (financial cap), 422 |
| /api/support/:id | PATCH | title?, structuredDetails?, visibilityTier? | status: pending | author | 403, 404, 409 (paused) |
| /api/support/:id/withdraw | POST | reason? | status: withdrawn, support_update | author | 403, 404, 409 |
| /api/support/:id/fulfill | POST | id | status: fulfilled | author | 403, 404, 409 |
| /api/support/:id/publish | POST | id | status: published | moderator (not self) | 403 |
| /api/support/:id/reject | POST | reason (req) | status: rejected, support_update | moderator (not self) | 403 |
| /api/support/:id/pause | POST | reason (req) | status: paused, support_update | moderator (not self) | 403 |
| /api/support/:id/reactivate | POST | note? | status: published, support_update | moderator (not self) | 403, 409 |
| /api/support/:id/escalate-tier | POST | visibilityTier | new visibilityTier | moderator (not self) | 403, 422 (only escalation allowed) |
| /api/support/:id/claims | POST | message? | support_claim, status: interested | signed in, not author | 403, 409 (already claimed) |
| /api/support/:id/claims/:claimId | DELETE | claimId | status: withdrawn | the claiming helper | 403, 404 |
| /api/support/:id/claims/:claimId/assign | POST | claimId | support_claim, status: assigned; prior assignee reset to interested | author or moderator | 403, 404 |
| /api/support/:id/claims/:claimId/decline | POST | claimId | status: declined | author or moderator | 403, 404 |
| /api/support/:id/updates | POST | kind, amount?, body? | support_update | author or moderator | 403, 422 (negative amount) |
| /api/support/:id/co-sign | POST | id | trustSignal cosign, only after the caller's own visibility check passes | signed in, can view the post | 403 (cannot view / already cosigned) |
| /api/support/:id/verify | POST | id | trustSignal.professionalVerified | moderator (not self) | 403 |

The last two wrap the existing content-agnostic `trustSignal` cosign/verify functions with a support-specific visibility check in front (AC-18); the raw generic `/api/trust-signals/support_post/:id/...` routes are not exposed for this content type precisely because they carry no tier awareness.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Submit | authorUserLinkId | signed-in session |
| Submit (financial) | account age, for the 7-day gate | userLink.createdAt vs now |
| Submit | structuredDetails shape to validate against | per-type Zod schema, from the field table above |
| Submit | age shown to a moderator | profile.ageRange, if the person already set one (currently: never, until a profile-settings UI exists) |
| List (signed out) | viewer's ISO country code, for the critical-tier geo lock | the existing Cloudflare geo helper (`countryCode`, already nullable) |
| List | whether that country is restricted | `RESTRICTED_COUNTRY_CODES` lookup; a missing, Tor (`T1`), or unresolved (`XX`) code is treated as restricted (fail closed) |
| List/detail | which fields to redact | visibilityTier + whether the caller has a session, per the explicit field list in AC-4 |
| Publish/reject/pause/reactivate/verify | self-review block | actor.userLinkId vs post.authorUserLinkId |
| Financial post | displayed raised amount | the most recent support_update row of kind=progress for that post (cumulative total, not summed) |
| Financial post | community-reviewed badge | trustSignal.coSignCount vs the existing COMMUNITY_REVIEW_THRESHOLD |
| Professional offer | verified badge | trustSignal.professionalVerified |
| Moderator queue | stale flag | max(support_post.updatedAt, its support_claim.createdAt, its support_update.createdAt) vs 30 days ago |
| Card/detail | moderator badge on the author, signed-in viewers only | moderator table lookup by authorUserLinkId, derived at read time, never stored |

**Key invariants**:
- At most one `support_claim` per (`supportPostId`, `helperUserLinkId`); a helper cannot claim their own post; at most one `assigned` claim per post (enforced by the partial unique index above).
- At most one open (`pending`/`published`/`paused`) `request_financial` post per `authorUserLinkId` (enforced by the partial unique index above, not a read-then-write check).
- `visibilityTier` ordering, least to most restrictive: `public < sensitive < critical < private`. A moderator may only escalate (move right); only the author may move left, via their own edit.
- `structuredDetails` is validated server side against the per-type schema before every insert or update; never trusted as-is from the client.
- A moderator cannot publish, reject, pause, reactivate, escalate the tier of, or verify their own submitted post; this is absolute, with no admin-style exception, since this codebase has no admin role above moderator.
- `isUrgent` is rejected (422) when set on any `offer_*` type; `isRecurring` is rejected (422) when set on any `request_*` type.
- `support_update.amount` for `kind = progress` must be non-negative.

**Security model**:
- Read: visibility follows `visibilityTier` + `status` as described in AC-4 and *Read visibility by status*; `private` posts never appear in list/search results for anyone but the author. The trust badge on a post is never exposed through a path that bypasses that same check (AC-18).
- Submit: any signed-in account; `request_financial` additionally requires 7+ days of account age and no other open financial post.
- Edit/withdraw/fulfill: the post's author only.
- Claim: any signed-in account except the post's own author. Withdraw own claim: the claiming helper. Decline a claim: the post's author or any moderator.
- Assign a claim: the post's author or any moderator.
- Publish/reject/pause/reactivate/escalate-tier/verify: moderator role, with an absolute self-review block (no exceptions).
- Post an update: the post's author (self-report) or any moderator.
- Compliance note: this feature handles financial-hardship disclosures and profession/credential claims, both sensitive personal data; the audit log (AC-16) and the strict per-type validation (AC-1) are the controls that keep this defensible, not optional hardening.

**Critical test scenarios**:
- Happy path: a signed-in user submits a `request_general` post, a moderator publishes it, it appears on the public board with the chosen visibility, verifies **AC-1**, **AC-3**, **AC-4**.
- Failure case: an account created today attempts a `request_financial` submission with a target amount and is rejected for the account-age gate; a second attempt from an account that already has one open financial post (including a `paused` one) is also rejected, verifies **AC-6**, **AC-7**.
- Auth/permission: a moderator attempts to publish, reactivate, or verify their own submitted post and receives 403 in every case; a second moderator succeeds, verifies **AC-3**, **AC-9**, **AC-13**.
- Failure case: a signed-out visitor whose resolved country is on the restricted list, and separately one whose country cannot be resolved at all, both requesting a `critical` post, each see the locked message instead of content; a signed-in visitor from the same country sees the full post, verifies **AC-4**, **AC-18**.
- Failure case: two simultaneous submissions of `request_financial` from the same account; exactly one succeeds, the other receives 409, verifies **AC-7**.

## Build plan

1. [x] Migration: `support_post` (with `moderatedAt`), `support_claim`, `support_update` (with the full kind enum) tables, the optional `ageRange` column on `profile`, and the indexes listed above (including the two partial unique indexes); no `restricted_country` table, satisfies **AC-6**, **AC-7**, **AC-10**. Applied and confirmed live against the local D1 database.
2. [x] Domain layer: the `SUPPORT_POST_TYPES` constant, a per-type `structuredDetails` Zod schema for every type in the field table, the `RESTRICTED_COUNTRY_CODES` constant seeded from the named reference source, and registering `"supportPost"` in the existing `CONTENT_TYPES` registry, satisfies **AC-1**, **AC-19**.
3. [x] Submit endpoint: decoy-safe, Turnstile- and write-rate-limited, type-specific validation, the financial account-age gate and the atomic one-open-financial-post constraint, `isUrgent` rejected on offers, author-selected `visibilityTier`, satisfies **AC-1**, **AC-2**, **AC-6**, **AC-7**, **AC-15**.
4. [x] List/detail read endpoints: status- and tier-aware visibility filtering per the explicit field projection, the ISO-code critical-tier geo lock with fail-closed handling of a missing/Tor/unresolved country, `createdAt DESC, id DESC` ordering, read-rate-limited, satisfies **AC-4**, **AC-15**, **AC-18**.
5. [x] Wire `/support` to real data for the simplest types (`request_general`, `request_info`, `request_food`, `isUrgent`): submit form, pending state, published card/detail view, the thin end-to-end slice, satisfies **AC-1**, **AC-2**, **AC-4**. Verified live via SSR (real title/empty-state/sign-in-gate content, no dehydrated query errors).
6. [x] Moderator publish/reject endpoints, the absolute self-review block, `rejection_reason` captured as a support_update, audit logging via the existing `moderationAction`, moderation queue UI ordered `isUrgent DESC, createdAt ASC`, satisfies **AC-3**, **AC-16**, **AC-17**. The queue UI (`/dashboard/support`) is the first moderator-only page this app has; publish/reject are wired, pause is wired from its stale tab.
7. [x] Edit endpoint (re-queues to pending, clears `moderatedBy`, allows `visibilityTier` changes, blocked while `paused`), withdraw and fulfill endpoints (auto-declining only `interested` claims), satisfies **AC-5**, **AC-8**, **AC-12**. Withdraw/fulfill have detail-page buttons; the edit (`PATCH`) endpoint itself has no dedicated "edit my post" UI yet (Follow-up).
8. [x] Extend submission and UI to the remaining structured types (`request_financial`, `request_travel`, `offer_job`, `offer_travel`, `offer_professional`, `offer_listening`, `offer_general`) with their per-type forms from the field table, satisfies **AC-1** for the remaining types. Built as one config-driven form (`/submit-support`) rather than ten separate pages, reading each type's fields from a shared table.
9. [x] Financial trust escalation: create the post's `trustSignal` row at publish time (not submission) through the support-scoped `/co-sign` wrapper that checks viewer visibility first; community-reviewed badge at the existing threshold, explicitly not affecting list order; the progress-update endpoint with cumulative amount semantics, satisfies **AC-6**, **AC-11**, **AC-18**.
10. Professional-offer verification through the support-scoped `/verify` wrapper (self-review blocked) around the existing trust-signal verify function, credential fields, badge display, satisfies **AC-13**. The endpoint, credential fields, and detail-page badge are built and typecheck clean; **not done**: no moderator-facing button calls `verifySupportPost` anywhere yet, so a moderator can't actually verify a professional offer through the UI today.
11. [x] Claim/assignment flow: express interest (any direction), single-assignee enforcement, helper self-withdraw, author/moderator decline, auto-decline of `interested` claims on close, satisfies **AC-8**, **AC-10**.
12. Pause/reactivate flow: moderator pause with reason, requester `pause_response`, self-review-blocked reactivation, satisfies **AC-9**. Pause is wired (queue's stale tab); **not done**: reactivate has no UI anywhere, only the API endpoint.
13. [x] Stale-post surfacing in the moderator queue, oldest-stale-first, satisfies **AC-14**.
14. [x] i18n message keys for all new UI strings under the existing `pages.support.*`/`components.*` convention, supports every UI-facing AC. All four shipped locales (en/de/fr/zh) carry real translations, not machine-translate fallback: the machine-translate service was unavailable this session (same failure guides' spec 0004 build hit), so de/fr/zh were translated by hand, matching that precedent.
15. [x] `isRecurring` on `support_post` (migration, submit validation, list/detail projection) and the standing wide-card rendering for a recurring offer, satisfies **AC-20**.

## Consequences

**Positive**:
- A real, moderated mutual aid board replaces the disabled mockup, with privacy protections sized to a genuinely global, sometimes-endangered audience.
- No new trust, moderation, or audit infrastructure: this reuses `trustSignal`, `moderationAction`, Turnstile, and the rate limiter exactly as resources and guides already do, and the support-scoped cosign/verify wrappers keep that reuse from leaking visibility it shouldn't.
- The two atomic partial-unique-index invariants (one open financial post, one assigned claim) close the concurrency gaps a fraud-motivated user would otherwise be able to race.

**Negative / tradeoffs**:
- This is the largest single feature build in the project so far by surface area: four visibility tiers, ten post types, a claim workflow, and two trust-check paths all interacting.
- Self-reported/moderator-entered financial progress (AC-11) is honesty-based, not verified; it is an explicit stopgap until a real payment system exists.
- The edit-while-published flow (AC-12) has no version history; a post is briefly not publicly visible while a re-review is pending, since this build introduces no content-versioning table.
- The `critical` tier's geo lock is real friction against casual or automated discovery from a restricted country, not a defense against a motivated adversary: creating a free account bypasses it in the time it takes to sign up. This is accepted deliberately, since the stated priority is maximizing who can see and respond to a request, not hardening against a targeted actor.

**Neutral**:
- Adds an optional `ageRange` field to the shared `profile` table (spec 0002's territory) with no setter UI yet; it reads as unset until a future profile-settings change adds one.
- Per scope.md, this feature carries a `GA` workflow tag; a fresh-model `/check review` and `/document` pass are expected after build and verify, not just `/check verify` and `/test`.

## Follow-up

- [ ] Live "circle" audio support rooms (a real-time listening-ear session, persistent-presence browser extension, consent-gated recording) are a distinct future feature; this build covers only the async text version of a listening-ear offer.
- [ ] Wallets and real payment rails are deferred to a separate future spec, resolved in conversation as non-custodial (people connect their own wallet; transspace never holds funds). This spec's raised/target tracking (AC-11) is a self-reported stopgap until that spec lands.
- [ ] Platform-wide trust/impact reporting (aggregate totals, donor/helper leaderboards, ratings and reviews) is deferred to a later spec, once this feature has real usage data to report on.
- [ ] `docs/scope/scope.md`'s single "Community support & mutual aid" Deferred bullet should be split to reflect this decomposition (requests & offers here, live circle rooms, wallets, and trust reporting as separate future items).
- [ ] No root `AGENTS.md` exists yet (scope.md item 2); once written, it should capture the `structuredDetails` JSON-per-type pattern and the reuse of `trustSignal`/`moderationAction` for new content types, since this is now the second feature (after resources) to use it.
- [ ] A profile-settings UI to let a person set `profile.ageRange` is separate, small work in the profile domain, not part of this spec; without it, the field this spec adds simply stays unset.
- [ ] The 7-day account-age threshold (AC-6), the 30-day stale-post window (AC-14), and the minimum lengths for a financial write up (200 chars) and a general description (50 chars) are tunable parameters chosen by judgment in this spec; revisit once real submissions show whether they are too strict or too loose.
- [ ] Three real UI gaps remain from this build pass, all backed by working, typechecked API endpoints with no UI calling them yet: a moderator-facing "mark as verified" button for `offer_professional` posts (AC-13's `verifySupportPost`), a "reactivate" button for a paused post (AC-9's `reactivateSupportPost`), and a dedicated "edit my post" page (AC-12's `editSupportPost`, PATCH). None are architecturally new work, each is wiring a button to an existing endpoint.
- [ ] A helper cannot yet withdraw their own `interested` claim from the UI (the `DELETE .../claims/:claimId` endpoint exists, AC-10, but the detail page never calls it); only the post's author/a moderator can currently decline one.
- [ ] `bun run translate` (the machine-translate CLI) was unavailable this session (community translation service down); de/fr/zh were translated by hand for this feature's new keys. Re-run the automated pipeline once the service is back to catch anything a manual pass missed.

## Rationale

Reasoning, options considered, and supporting context: see [rationale.md](rationale.md).
