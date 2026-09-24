# 0001. Authentication and identity

Supports scope feature 7. Part of the [identity, data and trust foundation](index.md); shares its Proposed stack and cross child contract.

> This spec was revised after an independent cross check found the first draft's duress mechanism didn't actually hide anything past its own verify call, its app lock PIN had no protection against being overwritten by whoever is holding the unlocked device, and its "no credential ever touches our database" claim was false given what an OAuth client library normally stores. All three are fixed below; see [rationale.md](rationale.md) for the fuller record if one exists, and the Consequences section for what is now understood to still be true versus overstated in the first draft.

## Summary

A person signs in through Infra (Pherus's own identity service), never on a page Transspace itself controls. Transspace keeps only what it needs to recognize that person again, an opaque id, never their email or name. Once signed in, Transspace creates a pseudonymous profile for them that has no link back to whatever Infra knows about them. People can also set a short local unlock code for the app itself, with an optional second, duress code. The duress code cannot hide anything the person has made public (their pseudonymous profile is visible to anyone regardless), but it does hide everything private to that device and session (saved items, drafts, account settings), by having the server itself serve fake, empty data rather than just flipping a flag the app could ignore.

## Requirements

**User stories**:
- As a visitor, I want to sign in without creating yet another password Transspace itself would have to protect, so that my credentials only ever live with one service I already trust.
- As a newly signed in person, I want to be asked to pick a display name, an avatar, and a bio before I can do anything else, so that I show up to the community as the pseudonymous person I choose to be, not by any default.
- As someone who might be forced to unlock this app by another person, I want a second, decoy code that shows a harmless, empty looking version of my private data, understanding it cannot hide anything I have already made public.

**Acceptance criteria**:
- **AC-1**: A person can sign in through Infra using the OAuth 2.1 authorization code flow with PKCE (Proof Key for Code Exchange, an anti interception check built into the flow) and lands back on Transspace with a working session; no password field ever appears on a page Transspace itself renders.
- **AC-2**: On someone's very first sign in, Transspace creates exactly one `user_link` row (keyed to Infra's opaque user id) and one profile row with no display name or avatar chosen yet, and blocks every other page behind an onboarding screen until both are set.
- **AC-3**: Transspace's own database never stores Infra's email, name, or avatar image, and never persists an Infra access or refresh token past the moment sign in completes; the OAuth scope Transspace requests from Infra is the minimum needed to confirm identity, nothing more.
- **AC-4**: Signing out clears Transspace's own session cookie and revokes that session server side; it never touches or signs the person out of Infra itself (which other Pherus apps may still rely on). A "sign out everywhere" action exists and revokes every session tied to the person's `user_link`.
- **AC-5**: A signed in person can set a local unlock PIN (minimum 6 digits, rejecting obviously weak patterns like repeating or sequential digits), and optionally a separate duress PIN of the same length; changing or clearing either one requires the current real PIN, and the app lock cannot be reconfigured at all while it is in a locked state.
- **AC-6**: Entering the duress PIN at the local unlock prompt puts the session itself into a server tracked decoy state; from that point, every endpoint that would normally return the person's private data (their saved items, drafts, account details) instead returns an empty, generic shape, through one shared accessor every such endpoint uses, not a flag the client could bypass. The person's public profile is unaffected, since it is not private, and the spec makes no claim that decoy mode hides it.
- **AC-7**: Repeated wrong local PIN attempts lock the local unlock prompt with a cooldown that grows on each further failure, starting at 30 seconds and doubling up to a one hour cap, and never affect or lock the underlying Infra session. Both the real and duress PIN hash are checked on every attempt, in the same amount of work either way, so response timing cannot reveal which one (if either) was closer to correct.
- **AC-8**: Session cookies are `httpOnly`, `secure` in production, and at least `SameSite=Lax`. A newly established session always starts in the locked state whenever the person has a PIN set, regardless of what the client claims about being backgrounded or revisited; the server, not the client, decides when a session is locked.

## Decision

**Chosen approach**: a thin Better Auth instance inside Transspace, using the `genericOAuth` client plugin (bundled in `better-auth/plugins`) configured against Infra's OIDC discovery endpoint, PKCE enabled (its default), requesting only the `openid` scope (dropping `profile`, `email`, and `offline_access`, see Feature design). This is the shared foundation decision from [index.md](index.md); this spec is where it becomes a concrete, buildable feature.

The local unlock PIN and its duress variant are a Transspace only concept, checked entirely against Transspace's own D1, never touching Infra. A duress password at Infra's own login screen was considered and ruled out: Infra is the only place a password is ever checked, so Transspace has no way to intercept or branch on which password someone typed there. A post login local unlock screen is the only place in this architecture where a duress mechanism can actually work, and the cross check's finding that a purely client visible decoy flag does nothing is why the mechanism below is server enforced instead.

