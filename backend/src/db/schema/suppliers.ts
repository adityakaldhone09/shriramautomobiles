import { pgTable, text, serial, timestamp, integer, decimal, varchar, boolean, index } from 'drizzle-orm/pg-core';
import { servicePartsTable } from './parts';

export const suppliersTable = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  contactPerson: varchar('contact_person', { length: 100 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  gstin: varchar('gstin', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }).default('Sangola'),
  state: varchar('state', { length: 100 }).default('Maharashtra'),
  paymentTerms: varchar('payment_terms', { length: 50 }).default('NET_30'),
  outstandingBalance: decimal('outstanding_balance', { precision: 10, scale: 2 }).default('0.00'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_suppliers_code').on(table.code),
  index('idx_suppliers_name').on(table.name),
]);
export type Supplier = typeof suppliersTable.$inferSelect;

export const purchaseOrdersTable = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  supplierId: integer('supplier_id').references(() => suppliersTable.id),
  status: varchar('status', { length: 40 }).notNull().default('DRAFT'), // DRAFT, PENDING, ORDERED, RECEIVED, CANCELLED
  destination: varchar('destination', { length: 100 }).notNull().default('Retail Store'), // Retail Store, Wholesale Godown
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull().default('0.00'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  paymentStatus: varchar('payment_status', { length: 30 }).notNull().default('UNPAID'), // UNPAID, PARTIAL, PAID
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).default('0.00'),
  expectedDate: timestamp('expected_date'),
  receivedDate: timestamp('received_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_purchase_orders_order_num').on(table.orderNumber),
  index('idx_purchase_orders_supplier_id').on(table.supplierId),
  index('idx_purchase_orders_status').on(table.status),
]);
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;

export const purchaseOrderItemsTable = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  purchaseOrderId: integer('purchase_order_id').notNull().references(() => purchaseOrdersTable.id, { onDelete: 'cascade' }),
  partId: integer('part_id').references(() => servicePartsTable.id),
  partName: text('part_name').notNull(),
  sku: varchar('sku', { length: 100 }),
  quantityOrdered: integer('quantity_ordered').notNull(),
  quantityReceived: integer('quantity_received').notNull().default(0),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_po_items_po_id').on(table.purchaseOrderId),
]);
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;

