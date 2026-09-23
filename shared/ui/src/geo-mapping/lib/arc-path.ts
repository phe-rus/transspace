import type { LngLat } from "../types"

/**
 * A quadratic-bezier arc between two points, lifted perpendicular to the
 * straight line by `heightRatio` of the distance between them. Not a
 * geodesic: a flat-map approximation, the same shortcut most arc/flight-path
 * visualizations use, since a true great-circle only reads as "arced" on a
 * globe projection.
 */
export function createArcCoordinates(
  from: LngLat,
  to: LngLat,
  segments = 64,
  heightRatio = 0.35,
): LngLat[] {
  const [fx, fy] = from
  const [tx, ty] = to
  const dx = tx - fx
  const dy = ty - fy
  const distance = Math.hypot(dx, dy)

  if (distance === 0) return [from, to]

  const midX = (fx + tx) / 2
  const midY = (fy + ty) / 2
  const perpX = -dy / distance
  const perpY = dx / distance
  const controlX = midX + perpX * distance * heightRatio
  const controlY = midY + perpY * distance * heightRatio

  const coordinates: LngLat[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const oneMinusT = 1 - t
    const x = oneMinusT ** 2 * fx + 2 * oneMinusT * t * controlX + t ** 2 * tx
    const y = oneMinusT ** 2 * fy + 2 * oneMinusT * t * controlY + t ** 2 * ty
    coordinates.push([x, y])
  }
  return coordinates
}
