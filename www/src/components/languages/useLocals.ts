import { getLocale, setLocale } from "@/paraglide/runtime"
import { POSITION_STORAGE_KEY, type Anchor } from "./types"

export function getNativeLanguageName(tag: string) {
    const displayNames = new Intl.DisplayNames([tag], {
        type: "language",
    })
    const name = displayNames.of(tag)
    return name
        ? name.charAt(0).toUpperCase() + name.slice(1)
        : tag
}

export function getLocalizedLanguageName(tag: string) {
    const displayNames = new Intl.DisplayNames(
        [getLocale()],
        { type: "language" }
    )
    return displayNames.of(tag) ?? tag
}

export function useStoreAnchor() {
    try {
        const raw = localStorage.getItem(POSITION_STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<Anchor>
        if (
            (parsed.side === "left" ||
                parsed.side === "right") &&
            (parsed.edge === "top" ||
                parsed.edge === "bottom") &&
            typeof parsed.x === "number" &&
            typeof parsed.y === "number"
        ) {
            return {
                side: parsed.side,
                edge: parsed.edge,
                x: parsed.x,
                y: parsed.y,
            }
        }
    } catch { }
    return null
}

export function setStoreAnchor(anchor: Anchor) {
    try {
        localStorage.setItem(
            POSITION_STORAGE_KEY,
            JSON.stringify(anchor)
        )
    } catch { }
}

export function selectLocale(value: string) {
    // biome-ignore lint/suspicious/noExplicitAny: tanstack types are weird
    setLocale(value as any)
}