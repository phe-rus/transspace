import { drizzle } from "drizzle-orm/d1"
import { env } from "cloudflare:workers"

// no `relations` config: nothing here uses the relational query API
// (db.query.*), only the plain select/insert/update/delete builder, which
// needs no schema object passed in at all
export const db = drizzle(env.D1)
