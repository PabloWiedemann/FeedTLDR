# Engineering guardrails

How code in this repo is written, in both apps. `docs/DESIGN.md` says what the
product should look like; this file says how the code that produces it is
structured. Read both before non-trivial work.

These are guardrails, not suggestions: a change that breaks one of them is a
change to be reworked, not merged with a note.

---

## 1. The three questions before writing a line

1. **Does it already exist?** A token, a component, a hook, a service function.
   Search first (`components/ui`, `components/feedtldr`, `lib/`, `api/services/`).
   Reuse beats re-creation; extending an existing abstraction beats a parallel one.
2. **Where does it belong?** Every module has one job (§3, §4). If the code
   does not fit an existing home, that is a signal about the shape of the
   abstraction, not permission to append it to the nearest file.
3. **What is the smallest honest version?** No speculative options, no
   parameters "for later", no abstraction with a single caller that does not
   also make the caller clearer.

## 2. Clean-code baseline (both apps)

Uncle Bob's rules, applied literally:

- **Functions do one thing.** Aim under 20 lines; a function that needs a
  section comment inside it wants to be two functions.
- **Names reveal intent.** `elapsedMinutes`, not `t`. Verbs for functions
  (`computeGenerationCost`), nouns for types (`CreditState`). No `Manager`,
  `Helper`, `Data`, `Info`, `Utils` as a class or module name for new code.
- **Arguments: 0–2 ideal, 3 needs a reason, 4+ means the arguments are an
  object.** Boolean parameters that select behaviour are a smell; prefer two
  named functions or an explicit enum/literal union.
- **Don't comment bad code, rewrite it.** Comments earn their place by
  explaining *why* (a legacy parity constraint, a browser quirk, a business
  rule), never *what*. Every retained comment about legacy behaviour should
  name the constraint it preserves.
- **No magic values.** Any literal that carries meaning (a timeout, a limit, a
  default timezone, a model name, a colour, a radius) is a named constant or a
  token, declared once, at the layer that owns it.
- **DRY with judgment.** Two occurrences of the same *decision* get extracted.
  Two occurrences of the same *characters* that mean different things do not.
- **Errors are values or exceptions, never silent.** Never swallow an exception
  without either recovering meaningfully or logging with context. `except:
  pass` needs a comment saying why the failure is acceptable.
- **Newspaper order.** Public entry points at the top of a file, details below.

## 3. `apps/web` guardrails

### 3.1 Tokens only. No hard-coded design values. Ever.

Every colour, radius, shadow, easing, font size, stroke and container width
comes from a token defined in `app/globals.css`. If the value you need does not
exist as a token, **add the token** (and document it in `docs/DESIGN.md`) — do
not inline it.

Banned in `app/**` and `components/**` (enforced by `pnpm check:tokens`):

| Banned | Use instead |
| --- | --- |
| `#1c1b18`, `rgb(...)`, `hsl(...)` in a component | a semantic colour token (`bg-primary`, `text-muted-foreground`) |
| `ring-[3px]`, `p-[3px]`, `h-[1.15rem]`, `max-w-[520px]` — arbitrary values with a raw number/px/rem | a scale utility (`min-w-32`), a theme token (`max-w-sheet`), or a utility (`focus-ring`) |
| `shadow-sm` / `shadow-md` / `shadow-lg` / `shadow-xl` | `shadow-overlay` (dialogs, sheets, menus) or `shadow-lift` (hover) — the only two elevations in the system |
| `text-4xl font-semibold sm:text-5xl` ad-hoc type stacks | the type scale: `text-display-xl`, `text-display-lg`, `text-heading`, `text-title`, `text-section` |
| `rounded-2xl`-by-eye | the shape system: `rounded-full` (interactive), `rounded-card` (containers), `rounded-field` (inputs) |
| `style={{ ... }}` with static values | a utility class (`text-pretty`, `text-balance`) |
| `focus-visible:ring-[3px] focus-visible:ring-ring/45` | `focus-ring` |
| `active:scale-[0.96]` | `press` |
| a second easing/duration | `ease-brand` with `duration-150` / `duration-300` |

Arbitrary values are allowed **only** for values that are not design decisions:
`calc(...)`, `var(...)`, percentages, and viewport/content units (`dvh`, `vh`,
`ch`, `fr`).

Colours are declared once in `:root` in OKLCH, then mapped to the shadcn
semantic names in `@theme inline`. Never reference a raw `--pastel-*` variable
from a component; use the generated utility (`bg-pastel-green`).

