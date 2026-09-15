# Shriram Automobiles (श्रीराम ऑटोमोबाइल्स)

> Two-Wheeler Genuine Spare Parts, Expert Servicing & Service Intelligence Platform.
> Located at **Miraj Road, Sangola, Maharashtra (PIN: 413307)**.

---

## 📌 Overview

**Shriram Automobiles** is a trusted two-wheeler spare parts dealership and service center based in Sangola. Serving both individual two-wheeler owners and wholesale commercial garages, Shriram Automobiles operates two dedicated facilities:

1. **Retail Store**: Direct counter sales for bike and scooter owners, routine service booking, diagnostics, and genuine replacement parts.
2. **Wholesale Godown**: Bulk spare parts inventory, wholesale order fulfillment, and distribution network for local mechanics and workshops.

This repository contains the complete digital platform for Shriram Automobiles, including a responsive multilingual customer web portal, an intelligent service booking engine, a parts compatibility catalog, a RESTful API backend, database schemas, and seed automation tools.

---

## ✨ Key Features

- **🛒 Genuine Spare Parts Catalog & Shop**:
  - Filter and search components across top brands (Hero, Bajaj, Honda, TVS, Yamaha, Royal Enfield, Suzuki, etc.).
  - Category-based browsing: Engine parts, brakes, electricals, suspension, transmission, lubricants, and body parts.
  - Compatibility verification: Check exact fitment against specific vehicle makes and models.
  - Cart and checkout workflows with in-store pickup or local delivery options.

- **🛠️ Service Intelligence & Smart Booking Wizard**:
  - Multi-step guided service booking workflow.
  - Symptom analyzer & diagnosis engine: Select vehicle issues to get recommended service packages and estimated costs.
  - Mechanic slot scheduling and live job card tracking.
  - Digital inspection reports and customer estimate approvals.

- **👤 Customer Garage & Account Dashboard**:
  - Manage multiple two-wheelers (registration, make, model, year).
  - Service history records and order tracking.
  - Secure phone/email-based authentication and profile management.

- **🌐 Multilingual Support (i18n)**:
  - Full localization in **English**, **मराठी (Marathi)**, and **हिंदी (Hindi)**.

- **📦 Wholesale Quote Management**:
  - Dedicated quote request workflow for garages, workshops, and bulk buyers.

---

## 🏗️ Architecture & Monorepo Structure

The workspace is organized as a modular pnpm monorepo:

```
ShriramAutomobiles/
├── artifacts/
│   ├── shriram-automobiles/       # Modern React 19 customer-facing web application (Vite + TailwindCSS)
│   ├── api-server/                # Express & TypeScript REST API server
│   └── mockup-sandbox/            # Prototyping sandbox environment
├── lib/
│   ├── api-spec/                  # OpenAPI 3.1 specification contracts (openapi.yaml)
│   ├── api-zod/                   # Generated Zod validation schemas and TypeScript domain types
│   ├── api-client-react/          # Generated React Query hooks and custom fetch client
│   └── db/                        # Drizzle ORM schema, SQL migrations, and in-memory DB provider
├── data/
│   └── csv/                       # Seed datasets: vehicle models, service packages, parts, and symptom maps
├── scripts/                       # Database seeding and service intelligence CLI tools
├── package.json                   # Root scripts and workspace configuration
└── pnpm-workspace.yaml            # Monorepo workspace package definitions
```

---

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Radix UI / Shadcn UI components, Lucide Icons, TanStack Query, Wouter, i18next
- **Backend**: Node.js, Express, TypeScript, Zod validation
- **Database & ORM**: PostgreSQL, Drizzle ORM, Drizzle Kit, `pg-mem` (in-memory emulation fallback for zero-dependency local runs)
- **API Contracts**: OpenAPI 3.1, Orval codegen pipeline
- **Package Manager**: `pnpm` (Workspace configured)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` or higher (`corepack enable pnpm` or `npm i -g pnpm`)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/adityakaldhone09/shriramautomobiles.git
cd ShriramAutomobiles

pnpm install
```

### 2. Seed Vehicle & Service Data

Populate the database with vehicle models, spare parts catalogs, and service packages:

```bash
# Seed vehicle models and manufacturers
pnpm db:seed-vehicles

# Seed service packages and parts catalog
pnpm db:seed-service-catalog
```

### 3. Run Development Servers

Start the backend API server and frontend client in development mode:

```bash
# Terminal 1: Start the API server (Runs on http://localhost:5001)
pnpm --filter @workspace/api-server run dev

# Terminal 2: Start the Web client (Runs on http://localhost:5173)
pnpm --filter @workspace/shriram-automobiles run dev
```

### 4. Quality Checks & Verification

```bash
# Run typechecking across all workspace packages
pnpm run typecheck

# Test service intelligence recommendation engine
pnpm test:service-intelligence
```

---

## 📍 Store Locations & Contact

- **Retail Store**: Miraj Road, Near Railway Gate, Sangola, Dist. Solapur, Maharashtra – 413307
- **Wholesale Godown**: Industrial Area / Godown Hub, Sangola, Maharashtra – 413307
- **Services**: Retail Spare Parts, Wholesale Distribution, Periodic Bike Servicing, Engine Overhauls, and Electrical Diagnostics.

---

## 📄 License

This project is licensed under the MIT License.
