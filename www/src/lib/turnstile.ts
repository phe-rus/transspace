import { env } from "cloudflare:workers"

// spec 0002 AC-5: every write endpoint requires a Turnstile challenge;
// read/search endpoints never do
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
