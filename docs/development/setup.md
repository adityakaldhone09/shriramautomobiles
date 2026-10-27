# Local Development Setup Guide

## Prerequisites
- **Node.js**: v24.x
- **pnpm**: v11.24.0 (the version pinned in the root package manifest)

## Installation
```bash
# Clone the repository
git clone https://github.com/adityakaldhone09/shriramautomobiles.git
cd ShriramAutomobiles

# Install all workspace dependencies
pnpm install
```

## Seeding Datasets
When `DATABASE_URL` is configured, migrate the selected database explicitly before seeding it. Omitting `DATABASE_URL` uses the in-memory database for local development.

```bash
# Migrate the selected PostgreSQL database (does not run automatically at API startup)
pnpm db:migrate

# Seed all datasets (vehicles, parts, services, helmets)
pnpm db:seed

# Or run individual seeders:
pnpm db:seed:vehicles
pnpm db:seed:parts
pnpm db:seed:services
pnpm db:seed:helmets
```

## Running Dev Servers
```bash
# Verify ports and environment
pnpm check:ports
pnpm check:env

# Run both Web & API simultaneously
pnpm dev

# Or run individually:
pnpm dev:api   # Starts API on http://localhost:5001
pnpm dev:web   # Starts Web on http://localhost:5173
```
