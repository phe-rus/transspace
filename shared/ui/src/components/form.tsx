import * as React from "react"
import { createFormHook } from "@tanstack/react-form"
import { Input } from "./input"
import { Textarea } from "./textarea"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldDescription,
} from "./field"
import { fieldContext, formContext, useFieldContext } from "../lib/form-context"

function FieldShell({
  label,
  description,
  children,
}: {
  label?: string
  description?: string
  children: React.ReactNode
}) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.isTouched ? field.state.meta.errors : []

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldContent>
        {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
        {children}
        {description && <FieldDescription>{description}</FieldDescription>}
        <FieldError errors={errors as { message?: string }[]} />
      </FieldContent>
    </Field>
  )
}

function TextField({
  label,
  description,
  ...props
}: { label?: string; description?: string } & Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "onBlur" | "name"
>) {
  const field = useFieldContext<string>()

  return (
    <FieldShell label={label} description={description}>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
        {...props}
      />
    </FieldShell>
  )
}

function TextareaField({
  label,
  description,
  ...props
}: { label?: string; description?: string } & Omit<
  React.ComponentProps<typeof Textarea>,
  "value" | "onChange" | "onBlur" | "name"
>) {
  const field = useFieldContext<string>()

  return (
    <FieldShell label={label} description={description}>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
        {...props}
      />
    </FieldShell>
  )
}

function SelectField({
  label,
  description,
  children,
  ...props
}: {
  label?: string
  description?: string
  children: React.ReactNode
} & Omit<React.ComponentProps<"select">, "value" | "onChange" | "onBlur" | "name">) {
  const field = useFieldContext<string>()

  return (
    <FieldShell label={label} description={description}>
      <select
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        className="h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}

function CheckboxField({ label }: { label: string }) {
  const field = useFieldContext<boolean>()

  return (
    <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <input
        type="checkbox"
        checked={field.state.value}
        onChange={(event) => field.handleChange(event.target.checked)}
        className="accent-success"
      />
      {label}
    </label>
  )
}

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    TextareaField,
    SelectField,
    CheckboxField,
  },
  formComponents: {},
})

export { useFieldContext, useFormContext } from "../lib/form-context"
export { FieldShell }
