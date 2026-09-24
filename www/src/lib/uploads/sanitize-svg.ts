// Workers' own HTMLRewriter (native, zero bundle cost) instead of an npm
// sanitizer — allowlist-only: anything not explicitly listed here (script
// tags, event-handler attributes, style, href/xlink:href) is stripped.
// Mirrors shared/assets' own sanitizer in ~/projects/infra, since this is
// a generic SVG allowlist, not Transspace-specific policy.
const CANONICAL_TAGS: Record<string, string> = {
    svg: "svg",
    g: "g",
    path: "path",
    circle: "circle",
    rect: "rect",
    line: "line",
    polygon: "polygon",
    polyline: "polyline",
    ellipse: "ellipse",
    defs: "defs",
    title: "title",
    desc: "desc",
    lineargradient: "linearGradient",
    radialgradient: "radialGradient",
    stop: "stop",
    clippath: "clipPath",
    mask: "mask",
    text: "text",
    tspan: "tspan",
}

const ALLOWED_ATTRIBUTES = new Set([
    "id",
    "class",
    "d",
    "fill",
    "fill-rule",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "viewbox",
    "xmlns",
    "width",
    "height",
    "x",
    "y",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "x1",
    "y1",
    "x2",
    "y2",
    "points",
    "transform",
    "offset",
    "stop-color",
    "stop-opacity",
    "opacity",
    "gradientunits",
    "clip-path",
    "mask",
])

// HTMLRewriter always serializes attribute names lowercase; these two
// need their SVG casing restored or the markup won't render
const ATTRIBUTE_CASING_FIXUPS: [RegExp, string][] = [
    [/\bviewbox=/g, "viewBox="],
    [/\bgradientunits=/g, "gradientUnits="],
]

type RewriterElement = {
    tagName: string
    attributes: Iterable<[string, string]>
    removeAttribute(name: string): unknown
    remove(): unknown
}

export async function sanitizeSvg(svg: string): Promise<string> {
    const response = new HTMLRewriter()
        .onDocument({
            comments(comment) {
                comment.remove()
            },
        })
        .on("*", {
            element(elIn) {
                const el = elIn as unknown as RewriterElement
                const canonicalTag =
                    CANONICAL_TAGS[el.tagName.toLowerCase()]
                if (!canonicalTag) {
                    el.remove()
                    return
                }
                el.tagName = canonicalTag

                for (const [name] of [...el.attributes]) {
                    if (
                        !ALLOWED_ATTRIBUTES.has(
                            name.toLowerCase()
                        )
                    ) {
                        el.removeAttribute(name)
                    }
                }
            },
        })
        .transform(new Response(svg))
    let html = await response.text()
    for (const [
        pattern,
        replacement,
    ] of ATTRIBUTE_CASING_FIXUPS) {
        html = html.replace(pattern, replacement)
    }
    return html
}
