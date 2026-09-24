# Rationale: identity, data and trust foundation

## Context

Transspace has no backend today. Three linked decisions from `docs/scope/scope.md` (data model and backend, authentication and identity, trust and verification signals) all carry a `needs a decision` tag and a `GA` workflow tier, meaning they get extra rigor because they touch identity and moderation of a vulnerable population.

The product exists for LGBTQIA+ people worldwide, including people in places where that identity is criminalized or actively dangerous. The engineer confirmed a hostile jurisdiction by default posture for this session: design as if any government, employer, or family member could eventually see whatever is collected, minimize what is ever gathered, and treat every third party (an OAuth provider, a host, an analytics vendor) as a potential subpoena target. That stance is the single biggest force shaping every choice below, more than typical scale or team size concerns would be for a project this size.

A second force is that Pherus already runs a real, deployed, self hosted identity service called Infra (`~/projects/infra`), built on Better Auth, running a spec compliant OAuth 2.1 and OIDC provider on Cloudflare Workers with D1, KV, and R2. It already serves other Pherus apps (`accounts`, `www`, and an app called `seer`) and is designed, by its own `AGENTS.md`, to store nothing about any connected app beyond the minimum identity fields (email, a stable user id, session state). Reusing it is strongly preferred over standing up a second, unrelated auth system, both by general practice (never reinvent authentication) and by this project's own instruction to prefer what the surrounding Pherus stack already runs.

A third force is that Transspace's public facing identity is deliberately not the same thing as the Infra account: a person's real (or at least Infra known) email is never meant to appear anywhere in Transspace's own product surface. What the community sees is a pseudonymous profile, and the trust and verification model has to work entirely off that pseudonymous surface, never the private identity underneath it.

The consequence of not deciding this now is that every later feature (saved resources, submissions, moderation) would either invent its own half built notion of "who is signed in," or get blocked entirely, since none of scope features 9 and onward can start without this foundation in place.

## Options considered

### Option 1: Federate through Infra, Transspace owns all of its own data

Transspace becomes a new OAuth 2.1 client of the already deployed Infra instance. A thin Better Auth instance inside Transspace (using the `genericOAuth` client plugin) handles the token exchange and gives Transspace its own session cookies. Everything else, the pseudonymous profile, trust signals, uploaded files, moderator list, lives in a D1 database and an R2 bucket that belong to Transspace alone and that Infra never reads or writes.

**Pros**:
- Reuses proven, already operated infrastructure instead of building a second identity system from nothing.
- A clean boundary: Infra can only ever leak "this opaque id exists and is authenticated," never anything about what someone does on Transspace.
- Matches the stack Pherus already runs end to end (Cloudflare Workers, D1, Drizzle, Better Auth), so the same operational knowledge and tooling carries over.

**Cons**:
- Couples Transspace's uptime to Infra's uptime; if Infra is down, no one can complete a fresh sign in.
- Infra's current geo logging (IP, country, city, region on every auth event) is outside this repository's control, and the engineer has accepted it as a known, separate risk rather than a blocker.

### Option 2: A standalone Better Auth instance owned entirely by Transspace

Transspace runs its own full Better Auth server, its own `emailAndPassword`, its own user table, with no dependency on Infra at all.

**Pros**:
- Total independence; nothing outside this repository can ever affect Transspace's sign in.
- Simpler mental model for a single small app with no shared identity concerns.

**Cons**:
- Directly contradicts the stated intent of Infra, which exists specifically so that Pherus apps do not each reinvent credential storage; building a second one is the sprawl Infra was built to prevent.
- Means Transspace, not Infra, becomes the thing holding passwords, password reset flows, and email verification, the exact security surface a centralized identity service is meant to take off every app's plate.

### Option 3: A third party hosted auth provider (for example a hosted identity as a service product)

**Pros**:
- Fast to integrate, well documented, handles compliance certifications a self hosted system would need to earn on its own.

