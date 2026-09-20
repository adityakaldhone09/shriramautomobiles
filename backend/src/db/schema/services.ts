import { pgTable, text, serial, timestamp, integer, boolean, decimal, jsonb, varchar, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { servicePartsTable } from './parts';

export const servicesTable = pgTable('services', {
  id: serial('id').primaryKey(),
  name: jsonb('name').notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: jsonb('description'),
  vehicleType: varchar('vehicle_type', { length: 50 }).notNull().default('All'),
  typicalDurationMinutes: integer('typical_duration_minutes').notNull().default(60),
  estimatedDuration: text('estimated_duration').notNull().default('60 mins'),
  startingPrice: decimal('starting_price', { precision: 10, scale: 2 }).notNull().default('299.00'),
  icon: varchar('icon', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_services_slug').on(table.slug),
]);

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertService = typeof servicesTable.$inferInsert;
export type Service = typeof servicesTable.$inferSelect;

export const serviceSymptomsTable = pgTable('service_symptoms', {
  id: serial('id').primaryKey(),
  symptomId: varchar('symptom_id', { length: 100 }).notNull().unique(),
  symptom: text('symptom').notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  severity: varchar('severity', { length: 20 }).notNull().default('MEDIUM'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
export type ServiceSymptom = typeof serviceSymptomsTable.$inferSelect;

export const symptomServiceMappingTable = pgTable('symptom_service_mapping', {
  id: serial('id').primaryKey(),
  symptomId: integer('symptom_id').notNull().references(() => serviceSymptomsTable.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').notNull().references(() => servicesTable.id, { onDelete: 'cascade' }),
  priority: integer('priority').notNull().default(1),
}, (table) => [
  index('idx_ssm_symptom_id').on(table.symptomId),
  index('idx_ssm_service_id').on(table.serviceId),
]);

export const symptomPartMappingTable = pgTable('symptom_part_mapping', {
  id: serial('id').primaryKey(),
  symptomId: integer('symptom_id').notNull().references(() => serviceSymptomsTable.id, { onDelete: 'cascade' }),
  partId: integer('part_id').notNull().references(() => servicePartsTable.id, { onDelete: 'cascade' }),
  priority: integer('priority').notNull().default(1),
  reasoning: text('reasoning'),
}, (table) => [
  index('idx_spm_symptom_id').on(table.symptomId),
  index('idx_spm_part_id').on(table.partId),
]);
