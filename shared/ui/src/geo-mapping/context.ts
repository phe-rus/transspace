import type { MapLibreMap } from "maplibre-gl"
import { createContext, useContext } from "react"

export const GeoMapContext = createContext<MapLibreMap | null>(null)

export function useGeoMap(): MapLibreMap | null {
  return useContext(GeoMapContext)
}

export function useRequiredGeoMap(): MapLibreMap {
  const map = useGeoMap()
  if (!map) {
    throw new Error("useRequiredGeoMap must be used within a <GeoMap>, once it has loaded.")
  }
  return map
}
