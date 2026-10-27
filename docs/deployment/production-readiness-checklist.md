# Production readiness checklist

## Vercel

- [ ] Vercel project `shriramautomobiles` is rooted at the repository root and deploys `main`.
- [ ] Node.js `24.x`, the pinned pnpm version, root install command, build command, and `frontend/dist` output are confirmed in the project.
- [ ] Preview confirms `/`, nested frontend routes, static assets, `/api/health`, and API paths are routed to their intended handlers.
- [ ] Production domain, TLS, redirects, and monitoring are configured.

## Environment and secrets

- [ ] Production and Preview use distinct `AUTH_SECRET` values with at least 32 random characters.
- [ ] `DATABASE_URL` is server-side only, targets the intended pooled PostgreSQL database, and enables SSL.
- [ ] Production runtime has `NODE_ENV=production`.
- [ ] Optional integration variables are configured only when the feature is enabled.
- [ ] No private value is stored in source code or a `VITE_*` variable.

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
- [ ] `pnpm audit --prod` reports no known vulnerabilities at release time.
- [ ] Preview smoke tests pass using test-only records.
- [ ] Rollback owner and database recovery procedure are known.
- [ ] Production deployment is approved and monitored after release.
