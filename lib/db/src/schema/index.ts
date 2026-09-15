import { pgTable, text, serial, timestamp, integer, boolean, decimal, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ==========================================
// 1. VEHICLE ENTITIES
// ==========================================

export const brandsTable = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const vehicleBrandsTable = brandsTable;

export const insertBrandSchema = createInsertSchema(brandsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brandsTable.$inferSelect;

export const vehicleModelsTable = pgTable("vehicle_models", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  vehicleType: varchar("vehicle_type", { length: 50 }).notNull(), // Motorcycle, Scooter, ElectricScooter, Moped
  engineClass: varchar("engine_class", { length: 50 }), // e.g. 100cc, 110cc, 125cc, 150cc, 350cc, Electric
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_vehicle_models_brand_id").on(table.brandId),
  index("idx_vehicle_models_slug").on(table.slug),
]);

export const insertVehicleModelSchema = createInsertSchema(vehicleModelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVehicleModel = z.infer<typeof insertVehicleModelSchema>;
export type VehicleModel = typeof vehicleModelsTable.$inferSelect;

// Customers table
export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customers_phone").on(table.phone),
  index("idx_customers_email").on(table.email),
]);

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;

// Customer Vehicles table (Multiple vehicles per customer/user)
export const customerVehiclesTable = pgTable("customer_vehicles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "cascade" }),
  brandId: integer("brand_id").references(() => brandsTable.id),
  vehicleModelId: integer("vehicle_model_id").references(() => vehicleModelsTable.id),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  vehicleType: varchar("vehicle_type", { length: 50 }).notNull(), // Motorcycle, Scooter, ElectricScooter
  registrationNumber: varchar("registration_number", { length: 50 }).notNull(),
  nickname: varchar("nickname", { length: 100 }),
  manufactureYear: integer("manufacture_year"),
  variant: varchar("variant", { length: 100 }), // e.g. Drum, Disc, Alloy, Self-Start
  color: varchar("color", { length: 50 }),
  notes: text("notes"),
  vehicleAge: integer("vehicle_age"), // in years
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customer_vehicles_user_id").on(table.userId),
  index("idx_customer_vehicles_customer_id").on(table.customerId),
  index("idx_customer_vehicles_model_id").on(table.vehicleModelId),
  index("idx_customer_vehicles_reg_no").on(table.registrationNumber),
]);

