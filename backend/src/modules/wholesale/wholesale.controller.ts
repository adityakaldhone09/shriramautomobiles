import type { Request, Response } from 'express';
import { db } from '../../db/client';
import { wholesaleQuotesTable } from '../../db/schema';
import { createResponse, isValidPhone } from '../../utils/helpers';

export class WholesaleController {
  async submitQuote(req: Request, res: Response) {
    const { name, phone, businessName, requiredProducts, message } = req.body;
    if (!name || !phone || !isValidPhone(phone) || !requiredProducts) {
      return res.status(400).json(
        createResponse(false, 'Name, valid phone number, and required products list are required', undefined, 'VALIDATION_ERROR')
      );
    }
    const [quote] = await db
      .insert(wholesaleQuotesTable)
      .values({
        name,
        phone,
        businessName,
        requiredProducts,
        message,
        status: 'NEW',
      })
      .returning();
    return res.status(201).json(createResponse(true, 'Wholesale quote request submitted', quote));
  }

  async listQuotes(_req: Request, res: Response) {
    const quotes = await db.select().from(wholesaleQuotesTable);
    return res.json(createResponse(true, 'Wholesale quotes fetched', quotes));
  }
}

export const wholesaleController = new WholesaleController();
