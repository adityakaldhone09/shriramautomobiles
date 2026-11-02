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

// ================= JOB CARDS & LIFECYCLE =================
export const serviceJobCardsTable = pgTable('service_job_cards', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => serviceBookingsTable.id, { onDelete: 'cascade' }),
  jobNumber: varchar('job_number', { length: 50 }).notNull().unique(),
  mechanicId: integer('mechanic_id').references(() => mechanicsTable.id),
  odometerReading: integer('odometer_reading'),
  fuelLevel: varchar('fuel_level', { length: 30 }).notNull().default('HALF'),
  status: varchar('status', { length: 40 }).notNull().default('CHECKED_IN'),
  customerComplaints: text('customer_complaints'),
  inspectionNotes: text('inspection_notes'),
  workPerformed: text('work_performed'),
  labourCharges: decimal('labour_charges', { precision: 10, scale: 2 }).notNull().default('0.00'),
  partsTotal: decimal('parts_total', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_job_cards_booking_id').on(table.bookingId),
  index('idx_job_cards_job_number').on(table.jobNumber),
  index('idx_job_cards_mechanic_id').on(table.mechanicId),
  index('idx_job_cards_status').on(table.status),
]);
export type ServiceJobCard = typeof serviceJobCardsTable.$inferSelect;

export const jobCardPartsTable = pgTable('job_card_parts', {
  id: serial('id').primaryKey(),
  jobCardId: integer('job_card_id').notNull().references(() => serviceJobCardsTable.id, { onDelete: 'cascade' }),
  partId: integer('part_id').references(() => servicePartsTable.id),
  partName: text('part_name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_job_card_parts_card_id').on(table.jobCardId),
]);
export type JobCardPart = typeof jobCardPartsTable.$inferSelect;

export const jobCardInspectionsTable = pgTable('job_card_inspections', {
  id: serial('id').primaryKey(),
  jobCardId: integer('job_card_id').notNull().references(() => serviceJobCardsTable.id, { onDelete: 'cascade' }),
  item: varchar('item', { length: 100 }).notNull(),
  condition: varchar('condition', { length: 30 }).notNull().default('OK'), // OK, ATTENTION_NEEDED, CRITICAL, REPLACED
  notes: text('notes'),
  inspectedAt: timestamp('inspected_at').defaultNow(),
}, (table) => [
  index('idx_job_card_inspections_card_id').on(table.jobCardId),
]);
export type JobCardInspection = typeof jobCardInspectionsTable.$inferSelect;

export const serviceStatusHistoryTable = pgTable('service_status_history', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => serviceBookingsTable.id, { onDelete: 'cascade' }),
  jobCardId: integer('job_card_id'),
  fromStatus: varchar('from_status', { length: 40 }).notNull(),
  toStatus: varchar('to_status', { length: 40 }).notNull(),
  changedByUserId: integer('changed_by_user_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_status_history_booking_id').on(table.bookingId),
]);
export type ServiceStatusHistory = typeof serviceStatusHistoryTable.$inferSelect;
