import type { ResourceCategory } from "@/data/resource-categories"

export interface AtlasZoneItem {
  name: string
  /** Illustrative only, not a verified live figure. See AtlasResource. */
  estimate: string
}

export interface AtlasZone {
  id: string
  name: string
  country: string
  category: ResourceCategory
  position: [number, number]
  /**
   * "country" zones lean on the real border already drawn by
   * AtlasFlaggedBorders, the marker here is just a click target, not a
   * claim about precise geography. "area" zones (a specific town/district)
   * are the ones where imprecision is the actual safety mechanism: they
   * render as a real geo-anchored circle (AtlasAreaZone), not a fixed-pixel
   * marker, so the covered ground stays constant at any zoom instead of
   * shrinking toward the exact building the whole feature exists to hide.
   */
  scope: "country" | "area"
  /** Real-world radius in km. Required (and only meaningful) for "area" zones. */
  radiusKm?: number
  /**
   * True for a region where being specific about an exact address is a real
   * safety risk. `items` and `safetyNote` still exist, but a real app would
   * only reveal them to a signed-in, community-trusted account, simulated
   * here as a locked panel state, since no authentication exists yet
   * (scope.md: "needs a decision").
   */
  gated: boolean
  summary: string
  items?: AtlasZoneItem[]
  safetyNote?: string
  /** Illustrative only. How the community says this place is best reached. */
  contact?: string
}

export const atlasZones: AtlasZone[] = [
  {
    id: "flag-uganda",
    name: "Uganda",
    country: "Uganda",
    category: "crisis",
    position: [32.3, 1.4],
    scope: "country",
    gated: true,
    summary: "Legal and safety guidance for this country has not been community verified yet, so specifics stay locked until it has.",
  },
  {
    id: "flag-saudi",
    name: "Saudi Arabia",
    country: "Saudi Arabia",
    category: "crisis",
    position: [45.0, 24.0],
    scope: "country",
    gated: true,
    summary: "Legal and safety guidance for this country has not been community verified yet, so specifics stay locked until it has.",
  },
  {
    id: "flag-brunei",
    name: "Brunei",
    country: "Brunei",
    category: "crisis",
    position: [114.7, 4.5],
    scope: "country",
    gated: true,
    summary: "Legal and safety guidance for this country has not been community verified yet, so specifics stay locked until it has.",
  },
  {
    id: "wandegeya",
    name: "Wandegeya area",
    country: "Uganda",
    category: "health",
    position: [32.571, 0.338],
    scope: "area",
    radiusKm: 6,
    gated: true,
    summary: "A pharmacy in this area is known to carry hormone therapy. The whole neighborhood is shown, not an exact address, and that stays true at any zoom level.",
    items: [
      { name: "Estrogen", estimate: "~32,000 UGX · strip of 28 tablets" },
      { name: "Progesterone", estimate: "~28,000 UGX · strip of 10" },
      { name: "Testosterone", estimate: "~45,000 UGX · vial" },
    ],
    safetyNote: "Uganda's Anti-Homosexuality Act criminalizes aspects of LGBTQIA+ life. Exact locations are withheld for safety; discretion is strongly advised.",
    contact: "Ask in person only. No phone or online contact is used for this listing.",
  },
]
