# Verify: data model & backend · spec 0002 · updated 2026-09-24
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
_None — this is a backend-only build with no UI surface yet._

## Commands
- [ ] `cd www && bun run db:gen && bun run db:local` → migration applies cleanly, no errors → AC-1
- [ ] `bunx wrangler d1 execute transspace --local --command "SELECT name FROM sqlite_master WHERE type='table'"` → `userLink`, `moderators`, `moderationAction` present → AC-1
- [ ] `POST /api/moderators` while unauthenticated (no session) → 401, since `SessionMiddleware`'s current seam always returns no session → AC-2, confirms the fail-closed auth placeholder noted in the Build plan
- [ ] Once feature 7 ships a real session: a moderator calling `POST /api/moderators` with their own id as `targetUserLinkId` → 422 "Cannot grant moderator status to yourself" → AC-2
- [ ] A moderator revoking down to 1 remaining moderator → 409, revoke rejected, count never drops below 2 → AC-2
- [ ] Every grant/revoke call writes exactly one `moderationAction` row naming the actor, action, and target → AC-2
- [ ] `POST /api/uploads` with an HTML file renamed to `.png` → rejected 422 by the sniff check regardless of extension or declared type → AC-3
- [ ] `POST /api/uploads` with a real `.svg` containing a `<script>` tag → stored, but `GET`ing it back shows the script tag and any event-handler attributes stripped → AC-3
- [ ] `POST /api/uploads` once already at the 500 MB quota (computed live via `R2.list`, not a counter) → 413 → AC-3
- [ ] `GET /api/uploads?limit=999` → response is capped at 50 items (`MAX_PAGE_SIZE`), not the requested 999 → AC-4
- [ ] A burst of requests past `RATE_LIMITER_READ`'s configured limit on a read endpoint → 429, no Turnstile challenge ever shown → AC-5
- [ ] A burst of requests past `RATE_LIMITER_WRITE` on `/api/moderators` or `/api/uploads` → 429 → AC-5
- [ ] A write call with a missing/invalid `turnstileToken` → 403 before any DB/R2 write happens → AC-5

## Acceptance-criteria coverage
- AC-1: D1/Drizzle wiring + migration workflow · covered by the `db:gen`/`db:local` + `sqlite_master` steps
- AC-2: moderator floor, self-grant rejection, audit log · covered by the grant/revoke steps
- AC-3: sniffed allowlist, SVG sanitizing, quota computed live · covered by the upload steps
- AC-4: hard page-size ceiling · covered by the pagination step
- AC-5: Turnstile + rate limit on writes, rate limit only on reads · covered by the rate-limit and Turnstile steps
- AC-6: domain folder convention + REST shell · structural, verified by code review (`/check review`), not a runtime step

## Known gap, not covered by any step above
~~Every write and self-service endpoint currently fails closed...~~ Resolved: `src/middleware/session.ts`'s `getCurrentUserLinkId()`/`getCurrentSession()` now read a real Better Auth session (see the feature 7 section below). The remaining gap is external, not code: the Infra OAuth client registration is still being finalized (redirect URI, real secret values in `.dev.vars`), so an actual end-to-end sign in hasn't been run yet.

# Verify: authentication & identity · spec 0001 · updated 2026-09-24
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. A real sign in against production Infra (`infra.pherus.org`) has now been completed and verified during this build; see the build report for the exact fixes that were needed (redirect URI provider-id suffix, `baseURL`, immutable-headers redirect, the onboarding gate only firing under `(protection)`, and a real email/name leaking into `user` despite `mapProfileToUser`)._

