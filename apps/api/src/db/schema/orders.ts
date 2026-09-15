import { pgTable, serial, timestamp, integer, decimal, varchar } from 'drizzle-orm/pg-core';
import { usersTable, addressesTable } from './users';
import { servicePartsTable } from './parts';

export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 40 }).notNull().unique(),
  userId: integer('user_id').notNull().references(() => usersTable.id),
  status: varchar('status', { length: 30 }).notNull().default('PENDING'),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('PENDING'),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull().default('CASH'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  deliveryCharge: decimal('delivery_charge', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  deliveryMethod: varchar('delivery_method', { length: 20 }).notNull().default('PICKUP'),
  addressId: integer('address_id').references(() => addressesTable.id),
  createdAt: timestamp('created_at').defaultNow(),
});
export type Order = typeof ordersTable.$inferSelect;

export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => ordersTable.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => servicePartsTable.id),
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
});
export type OrderItem = typeof orderItemsTable.$inferSelect;
