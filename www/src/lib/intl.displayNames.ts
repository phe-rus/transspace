import { getLocale } from '@/paraglide/runtime'

export function getNativeLanguageName(tag: string) {
    const displayNames = new Intl.DisplayNames([tag], { type: 'language' })
    const name = displayNames.of(tag)
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : tag
}

export function getLocalizedLanguageName(tag: string) {
    const displayNames = new Intl.DisplayNames([getLocale()], { type: 'language' })
    return displayNames.of(tag) ?? tag
}