import { m } from "@/paraglide/messages"
import { Menu03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@pherus/ui/avatar"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { Link } from "@tanstack/react-router"
import { motion, type Variants } from "motion/react"
import { useMemo } from "react"

export const Headers = () => {
    const stagger: Variants = useMemo(
        () => ({
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
        }),
        [],
    )

    const fadeDown: Variants = useMemo(
        () => ({
            hidden: { opacity: 0, y: -8 },
            show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.4, ease: "easeOut" },
            },
        }),
        [],
    )

    const navItems = useMemo(() => [
        {
            label: m["navigation.items.resources"](),
            to: "/resources",
        },
        {
            label: m["navigation.items.opportunities"](),
            to: "/opportunities",
        },
        {
            label: m["navigation.items.legal"](),
            to: "/legal",
        },
        {
            label: m["navigation.items.learn-new-skills"](),
            to: "/learn-new-skills",
        },
        {
            label: m["navigation.items.support"](),
            to: "/support",
        },
        {
            label: m["navigation.items.the-fog-of-history"](),
            to: "/the-fog-of-history",
        },
    ], [])

    return (
        <motion.header
            variants={stagger}
            initial="hidden"
            animate="show"
            className="sticky top-0 z-35 border-b border-border/35 bg-background"
        >
            <section
                className={cn(
                    "flex h-10 w-full items-center justify-between",
                    "px-5",
                )}
            >
                <div className="flex items-center gap-5">
                    <motion.div variants={fadeDown}>
                        <Link
                            to="/"
                            className="text-base font-bold text-primary"
                        >
                            {m["navigation.title"]()}
                        </Link>
                    </motion.div>

                    <nav className="hidden items-center gap-2 md:flex">
                        {navItems.map((item) => (
                            <motion.span
                                key={item.to}
                                variants={fadeDown}
                            >
                                <Link
                                    to={item.to}
                                    className="text-sm!"
                                    activeProps={{
                                        className: "text-primary",
                                    }}
                                >
                                    {item.label}
                                </Link>
                            </motion.span>
                        ))}
                    </nav>
                </div>

                <nav className="flex items-center gap-px">
                    <motion.div
                        variants={fadeDown}
                        className="hidden items-center gap-2 md:flex"
                    >
                        <span className="text-sm">Hello, la niina</span>
                        <Avatar size="sm" className="size-5.5!">
                            <AvatarImage src="/favicon.ico" />
                            <AvatarFallback>AV</AvatarFallback>
                        </Avatar>
                    </motion.div>

                    <motion.div variants={fadeDown}>
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            className="flex md:hidden"
                            aria-label="Open menu"
                        >
                            <HugeiconsIcon icon={Menu03Icon} />
                        </Button>
                    </motion.div>
                </nav>
            </section>
        </motion.header>
    )
}