import { pgTable, text, serial, timestamp, integer, boolean, decimal, varchar, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { vehicleModelsTable } from './vehicles';

export const partCategoriesTable = pgTable('part_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export type PartCategory = typeof partCategoriesTable.$inferSelect;

export const servicePartsTable = pgTable('service_parts', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 255 }),
  categoryId: integer('category_id').references(() => partCategoriesTable.id),
  category: varchar('category', { length: 100 }).notNull(),
  subCategory: varchar('sub_category', { length: 100 }),
  description: text('description'),
  brand: text('brand').notNull().default('Genuine / OEM'),
  partType: varchar('part_type', { length: 50 }).notNull().default('Replacement'),
  vehicleTypes: text('vehicle_types').notNull().default('["Motorcycle", "Scooter"]'),
  availability: varchar('availability', { length: 20 }).notNull().default('In Stock'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }).default('0.00'),
  stockQuantity: integer('stock_quantity').notNull().default(10),
  reservedStock: integer('reserved_stock').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  supplier: text('supplier'),
  image: text('image'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_service_parts_sku').on(table.sku),
  index('idx_service_parts_category').on(table.category),
]);

export const sparePartsTable = servicePartsTable;
export const insertSparePartSchema = createInsertSchema(servicePartsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSparePart = typeof servicePartsTable.$inferInsert;
export type SparePart = typeof servicePartsTable.$inferSelect;
export type ServicePart = typeof servicePartsTable.$inferSelect;

export const vehiclePartCompatibilityTable = pgTable('vehicle_part_compatibility', {
  id: serial('id').primaryKey(),
  vehicleModelId: integer('vehicle_model_id').notNull().references(() => vehicleModelsTable.id, { onDelete: 'cascade' }),
  partId: integer('part_id').notNull().references(() => servicePartsTable.id, { onDelete: 'cascade' }),
  fitmentConfidence: varchar('fitment_confidence', { length: 40 }).notNull().default('MODEL_SPECIFIC'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_vpc_vehicle_model_id').on(table.vehicleModelId),
  index('idx_vpc_part_id').on(table.partId),
]);
export const productVehicleModelsTable = vehiclePartCompatibilityTable;
export const productCompatibilityTable = vehiclePartCompatibilityTable;
export type VehiclePartCompatibility = typeof vehiclePartCompatibilityTable.$inferSelect;
