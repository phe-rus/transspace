import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(public)/resources/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(public)/resources/"!</div>
}
