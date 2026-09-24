const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
]

// client-side only formatting for a trust_signal timestamp (e.g.
// lastReviewedAt); the server never computes this (spec
// 0003-resource-directory Value sourcing)
export function formatRelativeTime(date: Date, locale = "en"): string {
    const seconds = Math.round((date.getTime() - Date.now()) / 1000)
    const formatter = new Intl.RelativeTimeFormat(locale, {
        numeric: "auto",
    })
    for (const [unit, secondsInUnit] of UNITS) {
        if (Math.abs(seconds) >= secondsInUnit) {
            return formatter.format(
                Math.round(seconds / secondsInUnit),
                unit
            )
        }
    }
    return formatter.format(seconds, "second")
}
