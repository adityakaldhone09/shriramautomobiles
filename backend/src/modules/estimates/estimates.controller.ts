import { and, eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { db } from '../../db/client';
import { bookingsTable, mechanicsTable, serviceEstimateItemsTable, serviceEstimatesTable } from '../../db/schema';
import { getAuthUser } from '../../middleware/auth';
import { createResponse } from '../../utils/helpers';

export class EstimatesController {
  async getEstimate(req: Request, res: Response) {
    const user = getAuthUser(req);
    const bookingId = Number(req.params.bookingId);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json(createResponse(false, 'Invalid booking ID', undefined, 'VALIDATION_ERROR'));
    }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    // Authorization check
    if (user.role === 'CUSTOMER' && booking.userId !== user.id) {
      return res.status(403).json(createResponse(false, 'Unauthorized to view this estimate', undefined, 'FORBIDDEN'));
    }

    if (user.role === 'MECHANIC') {
      const [mechanic] = await db.select().from(mechanicsTable).where(eq(mechanicsTable.phone, user.phone));
      if (!mechanic || booking.assignedMechanicId !== mechanic.id) {
        return res.status(403).json(createResponse(false, 'Unauthorized to view this estimate', undefined, 'FORBIDDEN'));
      }
    }

    const [estimate] = await db.select().from(serviceEstimatesTable).where(eq(serviceEstimatesTable.bookingId, bookingId));
    if (!estimate) {
      return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    }

    const items = await db.select().from(serviceEstimateItemsTable).where(eq(serviceEstimateItemsTable.estimateId, estimate.id));
    return res.json(createResponse(true, 'Estimate fetched', { ...estimate, items }));
  }

  async createEstimate(req: Request, res: Response) {
    const user = getAuthUser(req);
    const bookingId = Number(req.params.bookingId);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json(createResponse(false, 'Invalid booking ID', undefined, 'VALIDATION_ERROR'));
    }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    if (user.role === 'MECHANIC') {
      const [mechanic] = await db.select().from(mechanicsTable).where(eq(mechanicsTable.phone, user.phone));
      if (!mechanic || booking.assignedMechanicId !== mechanic.id) {
        return res.status(403).json(createResponse(false, 'Unauthorized to generate estimate for this booking', undefined, 'FORBIDDEN'));
      }
    }

    const { labourAmount = 0, partsAmount = 0, discountAmount = 0, taxAmount = 0, notes, items = [] } = req.body;
    const numLabour = Math.max(0, Number(labourAmount) || 0);
    const numParts = Math.max(0, Number(partsAmount) || 0);
    const numDiscount = Math.max(0, Number(discountAmount) || 0);
    const numTax = Math.max(0, Number(taxAmount) || 0);
    const totalAmount = Math.max(0, numLabour + numParts - numDiscount + numTax);

    const [estimate] = await db
      .insert(serviceEstimatesTable)
      .values({
        bookingId,
        labourAmount: numLabour.toFixed(2),
        partsAmount: numParts.toFixed(2),
        discountAmount: numDiscount.toFixed(2),
        taxAmount: numTax.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        estimatedAmount: totalAmount.toFixed(2),
        notes: notes ? String(notes).slice(0, 1000) : null,
        status: 'PENDING',
      })
      .returning();

    for (const item of items) {
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const qty = Math.max(1, Number(item.quantity) || 1);
      await db.insert(serviceEstimateItemsTable).values({
        estimateId: estimate.id,
        partId: item.partId ? Number(item.partId) : null,
        itemType: item.itemType === 'LABOUR' ? 'LABOUR' : 'PART',
        description: String(item.description || 'Service item').slice(0, 255),
        quantity: qty,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: (unitPrice * qty).toFixed(2),
      });
    }

    await db
      .update(bookingsTable)
      .set({ status: 'ESTIMATE_PENDING', totalPrice: totalAmount.toFixed(2), updatedAt: new Date() })
      .where(eq(bookingsTable.id, bookingId));

    return res.status(201).json(createResponse(true, 'Estimate generated', estimate));
  }

  async approveEstimate(req: Request, res: Response) {
    const user = getAuthUser(req);
    const bookingId = Number(req.params.bookingId);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json(createResponse(false, 'Invalid booking ID', undefined, 'VALIDATION_ERROR'));
    }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    // Only booking owner or admin can approve
    if (user.role === 'CUSTOMER' && booking.userId !== user.id) {
      return res.status(403).json(createResponse(false, 'Unauthorized to approve this estimate', undefined, 'FORBIDDEN'));
    }

    const [estimate] = await db.select().from(serviceEstimatesTable).where(eq(serviceEstimatesTable.bookingId, bookingId));
    if (!estimate) {
      return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    }

    if (estimate.status !== 'PENDING') {
      return res.status(409).json(
        createResponse(false, `Cannot approve an estimate that is already ${estimate.status}`, undefined, 'INVALID_STATE')
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(serviceEstimatesTable)
        .set({ status: 'APPROVED', updatedAt: new Date() })
        .where(eq(serviceEstimatesTable.id, estimate.id));

      await tx
        .update(bookingsTable)
        .set({ status: 'ESTIMATE_APPROVED', updatedAt: new Date() })
        .where(eq(bookingsTable.id, bookingId));
    });

    return res.json(createResponse(true, 'Estimate approved'));
  }

  async rejectEstimate(req: Request, res: Response) {
    const user = getAuthUser(req);
    const bookingId = Number(req.params.bookingId);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json(createResponse(false, 'Invalid booking ID', undefined, 'VALIDATION_ERROR'));
    }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    if (user.role === 'CUSTOMER' && booking.userId !== user.id) {
      return res.status(403).json(createResponse(false, 'Unauthorized to reject this estimate', undefined, 'FORBIDDEN'));
    }

    const [estimate] = await db.select().from(serviceEstimatesTable).where(eq(serviceEstimatesTable.bookingId, bookingId));
    if (!estimate) {
      return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    }

    if (estimate.status !== 'PENDING') {
      return res.status(409).json(
        createResponse(false, `Cannot reject an estimate that is already ${estimate.status}`, undefined, 'INVALID_STATE')
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(serviceEstimatesTable)
        .set({ status: 'REJECTED', updatedAt: new Date() })
        .where(eq(serviceEstimatesTable.id, estimate.id));

      await tx
        .update(bookingsTable)
        .set({ status: 'ESTIMATE_REJECTED', updatedAt: new Date() })
        .where(eq(bookingsTable.id, bookingId));
    });

    return res.json(createResponse(true, 'Estimate rejected'));
  }
}

export const estimatesController = new EstimatesController();

