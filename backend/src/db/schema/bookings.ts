import { pgTable, text, serial, timestamp, integer, decimal, varchar, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { customersTable } from './customers';
import { customerVehiclesTable } from './vehicles';
import { servicesTable, serviceSymptomsTable } from './services';
import { servicePartsTable } from './parts';
import { mechanicsTable } from './mechanics';

export const serviceBookingsTable = pgTable('service_bookings', {
  id: serial('id').primaryKey(),
  bookingNumber: varchar('booking_number', { length: 50 }).notNull().unique(),
  bookingId: varchar('booking_id', { length: 50 }),
  userId: integer('user_id'),
  customerId: integer('customer_id').references(() => customersTable.id, { onDelete: 'cascade' }),
  customerVehicleId: integer('customer_vehicle_id').references(() => customerVehiclesTable.id),
  vehicleId: integer('vehicle_id').references(() => customerVehiclesTable.id),
  serviceId: integer('service_id').references(() => servicesTable.id),
  symptomId: integer('symptom_id').references(() => serviceSymptomsTable.id),
  preferredMechanicId: integer('preferred_mechanic_id').references(() => mechanicsTable.id),
  assignedMechanicId: integer('assigned_mechanic_id').references(() => mechanicsTable.id),
  bookingDate: timestamp('booking_date').notNull().defaultNow(),
  appointmentDate: timestamp('appointment_date').notNull().defaultNow(),
  timeSlot: varchar('time_slot', { length: 50 }).notNull(),
  problemDescription: text('problem_description'),
  imageUrl: text('image_url'),
  status: varchar('status', { length: 40 }).notNull().default('PENDING'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }),
  customerNotes: text('customer_notes'),
  mechanicNotes: text('mechanic_notes'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_service_bookings_booking_number').on(table.bookingNumber),
  index('idx_service_bookings_user_id').on(table.userId),
  index('idx_service_bookings_customer_id').on(table.customerId),
  index('idx_service_bookings_vehicle_id').on(table.customerVehicleId),
  index('idx_service_bookings_status').on(table.status),
  index('idx_service_bookings_date').on(table.appointmentDate),
]);

export const bookingsTable = serviceBookingsTable;
export const insertBookingSchema = createInsertSchema(serviceBookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = typeof serviceBookingsTable.$inferInsert;
export type Booking = typeof serviceBookingsTable.$inferSelect;

export const bookingServicesTable = pgTable('booking_services', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => serviceBookingsTable.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').notNull().references(() => servicesTable.id),
  price: decimal('price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_booking_services_booking_id').on(table.bookingId),
]);
export type BookingService = typeof bookingServicesTable.$inferSelect;

export const bookingInspectionsTable = pgTable('booking_inspections', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => serviceBookingsTable.id, { onDelete: 'cascade' }),
  partId: integer('part_id').references(() => servicePartsTable.id),
  partName: text('part_name').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('CHECKED'),
  notes: text('notes'),
  inspectedAt: timestamp('inspected_at').defaultNow(),
}, (table) => [
  index('idx_inspections_booking_id').on(table.bookingId),
]);
export type BookingInspection = typeof bookingInspectionsTable.$inferSelect;
