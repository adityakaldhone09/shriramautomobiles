import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const bookingsRouter = Router();

bookingsRouter.get('/', (req, res) => bookingsController.getBookings(req, res));
bookingsRouter.post('/', (req, res) => bookingsController.createBooking(req, res));
bookingsRouter.get('/:id', (req, res) => bookingsController.getBookingById(req, res));
bookingsRouter.patch('/:id/status', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), (req, res) => bookingsController.updateBookingStatus(req, res));
bookingsRouter.post('/:id/assign-mechanic', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => bookingsController.assignMechanic(req, res));
