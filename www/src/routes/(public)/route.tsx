import { Headers } from '@components/headers'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Fragment } from 'react/jsx-runtime'

export const Route = createFileRoute('/(public)')({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <Fragment>
      <Headers />
      <Outlet />
    </Fragment>
  )
}
