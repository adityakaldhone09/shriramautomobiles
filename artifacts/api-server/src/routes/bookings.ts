import { Router, type IRouter } from "express";
import {
  createBooking,
  getBooking,
  updateBookingStatus,
  listBookings,
} from "../controllers/bookingController";

const router: IRouter = Router();

router.post("/bookings", createBooking);
router.get("/bookings", listBookings);
router.get("/bookings/:bookingId", getBooking);
router.put("/bookings/:id/status", updateBookingStatus);

export default router;