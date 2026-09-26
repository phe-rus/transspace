import { DurableObject } from "cloudflare:workers"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { isModerator } from "@/lib/moderators"
import { isEstablishedMember } from "@/lib/community-members"
import { logModerationAction } from "@/lib/moderation-audit"
import { parseIdList } from "@/lib/id-list"
import { insertReport } from "@/domains/messages/reports"
import {
    CHAT_MAX_LENGTH,
    CHAT_PER_MINUTE,
    DEFAULT_RETENTION_HOURS,
    REMOVED_CLOSE_CODE,
    SEAT_HOLD_MS,
    SEAT_OFFER_MS,
    VOICE_SEATS,
    VOICE_SIGNAL_MAX_BYTES,
    isRetentionHours,
    type ChatMessage,
    type ClientToRoom,
    type RetentionHours,
    type RoomErrorCode,
    type RoomToClient,
    type VoiceSignalData,
    type VoiceState,
    type LiveMode,
    CHAT_SLOWED_MS,
    EMPTY_LIVE_ENDS_MS,
    LIVE_FACES,
    type LiveSession,
} from "@/data/live-room"

// identity the worker route sets after reading the session itself (spec
// 0010 Value sourcing). A browser can never reach this object directly, and
// the route builds a fresh request, so these are never browser supplied
export const ROOM_USER_HEADER = "X-Room-User-Id"
export const ROOM_NAME_HEADER = "X-Room-User-Name"
export const ROOM_SLUG_HEADER = "X-Room-Slug"

// kept on each socket with serializeAttachment, so it survives the room
// sleeping between events (hibernation clears memory, not attachments)
type Attachment = {
    userLinkId: string
    displayName: string
    // people this person blocked, read at connect time and refreshed on
    // every reconnect (spec 0010 AC-16)
    blocked: string[]
}

type ChatRow = {
    seq: number
    id: string
    authorUserLinkId: string
    authorName: string
    body: string
    status: string
    createdAt: number
}

// a page that connects fresh sees this many recent messages; a page that
// reconnects gets everything it missed, up to the cap
const HISTORY_LATEST = 100
const HISTORY_CAP = 500
const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
// while people are here the room ticks every minute to report its live
// count; with no one here it still wakes hourly to delete expired chat
const LIVE_TICK_MS = MINUTE_MS
const IDLE_TICK_MS = HOUR_MS

