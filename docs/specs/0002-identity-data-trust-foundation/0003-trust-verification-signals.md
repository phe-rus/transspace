# 0003. Trust and verification signals

Supports scope feature 8. Part of the [identity, data and trust foundation](index.md); shares its Proposed stack and cross child contract.

> Revised after an independent cross check found the community co sign mechanism was trivially gameable with free accounts, could only ever move trust upward with no way back and no moderator override, and the public read endpoint would have exposed internal user ids. All three are fixed below.

## Summary

This is the shared mechanism behind the badge every piece of community content will eventually show: whether it was community submitted, community reviewed, has references, comes from a verified professional, and when it was last looked at. It is built content agnostic on purpose, since no actual content table (a resource, a guide, a story) exists yet; each of those gets its own later design and simply plugs into this mechanism rather than reinventing it. Community endorsement now has real friction and a way to be reversed, since a falsely "reviewed" badge on something harmful (the cross check's example was a fake or entrapment listing) is a safety failure, not just spam.

## Requirements

**User stories**:
- As anyone browsing the directory, I want to see at a glance why a piece of content can be trusted, so that I don't have to guess whether something is reliable.
- As a community member, I want to add my own endorsement to something I found genuinely helpful, so that trust can build up from more than just a moderator's word.
- As a moderator, I want to be the one who can mark something as coming from a verified professional, and to be able to pull back a "reviewed" badge if it turns out to be wrong or manipulated, so that tier stays meaningful.

**Acceptance criteria**:
- **AC-1**: The moment any piece of content is submitted, a `trust_signal` row is created automatically for it against a validated, shipped list of known content types; there is no gate on this first state.
- **AC-2**: A signed in person can co sign a piece of content once, but only if their own account is more than 7 days old and they have not already co signed more than 10 items today; the original submitter can never co sign their own content. `community_reviewed` is recomputed live from the current co sign count on every co sign added or removed, so it can move back to false, not just up.
- **AC-3**: `references_available` is set by whichever content type's own save path determines it has real references attached, through one shared function this spec exposes, never hand rolled per content type.
- **AC-4**: Only a moderator can set `professional_verified`, or dispute or suppress a `community_reviewed` badge that turns out to be wrong; every such action is written to the audit table from [0002](0002-data-model-backend.md).
- **AC-5**: `last_reviewed_at` updates whenever a moderator changes `professional_verified` or the disputed state, so the badge can always show how current the professional check is.
- **AC-6**: A single read endpoint returns a content item's full trust state as a public, whitelisted shape (booleans, counts, timestamps only); it never returns any internal user id.

## Decision

**Chosen approach**: one content agnostic `trust_signal` table keyed by a `(content_type, content_id)` pair, validated against a shipped registry of known types rather than an open ended string, since no content table exists yet. Community review is earned through a co sign threshold rather than being moderator only, per the engineer's explicit call, now with real anti gaming friction and a moderator override, since the first draft's version could be trivially manufactured with a handful of free accounts and, once flipped, could never be reversed.

**Community review threshold**: 3 distinct, qualifying co signs, a plain configuration constant, not hard coded logic, so it can be tuned later without a schema change.

## Feature design

**Data model sketch**:

| Table | Field | Type | Notes |
|---|---|---|---|
| `trust_signal` | `id` | text, primary key | |
| | `content_type` | text, required | validated against `CONTENT_TYPES`, a shipped constant (starting with `"resource"`, `"guide"`, `"story"`, `"opportunity"`, `"business"`, matching the scope slices); every future content spec adds its type here rather than inventing a free text value |
| | `content_id` | text, required | the content type's own id, opaque to this table |
| | `submitted_at` | timestamp, required | set once, at creation |
| | `submitted_by` | text, required, foreign key to `user_link.id` | never returned by the public read endpoint |
| | `community_reviewed` | boolean, default false | recomputed live from `trust_co_sign`, can move either direction |
| | `co_sign_count` | integer, default 0 | denormalized for a fast, auditable badge read, kept in sync with `trust_co_sign` on every insert and delete |
| | `references_available` | boolean, default false | set by the content type's own save path, see AC-3 |
| | `professional_verified` | boolean, default false | moderator only |
| | `professional_verified_by` | text, nullable, foreign key to `user_link.id` | never returned by the public read endpoint |
| | `disputed` | boolean, default false | a moderator only override that suppresses the `community_reviewed` badge regardless of `co_sign_count`, for a case that needs human judgment (the cross check's example: a harmful listing that gamed its way to reviewed) |
| | `last_reviewed_at` | timestamp, nullable | |
| | unique | `(content_type, content_id)` | one trust signal row per content item |
| `trust_co_sign` | `trust_signal_id` | text, foreign key to `trust_signal.id` | |
| | `user_link_id` | text, foreign key to `user_link.id` | |
| | `created_at` | timestamp, required | |
| | unique | `(trust_signal_id, user_link_id)` | one co sign per person per item |

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/trust-signals/:content_type/:content_id` | GET | none | a whitelisted projection: `submitted_at`, `community_reviewed`, `co_sign_count`, `references_available`, `professional_verified`, `disputed`, `last_reviewed_at`; no ids | none, public | 404 if no signal exists yet, 422 if `content_type` is not in `CONTENT_TYPES` |
| `/trust-signals/:content_type/:content_id/co-sign` | POST | none (the content type and id are in the path) | the updated `community_reviewed` state and `co_sign_count` | session, not the original submitter, account older than 7 days, Turnstile verified per [0002](0002-data-model-backend.md)'s write endpoint rule | 409 if the caller already co signed, 403 if the caller is the submitter or their account is too new, 429 if the caller has hit today's co sign rate limit |
| `/trust-signals/:content_type/:content_id/verify` | POST | none | confirmation, writes a `moderation_action` row | session, moderator only | 403 if not a moderator |
| `/trust-signals/:content_type/:content_id/dispute` | POST | `disputed` (boolean) | confirmation, writes a `moderation_action` row | session, moderator only | 403 if not a moderator |

`references_available` has no public endpoint; it is set only through a shared internal function (`setReferencesAvailable(contentType, contentId, value)`) that a content type's own save path calls directly, per AC-3, so this table never has to know how any content type decides it has real references.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| any content submission (in a future content spec) | the new `trust_signal` row | created by this spec's shared `createTrustSignal(contentType, contentId, submittedBy)` function, validated against `CONTENT_TYPES`, called from that content type's own save path, never invented per content type |
| `co-sign` POST | whether the caller is eligible to co sign at all | derived, `user_link.created_at` more than 7 days ago, and fewer than 10 `trust_co_sign` rows by this `user_link_id` created today |
| `co-sign` POST/DELETE | the updated `community_reviewed` boolean and `co_sign_count` | both recomputed from `count(trust_co_sign rows for this signal)` on every insert and delete, then compared against `COMMUNITY_REVIEW_THRESHOLD`; a `disputed` row is always treated as not reviewed regardless of count |
| `verify` POST | `professional_verified_by` | the session's own `user_link_id`, never a request body field, and never exposed by the public GET |
| `GET` | the rendered badge state | the whitelisted projection of the `trust_signal` row, no derived fields computed at render time beyond what is already stored |

**Key invariants**:
- A content item's `submitted_by` can never also appear in its own `trust_co_sign` rows.
- A co signer's `user_link.created_at` must be more than 7 days before the co sign, and they must have fewer than 10 co signs already logged for the current day.
- `community_reviewed` is always `co_sign_count >= COMMUNITY_REVIEW_THRESHOLD AND NOT disputed`, recomputed on every relevant write, never a value that can drift from what the co signs and the dispute flag actually support.
- `professional_verified` and `disputed` can only ever be set by a moderator; there is no self service path to either.
- `last_reviewed_at` is touched only by moderator actions (`verify` or `dispute`), never by a co sign, so it reflects moderator attention specifically, not general community activity.
- The public GET response never contains `submitted_by`, `professional_verified_by`, or any other internal id; those fields exist only for server side and moderator use.

**Security model**: the GET endpoint is fully public, since trust signals are meant to be visible to anyone browsing the directory, signed in or not, but its response is a fixed, whitelisted shape that never leaks an internal id. Co signing requires a session, is blocked for the original submitter, and is gated by the account age and daily rate checks above. Verifying and disputing both require the caller's `user_link_id` to be present in the `moderators` table defined in [0002](0002-data-model-backend.md), and both write an entry to that spec's `moderation_action` audit table. Setting `references_available` has no caller at all in the ordinary sense; it is an internal call made by trusted server side code, never reachable from the client.

**Configuration required**:
- `COMMUNITY_REVIEW_THRESHOLD`: the number of distinct, qualifying co signs needed for `community_reviewed`, defaulting to 3
- The 7 day account age and 10 per day co sign rate are stated here as concrete defaults, not left open

**Critical test scenarios**:
- Happy path: a resource (once that content type exists) is submitted, its `trust_signal` row appears with only `submitted_at` set, three different, qualifying people co sign it, and `community_reviewed` flips to true on the third, verifies **AC-1**, **AC-2**
- Failure case: the original submitter attempts to co sign their own content and is rejected; a brand new account (less than 7 days old) attempts to co sign and is rejected, verifies **AC-2**'s exclusion rules
- Gaming attempt: a moderator disputes a `community_reviewed` item, `community_reviewed` reads false from that point on regardless of `co_sign_count`, and the dispute is recorded in `moderation_action`, verifies **AC-4**
- Auth/permission: a non moderator calling the verify or dispute endpoint is rejected with 403, and a moderator calling either succeeds and stamps `last_reviewed_at`, verifies **AC-4**, **AC-5**
- Privacy: the public GET response for any content item, inspected directly, contains no `user_link` id anywhere in its body, verifies **AC-6**

## Build plan

1. Define the shipped `CONTENT_TYPES` constant and create the `trust_signal` and `trust_co_sign` migrations (including `co_sign_count` and `disputed`), satisfies **AC-1**
2. Build the shared `createTrustSignal` function future content submission flows call, validating `content_type` against the registry, satisfies **AC-1**
3. Build the co sign endpoint, including the self co sign block, the account age and daily rate checks, the once per person constraint, and the live recomputation of `community_reviewed` and `co_sign_count` on insert and delete, satisfies **AC-2**
4. Build the shared `setReferencesAvailable` internal function, satisfies **AC-3**
5. Build the moderator only verify and dispute endpoints, stamping `professional_verified_by` or `disputed`, `last_reviewed_at`, and a `moderation_action` row, satisfies **AC-4**, **AC-5**
6. Build the public read endpoint with its whitelisted response shape, and a shared trust badge component in `shared/ui`, so every future content detail page renders the same shape, satisfies **AC-6** (see Follow up: this should inherit `shared/ui`'s existing shape and motion personality rather than invent a new visual language)

## Consequences

**Positive**:
- Every future content type gets a working trust badge for free by calling three shared functions, instead of each one inventing its own state machine.
- The co sign model gives the community a real, load bearing role in the trust system, not just a passive audience for moderator decisions, while the account age and rate limits mean that role can't be bought with a handful of throwaway accounts in one sitting.
- A moderator can now pull back a badge that turns out to be wrong, closing a real safety gap (a harmful listing gaming its way to "reviewed" with no way back) the first draft left open.

**Negative / tradeoffs**:
- A co sign requires a real account at least a week old; it does not (and by AC-2's own design, cannot) reflect anonymous, signed out, or brand new account approval, which may undercount genuine trust from people unwilling to create an account or wait out the age check at all.
- The chosen threshold of 3, the 7 day age gate, and the 10 per day rate are guesses calibrated for a small, early community; they may need to move once real usage data exists, and moving any of them changes what already reads as "reviewed" community wide, not just for new content.
- The dispute flag is a blunt, binary override; it does not yet distinguish "temporarily under review" from "permanently rejected," a nuance left for a later pass if it turns out to matter.

**Neutral**:
- This spec does not decide what happens to a content item's trust signal when the content itself is edited after being reviewed; that question depends on each content type's own edit model and is left to each content type's own later spec.

## Follow up

- [ ] `shared/ui/AGENTS.md` already flags that trust and verification signals should inherit its existing shape and motion personality rather than invent a new visual language for the badge; confirm that when building the shared trust badge component in step 6 of the Build plan.
- [ ] Whether editing a piece of content after it is `community_reviewed` or `professional_verified` should reset either state is an open question for each content type's own spec (starting with the resource directory, scope feature 9) to answer, not this one.
- [ ] Consider splitting `disputed` into a small enum (for example under review versus rejected) if moderators find the binary flag too coarse in practice, once the review queue (scope feature 11) exists to observe that against.
