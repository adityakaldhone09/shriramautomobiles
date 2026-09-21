# Shriram Automobiles - System Architecture

## Architectural Philosophy
The Shriram Automobiles platform follows a modern, scalable, domain-driven monorepo architecture. It cleanly separates:
1. **Frontend (`frontend`)**: A high-performance, reactive React 19 single-page application localized in English, Marathi, and Hindi.
2. **Backend (`backend`)**: A modular Express + TypeScript REST API organized into self-contained domain modules with dedicated controllers, services, routes, and schemas.
3. **Database Layer (`backend/src/db`)**: Drizzle ORM schemas split per domain with support for live PostgreSQL as well as an in-memory `pg-mem` emulation layer for instant local developer bootstrapping.
4. **Shared Packages (`packages/*`)**:
   - `@shriram/shared`: Universal domain types, Zod validation schemas, business constants, and utilities.
   - `@shriram/api-client`: Generated React Query hooks and type-safe HTTP client.
   - `@shriram/config`: Shared ESLint, Prettier, and TypeScript configurations.
5. **Data Tier (`data/*`)**: Categorized CSV files for vehicle models, spare parts catalogs, service packages, symptom maps, and helmet inventories.
6. **Automation & Maintenance (`scripts/*`)**: Seeding pipelines, schema migrations, CSV integrity validators, and environment/port checkers.

# Shriram Automobiles - System Architecture

## Architectural Philosophy
The Shriram Automobiles platform follows a modern, scalable, domain-driven monorepo architecture. It cleanly separates:
1. **Frontend (`frontend`)**: A high-performance, reactive React 19 single-page application localized in English, Marathi, and Hindi.
2. **Backend (`backend`)**: A modular Express + TypeScript REST API organized into self-contained domain modules with dedicated controllers, services, routes, and schemas.
3. **Database Layer (`backend/src/db`)**: Drizzle ORM schemas split per domain with support for live PostgreSQL as well as an in-memory `pg-mem` emulation layer for instant local developer bootstrapping.
4. **Shared Packages (`packages/*`)**:
   - `@shriram/shared`: Universal domain types, Zod validation schemas, business constants, and utilities.
   - `@shriram/api-client`: Generated React Query hooks and type-safe HTTP client.
   - `@shriram/config`: Shared ESLint, Prettier, and TypeScript configurations.
5. **Data Tier (`data/*`)**: Categorized CSV files for vehicle models, spare parts catalogs, service packages, symptom maps, and helmet inventories.
6. **Automation & Maintenance (`scripts/*`)**: Seeding pipelines, schema migrations, CSV integrity validators, and environment/port checkers.
