import { pgTable, serial, timestamp, integer } from 'drizzle-orm/pg-core';
import { usersTable } from './users';
import { servicePartsTable } from './parts';

export const cartsTable = pgTable('carts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export type Cart = typeof cartsTable.$inferSelect;

export const cartItemsTable = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  cartId: integer('cart_id').notNull().references(() => cartsTable.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => servicePartsTable.id),
  quantity: integer('quantity').notNull().default(1),
});
export type CartItem = typeof cartItemsTable.$inferSelect;
