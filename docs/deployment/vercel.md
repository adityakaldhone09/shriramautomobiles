# Vercel deployment (Frontend)

## Architecture

Deploy the React/Vite frontend on Vercel as a static SPA. The backend Express API remains deployed separately on Render (`https://shriram-automobiles.onrender.com`).

The public routes are:

| Route                       | Destination                                                |
| --------------------------- | ---------------------------------------------------------- |
| `/` and client SPA paths    | `frontend/dist/index.html` (SPA fallback)                  |
| `/api/(.*)`                 | Proxied to `https://shriram-automobiles.onrender.com/api/$1`|
| Built static assets         | `frontend/dist` files (`assets/`, `favicon.svg`, etc.)     |

Client-side requests target the Render backend directly when `VITE_API_URL` is set to `https://shriram-automobiles.onrender.com/api`. The Vercel `/api/(.*)` rewrite acts as a same-origin fallback.

## Vercel project settings

- **Project name:** `shriramautomobiles`
- **Production branch:** `main`
- **Root Directory:** repository root (`.`)
- **Framework Preset:** `Vite` (defined in `vercel.json`)
- **Node.js Version:** `24.x`
- **Install Command:** `pnpm install --frozen-lockfile --prod=false`
- **Build Command:** `pnpm --filter @shriram/web run build`
- **Output Directory:** `frontend/dist`
- **Package manager:** pinned to `pnpm@11.24.0` in the root `package.json`

The root [vercel.json](../../vercel.json) configures these settings. If configuring through the Vercel Dashboard, ensure the **Output Directory** is set to `frontend/dist` (or left to `vercel.json` without overriding to `dist`), and the **Root Directory** is `.`.

## Environment variables

Configure these in Vercel's Environment Variables settings (Production and Preview scopes):

| Variable       | Required | Scope                        | Purpose                                                                                                                                                 |
| -------------- | -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | Yes      | Production & Preview (Build) | Public API base URL including the `/api` prefix: `https://shriram-automobiles.onrender.com/api`. (Do not set to localhost or omit the `/api` suffix). |

**Render backend configuration:**
On Render, configure `APP_URL` or `CORS_ORIGIN` to include the deployed Vercel domain (e.g. `https://shriramautomobiles.vercel.app`) so that cross-origin authenticated requests and cookies are permitted.

Backend secrets (`DATABASE_URL`, `AUTH_SECRET`, etc.) stay strictly on Render and must NEVER be added to Vercel environment variables.


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
