import { getNativeLanguageName } from "@/lib/intl.displayNames"
import { m } from "@/paraglide/messages"
import { getLocale, locales, setLocale } from "@/paraglide/runtime"
import { Person } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@pherus/ui/select"
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

    const languages = useMemo(() => Array.from(locales, (locale) => {
        return {
            value: locale,
            label: getNativeLanguageName(locale),
        }
    }), [locales])


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
                    <Select
                        defaultValue={getLocale()}
                        items={languages}
                        onValueChange={(value) => {
                            setLocale(value as any)
                        }}
                    >
                        <SelectTrigger size='sm' className='w-32 border-border/55!'>
                            <SelectValue placeholder='Language' />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Languages</SelectLabel>
                                {languages.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
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