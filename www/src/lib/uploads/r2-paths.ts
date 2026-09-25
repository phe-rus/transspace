import type { AllowedExtension } from "./constants"

// one level of real nesting under a caller's storage_prefix: which
// feature wrote this file, then which specific record it belongs to.
// Fixed allowlist, never a client-supplied string, so this stays
// "organized subfolders" and never reopens arbitrary-path traversal
// (the engineer's explicit call, 2026-09-25 — flat-per-account was the
// original spec 0002 shape; this is a deliberate widening of it)
export const UPLOAD_CATEGORIES = [
    "guides",
    "resources",
    "profile",
    "general",
] as const

export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number]

export function assertValidUploadCategory(
    category: string
): asserts category is UploadCategory {
    if (!(UPLOAD_CATEGORIES as readonly string[]).includes(category)) {
        throw new Response("Unknown upload category", { status: 422 })
    }
}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// the record this file belongs to (a guide id, a resource id); always
// validated as this app's own id format before it's ever concatenated
// into an R2 key, the same reasoning assertValidUploadCategory applies
// to category (spec 0004 AC-9's relatedResourceIds check uses the
// identical pattern)
export function assertValidContentId(
    contentId: string
): asserts contentId is string {
    if (!UUID_RE.test(contentId)) {
        throw new Response("Invalid content id", { status: 422 })
    }
}

// keyed by storage_prefix, never user_link.id — no object key or public
// URL may ever reveal the internal database id (spec 0002 key
// invariants). category and contentId are both validated by the caller
// before reaching here (assertValidUploadCategory, assertValidContentId),
// so this never trusts raw client input for either segment
export function fileKey(
    storagePrefix: string,
    category: UploadCategory,
    contentId: string,
    filename: string
): string {
    return `${storagePrefix}/${category}/${contentId}/${sanitizeFilename(filename)}`
}

export function sanitizeFilename(name: string): string {
    const cleaned = name
        .replace(/[/\\]/g, "")
        .replace(/^\.+/, "")
    return cleaned.slice(-200) || "file"
}

export async function listAllObjects(
    bucket: R2Bucket,
    prefix: string
): Promise<R2Object[]> {
    const objects: R2Object[] = []
    let cursor: string | undefined
    do {
        const result = await bucket.list({ prefix, cursor })
        objects.push(...result.objects)
        cursor = result.truncated ? result.cursor : undefined
    } while (cursor)
    return objects
}

// always computed live from what's actually in the bucket, never a
// counter that could drift from reality (spec 0002 key invariants)
export async function getUsageBytes(
    bucket: R2Bucket,
    storagePrefix: string
): Promise<number> {
    const objects = await listAllObjects(
        bucket,
        `${storagePrefix}/`
    )
    return objects.reduce((sum, obj) => sum + obj.size, 0)
}

export type { AllowedExtension }
