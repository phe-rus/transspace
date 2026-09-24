# 0002. Data model and backend

Supports scope feature 6. Part of the [identity, data and trust foundation](index.md); shares its Proposed stack and cross child contract.

> Revised after an independent cross check found the moderator system had no floor (a single moderator could revoke every other moderator down to zero) and no audit trail, several constants were left for a future builder to invent despite being called "established here," per person file URLs would have leaked an internal database id, and a bot challenge on search endpoints would have actively hurt the Tor and VPN traffic this project's own threat model expects. All four are fixed below.

## Summary

This is the plumbing every later feature builds on: a real database (Cloudflare D1, reached through Drizzle) with a working migration workflow, a file storage module for anything people upload, who counts as a Transspace moderator (with real guardrails so that role can't be emptied out or abused invisibly), and the guardrails that keep the directory from being trivially scraped, without punishing the exact population most likely to be reading it over Tor or a VPN. It deliberately does not design the resources, guides, stories, or any other content table; those each get their own focused decision later, once this plumbing exists to build them on.

## Requirements

**User stories**:
- As the engineer, I want one proven database and query setup so that every later feature has a real place to store data instead of the placeholder files in `src/data/`.
- As a moderator, I want a way to grant moderator status to someone else, so that the review queue (scope feature 11) has people who can act on it once it is built, without any one moderator being able to lock everyone else out.
- As anyone uploading a photo or attachment, I want it validated and stored safely, so that a bad file can't be disguised as something else or blow past a reasonable size.
- As someone reading this directory from a place where that is risky, I want to browse and search it without being challenged like a bot just for using Tor or a VPN.

**Acceptance criteria**:
- **AC-1**: Cloudflare D1 and Drizzle ORM are wired into the Transspace Worker, with a migration workflow (generate, apply, inspect) matching the one Infra already uses.
- **AC-2**: A `moderators` table exists, keyed to `user_link`; an existing moderator can grant or revoke moderator status for someone else, no one can grant it to themselves, and a revoke is rejected outright if it would drop the moderator count below two. Every grant, revoke, and other moderator only action is written to an append only audit table.
- **AC-3**: Every file upload goes through one shared module that sniffs the file's real content type (never trusts the extension or the declared `Content-Type`), checks it against a named allowlist (`image/png`, `image/webp`, `image/jpeg`, `image/svg+xml` sanitized on upload, `application/pdf`), enforces a 10 MB per file limit and a 500 MB per person quota computed by listing that person's own files, never a separate counter that could drift, and stores objects under a random `storage_prefix` (from [0001](0001-authentication-identity.md)'s `user_link` table), never the internal database id.
- **AC-4**: Every endpoint that lists or searches Transspace's own data enforces a maximum page size of 50, defaults to 20, and requires an explicit cursor or offset; no endpoint can return an entire table in one call.
- **AC-5**: Every write endpoint (uploads, moderator actions, trust signal writes) is protected by a Cloudflare Turnstile challenge plus a rate limit; a request over the limit is rejected outright (429), not silently delayed. Read and search endpoints carry a rate limit only, no interactive challenge, so they stay usable over Tor and commercial VPNs.
- **AC-6**: Backend logic is organized as TanStack Start server functions in a domain folder shape, and any endpoint meant to be called from outside the router app itself is also exposed as a plain REST route under `src/routes/api/`.

## Decision

**Chosen approach**: Cloudflare D1 plus Drizzle ORM, the same combination Infra already runs, with a Transspace owned R2 bucket for storage and a small, purpose built upload module rather than any dependency on Infra's own asset plugin (see [index.md](index.md)'s Proposed stack and rationale for why). Rate limiting for writes uses Cloudflare's own Rate Limiting Rules binding rather than the KV backed custom rule pattern Infra uses for its own endpoints: KV is only eventually consistent, a poor fit for a hard limit meant to actually stop abuse in the moment, while the native binding enforces at the edge.

## Feature design

**Data model sketch**:

| Table | Field | Type | Notes |
|---|---|---|---|
| `moderators` | `user_link_id` | text, primary key, foreign key to `user_link.id` | one row per moderator |
| | `granted_by` | text, foreign key to `user_link.id`, nullable | null only for the manually seeded first moderators |
| | `granted_at` | timestamp, required | |
| `moderation_action` | `id` | text, primary key | append only, never updated or deleted |
| | `actor_user_link_id` | text, foreign key to `user_link.id`, required | |
| | `action` | text, required | for example `"moderator.grant"`, `"moderator.revoke"`, `"trust.verify"`, `"upload.delete_other"` |
| | `target` | text, nullable | the affected `user_link_id`, content id, or file key, depending on `action` |
| | `created_at` | timestamp, required | |

No separate file tracking table: like Infra's own asset plugin, R2 itself is the source of truth, and a person's quota is computed on demand by listing objects under their own `storage_prefix` (from [0001](0001-authentication-identity.md)) and summing their sizes.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/uploads` | POST | a file (multipart), sniffed and allowlist checked | the stored key (under the caller's `storage_prefix`) and its public read URL | session, self service, Turnstile verified | 413 over the 500 MB quota or the 10 MB single file limit, 422 disallowed type |
| `/uploads` | GET | `prefix?` | the caller's own objects (or, for a moderator, another person's, with an explicit target, logged to `moderation_action`) | session | |
| `/uploads` | DELETE | one or more keys | confirmation | session, self or moderator on someone else's key (logged to `moderation_action` if acting on someone else) | 403 on a key outside the caller's own prefix for a non moderator |
| `/moderators` | POST | `target_user_link_id` | confirmation, writes a `moderation_action` row | session, existing moderator only, Turnstile verified | 403 if the caller is not a moderator, 422 on granting to oneself |
| `/moderators/:user_link_id` | DELETE | none | confirmation, writes a `moderation_action` row | session, existing moderator only, Turnstile verified | 403 if the caller is not a moderator, 409 if this would drop the moderator count below two |

Every future content list endpoint (resources, guides, stories, and so on, each designed in its own later spec) must follow the same pagination and rate limit contract this spec establishes; it is not repeated per feature.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| `/uploads` POST | the stored object key | derived, the caller's own `storage_prefix` (from `user_link`, not the row id) plus a generated file name, never a client supplied path |
| `/uploads` POST | whether the upload is over quota | derived, a live `list` call against the caller's own `storage_prefix` summed at request time |
| `/moderators` POST/DELETE | the acting moderator's identity for the audit trail | the session's own `user_link_id`, never a request body field |
| `/moderators/:id` DELETE | whether the revoke is rejected for dropping below the floor | derived, `count(moderators) - 1 < 2` checked at request time, not cached |
| any paginated list endpoint | the page size ceiling | the shared constant this spec sets: default 20, max 50 |

**Key invariants**:
- Uploads are allowlisted by real, sniffed content type against the exact five types named in AC-3, never by file extension or client declared MIME type.
- Every SVG upload is sanitized (script tags and event handler attributes stripped) before it is stored.
- A person's storage quota is always computed live from what is actually in the bucket, never a counter that could drift from reality.
- No moderator can grant themselves moderator status; `granted_by` always differs from the target.
- A revoke that would bring the moderator count below two is rejected, full stop, with no override endpoint; the only way below two moderators is a direct database operation the engineer performs deliberately.
- Every moderator only action (grant, revoke, acting on someone else's upload, and the trust signal actions in [0003](0003-trust-verification-signals.md)) writes exactly one row to `moderation_action` before it returns success.
- No object key or public URL ever contains `user_link.id`; the R2 key prefix is always `user_link.storage_prefix`, a separate, unguessable value.
- Every list or search endpoint has a hard maximum page size of 50; there is no "return everything" mode, including for moderators.
- Read and search endpoints never require a Turnstile challenge; only write endpoints do.

**Security model**: `/uploads` POST and DELETE are self service by default, scoped to the caller's own `storage_prefix`; a moderator may act on another person's files by supplying an explicit target, never implicitly, and every such action is audited. `/moderators` is moderator only in both directions (granting and revoking), checked against the `moderators` table itself, not any Infra role (Infra's admin and user roles are a different, instance wide concept, see [index.md](index.md)'s cross child contract). There is no public write access anywhere in this backend; every write requires a Transspace session at minimum, and a decoy session (from [0001](0001-authentication-identity.md)) can never perform a real write.

**Configuration required**:
- `D1` binding: the Transspace database, mirroring Infra's own binding name convention
- `R2` binding: Transspace's own storage bucket, entirely separate from Infra's `infra-storage` bucket
- Cloudflare Rate Limiting Rules, configured per route group (write endpoints get the strict limit, read/search endpoints get a generous one that never requires a challenge)
- `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`: for the Turnstile challenge on write endpoints only
- `MAX_FILE_BYTES` (10 MB), `MAX_USER_QUOTA_BYTES` (500 MB): upload limits, as concrete defaults rather than open questions

**Critical test scenarios**:
- Happy path: a signed in person uploads a real image, it is sniffed, allowlisted, stored under their own `storage_prefix`, and shows up in a `GET /uploads` call, verifies **AC-3**
- Failure case: a file with a `.png` extension but different real bytes (for example, an HTML file renamed to look like an image) is rejected by the sniff check regardless of its extension or declared type, verifies **AC-3**
- Auth/permission: a non moderator calling `POST /moderators` is rejected with 403, a moderator calling it with their own id as the target is rejected with 422, and a revoke that would drop the count to one is rejected with 409 even when called by a genuine moderator, verifies **AC-2**
- Abuse: a burst of requests to a search endpoint from one session past the configured rate exceeds the limit and receives 429 with no Turnstile challenge ever shown, verifies **AC-5**
- Audit: every one of the above moderator actions produces exactly one `moderation_action` row naming the actor, the action, and the target, verifies **AC-2**

## Build plan

1. [x] Wire Cloudflare D1 and Drizzle ORM into the Transspace Worker, with a migration workflow mirroring Infra's `db:gen` and `db:studio` scripts, satisfies **AC-1** — `db:gen`/`db:local`/`db:remote`/`db:studio` scripts, `drizzle.config.ts`, `src/db/index.ts`; migration generated and applied to local D1, `userLink`/`moderators`/`moderationAction` tables confirmed live
2. [ ] Create the migration for `moderators` and `moderation_action` — done — plus a one off manual seed for the first two moderators — **not done, and can't be yet**: seeding requires a real `user_link` row from a completed OAuth sign in, which needs `/develop authentication & identity` (scope feature 7) to exist first. This build also added a bare `user_link` spine table (`id`, `infra_user_id`, `storage_prefix`, `created_at`, `deleted_at` only, exactly [0001](0001-authentication-identity.md)'s own columns) purely so `moderators`' foreign key and upload keying have something to reference; feature 7 owns `profile`, `app_lock`, and the actual OAuth wiring on top of it, satisfies **AC-2**
3. [x] Bind a Transspace owned R2 bucket in `wrangler.jsonc`; build the shared upload module (byte sniffed allowlist, SVG sanitizing, quota by listing against `storage_prefix`) and a public, unauthenticated read route for serving stored files back out, satisfies **AC-3** — `src/lib/uploads/`, `src/domains/uploads/func.ts`, `src/routes/api/uploads.$.ts`
4. [x] Build the moderator grant and revoke server functions plus their REST wrappers, including the floor check and the `moderation_action` write, satisfies **AC-2**, **AC-6** — `src/domains/moderators/func.ts`, `src/routes/api/moderators.ts`, `src/routes/api/moderators.$userLinkId.ts`
5. [x] Build the shared pagination utility (default 20, max 50, cursor or offset required) every future list endpoint imports rather than reimplements, satisfies **AC-4** — `src/lib/pagination.ts`; only `listModerators` consumes it so far, since no other list endpoint exists until a content vertical is designed
6. [x] Configure Cloudflare Rate Limiting Rules for write endpoints (Turnstile plus a strict limit) and read/search endpoints (a generous limit, no Turnstile), satisfies **AC-5** — `ratelimits` bindings in `wrangler.jsonc`, `src/lib/rate-limit.ts`, `src/lib/turnstile.ts`; `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` still need real values via `wrangler secret put`
7. [x] Establish the `domains/<name>/{types,func,get-*,use-*,views,index}` server function folder convention (matching Infra's own) and a matching `src/routes/api/` shell for anything meant to be called from outside the router app, satisfies **AC-6** — `src/domains/{moderators,uploads}/{types,func,index}`; `get-*`/`use-*`/`views` intentionally not added yet, since no UI consumes these domains until a feature that needs them is built

**Also required but not named as its own task above, added during the build:** since `authentication & identity` (feature 7) hasn't shipped yet, every write and self-service endpoint here needs *some* notion of "who is signed in" to gate on. `src/middleware/session.ts` is a clearly marked, fail-closed placeholder (`getCurrentUserLinkId()` always returns `null` for now) that `SessionMiddleware`/`ModeratorMiddleware` call — a single seam feature 7 replaces with a real session lookup. Nothing built in this pass is reachable by anyone until that happens.

## Consequences

**Positive**:
- Every later content feature (resources, guides, stories, and the rest) inherits a working database, storage, pagination, and rate limiting contract instead of each inventing its own.
- The upload module's design (sniff, allowlist, sanitize, quota by listing) is proven already, in Infra's own `@infra/assets`, rather than untested from scratch.
- The moderator floor and audit table mean the moderation system can't be silently emptied or abused without a record, closing a gap the first draft of this spec left open.

**Negative / tradeoffs**:
- Moderator bootstrap is a manual, one off step outside the normal app flow, which is a rough edge the team has to remember exists whenever a fresh environment is stood up.
- Maintaining a REST shell alongside server functions (per the engineer's own preference, not just the server function only default) means two calling conventions to keep consistent instead of one.
- Cloudflare Rate Limiting Rules are configured outside application code (in the Cloudflare dashboard or via Terraform/Wrangler config), which is one more place the engineer has to remember to update when a new write endpoint is added.

**Neutral**:
- No dedicated search engine or queue is introduced at this stage; the database's own querying is expected to be sufficient at this project's current scale, per this spec's own architecture defaults.

## Follow up

- [ ] Consider whether a two person confirmation for a moderator revoke (not just the floor of two) is worth the added complexity, once there are enough real moderators for it to be practical; the floor check alone is the guardrail this spec ships with.
