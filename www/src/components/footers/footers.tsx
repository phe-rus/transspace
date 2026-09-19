import { cn } from "@pherus/ui/lib/utils"
import { Link } from "@tanstack/react-router"
import { motion, type Variants } from "motion/react"
import { useMemo } from "react"

const container: Variants = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.06 },
    },
}

const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
    },
}

const FOOTER_COLUMNS = [
    {
        title: "Resources",
        items: [
            { label: "Resources", to: "/" },
            { label: "Opportunities", to: "/" },
            { label: "Legal", to: "/" },
            { label: "Learn new skills", to: "/" },
            { label: "The fog of history", to: "/" },
        ],
    },
    {
        title: "Resources",
        items: [
            { label: "Resources", to: "/" },
            { label: "Opportunities", to: "/" },
            { label: "Legal", to: "/" },
            { label: "Learn new skills", to: "/" },
            { label: "The fog of history", to: "/" },
        ],
    },
    {
        title: "Resources",
        items: [
            { label: "Resources", to: "/" },
            { label: "Opportunities", to: "/" },
            { label: "Legal", to: "/" },
            { label: "Learn new skills", to: "/" },
            { label: "The fog of history", to: "/" },
        ],
    },
] as const

export const Footers = () => {
    const year = useMemo(() => new Date().getFullYear(), [])

    return (
        <motion.footer
            className="flex flex-col bg-muted"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
        >
            <section
                className={cn(
                    "container mx-auto flex w-full flex-col gap-5 py-20",
                    "md:max-w-5xl",
                )}
            >
                <div className="grid w-full grid-cols-12 gap-5">
                    <motion.div
                        variants={item}
                        className="col-span-12 flex flex-col md:col-span-5"
                    >
                        <h1 className="text-base">Transspace</h1>
                        <p>
                            A platform designed by Pherus around Q2Q
                            (Queer-to-Queer) knowledge sharing. Built with
                            love, trust, and absolute discretion to serve the
                            global LGBTQIA+ community.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={item}
                        className="col-span-12 flex flex-col md:col-span-7"
                    >
                        <div className="w-fit columns-2 gap-5 md:ml-auto lg:columns-3">
                            {FOOTER_COLUMNS.map((column) => (
                                <div
                                    key={column.title}
                                    className="mb-5 flex flex-col break-inside-avoid"
                                >
                                    <h2 className="text-base">{column.title}</h2>

                                    <div className="flex flex-col">
                                        {column.items.map((link) => (
                                            <Link
                                                key={link.label}
                                                to={link.to}
                                                className="transition-colors hover:text-primary"
                                            >
                                                {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                <span className="h-px w-full bg-primary/35" />

                <motion.div
                    variants={item}
                    className="flex flex-col"
                >
                    <span className="text-sm">
                        © {year} Transspace & Pherus. Non-corporate independent
                        platform.
                    </span>

                    <span>shared</span>
                </motion.div>
            </section>
        </motion.footer>
    )
}