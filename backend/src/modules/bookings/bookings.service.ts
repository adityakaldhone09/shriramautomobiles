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
  serviceJobCardsTable,
  jobCardPartsTable,
  jobCardInspectionsTable,
  serviceStatusHistoryTable,
  servicePartsTable,
  inventoryMovementsTable,
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

    // Log initial status
    await this.logStatusHistory(booking.id, 'NONE', 'PENDING', data.userId, 'Booking created');

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
        assignedMechanicId: bookingsTable.assignedMechanicId,
        createdAt: bookingsTable.createdAt,
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

  async updateStatus(id: number, status: string, notes?: string, changedByUserId?: number) {
    const existing = await this.getById(id);
    const [updated] = await db
      .update(bookingsTable)
      .set({ status, notes, updatedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    if (existing && existing.status !== status) {
      await this.logStatusHistory(id, existing.status, status, changedByUserId, notes);
    }

    return updated || null;
  }

  async assignMechanic(id: number, mechanicId: number, changedByUserId?: number) {
    const existing = await this.getById(id);
    const [updated] = await db
      .update(bookingsTable)
      .set({ assignedMechanicId: mechanicId, status: 'CONFIRMED', updatedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    if (existing) {
      await this.logStatusHistory(
        id,
        existing.status,
        'CONFIRMED',
        changedByUserId,
        `Assigned to mechanic #${mechanicId}`
      );
    }

    return updated || null;
  }

  // ================= JOB CARDS & LIFECYCLE =================
  async getJobCard(bookingId: number) {
    const [jobCard] = await db
      .select()
      .from(serviceJobCardsTable)
      .where(eq(serviceJobCardsTable.bookingId, bookingId));
    if (!jobCard) return null;

    const [inspections, parts] = await Promise.all([
      db
        .select()
        .from(jobCardInspectionsTable)
        .where(eq(jobCardInspectionsTable.jobCardId, jobCard.id)),
      db.select().from(jobCardPartsTable).where(eq(jobCardPartsTable.jobCardId, jobCard.id)),
    ]);

    return {
      ...jobCard,
      inspections,
      parts,
    };
  }

  async createJobCard(bookingId: number, data: any, changedByUserId?: number) {
    const booking = await this.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const [existing] = await db
      .select()
      .from(serviceJobCardsTable)
      .where(eq(serviceJobCardsTable.bookingId, bookingId));
    if (existing) {
      return this.getJobCard(bookingId);
    }

    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const jobNumber = `JC-${year}-${rand}`;

    const [jobCard] = await db
      .insert(serviceJobCardsTable)
      .values({
        bookingId,
        jobNumber,
        mechanicId: data.mechanicId || booking.assignedMechanicId || null,
        odometerReading: data.odometerReading ? Number(data.odometerReading) : null,
        fuelLevel: data.fuelLevel || 'HALF',
        status: 'CHECKED_IN',
        customerComplaints: data.customerComplaints || booking.problemDescription || null,
        inspectionNotes: data.inspectionNotes || null,
        startedAt: new Date(),
      })
      .returning();

    // Insert standard two-wheeler inspection checklist items
    const standardItems = [
      'Engine Oil Level & Quality',
      'Front Brake Pads / Disc',
      'Rear Brake Shoes / Drum',
      'Drive Chain Slack & Lubrication',
      'Battery Voltage & Terminals',
      'Spark Plug & Ignition',
      'Tire Pressure & Tread Depth',
      'Headlight, Tail Light & Indicators',
      'Clutch & Throttle Free Play',
      'Front Fork & Rear Shock Absorber',
    ];

    for (const item of standardItems) {
      await db.insert(jobCardInspectionsTable).values({
        jobCardId: jobCard.id,
        item,
        condition: 'OK',
      });
    }

    // Advance booking status to CHECKED_IN
    if (['PENDING', 'CONFIRMED'].includes(booking.status)) {
      await this.updateStatus(bookingId, 'CHECKED_IN', 'Vehicle checked in; Job card created', changedByUserId);
    }

    return this.getJobCard(bookingId);
  }

  async recordInspection(jobCardId: number, data: { item: string; condition: string; notes?: string }) {
    const [existing] = await db
      .select()
      .from(jobCardInspectionsTable)
      .where(and(eq(jobCardInspectionsTable.jobCardId, jobCardId), eq(jobCardInspectionsTable.item, data.item)));

    if (existing) {
      const [updated] = await db
        .update(jobCardInspectionsTable)
        .set({ condition: data.condition, notes: data.notes || null, inspectedAt: new Date() })
        .where(eq(jobCardInspectionsTable.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(jobCardInspectionsTable)
      .values({
        jobCardId,
        item: data.item,
        condition: data.condition,
        notes: data.notes || null,
      })
      .returning();
    return created;
  }

  async addJobCardPart(
    jobCardId: number,
    data: { partId?: number; partName: string; quantity: number; unitPrice: number }
  ) {
    const qty = Math.max(1, Number(data.quantity || 1));
    const price = Number(data.unitPrice || 0);
    const totalPrice = (qty * price).toFixed(2);

    const [item] = await db
      .insert(jobCardPartsTable)
      .values({
        jobCardId,
        partId: data.partId || null,
        partName: data.partName,
        quantity: qty,
        unitPrice: price.toFixed(2),
        totalPrice,
      })
      .returning();

    // Deduct inventory stock and record movement if linked to a catalog part
    if (data.partId) {
      try {
        const [part] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.id, data.partId));
        if (part) {
          const prevStock = Number(part.stockQuantity ?? 0);
          const newStock = Math.max(0, prevStock - qty);
          await db
            .update(servicePartsTable)
            .set({ stockQuantity: newStock, updatedAt: new Date() })
            .where(eq(servicePartsTable.id, data.partId));

          await db.insert(inventoryMovementsTable).values({
            partId: data.partId,
            movementType: 'JOB_CARD',
            quantity: -qty,
            previousStock: prevStock,
            newStock,
            referenceType: 'JOB_CARD',
            referenceId: String(jobCardId),
            location: 'Retail Store',
            notes: `Consumed in service Job Card #${jobCardId}`,
          });
        }
      } catch (err) {
        console.error('Failed to log inventory deduction for job card part:', err);
      }
    }

    // Recalculate totals on job card
    const allParts = await db.select().from(jobCardPartsTable).where(eq(jobCardPartsTable.jobCardId, jobCardId));
    const partsTotal = allParts.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);

    const [jobCard] = await db.select().from(serviceJobCardsTable).where(eq(serviceJobCardsTable.id, jobCardId));
    const labour = Number(jobCard?.labourCharges || 0);
    const newTotal = (partsTotal + labour).toFixed(2);

    await db
      .update(serviceJobCardsTable)
      .set({
        partsTotal: partsTotal.toFixed(2),
        totalAmount: newTotal,
        updatedAt: new Date(),
      })
      .where(eq(serviceJobCardsTable.id, jobCardId));

    return item;
  }

  async updateJobCard(jobCardId: number, data: any) {
    const updateData: any = { updatedAt: new Date() };
    if (data.workPerformed !== undefined) updateData.workPerformed = data.workPerformed;
    if (data.inspectionNotes !== undefined) updateData.inspectionNotes = data.inspectionNotes;
    if (data.labourCharges !== undefined) updateData.labourCharges = Number(data.labourCharges).toFixed(2);
    if (data.odometerReading !== undefined) updateData.odometerReading = Number(data.odometerReading);
    if (data.fuelLevel !== undefined) updateData.fuelLevel = data.fuelLevel;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'COMPLETED') updateData.completedAt = new Date();
      if (data.status === 'DELIVERED') updateData.deliveredAt = new Date();
    }

    const [jobCard] = await db.select().from(serviceJobCardsTable).where(eq(serviceJobCardsTable.id, jobCardId));
    if (!jobCard) return null;

    const partsTotal = Number(jobCard.partsTotal || 0);
    const labourCharges =
      data.labourCharges !== undefined ? Number(data.labourCharges) : Number(jobCard.labourCharges || 0);
    updateData.totalAmount = (partsTotal + labourCharges).toFixed(2);

    const [updated] = await db
      .update(serviceJobCardsTable)
      .set(updateData)
      .where(eq(serviceJobCardsTable.id, jobCardId))
      .returning();

    return updated;
  }

  async logStatusHistory(
    bookingId: number,
    fromStatus: string,
    toStatus: string,
    changedByUserId?: number,
    notes?: string
  ) {
    return db
      .insert(serviceStatusHistoryTable)
      .values({
        bookingId,
        fromStatus,
        toStatus,
        changedByUserId: changedByUserId || null,
        notes: notes || null,
      })
      .returning();
  }

  async getStatusHistory(bookingId: number) {
    return db
      .select()
      .from(serviceStatusHistoryTable)
      .where(eq(serviceStatusHistoryTable.bookingId, bookingId))
      .orderBy(desc(serviceStatusHistoryTable.createdAt));
  }
}

export const bookingsService = new BookingsService();
