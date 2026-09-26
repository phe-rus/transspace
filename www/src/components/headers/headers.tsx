import { amIModeratorQueryOptions } from "@/domains/moderators"
import { countPendingSupportPostsQueryOptions } from "@/domains/support"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { m } from "@/paraglide/messages"
import { ArrowDown01Icon, Menu03Icon, MessageIcon, Rocket01Icon, Shield01Icon, Stethoscope02Icon, UserGroup02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@pherus/ui/avatar"
import { Button, buttonVariants } from "@pherus/ui/button"
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
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

export const Headers = () => {
    // reads from the query cache the (public)/(protection) route guards
    // already populated for this navigation via queryClient.query(), so
    // this is a cache hit, not a second fetch
    const { data: authStatus } = useSuspenseQuery(authGateQueryOptions())
    const signedIn = authStatus.signedIn
    const { data: moderatorStatus } = useQuery({
        ...amIModeratorQueryOptions(),
        enabled: signedIn,
    })
    const isModerator = Boolean(moderatorStatus?.isModerator)
    const { data: pendingCount } = useQuery({
        ...countPendingSupportPostsQueryOptions(),
        enabled: isModerator,
        refetchInterval: 60_000,
    })
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const [resourcesOpen, setResourcesOpen] = useState(false)
    const [navHeight, setNavHeight] = useState(40)
    const headerRef = useRef<HTMLElement>(null)
    const openTimeout = useRef<number | undefined>(undefined)
    const closeTimeout = useRef<number | undefined>(undefined)
    const reduceMotion = useReducedMotion()

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
        { label: m["navigation.items.map"](), to: "/atlas" },
        { label: m["navigation.items.communities"](), to: "/r" },
        { label: m["navigation.items.support"](), to: "/support" },
        ...(signedIn ? [{ label: m["navigation.items.profile"](), to: "/profile" }] : []),
    ], [])

    const resourceGroups = useMemo(() => [
        {
            label: m["navigation.groups.health.label"](),
            icon: Stethoscope02Icon,
            items: [
                { label: m["navigation.groups.health.items.healthcareProviders.label"](), description: m["navigation.groups.health.items.healthcareProviders.description"](), to: "/r/healthcare-providers" },
                { label: m["navigation.groups.health.items.genderAffirmingCare.label"](), description: m["navigation.groups.health.items.genderAffirmingCare.description"](), to: "/r/gender-affirmation-health" },
                { label: m["navigation.groups.health.items.mentalHealth.label"](), description: m["navigation.groups.health.items.mentalHealth.description"](), to: "/r/mental-health" },
                { label: m["navigation.groups.health.items.generalHealth.label"](), description: m["navigation.groups.health.items.generalHealth.description"](), to: "/r/general-health" },
            ],
        },
        {
            label: m["navigation.groups.safety.label"](),
            icon: Shield01Icon,
            items: [
                { label: m["navigation.groups.safety.items.safeSpaces.label"](), description: m["navigation.groups.safety.items.safeSpaces.description"](), to: "/r/safe-space" },
                { label: m["navigation.groups.safety.items.legalAid.label"](), description: m["navigation.groups.safety.items.legalAid.description"](), to: "/r/legal" },
                { label: m["navigation.groups.safety.items.travel.label"](), description: m["navigation.groups.safety.items.travel.description"](), to: "/r/travel" },
            ],
        },
        {
            label: m["navigation.groups.getInvolved.label"](),
            icon: UserGroup02Icon,
            items: [
                { label: m["navigation.groups.getInvolved.items.storySubmissions.label"](), description: m["navigation.groups.getInvolved.items.storySubmissions.description"](), to: "/stories" },
                { label: m["navigation.groups.getInvolved.items.communitySupport.label"](), description: m["navigation.groups.getInvolved.items.communitySupport.description"](), to: "/support" },
            ],
        },
        {
            label: m["navigation.groups.grow.label"](),
            icon: Rocket01Icon,
            items: [
                { label: m["navigation.groups.grow.items.jobsAndCareers.label"](), description: m["navigation.groups.grow.items.jobsAndCareers.description"](), to: "/opportunities" },
                { label: m["navigation.groups.grow.items.skillsAndLearning.label"](), description: m["navigation.groups.grow.items.skillsAndLearning.description"](), to: "/guides" },
            ],
        },
    ], [])

    const mobileGroupVariants: Variants = useMemo(() => ({
        hidden: { opacity: 0, y: reduceMotion ? 0 : -6 },
        show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.3, ease: "easeOut" } },
    }), [reduceMotion])

    const mobileStagger: Variants = useMemo(() => ({
        hidden: {},
        show: { transition: { staggerChildren: reduceMotion ? 0 : 0.05 } },
    }), [reduceMotion])

    const inboxUnread = pendingCount?.count ?? 0
    const inboxLink = isModerator ? (
        <Link
            to="/inbox"
            className={cn(
                buttonVariants({ size: "icon", variant: "secondary" }),
                "relative rounded-full",
            )}
            aria-label={
                inboxUnread > 0
                    ? `${m["navigation.aria.inbox"]()} (${inboxUnread})`
                    : m["navigation.aria.inbox"]()
            }
        >
            <HugeiconsIcon icon={MessageIcon} />
            {inboxUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[11px]/none font-semibold text-destructive-foreground tabular-nums">
                    {inboxUnread > 99 ? "99+" : inboxUnread}
                </span>
            )}
        </Link>
    ) : null

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
                        {signedIn && <Link
                            to='/submit'
                            className={cn(buttonVariants({
                                variant: 'default',
                                className: "rounded-full",
                            }))}
                            aria-label={m["navigation.aria.privacy"]()}

                        >
                            <HugeiconsIcon icon={Shield01Icon} />
                            Submit a resource
                        </Link>}

                        {inboxLink}
                    </motion.div>

                    <motion.div
                        variants={fadeDown}
                        className="hidden items-center gap-2 md:flex"
                    >
                        {signedIn ?
                            <Link to="/profile" aria-label={m["navigation.items.profile"]()}>
                                <Avatar
                                    className='border-0! size-6! ring-0!'
                                >
                                    <AvatarImage src="/avatar/orange.jpg" />
                                    <AvatarFallback>AV</AvatarFallback>
                                </Avatar>
                            </Link> :
                            <Link
                                to="/auth"
                                className={cn(buttonVariants({
                                    variant: 'secondary'
                                }))}
                            >
                                Login to transspace
                            </Link>
                        }
                    </motion.div>

                    <motion.div
                        variants={fadeDown}
                        className="mr-1 flex items-center md:hidden"
                    >
                        {inboxLink}
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
                                        aria-label={m["navigation.aria.openMenu"]()}
                                    >
                                        <HugeiconsIcon icon={Menu03Icon} />
                                    </Button>
                                }
                            />
                            <DrawerPortal>
                                <DrawerBackdrop />
                                <DrawerViewport side="right">
                                    <DrawerPopup side="right">
                                        <DrawerContent className="overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <DrawerTitle>{m["navigation.title"]()}</DrawerTitle>
                                                <DrawerClose
                                                    render={
                                                        <Button
                                                            size="icon-sm"
                                                            variant="ghost"
                                                            aria-label={m["navigation.aria.closeMenu"]()}
                                                        >
                                                            <HugeiconsIcon icon={Menu03Icon} />
                                                        </Button>
                                                    }
                                                />
                                            </div>

                                            <motion.nav
                                                variants={mobileStagger}
                                                initial="hidden"
                                                animate={mobileNavOpen ? "show" : "hidden"}
                                                className="no-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto"
                                            >
                                                {resourceGroups.map((group) => (
                                                    <motion.div
                                                        key={group.label}
                                                        variants={mobileGroupVariants}
                                                        className="flex flex-col gap-0.5"
                                                    >
                                                        <h6 className="flex items-center gap-1.5 px-2.5 text-muted-foreground">
                                                            <HugeiconsIcon icon={group.icon} className="size-3.5" />
                                                            {group.label}
                                                        </h6>
                                                        {group.items.map((item) => (
                                                            <Link
                                                                key={item.label}
                                                                to={item.to}
                                                                onClick={() => setMobileNavOpen(false)}
                                                                className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted"
                                                                activeProps={{ className: "bg-muted" }}
                                                            >
                                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                                                    <HugeiconsIcon icon={group.icon} className="size-3.5" />
                                                                </span>
                                                                <span className="flex min-w-0 flex-col">
                                                                    <strong className="text-sm text-foreground">{item.label}</strong>
                                                                    <p className="text-xs">{item.description}</p>
                                                                </span>
                                                            </Link>
                                                        ))}
                                                    </motion.div>
                                                ))}

                                                <motion.div
                                                    variants={mobileGroupVariants}
                                                    className="flex flex-col gap-1 border-t border-border pt-4 pb-1"
                                                >
                                                    {navItems.map((item) => (
                                                        <Link
                                                            key={item.label}
                                                            to={item.to}
                                                            onClick={() => setMobileNavOpen(false)}
                                                            className="rounded-lg px-2.5 py-2 text-sm"
                                                            activeProps={{
                                                                className: "text-primary",
                                                            }}
                                                        >
                                                            {item.label}
                                                        </Link>
                                                    ))}
                                                </motion.div>
                                            </motion.nav>
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
                                "fixed inset-x-0 z-35 border-b border-border/35 bg-background/5",
                                'backdrop-blur shadow-lg opacity-100'
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
                                                    "transition-colors hover:bg-accent/35",
                                                )}
                                            >
                                                <span className={cn(
                                                    "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary",
                                                    'text-primary-foreground'
                                                )}>
                                                    <HugeiconsIcon icon={group.icon} className="size-5.5" />
                                                </span>
                                                <span className="flex min-w-0 flex-col">
                                                    <h3>{item.label}</h3>
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
