# DHLeague architecture

## High-level layout
- **client/** – Vite + React front end (TypeScript). Uses Wouter for routing, React Query for data, and Tailwind-based UI components. Entry point: `client/src/main.tsx`; routes defined in `client/src/App.tsx`.
- **server/** – Express server that hosts two logical services: the fantasy league app and the rider data service. Startup is orchestrated from `server/index.ts`, which ensures the database schema, wires authentication, registers services, and conditionally mounts the Vite dev server or static assets.
- **shared/** – Cross-cutting schema and helpers (e.g., Drizzle schema) used by both client and server.
- **docs/, tools/, scripts/** – Reference material and automation helpers (e.g., seeding, UCI ingestion utilities under `server/scripts` and `src/scripts`).

## Runtime composition
1. `server/index.ts` bootstraps Express, verifies schema via `ensureDatabaseSchema`, initializes auth, and mounts the two sub-apps under an HTTP server.
2. **Rider data service** (`server/apps/riderDataService.ts`): owns rider CRUD and public race metadata. Mounted at `/api/rider-data`, exposing race list/detail/results plus rider endpoints.
3. **Fantasy league service** (`server/apps/fantasyLeagueService.ts`): core game routes for teams, races, riders, leaderboards, auth, and admin utilities. Mounted at `/api` and `/api/game`. Also exposes `/upload-image` and serves uploaded assets under `/uploads`.
4. In development (`NODE_ENV=development`), Vite dev middleware is attached after API routes; in production static assets from `dist/public` are served after the API stack.
5. The server listens on port **5000** for both API and client content.

## Data and persistence
- Postgres is the primary store. Connections are managed via `server/db.ts` (Drizzle + `pg`), using the schema in `shared/schema.ts`.
- `ensureDatabaseSchema` performs idempotent DDL at startup to keep local and container environments usable without manual migrations.
- Seed and sync utilities live in `server/scripts` (e.g., `seed.ts`, `sync-uci-riders.ts`) and `src/scripts/verify-dataride-import.ts`.

## Client behavior
- Routes are declared with `<Switch>`/`<Route>` in `client/src/App.tsx` (home, team builder, races with detail pages, leaderboard, rules, admin, login, 404).
- React Query is initialized in `client/src/main.tsx` for data fetching/caching across the app.
- Shared UI components live under `client/src/components`, with feature pages in `client/src/pages` and supporting helpers in `client/src/lib`, `hooks`, and `services`.

## Build and deployment
- `npm run build` bundles the client with Vite and the server with esbuild into `dist/`. The production container serves `dist/index.js` and `dist/public`.
- CI/CD uses GitHub Actions (`.github/workflows/deploy.yml`) to build, package artifacts, and deploy via SSH. Core environment variables (e.g., `DATABASE_URL`, `SESSION_SECRET`, `AUTH_BASE_URL`, OIDC values) must be set for runtime.
- Docker workflows: `docker build`/`docker run` for single-container usage on port 5000; `docker compose up` for dev with Postgres and hot reload on port 5001 (proxying to the app’s 5000).

## Cross-cutting concerns
- **Auth**: configured in `server/auth.ts` and applied globally before route registration.
- **Static assets**: `public/` is the source for static files; uploads are read from `public/uploads`.
- **Observability**: server-level logging uses the helper in `server/vite.ts` (minimal console logging).
