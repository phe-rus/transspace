import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { cn } from "cn"

type DrawerSide = "left" | "right" | "top" | "bottom"

const sideToSwipeDirection: Record<DrawerSide, "left" | "right" | "up" | "down"> = {
  left: "left",
  right: "right",
  top: "up",
  bottom: "down",
}

function Drawer({
  side = "right",
  swipeDirection,
  ...props
}: DrawerPrimitive.Root.Props & { side?: DrawerSide }) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      swipeDirection={swipeDirection ?? sideToSwipeDirection[side]}
      {...props}
    />
  )
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerBackdrop({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-foreground/40 transition-opacity duration-300 ease-out",
        "data-starting-style:opacity-0 data-ending-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerViewport({
  side = "right",
  className,
  ...props
}: DrawerPrimitive.Viewport.Props & { side?: DrawerSide }) {
  return (
    <DrawerPrimitive.Viewport
      data-slot="drawer-viewport"
      data-side={side}
      className={cn(
        "fixed inset-0 z-50 flex",
        "data-[side=right]:justify-end data-[side=left]:justify-start",
        "data-[side=top]:items-start data-[side=bottom]:items-end",
        className
      )}
      {...props}
    />
  )
}

function DrawerPopup({
  side = "right",
  className,
  ...props
}: DrawerPrimitive.Popup.Props & { side?: DrawerSide }) {
  return (
    <DrawerPrimitive.Popup
      data-slot="drawer-popup"
      data-side={side}
      className={cn(
        "flex h-full w-full max-w-xs flex-col gap-4 bg-background p-5 shadow-lg outline-none",
        "data-[side=right]:border-l data-[side=left]:border-r data-[side=right]:border-border data-[side=left]:border-border",
        "data-[side=top]:h-auto data-[side=top]:max-h-[80vh] data-[side=top]:w-full data-[side=top]:max-w-none data-[side=top]:border-b data-[side=top]:border-border",
        "data-[side=bottom]:h-auto data-[side=bottom]:max-h-[80vh] data-[side=bottom]:w-full data-[side=bottom]:max-w-none data-[side=bottom]:border-t data-[side=bottom]:border-border",
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "data-[side=right]:data-starting-style:translate-x-full data-[side=right]:data-ending-style:translate-x-full",
        "data-[side=left]:data-starting-style:-translate-x-full data-[side=left]:data-ending-style:-translate-x-full",
        "data-[side=top]:data-starting-style:-translate-y-full data-[side=top]:data-ending-style:-translate-y-full",
        "data-[side=bottom]:data-starting-style:translate-y-full data-[side=bottom]:data-ending-style:translate-y-full",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({ className, ...props }: DrawerPrimitive.Content.Props) {
  return (
    <DrawerPrimitive.Content
      data-slot="drawer-content"
      className={cn("flex flex-1 flex-col gap-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerBackdrop,
  DrawerViewport,
  DrawerPopup,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
}
