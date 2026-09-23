import { useMap } from "@pherus/ui/map"
import { useEffect } from "react"

export interface AtlasAutoRotateProps {
  degreesPerSecond?: number
  /** Stops rotating once zoomed in past this level, since a spinning globe stops reading as a globe. */
  maxZoom?: number
}

/**
 * Idly rotates the globe, the way Google Earth's opening view does, until
 * the visitor drags or scrolls. Not part of mapcn's own component set, so
 * kept as a small app-level addition alongside the map rather than in the
 * shared library.
 */
export function AtlasAutoRotate({ degreesPerSecond = 3, maxZoom = 4 }: AtlasAutoRotateProps) {
  const { map } = useMap()

  useEffect(() => {
    if (!map) return
    let frame: number
    let interacting = false
    let lastTime: number | null = null

    const stop = () => {
      interacting = true
    }
    const resume = () => {
      interacting = false
      lastTime = null
    }

    const spin = (time: number) => {
      if (lastTime === null) lastTime = time
      const deltaSeconds = (time - lastTime) / 1000
      lastTime = time

      if (!interacting && map.getZoom() < maxZoom) {
        const center = map.getCenter()
        center.lng -= degreesPerSecond * deltaSeconds
        map.setCenter(center)
      }
      frame = requestAnimationFrame(spin)
    }

    map.on("dragstart", stop)
    map.on("wheel", stop)
    map.on("dragend", resume)
    frame = requestAnimationFrame(spin)

    return () => {
      cancelAnimationFrame(frame)
      map.off("dragstart", stop)
      map.off("wheel", stop)
      map.off("dragend", resume)
    }
  }, [map, degreesPerSecond, maxZoom])

  return null
}
