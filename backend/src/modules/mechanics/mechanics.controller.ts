import type { Request, Response } from 'express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  mechanicsTable,
  availableSlotsTable,
  bookingsTable,
  customersTable,
  customerVehiclesTable,
  serviceJobCardsTable,
  jobCardInspectionsTable,
  jobCardPartsTable,
} from '../../db/schema';
import { createResponse } from '../../utils/helpers';
import { getAuthUser } from '../../middleware/auth';

export class MechanicsController {
  async getMechanics(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const isAdmin = user && ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role);
      const mechanics = await db.select().from(mechanicsTable).where(eq(mechanicsTable.isAvailable, true));
      const sanitized = mechanics.map((m) => {
        if (isAdmin) return m;
        const { phone, ...publicData } = m;
        return publicData;
      });
      return res.json(createResponse(true, 'Mechanics fetched', sanitized));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch mechanics', undefined, 'INTERNAL_ERROR'));
    }
  }

  async getAvailableSlots(_req: Request, res: Response) {
    try {
      const slots = await db.select().from(availableSlotsTable).where(eq(availableSlotsTable.isAvailable, true));
      return res.json(createResponse(true, 'Available slots fetched', slots));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch available slots', undefined, 'INTERNAL_ERROR'));
    }
  }

  async getMyJobs(req: Request, res: Response) {
    try {
      const auth = getAuthUser(req);
      let mechanicId: number | null = null;

      if (auth.role === 'MECHANIC') {
        const [mechanic] = await db
          .select()
          .from(mechanicsTable)
          .where(eq(mechanicsTable.phone, auth.phone));
        if (!mechanic) {
          return res.json(createResponse(true, 'No mechanic profile linked', []));
        }
        mechanicId = mechanic.id;
      }

      // Fetch bookings assigned to this mechanic (or all assigned jobs if admin view)
      const query = db
        .select({
          id: bookingsTable.id,
          bookingNumber: bookingsTable.bookingNumber,
          customerName: customersTable.name,
          customerPhone: customersTable.phone,
          vehicleBrand: customerVehiclesTable.brand,
          vehicleModel: customerVehiclesTable.model,
          registrationNumber: customerVehiclesTable.registrationNumber,
          vehicleType: customerVehiclesTable.vehicleType,
          appointmentDate: bookingsTable.appointmentDate,
          timeSlot: bookingsTable.timeSlot,
          status: bookingsTable.status,
          problemDescription: bookingsTable.problemDescription,
          assignedMechanicId: bookingsTable.assignedMechanicId,
          totalPrice: bookingsTable.totalPrice,
          createdAt: bookingsTable.createdAt,
        })
        .from(bookingsTable)
        .leftJoin(customersTable, eq(bookingsTable.customerId, customersTable.id))
        .leftJoin(customerVehiclesTable, eq(bookingsTable.customerVehicleId, customerVehiclesTable.id))
        .orderBy(desc(bookingsTable.appointmentDate));

      const allBookings = await query;
      const filtered = mechanicId
        ? allBookings.filter((b) => b.assignedMechanicId === mechanicId)
        : allBookings;

      // Enrich with job card details
      const enriched = await Promise.all(
        filtered.map(async (job) => {
          const [jobCard] = await db
            .select()
            .from(serviceJobCardsTable)
            .where(eq(serviceJobCardsTable.bookingId, job.id));

          let inspectionsCount = 0;
          let partsCount = 0;

          if (jobCard) {
            const [inspections, parts] = await Promise.all([
              db
                .select()
                .from(jobCardInspectionsTable)
                .where(eq(jobCardInspectionsTable.jobCardId, jobCard.id)),
              db.select().from(jobCardPartsTable).where(eq(jobCardPartsTable.jobCardId, jobCard.id)),
            ]);
            inspectionsCount = inspections.length;
            partsCount = parts.length;
          }

          return {
            ...job,
            jobCard: jobCard
              ? {
                  id: jobCard.id,
                  jobNumber: jobCard.jobNumber,
                  status: jobCard.status,
                  odometerReading: jobCard.odometerReading,
                  fuelLevel: jobCard.fuelLevel,
                  labourCharges: jobCard.labourCharges,
                  partsTotal: jobCard.partsTotal,
                  totalAmount: jobCard.totalAmount,
                  inspectionsCount,
                  partsCount,
                }
              : null,
          };
        })
      );

      return res.json(createResponse(true, 'Assigned service jobs fetched', enriched));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch assigned jobs', undefined, 'INTERNAL_ERROR'));
    }
  }
}

export const mechanicsController = new MechanicsController();
