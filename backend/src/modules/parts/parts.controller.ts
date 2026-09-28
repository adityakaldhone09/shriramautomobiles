import type { Request, Response } from 'express';
import { partsService } from './parts.service';
import { createResponse } from '../../utils/helpers';

function sanitizePart(part: any, isAdmin: boolean) {
  if (!part) return null;
  if (isAdmin) return part;
  const { purchasePrice, supplier, ...publicFields } = part;
  return publicFields;
}

export class PartsController {
  async getSpareParts(req: Request, res: Response) {
    const { brand, category, search } = req.query;
    const user = (req as any).user;
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'STAFF');

    const parts = await partsService.getParts({
      brand: brand ? String(brand).slice(0, 100) : undefined,
      category: category ? String(category).slice(0, 100) : undefined,
      search: search ? String(search).slice(0, 100) : undefined,
    });

    const sanitized = parts.map((p) => sanitizePart(p, Boolean(isAdmin)));
    return res.json(createResponse(true, 'Spare parts fetched successfully', sanitized));
  }

  async getSparePartById(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json(createResponse(false, 'Invalid part ID', undefined, 'VALIDATION_ERROR'));
    }

    const user = (req as any).user;
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'STAFF');

    const part = await partsService.getPartById(id);
    if (!part) {
      return res.status(404).json(createResponse(false, 'Spare part not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Spare part fetched successfully', sanitizePart(part, Boolean(isAdmin))));
  }


  async getCategories(_req: Request, res: Response) {
    const categories = await partsService.getCategories();
    return res.json(createResponse(true, 'Part categories fetched', categories));
  }

  async getCompatibleParts(req: Request, res: Response) {
    const vehicleModelId = Number(req.params.vehicleId);
    const parts = await partsService.getCompatibleParts(vehicleModelId);
    return res.json(createResponse(true, 'Compatible parts fetched', parts));
  }

  async createSparePart(req: Request, res: Response) {
    const newPart = await partsService.createPart(req.body);
    return res.status(201).json(createResponse(true, 'Spare part created successfully', newPart));
  }

  async updateSparePart(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const updated = await partsService.updatePart(id, req.body);
    if (!updated) {
      return res.status(404).json(createResponse(false, 'Spare part not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Spare part updated successfully', updated));
  }

  async deleteSparePart(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const deleted = await partsService.deletePart(id);
    if (!deleted) {
      return res.status(404).json(createResponse(false, 'Spare part not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Spare part deleted successfully', deleted));
  }
}

export const partsController = new PartsController();
