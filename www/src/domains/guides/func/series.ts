import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { sql } from "drizzle-orm"
import { db } from "@/db"
import { guideSeries } from "@/schemas/guides"
import { assertReadRateLimit } from "@/lib/rate-limit"
import { listGuideSeriesSchema } from "../types"
import { getClientKey } from "./shared"

export const listGuideSeries = createServerFn({ method: "GET" })
    .validator(listGuideSeriesSchema)
    .handler(async ({ data }) => {
        await assertReadRateLimit(getClientKey())

        const conditions = data.search
            ? sql`lower(${guideSeries.title}) LIKE ${`%${data.search.trim().toLowerCase()}%`}`
            : undefined

        const rows = await db
            .select({ id: guideSeries.id, title: guideSeries.title })
            .from(guideSeries)
            .where(conditions)
            .orderBy(guideSeries.title)
            .limit(50)

        return { items: rows }
    })

export const listGuideSeriesQueryOptions = (search?: string) =>
    queryOptions({
        queryKey: ["guide-series", search],
        queryFn: () => listGuideSeries({ data: { search } }),
    })
