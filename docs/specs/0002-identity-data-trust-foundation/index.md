# 0002. Identity, data and trust foundation

**Date**: 2026-09-24
**Status**: In Progress

This spec was cross checked by an independent model after the first draft; the version below reflects the fixes that check found necessary (a genuinely server enforced duress mode, moderator safety rails, an honest account of what Infra can still learn, and several previously unspecified numbers). Each child spec carries its own note on what changed.

## Summary

This decides how Transspace handles who a person is, where their data lives, and how the community decides what content to trust. Sign in happens through Infra, Pherus's own self hosted identity service (built on Better Auth), which only ever learns that a particular opaque id signed in, from roughly where, and when, never anything about that person's actual activity on Transspace (their profile, saved items, or submissions). Transspace keeps its own separate database (Cloudflare D1, reached through the Drizzle query library) holding a pseudonymous profile, its own file storage (Cloudflare R2) for content people upload, and a trust signal system so every piece of community content shows why it can be believed. The whole design assumes some users are in places where being LGBTQIA+ is dangerous, so privacy and low data collection are treated as safety features, not nice to haves.

## Structure

This is a foundation covering three linked but separately buildable decisions from `docs/scope/scope.md` (features 6, 7, 8):

- [0001. Authentication and identity](0001-authentication-identity.md): how a person signs in through Infra, how Transspace keeps its own session, the private identity versus pseudonymous profile split, and the local app lock with a duress option. Supports scope feature 7.
- [0002. Data model and backend](0002-data-model-backend.md): the database, ORM, file storage, API shape, and anti scraping protection that the rest of the product is built on. Supports scope feature 6.
- [0003. Trust and verification signals](0003-trust-verification-signals.md): the shared trust state that resource, guide, story, opportunity, and business content will all carry, and who can set each state. Supports scope feature 8.

Explicitly out of scope for all three: designing the actual content entities (resources, guides, stories, opportunities, businesses; each gets its own later `/architect` pass per its scope slice) and the peer to peer Q2Q realtime chat feature (already listed as Deferred in `docs/scope/scope.md`, needs its own focused design when it is picked up).

## Decision

**Chosen option**: Option 1, federate identity through Infra, keep all Transspace specific data in Transspace's own Cloudflare account.

