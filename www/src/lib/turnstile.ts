import { env } from "cloudflare:workers"

// used in exactly one place, the login entry (/api/auth/login). The
// engineer's rule overrides spec 0002 AC-5: no write, form or other
// endpoint uses Turnstile; they rely on the session and the write rate
// limit
export async function assertTurnstileVerified(
    token: string | undefined,
    remoteIp?: string
): Promise<void> {
    if (!token) {
        throw new Response(
            "Turnstile verification required",
            { status: 403 }
        )
    }
    const body = new FormData()
    body.append("secret", env.TURNSTILE_SECRET_KEY)
    body.append("response", token)
    if (remoteIp) body.append("remoteip", remoteIp)
    const res = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body }
    )
    const result = (await res.json()) as { success: boolean }
    if (!result.success) {
        throw new Response(
            "Turnstile verification failed",
            { status: 403 }
        )
    }
}
