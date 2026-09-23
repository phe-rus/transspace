import { cn } from "cn"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useGeoMap } from "../context"
import type { LngLat } from "../types"

export interface GeoPopupProps {
  position: LngLat
  open: boolean
  offset?: number
  className?: string
  children?: React.ReactNode
}

/**
 * A screen-space overlay anchored to a coordinate, shown/hidden by `open`
 * rather than mounted/unmounted by the caller, so its own exit animation
 * always gets to play.
 */
export function GeoPopup({ position, open, offset = 14, className, children }: GeoPopupProps) {
  const map = useGeoMap()
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const [lng, lat] = position

  useEffect(() => {
    if (!map) return

    const update = () => setPoint(map.project([lng, lat]))
    update()
    map.on("move", update)
    map.on("resize", update)
    return () => {
      map.off("move", update)
      map.off("resize", update)
    }
  }, [map, lng, lat])

  if (!map || !point) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-none absolute -translate-x-1/2"
          style={{ left: point.x, top: point.y - offset }}
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.14 }}
        >
          <div
            className={cn(
              "pointer-events-auto relative -translate-y-full rounded-2xl border border-border",
              "bg-popover p-3 text-popover-foreground shadow-lg",
              className,
            )}
          >
            {children}
            <span
              aria-hidden
              className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[2px] border-r border-b border-border bg-popover"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    map.getContainer(),
  )
}