## Feature design

**Data model sketch**:

| Table | Field | Type | Notes |
|---|---|---|---|
| `user_link` | `id` | text, primary key | Transspace's own internal id, never shown in any UI or URL |
| | `infra_user_id` | text, unique, nullable | Infra's opaque `sub` claim; set at first sign in, cleared to null on account deletion so the id can never be matched again |
| | `storage_prefix` | text, unique, required | a random opaque value (not the same as `id`), used as the R2 key prefix in [0002](0002-data-model-backend.md) so a public file URL never reveals the internal id |
| | `created_at` | timestamp, required | |
| | `deleted_at` | timestamp, nullable | set on account deletion |
| `profile` | `id` | text, primary key | |
| | `user_link_id` | text, unique, required, foreign key to `user_link.id` | one profile per person |
| | `display_name` | text, nullable | required by the onboarding gate at the application layer, not the schema; 2 to 32 characters, no impersonation of reserved terms (`moderator`, `admin`, `official`, `transspace`, checked case insensitively as a substring block) |
| | `avatar_slug` | text, nullable | required by the onboarding gate; validated against a shipped constant list of curated avatars, never an arbitrary string |
| | `bio` | text, nullable | |
| | `pronouns` | text, nullable | |
| | `topics` | text, nullable | stored as a JSON array in one text column (D1 has no native array type); validated against a shipped constant vocabulary list, the same treatment as `avatar_slug` |
| | `deleted_at` | timestamp, nullable | set on account deletion, alongside clearing `display_name`, `avatar_slug`, `bio`, `pronouns`, `topics` to null |
| `app_lock` | `user_link_id` | text, primary key, foreign key to `user_link.id` | one row per person |
| | `pin_hash` | text, nullable | `scrypt` (available via `node:crypto`, already reachable since `wrangler.jsonc` sets `nodejs_compat`), stored as `salt:hash`; null until the person sets one |
| | `duress_pin_hash` | text, nullable | same format, always distinct from `pin_hash`, checked at write time |
| | `failed_attempts` | integer, default 0 | |
| | `locked_until` | timestamp, nullable | |
| Better Auth's own tables (`user`, `session`, `account`, `verification`) | | | Created automatically by the thin Better Auth instance. `user.email`, `user.name`, and `user.image` stay unpopulated (the profile mapper drops them, since only `openid` is requested and nothing upstream is trusted for these fields). `account`'s stored access token is cleared by a database hook immediately after the sign in flow that created it completes, since nothing later in this design calls back to Infra with it. `session` gains two additional fields, `is_decoy` (boolean, default false) and `unlocked_until` (timestamp, nullable), the server side source of truth for the local app lock's state (see State transitions) |

