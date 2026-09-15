import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  bookingsTable,
  bookingServicesTable,
  bookingInspectionsTable,
  serviceEstimatesTable,
  customersTable,
  customerVehiclesTable,
  servicesTable,
} from '../../db/schema';
import type { CreateBookingDTO } from './bookings.types';

export function generateBookingNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SAB-${year}-${rand}`;
}

export class BookingsService {
  async create(data: CreateBookingDTO) {
    const cleanPhone = data.phone.replace(/[\s\-+]/g, '');
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.phone, cleanPhone));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({
        name: data.fullName,
        phone: cleanPhone,
        email: data.email || `${cleanPhone}@shriram.local`,
      }).returning();
    }

    let vehicleId = data.customerVehicleId;
    if (!vehicleId && data.registrationNumber) {
      const cleanReg = data.registrationNumber.toUpperCase();
      let [veh] = await db.select().from(customerVehiclesTable).where(
        and(eq(customerVehiclesTable.registrationNumber, cleanReg), eq(customerVehiclesTable.customerId, customer.id))
      );
      if (!veh) {
        [veh] = await db.insert(customerVehiclesTable).values({
          customerId: customer.id,
          userId: data.userId || null,
          brand: data.vehicleBrand,
          model: data.vehicleModel,
          vehicleType: data.vehicleType || 'Motorcycle',
          registrationNumber: cleanReg,
        }).returning();
      }
      vehicleId = veh.id;
    }

    const bookingNum = generateBookingNumber();
    const effectiveDate = new Date(data.appointmentDate);

    const [booking] = await db.insert(bookingsTable).values({
      bookingNumber: bookingNum,
      bookingId: bookingNum,
      userId: data.userId || null,
      customerId: customer.id,
      customerVehicleId: vehicleId,
      vehicleId: vehicleId,
      serviceId: data.serviceId || null,
      symptomId: data.symptomId || null,
      preferredMechanicId: data.preferredMechanicId || null,
      appointmentDate: effectiveDate,
      timeSlot: data.timeSlot,
      problemDescription: data.problemDescription,
      imageUrl: data.imageUrl,
      customerNotes: data.customerNotes,
      status: 'PENDING',
    }).returning();

    if (data.selectedServices && data.selectedServices.length > 0) {
      const validServices = await db.select().from(servicesTable).where(
        inArray(servicesTable.slug, data.selectedServices)
      );
      for (const s of validServices) {
        await db.insert(bookingServicesTable).values({
          bookingId: booking.id,
          serviceId: s.id,
          price: s.startingPrice,
        });
      }
    }

    return booking;
  }

  async getAll() {
    return db
      .select({
        id: bookingsTable.id,
        bookingId: bookingsTable.bookingId,
        bookingNumber: bookingsTable.bookingNumber,
        fullName: customersTable.name,
        phone: customersTable.phone,
        email: customersTable.email,
        vehicleBrand: customerVehiclesTable.brand,
        vehicleModel: customerVehiclesTable.model,
        vehicleType: customerVehiclesTable.vehicleType,
        registrationNumber: customerVehiclesTable.registrationNumber,
        appointmentDate: bookingsTable.appointmentDate,
        timeSlot: bookingsTable.timeSlot,
        status: bookingsTable.status,
        problemDescription: bookingsTable.problemDescription,
        totalPrice: bookingsTable.totalPrice,
      })
      .from(bookingsTable)
      .leftJoin(customersTable, eq(bookingsTable.customerId, customersTable.id))
      .leftJoin(customerVehiclesTable, eq(bookingsTable.customerVehicleId, customerVehiclesTable.id))
      .orderBy(desc(bookingsTable.appointmentDate));
  }

  async getById(id: number) {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    return booking || null;
  }

  async updateStatus(id: number, status: string, notes?: string) {
    const [updated] = await db
      .update(bookingsTable)
      .set({ status, notes, updatedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();
    return updated || null;
  }

  async assignMechanic(id: number, mechanicId: number) {
    const [updated] = await db
      .update(bookingsTable)
      .set({ assignedMechanicId: mechanicId, status: 'CONFIRMED', updatedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();
    return updated || null;
  }
}

export const bookingsService = new BookingsService();
