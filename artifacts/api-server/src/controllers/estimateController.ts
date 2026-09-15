import type { Request, Response } from 'express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../lib/db';
import {
  bookingsTable,
  bookingInspectionsTable,
  serviceEstimateItemsTable,
  serviceEstimatesTable,
  servicePartsTable,
  usersTable,
} from '@workspace/db/schema';
import { createResponse } from '../utils/helpers';
import { getAuthUser } from '../middlewares/auth';

const getOwnedBooking = async (req: Request, bookingId: number) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, getAuthUser(req).id));
  if (!user) return undefined;
  if (user.role === 'ADMIN' || user.role === 'STAFF') {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    return booking;
  }
  if (!user.customerId) return undefined;
  const [booking] = await db.select().from(bookingsTable).where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.customerId, user.customerId)));
  return booking;
};

// POST /api/admin/bookings/:id/inspection
export async function recordInspection(req: Request, res: Response) {
  try {
    const bookingId = Number(req.params.id);
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    const { items, mechanicNotes } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json(createResponse(false, 'Inspection items are required', undefined, 'VALIDATION_ERROR'));
    }

    // Valid statuses: CHECKED, REQUIRES_REPLACEMENT, NOT_REQUIRED
    const validStatuses = ['CHECKED', 'REQUIRES_REPLACEMENT', 'NOT_REQUIRED'];
    for (const item of items) {
      if (!item.partName || !validStatuses.includes(item.status)) {
        return res.status(400).json(createResponse(false, `Invalid inspection item or status: ${item.status}`, undefined, 'VALIDATION_ERROR'));
      }
    }

    const result = await db.transaction(async (tx) => {
      // Clear previous inspection for this booking if re-inspecting
      await tx.delete(bookingInspectionsTable).where(eq(bookingInspectionsTable.bookingId, bookingId));

      const inserted = await tx.insert(bookingInspectionsTable).values(
        items.map((item: any) => ({
          bookingId,
          partId: item.partId ? Number(item.partId) : null,
          partName: item.partName,
          status: item.status,
          notes: item.notes || null,
        }))
      ).returning();

      // Update booking status to INSPECTION or ESTIMATE_PENDING
      await tx.update(bookingsTable).set({
        status: 'ESTIMATE_PENDING',
        mechanicNotes: mechanicNotes || booking.mechanicNotes,
        updatedAt: new Date(),
      }).where(eq(bookingsTable.id, bookingId));

      return inserted;
    });

    return res.status(201).json(createResponse(true, 'Inspection recorded successfully', result));
  } catch (error: any) {
    console.error('Error recording inspection:', error);
    return res.status(500).json(createResponse(false, 'Failed to record inspection', undefined, 'INTERNAL_ERROR'));
  }
}