// one per community, named by its slug (spec 0010 Decision): the live text
// chat now, voice signalling from slice 4. Everything that must outlive a
// single event is in SQLite storage and every deadline runs on the alarm
export class CommunityRoom extends DurableObject<Env> {
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env)
        ctx.blockConcurrencyWhile(async () => {
            const sql = this.ctx.storage.sql
            sql.exec(
                `CREATE TABLE IF NOT EXISTS chat (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT,
                    id TEXT NOT NULL UNIQUE,
                    authorUserLinkId TEXT NOT NULL,
                    authorName TEXT NOT NULL,
                    body TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'visible',
                    createdAt INTEGER NOT NULL
                )`
            )
            sql.exec(
                "CREATE INDEX IF NOT EXISTS chat_author_idx ON chat (authorUserLinkId, createdAt)"
            )
            sql.exec(
                "CREATE INDEX IF NOT EXISTS chat_createdAt_idx ON chat (createdAt)"
            )
            sql.exec(
                "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
            )
            // voice (spec 0010 AC-14, AC-15): seats, the hold after a drop
            // and the waiting line are stored, never only in memory, so a
            // room that sleeps wakes up with them intact. The host and the
            // current seat offer live in settings
            sql.exec(
                `CREATE TABLE IF NOT EXISTS voice_seat (
                    userLinkId TEXT PRIMARY KEY,
                    displayName TEXT NOT NULL,
                    joinedAt INTEGER NOT NULL,
                    heldUntil INTEGER,
                    muted INTEGER NOT NULL DEFAULT 0
                )`
            )
            sql.exec(
                `CREATE TABLE IF NOT EXISTS voice_waiting (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT,
                    userLinkId TEXT NOT NULL UNIQUE
                )`
            )
        })
        // keepalive pings are answered without waking the room
        ctx.setWebSocketAutoResponse(
            new WebSocketRequestResponsePair("ping", "pong")
        )
    }

    // ---- connecting

    async fetch(request: Request): Promise<Response> {
        const userLinkId = request.headers.get(ROOM_USER_HEADER)
        const encodedName = request.headers.get(ROOM_NAME_HEADER)
        const slug = request.headers.get(ROOM_SLUG_HEADER)
        if (
            !userLinkId ||
            !encodedName ||
            !slug ||
            request.headers.get("Upgrade")?.toLowerCase() !== "websocket"
        ) {
            return new Response("Forbidden", { status: 403 })
        }
        this.setSetting("slug", slug)
        this.addPending("pendingRequests", 1)
        this.deleteSetting("liveEmptySince")

        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair)
        this.ctx.acceptWebSocket(server, [userLinkId])
        server.serializeAttachment({
            userLinkId,
            displayName: decodeURIComponent(encodedName),
            blocked: await this.blockedOf(userLinkId),
        } satisfies Attachment)

        await this.reportLive()
        await this.scheduleTick(LIVE_TICK_MS)
        // the others see one more person; the new page gets its own copy
        // with its history
        this.broadcastSession()
        return new Response(null, { status: 101, webSocket: client })
    }

    async webSocketMessage(
        ws: WebSocket,
        raw: string | ArrayBuffer
    ): Promise<void> {
        let message: ClientToRoom
        try {
            if (typeof raw !== "string") throw new Error("binary")
            message = JSON.parse(raw) as ClientToRoom
        } catch {
            return this.fail(ws, "invalid")
        }
        const me = ws.deserializeAttachment() as Attachment

        switch (message.type) {
            case "chat.send":
                return this.sendChat(ws, me, message.body)
            case "chat.history":
                return this.sendHistory(ws, me, message.sinceId)
            case "chat.remove":
                return this.removeChat(ws, me, message.id)
            case "chat.report":
                return this.reportChat(ws, me, message.id)
            case "room.removePerson":
                return this.removePerson(ws, me, message.userLinkId)
            case "live.start":
                return this.startLive(ws, me)
            case "live.end":
                return this.endLiveBy(ws, me)
            case "voice.open":
                return this.openVoice(ws, me)
            case "voice.join":
                return this.joinVoice(ws, me)
            case "voice.leave":
                return this.leaveVoice(me)
            case "voice.signal":
                return this.relaySignal(ws, me, message.to, message.data)
            case "voice.mute":
                return this.muteVoice(ws, me, message.userLinkId, message.muted)
            case "voice.remove":
                return this.removeFromVoiceBy(ws, me, message.userLinkId)
            case "voice.end":
                return this.endVoiceBy(ws, me)
            default:
                return this.fail(ws, "invalid")
        }
    }

    async webSocketClose(
        ws: WebSocket,
        code: number,
        reason: string
    ): Promise<void> {
        try {
            ws.close(code, reason)
        } catch {
            // already closed from this side
        }
        await this.connectionGone(ws)
    }

    async webSocketError(ws: WebSocket): Promise<void> {
        await this.connectionGone(ws)
    }

    // the person's last connection here closed: a seat is held for 30
    // seconds (AC-15), a place in the waiting line is given up
    private async connectionGone(ws: WebSocket): Promise<void> {
        const people = await this.reportLive(ws)
        this.broadcastSession(ws)
        // a live everyone has left ends itself after a short grace period,
        // so a dropped connection alone does not wipe it
        if (people === 0 && this.liveOpen()) {
            const now = Date.now()
            this.setSetting("liveEmptySince", String(now))
            await this.scheduleAt(now + EMPTY_LIVE_ENDS_MS)
        }
        const { userLinkId } = ws.deserializeAttachment() as Attachment
        const stillHere = this.ctx
            .getWebSockets(userLinkId)
            .some((socket) => socket !== ws)
        if (stillHere) return

        const sql = this.ctx.storage.sql
        sql.exec("DELETE FROM voice_waiting WHERE userLinkId = ?", userLinkId)
        if (this.isSeated(userLinkId)) {
            const heldUntil = Date.now() + SEAT_HOLD_MS
            sql.exec(
                "UPDATE voice_seat SET heldUntil = ? WHERE userLinkId = ?",
                heldUntil,
                userLinkId
            )
            await this.scheduleAt(heldUntil)
        }
        this.broadcastVoice()
    }

    // ---- chat (spec 0010 AC-11)

    private async sendChat(
        ws: WebSocket,
        me: Attachment,
        rawBody: unknown
    ): Promise<void> {
        if (!this.liveOpen()) return this.fail(ws, "not_live")
        const body = typeof rawBody === "string" ? rawBody.trim() : ""
        if (!body || body.length > CHAT_MAX_LENGTH) {
            return this.fail(ws, "invalid")
        }
        const now = Date.now()
        // counted from the stored rows themselves, so the limit holds
        // across the room sleeping; removed messages still count
        const { sent } = this.ctx.storage.sql
            .exec<{ sent: number }>(
                "SELECT count(*) AS sent FROM chat WHERE authorUserLinkId = ? AND createdAt > ?",
                me.userLinkId,
                now - MINUTE_MS
            )
            .one()
        if (sent >= CHAT_PER_MINUTE) {
            return this.fail(ws, "rate_limited")
        }
        // near the free plan's daily limit: one message per 10 seconds
        if (this.liveMode() === "chatSlowed") {
            const { recent } = this.ctx.storage.sql
                .exec<{ recent: number }>(
                    "SELECT count(*) AS recent FROM chat WHERE authorUserLinkId = ? AND createdAt > ?",
                    me.userLinkId,
                    now - CHAT_SLOWED_MS
                )
                .one()
            if (recent > 0) return this.fail(ws, "chat_slowed")
        }
        this.addPending("pendingChat", 1)

        const row: ChatRow = {
            seq: 0,
            id: crypto.randomUUID(),
            authorUserLinkId: me.userLinkId,
            authorName: me.displayName,
            body,
            status: "visible",
            createdAt: now,
        }
        this.ctx.storage.sql.exec(
            "INSERT INTO chat (id, authorUserLinkId, authorName, body, createdAt) VALUES (?, ?, ?, ?, ?)",
            row.id,
            row.authorUserLinkId,
            row.authorName,
            row.body,
            row.createdAt
        )

        for (const socket of this.ctx.getWebSockets()) {
            const them = socket.deserializeAttachment() as Attachment
            if (them.blocked.includes(me.userLinkId)) continue
            this.send(socket, {
                type: "chat.message",
                message: toChatMessage(row, them.userLinkId),
            })
        }
    }

    // AC-13: a fresh page gets the latest messages; a page coming back
    // gets everything after the last message it saw, plus the removals
    private sendHistory(
        ws: WebSocket,
        me: Attachment,
        sinceId: unknown
    ): void {
        const sql = this.ctx.storage.sql
        const since =
            typeof sinceId === "string"
                ? sql
                      .exec<{ seq: number }>(
                          "SELECT seq FROM chat WHERE id = ?",
                          sinceId
                      )
                      .toArray()[0]
                : undefined
        const rows = since
            ? sql
                  .exec<ChatRow>(
                      "SELECT * FROM chat WHERE seq > ? AND status = 'visible' ORDER BY seq DESC LIMIT ?",
                      since.seq,
                      HISTORY_CAP
                  )
                  .toArray()
            : sql
                  .exec<ChatRow>(
                      "SELECT * FROM chat WHERE status = 'visible' ORDER BY seq DESC LIMIT ?",
                      HISTORY_LATEST
                  )
                  .toArray()
        const removedIds = sql
            .exec<{ id: string }>("SELECT id FROM chat WHERE status = 'removed'")
            .toArray()
            .map((row) => row.id)

        this.send(ws, {
            type: "chat.history",
            messages: rows
                .reverse()
                .filter((row) => !me.blocked.includes(row.authorUserLinkId))
                .map((row) => toChatMessage(row, me.userLinkId)),
            removedIds,
            retentionHours: this.retentionHours(),
        })
        this.send(ws, { type: "voice.state", state: this.voiceState(me.userLinkId) })
        this.send(ws, { type: "live.mode", mode: this.liveMode() })
        this.send(ws, { type: "live.session", session: this.liveSession() })
        this.addPending("pendingRequests", 1)
    }

    // ---- moderation in the room (spec 0010 AC-16)

    // roles are read from D1 at the moment of the action, never from
    // connect time, so a demoted moderator loses the power at once
    private async removeChat(
        ws: WebSocket,
        me: Attachment,
        id: unknown
    ): Promise<void> {
        if (typeof id !== "string") return this.fail(ws, "invalid")
        if (!(await isModerator(me.userLinkId))) {
            return this.fail(ws, "forbidden")
        }
        const found = this.ctx.storage.sql
            .exec("SELECT id FROM chat WHERE id = ?", id)
            .toArray()
        if (!found.length) return this.fail(ws, "not_found")

        this.ctx.storage.sql.exec(
            "UPDATE chat SET status = 'removed' WHERE id = ?",
            id
        )
        await logModerationAction({
            actorUserLinkId: me.userLinkId,
            action: "chat.remove",
            target: `${this.slug()}:${id}`,
        })
        this.broadcast({ type: "chat.removed", id })
    }

    // the report keeps a copy of the text, so moderators can still read it
    // after retention deletes the original
    private async reportChat(
        ws: WebSocket,
        me: Attachment,
        id: unknown
    ): Promise<void> {
        if (typeof id !== "string") return this.fail(ws, "invalid")
        const [row] = this.ctx.storage.sql
            .exec<ChatRow>(
                "SELECT * FROM chat WHERE id = ? AND status = 'visible'",
                id
            )
            .toArray()
        if (!row) return this.fail(ws, "not_found")
        if (row.authorUserLinkId === me.userLinkId) {
            return this.fail(ws, "invalid")
        }

        this.addPending("pendingRequests", 1)
        await insertReport({
            contentType: "chat",
            contentId: `${this.slug()}:${id}`,
            toUserLinkId: row.authorUserLinkId,
            authorUserLinkId: me.userLinkId,
            body: row.body,
        })
        this.send(ws, { type: "chat.reported", id })
    }

    // closes every connection the person has here; their page does not
    // reconnect on its own after this close code
    private async removePerson(
        ws: WebSocket,
        me: Attachment,
        userLinkId: unknown
    ): Promise<void> {
        if (typeof userLinkId !== "string") return this.fail(ws, "invalid")
        if (!(await isModerator(me.userLinkId))) {
            return this.fail(ws, "forbidden")
        }
        // the page is told in a message first, then closed: a close frame
        // alone does not always reach a person's other tabs (seen through
        // the dev proxy), and a page that is not told keeps showing "Live"
        for (const socket of this.ctx.getWebSockets(userLinkId)) {
            this.send(socket, { type: "room.removed" })
            socket.close(REMOVED_CLOSE_CODE, "removed")
        }
        await this.dropFromVoice(userLinkId)
        await logModerationAction({
            actorUserLinkId: me.userLinkId,
            action: "room.removePerson",
            target: `${this.slug()}:${userLinkId}`,
        })
        await this.reportLive()
    }

    // ---- starting and ending a live (engineer's call, 2026-09-26): a room
    // is closed until someone goes live. The same people who may open voice
    // may go live: established members, moderators and admins, read from
    // D1 at this moment. Voice and chat only work while it runs

    private async startLive(ws: WebSocket, me: Attachment): Promise<void> {
        if (this.liveOpen()) return this.fail(ws, "invalid")
        const allowed =
            (await isModerator(me.userLinkId)) ||
            (await isEstablishedMember(me.userLinkId))
        if (!allowed) return this.fail(ws, "live_not_allowed")

        this.setSetting("liveHost", me.userLinkId)
        this.setSetting("liveHostName", me.displayName)
        this.setSetting("liveStartedAt", String(Date.now()))
        this.deleteSetting("liveEmptySince")
        this.broadcastSession()
        await this.reportLive()
    }

    // the host ends their own live; a moderator ends any, and that is
    // logged like every moderator action
    private async endLiveBy(ws: WebSocket, me: Attachment): Promise<void> {
        if (!this.liveOpen()) return this.fail(ws, "not_live")
        const isHost = this.getSetting("liveHost") === me.userLinkId
        const moderator = !isHost && (await isModerator(me.userLinkId))
        if (!isHost && !moderator) return this.fail(ws, "forbidden")

        this.endLive()
        if (moderator) {
            await logModerationAction({
                actorUserLinkId: me.userLinkId,
                action: "live.end",
                target: this.slug(),
            })
        }
        await this.reportLive()
    }

    // ends voice, deletes the live's chat at once (reports keep their own
    // copy in D1) and tells everyone. Connections stay open, so people see
    // the next live start
    private endLive(): void {
        this.endVoice()
        this.ctx.storage.sql.exec("DELETE FROM chat")
        this.ctx.storage.sql.exec(
            "DELETE FROM settings WHERE key IN ('liveHost', 'liveHostName', 'liveStartedAt', 'liveEmptySince')"
        )
        this.broadcast({ type: "live.ended" })
        this.broadcastSession()
        this.broadcastVoice()
    }

    private liveOpen(): boolean {
        return this.getSetting("liveHost") !== null
    }

    private liveSession(closing?: WebSocket): LiveSession {
        const startedAt = Number(this.getSetting("liveStartedAt") ?? 0)
        const people = new Map<string, string>()
        for (const socket of this.ctx.getWebSockets()) {
            if (socket === closing) continue
            const them = socket.deserializeAttachment() as Attachment
            people.set(them.userLinkId, them.displayName)
        }
        return {
            open: this.liveOpen(),
            hostUserLinkId: this.getSetting("liveHost"),
            hostName: this.getSetting("liveHostName"),
            startedAt: startedAt || null,
            people: people.size,
            faces: [...people]
                .slice(0, LIVE_FACES)
                .map(([userLinkId, displayName]) => ({ userLinkId, displayName })),
        }
    }

    // everyone's count and faces change as people come and go
    private broadcastSession(closing?: WebSocket): void {
        const session = this.liveSession(closing)
        for (const socket of this.ctx.getWebSockets()) {
            if (socket !== closing) this.send(socket, { type: "live.session", session })
        }
    }

    private deleteSetting(key: string): void {
        this.ctx.storage.sql.exec("DELETE FROM settings WHERE key = ?", key)
    }

    // ---- voice (spec 0010 AC-14 to AC-16): a relayed mesh of up to 6
    // people. The room only keeps seats and passes WebRTC signals between
    // seated people; audio never touches it and nothing is recorded

    // asked by getTurnCredentials over RPC: only a seated person gets
    // relay credentials (spec 0010 Value sourcing)
    hasSeat(userLinkId: string): boolean {
        return this.isSeated(userLinkId)
    }

    // an established member opens voice and becomes its host (AC-14).
    // Moderators and admins may open one without that rule (engineer's
    // call, 2026-09-26; isModerator counts admins too). Both read from D1
    // at this moment. If voice is already open this just joins
    private async openVoice(ws: WebSocket, me: Attachment): Promise<void> {
        if (!this.liveOpen()) return this.fail(ws, "not_live")
        if (this.voiceOpen()) return this.joinVoice(ws, me)
        // near the free plan's daily limit, new voice rooms pause first
        if (this.liveMode() !== "normal") return this.fail(ws, "voice_paused")
        const allowed =
            (await isModerator(me.userLinkId)) ||
            (await isEstablishedMember(me.userLinkId))
        if (!allowed) {
            return this.fail(ws, "voice_not_allowed")
        }
        this.setSetting("voiceHost", me.userLinkId)
        this.seat(me)
        this.broadcastVoice()
    }

    // a free seat is taken at once; a full room puts the person in line
    // (AC-15). A seat already held for them after a drop is taken back
    private async joinVoice(ws: WebSocket, me: Attachment): Promise<void> {
        if (!this.voiceOpen()) return this.fail(ws, "voice_closed")
        const sql = this.ctx.storage.sql

        if (this.isSeated(me.userLinkId)) {
            sql.exec(
                "UPDATE voice_seat SET heldUntil = NULL WHERE userLinkId = ?",
                me.userLinkId
            )
        } else {
            const offer = this.voiceOffer()
            const inLine = this.waitingIds()
            if (offer?.userLinkId === me.userLinkId) {
                this.clearOffer()
                this.seat(me)
            } else if (
                this.freeSeats() > 0 &&
                inLine.filter((id) => id !== me.userLinkId).length === 0
            ) {
                this.seat(me)
            } else {
                sql.exec(
                    "INSERT OR IGNORE INTO voice_waiting (userLinkId) VALUES (?)",
                    me.userLinkId
                )
            }
        }
        await this.offerNextSeat()
        this.broadcastVoice()
    }

    private async leaveVoice(me: Attachment): Promise<void> {
        await this.dropFromVoice(me.userLinkId)
    }

    // offers, answers and ICE candidates between two seated people only
    private relaySignal(
        ws: WebSocket,
        me: Attachment,
        to: unknown,
        data: unknown
    ): void {
        if (
            typeof to !== "string" ||
            typeof data !== "object" ||
            data === null ||
            JSON.stringify(data).length > VOICE_SIGNAL_MAX_BYTES
        ) {
            return this.fail(ws, "invalid")
        }
        if (!this.isSeated(me.userLinkId) || !this.isSeated(to)) {
            return this.fail(ws, "forbidden")
        }
        for (const socket of this.ctx.getWebSockets(to)) {
            this.send(socket, {
                type: "voice.signal",
                from: me.userLinkId,
                data: data as VoiceSignalData,
            })
        }
    }

    // anyone mutes or unmutes themselves; the host can mute others (AC-16).
    // Every page silences a muted seat's audio, so it holds even if the
    // muted person's own page ignores it
    private muteVoice(
        ws: WebSocket,
        me: Attachment,
        userLinkId: unknown,
        muted: unknown
    ): void {
        if (typeof userLinkId !== "string" || typeof muted !== "boolean") {
            return this.fail(ws, "invalid")
        }
        const isSelf = userLinkId === me.userLinkId
        const isHost = this.getSetting("voiceHost") === me.userLinkId
        if (!isSelf && !(isHost && muted)) return this.fail(ws, "forbidden")
        if (!this.isSeated(userLinkId)) return this.fail(ws, "not_found")

        this.ctx.storage.sql.exec(
            "UPDATE voice_seat SET muted = ? WHERE userLinkId = ?",
            muted ? 1 : 0,
            userLinkId
        )
        this.broadcastVoice()
    }

    // the host removes people from their own voice room; a moderator
    // (read from D1 now) from any. Removal from voice keeps the chat
    private async removeFromVoiceBy(
        ws: WebSocket,
        me: Attachment,
        userLinkId: unknown
    ): Promise<void> {
        if (typeof userLinkId !== "string" || userLinkId === me.userLinkId) {
            return this.fail(ws, "invalid")
        }
        const isHost = this.getSetting("voiceHost") === me.userLinkId
        const moderator = !isHost && (await isModerator(me.userLinkId))
        if (!isHost && !moderator) return this.fail(ws, "forbidden")

        for (const socket of this.ctx.getWebSockets(userLinkId)) {
            this.send(socket, { type: "voice.removed" })
        }
        await this.dropFromVoice(userLinkId)
        if (moderator) {
            await logModerationAction({
                actorUserLinkId: me.userLinkId,
                action: "voice.remove",
                target: `${this.slug()}:${userLinkId}`,
            })
        }
    }

    private async endVoiceBy(ws: WebSocket, me: Attachment): Promise<void> {
        if (!this.voiceOpen()) return this.fail(ws, "voice_closed")
        if (!(await isModerator(me.userLinkId))) {
            return this.fail(ws, "forbidden")
        }
        this.endVoice()
        await logModerationAction({
            actorUserLinkId: me.userLinkId,
            action: "voice.end",
            target: this.slug(),
        })
        this.broadcastVoice()
    }

    // takes a person out of voice entirely: their seat, their place in
    // line and any offer. A leaving host hands over to whoever has been
    // seated longest; an empty voice room ends
    private async dropFromVoice(userLinkId: string): Promise<void> {
        const sql = this.ctx.storage.sql
        sql.exec("DELETE FROM voice_seat WHERE userLinkId = ?", userLinkId)
        sql.exec("DELETE FROM voice_waiting WHERE userLinkId = ?", userLinkId)
        if (this.voiceOffer()?.userLinkId === userLinkId) this.clearOffer()

        if (this.getSetting("voiceHost") === userLinkId) {
            const [next] = sql
                .exec<{ userLinkId: string }>(
                    "SELECT userLinkId FROM voice_seat ORDER BY joinedAt LIMIT 1"
                )
                .toArray()
            if (next) this.setSetting("voiceHost", next.userLinkId)
        }
        if (this.seatCount() === 0) {
            this.endVoice()
        } else {
            await this.offerNextSeat()
        }
        this.broadcastVoice()
    }

    // a free seat goes to the first person in line, who has 20 seconds to
    // take it before it passes on (AC-15). One offer at a time
    private async offerNextSeat(): Promise<void> {
        if (!this.voiceOpen() || this.voiceOffer() || this.freeSeats() <= 0) {
            return
        }
        const sql = this.ctx.storage.sql
        const [first] = sql
            .exec<{ userLinkId: string }>(
                "SELECT userLinkId FROM voice_waiting ORDER BY seq LIMIT 1"
            )
            .toArray()
        if (!first) return

        sql.exec("DELETE FROM voice_waiting WHERE userLinkId = ?", first.userLinkId)
        const expiresAt = Date.now() + SEAT_OFFER_MS
        this.setSetting("voiceOfferUser", first.userLinkId)
        this.setSetting("voiceOfferExpiresAt", String(expiresAt))
        for (const socket of this.ctx.getWebSockets(first.userLinkId)) {
            this.send(socket, { type: "voice.seatFree", expiresAt })
        }
        await this.scheduleAt(expiresAt)
    }

    // run by the alarm: held seats that ran out are given up, an offer
    // nobody took passes to the next person
    private async expireVoiceDeadlines(now: number): Promise<void> {
        const sql = this.ctx.storage.sql
        const expired = sql
            .exec<{ userLinkId: string }>(
                "SELECT userLinkId FROM voice_seat WHERE heldUntil IS NOT NULL AND heldUntil <= ?",
                now
            )
            .toArray()
        for (const { userLinkId } of expired) {
            await this.dropFromVoice(userLinkId)
        }

        const offer = this.voiceOffer()
        if (offer && offer.expiresAt <= now) {
            this.clearOffer()
            await this.offerNextSeat()
            this.broadcastVoice()
        }
    }

    private voiceDeadlines(): number[] {
        const [held] = this.ctx.storage.sql
            .exec<{ due: number | null }>(
                "SELECT min(heldUntil) AS due FROM voice_seat"
            )
            .toArray()
        const offer = this.voiceOffer()
        return [held?.due ?? null, offer?.expiresAt ?? null].filter(
            (time): time is number => time !== null
        )
    }

    // everyone takes a seat muted and unmutes themselves (engineer's call,
    // 2026-09-26)
    private seat(me: Attachment): void {
        this.ctx.storage.sql.exec(
            "INSERT OR IGNORE INTO voice_seat (userLinkId, displayName, joinedAt, muted) VALUES (?, ?, ?, 1)",
            me.userLinkId,
            me.displayName,
            Date.now()
        )
        this.ctx.storage.sql.exec(
            "DELETE FROM voice_waiting WHERE userLinkId = ?",
            me.userLinkId
        )
    }

    private endVoice(): void {
        const sql = this.ctx.storage.sql
        sql.exec("DELETE FROM voice_seat")
        sql.exec("DELETE FROM voice_waiting")
        sql.exec(
            "DELETE FROM settings WHERE key IN ('voiceHost', 'voiceOfferUser', 'voiceOfferExpiresAt')"
        )
    }

    private voiceOpen(): boolean {
        return this.getSetting("voiceHost") !== null
    }

    private isSeated(userLinkId: string): boolean {
        return (
            this.ctx.storage.sql
                .exec("SELECT 1 FROM voice_seat WHERE userLinkId = ?", userLinkId)
                .toArray().length > 0
        )
    }

    private seatCount(): number {
        return this.ctx.storage.sql
            .exec<{ seats: number }>("SELECT count(*) AS seats FROM voice_seat")
            .one().seats
    }

    // a seat offered to someone is not free for anyone else
    private freeSeats(): number {
        return VOICE_SEATS - this.seatCount() - (this.voiceOffer() ? 1 : 0)
    }

    private waitingIds(): string[] {
        return this.ctx.storage.sql
            .exec<{ userLinkId: string }>(
                "SELECT userLinkId FROM voice_waiting ORDER BY seq"
            )
            .toArray()
            .map((row) => row.userLinkId)
    }

    private voiceOffer(): { userLinkId: string; expiresAt: number } | null {
        const userLinkId = this.getSetting("voiceOfferUser")
        const expiresAt = Number(this.getSetting("voiceOfferExpiresAt"))
        return userLinkId && expiresAt ? { userLinkId, expiresAt } : null
    }

    private clearOffer(): void {
        this.ctx.storage.sql.exec(
            "DELETE FROM settings WHERE key IN ('voiceOfferUser', 'voiceOfferExpiresAt')"
        )
    }

    private voiceState(viewer: string): VoiceState {
        const seats = this.ctx.storage.sql
            .exec<{
                userLinkId: string
                displayName: string
                heldUntil: number | null
                muted: number
            }>(
                "SELECT userLinkId, displayName, heldUntil, muted FROM voice_seat ORDER BY joinedAt"
            )
            .toArray()
        return {
            open: this.voiceOpen(),
            hostUserLinkId: this.getSetting("voiceHost"),
            seats: seats.map((seat) => ({
                userLinkId: seat.userLinkId,
                displayName: seat.displayName,
                muted: seat.muted === 1,
                held: seat.heldUntil !== null,
            })),
            waiting: this.waitingIds(),
            offer: this.voiceOffer(),
            you: viewer,
        }
    }

    private broadcastVoice(): void {
        for (const socket of this.ctx.getWebSockets()) {
            const them = socket.deserializeAttachment() as Attachment
            this.send(socket, {
                type: "voice.state",
                state: this.voiceState(them.userLinkId),
            })
        }
    }

    // ---- retention (spec 0010 AC-12), set by setRoomRetention over RPC

    async setRetention(hours: number): Promise<RetentionHours> {
        if (!isRetentionHours(hours)) {
            throw new Error("Unknown retention period")
        }
        this.setSetting("retentionHours", String(hours))
        this.deleteExpired(Date.now())
        this.broadcast({ type: "room.retention", retentionHours: hours })
        await this.scheduleTick(IDLE_TICK_MS)
        return hours
    }

    getRetention(): RetentionHours {
        return this.retentionHours()
    }

    // one alarm serves every deadline: the live count tick, chat
    // retention, expired seat holds and an expired seat offer
    async alarm(): Promise<void> {
        const now = Date.now()
        this.deleteExpired(now)
        await this.expireVoiceDeadlines(now)
        const emptySince = Number(this.getSetting("liveEmptySince") ?? 0)
        if (
            emptySince &&
            now - emptySince >= EMPTY_LIVE_ENDS_MS &&
            this.livePeople() === 0
        ) {
            this.endLive()
        }
        const people = await this.reportLive()

        const due = [
            people > 0 ? now + LIVE_TICK_MS : null,
            this.hasChat() ? now + IDLE_TICK_MS : null,
            ...this.voiceDeadlines(),
        ].filter((time): time is number => time !== null)
        if (due.length) {
            await this.ctx.storage.setAlarm(Math.max(Math.min(...due), now + 1000))
        }
    }

    // deleted, not hidden: nothing older than the period stays in storage
    private deleteExpired(now: number): void {
        this.ctx.storage.sql.exec(
            "DELETE FROM chat WHERE createdAt < ?",
            now - this.retentionHours() * HOUR_MS
        )
    }

    // ---- helpers

    private retentionHours(): RetentionHours {
        const value = Number(this.getSetting("retentionHours"))
        return isRetentionHours(value) ? value : DEFAULT_RETENTION_HOURS
    }

    private slug(): string {
        return this.getSetting("slug") ?? ""
    }

    private getSetting(key: string): string | null {
        const [row] = this.ctx.storage.sql
            .exec<{ value: string }>(
                "SELECT value FROM settings WHERE key = ?",
                key
            )
            .toArray()
        return row?.value ?? null
    }

    private setSetting(key: string, value: string): void {
        this.ctx.storage.sql.exec(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            key,
            value
        )
    }

    private hasChat(): boolean {
        return this.ctx.storage.sql.exec("SELECT 1 FROM chat LIMIT 1").toArray()
            .length > 0
    }

    // an earlier alarm wins; the room never pushes its next tick further out
    private async scheduleTick(inMs: number): Promise<void> {
        await this.scheduleAt(Date.now() + inMs)
    }

    private async scheduleAt(due: number): Promise<void> {
        const current = await this.ctx.storage.getAlarm()
        if (current === null || current > due) {
            await this.ctx.storage.setAlarm(due)
        }
    }

    private async blockedOf(userLinkId: string): Promise<string[]> {
        const [row] = await db
            .select({ blockedUserIds: userLink.blockedUserIds })
            .from(userLink)
            .where(eq(userLink.id, userLinkId))
        return parseIdList(row?.blockedUserIds)
    }

    // distinct people with an open connection, leaving out one that is
    // closing right now
    private livePeople(closing?: WebSocket): number {
        const people = new Set<string>()
        for (const socket of this.ctx.getWebSockets()) {
            if (socket === closing) continue
            people.add((socket.deserializeAttachment() as Attachment).userLinkId)
        }
        return people.size
    }

    // reports the live count and what the room used since the last report,
    // and takes back the day's mode (AC-18). Usage waits in storage until
    // a report succeeds, so a failed one loses nothing
    private async reportLive(closing?: WebSocket): Promise<number> {
        const people = this.livePeople(closing)
        const slug = this.slug()
        if (!slug) return people

        const now = Date.now()
        this.accrueVoice(now)
        const usage = {
            chatMessages: Number(this.getSetting("pendingChat") ?? 0),
            voiceSeconds: Number(this.getSetting("pendingVoice") ?? 0),
            roomRequests: Number(this.getSetting("pendingRequests") ?? 0),
        }
        const hub = this.env.LIVE_HUB.get(this.env.LIVE_HUB.idFromName("global"))
        // "live now" means a running live, not people waiting in a closed room
        const mode = await hub.report(slug, this.liveOpen() ? people : 0, usage)
        this.ctx.storage.sql.exec(
            "DELETE FROM settings WHERE key IN ('pendingChat', 'pendingVoice', 'pendingRequests')"
        )
        if (mode !== this.liveMode()) {
            this.setSetting("liveMode", mode)
            this.broadcast({ type: "live.mode", mode })
        }
        return people
    }

    // relayed voice since the last report, as full room seconds: n people
    // make n * (n - 1) streams, and a full room of 6 makes 30
    private accrueVoice(now: number): void {
        const last = Number(this.getSetting("voiceAccruedAt") ?? 0)
        this.setSetting("voiceAccruedAt", String(now))
        if (!last) return
        const [row] = this.ctx.storage.sql
            .exec<{ seated: number }>(
                "SELECT count(*) AS seated FROM voice_seat WHERE heldUntil IS NULL"
            )
            .toArray()
        const seated = row?.seated ?? 0
        if (seated < 2) return
        // a room that slept with nobody talking accrues nothing past a tick
        const seconds = Math.min(now - last, 2 * LIVE_TICK_MS) / 1000
        this.addPending("pendingVoice", (seconds * seated * (seated - 1)) / 30)
    }

    private addPending(key: string, amount: number): void {
        this.setSetting(key, String(Number(this.getSetting(key) ?? 0) + amount))
    }

    private liveMode(): LiveMode {
        const mode = this.getSetting("liveMode")
        return mode === "voicePaused" || mode === "chatSlowed" ? mode : "normal"
    }

    private send(ws: WebSocket, message: RoomToClient): void {
        try {
            ws.send(JSON.stringify(message))
        } catch {
            // the socket closed between reading the list and sending
        }
    }

    private broadcast(message: RoomToClient): void {
        for (const socket of this.ctx.getWebSockets()) {
            this.send(socket, message)
        }
    }

    private fail(ws: WebSocket, code: RoomErrorCode): void {
        this.send(ws, { type: "error", code })
    }
}

function toChatMessage(row: ChatRow, viewerUserLinkId: string): ChatMessage {
    return {
        id: row.id,
        authorUserLinkId: row.authorUserLinkId,
        authorName: row.authorName,
        body: row.body,
        createdAt: row.createdAt,
        mine: row.authorUserLinkId === viewerUserLinkId,
    }
}
