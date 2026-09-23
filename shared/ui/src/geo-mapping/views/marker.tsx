import { cn } from "cn"
import { motion, type HTMLMotionProps } from "motion/react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useGeoMap } from "../context"
import type { LngLat } from "../types"

export interface GeoMarkerProps extends Omit<HTMLMotionProps<"div">, "style"> {
  position: LngLat
  /** Anchors the element's bottom-center on the coordinate, like a pin tip. Default true. */
  anchorBottom?: boolean
}

const defaultSpring = { type: "spring", damping: 20, stiffness: 300 } as const

/**
 * A React-owned DOM overlay kept in screen-space sync with the map via
 * `project()`, not `maplibregl.Marker` — the point is a plain element you
 * can animate with `motion` and re-render like any other component.
 */
export function GeoMarker({
  position,
  anchorBottom = true,
  className,
  initial = { opacity: 0, scale: 0.5 },
  animate = { opacity: 1, scale: 1 },
  exit = { opacity: 0, scale: 0.5 },
  transition = defaultSpring,
  ...motionProps
}: GeoMarkerProps) {
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
    <motion.div
      className={cn(
        "pointer-events-auto absolute -translate-x-1/2",
        anchorBottom ? "-translate-y-full" : "-translate-y-1/2",
        className,
      )}
      style={{ left: point.x, top: point.y }}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      {...motionProps}
    />,
    map.getContainer(),
  )
}
