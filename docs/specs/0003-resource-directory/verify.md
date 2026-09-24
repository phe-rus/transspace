# Verify: resource directory · spec 0003 · updated 2026-09-24
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. No real signed-in browser session or seeded moderator exists in this environment, so the submit → moderator publish/reject loop was verified by code review, typecheck, and directly-seeded D1 data, not a live authenticated request; see Known gaps._

## UI / manual
- [ ] Visit `/r` with no location set → browses every country, results match published resources
- [ ] Type a country name into `/r`'s location picker → results filter to that country, the URL gains `?country=…`
- [ ] Type a city into `/r`'s location picker → results filter to that city, the URL gains `?city=…`
- [ ] Toggle "Community verified only" on `/r` → only resources with a `professionalVerified` trust signal remain
- [ ] Toggle "Sliding scale / free" on `/r` → only `isFree` resources remain
- [ ] Toggle "Accepts people from other countries" on `/r` → only `internationalAccess` resources remain
- [ ] Use `/r`'s search box → matches across name, description, city, and country
- [ ] Click a category chip on `/r` → filters to that category, the URL gains `?category=…`
- [ ] Visit each of the 7 `/r/<subcategory>` pages → shows the right, correctly filtered subset
- [ ] Click "Contribute" on `/r` → navigates to `/submit`
- [ ] Visit `/r/$id/details` for a published resource → trust badges reflect live data (verified checkmark, community reports count, relative "last reviewed" time)
- [x] Visit `/r/$id/details` for an unknown id → shows the not-found state, not a crash → confirmed during this build (caught and fixed a real 500: a thrown `Response` inside a query's error state can't be serialized into the SSR stream; fixed by resolving the queryFn to `null` instead)
- [x] Visit `/submit` while signed out → shows "sign in to submit", not the form → confirmed during this build
- [ ] Visit `/submit` while signed in → shows the form; the submit button stays disabled until Turnstile produces a token
- [ ] Submit a resource naming a brand new country → succeeds, shows the "thanks for the submission" confirmation
- [x] Visit the home page → hero shows a real, honest resource count ("N" or "N+"), no hardcoded "Berlin, DE", no "vetted access" claim → confirmed during this build

## Commands
- [x] `cd www && bun run db:gen && bun run db:local` → migration applies cleanly → confirmed during this build
- [x] `bunx wrangler d1 execute transspace --local --command "SELECT name FROM sqlite_master WHERE type='table'"` → `country`, `resource` present → confirmed during this build
- [x] `curl http://localhost:3000/api/resources` → 200, `{items, nextCursor}` shape → confirmed during this build
- [x] `curl "http://localhost:3000/api/resources?category=not-a-real-category"` → 422 → confirmed during this build → AC-7
- [x] `curl -X POST http://localhost:3000/api/resources -d '{}'` with no session → 401 → confirmed during this build
- [x] `curl http://localhost:3000/api/resources/doesnotexist` → 404 → confirmed during this build
- [x] `curl "http://localhost:3000/api/resources?status=pending"` with no session → 403 → confirmed during this build → AC-4
- [x] `curl -X POST http://localhost:3000/api/resources/x/publish` with no session → 401 → confirmed during this build
- [x] Seed two resources directly in D1, `curl "http://localhost:3000/api/resources?limit=1"`, follow the returned `nextCursor` → second page returns the older resource, newest-first, `nextCursor: null` at the end, no duplicates or skips → confirmed during this build → AC-1
- [x] Seed a resource in country "Testland", city "Testville"; `?search=testville` and `?search=TESTLAND` (differing case) both match → confirmed during this build → AC-1
- [x] `?verifiedOnly=true` excludes a seeded resource with `professionalVerified: false`; `?freeOnly=true` includes only `isFree` resources → confirmed during this build → AC-1
- [x] `GET /api/resources/:id` on a seeded resource returns the resource plus a composed `trust` object matching its `trust_signal` row → confirmed during this build → AC-2
- [ ] Two concurrent `POST /api/resources` submissions naming the same new (differently-cased) country both succeed and end up referencing one `country` row → reasoned through the insert-if-absent implementation, not yet run under real concurrent load → AC-3
- [ ] As a moderator, `POST /api/resources/:id/reject` on an already-`published` resource → moves to `rejected`, disappears from `GET /api/resources`, a `moderation_action` row is written → not yet run against a real moderator session (none is seeded in this environment, same blocker spec 0002 already noted) → AC-4
- [ ] A decoy session attempting `POST /api/resources`, `/publish`, or `/reject` → 403 before any write → not yet run against a real decoy session → AC-8
- [x] Regression: `POST /api/moderators`, `DELETE /api/moderators/:id`, and `GET /api/trust-signals/resource/:id` still behave exactly as before after the `ModeratorMiddleware` change → confirmed during this build

## Acceptance-criteria coverage
- AC-1: list filters, search, and pagination · covered by the seeded-data curl steps and the pagination step
- AC-2: detail page + trust badge composition, not-found handling · covered by the detail curl step and the not-found UI fix
- AC-3: atomic submit, country find-or-create · covered by code review and typecheck; the true concurrency case and a real signed-in submission are open
- AC-4: publish only from `pending`, reject from `pending` or `published` as a takedown, both audited · covered by code review and the 403 curl step; a real moderator run is open
- AC-5: Turnstile + rate limit on writes, rate limit only on reads · matches the already-verified trust-signal pattern exactly; Turnstile itself can't be confirmed end to end until a real site key exists (spec 0002's own open gap)
- AC-6: location state lives only in the URL, never persisted client-side · covered by the `/r` search-param wiring; no `localStorage` write exists anywhere in this feature's code
- AC-7: category/subcategory validation, explicit `isFree`/`internationalAccess` · covered by the 422 curl step and code review
- AC-8: decoy block on submit, publish, and reject · covered by code review (`assertNotDecoy` runs first in every write handler); a real decoy session run is open

## Known gaps, not covered by any step above
- No real signed-in browser session existed in this environment to exercise the actual submit → moderator publish/reject loop live. Every write path was verified by code review, typecheck, and curl tests against directly-seeded D1 data, not a genuine authenticated request.
- Turnstile has no real site key configured anywhere yet (pre-existing gap, spec 0002's own Follow-up); `/submit`'s form can render but can never actually produce a token to submit with until one exists.
- No moderator is seeded in this environment yet (the same blocker spec 0002 already flagged for its own moderator seed, since a real `user_link` row needs a completed OAuth sign in).
