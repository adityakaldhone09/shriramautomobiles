import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { bookingsTable, mechanicsTable } from '../../db/schema';
import { bookingsService } from './bookings.service';
import { createResponse, isValidEmail, isValidPhone } from '../../utils/helpers';
import { getAuthUser } from '../../middleware/auth';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_SERVICE', 'ESTIMATE_PENDING', 'CANCELLED'],
  ESTIMATE_PENDING: ['ESTIMATE_APPROVED', 'ESTIMATE_REJECTED', 'CANCELLED'],
  ESTIMATE_APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  ESTIMATE_REJECTED: ['CANCELLED', 'COMPLETED'],
  IN_SERVICE: ['IN_PROGRESS', 'ESTIMATE_PENDING', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['READY_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  READY_FOR_DELIVERY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class BookingsController {
  async createBooking(req: Request, res: Response) {
    const { fullName, phone, email, appointmentDate, timeSlot, vehicleBrand, vehicleModel, registrationNumber } = req.body;

    if (!fullName || !phone || !appointmentDate || !timeSlot) {
      return res.status(400).json(
        createResponse(false, 'Full name, phone, appointment date, and time slot are required', undefined, 'VALIDATION_ERROR')
      );
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json(createResponse(false, 'Invalid email format', undefined, 'VALIDATION_ERROR'));
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json(createResponse(false, 'Invalid phone number format', undefined, 'VALIDATION_ERROR'));
    }

    let userId: number | undefined;
    try {
      const user = getAuthUser(req);
      if (user) userId = user.id;
    } catch {
      // Unauthenticated booking is allowed for guest walk-ins
    }

    const booking = await bookingsService.create({
      ...req.body,
      userId,
      vehicleBrand: vehicleBrand || 'Generic',
      vehicleModel: vehicleModel || 'Standard',
      registrationNumber: registrationNumber || 'MH12AB1234',
    });

    return res.status(201).json(createResponse(true, 'Booking created successfully', booking));
  }

  async getBookings(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json(createResponse(false, 'Authentication required', undefined, 'UNAUTHORIZED'));
    }

    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      const bookings = await bookingsService.getAll();
      return res.json(createResponse(true, 'Bookings fetched successfully', bookings));
    }

    if (user.role === 'MECHANIC') {
      const [mechanic] = await db.select().from(mechanicsTable).where(eq(mechanicsTable.phone, user.phone));
      if (!mechanic) {
        return res.json(createResponse(true, 'Bookings fetched successfully', []));
      }
      const all = await bookingsService.getAll();
      const filtered = all.filter((b: any) => b.assignedMechanicId === mechanic.id);
      return res.json(createResponse(true, 'Bookings fetched successfully', filtered));
    }

    // Customer: only their own bookings
    const userBookings = await db.select().from(bookingsTable).where(eq(bookingsTable.userId, user.id));
    return res.json(createResponse(true, 'Bookings fetched successfully', userBookings));
  }

  async getBookingById(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json(createResponse(false, 'Authentication required', undefined, 'UNAUTHORIZED'));
    }

    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json(createResponse(false, 'Invalid booking ID', undefined, 'VALIDATION_ERROR'));
    }

    const booking = await bookingsService.getById(id);
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      return res.json(createResponse(true, 'Booking fetched successfully', booking));
    }

    if (user.role === 'MECHANIC') {
      const [mechanic] = await db.select().from(mechanicsTable).where(eq(mechanicsTable.phone, user.phone));
      if (mechanic && booking.assignedMechanicId === mechanic.id) {
        return res.json(createResponse(true, 'Booking fetched successfully', booking));
      }
      return res.status(403).json(createResponse(false, 'Unauthorized to view this booking', undefined, 'FORBIDDEN'));
    }

    // Customer ownership check
    if (booking.userId === user.id) {
      return res.json(createResponse(true, 'Booking fetched successfully', booking));
    }

    return res.status(403).json(createResponse(false, 'Unauthorized to view this booking', undefined, 'FORBIDDEN'));
  }

  async updateBookingStatus(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json(createResponse(false, 'Authentication required', undefined, 'UNAUTHORIZED'));
    }

    const id = parseInt(req.params.id, 10);
    const { status, notes } = req.body;

    const booking = await bookingsService.getById(id);
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    // Mechanic check: can only update bookings assigned to them
    if (user.role === 'MECHANIC') {
      const [mechanic] = await db.select().from(mechanicsTable).where(eq(mechanicsTable.phone, user.phone));
      if (!mechanic || booking.assignedMechanicId !== mechanic.id) {
        return res.status(403).json(createResponse(false, 'Unauthorized to update this booking', undefined, 'FORBIDDEN'));
      }
    }

    // Enforce state transition rules
    const currentStatus = booking.status;
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json(
        createResponse(
          false,
          `Invalid state transition from ${currentStatus} to ${status}. Allowed: ${allowedNext.join(', ') || 'none'}`,
          undefined,
          'INVALID_STATE_TRANSITION'
        )
      );
    }

    const updated = await bookingsService.updateStatus(id, status, notes);
    return res.json(createResponse(true, 'Booking status updated', updated));
  }

  async assignMechanic(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const { mechanicId } = req.body;
    if (!Number.isInteger(Number(mechanicId))) {
      return res.status(400).json(createResponse(false, 'A valid mechanic ID is required', undefined, 'VALIDATION_ERROR'));
    }

    const [mechanic] = await db
      .select()
      .from(mechanicsTable)
      .where(eq(mechanicsTable.id, Number(mechanicId)));

    if (!mechanic) {
      return res.status(404).json(createResponse(false, 'Mechanic not found', undefined, 'NOT_FOUND'));
    }

    const updated = await bookingsService.assignMechanic(id, Number(mechanicId));
    if (!updated) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Mechanic assigned successfully', updated));
  }
}

export const bookingsController = new BookingsController();