## UI / manual
- [ ] Visit `/auth` with no session → renders a single "Continue with Infra" link/button; no password field appears here or on any other Transspace-rendered page → AC-1
- [ ] Click "Continue with Infra" → redirected to Infra's real login screen → AC-1
- [ ] Complete a brand new sign in → lands on `/onboarding`, not home, until a display name and avatar are set → AC-2
- [ ] Try navigating to `/` or `/security` before finishing onboarding → redirected back to `/onboarding` → AC-2
- [ ] Submit onboarding with a display name containing "admin" (any case) → 422, rejected → AC-2, Data model sketch
- [ ] Sign in again as the same person a second time → no new `user_link`/`profile` row is created; lands straight on `/` → AC-2
- [ ] Set a PIN under `/security`, sign out, sign back in → the new session starts locked, redirected to `/unlock` → AC-8
- [ ] Enter the real PIN at `/unlock` → lands back on the app with real data → AC-5
- [ ] Enter the duress PIN at `/unlock` → same success experience, but `/api/profile` now returns the empty decoy shape; a separate real session (or re-entering the real PIN) still shows true data → AC-6
- [ ] While in decoy mode, view the account's own public pseudonymous profile from another device/session → still fully visible, since decoy mode never claims to hide it → AC-6, Consequences
- [ ] Enter the wrong PIN 3 times in a row at `/unlock` → cooldown grows (30s, 60s, 120s), `/unlock` shows the cooldown message, the underlying Infra session is untouched → AC-7
- [ ] Click "Forgot your PIN?" → forced back through Infra's real login form (`prompt=login`) even with an existing Infra session → lands on `/security` with both PIN hashes cleared → API surface `/app-lock/reset`
- [ ] Click "Log out" on `/profile` → Transspace's session cookie clears; Infra's own session is untouched (other Pherus apps still show signed in) → AC-4
- [ ] Call sign out with `everywhere: true` from two different sessions for the same person → both are signed out → AC-4

## Commands
- [x] `bunx wrangler d1 execute transspace --local --command "SELECT name FROM sqlite_master WHERE type='table'"` → `user`, `session`, `account`, `verification`, `profile`, `appLock` present, confirmed during this build
- [x] After a full sign in: `bunx wrangler d1 execute transspace --local --command "SELECT name, email, image FROM user"` → `name`/`email` are a fixed placeholder ("Transspace user") and a random `@no-reply.invalid` address, never Infra's real values (a `user.create.before` hook substitutes them, since the schema's `name`/`email` columns are NOT NULL and can't just be nulled); `image` is `NULL` → AC-3, confirmed during this build after catching and fixing a real leak (a genuine email/name from Infra was stored before this hook existed)
- [x] `bunx wrangler d1 execute transspace --local --command "SELECT accessToken, refreshToken, idToken FROM account"` → all `NULL` for every row → AC-3, confirmed during this build
- [x] `curl -X POST http://localhost:3000/api/profile` with no session cookie → 401, confirmed during this build → Security model
- [ ] `curl -X POST http://localhost:3000/api/app-lock` with someone else's id anywhere in the body → still only ever touches the caller's own row (the session's own id is used, any id in the body is ignored) → Security model
- [ ] With a PIN already set, submit `{currentPin, duressPin}` equal to the existing real PIN (no new `pin` in the same call) → 422 "Duress PIN must differ from the PIN"; the reverse (new `pin` equal to an existing duress PIN) → same rejection → AC-5, key invariants (caught a gap during this build where only a same-request pin/duressPin collision was checked, not a collision against the other slot's already-stored value)
- [x] `curl http://localhost:3000/api/auth/login` with `INFRA_OIDC_ISSUER_URL` unset/unreachable → 503 "Identity service unavailable, try again shortly", confirmed during this build → AC-1

## Acceptance-criteria coverage
- AC-1: PKCE via `genericOAuth`, no password field, 503 on discovery failure · covered by the sign-in and login-endpoint steps
- AC-2: exactly one `user_link`+`profile` row on first sign in, onboarding gate blocks navigation · covered by the onboarding steps
- AC-3: no email/name/image/OAuth tokens ever persisted · covered by the D1 query steps
- AC-4: sign out clears/revokes locally only, `everywhere` revokes all · covered by the log out steps
- AC-5: PIN policy, current-PIN-required, locked-state reconfig block · covered by the `/security` steps
- AC-6: duress sets decoy, the shared accessor shapes private data, public profile unaffected · covered by the unlock/decoy steps
- AC-7: escalating cooldown, dual constant-time check · covered by the repeated-wrong-PIN step
- AC-8: cookie flags, a new session with a PIN set always starts locked · covered by the sign-in-then-lock step
