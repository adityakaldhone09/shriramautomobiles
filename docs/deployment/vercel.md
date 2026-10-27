# Vercel deployment

## Selected architecture

Use one Vercel project rooted at the repository root. The React/Vite app is built as static files in `frontend/dist`; `api/[...path].ts` exports the existing Express app as one Node.js Function. The Function receives `/api/*`, and Express continues to mount its router at `/api`.

The public routes are:

| Route                       | Destination                               |
| --------------------------- | ----------------------------------------- |
| `/` and other non-API paths | `frontend/dist/index.html` (SPA fallback) |
| `/api/*`                    | `api/[...path].ts` → Express              |
| Existing static assets      | `frontend/dist` files                     |

This uses Vercel's standard Functions and static output rather than the Services configuration, which is currently documented as beta. There are no Vercel service names or service bindings: browser requests use same-origin `/api` URLs, and the API talks directly to PostgreSQL.

The SPA rewrites deliberately exclude `/api` and `/api/*`. The catch-all Function serves API paths; static files are served from the configured output directory.

## Vercel project settings

- **Project name:** `shriramautomobiles`
- **Production branch:** `main`
- **Root Directory:** repository root (`.`)
- **Framework Preset:** Other (the repository runs its own monorepo build)
- **Node.js Version:** `24.x`
- **Install Command:** `pnpm install --frozen-lockfile --prod=false`
- **Build Command:** `pnpm --filter @shriram/web run build`
- **Output Directory:** `frontend/dist`
- **Package manager:** pinned to `pnpm@11.24.0` in the root `package.json`

The install/build/output settings are also in the root [vercel.json](../../vercel.json). The Vercel Project Root Directory is an account-level setting and must be `.`; `vercel.json` cannot change it. Setting it to `frontend/` makes output paths and the API Function outside that directory unavailable to the deployment. Keep the framework preset as **Other** and do not override the commands or output directory in the dashboard. The filtered build runs Vite from the frontend workspace while leaving the deployment output path relative to the repository root.

The reported `vite build --config vite.config.ts` line is the frontend package's underlying build process, not proof by itself that the Vercel Root Directory is correct. The decisive configuration is that the repository-root build creates `frontend/dist/index.html`, while Vercel's configured output directory is `frontend/dist`. A deployment error expecting only `dist` indicates that Vercel is using a different Root Directory or a dashboard override rather than this repository-root configuration. Verify those project settings before retrying.

The Root Directory, install/build/output settings and SPA rewrites must match the repository-root deployment described above. No Vercel deployment or account-level validation was performed in this repository.

## Environment variables

Configure these in Vercel's Environment Variables settings. Never commit their values.

| Variable                  | Required                                 | Scope                                   | Purpose                                                                                                                                 |
| ------------------------- | ---------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Yes                                      | Preview and Production, backend runtime | PostgreSQL/Supabase pooled connection URL with `sslmode=require` (or stronger verification). Use a non-production database for Preview. |
| `AUTH_SECRET`             | Yes                                      | Preview and Production, backend runtime | Random secret of at least 32 characters. Use different secrets in Preview and Production.                                               |
| `NODE_ENV`                | Set to `production` for deployed runtime | Preview and Production, backend runtime | Enables production validation and safe error responses.                                                                                 |
| `APP_URL`                 | Optional                                 | Preview and Production, backend runtime | Exact frontend origin if cross-origin requests are required.                                                                            |
| `CORS_ORIGIN`             | Optional                                 | Preview and Production, backend runtime | Exact allowed browser origin if it differs from `APP_URL`.                                                                              |
| `SUPABASE_URL`            | Optional                                 | Backend runtime                         | Used by storage configuration when that integration is enabled.                                                                         |
| `SUPABASE_STORAGE_BUCKET` | Optional                                 | Backend runtime                         | Storage bucket name; defaults in code when omitted.                                                                                     |
| `GEMINI_API_KEY`          | Optional                                 | Backend runtime                         | Enables the existing Gemini integration.                                                                                                |
| `VITE_API_URL`            | Optional                                 | Preview and Production build            | Public API base URL; keep it `/api` for the one-domain deployment. It is not a secret.                                                  |

`PORT` is only for local development. `VITE_API_PROXY_TARGET` is also local-development-only; it points Vite's `/api` proxy at the local API and must not be used as a production browser URL. No Supabase service-role key is read by the application code and none should be added to frontend variables. Vercel provides environment variables to the backend Function at runtime; only `VITE_*` values are exposed to the browser build.

