import { getclientURL } from "@/lib/getURL"
import { seo } from "@/seo/seo"
import type { RouterAppContext } from "@/types"
import { getLocale } from "@collections/runtime"
import tailwindcss from "@pherus/ui/globals.css?url"
import { cn } from "@pherus/ui/lib/utils"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => seo({
    title: "TanStack Start Starter",
    description: "TanStack Start Starter",
    keywords: ['TanStack', 'Start', 'Starter'],
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: '/favicon.ico'
    },
    canonicalUrl: getclientURL(),
    locale: getLocale(),
    styles: tailwindcss
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument() {
  return (
    <html
      lang={getLocale()}
      className="antialiased blur-none"
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body className={cn(
        "relative min-h-svh min-w-full border bg-background",
        "overflow-x-hidden selection:bg-olive-500/15",
        "typeset wrap-anywhere duration-200",
        "flex flex-col"
      )}>
        <Outlet />
        <Scripts />
        <TanStackDevtools
          config={{
            triggerMode: "floating",
            position: "top-right",
          }}
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      </body>
    </html>
  )
}
