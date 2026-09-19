import { m } from "@/paraglide/messages"
import { Menu03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@pherus/ui/avatar"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { Link } from "@tanstack/react-router"
import { useMemo } from "react"

export const Headers = () => {
    const navItems = useMemo(() => {
        return [
            {
                label: m["navigation.items.resources"](),
                to: "/resources"
            },
            {
                label: m["navigation.items.opportunities"](),
                to: "/opportunities"
            },
            {
                label: m["navigation.items.legal"](),
                to: "/legal"
            },
            {
                label: m["navigation.items.learn-new-skills"](),
                to: "/learn-new-skills"
            },
            {
                label: m["navigation.items.support"](),
                to: "/support"
            },
            {
                label: m["navigation.items.the-fog-of-history"](),
                to: "/the-fog-of-history"
            }
        ]
    }, [])

    return (
        <header className='sticky top-0 z-35 bg-background border-b border-border/35'>
            <section className={cn(
                'flex items-center justify-between h-10',
                'w-full px-5'
            )}>
                <div className='flex items-center gap-5'>
                    <Link to='/' className="font-bold text-base text-primary">
                        {m["navigation.title"]()}
                    </Link>
                    <nav className="hidden md:flex items-center gap-2">
                        {navItems?.map((items, index) => {
                            return (
                                <Link
                                    key={index}
                                    to={items.to}
                                    className='text-sm!'
                                    activeProps={{
                                        className: 'text-primary'
                                    }}
                                >
                                    {items.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <nav className='flex items-center gap-px'>
                    <div className='hidden md:flex items-center gap-2'>
                        <span className='text-sm'>Hello, la niina</span>
                        <Avatar size='sm' className='size-5.5!'>
                            <AvatarImage src='/favicon.ico' />
                            <AvatarFallback>AV</AvatarFallback>
                        </Avatar>
                    </div>

                    <Button
                        size='icon-sm'
                        variant='ghost'
                        className='md:hidden flex'
                    >
                        <HugeiconsIcon icon={Menu03Icon} />
                    </Button>
                </nav>
            </section>
        </header>
    )
}