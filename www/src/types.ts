import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"

export type RouterAppContext = {
    queryClient: QueryClient
}

export type QueryproviderProps = PropsWithChildren<{
    query: QueryClient
}>

export type RequestContext = {
    env: Env
    waitUntil: (promise: Promise<unknown>) => void
    passThroughOnException: () => void
}