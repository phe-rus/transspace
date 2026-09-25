import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { SessionMiddleware } from "@/middleware/require-session"
import { isModerator } from "@/lib/moderators"
import { logModerationAction } from "@/lib/moderation-audit"
import {
    assertReadRateLimit,
    assertWriteRateLimit,
} from "@/lib/rate-limit"
import { assertTurnstileVerified } from "@/lib/turnstile"
import {
    ALLOWED_TYPES,
    MAX_FILE_BYTES,
    MAX_USER_QUOTA_BYTES,
    assertValidContentId,
    assertValidUploadCategory,
    fileKey,
    getUsageBytes,
    listAllObjects,
    sanitizeSvg,
    sniffExtension,
} from "@/lib/uploads"
import { deleteUploadsSchema, listUploadsSchema } from "./types"

// exported for reuse by any other domain that writes to R2 under a
// caller's own storage prefix (e.g. guides' in-editor image upload,
// spec 0004), so the lookup and its 404 aren't duplicated per domain
export async function getStoragePrefix(
    userLinkId: string
): Promise<string> {
    const [row] = await db
        .select({ storagePrefix: userLink.storagePrefix })
        .from(userLink)
        .where(eq(userLink.id, userLinkId))
    if (!row) {
        throw new Response("Account not found", {
            status: 404,
        })
    }
    return row.storagePrefix
}

// self service by default, scoped to the caller's own storage_prefix; a
// moderator may act on another person's files only with an explicit
// target, never implicitly (spec 0002 Security model)
export const uploadFile = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator((data: unknown) => {
        if (!(data instanceof FormData)) {
            throw new Response(
                "Expected multipart/form-data",
                { status: 400 }
            )
        }
        return data
    })
    .handler(async ({ data, context: { userLinkId } }) => {
        await assertWriteRateLimit(userLinkId)
        const turnstileToken = data.get("turnstileToken")
        await assertTurnstileVerified(
            typeof turnstileToken === "string"
                ? turnstileToken
                : undefined
        )

        const file = data.get("file")
        if (!(file instanceof File)) {
            throw new Response("Missing file", {
                status: 400,
            })
        }
        // one level of real nesting under storagePrefix: which
        // feature, then which record (spec 0002 follow-up, the
        // engineer's explicit call, 2026-09-25). Nothing calls this
        // general endpoint from the built UI yet, so both are
        // required from every caller rather than defaulted
        const category = data.get("category")
        if (typeof category !== "string") {
            throw new Response("Missing category", { status: 400 })
        }
        assertValidUploadCategory(category)
        const contentId = data.get("contentId")
        if (typeof contentId !== "string") {
            throw new Response("Missing contentId", { status: 400 })
        }
        assertValidContentId(contentId)
        if (file.size > MAX_FILE_BYTES) {
            throw new Response(
                "File exceeds the 10 MB limit",
                { status: 413 }
            )
        }

        const bytes = new Uint8Array(
            await file.arrayBuffer()
        )
        const ext = sniffExtension(bytes)
        if (!ext) {
            throw new Response("Disallowed file type", {
                status: 422,
            })
        }

        const storagePrefix = await getStoragePrefix(
            userLinkId
        )
        const usage = await getUsageBytes(
            env.R2,
            storagePrefix
        )
        if (usage + file.size > MAX_USER_QUOTA_BYTES) {
            throw new Response("Over storage quota", {
                status: 413,
            })
        }

        const body: BodyInit =
            ext === "svg"
                ? await sanitizeSvg(
                      new TextDecoder().decode(bytes)
                  )
                : bytes
        const key = fileKey(storagePrefix, category, contentId, file.name)
        await env.R2.put(key, body, {
            httpMetadata: { contentType: ALLOWED_TYPES[ext] },
        })

        return { key, url: `/api/uploads/${key}` }
    })

export const listUploads = createServerFn({ method: "GET" })
    .middleware([SessionMiddleware])
    .validator(listUploadsSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        await assertReadRateLimit(userLinkId)

        let storagePrefix: string
        if (
            data.targetUserLinkId &&
            data.targetUserLinkId !== userLinkId
        ) {
            if (!(await isModerator(userLinkId))) {
                throw new Response("Forbidden", {
                    status: 403,
                })
            }
            storagePrefix = await getStoragePrefix(
                data.targetUserLinkId
            )
            await logModerationAction({
                actorUserLinkId: userLinkId,
                action: "upload.list_other",
                target: data.targetUserLinkId,
            })
        } else {
            storagePrefix = await getStoragePrefix(
                userLinkId
            )
        }

        const objects = await listAllObjects(
            env.R2,
            `${storagePrefix}/`
        )
        return {
            objects: objects.map((object) => ({
                key: object.key,
                size: object.size,
                uploadedAt: object.uploaded,
            })),
        }
    })

export const deleteUploads = createServerFn({
    method: "POST",
})
    .middleware([SessionMiddleware])
    .validator(deleteUploadsSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)

        const storagePrefix = await getStoragePrefix(
            userLinkId
        )
        const actingOnOthers = data.keys.some(
            (key) => !key.startsWith(`${storagePrefix}/`)
        )
        // 403 on a key outside the caller's own prefix for a non
        // moderator (spec 0002 API surface)
        if (
            actingOnOthers &&
            !(await isModerator(userLinkId))
        ) {
            throw new Response("Forbidden", {
                status: 403,
            })
        }

        for (const key of data.keys) {
            await env.R2.delete(key)
        }
        if (actingOnOthers) {
            await logModerationAction({
                actorUserLinkId: userLinkId,
                action: "upload.delete_other",
                target: data.keys.join(","),
            })
        }
        return { success: true as const }
    })
