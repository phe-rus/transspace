import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import { SessionMiddleware } from "@/middleware/require-session"
import { signOutSchema } from "./types"

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
