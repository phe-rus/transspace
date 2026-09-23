import { m } from "@/paraglide/messages"
import { ArrowDown01Icon, Menu03Icon, Notification01Icon, Rocket01Icon, Shield01Icon, Stethoscope02Icon, UserGroup02Icon } from "@hugeicons/core-free-icons"
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
import { fadeDown, staggerChildren as stagger } from "@pherus/ui/lib/motion"
import { cn } from "@pherus/ui/lib/utils"
import { Link } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

export const Headers = () => {
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const [resourcesOpen, setResourcesOpen] = useState(false)
    const [navHeight, setNavHeight] = useState(40)
    const headerRef = useRef<HTMLElement>(null)
    const openTimeout = useRef<number | undefined>(undefined)
    const closeTimeout = useRef<number | undefined>(undefined)

    useEffect(() => {
        const measure = () => {
            if (headerRef.current) setNavHeight(headerRef.current.offsetHeight)
        }
        measure()
        window.addEventListener("resize", measure)
        return () => window.removeEventListener("resize", measure)
    }, [])

    const scheduleOpen = useCallback(() => {
        window.clearTimeout(closeTimeout.current)
        openTimeout.current = window.setTimeout(() => setResourcesOpen(true), 80)
    }, [])

    const scheduleClose = useCallback(() => {
        window.clearTimeout(openTimeout.current)
        closeTimeout.current = window.setTimeout(() => setResourcesOpen(false), 200)
    }, [])

    const cancelClose = useCallback(() => {
        window.clearTimeout(closeTimeout.current)
    }, [])

    useEffect(() => () => {
        window.clearTimeout(openTimeout.current)
        window.clearTimeout(closeTimeout.current)
    }, [])

    const navItems = useMemo(() => [
        { label: "Map", to: "/atlas" },
        { label: "Communities", to: "/r" },
        { label: "Support", to: "/r" },
        { label: "Profile", to: "/r" },
    ], [])

    const resourceGroups = useMemo(() => [
        {
            label: "Health",
            icon: Stethoscope02Icon,
            items: [
                { label: "Healthcare providers", description: "Gender-affirming practitioners and clinics.", to: "/r/health/providers" },
                { label: "Mental health & HIV", description: "Counseling, peer support, and testing.", to: "/r/health/mental-and-hiv" },
            ],
        },
        {
            label: "Safety",
            icon: Shield01Icon,
            items: [
                { label: "Safe spaces & housing", description: "Vetted shelters and cooperative housing.", to: "/r/housing/safe-spaces" },
                { label: "Legal & immigration", description: "Name change, asylum, and legal aid.", to: "/r/legal/immigration" },
            ],
        },
        {
            label: "Get involved",
            icon: UserGroup02Icon,
            items: [
                { label: "Story submissions", description: "Share what worked in your community.", to: "/stories" },
                { label: "Community support", description: "Mutual aid and local organizing.", to: "/r/community/support" },
            ],
        },
        {
            label: "Grow",
            icon: Rocket01Icon,
            items: [
                { label: "Jobs & careers", description: "Inclusive employers and career support.", to: "/opportunities" },
                { label: "Skills & learning", description: "Workshops and community-led courses.", to: "/guides" },
            ],
        },
    ], [])

    return (
        <motion.header
            ref={headerRef}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="sticky top-0 z-35 border-b border-border/15 bg-background/5 backdrop-blur-xs"
        >
            <section
                className={cn(
                    "container mx-auto flex h-10 w-full items-center justify-between",
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
                        <motion.div
                            variants={fadeDown}
                            onMouseEnter={scheduleOpen}
                            onMouseLeave={scheduleClose}
                        >
                            <button
                                type="button"
                                aria-expanded={resourcesOpen}
                                className={cn(
                                    "flex items-center gap-1 text-sm! text-muted-foreground",
                                    resourcesOpen && "text-foreground",
                                )}
                            >
                                {m["navigation.items.resources"]()}
                                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
                            </button>
                        </motion.div>

                        {navItems.map((item) => (
                            <motion.span
                                key={item.label}
                                variants={fadeDown}
                            >
                                <Link
                                    to={item.to}
                                    className="text-sm! text-muted-foreground"
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
                        className="hidden items-center gap-1 md:flex"
                    >
                        <Button
                            size="icon-sm"
                            variant='default'
                            className="rounded-full"
                            aria-label="Privacy"
                        >
                            <HugeiconsIcon icon={Shield01Icon} />
                        </Button>

                        <Button
                            size="icon-sm"
                            variant='secondary'
                            className="rounded-full"
                            aria-label="Notifications"
                        >
                            <HugeiconsIcon icon={Notification01Icon} />
                        </Button>
                    </motion.div>

                    <motion.div
                        variants={fadeDown}
                        className="hidden items-center gap-2 md:flex"
                    >
                        <Avatar
                            size="sm"
                            className='border-0! size-5.5! ring-0!'
                        >
                            <AvatarImage src="/avatar/orange.jpg" />
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
                                                <Link
                                                    to="/r"
                                                    onClick={() => setMobileNavOpen(false)}
                                                    className="rounded-lg px-2 py-2 text-sm"
                                                >
                                                    {m["navigation.items.resources"]()}
                                                </Link>
                                                {navItems.map((item) => (
                                                    <Link
                                                        key={item.label}
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

            {typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {resourcesOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.14 }}
                            onMouseEnter={cancelClose}
                            onMouseLeave={scheduleClose}
                            style={{ top: navHeight }}
                            className={cn(
                                "fixed inset-x-0 z-40 border-b border-border/35 bg-background/5 shadow-lg",
                                'backdrop-blur'
                            )}
                        >
                            <div className="container mx-auto grid grid-cols-2 gap-x-8 gap-y-6 py-7 md:grid-cols-4">
                                {resourceGroups.map((group) => (
                                    <div key={group.label} className="flex flex-col gap-1">
                                        <h6>{group.label}</h6>
                                        {group.items.map((item) => (
                                            <Link
                                                key={item.label}
                                                to={item.to}
                                                className={cn(
                                                    "flex items-start gap-3 rounded-xl p-2.5",
                                                    "transition-colors hover:bg-muted",
                                                )}
                                            >
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                                                    <HugeiconsIcon icon={group.icon} className="size-4" />
                                                </span>
                                                <span className="flex min-w-0 flex-col">
                                                    <strong>{item.label}</strong>
                                                    <p>{item.description}</p>
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body,
            )}
        </motion.header >
    )
}
