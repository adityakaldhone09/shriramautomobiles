import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import partsRouter from "./parts";
import bookingsRouter from "./bookings";
import contactRouter from "./contact";

const router: IRouter = Router();

router.use(healthRouter);
router.use(servicesRouter);
router.use(partsRouter);
router.use(bookingsRouter);
router.use(contactRouter);

export default router;
