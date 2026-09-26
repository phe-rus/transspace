import { getLocale } from "@/paraglide/runtime"

// dates rendered during ssr must print the same on the server (utc) and in
// the browser (the viewer's zone), or react throws a hydration mismatch.
// pinning the zone to utc keeps both sides identical; the locale comes from
// paraglide so the format follows the page language, not the machine
export function formatDate(
    value: string | number | Date,
    options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
    return new Intl.DateTimeFormat(getLocale(), {
        ...options,
        timeZone: "UTC",
    }).format(new Date(value))
}
