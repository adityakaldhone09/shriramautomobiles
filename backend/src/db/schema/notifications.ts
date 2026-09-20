import { pgTable, text, serial, timestamp, integer, boolean, jsonb, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});
export type Notification = typeof notificationsTable.$inferSelect;
