# Production readiness checklist

## Render preview

- [ ] Render Blueprint is rooted at the repository root and the intended branch is selected.
- [ ] Node.js, pnpm, build/start commands, and health-check path match [render.yaml](../../render.yaml).
- [ ] Preview confirms `/`, nested frontend routes, static assets, `/api/health`, `/api/health/ready`, and JSON errors for unknown API routes.
- [ ] Preview database is separate from production and uses SSL.

## Vercel alternative

- [ ] Vercel project is rooted at the repository root with Node.js `24.x`, root install/build settings, and `frontend/dist` output.
- [ ] Preview confirms SPA routes, static assets, and `/api/*` routing.

## Environment and secrets

- [ ] Production and Preview use distinct `AUTH_SECRET` values with at least 32 random characters.
- [ ] `DATABASE_URL` is server-side only, targets the intended pooled PostgreSQL database, and enables SSL.
- [ ] Production runtime has `NODE_ENV=production`.
- [ ] Optional integration variables are configured only when the feature is enabled.
- [ ] No private value is stored in source code or a `VITE_*` variable.
- [ ] A secret scanner has checked all Git refs; previously committed credentials, if used, have been rotated.

## Database and security

- [ ] Database backup and migration approval are recorded before production changes.
- [ ] Migrations are applied explicitly and reviewed; no migration or seed runs at Function startup.
- [ ] RLS policies, table grants, application role privileges, and `BYPASSRLS` behavior are verified against the actual database.
- [ ] Required catalog data is seeded only through the approved procedure.
- [ ] Authentication, ownership checks, role checks, and representative safe anonymous/authenticated requests pass in staging.
- [ ] Shared rate limiting is available for authentication and other sensitive operations.
- [ ] Logs and error responses are checked for credentials, tokens, SQL parameters, and personal data.

## Release and rollback

- [ ] Workspace type checks, tests, and production builds pass.
- [ ] `pnpm audit` reports no known vulnerabilities at release time.
- [ ] Preview smoke tests pass using test-only records.
- [ ] Shared rate limiting is configured for production traffic.
- [ ] Rollback owner and database recovery procedure are known.
- [ ] Production deployment is approved and monitored after release.
