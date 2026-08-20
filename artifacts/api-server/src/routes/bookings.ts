import { Router, type IRouter } from "express";
import { CreateBookingBody, CreateBookingResponse, ListBookingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const bookings: Array<Record<string, unknown>> = [];

router.post("/bookings", (req, res) => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete all required booking details." });
    return;
  }
  const booking = {
    ...parsed.data,
    id: crypto.randomUUID(),
    bookingId: `SHA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  res.status(201).json(CreateBookingResponse.parse(booking));
});

router.get("/bookings", (_req, res) => {
  res.json(ListBookingsResponse.parse(bookings));
});

export default router;