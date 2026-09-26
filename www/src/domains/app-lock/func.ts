import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { session as sessionTable } from "@/schemas/auth"
import {
    SessionMiddleware,
} from "@/middleware/require-session"
import { UNLOCK_WINDOW_MS, type CurrentSession } from "@/middleware/session"
import { assertNotDecoy } from "@/lib/private-data"
import {
    hashPin,
    verifyPinDual,
    isWeakPin,
    cooldownSecondsFor,
    pinMatchesHash,
} from "@/lib/pin"
import {
    setAppLockSchema,
    verifyPinSchema,
    FRESH_REAUTH_WINDOW_MS,
} from "./types"

// the app lock cannot be reconfigured at all while locked (spec 0001
// AC-5): "locked" here is the local app lock's own state (session.
// unlockedUntil), not the Infra session, and not the cooldown. No PIN
// configured yet means there's nothing to be locked out of.
async function assertUnlockedForConfig(
    session: CurrentSession
): Promise<void> {
    const [lock] = await db
        .select({ pinHash: userLink.pinHash })
        .from(userLink)
        .where(eq(userLink.id, session.userLinkId))
    const hasPinConfigured = Boolean(lock?.pinHash)
    const isUnlocked = Boolean(
        session.unlockedUntil &&
            session.unlockedUntil.getTime() > Date.now()
    )
    if (hasPinConfigured && !isUnlocked) {
        throw new Response("Locked", { status: 403 })
    }
}

export const setAppLock = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator((input: unknown) => input)
    .handler(async ({ data, context: session }) => {
        assertNotDecoy(session)
        const parsed = setAppLockSchema.safeParse(data)
        if (!parsed.success) {
            throw new Response(parsed.error.message, {
                status: 422,
            })
        }
        const body = parsed.data
        await assertUnlockedForConfig(session)

        const [existing] = await db
            .select({
                pinHash: userLink.pinHash,
                duressPinHash: userLink.duressPinHash,
            })
            .from(userLink)
            .where(eq(userLink.id, session.userLinkId))

        if (existing?.pinHash || existing?.duressPinHash) {
            if (!body.currentPin) {
                throw new Response("Current PIN required", {
                    status: 401,
                })
            }
            const result = await verifyPinDual(
                body.currentPin,
                existing.pinHash,
                existing.duressPinHash
            )
            if (result !== "real") {
                throw new Response(
                    "Current PIN is incorrect",
                    { status: 401 }
                )
            }
        }

        // pin/duressPin must never match each other, checked both ways
        // against whichever value isn't being replaced in this same call,
        // since the schema-level refine only catches a collision when
        // both are submitted together (spec 0001 AC-5, key invariants:
        // "always distinct... checked at write time")
        if (
            body.pin !== undefined &&
            body.duressPin === undefined &&
            existing?.duressPinHash &&
            (await pinMatchesHash(body.pin, existing.duressPinHash))
        ) {
            throw new Response(
                "PIN must differ from the duress PIN",
                { status: 422 }
            )
        }
        if (
            body.duressPin !== undefined &&
            body.pin === undefined &&
            existing?.pinHash &&
            (await pinMatchesHash(body.duressPin, existing.pinHash))
        ) {
            throw new Response(
                "Duress PIN must differ from the PIN",
                { status: 422 }
            )
        }

        const updates: {
            pinHash?: string
            duressPinHash?: string | null
        } = {}
        if (body.pin !== undefined) {
            if (isWeakPin(body.pin)) {
                throw new Response("PIN is too weak", {
                    status: 422,
                })
            }
            updates.pinHash = await hashPin(body.pin)
        }
        if (body.duressPin !== undefined) {
            if (isWeakPin(body.duressPin)) {
                throw new Response(
                    "Duress PIN is too weak",
                    { status: 422 }
                )
            }
            updates.duressPinHash = await hashPin(body.duressPin)
        }
        if (body.clearDuress) {
            updates.duressPinHash = null
        }
        if (Object.keys(updates).length === 0) {
            return { success: true as const }
        }
        await db
            .update(userLink)
            .set(updates)
            .where(eq(userLink.id, session.userLinkId))
        return { success: true as const }
    })

