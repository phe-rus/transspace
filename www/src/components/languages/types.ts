export const POSITION_STORAGE_KEY = "transspace"
export type Side = "left" | "right"
export type Edge = "top" | "bottom"
export type Anchor = {
    side: Side
    edge: Edge
    x: number
    y: number
}
export const DEFAULT_ANCHOR: Anchor = {
    side: "right",
    edge: "bottom",
    x: 20,
    y: 20,
}