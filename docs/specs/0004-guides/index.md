# 0004. Guides

**Date**: 2026-09-24
**Status**: In Progress

## Summary

This decides how guides (editorial, community-contributed practical articles like "Finding healthcare in Uganda") actually work, replacing the hardcoded prototype at `/guides`. A person can browse, search, and read a guide with its contributor, trust badges, references, and related resources. A signed-in person can submit a guide using a real rich text editor; a moderator can publish or take one down. Built as a close mirror of the resource directory (spec 0003): same minimal moderation model, same trust-signal reuse, same walking-skeleton scope, so the two content types share almost every mechanism instead of each reinventing it. Revised after an independent cross-check found a real content-safety gap (an unrestricted image `src` in the rich text body could act as a tracking beacon or embed oversized data) and several under-specified values (sort order, the read-time formula, the byline fallback); all are fixed below.

## Requirements

**User stories**:
- As anyone browsing, I want to search and filter guides by category, so I can find one relevant to me.
- As anyone, I want to read a guide with its contributor, trust badges, references, and any related resources, so I can judge whether to trust it.
- As a signed-in person, I want to write and submit a guide with real formatting (headings, lists, links, images), so it reads like a real article, not a wall of text.
- As a moderator, I want to publish or reject a pending guide, so only reviewed content reaches the public directory.

**Acceptance criteria**:
- **AC-1**: Anyone, signed in or not, can list published guides filtered by category and a keyword search (title, excerpt), ordered newest first (`createdAt DESC, id DESC`) with the same composite `{createdAt, id}` cursor resource directory uses (spec 0003's own Value sourcing row, copied verbatim here since "mirrors it" isn't itself a value source).
- **AC-2**: Opening a guide's detail page shows its full rendered body, contributor (the submitter's own profile display name, falling back to a fixed placeholder when absent, never a free-text field), a community-reviewed trust badge sourced live from its trust_signal record, its references-available flag, and any related resources (rendered as links, skipping silently if a referenced resource id no longer resolves); an unknown or unpublished id returns a not-found state without crashing the page's SSR render (the same `queryFn`-resolves-to-`null` fix spec 0003's detail page needed, applied here too).
- **AC-3**: A signed-in person can submit a guide with a title, excerpt, category, and a rich text body (via the `@pherus/rich-text` editor, stored as its structured JSON content, never raw HTML); it is created with status `pending`, gets a trust_signal row, and never appears publicly until a moderator publishes it. The guide row and its trust_signal row (including `referencesAvailable`, computed at submit time) are created together in one atomic D1 batch.
- **AC-4**: Only a moderator can move a guide from `pending` to `published` or `rejected`, or take down an already-`published` guide by moving it to `rejected`; every such action writes a `moderation_action` row. A moderator can list pending guides through a status filter that returns 403 for anyone else.
- **AC-5**: `POST /guides`, `/publish`, and `/reject` each require Turnstile verification and are write-rate-limited; every read endpoint is read-rate-limited (spec 0002 AC-5). An in-editor image upload made while composing a guide is deliberately **not** Turnstile-gated (a session, write rate limiting, and the existing per-account storage quota gate it instead); see the Security model below for why.
- **AC-6**: A guide's detail page UI shows only the community-reviewed (co-sign driven) badge; it never renders a "professionally verified" badge for a guide. This is a rendering choice, not an API contract: the underlying trust_signal projection (spec 0003's own public, whitelisted shape) still legitimately includes `professionalVerified`, since that field was already cleared as safe to expose publicly: the guide UI just chooses not to display it.
- **AC-7**: A guide submission's category is validated against the shipped registry (422 if unknown).
- **AC-8**: A session in decoy/duress mode can never submit, publish, or reject a guide, or upload an in-editor image; the existing `assertNotDecoy` check rejects the attempt.
- **AC-9**: A submitted guide's `bodyContent` is validated before it is ever stored: every image node's `src` must point at this app's own `/api/uploads/…` path (no `data:` URLs, no third-party URLs, since an unrestricted image src would let a guide silently beacon a reader's IP to an outside host on every view); the serialized content is capped at 256 KB; `relatedResourceIds` may not submit more than 10 raw entries (rejected outright, never silently truncated); the survivors are then de-duplicated and each must be a syntactically valid id. Any violation returns 422, before the atomic batch in AC-3 ever runs.
- **AC-10** (added 2026-09-25, the engineer's explicit call, revising the "guides" concept from a single editorial article toward tutorials/skill-building content that can span a series): A guide may optionally belong to a **series** (a named, ordered group, e.g. "Excel basics part 1, 2, 3"), carry a **cover image**, and carry a **video** as an embed link, none required. A series is found-or-created by title at submission time (case-insensitive match against existing series, same find-or-create shape as resource directory's country, spec 0003 AC-3), created atomically with the guide when new. A cover image follows the exact same same-origin `/api/uploads/…` rule as an in-body image (AC-9); a video is a URL restricted to a fixed allowlist of embeddable providers (YouTube, Vimeo) validated at submission, never rendered as an arbitrary iframe src. The existing category registry (`GUIDE_CATEGORIES`) gains `technology`, `finance`, and `creative` alongside the existing `health`, `legal`, `career`, `life-skills`, so the category set reflects tutorials/skills content (software development, crypto and money, cooking, official documents, spreadsheets, etc.), not only support-article topics; every category, old or new, goes through the same moderator review (AC-4), there is no differentiated review path by category.

