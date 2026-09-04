import { m } from "@/paraglide/messages"
import { BriefcaseIcon, BrowserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { buttonVariants } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <article className="flex flex-col py-10">
      <section className='container flex w-full max-w-3xl'>
        <div className={cn(
          'flex flex-col gap-5 w-full mx-auto',
          'min-h-[70svh] justify-center'
        )}>
          <div className='text-center'>
            <Badge variant='secondary'>
              {m["nav.title"]()}
            </Badge>
            <h1 className='text-2xl md:text-4xl font-black'>
              {m['overview.hero.title']()}
            </h1>
            <p className='text-base'>
              {m['overview.hero.subtitle']()}
            </p>
          </div>
          <div className='flex items-center justify-center gap-2'>
            {([
              {
                key: "resources",
                to: '/',
                Icon: BrowserIcon,
                variant: 'default',
                message: m['overview.hero.links.resources'](),
              },
              {
                key: "opportunities",
                to: '/',
                Icon: BriefcaseIcon,
                variant: 'secondary',
                message: m['overview.hero.links.opportunities'](),
              },
            ]).map((item) => (
              <Link
                to={item.to}
                key={item.key}
                className={cn(buttonVariants({
                  variant: item.variant as any,
                  className: 'group/icon rounded-full'
                }), "w-fit")}
              >
                <HugeiconsIcon icon={item.Icon} />
                {item.message}
              </Link>
            ))}
          </div>
        </div>
      </section>


    </article>
  )
}
