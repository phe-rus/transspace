# Transspace

### Queer knowledge, resources, community, & support

A global, community-driven knowledge and resource platform by Pherus for the
LGBTQIA+ community: discover trusted healthcare, legal, housing, opportunity,
and life-skills resources through queer-to-queer (Q2Q) community knowledge,
kept trustworthy by community submission and moderation.

We're building this as a **tracer bullet**: each vertical (resource
directory, atlas, guides, stories, opportunities, businesses) is built end to
end through data, API, and UI before the next one starts, so the first slice
works for real before anything else is added. See
[`docs/scope/scope.md`](docs/scope/scope.md) for the full roadmap, current
status per feature, and what still needs a design decision.

## Stack

- **Runtime & tooling**: [Bun](https://bun.sh) workspaces, [Turborepo](https://turbo.build)
- **App** (`www`): [TanStack Start](https://tanstack.com/start) (React 19, file-based routing via TanStack Router, SSR), deployed to Cloudflare Workers
- **Styling**: Tailwind CSS v4 + [Base UI](https://base-ui.com) primitives
- **Design system** (`shared/ui`, published as `@pherus/ui`): shared components, tokens, and motion — see [`shared/ui/AGENTS.md`](shared/ui/AGENTS.md) for the standard
- **Maps**: MapLibre GL, via `@pherus/ui/map`
- **Motion**: `motion` (Framer Motion), with a shared `signatureSpring` + variant set
- **i18n**: [inlang / Paraglide JS](https://inlang.com), message-format plugin, base locale `en` with `de`/`fr`/`zh`
- **Icons**: Hugeicons

## Repo layout

```
www/                  the product app
  src/routes/         file-based routes — every page is folder/{route.tsx, index.tsx}:
                       route.tsx is the layout/guard layer (Outlet + any beforeLoad),
                       index.tsx is the actual page
  src/components/     app-specific components, grouped by feature
  src/data/           illustrative/placeholder data (no backend yet — see scope.md)
  messages/           i18n source of truth (messages/en.json is the base locale)
  src/paraglide/      generated i18n runtime — do not hand-edit, regenerated on save
shared/ui/            the @pherus/ui design system (Base UI + Tailwind, CVA + data-slot pattern)
docs/scope/           the living project scope: what's planned, in progress, done
docs/specs/           architecture decisions written by /architect, one per feature
```

## Getting started

Requires Node ≥24 and Bun ≥1.4.

```sh
bun install
bun run dev      # starts every workspace's dev server via Turborepo
```

The app runs at `http://localhost:3000`. From `www/` directly:

```sh
cd www
bun run dev        # vite dev server
bun run typecheck  # tsc --noEmit
bun run lint       # eslint
bun run build      # production build
bun run deploy     # wrangler deploy (Cloudflare Workers)
```

## Working with this codebase

- **Routes always come in pairs**: `www/src/routes/(public)/<page>/route.tsx` +
  `index.tsx`, never a flat `<page>.tsx`. `route.tsx` is where a future
  auth gate (`beforeLoad`) attaches; `index.tsx` holds the page itself.
  Nothing but `export const Route = createFileRoute(...)` lives at module
  scope in a route file — page-local state and data go inside the route's
  component function.
- **No backend yet.** Everything under `src/data/` is illustrative,
  hardcoded placeholder content standing in for a future API (see
  `docs/scope/scope.md`, feature 6: "Data model & backend"). Interactive
  actions that would need a backend (submitting a resource, saving a post,
  signing in) render as disabled controls rather than being wired to
  nothing.
- **Static UI text is localized, illustrative content is not.** Headers,
  page titles, section labels, button copy, and empty states go through
  `messages/en.json` and are read with `m["namespace.key"]()` from
  `@/paraglide/messages`. Data that stands in for real user/community
  content — resource descriptions, post bodies, reviews, quotes — stays as
  plain strings in `src/data/`, since that's exactly the kind of content a
  real backend would serve untranslated-by-us. `de`/`fr`/`zh` currently
  only translate what's been deliberately localized; missing keys fall
  back to English automatically. Run `bun run translate` (in `www/`) to
  machine-translate any newly added `en.json` keys into the other locales.
- **Design system first.** Before building new UI, check whether
  `@pherus/ui` already has the primitive you need, and follow
  [`shared/ui/AGENTS.md`](shared/ui/AGENTS.md) for color tokens, typography,
  motion, and the public/protected posture system.

## Contributing

We're in active early development. Read the full story in
[`docs/scope/scope.md`](docs/scope/scope.md), or reach out if you'd like to
help us build it.
