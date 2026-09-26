import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { listResourcesQueryOptions } from "@/domains/resources"
import { profileQueryOptions } from "@/domains/profile"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { visitorCountryQueryOptions } from "@/lib/request-geo"
import { ArrowRightIcon, FavouriteIcon, MapsIcon, SearchIcon, Shield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { fadeUp, staggerChildren as stagger } from "@pherus/ui/lib/motion"
import { cn } from "@pherus/ui/lib/utils"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { motion } from "motion/react"

export const Route = createFileRoute("/(public)/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({
        ...listResourcesQueryOptions({ limit: 50 }),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...authGateQueryOptions(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...visitorCountryQueryOptions(),
        staleTime: "static",
      }),
    ]),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: authGate } = useSuspenseQuery(authGateQueryOptions())
  const signedIn = authGate.signedIn
  // not prefetched in the loader on purpose: getProfile() 404s until
  // onboarding completes, and a thrown Response inside a dehydrated
  // query's error state can't be serialized into the SSR stream (the
  // same crash the resource detail page's not-found case hit); a
  // plain, non-suspense client fetch here just resolves to "no data"
  // instead
  const { data: profile } = useQuery({
    ...profileQueryOptions(),
    enabled: signedIn && authGate.onboarded,
    retry: false,
  })

  const { data: heroResources } = useSuspenseQuery(
    listResourcesQueryOptions({ limit: 50 }),
  )
  // an honest lower bound, not a fabricated figure: the list endpoint
  // paginates rather than counting, so a full page plus a next cursor
  // reads as "at least N", never a false precise total (spec
  // 0003-resource-directory Consequences: the home hero's old copy
  // claimed a specific count and a "vetted access" tier that were
  // never real)
  const heroResourceCount = heroResources.nextCursor
    ? `${heroResources.items.length}+`
    : `${heroResources.items.length}`

  const { data: visitorCountry } = useSuspenseQuery(visitorCountryQueryOptions())
  // country only, never anything finer (spec 0003-resource-directory
  // AC-6 carve-out): Cloudflare's edge already attaches this to every
  // request the same way any network intermediary would see it, unlike
  // an exact address or coordinate, which stays gated everywhere else
  // in this app. Intl.DisplayNames turns the ISO code into a localized
  // name with no extra dependency or lookup table; shown as "Name, CODE"
  // to match the codebase's other "specific, category" label pattern
  // (e.g. ResourceCard's "city, country").
  const visitorCountryName = (() => {
    const code = visitorCountry.countryCode
    if (!code) return null
    try {
      const name = new Intl.DisplayNames([getLocale()], {
        type: "region",
      }).of(code)
      return name ? `${name}, ${code}` : code
    } catch {
      return code
    }
  })()

  // when the visitor's own country isn't available (e.g. local dev
  // with no real Cloudflare edge in front), fall back to an honest,
  // real-data signal instead of showing nothing: the country with the
  // most published resources right now
  const topCountryName = (() => {
    const counts = new Map<string, number>()
    for (const item of heroResources.items) {
      counts.set(item.countryName, (counts.get(item.countryName) ?? 0) + 1)
    }
    let best: string | null = null
    let bestCount = 0
    for (const [name, count] of counts) {
      if (count > bestCount) {
        best = name
        bestCount = count
      }
    }
    return best
  })()

  const heroLocationName = visitorCountryName ?? topCountryName

  return (
    <article className="flex flex-col py-10">
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="container mx-auto flex w-full flex-col gap-5 md:max-w-5xl"
      >
        <motion.div variants={fadeUp}>
          {signedIn
            ? (
              <>
                <h1>
                  {m["pages.home.welcomeBackTitle"]({
                    name: profile?.displayName ? `, ${profile.displayName}` : "",
                  })}
                </h1>
                <p>{m["pages.home.welcomeBackSubtitle"]()}</p>
              </>
            )
            : (
              <>
                <h1>{m["pages.home.welcomeGuestTitle"]()}</h1>
                <p>{m["pages.home.welcomeGuestSubtitle"]()}</p>
              </>
            )}
        </motion.div>

        <div className="flex flex-col gap-5 md:flex-row md:items-stretch">
          <motion.div
            variants={fadeUp}
            className={cn(
              "relative flex min-h-70 flex-[1.7] flex-col justify-end",
              'gap-3.5 overflow-hidden rounded-4xl',
              'bg-[url(/map.png)] bg-cover p-6'
            )}
          >
            <h6 className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success" />
              {m["pages.home.localStatus"]()}
            </h6>
            <div>
              {heroLocationName && <h2>{heroLocationName}</h2>}
              <p>{m["pages.home.areaSummary"]({ count: heroResourceCount })}</p>
            </div>
            <Button size="sm" className="w-fit rounded-full" nativeButton={false} render={<Link to="/atlas" />}>
              <HugeiconsIcon icon={MapsIcon} className="size-3.5" />
              {m["pages.home.openTheMap"]()}
            </Button>
          </motion.div>

          <div className="flex flex-1 flex-col">
            <Link to="/r" className="contents">
              <motion.div
                variants={fadeUp}
                className="group flex flex-1 flex-col justify-center gap-1 border-b border-border/60 py-5"
              >
                <HugeiconsIcon icon={SearchIcon} className="size-5" />
                <h3 className="underline-offset-4 group-hover:underline">{m["pages.home.exploreTitle"]()}</h3>
                <p>{m["pages.home.exploreSubtitle"]()}</p>
              </motion.div>
            </Link>

            <Link to="/support" className="contents">
              <motion.div
                variants={fadeUp}
                className="group flex flex-1 flex-col justify-center gap-1 py-5"
              >
                <HugeiconsIcon icon={FavouriteIcon} className="size-5 text-destructive" />
                <h3 className="text-destructive underline-offset-4 group-hover:underline">{m["pages.home.crisisSupportTitle"]()}</h3>
                <p>{m["pages.home.crisisSupportSubtitle"]()}</p>
              </motion.div>
            </Link>
          </div>
        </div>

        <motion.div
          variants={fadeUp}
          className="flex flex-col gap-3.5 border-t border-border/60 pt-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2>{m["pages.home.trendingTitle"]()}</h2>
              <p>{m["pages.home.trendingSubtitle"]()}</p>
            </div>
            <Link to="/r" className="flex items-center gap-1">
              {m["pages.home.joinCommunity"]()}
              <HugeiconsIcon icon={ArrowRightIcon} className="size-3.5" />
            </Link>
          </div>

          {/* no community/discussion data model exists yet (not part of
              the resource directory build); this is an honest empty
              state, not a placeholder for fabricated posts */}
          <p className="py-6 text-center">{m["pages.home.trendingEmpty"]()}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="flex justify-center pt-2">
          {/* data-not-typeset: a status pill is app chrome, not page content */}
          <div
            data-not-typeset
            className={cn(
              "flex items-center gap-2 rounded-full border",
              'border-border px-4.5 py-2.5 text-xs! text-muted-foreground'
            )}
          >
            <HugeiconsIcon icon={Shield01Icon} className="size-3.5 text-olive-500" />
            {m["pages.home.protectedNotice"]()}
          </div>
        </motion.div>
      </motion.section>
    </article>
  )
}