For the same-domain setup, leave `APP_URL` and `CORS_ORIGIN` unset unless another trusted web origin needs API access. Production CORS does not include localhost by default.

## Database preparation and migrations

1. Provision a PostgreSQL/Supabase database and use its pooled connection URL with SSL enabled. Configure connection limits for serverless use; the backend pool is capped at five connections per warm Function instance.
2. Apply migrations as an explicit, reviewed deployment operation—not during builds, imports, requests, or cold starts:

   ```bash
   pnpm run db:migrate
   ```

   Set `DATABASE_URL` securely in the migration process environment; do not put credentials in command history or logs. Run this first against an authorized staging database. The migrations are under `backend/src/db/migrations`; `0001_enable_rls_security_policies.sql` enables RLS, applies the existing public catalog/service-role policies, and creates an event trigger. Confirm that the database role used for this operation has the required privileges. If the event trigger is not permitted by the managed database, use the authorized database-owner procedure and verify the resulting policies manually.

3. Review the schema and grants against the target database before running migrations. Back up production and obtain the required change approval before applying any production migration.
4. Seed catalog data only when explicitly intended and authorized. Seeding is not part of Vercel build or Function startup.
5. Use a least-privilege application role and verify its `BYPASSRLS` status and grants. API ownership/role checks remain required even with RLS enabled; this guide does not certify database policy correctness.

No database migration, seed, RLS operation, or production data access was performed for this change.

## Preview and production procedure

1. Configure separate Preview and Production database URLs and authentication secrets.
2. Create a Preview deployment and verify the build, static assets, SPA deep links, and `/api/health`.
3. Once the Preview database has been migrated and seeded as required, verify `/api/health/ready`, one anonymous catalog request, and one authenticated request using a dedicated test account only.
4. Review Vercel Function logs to ensure error responses and logs do not reveal SQL parameters, credentials, tokens, or customer data.
5. Before production, complete [the production-readiness checklist](./production-readiness-checklist.md), confirm a current database backup, and obtain approval for any required migration/seed step.
6. Merge/deploy through the repository's approved `main` workflow. No `vercel --prod` command was run.

## Smoke tests

After a Preview or production deployment:

```bash
curl -i https://<deployment-host>/
curl -i https://<deployment-host>/a-known-frontend-route
curl -i https://<deployment-host>/api/health
curl -i https://<deployment-host>/api/health/ready
curl -i https://<deployment-host>/api/vehicles/brands
```

`/api/health` is a liveness check and does not query the database. `/api/health/ready` and application API routes check database connectivity before dispatch. Do not use real customer identities or records in smoke tests.

## Rollback

- Roll back application code using Vercel's prior known-good deployment.
- Treat database rollback separately. Do not automatically reverse migrations or restore a backup without database-owner approval; migrations may not be reversible and restoring can discard later data.
- After rollback, verify the site, API health, database readiness, and the integrity of test-only records.

## Known limitations and current blockers

- `pnpm audit --prod` currently reports no known vulnerabilities after updating the affected production dependencies. Re-run it before release.
- The in-process rate limiter uses a `Map`; it does not coordinate across Vercel Function instances and is not sufficient as a durable production abuse-control system. Use a shared rate-limit store/provider before relying on it for account security.
- Express request bodies are limited to 1 MB. PostgreSQL connection attempts time out after five seconds, with a pool maximum of five connections per Function instance. The Vercel Function uses the platform's configured default execution limit; verify that limit against any long-running service-intelligence request before release.
- Database connectivity, migration privileges, RLS/grants, catalog seeding, and authenticated flows have not been verified against an authorized staging database.
- The full existing security suite could not connect to the configured remote PostgreSQL database in its baseline run. The local-only rerun with `NODE_ENV=test` and `DATABASE_URL` unset passed all 24 security regression checks against the in-memory database; this does not verify the remote database.
- Vercel CLI/account-level build and deployed routing checks require project access and have not been performed.
- Existing security audit reports are historical repository artifacts, not evidence that the current deployment has been tested or penetration-tested.

**Current deployment status: NOT READY.** The local configuration/build can be validated here, but the listed external/runtime blockers must be resolved before preview or production acceptance.
