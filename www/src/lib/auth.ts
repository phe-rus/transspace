import { betterAuth } from "better-auth/minimal"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { genericOAuth } from "better-auth/plugins/generic-oauth"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { env } from "cloudflare:workers"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as authSchema from "@/schemas/auth"
import { account as authAccount } from "@/schemas/auth"
import { userLink } from "@/schemas/user-link"
import { profile } from "@/schemas/profile"

const isProduction = env.NODE_ENV === "production"

// clears whatever Better Auth just stored for the "infra" account link:
// its own OAuth token exchange writes these columns before this hook can
// run, so they're nulled out again immediately rather than never written
// at all (spec 0001 Build plan step 2, AC-3)
async function clearInfraTokens(accountId: string) {
    await db
        .update(authAccount)
        .set({ accessToken: null, refreshToken: null, idToken: null })
        .where(eq(authAccount.id, accountId))
}

export const auth = betterAuth({
    // required in practice, not just Better Auth's own optional hint:
    // without it, auth.api.signInSocial() (called directly, not through
    // auth.handler(request)) can't derive an absolute origin and computes
    // a bare-path redirect_uri ("/callback/infra") that Infra will never
    // match against the registered absolute URL
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "sqlite",
        camelCase: true,
        schema: authSchema,
    }),
    advanced: {
        database: { generateId: "uuid" },
        useSecureCookies: isProduction,
        cookiePrefix: "transspace",
        defaultCookieAttributes: {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
        },
        crossSubDomainCookies: {
            enabled: isProduction,
            domain: isProduction ? env.COOKIE_DOMAIN : undefined,
        },
    },
    session: {
        additionalFields: {
            isDecoy: { type: "boolean", required: false, input: false },
            unlockedUntil: {
                type: "date",
                required: false,
                input: false,
            },
        },
    },
    databaseHooks: {
        // `mapProfileToUser: () => ({})` on the genericOAuth config below
        // turned out to only ADD to Better Auth's own default name/email/
        // image extraction from the provider profile, not replace it:
        // a real email and display name from Infra landed in `user` even
        // with an empty mapper. This is the actual enforcement point for
        // spec 0001 AC-3: `user.email`/`user.name` are NOT NULL in the
        // generated schema (can't be hand-loosened, see schemas/auth.ts's
        // own note), so a synthetic, non-identifying placeholder is
        // substituted here rather than anything Infra sent; `image` is
        // nullable and set to null directly. Both create and update are
        // covered in case a later provider info refresh tries to reset
        // these.
        user: {
            create: {
                before: async (user) => ({
                    data: {
                        ...user,
                        name: "Transspace user",
                        email: `${crypto.randomUUID()}@no-reply.invalid`,
                        image: null,
                    },
                }),
            },
            update: {
                before: async (user) => ({
                    data: {
                        ...user,
                        ...(user.name !== undefined && {
                            name: "Transspace user",
                        }),
                        ...(user.email !== undefined && {
                            email: `${crypto.randomUUID()}@no-reply.invalid`,
                        }),
                        ...(user.image !== undefined && { image: null }),
                    },
                }),
            },
        },
        account: {
            create: {
                // fires once, the moment the OAuth link is first created:
                // exactly Transspace's "very first sign in" (spec 0001
                // AC-2). userLink.id is set to Better Auth's own local
                // account.userId so no extra join is ever needed to go
                // from a session to a userLink row.
                after: async (createdAccount) => {
                    if (createdAccount.providerId !== "infra") return
                    await db.insert(userLink).values({
                        id: createdAccount.userId,
                        infraUserId: createdAccount.accountId,
                        storagePrefix: crypto.randomUUID(),
                        createdAt: new Date(),
                    })
                    await db.insert(profile).values({
                        id: crypto.randomUUID(),
                        userLinkId: createdAccount.userId,
                    })
                    await clearInfraTokens(createdAccount.id)
                },
            },
            update: {
                // a repeat sign in refreshes the stored token pair on the
                // existing account row before this can run, so it's cleared
                // again every time, not just on first link (spec 0001 AC-3)
                after: async (updatedAccount) => {
                    if (updatedAccount.providerId !== "infra") return
                    await clearInfraTokens(updatedAccount.id)
                },
            },
        },
    },
    plugins: [
        genericOAuth({
            config: [
                {
                    providerId: "infra",
                    clientId: env.INFRA_OAUTH_CLIENT_ID,
                    // omitted entirely (not empty string) for the public,
                    // no-secret dev client; Better Auth then authenticates
                    // as a public PKCE-only client automatically
                    clientSecret: env.INFRA_OAUTH_CLIENT_SECRET || undefined,
                    discoveryUrl: env.INFRA_OIDC_ISSUER_URL,
                    scopes: ["openid"],
                    pkce: true,
                    authentication: "post",
                    // drops everything Infra might still send beyond the
                    // bare identity claim; nothing upstream is trusted for
                    // name/email/image (spec 0001 AC-3, Decision)
                    mapProfileToUser: () => ({}),
                },
            ],
        }),
        // must be last (better-auth/tanstack-start docs) — routes cookie
        // writes from the plugins above through TanStack Start's own SSR
        // cookie handling
        tanstackStartCookies(),
    ],
})
