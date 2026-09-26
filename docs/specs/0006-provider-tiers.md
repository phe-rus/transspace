# 0006. Provider tiers for the health directory

**Date**: 2026-09-26
**Status**: In Progress

## Summary

Every entry in the health sections of the resource directory can carry a tier: verified (checked by a moderator) or DIY accepted (self provided or community run care, accepted with a clear label). The tier shows as a badge on cards and detail pages and works as a filter on the `/r` list. It is stored as one nullable column on the existing `resource` table, so there are no new tables or schema files.

## Context

The health sections list providers of very different kinds. A clinic with licensed staff and a peer group that shares harm reduction information are both useful to the community, but a reader needs to know which is which. Today nothing on an entry says how it was checked, and the only signal is the professional verification flag in the trust signals.

You asked for two categories, verified providers and DIY accepted providers, and for as few tables as possible. Entries that have neither label must keep working exactly as they do now. Adding a table for tiers would be the wrong size for a single word per entry.

Decisions taken as defaults because no questions were asked this round (see Follow-up to overrule any of them): three states (verified, DIY, none), only health entries use the tier, only moderators can set verified, and the submitter can only declare DIY.

## Requirements

**User stories**:
- As a reader, I want to see at a glance whether a provider was checked or is community run, so I can decide how much to rely on it.
- As a submitter, I want to say that my entry is a DIY or peer run option so it is described honestly.
- As a moderator, I want to confirm or change the tier when I publish an entry.

**Acceptance criteria**:
- **AC-1**: A `resource` in the `health` category can carry a tier of `verified` or `diy`, or no tier. Entries in other categories never show or accept a tier.
- **AC-2**: Cards and detail pages show a badge for `verified` and `diy`. The detail page of a `diy` entry also shows a short standing note that this is community provided and not medical care.
- **AC-3**: The `/r` list can be filtered by tier through a `tier` search parameter and filter chips. Unpublished entries stay hidden whatever the filter.
- **AC-4**: A submitter can mark an entry as DIY. A submission that tries to set `verified` is rejected with 422.
- **AC-5**: A moderator can set or change the tier (verified, diy, or none) when publishing. Only a moderator can set `verified`.
- **AC-6**: An existing entry with no tier renders exactly as it does today, with no badge.
- **AC-7**: The verified badge also appears when the entry already has `professionalVerified` in its trust signal, so the two signals never contradict each other on screen.

## Options considered

### Option 1: One nullable column on resource

Add `tier` as a nullable text column on `resource`, validated at the domain layer against a shipped list of values, the same way `category` is validated.

**Pros**:
- No new table or schema file, which matches the rule to keep schemas minimal.
- Additive and safe: existing rows stay valid with no backfill.
- Filtering is a plain equality check on an indexed column.

**Cons**:
- The tier is not audited on its own. The moderation action log is the record of who set it.

### Option 2: A tier table with a row per entry

A separate `resourceTier` table with its own history.

**Pros**:
- Full history of tier changes.

**Cons**:
- A new table for a single word per entry, against the stated direction.
- Every read needs a join.

### Option 3: Derive the tier from the trust signal only

Treat `professionalVerified` as verified and add a flag for DIY on the trust signal.

**Pros**:
- No change to `resource`.

**Cons**:
- Mixes two ideas: a credential check (a fact about the person) and how the care is provided (a fact about the service).
- The trust signal is shared with guides and posts, where a DIY tier makes no sense.

## Decision

**Chosen option**: Option 1: One nullable column on resource

Add `resource.tier` (nullable text, `verified` or `diy`) and derive the verified badge from either the column or `professionalVerified`.

## Rationale

The tier describes the entry, so it belongs on the entry. A nullable column keeps existing data untouched and needs no join, and the moderation action log already records who changed what, so a history table adds cost without a real need yet. Keeping the credential check (`professionalVerified`) separate from the service tier keeps each signal honest, while AC-7 makes sure the screen never shows a contradiction.

