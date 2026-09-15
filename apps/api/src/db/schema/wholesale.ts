import { pgTable, text, serial, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const wholesaleQuotesTable = pgTable('wholesale_quotes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  businessName: text('business_name'),
  requiredProducts: jsonb('required_products').notNull(),
  message: text('message'),
  status: varchar('status', { length: 20 }).notNull().default('NEW'),
  createdAt: timestamp('created_at').defaultNow(),
});
export const insertWholesaleQuoteSchema = createInsertSchema(wholesaleQuotesTable).omit({ id: true, createdAt: true });
export type WholesaleQuote = typeof wholesaleQuotesTable.$inferSelect;
