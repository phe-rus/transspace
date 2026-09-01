import { queryContext, Queryprovider } from "@/lib/query-context"
import type { RequestContext } from "@/types"
import { deLocalizeUrl, localizeUrl } from '@/paraglide/runtime'
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const queryClient = queryContext()
  const router = createTanStackRouter({
    routeTree: routeTree,
    context: {
      queryClient: queryClient
    },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    Wrap: ({ children }) => (
      <Queryprovider query={queryClient}>
        {children}
      </Queryprovider>
    )
  })

  setupRouterSsrQueryIntegration({
    queryClient: queryClient,
    router: router,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
    server: RequestContext
  }
}
