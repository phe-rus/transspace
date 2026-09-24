import type { ResourceCategory, ResourceSubcategory } from "@/data/resource-categories"

export interface AtlasResource {
  id: string
  name: string
  category: ResourceCategory
  /** Absent for `crisis`, which has no subcategories. */
  subcategory?: ResourceSubcategory
  country: string
  city: string
  position: [number, number]
  /** Illustrative only, not a verified live figure: no backend or real
   * submission data exists yet (see docs/scope/scope.md, feature 9). */
  estimate: string
  verified: boolean
  /** Illustrative only. How the community says this place is best reached. */
  contact?: string
  /** Whether this listing says it takes people from outside its own country. */
  internationalAccess?: boolean
  /** A short, one-line description shown on the Explore list card. */
  description: string
  /** A few service tags shown on the resource detail page. Illustrative only. */
  services?: string[]
  /** How recently the community re-verified this listing, e.g. "3 weeks ago". */
  lastReviewed?: string
  /** How many community members have reported back on this listing. */
  communityReportsCount?: number
  /** A couple of anonymized community quotes shown on the resource detail page. */
  reviews?: { quote: string; postedAt: string }[]
}

export const atlasResources: AtlasResource[] = [
  { id: "ber-health", name: "Rosa Wellness Clinic", category: "health", subcategory: "gender-affirmation-health", country: "Germany", city: "Berlin", position: [13.43, 52.505], estimate: "Free consult · ~3 weeks", verified: true, contact: "Booking form on their site, replies in ~2 days", internationalAccess: true, description: "Gender affirming primary care, hormone therapy, and trans-inclusive mental health referrals. Sliding scale available.", services: ["Hormone therapy (informed consent)", "Primary care", "Mental health referrals", "Sliding scale billing"], lastReviewed: "3 weeks ago", communityReportsCount: 14, reviews: [
    { quote: "Front desk used my chosen name without me having to correct them. Sliding scale actually happened, not just advertised.", postedAt: "5 days ago" },
    { quote: "Wait time was about three weeks for a first hormone consult, worth it for how respectful the intake was.", postedAt: "3 weeks ago" },
  ] },
  { id: "ber-housing", name: "Kreuzberg Sanctuary", category: "housing", subcategory: "safe-space", country: "Germany", city: "Berlin", position: [13.403, 52.499], estimate: "Free · same day", verified: true, description: "Shared housing with a no-questions-asked intake for trans and non-binary tenants. Priority for housing emergencies." },
  { id: "ber-legal", name: "Berlin Legal Aid Desk", category: "legal", country: "Germany", city: "Berlin", position: [13.38, 52.51], estimate: "Free consult · ~1 week", verified: false, description: "Pro bono support for legal gender marker and name changes, plus asylum casework for LGBTQIA+ applicants." },
  { id: "ber-pharmacy", name: "Kreuzberg Hormone-Friendly Pharmacy", category: "health", subcategory: "healthcare-providers", country: "Germany", city: "Berlin", position: [13.41, 52.49], estimate: "Walk-in", verified: true, description: "Stocks hormone therapy without extra questions at the counter. Walk-in, no appointment needed." },
  { id: "ber-general", name: "Kreuzberg Family Practice", category: "health", subcategory: "general-health", country: "Germany", city: "Berlin", position: [13.42, 52.495], estimate: "€10-30 · ~1 week", verified: true, description: "General practitioners taking new trans patients for routine checkups, vaccinations, and referrals, no dysphoria assessment required." },

  { id: "ams-health", name: "Amstel Trans Health Centre", category: "health", subcategory: "healthcare-providers", country: "Netherlands", city: "Amsterdam", position: [4.895, 52.37], estimate: "€0-50 · ~2 weeks", verified: true, description: "Hormone therapy and gender-affirming referrals, coordinated with the public health system." },
  { id: "ams-housing", name: "Canal House Shelter", category: "housing", subcategory: "safe-space", country: "Netherlands", city: "Amsterdam", position: [4.88, 52.365], estimate: "Free · same day", verified: false, description: "Short-term emergency shelter with a trans-specific intake track." },

  { id: "tor-health", name: "Toronto Trans Health Collective", category: "health", subcategory: "healthcare-providers", country: "Canada", city: "Toronto", position: [-79.38, 43.65], estimate: "Public · ~4 weeks", verified: true, description: "Publicly funded hormone therapy and surgery referral letters." },
  { id: "tor-legal", name: "Rainbow Legal Clinic", category: "legal", country: "Canada", city: "Toronto", position: [-79.4, 43.66], estimate: "Free consult", verified: true, description: "Free legal consults for name change, ID documents, and discrimination cases." },

  { id: "ba-community", name: "Casa Trans Buenos Aires", category: "community", subcategory: "support", country: "Argentina", city: "Buenos Aires", position: [-58.4, -34.6], estimate: "Free · drop-in", verified: true, description: "A drop-in community space with peer support circles most weekday evenings." },
  { id: "ba-health", name: "Hospital Gender Unit (public)", category: "health", subcategory: "gender-affirmation-health", country: "Argentina", city: "Buenos Aires", position: [-58.42, -34.61], estimate: "Public · ~6 weeks", verified: false, description: "Public hospital gender unit offering hormone therapy under Argentina's gender identity law." },

  { id: "mx-health", name: "Condesa Community Clinic", category: "health", subcategory: "mental-health", country: "Mexico", city: "Mexico City", position: [-99.16, 19.41], estimate: "Free · ~2 weeks", verified: true, description: "Free HIV care and hormone therapy with a long-standing trans-inclusive practice." },
  { id: "mx-housing", name: "Casa Refugio Trans", category: "housing", subcategory: "safe-space", country: "Mexico", city: "Mexico City", position: [-99.13, 19.43], estimate: "Free · same day", verified: true, description: "Emergency shelter for trans people fleeing violence, same-day intake." },

  { id: "bkk-health", name: "Bangkok Rainbow Clinic", category: "health", subcategory: "gender-affirmation-health", country: "Thailand", city: "Bangkok", position: [100.5, 13.75], estimate: "$20-80 · ~1 week", verified: true, description: "Hormone therapy and surgical consultation for both residents and international visitors." },
  { id: "bkk-community", name: "Sisters Community Foundation", category: "community", subcategory: "support", country: "Thailand", city: "Bangkok", position: [100.53, 13.73], estimate: "Free · drop-in", verified: false, description: "Peer-led community support and outreach, focused on trans women." },

  { id: "cpt-health", name: "Cape Town Gender Health Centre", category: "health", subcategory: "gender-affirmation-health", country: "South Africa", city: "Cape Town", position: [18.42, -33.92], estimate: "Public · ~3 weeks", verified: false, description: "Public gender health clinic offering hormone therapy and referrals." },
  { id: "cpt-legal", name: "Triangle Rights Project", category: "legal", country: "South Africa", city: "Cape Town", position: [18.47, -33.93], estimate: "Free consult", verified: true, description: "Legal aid for gender marker changes and workplace discrimination cases." },

  { id: "nbo-health", name: "Nairobi Community Health Point", category: "health", subcategory: "mental-health", country: "Kenya", city: "Nairobi", position: [36.82, -1.29], estimate: "Free HIV testing & treatment", verified: true, description: "Free, confidential HIV testing and treatment support, community recommended." },

  { id: "nyc-health", name: "Lower Manhattan Trans Health", category: "health", subcategory: "healthcare-providers", country: "United States", city: "New York", position: [-74.0, 40.71], estimate: "Insurance/sliding scale · ~2 weeks", verified: true, description: "Full-spectrum trans health care, accepts most insurance plans with a sliding-scale option." },
  { id: "nyc-legal", name: "NYC Name Change Clinic", category: "legal", country: "United States", city: "New York", position: [-73.98, 40.75], estimate: "Free consult", verified: true, description: "Free walk-in clinics for legal name and gender marker changes." },
  { id: "la-community", name: "LA Trans Wellness Center", category: "community", subcategory: "support", country: "United States", city: "Los Angeles", position: [-118.24, 34.05], estimate: "Free · drop-in", verified: false, description: "Drop-in wellness center with peer support groups and case management." },
  { id: "chi-housing", name: "Chicago Safe Housing Network", category: "housing", subcategory: "safe-space", country: "United States", city: "Chicago", position: [-87.63, 41.88], estimate: "Free · same day", verified: false, description: "Emergency and transitional housing placements for LGBTQIA+ youth and adults." },

  { id: "syd-health", name: "Sydney Rainbow Health", category: "health", subcategory: "gender-affirmation-health", country: "Australia", city: "Sydney", position: [151.21, -33.87], estimate: "Public/free · ~2 weeks", verified: true, description: "Medicare-bulk-billed hormone therapy and gender-affirming care." },
  { id: "syd-housing", name: "Twenty10 Youth Housing", category: "housing", subcategory: "safe-space", country: "Australia", city: "Sydney", position: [151.2, -33.88], estimate: "Free · same day", verified: true, description: "Youth-focused emergency housing with a dedicated LGBTQIA+ intake process." },
  { id: "mel-general", name: "Melbourne Community Health Centre", category: "health", subcategory: "general-health", country: "Australia", city: "Melbourne", position: [144.96, -37.81], estimate: "Bulk-billed · ~2 weeks", verified: false, description: "Bulk-billed general practice with staff trained in trans-inclusive care for everyday health needs." },

  { id: "del-community", name: "Mitr Community Trust", category: "community", subcategory: "support", country: "India", city: "Delhi", position: [77.21, 28.65], estimate: "Free · drop-in", verified: false, description: "Community trust running peer support and outreach for hijra and trans communities." },
  { id: "del-legal", name: "Delhi Rights Legal Cell", category: "legal", country: "India", city: "Delhi", position: [77.23, 28.63], estimate: "Free consult", verified: true, description: "Legal aid cell for ID documents and rights under India's Transgender Persons Act." },

  { id: "lon-health", name: "CliniQ London", category: "health", subcategory: "mental-health", country: "United Kingdom", city: "London", position: [-0.1, 51.51], estimate: "Free (public) · ~4 weeks", verified: true, contact: "Email intake, no referral needed", internationalAccess: false, description: "Sexual health and wellbeing clinic for trans people, no GP referral required." },
  { id: "lon-housing", name: "London Youth Safe House", category: "housing", subcategory: "safe-space", country: "United Kingdom", city: "London", position: [-0.13, 51.5], estimate: "Free · same day", verified: false, description: "Emergency safe house for LGBTQIA+ youth aged 16 to 25." },

  { id: "peer-hub", name: "Peer Support Hub", category: "community", subcategory: "support", country: "Canada", city: "Montreal", position: [-73.6, 45.5], estimate: "Free · drop-in", verified: false, description: "Peer-run support meetups, drop in without booking ahead." },
  { id: "safe-network", name: "Safe Space Network", category: "housing", subcategory: "safe-space", country: "Thailand", city: "Bangkok", position: [100.5, 13.7], estimate: "Free · same day", verified: false, description: "A network of vetted, trans-friendly short-term housing hosts." },
  { id: "crisis-line", name: "Cross-Border Crisis Line", category: "crisis", country: "Global", city: "Remote", position: [13.46, 52.53], estimate: "Free · 24/7", verified: true, contact: "Phone or chat, any country", internationalAccess: true, description: "24/7 crisis line staffed by trained volunteers, available regardless of where you're calling from." },

  { id: "trans-travel-network", name: "Trans Travel Safety Network", category: "travel", country: "Global", city: "Remote", position: [2.35, 48.86], estimate: "Free · community reports", verified: true, internationalAccess: true, description: "Crowdsourced border-crossing reports flagging which airports and checkpoints have been safe or hostile for trans travelers recently." },
  { id: "id-document-advisory", name: "ID Document Travel Advisory", category: "travel", country: "Global", city: "Remote", position: [-0.13, 51.5], estimate: "Free · guide", verified: false, internationalAccess: true, description: "A living list of which countries recognize an X gender marker or a name change made abroad, and what to carry as backup proof." },
]
