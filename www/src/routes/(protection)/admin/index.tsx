import {
  amIAdminQueryOptions,
  banUser,
  demoteSuperAdmin,
  grantAdmin,
  grantSuperAdmin,
  listActivityLogQueryOptions,
  listAllUsers,
  listAllUsersQueryOptions,
  revokeAdmin,
  unbanUser,
} from "@/domains/admins"
import {
  grantModerator,
  revokeModerator,
  setModeratorCountry,
} from "@/domains/moderators"
import { useTurnstileToken } from "@/components/turnstile-provider"
import { sortedCountryOptions, countryName } from "@/data/countries"
import { notifyError, notifySuccess } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { formatDate } from "@/lib/format-date"
import {
  CheckmarkCircle01Icon,
  MoreHorizontalIcon,
  ShieldKeyIcon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { Button } from "@pherus/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pherus/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@pherus/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pherus/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pherus/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@pherus/ui/tabs"
import { Textarea } from "@pherus/ui/textarea"
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"

export const Route = createFileRoute("/(protection)/admin/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({
        ...amIAdminQueryOptions(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...listAllUsersQueryOptions(),
        staleTime: "static",
      }),
    ]),
  component: RouteComponent,
})

type AdminUser = Awaited<ReturnType<typeof listAllUsers>>["items"][number]

