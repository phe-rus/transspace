import type { Feature, Polygon } from "geojson"

/**
 * A circle of `radiusKm` around `center`, as a real GeoJSON polygon in
 * lng/lat, not a fixed-pixel marker. The distinction matters here: a
 * fixed-pixel "vague area" indicator covers less and less real ground the
 * further you zoom in, until it eventually pinpoints the exact building it
 * was meant to obscure. A geo-anchored circle keeps covering the same real
 * radius at any zoom, growing on screen instead of shrinking.
 */
export function createCircleGeoJSON(
  center: [number, number],
  radiusKm: number,
  points = 64,
): Feature<Polygon> {
  const [lng, lat] = center
  const kmPerDegreeLat = 110.574
  const kmPerDegreeLng = 111.32 * Math.cos((lat * Math.PI) / 180)

  const coordinates: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx = (radiusKm * Math.cos(angle)) / kmPerDegreeLng
    const dy = (radiusKm * Math.sin(angle)) / kmPerDegreeLat
    coordinates.push([lng + dx, lat + dy])
  }

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coordinates] },
  }
}
