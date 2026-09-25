import { createFormHookContexts } from "@tanstack/react-form"

// created once, shared app-wide: TanStack Form's field/form contexts
// must come from a single instance, so every field/form component
// this package exports binds to this one pair (shared/ui/AGENTS.md
// component roadmap: "Form field wrapper... for the contribute form")
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()
