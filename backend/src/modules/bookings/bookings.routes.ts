import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const bookingsRouter = Router();

// Core Booking Routes
bookingsRouter.get('/', requireAuth, (req, res) => bookingsController.getBookings(req, res));
bookingsRouter.post('/', optionalAuth, (req, res) => bookingsController.createBooking(req, res));
bookingsRouter.get('/:id', requireAuth, (req, res) => bookingsController.getBookingById(req, res));
bookingsRouter.patch('/:id/status', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), (req, res) => bookingsController.updateBookingStatus(req, res));
bookingsRouter.put('/:id/status', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), (req, res) => bookingsController.updateBookingStatus(req, res));
bookingsRouter.post('/:id/assign-mechanic', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => bookingsController.assignMechanic(req, res));
bookingsRouter.put('/:id/mechanic', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => bookingsController.assignMechanic(req, res));

// Workshop Job Card & Inspection Routes
bookingsRouter.get('/:id/job-card', requireAuth, (req, res) => bookingsController.getJobCard(req, res));
bookingsRouter.post('/:id/job-card', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), (req, res) => bookingsController.createJobCard(req, res));
bookingsRouter.patch('/:id/job-card', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), (req, res) => bookingsController.updateJobCard(req, res));
bookingsRouter.post('/:id/job-card/inspections', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), (req, res) => bookingsController.recordInspection(req, res));
bookingsRouter.post('/:id/job-card/parts', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), (req, res) => bookingsController.addJobCardPart(req, res));
bookingsRouter.get('/:id/timeline', requireAuth, (req, res) => bookingsController.getTimeline(req, res));
