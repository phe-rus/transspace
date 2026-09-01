import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(protection)')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(protection)"!</div>
}
