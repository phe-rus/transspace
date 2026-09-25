// mirrors the server-side allowlist in domains/guides/content-safety.ts
// (spec 0004 AC-10); a videoUrl reaching this function already passed
// that check at submission, this only reshapes a validated watch URL
// into its embeddable form, never builds an iframe src from raw input
export function toEmbedUrl(url: string | null | undefined): string | null {
    if (!url) return null
    let parsed: URL
    try {
        parsed = new URL(url)
    } catch {
        return null
    }

    if (parsed.hostname === "youtu.be") {
        return `https://www.youtube.com/embed${parsed.pathname}`
    }
    if (parsed.hostname === "youtube.com" || parsed.hostname === "www.youtube.com") {
        const id = parsed.searchParams.get("v")
        return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (parsed.hostname === "vimeo.com") {
        return `https://player.vimeo.com/video${parsed.pathname}`
    }
    return null
}