## Decision

**Chosen option**: Option 1: Minimal walking skeleton, mirroring resource directory's own shape, with the content-safety and value-sourcing gaps the cross-check found fixed before build.

## Feature design

**Data model sketch**:

| Table | Field | Type | Notes |
|---|---|---|---|
| `guide` | `id` | text, primary key | |
| | `title` | text, required | |
| | `excerpt` | text, required | short one-line summary, shown on cards, independent of the body |
| | `category` | text, required | validated against the shipped `GUIDE_CATEGORIES` constant (health, legal, career, life-skills, technology, finance, creative as of AC-10), same pattern as `RESOURCE_CATEGORIES` |
| | `bodyContent` | text (JSON), required, ≤256 KB serialized | the `@pherus/rich-text` editor's structured Tiptap content; never raw HTML, so rendering it never touches `dangerouslySetInnerHTML` or needs an HTML sanitizer. Validated at submission per AC-9 (image `src` allowlist, size cap) before it is ever written. |
| | `wordCount` | integer, required | computed once at submission from `bodyContent`'s text nodes (see Value sourcing); stored, not recomputed on every read, because a list of guides needs it on every row and there is no edit path in this build to make it go stale |
| | `relatedResourceIds` | text (JSON array of strings), nullable, ≤10 entries | optional resource ids the submitter picks, capped and de-duplicated at submission (AC-9); not validated against the `resource` table's actual contents at submission time (Follow-up), the detail page just skips an id that no longer resolves |
| | `seriesId` | text, nullable, foreign key to `guide_series.id` | AC-10; find-or-create by title at submission, never a raw client-supplied id |
| | `seriesOrder` | integer, nullable | AC-10; the submitter's own stated position within the series (1-based); not enforced unique or contiguous in this build, a display hint only |
| | `coverImageUrl` | text, nullable | AC-10; same same-origin `/api/uploads/…` rule as an in-body image (AC-9) |
| | `videoUrl` | text, nullable | AC-10; validated at submission against a fixed embeddable-provider allowlist (YouTube, Vimeo hostnames only) |
| | `status` | text, required | `pending` \| `published` \| `rejected`; moderator-only transitions, including a `published` → `rejected` takedown, identical state machine to `resource` (spec 0003) |
| | `submittedBy` | text, foreign key to `userLink.id`, required | never a client-supplied value, always the session's own id; also the source of the byline (via `profile.displayName`), never a free-text field |
| | `createdAt` / `updatedAt` | timestamp, required | |
| `guide_series` | `id` | text, primary key | AC-10 |
| | `title` | text, required | matched case-insensitively at find-or-create, same shape as `country.name` in spec 0003 |
| | `description` | text, nullable | |
| | `createdAt` | timestamp, required | |
| search index | `lower(title)`, `lower(excerpt)` | | functional indexes, same pattern as `resource`'s `lower(name)`/`lower(city)`; AC-1 searches both title and excerpt, so both need an index, not title alone |
| pagination index | `(createdAt, id)` | | supports `ORDER BY createdAt DESC, id DESC` and the composite cursor, same as `resource`'s `resource_createdAt_id_idx` |
| series index | `(seriesId, seriesOrder)` | | supports listing a series in order |
| series find-or-create index | `guide_series` `lower(title)` | | mirrors `country`'s `lower(name)` unique lookup (spec 0003 AC-3) |

