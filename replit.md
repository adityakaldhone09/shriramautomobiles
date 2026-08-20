# Shriram Automobiles

Customer-facing website for Shriram Automobiles with service discovery, spare-parts search, and online two-wheeler booking.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/shriram-automobiles/src/App.tsx` — routed customer experience and booking/contact flows
- `artifacts/shriram-automobiles/src/index.css` — workshop-inspired visual system and responsive styles
- `lib/api-spec/openapi.yaml` — source of truth for services, parts, bookings, and contact contracts
- `artifacts/api-server/src/routes/` — API handlers and sample catalogue data

## Architecture decisions

- API contracts are defined in OpenAPI and generated into the shared client before frontend work.
- Booking and contact submission validate request bodies with generated Zod schemas.
- Catalogue and booking handlers use an API-ready in-memory store for the first build; persistence can be added behind the same routes.
- The frontend uses the generated React Query hooks so loading, error, invalidation, and mutation states remain explicit.

## Product

Riders can discover the shop, browse services, search sample spare parts, request an appointment through a three-step flow, receive a booking reference, send a contact enquiry, and view a future-ready booking desk.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
