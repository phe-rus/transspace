import { m } from "@/paraglide/messages"
import { ArrowRightIcon, LocationIcon, SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from '@pherus/ui/input-group'
import { cn } from "@pherus/ui/lib/utils"
import { Progress } from '@pherus/ui/progress'
import { createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent
})

function RouteComponent() {
  const communityList = useMemo(() => {
    return [
      {
        title: 'Health care',
        description: 'Access gender-affirming practitioners and safe clinics.',
        to: '/'
      },
      {
        title: 'Transition Support',
        description: 'Step-by-step navigation for physical and social transitions.',
        to: '/'
      },
      {
        title: 'Mental Health',
        description: 'Find vetted queer-allied counselors and support circles.',
        to: '/'
      },
      {
        title: 'Legal Advice',
        description: 'Connect with attorneys experienced in legal name/gender change.',
        to: '/'
      },
      {
        title: 'Immigration Support',
        description: 'Guidance on seeking asylum or relocating safely.',
        to: '/'
      },
      {
        title: 'Safe Housing',
        description: 'Cooperative spaces and friendly, vetted landlords.',
        to: '/'
      }
    ]
  }, [])

  return (
    <article className="flex flex-col py-10">
      <section className='container flex w-full mx-auto md:max-w-5xl'>
        <div className={cn(
          'flex flex-col gap-5 w-full mx-auto',
          'min-h-[70svh] justify-center'
        )}>
          <div className='md:text-center'>
            <h1 className='text-2xl md:text-7xl font-bold'>
              {m['overview.hero.title']()}
            </h1>
          </div>

          <div className='flex flex-col gap-3 mx-auto md:max-w-xl'>
            <InputGroup className='h-9'>
              <InputGroupInput
                type='search'
                placeholder='What do you need help with ?'
              />

              <InputGroupAddon align='inline-start'>
                <HugeiconsIcon icon={SearchIcon} />
              </InputGroupAddon>

              <InputGroupAddon align='inline-end'>
                <Button variant='ghost'>
                  <HugeiconsIcon icon={LocationIcon} />
                  <span className='text-sm'>Berlin, DE</span>
                </Button>
              </InputGroupAddon>
            </InputGroup>

            <span className='text-sm font-light text-center'>
              Suggested: "Gender-affirming therapy", "safe roommate matching", "legal name change guides"
            </span>
          </div>
        </div>
      </section>

      <section className={cn(
        'container grid grid-cols-12 gap-3 min-h-screen',
        'justify-center w-full mx-auto md:max-w-5xl'
      )}>
        <span className='flex w-full col-span-5 shadow bg-[#D4736E] h-[18vh] rounded-2xl' />
        <span className='flex w-full col-span-4 shadow bg-[#E8C87A] h-[18vh] rounded-2xl' />
        <span className='flex w-full col-span-3 shadow bg-[#5B7B95] h-[18vh] rounded-2xl' />
      </section>

      <section className={cn(
        'container flex flex-col gap-5 min-h-screen',
        'justify-center w-full mx-auto md:max-w-5xl'
      )}>
        <div className='flex items-center justify-between'>
          <h1>Explore by real community need</h1>
        </div>

        <div className='columns-1 md:columns-2 lg:columns-3 gap-3'>
          {communityList?.map((items, index) => {
            return (
              <article
                key={index}
                className='flex bg-muted mb-3 rounded-2xl [&_a]:cursor-pointer'
              >
                <section className='flex flex-col p-5'>
                  <h1 className='text-xl'>{items.title}</h1>
                  <p>{items.description}</p>
                  <a className='flex items-center gap-2 text-sm mt-5'>
                    Browse resources
                    <HugeiconsIcon icon={ArrowRightIcon} className='size-4' />
                  </a>
                </section>
              </article>
            )
          })}
        </div>
      </section>

      <section className={cn(
        'flex flex-col gap-5 w-full min-h-screen',
        'justify-center bg-[#F5E2E0]'
      )}>
        <div className='container grid grid-cols-1 md:grid-cols-2 gap-5 py-10 mx-auto w-full md:max-w-5xl'>
          <div className='flex flex-col'>
            <h2 className='text-3xl'>We carry knowledge across borders</h2>
            <p className="text-base">
              Access contextual community reports from over 45
              countries. Map legal safety, medical infrastructure,
              and safe spaces before arriving.
            </p>

            <div className='flex flex-wrap gap-1 mt-5'>
              {['Uganda', 'Germany', 'Poland', 'Japan', 'Maxico'].map((items, index) => {
                return (
                  <Button
                    size='sm'
                    key={index}
                    variant='secondary'
                  >
                    {items}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className='flex flex-col'>
            <span className="bg-muted flex-1 rounded-2xl min-h-[35vh]" />
          </div>
        </div>
      </section>

      <section className={cn(
        'container flex flex-col min-h-screen',
        'justify-center gap-5 w-full mx-auto md:max-w-5xl'
      )}>
        <div>
          <span>Weekly Curation</span>
          <h1>Insights from the frontlines</h1>
        </div>

        <div>

        </div>
      </section>

      <section className={cn(
        'container flex flex-col min-h-screen',
        'justify-center gap-5 w-full mx-auto md:max-w-5xl'
      )}>
        <div>
          <span>Mutual aid</span>
          <h1>Active community campaigns</h1>
        </div>

        <div className='flex flex-row gap-5 overflow-x-auto no-scrollbar rounded-2xl'>
          {[
            {
              title: 'Safe housing fund kampala',
              description: 'Providing emergency relocation and short term safe house support.',
              pricing: {
                raised: 4200,
                target: 6000,
                currency: '$'
              }
            },
            {
              title: 'Gender Affirming Care Support',
              description: 'Helping 12 community members cover hormone therapy diagnostics.',
              pricing: {
                raised: 1850,
                target: 3000,
                currency: '$'
              }
            },
            {
              title: 'Legal Counsel Assistance Desk',
              description: 'Pro-bono legal counsel representation for name-change updates.',
              pricing: {
                raised: 5100,
                target: 5000,
                currency: '$'
              }
            }
          ].map((items, index) => {
            return (
              <article key={index} className={cn(
                'rounded-2xl bg-muted border border-border/55',
                'min-w-sm max-w-sm shadow hover:shadow-md'
              )}>
                <section className='flex flex-col p-5'>
                  <h2>{items.title}</h2>
                  <p>{items.description}</p>

                  <div className='flex items-center justify-between mt-5'>
                    <span>{items.pricing.currency}{items.pricing.raised} raised</span>
                    <span>Target: {items.pricing.currency}{items.pricing.target}</span>
                  </div>
                  <Progress
                    value={items.pricing.raised}
                    max={items.pricing.target}
                  />
                </section>
              </article>
            )
          })}
        </div>
      </section>
    </article>
  )
}
