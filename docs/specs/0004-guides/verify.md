# Verify: guides · spec 0004 · updated 2026-09-25
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. Built and verified while the engineer was asleep: every read path was exercised against directly-seeded D1 data (including a real profile row) via curl and live SSR HTML inspection; write paths (submit, publish, reject) were verified by code review, typecheck, and the content-safety module's own isolated unit run, not a live authenticated session — see Known gaps._

_Re-opened 2026-09-25: AC-10 (guide series via a new `guide_series` table, cover image, video embed, three new categories) landed after the pass above, plus a cross-cutting rework (TanStack Form on `/submit` and `/submit-guide`, the domain layer folded from one flat `func.ts` into `func/`, the in-editor image upload switched from a REST `fetch` to a direct `useMutation`-wrapped server function call). Everything below this line through "Known gaps" describes the AC-1–AC-9 pass only; AC-10 has not yet had its own verify pass — the new `GET /guides/series` endpoint, `findOrCreateSeries`, `assertValidVideoUrl`/`assertValidCoverImageUrl`, and the rebuilt submit/detail UI are unverified beyond typecheck and a basic live smoke check (all routes return 200, `/api/guides/series` returns `{items: []}`)._

## UI / manual
- [x] Visit `/guides` → lists the seeded guide with its real contributor byline, community-reviewed badge, and computed read time → confirmed during this build via live SSR HTML, re-confirmed this pass (SSR stream contains `<h3>Finding healthcare in Testland</h3>`)
- [x] Visit `/guides/$id/details` for the seeded guide → renders the real body via `@pherus/rich-text`'s `Preview` (the seeded link text rendered), shows the references badge, and resolves the related resource into a real link → confirmed during this build, re-confirmed this pass (SSR stream contains the `<h1>` title, "Community reviewed" badge text, `trust:{communityReviewed:true,coSignCount:3,referencesAvailable:true}`, and a real `<a href=".../details">Test Wellness Clinic</a>` link)
- [x] Visit `/guides/does-not-exist/details` → shows the not-found state, not a crash → confirmed during this build, re-confirmed this pass (200, no crash)
- [x] Visit `/submit-guide` while signed out → shows "sign in to submit a guide", not the form → confirmed during this build, re-confirmed this pass
- [ ] Visit `/submit-guide` while signed in → the editor renders, an in-editor image upload succeeds and inserts a same-origin image, the submit button stays disabled until Turnstile produces a token
- [ ] Submit a guide with a heading, a list, an image, and a link → succeeds, shows the "thanks for the guide" confirmation
- [ ] As a moderator, publish a pending guide → it appears in `GET /guides` and the detail page

