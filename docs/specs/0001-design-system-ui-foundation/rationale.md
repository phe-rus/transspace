## Context

Transspace has real design system pieces already in place: `shared/ui` wraps Base UI primitives with CVA (class variance authority, a way to define style variants like `size` or `variant` as typed props) variants, `globals.css` defines a full OKLCH (a color format that keeps perceived brightness consistent across hues) token set for light and dark mode, and `typeset.css` is a genuinely thorough prose styling utility already applied globally on `<body>` in `www/src/routes/__root.tsx`. There is no root `AGENTS.md` and no `design.md`, so none of this is written down anywhere a future build or a future engineer can check against.

That gap already shows in the code. `www/src/routes/(public)/index.tsx` overrides heading sizes with ad hoc Tailwind utilities instead of relying on the `typeset` scale that is already active on every page, and it sets colors two different ways outside the token system: a `style={{ backgroundColor: color }}` driven by a raw hex array, and an arbitrary `bg-[#F5E2E0]` class. `headers.tsx` and `index.tsx` each also define their own near identical Framer Motion stagger and fade variants, so the same animation logic exists twice with no shared source, and there is no hook to respect a visitor's reduced motion preference anywhere in the codebase.

The next slices on the scope (a mega menu and reconciled navigation, an admin review queue, an account and saved resources screen, a merged explore and search page) will each touch this shared layer, and the Figma review already flagged that the design file uses a different font pairing than the code and defines zero real Figma components, so a written standard is the only thing stopping this drift from compounding as more screens get built. This is a foundation feature on the scope (feature 4), so the decision here should settle only what's genuinely open. It should not re-decide what's already working.

The product also has two distinct postures to design for: a public knowledge platform meant to feel distinctive and human, and a protected side (account, submissions, moderation) meant to feel calm and fast for repeat use. Treating both the same, either by spending the same personality everywhere or by never spending it anywhere, would misjudge one side or the other.

## Options considered

### Option 1: Formalize and extend the current system in place

Keep every existing decision (Base UI, CVA, Tailwind, the OKLCH tokens, Inter, the custom `ThemeProvider`) and write the rules the code should already be following, fix the handful of known violations, add the two small missing pieces (the shared motion module and the reduced motion hook), and grow the component set one primitive at a time as each scope slice needs it.

**Pros**:
- No churn: nothing already working gets rebuilt or restyled.
- Small, immediately actionable scope: the concrete fixes are a handful of files.
- Matches Tracer Bullet: primitives get built against real, current need instead of speculative completeness.

**Cons**:
- Rules living only in a written spec (not enforced by a lint rule yet) depend on future engineers or AI passes actually reading and following it.

### Option 2: Add formal tooling on top (a component workshop tool, a token pipeline)

Introduce a dedicated component documentation and development tool (for example a Storybook style workspace) and a generated token pipeline (for example Style Dictionary) so tokens and components are authored once and distributed with tooling enforcement rather than convention.

**Pros**:
- Strong enforcement: a token pipeline makes an undocumented raw hex value harder to introduce by accident.
- A component workshop gives every future primitive a visual catalog and makes visual regression testing straightforward.

**Cons**:
- Real setup and maintenance cost for a design system that today has ten components; the payoff arrives once the set is much larger.
- Adds a new tool and a new build step to a stack that doesn't have one yet, which is exactly the kind of tooling investment worth deferring until the component count actually justifies it.

### Option 3: Leave conventions informal, decide nothing now

Don't write a standard; let each future page or `/develop` pass keep making its own local calls, as `index.tsx` and `headers.tsx` already have.

**Pros**:
- Zero cost today.

**Cons**:
- This is the status quo that produced the violations this spec exists to fix; every new screen either repeats the drift or has to independently rediscover the same conventions.

## Rationale

Option 1 wins because almost nothing here is actually undecided. The tokens, the theming approach, the component wrapping pattern, and the typography scale already work; what was missing was the written rule and the discipline to follow it, which a heavier tool does not fix by itself. Option 2's payoff (a component catalog, generated tokens, enforced constraints) is real, but it answers a problem this project does not have yet: ten components across two files is not the scale where a token pipeline or a Storybook style workspace earns its setup and maintenance cost back. Option 3 is the status quo, and the status quo is what produced the two concrete violations this spec fixes, so it is not a neutral choice, it is the choice already tried.

