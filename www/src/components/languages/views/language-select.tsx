import { getNativeLanguageName } from "@/lib/intl.displayNames"
import { getLocale, locales } from "@/paraglide/runtime"
import { Check, ChevronDown, Globe, SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import {
    AnimatePresence,
    motion,
    useDragControls,
    useMotionValue,
    useReducedMotion,
    type Variants,
} from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { DEFAULT_ANCHOR, type Anchor, type Edge, type Side } from "../types"
import { selectLocale, setStoreAnchor, useStoreAnchor } from "../useLocals"

const VIEWPORT_PADDING = 12

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

const listContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.035, delayChildren: 0.05 },
    },
    exit: {
        opacity: 0,
        transition: { staggerChildren: 0.02, staggerDirection: -1, when: "afterChildren" },
    },
}

const listItem: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", damping: 22, stiffness: 380 },
    },
    exit: { opacity: 0, transition: { duration: 0.1 } },
}

function restPosition(anchor: Anchor, rect: DOMRect) {
    const left = anchor.side === "left" ? anchor.x : window.innerWidth - anchor.x - rect.width
    const top = anchor.edge === "top" ? anchor.y : window.innerHeight - anchor.y - rect.height
    return { left, top }
}

function clampAnchor(anchor: Anchor, rect: DOMRect): Anchor {
    const { left, top } = restPosition(anchor, rect)
    const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - rect.width - VIEWPORT_PADDING)
    const maxTop = Math.max(VIEWPORT_PADDING, window.innerHeight - rect.height - VIEWPORT_PADDING)
    const nextLeft = clamp(left, VIEWPORT_PADDING, maxLeft)
    const nextTop = clamp(top, VIEWPORT_PADDING, maxTop)

    const side: Side = nextLeft + rect.width / 2 < window.innerWidth / 2 ? "left" : "right"
    const edge: Edge = nextTop + rect.height / 2 < window.innerHeight / 2 ? "top" : "bottom"

    return {
        side,
        edge,
        x: side === "left" ? nextLeft : window.innerWidth - nextLeft - rect.width,
        y: edge === "top" ? nextTop : window.innerHeight - nextTop - rect.height,
    }
}

