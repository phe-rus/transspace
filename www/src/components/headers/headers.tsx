import { m } from "@/paraglide/messages"
import { Person } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { Link } from "@tanstack/react-router"
import { useMemo } from "react"

export const Headers = () => {
    const navItems = useMemo(() => [
        {
            label: m["nav.items.overview"](),
            to: "/"
        },
        {
            label: m["nav.items.resources"](),
            to: "/resources"
        },
        {
            label: m["nav.items.opportunities"](),
            to: "/opportunities"
        }
    ], [])

    return (
        <header className='sticky top-0'>
            <section className={cn(
                'flex items-center justify-between h-10',
                'backdrop-blur w-full px-5 z-35'
            )}>
                <div className='flex items-center gap-5'>
                    <h1 className="font-bold text-base!">{m["nav.title"]()}</h1>
                    <nav className="flex items-center gap-2">
                        {navItems?.map((items, index) => {
                            return (
                                <Link
                                    key={index}
                                    to={items.to}
                                    className='text-sm!'
                                >
                                    {items.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <nav className='flex items-center gap-2'>
                    <Button
                        size='icon-sm'
                        variant='secondary'
                        className='rounded-full'
                    >
                        <HugeiconsIcon icon={Person} />
                    </Button>
                </nav>
            </section>
        </header>
    )
}