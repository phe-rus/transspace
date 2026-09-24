import { scrypt, randomBytes, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64
// same shape as a real hash (32 hex chars of salt, 128 of key) so a
// missing pin_hash/duress_pin_hash still costs a real scrypt derivation
// rather than short circuiting — timing must not reveal that a slot is
// unset (spec 0001 AC-7)
const DUMMY_HASH = `${"0".repeat(32)}:${"0".repeat(128)}`

async function derive(pin: string, salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(pin, salt, KEY_LENGTH)) as Buffer
}

// `salt:hash`, both hex (spec 0001 Data model sketch)
export async function hashPin(pin: string): Promise<string> {
    const salt = randomBytes(16)
    const hash = await derive(pin, salt)
    return `${salt.toString("hex")}:${hash.toString("hex")}`
}

// exported for the app-lock domain's cross-request collision check (a
// new pin/duressPin must never match the OTHER slot's already-stored
// hash, not just the value submitted alongside it in the same request);
// not timing-sensitive here since it only runs after currentPin has
// already been verified
export async function pinMatchesHash(
    pin: string,
    stored: string
): Promise<boolean> {
    return matchesHash(pin, stored)
}

async function matchesHash(pin: string, stored: string): Promise<boolean> {
    const [saltHex, hashHex] = stored.split(":")
    const salt = Buffer.from(saltHex, "hex")
    const expected = Buffer.from(hashHex, "hex")
    const actual = await derive(pin, salt)
    return (
        actual.length === expected.length &&
        timingSafeEqual(actual, expected)
    )
}

export type PinVerifyResult = "real" | "duress" | "invalid"

// both comparisons always run, unconditionally, so response timing can
// never reveal which (if either) was closer to correct (spec 0001 AC-7,
// key invariants)
export async function verifyPinDual(
    pin: string,
    pinHash: string | null,
    duressPinHash: string | null
): Promise<PinVerifyResult> {
    const [realMatch, duressMatch] = await Promise.all([
        matchesHash(pin, pinHash ?? DUMMY_HASH),
        matchesHash(pin, duressPinHash ?? DUMMY_HASH),
    ])
    if (pinHash && realMatch) return "real"
    if (duressPinHash && duressMatch) return "duress"
    return "invalid"
}

const WEAK_PIN_PATTERNS = [
    /^(\d)\1+$/, // repeating, e.g. 111111
]

function isSequential(pin: string): boolean {
    const digits = pin.split("").map(Number)
    const ascending = digits.every(
        (d, i) => i === 0 || d === digits[i - 1] + 1
    )
    const descending = digits.every(
        (d, i) => i === 0 || d === digits[i - 1] - 1
    )
    return ascending || descending
}

// minimum 6 digits, rejecting obviously weak patterns (spec 0001 AC-5)
export function isWeakPin(pin: string): boolean {
    if (!/^\d{6,}$/.test(pin)) return true
    return (
        WEAK_PIN_PATTERNS.some((pattern) => pattern.test(pin)) ||
        isSequential(pin)
    )
}

const COOLDOWN_BASE_SECONDS = 30
const COOLDOWN_CAP_SECONDS = 60 * 60

// 30s, 60s, 120s, … capped at one hour (spec 0001 AC-7)
export function cooldownSecondsFor(failedAttempts: number): number {
    if (failedAttempts <= 0) return 0
    const seconds = COOLDOWN_BASE_SECONDS * 2 ** (failedAttempts - 1)
    return Math.min(seconds, COOLDOWN_CAP_SECONDS)
}
