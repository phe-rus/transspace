import { LanguageSelect } from "@/components/languages"
import { NotFoundComponent } from "@/components/notFoundComponent"
import { getclientURL } from "@/lib/getURL"
import { currentOptions } from "@/middleware/auth-session"
import { getLocale } from "@/paraglide/runtime"
import { seo } from "@/seo/seo"
import type { RouterAppContext } from "@/types"
import tailwindcss from "@pherus/ui/globals.css?url"
import { GooeyToaster } from "@pherus/ui/goey-toaster"
import { cn } from "@pherus/ui/lib/utils"
import { ThemeProvider } from "@pherus/ui/theming"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { LiveSessionProvider } from "@/components/communities/live-session"

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => seo({
    title: "Transspace",
    description: "Discover trusted resources, practical knowledge, opportunities, and support shared through queer-to-queer community knowledge.",
    keywords: ['transspace', 'queer', 'lgbtqia+'],
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: '/favicon.ico'
    },
    canonicalUrl: getclientURL(),
    locale: getLocale(),
    styles: tailwindcss
  }),
  notFoundComponent: NotFoundComponent,
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.query({
      ...currentOptions(),
      staleTime: "static",
    })
    return { session: session }
  },
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
        "overflow-x-hidden selection:bg-primary/15",
        "typeset wrap-anywhere duration-200",
        "flex flex-col isolate"
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableColorScheme
          enableSystem
        >
          {/* one live connection for the whole app, so a live keeps going
              across pages, with its floating circle */}
          <LiveSessionProvider>
            <Outlet />
          </LiveSessionProvider>
          <LanguageSelect />
          <GooeyToaster />
        </ThemeProvider>
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
