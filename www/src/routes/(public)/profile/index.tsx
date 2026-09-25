import { ProfileActivityRow } from "@/components/profile/activity-row"
import { ProfileSettingRow } from "@/components/profile/setting-row"
import { mySubmissions, savedResources } from "@/data/profile-activity"
import { profileQueryOptions } from "@/domains/profile"
import { m } from "@/paraglide/messages"
import {
  Edit02Icon,
  HelpCircleIcon,
  Logout05Icon,
  Settings01Icon,
  SquareLock02Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

export const Route = createFileRoute("/(public)/profile/")({
  // the parent route's beforeLoad already guarantees signed in, onboarded,
  // unlocked; getProfile() itself still goes through the shared decoy
  // accessor, so a duress session sees the same generic empty shape here
  // as it does everywhere else (spec 0001 AC-6)
  loader: ({ context }) =>
    context.queryClient.query({
      ...profileQueryOptions(),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions())
  const [signingOut, setSigningOut] = useState(false)

  async function handleLogOut() {
    setSigningOut(true)
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    window.location.href = "/"
  }

  const displayName = profile.displayName ?? m["pages.profile.anonymous"]()
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <article className="container mx-auto flex w-full flex-col items-center gap-6 py-10 md:max-w-5xl">
      <div className="flex w-full max-w-xl flex-col items-center gap-9">
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            {profile.avatarSlug ? (
              <img
                src={`/avatar/${profile.avatarSlug}.jpg`}
                alt=""
                className="size-55 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full border border-border bg-card text-2xl font-semibold text-muted-foreground">
                {initial}
              </div>
            )}
            <Button
              size="icon-sm"
              variant="outline"
              disabled
              aria-label={m["pages.profile.editPhoto"]()}
              className="absolute -right-1 -bottom-1 rounded-full bg-background"
            >
              <HugeiconsIcon icon={Edit02Icon} />
            </Button>
          </div>
          <h1 className="mt-3">{displayName}</h1>
          {profile.pronouns && <h6>{profile.pronouns}</h6>}
        </div>

        <div className="w-full rounded-3xl border border-border bg-card px-7 py-6 text-center">
          <h6>{m["pages.profile.privacyNarrative"]()}</h6>
          <p className="mt-2.5 italic">
            {profile.bio || (
              <>
                "I share what I've learned so someone else doesn't have to find it the hard way. My name here is not
                my name out there."
              </>
            )}
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <ProfileSettingRow icon={Settings01Icon} title={m["pages.profile.accountSettingsTitle"]()} subtitle={m["pages.profile.accountSettingsSubtitle"]()} to="/profile/account-settings" />
          <ProfileSettingRow icon={SquareLock02Icon} title={m["pages.profile.dataAndPrivacyTitle"]()} subtitle={m["pages.profile.dataAndPrivacySubtitle"]()} to="/profile/security" />
          <ProfileSettingRow icon={HelpCircleIcon} title={m["pages.profile.helpAndSupportTitle"]()} subtitle={m["pages.profile.helpAndSupportSubtitle"]()} to="/profile/help-and-support" />
          <ProfileSettingRow icon={UserMultiple02Icon} title={m["pages.profile.communitiesTitle"]()} subtitle={m["pages.profile.communitiesSubtitle"]()} />
        </div>

        <div className="flex w-full flex-col gap-1">
          <h6>{m["pages.profile.savedResources"]()}</h6>
          {savedResources.map((resource) => (
            <ProfileActivityRow key={resource.id} label={resource.name} meta={resource.category} />
          ))}

          <h6 className="mt-4">{m["pages.profile.mySubmissions"]()}</h6>
          {mySubmissions.map((submission) => (
            <ProfileActivityRow
              key={submission.id}
              label={submission.title}
              meta={submission.status === "pending" ? m["pages.profile.pending"]() : m["pages.profile.approved"]()}
              metaClassName={submission.status === "pending" ? "text-warning" : "text-success"}
            />
          ))}
        </div>

        <Button
          variant='destructive'
          disabled={signingOut}
          onClick={handleLogOut}
          className="gap-1.5 p-5 rounded-2xl"
        >
          <HugeiconsIcon icon={Logout05Icon} />
          {m["pages.profile.logOut"]()}
        </Button>
      </div>
    </article>
  )
}
