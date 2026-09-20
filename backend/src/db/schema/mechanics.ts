import { pgTable, text, serial, timestamp, integer, boolean, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const mechanicsTable = pgTable('mechanics', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }),
  experience: integer('experience').notNull().default(5),
  specialization: text('specialization').notNull(),
  languages: text('languages').notNull().default('Marathi, Hindi, English'),
  isAvailable: boolean('is_available').notNull().default(true),
  profileImage: text('profile_image'),
});
export type Mechanic = typeof mechanicsTable.$inferSelect;

export const availableSlotsTable = pgTable('available_slots', {
  id: serial('id').primaryKey(),
  date: timestamp('date').notNull(),
  timeSlot: varchar('time_slot', { length: 50 }).notNull(),
  maxBookings: integer('max_bookings').notNull().default(3),
  currentBookings: integer('current_bookings').notNull().default(0),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export const insertAvailableSlotSchema = createInsertSchema(availableSlotsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type AvailableSlot = typeof availableSlotsTable.$inferSelect;
