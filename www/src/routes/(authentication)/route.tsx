import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(authentication)')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height,0px))] items-center justify-center bg-background px-4 py-12">
      <Outlet />
    </div>
  )
}
