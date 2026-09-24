import { createFileRoute } from "@tanstack/react-router"
import { resetAppLock } from "@/domains/app-lock"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/app-lock/reset")({
    server: {
        handlers: {
            POST: () => toHttpResponse(() => resetAppLock()),
        },
    },
})
