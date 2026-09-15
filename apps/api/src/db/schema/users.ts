import { pgTable, text, serial, timestamp, integer, boolean, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { customersTable } from './customers';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customersTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('CUSTOMER'), // CUSTOMER, MECHANIC, STAFF, ADMIN
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const addressesTable = pgTable('addresses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  addressLine: text('address_line').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull().default('Maharashtra'),
  pinCode: varchar('pin_code', { length: 10 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
export type Address = typeof addressesTable.$inferSelect;

export const sessionsTable = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const passwordResetTokensTable = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
