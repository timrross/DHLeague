# DHLeague agent handbook

Welcome! This repository powers the DHLeague fantasy MTB experience. Use this guide to stay consistent across the codebase.

## Ground rules
- Read `architecture.md` and `conventions.md` before making changes so you understand how the client, server, and shared packages fit together.
- Prefer `rg` for search and keep commands and paths reproducible in your notes and PRs.
- Follow the developer instructions to **commit every change** and create a PR message via the provided tooling when work is complete.
- Keep documentation current: if you change behaviors, update the relevant docs alongside code.

## Expectations for contributions
- Use TypeScript everywhere (server, client, scripts). Align new APIs with the existing Express + Drizzle stack and React Query + Wouter client patterns.
- Lean on the provided scripts: `npm run dev` for local work, `npm run build` before shipping, `npm test`/`npm run check` for regressions and type safety.
- Preserve the split between the fantasy league service (`/api` + `/api/game`) and rider data service (`/api/rider-data`). Add endpoints through the existing route/controller structure.
- Keep shared contracts in `shared/` in sync between client and server when you change data shapes.

## Communication checklist
- Summaries and PR bodies should call out touched areas (client/server/shared), tests you ran, and any follow-up risks.
- When adding developer-facing functionality, mention how to exercise it locally (port 5001, environment variables, seed scripts).
