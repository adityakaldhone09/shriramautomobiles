import { eq, and } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { db } from '../../db/client';
import { serviceEstimatesTable, serviceEstimateItemsTable, bookingsTable, servicePartsTable } from '../../db/schema';
import { createResponse } from '../../utils/helpers';

export class EstimatesController {
  async getEstimate(req: Request, res: Response) {
    const bookingId = Number(req.params.bookingId);
    const [estimate] = await db.select().from(serviceEstimatesTable).where(eq(serviceEstimatesTable.bookingId, bookingId));
    if (!estimate) return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    const items = await db.select().from(serviceEstimateItemsTable).where(eq(serviceEstimateItemsTable.estimateId, estimate.id));
    return res.json(createResponse(true, 'Estimate fetched', { ...estimate, items }));
  }

  async createEstimate(req: Request, res: Response) {
    const bookingId = Number(req.params.bookingId);
    const { labourAmount = 0, partsAmount = 0, discountAmount = 0, taxAmount = 0, notes, items = [] } = req.body;
    const totalAmount = Number(labourAmount) + Number(partsAmount) - Number(discountAmount) + Number(taxAmount);

    const [estimate] = await db
      .insert(serviceEstimatesTable)
      .values({
        bookingId,
        labourAmount: String(labourAmount),
        partsAmount: String(partsAmount),
        discountAmount: String(discountAmount),
        taxAmount: String(taxAmount),
        totalAmount: String(totalAmount),
        estimatedAmount: String(totalAmount),
        notes,
        status: 'PENDING',
      })
      .returning();

    for (const item of items) {
      await db.insert(serviceEstimateItemsTable).values({
        estimateId: estimate.id,
        partId: item.partId ? Number(item.partId) : null,
        itemType: item.itemType || 'PART',
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: String(item.unitPrice),
        totalPrice: String(Number(item.unitPrice) * (item.quantity || 1)),
      });
    }

    await db.update(bookingsTable).set({ status: 'ESTIMATE_PENDING', totalPrice: String(totalAmount) }).where(eq(bookingsTable.id, bookingId));
    return res.status(201).json(createResponse(true, 'Estimate generated', estimate));
  }

  async approveEstimate(req: Request, res: Response) {
    const bookingId = Number(req.params.bookingId);
    const [estimate] = await db.select().from(serviceEstimatesTable).where(eq(serviceEstimatesTable.bookingId, bookingId));
    if (!estimate) return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));

    await db.update(serviceEstimatesTable).set({ status: 'APPROVED', updatedAt: new Date() }).where(eq(serviceEstimatesTable.id, estimate.id));
    await db.update(bookingsTable).set({ status: 'ESTIMATE_APPROVED', updatedAt: new Date() }).where(eq(bookingsTable.id, bookingId));

    return res.json(createResponse(true, 'Estimate approved'));
  }
}

export const estimatesController = new EstimatesController();
