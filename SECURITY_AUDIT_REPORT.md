# SECURITY AUDIT REPORT

## Executive Summary

- Application: Shriram Automobiles E-Commerce & Two-Wheeler Service Platform
- Stack: PostgreSQL/Supabase, Drizzle ORM, Node.js/Express, React/Vite, TypeScript, TailwindCSS
- Environment reviewed: Local Development, Staging & Production Configuration Definitions
- Date: 2026-09-30
- Overall status: SECURITY AUDIT COMPLETED — 14 vulnerabilities identified and remediated; 24 automated security regression tests created and passing.
- Remaining manual checks: Cloud production environment variable rotation, Supabase Storage bucket RLS policies, Payment gateway webhook HMAC validation in live production, and production DNS / SSL certificates.

## Attack Surface

- Public endpoints:
  - `GET /api/health`
  - `POST /api/auth/register` (Rate limited: 15 req / 15 min)
  - `POST /api/auth/login` (Rate limited: 15 req / 15 min)
  - `POST /api/auth/logout`
  - `POST /api/auth/refresh`
  - `POST /api/auth/forgot-password` (Rate limited: 15 req / 15 min)
  - `POST /api/auth/reset-password` (Rate limited: 15 req / 15 min)
  - `GET /api/vehicles/brands`
  - `GET /api/vehicles/models`
  - `GET /api/vehicle-models`
  - `GET /api/parts`
  - `GET /api/parts/categories`
  - `GET /api/parts/compatible/:vehicleId`
  - `GET /api/parts/:id`
  - `GET /api/services`
  - `GET /api/services/symptoms`
  - `GET /api/services/:id`
  - `GET /api/intelligence/symptoms`
  - `GET /api/intelligence/recommendations`
  - `GET /api/service-recommendations`
  - `GET /api/helmets/brands`
  - `GET /api/helmets/types`
  - `GET /api/helmets`
  - `GET /api/helmets/:id`
  - `GET /api/mechanics` (Sanitized)
  - `GET /api/mechanics/slots`
  - `GET /api/slots`
  - `POST /api/wholesale/quote`
  - `POST /api/bookings` (Guest walk-ins allowed; validated server-side)

- Authenticated endpoints:
  - `GET /api/auth/me`
  - `GET /api/account/profile`
  - `GET /api/account/addresses`
  - `POST /api/account/addresses`
  - `DELETE /api/account/addresses/:id`
  - `GET /api/account/vehicles`
  - `POST /api/account/vehicles`
  - `GET /api/account/vehicles/:id`
  - `PUT /api/account/vehicles/:id`
  - `DELETE /api/account/vehicles/:id`
  - `GET /api/account/orders`
  - `GET /api/account/orders/:orderNumber`
  - `GET /api/account/bookings`
  - `GET /api/account/bookings/:bookingNumber`
  - `GET /api/account/bookings/:id/estimate`
  - `GET /api/account/estimates`
  - `PUT /api/account/estimates/:id/approve`
  - `PUT /api/account/estimates/:id/reject`
  - `GET /api/account/notifications`
  - `PATCH /api/account/notifications/:id/read`
  - `GET /api/bookings` (Role-scoped: Customers only view own bookings)
  - `GET /api/bookings/:id` (Ownership enforced: Customer, Assigned Mechanic, Staff, Admin)
  - `GET /api/estimates/:bookingId` (Ownership enforced)
  - `POST /api/estimates/:bookingId/approve` (Customer ownership & status validation)
  - `POST /api/estimates/:bookingId/reject` (Customer ownership & status validation)
  - `GET /api/cart`
  - `POST /api/cart/items`
  - `PATCH /api/cart/items/:id`
  - `PUT /api/cart/items/:id`
  - `DELETE /api/cart/items/:id`
  - `DELETE /api/cart`
  - `GET /api/orders`
  - `GET /api/orders/:id`
  - `POST /api/orders`
  - `GET /api/notifications`
  - `PATCH /api/notifications/:id/read`

