import { m } from "@/paraglide/messages"
import { Menu03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@pherus/ui/avatar"
import { Button } from "@pherus/ui/button"
import {
    Drawer,
    DrawerBackdrop,
    DrawerClose,
    DrawerContent,
    DrawerPopup,
    DrawerPortal,
    DrawerTitle,
    DrawerTrigger,
    DrawerViewport,
} from "@pherus/ui/drawer"
import { cn } from "@pherus/ui/lib/utils"
import { fadeDown, staggerChildren as stagger } from "@pherus/ui/lib/motion"
import { Link } from "@tanstack/react-router"
import { motion } from "motion/react"
import { useMemo, useState } from "react"

export const Headers = () => {
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
                        <Drawer
                            side="right"
                            open={mobileNavOpen}
                            onOpenChange={setMobileNavOpen}
                        >
                            <DrawerTrigger
                                render={
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        className="flex md:hidden"
                                        aria-label="Open menu"
                                    >
                                        <HugeiconsIcon icon={Menu03Icon} />
                                    </Button>
                                }
                            />
                            <DrawerPortal>
                                <DrawerBackdrop />
                                <DrawerViewport side="right">
                                    <DrawerPopup side="right">
                                        <DrawerContent>
                                            <div className="flex items-center justify-between">
                                                <DrawerTitle>{m["navigation.title"]()}</DrawerTitle>
                                                <DrawerClose
                                                    render={
                                                        <Button
                                                            size="icon-sm"
                                                            variant="ghost"
                                                            aria-label="Close menu"
                                                        >
                                                            <HugeiconsIcon icon={Menu03Icon} />
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                            <nav className="flex flex-col gap-1">
                                                {navItems.map((item) => (
                                                    <Link
                                                        key={item.to}
                                                        to={item.to}
                                                        onClick={() => setMobileNavOpen(false)}
                                                        className="rounded-lg px-2 py-2 text-sm"
                                                        activeProps={{
                                                            className: "text-primary",
                                                        }}
                                                    >
                                                        {item.label}
                                                    </Link>
                                                ))}
                                            </nav>
                                        </DrawerContent>
                                    </DrawerPopup>
                                </DrawerViewport>
                            </DrawerPortal>
                        </Drawer>
                    </motion.div>
                </nav>
            </section>
        </motion.header>
    )
}