**State transitions** (the local app lock, tracked on the `session` row itself, never on the client):
A newly established session with a `pin_hash` set starts `locked` (`unlocked_until` is null). Calling `/app-lock/verify` with the real PIN sets `unlocked_until` to a short time ahead (for example 10 minutes of inactivity) and leaves `is_decoy` false; every further request that touches it extends `unlocked_until` again. Calling it with the duress PIN does the same but sets `is_decoy` true instead. Once `unlocked_until` passes, the session reverts to `locked` and `/app-lock/verify` must be called again. A run of wrong attempts (checked against both `pin_hash` and `duress_pin_hash` every time, so timing never reveals which failed) moves the row into a cooldown via `app_lock.locked_until`, independent of the Infra backed session, which is never touched by any of this.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/auth/login` | GET | none | redirect to Infra's authorize endpoint (PKCE challenge attached) | none | 503 if Infra's discovery endpoint is unreachable, with a plain "identity service unavailable, try again shortly" page |
| `/auth/callback` | GET | `code`, `state` (from Infra's redirect) | sets session cookie, redirects to onboarding or home | none (this is the entry point) | 400 on state mismatch |
| `/auth/logout` | POST | `everywhere?` (boolean) | clears the current session, or every session tied to this `user_link` if `everywhere` is set | session | |
| `/profile` | GET | none | the caller's own profile, or a decoy shaped empty profile if `session.is_decoy` is true | session | |
| `/profile` | PATCH | `display_name?`, `avatar_slug?`, `bio?`, `pronouns?`, `topics?` | updated profile | session, rejected while `session.is_decoy` is true | 422 on an avatar_slug or topic outside the shipped list, 422 on a display name matching the reserved term block |
| `/app-lock` | POST | `current_pin` (required if either hash already exists), `pin?`, `duress_pin?`, `clear_duress?` | confirmation only | session, rejected while `locked` | 401 if `current_pin` does not match the existing `pin_hash`, 422 if `pin` and `duress_pin` would be equal |
| `/app-lock/reset` | POST | none, but only reachable right after a fresh Infra sign in forced with `prompt=login` (a real password re entry, not just an existing cookie) | clears both PIN hashes | session | the forgotten PIN path; deliberately requires proving the person still knows their Infra password, not just that the device is unlocked |
| `/app-lock/verify` | POST | `pin` | bare success or failure; never a field naming which state was entered | session | 429 while cooling down |
| `/account` | DELETE | none | see the Data model sketch's `deleted_at` handling above; content already submitted elsewhere is not touched by this spec (see [0003](0003-trust-verification-signals.md)) | session, rejected while `session.is_decoy` is true (a duress session must never be able to trigger real account deletion) | |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| `/auth/callback` | `user_link.infra_user_id` | the `sub` claim of the id token Infra returns, never trusted from anywhere else |
| `/auth/callback` | whether this is a first sign in (routes to onboarding) | derived, no existing `user_link` row with a non null `infra_user_id` matches the `sub` claim |
| `/profile` GET | whether to return real or decoy shaped data | `session.is_decoy`, read once per request, never cached client side |
| `/app-lock/verify` | whether to set `is_decoy` true, false, or reject | derived, compares the submitted PIN's hash against `pin_hash` and `duress_pin_hash`; both comparisons always run, so the work done is identical either way |
| `/profile` PATCH | the curated avatar list `avatar_slug` and the `topics` vocabulary are checked against | shipped TypeScript constants bundled with the app (see index.md's Follow up on expanding `www/public/avatar/`), never user supplied values |

**Key invariants**:
- `user_link.infra_user_id` is never rendered in any UI and never returned by any endpoint except internally during the OAuth callback; `user_link.id` itself is also never used as a public facing identifier (R2 keys use `storage_prefix` instead, see [0002](0002-data-model-backend.md)).
- `pin_hash` and `duress_pin_hash`, when both set, must never be equal (checked at write time), and both are always checked on every verify attempt regardless of which one matches, so timing cannot leak information.
- Whether a session is real or decoy lives only on the server side `session` row; no endpoint response ever contains a field that names the state, and every endpoint that returns private, session scoped data reads it from one shared accessor that honors `is_decoy`, never from a per endpoint check that could be missed.
- Decoy mode is never claimed to hide anything public; the pseudonymous profile, and anything the person has submitted that carries their pseudonymous attribution, stay visible to anyone regardless of which PIN unlocked this particular session.
- A local unlock lockout never calls anything that would revoke or affect the Infra backed session; those are two independent locks.
- Changing or clearing an app lock PIN always requires the current real PIN and is never reachable while locked, so having the device unlocked is not by itself enough to disable the duress protection.

**Security model**: every endpoint above except `/auth/login` and `/auth/callback` requires a valid Transspace session (the cookie the thin Better Auth instance issues). `/profile`, `/app-lock`, `/app-lock/verify`, and `/account` are all self only, a person can only ever read or write their own row, enforced by scoping every query to the session's own `user_link_id`, never a client supplied id. A decoy session is further restricted: it can read (decoy shaped data) but can never write anything real, including profile edits and account deletion, so a coerced unlock can never be used to actually damage or delete the real account. Moderators (defined in [0002](0002-data-model-backend.md)) can read another person's public `profile` fields for moderation purposes, but never their `app_lock` row, and every moderator action is written to the audit table defined in [0002](0002-data-model-backend.md).

**Configuration required**:
- `BETTER_AUTH_SECRET`: Transspace's own Better Auth instance secret
- `INFRA_OIDC_ISSUER_URL`: Infra's discovery URL, used by the `genericOAuth` plugin
- `INFRA_OAUTH_CLIENT_ID`, `INFRA_OAUTH_CLIENT_SECRET`: issued when Transspace is registered as a client in Infra's console (see index.md Follow up), requesting the `openid` scope only
- `COOKIE_DOMAIN`: production cookie scoping

**Critical test scenarios**:
- Happy path: a new person signs in through Infra, is routed to onboarding, completes a profile, and reaches the home page with a working session, verifies **AC-1**, **AC-2**
- Failure case: the OAuth callback receives a `state` that does not match what was issued, and is rejected rather than silently signing someone in, verifies **AC-1**
- Auth/permission: a request to `/profile` or `/app-lock` for another person's `user_link_id` is rejected regardless of what id is in the request body, verifies the Security model
- Duress: entering the duress PIN sets `session.is_decoy`, every private endpoint returns empty/generic data for that session while the real session (from another device, or after re entering the real PIN) still shows the true data, and no response body anywhere names which state is active, verifies **AC-6**
- Tamper: an attacker holding an unlocked device attempts `POST /app-lock` without the current PIN, or while the session is locked, and is rejected either way, verifies **AC-5**
- Stored data: after a full sign in and sign out cycle, `user.email`, `user.name`, `user.image`, and any Infra access token are confirmed absent from the database, verifies **AC-3**

## Build plan

1. Register Transspace as an OAuth client in Infra's console, requesting the `openid` scope only, and store the issued client id and secret as Worker secrets, satisfies **AC-1**, **AC-3**
2. Stand up the thin Better Auth instance with the `genericOAuth` plugin against Infra's discovery URL, PKCE on; configure the profile mapper to drop `email`/`name`/`image`, and add a database hook that clears `account`'s stored access token once the sign in flow completes; wire `/auth/login` and `/auth/callback`, satisfies **AC-1**, **AC-3**, **AC-8**
3. Create the D1 migration for `user_link` (including `storage_prefix`, generated at creation) and `profile`, and build the onboarding gate that blocks navigation until a display name and avatar are chosen, enforcing the display name policy and the shipped avatar/topic vocabularies, satisfies **AC-2**
4. Replace the `(protection)` route stub's empty state with a real session guard reading the Better Auth session, satisfies **AC-1**, **AC-4**
5. Build sign out, including the "sign out everywhere" action, satisfies **AC-4**
6. Create the D1 migration for `app_lock` and the two new `session` fields (`is_decoy`, `unlocked_until`); build the shared session scoped data accessor every private read path must go through, so decoy shaping happens in one place, satisfies **AC-6**
7. Build the PIN settings screen (`current_pin` required to change anything) and the local unlock prompt, including the reject-while-locked rule on `/app-lock` and the `prompt=login` forced re authentication path for `/app-lock/reset`, satisfies **AC-5**
8. Add the cooldown schedule (30 seconds doubling to a one hour cap) and constant time dual hash checking to `/app-lock/verify`, satisfies **AC-7**
9. Build account deletion per the Data model sketch's `deleted_at` handling (clearing `profile` fields, nulling `user_link.infra_user_id`, deleting the `app_lock` row, deleting any `moderators` row with an audit entry per [0002](0002-data-model-backend.md)), rejected while `session.is_decoy`, satisfies **AC-3**'s spirit and the Security model

## Consequences

**Positive**:
- A person can fully disappear from Transspace (delete their profile) without that touching their Infra account, which other Pherus apps may still use.
- The duress mechanism now genuinely withholds private, session scoped data server side, not just a client visible flag an attacker with the device could see straight through.
- Nothing Infra specific (an email, an access token) sits in Transspace's own database after sign in completes, which meaningfully shrinks what a Transspace side breach could expose.

**Negative / tradeoffs**:
- Even with the fixes above, Infra itself still retains a record that this specific `sub` authenticated to Transspace's `client_id`, at a given time, from a given IP and Cloudflare derived location; the first draft understated this as "Infra stores zero Transspace data," which is not quite true, Infra stores an auth event, just not any Transspace content. See [index.md](index.md)'s Consequences and Follow up for the current, corrected framing of that residual risk.
- The decoy mechanism only ever hides private data; it cannot and does not hide a person's public pseudonymous profile or anything they have publicly submitted elsewhere, so an attacker who already knows someone's display name can defeat it by simply looking at that profile from any other device. This is now stated plainly rather than implied away.
- Two separate lock surfaces (the Infra session and the local app lock) mean two things to reason about and test, not one, and the server side decoy accessor is a discipline every future endpoint author has to remember to use, not something the type system enforces on its own.

**Neutral**:
- Passkeys and two factor authentication are already available through Infra's own sign in flow; Transspace does not need to build either itself, only make sure its OAuth flow does not block a person who has one set up on their Infra account.
- A session list showing active devices was considered and deliberately not built here (see Follow up): it is itself a coercion risk, since an abuser could demand to see it looking for a hidden second device.

## Follow up

- [ ] Confirm with whoever operates Infra that its `sub` claim (backed by `database: { generateId: "uuid" }` in `infra/auth/auth.ts`) is permanent per person and never reused; this spec's account linking assumes it, and Infra itself is a separate repository this session cannot change.
- [ ] A visible "active sessions on other devices" screen was intentionally left out of this pass, since showing it is itself a coercion risk (it can reveal a hidden device to whoever is demanding the unlock); if it is ever built, design it with that specifically in mind rather than as a routine account security feature.
- [ ] The exact "how long an unlock lasts before re-locking" window (`session.unlocked_until`'s duration) was set at 10 minutes of inactivity as a reasonable default; revisit once real usage patterns exist.
