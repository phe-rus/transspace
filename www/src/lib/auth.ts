import { betterAuth } from "better-auth/minimal"
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2"
import { genericOAuth } from "better-auth/plugins/generic-oauth"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as authSchema from "@/schemas/auth"
import { account as authAccount } from "@/schemas/auth"
import { userLink } from "@/schemas/user-link"
import { profile } from "@/schemas/profile"

const authEnv = {
    BETTER_AUTH_SECRET: import.meta.env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: import.meta.env.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL,
    INFRA_OIDC_ISSUER_URL: import.meta.env.INFRA_OIDC_ISSUER_URL ?? process.env.INFRA_OIDC_ISSUER_URL,
    INFRA_OAUTH_CLIENT_ID: import.meta.env.INFRA_OAUTH_CLIENT_ID ?? process.env.INFRA_OAUTH_CLIENT_ID,
    INFRA_OAUTH_CLIENT_SECRET: import.meta.env.INFRA_OAUTH_CLIENT_SECRET ?? process.env.INFRA_OAUTH_CLIENT_SECRET,
    COOKIE_DOMAIN: import.meta.env.COOKIE_DOMAIN ?? process.env.COOKIE_DOMAIN,
}

const isProduction = import.meta.env.PROD
async function clearInfraTokens(accountId: string) {
    await db
        .update(authAccount)
        .set({ accessToken: null, refreshToken: null, idToken: null })
        .where(eq(authAccount.id, accountId))
}

export const auth = betterAuth({
    baseURL: authEnv.BETTER_AUTH_URL,
    secret: authEnv.BETTER_AUTH_SECRET,
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
            domain: isProduction ? authEnv.COOKIE_DOMAIN : undefined,
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
            role: {
                type: "string",
                required: false,
                input: false
            },
        },
    },
    databaseHooks: {
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
                    clientId: authEnv.INFRA_OAUTH_CLIENT_ID,
                    clientSecret: authEnv.INFRA_OAUTH_CLIENT_SECRET || undefined,
                    discoveryUrl: authEnv.INFRA_OIDC_ISSUER_URL,
                    scopes: ["openid"],
                    pkce: true,
                    authentication: "post",
                    overrideUserInfo: false,
                    mapProfileToUser: () => ({}),
                },
            ],
        }),
        tanstackStartCookies(),
    ],
})
