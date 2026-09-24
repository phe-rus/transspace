import { createFileRoute } from "@tanstack/react-router"
import { deleteAccount } from "@/domains/account"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/account")({
    server: {
        handlers: {
            DELETE: () => toHttpResponse(() => deleteAccount()),
        },
    },
})
