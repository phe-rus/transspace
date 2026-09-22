# shared/ui: design system standard

This package (`@pherus/ui`) is the shared visual language for Transspace: Base UI
primitives styled with the CVA + `data-slot` pattern, one token set, one motion
module. It is consumed by `www` and any future workspace. The standard below is
written up in spec [0001](../../docs/specs/0001-design-system-ui-foundation/index.md);
this file is the living checklist, the spec is the decision record.

## Typography

- Every heading and body text element renders through the `typeset` utility
  already applied at `www/src/routes/__root.tsx`. Don't reach for one-off
  `text-*`/`font-*` overrides on ordinary page content.
- The escape hatch is `data-not-typeset` (or the `.not-typeset` class),
  already defined in `typeset.css`. It exists for **app chrome**: the hero,
  navigation, dashboards, cards, anything that is UI scaffolding rather than
  read content. Every use carries a one line comment naming the reason (see
  the hero `<h1>` in `www/src/routes/(public)/index.tsx`).
- A page carries exactly one `<h1>`; heading levels never skip (`h1` → `h2` →
  `h3`, never `h1` → `h3`).

## Color

- Every color and background comes from a design token (a CSS variable in
  `globals.css`), never a raw inline `style` object or an arbitrary Tailwind
  hex class (`bg-[#...]`, `text-[#...]`, `border-[#...]`).
- The one exception: an inline `style` object whose every value is itself a
  `var(--token)` reference (see `sonner.tsx`). This defines or reads a token,
  it never hardcodes a color.
- A genuinely one-off decorative value (not a reusable semantic color) gets a
  locally scoped custom property, defined once near its use, referenced with
  `var()` or Tailwind's `bg-(--token)` syntax, and recorded as a row in the
  spec's Token exceptions table. See `--hero-accent-1/2/3` and
  `--hero-section-bg` in `www/src/routes/(public)/index.tsx`.
- This rule is enforced by lint (`no-restricted-syntax` in this package's and
  `www`'s `eslint.config.js`), not just convention. A real exception adds a
  spec table row; it doesn't disable the rule.

## Motion

- Shared variants and the signature spring transition live in
  `shared/ui/src/lib/motion.ts`: `fadeUp`, `fadeDown`, `staggerChildren`,
  `signatureSpring` (`{ type: "spring", damping: 26, stiffness: 360 }`).
  Import these instead of redefining local copies.
- `usePrefersReducedMotion` (`shared/ui/src/hooks/use-prefers-reduced-motion.ts`)
  is available for JS-driven motion that needs to branch on the preference
  (see `language-select.tsx`'s use of `motion/react`'s own `useReducedMotion`
  for the same purpose).
- A global `prefers-reduced-motion: reduce` block in `globals.css` collapses
  every CSS animation and transition app-wide, including third party
  components the shared module never touches. Don't rely on the JS module
  alone to satisfy this.

## Accessibility floor

- **Hit area**: every interactive element has at least a 44px hit area,
  delivered by padding or an invisible pseudo-element, never a visual resize.
  Today's compact button/input sizes stay as they are.
- **Focus**: every interactive element shows a visible focus state
  (`focus-visible:ring-2 focus-visible:ring-ring/30` is the existing pattern
  on `button.tsx`; match it, don't invent a new one).
- **Color is never the only signal**: trust, status, or verification meaning
  always pairs with text, an icon, or a shape, never color alone.
- **Headings**: one `<h1>` per page, no skipped levels (see Typography).
- **Contrast**: the 4.5:1 text contrast floor is real. Light mode's
  `--muted-foreground` on `--background` measures **4.26:1**, under the
  floor. Because of that, the `p` selector in `typeset.css` no longer forces
  `--muted-foreground` with `!important`: a component can opt into
  `text-foreground` where contrast matters. Don't restore the `!important`;
  don't change the palette to chase this number instead, that was the
  spec's explicit call. Full automated scanning is Follow-up work, there is
  no test framework in the repo yet; verification here is manual review
  against this list.

## Visual personality: public vs. protected

Public and protected are one product wearing two postures, not two design
systems. Both draw from the same tokens, primitives, and accessibility floor.

- **Shape signature**: `--radius-4xl` on hero and feature panels (the hero
  color blocks, the large visual panel), `--radius-3xl` on cards and section
  blocks (community cards, campaign cards, the popover popup). These already
  resolve through Tailwind's `rounded-3xl`/`rounded-4xl` utilities since
  `globals.css` defines `--radius-3xl`/`--radius-4xl` in `@theme inline`.
- **Signature motion**: `signatureSpring` is reserved for confirmation
  moments (save, submit, approve). None exist yet in the built UI (no
  backend, no forms with a real submit action); wire it in when the first
  one is built rather than inventing a moment for it now.
- **Posture mechanism**: `(public)/route.tsx` sets `data-posture="expressive"`
  and `(protection)/route.tsx` sets `data-posture="dense"` on their outlet
  wrapper. `globals.css` defines `--posture-radius`, `--posture-spacing`, and
  `--posture-motion` (a duration multiplier, `0` for dense) under those
  attribute selectors. A shared component reads the inherited posture via
  these custom properties instead of taking a density prop. No shared
  component consumes them yet, the mechanism exists ahead of the first real
  protected screen (today's `(protection)/route.tsx` is a stub); wire a
  component to it when that screen is built, don't invent consumption now.

## Component roadmap

Primitive mapped to the scope slice that first needs it, and which side it
serves. Built now, ahead of this list, because the mobile nav trigger already
existed with no handler behind it: **Popover** (`popover.tsx`) and **Drawer**
(`drawer.tsx`), both Base UI native primitives (`@base-ui/react/popover`,
`@base-ui/react/drawer`), both public side.

Remaining, build alongside the slice that needs it, not ahead of time:

- Tabs, both sides, for the account screen (saved resources vs. submissions)
  and the admin review queue (status filter). Build once, read the inherited
  `data-posture` attribute rather than taking a density prop.
- Combobox, public side, for country and category selection in the
  contribute form.
- Data list or table, protected side, for the admin review queue. Built calm
  and dense from the start.
- Tag or pill, public side, for category filters on explore and search.
- Breadcrumb, public side, for the resource atlas drill down.
- Pagination or infinite scroll, public side, for explore and search.
- Form field wrapper (label, hint, error, bound together), public side, for
  the contribute form.

## Follow-up (tracked, not blocking)

- Automated accessibility scanning once a test framework exists.
- Trust and verification signals (scope feature 8) should inherit this
  shape and motion personality when architected, rather than deciding a new
  visual language for the trust badge from scratch.
