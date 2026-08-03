# FeedTLDR — agent guardrails

Start with these three, in order. They are guardrails, not suggestions.

1. **`docs/ENGINEERING.md`** — how code is written here: clean-code baseline,
   modularity and layering, tokens-only styling, component reuse, enforcement.
2. **`CLAUDE.md`** — what the project is, hard rules, commands, Firestore shape.
3. **`docs/DESIGN.md`** — the design system every pixel follows.

Per-app detail lives in `apps/web/AGENTS.md` and `apps/api/AGENTS.md`.

## The short version

- **Reuse before you create.** A token, a shadcn primitive, a composite, a
  hook, a service function — search for it before writing a new one.
- **No hard-coded design values in `apps/web`.** Colours, radii, shadows,
  easings, type sizes and widths come from tokens in `app/globals.css`.
  `pnpm check:tokens` enforces it and runs in CI.
- **No hand-rolled primitives.** If shadcn ships it, add it and restyle through
  tokens (swapping lucide imports for Phosphor).
- **Layering holds.** Web: pages compose, hooks fetch, `components/ui/` knows
  nothing about the product. API: routers are thin, services never import
  `fastapi`, `backend/` and `config/` are frozen.
- **One thing per function, intention-revealing names, no magic values.**

## Green before done

```bash
cd apps/web && pnpm lint && pnpm typecheck && pnpm check:tokens
cd apps/api && uv run pytest -q
```
