import { ProfileActivityRow } from "@/components/profile/activity-row"
import { ProfileSettingRow } from "@/components/profile/setting-row"
import { mySubmissions, savedResources } from "@/data/profile-activity"
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
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/profile/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <article className="container mx-auto flex w-full flex-col items-center gap-6 py-10 md:max-w-5xl">
      <div className="flex w-full max-w-xl flex-col items-center gap-9">
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            <div className="flex size-24 items-center justify-center rounded-full border border-border bg-card text-2xl font-semibold text-muted-foreground">
              R
            </div>
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
          <h1 className="mt-3">River</h1>
          <h6>Community contributor · they/them</h6>
        </div>

        <div className="w-full rounded-3xl border border-border bg-card px-7 py-6 text-center">
          <h6>{m["pages.profile.privacyNarrative"]()}</h6>
          <p className="mt-2.5 italic">
            "I share what I've learned so someone else doesn't have to find it the hard way. My name here is not my
            name out there."
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <ProfileSettingRow icon={Settings01Icon} title={m["pages.profile.accountSettingsTitle"]()} subtitle={m["pages.profile.accountSettingsSubtitle"]()} />
          <ProfileSettingRow icon={SquareLock02Icon} title={m["pages.profile.dataAndPrivacyTitle"]()} subtitle={m["pages.profile.dataAndPrivacySubtitle"]()} />
          <ProfileSettingRow icon={HelpCircleIcon} title={m["pages.profile.helpAndSupportTitle"]()} subtitle={m["pages.profile.helpAndSupportSubtitle"]()} />
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
          variant="outline"
          disabled
          className="gap-1.5 rounded-full border-destructive/40 px-6 text-destructive"
        >
          <HugeiconsIcon icon={Logout05Icon} />
          {m["pages.profile.logOut"]()}
        </Button>
      </div>
    </article>
  )
}
