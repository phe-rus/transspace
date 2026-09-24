import { db } from "@/db"
import { moderationAction } from "@/schemas/moderation"

// every moderator-only action (grant, revoke, acting on someone else's
// upload, and later the trust-signal actions in spec 0003) writes exactly
// one row here before it returns success (spec 0002 key invariants)
export async function logModerationAction(params: {
    actorUserLinkId: string
    action: string
    target?: string
}): Promise<void> {
    await db.insert(moderationAction).values({
        id: crypto.randomUUID(),
        actorUserLinkId: params.actorUserLinkId,
        action: params.action,
        target: params.target ?? null,
        createdAt: new Date(),
    })
}
