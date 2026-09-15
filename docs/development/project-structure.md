# Project Structure & Directory Tree

```
shriram-automobiles/
│
├── apps/
│   │
│   ├── web/                         # React 19 Frontend Web Application
│   │   ├── public/                  # Static assets (images, logos, icons, vehicles)
│   │   ├── src/
│   │   │   ├── assets/              # Processed stylesheets and bundled media
│   │   │   ├── components/          # Reusable presentation components
│   │   │   │   ├── common/          # Error boundaries, loaders, badges
│   │   │   │   ├── layout/          # Shell, Navigation, Footers, LanguageSwitcher
│   │   │   │   ├── ui/              # Radix UI / Shadcn UI primitive components
│   │   │   │   ├── vehicle/         # Vehicle selector and garage cards
│   │   │   │   ├── service/         # Service booking wizard and package cards
│   │   │   │   ├── parts/           # Parts catalog and compatible parts shop
│   │   │   │   ├── helmets/         # Helmet product tiles and size selector
│   │   │   │   ├── cart/            # Cart drawer and line item view
│   │   │   │   ├── orders/          # Order summary and delivery cards
│   │   │   │   └── admin/           # Admin booking rows and stock tables
│   │   │   ├── pages/               # Route-level page components
│   │   │   │   ├── home/            # Enhanced home landing page
│   │   │   │   ├── services/        # Service booking wizard page
│   │   │   │   ├── parts/           # Spare parts shop page
│   │   │   │   ├── contact/         # Contact and workshop location page
│   │   │   │   ├── account/         # Customer account garage and orders
│   │   │   │   ├── admin/           # Admin bookings and inventory desk
│   │   │   │   └── error/           # 404 and error pages
│   │   │   ├── features/            # Feature-specific state and logic
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   ├── lib/                 # Utility libraries and helpers
│   │   │   ├── services/            # API communication services
│   │   │   │   └── api/             # Centralized typed API client
│   │   │   ├── i18n/                # Localization resources (en.json, hi.json, mr.json)
│   │   │   ├── App.tsx              # Application route coordinator
│   │   │   └── main.tsx             # React entrypoint
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── api/                         # Express & TypeScript Backend API Server
│       ├── src/
│       │   ├── config/              # Runtime environment, auth, and database configs
│       │   ├── db/                  # Drizzle ORM client, schemas, and seeds
│       │   │   ├── client.ts        # Database connection with in-memory fallback
│       │   │   ├── schema/          # Domain-partitioned database schemas
│       │   │   ├── migrations/      # Drizzle migration files
│       │   │   └── seed/            # Seeder scripts
│       │   ├── middleware/          # Auth, roles, validation, error, and rate-limiting
│       │   ├── modules/             # Domain modules (controller, service, routes, schema, types)
│       │   │   ├── auth/            # Authentication and session management
│       │   │   ├── vehicles/        # Brand and model catalog, customer vehicles
│       │   │   ├── parts/           # Spare parts catalog, fitment compatibility
│       │   │   ├── services/        # Service packages and symptom intelligence
│       │   │   ├── bookings/        # Service appointments and inspections
│       │   │   ├── mechanics/       # Mechanics roster and time slots
│       │   │   ├── estimates/       # Repair estimates and customer approval
│       │   │   ├── cart/            # User shopping cart operations
│       │   │   ├── orders/          # Part orders and fulfillment
│       │   │   ├── helmets/         # Helmet products and variants
│       │   │   ├── wholesale/       # B2B wholesale inquiries
│       │   │   ├── notifications/   # System and user notifications
│       │   │   └── admin/           # Admin oversight and inventory
│       │   ├── routes/              # Central router mounting all modules
│       │   ├── utils/               # Structured logger and helpers
│       │   ├── integrations/        # External storage, email, sms, payment stubs
│       │   ├── app.ts               # Express application instance
│       │   └── index.ts             # Server entrypoint
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                      # Universal domain contracts
│   │   ├── src/
│   │   │   ├── types/               # TypeScript interfaces (User, Booking, Part, etc.)
│   │   │   ├── schemas/             # Zod validation schemas
│   │   │   ├── constants/           # Business constants and brand lists
│   │   │   └── utils/               # Currency and formatting helpers
│   │   └── package.json
│   │
│   ├── api-client/                  # Generated API client and React Query hooks
│   │   ├── src/
│   │   │   ├── generated/           # Auto-generated client schemas and hooks
│   │   │   ├── client.ts            # Typed client export
│   │   │   └── custom-fetch.ts      # Fetch wrapper
│   │   └── package.json
│   │
│   └── config/                      # Monorepo configuration presets
│       ├── eslint/
│       ├── typescript/
│       └── prettier/
│
├── data/                            # Categorized raw datasets
│   ├── vehicles/                    # Vehicle models and brand datasets
│   ├── parts/                       # Spare parts catalog and compatibility
│   ├── services/                    # Service packages and symptom map
│   ├── helmets/                     # Helmet brands, products, sizes, and stock
│   ├── seeds/
│   └── processed/
│
├── scripts/                         # Maintenance and automation tooling
│   ├── seed/                        # Data seeding scripts
│   ├── database/                    # Migration and reset scripts
│   ├── data/                        # CSV and data integrity validation
│   └── development/                 # Port and environment verification
│
├── docs/                            # Project documentation suite
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── deployment/
│   ├── development/
│   └── datasets/
│
├── tests/                           # Test suites
│   ├── unit/
│   ├── integration/
│   ├── api/
│   └── e2e/
│
├── docker-compose.yml
├── .env.example
├── .env
├── package.json
├── pnpm-workspace.yaml
└── README.md
```
