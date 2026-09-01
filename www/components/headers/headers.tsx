import { m } from "@collections/messages"
import { getLocale, locales, setLocale } from "@collections/runtime"
import { Person } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@pherus/ui/select"

export const Headers = () => {
    return (
        <header className='sticky top-0'>
            <section className={cn(
                'flex items-center justify-between h-12',
                'bg-background w-full px-5 border-b',
                'border-border/35'
            )}>
                <div className='flex items-center gap-2'>
                    <h1 className="text-base font-bold">{m["nav.title"]()}</h1>
                </div>

                <nav className='flex items-center gap-2'>
                    <Select
                        defaultValue={getLocale()}
                        items={Array.from(locales, (locale) => {
                            return {
                                value: locale,
                                label: locale.toUpperCase(),
                            }
                        })}
                        onValueChange={(value) => {
                            setLocale(value as any)
                        }}
                    >
                        <SelectTrigger className='w-32'>
                            <SelectValue placeholder='Language' />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Languages</SelectLabel>
                                {Array.from(locales, (item) => (
                                    <SelectItem key={item} value={item}>
                                        {item.toUpperCase()}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button
                        size='icon'
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