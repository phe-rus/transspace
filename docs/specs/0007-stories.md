# 0007. Stories: personal experiences shared by the community

**Date**: 2026-09-26
**Status**: In Progress

## Summary

People can read and submit firsthand stories about transition, moving, housing, work, health and family. Every story is clearly marked as one person's experience, not advice, and the writer chooses whether their profile name is shown or the story is anonymous. Stories reuse the guides table, submit flow, moderation and rich text editor, so this adds two columns and no new tables.

## Context

The `/stories` page is a "coming soon" stub, and the scope lists Stories as feature 14. Stories are close cousins of guides: a title, a summary, a rich text body, a topic, moderation before publishing, and a trust signal. The differences are the framing (personal experience) and the privacy choice about identity.

You asked for as few tables and schemas as possible, so the design extends the existing content table instead of adding a story table. Decisions taken as defaults because no questions were asked this round: two identity choices (profile name or anonymous), a fixed list of topics, no series and no cover image or video for stories, and the same moderator review as guides.

## Requirements

**User stories**:
- As a reader, I want to read a story and see that it is one person's experience, so I do not mistake it for advice.
- As a writer, I want to choose whether my profile name is shown, so I can share safely.
- As a moderator, I want stories to go through the same review as guides before they appear.

**Acceptance criteria**:
- **AC-1**: `/stories` lists published stories, filterable by topic and searchable by title and summary. Guides never appear there, and stories never appear on `/guides`.
- **AC-2**: A story page shows the rich text body, the topic, the writer line and a clear "one person's experience, not advice" note.
- **AC-3**: A signed in person can submit a story with a title, summary, topic, identity choice and rich text body. It starts as pending and is hidden until a moderator publishes it.
- **AC-4**: A story needs an identity choice. With `anonymous` no writer name is shown anywhere, in lists or on the page. With `profile` the profile display name shows, and a deleted profile falls back to the generic "Community contributor" line.
- **AC-5**: A story topic must be one of the shipped topics, and a guide category must be a guide category. The wrong list for the kind is refused with 422.
- **AC-6**: Existing guides are unchanged and behave as before.

## Options considered

### Option 1: Two columns on the guide table

Add `kind` (`guide` or `story`) and `authorVisibility` (`profile` or `anonymous`, only for stories) to `guide`.

**Pros**:
- No new table or schema file, which matches the rule to keep schemas minimal.
- Moderation, trust signals, rich text checks, list and detail reads are all reused.

**Cons**:
- Every guide read must filter by `kind`, or stories leak into guides.
- The table name `guide` is slightly narrower than what it holds.

### Option 2: A separate story table

**Pros**:
- Clean separation.

**Cons**:
- A whole new table, schema file, domain, moderation path and trust wiring for a small difference. Against the stated direction.

## Decision

**Chosen option**: Option 1: Two columns on the guide table

Stories are guides with `kind = story`, a topic in the `category` column and an identity choice in `authorVisibility`.

## Rationale

The two content types share almost everything, and the difference is two small facts. Extending the table keeps one moderation and trust path. The risk of stories leaking into guides is handled by making the list default to `kind = guide`, which also keeps every existing guide read correct without change (AC-6).

## Feature design

**Data model sketch**:
- `guide.kind`: text, not null, default `guide`. Values `guide` or `story`.
- `guide.authorVisibility`: text, nullable. `profile` or `anonymous`, required when `kind = story`.
- Story topics live in a shipped `STORY_TOPICS` constant: transition, relocation, housing, employment, health, family, community. They are stored in the existing `category` column.

**State transitions**: the same as guides: pending, published, rejected, with moderator only transitions.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| list guides | GET | `kind?` (default guide), `category?`, `search?` | items with `kind`, `contributor` (null when anonymous) | public | 422 wrong category for kind |
| get guide | GET | id | item with `kind`, `authorVisibility`, `contributor` | public | 404 |
| submit guide | POST | `kind?`, `authorVisibility?` plus the guide fields | id, status | signed in | 422 |
| publish and reject | POST | id | id, status | moderator | as guides |

**Value sourcing**:
| Action | Value displayed | Source |
|---|---|---|
| Writer line | the name | the profile `displayName` when `authorVisibility = profile`, nothing when `anonymous` |
| Topic list | topic labels | the shipped `STORY_TOPICS` constant |
| Experience note | the note text | an i18n message, the same on every story page |

**Key invariants**:
- An anonymous story never returns a writer name from any read.
- A story always has an identity choice.
- Default reads only return `kind = guide`.

**Security model**: anyone reads published stories. A signed in person submits. Moderators publish or reject. The identity choice is enforced on the server, never trusted from the client for display.

**Critical test scenarios**:
- Happy path: submit a story, publish it, and see it on `/stories` with the experience note, verifies **AC-1**, **AC-2**, **AC-3**.
- Privacy: an anonymous story shows no name in the list or the page, verifies **AC-4**.
- Failure: a guide category on a story returns 422, verifies **AC-5**.
- Regression: `/guides` still lists guides and no stories, verifies **AC-1**, **AC-6**.

## Build plan

1. Add `kind` and `authorVisibility` to `guide` and generate the additive migration, satisfies **AC-6**.
2. Add the topic constants and the kind aware validation, satisfies **AC-5**.
3. Make list, get and submit kind aware, including the anonymous writer rule, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-6**.
4. Build the stories list, story page and submit page with the rich text editor, satisfies **AC-1**, **AC-2**, **AC-3**.
5. Add the copy for all four languages and seed a few stories, satisfies **AC-2**.

## Consequences

**Positive**:
- One moderation and trust path, no new tables.

**Negative / tradeoffs**:
- Every guide read must respect `kind`.

**Neutral**:
- The migration is additive with a default, so existing rows stay valid.

## Follow-up

- [ ] Open question: whether a story can be edited after publishing. Default here is no edit, as with guides.
- [ ] Open question: how to handle stories that name other people. Default is a reminder on the submit page and moderator review.
- [ ] Comments on stories arrive with the communication layer (feature 21).
- [ ] There is no moderator screen for stories yet. They are published through the existing guide moderation calls until the moderator inbox grows to cover them.
