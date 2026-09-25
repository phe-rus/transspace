export type CreatedAtCursor = { createdAt: number; id: string }

// an opaque cursor for a list ordered by (createdAt DESC, id DESC);
// distinct from lib/pagination.ts's bare-id cursor since id alone (a
// random UUID) carries no chronological order to page through
// (spec 0003-resource-directory Value sourcing)
export function encodeCreatedAtCursor(row: {
    createdAt: Date
    id: string
}): string {
    return Buffer.from(
        JSON.stringify({
            createdAt: row.createdAt.getTime(),
            id: row.id,
        })
    ).toString("base64url")
}

export function decodeCreatedAtCursor(
    cursor: string
): CreatedAtCursor | null {
    try {
        const parsed = JSON.parse(
            Buffer.from(cursor, "base64url").toString("utf-8")
        )
        if (
            typeof parsed.createdAt === "number" &&
            typeof parsed.id === "string"
        ) {
            return parsed
        }
        return null
    } catch {
        return null
    }
}
