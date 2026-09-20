import { pgTable, text, serial, timestamp, integer, varchar, index } from 'drizzle-orm/pg-core';
import { servicePartsTable } from './parts';

export const inventoryMovementsTable = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  partId: integer('part_id').references(() => servicePartsTable.id, { onDelete: 'cascade' }),
  movementType: varchar('movement_type', { length: 30 }).notNull(), // PURCHASE, SALE, RETURN, ADJUSTMENT
  quantity: integer('quantity').notNull(),
  location: varchar('location', { length: 100 }).notNull().default('Retail Store'), // Retail Store, Wholesale Godown
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_inventory_movements_part_id').on(table.partId),
]);
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
