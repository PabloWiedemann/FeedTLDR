# FeedTLDR

AI-powered daily summaries of your X/Twitter feed: scraped, summarized, narrated, and delivered by email.

This repository is the new home of FeedTLDR: a Next.js + shadcn/ui frontend and a FastAPI layer wrapping the existing Python pipeline (Apify scraping, Gemini summarization, TTS audio, SendGrid newsletters, Firebase, Stripe). It replaces the Streamlit app in [`feedtldr_streamlit`](https://github.com/PabloWiedemann/feedtldr_streamlit).

## Start here

- [docs/PLAN.md](docs/PLAN.md) — rebuild plan: current-state analysis, architecture, API contract, phased roadmap
- [docs/DESIGN.md](docs/DESIGN.md) — design system: tokens, typography, components, page specs

Status: Phases 0–5 implemented (backend re-homed + FastAPI layer + full Next.js frontend, all suites green). Remaining before cutover: real credentials/env wiring, live end-to-end QA (PLAN.md Phase 6), and deployment (Phase 7).

## Run locally

```bash
# API (needs apps/api/.env + credentials/, see .env.example)
cd apps/api && uv sync --all-extras && uv run uvicorn api.main:app --reload

# Web (needs apps/web/.env.local, see .env.example)
cd apps/web && pnpm install && pnpm dev
```
