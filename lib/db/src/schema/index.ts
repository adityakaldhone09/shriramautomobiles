import { pgTable, text, serial, timestamp, integer, boolean, decimal, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Brand Table
export const brandsTable = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBrandSchema = createInsertSchema(brandsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brandsTable.$inferSelect;

// Service Table
export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  name: jsonb("name").notNull(), // { en, hi, mr }
  description: jsonb("description"), // { en, hi, mr }
  estimatedDuration: text("estimated_duration").notNull(),
  startingPrice: decimal("starting_price", { precision: 10, scale: 2 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof servicesTable.$inferSelect;

// Spare Parts Table
export const sparePartsTable = pgTable("spare_parts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  brand: text("brand").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  vehicleTypes: text("vehicle_types").notNull(), // JSON array: ["Motorcycle", "Scooter"]
  availability: varchar("availability", { length: 20 }).notNull().default("Out of Stock"),
  price: decimal("price", { precision: 10, scale: 2 }),
  image: text("image"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSparePartSchema = createInsertSchema(sparePartsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSparePart = z.infer<typeof insertSparePartSchema>;
export type SparePart = typeof sparePartsTable.$inferSelect;

// Customer Table
export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;

// Vehicle Table
export const vehiclesTable = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  brandId: integer("brand_id").references(() => brandsTable.id),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  vehicleType: varchar("vehicle_type", { length: 50 }).notNull(), // Motorcycle, Scooter, ElectricScooter
  registrationNumber: varchar("registration_number", { length: 50 }).notNull().unique(),
  vehicleAge: integer("vehicle_age"), // in years
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;

// Booking Table
export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingId: varchar("booking_id", { length: 50 }).notNull().unique(), // SHA-2026-A7F92X
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  appointmentDate: timestamp("appointment_date").notNull(),
  timeSlot: varchar("time_slot", { length: 20 }).notNull(),
  problemDescription: text("problem_description").notNull(),
  imageUrl: text("image_url"),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, bookingId: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;

// Booking Services (Many-to-Many)
export const bookingServicesTable = pgTable("booking_services", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  price: decimal("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingServiceSchema = createInsertSchema(bookingServicesTable).omit({ id: true, createdAt: true });
export type InsertBookingService = z.infer<typeof insertBookingServiceSchema>;
export type BookingService = typeof bookingServicesTable.$inferSelect;

// Available Slots Table (for managing availability)
export const availableSlotsTable = pgTable("available_slots", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  timeSlot: varchar("time_slot", { length: 20 }).notNull(),
  maxBookings: integer("max_bookings").notNull().default(3),
  currentBookings: integer("current_bookings").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAvailableSlotSchema = createInsertSchema(availableSlotsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAvailableSlot = z.infer<typeof insertAvailableSlotSchema>;
export type AvailableSlot = typeof availableSlotsTable.$inferSelect;

// Contact Inquiry Table
export const contactInquiriesTable = pgTable("contact_inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("NEW"), // NEW, RESPONDED, CLOSED
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContactInquirySchema = createInsertSchema(contactInquiriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContactInquiry = z.infer<typeof insertContactInquirySchema>;
export type ContactInquiry = typeof contactInquiriesTable.$inferSelect;