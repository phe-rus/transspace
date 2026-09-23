import type { AtlasZone } from "@/data/atlas-zones"
import { resourceCategoryColor, resourceCategoryIcon } from "@/data/resource-categories"
import { HugeiconsIcon } from "@hugeicons/react"
import { MapMarker, MarkerContent, MarkerLabel } from "@pherus/ui/map"
import { motion } from "motion/react"

export interface AtlasCountryZoneProps {
  zone: AtlasZone
  onSelect: (zone: AtlasZone) => void
}

/**
 * A pulsing click target for a country-level flag. The real "large area"
 * claim comes from the actual border AtlasFlaggedBorders draws elsewhere.
 * This marker is just an entry point into the side panel, not itself a
 * geography claim, so a fixed-pixel ripple is fine here (unlike
 * AtlasAreaZone, where the pixel size *is* the safety claim).
 */
export function AtlasCountryZone({ zone, onSelect }: AtlasCountryZoneProps) {
  const color = resourceCategoryColor[zone.category]
  const icon = resourceCategoryIcon[zone.category]

  return (
    <MapMarker
      longitude={zone.position[0]}
      latitude={zone.position[1]}
      onClick={() => onSelect(zone)}
    >
      <MarkerContent>
        <div className="relative flex size-20 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: color, opacity: 0.18 }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.24, 0.08, 0.24] }}
            transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <span className="absolute inset-5 rounded-full" style={{ backgroundColor: color, opacity: 0.3 }} />
          <HugeiconsIcon icon={icon} className="relative size-4" style={{ color }} />
          <MarkerLabel>{zone.name}</MarkerLabel>
        </div>
      </MarkerContent>
    </MapMarker>
  )
}
