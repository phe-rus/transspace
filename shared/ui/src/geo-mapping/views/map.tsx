import { MapLibreMap } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { cn } from "cn"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { GeoMapContext } from "../context"
import type { GeoMapViewState } from "../types"

export const geoMapStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
} as const

export interface GeoMapProps {
  initialView: GeoMapViewState
  styleUrl?: string
  className?: string
  children?: ReactNode
}

export function GeoMap({ initialView, styleUrl = geoMapStyles.dark, className, children }: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const instance = new MapLibreMap({
      container: containerRef.current,
      style: styleUrl,
      center: initialView.center,
      zoom: initialView.zoom,
      bearing: initialView.bearing ?? 0,
      pitch: initialView.pitch ?? 0,
      attributionControl: { compact: true },
    })

    mapRef.current = instance
    instance.once("load", () => setMap(instance))

    return () => {
      instance.remove()
      mapRef.current = null
      setMap(null)
    }
    // initialView is only read once, on mount: re-centering a live map is done
    // imperatively via useGeoMap(), not by re-mounting the whole instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl])

  return (
    <div ref={containerRef} className={cn("relative size-full overflow-hidden", className)}>
      <GeoMapContext.Provider value={map}>{map && children}</GeoMapContext.Provider>
    </div>
  )
}
