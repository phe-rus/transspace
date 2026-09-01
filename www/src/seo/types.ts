type webtypes =
    | 'website'
    | 'article'
    | 'book'
    | 'person'
    | 'place'
    | 'product'

export type seoprops = {
    siteName?: string,
    title: string,
    description?: string,
    type?: webtypes
    img?: string[] | string
    locale?: string
} & {
    canonicalUrl?: string
} & {
    keywords?: string[]
    icons?: {
        icon: string
        shortcut?: string
        apple?: string
        other?: {
            rel?: string
            url?: string
        }[]
    }
} & {
    styles?: string
}