The public and protected split (AC-7) follows the same reasoning as the rest of the decision: reuse what exists rather than inventing something new. Both sides already share `shared/ui`'s tokens and primitives; the split only asks that the amount of personality spent (the oversized radius, the signature motion) differ by side, not the underlying system. The boundary is drawn at the route group, `(public)` versus `(protection)`, rather than per component or a density prop, because that is the one seam that already exists in the codebase: it costs nothing new to hook a `data-posture` attribute onto a layout that is already rendered once per route group, and a screen built inside either folder inherits the posture automatically, so a future screen cannot forget to set it the way a per component prop could be forgotten. A shared component (Tabs, for instance, used on both sides) reads the inherited attribute and needs no prop at all.

The visual personality itself (the patch shaped radius, a named spring transition, typographic contrast without a second typeface, warmth spent only at trust and action moments) was a direction the engineer asked to be proposed rather than pulled from any single reference file, in response to the current Figma file reading as generic for a product built around a specific, real community concept (Q2Q, queer to queer knowledge sharing). Each piece draws on something already sitting in the code (the oversized radius scale in `globals.css`, a spring already implemented in `language-select.tsx`) rather than introducing new tokens, so the personality is additive, not a rebuild. An independent cross check (see Evidence) found that the first draft of this spec had misattributed the spring to the toast component, which has no spring at all; the correction promotes a spring that genuinely exists in the code instead.

## Evidence: current code audit

Read directly during this design pass, not carried over from the earlier Figma review:

- `shared/ui/src/components/button.tsx`: the CVA plus `data-slot` wrapping pattern every future primitive should follow; its size variants run 20 to 32 pixels, none reaching a 44 pixel touch target, which is why AC-4 asks for a larger hit area rather than a visual resize.
- `shared/ui/src/styles/globals.css`: full OKLCH token set for light and dark mode; `--font-sans` and `--font-heading` both resolve to Inter Variable; radius scale runs from `--radius-sm` through `--radius-4xl` (2.6 times the base). `rounded-2xl` is already used five times in `index.tsx`; `radius-3xl` and `radius-4xl` are the genuinely unused steps this spec claims as the shape signature.
- `shared/ui/src/styles/typeset.css`: a complete prose styling utility (heading scale, list, table, code block, footnote handling) already built and ready to be relied on; it also already defines a `.not-typeset` / `[data-not-typeset]` escape hatch, which AC-1 adopts as its exception mechanism rather than inventing a new one. Its forced `!important` color on every `<p>` is the reason AC-4's contrast floor needs measuring, not assuming.
- `shared/ui/src/components/theming.tsx`: a `next-themes` style provider adapted for TanStack Start; supports an arbitrary theme list; its own doc comment example lists `["light", "queer", "dark", "system"]`, confirmed with the engineer as illustrative only.
- `shared/ui/src/hooks/use-media-query.ts`: a breakpoint and pointer type hook; no `usePrefersReducedMotion` equivalent exists yet.
- `shared/ui/src/lib/segmented-control.ts`: a headless, class name only pattern (no React wrapper), showing the design system already has two conventions in play across its eleven current component files, a fully wrapped component and a bare recipe utility; this spec does not resolve which convention new primitives should default to, left as a build time judgment call per primitive.
- `shared/ui/package.json`: has no `motion` dependency at all, and no `eslint.config.js` exists in `shared/ui` (only `www` has one). The first draft of this spec assumed both existed; the corrected build plan adds them.
- `www/src/components/languages/views/language-select.tsx`: the real spring transitions in the codebase (four of them, at lines 39, 202 to 204, 240, and 259); the `{ damping: 26, stiffness: 360 }` spring is the one promoted to `signatureSpring`.
- `shared/ui/src/components/sonner.tsx`: has no transition or spring at all; the toast's easing lives in `globals.css` as CSS keyframes using a cubic bezier curve, not a spring. The first draft of this spec incorrectly attributed a spring to this component; corrected above.
- `www/src/routes/__root.tsx`: the `typeset` class is applied on `<body>` already (line 50), confirming AC-1's rule describes an existing but unfollowed convention, not a new one; the same file also has a `selection:bg-olive-500/15` class referencing a color token that is not defined anywhere in the repository, a third AC-2 violation the first draft of this spec missed.
- `www/src/routes/(public)/index.tsx`: the AC-2 violations (`style={{ backgroundColor: color }}` and `bg-[#F5E2E0]`), the ad hoc heading size classes that bypass the active `typeset` scale, and five separate `<h1>` elements on one page with inconsistent heading levels beneath them.
- `www/src/components/headers/headers.tsx`: the mobile menu trigger button has no `onClick` handler at all, a labelled control that currently does nothing.
- No root `AGENTS.md`, no nested `shared/ui/AGENTS.md`, and no `design.md` exist in the repository (this spec's build plan now creates the nested one directly).
- An independent cross check (a different model, read only, reviewing this spec against the code above) found all of the corrections listed in this file; its full findings are not reproduced here, only the resulting fixes.
