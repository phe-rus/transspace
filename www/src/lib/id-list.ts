// userLink keeps small lists (blockedUserIds, joinedCommunities) as a JSON
// array in one text column, since D1 has no native array type. Anything
// malformed reads as an empty list rather than failing the request
export function parseIdList(value: string | null | undefined): string[] {
    if (!value) return []
    try {
        const parsed: unknown = JSON.parse(value)
        return Array.isArray(parsed)
            ? parsed.filter((id): id is string => typeof id === "string")
            : []
    } catch {
        return []
    }
}
