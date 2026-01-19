# DHLeague conventions

## Development workflow
- Install dependencies with `npm ci`. Use `npm run dev` for local development (Express + Vite), `npm run build` before shipping, and `npm start` for production runs against `dist/`.
- Validate changes with `npm test` (server tests), `npm run check` (TypeScript), and `npm run lint:data` for data typing when relevant. Run the minimal set necessary for your change but state what you executed.
- Database helpers: `npm run db:push` to apply Drizzle migrations to a target database; `npm run seed` to populate riders/races from sample data; `npm run sync:uci-riders` to refresh rider data from UCI sources.

## Project structure guidelines
- Keep the separation of concerns:
  - **Server**: add APIs through route/controller pairs under `server/routes` and `server/controllers`, using the fantasy vs. rider data service boundaries. Middleware lives under `server/middleware`. Shared utilities belong in `server/utils` or `shared/`.
  - **Client**: pages under `client/src/pages`, reusable UI in `client/src/components`, hooks in `client/src/hooks`, and API clients in `client/src/services`. Keep routing centralized in `client/src/App.tsx`.
  - **Shared**: update `shared/schema.ts` and types together when changing database shapes; ensure both client and server imports stay aligned.
- Prefer TypeScript everywhere; use explicit types for public interfaces and API payloads. Avoid `any` except at strict boundaries (e.g., Express request bodies) and narrow quickly.

## Coding standards
- Express routes should return typed JSON payloads and use existing middleware (`requireAuth`, `isAdmin`) for access control. Keep new endpoints idempotent where possible and reuse helpers for uploads and logging.
- Database access should go through Drizzle (`server/db.ts`) or the established pooling utilities; avoid ad-hoc connections.
- For client data fetching, favor React Query hooks and colocate query keys/types near the consuming feature.
- UI: follow the Tailwind + shadcn-style component patterns already present; keep layout wrappers (`Header`, `Footer`, `AdProvider`) intact.
- Error handling: log actionable messages on the server and return sanitized responses; keep user-facing errors concise.

## Testing and quality
- Add targeted tests for new server logic under `server/**/*.test.ts`; use the existing test utilities for setup.
- Keep fixture data under `client/src/fixtures` or `server/scripts/data` depending on the consumer.
- When touching authentication, verify flows against the configured `AUTH_*` environment variables and callback paths.
- Tests run against `TEST_DATABASE_URL` and reset the schema before and after. Use a dedicated database (separate from any live/dev app DB).
- Season scenarios use `SCENARIO_DATABASE_URL` (or `TEST_DATABASE_URL`) and also reset the schema before and after by default.

## Documentation and communication
- Update relevant docs when behaviors change (`project/README.md`, `project/architecture.md`, `project/conventions.md`, or feature-specific notes). Keep environment variable requirements accurate.
- Summaries and PRs should list modified areas (client/server/shared), user-visible impacts, and test coverage. Include repro steps for functional changes (port 5001, env vars, seed commands).
