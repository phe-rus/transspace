import {
  Alert01Icon,
  CheckmarkCircle01Icon,
  FilterHorizontalIcon,
  Location01Icon,
  QuoteDownIcon,
  SearchIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import {
  GeoArc,
  GeoCompassControl,
  GeoLayersControl,
  GeoMap,
  GeoMarker,
  GeoPopup,
  GeoZoomControl,
  type LngLat,
} from "@pherus/ui/geo-mapping"
import { cn } from "@pherus/ui/lib/utils"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

export const Route = createFileRoute("/(public)/atlas")({
  component: RouteComponent,
})

function RouteComponent() {
  const [openPin, setOpenPin] = useState<string | null>(null)

  const berlin: LngLat = [13.405, 52.52]
  const kampala: LngLat = [32.5825, 0.3476]

  const pins: { id: string; label: string; icon: typeof Shield01Icon; position: LngLat }[] = [
    { id: "kreuzberg", label: "Kreuzberg Sanctuary", icon: Shield01Icon, position: [13.403, 52.499] },
    { id: "rosa", label: "Rosa Wellness Clinic", icon: Location01Icon, position: [13.43, 52.505] },
  ]

  const recentReportPosition: LngLat = [13.46, 52.53]

  return (
    <div className="relative -mt-11 h-svh w-full overflow-hidden">
      <GeoMap initialView={{ center: berlin, zoom: 11.5 }} className="absolute inset-0">
        {/* Berlin carries community knowledge shared with partner cities abroad. */}
        <GeoArc from={berlin} to={kampala} />

        {pins.map((pin) => (
          <GeoMarker
            key={pin.id}
            position={pin.position}
            onMouseEnter={() => setOpenPin(pin.id)}
            onMouseLeave={() => setOpenPin(null)}
          >
            <div className="flex cursor-pointer flex-col items-center gap-1.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-foreground/10">
                <HugeiconsIcon icon={pin.icon} className="size-4" />
              </span>
              <span className="rounded bg-background px-1 text-xs text-muted-foreground">{pin.label}</span>
            </div>
          </GeoMarker>
        ))}

        <GeoPopup position={pins[1].position} open={openPin === "rosa"} offset={44}>
          <p className="w-40">Free consult, community verified.</p>
        </GeoPopup>

        <GeoMarker position={recentReportPosition} anchorBottom={false}>
          <div className="flex flex-col items-center gap-1.5">
            <HugeiconsIcon icon={Alert01Icon} className="size-4.5 text-destructive" />
            <span className="text-xs text-destructive">Recent reports</span>
          </div>
        </GeoMarker>
      </GeoMap>

      <div className="pointer-events-none absolute inset-x-0 top-12 flex justify-center px-5">
        <div
          className={cn(
            "pointer-events-auto flex w-full max-w-md items-center gap-2.5 rounded-full",
            "border border-border/35 bg-card px-4.5 py-3 shadow",
          )}
        >
          <HugeiconsIcon icon={SearchIcon} className="size-4 text-muted-foreground" />
          <p className="flex-1">Search resources or areas…</p>
          <HugeiconsIcon icon={FilterHorizontalIcon} className="size-4 text-muted-foreground" />
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute top-12 right-5 flex items-center gap-1.5 rounded-full",
          "border border-border/35 bg-card px-3.5 py-2 text-xs text-muted-foreground",
        )}
      >
        <HugeiconsIcon icon={Shield01Icon} className="size-3.5 text-destructive" />
        Protected connection
      </div>

      <article
        className={cn(
          "pointer-events-none absolute bottom-5 left-5 flex w-full max-w-xs flex-col gap-3 rounded-3xl",
          "border border-border/35 bg-card/35 p-5 shadow-lg backdrop-blur",
        )}
      >
        <div className="flex items-center justify-between">
          <h3>Rosa Wellness Clinic</h3>
          <p>Free consult</p>
        </div>
        <h6 className="flex items-center gap-1.5">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3.5" />
          Community verified clinic
        </h6>
        <p>
          Gender affirming primary care with an informed consent model. Sliding scale billing, entrance from the
          side courtyard.
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-border p-2.5">
            <h6>Wait time</h6>
            <p className="text-foreground">~ 3 weeks</p>
          </div>
          <div className="rounded-xl border border-border p-2.5">
            <h6>Location</h6>
            <p className="text-foreground">Exact</p>
          </div>
        </div>
        <div className="flex items-start gap-2 border-t border-border pt-3">
          <HugeiconsIcon icon={QuoteDownIcon} className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="italic">"Very quiet entrance, no questions asked, felt safe." Anonymous, 2h ago</p>
        </div>
        <Button size="sm" className="pointer-events-auto rounded-full">View resource</Button>
      </article>

      <div className="absolute right-5 bottom-6 flex flex-col gap-2.5">
        <GeoZoomControl />
        <GeoCompassControl />
        <GeoLayersControl />
      </div>
    </div>
  )
}
