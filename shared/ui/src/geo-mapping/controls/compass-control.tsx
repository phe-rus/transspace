import { Navigation01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "cn"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { Button } from "../../components/button"
import { useGeoMap } from "../context"

export interface GeoCompassControlProps {
  className?: string
}

/** Resets bearing/pitch to north on click; the needle tracks live bearing. */
export function GeoCompassControl({ className }: GeoCompassControlProps) {
  const map = useGeoMap()
  const [bearing, setBearing] = useState(0)

  useEffect(() => {
    if (!map) return

    const update = () => setBearing(map.getBearing())
    update()
    map.on("rotate", update)
    return () => {
      map.off("rotate", update)
    }
  }, [map])

  return (
    <Button
      size="icon"
      variant="secondary"
      className={cn("rounded-full", className)}
      aria-label="Reset bearing to north"
      onClick={() => map?.easeTo({ bearing: 0, pitch: 0, duration: 300 })}
    >
      <motion.span
        className="flex"
        animate={{ rotate: -bearing }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
      >
        <HugeiconsIcon icon={Navigation01Icon} />
      </motion.span>
    </Button>
  )
}
