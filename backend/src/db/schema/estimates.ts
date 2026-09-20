import { pgTable, text, serial, timestamp, integer, decimal, varchar, index } from 'drizzle-orm/pg-core';
import { serviceBookingsTable } from './bookings';
import { servicePartsTable } from './parts';

export const serviceEstimatesTable = pgTable('service_estimates', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => serviceBookingsTable.id, { onDelete: 'cascade' }),
  labourAmount: decimal('labour_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  partsAmount: decimal('parts_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  estimatedAmount: decimal('estimated_amount', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 30 }).notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_service_estimates_booking_id').on(table.bookingId),
]);
export type ServiceEstimate = typeof serviceEstimatesTable.$inferSelect;

export const serviceEstimateItemsTable = pgTable('service_estimate_items', {
  id: serial('id').primaryKey(),
  estimateId: integer('estimate_id').notNull().references(() => serviceEstimatesTable.id, { onDelete: 'cascade' }),
  partId: integer('part_id').references(() => servicePartsTable.id),
  itemType: varchar('item_type', { length: 20 }).notNull().default('PART'), // LABOUR, PART
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
}, (table) => [
  index('idx_estimate_items_estimate_id').on(table.estimateId),
]);
export type ServiceEstimateItem = typeof serviceEstimateItemsTable.$inferSelect;
