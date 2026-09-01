import type { QueryproviderProps } from "@/types"
import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export const Queryprovider = ({
    query,
    children
}: QueryproviderProps) => {
    const [client] = useState(() => query)
    return (
        <QueryClientProvider client={client}>
            <>
                {children}
            </>
        </QueryClientProvider>
    )
}
