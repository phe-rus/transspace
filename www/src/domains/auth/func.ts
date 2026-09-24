import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import { SessionMiddleware } from "@/middleware/require-session"
import { signOutSchema } from "./types"

// GET /api/auth/login: a plain link works with no client JS at all (spec
// 0001 AC-1). The redirect target is computed server side here and
// returned as a real Location header, not left to a client-side
// signIn.social() call. `forceReauth` forces Infra to show its real
// login form again (prompt=login) even with an existing Infra-side
// session; the /app-lock/reset entry point uses this (spec 0001 API
// surface: "requires proving the person still knows their Infra
// password, not just that the device is unlocked").
export async function loginRedirectUrl(
    headers: Headers,
    options?: { forceReauth?: boolean }
): Promise<string> {
    try {
        const result = await auth.api.signInSocial({
            body: {
                provider: "infra",
                callbackURL: options?.forceReauth
                    ? "/reset-lock"
                    : "/",
                ...(options?.forceReauth && {
                    additionalParams: { prompt: "login" },
                }),
            },
            headers,
        })
        if (!result.url) throw new Error("no redirect url returned")
        return result.url
    } catch {
        throw new Response(
            "Identity service unavailable, try again shortly",
            { status: 503 }
        )
    }
}

// spec 0001 AC-4: clears Transspace's own session cookie and revokes it
// server side; never touches or signs the person out of Infra itself.
// "everywhere" revokes every session tied to this user_link instead.
// Gated on SessionMiddleware (spec 0001 API surface: "Auth: session"):
// signing out only makes sense, and only clears anything, for an actual
// session.
export const signOutSession = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator((input: unknown) => input)
    .handler(async ({ data }) => {
        const parsed = signOutSchema.safeParse(data)
        const everywhere = Boolean(parsed.success && parsed.data.everywhere)
        const headers = getRequestHeaders()
        if (everywhere) {
            await auth.api.revokeSessions({ headers })
        } else {
            await auth.api.signOut({ headers })
        }
        return { success: true as const }
    })
