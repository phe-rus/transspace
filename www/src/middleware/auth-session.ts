import { auth } from "@/lib/auth"
import { queryOptions } from "@tanstack/react-query"
import { createMiddleware, createServerFn } from "@tanstack/react-start"

export const authSessionMiddleware = createMiddleware()
    .server(async ({ next, request }) => {
        const result = await auth.api.getSession({
            headers: request.headers,
        })
        return next({
            context: {
                sessions: result,
            }
        })
    })


export const getCurrentSesion = createServerFn()
    .middleware([authSessionMiddleware])
    .handler(async ({ context }) => {
        return context.sessions
    })


export const currentOptions = () =>
    queryOptions({
        queryKey: ["currentSession"],
        queryFn: () => getCurrentSesion(),
    })
