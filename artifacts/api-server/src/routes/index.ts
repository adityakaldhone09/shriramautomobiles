import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import partsRouter from "./parts";
import bookingsRouter from "./bookings";
import contactRouter from "./contact";
import authRouter from "./auth";
import accountRouter from "./account";
import mechanicsRouter from "./mechanics";
import ordersRouter from "./orders";
import vehiclesRouter from "./vehicles";
import adminRouter from "./admin";
import platformRouter from "./platform";
import cartRouter from "./cart";
import estimatesRouter from "./estimates";
import intelligenceRouter from "./intelligence";
import { getAvailableSlots } from "../controllers/slotsController";

const router: IRouter = Router();

router.use(healthRouter);
router.use(servicesRouter);
router.use(partsRouter);
router.use(bookingsRouter);
router.use(contactRouter);
router.use(authRouter);
router.use(accountRouter);
router.use(mechanicsRouter);
router.use(ordersRouter);
router.use(vehiclesRouter);
router.use(adminRouter);
router.use(platformRouter);
router.use(cartRouter);
router.use(estimatesRouter);
router.use(intelligenceRouter);
router.get("/slots", getAvailableSlots);

export default router;
