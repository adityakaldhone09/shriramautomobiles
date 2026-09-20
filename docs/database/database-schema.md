# Database Schema Documentation

The database layer is managed using **Drizzle ORM** with PostgreSQL. Schemas are modularized into domain files inside `backend/src/db/schema/`:

| Module Schema | Primary Tables | Purpose |
|---|---|---|
| `users.ts` | `users`, `addresses`, `sessions`, `password_reset_tokens` | Authentication, sessions, user roles |
| `customers.ts` | `customers`, `contact_inquiries` | Customer master data and inquiries |
| `vehicles.ts` | `brands`, `vehicle_models`, `customer_vehicles` | Vehicle hierarchy and customer garages |
| `parts.ts` | `part_categories`, `service_parts`, `vehicle_part_compatibility` | Spare parts catalog and vehicle fitments |
| `inventory.ts` | `inventory_movements` | Stock tracking and audit records |
| `carts.ts` | `carts`, `cart_items` | Shopping cart sessions |
| `orders.ts` | `orders`, `order_items` | Customer part orders and delivery methods |
| `services.ts` | `services`, `service_symptoms`, `symptom_service_mapping`, `symptom_part_mapping` | Service catalog and diagnosis symptom map |
| `mechanics.ts` | `mechanics`, `available_slots` | Mechanics roster and slot allocations |
| `bookings.ts` | `service_bookings`, `booking_services`, `booking_inspections` | Service appointments and job inspections |
| `estimates.ts` | `service_estimates`, `service_estimate_items` | Digital estimates and customer approvals |
| `helmets.ts` | `helmet_brands`, `helmet_types`, `helmet_products`, `helmet_variants`, `helmet_sizes`, `helmet_inventory` | Helmet retail catalog and variant inventory |
| `notifications.ts` | `notifications` | System and order notifications |
| `wholesale.ts` | `wholesale_quotes` | B2B bulk inquiries from garages |
