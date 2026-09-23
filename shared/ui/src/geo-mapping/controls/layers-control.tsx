import { Layers01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "cn"
import { useState } from "react"
import { Button } from "../../components/button"
import { useGeoMap } from "../context"
import { geoMapStyles } from "../views/map"

export interface GeoLayersControlProps {
  className?: string
}

/** Toggles the basemap between the dark and light CARTO styles. */
export function GeoLayersControl({ className }: GeoLayersControlProps) {
  const map = useGeoMap()
  const [dark, setDark] = useState(true)

  return (
    <Button
      size="icon"
      variant="secondary"
      className={cn("rounded-full", className)}
      aria-label="Toggle map style"
      onClick={() => {
        const next = !dark
        map?.setStyle(next ? geoMapStyles.dark : geoMapStyles.light)
        setDark(next)
      }}
    >
      <HugeiconsIcon icon={Layers01Icon} />
    </Button>
  )
}
