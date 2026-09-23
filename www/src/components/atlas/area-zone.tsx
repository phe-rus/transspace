import type { AtlasZone } from "@/data/atlas-zones"
import { resourceCategoryColor, resourceCategoryIcon } from "@/data/resource-categories"
import { createCircleGeoJSON } from "@/lib/geo-circle"
import { HugeiconsIcon } from "@hugeicons/react"
import { MapGeoJSON, MapMarker, MarkerContent, MarkerLabel } from "@pherus/ui/map"
import { useMemo } from "react"

export interface AtlasAreaZoneProps {
  zone: AtlasZone
  onSelect: (zone: AtlasZone) => void
}

/**
 * The town/district-level counterpart to a country flag: a real geo-anchored
 * circle (see createCircleGeoJSON) covering `zone.radiusKm`, not a
 * fixed-pixel marker. A fixed-pixel "vague area" indicator covers less and
 * less real ground the further a visitor zooms in, until it eventually
 * pinpoints the exact building it was meant to obscure, this stays the
 * same real size at any zoom instead. A small icon marks the center purely
 * for identification; clicking either the fill or the icon selects the zone.
 */
export function AtlasAreaZone({ zone, onSelect }: AtlasAreaZoneProps) {
  const color = resourceCategoryColor[zone.category]
  const icon = resourceCategoryIcon[zone.category]
  const radiusKm = zone.radiusKm ?? 5

  const circle = useMemo(
    () => ({ type: "FeatureCollection" as const, features: [createCircleGeoJSON(zone.position, radiusKm)] }),
    [zone.position, radiusKm],
  )

  return (
    <>
      <MapGeoJSON
        data={circle}
        fillPaint={{ "fill-color": color, "fill-opacity": 0.16 }}
        linePaint={{ "line-color": color, "line-width": 1.5, "line-opacity": 0.5 }}
        interactive
        onClick={() => onSelect(zone)}
      />
      <MapMarker longitude={zone.position[0]} latitude={zone.position[1]} onClick={() => onSelect(zone)}>
        <MarkerContent>
          <div className="relative flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
            <HugeiconsIcon icon={icon} className="relative size-4 text-white" />
            <MarkerLabel>{zone.name}</MarkerLabel>
          </div>
        </MarkerContent>
      </MapMarker>
    </>
  )
}
