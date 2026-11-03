import type { Request, Response } from 'express';
import { suppliersService } from './suppliers.service';
import { createResponse } from '../../utils/helpers';

export class SuppliersController {
  async listSuppliers(req: Request, res: Response) {
    try {
      const search = req.query.search as string | undefined;
      const suppliers = await suppliersService.listSuppliers(search);
      return res.json(createResponse(true, 'Suppliers fetched', suppliers));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch suppliers', undefined, 'INTERNAL_ERROR'));
    }
  }

  async getSupplier(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const supplier = await suppliersService.getSupplierById(id);
      if (!supplier) {
        return res.status(404).json(createResponse(false, 'Supplier not found', undefined, 'NOT_FOUND'));
      }
      return res.json(createResponse(true, 'Supplier fetched', supplier));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch supplier', undefined, 'INTERNAL_ERROR'));
    }
  }

  async createSupplier(req: Request, res: Response) {
    try {
      const { name, phone, code, contactPerson, email, gstin, address, city, state, paymentTerms } = req.body;
      if (!name || !phone) {
        return res.status(400).json(createResponse(false, 'Supplier name and phone are required', undefined, 'VALIDATION_ERROR'));
      }

      const supplier = await suppliersService.createSupplier({
        name,
        phone,
        code,
        contactPerson,
        email,
        gstin,
        address,
        city,
        state,
        paymentTerms,
      });

      return res.status(201).json(createResponse(true, 'Supplier created successfully', supplier));
    } catch (error: any) {
      if (error.message?.includes('duplicate key') || error.message?.includes('UNIQUE constraint')) {
        return res.status(400).json(createResponse(false, 'Supplier with this code already exists', undefined, 'DUPLICATE_CODE'));
      }
      return res.status(500).json(createResponse(false, 'Failed to create supplier', undefined, 'INTERNAL_ERROR'));
    }
  }

  async updateSupplier(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await suppliersService.updateSupplier(id, req.body);
      if (!updated) {
        return res.status(404).json(createResponse(false, 'Supplier not found', undefined, 'NOT_FOUND'));
      }
      return res.json(createResponse(true, 'Supplier updated successfully', updated));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to update supplier', undefined, 'INTERNAL_ERROR'));
    }
  }
}

export const suppliersController = new SuppliersController();

