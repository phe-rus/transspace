import { env } from "cloudflare:workers"

// spec 0002 AC-5: a request over the limit is rejected outright (429),
// never silently delayed
async function assertRateLimit(
    limiter: RateLimit,
    key: string
): Promise<void> {
    const { success } = await limiter.limit({ key })
    if (!success) {
        throw new Response("Too Many Requests", {
            status: 429,
        })
    }
}

export const assertWriteRateLimit = (key: string) =>
    assertRateLimit(env.RATE_LIMITER_WRITE, key)

// generous, never challenged: stays usable over Tor and commercial VPNs
export const assertReadRateLimit = (key: string) =>
    assertRateLimit(env.RATE_LIMITER_READ, key)
