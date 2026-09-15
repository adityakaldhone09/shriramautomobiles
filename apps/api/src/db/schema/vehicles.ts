import { pgTable, text, serial, timestamp, integer, boolean, varchar, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { customersTable } from './customers';

export const brandsTable = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export const vehicleBrandsTable = brandsTable;

export const insertBrandSchema = createInsertSchema(brandsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBrand = typeof brandsTable.$inferInsert;
export type Brand = typeof brandsTable.$inferSelect;

export const vehicleModelsTable = pgTable('vehicle_models', {
  id: serial('id').primaryKey(),
  brandId: integer('brand_id').notNull().references(() => brandsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  vehicleType: varchar('vehicle_type', { length: 50 }).notNull(), // Motorcycle, Scooter, ElectricScooter, Moped
  engineClass: varchar('engine_class', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_vehicle_models_brand_id').on(table.brandId),
  index('idx_vehicle_models_slug').on(table.slug),
]);

export const insertVehicleModelSchema = createInsertSchema(vehicleModelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVehicleModel = typeof vehicleModelsTable.$inferInsert;
export type VehicleModel = typeof vehicleModelsTable.$inferSelect;

export const customerVehiclesTable = pgTable('customer_vehicles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  customerId: integer('customer_id').references(() => customersTable.id, { onDelete: 'cascade' }),
  brandId: integer('brand_id').references(() => brandsTable.id),
  vehicleModelId: integer('vehicle_model_id').references(() => vehicleModelsTable.id),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  vehicleType: varchar('vehicle_type', { length: 50 }).notNull(),
  registrationNumber: varchar('registration_number', { length: 50 }).notNull(),
  nickname: varchar('nickname', { length: 100 }),
  manufactureYear: integer('manufacture_year'),
  variant: varchar('variant', { length: 100 }),
  color: varchar('color', { length: 50 }),
  notes: text('notes'),
  vehicleAge: integer('vehicle_age'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_customer_vehicles_user_id').on(table.userId),
  index('idx_customer_vehicles_customer_id').on(table.customerId),
  index('idx_customer_vehicles_model_id').on(table.vehicleModelId),
  index('idx_customer_vehicles_reg_no').on(table.registrationNumber),
]);

export const vehiclesTable = customerVehiclesTable;
export const insertVehicleSchema = createInsertSchema(customerVehiclesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVehicle = typeof customerVehiclesTable.$inferInsert;
export type Vehicle = typeof customerVehiclesTable.$inferSelect;
export type CustomerVehicle = typeof customerVehiclesTable.$inferSelect;
