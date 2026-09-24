import type { AllowedExtension } from "./constants"

// keyed by storage_prefix, never user_link.id — no object key or public
// URL may ever reveal the internal database id (spec 0002 key invariants)
export function fileKey(
    storagePrefix: string,
    filename: string
): string {
    return `${storagePrefix}/${sanitizeFilename(filename)}`
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
