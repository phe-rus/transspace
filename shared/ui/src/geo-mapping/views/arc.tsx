import { GeoJSONSource } from "maplibre-gl"
import { animate } from "motion"
import { useEffect, useId } from "react"
import { useGeoMap } from "../context"
import { createArcCoordinates } from "../lib/arc-path"
import type { ArcPaint, LngLat } from "../types"

export interface GeoArcProps {
  from: LngLat
  to: LngLat
  paint?: ArcPaint
  /** Draws the arc in over `durationSeconds` instead of placing it instantly. Default true. */
  animated?: boolean
  durationSeconds?: number
}

/**
 * A curved connection between two points, rendered as a real MapLibre
 * source + line layer (not a DOM overlay) so it stays correctly projected
 * while panning and zooming. The draw-in reveal is driven by `motion`'s
 * standalone `animate()`, progressively widening the line's own GeoJSON
 * coordinate list rather than a CSS transition, since MapLibre paint
 * properties don't tween arbitrary geometry.
 *
 * `map.setStyle()` (e.g. from `GeoLayersControl`) discards every custom
 * source and layer, so this also re-adds itself on the map's `style.load`
 * event, not only on mount.
 */
export function GeoArc({ from, to, paint, animated = true, durationSeconds = 1.2 }: GeoArcProps) {
  const map = useGeoMap()
  const rawId = useId().replace(/:/g, "-")
  const sourceId = `geo-arc-source-${rawId}`
  const layerId = `geo-arc-layer-${rawId}`

  useEffect(() => {
    if (!map) return

    const fullCoordinates = createArcCoordinates(from, to)
    let playback: { stop: () => void } | undefined

    const addArc = () => {
      playback?.stop()
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: animated ? [fullCoordinates[0]] : fullCoordinates,
          },
        },
      })

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": paint?.lineColor ?? "#D4736E",
          "line-width": paint?.lineWidth ?? 2,
          "line-opacity": paint?.lineOpacity ?? 0.85,
          ...(paint?.lineDasharray ? { "line-dasharray": paint.lineDasharray } : {}),
        },
      })

      playback = animated
        ? animate(0, 1, {
            duration: durationSeconds,
            ease: "easeInOut",
            onUpdate: (progress) => {
              const source = map.getSource(sourceId)
              if (!(source instanceof GeoJSONSource)) return
              const count = Math.max(2, Math.round(fullCoordinates.length * progress))
              source.setData({
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: fullCoordinates.slice(0, count) },
              })
            },
          })
        : undefined
    }

    addArc()
    map.on("style.load", addArc)

    return () => {
      map.off("style.load", addArc)
      playback?.stop()
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
  }, [
    map,
    sourceId,
    layerId,
    from,
    to,
    animated,
    durationSeconds,
    paint?.lineColor,
    paint?.lineWidth,
    paint?.lineOpacity,
    paint?.lineDasharray,
  ])

  return null
}