- Admin endpoints:
  - `GET /api/admin/customers` (Role: ADMIN, STAFF)
  - `GET /api/admin/inventory` (Role: ADMIN, STAFF)
  - `GET /api/admin/inventory/low-stock` (Role: ADMIN, STAFF)
  - `PATCH /api/admin/orders/:id/status` (Role: ADMIN, STAFF)
  - `POST /api/admin/bookings/:id/assign-mechanic` (Role: ADMIN, STAFF)
  - `POST /api/parts` (Role: ADMIN)
  - `PUT /api/parts/:id` (Role: ADMIN)
  - `DELETE /api/parts/:id` (Role: ADMIN)
  - `GET /api/wholesale/quotes` (Role: ADMIN, STAFF)

- Staff endpoints:
  - `GET /api/admin/customers`
  - `GET /api/admin/inventory`
  - `GET /api/admin/inventory/low-stock`
  - `PATCH /api/admin/orders/:id/status`
  - `POST /api/admin/bookings/:id/assign-mechanic`
  - `GET /api/wholesale/quotes`

- Mechanic endpoints:
  - `GET /api/bookings` (Filtered to assigned jobs)
  - `GET /api/bookings/:id` (Restricted to assigned booking)
  - `PATCH /api/bookings/:id/status` (State machine validated)
  - `POST /api/estimates/:bookingId` (Restricted to assigned booking)

- File uploads:
  - Client-submitted images (URL strings with schema sanitization). Direct multipart storage uploads must be handled via authenticated object storage signed URLs with explicit MIME type validation (`image/jpeg`, `image/png`, `image/webp`).

- Webhooks:
  - Razorpay / Payment webhook handlers must verify HMAC SHA-256 signatures server-side.

- Payments:
  - Razorpay order initiation and server-side payment verification (zero trust for client-side status flags).

- External services:
  - Supabase Database (PostgreSQL via SSL connection pooler)
  - Supabase Storage (Bucket isolation)
  - Google Gemini API (Service intelligence)

- Sensitive data stores:
  - `users` (password hashes, roles, authentication credentials)
  - `customers` (contact information, email, phone numbers)
  - `orders` & `order_items` (financial transactions, delivery addresses)
  - `service_bookings` & `service_estimates` (vehicle maintenance records, repair quotes)
  - `service_parts` (internal purchase costs and wholesale supplier records)

## Findings

### [SEC-001]

- Severity: High
- Category: Broken Object Level Authorization (BOLA / IDOR) & Missing Route Implementation
- Component: `backend/src/modules/account`, `backend/src/routes/index.ts`
- Evidence: The customer dashboard in the frontend made direct calls to `/api/account/profile`, `/api/account/vehicles`, and `/api/account/bookings`. However, the `/api/account` router was not implemented or mounted on the backend, leading to client/server discrepancies and lack of backend ownership verification.
- Risk: Customers were unable to manage their vehicles and bookings securely, and client-side guards could easily be bypassed if endpoints were accessed without strict server-side `userId` scoping.
- Fix implemented: Created a comprehensive `AccountController` and `accountRouter` mounted at `/api/account` guarded with `requireAuth`. Implemented strict IDOR checks on profiles, addresses, vehicles (`GET`, `POST`, `PUT /:id`, `DELETE /:id`), orders (`GET /:orderNumber`), bookings (`GET /:bookingNumber`), estimates, and notifications.
- Verification: Regression test suite verified that Customer A cannot read, update, or delete Customer B's vehicles or bookings (returning 404/403).
- Residual risk: None for code level.
- Manual action: None.

### [SEC-002]

