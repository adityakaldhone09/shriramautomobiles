import type { Request, Response } from 'express';
import { and, eq, lte } from 'drizzle-orm';
import { db } from '../../db/client';
import { bookingsTable, customersTable, mechanicsTable, ordersTable, sparePartsTable } from '../../db/schema';
import { createResponse } from '../../utils/helpers';

export class AdminController {
  async listCustomers(_req: Request, res: Response) {
    const customers = await db.select().from(customersTable);
    return res.json(createResponse(true, 'Customers fetched', customers));
  }

  async listInventory(_req: Request, res: Response) {
    const inventory = await db.select().from(sparePartsTable);
    return res.json(createResponse(true, 'Inventory fetched', inventory));
  }

  async listLowStock(_req: Request, res: Response) {
    const lowStock = await db
      .select()
      .from(sparePartsTable)
      .where(lte(sparePartsTable.stockQuantity, sparePartsTable.lowStockThreshold));
    return res.json(createResponse(true, 'Low stock fetched', lowStock));
  }

  async updateOrderStatus(req: Request, res: Response) {
    const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    const { status } = req.body;
    if (!statuses.includes(status)) {
      return res.status(400).json(createResponse(false, 'Invalid order status', undefined, 'VALIDATION_ERROR'));
    }
    const [order] = await db
      .update(ordersTable)
      .set({ status })
      .where(eq(ordersTable.id, Number(req.params.id)))
      .returning();
    if (!order) return res.status(404).json(createResponse(false, 'Order not found', undefined, 'NOT_FOUND'));
    return res.json(createResponse(true, 'Order status updated', order));
  }

  async assignMechanic(req: Request, res: Response) {
    const mechanicId = Number(req.body.mechanicId);
    const [mechanic] = await db
      .select()
      .from(mechanicsTable)
      .where(and(eq(mechanicsTable.id, mechanicId), eq(mechanicsTable.isAvailable, true)));
    if (!mechanic) return res.status(409).json(createResponse(false, 'Mechanic is unavailable', undefined, 'MECHANIC_UNAVAILABLE'));

    const [booking] = await db
      .update(bookingsTable)
      .set({ assignedMechanicId: mechanic.id, updatedAt: new Date() })
      .where(eq(bookingsTable.id, Number(req.params.id)))
      .returning();
    if (!booking) return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    return res.json(createResponse(true, 'Mechanic assigned', booking));
  }
}

export const adminController = new AdminController();