## Feature design

**Data model sketch**:
- `resource.tier`: text, nullable. Values `verified` or `diy`, validated in `www/src/domains/resources/types` against a `RESOURCE_TIERS` constant next to the category constants. Null means no tier. An index on `tier` is not needed at this size.
- No new table, no new schema file.

**State transitions**:
- Set at submit: `diy` or null (submitter). Set at publish: `verified`, `diy` or null (moderator). A moderator can change it later through the same moderator only endpoint that publishes and takes down entries.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| list resources | GET | `tier?: "verified" or "diy"` | items with `tier` | public | 422 unknown tier |
| submit resource | POST | `tier?: "diy"` | id, status | signed in | 422 if `verified` or non health |
| publish resource | POST | `tier?: "verified" or "diy" or null` | id, status, tier | moderator | 403, 422 |
| resource detail | GET | id | resource with `tier` and trust | public | 404 |

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Card and detail badge | tier label | `resource.tier`, or `trustSignal.professionalVerified` for the verified badge |
| DIY standing note | the note text | an i18n message, the same in every DIY entry |
| Filter chips | the list of tiers | the shipped `RESOURCE_TIERS` constant |
| Publish | who set the tier | the moderator's `userLinkId`, written to the moderation action log |

**Key invariants**:
- Only `health` category entries hold a tier. A tier on any other category is dropped on write.
- Only a moderator writes `verified`.
- A tier never changes who can see an entry: status still decides visibility.

**Security model**:
- Anyone can read the tier of a published entry. The submitter can only declare `diy`. Moderators set anything. No login identity is involved.

**Critical test scenarios**:
- Happy path: a submitter marks an entry DIY, a moderator publishes it, and the card shows the DIY badge, verifies **AC-2**, **AC-4**, **AC-5**.
- Failure case: a submission with `tier: "verified"` returns 422, verifies **AC-4**.
- Auth: a non moderator publish call is denied as it is today, verifies **AC-5**.
- Regression: an entry with no tier shows no badge, verifies **AC-6**.
- Filter: `tier=diy` returns only published DIY entries, verifies **AC-3**.

## Build plan

The project default approach is Tracer Bullet, so the order is one thin thread through every layer, then the extras.

1. Add the `tier` column to `resource` in `www/src/schemas/resources.ts` and generate the migration (additive, nullable), satisfies **AC-1**, **AC-6**.
2. Add `RESOURCE_TIERS` and the domain validation: submit accepts `diy` only, publish accepts the moderator values, non health entries drop the tier, satisfies **AC-1**, **AC-4**, **AC-5**.
3. Return `tier` from the list and detail reads and add the `tier` filter to the list, satisfies **AC-3**, **AC-7**.
4. Build a `TierBadge` component and use it on the resource card and the detail page, with the DIY standing note, satisfies **AC-2**, **AC-6**, **AC-7**.
5. Add tier filter chips and the `tier` search parameter to the `/r` list, satisfies **AC-3**.
6. Add a "this is a DIY or peer run option" checkbox to the submit form, satisfies **AC-4**.
7. Add the copy for all four languages and set the tier on the seeded entries, satisfies **AC-2**.

## Consequences

**Positive**:
- Readers can tell a checked clinic from a community run group.
- No new table, and existing entries need no change.

**Negative / tradeoffs**:
- The tier has no history of its own. The moderation action log is the record.
- The verified badge can come from two places, which needs the small rule in AC-7.

**Neutral**:
- The migration is additive, so it can be applied to the local and remote databases in the normal order.

## Follow-up

- [ ] Open question: who may verify. Default here is any moderator. A professional credential check (feature 8) may become the only route to verified.
- [ ] Open question: whether a DIY entry must carry a safety note. Default is a standing note on every DIY detail page, and the existing `safetyNotes` detail shows too.
- [ ] Open question: whether tiers differ by country.
- [ ] There is no moderator screen for resources yet, so setting the tier at publish is an API parameter until one exists.
