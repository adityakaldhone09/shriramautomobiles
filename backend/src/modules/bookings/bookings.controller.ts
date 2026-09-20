import type { Request, Response } from 'express';
import { bookingsService } from './bookings.service';
import { createResponse, isValidEmail, isValidPhone } from '../../utils/helpers';
import { getAuthUser } from '../../middleware/auth';

export class BookingsController {
  async createBooking(req: Request, res: Response) {
    const { fullName, phone, email, appointmentDate, timeSlot, vehicleBrand, vehicleModel, registrationNumber } = req.body;

    if (!fullName || !phone || !appointmentDate || !timeSlot) {
      return res.status(400).json(createResponse(false, 'Full name, phone, appointment date, and time slot are required', undefined, 'VALIDATION_ERROR'));
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
      // Unauthenticated booking is allowed
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

  async getBookings(_req: Request, res: Response) {
    const bookings = await bookingsService.getAll();
    return res.json(createResponse(true, 'Bookings fetched successfully', bookings));
  }

  async getBookingById(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const booking = await bookingsService.getById(id);
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Booking fetched successfully', booking));
  }

  async updateBookingStatus(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const { status, notes } = req.body;
    const updated = await bookingsService.updateStatus(id, status, notes);
    if (!updated) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Booking status updated', updated));
  }

  async assignMechanic(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const { mechanicId } = req.body;
    const updated = await bookingsService.assignMechanic(id, Number(mechanicId));
    if (!updated) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Mechanic assigned successfully', updated));
  }
}

export const bookingsController = new BookingsController();
