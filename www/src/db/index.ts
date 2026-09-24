import { drizzle } from "drizzle-orm/d1"
import { env } from "cloudflare:workers"
import { authRelations } from "@/schemas/auth"

export const db = drizzle(env.D1, {
    relations: {
        ...authRelations
    }
})
