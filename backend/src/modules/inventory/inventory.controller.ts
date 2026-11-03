import type { Request, Response } from 'express';
import { inventoryService } from './inventory.service';
import { createResponse } from '../../utils/helpers';
import type { AuthUser } from '../../middleware/auth';

export class InventoryController {
  async listInventory(req: Request, res: Response) {
    try {
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const lowStockOnly = req.query.lowStock === 'true';

      const items = await inventoryService.listInventory({ search, category, lowStockOnly });
      return res.json(createResponse(true, 'Inventory items retrieved', items));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch inventory', undefined, 'INTERNAL_ERROR'));
    }
  }

  async adjustStock(req: Request, res: Response) {
    try {
      const { partId, quantityChange, movementType = 'ADJUSTMENT', notes, location, allowNegative } = req.body;
      const user = (req as Request & { user?: AuthUser }).user;

      if (!partId || quantityChange === undefined || Number.isNaN(Number(quantityChange))) {
        return res.status(400).json(createResponse(false, 'partId and valid quantityChange are required', undefined, 'VALIDATION_ERROR'));
      }

      const result = await inventoryService.adjustStock({
        partId: Number(partId),
        quantityChange: Number(quantityChange),
        movementType,
        notes,
        location,
        performedByUserId: user?.id,
        allowNegative: Boolean(allowNegative),
      });

      return res.json(createResponse(true, 'Stock adjusted successfully', result));
    } catch (error: any) {
      if (error.message?.includes('Insufficient inventory') || error.message?.includes('not found')) {
        return res.status(400).json(createResponse(false, error.message, undefined, 'INSUFFICIENT_STOCK'));
      }
      return res.status(500).json(createResponse(false, error.message || 'Failed to adjust stock', undefined, 'INTERNAL_ERROR'));
    }
  }

  async listMovements(req: Request, res: Response) {
    try {
      const partId = req.query.partId ? Number(req.query.partId) : undefined;
      const movementType = req.query.movementType as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const movements = await inventoryService.listMovements({ partId, movementType, limit });
      return res.json(createResponse(true, 'Inventory movements retrieved', movements));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch inventory movements', undefined, 'INTERNAL_ERROR'));
    }
  }
}

export const inventoryController = new InventoryController();
