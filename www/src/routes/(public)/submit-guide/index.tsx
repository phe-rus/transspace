import { m } from "@/paraglide/messages"
import {
  GUIDE_CATEGORIES,
  guideCategoryIcon,
  guideCategoryLabel,
  type GuideCategory,
} from "@/data/guides"
import { submitGuide } from "@/domains/guides"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { Editor } from "@pherus/rich-text"
import { Shield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { Input } from "@pherus/ui/input"
import { cn } from "@pherus/ui/lib/utils"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { useState } from "react"

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

  if (!authGate.signedIn) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full max-w-2xl flex-col items-center justify-center gap-3 py-10 text-center">
        <h1>{m["pages.submitGuide.title"]()}</h1>
        <p>{m["pages.submitGuide.signInRequired"]()}</p>
        <Button nativeButton={false} render={<Link to="/auth" />} className="rounded-full">
          {m["pages.submitGuide.signIn"]()}
        </Button>
      </article>
    )
  }

  return <SubmitGuideForm />
}

// no Turnstile token on this call: uploading an image while composing
// reuses the dedicated, deliberately-not-Turnstile-gated endpoint
// (spec 0004-guides Security model)
async function uploadEditorImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const response = await fetch("/api/guides/upload-image", {
    method: "POST",
    body: formData,
  })
  if (!response.ok) {
    throw new Error("Image upload failed")
  }
  const result = (await response.json()) as { url: string }
  return result.url
}

function SubmitGuideForm() {
  const [title, setTitle] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [category, setCategory] = useState<GuideCategory | null>(null)
  const [bodyContent, setBodyContent] = useState<unknown>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: submitGuide,
  })

  const canSubmit =
    title.trim().length > 0 &&
    excerpt.trim().length > 0 &&
    category !== null &&
    Boolean(bodyContent) &&
    Boolean(turnstileToken)

  if (mutation.isSuccess) {
    return (
      <article className="container mx-auto flex min-h-[40vh] w-full max-w-2xl flex-col items-center justify-center gap-3 py-10 text-center">
        <h1>{m["pages.submitGuide.successTitle"]()}</h1>
        <p>{m["pages.submitGuide.successBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/guides" />} className="rounded-full">
          {m["pages.guides.detail.backToGuides"]()}
        </Button>
      </article>
    )
  }

  return (
    <article className="container mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.submitGuide.title"]()}</h1>
        <p className="max-w-lg">{m["pages.submitGuide.subtitle"]()}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!category || !bodyContent || !turnstileToken) return
          mutation.mutate({
            data: {
              title,
              excerpt,
              category,
              bodyContent,
              turnstileToken,
            },
          })
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submitGuide.titleLabel"]()}</h6>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={m["pages.submitGuide.titlePlaceholder"]()} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submitGuide.excerptLabel"]()}</h6>
          <Input value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder={m["pages.submitGuide.excerptPlaceholder"]()} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submitGuide.category"]()}</h6>
          <div className="flex flex-wrap gap-1.5">
            {GUIDE_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory((current) => (current === item ? null : item))}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                  category === item
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

        <div className="flex flex-col gap-1.5">
          <h6>{m["pages.submitGuide.bodyLabel"]()}</h6>
          <Editor
            value={bodyContent as never}
            onChange={setBodyContent}
            placeholder={m["pages.submitGuide.bodyLabel"]()}
            onUpload={uploadEditorImage}
            className="min-h-56 rounded-md border border-input bg-input/20 px-3 py-2"
          />
        </div>

        <div className="flex items-center gap-3 rounded-3xl border border-border p-5">
          <HugeiconsIcon icon={Shield01Icon} className="size-4.5 shrink-0" />
          <p>
            <strong className="text-foreground">{m["pages.submit.privacyNoteStrong"]()}</strong> {m["pages.submit.privacyNote"]()}
          </p>
        </div>

        <TurnstileWidget onToken={setTurnstileToken} />

        {mutation.isError && (
          <p className="text-sm text-destructive">{m["pages.submitGuide.submitError"]()}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit || mutation.isPending} className="h-11 rounded-full px-6">
            {mutation.isPending ? m["pages.submitGuide.submitting"]() : m["pages.submitGuide.submit"]()}
          </Button>
          {!turnstileToken && <p>{m["pages.submitGuide.verificationPending"]()}</p>}
        </div>
      </form>
    </article>
  )
}
