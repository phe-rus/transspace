import { useTurnstileToken } from "@/components/turnstile-provider"
import {
  SUPPORT_POST_TYPES,
  directionForType,
  type SupportPostType,
} from "@/data/support-types"
import { plainText } from "@/data/rich-text"
import { SUPPORT_FIELDS_BY_TYPE } from "@/data/support-fields"
import { submitSupportPost } from "@/domains/support"
import {
  submitSupportFormDefaults,
  submitSupportFormSchema,
} from "@/domains/support/submit-form"
import { sortedCountryOptions } from "@/data/countries"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { notifyError } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { Shield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { Checkbox } from "@pherus/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@pherus/ui/field"
import { useAppForm } from "@pherus/ui/form"
import { Input } from "@pherus/ui/input"
import { cn } from "@pherus/ui/lib/utils"
import { Editor } from "@pherus/rich-text"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pherus/ui/select"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"

export const Route = createFileRoute("/(public)/submit-support/")({
  loader: ({ context }) =>
    context.queryClient.query({
      ...authGateQueryOptions(),
      staleTime: "static",
    }),
  component: RouteComponent,
})

const TYPE_LABEL_KEY: Record<SupportPostType, string> = {
  request_general: "pages.submitSupport.types.request_general",
  request_info: "pages.submitSupport.types.request_info",
  request_food: "pages.submitSupport.types.request_food",
  request_financial: "pages.submitSupport.types.request_financial",
  request_travel: "pages.submitSupport.types.request_travel",
  offer_job: "pages.submitSupport.types.offer_job",
  offer_travel: "pages.submitSupport.types.offer_travel",
  offer_listening: "pages.submitSupport.types.offer_listening",
  offer_general: "pages.submitSupport.types.offer_general",
  offer_professional: "pages.submitSupport.types.offer_professional",
}

const TYPE_DESCRIPTION_KEY: Record<SupportPostType, string> = {
  request_general: "pages.submitSupport.typeDescriptions.request_general",
  request_info: "pages.submitSupport.typeDescriptions.request_info",
  request_food: "pages.submitSupport.typeDescriptions.request_food",
  request_financial: "pages.submitSupport.typeDescriptions.request_financial",
  request_travel: "pages.submitSupport.typeDescriptions.request_travel",
  offer_job: "pages.submitSupport.typeDescriptions.offer_job",
  offer_travel: "pages.submitSupport.typeDescriptions.offer_travel",
  offer_listening: "pages.submitSupport.typeDescriptions.offer_listening",
  offer_general: "pages.submitSupport.typeDescriptions.offer_general",
  offer_professional: "pages.submitSupport.typeDescriptions.offer_professional",
}

const FIELD_LABEL_KEY: Record<string, string> = {
  description: "pages.submitSupport.fields.description",
  writtenCase: "pages.submitSupport.fields.writtenCase",
  targetAmount: "pages.submitSupport.fields.targetAmount",
  currency: "pages.submitSupport.fields.currency",
  portions: "pages.submitSupport.fields.portions",
  area: "pages.submitSupport.fields.area",
  timeframe: "pages.submitSupport.fields.timeframe",
  role: "pages.submitSupport.fields.role",
  compensation: "pages.submitSupport.fields.compensation",
  remoteOrLocal: "pages.submitSupport.fields.remoteOrLocal",
  about: "pages.submitSupport.fields.about",
  format: "pages.submitSupport.fields.format",
  howToApply: "pages.submitSupport.fields.howToApply",
  org: "pages.submitSupport.fields.org",
  whatIsOffered: "pages.submitSupport.fields.whatIsOffered",
  availability: "pages.submitSupport.fields.availability",
  languages: "pages.submitSupport.fields.languages",
  topics: "pages.submitSupport.fields.topics",
  profession: "pages.submitSupport.fields.profession",
  licenseOrRegistrationNumber:
    "pages.submitSupport.fields.licenseOrRegistrationNumber",
  jurisdiction: "pages.submitSupport.fields.jurisdiction",
  context: "pages.submitSupport.fields.context",
}

const FIELD_DESCRIPTION_KEY: Record<string, string> = {
  description: "pages.submitSupport.fieldDescriptions.description",
  writtenCase: "pages.submitSupport.fieldDescriptions.writtenCase",
  targetAmount: "pages.submitSupport.fieldDescriptions.targetAmount",
  currency: "pages.submitSupport.fieldDescriptions.currency",
  portions: "pages.submitSupport.fieldDescriptions.portions",
  area: "pages.submitSupport.fieldDescriptions.area",
  timeframe: "pages.submitSupport.fieldDescriptions.timeframe",
  role: "pages.submitSupport.fieldDescriptions.role",
  compensation: "pages.submitSupport.fieldDescriptions.compensation",
  remoteOrLocal: "pages.submitSupport.fieldDescriptions.remoteOrLocal",
  about: "pages.submitSupport.fieldDescriptions.about",
  format: "pages.submitSupport.fieldDescriptions.format",
  howToApply: "pages.submitSupport.fieldDescriptions.howToApply",
  org: "pages.submitSupport.fieldDescriptions.org",
  whatIsOffered: "pages.submitSupport.fieldDescriptions.whatIsOffered",
  availability: "pages.submitSupport.fieldDescriptions.availability",
  languages: "pages.submitSupport.fieldDescriptions.languages",
  topics: "pages.submitSupport.fieldDescriptions.topics",
  profession: "pages.submitSupport.fieldDescriptions.profession",
  licenseOrRegistrationNumber:
    "pages.submitSupport.fieldDescriptions.licenseOrRegistrationNumber",
  jurisdiction: "pages.submitSupport.fieldDescriptions.jurisdiction",
  context: "pages.submitSupport.fieldDescriptions.context",
}

// m["..."]() keys are only ever bracket-string literals in this app, so
// this helper reads from the flattened message map by string, matching
// the paraglide-generated dot-path export exactly
function messageByKey(key: string): string {
  return (m as unknown as Record<string, () => string>)[key]()
}

function fieldLabel(name: string): string {
  const key = FIELD_LABEL_KEY[name]
  return key ? messageByKey(key) : name
}

function fieldDescription(name: string): string | undefined {
  const key = FIELD_DESCRIPTION_KEY[name]
  return key ? messageByKey(key) : undefined
}

function typeLabel(type: SupportPostType): string {
  return messageByKey(TYPE_LABEL_KEY[type])
}

function typeDescription(type: SupportPostType): string {
  return messageByKey(TYPE_DESCRIPTION_KEY[type])
}

const REQUEST_TYPES = SUPPORT_POST_TYPES.filter(
  (type) => directionForType(type) === "request"
)
const OFFER_TYPES = SUPPORT_POST_TYPES.filter(
  (type) => directionForType(type) === "offer"
)

function RouteComponent() {
  const { data: authGate } = useSuspenseQuery(authGateQueryOptions())
  const submitMutation = useMutation({
    mutationFn: submitSupportPost,
    onError: notifyError,
  })
  const getTurnstileToken = useTurnstileToken()
  const countryOptions = useMemo(() => sortedCountryOptions(getLocale()), [])

  const form = useAppForm({
    defaultValues: submitSupportFormDefaults,
    onSubmit: async ({ value }) => {
      const type = value.type as SupportPostType
      const config = SUPPORT_FIELDS_BY_TYPE[type]
      const structuredDetails: Record<string, unknown> = {}
      for (const field of config) {
        const raw = value.fields[field.name]
        if (field.kind === "textarea" ? plainText(raw).trim() === "" : !raw) {
          continue
        }
        structuredDetails[field.name] =
          field.kind === "number" ? Number(raw) : raw
      }
      // fetched right before the write, not held in form state; keeps
      // one Turnstile widget for the whole app instead of one per form
      let turnstileToken: string
      try {
        turnstileToken = await getTurnstileToken()
      } catch (error) {
        await notifyError(error)
        return
      }
      await submitMutation.mutateAsync({
        data: {
          type,
          title: value.title,
          structuredDetails,
          visibilityTier: value.visibilityTier,
          requestorCountryCode: value.requestorCountryCode,
          isUrgent:
            directionForType(type) === "request" ? value.isUrgent : undefined,
          isRecurring:
            directionForType(type) === "offer" ? value.isRecurring : undefined,
          turnstileToken,
        },
      })
    },
  })

  if (!authGate.signedIn) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.submitSupport.title"]()}</h1>
        <p>{m["pages.submitSupport.signInRequired"]()}</p>
        <Button nativeButton={false} render={<Link to="/auth" />} className="rounded-full">
          {m["pages.submitSupport.signIn"]()}
        </Button>
      </article>
    )
  }

  if (submitMutation.isSuccess) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.submitSupport.successTitle"]()}</h1>
        <p>{m["pages.submitSupport.successBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/support" />} className="rounded-full">
          {m["pages.submitSupport.backToSupport"]()}
        </Button>
      </article>
    )
  }

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.submitSupport.title"]()}</h1>
        <p className="max-w-lg">{m["pages.submitSupport.subtitle"]()}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
        className="flex flex-col gap-5"
      >
        <form.Field name="type">
          {(field) => (
            <Field>
              <FieldLabel>{m["pages.submitSupport.typeLabel"]()}</FieldLabel>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">
                  {m["pages.submitSupport.typeRequestGroup"]()}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {REQUEST_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => field.handleChange(type)}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-sm transition-colors",
                        field.state.value === type
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      )}
                    >
                      {typeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">
                  {m["pages.submitSupport.typeOfferGroup"]()}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {OFFER_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => field.handleChange(type)}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-sm transition-colors",
                        field.state.value === type
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      )}
                    >
                      {typeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>
              {field.state.value && (
                <FieldDescription>
                  {typeDescription(field.state.value as SupportPostType)}
                </FieldDescription>
              )}
            </Field>
          )}
        </form.Field>

        <form.Field
          name="title"
          validators={{ onChange: submitSupportFormSchema.shape.title }}
        >
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  {m["pages.submitSupport.titleFieldLabel"]()}
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder={m["pages.submitSupport.titlePlaceholder"]()}
                  aria-invalid={isInvalid}
                />
                <FieldDescription>
                  {fieldDescription("title")}
                </FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field
          name="requestorCountryCode"
          validators={{
            onChange: submitSupportFormSchema.shape.requestorCountryCode,
          }}
        >
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  {m["pages.submitSupport.countryLabel"]()}
                </FieldLabel>
                <Select
                  value={field.state.value || undefined}
                  onValueChange={(value) => field.handleChange(value as string)}
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder={m["pages.submitSupport.countryPlaceholder"]()} />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {m["pages.submitSupport.countryDescription"]()}
                </FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.type}>
          {(type) => {
            if (!type) return null
            const config = SUPPORT_FIELDS_BY_TYPE[type as SupportPostType]
            return (
              <div className="flex flex-col gap-5">
                {config.map((field) => (
                  <form.Field key={field.name} name={`fields.${field.name}`}>
                    {(f) => {
                      const raw = f.state.value as unknown
                      // long text fields hold an editor document, so length
                      // and emptiness are judged on its readable text
                      const value =
                        field.kind === "textarea"
                          ? plainText(raw)
                          : typeof raw === "string"
                            ? raw
                            : ""
                      const isInvalid =
                        f.state.meta.isTouched &&
                        ((field.required && !value) ||
                          (field.minLength !== undefined &&
                            value.length > 0 &&
                            value.length < field.minLength))
                      const errorMessage = !value
                        ? m["pages.submitSupport.fieldRequired"]()
                        : m["pages.submitSupport.fieldTooShort"]({
                            count: field.minLength ?? 0,
                          })

                      if (field.kind === "select") {
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={f.name}>
                              {fieldLabel(field.name)}
                            </FieldLabel>
                            <Select
                              value={value || undefined}
                              onValueChange={(v) => f.handleChange(v as string)}
                            >
                              <SelectTrigger id={f.name} className="w-full">
                                <SelectValue placeholder={fieldLabel(field.name)} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {messageByKey(
                                      `pages.submitSupport.fields.remoteOrLocalOptions.${option}`
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {fieldDescription(field.name) && (
                              <FieldDescription>
                                {fieldDescription(field.name)}
                              </FieldDescription>
                            )}
                          </Field>
                        )
                      }

                      if (field.kind === "textarea") {
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={f.name}>
                              {fieldLabel(field.name)}
                            </FieldLabel>
                            <Editor
                              value={raw as never}
                              onChange={(doc) => f.handleChange(doc as never)}
                              onBlur={f.handleBlur}
                              placeholder={m["pages.submitSupport.richPlaceholder"]()}
                              className="min-h-40"
                            />
                            {field.minLength !== undefined && (
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {value.length}/{field.minLength}{" "}
                                {m["pages.submitSupport.charactersMinimum"]()}
                              </p>
                            )}
                            {fieldDescription(field.name) && (
                              <FieldDescription>
                                {fieldDescription(field.name)}
                              </FieldDescription>
                            )}
                            {isInvalid && (
                              <FieldError errors={[{ message: errorMessage }]} />
                            )}
                          </Field>
                        )
                      }

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={f.name}>
                            {fieldLabel(field.name)}
                          </FieldLabel>
                          <Input
                            id={f.name}
                            name={f.name}
                            type={field.kind === "number" ? "number" : "text"}
                            value={value}
                            onBlur={f.handleBlur}
                            onChange={(event) =>
                              f.handleChange(event.target.value)
                            }
                            aria-invalid={isInvalid}
                          />
                          {fieldDescription(field.name) && (
                            <FieldDescription>
                              {fieldDescription(field.name)}
                            </FieldDescription>
                          )}
                          {isInvalid && (
                            <FieldError errors={[{ message: errorMessage }]} />
                          )}
                        </Field>
                      )
                    }}
                  </form.Field>
                ))}

                {directionForType(type as SupportPostType) === "request" && (
                  <form.Field name="isUrgent">
                    {(field) => (
                      <Field>
                        <FieldLabel className="flex w-fit items-center gap-2.5">
                          <Checkbox
                            checked={field.state.value}
                            onCheckedChange={(checked) =>
                              field.handleChange(checked)
                            }
                          />
                          {m["pages.submitSupport.urgentLabel"]()}
                        </FieldLabel>
                      </Field>
                    )}
                  </form.Field>
                )}

                {directionForType(type as SupportPostType) === "offer" && (
                  <form.Field name="isRecurring">
                    {(field) => (
                      <Field>
                        <FieldLabel className="flex w-fit items-center gap-2.5">
                          <Checkbox
                            checked={field.state.value}
                            onCheckedChange={(checked) =>
                              field.handleChange(checked)
                            }
                          />
                          {m["pages.submitSupport.recurringLabel"]()}
                        </FieldLabel>
                      </Field>
                    )}
                  </form.Field>
                )}
              </div>
            )
          }}
        </form.Subscribe>

        <form.Field name="visibilityTier">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                {m["pages.submitSupport.visibilityLabel"]()}
              </FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(value as typeof field.state.value)
                }
              >
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    {m["pages.submitSupport.visibility.public"]()}
                  </SelectItem>
                  <SelectItem value="sensitive">
                    {m["pages.submitSupport.visibility.sensitive"]()}
                  </SelectItem>
                  <SelectItem value="critical">
                    {m["pages.submitSupport.visibility.critical"]()}
                  </SelectItem>
                  <SelectItem value="private">
                    {m["pages.submitSupport.visibility.private"]()}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <div className="flex items-center gap-3 rounded-3xl border border-border p-5">
          <HugeiconsIcon icon={Shield01Icon} className="size-4.5 shrink-0" />
          <p>
            <strong className="text-foreground">
              {m["pages.support.privacyNoteStrong"]()}
            </strong>{" "}
            {m["pages.support.privacyNote"]()}
          </p>
        </div>

        <form.Subscribe
          selector={(state) => [state.values, state.isSubmitting] as const}
        >
          {([values, isSubmitting]) => {
            const type = values.type as SupportPostType | ""
            const config = type ? SUPPORT_FIELDS_BY_TYPE[type] : []
            const requiredFieldsFilled = config
              .filter((field) => field.required)
              .every((field) => {
                const raw = values.fields[field.name]
                const value =
                  field.kind === "textarea"
                    ? plainText(raw)
                    : typeof raw === "string"
                      ? raw
                      : ""
                if (!value.trim()) return false
                if (field.minLength) return value.length >= field.minLength
                return true
              })
            const canSubmit =
              Boolean(type) &&
              values.title.trim().length > 0 &&
              values.requestorCountryCode.length === 2 &&
              requiredFieldsFilled
            return (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || submitMutation.isPending}
                  className="h-11 w-full rounded-full px-6 sm:w-auto"
                >
                  {isSubmitting || submitMutation.isPending
                    ? m["pages.submitSupport.submitting"]()
                    : m["pages.submitSupport.submit"]()}
                </Button>
              </div>
            )
          }}
        </form.Subscribe>
      </form>
    </article>
  )
}
