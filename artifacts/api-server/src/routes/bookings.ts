import { Router, type IRouter } from "express";
import {
  createBooking,
  getBooking,
  updateBookingStatus,
  listBookings,
  listAccountBookings,
  getAccountBooking,
} from "../controllers/bookingController";
import { requireAuth, requireRole } from '../middlewares/auth';

const router: IRouter = Router();

router.post("/bookings", createBooking);
router.get("/bookings", listBookings);
router.get("/bookings/:bookingId", getBooking);
router.put("/bookings/:id/status", requireAuth, requireRole('ADMIN', 'STAFF'), updateBookingStatus);
router.get('/account/bookings', requireAuth, listAccountBookings);
router.get('/account/bookings/:bookingNumber', requireAuth, getAccountBooking);
router.put('/admin/bookings/:id/status', requireAuth, requireRole('ADMIN', 'STAFF'), updateBookingStatus);

export default router;