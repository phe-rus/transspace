import { m } from "@/paraglide/messages"
import { ArrowRightIcon, LocationIcon, SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@pherus/ui/input-group"
import { cn } from "@pherus/ui/lib/utils"
import { fadeUp, staggerChildren as stagger } from "@pherus/ui/lib/motion"
import { Progress } from "@pherus/ui/progress"
import { createFileRoute } from "@tanstack/react-router"
import { motion } from "motion/react"
import type { CSSProperties } from "react"
import { useMemo } from "react"

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
})

const heroAccentVars = {
  "--hero-accent-1": "#D4736E",
  "--hero-accent-2": "#E8C87A",
  "--hero-accent-3": "#5B7B95",
} as CSSProperties

const heroSectionBgVars = {
  "--hero-section-bg": "#F5E2E0",
} as CSSProperties

function RouteComponent() {
  const whileInView = {
    initial: "hidden" as const,
    whileInView: "show" as const,
    viewport: { once: true, margin: "-80px" },
  }

  const communityList = useMemo(() => [
    {
      title: "Health care",
      description: "Access gender-affirming practitioners and safe clinics.",
      to: "/",
    },
    {
      title: "Transition Support",
      description: "Step-by-step navigation for physical and social transitions.",
      to: "/",
    },
    {
      title: "Mental Health",
      description: "Find vetted queer-allied counselors and support circles.",
      to: "/",
    },
    {
      title: "Legal Advice",
      description: "Connect with attorneys experienced in legal name/gender change.",
      to: "/",
    },
    {
      title: "Immigration Support",
      description: "Guidance on seeking asylum or relocating safely.",
      to: "/",
    },
    {
      title: "Safe Housing",
      description: "Cooperative spaces and friendly, vetted landlords.",
      to: "/",
    },
  ], [])

  const countries = useMemo(() => {
    return ["Uganda", "Germany", "Poland", "Japan", "Maxico"]
  }, [])

  const campaigns = useMemo(() => [
    {
      title: "Safe housing fund kampala",
      description: "Providing emergency relocation and short term safe house support.",
      pricing: { raised: 4200, target: 6000, currency: "$" },
    },
    {
      title: "Gender Affirming Care Support",
      description: "Helping 12 community members cover hormone therapy diagnostics.",
      pricing: { raised: 1850, target: 3000, currency: "$" },
    },
    {
      title: "Legal Counsel Assistance Desk",
      description: "Pro-bono legal counsel representation for name-change updates.",
      pricing: { raised: 5100, target: 5000, currency: "$" },
    },
  ], [])

  return (
    <article className="flex flex-col py-10">
      <section className="container mx-auto flex w-full md:max-w-5xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className={cn(
            "mx-auto flex w-full flex-col gap-5",
            "min-h-[70svh] justify-center",
          )}
        >
          <motion.div variants={fadeUp} className="md:text-center">
            {/* data-not-typeset: hero display type is app chrome, sized off typeset's scale */}
            <h1 data-not-typeset className="text-2xl font-bold md:text-7xl">
              {m["overview.hero.title"]()}
            </h1>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mx-auto flex flex-col gap-3 md:max-w-xl"
          >
            <InputGroup className="h-9">
              <InputGroupInput
                type="search"
                placeholder="What do you need help with ?"
              />

              <InputGroupAddon align="inline-start">
                <HugeiconsIcon icon={SearchIcon} />
              </InputGroupAddon>

              <InputGroupAddon align="inline-end">
                <Button variant="ghost">
                  <HugeiconsIcon icon={LocationIcon} />
                  <span className="text-sm">Berlin, DE</span>
                </Button>
              </InputGroupAddon>
            </InputGroup>

            <span className="text-center text-sm font-light">
              Suggested: "Gender-affirming therapy", "safe roommate matching",
              "legal name change guides"
            </span>
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        variants={stagger}
        {...whileInView}
        style={heroAccentVars}
        className={cn(
          "container mx-auto grid min-h-screen w-full grid-cols-12",
          "justify-center gap-3 md:max-w-5xl",
        )}
      >
        {["bg-(--hero-accent-1)", "bg-(--hero-accent-2)", "bg-(--hero-accent-3)"].map((accent, index) => (
          <motion.span
            key={accent}
            variants={fadeUp}
            className={cn(
              "col-span-5 flex h-[18vh] w-full rounded-4xl shadow",
              accent,
              index === 1 && "col-span-4",
              index === 2 && "col-span-3",
            )}
          />
        ))}
      </motion.section>

      <motion.section
        variants={stagger}
        {...whileInView}
        className={cn(
          "container mx-auto flex min-h-screen w-full flex-col",
          "justify-center gap-5 md:max-w-5xl",
        )}
      >
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <h2>Explore by real community need</h2>
        </motion.div>

        <div className="columns-1 gap-3 md:columns-2 lg:columns-3">
          {communityList.map((item) => (
            <motion.article
              key={item.title}
              variants={fadeUp}
              className="mb-3 flex rounded-3xl bg-muted [&_a]:cursor-pointer"
            >
              <section className="flex flex-col p-5">
                <h3 className="text-xl">{item.title}</h3>
                <p>{item.description}</p>
                <a className="mt-5 flex items-center gap-2 text-sm">
                  Browse resources
                  <HugeiconsIcon icon={ArrowRightIcon} className="size-4" />
                </a>
              </section>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <motion.section
        variants={stagger}
        {...whileInView}
        style={heroSectionBgVars}
        className={cn(
          "flex min-h-screen w-full flex-col",
          "justify-center gap-5 bg-(--hero-section-bg)",
        )}
      >
        <div className="container mx-auto grid w-full grid-cols-1 gap-5 py-10 md:max-w-5xl md:grid-cols-2">
          <motion.div variants={fadeUp} className="flex flex-col">
            <h2 className="text-3xl">We carry knowledge across borders</h2>
            <p className="text-base">
              Access contextual community reports from over 45 countries. Map
              legal safety, medical infrastructure, and safe spaces before
              arriving.
            </p>

            <div className="mt-5 flex flex-wrap gap-1">
              {countries.map((country) => (
                <Button key={country} size="sm" variant="secondary">
                  {country}
                </Button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col">
            <span className="min-h-[35vh] flex-1 rounded-4xl bg-muted" />
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        variants={fadeUp}
        {...whileInView}
        className={cn(
          "container mx-auto flex min-h-screen w-full flex-col",
          "justify-center gap-5 md:max-w-5xl",
        )}
      >
        <div>
          <span>Weekly Curation</span>
          <h2>Insights from the frontlines</h2>
        </div>

        <div />
      </motion.section>
      <motion.section
        variants={stagger}
        {...whileInView}
        className={cn(
          "container mx-auto flex min-h-screen w-full flex-col",
          "justify-center gap-5 md:max-w-5xl",
        )}
      >
        <motion.div variants={fadeUp}>
          <span>Mutual aid</span>
          <h2>Active community campaigns</h2>
        </motion.div>

        <div className="no-scrollbar flex flex-row gap-5 overflow-x-auto rounded-3xl">
          {campaigns.map((campaign) => (
            <motion.article
              key={campaign.title}
              variants={fadeUp}
              className={cn(
                "min-w-sm max-w-sm rounded-3xl border border-border/55",
                "bg-muted shadow transition-shadow hover:shadow-md",
              )}
            >
              <section className="flex flex-col p-5">
                <h3>{campaign.title}</h3>
                <p>{campaign.description}</p>

                <div className="mt-5 flex items-center justify-between">
                  <span>
                    {campaign.pricing.currency}
                    {campaign.pricing.raised} raised
                  </span>
                  <span>
                    Target: {campaign.pricing.currency}
                    {campaign.pricing.target}
                  </span>
                </div>
                <Progress
                  value={campaign.pricing.raised}
                  max={campaign.pricing.target}
                />
              </section>
            </motion.article>
          ))}
        </div>
      </motion.section>
    </article>
  )
}