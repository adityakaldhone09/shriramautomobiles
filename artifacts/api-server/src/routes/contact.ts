import { Router, type IRouter } from "express";
import {
  createContactInquiry,
  listContactInquiries,
  getContactInquiryById,
} from "../controllers/contactController";

const router: IRouter = Router();

router.post("/contact", createContactInquiry);
router.get("/contact", listContactInquiries);
router.get("/contact/:id", getContactInquiryById);

export default router;