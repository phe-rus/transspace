import { SupportPostCard } from "@/components/support/support-post-card"
import { listSupportPostsQueryOptions } from "@/domains/support"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { m } from "@/paraglide/messages"
import { Add01Icon, HeartHandshakeIcon, Shield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

export const Route = createFileRoute("/(public)/support/")({
  validateSearch: z.object({
    direction: z.enum(["request", "offer"]).optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query({
        ...listSupportPostsQueryOptions(deps),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...authGateQueryOptions(),
        staleTime: "static",
      }),
    ]),
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(listSupportPostsQueryOptions(search))
  const { data: authGate } = useSuspenseQuery(authGateQueryOptions())

  const patchSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) })

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-3">
        <h1>{m["pages.support.title"]()}</h1>
        <p className="max-w-lg">{m["pages.support.subtitle"]()}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => patchSearch({ direction: undefined })}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm transition-colors",
              !search.direction
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            )}
          >
            {m["pages.support.directionAll"]()}
          </button>
          <button
            type="button"
            onClick={() => patchSearch({ direction: "request" })}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm transition-colors",
              search.direction === "request"
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            )}
          >
            {m["pages.support.directionRequests"]()}
          </button>
          <button
            type="button"
            onClick={() => patchSearch({ direction: "offer" })}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm transition-colors",
              search.direction === "offer"
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            )}
          >
            {m["pages.support.directionOffers"]()}
          </button>
        </div>

        <Button
          nativeButton={false}
          render={<Link to={authGate.signedIn ? "/submit-support" : "/auth"} />}
          className="h-10 gap-1.5 rounded-full px-5"
        >
          {search.direction === "offer" ? (
            <HugeiconsIcon icon={HeartHandshakeIcon} />
          ) : (
            <HugeiconsIcon icon={Add01Icon} />
          )}
          {authGate.signedIn
            ? m["pages.support.requestHelp"]()
            : m["pages.submitSupport.signIn"]()}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
        {data.items.map((post) => (
          <SupportPostCard key={post.id} post={post} />
        ))}

        {data.items.length === 0 && (
          <p className="py-10 text-center md:col-span-2">
            {m["pages.support.empty"]()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 pt-5">
        <HugeiconsIcon icon={Shield01Icon} className="size-4.5 shrink-0" />
        <p>
          <strong className="text-foreground">{m["pages.support.privacyNoteStrong"]()}</strong>{" "}
          {m["pages.support.privacyNote"]()}
        </p>
      </div>
    </article>
  )
}
