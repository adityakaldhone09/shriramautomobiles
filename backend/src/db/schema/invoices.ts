import { pgTable, text, serial, timestamp, integer, decimal, varchar, index } from 'drizzle-orm/pg-core';
import { serviceBookingsTable, serviceJobCardsTable } from './bookings';
import { customersTable } from './customers';
import { ordersTable } from './orders';
import { servicePartsTable } from './parts';

export const invoicesTable = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  invoiceType: varchar('invoice_type', { length: 30 }).notNull().default('SERVICE'), // SERVICE, PART_SALE, WHOLESALE
  bookingId: integer('booking_id').references(() => serviceBookingsTable.id),
  jobCardId: integer('job_card_id').references(() => serviceJobCardsTable.id),
  orderId: integer('order_id').references(() => ordersTable.id),
  customerId: integer('customer_id').references(() => customersTable.id),
  customerName: text('customer_name').notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerGstin: varchar('gstin', { length: 50 }),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull().default('0.00'),
  labourTotal: decimal('labour_total', { precision: 10, scale: 2 }).default('0.00'),
  partsTotal: decimal('parts_total', { precision: 10, scale: 2 }).default('0.00'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0.00'),
  taxableAmount: decimal('taxable_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  cgstAmount: decimal('cgst_amount', { precision: 10, scale: 2 }).notNull().default('0.00'), // 9% on parts/labour
  sgstAmount: decimal('sgst_amount', { precision: 10, scale: 2 }).notNull().default('0.00'), // 9% on parts/labour
  igstAmount: decimal('igst_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 30 }).notNull().default('PAID'), // PENDING, PARTIAL, PAID, REFUNDED
  paymentMethod: varchar('payment_method', { length: 30 }).notNull().default('CASH'), // CASH, UPI, CARD, CREDIT
  paymentReference: varchar('payment_reference', { length: 100 }), // UPI transaction ID or reference
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).default('0.00'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_invoices_invoice_number').on(table.invoiceNumber),
  index('idx_invoices_booking_id').on(table.bookingId),
  index('idx_invoices_customer_id').on(table.customerId),
  index('idx_invoices_status').on(table.paymentStatus),
  index('idx_invoices_created_at').on(table.createdAt),
]);
export type Invoice = typeof invoicesTable.$inferSelect;

export const invoiceItemsTable = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => invoicesTable.id, { onDelete: 'cascade' }),
  itemType: varchar('item_type', { length: 30 }).notNull().default('PART'), // PART, LABOUR, HELMET, CHARGE
  partId: integer('part_id').references(() => servicePartsTable.id),
  description: text('description').notNull(),
  hsnSacCode: varchar('hsn_sac_code', { length: 30 }).default('8714'), // 8714 for auto parts, 9987 for maintenance/repairs
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0.00'),
  taxRatePercent: decimal('tax_rate_percent', { precision: 5, scale: 2 }).default('18.00'), // Default 18% GST (9% CGST + 9% SGST)
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0.00'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_invoice_items_invoice_id').on(table.invoiceId),
]);
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;

