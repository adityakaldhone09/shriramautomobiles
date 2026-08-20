import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { contactInquiriesTable, insertContactInquirySchema } from '@workspace/db/schema';
import { createResponse, isValidEmail, isValidPhone } from '../utils/helpers';

export async function createContactInquiry(req: Request, res: Response) {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validation
    if (!isValidEmail(email)) {
      return res.status(400).json(
        createResponse(false, 'Invalid email format', undefined, 'VALIDATION_ERROR')
      );
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json(
        createResponse(false, 'Invalid phone format', undefined, 'VALIDATION_ERROR')
      );
    }

    const validatedData = insertContactInquirySchema.parse({
      name,
      email,
      phone,
      subject,
      message,
    });

    const newInquiry = await db
      .insert(contactInquiriesTable)
      .values(validatedData)
      .returning();

    // TODO: Send email notification to admin

    return res.status(201).json(
      createResponse(true, 'Your message has been sent successfully', newInquiry[0])
    );
  } catch (error) {
    console.error('Error creating contact inquiry:', error);
    return res.status(400).json(
      createResponse(false, 'Failed to send message', undefined, 'VALIDATION_ERROR')
    );
  }
}

export async function listContactInquiries(req: Request, res: Response) {
  try {
    const inquiries = await db.select().from(contactInquiriesTable);

    return res.json(
      createResponse(true, 'Contact inquiries fetched successfully', inquiries)
    );
  } catch (error) {
    console.error('Error fetching contact inquiries:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch contact inquiries', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function getContactInquiryById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const inquiry = await db
      .select()
      .from(contactInquiriesTable)
      .where(eq(contactInquiriesTable.id, parseInt(String(id), 10)));

    if (!inquiry || inquiry.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Contact inquiry not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Contact inquiry fetched successfully', inquiry[0])
    );
  } catch (error) {
    console.error('Error fetching contact inquiry:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch contact inquiry', undefined, 'INTERNAL_ERROR')
    );
  }
}
