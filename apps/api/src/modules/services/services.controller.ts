import type { Request, Response } from 'express';
import { servicesService } from './services.service';
import { createResponse } from '../../utils/helpers';

export class ServicesController {
  async getServices(_req: Request, res: Response) {
    const services = await servicesService.getAllServices();
    return res.json(createResponse(true, 'Services fetched successfully', services));
  }

  async getServiceById(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const service = await servicesService.getServiceById(id);
    if (!service) {
      return res.status(404).json(createResponse(false, 'Service not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Service fetched successfully', service));
  }

  async getSymptoms(_req: Request, res: Response) {
    const symptoms = await servicesService.getAllSymptoms();
    return res.json(createResponse(true, 'Service symptoms fetched successfully', symptoms));
  }

  async createService(req: Request, res: Response) {
    const newService = await servicesService.createService(req.body);
    return res.status(201).json(createResponse(true, 'Service created successfully', newService));
  }

  async updateService(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const updated = await servicesService.updateService(id, req.body);
    if (!updated) {
      return res.status(404).json(createResponse(false, 'Service not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Service updated successfully', updated));
  }

  async deleteService(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const deleted = await servicesService.deleteService(id);
    if (!deleted) {
      return res.status(404).json(createResponse(false, 'Service not found', undefined, 'NOT_FOUND'));
    }
    return res.json(createResponse(true, 'Service deleted successfully', deleted));
  }
}

export const servicesController = new ServicesController();
