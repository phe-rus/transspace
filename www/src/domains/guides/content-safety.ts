export type TiptapNode = {
    type?: string
    attrs?: Record<string, unknown>
    marks?: { type?: string; attrs?: Record<string, unknown> }[]
    text?: string
    content?: TiptapNode[]
}

const MAX_BODY_CONTENT_BYTES = 256 * 1024
// Han, Hiragana/Katakana, Hangul: scripts with no inter-word spaces,
// where a plain whitespace split would badly undercount word count
// (spec 0004 Value sourcing)
const CJK_RANGE = /[一-鿿぀-ヿ가-힯]/gu
const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function walk(node: TiptapNode, visit: (n: TiptapNode) => void): void {
    visit(node)
    if (node.content) {
        for (const child of node.content) walk(child, visit)
    }
}

// spec 0004 AC-9: every image node's src must point at this app's own
// upload path; a data: URI or third party URL is rejected outright,
// since an unrestricted src could beacon a reader's IP to an outside
// host on render, or smuggle arbitrarily large data straight past the
// upload module's own size/quota guarantees (a data: URI never goes
// through that endpoint at all)
function assertSafeImageSrc(src: unknown): void {
    if (typeof src !== "string" || !src.startsWith("/api/uploads/")) {
        throw new Response(
            "Image src must be an uploaded file from this app",
            { status: 422 }
        )
    }
}

// spec 0004 AC-3, AC-9: one pass over the content validates every
// image node's src and computes wordCount and hasLink (for
// referencesAvailable) together, so a malicious body is rejected
// before any derived value is trusted
export function analyzeBodyContent(content: unknown): {
    wordCount: number
    hasLink: boolean
} {
    const serialized = JSON.stringify(content ?? {})
    if (serialized.length > MAX_BODY_CONTENT_BYTES) {
        throw new Response("Guide body is too large", {
            status: 422,
        })
    }
    if (typeof content !== "object" || content === null) {
        throw new Response("Invalid guide body", { status: 422 })
    }

    let words = 0
    let hasLink = false

    walk(content as TiptapNode, (node) => {
        if (node.type === "image") {
            assertSafeImageSrc(node.attrs?.src)
        }
        if (node.marks?.some((mark) => mark.type === "link")) {
            hasLink = true
        }
        if (typeof node.text === "string" && node.text.length > 0) {
            const cjkCount = node.text.match(CJK_RANGE)?.length ?? 0
            // strip CJK codepoints before the whitespace split so
            // they aren't double counted, then add them back as a
            // rough per-character reading-speed proxy
            const nonCjkText = node.text.replace(CJK_RANGE, " ")
            const whitespaceWords = nonCjkText
                .trim()
                .split(/\s+/)
                .filter(Boolean).length
            words += whitespaceWords + Math.ceil(cjkCount / 2)
        }
    })

    return { wordCount: words, hasLink }
}

// spec 0004 Value sourcing: Math.max(1, Math.ceil(wordCount / 200))
export function computeReadTime(wordCount: number): number {
    return Math.max(1, Math.ceil(wordCount / 200))
}

// spec 0004 AC-9: the cap applies to the raw submitted count (never
// silently truncated), only then de-duplicated and format-checked
export function assertValidRelatedResourceIds(
    ids: string[] | undefined
): string[] {
    if (!ids || ids.length === 0) return []
    if (ids.length > 10) {
        throw new Response(
            "Too many related resources (max 10)",
            { status: 422 }
        )
    }
    const deduped = Array.from(new Set(ids))
    for (const id of deduped) {
        if (!UUID_RE.test(id)) {
            throw new Response(
                "Invalid related resource id",
                { status: 422 }
            )
        }
    }
    return deduped
}
