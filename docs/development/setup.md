# Local Development Setup Guide

## Prerequisites
- **Node.js**: v20.x or higher
- **pnpm**: v9.x or higher

## Installation
```bash
# Clone the repository
git clone https://github.com/adityakaldhone09/shriramautomobiles.git
cd ShriramAutomobiles

# Install all workspace dependencies
pnpm install
```

## Seeding Datasets
```bash
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
