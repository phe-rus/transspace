// server functions and middleware in this build signal an HTTP error by
// throwing a Response directly (see middleware/require-session.ts); a
// REST route calling them in-process needs to catch that and return it as
// the actual response instead of letting it become an unhandled rejection
export async function toHttpResponse(
    fn: () => Promise<unknown>
): Promise<Response> {
    try {
        return Response.json(await fn())
    } catch (error) {
        if (error instanceof Response) return error
        throw error
    }
}
