# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

FeedTLDR: AI-generated daily summaries of X/Twitter feeds (scrape → Gemini summary → TTS audio → SendGrid email), with Firebase (Auth/Firestore/Storage), Stripe billing, and a credits system. This monorepo replaces the legacy Streamlit app (`../feedtldr_streamlit`, kept as reference until cutover).

**Read before working:**
- `docs/ENGINEERING.md` — code guardrails; ALL code follows them (modularity, layering, clean-code rules, tokens-only, component reuse). Non-negotiable.
- `docs/PLAN.md` — architecture, API contract, module dispositions, phased roadmap
- `docs/DESIGN.md` — design system; ALL UI work follows it (tokens, shape system, components, states). Never invent styles inline.

## Layout

- `apps/web` — Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui. Composites in `components/feedtldr/`, primitives in `components/ui/`. `/design` route is the living component gallery.
- `apps/api` — Python (uv). `api/` is the FastAPI layer; `backend/` + `config/` are the legacy pipeline moved verbatim; `worker/` is the newsletter daemon.

## Commands

```bash
# apps/api
uv sync                                   # install
uv run pytest -q                          # tests
uv run uvicorn api.main:app --reload      # dev server (port 8000)
uv run python scripts/export_openapi.py   # regenerate openapi.json
uv run python -m worker                   # newsletter daemon

# apps/web
pnpm dev            # dev server (port 3000)
pnpm lint && pnpm typecheck && pnpm check:tokens
pnpm build
pnpm gen:api        # regenerate TS client from ../api/openapi.json
```

## Hard rules

1. **`apps/api/backend/` and `apps/api/config/` are frozen** until post-cutover: bug fixes only, no refactors, no dependency migrations (yes, `google-generativeai` is deprecated — leave it).
2. **No `streamlit` anywhere in `apps/api`** (CI greps for it).
3. API changes = pydantic schema + regenerate `openapi.json` + `pnpm gen:api` in the same PR.
4. **Tokens only, components always** (docs/ENGINEERING.md §3). No raw hex, no arbitrary Tailwind values carrying a design decision (`ring-[3px]`, `max-w-[520px]`), no default `shadow-md/lg/xl`, no ad-hoc type stacks. Missing value? Add the token in `globals.css` + `docs/DESIGN.md`. Missing primitive? `npx shadcn@latest add` it, then restyle through tokens and swap lucide imports for Phosphor. `pnpm check:tokens` enforces this and runs in CI.
5. UI work: compose from `components/feedtldr/` + `components/ui/`; add/update the `/design` gallery in the same PR; implement all states (hover/focus/active/disabled/loading/empty/error). Run the DESIGN.md §11 checklist before calling UI work done.
6. **Layering holds** (docs/ENGINEERING.md §3.3, §4.1): pages compose and never fetch by hand; `components/ui/` knows nothing about the product; API routers stay thin and services never import `fastapi`.
7. Secrets never committed. Local dev reads `apps/api/.env` and `apps/web/.env.local` (see `.env.example` in each).
8. Auth: Firebase ID tokens verified server-side. Never trust a uid from the request body.

## Environment (apps/api/.env)

`FIREBASE_WEB_API_KEY`, `APIFY_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `SENDGRID_API_KEY`, `STRIPE_API_KEY_TEST`/`STRIPE_API_KEY_LIVE`, `STRIPE_ENV`, `DOMAIN_URL`, `PROJECT_DIR` (abs path to apps/api), `CREDENTIALS_DIR` (default `credentials`), plus `credentials/firebase_credentials_secret_prod.json`. Web needs `NEXT_PUBLIC_FIREBASE_*` + `NEXT_PUBLIC_API_URL`.

## Firestore shape (unchanged from legacy)

`customers/{uid}`: `email, name, plan, stripe_customer_id, plan_usage.{plan}.{n_generations,n_newsletters_sent,n_chat_messages,n_credits}, settings_global.{timezone, ai_prompt, newsletter_email}, settings_X.{accounts, verified_accounts}, summary_data.{summary_html, summary_transcript, audio_url, last_generation_time, raw_data_sources}, pipeline_status.{current_stage, status, stages_completed, error}, cost_tracker, onboarded, TOS_accepted`. Storage: `users/{email}_{uid}/latest|history/{ts}/`.

The generation pipeline entrypoint is `backend.run_pipeline.run_flow_for_user`; it writes progress to `pipeline_status` (the polling seam the UI relies on).