// POST /api/admin/bookings/:id/estimate
// Prices are ALWAYS retrieved from backend database, NEVER trusted from frontend!
export async function createEstimate(req: Request, res: Response) {
  try {
    const bookingId = Number(req.params.id);
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    const { labourAmount, labourCharges, discountAmount = 0, parts, items, notes, mechanicNotes } = req.body;
    const parsedLabour = Math.max(0, Number(labourAmount ?? labourCharges) || 0);
    const parsedDiscount = Math.max(0, Number(discountAmount) || 0);
    const partsList = Array.isArray(parts) ? parts : Array.isArray(items) ? items : [];

    // Fetch official part prices from DB (do NOT trust client prices)
    const partItems: Array<{ partId: number; description: string; quantity: number; unitPrice: number; totalPrice: number }> = [];
    if (partsList.length > 0) {
      const partIds = partsList.map((p: any) => Number(p.partId)).filter((id) => Number.isInteger(id) && id > 0);
      const dbParts = partIds.length > 0 ? await db.select().from(servicePartsTable).where(inArray(servicePartsTable.id, partIds)) : [];
      const partMap = new Map(dbParts.map((p) => [p.id, p]));

      for (const p of partsList) {
        const pId = Number(p.partId);
        if (!pId) continue;
        const dbPart = partMap.get(pId);
        if (!dbPart) {
          return res.status(400).json(createResponse(false, `Part with ID ${pId} not found in catalog`, undefined, 'PART_NOT_FOUND'));
        }
        const qty = Math.max(1, parseInt(p.quantity || '1', 10));
        const unitPrice = parseFloat(dbPart.price as any) || 0;
        const total = unitPrice * qty;
        partItems.push({
          partId: dbPart.id,
          description: dbPart.name,
          quantity: qty,
          unitPrice,
          totalPrice: total,
        });
      }
    }

    const totalPartsAmount = partItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxableSubtotal = Math.max(0, parsedLabour + totalPartsAmount - parsedDiscount);
    const taxAmount = parseFloat((taxableSubtotal * 0.18).toFixed(2)); // 18% GST standard on automotive services
    const grandTotal = parseFloat((taxableSubtotal + taxAmount).toFixed(2));

    const result = await db.transaction(async (tx) => {
      const [estimate] = await tx.insert(serviceEstimatesTable).values({
        bookingId,
        labourAmount: parsedLabour.toFixed(2),
        partsAmount: totalPartsAmount.toFixed(2),
        discountAmount: parsedDiscount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: grandTotal.toFixed(2),
        estimatedAmount: grandTotal.toFixed(2),
        status: 'PENDING',
        notes: notes || null,
      }).returning();

      // Insert labour line item
      if (parsedLabour > 0) {
        await tx.insert(serviceEstimateItemsTable).values({
          estimateId: estimate.id,
          itemType: 'LABOUR',
          description: 'Mechanic Labour & Service Charge',
          quantity: 1,
          unitPrice: parsedLabour.toFixed(2),
          totalPrice: parsedLabour.toFixed(2),
        });
      }

      // Insert parts line items
      for (const item of partItems) {
        await tx.insert(serviceEstimateItemsTable).values({
          estimateId: estimate.id,
          partId: item.partId,
          itemType: 'PART',
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          totalPrice: item.totalPrice.toFixed(2),
        });
      }

      // Update booking status to CUSTOMER_APPROVAL_REQUIRED
      await tx.update(bookingsTable).set({
        status: 'CUSTOMER_APPROVAL_REQUIRED',
        totalPrice: grandTotal.toFixed(2),
        updatedAt: new Date(),
      }).where(eq(bookingsTable.id, bookingId));

      return estimate;
    });

    return res.status(201).json(
      createResponse(true, 'Estimate generated successfully', {
        ...result,
        labourCharges: result.labourAmount,
        partsTotal: result.partsAmount,
        items: partItems,
      })
    );
  } catch (error: any) {
    console.error('Error creating estimate:', error);
    return res.status(500).json(createResponse(false, 'Failed to create estimate', undefined, 'INTERNAL_ERROR'));
  }
}

// GET /api/account/estimates/:id
export async function getEstimate(req: Request, res: Response) {
  try {
    const estimateId = Number(req.params.id);
    const [estimate] = await db.select().from(serviceEstimatesTable).where(eq(serviceEstimatesTable.id, estimateId));
    if (!estimate) {
      return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    }

    const booking = await getOwnedBooking(req, estimate.bookingId);
    if (!booking) {
      return res.status(403).json(createResponse(false, 'Unauthorized to view this estimate', undefined, 'FORBIDDEN'));
    }

    const items = await db.select().from(serviceEstimateItemsTable).where(eq(serviceEstimateItemsTable.estimateId, estimate.id));
    return res.json(createResponse(true, 'Estimate fetched', { ...estimate, items, booking }));
  } catch (error: any) {
    console.error('Error fetching estimate:', error);
    return res.status(500).json(createResponse(false, 'Failed to fetch estimate', undefined, 'INTERNAL_ERROR'));
  }
}

