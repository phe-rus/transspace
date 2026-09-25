import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { assertWriteRateLimit } from "@/lib/rate-limit"
import {
    ALLOWED_TYPES,
    MAX_FILE_BYTES,
    MAX_USER_QUOTA_BYTES,
    assertValidContentId,
    fileKey,
    getUsageBytes,
    sanitizeSvg,
    sniffExtension,
} from "@/lib/uploads"
import { getStoragePrefix } from "@/domains/uploads"

// deliberately not Turnstile-gated, unlike every other write in this
// codebase: a Turnstile token is single-use, but composing a guide
// means uploading several images before ever reaching a final submit;
// session + write rate limit + the existing per-account quota gate
// this instead (spec 0004 Security model)
export const uploadGuideImage = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator((data: unknown) => {
        if (!(data instanceof FormData)) {
            throw new Response("Expected multipart/form-data", {
                status: 400,
            })
        }
        return data
    })
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const file = data.get("file")
        if (!(file instanceof File)) {
            throw new Response("Missing file", { status: 400 })
        }
        // the guide's own id, generated client-side before the first
        // upload (the guide row itself doesn't exist yet at this
        // point, composing happens before submit) — see submit-guide's
        // draftGuideId and submitGuide accepting it as a client-
        // supplied primary key, spec 0004 AC-10 follow-up
        const contentId = data.get("contentId")
        if (typeof contentId !== "string") {
            throw new Response("Missing contentId", { status: 400 })
        }
        assertValidContentId(contentId)
        if (file.size > MAX_FILE_BYTES) {
            throw new Response("File exceeds the 10 MB limit", {
                status: 413,
            })
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        const ext = sniffExtension(bytes)
        if (!ext) {
            throw new Response("Disallowed file type", { status: 422 })
        }

        const storagePrefix = await getStoragePrefix(userLinkId)
        const usage = await getUsageBytes(env.R2, storagePrefix)
        if (usage + file.size > MAX_USER_QUOTA_BYTES) {
            throw new Response("Over storage quota", { status: 413 })
        }

        const body: BodyInit =
            ext === "svg"
                ? await sanitizeSvg(new TextDecoder().decode(bytes))
                : bytes
        const key = fileKey(storagePrefix, "guides", contentId, file.name)
        await env.R2.put(key, body, {
            httpMetadata: { contentType: ALLOWED_TYPES[ext] },
        })

        return { key, url: `/api/uploads/${key}` }
    })