### 3.2 Components: compose, never re-create

- Primitives live in `components/ui/` and come from shadcn (`npx shadcn@latest
  add <name>`), then get restyled through tokens. **Never ship default shadcn
  styling**, and never hand-roll a primitive that shadcn provides — if you find
  yourself writing `<table>`, `<button className="rounded-full …">`, or a
  bespoke toggle, add the shadcn component instead.
- Composites live in `components/feedtldr/` and are built *from* primitives.
  A page assembles composites; a page does not contain markup that two pages
  would both need.
- shadcn generates lucide imports. This project uses **Phosphor only**
  (`@phosphor-icons/react`) — swap the imports on every generated component.
- Repeated markup across two pages is a component. Repeated *props plus markup*
  across two components is a variant (CVA), not a copy.
- Every component ships hover, focus-visible, active, disabled, loading and
  (where relevant) empty + error states, and appears in `/design`.

### 3.3 Layering

```
app/**                 routes: layout + composition + page-local state only
components/feedtldr/** product composites (own their own markup and states)
components/ui/**       design-system primitives (no product knowledge)
lib/api/**             generated client, queries, mutations, query keys
lib/**                 pure helpers: formatting, constants, derivations
```

Rules that follow from it:

- **Pages don't fetch by hand.** All server access goes through
  `lib/api/queries.ts` / `lib/api/mutations.ts`. A page importing `api` directly
  is a missing hook.
- **Query keys come from `lib/api/query-keys.ts`.** No string literals in
  `useQuery`/`invalidateQueries`.
- **Derivations live in `lib/`, not in JSX.** If a component computes the same
  number twice, or two components compute it, it is a function in `lib/`.
- **`components/ui/**` never imports from `lib/api` or `components/feedtldr`.**
- Pure helpers stay pure: no React, no fetch, no `window`.

### 3.4 Checks

```bash
pnpm lint && pnpm typecheck && pnpm check:tokens
```

All three are green before a change is done, and all three run in CI.

## 4. `apps/api` guardrails

### 4.1 Layering

```
api/routers/**   HTTP only: parse, delegate, map errors to status codes
api/services/**  business logic, one module per domain, no FastAPI imports
api/deps.py      request context: auth, plan, credits
api/schemas.py   pydantic request/response contracts
backend/, config/  FROZEN legacy pipeline — bug fixes only (see CLAUDE.md)
```

- **Routers stay thin.** A router function reads a dependency, calls one
  service function, and maps the result. Business rules in a router are a
  refactor waiting to happen.
- **Services never import `fastapi`.** They raise `ValueError` with a stable
  error *code* (`"insufficient_credits"`) for client-mappable failures and
  `LookupError` for missing data; routers own the HTTP mapping.
- **Cross-cutting request context is a dependency**, not a helper each router
  copies. `get_current_user`, `get_user_context`, `get_credit_state` in
  `api/deps.py` are the only ways to learn who is calling and what they can
  afford.
- **Never trust a uid from a request body or query string.** It comes from the
  verified Firebase token.
- **Shared constants live in `api/constants.py`** (default timezone, timestamp
  format, model names, lock windows). No magic strings in services.
- Firestore field paths used by more than one module are named constants, not
  repeated string literals.

### 4.2 API changes are three-part

A pydantic schema change, a regenerated `openapi.json`, and a regenerated TS
client, in the same PR:

```bash
uv run python scripts/export_openapi.py
cd ../web && pnpm gen:api
```

### 4.3 Tests

Pure functions in `api/services/` are unit-tested (`uv run pytest -q`). Anything
that talks to Firestore, Stripe, Apify or an LLM is behind a seam so the pure
part stays testable without network. New service logic ships with a test.

## 5. Review checklist

Before calling any change done:

- [ ] No new hard-coded design value; `pnpm check:tokens` is clean.
- [ ] Nothing was hand-rolled that a shadcn primitive or an existing composite
      already does.
- [ ] Every new function does one thing and is named for it.
- [ ] No duplicated decision (same constant, same derivation, same request)
      in two places.
- [ ] Routers thin, services framework-free, pages hook-driven.
- [ ] `docs/DESIGN.md` §11 anti-slop checklist run for UI work; `/design`
      updated for new or changed components.
- [ ] `pnpm lint && pnpm typecheck && pnpm check:tokens` and `uv run pytest -q`
      green.
