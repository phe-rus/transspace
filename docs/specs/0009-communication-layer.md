# 0009. Communication layer: comments, messages and voice

**Date**: 2026-09-26
**Status**: In Progress

## Summary

One shared way for people to talk, built in three steps. First, comments on published stories, guides, resources and mutual aid posts. Second, direct messages between two people, from a post. Third, peer to peer voice rooms with text chat. Comments and messages share one table, and blocking is a column on the person row, so this adds one table and no new schema file. Voice needs an infrastructure choice and is specified here but built last.

## Context

Safety places, the gender affirming community, stories and mutual aid all need people to talk to each other. Today nothing does. The audience may be in places where being seen is dangerous, so the design starts from safety: names are the pseudonymous profile name only, anyone can block or report, moderators can remove, and nothing is recorded that is not needed.

You asked for as few tables and schema files as possible. Comments, direct messages and reports are all "a short text from a person, attached to something", so they fit one `message` table with a `kind`. Blocks are a small list per person, so they are a JSON column on `userLink`, not a table. Live voice state lives in the realtime layer, not the database.

Decisions taken as defaults because no questions were asked this round: plain text only (no rich text, no images) up to 2000 characters, one level of replies, comments readable and writable by signed in people only, blocking hides someone from you, and moderators can remove.

## Requirements

**User stories**:
- As a reader, I want to add to the conversation under a story or a place, so that we help each other.
- As a person at risk, I want to block or report someone, so that I can stay safe.
- As a moderator, I want to remove a harmful comment.

**Acceptance criteria**:
- **AC-1**: A signed in person can comment on a published story, guide, resource or mutual aid post, and reply to a comment (one level deep). Nobody else can write.
- **AC-2**: A comment shows the writer's pseudonymous display name only. A deleted account shows the generic name.
- **AC-3**: A writer can delete their own comment. A moderator can remove any comment. A removed comment shows a short "removed" placeholder to readers and never its text.
- **AC-4**: Anyone signed in can report a comment. A report is stored and visible to moderators.
- **AC-5**: A person can block another person. Comments from someone you blocked are not shown to you.
- **AC-6**: Writes need a session that is not a decoy session, a Turnstile check and the write rate limit. A comment is 1 to 2000 characters of plain text.
- **AC-7**: Comments are only readable and writable on content that is published and that the reader may read (a private mutual aid post has none).
- **AC-8** (step two): A signed in person can send a direct message to another person from a post, the recipient sees it in a messages inbox with unread and read state, and a blocked sender's messages are dropped.
- **AC-9** (step three): People can join a voice room with text chat, hosted by a person, with mute, remove and report, and no recording by default.

## Options considered

### Option 1: One message table plus a block column

`message(kind: comment, direct or report)` and `userLink.blockedUserIds`.

**Pros**: one table for three ideas, no new schema file, simple reads.
**Cons**: a shared table needs its `kind` checked on every read.

### Option 2: A table per idea

Separate `comment`, `directMessage`, `report` and `block` tables.

**Pros**: clean shapes.
**Cons**: four tables and their domains, against the stated direction.

### Option 3: An external chat service

**Pros**: realtime and moderation tooling for free.
**Cons**: sends conversations about a vulnerable group to a third party, against the jurisdiction stance in spec 0002.

## Decision

**Chosen option**: Option 1: One message table plus a block column

## Rationale

Every item is a short text from a person attached to a thing or to another person, so one table with a `kind` covers it. Keeping blocks as a column avoids a table for a small per person list. Keeping everything on the app's own database respects the privacy stance.

## Feature design

**Data model sketch**:
- `message`: `id`, `kind` (`comment`, `direct`, `report`), `contentType` and `contentId` (what a comment or report is about), `toUserLinkId` (direct messages), `authorUserLinkId`, `parentId` (a reply's parent), `body` (plain text), `status` (`visible` or `removed`), `readAt` (direct messages), `createdAt`. Lives in `schemas/trust.ts` next to the other content agnostic tables, so there is no new schema file.
- `userLink.blockedUserIds`: nullable text, a JSON array of person ids.

**API surface** (step one):
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| list comments | GET | `contentType`, `contentId` | comments with writer name, `isMine`, replies | signed in | 404 unreadable content |
| post comment | POST | `contentType`, `contentId`, `body`, `parentId?` | comment | signed in, not decoy | 422, 429 |
| delete comment | POST | `id` | id | author or moderator | 403, 404 |
| report comment | POST | `id`, `reason?` | id | signed in | 404 |
| block or unblock | POST | `targetUserLinkId` | list size | signed in | 422 self block |

**Value sourcing**:
| Action | Value | Source |
|---|---|---|
| Writer name | display name | `userLink.displayName`, or the generic name when the account is deleted |
| `isMine` | ownership | the caller's session `userLinkId` compared with `authorUserLinkId` |
| Who is blocked | ids | the caller's `userLink.blockedUserIds` |
| Whether content is readable | published state | the content table's `status` (and tier for mutual aid posts) |

**Key invariants**:
- A removed comment never returns its text.
- A blocked person's comments are never returned to the person who blocked them.
- Comments only exist for published, readable content.

**Security model**: signed in only. Decoy sessions can read but never write. Moderators can remove and read reports. No private column of `userLink` is ever returned.

## Build plan

Step one (built now):
1. Add the `message` table and `userLink.blockedUserIds`, generate the migration, satisfies **AC-1**, **AC-5**.
2. Add the messages domain: list, post, delete, report and block, with the content readable check, satisfies **AC-1** to **AC-7**.
3. Build a reusable comment section and place it on the story, guide, resource and mutual aid post pages, satisfies **AC-1** to **AC-5**.
4. Add copy for four languages, satisfies **AC-2**.

Step two: direct messages and a messages inbox (extends the inbox UI), satisfies **AC-8**.
Step three: voice rooms, satisfies **AC-9**. Needs the realtime decision below.

## Consequences

**Positive**: one table, no new schema file, safe by default.

**Negative / tradeoffs**: comments are plain text only. Moderators have no dedicated report screen yet.

## Follow-up

- [ ] Step three needs a realtime decision. Recommended: browser peer to peer audio (WebRTC) with a Cloudflare Durable Object for signalling and small rooms, and a Cloudflare Realtime media server only if rooms grow past a handful of people. It needs a Durable Object binding and migration in the worker config, so it is left until you confirm.
- [ ] Open question: how long messages are kept, and how abuse reports are triaged.
- [ ] Open question: whether unsigned readers should see comments on public content. Default is signed in only.
- [ ] A moderator screen for reports belongs in the moderator inbox.
