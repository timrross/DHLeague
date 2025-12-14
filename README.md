# DHLeague

This project combines a Vite React client with an Express-based server. The
production site will live at **https://mtbfantasy.com**, with both the client
and API endpoints served from that domain.

The server bundles two logical services that are mounted under distinct base
paths:

- **Game mechanics service** – exposed at `/api/game/*` (legacy clients can
  continue using `/api/*`). This service owns team building, scoring, and
  leaderboard APIs.
- **Rider data service** – exposed at `/api/rider-data/*` for rider CRUD and
  race metadata.

## Deployment workflow

The GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the client and server on pushes to `main` or when triggered manually. It performs these steps:

1. Check out the repository and set up Node.js using `actions/setup-node`.
2. Install dependencies with `npm ci`.
3. Run `npm run build` to produce the Vite client bundle in `dist/public` and the bundled server output in `dist/`.
4. Publish the build and lockfiles as an artifact for the deployment job.
5. Use SSH to copy the client bundle to the Apache web root and the server bundle plus lockfiles to the application directory.
6. Install production dependencies on the server and restart the Node service.

## Required secrets

Configure these repository or environment secrets so the deploy job can connect to the server:

- `SSH_HOST`: Hostname or IP address of the Ubuntu server.
- `SSH_USER`: SSH user with permission to write to the deployment paths and restart services.
- `SSH_KEY`: Private SSH key for the deploy user (use a multi-line key value).

At runtime the app expects the following environment variables:

- `DATABASE_URL`: Postgres connection string used by both services.
- `SESSION_SECRET`: Session signing secret for auth flows.
- `RIDER_DATA_BASE_URL`: Base URL where the rider data service is reachable; defaults to `http://localhost:5000/api/rider-data`
  when the services run together.
- `AUTH_DOMAINS`: Comma-separated list of allowed hostnames for login callbacks. Include `mtbfantasy.com` in production.
- `ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_CALLBACK_URL`: OIDC values required for login; ask the admin
  for the tenant-specific credentials before deploying. In production the callback should be `https://mtbfantasy.com/api/callback`.

## Configurable paths and service name

You can adjust deployment targets by editing the env values at the top of the workflow:

- `WEB_ROOT` (default `/var/www/dhleague_web`): Destination for the built client assets served by Apache.
- `APP_ROOT` (default `/var/www/dhleague_app`): Directory for the bundled server files and lockfiles.
- `SERVICE_NAME` (default `dhleague`): Systemd service restarted after deployment.
- `NODE_VERSION` (default `24`): Node.js version used during the build.

## Run locally in Docker

### Single container (app only)

Build and run the app in a container (listens on port `5000`):

```bash
docker build -t dhleague .
docker run --rm -p 5000:5000 --env-file .env dhleague
```

The container image runs the prebuilt server from `dist/index.js` and serves the bundled client from `dist/public`. Provide environment variables (e.g., `DATABASE_URL`, `REPL_ID`, `SESSION_SECRET`, `ISSUER_URL`, `OIDC_CALLBACK_URL`) via `--env-file` or individual `-e` flags.

### App + Postgres via Docker Compose (hot reload)

Spin up the app alongside a local Postgres instance with your source tree mounted for hot reload:

```bash
docker compose up --build
```

This uses `docker-compose.yml` to build the `dev` stage, expose port `5001` (mapped to the app's `5000`), and start a `postgres:16-alpine` container with credentials `postgres/postgres`. The app service binds the repository into the container, installs dependencies into an isolated `app_node_modules` volume, and runs `npm run dev`, enabling Vite/Express hot reload whenever you edit files locally. The app receives a `DATABASE_URL` pointing at the companion database; override any values by setting them in your `.env` file or by passing `--env` flags to `docker compose`.

### Initialize the database schema

Before hitting any API that relies on Postgres (including the OIDC session store), push the schema defined in `shared/schema.ts` to your database:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run db:push
```

Adjust the connection string for your environment. This creates all required tables (e.g., `sessions`, `users`, `teams`, etc.). You only need to rerun it when the schema changes.

## API route map

Every HTTP API is served beneath the `/api` prefix. The fantasy league service is mounted at `/api` (while `/api/game` is kept as a compatibility alias) and the rider data service is mounted at `/api/rider-data`. Key endpoints include:

- `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`: OIDC entry points for starting, completing, and ending sessions.
- `/api/auth/user`, `/api/auth/admin`: Session + authorization metadata used by the client.
- `/api/teams`, `/api/races`, `/api/leaderboard`, `/api/upload-image`: Core fantasy league resources.
- `/api/rider-data/riders/*`, `/api/rider-data/races/*`: Rider data service routes.

If you run the fantasy league service standalone (without the `/api` mount), set `AUTH_PUBLIC_PATH` to the externally visible base (defaults to `/api/auth`) and, if you also remount the internal router, adjust `AUTH_ROUTER_PREFIX` (defaults to `/auth`). The callback URL injected into the Auth0 configuration uses the `LOCALHOST_CALLBACK_PORT` (defaults to `5001`) for `localhost`/`127.0.0.1`, so bump that env var whenever you change the published port during development.

## Seed realistic data locally

Use the built-in seed scripts to populate riders and races from the sample files in `server/scripts/data` (JSON or CSV). The operations are idempotent, so you can rerun them to update existing rows without creating duplicates.

```bash
npm run seed
# or target specific files
npm run seed -- server/scripts/data/riders.sample.csv server/scripts/data/races.sample.csv
```

Admin users can also post arrays of riders or races to `/api/admin/seed/riders` and `/api/admin/seed/races` to perform the same bulk upsert from the UI or external tools.

## Server prerequisites

- Ubuntu host with SSH access from GitHub Actions runners (port 22 unless configured otherwise).
- Apache configured to serve files from `WEB_ROOT` and, if applicable, proxy requests to the Node service.
- Node.js and npm installed on the server (version matching `NODE_VERSION` recommended).
- A systemd unit named `SERVICE_NAME` that starts the Node application from `APP_ROOT` (the deploy step runs `npm ci --omit=dev` and `sudo systemctl restart SERVICE_NAME`).
- Deploy user must be able to write to `WEB_ROOT` and `APP_ROOT` and run `sudo systemctl restart` for the configured service.

## Running the workflow manually

Navigate to **Actions → Deploy** in GitHub, choose **Run workflow**, and select the desired branch (defaults to `main`). Ensure the secrets are configured and the server prerequisites are in place before triggering a deploy.

## Race API examples

The rider data service exposes race metadata at `/api/rider-data/races`.

- `GET /api/rider-data/races` returns a list of races with status, start and end times, and location. Example:

  ```json
  [
    {
      "id": 1,
      "name": "Fantasy League Opener",
      "location": "Snowmass, Colorado",
      "country": "USA",
      "startDate": "2025-03-28T18:03:31.177Z",
      "endDate": "2025-03-29T18:03:31.177Z",
      "imageUrl": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
      "status": "next"
    }
  ]
  ```

- `GET /api/rider-data/races/next` returns only the next upcoming race (404 if none exist) with the same fields as above.

Race results remain available at `/api/rider-data/races/:id/results` and include an empty list until results are recorded.