// bare success/failure only, never a field naming which state was
// entered (spec 0001 API surface, key invariants)
export const verifyAppLock = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator((input: unknown) => input)
    .handler(async ({ data, context: session }) => {
        const parsed = verifyPinSchema.safeParse(data)
        if (!parsed.success) {
            throw new Response(parsed.error.message, {
                status: 422,
            })
        }
        const [lock] = await db
            .select({
                pinHash: userLink.pinHash,
                duressPinHash: userLink.duressPinHash,
                failedAttempts: userLink.failedAttempts,
                lockedUntil: userLink.lockedUntil,
            })
            .from(userLink)
            .where(eq(userLink.id, session.userLinkId))
        const now = Date.now()
        if (lock?.lockedUntil && lock.lockedUntil.getTime() > now) {
            throw new Response("Too Many Requests", {
                status: 429,
            })
        }
        const result = await verifyPinDual(
            parsed.data.pin,
            lock?.pinHash ?? null,
            lock?.duressPinHash ?? null
        )
        if (result === "invalid") {
            const failedAttempts = (lock?.failedAttempts ?? 0) + 1
            const lockedUntil = new Date(
                now + cooldownSecondsFor(failedAttempts) * 1000
            )
            await db
                .update(userLink)
                .set({ failedAttempts, lockedUntil })
                .where(eq(userLink.id, session.userLinkId))
            throw new Response("Invalid PIN", { status: 401 })
        }
        await db
            .update(userLink)
            .set({ failedAttempts: 0, lockedUntil: null })
            .where(eq(userLink.id, session.userLinkId))
        await db
            .update(sessionTable)
            .set({
                isDecoy: result === "duress",
                unlockedUntil: new Date(now + UNLOCK_WINDOW_MS),
            })
            .where(eq(sessionTable.id, session.sessionId))
        return { success: true as const }
    })

// only reachable right after a fresh, forced Infra sign in (spec 0001 API
// surface), approximated here by requiring this specific session row to
// have been created within FRESH_REAUTH_WINDOW_MS of this call, since a
// forced prompt=login round trip always mints a brand new session
export const resetAppLock = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .handler(async ({ context: session }) => {
        assertNotDecoy(session)
        const [row] = await db
            .select({ createdAt: sessionTable.createdAt })
            .from(sessionTable)
            .where(eq(sessionTable.id, session.sessionId))
        const freshEnough =
            row &&
            Date.now() - row.createdAt.getTime() <
                FRESH_REAUTH_WINDOW_MS
        if (!freshEnough) {
            throw new Response(
                "Requires a fresh sign in through Infra",
                { status: 401 }
            )
        }
        await db
            .update(userLink)
            .set({
                pinHash: null,
                duressPinHash: null,
                failedAttempts: 0,
                lockedUntil: null,
            })
            .where(eq(userLink.id, session.userLinkId))
        return { success: true as const }
    })

// used by the (protection) route guard's beforeLoad to decide whether to
// redirect to the local unlock prompt
export const getAppLockStatus = createServerFn({ method: "GET" })
    .middleware([SessionMiddleware])
    .handler(async ({ context: session }) => {
        const [lock] = await db
            .select({
                pinHash: userLink.pinHash,
                duressPinHash: userLink.duressPinHash,
            })
            .from(userLink)
            .where(eq(userLink.id, session.userLinkId))
        const hasPinSet = Boolean(lock?.pinHash)
        const isUnlocked = Boolean(
            session.unlockedUntil &&
                session.unlockedUntil.getTime() > Date.now()
        )
        return {
            locked: hasPinSet && !isUnlocked,
            hasPinSet,
            hasDuressPinSet: Boolean(lock?.duressPinHash),
        }
    })