Transspace signs people in through Infra (Pherus's existing, already deployed OAuth 2.1 and OIDC identity server) using a thin Better Auth instance of its own configured with the generic OAuth client plugin, and keeps everything else (profile, trust signals, files, sessions) in its own D1 database and R2 bucket that Infra never sees.

**Implementation skills**: `better-auth` (`better-auth/skills`, path to be added once installed) · `drizzle-orm-d1` (`jezweb/claude-skills`, path to be added once installed) · `cloudflare` (`cloudflare/skills`, path to be added once installed) · `cloudflare-turnstile` (`jezweb/claude-skills`, path to be added once installed) · `tanstack-start` (`tanstack-skills/tanstack-skills`, path to be added once installed)

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Identity provider | Infra (self hosted, Pherus's own Better Auth based OAuth 2.1 and OIDC provider), requesting the `openid` scope only | Already live, already trusted by other Pherus apps; requesting only `openid` (not `profile`/`email`/`offline_access`) keeps Transspace from ever receiving or storing more than the bare identity claim it needs (basis: `~/projects/infra`'s own `AGENTS.md`, confirmed by reading `infra/auth/auth.ts`) |
| OAuth client / session | A thin Better Auth instance in Transspace, `genericOAuth` plugin against Infra, with a database hook clearing any stored access token once sign in completes | PKCE by default, real OIDC discovery, and battle tested cookie/CSRF/session handling for free, instead of hand rolling a token exchange (basis: better-auth.com generic oauth docs, web verified) |
| Primary database | Cloudflare D1 | Matches Infra's own choice and the existing Cloudflare Workers deployment; no new infrastructure to run |
| ORM | Drizzle ORM (`drizzle-orm/d1`) | Same library Infra already uses; one query convention across every Pherus app |
| File storage | Cloudflare R2, a bucket owned entirely by Transspace, keyed by a random `storage_prefix` rather than any internal id | Infra's asset plugin is a Better Auth plugin, not reusable without running a full auth server; a small purpose built upload module keeps storage and identity cleanly separated, and keying by a separate random value keeps a public file URL from ever revealing an internal database id |
| Anti scraping / anti bot | Cloudflare Turnstile on write endpoints only; Cloudflare Rate Limiting Rules on every endpoint, generous and challenge free on read/search | Protects writes server side regardless of what is open in a visitor's browser, while keeping the directory itself usable over Tor and commercial VPNs, which an interactive challenge on search would have actively hurt |
| Hosting | Cloudflare Workers (already the deployment target) | No change; every layer above already runs on the same platform |
| Observability | Cloudflare Workers observability (already enabled in `wrangler.jsonc`) | Already on; no new tool needed for this foundation |

## Cross child contract

These tables are the shared spine every child spec builds on. Full field lists live in each child's own data model section; this is only the shape that more than one child depends on.

- **`user_link`**: the one row that exists per person in Transspace's own D1, holding Infra's opaque user id (cleared on account deletion) and a separate, random `storage_prefix` used anywhere a public facing identifier is needed. Every other table hangs off this row's own local id, never off Infra's id directly, and no public URL or response ever exposes that local id either, only `storage_prefix` where one is needed at all. So a future identity provider change only touches this one table.
- **`profile`**: the pseudonymous, public facing row (display name, avatar choice, bio, pronouns, topics), one to one with `user_link`. Defined fully in [0001](0001-authentication-identity.md).
- **`moderators`**: which `user_link` rows can act as a Transspace moderator, entirely local to Transspace, independent of Infra's own admin or user role, with a floor of two so the role can never be emptied out entirely from within the app. Defined in [0002](0002-data-model-backend.md), used by [0003](0003-trust-verification-signals.md).
- **`moderation_action`**: an append only audit row for every moderator only action across every child spec (granting or revoking moderator status, verifying or disputing a trust signal, acting on someone else's upload). Defined in [0002](0002-data-model-backend.md).
- **`app_lock`**, plus two additional fields on Better Auth's own `session` table (`is_decoy`, `unlocked_until`): the local unlock PIN, its duress variant, and the server side state that decides whether a given session is showing real or decoy data. One to one with `user_link`. Defined in [0001](0001-authentication-identity.md).
- **Trust signal rows** reference content by a `(content_type, content_id)` pair, validated against a shipped registry of known content types, rather than a foreign key into any specific content table, since no content table is designed yet. Defined in [0003](0003-trust-verification-signals.md).

## Consequences

**Positive**:
- No password, email, or Infra credential ever touches Transspace's own database (the profile mapper drops them and the OAuth scope requested excludes them); a breach of Transspace's D1 or R2 cannot expose anyone's sign in credentials.
- Infra genuinely holds no Transspace content (no profile, no saved items, no submissions); the cross app correlation risk from sharing one identity provider is limited to what Infra itself logs about the sign in event, not a dossier of what someone reads or submits on Transspace. See the Negative row below for exactly what that residual event log is, stated precisely rather than rounded down to "nothing."
- Reusing Infra, D1, Drizzle, and the Cloudflare stack Pherus already operates means no new infrastructure, billing relationship, or on call surface to learn.

**Negative / tradeoffs**:
- Transspace now depends on Infra's uptime and correctness for every sign in; an Infra outage is a Transspace outage for anyone not already holding a session.
- Infra logs IP address plus country, city, and region on every sign in event, instance wide, meaning it can learn that a given opaque id used Transspace specifically, roughly where from, and when. Under this project's own hostile jurisdiction stance, that membership fact (not just content) is itself sensitive. The engineer reviewed this exact risk in this session and chose to accept it as is for now rather than treat it as blocking (see Follow up); this line states the risk precisely so that choice stays an informed one, not a rounded down one.
- Email and password is the only sign in method at launch (2FA and passkeys are available as extra factors, but there is no social sign in yet), which is a real usability cost for people who would rather not create and remember one more password.

**Neutral**:
- Transspace becomes the fourth app on this Infra instance (after `accounts`, `www`, and `seer`), and will need to be registered as a new OAuth client in Infra's own admin console before any of this can be built.

## Follow up

- [ ] Register Transspace as a new OAuth 2.1 client in Infra's console (`~/projects/infra`), with its redirect URIs and the `openid` scope only (not `profile`, `email`, or `offline_access`, per [0001](0001-authentication-identity.md)'s revised Decision); this is a change made in Infra's own admin UI, not code in this repository.
- [ ] Infra level, a separate piece of work in `~/projects/infra`, not this repository: consider hardening `infra/auth/auth.ts`'s geo logging (`disableIpTracking`, and whether city and region precision is needed at all) given Transspace's hostile jurisdiction stance. Flagged, not blocking, per the engineer's call in this session.
- [ ] Infra level, also a separate piece of work: adding Google and GitHub social sign in to Infra was explicitly deferred; Transspace launches on Infra's existing email and password (plus optional 2FA and passkey) only.
- [ ] Expand `www/public/avatar/` beyond its current five generic colors into a curated set that represents a range of LGBTQIA+ identities plus some neutral options, since the profile picker in [0001](0001-authentication-identity.md) needs real choices to offer. This is an asset and design task, not an architecture one.
- [ ] Install the Agent Skills found during this session once ready: `better-auth/skills`, `jezweb/claude-skills` (`drizzle-orm-d1` and `cloudflare-turnstile`), `cloudflare/skills`, `tanstack-skills/tanstack-skills`. Run `npx skills add <owner>/<repo> -y` for each, then add a line for each to a new root `AGENTS.md` once one exists (scope feature 2 is still planned).
- [ ] A Cloudflare MCP server exists officially and would give an agent live access to the real Cloudflare account (bindings, logs, R2 contents) instead of assumptions; connecting it is a manual MCP configuration step for the engineer, not something this session can do.
- [ ] Full research detail from this session's tool and landscape check is cached at `docs/.agent-cache/tool-discovery/transspace-foundation-2026-09-24.md`.

## Rationale

Reasoning and options considered: see [rationale.md](rationale.md).
