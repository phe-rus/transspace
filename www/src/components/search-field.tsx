import { SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@pherus/ui/input-group"
import { useEffect, useRef, useState } from "react"

// a search box whose committed value lives in the url. typing is held in
// local state and only pushed after a short pause: writing every keystroke
// straight to the url reruns the loader, and keys typed while that
// navigation is in flight get overwritten by the stale url value
export function SearchField({
  value,
  onChange,
  placeholder,
  delay = 300,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  placeholder: string
  delay?: number
}) {
  const [draft, setDraft] = useState(value ?? "")
  const timeout = useRef<number | undefined>(undefined)
  const pushed = useRef(value)

  // follow outside changes (back button, a cleared filter), but not the
  // echo of our own push, which lands after the user may have typed more
  useEffect(() => {
    if (value === pushed.current) return
    pushed.current = value
    setDraft(value ?? "")
  }, [value])

  useEffect(() => () => window.clearTimeout(timeout.current), [])

  return (
    <InputGroup className="h-11 flex-1 rounded-full">
      <InputGroupAddon align="inline-start">
        <HugeiconsIcon icon={SearchIcon} className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={draft}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          window.clearTimeout(timeout.current)
          timeout.current = window.setTimeout(() => {
            pushed.current = next.trim() || undefined
            onChange(pushed.current)
          }, delay)
        }}
        placeholder={placeholder}
      />
    </InputGroup>
  )
}
