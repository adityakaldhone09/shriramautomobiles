import type { Request, Response } from 'express';
import { purchaseOrdersService } from './purchase-orders.service';
import { createResponse } from '../../utils/helpers';
import type { AuthUser } from '../../middleware/auth';

export class PurchaseOrdersController {
  async listPurchaseOrders(req: Request, res: Response) {
    try {
      const status = req.query.status as string | undefined;
      const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined;
      const pos = await purchaseOrdersService.listPurchaseOrders({ status, supplierId });
      return res.json(createResponse(true, 'Purchase orders fetched', pos));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch purchase orders', undefined, 'INTERNAL_ERROR'));
    }
  }

  async getPurchaseOrder(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const po = await purchaseOrdersService.getPurchaseOrderById(id);
      if (!po) {
        return res.status(404).json(createResponse(false, 'Purchase order not found', undefined, 'NOT_FOUND'));
      }
      return res.json(createResponse(true, 'Purchase order fetched', po));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch purchase order', undefined, 'INTERNAL_ERROR'));
    }
  }

  async createPurchaseOrder(req: Request, res: Response) {
    try {
      const { supplierId, destination, expectedDate, notes, items } = req.body;
      if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json(createResponse(false, 'supplierId and at least one item are required', undefined, 'VALIDATION_ERROR'));
      }

      const po = await purchaseOrdersService.createPurchaseOrder({
        supplierId: Number(supplierId),
        destination,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
        items,
      });

      return res.status(201).json(createResponse(true, 'Purchase order created successfully', po));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to create purchase order', undefined, 'INTERNAL_ERROR'));
    }
  }

  async receivePurchaseOrder(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const user = (req as Request & { user?: AuthUser }).user;

      const receivedPo = await purchaseOrdersService.receivePurchaseOrder(id, user?.id);
      return res.json(createResponse(true, 'Purchase order received and inventory updated successfully', receivedPo));
    } catch (error: any) {
      if (error.message?.includes('already received') || error.message?.includes('not found')) {
        return res.status(400).json(createResponse(false, error.message, undefined, 'BAD_REQUEST'));
      }
      return res.status(500).json(createResponse(false, error.message || 'Failed to receive purchase order', undefined, 'INTERNAL_ERROR'));
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = req.body;
      if (!status) {
        return res.status(400).json(createResponse(false, 'Status is required', undefined, 'VALIDATION_ERROR'));
      }

      const updated = await purchaseOrdersService.updateStatus(id, status);
      return res.json(createResponse(true, 'Purchase order status updated', updated));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to update purchase order status', undefined, 'INTERNAL_ERROR'));
    }
  }
}

export const purchaseOrdersController = new PurchaseOrdersController();