// PUT /api/account/estimates/:id/approve
export async function approveEstimate(req: Request, res: Response) {
  try {
    const estimateId = Number(req.params.id);
    const [estimate] = await db.select().from(serviceEstimatesTable).where(eq(serviceEstimatesTable.id, estimateId));
    if (!estimate) {
      return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    }

    const booking = await getOwnedBooking(req, estimate.bookingId);
    if (!booking) {
      return res.status(403).json(createResponse(false, 'Unauthorized to approve this estimate', undefined, 'FORBIDDEN'));
    }

    if (estimate.status !== 'PENDING') {
      return res.status(409).json(createResponse(false, `Estimate is already ${estimate.status.toLowerCase()}`, undefined, 'ESTIMATE_ALREADY_DECIDED'));
    }

    // Atomic transaction: approve estimate, update booking status to IN_SERVICE, and reserve/decrement parts inventory
    const result = await db.transaction(async (tx) => {
      const [updatedEstimate] = await tx.update(serviceEstimatesTable).set({
        status: 'APPROVED',
        updatedAt: new Date(),
      }).where(eq(serviceEstimatesTable.id, estimateId)).returning();

      await tx.update(bookingsTable).set({
        status: 'IN_SERVICE',
        updatedAt: new Date(),
      }).where(eq(bookingsTable.id, estimate.bookingId));

      // Fetch estimate items to reserve/decrement inventory atomically
      const items = await tx.select().from(serviceEstimateItemsTable).where(eq(serviceEstimateItemsTable.estimateId, estimateId));
      for (const item of items) {
        if (item.partId && item.itemType === 'PART') {
          const [part] = await tx.select().from(servicePartsTable).where(eq(servicePartsTable.id, item.partId));
          if (part) {
            const nextStock = Math.max(0, part.stockQuantity - item.quantity);
            const nextReserved = (part.reservedStock || 0) + item.quantity;
            await tx.update(servicePartsTable).set({
              stockQuantity: nextStock,
              reservedStock: nextReserved,
              availability: nextStock > 0 ? 'In Stock' : 'Out of Stock',
              updatedAt: new Date(),
            }).where(eq(servicePartsTable.id, part.id));
          }
        }
      }

      return updatedEstimate;
    });

    return res.json(createResponse(true, 'Estimate approved. Vehicle is now IN_SERVICE.', result));
  } catch (error: any) {
    console.error('Error approving estimate:', error);
    return res.status(500).json(createResponse(false, 'Failed to approve estimate', undefined, 'INTERNAL_ERROR'));
  }
}

// PUT /api/account/estimates/:id/reject
export async function rejectEstimate(req: Request, res: Response) {
  try {
    const estimateId = Number(req.params.id);
    const [estimate] = await db.select().from(serviceEstimatesTable).where(eq(serviceEstimatesTable.id, estimateId));
    if (!estimate) {
      return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    }

    const booking = await getOwnedBooking(req, estimate.bookingId);
    if (!booking) {
      return res.status(403).json(createResponse(false, 'Unauthorized to reject this estimate', undefined, 'FORBIDDEN'));
    }

    if (estimate.status !== 'PENDING') {
      return res.status(409).json(createResponse(false, `Estimate is already ${estimate.status.toLowerCase()}`, undefined, 'ESTIMATE_ALREADY_DECIDED'));
    }

    const [updatedEstimate] = await db.update(serviceEstimatesTable).set({
      status: 'REJECTED',
      updatedAt: new Date(),
    }).where(eq(serviceEstimatesTable.id, estimateId)).returning();

    return res.json(createResponse(true, 'Estimate rejected', updatedEstimate));
  } catch (error: any) {
    console.error('Error rejecting estimate:', error);
    return res.status(500).json(createResponse(false, 'Failed to reject estimate', undefined, 'INTERNAL_ERROR'));
  }
}

// Backward compatible decideEstimate
export async function decideEstimate(req: Request, res: Response) {
  if (req.params.decision === 'approve') {
    return approveEstimate(req, res);
  }
  return rejectEstimate(req, res);
}
