import { Router, type IRouter } from "express";
import { CreateContactInquiryBody, CreateContactInquiryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/contact", (req, res) => {
  const parsed = CreateContactInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete the contact form." });
    return;
  }
  res.status(201).json(CreateContactInquiryResponse.parse({
    ...parsed.data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }));
});

export default router;