// Keep vehiclesTable as alias for backwards compatibility
export const vehiclesTable = customerVehiclesTable;
export const insertVehicleSchema = createInsertSchema(customerVehiclesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof customerVehiclesTable.$inferSelect;
export type CustomerVehicle = typeof customerVehiclesTable.$inferSelect;

// ==========================================
// 2. SERVICE PARTS & INVENTORY
// ==========================================

export const partCategoriesTable = pgTable("part_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type PartCategory = typeof partCategoriesTable.$inferSelect;

export const servicePartsTable = pgTable("service_parts", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 255 }),
  categoryId: integer("category_id").references(() => partCategoriesTable.id),
  category: varchar("category", { length: 100 }).notNull(),
  subCategory: varchar("sub_category", { length: 100 }),
  description: text("description"),
  brand: text("brand").notNull().default("Genuine / OEM"),
  partType: varchar("part_type", { length: 50 }).notNull().default("Replacement"), // Consumable, Replacement, Accessory
  vehicleTypes: text("vehicle_types").notNull().default('["Motorcycle", "Scooter"]'), // JSON string: ["Motorcycle", "Scooter"]
  availability: varchar("availability", { length: 20 }).notNull().default("In Stock"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0.00"), // selling price
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).default("0.00"),
  stockQuantity: integer("stock_quantity").notNull().default(10), // available stock
  reservedStock: integer("reserved_stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  supplier: text("supplier"),
  image: text("image"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_service_parts_sku").on(table.sku),
  index("idx_service_parts_category").on(table.category),
]);

// Keep sparePartsTable alias
export const sparePartsTable = servicePartsTable;
export const insertSparePartSchema = createInsertSchema(servicePartsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSparePart = z.infer<typeof insertSparePartSchema>;
export type SparePart = typeof servicePartsTable.$inferSelect;
export type ServicePart = typeof servicePartsTable.$inferSelect;

// ==========================================
// 3. COMPATIBILITY SYSTEM
// ==========================================

export const vehiclePartCompatibilityTable = pgTable("vehicle_part_compatibility", {
  id: serial("id").primaryKey(),
  vehicleModelId: integer("vehicle_model_id").notNull().references(() => vehicleModelsTable.id, { onDelete: "cascade" }),
  partId: integer("part_id").notNull().references(() => servicePartsTable.id, { onDelete: "cascade" }),
  // Fitment confidence: COMMON, MODEL_SPECIFIC, VARIANT_DEPENDENT, VERIFY_BEFORE_ORDER
  fitmentConfidence: varchar("fitment_confidence", { length: 40 }).notNull().default("MODEL_SPECIFIC"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vpc_vehicle_model_id").on(table.vehicleModelId),
  index("idx_vpc_part_id").on(table.partId),
]);
export const productVehicleModelsTable = vehiclePartCompatibilityTable;
export const productCompatibilityTable = vehiclePartCompatibilityTable;
export type VehiclePartCompatibility = typeof vehiclePartCompatibilityTable.$inferSelect;

// ==========================================
// 4. SERVICE CATALOG
// ==========================================

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  name: jsonb("name").notNull(), // { en, hi, mr } or string
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: jsonb("description"), // { en, hi, mr } or string
  vehicleType: varchar("vehicle_type", { length: 50 }).notNull().default("All"), // Motorcycle, Scooter, All
  typicalDurationMinutes: integer("typical_duration_minutes").notNull().default(60),
  estimatedDuration: text("estimated_duration").notNull().default("60 mins"),
  startingPrice: decimal("starting_price", { precision: 10, scale: 2 }).notNull().default("299.00"),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_services_slug").on(table.slug),
]);

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof servicesTable.$inferSelect;

// ==========================================
// 5. CUSTOMER PROBLEM / SYMPTOM ENGINE
// ==========================================

export const serviceSymptomsTable = pgTable("service_symptoms", {
  id: serial("id").primaryKey(),
  symptomId: varchar("symptom_id", { length: 100 }).notNull().unique(), // e.g. symp-not-starting
  symptom: text("symptom").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  severity: varchar("severity", { length: 20 }).notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH, CRITICAL
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ServiceSymptom = typeof serviceSymptomsTable.$inferSelect;

export const symptomServiceMappingTable = pgTable("symptom_service_mapping", {
  id: serial("id").primaryKey(),
  symptomId: integer("symptom_id").notNull().references(() => serviceSymptomsTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id, { onDelete: "cascade" }),
  priority: integer("priority").notNull().default(1),
}, (table) => [
  index("idx_ssm_symptom_id").on(table.symptomId),
  index("idx_ssm_service_id").on(table.serviceId),
]);

export const symptomPartMappingTable = pgTable("symptom_part_mapping", {
  id: serial("id").primaryKey(),
  symptomId: integer("symptom_id").notNull().references(() => serviceSymptomsTable.id, { onDelete: "cascade" }),
  partId: integer("part_id").notNull().references(() => servicePartsTable.id, { onDelete: "cascade" }),
  priority: integer("priority").notNull().default(1),
  reasoning: text("reasoning"),
}, (table) => [
  index("idx_spm_symptom_id").on(table.symptomId),
  index("idx_spm_part_id").on(table.partId),
]);

// ==========================================
// 6. MECHANICS & SLOTS
// ==========================================

export const mechanicsTable = pgTable("mechanics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  experience: integer("experience").notNull().default(5),
  specialization: text("specialization").notNull(),
  languages: text("languages").notNull().default("Marathi, Hindi, English"),
  isAvailable: boolean("is_available").notNull().default(true),
  profileImage: text("profile_image"),
});
export type Mechanic = typeof mechanicsTable.$inferSelect;

export const availableSlotsTable = pgTable("available_slots", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  timeSlot: varchar("time_slot", { length: 50 }).notNull(),
  maxBookings: integer("max_bookings").notNull().default(3),
  currentBookings: integer("current_bookings").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertAvailableSlotSchema = createInsertSchema(availableSlotsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type AvailableSlot = typeof availableSlotsTable.$inferSelect;

// ==========================================
// 7. SERVICE BOOKING & WORKFLOW
// ==========================================

export const serviceBookingsTable = pgTable("service_bookings", {
  id: serial("id").primaryKey(),
  bookingNumber: varchar("booking_number", { length: 50 }).notNull().unique(), // e.g. SAB-2026-A7F92X
  bookingId: varchar("booking_id", { length: 50 }), // Alias for backwards compatibility
  userId: integer("user_id"),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "cascade" }),
  customerVehicleId: integer("customer_vehicle_id").references(() => customerVehiclesTable.id),
  vehicleId: integer("vehicle_id").references(() => customerVehiclesTable.id), // Alias
  serviceId: integer("service_id").references(() => servicesTable.id),
  symptomId: integer("symptom_id").references(() => serviceSymptomsTable.id),
  preferredMechanicId: integer("preferred_mechanic_id").references(() => mechanicsTable.id),
  assignedMechanicId: integer("assigned_mechanic_id").references(() => mechanicsTable.id),
  bookingDate: timestamp("booking_date").notNull().defaultNow(),
  appointmentDate: timestamp("appointment_date").notNull().defaultNow(),
  timeSlot: varchar("time_slot", { length: 50 }).notNull(),
  problemDescription: text("problem_description"),
  imageUrl: text("image_url"),
  // Statuses: PENDING, CONFIRMED, VEHICLE_RECEIVED, INSPECTION, ESTIMATE_PENDING,
  // CUSTOMER_APPROVAL_REQUIRED, IN_SERVICE, WAITING_FOR_PARTS, READY_FOR_PICKUP, COMPLETED, CANCELLED
  status: varchar("status", { length: 40 }).notNull().default("PENDING"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  customerNotes: text("customer_notes"),
  mechanicNotes: text("mechanic_notes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_service_bookings_booking_number").on(table.bookingNumber),
  index("idx_service_bookings_user_id").on(table.userId),
  index("idx_service_bookings_customer_id").on(table.customerId),
  index("idx_service_bookings_vehicle_id").on(table.customerVehicleId),
  index("idx_service_bookings_status").on(table.status),
  index("idx_service_bookings_date").on(table.appointmentDate),
]);

export const bookingsTable = serviceBookingsTable;
export const insertBookingSchema = createInsertSchema(serviceBookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof serviceBookingsTable.$inferSelect;

export const bookingServicesTable = pgTable("booking_services", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => serviceBookingsTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  price: decimal("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_booking_services_booking_id").on(table.bookingId),
]);
export type BookingService = typeof bookingServicesTable.$inferSelect;

// Mechanic Inspection Workflow
export const bookingInspectionsTable = pgTable("booking_inspections", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => serviceBookingsTable.id, { onDelete: "cascade" }),
  partId: integer("part_id").references(() => servicePartsTable.id),
  partName: text("part_name").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("CHECKED"), // CHECKED, REQUIRES_REPLACEMENT, NOT_REQUIRED
  notes: text("notes"),
  inspectedAt: timestamp("inspected_at").defaultNow(),
}, (table) => [
  index("idx_inspections_booking_id").on(table.bookingId),
]);
export type BookingInspection = typeof bookingInspectionsTable.$inferSelect;

// Service Estimates & Approval
export const serviceEstimatesTable = pgTable("service_estimates", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => serviceBookingsTable.id, { onDelete: "cascade" }),
  labourAmount: decimal("labour_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  partsAmount: decimal("parts_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  estimatedAmount: decimal("estimated_amount", { precision: 10, scale: 2 }), // Alias
  status: varchar("status", { length: 30 }).notNull().default("PENDING"), // PENDING, APPROVED, REJECTED
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_service_estimates_booking_id").on(table.bookingId),
]);
export type ServiceEstimate = typeof serviceEstimatesTable.$inferSelect;

