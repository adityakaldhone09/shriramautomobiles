import { pgTable, text, serial, timestamp, integer, varchar, index } from 'drizzle-orm/pg-core';
import { servicePartsTable } from './parts';

export const inventoryMovementsTable = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  partId: integer('part_id').references(() => servicePartsTable.id, { onDelete: 'cascade' }),
  movementType: varchar('movement_type', { length: 30 }).notNull(), // PURCHASE, SALE, SERVICE_CONSUMED, RETURN, ADJUSTMENT, DAMAGED
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock'),
  newStock: integer('new_stock'),
  referenceType: varchar('reference_type', { length: 50 }), // PURCHASE_ORDER, SERVICE_JOB, ORDER, MANUAL
  referenceId: varchar('reference_id', { length: 50 }),
  location: varchar('location', { length: 100 }).notNull().default('Retail Store'), // Retail Store, Wholesale Godown
  notes: text('notes'),
  performedByUserId: integer('performed_by_user_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_inventory_movements_part_id').on(table.partId),
  index('idx_inventory_movements_type').on(table.movementType),
  index('idx_inventory_movements_created_at').on(table.createdAt),
]);
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
