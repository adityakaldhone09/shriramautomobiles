import { pgTable, text, serial, timestamp, varchar, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_customers_phone').on(table.phone),
  index('idx_customers_email').on(table.email),
]);

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = typeof customersTable.$inferInsert;
export type Customer = typeof customersTable.$inferSelect;

export const contactInquiriesTable = pgTable('contact_inquiries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('NEW'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export const insertContactInquirySchema = createInsertSchema(contactInquiriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type ContactInquiry = typeof contactInquiriesTable.$inferSelect;
