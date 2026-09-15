import type { Request, Response } from 'express';
import { vehiclesService } from './vehicles.service';
import { createResponse } from '../../utils/helpers';
import { getAuthUser } from '../../middleware/auth';

export class VehiclesController {
  async listBrands(_req: Request, res: Response) {
    const brands = await vehiclesService.getBrands();
    return res.json(createResponse(true, 'Vehicle brands fetched', brands));
  }

  async listModels(req: Request, res: Response) {
    const brandId = req.query.brandId ? Number(req.query.brandId) : undefined;
    const models = await vehiclesService.getModels(brandId);
    return res.json(createResponse(true, 'Vehicle models fetched', models));
  }

  async listMyVehicles(req: Request, res: Response) {
    const user = getAuthUser(req);
    const vehicles = await vehiclesService.getCustomerVehicles(user.id);
    return res.json(createResponse(true, 'Vehicles fetched', vehicles));
  }

  async createMyVehicle(req: Request, res: Response) {
    const user = getAuthUser(req);
    const { brand, model, registrationNumber } = req.body;

    if (!brand || !model || !registrationNumber) {
      return res.status(400).json(
        createResponse(false, 'Vehicle brand, model, and registration number are required', undefined, 'VALIDATION_ERROR')
      );
    }

    const vehicle = await vehiclesService.createCustomerVehicle({
      userId: user.id,
      customerId: user.customerId,
      ...req.body,
    });

    return res.status(201).json(createResponse(true, 'Vehicle added to garage', vehicle));
  }
}

export const vehiclesController = new VehiclesController();
