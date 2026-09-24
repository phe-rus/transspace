import { z } from "zod"

// spec 0002 AC-4: every list/search endpoint imports this instead of
// reimplementing its own paging — default 20, hard max 50, no "return
// everything" mode for anyone, moderators included
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50

export const paginationSchema = z.object({
    limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE),
    cursor: z.string().optional(),
})

export type Pagination = z.infer<typeof paginationSchema>

export type Page<T> = {
    items: T[]
    nextCursor: string | null
}

// cursor is the last row's own id (text primary keys throughout this
// schema), not an offset: stable under concurrent inserts, unlike offset
// paging which can skip or repeat rows as new content lands mid-page
export function toPage<T extends { id: string }>(
    rows: T[],
    limit: number
): Page<T> {
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const last = items.at(-1)
    return {
        items,
        nextCursor: hasMore && last ? last.id : null,
    }
}
