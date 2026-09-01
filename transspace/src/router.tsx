import { getContext, Queryprovider } from "@/lib/query.provider"
import { routeTree } from "@/routeTree.gen"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

export function getRouter() {
  const queryClient = getContext()
  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient: queryClient,
    },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
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
  }
}
