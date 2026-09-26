import {
  COMMUNITY_SLUGS,
  THREAD_TYPES,
  communityIcon,
  communityLabel,
  isCommunitySlug,
  threadTypeLabel,
} from "@/data/communities"
import { submitThread, uploadGuideImage } from "@/domains/guides"
import { submitThreadDefaults, submitThreadFormSchema } from "@/domains/guides/submit-form"
import { notifyError } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { HugeiconsIcon } from "@hugeicons/react"
import { Editor } from "@pherus/rich-text"
import { Button } from "@pherus/ui/button"
import { useAppForm } from "@pherus/ui/form"
import { cn } from "@pherus/ui/lib/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"
import { z } from "zod"

export const Route = createFileRoute("/(public)/submit-thread/")({
  validateSearch: z.object({
    community: z.string().optional(),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  const queryClient = useQueryClient()
  // images upload under this id before the thread row exists, as with a
  // story, so the row reuses it
  const draftId = useMemo(() => crypto.randomUUID(), [])

  const submitMutation = useMutation({
    mutationFn: submitThread,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] })
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      if (result.status === "pending") {
        queryClient.invalidateQueries({ queryKey: ["threads", "pending"] })
      }
    },
    onError: notifyError,
  })
  const uploadMutation = useMutation({
    mutationFn: uploadGuideImage,
    onError: notifyError,
  })

  async function uploadEditorImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("contentId", draftId)
    const result = await uploadMutation.mutateAsync({ data: formData })
    return result.url
  }

  const form = useAppForm({
    defaultValues: {
      ...submitThreadDefaults,
      slug:
        search.community && isCommunitySlug(search.community)
          ? search.community
          : "",
    },
    onSubmit: async ({ value }) => {
      if (!value.threadType || !value.authorVisibility) return
      await submitMutation.mutateAsync({
        data: {
          id: draftId,
          slug: value.slug,
          threadType: value.threadType,
          title: value.title,
          excerpt: value.excerpt,
          authorVisibility: value.authorVisibility,
          bodyContent: value.bodyContent,
        },
      })
    },
  })

  const result = submitMutation.data
  if (result) {
    const published = result.status === "published"
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>
          {published
            ? m["pages.submitThread.publishedTitle"]()
            : m["pages.submitThread.pendingTitle"]()}
        </h1>
        <p>
          {published
            ? m["pages.submitThread.publishedBody"]()
            : m["pages.submitThread.pendingBody"]()}
        </p>
        {published ? (
          <Button
            nativeButton={false}
            render={
              <Link
                to="/communities/$slug/threads/$threadId"
                params={{ slug: result.slug, threadId: result.id }}
              />
            }
            className="rounded-full"
          >
            {m["pages.submitThread.viewThread"]()}
          </Button>
        ) : (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/communities/$slug" params={{ slug: result.slug }} />}
            className="rounded-full"
          >
            {communityLabel(result.slug)}
          </Button>
        )}
      </article>
    )
  }

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-3xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.submitThread.title"]()}</h1>
        <p className="max-w-lg">{m["pages.submitThread.subtitle"]()}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
        className="flex flex-col gap-5"
      >
        <form.Field name="slug">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <h6>{m["pages.submitThread.community"]()}</h6>
              <div className="flex flex-wrap gap-1.5">
                {COMMUNITY_SLUGS.map((slug) => (
                  <button
                    key={slug}
                    type="button"
                    aria-pressed={field.state.value === slug}
                    onClick={() => field.handleChange(slug)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                      field.state.value === slug
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-muted-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={communityIcon[slug]} className="size-3.5" />
                    {communityLabel(slug)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form.Field>

        <form.Field name="threadType">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <h6>{m["pages.submitThread.type"]()}</h6>
              <div className="flex flex-wrap gap-1.5">
                {THREAD_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={field.state.value === type}
                    onClick={() => field.handleChange(type)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm transition-colors",
                      field.state.value === type
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-muted-foreground",
                    )}
                  >
                    {threadTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form.Field>

        <form.AppField
          name="title"
          validators={{ onChange: submitThreadFormSchema.shape.title }}
        >
          {(field) => (
            <field.TextField
              label={m["pages.submitThread.titleLabel"]()}
              placeholder={m["pages.submitThread.titlePlaceholder"]()}
            />
          )}
        </form.AppField>

        <form.AppField
          name="excerpt"
          validators={{ onChange: submitThreadFormSchema.shape.excerpt }}
        >
          {(field) => (
            <field.TextField
              label={m["pages.submitThread.summaryLabel"]()}
              placeholder={m["pages.submitThread.summaryPlaceholder"]()}
            />
          )}
        </form.AppField>

        <form.Field name="authorVisibility">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <h6>{m["pages.submitThread.identity"]()}</h6>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(["profile", "anonymous"] as const).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    aria-pressed={field.state.value === choice}
                    onClick={() => field.handleChange(choice)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-2xl border px-4 py-3 text-left transition-colors",
                      field.state.value === choice
                        ? "border-foreground bg-muted"
                        : "border-border hover:border-muted-foreground",
                    )}
                  >
                    <strong className="text-sm text-foreground">
                      {choice === "profile"
                        ? m["pages.submitThread.identityProfile"]()
                        : m["pages.submitThread.identityAnonymous"]()}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {choice === "profile"
                        ? m["pages.submitThread.identityProfileHint"]()
                        : m["pages.submitThread.identityAnonymousHint"]()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form.Field>

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submitThread.bodyLabel"]()}</h6>
          <form.Field name="bodyContent">
            {(field) => (
              <Editor
                value={field.state.value as never}
                onChange={field.handleChange}
                placeholder={m["pages.submitThread.bodyPlaceholder"]()}
                onUpload={uploadEditorImage}
                className="min-h-64"
              />
            )}
          </form.Field>
        </div>

        <form.Subscribe
          selector={(state) => [state.values, state.isSubmitting] as const}
        >
          {([values, isSubmitting]) => {
            const canSubmit =
              values.slug.length > 0 &&
              Boolean(values.threadType) &&
              values.title.trim().length > 0 &&
              values.excerpt.trim().length > 0 &&
              Boolean(values.authorVisibility) &&
              Boolean(values.bodyContent)
            return (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting || submitMutation.isPending}
                className="h-11 w-full rounded-full px-6 sm:w-fit"
              >
                {isSubmitting || submitMutation.isPending
                  ? m["pages.submitThread.submitting"]()
                  : m["pages.submitThread.submit"]()}
              </Button>
            )
          }}
        </form.Subscribe>
      </form>
    </article>
  )
}
