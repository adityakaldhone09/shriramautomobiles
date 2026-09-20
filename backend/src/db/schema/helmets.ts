import { pgTable, text, serial, timestamp, integer, boolean, decimal, varchar, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const helmetBrandsTable = pgTable('helmet_brands', {
  id: serial('id').primaryKey(),
  brandId: varchar('brand_id', { length: 50 }).unique(),
  name: text('name').notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  country: text('country'),
  originYear: integer('origin_year'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
export type HelmetBrand = typeof helmetBrandsTable.$inferSelect;

export const helmetTypesTable = pgTable('helmet_types', {
  id: serial('id').primaryKey(),
  typeId: varchar('type_id', { length: 50 }).unique(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});
export type HelmetType = typeof helmetTypesTable.$inferSelect;

export const helmetProductsTable = pgTable('helmet_products', {
  id: serial('id').primaryKey(),
  productId: varchar('product_id', { length: 50 }).unique(),
  brandId: integer('brand_id').references(() => helmetBrandsTable.id),
  typeId: integer('type_id').references(() => helmetTypesTable.id),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_helmet_products_slug').on(table.slug),
]);
export const insertHelmetProductSchema = createInsertSchema(helmetProductsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHelmetProduct = typeof helmetProductsTable.$inferInsert;
export type HelmetProduct = typeof helmetProductsTable.$inferSelect;

export const helmetVariantsTable = pgTable('helmet_variants', {
  id: serial('id').primaryKey(),
  variantId: varchar('variant_id', { length: 50 }).unique(),
  productId: integer('product_id').notNull().references(() => helmetProductsTable.id, { onDelete: 'cascade' }),
  color: varchar('color', { length: 100 }).notNull(),
  finish: varchar('finish', { length: 50 }).notNull().default('Gloss'), // Gloss, Matte
  visorType: varchar('visor_type', { length: 50 }).notNull().default('Clear'),
  mrp: decimal('mrp', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
export type HelmetVariant = typeof helmetVariantsTable.$inferSelect;

export const helmetSizesTable = pgTable('helmet_sizes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 10 }).notNull(), // S, M, L, XL
  label: varchar('label', { length: 50 }).notNull(),
  headCircumferenceCm: varchar('head_circumference_cm', { length: 50 }),
});
export type HelmetSize = typeof helmetSizesTable.$inferSelect;

export const helmetInventoryTable = pgTable('helmet_inventory', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  variantId: integer('variant_id').references(() => helmetVariantsTable.id),
  sizeId: integer('size_id').references(() => helmetSizesTable.id),
  location: varchar('location', { length: 100 }).notNull().default('Retail Store'),
  quantity: integer('quantity').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(2),
  createdAt: timestamp('created_at').defaultNow(),
});
export type HelmetInventory = typeof helmetInventoryTable.$inferSelect;
