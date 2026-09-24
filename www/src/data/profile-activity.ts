/**
 * Illustrative only, no backend or real accounts/submissions exist yet.
 * Mirrors the "River" placeholder profile from the UX wireframes.
 */
export interface SavedResourceEntry {
  id: string
  name: string
  category: string
}

export const savedResources: SavedResourceEntry[] = [
  { id: "rosa-wellness", name: "Rosa Wellness Clinic", category: "Health care" },
  { id: "kolibri-housing", name: "Kolibri Housing Cooperative", category: "Safe housing" },
]

export type SubmissionStatus = "pending" | "approved"

export interface SubmissionEntry {
  id: string
  title: string
  status: SubmissionStatus
}

export const mySubmissions: SubmissionEntry[] = [
  { id: "recht-regenbogen", title: "Recht & Regenbogen Legal Aid", status: "pending" },
  { id: "healthcare-uganda", title: "Finding healthcare in Uganda", status: "approved" },
]