export function LanguageSelect() {
    const containerRef = useRef<HTMLDivElement>(null)
    const dragControls = useDragControls()
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const didDrag = useRef(false)
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [anchor, setAnchor] = useState(DEFAULT_ANCHOR)
    const reduceMotion = useReducedMotion()

    const langs = useMemo(
        () =>
            Array.from(locales, (value) => ({
                value,
                label: getNativeLanguageName(value),
                code: value.toUpperCase(),
            })),
        []
    )

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return langs
        return langs.filter(
            (l) => l.label.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
        )
    }, [langs, query])

    const showSearch = langs.length > 6

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const stored = useStoreAnchor()
        setAnchor(clampAnchor(stored ?? DEFAULT_ANCHOR, el.getBoundingClientRect()))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        function handleResize() {
            const el = containerRef.current
            if (!el) return
            setAnchor((prev) => {
                const next = clampAnchor(prev, el.getBoundingClientRect())
                setStoreAnchor(next)
                return next
            })
        }
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    useEffect(() => {
        if (!open) return
        function handlePointerDown(e: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false)
        }
        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [open])

    useEffect(() => {
        if (!open) setQuery("")
    }, [open])

    function clampDrag() {
        const el = containerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const { left, top } = restPosition(anchor, rect)
        x.set(clamp(x.get(), VIEWPORT_PADDING - left, window.innerWidth - VIEWPORT_PADDING - rect.width - left))
        y.set(clamp(y.get(), VIEWPORT_PADDING - top, window.innerHeight - VIEWPORT_PADDING - rect.height - top))
    }

    function commitDraggedPosition() {
        const el = containerRef.current
        if (!el) return
        clampDrag()
        const rect = el.getBoundingClientRect()
        const side: Side = rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right"
        const edge: Edge = rect.top + rect.height / 2 < window.innerHeight / 2 ? "top" : "bottom"
        const next: Anchor = {
            side,
            edge,
            x: side === "left" ? rect.left : window.innerWidth - rect.right,
            y: edge === "top" ? rect.top : window.innerHeight - rect.bottom,
        }
        setAnchor(next)
        setStoreAnchor(next)
        x.set(0)
        y.set(0)
    }

    const growsUp = anchor.edge === "bottom"
    const currentLocale = getLocale()

    return (
        <motion.div
            ref={containerRef}
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0}
            style={{
                position: "fixed",
                x,
                y,
                ...(anchor.side === "left" ? { left: anchor.x } : { right: anchor.x }),
                ...(anchor.edge === "top" ? { top: anchor.y } : { bottom: anchor.y }),
            }}
            onDragStart={() => {
                didDrag.current = false
            }}
            onDrag={() => {
                didDrag.current = true
                clampDrag()
            }}
            onDragEnd={commitDraggedPosition}
            className="z-50"
        >
            <motion.div
                layout
                transition={{
                    type: "spring",
                    damping: 26,
                    stiffness: 360,
                    mass: 0.7
                }}
                className={cn(
                    "flex overflow-hidden",
                    growsUp ? "flex-col-reverse" : "flex-col",
                    open && cn(
                        'bg-background shadow-md no-scrollbar!',
                        'border border-border rounded-xl'
                    )
                )}
            >
                <Button
                    type="button"
                    variant='secondary'
                    size="sm"
                    aria-label={`Languages — ${getNativeLanguageName(currentLocale)}`}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    title={getNativeLanguageName(currentLocale)}
                    onPointerDown={(e) => dragControls.start(e)}
                    onClick={() => {
                        if (didDrag.current) {
                            didDrag.current = false
                            return
                        }
                        setOpen((prev) => !prev)
                    }}
                    className="justify-end w-fit ml-auto h-9 gap-1.5 rounded-full px-3"
                >
                    <HugeiconsIcon icon={Globe} className="shrink-0" />
                    <span className="font-semibold tracking-wide">
                        {currentLocale.toUpperCase()}
                    </span>
                    <motion.span
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ type: "spring", damping: 18, stiffness: 320 }}
                        className="shrink-0"
                    >
                        <HugeiconsIcon icon={ChevronDown} className="size-3.5" />
                    </motion.span>
                </Button>

                <AnimatePresence>
                    {open && (
                        <motion.div
                            key="lang-panel"
                            role="listbox"
                            initial={
                                reduceMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: growsUp ? 6 : -6 }
                            }
                            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: growsUp ? 4 : -4 }}
                            transition={{ type: "spring", damping: 26, stiffness: 340 }}
                            className={cn(
                                "flex w-48 flex-col gap-1 p-1 no-scrollbar",
                                growsUp ? "mb-1" : "mt-1"
                            )}
                        >
                            {showSearch && (
                                <div className="relative">
                                    <HugeiconsIcon
                                        icon={SearchIcon}
                                        className={cn(
                                            "pointer-events-none absolute left-2",
                                            'top-1/2 size-3.5 -translate-y-1/2'
                                        )}
                                    />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search…"
                                        className={cn(
                                            "h-8 w-full rounded-md border border-input bg-transparent",
                                            'pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground',
                                            'focus-visible:ring-2 focus-visible:ring-ring'
                                        )}
                                    />
                                </div>
                            )}

                            <motion.div
                                variants={listContainer}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
                            >
                                {filtered.map((item) => {
                                    const active = item.value === currentLocale
                                    return (
                                        <motion.button
                                            key={item.value}
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            variants={listItem}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setOpen(false)
                                                if (!active) selectLocale(item.value)
                                            }}
                                            className={cn(
                                                "flex items-center justify-between gap-2 rounded-md px-1 text-left",
                                                active
                                                    ? "bg-accent text-accent-foreground"
                                                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <span className="flex min-w-0 items-center gap-2.5">
                                                <span className="shrink-0 text-sm text-center font-semibold uppercase">
                                                    {item.code}
                                                </span>
                                                <span className="truncate">{item.label}</span>
                                            </span>
                                            <AnimatePresence>
                                                {active && (
                                                    <motion.span
                                                        initial={{ opacity: 0, scale: 0.5 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.5 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="shrink-0"
                                                    >
                                                        <HugeiconsIcon
                                                            icon={Check}
                                                            className="size-4.5"
                                                            strokeWidth={2.5}
                                                        />
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                    )
                                })}

                                {filtered.length === 0 && (
                                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                                        No languages found
                                    </p>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}