- Severity: Critical
- Category: Broken Access Control & Information Disclosure
- Component: `backend/src/modules/bookings/bookings.routes.ts`, `backend/src/modules/bookings/bookings.controller.ts`
- Evidence: `GET /api/bookings` and `GET /api/bookings/:id` had no authentication or authorization checks. Any unauthenticated anonymous caller could issue a GET request and retrieve the entire database of service bookings, exposing customer names, phone numbers, vehicle models, and repair notes.
- Risk: Massive data exfiltration of customer personally identifiable information (PII) and service histories.
- Fix implemented: Added `requireAuth` middleware to `GET /api/bookings` and `GET /api/bookings/:id`. Scoped `getBookings` based on user role: `ADMIN`/`STAFF` view all bookings, `MECHANIC` views only assigned bookings, and `CUSTOMER` views only bookings where `userId = user.id`. In `getBookingById`, verified ownership and returned 403 Forbidden for unauthorized users.
- Verification: Automated tests confirmed unauthenticated requests receive 401, Customer A accessing Customer B's booking receives 403, and Customer B receives 200.
- Residual risk: None.
- Manual action: None.

### [SEC-003]

- Severity: High
- Category: Broken Authorization & Insecure State Transitions
- Component: `backend/src/modules/estimates/estimates.controller.ts`, `backend/src/modules/estimates/estimates.routes.ts`
- Evidence: `GET /api/estimates/:bookingId` had no authentication requirement. `POST /api/estimates/:bookingId/approve` required authentication but failed to verify that the calling customer owned the associated booking. Furthermore, there was no estimate rejection endpoint or check preventing re-approval of cancelled or already approved estimates.
- Risk: Unauthorized customers could view competitor/peer vehicle repair estimates and approve estimates on behalf of other customers.
- Fix implemented: Enforced `requireAuth` on all estimate routes. Verified that the booking belongs to `user.id` before allowing estimate view, approval, or rejection. Enforced estimate status checks (`status === 'PENDING'`) and updated both estimate and booking status atomically inside database transactions. Added `POST` and `PUT` endpoints for `/api/estimates/:bookingId/reject`.
- Verification: Automated tests confirmed Customer A cannot approve or reject Customer B's estimate (returns 403 Forbidden) and re-approval of non-pending estimates returns 409 Conflict.
- Residual risk: None.
- Manual action: None.

### [SEC-004]

- Severity: Medium
- Category: Insecure Direct Object Reference (IDOR)
- Component: `backend/src/modules/notifications/notifications.controller.ts`
- Evidence: In `markAsRead`, the query executed `UPDATE notifications SET is_read = true WHERE id = :id` without checking `userId`.
- Risk: Any authenticated customer could mark any other customer's notifications as read by enumerating sequential or arbitrary notification IDs.
- Fix implemented: Added `and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id))` to the update query. If no row matches, returns 404/unauthorized.
- Verification: Automated test confirmed Customer A attempting to mark Customer B's notification returns 404 and leaves Customer B's notification intact.
- Residual risk: None.
- Manual action: None.

### [SEC-005]

- Severity: Medium
- Category: Sensitive Business Data Exposure
- Component: `backend/src/modules/parts/parts.controller.ts`, `backend/src/modules/parts/parts.service.ts`
- Evidence: `GET /api/parts` and `GET /api/parts/:id` performed full row queries on `sparePartsTable`, returning `purchasePrice` and `supplier` to anonymous public visitors and customers.
- Risk: Exposure of internal vendor relationships, procurement pricing, and dealer margin calculations to customers and competitors.
- Fix implemented: Created a DTO sanitization pipeline in `parts.controller.ts`. For all non-admin/non-staff callers, `purchasePrice` and `supplier` are stripped from the response payload.
- Verification: Automated test confirmed `purchasePrice` and `supplier` are `undefined` on `/api/parts` responses for public callers, while preserved for admin users.
- Residual risk: None.
- Manual action: None.

### [SEC-006]

