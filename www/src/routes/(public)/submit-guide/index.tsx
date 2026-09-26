import {
  GUIDE_CATEGORIES,
  guideCategoryIcon,
  guideCategoryLabel,
} from "@/data/guides"
import { listGuideSeriesQueryOptions, submitGuide, uploadGuideImage } from "@/domains/guides"
import { submitGuideDefaults, submitGuideFormSchema } from "@/domains/guides/submit-form"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { notifyError } from "@/lib/toast"
import { toEmbedUrl } from "@/lib/video-embed"
import { m } from "@/paraglide/messages"
import { Add01Icon, Image02Icon, Shield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Editor } from "@pherus/rich-text"
import { Button } from "@pherus/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@pherus/ui/combobox"
import { useAppForm } from "@pherus/ui/form"
import { cn } from "@pherus/ui/lib/utils"
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"

export const Route = createFileRoute("/(public)/submit-guide/")({
  loader: ({ context }) =>
    context.queryClient.query({
      ...authGateQueryOptions(),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: authGate } = useSuspenseQuery(authGateQueryOptions())

  // generated once per form mount, before the guide row itself exists:
  // composing (and uploading images) happens before submit, so every
  // upload needs a contentId to nest under already. submitGuide accepts
  // this as the row's real id instead of generating its own (spec 0004
  // AC-10 follow-up, the engineer's explicit call, 2026-09-25)
  const draftGuideId = useMemo(() => crypto.randomUUID(), [])

  const [seriesQuery, setSeriesQuery] = useState("")
  const { data: seriesResult } = useQuery(listGuideSeriesQueryOptions(seriesQuery || undefined))
  const seriesTitles = seriesResult?.items.map((item: { title: any }) => item.title) ?? []

  const submitMutation = useMutation({
    mutationFn: submitGuide,
    onError: notifyError,
  })
  const editorUploadMutation = useMutation({
    mutationFn: uploadGuideImage,
    onError: notifyError,
  })
  const coverUploadMutation = useMutation({
    mutationFn: uploadGuideImage,
    onError: notifyError,
  })

  async function uploadEditorImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("contentId", draftGuideId)
    const result = await editorUploadMutation.mutateAsync({ data: formData })
    return result.url
  }

  const form = useAppForm({
    defaultValues: submitGuideDefaults,
    onSubmit: async ({ value }) => {
      await submitMutation.mutateAsync({
        data: {
          id: draftGuideId,
          title: value.title,
          excerpt: value.excerpt,
          category: value.category,
          bodyContent: value.bodyContent,
          seriesTitle: value.seriesTitle || undefined,
          seriesOrder: value.seriesOrder,
          coverImageUrl: value.coverImageUrl || undefined,
          videoUrl: value.videoUrl || undefined,
        },
      })
    },
  })

  if (!authGate.signedIn) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.submitGuide.title"]()}</h1>
        <p>{m["pages.submitGuide.signInRequired"]()}</p>
        <Button nativeButton={false} render={<Link to="/auth" />} className="rounded-full">
          {m["pages.submitGuide.signIn"]()}
        </Button>
      </article>
    )
  }

  if (submitMutation.isSuccess) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.submitGuide.successTitle"]()}</h1>
        <p>{m["pages.submitGuide.successBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/guides" />} className="rounded-full">
          {m["pages.guides.detail.backToGuides"]()}
        </Button>
      </article>
    )
  }

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.submitGuide.title"]()}</h1>
        <p className="max-w-lg">{m["pages.submitGuide.subtitle"]()}</p>
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
          name="title"
          validators={{ onChange: submitGuideFormSchema.shape.title }}
        >
          {(field) => (
            <field.TextField
              label={m["pages.submitGuide.titleLabel"]()}
              placeholder={m["pages.submitGuide.titlePlaceholder"]()}
            />
          )}
        </form.AppField>

        <form.AppField
          name="excerpt"
          validators={{ onChange: submitGuideFormSchema.shape.excerpt }}
        >
          {(field) => (
            <field.TextField
              label={m["pages.submitGuide.excerptLabel"]()}
              placeholder={m["pages.submitGuide.excerptPlaceholder"]()}
            />
          )}
        </form.AppField>

        <form.Field name="category">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <h6>{m["pages.submitGuide.category"]()}</h6>
              <div className="flex flex-wrap gap-1.5">
                {GUIDE_CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => field.handleChange(field.state.value === item ? "" : item)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                      field.state.value === item
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-muted-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={guideCategoryIcon[item]} className="size-3.5" />
                    {guideCategoryLabel[item]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form.Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <form.Field name="seriesTitle">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <h6>{m["pages.submitGuide.series"]()}</h6>
                <Combobox
                  items={seriesTitles}
                  inputValue={field.state.value ?? ""}
                  onInputValueChange={(value) => {
                    field.handleChange(value)
                    setSeriesQuery(value)
                  }}
                >
                  <ComboboxInput placeholder={m["pages.submitGuide.seriesPlaceholder"]()} />
                  <ComboboxContent>
                    <ComboboxEmpty>{m["pages.submitGuide.seriesEmpty"]()}</ComboboxEmpty>
                    <ComboboxList>
                      {(title: string) => (
                        <ComboboxItem key={title} value={title}>
                          {title}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            )}
          </form.Field>

          <form.AppField name="seriesOrder">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <h6>{m["pages.submitGuide.seriesOrder"]()}</h6>
                <input
                  type="number"
                  min={1}
                  value={field.state.value ?? ""}
                  onChange={(event) =>
                    field.handleChange(
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                  placeholder={m["pages.submitGuide.seriesOrderPlaceholder"]()}
                  className="h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </div>
            )}
          </form.AppField>
        </div>

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submitGuide.bodyLabel"]()}</h6>
          <form.Field name="bodyContent">
            {(field) => (
              <Editor
                value={field.state.value as never}
                onChange={field.handleChange}
                placeholder={m["pages.submitGuide.bodyPlaceholder"]()}
                onUpload={uploadEditorImage}
                className="min-h-56"
              />
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <form.Field name="coverImageUrl">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <h6 className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Image02Icon} className="size-3.5" />
                  {m["pages.submitGuide.coverImage"]()}
                </h6>
                {field.state.value && (
                  <img
                    src={field.state.value}
                    alt=""
                    className="h-32 w-full rounded-xl border border-border object-cover"
                  />
                )}
                <div className="flex items-center gap-2">
                  <label className="flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-full border border-border px-3.5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground">
                    <HugeiconsIcon icon={Add01Icon} className="size-4" />
                    {coverUploadMutation.isPending
                      ? m["pages.submitGuide.uploading"]()
                      : field.state.value
                        ? m["pages.submitGuide.coverImageChange"]()
                        : m["pages.submitGuide.coverImageUpload"]()}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        const formData = new FormData()
                        formData.append("file", file)
                        formData.append("contentId", draftGuideId)
                        const result = await coverUploadMutation.mutateAsync({ data: formData })
                        field.handleChange(result.url)
                        // lets picking the same filename twice in a row
                        // (e.g. re-uploading after a crop) still fire
                        // onChange, since the input's own value never
                        // otherwise changes
                        event.target.value = ""
                      }}
                    />
                  </label>
                  {field.state.value && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => field.handleChange("")}
                    >
                      {m["pages.submitGuide.coverImageRemove"]()}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </form.Field>

          <form.AppField name="videoUrl">
            {(field) => {
              const embedUrl = toEmbedUrl(field.state.value || undefined)
              return (
                <div className="flex flex-col gap-1.5">
                  <field.TextField
                    label={m["pages.submitGuide.videoUrl"]()}
                    placeholder="https://youtube.com/watch?v=…"
                  />
                  {embedUrl && (
                    <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
                      <iframe
                        src={embedUrl}
                        title={m["pages.submitGuide.videoPreview"]()}
                        allowFullScreen
                        className="size-full"
                      />
                    </div>
                  )}
                  {field.state.value && !embedUrl && (
                    <p className="text-xs text-destructive">
                      {m["pages.submitGuide.videoUnsupported"]()}
                    </p>
                  )}
                  {field.state.value && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit rounded-full"
                      onClick={() => field.handleChange("")}
                    >
                      {m["pages.submitGuide.videoClear"]()}
                    </Button>
                  )}
                </div>
              )
            }}
          </form.AppField>
        </div>

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
              values.title.trim().length > 0 &&
              values.excerpt.trim().length > 0 &&
              values.category.length > 0 &&
              Boolean(values.bodyContent)
            return (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || submitMutation.isPending}
                  className="h-11 w-full rounded-full px-6 sm:w-auto"
                >
                  {isSubmitting || submitMutation.isPending
                    ? m["pages.submitGuide.submitting"]()
                    : m["pages.submitGuide.submit"]()}
                </Button>
              </div>
            )
          }}
        </form.Subscribe>
      </form>
    </article>
  )
}
