import { ArrowRightIcon, FavouriteIcon, MapsIcon, SearchIcon, Shield01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { fadeUp, staggerChildren as stagger } from "@pherus/ui/lib/motion"
import { cn } from "@pherus/ui/lib/utils"
import { Link, createFileRoute } from "@tanstack/react-router"
import { motion } from "motion/react"
import { useMemo } from "react"

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
})

function RouteComponent() {
  const signedIn = true

  const trending = useMemo(() => [
    {
      tag: "Events",
      meta: "1.2k",
      title: "Safe haven evening social at The Archivist",
      footer: "Posted 2h ago",
    },
    {
      tag: "Health",
      title: "Mental health check in, sharing our wins this week",
      footer: "42 new replies",
    },
    {
      tag: "Advice",
      title: "Best private housing cooperatives for queer youth",
      footer: "Top discussion",
    },
  ], [])

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
                <h1>Welcome back, River.</h1>
                <p>Your area is mapped. Here is a snapshot of your community today.</p>
              </>
            )
            : (
              <>
                <h1>Welcome to Transspace.</h1>
                <p>Sign in to see resources near you and your community activity.</p>
              </>
            )}
        </motion.div>

        <div className="flex flex-col gap-5 md:flex-row md:items-stretch">
          <motion.div
            variants={fadeUp}
            className={cn(
              "relative flex min-h-70 flex-[1.7] flex-col justify-end",
              'gap-3.5 overflow-hidden rounded-4xl border border-border/35',
              'shadow hover:shadow-md bg-[url(/map.png)] bg-cover p-6',
              'shadow-primary/15 cursor-pointer'
            )}
          >
            <h6 className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success" />
              Local status
            </h6>
            <div>
              <h2>Berlin, DE</h2>
              <p>12 community verified resources active nearby. 3 areas nearby require vetted access.</p>
            </div>
            <Button size="sm" className="w-fit rounded-full" render={<Link to="/r" />}>
              <HugeiconsIcon icon={MapsIcon} className="size-3.5" />
              Open the map
            </Button>
          </motion.div>

          <div className="flex flex-1 flex-col gap-5">
            <motion.div
              variants={fadeUp}
              className={cn(
                "flex flex-1 flex-col justify-center cursor-pointer",
                'rounded-3xl border border-border/35 bg-card/35 p-5',
                'shadow hover:shadow-md shadow-primary/15'
              )}
            >
              <HugeiconsIcon icon={SearchIcon} className="size-5" />
              <h3>Explore</h3>
              <p>Find resources</p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className={cn(
                "flex flex-1 flex-col justify-center cursor-pointer",
                'rounded-3xl border border-border/35 bg-card/35 p-5',
                'shadow hover:shadow-md shadow-primary/15'
              )}
            >
              <HugeiconsIcon icon={FavouriteIcon} className="size-5 text-destructive" />
              <h3 className="text-destructive">Crisis support</h3>
              <p>Ask for help</p>
            </motion.div>
          </div>
        </div>

        <motion.div
          variants={fadeUp}
          className={cn(
            "flex flex-col gap-3.5 bg-card/35 p-5 rounded-3xl",
            'shadow hover:shadow-md shadow-primary/15',
            'border border-border/35 cursor-pointer'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2>Trending in your communities</h2>
              <p>Active conversations in your circles</p>
            </div>
            <a className="flex items-center gap-1">
              Join a community
              <HugeiconsIcon icon={ArrowRightIcon} className="size-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {trending.map((item) => (
              <article
                key={item.title}
                className={cn(
                  "flex flex-col gap-2 rounded-3xl border border-border/35 bg-card/55",
                  'p-5'
                )}
              >
                <h6 className="flex items-center gap-1.5">
                  <span>{item.tag}</span>
                  {item.meta && (
                    <>
                      <span>·</span>
                      <HugeiconsIcon icon={UserGroupIcon} className="size-3" />
                      <span>{item.meta}</span>
                    </>
                  )}
                </h6>
                <h3>{item.title}</h3>
                <p className="mt-auto">{item.footer}</p>
              </article>
            ))}
          </div>
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
            Your connection is protected. Exact locations are never shared
          </div>
        </motion.div>
      </motion.section>
    </article>
  )
}
