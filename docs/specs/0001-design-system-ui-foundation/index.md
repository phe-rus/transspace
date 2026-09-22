# 1. Design system and UI foundation standard

**Date**: 2026-09-23
**Status**: Proposed

## Summary

This spec writes down the standard for Transspace's design system (the shared visual language and component set in `shared/ui`, used by the `www` app). Most of the underlying pieces already exist and are kept as is: Inter as the only font, the current neutral color tokens, and the Base UI plus CVA component pattern. What's new is the rule set these must follow (type comes from the global `typeset` style, not one off overrides, with a real, already existing escape hatch for app chrome; no raw inline color; one shared Motion (`motion/react`) module instead of copies), a written accessibility floor, and a short list of which new components get built when. It also names a visual personality (an oversized, patch like corner shape on `radius-3xl`/`radius-4xl` and a named spring transition) so the system feels built for this product, and it splits that personality by side: the public side carries it fully, the protected side (everything behind the `(protection)` route group) stays calmer and denser, built for someone doing repeat review work, not for delight. A cross check against the real code found several claims that did not hold up (a cited motion curve that did not exist, a build task that would not compile, an accessibility rule that contradicted the current component sizes); this version corrects each one against the actual files.

## Requirements

**User stories**:
- As an engineer building the next screen, I want one clear source for typography, color, and motion so I don't have to guess or reinvent them per page.
- As a visitor with a reduced motion preference, I want the site's animations to respect that setting everywhere, not only in the newest code.
- As an engineer picking up the component roadmap, I want to know which new primitive to build next, tied to the scope slice that actually needs it, rather than guessing or building everything up front.
- As a moderator working through the review queue, I want a calm, dense interface built for speed, not the same expressive personality a first time visitor sees on the public site.