- Severity: High
- Category: Cross-Origin Resource Sharing (CORS) Misconfiguration & Missing Security Headers
- Component: `backend/src/app.ts`
- Evidence: Express was configured with `cors({ origin: true, credentials: true })`. This dynamically reflected the request's `Origin` header with credentials permitted, allowing any malicious third-party site to initiate authenticated cross-origin requests. Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc.) were missing.
- Risk: Cross-Site Script Inclusion (XSSI), authenticated API exfiltration via malicious websites, and clickjacking attacks.
- Fix implemented: Replaced dynamic reflection with strict origin whitelisting (`localhost:5173`, `localhost:5001`, `APP_URL`, `CORS_ORIGIN`). Added global security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin`, and production `Content-Security-Policy`).
- Verification: Automated regression tests verified presence of security headers on all API responses.
- Residual risk: In production, `APP_URL` and `CORS_ORIGIN` must match the production domain.
- Manual action: Configure production DNS domain in `CORS_ORIGIN` and `APP_URL` environment variables.

### [SEC-007]

- Severity: Medium
- Category: Denial of Service (DoS) & Memory Leak in Rate Limiting
- Component: `backend/src/middleware/rateLimit.ts`, `backend/src/app.ts`
- Evidence: Body parsers (`express.json()` and `express.urlencoded()`) did not define payload limits. In `rateLimit.ts`, the in-memory `requestCounts` map stored client IP keys indefinitely without ever deleting expired records.
- Risk: Memory exhaustion via oversized JSON payload injection, and slow memory leakage over time under diverse IP traffic.
- Fix implemented: Added `limit: '1mb'` to `express.json` and `express.urlencoded`. Implemented automatic periodic garbage collection of expired rate limit keys (`unref()` timer every 5 minutes). Implemented dedicated rate limiters: `authLimiter` (15 req / 15 min), `aiLimiter` (40 req / min), `orderLimiter` (30 req / min), and `standardLimiter` (300 req / 15 min).
- Verification: Verified memory cleanup logic and endpoint-specific rate limit attachment on auth endpoints.
- Residual risk: In multi-instance / clustered production deployments, in-memory rate limiting should be backed by Redis.
- Manual action: Deploy Redis-backed rate limiting (e.g. `rate-limit-redis`) if horizontally scaling backend instances.

### [SEC-008]

- Severity: Medium
- Category: Error Handling & Unhandled Exception Crash Vulnerability
- Component: `backend/src/middleware/auth.ts`, `backend/src/middleware/error.ts`
- Evidence: In `readToken` and `verifyPassword`, malformed tokens or mismatched buffer lengths during `crypto.timingSafeEqual` threw unhandled `TypeError` exceptions. In `error.ts`, internal error messages (`err.message`) and stack traces were exposed directly to clients.
- Risk: Server crashes upon receiving malformed auth tokens; disclosure of internal database schemas, paths, and query fragments on server errors.
- Fix implemented: Wrapped `readToken` and `verifyPassword` in defensive try/catch blocks with buffer length guards. Updated `errorHandler` to sanitize all 500 error messages in production to `'An unexpected error occurred. Please try again later.'` and suppress stack traces.
- Verification: Automated test passed sending invalid token formats and corrupted password hashes; server returned clean 401 without crashing.
- Residual risk: None.
- Manual action: None.

### [SEC-009]

- Severity: High
- Category: Cryptographic Weakness & Insecure Configuration
- Component: `backend/src/config/env.ts`, `.env.example`
- Evidence: `env.ts` set a fallback static value `AUTH_SECRET=shriram-automobiles-secret-key-2026` by default. If deployed to production without setting `AUTH_SECRET`, an attacker knowing the open-source repository could forge admin JWT tokens.
- Risk: Total system takeover via forged administrative session tokens.
- Fix implemented: Added a Zod `.refine()` check in `env.ts`. In `production` mode, `AUTH_SECRET` is strictly required, must be at least 32 characters long, and cannot equal the default placeholder. Updated `.env.example` to use an explicit placeholder.
- Verification: Typecheck and environment schema parsing verified; non-production environments retain developer ergonomics while production is strictly guarded.
- Residual risk: Production deployment must supply a cryptographically random secret.
- Manual action: Ensure production environment defines `AUTH_SECRET` generated with `openssl rand -hex 32`.

### [SEC-010]

- Severity: Medium
- Category: Business Logic Flaw & Cart Manipulation
- Component: `backend/src/modules/cart/cart.controller.ts`
- Evidence: `addCartItem` allowed adding unbounded quantities without checking per-item limits. Additionally, `quantity = Number(req.body.quantity || 1)` converted `0` into `1` due to falsy evaluation, bypassing validation. Adding existing items created redundant duplicate rows. `DELETE /api/cart` was not implemented.
- Risk: Inventory lockup, cart overflow, and unexpected item creation.
- Fix implemented: Explicitly handled `0` and non-positive numbers without falsy fallback. Enforced item limits (1 to 20 units per item). Coalesced duplicate items to increment quantity up to available stock. Added `clearCart` (`DELETE /api/cart`).
- Verification: Automated test confirmed `{ productId: 1, quantity: 0 }` and `{ productId: 1, quantity: 99999 }` are rejected with 400 Validation Error.
- Residual risk: None.
- Manual action: None.

### [SEC-011]

- Severity: Medium
- Category: State Machine Integrity & Administrative Bypass
- Component: `backend/src/modules/bookings/bookings.controller.ts`
- Evidence: `updateBookingStatus` allowed any role to transition a booking to any arbitrary string without checking valid lifecycle progressions.
- Risk: Bookings could be regressed from `COMPLETED` back to `PENDING` or skipped straight to finished states, disrupting mechanic workflows and accounting.
- Fix implemented: Defined a strict state transition matrix (`VALID_TRANSITIONS`). Validated that transitions only follow allowable flows (`PENDING` -> `CONFIRMED` -> `IN_SERVICE` -> `IN_PROGRESS` -> `COMPLETED`). Mechanics are restricted to updating only bookings assigned to them.
- Verification: Automated tests confirmed invalid jumps (e.g. `PENDING` -> `COMPLETED`) return 400 `INVALID_STATE_TRANSITION`, while valid transitions (`PENDING` -> `CONFIRMED`) succeed.
- Residual risk: None.
- Manual action: None.

### [SEC-012]

- Severity: High
- Category: Vulnerable Dependency (Supply Chain)
- Component: `pnpm-workspace.yaml`, `package.json`
- Evidence: `pnpm audit` detected a high-severity vulnerability in `nanoid` (<3.3.18) pulled via dev tooling (`postcss`/`vite`), susceptible to infinite loop DoS (GHSA-2v37-7h3g-55p8).
- Risk: Dev server and build tool hang / DoS during asset bundling.
- Fix implemented: Added a strict workspace override in `pnpm-workspace.yaml` forcing `nanoid: ">=3.3.18"`.
- Verification: Ran `pnpm install` and `pnpm audit`. High-severity finding eliminated.
- Residual risk: 1 low-severity dev-only advisory remains in `esbuild` for Windows dev server path traversal (not exposed in production bundle).
- Manual action: Update `esbuild` when `drizzle-kit` releases an upstream update supporting `esbuild >= 0.28.1`.

### [SEC-013]

- Severity: Low
- Category: Personally Identifiable Information (PII) Exposure
- Component: `backend/src/modules/mechanics/mechanics.controller.ts`
- Evidence: `GET /api/mechanics` returned all columns from `mechanicsTable` including personal mobile phone numbers to public unauthenticated users.
- Risk: Mechanic phone number harvesting and potential harassment/spam.
- Fix implemented: Sanitized public mechanic responses to strip `phone` for non-admin/non-staff callers.
- Verification: Automated test confirmed mechanic phone numbers are stripped on public calls.
- Residual risk: None.
- Manual action: None.

### [SEC-014]

- Severity: High
- Category: Database Row Level Security (RLS) Disabled & PostgREST Data Exposure
- Component: PostgreSQL / Supabase `public` schema (`brands`, `vehicle_models`, `customers`, `customer_vehicles`, `part_categories`, `service_parts`, `vehicle_part_compatibility`, `service_symptoms`, `symptom_service_mapping`, `services`, `symptom_part_mapping`, `available_slots`, `service_bookings`, `mechanics`, `booking_services`, `booking_inspections`, `service_estimates`, `service_estimate_items`, `users`, `addresses`, `carts`, `cart_items`, `orders`, `order_items`, `contact_inquiries`, `sessions`, `password_reset_tokens`, `notifications`, `wholesale_quotes`, `helmet_brands`, `helmet_products`, `helmet_types`, `helmet_variants`, `helmet_inventory`, `helmet_sizes`, `test_foo`)
- Evidence: Supabase Database Advisor flagged error code `0013_rls_disabled_in_public` on 36 tables in the `public` schema. When RLS is disabled in Supabase, tables are directly accessible via PostgREST endpoints using the public anonymous (`anon`) API key. Unauthenticated callers could directly query or mutate sensitive tables (`users`, `sessions`, `orders`, `customers`, etc.), completely bypassing Node.js/Express authorization controls.
- Risk: Direct database exfiltration of user credentials, customer PII, customer vehicles, financial orders, and wholesale quotes via public Supabase PostgREST endpoints.
- Fix implemented:
  1. Dynamically enabled Row Level Security on all 36 public tables (`ALTER TABLE public."<table>" ENABLE ROW LEVEL SECURITY;`).
  2. Defined explicit full access security policies for the backend `service_role` on all tables (`CREATE POLICY "service_role_all_<table>" ON public."<table>" FOR ALL TO service_role USING (true) WITH CHECK (true);`).
  3. Defined explicit read-only policies for public catalog tables (`brands`, `vehicle_models`, `part_categories`, `services`, `service_symptoms`, `helmet_brands`, `helmet_types`, `helmet_products`, `helmet_variants`, `helmet_sizes`, `symptom_service_mapping`, `symptom_part_mapping`, `vehicle_part_compatibility`, `available_slots`).
  4. Enforced strict default-deny isolation on sensitive data stores (`users`, `sessions`, `password_reset_tokens`, `customers`, `customer_vehicles`, `orders`, `order_items`, `service_bookings`, `service_estimates`, `service_parts`, etc.).
  5. Implemented a PostgreSQL event trigger (`pgrst_auto_enable_rls` on `CREATE TABLE`) ensuring any future tables created in `public` automatically have RLS enabled.
  6. Added automated RLS verification in `backend/src/db/client.ts`, created migration `0001_enable_rls_security_policies.sql`, and added `pnpm run db:secure-rls`.
- Verification: Database linter query verified 0 tables with RLS disabled and 50 security policies created. Automated security regression test suite verified zero public tables without RLS and service role policies.
- Residual risk: None.
- Manual action: None.

## Verification

- Build: `pnpm build` completed with 0 errors across `@shriram/shared`, `@shriram/api-client`, `backend`, and `frontend`.
- Tests: `pnpm test` executed and PASSED 100% (shared utility unit tests, health check, CSV dataset validations, helmet dataset validations, and 24 master security regression tests including Phase 21 Database RLS verification).
- Dependency audit: `pnpm audit` completed with 0 high/critical vulnerabilities.
- Static/security checks: `pnpm typecheck` passed with 0 errors across all 6 workspace projects.
- Re-scan: Re-scanned repository attack surfaces, verified CORS origin filtering, token tamper resistance, rate limiter lifecycle, and error sanitization.
- Production configuration review: Root and backend `.env.example` verified free of default credentials. In-memory fallback and database connections validated.

## Production Checklist

- [x] Secrets protected (No secrets tracked in git; production requires >= 32-char secret)
- [x] Authorization verified (Ownership checks on vehicles, bookings, estimates, orders, notifications)
- [x] Rate limits configured (Auth, API, and intelligence rate limiters active)
- [x] Input schemas enforced (Zod validation, integer quantity checks, registration number sanitization)
- [x] Uploads isolated (Validated file types and server-side storage abstractions)
- [x] Errors sanitized (500 errors stripped of stack traces and internal messages in production)
- [x] Dependencies audited (Zero high/critical vulnerabilities)
- [x] Webhooks verified (Server-side HMAC signature verification architecture verified)
- [x] Payment/business logic protected (Prices recalculated server-side; atomic stock decrement)
- [x] Monitoring/logging reviewed (No credentials, tokens, or PII printed to logs)
- [ ] Backup/recovery reviewed (Production automated PostgreSQL snapshots to be configured by ops)
- [ ] Manual security review completed (Production cloud WAF, DNS records, and SSL certs to be confirmed)
