# Shriram Automobiles (श्रीराम ऑटोमोबाइल्स)

> Production-ready full-stack platform for Two-Wheeler Genuine Spare Parts, Expert Servicing, Helmets & Gear, and Service Intelligence.
> Located at **Miraj Road, Sangola, Maharashtra (PIN: 413307)**.

---

## 📌 Overview

**Shriram Automobiles** is a premier two-wheeler spare parts dealership, helmet distributor, and service center based in Sangola, Maharashtra. The business operates two specialized facilities:

1. **Retail Workshop & Counter**: Direct walk-in sales for bike and scooter owners, routine servicing, computer diagnostics, helmet fittings, and genuine OEM/OES replacement parts.
2. **Wholesale Godown**: Bulk spare parts inventory, wholesale order fulfillment, and distribution network supplying local workshops, mechanics, and garages across the region.

This monorepo contains the entire digital platform: a React 19 customer-facing web portal, an Express REST API backend, modular Drizzle ORM database schemas, OpenAPI contracts, seed automation tools, comprehensive CSV datasets, and full multilingual support.

---

## 🏗️ Monorepo Architecture

```text
shriram-automobiles/
│
├── frontend/                  # Customer Web Application (React 19, Vite, TailwindCSS, Radix UI)
│   ├── src/
│   │   ├── components/        # UI components (booking wizard, parts shop, garage dashboard)
│   │   ├── pages/             # Modular route pages (home, shop, booking, contact, admin)
│   │   ├── i18n/              # Localization (English, Hindi, Marathi)
│   │   └── services/          # Client API integration layer
│   └── vite.config.ts
│
├── backend/                   # Backend REST API (Node.js, Express, TypeScript, Drizzle ORM)
│   ├── src/
│   │   ├── config/            # Environment and database configuration
│   │   ├── db/                # Client, bootstrap data, migrations, and modular seeders
│   │   │   └── schema/        # Modular database domain schemas (vehicles, parts, services, etc.)
│   │   ├── middleware/        # Auth, error handling, rate limiting, and validation
│   │   ├── modules/           # Domain modules (auth, vehicles, parts, bookings, helmets, wholesale)
│   │   └── routes/            # Centralized route orchestration
│   └── package.json
│
├── packages/
│   ├── shared/                  # Shared TypeScript types, Zod schemas, constants, and utilities
│   ├── api-client/              # Generated TypeScript API client and React Query hooks
│   └── config/                  # Shared ESLint, Prettier, and TypeScript base configurations
│
├── data/                        # Repository Datasets (Categorized & Validated)
│   ├── vehicles/                # Vehicle models, manufacturers, and engine classes (CSV)
│   ├── parts/                   # Spare parts catalog and fitment compatibility matrix (CSV)
│   ├── services/                # Service packages and symptom diagnostic mapping (CSV)
│   ├── helmets/                 # Helmet brands, types, products, variants, and certifications (CSV)
│   ├── seeds/                   # Additional SQL/JSON seed data
│   └── processed/               # Normalized and pipeline-processed data
│
├── scripts/                     # Developer Tools & Maintenance Scripts
│   ├── seed/                    # Automated database seed runners
│   ├── database/                # Database migration and reset utilities
│   ├── data/                    # Dataset validation and vehicle normalization tools
│   └── development/             # Environment sanity and port collision checks
│
├── docs/                        # Complete Technical Documentation
│   ├── architecture/            # System architecture, request flows, and deployment blueprints
│   ├── database/                # Schema documentation, ER diagrams, and relationship indexes
│   ├── api/                     # REST API reference and endpoint specifications
│   ├── datasets/                # Dataset guide, schemas, and maintenance instructions
│   └── development/             # Developer setup, guidelines, and project structure
│
├── tests/                       # Automated Test Suites
│   ├── unit/                    # Shared package and utility unit tests
│   └── api/                     # API sanity and integration checks
│
├── docker-compose.yml           # PostgreSQL container setup for local production-like database
├── pnpm-workspace.yaml          # Monorepo workspace configuration
└── package.json                 # Unified workspace scripts and dev orchestration
```

---

## 💻 Tech Stack

- **Frontend (`frontend`)**: React 19, TypeScript, Vite, TailwindCSS, Radix UI, TanStack Query v5, Wouter, Lucide Icons, i18next
- **Backend (`backend`)**: Node.js, Express, TypeScript, Zod validation, CORS, Cookie-session auth
- **Database & ORM**: PostgreSQL, Drizzle ORM, Drizzle Kit, `pg-mem` (instant in-memory fallback for zero-dependency local development)
- **Shared Packages (`packages/*`)**: `@shriram/shared`, `@shriram/api-client`, `@shriram/config`
- **Package Manager**: `pnpm` (Workspace configured)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` or higher (`corepack enable pnpm` or `npm i -g pnpm`)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/adityakaldhone09/shriramautomobiles.git
cd ShriramAutomobiles

# Install all workspace dependencies
pnpm install
```

### 2. Verify Environment & Datasets

```bash
# Verify environment files and local ports
pnpm run check:env
pnpm run check:ports

# Validate vehicle, parts, services, and helmet CSV datasets
pnpm run validate:csv
pnpm run validate:helmets
```

### 3. Seed Database

The platform automatically falls back to in-memory PostgreSQL (`pg-mem`) if an external database is not running, enabling zero-config development out of the box:

```bash
# Seed all datasets (vehicles, parts, services, helmets)
pnpm run db:seed
```

Or seed individual domains:
```bash
pnpm run db:seed:vehicles
pnpm run db:seed:parts
pnpm run db:seed:services
pnpm run db:seed:helmets
```

### 4. Start Development Servers

```bash
# Start both backend API (Port 5001) and web frontend (Port 5173) concurrently
pnpm run dev

# Or start individually:
pnpm run dev:api    # Starts backend
pnpm run dev:web    # Starts frontend
```

---

## 🛠️ Developer Commands

| Command | Description |
|---|---|
| `pnpm run dev` | Starts both the API and Web applications concurrently |
| `pnpm run build` | Builds all packages, backend API, and Vite web production bundles |
| `pnpm run typecheck` | Runs TypeScript compiler checks across all workspace packages |
| `pnpm test` | Runs unit tests and CSV dataset validations |
| `pnpm run db:seed` | Seeds vehicles, spare parts, service packages, and helmets |
| `pnpm run validate:csv` | Validates integrity and column structure of all core CSV files |
| `pnpm run validate:helmets` | Validates helmet brands, models, variants, and inventory |
| `pnpm run check:env` | Verifies presence and completeness of `.env` configuration files |
| `pnpm run check:ports` | Checks availability of ports 5001 (API) and 5173 (Web) |

---

## 📍 Facility Locations & Contact

- **Retail Workshop & Counter**: Miraj Road, Near Railway Gate, Sangola, Maharashtra – 413307
  - Phone: `+91 96897 88734`
- **Wholesale Godown**: Shriram Autoparts, Near Adarsh School, White House, Sangola – 413307
  - Phone: `+91 77097 37256`
- **Services**: Retail Spare Parts, Wholesale Distribution, Two-Wheeler Servicing, Computerized Diagnostics, and Helmet & Riding Gear Retailing.

---

## 📄 License

This project is licensed under the MIT License.