export const serviceEstimateItemsTable = pgTable("service_estimate_items", {
  id: serial("id").primaryKey(),
  estimateId: integer("estimate_id").notNull().references(() => serviceEstimatesTable.id, { onDelete: "cascade" }),
  partId: integer("part_id").references(() => servicePartsTable.id),
  itemType: varchar("item_type", { length: 20 }).notNull().default("PART"), // LABOUR, PART
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
}, (table) => [
  index("idx_estimate_items_estimate_id").on(table.estimateId),
]);
export type ServiceEstimateItem = typeof serviceEstimateItemsTable.$inferSelect;

// ==========================================
// 8. USERS, AUTH, ORDERS, PLATFORM
// ==========================================

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("CUSTOMER"), // CUSTOMER, MECHANIC, STAFF, ADMIN
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type User = typeof usersTable.$inferSelect;

export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  addressLine: text("address_line").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull().default("Maharashtra"),
  pinCode: varchar("pin_code", { length: 10 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Address = typeof addressesTable.$inferSelect;

export const cartsTable = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull().references(() => cartsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => servicePartsTable.id),
  quantity: integer("quantity").notNull().default(1),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }).notNull().unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  status: varchar("status", { length: 30 }).notNull().default("PENDING"),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("PENDING"),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull().default("CASH"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryMethod: varchar("delivery_method", { length: 20 }).notNull().default("PICKUP"),
  addressId: integer("address_id").references(() => addressesTable.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => servicePartsTable.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const contactInquiriesTable = pgTable("contact_inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("NEW"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertContactInquirySchema = createInsertSchema(contactInquiriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type ContactInquiry = typeof contactInquiriesTable.$inferSelect;

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wholesaleQuotesTable = pgTable("wholesale_quotes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  businessName: text("business_name"),
  requiredProducts: jsonb("required_products").notNull(),
  message: text("message"),
  status: varchar("status", { length: 20 }).notNull().default("NEW"),
  createdAt: timestamp("created_at").defaultNow(),
});