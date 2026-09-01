import { type AnyRouteMatch } from "@tanstack/react-router"
import type { seoprops } from "./types"

export const seo = ({
    siteName = 'Transspace',
    title = 'Tanstack start - template',
    description = 'Tanstack start - template',
    type = 'website',
    img = '/og.png',
    locale,
    keywords,
    icons,
    styles,
    canonicalUrl
}: seoprops) => {
    const metascript = [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
        { title },
        { name: 'description', content: description },
        ...(canonicalUrl ? [{ property: 'canonical', content: canonicalUrl }] : []),
        { property: 'application-name', content: siteName },
        ...(keywords ? [{ name: 'keywords', content: keywords.join(',') }] : []),
        { name: 'theme-color', media: '(prefers-color-scheme: light)', content: 'var(--background)' },
        { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: 'var(--background)' },

        // Open Graph
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: type },
        ...(canonicalUrl ? [{ property: 'og:url', content: canonicalUrl }] : []),
        ...(typeof img === 'string'
            ? [{ property: 'og:image', content: img }]
            : Array.isArray(img)
                ? img.map((item, index) => ({ property: index === 0 ? 'og:image' : `og:image:${index}`, content: item }))
                : []
        ),
        { property: 'og:site_name', content: siteName },
        { property: 'og:locale', content: locale },

        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        ...(canonicalUrl ? [{ property: 'twitter:url', content: canonicalUrl }] : []),
        ...(typeof img === 'string'
            ? [{ name: 'twitter:image', content: img }]
            : Array.isArray(img) && img.length > 0
                ? [{ name: 'twitter:image', content: img[0] }]
                : []
        ),
        { name: 'twitter:site', content: '@pherus' },
        { name: 'twitter:creator', content: '@pherus' },
    ] satisfies Partial<AnyRouteMatch['meta']>

    const links = [
        ...(icons ? [
            ...(icons.shortcut ? [{ rel: "shortcut icon", href: icons.shortcut, type: "image/x-icon" }] : []),
            ...(icons.apple ? [{ rel: "apple-touch-icon", href: icons.apple, type: "image/png" }] : []),
            ...(icons.icon ? [{ rel: "icon", href: icons.icon, type: "image/png" }] : []),
            ...(icons.other?.map((item) => ({ rel: item.rel ?? "icon", href: item.url })) ?? []),
        ] : []),
        ...(styles ? [{ rel: 'stylesheet', href: styles, type: 'text/css' }] : []),
        ...(canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : []),
    ] satisfies Partial<AnyRouteMatch['links']>

    return {
        meta: metascript,
        links: links
    } satisfies Partial<AnyRouteMatch>
}