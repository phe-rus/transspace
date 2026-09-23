export type LngLat = [longitude: number, latitude: number]

export interface GeoMapViewState {
  center: LngLat
  zoom: number
  bearing?: number
  pitch?: number
}

export interface MapMarkerDatum<T = unknown> {
  id: string
  position: LngLat
  data?: T
}

export interface MapArcDatum<T = unknown> {
  id: string
  from: LngLat
  to: LngLat
  data?: T
}

export interface ArcPaint {
  lineColor?: string
  lineWidth?: number
  lineOpacity?: number
  lineDasharray?: [number, number]
}
