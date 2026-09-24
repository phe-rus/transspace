import { m } from "@/paraglide/messages"
import {
  RESOURCE_CATEGORIES,
  RESOURCE_SUBCATEGORIES_BY_CATEGORY,
  resourceCategoryColor,
  resourceCategoryLabel,
  type ResourceCategory,
} from "@/data/resource-categories"
import { Shield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { Input } from "@pherus/ui/input"
import { cn } from "@pherus/ui/lib/utils"
import { Textarea } from "@pherus/ui/textarea"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

export const Route = createFileRoute("/(public)/submit/")({
  component: RouteComponent,
})

function RouteComponent() {
  const [name, setName] = useState("")
  const [category, setCategory] = useState<ResourceCategory | null>(null)
  const [subcategory, setSubcategory] = useState<string | null>(null)
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [estimate, setEstimate] = useState("")
  const [contact, setContact] = useState("")
  const [description, setDescription] = useState("")
  const [internationalAccess, setInternationalAccess] = useState(false)

  const subcategories = category ? RESOURCE_SUBCATEGORIES_BY_CATEGORY[category] : []

  return (
    <article className="container mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.submit.title"]()}</h1>
        <p className="max-w-lg">
          {m["pages.submit.subtitle"]()}
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submit.resourceName"]()}</h6>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={m["pages.submit.resourceNamePlaceholder"]()} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submit.category"]()}</h6>
          <div className="flex flex-wrap gap-1.5">
            {RESOURCE_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setCategory((current) => (current === item ? null : item))
                  setSubcategory(null)
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                  category === item
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-muted-foreground",
                )}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: resourceCategoryColor[item] }} />
                {resourceCategoryLabel[item]}
              </button>
            ))}
          </div>
        </div>

        {subcategories.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <h6>{m["pages.submit.moreSpecifically"]()}</h6>
            <div className="flex flex-wrap gap-1.5">
              {subcategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSubcategory((current) => (current === item ? null : item))}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-sm transition-colors",
                    subcategory === item
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-muted-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <h6>{m["pages.submit.country"]()}</h6>
            <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Germany" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h6>{m["pages.submit.city"]()}</h6>
            <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Berlin" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submit.estimate"]()}</h6>
          <Input
            value={estimate}
            onChange={(event) => setEstimate(event.target.value)}
            placeholder={m["pages.submit.estimatePlaceholder"]()}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submit.contact"]()}</h6>
          <Input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder={m["pages.submit.contactPlaceholder"]()}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submit.description"]()}</h6>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={m["pages.submit.descriptionPlaceholder"]()}
            className="min-h-28"
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={internationalAccess}
            onChange={(event) => setInternationalAccess(event.target.checked)}
            className="accent-success"
          />
          {m["pages.submit.internationalAccess"]()}
        </label>

        <div className="flex items-center gap-3 rounded-3xl border border-border p-5">
          <HugeiconsIcon icon={Shield01Icon} className="size-4.5 shrink-0" />
          <p>
            <strong className="text-foreground">{m["pages.submit.privacyNoteStrong"]()}</strong> {m["pages.submit.privacyNote"]()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled className="h-11 rounded-full px-6">
            {m["pages.submit.submit"]()}
          </Button>
          <p>{m["pages.submit.notPartOfBuild"]()}</p>
        </div>
      </form>
    </article>
  )
}