function StatCard({
  icon,
  label,
  value,
}: {
  icon: typeof UserGroup02Icon
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-border bg-card p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
        <HugeiconsIcon icon={icon} className="size-4.5" />
      </span>
      <div className="flex flex-col">
        <h3>{value}</h3>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function RoleBadges({ user }: { user: AdminUser }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {user.isFounder && (
        <Badge variant="default">{m["pages.admin.founderBadge"]()}</Badge>
      )}
      {user.isSuperAdmin && !user.isFounder && (
        <Badge variant="secondary">{m["pages.admin.superAdminBadge"]()}</Badge>
      )}
      {user.isAdmin && !user.isSuperAdmin && (
        <Badge variant="outline">{m["pages.admin.adminBadge"]()}</Badge>
      )}
      {user.isModerator && (
        <Badge variant="ghost">{m["pages.admin.moderatorBadge"]()}</Badge>
      )}
      {user.isBanned && (
        <Badge variant="destructive">{m["pages.admin.bannedBadge"]()}</Badge>
      )}
      {!user.isAdmin && !user.isModerator && !user.isBanned && (
        <span className="text-xs text-muted-foreground">
          {m["pages.admin.memberBadge"]()}
        </span>
      )}
    </div>
  )
}

function RouteComponent() {
  const [tab, setTab] = useState<"users" | "activity">("users")
  const getTurnstileToken = useTurnstileToken()
  const queryClient = useQueryClient()
  const locale = getLocale()
  const countryOptions = useMemo(() => sortedCountryOptions(locale), [locale])

  const { data: me } = useSuspenseQuery(amIAdminQueryOptions())
  const { data: users } = useSuspenseQuery(listAllUsersQueryOptions())
  const { data: activity } = useQuery({
    ...listActivityLogQueryOptions(),
    enabled: tab === "activity",
  })

  const [moderatorDialog, setModeratorDialog] = useState<{
    user: AdminUser
    mode: "grant" | "set"
  } | null>(null)
  const [moderatorCountryValue, setModeratorCountryValue] = useState("")
  const [banDialogUser, setBanDialogUser] = useState<AdminUser | null>(null)
  const [banReason, setBanReason] = useState("")

  const stats = useMemo(
    () => ({
      users: users.items.length,
      moderators: users.items.filter((u) => u.isModerator).length,
      admins: users.items.filter((u) => u.isAdmin).length,
    }),
    [users.items]
  )

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-users"] })

  function mutationWithToast(toastKey: string) {
    return {
      onSuccess: () => {
        notifySuccess(messageByKey(toastKey))
        invalidateUsers()
      },
      onError: notifyError,
    }
  }

  const grantModeratorMutation = useMutation({
    mutationFn: grantModerator,
    ...mutationWithToast("pages.admin.moderatorGrantedToast"),
  })
  const setModeratorCountryMutation = useMutation({
    mutationFn: setModeratorCountry,
    ...mutationWithToast("pages.admin.moderatorCountryUpdatedToast"),
  })
  const revokeModeratorMutation = useMutation({
    mutationFn: revokeModerator,
    ...mutationWithToast("pages.admin.moderatorRevokedToast"),
  })
  const grantAdminMutation = useMutation({
    mutationFn: grantAdmin,
    ...mutationWithToast("pages.admin.adminGrantedToast"),
  })
  const revokeAdminMutation = useMutation({
    mutationFn: revokeAdmin,
    ...mutationWithToast("pages.admin.adminRevokedToast"),
  })
  const grantSuperAdminMutation = useMutation({
    mutationFn: grantSuperAdmin,
    ...mutationWithToast("pages.admin.superAdminGrantedToast"),
  })
  const demoteSuperAdminMutation = useMutation({
    mutationFn: demoteSuperAdmin,
    ...mutationWithToast("pages.admin.superAdminDemotedToast"),
  })
  const banUserMutation = useMutation({
    mutationFn: banUser,
    ...mutationWithToast("pages.admin.userBannedToast"),
  })
  const unbanUserMutation = useMutation({
    mutationFn: unbanUser,
    ...mutationWithToast("pages.admin.userUnbannedToast"),
  })

  async function withToken(run: (turnstileToken: string) => void) {
    try {
      const turnstileToken = await getTurnstileToken()
      run(turnstileToken)
    } catch (error) {
      await notifyError(error)
    }
  }

  function openModeratorDialog(user: AdminUser, mode: "grant" | "set") {
    setModeratorCountryValue(user.moderatorCountryCode ?? "")
    setModeratorDialog({ user, mode })
  }

  function confirmModeratorDialog() {
    if (!moderatorDialog) return
    const { user, mode } = moderatorDialog
    const countryCode = moderatorCountryValue || undefined
    withToken((turnstileToken) => {
      if (mode === "grant") {
        grantModeratorMutation.mutate({
          data: { targetUserLinkId: user.id, countryCode, turnstileToken },
        })
      } else {
        setModeratorCountryMutation.mutate({
          data: { userLinkId: user.id, countryCode, turnstileToken },
        })
      }
      setModeratorDialog(null)
    })
  }

  function confirmBanDialog() {
    if (!banDialogUser || !banReason.trim()) return
    const user = banDialogUser
    withToken((turnstileToken) => {
      banUserMutation.mutate({
        data: {
          targetUserLinkId: user.id,
          reason: banReason.trim(),
          turnstileToken,
        },
      })
      setBanDialogUser(null)
      setBanReason("")
    })
  }

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex w-full flex-col gap-2 md:max-w-xl">
        <h1>{m["pages.admin.title"]()}</h1>
        <p>{m["pages.admin.subtitle"]()}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={UserGroup02Icon} label={m["pages.admin.usersTab"]()} value={stats.users} />
        <StatCard icon={CheckmarkCircle01Icon} label={m["pages.admin.moderatorsStatLabel"]()} value={stats.moderators} />
        <StatCard icon={ShieldKeyIcon} label={m["pages.admin.adminsStatLabel"]()} value={stats.admins} />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as "users" | "activity")}>
        <TabsList>
          <TabsTrigger value="users">{m["pages.admin.usersTab"]()}</TabsTrigger>
          <TabsTrigger value="activity">{m["pages.admin.activityTab"]()}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "users" ? (
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m["pages.admin.columnUser"]()}</TableHead>
                <TableHead>{m["pages.admin.columnRole"]()}</TableHead>
                <TableHead>{m["pages.admin.columnCountry"]()}</TableHead>
                <TableHead>{m["pages.admin.columnJoined"]()}</TableHead>
                <TableHead className="text-right">
                  {m["pages.admin.columnActions"]()}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.items.map((user) => {
                const initial = (user.displayName ?? user.id).charAt(0).toUpperCase()
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                          {initial}
                        </span>
                        <span className="text-foreground">
                          {user.displayName ?? user.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadges user={user} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.moderatorCountryCode
                        ? countryName(user.moderatorCountryCode, locale)
                        : user.isModerator
                          ? m["pages.admin.generalScope"]()
                          : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={m["pages.admin.columnActions"]()}
                            />
                          }
                        >
                          <HugeiconsIcon icon={MoreHorizontalIcon} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!user.isModerator ? (
                            <DropdownMenuItem
                              onClick={() => openModeratorDialog(user, "grant")}
                            >
                              {m["pages.admin.makeModerator"]()}
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onClick={() => openModeratorDialog(user, "set")}
                              >
                                {m["pages.admin.setModeratorCountry"]()}
                              </DropdownMenuItem>
                              {!user.isAdmin && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    withToken((turnstileToken) =>
                                      revokeModeratorMutation.mutate({
                                        data: { userLinkId: user.id, turnstileToken },
                                      })
                                    )
                                  }
                                >
                                  {m["pages.admin.removeModerator"]()}
                                </DropdownMenuItem>
                              )}
                            </>
                          )}

                          {!user.isAdmin && (
                            <DropdownMenuItem
                              onClick={() =>
                                withToken((turnstileToken) =>
                                  grantAdminMutation.mutate({
                                    data: { targetUserLinkId: user.id, turnstileToken },
                                  })
                                )
                              }
                            >
                              {m["pages.admin.makeAdmin"]()}
                            </DropdownMenuItem>
                          )}
                          {user.isAdmin && !user.isSuperAdmin && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                withToken((turnstileToken) =>
                                  revokeAdminMutation.mutate({
                                    data: { userLinkId: user.id, turnstileToken },
                                  })
                                )
                              }
                            >
                              {m["pages.admin.removeAdmin"]()}
                            </DropdownMenuItem>
                          )}

                          {me.isFounder && !user.isSuperAdmin && (
                            <DropdownMenuItem
                              onClick={() =>
                                withToken((turnstileToken) =>
                                  grantSuperAdminMutation.mutate({
                                    data: { targetUserLinkId: user.id, turnstileToken },
                                  })
                                )
                              }
                            >
                              {m["pages.admin.makeSuperAdmin"]()}
                            </DropdownMenuItem>
                          )}
                          {me.isFounder && user.isSuperAdmin && !user.isFounder && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                withToken((turnstileToken) =>
                                  demoteSuperAdminMutation.mutate({
                                    data: { userLinkId: user.id, turnstileToken },
                                  })
                                )
                              }
                            >
                              {m["pages.admin.demoteSuperAdmin"]()}
                            </DropdownMenuItem>
                          )}

                          {!user.isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              {user.isBanned ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    withToken((turnstileToken) =>
                                      unbanUserMutation.mutate({
                                        data: { userLinkId: user.id, turnstileToken },
                                      })
                                    )
                                  }
                                >
                                  {m["pages.admin.unbanUser"]()}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setBanReason("")
                                    setBanDialogUser(user)
                                  }}
                                >
                                  {m["pages.admin.banUser"]()}
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {users.items.length === 0 && (
            <div className="flex min-h-16 items-center justify-center p-5 text-center">
              <p>{m["pages.admin.noUsers"]()}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {activity?.items.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5"
            >
              <p>
                <strong className="text-foreground">
                  {entry.actorDisplayName ?? entry.actorUserLinkId}
                </strong>{" "}
                <Badge variant="ghost" className="mx-1">
                  {entry.action}
                </Badge>
                {entry.target ? entry.target : ""}
              </p>
              <p className="shrink-0 text-xs text-muted-foreground">
                {formatDate(entry.createdAt, { dateStyle: "medium", timeStyle: "short", timeZoneName: "short" })}
              </p>
            </div>
          ))}

          {activity && activity.items.length === 0 && (
            <div className="flex min-h-16 items-center justify-center rounded-4xl border border-dashed border-border p-5 text-center">
              <p>{m["pages.admin.noActivity"]()}</p>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={moderatorDialog !== null}
        onOpenChange={(open) => !open && setModeratorDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderatorDialog?.mode === "grant"
                ? m["pages.admin.makeModerator"]()
                : m["pages.admin.setModeratorCountry"]()}
            </DialogTitle>
            <DialogDescription>
              {m["pages.admin.moderatorCountryDialogDescription"]()}
            </DialogDescription>
          </DialogHeader>
          <Select
            value={moderatorCountryValue || "general"}
            onValueChange={(value) =>
              setModeratorCountryValue(value === "general" ? "" : (value as string))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">{m["pages.admin.generalScope"]()}</SelectItem>
              {countryOptions.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              className="rounded-full"
              disabled={grantModeratorMutation.isPending || setModeratorCountryMutation.isPending}
              onClick={confirmModeratorDialog}
            >
              {m["pages.admin.confirm"]()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={banDialogUser !== null}
        onOpenChange={(open) => !open && setBanDialogUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m["pages.admin.banUser"]()}</DialogTitle>
            <DialogDescription>
              {m["pages.admin.banDialogDescription"]({
                name: banDialogUser?.displayName ?? banDialogUser?.id ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={banReason}
            onChange={(event) => setBanReason(event.target.value)}
            placeholder={m["pages.admin.banReasonPlaceholder"]()}
            className="min-h-20"
          />
          <DialogFooter>
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={!banReason.trim() || banUserMutation.isPending}
              onClick={confirmBanDialog}
            >
              {m["pages.admin.confirm"]()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}

function messageByKey(key: string): string {
  return (m as unknown as Record<string, () => string>)[key]()
}
