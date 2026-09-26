import { STORY_TOPICS, storyTopicIcon, storyTopicLabel } from "@/data/stories"
import { submitGuide, uploadGuideImage } from "@/domains/guides"
import { submitGuideDefaults, submitGuideFormSchema } from "@/domains/guides/submit-form"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { notifyError } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { HugeiconsIcon } from "@hugeicons/react"
import { Editor } from "@pherus/rich-text"
import { Button } from "@pherus/ui/button"
import { useAppForm } from "@pherus/ui/form"
import { cn } from "@pherus/ui/lib/utils"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"

export const Route = createFileRoute("/(public)/submit-story/")({
  loader: ({ context }) =>
    context.queryClient.query({
      ...authGateQueryOptions(),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: authGate } = useSuspenseQuery(authGateQueryOptions())
  // images are uploaded under this id before the story row exists, same as
  // guides, so the row reuses it
  const draftId = useMemo(() => crypto.randomUUID(), [])

  const submitMutation = useMutation({
    mutationFn: submitGuide,
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
    defaultValues: submitGuideDefaults,
    onSubmit: async ({ value }) => {
      await submitMutation.mutateAsync({
        data: {
          id: draftId,
          kind: "story",
          title: value.title,
          excerpt: value.excerpt,
          category: value.category,
          authorVisibility: value.authorVisibility,
          bodyContent: value.bodyContent,
        },
      })
    },
  })

  if (!authGate.signedIn) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.submitStory.title"]()}</h1>
        <p>{m["pages.submitStory.signInRequired"]()}</p>
        <Button nativeButton={false} render={<Link to="/auth" />} className="rounded-full">
          {m["pages.submitStory.signIn"]()}
        </Button>
      </article>
    )
  }

  if (submitMutation.isSuccess) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.submitStory.successTitle"]()}</h1>
        <p>{m["pages.submitStory.successBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/stories" />} className="rounded-full">
          {m["pages.stories.backToStories"]()}
        </Button>
      </article>
    )
  }

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-3xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.submitStory.title"]()}</h1>
        <p className="max-w-lg">{m["pages.submitStory.subtitle"]()}</p>
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
              label={m["pages.submitStory.titleLabel"]()}
              placeholder={m["pages.submitStory.titlePlaceholder"]()}
            />
          )}
        </form.AppField>

        <form.AppField
          name="excerpt"
          validators={{ onChange: submitGuideFormSchema.shape.excerpt }}
        >
          {(field) => (
            <field.TextField
              label={m["pages.submitStory.summaryLabel"]()}
              placeholder={m["pages.submitStory.summaryPlaceholder"]()}
            />
          )}
        </form.AppField>

        <form.Field name="category">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <h6>{m["pages.submitStory.topic"]()}</h6>
              <div className="flex flex-wrap gap-1.5">
                {STORY_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={field.state.value === topic}
                    onClick={() =>
                      field.handleChange(field.state.value === topic ? "" : topic)
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                      field.state.value === topic
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-muted-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={storyTopicIcon[topic]} className="size-3.5" />
                    {storyTopicLabel[topic]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form.Field>

        <form.Field name="authorVisibility">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <h6>{m["pages.submitStory.identity"]()}</h6>
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
                        ? m["pages.submitStory.identityProfile"]()
                        : m["pages.submitStory.identityAnonymous"]()}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {choice === "profile"
                        ? m["pages.submitStory.identityProfileHint"]()
                        : m["pages.submitStory.identityAnonymousHint"]()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form.Field>

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submitStory.bodyLabel"]()}</h6>
          <form.Field name="bodyContent">
            {(field) => (
              <Editor
                value={field.state.value as never}
                onChange={field.handleChange}
                placeholder={m["pages.submitStory.bodyPlaceholder"]()}
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
              values.title.trim().length > 0 &&
              values.excerpt.trim().length > 0 &&
              values.category.length > 0 &&
              Boolean(values.authorVisibility) &&
              Boolean(values.bodyContent)
            return (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting || submitMutation.isPending}
                className="h-11 w-full rounded-full px-6 sm:w-fit"
              >
                {isSubmitting || submitMutation.isPending
                  ? m["pages.submitStory.submitting"]()
                  : m["pages.submitStory.submit"]()}
              </Button>
            )
          }}
        </form.Subscribe>
      </form>
    </article>
  )
}