**Acceptance criteria**:
- **AC-1**: Typography defaults come from the global `typeset` utility already applied at `__root.tsx`. A component or route overrides it only through the `data-not-typeset` (or `[data-not-typeset]`) escape hatch `typeset.css` already defines, with a one line comment naming the reason. App chrome (the hero, navigation, dashboards, cards) is the documented use of this exception; ordinary page content is not.
- **AC-2**: No component sets color or background with a raw inline `style` object or an arbitrary Tailwind hex class outside the token system, except a row in this spec's Token exceptions table below. An inline `style` object may set color only when every value is a `var(--token)` reference (this is already how `sonner.tsx` works, and stays allowed). The three known violations, the two inline hex values in `index.tsx` and the undefined `bg-olive-500/15` class in `__root.tsx`, are each fixed under this rule, not left as they are.
- **AC-3**: A shared motion module, `shared/ui/src/lib/motion.ts`, exports `fadeUp`, `staggerChildren`, `fadeDown`, and a named `signatureSpring` transition (`{ type: "spring", damping: 26, stiffness: 360 }`, the same spring already used in `language-select.tsx`, promoted to a shared, named constant rather than a new invention), plus a `usePrefersReducedMotion` hook. `shared/ui/package.json` declares `motion` (`^13.4.0`, matching `www`) as a real dependency, so the module actually builds. `headers.tsx` and `index.tsx` import their variants from it instead of redefining their own copies.
- **AC-4**: An accessibility floor is written at `shared/ui/AGENTS.md`: every interactive element has a hit area of at least 44 pixels, delivered by padding or an invisible pseudo-element rather than a visual resize, so today's dense button and input sizes are not changed; every interactive element shows a visible focus state; trust or status meaning is never carried by color alone; a page carries exactly one `<h1>` and heading levels never skip. The 4.5 to 1 text contrast floor is named but flagged, not asserted: light mode's `--muted-foreground` on `--background` is close enough to that line that it must be measured before this criterion counts as met (Follow-up). Verification is manual review against this written checklist; an automated accessibility scan is Follow-up work, not a condition of this spec, since no test framework exists in the repository yet.
- **AC-5**: A popover or menu primitive and a drawer primitive both exist in `shared/ui/src/components/` (built together, since the mega menu's mobile trigger in `headers.tsx` already exists with no handler behind it and needs both at once), each following the `button.tsx` CVA and `data-slot` pattern. The component roadmap in Follow-up lists every remaining primitive against the scope slice that first needs it.
- **AC-6**: `--radius-4xl` is applied on the hero and feature panels and `--radius-3xl` on cards and section blocks, as the system's shape signature. The `signatureSpring` transition from AC-3 is used on confirmation moments (save, submit, approve). Warmth is spent only through the single, locally scoped accent value recorded in the Token exceptions table under AC-2, not a new global color token.
- **AC-7**: `(public)/route.tsx` sets `data-posture="expressive"` and `(protection)/route.tsx` sets `data-posture="dense"` on their outlet wrapper. `globals.css` defines a token block for each posture (radius, one spacing step, and a motion duration multiplier of zero for dense) under those attribute selectors, so a shared component reads the inherited posture with no per component prop. This is what is checkable today; how calm the protected side actually feels is a judgment made when its first real screen is built.

## Decision

**Chosen option**: Option 1: Formalize and extend the current system in place.

Keep the existing stack and tokens unchanged, write the rules above as the standard, fix the three known violations (not two, the cross check found a third), add the shared motion module with a reduced motion hook at both the module and the global CSS level, write the accessibility floor and the component roadmap into a new `shared/ui/AGENTS.md`, and record the visual personality principles, now tied to named tokens and a named transition rather than descriptions alone, as the system's standing character on the public side.

The public side (`(public)`) and the protected side (`(protection)`) are one product wearing two postures, not two design systems. Both draw from the same tokens, the same primitives, and the same accessibility floor, so nothing feels like a different app when a submitter moves from browsing the directory to checking their submission status. The posture now has a real mechanism (a `data-posture` attribute set once per route group layout, read by shared components) rather than being a description with nothing to check it against.

## Rationale

Reasoning and options: see `rationale.md`.

## Feature design

**Data model sketch**: None. This is a UI and tooling foundation with no persisted entities.

**API surface**: None. No new endpoints.

**Value sourcing**: Not applicable; there is no action here that produces or displays a data value.

**Key invariants**:
- Every heading and body text element renders through the `typeset` scale already applied at `__root.tsx`, unless it carries `data-not-typeset` with a reason comment.
- Every color and background comes from a design token (a CSS variable already defined in `globals.css`, or a locally scoped one recorded in the Token exceptions table), never a raw inline `style` object or an arbitrary Tailwind hex class; an inline `style` object is fine when every value inside it is itself a `var(--token)` reference.
- Every animation in the shared motion module, and every CSS animation and transition anywhere in the app, respects `prefers-reduced-motion`.
- Interactive elements meet a hit area of at least 44 pixels (via padding or a pseudo-element, not a visual resize) and show a visible focus state.
- Trust, status, or verification meaning is never carried by color alone.
- A page carries exactly one `<h1>`; heading levels never skip.

**Security model**: Not applicable; no authentication or data access is involved.

**Configuration required**: None. No new environment variables or credentials.

**Token exceptions** (the registry AC-2 checks against; a raw color value with no row here is a violation):

| File and use | Value | Reason | Date | Owner |
|---|---|---|---|---|
| `www/src/routes/(public)/index.tsx`, the hero's decorative color blocks and the section background currently at `bg-[#F5E2E0]` | a locally scoped `--hero-accent-1`, `--hero-accent-2`, `--hero-accent-3`, and `--hero-section-bg` set, defined once near their use and referenced with `var()`, carrying the same values already in the code | a one time decorative motif on the homepage hero, not a reusable semantic color | 2026-09-23 | this spec |

**Critical test scenarios**:
- Happy path: a new route imports the shared motion module and renders with the standard fade and stagger behavior, verifies **AC-3**.
- Failure case: a visitor with `prefers-reduced-motion` set sees no animation delay or movement anywhere in the app, not only where the shared module was imported, verifies **AC-3**.
- Accessibility: a manual review of `Button`, `Input`, and `Select` against the written checklist at `shared/ui/AGENTS.md` finds a 44 pixel hit area, a visible focus state, and no color only meaning, verifies **AC-4**.
- Regression: `index.tsx` and `__root.tsx` contain no raw inline color outside the Token exceptions table, verifies **AC-2**.
- Posture: loading a page under `(public)` and a page under `(protection)` shows a different `data-posture` value on the outlet wrapper and a visibly different radius and spacing, verifies **AC-7**.

## Build plan

1. Fix the three known violations: in `index.tsx`, give the hero heading a documented `data-not-typeset` exception (it is app chrome) and reduce the other ad hoc heading overrides to `typeset`'s own scale, correcting the page to one `<h1>` with no skipped levels along the way; move the hero color blocks and the `bg-[#F5E2E0]` background onto the locally scoped values recorded in the Token exceptions table; in `__root.tsx`, replace the undefined `bg-olive-500/15` with an existing token; in `headers.tsx`, give the mobile menu trigger button the `onClick` handler it currently lacks, satisfies **AC-1**, **AC-2**, **AC-4**
2. Add `motion` (`^13.4.0`) to `shared/ui/package.json` as a real dependency, then add `shared/ui/src/lib/motion.ts` exporting `fadeUp`, `staggerChildren`, `fadeDown`, and the named `signatureSpring`, plus a `usePrefersReducedMotion` hook in `shared/ui/src/hooks/`, satisfies **AC-3**
3. Add a global `prefers-reduced-motion: reduce` block to `globals.css` covering every animation and transition in the app, not only the shared module, satisfies **AC-3**
4. Update `headers.tsx` and `index.tsx` to import their motion variants from the new module instead of redefining them locally, satisfies **AC-3**
5. Create `shared/ui/eslint.config.js` (it does not exist yet) with a rule flagging `bg-[#`, `text-[#`, and `border-[#` inside class strings, so AC-2 is an enforced gate immediately rather than a convention, satisfies **AC-2**
6. Add a popover or menu primitive and a drawer primitive to `shared/ui/src/components/`, built together since the mega menu needs both at once, satisfies **AC-5**
7. Set `data-posture="expressive"` on `(public)/route.tsx` and `data-posture="dense"` on `(protection)/route.tsx`, and add both posture token blocks to `globals.css`, satisfies **AC-7**
8. Apply `--radius-4xl` and `--radius-3xl` on the named public surfaces and wire `signatureSpring` into the confirmation moments named in AC-6, satisfies **AC-6**
9. Measure `--muted-foreground` on `--background` in light mode against the 4.5 to 1 floor; if it fails, remove the `!important` paragraph color rule in `typeset.css` rather than change the palette, satisfies **AC-4**
10. Write the accessibility checklist, the visual personality principles (the named radii, the named spring, the posture split and why it is drawn at the route group), and the component roadmap into a single new `shared/ui/AGENTS.md`, satisfies **AC-4**, **AC-6**, **AC-7**

## Consequences

**Positive**:
- One place to check for typography, color, and motion instead of guessing per page, and every rule now names a real file, token, or number instead of a description.
- Reduced motion is respected everywhere, including CSS animations and third party components the shared module never touches.
- A written personality tied to real tokens (`radius-3xl`/`radius-4xl`, the named spring) gives future screens a consistent character without adding new tokens or a new typeface.
- The accessibility floor is honest about what is and is not resized: hit areas grow, visual density does not, so the current compact look survives.
- The component roadmap stops primitives from being over built ahead of the slice that actually needs them, and now correctly bundles the drawer with the popover since the mega menu needs both.
- The public and protected posture split has a real mechanism (one attribute, two token blocks) instead of being a description with nothing to check it against.

**Negative / tradeoffs**:
- AC-2's rule is now enforced by lint from the start, which is stricter than a convention but means `shared/ui` needs its own ESLint config where none existed before, a small setup cost this spec now carries rather than deferring.
- Centralizing motion in `shared/ui` means a change to the shared module now affects every page that imports it, rather than staying isolated to one file.
- Committing to Inter only is a deliberate tradeoff: less visual differentiation from a second typeface, in exchange for one font to load and maintain.
- The contrast floor in AC-4 is not yet confirmed to hold for light mode; if it fails, `typeset.css`'s current behavior of forcing every paragraph to `--muted-foreground` needs to change, which is a real, if small, visual shift.

**Neutral**:
- The existing neutral `--primary` token and the rest of the current OKLCH palette are unchanged; no button or existing component is resized by this spec, only given a larger invisible hit area.
- The `queer` theme named in the `ThemeProvider` doc comment stays an illustrative example; no third theme is built.

## Follow-up

- [ ] Measure `--muted-foreground` on `--background` in light mode against the 4.5 to 1 contrast floor (AC-4, build task 9) before treating that criterion as met.
- [ ] Trust and verification signals (scope feature 8, not this spec) should inherit this spec's shape and motion personality (`radius-3xl`/`radius-4xl`, `signatureSpring`) when it is architected, rather than deciding a new visual language for the trust badge from scratch.
- [ ] Component roadmap (primitive mapped to the scope slice that first needs it, and which side it serves):
  - Popover or menu, public side, for the mega menu, needed now (build task 6)
  - Drawer, public side, for mobile navigation and the mobile mega menu equivalent, needed now alongside the popover, since the mobile trigger already exists with no handler (build task 6)
  - Tabs, both sides, for the account screen (saved resources versus submissions) and the admin review queue (status filter), built once, reads the inherited `data-posture` attribute rather than taking a density prop
  - Combobox, public side, for country and category selection in the contribute form
  - Data list or table, protected side, for the admin review queue, built calm and dense from the start
  - Tag or pill, public side, for category filters on explore and search
  - Breadcrumb, public side, for the resource atlas drill down, so a resource reached through geography keeps its path back
  - Pagination or an infinite scroll pattern, public side, for explore and search
  - Form field wrapper (label, hint, error, bound together), public side, for the contribute form
- [ ] Root `AGENTS.md` still does not exist. Once `/audit` runs, it should point to the new `shared/ui/AGENTS.md` this spec creates (build task 10) rather than duplicate its content, since this spec's standard applies to every file in `www` and `shared/ui`.
