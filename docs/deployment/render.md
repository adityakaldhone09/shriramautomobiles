# Render deployment

## Architecture

Use one Render Node.js web service from the repository root. The build compiles
the frontend to `frontend/dist` and the API to `backend/dist`; the compiled
Express server serves both the API and frontend. Vite is used only during the
build and local development. Render's PostgreSQL instance is not declared or
provisioned by this Blueprint; configure an authorized external PostgreSQL
database.

The root [render.yaml](../../render.yaml) is the Blueprint configuration. Its
free service plan is intended for a preview only; select a suitable paid plan
before production. Automatic deploys are disabled so syncing this Blueprint
does not opt into deploy-on-every-commit.

## Service commands

- **Root directory:** `.`
- **Runtime:** Node.js `24.22.1` (also pinned in `.node-version`)
- **Package manager:** Corepack and pnpm `11.24.0` from the root `package.json`
- **Build command:** `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm run build`
- **Start command:** `pnpm --filter @shriram/api start`
- **Health check:** `/api/health`

The server binds to `0.0.0.0` and uses Render's injected `PORT`. Startup checks
database connectivity before listening. `SERVE_FRONTEND=true` enables serving
the built Vite app; the API routes are mounted first, unknown `/api/*` paths
return JSON 404 responses, and HTML navigation paths use the SPA entry point.
Hashed files under `/assets/` receive immutable caching; other static files
have a zero-second cache lifetime. `TRUST_PROXY_HOPS=1` is set for Render's single proxy hop so
IP-based middleware sees the client address.

## Environment variables

Set secrets through the Render dashboard or Blueprint secret fields only. Do
not add secret values to the repository or to `VITE_*` variables.

| Variable                                                    | Required | Scope and purpose                                                                                                                        |
| ----------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                              | Yes      | Server-only PostgreSQL connection URL, including `sslmode=require` or stronger. Set it to the authorized Preview/staging database first. |
| `AUTH_SECRET`                                               | Yes      | Server-only random secret of at least 32 characters. The Blueprint asks Render to generate it; use a different value per environment.    |
| `NODE_ENV`                                                  | Yes      | Set to `production`; supplied by the Blueprint.                                                                                          |
| `PORT`                                                      | Yes      | Supplied by Render at runtime; do not set a fixed production port.                                                                       |
| `SERVE_FRONTEND`                                            | Yes      | `true` for the single-service frontend; supplied by the Blueprint.                                                                       |
| `TRUST_PROXY_HOPS`                                          | Yes      | `1` for the Render reverse proxy; supplied by the Blueprint.                                                                             |
| `VITE_API_URL`                                              | Yes      | Public build-time value `/api`; supplied by the Blueprint for same-origin requests.                                                      |
| `APP_URL`, `CORS_ORIGIN`                                    | Optional | Exact trusted web origin(s) only if a separate browser origin is required.                                                               |
| `SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET`, `GEMINI_API_KEY` | Optional | Existing server-side integrations; configure only when used.                                                                             |

Render supplies `PORT`. Never set a production `VITE_*` variable to a server
secret. For this single-service setup, the browser calls the same-origin
`/api` path.

## Database and release procedure

1. Provision or select a PostgreSQL database for Preview, separate from
   production. Use a pooled connection URL with SSL verification enabled and
   configure the database role with least privilege.
2. Set `DATABASE_URL` and `AUTH_SECRET` in Render's environment settings.
   The health endpoint `/api/health` is a liveness check; `/api/health/ready`
   additionally checks database connectivity.
3. Review the migrations and effective table grants/RLS policies. Apply
   migrations explicitly from an authorized Render shell or controlled
   operator environment with `pnpm run db:migrate`. The build and server
   startup do not run migrations or seeds. Do not run reset/seed utilities
   against production without separate approval.
4. Verify `/`, a nested frontend route, a built asset, `/api/health`,
   `/api/health/ready`, and an unknown `/api/*` route. Then verify anonymous
   catalog access and authentication/booking flows using a dedicated
   test-only account and test data.
5. Inspect Render logs and responses for accidental exposure of credentials,
   tokens, database details, SQL parameters, and personal data.
6. Only after Preview checks and database review should the owner approve a
   production service and database configuration.

Render deployment and database access were not performed for this change.
Database connectivity, migrations, grants, RLS behavior, authentication flows,
and the live Render routing remain unverified. The current rate limiter is
process-local and does not coordinate across instances; replace or supplement
it with shared rate limiting before production.

## Repository audit notes

- The unused Replit Vite plugins were not imported by the application; they
  have been removed from the frontend manifest, workspace catalog, and lockfile.
  Styling classes and legitimate UI behavior remain unchanged. The Replit
  attribution comments in two UI primitives were removed or rewritten as
  neutral styling notes.
- No tracked Kilo configuration, coding-agent instruction file, or MCP
  configuration was found. Ignored local `.kilo` worktrees were left untouched.
  The customer-facing service-intelligence assistant remains a product feature.
- The Compose file previously referenced missing application Dockerfiles and
  contained static development credentials. It now starts only a local
  PostgreSQL container with a required, untracked `POSTGRES_PASSWORD`.
- No actual `.env` file is tracked in the current tree or in the inspected Git
  path history. An automated history scanner is unavailable here; earlier
  Compose defaults remain in repository history. If those values were ever
  used for a reachable database or service, rotate them before Preview.
- The auth session cookie is now read from the request header (the application
  did not install cookie-parsing middleware), and authentication controller
  errors no longer return raw internal exception messages.

## Rollback

Use Render's dashboard to redeploy the last known-good application version.
Treat database recovery separately: do not automatically reverse migrations or
restore a backup without database-owner approval. After rollback, verify the
site, API liveness/readiness, and test-only data.
