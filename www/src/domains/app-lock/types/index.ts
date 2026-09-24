import { z } from "zod"

export const setAppLockSchema = z
    .object({
        currentPin: z.string().optional(),
        pin: z.string().optional(),
        duressPin: z.string().optional(),
        clearDuress: z.boolean().optional(),
    })
    .refine(
        (body) =>
            !body.pin || !body.duressPin || body.pin !== body.duressPin,
        { message: "pin and duressPin must differ" }
    )

export const verifyPinSchema = z.object({
    pin: z.string(),
})

// 60 seconds: long enough to complete an OAuth round trip, short enough
// that a stale, already-unlocked device session can't self-service a PIN
// reset without a fresh Infra sign in (spec 0001 API surface, /app-lock/
// reset: "requires proving the person still knows their Infra password,
// not just that the device is unlocked"). The spec names the security
// requirement, not this exact mechanism; the freshness window is this
// build's chosen way to detect "just completed a forced re-authentication".
export const FRESH_REAUTH_WINDOW_MS = 60_000
