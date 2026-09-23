import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "cn"
import { motion } from "motion/react"
import { Button } from "../../components/button"
import { useGeoMap } from "../context"

export interface GeoZoomControlProps {
  className?: string
}

/** A styled replacement for MapLibre's default (unstyled) zoom buttons. */
export function GeoZoomControl({ className }: GeoZoomControlProps) {
  const map = useGeoMap()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col overflow-hidden rounded-full border border-border bg-card", className)}
    >
      <Button
        size="icon-sm"
        variant="ghost"
        className="rounded-none"
        aria-label="Zoom in"
        onClick={() => map?.zoomIn()}
      >
        <HugeiconsIcon icon={PlusSignIcon} />
      </Button>
      <span className="h-px w-full bg-border" />
      <Button
        size="icon-sm"
        variant="ghost"
        className="rounded-none"
        aria-label="Zoom out"
        onClick={() => map?.zoomOut()}
      >
        <HugeiconsIcon icon={MinusSignIcon} />
      </Button>
    </motion.div>
  )
}