## Commands
- [x] `cd www && bun run db:gen && bun run db:local` → migration applies cleanly, `guide` table confirmed live → confirmed during this build
- [x] `curl http://localhost:3000/api/guides` → 200, `{items, nextCursor}` shape → confirmed during this build
- [x] `curl "http://localhost:3000/api/guides?category=bogus"` → 422 → confirmed during this build → AC-7
- [x] `curl -X POST http://localhost:3000/api/guides` with no session → 401 → confirmed during this build
- [x] `curl http://localhost:3000/api/guides/doesnotexist` → 404 → confirmed during this build
- [x] `curl "http://localhost:3000/api/guides?status=pending"` with no session → 403 → confirmed during this build → AC-4
- [x] `curl -X POST http://localhost:3000/api/guides/x/publish` with no session → 401 → confirmed during this build
- [x] `curl -X POST http://localhost:3000/api/guides/upload-image` with no session but a valid multipart body → 401 (not 500) → confirmed during this build, this exact case was a real bug caught and fixed (a malformed/missing Content-Type previously 500'd before the session check ever ran)
- [x] Seeded a real guide (real `profile.displayName`, a trust_signal row with `communityReviewed: true`, `coSignCount: 3`, `referencesAvailable: true`, and a `relatedResourceIds` pointing at a real published resource); `GET /api/guides` and `GET /api/guides/:id` both reflect all of it correctly, including the resolved related resource's name → confirmed during this build → AC-1, AC-2
- [x] `?search=TESTLAND` (differing case) matches the seeded guide's title → confirmed during this build → AC-1
- [x] `analyzeBodyContent` isolated unit run: a same-origin image passes, a `data:` URI image is rejected (422), a third-party URL image is rejected (422), a 300 KB body is rejected (422), word count is correct for Latin text (8 words counted exactly) and reasonable for CJK text (character-run based), `computeReadTime` boundaries (199→1, 200→1, 201→2, 0→1) all correct → confirmed during this build via a standalone script, not the API (no live session to submit through)
- [x] `assertValidRelatedResourceIds` isolated unit run: 15 raw entries (even with duplicates) rejected before de-duplication is attempted, a valid duplicated pair de-duplicates to one entry, a non-UUID entry is rejected → confirmed during this build, matches the corrected Value sourcing wording (cap applies to the raw count)
- [ ] Two concurrent `POST /api/guides` submissions with images uploaded mid-composition → not yet run against a real concurrent load or a real moderator session (none is seeded in this environment, same blocker spec 0002/0003 already noted)
- [ ] A decoy session attempting `POST /guides`, `/publish`, `/reject`, or `/guides/upload-image` → not yet run against a real decoy session
- [x] Regression: `/r`, `/submit`, `/atlas`, `/support`, `/api/resources`, `/api/trust-signals/*`, `/api/moderators` all still behave exactly as before after this build's `ModeratorMiddleware`-adjacent and shared-cursor-util refactors → confirmed during this build, re-confirmed this pass (`/api/resources` pagination, category filter, verified/free/international filters, and moderator/trust-signal write gating all still return the expected codes)

## Acceptance-criteria coverage
- AC-1: list filters, search (title+excerpt), sort/cursor · covered by the seeded-data curl steps
- AC-2: detail composition (body, byline, badge, references, related resources), not-found handling · covered by the detail curl/SSR steps
- AC-3: atomic submit, `wordCount`/`referencesAvailable` computed inline · covered by code review, typecheck, and the isolated content-safety unit run; a real signed-in submission is open
- AC-4: publish only from `pending`, reject from `pending` or `published`, both audited · covered by code review and the 403/401 curl steps; a real moderator run is open
- AC-5: Turnstile + rate limit on `/guides`/`/publish`/`/reject`, no Turnstile on `/guides/upload-image` (by design) · covered by code review; Turnstile itself can't be confirmed end to end until a real site key exists (spec 0002/0003's own open gap)
- AC-6: the guide detail **page** never renders `professionalVerified` · covered by code review (the detail query doesn't even select it) and the live detail page's rendered HTML
- AC-7: category validation · covered by the 422 curl step
- AC-8: decoy block on every write including the image upload · covered by code review (`assertNotDecoy` runs first everywhere); a real decoy session run is open
- AC-9: image `src` allowlist, size cap, `relatedResourceIds` cap/format · covered by the isolated unit run against the actual `content-safety.ts` module, not just read by inspection

## Known gaps, not covered by any step above
- No real signed-in browser session existed in this environment to exercise the actual submit → moderator publish/reject loop, or a real in-editor image upload, live. Every write path (and the safety-critical validation logic specifically) was verified by code review, typecheck, and a standalone unit run against the real validation functions, not a genuine authenticated request.
- Turnstile has no real site key configured anywhere yet (pre-existing gap, spec 0002/0003's own Follow-up); `/submit-guide`'s form can render and the editor can be used, but the final submit can never actually produce a token until one exists.
- No moderator is seeded in this environment yet (the same blocker spec 0002/0003 already flagged).
- The machine-translate service (`translate.demosjarco.dev`) was unavailable for this entire build session; every new locale string was translated by hand rather than machine-translated. Worth a pass with the real tool once it's back up, to catch anything a careful-but-manual translation got wrong.
