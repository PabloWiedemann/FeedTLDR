# apps/api — agent guardrails

## Read first

- `docs/ENGINEERING.md` §2 and §4 — clean-code baseline and API layering.
  Non-negotiable.
- `CLAUDE.md` (repo root) — Firestore shape, environment, frozen packages.

## Frozen ground

`backend/` and `config/` are the legacy pipeline, moved verbatim. **Bug fixes
only** until post-cutover: no refactors, no renames, no dependency migrations
(yes, `google-generativeai` is deprecated — leave it). Everything below applies
to `api/` and `worker/`.

No `streamlit` import anywhere in this app; CI greps for it.

## Layering

```
api/routers/**    HTTP only: dependency in, one service call, error mapping out
api/services/**   business logic, one module per domain, never imports fastapi
api/deps.py       request context: auth, user context, credit state
api/schemas.py    pydantic request/response contracts
api/constants.py  shared literals (default timezone, timestamp format, models)
```

- **Thin routers.** A router reads a dependency, calls one service function,
  maps the result to a schema. Business rules there are a bug in the layering.
- **Framework-free services.** Services raise `ValueError` carrying a stable
  error *code* (`"insufficient_credits"`) for client-mappable failures, and
  `LookupError` for missing data. The router owns status codes.
- **Request context is a dependency, not a copy-paste.** Use
  `get_current_user`, `get_user_context`, `get_credit_state` — do not re-read
  `plan` / `stripe_customer_id` inline in a router.
- **uid always comes from the verified Firebase token**, never from a body or
  query string.
- **No magic strings.** Default timezone, timestamp formats, model names, lock
  windows and repeated Firestore field paths are named constants.

## API changes are three-part

Schema change → regenerate the spec → regenerate the TS client, same PR:

```bash
uv run python scripts/export_openapi.py
cd ../web && pnpm gen:api
```

## Tests

Pure service logic ships with a unit test. Anything touching Firestore, Stripe,
Apify or an LLM sits behind a seam so the pure part is testable offline.

```bash
uv run pytest -q
```
