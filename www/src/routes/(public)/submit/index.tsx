import { useTurnstileToken } from "@/components/turnstile-provider"
import {
  RESOURCE_CATEGORIES,
  RESOURCE_SUBCATEGORIES_BY_CATEGORY,
  resourceCategoryColor,
  resourceCategoryLabel,
  type ResourceCategory,
} from "@/data/resource-categories"
import { submitResource } from "@/domains/resources"
import { submitFormDefaults, submitFormSchema } from "@/domains/resources/submit-form"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { notifyError } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { Shield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { useAppForm } from "@pherus/ui/form"
import { cn } from "@pherus/ui/lib/utils"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/submit/")({
  loader: ({ context }) =>
    context.queryClient.query({
      ...authGateQueryOptions(),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: authGate } = useSuspenseQuery(authGateQueryOptions())
  const mutation = useMutation({
    mutationFn: submitResource,
    onError: notifyError,
  })
  const getTurnstileToken = useTurnstileToken()

  const form = useAppForm({
    defaultValues: submitFormDefaults,
    onSubmit: async ({ value }) => {
      let turnstileToken: string
      try {
        turnstileToken = await getTurnstileToken()
      } catch (error) {
        await notifyError(error)
        return
      }
      await mutation.mutateAsync({
        data: {
          name: value.name,
          category: value.category,
          subcategory: value.subcategory || undefined,
          countryName: value.countryName,
          city: value.city,
          description: value.description,
          estimate: value.estimate || undefined,
          contact: value.contact || undefined,
          internationalAccess: value.internationalAccess,
          isFree: value.isFree,
          tier: value.category === "health" && value.isDiy ? "diy" : undefined,
          turnstileToken,
        },
      })
    },
  })

  if (!authGate.signedIn) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.submit.title"]()}</h1>
        <p>{m["pages.submit.signInRequired"]()}</p>
        <Button nativeButton={false} render={<Link to="/auth" />} className="rounded-full">
          {m["pages.submit.signIn"]()}
        </Button>
      </article>
    )
  }

  if (mutation.isSuccess) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.submit.successTitle"]()}</h1>
        <p>{m["pages.submit.successBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/r" />} className="rounded-full">
          {m["pages.resources.detail.backToResources"]()}
        </Button>
      </article>
    )
  }

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.submit.title"]()}</h1>
        <p className="max-w-lg">
          {m["pages.submit.subtitle"]()}
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
        className="flex flex-col gap-5"
      >
        <form.AppField
          name="name"
          validators={{ onChange: submitFormSchema.shape.name }}
        >
          {(field) => (
            <field.TextField
              label={m["pages.submit.resourceName"]()}
              placeholder={m["pages.submit.resourceNamePlaceholder"]()}
            />
          )}
        </form.AppField>

        <form.Field name="category">
          {(categoryField) => (
            <form.Field name="subcategory">
              {(subcategoryField) => {
                const category = categoryField.state.value as ResourceCategory | ""
                const subcategories = category
                  ? RESOURCE_SUBCATEGORIES_BY_CATEGORY[category]
                  : []

                return (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <h6>{m["pages.submit.category"]()}</h6>
                      <div className="flex flex-wrap gap-1.5">
                        {RESOURCE_CATEGORIES.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              categoryField.handleChange(
                                categoryField.state.value === item ? "" : item,
                              )
                              subcategoryField.handleChange("")
                            }}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                              categoryField.state.value === item
                                ? "border-foreground bg-foreground text-background"
                                : "border-border text-muted-foreground hover:border-muted-foreground",
                            )}
                          >
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: resourceCategoryColor[item] }}
                            />
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
                              onClick={() =>
                                subcategoryField.handleChange(
                                  subcategoryField.state.value === item ? "" : item,
                                )
                              }
                              className={cn(
                                "rounded-full border px-3.5 py-2 text-sm transition-colors",
                                subcategoryField.state.value === item
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
                  </>
                )
              }}
            </form.Field>
          )}
        </form.Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <form.AppField
            name="countryName"
            validators={{ onChange: submitFormSchema.shape.countryName }}
          >
            {(field) => <field.TextField label={m["pages.submit.country"]()} placeholder="Germany" />}
          </form.AppField>
          <form.AppField
            name="city"
            validators={{ onChange: submitFormSchema.shape.city }}
          >
            {(field) => <field.TextField label={m["pages.submit.city"]()} placeholder="Berlin" />}
          </form.AppField>
        </div>

        <form.AppField name="estimate">
          {(field) => (
            <field.TextField
              label={m["pages.submit.estimate"]()}
              placeholder={m["pages.submit.estimatePlaceholder"]()}
            />
          )}
        </form.AppField>

        <form.AppField name="isFree">
          {(field) => <field.CheckboxField label={m["pages.submit.isFree"]()} />}
        </form.AppField>

        <form.AppField name="contact">
          {(field) => (
            <field.TextField
              label={m["pages.submit.contact"]()}
              placeholder={m["pages.submit.contactPlaceholder"]()}
            />
          )}
        </form.AppField>

        <form.AppField
          name="description"
          validators={{ onChange: submitFormSchema.shape.description }}
        >
          {(field) => (
            <field.TextareaField
              label={m["pages.submit.description"]()}
              placeholder={m["pages.submit.descriptionPlaceholder"]()}
              className="min-h-28"
            />
          )}
        </form.AppField>

        <form.AppField name="internationalAccess">
          {(field) => <field.CheckboxField label={m["pages.submit.internationalAccess"]()} />}
        </form.AppField>

        <form.Subscribe selector={(state) => state.values.category}>
          {(category) =>
            category === "health" && (
              <form.AppField name="isDiy">
                {(field) => <field.CheckboxField label={m["pages.submit.isDiy"]()} />}
              </form.AppField>
            )
          }
        </form.Subscribe>

        <div className="flex items-center gap-3 rounded-3xl border border-border p-5">
          <HugeiconsIcon icon={Shield01Icon} className="size-4.5 shrink-0" />
          <p>
            <strong className="text-foreground">{m["pages.submit.privacyNoteStrong"]()}</strong> {m["pages.submit.privacyNote"]()}
          </p>
        </div>

        <form.Subscribe
          selector={(state) => [state.values, state.isSubmitting] as const}
        >
          {([values, isSubmitting]) => {
            const canSubmit =
              values.name.trim().length > 0 &&
              values.category.length > 0 &&
              values.countryName.trim().length > 0 &&
              values.city.trim().length > 0 &&
              values.description.trim().length > 0
            return (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || mutation.isPending}
                  className="h-11 w-full rounded-full px-6 sm:w-auto"
                >
                  {isSubmitting || mutation.isPending
                    ? m["pages.submit.submitting"]()
                    : m["pages.submit.submit"]()}
                </Button>
              </div>
            )
          }}
        </form.Subscribe>
      </form>
    </article>
  )
}
