<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# apps/web — agent guardrails

## Read first

- `docs/ENGINEERING.md` §2–3 — clean-code baseline, tokens-only rule, component
  reuse, layering. Non-negotiable.
- `docs/DESIGN.md` — what the product looks like (tokens, shape, motion, copy).

## Non-negotiables, short form

**1. Never hard-code a design value.** Colours, radii, shadows, easings, type
sizes, container widths and stroke weights all come from tokens in
`app/globals.css`. Missing token? Add it there and document it in
`docs/DESIGN.md`. Never inline it.

Reach for these instead of arbitrary values:

| Need | Use |
| --- | --- |
| focus ring | `focus-ring` |
| press feedback | `press` |
| elevation | `shadow-overlay` (overlays) / `shadow-lift` (hover) — nothing else |
| radius | `rounded-full` (interactive) / `rounded-card` (containers) / `rounded-field` (inputs) |
| type | `text-display-xl` / `text-display-lg` / `text-heading` / `text-title` / `text-section` |
| easing | `ease-brand` |
| settings sheet width | `max-w-sheet` |
| prose measure | `max-w-prose` |
| balanced / pretty text | `text-balance` / `text-pretty` (never `style={{ textWrap }}`) |

Arbitrary values (`foo-[…]`) are allowed **only** for non-design values:
`calc()`, `var()`, `%`, `dvh`/`vh`/`ch`/`fr`. `pnpm check:tokens` enforces this.

**2. Never hand-roll something that exists.** Check `components/ui/` (shadcn
primitives), then `components/feedtldr/` (product composites), then `lib/`.
Need a primitive we don't have? `npx shadcn@latest add <name>`, then restyle it
through tokens and replace its lucide imports with Phosphor
(`@phosphor-icons/react`) — this project uses one icon family.

**3. Layering.**

```
app/**                 routes: composition + page-local state only
components/feedtldr/** product composites
components/ui/**       primitives — no product knowledge, no lib/api imports
lib/api/**             client, queries.ts, mutations.ts, query-keys.ts
lib/**                 pure helpers (no React, no fetch, no window)
```

Pages never call `api` directly — add a hook in `lib/api/`. Query keys come
from `lib/api/query-keys.ts`, never string literals. A number computed in two
places is a function in `lib/`.

**4. Every component ships all its states** (hover, focus-visible, active,
disabled, loading, empty, error) and appears in `/design` in the same change.

## Before you're done

```bash
pnpm lint && pnpm typecheck && pnpm check:tokens
```

Then run the `docs/DESIGN.md` §11 anti-slop checklist.
