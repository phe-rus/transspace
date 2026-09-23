import { MapGeoJSON } from "@pherus/ui/map"
import type { Feature, FeatureCollection, Geometry } from "geojson"
import { useEffect, useState } from "react"

const WORLD_COUNTRIES_URL = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"

export interface AtlasFlaggedBordersProps {
  /**
   * Exact `name` values from the source GeoJSON (e.g. "Uganda"). MapGeoJSON
   * has no built-in per-feature filter, so this fetches the world borders
   * once and passes only the matching features through, every country not
   * listed is left exactly as the basemap already draws it.
   */
  countryNames: string[]
  color?: string
}

export function AtlasFlaggedBorders({ countryNames, color = "#E4604D" }: AtlasFlaggedBordersProps) {
  const [filtered, setFiltered] = useState<FeatureCollection<Geometry, { name: string }> | null>(null)
  const namesKey = countryNames.join(",")

  useEffect(() => {
    let cancelled = false
    fetch(WORLD_COUNTRIES_URL)
      .then((response) => response.json() as Promise<FeatureCollection<Geometry, { name: string }>>)
      .then((geojson) => {
        if (cancelled) return
        setFiltered({
          type: "FeatureCollection",
          features: geojson.features.filter((feature: Feature<Geometry, { name: string }>) =>
            namesKey.split(",").includes(feature.properties?.name ?? ""),
          ),
        })
      })
    return () => {
      cancelled = true
    }
    // namesKey (a stable primitive derived from countryNames) is the real
    // dependency; the array itself would restart this fetch on every
    // re-render of a caller that doesn't memoize it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey])

  if (!filtered) return null

  return (
    <MapGeoJSON
      data={filtered}
      fillPaint={false}
      linePaint={{ "line-color": color, "line-width": 1.5, "line-opacity": 0.9 }}
    />
  )
}