**Cons**:
- Directly works against the hostile jurisdiction stance: a third party company outside Pherus's control becomes a place where sign in records for an at risk population live, reachable by that company's own legal process in whatever country it operates from.
- Ongoing per user billing for something Pherus already operates for free on its own infrastructure.
- Ignores infrastructure the project already has; ruled out quickly once Infra was confirmed live.

## Rationale

Option 1 wins because it is the only option that satisfies all three forces from Context at once: it reuses proven infrastructure (never reinvent authentication), it respects the hostile jurisdiction stance better than a third party provider ever could (a self hosted, Pherus operated identity service is not subject to a foreign company's own data requests), and it keeps the pseudonymous profile fully separate from the private identity by construction, since Infra was independently designed to hold nothing about any connected app. Option 2 was rejected specifically because it recreates the exact sprawl Infra exists to prevent. Option 3 was rejected because a third party identity vendor is a worse fit for this population's threat model than infrastructure Pherus already runs and controls, not a better one.

## Evidence: reading `~/projects/infra` directly

Rather than take the engineer's summary of Infra on faith, this session read the actual repository. Findings that shaped the decision:

- `infra/auth/auth.ts` runs a single `betterAuth({...})` instance with `emailAndPassword` (required email verification), `twoFactor`, `passkey`, a `jwt` plugin, and `@better-auth/oauth-provider` registered as `oauthProvider(...)`, scoped to `["openid", "profile", "email", "offline_access"]`. `cachedTrustedClients` currently lists `"seer"` and `"pherus"`; Transspace is not yet a registered client.
- No `socialProviders` block exists in `auth.ts` and no Google or GitHub client id appears in `.env.example`, contradicting the engineer's initial recollection that Infra offered Google and GitHub sign in. The actual, current state is email and password, with 2FA and passkey available as additional factors on the same OAuth end user sign in flow Transspace's users would go through.
- `infra/auth/auth.ts`'s `advanced.ipAddress` block has `disableIpTracking: false`, and a request hook (`logAuthEvent`) records IP address plus Cloudflare's own `country`, `city`, and `region` fields on every sign in, sign up, sign out, two factor, and password reset event, instance wide (affecting every app on this Infra deployment, not only Transspace).
- `infra`'s own object storage plugin, `@infra/assets` (`shared/assets/` in that repository), is a Better Auth plugin (`assets({ binding, isAdmin })`) mounted on Infra's own auth instance; it is not something a pure OAuth client like Transspace can call without also running a full Better Auth server, which is why this spec gives Transspace its own, independent R2 bucket instead.
- Infra and Transspace both already use Cloudflare D1 with Drizzle ORM (Infra's `package.json` pins `drizzle-orm`, `drizzle-kit`, and `@better-auth/drizzle-adapter`), which is why the same combination is the proposed choice for Transspace's own database rather than an alternative.

## References

**Project sources** (verifiable, in this repo or the Infra repo):
- `docs/scope/scope.md`, features 6, 7, and 8, and this project's `Workflow` and `Build approach` header
- `README.md`, this repository's stack and repo layout sections
- `~/projects/infra/README.md` and `~/projects/infra/AGENTS.md`, the monorepo split between `infra`, `accounts`, and `www`
- `~/projects/infra/infra/AGENTS.md`, the OAuth 2.1 and OIDC provider architecture (Console section) and the access model
- `~/projects/infra/infra/auth/auth.ts`, read directly, the actual configured plugins, session settings, and geo logging behavior

**Practices & standards**:
- Never reinvent authentication; use a proven library or service unless a documented regulatory reason forbids it
- PKCE (Proof Key for Code Exchange) for any OAuth 2.1 authorization code flow, the current baseline for public and confidential clients alike
- Data minimization as a safety control for an at risk population, not only a compliance nicety
- Reuse the platform the surrounding project already operates over adding a new one, all else being close to equal

**Links** (web verified during this session):
- Better Auth generic OAuth client plugin: https://better-auth.com/docs/plugins/generic-oauth
- Drizzle ORM, connecting to Cloudflare D1: https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1
- Cloudflare Turnstile, getting started: https://developers.cloudflare.com/turnstile/get-started/
