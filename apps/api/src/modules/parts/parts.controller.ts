import type { Request, Response } from 'express';
import { partsService } from './parts.service';
import { createResponse } from '../../utils/helpers';

export class PartsController {
  async getSpareParts(req: Request, res: Response) {
    const { brand, category, search } = req.query;
    const parts = await partsService.getParts({
      brand: brand as string,
      category: category as string,
      search: search as string,
    });
    return res.json(createResponse(true, 'Spare parts fetched successfully', parts));
  }

  async getSparePartById(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const part = await partsService.getPartById(id);
    if (!part) {
      return res.status(404).json(createResponse(false, 'Spare part not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Spare part fetched successfully', part));
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
