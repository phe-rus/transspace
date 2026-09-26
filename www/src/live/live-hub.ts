import { DurableObject } from "cloudflare:workers"
import type { LiveMode } from "@/data/live-room"

// a room that stopped reporting (evicted, crashed) must not look live
// forever; rooms with people report every minute
const STALE_AFTER_MS = 2 * 60 * 1000
// daily rows older than this are pruned
const KEEP_DAYS = 7

export type LiveUsage = {
    chatMessages: number
    // full room equivalent seconds: a second with n people in voice counts
    // n * (n - 1) / 30, since relayed traffic grows with the number of
    // streams and a full room of 6 carries 30 (spec 0010 Configuration)
    voiceSeconds: number
    roomRequests: number
}

function utcDay(now = Date.now()): string {
    return new Date(now).toISOString().slice(0, 10)
}

// the single `global` instance every community room reports to (spec 0010
// data model): the per community live count, and the daily free plan
// counters that set the live mode (AC-18). A new UTC day starts at zero,
// so the mode returns to normal on its own
export class LiveHub extends DurableObject<Env> {
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env)
        ctx.blockConcurrencyWhile(async () => {
            this.ctx.storage.sql.exec(
                `CREATE TABLE IF NOT EXISTS live (
                    slug TEXT PRIMARY KEY,
                    liveCount INTEGER NOT NULL,
                    updatedAt INTEGER NOT NULL
                )`
            )
            this.ctx.storage.sql.exec(
                `CREATE TABLE IF NOT EXISTS daily (
                    day TEXT PRIMARY KEY,
                    chatMessages INTEGER NOT NULL DEFAULT 0,
                    voiceSeconds REAL NOT NULL DEFAULT 0,
                    roomRequests INTEGER NOT NULL DEFAULT 0
                )`
            )
        })
    }

    // a room's report, every minute while people are in it and on every
    // connect and close. Answers with the current mode
    report(slug: string, liveCount: number, usage: LiveUsage): LiveMode {
        const now = Date.now()
        const sql = this.ctx.storage.sql
        sql.exec(
            `INSERT INTO live (slug, liveCount, updatedAt) VALUES (?, ?, ?)
             ON CONFLICT(slug) DO UPDATE SET liveCount = excluded.liveCount, updatedAt = excluded.updatedAt`,
            slug,
            liveCount,
            now
        )
        const day = utcDay(now)
        sql.exec(
            `INSERT INTO daily (day, chatMessages, voiceSeconds, roomRequests) VALUES (?, ?, ?, ?)
             ON CONFLICT(day) DO UPDATE SET
                chatMessages = chatMessages + excluded.chatMessages,
                voiceSeconds = voiceSeconds + excluded.voiceSeconds,
                roomRequests = roomRequests + excluded.roomRequests`,
            day,
            usage.chatMessages,
            usage.voiceSeconds,
            usage.roomRequests
        )
        sql.exec(
            "DELETE FROM daily WHERE day < ?",
            utcDay(now - KEEP_DAYS * 24 * 60 * 60 * 1000)
        )
        return this.mode()
    }

    // one call for every community (spec 0010 Value sourcing)
    liveCounts(): Record<string, number> {
        const cutoff = Date.now() - STALE_AFTER_MS
        const counts: Record<string, number> = {}
        for (const row of this.ctx.storage.sql.exec<{
            slug: string
            liveCount: number
            updatedAt: number
        }>("SELECT slug, liveCount, updatedAt FROM live")) {
            counts[row.slug] = row.updatedAt >= cutoff ? row.liveCount : 0
        }
        return counts
    }

    // today's highest share of any one daily limit, compared with the two
    // thresholds (spec 0010 Value sourcing)
    mode(): LiveMode {
        const [today] = this.ctx.storage.sql
            .exec<LiveUsage>(
                "SELECT chatMessages, voiceSeconds, roomRequests FROM daily WHERE day = ?",
                utcDay()
            )
            .toArray()
        if (!today) return "normal"

        const share = (used: number, limit: string) => {
            const max = Number(limit)
            return max > 0 ? (used / max) * 100 : 0
        }
        const percent = Math.max(
            share(today.chatMessages, this.env.LIVE_CHAT_MESSAGES_DAILY_LIMIT),
            share(today.voiceSeconds, this.env.LIVE_VOICE_SECONDS_DAILY_LIMIT),
            share(today.roomRequests, this.env.LIVE_ROOM_REQUESTS_DAILY_LIMIT)
        )
        if (percent >= Number(this.env.LIVE_CHAT_SLOW_AT)) return "chatSlowed"
        if (percent >= Number(this.env.LIVE_VOICE_PAUSE_AT)) return "voicePaused"
        return "normal"
    }
}
