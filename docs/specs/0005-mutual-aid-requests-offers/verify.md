# Verify: mutual aid requests and offers · spec 0005 · updated 2026-09-25
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Sign in, go to `/submit-support`, pick `request_general`, fill title + a 50+ char description, choose a visibility tier, submit → the post appears on `/support` as pending for the author (via `mine=true`), not yet visible to others → AC-1, AC-2
- [ ] Submit `request_financial` from a signed-in account created today → rejected with the account-age error; submit it from an account 7+ days old, then attempt a second `request_financial` while the first is still open → the second is rejected 409 → AC-6, AC-7
- [ ] As a moderator, go to `/dashboard/support`, publish a pending post → it becomes visible on `/support` per its visibility tier → AC-3, AC-4
- [ ] As the same moderator, try to publish/reject a post you authored yourself → rejected with the "can't act on your own post" error; have a second moderator do it → succeeds → AC-3
- [ ] Publish a `sensitive`-tier post, view it signed out → only title/type/urgency/date show, with the "sign in to see more" note; sign in → full detail shows → AC-4
- [ ] Publish a `critical`-tier post; view it signed out from a restricted country's network (or temporarily add a country code to `RESTRICTED_COUNTRY_CODES` for the test) → the locked message shows, not even the redacted teaser; a signed-in viewer from the same country sees full content → AC-4, AC-18
- [ ] Publish a `private`-tier post → it never appears in `/support`'s list for a second signed-in account, but opening its direct `/support/$postId/details` link while signed in shows it in full → AC-4, AC-18
- [ ] On a published post, as a different signed-in account, click "I can help with this" → creates a claim; as the post's author, see it listed under "People who've offered to help" and assign it → claim moves to assigned, any previously assigned claim (if one existed) reverts to interested → AC-10
- [ ] Mark a post fulfilled or withdraw it while it has an `interested` (not `assigned`) claim → that claim becomes declined automatically; an `assigned` claim is untouched → AC-8
- [ ] On a `request_financial` post, as the author, post a progress update with an amount → the detail page's raised/target line updates to that amount (not summed with a prior update) → AC-11
- [ ] As a moderator, pause a published post with a reason, then reactivate it as a *different* moderator after the requester adds a `pause_response` update → post returns to published → AC-9
- [ ] Edit a published post's title via `PATCH /api/support/$id` (no dedicated UI yet, call the endpoint directly) → status returns to `pending`, `moderatedBy` clears → AC-12
- [ ] Load `/support`, `/submit-support`, `/dashboard/support` with the browser language set to German, French, and Chinese → labels render in that language (not English fallback) → AC covers all UI-facing criteria

## Commands
- [ ] `cd www && bun run typecheck` → passes clean → all ACs (design-time gate)
- [ ] `cd www && bunx wrangler d1 execute transspace --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('supportPost','supportClaim','supportUpdate');"` → all three tables present → AC-1, AC-6, AC-7, AC-10
- [ ] Two near-simultaneous `POST /api/support` submissions of `request_financial` from the same account (e.g. two curl calls fired back to back) → exactly one succeeds, the other gets 409, proving the partial unique index (not just the pre-check) enforces AC-7
- [ ] Two near-simultaneous `POST /api/support/$id/claims/$claimId/assign` calls for two different claims on the same post → exactly one ends up `assigned`, proving the partial unique index enforces AC-10's single-assignee rule
- [ ] `GET /api/trust-signals/supportPost/$id/co-sign` style direct call against a `private` or geo-blocked post from a caller who shouldn't see it → 404 via the support-scoped wrapper, not the raw generic trust-signal path → AC-18

## Acceptance-criteria coverage
- AC-1 (submit + per-type validation): covered by the submit-support UI step and the financial-gate step
- AC-2 (pending + urgent lane): covered by the submit step; urgent-lane ordering itself is only exercised by the moderator queue's default sort, not separately verified here
- AC-3 (publish/reject, self-review block): covered by the moderator queue steps
- AC-4 (tier visibility incl. geo lock): covered by the sensitive/critical/private steps
- AC-5 (tier set at submission, escalate-only by moderator): escalate-tier has an endpoint but no UI; verify via direct API call until a UI exists
- AC-6 (financial account-age gate + trust escalation): covered by the financial-gate step
- AC-7 (one open financial post, atomic): covered by the concurrency command step
- AC-8 (close auto-declines interested claims only): covered by the fulfill/withdraw step
- AC-9 (pause/reactivate, self-review block on reactivate): covered by the pause/reactivate step
- AC-10 (claim/assign, single assignee): covered by the claim step and the concurrency command step
- AC-11 (financial progress, cumulative not delta): covered by the progress-update step
- AC-12 (edit re-queues to pending): covered by the PATCH step (no dedicated UI yet)
- AC-13 (professional verification): endpoint and badge exist; **no moderator UI to trigger it yet**, verify via direct API call until built
- AC-14 (stale surfacing): covered by the moderator queue's stale tab; not separately exercised above, needs a post artificially aged past 30 days to verify end to end
- AC-15 (Turnstile + rate limit on every write): implicit in every mutation step above; the local dev Turnstile site key gates whether this can be exercised for real
- AC-16 (moderator audit log): verify by querying `moderationAction` after any moderator step above
- AC-17 (moderator-authored badge, signed-in only): needs a post authored by a moderator account to exercise
- AC-18 (private/critical never leak via list, search, or trust-signal path): covered by the private-tier and trust-signal-wrapper steps
- AC-19 (restricted-country list is a reviewed code constant): verified by reading `www/src/data/restricted-countries.ts` directly, no runtime check needed
