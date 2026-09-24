// spec 0002 "Configuration required": concrete defaults, not open questions
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_USER_QUOTA_BYTES = 500 * 1024 * 1024

// the exact five types named in AC-3, never inferred from extension or
// declared Content-Type
export const ALLOWED_TYPES = {
    png: "image/png",
    webp: "image/webp",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    pdf: "application/pdf",
} as const

export type AllowedExtension = keyof typeof ALLOWED_TYPES
