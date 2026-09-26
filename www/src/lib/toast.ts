import { gooeyToast } from "@pherus/ui/goey-toaster"

// createServerFn throws land on the client in a couple of different
// shapes depending on the transport (a raw Response for some, an Error
// wrapping the response text for others); this normalizes both into the
// actual server message instead of a generic "it failed" with no reason
export async function toastErrorMessage(error: unknown): Promise<string> {
    if (error instanceof Response) {
        try {
            const text = await error.text()
            return text || error.statusText || "Something went wrong"
        } catch {
            return error.statusText || "Something went wrong"
        }
    }
    if (error instanceof Error) return error.message || "Something went wrong"
    return "Something went wrong"
}

export function notifySuccess(title: string): void {
    gooeyToast.success(title)
}

export async function notifyError(error: unknown): Promise<void> {
    gooeyToast.error(await toastErrorMessage(error))
}
