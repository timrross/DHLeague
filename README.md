# DHLeague

This project combines a Vite React client with an Express-based server.

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

## Configurable paths and service name

You can adjust deployment targets by editing the env values at the top of the workflow:

- `WEB_ROOT` (default `/var/www/html`): Destination for the built client assets served by Apache.
- `APP_ROOT` (default `/var/www/dhleague`): Directory for the bundled server files and lockfiles.
- `SERVICE_NAME` (default `dhleague`): Systemd service restarted after deployment.
- `NODE_VERSION` (default `20`): Node.js version used during the build.

## Run locally in Docker

Build and run the app in a container (listens on port `5000`):

```bash
docker build -t dhleague .
docker run --rm -p 5000:5000 --env-file .env dhleague
```

The container image runs the prebuilt server from `dist/index.js` and serves the bundled client from `dist/public`. Provide environment variables (e.g., `DATABASE_URL`, `REPLIT_DOMAINS`, `REPL_ID`, `SESSION_SECRET`, `ISSUER_URL`) via `--env-file` or individual `-e` flags.

## Server prerequisites

- Ubuntu host with SSH access from GitHub Actions runners (port 22 unless configured otherwise).
- Apache configured to serve files from `WEB_ROOT` and, if applicable, proxy requests to the Node service.
- Node.js and npm installed on the server (version matching `NODE_VERSION` recommended).
- A systemd unit named `SERVICE_NAME` that starts the Node application from `APP_ROOT` (the deploy step runs `npm ci --omit=dev` and `sudo systemctl restart SERVICE_NAME`).
- Deploy user must be able to write to `WEB_ROOT` and `APP_ROOT` and run `sudo systemctl restart` for the configured service.

## Running the workflow manually

Navigate to **Actions → Deploy** in GitHub, choose **Run workflow**, and select the desired branch (defaults to `main`). Ensure the secrets are configured and the server prerequisites are in place before triggering a deploy.