No `readTime` or `referencesAvailable` column: `readTime` is derived from the stored `wordCount` at read time (cheap arithmetic, no JSON parsing per row); `referencesAvailable` lives entirely on the existing `trust_signal` row via the shared mechanism, not duplicated here.

Logical link, not a foreign key: `guide` ↔ `trust_signal` via `trust_signal.contentType = "guide"`, `trust_signal.contentId = guide.id` (spec 0003 under 0002, already built; `"guide"` already a valid registered content type in the shipped `CONTENT_TYPES` registry).

**State transitions**: `guide.status`: `pending` → `published` (moderator only) · `pending` → `rejected` (moderator only) · `published` → `rejected` (moderator only, a takedown). Identical to `resource`'s state machine (spec 0003).

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/guides` | GET | `category?`, `search?`, `status?`, `cursor?`, `limit?` | paginated list (public fields only, no `submittedBy`), each item including its contributor byline, community-reviewed badge, and `readTime`, ordered newest first | none, no middleware; reads the session if one exists to decide whether a non-`published` `status` is allowed | 422 unknown category, 403 a non-moderator (or no session) requesting a non-published status |
| `/guides/:id` | GET | none | full guide (rendered body content, `readTime`, resolved `relatedResources` — only the ids that still resolve to a `published` resource, each a minimal `{id, name, category}` projection) plus its trust_signal projection and byline | none, no middleware; same optional-session check as the list endpoint | 404 not found, or not `published` and the caller isn't a moderator |
| `/guides` | POST | `title`, `excerpt`, `category`, `bodyContent` (Tiptap JSON), `relatedResourceIds?`, `seriesTitle?`, `seriesOrder?`, `coverImageUrl?`, `videoUrl?`, `turnstileToken` | `id`, `status: "pending"` | session required, decoy sessions rejected | 401 no session, 403 decoy session or Turnstile failed, 422 unknown category, a `bodyContent`/`relatedResourceIds` validation failure (AC-9), or an invalid `coverImageUrl`/`videoUrl` (AC-10), 429 rate limited |
| `/guides/series` | GET | `search?` | existing series (`id`, `title`), for the submit form's "attach to an existing series" picker | none | none |
| `/guides/:id/publish` | POST | `turnstileToken` | `id`, `status: "published"` | moderator only, decoy sessions rejected | 404, 403, 422 not currently `pending` |
| `/guides/:id/reject` | POST | `turnstileToken` | `id`, `status: "rejected"` | moderator only, decoy sessions rejected | 404, 403, 422 already `rejected` |
| `/guides/upload-image` | POST | `file` (multipart) | `key`, `url` | session required, decoy sessions rejected, **no Turnstile** (see Security model) | 401 no session, 403 decoy session, 413 over size/quota, 422 disallowed type, 429 rate limited |

The general `POST /api/uploads` (spec 0002) is left untouched for its existing callers; this is a new, narrower endpoint for in-composition image embeds specifically, reusing the same underlying sniff/sanitize/quota helpers (`@/lib/uploads`) but without the Turnstile requirement (see Security model for why).

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `GET /guides` \| `/guides/:id` | the published-only filter | `guide.status` column, defaulted to `"published"` unless the caller has a moderator session, identical pattern to `resource` |
| `GET /guides` | category validity | the shipped `GUIDE_CATEGORIES` constant (`www/src/data/guides.ts`), same pattern as `RESOURCE_CATEGORIES` |
| `GET /guides` | keyword search across title/excerpt | a case-insensitive match against `guide.title` and `guide.excerpt` via the functional `lower()` indexes above |
| `GET /guides` | sort order and pagination | `ORDER BY guide.createdAt DESC, guide.id DESC`; the cursor is the same opaque `{createdAt, id}` token (base64url JSON) `GET /resources` uses, not `lib/pagination.ts`'s bare-id cursor, for the identical reason (`id` is a random UUID, carries no chronological order) |
| `GET /guides` \| `/guides/:id` | contributor byline | `profile.displayName`, joined from `guide.submittedBy` → `userLink.id` → `profile.userLinkId`; falls back to a fixed placeholder string ("Community contributor") when `displayName` is null or the profile row itself is absent (a soft-deleted account, `profile.deletedAt` set, or in principle a row that predates onboarding) — never a field the submitter fills in directly |
| `GET /guides` \| `/guides/:id` | `readTime` | `Math.max(1, Math.ceil(wordCount / 200))` minutes, computed from the **stored** `wordCount` column, not recomputed from `bodyContent` on every read |
| `GET /guides` \| `/guides/:id` | community-reviewed badge (list card and detail) | composed via a `LEFT JOIN` to `trust_signal` on (`contentType = "guide"`, `contentId = guide.id`), reading only `communityReviewed` and `coSignCount`; `professionalVerified` is fetched (it's part of the same whitelisted row) but the UI never renders it for a guide (AC-6) |
| `GET /guides/:id` | `references` flag | `trust_signal.referencesAvailable`, read the same way as `resource`'s (not duplicated on `guide` itself) |
| `GET /guides/:id` | related resources | `guide.relatedResourceIds` (a JSON array of ids), resolved with one `IN (...)` query against `resource` filtered to `status = "published"`; an id with no match is silently dropped, never a broken link or an error |
| `POST /guides` | `submittedBy` | the session's own `userLinkId`, never a request body field |
| `POST /guides` | initial `status` | fixed to `"pending"`, never client-settable |
| `POST /guides` | `wordCount` | computed once at submission: concatenate every `text` node's string in the Tiptap JSON, count whitespace-delimited tokens for the whitespace-segmented portion, and separately add one "word" per CJK (Han/Hiragana/Katakana/Hangul) codepoint run divided by 2 (a rough per-character reading-speed proxy, since those scripts don't use inter-word spaces and a raw whitespace split would wildly undercount them) |
| `POST /guides` | `bodyContent` safety validation | walk the parsed JSON: every node of type `image` must have a `src` starting with `/api/uploads/` (this app's own upload path) — any `data:` URI or external URL is rejected (422); the serialized JSON string must be ≤256 KB (422 if larger). Runs before anything is written (AC-9). |
| `POST /guides` | `relatedResourceIds` validation | the cap applies to the raw submitted count (>10 entries is rejected outright, never silently truncated); only then is the array de-duplicated, and each surviving entry must match the id format this app's own ids use (a UUID string); either failure returns 422 (AC-9) |
| `POST /guides` | `seriesId` | `seriesTitle`, if given, is matched case-insensitively against existing `guide_series.title`; a match reuses that row's id, no match inserts a new `guide_series` row in the same atomic batch as the guide and its `trust_signal` (AC-10, mirrors `findOrCreateCountry`, spec 0003 AC-3) |
| `POST /guides` | `coverImageUrl` validation | must start with `/api/uploads/` exactly like an in-body image (AC-9's `assertSafeImageSrc`, reused); any other value returns 422 (AC-10) |
| `POST /guides` | `videoUrl` validation | the URL's hostname must be one of a fixed allowlist (`youtube.com`, `www.youtube.com`, `youtu.be`, `vimeo.com`); anything else returns 422 (AC-10). Never rendered as a raw iframe `src` built from arbitrary input elsewhere in the app; the detail page only ever embeds a URL that already passed this check |
| `POST /guides` | the guide row and its `trust_signal` row (including `referencesAvailable`) | created together in one atomic D1 batch: the trust_signal insert's `referencesAvailable` value is computed inline from a scan of `bodyContent` for at least one `link` mark/node before the batch runs, **not** a second `setReferencesAvailable` call after the fact (that helper is an awaited `db.update`, not a query builder, and can't join an already-executing batch of unexecuted builders — the same reason `resource`'s submit inlines its own trust_signal insert instead of calling `createTrustSignal`) |
| `POST /guides` \| `/publish` \| `/reject` \| `/guides/upload-image` | the decoy-session block | the existing `assertNotDecoy` check, applied to every write in this feature including the image upload |
| `POST /guides/:id/publish` \| `/reject` | `moderation_action` row | the existing `logModerationAction`, actor = the moderator's session `userLinkId`, target = the guide id |
| `POST /guides/upload-image` | the inserted image's URL | the sniff/sanitize/quota helpers from `@/lib/uploads` (spec 0002), reused directly; stored under the caller's own `storagePrefix` exactly like the general upload endpoint, just without requiring a Turnstile token per call (see Security model) |

**Key invariants**:
- A guide is visible through the public list or detail endpoints only when `status = "published"`, unless the caller has a moderator session.
- `submittedBy` is always the session's own `userLinkId`; the byline is always derived from that account's own `profile.displayName` (or the fixed fallback), never client-supplied text.
- A guide and its `trust_signal` row are created atomically; one never exists without the other, and `referencesAvailable` is correct from the first read (never a follow-up write).
- Every publish or reject action writes exactly one `moderation_action` row; `reject` is reachable from both `pending` and `published`.
- `wordCount` is computed once at submission and never recomputed, since no edit path exists in this build; if one is added later, recomputing `wordCount` on edit is part of that future work, not assumed here.
- A decoy/duress session can never submit, publish, reject, or upload an in-editor image; `assertNotDecoy` runs before any write in this feature.
- `bodyContent` is always structured JSON, size-capped, and every image `src` in it always points at this app's own upload path; nothing in this feature ever renders a guide's body via `dangerouslySetInnerHTML` or trusts an arbitrary external image URL.

**Security model**: `GET /guides` and `GET /guides/:id` are public, no middleware, read-rate-limited, matching the trust-signal and resource-directory read pattern exactly. `POST /guides` requires a session plus Turnstile, write rate limiting, and the decoy block, identical to `POST /resources`. `POST /guides/:id/publish` and `/reject` require the caller's `userLinkId` to be present in the `moderators` table (spec 0002); both are Turnstile-verified, write-rate-limited, decoy-blocked, and audited.

`POST /guides/upload-image` deliberately does **not** require Turnstile, unlike every other write in this codebase. Reasoning: a Cloudflare Turnstile token is single-use (consumed the moment `/siteverify` accepts it), but a person composing a guide may upload several images while writing, before ever reaching a final "submit" action; the existing `TurnstileWidget` yields exactly one token with no reset/execute affordance, so requiring a fresh token per in-editor upload isn't buildable without a materially different widget. Session (a real signed-in account), write rate limiting, and the existing per-account storage quota (spec 0002) still gate this endpoint; Turnstile's marginal value for an already-authenticated, already-rate-limited, already-quota-capped write is lower than for the anonymous or higher-stakes actions it guards elsewhere. The general `POST /api/uploads` endpoint (spec 0002) is untouched and still requires Turnstile for its other callers.

The one genuine new injection-adjacent surface this feature introduces is `bodyContent`: a submitter fully controls it, and it can embed images. AC-9's validation (same-origin `src` only, size cap) is the mitigation: without it, a submitted guide could embed a third-party image URL that silently beacons every reader's IP to an outside host on render, or a `data:` URI large enough to blow past the upload module's own size/type/quota guarantees entirely (since a `data:` URI never goes through the upload endpoint at all). Links are not a comparable risk: `@tiptap/extension-link`'s own `renderHTML` re-validates `href` against an http/https/mailto allowlist regardless of what's in the stored JSON, so a malicious link scheme can't survive rendering even if it somehow reached the row.

**Configuration required**: none new, but not "none" either: `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` still have no real values anywhere in this environment (the same pre-existing gap spec 0002 and spec 0003 already flagged), so `POST /guides`, `/publish`, and `/reject` cannot actually complete end to end until they do. `POST /guides/upload-image` is unaffected, since it doesn't use Turnstile.

**Critical test scenarios**:
- Happy path: a signed-in person writes a guide with a heading, a list, an in-editor image, and a link, submits it, a moderator publishes it, and it now appears in `GET /guides` and `GET /guides/:id` with `referencesAvailable: true`, the uploaded image's same-origin URL intact, and a `readTime` derived from its stored `wordCount`, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**
- Failure case: submitting an unknown category returns 422; a guide with no link in its body gets `referencesAvailable: false`; submitting `bodyContent` containing an image node with a `data:` or third-party `src` returns 422 and writes nothing, verifies **AC-3**, **AC-7**, **AC-9**
- Takedown: a moderator rejects an already-`published` guide; it immediately stops appearing in `GET /guides` and `GET /guides/:id`, the action is audited, verifies **AC-4**
- Auth/permission: an anonymous `POST /guides` returns 401; a non-moderator calling `/publish`, `/reject`, or `GET /guides?status=pending` returns 403, verifies **AC-4**, **AC-5**
- Decoy safety: a session in decoy mode attempting `POST /guides`, `/publish`, `/reject`, or `/guides/upload-image` is rejected before any write happens, verifies **AC-8**
- Badge scope: the guide detail **page** never renders a "verified professional" badge, even for a guide whose trust_signal has `professionalVerified: true` (set via the generic, content-agnostic `/api/trust-signals/guide/:id/verify` endpoint, which still works); the underlying API response is allowed to carry the field, only the UI suppresses it, verifies **AC-6**
- Content safety: `relatedResourceIds` with 15 entries (5 duplicated) submitted → rejected with 422 before de-duplication is even attempted at the API boundary (the cap is enforced, not silently truncated), verifies **AC-9**

## Build plan

1. [x] Stabilize `shared/rich-text` (the engineer's own package, added mid-session): corrected every `@infra/ui/*` import to `@pherus/ui/*`, fixed the `catalog:` version specifiers (this repo has no bun catalog configured) to explicit versions matching the rest of the monorepo, added the missing `Combobox` primitive to `shared/ui` (Base UI has a native `combobox` module; `shared/ui/AGENTS.md`'s own roadmap already called for one) as a new file, added a `PopoverContent` convenience export to `shared/ui`'s existing `popover.tsx` (bundling Portal+Positioner+Popup, matching `SelectContent`'s existing pattern) without altering its existing exports, installed and confirmed a clean typecheck across the whole monorepo. Kept additive throughout: no existing working code was restructured, only imports/versions corrected and two new pieces added, so this was safe to run without a live review pause. Satisfies nothing in `## Requirements` directly but unblocks every later task.
2. [x] Create the `guide` migration for the confirmed data model, including `wordCount`, the functional lowercase title/excerpt indexes, and the `(createdAt, id)` pagination index, satisfies **AC-1**–**AC-3**, **AC-9**
3. [x] Build the submit domain function and `POST /api/guides`: session required, `assertNotDecoy`, Turnstile, write rate limit, `bodyContent`/`relatedResourceIds` validation (AC-9) before anything else runs, `wordCount` and the link-scan computed inline, one atomic D1 batch creating the guide as `pending` plus its fully-populated `trust_signal` row, satisfies **AC-3**, **AC-5**, **AC-7**, **AC-8**, **AC-9**
4. [x] Build the narrower `POST /api/guides/upload-image` (session, `assertNotDecoy`, write rate limit, no Turnstile, reusing `@/lib/uploads`'s sniff/sanitize/quota helpers), satisfies **AC-5**, **AC-8**
5. [x] Build the list domain function and `GET /api/guides` (category/search filters across title and excerpt, the `trust_signal` and `profile` joins for the card's badge and byline, `readTime` from stored `wordCount`, the `{createdAt, id}` cursor, published-only default, optional-session moderator override), satisfies **AC-1**, **AC-4**, **AC-5**
6. [x] Build the detail domain function and `GET /api/guides/:id` (same joins as the list, plus resolved `relatedResources`, the null-safe not-found pattern spec 0003's detail query already established), satisfies **AC-2**, **AC-5**, **AC-6**
7. [x] Build the publish domain function and endpoint (moderator only, Turnstile, `assertNotDecoy`, only from `pending`, `logModerationAction`) and the reject domain function and endpoint (same guards, reachable from `pending` or `published`), satisfies **AC-4**, **AC-5**, **AC-8**
8. [x] Wire `/guides` (list) to the real endpoints via TanStack Query, replacing the `guides` mock. Built a new `/guides/$guideId/details` route (there was no existing prototype to replace, unlike resource directory) using the `@pherus/rich-text` `Preview` component to render `bodyContent`. Built a new, dedicated `/submit-guide` page (kept separate from `/submit`'s resource form, since the two forms share almost no fields and a rich text editor is a materially different composition experience than a short form) using the `Editor` component, its `onUpload` wired to the new `POST /api/guides/upload-image`, plus real paraglide message keys for all four shipped locales (en/de/fr/zh) — the machine-translate service was down for the whole session, so de/fr/zh were translated by hand instead of skipped, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-6**, **AC-7**
9. [x] AC-10 (2026-09-25): `guide_series` migration plus `seriesId`/`seriesOrder`/`coverImageUrl`/`videoUrl` on `guide`; `findOrCreateSeries` (atomic with the submit batch); `GET /guides/series`; `technology`/`finance`/`creative` added to `GUIDE_CATEGORIES`; the submit form gained a series combobox (existing or new), a video URL field, and a cover image upload; the detail page renders the cover image, an embedded video (only for a `videoUrl` that already passed the allowlist check server-side), and links to sibling guides in the same series ordered by `seriesOrder`. Folded `domains/guides/func.ts` (grown to 464 lines, six unrelated operations in one file) into `domains/guides/func/` split by operation, satisfies **AC-10**

## Consequences

**Positive**:
- Guides becomes real end to end: search, filter, submit with a genuine rich text editor, and moderate, all working against live data instead of a hardcoded mock.
- Almost every mechanism (moderation, trust signals, decoy safety, rate limiting, uploads) is reused from resource directory and spec 0002; the one genuinely new piece (`bodyContent` safety validation) exists specifically because this content type, unlike a resource listing, lets a submitter embed images and links inside free-form structured content, a real new surface that earned its own scrutiny rather than being waved through as "just like resources."
- `shared/rich-text` becomes usable for every future feature that needs formatted content (stories, opportunities descriptions), not just guides, since fixing it here fixes it everywhere.
- `wordCount` stored once at submission means the list endpoint never has to pull full `bodyContent` just to compute a display number for every row.

**Negative / tradeoffs**:
- `POST /guides/upload-image` is the one write endpoint in this entire codebase without Turnstile protection. The reasoning is recorded in the Security model above; if in-editor image abuse becomes a real problem, the fix is a Turnstile widget with a real reset/execute affordance, not reverting to the general upload endpoint's contract.
- `relatedResourceIds` is capped and format-validated at submission, but still not checked against the `resource` table's actual contents; a submitter can reference a syntactically valid id that never existed, or later gets rejected, and it just silently disappears from the rendered guide (Follow-up).
- Same country-scoped-moderation and vetted-access gaps as resource directory: any moderator can publish or reject any guide, and a published guide has no protection beyond the takedown path.
- The "professionally verified" badge concept exists in the data (any content type can be verified) but is deliberately never shown for guides; a future spec revisiting this needs to know that's a UI choice, not a missing capability.

**Neutral**:
- `shared/rich-text`'s image picker (`renderBrowser`/`EditorBrowserProps`, for choosing an already-uploaded image rather than uploading a new one) is not wired in this build; only direct upload (`onUpload`) is used. Its doc comments still reference `@baseconfig/core`'s `StorageWidget`, a package that doesn't exist in this repo; harmless (nothing imports it), but worth a comment cleanup pass later.
- Uploaded images consume R2 storage quota at upload time, before the guide they're embedded in is ever submitted or published; an abandoned draft leaves an orphaned file. Bounded damage (the existing per-account quota and 10 MB per-file cap still apply), but not cleaned up automatically (Follow-up).

## Follow-up

- [ ] `relatedResourceIds` isn't checked against the `resource` table's actual contents at submission time, only format-validated; confirm each id resolves to an existing, published resource before accepting a submission.
- [ ] Country-scoped moderators plus a real moderator/admin review dashboard: same gap as resource directory, tracked once under scope feature 11, not duplicated per content type.
- [ ] `shared/rich-text`'s `renderBrowser` (pick an existing upload instead of uploading a new one) isn't wired; the existing `listUploads` endpoint (spec 0002) already supports it whenever it's worth building.
- [ ] `shared/rich-text`'s doc comments reference `@baseconfig/core` (`StorageWidget`, `uploadFile`), a package from wherever this component was adapted from that doesn't exist in this repo. Not a build error (nothing imports it), but worth updating the comments to describe this repo's own upload module instead.
- [ ] No guide edit/revision path exists in this build; a published guide can only move to `rejected`, never back to `pending` for a resubmission with corrections.
- [ ] Orphaned uploads: an image uploaded while composing a guide that's never submitted (or a rejected guide) leaves its file in R2 indefinitely. Bounded by the existing quota and per-file cap; a real cleanup pass (e.g. a scheduled job removing unreferenced uploads older than N days) is future work.
- [ ] `POST /guides/upload-image` has no Turnstile protection (see Security model's reasoning); revisit if a real Turnstile widget reset/execute affordance is ever built, or if in-editor upload abuse is actually observed.
- [ ] No dedicated series index/browse page exists yet (AC-10); a guide's detail page only lists its sibling guides inline. A `/guides/series/$seriesId` page is natural future work once series usage picks up.
- [ ] `seriesOrder` is not enforced unique or contiguous within a series; two guides can claim the same order, or a series can have gaps. Display-only for now.
- [ ] Found while building this: the existing `POST /api/uploads` (spec 0002) has the same latent bug this feature's own upload route needed fixing — `request.formData()` throws a plain `TypeError` on a missing/wrong `Content-Type`, which `toHttpResponse` doesn't catch (it only catches `Response` instances), so a malformed request 500s instead of a clean 400. Fixed here for `/guides/upload-image`; the pre-existing route was left untouched since fixing shipped spec 0002 code wasn't this spec's job to do silently, but it has the identical gap.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
